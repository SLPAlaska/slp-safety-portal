// =====================================================================
// AnthroSafe Spell/Grammar Review API
// POST /api/spellcheck  { items: [{ key, text }] }
//
// 200      { results: [{key, corrected}], unchecked: [key], degraded, warnings }
// 4xx/5xx  { error: {code, message}, results: [], unchecked, degraded, warnings }
//
// This route never returns 502 and never lets an error escape the handler. The
// approval gate in the investigation workbench fails open on anything that goes
// wrong here, so what it needs back is a truthful status code and a message a
// safety lead can read — not a crash the platform turns into a 502.
//
// Uses ANTHROPIC_API_KEY (server-side env var on the portal Vercel project).
// =====================================================================

import { createClient } from '@supabase/supabase-js';
import { isInvestigator } from '@/lib/investigatorAuth';

export const maxDuration = 60;

// claude-sonnet-4-20250514 was RETIRED on 2026-06-15. Every call to it has come
// back 404 from the Anthropic API ever since, and the old code turned that 404
// into a 502 — that is the production outage this route was fixed for. Current
// model IDs carry no date suffix. Check the deprecation table before changing:
// https://platform.claude.com/docs/en/about-claude/model-deprecations
//
// Sonnet 5 rather than Opus 5 on purpose: this is a bulk copy-edit pass over
// report text — mechanical spelling, grammar and punctuation with an explicit
// instruction not to touch meaning. It is high volume and runs on every
// approval, and it does not need Opus-tier reasoning. Sonnet 5 is roughly 40%
// of the cost for work of this shape.
const MODEL = 'claude-sonnet-5';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

// Vercel kills the function at maxDuration. Stop ourselves before that so a slow
// review comes back as a structured 504 instead of a gateway 502.
const OVERALL_BUDGET_MS = 50_000;

// One request per ~12k characters. A full investigation carries far more text
// than a single response can echo back, and a truncated response is what used to
// surface as "Model returned unparseable output" — another 502.
const BATCH_CHAR_BUDGET = 12_000;
const CONCURRENCY = 3;
const MAX_ITEMS = 60;
const MAX_ITEM_CHARS = 6_000;

const SYSTEM_PROMPT = `You are a copy editor for industrial safety investigation reports on the Alaska North Slope. You will receive a JSON array of report fields, each shaped {"key": "...", "original": "..."}. For each field, correct ONLY spelling, grammar, and punctuation in its "original" text.

STRICT RULES:
- Name the output field "corrected". Do NOT reuse "original" or "text" as the output field name.
- Never change facts, meaning, times, dates, numbers, names of people, companies, equipment, or locations.
- Never add or remove information. Never rewrite for style. Fix errors only.
- Keep line breaks exactly as they appear in the original.
- Preserve technical/industry terms (ACB, THA, PSIF, STKY, tractor-trailer, Insta Cup, etc.) even if unusual.
- If a field has no errors, return its text unchanged.
- Return one entry for every field you were given, using the same key.

Respond with ONLY a JSON array, no markdown fences, no commentary:
[{"key": "<same key>", "corrected": "<corrected text>"}]`;

// Alerts land in the same table SafeSubmit already writes to, so a silent
// spellcheck failure surfaces wherever those are reviewed. Column shape is
// copied from app/components/SafeSubmit.js — keep the two in step.
const ALERT_ADMIN_EMAIL = 'brian@slpalaska.com';
const ALERT_INSERT_TIMEOUT_MS = 2_000;

// Built lazily: a service-role client at module load breaks `next build`'s
// page-data collection.
let _admin = null;
function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  if (!_admin) {
    _admin = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _admin;
}

/**
 * Witness for silent failures.
 *
 * A 5xx here means the spelling review did not run, and because the approval
 * gate fails open nobody downstream is forced to notice. This leaves a row
 * behind so the failure can be found later instead of only showing up as
 * reports that quietly stopped being proofread.
 *
 * It must never change the outcome of the request: every error is swallowed and
 * the insert is time-bounded so a slow database cannot eat the response.
 */
async function recordFailure(error, context = {}) {
  try {
    const supabase = adminClient();
    if (!supabase) return;

    const details = [
      `code=${error.code}`,
      `status=${error.status || 503}`,
      context.uncheckedCount != null ? `unchecked_fields=${context.uncheckedCount}` : null,
      context.warnings?.length ? `warnings=${context.warnings.join(' | ')}` : null,
      `message=${error.message}`,
    ]
      .filter(Boolean)
      .join('; ');

    await Promise.race([
      supabase.from('system_alerts').insert([
        {
          alert_type: 'spellcheck_failure',
          form_type: 'investigation_spellcheck',
          target_table: null,
          error_message: error.message,
          details,
          admin_email: ALERT_ADMIN_EMAIL,
          status: 'new',
          created_at: new Date().toISOString(),
        },
      ]),
      new Promise(resolve => setTimeout(resolve, ALERT_INSERT_TIMEOUT_MS)),
    ]);
  } catch {
    // Deliberately swallowed. The witness must never break the response.
  }
}

async function fail(error, unchecked = [], warnings = []) {
  const status = error.status || 503;

  // Anything 5xx means the review did not run. Leave a trace before answering.
  if (status >= 500) {
    await recordFailure(error, { uncheckedCount: unchecked.length, warnings });
  }

  return Response.json(
    {
      error: { code: error.code, message: error.message },
      results: [],
      unchecked,
      degraded: true,
      warnings: warnings.length ? warnings : [error.message],
    },
    { status }
  );
}

function classifyUpstream(status, detail) {
  if (status === 401 || status === 403) {
    return {
      code: 'upstream_auth',
      status: 503,
      retryable: false,
      message: 'The Anthropic API key was rejected. Check ANTHROPIC_API_KEY on the Vercel project.',
    };
  }
  if (status === 404) {
    return {
      code: 'model_unavailable',
      status: 503,
      retryable: false,
      message: `The Anthropic API does not recognize model "${MODEL}". It may have been retired — check the model deprecation list.`,
    };
  }
  if (status === 429) {
    return {
      code: 'rate_limited',
      status: 503,
      retryable: true,
      message: 'The spelling review is rate limited right now. Try again in a minute.',
    };
  }
  if (status >= 500) {
    return {
      code: 'upstream_error',
      status: 503,
      retryable: true,
      message: `The Anthropic API returned ${status}.`,
    };
  }
  return {
    code: 'upstream_rejected',
    status: 503,
    retryable: false,
    message: `Anthropic API ${status}: ${detail || 'no detail returned'}`,
  };
}

/**
 * Pull one {key, corrected} pair out of whatever the model returned.
 *
 * The prompt asks for `corrected`, but models reliably drift toward mirroring
 * the input field name instead — a live call returned every edit under `text`,
 * which silently emptied the results and turned a perfectly good review into a
 * 503. `text` is therefore accepted as well. It is unambiguous: the input field
 * is named `original`, so a returned `text` cannot be an echo of the input.
 *
 * Returns null for anything that is not a usable pair, which the caller counts
 * as unchecked rather than clean.
 */
function readCorrection(r) {
  if (!r || typeof r.key !== 'string') return null;
  const corrected =
    typeof r.corrected === 'string' ? r.corrected :
    typeof r.text === 'string' ? r.text :
    null;
  return corrected === null ? null : { key: r.key, corrected };
}

function batchItems(items, charBudget) {
  const batches = [];
  let current = [];
  let chars = 0;
  for (const item of items) {
    if (current.length && chars + item.text.length > charBudget) {
      batches.push(current);
      current = [];
      chars = 0;
    }
    current.push(item);
    chars += item.text.length;
  }
  if (current.length) batches.push(current);
  return batches;
}

async function reviewBatch(batch, apiKey, deadlineAt) {
  const chars = batch.reduce((n, it) => n + it.text.length, 0);
  // The model echoes every field back inside JSON, so output is roughly input
  // plus escaping — with headroom for adaptive thinking, which Sonnet 5 runs by
  // default and bills out of max_tokens.
  const maxTokens = Math.min(16_000, Math.max(2_000, Math.ceil(chars / 2) + 2_000));

  const body = JSON.stringify({
    model: MODEL,
    max_tokens: maxTokens,
    // Copy-editing is mechanical. Low effort keeps thinking tokens and latency
    // inside the 60s function budget, and is the right lever here — lowering
    // effort is what saves tokens, not switching thinking off.
    output_config: { effort: 'low' },
    system: SYSTEM_PROMPT,
    // Sent as `original`, not `text`. The model tends to mirror the input field
    // name in its reply; with the input called `original`, a returned `text`
    // field can only be the edited version and never an echo of the input.
    messages: [{
      role: 'user',
      content: JSON.stringify(batch.map(it => ({ key: it.key, original: it.text }))),
    }],
  });

  let lastError = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const remaining = deadlineAt - Date.now();
    if (remaining <= 1_000) {
      return {
        ok: false,
        error: {
          code: 'timeout',
          status: 504,
          message: 'The spelling review ran out of time before this section could be checked.',
        },
      };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), remaining);

    let res;
    try {
      res = await fetch(ANTHROPIC_URL, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body,
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timer);
      if (err?.name === 'AbortError') {
        return {
          ok: false,
          error: {
            code: 'timeout',
            status: 504,
            message: 'The spelling review timed out before the model answered.',
          },
        };
      }
      lastError = {
        code: 'network',
        status: 503,
        message: `Could not reach the Anthropic API: ${err?.message || 'network error'}.`,
      };
      continue;
    }
    clearTimeout(timer);

    if (!res.ok) {
      const detail = await res.text().then(t => t.slice(0, 300)).catch(() => '');
      const error = classifyUpstream(res.status, detail);
      if (!error.retryable) return { ok: false, error };
      lastError = error;
      continue;
    }

    const data = await res.json().catch(() => null);
    if (!data) {
      lastError = {
        code: 'bad_response',
        status: 503,
        message: 'The Anthropic API returned a body that was not JSON.',
      };
      continue;
    }

    // The model can decline a request outright (HTTP 200 with stop_reason
    // "refusal"), so check that before reading content.
    if (data.stop_reason === 'refusal') {
      return {
        ok: false,
        error: {
          code: 'refused',
          status: 503,
          message: 'The model declined to review this section, so it was left unchecked.',
        },
      };
    }

    if (data.stop_reason === 'max_tokens') {
      return {
        ok: false,
        error: {
          code: 'truncated',
          status: 503,
          message: 'A section of the report was too long for one review pass and was left unchecked.',
        },
      };
    }

    const text = (data.content || [])
      .filter(b => b?.type === 'text')
      .map(b => b.text)
      .join('\n');
    const clean = text.replace(/```json|```/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch {
      lastError = {
        code: 'unparseable',
        status: 503,
        message: 'The model returned output that was not valid JSON.',
      };
      continue;
    }

    if (!Array.isArray(parsed)) {
      lastError = {
        code: 'unexpected_shape',
        status: 503,
        message: 'The model returned an unexpected structure.',
      };
      continue;
    }

    return { ok: true, results: parsed.map(readCorrection).filter(Boolean) };
  }

  return {
    ok: false,
    error: lastError || {
      code: 'failed',
      status: 503,
      message: 'The spelling review could not be completed.',
    },
  };
}

async function runBatches(batches, apiKey, deadlineAt) {
  const outcomes = new Array(batches.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(CONCURRENCY, batches.length) }, async () => {
    for (;;) {
      const i = next++;
      if (i >= batches.length) return;
      outcomes[i] = await reviewBatch(batches[i], apiKey, deadlineAt);
    }
  });
  await Promise.all(workers);
  return outcomes;
}

export async function POST(request) {
  const deadlineAt = Date.now() + OVERALL_BUDGET_MS;

  try {
    // This route spends the platform's Anthropic key, so the caller has to be a
    // signed-in portal user. Verified server-side with the service-role client,
    // the same way app/api/lms/learner/* verifies its callers. Fails closed.
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!token) {
      return fail({
        code: 'unauthorized',
        status: 401,
        message: 'Sign in to run the spelling review.',
      });
    }

    const supabase = adminClient();
    if (!supabase) {
      return fail({
        code: 'not_configured',
        status: 503,
        message: 'Supabase is not configured on this deployment, so the request could not be authenticated.',
      });
    }

    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData?.user) {
      return fail({
        code: 'unauthorized',
        status: 401,
        message: 'Your session has expired. Sign in again to run the spelling review.',
      });
    }

    // Authorisation, not just authentication. The role is read off the user
    // Supabase just verified for us — specifically its app_metadata, which only
    // the service role can write. Nothing the caller sent is consulted.
    if (!isInvestigator(authData.user)) {
      return fail({
        code: 'forbidden',
        status: 403,
        message: 'This account is not authorized for investigations.',
      });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return fail({ code: 'bad_request', status: 400, message: 'Request body was not valid JSON.' });
    }

    const items = (Array.isArray(body?.items) ? body.items : [])
      .slice(0, MAX_ITEMS)
      .map(it => ({
        key: String(it?.key ?? '').slice(0, 120),
        text: String(it?.text ?? '').slice(0, MAX_ITEM_CHARS),
      }))
      .filter(it => it.key && it.text.trim());

    if (items.length === 0) {
      return Response.json({ results: [], unchecked: [], degraded: false, warnings: [] });
    }

    const allKeys = items.map(it => it.key);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return fail(
        {
          code: 'not_configured',
          status: 503,
          message: 'ANTHROPIC_API_KEY is not set on this deployment, so the spelling review cannot run.',
        },
        allKeys
      );
    }

    const batches = batchItems(items, BATCH_CHAR_BUDGET);
    const outcomes = await runBatches(batches, apiKey, deadlineAt);

    const results = [];
    const unchecked = [];
    const warnings = [];

    outcomes.forEach((outcome, i) => {
      const keys = batches[i].map(it => it.key);
      if (outcome?.ok) {
        const wanted = new Set(keys);
        const returned = new Set();
        for (const r of outcome.results) {
          if (wanted.has(r.key) && !returned.has(r.key)) {
            results.push(r);
            returned.add(r.key);
          }
        }
        // A field the model silently dropped is unchecked, not clean.
        for (const k of keys) if (!returned.has(k)) unchecked.push(k);
      } else {
        unchecked.push(...keys);
        warnings.push(outcome?.error?.message || 'A section of the report could not be reviewed.');
      }
    });

    const uniqueWarnings = [...new Set(warnings)];

    // Nothing usable came back — report the first real reason with its own code.
    if (results.length === 0) {
      const firstFailure = outcomes.find(o => o && !o.ok);
      return fail(
        firstFailure?.error || { code: 'failed', status: 503, message: 'The spelling review could not run.' },
        unchecked,
        uniqueWarnings
      );
    }

    const degraded = unchecked.length > 0;

    // A degraded 200 is the other silent failure, and the likelier one: the
    // reviewer gets a warning they can click straight past, and nothing else
    // records that part of the report went unproofed. Same guards as the 5xx
    // path — swallowed, time-bounded, never changes the response.
    if (degraded) {
      await recordFailure(
        {
          code: 'partial',
          status: 200,
          message: `${unchecked.length} of ${items.length} fields were not reviewed.`,
        },
        { uncheckedCount: unchecked.length, warnings: uniqueWarnings }
      );
    }

    return Response.json({
      results,
      unchecked,
      degraded,
      warnings: uniqueWarnings,
    });
  } catch (err) {
    // Last line of defence. Anything reaching here would otherwise be a 502.
    return fail({
      code: 'unexpected',
      status: 500,
      message: err?.message || 'The spelling review failed unexpectedly.',
    });
  }
}

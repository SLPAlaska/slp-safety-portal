// app/lib/investigationTextGate.js
//
// Spelling & grammar HARD GATE for the FINAL investigation report.
//
// WHAT IS GATED
//   - Approving an investigation (status -> Approved), closing it
//     (status -> Closed) and "Mark Investigation Complete" (stage_4_complete).
//   - Opening / exporting the final report (/investigation-report/[id], the
//     workbench "Open Printable Report (PDF)" buttons, /report-generator).
//   The field Incident Report submit is NOT gated: field hands can type rough.
//   Drafts and work-in-progress saves are never gated.
//
// WHAT TEXT IS CHECKED
//   Exactly what the report prints, as listed by the SQL function
//   public.inv_report_gate_items() (supabase/migrations/*_inv_report_text_gate.sql).
//   The server route reads it from the database; the browser never supplies it.
//
// WHO DECIDES
//   POST /api/investigation-text-gate runs the check server-side and, only on a
//   clean pass, records md5(text) in public.inv_text_gate. A database trigger
//   refuses Approved / Closed / complete unless that hash matches the current
//   text. The UI calls the route first so people see the issues and fix them.
//
// CHECKER
//   LanguageTool (free, open source, self-hostable). Point LANGUAGETOOL_URL at a
//   self-hosted server to drop the public API's 20 requests/min limit; set
//   LANGUAGETOOL_USERNAME + LANGUAGETOOL_API_KEY for the paid API.
//
// FAIL CLOSED
//   Checker down, slow, rate-limited, partial answer, or unreadable answer =>
//   status 'unavailable' => cannot approve, complete, or export. Try again.
//
// THRESHOLD
//   Blocking: misspellings (TYPOS), GRAMMAR, CONFUSED_WORDS, CASING.
//   Not blocking: punctuation/comma advice, style, typography, redundancy,
//   wordiness — LanguageTool opinions, not errors.
//   A flagged word that is Capitalized, ALL CAPS or contains a digit is most
//   likely a name, acronym or equipment ID: the investigator may mark it
//   "Keep — it's a name/term" (stored per incident, audited). A lowercase
//   misspelling must be fixed unless it is in DOMAIN_TERMS below. Grammar must
//   be fixed (rephrase or apply a suggestion).
//
// Pure module (no React, no Supabase) so scripts/check-investigation-text-gate.mjs
// can test the shipped logic directly.

export const LT_DEFAULT_ENDPOINT = 'https://api.languagetool.org/v2/check';
export const LT_LANGUAGE = 'en-US';
// The public API caps a request at 20 KB. Stay well inside it.
export const LT_MAX_CHARS = 12000;
export const LT_TIMEOUT_MS = 15000;

const BLOCK_CATEGORIES = new Set(['TYPOS', 'GRAMMAR', 'CONFUSED_WORDS', 'CASING']);
const BLOCK_ISSUE_TYPES = new Set(['misspelling', 'grammar']);

// Oilfield / North Slope / safety vocabulary the general dictionary does not
// know. Lower-case; matched case-insensitively. Add terms here, not in the UI.
export const DOMAIN_TERMS = new Set([
  // safety programme terms
  'tha', 'thas', 'jsa', 'jsas', 'jha', 'jhas', 'psif', 'sif', 'sif-p', 'stky', 'dec', 'decs', 'loto',
  'ppe', 'sds', 'msds', 'hse', 'hsse', 'ehs', 'osha', 'swa', 'ptw', 'mbwa', 'bbs', 'lsr', 'lsrs',
  'pse', 'car', 'cars', 'ca', 'cas', 'rca', 'rcas', 'idlh', 'lel', 'h2s', 'co2', 'scba', 'ssv',
  'esd', 'bop', 'bops', 'wlv', 'ndt', 'ncr', 'moc', 'simops', 'swppp', 'tbt', 'jsea', 'ims',
  'anthrosafe', 'slp', 'gfci', 'fr', 'frc', 'frcs', 'hi-vis', 'hivis', 'tagout', 'lockout',
  // oilfield / slope words
  'wireline', 'slickline', 'eline', 'e-line', 'workover', 'coiled', 'frac', 'fracking', 'flowback',
  'roustabout', 'roustabouts', 'roughneck', 'roughnecks', 'swamper', 'swampers', 'toolpusher',
  'derrickhand', 'driller', 'mudlogger', 'pipe-rack', 'catwalk', 'doghouse', 'wellhead', 'wellheads',
  'wellbore', 'wellpad', 'wellpads', 'manlift', 'manlifts', 'telehandler', 'telehandlers',
  'skid-steer', 'skidsteer', 'hydrovac', 'vactor', 'super-sucker', 'cribbing', 'dunnage',
  'lubricator', 'grease-head', 'sheave', 'sheaves', 'come-along', 'chainfall', 'tugger', 'tuggers',
  'glycol', 'methanol', 'conex', 'connex', 'herman', 'hermans', 'ice-road', 'berm', 'berms',
  'pre-job', 'pre-task', 'pre-trip', 'post-trip', 'walkaround', 'walk-around', 'driplan',
  'sorbent', 'sorbents', 'pigging', 'ft', 'lbs', 'psi', 'psig', 'bbl', 'bbls', 'gal', 'gals',
  'mph', 'rpm', 'kv', 'vac-truck',
  // places / operators commonly typed in reports
  'deadhorse', 'prudhoe', 'kuparuk', 'nuiqsut', 'utqiagvik', 'kenai', 'nikiski',
  'cdr', 'gpb', 'cpf', 'cpf1', 'cpf2', 'cpf3', 'gc1', 'gc2', 'gc3',
  'hilcorp', 'conocophillips', 'santos', 'narwhal', 'magtec', 'pollard', 'yjos', 'apache',
  'oilsearch', 'eni', 'bp', 'aogcc', 'adec', 'fmcsa',
]);

const WORD_RE = /[A-Za-z0-9][A-Za-z0-9'’\-]*/g;

export function normWord(w) {
  return String(w || '').toLowerCase().replace(/[’]/g, "'").replace(/^'+|'+$/g, '').replace(/'s$/, '');
}

/** Capitalized, ALL CAPS, or containing a digit: probably a name, acronym or ID. */
export function looksLikeNameOrTerm(word) {
  const w = String(word || '');
  return /\d/.test(w) || /^[A-Z]/.test(w);
}

/** Every word in the people/company/place strings the report also prints. */
export function wordsFromNames(names) {
  const out = new Set();
  for (const v of names || []) {
    if (typeof v !== 'string' || !v.trim()) continue;
    for (const m of v.matchAll(WORD_RE)) out.add(normWord(m[0]));
  }
  return out;
}

/** Terms an investigator may "keep": name-like only, normalised, capped. */
export function sanitizeAcceptedTerms(terms) {
  const out = new Set();
  for (const t of Array.isArray(terms) ? terms : []) {
    const s = String(t || '').trim().slice(0, 60);
    if (!s || !/^[A-Za-z0-9][A-Za-z0-9'’\-]*$/.test(s)) continue;
    if (!looksLikeNameOrTerm(s)) continue;
    out.add(normWord(s));
    if (out.size >= 200) break;
  }
  return [...out];
}

/** Stable fingerprint of exactly what was checked (mirrors nothing in SQL; UI only). */
export function itemsFingerprint(items) {
  return JSON.stringify((items || []).map(i => [i.key, i.text]));
}

/**
 * Pack items into LanguageTool requests. Items are joined with a blank line
 * (so each is its own paragraph and no sentence spans two fields) and each
 * item's start offset is recorded so matches can be mapped back.
 * A single item longer than maxChars is split on paragraph/sentence edges.
 */
export function buildChunks(items, maxChars = LT_MAX_CHARS) {
  const SEP = '\n\n';
  const pieces = [];
  for (const f of items) {
    const text = String(f.text || '');
    if (!text.trim()) continue;
    if (text.length <= maxChars) { pieces.push({ key: f.key, base: 0, text }); continue; }
    let start = 0;
    while (start < text.length) {
      let end = Math.min(text.length, start + maxChars);
      if (end < text.length) {
        const cut = Math.max(text.lastIndexOf('\n', end), text.lastIndexOf('. ', end));
        if (cut > start + maxChars / 2) end = cut + 1;
      }
      pieces.push({ key: f.key, base: start, text: text.slice(start, end) });
      start = end;
    }
  }
  const chunks = [];
  let cur = null;
  for (const p of pieces) {
    if (!cur || cur.text.length + SEP.length + p.text.length > maxChars) {
      cur = { text: '', segments: [] };
      chunks.push(cur);
    } else {
      cur.text += SEP;
    }
    cur.segments.push({ key: p.key, base: p.base, start: cur.text.length, end: cur.text.length + p.text.length });
    cur.text += p.text;
  }
  return chunks;
}

export function isBlockingMatch(m) {
  const cat = m?.rule?.category?.id;
  const issue = m?.rule?.issueType;
  return BLOCK_CATEGORIES.has(cat) || BLOCK_ISSUE_TYPES.has(issue);
}

function isSpelling(m) {
  return m?.rule?.issueType === 'misspelling' || m?.rule?.category?.id === 'TYPOS' ||
    /MORFOLOGIK|SPELL/i.test(m?.rule?.id || '');
}

/** The dictionary ("unknown word") rule — the only kind a name/term can excuse. */
export function isDictionaryMatch(m) {
  return /MORFOLOGIK|SPELLER|HUNSPELL/i.test(m?.rule?.id || '');
}

/** True when `offset` starts a sentence (start of text, or after . ! ? or a line break). */
export function atSentenceStart(text, offset) {
  const before = String(text || '').slice(0, offset).replace(/[\s"'“‘(\[]+$/, '');
  return before === '' || /[.!?:;\n]$/.test(before) || /\n\s*$/.test(String(text || '').slice(0, offset));
}

/**
 * Can this flagged word be kept as a name/term? ALL CAPS or containing a digit:
 * anywhere. Capitalized: only mid-sentence (a capital at the start of a
 * sentence says nothing about being a name — rephrase instead).
 */
export function keepable(word, text, offset) {
  const w = String(word || '');
  if (/\d/.test(w) || (w.length > 1 && w === w.toUpperCase() && /[A-Z]/.test(w))) return true;
  return /^[A-Z]/.test(w) && !atSentenceStart(text, offset);
}

/**
 * Turn LanguageTool matches for one chunk into gate issues.
 * names: Set of normWord()s printed in the report's name fields (always accepted).
 * kept:  Set of normWord()s the investigator kept as names/terms (accepted only
 *        where the flagged word is keepable()).
 */
export function issuesFromMatches(chunk, matches, names = new Set(), kept = new Set()) {
  const issues = [];
  for (const m of matches || []) {
    if (!isBlockingMatch(m)) continue;
    const seg = chunk.segments.find(s => m.offset >= s.start && m.offset + m.length <= s.end);
    if (!seg) continue; // straddles the separator: not a real error in either field
    const word = chunk.text.slice(m.offset, m.offset + m.length);
    const spelling = isSpelling(m);
    const dictionary = isDictionaryMatch(m);
    const canKeep = dictionary && keepable(word, chunk.text, m.offset);
    if (dictionary) {
      const n = normWord(word);
      if (DOMAIN_TERMS.has(n) || names.has(n) || (canKeep && kept.has(n))) continue;
      // Hyphenated / slashed compound where every part is known.
      const parts = n.split(/[-/]/).filter(Boolean);
      if (parts.length > 1 && parts.every(p => DOMAIN_TERMS.has(p) || names.has(p))) continue;
    }
    issues.push({
      key: seg.key,
      offset: seg.base + (m.offset - seg.start),
      length: m.length,
      word,
      message: m.shortMessage || m.message || 'Possible error',
      detail: m.message || '',
      rule: m?.rule?.id || '',
      kind: spelling ? 'spelling' : 'grammar',
      replacements: (m.replacements || []).slice(0, 5).map(r => r.value).filter(v => typeof v === 'string'),
      canKeep,
    });
  }
  return issues;
}

export function applyReplacement(text, offset, length, value) {
  return text.slice(0, offset) + value + text.slice(offset + length);
}

/**
 * Call LanguageTool for one chunk. Returns { ok: true, matches } or
 * { ok: false, reason }. Never throws. One retry on 429/5xx/network error.
 */
export async function checkChunk(chunk, {
  fetchImpl = globalThis.fetch,
  endpoint = LT_DEFAULT_ENDPOINT,
  timeoutMs = LT_TIMEOUT_MS,
  username,
  apiKey,
} = {}) {
  let lastReason = 'The spelling & grammar checker could not be reached.';
  for (let attempt = 0; attempt < 2; attempt++) {
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
    try {
      const params = { text: chunk.text, language: LT_LANGUAGE, level: 'default' };
      if (username && apiKey) { params.username = username; params.apiKey = apiKey; }
      const res = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
        body: new URLSearchParams(params).toString(),
        signal: ctrl?.signal,
      });
      if (!res.ok) {
        lastReason = res.status === 429
          ? 'The spelling & grammar checker is busy (rate limited). Wait a minute and try again.'
          : `The spelling & grammar checker returned an error (${res.status}).`;
        if (res.status === 429 || res.status >= 500) continue;
        return { ok: false, reason: lastReason };
      }
      const json = await res.json().catch(() => null);
      if (!json || !Array.isArray(json.matches)) return { ok: false, reason: 'The spelling & grammar checker sent back an unreadable answer.' };
      if (json.warnings?.incompleteResults) return { ok: false, reason: 'The spelling & grammar checker could only check part of the report.' };
      return { ok: true, matches: json.matches };
    } catch (err) {
      lastReason = err?.name === 'AbortError'
        ? 'The spelling & grammar checker timed out.'
        : 'The spelling & grammar checker could not be reached.';
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
  return { ok: false, reason: lastReason };
}

/**
 * Run the whole gate over report items [{ key, label, text, ... }].
 * Returns { status: 'pass' | 'fail' | 'unavailable', issues, reason }.
 * 'unavailable' is FAIL CLOSED: the caller must not approve or export.
 */
export async function runTextGate(items, { names = [], accepted = [], ...opts } = {}) {
  const live = (items || []).filter(i => typeof i?.text === 'string' && i.text.trim());
  if (live.length === 0) return { status: 'pass', issues: [] };
  const nameSet = wordsFromNames(names);
  const kept = new Set(accepted.map(normWord));
  const chunks = buildChunks(live);
  const issues = [];
  for (const chunk of chunks) {
    const r = await checkChunk(chunk, opts);
    if (!r.ok) return { status: 'unavailable', issues: [], reason: r.reason };
    issues.push(...issuesFromMatches(chunk, r.matches, nameSet, kept));
  }
  return { status: issues.length ? 'fail' : 'pass', issues };
}

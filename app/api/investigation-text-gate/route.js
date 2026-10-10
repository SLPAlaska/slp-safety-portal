// =====================================================================
// POST /api/investigation-text-gate   { incidentId: <uuid>, keep?: [term] }
//
// Spelling & grammar HARD GATE for the final investigation report.
// See app/lib/investigationTextGate.js for the rules and
// supabase/migrations/*_inv_report_text_gate.sql for the database side.
//
// 200 { status: 'pass', cached, fieldsChecked, hash }
// 200 { status: 'fail', issues: [...], fields: [{key,label,table,id,column,text}] }
// 200 { status: 'unavailable', reason }          <- FAIL CLOSED: not a pass
// 4xx/5xx { status: 'error', reason }            <- FAIL CLOSED: not a pass
//
// The text checked is read here from the database (public.inv_report_text_gate),
// never taken from the browser. Only a clean pass writes passed_hash, and the
// incidents trigger refuses Approved / Closed / complete without a matching one.
//
// Auth: signed-in investigator (app_metadata.role), verified server-side with
// the service-role client — the same rule as /api/spellcheck.
// =====================================================================

import { createClient } from '@supabase/supabase-js';
import { isInvestigator } from '@/lib/investigatorAuth';
import {
  LT_DEFAULT_ENDPOINT,
  runTextGate,
  sanitizeAcceptedTerms,
} from '@/lib/investigationTextGate';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let _admin = null;
function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  if (!_admin) {
    _admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  }
  return _admin;
}

function reply(body, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

function closed(reason, status) {
  return reply({ status: 'error', reason }, status);
}

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!token) return closed('Sign in to run the spelling & grammar check.', 401);

    const supabase = adminClient();
    if (!supabase) return closed('The server is not configured to run the spelling & grammar check.', 503);

    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData?.user) return closed('Your session has expired. Sign in again.', 401);
    if (!isInvestigator(authData.user)) return closed('This account is not authorized for investigations.', 403);
    const email = (authData.user.email || '').toLowerCase();

    let body;
    try { body = await request.json(); } catch { return closed('Request body was not valid JSON.', 400); }
    const incidentId = String(body?.incidentId || '');
    if (!UUID_RE.test(incidentId)) return closed('Missing or invalid incident id.', 400);

    const { data: gate, error: gateErr } = await supabase.rpc('inv_report_text_gate', { p_incident: incidentId });
    if (gateErr) return closed('Could not read the report text: ' + gateErr.message, 503);
    if (!gate) return closed('Investigation not found.', 404);

    const items = Array.isArray(gate.items) ? gate.items : [];
    const state = gate.state || {};

    // Kept terms: what was stored for this incident plus anything newly kept.
    // Server-side rule: name-like words only (Capitalized / ALL CAPS / digits).
    const stored = (Array.isArray(state.accepted_terms) ? state.accepted_terms : []).map(t => String(t).toLowerCase());
    const newlyKept = sanitizeAcceptedTerms(body?.keep).filter(t => !stored.includes(t));
    const acceptedAll = [...new Set([...stored, ...newlyKept])].slice(0, 200);

    // Same text, same kept terms, already passed: no need to call the checker.
    if (state.passed_hash && state.passed_hash === gate.hash && newlyKept.length === 0) {
      return reply({ status: 'pass', cached: true, fieldsChecked: items.length, hash: gate.hash });
    }

    const endpoint = process.env.LANGUAGETOOL_URL || LT_DEFAULT_ENDPOINT;
    const result = await runTextGate(items, {
      names: Array.isArray(gate.names) ? gate.names : [],
      accepted: acceptedAll,
      endpoint,
      username: process.env.LANGUAGETOOL_USERNAME || undefined,
      apiKey: process.env.LANGUAGETOOL_API_KEY || undefined,
    });

    const now = new Date().toISOString();
    const row = {
      incident_uuid: incidentId,
      accepted_terms: acceptedAll,
      last_result: result.status,
      last_issue_count: result.issues.length,
      last_checked_at: now,
      last_checked_by: email,
    };
    if (result.status === 'pass') {
      Object.assign(row, {
        passed_hash: gate.hash,
        passed_at: now,
        passed_by_email: email,
        checker: endpoint === LT_DEFAULT_ENDPOINT ? 'languagetool-public' : 'languagetool-custom',
        fields_checked: items.length,
      });
    }
    const { error: upErr } = await supabase.from('inv_text_gate').upsert(row, { onConflict: 'incident_uuid' });
    if (upErr) {
      // A pass that could not be recorded is not a pass: the trigger would refuse it.
      return closed('The check ran but its result could not be saved: ' + upErr.message, 503);
    }

    // Audit trail (best effort; never changes the answer).
    try {
      await supabase.from('investigation_activity_log').insert({
        incident_id: incidentId,
        incident_id_text: gate.incident_id,
        action: result.status === 'pass' ? 'Spelling & grammar check passed'
          : result.status === 'fail' ? 'Spelling & grammar check found issues'
          : 'Spelling & grammar check unavailable (blocked)',
        action_category: 'text_gate',
        entity_type: 'incident',
        entity_id: incidentId,
        user_email: email,
        details: {
          result: result.status,
          fields_checked: items.length,
          issues: result.issues.length,
          kept_terms_added: newlyKept,
          reason: result.reason || null,
        },
      });
    } catch { /* audit is best effort */ }

    if (result.status === 'pass') {
      return reply({ status: 'pass', cached: false, fieldsChecked: items.length, hash: gate.hash });
    }
    if (result.status === 'unavailable') {
      return reply({ status: 'unavailable', reason: result.reason, fieldsChecked: items.length });
    }
    const flagged = new Set(result.issues.map(i => i.key));
    return reply({
      status: 'fail',
      fieldsChecked: items.length,
      issues: result.issues,
      fields: items.filter(i => flagged.has(i.key)),
    });
  } catch (err) {
    return closed('The spelling & grammar check failed unexpectedly: ' + (err?.message || 'error'), 500);
  }
}

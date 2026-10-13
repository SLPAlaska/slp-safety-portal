// =====================================================================
// POST /api/investigation-text-gate   { incidentId: <uuid>, keep?: [term], add?: [word] }
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
// Ignore (keep) is any investigator. Add to the company dictionary is an
// admin (platform super admin, or that company's company_admin).
// =====================================================================

import { createClient } from '@supabase/supabase-js';
import { isInvestigator } from '@/lib/investigatorAuth';
import { requireAdmin } from '@/lib/requireAdmin';
import { pageAll, pageAllIn } from '@/lib/supabasePage';
import { companyIn, companyKey } from '@/lib/thaCloser';
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

function missingDictionary(error) {
  const msg = `${error?.code || ''} ${error?.message || ''} ${error?.details || ''}`;
  return error?.code === '42P01'
    || error?.code === 'PGRST205'
    || (/inv_custom_dictionary/i.test(msg) && /schema cache|does not exist|Could not find/i.test(msg));
}

function cleanDictionaryWord(raw) {
  const s = String(raw || '').trim().slice(0, 60);
  if (!/^[A-Za-z0-9][A-Za-z0-9'’\-]*$/.test(s)) return null;
  return s;
}

function pushName(out, value) {
  if (value == null) return;
  if (Array.isArray(value)) { value.forEach((v) => pushName(out, v)); return; }
  if (typeof value === 'object') {
    pushName(out, value.name || value.full_name || value.witness_name || '');
    return;
  }
  const s = String(value).trim();
  if (s) out.push(s);
}

async function loadIncident(supabase, incidentId) {
  const { data, error } = await supabase.from('incidents').select(
    'id, incident_id, company_id, company_name, team_leader_name, team_members_names, mentor_name, external_investigator_name, final_approver_name, closed_by_name',
  ).eq('id', incidentId).maybeSingle();
  if (error) throw error;
  return data;
}

async function companyAliases(supabase, incident) {
  const { data, error } = await pageAll(() => supabase.from('lms_companies').select('id, name, sail_company_names'));
  if (error) throw error;
  const names = [];
  const ids = [];
  if (incident?.company_name) names.push(incident.company_name);
  for (const c of data || []) {
    const aliases = [c.name, ...(c.sail_company_names || [])].filter(Boolean);
    const hit = (incident?.company_id && c.id === incident.company_id) || companyIn(incident?.company_name, aliases);
    if (!hit) continue;
    ids.push(c.id);
    names.push(...aliases);
  }
  return { names, ids };
}

async function extraNames(supabase, incident, incidentIdText) {
  const out = [];
  for (const key of ['team_leader_name', 'team_members_names', 'mentor_name', 'external_investigator_name', 'final_approver_name', 'closed_by_name']) {
    pushName(out, incident?.[key]);
  }
  const ids = [incidentIdText, incident?.id].filter(Boolean);
  if (ids.length) {
    const { data, error } = await supabase.from('witness_statements')
      .select('witness_name, name, other_witness_names, other_witnesses')
      .in('incident_id', ids);
    if (error) throw error;
    for (const row of data || []) {
      pushName(out, row.witness_name);
      pushName(out, row.name);
      pushName(out, row.other_witness_names);
      pushName(out, row.other_witnesses);
    }
  }
  const { ids: companyIds } = await companyAliases(supabase, incident);
  if (companyIds.length) {
    const { data, error } = await pageAllIn(supabase, 'lms_users', 'full_name', 'company_id', companyIds);
    if (error) throw error;
    for (const row of data || []) pushName(out, row.full_name);
  }
  return out;
}

async function dictionaryWords(supabase, incident) {
  const { data, error } = await pageAll(() => supabase.from('inv_custom_dictionary').select('word, company_name, company_id'));
  if (error) {
    if (missingDictionary(error)) return { words: [], missing: true };
    throw error;
  }
  const { names } = await companyAliases(supabase, incident);
  const words = [];
  for (const row of data || []) {
    const byId = incident?.company_id && row.company_id === incident.company_id;
    const byName = companyIn(row.company_name, names) || companyKey(row.company_name) === companyKey(incident?.company_name);
    if (byId || byName) words.push(row.word);
  }
  return { words, missing: false };
}

async function adminMayAdd(supabase, auth, incident) {
  if (auth.isSuper) return true;
  if (incident?.company_id && incident.company_id === auth.companyId) return true;
  const { data, error } = await supabase.from('lms_companies').select('name, sail_company_names').eq('id', auth.companyId).maybeSingle();
  if (error || !data) return false;
  return companyIn(incident?.company_name, [data.name, ...(data.sail_company_names || [])]);
}

async function insertDictionaryWords(supabase, incident, words, email) {
  const companyName = String(incident?.company_name || '').trim();
  if (!companyName) return { missing: false, refused: 'This investigation has no company, so a dictionary word cannot be saved.' };
  const inserted = [];
  for (const word of words) {
    const { error } = await supabase.from('inv_custom_dictionary').insert({
      company_id: incident.company_id || null,
      company_name: companyName,
      word,
      added_by_email: email,
    });
    if (!error) { inserted.push(word); continue; }
    if (missingDictionary(error)) return { missing: true, inserted };
    if (error.code === '23505') continue;
    throw error;
  }
  return { missing: false, inserted };
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
    const incidentRow = await loadIncident(supabase, incidentId);
    if (!incidentRow) return closed('Investigation not found.', 404);

    // Ignore: any single token the investigator keeps for this incident.
    const stored = (Array.isArray(state.accepted_terms) ? state.accepted_terms : []).map(t => String(t).toLowerCase());
    const newlyKept = sanitizeAcceptedTerms(body?.keep).filter(t => !stored.includes(t));
    const acceptedAll = [...new Set([...stored, ...newlyKept])].slice(0, 200);

    const askedToAdd = Array.isArray(body?.add) && body.add.length > 0;
    const addWords = askedToAdd ? body.add.map(cleanDictionaryWord).filter(Boolean) : [];
    if (askedToAdd && addWords.length === 0) return closed('That word cannot be added to the dictionary.', 400);

    let dictState;
    try {
      dictState = await dictionaryWords(supabase, incidentRow);
    } catch (e) {
      return closed('Could not read the custom dictionary: ' + (e?.message || 'error'), 503);
    }
    let dictionaryAdded = [];
    if (askedToAdd) {
      if (dictState.missing) return closed('dictionary migration not applied', 503);
      const admin = await requireAdmin(request, supabase, { allowCompanyAdmin: true });
      if (!admin.ok) return closed(admin.error || 'Not authorized', admin.status || 403);
      const allowed = await adminMayAdd(supabase, admin, incidentRow);
      if (!allowed) return closed('Not authorized for this company', 403);
      const inserted = await insertDictionaryWords(supabase, incidentRow, addWords, email);
      if (inserted.missing) return closed('dictionary migration not applied', 503);
      if (inserted.refused) return closed(inserted.refused, 400);
      dictionaryAdded = inserted.inserted;
    }
    const dictionary = dictState.missing ? [] : [...dictState.words, ...addWords];

    let names = Array.isArray(gate.names) ? gate.names.slice() : [];
    try {
      names = names.concat(await extraNames(supabase, incidentRow, gate.incident_id));
    } catch (e) {
      return closed('Could not read names for the spelling check: ' + (e?.message || 'error'), 503);
    }

    // Same text, same kept terms, already passed: no need to call the checker.
    if (!askedToAdd && state.passed_hash && state.passed_hash === gate.hash && newlyKept.length === 0) {
      return reply({ status: 'pass', cached: true, fieldsChecked: items.length, hash: gate.hash });
    }

    const endpoint = process.env.LANGUAGETOOL_URL || LT_DEFAULT_ENDPOINT;
    const result = await runTextGate(items, {
      names,
      accepted: acceptedAll,
      dictionary,
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
          dictionary_added: dictionaryAdded,
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

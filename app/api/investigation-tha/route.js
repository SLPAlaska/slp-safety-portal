// =====================================================================
// POST /api/investigation-tha
//
// THA hard gate helpers for the Investigation Workbench. The lock itself is
// public.inv_tha_gate / the incidents trigger (SQL 58). This route only
// attaches the PDF or records the No-THA reason, for a signed-in investigator.
//
//   { action: 'context', incidentId, otherLocations? }
//   { action: 'preview', incidentId, thaNumber }
//   { action: 'attach',  incidentId, thaNumber }
//   { action: 'upload',  incidentId, fileName, pdfBase64 }
//   { action: 'no_tha',  incidentId, reason, detail }
//   { action: 'clear_no_tha', incidentId }
//
// A THA from another company is refused. The PDF is stored in the
// incident-evidence bucket, the same path other evidence uses.
// =====================================================================

import { createClient } from '@supabase/supabase-js';
import { isInvestigator } from '@/lib/investigatorAuth';
import { pageAll, pageAllIn } from '@/lib/supabasePage';
import { buildThaPdf } from '@/lib/thaPdf';
import {
  browseThas,
  calendarDay,
  companiesMatch,
  evaluateThaGate,
  isThaPdfEvidence,
  matchThasByPeople,
  NO_THA_DETAIL_MIN,
  thaDateRefusal,
  thaOnIncidentDate,
  validateNoTha,
} from '@/lib/thaGate';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const THA_NUMBER_RE = /^[A-Za-z0-9][A-Za-z0-9-]{2,60}$/;
const PDF_MAX = 8 * 1024 * 1024;
const THA_COLS = 'tha_number, company, location, work_area, crew_lead, date, created_at, status, pdf_url, task_description';

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function reply(body, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

async function authorize(request) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) return { error: reply({ error: 'Sign in to work on the THA for this investigation.' }, 401) };
  const supabase = adminClient();
  if (!supabase) return { error: reply({ error: 'The server is not configured for investigation THAs.' }, 503) };
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData?.user) return { error: reply({ error: 'Your session has expired. Sign in again.' }, 401) };
  if (!isInvestigator(authData.user)) return { error: reply({ error: 'This account is not authorized for investigations.' }, 403) };
  return { supabase, email: (authData.user.email || '').toLowerCase() };
}

async function loadIncident(supabase, incidentId) {
  if (!UUID_RE.test(String(incidentId || ''))) return null;
  const { data, error } = await supabase.from('incidents').select('*').eq('id', incidentId).maybeSingle();
  if (error) throw error;
  return data;
}

async function loadEvidence(supabase, incident) {
  const ids = [incident.incident_id, incident.id].filter(Boolean);
  const { data, error } = await supabase.from('investigation_evidence').select('*').in('incident_id', ids);
  if (error) throw error;
  return data || [];
}

async function loadOverride(supabase, incidentId) {
  const { data, error } = await supabase.from('inv_gate_overrides')
    .select('reason, by_email, created_at, revoked_at')
    .eq('incident_uuid', incidentId)
    .eq('gate_key', 'THA')
    .is('revoked_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

function publicTha(row) {
  return {
    tha_number: row.tha_number,
    company: row.company,
    location: row.location,
    work_area: row.work_area,
    crew_lead: row.crew_lead,
    crew_names: row.crew_names || [],
    task_description: row.task_description || '',
    date: row.date,
    created_at: row.created_at || null,
    status: row.status,
    has_pdf: !!row.pdf_url,
    match_location: row.match_location || false,
    match_crew: row.match_crew || false,
  };
}

async function logActivity(supabase, incident, email, action, details) {
  await supabase.from('investigation_activity_log').insert({
    incident_id: incident.id,
    incident_id_text: incident.incident_id,
    action,
    action_category: 'tha_gate',
    entity_type: 'incident',
    entity_id: incident.id,
    user_email: email,
    details,
  });
}

async function fetchExistingPdf(url) {
  if (!/^https?:\/\//i.test(String(url || ''))) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000), redirect: 'follow' });
    if (!res.ok) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.length < 5 || buf.length > PDF_MAX) return null;
    if (String.fromCharCode(buf[0], buf[1], buf[2], buf[3]) !== '%PDF') return null;
    return buf;
  } catch {
    return null;
  }
}

async function storePdf(supabase, incident, bytes, email, { thaNumber, fileName, description, source }) {
  const safe = String(fileName || 'tha.pdf').replace(/[^A-Za-z0-9._-]/g, '').slice(0, 80) || 'tha.pdf';
  const path = `${incident.id}/${Date.now()}-${safe.endsWith('.pdf') ? safe : `${safe}.pdf`}`;
  const payload = bytes instanceof Buffer ? bytes : Buffer.from(bytes);
  const { error: upErr } = await supabase.storage.from('incident-evidence').upload(path, payload, {
    contentType: 'application/pdf',
    upsert: false,
  });
  if (upErr) throw upErr;
  const { data: urlData } = supabase.storage.from('incident-evidence').getPublicUrl(path);
  const { data: row, error: insErr } = await supabase.from('investigation_evidence').insert({
    incident_id: incident.incident_id,
    evidence_type: 'THA',
    description,
    file_url: urlData.publicUrl,
    file_name: safe.endsWith('.pdf') ? safe : `${safe}.pdf`,
    uploaded_by: email,
    uploaded_by_email: email,
    uploaded_at: new Date().toISOString(),
    source: 'tha_gate',
    source_tha_number: thaNumber || null,
  }).select('id, evidence_type, file_name, file_url, description, source_tha_number').single();
  if (insErr) throw insErr;
  await logActivity(supabase, incident, email, 'THA evidence attached', {
    evidence_id: row.id,
    tha_number: thaNumber || null,
    source,
  });
  return row;
}

export async function POST(request) {
  try {
    const auth = await authorize(request);
    if (auth.error) return auth.error;
    const { supabase, email } = auth;

    let body;
    try { body = await request.json(); } catch { return reply({ error: 'Request body was not valid JSON.' }, 400); }
    const incident = await loadIncident(supabase, body?.incidentId);
    if (!incident) return reply({ error: 'Investigation not found.' }, 404);

    const action = String(body?.action || '');

    if (action === 'context') {
      const evidence = await loadEvidence(supabase, incident);
      const override = await loadOverride(supabase, incident.id);
      const gate = evaluateThaGate({ incident, evidence, override });
      const company = incident.company_name || incident.company || '';
      const otherLocations = body?.otherLocations === true;
      const day = calendarDay(incident.incident_date);
      let suggestions = [];
      let browse = [];
      if (company && day) {
        const windowR = await pageAll(() => supabase.from('tha_assessments').select(THA_COLS).eq('date', day));
        if (windowR.error) throw windowR.error;
        const windowRows = (windowR.data || []).filter((row) => companiesMatch(company, row.company) && thaOnIncidentDate(incident, row));
        const numbers = windowRows.map((row) => row.tha_number).filter(Boolean);
        const crewByTha = {};
        if (numbers.length) {
          const { data: crew, error: crewErr } = await pageAllIn(
            supabase, 'tha_crew_signoff', 'tha_number, crew_member_name', 'tha_number', numbers,
          );
          if (crewErr) throw crewErr;
          for (const person of crew || []) {
            if (!crewByTha[person.tha_number]) crewByTha[person.tha_number] = [];
            if (person.crew_member_name) crewByTha[person.tha_number].push(person.crew_member_name);
          }
        }
        const withCrew = windowRows.map((row) => ({ ...row, crew_names: crewByTha[row.tha_number] || [] }));
        const witnessIds = [incident.incident_id, incident.id].filter(Boolean);
        const { data: witnessRows, error: witnessErr } = await supabase.from('witness_statements')
          .select('witness_name, name, other_witness_names')
          .in('incident_id', witnessIds);
        if (witnessErr) throw witnessErr;
        // People match uses the investigation's company, not the viewer's LMS company.
        // Do not apply the open-THA list filter here. An SLP investigator attaching
        // evidence for a client investigation must still see that client's THAs.
        suggestions = matchThasByPeople(incident, withCrew, { witnesses: witnessRows || [] }).map(publicTha);
        const seen = new Set(suggestions.map((row) => row.tha_number));
        browse = browseThas(incident, withCrew, { otherLocations })
          .filter((row) => !seen.has(row.tha_number))
          .map(publicTha);
      }
      return reply({
        gate,
        suggestions,
        browse,
        otherLocations,
        evidence: evidence.filter(isThaPdfEvidence).map((row) => ({
          id: row.id, file_name: row.file_name, file_url: row.file_url, source_tha_number: row.source_tha_number, description: row.description,
        })),
      });
    }

    if (action === 'preview') {
      const thaNumber = String(body?.thaNumber || '').trim();
      if (!THA_NUMBER_RE.test(thaNumber)) return reply({ error: 'That THA could not be opened.' }, 400);
      const { data: tha, error: thaErr } = await supabase.from('tha_assessments').select(THA_COLS).eq('tha_number', thaNumber).maybeSingle();
      if (thaErr) throw thaErr;
      if (!tha) return reply({ error: 'THA not found.' }, 404);
      if (!companiesMatch(incident.company_name || incident.company, tha.company)) {
        return reply({ error: 'That THA belongs to a different company than this incident.' }, 403);
      }
      const previewRefusal = thaDateRefusal(incident, tha);
      if (previewRefusal) return reply({ error: previewRefusal }, 403);
      const [{ data: steps, error: stepErr }, { data: crew, error: crewErr }] = await Promise.all([
        supabase.from('tha_task_steps').select('step_number, task_step, potential_hazards, recommended_actions').eq('tha_number', thaNumber).order('step_number'),
        supabase.from('tha_crew_signoff').select('crew_member_name, company').eq('tha_number', thaNumber),
      ]);
      if (stepErr) throw stepErr;
      if (crewErr) throw crewErr;
      const crewNames = (crew || []).map((person) => person.crew_member_name).filter(Boolean);
      return reply({
        tha: publicTha({ ...tha, crew_names: crewNames }),
        steps: steps || [],
        crew: (crew || []).map((person) => ({ name: person.crew_member_name, company: person.company })),
      });
    }

    if (action === 'attach') {
      const thaNumber = String(body?.thaNumber || '').trim();
      if (!THA_NUMBER_RE.test(thaNumber)) return reply({ error: 'That THA number is not valid.' }, 400);
      const { data: tha, error: thaErr } = await supabase.from('tha_assessments').select('*').eq('tha_number', thaNumber).maybeSingle();
      if (thaErr) throw thaErr;
      if (!tha) return reply({ error: 'THA not found.' }, 404);
      if (!companiesMatch(incident.company_name || incident.company, tha.company)) {
        return reply({ error: 'That THA belongs to a different company than this incident.' }, 403);
      }
      const attachRefusal = thaDateRefusal(incident, tha);
      if (attachRefusal) return reply({ error: attachRefusal }, 403);
      const evidence = await loadEvidence(supabase, incident);
      const already = evidence.find((row) => isThaPdfEvidence(row) && row.source_tha_number === thaNumber);
      if (already) return reply({ evidence: already, source: 'existing', gate: evaluateThaGate({ incident, evidence }) });
      const [{ data: steps, error: stepErr }, { data: crew, error: crewErr }] = await Promise.all([
        supabase.from('tha_task_steps').select('*').eq('tha_number', thaNumber).order('step_number'),
        supabase.from('tha_crew_signoff').select('*').eq('tha_number', thaNumber),
      ]);
      if (stepErr) throw stepErr;
      if (crewErr) throw crewErr;

      let bytes = tha.pdf_url ? await fetchExistingPdf(tha.pdf_url) : null;
      let source = bytes ? 'existing_pdf' : 'built';
      if (!bytes) bytes = await buildThaPdf({ tha, steps: steps || [], crew: crew || [], incidentId: incident.incident_id });
      const row = await storePdf(supabase, incident, bytes, email, {
        thaNumber,
        fileName: `${thaNumber}.pdf`,
        description: `THA ${thaNumber} — ${tha.location || ''} — ${tha.date || ''}`.replace(/\s+—\s+$/, ''),
        source,
      });
      const nextEvidence = evidence.concat([row]);
      return reply({ evidence: row, source, gate: evaluateThaGate({ incident, evidence: nextEvidence }) });
    }

    if (action === 'upload') {
      const raw = String(body?.pdfBase64 || '').replace(/^data:application\/pdf;base64,/i, '').trim();
      if (!raw) return reply({ error: 'Choose a PDF to upload.' }, 400);
      let bytes;
      try { bytes = Buffer.from(raw, 'base64'); } catch { return reply({ error: 'That file could not be read.' }, 400); }
      if (bytes.length < 5 || bytes.length > PDF_MAX) return reply({ error: 'The PDF must be under 8 MB.' }, 400);
      if (bytes.subarray(0, 4).toString() !== '%PDF') return reply({ error: 'That file is not a PDF.' }, 400);
      const evidence = await loadEvidence(supabase, incident);
      const row = await storePdf(supabase, incident, bytes, email, {
        thaNumber: null,
        fileName: String(body?.fileName || 'tha.pdf'),
        description: 'THA PDF uploaded by the investigator',
        source: 'upload',
      });
      return reply({ evidence: row, source: 'upload', gate: evaluateThaGate({ incident, evidence: evidence.concat([row]) }) });
    }

    if (action === 'no_tha') {
      const reason = String(body?.reason || '');
      const detail = String(body?.detail || '').trim();
      const next = { ...incident, no_tha: true, no_tha_reason: reason, no_tha_reason_detail: detail };
      const check = validateNoTha(next);
      if (!check.ok) {
        return reply({ error: detail && detail.length < NO_THA_DETAIL_MIN
          ? `Add at least ${NO_THA_DETAIL_MIN} characters explaining why there is no THA.`
          : 'Choose a reason from the list.' }, 400);
      }
      const { data: row, error } = await supabase.from('incidents').update({
        no_tha: true,
        no_tha_reason: reason,
        no_tha_reason_detail: detail || null,
        no_tha_set_by: email,
        no_tha_set_at: new Date().toISOString(),
      }).eq('id', incident.id).select('no_tha, no_tha_reason, no_tha_reason_detail, no_tha_set_by, no_tha_set_at').single();
      if (error) throw error;
      await logActivity(supabase, incident, email, 'No-THA reason recorded', { reason, detail: detail || null });
      const evidence = await loadEvidence(supabase, incident);
      return reply({ incident: row, gate: evaluateThaGate({ incident: { ...incident, ...row }, evidence }) });
    }

    if (action === 'clear_no_tha') {
      const { data: row, error } = await supabase.from('incidents').update({
        no_tha: false,
        no_tha_reason: null,
        no_tha_reason_detail: null,
        no_tha_set_by: email,
        no_tha_set_at: new Date().toISOString(),
      }).eq('id', incident.id).select('no_tha, no_tha_reason, no_tha_reason_detail, no_tha_set_by, no_tha_set_at').single();
      if (error) throw error;
      await logActivity(supabase, incident, email, 'No-THA reason cleared', {});
      const evidence = await loadEvidence(supabase, incident);
      return reply({ incident: row, gate: evaluateThaGate({ incident: { ...incident, ...row }, evidence }) });
    }

    return reply({ error: 'Unknown action.' }, 400);
  } catch (err) {
    console.error('[investigation-tha]', err);
    return reply({ error: err?.message || 'The THA could not be saved.' }, 500);
  }
}

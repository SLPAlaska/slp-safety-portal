// THA hard gate for incident investigations.
//
// Before a stage can be marked complete, or the investigation can be sent for
// approval, approved, closed, or exported, ONE of these is true:
//   (a) an investigation_evidence row of type THA holding a PDF
//   (b) incidents.no_tha with a reason from NO_THA_REASONS
//       (tha_lost_or_not_found and other also need 30+ characters of detail)
//   (c) an active inv_gate_overrides row for gate key THA by brian@slpalaska.com
//
// The database (SQL 58) is the lock. This module is the same rule for the
// workbench, the API, and scripts/check-tha-gate.mjs. Keep the two in step:
// reason codes, the 30-character detail, evidence type THA, and a .pdf file.
//
// The portal forms are English. Spanish copy sits beside the English so the
// gate wording does not have to be rewritten if a language switch is added.
// Nothing here reads a decrypted CDL or date of birth.

export const THA_GATE_KEY = 'THA';
export const THA_GATE_OWNER = 'brian@slpalaska.com';
export const NO_THA_DETAIL_MIN = 30;

export const NO_THA_REASONS = [
  'office_shop_only',
  'no_field_task_in_progress',
  'emergency_response_before_tha',
  'tha_lost_or_not_found',
  'other',
];

export const NO_THA_DETAIL_REASONS = ['tha_lost_or_not_found', 'other'];

export const THA_COPY = {
  en: {
    title: 'THA for this job',
    intro: 'A task hazard analysis (THA) shows the crew planned the work. Attach that THA as a PDF, or record why there is not one. This is required before a stage can be marked complete, before approval or close, and before the report can be exported.',
    blocked: 'Not yet. Attach a THA PDF, or record why there is not one.',
    passEvidence: 'A THA PDF is on the evidence.',
    passNoTha: 'No THA is on file. The reason is recorded.',
    passOverride: 'Brian Walden overrode the THA check.',
    checkFailed: 'The THA check could not run. Completion, approval, and export stay locked until it does.',
    suggestHeading: 'THAs that match this incident',
    suggestHint: 'Same company, within a day of the incident, and the same location or crew.',
    pickHeading: 'Other THAs for this company',
    pickPlaceholder: 'Choose a THA…',
    uploadHeading: 'Or upload a THA PDF',
    uploadHint: 'PDF only. It is stored with the other evidence on this investigation.',
    noThaHeading: 'There is no THA',
    detailLabel: 'Explain (at least 30 characters)',
    detailHint: 'Required when the reason is “lost or not found” or “Other”.',
    saveNoTha: 'Save No-THA reason',
    clearNoTha: 'Remove this and attach a THA instead',
    attach: 'Attach PDF',
    upload: 'Upload PDF',
    override: 'Override (Brian only)',
    overrideHint: 'Override this check? Your reason is logged and prints on the reviewer page.',
    revoke: 'Remove override',
    whyLocation: 'location',
    whyCrew: 'crew',
    noneSuggested: 'No THA matched the company, the date (within a day), and the location or crew. Pick one from the company list, or upload the PDF.',
    noneCompany: 'No THAs are on file for this company. Upload the PDF, or record why there is not one.',
    reasons: {
      office_shop_only: 'Office or shop only — no field work',
      no_field_task_in_progress: 'No field task was in progress',
      emergency_response_before_tha: 'Emergency response started before a THA could be written',
      tha_lost_or_not_found: 'The THA was lost or cannot be found',
      other: 'Other',
    },
  },
  es: {
    title: 'ATS de este trabajo',
    intro: 'Un análisis de tareas y riesgos (ATS / THA) muestra que la cuadrilla planificó el trabajo. Adjunte ese ATS en PDF, o registre por qué no hay uno. Hace falta antes de marcar una etapa completa, antes de aprobar o cerrar, y antes de exportar el informe.',
    blocked: 'Todavía no. Adjunte el PDF del ATS, o registre por qué no hay uno.',
    passEvidence: 'Hay un PDF del ATS en la evidencia.',
    passNoTha: 'No hay ATS en el expediente. El motivo está registrado.',
    passOverride: 'Brian Walden anuló la verificación del ATS.',
    checkFailed: 'No se pudo hacer la verificación del ATS. Completar, aprobar y exportar siguen bloqueados hasta que se pueda.',
    suggestHeading: 'ATS que coinciden con este incidente',
    suggestHint: 'La misma empresa, a un día del incidente, y el mismo lugar o la misma cuadrilla.',
    pickHeading: 'Otros ATS de esta empresa',
    pickPlaceholder: 'Elija un ATS…',
    uploadHeading: 'O suba un PDF del ATS',
    uploadHint: 'Solo PDF. Se guarda con la otra evidencia de esta investigación.',
    noThaHeading: 'No hay ATS',
    detailLabel: 'Explique (al menos 30 caracteres)',
    detailHint: 'Obligatorio si el motivo es “perdido o no se encontró” u “Otro”.',
    saveNoTha: 'Guardar motivo de sin ATS',
    clearNoTha: 'Quitar esto y adjuntar un ATS',
    attach: 'Adjuntar PDF',
    upload: 'Subir PDF',
    override: 'Anular (solo Brian)',
    overrideHint: '¿Anular esta verificación? Su motivo queda registrado y se imprime en la página del revisor.',
    revoke: 'Quitar la anulación',
    whyLocation: 'lugar',
    whyCrew: 'cuadrilla',
    noneSuggested: 'Ningún ATS coincidió con la empresa, la fecha (un día) y el lugar o la cuadrilla. Elija uno de la lista de la empresa, o suba el PDF.',
    noneCompany: 'No hay ATS de esta empresa. Suba el PDF, o registre por qué no hay uno.',
    reasons: {
      office_shop_only: 'Solo oficina o taller — no hubo trabajo de campo',
      no_field_task_in_progress: 'No había una tarea de campo en curso',
      emergency_response_before_tha: 'La respuesta de emergencia empezó antes de poder escribir un ATS',
      tha_lost_or_not_found: 'El ATS se perdió o no se encuentra',
      other: 'Otro',
    },
  },
};

export function thaCopy(lang) {
  return THA_COPY[lang] || THA_COPY.en;
}

export function reasonLabel(code, lang = 'en') {
  return thaCopy(lang).reasons[code] || code || '';
}

export function normPlace(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function normCompany(value) {
  return normPlace(value).replace(/\b(llc|inc|incorporated|ltd|co|company|corp|corporation)\b/g, ' ').replace(/\s+/g, ' ').trim();
}

export function companiesMatch(a, b) {
  const x = normCompany(a);
  const y = normCompany(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const shorter = x.length <= y.length ? x : y;
  const longer = x.length <= y.length ? y : x;
  if (shorter.length < 4) return false;
  return longer.includes(shorter);
}

export function isoDay(value) {
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(String(value || ''));
  return m ? m[1] : null;
}

export function shiftIsoDate(iso, days) {
  const day = isoDay(iso);
  if (!day) return null;
  const [y, m, d] = day.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export function daysBetween(a, b) {
  const x = isoDay(a);
  const y = isoDay(b);
  if (!x || !y) return null;
  const dx = Date.parse(`${x}T00:00:00Z`);
  const dy = Date.parse(`${y}T00:00:00Z`);
  return Math.round((dx - dy) / 86400000);
}

export function placesOverlap(a, b) {
  const x = normPlace(a);
  const y = normPlace(b);
  if (x.length < 3 || y.length < 3) return false;
  return x === y || x.includes(y) || y.includes(x);
}

export function crewsMatch(incident, tha, crewNames = []) {
  const blob = normPlace([
    incident?.injured_person_name,
    incident?.reported_by_name,
    incident?.reported_by,
    incident?.team_leader_name,
    incident?.submitted_by,
  ].filter(Boolean).join(' '));
  if (blob.length < 4) return false;
  const people = [tha?.crew_lead, ...(crewNames || [])].map(normPlace).filter((n) => n.length >= 5);
  if (people.some((n) => blob.includes(n))) return true;
  const blobTokens = new Set(blob.split(' ').filter((t) => t.length >= 5));
  const tokens = people.flatMap((n) => n.split(' ').filter((t) => t.length >= 5));
  return tokens.some((t) => blobTokens.has(t));
}

/**
 * THAs that match company + incident date (±1 day) + location or crew.
 * thas: rows with tha_number, company, date, location, work_area, crew_lead.
 * crewByTha: optional { [tha_number]: string[] } of crew sign-off names.
 */
export function suggestThas(incident, thas, crewByTha = {}) {
  const out = [];
  const incidentCompany = incident?.company_name || incident?.company;
  const incidentPlace = incident?.location_name || incident?.location;
  for (const tha of thas || []) {
    if (!companiesMatch(incidentCompany, tha?.company)) continue;
    const delta = daysBetween(incident?.incident_date, tha?.date);
    if (delta == null || Math.abs(delta) > 1) continue;
    const loc = placesOverlap(incidentPlace, tha?.location) || placesOverlap(incidentPlace, tha?.work_area);
    const names = crewByTha[tha?.tha_number] || tha?.crew_names || [];
    const crew = crewsMatch(incident, tha, names);
    if (!loc && !crew) continue;
    out.push({ ...tha, match_location: !!loc, match_crew: !!crew, day_delta: delta });
  }
  out.sort((a, b) =>
    (Number(b.match_location) + Number(b.match_crew)) - (Number(a.match_location) + Number(a.match_crew))
    || Math.abs(a.day_delta) - Math.abs(b.day_delta)
    || String(a.tha_number).localeCompare(String(b.tha_number)));
  return out;
}

export function looksLikePdf(fileName, fileUrl) {
  const url = String(fileUrl || '').trim();
  if (!url) return false;
  const path = url.split('?')[0].split('#')[0];
  return /\.pdf$/i.test(String(fileName || '')) || /\.pdf$/i.test(path);
}

/** An evidence row that satisfies the THA gate: type THA and a PDF file. */
export function isThaPdfEvidence(row) {
  if (!row) return false;
  if (String(row.evidence_type || '').trim().toLowerCase() !== 'tha') return false;
  return looksLikePdf(row.file_name, row.file_url);
}

export function detailRequired(reason) {
  return NO_THA_DETAIL_REASONS.includes(reason);
}

/**
 * { ok, issues[] } for incidents.no_tha. Does not consider evidence or an override.
 */
export function validateNoTha(incident, lang = 'en') {
  const copy = thaCopy(lang);
  if (!incident?.no_tha) return { ok: false, issues: [copy.blocked] };
  const reason = String(incident.no_tha_reason || '');
  if (!NO_THA_REASONS.includes(reason)) {
    return { ok: false, issues: [copy.blocked] };
  }
  const detail = String(incident.no_tha_reason_detail || '').trim();
  if (detailRequired(reason) && detail.length < NO_THA_DETAIL_MIN) {
    return { ok: false, issues: [copy.detailHint] };
  }
  return { ok: true, issues: [] };
}

function overrideEmail(override) {
  return String(override?.by_email || override?.by || '').trim().toLowerCase();
}

/** Active Brian override only. Any other address, a revoked row, or a short reason does not count. */
export function isBrianThaOverride(override) {
  if (!override || override.revoked_at) return false;
  if (overrideEmail(override) !== THA_GATE_OWNER) return false;
  return String(override.reason || '').trim().length >= 10;
}

/**
 * The gate. status is 'pass' or 'block'.
 * via is 'evidence' | 'no_tha' | 'override' | null.
 */
export function evaluateThaGate({ incident, evidence, override } = {}, lang = 'en') {
  const copy = thaCopy(lang);
  const key = THA_GATE_KEY;
  if (isBrianThaOverride(override)) {
    return {
      status: 'pass',
      via: 'override',
      key,
      message: `${copy.passOverride} ${String(override.reason).trim()}`,
      override: {
        reason: String(override.reason).trim(),
        by: overrideEmail(override),
        at: override.created_at || override.at || null,
      },
    };
  }
  const hit = (evidence || []).find(isThaPdfEvidence);
  if (hit) {
    return {
      status: 'pass',
      via: 'evidence',
      key,
      message: copy.passEvidence,
      evidence_id: hit.id ?? null,
      source_tha_number: hit.source_tha_number || null,
    };
  }
  const no = validateNoTha(incident, lang);
  if (no.ok) {
    const label = reasonLabel(incident.no_tha_reason, lang);
    const detail = String(incident.no_tha_reason_detail || '').trim();
    return {
      status: 'pass',
      via: 'no_tha',
      key,
      message: detail ? `${copy.passNoTha} ${label} — ${detail}` : `${copy.passNoTha} ${label}`,
      no_tha_reason: incident.no_tha_reason,
    };
  }
  return { status: 'block', via: null, key, message: copy.blocked, issues: no.issues };
}

/** Human message for a trigger refusal coming back from a Supabase update. */
export function thaGateDbMessage(error) {
  const msg = error?.message || '';
  if (!/THA_GATE/.test(msg)) return null;
  return msg.replace(/^.*?THA_GATE:\s*/, '');
}

/** What the workbench, report page, and edge function call. Fails closed. */
export async function loadThaGate(supabase, incidentId) {
  try {
    const { data, error } = await supabase.rpc('inv_tha_gate', { p_incident: incidentId });
    if (error) return { status: 'error', key: THA_GATE_KEY, message: error.message };
    if (!data) return { status: 'error', key: THA_GATE_KEY, message: 'Investigation not found.' };
    return data;
  } catch (e) {
    return { status: 'error', key: THA_GATE_KEY, message: e?.message || 'network error' };
  }
}

export async function callThaApi(supabase, body) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch('/api/investigation-tha', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token || ''}`,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json) {
    return { ok: false, error: json?.error || `Request failed (${res.status}).` };
  }
  return { ok: true, ...json };
}

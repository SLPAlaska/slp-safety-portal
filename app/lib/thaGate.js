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
    browseHeading: 'THAs for this company',
    browseHint: 'Incident date, plus or minus one day, at this location. Widen the dates or include other locations if the right THA is not here.',
    showBrowse: 'None of these — browse the company’s THAs',
    dateWindowLabel: 'Date range',
    otherLocations: 'Include other locations',
    filterPlaceholder: 'Filter by crew, job, or location',
    view: 'View',
    previewTitle: 'THA preview',
    closePreview: 'Close',
    supervisor: 'Supervisor',
    crew: 'Crew',
    job: 'Job',
    site: 'Location',
    when: 'When',
    steps: 'Task steps',
    uploadHeading: 'Or upload a THA PDF',
    uploadHint: 'PDF only. It is stored with the other evidence on this investigation.',
    noThaHeading: 'No THA',
    noThaHint: 'Check this only when none of the THAs above is the one for this job.',
    justificationLabel: 'Justification',
    detailLabel: 'Explain (at least 30 characters)',
    detailHint: 'Required when the reason is “lost or not found” or “Other”.',
    saveNoTha: 'Save justification',
    clearNoTha: 'Remove this and attach a THA instead',
    attachButton: 'Attach THA',
    matchHeading: 'THAs that name someone on this investigation',
    matchHint: 'Same company, on the incident date or one day either side (shift crossover), and a crew or worker name that includes the person involved or a witness.',
    noMatch: 'No matching THA found',
    fallbackHint: 'Search this company’s THAs by number or date, or record that there is no THA.',
    searchNumber: 'THA number',
    searchDate: 'Date',
    search: 'Search',
    noneSearch: 'No THA for this company matched that number or date.',
    attach: 'Attach',
    upload: 'Upload PDF',
    override: 'Override (Brian only)',
    overrideHint: 'Override this check? Your reason is logged and prints on the reviewer page.',
    revoke: 'Remove override',
    whyLocation: 'location',
    whyCrew: 'crew',
    noneSuggested: 'No THA matched the company, the date (within a day), and the location or crew.',
    noneBrowse: 'No THAs in this date range and location. Widen the dates, include other locations, or record why there is not one.',
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
    browseHeading: 'ATS de esta empresa',
    browseHint: 'Fecha del incidente, más o menos un día, en este lugar. Amplíe las fechas o incluya otros lugares si el ATS correcto no está aquí.',
    showBrowse: 'Ninguno de estos — ver los ATS de la empresa',
    dateWindowLabel: 'Rango de fechas',
    otherLocations: 'Incluir otros lugares',
    filterPlaceholder: 'Filtrar por cuadrilla, trabajo o lugar',
    view: 'Ver',
    previewTitle: 'Vista del ATS',
    closePreview: 'Cerrar',
    supervisor: 'Supervisor',
    crew: 'Cuadrilla',
    job: 'Trabajo',
    site: 'Lugar',
    when: 'Cuándo',
    steps: 'Pasos de la tarea',
    uploadHeading: 'O suba un PDF del ATS',
    uploadHint: 'Solo PDF. Se guarda con la otra evidencia de esta investigación.',
    noThaHeading: 'No hay ATS',
    noThaHint: 'Márquelo solo cuando ninguno de los ATS de arriba sea el de este trabajo.',
    justificationLabel: 'Justificación',
    detailLabel: 'Explique (al menos 30 caracteres)',
    detailHint: 'Obligatorio si el motivo es “perdido o no se encontró” u “Otro”.',
    saveNoTha: 'Guardar justificación',
    clearNoTha: 'Quitar esto y adjuntar un ATS',
    attachButton: 'Adjuntar ATS',
    matchHeading: 'ATS que nombran a alguien de esta investigación',
    matchHint: 'La misma empresa, en la fecha del incidente o un día antes o después (cambio de turno), y un nombre de la cuadrilla que incluye a la persona involucrada o a un testigo.',
    noMatch: 'No se encontró un ATS que coincida',
    fallbackHint: 'Busque los ATS de esta empresa por número o fecha, o registre que no hay ATS.',
    searchNumber: 'Número de ATS',
    searchDate: 'Fecha',
    search: 'Buscar',
    noneSearch: 'Ningún ATS de esta empresa coincidió con ese número o esa fecha.',
    attach: 'Adjuntar',
    upload: 'Subir PDF',
    override: 'Anular (solo Brian)',
    overrideHint: '¿Anular esta verificación? Su motivo queda registrado y se imprime en la página del revisor.',
    revoke: 'Quitar la anulación',
    whyLocation: 'lugar',
    whyCrew: 'cuadrilla',
    noneSuggested: 'Ningún ATS coincidió con la empresa, la fecha (un día) y el lugar o la cuadrilla.',
    noneBrowse: 'No hay ATS en este rango de fechas y lugar. Amplíe las fechas, incluya otros lugares, o registre por qué no hay uno.',
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

function pushPersonText(out, value) {
  if (value == null) return;
  if (typeof value === 'string') { out.push(value); return; }
  if (Array.isArray(value)) { value.forEach((v) => pushPersonText(out, v)); return; }
  if (typeof value === 'object') pushPersonText(out, value.name || value.witness_name || value.full_name || '');
}

/** People the THA crew must include: involved person, witnesses, and the named investigation team. */
export function involvedPeople(incident, witnesses = []) {
  const raw = [];
  for (const key of [
    'injured_person_name', 'injured_name', 'reported_by_name', 'team_leader_name',
    'supervisor_name', 'team_members_names', 'mentor_name', 'external_investigator_name',
    'witnesses', 'witness_statement_summary',
  ]) pushPersonText(raw, incident?.[key]);
  for (const w of witnesses || []) {
    pushPersonText(raw, w?.witness_name);
    pushPersonText(raw, w?.name);
    pushPersonText(raw, w?.other_witness_names);
  }
  const seen = new Set();
  const out = [];
  for (const value of raw) {
    for (const part of String(value).split(/[,;\n|/]+/)) {
      const text = part.trim();
      const key = normPlace(text);
      if (key.length < 4 || seen.has(key)) continue;
      seen.add(key);
      out.push(text);
    }
  }
  return out;
}

export function nameTokens(value) {
  return normPlace(value).split(' ').filter(Boolean);
}

/**
 * Does this crew line name the same person?
 * A token of 4+ letters in common is enough ("Ched" on "Ched Isaac").
 * A shortened last name still counts ("Ched I" and "Ched Isaac").
 */
export function personOnCrew(person, crewNames) {
  const want = nameTokens(person);
  const strong = want.filter((t) => t.length >= 4);
  const first = strong[0] || '';
  const last = strong.length > 1 ? strong[strong.length - 1] : '';
  if (!first) return false;
  for (const raw of crewNames || []) {
    const tokens = nameTokens(raw);
    if (!tokens.length) continue;
    if (strong.some((t) => tokens.includes(t))) return true;
    if (tokens[0] !== first) continue;
    if (!last) return true;
    if (tokens.some((t, i) => i > 0 && t[0] === last[0])) return true;
  }
  return false;
}

/**
 * Company + incident date ±1 day + crew/worker names the involved person or a witness.
 * Location is not required. Another company's THA never matches.
 * This is the investigation lookup. It does not use the open-THA company filter.
 */
export function matchThasByPeople(incident, thas, { witnesses = [] } = {}) {
  const people = involvedPeople(incident, witnesses);
  const company = incident?.company_name || incident?.company;
  const out = [];
  for (const tha of thas || []) {
    if (!companiesMatch(company, tha?.company)) continue;
    const delta = daysBetween(incident?.incident_date, tha?.date);
    if (delta == null || Math.abs(delta) > 1) continue;
    const crew = [tha?.crew_lead, ...(tha?.crew_names || [])].filter(Boolean);
    const matched = people.filter((person) => personOnCrew(person, crew));
    if (!matched.length) continue;
    out.push({ ...tha, day_delta: delta, matched_people: matched });
  }
  out.sort((a, b) =>
    Math.abs(a.day_delta) - Math.abs(b.day_delta)
    || String(b.date || '').localeCompare(String(a.date || ''))
    || String(a.tha_number).localeCompare(String(b.tha_number)));
  return out;
}

/**
 * Fallback when no person matched. Still the investigation's company only.
 * A number, a date (±1 day), or both. Empty input matches nothing.
 */
export function searchThasForIncident(incident, thas, { thaNumber = '', date = '' } = {}) {
  const company = incident?.company_name || incident?.company;
  const num = normPlace(thaNumber).replace(/\s+/g, '');
  const day = isoDay(date);
  if (!num && !day) return [];
  return (thas || []).filter((tha) => {
    if (!companiesMatch(company, tha?.company)) return false;
    if (num && !normPlace(tha?.tha_number).replace(/\s+/g, '').includes(num)) return false;
    if (day) {
      const delta = daysBetween(day, tha?.date);
      if (delta == null || Math.abs(delta) > 1) return false;
    }
    return true;
  });
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

/** Windows the browse list can be widened to. Default is the incident date ±1 day. */
export const THA_DATE_WINDOWS = [1, 3, 7, 14, 30];

export function clampDateWindow(days) {
  const n = Number(days);
  return THA_DATE_WINDOWS.includes(n) ? n : 1;
}

/** Clock time in Alaska. THA rows store a date plus created_at; there is no separate time column. */
export function thaTimeLabel(createdAt) {
  if (!createdAt) return '';
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Anchorage',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d);
}

/**
 * Company THAs in a date window around the incident.
 * otherLocations false keeps rows whose location or work area overlaps the incident site.
 * An incident with no site is not location-filtered.
 */
export function browseThas(incident, thas, { days = 1, otherLocations = false } = {}) {
  const windowDays = clampDateWindow(days);
  const incidentCompany = incident?.company_name || incident?.company;
  const incidentPlace = incident?.location_name || incident?.location;
  const out = [];
  for (const tha of thas || []) {
    if (!companiesMatch(incidentCompany, tha?.company)) continue;
    const delta = daysBetween(incident?.incident_date, tha?.date);
    if (delta == null || Math.abs(delta) > windowDays) continue;
    if (!otherLocations && incidentPlace) {
      const loc = placesOverlap(incidentPlace, tha?.location) || placesOverlap(incidentPlace, tha?.work_area);
      if (!loc) continue;
    }
    out.push({ ...tha, day_delta: delta });
  }
  out.sort((a, b) =>
    String(b.date || '').localeCompare(String(a.date || ''))
    || String(b.created_at || '').localeCompare(String(a.created_at || ''))
    || String(a.tha_number).localeCompare(String(b.tha_number)));
  return out;
}

/**
 * Free-text filter for the browse list. Matches crew, supervisor, job, and location.
 * The THA number is not searchable — crews do not know it.
 */
export function filterThaBrowse(rows, query) {
  const q = normPlace(query);
  if (!q) return rows || [];
  const tokens = q.split(' ').filter(Boolean);
  return (rows || []).filter((tha) => {
    const blob = normPlace([
      tha?.location,
      tha?.work_area,
      tha?.task_description,
      tha?.crew_lead,
      ...(tha?.crew_names || []),
    ].filter(Boolean).join(' '));
    return tokens.every((tok) => blob.includes(tok));
  });
}

/** Visible row text. Deliberately omits the THA number. */
export function thaRowText(tha) {
  return [
    tha?.date,
    thaTimeLabel(tha?.created_at),
    tha?.location,
    tha?.work_area,
    tha?.task_description,
    tha?.crew_lead,
    ...(tha?.crew_names || []),
  ].filter(Boolean).join(' · ');
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

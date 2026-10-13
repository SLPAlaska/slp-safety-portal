// node scripts/check-tha-gate.mjs — THA hard gate.
// The rules live in app/lib/thaGate.js and are repeated in SQL 58.
// This runs the shipped functions (not a retyped copy) and checks the
// migration still names the same reasons, the 30-character detail, the
// Brian-only override, and that it does not replace inv_quality_gate_eval.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { PDFDocument } from 'pdf-lib';
import {
  THA_COPY,
  THA_GATE_OWNER,
  NO_THA_REASONS,
  browseThas,
  evaluateThaGate,
  filterThaBrowse,
  incidentInstant,
  isBrianThaOverride,
  isThaPdfEvidence,
  matchThasByPeople,
  personOnCrew,
  suggestThas,
  thaDateRefusal,
  thaRowText,
  validateNoTha,
} from '../app/lib/thaGate.js';
import { filterThasForScope } from '../app/lib/thaCloser.js';
import { buildThaPdf } from '../app/lib/thaPdf.js';

const incident = {
  id: '00000000-0000-4000-8000-000000000001',
  incident_id: 'INC-TEST-0001',
  company_name: 'MagTec',
  incident_date: '2026-10-12',
  location_name: 'Pad A-12',
  injured_person_name: 'Ched Isaac',
  no_tha: false,
};

const pdfEvidence = {
  id: 9,
  evidence_type: 'THA',
  file_name: 'THA-1.pdf',
  file_url: 'https://example.test/incident-evidence/THA-1.pdf',
  source_tha_number: 'THA-1',
};

// Blocked with neither a THA PDF nor a No-THA reason.
assert.equal(evaluateThaGate({ incident, evidence: [] }).status, 'block');
assert.equal(evaluateThaGate({ incident, evidence: [{ evidence_type: 'Photo', file_name: 'a.jpg', file_url: 'https://x/a.jpg' }] }).status, 'block');
assert.equal(isThaPdfEvidence({ evidence_type: 'THA', file_name: 'note.txt', file_url: 'https://x/note.txt' }), false);
assert.equal(evaluateThaGate({ incident, evidence: [{ evidence_type: 'THA', file_name: 'scan.png', file_url: 'https://x/scan.png' }] }).status, 'block');

// Passes with THA evidence (a PDF).
const withPdf = evaluateThaGate({ incident, evidence: [pdfEvidence] });
assert.equal(withPdf.status, 'pass');
assert.equal(withPdf.via, 'evidence');
assert.equal(isThaPdfEvidence({ evidence_type: ' tha ', file_name: 'x.PDF', file_url: 'https://x/file' }), true);

// Passes with a valid No-THA reason that does not need free text.
for (const reason of ['office_shop_only', 'no_field_task_in_progress', 'emergency_response_before_tha']) {
  const g = evaluateThaGate({ incident: { ...incident, no_tha: true, no_tha_reason: reason }, evidence: [] });
  assert.equal(g.status, 'pass', reason);
  assert.equal(g.via, 'no_tha');
}

// Other / lost with short text is blocked. 30 characters passes.
const short = 'Too short to explain.';
assert.ok(short.trim().length < 30);
for (const reason of ['tha_lost_or_not_found', 'other']) {
  const bad = evaluateThaGate({
    incident: { ...incident, no_tha: true, no_tha_reason: reason, no_tha_reason_detail: short },
    evidence: [],
  });
  assert.equal(bad.status, 'block', reason);
  assert.equal(validateNoTha({ no_tha: true, no_tha_reason: reason, no_tha_reason_detail: short }).ok, false);
  const detail = 'The crew THA was not in the truck and the office copy is gone.';
  assert.ok(detail.trim().length >= 30);
  const good = evaluateThaGate({
    incident: { ...incident, no_tha: true, no_tha_reason: reason, no_tha_reason_detail: detail },
    evidence: [],
  });
  assert.equal(good.status, 'pass', reason);
}

assert.equal(evaluateThaGate({ incident: { ...incident, no_tha: true, no_tha_reason: 'because' }, evidence: [] }).status, 'block');
assert.equal(evaluateThaGate({ incident: { ...incident, no_tha: false, no_tha_reason: 'office_shop_only' }, evidence: [] }).status, 'block');

// Override works only for Brian, and only while it is active with a real reason.
const brian = { by_email: THA_GATE_OWNER, reason: 'Office job, THA not required here.', revoked_at: null };
assert.equal(isBrianThaOverride(brian), true);
assert.equal(evaluateThaGate({ incident, evidence: [], override: brian }).status, 'pass');
assert.equal(evaluateThaGate({ incident, evidence: [], override: brian }).via, 'override');
assert.equal(evaluateThaGate({
  incident, evidence: [],
  override: { by_email: 'todd@slpalaska.com', reason: 'I am not Brian but I want this closed.' },
}).status, 'block');
assert.equal(evaluateThaGate({
  incident, evidence: [],
  override: { by: 'Brian@SLPAlaska.com', reason: 'Case is office-only and already explained.' },
}).via, 'override');
assert.equal(isBrianThaOverride({ ...brian, revoked_at: '2026-10-12T00:00:00Z' }), false);
assert.equal(isBrianThaOverride({ ...brian, reason: 'short' }), false);
assert.equal(evaluateThaGate({ incident, evidence: [], override: { ...brian, reason: 'short' } }).status, 'block');

// Suggestions: company + the incident calendar date + location or crew. Not company alone.
// A day earlier or later is never offered, even at the same pad.
const thas = [
  { tha_number: 'THA-1', company: 'MagTec LLC', date: '2026-10-11', location: 'Pad A-12', crew_lead: 'Someone Else' },
  { tha_number: 'THA-2', company: 'MagTec', date: '2026-10-12', location: 'Shop', crew_lead: 'Ched Isaac' },
  { tha_number: 'THA-3', company: 'Other Co', date: '2026-10-12', location: 'Pad A-12', crew_lead: 'Ched Isaac' },
  { tha_number: 'THA-4', company: 'MagTec', date: '2026-10-09', location: 'Pad A-12', crew_lead: 'Ched Isaac' },
  { tha_number: 'THA-5', company: 'MagTec', date: '2026-10-12', location: 'Far Away Camp', crew_lead: 'Nobody Relevant' },
  { tha_number: 'THA-6', company: 'MagTec', date: '2026-10-13', location: 'Pad A-12', crew_lead: 'Ched Isaac' },
];
assert.deepEqual(suggestThas(incident, thas).map((t) => t.tha_number), ['THA-2']);

// Browse list: company + the incident calendar date. Locations can widen; dates cannot.
// The free-text filter matches crew, job, and location, never the THA number.
const browseRows = [
  { tha_number: 'THA-1', company: 'MagTec LLC', date: '2026-10-11', created_at: '2026-10-11T18:00:00Z', location: 'Pad A-12', work_area: 'Wellhead', task_description: 'Change the glycol filter', crew_lead: 'Dana Cole', crew_names: ['Ched Isaac'] },
  { tha_number: 'THA-PAD', company: 'MagTec', date: '2026-10-12', created_at: '2026-10-12T18:00:00Z', location: 'Pad A-12', work_area: 'Wellhead', task_description: 'Change the glycol filter', crew_lead: 'Dana Cole', crew_names: ['Ched Isaac'] },
  { tha_number: 'THA-2', company: 'MagTec', date: '2026-10-12', location: 'Shop', work_area: 'Bay 2', task_description: 'Shop inventory', crew_lead: 'Ched Isaac', crew_names: [] },
  { tha_number: 'THA-5', company: 'MagTec', date: '2026-10-12', location: 'Far Away Camp', task_description: 'Camp move', crew_lead: 'Nobody Relevant', crew_names: ['Pat Lee'] },
  { tha_number: 'THA-4', company: 'MagTec', date: '2026-10-09', location: 'Pad A-12', task_description: 'Earlier job', crew_lead: 'Ched Isaac', crew_names: [] },
  { tha_number: 'THA-6', company: 'MagTec', date: '2026-10-13', location: 'Pad A-12', task_description: 'Next day job', crew_lead: 'Ched Isaac', crew_names: [] },
  { tha_number: 'THA-3', company: 'Other Co', date: '2026-10-12', location: 'Pad A-12', task_description: 'Not our company', crew_lead: 'Ched Isaac', crew_names: [] },
];
assert.deepEqual(browseThas(incident, browseRows).map((t) => t.tha_number), ['THA-PAD']);
assert.deepEqual(browseThas(incident, browseRows, { otherLocations: true }).map((t) => t.tha_number).sort(), ['THA-2', 'THA-5', 'THA-PAD']);
assert.deepEqual(browseThas(incident, browseRows, { days: 7 }).map((t) => t.tha_number), ['THA-PAD'], 'a date window is ignored');
const sameDay = browseThas(incident, browseRows, { otherLocations: true });
assert.deepEqual(filterThaBrowse(sameDay, 'isaac').map((t) => t.tha_number).sort(), ['THA-2', 'THA-PAD']);
assert.deepEqual(filterThaBrowse(sameDay, 'glycol').map((t) => t.tha_number), ['THA-PAD']);
assert.deepEqual(filterThaBrowse(sameDay, 'pad a-12').map((t) => t.tha_number), ['THA-PAD']);
assert.deepEqual(filterThaBrowse(sameDay, 'THA-PAD'), [], 'the THA number is not a search field');
assert.equal(thaRowText(browseRows[1]).includes('THA-PAD'), false);
assert.match(thaRowText(browseRows[1]), /Pad A-12/);
assert.match(thaRowText(browseRows[1]), /Ched Isaac/);
assert.match(thaRowText(browseRows[1]), /glycol filter/);

// INC-2026-0085: MagTec Alaska, Deadhorse, 2026-10-09, person Ched Isaac.
// The THA the next day lists the crew member as "Ched I", not the full name.
const inc0085 = {
  incident_id: 'INC-2026-0085',
  company_name: 'MagTec Alaska',
  incident_date: '2026-10-09',
  incident_time: '15:02:00',
  location_name: 'Deadhorse',
  injured_person_name: 'Ched Isaac',
};
const tha0085 = {
  tha_number: 'THA-20261010-5905',
  company: 'MagTec Alaska',
  date: '2026-10-10',
  created_at: '2026-10-10T17:14:38Z',
  location: 'Deadhorse',
  task_description: 'General automotive and equipment Maintenance',
  crew_lead: 'Shop lead',
  crew_names: ['Ched I'],
};
assert.equal(incidentInstant(inc0085).toISOString(), '2026-10-09T23:02:00.000Z');
assert.match(thaDateRefusal(inc0085, tha0085), /dated after/);
assert.equal(personOnCrew('Ched Isaac', ['Ched I']), true);
assert.equal(personOnCrew('Ched Isaac', ['Sam Ortiz']), false);
const sameDayBefore = {
  ...tha0085,
  tha_number: 'THA-20261009-2594',
  date: '2026-10-09',
  created_at: '2026-10-09T14:50:07Z',
};
const sameDayAfter = {
  ...sameDayBefore,
  tha_number: 'THA-LATE',
  created_at: '2026-10-10T01:36:33Z',
};
assert.match(thaDateRefusal(inc0085, sameDayAfter), /created after/);
assert.equal(thaDateRefusal(inc0085, sameDayBefore), null);
const hit0085 = matchThasByPeople(inc0085, [
  tha0085,
  sameDayBefore,
  sameDayAfter,
  { ...sameDayBefore, tha_number: 'THA-OTHER', company: 'Other Co', crew_names: ['Ched Isaac'] },
  { ...sameDayBefore, tha_number: 'THA-OLD', date: '2026-10-07' },
  { ...sameDayBefore, tha_number: 'THA-WITNESS', crew_names: ['Pat Lee'], crew_lead: 'Pat Lee' },
]);
assert.deepEqual(hit0085.map((t) => t.tha_number), ['THA-20261009-2594']);
assert.equal(matchThasByPeople(inc0085, [tha0085]).length, 0, 'THA-20261010-5905 is the next day and is not offered');
assert.equal(browseThas(inc0085, [tha0085], { otherLocations: true }).length, 0);
const byWitness = matchThasByPeople(
  { ...inc0085, injured_person_name: '' },
  [sameDayBefore],
  { witnesses: [{ witness_name: 'Ched Isaac' }] },
);
assert.equal(byWitness.length, 1, 'a witness name matches the crew on the incident date');
// Open-THA list (PR #21) hides MagTec from an SLP investigator who is not that company.
const todd = { isStaff: false, companyName: 'SLP', companyNames: ['SLP'] };
assert.equal(filterThasForScope([tha0085], todd).length, 0);
assert.equal(matchThasByPeople(inc0085, [sameDayBefore]).length, 1, 'investigation lookup is not the open-THA filter');
assert.equal(matchThasByPeople({ ...inc0085, incident_time: null }, [{ ...sameDayBefore, created_at: null }]).length, 1, 'no incident time does not require a created time');

// English and Spanish copy cover the same keys and every reason.
function keysOf(obj, prefix = '') {
  return Object.entries(obj).flatMap(([k, v]) => (
    v && typeof v === 'object' ? keysOf(v, `${prefix}${k}.`) : [`${prefix}${k}`]
  ));
}
assert.deepEqual(keysOf(THA_COPY.en), keysOf(THA_COPY.es));
for (const code of NO_THA_REASONS) {
  assert.ok(THA_COPY.en.reasons[code]);
  assert.ok(THA_COPY.es.reasons[code]);
}
assert.equal(evaluateThaGate({ incident, evidence: [] }, 'es').status, 'block');
assert.match(evaluateThaGate({ incident, evidence: [] }, 'es').message, /ATS|PDF/);

// Built PDF is a real PDF that names the THA, the step, and a crew sign-off.
const bytes = await buildThaPdf({
  tha: {
    tha_number: 'THA-2026-0042',
    date: '2026-10-12',
    company: 'MagTec',
    location: 'Pad A-12',
    crew_lead: 'Ched Isaac',
    task_description: 'Change the glycol filter',
    residual_risk: 'Low',
    stop_work_trigger: 'Stop if the line is still pressurized.',
  },
  steps: [{ step_number: 1, task_step: 'Isolate the filter', potential_hazards: 'Pressure', recommended_actions: 'Bleed down first' }],
  crew: [{ crew_member_name: 'Ched Isaac', company: 'MagTec', sign_off_time: '2026-10-12T15:00:00Z' }],
  incidentId: 'INC-TEST-0001',
});
assert.equal(Buffer.from(bytes).subarray(0, 4).toString(), '%PDF');
const doc = await PDFDocument.load(bytes);
assert.equal(doc.getTitle(), 'THA THA-2026-0042');
assert.ok(doc.getPageCount() >= 1);
const packed = Buffer.from(bytes).toString('latin1');
const inflated = [packed];
for (const match of packed.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
  try { inflated.push(inflateSync(Buffer.from(match[1], 'latin1')).toString('latin1')); } catch { /* not flate */ }
}
const raw = inflated.join('\n').replace(/<([0-9A-Fa-f\s]+)>/g, (_, hex) => {
  const compact = hex.replace(/\s+/g, '');
  if (compact.length % 2) return _;
  let text = '';
  for (let i = 0; i < compact.length; i += 2) text += String.fromCharCode(parseInt(compact.slice(i, i + 2), 16));
  return text;
});
assert.match(raw, /THA-2026-0042/);
assert.match(raw, /Isolate the filter/);
assert.match(raw, /Ched Isaac/);

// SQL 58: columns, check, evidence link, enforcement, Brian override log.
const dir = new URL('../supabase/migrations/', import.meta.url);
const file = readdirSync(dir).find((name) => /_58_inv_tha_gate\.sql$/.test(name));
assert.ok(file, 'SQL 58 migration is missing');
const sql = readFileSync(new URL(file, dir), 'utf8');
for (const col of ['no_tha', 'no_tha_reason', 'no_tha_reason_detail', 'no_tha_set_by', 'no_tha_set_at', 'source_tha_number']) {
  assert.match(sql, new RegExp(`\\b${col}\\b`), col);
}
for (const reason of NO_THA_REASONS) assert.match(sql, new RegExp(`'${reason}'`), reason);
assert.match(sql, /char_length\(btrim\(coalesce\(no_tha_reason_detail, ''\)\)\) >= 30/);
assert.match(sql, /stage_1_complete/);
assert.match(sql, /stage_4_complete/);
assert.match(sql, /'Pending Approval', 'Approved', 'Closed'/);
assert.match(sql, /evidence_type/);
assert.match(sql, /\\\.pdf/);
assert.match(sql, /brian@slpalaska\.com/);
assert.match(sql, /investigation_activity_log/);
assert.match(sql, /gate_key = 'THA'/);
assert.match(sql, /THA_GATE:/);
assert.doesNotMatch(sql, /create or replace function public\.inv_quality_gate_eval/i);
assert.match(sql, /inv_quality_gate_eval\(p_inc\)/);

// The other quality-gate rules are still in SQL 54, untouched by this check's file.
const files = readdirSync(dir);
const s54 = readFileSync(new URL(files.find((f) => /_54_inv_quality_gate_function\.sql$/.test(f)), dir), 'utf8');
for (const g of ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'G10', 'G11', 'G12', 'G14', 'G16', 'G17', 'C1', 'C5']) {
  assert.ok(s54.includes(`'${g}'`), `gate ${g} missing from inv_quality_gate_eval`);
}
assert.match(s54, /Quality gate overridden/);
assert.match(s54, /investigation_activity_log/);

// The attach panel browses by date, place, job, and crew. It does not ask for a THA number.
const panel = readFileSync(new URL('../app/components/ThaGate.js', import.meta.url), 'utf8');
const route = readFileSync(new URL('../app/api/investigation-tha/route.js', import.meta.url), 'utf8');
assert.match(panel, /data-testid="tha-attach-open"/);
assert.match(panel, /No matching THA found|copy\.noMatch/);
assert.match(panel, /data-testid="tha-browse-list"/);
assert.match(panel, /data-testid="tha-browse-filter"/);
assert.match(panel, /data-testid="tha-other-locations"/);
assert.match(panel, /data-testid="tha-view"/);
assert.match(panel, /data-testid="tha-attach"/);
assert.match(panel, /data-testid="tha-no-tha"/);
assert.match(panel, /type="checkbox"/);
assert.doesNotMatch(panel, /tha-search-number|tha-search-date|tha-fallback-search|tha-date-window/);
assert.doesNotMatch(panel, /tha-company-pick|pickPlaceholder|THA Number|placeholder="THA|search by THA/i);
assert.match(route, /browseThas/);
assert.match(route, /matchThasByPeople/);
assert.match(route, /thaDateRefusal/);
assert.match(route, /\.eq\('date', day\)/);
assert.match(route, /task_description/);
assert.match(route, /action === 'preview'/);
assert.match(route, /buildThaPdf/);
assert.doesNotMatch(route, /action === 'search'|dateWindowDays|shiftIsoDate|clampDateWindow/);
assert.doesNotMatch(route, /companyThas/);
assert.doesNotMatch(route, /filterThasForScope\s*\(/);
const workbench = readFileSync(new URL('../app/investigation-workbench/[id]/page.js', import.meta.url), 'utf8');
assert.match(workbench, /data-testid="evidence-attach-tha"/);

console.log('check:tha-gate: all checks passed');

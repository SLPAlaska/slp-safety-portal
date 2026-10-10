// app/lib/investigationGuide.js
//
// Shared rules for the investigation Interview Guide (P0, 2026-10-10).
// Pure functions + constants only — no React, no Supabase — so the field
// report, the workbench and node tests all read the same definitions.
//
// The question wording itself lives in the database (inv_question_bank),
// seeded from docs/investigation-question-banks-FULL.md, so it can be edited
// without a deploy. This file only knows the bank CODES and the rules for
// which banks load and when an answer counts.

/** Hazard / mechanism banks a field report can pick (multi). Order = how common. */
export const HAZARD_TYPES = [
  { code: 'hand_ppe',                          label: 'Hand / finger / PPE',            icon: '✋' },
  { code: 'line_of_fire',                      label: 'Struck-by / caught / dropped',   icon: '⚠️' },
  { code: 'slip_trip_fall',                    label: 'Slip, trip, fall',               icon: '🪜' },
  { code: 'vehicle',                           label: 'Vehicle / mobile equipment',     icon: '🚚' },
  { code: 'stored_energy',                     label: 'Pressure / LOTO / stored energy', icon: '⚡' },
  { code: 'chemical',                          label: 'Chemical / fluid exposure',      icon: '🧪' },
  { code: 'manual_handling',                   label: 'Lifting / strain',               icon: '🏋️' },
  { code: 'lifting_rigging',                   label: 'Crane / rigging / mast',         icon: '🏗️' },
  { code: 'spill_env',                         label: 'Spill / environmental',          icon: '🛢️' },
  { code: 'hot_work',                          label: 'Hot work / fire',                icon: '🔥' },
  { code: 'electrical',                        label: 'Electrical',                     icon: '🔌' },
  { code: 'confined_space',                    label: 'Confined space',                 icon: '🕳️' },
  { code: 'excavation_trench',                 label: 'Excavation / trench',            icon: '⛏️' },
  { code: 'weather_cold',                      label: 'Cold / weather / heat',          icon: '❄️' },
  { code: 'wildlife_bear',                     label: 'Wildlife / bear',                icon: '🐻' },
  { code: 'water_drowning_marine',             label: 'Water / dock / marine',          icon: '🌊' },
  { code: 'aviation_helicopter',               label: 'Aviation / helicopter',          icon: '🚁' },
  { code: 'property_damage_no_injury',         label: 'Property damage only',           icon: '🔧' },
  { code: 'near_miss_good_catch',              label: 'Near miss / good catch',         icon: '👀' },
  { code: 'psychological_violence_harassment', label: 'Violence / harassment',          icon: '🛑' },
  { code: 'other',                             label: 'Other / not listed',             icon: '❓' },
];
export const HAZARD_CODES = HAZARD_TYPES.map(h => h.code);

export const WORK_SETTINGS = ['Shop', 'Yard', 'Field/Pad', 'Camp', 'Road', 'Office', 'Dock/Marine', 'Aviation LZ'];

export const AUDIENCES = [
  { code: 'IP',   label: 'Involved person' },
  { code: 'SUP',  label: 'Supervisor' },
  { code: 'WIT',  label: 'Witness' },
  { code: 'PEER', label: 'Private peer (confidential)' },
  { code: 'INV',  label: 'Investigator conclusion' },
];

export const FACT_STATUSES = [
  { code: 'verified', label: 'Verified', hint: 'Seen, measured or documented' },
  { code: 'stated',   label: 'Stated',   hint: 'Someone told us' },
  { code: 'assumed',  label: 'Assumed',  hint: 'Not yet confirmed' },
];

/** Cause categories a corrective action links to (investigation_corrective_actions.root_cause_link). */
export const CAUSE_CATEGORIES = [
  'Equipment / tool design',
  'Equipment availability / stocking',
  'Procedure gap (missing or does not match the job)',
  'Supervision / enforcement',
  'Production pressure / goal conflict',
  'Normalized shortcut / culture',
  'Communication / handover',
  'Management system / resources / staffing',
  'Environment / conditions',
  'Fitness for duty / fatigue',
  'Contractor / multi-employer interface',
  'Knowledge / skill gap (proven)',
];
export const KNOWLEDGE_SKILL_CAUSE = 'Knowledge / skill gap (proven)';

// Must match public.inv_set_weak_control_flag() in supabase/migrations/20261010212422_sql_2026_10_10_28_inv_interview_guide_schema.sql.
export const WEAK_CA_PATTERN = /(counsel|re-?train|additional training|retrain|review(ed)? with (the )?crew|remind|be more careful|pay (more )?attention|toolbox|tailgate|safety meeting|coach|discuss(ed)? with|reinforce|re-?educat|verbal warning|written warning|disciplin|use common sense)/i;

/** True when a corrective action is counseling / retraining / reminder or Admin/PPE level. */
export function isWeakCA(ca) {
  if (!ca) return false;
  if (ca.weak_control_flag === true) return true;
  const lvl = Number(ca.hierarchy_level || 0);
  if (lvl >= 4) return true;
  const text = `${ca.description || ''} ${ca.action_description || ''}`;
  return WEAK_CA_PATTERN.test(text);
}

/**
 * Why the supervision & culture block is on for this incident (empty = off).
 * Triggers (overhaul §3.10): Shop/Yard OR repeat OR severity A–E OR PSIF / high energy.
 */
export function cultureTriggers(incident) {
  if (!incident) return [];
  const out = [];
  if (['Shop', 'Yard'].includes(incident.work_setting)) out.push(`Work setting: ${incident.work_setting}`);
  if (incident.is_repeat) out.push('Repeat: same company + hazard type in the last 12 months');
  const sev = String(incident.safety_severity || incident.severity_safety || '').trim().toUpperCase().charAt(0);
  if (sev && 'ABCDE'.includes(sev)) out.push(`Severity ${sev}`);
  if (incident.is_sif || incident.is_sif_p) out.push('SIF / SIF-P');
  if (incident.high_energy_present) out.push('High energy present');
  const psif = String(incident.psif_classification || '');
  if (/critical|high|sif-actual/i.test(psif)) out.push(psif);
  return out;
}

/** Bank codes to load, in display order. */
export function banksFor(incident, { cultureForced = false } = {}) {
  const hz = (Array.isArray(incident?.hazard_types) ? incident.hazard_types : []).filter(c => HAZARD_CODES.includes(c));
  const ordered = HAZARD_CODES.filter(c => hz.includes(c));
  const banks = ['core', ...ordered];
  if (cultureForced || cultureTriggers(incident).length > 0) banks.push('culture');
  banks.push('rootcause');
  return banks;
}

/** Suggest hazard banks from what the field report already captured. */
export function suggestHazards(incident) {
  if (!incident) return [];
  const s = new Set();
  const parts = (incident.injured_body_parts || []).join(' ').toLowerCase() + ' ' + String(incident.body_part_affected || '').toLowerCase();
  const energy = (incident.energy_types || []).join(' ').toLowerCase();
  const types = (incident.incident_types || []).join(' ').toLowerCase() + ' ' + String(incident.incident_type || '').toLowerCase();
  const text = `${incident.brief_description || ''} ${incident.detailed_description || ''}`.toLowerCase();
  if (/hand|finger|thumb|wrist/.test(parts) || /glove|finger|laceration|cut my/.test(text)) s.add('hand_ppe');
  if (/chemical/.test(energy) || /glycol|chemical|sds|methanol|acid|siphon/.test(text)) s.add('chemical');
  if (/vehicle/.test(types) || incident.vehicle_incident || /truck|backing|vehicle/.test(text)) s.add('vehicle');
  if (/gravity/.test(energy) || /slip|trip|fell|fall/.test(text)) s.add('slip_trip_fall');
  if (/pressure|electrical|mechanical/.test(energy) || /loto|lockout|pressure|bleed/.test(text)) s.add('stored_energy');
  if (/back|shoulder/.test(parts) || /strain|lift(ed|ing)/.test(text)) s.add('manual_handling');
  if (/motion/.test(energy) || /struck|pinch|caught|dropped/.test(text)) s.add('line_of_fire');
  if (/spill|environment/.test(types) || incident.environmental_release) s.add('spill_env');
  if (/fire|explosion/.test(types) || /fire|weld|torch/.test(text)) s.add('hot_work');
  if (/near miss/.test(types)) s.add('near_miss_good_catch');
  if (/property/.test(types) && !incident.injury_occurred) s.add('property_damage_no_injury');
  return [...s];
}

/** Options on a question that were picked and carry a follow-up probe. */
export function activeProbes(question, response) {
  const picked = new Set(response?.answer_choice || []);
  return (question?.options || []).filter(o => o.probe && picked.has(o.value));
}

/**
 * Does this response count as answered? N/A needs a reason. A picked chip that
 * opens a probe needs the probe answered too — the first answer is not the last.
 */
export function isAnswered(question, response) {
  if (!response) return false;
  if (response.not_applicable) return !!String(response.na_reason || '').trim();
  const hasChoice = Array.isArray(response.answer_choice) && response.answer_choice.length > 0;
  const hasText = !!String(response.answer_text || '').trim();
  const isChoiceType = ['chips', 'multi', 'yesno'].includes(question?.answer_type);
  if (isChoiceType ? !hasChoice : !hasText) return false;
  if (activeProbes(question, response).length > 0 && !String(response.probe_answer || '').trim()) return false;
  return true;
}

/**
 * Progress over the loaded questions.
 * confidentialCount: number of PRIV1 responses known to exist (needs >= 2).
 */
export function guideProgress(questions, responsesByCode, { confidentialCount = 0 } = {}) {
  const crit = questions.filter(q => q.is_critical);
  const missing = [];
  let done = 0;
  for (const q of crit) {
    const r = responsesByCode[q.code];
    let ok;
    if (q.is_confidential) ok = confidentialCount >= 2 || (r?.not_applicable && String(r?.na_reason || '').trim());
    else ok = isAnswered(q, r);
    if (ok) done++; else missing.push(q);
  }
  const answeredAll = questions.filter(q => !q.is_confidential && isAnswered(q, responsesByCode[q.code])).length;
  return { criticalTotal: crit.length, criticalDone: done, missing, answeredAll, total: questions.length };
}

/**
 * Soft close-out review (warn + justify, never a hard block).
 * Returns { issues: [{key, text}], weakOnly, needsJustification }.
 */
export function closeoutReview({ guide, correctiveActions = [], targetStatus }) {
  const issues = [];
  if (guide && guide.criticalTotal > guide.criticalDone) {
    issues.push({ key: 'critical', text: `${guide.criticalTotal - guide.criticalDone} critical interview question(s) not answered or marked N/A with a reason.` });
  }
  const cas = correctiveActions || [];
  if (cas.length === 0) {
    issues.push({ key: 'no_ca', text: 'No corrective actions recorded.' });
  } else {
    const noLink = cas.filter(c => !String(c.root_cause_link || '').trim()).length;
    if (noLink) issues.push({ key: 'no_link', text: `${noLink} corrective action(s) not linked to a cause.` });
    const noVerify = cas.filter(c => !String(c.verification_method || '').trim() || !c.verify_by).length;
    if (noVerify) issues.push({ key: 'no_verify', text: `${noVerify} corrective action(s) missing a verification method and verify-by date.` });
    if (targetStatus === 'Closed') {
      const open = cas.filter(c => !['Complete', 'Verified', 'Closed'].includes(c.status || c.action_status || 'Open')).length;
      if (open) issues.push({ key: 'open_ca', text: `${open} corrective action(s) still open.` });
    }
  }
  const weakOnly = cas.length > 0 && cas.every(isWeakCA);
  if (weakOnly) {
    const knowledgeLinked = cas.some(c => String(c.root_cause_link || '').startsWith(KNOWLEDGE_SKILL_CAUSE));
    issues.push({
      key: 'weak_only',
      text: 'Every corrective action is counseling / training / reminder or Admin/PPE level.'
        + (knowledgeLinked ? '' : ' None is linked to a proven knowledge/skill gap.'),
    });
  }
  return { issues, weakOnly, needsJustification: issues.length > 0 };
}

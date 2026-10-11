// 29 CFR Part 1904 injury / illness classification justification.
// Pure module (no React, no database): options, citation library, validation and
// the investigator guidance shown in the Workbench and Help Desk.
// Used by components/Osha1904Classification.js, the final report page, the
// generate-investigation-pdf Edge Function (mirrors LABELS) and check:osha1904.

export const OSHA1904_CLASSIFICATIONS = [
  { value: 'not_case',             label: 'Not an injury or illness case',  recordable: null,  group: 'none' },
  { value: 'first_aid',            label: 'First Aid only',                 recordable: false, group: 'not' },
  { value: 'bunkhouse',            label: 'Bunkhouse (remote site)',        recordable: false, group: 'not' },
  { value: 'personal',             label: 'Personal (non-job)',             recordable: false, group: 'not' },
  { value: 'other_not_recordable', label: 'Other: not recordable (explain)', recordable: false, group: 'not' },
  { value: 'recordable_mti',       label: 'OSHA Recordable: MTI (medical treatment beyond first aid)', recordable: true, group: 'rec' },
  { value: 'recordable_rwi',       label: 'OSHA Recordable: RWI (restricted work / job transfer)',     recordable: true, group: 'rec' },
  { value: 'recordable_lti',       label: 'OSHA Recordable: LTI (days away from work)',               recordable: true, group: 'rec' },
  { value: 'recordable_fatality',  label: 'OSHA Recordable: Fatality',                                 recordable: true, group: 'rec' },
]
export const OSHA1904_LABELS = Object.fromEntries(OSHA1904_CLASSIFICATIONS.map(c => [c.value, c.label]))

// Citation library: tap to add to the basis list; the narrative must still explain.
export const OSHA1904_CITATIONS = [
  { cite: '1904.4(a)',        title: 'Recording criteria: work-related, new case, meets general criteria' },
  { cite: '1904.5(a)',        title: 'Work-relatedness presumed for events or exposures in the work environment' },
  { cite: '1904.5(b)(1)',     title: 'Definition of the work environment' },
  { cite: '1904.5(b)(2)(i)',  title: 'Exception: present as a member of the general public' },
  { cite: '1904.5(b)(2)(ii)', title: 'Exception: symptoms surfacing at work solely from a non-work event' },
  { cite: '1904.5(b)(2)(iii)',title: 'Exception: voluntary wellness / fitness / recreation' },
  { cite: '1904.5(b)(2)(iv)', title: 'Exception: eating, drinking or preparing food for personal consumption' },
  { cite: '1904.5(b)(2)(v)',  title: 'Exception: personal tasks outside assigned working hours' },
  { cite: '1904.5(b)(2)(vi)', title: 'Exception: personal grooming, self-medication, self-inflicted' },
  { cite: '1904.5(b)(2)(vii)',title: 'Exception: motor vehicle accident in parking lot / access road during commute' },
  { cite: '1904.5(b)(2)(viii)',title: 'Exception: common cold or flu' },
  { cite: '1904.5(b)(2)(ix)', title: 'Exception: mental illness without a qualifying opinion' },
  { cite: '1904.5(b)(3)',     title: 'Significant aggravation of a pre-existing condition' },
  { cite: '1904.5(b)(6)',     title: 'Travel status; (b)(6)(i) hotel / temporary residence = "home away from home"' },
  { cite: '1904.5(b)(7)',     title: 'Working at home' },
  { cite: '1904.6',           title: 'New case vs. recurrence of a previously recorded case' },
  { cite: '1904.7(a)',        title: 'General recording criteria' },
  { cite: '1904.7(b)(2)',     title: 'Death' },
  { cite: '1904.7(b)(3)',     title: 'Days away from work (count calendar days, cap 180)' },
  { cite: '1904.7(b)(4)',     title: 'Restricted work or job transfer (routine functions = duties performed at least weekly)' },
  { cite: '1904.7(b)(5)',     title: 'Medical treatment beyond first aid' },
  { cite: '1904.7(b)(5)(ii)', title: 'First-aid list (the complete list; anything else is medical treatment)' },
  { cite: '1904.7(b)(6)',     title: 'Loss of consciousness' },
  { cite: '1904.7(b)(7)',     title: 'Significant injury or illness diagnosed by a physician / licensed health care professional' },
  { cite: '1904.8',           title: 'Needlestick and sharps injuries' },
  { cite: '1904.10',          title: 'Hearing loss (STS)' },
  { cite: '1904.29(b)(7)',    title: 'Privacy concern cases' },
  { cite: '1904.39',          title: 'Report to OSHA: fatality within 8 h; in-patient hospitalization, amputation or loss of an eye within 24 h' },
]

// What each classification must cite (at least one from each inner list).
const REQUIRED = {
  first_aid:            [['1904.7(b)(5)(ii)', '1904.7(b)(5)']],
  bunkhouse:            [['1904.5(a)', '1904.5(b)(1)'], ['1904.5(b)(2)', '1904.5(b)(6)']],
  personal:             [['1904.5(a)', '1904.5(b)(1)'], ['1904.5(b)(2)']],
  other_not_recordable: [['1904.4', '1904.5', '1904.6', '1904.7']],
  recordable_mti:       [['1904.5(a)', '1904.5(b)'], ['1904.7(b)(5)']],
  recordable_rwi:       [['1904.5(a)', '1904.5(b)'], ['1904.7(b)(4)']],
  recordable_lti:       [['1904.5(a)', '1904.5(b)'], ['1904.7(b)(3)']],
  recordable_fatality:  [['1904.5(a)', '1904.5(b)'], ['1904.7(b)(2)']],
}
const REQUIRED_HINT = {
  first_aid: 'cite 1904.7(b)(5)(ii) and name the first-aid item(s) given',
  bunkhouse: 'cite 1904.5(a) (work environment) AND the exception that applies, e.g. 1904.5(b)(2)(v) or 1904.5(b)(6)',
  personal: 'cite 1904.5(a) AND the 1904.5(b)(2) exception that applies',
  other_not_recordable: 'cite the 1904.4–1904.7 provision that makes it not recordable',
  recordable_mti: 'cite 1904.5 (work-related) AND 1904.7(b)(5) and name the treatment',
  recordable_rwi: 'cite 1904.5 (work-related) AND 1904.7(b)(4) and name the restricted routine functions',
  recordable_lti: 'cite 1904.5 (work-related) AND 1904.7(b)(3) and give the days away',
  recordable_fatality: 'cite 1904.5 (work-related) AND 1904.7(b)(2); 1904.39 8-hour report',
}

export const OSHA1904_MIN_CHARS = 150

export function normCite(s) {
  return String(s || '').replace(/§/g, '').replace(/29\s*cfr\s*(part\s*)?/ig, '').replace(/\s+/g, '').toLowerCase()
}
// Every 1904.x citation found in free text (e.g. "§ 1904.5(b)(2)(v)", "1904.7 (b)(5)").
export function citesInText(text) {
  const out = []
  const re = /1904\s*\.\s*(\d+)((?:\s*\([0-9a-z]+\))*)/gi
  let m
  while ((m = re.exec(String(text || '')))) out.push(normCite(`1904.${m[1]}${m[2]}`))
  return out
}
function covered(have, want) {
  const w = normCite(want)
  return have.some(h => h === w || h.startsWith(w))
}

export function isRecordable(classification) {
  const c = OSHA1904_CLASSIFICATIONS.find(x => x.value === classification)
  return c ? c.recordable : null
}

/**
 * Validate a 1904 classification block. Returns { ok, issues: [string] }.
 * value = { classification, work_related, basis: [cite], justification, days_away, days_restricted }
 */
export function validateOsha1904(value, { injuryCase = true } = {}) {
  const v = value || {}
  const issues = []
  const cls = v.classification || ''
  if (!cls) {
    issues.push(injuryCase ? 'Pick the 29 CFR 1904 classification.' : 'Pick the 29 CFR 1904 classification (choose "Not an injury or illness case" if nobody was hurt or made ill).')
    return { ok: false, issues }
  }
  if (cls === 'not_case') return { ok: true, issues }
  if (!REQUIRED[cls]) return { ok: false, issues: ['Unknown classification.'] }

  const text = String(v.justification || '').trim()
  if (text.length < OSHA1904_MIN_CHARS) issues.push(`Write the justification (at least ${OSHA1904_MIN_CHARS} characters): what the person was doing, why it is or is not work-related, and which 1904 provision decides it.`)
  if (/\[to complete/i.test(text)) issues.push('Finish the [TO COMPLETE] items in the justification.')

  const have = [...(v.basis || []).map(normCite), ...citesInText(text)]
  for (const anyOf of REQUIRED[cls]) {
    if (!anyOf.some(want => covered(have, want))) { issues.push(`Regulatory basis missing: ${REQUIRED_HINT[cls]}.`); break }
  }
  if (cls !== 'first_aid' && !v.work_related) issues.push('Answer "Work-related under 1904.5?" (yes or no).')
  if (isRecordable(cls) === true && v.work_related === 'no') issues.push('A recordable case must be work-related. Fix the classification or the work-related answer.')
  if ((cls === 'bunkhouse' || cls === 'personal') && v.work_related === 'yes') issues.push('Bunkhouse / Personal means an exception applies, so work-related must be "no".')
  if (cls === 'recordable_lti' && !(Number(v.days_away) > 0)) issues.push('Enter the days away from work (calendar days, cap 180).')
  if (cls === 'recordable_rwi' && !(Number(v.days_restricted) > 0)) issues.push('Enter the days of restricted work / job transfer.')
  return { ok: issues.length === 0, issues }
}

// Starter text for the narrative. Placeholders in [brackets] must be replaced.
export const OSHA1904_TEMPLATES = {
  bunkhouse:
`1904.5(a): The event occurred at [site], a remote location where the employee eats, sleeps and lives while on hitch, so the site is treated as the work environment. Work-relatedness is presumed unless an exception in 1904.5(b)(2) specifically applies, so the employee's activity at the time must be evaluated.
1904.5(b)(6)(i): Once an employee checks into a temporary residence, activities there are evaluated the same way as for a non-traveling employee.
Exception 1904.5(b)(2)(v): At the time of the event the employee was [off shift / outside assigned working hours] and was [personal activity, e.g. walking out of the door while waiting on the flight home]. No work task, tool, equipment or supervisor direction was involved.
Conclusion: Not work-related under 1904.5; not recordable on the OSHA 300 log. Classified as a bunkhouse (remote site) injury.`,
  personal:
`1904.5(a): The event occurred in the work environment at [location], so work-relatedness is presumed unless a 1904.5(b)(2) exception applies.
Exception 1904.5(b)(2)([i–ix]): [Explain the exception, e.g. personal task outside assigned working hours / eating for personal consumption / symptoms from a non-work event].
Conclusion: Not work-related; not recordable on the OSHA 300 log.`,
  first_aid:
`1904.5(a): Work-related: [what the employee was doing].
1904.7(b)(5)(ii): Treatment was limited to [first-aid item(s) from the list, e.g. cleaning and a bandage, non-prescription medication at non-prescription strength, cold pack]. No medical treatment beyond first aid, no restricted work, no days away, no loss of consciousness and no significant diagnosed injury.
Conclusion: First aid only; not recordable.`,
  other_not_recordable:
`[State the facts, then the 1904.4–1904.7 provision that makes this case not recordable, e.g. 1904.6 recurrence of a previously recorded case.]
Conclusion: Not recordable.`,
  recordable_mti:
`1904.5(a): Work-related: [what the employee was doing when injured, in the work environment; no 1904.5(b)(2) exception applies].
1904.7(b)(5): Medical treatment beyond first aid was provided: [e.g. rigid splint / sutures / prescription medication], which is not on the 1904.7(b)(5)(ii) first-aid list.
Not RWI: [why no restricted work, e.g. the physician's precaution did not keep the employee from any routine function of the job].
Conclusion: OSHA Recordable, medical treatment (MTI).`,
  recordable_rwi:
`1904.5(a): Work-related: [what happened].
1904.7(b)(4): The employee was kept from performing [routine function(s) performed at least weekly] / was transferred to another job for [n] days.
Conclusion: OSHA Recordable, restricted work / job transfer (RWI).`,
  recordable_lti:
`1904.5(a): Work-related: [what happened].
1904.7(b)(3): A physician or licensed health care professional recommended days away from work; [n] calendar days counted (cap 180), not counting the day of injury.
Conclusion: OSHA Recordable, days away (LTI).`,
  recordable_fatality:
`1904.5(a): Work-related: [what happened].
1904.7(b)(2): The employee died as a result of the work-related injury or illness.
1904.39: Reported to OSHA within 8 hours on [date/time], [method].
Conclusion: OSHA Recordable, fatality.`,
}

// Investigator guidance: two worked examples (names removed).
export const OSHA1904_EXAMPLES = [
  {
    title: 'Not recordable: bunkhouse (remote site) slip while waiting on the flight home',
    classification: 'bunkhouse',
    summary: 'A Helper at a remote North Slope site slipped walking out of a door while waiting on the airplane home. He was off shift and doing no work function: no task, no tools, no supervisor direction.',
    logic: [
      '1904.5(a): a remote camp where the employee eats, sleeps and lives is part of the work environment, so work-relatedness is presumed and you must check for an exception.',
      '1904.5(b)(6)(i): checking into a temporary residence creates a "home away from home"; evaluate activity there like a non-traveling employee.',
      '1904.5(b)(2)(v): personal tasks outside assigned working hours. He was off shift, waiting on transportation.',
      'Result: not work-related; not recordable. Classified Bunkhouse.',
    ],
    separate: 'Workers\' compensation is a separate decision. Under Alaska\'s remote-site (bunkhouse) doctrine the claim is likely compensable; report it to the carrier within 10 days (AS 23.30.070). Record that in the WC note, not in the OSHA justification.',
  },
  {
    title: 'Recordable MTI, not RWI: rigid splint, Helper kept doing routine duties',
    classification: 'recordable_mti',
    summary: 'A Helper injured a finger during well work. The clinic applied a rigid splint and advised a fine-motor precaution.',
    logic: [
      '1904.5(a): injured while doing assigned work in the work environment; no exception applies.',
      '1904.7(b)(5): a rigid splint used to immobilize is medical treatment. It is not on the 1904.7(b)(5)(ii) first-aid list (finger guards and non-rigid supports are).',
      '1904.7(b)(4): not RWI, because the fine-motor precaution did not keep him from any routine Helper function (duties done at least weekly).',
      'Result: OSHA Recordable MTI.',
    ],
  },
]

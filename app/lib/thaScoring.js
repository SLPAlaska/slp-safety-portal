// THA / JSA quality scoring (shared by app/tha-jsa/page.js and scripts/check-tha-scoring.mjs).
//
// Why this exists (2026-10-11): the old check gave every filled-in step 75 points
// before reading a word, floored every step at 50, and paid +10 for any two of
// "ppe / check / communicate / inspect" anywhere in the controls box. 69% of the
// last 90 days of THAs scored 95+, 173 of 789 were word-for-word copies of an
// earlier THA (165 of those still scored 95+), 130 ticked all 8 energy types,
// and the incidents in the same window (finger cut while "appropriate PPE" was
// the control, mouth-started glycol siphon, ankle rolls stepping off trucks and
// conexes, a 200 lb tote carried down truck stairs, an RVT hatch lifted by hand,
// pinch point between a suspended lubricator and the crane truck, a hose that
// let go after a pressure test) were all on days with A-grade THAs.
//
// What earns points now:
//   - a hazard that says HOW it hurts you (mechanism, body part, the thing),
//     not just "slips trips falls, pinch points, poor communication";
//   - a control that physically matches that hazard (bleed to zero, tag line,
//     transfer pump, 3 points of contact, cut-resistant gloves, loader...),
//     not "proper PPE / good communication / body ergonomics / be aware";
//   - the must-haves for the kind of work you wrote down (fluid transfer,
//     pressure, lifting, shop/parts, getting on/off trucks, rigging, backing,
//     spooling, hot work), taken from what actually hurt people;
//   - energy types you tick are actually dealt with in a step;
//   - the risk you honestly have left after controls, and the real thing that
//     makes this crew stop the job;
//   - something about today that is different from the last THA on this phone.
// 100 = nothing left to coach. Pure function, no I/O: the page passes the
// copy-check history in.

export const THA_SCORING_VERSION = '2026-10-11.v2'
export const PASS_SCORE = 60 // crew sign-off unlocks at D or better (unchanged)

const T = (s) => String(s || '').toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ').trim()
const has = (re, s) => re.test(s)

// Hazard themes: what the hazard text says, and the controls that actually answer it.
export const THEMES = [
  { id: 'cuts', label: 'cuts / sharp edges',
    hz: /\b(cuts?|lacerat\w*|sharp|edges?|slivers?|burrs?|punctur\w*|glass)\b/,
    ctl: /(cut.?resist\w*|cut.?(level|rated|proof)|gloves?|kevlar|tools? (rather than|instead of) hands|deburr\w*|edge (guard|protect\w*)|cover (the )?edges?|sheath|blade guard|box cutter|safety knife)/ },
  { id: 'pinch', label: 'pinch / crush / caught between',
    hz: /(pinch|crush|caught|in.?between|nip point|smash|mash)/,
    ctl: /(tag.?lines?|hands? (clear|off|free|out)|keep (your )?hands|no hands|push (stick|pole)|pull (hook|stick)|clearance|guard(ed|ing|s)?\b|chock\w*|block(ed|ing)? |lock(ed)? out|loto|stand clear|exclusion|magnet|handle(s)?\b|tool (to|instead))/ },
  { id: 'chemical', label: 'chemical / fluid exposure',
    hz: /(chemical|glycol|antifreeze|coolant|methanol|diesel|fuel|acid|caustic|corros\w*|fumes?|vapou?rs?|splash|sds|exposure|ingest\w*|swallow|toxic|h2s|hydrogen sulfide|benzene|solvent|mud|cuttings)/,
    ctl: /(sds|goggles?|face ?shield|chemical (gloves?|resist\w*|suit|apron)|nitrile|neoprene|pumps?\b|funnel|respirat\w*|ventilat\w*|gas (test|monitor|detector)|h2s (monitor|detector|alarm)|4.?gas|four.?gas|personal monitor|eye ?wash|containment|drip pan|duck ?pond|never (mouth|siphon)|no mouth|wind direction|upwind|tyvek)/ },
  { id: 'pressure', label: 'pressure / stored energy',
    hz: /(pressur\w*|stored energy|trapped|residual (pressure|energy)|hydraulic|pneumatic|hose (whip|rupture|failure|burst)|whip|springs?\b|tension|bleed|psi|bop\b|triplex)/,
    ctl: /(bleed\w*|zero|gauges?|verif\w*|isolat\w*|lock.?out|loto|whip.?(check|sock)|restrain\w*|hose (sock|restraint)|block valve|double block|depressur\w*|reliev\w*|vent(ed|ing)?\b|psv|relief valve|rated hose|inspect (the )?(hose|line|fitting)|pressure rating)/ },
  { id: 'lifting', label: 'lifting / strains',
    hz: /(lift\w*|carry\w*|strain|sprain|ergonom\w*|overexert\w*|heavy|weight|awkward|reach\w*|push\w*|pull\w*|twist\w*|back injur\w*)/,
    ctl: /(\d+\s*(lb|lbs|pound|kg)s?\b|weigh\w*|loader|crane|forklift|telehandler|zoom ?boom|hoist|dolly|cart|mechanical (aid|advantage|lift)|team lift|two.?(man|person|people)|2.?(man|person|people)|pry ?bar|chain ?fall|come.?along|break (it|the load) down|smaller loads?|lift assist|jack)/ },
  { id: 'falls', label: 'slips / trips / falls / stepping down',
    hz: /(slip|trip|falls?\b|falling\b|ice|icy|uneven|steps?\b|stairs?|ladder|height|elevat\w*|footing|ankle|rocks?\b|plywood|walking surface|snow)/,
    ctl: /(3.?points?|three.?points?|harness|absorbent|spill kit|clean (up )?(the )?spills?|walking (route|path)s?|designated (route|path|walkway)|route (hoses?|cords?|lines?) away|tie.?off|lanyard|guard ?rail|hand ?rail|ice (cleats?|spikes?|chipper|melt)|spikes|spikeys|cleats|yaktrax|sand(ed|ing)?\b|shovel\w*|salt|clear (the )?(path|walkway|steps|area|ice|snow)|lighting|flashlight|headlamp|face (the )?(ladder|steps|truck|unit|vehicle)|housekeeping|grating|mats?\b|look (down|at) (your|the) (footing|step|ground)|check (the )?(ground|footing))/ },
  { id: 'struck', label: 'struck by / line of fire / dropped objects',
    hz: /(struck|line of fire|dropped|falling objects?|swing\w*|suspended|overhead|flying|projectile|debris|rolling|roll away|moving (equipment|parts?))/,
    ctl: /(exclusion|barricad\w*|cones?\b|stand clear|out of (the )?line|tag.?lines?|tool (belt|tether|lanyard)|tether\w*|drop zone|spotter|never (stand )?under|no one under|face ?shield|safety glasses|guard\w*|secured?|chock\w*|red zone|keep clear)/ },
  { id: 'vehicle', label: 'driving / backing / traffic',
    hz: /(driv\w*|backing|vehicles?|traffic|blind spots?|roads?\b|collision|wildlife|animals?|caribou|fog|whiteout|visibility)/,
    ctl: /(spotter|360|walk.?around|g\.?o\.?a\.?l\.?|get out and look|cones?\b|separation|designated (route|path|lane|area)|travel path|keep (clear|out)|chock\w*|seat ?belts?|speed|mph|headlights?|trip plan|journey|radio|horn|clearance|door (is )?(fully )?(open|up)|pre.?trip|post.?trip|backup alarm|camera|following distance|pull over|stop (for|if))/ },
  { id: 'hot', label: 'hot work / fire / burns',
    hz: /(hot work|weld\w*|torch|grind\w*|sparks?|(?<!line.of.)fire\b|flammable|burns?\b|hot (surface|parts?|fluid|exhaust)|ignition)/,
    ctl: /(fire watch|extinguisher|gas test|lel|hot work permit|fire blanket|weld(ing)? (screen|blanket)|screens?\b|remove (all )?flammables?|cool(ed)? down|let (it )?cool|insulat\w*|heat (resistant )?gloves|welding gloves)/ },
  { id: 'electrical', label: 'electrical',
    hz: /(electric\w*|shock|arc flash|cords?\b|energi[sz]ed|voltage|power line|generator)/,
    ctl: /(loto|lock.?out|isolat\w*|gfci|test before touch|verify (dead|zero)|insulat\w*|inspect (the )?(cord|cable)|ground(ed|ing)|de.?energi[sz]\w*|breaker)/ },
  { id: 'noise', label: 'noise',
    hz: /(noise|noisy|loud)/,
    ctl: /(hearing|ear ?(plugs?|muffs?)|double hearing)/ },
  { id: 'cold', label: 'cold / weather / fatigue',
    hz: /(cold|frost\w*|wind ?chill|temperature|heat stress|fatigue|tired|long hours)/,
    ctl: /(warm.?up|arctic|cold weather gear|layers|breaks?\b|rotat\w*|buddy|wind ?chill|hydrat\w*|rest\w*|sleep|fit for duty|limit (exposure|time))/ },
  { id: 'spill', label: 'spills / leaks',
    hz: /(spills?|leaks?|drips?|releases?|loss of containment|overfill\w*)/,
    ctl: /(containment|duck ?ponds?|drip pans?|barricade \w* ?leak\w*|identify (and \w+ )?leak\w*|spill kit|absorbent|pads?\b|berm|liner|caps?\b|valves? (closed|shut)|inspect (the )?(hose|fitting|gasket|valve)|gaskets?|level (check|gauge)|watch (the )?level|don't overfill|stop (at|before))/ },
  { id: 'simops', label: 'SIMOPS / communication',
    hz: /(simops|other crews|multiple crews|communicat\w*)/,
    ctl: /(radio|channel|hand signals?|meeting|tailgate|permit|repeat.?back|confirm (with|the)|stop.?work|point of contact|single point|check.?in)/ },
]

// Things that read like a control but stop nothing on their own.
const GENERIC_CONTROL_PHRASES = [
  /\b(wear |use |proper |appropriate |correct |required )?(ppe|p ?p ?e)( as needed)?\b/g,
  /\b(good|proper|clear|open|constant) communication( with [a-z ]+)?/g, /\bcommunicat\w*\b/g,
  /\b(good |proper )?body (placement|ergonomics|mechanics|positioning)/g, /\b(good |proper )?ergonomics\b/g,
  /\b(follow |safety |proper )?procedures?\b/g, /\bsituational awareness\b/g, /\bawareness\b/g, /\baware\b/g,
  /\bbe (careful|alert|mindful|cautious)\b/g, /\bwatch (out|for|your)\b/g, /\bpay attention\b/g,
  /\beyes on( task| path)?\b/g, /\bstay (alert|focused)\b/g, /\buse caution\b/g, /\btake (your )?time\b/g,
  /\bskilled operator\b/g, /\bcommon sense\b/g, /\bgood judg(e)?ment\b/g, /\bsafe(ly)?\b/g, /\bas needed\b/g,
]
const AWARENESS = /(be careful|awareness|\baware\b|watch out|watch for|pay attention|be alert|stay alert|look out|be cautious|use caution|be mindful|eyes on|stay focused)/

// Hazard words that on their own are a category, not a hazard.
const GENERIC_HAZARD_WORDS = new Set(('slips slip trips trip falls fall pinch points point poor communication equipment damage failure ' +
  'weather noise spills spill leaks drips line of fire struck by caught in between and body strains strain ' +
  'lifting ergonomics hazards hazard crush zones zone simops h2s driving backing wildlife other drivers ' +
  'cold stress temperature extremes electrical pressurized systems system lines high level levels dropped objects ' +
  'the a an to of on or with for at from it is be loud').split(' '))
// Words that show the writer is describing THIS job's mechanism.
const MECHANISM = /\b(from|when|while|if|could|between the|on the|off the|under|caused|due to|during|into|hand|hands|finger|fingers|ankle|knee|back|eye|eyes|head|foot|feet|face|shoulder|wrist|mouth|lb|lbs|psi|ft)\b/

// Work types seen in the incidents. If the THA describes this work, it has to
// deal with what hurt people doing it.
export const WORK_RULES = [
  { id: 'fluid', label: 'Fluid / glycol / fuel transfer',
    work: /(glycol|antifreeze|coolant|fuel(ing)?\b|diesel|methanol|fluid transfer|transfer(ring)? (of )?fluids?|drain(ing)?\b|siphon|top(ping)? off|over.?fill|reservoir|surge tank)/,
    need: [/(pumps?\b|funnel|vac(uum)?\b|never (mouth|siphon)|no mouth|siphon (pump|bulb))/, /(chemical|glycol|splash|exposure|ingest|swallow|sds|goggles?|face ?shield|eye)/],
    coach: 'Fluid transfer: say HOW the fluid moves (transfer/hand pump, funnel) and the exposure (splash, eyes, mouth). Never start a siphon by mouth.' },
  { id: 'pressure', label: 'Pressure / pumps / hydraulics',
    work: /(pressure test|press(ure)? (up|test)|pressur\w*|bop\b|triplex|hydraulic|bleed|lubricator|pump(ing)? (unit|truck)|hot oil|frac)/,
    need: [/(bleed\w*|zero|gauges?|isolat\w*|whip.?(check|sock)|restrain\w*|lock.?out|loto|depressur\w*|vent(ed|ing)?\b|relief)/],
    coach: 'Pressure work: how will you PROVE zero (bleed down, read the gauge, open the bleeder) before anyone breaks a connection? Whip checks / restraints on hoses.' },
  { id: 'lifting', label: 'Manual lifting / carrying',
    work: /(\blift(ing)?\b|carry\w*|totes?\b|hatch|lids?\b|gaskets?|manual(ly)? (move|lift|handl\w*)|heavy|stack\w*|bags?\b|sacks?\b)/,
    need: [/(\d+\s*(lb|lbs|pound|kg)s?\b|weigh\w*|loader|crane|forklift|telehandler|zoom ?boom|hoist|dolly|cart|mechanical (aid|advantage)|team lift|two.?(man|person|people)|2.?(man|person|people)|pry ?bar|chain ?fall|come.?along|lift assist)/],
    coach: 'Lifting: write the weight (or "unknown - use the loader/hoist") and the aid: loader, hoist, dolly, 2-person carry. No heavy carries down truck stairs.' },
  { id: 'shop', label: 'Shop / repair / parts handling',
    work: /(repair\w*|\bparts?\b|\bshop\b|mechanic\w*|\bmaint(enance)?\b|fabricat\w*|wrench\w*|grind\w*|install\w*|replac\w*|change ?out|tear ?down)/,
    need: [/\b(cuts?|sharp|edges?|lacerat\w*|burrs?|punctur\w*)\b/, /(cut.?resist\w*|cut.?(level|rated)|gloves?|kevlar|deburr\w*|edge (guard|protect\w*))/],
    coach: 'Shop / repair / parts: name the sharp edges and the glove you will wear (cut-resistant, impact). "Appropriate PPE" does not stop a cut.' },
  { id: 'egress', label: 'Getting on / off trucks, units, conexes',
    work: /(\bunits?\b|cone?xe?s?\b|connex\w*|\bcab\b|stairs|ladders?\b|step(ping)? (down|off|out|up)|climb\w*|get(ting)? (in|out|on|off) (of )?(the )?(truck|tractor|trailer|unit|cab)|truck (bed|box|deck|steps)|service truck|\bsemi\b|tractor|trailer|chassis)/,
    need: [/(3.?points?|three.?points?|face (the )?(ladder|steps|truck|unit|vehicle|cab)|ice (cleats?|spikes?)|spikes|spikeys|cleats|yaktrax|sand(ed)?\b|clear(ed)? (the )?(steps|path|walkway|ground|ice|snow)|check (the )?(ground|footing|landing)|look (down|at) (your|the) (footing|step|ground|landing)|lighting|headlamp|flashlight|hand ?rail)/],
    coach: 'Getting on/off trucks, units, conexes: 3 points of contact, face the steps, look at the landing (ice, rocks, plywood edges) before you step down. Ankle rolls are our top injury.' },
  { id: 'rigging', label: 'Rigging / crane / winch / box loading',
    work: /(crane|rigging|slings?\b|suspend\w*|lubricator|winch\w*|wire rope|hoist\w*|\bpick(ing)?\b|boom\b|load(ing)? (the )?(acb|box|bin|boxes|acbs)|acbs?\b|roll.?off|bins?\b)/,
    need: [/(tag.?lines?|hands? (off|free|clear|out)|keep (your )?hands|clearance|inspect\w* (the )?(rigging|slings?|wire|cable|rope|winch)|(rigging|sling|wire rope|cable) (inspect\w*|check\w*)|exclusion|stand clear|never (stand )?under|no one under|lift plan|red zone)/],
    coach: 'Rigging / winching / loading boxes: inspect the wire rope or rigging, hands off the load (tag line), and keep clear of the gap between the load and fixed equipment.' },
  { id: 'backing', label: 'Backing / spotting / tight bays',
    work: /(\bback(ing)?\b|spot(ting)? (the |in )|revers\w*|\bbay\b|overhead door|roll.?up door|parking)/,
    need: [/(spotter|get out and look|g\.?o\.?a\.?l\.?|360|walk.?around|door (is )?(fully )?(open|up)|clearance|camera|cones?\b)/],
    coach: 'Backing / pulling into bays: spotter or get out and look, and confirm overhead doors are fully up and clearance is checked before you move.' },
  { id: 'spooling', label: 'Spooling / cable / line under tension',
    work: /(spool\w*|wireline|slickline|e.?line|braided line|\bdrum\b|\breel\b|cable (change|cut|swap))/,
    need: [/(hands? (off|clear|free|out)|no hands|lock.?out|loto|brake|guard\w*|stand clear|line of fire|out of (the )?bight|clear of (the )?(line|cable))/],
    coach: 'Spooling / cable work: nobody holds a moving cable by hand. Brake set / locked out before hands go on the line; stay out of the bight.' },
  { id: 'hot', label: 'Hot work',
    work: /(weld\w*|torch|grind\w*|hot work|cutting torch|plasma)/,
    need: [/(fire watch|extinguisher|gas test|lel|hot work permit)/],
    coach: 'Hot work: fire watch, extinguisher at hand, gas test / hot work permit.' },
]

// Energy wheel -> hazard themes that show the energy was actually dealt with.
export const ENERGY_THEMES = {
  Gravity: ['falls', 'struck', 'lifting'], Motion: ['vehicle', 'struck', 'pinch'], Mechanical: ['pinch', 'struck', 'cuts'],
  Electrical: ['electrical'], Pressure: ['pressure'], Chemical: ['chemical', 'spill'], Temperature: ['cold', 'hot'],
  Stored: ['pressure', 'struck', 'pinch'],
}

const words = (s) => (s.match(/[a-z0-9]+/g) || [])
// Filler that carries no control on its own (used only to judge whether a
// controls box says anything beyond the generic phrases).
const FILLER = new Set('the for and with use using all job task work wear when any our your make sure ensure keep good proper needed need times time have has are was will can get got this that these those there their them they you its from into onto about always every each other more most very also just like out off per'.split(' '))
const splitItems = (s) => s.split(/[,;\n•]|\s-\s|\.(\s|$)|\band\b/).map((x) => (x || '').trim()).filter((x) => x && x.length > 1)

export function normaliseStep(st) { return T(st.hazards) + ' || ' + T(st.actions) }

function stripGeneric(ctl) {
  let s = ctl
  for (const re of GENERIC_CONTROL_PHRASES) s = s.replace(re, ' ')
  return s.replace(/[^a-z0-9]+/g, ' ').trim()
}

export function scoreStep(step) {
  const task = T(step.task), hz = T(step.hazards), ctl = T(step.actions)
  const out = { score: 0, themes: [], covered: [], uncovered: [], generic: false, awarenessOnly: false, hasGoodControls: false, tips: [] }
  if (!task && !hz && !ctl) return out
  // Task (0-15): what is actually being done.
  const tw = words(task).length
  out.score += tw === 0 ? 0 : tw < 3 ? 6 : tw < 7 ? 11 : 15
  if (tw < 3) out.tips.push('Say what the step actually is (e.g. "Pull bin onto trailer with winch").')
  // Hazards (0-35).
  const themes = THEMES.filter((t) => has(t.hz, hz))
  out.themes = themes.map((t) => t.id)
  if (!hz) out.tips.push('Add the hazard for this step.')
  else {
    const specificWords = words(hz).filter((w) => !GENERIC_HAZARD_WORDS.has(w) && w.length > 2)
    const mech = MECHANISM.test(hz)
    let h = themes.length === 0 ? 8 : themes.length < 3 ? 15 : 20
    if (mech) h += 10
    if (specificWords.length >= 6) h += 10; else if (specificWords.length >= 3) h += 5
    out.score += Math.min(35, h)
    if (!mech && specificWords.length < 3) out.tips.push('Hazard is a category list. Say HOW it hurts you here (e.g. "hand caught between bin and trailer rail").')
  }
  // Controls (0-50).
  if (!ctl) out.tips.push('Add the control for this step.')
  else {
    const rest = stripGeneric(ctl)
    const restWords = words(rest).filter((w) => w.length > 2 && !FILLER.has(w))
    for (const t of themes) (has(t.ctl, ctl) ? out.covered : out.uncovered).push(t.id)
    const anyStrong = THEMES.some((t) => has(t.ctl, ctl))
    out.awarenessOnly = AWARENESS.test(ctl) && !anyStrong
    out.generic = !anyStrong && restWords.length < 3
    out.hasGoodControls = anyStrong || restWords.length >= 6
    const strongN = THEMES.filter((t) => has(t.ctl, ctl)).length
    let c
    // Specific, job-written controls the word lists do not know still count:
    // the rule punishes empty/canned wording, not unusual good wording.
    const specificCtl = !anyStrong && restWords.length >= 6
    if (out.generic) c = 5
    else if (specificCtl) c = 22
    else if (!anyStrong) c = 15
    else c = 25 + Math.min(10, (strongN - 1) * 5)
    let cov = themes.length ? out.covered.length / themes.length : (anyStrong || specificCtl ? 1 : 0)
    if (specificCtl && themes.length) cov = Math.max(cov, 0.5)
    c += Math.round(15 * cov)
    if (out.awarenessOnly) c = Math.min(c, 10)
    out.score += Math.min(50, c)
    if (out.generic) out.tips.push('"PPE / communication / ergonomics / procedures / be aware" are not controls on their own. Name the thing that stops the hazard (which glove, bleed to zero, tag line, pump, spotter...).')
    else if (out.awarenessOnly) out.tips.push('Awareness is not a control. Add a physical one (barricade, lock out, spotter, tag line, verify).')
    if (out.uncovered.length) out.tips.push('No control for: ' + out.uncovered.map((id) => THEMES.find((t) => t.id === id).label).join(', ') + '.')
  }
  // Every box filled in honestly earns a little; it is no longer worth 75.
  if (task && hz && ctl) out.score += 5
  out.score = Math.max(0, Math.min(100, out.score))
  return out
}

/**
 * analyzeQuality(taskSteps, ctx)
 *   taskSteps: [{task, hazards, actions}] (blank rows already removed)
 *   ctx: { taskDescription, energyTypes: [], residualRisk: 'Low'|'Medium'|'High'|'' ,
 *          stopWorkTrigger: '', recentStepKeys: [normalised step strings from earlier THAs on this device] }
 * Returns the same shape the page has always stored, plus flags/coach.
 */
export function analyzeQuality(taskSteps, ctx = {}) {
  const results = { overallScore: 0, overallGrade: 'F', stepAnalyses: [], summary: { awarenessOnlyCount: 0, goodControlsCount: 0, stepsWithHazards: 0, stepsWithMitigations: 0, totalSteps: (taskSteps || []).length }, feedback: [], strengths: [], improvements: [], flags: [], coach: [], version: THA_SCORING_VERSION }
  if (!taskSteps || taskSteps.length === 0) { results.feedback.push('No task steps.'); return results }
  const flag = (id, pts, msg) => { results.flags.push({ id, pts }); results.coach.push(msg) }

  let total = 0
  taskSteps.forEach((st, i) => {
    const a = scoreStep(st)
    total += a.score
    if (T(st.hazards)) results.summary.stepsWithHazards++
    if (T(st.actions)) results.summary.stepsWithMitigations++
    if (a.hasGoodControls) results.summary.goodControlsCount++
    if (a.awarenessOnly) results.summary.awarenessOnlyCount++
    results.stepAnalyses.push({ stepNumber: i + 1, stepScore: a.score, feedback: a.tips, awarenessOnly: a.awarenessOnly, hasGoodControls: a.hasGoodControls, generic: a.generic, themes: a.themes, uncovered: a.uncovered })
    a.tips.forEach((tip) => results.improvements.push('Step ' + (i + 1) + ': ' + tip))
  })
  let score = total / taskSteps.length
  let deduction = 0

  const allText = T([ctx.taskDescription, ...taskSteps.map((s) => s.task)].join(' '))
  const body = T(taskSteps.map((s) => (s.hazards || '') + ' ' + (s.actions || '')).join(' '))
  const ctlText = T(taskSteps.map((s) => s.actions || '').join(' '))

  // Work-type must-haves (from the incidents).
  let workMiss = 0
  for (const r of WORK_RULES) {
    if (!r.work.test(allText)) continue
    const ok = r.need.every((re) => re.test(body))
    if (!ok) { workMiss++; flag('work_' + r.id, 5, r.coach) }
  }
  deduction += Math.min(20, workMiss * 5)

  // Energy wheel honesty.
  const energies = (ctx.energyTypes || []).filter(Boolean)
  if (energies.length === 0) { deduction += 8; flag('energy_none', 8, 'Tick the energy types present on the Energy Wheel. Every job has at least one.') }
  else {
    const seen = new Set(results.stepAnalyses.flatMap((a) => a.themes))
    const missing = energies.filter((e) => ENERGY_THEMES[e] && !ENERGY_THEMES[e].some((th) => seen.has(th)))
    if (missing.length) { const p = Math.min(6, missing.length * 2); deduction += p; flag('energy_unaddressed', p, 'You ticked ' + missing.join(', ') + ' energy but no step says how it could hurt you. Add it to a step, or untick it.') }
  }

  // Copy-paste: same hazards+controls as a THA already submitted from this phone.
  const recent = new Set(ctx.recentStepKeys || [])
  const keys = taskSteps.map(normaliseStep)
  const copied = recent.size ? keys.filter((k) => recent.has(k)).length : 0
  const copiedAll = copied > 0 && copied >= Math.ceil(keys.length * 0.8)
  if (copiedAll) flag('copied', 0, 'Same hazards and controls as a THA already sent from this phone. What is different today (weather, ground, crew, equipment, location)? Change at least one step to reach an A.')
  // Same control pasted onto every step.
  const ctlKeys = taskSteps.map((s) => T(s.actions)).filter(Boolean)
  if (ctlKeys.length >= 2 && new Set(ctlKeys).size === 1) { deduction += 5; flag('same_controls', 5, 'Every step has the same controls. Each step has its own hazards - give it its own controls.') }

  if (taskSteps.length === 1) { deduction += 4; flag('one_step', 4, 'Break the job into at least 2 steps (set up, do the work, rig down / drive).') }

  // Residual risk and stop-work.
  const rr = ctx.residualRisk || ''
  if (!rr) { deduction += 5; flag('residual_missing', 5, 'Pick the risk LEFT after your controls: Low, Medium or High.') }
  else if (rr === 'Low' && workMiss > 0) { deduction += 3; flag('residual_optimistic', 3, 'You picked Low risk, but the must-haves above are not covered yet. Fix them or be honest about the risk.') }
  if (rr === 'High') results.coach.push('High risk left after controls: stop and get your supervisor before starting. That is the right call, not a bad score.')
  const sw = T(ctx.stopWorkTrigger)
  const swWords = words(sw)
  const swGeneric = /(unsafe|anything|if needed|if necessary|n\/?a|none|any hazard|something wrong|not safe)/.test(sw) && swWords.length < 6
  if (swWords.length === 0) { deduction += 5; flag('stopwork_missing', 5, 'Write the real trigger that stops this job (e.g. "gauge not at zero", "spotter loses sight", "wind over 30 mph"). Anyone on the crew can call it.') }
  else if (swGeneric) { deduction += 4; flag('stopwork_generic', 4, '"Anything unsafe" is not a trigger. Name the specific condition for THIS job (e.g. "gauge not at zero", "wire rope has broken strands").') }
  else if (swWords.length < 3) { deduction += 3; flag('stopwork_short', 3, 'Say a bit more about what stops the job (e.g. "spotter loses sight of the box").') }
  score = score - deduction
  if (copiedAll) score = Math.min(score, 85)
  score = Math.round(Math.max(0, Math.min(100, score)))
  // 100 means nothing left to coach.
  if (score === 100 && (results.flags.length || results.improvements.length)) score = 99
  results.overallScore = score
  results.overallGrade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F'
  if (score >= 90) { results.feedback.push('EXCELLENT THA'); results.strengths.push('Hazards say how people get hurt', 'Controls match the hazards') }
  else if (score >= 80) results.feedback.push('GOOD THA - fix the items below to reach an A')
  else if (score >= 70) results.feedback.push('DECENT THA - the items below are what got people hurt on similar jobs')
  else if (score >= 60) results.feedback.push('WEAK THA - passes, but fix the items below before you start')
  else results.feedback.push('NOT READY - fix the items below to unlock crew sign-off')
  void ctlText
  return results
}

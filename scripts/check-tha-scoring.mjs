// Checks THA scoring v2 (app/lib/thaScoring.js, the shipped file) against
// cases taken from real 2026 THAs and the incidents that happened the same day.
// Usage: npm run check:tha-scoring
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { analyzeQuality, normaliseStep, PASS_SCORE, THA_SCORING_VERSION } from '../app/lib/thaScoring.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
let fails = 0
const ok = (cond, msg) => { if (!cond) { fails++; console.log('FAIL', msg) } }
const ids = (r) => r.flags.map((f) => f.id)
const honest = { residualRisk: 'Medium', stopWorkTrigger: 'stop if the gauge is not at zero or the spotter loses sight' }

// 1. Canned THA submitted word-for-word 100+ times; scored 95 on the day a worker rolled an ankle carrying a ~200 lb tote down truck stairs.
const canned = [
  { task: 'Load cuttings', hazards: 'Slips trips falls, pinch points, lifting.', actions: 'PPE, good body placement, team lift' },
  { task: "Load ACB's", hazards: 'Hydraulic failure, equipment failure, people walking behind boxes', actions: 'do a good 360 walk around, exclusion zone, guarding' },
  { task: 'Driving', hazards: 'Fog,animals,other drivers, backing, weather.', actions: "Drive slow take time, stay in your lane don't follow closely, use spotter, or cones, follow trip plan" },
]
const all8 = ['Gravity', 'Motion', 'Mechanical', 'Electrical', 'Pressure', 'Chemical', 'Temperature', 'Stored']
const r1 = analyzeQuality(canned, { taskDescription: "Load cuttings into ACB's and haul to offload", energyTypes: all8 })
ok(r1.overallScore < 70, `canned THA should be below C, got ${r1.overallScore}`)
ok(ids(r1).includes('energy_unaddressed'), 'all 8 energies ticked but not in steps should be flagged')
ok(ids(r1).includes('residual_missing') && ids(r1).includes('stopwork_missing'), 'residual risk and stop-work trigger required')
ok(r1.version === THA_SCORING_VERSION, 'version stamped')

// 2. Shop day with a finger cut: the only control was "appropriate PPE". Old score 90.
const r2 = analyzeQuality([
  { task: 'Repair ev as needed', hazards: 'Cuts and flying debris from using power tools', actions: 'Using the appropriate p p e for the job' },
  { task: 'Repair four hundred barrel tanks as needed', hazards: 'Slip trips and falls from inclement weather, flying debris from using power tools, cuts', actions: 'Use ppe as needed check weather' },
], { taskDescription: 'Repair tanks as needed', energyTypes: ['Motion', 'Temperature'], ...honest })
ok(ids(r2).includes('work_shop'), 'shop work without a named glove should be flagged')
ok(r2.stepAnalyses[0].generic, '"appropriate PPE" alone is a generic control')
ok(r2.overallScore < 70, `shop THA with PPE-only controls should be below C, got ${r2.overallScore}`)

// 3. Glycol top-off with a mouth-started siphon (no pump named).
const r3 = analyzeQuality([
  { task: 'Top off glycol reservoir on pickup', hazards: 'Spills, slips', actions: 'PPE, drip pan under the reservoir' },
  { task: 'Clean up', hazards: 'slips trips falls', actions: 'housekeeping' },
], { taskDescription: 'Add glycol to truck reservoir', energyTypes: ['Chemical'], ...honest })
ok(ids(r3).includes('work_fluid'), 'fluid transfer without pump / exposure should be flagged')
const r3b = analyzeQuality([
  { task: 'Top off glycol reservoir on pickup', hazards: 'Glycol splash to eyes or mouth when removing overfill', actions: 'Hand transfer pump to remove overfill, never mouth-start a siphon, goggles and nitrile gloves, drip pan' },
  { task: 'Clean up spilled glycol', hazards: 'Slipping on glycol on the shop floor', actions: 'Absorbent pads on the spill right away, spill kit at the bay door' },
], { taskDescription: 'Add glycol to truck reservoir', energyTypes: ['Chemical'], ...honest })
ok(!ids(r3b).includes('work_fluid'), 'pump + exposure named should clear the fluid rule')
ok(r3b.overallScore >= 90, `well-written glycol THA should be an A, got ${r3b.overallScore}`)

// 4. Pressure test with no way to prove zero.
const r4 = analyzeQuality([
  { task: 'Pressure test BOP with triplex', hazards: 'High pressure, noise', actions: 'Hearing protection, communication with coil crew' },
  { task: 'Rig down hoses', hazards: 'Spills', actions: 'Containment' },
], { taskDescription: 'Triplex pump supporting BOP pressure test', energyTypes: ['Pressure', 'Stored'], ...honest })
ok(ids(r4).includes('work_pressure'), 'pressure work without bleed/zero/whip check should be flagged')

// 5. Heavy carry: no weight, no aid; stepping off the truck with no 3 points.
const r5 = analyzeQuality([
  { task: 'Carry tote out of service truck box', hazards: 'Heavy, back strain', actions: 'Lift with legs' },
  { task: 'Walk down truck stairs', hazards: 'Slips', actions: 'Be careful' },
], { taskDescription: 'Move totes from service truck', energyTypes: ['Gravity'], ...honest })
ok(ids(r5).includes('work_lifting'), 'heavy carry without weight or aid should be flagged')
ok(ids(r5).includes('work_egress'), 'getting off a truck without 3 points / landing check should be flagged')
ok(r5.stepAnalyses[1].awarenessOnly, '"Be careful" is awareness-only')

// 6. A real, detailed THA should still reach an A.
const good = [
  { task: 'Load cuttings into ACB with the vac stinger', hazards: 'Slip on wet cuttings around the box, hand caught between stinger and box lip, back strain pulling the hose', actions: 'Clear and sand the walkway, keep hands on the handle not the lip, two-person hose move, hearing protection' },
  { task: 'Winch ACB onto chassis', hazards: 'Wire rope parting or box rolling off, people walking behind the box, foot rolling when stepping down from the cab', actions: 'Inspect the wire rope before the pull, exclusion zone behind the box, 3 points of contact and look at the landing before stepping down' },
  { task: 'Drive to the disposal site and back into the offload bay', hazards: 'Fog and caribou on the road, backing into the bay with a blind spot', actions: 'Headlights on, 35 mph max in fog, stop for caribou, spotter or get out and look before backing, confirm the overhead door is fully up' },
]
const r6 = analyzeQuality(good, { taskDescription: 'Load cuttings into ACBs and haul to disposal', energyTypes: ['Gravity', 'Motion', 'Mechanical'], residualRisk: 'Low', stopWorkTrigger: 'Stop if the wire rope has broken strands or the spotter loses sight' })
ok(r6.overallGrade === 'A', `detailed THA should be an A, got ${r6.overallScore} (${r6.coach.join(' / ')} ${r6.improvements.join(' / ')})`)

// 7. Copy check: the same steps as a THA already sent from this phone cap at 85.
const r7 = analyzeQuality(good, { taskDescription: 'Load cuttings into ACBs and haul to disposal', energyTypes: ['Gravity', 'Motion', 'Mechanical'], residualRisk: 'Low', stopWorkTrigger: 'Stop if the wire rope has broken strands or the spotter loses sight', recentStepKeys: good.map(normaliseStep) })
ok(r7.overallScore <= 85 && ids(r7).includes('copied'), `copied THA should cap at 85, got ${r7.overallScore}`)
ok(r7.overallScore >= PASS_SCORE, 'a copied but otherwise good THA still passes (no work stoppage for repeat jobs)')

// 8. 100 means nothing left to coach.
for (const r of [r1, r2, r3, r3b, r4, r5, r6, r7]) ok(r.overallScore < 100 || (r.flags.length === 0 && r.improvements.length === 0), '100 only with nothing left to coach')

// 9. Unusual but specific wording is not punished as generic.
const r9 = analyzeQuality([{ task: 'Support coil tubing, manage the fluid tanks', hazards: 'Incorrect valve alignment, overflowing a tank', actions: 'Check tank volumes every 10 minutes, open a valve before you close one, call out tank volume to the operator' }, { task: 'Rig down', hazards: 'Hand caught between hose and fitting', actions: 'Bleed the line to zero and keep hands clear of the fitting' }], { taskDescription: 'Coil tubing fluid support', energyTypes: ['Pressure'], ...honest })
ok(!r9.stepAnalyses[0].generic, 'specific job-written controls are not generic')

// 10. Stop-work and residual risk honesty.
const r10 = analyzeQuality(good, { taskDescription: 'Load cuttings into ACBs and haul to disposal', energyTypes: ['Gravity', 'Motion', 'Mechanical'], residualRisk: 'High', stopWorkTrigger: 'anything unsafe' })
ok(ids(r10).includes('stopwork_generic'), '"anything unsafe" is flagged as a generic trigger')
ok(!ids(r10).some((f) => f.startsWith('residual')), 'picking High is honesty, not a penalty')
const r10b = analyzeQuality(canned, { taskDescription: 'Move totes and service truck stairs', energyTypes: ['Gravity'], residualRisk: 'Low', stopWorkTrigger: 'spotter loses sight of the box' })
ok(ids(r10b).includes('residual_optimistic'), 'Low risk with uncovered must-haves is flagged')

// 11. Empty input.
ok(analyzeQuality([], {}).overallScore === 0, 'no steps scores 0')

// 12. The page uses the shared scorer, re-scores on submit, and stores the new fields.
const page = readFileSync(join(root, 'app/tha-jsa/page.js'), 'utf8')
ok(!/function analyzeQuality/.test(page), 'page must not carry its own copy of the scorer')
ok(/from '@\/lib\/thaScoring'/.test(page), 'page imports app/lib/thaScoring.js')
ok(/q\.overallScore<PASS_SCORE/.test(page), 'submit re-scores and blocks below the pass mark')
for (const col of ['residual_risk:', 'stop_work_trigger:', 'scoring_version:']) ok(page.includes(col), `page stores ${col}`)

if (fails) { console.log(`tha scoring: ${fails} check(s) failed`); process.exit(1) }
console.log(`tha scoring: all checks passed (pass mark ${PASS_SCORE}%, version ${THA_SCORING_VERSION})`)

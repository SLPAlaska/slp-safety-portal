// node scripts/check-investigation-nav.mjs
// Stage navigation is always allowed. Gates may refuse complete/approve/export.
// They must not choose the stage on screen or disable Back / step tabs.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { navigationAllowed, resumeStage } from '../app/lib/investigationNav.js';

const done = { stage_1_complete: true, stage_2_complete: true, stage_3_complete: true, status: 'Submitted' };
assert.equal(resumeStage(done), 4);
assert.equal(resumeStage({ ...done, stage_1_complete: false, status: 'Submitted' }), 1);
assert.equal(resumeStage({ stage_1_complete: true, stage_2_complete: false, stage_3_complete: true }), 2);
assert.equal(resumeStage(null), 1);

for (const to of [1, 2, 3, 4]) {
  assert.equal(navigationAllowed(done, 4, to), true);
  assert.equal(navigationAllowed({ status: 'Approved' }, 1, to), true);
}
assert.equal(navigationAllowed(done, 4, 0), false);
assert.equal(navigationAllowed(done, 4, 5), false);

const page = readFileSync(new URL('../app/investigation-workbench/[id]/page.js', import.meta.url), 'utf8');
const steps = readFileSync(new URL('../app/components/InvestigationSteps.js', import.meta.url), 'utf8');
assert.match(page, /function goToStage\(stage\)/);
assert.match(page, /stagePinned/);
assert.match(page, /onBack=\{goToStage\}/);
assert.match(page, /onJump=\{goToStage\}/);
assert.match(page, /resumeStage/);
assert.match(steps, /← Back/);
assert.match(steps, /type="button"/);
assert.match(steps, /data-testid="inv-back"/);
assert.match(steps, /data-testid="inv-step"/);
assert.doesNotMatch(steps, /disabled=/);

const go = page.slice(page.indexOf('function goToStage'), page.indexOf('function jumpTo'));
assert.doesNotMatch(go, /requireTextGate|requireQualityGate|requireThaGate|require1904/);
const tha = page.slice(page.indexOf('async function requireThaGate'), page.indexOf('function goToStage'));
assert.doesNotMatch(tha, /setCurrentStage/);

console.log('check:investigation-nav: all checks passed');

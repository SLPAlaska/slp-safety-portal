// node scripts/check-inv-guide.mjs — checks the Interview Guide rules in the
// SHIPPED source (app/lib/investigationGuide.js) and that the client-side
// weak-CA pattern still matches the database trigger in the migration.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as g from '../app/lib/investigationGuide.js';

const sql = fs.readFileSync(new URL('../supabase/migrations/20261010212422_sql_2026_10_10_28_inv_interview_guide_schema.sql', import.meta.url), 'utf8');
const dbPattern = sql.match(/t ~ '([^']+)'/)[1];
assert.equal(dbPattern, g.WEAK_CA_PATTERN.source, 'WEAK_CA_PATTERN drifted from inv_set_weak_control_flag()');

const seed = fs.readFileSync(new URL('../supabase/migrations/20261010212427_sql_2026_10_10_29_inv_question_bank_seed.sql', import.meta.url), 'utf8');
for (const h of g.HAZARD_CODES) assert.ok(seed.includes(`'${h}', `), `no seeded bank for hazard ${h}`);

assert.deepEqual(g.banksFor({ hazard_types: ['chemical', 'hand_ppe'], work_setting: 'Shop' }), ['core', 'hand_ppe', 'chemical', 'culture', 'rootcause']);
assert.deepEqual(g.banksFor({ hazard_types: [], work_setting: 'Road', safety_severity: 'F' }), ['core', 'rootcause']);
assert.ok(g.banksFor({ safety_severity: 'E' }).includes('culture'));
assert.ok(g.banksFor({ psif_classification: 'PSIF-High' }).includes('culture'));
assert.ok(g.banksFor({}, { cultureForced: true }).includes('culture'));

const q = { answer_type: 'chips', options: [{ value: 'Forgot', probe: 'why?' }, { value: 'Yes' }] };
assert.equal(g.isAnswered(q, { answer_choice: ['Forgot'] }), false, 'probe must be answered');
assert.equal(g.isAnswered(q, { answer_choice: ['Forgot'], probe_answer: 'x' }), true);
assert.equal(g.isAnswered(q, { answer_choice: ['Yes'] }), true);
assert.equal(g.isAnswered(q, { not_applicable: true }), false, 'N/A needs a reason');
assert.equal(g.isAnswered(q, { not_applicable: true, na_reason: 'no exposure' }), true);
assert.equal(g.isAnswered({ answer_type: 'text' }, { answer_text: '  ' }), false);

assert.equal(g.isWeakCA({ description: 'Employee counseled', hierarchy_level: 3 }), true);
assert.equal(g.isWeakCA({ description: 'Install vise fixture', hierarchy_level: 3 }), false);
assert.equal(g.isWeakCA({ description: 'Install vise fixture', hierarchy_level: 5 }), true);

const r = g.closeoutReview({ guide: { criticalTotal: 3, criticalDone: 3 }, correctiveActions: [{ description: 'Install guard', hierarchy_level: 3, root_cause_link: 'Equipment / tool design', verification_method: 'audit', verify_by: '2026-12-01', status: 'Open' }], targetStatus: 'Approved' });
assert.deepEqual(r.issues, [], 'a clean investigation raises no warnings');
const r2 = g.closeoutReview({ guide: null, correctiveActions: [], targetStatus: 'Closed' });
assert.deepEqual(r2.issues.map(i => i.key), ['no_ca']);
const r3 = g.closeoutReview({ guide: null, correctiveActions: [{ description: 'Retrain crew', status: 'Open' }], targetStatus: 'Closed' });
assert.ok(r3.weakOnly && r3.issues.some(i => i.key === 'open_ca'));

console.log('check-inv-guide: all checks passed');

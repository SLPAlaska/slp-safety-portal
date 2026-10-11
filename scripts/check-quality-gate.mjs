// node scripts/check-quality-gate.mjs — static checks for the investigation
// quality gates (SQL 53-55). The rules themselves are tested against the live
// database read-only (see docs/investigation-quality-gates-SPEC.md, dry run).
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { withSystemBank, SYSTEM_CAUSE_BANK } from '../app/lib/investigationGuide.js';

assert.deepEqual(withSystemBank(['core', 'chemical', 'culture', 'rootcause'], true), ['core', 'chemical', SYSTEM_CAUSE_BANK, 'culture', 'rootcause']);
assert.deepEqual(withSystemBank(['core', 'hand_ppe', 'rootcause'], true), ['core', 'hand_ppe', SYSTEM_CAUSE_BANK, 'rootcause']);
assert.deepEqual(withSystemBank(['core', 'rootcause'], false), ['core', 'rootcause']);

const dir = new URL('../supabase/migrations/', import.meta.url);
const files = readdirSync(dir);
const read = re => readFileSync(new URL(files.find(f => re.test(f)), dir), 'utf8');
const s53 = read(/_53_inv_quality_gate_schema\.sql$/);
const s54 = read(/_54_inv_quality_gate_function\.sql$/);
const s55 = read(/_55_inv_quality_gate_enforce\.sql$/);
for (const code of ['SC-OVR1', 'SC-OVR2', 'SC-TOOL1', 'SC-TOOL2', 'SC-STORE1', 'SC-RPT1', 'SC-MED1']) assert.ok(s53.includes(`'${code}'`), code);
assert.match(s53, /enable row level security/);
for (const g of ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'G10', 'G11', 'G12', 'G14', 'G16', 'G17', 'C1', 'C5']) {
  assert.ok(s54.includes(`'${g}'`), `gate ${g} missing from inv_quality_gate_eval`);
}
// Brian-only override, by exact email, in two places.
assert.equal((s54.match(/me <> 'brian@slpalaska\.com'/g) || []).length, 2);
assert.match(s53, /<> 'brian@slpalaska\.com'/);
// Keywords never close anything: no CA status writes in the gate SQL.
assert.doesNotMatch(s54 + s55, /update\s+public\.investigation_corrective_actions/i);
assert.match(s55, /'Pending Approval', 'Approved', 'Closed'/);
console.log('check:quality-gate: all checks passed');

// node scripts/check-investigation-text-gate.mjs
// Checks the spelling & grammar HARD GATE logic in the SHIPPED source
// (app/lib/investigationTextGate.js) with a stubbed checker, plus the database
// trigger contract in the migration. Set LT_LIVE=1 to also hit LanguageTool.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as g from '../app/lib/investigationTextGate.js';

const json = (status, body) => async () => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const spell = (offset, length, reps = []) => ({ offset, length, message: 'Spelling mistake', shortMessage: 'Spelling mistake', replacements: reps.map(value => ({ value })), rule: { id: 'MORFOLOGIK_RULE_EN_US', issueType: 'misspelling', category: { id: 'TYPOS' } } });
const style = (offset, length) => ({ offset, length, message: 'Style', replacements: [], rule: { id: 'X', issueType: 'style', category: { id: 'STYLE' } } });

const items = [{ key: 'a', label: 'A', text: 'The pump was not at teh bay.' }, { key: 'b', label: 'B', text: 'Clean text here.' }];

// FAIL CLOSED: every way the checker can let us down is 'unavailable', never 'pass'.
for (const [name, fetchImpl] of [
  ['network error', async () => { throw new TypeError('fetch failed'); }],
  ['timeout', async () => { const e = new Error('aborted'); e.name = 'AbortError'; throw e; }],
  ['500', json(500, {})],
  ['429', json(429, {})],
  ['400', json(400, {})],
  ['unreadable', json(200, { nope: true })],
  ['partial', json(200, { matches: [], warnings: { incompleteResults: true } })],
]) {
  const r = await g.runTextGate(items, { fetchImpl, timeoutMs: 50 });
  assert.equal(r.status, 'unavailable', `${name} must fail closed`);
  assert.ok(r.reason, `${name} must explain`);
}

// Clean text passes; empty report passes without calling the checker.
assert.equal((await g.runTextGate(items, { fetchImpl: json(200, { matches: [] }) })).status, 'pass');
assert.equal((await g.runTextGate([], { fetchImpl: async () => { throw new Error('should not be called'); } })).status, 'pass');

// A misspelling blocks and maps back to its field and offset.
{
  const chunk = g.buildChunks(items)[0];
  const at = chunk.text.indexOf('teh');
  const r = await g.runTextGate(items, { fetchImpl: json(200, { matches: [spell(at, 3, ['the']), style(0, 3)] }) });
  assert.equal(r.status, 'fail');
  assert.equal(r.issues.length, 1, 'style advice does not block');
  assert.equal(r.issues[0].key, 'a');
  assert.equal(items[0].text.slice(r.issues[0].offset, r.issues[0].offset + 3), 'teh');
  assert.equal(r.issues[0].canKeep, false, 'a lowercase misspelling cannot be kept');
  assert.equal(g.applyReplacement(items[0].text, r.issues[0].offset, 3, 'the'), 'The pump was not at the bay.');
}

// Second field offsets map correctly across the separator.
{
  const its = [{ key: 'a', text: 'First.' }, { key: 'b', text: 'Second has a wrd.' }];
  const chunk = g.buildChunks(its)[0];
  const at = chunk.text.indexOf('wrd');
  const r = g.issuesFromMatches(chunk, [spell(at, 3)]);
  assert.equal(r[0].key, 'b');
  assert.equal(its[1].text.slice(r[0].offset, r[0].offset + 3), 'wrd');
}

// Keep rules: mid-sentence Capitalized or ALL CAPS / digits only.
assert.equal(g.keepable('Tukle', 'Spoke with Tukle today.', 11), true);
assert.equal(g.keepable('Dangerus', 'Dangerus work.', 0), false, 'sentence-start capital is not a name signal');
assert.equal(g.keepable('Dangerus', 'It was hot. Dangerus work.', 12), false);
assert.equal(g.keepable('XJ9', 'XJ9 failed.', 0), true);
assert.equal(g.keepable('teh', 'at teh bay', 3), false);
assert.deepEqual(g.sanitizeAcceptedTerms(['Tukle', 'teh', 'DROP TABLE', 'XJ9', '']), ['tukle', 'xj9']);

// Kept terms and report names excuse dictionary misses only.
{
  const its = [{ key: 'a', text: 'Spoke with Tukle and Qorvak.' }];
  const chunk = g.buildChunks(its)[0];
  const m = [spell(chunk.text.indexOf('Tukle'), 5), spell(chunk.text.indexOf('Qorvak'), 6)];
  assert.equal(g.issuesFromMatches(chunk, m).length, 2);
  assert.equal(g.issuesFromMatches(chunk, m, g.wordsFromNames(['Jim Qorvak']), new Set(['tukle'])).length, 0);
  const grammar = { offset: 0, length: 5, message: 'Grammar', replacements: [], rule: { id: 'THEIR_IS', issueType: 'misspelling', category: { id: 'TYPOS' } } };
  assert.equal(g.issuesFromMatches(chunk, [grammar], new Set(['spoke']), new Set(['spoke'])).length, 1, 'non-dictionary rules cannot be kept away');
}

// Domain vocabulary is not flagged.
{
  const its = [{ key: 'a', text: 'Updated the JSA for wireline.' }];
  const chunk = g.buildChunks(its)[0];
  assert.equal(g.issuesFromMatches(chunk, [spell(chunk.text.indexOf('wireline'), 8)]).length, 0);
}

// Long text is chunked under the request cap and nothing is lost.
{
  const long = Array.from({ length: 2000 }, (_, i) => `Sentence ${i} is fine.`).join(' ');
  const chunks = g.buildChunks([{ key: 'x', text: long }, { key: 'y', text: 'Short.' }]);
  assert.ok(chunks.length > 1 && chunks.every(c => c.text.length <= g.LT_MAX_CHARS));
}

// Database contract: the trigger gates Approved, Closed and stage_4_complete,
// compares against the stored pass hash, and the pass table is service-role only.
const dir = new URL('../supabase/migrations/', import.meta.url);
const file = fs.readdirSync(dir).find(f => f.endsWith('_inv_report_text_gate.sql'));
assert.ok(file, 'gate migration present');
const sql = fs.readFileSync(new URL(file, dir), 'utf8');
assert.match(sql, /new\.status in \('Approved', 'Closed'\)/);
assert.match(sql, /stage_4_complete/);
assert.match(sql, /v_pass is null or v_pass <> v_hash/);
assert.match(sql, /before update on public\.incidents/);
assert.doesNotMatch(sql, /before insert|after insert/i, 'field Incident Report submit (INSERT) must not be gated');
assert.match(sql, /revoke all on public\.inv_text_gate from anon, authenticated/);
assert.match(sql, /enable row level security/);
assert.doesNotMatch(sql, /\bdrop\s+(table|trigger|function)|\bdelete\s+from/i, 'additive only');

// Route: only a pass writes passed_hash, and non-pass is never reported as pass.
const route = fs.readFileSync(new URL('../app/api/investigation-text-gate/route.js', import.meta.url), 'utf8');
assert.match(route, /if \(result\.status === 'pass'\) \{\s*Object\.assign\(row, \{\s*passed_hash/);
assert.match(route, /isInvestigator\(authData\.user\)/);

if (process.env.LT_LIVE) {
  const live = await g.runTextGate([{ key: 'bad', text: 'Their was no pump at teh bay.' }, { key: 'ok', text: 'The pump was not at the bay.' }]);
  assert.equal(live.status, 'fail', 'live: bad text fails');
  assert.ok(live.issues.every(i => i.key === 'bad'));
  const ok = await g.runTextGate([{ key: 'ok', text: 'The helper stopped the job and reported it to the supervisor.' }]);
  assert.equal(ok.status, 'pass', 'live: clean text passes');
  console.log('live LanguageTool checks passed');
}

console.log('check-investigation-text-gate: all checks passed');

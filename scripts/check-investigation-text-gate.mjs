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
  assert.equal(r.issues[0].kind, 'spelling');
  assert.equal(r.issues[0].canKeep, true, 'a spelling miss can be ignored for this incident');
  assert.equal(g.issuesFromMatches(chunk, [spell(at, 3)], new Set(), new Set(['teh'])).length, 0, 'ignored teh does not block');
  assert.equal(g.issuesFromMatches(chunk, [spell(at, 3)], new Set(), new Set(), new Set(['teh'])).length, 0, 'dictionary teh does not block');
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
assert.deepEqual(g.sanitizeAcceptedTerms(['Tukle', 'teh', 'DROP TABLE', 'XJ9', '']), ['tukle', 'teh', 'xj9']);

// Kept terms and report names excuse dictionary misses only.
{
  const its = [{ key: 'a', text: 'Spoke with tukle and qorvak.' }];
  const chunk = g.buildChunks(its)[0];
  const m = [spell(chunk.text.indexOf('tukle'), 5), spell(chunk.text.indexOf('qorvak'), 6)];
  assert.equal(g.issuesFromMatches(chunk, m).length, 2);
  assert.equal(g.issuesFromMatches(chunk, m, g.wordsFromNames(['Jim Qorvak']), new Set(['tukle'])).length, 0);
  const named = [{ key: 'a', text: 'Spoke with Tukle and Qorvak.' }];
  const namedChunk = g.buildChunks(named)[0];
  const namedMatches = [spell(namedChunk.text.indexOf('Tukle'), 5), spell(namedChunk.text.indexOf('Qorvak'), 6)];
  assert.equal(g.issuesFromMatches(namedChunk, namedMatches).length, 0, 'capitalized names are not a hard block');
  const grammar = { offset: 0, length: 5, message: 'Grammar', replacements: [], rule: { id: 'THEIR_IS', issueType: 'grammar', category: { id: 'GRAMMAR' } } };
  const grammarIssues = g.issuesFromMatches(chunk, [grammar], new Set(['spoke']), new Set(['spoke']));
  assert.equal(grammarIssues.length, 1, 'grammar still blocks');
  assert.equal(grammarIssues[0].kind, 'grammar');
}

// Sentence-start proper nouns are not a hard block. Real grammar still is.
{
  const its = [{ key: 'a', text: 'Ched Isaac saw the spill.' }];
  const chunk = g.buildChunks(its)[0];
  const m = [spell(chunk.text.indexOf('Ched'), 4), spell(chunk.text.indexOf('Isaac'), 5)];
  assert.equal(g.issuesFromMatches(chunk, m).length, 0, 'Ched Isaac is not a hard block');
  const their = { offset: 0, length: 5, message: 'Did you mean there', replacements: [], rule: { id: 'THEIR_IS', issueType: 'grammar', category: { id: 'GRAMMAR' } } };
  const bad = [{ key: 'a', text: 'Their was a spill.' }];
  const badChunk = g.buildChunks(bad)[0];
  const badIssues = g.issuesFromMatches(badChunk, [their]);
  assert.equal(badIssues.length, 1);
  assert.equal(badIssues[0].kind, 'grammar');
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
assert.match(route, /requireAdmin\(request, supabase, \{ allowCompanyAdmin: true \}\)/);
assert.match(route, /dictionary migration not applied/);
assert.match(route, /inv_custom_dictionary/);

const dictFile = fs.readdirSync(dir).find(f => /_59_inv_custom_dictionary\.sql$/.test(f));
assert.equal(dictFile, '20261013124236_sql_2026_10_13_59_inv_custom_dictionary.sql');
const dictSql = fs.readFileSync(new URL(dictFile, dir), 'utf8');
assert.match(dictSql, /enable row level security/);
assert.match(dictSql, /revoke all on table public\.inv_custom_dictionary from public, anon, authenticated/);
assert.match(dictSql, /grant select, insert on table public\.inv_custom_dictionary to service_role/);
assert.match(dictSql, /'Ched'/);
assert.match(dictSql, /'Isaac'/);
assert.match(dictSql, /brian@slpalaska\.com/);
assert.doesNotMatch(dictSql, /\bdrop\s+(table|trigger|function)|\bdelete\s+from/i);
assert.doesNotMatch(dictSql, /on delete cascade/i);
assert.match(dictSql, /create or replace function public\.inv_report_text_gate/);

const ui = fs.readFileSync(new URL('../app/components/ReportTextGate.js', import.meta.url), 'utf8');
assert.match(ui, /data-testid="spell-add"/);
assert.match(ui, /Add to dictionary/);
assert.match(ui, /data-testid="spell-ignore"/);
assert.match(ui, /'Ignore'/);
assert.doesNotMatch(ui, /Keep — it/);

if (process.env.LT_LIVE) {
  const live = await g.runTextGate([{ key: 'bad', text: 'Their was no pump at teh bay.' }, { key: 'ok', text: 'The pump was not at the bay.' }]);
  assert.equal(live.status, 'fail', 'live: bad text fails');
  assert.ok(live.issues.every(i => i.key === 'bad'));
  const ok = await g.runTextGate([{ key: 'ok', text: 'The helper stopped the job and reported it to the supervisor.' }]);
  assert.equal(ok.status, 'pass', 'live: clean text passes');
  console.log('live LanguageTool checks passed');
}

console.log('check-investigation-text-gate: all checks passed');

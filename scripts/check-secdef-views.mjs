// npm run check:secdef-views - views must run with the caller's rights and never grant anon (SEC-A01, SQL 2026-10-17-60).
//
// Static check over supabase/migrations, in filename order:
//   1. The 60 lockdown migration sets security_invoker = true and revokes anon on the four views it governs.
//   2. No later migration re-creates one of those views without WITH (security_invoker = true) and REVOKE ALL ... FROM anon.
//   3. Every view created in any migration after the lockdown carries both, in the same file.
// Earlier migrations (for example 20260919170000_da_annual_due_pending.sql) are already applied and are not edited;
// the lockdown file is what governs them.
import fs from 'node:fs'

let fail = 0
const ok = (c, m) => { if (!c) { fail++; console.error('FAIL:', m) } }

const DIR = 'supabase/migrations'
const LOCKDOWN = '20261017160000_sql_2026_10_17_60_slp_secdef_views_lockdown.sql'
const VIEWS = ['da_clearinghouse_annual_due', 'lms_learner_course_summary', 'investigation_dashboard_view', 'sail_dashboard_stats']

const strip = (sql) => sql.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').toLowerCase()
const files = fs.readdirSync(DIR).filter(f => f.endsWith('.sql')).sort()
ok(files.includes(LOCKDOWN), 'lockdown migration present: ' + LOCKDOWN)

const sqlOf = (f) => strip(fs.readFileSync(`${DIR}/${f}`, 'utf8'))
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const setsInvoker = (sql, v) =>
  new RegExp(`alter\\s+view\\s+(public\\.)?${esc(v)}\\s+set\\s*\\(\\s*security_invoker\\s*=\\s*(true|on)\\s*\\)`).test(sql) ||
  new RegExp(`create\\s+(or\\s+replace\\s+)?view\\s+(public\\.)?${esc(v)}\\s+with\\s*\\([^)]*security_invoker\\s*=\\s*(true|on)`).test(sql)
const revokesAnon = (sql, v) =>
  new RegExp(`revoke\\s+all(\\s+privileges)?\\s+on\\s+(table\\s+)?(public\\.)?${esc(v)}\\s+from\\s+([a-z_,\\s]*\\b)?anon\\b`).test(sql)
const grantsAnon = (sql, v) =>
  new RegExp(`grant\\s+[a-z_,\\s]+\\s+on\\s+(table\\s+)?(public\\.)?${esc(v)}\\s+to\\s+([a-z_,\\s]*\\b)?(anon|public)\\b`).test(sql)

if (files.includes(LOCKDOWN)) {
  const sql = sqlOf(LOCKDOWN)
  for (const v of VIEWS) {
    ok(setsInvoker(sql, v), `lockdown sets security_invoker on ${v}`)
    ok(revokesAnon(sql, v), `lockdown revokes anon on ${v}`)
  }
  ok(/raise\s+exception\s+'sec-a01 self-check failed/.test(sql), 'lockdown keeps its self-check')
}

const later = files.filter(f => f > LOCKDOWN)
for (const f of later) {
  const sql = sqlOf(f)
  const created = [...sql.matchAll(/create\s+(?:or\s+replace\s+)?view\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-z0-9_]+)/g)].map(m => m[1])
  for (const v of created) {
    ok(setsInvoker(sql, v), `${f}: view ${v} must be created WITH (security_invoker = true)`)
    ok(revokesAnon(sql, v), `${f}: view ${v} must REVOKE ALL ... FROM anon in the same file`)
  }
  for (const v of VIEWS) ok(!grantsAnon(sql, v), `${f}: must not grant ${v} to anon or public`)
}

// Self-test of the matchers, so a regex slip cannot make the check pass vacuously.
ok(setsInvoker('alter view public.x set (security_invoker = true);', 'x'), 'matcher: alter view set')
ok(setsInvoker('create or replace view public.x with (security_invoker = true) as select 1;', 'x'), 'matcher: create with')
ok(!setsInvoker('create or replace view public.x as select 1;', 'x'), 'matcher: plain create is not invoker')
ok(revokesAnon('revoke all on public.x from anon;', 'x'), 'matcher: revoke anon')
ok(!revokesAnon('revoke all on public.x from authenticated;', 'x'), 'matcher: revoke authenticated is not anon')
ok(grantsAnon('grant select on public.x to anon, authenticated;', 'x'), 'matcher: grant anon')

if (fail) { console.error(`check:secdef-views - ${fail} failure(s)`); process.exit(1) }
console.log(`check:secdef-views: all checks passed (${VIEWS.length} views, ${later.length} later migration(s) scanned)`)

// scripts/check-companies.mjs
//
//   npm run check:companies
//
// Asserts that every company offered in the field forms is accounted for: it
// either belongs to an LMS tenant, or it is explicitly declared not to be one.
//
// WHY NOT SIMPLY "EVERY NAME MAPS TO AN lms_companies ROW"
//
// Because that is false by design and always will be. Of the 34 names in the
// dropdown, 23 are operators and clients whose sites we work on — ConocoPhillips,
// Hilcorp Alaska, Santos — who have no learners, no company admin and no
// lms_companies row. A test demanding a row for each would fail on first run
// and be switched off, which is worse than no test.
//
// So the invariant is the one that actually protects the data: no name may be
// in NEITHER category. A company added to the dropdown without a tenant
// mapping is the failure this exists to catch, because its records vanish from
// its own dashboard silently — an empty SAIL page is indistinguishable from
// having no open items.
//
// Reads SUPABASE_SERVICE_ROLE_KEY from the environment. It only ever SELECTs.

import { readFileSync } from 'node:fs'

const URL_BASE = (process.env.NEXT_PUBLIC_SUPABASE_URL
  || 'https://iypezirwdlqpptjpeeyf.supabase.co').replace(/\/$/, '')
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is not set.')
  console.error('This check reads lms_companies; it cannot run without it.')
  process.exit(2)
}

// Parse the constants out of the real module rather than duplicating them,
// so the check can never pass against a copy that has drifted from the source.
const src = readFileSync(new URL('../app/lib/companies.js', import.meta.url), 'utf8')

function parseList(name) {
  const m = src.match(new RegExp(`${name}\\s*=\\s*(?:new Set\\()?\\[([\\s\\S]*?)\\]`))
  if (!m) throw new Error(`could not find ${name} in app/lib/companies.js`)
  return m[1].split('\n')
    .map(l => l.replace(/\/\/.*$/, '').trim())
    .filter(l => l.startsWith("'") || l.startsWith('"'))
    .map(l => l.replace(/^['"]|['"],?$/g, ''))
}

const COMPANIES = parseList('COMPANIES')
const NON_TENANT = new Set(parseList('NON_TENANT_COMPANIES'))

async function q(path) {
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  })
  if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`)
  return res.json()
}

const rows = await q('lms_companies?select=name,sail_company_names')

// Every spelling any tenant claims.
const claimed = new Map() // spelling -> company name
for (const r of rows) {
  for (const s of r.sail_company_names || []) {
    if (claimed.has(s)) {
      console.error(`CONFLICT: '${s}' is claimed by both ` +
        `${claimed.get(s)} and ${r.name}. One spelling, one tenant.`)
      process.exitCode = 1
    }
    claimed.set(s, r.name)
  }
}

const failures = []
const warnings = []

// 1. No duplicates, no stray whitespace.
const seen = new Set()
for (const c of COMPANIES) {
  if (seen.has(c)) failures.push(`duplicate entry: '${c}'`)
  seen.add(c)
  if (c !== c.trim()) failures.push(`leading/trailing whitespace: ${JSON.stringify(c)}`)
}

// 2. The invariant: mapped, or declared a non-tenant. Never neither, never both.
for (const c of COMPANIES) {
  const mapped = claimed.has(c)
  const declared = NON_TENANT.has(c)
  if (!mapped && !declared) {
    failures.push(
      `'${c}' is in the dropdown but has no tenant mapping and is not listed ` +
      `in NON_TENANT_COMPANIES.\n` +
      `      Records filed under it will not appear on any company dashboard.\n` +
      `      Fix: add '${c}' to some lms_companies.sail_company_names, or add ` +
      `it to NON_TENANT_COMPANIES.`)
  }
  if (mapped && declared) {
    failures.push(
      `'${c}' is BOTH mapped to tenant ${claimed.get(c)} and declared a ` +
      `non-tenant. Remove it from NON_TENANT_COMPANIES.`)
  }
}

// 3. A declared non-tenant that no longer exists in the dropdown is dead weight.
for (const c of NON_TENANT) {
  if (!seen.has(c)) warnings.push(`NON_TENANT_COMPANIES lists '${c}', which is not in COMPANIES`)
}

// 4. A tenant no crew can file a form against. Not fatal — an LMS-only tenant
//    (training but no field work) is legitimate — but worth surfacing.
for (const r of rows) {
  const spellings = r.sail_company_names || []
  if (spellings.length === 0) {
    warnings.push(`tenant '${r.name}' has no sail_company_names: LMS-only, sees no SAIL rows`)
  } else if (!spellings.some(s => seen.has(s))) {
    warnings.push(
      `tenant '${r.name}' maps only to [${spellings.join(', ')}], none of which ` +
      `is selectable in the dropdown — no new record can be filed under it`)
  }
}

console.log(`companies in dropdown : ${COMPANIES.length}`)
console.log(`mapped to a tenant    : ${COMPANIES.filter(c => claimed.has(c)).length}`)
console.log(`declared non-tenant   : ${COMPANIES.filter(c => NON_TENANT.has(c)).length}`)
console.log(`lms_companies rows    : ${rows.length}`)

if (warnings.length) {
  console.log(`\nwarnings (${warnings.length}):`)
  for (const w of warnings) console.log(`  - ${w}`)
}

if (failures.length) {
  console.error(`\nFAILED (${failures.length}):`)
  for (const f of failures) console.error(`  - ${f}`)
  process.exit(1)
}

console.log('\nOK: every company in the dropdown is either mapped to a tenant')
console.log('    or explicitly declared not to be one.')

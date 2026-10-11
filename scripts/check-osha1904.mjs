// npm run check:osha1904 — 29 CFR 1904 classification justification rules + wiring.
import fs from 'node:fs'
import { validateOsha1904, citesInText, OSHA1904_TEMPLATES, OSHA1904_EXAMPLES, OSHA1904_CLASSIFICATIONS } from '../app/lib/osha1904.js'

let fail = 0
const ok = (c, m) => { if (!c) { fail++; console.error('FAIL:', m) } }
const long = (s) => s + ' '.repeat(0) + ' Additional facts recorded by the investigator for this case.'.repeat(3)

ok(citesInText('per § 1904.5(b)(2)(v) and 29 CFR 1904.7 (b)(5)').join('|') === '1904.5(b)(2)(v)|1904.7(b)(5)', 'citation parser')
ok(!validateOsha1904({}).ok, 'blank fails')
ok(validateOsha1904({ classification: 'not_case' }).ok, 'not a case passes with no narrative')
ok(!validateOsha1904({ classification: 'bunkhouse', work_related: 'no', justification: 'He slipped.' }).ok, 'short bunkhouse fails')
ok(!validateOsha1904({ classification: 'bunkhouse', work_related: 'no', justification: long('He slipped at camp off shift. 1904.5(a) applies.') }).ok, 'bunkhouse without exception fails')
ok(validateOsha1904({ classification: 'bunkhouse', work_related: 'no', justification: long('Remote camp, 1904.5(a) presumption; exception 1904.5(b)(2)(v) personal task outside assigned working hours.') }).ok, 'bunkhouse with logic passes')
ok(!validateOsha1904({ classification: 'bunkhouse', work_related: 'yes', justification: long('1904.5(a) 1904.5(b)(2)(v)') }).ok, 'bunkhouse + work-related yes fails')
ok(!validateOsha1904({ classification: 'recordable_mti', work_related: 'yes', justification: long('Rigid splint applied. 1904.5(a) work-related.') }).ok, 'MTI without 1904.7(b)(5) fails')
ok(validateOsha1904({ classification: 'recordable_mti', work_related: 'yes', basis: ['1904.7(b)(5)'], justification: long('Rigid splint applied at clinic, work-related under 1904.5(a).') }).ok, 'MTI with basis chip passes')
ok(!validateOsha1904({ classification: 'recordable_mti', work_related: 'no', basis: ['1904.5(a)', '1904.7(b)(5)'], justification: long('x') }).ok, 'recordable + not work-related fails')
ok(!validateOsha1904({ classification: 'recordable_lti', work_related: 'yes', basis: ['1904.5(a)', '1904.7(b)(3)'], justification: long('days away') }).ok, 'LTI needs days away')
ok(validateOsha1904({ classification: 'recordable_lti', work_related: 'yes', days_away: 4, basis: ['1904.5(a)', '1904.7(b)(3)'], justification: long('days away') }).ok, 'LTI with days passes')
ok(validateOsha1904({ classification: 'first_aid', justification: long('Cleaned and bandaged; 1904.7(b)(5)(ii) first-aid list only.') }).ok, 'first aid passes')
ok(!validateOsha1904({ classification: 'first_aid', justification: long('[TO COMPLETE] 1904.7(b)(5)(ii)') }).ok, 'TO COMPLETE placeholder fails')
for (const c of OSHA1904_CLASSIFICATIONS) if (c.value !== 'not_case') ok(!!OSHA1904_TEMPLATES[c.value], 'template for ' + c.value)
// Templates must carry the required citations so a filled-in template passes the cite check.
for (const [k, t] of Object.entries(OSHA1904_TEMPLATES)) {
  if (k === 'other_not_recordable') continue // the investigator names the provision
  const r = validateOsha1904({ classification: k, work_related: k.startsWith('recordable') ? 'yes' : 'no', days_away: 3, days_restricted: 3, justification: t.replace(/\[[^\]]*\]/g, 'filled') })
  ok(r.issues.every(i => !/Regulatory basis missing/.test(i)), 'template cites enough: ' + k + ' ' + r.issues.join(' / '))
}
// No client or person names in the product copy.
const lib = fs.readFileSync('app/lib/osha1904.js', 'utf8')
for (const bad of ['Pollard', 'Percival', 'Scheller', 'Badami', 'SRU 23']) ok(!lib.includes(bad), 'no hard-coded name: ' + bad)
ok(OSHA1904_EXAMPLES.length === 2, 'two worked examples')

// Wiring
const wb = fs.readFileSync('app/investigation-workbench/[id]/page.js', 'utf8')
ok(wb.includes('Osha1904Classification') && wb.includes('validateOsha1904'), 'workbench renders and gates 1904')
const rep = fs.readFileSync('app/investigation-report/[id]/page.js', 'utf8')
ok(rep.includes('osha_1904_justification'), 'final report prints the justification')
const pdf = fs.readFileSync('supabase/functions/generate-investigation-pdf/index.ts', 'utf8')
ok(pdf.includes('osha_1904_justification'), 'PDF prints the justification')
ok(!pdf.includes('osha_1904_wc_note'), 'conclusions PDF never prints the WC note')
const sql = fs.readdirSync('supabase/migrations').filter(f => f.includes('osha_1904')).map(f => fs.readFileSync('supabase/migrations/' + f, 'utf8')).join('\n')
ok(sql.includes("'incidents:osha_1904_justification'"), 'text gate checks the justification')

if (fail) { console.error(`check:osha1904 — ${fail} failure(s)`); process.exit(1) }
console.log('check:osha1904: all checks passed')

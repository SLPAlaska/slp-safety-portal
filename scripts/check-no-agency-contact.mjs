// npm run check:no-agency-contact
// Standing rule (Brian, 2026-10-17): the system must NEVER notify, email, call, text, submit to or open a webhook
// to any government agency. Telling staff that something is reportable (citation, deadline) is allowed, and so is
// help text that names an agency. This check blocks AUTOMATIC outbound agency contact: agency URLs (a fetch,
// webhook or link target), agency email addresses, mailto: to an agency, auto-notify function names, and agency
// phone numbers in code (so nothing can text or dial them). Port of yjos-portal tests/unit/no-agency-auto-contact
// (PR #222). Scans app/, lib/, components/, config/, scripts/, supabase/ (functions and migrations).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// Agency domains that receive reports. ecfr.gov and akleg.gov publish the law; citing them is fine.
const AGENCY_DOMAIN = String.raw`(?:[a-z0-9-]+\.)*(?:osha\.gov|dol\.gov|epa\.gov|nrc\.gov|uscg\.mil|bsee\.gov|phmsa\.dot\.gov|fmcsa\.dot\.gov|alaska\.gov)`
const AGENCY_URL = new RegExp(String.raw`(?:https?:)?//${AGENCY_DOMAIN}\b`, 'i')
const AGENCY_EMAIL = new RegExp(String.raw`[a-z0-9._%+-]+@${AGENCY_DOMAIN}\b`, 'i')
const MAILTO_AGENCY = new RegExp(String.raw`mailto:[^"'\s]*${AGENCY_DOMAIN}`, 'i')
const AUTO_NOTIFY_FN = /\b(notifyAgency|reportToAgency|submitToOsha|submitToAkosh|submitToAogcc|submitToAdec|submitToNrc|sendToAgency|agencyWebhook|aogccNotify|autoReportAgency|callAgency|textAgency)\b/
// Same numbers as yjos-portal lib/obligations/rules.cjs, each from its primary agency source.
const AGENCY_PHONES = [
  '8007704940', '9072694940', '8003216742', // AKOSH, https://labor.alaska.gov/lss/oshhome.htm (and OSHA, 29 CFR 1904.39(a)(3)(ii))
  '9072791433', // AOGCC, https://www.commerce.alaska.gov/web/aogcc/AboutUs/
  '8004789300', '9072690667', // ADEC, https://dec.alaska.gov/media/17434/spill-reporting-placard.pdf
  '8004248802', // NRC, 40 CFR 110.6
  '8777834980', '9074652790', // Alaska Workers' Compensation Division, https://labor.alaska.gov/wc/
]
const SKIP_DIR = new Set(['node_modules', '.git', '.next', 'coverage', 'dist', 'build', 'docs'])
const CODE_EXT = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.json', '.sql', '.html'])
const THIS_FILE = path.join('scripts', 'check-no-agency-contact.mjs')

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIR.has(ent.name)) continue
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(p, out)
    else if (CODE_EXT.has(path.extname(ent.name))) out.push(p)
  }
  return out
}

function scan(text, rel) {
  const hits = []
  if (AGENCY_EMAIL.test(text)) hits.push(`${rel}: agency email address ${text.match(AGENCY_EMAIL)[0]}`)
  if (MAILTO_AGENCY.test(text)) hits.push(`${rel}: mailto to an agency`)
  if (AUTO_NOTIFY_FN.test(text)) hits.push(`${rel}: auto-notify function ${text.match(AUTO_NOTIFY_FN)[0]}`)
  if (AGENCY_URL.test(text)) hits.push(`${rel}: agency URL ${text.match(AGENCY_URL)[0]}`)
  const flat = text.replace(/[^\d]+/g, ' ')
  for (const ph of AGENCY_PHONES) {
    const re = new RegExp(String.raw`\b1?\s?${ph.slice(0, 3)}\s?${ph.slice(3, 6)}\s?${ph.slice(6)}\b`)
    if (re.test(flat)) hits.push(`${rel}: agency phone number ${ph}`)
  }
  return hits
}

let fail = 0
const ok = (c, m) => { if (!c) { fail++; console.error('FAIL:', m) } }

// Self-check: the patterns catch automatic contact and allow normal code.
ok(scan("await fetch('https://www.osha.gov/report', { method: 'POST' })", 'x').length > 0, 'self-check: fetch to an agency URL')
ok(scan("const to = ['spills@dec.alaska.gov']", 'x').length > 0, 'self-check: agency email')
ok(scan('<a href="mailto:x@osha.gov">', 'x').length > 0, 'self-check: mailto')
ok(scan('await notifyAgency(incident)', 'x').length > 0, 'self-check: auto-notify name')
ok(scan("twilio.messages.create({ to: '+1 800 478 9300' })", 'x').length > 0, 'self-check: SMS to an agency number')
ok(scan("const hook = 'https://labor.alaska.gov/hook'", 'x').length > 0, 'self-check: webhook URL')
ok(scan("fetch('/api/incidents')", 'x').length === 0, 'self-check: own API is fine')
ok(scan("const cite = 'https://www.ecfr.gov/current/title-29'", 'x').length === 0, 'self-check: citing the law is fine')
ok(scan('Notify your supervisor: many spills have legal reporting deadlines (ADEC, the operator, sometimes the National Response Center).', 'x').length === 0, 'self-check: naming an agency in help text is fine')

const roots = ['app', 'lib', 'components', 'config', 'scripts', 'supabase'].map((d) => path.join(ROOT, d)).filter(fs.existsSync)
let files = 0
for (const root of roots) {
  for (const f of walk(root)) {
    const rel = path.relative(ROOT, f)
    if (rel === THIS_FILE) continue
    files++
    for (const h of scan(fs.readFileSync(f, 'utf8'), rel)) ok(false, h)
  }
}

if (fail) { console.error(`check:no-agency-contact FAILED (${fail})`); process.exit(1) }
console.log(`check:no-agency-contact OK (${files} files scanned, 9 self-checks)`)

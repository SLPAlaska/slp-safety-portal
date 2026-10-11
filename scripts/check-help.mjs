// Checks the Help Desk answer bank and engine (the shipped files, not a copy).
//  - every home-page link and every module route has a catalog row
//  - every link in an answer points at a real page (or tel:)
//  - sample field questions land the right answer in the top 3
//  - critical words raise STOP WORK; paperwork words do not
//  - switching a module off removes its answers and links
//  - Quick Start: every item is a real page owned by a module
// Usage: npm run check:help
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { makeGate } from '../app/lib/moduleGate.js'
import { buildBank, search, isCritical, bankStats, forPage } from '../app/lib/help/engine.js'
import { FORMS } from '../app/lib/help/forms.js'
import { HOWTO } from '../app/lib/help/howto.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const manifest = JSON.parse(readFileSync(join(root, 'config/modules.json'), 'utf8'))
const quick = JSON.parse(readFileSync(join(root, 'config/quickstart.json'), 'utf8'))
const home = readFileSync(join(root, 'app/page.js'), 'utf8')

let fails = 0
const ok = (cond, msg) => { if (!cond) { fails++; console.log('FAIL', msg) } }
const gateAll = makeGate(manifest, {}, '')
const ids = manifest.modules.map((m) => m.id)

const pageExists = (p) => {
  if (/^(tel|mailto|https?):/.test(p)) return true
  if (p === '/') return true
  if (existsSync(join(root, 'public', p))) return true
  const dir = join(root, 'app', p)
  return ['page.js', 'layout.js', 'route.js'].some((f) => existsSync(join(dir, f)))
}

// Catalog coverage.
const catalog = new Set(FORMS.map((f) => f.href))
const homeLinks = [...home.matchAll(/href:\s*'([^']+)'/g)].map((x) => x[1]).filter((h) => !/^https?:/.test(h))
for (const h of homeLinks) ok(catalog.has(h), `home link ${h} has no Help Desk catalog row (app/lib/help/forms.js)`)
const NOT_FOR_FIELD = new Set(['/', '/demo', '/investigation-report', '/sail-sync'].concat([]))
for (const m of manifest.modules) {
  for (const r of m.routes || []) {
    if (NOT_FOR_FIELD.has(r)) continue
    ok(catalog.has(r) || FORMS.some((f) => f.href.startsWith(r + '/')), `module ${m.id} route ${r} has no catalog row`)
  }
}
for (const f of FORMS) {
  ok(ids.includes(f.module), `catalog ${f.href}: unknown module ${f.module}`)
  ok(gateAll.ownerForPath(f.href) === f.module || f.module === 'core', `catalog ${f.href}: module ${f.module} but manifest says ${gateAll.ownerForPath(f.href)}`)
  if (!f.noLink) ok(pageExists(f.href), `catalog ${f.href}: page does not exist`)
  ok(f.what && f.what.length > 10, `catalog ${f.href}: missing description`)
}
const seenIds = new Set()
for (const h of HOWTO) {
  ok(!seenIds.has(h.id), `duplicate answer id ${h.id}`); seenIds.add(h.id)
  ok(h.q && h.a && h.k, `answer ${h.id}: q, a and k are required`)
  if (h.module) ok(ids.includes(h.module), `answer ${h.id}: unknown module ${h.module}`)
  for (const [, href] of h.links || []) ok(pageExists(href), `answer ${h.id}: link ${href} does not exist`)
  ok(!/\b\d{3}-\d{2}-\d{4}\b/.test(h.a), `answer ${h.id}: looks like an SSN`)
  ok(!/1234567!/.test(h.a), `answer ${h.id}: contains the temporary password`)
}

// Sample questions: [question, expected answer id or form href, ...more allowed]
const SAMPLES = [
  ['how do i do a tha', 'tha-how'],
  ['how do i fill out a jsa', 'tha-how'],
  ['my tha score is low', 'tha-score'],
  ['lost my tha code', 'tha-code'],
  ['close out tha end of shift', 'tha-close'],
  ['who can close a tha', 'tha-close', 'tha-not-named'],
  ['cannot close tha not on this tha', 'tha-not-named', 'tha-close'],
  ['after action review tha', 'tha-close'],
  ['forgot my password', 'lms-forgot'],
  ['cant log into training', 'lms-login', 'lms-forgot'],
  ['where is the sling inspection', 'form:/synthetic-sling-inspection'],
  ['sling', 'form:/synthetic-sling-inspection', 'sling-reject'],
  ['fire extinguisher', 'form:/fire-extinguisher-inspection', 'extinguisher-how'],
  ['bbs card', 'form:/bbs-form'],
  ['stop card', 'form:/bbs-form', 'stop-work-authority'],
  ['take 5', 'form:/stop-take-5'],
  ['toolbox talk', 'form:/toolbox-meeting-assessment', 'safety-meeting-vs', 'form:/safety-meeting'],
  ['lsr audit', 'lsr', 'form:/lsr-work-permits-audit', 'form:/lsr-line-of-fire-audit', 'form:/lsr-lifting-operations-audit', 'form:/lsr-driving-audit', 'form:/lsr-fall-protection-audit', 'form:/lsr-energy-isolation-audit', 'form:/lsr-confined-space-audit'],
  ['lost close out code', 'permit-code-lost'],
  ['how to close a permit', 'permit-close'],
  ['hot work permit', 'form:/hot-work'],
  ['lockout tagout', 'form:/energy-isolation', 'loto-workers'],
  ['report a near miss', 'form:/good-catch', 'near-miss-worth', 'which-report'],
  ['someone got hurt', 'injury-now'],
  ['h2s alarm going off', 'h2s'],
  ['diesel spill', 'spill-now'],
  ['is it recordable', 'recordable'],
  ['what counts as first aid', 'recordable'],
  ['no signal', 'offline-forms'],
  ['saved on my device', 'saved-on-device'],
  ['add photos', 'photos'],
  ['pictures wont upload', 'photo-fail'],
  ['how do i know it went through', 'did-it-go'],
  ['it wont let me submit', 'required-field'],
  ['edit my submission', 'edit-after'],
  ['sail log', 'sail-what', 'form:/sail-log-entry'],
  ['assign an action item', 'sail-add', 'form:/sail-log-entry'],
  ['close my sail item', 'sail-mine'],
  ['my action item is overdue', 'sail-overdue'],
  ['where is my certificate', 'lms-cert'],
  ['cerificate', 'lms-cert'],
  ['pass score for quiz', 'lms-pass'],
  ['video wont play', 'lms-audio'],
  ['didnt get the sign in email', 'no-link'],
  ['not on access list', 'not-on-list'],
  ['page not found', 'not-found'],
  ['blank screen', 'blank'],
  ['add to home screen', 'add-home-screen'],
  ['what is stky', 'stky'],
  ['line of fire', 'line-of-fire', 'form:/lsr-line-of-fire-audit'],
  ['hierarchy of controls', 'inv-hierarchy'],
  ['5 why', 'inv-5why'],
  ['journey management', 'form:/journey-management', 'journey-when'],
  ['haul road trip', 'form:/journey-management', 'journey-when'],
  ['cold weather', 'form:/cold-weather-form'],
  ['weather phase', 'phases', 'form:/weather', 'form:/phase-condition-risk-assessment'],
  ['forklift practical', 'form:/forklift-practical'],
  ['manlift evaluation', 'form:/aerial-lift-practical'],
  ['monthly inspections', 'inspect-monthly'],
  ['item failed inspection', 'inspect-fail'],
  ['pre trip', 'form:/vehicle-inspection', 'inspect-preshift'],
  ['moc', 'form:/management-of-change', 'moc-when'],
  ['incident report', 'form:/incident-report', 'incident-how'],
  ['save incident draft', 'incident-draft'],
  ['witness statement', 'form:/witness-statement', 'witness-how'],
  ['investigation wont approve', 'inv-spell'],
  ['contact slp', 'contact'],
  ['can i stop the job', 'stop-work-authority'],
  ['anonymous report', 'anonymous'],
  ['spanish', 'spanish'],
  ['drug test', 'form:/da-testing', 'da-tile'],
  ['exclusion zone dropped object', 'drops-calc', 'form:/drops-calculator'],
  ['add employee training admin', 'company-admin-add'],
  ['predictive safety dashboard', 'dashboards'],
  ['leading indicators dashboard', 'dashboards', 'leading'],
  ['harnes inspecton', 'form:/harness-inspection', 'harness-check'],
  ['scafold', 'form:/scaffold-inspection-form'],
]
const bank = buildBank(gateAll)
const key = (e) => e.id
let hits = 0
for (const [q, ...want] of SAMPLES) {
  const top = search(bank, q, { limit: 3 }).map((r) => key(r.entry))
  const good = top.some((t) => want.includes(t))
  if (good) hits++
  ok(good, `"${q}" top 3 = [${top.join(', ')}], wanted one of [${want.join(', ')}]`)
}

// STOP WORK banner.
for (const q of ['someone got hurt', 'man down', 'h2s alarm going off', 'there is a fire', 'gas leak', 'not breathing', 'he fell off the ladder', 'emergency', 'diesel spilling now', 'truck rollover']) ok(isCritical(q), `"${q}" should raise STOP WORK`)
for (const q of ['fire extinguisher inspection', 'emergency drill evaluation', 'how do i do a tha', 'line of fire audit', 'fire watch', 'hot work permit', 'eyewash', 'sling', 'aed inspection', 'certificate', 'stop work trigger', 'what goes in we stop the job if trigger']) ok(!isCritical(q), `"${q}" should NOT raise STOP WORK`)

// Context answers.
ok(forPage(bank, '/hot-work').some((e) => e.id === 'form:/hot-work'), 'help from /hot-work shows the hot work answer')
ok(forPage(bank, '/tha-jsa').length >= 3, 'help from /tha-jsa shows THA answers')

// Module off: answers and links vanish.
for (const id of ['permits', 'sail', 'lms', 'incidents', 'inspections']) {
  const g = makeGate(manifest, { [id]: false })
  const b = buildBank(g)
  ok(!b.some((e) => e.module && !g.isEnabled(e.module)), `${id} off: no answers from that module`)
  ok(!b.some((e) => (e.links || []).some(([, h]) => !/^tel:/.test(h) && !g.isPathEnabled(h))), `${id} off: no links into that module`)
}

// Quick Start.
ok(Array.isArray(quick.items) && quick.items.length >= 8, 'quickstart has items')
for (const it of [...quick.items, ...(quick.pinned || [])]) {
  ok(pageExists(it.href), `quickstart ${it.href} exists`)
  ok(gateAll.ownerForPath(it.href) && gateAll.ownerForPath(it.href) !== 'core', `quickstart ${it.href} owned by a module`)
}
for (let i = 1; i < quick.items.length; i++) ok(quick.items[i - 1].last90 >= quick.items[i].last90, `quickstart ranked by use (${quick.items[i].name})`)
const qsOff = makeGate(manifest, { 'daily-forms': false })
ok(!qsOff.isPathEnabled('/tha-jsa'), 'quickstart: THA hidden when daily-forms off')

const st = bankStats(bank)
console.log(fails ? `\n${fails} check(s) failed` : `help desk: all checks passed (${st.total} answers: ${st.howto} how-to + ${st.forms} form guides; ${hits}/${SAMPLES.length} sample questions in top 3)`)
process.exit(fails ? 1 : 0)

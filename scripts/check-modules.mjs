// Checks the module switches: manifest paths are real, every home-page link is
// owned by a module, the default config hides nothing, and switching a module
// off hides exactly its own links and routes (plus modules that depend on it).
// Runs the shipped app/lib/moduleGate.js, not a copy. Usage: npm run check:modules
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { makeGate } from '../app/lib/moduleGate.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const manifest = JSON.parse(readFileSync(join(root, 'config/modules.json'), 'utf8'))
const portal = JSON.parse(readFileSync(join(root, 'config/portal.json'), 'utf8'))
const home = readFileSync(join(root, 'app/page.js'), 'utf8')

let fails = 0
const ok = (cond, msg) => { if (!cond) { fails++; console.log('FAIL', msg) } }

const ids = manifest.modules.map((m) => m.id)
ok(new Set(ids).size === ids.length, 'module ids are unique')
for (const m of manifest.modules) {
  for (const d of m.dependencies || []) ok(ids.includes(d), `${m.id} depends on unknown module ${d}`)
}
for (const k of Object.keys(portal.modules?.switches || {})) ok(ids.includes(k), `portal.json switch "${k}" is not a module id`)

// Every manifest path exists in the app (page, layout, route) or in public/.
const routeExists = (p) => {
  if (p === '/') return existsSync(join(root, 'app/page.js'))
  if (existsSync(join(root, 'public', p))) return true
  const dir = join(root, 'app', p)
  return ['page.js', 'layout.js', 'route.js'].some((f) => existsSync(join(dir, f))) || existsSync(dir)
}
const seenPath = new Map()
for (const m of manifest.modules) {
  for (const p of [...(m.routes || []), ...(m.apiRoutes || [])]) {
    ok(routeExists(p), `${m.id}: path ${p} does not exist`)
    ok(!seenPath.has(p), `${p} claimed by both ${seenPath.get(p)} and ${m.id}`)
    seenPath.set(p, m.id)
  }
}

// Home links.
const allHrefs = [...home.matchAll(/href:\s*'([^']+)'/g)].map((x) => x[1])
// Links to another site (the predictive safety dashboard) name their module
// with module: '<id>' on the same line instead of owning a path here.
const externals = [...home.matchAll(/href:\s*'(https?:[^']+)'[^\n]*module:\s*'([^']+)'/g)].map((x) => ({ href: x[1], module: x[2] }))
const hrefs = allHrefs.filter((h) => !/^https?:/.test(h))
for (const h of allHrefs.filter((h) => /^https?:/.test(h))) ok(externals.some((e) => e.href === h), `external home link ${h} names its module`)
for (const e of externals) {
  ok(ids.includes(e.module), `external link ${e.href}: unknown module ${e.module}`)
  const g = makeGate(manifest, { [e.module]: false })
  const cat = [{ id: 'x', forms: [{ href: e.href, module: e.module }, { href: '/' }] }]
  ok(g.filterCategories(cat)[0].forms.length === 1, `external link ${e.href} hides when ${e.module} is off`)
  ok(makeGate(manifest, {}).filterCategories(cat)[0].forms.length === 2, `external link ${e.href} shows by default`)
}
ok(hrefs.length > 50, `found home links (${hrefs.length})`)
const base = makeGate(manifest, {}, '')
for (const h of hrefs) {
  const owner = base.ownerForPath(h)
  ok(owner && owner !== 'core', `home link ${h} has no switchable module`)
}

// Default deployment config: nothing off, nothing hidden, same array back.
const live = makeGate(manifest, portal.modules?.switches || {}, '')
ok(!live.anyOff, 'default config has every module on')
for (const id of ids) ok(live.isEnabled(id), `default: ${id} is on`)
for (const h of hrefs) ok(live.isPathEnabled(h), `default: ${h} visible`)
const cats = [{ id: 'x', forms: hrefs.map((href) => ({ href })) }]
ok(live.filterCategories(cats) === cats, 'default: home categories returned unchanged')

// Shared services never blocked.
for (const p of ['/', '/api/field-data', '/api/closeout', '/api/spellcheck', '/api/lms/learner/me', '/_next/x', '/Logo.png']) {
  for (const id of ids) ok(makeGate(manifest, { [id]: false }).isPathEnabled(p), `${p} stays open with ${id} off`)
}
ok(makeGate(manifest, {}, 'core').isEnabled('core'), 'core cannot be switched off')

// Each module off: its own paths blocked, dependents off, everything else untouched.
const dependents = (id) => manifest.modules.filter((m) => (m.dependencies || []).includes(id)).map((m) => m.id)
for (const m of manifest.modules) {
  if (m.required) continue
  for (const g of [makeGate(manifest, { [m.id]: false }), makeGate(manifest, {}, ` ${m.id} ,`)]) {
    ok(!g.isEnabled(m.id), `${m.id} off`)
    for (const p of [...(m.routes || []), ...(m.apiRoutes || [])]) {
      ok(!g.isPathEnabled(p), `${m.id} off blocks ${p}`)
      if (!p.includes('.')) ok(!g.isPathEnabled(p + '/sub/1'), `${m.id} off blocks ${p}/sub/1`)
    }
    for (const d of dependents(m.id)) ok(!g.isEnabled(d), `${m.id} off also turns off ${d}`)
    const off = new Set([m.id, ...dependents(m.id)])
    for (const other of ids) if (!off.has(other)) ok(g.isEnabled(other), `${m.id} off leaves ${other} on`)
    for (const h of hrefs) {
      const owner = g.ownerForPath(h)
      ok(g.isPathEnabled(h) === !off.has(owner), `${m.id} off: link ${h} visibility correct`)
    }
    const filtered = g.filterCategories([{ id: 'a', forms: hrefs.map((href) => ({ href })) }])
    const left = filtered.length ? filtered[0].forms.length : 0
    ok(left === hrefs.filter((h) => !off.has(g.ownerForPath(h))).length, `${m.id} off: home list count`)
  }
}
// Longest prefix wins.
ok(base.ownerForPath('/lms/competency/unit/3') === 'lms-competency', '/lms/competency owned by lms-competency')
ok(base.ownerForPath('/lms/dashboard') === 'lms', '/lms/dashboard owned by lms')
ok(makeGate(manifest, { 'lms-competency': false }).isPathEnabled('/lms/dashboard'), 'competency off keeps LMS dashboard')
ok(!makeGate(manifest, { lms: false }).isPathEnabled('/lms/competency/x'), 'lms off blocks competency too')
ok(base.ownerForPath('/hazard-id-x') === null, 'prefix match respects path segments')

console.log(fails ? `\n${fails} check(s) failed` : `module switches: all checks passed (${ids.length} modules, ${hrefs.length} home links)`)
process.exit(fails ? 1 : 0)

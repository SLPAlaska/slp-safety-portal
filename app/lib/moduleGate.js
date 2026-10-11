// Module on/off switches. Pure functions, no imports, so the same code runs in
// proxy.js (every request), the home page (browser), and scripts/check-modules.mjs.
//
// manifest: config/modules.json. switches: config/portal.json modules.switches.
// disabled: NEXT_PUBLIC_DISABLED_MODULES (comma separated ids), inlined at build.
//
// Default is ON. A module is off only when a switch says false or the env lists
// it, or when a module it depends on is off. Required modules (core) never turn
// off. Paths no module claims are never blocked.

export function parseDisabled(value) {
  return String(value || '').split(',').map((s) => s.trim()).filter(Boolean)
}

export function makeGate(manifest, switches = {}, disabledEnv = '') {
  const mods = (manifest && manifest.modules) || []
  const byId = new Map(mods.map((m) => [m.id, m]))
  const forced = new Set(parseDisabled(disabledEnv))
  const sw = switches || {}

  function isEnabled(id, seen = new Set()) {
    if (!id) return true
    const mod = byId.get(id)
    if (!mod) return true
    if (mod.required) return true
    if (seen.has(id)) return true
    seen.add(id)
    if (forced.has(id)) return false
    if (sw[id] === false) return false
    for (const dep of mod.dependencies || []) {
      if (!isEnabled(dep, seen)) return false
    }
    return true
  }

  const entries = []
  for (const mod of mods) {
    for (const key of ['routes', 'apiRoutes']) {
      for (const p of mod[key] || []) entries.push({ id: mod.id, path: p })
    }
  }

  // Longest matching prefix wins, so /lms/competency belongs to lms-competency, not lms.
  function ownerForPath(pathname) {
    const path = String(pathname || '').split('?')[0].split('#')[0]
    let best = null
    let score = -1
    for (const e of entries) {
      const hit = path === e.path || (e.path !== '/' && path.startsWith(e.path + '/'))
      if (hit && e.path.length > score) { score = e.path.length; best = e.id }
    }
    return best
  }

  function isPathEnabled(pathname) {
    const owner = ownerForPath(pathname)
    return !owner || isEnabled(owner)
  }

  const anyOff = mods.some((m) => !isEnabled(m.id))

  // Home-page categories: drop links whose page is off, then drop empty tiles.
  // With every module on this returns the same array, untouched.
  function filterCategories(categories) {
    if (!anyOff) return categories
    const out = []
    for (const c of categories) {
      const forms = (c.forms || []).filter((f) => isPathEnabled(f.href))
      if (!forms.length) continue
      out.push(forms.length === c.forms.length ? c : { ...c, forms })
    }
    return out
  }

  return { isEnabled, ownerForPath, isPathEnabled, filterCategories, anyOff }
}

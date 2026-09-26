// app/api/competency/scenario/route.js
// POST {unit_id, action:'choose', node, i}          -> consequence of one choice (quality, feedback, next node)
// POST {unit_id, action:'finish', path:[{node,i}]}  -> server re-scores the whole path from its own content and records it
import { admin, me, json, loadUnit, pickScenario } from '../_lib'

export async function POST(req) {
  const u = await me(req)
  if (!u) return json({ error: 'Unauthorized' }, 401)
  const body = await req.json()
  const unit = await loadUnit(u, body.unit_id)
  if (!unit?.scenario) return json({ error: 'Scenario not found' }, 404)
  // Spanish and English scenarios share identical structure, so scoring is the same in either language.
  const S = pickScenario(u, unit)

  if (body.action === 'choose') {
    const opt = S.nodes?.[body.node]?.options?.[body.i]
    if (!opt) return json({ error: 'Invalid choice' }, 400)
    return json({ q: opt.q, fb: opt.fb, next: opt.next })
  }

  if (body.action === 'finish') {
    const path = Array.isArray(body.path) ? body.path : []
    let expected = S.start, poor = 0
    const calls = []
    for (const step of path) {
      if (step.node !== expected) return json({ error: 'Path does not follow the scenario' }, 400)
      const opt = S.nodes?.[step.node]?.options?.[step.i]
      if (!opt) return json({ error: 'Invalid choice in path' }, 400)
      if (opt.q === 'poor') poor++
      calls.push({ node: step.node, i: step.i, q: opt.q })
      expected = opt.next
    }
    if (expected !== 'end') return json({ error: 'Scenario not finished' }, 400)
    const passed = poor === 0
    const { error } = await admin.from('lms_comp_scenario_attempts')
      .insert({ company_id: u.company_id, user_id: u.id, unit_id: unit.id, path: calls, poor_count: poor, passed })
    if (error) return json({ error: error.message }, 500)
    return json({ passed, poor_count: poor, calls: calls.map(c => c.q), debrief: S.debrief })
  }
  return json({ error: 'Unknown action' }, 400)
}

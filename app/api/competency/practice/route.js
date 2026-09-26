// app/api/competency/practice/route.js
// GET ?unit_id=                              -> this learner's saved worksheet
// PUT {unit_id, worksheet, attest:[true...]} -> save; marked complete only when every gate is attested
import { admin, me, json, loadUnit, pickPractice } from '../_lib'

export async function GET(req) {
  const u = await me(req)
  if (!u) return json({ error: 'Unauthorized' }, 401)
  const unit = await loadUnit(u, new URL(req.url).searchParams.get('unit_id'))
  if (!unit?.practice) return json({ error: 'Practice step not found' }, 404)
  const { data } = await admin.from('lms_comp_practice').select('worksheet, attested, submitted_at, updated_at')
    .eq('user_id', u.id).eq('unit_id', unit.id).maybeSingle()
  return json({ practice: data || { worksheet: {}, attested: false } })
}

export async function PUT(req) {
  const u = await me(req)
  if (!u) return json({ error: 'Unauthorized' }, 401)
  const { unit_id, worksheet, attest } = await req.json()
  const unit = await loadUnit(u, unit_id)
  if (!unit?.practice) return json({ error: 'Practice step not found' }, 404)
  const gates = pickPractice(u, unit).gates || []
  const allAttested = Array.isArray(attest) && attest.length === gates.length && attest.every(x => x === true)
  const row = { company_id: u.company_id, user_id: u.id, unit_id: unit.id, worksheet: worksheet || {}, updated_at: new Date().toISOString() }
  if (allAttested) { row.attested = true; row.submitted_at = new Date().toISOString() }
  const { data, error } = await admin.from('lms_comp_practice').upsert(row, { onConflict: 'user_id,unit_id' })
    .select('attested, submitted_at, updated_at').single()
  if (error) return json({ error: error.message }, 500)
  return json({ practice: data })
}

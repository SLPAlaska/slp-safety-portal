// app/api/competency/reopen/route.js
// POST {user_id, quiz_id, reason} -> a manager reopens a locked knowledge check; the reason is recorded.
import { admin, me, json, MANAGERS } from '../_lib'

export async function POST(req) {
  const u = await me(req)
  if (!u || !MANAGERS.includes(u.role)) return json({ error: 'Forbidden' }, 403)
  const { user_id, quiz_id, reason } = await req.json()
  if (!user_id || !quiz_id || !reason?.trim()) return json({ error: 'user_id, quiz_id and a reason are required' }, 400)
  const { data: learner } = await admin.from('lms_users').select('id, company_id').eq('id', user_id).single()
  if (!learner || (u.role !== 'super_admin' && learner.company_id !== u.company_id)) return json({ error: 'Learner not found' }, 404)
  const { error } = await admin.from('lms_comp_reopens').insert({ company_id: learner.company_id, user_id, quiz_id, reopened_by: u.id, reason: reason.trim() })
  if (error) return json({ error: error.message }, 500)
  return json({ ok: true })
}

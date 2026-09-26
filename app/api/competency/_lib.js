// app/api/competency/_lib.js
// Shared helpers for the AnthroSafe Competency system. Underscore prefix keeps Next from routing it.
// AnthroSafe(TM) Field Driven Safety | (c) 2026 SLP Alaska, LLC
import { createClient } from '@supabase/supabase-js'

// Created on first use, not at import, so next build can load this module without the service key.
let _admin = null
export const admin = new Proxy({}, {
  get(_, prop) {
    if (!_admin) _admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    const v = _admin[prop]
    return typeof v === 'function' ? v.bind(_admin) : v
  }
})
export const MANAGERS = ['super_admin', 'admin', 'company_admin']
export const json = (body, status = 200) => Response.json(body, { status })

export async function me(req) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '')
  if (!token) return null
  const { data: { user } } = await admin.auth.getUser(token)
  if (!user) return null
  const { data } = await admin.from('lms_users').select('id, company_id, role, full_name, active, language').eq('auth_user_id', user.id).single()
  if (!data || !data.active || !data.company_id) return null
  return data
}

export function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

export async function loadUnit(u, unitId) {
  if (!unitId) return null
  const { data } = await admin.from('lms_comp_units').select('*').eq('id', unitId).eq('company_id', u.company_id).single()
  return data || null
}

// Locked when failed submissions since the most recent reopen reach max_attempts.
export async function quizLock(u, quiz) {
  if (!quiz?.max_attempts) return { locked: false, failedSinceReopen: 0 }
  const { data: reopen } = await admin.from('lms_comp_reopens').select('created_at')
    .eq('user_id', u.id).eq('quiz_id', quiz.id).order('created_at', { ascending: false }).limit(1)
  let q = admin.from('lms_kc_attempts').select('id', { count: 'exact', head: true })
    .eq('user_id', u.id).eq('quiz_id', quiz.id).eq('passed', false).not('submitted_at', 'is', null)
  if (reopen?.[0]) q = q.gt('submitted_at', reopen[0].created_at)
  const { count } = await q
  return { locked: (count || 0) >= quiz.max_attempts, failedSinceReopen: count || 0 }
}

export async function unitStatus(u, unit) {
  const out = { scenario_passed: !unit.scenario, practice_done: !unit.practice, check_passed: !unit.quiz_id, check_locked: false }
  if (unit.scenario) {
    const { count } = await admin.from('lms_comp_scenario_attempts').select('id', { count: 'exact', head: true })
      .eq('user_id', u.id).eq('unit_id', unit.id).eq('passed', true)
    out.scenario_passed = (count || 0) > 0
  }
  if (unit.practice) {
    const { data } = await admin.from('lms_comp_practice').select('attested').eq('user_id', u.id).eq('unit_id', unit.id).maybeSingle()
    out.practice_done = !!data?.attested
  }
  if (unit.quiz_id) {
    // A pass in either language counts; the lock follows the quiz this learner is served.
    const ids = [unit.quiz_id, unit.quiz_id_es].filter(Boolean)
    const { count } = await admin.from('lms_kc_attempts').select('id', { count: 'exact', head: true })
      .eq('user_id', u.id).in('quiz_id', ids).eq('passed', true)
    out.check_passed = (count || 0) > 0
    const { data: quiz } = await admin.from('lms_kc_quizzes').select('id, max_attempts').eq('id', pickQuizId(u, unit)).single()
    out.check_locked = !out.check_passed && (await quizLock(u, quiz)).locked
  }
  out.complete = out.scenario_passed && out.practice_done && out.check_passed
  return out
}

// Scenario as the learner may see it: no option quality, feedback, routing or debrief.
export function publicScenario(s) {
  if (!s) return null
  const nodes = {}
  for (const [id, n] of Object.entries(s.nodes || {})) nodes[id] = { text: n.text, options: n.options.map((o, i) => ({ i, t: o.t })) }
  return { title: s.title, setup: s.setup, start: s.start, nodes, decisions: Object.keys(s.nodes || {}).length }
}

// Language selection: Spanish content is served when the learner's language is es and the unit has it; otherwise English.
export const useEs = (u, unit) => u?.language === 'es' && !!unit?.scenario_es
export const pickScenario = (u, unit) => (useEs(u, unit) ? unit.scenario_es : unit.scenario)
export const pickPractice = (u, unit) => (useEs(u, unit) && unit.practice_es ? unit.practice_es : unit.practice)
export const pickQuizId = (u, unit) => (useEs(u, unit) && unit.quiz_id_es ? unit.quiz_id_es : unit.quiz_id)
export const pickTitle = (u, unit) => (useEs(u, unit) && unit.title_es ? unit.title_es : unit.title)

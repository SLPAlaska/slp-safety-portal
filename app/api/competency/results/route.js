// app/api/competency/results/route.js
// Managers only. GET ?subject_id=                   -> every learner with activity, by unit
//                GET ?subject_id=&user_id=          -> one learner's full detail (scenario paths, worksheet, attempts)
import { admin, me, json, MANAGERS, quizLock } from '../_lib'

export async function GET(req) {
  const u = await me(req)
  if (!u || !MANAGERS.includes(u.role)) return json({ error: 'Forbidden' }, 403)
  const sp = new URL(req.url).searchParams
  const subjectId = sp.get('subject_id'), userId = sp.get('user_id')
  const { data: subject } = await admin.from('lms_competency_subjects').select('id, title, revision').eq('id', subjectId).eq('company_id', u.company_id).single()
  if (!subject) return json({ error: 'Competency not found' }, 404)
  const { data: units } = await admin.from('lms_comp_units').select('id, unit_order, title, quiz_id, quiz_id_es, scenario, practice').eq('subject_id', subjectId).eq('company_id', u.company_id).order('unit_order')
  const unitIds = (units || []).map(x => x.id)
  const quizIds = (units || []).flatMap(x => [x.quiz_id, x.quiz_id_es]).filter(Boolean)
  if (!unitIds.length) return json({ subject, units: [], learners: [] })

  let sq = admin.from('lms_comp_scenario_attempts').select('user_id, unit_id, path, poor_count, passed, created_at').in('unit_id', unitIds).order('created_at')
  let pq = admin.from('lms_comp_practice').select('user_id, unit_id, worksheet, attested, submitted_at, updated_at').in('unit_id', unitIds)
  let kq = admin.from('lms_kc_attempts').select('id, user_id, quiz_id, score, passed, started_at, submitted_at').in('quiz_id', quizIds).not('submitted_at', 'is', null).order('submitted_at')
  let rq = admin.from('lms_comp_reopens').select('user_id, quiz_id, reason, created_at, reopened_by').in('quiz_id', quizIds).order('created_at')
  if (userId) { sq = sq.eq('user_id', userId); pq = pq.eq('user_id', userId); kq = kq.eq('user_id', userId); rq = rq.eq('user_id', userId) }
  const [{ data: sc }, { data: pr }, { data: kc }, { data: ro }] = await Promise.all([sq, pq, kq, rq])

  const ids = [...new Set([...(sc || []), ...(pr || []), ...(kc || [])].map(r => r.user_id))]
  const { data: people } = ids.length ? await admin.from('lms_users').select('id, full_name, job_title, language, company_id').in('id', ids) : { data: [] }
  const byId = Object.fromEntries((people || []).filter(p => p.company_id === u.company_id).map(p => [p.id, p]))
  const quizUnit = {}; (units || []).forEach(x => { if (x.quiz_id) quizUnit[x.quiz_id] = x.id; if (x.quiz_id_es) quizUnit[x.quiz_id_es] = x.id })
  const { data: quizzes } = await admin.from('lms_kc_quizzes').select('id, max_attempts').in('id', quizIds)
  const qById = Object.fromEntries((quizzes || []).map(q => [q.id, q]))

  const learners = []
  for (const pid of Object.keys(byId)) {
    const person = byId[pid]; const per = {}
    for (const unit of units) {
      const s = (sc || []).filter(r => r.user_id === pid && r.unit_id === unit.id)
      const p = (pr || []).find(r => r.user_id === pid && r.unit_id === unit.id)
      const k = (kc || []).filter(r => r.user_id === pid && quizUnit[r.quiz_id] === unit.id)
      const served = person.language === 'es' && unit.quiz_id_es ? unit.quiz_id_es : unit.quiz_id
      const passedCheck = k.some(a => a.passed)
      const lock = !passedCheck && served && qById[served] ? (await quizLock({ id: pid }, qById[served])).locked : false
      per[unit.id] = { scenario_attempts: s.length, scenario_passed: s.some(a => a.passed), poor_calls: s.reduce((t, a) => t + a.poor_count, 0),
        practice_attested: !!p?.attested, check_attempts: k.length, best_score: k.length ? Math.max(...k.map(a => a.score ?? 0)) : null, check_passed: passedCheck, locked: lock,
        quiz_ids: [unit.quiz_id, unit.quiz_id_es].filter(Boolean),
        ...(userId ? { scenarios: s.map(a => ({ at: a.created_at, passed: a.passed, calls: (a.path || []).map(c => c.q) })), worksheet: p?.worksheet || null, practice_fields: unit.practice?.fields || [],
          checks: k.map(a => ({ at: a.submitted_at, score: a.score, passed: a.passed })), reopens: (ro || []).filter(r => quizUnit[r.quiz_id] === unit.id) } : {}) }
    }
    const last = [...(sc || []), ...(pr || []), ...(kc || [])].filter(r => r.user_id === pid).map(r => r.submitted_at || r.updated_at || r.created_at).filter(Boolean).sort().pop()
    learners.push({ id: pid, full_name: person.full_name, job_title: person.job_title, language: person.language, last_activity: last || null, units: per,
      complete: units.every(x => per[x.id].scenario_passed && (!x.practice || per[x.id].practice_attested) && per[x.id].check_passed) })
  }
  learners.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''))
  return json({ subject, units: units.map(x => ({ id: x.id, unit_order: x.unit_order, title: x.title })), learners })
}

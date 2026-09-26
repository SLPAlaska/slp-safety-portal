// app/api/competency/check/route.js
// Controlled knowledge check. The server draws, remembers the draw, scores only the drawn questions,
// enforces lockout on every submission, and never returns the answer key.
// GET ?unit_id=                                   -> start an attempt: stratified draw by objective
// POST {attempt_id, answers:{question_id: value}} -> score and record
import { admin, me, json, loadUnit, unitStatus, quizLock, shuffle, pickQuizId } from '../_lib'

function draw(questions, n) {
  const byObj = {}
  for (const q of questions) (byObj[q.objective || '_'] = byObj[q.objective || '_'] || []).push(q)
  const pick = Object.values(byObj).map(list => shuffle(list)[0])
  const rest = shuffle(questions.filter(q => !pick.includes(q)))
  while (pick.length < n && rest.length) pick.push(rest.pop())
  return shuffle(pick.slice(0, n))
}

function forLearner(q) {
  const base = { id: q.id, prompt: q.prompt, qtype: q.qtype }
  if (q.qtype === 'mc' || q.qtype === 'mr') return { ...base, options: shuffle(q.options || []) }
  if (q.qtype === 'matching') return { ...base, items: shuffle(q.items || []), categories: shuffle(q.categories || []) }
  if (q.qtype === 'sequence') return { ...base, items: shuffle(q.items || []) }
  return base
}

function isCorrect(q, v) {
  if (v === undefined || v === null) return false
  if (q.qtype === 'mc') return v === q.correct_key
  if (q.qtype === 'mr') return Array.isArray(v) && JSON.stringify([...v].sort()) === JSON.stringify([...(q.answer || [])].sort())
  if (q.qtype === 'matching') return typeof v === 'object' && Object.keys(q.answer || {}).every(k => v[k] === q.answer[k])
  if (q.qtype === 'sequence') return Array.isArray(v) && JSON.stringify(v) === JSON.stringify(q.answer || [])
  return false
}

export async function GET(req) {
  const u = await me(req)
  if (!u) return json({ error: 'Unauthorized' }, 401)
  const unit = await loadUnit(u, new URL(req.url).searchParams.get('unit_id'))
  if (!unit?.quiz_id) return json({ error: 'Knowledge check not found' }, 404)
  const st = await unitStatus(u, unit)
  if (!st.scenario_passed) return json({ error: 'Complete the decision scenario first.' }, 403)
  if (!st.practice_done) return json({ error: 'Complete the practice step first.' }, 403)
  const { data: quiz } = await admin.from('lms_kc_quizzes').select('*').eq('id', pickQuizId(u, unit)).eq('company_id', u.company_id).single()
  if (!quiz?.active) return json({ error: 'Knowledge check not available' }, 404)
  if ((await quizLock(u, quiz)).locked) return json({ error: 'Locked: review required before another attempt.', locked: true }, 403)

  const { data: all } = await admin.from('lms_kc_questions').select('*').eq('quiz_id', quiz.id)
  if (!all?.length) return json({ error: 'Knowledge check has no questions' }, 400)
  const drawn = quiz.draw_count ? draw(all, quiz.draw_count) : shuffle(all)
  const { data: attempt, error } = await admin.from('lms_kc_attempts').insert({
    company_id: u.company_id, quiz_id: quiz.id, user_id: u.id, answers: {},
    drawn_ids: drawn.map(q => q.id), started_at: new Date().toISOString(),
  }).select('id').single()
  if (error) return json({ error: error.message }, 500)
  return json({ attempt_id: attempt.id, quiz: { title: quiz.title, pass_score: quiz.pass_score, total: drawn.length, max_attempts: quiz.max_attempts },
    questions: drawn.map(forLearner) })
}

export async function POST(req) {
  const u = await me(req)
  if (!u) return json({ error: 'Unauthorized' }, 401)
  const { attempt_id, answers } = await req.json()
  const { data: attempt } = await admin.from('lms_kc_attempts').select('*').eq('id', attempt_id).eq('user_id', u.id).single()
  if (!attempt) return json({ error: 'Attempt not found' }, 404)
  if (attempt.submitted_at) return json({ error: 'This attempt was already submitted.' }, 409)
  const { data: quiz } = await admin.from('lms_kc_quizzes').select('*').eq('id', attempt.quiz_id).single()
  if ((await quizLock(u, quiz)).locked) return json({ error: 'Locked: review required before another attempt.', locked: true }, 403)

  const ids = attempt.drawn_ids || []
  const { data: qs } = await admin.from('lms_kc_questions').select('*').in('id', ids)
  const byId = Object.fromEntries((qs || []).map(q => [q.id, q]))
  let correct = 0
  const review = []
  for (const id of ids) {
    const q = byId[id]
    if (!q) continue
    const ok = isCorrect(q, answers?.[id])
    if (ok) correct++
    review.push({ prompt: q.prompt, is_correct: ok, explanation: q.explanation, objective: q.objective })
  }
  const total = ids.length
  const score = total ? Math.round((correct / total) * 100) : 0
  const passed = score >= (quiz.pass_score ?? 80)
  const { error } = await admin.from('lms_kc_attempts').update({ answers: answers || {}, score, passed, submitted_at: new Date().toISOString() }).eq('id', attempt.id)
  if (error) return json({ error: error.message }, 500)
  const lock = await quizLock(u, quiz)
  const missed = [...new Set(review.filter(r => !r.is_correct).map(r => r.objective).filter(Boolean))]
  return json({ score, correct, total, passed, pass_score: quiz.pass_score ?? 80, locked: !passed && lock.locked,
    attempts_left: quiz.max_attempts ? Math.max(quiz.max_attempts - lock.failedSinceReopen, 0) : null, missed_objectives: missed, review })
}

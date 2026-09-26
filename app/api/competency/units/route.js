// app/api/competency/units/route.js
// GET ?subject_id=  -> the competency and its ordered units with this learner's progress
// GET ?unit_id=     -> one unit for the player (scenario without answers, practice definition)
import { admin, me, json, loadUnit, unitStatus, publicScenario, pickScenario, pickPractice, pickQuizId, pickTitle, MANAGERS } from '../_lib'

export async function GET(req) {
  const u = await me(req)
  if (!u) return json({ error: 'Unauthorized' }, 401)
  const { searchParams } = new URL(req.url)
  const unitId = searchParams.get('unit_id')
  const subjectId = searchParams.get('subject_id')

  if (unitId) {
    const unit = await loadUnit(u, unitId)
    if (!unit) return json({ error: 'Unit not found' }, 404)
    return json({ lang: u.language || 'en', unit: { id: unit.id, subject_id: unit.subject_id, unit_order: unit.unit_order, title: pickTitle(u, unit), course_id: unit.course_id,
      quiz_id: pickQuizId(u, unit), revision: unit.revision, scenario: publicScenario(pickScenario(u, unit)), practice: pickPractice(u, unit) || null },
      status: await unitStatus(u, unit) })
  }

  if (!subjectId) return json({ error: 'subject_id or unit_id required' }, 400)
  const { data: subject } = await admin.from('lms_competency_subjects').select('id, title, description, title_es, description_es, validity_months, program_code, revision, controlled, active')
    .eq('id', subjectId).eq('company_id', u.company_id).single()
  if (!subject || !subject.active) return json({ error: 'Competency not found' }, 404)
  const { data: units } = await admin.from('lms_comp_units').select('*').eq('subject_id', subjectId).eq('company_id', u.company_id).order('unit_order')
  const out = []
  let prevComplete = true
  for (const unit of units || []) {
    const status = await unitStatus(u, unit)
    out.push({ id: unit.id, unit_order: unit.unit_order, title: pickTitle(u, unit), lesson: !!unit.course_id, status, open: prevComplete })
    prevComplete = prevComplete && status.complete
  }
  const es = u.language === 'es'
  const shown = { ...subject, title: es && subject.title_es ? subject.title_es : subject.title, description: es && subject.description_es ? subject.description_es : subject.description }
  return json({ lang: u.language || 'en', can_manage: MANAGERS.includes(u.role), subject: shown, units: out, all_complete: out.length > 0 && out.every(x => x.status.complete) })
}

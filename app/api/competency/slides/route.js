// app/api/competency/slides/route.js
// GET ?unit_id= -> the unit's narrated slides with signed image and audio links.
// Same buckets and signing as app/api/lms/learner/slides (same narration audio, same voice),
// but access is granted through the learner's company competency unit, not a course assignment.
import { admin, me, json, loadUnit } from '../_lib'

export async function GET(req) {
  const u = await me(req)
  if (!u) return json({ error: 'Unauthorized' }, 401)
  const unit = await loadUnit(u, new URL(req.url).searchParams.get('unit_id'))
  if (!unit?.course_id) return json({ error: 'No narrated course for this unit' }, 404)

  // Spanish learners get the Spanish twin of the narrated course (same course_group, language es) when it exists.
  let courseId = unit.course_id
  if (u.language === 'es') {
    const { data: en } = await admin.from('lms_courses').select('course_group').eq('id', unit.course_id).single()
    if (en?.course_group) {
      const { data: twin } = await admin.from('lms_courses').select('id').eq('course_group', en.course_group).eq('language', 'es').limit(1)
      if (twin?.[0]) courseId = twin[0].id
    }
  }
  const { data: slides, error } = await admin.from('lms_slides')
    .select('id, slide_order, image_path, speaker_notes, audio_path')
    .eq('course_id', courseId).order('slide_order')
  if (error) return json({ error: error.message }, 400)

  const out = await Promise.all((slides || []).map(async s => {
    const { data: img } = await admin.storage.from('lms-slides').createSignedUrl(s.image_path, 7200)
    let audio_url = null
    if (s.audio_path) {
      const key = s.audio_path.startsWith('lms-audio/') ? s.audio_path.slice('lms-audio/'.length) : s.audio_path
      const { data: aud } = await admin.storage.from('lms-audio').createSignedUrl(key, 7200)
      audio_url = aud?.signedUrl || null
    }
    return { id: s.id, slide_order: s.slide_order, image_url: img?.signedUrl || null, audio_url, transcript: s.speaker_notes || '' }
  }))
  return json({ slides: out })
}

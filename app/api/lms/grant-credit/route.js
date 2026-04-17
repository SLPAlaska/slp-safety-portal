// app/api/lms/grant-credit/route.js
//
// Grants course credit without requiring the learner to take the quiz.
// Creates lms_certificates + upserts lms_completions.
//
// Payload: { user_id, course_id, completed_at, grant_note? }
// Auth:    None at this layer — matches existing /api/lms/* pattern.
//
// NOTE: granted_by_admin_id is set to null until admin auth is wired up
//       at the /admin/lms route level (Session C TODO).

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function generateCertNumber() {
  const year = new Date().getFullYear()
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let suffix = ''
  for (let i = 0; i < 6; i++) suffix += chars[Math.floor(Math.random() * chars.length)]
  return `SLP-${year}-${suffix}`
}

export async function POST(request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  let body
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const { user_id, course_id, completed_at, grant_note } = body
  if (!user_id || !course_id) return NextResponse.json({ error: 'user_id and course_id are required' }, { status: 400 })

  const completedAtIso = completed_at ? new Date(completed_at).toISOString() : new Date().toISOString()
  if (isNaN(new Date(completedAtIso).getTime()))
    return NextResponse.json({ error: 'Invalid completed_at date' }, { status: 400 })

  const { data: targetUser, error: tuErr } = await supabaseAdmin
    .from('lms_users')
    .select('id, full_name, company_id, lms_companies(id, name)')
    .eq('id', user_id)
    .single()
  if (tuErr || !targetUser) return NextResponse.json({ error: 'Target user not found' }, { status: 404 })

  const { data: course, error: cErr } = await supabaseAdmin
    .from('lms_courses')
    .select('id, title, regulation_ref, completion_text, refresher_frequency_months')
    .eq('id', course_id)
    .single()
  if (cErr || !course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })

  const certNumber = generateCertNumber()
  const companyName = targetUser.lms_companies?.name || null

  let expiresAt = null
  if (course.refresher_frequency_months) {
    const exp = new Date(completedAtIso)
    exp.setMonth(exp.getMonth() + course.refresher_frequency_months)
    expiresAt = exp.toISOString()
  }

  const completionText = course.completion_text
    || `Has successfully completed the ${course.title} training course.`

  const { error: certErr } = await supabaseAdmin
    .from('lms_certificates')
    .insert({
      cert_number: certNumber,
      user_id: targetUser.id,
      course_id: course.id,
      quiz_attempt_id: null,
      full_name: targetUser.full_name,
      company_name: companyName,
      course_title: course.title,
      regulation_ref: course.regulation_ref,
      completion_text: completionText,
      score_achieved: null,
      issued_at: completedAtIso,
      expires_at: expiresAt,
    })
  if (certErr) return NextResponse.json({ error: 'Failed to create certificate: ' + certErr.message }, { status: 500 })

  const { data: existing } = await supabaseAdmin
    .from('lms_completions')
    .select('id')
    .eq('user_id', targetUser.id)
    .eq('course_id', course.id)
    .maybeSingle()

  if (existing) {
    const { error: upErr } = await supabaseAdmin
      .from('lms_completions')
      .update({
        certificate_id: certNumber,
        completed_at: completedAtIso,
        granted_by_admin_id: null, // TODO: wire up admin auth
        grant_note: grant_note || null,
      })
      .eq('id', existing.id)
    if (upErr) return NextResponse.json({ error: 'Failed to update completion: ' + upErr.message }, { status: 500 })
  } else {
    const { error: insErr } = await supabaseAdmin
      .from('lms_completions')
      .insert({
        user_id: targetUser.id,
        course_id: course.id,
        quiz_attempt_id: null,
        certificate_id: certNumber,
        completed_at: completedAtIso,
        granted_by_admin_id: null, // TODO: wire up admin auth
        grant_note: grant_note || null,
      })
    if (insErr) return NextResponse.json({ error: 'Failed to create completion: ' + insErr.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    cert_number: certNumber,
    completed_at: completedAtIso,
    expires_at: expiresAt,
    user: targetUser.full_name,
    course: course.title,
  })
}

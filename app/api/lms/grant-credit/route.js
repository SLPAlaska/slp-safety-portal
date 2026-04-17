// app/api/lms/grant-credit/route.js
//
// Grants course credit to a user WITHOUT requiring them to take the quiz.
// Creates an lms_certificates record AND upserts lms_completions.
// Tracks who granted credit via granted_by_admin_id.
//
// Auth modes:
//   - Super admin: can grant credit for any user, any company
//   - Company admin: can only grant credit for users in their own company
//
// Payload: { user_id, course_id, completed_at, grant_note? }
// ============================================================

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// ---- cert number generator (matches existing SLP-YYYY-XXXXXX format) ----
function generateCertNumber() {
  const year = new Date().getFullYear()
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no I/O/0/1 for readability
  let suffix = ''
  for (let i = 0; i < 6; i++) suffix += chars[Math.floor(Math.random() * chars.length)]
  return `SLP-${year}-${suffix}`
}

export async function POST(request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // ---- authenticate the caller ----
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Load caller's lms_users row
  const { data: caller } = await supabaseAdmin
    .from('lms_users')
    .select('id, role, company_id')
    .eq('auth_user_id', user.id)
    .single()

  if (!caller) return NextResponse.json({ error: 'User not found' }, { status: 403 })
  if (!['admin', 'company_admin'].includes(caller.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // ---- parse + validate payload ----
  let body
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const { user_id, course_id, completed_at, grant_note } = body
  if (!user_id || !course_id) return NextResponse.json({ error: 'user_id and course_id are required' }, { status: 400 })

  // Parse completed_at (default to now)
  const completedAtIso = completed_at ? new Date(completed_at).toISOString() : new Date().toISOString()
  if (isNaN(new Date(completedAtIso).getTime()))
    return NextResponse.json({ error: 'Invalid completed_at date' }, { status: 400 })

  // ---- load target user + course + company ----
  const { data: targetUser, error: tuErr } = await supabaseAdmin
    .from('lms_users')
    .select('id, full_name, company_id, lms_companies(id, name)')
    .eq('id', user_id)
    .single()
  if (tuErr || !targetUser) return NextResponse.json({ error: 'Target user not found' }, { status: 404 })

  // Company admin scope check
  if (caller.role === 'company_admin' && targetUser.company_id !== caller.company_id)
    return NextResponse.json({ error: 'Cannot grant credit to users outside your company' }, { status: 403 })

  const { data: course, error: cErr } = await supabaseAdmin
    .from('lms_courses')
    .select('id, title, regulation_ref, completion_text, refresher_frequency_months')
    .eq('id', course_id)
    .single()
  if (cErr || !course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })

  // ---- build certificate record ----
  const certNumber = generateCertNumber()
  const companyName = targetUser.lms_companies?.name || null

  // Compute expires_at from completed_at + refresher_frequency_months (if set)
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
      score_achieved: null, // no quiz taken
      issued_at: completedAtIso,
      expires_at: expiresAt,
    })
  if (certErr) return NextResponse.json({ error: 'Failed to create certificate: ' + certErr.message }, { status: 500 })

  // ---- upsert lms_completions (unique on user_id+course_id) ----
  // If a completion already exists, UPDATE it. Otherwise INSERT.
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
        granted_by_admin_id: caller.id,
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
        granted_by_admin_id: caller.id,
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

// app/api/lms/learner/quiz/route.js
//
// Quiz submission route — HARDENED.
// Every insert is error-checked, logged with a [QUIZ-SUBMIT] tag for Vercel
// log filtering, and surfaced to the client. No silent failures.
//
// Failure behavior:
//   - Attempt insert fails        -> 500 with the real error message
//   - Certificate insert fails    -> learner still sees their pass, but the
//                                    response carries certificate_error and
//                                    the full error is in the Vercel logs
//   - Completion insert fails     -> same: pass preserved, error surfaced
//   - Cert number collision       -> retried up to 3 times with fresh numbers

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function generateCertNumber() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const year = new Date().getFullYear()
  let suffix = ''
  for (let i = 0; i < 6; i++) suffix += chars[Math.floor(Math.random() * chars.length)]
  return 'SLP-' + year + '-' + suffix
}

async function insertCertificateWithRetry(supabaseAdmin, payloadBase) {
  let lastError = null
  for (let tryNum = 1; tryNum <= 3; tryNum++) {
    const certNum = generateCertNumber()
    const { data: cert, error: certErr } = await supabaseAdmin
      .from('lms_certificates')
      .insert({ ...payloadBase, cert_number: certNum })
      .select()
      .single()

    if (!certErr && cert) return { cert, error: null }

    lastError = certErr
    console.error(
      '[QUIZ-SUBMIT] Certificate insert failed (try ' + tryNum + '/3)',
      'cert_number=' + certNum,
      'user_id=' + payloadBase.user_id,
      'course_id=' + payloadBase.course_id,
      'code=' + (certErr && certErr.code),
      'message=' + (certErr && certErr.message),
      'details=' + (certErr && certErr.details),
      'hint=' + (certErr && certErr.hint)
    )

    // Only a duplicate cert_number (23505) is worth retrying with a new number.
    if (!certErr || certErr.code !== '23505') break
  }
  return { cert: null, error: lastError }
}

export async function POST(request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const authHeader = request.headers.get('authorization')
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token)
  if (authErr || !user) {
    if (authErr) console.error('[QUIZ-SUBMIT] Auth error:', authErr.message)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: lmsUser, error: lmsUserErr } = await supabaseAdmin
    .from('lms_users')
    .select('id, full_name, job_title, lms_companies(name)')
    .eq('auth_user_id', user.id)
    .single()
  if (lmsUserErr || !lmsUser) {
    if (lmsUserErr) console.error('[QUIZ-SUBMIT] lms_users lookup error:', lmsUserErr.message)
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  let body
  try {
    body = await request.json()
  } catch (e) {
    console.error('[QUIZ-SUBMIT] Bad request body:', e.message)
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }
  const { course_id, answers } = body
  if (!course_id || !answers) return NextResponse.json({ error: 'Missing fields.' }, { status: 400 })

  const { data: course, error: courseErr } = await supabaseAdmin
    .from('lms_courses')
    .select('pass_score, max_quiz_attempts, title, completion_text, regulation_ref')
    .eq('id', course_id)
    .single()
  if (courseErr || !course) {
    if (courseErr) console.error('[QUIZ-SUBMIT] Course lookup error:', course_id, courseErr.message)
    return NextResponse.json({ error: 'Course not found.' }, { status: 404 })
  }

  if (course.max_quiz_attempts > 0) {
    const { count, error: countErr } = await supabaseAdmin
      .from('lms_quiz_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', lmsUser.id)
      .eq('course_id', course_id)
    if (countErr) {
      console.error('[QUIZ-SUBMIT] Attempt count error:', countErr.message)
      return NextResponse.json({ error: 'Failed to check attempt count: ' + countErr.message }, { status: 500 })
    }
    if (count >= course.max_quiz_attempts)
      return NextResponse.json({ error: 'Maximum quiz attempts reached.' }, { status: 400 })
  }

  const questionIds = Object.keys(answers)
  const { data: questions, error: questionsErr } = await supabaseAdmin
    .from('lms_quiz_questions')
    .select('id, correct_answer')
    .in('id', questionIds)
  if (questionsErr) {
    console.error('[QUIZ-SUBMIT] Questions fetch error:', questionsErr.message)
    return NextResponse.json({ error: 'Failed to grade quiz: ' + questionsErr.message }, { status: 500 })
  }

  let correct = 0
  const total = questions?.length || 0
  questions?.forEach(q => { if (answers[q.id] === q.correct_answer) correct++ })
  const score = total > 0 ? Math.round((correct / total) * 100) : 0
  const passed = score >= course.pass_score

  const { data: attempt, error: attemptErr } = await supabaseAdmin
    .from('lms_quiz_attempts')
    .insert({ user_id: lmsUser.id, course_id, score, passed, answers })
    .select()
    .single()
  if (attemptErr || !attempt) {
    console.error(
      '[QUIZ-SUBMIT] Attempt insert failed',
      'user_id=' + lmsUser.id,
      'course_id=' + course_id,
      'code=' + (attemptErr && attemptErr.code),
      'message=' + (attemptErr && attemptErr.message),
      'details=' + (attemptErr && attemptErr.details)
    )
    return NextResponse.json(
      { error: 'Failed to record quiz attempt: ' + (attemptErr ? attemptErr.message : 'no row returned') },
      { status: 500 }
    )
  }

  let certNumber = null
  let certificateError = null
  let completionError = null

  if (passed) {
    const { data: existing, error: existingErr } = await supabaseAdmin
      .from('lms_completions')
      .select('id, certificate_id')
      .eq('user_id', lmsUser.id)
      .eq('course_id', course_id)
      .maybeSingle()
    if (existingErr) {
      console.error('[QUIZ-SUBMIT] Existing completion check error:', existingErr.message)
    }

    const completionText = course.completion_text ||
      'Has successfully completed the ' + course.title + ' training course' +
      (course.regulation_ref ? ' in accordance with ' + course.regulation_ref : '') + '.'

    const expiresAt = new Date()
    expiresAt.setFullYear(expiresAt.getFullYear() + 3)

    const certPayloadBase = {
      user_id: lmsUser.id,
      course_id,
      quiz_attempt_id: attempt.id,
      full_name: lmsUser.full_name,
      company_name: lmsUser.lms_companies?.name || null,
      job_title: lmsUser.job_title || null,
      course_title: course.title,
      regulation_ref: course.regulation_ref || null,
      completion_text: completionText,
      score_achieved: score,
      expires_at: expiresAt.toISOString(),
    }

    if (!existing) {
      const { cert, error: certErr } = await insertCertificateWithRetry(supabaseAdmin, certPayloadBase)

      if (cert) {
        const { error: compErr } = await supabaseAdmin
          .from('lms_completions')
          .insert({ user_id: lmsUser.id, course_id, quiz_attempt_id: attempt.id, certificate_id: cert.cert_number })
        if (compErr) {
          completionError = compErr.message
          console.error(
            '[QUIZ-SUBMIT] Completion insert failed AFTER cert created',
            'cert_number=' + cert.cert_number,
            'user_id=' + lmsUser.id,
            'course_id=' + course_id,
            'code=' + compErr.code,
            'message=' + compErr.message,
            'details=' + compErr.details
          )
        }
        certNumber = cert.cert_number
      } else {
        certificateError = certErr ? certErr.message : 'certificate insert returned no row'
      }
    } else {
      certNumber = existing.certificate_id || null

      if (!certNumber) {
        const { cert, error: certErr } = await insertCertificateWithRetry(supabaseAdmin, certPayloadBase)

        if (cert) {
          const { error: upErr } = await supabaseAdmin
            .from('lms_completions')
            .update({ certificate_id: cert.cert_number })
            .eq('id', existing.id)
          if (upErr) {
            completionError = upErr.message
            console.error(
              '[QUIZ-SUBMIT] Completion cert-backfill update failed',
              'completion_id=' + existing.id,
              'cert_number=' + cert.cert_number,
              'message=' + upErr.message
            )
          }
          certNumber = cert.cert_number
        } else {
          certificateError = certErr ? certErr.message : 'certificate insert returned no row'
        }
      }
    }
  }

  if (passed && (certificateError || completionError)) {
    console.error(
      '[QUIZ-SUBMIT] PASS RECORDED BUT CREDIT INCOMPLETE',
      'user=' + lmsUser.full_name,
      'course=' + course.title,
      'attempt=' + attempt.id,
      'certificate_error=' + certificateError,
      'completion_error=' + completionError
    )
  }

  return NextResponse.json({
    score, passed, correct, total,
    certificate_id: certNumber,
    attempt_id: attempt.id,
    ...(certificateError ? { certificate_error: certificateError } : {}),
    ...(completionError ? { completion_error: completionError } : {}),
  })
}

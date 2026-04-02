export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const authHeader = request.headers.get('authorization')
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const token = authHeader.replace('Bearer ', '')
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const courseId = searchParams.get('course_id')
  if (!courseId) return NextResponse.json({ error: 'Missing course_id' }, { status: 400 })

  const { data: allQuestions } = await supabaseAdmin
    .from('lms_quiz_questions')
    .select('id, question_order, question_text, option_a, option_b, option_c, option_d, correct_answer, slide_reference, is_ai_generated, always_include')
    .eq('course_id', courseId)
    .order('question_order')

  if (!allQuestions?.length) return NextResponse.json({ questions: [] })

  const alwaysInclude = allQuestions.filter(q => !q.is_ai_generated || q.always_include)
  const aiBank = allQuestions.filter(q => q.is_ai_generated && !q.always_include)

  const TARGET_QUESTIONS = Math.min(15, allQuestions.length)
  const manualCount = alwaysInclude.length
  const aiNeeded = Math.max(0, TARGET_QUESTIONS - manualCount)

  const shuffled = [...aiBank].sort(() => Math.random() - 0.5)
  const selectedAI = shuffled.slice(0, aiNeeded)

  const finalQuestions = [...alwaysInclude, ...selectedAI]
    .sort(() => Math.random() - 0.5)
    .map((q, idx) => ({ ...q, question_order: idx + 1 }))

  return NextResponse.json({ questions: finalQuestions })
}

function generateCertNumber() {
  const year = new Date().getFullYear()
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let suffix = ''
  for (let i = 0; i < 6; i++) suffix += chars[Math.floor(Math.random() * chars.length)]
  return 'SLP-' + year + '-' + suffix
}

export async function POST(request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const authHeader = request.headers.get('authorization')
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const token = authHeader.replace('Bearer ', '')
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: lmsUser } = await supabaseAdmin
    .from('lms_users')
    .select('id, full_name, job_title, lms_companies(name)')
    .eq('auth_user_id', user.id)
    .single()
  if (!lmsUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { course_id, answers } = await request.json()
  if (!course_id || !answers) return NextResponse.json({ error: 'Missing fields.' }, { status: 400 })

  const { data: course } = await supabaseAdmin
    .from('lms_courses')
    .select('pass_score, max_quiz_attempts, title, completion_text, regulation_ref')
    .eq('id', course_id)
    .single()

  if (!course) return NextResponse.json({ error: 'Course not found.' }, { status: 404 })

  if (course.max_quiz_attempts > 0) {
    const { count } = await supabaseAdmin
      .from('lms_quiz_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', lmsUser.id)
      .eq('course_id', course_id)
    if (count >= course.max_quiz_attempts)
      return NextResponse.json({ error: 'Maximum quiz attempts reached.' }, { status: 400 })
  }

  const questionIds = Object.keys(answers)
  const { data: questions } = await supabaseAdmin
    .from('lms_quiz_questions')
    .select('id, correct_answer')
    .in('id', questionIds)

  let correct = 0
  const total = questions?.length || 0
  questions?.forEach(q => { if (answers[q.id] === q.correct_answer) correct++ })
  const score = total > 0 ? Math.round((correct / total) * 100) : 0
  const passed = score >= course.pass_score

  const { data: attempt } = await supabaseAdmin
    .from('lms_quiz_attempts')
    .insert({ user_id: lmsUser.id, course_id, score, passed, answers })
    .select().single()

  let certNumber = null

  if (passed) {
    const { data: existing } = await supabaseAdmin
      .from('lms_completions')
      .select('id, certificate_id, lms_certificates(cert_number)')
      .eq('user_id', lmsUser.id)
      .eq('course_id', course_id)
      .maybeSingle()

    if (!existing) {
      // Generate certificate
      const certNum = generateCertNumber()
      const expiresAt = new Date()
      expiresAt.setFullYear(expiresAt.getFullYear() + 3)

      const completionText = course.completion_text ||
        'Has successfully completed the ' + course.title + ' training course' +
        (course.regulation_ref ? ' in accordance with ' + course.regulation_ref : '') + '.'

      const { data: cert } = await supabaseAdmin
        .from('lms_certificates')
        .insert({
          cert_number: certNum,
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
        })
        .select().single()

      if (cert) {
        await supabaseAdmin
          .from('lms_completions')
          .insert({ user_id: lmsUser.id, course_id, quiz_attempt_id: attempt.id, certificate_id: cert.id })
        certNumber = cert.cert_number
      }
    } else {
      // Return existing cert number
      certNumber = existing.lms_certificates?.cert_number || null

      // If existing completion has no cert, generate one now
      if (!certNumber) {
        const certNum = generateCertNumber()
        const expiresAt = new Date()
        expiresAt.setFullYear(expiresAt.getFullYear() + 3)
        const completionText = course.completion_text ||
          'Has successfully completed the ' + course.title + ' training course' +
          (course.regulation_ref ? ' in accordance with ' + course.regulation_ref : '') + '.'
        const { data: cert } = await supabaseAdmin
          .from('lms_certificates')
          .insert({
            cert_number: certNum,
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
          })
          .select().single()
        if (cert) {
          await supabaseAdmin
            .from('lms_completions')
            .update({ certificate_id: cert.id })
            .eq('id', existing.id)
          certNumber = cert.cert_number
        }
      }
    }
  }

  return NextResponse.json({
    score, passed, correct, total,
    certificate_id: certNumber,
    attempt_id: attempt.id,
  })
}

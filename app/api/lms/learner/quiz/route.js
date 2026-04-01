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

  // Get course pass score and question count config
  const { data: course } = await supabaseAdmin
    .from('lms_courses')
    .select('pass_score, max_quiz_attempts')
    .eq('id', courseId)
    .single()

  // Get ALL questions for this course
  const { data: allQuestions } = await supabaseAdmin
    .from('lms_quiz_questions')
    .select('id, question_order, question_text, option_a, option_b, option_c, option_d, correct_answer, slide_reference, is_ai_generated, always_include')
    .eq('course_id', courseId)
    .order('question_order')

  if (!allQuestions?.length) return NextResponse.json({ questions: [] })

  // Separate always-include (manually added) from AI question bank
  const alwaysInclude = allQuestions.filter(q => !q.is_ai_generated || q.always_include)
  const aiBank = allQuestions.filter(q => q.is_ai_generated && !q.always_include)

  // Target 10-15 questions per quiz — always include manual ones, randomly sample from AI bank
  const TARGET_QUESTIONS = Math.min(15, allQuestions.length)
  const manualCount = alwaysInclude.length
  const aiNeeded = Math.max(0, TARGET_QUESTIONS - manualCount)

  // Randomly sample from AI bank — shuffle and take what we need
  const shuffled = [...aiBank].sort(() => Math.random() - 0.5)
  const selectedAI = shuffled.slice(0, aiNeeded)

  // Combine and shuffle final set
  const finalQuestions = [...alwaysInclude, ...selectedAI]
    .sort(() => Math.random() - 0.5)
    .map((q, idx) => ({ ...q, question_order: idx + 1 }))

  return NextResponse.json({ questions: finalQuestions })
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
    .from('lms_users').select('id, full_name').eq('auth_user_id', user.id).single()
  if (!lmsUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { course_id, answers } = await request.json()
  if (!course_id || !answers) return NextResponse.json({ error: 'Missing fields.' }, { status: 400 })

  const { data: course } = await supabaseAdmin
    .from('lms_courses')
    .select('pass_score, max_quiz_attempts, title, completion_text, regulation_ref')
    .eq('id', course_id)
    .single()

  if (!course) return NextResponse.json({ error: 'Course not found.' }, { status: 404 })

  // Check max attempts
  if (course.max_quiz_attempts > 0) {
    const { count } = await supabaseAdmin
      .from('lms_quiz_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', lmsUser.id)
      .eq('course_id', course_id)
    if (count >= course.max_quiz_attempts)
      return NextResponse.json({ error: 'Maximum quiz attempts reached.' }, { status: 400 })
  }

  // Grade only the questions that were answered
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

  // Record attempt
  const { data: attempt } = await supabaseAdmin
    .from('lms_quiz_attempts')
    .insert({ user_id: lmsUser.id, course_id, score, passed, answers })
    .select().single()

  // Record completion if passed
  let completion = null
  if (passed) {
    const { data: existing } = await supabaseAdmin
      .from('lms_completions')
      .select('id, certificate_id')
      .eq('user_id', lmsUser.id)
      .eq('course_id', course_id)
      .maybeSingle()

    if (!existing) {
      const { data: newCompletion } = await supabaseAdmin
        .from('lms_completions')
        .insert({ user_id: lmsUser.id, course_id, quiz_attempt_id: attempt.id })
        .select().single()
      completion = newCompletion
    } else {
      completion = existing
    }
  }

  return NextResponse.json({
    score, passed, correct, total,
    certificate_id: completion?.certificate_id || null,
    attempt_id: attempt.id,
  })
}

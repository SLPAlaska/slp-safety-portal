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

  const { data: questions, error } = await supabaseAdmin
    .from('lms_quiz_questions')
    .select('id, question_order, question_text, option_a, option_b, option_c, option_d, correct_answer, slide_reference')
    .eq('course_id', courseId)
    .order('question_order')

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ questions: questions || [] })
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
    .select('id, full_name')
    .eq('auth_user_id', user.id)
    .single()
  if (!lmsUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { course_id, answers } = await request.json()
  if (!course_id || !answers) return NextResponse.json({ error: 'Missing fields.' }, { status: 400 })

  // Check max attempts
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
    if (count >= course.max_quiz_attempts) {
      return NextResponse.json({ error: 'Maximum quiz attempts reached.' }, { status: 400 })
    }
  }

  // Fetch correct answers
  const { data: questions } = await supabaseAdmin
    .from('lms_quiz_questions')
    .select('id, correct_answer')
    .eq('course_id', course_id)

  // Grade
  let correct = 0
  const total = questions.length
  questions.forEach(q => {
    if (answers[q.id] === q.correct_answer) correct++
  })
  const score = total > 0 ? Math.round((correct / total) * 100) : 0
  const passed = score >= course.pass_score

  // Record attempt
  const { data: attempt } = await supabaseAdmin
    .from('lms_quiz_attempts')
    .insert({
      user_id: lmsUser.id,
      course_id,
      score,
      passed,
      answers,
    })
    .select()
    .single()

  // If passed — record completion and generate certificate ID
  let completion = null
  if (passed) {
    const { data: existingCompletion } = await supabaseAdmin
      .from('lms_completions')
      .select('id, certificate_id')
      .eq('user_id', lmsUser.id)
      .eq('course_id', course_id)
      .maybeSingle()

    if (!existingCompletion) {
      const { data: newCompletion } = await supabaseAdmin
        .from('lms_completions')
        .insert({
          user_id: lmsUser.id,
          course_id,
          quiz_attempt_id: attempt.id,
        })
        .select()
        .single()
      completion = newCompletion
    } else {
      completion = existingCompletion
    }
  }

  return NextResponse.json({
    score,
    passed,
    correct,
    total,
    certificate_id: completion?.certificate_id || null,
    attempt_id: attempt.id,
  })
}

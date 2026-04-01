import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  const { searchParams } = new URL(request.url)
  const course_id = searchParams.get('course_id')
  if (!course_id) return NextResponse.json({ error: 'Missing course_id.' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('lms_quiz_questions')
    .select('*')
    .eq('course_id', course_id)
    .order('question_order')

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ questions: data || [] })
}

export async function POST(request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  try {
    const { course_id, question_text, option_a, option_b, option_c, option_d, correct_answer, slide_reference, question_order } = await request.json()

    if (!course_id || !question_text || !option_a || !option_b || !correct_answer)
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })

    if (!['A','B','C','D'].includes(correct_answer))
      return NextResponse.json({ error: 'correct_answer must be A, B, C, or D.' }, { status: 400 })

    // Auto-assign order if not provided
    let order = question_order
    if (!order) {
      const { count } = await supabaseAdmin
        .from('lms_quiz_questions')
        .select('id', { count: 'exact', head: true })
        .eq('course_id', course_id)
      order = (count || 0) + 1
    }

    const { data, error } = await supabaseAdmin
      .from('lms_quiz_questions')
      .insert({
        course_id,
        question_text: question_text.trim(),
        option_a: option_a.trim(),
        option_b: option_b.trim(),
        option_c: option_c?.trim() || null,
        option_d: option_d?.trim() || null,
        correct_answer,
        slide_reference: slide_reference || null,
        question_order: order,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ question: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}

export async function PATCH(request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  try {
    const { id, question_text, option_a, option_b, option_c, option_d, correct_answer, slide_reference, question_order } = await request.json()
    if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 })

    const { data, error } = await supabaseAdmin
      .from('lms_quiz_questions')
      .update({
        question_text: question_text?.trim(),
        option_a: option_a?.trim(),
        option_b: option_b?.trim(),
        option_c: option_c?.trim() || null,
        option_d: option_d?.trim() || null,
        correct_answer,
        slide_reference: slide_reference || null,
        question_order,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ question: data })
  } catch {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}

export async function DELETE(request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  try {
    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 })
    const { error } = await supabaseAdmin.from('lms_quiz_questions').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}

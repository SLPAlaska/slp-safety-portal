import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  try {
    const { title, description, completion_text, regulation_ref, pass_score, max_quiz_attempts } = await request.json()
    if (!title) return NextResponse.json({ error: 'Course title is required.' }, { status: 400 })
    const { data: course, error } = await supabaseAdmin
      .from('lms_courses')
      .insert({
        title: title.trim(),
        description: description?.trim() || null,
        completion_text: completion_text?.trim() || null,
        regulation_ref: regulation_ref?.trim() || null,
        pass_score: pass_score || 80,
        max_quiz_attempts: max_quiz_attempts || 0,
        active: true,
      })
      .select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ course }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  const { data, error } = await supabaseAdmin
    .from('lms_individual_assignments')
    .select('*, lms_users(full_name, email, lms_companies(name)), lms_courses(title)')
    .order('assigned_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ assignments: data })
}

export async function POST(request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  try {
    const { user_id, course_id, due_date } = await request.json()
    if (!user_id || !course_id)
      return NextResponse.json({ error: 'User and course are required.' }, { status: 400 })
    const { data, error } = await supabaseAdmin
      .from('lms_individual_assignments')
      .insert({ user_id, course_id, due_date: due_date || null })
      .select('*, lms_users(full_name, email, lms_companies(name)), lms_courses(title)')
      .single()
    if (error) {
      const msg = error.message.includes('unique')
        ? 'This course is already assigned to that user.'
        : error.message
      return NextResponse.json({ error: msg }, { status: 400 })
    }
    return NextResponse.json({ assignment: data }, { status: 201 })
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
    const { error } = await supabaseAdmin
      .from('lms_individual_assignments')
      .delete()
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}

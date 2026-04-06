import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

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
    .select('id')
    .eq('auth_user_id', user.id)
    .single()
  if (!lmsUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const body = await request.json()
  const { action, course_id, session_id, slides_viewed, slide_id, time_spent_seconds, completed } = body

  // Slide progress (no action field)
  if (slide_id) {
    const { error } = await supabaseAdmin
      .from('lms_progress')
      .upsert({
        user_id: lmsUser.id,
        course_id,
        slide_id,
        time_spent_seconds: time_spent_seconds || 0,
        completed: completed || false,
        last_viewed: new Date().toISOString(),
      }, { onConflict: 'user_id,slide_id' })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  }

  // Session start
  if (action === 'start') {
    const { data, error } = await supabaseAdmin
      .from('lms_session_time')
      .insert({
        user_id: lmsUser.id,
        course_id,
        session_start: new Date().toISOString(),
        slides_viewed: 0,
      })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ session: data })
  }

  // Session end
  if (action === 'end') {
    const now = new Date()
    const { data: session } = await supabaseAdmin
      .from('lms_session_time')
      .select('session_start')
      .eq('id', session_id)
      .single()
    const duration = session
      ? Math.round((now - new Date(session.session_start)) / 1000)
      : 0
    const { error } = await supabaseAdmin
      .from('lms_session_time')
      .update({
        session_end: now.toISOString(),
        duration_seconds: duration,
        slides_viewed: slides_viewed || 0,
      })
      .eq('id', session_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true, duration_seconds: duration })
  }

  return NextResponse.json({ error: 'Invalid action.' }, { status: 400 })
}

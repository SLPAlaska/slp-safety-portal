export const maxDuration = 30
export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  try {
    const { course_id, mode } = await request.json()
    if (!course_id || !mode)
      return NextResponse.json({ error: 'Missing course_id or mode.' }, { status: 400 })

    const { count } = await supabaseAdmin
      .from('lms_slides')
      .select('id', { count: 'exact', head: true })
      .eq('course_id', course_id)

    if (!count || count === 0)
      return NextResponse.json({ error: 'No slides found.' }, { status: 404 })

    // Controlled-course lock: authored narration on competency courses must never be regenerated.
    // Add narration (audio) is still allowed.
    const { data: course } = await supabaseAdmin
      .from('lms_courses')
      .select('controlled')
      .eq('id', course_id)
      .single()
    if (course?.controlled && mode !== 'audio')
      return NextResponse.json({ error: 'Controlled course: the authored narration cannot be regenerated. Use Add narration only.' }, { status: 403 })

    const { data: job } = await supabaseAdmin
      .from('lms_ai_jobs')
      .insert({ course_id, mode, status: 'pending', progress: 0, total_slides: count })
      .select().single()

    if (!job)
      return NextResponse.json({ error: 'Failed to create job.' }, { status: 500 })

    // Fire and forget -- do NOT await, return immediately
    const edgeUrl = process.env.NEXT_PUBLIC_SUPABASE_URL + '/functions/v1/process-ai-job'
    await fetch(edgeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ job_id: job.id, slide_index: 0 })
    }).catch(err => console.error('Edge trigger error:', err))

    return NextResponse.json({ job_id: job.id, total_slides: count })

  } catch (err) {
    return NextResponse.json({ error: 'Server error: ' + err.message }, { status: 500 })
  }
}

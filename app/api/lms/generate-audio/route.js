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
    const { course_id } = await request.json()
    if (!course_id)
      return NextResponse.json({ error: 'Missing course_id.' }, { status: 400 })

    const { count } = await supabaseAdmin
      .from('lms_slides')
      .select('id', { count: 'exact', head: true })
      .eq('course_id', course_id)
      .not('speaker_notes', 'is', null)
      .neq('speaker_notes', '')

    if (!count || count === 0)
      return NextResponse.json({ error: 'No slides with speaker notes found.' }, { status: 404 })

    const { data: job } = await supabaseAdmin
      .from('lms_ai_jobs')
      .insert({ course_id, mode: 'audio', status: 'pending', progress: 0, total_slides: count })
      .select().single()

    if (!job)
      return NextResponse.json({ error: 'Failed to create job.' }, { status: 500 })

    // Fire and forget -- do NOT await, return immediately
    const edgeUrl = process.env.NEXT_PUBLIC_SUPABASE_URL + '/functions/v1/process-audio-job'
    fetch(edgeUrl, {
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

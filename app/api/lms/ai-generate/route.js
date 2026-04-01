export const maxDuration = 60
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

    // Verify slides exist
    const { count } = await supabaseAdmin
      .from('lms_slides')
      .select('id', { count: 'exact', head: true })
      .eq('course_id', course_id)

    if (!count || count === 0)
      return NextResponse.json({ error: 'No slides found for this course.' }, { status: 404 })

    // Create job record
    const { data: job, error: jobError } = await supabaseAdmin
      .from('lms_ai_jobs')
      .insert({ course_id, mode, status: 'pending', progress: 0, total_slides: count })
      .select().single()

    if (jobError || !job)
      return NextResponse.json({ error: 'Failed to create job.' }, { status: 500 })

    // Trigger Edge Function asynchronously — fire and forget
    const edgeUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/process-ai-job`
    fetch(edgeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ job_id: job.id }),
    }).catch(err => console.error('Edge function trigger error:', err))

    // Return immediately with job_id — client will poll for progress
    return NextResponse.json({
      job_id: job.id,
      total_slides: count,
      status: 'pending',
    })

  } catch (err) {
    return NextResponse.json({ error: 'Server error: ' + err.message }, { status: 500 })
  }
}

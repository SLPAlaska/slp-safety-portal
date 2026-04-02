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

    const { data: job } = await supabaseAdmin
      .from('lms_ai_jobs')
      .insert({ course_id, mode, status: 'pending', progress: 0, total_slides: count })
      .select().single()

    if (!job)
      return NextResponse.json({ error: 'Failed to create job.' }, { status: 500 })

    // Return immediately -- frontend connects directly to Edge Function via SSE
    // Edge Function handles all slide processing with no timeout limit
    return NextResponse.json({ job_id: job.id, total_slides: count })

  } catch (err) {
    return NextResponse.json({ error: 'Server error: ' + err.message }, { status: 500 })
  }
}

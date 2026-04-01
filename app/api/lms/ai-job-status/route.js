export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { searchParams } = new URL(request.url)
  const job_id = searchParams.get('job_id')
  if (!job_id) return NextResponse.json({ error: 'Missing job_id' }, { status: 400 })

  const { data: job, error } = await supabaseAdmin
    .from('lms_ai_jobs')
    .select('*')
    .eq('id', job_id)
    .single()

  if (error || !job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  return NextResponse.json({
    job_id: job.id,
    status: job.status,
    progress: job.progress,
    total_slides: job.total_slides,
    error_message: job.error_message,
    percent: job.total_slides > 0 ? Math.round((job.progress / job.total_slides) * 100) : 0,
  })
}

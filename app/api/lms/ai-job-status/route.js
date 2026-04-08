// app/api/lms/ai-job-status/route.js
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(req) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { searchParams } = new URL(req.url)
  const job_id = searchParams.get('job_id')

  if (!job_id) {
    return NextResponse.json({ error: 'job_id required' }, { status: 400 })
  }

  const { data: job, error } = await supabaseAdmin
    .from('lms_ai_jobs')
    .select('*')
    .eq('id', job_id)
    .single()

  if (error || !job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  // Count slides with notes (or audio) to derive real-time progress
  const { count: slidesWithNotes } = await supabaseAdmin
    .from('lms_slides')
    .select('id', { count: 'exact', head: true })
    .eq('course_id', job.course_id)
    .not('speaker_notes', 'is', null)
    .neq('speaker_notes', '')

  const { count: totalSlides } = await supabaseAdmin
    .from('lms_slides')
    .select('id', { count: 'exact', head: true })
    .eq('course_id', job.course_id)

  const { count: slidesWithAudio } = await supabaseAdmin
    .from('lms_slides')
    .select('id', { count: 'exact', head: true })
    .eq('course_id', job.course_id)
    .not('audio_path', 'is', null)

  // For audio jobs use audio count, for AI jobs use notes count
  const isAudioJob = job.job_type === 'audio' ||
    (job.metadata && JSON.stringify(job.metadata).includes('audio'))

  const processed = isAudioJob ? (slidesWithAudio || 0) : (slidesWithNotes || 0)
  const total = totalSlides || 0
  const percent = total > 0 ? Math.round((processed / total) * 100) : 0

  return NextResponse.json({
    ...job,
    progress: processed,
    total_slides: total,
    percent,
    slides_processed: processed,
  })
}

export const maxDuration = 300
export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { NextResponse, after } from 'next/server'

const ELEVENLABS_VOICE_ID = 'q0IMILNRPxOgtBTS4taI'
const ELEVENLABS_MODEL = 'eleven_multilingual_v2'

async function processAudio(supabaseAdmin, job, course_id) {
  const { data: slides } = await supabaseAdmin
    .from('lms_slides')
    .select('id, slide_order, speaker_notes, audio_path, course_id')
    .eq('course_id', course_id)
    .not('speaker_notes', 'is', null)
    .neq('speaker_notes', '')
    .order('slide_order')

  let processed = 0
  let generated = 0
  let skipped = 0

  for (const slide of slides || []) {
    if (slide.audio_path) {
      skipped++
      processed++
      await supabaseAdmin.from('lms_ai_jobs')
        .update({ progress: processed, updated_at: new Date().toISOString() })
        .eq('id', job.id)
      continue
    }

    try {
      const text = slide.speaker_notes.replace(/([0-9]+)\.([0-9]+)/g, '$1 dot $2')

      const ttsRes = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + ELEVENLABS_VOICE_ID, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text,
          model_id: ELEVENLABS_MODEL,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.3,
            use_speaker_boost: true,
          }
        })
      })

      if (!ttsRes.ok) {
        console.error('ElevenLabs error slide ' + slide.slide_order + ':', ttsRes.status, await ttsRes.text())
        processed++
        await supabaseAdmin.from('lms_ai_jobs')
          .update({ progress: processed, updated_at: new Date().toISOString() })
          .eq('id', job.id)
        continue
      }

      const audioBuffer = await ttsRes.arrayBuffer()
      const audioPath = slide.course_id + '/' + String(slide.slide_order).padStart(3, '0') + '.mp3'

      const { error: uploadError } = await supabaseAdmin.storage
        .from('lms-audio')
        .upload(audioPath, audioBuffer, { contentType: 'audio/mpeg', upsert: true })

      if (!uploadError) {
        await supabaseAdmin.from('lms_slides').update({ audio_path: audioPath }).eq('id', slide.id)
        generated++
      } else {
        console.error('Upload error slide ' + slide.slide_order + ':', uploadError.message)
      }

    } catch (err) {
      console.error('Slide ' + slide.slide_order + ' error:', err.message)
    }

    processed++
    await supabaseAdmin.from('lms_ai_jobs')
      .update({ progress: processed, updated_at: new Date().toISOString() })
      .eq('id', job.id)
  }

  await supabaseAdmin.from('lms_ai_jobs')
    .update({ status: 'complete', progress: processed, updated_at: new Date().toISOString() })
    .eq('id', job.id)
}

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
      .insert({ course_id, mode: 'audio', status: 'running', progress: 0, total_slides: count })
      .select().single()

    if (!job)
      return NextResponse.json({ error: 'Failed to create job.' }, { status: 500 })

    after(async () => {
      try {
        await processAudio(supabaseAdmin, job, course_id)
      } catch (err) {
        console.error('Audio processing error:', err.message)
        await supabaseAdmin.from('lms_ai_jobs')
          .update({ status: 'failed', error_message: err.message, updated_at: new Date().toISOString() })
          .eq('id', job.id)
      }
    })

    return NextResponse.json({ job_id: job.id, total_slides: count })

  } catch (err) {
    return NextResponse.json({ error: 'Server error: ' + err.message }, { status: 500 })
  }
}

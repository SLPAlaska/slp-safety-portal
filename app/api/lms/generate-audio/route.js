export const maxDuration = 300
export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const ELEVENLABS_VOICE_ID = 'ChO6kqkVouUn0s7HMunx'
const ELEVENLABS_MODEL = 'eleven_turbo_v2_5'

export async function POST(request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  try {
    const { course_id, slide_id } = await request.json()
    if (!course_id && !slide_id)
      return NextResponse.json({ error: 'Missing course_id or slide_id.' }, { status: 400 })

    let query = supabaseAdmin
      .from('lms_slides')
      .select('id, slide_order, speaker_notes, audio_path, course_id')
      .not('speaker_notes', 'is', null)
      .neq('speaker_notes', '')

    if (slide_id) {
      query = query.eq('id', slide_id)
    } else {
      query = query.eq('course_id', course_id)
    }

    const { data: slides } = await query.order('slide_order')

    if (!slides || slides.length === 0)
      return NextResponse.json({ error: 'No slides with speaker notes found.' }, { status: 404 })

    let generated = 0
    let skipped = 0

    for (const slide of slides) {
      if (slide.audio_path) { skipped++; continue }

      try {
        const ttsRes = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + ELEVENLABS_VOICE_ID, {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': process.env.ELEVENLABS_API_KEY,
          },
          body: JSON.stringify({
            text: slide.speaker_notes,
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
          const err = await ttsRes.text()
          console.error('ElevenLabs error slide ' + slide.slide_order + ':', ttsRes.status, err)
          continue
        }

        const audioBuffer = await ttsRes.arrayBuffer()
        const audioPath = slide.course_id + '/' + String(slide.slide_order).padStart(3, '0') + '.mp3'

        const { error: uploadError } = await supabaseAdmin.storage
          .from('lms-audio')
          .upload(audioPath, audioBuffer, { contentType: 'audio/mpeg', upsert: true })

        if (uploadError) {
          console.error('Upload error slide ' + slide.slide_order + ':', uploadError.message)
          continue
        }

        await supabaseAdmin.from('lms_slides').update({ audio_path: audioPath }).eq('id', slide.id)
        generated++

      } catch (err) {
        console.error('Slide ' + slide.slide_order + ' error:', err.message)
      }
    }

    return NextResponse.json({ success: true, generated, skipped, total: slides.length })

  } catch (err) {
    return NextResponse.json({ error: 'Server error: ' + err.message }, { status: 500 })
  }
}

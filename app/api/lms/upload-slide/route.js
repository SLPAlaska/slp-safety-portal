import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const formData = await request.formData()
    const file         = formData.get('file')
    const course_id    = formData.get('course_id')
    const slide_order  = parseInt(formData.get('slide_order'))
    const speaker_notes = formData.get('speaker_notes') || ''

    if (!file || !course_id || isNaN(slide_order)) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const storagePath = `${course_id}/${String(slide_order).padStart(3, '0')}.png`

    // Upload to private lms-slides bucket
    const { error: uploadError } = await supabaseAdmin.storage
      .from('lms-slides')
      .upload(storagePath, buffer, {
        contentType: 'image/png',
        upsert: true,
      })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 400 })
    }

    // Upsert slide record in lms_slides
    const { data: slide, error: dbError } = await supabaseAdmin
      .from('lms_slides')
      .upsert({
        course_id,
        slide_order,
        image_path: storagePath,
        speaker_notes: speaker_notes.trim(),
      }, {
        onConflict: 'course_id,slide_order',
      })
      .select()
      .single()

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 400 })
    }

    return NextResponse.json({ slide }, { status: 201 })

  } catch (err) {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}

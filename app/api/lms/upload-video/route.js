import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const maxDuration = 60

export async function POST(request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const slide_id = formData.get('slide_id')
    const video_url = formData.get('video_url')

    if (!slide_id) return NextResponse.json({ error: 'Missing slide_id.' }, { status: 400 })

    // If external URL provided, just save it
    if (video_url) {
      const { error } = await supabaseAdmin
        .from('lms_slides').update({ video_url }).eq('id', slide_id)
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ success: true, video_url })
    }

    // Otherwise upload file
    if (!file) return NextResponse.json({ error: 'Missing file or video_url.' }, { status: 400 })

    const { data: slide } = await supabaseAdmin
      .from('lms_slides').select('course_id, slide_order').eq('id', slide_id).single()
    if (!slide) return NextResponse.json({ error: 'Slide not found.' }, { status: 404 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const ext = file.name.split('.').pop() || 'mp4'
    const storagePath = `${slide.course_id}/${String(slide.slide_order).padStart(3, '0')}.${ext}`

    const { error: uploadError } = await supabaseAdmin.storage
      .from('lms-videos')
      .upload(storagePath, buffer, { contentType: file.type || 'video/mp4', upsert: true })

    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 400 })

    const { error: dbError } = await supabaseAdmin
      .from('lms_slides').update({ video_path: storagePath }).eq('id', slide_id)

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 400 })

    return NextResponse.json({ success: true, video_path: storagePath })
  } catch (err) {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}

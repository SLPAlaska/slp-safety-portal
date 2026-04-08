// app/api/lms/delete-course/route.js
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function DELETE(req) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  try {
    const { course_id } = await req.json()
    if (!course_id) {
      return NextResponse.json({ error: 'course_id required' }, { status: 400 })
    }

    // 1. Get all slides so we can delete their storage files
    const { data: slides } = await supabaseAdmin
      .from('lms_slides')
      .select('id, image_path, audio_path')
      .eq('course_id', course_id)

    // 2. Delete slide images from lms-slides bucket
    if (slides && slides.length > 0) {
      const imagePaths = slides
        .filter(s => s.image_path)
        .map(s => s.image_path)
      if (imagePaths.length > 0) {
        await supabaseAdmin.storage.from('lms-slides').remove(imagePaths)
      }

      // 3. Delete audio files from lms-audio bucket
      const audioPaths = slides
        .filter(s => s.audio_path)
        .map(s => {
          // audio_path is stored as lms-audio/{course_id}/{pad}.mp3
          // strip the bucket prefix if present
          return s.audio_path.replace(/^lms-audio\//, '')
        })
      if (audioPaths.length > 0) {
        await supabaseAdmin.storage.from('lms-audio').remove(audioPaths)
      }
    }

    // 4. Delete related DB records (cascade order)
    await supabaseAdmin.from('lms_quiz_questions').delete().eq('course_id', course_id)
    await supabaseAdmin.from('lms_ai_jobs').delete().eq('course_id', course_id)
    await supabaseAdmin.from('lms_completions').delete().eq('course_id', course_id)
    await supabaseAdmin.from('lms_certificates').delete().eq('course_id', course_id)
    await supabaseAdmin.from('lms_required_courses').delete().eq('course_id', course_id)
    await supabaseAdmin.from('lms_individual_assignments').delete().eq('course_id', course_id)
    await supabaseAdmin.from('lms_slides').delete().eq('course_id', course_id)

    // 5. Delete the course itself
    const { error } = await supabaseAdmin
      .from('lms_courses')
      .delete()
      .eq('id', course_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

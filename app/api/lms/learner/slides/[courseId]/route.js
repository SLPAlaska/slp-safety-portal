import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request, { params }) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const authHeader = request.headers.get('authorization')
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: lmsUser } = await supabaseAdmin
    .from('lms_users')
    .select('id, company_id')
    .eq('auth_user_id', user.id)
    .eq('active', true)
    .single()

  if (!lmsUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { courseId } = await params

  // Verify user has access to this course
  const { data: requiredAccess } = await supabaseAdmin
    .from('lms_required_courses')
    .select('id')
    .eq('company_id', lmsUser.company_id)
    .eq('course_id', courseId)
    .maybeSingle()

  const { data: individualAccess } = await supabaseAdmin
    .from('lms_individual_assignments')
    .select('id')
    .eq('user_id', lmsUser.id)
    .eq('course_id', courseId)
    .maybeSingle()

  if (!requiredAccess && !individualAccess) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  // Fetch slides
  const { data: slides, error } = await supabaseAdmin
    .from('lms_slides')
    .select('id, slide_order, image_path, speaker_notes')
    .eq('course_id', courseId)
    .order('slide_order')

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Generate signed URLs for each slide (valid 2 hours)
  const slidesWithUrls = await Promise.all(
    (slides || []).map(async slide => {
      const { data: signedUrl } = await supabaseAdmin.storage
        .from('lms-slides')
        .createSignedUrl(slide.image_path, 7200)
      return {
        ...slide,
        image_url: signedUrl?.signedUrl || null,
      }
    })
  )

  // Fetch existing progress for this user/course
  const { data: progress } = await supabaseAdmin
    .from('lms_progress')
    .select('slide_id, completed, time_spent_seconds, last_viewed')
    .eq('user_id', lmsUser.id)
    .eq('course_id', courseId)

  return NextResponse.json({
    slides: slidesWithUrls,
    progress: progress || [],
    lmsUserId: lmsUser.id,
  })
}

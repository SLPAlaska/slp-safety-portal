import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Get auth header
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get lms_user row
  const { data: lmsUser, error: userError } = await supabaseAdmin
    .from('lms_users')
    .select('id, company_id, full_name, must_change_pw')
    .eq('auth_user_id', user.id)
    .eq('active', true)
    .single()

  if (userError || !lmsUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  if (lmsUser.must_change_pw) return NextResponse.json({ error: 'Password change required' }, { status: 403 })

  // Get required courses for their company
  const { data: required } = await supabaseAdmin
    .from('lms_required_courses')
    .select('course_id')
    .eq('company_id', lmsUser.company_id)

  // Get individual assignments
  const { data: individual } = await supabaseAdmin
    .from('lms_individual_assignments')
    .select('course_id')
    .eq('user_id', lmsUser.id)

  // Dedupe course IDs
  const allCourseIds = [
    ...new Set([
      ...(required || []).map(r => r.course_id),
      ...(individual || []).map(i => i.course_id),
    ])
  ]

  if (allCourseIds.length === 0) return NextResponse.json({ courses: [], lmsUser })

  // Fetch course details
  const { data: courses } = await supabaseAdmin
    .from('lms_courses')
    .select('id, title, description, pass_score, max_quiz_attempts, regulation_ref')
    .in('id', allCourseIds)
    .eq('active', true)
    .order('title')

  // Fetch progress summary per course
  const { data: progress } = await supabaseAdmin
    .from('lms_progress')
    .select('course_id, slide_id, completed, time_spent_seconds')
    .eq('user_id', lmsUser.id)

  // Fetch completions
  const { data: completions } = await supabaseAdmin
    .from('lms_completions')
    .select('course_id, completed_at, certificate_id, certificate_path')
    .eq('user_id', lmsUser.id)

  // Fetch best quiz scores
  const { data: attempts } = await supabaseAdmin
    .from('lms_quiz_attempts')
    .select('course_id, score, passed')
    .eq('user_id', lmsUser.id)
    .order('score', { ascending: false })

  // Fetch slide counts per course
  const { data: slideCounts } = await supabaseAdmin
    .from('lms_slides')
    .select('course_id')
    .in('course_id', allCourseIds)

  // Build enriched course list
  const enriched = (courses || []).map(course => {
    const courseProgress = (progress || []).filter(p => p.course_id === course.id)
    const completion = (completions || []).find(c => c.course_id === course.id)
    const bestAttempt = (attempts || []).find(a => a.course_id === course.id)
    const totalSlides = (slideCounts || []).filter(s => s.course_id === course.id).length
    const slidesViewed = new Set(courseProgress.map(p => p.slide_id)).size
    const totalTime = courseProgress.reduce((sum, p) => sum + (p.time_spent_seconds || 0), 0)

    let status = 'Not Started'
    if (completion) status = 'Complete'
    else if (slidesViewed > 0) status = 'In Progress'

    return {
      ...course,
      total_slides: totalSlides,
      slides_viewed: slidesViewed,
      percent_complete: totalSlides > 0 ? Math.round((slidesViewed / totalSlides) * 100) : 0,
      total_time_seconds: totalTime,
      best_score: bestAttempt?.score || null,
      passed: bestAttempt?.passed || false,
      status,
      completed_at: completion?.completed_at || null,
      certificate_id: completion?.certificate_id || null,
    }
  })

  return NextResponse.json({ courses: enriched, lmsUser })
}

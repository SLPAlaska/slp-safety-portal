import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const authHeader = request.headers.get('authorization')
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get company admin's lms_user row
  const { data: adminUser } = await supabaseAdmin
    .from('lms_users')
    .select('id, company_id, role')
    .eq('auth_user_id', user.id)
    .single()

  if (!adminUser || adminUser.role !== 'company_admin')
    return NextResponse.json({ error: 'Access denied.' }, { status: 403 })

  // Get all users in this company
  const { data: employees } = await supabaseAdmin
    .from('lms_users')
    .select('id, full_name, email, job_title, role, active, must_change_pw')
    .eq('company_id', adminUser.company_id)
    .neq('id', adminUser.id)
    .order('full_name')

  // Get all courses assigned to this company (required)
  const { data: required } = await supabaseAdmin
    .from('lms_required_courses')
    .select('course_id, lms_courses(id, title)')
    .eq('company_id', adminUser.company_id)

  // Get all individual assignments for users in this company
  const employeeIds = (employees || []).map(e => e.id)
  const { data: individual } = employeeIds.length > 0
    ? await supabaseAdmin
        .from('lms_individual_assignments')
        .select('user_id, course_id, lms_courses(id, title)')
        .in('user_id', employeeIds)
    : { data: [] }

  // Get completions
  const { data: completions } = employeeIds.length > 0
    ? await supabaseAdmin
        .from('lms_completions')
        .select('user_id, course_id, completed_at, certificate_id')
        .in('user_id', employeeIds)
    : { data: [] }

  // Get progress
  const { data: progress } = employeeIds.length > 0
    ? await supabaseAdmin
        .from('lms_progress')
        .select('user_id, course_id, slide_id')
        .in('user_id', employeeIds)
    : { data: [] }

  // Get all active courses for assignment dropdown
  const { data: allCourses } = await supabaseAdmin
    .from('lms_courses')
    .select('id, title')
    .eq('active', true)
    .order('title')

  // Build enriched employee list
  const enriched = (employees || []).map(emp => {
    const empRequired = (required || []).map(r => r.course_id)
    const empIndividual = (individual || [])
      .filter(i => i.user_id === emp.id)
      .map(i => ({ course_id: i.course_id, title: i.lms_courses?.title }))

    const allCourseIds = [...new Set([
      ...empRequired,
      ...empIndividual.map(i => i.course_id)
    ])]

    const courseStatus = allCourseIds.map(courseId => {
      const completion = (completions || []).find(c => c.user_id === emp.id && c.course_id === courseId)
      const courseProgress = (progress || []).filter(p => p.user_id === emp.id && p.course_id === courseId)
      const requiredCourse = (required || []).find(r => r.course_id === courseId)
      const individualCourse = empIndividual.find(i => i.course_id === courseId)
      const title = requiredCourse?.lms_courses?.title || individualCourse?.title || 'Unknown'

      return {
        course_id: courseId,
        title,
        status: completion ? 'Complete' : courseProgress.length > 0 ? 'In Progress' : 'Not Started',
        completed_at: completion?.completed_at || null,
        certificate_id: completion?.certificate_id || null,
        is_required: !!requiredCourse,
      }
    })

    return { ...emp, courses: courseStatus }
  })

  return NextResponse.json({
    employees: enriched,
    courses: allCourses || [],
    companyId: adminUser.company_id,
  })
}

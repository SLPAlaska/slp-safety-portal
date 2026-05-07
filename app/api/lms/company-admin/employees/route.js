import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

async function getAdminUser(supabaseAdmin, token) {
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return null
  const { data } = await supabaseAdmin
    .from('lms_users')
    .select('id, company_id, role')
    .eq('auth_user_id', user.id)
    .single()
  if (!data || data.role !== 'company_admin') return null
  return data
}

export async function GET(request) {
  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const token = authHeader.replace('Bearer ', '')
  const adminUser = await getAdminUser(supabaseAdmin, token)
  if (!adminUser) return NextResponse.json({ error: 'Access denied.' }, { status: 403 })

  const { data: employees } = await supabaseAdmin
    .from('lms_users')
    .select('id, full_name, email, job_title, role, active, must_change_pw, work_location, client_project, department, employee_id, supervisor, hire_date')
    .eq('company_id', adminUser.company_id)
    .neq('id', adminUser.id)
    .order('full_name')

  const { data: required } = await supabaseAdmin
    .from('lms_required_courses')
    .select('course_id, lms_courses(id, title)')
    .eq('company_id', adminUser.company_id)

  const employeeIds = (employees || []).map(e => e.id)

  const { data: individual } = employeeIds.length > 0
    ? await supabaseAdmin.from('lms_individual_assignments')
        .select('user_id, course_id, lms_courses(id, title)').in('user_id', employeeIds)
    : { data: [] }

  const { data: completions } = employeeIds.length > 0
    ? await supabaseAdmin.from('lms_completions')
        .select('user_id, course_id, completed_at, certificate_id').in('user_id', employeeIds)
    : { data: [] }

  const { data: progress } = employeeIds.length > 0
    ? await supabaseAdmin.from('lms_progress')
        .select('user_id, course_id, slide_id').in('user_id', employeeIds)
    : { data: [] }

  const { data: allCourses } = await supabaseAdmin
    .from('lms_courses').select('id, title').eq('active', true).order('title')

  const enriched = (employees || []).map(emp => {
    const empRequired = (required || []).map(r => r.course_id)
    const empIndividual = (individual || []).filter(i => i.user_id === emp.id)
    const allCourseIds = [...new Set([...empRequired, ...empIndividual.map(i => i.course_id)])]

    const courseStatus = allCourseIds.map(courseId => {
      const completion = (completions || []).find(c => c.user_id === emp.id && c.course_id === courseId)
      const courseProgress = (progress || []).filter(p => p.user_id === emp.id && p.course_id === courseId)
      const requiredCourse = (required || []).find(r => r.course_id === courseId)
      const individualCourse = empIndividual.find(i => i.course_id === courseId)
      const title = requiredCourse?.lms_courses?.title || individualCourse?.lms_courses?.title || 'Unknown'
      return {
        course_id: courseId, title,
        status: completion ? 'Complete' : courseProgress.length > 0 ? 'In Progress' : 'Not Started',
        completed_at: completion?.completed_at || null,
        certificate_id: completion?.certificate_id || null,
        is_required: !!requiredCourse,
      }
    })
    return { ...emp, courses: courseStatus }
  })

  return NextResponse.json({ employees: enriched, courses: allCourses || [], companyId: adminUser.company_id })
}

export async function PATCH(request) {
  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const token = authHeader.replace('Bearer ', '')
  const adminUser = await getAdminUser(supabaseAdmin, token)
  if (!adminUser) return NextResponse.json({ error: 'Access denied.' }, { status: 403 })

  try {
    const {
      user_id, full_name, email, username,
      work_location, client_project, department, employee_id,
      supervisor, hire_date, job_title,
    } = await request.json()
    if (!user_id) return NextResponse.json({ error: 'Missing user_id.' }, { status: 400 })

    // Verify employee belongs to this admin's company AND grab auth_user_id + current email
    const { data: emp } = await supabaseAdmin
      .from('lms_users')
      .select('company_id, auth_user_id, email')
      .eq('id', user_id)
      .single()
    if (!emp || emp.company_id !== adminUser.company_id)
      return NextResponse.json({ error: 'Employee not in your company.' }, { status: 403 })

    // If email is changing, sync the Supabase auth user FIRST (must succeed before DB row update)
    const newEmail = email?.trim().toLowerCase() || null
    if (newEmail !== null && newEmail !== emp.email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail))
        return NextResponse.json({ error: 'Invalid email format.' }, { status: 400 })

      const authId = emp.auth_user_id || user_id
      const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(authId, { email: newEmail })
      if (authErr) return NextResponse.json({ error: `Auth update failed: ${authErr.message}` }, { status: 400 })
    }

    // Build patch object only with fields that were provided so we don't accidentally null things out
    const patch = {}
    if (full_name !== undefined)      patch.full_name      = full_name?.trim() || null
    if (email !== undefined)          patch.email          = newEmail
    if (username !== undefined)       patch.username       = username?.trim() || null
    if (work_location !== undefined)  patch.work_location  = work_location?.trim() || null
    if (client_project !== undefined) patch.client_project = client_project?.trim() || null
    if (department !== undefined)     patch.department     = department?.trim() || null
    if (employee_id !== undefined)    patch.employee_id    = employee_id?.trim() || null
    if (supervisor !== undefined)     patch.supervisor     = supervisor?.trim() || null
    if (hire_date !== undefined)      patch.hire_date      = hire_date || null
    if (job_title !== undefined)      patch.job_title      = job_title?.trim() || null

    const { error } = await supabaseAdmin.from('lms_users').update(patch).eq('id', user_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Server error.' }, { status: 500 })
  }
}

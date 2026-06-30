// app/api/lms/company-admin/dashboard/route.js
//
// Powers the on-screen Training Matrix tab.
// - Includes EVERY active employee in the company (not just ones with progress)
// - Computes a true completion % per employee and company-wide
// - Honors per-learner required-course exclusions (lms_required_exclusions)
// - Returns per-employee, per-course training TIME (seconds) from lms_session_time
// - Returns filter lists (work locations, job titles) for the slicers
//
// Auth: company_admin only, verified server-side.

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
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const authHeader = request.headers.get('authorization')
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const token = authHeader.replace('Bearer ', '')
  const adminUser = await getAdminUser(supabaseAdmin, token)
  if (!adminUser) return NextResponse.json({ error: 'Access denied.' }, { status: 403 })

  const companyId = adminUser.company_id

  // ── Employees (ALL active, excluding the admin themselves) ──
  const { data: employees } = await supabaseAdmin
    .from('lms_users')
    .select('id, full_name, email, job_title, work_location, department, active')
    .eq('company_id', companyId)
    .eq('active', true)
    .neq('role', 'company_admin')
    .order('full_name')

  const empList = employees || []
  const employeeIds = empList.map(e => e.id)

  // ── Company-required courses ──
  const { data: required } = await supabaseAdmin
    .from('lms_required_courses')
    .select('course_id, lms_courses(id, title)')
    .eq('company_id', companyId)

  // ── Individual assignments ──
  const { data: individual } = employeeIds.length
    ? await supabaseAdmin
        .from('lms_individual_assignments')
        .select('user_id, course_id, lms_courses(id, title)')
        .in('user_id', employeeIds)
    : { data: [] }

  // ── Per-learner exclusions (course de-selected for one employee) ──
  let exclusions = []
  {
    const { data, error } = employeeIds.length
      ? await supabaseAdmin
          .from('lms_required_exclusions')
          .select('user_id, course_id')
          .in('user_id', employeeIds)
      : { data: [], error: null }
    // If the table doesn't exist yet, degrade gracefully (no exclusions)
    exclusions = error ? [] : (data || [])
  }
  const isExcluded = (userId, courseId) =>
    exclusions.some(x => x.user_id === userId && x.course_id === courseId)

  // ── Course map (required first, then individual) ──
  const courseMap = {}
  ;(required || []).forEach(r => {
    if (r.lms_courses) courseMap[r.course_id] = { ...r.lms_courses, is_required: true }
  })
  ;(individual || []).forEach(i => {
    if (i.lms_courses && !courseMap[i.course_id])
      courseMap[i.course_id] = { ...i.lms_courses, is_required: false }
  })

  const courseIds = Object.keys(courseMap).sort((a, b) => {
    const aReq = courseMap[a]?.is_required ? 0 : 1
    const bReq = courseMap[b]?.is_required ? 0 : 1
    if (aReq !== bReq) return aReq - bReq
    return (courseMap[a]?.title || '').localeCompare(courseMap[b]?.title || '')
  })

  const courses = courseIds.map(id => ({
    id,
    title: courseMap[id].title,
    is_required: courseMap[id].is_required,
  }))

  // ── Completions ──
  const { data: completions } = employeeIds.length
    ? await supabaseAdmin
        .from('lms_completions')
        .select('user_id, course_id, completed_at, certificate_id')
        .in('user_id', employeeIds)
    : { data: [] }

  // ── Progress (for In-Progress % ) ──
  const { data: progress } = employeeIds.length
    ? await supabaseAdmin
        .from('lms_progress')
        .select('user_id, course_id, slide_id, completed')
        .in('user_id', employeeIds)
    : { data: [] }

  // ── Slide counts per course ──
  const { data: slideRows } = courseIds.length
    ? await supabaseAdmin.from('lms_slides').select('course_id').in('course_id', courseIds)
    : { data: [] }
  const slideCount = {}
  ;(slideRows || []).forEach(s => { slideCount[s.course_id] = (slideCount[s.course_id] || 0) + 1 })

  // ── Training time per (user, course) from lms_session_time ──
  const timeByUserCourse = {}   // key: `${user_id}|${course_id}` -> seconds
  {
    const { data: sessions } = employeeIds.length
      ? await supabaseAdmin
          .from('lms_session_time')
          .select('user_id, course_id, duration_seconds')
          .in('user_id', employeeIds)
      : { data: [] }
    ;(sessions || []).forEach(s => {
      if (!s.duration_seconds) return
      const k = `${s.user_id}|${s.course_id}`
      timeByUserCourse[k] = (timeByUserCourse[k] || 0) + s.duration_seconds
    })
  }

  // ── Build per-employee rows ──
  const requiredIds = (required || []).map(r => r.course_id)

  const matrixEmployees = empList.map(emp => {
    // courses that apply to THIS employee = required (minus exclusions) + their individual assignments
    const empRequired = requiredIds.filter(cid => !isExcluded(emp.id, cid))
    const empIndividual = (individual || []).filter(i => i.user_id === emp.id).map(i => i.course_id)
    const empCourseIds = new Set([...empRequired, ...empIndividual])

    let requiredApplicable = 0
    let requiredComplete = 0

    const courseData = courseIds.map(courseId => {
      const seconds = timeByUserCourse[`${emp.id}|${courseId}`] || 0

      if (!empCourseIds.has(courseId)) {
        // Not applicable to this employee — either never assigned, or excluded
        const excluded = courseMap[courseId].is_required && isExcluded(emp.id, courseId)
        return { course_id: courseId, status: 'N/A', excluded, seconds, date: null, pct: 0 }
      }

      const applicableRequired = courseMap[courseId].is_required // already filtered exclusions above
      if (applicableRequired) requiredApplicable++

      const completion = (completions || []).find(c => c.user_id === emp.id && c.course_id === courseId)
      if (completion) {
        if (applicableRequired) requiredComplete++
        return {
          course_id: courseId, status: 'Complete', excluded: false, seconds,
          date: completion.completed_at, cert: completion.certificate_id || null, pct: 100,
        }
      }

      const done = (progress || []).filter(p => p.user_id === emp.id && p.course_id === courseId && p.completed).length
      const total = slideCount[courseId] || 0
      if (done > 0 && total > 0) {
        return { course_id: courseId, status: 'In Progress', excluded: false, seconds, date: null, pct: Math.round((done / total) * 100) }
      }
      return { course_id: courseId, status: 'Not Started', excluded: false, seconds, date: null, pct: 0 }
    })

    const totalSeconds = courseData.reduce((s, c) => s + (c.seconds || 0), 0)
    const completionPct = requiredApplicable > 0
      ? Math.round((requiredComplete / requiredApplicable) * 100)
      : 100  // no required courses applicable => fully compliant

    return {
      id: emp.id,
      full_name: emp.full_name,
      email: emp.email,
      job_title: emp.job_title || '',
      work_location: emp.work_location || '',
      department: emp.department || '',
      courseData,
      required_applicable: requiredApplicable,
      required_complete: requiredComplete,
      completion_pct: completionPct,
      total_seconds: totalSeconds,
    }
  })

  // ── Company-wide completion % across ALL active employees ──
  const sumApplicable = matrixEmployees.reduce((s, e) => s + e.required_applicable, 0)
  const sumComplete = matrixEmployees.reduce((s, e) => s + e.required_complete, 0)
  const overallCompletionPct = sumApplicable > 0 ? Math.round((sumComplete / sumApplicable) * 100) : 0

  // ── Filter lists for slicers ──
  const workLocations = [...new Set(empList.map(e => e.work_location).filter(Boolean))].sort()
  const jobTitles = [...new Set(empList.map(e => e.job_title).filter(Boolean))].sort()

  return NextResponse.json({
    employees: matrixEmployees,
    courses,
    overall_completion_pct: overallCompletionPct,
    total_employees: matrixEmployees.length,
    work_locations: workLocations,
    job_titles: jobTitles,
  })
}

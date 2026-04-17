// app/api/lms/admin/company-matrix/route.js
//
// Returns the full training matrix data for a company.
// Status is computed client-side using lib/courseStatus.js.
//
// Query: ?company_id=<uuid>
// Auth:  None at this layer — matches existing /api/lms/* pattern.
//        Protection is at the /admin/lms page route.

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { searchParams } = new URL(request.url)
  const companyId = searchParams.get('company_id')
  if (!companyId) return NextResponse.json({ error: 'company_id is required' }, { status: 400 })

  const { data: company, error: compErr } = await supabaseAdmin
    .from('lms_companies')
    .select('id, name')
    .eq('id', companyId)
    .single()
  if (compErr || !company) return NextResponse.json({ error: 'Company not found' }, { status: 404 })

  const { data: users, error: usersErr } = await supabaseAdmin
    .from('lms_users')
    .select('id, full_name, email, username, job_title, department, work_location, client_project, supervisor, hire_date, role, active')
    .eq('company_id', companyId)
    .eq('active', true)
    .order('full_name')
  if (usersErr) return NextResponse.json({ error: usersErr.message }, { status: 500 })

  const userIds = users.map(u => u.id)

  const { data: required, error: reqErr } = await supabaseAdmin
    .from('lms_required_courses')
    .select('course_id')
    .eq('company_id', companyId)
  if (reqErr) return NextResponse.json({ error: reqErr.message }, { status: 500 })
  const requiredCourseIds = new Set(required.map(r => r.course_id))

  const { data: assignments, error: assnErr } = userIds.length
    ? await supabaseAdmin
        .from('lms_individual_assignments')
        .select('user_id, course_id, due_date')
        .in('user_id', userIds)
    : { data: [], error: null }
  if (assnErr) return NextResponse.json({ error: assnErr.message }, { status: 500 })

  const { data: completions, error: compsErr } = userIds.length
    ? await supabaseAdmin
        .from('lms_completions')
        .select('user_id, course_id, completed_at, certificate_id, granted_by_admin_id')
        .in('user_id', userIds)
    : { data: [], error: null }
  if (compsErr) return NextResponse.json({ error: compsErr.message }, { status: 500 })

  const assignedCourseIds = new Set(assignments.map(a => a.course_id))
  const allCourseIds = new Set([...requiredCourseIds, ...assignedCourseIds])

  const { data: courses, error: coursesErr } = allCourseIds.size
    ? await supabaseAdmin
        .from('lms_courses')
        .select('id, title, refresher_frequency_months, regulatory_basis, active')
        .in('id', [...allCourseIds])
    : { data: [], error: null }
  if (coursesErr) return NextResponse.json({ error: coursesErr.message }, { status: 500 })

  return NextResponse.json({
    company,
    users,
    courses: courses.filter(c => c.active !== false),
    required_course_ids: [...requiredCourseIds],
    assignments,
    completions,
  })
}

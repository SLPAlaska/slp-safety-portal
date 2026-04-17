// app/api/lms/admin/user-training/route.js
//
// Returns a single user's full training record:
//   - user info
//   - all expected courses (company required + individual assignments)
//   - completions
//   - course metadata
//
// Query: ?user_id=<uuid>
// Auth:  Bearer token. Super admin only.

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

  const { data: caller } = await supabaseAdmin
    .from('lms_users')
    .select('role')
    .eq('auth_user_id', user.id)
    .single()
  if (!caller || caller.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('user_id')
  if (!userId) return NextResponse.json({ error: 'user_id is required' }, { status: 400 })

  // Load user + company
  const { data: target, error: uErr } = await supabaseAdmin
    .from('lms_users')
    .select('id, full_name, email, username, job_title, department, work_location, client_project, supervisor, hire_date, role, active, company_id, lms_companies(id, name)')
    .eq('id', userId)
    .single()
  if (uErr || !target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Required courses for their company
  const { data: required } = await supabaseAdmin
    .from('lms_required_courses')
    .select('course_id')
    .eq('company_id', target.company_id)

  const requiredCourseIds = new Set((required || []).map(r => r.course_id))

  // Individual assignments
  const { data: assignments } = await supabaseAdmin
    .from('lms_individual_assignments')
    .select('course_id, due_date, assigned_at')
    .eq('user_id', userId)

  const assignedCourseIds = new Set((assignments || []).map(a => a.course_id))

  // Completions
  const { data: completions } = await supabaseAdmin
    .from('lms_completions')
    .select('course_id, completed_at, certificate_id, granted_by_admin_id, grant_note')
    .eq('user_id', userId)

  // Also pull any completions for courses NOT in required/assigned (so history is complete
  // even if they completed something they weren't assigned — e.g., old data)
  const completedCourseIds = new Set((completions || []).map(c => c.course_id))

  const allCourseIds = new Set([
    ...requiredCourseIds,
    ...assignedCourseIds,
    ...completedCourseIds,
  ])

  const { data: courses } = allCourseIds.size
    ? await supabaseAdmin
        .from('lms_courses')
        .select('id, title, refresher_frequency_months, regulatory_basis, active')
        .in('id', [...allCourseIds])
    : { data: [] }

  // Load granter names for grant_note display
  const granterIds = [...new Set((completions || []).map(c => c.granted_by_admin_id).filter(Boolean))]
  let granters = {}
  if (granterIds.length) {
    const { data: g } = await supabaseAdmin
      .from('lms_users')
      .select('id, full_name')
      .in('id', granterIds)
    granters = Object.fromEntries((g || []).map(x => [x.id, x.full_name]))
  }

  return NextResponse.json({
    user: target,
    courses: (courses || []).filter(c => c.active !== false || completedCourseIds.has(c.id)),
    required_course_ids: [...requiredCourseIds],
    assigned_course_ids: [...assignedCourseIds],
    assignments: assignments || [],
    completions: (completions || []).map(c => ({
      ...c,
      granted_by_name: c.granted_by_admin_id ? (granters[c.granted_by_admin_id] || 'Unknown admin') : null,
    })),
  })
}

// app/api/lms/admin/user-training/route.js
//
// Returns a single user's full training record.
//
// Query: ?user_id=<uuid>
// Auth:  None at this layer — matches existing /api/lms/* pattern.

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { isSuperAdmin } from '@/lib/superAdmins'
import { fetchExclusions, makeIsExcluded, effectiveRequiredIds } from '@/lib/requiredCourses'

async function getSuperAdmin(supabaseAdmin, token) {
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return null
  // Platform super admins are an explicit email allowlist (NOT a domain check —
  // real learners also have @slpalaska.com emails). See app/lib/superAdmins.js.
  if (!isSuperAdmin(user.email)) return null
  return user
}

export async function GET(request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('user_id')
  if (!userId) return NextResponse.json({ error: 'user_id is required' }, { status: 400 })

  const { data: target, error: uErr } = await supabaseAdmin
    .from('lms_users')
    .select('id, full_name, email, username, job_title, department, work_location, client_project, supervisor, hire_date, role, active, company_id, exempt_from_required, lms_companies(id, name)')
    .eq('id', userId)
    .single()
  if (uErr || !target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Exempt users receive only their individual assignments, so the company-wide
  // required list is skipped entirely for them; everyone else has their
  // per-course exclusions subtracted.
  const { data: required } = target.exempt_from_required
    ? { data: [] }
    : await supabaseAdmin
        .from('lms_required_courses')
        .select('course_id')
        .eq('company_id', target.company_id)

  const exclusions = await fetchExclusions(supabaseAdmin, [target.id])
  const excludedCourseIds = [...new Set(exclusions.map(x => x.course_id))]
  const isExcluded = makeIsExcluded(exclusions)
  const requiredCourseIds = new Set(
    effectiveRequiredIds((required || []).map(r => r.course_id), target, isExcluded)
  )

  const { data: assignments } = await supabaseAdmin
    .from('lms_individual_assignments')
    .select('course_id, due_date, assigned_at')
    .eq('user_id', userId)

  const assignedCourseIds = new Set((assignments || []).map(a => a.course_id))

  const { data: completions } = await supabaseAdmin
    .from('lms_completions')
    .select('course_id, completed_at, certificate_id, granted_by_admin_id, grant_note')
    .eq('user_id', userId)

  const completedCourseIds = new Set((completions || []).map(c => c.course_id))

  const allCourseIds = new Set([
    ...requiredCourseIds,
    ...assignedCourseIds,
    ...completedCourseIds,
    // Excluded courses are fetched too, purely so the page can name them in its
    // "Exempted" section and offer an un-exempt control.
    ...excludedCourseIds,
  ])

  const { data: courses } = allCourseIds.size
    ? await supabaseAdmin
        .from('lms_courses')
        .select('id, title, refresher_frequency_months, regulatory_basis, active')
        .in('id', [...allCourseIds])
    : { data: [] }

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
    excluded_course_ids: excludedCourseIds,
    assignments: assignments || [],
    completions: (completions || []).map(c => ({
      ...c,
      granted_by_name: c.granted_by_admin_id ? (granters[c.granted_by_admin_id] || 'Unknown admin') : null,
    })),
  })
}

// Updates a single user's exemption flag from the training detail page.
//
// Deliberately narrow: /api/lms/users PATCH rewrites its whole field set on
// every call, so a partial body there would null out unrelated columns.
//
// Auth: platform super admin only (email allowlist in app/lib/superAdmins.js),
// matching /api/lms/revoke-credit. This is a write, so unlike the GET above it
// is verified server-side rather than relying on page-level protection.
export async function PATCH(request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const authHeader = request.headers.get('authorization')
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const superAdmin = await getSuperAdmin(supabaseAdmin, authHeader.replace('Bearer ', ''))
  if (!superAdmin) return NextResponse.json({ error: 'Access denied. Super admin only.' }, { status: 403 })

  try {
    const { user_id, exempt_from_required } = await request.json()
    if (!user_id) return NextResponse.json({ error: 'user_id is required' }, { status: 400 })

    const patch = {}
    if (exempt_from_required !== undefined) patch.exempt_from_required = !!exempt_from_required

    if (Object.keys(patch).length === 0)
      return NextResponse.json({ error: 'No supported fields provided.' }, { status: 400 })

    const { error } = await supabaseAdmin.from('lms_users').update(patch).eq('id', user_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Per-course required-course exclusions for one learner, from the training
// detail page. The company-admin equivalent lives in
// /api/lms/company-admin/exclusions and is gated on company_admin; this one is
// gated on super admin because the detail page is a platform-admin surface.
//
//   POST   { user_id, course_id, reason? }  -> exempt that learner from that course
//   DELETE { user_id, course_id }           -> un-exempt (course required again)
async function readExclusionBody(request) {
  const { user_id, course_id, reason } = await request.json()
  if (!user_id || !course_id) return { error: 'user_id and course_id are required.' }
  return { user_id, course_id, reason: reason || null }
}

export async function POST(request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const authHeader = request.headers.get('authorization')
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const superAdmin = await getSuperAdmin(supabaseAdmin, authHeader.replace('Bearer ', ''))
  if (!superAdmin) return NextResponse.json({ error: 'Access denied. Super admin only.' }, { status: 403 })

  try {
    const { user_id, course_id, reason, error: bodyErr } = await readExclusionBody(request)
    if (bodyErr) return NextResponse.json({ error: bodyErr }, { status: 400 })

    // company_id and excluded_by are stamped from the target row so the
    // exclusion carries the same shape the company-admin route writes.
    const { data: target } = await supabaseAdmin
      .from('lms_users').select('id, company_id').eq('id', user_id).single()
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const { data: actor } = await supabaseAdmin
      .from('lms_users').select('id').eq('auth_user_id', superAdmin.id).maybeSingle()

    const { error } = await supabaseAdmin
      .from('lms_required_exclusions')
      .upsert({
        user_id,
        course_id,
        company_id: target.company_id,
        excluded_by: actor?.id || null,
        reason,
      }, { onConflict: 'user_id,course_id' })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true, excluded: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const authHeader = request.headers.get('authorization')
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const superAdmin = await getSuperAdmin(supabaseAdmin, authHeader.replace('Bearer ', ''))
  if (!superAdmin) return NextResponse.json({ error: 'Access denied. Super admin only.' }, { status: 403 })

  try {
    const { user_id, course_id, error: bodyErr } = await readExclusionBody(request)
    if (bodyErr) return NextResponse.json({ error: bodyErr }, { status: 400 })

    const { error } = await supabaseAdmin
      .from('lms_required_exclusions')
      .delete()
      .eq('user_id', user_id)
      .eq('course_id', course_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true, excluded: false })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

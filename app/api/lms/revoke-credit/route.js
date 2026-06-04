// app/api/lms/revoke-credit/route.js
//
// Super-Admin only. Revokes course credit (the mirror of grant-credit).
// Deletes from lms_completions, lms_certificates, lms_quiz_attempts,
// and lms_progress so affected learners drop back to "Not Started"
// WITHOUT deleting the users themselves.
//
// Auth: platform super admin only (email allowlist in app/lib/superAdmins.js).
//
// Payload (all combinations supported):
//   { company_id }                              -> wipe ALL employees, ALL courses
//   { company_id, user_ids: [...] }             -> wipe SELECTED employees, ALL courses
//   { company_id, course_ids: [...] }           -> wipe ALL employees, SELECTED courses
//   { company_id, user_ids: [...],
//                 course_ids: [...] }            -> wipe SELECTED employees, SELECTED courses
//   { user_ids: [...] }                          -> wipe selected employees (company inferred)
//
// company_id is required UNLESS user_ids is provided (then it's optional and
// used only as a safety filter). At least one of company_id or user_ids must
// be present, so a bare call can never wipe the entire platform.

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { isSuperAdmin } from '@/lib/superAdmins'

async function getSuperAdmin(supabaseAdmin, token) {
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return null
  // Platform super admins are an explicit email allowlist (NOT a domain check —
  // real learners also have @slpalaska.com emails). See app/lib/superAdmins.js.
  if (!isSuperAdmin(user.email)) return null
  return user
}

export async function POST(request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const authHeader = request.headers.get('authorization')
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const token = authHeader.replace('Bearer ', '')

  const superAdmin = await getSuperAdmin(supabaseAdmin, token)
  if (!superAdmin) return NextResponse.json({ error: 'Access denied. Super admin only.' }, { status: 403 })

  let body
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { company_id, dry_run } = body
  let { user_ids, course_ids } = body

  // Normalize array inputs
  user_ids = Array.isArray(user_ids) ? user_ids.filter(Boolean) : null
  course_ids = Array.isArray(course_ids) ? course_ids.filter(Boolean) : null

  // Guardrail: must scope to a company OR an explicit user list. Never platform-wide.
  if (!company_id && (!user_ids || user_ids.length === 0)) {
    return NextResponse.json(
      { error: 'You must provide company_id and/or user_ids. A bare request is not allowed.' },
      { status: 400 }
    )
  }

  // ── Resolve the exact set of target user IDs ─────────────────────────────
  // Start from the company roster (if given), then intersect with user_ids (if given).
  let targetUserIds = []

  if (company_id) {
    const { data: companyUsers, error: cuErr } = await supabaseAdmin
      .from('lms_users')
      .select('id')
      .eq('company_id', company_id)
      .range(0, 99999)
    if (cuErr) return NextResponse.json({ error: 'Failed to load company users: ' + cuErr.message }, { status: 500 })
    const companyIdSet = new Set((companyUsers || []).map(u => u.id))

    if (user_ids && user_ids.length > 0) {
      // Selected employees, but enforce they actually belong to this company.
      targetUserIds = user_ids.filter(id => companyIdSet.has(id))
      if (targetUserIds.length === 0) {
        return NextResponse.json(
          { error: 'None of the provided user_ids belong to the specified company.' },
          { status: 400 }
        )
      }
    } else {
      targetUserIds = [...companyIdSet]
    }
  } else {
    // No company_id: operate on the explicit user list as-is.
    targetUserIds = user_ids
  }

  if (targetUserIds.length === 0) {
    return NextResponse.json({ error: 'No matching users to revoke.' }, { status: 400 })
  }

  // ── Helper to scope a query by users and (optionally) courses ────────────
  const scope = (q) => {
    q = q.in('user_id', targetUserIds)
    if (course_ids && course_ids.length > 0) q = q.in('course_id', course_ids)
    return q
  }

  // ── DRY RUN: count what would be deleted, change nothing ─────────────────
  if (dry_run) {
    const countOf = async (table) => {
      let q = supabaseAdmin.from(table).select('id', { count: 'exact', head: true })
      q = scope(q)
      const { count, error } = await q
      if (error) return { error: error.message }
      return { count: count || 0 }
    }
    const [completions, certificates, quiz_attempts, progress] = await Promise.all([
      countOf('lms_completions'),
      countOf('lms_certificates'),
      countOf('lms_quiz_attempts'),
      countOf('lms_progress'),
    ])
    return NextResponse.json({
      dry_run: true,
      users_targeted: targetUserIds.length,
      course_scope: course_ids && course_ids.length > 0 ? course_ids.length : 'ALL',
      would_delete: { completions, certificates, quiz_attempts, progress },
    })
  }

  // ── EXECUTE: delete in dependency-safe order ─────────────────────────────
  // Order matters in case of FKs: completions reference certificates by
  // cert_number, and completions/certificates reference quiz_attempts.
  const results = {}
  const doDelete = async (table) => {
    let q = supabaseAdmin.from(table).delete({ count: 'exact' })
    q = scope(q)
    const { count, error } = await q
    if (error) throw new Error(`${table}: ${error.message}`)
    results[table] = count || 0
  }

  try {
    await doDelete('lms_completions')
    await doDelete('lms_certificates')
    await doDelete('lms_quiz_attempts')
    await doDelete('lms_progress')
  } catch (e) {
    return NextResponse.json(
      { error: 'Revoke failed (partial changes may have applied): ' + e.message, partial: results },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    revoked_by: superAdmin.email,
    users_affected: targetUserIds.length,
    course_scope: course_ids && course_ids.length > 0 ? course_ids.length : 'ALL',
    deleted: results,
  })
}

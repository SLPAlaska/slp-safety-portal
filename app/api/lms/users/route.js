import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { pageAll } from '@/lib/supabasePage'
import { requireAdmin } from '@/lib/requireAdmin'

// Super-admin only, both methods.
//
// GET returns every learner in every company - 379 rows across 14 tenants at
// the time this check was added, to anyone who asked.
//
// PATCH is the more serious of the two: it writes `role` and `company_id`, so
// an unauthenticated caller could read their own id from GET and then promote
// themselves to company_admin of any tenant. That made every role check
// elsewhere in the platform, including app/api/lms/company-admin/*, only as
// strong as this one route.
export async function GET(request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const auth = await requireAdmin(request, supabaseAdmin)
  if (!auth.ok) return auth.response
  // Whole-table read across every company — pages so it keeps working past
  // 1000 users.
  const { data, error } = await pageAll(() => supabaseAdmin
    .from('lms_users')
    .select('*, lms_companies(id, name)')
    .order('full_name'))
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ users: data })
}

export async function PATCH(req) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const auth = await requireAdmin(req, supabaseAdmin)
  if (!auth.ok) return auth.response

  try {
    const {
      id, full_name, email, username, job_title,
      company_id, role, work_location, department,
      employee_id, hire_date, exempt_from_required
    } = await req.json()

    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    // Look up current row to detect email change and get auth_user_id
    const { data: existing, error: lookupErr } = await supabaseAdmin
      .from('lms_users')
      .select('email, auth_user_id')
      .eq('id', id)
      .single()
    if (lookupErr || !existing)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // If email is changing, sync the Supabase auth user FIRST (must succeed before DB row update)
    const newEmail = email?.trim().toLowerCase() || null
    if (newEmail !== null && newEmail !== existing.email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail))
        return NextResponse.json({ error: 'Invalid email format.' }, { status: 400 })

      const authId = existing.auth_user_id || id
      const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(authId, { email: newEmail })
      if (authErr) return NextResponse.json({ error: `Auth update failed: ${authErr.message}` }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('lms_users')
      .update({
        full_name: full_name || null,
        email: newEmail,
        username: username || null,
        job_title: job_title || null,
        company_id: company_id || null,
        role: role || 'learner',
        work_location: work_location || null,
        department: department || null,
        employee_id: employee_id || null,
        hire_date: hire_date || null,
        // Only written when provided, so callers that omit it don't clobber an
        // exemption set elsewhere (e.g. from the company-admin employees route).
        ...(exempt_from_required !== undefined && { exempt_from_required: !!exempt_from_required }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ user: data })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

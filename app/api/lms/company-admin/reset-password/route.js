// app/api/lms/company-admin/reset-password/route.js
//
// Resets a learner's password to the standard temp password (1234567!)
// and forces a password change on their next login via must_change_pw.
//
// Body:    { user_id: "<lms_users.id uuid>" }
// Headers: Authorization: Bearer <caller's Supabase session access token>
//
// Auth (enforced server-side in this route):
//   - brian@ / britney@ super-admin logins may reset anyone.
//   - Active lms_users with role 'company_admin' may reset users
//     ONLY within their own company_id.
//   - Everyone else gets 401/403.
//
// Log tag: [PW-RESET]

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const TEMP_PASSWORD = '1234567!'

// Existing super-admin logins only — never use domain checks,
// real learners share the @slpalaska.com domain.
const SUPER_ADMINS = ['brian@slpalaska.com', 'britney@slpalaska.com']

function isSuperAdmin(email) {
  if (!email) return false
  return SUPER_ADMINS.includes(email.toLowerCase().trim())
}

export async function POST(request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // ── 1. Verify the caller's session token ─────────────────────────────
  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    console.error('[PW-RESET] Missing Authorization header')
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const { data: { user: callerAuth }, error: tokenErr } =
    await supabaseAdmin.auth.getUser(token)

  if (tokenErr || !callerAuth) {
    console.error('[PW-RESET] Token verification failed:', tokenErr?.message)
    return NextResponse.json({ error: 'Session invalid — please sign in again' }, { status: 401 })
  }

  // ── 2. Parse and validate the request body ───────────────────────────
  let body
  try {
    body = await request.json()
  } catch (e) {
    console.error('[PW-RESET] Invalid JSON body:', e.message)
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const userId = body?.user_id
  if (!userId) {
    return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
  }

  // ── 3. Look up the target employee ───────────────────────────────────
  const { data: target, error: lookupErr } = await supabaseAdmin
    .from('lms_users')
    .select('id, full_name, username, email, auth_user_id, company_id, active')
    .eq('id', userId)
    .single()

  if (lookupErr || !target) {
    console.error('[PW-RESET] Target lookup failed for', userId, lookupErr?.message)
    return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
  }

  // ── 4. Authorize the caller ──────────────────────────────────────────
  const callerIsSuper = isSuperAdmin(callerAuth.email)

  if (!callerIsSuper) {
    const { data: caller, error: callerErr } = await supabaseAdmin
      .from('lms_users')
      .select('id, role, company_id, active, username')
      .eq('auth_user_id', callerAuth.id)
      .single()

    if (callerErr || !caller) {
      console.error('[PW-RESET] Caller has no lms_users row:', callerAuth.email, callerErr?.message)
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    if (!caller.active || caller.role !== 'company_admin') {
      console.error('[PW-RESET] Caller not an active company_admin:', caller.username, caller.role)
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    if (caller.company_id !== target.company_id) {
      console.error(
        '[PW-RESET] Cross-company reset blocked:',
        caller.username, 'attempted reset of', target.username
      )
      return NextResponse.json(
        { error: 'You can only reset passwords for employees in your own company' },
        { status: 403 }
      )
    }
  }

  // ── 5. Reset the password ────────────────────────────────────────────
  if (!target.auth_user_id) {
    console.error('[PW-RESET] No auth_user_id on lms_users row', userId)
    return NextResponse.json(
      { error: 'This employee has no login account linked. Contact SLP Alaska support.' },
      { status: 409 }
    )
  }

  const { error: pwErr } = await supabaseAdmin.auth.admin.updateUserById(
    target.auth_user_id,
    { password: TEMP_PASSWORD }
  )

  if (pwErr) {
    console.error('[PW-RESET] Password update failed for', target.username, pwErr.message)
    return NextResponse.json(
      { error: 'Password update failed: ' + pwErr.message },
      { status: 500 }
    )
  }

  // ── 6. Force a password change on next login ─────────────────────────
  const { error: flagErr } = await supabaseAdmin
    .from('lms_users')
    .update({ must_change_pw: true })
    .eq('id', target.id)

  if (flagErr) {
    // Password WAS reset — report the partial failure honestly
    console.error('[PW-RESET] must_change_pw flag update failed for', target.username, flagErr.message)
    return NextResponse.json(
      {
        error:
          'Password was reset to the temp password, but the forced-change flag failed to set: ' +
          flagErr.message,
      },
      { status: 500 }
    )
  }

  console.log(
    '[PW-RESET] Password reset for', target.username,
    'by', callerIsSuper ? callerAuth.email + ' (super admin)' : callerAuth.email
  )

  return NextResponse.json({
    success: true,
    message:
      'Password for ' +
      (target.full_name || target.username) +
      ' has been reset to 1234567! — they will be required to change it at next login.',
  })
}

// app/api/lms/admin-reset-password/route.js
//
// Super-admin password reset. Sets the password the super admin supplies on a
// learner's auth account and flags them to choose a new one at next login
// (must_change_pw). There is no default password: the caller must send one of
// at least MIN_PASSWORD_LENGTH characters, or the request is refused with 400.
// The password is never echoed back in the response.
//
// Auth: server-side. Bearer token verified with the service role, then the
// exact-email super admin list (app/lib/requireAdmin.js, app/lib/superAdmins.js).
// No session -> 401. Signed in but not a super admin -> 403.

import { NextResponse } from 'next/server'
import { requireAdminRequest } from '@/lib/requireAdmin'

export const MIN_PASSWORD_LENGTH = 8

export async function POST(request) {
  const auth = await requireAdminRequest(request)
  if (!auth.ok) return auth.response
  const supabaseAdmin = auth.supabaseAdmin
  try {
    const { user_id, password } = await request.json()
    if (!user_id) return NextResponse.json({ error: 'Missing user_id.' }, { status: 400 })
    if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json({ error: `A new password of at least ${MIN_PASSWORD_LENGTH} characters is required.` }, { status: 400 })
    }

    const { data: target, error: lookupError } = await supabaseAdmin
      .from('lms_users')
      .select('id, auth_user_id, full_name')
      .eq('id', user_id)
      .single()
    if (lookupError || !target)
      return NextResponse.json({ error: 'User not found.' }, { status: 404 })
    if (!target.auth_user_id)
      return NextResponse.json({ error: 'This user has no auth login to reset.' }, { status: 400 })

    const { error } = await supabaseAdmin.auth.admin.updateUserById(
      target.auth_user_id, { password }
    )
    if (error) {
      console.error('[admin-reset-password] update failed:', error.message)
      return NextResponse.json({ error: 'Could not reset the password.' }, { status: 400 })
    }

    await supabaseAdmin.from('lms_users').update({ must_change_pw: true }).eq('id', user_id)

    return NextResponse.json({ success: true, full_name: target.full_name })
  } catch (err) {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}

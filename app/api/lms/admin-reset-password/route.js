// app/api/lms/admin-reset-password/route.js
//
// Super-admin password reset. Resets a learner (or any user) back to the
// default temporary password and flags them to choose a new one at next login.
//
// NOTE on auth: this matches the existing /admin/lms action routes
// (delete-user, reactivate-user, delete-user-permanent), which are gated by
// the super-admin page guard rather than a token. See the security note below.

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const DEFAULT_TEMP_PASSWORD = '1234567!'

export async function POST(request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  try {
    const { user_id, password } = await request.json()
    if (!user_id) return NextResponse.json({ error: 'Missing user_id.' }, { status: 400 })

    const newPassword = password && password.length >= 8 ? password : DEFAULT_TEMP_PASSWORD

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
      target.auth_user_id, { password: newPassword }
    )
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    await supabaseAdmin.from('lms_users').update({ must_change_pw: true }).eq('id', user_id)

    return NextResponse.json({ success: true, password: newPassword, full_name: target.full_name })
  } catch (err) {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}

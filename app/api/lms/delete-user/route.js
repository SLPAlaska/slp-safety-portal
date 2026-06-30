import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  try {
    const { user_id } = await request.json()
    if (!user_id)
      return NextResponse.json({ error: 'Missing user_id.' }, { status: 400 })

    // Look up the row server-side so we don't depend on the client sending
    // auth_user_id (which may be missing/null and was silently 400-ing before).
    const { data: target, error: lookupError } = await supabaseAdmin
      .from('lms_users')
      .select('id, auth_user_id')
      .eq('id', user_id)
      .single()
    if (lookupError || !target)
      return NextResponse.json({ error: 'Employee not found.' }, { status: 404 })

    // Deactivate the LMS row — this is the source of truth for access.
    const { error: deactivateError } = await supabaseAdmin
      .from('lms_users').update({ active: false }).eq('id', user_id)
    if (deactivateError)
      return NextResponse.json({ error: deactivateError.message }, { status: 400 })

    // Best-effort: ban the auth login so they can't sign in. If there's no
    // linked auth user, or the ban call fails, the deactivation above still
    // stands — we don't fail the whole request over the ban.
    const authId = target.auth_user_id
    if (authId) {
      const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(
        authId, { ban_duration: '876600h' }
      )
      if (banError) console.error('Ban (deactivate) warning:', banError.message)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}

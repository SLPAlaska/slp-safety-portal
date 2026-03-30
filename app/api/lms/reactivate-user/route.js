import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  try {
    const { user_id, auth_user_id } = await request.json()
    if (!user_id || !auth_user_id)
      return NextResponse.json({ error: 'Missing user_id or auth_user_id.' }, { status: 400 })
    const { error: activateError } = await supabaseAdmin
      .from('lms_users').update({ active: true }).eq('id', user_id)
    if (activateError) return NextResponse.json({ error: activateError.message }, { status: 400 })
    const { error: unbanError } = await supabaseAdmin.auth.admin.updateUserById(
      auth_user_id, { ban_duration: 'none' }
    )
    if (unbanError) return NextResponse.json({ error: unbanError.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}

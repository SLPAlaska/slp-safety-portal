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

    const { data: target, error: lookupError } = await supabaseAdmin
      .from('lms_users')
      .select('id, auth_user_id')
      .eq('id', user_id)
      .single()
    if (lookupError || !target)
      return NextResponse.json({ error: 'Employee not found.' }, { status: 404 })

    const { error: activateError } = await supabaseAdmin
      .from('lms_users').update({ active: true }).eq('id', user_id)
    if (activateError)
      return NextResponse.json({ error: activateError.message }, { status: 400 })

    const authId = target.auth_user_id
    if (authId) {
      const { error: unbanError } = await supabaseAdmin.auth.admin.updateUserById(
        authId, { ban_duration: 'none' }
      )
      if (unbanError) console.error('Unban (reactivate) warning:', unbanError.message)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}

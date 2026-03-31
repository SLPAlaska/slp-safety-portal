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

  const { data: lmsUser, error } = await supabaseAdmin
    .from('lms_users')
    .select('id, active, must_change_pw, role')
    .eq('auth_user_id', user.id)
    .single()

  if (error || !lmsUser) {
    return NextResponse.json({ error: 'Account not found. Contact your administrator.' }, { status: 404 })
  }

  if (!lmsUser.active) {
    return NextResponse.json({ error: 'Your account has been deactivated. Contact your administrator.' }, { status: 403 })
  }

  return NextResponse.json({
    id: lmsUser.id,
    must_change_pw: lmsUser.must_change_pw,
    role: lmsUser.role,
  })
}

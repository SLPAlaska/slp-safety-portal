import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const token = authHeader.replace('Bearer ', '')
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: adminUser } = await supabaseAdmin
    .from('lms_users')
    .select('role, company_id')
    .eq('auth_user_id', user.id)
    .single()
  if (!adminUser || adminUser.role !== 'company_admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { user_id, password } = await request.json()
  if (!user_id || !password || password.length < 8)
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  const { data: targetUser } = await supabaseAdmin
    .from('lms_users')
    .select('auth_user_id, company_id')
    .eq('id', user_id)
    .single()
  if (!targetUser || targetUser.company_id !== adminUser.company_id)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { error } = await supabaseAdmin.auth.admin.updateUserById(targetUser.auth_user_id, { password })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  await supabaseAdmin.from('lms_users').update({ must_change_pw: true }).eq('id', user_id)
  return NextResponse.json({ success: true })
}

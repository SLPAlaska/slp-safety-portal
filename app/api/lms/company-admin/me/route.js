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
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: lmsUser } = await supabaseAdmin
    .from('lms_users')
    .select('id, role, company_id, lms_companies(name)')
    .eq('auth_user_id', user.id)
    .single()
  if (!lmsUser || lmsUser.role !== 'company_admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return NextResponse.json({
    company_id: lmsUser.company_id,
    company_name: lmsUser.lms_companies?.name || 'Your Company',
  })
}

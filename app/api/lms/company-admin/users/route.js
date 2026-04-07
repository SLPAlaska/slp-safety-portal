import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

async function getAdminCompany(supabaseAdmin, token) {
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return null
  const { data: lmsUser } = await supabaseAdmin
    .from('lms_users')
    .select('id, role, company_id')
    .eq('auth_user_id', user.id)
    .single()
  if (!lmsUser || lmsUser.role !== 'company_admin') return null
  return lmsUser.company_id
}

export async function GET(request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const company_id = await getAdminCompany(supabaseAdmin, authHeader.replace('Bearer ', ''))
  if (!company_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { data, error } = await supabaseAdmin
    .from('lms_users')
    .select('*, lms_companies(name)')
    .eq('company_id', company_id)
    .order('full_name')
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ users: data })
}

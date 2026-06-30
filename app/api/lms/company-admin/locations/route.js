// app/api/lms/company-admin/locations/route.js
//
// Returns the distinct work locations already used by employees in this
// company, so the Add/Edit Employee dropdown can auto-build its options.
// Admins can still type a brand-new location inline in the UI.
//
// Auth: company_admin only.

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

async function getAdminUser(supabaseAdmin, token) {
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return null
  const { data } = await supabaseAdmin
    .from('lms_users')
    .select('id, company_id, role')
    .eq('auth_user_id', user.id)
    .single()
  if (!data || data.role !== 'company_admin') return null
  return data
}

export async function GET(request) {
  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const adminUser = await getAdminUser(supabaseAdmin, authHeader.replace('Bearer ', ''))
  if (!adminUser) return NextResponse.json({ error: 'Access denied.' }, { status: 403 })

  const { data } = await supabaseAdmin
    .from('lms_users')
    .select('work_location')
    .eq('company_id', adminUser.company_id)
    .not('work_location', 'is', null)

  const locations = [...new Set((data || []).map(r => (r.work_location || '').trim()).filter(Boolean))].sort()
  return NextResponse.json({ locations })
}

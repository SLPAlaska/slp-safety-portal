// app/api/lms/company-admin/exclusions/route.js
//
// Toggle a per-learner required-course exclusion.
//   POST   { user_id, course_id }  -> exclude (de-select) the course for that learner
//   DELETE { user_id, course_id }  -> remove the exclusion (course required again)
//
// Auth: company_admin only. Verifies the target employee belongs to the
// admin's company before writing.

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

async function assertSameCompany(supabaseAdmin, adminUser, user_id) {
  const { data: emp } = await supabaseAdmin
    .from('lms_users')
    .select('id, company_id')
    .eq('id', user_id)
    .single()
  if (!emp || emp.company_id !== adminUser.company_id) return false
  return true
}

export async function POST(request) {
  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const adminUser = await getAdminUser(supabaseAdmin, authHeader.replace('Bearer ', ''))
  if (!adminUser) return NextResponse.json({ error: 'Access denied.' }, { status: 403 })

  try {
    const { user_id, course_id, reason } = await request.json()
    if (!user_id || !course_id)
      return NextResponse.json({ error: 'user_id and course_id are required.' }, { status: 400 })
    if (!(await assertSameCompany(supabaseAdmin, adminUser, user_id)))
      return NextResponse.json({ error: 'Employee not in your company.' }, { status: 403 })

    const { error } = await supabaseAdmin
      .from('lms_required_exclusions')
      .upsert({
        user_id,
        course_id,
        company_id: adminUser.company_id,
        excluded_by: adminUser.id,
        reason: reason || null,
      }, { onConflict: 'user_id,course_id' })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true, excluded: true })
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Server error.' }, { status: 500 })
  }
}

export async function DELETE(request) {
  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const adminUser = await getAdminUser(supabaseAdmin, authHeader.replace('Bearer ', ''))
  if (!adminUser) return NextResponse.json({ error: 'Access denied.' }, { status: 403 })

  try {
    const { user_id, course_id } = await request.json()
    if (!user_id || !course_id)
      return NextResponse.json({ error: 'user_id and course_id are required.' }, { status: 400 })
    if (!(await assertSameCompany(supabaseAdmin, adminUser, user_id)))
      return NextResponse.json({ error: 'Employee not in your company.' }, { status: 403 })

    const { error } = await supabaseAdmin
      .from('lms_required_exclusions')
      .delete()
      .eq('user_id', user_id)
      .eq('course_id', course_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true, excluded: false })
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Server error.' }, { status: 500 })
  }
}

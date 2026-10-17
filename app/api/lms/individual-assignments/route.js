import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { pageAll } from '@/lib/supabasePage'
import { requireAdminRequest, assertSameCompany, companyIdOfUser } from '@/lib/requireAdmin'

export async function GET(request) {
  const auth = await requireAdminRequest(request, { allowCompanyAdmin: true })
  if (!auth.ok) return auth.response
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  // Whole-table read — already past the 1000-row cap, so it must page.
  const { data, error } = await pageAll(() => supabaseAdmin
    .from('lms_individual_assignments')
    .select('*, lms_users(full_name, email, company_id, lms_companies(name)), lms_courses(title)')
    .order('assigned_at', { ascending: false }))
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  // A company admin sees only assignments for people in their own company.
  const rows = auth.isSuper ? data : (data || []).filter(a => a.lms_users?.company_id === auth.companyId)
  return NextResponse.json({ assignments: rows })
}

export async function POST(request) {
  const auth = await requireAdminRequest(request, { allowCompanyAdmin: true })
  if (!auth.ok) return auth.response
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  try {
    const { user_id, course_id, due_date } = await request.json()
    if (!user_id || !course_id)
      return NextResponse.json({ error: 'User and course are required.' }, { status: 400 })
    const scopeErr = assertSameCompany(auth, await companyIdOfUser(supabaseAdmin, user_id))
    if (scopeErr) return scopeErr
    const { data, error } = await supabaseAdmin
      .from('lms_individual_assignments')
      .insert({ user_id, course_id, due_date: due_date || null })
      .select('*, lms_users(full_name, email, company_id, lms_companies(name)), lms_courses(title)')
      .single()
    if (error) {
      const msg = error.message.includes('unique')
        ? 'This course is already assigned to that user.'
        : error.message
      return NextResponse.json({ error: msg }, { status: 400 })
    }
    return NextResponse.json({ assignment: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}

export async function DELETE(request) {
  const auth = await requireAdminRequest(request, { allowCompanyAdmin: true })
  if (!auth.ok) return auth.response
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  try {
    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 })
    if (!auth.isSuper) {
      const { data: row } = await supabaseAdmin.from('lms_individual_assignments').select('user_id').eq('id', id).maybeSingle()
      const scopeErr = assertSameCompany(auth, row ? await companyIdOfUser(supabaseAdmin, row.user_id) : null)
      if (scopeErr) return scopeErr
    }
    const { error } = await supabaseAdmin
      .from('lms_individual_assignments')
      .delete()
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}

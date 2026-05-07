import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  const { data, error } = await supabaseAdmin
    .from('lms_users')
    .select('*, lms_companies(id, name)')
    .order('full_name')
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ users: data })
}

export async function PATCH(req) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  try {
    const {
      id, full_name, email, username, job_title,
      company_id, role, work_location, department,
      employee_id, hire_date
    } = await req.json()

    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    // Look up current row to detect email change and get auth_user_id
    const { data: existing, error: lookupErr } = await supabaseAdmin
      .from('lms_users')
      .select('email, auth_user_id')
      .eq('id', id)
      .single()
    if (lookupErr || !existing)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // If email is changing, sync the Supabase auth user FIRST (must succeed before DB row update)
    const newEmail = email?.trim().toLowerCase() || null
    if (newEmail !== null && newEmail !== existing.email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail))
        return NextResponse.json({ error: 'Invalid email format.' }, { status: 400 })

      const authId = existing.auth_user_id || id
      const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(authId, { email: newEmail })
      if (authErr) return NextResponse.json({ error: `Auth update failed: ${authErr.message}` }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('lms_users')
      .update({
        full_name: full_name || null,
        email: newEmail,
        username: username || null,
        job_title: job_title || null,
        company_id: company_id || null,
        role: role || 'learner',
        work_location: work_location || null,
        department: department || null,
        employee_id: employee_id || null,
        hire_date: hire_date || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ user: data })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  try {
    const {
      email, password, full_name, username, job_title, company_id, role,
      work_location, client_project, department, employee_id, supervisor, hire_date
    } = await request.json()

    if (!email || !password || !full_name || !username || !company_id)
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(), password, email_confirm: true,
    })
    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

    const { data: lmsUser, error: lmsError } = await supabaseAdmin
      .from('lms_users')
      .insert({
        auth_user_id: authData.user.id,
        company_id,
        email: email.trim().toLowerCase(),
        username: username.trim(),
        full_name: full_name.trim(),
        job_title: job_title?.trim() || null,
        role: role || 'learner',
        work_location: work_location?.trim() || null,
        client_project: client_project?.trim() || null,
        department: department?.trim() || null,
        employee_id: employee_id?.trim() || null,
        supervisor: supervisor?.trim() || null,
        hire_date: hire_date || null,
        must_change_pw: true,
        active: true,
      })
      .select().single()

    if (lmsError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: lmsError.message }, { status: 400 })
    }
    return NextResponse.json({ user: lmsUser }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}

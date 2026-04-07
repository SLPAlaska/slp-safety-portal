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

    const cleanEmail = email.trim().toLowerCase()

    // Find existing auth user — paginate to handle >1000 users
    let authUserId = null
    let page = 1
    const perPage = 1000
    outer: while (true) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })
      if (error) break
      const match = data?.users?.find(u => u.email === cleanEmail)
      if (match) { authUserId = match.id; break outer }
      if (!data?.users || data.users.length < perPage) break
      page++
    }

    if (authUserId) {
      // Update password so the new one they typed actually works
      await supabaseAdmin.auth.admin.updateUserById(authUserId, { password })
    } else {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail, password, email_confirm: true,
      })
      if (authError) {
        // If Supabase still says duplicate, do one more direct lookup
        if (authError.message?.toLowerCase().includes('already')) {
          const { data: retry } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })
          const match = retry?.users?.find(u => u.email === cleanEmail)
          if (match) {
            authUserId = match.id
            await supabaseAdmin.auth.admin.updateUserById(authUserId, { password })
          } else {
            return NextResponse.json({ error: authError.message }, { status: 400 })
          }
        } else {
          return NextResponse.json({ error: authError.message }, { status: 400 })
        }
      } else {
        authUserId = authData.user.id
      }
    }

    // Check if lms_users row already exists (by id — the auth user id IS the row id)
    const { data: existingLmsUser } = await supabaseAdmin
      .from('lms_users')
      .select('id')
      .eq('id', authUserId)
      .maybeSingle()

    if (existingLmsUser) {
      return NextResponse.json({ error: 'This user already exists in the LMS.' }, { status: 400 })
    }

    const { data: lmsUser, error: lmsError } = await supabaseAdmin
      .from('lms_users')
      .insert({
        id: authUserId,
        company_id,
        email: cleanEmail,
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

    if (lmsError) return NextResponse.json({ error: lmsError.message }, { status: 400 })

    return NextResponse.json({ user: lmsUser }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}

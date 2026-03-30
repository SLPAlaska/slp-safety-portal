import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Service role client — never expose this key client-side
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { email, password, full_name, username, job_title, company_id } = await request.json()

    // Validate required fields
    if (!email || !password || !full_name || !username || !company_id) {
      return NextResponse.json(
        { error: 'Missing required fields.' },
        { status: 400 }
      )
    }

    // Create Supabase Auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true, // skip email confirmation — you create the account
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // Create lms_users row linked to auth user
    const { data: lmsUser, error: lmsError } = await supabaseAdmin
      .from('lms_users')
      .insert({
        auth_user_id: authData.user.id,
        company_id,
        email: email.trim().toLowerCase(),
        username: username.trim(),
        full_name: full_name.trim(),
        job_title: job_title?.trim() || null,
        must_change_pw: true,
        active: true,
      })
      .select()
      .single()

    if (lmsError) {
      // Roll back auth user if lms_users insert fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: lmsError.message }, { status: 400 })
    }

    return NextResponse.json({ user: lmsUser }, { status: 201 })

  } catch (err) {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}

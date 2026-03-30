import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { user_id, auth_user_id } = await request.json()

    if (!user_id || !auth_user_id) {
      return NextResponse.json({ error: 'Missing user_id or auth_user_id.' }, { status: 400 })
    }

    // Deactivate in lms_users (soft delete — preserves completion records)
    const { error: deactivateError } = await supabaseAdmin
      .from('lms_users')
      .update({ active: false })
      .eq('id', user_id)

    if (deactivateError) {
      return NextResponse.json({ error: deactivateError.message }, { status: 400 })
    }

    // Ban in Supabase Auth so they can't log in
    const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(
      auth_user_id,
      { ban_duration: '876600h' } // 100 years = effectively permanent
    )

    if (banError) {
      return NextResponse.json({ error: banError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })

  } catch (err) {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}

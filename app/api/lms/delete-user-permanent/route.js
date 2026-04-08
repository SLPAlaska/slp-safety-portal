// app/api/lms/delete-user-permanent/route.js
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function DELETE(req) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  try {
    const { user_id } = await req.json()
    if (!user_id) {
      return NextResponse.json({ error: 'user_id required' }, { status: 400 })
    }

    // Delete related records first
    await supabaseAdmin.from('lms_completions').delete().eq('user_id', user_id)
    await supabaseAdmin.from('lms_certificates').delete().eq('user_id', user_id)
    await supabaseAdmin.from('lms_individual_assignments').delete().eq('user_id', user_id)
    await supabaseAdmin.from('lms_sessions').delete().eq('user_id', user_id)

    // Delete lms_users record
    const { error: dbError } = await supabaseAdmin
      .from('lms_users')
      .delete()
      .eq('id', user_id)

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 400 })
    }

    // Delete Supabase Auth user
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(user_id)
    if (authError) {
      // Log but don't fail — lms record is already gone
      console.error('Auth delete error:', authError.message)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

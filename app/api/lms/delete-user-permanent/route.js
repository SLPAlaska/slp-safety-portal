// app/api/lms/delete-user-permanent/route.js
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/requireAdmin'

// Super-admin only. This erases a learner's completions, certificates,
// assignments, sessions, lms_users row and Auth account - the whole training
// record, which IS the compliance artifact. Until 2026-09-18 it ran for any
// anonymous caller who knew the URL.
export async function DELETE(req) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const auth = await requireAdmin(req, supabaseAdmin)
  if (!auth.ok) return auth.response

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

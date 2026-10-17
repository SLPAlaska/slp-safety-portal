import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { requireAdminRequest } from '@/lib/requireAdmin'

export async function GET(request) {
  const auth = await requireAdminRequest(request, { allowCompanyAdmin: true })
  if (!auth.ok) return auth.response
  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const { data, error } = await supabaseAdmin.from('lms_courses')
    .select('*, lms_slides(count)').order('title')
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ courses: data })
}

export async function PATCH(request) {
  const auth = await requireAdminRequest(request)
  if (!auth.ok) return auth.response
  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  try {
    const { id, active } = await request.json()
    if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 })
    const { error } = await supabaseAdmin.from('lms_courses').update({ active }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch { return NextResponse.json({ error: 'Server error.' }, { status: 500 }) }
}

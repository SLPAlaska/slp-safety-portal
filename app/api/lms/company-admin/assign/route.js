import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const authHeader = request.headers.get('authorization')
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: adminUser } = await supabaseAdmin
    .from('lms_users')
    .select('id, company_id, role')
    .eq('auth_user_id', user.id)
    .single()

  if (!adminUser || adminUser.role !== 'company_admin')
    return NextResponse.json({ error: 'Access denied.' }, { status: 403 })

  const { user_id, course_id, action } = await request.json()
  if (!user_id || !course_id) return NextResponse.json({ error: 'Missing fields.' }, { status: 400 })

  // Verify employee belongs to same company
  const { data: employee } = await supabaseAdmin
    .from('lms_users')
    .select('id, company_id')
    .eq('id', user_id)
    .single()

  if (!employee || employee.company_id !== adminUser.company_id)
    return NextResponse.json({ error: 'Employee not in your company.' }, { status: 403 })

  if (action === 'remove') {
    const { error } = await supabaseAdmin
      .from('lms_individual_assignments')
      .delete()
      .eq('user_id', user_id)
      .eq('course_id', course_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  }

  // Assign
  const { error } = await supabaseAdmin
    .from('lms_individual_assignments')
    .insert({ user_id, course_id })
  if (error) {
    const msg = error.message.includes('unique') ? 'Already assigned.' : error.message
    return NextResponse.json({ error: msg }, { status: 400 })
  }
  return NextResponse.json({ success: true })
}

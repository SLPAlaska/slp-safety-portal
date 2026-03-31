import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request) {
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
    .select('id, company_id, role, lms_companies(name)')
    .eq('auth_user_id', user.id)
    .single()

  if (!adminUser || adminUser.role !== 'company_admin')
    return NextResponse.json({ error: 'Access denied.' }, { status: 403 })

  // Get all employees
  const { data: employees } = await supabaseAdmin
    .from('lms_users')
    .select('id, full_name, job_title')
    .eq('company_id', adminUser.company_id)
    .eq('active', true)
    .neq('role', 'company_admin')
    .order('full_name')

  const employeeIds = (employees || []).map(e => e.id)

  // Get required courses
  const { data: required } = await supabaseAdmin
    .from('lms_required_courses')
    .select('course_id, lms_courses(id, title)')
    .eq('company_id', adminUser.company_id)

  // Get individual assignments
  const { data: individual } = employeeIds.length > 0
    ? await supabaseAdmin
        .from('lms_individual_assignments')
        .select('user_id, course_id, lms_courses(id, title)')
        .in('user_id', employeeIds)
    : { data: [] }

  // Get completions
  const { data: completions } = employeeIds.length > 0
    ? await supabaseAdmin
        .from('lms_completions')
        .select('user_id, course_id, completed_at')
        .in('user_id', employeeIds)
    : { data: [] }

  return NextResponse.json({
    company_name: adminUser.lms_companies?.name || 'Company',
    employees: employees || [],
    required_courses: required || [],
    individual_assignments: individual || [],
    completions: completions || [],
    generated_at: new Date().toISOString(),
  })
}

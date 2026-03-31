import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  const { data, error } = await supabaseAdmin
    .from('lms_users')
    .select('*, lms_companies(name)')
    .order('full_name')
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ users: data })
}

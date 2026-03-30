import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const { data, error } = await supabaseAdmin.from('lms_companies').select('*').order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ companies: data })
}

export async function POST(request) {
  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  try {
    const { name, slug, notes } = await request.json()
    if (!name || !slug) return NextResponse.json({ error: 'Name and slug are required.' }, { status: 400 })
    const { data, error } = await supabaseAdmin.from('lms_companies')
      .insert({ name: name.trim(), slug: slug.trim(), notes: notes?.trim() || null, active: true })
      .select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ company: data }, { status: 201 })
  } catch { return NextResponse.json({ error: 'Server error.' }, { status: 500 }) }
}

export async function PATCH(request) {
  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  try {
    const { id, active } = await request.json()
    if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 })
    const { error } = await supabaseAdmin.from('lms_companies').update({ active }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch { return NextResponse.json({ error: 'Server error.' }, { status: 500 }) }
}

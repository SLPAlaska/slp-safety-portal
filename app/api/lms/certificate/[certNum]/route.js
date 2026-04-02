export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request, { params }) {
  const { certNum } = await params
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: cert, error } = await supabase
    .from('lms_certificates')
    .select('*')
    .eq('cert_number', certNum)
    .single()

  if (error || !cert) return NextResponse.json({ error: 'Certificate not found' }, { status: 404 })

  return NextResponse.json({ cert })
}

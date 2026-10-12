// GET /api/tha-closer -> who the signed-in person is for THA close-out
// (name, company from their LMS account, role). 401 when signed out.
// Read-only; the close itself is decided by /api/closeout.
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { resolveThaCloser } from '@/lib/thaCloseAccess'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://iypezirwdlqpptjpeeyf.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const scope = await resolveThaCloser(request, admin)
  if (!scope) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  return NextResponse.json({
    email: scope.email, fullName: scope.fullName, role: scope.role, isStaff: scope.isStaff,
    companyName: scope.companyName, companyNames: scope.companyNames,
  })
}

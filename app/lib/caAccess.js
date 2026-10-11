// app/lib/caAccess.js
//
// Who may see and close which investigation corrective actions (CAs).
//
// WHY THIS EXISTS
//
// The loud CA nag email (supabase/functions/send-ca-nags) tells a client
// action owner to "CLOSE THIS ACTION IN THE PORTAL" and links /corrective-actions.
// That page was portal_staff-only (AdminGate) and read the table with the anon
// key under staff-only RLS, so a client owner could never see or close the CA
// the email was about. On 11 Oct 2026 Pollard's supervisor (wlsup@acsalaska.net)
// got three nags for INC-2026-0040, could not open them, and ended up on the
// no-login THA picker instead.
//
// Adding client owners to portal_staff is not the fix: portal_staff is
// all-or-nothing and hands every tenant's investigations to that person.
//
// SCOPE (derived from the caller's own Supabase session, never from the request)
//
//   SLP staff (portal_staff or super admin) ... every CA.
//   Anyone signed in ......................... CAs whose action_owner_email is
//                                              their own verified sign-in email.
//   Active company_admin (lms_users) ......... additionally every CA on an
//                                              incident of their own company
//                                              (lms_companies.name or one of its
//                                              sail_company_names).
//
// FAIL CLOSED: no session -> 401; nothing matched -> zero rows, never all rows.

import { NextResponse } from 'next/server'
import { isSuperAdmin } from '@/lib/superAdmins'

function deny(status, error) {
  return { ok: false, status, error, response: NextResponse.json({ error }, { status }) }
}

export async function resolveCaScope(request, admin) {
  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
  if (!token) return deny(401, 'Not signed in')

  const { data, error } = await admin.auth.getUser(token)
  const user = data?.user
  if (error || !user || !user.email) return deny(401, 'Session invalid — please sign in again')
  const email = user.email.trim().toLowerCase()

  if (isSuperAdmin(email)) return { ok: true, user, email, isStaff: true, companyNames: [], companyName: null }
  const { data: staff } = await admin.from('portal_staff').select('email').eq('email', email).maybeSingle()
  if (staff) return { ok: true, user, email, isStaff: true, companyNames: [], companyName: null }

  let companyNames = []
  let companyName = null
  const { data: lmsUser } = await admin
    .from('lms_users')
    .select('role, active, company_id, lms_companies(name, sail_company_names)')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  if (lmsUser && lmsUser.role === 'company_admin' && lmsUser.active !== false && lmsUser.company_id) {
    const co = lmsUser.lms_companies || {}
    companyName = co.name || null
    const names = [co.name, ...(Array.isArray(co.sail_company_names) ? co.sail_company_names : [])]
    companyNames = [...new Set(names.filter((n) => typeof n === 'string' && n.trim()).map((n) => n.trim().toLowerCase()))]
  }
  return { ok: true, user, email, isStaff: false, companyNames, companyName }
}

export { caAccessReason, OWNER_STATUSES, STAFF_STATUSES, CLOSED_STATUSES } from './caRules.js'

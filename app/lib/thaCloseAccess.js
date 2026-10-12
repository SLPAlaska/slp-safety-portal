// app/lib/thaCloseAccess.js
//
// WHO is closing a THA, read from their own Supabase session (the Bearer token
// the page sends), never from the request body. Used by /api/closeout
// (closeTha) and /api/tha-closer (the "Signed in as ..." line on the page).
// The rule itself is decideThaClose() in app/lib/thaCloser.js.
//
//   SLP staff (super admin or portal_staff) ... isStaff, any company.
//   Active LMS user with a company ............ that company only
//                                               (lms_companies.name + sail_company_names).
//   Signed in, no active LMS company .......... companyNames [] -> cannot close.
//   No / bad token ............................ null -> signed out.

import { isSuperAdmin } from '@/lib/superAdmins'

export async function resolveThaCloser(request, admin) {
  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
  if (!token) return null
  const { data, error } = await admin.auth.getUser(token)
  const user = data?.user
  if (error || !user || !user.email) return null
  const email = user.email.trim().toLowerCase()

  let isStaff = isSuperAdmin(email)
  if (!isStaff) {
    const { data: staff } = await admin.from('portal_staff').select('email').eq('email', email).maybeSingle()
    isStaff = !!staff
  }

  // An auth user can in principle have more than one lms_users row; use the
  // active one with a company (a company_admin row wins over a learner row).
  const { data: rows } = await admin
    .from('lms_users')
    .select('full_name, role, active, company_id, lms_companies(name, sail_company_names)')
    .eq('auth_user_id', user.id)
    .limit(10)
  const usable = (rows || []).filter((r) => r && r.active !== false && r.company_id)
  const lmsUser = usable.find((r) => r.role === 'company_admin') || usable[0] || (rows || [])[0] || null

  let companyName = null
  let companyNames = []
  if (lmsUser && lmsUser.active !== false && lmsUser.company_id) {
    const co = lmsUser.lms_companies || {}
    companyName = co.name || null
    companyNames = [...new Set([co.name, ...(Array.isArray(co.sail_company_names) ? co.sail_company_names : [])]
      .filter((n) => typeof n === 'string' && n.trim()).map((n) => n.trim()))]
  }
  return {
    email,
    fullName: (lmsUser && lmsUser.full_name) || null,
    isStaff,
    role: lmsUser && lmsUser.active !== false ? (lmsUser.role || null) : null,
    companyName,
    companyNames,
  }
}

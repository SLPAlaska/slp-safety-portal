// app/lib/requireAdmin.js
//
// Server-side caller authorisation for the LMS admin API routes.
//
// WHY THIS EXISTS
//
// Until 2026-09-18, 28 of the 49 routes under /api/lms and /api/game/admin had
// no auth check of any kind. They build a service-role Supabase client, which
// bypasses RLS entirely, and then act on whatever the request body says. An
// anonymous GET of /api/lms/users returned all 379 learners across all 14
// client companies, and an anonymous DELETE of /api/lms/delete-user-permanent
// would erase any learner's training record.
//
// The pages that call those routes gate themselves in the browser
// (app/admin/lms/page.js checks isSuperAdmin before rendering), and
// proxy.js is a no-op that matches only /lms/:path* — neither does anything
// about a direct call to the route. Client-side gating is a UI convenience,
// never an access control.
//
// WHERE THE ROLE LIVES
//
// Platform super admins are an explicit EMAIL allowlist in
// app/lib/superAdmins.js. Never a domain check: real learners hold
// @slpalaska.com addresses too, so a suffix test would hand the platform to
// any of them.
//
// Company admins are identified by `lms_users.role === 'company_admin'`, keyed
// on `auth_user_id`, which is the model app/api/lms/company-admin/* already
// uses. A database column is a safe place for this in a way `user_metadata`
// would not be — `supabase.auth.updateUser({ data: ... })` lets a signed-in
// user rewrite their own user_metadata, so a role kept there is self-granted.
// `lms_users` is only writable by the service role.
//
// That last point has a live caveat worth keeping in view: PATCH
// /api/lms/users writes `role` and is one of the routes this helper is being
// added to. Until that route is protected, the role this helper trusts is
// itself attacker-writable, and every check here can be walked around by
// promoting yourself first. The two fixes only mean anything together.

import { NextResponse } from 'next/server'
import { isSuperAdmin } from '@/lib/superAdmins'

/** Shape returned when the caller is refused. */
function deny(status, error) {
  return { ok: false, status, error, response: NextResponse.json({ error }, { status }) }
}

/**
 * Authorise the caller of an admin route.
 *
 * @param {Request} request        the incoming request
 * @param {object}  supabaseAdmin  a service-role Supabase client
 * @param {object}  [opts]
 * @param {boolean} [opts.allowCompanyAdmin=false]
 *        When true, an active `company_admin` is accepted in addition to a
 *        platform super admin, and the result carries the company_id their
 *        actions must be confined to. Pass this ONLY for routes a company
 *        admin legitimately calls; the caller still has to enforce the scope
 *        with assertSameCompany().
 *
 * @returns {Promise<
 *   { ok: true, user: object, isSuper: boolean, companyId: string|null, role: string }
 * | { ok: false, status: number, error: string, response: NextResponse }>}
 *
 * On refusal the `response` is ready to return as-is:
 *
 *   const auth = await requireAdmin(request, supabaseAdmin)
 *   if (!auth.ok) return auth.response
 */
export async function requireAdmin(request, supabaseAdmin, opts = {}) {
  const { allowCompanyAdmin = false } = opts

  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
  if (!token) return deny(401, 'Not signed in')

  const { data, error } = await supabaseAdmin.auth.getUser(token)
  const user = data?.user
  if (error || !user) return deny(401, 'Session invalid — please sign in again')

  // Platform super admin: everything, every company.
  if (isSuperAdmin(user.email)) {
    return { ok: true, user, isSuper: true, companyId: null, role: 'super_admin' }
  }

  if (!allowCompanyAdmin) return deny(403, 'Not authorized')

  const { data: lmsUser, error: lookupErr } = await supabaseAdmin
    .from('lms_users')
    .select('id, role, company_id, active')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (lookupErr || !lmsUser) return deny(403, 'Not authorized')
  if (lmsUser.role !== 'company_admin') return deny(403, 'Not authorized')
  // A deactivated admin keeps their login until it is revoked; they must not
  // keep their authority with it.
  if (lmsUser.active === false) return deny(403, 'Not authorized')
  // A company admin with no company would otherwise be unscoped, and
  // assertSameCompany would compare null to null and pass.
  if (!lmsUser.company_id) return deny(403, 'Not authorized')

  return {
    ok: true,
    user,
    isSuper: false,
    companyId: lmsUser.company_id,
    role: 'company_admin',
    lmsUser,
  }
}

/**
 * Confine a company admin to their own tenant.
 *
 * Returns null when the action is allowed, or a ready-to-return 403.
 * A super admin passes every time; a company admin passes only when
 * `targetCompanyId` matches the company their role is bound to.
 *
 * Refuses a missing targetCompanyId rather than treating it as "no company to
 * check": an unknown target is the case where scoping matters most.
 */
export function assertSameCompany(auth, targetCompanyId) {
  if (auth.isSuper) return null
  if (!targetCompanyId || targetCompanyId !== auth.companyId) {
    return NextResponse.json({ error: 'Not authorized for this company' }, { status: 403 })
  }
  return null
}

/**
 * The company_id of the row a company admin is acting on, read from the
 * DATABASE rather than from the request body.
 *
 * Taking it from the body would defeat the whole check: the caller would
 * simply send their own company_id alongside another company's user_id.
 */
export async function companyIdOfUser(supabaseAdmin, lmsUserId) {
  if (!lmsUserId) return null
  const { data } = await supabaseAdmin
    .from('lms_users')
    .select('company_id')
    .eq('id', lmsUserId)
    .maybeSingle()
  return data?.company_id || null
}

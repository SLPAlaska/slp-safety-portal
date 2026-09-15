// app/lib/game-admin.js
//
// Who may administer the game: platform super admins, and MagTec's own
// company admins. Both use their normal portal session (Bearer access token) —
// the magic-link game token is a player credential and is never accepted here.
//
// Super admins are identified by exact email against app/lib/superAdmins.js,
// never by @slpalaska.com domain: real learners hold that domain too.

import { isSuperAdmin } from '@/lib/superAdmins'
import { MAGTEC_COMPANY_ID, gameAdminClient } from '@/lib/game-auth'

/**
 * Resolve a request to a game administrator.
 *
 * Returns { ok: true, level: 'super'|'company', companyId, user } or
 * { ok: false, status, code }. `companyId` is the company whose data they may
 * see — MagTec for both today, since MagTec is the only company with a game.
 */
export async function resolveGameAdmin(request) {
  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return { ok: false, status: 401, code: 'unauthorized' }

  const supabase = gameAdminClient()
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return { ok: false, status: 401, code: 'unauthorized' }

  if (isSuperAdmin(user.email)) {
    return { ok: true, level: 'super', companyId: MAGTEC_COMPANY_ID, user: null }
  }

  const { data: lmsUser } = await supabase
    .from('lms_users')
    .select('id, full_name, role, company_id, active')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!lmsUser || !lmsUser.active || lmsUser.role !== 'company_admin') {
    return { ok: false, status: 403, code: 'forbidden' }
  }
  // A company admin at another company has no game to administer.
  if (lmsUser.company_id !== MAGTEC_COMPANY_ID) {
    return { ok: false, status: 403, code: 'company' }
  }

  return { ok: true, level: 'company', companyId: lmsUser.company_id, user: lmsUser }
}

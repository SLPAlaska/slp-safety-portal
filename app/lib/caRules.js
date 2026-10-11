// app/lib/caRules.js — pure CA access rules (no imports), shared by
// app/lib/caAccess.js and scripts/check-ca-access.mjs.

/** Why this caller may touch this CA, or null when they may not. */
export function caAccessReason(scope, ca, incident) {
  if (scope.isStaff) return 'staff'
  // action_owner_email sometimes holds several addresses ("a@x.com b@y.com").
  const owners = String(ca.action_owner_email || '').toLowerCase().split(/[\s,;]+/).filter(Boolean)
  if (scope.email && owners.includes(scope.email)) return 'owner'
  const co = (incident?.company_name || '').trim().toLowerCase()
  if (co && scope.companyNames.includes(co)) return 'company_admin'
  return null
}

// Statuses a non-staff owner / company admin may set. Verified (effectiveness
// check) and Void stay with SLP staff.
export const OWNER_STATUSES = ['Open', 'In Progress', 'Completed']
export const STAFF_STATUSES = ['Open', 'In Progress', 'Completed', 'Verified', 'Void']
export const CLOSED_STATUSES = ['completed', 'complete', 'verified', 'verified effective', 'closed', 'cancelled', 'canceled', 'void']

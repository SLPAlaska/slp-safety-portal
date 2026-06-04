// app/lib/superAdmins.js
//
// Single source of truth for who is a platform Super Admin.
//
// IMPORTANT: Membership is by EXACT email address, NOT by @slpalaska.com
// domain — real learners also have @slpalaska.com emails, so a domain check
// would wrongly grant them super-admin access.
//
// To add or remove a super admin, edit the SUPER_ADMIN_EMAILS list below.
// Every page and API route that needs the check imports from this file, so
// this is the only place that ever needs to change.

export const SUPER_ADMIN_EMAILS = [
  'brian@slpalaska.com',
  'britney@slpalaska.com',
]

/**
 * Returns true if the given email belongs to a platform Super Admin.
 * Case-insensitive; safely handles null/undefined.
 */
export function isSuperAdmin(email) {
  if (!email) return false
  return SUPER_ADMIN_EMAILS.includes(email.trim().toLowerCase())
}

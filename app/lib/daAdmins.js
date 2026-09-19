// app/lib/daAdmins.js
//
// Single source of truth for who on the SLP Alaska side reaches the Drug &
// Alcohol console. These three are SLP Alaska's C/TPA D&A Administrators.
//
// WHY THIS IS ITS OWN LIST
//
// Not portal_staff: that table holds nine people and grants all of them every
// gated management page. Six of them have no business in drug and alcohol
// records, and two of those six — Daniel and Todd — are company admins at
// MagTec, so portal_staff would hand a client's own staff another client's
// testing data.
//
// Not a domain check either, for the reason app/lib/superAdmins.js already
// warns about: real learners hold @slpalaska.com addresses, so a suffix test
// grants the platform to anyone the LMS onboards.
//
// Not superAdmins.js either. That list is about platform administration;
// this one is about a regulated function. They overlap today and will not
// always, and merging them would mean adding a super admin silently adds a
// D&A administrator.
//
// So: exact email match, same pattern as superAdmins.js, its own list.
//
// WHAT THIS IS NOT
//
// This is the SLP side only. A client's Designated Employer Representative
// reaches their OWN client's records through da_client_ders, and is never
// added here. Adding a client DER to this list would give them every client's
// data, which is the opposite of what a DER is.

export const DA_ADMIN_EMAILS = [
  'brian@slpalaska.com',
  'britney@slpalaska.com',
  'krystal@slpalaska.com',
]

/**
 * True only for an SLP Alaska C/TPA D&A Administrator.
 *
 * Case-insensitive and whitespace-tolerant, because the value arrives from a
 * verified JWT claim rather than from a form, and a stray space should fail
 * closed on a typo rather than on a copy-paste.
 */
export function isDaAdmin(email) {
  if (!email) return false
  return DA_ADMIN_EMAILS.includes(String(email).trim().toLowerCase())
}

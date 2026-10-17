// app/lib/investigatorAuth.js
//
// Single source of truth for who may work on investigations, and for the
// first-sign-in password rules. Imported by both the workbench page and
// /api/spellcheck so the browser and the server cannot drift apart.
//
// WHERE THE ROLE LIVES, AND WHY IT MATTERS
//
// The role is read from `app_metadata`, never `user_metadata`.
//
// `user_metadata` is writable by the signed-in user: any authenticated caller
// can run `supabase.auth.updateUser({ data: { role: 'investigator' } })` and
// rewrite it. A role kept there is self-granted privilege — reading it
// server-side does not help, because the value the server reads is the value
// the client wrote. `app_metadata` is writable only by the service role
// (`auth.admin.updateUserById`), so it is the only one of the two that can
// carry an authorisation decision.
//
// `must_change_password` is deliberately the other way round: it lives in
// `user_metadata` precisely because the user must be able to clear it with
// `updateUser` once they have chosen a new password. Clearing it early only
// lets someone skip their own password change, which costs them and nobody
// else — it grants no access.

export const INVESTIGATOR_ROLE = 'investigator'

// There is deliberately no fixed temporary password here any more. The forced
// change is driven by user_metadata.must_change_password (below), not by the
// value of the password, so the workbench does not need to know it. The admin
// who provisions or resets the account chooses the temporary password; the
// "pick a different one" rule compares against the password typed at sign-in
// in this tab (kept in memory only), and Supabase Auth itself also refuses a
// new password equal to the current one.

export const MIN_PASSWORD_LENGTH = 10

/**
 * True only when the verified user carries the investigator role in
 * app_metadata. Pass the user object from `supabase.auth.getUser(token)` or
 * from a session — never a role the client handed over separately.
 */
export function isInvestigator(user) {
  return user?.app_metadata?.role === INVESTIGATOR_ROLE
}

/** True when this account still has to choose a password of its own. */
export function mustChangePassword(user) {
  return user?.user_metadata?.must_change_password === true
}

/**
 * Rules for the password chosen at first sign-in.
 * Returns { ok: true } or { ok: false, error: '<message for the person>' }.
 */
export function validateNewPassword(password, confirmation, previous) {
  if (!password) {
    return { ok: false, error: 'Enter a new password.' }
  }
  if (previous && password === previous) {
    return { ok: false, error: 'Choose a password other than the temporary one.' }
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: `Use at least ${MIN_PASSWORD_LENGTH} characters.` }
  }
  if (confirmation !== undefined && password !== confirmation) {
    return { ok: false, error: 'The two passwords do not match.' }
  }
  return { ok: true }
}

/** Shown when someone authenticates but holds no investigator role. */
export const NOT_AUTHORIZED_MESSAGE =
  'This account is not authorized for investigations. Contact a safety administrator if you need access.'

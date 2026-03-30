import { createClient } from '@supabase/supabase-js'

/**
 * Returns the current learner's lms_users row from their Supabase session.
 * Use this in any LMS server component or API route.
 *
 * Returns null if:
 *  - No active session
 *  - Session belongs to an admin (@slpalaska.com) — they don't have an lms_users row
 *  - lms_users row not found (account deactivated or not yet created)
 */
export async function getLmsUser(supabaseClient) {
  const { data: { user }, error: authError } = await supabaseClient.auth.getUser()

  if (authError || !user) return null

  // Admins are not learners
  if (user.email?.endsWith('@slpalaska.com')) return null

  const { data: lmsUser, error } = await supabaseClient
    .from('lms_users')
    .select(`
      id,
      full_name,
      username,
      email,
      job_title,
      active,
      must_change_pw,
      company_id,
      lms_companies (
        id,
        name,
        slug
      )
    `)
    .eq('auth_user_id', user.id)
    .single()

  if (error || !lmsUser) return null
  if (!lmsUser.active) return null

  return lmsUser
}

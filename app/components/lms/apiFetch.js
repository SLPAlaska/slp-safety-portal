'use client'
// app/components/lms/apiFetch.js
// fetch() with the learner's Supabase session token attached, for the /api/competency routes.
// Uses the portal's existing browser client (lib/supabase.js), the same session the LMS pages use.
// On a 401 it refreshes the session once and retries, so an expired token does not strand a learner mid-unit.
import { supabase } from '../../../lib/supabase'

async function withToken(opts, token) {
  const headers = { ...(opts.headers || {}) }
  if (token) headers.Authorization = `Bearer ${token}`
  return { ...opts, headers }
}

export async function apiFetch(url, opts = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  let res = await fetch(url, await withToken(opts, session?.access_token))
  if (res.status === 401 && session) {
    const { data: refreshed } = await supabase.auth.refreshSession()
    const tok = refreshed?.session?.access_token
    if (tok) res = await fetch(url, await withToken(opts, tok))
  }
  return res
}

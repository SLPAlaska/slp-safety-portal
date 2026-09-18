'use client';
// app/lib/authFetch.js
//
// fetch() that carries the signed-in user's Supabase access token.
//
// The LMS admin routes verify a Bearer token server-side (app/lib/requireAdmin.js).
// Before 2026-09-18 they verified nothing, so the pages calling them sent no
// token and still worked. Every caller of a protected route has to go through
// here, or it gets a 401.
//
// ONE CLIENT, DELIBERATELY
//
// This reuses the same `globalThis.__slpAuthClient` singleton AdminGate
// creates, with the same lock-free config. Portal pages each build their own
// Supabase client, and they all contend for the shared browser auth lock; a
// second client here would join that fight and getSession() could stall behind
// it. Sharing the one lock-free instance avoids it entirely.

import { createClient } from '@supabase/supabase-js';

function client() {
  if (typeof globalThis !== 'undefined' && globalThis.__slpAuthClient) {
    return globalThis.__slpAuthClient;
  }
  const c = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { lock: async (_name, _timeout, fn) => await fn() } }
  );
  if (typeof globalThis !== 'undefined') globalThis.__slpAuthClient = c;
  return c;
}

/**
 * The current access token, or null when signed out.
 *
 * Falls back to reading the Supabase session straight out of localStorage if
 * getSession() throws — which it can when another client holds the auth lock.
 * A page that is visibly signed in should not fail its data load because a
 * lock was busy.
 */
export async function getAccessToken() {
  try {
    const { data: { session } } = await client().auth.getSession();
    if (session?.access_token) return session.access_token;
  } catch {}
  try {
    const key = Object.keys(localStorage)
      .find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
    if (key) return JSON.parse(localStorage.getItem(key))?.access_token || null;
  } catch {}
  return null;
}

/**
 * Drop-in replacement for fetch() on a route that requires an admin.
 *
 * Sends the token when there is one and omits the header when there is not,
 * so the route answers 401 rather than the browser sending "Bearer undefined".
 */
export async function authFetch(url, init = {}) {
  const token = await getAccessToken();
  return fetch(url, {
    ...init,
    headers: {
      ...(init.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

export default authFetch;

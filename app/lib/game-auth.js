// app/lib/game-auth.js
//
// Server-side auth for Run the Job (/game and /api/game/*).
//
// A player reaches the game one of two ways, and both end at the same place —
// an lms_users row plus a `source` label that says which door they came in:
//
//   'portal'     — a logged-in LMS session. The browser sends its Supabase
//                  access token as a Bearer header, exactly like every other
//                  /api/lms/learner route, and it is verified the same way.
//   'magic_link' — a signed ?t= token from the weekly reminder email. No
//                  password: the signature IS the proof, so the token has to
//                  be short-lived and scoped.
//
// The magic-link token is an HS256 JWT — the same algorithm and wire format
// Supabase issues, so anything that can already read a Supabase token can read
// this one — signed with GAME_LINK_SECRET rather than the project's JWT
// secret. It is deliberately NOT a Supabase session token: it grants exactly
// one thing, playing the game as one user, and it cannot be exchanged for
// access to that user's training records, certificates, or anything else.
//
// GAME_LINK_SECRET must be set in BOTH places or the links are dead on
// arrival: the Vercel project (this route signs nothing, but verifies here)
// and the Supabase Edge Function secrets (send-training-reminders signs the
// links there). Same value in both. A mismatch fails closed — every link
// reads as an invalid signature.

import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

/** MagTec Alaska. The only company the game is live for right now. */
export const MAGTEC_COMPANY_ID = 'c1fd7a04-99e6-401a-8cf8-f88f8d7cea35'

/**
 * How long an emailed link stays good. The reminder goes out weekly, so this
 * covers the gap to the next email with room for a hitch week, and still
 * expires well inside a season — a link forwarded out of someone's inbox is a
 * password-free door, and it should not stay open forever.
 */
export const GAME_TOKEN_TTL_DAYS = 14

// Created lazily so the service-role key is only required at request time and
// not at module load, which would break `next build`'s page-data collection.
let _admin = null
function admin() {
  if (!_admin) {
    _admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
  }
  return _admin
}

const b64url = (buf) => Buffer.from(buf).toString('base64url')
const fromB64url = (s) => Buffer.from(s, 'base64url')

function secret() {
  const s = process.env.GAME_LINK_SECRET
  return s && s.length >= 20 ? s : null
}

/**
 * Sign a game magic-link token. Mirrors the signer in
 * supabase/functions/send-training-reminders/index.ts — keep the two in step.
 */
export function signGameToken(userId, ttlDays = GAME_TOKEN_TTL_DAYS) {
  const key = secret()
  if (!key) throw new Error('GAME_LINK_SECRET is not set')
  const now = Math.floor(Date.now() / 1000)
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = b64url(JSON.stringify({
    sub: userId,
    scope: 'game',
    iat: now,
    exp: now + ttlDays * 24 * 60 * 60,
  }))
  const data = `${header}.${payload}`
  const sig = b64url(crypto.createHmac('sha256', key).update(data).digest())
  return `${data}.${sig}`
}

/**
 * Verify a game magic-link token. Returns the lms_users id, or null for
 * anything at all wrong with it — bad shape, wrong algorithm, bad signature,
 * wrong scope, or expired. Never throws on a malformed token; a garbled link
 * out of an email client is an expected input, not an exception.
 */
export function verifyGameToken(token) {
  const key = secret()
  if (!key || typeof token !== 'string') return null

  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [header, payload, sig] = parts

  let head
  try { head = JSON.parse(fromB64url(header).toString('utf8')) } catch { return null }
  // Pin the algorithm. Accepting whatever the token names is how "alg":"none"
  // turns a signature check into a formality.
  if (!head || head.alg !== 'HS256') return null

  const expected = crypto.createHmac('sha256', key).update(`${header}.${payload}`).digest()
  const given = fromB64url(sig)
  if (given.length !== expected.length) return null
  if (!crypto.timingSafeEqual(given, expected)) return null

  let body
  try { body = JSON.parse(fromB64url(payload).toString('utf8')) } catch { return null }
  if (!body || body.scope !== 'game' || !body.sub) return null
  if (!Number.isFinite(body.exp) || body.exp < Math.floor(Date.now() / 1000)) return null

  return body.sub
}

async function loadLmsUser(match) {
  const { data } = await admin()
    .from('lms_users')
    .select('id, full_name, email, active, company_id, lms_companies (id, name)')
    .match(match)
    .maybeSingle()
  return data || null
}

/**
 * Work out who is playing.
 *
 * Checks the magic-link token first: someone who followed this week's link
 * should get in on the strength of that link even if a stale LMS session is
 * also sitting in the browser, and `source` should say magic_link — otherwise
 * the numbers can never answer whether the email is what drives play.
 *
 * Returns { ok: true, user, source } or { ok: false, status, code } where code
 * is one of: config | unauthorized | inactive | company.
 */
export async function resolveGamePlayer(request, bodyToken) {
  if (!secret()) return { ok: false, status: 500, code: 'config' }

  const url = new URL(request.url)
  const linkToken =
    bodyToken || request.headers.get('x-game-token') || url.searchParams.get('t')

  let user = null
  let source = null

  if (linkToken) {
    const userId = verifyGameToken(linkToken)
    if (userId) {
      user = await loadLmsUser({ id: userId })
      source = 'magic_link'
    }
  }

  if (!user) {
    const authHeader = request.headers.get('authorization') || ''
    const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (accessToken) {
      const { data: { user: authUser } } = await admin().auth.getUser(accessToken)
      if (authUser) {
        user = await loadLmsUser({ auth_user_id: authUser.id })
        source = 'portal'
      }
    }
  }

  if (!user) return { ok: false, status: 401, code: 'unauthorized' }
  if (!user.active) return { ok: false, status: 403, code: 'inactive' }
  if (user.company_id !== MAGTEC_COMPANY_ID) {
    return {
      ok: false,
      status: 403,
      code: 'company',
      company: user.lms_companies?.name || null,
    }
  }

  return { ok: true, user, source }
}

/** The service-role client, for routes that need to read or write game rows. */
export function gameAdminClient() {
  return admin()
}

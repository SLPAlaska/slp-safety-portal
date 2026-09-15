// POST /api/game/session
//
// Who is playing, and how did they get here? The /game page calls this before
// it renders anything, because the answer decides which of three things the
// player sees: the game, a "sign in" prompt, or the not-yet-for-your-company
// notice.
//
// Nothing here is secret enough to need a session cookie of its own — the
// caller re-presents its token (link token or Supabase Bearer) on every
// subsequent request, and each route re-resolves it from scratch.
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { resolveGamePlayer } from '@/lib/game-auth'

export async function POST(request) {
  let body = {}
  try { body = await request.json() } catch { /* token may be in a header */ }

  const auth = await resolveGamePlayer(request, body.t)
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.code, company: auth.company || null },
      { status: auth.status },
    )
  }

  return NextResponse.json({
    player: {
      name: auth.user.full_name || 'Operator',
      company: auth.user.lms_companies?.name || 'MagTec Alaska',
    },
    source: auth.source,
  })
}

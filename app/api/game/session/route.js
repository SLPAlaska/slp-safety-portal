// POST /api/game/session
//
// Who is playing, how did they get here, what deck is featured this week, and
// which crew are they on? The /game page calls this before it renders
// anything, because the answer decides what it shows: the game, the crew
// picker, a "sign in" prompt, or the not-yet-for-your-company notice.
//
// Nothing here needs a session cookie of its own — the caller re-presents its
// token (link token or Supabase Bearer) on every later request, and each route
// re-resolves it from scratch.
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { resolveGamePlayer, gameAdminClient, MAGTEC_COMPANY_ID } from '@/lib/game-auth'
import { resolveFeaturedDeck } from '@/lib/game/featured'
import DECKS from '@/lib/game/decks.json'

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

  const supabase = gameAdminClient()

  // The featured deck resolve also re-syncs the deck roster into
  // lms_game_config, which is how the Monday email learns about a deck that
  // was added since the last send.
  const featured = await resolveFeaturedDeck(supabase, DECKS)

  const [{ data: crews }, { data: membership }] = await Promise.all([
    supabase
      .from('lms_game_crews')
      .select('id, name, lead_user_id')
      .eq('company_id', MAGTEC_COMPANY_ID)
      .order('name'),
    supabase
      .from('lms_game_crew_members')
      .select('crew_id, assigned_by_admin, lms_game_crews (id, name)')
      .eq('user_id', auth.user.id)
      .maybeSingle(),
  ])

  const crewList = crews || []

  return NextResponse.json({
    player: {
      name: auth.user.full_name || 'Operator',
      company: auth.user.lms_companies?.name || 'MagTec Alaska',
    },
    source: auth.source,
    featured,
    crews: crewList.map((c) => ({ id: c.id, name: c.name })),
    crew: membership
      ? {
          id: membership.crew_id,
          name: membership.lms_game_crews?.name || null,
          assigned_by_admin: membership.assigned_by_admin,
        }
      : null,
    // Ask for a crew only when there is something to pick. A company with no
    // crews yet should not be shown an empty list and a dead end.
    needs_crew: !membership && crewList.length > 0,
  })
}

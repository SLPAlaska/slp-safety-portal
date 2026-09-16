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
import { resolveAllBoards, DEFAULT_BOARD, safeBoard } from '@/lib/game/featured'
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

  // Resolving every board re-syncs each board's roster into lms_game_config,
  // which is how the Monday email learns about a deck added since the last
  // send. Both boards are published on any visit, so a board nobody opened
  // this week is not left advertising last week's roster.
  const boards = await resolveAllBoards(supabase, DECKS)

  const [{ data: crews }, { data: membership }] = await Promise.all([
    supabase
      .from('lms_game_crews')
      .select('id, name, lead_user_id, board')
      .eq('company_id', MAGTEC_COMPANY_ID)
      .order('name'),
    supabase
      .from('lms_game_crew_members')
      .select('crew_id, assigned_by_admin, lms_game_crews (id, name, board)')
      .eq('user_id', auth.user.id)
      .maybeSingle(),
  ])

  // The board follows the crew. A player with no crew defaults to drilling —
  // today every crew is a drilling crew and no Kenai crews exist yet, so this
  // is the right default until shop rosters arrive.
  const board = safeBoard(membership?.lms_game_crews?.board || DEFAULT_BOARD)
  const featured = boards[board]

  const crewList = crews || []

  return NextResponse.json({
    player: {
      name: auth.user.full_name || 'Operator',
      company: auth.user.lms_companies?.name || 'MagTec Alaska',
    },
    source: auth.source,
    board,
    featured,
    crews: crewList.map((c) => ({ id: c.id, name: c.name, board: safeBoard(c.board) })),
    crew: membership
      ? {
          id: membership.crew_id,
          name: membership.lms_game_crews?.name || null,
          board: safeBoard(membership.lms_game_crews?.board),
          assigned_by_admin: membership.assigned_by_admin,
        }
      : null,
    // Ask for a crew only when there is something to pick. A company with no
    // crews yet should not be shown an empty list and a dead end.
    needs_crew: !membership && crewList.length > 0,
  })
}

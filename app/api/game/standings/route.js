// POST /api/game/standings
//
// Two boards, both MagTec-only:
//
//   individual — all-time personal bests on the deck just played. Top 10 by
//                payout, faster run breaks the tie, one row per person so an
//                operator who played ten times cannot own the whole list.
//
//   crew       — THIS WEEK on the FEATURED deck. A crew's score is the sum of
//                its members' best runs this week divided by TOTAL rostered
//                members, so someone who did not run counts as a zero. That is
//                deliberate: the board is meant to move a crew to go get its
//                people, not to reward the crew with one keen operator. It is
//                shown split into its two honest halves — skill average and
//                participation rate — because a crew that is slow but fully
//                turned out and a crew of two aces read very differently and
//                the single number hides which one you are.
//
//                There are no off-week exclusions. Off-hitch employees stay in
//                the denominator and their runs count from wherever they are.
//
// Participation is reported alongside rank, never folded into it beyond the
// zero rule above.
//
// The crew half is behind crew_standings_enabled (default false, see
// app/lib/game/flags.js). While it is off this route returns crew: null and
// does not run the crew queries at all — the board is withheld at the source
// rather than hidden in the client, so a crew's score is not sitting in a
// response for anyone who opens the network tab before launch. Individual bests
// and drawing entries are unaffected.
//
// MagTec is enforced by the inner join on lms_users.company_id, not by
// filtering after the fact, so another company's run can never reach the
// response even if one somehow lands in the table.
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { resolveGamePlayer, gameAdminClient, MAGTEC_COMPANY_ID } from '@/lib/game-auth'
import { pageAll } from '@/lib/supabasePage'
import { resolveFeaturedDeck, DEFAULT_BOARD, safeBoard } from '@/lib/game/featured'
import { scoreCrews } from '@/lib/game/crewScore'
import { readFlag, CREW_STANDINGS_ENABLED } from '@/lib/game/flags'
import { weekLabel } from '@/lib/game/week'
import DECKS from '@/lib/game/decks.json'

const TOP_N = 10

/** Better run: more coins, and on a tie the faster one. */
function beats(a, b) {
  if (!b) return true
  if (a.coins !== b.coins) return a.coins > b.coins
  return a.time_seconds < b.time_seconds
}

/** Every MagTec run on one deck, optionally restricted to one week. */
async function fetchRuns(supabase, deckId, weekStartDate) {
  return pageAll(() => {
    let q = supabase
      .from('lms_game_runs')
      .select('user_id, coins, time_seconds, lms_users!inner (full_name, company_id)')
      .eq('deck_id', deckId)
      .eq('lms_users.company_id', MAGTEC_COMPANY_ID)
    if (weekStartDate) q = q.eq('week_start', weekStartDate)
    return q
      .order('coins', { ascending: false })
      .order('time_seconds', { ascending: true })
      .order('user_id', { ascending: true })
  })
}

/** Best run per player out of a run list. */
function bestByUser(runs) {
  const best = new Map()
  const runCount = new Map()
  for (const r of runs || []) {
    runCount.set(r.user_id, (runCount.get(r.user_id) || 0) + 1)
    const row = {
      user_id: r.user_id,
      name: r.lms_users?.full_name || 'Operator',
      coins: r.coins,
      time_seconds: r.time_seconds,
    }
    if (beats(row, best.get(r.user_id))) best.set(r.user_id, row)
  }
  return { best, runCount }
}

export async function POST(request) {
  let body = {}
  try { body = await request.json() } catch { /* deck may be in the query string */ }

  const auth = await resolveGamePlayer(request, body.t)
  if (!auth.ok) return NextResponse.json({ error: auth.code }, { status: auth.status })

  const deckId = body.deck_id || new URL(request.url).searchParams.get('deck')
  const deck = DECKS.find((d) => d.id === deckId)
  if (!deck) return NextResponse.json({ error: 'unknown_deck' }, { status: 400 })

  const supabase = gameAdminClient()

  // The crew board is scoped to the player's OWN board. A shop hand is ranked
  // against shop crews on a Kenai deck; a drilling hand against drilling crews
  // on a drilling deck. The board follows the crew, and a player with no crew
  // is on the drilling board.
  const { data: myCrew } = await supabase
    .from('lms_game_crew_members')
    .select('crew_id, lms_game_crews (id, name, board)')
    .eq('user_id', auth.user.id)
    .maybeSingle()

  const board = safeBoard(myCrew?.lms_game_crews?.board || DEFAULT_BOARD)
  const featured = await resolveFeaturedDeck(supabase, DECKS, board)

  // The player's own entries in this week's hat. Shown on the board so the
  // drawing is visible rather than something they are told about later.
  const { data: myEntries } = await supabase
    .from('lms_game_drawing_entries')
    .select('deck_id, reason')
    .eq('user_id', auth.user.id)
    .eq('week_start', featured.week_start)

  // ── individual: all-time, the deck they just played
  const { data: allRuns, error } = await fetchRuns(supabase, deck.id, null)
  if (error) {
    console.error('standings read failed:', error.message)
    return NextResponse.json({ error: 'read_failed' }, { status: 500 })
  }

  const { best } = bestByUser(allRuns)
  const ranked = [...best.values()].sort((a, b) =>
    b.coins - a.coins || a.time_seconds - b.time_seconds || a.name.localeCompare(b.name))
  const meIndex = ranked.findIndex((r) => r.user_id === auth.user.id)
  const me = meIndex >= 0 ? ranked[meIndex] : null

  const individual = {
    deck_id: deck.id,
    top: ranked.slice(0, TOP_N).map((r) => ({
      name: r.name,
      coins: r.coins,
      time_seconds: r.time_seconds,
      is_you: r.user_id === auth.user.id,
    })),
    you: me ? { coins: me.coins, time_seconds: me.time_seconds, rank: meIndex + 1 } : null,
  }

  // ── crew: this week, featured deck
  //
  // Off until crew_standings_enabled is flipped. Read here rather than once at
  // module load so the switch is live the moment it is thrown.
  const crewStandingsEnabled = await readFlag(supabase, CREW_STANDINGS_ENABLED)

  let crew = null
  if (crewStandingsEnabled && featured.id) {
    const [crewsRes, membersRes, weekRunsRes] = await Promise.all([
      supabase
        .from('lms_game_crews')
        .select('id, name, lead_user_id, board')
        .eq('company_id', MAGTEC_COMPANY_ID)
        .eq('board', board)
        .order('name'),
      pageAll(() =>
        supabase
          .from('lms_game_crew_members')
          .select('crew_id, user_id, lms_users!inner (company_id)')
          .eq('lms_users.company_id', MAGTEC_COMPANY_ID)),
      fetchRuns(supabase, featured.id, featured.week_start),
    ])

    const crews = crewsRes.data || []
    const members = membersRes.data || []
    const { best: weekBest, runCount } = bestByUser(weekRunsRes.data)

    const memberIdsBy = new Map(crews.map((c) => [c.id, []]))
    let yourCrewId = null
    for (const m of members) {
      if (m.user_id === auth.user.id) yourCrewId = m.crew_id
      memberIdsBy.get(m.crew_id)?.push(m.user_id)
    }

    const rows = scoreCrews({
      crews, memberIdsBy, bestByUser: weekBest, runsByUser: runCount, yourCrewId,
    })

    crew = {
      board,
      week_start: featured.week_start,
      week_label: weekLabel(featured.week_start),
      featured_deck_id: featured.id,
      featured_deck_title: featured.title,
      rows,
      your_crew_name: yourCrewId
        ? (crews.find((c) => c.id === yourCrewId)?.name || null)
        : null,
    }
  }

  return NextResponse.json({
    individual,
    // Absent because the board is not launched yet, rather than absent because
    // no crew has run: the client says different things about the two.
    crew_standings_enabled: crewStandingsEnabled,
    crew,
    drawing: {
      week_start: featured.week_start,
      entries: (myEntries || []).length,
      clean_runs: (myEntries || []).filter((e) => e.reason === 'clean_run').length,
      perfect_pull: (myEntries || []).some((e) => e.reason === 'perfect_pull'),
    },
  })
}

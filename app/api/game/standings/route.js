// POST /api/game/standings
//
// The real crew board for one deck: top 10 by payout, ties broken by the
// faster run, plus the caller's own best and where it ranks.
//
// Ranked by each player's BEST run, one row per person. Ranking raw runs would
// let one operator who played ten times own the whole board, which tells the
// crew nothing about who knows the job.
//
// MagTec only — enforced by the inner join on lms_users.company_id, not by
// filtering after the fact, so a run belonging to another company can never
// reach the response even if one somehow lands in the table.
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { resolveGamePlayer, gameAdminClient, MAGTEC_COMPANY_ID } from '@/lib/game-auth'
import { pageAll } from '@/lib/supabasePage'
import DECKS from '@/lib/game/decks.json'

const TOP_N = 10

/** Better run: more coins, and on a tie the faster one. */
function beats(a, b) {
  if (!b) return true
  if (a.coins !== b.coins) return a.coins > b.coins
  return a.time_seconds < b.time_seconds
}

export async function POST(request) {
  let body = {}
  try { body = await request.json() } catch { /* deck may be in the query string */ }

  const auth = await resolveGamePlayer(request, body.t)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.code }, { status: auth.status })
  }

  const deckId = body.deck_id || new URL(request.url).searchParams.get('deck')
  const deck = DECKS.find((d) => d.id === deckId)
  if (!deck) return NextResponse.json({ error: 'unknown_deck' }, { status: 400 })

  const supabase = gameAdminClient()

  // Paged: PostgREST caps a response at 1000 rows and enforces it server side,
  // so an unpaginated read would quietly drop runs once this deck gets played
  // enough — and a dropped run reads exactly like a run nobody ever made.
  const { data: runs, error } = await pageAll(() =>
    supabase
      .from('lms_game_runs')
      .select('user_id, coins, time_seconds, created_at, lms_users!inner (full_name, company_id)')
      .eq('deck_id', deck.id)
      .eq('lms_users.company_id', MAGTEC_COMPANY_ID)
      .order('coins', { ascending: false })
      .order('time_seconds', { ascending: true })
      .order('user_id', { ascending: true })
  )

  if (error) {
    console.error('standings read failed:', error.message)
    return NextResponse.json({ error: 'read_failed' }, { status: 500 })
  }

  // Best run per player
  const best = new Map()
  for (const r of runs || []) {
    const row = {
      user_id: r.user_id,
      name: r.lms_users?.full_name || 'Operator',
      coins: r.coins,
      time_seconds: r.time_seconds,
    }
    if (beats(row, best.get(r.user_id))) best.set(r.user_id, row)
  }

  const ranked = [...best.values()].sort((a, b) =>
    b.coins - a.coins || a.time_seconds - b.time_seconds || a.name.localeCompare(b.name))

  const meIndex = ranked.findIndex((r) => r.user_id === auth.user.id)
  const me = meIndex >= 0 ? ranked[meIndex] : null

  return NextResponse.json({
    deck_id: deck.id,
    top: ranked.slice(0, TOP_N).map((r) => ({
      name: r.name,
      coins: r.coins,
      time_seconds: r.time_seconds,
      is_you: r.user_id === auth.user.id,
    })),
    you: me
      ? { coins: me.coins, time_seconds: me.time_seconds, rank: meIndex + 1 }
      : null,
  })
}

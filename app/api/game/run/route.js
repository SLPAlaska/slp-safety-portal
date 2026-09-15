// POST /api/game/run
//
// Records one completed run in lms_game_runs.
//
// The browser is the only thing that watched the run happen, so the score
// arrives from a client that a determined player could edit. This route does
// not pretend otherwise — it bounds what it will accept instead. The deck must
// exist, `rights` must equal that deck's step count (the engine only reports a
// run that finished every phase), and the payout cannot exceed what a perfect,
// instant run of that specific deck pays. That turns "type any number you
// like" into "beat the game perfectly", which is the honest ceiling for a
// training aid on a crew leaderboard.
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { resolveGamePlayer, gameAdminClient } from '@/lib/game-auth'
import DECKS from '@/lib/game/decks.json'

const MAX_TIME_SECONDS = 4 * 60 * 60   // a run left open all shift, not a score
const MAX_WRONGS = 2000

/** Payout ceiling for a flawless run of this deck, as the engine scores it. */
function maxCoinsFor(deck) {
  const steps = deck.phases.reduce((a, p) => a + p.steps.length, 0)
  return steps * 25 * 3            // every call right, at the top multiplier
    + deck.phases.length * 100     // phase clears
    + 500                          // clean-run bonus
    + Math.max(0, deck.par) * 2    // time bonus, at a theoretical zero seconds
}

const isCount = (v, max) => Number.isInteger(v) && v >= 0 && v <= max

export async function POST(request) {
  let body = {}
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  const auth = await resolveGamePlayer(request, body.t)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.code }, { status: auth.status })
  }

  const deck = DECKS.find((d) => d.id === body.deck_id)
  if (!deck) return NextResponse.json({ error: 'unknown_deck' }, { status: 400 })

  const steps = deck.phases.reduce((a, p) => a + p.steps.length, 0)
  const { coins, time_seconds, rights, wrongs, best_streak } = body

  if (
    !isCount(coins, maxCoinsFor(deck)) ||
    !isCount(time_seconds, MAX_TIME_SECONDS) ||
    rights !== steps ||
    !isCount(wrongs, MAX_WRONGS) ||
    !isCount(best_streak, steps)
  ) {
    return NextResponse.json({ error: 'invalid_run' }, { status: 400 })
  }

  const { data, error } = await gameAdminClient()
    .from('lms_game_runs')
    .insert({
      user_id: auth.user.id,
      deck_id: deck.id,
      coins,
      time_seconds,
      rights,
      wrongs,
      best_streak,
      // Not taken from the request: how they authenticated is what it is.
      source: auth.source,
    })
    .select('id')
    .single()

  if (error) {
    console.error('game run insert failed:', error.message)
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 })
  }

  return NextResponse.json({ saved: true, id: data.id })
}

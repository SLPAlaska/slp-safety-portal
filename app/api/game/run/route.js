// POST /api/game/run
//
// Records one completed run in lms_game_runs, stamps the attempt number, and
// hands out the weekly drawing entry for a clean run.
//
// The browser is the only thing that watched the run happen, so the score
// arrives from a client a determined player could edit. This route does not
// pretend otherwise — it bounds what it will accept instead. The deck must
// exist, `rights` must equal that deck's step count (the engine only reports a
// run that finished every phase), and the payout cannot exceed what a perfect,
// instant run of that specific deck pays. That turns "type any number you
// like" into "beat the game perfectly", which is the honest ceiling for a
// training aid on a crew leaderboard.
//
// Attempts are unlimited and every one is stored. Only the first counts as the
// knowledge assessment.
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { resolveGamePlayer, gameAdminClient } from '@/lib/game-auth'
import { weekStart } from '@/lib/game/week'
import DECKS from '@/lib/game/decks.json'

const MAX_TIME_SECONDS = 4 * 60 * 60   // a run left open all shift, not a score
const MAX_WRONGS = 2000
const UNIQUE_VIOLATION = '23505'

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
  if (!auth.ok) return NextResponse.json({ error: auth.code }, { status: auth.status })

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

  const supabase = gameAdminClient()
  const ws = weekStart()

  const { count } = await supabase
    .from('lms_game_runs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', auth.user.id)
    .eq('deck_id', deck.id)

  const prior = count || 0

  const row = {
    user_id: auth.user.id,
    deck_id: deck.id,
    coins,
    time_seconds,
    rights,
    wrongs,
    best_streak,
    week_start: ws,
    attempt_number: prior + 1,
    is_first_attempt: prior === 0,
    // Not taken from the request: how they authenticated is what it is.
    source: auth.source,
  }

  let { data, error } = await supabase
    .from('lms_game_runs').insert(row).select('id, attempt_number, is_first_attempt').single()

  // Two runs submitted at the same moment both read "no runs yet" and both
  // claim attempt 1; the partial unique index refuses the second. Re-read and
  // insert it as the later attempt it actually is.
  if (error?.code === UNIQUE_VIOLATION) {
    const { count: recount } = await supabase
      .from('lms_game_runs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', auth.user.id)
      .eq('deck_id', deck.id)
    row.attempt_number = (recount || 1) + 1
    row.is_first_attempt = false
    ;({ data, error } = await supabase
      .from('lms_game_runs').insert(row).select('id, attempt_number, is_first_attempt').single())
  }

  if (error) {
    console.error('game run insert failed:', error.message)
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 })
  }

  // Clean run earns one drawing entry per deck per week. The unique constraint
  // is what enforces "one" — a conflict means they already had it, which is a
  // normal outcome, not a failure.
  let drawingEntry = false
  if (wrongs === 0) {
    const { error: drawErr } = await supabase
      .from('lms_game_drawing_entries')
      .insert({ user_id: auth.user.id, deck_id: deck.id, week_start: ws, reason: 'clean_run' })
    if (!drawErr) drawingEntry = true
    else if (drawErr.code !== UNIQUE_VIOLATION) {
      console.error('drawing entry insert failed:', drawErr.message)
    }
  }

  return NextResponse.json({
    saved: true,
    id: data.id,
    attempt_number: data.attempt_number,
    is_first_attempt: data.is_first_attempt,
    drawing_entry: drawingEntry,
  })
}

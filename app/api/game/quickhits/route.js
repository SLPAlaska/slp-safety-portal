// POST /api/game/quickhits
//
// Records one Quick Hits pull — the ASH question bank game.
//
// The first pull of the week is the scored one. Everything after it that week
// is practice, stored all the same: a player who wants to drill the handbook
// twenty times should be able to, without a later attempt quietly replacing
// the score their crew was ranked on, and without farming drawing entries.
//
// A perfect scored pull earns one weekly drawing entry.
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { resolveGamePlayer, gameAdminClient } from '@/lib/game-auth'
import { weekStart } from '@/lib/game/week'
import { QH_PER_RUN, QH_MAX_SCORE } from '@/lib/game/scoring'

const UNIQUE_VIOLATION = '23505'

export async function POST(request) {
  let body = {}
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  const auth = await resolveGamePlayer(request, body.t)
  if (!auth.ok) return NextResponse.json({ error: auth.code }, { status: auth.status })

  const { score, right_count, total_count } = body
  const isInt = (v) => Number.isInteger(v) && v >= 0
  if (
    !isInt(score) || score > QH_MAX_SCORE ||
    !isInt(right_count) || !isInt(total_count) ||
    total_count !== QH_PER_RUN ||
    right_count > total_count
  ) {
    return NextResponse.json({ error: 'invalid_pull' }, { status: 400 })
  }

  const supabase = gameAdminClient()
  const ws = weekStart()

  const { count: scoredAlready } = await supabase
    .from('lms_game_quickhits')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', auth.user.id)
    .eq('week_start', ws)
    .eq('is_scored', true)

  const row = {
    user_id: auth.user.id,
    week_start: ws,
    score,
    right_count,
    total_count,
    is_scored: (scoredAlready || 0) === 0,
    source: auth.source,
  }

  let { data, error } = await supabase
    .from('lms_game_quickhits').insert(row).select('id, is_scored').single()

  // Same race as the run route: the partial unique index is the referee.
  if (error?.code === UNIQUE_VIOLATION) {
    row.is_scored = false
    ;({ data, error } = await supabase
      .from('lms_game_quickhits').insert(row).select('id, is_scored').single())
  }

  if (error) {
    console.error('quick hits insert failed:', error.message)
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 })
  }

  // Perfect, and it counted. A perfect practice pull is still a good week's
  // worth of pride, but the hat only takes the scored one.
  let drawingEntry = false
  if (data.is_scored && right_count === total_count) {
    const { error: drawErr } = await supabase
      .from('lms_game_drawing_entries')
      .insert({ user_id: auth.user.id, deck_id: null, week_start: ws, reason: 'perfect_pull' })
    if (!drawErr) drawingEntry = true
    else if (drawErr.code !== UNIQUE_VIOLATION) {
      console.error('drawing entry insert failed:', drawErr.message)
    }
  }

  return NextResponse.json({
    saved: true,
    id: data.id,
    is_scored: data.is_scored,
    drawing_entry: drawingEntry,
  })
}

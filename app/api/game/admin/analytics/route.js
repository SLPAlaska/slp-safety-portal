// GET /api/game/admin/analytics
//
// Two reports, for MagTec company admins and platform super admins.
//
// 1. KNOWLEDGE ASSESSMENT — first-attempt score per employee per deck.
//    Only attempt 1 counts. A score earned on somebody's fourth run of the
//    same deck measures how well they remember the last three, which is a
//    fine thing for the player and a useless thing for a report about what
//    the crew knew before they were taught. Employees with no first attempt
//    on a deck show as a gap, because a gap is the finding.
//
// 2. PROMPTED VS VOLUNTARY — run counts by source. magic_link means they came
//    from the Monday email (prompted); portal means they went and found it
//    (voluntary). The split is the only way to tell whether the email is
//    carrying the whole thing.
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { gameAdminClient } from '@/lib/game-auth'
import { resolveGameAdmin } from '@/lib/game-admin'
import { pageAllIn } from '@/lib/supabasePage'
import { weekStart } from '@/lib/game/week'
import DECKS from '@/lib/game/decks.json'

export async function GET(request) {
  const admin = await resolveGameAdmin(request)
  if (!admin.ok) return NextResponse.json({ error: admin.code }, { status: admin.status })

  const supabase = gameAdminClient()

  const { data: employees } = await supabase
    .from('lms_users')
    .select('id, full_name, job_title, active')
    .eq('company_id', admin.companyId)
    .eq('active', true)
    .order('full_name')

  const ids = (employees || []).map((e) => e.id)
  if (ids.length === 0) {
    return NextResponse.json({ decks: [], employees: [], source_totals: {}, crews: [] })
  }

  // Paged and chunked: these tables grow one row per attempt, and an
  // unpaginated read would quietly drop the oldest once a deck gets popular —
  // and a dropped first attempt reads exactly like an employee who never ran.
  const [runsRes, pullsRes, membersRes, crewsRes] = await Promise.all([
    pageAllIn(supabase, 'lms_game_runs',
      'user_id, deck_id, coins, time_seconds, wrongs, rights, best_streak, source, is_first_attempt, attempt_number, created_at',
      'user_id', ids),
    pageAllIn(supabase, 'lms_game_quickhits',
      'user_id, score, right_count, total_count, is_scored, source, week_start, created_at',
      'user_id', ids),
    supabase
      .from('lms_game_crew_members')
      .select('crew_id, user_id')
      .in('user_id', ids),
    supabase
      .from('lms_game_crews')
      .select('id, name')
      .eq('company_id', admin.companyId)
      .order('name'),
  ])

  // This week's hat, so the drawing can actually be run by hand.
  const ws = weekStart()
  const { data: entries } = await supabase
    .from('lms_game_drawing_entries')
    .select('user_id, deck_id, reason, created_at')
    .eq('week_start', ws)
    .in('user_id', ids)
    .order('created_at', { ascending: true })

  const runs = runsRes.data || []
  const pulls = pullsRes.data || []
  const crewName = new Map((crewsRes.data || []).map((c) => [c.id, c.name]))
  const crewOf = new Map((membersRes.data || []).map((m) => [m.user_id, crewName.get(m.crew_id) || null]))

  // ── 1. first attempts, indexed by user+deck
  const firstAttempt = new Map()
  for (const r of runs) {
    if (!r.is_first_attempt) continue
    firstAttempt.set(`${r.user_id}|${r.deck_id}`, r)
  }

  // ── 2. per-employee totals
  const totals = new Map(ids.map((id) => [id, {
    runs: 0, prompted: 0, voluntary: 0, clean: 0, pulls: 0, scored_pulls: 0, perfect_pulls: 0,
  }]))
  for (const r of runs) {
    const t = totals.get(r.user_id)
    if (!t) continue
    t.runs++
    if (r.source === 'magic_link') t.prompted++
    else t.voluntary++
    if (r.wrongs === 0) t.clean++
  }
  for (const p of pulls) {
    const t = totals.get(p.user_id)
    if (!t) continue
    t.pulls++
    if (p.is_scored) t.scored_pulls++
    if (p.right_count === p.total_count) t.perfect_pulls++
  }

  const sourceTotals = runs.reduce((a, r) => {
    const k = r.source === 'magic_link' ? 'prompted' : 'voluntary'
    a[k] = (a[k] || 0) + 1
    return a
  }, { prompted: 0, voluntary: 0 })

  const pullSourceTotals = pulls.reduce((a, p) => {
    const k = p.source === 'magic_link' ? 'prompted' : 'voluntary'
    a[k] = (a[k] || 0) + 1
    return a
  }, { prompted: 0, voluntary: 0 })

  // ── deck-level first-attempt summary
  const deckSummary = DECKS.map((d) => {
    const scores = []
    for (const id of ids) {
      const f = firstAttempt.get(`${id}|${d.id}`)
      if (f) scores.push(f)
    }
    const n = scores.length
    return {
      id: d.id,
      title: d.title,
      steps: d.phases.reduce((a, p) => a + p.steps.length, 0),
      first_attempts: n,
      not_attempted: ids.length - n,
      avg_coins: n ? Math.round(scores.reduce((a, r) => a + r.coins, 0) / n) : null,
      avg_wrongs: n ? +(scores.reduce((a, r) => a + r.wrongs, 0) / n).toFixed(2) : null,
      clean_first_runs: scores.filter((r) => r.wrongs === 0).length,
    }
  })

  const nameOf = new Map((employees || []).map((e) => [e.id, e.full_name]))
  const deckTitle = new Map(DECKS.map((d) => [d.id, d.title]))

  return NextResponse.json({
    level: admin.level,
    decks: deckSummary,
    drawing: {
      week_start: ws,
      entries: (entries || []).map((e) => ({
        name: nameOf.get(e.user_id) || 'Unknown',
        reason: e.reason,
        deck: e.deck_id ? (deckTitle.get(e.deck_id) || e.deck_id) : null,
        created_at: e.created_at,
      })),
    },
    source_totals: sourceTotals,
    pull_source_totals: pullSourceTotals,
    crews: (crewsRes.data || []).map((c) => ({ id: c.id, name: c.name })),
    employees: (employees || []).map((e) => ({
      id: e.id,
      full_name: e.full_name,
      job_title: e.job_title || null,
      crew: crewOf.get(e.id) || null,
      totals: totals.get(e.id),
      first_attempts: Object.fromEntries(
        DECKS.map((d) => {
          const f = firstAttempt.get(`${e.id}|${d.id}`)
          return [d.id, f
            ? {
                coins: f.coins,
                time_seconds: f.time_seconds,
                wrongs: f.wrongs,
                rights: f.rights,
                created_at: f.created_at,
              }
            : null]
        }),
      ),
    })),
  })
}

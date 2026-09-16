// app/lib/game/featured.js
//
// The featured deck of the week, per board, and the config rows that record it.
//
// Rotation is deterministic (see featuredForWeek): week index modulo that
// board's deck roster. Nothing needs to run on a schedule for the deck to
// change on Monday.
//
// WHY PER BOARD: one rotation over all 24 decks would have featured a Kenai
// fab shop deck roughly 70% of weeks, so drilling crews would spend most of
// the year ranked on sandblasting procedures they never run — and each deck's
// turn would stretch from 7 weeks to nearly six months. Each board rotates
// over its own decks instead, so drilling keeps its 7-week cycle untouched.
//
// It is still written to lms_game_config, for two reasons:
//   * the reminder Edge Function cannot import decks.json — it reads the
//     roster and the week's pick out of this table
//   * an admin can override the current week by editing featured_deck_id_<board>;
//     a row stamped with the current featured_week_<board> is taken as-is
//     rather than recomputed, so a deliberate pick survives until the week
//     turns over
//
// deck_rotation_<board> is re-synced from decks.json whenever it differs, so
// adding a deck stays a content edit: the first person to open the game that
// week publishes the new roster.

import { weekStart, featuredForWeek } from './week'

export const BOARDS = ['drilling', 'kenai']
export const DEFAULT_BOARD = 'drilling'

/** The board a deck belongs to. Decks predating boards are drilling. */
export const boardOf = (deck) => deck.board || DEFAULT_BOARD

/** Normalize anything coming off the wire or out of the database. */
export function safeBoard(board) {
  return BOARDS.includes(board) ? board : DEFAULT_BOARD
}

const keysFor = (board) => ({
  id: `featured_deck_id_${board}`,
  title: `featured_deck_title_${board}`,
  week: `featured_week_${board}`,
  rotation: `deck_rotation_${board}`,
})

async function readConfig(supabase, keys) {
  const { data } = await supabase
    .from('lms_game_config')
    .select('key, value')
    .in('key', Object.values(keys))
  return Object.fromEntries((data || []).map((r) => [r.key, r.value]))
}

async function writeConfig(supabase, entries) {
  const rows = Object.entries(entries).map(([key, value]) => ({
    key, value, updated_at: new Date().toISOString(),
  }))
  const { error } = await supabase.from('lms_game_config').upsert(rows, { onConflict: 'key' })
  if (error) console.error('game config write failed:', error.message)
}

/**
 * Resolve one board's featured deck, keeping lms_game_config current.
 *
 * Returns { id, title, week_start, board }. Falls back to the computed answer
 * if the config table cannot be written — a failed cache update must not take
 * the game down, and the computation is the source of truth anyway.
 */
export async function resolveFeaturedDeck(supabase, decks, board = DEFAULT_BOARD, now = new Date()) {
  const b = safeBoard(board)
  const k = keysFor(b)
  const ws = weekStart(now)

  const roster = decks.filter((d) => boardOf(d) === b).map((d) => ({ id: d.id, title: d.title }))
  const rosterJson = JSON.stringify(roster)

  let cfg = {}
  try { cfg = await readConfig(supabase, k) } catch { cfg = {} }

  const pending = {}
  if (cfg[k.rotation] !== rosterJson) pending[k.rotation] = rosterJson

  // An admin's pick for THIS week wins, as long as it names a deck on this board.
  const pinned = cfg[k.week] === ws
    ? roster.find((d) => d.id === cfg[k.id])
    : null

  const chosen = pinned || featuredForWeek(ws, roster)
  if (!chosen) return { id: null, title: null, week_start: ws, board: b }

  if (cfg[k.id] !== chosen.id) pending[k.id] = chosen.id
  if (cfg[k.title] !== chosen.title) pending[k.title] = chosen.title
  if (cfg[k.week] !== ws) pending[k.week] = ws

  if (Object.keys(pending).length) {
    try { await writeConfig(supabase, pending) } catch { /* cache only */ }
  }

  return { id: chosen.id, title: chosen.title, week_start: ws, board: b }
}

/**
 * Publish every board's roster and pick in one pass.
 *
 * Called from the session route so that opening the game keeps BOTH boards'
 * config rows current — otherwise a board nobody has opened this week would
 * still be advertising last week's roster to the Monday email.
 */
export async function resolveAllBoards(supabase, decks, now = new Date()) {
  const out = {}
  for (const b of BOARDS) {
    out[b] = await resolveFeaturedDeck(supabase, decks, b, now)
  }
  return out
}

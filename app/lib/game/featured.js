// app/lib/game/featured.js
//
// The featured deck of the week, and the config row that records it.
//
// Rotation is deterministic (see featuredForWeek): week index modulo the deck
// roster. Nothing needs to run on a schedule for the deck to change on Monday.
//
// It is still written to lms_game_config, for two reasons:
//   * the reminder Edge Function cannot import decks.json — it reads the
//     roster and the week's pick out of this table
//   * an admin can override the current week by editing featured_deck_id; a
//     row stamped with the current featured_week is taken as-is rather than
//     recomputed, so a deliberate pick survives until the week turns over
//
// deck_rotation is re-synced from decks.json whenever it differs, so adding a
// deck stays a content edit: the first person to open the game that week
// publishes the new roster.

import { weekStart, featuredForWeek } from './week'

const KEYS = ['featured_deck_id', 'featured_deck_title', 'featured_week', 'deck_rotation']

async function readConfig(supabase) {
  const { data } = await supabase
    .from('lms_game_config')
    .select('key, value')
    .in('key', KEYS)
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
 * Resolve this week's featured deck, keeping lms_game_config current.
 *
 * Returns { id, title, week_start }. Falls back to the computed answer if the
 * config table cannot be written — a failed cache update must not take the
 * game down, and the computation is the source of truth anyway.
 */
export async function resolveFeaturedDeck(supabase, decks, now = new Date()) {
  const ws = weekStart(now)
  const roster = decks.map((d) => ({ id: d.id, title: d.title }))
  const rosterJson = JSON.stringify(roster)

  let cfg = {}
  try { cfg = await readConfig(supabase) } catch { cfg = {} }

  const pending = {}
  if (cfg.deck_rotation !== rosterJson) pending.deck_rotation = rosterJson

  // An admin's pick for THIS week wins, as long as it names a deck that exists.
  const pinned = cfg.featured_week === ws
    ? roster.find((d) => d.id === cfg.featured_deck_id)
    : null

  const chosen = pinned || featuredForWeek(ws, roster)
  if (!chosen) return { id: null, title: null, week_start: ws }

  if (cfg.featured_deck_id !== chosen.id) pending.featured_deck_id = chosen.id
  if (cfg.featured_deck_title !== chosen.title) pending.featured_deck_title = chosen.title
  if (cfg.featured_week !== ws) pending.featured_week = ws

  if (Object.keys(pending).length) {
    try { await writeConfig(supabase, pending) } catch { /* cache only */ }
  }

  return { id: chosen.id, title: chosen.title, week_start: ws }
}

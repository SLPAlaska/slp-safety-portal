// app/lib/game/week.js
//
// Week boundaries for the game, in ALASKA time.
//
// Everything weekly in Run the Job — the crew board, the scored Quick Hits
// pull, drawing entries, the featured deck — resets on Monday. Which Monday
// depends on the timezone you ask in, and the crew lives in Alaska: a run
// played 9pm Sunday on the Slope has to land in the week that just ended, not
// the one starting in UTC three hours later.
//
// So: week_start is the date of the Monday that begins the week in
// America/Anchorage. Intl does the DST work (Alaska observes it), which is why
// this is computed rather than done with fixed offsets.
//
// The reminder Edge Function carries a copy of these two functions. They must
// agree — the email names the featured deck the game is ranking that week.

const AK = 'America/Anchorage'
const DOW = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }

/** Alaska-local calendar parts for an instant. */
function akParts(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: AK, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
  }).formatToParts(date)
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]))
  return { y: +p.year, m: +p.month, d: +p.day, wd: p.weekday }
}

/**
 * The Monday (Alaska) that starts this instant's week, as 'YYYY-MM-DD'.
 * Defaults to now.
 */
export function weekStart(date = new Date()) {
  const { y, m, d, wd } = akParts(date)
  // Date.UTC on the Alaska-local Y/M/D gives a timezone-free anchor to do
  // whole-day arithmetic on; the result is a calendar date, not an instant.
  const anchor = Date.UTC(y, m - 1, d) - DOW[wd] * 86400000
  return new Date(anchor).toISOString().slice(0, 10)
}

/** Whole weeks between a week_start and 1970-01-05, itself a Monday. */
export function weekIndex(weekStartDate) {
  const ms = Date.parse(`${weekStartDate}T00:00:00Z`) - Date.parse('1970-01-05T00:00:00Z')
  return Math.round(ms / 604800000)
}

/**
 * Which deck is featured in a given week. Deterministic: the same week and the
 * same roster always give the same answer, on either runtime, with no shared
 * state to drift. Rotation order is the deck file's order.
 */
export function featuredForWeek(weekStartDate, roster) {
  if (!roster || roster.length === 0) return null
  const n = roster.length
  return roster[((weekIndex(weekStartDate) % n) + n) % n]
}

/** 'Sep 15' style label for a week_start, for headings. */
export function weekLabel(weekStartDate) {
  const d = new Date(`${weekStartDate}T00:00:00Z`)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

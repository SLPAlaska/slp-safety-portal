// app/lib/game/crewScore.js
//
// Weekly crew scoring for Run the Job.
//
// A crew's score is the sum of its members' BEST runs this week on the
// featured deck, divided by TOTAL rostered members — not by the number who
// played. Someone who did not run counts as a zero.
//
// That is the whole point of the design, and it is worth being explicit about:
// the board is meant to make a crew go get its people. Dividing by
// participants instead would let a crew of one keen operator sit at the top
// while four of their people never opened it, which is the opposite of what a
// safety board should reward.
//
// It is reported as its two honest halves as well as the product:
//
//     score = skill_avg × participation_rate
//           = (sum / participants) × (participants / roster)
//           = sum / roster
//
// because a slow crew that all turned out and a crew of two aces produce
// similar single numbers for completely different reasons, and a lead needs to
// know which one they are looking at.
//
// No off-week exclusions. Off-hitch employees stay in the denominator and
// their runs count from wherever they are — if the roster shrank for R&R, a
// crew could farm a high score by benching everyone who is away.

/**
 * @param crews        [{ id, name }]
 * @param memberIdsBy  Map<crewId, string[]>  rostered user ids per crew
 * @param bestByUser   Map<userId, { coins }> best run this week, absent = no run
 * @param runsByUser   Map<userId, number>    runs this week (participation only)
 * @param yourCrewId   the caller's crew, for highlighting
 * @returns rows sorted best first
 */
export function scoreCrews({ crews, memberIdsBy, bestByUser, runsByUser, yourCrewId = null }) {
  const rows = crews.map((c) => {
    const ids = memberIdsBy.get(c.id) || []
    const rosterSize = ids.length
    const scores = ids.map((id) => bestByUser.get(id)).filter(Boolean)
    const participants = scores.length
    const sum = scores.reduce((a, r) => a + r.coins, 0)
    const runs = ids.reduce((a, id) => a + (runsByUser.get(id) || 0), 0)

    return {
      id: c.id,
      name: c.name,
      roster_size: rosterSize,
      participants,
      runs,
      // An admin can create a crew before anyone is on it; both divisions are
      // guarded so an empty crew scores zero instead of NaN.
      skill_avg: participants ? sum / participants : 0,
      participation_rate: rosterSize ? participants / rosterSize : 0,
      score: rosterSize ? sum / rosterSize : 0,
      is_yours: c.id === yourCrewId,
    }
  })

  // Score first. On a tie, the crew with the better skill average is ahead —
  // two crews at the same score mean one turned out more people for a lower
  // average, and the tiebreak should not punish them twice.
  rows.sort((a, b) =>
    b.score - a.score || b.skill_avg - a.skill_avg || a.name.localeCompare(b.name))

  return rows
}

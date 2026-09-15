// app/lib/game/scoring.js
//
// Scoring constants shared by the engine (browser) and the API routes that
// validate what the engine reports (server).
//
// They live apart from the engine so a server route can bound a submitted
// score without importing a module full of DOM code — and so there is exactly
// one place where "a perfect pull is worth this much" is written down.

/** Questions in one Quick Hits pull. */
export const QH_PER_RUN = 5

/** Seconds on the clock per question. */
export const QH_SECS = 15

/** Right answer: flat pay, plus this much per whole second left. */
export const QH_RIGHT_PAY = 25
export const QH_SECOND_PAY = 5

/** All of them right. */
export const QH_PERFECT_BONUS = 250

/** Ceiling for a flawless pull — every answer right with the clock untouched. */
export const QH_MAX_SCORE =
  QH_PER_RUN * (QH_RIGHT_PAY + QH_SECS * QH_SECOND_PAY) + QH_PERFECT_BONUS

/** Payout ceiling for a flawless run of one deck, as the engine scores it. */
export function maxCoinsForDeck(deck) {
  const steps = deck.phases.reduce((a, p) => a + p.steps.length, 0)
  return steps * 25 * 3            // every call right, at the top multiplier
    + deck.phases.length * 100     // phase clears
    + 500                          // clean-run bonus
    + Math.max(0, deck.par) * 2    // time bonus, at a theoretical zero seconds
}

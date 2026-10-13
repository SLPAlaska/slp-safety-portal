// Stage navigation for the investigation workbench.
//
// Gates (spelling, quality, THA, 1904) may refuse approve, close, mark-complete
// and export. They never decide which stage is on screen. A Submitted or
// blocked investigation is not pinned to the last stage: resume opens the
// first stage that is not marked complete, and every stage tab and Back
// control can move to any stage.

export const STAGE_COUNT = 4;

/** First stage that is not marked complete, or the last stage when 1–3 are done. */
export function resumeStage(incident) {
  if (!incident?.stage_1_complete) return 1;
  if (!incident?.stage_2_complete) return 2;
  if (!incident?.stage_3_complete) return 3;
  return STAGE_COUNT;
}

/**
 * Moving between stages is always allowed.
 * `from`, status and gate are ignored on purpose: a blocked or submitted
 * investigation must still be able to leave the last page.
 */
export function navigationAllowed(_incident, _from, to) {
  const n = Number(to);
  return Number.isInteger(n) && n >= 1 && n <= STAGE_COUNT;
}

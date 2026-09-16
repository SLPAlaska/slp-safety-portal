-- ============================================================
-- Two boards: drilling support and the Kenai fab shop.
--
-- Adding 17 Kenai decks to a single rotation would have put drilling crews on
-- a fab-shop deck roughly 70% of weeks — D19 and Doyon 25 graded on
-- sandblasting procedures they never run — and stretched each deck's turn in
-- the spotlight from 7 weeks to nearly six months. So the rotation splits.
--
-- The board lives on the CREW, not on the person. Every existing crew is a
-- drilling crew and no Kenai crews exist yet; when the client sends shop crew
-- rosters, those crews are created with board 'kenai' and their members
-- inherit it by membership. A player with no crew defaults to drilling.
--
-- What does NOT split: individual all-time bests stay global per deck. A shop
-- hand who runs an ACB deck for the fun of it still appears on that deck's
-- leaderboard. Only the weekly CREW board is scoped, because that is the one
-- that ranks people against each other.
-- ============================================================

ALTER TABLE public.lms_game_crews
  ADD COLUMN IF NOT EXISTS board TEXT NOT NULL DEFAULT 'drilling';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.lms_game_crews'::regclass AND conname = 'lms_game_crews_board_check'
  ) THEN
    ALTER TABLE public.lms_game_crews
      ADD CONSTRAINT lms_game_crews_board_check CHECK (board IN ('drilling', 'kenai'));
  END IF;
END $$;

COMMENT ON COLUMN public.lms_game_crews.board IS
  'Which deck board this crew is ranked on: drilling or kenai. Members inherit it. Crewless players default to drilling.';

-- The weekly crew board reads "this deck, this week" per board, so the crew
-- lookup by board is worth an index once shop crews exist.
CREATE INDEX IF NOT EXISTS lms_game_crews_board_idx
  ON public.lms_game_crews (company_id, board);

-- ─────────────────────────────────────────────────────────────
-- Per-board featured deck.
--
-- The single-board keys are left in place and no longer read; dropping them
-- would strand the last drilling pick mid-week for anyone whose client had
-- not reloaded. The new keys are suffixed by board, and the portal publishes
-- one deck_rotation roster per board for the reminder Edge Function, which
-- cannot import the deck file.
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.lms_game_config (key, value) VALUES
  ('featured_deck_id_drilling',    NULL),
  ('featured_deck_title_drilling', NULL),
  ('featured_week_drilling',       NULL),
  ('deck_rotation_drilling',       NULL),
  ('featured_deck_id_kenai',       NULL),
  ('featured_deck_title_kenai',    NULL),
  ('featured_week_kenai',          NULL),
  ('deck_rotation_kenai',          NULL)
ON CONFLICT (key) DO NOTHING;

-- Verify
SELECT board, count(*) AS crews
FROM public.lms_game_crews
GROUP BY board
ORDER BY board;

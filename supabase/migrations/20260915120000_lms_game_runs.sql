-- ============================================================
-- Run the Job — completed run records
--
-- One row per finished run of the Run the Job training game.
-- Written only by app/api/game/run (service role); never by the
-- browser, so the client cannot post a score it did not earn
-- without going through that route's validation.
--
-- `source` records how the player reached the game:
--   'magic_link' — signed ?t= token from the weekly reminder email
--   'portal'     — an already logged-in LMS session
-- Keeping them apart is the only way to tell whether the emailed
-- one-tap link is what actually drives play.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.lms_game_runs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.lms_users(id) ON DELETE CASCADE,
  deck_id       TEXT NOT NULL,
  coins         INTEGER NOT NULL DEFAULT 0 CHECK (coins >= 0),
  time_seconds  INTEGER NOT NULL CHECK (time_seconds >= 0),
  rights        INTEGER NOT NULL DEFAULT 0 CHECK (rights >= 0),
  wrongs        INTEGER NOT NULL DEFAULT 0 CHECK (wrongs >= 0),
  best_streak   INTEGER NOT NULL DEFAULT 0 CHECK (best_streak >= 0),
  source        TEXT NOT NULL CHECK (source IN ('magic_link', 'portal')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Leaderboard read: top runs for one deck, ranked by coins then fastest time.
-- Matches the ORDER BY in app/api/game/standings exactly.
CREATE INDEX IF NOT EXISTS lms_game_runs_deck_rank_idx
  ON public.lms_game_runs (deck_id, coins DESC, time_seconds ASC);

-- "Your best" lookup, and every per-player history read.
CREATE INDEX IF NOT EXISTS lms_game_runs_user_deck_idx
  ON public.lms_game_runs (user_id, deck_id, coins DESC, time_seconds ASC);

COMMENT ON TABLE  public.lms_game_runs IS
  'Completed runs of the Run the Job SOP-order game. Inserted server-side only.';
COMMENT ON COLUMN public.lms_game_runs.deck_id IS
  'Deck key from lib/game/decks.json (e.g. "offload"). Text, not an FK: decks are a content file, not a table.';
COMMENT ON COLUMN public.lms_game_runs.time_seconds IS
  'Whole seconds from START THE RUN to the final step of the last phase.';
COMMENT ON COLUMN public.lms_game_runs.source IS
  'How the player arrived: magic_link (emailed signed token) or portal (logged-in LMS session).';

-- RLS on with no policies: the anon and authenticated keys can neither read
-- nor write this table. All access goes through the service-role API routes,
-- which is what keeps one company's standings out of another company's reach.
ALTER TABLE public.lms_game_runs ENABLE ROW LEVEL SECURITY;

-- Verify
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'lms_game_runs'
ORDER BY ordinal_position;

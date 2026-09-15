-- ============================================================
-- Run the Job — crews, Quick Hits, drawing entries, config
--
-- Self-contained and idempotent. It creates lms_game_runs from
-- scratch if 20260915120000 has not been applied, and adds the
-- attempt columns if it has, so the two migrations can be run in
-- either order (or only this one).
--
-- Week boundaries are ALASKA Mondays, not UTC Mondays. Every
-- week_start column below holds the date of the Monday that
-- starts the week in America/Anchorage — computed by the app
-- (app/lib/game/week.js) and by the reminder Edge Function,
-- which both use the same rule so a run logged at 9pm Sunday
-- Alaska time lands in the week the crew thinks it did.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- RUNS
-- ─────────────────────────────────────────────────────────────
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

-- Attempt tracking. Computed server-side per user+deck on insert: the
-- knowledge-assessment report reads ONLY first attempts, because a score
-- someone earned on their fourth run of the same deck measures practice,
-- not what they knew walking in.
ALTER TABLE public.lms_game_runs
  ADD COLUMN IF NOT EXISTS attempt_number   INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_first_attempt BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS week_start       DATE;

-- At most one first attempt per person per deck, enforced by the database
-- rather than by the count-then-insert in the API route. Two submissions
-- racing each other would otherwise both read "no runs yet" and both claim
-- to be the first, double-counting that employee in the report.
CREATE UNIQUE INDEX IF NOT EXISTS lms_game_runs_one_first_attempt_idx
  ON public.lms_game_runs (user_id, deck_id)
  WHERE is_first_attempt;

CREATE INDEX IF NOT EXISTS lms_game_runs_deck_rank_idx
  ON public.lms_game_runs (deck_id, coins DESC, time_seconds ASC);
CREATE INDEX IF NOT EXISTS lms_game_runs_user_deck_idx
  ON public.lms_game_runs (user_id, deck_id, coins DESC, time_seconds ASC);
-- Weekly crew board: every read is "this deck, this week".
CREATE INDEX IF NOT EXISTS lms_game_runs_week_idx
  ON public.lms_game_runs (deck_id, week_start, user_id);

COMMENT ON TABLE  public.lms_game_runs IS
  'Completed runs of the Run the Job SOP-order game. Inserted server-side only. Unlimited attempts; every attempt is kept.';
COMMENT ON COLUMN public.lms_game_runs.attempt_number IS
  '1-based attempt count for this user+deck at insert time.';
COMMENT ON COLUMN public.lms_game_runs.is_first_attempt IS
  'True only for attempt 1. The knowledge-assessment report filters on this.';
COMMENT ON COLUMN public.lms_game_runs.week_start IS
  'Monday (America/Anchorage) of the week this run was played. Drives weekly crew standings.';
COMMENT ON COLUMN public.lms_game_runs.source IS
  'How the player arrived: magic_link (emailed token, i.e. prompted) or portal (logged-in session, i.e. voluntary).';

ALTER TABLE public.lms_game_runs ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- QUICK HITS — the ASH question pull
--
-- The first pull each week is the scored one; everything after it that week
-- is practice. Storing both, with is_scored marking which is which, means a
-- player can drill as much as they like without a later run quietly
-- replacing the score their crew was ranked on.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lms_game_quickhits (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.lms_users(id) ON DELETE CASCADE,
  week_start   DATE NOT NULL,
  score        INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0),
  right_count  INTEGER NOT NULL DEFAULT 0 CHECK (right_count >= 0),
  total_count  INTEGER NOT NULL CHECK (total_count > 0),
  is_scored    BOOLEAN NOT NULL DEFAULT FALSE,
  source       TEXT NOT NULL CHECK (source IN ('magic_link', 'portal')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT lms_game_quickhits_right_within_total CHECK (right_count <= total_count)
);

-- One scored pull per person per week, enforced here for the same reason as
-- the first-attempt index above.
CREATE UNIQUE INDEX IF NOT EXISTS lms_game_quickhits_one_scored_idx
  ON public.lms_game_quickhits (user_id, week_start)
  WHERE is_scored;

CREATE INDEX IF NOT EXISTS lms_game_quickhits_week_idx
  ON public.lms_game_quickhits (week_start, user_id);

COMMENT ON TABLE public.lms_game_quickhits IS
  'Quick Hits pulls from the ASH question bank. First pull of the week is scored; later pulls that week are practice.';

ALTER TABLE public.lms_game_quickhits ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- CREWS
--
-- A crew is a roster, and the roster is the denominator: weekly crew
-- standings divide by TOTAL rostered members, so who is on the list
-- changes every crew's score. That is the intent — a crew carries its
-- people — but it means membership is real data, not a label.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lms_game_crews (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID NOT NULL REFERENCES public.lms_companies(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  lead_user_id UUID NULL REFERENCES public.lms_users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS lms_game_crews_company_name_idx
  ON public.lms_game_crews (company_id, lower(name));

CREATE TABLE IF NOT EXISTS public.lms_game_crew_members (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id           UUID NOT NULL REFERENCES public.lms_game_crews(id) ON DELETE CASCADE,
  -- UNIQUE on user_id: one crew per person. Moving someone is an UPDATE of
  -- this row, not a second row, so nobody can be counted twice in the
  -- denominator of two crews.
  user_id           UUID NOT NULL UNIQUE REFERENCES public.lms_users(id) ON DELETE CASCADE,
  -- True when an admin placed them. Self-selection on first visit never
  -- overwrites an admin's assignment.
  assigned_by_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lms_game_crew_members_crew_idx
  ON public.lms_game_crew_members (crew_id);

COMMENT ON COLUMN public.lms_game_crew_members.assigned_by_admin IS
  'True if a company admin placed this person. Self-selection cannot move an admin-assigned member.';

ALTER TABLE public.lms_game_crews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_game_crew_members ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- DRAWING ENTRIES
--
-- One entry per person per deck per week for a clean run, and one per
-- person per week for a perfect scored Quick Hits pull (deck_id null).
-- Winners are drawn by hand for now; this table is the hat.
--
-- NULLS NOT DISTINCT is load-bearing: the Quick Hits entry carries a null
-- deck_id, and under the default NULLS DISTINCT rule Postgres would treat
-- every one of them as unique and let a player earn an entry per pull.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lms_game_drawing_entries (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.lms_users(id) ON DELETE CASCADE,
  deck_id    TEXT NULL,
  week_start DATE NOT NULL,
  reason     TEXT NOT NULL CHECK (reason IN ('clean_run', 'perfect_pull')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT lms_game_drawing_entries_once
    UNIQUE NULLS NOT DISTINCT (user_id, deck_id, week_start, reason)
);

CREATE INDEX IF NOT EXISTS lms_game_drawing_entries_week_idx
  ON public.lms_game_drawing_entries (week_start, reason);

COMMENT ON TABLE public.lms_game_drawing_entries IS
  'Weekly prize drawing entries. Clean run (wrongs=0) earns one per deck per week; a perfect scored Quick Hits pull earns one per week.';

ALTER TABLE public.lms_game_drawing_entries ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- CONFIG — featured deck of the week
--
-- The featured deck is what the weekly crew board ranks and what the Monday
-- email names. It is derived from the week (a deterministic index into the
-- deck roster) and then WRITTEN HERE, rather than only computed, for two
-- reasons: the reminder Edge Function cannot import the deck file, and an
-- admin can override the current week's pick by editing featured_deck_id —
-- a value stamped with the current featured_week is trusted as-is.
--
-- deck_rotation is kept in sync from app/lib/game/decks.json by the portal
-- whenever anyone opens the game, so adding a deck stays a content edit.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lms_game_config (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.lms_game_config (key, value) VALUES
  ('featured_deck_id',    NULL),
  ('featured_deck_title', NULL),
  ('featured_week',       NULL),
  ('deck_rotation',       NULL)
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE public.lms_game_config IS
  'Small key/value settings for the game. featured_deck_id rotates weekly; deck_rotation is the id+title roster synced from decks.json.';

ALTER TABLE public.lms_game_config ENABLE ROW LEVEL SECURITY;

-- Verify
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'lms_game_runs', 'lms_game_quickhits', 'lms_game_crews',
    'lms_game_crew_members', 'lms_game_drawing_entries', 'lms_game_config'
  )
ORDER BY table_name;

-- ─────────────────────────────────────────────────────────────
-- Launch switches for Run the Job.
--
-- Both default to 'false' so that deploying the game code does not itself
-- launch anything. Flipping a row to 'true' is the launch action, and it takes
-- effect on the next read — no deploy, no cron edit.
--
--   game_email_enabled      When false, the weekly training reminder omits the
--                           THIS WEEK'S RUN and SAFETY PULL blocks entirely and
--                           a caught-up MagTec employee is skipped again, the
--                           way they were before the game existed. Training
--                           sections are unaffected either way. Flipping this to
--                           true is what puts the game in front of the crews.
--
--   crew_standings_enabled  When false, the game shows individual bests and
--                           drawing entries but no crew-vs-crew board. Runs are
--                           still recorded and crews are still rostered, so the
--                           board has real history the day it is switched on —
--                           an empty board on launch morning would read as
--                           broken.
--
-- These are two switches, not one, on purpose: the game can be live and played
-- for a couple of weeks before any crew is ranked against another.
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.lms_game_config (key, value) VALUES
  ('game_email_enabled',     'false'),
  ('crew_standings_enabled', 'false')
ON CONFLICT (key) DO NOTHING;

-- Verify
SELECT key, value
FROM public.lms_game_config
WHERE key IN ('game_email_enabled', 'crew_standings_enabled')
ORDER BY key;

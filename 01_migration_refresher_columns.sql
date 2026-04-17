-- ============================================================
-- AnthroSafe LMS — Refresher Frequency Migration
-- Run in Supabase SQL Editor (project: iypezirwdlqpptjpeeyf)
-- ============================================================
-- Adds:
--   refresher_frequency_months  INT   NULL  (null = one-time, no refresher)
--   regulatory_basis            TEXT  NULL  (CFR citation for admin reference)
-- ============================================================

ALTER TABLE lms_courses
  ADD COLUMN IF NOT EXISTS refresher_frequency_months INT NULL,
  ADD COLUMN IF NOT EXISTS regulatory_basis TEXT NULL;

-- Helpful comment for future Claude/Brian
COMMENT ON COLUMN lms_courses.refresher_frequency_months IS
  'Months between required refresher training. NULL = one-time course, no refresher needed.';
COMMENT ON COLUMN lms_courses.regulatory_basis IS
  'CFR citation or standard reference justifying the refresher frequency (e.g., "29 CFR 1910.1030(g)(2)(ii)").';

-- Verify columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'lms_courses'
  AND column_name IN ('refresher_frequency_months', 'regulatory_basis');

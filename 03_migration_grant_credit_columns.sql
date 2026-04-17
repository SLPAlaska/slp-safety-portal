-- ============================================================
-- AnthroSafe LMS — Grant Credit Audit Columns
-- Run AFTER 01 + 02 migrations
-- Run in Supabase SQL Editor (project: iypezirwdlqpptjpeeyf)
-- ============================================================
-- Adds audit trail to lms_completions so we can distinguish
-- completions earned via quiz vs. granted by admin.
-- ============================================================

ALTER TABLE lms_completions
  ADD COLUMN IF NOT EXISTS granted_by_admin_id UUID NULL REFERENCES lms_users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS grant_note TEXT NULL;

COMMENT ON COLUMN lms_completions.granted_by_admin_id IS
  'If populated, this completion was granted by an admin (not earned via quiz). References the admin lms_users.id.';
COMMENT ON COLUMN lms_completions.grant_note IS
  'Optional admin note explaining why credit was granted (e.g., "Completed at previous employer — cert on file").';

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'lms_completions'
ORDER BY ordinal_position;

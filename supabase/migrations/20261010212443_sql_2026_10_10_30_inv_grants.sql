-- SQL 2026-10-10-30 — Interview Guide: tighten table grants on the new tables.
-- Supabase default privileges hand anon/authenticated ALL on every new table.
-- RLS already blocks the rows; this also removes TRUNCATE/UPDATE/DELETE etc.,
-- which RLS does not govern. New tables only; nothing existing is touched.
revoke all on public.investigation_activity_log from anon;
grant insert on public.investigation_activity_log to anon;
revoke update, delete, truncate, references, trigger on public.investigation_activity_log from authenticated;
revoke all on public.inv_question_banks, public.inv_question_bank, public.inv_question_responses, public.inv_feature_flags from anon;
revoke insert, update, delete, truncate, references, trigger on public.inv_question_banks, public.inv_question_bank, public.inv_feature_flags from authenticated;
revoke delete, truncate, references, trigger on public.inv_question_responses from authenticated;

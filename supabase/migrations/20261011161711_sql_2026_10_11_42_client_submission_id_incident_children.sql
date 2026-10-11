-- SQL 2026-10-11 #42 — client_submission_id on the Incident Report's child tables
--
-- The Incident Report now sends as one package (incident, photos/JSA files,
-- evidence rows, first timeline event, first witness note, activity log) that
-- can be kept on the phone with no signal and re-sent later. Every row in it
-- carries a phone-made UUID. incidents and witness_statements already have
-- the column (SQL #41); this adds it to the three child tables the package
-- also writes, so a re-send after a lost reply is refused as the SAME row
-- (23505) instead of making a second evidence / timeline / log row.
--
-- Additive only: one nullable column + one unique index per table. Existing
-- rows keep NULL (NULLs never collide). No deletes, no updates, no policy
-- change. Existing table-level INSERT grants cover the column.
--
-- Rollback (if ever needed):
--   drop index if exists public.<table>_client_submission_id_key;
--   alter table public.<table> drop column if exists client_submission_id;

do $$
declare
  t text;
  tbls text[] := array['investigation_evidence','timeline_events','investigation_activity_log'];
begin
  foreach t in array tbls loop
    if to_regclass('public.' || t) is null then
      raise notice 'skip % (no such table)', t;
      continue;
    end if;
    execute format('alter table public.%I add column if not exists client_submission_id uuid', t);
    execute format('create unique index if not exists %I on public.%I (client_submission_id)', t || '_client_submission_id_key', t);
    execute format('comment on column public.%I.client_submission_id is %L', t,
      'UUID made on the phone (SafeSubmit package); unique so an offline/lost-reply re-send can never double-insert.');
  end loop;
end
$$;

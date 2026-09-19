-- Historical test records: identity for idempotency, and import provenance.
--
-- The records being loaded go back years and were kept outside this system, so
-- two things have to be true before they land in a compliance table: importing
-- the same sheet twice must change nothing, and every row must carry where it
-- came from.

alter table public.da_test_events
  -- The importer's own row identifier, when the source sheet has one. The
  -- surest dedupe key, because it survives a corrected spelling of a name.
  add column if not exists external_ref text,
  -- Which import produced this row, so a bad load can be found and undone as
  -- a unit rather than picked apart by hand.
  add column if not exists import_batch uuid,
  add column if not exists imported_at timestamptz,
  add column if not exists imported_by text,
  -- Set when the sheet named a person we could not match to a pool member or
  -- driver. The row still counts for MIS - the federal form aggregates by
  -- client, reason and outcome, and never by individual - but the link is
  -- absent and that is worth seeing rather than hiding.
  add column if not exists subject_unmatched boolean not null default false;

create unique index if not exists da_test_events_external_ref_uidx
  on public.da_test_events (client_id, external_ref)
  where external_ref is not null;

-- The natural key for a sheet with no identifier of its own: one person, one
-- day, one programme, one kind of test, one reason. A second row with all six
-- the same is a re-import, not a second test.
--
-- lower(btrim(subject_name)) rather than the raw name, so "Jack Morris" and
-- " jack morris " collide as they should.
create unique index if not exists da_test_events_natural_uidx
  on public.da_test_events
     (client_id, lower(btrim(subject_name)), event_date, program, test_kind, reason)
  where external_ref is null;

create index if not exists da_test_events_batch_idx
  on public.da_test_events (import_batch) where import_batch is not null;

comment on column public.da_test_events.subject_unmatched is
  'The imported sheet named someone we could not match to a pool member or '
  'driver. The row still aggregates into MIS, which counts by client and '
  'reason rather than by person; only the link is missing.';

-- Import runs, so a load can be reviewed and reversed as a unit.
create table if not exists public.da_import_batches (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null default 'test_history'
                 check (kind in ('test_history', 'dob_roster', 'query_history')),
  filename     text,
  imported_by  text not null,
  imported_at  timestamptz not null default now(),
  row_count    integer not null default 0,
  applied      integer not null default 0,
  skipped      integer not null default 0,
  rejected     integer not null default 0,
  notes        text
);

alter table public.da_import_batches enable row level security;
revoke all on public.da_import_batches from anon, authenticated;

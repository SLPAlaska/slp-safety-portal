-- Everything the FMCSA bulk query loop needs.
--
-- There is no Clearinghouse API. FMCSA is explicit that no integration
-- specification exists and that employers and C/TPAs must access the
-- Clearinghouse directly, because the system has to record specific driver
-- consent electronically inside itself. The only integration surface is bulk
-- file upload, so this models an export/import loop rather than a client.
--
-- Four things here:
--   1. DOB on da_drivers, encrypted exactly like the CDL, because the bulk
--      file requires it and it is identification data of the same class.
--   2. Limited-query general consent, which is the one consent a C/TPA can
--      actually hold.
--   3. A per-client query balance, updated by hand, because a C/TPA may not
--      purchase a query plan on an employer's behalf.
--   4. Batches, so a generated file and the results that come back are the
--      same object and re-importing cannot double-apply.

-- ── 1. Date of birth ────────────────────────────────────────────────────────
--
-- The bulk file needs LastName, FirstName, DOB, CDL, Country. DOB is not
-- optional there and it is not less sensitive than the CDL, so it gets the
-- same treatment: encrypted at rest with the same Vault key, written and read
-- only through service-role functions, never selectable by a client role.
alter table public.da_drivers
  add column if not exists dob_enc bytea,
  -- Birth YEAR only, for disambiguating two drivers with the same name in a
  -- list without decrypting anything. A year alone is not identification.
  add column if not exists dob_year integer;

revoke select (dob_enc) on public.da_drivers from authenticated;

create or replace function public.da_store_dob(p_driver uuid, p_dob text)
returns text language plpgsql security definer set search_path = public as $$
declare y integer;
begin
  if p_dob is null or btrim(p_dob) = '' then return 'skipped'; end if;
  begin
    y := extract(year from p_dob::date);
  exception when others then
    raise exception 'dob must be a parseable date, got %', p_dob;
  end;
  update public.da_drivers
     set dob_enc = public.da_encrypt_cdl(btrim(p_dob)),
         dob_year = y
   where id = p_driver;
  if not found then raise exception 'no driver %', p_driver; end if;
  return 'stored';
end $$;

create or replace function public.da_reveal_dob(p_driver uuid)
returns text language plpgsql security definer set search_path = public as $$
declare v bytea;
begin
  select dob_enc into v from public.da_drivers where id = p_driver;
  return public.da_decrypt_cdl(v);
end $$;

revoke all on function public.da_store_dob(uuid, text)  from public, anon, authenticated;
revoke all on function public.da_reveal_dob(uuid)       from public, anon, authenticated;
grant execute on function public.da_store_dob(uuid, text) to service_role;
grant execute on function public.da_reveal_dob(uuid)      to service_role;

-- ── 2. Limited-query general consent ────────────────────────────────────────
--
-- The consent split is the whole reason this table can exist. A LIMITED query
-- uses a general consent obtained OUTSIDE the Clearinghouse, which may run
-- multiple years — so we can hold it and evidence it. A FULL query needs
-- specific consent given electronically INSIDE the Clearinghouse before every
-- single query, which we can request and track but can never collect.
--
-- Nothing in this table may therefore be used to authorise a full query, and
-- the CHECK below stops anyone recording one here by mistake.
create table if not exists public.da_query_consents (
  id           uuid primary key default gen_random_uuid(),
  driver_id    uuid not null references public.da_drivers(id) on delete cascade,
  client_id    uuid references public.da_clients(id) on delete set null,

  consent_type text not null default 'limited_general'
                 check (consent_type = 'limited_general'),

  signed_date  date not null,
  -- How long the driver agreed to cover. NULL = no stated end, which is
  -- allowed but flagged in the UI, because an open-ended consent is harder to
  -- defend than a dated one.
  expires_date date,
  -- What the driver agreed to, in their words or ours: which employer, which
  -- period, any limits.
  scope        text not null,

  method       text check (method in ('wet_signature', 'electronic', 'verbal_documented')),
  document_ref text,
  obtained_by  text,
  revoked_at   timestamptz,
  notes        text,
  created_at   timestamptz not null default now(),

  constraint da_consent_expiry_after_signing check (
    expires_date is null or expires_date >= signed_date)
);

create index if not exists da_query_consents_driver_idx
  on public.da_query_consents (driver_id, signed_date desc);

comment on table public.da_query_consents is
  'General consent for LIMITED Clearinghouse queries only, obtained outside '
  'the Clearinghouse and possibly multi-year (49 CFR 382.703). Full-query '
  'consent is given electronically inside the Clearinghouse before each query '
  'and can never be recorded here.';

-- Is there a live limited-query consent for this driver today?
create or replace function public.da_has_limited_consent(p_driver uuid, p_on date default current_date)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.da_query_consents c
     where c.driver_id = p_driver
       and c.revoked_at is null
       and c.signed_date <= p_on
       and (c.expires_date is null or c.expires_date >= p_on))
$$;

grant execute on function public.da_has_limited_consent(uuid, date) to authenticated, service_role;

-- ── 3. Query balance, per client ────────────────────────────────────────────
--
-- A C/TPA may not purchase a query plan on an employer's behalf, so this is
-- never bought or decremented automatically from here. It is what the employer
-- told us they hold, so a file for 57 drivers is not built against a balance
-- of 10. Updated by hand, with the date, because a stale number is worse than
-- no number.
alter table public.da_clients
  add column if not exists query_balance integer,
  add column if not exists query_balance_as_of date,
  add column if not exists query_balance_note text;

comment on column public.da_clients.query_balance is
  'Queries the EMPLOYER holds in their own Clearinghouse plan, as last '
  'reported to us. A C/TPA cannot buy these, so this is a manually maintained '
  'figure, never authoritative and never auto-decremented.';

-- ── 4. Bulk batches ─────────────────────────────────────────────────────────
--
-- A generated file and the results that come back are one object. Every query
-- row the generator creates is tied to its batch, so ingesting the Query
-- History export matches on (batch, driver) and updating an already-resolved
-- row is a no-op rather than a duplicate.
create table if not exists public.da_bulk_batches (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.da_clients(id) on delete cascade,

  -- 1 limited, 2 full, 3 pre-employment, 4 limited with automatic consent
  -- request. Defaults to 1: type 4 escalates automatically when a limited
  -- query finds a record, which is useful, but FMCSA's own Bulk Queries File
  -- Setup page could not be retrieved to confirm that behaviour at the
  -- primary source, so it is offered rather than assumed.
  query_type   integer not null default 1 check (query_type in (1, 2, 3, 4)),

  status       text not null default 'generated'
                 check (status in ('generated', 'submitted', 'ingested', 'cancelled')),
  driver_count integer not null default 0,
  filename     text,
  created_by   text not null,
  created_at   timestamptz not null default now(),
  submitted_at timestamptz,
  ingested_at  timestamptz,
  notes        text
);

create index if not exists da_bulk_batches_client_idx
  on public.da_bulk_batches (client_id, created_at desc);

alter table public.da_clearinghouse_queries
  add column if not exists bulk_batch_id uuid references public.da_bulk_batches(id) on delete set null,
  -- The Clearinghouse's own identifier where the export supplies one. Unique,
  -- so importing the same export twice cannot create a second row.
  add column if not exists external_query_id text,
  add column if not exists resolved_at timestamptz,
  add column if not exists resolved_by text;

create unique index if not exists da_ch_external_id_uidx
  on public.da_clearinghouse_queries (external_query_id)
  where external_query_id is not null;

-- One pending row per driver per batch. This is what makes generating a file
-- twice safe: the second attempt collides instead of duplicating.
create unique index if not exists da_ch_batch_driver_uidx
  on public.da_clearinghouse_queries (bulk_batch_id, driver_id)
  where bulk_batch_id is not null;

-- ── RLS for the new tables ──────────────────────────────────────────────────
alter table public.da_query_consents enable row level security;
alter table public.da_bulk_batches   enable row level security;
revoke all on public.da_query_consents, public.da_bulk_batches from anon, authenticated;

create policy da_query_consents_der_read on public.da_query_consents
  for select to authenticated
  using (client_id is not null and public.da_is_der_for(client_id));
grant select on public.da_query_consents to authenticated;

create policy da_bulk_batches_der_read on public.da_bulk_batches
  for select to authenticated
  using (public.da_is_der_for(client_id));
grant select on public.da_bulk_batches to authenticated;

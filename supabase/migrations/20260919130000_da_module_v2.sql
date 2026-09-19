-- Drug & Alcohol module, v2 — C/TPA model.
--
-- Supersedes 20260919120000, which modelled a D&A programme as a property of a
-- portal tenant. That was wrong: SLP Alaska is a C/TPA in the FMCSA
-- Clearinghouse and sells this standalone, so most D&A clients have no portal,
-- no LMS and no users at all. The v2 tables below are dropped and rebuilt
-- rather than migrated because v1 never held a row outside a test.
--
-- WHAT CHANGED, AND WHY EACH MATTERS
--
-- 1. A D&A client is its own record type (da_clients). Creating one does NOT
--    create an lms_companies row, a portal tenant or a SAIL mapping. Where a
--    client HAPPENS to be a portal tenant the link is recorded, but it is
--    nullable and nothing depends on it.
-- 2. A pool belongs to EITHER one client OR a consortium. As a C/TPA we may
--    combine small employers into one random pool with the rate applied to the
--    combined pool, so rates and frequency live on the POOL, not the client.
--    Every member still carries its own client_id so reporting breaks out by
--    employer — each one needs its own records for its own audit.
-- 3. DOT and non-DOT never mix, inside a consortium exactly as inside a single
--    client. pool_kind is on the pool and a member inherits it.
-- 4. DOT test results are NOT stored. Status plus an MIS outcome category only.
-- 5. Non-DOT instant tests ARE stored, but the schema makes a bare positive
--    impossible to record — see da_instant_tests.
-- 6. Every test reason, not just random. MIS cannot be produced from random
--    data alone.
-- 7. The Clearinghouse query log replaces a spreadsheet, and adds the three
--    things a spreadsheet cannot do: annual due-date tracking, consent gating
--    as a constraint, and the SAP/RTD/follow-up sequence as a workflow.
--
-- ACCESS, ACROSS THE WHOLE MODULE
--
-- Pending selections, instant test results, Clearinghouse records and CDL
-- numbers are visible to SLP staff and the client's DER only — never to a
-- general company_admin, never to supervisors at large, never to employees.
-- RLS here grants to DERs alone; SLP staff reach everything through the
-- service-role API, which checks superAdmins.js and portal_staff. The
-- superadmin list is deliberately NOT copied into SQL.

drop table if exists public.da_selections   cascade;
drop table if exists public.da_pulls        cascade;
drop table if exists public.da_pool_members cascade;
drop table if exists public.da_programs     cascade;

create extension if not exists pgcrypto;

-- ── Clients ─────────────────────────────────────────────────────────────────
create table public.da_clients (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique,

  -- Optional, and optional is the point. A D&A client is not a portal tenant.
  -- Populated only where the same company also exists in the portal.
  lms_company_id uuid unique references public.lms_companies(id) on delete set null,

  -- Per-client agency override; the pool may override again for a consortium.
  dot_agency    text not null default 'FMCSA',

  active        boolean not null default true,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.da_clients is
  'Drug & alcohol testing clients. Independent of lms_companies: most have no '
  'portal presence. lms_company_id links the ones that do and is never required.';

-- ── Consortia ───────────────────────────────────────────────────────────────
create table public.da_consortia (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  dot_agency text not null default 'FMCSA',
  active     boolean not null default true,
  notes      text,
  created_at timestamptz not null default now()
);

create table public.da_consortium_members (
  id            uuid primary key default gen_random_uuid(),
  consortium_id uuid not null references public.da_consortia(id) on delete cascade,
  client_id     uuid not null references public.da_clients(id) on delete cascade,
  joined_at     timestamptz not null default now(),
  left_at       timestamptz,
  active        boolean not null default true,
  unique (consortium_id, client_id)
);

-- ── Pools ───────────────────────────────────────────────────────────────────
create table public.da_pools (
  id            uuid primary key default gen_random_uuid(),

  -- Exactly one owner. A pool is one client's or one consortium's, never both
  -- and never neither, which the check below enforces rather than trusts.
  client_id     uuid references public.da_clients(id) on delete cascade,
  consortium_id uuid references public.da_consortia(id) on delete cascade,

  pool_kind     text not null check (pool_kind in ('DOT', 'NON_DOT')),

  -- On the pool, because a consortium applies the rate to the COMBINED pool.
  frequency     text not null default 'quarterly'
                  check (frequency in ('monthly', 'quarterly')),
  drug_rate     numeric not null default 50 check (drug_rate between 0 and 100),
  alcohol_rate  numeric not null default 10 check (alcohol_rate between 0 and 100),

  -- NULL means inherit from the owning client or consortium. PHMSA has no
  -- random alcohol requirement at all, which is expressed as alcohol_rate 0
  -- rather than as a special case in code.
  dot_agency    text,

  active        boolean not null default true,
  created_at    timestamptz not null default now(),

  constraint da_pools_one_owner check (
    (client_id is not null and consortium_id is null) or
    (client_id is null and consortium_id is not null)
  )
);

create unique index da_pools_client_kind_idx
  on public.da_pools (client_id, pool_kind) where client_id is not null;
create unique index da_pools_consortium_kind_idx
  on public.da_pools (consortium_id, pool_kind) where consortium_id is not null;

-- ── Pool membership ─────────────────────────────────────────────────────────
create table public.da_pool_members (
  id             uuid primary key default gen_random_uuid(),
  pool_id        uuid not null references public.da_pools(id) on delete cascade,

  -- Required even inside a consortium pool. The draw is across the whole
  -- consortium; the REPORTING is per employer, and without this the breakout
  -- each employer needs for its own audit is not reconstructable.
  client_id      uuid not null references public.da_clients(id) on delete cascade,

  full_name      text not null,
  employee_ident text,
  lms_user_id    uuid references public.lms_users(id) on delete set null,

  -- Membership history is an audit fact: who was eligible at the instant of a
  -- pull decides whether that pull was valid. Never hard deleted.
  active         boolean not null default true,
  added_at       timestamptz not null default now(),
  removed_at     timestamptz,
  notes          text,
  created_at     timestamptz not null default now()
);

create index da_pool_members_pool_idx on public.da_pool_members (pool_id, active);
create index da_pool_members_client_idx on public.da_pool_members (client_id, active);

-- ── Pulls: immutable ────────────────────────────────────────────────────────
create table public.da_pulls (
  id                   uuid primary key default gen_random_uuid(),
  pool_id              uuid not null references public.da_pools(id) on delete cascade,
  period_label         text not null,
  run_at               timestamptz not null default now(),
  run_by               text not null,

  pool_size_at_pull    integer not null check (pool_size_at_pull >= 0),
  drug_select_count    integer not null check (drug_select_count >= 0),
  alcohol_select_count integer not null check (alcohol_select_count >= 0),

  -- What was in force on the day, not what is configured now.
  rates_applied        jsonb not null,
  method_note          text not null,
  eligible_member_ids  jsonb not null,

  -- Per-client eligible counts at pull time, so a consortium pull can be
  -- broken out per employer years later without replaying the roster.
  client_breakdown     jsonb not null default '{}'::jsonb,

  created_at           timestamptz not null default now(),

  -- One run per pool per period. A duplicate would quietly double the rate.
  unique (pool_id, period_label)
);

create index da_pulls_pool_idx on public.da_pulls (pool_id, run_at desc);

-- ── Selections ──────────────────────────────────────────────────────────────
create table public.da_selections (
  id                uuid primary key default gen_random_uuid(),
  pull_id           uuid not null references public.da_pulls(id) on delete cascade,
  member_id         uuid not null references public.da_pool_members(id),

  -- Denormalised so per-employer reporting and RLS work without walking back
  -- through the pull to the pool to the consortium.
  client_id         uuid not null references public.da_clients(id) on delete cascade,

  -- Drug and alcohol are drawn INDEPENDENTLY from the same pool. Anyone who
  -- comes up on both lists is recorded once as 'both' and tested for both at
  -- one stop. Nothing pairs the draws and nothing excludes a drug selectee
  -- from the alcohol draw; independence is the compliance requirement.
  test_type         text not null check (test_type in ('drug', 'alcohol', 'both')),

  status            text not null default 'selected'
                      check (status in ('selected', 'notified', 'completed', 'not_tested')),
  status_date       timestamptz,
  not_tested_reason text,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint da_selections_reason_required check (
    status <> 'not_tested' or
    (not_tested_reason is not null and length(btrim(not_tested_reason)) > 0)),

  unique (pull_id, member_id)
);

create index da_selections_client_status_idx on public.da_selections (client_id, status);

-- ── Test events: EVERY reason, not just random ──────────────────────────────
--
-- MIS breaks out by reason and cannot be produced from random data alone, so
-- pre-employment, post-accident, reasonable suspicion, return-to-duty and
-- follow-up all land here too.
--
-- For a DOT event the individual RESULT is never stored. What is stored is the
-- MIS outcome category — the bucket the DOT F 1385 form counts — plus status.
--
-- Stated plainly, because it should be argued about rather than assumed: an
-- MIS outcome category attached to a named person is still individual-level
-- information about that person's test, even though it is not a result record
-- and carries no levels, no specimen data and no MRO detail. It is the minimum
-- the federal form can be built from. It is therefore protected exactly like
-- the rest of this module: DER and SLP staff only.
create table public.da_test_events (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references public.da_clients(id) on delete cascade,

  -- Null for a pre-employment candidate, who is not in a pool yet.
  member_id     uuid references public.da_pool_members(id) on delete set null,
  subject_name  text not null,
  subject_ident text,

  program       text not null check (program in ('DOT', 'NON_DOT')),
  dot_agency    text,

  reason        text not null check (reason in
                  ('pre_employment', 'random', 'post_accident',
                   'reasonable_suspicion', 'return_to_duty', 'follow_up')),
  test_kind     text not null check (test_kind in ('drug', 'alcohol')),

  event_date    date not null,

  -- Present only when this event came from a random selection.
  selection_id  uuid references public.da_selections(id) on delete set null,

  status        text not null default 'selected'
                  check (status in ('selected', 'notified', 'completed', 'not_tested')),
  status_date   timestamptz,
  not_tested_reason text,

  -- MIS drug columns (DOT F 1385 section III). Mutually exclusive buckets;
  -- the drug breakout is a separate array because the form counts a positive
  -- for one OR MORE drugs.
  drug_mis_outcome text check (drug_mis_outcome in
    ('verified_negative', 'verified_positive',
     'refusal_adulterated', 'refusal_substituted',
     'refusal_shy_bladder_no_medical', 'refusal_other', 'cancelled')),
  drug_positive_for text[] default '{}',

  -- MIS alcohol columns (section IV). Screening and confirmation are separate
  -- columns on the form, so they are separate here.
  alcohol_screen_mis text check (alcohol_screen_mis in
    ('below_002', '002_or_greater',
     'refusal_shy_lung_no_medical', 'refusal_other', 'cancelled')),
  alcohol_confirm_mis text check (alcohol_confirm_mis in
    ('not_required', '002_through_0039', '004_or_greater', 'cancelled')),

  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- The MIS bucket belongs to the matching test kind and nowhere else.
  constraint da_test_events_kind_matches_outcome check (
    (test_kind = 'drug'
       and alcohol_screen_mis is null and alcohol_confirm_mis is null)
    or
    (test_kind = 'alcohol'
       and drug_mis_outcome is null and coalesce(array_length(drug_positive_for, 1), 0) = 0)
  ),

  -- A drug breakout only means something alongside a verified positive.
  constraint da_test_events_breakout_needs_positive check (
    coalesce(array_length(drug_positive_for, 1), 0) = 0
    or drug_mis_outcome = 'verified_positive'
  ),

  -- A completed test has to land in an MIS bucket or it cannot be reported;
  -- an incomplete one must not pretend to.
  constraint da_test_events_completed_has_outcome check (
    status <> 'completed'
    or (test_kind = 'drug'    and drug_mis_outcome   is not null)
    or (test_kind = 'alcohol' and alcohol_screen_mis is not null)
  ),

  constraint da_test_events_reason_required check (
    status <> 'not_tested' or
    (not_tested_reason is not null and length(btrim(not_tested_reason)) > 0))
);

create index da_test_events_client_idx on public.da_test_events (client_id, event_date desc);
create index da_test_events_mis_idx on public.da_test_events (client_id, program, reason, test_kind);

-- ── Non-DOT instant tests ───────────────────────────────────────────────────
--
-- We administer these ourselves and Part 40 does not govern them, so unlike
-- DOT tests they ARE stored. The schema makes a bare positive impossible to
-- record: `instant_outcome` has no positive value, by construction. An instant
-- non-negative is presumptive and nothing more. A result only exists once the
-- lab confirms it, in a separate row written at a separate time.
create table public.da_instant_tests (
  id             uuid primary key default gen_random_uuid(),
  test_event_id  uuid not null unique references public.da_test_events(id) on delete cascade,
  client_id      uuid not null references public.da_clients(id) on delete cascade,

  collected_at   timestamptz not null default now(),
  administered_by text,
  device_name    text,
  panel          text,

  -- Two values. There is deliberately no third.
  instant_outcome text not null check (instant_outcome in
    ('negative_final', 'non_negative_sent_to_lab')),

  sent_to_lab_at timestamptz,
  lab_name       text,
  lab_accession  text,
  notes          text,
  created_at     timestamptz not null default now(),

  -- A non-negative that was never sent is an open loop, not a finding.
  constraint da_instant_non_negative_goes_to_lab check (
    instant_outcome <> 'non_negative_sent_to_lab' or sent_to_lab_at is not null
  )
);

create table public.da_lab_confirmations (
  id               uuid primary key default gen_random_uuid(),

  -- A confirmation cannot exist without the instant test it confirms, and the
  -- trigger below refuses one attached to a negative_final.
  instant_test_id  uuid not null unique references public.da_instant_tests(id) on delete cascade,
  client_id        uuid not null references public.da_clients(id) on delete cascade,

  reported_at      timestamptz not null default now(),
  outcome          text not null check (outcome in
    ('negative', 'positive', 'adulterated', 'substituted', 'invalid', 'cancelled')),
  substances       text[] default '{}',
  reviewed_by      text,
  notes            text,
  created_at       timestamptz not null default now(),

  constraint da_lab_substances_need_positive check (
    coalesce(array_length(substances, 1), 0) = 0 or outcome = 'positive'
  )
);

create or replace function public.da_lab_requires_non_negative()
returns trigger language plpgsql as $$
declare v text;
begin
  select instant_outcome into v from public.da_instant_tests where id = new.instant_test_id;
  if v is distinct from 'non_negative_sent_to_lab' then
    raise exception
      'a lab confirmation can only follow an instant non-negative that was sent to the lab (found: %)', v;
  end if;
  return new;
end $$;

create trigger da_lab_confirmations_guard
  before insert or update on public.da_lab_confirmations
  for each row execute function public.da_lab_requires_non_negative();

-- ── Drivers and CDL numbers ─────────────────────────────────────────────────
--
-- CDL numbers are identification data, so they live in exactly one place,
-- encrypted at rest, and are read only through a function that SLP staff and
-- the client's DER can call. `cdl_last4` exists so a list can be rendered and
-- a record matched without decrypting anything.
--
-- The encryption key is held in Supabase Vault under 'da_cdl_key' and resolved
-- at call time. It is NOT in this migration, not in git, and not in any cron
-- body — same rule as every other secret in this project.
create table public.da_drivers (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid references public.da_clients(id) on delete set null,
  full_name    text not null,

  cdl_number_enc bytea,
  cdl_last4      text,
  cdl_state      text,

  -- Set when a row arrived from the legacy spreadsheet and could not be fully
  -- resolved — e.g. no company named. Better visible than silently guessed.
  needs_review   boolean not null default false,

  active       boolean not null default true,
  notes        text,
  created_at   timestamptz not null default now()
);

create index da_drivers_client_idx on public.da_drivers (client_id, active);

create or replace function public.da_encrypt_cdl(p_cdl text)
returns bytea language plpgsql security definer set search_path = public, vault as $$
declare k text;
begin
  if p_cdl is null or btrim(p_cdl) = '' then return null; end if;
  select decrypted_secret into k from vault.decrypted_secrets where name = 'da_cdl_key';
  if k is null then
    raise exception 'vault secret da_cdl_key is not set; refusing to store a CDL number in clear';
  end if;
  return pgp_sym_encrypt(btrim(p_cdl), k);
end $$;

create or replace function public.da_decrypt_cdl(p_enc bytea)
returns text language plpgsql security definer set search_path = public, vault as $$
declare k text;
begin
  if p_enc is null then return null; end if;
  select decrypted_secret into k from vault.decrypted_secrets where name = 'da_cdl_key';
  if k is null then return null; end if;
  return pgp_sym_decrypt(p_enc, k);
end $$;

revoke all on function public.da_encrypt_cdl(text) from public, anon, authenticated;
revoke all on function public.da_decrypt_cdl(bytea) from public, anon, authenticated;

-- ── Clearinghouse query log ─────────────────────────────────────────────────
create table public.da_clearinghouse_queries (
  id             uuid primary key default gen_random_uuid(),
  driver_id      uuid not null references public.da_drivers(id) on delete cascade,
  client_id      uuid references public.da_clients(id) on delete set null,

  query_date     date not null,
  query_type     text not null check (query_type in ('full', 'limited')),

  -- Consent gating. A full query cannot be run without consent on file, so a
  -- completed full query with consent = false is refused by the database
  -- rather than caught in review. 'pending' exists because the legacy sheet
  -- has rows where a query was submitted and nothing had come back yet — those
  -- are genuinely pending and must not be given an inferred result.
  consent_on_file boolean not null default false,
  result         text not null default 'pending'
                   check (result in ('pending', 'clear', 'record_exists', 'prohibited')),

  query_result_summary text,
  full_query_needed    boolean,
  violation_reported   boolean,
  notes                text,

  -- Set when the legacy import could not resolve something.
  needs_review   boolean not null default false,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint da_clearinghouse_full_query_needs_consent check (
    query_type <> 'full' or result = 'pending' or consent_on_file = true
  )
);

create index da_ch_driver_idx on public.da_clearinghouse_queries (driver_id, query_date desc);
create index da_ch_client_idx on public.da_clearinghouse_queries (client_id, query_date desc);

-- Annual query tracking. 49 CFR 382.701 requires a limited query per active
-- CDL driver every 12 months, and a missed one is the most common
-- Clearinghouse audit finding. The spreadsheet gave no warning at all; this
-- view computes the due date from the last query and flags 30 days out.
create or replace view public.da_clearinghouse_annual_due as
select
  d.id                as driver_id,
  d.client_id,
  d.full_name,
  d.active,
  max(q.query_date)                        as last_query_date,
  (max(q.query_date) + interval '12 months')::date as next_due_date,
  ((max(q.query_date) + interval '12 months')::date - current_date) as days_until_due,
  case
    when max(q.query_date) is null then 'never_queried'
    when (max(q.query_date) + interval '12 months')::date < current_date then 'overdue'
    when (max(q.query_date) + interval '12 months')::date - current_date <= 30 then 'due_soon'
    else 'current'
  end as due_status
from public.da_drivers d
left join public.da_clearinghouse_queries q
       on q.driver_id = d.id and q.result <> 'pending'
where d.active
group by d.id, d.client_id, d.full_name, d.active;

comment on view public.da_clearinghouse_annual_due is
  'Annual limited-query tracking per 49 CFR 382.701. due_status is overdue / '
  'due_soon (within 30 days) / current / never_queried. Pending queries are '
  'excluded from last_query_date: a submitted query with nothing back does not '
  'satisfy the annual requirement.';

-- ── SAP / RTD / follow-up as a workflow ─────────────────────────────────────
--
-- In the spreadsheet these were seven free-text columns full of 'TBD' and
-- 'Pending', so an unfinished return-to-duty programme was indistinguishable
-- from a finished one. Here the stage is an ordered enum: an incomplete
-- programme is visible because it is sitting at a stage, not because someone
-- notices a TBD.
create table public.da_sap_programs (
  id            uuid primary key default gen_random_uuid(),
  driver_id     uuid not null references public.da_drivers(id) on delete cascade,
  client_id     uuid references public.da_clients(id) on delete set null,

  -- What put the driver in the programme.
  triggering_violation text check (triggering_violation in
    ('positive_test', 'refusal', 'alcohol_004_or_greater', 'other')),
  opened_at     date not null default current_date,

  stage         text not null default 'violation_reported' check (stage in (
    'violation_reported',
    'sap_assigned',
    'sap_evaluation_complete',
    'rtd_test_scheduled',
    'rtd_test_passed',
    'cleared_for_duty',
    'follow_up_plan_issued',
    'follow_up_in_progress',
    'follow_up_complete')),

  sap_name          text,
  sap_assigned_date date,

  rtd_test_date     date,
  rtd_test_result   text check (rtd_test_result in ('pending', 'pass', 'fail')),
  cleared_for_duty  boolean not null default false,

  follow_up_plan_issued   boolean not null default false,
  follow_up_tests_planned integer,
  follow_up_tests_done    integer not null default 0,

  closed_at     date,
  notes         text,
  needs_review  boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- Cannot claim a stage past the SAP without naming the SAP.
  constraint da_sap_named_when_assigned check (
    stage in ('violation_reported') or sap_name is not null
  ),
  -- Cannot be cleared for duty without a passed RTD test.
  constraint da_sap_cleared_needs_passed_rtd check (
    cleared_for_duty = false or rtd_test_result = 'pass'
  ),
  -- Cannot complete follow-up without a plan and at least one test.
  constraint da_sap_followup_complete_needs_plan check (
    stage <> 'follow_up_complete'
    or (follow_up_plan_issued = true and follow_up_tests_done > 0)
  )
);

create index da_sap_driver_idx on public.da_sap_programs (driver_id);
create index da_sap_open_idx on public.da_sap_programs (client_id, stage) where closed_at is null;

-- ── Who is a DER ────────────────────────────────────────────────────────────
--
-- A DER is named per client and is NOT the same thing as a portal
-- company_admin. A D&A client may have no portal users at all, so a DER is
-- identified by their auth user, with the LMS link optional.
create table public.da_client_ders (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.da_clients(id) on delete cascade,
  auth_user_id uuid not null,
  full_name    text,
  email        text,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  unique (client_id, auth_user_id)
);

create or replace function public.da_is_der_for(p_client uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.da_client_ders d
     where d.client_id = p_client and d.auth_user_id = auth.uid() and d.active
  )
$$;

revoke all on function public.da_is_der_for(uuid) from public, anon;
grant execute on function public.da_is_der_for(uuid) to authenticated;

-- ── RLS ─────────────────────────────────────────────────────────────────────
--
-- SELECT for the client's own DER, and nothing else. No INSERT, UPDATE or
-- DELETE policy exists anywhere in this module, so da_pulls is immutable from
-- a client by construction and every write goes through the service-role API.
-- A general company_admin gets nothing here — there is no policy that would
-- let them in.
do $$
declare t text;
begin
  foreach t in array array[
    'da_clients','da_consortia','da_consortium_members','da_pools',
    'da_pool_members','da_pulls','da_selections','da_test_events',
    'da_instant_tests','da_lab_confirmations','da_drivers',
    'da_clearinghouse_queries','da_sap_programs','da_client_ders']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

-- Tables carrying a client_id: the DER of that client may read.
do $$
declare t text;
begin
  foreach t in array array[
    'da_pool_members','da_selections','da_test_events','da_instant_tests',
    'da_lab_confirmations','da_drivers','da_clearinghouse_queries','da_sap_programs']
  loop
    execute format(
      'create policy %I on public.%I for select to authenticated
         using (client_id is not null and public.da_is_der_for(client_id))', t || '_der_read', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
end $$;

create policy da_clients_der_read on public.da_clients
  for select to authenticated using (public.da_is_der_for(id));
grant select on public.da_clients to authenticated;

create policy da_pools_der_read on public.da_pools
  for select to authenticated using (
    (client_id is not null and public.da_is_der_for(client_id))
    or (consortium_id is not null and exists (
          select 1 from public.da_consortium_members m
           where m.consortium_id = da_pools.consortium_id
             and m.active and public.da_is_der_for(m.client_id))));
grant select on public.da_pools to authenticated;

create policy da_pulls_der_read on public.da_pulls
  for select to authenticated using (exists (
    select 1 from public.da_pools p where p.id = da_pulls.pool_id and (
      (p.client_id is not null and public.da_is_der_for(p.client_id))
      or (p.consortium_id is not null and exists (
            select 1 from public.da_consortium_members m
             where m.consortium_id = p.consortium_id
               and m.active and public.da_is_der_for(m.client_id))))));
grant select on public.da_pulls to authenticated;

-- The CDL column itself is never granted to a client role. Even a DER reads
-- da_drivers without it; the decrypt function is service-role only and the API
-- decides who may call it.
revoke select (cdl_number_enc) on public.da_drivers from authenticated;

-- ── Setting the CDL key ─────────────────────────────────────────────────────
--
-- The key itself is generated outside this file and installed by calling this
-- function once with the service role. That keeps it out of git, out of the
-- migration and out of any transcript — the same handling every other secret
-- in this project gets. Re-running with the same value is harmless; running it
-- with a DIFFERENT value makes every already-encrypted CDL unreadable, which
-- is why it refuses to replace a key while encrypted rows exist.
create or replace function public.da_set_cdl_key(p_key text)
returns text language plpgsql security definer set search_path = public, vault as $$
declare existing text; n int;
begin
  if p_key is null or length(p_key) < 32 then
    raise exception 'refusing a CDL key shorter than 32 characters';
  end if;
  select decrypted_secret into existing from vault.decrypted_secrets where name = 'da_cdl_key';
  if existing is not null and existing <> p_key then
    select count(*) into n from public.da_drivers where cdl_number_enc is not null;
    if n > 0 then
      raise exception
        'da_cdl_key already set and % driver row(s) are encrypted with it; replacing it would orphan them', n;
    end if;
    perform vault.update_secret((select id from vault.secrets where name = 'da_cdl_key'), p_key);
    return 'rotated';
  elsif existing is not null then
    return 'unchanged';
  end if;
  perform vault.create_secret(p_key, 'da_cdl_key', 'Encryption key for da_drivers.cdl_number_enc');
  return 'created';
end $$;

revoke all on function public.da_set_cdl_key(text) from public, anon, authenticated;

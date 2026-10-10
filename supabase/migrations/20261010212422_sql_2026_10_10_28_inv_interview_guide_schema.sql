-- SQL 2026-10-10-28 — Incident investigation Interview Guide (P0): schema.
-- SLP Safety Portal (iypezirwdlqpptjpeeyf). ADDITIVE ONLY: new tables, nullable
-- columns, new functions/triggers. No drops, no deletes, no rewrites of existing rows.
-- Idempotent: safe to re-run.

-- ---------------------------------------------------------------------------
-- 0. Who may use the guide. Investigator role lives in app_metadata (only the
--    service role can write it) — same rule as app/lib/investigatorAuth.js.
-- ---------------------------------------------------------------------------
create or replace function public.inv_is_investigator()
returns boolean language sql stable set search_path = public as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'investigator', false)
$$;

-- Platform super admins, exact email (mirrors app/lib/superAdmins.js — change both together).
create or replace function public.inv_is_super_admin()
returns boolean language sql stable set search_path = public as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) in ('brian@slpalaska.com', 'britney@slpalaska.com')
$$;

-- Team lead of an incident (security definer so it does not depend on incidents RLS).
create or replace function public.inv_is_incident_lead(p_incident uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.incidents i
                 where i.id = p_incident
                   and i.team_leader_email is not null
                   and lower(i.team_leader_email) = lower(coalesce(auth.jwt() ->> 'email', '')))
$$;
revoke all on function public.inv_is_incident_lead(uuid) from public;
grant execute on function public.inv_is_incident_lead(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 1. Bank catalogue + questions
-- ---------------------------------------------------------------------------
create table if not exists public.inv_question_banks (
  code text primary key,
  label text not null,
  kind text not null default 'hazard' check (kind in ('core','hazard','culture','rootcause')),
  preferred_ca text,
  sort int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.inv_question_banks enable row level security;

create table if not exists public.inv_question_bank (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  bank text not null references public.inv_question_banks(code),
  audience text[] not null default '{}',
  stage smallint not null default 3,
  prompt text not null,
  prompt_es text,
  help text,
  answer_type text not null default 'chips' check (answer_type in ('chips','multi','yesno','text','checklist')),
  options jsonb not null default '[]'::jsonb,   -- [{value,label,probe}]
  is_critical boolean not null default false,
  is_dig_deeper boolean not null default false,
  is_confidential boolean not null default false,
  trigger jsonb not null default '{}'::jsonb,
  sort int not null default 0,
  active boolean not null default true,
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists inv_qb_bank_idx on public.inv_question_bank(bank, sort);
alter table public.inv_question_bank enable row level security;

-- ---------------------------------------------------------------------------
-- 2. Responses (one row per question per incident; confidential rows may repeat)
-- ---------------------------------------------------------------------------
create table if not exists public.inv_question_responses (
  id uuid primary key default gen_random_uuid(),
  incident_uuid uuid not null references public.incidents(id),
  question_id uuid references public.inv_question_bank(id),
  question_code text not null,
  prompt_snapshot text not null,
  bank text not null,
  interviewee_role text check (interviewee_role in ('IP','SUP','WIT','PEER','INV')),
  interviewee_label text,
  answer_choice text[],
  answer_text text,
  probe_answer text,
  fact_status text not null default 'stated' check (fact_status in ('verified','stated','assumed')),
  not_applicable boolean not null default false,
  na_reason text,
  is_confidential boolean not null default false,
  answered_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inv_qr_confidential_no_label check (not is_confidential or interviewee_label is null)
);
create index if not exists inv_qr_incident_idx on public.inv_question_responses(incident_uuid);
create unique index if not exists inv_qr_one_per_question
  on public.inv_question_responses(incident_uuid, question_code) where not is_confidential;
alter table public.inv_question_responses enable row level security;

-- ---------------------------------------------------------------------------
-- 3. Per-company feature flag (keyed to lms_companies). Default OFF everywhere.
-- ---------------------------------------------------------------------------
create table if not exists public.inv_feature_flags (
  company_id uuid primary key references public.lms_companies(id),
  interview_guide boolean not null default false,
  enabled_by text,
  enabled_at timestamptz,
  notes text,
  updated_at timestamptz not null default now()
);
alter table public.inv_feature_flags enable row level security;
insert into public.inv_feature_flags (company_id)
  select id from public.lms_companies
  on conflict (company_id) do nothing;

-- Resolves an incident/form company string (canonical name or any SAIL variant) to the flag.
-- Security definer so the anonymous field report can ask "is it on?" without reading tables.
create or replace function public.inv_guide_enabled(p_company text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(bool_or(f.interview_guide), false)
  from public.inv_feature_flags f
  join public.lms_companies c on c.id = f.company_id
  where p_company is not null and length(trim(p_company)) > 0
    and (lower(c.name) = lower(trim(p_company))
         or exists (select 1 from unnest(coalesce(c.sail_company_names, '{}'::text[])) s
                    where lower(s) = lower(trim(p_company))))
$$;
revoke all on function public.inv_guide_enabled(text) from public;
grant execute on function public.inv_guide_enabled(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. New nullable columns
-- ---------------------------------------------------------------------------
alter table public.incidents
  add column if not exists hazard_types text[],
  add column if not exists work_setting text,
  add column if not exists is_repeat boolean,
  add column if not exists weak_control_justification text;

alter table public.investigation_corrective_actions
  add column if not exists root_cause_link text,
  add column if not exists verification_method text,
  add column if not exists verify_by date,
  add column if not exists weak_control_flag boolean;

-- is_repeat: same company + overlapping hazard type in the prior 12 months.
-- Fires only when hazard_types is set, so legacy rows are untouched.
create or replace function public.inv_set_is_repeat()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.hazard_types is null or cardinality(new.hazard_types) = 0 or new.company_name is null then
    return new;
  end if;
  begin
    new.is_repeat := exists (
      select 1 from public.incidents i
      where i.id is distinct from new.id
        and lower(i.company_name) = lower(new.company_name)
        and i.hazard_types && new.hazard_types
        and coalesce(i.incident_date, i.created_at::date)
            between coalesce(new.incident_date, current_date) - 365 and coalesce(new.incident_date, current_date)
    );
  exception when others then
    -- never block an incident report over a convenience flag
    null;
  end;
  return new;
end $$;
do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'inv_incidents_is_repeat' and tgrelid = 'public.incidents'::regclass) then
    create trigger inv_incidents_is_repeat
      before insert or update of hazard_types, company_name, incident_date on public.incidents
      for each row execute function public.inv_set_is_repeat();
  end if;
end $$;

-- weak_control_flag: counseling / retrain / remind language, or Admin/PPE level.
create or replace function public.inv_set_weak_control_flag()
returns trigger language plpgsql set search_path = public as $$
declare t text := lower(coalesce(new.description, '') || ' ' || coalesce(new.action_description, ''));
begin
  new.weak_control_flag :=
    coalesce(new.hierarchy_level, 0) >= 4
    or t ~ '(counsel|re-?train|additional training|retrain|review(ed)? with (the )?crew|remind|be more careful|pay (more )?attention|toolbox|tailgate|safety meeting|coach|discuss(ed)? with|reinforce|re-?educat|verbal warning|written warning|disciplin|use common sense)';
  return new;
end $$;
do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'inv_ca_weak_control' and tgrelid = 'public.investigation_corrective_actions'::regclass) then
    create trigger inv_ca_weak_control
      before insert or update of description, action_description, hierarchy_level on public.investigation_corrective_actions
      for each row execute function public.inv_set_weak_control_flag();
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 5. investigation_activity_log (pages already write to it; it never existed)
-- ---------------------------------------------------------------------------
create table if not exists public.investigation_activity_log (
  id bigint generated always as identity primary key,
  incident_id text,
  incident_id_text text,
  action text not null,
  action_category text,
  entity_type text,
  entity_id text,
  user_email text,
  details jsonb,
  created_at timestamptz not null default now()
);
create index if not exists inv_activity_incident_idx on public.investigation_activity_log(incident_id);
alter table public.investigation_activity_log enable row level security;

-- ---------------------------------------------------------------------------
-- 6. RLS policies (created only if missing — no drops)
-- ---------------------------------------------------------------------------
do $$
begin
  -- banks + questions: read for investigators / portal staff; writes service role only
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='inv_question_banks' and policyname='inv_banks_read') then
    create policy inv_banks_read on public.inv_question_banks for select to authenticated
      using (public.inv_is_investigator() or public.is_portal_staff());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='inv_question_bank' and policyname='inv_qb_read') then
    create policy inv_qb_read on public.inv_question_bank for select to authenticated
      using (public.inv_is_investigator() or public.is_portal_staff());
  end if;

  -- responses: investigators read/write non-confidential rows
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='inv_question_responses' and policyname='inv_qr_read') then
    create policy inv_qr_read on public.inv_question_responses for select to authenticated
      using (public.inv_is_investigator() and (
        not is_confidential
        or public.inv_is_super_admin()
        or public.inv_is_incident_lead(incident_uuid)));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='inv_question_responses' and policyname='inv_qr_insert') then
    create policy inv_qr_insert on public.inv_question_responses for insert to authenticated
      with check (public.inv_is_investigator());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='inv_question_responses' and policyname='inv_qr_update') then
    create policy inv_qr_update on public.inv_question_responses for update to authenticated
      using (public.inv_is_investigator() and (
        not is_confidential
        or public.inv_is_super_admin()
        or public.inv_is_incident_lead(incident_uuid)))
      with check (public.inv_is_investigator());
  end if;
  -- (no delete policy: answers are an investigation record)

  -- flags: readable by investigators/staff; writes service role only
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='inv_feature_flags' and policyname='inv_flags_read') then
    create policy inv_flags_read on public.inv_feature_flags for select to authenticated
      using (public.inv_is_investigator() or public.is_portal_staff());
  end if;

  -- activity log: append-only.
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='investigation_activity_log' and policyname='inv_log_staff_insert') then
    create policy inv_log_staff_insert on public.investigation_activity_log for insert to authenticated
      with check (public.inv_is_investigator() or public.is_portal_staff());
  end if;
  -- The anonymous field report may write exactly one kind of row.
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='investigation_activity_log' and policyname='inv_log_field_report_insert') then
    create policy inv_log_field_report_insert on public.investigation_activity_log for insert to anon, authenticated
      with check (action = 'Incident reported' and action_category = 'create'
                  and entity_type is null and coalesce(length(details::text), 0) < 2000);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='investigation_activity_log' and policyname='inv_log_read') then
    create policy inv_log_read on public.investigation_activity_log for select to authenticated
      using (public.inv_is_investigator() or public.is_portal_staff());
  end if;
end $$;

grant select on public.inv_question_banks, public.inv_question_bank, public.inv_feature_flags to authenticated;
grant select, insert, update on public.inv_question_responses to authenticated;
grant select, insert on public.investigation_activity_log to authenticated;
grant insert on public.investigation_activity_log to anon;
revoke all on public.inv_question_banks, public.inv_question_bank, public.inv_question_responses, public.inv_feature_flags from anon;

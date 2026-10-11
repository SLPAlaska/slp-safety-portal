-- SQL 2026-10-11-50 — Loud corrective-action nags until the action is CLOSED.
-- SLP Safety Portal (iypezirwdlqpptjpeeyf). ADDITIVE ONLY: new tables, new
-- functions, one new cron job. The old 'send-ca-reminders-daily' job is
-- DEACTIVATED (not deleted): its call carried no auth header to a verify_jwt
-- function and it read the stale action_status column, so it was not sending.
-- Idempotent: safe to re-run.
--
-- CADENCE (per corrective action, per responsible person, Alaska date):
--   * day 0   first notice ("you own this", full explanation)        stage 'assigned'
--   * day 7   still open                                              stage 'day7'
--   * day 14  still open                                              stage 'day14'
--   * DAILY   for the last 7 days before the due date                 stage 'final_week'
--   * DAILY   after the due date until closed, investigation lead cc'd stage 'overdue'
--   Day 7 / day 14 count from that person's first notice (for a new CA that is
--   the day it was created). Only CLOSING counts as progress: status or
--   action_status in Completed / Verified / Verified Effective / Closed /
--   Cancelled. Comments, edits, percent complete and 'In Progress' do not stop it.
--   At most ONE email per CA per person per Alaska day (unique index below).
--   A new owner email = a new day-0 notice for that person.
--   Never nagged: CAs on mock/demo/test incidents, and orphan CAs whose incident
--   row no longer exists (listed by ca_nag_unreachable()).

create extension if not exists pgcrypto with schema extensions;

-- 1. Settings (single row). This is the module switch for nags.
create table if not exists public.ca_nag_settings (
  id                   integer primary key default 1 check (id = 1),
  enabled              boolean not null default true,
  mode                 text not null default 'live' check (mode in ('live','dry_run')),
  test_recipient       text not null default 'brian@slpalaska.com',
  escalate_overdue_to_lead boolean not null default true,
  escalation_cc        text[] not null default '{}',
  portal_url           text not null default 'https://portal.slpalaska.com',
  updated_at           timestamptz not null default now(),
  updated_by           text
);
alter table public.ca_nag_settings enable row level security;
revoke all on public.ca_nag_settings from anon, authenticated;
grant select, insert, update on public.ca_nag_settings to service_role;
insert into public.ca_nag_settings (id) values (1) on conflict (id) do nothing;

-- 2. Send log: every notice, test and dry run.
create table if not exists public.ca_nag_log (
  id           bigserial primary key,
  created_at   timestamptz not null default now(),
  nag_date     date not null,
  ca_id        bigint not null,
  incident_id  text,
  action_number integer,
  company      text,
  recipient    text not null,
  cc           text[] not null default '{}',
  stage        text not null check (stage in ('assigned','day7','day14','final_week','overdue')),
  notice_no    integer not null default 1,
  days_to_due  integer,
  mode         text not null check (mode in ('live','test','dry_run')),
  status       text not null check (status in ('sending','sent','failed','dry_run')),
  subject      text,
  resend_id    text,
  error        text,
  sent_at      timestamptz
);
alter table public.ca_nag_log enable row level security;
revoke all on public.ca_nag_log from anon, authenticated;
grant select, insert, update on public.ca_nag_log to service_role;
grant usage, select on sequence public.ca_nag_log_id_seq to service_role;
create unique index if not exists ca_nag_log_one_per_day
  on public.ca_nag_log (ca_id, lower(recipient), nag_date)
  where mode = 'live' and status in ('sending','sent');
create index if not exists ca_nag_log_ca on public.ca_nag_log (ca_id, lower(recipient));

-- 3. Helpers.
create or replace function public.ca_nag_today()
returns date language sql stable set search_path = '' as $$
  select (now() at time zone 'America/Anchorage')::date
$$;

create or replace function public.ca_is_closed(p_status text, p_action_status text)
returns boolean language sql immutable set search_path = '' as $$
  select upper(btrim(coalesce(p_status,''))) in ('COMPLETED','COMPLETE','VERIFIED','VERIFIED EFFECTIVE','CLOSED','CANCELLED','CANCELED','VOID')
      or upper(btrim(coalesce(p_action_status,''))) in ('COMPLETED','COMPLETE','VERIFIED','VERIFIED EFFECTIVE','CLOSED','CANCELLED','CANCELED','VOID')
$$;

create or replace function public.ca_nag_valid_email(p text)
returns boolean language sql immutable set search_path = '' as $$
  select coalesce(btrim(p),'') ~* '^[^@\s,;]+@[^@\s,;]+\.[a-z]{2,}$'
$$;

-- Mock / demo / training incidents are never nagged (fake data must not email real people).
create or replace function public.ca_nag_is_demo(p_brief text, p_tags text[])
returns boolean language sql immutable set search_path = '' as $$
  select coalesce(p_brief,'') ~* '^\s*(mock|demo|test|training)\b'
      or coalesce(p_brief,'') ~* '\mmock\s*/\s*demo\M'
      or exists (select 1 from unnest(coalesce(p_tags,'{}'::text[])) t where lower(t) in ('mock','demo','test','training'))
$$;

-- 4. Who gets what today. Pure read; the edge function sends and logs.
create or replace function public.ca_nag_queue(p_today date default null)
returns table (
  ca_id bigint, incident_id text, action_number integer, company text,
  owner_name text, recipient text, lead_email text, stage text, notice_no integer,
  days_open integer, days_to_due integer, due_date date, assigned_on date,
  description text, hierarchy text, root_cause_link text, verification_method text,
  incident_summary text, ca_status text
)
language sql stable security definer set search_path = '' as $$
  with t as (select coalesce(p_today, public.ca_nag_today()) as d),
  ca as (
    select c.*,
           lower(btrim(c.action_owner_email)) as rcpt,
           coalesce(c.due_date, c.target_date) as due,
           (c.created_at at time zone 'America/Anchorage')::date as created_d
      from public.investigation_corrective_actions c
     where not public.ca_is_closed(c.status, c.action_status)
       and public.ca_nag_valid_email(c.action_owner_email)
  ),
  hist as (
    select l.ca_id, lower(l.recipient) as rcpt,
           min(l.nag_date) as first_d,
           count(*)::int as n_sent,
           bool_or(l.stage = 'day7')  as had7,
           bool_or(l.stage = 'day14') as had14,
           bool_or(l.nag_date = (select d from t)) as today_done
      from public.ca_nag_log l
     where l.mode = 'live' and l.status in ('sent','sending')
     group by 1, 2
  ),
  staged as (
    select ca.*, h.first_d, coalesce(h.n_sent,0) as n_sent,
           coalesce(h.had7,false) as had7, coalesce(h.had14,false) as had14,
           coalesce(h.today_done,false) as today_done,
           (select d from t) as today,
           case
             when ca.due is not null and ca.due < (select d from t) then 'overdue'
             when ca.due is not null and ca.due - (select d from t) <= 7 then 'final_week'
             when h.first_d is null then 'assigned'
             when (select d from t) - h.first_d >= 14 and not coalesce(h.had14,false) then 'day14'
             when (select d from t) - h.first_d >= 7 and not coalesce(h.had7,false) and not coalesce(h.had14,false) then 'day7'
             else null
           end as stage
      from ca
      left join hist h on h.ca_id = ca.id and h.rcpt = ca.rcpt
  )
  select s.id, coalesce(nullif(i.incident_id,''), s.incident_id), s.action_number,
         coalesce(nullif(i.company_name,''), nullif(i.injured_person_company,''), nullif(i.reported_by_company,'')),
         coalesce(nullif(s.action_owner_name,''), nullif(s.owner,''), s.rcpt),
         s.rcpt,
         case when public.ca_nag_valid_email(i.team_leader_email) then lower(btrim(i.team_leader_email))
              when public.ca_nag_valid_email(s.created_by_email) then lower(btrim(s.created_by_email))
              else null end,
         s.stage, s.n_sent + 1,
         (s.today - coalesce(s.first_d, s.created_d))::int,
         case when s.due is null then null else (s.due - s.today)::int end,
         s.due, coalesce(s.first_d, s.today),
         coalesce(nullif(s.description,''), s.action_description),
         coalesce(nullif(s.hierarchy_of_controls,''), s.hierarchy_control),
         s.root_cause_link, s.verification_method,
         coalesce(nullif(i.brief_description,''), left(i.detailed_description, 300)),
         coalesce(nullif(s.status,''), s.action_status)
    from staged s
    join lateral (
      select x.* from public.incidents x
       where x.incident_id = s.incident_id or x.id::text = s.incident_id
       order by (x.incident_id = s.incident_id) desc
       limit 1
    ) i on true
   where s.stage is not null and not s.today_done
     and not public.ca_nag_is_demo(i.brief_description, i.tags)
   order by s.due nulls last, s.id
$$;
revoke all on function public.ca_nag_queue(date) from public, anon, authenticated;
grant execute on function public.ca_nag_queue(date) to service_role;

-- Open CAs that can never be nagged: no valid owner email, or the incident they
-- belong to no longer exists (orphans). Surfaced in the run result; close them on
-- /corrective-actions.
create or replace function public.ca_nag_unreachable()
returns table (ca_id bigint, incident_id text, action_number integer, owner text, due_date date)
language sql stable security definer set search_path = '' as $$
  select c.id, c.incident_id, c.action_number,
         coalesce(nullif(c.action_owner_name,''), c.owner), coalesce(c.due_date, c.target_date)
    from public.investigation_corrective_actions c
   where not public.ca_is_closed(c.status, c.action_status)
     and (not public.ca_nag_valid_email(c.action_owner_email)
          or not exists (select 1 from public.incidents x
                          where x.incident_id = c.incident_id or x.id::text = c.incident_id))
$$;
revoke all on function public.ca_nag_unreachable() from public, anon, authenticated;
grant execute on function public.ca_nag_unreachable() to service_role;

-- 5. Shared secret (same pattern as incident_alert_shared_secret).
create or replace function public.rotate_ca_nag_secret()
returns jsonb language plpgsql security definer set search_path = '' as $fn$
declare v_id uuid; v_new text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  select id into v_id from vault.secrets where name = 'ca_nag_shared_secret';
  if v_id is null then
    perform vault.create_secret(v_new, 'ca_nag_shared_secret',
      'x-ca-nag-secret header for the send-ca-nags Edge Function (rotate with rotate_ca_nag_secret())');
  else
    perform vault.update_secret(v_id, v_new);
  end if;
  return jsonb_build_object('rotated', true, 'length', length(v_new));
end; $fn$;
revoke all on function public.rotate_ca_nag_secret() from public, anon, authenticated;
grant execute on function public.rotate_ca_nag_secret() to service_role;

do $$ begin
  if not exists (select 1 from vault.secrets where name = 'ca_nag_shared_secret') then
    perform public.rotate_ca_nag_secret();
  end if;
end $$;

create or replace function public.ca_nag_secret_matches(p_provided text)
returns boolean language plpgsql stable security definer set search_path = '' as $fn$
declare v_secret text;
begin
  if p_provided is null or length(p_provided) < 20 then return false; end if;
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'ca_nag_shared_secret';
  if v_secret is null then return false; end if;
  return extensions.digest(p_provided, 'sha256') = extensions.digest(v_secret, 'sha256');
end; $fn$;
revoke all on function public.ca_nag_secret_matches(text) from public, anon, authenticated;
grant execute on function public.ca_nag_secret_matches(text) to service_role;

-- 6. One place that builds the request (cron + safe tests).
create or replace function public.ca_nag_post(p_body jsonb default '{}'::jsonb)
returns bigint language plpgsql security definer set search_path = '' as $fn$
declare v_secret text;
begin
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'ca_nag_shared_secret';
  if v_secret is null then
    raise warning 'ca_nag_post: vault secret ca_nag_shared_secret missing; nags not sent';
    return null;
  end if;
  return net.http_post(
    url     := 'https://iypezirwdlqpptjpeeyf.supabase.co/functions/v1/send-ca-nags',
    body    := coalesce(p_body, '{}'::jsonb),
    headers := jsonb_build_object('Content-Type','application/json','x-ca-nag-secret', v_secret),
    timeout_milliseconds := 60000
  );
end; $fn$;
revoke all on function public.ca_nag_post(jsonb) from public, anon, authenticated;
grant execute on function public.ca_nag_post(jsonb) to service_role;

-- 7. Schedule: hourly 08:05–18:05 AKDT (07:05–17:05 AKST). Daily stages all go
--    out on the first run of the Alaska day; later runs only pick up CAs created
--    since (their day-0 notice), because of the one-per-day index.
do $$ begin
  if exists (select 1 from cron.job where jobname = 'send-ca-reminders-daily') then
    perform cron.alter_job(job_id := (select jobid from cron.job where jobname = 'send-ca-reminders-daily'), active := false);
  end if;
  if not exists (select 1 from cron.job where jobname = 'ca-loud-nags') then
    perform cron.schedule('ca-loud-nags', '5 16-23,0-2 * * *', $c$select public.ca_nag_post('{"mode":"live"}'::jsonb)$c$);
  end if;
end $$;

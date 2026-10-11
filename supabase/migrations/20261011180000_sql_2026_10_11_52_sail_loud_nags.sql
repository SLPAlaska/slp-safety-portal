-- SQL 2026-10-11-52 — Loud SAIL action-item nags until the item is CLOSED.
-- SLP Safety Portal (iypezirwdlqpptjpeeyf). Mirrors SQL 2026-10-11-50 (loud CA
-- nags). ADDITIVE ONLY: new tables, new functions, one new cron job. Nothing is
-- deleted. Idempotent: safe to re-run.
--
-- REPLACES the old SAIL assignment email cleanly (no two senders fighting):
--   The old path was trigger_sail_assignment (AFTER UPDATE only, so items created
--   with an email never got a notice) -> sail_assignment_notifications ->
--   webhook trigger "sail-assignment-email" -> send-sail-assignment-email (one
--   plain email, no reminders, last fired 2026-03-24). The webhook trigger is
--   DISABLED here (not dropped) so the new day-0 notice is the only assignment
--   email. trigger_sail_assignment still writes its audit row. Re-enable with:
--     alter table public.sail_assignment_notifications enable trigger "sail-assignment-email";
--
-- CADENCE (per SAIL item, per assignee email, Alaska date):
--   * day 0   first notice ("you own this", full explanation)        stage 'assigned'
--   * day 7   still open                                              stage 'day7'
--   * day 14  still open                                              stage 'day14'
--   * DAILY   for the last 7 days before target_completion_date       stage 'final_week'
--   * DAILY   after the target date until closed (+ escalation_cc)    stage 'overdue'
--   Day 7 / day 14 count from that person's first notice. Only CLOSING stops it:
--   status Closed (or Cancelled/Void). Open, In Progress, Delayed and Pending
--   Verification all keep nagging. At most ONE email per item per person per
--   Alaska day (unique index). A new assignee email = a new day-0 notice.
--   Never nagged: demo/mock/test items (Demo Energy Co etc.). Open items with no
--   valid assignee email are listed by sail_nag_unreachable().

create extension if not exists pgcrypto with schema extensions;

-- 1. Settings (single row) = the switch.
create table if not exists public.sail_nag_settings (
  id                   integer primary key default 1 check (id = 1),
  enabled              boolean not null default true,
  mode                 text not null default 'live' check (mode in ('live','dry_run')),
  test_recipient       text not null default 'brian@slpalaska.com',
  escalation_cc        text[] not null default '{}',
  portal_url           text not null default 'https://portal.slpalaska.com',
  updated_at           timestamptz not null default now(),
  updated_by           text
);
alter table public.sail_nag_settings enable row level security;
revoke all on public.sail_nag_settings from anon, authenticated;
grant select, insert, update on public.sail_nag_settings to service_role;
insert into public.sail_nag_settings (id) values (1) on conflict (id) do nothing;

-- 2. Send log: every notice, test and dry run.
create table if not exists public.sail_nag_log (
  id           bigserial primary key,
  created_at   timestamptz not null default now(),
  nag_date     date not null,
  sail_id      uuid not null,
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
alter table public.sail_nag_log enable row level security;
revoke all on public.sail_nag_log from anon, authenticated;
grant select, insert, update on public.sail_nag_log to service_role;
grant usage, select on sequence public.sail_nag_log_id_seq to service_role;
create unique index if not exists sail_nag_log_one_per_day
  on public.sail_nag_log (sail_id, lower(recipient), nag_date)
  where mode = 'live' and status in ('sending','sent');
create index if not exists sail_nag_log_item on public.sail_nag_log (sail_id, lower(recipient));

-- 3. Helpers (ca_nag_today / ca_nag_valid_email come from SQL 50).
create or replace function public.sail_is_closed(p_status text)
returns boolean language sql immutable set search_path = '' as $$
  select upper(btrim(coalesce(p_status,''))) in ('CLOSED','COMPLETED','COMPLETE','CANCELLED','CANCELED','VOID')
$$;

-- Mock / demo / training rows are never nagged (fake data must not email real people).
create or replace function public.sail_nag_is_demo(p_company text, p_location text, p_desc text)
returns boolean language sql immutable set search_path = '' as $$
  select coalesce(p_company,'')  ~* '\m(demo|mock|test|training|sample)\M'
      or coalesce(p_location,'') ~* '\m(demo|mock)\M'
      or coalesce(p_desc,'')     ~* '^\s*\[?(mock|demo|test|training)\M'
$$;

-- 4. Who gets what today. Pure read; the edge function sends and logs.
create or replace function public.sail_nag_queue(p_today date default null)
returns table (
  sail_id uuid, company text, location text, owner_name text, recipient text,
  stage text, notice_no integer, days_open integer, days_to_due integer,
  due_date date, opened_on date, assigned_on date, description text,
  immediate_action text, priority text, category text, hierarchy text,
  submitter text, sail_status text, source text
)
language sql stable security definer set search_path = '' as $$
  with t as (select coalesce(p_today, public.ca_nag_today()) as d),
  s0 as (
    select x.*, lower(btrim(x.assigned_to_email)) as rcpt,
           coalesce(x.date_opened, x.date, (x.created_at at time zone 'America/Anchorage')::date) as opened_d
      from public.sail_log x
     where not public.sail_is_closed(x.status)
       and public.ca_nag_valid_email(x.assigned_to_email)
       and not public.sail_nag_is_demo(x.client_company, x.location, x.action_item_description)
  ),
  hist as (
    select l.sail_id, lower(l.recipient) as rcpt,
           min(l.nag_date) as first_d, count(*)::int as n_sent,
           bool_or(l.stage = 'day7') as had7, bool_or(l.stage = 'day14') as had14,
           bool_or(l.nag_date = (select d from t)) as today_done
      from public.sail_nag_log l
     where l.mode = 'live' and l.status in ('sent','sending')
     group by 1, 2
  ),
  staged as (
    select s0.*, h.first_d, coalesce(h.n_sent,0) as n_sent,
           coalesce(h.today_done,false) as today_done, (select d from t) as today,
           case
             when s0.target_completion_date is not null and s0.target_completion_date < (select d from t) then 'overdue'
             when s0.target_completion_date is not null and s0.target_completion_date - (select d from t) <= 7 then 'final_week'
             when h.first_d is null then 'assigned'
             when (select d from t) - h.first_d >= 14 and not coalesce(h.had14,false) then 'day14'
             when (select d from t) - h.first_d >= 7 and not coalesce(h.had7,false) and not coalesce(h.had14,false) then 'day7'
             else null
           end as stage
      from s0 left join hist h on h.sail_id = s0.id and h.rcpt = s0.rcpt
  )
  select s.id, s.client_company, s.location,
         coalesce(nullif(btrim(s.assigned_to),''), s.rcpt), s.rcpt,
         s.stage, s.n_sent + 1,
         (s.today - s.opened_d)::int,
         case when s.target_completion_date is null then null else (s.target_completion_date - s.today)::int end,
         s.target_completion_date, s.opened_d, coalesce(s.first_d, s.today),
         s.action_item_description, s.immediate_action, s.priority, s.category,
         s.hierarchy_control, s.submitter_name, coalesce(nullif(s.status,''),'Open'),
         coalesce(nullif(s.source_form,''), nullif(s.source,''), nullif(s.source_reference,''))
    from staged s
   where s.stage is not null and not s.today_done
   order by s.target_completion_date nulls last, s.id
$$;
revoke all on function public.sail_nag_queue(date) from public, anon, authenticated;
grant execute on function public.sail_nag_queue(date) to service_role;

-- Open (non-demo) SAIL items that can never be nagged: no valid assignee email.
create or replace function public.sail_nag_unreachable()
returns table (sail_id uuid, company text, assigned_to text, due_date date, description text)
language sql stable security definer set search_path = '' as $$
  select x.id, x.client_company, x.assigned_to, x.target_completion_date, left(x.action_item_description, 120)
    from public.sail_log x
   where not public.sail_is_closed(x.status)
     and not public.ca_nag_valid_email(x.assigned_to_email)
     and not public.sail_nag_is_demo(x.client_company, x.location, x.action_item_description)
$$;
revoke all on function public.sail_nag_unreachable() from public, anon, authenticated;
grant execute on function public.sail_nag_unreachable() to service_role;

-- 5. Shared secret in Vault (same pattern as ca_nag_shared_secret).
create or replace function public.rotate_sail_nag_secret()
returns jsonb language plpgsql security definer set search_path = '' as $fn$
declare v_id uuid; v_new text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  select id into v_id from vault.secrets where name = 'sail_nag_shared_secret';
  if v_id is null then
    perform vault.create_secret(v_new, 'sail_nag_shared_secret',
      'x-sail-nag-secret header for the send-sail-nags Edge Function (rotate with rotate_sail_nag_secret())');
  else
    perform vault.update_secret(v_id, v_new);
  end if;
  return jsonb_build_object('rotated', true, 'length', length(v_new));
end; $fn$;
revoke all on function public.rotate_sail_nag_secret() from public, anon, authenticated;
grant execute on function public.rotate_sail_nag_secret() to service_role;

do $$ begin
  if not exists (select 1 from vault.secrets where name = 'sail_nag_shared_secret') then
    perform public.rotate_sail_nag_secret();
  end if;
end $$;

create or replace function public.sail_nag_secret_matches(p_provided text)
returns boolean language plpgsql stable security definer set search_path = '' as $fn$
declare v_secret text;
begin
  if p_provided is null or length(p_provided) < 20 then return false; end if;
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'sail_nag_shared_secret';
  if v_secret is null then return false; end if;
  return extensions.digest(p_provided, 'sha256') = extensions.digest(v_secret, 'sha256');
end; $fn$;
revoke all on function public.sail_nag_secret_matches(text) from public, anon, authenticated;
grant execute on function public.sail_nag_secret_matches(text) to service_role;

-- 6. One place that builds the request (cron + safe tests).
create or replace function public.sail_nag_post(p_body jsonb default '{}'::jsonb)
returns bigint language plpgsql security definer set search_path = '' as $fn$
declare v_secret text;
begin
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'sail_nag_shared_secret';
  if v_secret is null then
    raise warning 'sail_nag_post: vault secret sail_nag_shared_secret missing; nags not sent';
    return null;
  end if;
  return net.http_post(
    url     := 'https://iypezirwdlqpptjpeeyf.supabase.co/functions/v1/send-sail-nags',
    body    := coalesce(p_body, '{}'::jsonb),
    headers := jsonb_build_object('Content-Type','application/json','x-sail-nag-secret', v_secret),
    timeout_milliseconds := 60000
  );
end; $fn$;
revoke all on function public.sail_nag_post(jsonb) from public, anon, authenticated;
grant execute on function public.sail_nag_post(jsonb) to service_role;

-- 7. Retire the old one-shot assignment email (disable, do not drop) and schedule
--    the new job: hourly at :10, 08:10–18:10 AKDT, 5 min after ca-loud-nags.
do $$ begin
  if exists (select 1 from pg_trigger where tgname = 'sail-assignment-email'
              and tgrelid = 'public.sail_assignment_notifications'::regclass) then
    execute 'alter table public.sail_assignment_notifications disable trigger "sail-assignment-email"';
  end if;
  if not exists (select 1 from cron.job where jobname = 'sail-loud-nags') then
    perform cron.schedule('sail-loud-nags', '10 16-23,0-2 * * *', $c$select public.sail_nag_post('{"mode":"live"}'::jsonb)$c$);
  end if;
end $$;

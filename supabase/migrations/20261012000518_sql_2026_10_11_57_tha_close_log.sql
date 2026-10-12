-- SQL #57 (2026-10-11): audit log of who closed each THA (Phase 1 THA close lock).
--
-- Since 11 Oct 2026 closing a THA needs a signed-in closer whose LMS company is
-- the THA's company (/api/closeout closeTha, rule decideThaClose in
-- app/lib/thaCloser.js). tha_assessments.closed_by keeps the name AS IT IS ON
-- THE THA (unchanged); this table records the verified person who pressed the
-- button (a company admin may close for a named crew member).
--
-- Additive only: new table, nothing on tha_assessments changes (so the client
-- export and the 48-hour auto-close are untouched). Written only by the
-- service-role API route. RLS on, SLP staff read only; no anon/authenticated
-- writes.

create table if not exists public.tha_close_log (
  id bigint generated always as identity primary key,
  tha_number text not null,
  tha_company text,
  closed_by_name_on_tha text,
  closer_email text not null,
  closer_lms_name text,
  closer_role text,
  closer_company text,
  on_behalf boolean not null default false,
  rule text,
  closed_at timestamptz not null default now()
);

create index if not exists tha_close_log_tha_number_idx on public.tha_close_log (tha_number);

alter table public.tha_close_log enable row level security;

revoke all on public.tha_close_log from anon, authenticated;
grant select on public.tha_close_log to authenticated;

drop policy if exists tha_close_log_staff_read on public.tha_close_log;
create policy tha_close_log_staff_read on public.tha_close_log
  for select to authenticated using (public.is_portal_staff());

comment on table public.tha_close_log is
  'Who closed each THA via /api/closeout: verified sign-in email, LMS name/role/company, the name on the THA it was closed as, and whether a company admin closed on behalf of a named crew member. Written by the service role only.';

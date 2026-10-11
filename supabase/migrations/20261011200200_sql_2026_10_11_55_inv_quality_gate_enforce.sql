-- SQL 2026-10-11-55 — Investigation Quality Gates (P0): enforcement.
-- SLP Safety Portal (iypezirwdlqpptjpeeyf). New functions + triggers only.
-- Idempotent. Rollback: drop the three triggers below (old behavior returns).
--
-- 1. incidents: moving INTO Pending Approval / Approved / Closed, or ticking
--    stage_4_complete, is refused while inv_quality_gate_eval() has a red item
--    or an amber item without a reason. Only rows in scope
--    (inv_quality_gate_applies) are gated. Saves/drafts are never blocked, and
--    rows already Approved/Closed are untouched (transition only).
-- 2. lessons_learned: a lesson saved on an in-scope investigation that is not yet
--    Approved is held (is_published=false, held_for_approval=true) instead of
--    published; held lessons publish automatically on approval (G16).

create or replace function public.inv_enforce_quality_gate()
returns trigger language plpgsql security definer set search_path = public as $$
declare g jsonb; lines text;
begin
  if not (
       (new.status::text in ('Pending Approval', 'Approved', 'Closed') and new.status is distinct from old.status)
    or (coalesce(new.stage_4_complete, false) and not coalesce(old.stage_4_complete, false))
  ) then
    return new;
  end if;
  if not public.inv_quality_gate_applies(new) then
    return new;
  end if;
  g := public.inv_quality_gate_eval(new);
  if g ->> 'status' in ('block', 'warn') then
    select string_agg(x ->> 'key' || ' ' || (x ->> 'label')
                      || case when x ->> 'level' = 'warn' then ' (needs a one-line reason)' else '' end, '; ')
      into lines
      from jsonb_array_elements(g -> 'items') x where x ->> 'level' in ('block', 'warn');
    raise exception using
      errcode = 'P0001',
      message = 'QUALITY_GATE: Not yet. ' || ((g ->> 'block_count')::int + (g ->> 'warn_count')::int)
                || ' item(s) need attention: ' || coalesce(lines, '') || '.',
      hint = 'Open the Quality Checklist at the top of the Investigation Workbench; each item says what is missing and jumps to it.';
  end if;
  return new;
end $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'inv_incidents_quality_gate'
                 and tgrelid = 'public.incidents'::regclass) then
    create trigger inv_incidents_quality_gate
      before update on public.incidents
      for each row execute function public.inv_enforce_quality_gate();
  end if;
end $$;

-- Lessons: hold until approval.
create or replace function public.inv_hold_lesson_until_approved()
returns trigger language plpgsql security definer set search_path = public as $$
declare inc public.incidents;
begin
  if not coalesce(new.is_published, false) then return new; end if;
  if tg_op = 'UPDATE' and coalesce(old.is_published, false) then return new; end if;
  if new.incident_id is null then return new; end if;
  select * into inc from public.incidents where id = new.incident_id;
  if not found or inc.status::text in ('Approved', 'Closed') then return new; end if;
  if not public.inv_quality_gate_applies(inc) then return new; end if;
  new.is_published := false;
  new.held_for_approval := true;
  return new;
end $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'inv_lessons_hold_until_approved'
                 and tgrelid = 'public.lessons_learned'::regclass) then
    create trigger inv_lessons_hold_until_approved
      before insert or update of is_published on public.lessons_learned
      for each row execute function public.inv_hold_lesson_until_approved();
  end if;
end $$;

create or replace function public.inv_publish_held_lessons()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status::text in ('Approved', 'Closed') and old.status is distinct from new.status then
    update public.lessons_learned set is_published = true, held_for_approval = false
     where incident_id = new.id and held_for_approval;
  end if;
  return null;
end $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'inv_incidents_publish_held_lessons'
                 and tgrelid = 'public.incidents'::regclass) then
    create trigger inv_incidents_publish_held_lessons
      after update of status on public.incidents
      for each row execute function public.inv_publish_held_lessons();
  end if;
end $$;

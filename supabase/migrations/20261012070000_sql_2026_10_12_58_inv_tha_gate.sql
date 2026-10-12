-- SQL 2026-10-12-58 — Hard THA gate on incident investigations.
-- SLP Safety Portal (iypezirwdlqpptjpeeyf). ADDITIVE. Idempotent: safe to re-run.
--
-- Before a stage is marked complete, or status moves to Pending Approval /
-- Approved / Closed, ONE of these must be true:
--   (a) an investigation_evidence row of type THA whose file is a PDF
--   (b) incidents.no_tha with a reason from the list below
--       (tha_lost_or_not_found and other also need 30+ characters of detail)
--   (c) an active inv_gate_overrides row for gate key 'THA' written by
--       brian@slpalaska.com (the same override Brian uses for the other
--       quality gates; inv_gate_override logs it to investigation_activity_log)
--
-- This gate applies to EVERY investigation. It does not replace or loosen
-- inv_quality_gate_eval (G1–G17 and the contradiction checks stay as they are).
-- The checklist RPC appends this one item so the workbench can show it.
-- Saves and drafts are not blocked. Report export is refused in the app and
-- in generate-investigation-pdf by calling inv_tha_gate(); an Approved status
-- does not skip this check.
--
-- Rollback: drop trigger inv_incidents_tha_gate and function
-- inv_enforce_tha_gate. The new columns can stay (they are nullable / defaulted).

-- ---------------------------------------------------------------------------
-- 1. Columns
-- ---------------------------------------------------------------------------
alter table public.incidents
  add column if not exists no_tha boolean not null default false;
alter table public.incidents
  add column if not exists no_tha_reason text;
alter table public.incidents
  add column if not exists no_tha_reason_detail text;
alter table public.incidents
  add column if not exists no_tha_set_by text;
alter table public.incidents
  add column if not exists no_tha_set_at timestamptz;

alter table public.investigation_evidence
  add column if not exists source_tha_number text;

comment on column public.incidents.no_tha is
  'True when the investigator recorded that this incident has no THA. The THA gate then requires no_tha_reason.';
comment on column public.incidents.no_tha_reason is
  'office_shop_only | no_field_task_in_progress | emergency_response_before_tha | tha_lost_or_not_found | other';
comment on column public.incidents.no_tha_reason_detail is
  'Free text. Required (30+ characters) when no_tha_reason is tha_lost_or_not_found or other.';
comment on column public.incidents.no_tha_set_by is
  'Email of the person who last set or changed the No-THA flag.';
comment on column public.incidents.no_tha_set_at is
  'When the No-THA flag or its reason last changed.';
comment on column public.investigation_evidence.source_tha_number is
  'tha_assessments.tha_number when this evidence PDF was built or copied from a portal THA. Null for an uploaded PDF.';

alter table public.incidents drop constraint if exists incidents_no_tha_reason_chk;
alter table public.incidents
  add constraint incidents_no_tha_reason_chk check (
    no_tha_reason is null
    or no_tha_reason in (
      'office_shop_only',
      'no_field_task_in_progress',
      'emergency_response_before_tha',
      'tha_lost_or_not_found',
      'other'
    )
  );

alter table public.incidents drop constraint if exists incidents_no_tha_consistency_chk;
alter table public.incidents
  add constraint incidents_no_tha_consistency_chk check (
    no_tha = false
    or (
      no_tha_reason in (
        'office_shop_only',
        'no_field_task_in_progress',
        'emergency_response_before_tha',
        'tha_lost_or_not_found',
        'other'
      )
      and (
        no_tha_reason not in ('tha_lost_or_not_found', 'other')
        or char_length(btrim(coalesce(no_tha_reason_detail, ''))) >= 30
      )
    )
  );

-- Stamp who set the flag when the caller has a session email. Service-role
-- writes (the API) pass the email in no_tha_set_by and are left alone.
create or replace function public.inv_stamp_no_tha()
returns trigger language plpgsql security definer set search_path = public as $$
declare me text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  -- INSERT fires this trigger too (the OF column list applies to UPDATE only).
  -- A normal new incident is not a No-THA decision and must not be stamped.
  if tg_op = 'INSERT' and not coalesce(new.no_tha, false) and new.no_tha_reason is null then
    return new;
  end if;
  if tg_op = 'UPDATE'
     and new.no_tha is not distinct from old.no_tha
     and new.no_tha_reason is not distinct from old.no_tha_reason
     and new.no_tha_reason_detail is not distinct from old.no_tha_reason_detail then
    return new;
  end if;
  if me <> '' then
    new.no_tha_set_by := me;
  end if;
  new.no_tha_set_at := now();
  return new;
end $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'inv_incidents_stamp_no_tha'
                 and tgrelid = 'public.incidents'::regclass) then
    create trigger inv_incidents_stamp_no_tha
      before insert or update of no_tha, no_tha_reason, no_tha_reason_detail on public.incidents
      for each row execute function public.inv_stamp_no_tha();
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. The rule. Read-only. Same answers as app/lib/thaGate.js.
-- ---------------------------------------------------------------------------
create or replace function public.inv_tha_evidence_ok(p_inc public.incidents)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.investigation_evidence e
    where e.incident_id = any (array_remove(array[p_inc.incident_id::text, p_inc.id::text], null))
      and lower(btrim(coalesce(e.evidence_type, ''))) = 'tha'
      and length(btrim(coalesce(e.file_url, ''))) > 0
      and (
        coalesce(e.file_name, '') ~* '\.pdf$'
        or regexp_replace(split_part(split_part(coalesce(e.file_url, ''), '?', 1), '#', 1), '^.*/', '') ~* '\.pdf$'
      )
  )
$$;
revoke all on function public.inv_tha_evidence_ok(public.incidents) from public, anon, authenticated;

create or replace function public.inv_no_tha_ok(p_inc public.incidents)
returns boolean language sql immutable set search_path = public as $$
  select coalesce(p_inc.no_tha, false)
     and p_inc.no_tha_reason in (
       'office_shop_only',
       'no_field_task_in_progress',
       'emergency_response_before_tha',
       'tha_lost_or_not_found',
       'other'
     )
     and (
       p_inc.no_tha_reason not in ('tha_lost_or_not_found', 'other')
       or char_length(btrim(coalesce(p_inc.no_tha_reason_detail, ''))) >= 30
     )
$$;
revoke all on function public.inv_no_tha_ok(public.incidents) from public, anon, authenticated;

create or replace function public.inv_tha_override_row(p_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('reason', o.reason, 'by', o.by_email, 'at', o.created_at)
    from public.inv_gate_overrides o
   where o.incident_uuid = p_id
     and o.gate_key = 'THA'
     and o.revoked_at is null
     and lower(o.by_email) = 'brian@slpalaska.com'
     and char_length(btrim(coalesce(o.reason, ''))) >= 10
   order by o.created_at desc
   limit 1
$$;
revoke all on function public.inv_tha_override_row(uuid) from public, anon, authenticated;

create or replace function public.inv_tha_gate_item(p_inc public.incidents)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  ov jsonb := public.inv_tha_override_row(p_inc.id);
  reason_label text;
begin
  if ov is not null then
    return jsonb_build_object(
      'key', 'THA',
      'level', 'overridden',
      'label', 'THA for this job is on the evidence',
      'message', 'Brian Walden overrode the THA check. ' || (ov ->> 'reason'),
      'fix', 'stage:1:tha',
      'evidence', '[]'::jsonb,
      'via', 'override',
      'override', ov
    );
  end if;
  if public.inv_tha_evidence_ok(p_inc) then
    return jsonb_build_object(
      'key', 'THA', 'level', 'pass',
      'label', 'THA for this job is on the evidence',
      'message', 'A THA PDF is on the evidence.',
      'fix', 'stage:1:tha', 'evidence', '[]'::jsonb, 'via', 'evidence'
    );
  end if;
  if public.inv_no_tha_ok(p_inc) then
    reason_label := case p_inc.no_tha_reason
      when 'office_shop_only' then 'Office or shop only — no field work'
      when 'no_field_task_in_progress' then 'No field task was in progress'
      when 'emergency_response_before_tha' then 'Emergency response started before a THA could be written'
      when 'tha_lost_or_not_found' then 'The THA was lost or cannot be found'
      else 'Other'
    end;
    return jsonb_build_object(
      'key', 'THA', 'level', 'pass',
      'label', 'THA for this job is on the evidence',
      'message', 'No THA is on file. The reason is recorded. ' || reason_label
        || case when btrim(coalesce(p_inc.no_tha_reason_detail, '')) <> ''
                then ' — ' || btrim(p_inc.no_tha_reason_detail) else '' end,
      'fix', 'stage:1:tha', 'evidence', '[]'::jsonb, 'via', 'no_tha'
    );
  end if;
  return jsonb_build_object(
    'key', 'THA', 'level', 'block',
    'label', 'THA for this job is on the evidence',
    'message', 'Attach the THA for this job as a PDF on the evidence, or record why there is not one. A THA shows the crew planned the work.',
    'fix', 'stage:1:tha', 'evidence', '[]'::jsonb, 'via', null
  );
end $$;
revoke all on function public.inv_tha_gate_item(public.incidents) from public, anon, authenticated;

create or replace function public.inv_tha_gate_eval(p_inc public.incidents)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare it jsonb := public.inv_tha_gate_item(p_inc);
begin
  return jsonb_build_object(
    'status', case when it ->> 'level' = 'block' then 'block' else 'pass' end,
    'key', 'THA',
    'via', it -> 'via',
    'message', it ->> 'message',
    'item', it
  );
end $$;
revoke all on function public.inv_tha_gate_eval(public.incidents) from public, anon, authenticated;

create or replace function public.inv_tha_gate(p_incident uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare inc public.incidents;
begin
  if auth.role() is distinct from 'service_role'
     and not (public.inv_is_investigator() or public.is_portal_staff() or public.inv_is_super_admin()) then
    raise exception using errcode = '42501', message = 'Not authorized for investigations.';
  end if;
  select * into inc from public.incidents where id = p_incident;
  if not found then return null; end if;
  return public.inv_tha_gate_eval(inc);
end $$;
revoke all on function public.inv_tha_gate(uuid) from public, anon;
grant execute on function public.inv_tha_gate(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. Enforcement. Every investigation, not only the quality-gate scope.
--    Other gates are unchanged (their trigger still runs as well).
-- ---------------------------------------------------------------------------
create or replace function public.inv_enforce_tha_gate()
returns trigger language plpgsql security definer set search_path = public as $$
declare g jsonb;
begin
  if not (
       (coalesce(new.stage_1_complete, false) and not coalesce(old.stage_1_complete, false))
    or (coalesce(new.stage_2_complete, false) and not coalesce(old.stage_2_complete, false))
    or (coalesce(new.stage_3_complete, false) and not coalesce(old.stage_3_complete, false))
    or (coalesce(new.stage_4_complete, false) and not coalesce(old.stage_4_complete, false))
    or (new.status::text in ('Pending Approval', 'Approved', 'Closed') and new.status is distinct from old.status)
  ) then
    return new;
  end if;
  g := public.inv_tha_gate_eval(new);
  if g ->> 'status' = 'block' then
    raise exception using
      errcode = 'P0001',
      message = 'THA_GATE: This investigation needs a THA PDF on the evidence, or a recorded reason there is not one, before it can be marked complete, approved, or closed. Open Setup & Evidence in the Investigation Workbench.',
      hint = 'Attach a THA (evidence type THA, PDF file) or set No THA with a reason from the list. tha_lost_or_not_found and other need 30 characters of detail. Only Brian Walden can override this check.';
  end if;
  return new;
end $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'inv_incidents_tha_gate'
                 and tgrelid = 'public.incidents'::regclass) then
    create trigger inv_incidents_tha_gate
      before update on public.incidents
      for each row execute function public.inv_enforce_tha_gate();
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 4. Show the THA line on the quality checklist without rewriting the other
--    rules. inv_quality_gate_eval is not replaced.
-- ---------------------------------------------------------------------------
create or replace function public.inv_quality_gate_with_tha(p_inc public.incidents)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  g jsonb := public.inv_quality_gate_eval(p_inc);
  tha jsonb := public.inv_tha_gate_item(p_inc);
  items jsonb;
  has_block boolean;
  has_warn boolean;
begin
  if g is null then return null; end if;
  items := coalesce(g -> 'items', '[]'::jsonb) || jsonb_build_array(tha);
  select coalesce(bool_or(x ->> 'level' = 'block'), false),
         coalesce(bool_or(x ->> 'level' = 'warn'), false)
    into has_block, has_warn
    from jsonb_array_elements(items) x;
  return g || jsonb_build_object(
    'status', case when has_block then 'block' when has_warn then 'warn' else 'pass' end,
    'block_count', (select count(*) from jsonb_array_elements(items) x where x ->> 'level' = 'block'),
    'warn_count', (select count(*) from jsonb_array_elements(items) x where x ->> 'level' = 'warn'),
    'items', items
  );
end $$;
revoke all on function public.inv_quality_gate_with_tha(public.incidents) from public, anon, authenticated;

create or replace function public.inv_quality_gate(p_incident uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare inc public.incidents;
begin
  if auth.role() is distinct from 'service_role'
     and not (public.inv_is_investigator() or public.is_portal_staff() or public.inv_is_super_admin()) then
    raise exception using errcode = '42501', message = 'Not authorized for investigations.';
  end if;
  select * into inc from public.incidents where id = p_incident;
  if not found then return null; end if;
  return public.inv_quality_gate_with_tha(inc);
end $$;
revoke all on function public.inv_quality_gate(uuid) from public, anon;
grant execute on function public.inv_quality_gate(uuid) to authenticated, service_role;

-- Return the merged checklist so a THA override shows up without a second
-- round trip. The Brian check and the activity-log insert are unchanged.
create or replace function public.inv_gate_ack(p_incident uuid, p_key text, p_reason text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare me text := lower(coalesce(auth.jwt() ->> 'email', '')); g jsonb; it jsonb; inc public.incidents;
begin
  if not (public.inv_is_investigator() or public.inv_is_super_admin()) then
    raise exception using errcode = '42501', message = 'Not authorized for investigations.';
  end if;
  if length(btrim(coalesce(p_reason, ''))) < 10 then
    raise exception using errcode = 'P0001', message = 'QUALITY_GATE: Give a one-line reason (10+ characters).';
  end if;
  select * into inc from public.incidents where id = p_incident;
  if not found then raise exception 'Investigation not found.'; end if;
  g := public.inv_quality_gate_eval(inc);
  select x into it from jsonb_array_elements(g -> 'items') x where x ->> 'key' = p_key;
  if it is null or it ->> 'level' not in ('warn', 'acked') then
    raise exception using errcode = 'P0001', message = 'QUALITY_GATE: Only an amber (warning) item takes a reason. Red items must be fixed.';
  end if;
  insert into public.inv_gate_warn_acks (incident_uuid, gate_key, reason, by_email)
  values (p_incident, p_key, btrim(p_reason), me)
  on conflict (incident_uuid, gate_key) do update set reason = excluded.reason, by_email = excluded.by_email, created_at = now();
  insert into public.investigation_activity_log (incident_id, incident_id_text, action, action_category, entity_type, entity_id, user_email, details)
  values (p_incident::text, inc.incident_id, 'Quality gate warning acknowledged', 'quality_gate', 'incident', p_incident::text, me,
          jsonb_build_object('gate', p_key, 'reason', btrim(p_reason)));
  return public.inv_quality_gate_with_tha(inc);
end $$;
revoke all on function public.inv_gate_ack(uuid, text, text) from public, anon;
grant execute on function public.inv_gate_ack(uuid, text, text) to authenticated;

create or replace function public.inv_gate_override(p_incident uuid, p_key text, p_reason text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare me text := lower(coalesce(auth.jwt() ->> 'email', '')); inc public.incidents;
begin
  if me <> 'brian@slpalaska.com' then
    raise exception using errcode = '42501', message = 'QUALITY_GATE: Only Brian Walden can override a quality gate.';
  end if;
  if length(btrim(coalesce(p_reason, ''))) < 10 then
    raise exception using errcode = 'P0001', message = 'QUALITY_GATE: Give a reason (10+ characters). It prints on the reviewer page.';
  end if;
  select * into inc from public.incidents where id = p_incident;
  if not found then raise exception 'Investigation not found.'; end if;
  update public.inv_gate_overrides set revoked_at = now(), revoked_by = me
   where incident_uuid = p_incident and gate_key = p_key and revoked_at is null;
  insert into public.inv_gate_overrides (incident_uuid, gate_key, reason, by_email)
  values (p_incident, p_key, btrim(p_reason), me);
  insert into public.investigation_activity_log (incident_id, incident_id_text, action, action_category, entity_type, entity_id, user_email, details)
  values (p_incident::text, inc.incident_id, 'Quality gate overridden', 'quality_gate', 'incident', p_incident::text, me,
          jsonb_build_object('gate', p_key, 'reason', btrim(p_reason)));
  return public.inv_quality_gate_with_tha(inc);
end $$;
revoke all on function public.inv_gate_override(uuid, text, text) from public, anon;
grant execute on function public.inv_gate_override(uuid, text, text) to authenticated;

create or replace function public.inv_gate_override_revoke(p_incident uuid, p_key text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare me text := lower(coalesce(auth.jwt() ->> 'email', '')); inc public.incidents;
begin
  if me <> 'brian@slpalaska.com' then
    raise exception using errcode = '42501', message = 'QUALITY_GATE: Only Brian Walden can change a quality gate override.';
  end if;
  select * into inc from public.incidents where id = p_incident;
  update public.inv_gate_overrides set revoked_at = now(), revoked_by = me
   where incident_uuid = p_incident and gate_key = p_key and revoked_at is null;
  insert into public.investigation_activity_log (incident_id, incident_id_text, action, action_category, entity_type, entity_id, user_email, details)
  values (p_incident::text, inc.incident_id, 'Quality gate override removed', 'quality_gate', 'incident', p_incident::text, me,
          jsonb_build_object('gate', p_key));
  return public.inv_quality_gate_with_tha(inc);
end $$;
revoke all on function public.inv_gate_override_revoke(uuid, text) from public, anon;
grant execute on function public.inv_gate_override_revoke(uuid, text) to authenticated;

-- SQL 2026-10-11-51 — 29 CFR Part 1904 injury/illness classification justification.
-- SLP Safety Portal (iypezirwdlqpptjpeeyf). ADDITIVE ONLY: new nullable columns on
-- incidents, one appended text-gate item, one new trigger. No drops, no deletes,
-- no rewrites of existing rows. Idempotent: safe to re-run.
--
-- WHERE IT LIVES
--   Workbench stage 4 "29 CFR 1904 Classification" card (components/Osha1904Classification.js)
--   writes these columns through the investigator's normal incidents update.
--   The final report (/investigation-report/[id]) and generate-investigation-pdf
--   print classification + regulatory basis + justification. The workers'
--   compensation note (osha_1904_wc_note) is a separate determination and is NOT
--   printed in the conclusions report; it is for the confidential packet only.
--
-- ENFORCEMENT
--   * Workbench: Approve / Close / Mark Complete are blocked until the block is
--     valid (app/lib/osha1904.js validateOsha1904: classification, >=150-char
--     narrative, the 1904.5 / 1904.7 citations that classification needs).
--   * Database (below): an incident with injury_occurred = true cannot move TO
--     Approved or Closed without a classification, and (unless 'not_case') a
--     justification of at least 150 characters that cites 1904.
--   * The justification is added to inv_report_gate_items, so it must pass the
--     spelling & grammar gate. Blank text adds nothing, so every existing pass
--     hash stays valid.

alter table public.incidents add column if not exists osha_1904_classification text;
alter table public.incidents add column if not exists osha_1904_work_related   text;
alter table public.incidents add column if not exists osha_1904_basis          text[] not null default '{}';
alter table public.incidents add column if not exists osha_1904_justification  text;
alter table public.incidents add column if not exists osha_1904_days_away      integer;
alter table public.incidents add column if not exists osha_1904_days_restricted integer;
alter table public.incidents add column if not exists osha_1904_privacy_case   boolean not null default false;
alter table public.incidents add column if not exists osha_1904_wc_note        text;
alter table public.incidents add column if not exists osha_1904_classified_by  text;
alter table public.incidents add column if not exists osha_1904_classified_at  timestamptz;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'incidents_osha_1904_classification_chk') then
    alter table public.incidents add constraint incidents_osha_1904_classification_chk check (
      osha_1904_classification is null or osha_1904_classification in (
        'not_case','first_aid','bunkhouse','personal','other_not_recordable',
        'recordable_mti','recordable_rwi','recordable_lti','recordable_fatality'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'incidents_osha_1904_work_related_chk') then
    alter table public.incidents add constraint incidents_osha_1904_work_related_chk check (
      osha_1904_work_related is null or osha_1904_work_related in ('yes','no'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'incidents_osha_1904_days_chk') then
    alter table public.incidents add constraint incidents_osha_1904_days_chk check (
      (osha_1904_days_away is null or osha_1904_days_away between 0 and 180)
      and (osha_1904_days_restricted is null or osha_1904_days_restricted between 0 and 180));
  end if;
end $$;

comment on column public.incidents.osha_1904_classification is '29 CFR 1904 classification (not_case, first_aid, bunkhouse, personal, other_not_recordable, recordable_mti/rwi/lti/fatality)';
comment on column public.incidents.osha_1904_justification is 'Why recordable / not recordable, citing 1904.5 work-relatedness and 1904.7 criteria. Printed in the final report.';
comment on column public.incidents.osha_1904_wc_note is 'Workers compensation note: separate determination from OSHA recordability. Confidential packet only; not printed in the conclusions report.';

-- Text gate: same function, one appended item.
CREATE OR REPLACE FUNCTION public.inv_report_gate_items(p_inc incidents)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  j jsonb := to_jsonb(p_inc);
  fk text[] := array_remove(array[p_inc.incident_id::text, p_inc.id::text], null);
  inv text := lower(coalesce(to_jsonb(p_inc) ->> 'investigation_type', ''));
  is_local boolean; is_5why boolean; is_rca boolean;
  items jsonb := '[]'::jsonb;
  r jsonb; p jsonb; n int; c text; lbl text;
  what_t text; imm_t text; blob jsonb;
  iid text := p_inc.id::text;
begin
  is_local := inv like '%local%';
  is_5why  := not is_local and (inv like '%5%' or inv like '%why%');
  is_rca   := not is_local and not is_5why;

  -- Incident summary + initial findings
  p := inv_gate_pick(j, array['brief_description', 'description']);
  items := items || inv_gate_item('incidents:' || (p->>'c'), 'Brief Description', 'incidents', iid, p->>'c', p->>'v');
  items := items || inv_gate_item('incidents:detailed_description', 'Detailed Description', 'incidents', iid, 'detailed_description', j->>'detailed_description');
  if coalesce((j->>'injury_occurred')::boolean, false) then
    p := inv_gate_pick(j, array['injury_nature', 'injury_type']);
    items := items || inv_gate_item('incidents:' || (p->>'c'), 'Injury Type', 'incidents', iid, p->>'c', p->>'v');
    items := items || inv_gate_item('incidents:treatment_provided', 'Treatment Provided', 'incidents', iid, 'treatment_provided', j->>'treatment_provided');
  end if;
  foreach c in array array['immediate_actions_taken', 'suspected_root_causes', 'causal_factors', 'lessons_learned_initial', 'contributing_factors_initial'] loop
    lbl := case c when 'immediate_actions_taken' then 'Immediate Actions Taken'
                  when 'suspected_root_causes' then 'Suspected Root Causes'
                  when 'causal_factors' then 'Causal Factors'
                  when 'lessons_learned_initial' then 'Initial Lessons Learned'
                  else 'Contributing Factors (initial)' end;
    items := items || inv_gate_item('incidents:' || c, lbl, 'incidents', iid, c, j->>c);
  end loop;

  -- Timeline
  n := 0;
  for r in select to_jsonb(t) from public.timeline_events t where t.incident_id = any(fk)
           order by t.event_date nulls last, t.event_time nulls last, t.id loop
    n := n + 1;
    p := inv_gate_pick(r, array['description', 'event_description']);
    items := items || inv_gate_item('timeline_events:' || (r->>'id') || ':' || (p->>'c'), 'Timeline event ' || n, 'timeline_events', r->>'id', p->>'c', p->>'v');
  end loop;

  -- Evidence photo captions (the report prints the description of image rows)
  n := 0;
  for r in select to_jsonb(e) from public.investigation_evidence e
           where e.incident_id = any(fk) and coalesce(e.file_url, '') ~* '\.(jpe?g|png|webp|gif)$'
           order by e.uploaded_at nulls last, e.id loop
    n := n + 1;
    items := items || inv_gate_item('investigation_evidence:' || (r->>'id') || ':description', 'Evidence caption ' || n, 'investigation_evidence', r->>'id', 'description', r->>'description');
  end loop;

  -- Witness statements
  n := 0;
  for r in select to_jsonb(w) from public.witness_statements w where w.incident_id = any(fk)
           order by w.created_at nulls last, w.id loop
    n := n + 1;
    p := inv_gate_pick(r, array['summary', 'statement_summary']);
    items := items || inv_gate_item('witness_statements:' || (r->>'id') || ':' || (p->>'c'), 'Witness ' || n || ' statement', 'witness_statements', r->>'id', p->>'c', p->>'v');
    items := items || inv_gate_item('witness_statements:' || (r->>'id') || ':additional_comments', 'Witness ' || n || ' notes', 'witness_statements', r->>'id', 'additional_comments', r->>'additional_comments');
  end loop;

  -- Analysis (only the one the report prints)
  if is_local then
    select to_jsonb(l) into r from public.local_reviews l where l.incident_id = any(fk)
      order by l.updated_at desc, l.id desc limit 1;
    if r is not null then
      p := inv_gate_pick(r, array['what_happened']); what_t := coalesce(p->>'v', '');
      items := items || inv_gate_item('local_reviews:' || (r->>'id') || ':what_happened', 'Local review: What Happened', 'local_reviews', r->>'id', 'what_happened', p->>'v');
      p := inv_gate_pick(r, array['immediate_cause', 'immediate_causes']); imm_t := coalesce(p->>'v', '');
      items := items || inv_gate_item('local_reviews:' || (r->>'id') || ':' || (p->>'c'), 'Local review: Immediate Causes', 'local_reviews', r->>'id', p->>'c', p->>'v');
      p := inv_gate_pick(r, array['contributing', 'findings']);
      items := items || inv_gate_item('local_reviews:' || (r->>'id') || ':' || (p->>'c'), 'Local review: Contributing Factors', 'local_reviews', r->>'id', p->>'c', p->>'v');
      p := inv_gate_pick(r, array['preventive', 'do_differently']);
      items := items || inv_gate_item('local_reviews:' || (r->>'id') || ':' || (p->>'c'), 'Local review: If You Could Do This Over', 'local_reviews', r->>'id', p->>'c', p->>'v');
      items := items || inv_gate_item('local_reviews:' || (r->>'id') || ':additional_notes', 'Local review: Additional Notes', 'local_reviews', r->>'id', 'additional_notes', r->>'additional_notes');
      blob := inv_gate_pick(r, array['analysis_text', 'review_text']);
      if length(coalesce(blob->>'v', '')) > length(what_t) + length(imm_t) + 80 then
        items := items || inv_gate_item('local_reviews:' || (r->>'id') || ':' || (blob->>'c'), 'Local review: analysis text', 'local_reviews', r->>'id', blob->>'c', blob->>'v');
      end if;
    end if;
  elsif is_5why then
    select to_jsonb(f) into r from public.five_why_analyses f where f.incident_id = any(fk)
      order by f.updated_at desc, f.id desc limit 1;
    if r is not null then
      for n in 1..5 loop
        items := items || inv_gate_item('five_why_analyses:' || (r->>'id') || ':why' || n, 'Why #' || n, 'five_why_analyses', r->>'id', 'why' || n, r->>('why' || n));
      end loop;
      p := inv_gate_pick(r, array['root_cause', 'root_cause_identified']);
      items := items || inv_gate_item('five_why_analyses:' || (r->>'id') || ':' || (p->>'c'), 'Root Cause', 'five_why_analyses', r->>'id', p->>'c', p->>'v');
    end if;
  else
    for r in select to_jsonb(f) from public.rca_factors f where f.incident_id = p_inc.id and f.is_factor
             order by f.category, f.id loop
      items := items || inv_gate_item('rca_factors:' || (r->>'id') || ':description', 'Root cause factor: ' || initcap(coalesce(r->>'category', '')), 'rca_factors', r->>'id', 'description', r->>'description');
    end loop;
    items := items || inv_gate_item('incidents:root_cause_summary', 'Root Cause Summary', 'incidents', iid, 'root_cause_summary', j->>'root_cause_summary');
  end if;

  -- Corrective actions
  n := 0;
  for r in select to_jsonb(a) from public.investigation_corrective_actions a where a.incident_id = any(fk)
           order by a.due_date nulls last, a.id loop
    n := n + 1;
    p := inv_gate_pick(r, array['description', 'action_description', 'action']);
    items := items || inv_gate_item('investigation_corrective_actions:' || (r->>'id') || ':' || (p->>'c'), 'Corrective action ' || n, 'investigation_corrective_actions', r->>'id', p->>'c', p->>'v');
    items := items || inv_gate_item('investigation_corrective_actions:' || (r->>'id') || ':hierarchy_justification', 'Corrective action ' || n || ' justification', 'investigation_corrective_actions', r->>'id', 'hierarchy_justification', r->>'hierarchy_justification');
  end loop;

  -- Lessons learned
  n := 0;
  for r in select to_jsonb(l) from public.lessons_learned l where l.incident_id = p_inc.id
           order by l.created_at nulls last, l.id loop
    n := n + 1;
    p := inv_gate_pick(r, array['title', 'lesson_title']);
    items := items || inv_gate_item('lessons_learned:' || (r->>'id') || ':' || (p->>'c'), 'Lesson ' || n || ' title', 'lessons_learned', r->>'id', p->>'c', p->>'v');
    p := inv_gate_pick(r, array['description', 'lesson_description']);
    items := items || inv_gate_item('lessons_learned:' || (r->>'id') || ':' || (p->>'c'), 'Lesson ' || n || ' text', 'lessons_learned', r->>'id', p->>'c', p->>'v');
    items := items || inv_gate_item('lessons_learned:' || (r->>'id') || ':key_takeaway', 'Lesson ' || n || ' key takeaway', 'lessons_learned', r->>'id', 'key_takeaway', r->>'key_takeaway');
  end loop;

  -- 29 CFR 1904 classification justification (SQL 2026-10-11-51): printed in the
  -- final report, so it is spell/grammar checked like the rest.
  items := items || inv_gate_item('incidents:osha_1904_justification', '29 CFR 1904 classification justification', 'incidents', iid, 'osha_1904_justification', j->>'osha_1904_justification');
  return items;
end $function$;

-- Approve / Close guard for injury cases.
create or replace function public.inv_osha_1904_guard()
returns trigger language plpgsql security definer set search_path = '' as $fn$
begin
  if new.status::text in ('Approved','Closed')
     and old.status::text is distinct from new.status::text
     and coalesce(new.injury_occurred, false) then
    if new.osha_1904_classification is null then
      raise exception 'OSHA 1904: pick the 29 CFR 1904 classification (stage 4) before this injury investigation can be %.', new.status
        using errcode = 'P0001', hint = 'osha_1904_required';
    end if;
    if new.osha_1904_classification <> 'not_case'
       and (length(btrim(coalesce(new.osha_1904_justification, ''))) < 150
            or coalesce(new.osha_1904_justification, '') !~ '1904') then
      raise exception 'OSHA 1904: write the classification justification (at least 150 characters, citing 29 CFR 1904) before this injury investigation can be %.', new.status
        using errcode = 'P0001', hint = 'osha_1904_required';
    end if;
  end if;
  return new;
end; $fn$;
revoke all on function public.inv_osha_1904_guard() from public, anon, authenticated;

drop trigger if exists inv_incidents_osha_1904_guard on public.incidents;
create trigger inv_incidents_osha_1904_guard
  before update of status on public.incidents
  for each row execute function public.inv_osha_1904_guard();

-- SQL 2026-10-10-31 — Final investigation report: spelling & grammar HARD GATE.
-- SLP Safety Portal (iypezirwdlqpptjpeeyf). ADDITIVE ONLY: one new table, new
-- functions, one new trigger. No drops, no deletes, no rewrites of existing rows.
-- Idempotent: safe to re-run.
--
-- HOW THE GATE WORKS
--   1. public.inv_report_gate_items(incident) lists every free-text value that
--      the final report (/investigation-report/[id]) prints, with the table, row
--      and column it came from. It mirrors that page's fallbacks (a || b) and
--      its analysis-type switch (Local Review / 5-Why / RCA). Keep the two in step.
--   2. POST /api/investigation-text-gate (investigator session, service role)
--      reads those items, runs them through LanguageTool, and only on a clean
--      pass writes md5(items) into public.inv_text_gate.passed_hash.
--   3. The trigger below refuses Approved / Closed / stage_4_complete unless
--      passed_hash equals md5 of the CURRENT text (computed from NEW, so text
--      changed in the same statement counts). Edit anything after a pass and
--      the hash no longer matches: re-check required. No pass row, no approval
--      (fails closed). The report page and report generator call the same route
--      and render nothing until it passes.
--   Field Incident Report submit is NOT gated (INSERT is untouched).

-- ---------------------------------------------------------------------------
-- 1. Gate state per incident. Service role only (the API route); RLS on with no
--    policies, and table grants revoked from anon/authenticated, so a browser
--    cannot write its own pass.
-- ---------------------------------------------------------------------------
create table if not exists public.inv_text_gate (
  incident_uuid    uuid primary key references public.incidents(id) on delete cascade,
  passed_hash      text,
  passed_at        timestamptz,
  passed_by_email  text,
  checker          text,
  fields_checked   integer,
  accepted_terms   text[] not null default '{}',
  last_result      text,
  last_issue_count integer,
  last_checked_at  timestamptz,
  last_checked_by  text
);
alter table public.inv_text_gate enable row level security;
revoke all on public.inv_text_gate from anon, authenticated;
grant select, insert, update on public.inv_text_gate to service_role;

-- ---------------------------------------------------------------------------
-- 2. Item helper: '[]' for blank text, else a one-element array.
-- ---------------------------------------------------------------------------
create or replace function public.inv_gate_item(p_key text, p_label text, p_table text, p_id text, p_column text, p_text text)
returns jsonb language sql immutable set search_path = public as $$
  select case when p_text is null or btrim(p_text) = '' then '[]'::jsonb
              else jsonb_build_array(jsonb_build_object(
                     'key', p_key, 'label', p_label, 'table', p_table,
                     'id', p_id, 'column', p_column, 'text', p_text)) end
$$;

-- First non-empty column of a row (JS `a || b`). Returns {c: column, v: value}.
create or replace function public.inv_gate_pick(p_row jsonb, p_cols text[])
returns jsonb language plpgsql immutable set search_path = public as $$
declare c text;
begin
  foreach c in array p_cols loop
    if coalesce(p_row ->> c, '') <> '' then
      return jsonb_build_object('c', c, 'v', p_row ->> c);
    end if;
  end loop;
  return jsonb_build_object('c', p_cols[1], 'v', null);
end $$;

-- ---------------------------------------------------------------------------
-- 3. Every free-text value the final report prints, in report order.
--    Takes the incidents row (not an id) so the trigger can pass NEW.
-- ---------------------------------------------------------------------------
create or replace function public.inv_report_gate_items(p_inc public.incidents)
returns jsonb language plpgsql stable security definer set search_path = public as $$
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

  return items;
end $$;
revoke all on function public.inv_report_gate_items(public.incidents) from public, anon, authenticated;

-- Fingerprint of exactly the text above.
create or replace function public.inv_report_text_hash(p_inc public.incidents)
returns text language sql stable security definer set search_path = public as $$
  select md5(public.inv_report_gate_items(p_inc)::text)
$$;
revoke all on function public.inv_report_text_hash(public.incidents) from public, anon, authenticated;

-- What the API route needs: the items, their hash, and the names/terms printed
-- elsewhere in the report (people, companies, places) so those words are not
-- flagged as misspellings in the narrative.
create or replace function public.inv_report_text_gate(p_incident uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  inc public.incidents;
  j jsonb;
  fk text[];
  items jsonb;
  names text[] := '{}';
  st jsonb;
begin
  select * into inc from public.incidents where id = p_incident;
  if not found then return null; end if;
  j := to_jsonb(inc);
  fk := array_remove(array[inc.incident_id::text, inc.id::text], null);
  items := public.inv_report_gate_items(inc);

  names := array(select v from (
      select j ->> k as v from unnest(array['reported_by_name', 'reported_by', 'submitted_by', 'supervisor_name',
        'supervisor_title', 'injured_person_name', 'injured_name', 'injured_person_company', 'injured_company',
        'injured_person_position', 'injured_job_title', 'treating_physician', 'company_name', 'company',
        'location_name', 'location', 'specific_location_onsite', 'operation_type', 'team_leader',
        'team_leader_email', 'vehicle_id', 'vehicle_type', 'release_material']) k
      union all
      select to_jsonb(w) ->> k from public.witness_statements w,
        unnest(array['name', 'witness_name', 'position', 'position_role', 'company', 'job_title']) k
        where w.incident_id = any(fk)
      union all
      select to_jsonb(a) ->> k from public.investigation_corrective_actions a,
        unnest(array['owner', 'action_owner_name']) k
        where a.incident_id = any(fk)
    ) s where coalesce(btrim(v), '') <> '');

  select jsonb_build_object('passed_hash', g.passed_hash, 'passed_at', g.passed_at,
                            'accepted_terms', to_jsonb(g.accepted_terms))
    into st from public.inv_text_gate g where g.incident_uuid = p_incident;

  return jsonb_build_object(
    'incident_uuid', inc.id,
    'incident_id', inc.incident_id,
    'status', inc.status,
    'items', items,
    'hash', md5(items::text),
    'names', to_jsonb(names),
    'state', coalesce(st, '{}'::jsonb));
end $$;
revoke all on function public.inv_report_text_gate(uuid) from public, anon, authenticated;
grant execute on function public.inv_report_text_gate(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 4. The gate. Fires on the transition only, so existing Approved/Closed rows
--    and ordinary edits are untouched; Incident Report INSERT is not gated.
-- ---------------------------------------------------------------------------
create or replace function public.inv_enforce_text_gate()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_hash text; v_pass text;
begin
  if not (
       (new.status in ('Approved', 'Closed') and new.status is distinct from old.status)
    or (coalesce(new.stage_4_complete, false) and not coalesce(old.stage_4_complete, false))
  ) then
    return new;
  end if;
  v_hash := public.inv_report_text_hash(new);
  select passed_hash into v_pass from public.inv_text_gate where incident_uuid = new.id;
  if v_pass is null or v_pass <> v_hash then
    raise exception using
      errcode = 'P0001',
      message = 'TEXT_GATE: The spelling & grammar check has not passed for the current report text.',
      hint = 'Run the check (Investigation Workbench > Close It Out), fix the flagged items, then approve or complete again.';
  end if;
  return new;
end $$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'inv_incidents_text_gate'
                 and tgrelid = 'public.incidents'::regclass) then
    create trigger inv_incidents_text_gate
      before update on public.incidents
      for each row execute function public.inv_enforce_text_gate();
  end if;
end $$;

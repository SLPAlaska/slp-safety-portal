-- SQL 2026-10-11-54 — Investigation Quality Gates (P0): the checklist function.
-- SLP Safety Portal (iypezirwdlqpptjpeeyf). New functions only. Idempotent.
--
-- public.inv_quality_gate_eval(incidents row) is the ONE source of truth. It
-- feeds the workbench Quality Checklist, the incidents status trigger (SQL 55)
-- and the report watermark. It reads; it never writes.
--
-- Returns {status: pass|warn|block, applies, items:[{key, level, label,
--   message, fix, evidence[], suggest?, override?, ack?}]}
--   level: pass | warn | block | acked (warn with a reason) | overridden (Brian)
--   status: block if any block; warn if any un-acked warn; else pass.
-- Keyword lists only ADD required questions. Nothing here closes, completes or
-- verifies a corrective action.

-- ---------------------------------------------------------------------------
-- small helpers
-- ---------------------------------------------------------------------------
create or replace function public.inv_qg_item(p_key text, p_level text, p_label text, p_message text,
                                              p_fix text, p_evidence jsonb default '[]'::jsonb)
returns jsonb language sql immutable set search_path = public as $$
  select jsonb_build_object('key', p_key, 'level', p_level, 'label', p_label,
                            'message', p_message, 'fix', p_fix,
                            'evidence', coalesce(p_evidence, '[]'::jsonb))
$$;

-- One answer from the responses map built in inv_quality_gate_eval.
create or replace function public.inv_qg_txt(p_resp jsonb, p_code text)
returns text language sql immutable set search_path = public as $$
  select btrim(coalesce(p_resp -> p_code ->> 't', ''))
$$;
create or replace function public.inv_qg_chips(p_resp jsonb, p_code text)
returns text[] language sql immutable set search_path = public as $$
  select coalesce(array(select jsonb_array_elements_text(coalesce(p_resp -> p_code -> 'c', '[]'::jsonb))), '{}'::text[])
$$;
-- Answered = a chip picked or >= 3 chars of text, or N/A with a reason >= 15 chars.
create or replace function public.inv_qg_answered(p_resp jsonb, p_code text)
returns boolean language sql immutable set search_path = public as $$
  select case
    when p_resp -> p_code is null then false
    when coalesce((p_resp -> p_code ->> 'na')::boolean, false)
      then length(btrim(coalesce(p_resp -> p_code ->> 'nr', ''))) >= 15
    else cardinality(public.inv_qg_chips(p_resp, p_code)) > 0
         or length(public.inv_qg_txt(p_resp, p_code)) >= 3
  end
$$;
create or replace function public.inv_qg_quote(p_code text, p_resp jsonb)
returns jsonb language sql immutable set search_path = public as $$
  select case when p_resp -> p_code is null then '[]'::jsonb
    else jsonb_build_array(p_code || ': ' || left(btrim(
           coalesce(array_to_string(public.inv_qg_chips(p_resp, p_code), ' / '), '')
           || case when public.inv_qg_txt(p_resp, p_code) <> '' and cardinality(public.inv_qg_chips(p_resp, p_code)) > 0 then ' — ' else '' end
           || public.inv_qg_txt(p_resp, p_code)), 160)) end
$$;
-- "No / none / n/a / not possible ..." text does not count as naming a change.
create or replace function public.inv_qg_says_nothing(p_text text)
returns boolean language sql immutable set search_path = public as $$
  select coalesce(btrim(p_text), '') = ''
      or btrim(p_text) ~* '^(no|none|nothing|n/?a|not (possible|feasible|applicable)|unknown|idk)\M[\s.!]*$'
$$;

-- Does the incident's company have the per-company switch on?
create or replace function public.inv_qg_company_on(p_company text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(bool_or(f.quality_gate), false)
  from public.inv_feature_flags f
  join public.lms_companies c on c.id = f.company_id
  where p_company is not null and length(trim(p_company)) > 0
    and (lower(c.name) = lower(trim(p_company))
         or exists (select 1 from unnest(coalesce(c.sail_company_names, '{}'::text[])) s
                    where lower(s) = lower(trim(p_company))))
$$;

-- Scope: company switch on, OR an SLP investigator created / leads / reported /
-- last edited it, OR the person making this change is an SLP investigator.
create or replace function public.inv_quality_gate_applies(p_inc public.incidents)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare j jsonb := to_jsonb(p_inc); me text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if public.inv_qg_company_on(p_inc.company_name) then return true; end if;
  return exists (
    select 1 from public.inv_quality_gate_investigators g
    where g.active and g.email = any (array[
      lower(coalesce(j ->> 'created_by_email', '')), lower(coalesce(j ->> 'team_leader_email', '')),
      lower(coalesce(j ->> 'reported_by_email', '')), lower(coalesce(j ->> 'updated_by_email', '')), me]));
end $$;

-- End of the shift the incident happened on (06:00/18:00 two-shift day, local
-- Alaska time) and whether the report came in after it.
create or replace function public.inv_qg_late(p_inc public.incidents)
returns jsonb language plpgsql stable set search_path = public as $$
declare
  t time := p_inc.incident_time;
  d date := p_inc.incident_date;
  shift_end timestamp;
  rep timestamptz := coalesce(p_inc.reported_at, p_inc.created_at);
  hrs numeric;
begin
  if d is null or rep is null then return jsonb_build_object('late', false); end if;
  if t is null then shift_end := (d + 1) + time '06:00';
  elsif t >= time '06:00' and t < time '18:00' then shift_end := d + time '18:00';
  elsif t >= time '18:00' then shift_end := (d + 1) + time '06:00';
  else shift_end := d + time '06:00';
  end if;
  hrs := round(extract(epoch from (rep - ((d + coalesce(t, time '00:00')) at time zone 'America/Anchorage'))) / 3600.0, 1);
  return jsonb_build_object(
    'late', rep > (shift_end at time zone 'America/Anchorage'),
    'hours', hrs,
    'shift_end', to_char(shift_end, 'Mon DD HH24:MI'),
    'reported', to_char(rep at time zone 'America/Anchorage', 'Mon DD HH24:MI'));
end $$;

-- Which gate prompts (inv_question_bank.gate) this incident triggers.
create or replace function public.inv_qg_triggered(p_inc public.incidents, p_resp jsonb, p_late boolean)
returns text[] language plpgsql stable security definer set search_path = public as $$
declare
  q record; hit boolean; k text; v jsonb; out text[] := '{}';
  banks text[] := coalesce(p_inc.hazard_types, '{}');
  blob text := lower(concat_ws(' ', p_inc.brief_description, p_inc.detailed_description, p_inc.causal_factors,
                p_inc.suspected_root_causes, p_inc.immediate_actions_taken,
                public.inv_qg_txt(p_resp, 'U1'), public.inv_qg_txt(p_resp, 'U3'), public.inv_qg_txt(p_resp, 'R1'),
                public.inv_qg_txt(p_resp, 'R2'), public.inv_qg_txt(p_resp, 'C2'), public.inv_qg_txt(p_resp, 'C8'),
                public.inv_qg_txt(p_resp, 'C11'), public.inv_qg_txt(p_resp, 'C13'), public.inv_qg_txt(p_resp, 'C14'),
                public.inv_qg_txt(p_resp, 'U6'), public.inv_qg_txt(p_resp, 'H1')));
begin
  for q in select code, trigger from public.inv_question_bank where gate and active order by sort loop
    hit := false;
    -- all_banks: a precondition, not a trigger on its own unless nothing else is listed
    if q.trigger ? 'all_banks' and not (banks && array(select jsonb_array_elements_text(q.trigger -> 'all_banks'))) then
      continue;
    end if;
    if q.trigger ? 'banks' and banks && array(select jsonb_array_elements_text(q.trigger -> 'banks')) then hit := true; end if;
    if not hit and coalesce((q.trigger ->> 'late')::boolean, false) and p_late then hit := true; end if;
    if not hit and q.trigger ? 'chips' then
      for k, v in select * from jsonb_each(q.trigger -> 'chips') loop
        if public.inv_qg_chips(p_resp, k) && array(select jsonb_array_elements_text(v)) then hit := true; exit; end if;
      end loop;
    end if;
    if not hit and q.trigger ? 'keywords' then
      select true into hit from jsonb_array_elements_text(q.trigger -> 'keywords') kw
       where position(lower(kw) in blob) > 0 limit 1;
      hit := coalesce(hit, false);
    end if;
    if not hit and q.trigger ? 'all_banks' and not (q.trigger ?| array['banks', 'chips', 'keywords', 'late']) then hit := true; end if;
    if hit then out := out || q.code; end if;
  end loop;
  return out;
end $$;

-- ---------------------------------------------------------------------------
-- The checklist
-- ---------------------------------------------------------------------------
create or replace function public.inv_quality_gate_eval(p_inc public.incidents)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  j jsonb := to_jsonb(p_inc);
  fk text[] := array_remove(array[p_inc.incident_id::text, p_inc.id::text], null);
  banks text[] := coalesce(p_inc.hazard_types, '{}');
  inv text := lower(coalesce(p_inc.investigation_type::text, ''));
  resp jsonb;
  items jsonb := '[]'::jsonb;
  ev jsonb; miss text[]; c text; n int; r record;
  late jsonb; is_late boolean;
  trig text[];
  guide_on boolean;
  inv_emails text[];
  cas jsonb; open_cas jsonb; ca jsonb; ca_issues text[]; ca_lbl text;
  today date := (now() at time zone 'America/Anchorage')::date;
  v_hash text; v_pass text;
  t text; alt jsonb; train_hits jsonb; fixes_ppe boolean; impractical jsonb; fix_texts text[];
  phys_trig jsonb; has_phys boolean; suggest text;
  photo_n int; person text;
  status_out text := 'pass';
  ov record; ack record; it jsonb; out_items jsonb := '[]'::jsonb;
  closed_ca text[] := array['complete','completed','verified','verified effective','closed','void','cancelled'];
  approved boolean := p_inc.status in ('Approved', 'Closed');
  applies boolean := public.inv_quality_gate_applies(p_inc);
begin
  -- responses (non-confidential), code -> {c, t, na, nr}
  select coalesce(jsonb_object_agg(question_code, jsonb_build_object(
           'c', to_jsonb(coalesce(answer_choice, '{}'::text[])), 't', coalesce(answer_text, ''),
           'na', not_applicable, 'nr', coalesce(na_reason, ''))), '{}'::jsonb)
    into resp
    from public.inv_question_responses
   where incident_uuid = p_inc.id and not is_confidential;

  guide_on := public.inv_guide_enabled(p_inc.company_name);
  late := public.inv_qg_late(p_inc);
  is_late := coalesce((late ->> 'late')::boolean, false);
  trig := public.inv_qg_triggered(p_inc, resp, is_late);
  inv_emails := array_remove(array[lower(nullif(btrim(p_inc.created_by_email), '')),
                                   lower(nullif(btrim(p_inc.team_leader_email), '')),
                                   lower(nullif(btrim(p_inc.reported_by_email), ''))], null);

  select coalesce(jsonb_agg(to_jsonb(a) order by a.id), '[]'::jsonb) into cas
    from public.investigation_corrective_actions a
   where a.incident_id = any(fk)
     and lower(coalesce(nullif(a.status, ''), nullif(a.action_status, ''), 'open')) not in ('void', 'cancelled');
  select coalesce(jsonb_agg(x), '[]'::jsonb) into open_cas from jsonb_array_elements(cas) x
   where lower(coalesce(nullif(x ->> 'status', ''), nullif(x ->> 'action_status', ''), 'open')) <> all (closed_ca);

  -- G1 spelling & grammar (existing gate, same hash)
  v_hash := public.inv_report_text_hash(p_inc);
  select passed_hash into v_pass from public.inv_text_gate where incident_uuid = p_inc.id;
  items := items || public.inv_qg_item('G1', case when v_pass is not null and v_pass = v_hash then 'pass' else 'block' end,
    'Spelling & grammar check passed',
    'Clean up the flagged spelling first. Reviewers and clients read this word for word. Run the check from Close It Out.',
    'stage:4:status');

  if guide_on then
    -- G2 core questions
    miss := array(select x from unnest(array['U1','U3','U4','U6','U8','U12']) x where not public.inv_qg_answered(resp, x));
    items := items || public.inv_qg_item('G2', case when cardinality(miss) = 0 then 'pass' else 'block' end,
      'Core interview questions answered',
      case when cardinality(miss) = 0 then 'U1, U3, U4, U6, U8 and U12 are answered.'
        else array_to_string(miss, ', ') || ' not answered yet (answer it, or mark N/A with a reason of 15+ characters). '
          || case when 'U12' = any(miss) then 'U12 asks which defenses should have stopped this; that is usually where the real fix shows up.'
                  when 'U6' = any(miss) then 'U6 asks whether the right tool was at the work location; that is usually where the real fix shows up.'
                  else 'These are the questions the conclusions rest on.' end end,
      'stage:3:q:' || coalesce(miss[1], 'U1'),
      to_jsonb(miss));

    -- G3 critical questions in the hazard banks
    if cardinality(banks) = 0 then
      items := items || public.inv_qg_item('G3', 'block', 'Hazard type picked and its critical questions answered',
        'Pick the hazard type(s) at the top of the Interview Guide. That loads the questions this kind of incident needs.',
        'stage:3:guide');
    else
      miss := array(select q.code from public.inv_question_bank q
                     where q.active and q.is_critical and not q.is_confidential and q.bank = any(banks)
                       and not public.inv_qg_answered(resp, q.code) order by q.bank, q.sort);
      items := items || public.inv_qg_item('G3', case when cardinality(miss) = 0 then 'pass' else 'block' end,
        'Critical hazard-bank questions answered',
        case when cardinality(miss) = 0 then 'Every critical question in ' || array_to_string(banks, ', ') || ' is answered.'
          else cardinality(miss) || ' critical question(s) open: ' || array_to_string(miss, ', ') || '.' end,
        'stage:3:q:' || coalesce(miss[1], ''), to_jsonb(miss));
    end if;

    -- G4 triggered system-cause prompts (SC-RPT1 is reported under G14)
    miss := array(select x from unnest(trig) x where x <> 'SC-RPT1' and not public.inv_qg_answered(resp, x));
    if cardinality(array(select x from unnest(trig) x where x <> 'SC-RPT1')) > 0 then
      items := items || public.inv_qg_item('G4', case when cardinality(miss) = 0 then 'pass' else 'block' end,
        'System-cause questions this incident triggered',
        case when cardinality(miss) = 0 then 'Triggered prompts answered: ' || array_to_string(array(select x from unnest(trig) x where x <> 'SC-RPT1'), ', ') || '.'
          else 'Before approval, answer ' || array_to_string(miss, ', ') || ' (System causes card in Why It Happened). '
            || case when 'SC-OVR1' = any(miss) then 'This was an overfill / transfer event: why was it possible to overfill in the first place? '
                    else '' end
            || case when 'SC-TOOL1' = any(miss) then 'The right tool was not at the work location: where was it and who owns it? ' else '' end
            || case when 'SC-STORE1' = any(miss) then 'How the part was stored exposed the edge: look at the rack itself. ' else '' end
            || case when 'SC-MED1' = any(miss) then 'Was Poison Control or a medical provider contacted? ' else '' end end,
        'stage:3:q:' || coalesce(miss[1], ''), to_jsonb(miss));
    end if;

    -- G5 root-cause set
    miss := array(select x from unnest(array['R1','R2','R3','R5','R6','R7']) x where not public.inv_qg_answered(resp, x));
    t := public.inv_qg_txt(resp, 'R1');
    if cardinality(miss) = 0 and length(t) < 40 and not coalesce((resp -> 'R1' ->> 'na')::boolean, false) then
      miss := miss || 'R1 (too short)'::text;
    end if;
    items := items || public.inv_qg_item('G5', case when cardinality(miss) = 0 then 'pass' else 'block' end,
      'Root-cause questions answered',
      case when cardinality(miss) = 0 then 'R1, R2, R3, R5, R6 and R7 are answered.'
        else 'Open: ' || array_to_string(miss, ', ') || '. '
          || case when 'R1 (too short)' = any(miss) or 'R1' = any(miss)
                  then 'R1 asks for the mechanism, meaning what physically happened (40+ characters). "Lack of training" tells us who, not how.'
                  else 'R5 asks which safeguards should have stopped it and why each one did not work.' end end,
      'stage:3:q:' || split_part(coalesce(miss[1], 'R1'), ' ', 1),
      public.inv_qg_quote('R1', resp));

    -- C1 training-only root cause vs what the answers show
    train_hits := '[]'::jsonb;
    foreach c in array array['R1','R3','R5','R11'] loop
      t := public.inv_qg_txt(resp, c);
      if t ~* '(^\s*(lack of|no|inadequate|insufficient|more|needs?|poor)?\s*(tr|trn|trng|train|training)\s*\.?\s*$)|(lack(ing)?\s+(of\s+)?(the\s+)?(proper\s+)?(tr\M|trn|training|knowledge))|(not\s+(properly\s+)?trained)|(untrained)|((more|additional|better|inadequate|insufficient)\s+(ongoing\s+)?training)'
      then train_hits := train_hits || public.inv_qg_quote(c, resp); end if;
    end loop;
    for r in select 'Local review' s, concat_ws(' / ', to_jsonb(l) ->> 'immediate_causes', to_jsonb(l) ->> 'immediate_cause', to_jsonb(l) ->> 'findings') v
               from public.local_reviews l where l.incident_id = any(fk) and inv like '%local%'
             union all select 'Root cause summary', p_inc.root_cause_summary
             union all select '5-Why root cause', coalesce(to_jsonb(f) ->> 'root_cause', to_jsonb(f) ->> 'root_cause_identified')
               from public.five_why_analyses f where f.incident_id = any(fk) loop
      if coalesce(r.v, '') ~* '(lack(ing)?\s+(of\s+)?(the\s+)?(proper\s+)?(tr\M|trn|training|knowledge))|(not\s+(properly\s+)?trained)|(untrained)|((more|additional|better|inadequate|insufficient)\s+(ongoing\s+)?training)' then
        train_hits := train_hits || jsonb_build_array(r.s || ': ' || left(r.v, 140));
      end if;
    end loop;
    if jsonb_array_length(train_hits) > 0 then
      alt := '[]'::jsonb;
      if public.inv_qg_chips(resp, 'C5') && array['Yes'] then alt := alt || public.inv_qg_quote('C5', resp); end if;
      if public.inv_qg_chips(resp, 'U4') && array['Faster','Easier','Right gear not here','Always done this way'] then alt := alt || public.inv_qg_quote('U4', resp); end if;
      if public.inv_qg_answered(resp, 'U6') and not (public.inv_qg_chips(resp, 'U6') <@ array['Yes']) then alt := alt || public.inv_qg_quote('U6', resp); end if;
      if public.inv_qg_chips(resp, 'C4') && array['Faster this way','Not available','Too far','Broken','Always done this way'] then alt := alt || public.inv_qg_quote('C4', resp); end if;
      if public.inv_qg_chips(resp, 'U2') && array['Rush/schedule','Client pressure'] then alt := alt || public.inv_qg_quote('U2', resp); end if;
      if public.inv_qg_chips(resp, 'U5') && array['Most people','Everyone'] or public.inv_qg_chips(resp, 'C7') && array['Yes — routinely','Yes — occasionally'] then alt := alt || public.inv_qg_quote('U5', resp) || public.inv_qg_quote('C7', resp); end if;
      if public.inv_qg_chips(resp, 'K5') && array['Understand why'] then alt := alt || public.inv_qg_quote('K5', resp); end if;
      if public.inv_qg_txt(resp, 'K10') ~* '\m(know|knew|aware)' then alt := alt || public.inv_qg_quote('K10', resp); end if;
      if public.inv_qg_txt(resp, 'R2') ~* '(could ?n.?o?t find|couldn.t find|can.?t find|at home|done (this|it) before|faster|rush|hurry|not here|missing)' then alt := alt || public.inv_qg_quote('R2', resp); end if;
      if public.inv_qg_txt(resp, 'U14') ~* '\m(trained|experienc|knew|qualified|competent)' then alt := alt || public.inv_qg_quote('U14', resp); end if;
      items := items || public.inv_qg_item('C1', case when jsonb_array_length(alt) > 0 then 'block' else 'warn' end,
        'Training-only root cause checked against the answers',
        case when jsonb_array_length(alt) > 0
          then 'The root cause says training, but your own answers show he knew the hazard or the right method, or the right tool was not there, or he was rushing. Training gaps are real when people do not know. Re-answer R1/R2 with what made the shortcut make sense at the time (U4), and fix that.'
          else 'The root cause says training. If you proved a knowledge or skill gap (they did not know), record a one-line reason; otherwise name what made the shortcut make sense.' end,
        'stage:3:q:R1', train_hits || alt);
    end if;

    -- C5 PPE-only fix vs gloves impractical / no glove standard
    if jsonb_array_length(cas) > 0 then
      fix_texts := array(select lower(coalesce(nullif(x ->> 'description', ''), x ->> 'action_description', '')) from jsonb_array_elements(cas) x);
      fixes_ppe := not exists (select 1 from jsonb_array_elements(cas) x
                    where coalesce((x ->> 'hierarchy_level')::int, 4) <= 4
                      and not (lower(coalesce(nullif(x ->> 'description', ''), x ->> 'action_description', '')) ~ '(glove|ppe|wear )'));
    else
      fix_texts := array_remove(array[lower(public.inv_qg_txt(resp, 'R6')), lower(public.inv_qg_txt(resp, 'R7'))], '');
      fixes_ppe := cardinality(fix_texts) > 0
        and exists (select 1 from unnest(fix_texts) f where f ~ 'glove')
        and not exists (select 1 from unnest(fix_texts) f where f !~ 'glove' or f ~ '(cover|guard|deburr|file (it|the edge|down)|grind|storage|\mbins?\M|spacing|relocat|redesign|edge protect|\mtape\M|\mcaps?\M)');
    end if;
    if fixes_ppe then
      impractical := '[]'::jsonb;
      if public.inv_qg_txt(resp, 'H9') <> '' and not public.inv_qg_says_nothing(public.inv_qg_txt(resp, 'H9')) then impractical := impractical || public.inv_qg_quote('H9', resp); end if;
      if public.inv_qg_chips(resp, 'H3') && array['Got in the way'] then impractical := impractical || public.inv_qg_quote('H3', resp); end if;
      if public.inv_qg_chips(resp, 'H6') && array['Unwritten custom','None','Conflict between policy and practice'] then impractical := impractical || public.inv_qg_quote('H6', resp); end if;
      if public.inv_qg_txt(resp, 'K10') ~* 'glove' then impractical := impractical || public.inv_qg_quote('K10', resp); end if;
      if jsonb_array_length(impractical) > 0 then
        items := items || public.inv_qg_item('C5', 'block', 'Gloves-only fix checked against the answers',
          'The fix is gloves, but your answers say there is no glove standard for this task or gloves get in the way. Add a CA that removes the edge or changes storage (H5 / U8 / SC-STORE1), or name a cut-rated glove people will actually wear and stock it at point of use.',
          'stage:4:ca', impractical || public.inv_qg_quote('R6', resp));
      end if;
    end if;
  end if;

  -- G6 at least one corrective action
  suggest := coalesce(nullif(case when not public.inv_qg_says_nothing(public.inv_qg_txt(resp, 'U8')) then public.inv_qg_txt(resp, 'U8') end, ''),
                      nullif(case when not public.inv_qg_says_nothing(public.inv_qg_txt(resp, 'H5')) then public.inv_qg_txt(resp, 'H5') end, ''),
                      nullif(public.inv_qg_txt(resp, 'SC-TOOL1'), ''), nullif(public.inv_qg_txt(resp, 'SC-STORE1'), ''),
                      nullif(public.inv_qg_txt(resp, 'R7'), ''));
  it := public.inv_qg_item('G6', case when jsonb_array_length(cas) > 0 then 'pass' else 'block' end,
    'At least one corrective action',
    case when jsonb_array_length(cas) > 0 then jsonb_array_length(cas) || ' corrective action(s) linked.'
      else 'Every investigation needs at least one corrective action.'
        || case when suggest is not null then ' Your own answer looks like a strong one: "' || left(suggest, 120) || '". Turn it into a CA.' else '' end end,
    'stage:4:ca');
  if suggest is not null then it := it || jsonb_build_object('suggest', suggest); end if;
  items := items || it;

  -- G7 physical control required when the answers implicate equipment / conditions
  phys_trig := '[]'::jsonb;
  if public.inv_qg_answered(resp, 'U6') and not (public.inv_qg_chips(resp, 'U6') <@ array['Yes']) then phys_trig := phys_trig || public.inv_qg_quote('U6', resp); end if;
  if not public.inv_qg_says_nothing(public.inv_qg_txt(resp, 'U8')) then phys_trig := phys_trig || public.inv_qg_quote('U8', resp); end if;
  if not public.inv_qg_says_nothing(public.inv_qg_txt(resp, 'R7')) then phys_trig := phys_trig || public.inv_qg_quote('R7', resp); end if;
  foreach c in array array['H5','H10','C4','C9','C11','E3','E9','M2','M5','M8','S1','S10','V9','V10','V11','SC-TOOL1','SC-STORE1','SC-OVR1'] loop
    if public.inv_qg_txt(resp, c) <> '' and not public.inv_qg_says_nothing(public.inv_qg_txt(resp, c)) and c not in ('C4','C9') then
      phys_trig := phys_trig || public.inv_qg_quote(c, resp);
    end if;
  end loop;
  if banks && array['stored_energy','line_of_fire','lifting_rigging','confined_space','electrical','excavation_trench','spill_env','chemical'] then
    phys_trig := phys_trig || jsonb_build_array('Hazard type: ' || array_to_string(banks, ', '));
  end if;
  if jsonb_array_length(phys_trig) > 0 then
    has_phys := exists (select 1 from jsonb_array_elements(cas) x where coalesce((x ->> 'hierarchy_level')::int, 9) <= 3);
    it := public.inv_qg_item('G7', case when has_phys then 'pass' else 'block' end,
      'Physical control (Elimination / Substitution / Engineering) when equipment or conditions are involved',
      case when has_phys then 'At least one corrective action changes the tool, equipment or setup.'
        else 'Training helps, but it does not stop the next person who is in a hurry. Your answers point to equipment or conditions, so at least one CA needs to be Elimination, Substitution or Engineering. Training and SOPs can stay as backup layers.'
          || case when length(coalesce(p_inc.weak_control_justification, '')) >= 60
                  then ' A "why not" is on file and is waiting on Brian''s decision.' else '' end end,
      'stage:4:ca', phys_trig);
    if not has_phys and suggest is not null then it := it || jsonb_build_object('suggest', suggest); end if;
    items := items || it;
  end if;

  -- G8 every open CA complete and consistent; G9 every CA traced to a cause
  ca_issues := '{}';
  n := 0;
  for ca in select x from jsonb_array_elements(open_cas) x loop
    n := n + 1;
    ca_lbl := 'CA #' || (ca ->> 'id');
    t := lower(btrim(coalesce(ca ->> 'action_owner_email', '')));
    if t = '' or t !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
      ca_issues := ca_issues || (ca_lbl || ': owner needs a real email address.');
    elsif t = any(inv_emails)
      and position(split_part(t, '@', 1) in lower(coalesce(nullif(ca ->> 'owner', ''), ca ->> 'action_owner_name', ''))) = 0 then
      ca_issues := ca_issues || (ca_lbl || ': owner is "' || coalesce(nullif(ca ->> 'owner', ''), ca ->> 'action_owner_name', '?') || '" but the owner email is the investigator''s (' || t || '). Put the real owner''s email on it.');
    end if;
    if coalesce(nullif(ca ->> 'due_date', ''), ca ->> 'target_date') is null then
      ca_issues := ca_issues || (ca_lbl || ': needs a due date.');
    elsif coalesce(nullif(ca ->> 'due_date', ''), ca ->> 'target_date')::date < today then
      ca_issues := ca_issues || (ca_lbl || ': due date has passed; set a real date.');
    end if;
    if length(btrim(coalesce(ca ->> 'verification_method', ''))) < 20 then
      ca_issues := ca_issues || (ca_lbl || ': verification needs who, how many and by when (20+ characters), e.g. "3 observed coolant services by shop lead".');
    end if;
    if (ca ->> 'verify_by') is null then
      ca_issues := ca_issues || (ca_lbl || ': needs a verify-by date.');
    elsif coalesce(nullif(ca ->> 'due_date', ''), ca ->> 'target_date') is not null
      and (ca ->> 'verify_by')::date < coalesce(nullif(ca ->> 'due_date', ''), ca ->> 'target_date')::date then
      ca_issues := ca_issues || (ca_lbl || ': verify-by date is before the due date.');
    end if;
  end loop;
  items := items || public.inv_qg_item('G8', case when cardinality(ca_issues) = 0 then 'pass' else 'block' end,
    'Corrective actions have a real owner, dates and a verification plan',
    case when cardinality(ca_issues) = 0 then case when n = 0 then 'No open corrective actions to check.' else 'Every open CA has an owner email, dates that line up and a verification plan.' end
      else array_to_string(ca_issues, ' ') end,
    'stage:4:ca', to_jsonb(ca_issues));

  miss := array(select 'CA #' || (x ->> 'id') from jsonb_array_elements(cas) x where btrim(coalesce(x ->> 'root_cause_link', '')) = '');
  items := items || public.inv_qg_item('G9', case when cardinality(miss) = 0 then 'pass' else 'block' end,
    'Every corrective action fixes a named cause',
    case when cardinality(miss) = 0 then 'Every CA is linked to a cause.'
      else array_to_string(miss, ', ') || ': which finding does this fix? Link it so the report reads cause -> fix.' end,
    'stage:4:ca', to_jsonb(miss));

  -- G10 evidence minimum
  ca_issues := '{}';
  select count(*) into photo_n from public.investigation_evidence e
   where e.incident_id = any(fk) and coalesce(e.file_url, '') ~* '\.(jpe?g|png|webp|gif|heic)$';
  photo_n := photo_n + coalesce(jsonb_array_length(case when jsonb_typeof(j -> 'evidence') = 'array' then j -> 'evidence' end), 0)
                     + coalesce(jsonb_array_length(case when jsonb_typeof(j -> 'photo_urls') = 'array' then j -> 'photo_urls' end), 0);
  if photo_n = 0 then ca_issues := ca_issues || 'Add at least one photo.'::text; end if;
  if coalesce(p_inc.injury_occurred, false) or p_inc.osha_1904_classification is not null or 'chemical' = any(banks) then
    person := btrim(coalesce(nullif(btrim(j ->> 'injured_person_name'), ''), j ->> 'injured_name', ''));
    if array_length(regexp_split_to_array(person, '\s+'), 1) < 2 or person = '' then
      ca_issues := ca_issues || ('Person involved needs a full name (first and last)'
        || case when person <> '' then ', not just "' || person || '"' else '' end || '.');
    end if;
  end if;
  for r in select w.id,
                  btrim(coalesce(nullif(btrim(w.name), ''), w.witness_name, '')) nm,
                  btrim(concat_ws(' ', nullif(btrim(w.summary), ''), nullif(btrim(w.statement_summary), ''), nullif(btrim(w.what_witnessed), ''))) st
             from public.witness_statements w where w.incident_id = any(fk) order by w.id loop
    if r.nm = '' or lower(r.nm) in ('initial report', 'unknown', 'n/a') or array_length(regexp_split_to_array(r.nm, '\s+'), 1) < 2 then
      ca_issues := ca_issues || ('Witness #' || r.id || ' has no full name' || case when r.nm <> '' then ' ("' || r.nm || '")' else '' end || '. Edit or replace it with the person''s full name.');
    end if;
    if (array_length(regexp_split_to_array(btrim(r.st), '\s+'), 1) < 6 or r.st = '')
       and r.st !~* '(did not see|didn.t see|did not witness|didn.t witness)' then
      ca_issues := ca_issues || ('Witness #' || r.id || ' has no real statement' || case when r.st <> '' then ' ("' || left(r.st, 40) || '")' else '' end || '. Add 2-3 lines in their words, or mark them "present, did not see".');
    end if;
  end loop;
  items := items || public.inv_qg_item('G10', case when cardinality(ca_issues) = 0 then 'pass' else 'block' end,
    'Evidence minimum: photo, full names, real witness statements',
    case when cardinality(ca_issues) = 0 then 'Photo on file; names and statements complete.' else array_to_string(ca_issues, ' ') end,
    'stage:1:witness', to_jsonb(ca_issues));

  -- G11 1904 decision on injury / illness cases
  if coalesce(p_inc.injury_occurred, false) then
    items := items || public.inv_qg_item('G11', case when p_inc.osha_1904_classification is not null then 'pass' else 'block' end,
      'OSHA 1904 decision recorded',
      case when p_inc.osha_1904_classification is not null then '1904: ' || p_inc.osha_1904_classification || '.'
        else 'Record the OSHA 1904 decision (first aid / recordable / not work-related) before approval.' end,
      'stage:4:osha');
  end if;

  -- G12 chemical: product named, SDS attached, exposure response answered
  if 'chemical' = any(banks) then
    ca_issues := '{}';
    if length(public.inv_qg_txt(resp, 'C1')) < 10 then ca_issues := ca_issues || 'C1: name the exact product and concentration.'::text; end if;
    if not exists (select 1 from public.investigation_evidence e where e.incident_id = any(fk)
                    and concat_ws(' ', e.evidence_type, e.evidence_category, e.file_name, e.description) ~* '(\msds\M|safety data)') then
      ca_issues := ca_issues || 'Attach the SDS (evidence type or description "SDS"). Ethylene vs propylene glycol changes the severity rating.'::text;
    end if;
    if not public.inv_qg_answered(resp, 'C8') then ca_issues := ca_issues || 'C8: record the exposure response.'::text; end if;
    items := items || public.inv_qg_item('G12', case when cardinality(ca_issues) = 0 then 'pass' else 'block' end,
      'Chemical: product named, SDS attached, exposure response recorded',
      case when cardinality(ca_issues) = 0 then 'Product, SDS and exposure response on file.' else array_to_string(ca_issues, ' ') end,
      'stage:1:evidence', to_jsonb(ca_issues) || public.inv_qg_quote('C1', resp));
  end if;

  -- G14 late reporting (beyond the end of the shift)
  if is_late then
    items := items || public.inv_qg_item('G14',
      case when public.inv_qg_answered(resp, 'SC-RPT1') then 'pass' else 'block' end,
      'Late report explained',
      case when public.inv_qg_answered(resp, 'SC-RPT1') then 'SC-RPT1 explains the late report.'
        else 'This was reported about ' || round((late ->> 'hours')::numeric) || ' hours after it happened (shift ended ' || (late ->> 'shift_end')
          || ', reported ' || (late ->> 'reported') || '). Answer SC-RPT1: why late, and what will make it same-shift next time.' end,
      'stage:3:q:SC-RPT1', jsonb_build_array(late));
  end if;

  -- G16 lessons not published before approval
  if not approved then
    select count(*) into n from public.lessons_learned l where l.incident_id = p_inc.id and coalesce(l.is_published, false);
    items := items || public.inv_qg_item('G16', case when n = 0 then 'pass' else 'block' end,
      'Lessons Learned held until approval',
      case when n = 0 then 'No lesson is published before approval.'
        else n || ' lesson(s) already published. Lessons publish after approval so we don''t share a conclusion that might change. Use "Hold lessons until approval".' end,
      'stage:4:lessons');
  end if;

  -- G17 team lead + analysis done
  ca_issues := '{}';
  if coalesce(btrim(p_inc.team_leader_email), '') = '' then ca_issues := ca_issues || 'Assign a team lead (name and email). A second set of eyes is part of our standard.'::text; end if;
  if inv like '%local%' then
    if not exists (select 1 from public.local_reviews l where l.incident_id = any(fk)
                    and length(btrim(coalesce(to_jsonb(l) ->> 'what_happened', ''))) >= 20
                    and length(btrim(coalesce(to_jsonb(l) ->> 'immediate_causes', to_jsonb(l) ->> 'immediate_cause', ''))) >= 10) then
      ca_issues := ca_issues || 'Complete the Local Review (What Happened + Immediate Causes).'::text;
    end if;
  elsif inv like '%5%' or inv like '%why%' then
    if not exists (select 1 from public.five_why_analyses f where f.incident_id = any(fk)
                    and length(btrim(coalesce(to_jsonb(f) ->> 'root_cause', to_jsonb(f) ->> 'root_cause_identified', ''))) >= 10) then
      ca_issues := ca_issues || 'Complete the 5-Why (root cause).'::text;
    end if;
  else
    if not exists (select 1 from public.rca_factors f where f.incident_id = p_inc.id and f.is_factor)
       and length(btrim(coalesce(p_inc.root_cause_summary, ''))) < 10 then
      ca_issues := ca_issues || 'Complete the root cause analysis (at least one factor or a summary).'::text;
    end if;
  end if;
  items := items || public.inv_qg_item('G17', case when cardinality(ca_issues) = 0 then 'pass' else 'block' end,
    'Team lead assigned and analysis done',
    case when cardinality(ca_issues) = 0 then 'Team lead: ' || coalesce(nullif(btrim(p_inc.team_leader_name), ''), p_inc.team_leader_email) || '.' else array_to_string(ca_issues, ' ') end,
    'stage:1:setup', to_jsonb(ca_issues));

  -- overrides (Brian) and warn acknowledgements
  for it in select x from jsonb_array_elements(items) x loop
    if it ->> 'level' = 'block' then
      select o.reason, o.by_email, o.created_at into ov from public.inv_gate_overrides o
       where o.incident_uuid = p_inc.id and o.gate_key = it ->> 'key' and o.revoked_at is null
       order by o.created_at desc limit 1;
      if found then
        it := it || jsonb_build_object('level', 'overridden', 'override',
                jsonb_build_object('reason', ov.reason, 'by', ov.by_email, 'at', ov.created_at));
      end if;
    elsif it ->> 'level' = 'warn' then
      select a.reason, a.by_email, a.created_at into ack from public.inv_gate_warn_acks a
       where a.incident_uuid = p_inc.id and a.gate_key = it ->> 'key';
      if found then
        it := it || jsonb_build_object('level', 'acked', 'ack',
                jsonb_build_object('reason', ack.reason, 'by', ack.by_email, 'at', ack.created_at));
      end if;
    end if;
    if it ->> 'level' = 'block' then status_out := 'block';
    elsif it ->> 'level' = 'warn' and status_out = 'pass' then status_out := 'warn';
    end if;
    out_items := out_items || it;
  end loop;

  return jsonb_build_object(
    'status', status_out,
    'applies', applies,
    'guide_on', guide_on,
    'incident_uuid', p_inc.id,
    'incident_id', p_inc.incident_id,
    'triggered', to_jsonb(trig),
    'late', late,
    'block_count', (select count(*) from jsonb_array_elements(out_items) x where x ->> 'level' = 'block'),
    'warn_count', (select count(*) from jsonb_array_elements(out_items) x where x ->> 'level' = 'warn'),
    'items', out_items);
end $$;
revoke all on function public.inv_quality_gate_eval(public.incidents) from public, anon, authenticated;

-- By id: what the workbench, report page and edge function call.
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
  return public.inv_quality_gate_eval(inc);
end $$;
revoke all on function public.inv_quality_gate(uuid) from public, anon;
grant execute on function public.inv_quality_gate(uuid) to authenticated, service_role;

-- Codes only, for the Interview Guide (which SC- prompts to show).
create or replace function public.inv_triggered_prompts(p_incident uuid)
returns text[] language plpgsql stable security definer set search_path = public as $$
declare inc public.incidents; resp jsonb;
begin
  if auth.role() is distinct from 'service_role'
     and not (public.inv_is_investigator() or public.is_portal_staff() or public.inv_is_super_admin()) then
    return '{}';
  end if;
  select * into inc from public.incidents where id = p_incident;
  if not found then return '{}'; end if;
  select coalesce(jsonb_object_agg(question_code, jsonb_build_object(
           'c', to_jsonb(coalesce(answer_choice, '{}'::text[])), 't', coalesce(answer_text, ''),
           'na', not_applicable, 'nr', coalesce(na_reason, ''))), '{}'::jsonb)
    into resp from public.inv_question_responses where incident_uuid = p_incident and not is_confidential;
  return public.inv_qg_triggered(inc, resp, coalesce((public.inv_qg_late(inc) ->> 'late')::boolean, false));
end $$;
revoke all on function public.inv_triggered_prompts(uuid) from public, anon;
grant execute on function public.inv_triggered_prompts(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Actions: WARN reason (investigator), override (Brian only), hold lessons
-- ---------------------------------------------------------------------------
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
  return public.inv_quality_gate_eval(inc);
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
  return public.inv_quality_gate_eval(inc);
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
  return public.inv_quality_gate_eval(inc);
end $$;
revoke all on function public.inv_gate_override_revoke(uuid, text) from public, anon;
grant execute on function public.inv_gate_override_revoke(uuid, text) to authenticated;

create or replace function public.inv_hold_lessons(p_incident uuid)
returns integer language plpgsql volatile security definer set search_path = public as $$
declare me text := lower(coalesce(auth.jwt() ->> 'email', '')); n int; inc public.incidents;
begin
  if not (public.inv_is_investigator() or public.inv_is_super_admin()) then
    raise exception using errcode = '42501', message = 'Not authorized for investigations.';
  end if;
  select * into inc from public.incidents where id = p_incident;
  if not found then raise exception 'Investigation not found.'; end if;
  if inc.status in ('Approved', 'Closed') then return 0; end if;
  update public.lessons_learned set is_published = false, held_for_approval = true
   where incident_id = p_incident and coalesce(is_published, false);
  get diagnostics n = row_count;
  insert into public.investigation_activity_log (incident_id, incident_id_text, action, action_category, entity_type, entity_id, user_email, details)
  values (p_incident::text, inc.incident_id, 'Lessons held until approval', 'quality_gate', 'incident', p_incident::text, me,
          jsonb_build_object('held', n));
  return n;
end $$;
revoke all on function public.inv_hold_lessons(uuid) from public, anon;
grant execute on function public.inv_hold_lessons(uuid) to authenticated;

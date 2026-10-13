-- Custom dictionary for the investigation spelling gate.
-- Company-scoped, admin-managed. Additive. Do not apply from the app.
-- Service role only. No update or delete grants. No deletes.

create table if not exists public.inv_custom_dictionary (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.lms_companies (id),
  company_name text not null,
  word text not null,
  added_by_email text not null,
  created_at timestamptz not null default now(),
  constraint inv_custom_dictionary_word_chk check (
    char_length(word) <= 60
    and word ~ '^[A-Za-z0-9][A-Za-z0-9''’-]{0,59}$'
  )
);

create unique index if not exists inv_custom_dictionary_company_word_uidx
  on public.inv_custom_dictionary (lower(company_name), lower(word));

alter table public.inv_custom_dictionary enable row level security;

revoke all on table public.inv_custom_dictionary from public, anon, authenticated;
grant select, insert on table public.inv_custom_dictionary to service_role;

-- Seed Ched and Isaac for every LMS company, and for incident company names
-- that are not an LMS name or a sail_company_names spelling.
insert into public.inv_custom_dictionary (company_id, company_name, word, added_by_email)
select c.id, c.name, w.word, 'brian@slpalaska.com'
from public.lms_companies c
cross join (values ('Ched'), ('Isaac')) as w(word)
where not exists (
  select 1 from public.inv_custom_dictionary d
  where lower(d.company_name) = lower(c.name)
    and lower(d.word) = lower(w.word)
);

insert into public.inv_custom_dictionary (company_id, company_name, word, added_by_email)
select null, n.company_name, w.word, 'brian@slpalaska.com'
from (
  select distinct btrim(i.company_name) as company_name
  from public.incidents i
  where coalesce(btrim(i.company_name), '') <> ''
    and not exists (
      select 1 from public.lms_companies c
      where lower(c.name) = lower(btrim(i.company_name))
         or exists (
           select 1 from unnest(coalesce(c.sail_company_names, '{}'::text[])) s
           where lower(s) = lower(btrim(i.company_name))
         )
    )
) n
cross join (values ('Ched'), ('Isaac')) as w(word)
where not exists (
  select 1 from public.inv_custom_dictionary d
  where lower(d.company_name) = lower(n.company_name)
    and lower(d.word) = lower(w.word)
);

-- Keep the API and the SQL name list aligned once this migration is applied.
-- Names already on the investigation, plus LMS employees of the same company
-- (matched by company_id, company name, or sail_company_names).
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
      select j ->> k as v from unnest(array[
        'reported_by_name', 'reported_by', 'submitted_by', 'supervisor_name',
        'supervisor_title', 'injured_person_name', 'injured_name', 'injured_person_company', 'injured_company',
        'injured_person_position', 'injured_job_title', 'treating_physician', 'company_name', 'company',
        'location_name', 'location', 'specific_location_onsite', 'operation_type',
        'team_leader_name', 'team_leader_email', 'team_members_names', 'mentor_name',
        'external_investigator_name', 'final_approver_name', 'closed_by_name',
        'vehicle_id', 'vehicle_type', 'release_material']) k
      union all
      select to_jsonb(w) ->> k from public.witness_statements w,
        unnest(array['name', 'witness_name', 'position', 'position_role', 'company', 'job_title', 'other_witness_names', 'other_witnesses']) k
        where w.incident_id = any(fk)
      union all
      select to_jsonb(a) ->> k from public.investigation_corrective_actions a,
        unnest(array['owner', 'action_owner_name']) k
        where a.incident_id = any(fk)
      union all
      select u.full_name
      from public.lms_users u
      join public.lms_companies c on c.id = u.company_id
      where coalesce(btrim(u.full_name), '') <> ''
        and (
          c.id is not distinct from inc.company_id
          or lower(c.name) = lower(coalesce(inc.company_name, ''))
          or exists (
            select 1 from unnest(coalesce(c.sail_company_names, '{}'::text[])) s
            where lower(s) = lower(coalesce(inc.company_name, ''))
          )
        )
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

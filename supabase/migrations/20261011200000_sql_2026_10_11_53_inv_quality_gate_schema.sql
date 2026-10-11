-- SQL 2026-10-11-53 — Investigation Quality Gates (P0): schema + system-cause prompts.
-- SLP Safety Portal (iypezirwdlqpptjpeeyf). ADDITIVE ONLY: new tables, new
-- nullable/defaulted columns, new question rows. No drops, no deletes, no
-- rewrites of incident / CA / response rows. Idempotent: safe to re-run.
-- Spec: docs/investigation-quality-gates-SPEC.md (Brian Walden, Oct 11 2026).
--
-- Brian's decisions (Oct 11 2026):
--   * Scope: every investigation worked by an SLP investigator (list below) and
--     any company whose inv_feature_flags.quality_gate is on (all OFF today).
--   * Late report = reported after the end of the shift the incident happened on.
--   * Training-only root cause: WARN, or BLOCK when the answers show an obvious
--     alternative (knew the hazard, tool missing, rushing, faster).
--   * Only brian@slpalaska.com may override a BLOCK; every override is logged.

-- ---------------------------------------------------------------------------
-- 1. Scope: per-company switch + SLP investigator list
-- ---------------------------------------------------------------------------
alter table public.inv_feature_flags
  add column if not exists quality_gate boolean not null default false;

create table if not exists public.inv_quality_gate_investigators (
  email      text primary key check (email = lower(email)),
  active     boolean not null default true,
  added_by   text,
  added_at   timestamptz not null default now(),
  notes      text
);
alter table public.inv_quality_gate_investigators enable row level security;
revoke all on public.inv_quality_gate_investigators from anon, authenticated;
grant select, insert, update on public.inv_quality_gate_investigators to service_role;

-- SLP's own investigators (auth app_metadata.role = 'investigator' on Oct 11 2026).
insert into public.inv_quality_gate_investigators (email, added_by, notes)
select lower(u.email), 'SQL 53', 'SLP investigator (app_metadata.role = investigator)'
from auth.users u
where u.raw_app_meta_data ->> 'role' = 'investigator'
  and lower(u.email) like '%@slpalaska.com'
on conflict (email) do nothing;

-- ---------------------------------------------------------------------------
-- 2. Overrides (Brian only) and WARN acknowledgements (investigator reason)
-- ---------------------------------------------------------------------------
create table if not exists public.inv_gate_overrides (
  id            bigint generated always as identity primary key,
  incident_uuid uuid not null references public.incidents(id) on delete cascade,
  gate_key      text not null,
  reason        text not null check (length(btrim(reason)) >= 10),
  by_email      text not null,
  created_at    timestamptz not null default now(),
  revoked_at    timestamptz,
  revoked_by    text
);
create unique index if not exists inv_gate_overrides_one_active
  on public.inv_gate_overrides(incident_uuid, gate_key) where revoked_at is null;
alter table public.inv_gate_overrides enable row level security;
revoke all on public.inv_gate_overrides from anon, authenticated;
grant select, insert, update on public.inv_gate_overrides to service_role;

-- Belt and braces: whatever writes the row, only Brian's address is accepted.
create or replace function public.inv_gate_overrides_brian_only()
returns trigger language plpgsql set search_path = public as $$
begin
  if lower(coalesce(new.by_email, '')) <> 'brian@slpalaska.com' then
    raise exception using errcode = 'P0001',
      message = 'QUALITY_GATE: Only Brian Walden can override an investigation quality gate.';
  end if;
  return new;
end $$;
do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'inv_gate_overrides_brian_only'
                 and tgrelid = 'public.inv_gate_overrides'::regclass) then
    create trigger inv_gate_overrides_brian_only
      before insert or update on public.inv_gate_overrides
      for each row execute function public.inv_gate_overrides_brian_only();
  end if;
end $$;

create table if not exists public.inv_gate_warn_acks (
  id            bigint generated always as identity primary key,
  incident_uuid uuid not null references public.incidents(id) on delete cascade,
  gate_key      text not null,
  reason        text not null check (length(btrim(reason)) >= 10),
  by_email      text not null,
  created_at    timestamptz not null default now(),
  unique (incident_uuid, gate_key)
);
alter table public.inv_gate_warn_acks enable row level security;
revoke all on public.inv_gate_warn_acks from anon, authenticated;
grant select, insert, update on public.inv_gate_warn_acks to service_role;

-- Lessons held until the investigation is approved (G16).
alter table public.lessons_learned
  add column if not exists held_for_approval boolean not null default false;

-- ---------------------------------------------------------------------------
-- 3. System-cause prompts: a 'gate' flag + a bank that only shows the prompts
--    an incident triggers (the workbench asks inv_triggered_prompts()).
-- ---------------------------------------------------------------------------
alter table public.inv_question_bank
  add column if not exists gate boolean not null default false;

insert into public.inv_question_banks (code, label, kind, preferred_ca, sort)
values ('system_cause', 'System causes (required for this incident)', 'core',
        'Fix the condition that made the shortcut possible: tool at point of use, fill/level control, storage that hides the edge, same-shift reporting. Training is the backup layer.',
        5)
on conflict (code) do nothing;

insert into public.inv_question_bank (code, bank, audience, stage, prompt, help, answer_type, is_critical, gate, trigger, sort)
values
 ('SC-OVR1', 'system_cause', '{INV,IP,SUP}', 3,
  'Why was it possible to overfill / over-pressure / release in the first place?',
  'Fill method (jug, funnel, bulk), gauge or sight glass, cold-fill line, metered dispenser, auto shut-off, hot vs cold engine. Neither C2 nor C11 asks this.',
  'text', true, true,
  '{"banks":["chemical","spill_env"],"keywords":["overfill","over fill","over filled","overflow","topped off","too full","burp","drain off","siphon","spill","leaked"]}'::jsonb, 10),
 ('SC-OVR2', 'system_cause', '{INV,SUP}', 3,
  'Did the task need to be done at all (per the OEM / service procedure), or did one error create a second, riskier task?',
  'E.g. overfilled reservoir -> unplanned drain -> mouth siphon. The first error is usually where the fix is.',
  'text', true, true,
  '{"banks":["chemical","spill_env"],"keywords":["overfill","over fill","over filled","overflow","topped off","too full","burp","drain off","siphon","spill","leaked"]}'::jsonb, 20),
 ('SC-TOOL1', 'system_cause', '{INV,IP,SUP}', 3,
  'Where was the right tool, who had it, and why wasn''t it at the point of use?',
  'U6 / C4 record THAT it was missing. This asks where it was and why it was not where the work is.',
  'text', true, true,
  '{"chips":{"U6":["Available but not here","Damaged","Not stocked","Not owned","Wrong type"],"C4":["Not available","Too far","Broken"],"H3":["Not available"],"U4":["Right gear not here"]},"keywords":["couldn''t find","could not find","can''t find","cant find","missing","not here","borrowed","looking for"]}'::jsonb, 30),
 ('SC-TOOL2', 'system_cause', '{SUP,INV}', 3,
  'Who owns tool control / stocking for this location, and how would a missing tool get noticed before someone needs it?',
  'Name the role. A shadow board, check-out log or start-of-shift check are examples.',
  'text', true, true,
  '{"chips":{"U6":["Available but not here","Damaged","Not stocked","Not owned","Wrong type"],"C4":["Not available","Too far","Broken"],"H3":["Not available"],"U4":["Right gear not here"]},"keywords":["couldn''t find","could not find","can''t find","cant find","missing","not here","borrowed","looking for"]}'::jsonb, 40),
 ('SC-STORE1', 'system_cause', '{INV,SUP}', 3,
  'How is the item stored or staged, and does the storage expose the hazard (edges, spacing, covers, height, reach)?',
  'Look at the rack / shelf / pallet itself. Covers left on, spacing, bins and edge guards are physical fixes.',
  'text', true, true,
  '{"chips":{"H1":["Sharp edge/burr"]},"keywords":["shelf","shelves","rack","pallet","reaching","stored","storage"]}'::jsonb, 50),
 ('SC-RPT1', 'system_cause', '{INV,SUP}', 3,
  'Why was this reported when it was, and what will make it reported the same shift next time?',
  'Required because the report came in after the end of the shift the incident happened on.',
  'text', true, true,
  '{"late":true}'::jsonb, 60),
 ('SC-MED1', 'system_cause', '{INV,IP,SUP}', 3,
  'Was Poison Control (1-800-222-1222) or a medical provider contacted? If not, who decided that and on what basis?',
  'Name the product and the SDS first-aid section you relied on.',
  'text', true, true,
  '{"all_banks":["chemical"],"chips":{"C3":["Siphon by mouth"]},"keywords":["mouth","swallow","ingest","inhal","eye","splash","vapor","vapour","fume"]}'::jsonb, 70)
on conflict (code) do nothing;

-- U12 ("which defenses should have stopped this") is now required by G2.
update public.inv_question_bank set is_critical = true, updated_at = now()
 where code = 'U12' and not is_critical;

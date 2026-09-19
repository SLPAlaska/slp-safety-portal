-- Bridge lms_companies to the SAIL log, so one row says both who a company
-- admin is and which SAIL records belong to them.
--
-- WHY A COLUMN AND NOT A NAME MATCH
--
-- `lms_users.role` + `lms_users.company_id` is already the single source of
-- truth for who administers which company. What was missing is the join to
-- SAIL, because `sail_log.client_company` is free text typed on a field form,
-- not a foreign key.
--
-- Matching those two by name does not work and fails in the worst possible
-- direction. Of the 14 lms_companies, only 5 match a sail_log.client_company
-- string exactly:
--
--   lms_companies.name                 sail_log.client_company
--   ---------------------------------  -----------------------------
--   GBR Alaska                         GBR Equipment
--   Yellowjacket Oilfield Services     Yellowjacket
--   Apache Oil & Gas                   Apache Corp.
--
-- A name-matching bridge would hand GBR Alaska's admin an empty SAIL page with
-- no error, which reads as "we have no open items" rather than "the filter is
-- broken" - the same silent-wrong-answer failure the pagination rule in
-- CLAUDE.md exists to prevent. And if two companies ever shared a prefix, a
-- fuzzy match would leak across the tenant boundary instead.
--
-- So the correspondence is stated explicitly, once, here.
--
-- NULL AND EMPTY BOTH MEAN NO ACCESS. A company with no entry in this column
-- gets zero SAIL rows, never all of them. Companies below with no value are
-- ones where the correct SAIL string is genuinely unknown; guessing would be a
-- cross-tenant risk, so they stay closed until someone confirms the mapping.

alter table public.lms_companies
  add column if not exists sail_company_names text[];

comment on column public.lms_companies.sail_company_names is
  'Exact sail_log.client_company values belonging to this company. NULL or '
  'empty means this company sees no SAIL rows - never all of them. Add a value '
  'here when a field form starts writing a new spelling, or that company''s '
  'admins silently stop seeing their own records.';

-- Exact matches confirmed against live sail_log values.
update public.lms_companies set sail_company_names = array['AKE-Line']
  where name = 'AKE-Line' and sail_company_names is null;
update public.lms_companies set sail_company_names = array['MagTec Alaska']
  where name = 'MagTec Alaska' and sail_company_names is null;
update public.lms_companies set sail_company_names = array['Chosen Construction']
  where name = 'Chosen Construction' and sail_company_names is null;
update public.lms_companies set sail_company_names = array['Pollard Wireline']
  where name = 'Pollard Wireline' and sail_company_names is null;
update public.lms_companies set sail_company_names = array['Demo Energy Co']
  where name = 'Demo Energy Co' and sail_company_names is null;

-- Renames: the LMS and the field forms disagree on the spelling. These are the
-- rows a name match would have silently emptied.
update public.lms_companies set sail_company_names = array['GBR Equipment']
  where name = 'GBR Alaska' and sail_company_names is null;
update public.lms_companies set sail_company_names = array['Yellowjacket']
  where name = 'Yellowjacket Oilfield Services' and sail_company_names is null;

-- Present in the field forms' company list, no SAIL rows yet. Mapped now so
-- the first submission is visible to its own admins immediately.
update public.lms_companies set sail_company_names = array['Apache Corp.']
  where name = 'Apache Oil & Gas' and sail_company_names is null;
update public.lms_companies set sail_company_names = array['Harvest Midstream']
  where name = 'Harvest Midstream' and sail_company_names is null;
update public.lms_companies set sail_company_names = array['Ace Energy Services']
  where name = 'Ace Energy Services' and sail_company_names is null;
update public.lms_companies set sail_company_names = array['Merkes Builders']
  where name = 'Merkes Builders' and sail_company_names is null;

-- Deliberately left NULL (no SAIL access):
--   Raw Fab AK          - no corresponding entry in the field forms' list
--   Waste Connections   - no corresponding entry in the field forms' list
--   SLP Alaska          - the operator, not a tenant; its staff reach SAIL
--                         through portal_staff, not through a company scope
--
-- Also unmapped, in the other direction: sail_log holds rows for
-- 'A-C Electric' and 'Ridgeline Oilfield Services', which have no
-- lms_companies row at all. Those records are visible to SLP staff only, which
-- is correct until those companies are onboarded.

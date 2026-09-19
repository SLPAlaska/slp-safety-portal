-- Company name variants for SAIL tenant scoping.
--
-- Every spelling is written out in full. The match in
-- app/lib/companyAccess.js is `.in('client_company', names)`, which is exact
-- equality — there is no substring test, no ILIKE and no normalisation
-- anywhere in this path, and none should be added. A prefix or fuzzy match
-- would make 'GBR' collide with any future company whose name starts the same
-- way, and a tenant boundary is not a place for a near miss.
--
-- These SET the array rather than appending, so re-running produces exactly
-- this list and nothing accumulates invisibly.
--
-- ONE ADDITION BEYOND THE SUPPLIED LIST, flagged deliberately:
-- 'AKE- Line' (space after the hyphen) is the only real variant present
-- anywhere in the data — one row in toolbox_meeting_assessment. It was not on
-- the supplied list, and leaving it out would hide that record from AKE-Line's
-- own admins if it ever reaches sail_log. Remove this line if that is not
-- wanted.

update public.lms_companies
set sail_company_names = array[
  'GBR',
  'GBR AK',
  'GBR Alaska',
  'GBR Equipment'
]
where name = 'GBR Alaska';

update public.lms_companies
set sail_company_names = array[
  'AKE-Line',
  'AK-E Line',
  'AKE-Lineo',
  'AKELine',
  'AK-ELine',
  'AKE- Line'   -- found in the data; not on the supplied list
]
where name = 'AKE-Line';

update public.lms_companies
set sail_company_names = array[
  'MagTec',
  'MagTec Alaska',
  'MagTec Alaska LLC',
  'MagTec Alaska, LLC'
]
where name = 'MagTec Alaska';

update public.lms_companies
set sail_company_names = array[
  'Pollard',
  'Pollard Wireline',
  'Pollard Wireline LLC'
]
where name = 'Pollard Wireline';

-- Unchanged from the previous migration, restated so the full picture is in
-- one place: Chosen Construction, Demo Energy Co, Harvest Midstream,
-- Ace Energy Services, Merkes Builders and Apache Oil & Gas each map to their
-- single known spelling. Raw Fab AK, Waste Connections and SLP Alaska remain
-- unmapped and therefore see no SAIL rows.
--
-- Still belonging to no tenant, and so visible to SLP staff only:
--   'A-C Electric', 'Ridgeline Oilfield Services', 'ConocoPhillips',
--   'Santos', 'Hilcorp Alaska', 'Other'
-- These are operators or unonboarded companies with no lms_companies row.

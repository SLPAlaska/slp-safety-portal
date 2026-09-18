-- E-Line Safety Audit form revision (WP-2).
--
-- Additive only. Nothing is dropped or renamed: historical submissions keep
-- every column they were written with, and the retired checklist items simply
-- stop being written to. `client_export` and any future report renderer read
-- the old columns unchanged.
--
-- In particular `bop_installed` and `bop_tested` KEEP their names even though
-- the form now labels them "WLV installed correctly" and "WLV function tested".
-- Renaming them would orphan every audit submitted before today. The old
-- column -> new label mapping lives in app/lib/elineAuditLabels.js, which is
-- the single place a renderer should ask what to print.

alter table public.eline_safety_audits
  -- Replaces the retired "Lubricator pressure rating adequate" check. A new
  -- column rather than a reuse of `lubricator_pressure`, because the question
  -- is a different one: conflating them would make history unreadable.
  add column if not exists annual_lubricator_inspection text,

  -- Replaces the retired "Wind conditions acceptable" / "Weather conditions
  -- acceptable" OK/Deficient checks with one prose field.
  add column if not exists wind_weather_conditions text,

  -- Replaces the retired "Lighting adequate" check.
  add column if not exists lighting_equipment text,

  -- Replaces the retired "Muster point identified" Yes/No check.
  add column if not exists muster_point_location text;

-- Low/High pressure test PSI reuse the existing `low_test_pressure` and
-- `high_test_pressure` columns, which already carried the typed PSI value
-- alongside the now-removed Pass/Fail/N/A radios. Reusing them keeps the
-- historical readings queryable in one place. Their column type is
-- deliberately left alone: a blind `alter ... type numeric` would fail on any
-- non-castable value already stored. SafeSubmit's nullifyEmptyStrings turns a
-- blank entry into NULL, so an empty PSI box is safe against either type.

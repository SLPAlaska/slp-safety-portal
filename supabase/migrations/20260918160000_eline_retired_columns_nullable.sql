-- Make the retired E-Line columns nullable.
--
-- 20260918120000 added the new columns but missed this: all 32 checklist
-- items the revision removed from the form are NOT NULL in the table. The old
-- form always sent a value for every one of them, so nothing ever exercised
-- the constraint. The revised form does not send them at all, which means
-- every new submission would have failed with
--
--   23502 null value in column "crew_training" violates not-null constraint
--
-- and SafeSubmit would have routed each one to failed_submissions rather than
-- eline_safety_audits. A field crew would have seen "Submitted successfully"
-- while the audit went to the backup table.
--
-- The columns are KEPT, not dropped: historical submissions carry real values
-- in every one of them, and app/lib/elineAuditLabels.js still renders them
-- under RETIRED_LABELS. Only the constraint goes.

alter table public.eline_safety_audits
  alter column crew_training          drop not null,
  alter column well_control_cert      drop not null,
  alter column h2s_training           drop not null,
  alter column frc_worn               drop not null,
  alter column drum_cable             drop not null,
  alter column measuring_device       drop not null,
  alter column depth_counter          drop not null,
  alter column weak_point             drop not null,
  alter column cable_head             drop not null,
  alter column lubricator_pressure    drop not null,
  alter column grease_injection       drop not null,
  alter column stuffing_box           drop not null,
  alter column flow_tubes             drop not null,
  alter column bop_pressure           drop not null,
  alter column low_pressure_test      drop not null,
  alter column high_pressure_test     drop not null,
  alter column sheave_condition       drop not null,
  alter column gin_pole               drop not null,
  alter column guy_wires              drop not null,
  alter column floor_anchors          drop not null,
  alter column cable_insulation       drop not null,
  alter column control_panel          drop not null,
  alter column pressure_readings      drop not null,
  alter column flow_line              drop not null,
  alter column kill_line              drop not null,
  alter column wind_conditions        drop not null,
  alter column weather_conditions     drop not null,
  alter column lighting_adequate      drop not null,
  alter column muster_point           drop not null,
  alter column client_communication   drop not null,
  alter column job_approved           drop not null,
  alter column critical_issues        drop not null;

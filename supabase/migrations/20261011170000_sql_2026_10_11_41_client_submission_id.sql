-- SQL 2026-10-11 #41 — client_submission_id: idempotent form inserts
--
-- Every row the portal's SafeSubmit inserts now carries a UUID made on the
-- phone (client_submission_id). A UNIQUE index per form table means that
-- when the server saved a row but the phone never got the reply (weak LTE)
-- and the phone re-sends, the second insert is refused as a duplicate of the
-- SAME submission (23505) and the app treats it as "already in". No lost
-- forms, no double forms.
--
-- Additive only: one nullable column + one unique index per table. Existing
-- rows keep NULL (NULLs never collide). No deletes, no updates, no data
-- change, no policy change. Column is covered by the existing table-level
-- INSERT grants.
--
-- Rollback (if ever needed):
--   drop index if exists public.<table>_client_submission_id_key;
--   alter table public.<table> drop column if exists client_submission_id;

do $$
declare
  t text;
  tbls text[] := array['aed_inspections','aerial_lift_evaluations','bbs_observations','beam_clamp_inspections','camp_corrective_actions','chain_hoist_inspections','cold_weather_assessments','competent_person_inspections','crane_boom_evaluations','crane_inspections','critical_lift_plans','cse_permits','daily_activity_logs','dropped_object_audits','drops_calculations','eew_permits','ehs_field_evaluations','ei_permits','ei_worker_log','eline_safety_audits','emergency_drill_evaluations','excavation_permits','excavator_evaluations','eyewash_station_inspections','fall_protection_plans','field_environmental_audits','fire_extinguisher_inspections','first_aid_kit_inspections','flammable_storage_audits','fluid_transfer_audits','forklift_evaluations','forklift_inspections','good_catch_near_miss','harness_inspections','hazard_id_reports','heavy_equipment_inspections','hot_work_permits','incidents','journey_management','ladder_inspections','lanyard_srl_inspections','loader_evaluations','location_audit_reports','lsr_confined_space_audits','lsr_driving_audits','lsr_energy_isolation_audits','lsr_fall_protection_audits','lsr_lifting_operations_audits','lsr_line_of_fire_audits','lsr_work_permits_audits','management_of_change','mbwa','opening_blinding_permits','phase_condition_risk_assessment','plate_clamp_inspections','ppe_inspections','pressure_crosscheck','property_damage_reports','risk_control_conversation','safety_meetings','sail_log','scaffold_inspections','shackle_inspections','slickline_safety_audit','spill_kit_inspections','sse_evaluations','stop_take_5','surface_condition_audit','swppp_inspection','synthetic_sling_inspections','task_crew_audit','tha_assessments','tha_crew_signoff','tha_task_steps','toolbox_meeting_assessment','unit_work_crew_log','unit_work_permits','vehicle_inspections','weekly_tank_inspections','welding_fab_shop_audit','welding_grinding_audit','wire_rope_inspections','witness_statements'];
begin
  foreach t in array tbls loop
    if to_regclass('public.' || t) is null then
      raise notice 'skip % (no such table)', t;
      continue;
    end if;
    execute format('alter table public.%I add column if not exists client_submission_id uuid', t);
    execute format('create unique index if not exists %I on public.%I (client_submission_id)', t || '_client_submission_id_key', t);
    execute format('comment on column public.%I.client_submission_id is %L', t,
      'UUID made on the phone by SafeSubmit; unique so an offline/lost-reply retry can never double-insert.');
  end loop;
end
$$;

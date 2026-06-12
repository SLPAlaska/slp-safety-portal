import { createClient } from '@supabase/supabase-js';

/**
 * /api/closeout — server-validated close-out for no-login field workflows.
 *
 * Field crews close permits without accounts: they present the record's
 * close-out code (issued at creation, stored in record_keys). The server
 * verifies the code and applies ONLY the explicitly allowed columns.
 * Everything else about the record is immutable from the outside.
 *
 * Runs with the service role (bypasses RLS), so anonymous UPDATE policies
 * can be removed from these tables once each form is migrated.
 */

const ALLOW = {
  hot_work_permits: {
    idCol: 'permit_number',
    cols: ['permit_status', 'job_completed', 'work_area_secured', 'systems_returned', 'safety_defeated_log', 'fire_watch_completed', 'time_permit_closed', 'close_out_worker', 'close_out_operator', 'closed_at']
  },
  cse_permits: {
    idCol: 'permit_number',
    cols: ['all_entrants_exited', 'space_secured', 'equipment_retrieved', 'ventilation_secured', 'time_permit_closed', 'close_out_entry_supervisor', 'close_out_attendant', 'closed_at']
  },
  eew_permits: {
    idCol: 'permit_number',
    cols: ['work_completed', 'area_secured', 'equipment_restored', 'barricades_removed', 'time_permit_closed', 'close_out_worker', 'close_out_supervisor', 'closed_at']
  },
  ei_permits: {
    idCol: 'permit_number',
    cols: ['all_workers_signed_out', 'personal_locks_removed', 'device_locks_removed', 'tags_removed_matched', 'equipment_clear', 'safe_to_reenergize', 'time_permit_closed', 'close_out_by', 'closed_at']
  },
  ei_worker_log: {
    idCol: 'id',
    cols: ['sign_out_time'],
    codeTable: 'ei_permits'
  },
  excavation_permits: {
    idCol: 'permit_number',
    cols: ['job_completed', 'excavation_backfilled', 'area_restored', 'utilities_verified', 'time_permit_closed', 'close_out_worker', 'close_out_supervisor', 'closed_at']
  },
  opening_blinding_permits: {
    idCol: 'permit_number',
    cols: ['line_restored', 'blinds_removed', 'system_pressure_tested', 'leak_check_performed', 'time_permit_closed', 'close_out_operator', 'close_out_supervisor', 'closed_at']
  },
  unit_work_permits: {
    idCol: 'permit_number',
    cols: ['job_completed', 'work_area_secured', 'bypassed_systems_restored', 'dsd_log_updated', 'time_permit_closed', 'close_out_by', 'area_operator_close_out', 'closed_at']
  },
  camp_inspections: {
    idCol: 'id',
    cols: ['status', 'submitted_at', 'submitted_by_email', 'go_no_go', 'general_notes', 'overall_findings', 'total_questions', 'compliant_count', 'non_compliant_count', 'needs_action_count', 'na_count', 'not_verified_count', 'critical_findings_count', 'compliance_percent']
  },
  camp_inspection_responses: {
    idCol: 'inspection_id',
    cols: ['inspection_id', 'question_id', 'section', 'section_order', 'subsection', 'question_text', 'criticality', 'response', 'comment', 'photo_urls'],
    codeTable: 'camp_inspections',
    mode: 'upsert',
    onConflict: 'inspection_id,question_id'
  },
  tha_assessments: {
    idCol: 'tha_number',
    cols: ['status', 'scope_changed', 'tha_updated_if_changed', 'client_rep_visited', 'hse_visited', 'job_stopped', 'housekeeping_complete', 'all_permits_closed', 'info_passed_to_oncoming', 'aar_went_well', 'aar_didnt_go_as_planned', 'aar_how_improve', 'lessons_learned', 'crew_comments', 'closed_by', 'closed_at', 'last_modified']
  },
  incidents: {
    idCol: 'id',
    cols: ['brief_description', 'causal_factors', 'company_name', 'containment_method', 'created_by_email', 'date_of_hire', 'date_shift_began', 'decs_present', 'detailed_description', 'direct_control_status', 'energy_release_occurred', 'energy_types', 'energy_types_text', 'environmental_release', 'environmental_severity', 'evidence_count', 'gps_latitude', 'gps_longitude', 'high_energy_present', 'immediate_actions_taken', 'incident_date', 'incident_time', 'incident_types', 'incident_types_text', 'injured_body_parts', 'injured_person_company', 'injured_person_name', 'injured_person_position', 'injured_person_work_phone', 'injury_nature', 'injury_occurred', 'investigation_deadline', 'investigation_deadline_reason', 'investigation_type', 'is_pse', 'is_sif', 'is_sif_p', 'jsa_permit_prepared', 'lessons_learned_initial', 'location_name', 'mentor_name', 'operation_type', 'other_vehicle_involved', 'physician_phone', 'potential_safety_severity', 'property_damage', 'property_damage_cost', 'property_damage_description', 'ps_tier', 'pse_type', 'psif_classification', 'release_location_type', 'release_material', 'release_volume', 'release_volume_unit', 'reported_by_email', 'reported_by_name', 'reported_by_phone', 'risk_ranking', 'rotation_length', 'safety_severity', 'safety_severity_description', 'scene_preservation_level', 'short_service_employee', 'specific_location_onsite', 'spill_contained', 'status', 'stky_event', 'supervisor_contact', 'supervisor_name', 'supervisor_title', 'suspected_root_causes', 'temperature', 'timeline_developed', 'timeline_event_count', 'treating_physician', 'treatment_provided', 'updated_at', 'vehicle_damage_description', 'vehicle_id', 'vehicle_incident', 'vehicle_type', 'wind_speed', 'witness_count', 'witness_statement_summary']
  }
};

export async function POST(req) {
  try {
    const { table, id, code, updates, codeId, mode } = await req.json();

    const cfg = ALLOW[table];
    if (!cfg) {
      return Response.json({ error: 'Unsupported table.' }, { status: 400 });
    }
    if (!id || !code || !updates || typeof updates !== 'object') {
      return Response.json({ error: 'Missing id, code, or updates.' }, { status: 400 });
    }

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://iypezirwdlqpptjpeeyf.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 1) Validate the claim ticket
    const { data: key, error: keyErr } = await admin
      .from('record_keys')
      .select('code')
      .eq('table_name', cfg.codeTable || table)
      .eq('record_id', String(codeId || id))
      .maybeSingle();

    if (keyErr) {
      return Response.json({ error: 'Code lookup failed: ' + keyErr.message }, { status: 500 });
    }
    if (!key || key.code !== String(code).trim().toUpperCase()) {
      return Response.json(
        { error: 'Invalid close-out code for this record. Check the code on the permit receipt.' },
        { status: 403 }
      );
    }

    // 2) Strip anything not on the allowed-columns list
    const clean = {};
    for (const k of Object.keys(updates)) {
      if (cfg.cols.includes(k)) clean[k] = updates[k];
    }
    if (Object.keys(clean).length === 0) {
      return Response.json({ error: 'No permitted fields in update.' }, { status: 400 });
    }

    // 3) Apply
    let updErr = null;
    let updatedRow = null;
    if (cfg.mode === 'upsert' && mode === 'upsert') {
      clean[cfg.idCol] = id; // pin to the code-validated record
      ({ error: updErr } = await admin.from(table).upsert([clean], { onConflict: cfg.onConflict }));
    } else {
      const upd = await admin.from(table).update(clean).eq(cfg.idCol, id).select().maybeSingle();
      updErr = upd.error;
      updatedRow = upd.data || null;
    }
    if (updErr) {
      return Response.json({ error: updErr.message }, { status: 500 });
    }

    return Response.json({ ok: true, row: updatedRow });
  } catch (e) {
    return Response.json({ error: e?.message || 'Unexpected error.' }, { status: 500 });
  }
}

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
    if (cfg.mode === 'upsert' && mode === 'upsert') {
      clean[cfg.idCol] = id; // pin to the code-validated record
      ({ error: updErr } = await admin.from(table).upsert([clean], { onConflict: cfg.onConflict }));
    } else {
      ({ error: updErr } = await admin.from(table).update(clean).eq(cfg.idCol, id));
    }
    if (updErr) {
      return Response.json({ error: updErr.message }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e?.message || 'Unexpected error.' }, { status: 500 });
  }
}

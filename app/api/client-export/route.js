import { createClient } from '@supabase/supabase-js';

// Server-side only. Uses the service-role key, which bypasses RLS.
// The service-role key is NEVER exposed to the browser - it lives only in this
// server route via the SUPABASE_SERVICE_ROLE_KEY environment variable.
const supabaseAdmin = createClient(
  'https://iypezirwdlqpptjpeeyf.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const COMPANY_CREDENTIALS = {
  'MAGTEC2026': { company: 'MagTec Alaska', searchTerms: ['MagTec', 'Mag Tec', 'MagTec Alaska'], password: 'PSA2026$$SLP' },
  'POLLARD2026': { company: 'Pollard Wireline', searchTerms: ['Pollard', 'Pollard Wireline'], password: 'PSA2026$$SLP' },
  'AKELINE2026': { company: 'AKE-Line', searchTerms: ['AKE-Line', 'AKE Line', 'AKELINE'], password: 'PSA2026$$SLP' },
  'GBR2026': { company: 'GBR Equipment', searchTerms: ['GBR', 'GBR Equipment'], password: 'PSA2026$$SLP' },
  'CHOSEN2026': { company: 'Chosen Construction', searchTerms: ['Chosen', 'Chosen Construction'], password: 'PSA2026$$SLP' },
  'YELLOWJACKET2026': { company: 'Yellowjacket', searchTerms: ['Yellowjacket', 'Yellow Jacket'], password: 'PSA2026$$SLP' },
  'PENINSULA2026': { company: 'Peninsula Paving', searchTerms: ['Peninsula', 'Peninsula Paving'], password: 'PSA2026$$SLP' },
  'CINGSA2026': { company: 'CINGSA', searchTerms: ['CINGSA'], password: 'PSA2026$$SLP' },
  'NARWHAL2026': { company: 'Narwhal Exploration', searchTerms: ['Narwhal', 'Narwhal Exploration'], password: 'PSA2026$$SLP' },
  'HARVEST2026': { company: 'Harvest Midstream', searchTerms: ['Harvest Midstream', 'Harvest'], password: 'PSA2026$$SLP' },
  'APACHE2026': { company: 'Apache Corp.', searchTerms: ['Apache Corp.', 'Apache Corp', 'Apache', 'Apache Corporation'], password: 'PSA2026$$SLP' },
};

// Tables that use a non-default company column name
const COMPANY_COLUMN_MAP = {
  'bbs_observations': 'client_company',
  'pressure_crosscheck': 'client_company',
  'sail_log': 'client_company',
  'toolbox_meeting_assessment': 'client',
  'incidents': 'company_name',
  'lessons_learned': 'company_name',
  'management_of_change': 'company'
};

// Tables merged into a single logical form (portal + legacy)
const MERGE_TABLES = {
  'tha_submissions': {
    extra: ['tha_assessments'],
    labels: { 'tha_submissions': 'Portal', 'tha_assessments': 'Legacy Jotform' }
  }
};

// Allowlist: the ONLY tables this endpoint may read. Anything not here is rejected,
// so the route can never be coerced into reading arbitrary tables.
const ALLOWED_TABLES = new Set([
  'aed_inspections',
  'aerial_lift_evaluations',
  'bbs_observations',
  'camp_inspections',
  'chain_hoist_inspections',
  'cold_weather_assessments',
  'competent_person_inspections',
  'crane_boom_evaluations',
  'crane_inspections',
  'critical_lift_plans',
  'cse_permits',
  'dropped_object_audits',
  'eew_permits',
  'ehs_field_evaluations',
  'ei_permits',
  'eline_safety_audits',
  'emergency_drill_evaluations',
  'excavation_permits',
  'excavator_evaluations',
  'eyewash_station_inspections',
  'fall_protection_plans',
  'field_environmental_audits',
  'fire_extinguisher_inspections',
  'first_aid_kit_inspections',
  'flammable_storage_audits',
  'fluid_transfer_audits',
  'forklift_evaluations',
  'forklift_inspections',
  'good_catch_near_miss',
  'harness_inspections',
  'hazard_id_reports',
  'heavy_equipment_inspections',
  'hot_work_permits',
  'incidents',
  'investigation_corrective_actions',
  'journey_management',
  'ladder_inspections',
  'lanyard_srl_inspections',
  'lessons_learned',
  'loader_evaluations',
  'location_audit_reports',
  'lsr_confined_space_audits',
  'lsr_driving_audits',
  'lsr_energy_isolation_audits',
  'lsr_fall_protection_audits',
  'lsr_lifting_operations_audits',
  'lsr_line_of_fire_audits',
  'lsr_work_permits_audits',
  'management_of_change',
  'manager_hse_daily_logs',
  'mbwa',
  'opening_blinding_permits',
  'phase_condition_risk_assessment',
  'ppe_inspections',
  'pressure_crosscheck',
  'property_damage_reports',
  'risk_control_conversations',
  'safety_meetings',
  'sail_log',
  'scaffold_inspections',
  'shackle_inspections',
  'slickline_safety_audits',
  'spill_kit_inspections',
  'sse_evaluations',
  'surface_condition_audits',
  'swppp_inspection',
  'synthetic_sling_inspections',
  'task_crew_audits',
  'tha_submissions',
  'toolbox_meeting_assessment',
  'unit_work_permits',
  'vehicle_inspections',
  'weekly_tank_inspections',
  'welding_fab_shop_audits',
  'welding_grinding_audits',
  'wire_rope_inspections',
  'witness_statements'
]);

// Query one table for a company + date range, unioning one query per search term
// (avoids PostgREST .or() comma-join fragility) and deduping by id.
async function queryTable(table, searchTerms, start, end) {
  const companyCol = Object.prototype.hasOwnProperty.call(COMPANY_COLUMN_MAP, table)
    ? COMPANY_COLUMN_MAP[table] : 'company';

  if (!companyCol || !searchTerms || searchTerms.length === 0) {
    return await supabaseAdmin.from(table).select('*')
      .gte('created_at', start).lte('created_at', end)
      .order('created_at', { ascending: false });
  }

  const byId = new Map();
  let lastError = null;
  let missingColumn = false;
  for (const term of searchTerms) {
    const { data, error } = await supabaseAdmin.from(table).select('*')
      .gte('created_at', start).lte('created_at', end)
      .ilike(companyCol, `%${term}%`)
      .order('created_at', { ascending: false });
    if (error) {
      lastError = error;
      // Postgres 42703 = undefined_column. This table has no company column to
      // filter on (e.g. a child table of incidents). Stop trying to filter it.
      if (error.code === '42703' || /column .* does not exist/i.test(error.message || '')) {
        missingColumn = true;
        break;
      }
    } else if (data) {
      data.forEach(row => byId.set(row.id, row));
    }
  }

  // If the table simply has no company column, return empty rather than erroring.
  // (Company-less child tables aren't meaningfully client-scoped exports.)
  if (missingColumn) {
    return { data: [], error: null };
  }

  const merged = [...byId.values()].sort((a, b) =>
    new Date(b.created_at || 0) - new Date(a.created_at || 0));
  if (merged.length === 0 && lastError) return { data: null, error: lastError };
  return { data: merged, error: null };
}

export async function POST(request) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return Response.json({ error: 'Server not configured (missing service role key).' }, { status: 500 });
    }

    const body = await request.json();
    const { code, password, tables, start, end } = body || {};

    // --- Auth: verify the credential code + password server-side ---
    const cred = code ? COMPANY_CREDENTIALS[String(code).toUpperCase()] : null;
    if (!cred || cred.password !== password) {
      return Response.json({ error: 'Invalid credentials.' }, { status: 401 });
    }

    if (!Array.isArray(tables) || tables.length === 0) {
      return Response.json({ error: 'No tables requested.' }, { status: 400 });
    }
    if (!start || !end) {
      return Response.json({ error: 'Missing date range.' }, { status: 400 });
    }

    const searchTerms = cred.searchTerms;
    const results = {};

    for (const primary of tables) {
      // Only allow known form tables
      if (!ALLOWED_TABLES.has(primary)) continue;

      const mergeCfg = MERGE_TABLES[primary];
      const toQuery = mergeCfg ? [primary, ...mergeCfg.extra] : [primary];

      let combined = [];
      let tableError = null;
      for (const t of toQuery) {
        if (!ALLOWED_TABLES.has(t)) continue;
        const { data, error } = await queryTable(t, searchTerms, start, end);
        if (error) {
          tableError = (tableError ? tableError + '; ' : '') + t + ': ' + error.message;
        } else if (data && data.length > 0) {
          const label = mergeCfg ? (mergeCfg.labels[t] || t) : null;
          const tagged = label ? data.map(row => ({ source_system: label, ...row })) : data;
          combined = combined.concat(tagged);
        }
      }
      results[primary] = { rows: combined, error: tableError };
    }

    return Response.json({ company: cred.company, results });
  } catch (err) {
    return Response.json({ error: err.message || 'Export failed.' }, { status: 500 });
  }
}

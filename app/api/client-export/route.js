import { createClient } from '@supabase/supabase-js';
import { createHash, timingSafeEqual } from 'crypto';

// Server-side only. Uses the service-role key, which bypasses RLS.
// The service-role key is NEVER exposed to the browser - it lives only in this
// server route via the SUPABASE_SERVICE_ROLE_KEY environment variable.
// Created lazily so the service-role key is only required at request time, not
// at module load (which would break `next build`'s page-data collection).
let _supabaseAdmin = null;
function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(
      'https://iypezirwdlqpptjpeeyf.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
  }
  return _supabaseAdmin;
}

/**
 * Constant-time secret comparison.
 *
 * Both sides are hashed first so the buffers are always 32 bytes:
 * timingSafeEqual throws on a length mismatch, and letting it throw would
 * itself leak the length of the expected secret.
 */
function secretMatches(presented, expected) {
  if (typeof presented !== 'string' || typeof expected !== 'string') return false;
  const a = createHash('sha256').update(presented).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

/**
 * Decide whose data this request may read.
 *
 * THE RULE: the tenant comes from the SECRET, never from the code string in
 * the request body. Before 2026-09-18 the code selected the tenant and the
 * secret was only checked against that same entry, so with one password shared
 * by all 11 clients, editing MAGTEC2026 to POLLARD2026 read another tenant.
 *
 * Returns { tenant, enforced } or { error: { status, message } }.
 *
 * `enforced: false` marks the pre-cutover path and is NOT a safe state - see
 * the shared-secret branch below.
 */
function resolveCredential(entries, presentedCode, presentedSecret) {
  // Compare against every entry with no early exit, so the time taken does not
  // reveal how far down the list a match sat.
  const matches = [];
  for (const e of entries) {
    if (secretMatches(presentedSecret, e.secret)) matches.push(e);
  }
  if (matches.length === 0) {
    return { error: { status: 401, message: 'Invalid credentials.' } };
  }

  const tenants = new Set(matches.map(m => m.tenant));

  if (tenants.size === 1) {
    // The secret belongs to exactly one tenant, so it identifies the caller.
    // That tenant is the answer regardless of what the body asked for.
    const tenant = matches[0].tenant;
    if (presentedCode && !matches.some(m => m.code === presentedCode)) {
      // Authenticated, but as somebody else. This is the case the whole change
      // exists for: AKE-Line's secret presented with MagTec's code.
      console.warn(
        '[client-export] credential for tenant=%s presented with code=%s - refused.',
        tenant, presentedCode);
      return { error: { status: 403, message: 'That credential is not valid for the requested company.' } };
    }
    return { tenant, enforced: true };
  }

  // The secret maps to more than one tenant, so it cannot say who is calling.
  //
  // Two tenants sharing a secret by accident is a configuration error and is
  // refused. The ONE case allowed through is the pre-2026-09-18 password,
  // which every client holds and which is explicitly marked shared:true in
  // CLIENT_EXPORT_CREDENTIALS. For it the code string still picks the tenant,
  // exactly as before - meaning any holder can still read any tenant.
  //
  // That hole closes when each client has a distinct secret and the shared
  // entries are removed from the env var. No code change is needed for the
  // cutover: drop the shared:true rows and this branch stops being reachable.
  if (!matches.every(m => m.shared)) {
    console.error(
      '[client-export] one secret maps to several tenants (%s) without shared:true - refusing.',
      [...tenants].join(', '));
    return { error: { status: 403, message: 'That credential is not valid for the requested company.' } };
  }
  if (!presentedCode) {
    return { error: { status: 401, message: 'Invalid credentials.' } };
  }
  const entry = matches.find(m => m.code === presentedCode);
  if (!entry) {
    return { error: { status: 401, message: 'Invalid credentials.' } };
  }
  console.warn(
    '[client-export] SHARED credential used for tenant=%s (code=%s). This secret ' +
    'is held by %d tenants and cannot identify the caller: any holder can read ' +
    'any of them. Rotate to per-client secrets to close this.',
    entry.tenant, entry.code, tenants.size);
  return { tenant: entry.tenant, enforced: false };
}

// ── Tenant catalogue (NOT secret) ────────────────────────────────────
//
// Display name and the name fragments each tenant's rows are matched on.
// Deliberately NOT in an environment variable: changing what a tenant can see
// is a decision that belongs in code review, not in a dashboard text box.
const TENANTS = {
  magtec:       { company: 'MagTec Alaska',       searchTerms: ['MagTec', 'Mag Tec', 'MagTec Alaska'] },
  pollard:      { company: 'Pollard Wireline',    searchTerms: ['Pollard', 'Pollard Wireline'] },
  akeline:      { company: 'AKE-Line',            searchTerms: ['AKE-Line', 'AKE Line', 'AKELINE'] },
  gbr:          { company: 'GBR Equipment',       searchTerms: ['GBR', 'GBR Equipment'] },
  chosen:       { company: 'Chosen Construction', searchTerms: ['Chosen', 'Chosen Construction'] },
  yellowjacket: { company: 'Yellowjacket',        searchTerms: ['Yellowjacket', 'Yellow Jacket'] },
  peninsula:    { company: 'Peninsula Paving',    searchTerms: ['Peninsula', 'Peninsula Paving'] },
  cingsa:       { company: 'CINGSA',              searchTerms: ['CINGSA'] },
  narwhal:      { company: 'Narwhal Exploration', searchTerms: ['Narwhal', 'Narwhal Exploration'] },
  harvest:      { company: 'Harvest Midstream',   searchTerms: ['Harvest Midstream', 'Harvest'] },
  apache:       { company: 'Apache Corp.',        searchTerms: ['Apache Corp.', 'Apache Corp', 'Apache', 'Apache Corporation'] },
};

// ── Client credentials (SECRET) ─────────────────────────────────────
//
// The access codes and their secrets live in CLIENT_EXPORT_CREDENTIALS, never
// in this file. Until 2026-09-18 all 11 were hardcoded here, which put live
// client credentials into git history -- the same class of problem as the
// RESEND_API_KEY fix, and the same remedy.
//
// Shape: a JSON array, so one tenant can hold two credentials at once while a
// rotation is in flight.
//
//   [{"code":"EXAMPLE2026","tenant":"example","secret":"...","shared":true}]
//
//   code    what the client types into the export page
//   tenant  key into TENANTS above -- decides whose rows come back
//   secret  the password for that code
//   shared  true ONLY for a secret knowingly used by more than one tenant.
//           The pre-2026-09-18 password is one such: all 11 clients hold the
//           same string, so it cannot identify who is calling.
//
// Read at request time rather than module load, so `next build`'s page-data
// collection does not need the value.
function loadCredentials() {
  const raw = process.env.CLIENT_EXPORT_CREDENTIALS;
  if (!raw) return { entries: null, error: 'CLIENT_EXPORT_CREDENTIALS is not set.' };

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return { entries: null, error: 'CLIENT_EXPORT_CREDENTIALS is not valid JSON.' };
  }
  if (!Array.isArray(parsed)) {
    return { entries: null, error: 'CLIENT_EXPORT_CREDENTIALS must be a JSON array.' };
  }

  const entries = [];
  for (const row of parsed) {
    if (!row || typeof row !== 'object') continue;
    const code = typeof row.code === 'string' ? row.code.trim().toUpperCase() : '';
    const tenant = typeof row.tenant === 'string' ? row.tenant.trim() : '';
    const secret = typeof row.secret === 'string' ? row.secret : '';
    // An entry naming a tenant this build does not know about is dropped
    // rather than guessed at: a typo must not silently widen who can call.
    if (!code || !secret || !TENANTS[tenant]) continue;
    entries.push({ code, tenant, secret, shared: row.shared === true });
  }

  if (entries.length === 0) {
    return { entries: null, error: 'CLIENT_EXPORT_CREDENTIALS holds no usable entries.' };
  }
  return { entries, error: null };
}

// Tables that use a non-default company column name
const COMPANY_COLUMN_MAP = {
  'bbs_observations': 'client_company',
  'pressure_crosscheck': 'client_company',
  'sail_log': 'client_company',
  'toolbox_meeting_assessment': 'client',
  'incidents': 'company_name',
  'lessons_learned': 'company_name',
  'management_of_change': 'company',
  'slickline_safety_audit': 'client_company',
  'risk_control_conversation': 'client_company'
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
  'slickline_safety_audit',
  'task_crew_audit',
  'welding_fab_shop_audit',
  'welding_grinding_audit',
  'surface_condition_audit',
  'risk_control_conversation',
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
  const supabaseAdmin = getSupabaseAdmin();
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

    const { entries, error: credError } = loadCredentials();
    if (!entries) {
      // Fail closed: no credential config means nobody gets an export, rather
      // than everybody.
      console.error('client-export credential config unusable:', credError);
      return Response.json({ error: 'Server not configured (client credentials).' }, { status: 500 });
    }

    const body = await request.json();
    const { code, password, tables, start, end, verify } = body || {};

    // --- Auth: the SECRET decides whose data comes back, not the code ---
    const presentedCode = typeof code === 'string' ? code.trim().toUpperCase() : '';
    const resolved = resolveCredential(entries, presentedCode, password);
    if (resolved.error) {
      return Response.json({ error: resolved.error.message }, { status: resolved.error.status });
    }
    const cred = TENANTS[resolved.tenant];

    // Credential check only, for the export page's sign-in step. Returns who
    // the caller is and nothing else, so the page never needs a copy of the
    // credentials to check them against.
    if (verify === true) {
      return Response.json({ company: cred.company });
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

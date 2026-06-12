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
    cols: [
      'permit_status', 'job_completed', 'work_area_secured', 'systems_returned',
      'safety_defeated_log', 'fire_watch_completed', 'time_permit_closed',
      'close_out_worker', 'close_out_operator', 'closed_at'
    ]
  }
  // Additional permit/camp/THA tables are added here as each form is migrated.
};

export async function POST(req) {
  try {
    const { table, id, code, updates } = await req.json();

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
      .eq('table_name', table)
      .eq('record_id', String(id))
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
    const { error: updErr } = await admin.from(table).update(clean).eq(cfg.idCol, id);
    if (updErr) {
      return Response.json({ error: updErr.message }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e?.message || 'Unexpected error.' }, { status: 500 });
  }
}

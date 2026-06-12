// ============================================================================
// app/api/field-data/route.js  (PORTAL repo)
//
// Server-side, minimal-field reads for login-free field workflows.
// Replaces anonymous database SELECT access: the browser can no longer read
// tables directly — it asks this route for NAMED VIEWS that return only the
// fields each picker/lookup actually needs.
//
// Views (all service-role on the server):
//   open_permits   &table=<permit table>   → open-permit picker rows
//   ei_workers     &permit=<permit_number> → signed-in workers on an EI permit
//   open_thas                              → open-THA picker rows
//   tha_detail     &tha=<tha_number>       → one THA + steps + crew (sign-on view)
//   recent_check   &table=<insp>&id=<eqId> → 30-day duplicate-inspection check
//   camp_responses &inspection=&code=      → response ids (code-validated)
//
// No view returns close-out codes, and no view allows arbitrary tables,
// columns, or filters.
// ============================================================================
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://iypezirwdlqpptjpeeyf.supabase.co';

const PERMIT_VIEWS = {
  hot_work_permits:        'permit_number, location, work_description, created_at',
  cse_permits:             'permit_number, location, permit_initiator, space_id, created_at',
  eew_permits:             'permit_number, location, equipment_id, nominal_voltage, created_at',
  ei_permits:              'permit_number, location, equipment_id, created_at',
  excavation_permits:      'permit_number, location, excavation_location_desc, created_at',
  opening_blinding_permits:'permit_number, location, line_equipment_id, opening_type, created_at',
  unit_work_permits:       'permit_number, location, work_description, created_at',
};

const RECENT_CHECK_VIEWS = {
  aed_inspections:               'aed_id',
  chain_hoist_inspections:       'hoist_id',
  eyewash_station_inspections:   'station_id',
  fire_extinguisher_inspections: 'extinguisher_id',
  first_aid_kit_inspections:     'kit_id',
  harness_inspections:           'harness_id',
  ladder_inspections:            'ladder_id',
  lanyard_srl_inspections:       'equipment_id',
  synthetic_sling_inspections:   'sling_id',
  wire_rope_inspections:         'rope_id',
};

export async function GET(request) {
  const admin = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { searchParams } = new URL(request.url);
  const view = searchParams.get('view');

  try {
    if (view === 'open_permits') {
      const table = searchParams.get('table');
      const cols = PERMIT_VIEWS[table];
      if (!cols) return NextResponse.json({ error: 'Unknown table' }, { status: 400 });
      const { data, error } = await admin.from(table)
        .select(cols)
        .eq('permit_status', 'Open')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return NextResponse.json({ rows: data || [] });
    }

    if (view === 'ei_workers') {
      const permit = searchParams.get('permit');
      if (!permit) return NextResponse.json({ error: 'permit required' }, { status: 400 });
      const { data, error } = await admin.from('ei_worker_log')
        .select('id, worker_name, personal_lock_number, sign_in_time')
        .eq('permit_number', permit)
        .is('sign_out_time', null);
      if (error) throw error;
      return NextResponse.json({ rows: data || [] });
    }

    if (view === 'open_thas') {
      const { data, error } = await admin.from('tha_assessments')
        .select('tha_number, company, location, date, crew_lead, status, created_at')
        .eq('status', 'Open')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return NextResponse.json({ rows: data || [] });
    }

    if (view === 'tha_detail') {
      const thaNumber = searchParams.get('tha');
      if (!thaNumber) return NextResponse.json({ error: 'tha required' }, { status: 400 });
      const { data: tha, error: e1 } = await admin.from('tha_assessments')
        .select('*').eq('tha_number', thaNumber).maybeSingle();
      if (e1) throw e1;
      if (!tha) return NextResponse.json({ error: 'THA not found' }, { status: 404 });
      const { data: steps, error: e2 } = await admin.from('tha_task_steps')
        .select('*').eq('tha_number', thaNumber).order('step_number');
      if (e2) throw e2;
      const { data: crew, error: e3 } = await admin.from('tha_crew_signoff')
        .select('*').eq('tha_number', thaNumber);
      if (e3) throw e3;
      return NextResponse.json({ tha, steps: steps || [], crew: crew || [] });
    }

    if (view === 'recent_check') {
      const table = searchParams.get('table');
      const id = searchParams.get('id');
      const idCol = RECENT_CHECK_VIEWS[table];
      if (!idCol) return NextResponse.json({ error: 'Unknown table' }, { status: 400 });
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data, error } = await admin.from(table)
        .select('date, inspector_name')
        .ilike(idCol, id)
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: false })
        .limit(1);
      if (error) throw error;
      return NextResponse.json({ rows: data || [] });
    }

    if (view === 'camp_responses') {
      const inspection = searchParams.get('inspection');
      const code = (searchParams.get('code') || '').trim().toUpperCase();
      if (!inspection || !code) return NextResponse.json({ error: 'inspection and code required' }, { status: 400 });
      const { data: key, error: keyErr } = await admin.from('record_keys')
        .select('code')
        .eq('table_name', 'camp_inspections')
        .eq('record_id', String(inspection))
        .maybeSingle();
      if (keyErr) throw keyErr;
      if (!key || key.code !== code) {
        return NextResponse.json({ error: 'Invalid code for this inspection' }, { status: 403 });
      }
      const { data, error } = await admin.from('camp_inspection_responses')
        .select('id, question_id')
        .eq('inspection_id', inspection);
      if (error) throw error;
      return NextResponse.json({ rows: data || [] });
    }

    if (view === 'incident_draft') {
      const id = searchParams.get('id');
      const key = (searchParams.get('key') || '').trim().toUpperCase();
      if (!id || !key) return NextResponse.json({ error: 'id and key required' }, { status: 400 });
      const { data: rk, error: keyErr } = await admin.from('record_keys')
        .select('code')
        .eq('table_name', 'incidents')
        .eq('record_id', String(id))
        .maybeSingle();
      if (keyErr) throw keyErr;
      if (!rk || rk.code !== key) {
        return NextResponse.json({ error: 'Invalid key for this draft' }, { status: 403 });
      }
      const { data, error } = await admin.from('incidents')
        .select('*')
        .eq('id', id)
        .eq('status', 'Draft')
        .maybeSingle();
      if (error) throw error;
      if (!data) return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
      return NextResponse.json({ row: data });
    }

    return NextResponse.json({ error: 'Unknown view' }, { status: 400 });
  } catch (err) {
    console.error('[field-data]', view, err);
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}

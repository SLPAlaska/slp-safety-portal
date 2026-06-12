// ============================================================================
// app/api/demo-reset/route.js  (PORTAL repo)
//
// Clears submissions made during live demos so the next prospect starts
// clean. Staff-only (validated against portal_staff). NEVER touches the
// seeded Demo Energy Co history — only rows created after SEED_CUTOFF.
// ============================================================================
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://iypezirwdlqpptjpeeyf.supabase.co';

// Anything for Demo Energy Co created AFTER this moment is a demo-session
// submission and gets wiped on reset. The seed script's rows are all dated
// before it. (Adjust if you ever re-seed.)
const SEED_CUTOFF = '2026-06-13T02:00:00Z';

export async function POST(request) {
  const admin = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // ---- Staff check ----
  const bearer = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!bearer) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const { data: { user }, error: uErr } = await admin.auth.getUser(bearer);
  if (uErr || !user?.email) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  const { data: staff } = await admin
    .from('portal_staff')
    .select('email')
    .eq('email', user.email.toLowerCase())
    .maybeSingle();
  if (!staff) return NextResponse.json({ error: 'Staff only' }, { status: 403 });

  // ---- Wipe demo-session submissions ----
  try {
    const { data: removedRows, error } = await admin
      .from('hazard_id_reports')
      .delete()
      .eq('company', 'Demo Energy Co')
      .gt('created_at', SEED_CUTOFF)
      .select('id');
    if (error) throw error;
    return NextResponse.json({ ok: true, removed: (removedRows || []).length });
  } catch (err) {
    console.error('[demo-reset]', err);
    return NextResponse.json({ error: err?.message || 'Reset failed' }, { status: 500 });
  }
}

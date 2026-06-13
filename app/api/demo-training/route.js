// ============================================================================
// app/api/demo-training/route.js  (PORTAL repo)
//
// Records a REAL LMS completion for a demo learner when the prospect finishes
// the micro-training quiz — so the dashboard's Training panel moves honestly.
// Staff-validated. Demo learners use @demo.local emails; reset removes them.
// Requires demo-lms-seed.sql to have been run once.
// ============================================================================
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://iypezirwdlqpptjpeeyf.supabase.co';

export async function POST(request) {
  const admin = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // ---- Staff check ----
  const bearer = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!bearer) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const { data: { user }, error: uErr } = await admin.auth.getUser(bearer);
  if (uErr || !user?.email) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  const { data: staff } = await admin
    .from('portal_staff').select('email')
    .eq('email', user.email.toLowerCase()).maybeSingle();
  if (!staff) return NextResponse.json({ error: 'Staff only' }, { status: 403 });

  try {
    const { name, score } = await request.json();
    const learnerName = (name || 'Demo Learner').slice(0, 60);

    // Demo company + course (created by demo-lms-seed.sql)
    const { data: co } = await admin
      .from('lms_companies').select('id').eq('name', 'Demo Energy Co').maybeSingle();
    if (!co) return NextResponse.json({ error: 'Demo LMS not seeded (run demo-lms-seed.sql)' }, { status: 400 });
    const { data: course } = await admin
      .from('lms_courses').select('id').eq('title', 'Line of Fire Awareness').maybeSingle();
    if (!course) return NextResponse.json({ error: 'Demo course missing (run demo-lms-seed.sql)' }, { status: 400 });

    // LMS users require a real auth account (auth_user_id NOT NULL) —
    // create one via the admin API.
    async function ensureLearner(email, fullName) {
      let { data: existing } = await admin
        .from('lms_users').select('id').eq('email', email).maybeSingle();
      if (existing) return existing;
      const { data: authUser, error: aErr } = await admin.auth.admin.createUser({
        email,
        password: 'demo-' + Math.random().toString(36).slice(2, 12),
        email_confirm: true,
        user_metadata: { demo: true }
      });
      if (aErr && !/already/i.test(aErr.message || '')) throw aErr;
      let authId = authUser?.user?.id;
      if (!authId) {
        // account existed in auth but not lms — look it up
        const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        authId = (list?.users || []).find(u => u.email === email)?.id;
        if (!authId) throw new Error('Could not resolve auth account for ' + email);
      }
      const { data: created, error: cErr } = await admin
        .from('lms_users')
        .insert({
          auth_user_id: authId, company_id: co.id, email, username: email,
          full_name: fullName, active: true, role: 'learner', must_change_pw: false
        })
        .select('id').single();
      if (cErr) throw cErr;
      return created;
    }

    // Lazy self-seed: first ever call creates 5 seed learners + 8 backdated
    // completions so the Training panel has history before the prospect's row.
    const { count: existingCount } = await admin
      .from('lms_completions')
      .select('id, lms_users!inner(company_id)', { count: 'exact', head: true })
      .eq('lms_users.company_id', co.id);
    if (!existingCount) {
      const SEED_CREW = ['Jake Morrison', 'Sam Whitfield', 'Casey Nguyen', 'Riley Thomas', 'Jordan Pike'];
      const seedLearners = [];
      for (let i = 0; i < SEED_CREW.length; i++) {
        seedLearners.push(await ensureLearner(`demo-crew-${i + 1}@demo-seed.local`, SEED_CREW[i]));
      }
      const rows = [];
      for (let i = 0; i < 8; i++) {
        const daysAgo = 5 + Math.random() * 140;
        rows.push({
          user_id: seedLearners[i % 5].id, course_id: course.id,
          completed_at: new Date(Date.now() - daysAgo * 86400000).toISOString(),
          grant_note: 'Demo seed'
        });
      }
      await admin.from('lms_completions').insert(rows);
    }

    // The prospect's learner (@demo.local = reset target)
    const slug = learnerName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'learner';
    const learner = await ensureLearner(`demo-${slug}@demo.local`, learnerName);

    const { error: compErr } = await admin
      .from('lms_completions')
      .insert({
        user_id: learner.id, course_id: course.id,
        completed_at: new Date().toISOString(),
        grant_note: `Live demo — scored ${score ?? '?'}/3`
      });
    if (compErr) throw compErr;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[demo-training]', err);
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 });
  }
}

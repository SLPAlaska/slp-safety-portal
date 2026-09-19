// app/api/da/route.js
//
// Drug & Alcohol module API. Every read and write for the C/TPA console.
//
// AUTHORISATION, WHICH IS THE WHOLE BOUNDARY
//
// The da_* tables grant SELECT to a client's own DER and nothing else — no
// INSERT, UPDATE or DELETE policy exists anywhere in the module. This route
// holds the service-role key and is therefore the only writer, so the scope
// check below is not a convenience: it is the access control.
//
// Two kinds of caller:
//   SLP staff  — superAdmins.js or portal_staff. Every client. Must name a
//                client_id explicitly for client-scoped actions, so acting
//                across tenants is always deliberate.
//   DER        — named per client in da_client_ders. Their own client only.
//
// A general company_admin is NOT a caller here. Pending selections, instant
// test results, Clearinghouse records and CDL numbers are SLP staff and DER
// only, and a portal role grants none of them.
//
// CDL numbers never appear in a list response. They are fetched one at a time
// through view=cdl, which is logged by its own nature: one request, one driver.

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { pageAll } from '@/lib/supabasePage'
import { isSuperAdmin } from '@/lib/superAdmins'
import {
  runSelection, periodLabel, ratesFor, drawCount, RNG_METHOD_NOTE, PERIODS_PER_YEAR,
} from '@/lib/daSelection'

export const dynamic = 'force-dynamic'

let _admin = null
function db() {
  if (!_admin) {
    _admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
  }
  return _admin
}

const deny = (status, error) => ({ ok: false, response: NextResponse.json({ error }, { status }) })

/** Who is calling, and which clients may they touch. */
async function scope(request) {
  const h = request.headers.get('authorization') || ''
  const token = h.startsWith('Bearer ') ? h.slice(7).trim() : ''
  if (!token) return deny(401, 'Not signed in')

  const { data, error } = await db().auth.getUser(token)
  const user = data?.user
  if (error || !user) return deny(401, 'Session invalid — please sign in again')

  if (isSuperAdmin(user.email)) return { ok: true, user, isStaff: true, clientIds: null }

  const { data: staff } = await db().from('portal_staff')
    .select('email').eq('email', (user.email || '').toLowerCase()).maybeSingle()
  if (staff) return { ok: true, user, isStaff: true, clientIds: null }

  const { data: ders } = await db().from('da_client_ders')
    .select('client_id').eq('auth_user_id', user.id).eq('active', true)
  if (ders && ders.length) {
    return { ok: true, user, isStaff: false, clientIds: ders.map(d => d.client_id) }
  }

  // Deliberately the same message a learner or a company_admin gets: this
  // module simply is not theirs.
  return deny(403, 'This account is not authorized for drug and alcohol testing records.')
}

/** Narrow a requested client to what the caller may act on. */
function allow(s, requested) {
  if (s.isStaff) return requested || null            // null = all clients
  if (!requested) return s.clientIds                 // DER: their own
  return s.clientIds.includes(requested) ? requested : false
}

function inFilter(col, val) {
  if (val === null) return null
  return Array.isArray(val) ? `${col}=in.(${val.join(',')})` : `${col}=eq.${val}`
}

// ── GET ─────────────────────────────────────────────────────────────────────
export async function GET(request) {
  const s = await scope(request)
  if (!s.ok) return s.response
  const url = new URL(request.url)
  const view = url.searchParams.get('view') || 'whoami'
  const wanted = url.searchParams.get('client_id')
  const scoped = allow(s, wanted)
  if (scoped === false) return NextResponse.json({ error: 'Not authorized for this client' }, { status: 403 })

  if (view === 'whoami') {
    let clients
    if (s.isStaff) {
      const { data } = await pageAll(() => db().from('da_clients')
        .select('id, name, lms_company_id, dot_agency, active').order('name'))
      clients = data || []
    } else {
      const { data } = await db().from('da_clients')
        .select('id, name, lms_company_id, dot_agency, active')
        .in('id', s.clientIds).order('name')
      clients = data || []
    }
    return NextResponse.json({
      role: s.isStaff ? 'slp_staff' : 'der',
      email: s.user.email,
      clients,
    })
  }

  // ── Clearinghouse: the annual query position ──────────────────────────────
  if (view === 'clearinghouse') {
    let q = db().from('da_clearinghouse_annual_due')
      .select('driver_id, client_id, full_name, last_query_date, next_due_date, days_until_due, due_status')
    if (scoped) q = Array.isArray(scoped) ? q.in('client_id', scoped) : q.eq('client_id', scoped)
    const { data, error } = await pageAll(() => q)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    const rows = data || []
    const rank = { overdue: 0, never_queried: 1, due_soon: 2, current: 3 }
    rows.sort((a, b) =>
      (rank[a.due_status] - rank[b.due_status]) ||
      ((a.days_until_due ?? 0) - (b.days_until_due ?? 0)) ||
      String(a.full_name).localeCompare(String(b.full_name)))

    const counts = rows.reduce((m, r) => ({ ...m, [r.due_status]: (m[r.due_status] || 0) + 1 }), {})
    return NextResponse.json({ drivers: rows, counts })
  }

  if (view === 'queries') {
    const driver = url.searchParams.get('driver_id')
    let q = db().from('da_clearinghouse_queries')
      .select('*, da_drivers(full_name, cdl_last4, cdl_state)')
      .order('query_date', { ascending: false })
    if (driver) q = q.eq('driver_id', driver)
    if (scoped) q = Array.isArray(scoped) ? q.in('client_id', scoped) : q.eq('client_id', scoped)
    const { data, error } = await pageAll(() => q)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ queries: data || [] })
  }

  // One CDL, one request, never a list. The caller has already been proven to
  // be SLP staff or this client's DER.
  if (view === 'cdl') {
    const driverId = url.searchParams.get('driver_id')
    if (!driverId) return NextResponse.json({ error: 'driver_id is required' }, { status: 400 })
    const { data: drv } = await db().from('da_drivers')
      .select('id, client_id, full_name').eq('id', driverId).maybeSingle()
    if (!drv) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!s.isStaff && !s.clientIds.includes(drv.client_id)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    const { data: cdl, error } = await db().rpc('da_reveal_cdl', { p_driver: driverId })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    console.warn('[da] CDL revealed for driver=%s by %s', driverId, s.user.email)
    return NextResponse.json({ driver_id: driverId, full_name: drv.full_name, cdl_number: cdl })
  }

  if (view === 'sap') {
    let q = db().from('da_sap_programs').select('*, da_drivers(full_name)').is('closed_at', null)
    if (scoped) q = Array.isArray(scoped) ? q.in('client_id', scoped) : q.eq('client_id', scoped)
    const { data, error } = await pageAll(() => q)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ programs: data || [] })
  }

  // ── Random testing ────────────────────────────────────────────────────────
  if (view === 'pools') {
    const { data: pools } = await pageAll(() => db().from('da_pools')
      .select('*, da_clients(id, name), da_consortia(id, name)').eq('active', true))
    const { data: members } = await pageAll(() => db().from('da_pool_members')
      .select('id, pool_id, client_id, full_name, employee_ident, active'))

    const visible = (pools || []).filter(p => {
      if (s.isStaff) return !wanted || p.client_id === wanted ||
        (members || []).some(m => m.pool_id === p.id && m.client_id === wanted)
      return (members || []).some(m => m.pool_id === p.id && s.clientIds.includes(m.client_id))
        || s.clientIds.includes(p.client_id)
    })

    const out = visible.map(p => {
      const mem = (members || []).filter(m => m.pool_id === p.id && m.active)
      const rates = ratesFor(p)
      const byClient = {}
      for (const m of mem) byClient[m.client_id] = (byClient[m.client_id] || 0) + 1
      return {
        ...p,
        owner: p.da_clients?.name || p.da_consortia?.name || '(unassigned)',
        owner_kind: p.client_id ? 'client' : 'consortium',
        pool_size: mem.length,
        client_breakdown: byClient,
        period_label: periodLabel(p.frequency),
        drug_select_count: drawCount(mem.length, rates.drug, p.frequency),
        alcohol_select_count: drawCount(mem.length, rates.alcohol, p.frequency),
        rates,
      }
    })
    return NextResponse.json({ pools: out })
  }

  if (view === 'selections') {
    let q = db().from('da_selections')
      .select('*, da_pool_members(full_name, employee_ident), da_clients(name), da_pulls(period_label, run_at, pool_id)')
      .in('status', ['selected', 'notified'])
      .order('created_at', { ascending: false })
    if (scoped) q = Array.isArray(scoped) ? q.in('client_id', scoped) : q.eq('client_id', scoped)
    const { data, error } = await pageAll(() => q)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ selections: data || [] })
  }

  if (view === 'pulls') {
    const { data: pulls } = await pageAll(() => db().from('da_pulls')
      .select('*, da_pools(pool_kind, frequency, client_id, consortium_id, da_clients(name), da_consortia(name))')
      .order('run_at', { ascending: false }))
    const { data: sels } = await pageAll(() => db().from('da_selections')
      .select('*, da_pool_members(full_name, employee_ident), da_clients(name)'))
    const mine = (pulls || []).filter(p => {
      if (s.isStaff) return true
      return (sels || []).some(x => x.pull_id === p.id && s.clientIds.includes(x.client_id))
    })
    const byPull = {}
    for (const x of sels || []) {
      if (!s.isStaff && !s.clientIds.includes(x.client_id)) continue
      ;(byPull[x.pull_id] ||= []).push(x)
    }
    return NextResponse.json({ pulls: mine.map(p => ({ ...p, selections: byPull[p.id] || [] })) })
  }

  // ── MIS ───────────────────────────────────────────────────────────────────
  // Aggregated at report time from status + MIS outcome category. No
  // individual result is stored anywhere, so none can be read back here.
  if (view === 'mis') {
    const year = url.searchParams.get('year') || String(new Date().getUTCFullYear())
    const clientId = wanted
    if (!clientId) return NextResponse.json({ error: 'client_id is required' }, { status: 400 })
    if (allow(s, clientId) === false) {
      return NextResponse.json({ error: 'Not authorized for this client' }, { status: 403 })
    }
    const { data: ev, error } = await pageAll(() => db().from('da_test_events')
      .select('reason, test_kind, program, status, drug_mis_outcome, drug_positive_for, alcohol_screen_mis, alcohol_confirm_mis')
      .eq('client_id', clientId).eq('program', 'DOT')
      .gte('event_date', `${year}-01-01`).lte('event_date', `${year}-12-31`))
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    const { data: client } = await db().from('da_clients')
      .select('id, name, dot_agency').eq('id', clientId).maybeSingle()
    return NextResponse.json({ year, client, ...buildMis(ev || []) })
  }

  return NextResponse.json({ error: 'Unknown view' }, { status: 400 })
}

const REASONS = ['pre_employment', 'random', 'post_accident',
                 'reasonable_suspicion', 'return_to_duty', 'follow_up']

/**
 * Aggregate DOT F 1385 sections III and IV.
 *
 * Column names mirror the federal form exactly, including its own arithmetic
 * rule that the total equals the sum of the named columns and excludes
 * cancelled results.
 */
function buildMis(events) {
  const drug = {}, alcohol = {}
  for (const r of REASONS) {
    drug[r] = { total: 0, verified_negative: 0, verified_positive: 0,
      marijuana: 0, cocaine: 0, pcp: 0, opiates: 0, amphetamines: 0,
      refusal_adulterated: 0, refusal_substituted: 0,
      refusal_shy_bladder_no_medical: 0, refusal_other: 0, cancelled: 0 }
    alcohol[r] = { total: 0, below_002: 0, screen_002_or_greater: 0,
      confirmation_tests: 0, confirm_002_through_0039: 0, confirm_004_or_greater: 0,
      refusal_shy_lung_no_medical: 0, refusal_other: 0, cancelled: 0 }
  }
  for (const e of events) {
    if (e.status !== 'completed') continue
    if (e.test_kind === 'drug') {
      const row = drug[e.reason]; if (!row) continue
      const o = e.drug_mis_outcome
      if (o && row[o] !== undefined) row[o]++
      for (const d of e.drug_positive_for || []) if (row[d] !== undefined) row[d]++
      if (o && o !== 'cancelled') row.total++
    } else {
      const row = alcohol[e.reason]; if (!row) continue
      const sc = e.alcohol_screen_mis
      if (sc === 'below_002') row.below_002++
      else if (sc === '002_or_greater') row.screen_002_or_greater++
      else if (sc === 'refusal_shy_lung_no_medical') row.refusal_shy_lung_no_medical++
      else if (sc === 'refusal_other') row.refusal_other++
      else if (sc === 'cancelled') row.cancelled++
      const cf = e.alcohol_confirm_mis
      if (cf && cf !== 'not_required') {
        row.confirmation_tests++
        if (cf === '002_through_0039') row.confirm_002_through_0039++
        if (cf === '004_or_greater') row.confirm_004_or_greater++
      }
      if (sc && sc !== 'cancelled') row.total++
    }
  }
  const sum = (o) => Object.keys(o[REASONS[0]]).reduce(
    (acc, k) => ({ ...acc, [k]: REASONS.reduce((n, r) => n + o[r][k], 0) }), {})
  return { drug, alcohol, drug_total: sum(drug), alcohol_total: sum(alcohol), reasons: REASONS }
}

// ── POST ────────────────────────────────────────────────────────────────────
export async function POST(request) {
  const s = await scope(request)
  if (!s.ok) return s.response
  let body
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const actor = s.user?.email || 'unknown'
  const target = allow(s, body.client_id)
  if (target === false) return NextResponse.json({ error: 'Not authorized for this client' }, { status: 403 })

  switch (body.action) {
    // ── Clearinghouse ───────────────────────────────────────────────────────
    case 'log_query': {
      const q = body.query || {}
      if (!q.driver_id || !q.query_date || !q.query_type) {
        return NextResponse.json({ error: 'driver_id, query_date and query_type are required' }, { status: 400 })
      }
      const { data: drv } = await db().from('da_drivers')
        .select('id, client_id').eq('id', q.driver_id).maybeSingle()
      if (!drv) return NextResponse.json({ error: 'Driver not found' }, { status: 404 })
      if (!s.isStaff && !s.clientIds.includes(drv.client_id)) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
      // The consent rule is also a database constraint; checking here is only
      // so the person gets a sentence instead of a constraint name.
      if (q.query_type === 'full' && q.result && q.result !== 'pending' && !q.consent_on_file) {
        return NextResponse.json(
          { error: 'A full query cannot be recorded as completed without driver consent on file.' },
          { status: 400 })
      }
      const { data, error } = await db().from('da_clearinghouse_queries').insert([{
        driver_id: q.driver_id, client_id: drv.client_id,
        query_date: q.query_date, query_type: q.query_type,
        consent_on_file: !!q.consent_on_file,
        result: q.result || 'pending',
        query_result_summary: q.query_result_summary || null,
        full_query_needed: q.full_query_needed ?? null,
        violation_reported: q.violation_reported ?? null,
        notes: q.notes || null,
      }]).select().single()
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ query: data })
    }

    case 'resolve_query': {
      // Fill in a pending query once the Clearinghouse answers.
      const { query_id, result, query_result_summary, violation_reported, consent_on_file } = body
      if (!query_id || !result) return NextResponse.json({ error: 'query_id and result are required' }, { status: 400 })
      const { data: row } = await db().from('da_clearinghouse_queries')
        .select('id, client_id, query_type').eq('id', query_id).maybeSingle()
      if (!row || (!s.isStaff && !s.clientIds.includes(row.client_id))) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
      const patch = { result, updated_at: new Date().toISOString(), needs_review: false }
      if (query_result_summary !== undefined) patch.query_result_summary = query_result_summary
      if (violation_reported !== undefined) patch.violation_reported = violation_reported
      if (consent_on_file !== undefined) patch.consent_on_file = !!consent_on_file
      const { data, error } = await db().from('da_clearinghouse_queries')
        .update(patch).eq('id', query_id).select().maybeSingle()
      if (error) {
        if (error.code === '23514') {
          return NextResponse.json(
            { error: 'A completed full query requires consent on file. Record the consent first.' },
            { status: 400 })
        }
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      return NextResponse.json({ query: data })
    }

    // ── Random testing ──────────────────────────────────────────────────────
    case 'run_pull': {
      if (!body.pool_id) return NextResponse.json({ error: 'pool_id is required' }, { status: 400 })
      const { data: pool } = await db().from('da_pools')
        .select('*, da_clients(name), da_consortia(name)').eq('id', body.pool_id).maybeSingle()
      if (!pool || !pool.active) return NextResponse.json({ error: 'Pool not found' }, { status: 404 })

      // ONE pool_kind only: the query is filtered, not the result.
      const { data: members, error: mErr } = await pageAll(() => db().from('da_pool_members')
        .select('id, client_id, full_name, employee_ident')
        .eq('pool_id', pool.id).eq('active', true))
      if (mErr) return NextResponse.json({ error: mErr.message }, { status: 400 })
      if (!members || !members.length) {
        return NextResponse.json({ error: 'That pool has no active members' }, { status: 400 })
      }
      // A DER may only run a pull for a pool made of their own people.
      if (!s.isStaff && !members.every(m => s.clientIds.includes(m.client_id))) {
        return NextResponse.json(
          { error: 'This is a consortium pool spanning other employers; only SLP staff can run it.' },
          { status: 403 })
      }

      const label = body.period_label || periodLabel(pool.frequency)
      const result = runSelection({ members, pool })
      const breakdown = members.reduce((m, x) => ({ ...m, [x.client_id]: (m[x.client_id] || 0) + 1 }), {})

      const { data: pull, error: pErr } = await db().from('da_pulls').insert([{
        pool_id: pool.id, period_label: label, run_by: actor,
        pool_size_at_pull: result.poolSize,
        drug_select_count: result.drugCount,
        alcohol_select_count: result.alcoholCount,
        rates_applied: { ...result.rates, frequency: pool.frequency,
                         periods_per_year: PERIODS_PER_YEAR[pool.frequency],
                         pool_kind: pool.pool_kind },
        method_note: RNG_METHOD_NOTE,
        eligible_member_ids: members.map(m => m.id),
        client_breakdown: breakdown,
      }]).select().single()
      if (pErr) {
        if (pErr.code === '23505') {
          return NextResponse.json(
            { error: `A pull already exists for ${label}. Selections do not carry over and a period is run once.` },
            { status: 409 })
        }
        return NextResponse.json({ error: pErr.message }, { status: 400 })
      }

      const byId = Object.fromEntries(members.map(m => [m.id, m]))
      const rows = result.selections.map(x => ({
        pull_id: pull.id, member_id: x.member_id,
        client_id: byId[x.member_id].client_id,
        test_type: x.test_type, status: 'selected',
      }))
      if (rows.length) {
        const { error: sErr } = await db().from('da_selections').insert(rows)
        if (sErr) {
          await db().from('da_pulls').delete().eq('id', pull.id)
          return NextResponse.json({ error: 'Selection write failed: ' + sErr.message }, { status: 400 })
        }
      }
      return NextResponse.json({
        pull,
        selections: result.selections.map(x => ({
          ...x, full_name: byId[x.member_id]?.full_name,
          employee_ident: byId[x.member_id]?.employee_ident,
          client_id: byId[x.member_id]?.client_id,
        })),
      })
    }

    case 'set_selection_status': {
      const { selection_id, status, not_tested_reason, notes } = body
      if (!selection_id) return NextResponse.json({ error: 'selection_id is required' }, { status: 400 })
      if (!['selected', 'notified', 'completed', 'not_tested'].includes(status)) {
        return NextResponse.json({ error: 'invalid status' }, { status: 400 })
      }
      if (status === 'not_tested' && !String(not_tested_reason || '').trim()) {
        return NextResponse.json(
          { error: 'A documented reason is required when someone is not tested.' }, { status: 400 })
      }
      const { data: sel } = await db().from('da_selections')
        .select('id, client_id').eq('id', selection_id).maybeSingle()
      if (!sel || (!s.isStaff && !s.clientIds.includes(sel.client_id))) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
      const patch = { status, status_date: new Date().toISOString(), updated_at: new Date().toISOString() }
      if (not_tested_reason !== undefined) patch.not_tested_reason = not_tested_reason || null
      if (notes !== undefined) patch.notes = notes || null
      const { data, error } = await db().from('da_selections')
        .update(patch).eq('id', selection_id).select().single()
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ selection: data })
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
}

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
      .select('driver_id, client_id, full_name, last_query_date, next_due_date, '
              + 'days_until_due, due_status, pending_count, pending_since, pending_full_query')
    if (scoped) q = Array.isArray(scoped) ? q.in('client_id', scoped) : q.eq('client_id', scoped)
    const { data, error } = await pageAll(() => q)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    const rows = data || []
    // never_queried first: a driver with no query at all is the worst finding.
    // query_pending sits below overdue because the query WAS run - what is
    // missing is the result on our side, not the check itself.
    const rank = { never_queried: 0, overdue: 1, query_pending: 2, due_soon: 3, current: 4 }
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

  // What a bulk file would contain, and whether each driver is actually
  // ready to be in one. A driver missing a DOB cannot go in the file at all;
  // one missing limited-query consent can be queried but should not be.
  if (view === 'bulk_ready') {
    const clientId = wanted
    if (!clientId) return NextResponse.json({ error: 'client_id is required' }, { status: 400 })
    if (allow(s, clientId) === false) {
      return NextResponse.json({ error: 'Not authorized for this client' }, { status: 403 })
    }
    const { data: due } = await pageAll(() => db().from('da_clearinghouse_annual_due')
      .select('driver_id, full_name, due_status, last_query_date, next_due_date, days_until_due, pending_since')
      .eq('client_id', clientId))
    const actionable = (due || []).filter(d =>
      ['never_queried', 'overdue', 'due_soon', 'query_pending'].includes(d.due_status))

    const ids = actionable.map(d => d.driver_id)
    const { data: drivers } = ids.length
      ? await db().from('da_drivers').select('id, full_name, dob_year, cdl_last4, cdl_state').in('id', ids)
      : { data: [] }
    const byId = Object.fromEntries((drivers || []).map(d => [d.id, d]))

    const consents = {}
    for (const id of ids) {
      const { data: ok } = await db().rpc('da_has_limited_consent', { p_driver: id })
      consents[id] = ok === true
    }
    const { data: client } = await db().from('da_clients')
      .select('id, name, query_balance, query_balance_as_of, query_balance_note')
      .eq('id', clientId).maybeSingle()
    const { data: batches } = await pageAll(() => db().from('da_bulk_batches')
      .select('*').eq('client_id', clientId).order('created_at', { ascending: false }))

    return NextResponse.json({
      client,
      batches: batches || [],
      drivers: actionable.map(d => ({
        ...d,
        dob_on_file: !!byId[d.driver_id]?.dob_year,
        cdl_on_file: !!byId[d.driver_id]?.cdl_last4,
        limited_consent: consents[d.driver_id] === true,
        blocked: !byId[d.driver_id]?.dob_year || !byId[d.driver_id]?.cdl_last4,
      })),
    })
  }

  // The generated file itself. Built here rather than in the browser because
  // it carries full CDL numbers and dates of birth, which are decrypted
  // server-side and never sent to a list view.
  if (view === 'bulk_file') {
    const batchId = url.searchParams.get('batch_id')
    if (!batchId) return NextResponse.json({ error: 'batch_id is required' }, { status: 400 })
    const { data: batch } = await db().from('da_bulk_batches')
      .select('*, da_clients(name)').eq('id', batchId).maybeSingle()
    if (!batch) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (allow(s, batch.client_id) === false) {
      return NextResponse.json({ error: 'Not authorized for this client' }, { status: 403 })
    }
    const { data: rows } = await pageAll(() => db().from('da_clearinghouse_queries')
      .select('id, driver_id, da_drivers(full_name, cdl_state)').eq('bulk_batch_id', batchId))

    // FMCSA template columns, in order.
    const out = [['LastName', 'FirstName', 'DOB', 'CDL', 'Country', 'QueryType'].join('\t')]
    const skipped = []
    for (const r of rows || []) {
      const { data: cdl } = await db().rpc('da_reveal_cdl', { p_driver: r.driver_id })
      const { data: dob } = await db().rpc('da_reveal_dob', { p_driver: r.driver_id })
      const name = String(r.da_drivers?.full_name || '').trim()
      if (!cdl || !dob) { skipped.push({ name, missing: !cdl ? 'CDL' : 'DOB' }); continue }
      // "Last, First" and "First Last" both appear in the imported data.
      let first = '', last = ''
      if (name.includes(',')) { const [a, b] = name.split(','); last = a.trim(); first = (b || '').trim() }
      else { const parts = name.split(/\s+/); last = parts.pop() || ''; first = parts.join(' ') }
      const d = new Date(dob)
      const mdy = `${String(d.getUTCMonth() + 1).padStart(2, '0')}/${String(d.getUTCDate()).padStart(2, '0')}/${d.getUTCFullYear()}`
      out.push([last, first, mdy, cdl, 'US', batch.query_type].join('\t'))
    }
    console.warn('[da] bulk file built for batch=%s by %s (%d rows)', batchId, s.user.email, out.length - 1)
    return NextResponse.json({
      batch, filename: batch.filename, content: out.join('\n'),
      row_count: out.length - 1, skipped,
    })
  }

  if (view === 'consents') {
    const driver = url.searchParams.get('driver_id')
    let q = db().from('da_query_consents').select('*, da_drivers(full_name)')
      .order('signed_date', { ascending: false })
    if (driver) q = q.eq('driver_id', driver)
    if (scoped) q = Array.isArray(scoped) ? q.in('client_id', scoped) : q.eq('client_id', scoped)
    const { data, error } = await pageAll(() => q)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ consents: data || [] })
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

    // ── Identification data ─────────────────────────────────────────────────
    case 'set_driver_ids': {
      // DOB and CDL together, because a driver is only usable in a bulk file
      // when both are present.
      const { driver_id, cdl_number, dob } = body
      if (!driver_id) return NextResponse.json({ error: 'driver_id is required' }, { status: 400 })
      const { data: drv } = await db().from('da_drivers')
        .select('id, client_id').eq('id', driver_id).maybeSingle()
      if (!drv || (!s.isStaff && !s.clientIds.includes(drv.client_id))) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
      const done = {}
      if (cdl_number) {
        const { error } = await db().rpc('da_store_cdl', { p_driver: driver_id, p_cdl: cdl_number })
        if (error) return NextResponse.json({ error: error.message }, { status: 400 })
        done.cdl = true
      }
      if (dob) {
        const { error } = await db().rpc('da_store_dob', { p_driver: driver_id, p_dob: dob })
        if (error) return NextResponse.json({ error: error.message }, { status: 400 })
        done.dob = true
      }
      return NextResponse.json({ stored: done })
    }

    // ── Limited-query general consent ───────────────────────────────────────
    case 'record_consent': {
      const c = body.consent || {}
      if (!c.driver_id || !c.signed_date || !String(c.scope || '').trim()) {
        return NextResponse.json(
          { error: 'driver_id, signed_date and scope are required' }, { status: 400 })
      }
      const { data: drv } = await db().from('da_drivers')
        .select('id, client_id').eq('id', c.driver_id).maybeSingle()
      if (!drv || (!s.isStaff && !s.clientIds.includes(drv.client_id))) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
      const { data, error } = await db().from('da_query_consents').insert([{
        driver_id: c.driver_id, client_id: drv.client_id,
        signed_date: c.signed_date, expires_date: c.expires_date || null,
        scope: String(c.scope).trim(), method: c.method || null,
        document_ref: c.document_ref || null, obtained_by: actor, notes: c.notes || null,
      }]).select().single()
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ consent: data })
    }

    // ── Query balance ───────────────────────────────────────────────────────
    case 'set_query_balance': {
      if (!body.client_id) return NextResponse.json({ error: 'client_id is required' }, { status: 400 })
      if (allow(s, body.client_id) === false) {
        return NextResponse.json({ error: 'Not authorized for this client' }, { status: 403 })
      }
      const bal = Number(body.query_balance)
      if (!Number.isFinite(bal) || bal < 0) {
        return NextResponse.json({ error: 'query_balance must be zero or more' }, { status: 400 })
      }
      const { data, error } = await db().from('da_clients').update({
        query_balance: Math.floor(bal),
        query_balance_as_of: body.as_of || new Date().toISOString().slice(0, 10),
        query_balance_note: body.note || null,
        updated_at: new Date().toISOString(),
      }).eq('id', body.client_id).select().single()
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ client: data })
    }

    // ── Bulk: generate ──────────────────────────────────────────────────────
    case 'create_bulk_batch': {
      const clientId = body.client_id
      if (!clientId) return NextResponse.json({ error: 'client_id is required' }, { status: 400 })
      if (allow(s, clientId) === false) {
        return NextResponse.json({ error: 'Not authorized for this client' }, { status: 403 })
      }
      const qType = Number(body.query_type || 1)
      if (![1, 2, 3, 4].includes(qType)) {
        return NextResponse.json({ error: 'query_type must be 1, 2, 3 or 4' }, { status: 400 })
      }
      const ids = Array.isArray(body.driver_ids) ? [...new Set(body.driver_ids)] : []
      if (!ids.length) return NextResponse.json({ error: 'No drivers selected' }, { status: 400 })

      // A driver with no DOB or no CDL cannot appear in the file, so keeping
      // them would produce a batch whose row count lies.
      const { data: drivers } = await db().from('da_drivers')
        .select('id, client_id, full_name, dob_year, cdl_last4').in('id', ids)
      const usable = (drivers || []).filter(d =>
        d.client_id === clientId && d.dob_year && d.cdl_last4)
      const blocked = (drivers || []).filter(d => !d.dob_year || !d.cdl_last4)
        .map(d => ({ id: d.id, full_name: d.full_name, missing: !d.dob_year ? 'DOB' : 'CDL' }))
      if (!usable.length) {
        return NextResponse.json(
          { error: 'None of the selected drivers has both a DOB and a CDL on file', blocked },
          { status: 400 })
      }

      // Drivers already sitting in an open batch are skipped rather than
      // queued twice; that is what makes re-generating safe.
      const { data: open } = await pageAll(() => db().from('da_clearinghouse_queries')
        .select('driver_id, bulk_batch_id, da_bulk_batches!inner(status)')
        .eq('result', 'pending').not('bulk_batch_id', 'is', null)
        .in('driver_id', usable.map(d => d.id)))
      const alreadyQueued = new Set((open || [])
        .filter(r => r.da_bulk_batches?.status !== 'ingested' && r.da_bulk_batches?.status !== 'cancelled')
        .map(r => r.driver_id))
      const finalIds = usable.map(d => d.id).filter(id => !alreadyQueued.has(id))
      if (!finalIds.length) {
        return NextResponse.json(
          { error: 'Every selected driver is already in an open batch', blocked,
            already_queued: [...alreadyQueued] }, { status: 409 })
      }

      const { data: client } = await db().from('da_clients')
        .select('name, query_balance').eq('id', clientId).maybeSingle()
      const stamp = new Date().toISOString().slice(0, 10)
      const { data: batch, error: bErr } = await db().from('da_bulk_batches').insert([{
        client_id: clientId, query_type: qType, created_by: actor,
        driver_count: finalIds.length,
        filename: `${String(client?.name || 'client').replace(/[^A-Za-z0-9]+/g, '_')}_clearinghouse_${stamp}.txt`,
        notes: body.notes || null,
      }]).select().single()
      if (bErr) return NextResponse.json({ error: bErr.message }, { status: 400 })

      const rows = finalIds.map(id => ({
        driver_id: id, client_id: clientId, query_date: stamp,
        query_type: qType === 1 || qType === 4 ? 'limited' : 'full',
        consent_on_file: false, result: 'pending',
        bulk_batch_id: batch.id,
        notes: `Queued in bulk batch ${batch.id.slice(0, 8)} (FMCSA query type ${qType})`,
      }))
      const { error: qErr } = await db().from('da_clearinghouse_queries').insert(rows)
      if (qErr) {
        await db().from('da_bulk_batches').delete().eq('id', batch.id)
        return NextResponse.json({ error: qErr.message }, { status: 400 })
      }

      const warnings = []
      if (client?.query_balance != null && client.query_balance < finalIds.length) {
        warnings.push(`This client's last reported query balance is ${client.query_balance}, ` +
          `below the ${finalIds.length} queries in this file. A C/TPA cannot buy queries on ` +
          `their behalf, so confirm their balance before uploading.`)
      }
      return NextResponse.json({ batch, queued: finalIds.length, blocked,
        already_queued: [...alreadyQueued], warnings })
    }

    case 'set_batch_status': {
      const { batch_id, status } = body
      if (!batch_id || !['submitted', 'cancelled'].includes(status)) {
        return NextResponse.json({ error: 'batch_id and a valid status are required' }, { status: 400 })
      }
      const { data: b } = await db().from('da_bulk_batches')
        .select('id, client_id').eq('id', batch_id).maybeSingle()
      if (!b || allow(s, b.client_id) === false) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
      const patch = { status }
      if (status === 'submitted') patch.submitted_at = new Date().toISOString()
      const { data, error } = await db().from('da_bulk_batches')
        .update(patch).eq('id', batch_id).select().single()
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ batch: data })
    }

    // ── Bulk: ingest the Query History export ───────────────────────────────
    //
    // Idempotent by construction. Every row is matched to an existing query
    // row, never inserted, so importing the same export twice changes nothing
    // the second time. A row whose stored result already differs from the
    // export is reported as a conflict rather than silently overwritten: a
    // compliance record that changes without anyone noticing is worse than one
    // that refuses to.
    case 'ingest_query_history': {
      const rowsIn = Array.isArray(body.rows) ? body.rows : []
      if (!rowsIn.length) return NextResponse.json({ error: 'No rows supplied' }, { status: 400 })
      const batchId = body.batch_id || null

      let candidates
      if (batchId) {
        const { data: b } = await db().from('da_bulk_batches')
          .select('id, client_id').eq('id', batchId).maybeSingle()
        if (!b || allow(s, b.client_id) === false) {
          return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
        }
        const { data } = await pageAll(() => db().from('da_clearinghouse_queries')
          .select('id, driver_id, result, query_type, external_query_id, da_drivers(full_name, cdl_last4, dob_year)')
          .eq('bulk_batch_id', batchId))
        candidates = data || []
      } else {
        let q = db().from('da_clearinghouse_queries')
          .select('id, driver_id, result, query_type, external_query_id, da_drivers(full_name, cdl_last4, dob_year)')
          .eq('result', 'pending')
        if (scoped) q = Array.isArray(scoped) ? q.in('client_id', scoped) : q.eq('client_id', scoped)
        const { data } = await pageAll(() => q)
        candidates = data || []
      }

      const norm = (v) => String(v || '').toLowerCase().replace(/[^a-z]/g, '')
      const RESULT = {
        'no record found': 'clear', 'clear': 'clear', 'not prohibited': 'clear',
        'driver not prohibited': 'clear', 'record found': 'record_exists',
        'record exists': 'record_exists', 'prohibited': 'prohibited',
      }

      const applied = [], skipped = [], conflicts = [], unmatched = []
      for (const r of rowsIn) {
        const name = r.driver_name || r.name || [r.first_name, r.last_name].filter(Boolean).join(' ')
        const last4 = String(r.cdl || r.cdl_number || '').replace(/[^A-Za-z0-9]/g, '').slice(-4)
        const raw = String(r.result || r.query_result || '').trim()
        const mapped = RESULT[raw.toLowerCase()] ||
          (/prohibit/i.test(raw) ? 'prohibited' : /record/i.test(raw) ? 'record_exists' : null)

        // Match on the external id first where the export supplies one; it is
        // the only truly unambiguous key.
        let hit = r.external_query_id
          ? candidates.find(c => c.external_query_id === r.external_query_id)
          : null
        if (!hit) hit = candidates.find(c => norm(c.da_drivers?.full_name) === norm(name)
          && (!last4 || !c.da_drivers?.cdl_last4 || c.da_drivers.cdl_last4 === last4))
        if (!hit) { unmatched.push({ name, result: raw }); continue }
        if (!mapped) { unmatched.push({ name, result: raw, why: 'unrecognised result value' }); continue }

        if (hit.result !== 'pending') {
          if (hit.result === mapped) skipped.push({ name, result: mapped, why: 'already recorded' })
          else conflicts.push({ name, stored: hit.result, incoming: mapped })
          continue
        }

        const patch = {
          result: mapped,
          query_result_summary: r.summary || r.query_result_summary || raw || null,
          resolved_at: new Date().toISOString(),
          resolved_by: actor,
          needs_review: false,
          updated_at: new Date().toISOString(),
        }
        if (r.external_query_id) patch.external_query_id = r.external_query_id
        if (r.consent_on_file !== undefined) patch.consent_on_file = !!r.consent_on_file
        if (mapped !== 'clear') patch.violation_reported = true

        const { error } = await db().from('da_clearinghouse_queries')
          .update(patch).eq('id', hit.id).eq('result', 'pending')
        if (error) { conflicts.push({ name, stored: hit.result, incoming: mapped, error: error.message }); continue }
        hit.result = mapped
        applied.push({ name, result: mapped })
      }

      if (batchId && applied.length) {
        const { data: left } = await db().from('da_clearinghouse_queries')
          .select('id').eq('bulk_batch_id', batchId).eq('result', 'pending')
        if (!left || !left.length) {
          await db().from('da_bulk_batches')
            .update({ status: 'ingested', ingested_at: new Date().toISOString() })
            .eq('id', batchId)
        }
      }
      return NextResponse.json({
        applied: applied.length, skipped: skipped.length,
        conflicts, unmatched, detail: { applied, skipped },
      })
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

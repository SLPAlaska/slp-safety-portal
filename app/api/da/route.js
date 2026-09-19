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
//   D&A administrator — SLP Alaska's C/TPA staff, an exact-match list of three
//                       in app/lib/daAdmins.js. Every client, but must name a
//                       client_id explicitly for client-scoped actions so that
//                       acting across tenants is always deliberate.
//   DER               — named per client in da_client_ders. Own client only.
//
// Deliberately NOT portal_staff. That table holds nine people and opens every
// gated management page to all of them; six have no business in drug and
// alcohol records, and two of those six are company admins at MagTec, so
// portal_staff would hand a client's own staff another client's testing data.
// Being a platform super admin does not grant this either.
//
// A general company_admin is NOT a caller here. Pending selections, instant
// test results, Clearinghouse records and CDL numbers are D&A administrators
// and the client's own DER only.
//
// CDL numbers never appear in a list response. They are fetched one at a time
// through view=cdl, which is logged by its own nature: one request, one driver.

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { pageAll } from '@/lib/supabasePage'
import { isDaAdmin } from '@/lib/daAdmins'
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

  // The SLP side: exact email match, nothing else. No portal_staff lookup, no
  // domain test, no super-admin shortcut.
  if (isDaAdmin(user.email)) return { ok: true, user, isStaff: true, clientIds: null }

  const { data: ders } = await db().from('da_client_ders')
    .select('client_id').eq('auth_user_id', user.id).eq('active', true)
  if (ders && ders.length) {
    return { ok: true, user, isStaff: false, clientIds: ders.map(d => d.client_id) }
  }

  // The same message for a learner, a company_admin and a portal_staff member
  // who is not a D&A administrator. Telling them apart would say which kind of
  // account they hold, and none of them is getting in either way.
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

  // The sheet a client fills in and sends back.
  //
  // Names only. No CDL numbers and no dates of birth we already hold - this
  // goes out by email to a dispatcher, so it carries nothing that would matter
  // if it landed in the wrong inbox.
  //
  // The Ref column is the one thing that has to survive the round trip. It is
  // an opaque fragment of the driver id, meaningless on its own, and it is
  // what lets a returned sheet match exactly instead of by name. Two drivers
  // sharing a surname is a certainty on a roster this size.
  if (view === 'roster_sheet') {
    const clientId = wanted
    if (!clientId) return NextResponse.json({ error: 'client_id is required' }, { status: 400 })
    if (allow(s, clientId) === false) {
      return NextResponse.json({ error: 'Not authorized for this client' }, { status: 403 })
    }
    const { data: client } = await db().from('da_clients')
      .select('id, name, query_balance, query_balance_as_of').eq('id', clientId).maybeSingle()
    if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data: drivers } = await pageAll(() => db().from('da_drivers')
      .select('id, full_name, dob_year, active').eq('client_id', clientId).eq('active', true)
      .order('full_name'))

    const rows = (drivers || []).map(d => ({
      ref: d.id.slice(0, 8),
      full_name: d.full_name,
      dob_on_file: !!d.dob_year,
    }))

    const today = new Date().toISOString().slice(0, 10)
    const csv = [
      ['Ref', 'Driver', 'Still Employed (Y/N)', 'Date of Birth (MM/DD/YYYY)', 'Notes'].join(','),
      ...rows.map(r => [r.ref, '"' + r.full_name.replace(/"/g, '""') + '"',
                        '', r.dob_on_file ? 'ON FILE' : '', ''].join(',')),
    ].join('\n')

    const cover = [
      'SLP ALASKA - DRIVER ROSTER CONFIRMATION',
      'Client: ' + client.name,
      'Date:   ' + today,
      '',
      'We administer your FMCSA Clearinghouse queries as your C/TPA. To keep',
      'your annual query obligation (49 CFR 382.701) accurate we need two',
      'things from you.',
      '',
      '1. CONFIRM THE ROSTER',
      '   Mark each driver below Y or N for still employed and CDL-active.',
      '   Please do not delete rows - mark them N so we keep the history.',
      '',
      '2. DATE OF BIRTH',
      '   Fill in the date of birth for every driver marked Y. FMCSA requires',
      '   it to run a query and we cannot submit one without it. Rows already',
      '   marked ON FILE can be left alone.',
      '',
      '3. YOUR CLEARINGHOUSE QUERY BALANCE',
      '   How many queries remain on your Clearinghouse plan today? ______',
      '   As your C/TPA we can run your queries but we cannot buy them for',
      '   you, so we need your number to plan.',
      '',
      client.query_balance != null
        ? '   Our last record: ' + client.query_balance + ', as of ' + (client.query_balance_as_of || 'unknown') + '.'
        : '   We have no balance on record for you.',
      '',
      'Return this file as-is. Please do not add or reorder columns, and leave',
      'the Ref column untouched - it is how we match your answers back without',
      'putting CDL numbers in an email.',
      '',
      rows.length + ' driver(s) listed. No CDL numbers appear in this file.',
    ].join('\n')

    return NextResponse.json({
      client: { id: client.id, name: client.name },
      driver_count: rows.length,
      missing_dob: rows.filter(r => !r.dob_on_file).length,
      filename: client.name.replace(/[^A-Za-z0-9]+/g, '_') + '_roster_confirmation_' + today + '.csv',
      cover, csv, rows,
    })
  }

  // What changing frequency mid-year does to the annual position.
  //
  // The annual minimum is a RATE against the pool, not a count of periods, so
  // switching monthly to quarterly does not reduce what is owed - it reduces
  // how many chances are left to deliver it. This exists so that trade is
  // visible before it is saved rather than discovered in December.
  if (view === 'frequency_preview') {
    const clientId = wanted
    const to = url.searchParams.get('to')
    if (!clientId) return NextResponse.json({ error: 'client_id is required' }, { status: 400 })
    if (!PERIODS_PER_YEAR[to]) {
      return NextResponse.json({ error: "to must be 'monthly' or 'quarterly'" }, { status: 400 })
    }
    if (allow(s, clientId) === false) {
      return NextResponse.json({ error: 'Not authorized for this client' }, { status: 403 })
    }

    const { data: pools } = await pageAll(() => db().from('da_pools')
      .select('*').eq('client_id', clientId).eq('active', true))
    if (!pools || !pools.length) {
      return NextResponse.json({ error: 'This client has no pool of its own' }, { status: 400 })
    }

    const year = String(new Date().getUTCFullYear())
    const out = []
    for (const pool of pools) {
      const { data: members } = await pageAll(() => db().from('da_pool_members')
        .select('id').eq('pool_id', pool.id).eq('active', true))
      const size = (members || []).length
      const rates = ratesFor(pool)

      const { data: pulls } = await pageAll(() => db().from('da_pulls')
        .select('id, period_label, drug_select_count, alcohol_select_count, pool_size_at_pull')
        .eq('pool_id', pool.id).like('period_label', `${year}%`))
      const done = pulls || []

      // Completed tests, not selected ones. A selection that was never tested
      // does not count towards the minimum and must not flatter the number.
      const pullIds = done.map(p => p.id)
      let completedDrug = 0, completedAlcohol = 0
      if (pullIds.length) {
        const { data: sels } = await pageAll(() => db().from('da_selections')
          .select('test_type, status').in('pull_id', pullIds).eq('status', 'completed'))
        for (const x of sels || []) {
          if (x.test_type === 'drug' || x.test_type === 'both') completedDrug++
          if (x.test_type === 'alcohol' || x.test_type === 'both') completedAlcohol++
        }
      }

      // Periods elapsed and remaining, under each frequency.
      const month = new Date().getUTCMonth() + 1
      const elapsed = (f) => f === 'monthly' ? month : Math.floor((month - 1) / 3) + 1
      const ranLabels = new Set(done.map(p => p.period_label))
      const remaining = (f) => Math.max(0, PERIODS_PER_YEAR[f] - elapsed(f))

      const project = (f) => {
        const perPull = {
          drug: drawCount(size, rates.drug, f),
          alcohol: drawCount(size, rates.alcohol, f),
        }
        const left = remaining(f)
        return {
          frequency: f,
          periods_per_year: PERIODS_PER_YEAR[f],
          per_pull: perPull,
          periods_remaining: left,
          projected_drug: completedDrug + perPull.drug * left,
          projected_alcohol: completedAlcohol + perPull.alcohol * left,
        }
      }

      const requiredDrug = Math.ceil(size * Number(rates.drug) / 100)
      const requiredAlcohol = Math.ceil(size * Number(rates.alcohol) / 100)
      const now = project(pool.frequency)
      const next = project(to)

      out.push({
        pool_id: pool.id, pool_kind: pool.pool_kind, pool_size: size,
        rates, pulls_run_this_year: done.length,
        periods_already_run: [...ranLabels].sort(),
        completed: { drug: completedDrug, alcohol: completedAlcohol },
        required: { drug: requiredDrug, alcohol: requiredAlcohol },
        current: now, proposed: next,
        // The whole point of the preview.
        shortfall_if_changed: {
          drug: Math.max(0, requiredDrug - next.projected_drug),
          alcohol: Math.max(0, requiredAlcohol - next.projected_alcohol),
        },
        shortfall_if_unchanged: {
          drug: Math.max(0, requiredDrug - now.projected_drug),
          alcohol: Math.max(0, requiredAlcohol - now.projected_alcohol),
        },
      })
    }
    return NextResponse.json({ year, from: pools[0].frequency, to, pools: out })
  }

  // The blank sheet, so it is built once and built right.
  if (view === 'history_template') {
    const { data: clients } = await pageAll(() => db().from('da_clients')
      .select('name').eq('active', true).order('name'))
    const header = [
      'external_ref', 'client', 'employee_name', 'employee_id',
      'test_date', 'program', 'test_kind', 'reason', 'outcome',
      'drugs_positive_for', 'lab_confirmation_date', 'lab_outcome', 'notes',
    ]
    const examples = [
      ['P-2024-0417', 'Pollard Wireline', 'Morris, Jack', 'PW-0142',
       '04/17/2024', 'DOT', 'drug', 'random', 'negative', '', '', '', ''],
      ['P-2024-0418', 'Pollard Wireline', 'Perl, Luke', 'PW-0187',
       '04/18/2024', 'DOT', 'alcohol', 'random', '0.04-or-more', '', '', '',
       'confirmation 0.061'],
      ['P-2024-0503', 'Pollard Wireline', 'Coon, Jonathan', 'PW-0203',
       '05/03/2024', 'DOT', 'drug', 'pre-employment', 'positive', 'marijuana', '', '', ''],
      ['S-2024-0611', 'Summit Excavation', 'Willey, Scot', 'SE-014',
       '06/11/2024', 'NON_DOT', 'drug', 'post-accident', 'non-negative-sent-to-lab',
       '', '06/14/2024', 'positive', 'instant presumptive, lab confirmed'],
      ['S-2024-0612', 'Summit Excavation', 'Taylor, Neilo', 'SE-021',
       '06/12/2024', 'NON_DOT', 'drug', 'random', 'negative', '', '', '', ''],
    ]
    const csv = [header.join(','),
      ...examples.map(r => r.map(c => /[",]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c).join(','))
    ].join('\n')
    return NextResponse.json({
      header, examples, csv,
      filename: 'slp_test_history_template.csv',
      clients: (clients || []).map(c => c.name),
      vocabulary: {
        program: ['DOT', 'NON_DOT'],
        test_kind: ['drug', 'alcohol'],
        reason: ['pre-employment', 'random', 'post-accident',
                 'reasonable-suspicion', 'return-to-duty', 'follow-up'],
        outcome_dot_drug: ['negative', 'positive', 'refusal-adulterated',
                           'refusal-substituted', 'refusal-shy-bladder',
                           'refusal-other', 'cancelled'],
        outcome_dot_alcohol: ['negative', '0.02-0.039', '0.04-or-more',
                              'refusal-shy-lung', 'refusal-other', 'cancelled'],
        outcome_nondot_instant: ['negative', 'non-negative-sent-to-lab'],
        lab_outcome: ['negative', 'positive', 'adulterated', 'substituted',
                      'invalid', 'cancelled'],
        drugs_positive_for: ['marijuana', 'cocaine', 'pcp', 'opiates', 'amphetamines'],
      },
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
    // Frequency is per client, and changeable after the fact.
    //
    // It is stored on the POOL rather than the client because a consortium
    // applies its rate to the combined pool and cannot run on two calendars
    // at once. For a client that owns its own pools this is the same thing as
    // a per-client setting; for a consortium member it is not, which is why a
    // consortium pool is refused here rather than silently skipped.
    case 'set_frequency': {
      const clientId = body.client_id
      const freq = body.frequency
      if (!clientId) return NextResponse.json({ error: 'client_id is required' }, { status: 400 })
      if (!PERIODS_PER_YEAR[freq]) {
        return NextResponse.json({ error: "frequency must be 'monthly' or 'quarterly'" }, { status: 400 })
      }
      if (allow(s, clientId) === false) {
        return NextResponse.json({ error: 'Not authorized for this client' }, { status: 403 })
      }
      const { data: pools } = await pageAll(() => db().from('da_pools')
        .select('id, pool_kind, frequency, consortium_id').eq('client_id', clientId).eq('active', true))
      if (!pools || !pools.length) {
        return NextResponse.json(
          { error: 'This client has no pool of its own. A consortium pool runs on the consortium calendar.' },
          { status: 400 })
      }
      const { data, error } = await db().from('da_pools')
        .update({ frequency: freq }).eq('client_id', clientId).eq('active', true).select()
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      console.warn('[da] frequency for client=%s set to %s by %s', clientId, freq, actor)
      return NextResponse.json({ pools: data, frequency: freq })
    }

    // ---- Historical test records ------------------------------------------
    //
    // DOT rows store an MIS outcome bucket and nothing else - no individual
    // verified result, same rule as everywhere else in this module. Non-DOT
    // instant tests DO store a per-person result, but only through the
    // negative_final / non_negative_sent_to_lab structure, so a bare positive
    // remains unrecordable off the instant device.
    //
    // Idempotent: a row is matched on external_ref where the sheet has one,
    // otherwise on the natural key of person, day, programme, kind and reason.
    // Re-importing the same sheet applies nothing.
    case 'import_test_history': {
      if (!s.isStaff) {
        return NextResponse.json(
          { error: 'Only SLP D&A administrators may import historical records' }, { status: 403 })
      }
      const rowsIn = Array.isArray(body.rows) ? body.rows : []
      if (!rowsIn.length) return NextResponse.json({ error: 'No rows supplied' }, { status: 400 })

      const { data: clients } = await pageAll(() => db().from('da_clients').select('id, name'))
      const norm = (v) => String(v || '').toLowerCase().replace(/[^a-z0-9]/g, '')
      const byClient = {}
      for (const c of clients || []) byClient[norm(c.name)] = c.id

      // Everyone we could plausibly link a name to.
      const { data: members } = await pageAll(() => db().from('da_pool_members')
        .select('id, client_id, full_name, employee_ident').eq('active', true))
      const { data: drivers } = await pageAll(() => db().from('da_drivers')
        .select('id, client_id, full_name').eq('active', true))

      const REASON = {
        'preemployment': 'pre_employment', 'pre_employment': 'pre_employment',
        'random': 'random',
        'postaccident': 'post_accident', 'post_accident': 'post_accident',
        'reasonablesuspicion': 'reasonable_suspicion', 'reasonablecause': 'reasonable_suspicion',
        'returntoduty': 'return_to_duty', 'rtd': 'return_to_duty',
        'followup': 'follow_up',
      }
      const DRUG_MIS = {
        'negative': 'verified_negative', 'verifiednegative': 'verified_negative',
        'positive': 'verified_positive', 'verifiedpositive': 'verified_positive',
        'refusaladulterated': 'refusal_adulterated', 'adulterated': 'refusal_adulterated',
        'refusalsubstituted': 'refusal_substituted', 'substituted': 'refusal_substituted',
        'refusalshybladder': 'refusal_shy_bladder_no_medical', 'shybladder': 'refusal_shy_bladder_no_medical',
        'refusalother': 'refusal_other', 'refusal': 'refusal_other',
        'cancelled': 'cancelled', 'canceled': 'cancelled',
      }
      const ALC = {
        'negative': ['below_002', 'not_required'],
        'below002': ['below_002', 'not_required'],
        '002': ['002_or_greater', 'not_required'],
        '0020039': ['002_or_greater', '002_through_0039'],
        '004ormore': ['002_or_greater', '004_or_greater'],
        '004': ['002_or_greater', '004_or_greater'],
        'refusalshylung': ['refusal_shy_lung_no_medical', null],
        'shylung': ['refusal_shy_lung_no_medical', null],
        'refusalother': ['refusal_other', null],
        'refusal': ['refusal_other', null],
        'cancelled': ['cancelled', null], 'canceled': ['cancelled', null],
      }
      const INSTANT = {
        'negative': 'negative_final', 'negativefinal': 'negative_final',
        'nonnegativesenttolab': 'non_negative_sent_to_lab',
        'nonnegative': 'non_negative_sent_to_lab',
      }
      const LAB = ['negative', 'positive', 'adulterated', 'substituted', 'invalid', 'cancelled']
      const DRUGS = ['marijuana', 'cocaine', 'pcp', 'opiates', 'amphetamines']

      const parseDate = (raw) => {
        const t = String(raw || '').trim()
        let m = t.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
        if (m) return `${m[3]}-${String(m[1]).padStart(2, '0')}-${String(m[2]).padStart(2, '0')}`
        m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/)
        return m ? t : null
      }

      const { data: batch } = await db().from('da_import_batches').insert([{
        kind: 'test_history', filename: body.filename || null,
        imported_by: actor, row_count: rowsIn.length,
      }]).select().single()

      const applied = [], skipped = [], rejected = [], unmatchedPeople = []
      for (let i = 0; i < rowsIn.length; i++) {
        const r = rowsIn[i]
        const line = i + 2  // header is line 1
        const reject = (why) => rejected.push({ line, client: r.client, name: r.employee_name, why })

        const clientId = byClient[norm(r.client)]
        if (!clientId) { reject(`client "${r.client || '(blank)'}" is not a known D&A client`); continue }

        const name = String(r.employee_name || '').trim()
        if (!name) { reject('employee_name is blank'); continue }

        const date = parseDate(r.test_date)
        if (!date) { reject(`test_date "${r.test_date || '(blank)'}" is not MM/DD/YYYY or YYYY-MM-DD`); continue }

        const program = norm(r.program) === 'dot' ? 'DOT'
          : (norm(r.program) === 'nondot' ? 'NON_DOT' : null)
        if (!program) { reject(`program "${r.program || '(blank)'}" must be DOT or NON_DOT`); continue }

        const kind = norm(r.test_kind) === 'drug' ? 'drug'
          : (norm(r.test_kind) === 'alcohol' ? 'alcohol' : null)
        if (!kind) { reject(`test_kind "${r.test_kind || '(blank)'}" must be drug or alcohol`); continue }

        const reason = REASON[norm(r.reason)]
        if (!reason) { reject(`reason "${r.reason || '(blank)'}" is not one of the six`); continue }

        // Outcome, whose vocabulary depends on programme and kind.
        const oc = norm(r.outcome)
        const ev = {
          client_id: clientId, subject_name: name,
          subject_ident: String(r.employee_id || '').trim() || null,
          program, test_kind: kind, reason, event_date: date,
          status: 'completed',
          external_ref: String(r.external_ref || '').trim() || null,
          import_batch: batch.id, imported_at: new Date().toISOString(), imported_by: actor,
          notes: String(r.notes || '').trim() || null,
        }
        let instantOutcome = null
        if (program === 'DOT' && kind === 'drug') {
          const b = DRUG_MIS[oc]
          if (!b) { reject(`outcome "${r.outcome}" is not a DOT drug outcome`); continue }
          ev.drug_mis_outcome = b
          if (b === 'verified_positive') {
            const list = String(r.drugs_positive_for || '').split(/[;,|]/)
              .map(x => norm(x)).filter(Boolean)
            const bad = list.filter(x => !DRUGS.includes(x))
            if (bad.length) { reject(`drugs_positive_for has unknown value(s): ${bad.join(', ')}`); continue }
            ev.drug_positive_for = list
          }
        } else if (program === 'DOT' && kind === 'alcohol') {
          const pair = ALC[oc]
          if (!pair) { reject(`outcome "${r.outcome}" is not a DOT alcohol outcome`); continue }
          ev.alcohol_screen_mis = pair[0]
          ev.alcohol_confirm_mis = pair[1]
        } else if (kind === 'alcohol') {
          const pair = ALC[oc]
          if (!pair) { reject(`outcome "${r.outcome}" is not an alcohol outcome`); continue }
          ev.alcohol_screen_mis = pair[0]
          ev.alcohol_confirm_mis = pair[1]
        } else {
          // Non-DOT drug: the instant-test structure.
          instantOutcome = INSTANT[oc]
          if (!instantOutcome) {
            reject(`outcome "${r.outcome}" must be negative or non-negative-sent-to-lab for a non-DOT drug test`)
            continue
          }
          // The MIS buckets are a DOT concept; a non-DOT row carries none, so
          // the event is recorded as notified rather than completed and the
          // result lives on the instant test and its lab confirmation.
          ev.status = 'notified'
        }

        // Already here?
        let dupe = null
        if (ev.external_ref) {
          const { data: d } = await db().from('da_test_events').select('id')
            .eq('client_id', clientId).eq('external_ref', ev.external_ref).maybeSingle()
          dupe = d
        } else {
          const { data: d } = await db().from('da_test_events').select('id')
            .eq('client_id', clientId).eq('event_date', date).eq('program', program)
            .eq('test_kind', kind).eq('reason', reason)
            .ilike('subject_name', name).maybeSingle()
          dupe = d
        }
        if (dupe) { skipped.push({ line, name, why: 'already imported' }); continue }

        // Link the person where we can, and say so when we cannot.
        const ident = String(r.employee_id || '').trim()
        const cand = (members || []).filter(m => m.client_id === clientId && norm(m.full_name) === norm(name))
        let member = cand.length === 1 ? cand[0]
          : cand.find(m => ident && norm(m.employee_ident) === norm(ident)) || null
        if (member) ev.member_id = member.id
        else {
          const dcand = (drivers || []).filter(d => d.client_id === clientId && norm(d.full_name) === norm(name))
          if (dcand.length !== 1) {
            ev.subject_unmatched = true
            unmatchedPeople.push({ line, name, client: r.client,
              why: cand.length > 1 ? 'name is not unique for this client' : 'no pool member or driver of that name' })
          }
        }

        const { data: made, error } = await db().from('da_test_events').insert([ev]).select().single()
        if (error) {
          if (error.code === '23505') { skipped.push({ line, name, why: 'already imported' }); continue }
          reject(error.message.slice(0, 120)); continue
        }

        if (instantOutcome) {
          const sentAt = instantOutcome === 'non_negative_sent_to_lab'
            ? (parseDate(r.lab_confirmation_date) || date) + 'T00:00:00Z' : null
          const { data: it, error: ie } = await db().from('da_instant_tests').insert([{
            test_event_id: made.id, client_id: clientId,
            collected_at: date + 'T00:00:00Z',
            instant_outcome: instantOutcome,
            sent_to_lab_at: sentAt,
            notes: String(r.notes || '').trim() || null,
          }]).select().single()
          if (ie) { reject('instant test: ' + ie.message.slice(0, 100)); continue }

          const labRaw = norm(r.lab_outcome)
          if (labRaw) {
            if (instantOutcome !== 'non_negative_sent_to_lab') {
              reject('lab_outcome given but the instant outcome was negative; a negative goes to no lab')
              continue
            }
            const lab = LAB.find(x => norm(x) === labRaw)
            if (!lab) { reject(`lab_outcome "${r.lab_outcome}" is not a known value`); continue }
            const { error: le } = await db().from('da_lab_confirmations').insert([{
              instant_test_id: it.id, client_id: clientId,
              reported_at: (parseDate(r.lab_confirmation_date) || date) + 'T00:00:00Z',
              outcome: lab,
              substances: lab === 'positive'
                ? String(r.drugs_positive_for || '').split(/[;,|]/).map(x => norm(x)).filter(Boolean) : [],
            }])
            if (le) { reject('lab confirmation: ' + le.message.slice(0, 100)); continue }
          }
        }
        applied.push({ line, name, client: r.client })
      }

      await db().from('da_import_batches').update({
        applied: applied.length, skipped: skipped.length, rejected: rejected.length,
      }).eq('id', batch.id)

      return NextResponse.json({
        batch_id: batch.id,
        applied: applied.length, skipped: skipped.length, rejected: rejected.length,
        rejected_rows: rejected,
        unmatched_people: unmatchedPeople,
        detail: { applied: applied.slice(0, 50), skipped: skipped.slice(0, 50) },
      })
    }

    // ---- DOB import -------------------------------------------------------
    //
    // Matching order, strictest first:
    //   1. Ref  - the opaque id fragment from the sheet we sent. Exact.
    //   2. Name + CDL last four, where the client happens to supply it.
    //   3. Name alone, ONLY when it is unique within that client.
    //
    // Anything else is reported. A roster this size will have two drivers
    // sharing a surname, and writing a date of birth onto the wrong person is
    // not a mistake worth risking to save a manual line.
    case 'import_dobs': {
      const clientId = body.client_id
      if (!clientId) return NextResponse.json({ error: 'client_id is required' }, { status: 400 })
      if (allow(s, clientId) === false) {
        return NextResponse.json({ error: 'Not authorized for this client' }, { status: 403 })
      }
      const rowsIn = Array.isArray(body.rows) ? body.rows : []
      if (!rowsIn.length) return NextResponse.json({ error: 'No rows supplied' }, { status: 400 })

      const { data: drivers } = await pageAll(() => db().from('da_drivers')
        .select('id, full_name, cdl_last4, dob_year, active').eq('client_id', clientId))
      const all = drivers || []
      const norm = (v) => String(v || '').toLowerCase().replace(/[^a-z]/g, '')

      const applied = [], unchanged = [], conflicts = [], unmatched = [], invalid = []
      const employment = []

      for (const r of rowsIn) {
        const ref = String(r.ref || '').trim().toLowerCase()
        const name = String(r.driver_name || r.driver || r.full_name || '').trim()
        const last4 = String(r.cdl_last4 || r.cdl || '').replace(/[^A-Za-z0-9]/g, '').slice(-4)
        const rawDob = String(r.dob || r.date_of_birth || '').trim()
        const still = String(r.still_employed || r.employed || '').trim().toUpperCase()

        let hit = null, why = ''
        if (ref) {
          const m = all.filter(d => d.id.slice(0, 8).toLowerCase() === ref)
          if (m.length === 1) hit = m[0]
          else why = m.length ? 'ref matched more than one driver' : 'ref not recognised'
        }
        if (!hit && name) {
          let m = all.filter(d => norm(d.full_name) === norm(name))
          if (last4) {
            const withCdl = m.filter(d => d.cdl_last4 === last4)
            if (withCdl.length) m = withCdl
            else if (m.length && m.every(d => d.cdl_last4)) {
              why = 'name matched but CDL last four did not (sheet says ' + last4 + ')'
              m = []
            }
          }
          if (m.length === 1) hit = m[0]
          else if (m.length > 1) why = 'name is not unique for this client (' + m.length + ' matches) and no CDL last four supplied'
          else if (!why) why = 'no driver of that name for this client'
        }
        if (!hit) { unmatched.push({ ref, name, dob: rawDob, why: why || 'no ref or name supplied' }); continue }

        if (still === 'N' || still === 'NO') {
          // Recorded for a decision, never acted on here.
          employment.push({ driver_id: hit.id, full_name: hit.full_name, answer: 'no longer employed' })
        }

        if (!rawDob || rawDob.toUpperCase() === 'ON FILE') {
          if (!hit.dob_year) unmatched.push({ ref, name: hit.full_name, why: 'no date of birth supplied' })
          continue
        }

        // Accept MM/DD/YYYY and YYYY-MM-DD; refuse anything ambiguous.
        let iso = null
        const m1 = rawDob.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
        const m2 = rawDob.match(/^(\d{4})-(\d{2})-(\d{2})$/)
        if (m1) iso = m1[3] + '-' + String(m1[1]).padStart(2, '0') + '-' + String(m1[2]).padStart(2, '0')
        else if (m2) iso = rawDob
        const dt = iso ? new Date(iso + 'T00:00:00Z') : null
        const year = dt ? dt.getUTCFullYear() : NaN
        if (!dt || isNaN(dt.getTime()) || year < 1920 || year > new Date().getUTCFullYear() - 16) {
          invalid.push({ ref, name: hit.full_name, dob: rawDob,
                         why: iso ? 'date out of a plausible range for a CDL holder' : 'unrecognised date format' })
          continue
        }

        // Already holding one? Compare before writing, so a re-import of the
        // same sheet is a no-op and a DIFFERENT date is surfaced rather than
        // quietly replacing what is there.
        if (hit.dob_year) {
          const { data: existing } = await db().rpc('da_reveal_dob', { p_driver: hit.id })
          const cur = String(existing || '').slice(0, 10)
          if (cur === iso) { unchanged.push({ name: hit.full_name, dob: iso }); continue }
          conflicts.push({ name: hit.full_name, stored: cur, incoming: iso })
          continue
        }

        const { error } = await db().rpc('da_store_dob', { p_driver: hit.id, p_dob: iso })
        if (error) { invalid.push({ ref, name: hit.full_name, dob: rawDob, why: error.message }); continue }
        applied.push({ name: hit.full_name, dob_year: year })
      }

      console.warn('[da] DOB import for client=%s by %s: %d applied, %d unmatched',
                   clientId, s.user.email, applied.length, unmatched.length)
      return NextResponse.json({
        applied: applied.length, unchanged: unchanged.length,
        conflicts, unmatched, invalid,
        // Reported only. Nobody is deactivated without a separate decision.
        employment_flags: employment,
        detail: { applied, unchanged },
      })
    }

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

// app/api/sail/route.js
//
// Server-side SAIL log access, scoped to the caller's company.
//
// WHY THIS ROUTE EXISTS
//
// app/sail-management/page.js used to query `sail_log` straight from the
// browser with the anon key, and filtered by company with a dropdown that
// defaults to "All". That is a UI convenience, not a boundary: the filter is
// chosen by the client, so any signed-in caller could read every tenant's
// records by leaving it alone. Whatever the page showed, the anon key could
// fetch the rest.
//
// Every read and write now goes through here, where the company filter is
// derived from the caller's own session and cannot be chosen by the request.
//
// Scope comes from app/lib/companyAccess.js, which reads the one source of
// truth for who administers which company: lms_users.role + company_id.
//
// Created lazily so `next build`'s page-data collection does not need the
// service-role key at module load.

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { pageAll } from '@/lib/supabasePage'
import { resolveSailScope, scopeSailQuery, scopeAllowsCompany } from '@/lib/companyAccess'

let _admin = null
function getAdmin() {
  if (!_admin) {
    _admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
  }
  return _admin
}

// Columns a company admin may change. Everything else on a SAIL row —
// client_company above all — is fixed: letting a caller write client_company
// would let them move a record into, or out of, their own tenant.
const EDITABLE = [
  'status', 'assigned_to', 'assigned_to_email', 'target_completion_date',
  'priority', 'hierarchy_control', 'corrective_action', 'immediate_action',
  'action_item_description', 'notes',
]

/**
 * GET /api/sail
 *
 * Returns every SAIL row the caller may see. Paginated with pageAll, because
 * PostgREST caps a response at 1000 rows server-side and an unpaginated read
 * would silently drop the overflow — a closed item past row 1000 looks
 * identical to one that was never logged.
 */
export async function GET(request) {
  const supabaseAdmin = getAdmin()
  const scope = await resolveSailScope(request, supabaseAdmin)
  if (!scope.ok) return scope.response

  const { data, error } = await pageAll(() =>
    scopeSailQuery(
      supabaseAdmin.from('sail_log').select('*').order('date', { ascending: false }),
      scope
    )
  )
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({
    rows: data || [],
    scope: {
      // So the page can label itself and hide the company picker for a
      // single-tenant caller. Not a permission — the filter above is.
      all_companies: scope.isSuper,
      company_name: scope.companyName,
    },
  })
}

/**
 * PATCH /api/sail  { id, updates: {...} }
 *
 * Updates one SAIL item. The row's own client_company is read from the
 * database and checked against the caller's scope before anything is written:
 * taking the company from the request body would let a caller name their own
 * company alongside another tenant's row id.
 */
export async function PATCH(request) {
  const supabaseAdmin = getAdmin()
  const scope = await resolveSailScope(request, supabaseAdmin)
  if (!scope.ok) return scope.response

  let body
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { id, updates } = body || {}
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })
  if (!updates || typeof updates !== 'object') {
    return NextResponse.json({ error: 'updates object is required' }, { status: 400 })
  }

  const { data: row, error: lookupErr } = await supabaseAdmin
    .from('sail_log')
    .select('id, client_company, status')
    .eq('id', id)
    .maybeSingle()
  if (lookupErr) return NextResponse.json({ error: lookupErr.message }, { status: 400 })
  // 404 for a row outside the caller's scope as well as one that does not
  // exist, so the response cannot be used to probe which ids belong to other
  // tenants.
  if (!row || !scopeAllowsCompany(scope, row.client_company)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const clean = {}
  for (const k of EDITABLE) {
    if (updates[k] !== undefined) clean[k] = updates[k] === '' ? null : updates[k]
  }
  if (Object.keys(clean).length === 0) {
    return NextResponse.json({ error: 'No editable fields supplied' }, { status: 400 })
  }

  // Closure bookkeeping, kept server-side so it cannot be forged.
  const today = new Date().toLocaleDateString('en-CA')
  if (clean.status === 'Closed' && row.status !== 'Closed') {
    clean.date_closed = today
    clean.closure_date = today
    clean.closed_by = scope.isSuper ? 'SLP Safety' : (scope.companyName || 'Company Admin')
  }
  if (clean.status && clean.status !== 'Closed' && row.status === 'Closed') {
    clean.date_closed = null
    clean.closure_date = null
    clean.closed_by = null
  }

  const { data, error } = await supabaseAdmin
    .from('sail_log').update(clean).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ row: data })
}

/**
 * DELETE /api/sail?id=...
 *
 * SLP staff only. A SAIL item is a safety finding against a company; letting
 * that company's own admin delete it would let the subject of a finding erase
 * it. Company admins close items instead, which keeps the record.
 */
export async function DELETE(request) {
  const supabaseAdmin = getAdmin()
  const scope = await resolveSailScope(request, supabaseAdmin)
  if (!scope.ok) return scope.response
  if (!scope.isSuper) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const { error } = await supabaseAdmin.from('sail_log').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}

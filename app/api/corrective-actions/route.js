// app/api/corrective-actions/route.js
//
// Server-side corrective-action (CA) list + close-out, scoped to the caller.
// Scope rules live in app/lib/caAccess.js. The page at /corrective-actions is
// what the CA nag email links to; it reads and writes ONLY through here.
//
// GET  /api/corrective-actions            -> { rows, scope }
// POST /api/corrective-actions            -> { ok, row }
//      body { id, action_status, notes }
//
// Created lazily so `next build` does not need the service-role key.

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { resolveCaScope, caAccessReason, OWNER_STATUSES, STAFF_STATUSES, CLOSED_STATUSES } from '@/lib/caAccess'

let _admin = null
function getAdmin() {
  if (!_admin) {
    _admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://iypezirwdlqpptjpeeyf.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
  }
  return _admin
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const INC_COLS = 'id, incident_id, brief_description, incident_date, company_name, location_name'
const CA_COLS = 'id, incident_id, action_number, action_description, description, hierarchy_control, action_owner_name, action_owner_email, target_date, due_date, action_status, status, completed_at, verification_method, completion_notes, completed_by_email'

// incident_id on a CA is either the incident's uuid or its INC-YYYY-NNNN code.
async function loadIncidents(admin, keys) {
  const uuids = [...new Set(keys.filter((k) => UUID.test(k)))]
  const codes = [...new Set(keys.filter((k) => k && !UUID.test(k)))]
  const out = new Map()
  for (let i = 0; i < uuids.length; i += 200) {
    const { data, error } = await admin.from('incidents').select(INC_COLS).in('id', uuids.slice(i, i + 200))
    if (error) throw error
    for (const r of data || []) out.set(String(r.id), r)
  }
  for (let i = 0; i < codes.length; i += 200) {
    const { data, error } = await admin.from('incidents').select(INC_COLS).in('incident_id', codes.slice(i, i + 200))
    if (error) throw error
    for (const r of data || []) out.set(String(r.incident_id), r)
  }
  return out
}

function effectiveStatus(ca) {
  const s = (ca.status || '').trim()
  const a = (ca.action_status || '').trim()
  if (CLOSED_STATUSES.includes(s.toLowerCase())) return s
  if (CLOSED_STATUSES.includes(a.toLowerCase())) return a
  return a || s || 'Open'
}

function shape(ca, inc, reason) {
  return {
    ...ca,
    effective_status: effectiveStatus(ca),
    access: reason,
    incident: inc ? {
      id: inc.id, incident_id: inc.incident_id, brief_description: inc.brief_description,
      incident_date: inc.incident_date, company_name: inc.company_name, location_name: inc.location_name,
    } : null,
  }
}

export async function GET(request) {
  const admin = getAdmin()
  const scope = await resolveCaScope(request, admin)
  if (!scope.ok) return scope.response
  try {
    let cas = []
    if (scope.isStaff) {
      const { data, error } = await admin.from('investigation_corrective_actions').select(CA_COLS).order('target_date', { ascending: true }).limit(5000)
      if (error) throw error
      cas = data || []
    } else {
      const byId = new Map()
      const { data: mine, error: e1 } = await admin.from('investigation_corrective_actions').select(CA_COLS).ilike('action_owner_email', `%${scope.email}%`) // candidates only; exact per-address re-check below
      if (e1) throw e1
      for (const r of mine || []) byId.set(r.id, r)
      if (scope.companyNames.length) {
        // Incidents of the admin's own company, matched case-insensitively.
        const { data: incs, error: e2 } = await admin.from('incidents').select('id, incident_id, company_name').not('company_name', 'is', null).limit(10000)
        if (e2) throw e2
        const keys = []
        for (const i of incs || []) {
          if (scope.companyNames.includes((i.company_name || '').trim().toLowerCase())) {
            keys.push(String(i.id)); if (i.incident_id) keys.push(String(i.incident_id))
          }
        }
        for (let i = 0; i < keys.length; i += 200) {
          const { data, error } = await admin.from('investigation_corrective_actions').select(CA_COLS).in('incident_id', keys.slice(i, i + 200))
          if (error) throw error
          for (const r of data || []) byId.set(r.id, r)
        }
      }
      cas = [...byId.values()]
    }
    const incs = await loadIncidents(admin, cas.map((c) => String(c.incident_id || '')))
    const rows = []
    for (const ca of cas) {
      const inc = incs.get(String(ca.incident_id || '')) || null
      const reason = caAccessReason(scope, ca, inc)
      if (reason) rows.push(shape(ca, inc, reason)) // re-check every row; never trust the query alone
    }
    rows.sort((a, b) => String(a.target_date || a.due_date || '9999').localeCompare(String(b.target_date || b.due_date || '9999')))
    return NextResponse.json({
      rows,
      scope: {
        all_companies: scope.isStaff,
        email: scope.email,
        company_name: scope.companyName,
        company_admin: scope.companyNames.length > 0,
        statuses: scope.isStaff ? STAFF_STATUSES : OWNER_STATUSES,
      },
    })
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Could not load corrective actions.' }, { status: 500 })
  }
}

export async function POST(request) {
  const admin = getAdmin()
  const scope = await resolveCaScope(request, admin)
  if (!scope.ok) return scope.response
  let body
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Bad request.' }, { status: 400 }) }
  const id = Number(body?.id)
  const nextStatus = String(body?.action_status || '').trim()
  const notes = String(body?.notes || '').trim()
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: 'Missing corrective action id.' }, { status: 400 })
  const allowed = scope.isStaff ? STAFF_STATUSES : OWNER_STATUSES
  if (!allowed.includes(nextStatus)) {
    return NextResponse.json({ error: `You can set: ${allowed.join(', ')}.` }, { status: 403 })
  }
  if (nextStatus === 'Completed' && notes.length < 15) {
    return NextResponse.json({ error: 'Describe what was done (at least a full sentence) before marking it Completed.', reason: 'notes_required' }, { status: 400 })
  }
  if (notes.length > 4000) return NextResponse.json({ error: 'Notes are too long (4000 characters max).' }, { status: 400 })

  const { data: ca, error: e1 } = await admin.from('investigation_corrective_actions').select(CA_COLS).eq('id', id).maybeSingle()
  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 })
  if (!ca) return NextResponse.json({ error: 'Corrective action not found.' }, { status: 404 })
  const incs = await loadIncidents(admin, [String(ca.incident_id || '')])
  const inc = incs.get(String(ca.incident_id || '')) || null
  const reason = caAccessReason(scope, ca, inc)
  if (!reason) return NextResponse.json({ error: 'Not authorized for this corrective action.' }, { status: 403 })

  const current = effectiveStatus(ca)
  if (!scope.isStaff && ['verified', 'verified effective', 'void', 'closed', 'cancelled', 'canceled'].includes(current.toLowerCase())) {
    return NextResponse.json({ error: `This action is already ${current}. Contact SLP Alaska to change it.` }, { status: 409 })
  }

  const nowIso = new Date().toISOString()
  const closing = CLOSED_STATUSES.includes(nextStatus.toLowerCase())
  const stamp = `[${nowIso.slice(0, 10)} ${scope.email} → ${nextStatus}] ${notes}`.trim()
  const patch = {
    action_status: nextStatus,
    status: nextStatus,
    completed_at: closing ? (ca.completed_at || nowIso) : null,
    completed_by_email: closing ? scope.email : null,
  }
  if (notes) patch.completion_notes = ca.completion_notes ? `${ca.completion_notes}\n${stamp}` : stamp

  const { data: row, error: e2 } = await admin.from('investigation_corrective_actions').update(patch).eq('id', id).select(CA_COLS).maybeSingle()
  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 })

  await admin.from('investigation_activity_log').insert({
    incident_id: String(ca.incident_id || ''),
    incident_id_text: inc?.incident_id || null,
    action: `CA-${ca.action_number ?? ca.id} set to ${nextStatus} (${reason})`,
    action_category: 'update',
    user_email: scope.email,
    entity_type: 'corrective_action',
    entity_id: String(ca.id),
    details: { from: current, to: nextStatus, notes, via: '/corrective-actions', access: reason },
  })

  return NextResponse.json({ ok: true, row: shape(row, inc, reason) })
}

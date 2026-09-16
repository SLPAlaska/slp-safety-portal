// /api/game/admin/crews
//
// Crew management for MagTec company admins and platform super admins.
//
// GET  — every crew with its roster, plus the full employee list so the UI can
//        show who is not on a crew yet.
// POST — one mutation per call, named by `action`.
//
// An admin assignment marks the membership row assigned_by_admin, which locks
// it against the player's own picker. The roster is the denominator of the
// crew score, so moving someone changes two crews' standings — that is the
// admin's call to make, not something a player should be able to undo from
// the game screen.
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { gameAdminClient } from '@/lib/game-auth'
import { resolveGameAdmin } from '@/lib/game-admin'
import { BOARDS, safeBoard } from '@/lib/game/featured'

/** Confirm every id names a user at the admin's company. */
async function ownUsers(supabase, companyId, ids) {
  const wanted = [...new Set(ids.filter(Boolean))]
  if (wanted.length === 0) return new Set()
  const { data } = await supabase
    .from('lms_users')
    .select('id')
    .eq('company_id', companyId)
    .in('id', wanted)
  return new Set((data || []).map((u) => u.id))
}

/** Confirm a crew belongs to the admin's company. */
async function ownCrew(supabase, companyId, crewId) {
  if (!crewId) return null
  const { data } = await supabase
    .from('lms_game_crews')
    .select('id, name, company_id, lead_user_id, board')
    .eq('id', crewId)
    .maybeSingle()
  return data && data.company_id === companyId ? data : null
}

export async function GET(request) {
  const admin = await resolveGameAdmin(request)
  if (!admin.ok) return NextResponse.json({ error: admin.code }, { status: admin.status })

  const supabase = gameAdminClient()
  const [{ data: crews }, { data: employees }] = await Promise.all([
    supabase
      .from('lms_game_crews')
      .select('id, name, lead_user_id, board')
      .eq('company_id', admin.companyId)
      .order('name'),
    supabase
      .from('lms_users')
      .select('id, full_name, job_title, active')
      .eq('company_id', admin.companyId)
      .eq('active', true)
      .order('full_name'),
  ])

  const crewIds = (crews || []).map((c) => c.id)
  const { data: members } = crewIds.length
    ? await supabase
        .from('lms_game_crew_members')
        .select('crew_id, user_id, assigned_by_admin')
        .in('crew_id', crewIds)
    : { data: [] }

  const crewOf = new Map((members || []).map((m) => [m.user_id, m]))
  const nameOf = new Map((employees || []).map((e) => [e.id, e.full_name]))

  return NextResponse.json({
    level: admin.level,
    boards: BOARDS,
    crews: (crews || []).map((c) => ({
      id: c.id,
      name: c.name,
      board: safeBoard(c.board),
      lead_user_id: c.lead_user_id,
      lead_name: c.lead_user_id ? (nameOf.get(c.lead_user_id) || null) : null,
      members: (members || [])
        .filter((m) => m.crew_id === c.id)
        .map((m) => ({
          user_id: m.user_id,
          full_name: nameOf.get(m.user_id) || 'Unknown',
          assigned_by_admin: m.assigned_by_admin,
        }))
        .sort((a, b) => a.full_name.localeCompare(b.full_name)),
    })),
    employees: (employees || []).map((e) => ({
      id: e.id,
      full_name: e.full_name,
      job_title: e.job_title || null,
      crew_id: crewOf.get(e.id)?.crew_id || null,
      assigned_by_admin: crewOf.get(e.id)?.assigned_by_admin || false,
    })),
  })
}

export async function POST(request) {
  const admin = await resolveGameAdmin(request)
  if (!admin.ok) return NextResponse.json({ error: admin.code }, { status: admin.status })

  let body = {}
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  const supabase = gameAdminClient()
  const { action } = body

  if (action === 'create_crew') {
    const name = String(body.name || '').trim()
    if (!name) return NextResponse.json({ error: 'name_required' }, { status: 400 })
    // Board decides which deck rotation and which crew board this crew is
    // ranked on. Unspecified means drilling, which is every crew today.
    const { data, error } = await supabase
      .from('lms_game_crews')
      .insert({ company_id: admin.companyId, name, board: safeBoard(body.board) })
      .select('id, name, board')
      .single()
    if (error) {
      // The unique index on (company_id, lower(name)) is what stops two crews
      // with the same name, which would make the board unreadable.
      if (error.code === '23505') {
        return NextResponse.json({ error: 'duplicate_name' }, { status: 409 })
      }
      console.error('crew create failed:', error.message)
      return NextResponse.json({ error: 'insert_failed' }, { status: 500 })
    }
    return NextResponse.json({ crew: data })
  }

  if (action === 'rename_crew') {
    const crew = await ownCrew(supabase, admin.companyId, body.crew_id)
    if (!crew) return NextResponse.json({ error: 'unknown_crew' }, { status: 404 })
    const name = String(body.name || '').trim()
    if (!name) return NextResponse.json({ error: 'name_required' }, { status: 400 })
    const { error } = await supabase
      .from('lms_game_crews').update({ name }).eq('id', crew.id)
    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'duplicate_name' }, { status: 409 })
      }
      return NextResponse.json({ error: 'update_failed' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  }

  if (action === 'set_lead') {
    const crew = await ownCrew(supabase, admin.companyId, body.crew_id)
    if (!crew) return NextResponse.json({ error: 'unknown_crew' }, { status: 404 })
    const leadId = body.user_id || null
    if (leadId) {
      const owned = await ownUsers(supabase, admin.companyId, [leadId])
      if (!owned.has(leadId)) return NextResponse.json({ error: 'unknown_user' }, { status: 400 })
    }
    const { error } = await supabase
      .from('lms_game_crews').update({ lead_user_id: leadId }).eq('id', crew.id)
    if (error) return NextResponse.json({ error: 'update_failed' }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (action === 'set_board') {
    const crew = await ownCrew(supabase, admin.companyId, body.crew_id)
    if (!crew) return NextResponse.json({ error: 'unknown_crew' }, { status: 404 })
    if (!BOARDS.includes(body.board)) {
      return NextResponse.json({ error: 'unknown_board' }, { status: 400 })
    }
    const { error } = await supabase
      .from('lms_game_crews').update({ board: body.board }).eq('id', crew.id)
    if (error) return NextResponse.json({ error: 'update_failed' }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (action === 'assign_member') {
    const crew = await ownCrew(supabase, admin.companyId, body.crew_id)
    if (!crew) return NextResponse.json({ error: 'unknown_crew' }, { status: 404 })
    const userId = body.user_id
    const owned = await ownUsers(supabase, admin.companyId, [userId])
    if (!owned.has(userId)) return NextResponse.json({ error: 'unknown_user' }, { status: 400 })

    // user_id is UNIQUE, so this upsert is the "move between crews" path too.
    const { error } = await supabase
      .from('lms_game_crew_members')
      .upsert(
        { crew_id: crew.id, user_id: userId, assigned_by_admin: true },
        { onConflict: 'user_id' },
      )
    if (error) {
      console.error('crew assign failed:', error.message)
      return NextResponse.json({ error: 'update_failed' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  }

  if (action === 'remove_member') {
    const owned = await ownUsers(supabase, admin.companyId, [body.user_id])
    if (!owned.has(body.user_id)) {
      return NextResponse.json({ error: 'unknown_user' }, { status: 400 })
    }
    const { error } = await supabase
      .from('lms_game_crew_members').delete().eq('user_id', body.user_id)
    if (error) return NextResponse.json({ error: 'update_failed' }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (action === 'delete_crew') {
    const crew = await ownCrew(supabase, admin.companyId, body.crew_id)
    if (!crew) return NextResponse.json({ error: 'unknown_crew' }, { status: 404 })
    // Memberships cascade. Runs are untouched — they belong to the player, not
    // to the crew, and deleting a crew must never erase somebody's history.
    const { error } = await supabase.from('lms_game_crews').delete().eq('id', crew.id)
    if (error) return NextResponse.json({ error: 'delete_failed' }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'unknown_action' }, { status: 400 })
}

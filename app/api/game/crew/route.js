// POST /api/game/crew
//
// Self-selection: a player picks their crew on first visit.
//
// An admin's assignment outranks this. If a company admin has already placed
// someone, their own pick is refused rather than silently applied — the roster
// is the denominator of the crew score, so quietly letting people move
// themselves off a crew would change another crew's standing too.
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { resolveGamePlayer, gameAdminClient, MAGTEC_COMPANY_ID } from '@/lib/game-auth'

export async function POST(request) {
  let body = {}
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  const auth = await resolveGamePlayer(request, body.t)
  if (!auth.ok) return NextResponse.json({ error: auth.code }, { status: auth.status })

  const supabase = gameAdminClient()

  // The crew must exist and belong to MagTec — never trust an id from the wire
  // to be one this player is allowed to join.
  const { data: crew } = await supabase
    .from('lms_game_crews')
    .select('id, name, company_id')
    .eq('id', body.crew_id || '')
    .maybeSingle()

  if (!crew || crew.company_id !== MAGTEC_COMPANY_ID) {
    return NextResponse.json({ error: 'unknown_crew' }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from('lms_game_crew_members')
    .select('id, crew_id, assigned_by_admin')
    .eq('user_id', auth.user.id)
    .maybeSingle()

  if (existing?.assigned_by_admin) {
    return NextResponse.json({ error: 'admin_assigned' }, { status: 409 })
  }

  if (existing) {
    const { error } = await supabase
      .from('lms_game_crew_members')
      .update({ crew_id: crew.id })
      .eq('id', existing.id)
    if (error) {
      console.error('crew move failed:', error.message)
      return NextResponse.json({ error: 'update_failed' }, { status: 500 })
    }
  } else {
    const { error } = await supabase
      .from('lms_game_crew_members')
      .insert({ crew_id: crew.id, user_id: auth.user.id, assigned_by_admin: false })
    if (error) {
      console.error('crew join failed:', error.message)
      return NextResponse.json({ error: 'insert_failed' }, { status: 500 })
    }
  }

  return NextResponse.json({ crew: { id: crew.id, name: crew.name } })
}

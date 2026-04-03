export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// GET /api/lms/slides?course_id=xxx
export async function GET(request) {
  const supabase = adminClient()
  const { searchParams } = new URL(request.url)
  const course_id = searchParams.get('course_id')
  if (!course_id) return NextResponse.json({ error: 'Missing course_id' }, { status: 400 })

  const { data: slides, error } = await supabase
    .from('lms_slides')
    .select('id, slide_order, image_path, speaker_notes, audio_path')
    .eq('course_id', course_id)
    .order('slide_order')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL + '/storage/v1/object/public/lms-slides/'
  const slidesWithUrls = (slides || []).map(s => ({
    ...s,
    image_url: base + s.image_path
  }))

  return NextResponse.json({ slides: slidesWithUrls })
}

// DELETE /api/lms/slides  { id, course_id }
export async function DELETE(request) {
  const supabase = adminClient()
  const { id, course_id } = await request.json()
  if (!id || !course_id) return NextResponse.json({ error: 'Missing id or course_id' }, { status: 400 })

  // Get slide info before deleting
  const { data: slide } = await supabase
    .from('lms_slides')
    .select('slide_order, image_path')
    .eq('id', id)
    .single()

  if (!slide) return NextResponse.json({ error: 'Slide not found' }, { status: 404 })

  // Delete progress records for this slide
  await supabase.from('lms_progress').delete().eq('slide_id', id)

  // Delete the slide record
  const { error } = await supabase.from('lms_slides').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Renumber remaining slides so order stays contiguous
  const { data: remaining } = await supabase
    .from('lms_slides')
    .select('id')
    .eq('course_id', course_id)
    .order('slide_order')

  for (let i = 0; i < (remaining || []).length; i++) {
    await supabase.from('lms_slides').update({ slide_order: i + 1 }).eq('id', remaining[i].id)
  }

  // Try to delete the image from storage (non-fatal if it fails)
  if (slide.image_path) {
    await supabase.storage.from('lms-slides').remove([slide.image_path]).catch(() => {})
  }

  return NextResponse.json({ success: true })
}

// PATCH /api/lms/slides  { id, course_id, direction: 'up'|'down' }
export async function PATCH(request) {
  const supabase = adminClient()
  const { id, course_id, direction } = await request.json()
  if (!id || !course_id || !direction) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const { data: slides } = await supabase
    .from('lms_slides')
    .select('id, slide_order')
    .eq('course_id', course_id)
    .order('slide_order')

  if (!slides) return NextResponse.json({ error: 'No slides found' }, { status: 404 })

  const idx = slides.findIndex(s => s.id === id)
  if (idx === -1) return NextResponse.json({ error: 'Slide not found' }, { status: 404 })

  const swapIdx = direction === 'up' ? idx - 1 : idx + 1
  if (swapIdx < 0 || swapIdx >= slides.length)
    return NextResponse.json({ error: 'Cannot move slide in that direction' }, { status: 400 })

  const a = slides[idx]
  const b = slides[swapIdx]

  // Swap orders using a temp value to avoid unique constraint conflicts
  await supabase.from('lms_slides').update({ slide_order: 99999 }).eq('id', a.id)
  await supabase.from('lms_slides').update({ slide_order: a.slide_order }).eq('id', b.id)
  await supabase.from('lms_slides').update({ slide_order: b.slide_order }).eq('id', a.id)

  return NextResponse.json({ success: true })
}

// PUT /api/lms/slides  { id, speaker_notes }
export async function PUT(request) {
  const supabase = adminClient()
  const { id, speaker_notes } = await request.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { error } = await supabase
    .from('lms_slides')
    .update({ speaker_notes: speaker_notes || null, audio_path: null })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function extractJSON(text) {
  // Try direct parse first
  try { return JSON.parse(text) } catch {}
  // Strip markdown code blocks
  const stripped = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  try { return JSON.parse(stripped) } catch {}
  // Find JSON object in text
  const match = stripped.match(/\{[\s\S]*\}/)
  if (match) try { return JSON.parse(match[0]) } catch {}
  return null
}

export const maxDuration = 60`nexport const dynamic = 'force-dynamic'`n`nexport async function POST(request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  try {
    const { course_id, mode } = await request.json()
    if (!course_id || !mode)
      return NextResponse.json({ error: 'Missing course_id or mode.' }, { status: 400 })

    const { data: slides } = await supabaseAdmin
      .from('lms_slides')
      .select('id, slide_order, image_path, speaker_notes')
      .eq('course_id', course_id)
      .order('slide_order')

    if (!slides?.length)
      return NextResponse.json({ error: 'No slides found for this course.' }, { status: 404 })

    const { data: course } = await supabaseAdmin
      .from('lms_courses')
      .select('title, description, regulation_ref')
      .eq('id', course_id)
      .single()

    const results = { speaker_notes: [], quiz_questions: [] }

    for (const slide of slides) {
      // Get signed URL
      const { data: signedData } = await supabaseAdmin.storage
        .from('lms-slides')
        .createSignedUrl(slide.image_path, 300)

      if (!signedData?.signedUrl) continue

      // Fetch image as base64
      const imgRes = await fetch(signedData.signedUrl)
      if (!imgRes.ok) continue
      const imgBuffer = await imgRes.arrayBuffer()
      const base64 = Buffer.from(imgBuffer).toString('base64')
      const contentType = imgRes.headers.get('content-type') || 'image/png'

      const systemPrompt = `You are a world-class OSHA safety training content developer with 20+ years of experience creating training for oil & gas, construction, and industrial operations. You write in clear, direct language that field workers understand. Course: "${course.title}"${course.regulation_ref ? ` (${course.regulation_ref})` : ''}. You MUST respond with valid JSON only — no markdown, no code blocks, no preamble, no explanation. Just the raw JSON object.`

      let userPrompt = ''

      if (mode === 'speaker_notes') {
        userPrompt = `Analyze this training slide (Slide ${slide.slide_order}) and write professional speaker notes.

Requirements:
- 3-5 sentences, conversational but authoritative
- Reference specific details visible on the slide
- Include relevant OSHA regulation citations if applicable
- End with a key takeaway for the worker
- Write as if speaking directly to field workers

Respond with this exact JSON format (raw JSON only, no markdown):
{"speaker_notes": "your notes here"}`

      } else if (mode === 'quiz_questions') {
        userPrompt = `Analyze this training slide (Slide ${slide.slide_order}) and generate 2 multiple-choice quiz questions.

Requirements:
- Questions must be answerable from the slide content
- 4 answer options (A, B, C, D) — one correct, others plausible
- Test understanding, not just memorization

Respond with this exact JSON format (raw JSON only, no markdown):
{"questions": [{"question_text": "...", "option_a": "...", "option_b": "...", "option_c": "...", "option_d": "...", "correct_answer": "A", "slide_reference": ${slide.slide_order}}]}`

      } else {
        // both
        userPrompt = `Analyze this training slide (Slide ${slide.slide_order}).

Task 1 - Speaker notes: Write 3-5 professional sentences a safety trainer speaks aloud. Reference slide details, include OSHA citations if applicable, end with a key takeaway. Write for field workers, not academics.

Task 2 - Quiz questions: Generate 2 multiple-choice questions testable from this slide's content. 4 options each, one clearly correct.

Respond with this exact JSON format (raw JSON only, no markdown):
{"speaker_notes": "your notes here", "questions": [{"question_text": "...", "option_a": "...", "option_b": "...", "option_c": "...", "option_d": "...", "correct_answer": "A", "slide_reference": ${slide.slide_order}}, {"question_text": "...", "option_a": "...", "option_b": "...", "option_c": "...", "option_d": "...", "correct_answer": "B", "slide_reference": ${slide.slide_order}}]}`
      }

      // Call Anthropic API
      const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1500,
          system: systemPrompt,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: contentType, data: base64 } },
              { type: 'text', text: userPrompt }
            ]
          }]
        })
      })

      if (!aiRes.ok) continue

      const aiData = await aiRes.json()
      const rawText = aiData.content?.[0]?.text || ''

      const parsed = extractJSON(rawText)

      if (!parsed) {
        // Last resort: if we got text back and need speaker notes, save as-is
        if ((mode === 'speaker_notes' || mode === 'both') && rawText.length > 20) {
          const cleanText = rawText.replace(/```[\s\S]*?```/g, '').replace(/^\s*\{[\s\S]*\}\s*$/, '').trim()
          if (cleanText.length > 20) {
            await supabaseAdmin.from('lms_slides').update({ speaker_notes: cleanText }).eq('id', slide.id)
            results.speaker_notes.push({ slide_id: slide.id, slide_order: slide.slide_order })
          }
        }
        continue
      }

      // Save speaker notes
      if (parsed.speaker_notes && (mode === 'speaker_notes' || mode === 'both')) {
        await supabaseAdmin.from('lms_slides').update({ speaker_notes: parsed.speaker_notes }).eq('id', slide.id)
        results.speaker_notes.push({ slide_id: slide.id, slide_order: slide.slide_order, notes: parsed.speaker_notes })
      }

      // Save quiz questions
      if (parsed.questions?.length && (mode === 'quiz_questions' || mode === 'both')) {
        const { count } = await supabaseAdmin
          .from('lms_quiz_questions')
          .select('id', { count: 'exact', head: true })
          .eq('course_id', course_id)

        let baseOrder = count || 0

        for (const q of parsed.questions) {
          if (!q.question_text || !q.option_a || !q.option_b || !q.correct_answer) continue
          if (!['A','B','C','D'].includes(q.correct_answer)) continue
          baseOrder++
          const { data: savedQ } = await supabaseAdmin
            .from('lms_quiz_questions')
            .insert({
              course_id,
              question_text: q.question_text,
              option_a: q.option_a,
              option_b: q.option_b,
              option_c: q.option_c || null,
              option_d: q.option_d || null,
              correct_answer: q.correct_answer,
              slide_reference: q.slide_reference || slide.slide_order,
              question_order: baseOrder,
            })
            .select().single()
          if (savedQ) results.quiz_questions.push(savedQ)
        }
      }
    }

    return NextResponse.json({
      success: true,
      slides_processed: slides.length,
      speaker_notes_generated: results.speaker_notes.length,
      questions_generated: results.quiz_questions.length,
    })

  } catch (err) {
    console.error('AI generate error:', err)
    return NextResponse.json({ error: 'AI generation failed: ' + err.message }, { status: 500 })
  }
}


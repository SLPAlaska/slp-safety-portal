export const maxDuration = 300
export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function extractJSON(text) {
  try { return JSON.parse(text) } catch {}
  const stripped = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  try { return JSON.parse(stripped) } catch {}
  const match = stripped.match(/\{[\s\S]*\}/)
  if (match) try { return JSON.parse(match[0]) } catch {}
  return null
}

export async function POST(request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  try {
    const { course_id, mode } = await request.json()
    if (!course_id || !mode)
      return NextResponse.json({ error: 'Missing course_id or mode.' }, { status: 400 })

    const { count } = await supabaseAdmin
      .from('lms_slides')
      .select('id', { count: 'exact', head: true })
      .eq('course_id', course_id)

    if (!count || count === 0)
      return NextResponse.json({ error: 'No slides found.' }, { status: 404 })

    // Create job record
    const { data: job } = await supabaseAdmin
      .from('lms_ai_jobs')
      .insert({ course_id, mode, status: 'running', progress: 0, total_slides: count })
      .select().single()

    if (!job)
      return NextResponse.json({ error: 'Failed to create job.' }, { status: 500 })

    const { data: course } = await supabaseAdmin
      .from('lms_courses')
      .select('title, regulation_ref')
      .eq('id', course_id)
      .single()

    const { data: slides } = await supabaseAdmin
      .from('lms_slides')
      .select('id, slide_order, image_path')
      .eq('course_id', course_id)
      .order('slide_order')

    let processed = 0
    let notesGenerated = 0
    let questionsGenerated = 0

    for (const slide of slides || []) {
      try {
        // Get signed URL — send directly to Anthropic, no base64 needed
        const { data: signedData } = await supabaseAdmin.storage
          .from('lms-slides')
          .createSignedUrl(slide.image_path, 3600)

        if (!signedData?.signedUrl) { processed++; continue }

        const systemPrompt = `You are a world-class OSHA safety training content developer with 20+ years of experience in oil & gas, construction, and industrial operations. Course: "${course?.title}"${course?.regulation_ref ? ` (${course.regulation_ref})` : ''}. Respond with valid JSON only — no markdown, no code blocks, no explanation.`

        let userPrompt = ''
        if (mode === 'speaker_notes') {
          userPrompt = `Analyze Slide ${slide.slide_order}. Write 4-6 professional speaker notes sentences a trainer delivers aloud. Reference slide content specifically. Cite applicable CFR regulations with section numbers. End with a safety-critical takeaway.\n\nJSON: {"speaker_notes": "your notes here"}`
        } else if (mode === 'quiz_questions') {
          userPrompt = `Analyze Slide ${slide.slide_order}. Generate 5 multiple-choice questions from this slide. 4 options each. Vary difficulty.\n\nJSON: {"questions": [{"question_text": "...", "option_a": "...", "option_b": "...", "option_c": "...", "option_d": "...", "correct_answer": "A", "slide_reference": ${slide.slide_order}}]}`
        } else {
          userPrompt = `Analyze Slide ${slide.slide_order}. Complete both tasks.\n\nTASK 1 - Speaker Notes: Write 4-6 sentences a trainer delivers aloud. Reference slide content. Cite CFR regulations. End with safety takeaway.\n\nTASK 2 - Quiz Questions: Generate 5 multiple-choice questions. 4 options each. Vary difficulty.\n\nJSON: {"speaker_notes": "...", "questions": [{"question_text": "...", "option_a": "...", "option_b": "...", "option_c": "...", "option_d": "...", "correct_answer": "A", "slide_reference": ${slide.slide_order}}, {"question_text": "...", "option_a": "...", "option_b": "...", "option_c": "...", "option_d": "...", "correct_answer": "B", "slide_reference": ${slide.slide_order}}, {"question_text": "...", "option_a": "...", "option_b": "...", "option_c": "...", "option_d": "...", "correct_answer": "C", "slide_reference": ${slide.slide_order}}, {"question_text": "...", "option_a": "...", "option_b": "...", "option_c": "...", "option_d": "...", "correct_answer": "A", "slide_reference": ${slide.slide_order}}, {"question_text": "...", "option_a": "...", "option_b": "...", "option_c": "...", "option_d": "...", "correct_answer": "D", "slide_reference": ${slide.slide_order}}]}`
        }

        // Send signed URL directly to Anthropic — no base64 conversion needed
        const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 2000,
            system: systemPrompt,
            messages: [{
              role: 'user',
              content: [
                { type: 'image', source: { type: 'url', url: signedData.signedUrl } },
                { type: 'text', text: userPrompt }
              ]
            }]
          })
        })

        if (!aiRes.ok) {
          const errText = await aiRes.text()
          console.error(`Anthropic error slide ${slide.slide_order}:`, aiRes.status, errText)
          processed++
          await supabaseAdmin.from('lms_ai_jobs').update({ progress: processed, updated_at: new Date().toISOString() }).eq('id', job.id)
          continue
        }

        const aiData = await aiRes.json()
        const rawText = aiData.content?.[0]?.text || ''
        const parsed = extractJSON(rawText)

        if (parsed) {
          if (parsed.speaker_notes && (mode === 'speaker_notes' || mode === 'both')) {
            await supabaseAdmin.from('lms_slides').update({ speaker_notes: parsed.speaker_notes }).eq('id', slide.id)
            notesGenerated++
          }

          if (parsed.questions?.length && (mode === 'quiz_questions' || mode === 'both')) {
            for (const q of parsed.questions) {
              if (!q.question_text || !q.option_a || !q.option_b || !q.correct_answer) continue
              if (!['A','B','C','D'].includes(q.correct_answer)) continue
              const { count: qCount } = await supabaseAdmin
                .from('lms_quiz_questions')
                .select('id', { count: 'exact', head: true })
                .eq('course_id', course_id)
              await supabaseAdmin.from('lms_quiz_questions').insert({
                course_id,
                question_text: q.question_text,
                option_a: q.option_a,
                option_b: q.option_b,
                option_c: q.option_c || null,
                option_d: q.option_d || null,
                correct_answer: q.correct_answer,
                slide_reference: q.slide_reference || slide.slide_order,
                question_order: (qCount || 0) + 1,
                is_ai_generated: true,
                always_include: false,
              })
              questionsGenerated++
            }
          }
        }

        processed++
        await supabaseAdmin.from('lms_ai_jobs').update({
          progress: processed, updated_at: new Date().toISOString()
        }).eq('id', job.id)

      } catch (err) {
        console.error(`Slide ${slide.slide_order} error:`, err.message)
        processed++
        await supabaseAdmin.from('lms_ai_jobs').update({
          progress: processed, updated_at: new Date().toISOString()
        }).eq('id', job.id)
      }
    }

    await supabaseAdmin.from('lms_ai_jobs').update({
      status: 'complete', progress: processed, updated_at: new Date().toISOString()
    }).eq('id', job.id)

    return NextResponse.json({
      job_id: job.id,
      total_slides: count,
      slides_processed: processed,
      notes_generated: notesGenerated,
      questions_generated: questionsGenerated,
      status: 'complete'
    })

  } catch (err) {
    return NextResponse.json({ error: 'Server error: ' + err.message }, { status: 500 })
  }
}

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  try {
    const { course_id, mode } = await request.json()
    // mode = 'speaker_notes' | 'quiz_questions' | 'both'

    if (!course_id || !mode)
      return NextResponse.json({ error: 'Missing course_id or mode.' }, { status: 400 })

    // Fetch slides
    const { data: slides, error: slidesError } = await supabaseAdmin
      .from('lms_slides')
      .select('id, slide_order, image_path, speaker_notes')
      .eq('course_id', course_id)
      .order('slide_order')

    if (slidesError || !slides?.length)
      return NextResponse.json({ error: 'No slides found for this course.' }, { status: 404 })

    // Fetch course info
    const { data: course } = await supabaseAdmin
      .from('lms_courses')
      .select('title, description, regulation_ref')
      .eq('id', course_id)
      .single()

    const results = { speaker_notes: [], quiz_questions: [] }

    for (const slide of slides) {
      // Get signed URL for the slide image
      const { data: signedUrl } = await supabaseAdmin.storage
        .from('lms-slides')
        .createSignedUrl(slide.image_path, 300)

      if (!signedUrl?.signedUrl) continue

      // Fetch the image as base64
      const imgRes = await fetch(signedUrl.signedUrl)
      const imgBuffer = await imgRes.arrayBuffer()
      const base64 = Buffer.from(imgBuffer).toString('base64')
      const contentType = imgRes.headers.get('content-type') || 'image/png'

      // Build prompt based on mode
      let systemPrompt = `You are a world-class OSHA safety training content developer with 20+ years of experience creating training for oil & gas, construction, and industrial operations. You write in clear, direct language that field workers understand. You reference specific OSHA regulations accurately. You are creating content for the course: "${course.title}"${course.regulation_ref ? ` (${course.regulation_ref})` : ''}.`

      let userPrompt = ''

      if (mode === 'speaker_notes' || mode === 'both') {
        userPrompt += `Analyze this training slide (Slide ${slide.slide_order}) and write professional speaker notes for a safety trainer to deliver. 

Requirements:
- 3-5 sentences, conversational but authoritative
- Reference specific details visible on the slide
- Include any relevant OSHA regulation citations if applicable
- End with a key takeaway or action item for the worker
- Write as if speaking directly to field workers, not reading a textbook
- Do NOT use bullet points — write in flowing sentences the trainer speaks aloud

`
      }

      if (mode === 'quiz_questions' || mode === 'both') {
        userPrompt += `Also generate 2 multiple-choice quiz questions based on this slide's content.

Requirements:
- Questions must be answerable from the slide content shown
- 4 answer options (A, B, C, D) — one clearly correct, others plausible but wrong
- Questions should test understanding, not just memorization
- Difficulty: appropriate for field workers taking safety training
- Mark which answer is correct

Return your response as valid JSON only, no markdown, no extra text:
{
  "speaker_notes": "...",
  "questions": [
    {
      "question_text": "...",
      "option_a": "...",
      "option_b": "...",
      "option_c": "...",
      "option_d": "...",
      "correct_answer": "A",
      "slide_reference": ${slide.slide_order}
    }
  ]
}`
      } else if (mode === 'speaker_notes') {
        userPrompt += `Return your response as valid JSON only, no markdown, no extra text:
{
  "speaker_notes": "..."
}`
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
          model: 'claude-opus-4-6',
          max_tokens: 1024,
          system: systemPrompt,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: contentType,
                  data: base64,
                }
              },
              { type: 'text', text: userPrompt }
            ]
          }]
        })
      })

      const aiData = await aiRes.json()
      const rawText = aiData.content?.[0]?.text || ''

      try {
        const parsed = JSON.parse(rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())

        // Save speaker notes if generated
        if (parsed.speaker_notes && (mode === 'speaker_notes' || mode === 'both')) {
          await supabaseAdmin
            .from('lms_slides')
            .update({ speaker_notes: parsed.speaker_notes })
            .eq('id', slide.id)
          results.speaker_notes.push({ slide_id: slide.id, slide_order: slide.slide_order, notes: parsed.speaker_notes })
        }

        // Save quiz questions if generated
        if (parsed.questions?.length && (mode === 'quiz_questions' || mode === 'both')) {
          // Get current question count for ordering
          const { count } = await supabaseAdmin
            .from('lms_quiz_questions')
            .select('id', { count: 'exact', head: true })
            .eq('course_id', course_id)

          let baseOrder = count || 0

          for (const q of parsed.questions) {
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
              .select()
              .single()
            if (savedQ) results.quiz_questions.push(savedQ)
          }
        }
      } catch (parseError) {
        // If JSON parse fails, try to extract speaker notes as plain text
        if (mode === 'speaker_notes' && rawText.length > 20) {
          await supabaseAdmin
            .from('lms_slides')
            .update({ speaker_notes: rawText.trim() })
            .eq('id', slide.id)
          results.speaker_notes.push({ slide_id: slide.id, slide_order: slide.slide_order, notes: rawText.trim() })
        }
      }
    }

    return NextResponse.json({
      success: true,
      slides_processed: slides.length,
      speaker_notes_generated: results.speaker_notes.length,
      questions_generated: results.quiz_questions.length,
      results,
    })

  } catch (err) {
    console.error('AI generate error:', err)
    return NextResponse.json({ error: 'AI generation failed: ' + err.message }, { status: 500 })
  }
}

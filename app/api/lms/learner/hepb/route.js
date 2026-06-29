export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Canonical OSHA Appendix A declination language (29 CFR 1910.1030).
const DECLINATION_TEXT =
  'I understand that due to my occupational exposure to blood or other potentially ' +
  'infectious materials I may be at risk of acquiring hepatitis B virus (HBV) infection. ' +
  'I have been given the opportunity to be vaccinated with hepatitis B vaccine, at no ' +
  'charge to myself. However, I decline hepatitis B vaccination at this time. I understand ' +
  'that by declining this vaccine, I continue to be at risk of acquiring hepatitis B, a ' +
  'serious disease. If in the future I continue to have occupational exposure to blood or ' +
  'other potentially infectious materials and I want to be vaccinated with hepatitis B ' +
  'vaccine, I can receive the vaccination series at no charge to me.'

function generateCertNumber() {
  const year = new Date().getFullYear()
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let suffix = ''
  for (let i = 0; i < 6; i++) suffix += chars[Math.floor(Math.random() * chars.length)]
  return 'SLP-' + year + '-' + suffix
}

async function issueCertificate(supabaseAdmin, { lmsUser, course, course_id, score }) {
  const certNum = generateCertNumber()
  const expiresAt = new Date()
  expiresAt.setFullYear(expiresAt.getFullYear() + 3)

  const completionText = course.completion_text ||
    'Has successfully completed the ' + course.title + ' training course' +
    (course.regulation_ref ? ' in accordance with ' + course.regulation_ref : '') + '.'

  const { data: cert } = await supabaseAdmin
    .from('lms_certificates')
    .insert({
      cert_number: certNum,
      user_id: lmsUser.id,
      course_id,
      full_name: lmsUser.full_name,
      company_name: lmsUser.lms_companies?.name || null,
      job_title: lmsUser.job_title || null,
      course_title: course.title,
      regulation_ref: course.regulation_ref || null,
      completion_text: completionText,
      score_achieved: score,
      expires_at: expiresAt.toISOString(),
    })
    .select().single()

  return cert
}

export async function POST(request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const authHeader = request.headers.get('authorization')
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const token = authHeader.replace('Bearer ', '')
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: lmsUser } = await supabaseAdmin
    .from('lms_users')
    .select('id, full_name, job_title, lms_companies(name)')
    .eq('auth_user_id', user.id)
    .single()
  if (!lmsUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { course_id, decision, signature_name, signed_date } = await request.json()

  if (!course_id || !decision || !signature_name || !signed_date)
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })

  if (decision !== 'accept' && decision !== 'decline')
    return NextResponse.json({ error: 'Invalid decision.' }, { status: 400 })

  // Confirm the learner actually passed this course before accepting a signature.
  const { data: passedAttempt } = await supabaseAdmin
    .from('lms_quiz_attempts')
    .select('id, score')
    .eq('user_id', lmsUser.id)
    .eq('course_id', course_id)
    .eq('passed', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!passedAttempt)
    return NextResponse.json({ error: 'You must pass the course quiz before signing this form.' }, { status: 400 })

  const { data: course } = await supabaseAdmin
    .from('lms_courses')
    .select('title, completion_text, regulation_ref')
    .eq('id', course_id)
    .single()
  if (!course) return NextResponse.json({ error: 'Course not found.' }, { status: 404 })

  // Write (or update) the signed acceptance/declination record.
  const { error: signErr } = await supabaseAdmin
    .from('lms_hepb_declinations')
    .upsert({
      user_id: lmsUser.id,
      course_id,
      decision,
      signature_name,
      signed_date,
      company_name: lmsUser.lms_companies?.name || null,
      job_title: lmsUser.job_title || null,
      declination_text: decision === 'decline' ? DECLINATION_TEXT : null,
    }, { onConflict: 'user_id,course_id' })

  if (signErr)
    return NextResponse.json({ error: 'Could not save form: ' + signErr.message }, { status: 500 })

  // Now that the form is on file, issue the certificate (or return the existing one).
  let certNumber = null

  const { data: existing } = await supabaseAdmin
    .from('lms_completions')
    .select('id, certificate_id')
    .eq('user_id', lmsUser.id)
    .eq('course_id', course_id)
    .maybeSingle()

  if (!existing) {
    const cert = await issueCertificate(supabaseAdmin, { lmsUser, course, course_id, score: passedAttempt.score })
    if (cert) {
      await supabaseAdmin
        .from('lms_completions')
        .insert({ user_id: lmsUser.id, course_id, quiz_attempt_id: passedAttempt.id, certificate_id: cert.cert_number })
      certNumber = cert.cert_number
    }
  } else {
    certNumber = existing.certificate_id || null
    if (!certNumber) {
      const cert = await issueCertificate(supabaseAdmin, { lmsUser, course, course_id, score: passedAttempt.score })
      if (cert) {
        await supabaseAdmin
          .from('lms_completions')
          .update({ certificate_id: cert.cert_number })
          .eq('id', existing.id)
        certNumber = cert.cert_number
      }
    }
  }

  return NextResponse.json({ ok: true, certificate_id: certNumber })
}

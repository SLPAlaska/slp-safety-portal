'use client'
// app/lms/competency/start/[code]/page.js
// One link for every company: /lms/competency/start/NC1800-OP opens the signed-in learner's own copy of the program.
// AnthroSafe(TM) Field Driven Safety | (c) 2026 SLP Alaska, LLC
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { apiFetch } from '../../../../components/lms/apiFetch'
import { Shell, t } from '../../ui'

export default function CompetencyStartPage() {
  const { code } = useParams()
  const router = useRouter()
  const [err, setErr] = useState('')
  useEffect(() => {
    if (!code) return
    apiFetch(`/api/competency/units?program_code=${encodeURIComponent(code)}`).then(async r => {
      if (r.status === 401) { setErr(t('en', 'signIn')); return }
      const d = await r.json()
      if (!r.ok) setErr(d.error || t('en', 'loadFail')); else router.replace(`/lms/competency/program/${d.subject.id}`)
    })
  }, [code, router])
  return (<Shell>{err ? <div className="err">{err}</div> : <p className="muted">{t('en', 'loading')}</p>}</Shell>)
}

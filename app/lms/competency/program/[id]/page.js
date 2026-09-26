'use client'
// app/lms/competency/program/[id]/page.js
// A competency's units in order, in the learner's language. Each unit opens only after the one before it is complete.
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { apiFetch } from '../../../../components/lms/apiFetch'
import { Shell, t } from '../../ui'

function stageText(u, lang) {
  const st = u.status
  if (st.complete) return <span className="done">{t(lang, 'complete')}</span>
  if (st.check_locked) return <span className="lock">{t(lang, 'locked')}</span>
  if (!st.scenario_passed) return u.lesson ? t(lang, 'startLesson') : t(lang, 'startScenario')
  if (!st.practice_done) return t(lang, 'practiceNext')
  return t(lang, 'checkNext')
}

export default function CompetencyProgramPage() {
  const { id } = useParams()
  const router = useRouter()
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')
  const lang = data?.lang || 'en'

  useEffect(() => {
    if (!id) return
    apiFetch(`/api/competency/units?subject_id=${id}`).then(async r => {
      if (r.status === 401) { setErr(t('en', 'signIn') + ' / ' + t('es', 'signIn')); return }
      const d = await r.json()
      if (!r.ok) setErr(d.error || t('en', 'loadFail')); else setData(d)
    })
  }, [id])

  return (
    <Shell>
      <div className="bar"><div className="brand">{t(lang, 'brand')}</div>
        <span>{data?.can_manage && <button className="ghost" style={{ marginRight: 14 }} onClick={() => router.push(`/lms/competency/results/${id}`)}>{t(lang, 'results')}</button>}
        <button className="ghost" onClick={() => router.push('/lms/dashboard')}>{t(lang, 'dashboard')}</button></span></div>
      {err && <div className="err">{err}</div>}
      {!data && !err && <p className="muted">{t(lang, 'loading')}</p>}
      {data && (<>
        <h1>{data.subject.title}</h1>
        {data.subject.description && <p className="muted">{data.subject.description}</p>}
        {data.all_complete && <div className="tag best"><strong>{t(lang, 'allDone')}</strong><p>{t(lang, 'allDoneText')}</p></div>}
        {data.units.map(u => (
          <button key={u.id} className="unit" disabled={!u.open} onClick={() => router.push(`/lms/competency/unit/${u.id}`)}>
            <span className="num">{u.unit_order}</span>
            <span><b>{u.title}</b><span className="muted">{u.open ? stageText(u, lang) : t(lang, 'opensAfter')}</span></span>
          </button>
        ))}
        {data.subject.revision && <p className="muted">{t(lang, 'revision', { r: data.subject.revision })}</p>}
      </>)}
    </Shell>
  )
}

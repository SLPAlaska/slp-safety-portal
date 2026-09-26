'use client'
// app/lms/competency/results/[id]/page.js
// Managers: every learner against every unit, with detail and a recorded reopen for locked checks.
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { apiFetch } from '../../../../components/lms/apiFetch'
import { Shell, t } from '../../ui'

const post = (url, body) => apiFetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
const fmt = d => d ? new Date(d).toLocaleDateString() : ''

function Chips({ c, lang }) {
  return (<>
    <span className={'chip ' + (c.scenario_passed ? 'g' : c.scenario_attempts ? 'a' : 'n')}>{t(lang, 'lessonScenario')}</span>
    <span className={'chip ' + (c.practice_attested ? 'g' : 'n')}>{t(lang, 'practiceShort')}</span>
    <span className={'chip ' + (c.check_passed ? 'g' : c.locked ? 'r' : c.check_attempts ? 'a' : 'n')}>{c.locked ? t(lang, 'lockedChip') : t(lang, 'checkShort') + (c.best_score != null ? ' ' + c.best_score + '%' : '')}</span>
  </>)
}

export default function CompetencyResultsPage() {
  const { id } = useParams()
  const router = useRouter()
  const [data, setData] = useState(null)
  const [lang, setLang] = useState('en')
  const [err, setErr] = useState('')
  const [who, setWho] = useState(null)
  const [detail, setDetail] = useState(null)
  const [reopening, setReopening] = useState(null)
  const [reason, setReason] = useState('')
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    const r0 = await apiFetch(`/api/competency/units?subject_id=${id}`); const d0 = await r0.json(); if (r0.ok) setLang(d0.lang || 'en')
    const r = await apiFetch(`/api/competency/results?subject_id=${id}`)
    if (r.status === 401) { setErr(t('en', 'signIn') + ' / ' + t('es', 'signIn')); return }
    const d = await r.json(); if (!r.ok) { setErr(d.error || t('en', 'loadFail')); return }
    setData(d)
  }, [id])
  useEffect(() => { if (id) load() }, [id, load])

  const open = useCallback(async (learner) => {
    setWho(learner); setDetail(null); setMsg('')
    const r = await apiFetch(`/api/competency/results?subject_id=${id}&user_id=${learner.id}`); const d = await r.json()
    if (r.ok) setDetail(d.learners[0] || null)
    window.scrollTo(0, 0)
  }, [id])

  async function doReopen(unitCell) {
    if (!reason.trim()) return
    for (const q of unitCell.quiz_ids) await post('/api/competency/reopen', { user_id: who.id, quiz_id: q, reason: reason.trim() })
    setReopening(null); setReason(''); setMsg(t(lang, 'reopenDone')); await load(); await open(who)
  }

  return (
    <Shell>
      <div className="bar"><button className="ghost" onClick={() => who ? setWho(null) : router.push(`/lms/competency/program/${id}`)}>{who ? t(lang, 'back2') : t(lang, 'allUnits')}</button>
        <span className="muted">{data?.subject?.title}</span></div>
      {err && <div className="err">{err}</div>}
      {!data && !err && <p className="muted">{t(lang, 'loading')}</p>}

      {data && !who && (<>
        <h1>{t(lang, 'resultsTitle')}</h1>
        {data.learners.length === 0 ? <p className="muted">{t(lang, 'noActivity')}</p> : (
          <div style={{ overflowX: 'auto' }}>
            <table className="grid">
              <thead><tr><th>{t(lang, 'learner')}</th>{data.units.map(u => <th key={u.id}>{t(lang, 'unit', { n: u.unit_order })}</th>)}<th>{t(lang, 'lastActivity')}</th></tr></thead>
              <tbody>{data.learners.map(l => (
                <tr key={l.id}>
                  <td><button className="rowbtn" onClick={() => open(l)}>{l.full_name}</button><div className="muted" style={{ fontSize: 12 }}>{l.job_title || ''}{l.complete ? ' \u2022 ' + t(lang, 'stComplete') : ''}</div></td>
                  {data.units.map(u => <td key={u.id} style={{ minWidth: 120 }}><Chips c={l.units[u.id]} lang={lang} /></td>)}
                  <td className="muted" style={{ fontSize: 12 }}>{fmt(l.last_activity)}</td>
                </tr>))}
              </tbody>
            </table>
          </div>)}
      </>)}

      {who && (<>
        <h1>{who.full_name}</h1>
        {msg && <div className="tag best"><strong>{msg}</strong></div>}
        {!detail && <p className="muted">{t(lang, 'loading')}</p>}
        {detail && data.units.map(u => { const c = detail.units[u.id]; return (
          <div key={u.id} className="card">
            <h2>{t(lang, 'unit', { n: u.unit_order })}: {u.title}</h2>
            <p><Chips c={c} lang={lang} /></p>
            <p className="muted" style={{ margin: '6px 0' }}><strong>{t(lang, 'scenarioHistory')}:</strong> {c.scenarios.length === 0 ? t(lang, 'notStarted') :
              c.scenarios.map((s, i) => <span key={i} style={{ display: 'block' }}>{fmt(s.at)}: {s.calls.map(q => t(lang, q === 'best' ? 'strong' : q === 'ok' ? 'workable' : 'poor')).join(', ')}</span>)}</p>
            <p className="muted" style={{ margin: '6px 0' }}><strong>{t(lang, 'checkHistory')}:</strong> {c.checks.length === 0 ? t(lang, 'notStarted') : c.checks.map(k => `${fmt(k.at)} ${k.score}%`).join(' \u2022 ')}</p>
            {c.reopens.length > 0 && <p className="muted" style={{ margin: '6px 0' }}><strong>{t(lang, 'reopenHistory')}:</strong> {c.reopens.map((r, i) => <span key={i} style={{ display: 'block' }}>{fmt(r.created_at)}: {r.reason}</span>)}</p>}
            <details style={{ marginTop: 8 }}><summary style={{ cursor: 'pointer', fontWeight: 600 }}>{t(lang, 'worksheet')}{c.practice_attested ? '' : ' (' + t(lang, 'notSubmitted') + ')'}</summary>
              {c.worksheet ? c.practice_fields.map((f, i) => <div key={i} style={{ margin: '10px 0' }}><div className="muted" style={{ fontSize: 13 }}>{f}</div><div style={{ whiteSpace: 'pre-wrap' }}>{c.worksheet[i] || ''}</div></div>) : <p className="muted">{t(lang, 'notSubmitted')}</p>}
            </details>
            {c.locked && (reopening === u.id ? (<>
              <label className="field" htmlFor={'r' + u.id} style={{ marginTop: 10 }}>{t(lang, 'reopenReason')}</label>
              <textarea id={'r' + u.id} value={reason} onChange={e => setReason(e.target.value)} />
              <div className="row2"><button className="secondary" onClick={() => { setReopening(null); setReason('') }}>{t(lang, 'cancel')}</button>
                <button className="primary" disabled={reason.trim().length < 10} onClick={() => doReopen(c)}>{t(lang, 'save')}</button></div>
            </>) : <button className="primary" onClick={() => setReopening(u.id)}>{t(lang, 'reopen')}</button>)}
          </div>) })}
      </>)}
    </Shell>
  )
}

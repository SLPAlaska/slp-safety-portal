'use client'
// app/lms/competency/unit/[id]/page.js
// One competency unit, in order: narrated lesson -> decision scenario -> practice step -> knowledge check.
// Served in the learner's language. Narration is the existing lms-audio files (same voice as the safety courses).
// Scenario answers and the knowledge check key never reach the browser; the server scores everything.
import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { apiFetch } from '../../../../components/lms/apiFetch'
import { Shell, shuffle, t } from '../../ui'

const post = (url, body, method = 'POST') => apiFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

export default function CompetencyUnitPage() {
  const { id } = useParams()
  const router = useRouter()
  const [unit, setUnit] = useState(null)
  const [status, setStatus] = useState(null)
  const [lang, setLang] = useState('en')
  const [stage, setStage] = useState(null)
  const [err, setErr] = useState('')

  const refresh = useCallback(async (pickStage) => {
    const r = await apiFetch(`/api/competency/units?unit_id=${id}`)
    if (r.status === 401) { setErr(t('en', 'signIn') + ' / ' + t('es', 'signIn')); return }
    const d = await r.json()
    if (!r.ok) { setErr(d.error || t('en', 'loadFail')); return }
    setUnit(d.unit); setStatus(d.status); setLang(d.lang || 'en')
    if (pickStage) {
      const s = d.status
      setStage(s.complete ? 'done' : !s.scenario_passed ? (d.unit.course_id ? 'lesson' : 'scenario') : !s.practice_done ? 'practice' : 'check')
    }
  }, [id])

  useEffect(() => { if (id) refresh(true) }, [id, refresh])
  const back = () => router.push(`/lms/competency/program/${unit.subject_id}`)
  const next = async () => { await refresh(true); window.scrollTo(0, 0) }

  return (
    <Shell>
      {err && <div className="err">{err}</div>}
      {!unit && !err && <p className="muted">{t(lang, 'loading')}</p>}
      {unit && (<>
        <div className="bar"><button className="ghost" onClick={back}>{t(lang, 'allUnits')}</button><span className="muted">{t(lang, 'unit', { n: unit.unit_order })}</span></div>
        <StageMenu unit={unit} status={status} stage={stage} lang={lang} onPick={st => { setStage(st); window.scrollTo(0, 0) }} />
        {stage === 'lesson' && <Lesson unit={unit} lang={lang} onDone={() => { setStage('scenario'); window.scrollTo(0, 0) }} />}
        {stage === 'scenario' && <Scenario unit={unit} lang={lang} onPassed={next} />}
        {stage === 'practice' && <Practice unit={unit} lang={lang} onDone={next} />}
        {stage === 'check' && <Check unit={unit} lang={lang} onDone={next} locked={status?.check_locked} />}
        {stage === 'done' && (<>
          <h1>{unit.title}</h1>
          <div className="tag best"><strong>{t(lang, 'unitComplete')}</strong><p>{t(lang, 'unitCompleteText')}</p></div>
          {unit.course_id && <button className="secondary" onClick={() => setStage('lesson')}>{t(lang, 'reviewLesson')}</button>}
          <button className="primary" onClick={back}>{t(lang, 'backAll')}</button>
        </>)}
      </>)}
    </Shell>
  )
}

// ---------- Stage menu: finished stages reopen for review; later stages stay locked in order ----------
function StageMenu({ unit, status, stage, lang, onPick }) {
  if (!status) return null
  const list = [
    unit.course_id && { key: 'lesson', label: t(lang, 'stLesson'), done: status.scenario_passed },
    { key: 'scenario', label: t(lang, 'stScenario'), done: status.scenario_passed },
    { key: 'practice', label: t(lang, 'stPractice'), done: status.practice_done },
    { key: 'check', label: t(lang, 'stCheck'), done: status.check_passed },
  ].filter(Boolean)
  const firstOpen = list.findIndex(x => !x.done)
  return (
    <nav className="stages" aria-label={t(lang, 'unit', { n: unit.unit_order })}>
      {list.map((x, n) => {
        const reachable = x.done || n === firstOpen || (firstOpen === -1)
        const current = stage === x.key
        return (
          <button key={x.key} className={'stage' + (current ? ' on' : x.done ? ' done' : '')} disabled={!reachable}
            title={reachable ? x.label : t(lang, 'stLocked')} aria-current={current ? 'step' : undefined} onClick={() => onPick(x.key)}>
            {x.done ? '\u2713 ' : ''}{x.label}
          </button>
        )
      })}
    </nav>
  )
}

// ---------- Narrated lesson ----------
function Lesson({ unit, lang, onDone }) {
  const [slides, setSlides] = useState(null)
  const [i, setI] = useState(0)
  const [started, setStarted] = useState(false)
  const [heard, setHeard] = useState({})
  const [showText, setShowText] = useState(false)
  const [err, setErr] = useState('')
  const audio = useRef(null)

  useEffect(() => {
    apiFetch(`/api/competency/slides?unit_id=${unit.id}`).then(async r => {
      const d = await r.json()
      if (!r.ok) setErr(d.error || t(lang, 'lessonFail')); else setSlides(d.slides)
    })
  }, [unit.id, lang])

  // Audio starts inside the tap (Start, Next, Back) so phones allow playback.
  function goTo(n) {
    setI(n)
    const a = audio.current, sl = slides[n]
    if (a && sl?.audio_url) { a.src = sl.audio_url; a.play().catch(() => {}) }
    else setHeard(h => ({ ...h, [n]: true }))
  }

  if (err) return <div className="err">{err}</div>
  if (!slides) return <p className="muted">{t(lang, 'loadingLesson')}</p>
  const s = slides[i]
  const last = i === slides.length - 1
  const canNext = heard[i] || !s.audio_url

  return (<>
    <h1>{unit.title}</h1>
    <div className="progress"><i style={{ width: `${((i + 1) / slides.length) * 100}%` }} /></div>
    {s.image_url && <img className="slide" src={s.image_url} alt={t(lang, 'slideOf', { a: i + 1, b: slides.length })} />}
    <audio ref={audio} onEnded={() => setHeard(h => ({ ...h, [i]: true }))} controls={started && !!s.audio_url} style={{ width: '100%', marginTop: 10, display: started && s.audio_url ? 'block' : 'none' }} />
    {started && !s.audio_url && <p className="muted" style={{ marginTop: 8 }}>{t(lang, 'noAudio')}</p>}
    {!started ? (
      <button className="primary" onClick={() => { setStarted(true); goTo(0) }}>{t(lang, 'startNarrated')}</button>
    ) : (<>
      <p className="muted" style={{ marginTop: 8 }}>{t(lang, 'slideOf', { a: i + 1, b: slides.length })}{!canNext ? t(lang, 'listenToEnd') : ''}</p>
      <div className="row2">
        <button className="secondary" disabled={i === 0} onClick={() => goTo(i - 1)}>{t(lang, 'back')}</button>
        {!last ? <button className="primary" disabled={!canNext} onClick={() => goTo(i + 1)}>{t(lang, 'nextSlide')}</button>
          : <button className="primary" disabled={!canNext} onClick={onDone}>{t(lang, 'goScenario')}</button>}
      </div>
      <button className="ghost" onClick={() => setShowText(!showText)}>{showText ? t(lang, 'hideTx') : t(lang, 'showTx')}</button>
      {showText && <div className="card"><p style={{ margin: 0 }}>{s.transcript}</p></div>}
    </>)}
  </>)
}

// ---------- Decision scenario ----------
function Scenario({ unit, lang, onPassed }) {
  const S = unit.scenario
  const [node, setNode] = useState(S.start)
  const [step, setStep] = useState(0)
  const [path, setPath] = useState([])
  const [opts, setOpts] = useState(() => shuffle(S.nodes[S.start].options))
  const [picked, setPicked] = useState(null)
  const [fb, setFb] = useState(null)
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)

  const restart = () => { setNode(S.start); setStep(0); setPath([]); setOpts(shuffle(S.nodes[S.start].options)); setPicked(null); setFb(null); setResult(null); window.scrollTo(0, 0) }

  async function choose(o) {
    if (fb || busy) return
    setBusy(true); setPicked(o.i)
    const r = await post('/api/competency/scenario', { unit_id: unit.id, action: 'choose', node, i: o.i })
    const d = await r.json(); setBusy(false)
    if (r.ok) setFb(d)
  }

  async function advance() {
    const newPath = [...path, { node, i: picked }]
    if (fb.next === 'end') {
      setBusy(true)
      const r = await post('/api/competency/scenario', { unit_id: unit.id, action: 'finish', path: newPath })
      const d = await r.json(); setBusy(false)
      setResult(r.ok ? d : { error: d.error }); window.scrollTo(0, 0); return
    }
    setPath(newPath); setNode(fb.next); setStep(step + 1); setOpts(shuffle(S.nodes[fb.next].options)); setPicked(null); setFb(null); window.scrollTo(0, 0)
  }

  const callWord = q => t(lang, q === 'best' ? 'strong' : q === 'ok' ? 'workable' : 'poor')

  if (result) return (<>
    <h1>{result.passed ? t(lang, 'scenarioDone') : t(lang, 'replayReq')}</h1>
    {result.error ? <div className="err">{result.error}</div> : (
      <div className="card">
        <p><strong>{t(lang, 'yourCalls')}</strong> {result.calls.map(callWord).join(', ')}</p>
        <p>{result.debrief}</p>
        {!result.passed && <p><strong>{t(lang, 'poorCalls', { n: result.poor_count })}</strong> {t(lang, 'replayText')}</p>}
      </div>)}
    <button className="primary" onClick={result.passed ? onPassed : restart}>{result.passed ? t(lang, 'continue') : t(lang, 'replay')}</button>
  </>)

  const N = S.nodes[node]
  const head = fb?.q === 'best' ? t(lang, 'strongCall') : fb?.q === 'ok' ? t(lang, 'workableCall') : t(lang, 'poorCall')
  return (<>
    <h1>{S.title}</h1>
    <p className="muted">{t(lang, 'decisionOf', { a: step + 1, b: S.decisions })}</p>
    <div className="progress"><i style={{ width: `${(step / S.decisions) * 100}%` }} /></div>
    {step === 0 && <div className="card"><p style={{ margin: 0 }}>{S.setup}</p></div>}
    <h2>{N.text}</h2>
    {opts.map(o => <button key={o.i} className={'choice' + (picked === o.i ? ' picked' : '')} disabled={!!fb || busy} onClick={() => choose(o)}>{o.t}</button>)}
    {fb && (<>
      <div className={`tag ${fb.q}`} role="status"><strong>{head}</strong><p>{fb.fb}</p></div>
      <button className="primary" disabled={busy} onClick={advance}>{fb.next === 'end' ? t(lang, 'seeDebrief') : t(lang, 'nextDecision')}</button>
    </>)}
  </>)
}

// ---------- Practice step ----------
function Practice({ unit, lang, onDone }) {
  const P = unit.practice
  const [ws, setWs] = useState(null)
  const [attest, setAttest] = useState([])
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    apiFetch(`/api/competency/practice?unit_id=${unit.id}`).then(r => r.json()).then(d => {
      setWs(d.practice?.worksheet || {}); setAttest((P.gates || []).map(() => !!d.practice?.attested))
    })
  }, [unit.id, P.gates])

  async function save(final) {
    setSaving(true); setMsg('')
    const r = await post('/api/competency/practice', { unit_id: unit.id, worksheet: ws, attest: final ? attest : [] }, 'PUT')
    const d = await r.json(); setSaving(false)
    if (!r.ok) { setMsg(d.error || t(lang, 'saveFailed')); return }
    if (final && d.practice?.attested) onDone(); else setMsg(t(lang, 'saved'))
  }

  if (!ws) return <p className="muted">{t(lang, 'loadingWs')}</p>
  const filled = (P.fields || []).every((_, k) => (ws[k] || '').trim().length >= 10)
  return (<>
    <h1>{P.step}</h1>
    <p className="muted">{t(lang, 'practiceIntro')}</p>
    {(P.fields || []).map((f, k) => (
      <div key={k}><label className="field" htmlFor={`f${k}`}>{f}</label>
        <textarea id={`f${k}`} value={ws[k] || ''} onChange={e => setWs({ ...ws, [k]: e.target.value })} /></div>
    ))}
    <div className="card"><h2>{t(lang, 'checkWork')}</h2>
      {(P.gates || []).map((g, k) => (
        <label key={k} className="check"><input type="checkbox" checked={!!attest[k]} onChange={e => setAttest(attest.map((x, j) => j === k ? e.target.checked : x))} /><span>{g}</span></label>
      ))}
    </div>
    {P.model && <div className="card"><p className="muted" style={{ margin: 0 }}>{P.model}</p></div>}
    {msg && <p className="muted">{msg}</p>}
    <button className="secondary" disabled={saving} onClick={() => save(false)}>{t(lang, 'saveLater')}</button>
    <button className="primary" disabled={saving || !filled || !attest.every(Boolean)} onClick={() => save(true)}>{t(lang, 'submitContinue')}</button>
    {!filled && <p className="muted">{t(lang, 'needFields')}</p>}
  </>)
}

// ---------- Knowledge check ----------
function Check({ unit, lang, onDone, locked }) {
  const [data, setData] = useState(null)
  const [i, setI] = useState(0)
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(null)
  const [err, setErr] = useState(locked ? t(lang, 'lockedErr') : '')
  const [busy, setBusy] = useState(false)

  const start = useCallback(async () => {
    setResult(null); setAnswers({}); setI(0); setErr('')
    const r = await apiFetch(`/api/competency/check?unit_id=${unit.id}`)
    const d = await r.json()
    if (!r.ok) { setErr(d.locked ? t(lang, 'lockedErr') : (d.error || t(lang, 'startFailed'))); return }
    setData(d)
  }, [unit.id, lang])

  useEffect(() => { if (!locked) start() }, [locked, start])

  async function submit() {
    setBusy(true)
    const r = await post('/api/competency/check', { attempt_id: data.attempt_id, answers })
    const d = await r.json(); setBusy(false)
    if (!r.ok) { setErr(d.locked ? t(lang, 'lockedErr') : (d.error || t(lang, 'submitFailed'))); return }
    setResult(d); window.scrollTo(0, 0)
  }

  if (err) return (<><h1>{t(lang, 'kcTitle')}</h1><div className="err">{err}</div><p className="muted">{t(lang, 'lockedHelp')}</p></>)
  if (!data) return <p className="muted">{t(lang, 'drawing')}</p>

  if (result) return (<>
    <div className="result">{result.correct} / {result.total}</div>
    <h1>{result.passed ? t(lang, 'passed') : result.locked ? t(lang, 'reviewRequired') : t(lang, 'notYet')}</h1>
    <p className="muted">{result.passed ? t(lang, 'unitDone') : result.locked ? t(lang, 'attemptsUsed') : t(lang, 'needPct', { p: result.pass_score })}</p>
    {result.review.map((q, n) => (
      <div key={n} className={`tag ${q.is_correct ? 'best' : 'poor'}`}><strong>{n + 1}. {q.is_correct ? t(lang, 'correct') : t(lang, 'incorrect')}</strong><p>{q.prompt}</p>{q.explanation && <p className="muted" style={{ marginTop: 6 }}>{q.explanation}</p>}</div>
    ))}
    <button className="primary" onClick={result.passed || result.locked ? onDone : start}>{result.passed || result.locked ? t(lang, 'continue') : t(lang, 'tryAgain')}</button>
  </>)

  const q = data.questions[i]
  const v = answers[q.id]
  const set = val => setAnswers({ ...answers, [q.id]: val })
  const done = q.qtype === 'mc' ? !!v : q.qtype === 'mr' ? (v || []).length > 0
    : q.qtype === 'matching' ? (q.items || []).every(it => (v || {})[it]) : (v || []).length === (q.items || []).length
  const lastQ = i === data.questions.length - 1

  return (<>
    <p className="muted">{t(lang, 'questionOf', { a: i + 1, b: data.questions.length })}</p>
    <div className="progress"><i style={{ width: `${(i / data.questions.length) * 100}%` }} /></div>
    <h2>{q.prompt}</h2>
    {q.qtype === 'mc' && q.options.map((o, n) => <button key={o.key} className="choice" aria-pressed={v === o.key} onClick={() => set(o.key)}><strong>{'ABCDEF'[n]}.</strong> {o.text}</button>)}
    {q.qtype === 'mr' && (<><p className="muted">{t(lang, 'selectAll')}</p>{q.options.map((o, n) => {
      const on = (v || []).includes(o.key)
      return <button key={o.key} className="choice" aria-pressed={on} onClick={() => set(on ? v.filter(x => x !== o.key) : [...(v || []), o.key])}><strong>{'ABCDEF'[n]}.</strong> {o.text}</button>
    })}</>)}
    {q.qtype === 'matching' && q.items.map((it, n) => (
      <div key={it}><label className="field" htmlFor={`m${n}`}>{it}</label>
        <select id={`m${n}`} value={(v || {})[it] || ''} onChange={e => set({ ...(v || {}), [it]: e.target.value })} style={{ marginBottom: 12 }}>
          <option value="">{t(lang, 'choose')}</option>{q.categories.map(c => <option key={c}>{c}</option>)}</select></div>
    ))}
    {q.qtype === 'sequence' && (<>
      <p className="muted">{t(lang, 'tapOrder')}</p>
      <div className="seq">{(v || []).map((it, n) => <button key={it} className="pill" onClick={() => set(v.filter(x => x !== it))}>{n + 1}. {it}</button>)}</div>
      <div>{q.items.filter(it => !(v || []).includes(it)).map(it => <button key={it} className="pill" style={{ margin: '0 8px 8px 0' }} onClick={() => set([...(v || []), it])}>{it}</button>)}</div>
    </>)}
    <div className="row2" style={{ marginTop: 10 }}>
      <button className="secondary" disabled={i === 0} onClick={() => setI(i - 1)}>{t(lang, 'back')}</button>
      {!lastQ ? <button className="primary" disabled={!done} onClick={() => setI(i + 1)}>{t(lang, 'nextQ')}</button>
        : <button className="primary" disabled={!done || busy || data.questions.some(x => !answers[x.id])} onClick={submit}>{busy ? t(lang, 'scoring') : t(lang, 'submitAnswers')}</button>}
    </div>
  </>)
}

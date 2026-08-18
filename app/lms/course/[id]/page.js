'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter, useParams } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// ─── QUIZ COMPONENT ────────────────────────────────────────────────────────
function QuizPanel({ courseId, token, passScore, onPass, onReviewSlide }) {
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [retryCount, setRetryCount] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Access tokens expire after ~1 hour. A long course can outlast the token
  // captured at page load, which caused "Unauthorized" on submit. Always pull
  // a fresh token from Supabase (auto-refreshes) right before each request.
  async function freshToken() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      return session?.access_token || token
    } catch {
      return token
    }
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setLoadError('')
      try {
        const tok = await freshToken()
        const res = await fetch(`/api/lms/learner/quiz?course_id=${courseId}`, {
          headers: { 'Authorization': `Bearer ${tok}` }
        })
        if (!res.ok) {
          let msg = 'Server error (' + res.status + ')'
          try {
            const d = await res.json()
            if (d && d.error) msg = d.error
          } catch { /* non-JSON error body */ }
          if (!cancelled) { setLoadError(msg); setLoading(false) }
          return
        }
        const data = await res.json()
        if (!cancelled) {
          setQuestions(data.questions || [])
          setLoading(false)
        }
      } catch {
        if (!cancelled) {
          setLoadError('Could not load the quiz. Check your internet connection and try again.')
          setLoading(false)
        }
      }
    }
    load()
    return () => { cancelled = true }
  }, [courseId, token, retryCount])

  async function handleSubmit() {
    if (Object.keys(answers).length < questions.length) {
      setError('Please answer all questions before submitting.')
      return
    }
    setError('')
    setSubmitting(true)
    const tok = await freshToken()
    const res = await fetch('/api/lms/learner/quiz', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tok}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ course_id: courseId, answers }),
    })
    let data = {}
    try { data = await res.json() } catch { /* non-JSON */ }
    setSubmitting(false)
    if (!res.ok) {
      // One automatic retry on auth failure: force a session refresh and resend.
      if (res.status === 401) {
        try {
          const { data: { session } } = await supabase.auth.refreshSession()
          const retryTok = session?.access_token
          if (retryTok) {
            setSubmitting(true)
            const res2 = await fetch('/api/lms/learner/quiz', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${retryTok}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ course_id: courseId, answers }),
            })
            let data2 = {}
            try { data2 = await res2.json() } catch { /* non-JSON */ }
            setSubmitting(false)
            if (res2.ok) {
              setResult(data2); setSubmitted(true)
              if (data2.passed) onPass(data2)
              return
            }
            setError(data2.error || 'Your session expired. Please refresh the page and submit again — your answers are still here.')
            return
          }
        } catch { /* fall through to message below */ }
        setError('Your session expired. Please refresh the page and submit again — your answers are still here.')
        return
      }
      setError(data.error || 'Submit failed. Please try again.')
      return
    }
    setResult(data)
    setSubmitted(true)
    if (data.passed) onPass(data)
  }

  if (loading) return <div style={Q.center}><div style={Q.spinner} /></div>

  if (loadError) return (
    <div style={Q.empty}>
      <div style={{ fontSize: '48px' }}>⚠️</div>
      <p style={{ fontWeight: '600', color: '#c62828' }}>Unable to load the quiz</p>
      <p style={{ color: '#666', fontSize: '14px' }}>{loadError}</p>
      <button
        style={{ marginTop: '16px', background: '#b71c1c', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 24px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}
        onClick={() => setRetryCount(c => c + 1)}
      >
        Try Again
      </button>
    </div>
  )

  if (questions.length === 0) return (
    <div style={Q.empty}>
      <div style={{ fontSize: '48px' }}>📝</div>
      <p>No quiz questions have been added to this course yet.</p>
      <p style={{ color: '#999', fontSize: '13px' }}>Contact your administrator.</p>
    </div>
  )

  return (
    <div style={Q.wrap}>
      <div style={Q.header}>
        <h2 style={Q.title}>Knowledge Check</h2>
        <p style={Q.subtitle}>Passing score: {passScore}% — Answer all questions, then submit.</p>
      </div>

      {submitted && result && (
        <div style={{ ...Q.resultBanner, background: result.passed ? '#e8f5e9' : '#fff0f0', borderColor: result.passed ? '#a5d6a7' : '#ffcdd2' }}>
          <div style={{ fontSize: '32px' }}>{result.passed ? '🎉' : '❌'}</div>
          <div>
            <div style={{ fontWeight: '700', fontSize: '18px', color: result.passed ? '#2e7d32' : '#c62828' }}>
              {result.passed ? 'Congratulations! You passed!' : 'Not quite — try again'}
            </div>
            <div style={{ color: '#555', fontSize: '14px', marginTop: '4px' }}>
              Score: {result.score}% ({result.correct} of {result.total} correct)
            </div>
          </div>
        </div>
      )}

      <div style={Q.questions}>
        {questions.map((q, idx) => {
          const userAnswer = answers[q.id]
          const isCorrect = submitted && userAnswer === q.correct_answer
          const isWrong = submitted && userAnswer && userAnswer !== q.correct_answer
          const options = [
            { key: 'A', text: q.option_a },
            { key: 'B', text: q.option_b },
            { key: 'C', text: q.option_c },
            { key: 'D', text: q.option_d },
          ].filter(o => o.text)

          return (
            <div key={q.id} style={{ ...Q.questionCard, borderColor: isCorrect ? '#a5d6a7' : isWrong ? '#ffcdd2' : '#e5e5e5' }}>
              <div style={Q.questionTop}>
                <span style={Q.questionNum}>Q{idx + 1}</span>
                <p style={Q.questionText}>{q.question_text}</p>
              </div>

              {q.slide_reference && (
                <button
                  style={Q.reviewBtn}
                  onClick={() => onReviewSlide(q.slide_reference)}
                >
                  📖 Review Slide {q.slide_reference}
                </button>
              )}

              <div style={Q.options}>
                {options.map(opt => {
                  const selected = userAnswer === opt.key
                  const correct = submitted && opt.key === q.correct_answer
                  const wrong = submitted && selected && opt.key !== q.correct_answer
                  return (
                    <button
                      key={opt.key}
                      disabled={submitted}
                      onClick={() => !submitted && setAnswers(a => ({ ...a, [q.id]: opt.key }))}
                      style={{
                        ...Q.option,
                        background: correct ? '#e8f5e9' : wrong ? '#fff0f0' : selected ? '#e3f2fd' : '#f9f9f9',
                        borderColor: correct ? '#a5d6a7' : wrong ? '#ffcdd2' : selected ? '#90caf9' : '#e5e5e5',
                        cursor: submitted ? 'default' : 'pointer',
                      }}
                    >
                      <span style={Q.optKey}>{opt.key}</span>
                      <span>{opt.text}</span>
                      {correct && <span style={{ marginLeft: 'auto', color: '#2e7d32' }}>✓</span>}
                      {wrong && <span style={{ marginLeft: 'auto', color: '#c62828' }}>✗</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {error && <div style={Q.error}>{error}</div>}

      {!submitted && (
        <button
          style={{ ...Q.submitBtn, opacity: submitting ? 0.7 : 1 }}
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? 'Grading…' : `Submit Quiz (${Object.keys(answers).length}/${questions.length} answered)`}
        </button>
      )}

      {submitted && !result?.passed && (
        <button style={Q.retryBtn} onClick={() => { setAnswers({}); setSubmitted(false); setResult(null) }}>
          Retake Quiz
        </button>
      )}
    </div>
  )
}

// ─── MAIN COURSE PLAYER ────────────────────────────────────────────────────
export default function CoursePlayer() {
  const router = useRouter()
  const params = useParams()
  const courseId = params.id

  const [token, setToken] = useState(null)
  const [slides, setSlides] = useState([])
  const [progress, setProgress] = useState({})
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showQuiz, setShowQuiz] = useState(false)
  const [quizMounted, setQuizMounted] = useState(false)
  const [passed, setPassed] = useState(false)
  const [certificateId, setCertificateId] = useState(null)
  const [narrating, setNarrating] = useState(false)
  const [canAdvance, setCanAdvance] = useState(false)
  const [skipVisible, setSkipVisible] = useState(false)
  const [speechRate, setSpeechRate] = useState(1)
  const [showTranscript, setShowTranscript] = useState(false)
  const [lmsUserId, setLmsUserId] = useState(null)
  const [sessionId, setSessionId] = useState(null)
  const [slideStartTime, setSlideStartTime] = useState(null)
  const [slidesViewedThisSession, setSlidesViewedThisSession] = useState(0)
  const [courseInfo, setCourseInfo] = useState(null)

  const utteranceRef = useRef(null)
  const skipTimerRef = useRef(null)
  const slideTimeRef = useRef(null)
  const audioRef = useRef(null)
  const sessionIdRef = useRef(null)
  const tokenRef = useRef(null)
  const slidesViewedRef = useRef(0)

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  function getAudioUrl(audioPath) {
    if (!audioPath) return null
    const cleanPath = audioPath.replace(/^lms-audio\//, '')
    return SUPABASE_URL + '/storage/v1/object/public/lms-audio/' + cleanPath + '?t=' + Date.now()
  }

  // Get token
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/lms/login'); return }
      setToken(session.access_token)
      tokenRef.current = session.access_token
    })
  }, [router])

  // Load slides and progress
  useEffect(() => {
    if (!token || !courseId) return
    async function load() {
      const [slidesRes, courseRes] = await Promise.all([
        fetch(`/api/lms/learner/slides/${courseId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/lms/learner/courses', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])
      const slidesData = await slidesRes.json()
      const courseData = await courseRes.json()

      if (!slidesRes.ok) { router.push('/lms/dashboard'); return }

      const loadedSlides = slidesData.slides || []
      setSlides(loadedSlides)
      setLmsUserId(slidesData.lmsUserId)

      // Build progress map
      const progressMap = {}
      ;(slidesData.progress || []).forEach(p => {
        progressMap[p.slide_id] = p
      })
      setProgress(progressMap)

      // Find course info for pass score
      const course = (courseData.courses || []).find(c => c.id === courseId)
      setCourseInfo(course)

      // Check if already passed
      if (course?.status === 'Complete') {
        setPassed(true)
        setQuizMounted(true)
        setCertificateId(course.certificate_id)
      }

      // Resume from last viewed slide
      const lastViewed = slidesData.progress
        ?.sort((a, b) => new Date(b.last_viewed) - new Date(a.last_viewed))[0]
      if (lastViewed) {
        const idx = loadedSlides.findIndex(s => s.id === lastViewed.slide_id)
        if (idx > 0) setCurrentIndex(idx)
      }

      setLoading(false)

      // Start session
      const sessionRes = await fetch('/api/lms/learner/session', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', course_id: courseId }),
      })
      const sessionData = await sessionRes.json()
      const newSessionId = sessionData.session?.id || null
      setSessionId(newSessionId)
      sessionIdRef.current = newSessionId
    }
    load()
  }, [token, courseId, router])

  // End session reliably -- handles tab close, navigation, and unmount
  useEffect(() => {
    function endSession() {
      const sid = sessionIdRef.current
      const tok = tokenRef.current
      if (!sid || !tok) return
      // Use sendBeacon for tab close -- it survives page unload
      const payload = JSON.stringify({ action: 'end', course_id: courseId, session_id: sid, slides_viewed: slidesViewedRef.current })
      const blob = new Blob([payload], { type: 'application/json' })
      navigator.sendBeacon
        ? navigator.sendBeacon('/api/lms/learner/session?token=' + tok, blob)
        : fetch('/api/lms/learner/session', { method: 'POST', headers: { 'Authorization': 'Bearer ' + tok, 'Content-Type': 'application/json' }, body: payload, keepalive: true })
      sessionIdRef.current = null
    }

    function handleVisibility() {
      if (document.visibilityState === 'hidden') endSession()
    }

    window.addEventListener('beforeunload', endSession)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      endSession()
      window.removeEventListener('beforeunload', endSession)
      document.removeEventListener('visibilitychange', handleVisibility)
      window.speechSynthesis?.cancel()
    }
  }, [courseId])

  // Save slide progress
  const saveProgress = useCallback(async (slideId, timeSpent) => {
    if (!token || !lmsUserId) return
    await fetch('/api/lms/learner/progress', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        course_id: courseId,
        slide_id: slideId,
        time_spent_seconds: timeSpent,
        completed: true,
      }),
    })
    setProgress(prev => ({ ...prev, [slideId]: { ...prev[slideId], completed: true } }))
  }, [token, lmsUserId, courseId])

  // Narrate current slide -- use ElevenLabs MP3 if available, fallback to Web Speech
  const narrateSlide = useCallback((slide, rate) => {
    window.speechSynthesis?.cancel()
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }

    if (!slide?.speaker_notes && !slide?.audio_path) {
      setNarrating(false)
      setCanAdvance(true)
      return
    }

    setNarrating(true)
    setCanAdvance(false)
    setSkipVisible(false)
    skipTimerRef.current = setTimeout(() => setSkipVisible(true), 5000)

    const audioUrl = getAudioUrl(slide.audio_path)
    if (audioUrl) {
      // Use ElevenLabs MP3
      const audio = new Audio(audioUrl)
      audioRef.current = audio
      audio.onended = () => {
        setNarrating(false)
        setCanAdvance(true)
        clearTimeout(skipTimerRef.current)
        audioRef.current = null
      }
      audio.onerror = () => {
        setNarrating(false)
        setCanAdvance(true)
        audioRef.current = null
      }
      audio.play().catch(() => {
        setNarrating(false)
        setCanAdvance(true)
      })
    } else if (slide.speaker_notes) {
      // Fallback to Web Speech API
      const utterance = new SpeechSynthesisUtterance(slide.speaker_notes)
      utterance.rate = rate || 1
      utterance.onend = () => {
        setNarrating(false)
        setCanAdvance(true)
        clearTimeout(skipTimerRef.current)
      }
      utterance.onerror = () => {
        setNarrating(false)
        setCanAdvance(true)
      }
      utteranceRef.current = utterance
      window.speechSynthesis.speak(utterance)
    } else {
      setNarrating(false)
      setCanAdvance(true)
    }
  }, [])

  // When slide changes -- reset state, user must click Play or Next to trigger narration
  useEffect(() => {
    if (loading || slides.length === 0 || showQuiz) return
    window.speechSynthesis?.cancel()
    clearTimeout(skipTimerRef.current)
    setSlideStartTime(Date.now())
    setNarrating(false)
    setSkipVisible(false)
    const slide = slides[currentIndex]
    if (!slide?.speaker_notes) {
      setCanAdvance(true)
    } else {
      setCanAdvance(false)
    }
    setSlidesViewedThisSession(prev => {
      const next = prev + 1
      slidesViewedRef.current = next
      return next
    })
    return () => {
      window.speechSynthesis?.cancel()
      clearTimeout(skipTimerRef.current)
    }
  }, [currentIndex, loading, slides, showQuiz, speechRate])

  // When speech rate changes mid-narration
  function handleRateChange(newRate) {
    setSpeechRate(newRate)
    const slide = slides[currentIndex]
    if (narrating && slide) narrateSlide(slide, newRate)
  }

  function handleSkip() {
    window.speechSynthesis?.cancel()
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    clearTimeout(skipTimerRef.current)
    setNarrating(false)
    setCanAdvance(true)
    setSkipVisible(false)
  }

  async function handleNext() {
    const slide = slides[currentIndex]
    const timeSpent = slideStartTime ? Math.round((Date.now() - slideStartTime) / 1000) : 0
    await saveProgress(slide.id, timeSpent)

    if (currentIndex < slides.length - 1) {
      const nextIdx = currentIndex + 1
      setCurrentIndex(nextIdx)
      // Narrate next slide directly from user gesture -- satisfies browser autoplay policy
      setTimeout(() => {
        const nextSlide = slides[nextIdx]
        if (nextSlide) narrateSlide(nextSlide, speechRate)
      }, 50)
    } else {
      window.speechSynthesis?.cancel()
      setQuizMounted(true)
      setShowQuiz(true)
    }
  }

  function handlePrev() {
    if (currentIndex > 0) {
      window.speechSynthesis?.cancel()
      setCurrentIndex(i => i - 1)
    }
  }

  function handleThumbnailClick(idx) {
    window.speechSynthesis?.cancel()
    setCurrentIndex(idx)
    setShowQuiz(false)
  }

  function handleReviewSlide(slideNum) {
    const idx = slides.findIndex(s => s.slide_order === slideNum)
    if (idx >= 0) {
      setShowQuiz(false)
      setCurrentIndex(idx)
    }
  }

  function handleQuizPass(result) {
    setPassed(true)
    setCertificateId(result.certificate_id)
  }

  if (loading) return (
    <div style={P.loadPage}>
      <div style={P.spinner} />
      <p style={{ color: '#fff', marginTop: '16px' }}>Loading course…</p>
    </div>
  )

  const currentSlide = slides[currentIndex]
  const viewedCount = Object.values(progress).filter(p => p.completed).length

  return (
    <div style={P.page}>
      {/* Top Bar */}
      <div style={P.topBar}>
        <button style={P.backBtn} onClick={() => router.push('/lms/dashboard')}>← Dashboard</button>
        <div style={P.topCenter}>
          <span style={P.slideCounter}>
            {showQuiz ? 'Knowledge Check' : `Slide ${currentIndex + 1} of ${slides.length}`}
          </span>
          <div style={P.progressBar}>
            <div style={{ ...P.progressFill, width: `${(viewedCount / slides.length) * 100}%` }} />
          </div>
        </div>
        <div style={P.topRight}>
          {/* Speech rate */}
          {!showQuiz && (
            <select
              value={speechRate}
              onChange={e => handleRateChange(parseFloat(e.target.value))}
              style={P.rateSelect}
            >
              <option value={0.75}>0.75x</option>
              <option value={1}>1x</option>
              <option value={1.25}>1.25x</option>
              <option value={1.5}>1.5x</option>
            </select>
          )}
          {!showQuiz && currentSlide?.speaker_notes && (
            <button style={P.iconBtn} onClick={() => setShowTranscript(t => !t)} title="Toggle transcript">
              📄
            </button>
          )}
        </div>
      </div>

      <div style={P.body}>
        {/* Slide Thumbnail Strip */}
        <div style={P.thumbStrip}>
          {slides.map((slide, idx) => {
            const isViewed = progress[slide.id]?.completed
            const isCurrent = idx === currentIndex && !showQuiz
            return (
              <div
                key={slide.id}
                onClick={() => handleThumbnailClick(idx)}
                style={{
                  ...P.thumb,
                  border: isCurrent ? '2px solid #b71c1c' : isViewed ? '2px solid #2e7d32' : '2px solid transparent',
                  opacity: isCurrent ? 1 : 0.75,
                }}
              >
                {slide.image_url
                  ? <img src={slide.image_url} alt={`Slide ${idx + 1}`} style={P.thumbImg} />
                  : <div style={P.thumbPlaceholder}>{idx + 1}</div>
                }
                {isViewed && <div style={P.thumbCheck}>✓</div>}
                <div style={P.thumbNum}>{idx + 1}</div>
              </div>
            )
          })}
          <div
            onClick={() => { setQuizMounted(true); setShowQuiz(true) }}
            style={{
              ...P.thumb,
              border: showQuiz ? '2px solid #b71c1c' : passed ? '2px solid #2e7d32' : '2px solid #ddd',
              background: '#f5f5f5',
            }}
          >
            <div style={{ fontSize: '20px', textAlign: 'center', paddingTop: '12px' }}>
              {passed ? '✅' : '📝'}
            </div>
            <div style={P.thumbNum}>Quiz</div>
          </div>
        </div>

        {/* Main Content */}
        <div style={P.mainArea}>
          {/* Quiz stays mounted once reached, so reviewing a slide doesn't reset answers */}
          {quizMounted && (
            <div style={{ ...P.quizWrap, display: showQuiz ? 'block' : 'none' }}>
              {passed ? (
                <div style={P.passCard}>
                  <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎓</div>
                  <h2 style={{ color: '#2e7d32', fontSize: '24px', margin: '0 0 8px' }}>Course Complete!</h2>
                  <p style={{ color: '#555', marginBottom: '24px' }}>You have successfully completed this course.</p>
                  {certificateId && (
                    <button style={P.certBtn} onClick={() => router.push(`/lms/certificate/${certificateId}`)}>
                      🎓 Download Certificate
                    </button>
                  )}
                  <button style={{ ...P.certBtn, background: '#f5f5f5', color: '#333', marginTop: '12px' }}
                    onClick={() => router.push('/lms/dashboard')}>
                    ← Back to Dashboard
                  </button>
                </div>
              ) : (
                <QuizPanel
                  courseId={courseId}
                  token={token}
                  passScore={courseInfo?.pass_score || 80}
                  onPass={handleQuizPass}
                  onReviewSlide={handleReviewSlide}
                />
              )}
            </div>
          )}

          {!showQuiz && (
            <div style={P.slideArea}>
              {/* Slide Image */}
              <div style={P.slideFrame} onContextMenu={e => e.preventDefault()}>
                {currentSlide?.image_url ? (
                  <img
                    src={currentSlide.image_url}
                    alt={`Slide ${currentIndex + 1}`}
                    style={P.slideImg}
                    draggable={false}
                  />
                ) : (
                  <div style={P.slideNoImage}>
                    <div style={{ fontSize: '48px' }}>📄</div>
                    <p>Slide {currentIndex + 1}</p>
                  </div>
                )}

                {/* Narration indicator */}
                {narrating && (
                  <div style={P.narrationBadge}>
                    🔊 Playing narration…
                  </div>
                )}
              </div>

              {/* Transcript */}
              {showTranscript && currentSlide?.speaker_notes && (
                <div style={P.transcript}>
                  <strong style={{ fontSize: '12px', color: '#bbb', textTransform: 'uppercase' }}>Transcript</strong>
                  <p style={{ margin: '8px 0 0', fontSize: '14px', lineHeight: '1.6', color: '#f0f0f0' }}>
                    {currentSlide.speaker_notes}
                  </p>
                </div>
              )}

              {/* Controls */}
              <div style={P.controls}>
                <button
                  style={{ ...P.navBtn, opacity: currentIndex === 0 ? 0.4 : 1 }}
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                >
                  Back
                </button>

                {narrating && skipVisible && (
                  <button style={P.skipBtn} onClick={handleSkip}>
                    Skip Narration
                  </button>
                )}

                {!narrating && !canAdvance && currentSlide?.speaker_notes && (
                  <button style={{ ...P.skipBtn, background: '#b71c1c' }} onClick={() => narrateSlide(currentSlide, speechRate)}>
                    Play Narration
                  </button>
                )}

                {!narrating && !canAdvance && currentSlide?.speaker_notes && (
                  <button style={P.skipBtn} onClick={() => narrateSlide(currentSlide, speechRate)}>
                    Play Narration
                  </button>
                )}

                {narrating && !skipVisible && (
                  <div style={P.waitMsg}>Narrating...</div>
                )}

                {!currentSlide?.speaker_notes && !canAdvance && (
                  <div style={P.waitMsg}></div>
                )}

                <button
                  style={{
                    ...P.navBtn,
                    background: canAdvance ? '#b71c1c' : '#ccc',
                    color: '#fff',
                    cursor: canAdvance ? 'pointer' : 'not-allowed',
                  }}
                  onClick={handleNext}
                  disabled={!canAdvance}
                >
                  {currentIndex === slides.length - 1 ? 'Take Quiz' : 'Next'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Quiz styles
const Q = {
  wrap: { maxWidth: '720px', margin: '0 auto', padding: '24px' },
  header: { marginBottom: '24px' },
  title: { fontSize: '22px', fontWeight: '700', color: '#1a1a2e', margin: '0 0 4px' },
  subtitle: { fontSize: '14px', color: '#666', margin: 0 },
  center: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' },
  spinner: { width: '40px', height: '40px', border: '4px solid #ddd', borderTop: '4px solid #b71c1c', borderRadius: '50%', animation: 'spin 1s linear infinite' },
  empty: { textAlign: 'center', padding: '60px', color: '#666' },
  resultBanner: { display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px', borderRadius: '12px', border: '1px solid', marginBottom: '24px' },
  questions: { display: 'flex', flexDirection: 'column', gap: '20px' },
  questionCard: { border: '1px solid', borderRadius: '12px', overflow: 'hidden' },
  questionTop: { display: 'flex', gap: '12px', padding: '16px 16px 8px', alignItems: 'flex-start' },
  questionNum: { background: '#1a1a2e', color: '#fff', borderRadius: '6px', padding: '2px 8px', fontSize: '12px', fontWeight: '700', flexShrink: 0, marginTop: '2px' },
  questionText: { fontSize: '15px', fontWeight: '600', color: '#1a1a2e', margin: 0, lineHeight: '1.4' },
  reviewBtn: { margin: '0 16px 8px', background: '#e3f2fd', color: '#1565c0', border: 'none', borderRadius: '6px', padding: '4px 12px', fontSize: '12px', cursor: 'pointer', fontWeight: '600', display: 'inline-block' },
  options: { padding: '8px 16px 16px', display: 'flex', flexDirection: 'column', gap: '8px' },
  option: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '8px', border: '1px solid', fontSize: '14px', textAlign: 'left', width: '100%', transition: 'all 0.15s' },
  optKey: { fontWeight: '700', color: '#555', minWidth: '20px' },
  error: { background: '#fff0f0', border: '1px solid #ffcdd2', color: '#c62828', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', margin: '16px 0' },
  submitBtn: { width: '100%', background: '#b71c1c', color: '#fff', border: 'none', borderRadius: '10px', padding: '14px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', marginTop: '24px' },
  retryBtn: { width: '100%', background: '#e3f2fd', color: '#1565c0', border: 'none', borderRadius: '10px', padding: '14px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', marginTop: '12px' },
}

// Player styles
const P = {
  page: { display: 'flex', flexDirection: 'column', height: '100vh', background: '#1a1a2e', fontFamily: 'Arial, Helvetica, sans-serif', overflow: 'hidden' },
  loadPage: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#1a1a2e' },
  spinner: { width: '48px', height: '48px', border: '4px solid rgba(255,255,255,0.2)', borderTop: '4px solid #fff', borderRadius: '50%', animation: 'spin 1s linear infinite' },
  topBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', background: 'rgba(0,0,0,0.4)', flexShrink: 0, gap: '16px' },
  backBtn: { background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', cursor: 'pointer', fontWeight: '600', whiteSpace: 'nowrap' },
  topCenter: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' },
  slideCounter: { color: '#fff', fontSize: '13px', fontWeight: '600' },
  progressBar: { width: '100%', maxWidth: '300px', height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px', overflow: 'hidden' },
  progressFill: { height: '100%', background: '#b71c1c', transition: 'width 0.4s ease' },
  topRight: { display: 'flex', alignItems: 'center', gap: '8px' },
  rateSelect: { background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', padding: '4px 8px', fontSize: '12px', cursor: 'pointer' },
  iconBtn: { background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', fontSize: '16px' },
  body: { display: 'flex', flex: 1, overflow: 'hidden' },
  thumbStrip: { width: '110px', flexShrink: 0, overflowY: 'auto', background: 'rgba(0,0,0,0.3)', padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '8px' },
  thumb: { position: 'relative', borderRadius: '6px', overflow: 'hidden', cursor: 'pointer', background: '#2a2a3e', flexShrink: 0, transition: 'all 0.15s' },
  thumbImg: { width: '100%', display: 'block', aspectRatio: '16/9', objectFit: 'cover' },
  thumbPlaceholder: { width: '100%', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '16px', fontWeight: '700' },
  thumbCheck: { position: 'absolute', top: '2px', right: '2px', background: '#2e7d32', color: '#fff', borderRadius: '50%', width: '16px', height: '16px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  thumbNum: { textAlign: 'center', fontSize: '10px', color: 'rgba(255,255,255,0.6)', padding: '2px 0' },
  mainArea: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  slideArea: { display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' },
  slideFrame: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', padding: '16px' },
  slideImg: { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', userSelect: 'none', pointerEvents: 'none' },
  slideNoImage: { textAlign: 'center', color: '#fff' },
  narrationBadge: { position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' },
  transcript: { background: 'rgba(0,0,0,0.45)', borderTop: '1px solid rgba(255,255,255,0.1)', padding: '12px 20px', maxHeight: '120px', overflowY: 'auto' },
  controls: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', background: 'rgba(0,0,0,0.3)', gap: '12px', flexShrink: 0 },
  navBtn: { background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' },
  skipBtn: { background: '#fbbf24', color: '#1a1a2e', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' },
  waitMsg: { color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: '600' },
  quizWrap: { flex: 1, overflowY: 'auto', background: '#f5f5f5' },
  passCard: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100%', padding: '40px', textAlign: 'center' },
  certBtn: { background: '#b71c1c', color: '#fff', border: 'none', borderRadius: '10px', padding: '14px 28px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', width: '100%', maxWidth: '300px' },
}

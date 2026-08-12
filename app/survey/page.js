'use client'

import { useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'

const LIKERT_SCALE = [
  { value: 1, label: 'Strongly disagree' },
  { value: 2, label: 'Disagree' },
  { value: 3, label: 'Neutral' },
  { value: 4, label: 'Agree' },
  { value: 5, label: 'Strongly agree' }
]

const WORK_LOCATIONS = ['Slope', 'Off Slope']

const CODE_ERRORS = {
  'Invalid code': "That code isn't recognized. Check the card and try again.",
  'This code has already been used': 'This code has already been submitted. Each code works once.',
  'This survey is closed': 'This survey has closed.'
}

const ALREADY_USED = 'This code has already been used'

// options arrives as jsonb; supabase-js normally hands it back parsed, but tolerate a string
function toOptions(raw) {
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

export default function Survey() {
  const [screen, setScreen] = useState('code') // code | intro | questions | done

  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [codeError, setCodeError] = useState('')

  const [title, setTitle] = useState('')
  const [roleBand, setRoleBand] = useState('')
  const [questions, setQuestions] = useState([])

  const [workLocation, setWorkLocation] = useState('')
  const [locationError, setLocationError] = useState('')

  const [respondentName, setRespondentName] = useState('')
  const [respondentRole, setRespondentRole] = useState('')

  const [answers, setAnswers] = useState({})
  const [elaborations, setElaborations] = useState({})
  const [showMissing, setShowMissing] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // Guards the double-tap race. A ref, not state: two taps can land in the same
  // tick, before React has re-rendered the disabled button.
  const inFlight = useRef(false)

  const requiredQuestions = questions.filter(q => q.qtype !== 'text')
  const answeredRequired = requiredQuestions.filter(q => answers[q.question_id] != null).length

  const isAnswered = (q) => {
    const value = answers[q.question_id]
    if (q.qtype === 'text') return true
    return value != null
  }

  const setAnswer = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
  }

  const setElaboration = (questionId, value) => {
    setElaborations(prev => ({ ...prev, [questionId]: value }))
  }

  const handleLookup = async (e) => {
    e.preventDefault()

    const token = code.trim().toUpperCase()
    if (!token) {
      setCodeError('Enter the code from your card.')
      return
    }

    setLoading(true)
    setCodeError('')

    const { data, error } = await supabase.rpc('get_survey', { p_token: token })

    if (error) {
      setCodeError(CODE_ERRORS[error.message] || 'Something went wrong. Try again in a moment.')
      setLoading(false)
      return
    }

    if (!data || data.length === 0) {
      setCodeError(CODE_ERRORS['Invalid code'])
      setLoading(false)
      return
    }

    const rows = [...data].sort((a, b) => a.sort_order - b.sort_order)

    setTitle(rows[0].title)
    setRoleBand(rows[0].role_band)
    setQuestions(rows)
    setCode(token)
    setScreen('intro')
    setLoading(false)
  }

  const handleStart = () => {
    if (!workLocation) {
      setLocationError('Choose where you work.')
      return
    }
    setLocationError('')
    setScreen('questions')
  }

  const handleSubmit = async () => {
    if (inFlight.current) return

    const missing = requiredQuestions.filter(q => answers[q.question_id] == null)
    if (missing.length > 0) {
      setShowMissing(true)
      setSubmitError(
        missing.length === 1
          ? 'One question still needs an answer.'
          : `${missing.length} questions still need an answer.`
      )
      const el = document.getElementById(`question-${missing[0].question_id}`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    inFlight.current = true
    setSubmitting(true)
    setSubmitError('')

    const payload = []
    for (const q of questions) {
      const value = answers[q.question_id]
      if (q.qtype === 'likert5') {
        payload.push({ question_id: q.question_id, likert: value })
      } else if (q.qtype === 'select') {
        const elab = (elaborations[q.question_id] || '').trim()
        payload.push({
          question_id: q.question_id,
          choice: value,
          ...(elab ? { free_text: elab } : {})
        })
      } else if (q.qtype === 'text') {
        const text = (value || '').trim()
        if (text) payload.push({ question_id: q.question_id, free_text: text })
      }
    }

    const { error } = await supabase.rpc('submit_survey', {
      p_token: code,
      p_work_location: workLocation,
      p_answers: payload,
      p_name: respondentName.trim() || null,
      p_role: respondentRole.trim() || null
    })

    if (error) {
      // A double tap can land a second call after the first already committed.
      // We only get here having started a submit ourselves, so a used-code error
      // means our own write went through.
      if (error.message === ALREADY_USED) {
        setScreen('done')
        return
      }
      inFlight.current = false
      setSubmitting(false)
      setSubmitError('Your response did not send. Check your connection and try again.')
      return
    }

    setScreen('done')
  }

  return (
    <div className="page">
      <div className="card">
        <div className="card-header">
          <img src="/Logo.png" alt="SLP Alaska" />
          <h1>{screen === 'code' ? 'Safety Culture Survey' : title}</h1>
          {screen === 'questions' && (
            <p>
              {respondentRole.trim()
                ? `Responding as ${respondentRole.trim()} \u00B7 ${workLocation}`
                : `Responding \u00B7 ${workLocation}`}
            </p>
          )}
        </div>

        {screen === 'code' && (
          <div className="card-body">
            <form onSubmit={handleLookup}>
              <div className="form-group">
                <label htmlFor="code" className="required">Enter the code from your card</label>
                <input
                  id="code"
                  className="code-input"
                  type="text"
                  inputMode="text"
                  autoComplete="off"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck="false"
                  maxLength={16}
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.trim().toUpperCase())
                    setCodeError('')
                  }}
                  placeholder="ENTER CODE"
                  disabled={loading}
                />
                <p className="hint">Anonymous unless you choose to add your name on the next screen.</p>
              </div>

              {codeError && <div className="alert error">{codeError}</div>}

              <button type="submit" className="primary" disabled={loading || !code}>
                {loading ? 'Checking…' : 'Continue'}
              </button>
            </form>
          </div>
        )}

        {screen === 'intro' && (
          <div className="card-body">
            <div className="privacy">
              <p>
                This survey is anonymous unless you choose to add your name below. Name and
                role are completely optional &mdash; leave them blank and your answers are not
                linked to you, your code, or your device.
              </p>
              <p>
                Written comments are shown to leadership word for word. Write them the way you
                would be comfortable having them read aloud.
              </p>
            </div>

            <div className="name-role-grid">
              <div className="form-group">
                <label htmlFor="respondent-name">
                  Name <span className="optional">(Optional)</span>
                </label>
                <input
                  id="respondent-name"
                  className="text-input"
                  type="text"
                  autoComplete="off"
                  maxLength={80}
                  value={respondentName}
                  onChange={(e) => setRespondentName(e.target.value)}
                  placeholder="Leave blank to stay anonymous"
                />
              </div>
              <div className="form-group">
                <label htmlFor="respondent-role">
                  Role / Position <span className="optional">(Optional)</span>
                </label>
                <input
                  id="respondent-role"
                  className="text-input"
                  type="text"
                  autoComplete="off"
                  maxLength={80}
                  value={respondentRole}
                  onChange={(e) => setRespondentRole(e.target.value)}
                  placeholder="e.g. Operator, Lead, Manager"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="required">Where do you work?</label>
              <div className="location-grid">
                {WORK_LOCATIONS.map(location => (
                  <button
                    key={location}
                    type="button"
                    className={`choice large ${workLocation === location ? 'selected' : ''}`}
                    onClick={() => {
                      setWorkLocation(location)
                      setLocationError('')
                    }}
                  >
                    {location}
                  </button>
                ))}
              </div>
            </div>

            {locationError && <div className="alert error">{locationError}</div>}

            <button type="button" className="primary" onClick={handleStart}>
              Start the survey
            </button>
          </div>
        )}

        {screen === 'questions' && (
          <>
            <div className="progress">
              <div className="progress-text">
                {answeredRequired} of {requiredQuestions.length} answered
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{
                    width: requiredQuestions.length
                      ? `${(answeredRequired / requiredQuestions.length) * 100}%`
                      : '0%'
                  }}
                />
              </div>
            </div>

            <div className="card-body">
              {questions.map((q, index) => {
                const missing = showMissing && !isAnswered(q)
                return (
                  <div
                    key={q.question_id}
                    id={`question-${q.question_id}`}
                    className={`question ${missing ? 'missing' : ''}`}
                  >
                    <div className="prompt">
                      <span className="number">{index + 1}</span>
                      <span>
                        {q.prompt}
                        {q.qtype === 'text' && <span className="optional"> (Optional)</span>}
                      </span>
                    </div>

                    {q.qtype === 'likert5' && (
                      <div className="likert-grid">
                        {LIKERT_SCALE.map(point => (
                          <button
                            key={point.value}
                            type="button"
                            className={`choice ${answers[q.question_id] === point.value ? 'selected' : ''}`}
                            onClick={() => setAnswer(q.question_id, point.value)}
                          >
                            {point.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {q.qtype === 'select' && (
                      <>
                        <div className="select-list">
                          {toOptions(q.options).map(option => (
                            <button
                              key={option}
                              type="button"
                              className={`choice ${answers[q.question_id] === option ? 'selected' : ''}`}
                              onClick={() => setAnswer(q.question_id, option)}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                        {answers[q.question_id] != null && (
                          <div className="elaboration">
                            <label className="elaboration-label">
                              Please elaborate specifically on the task or location or issue
                              that made you choose this response. <span className="optional">(Optional)</span>
                            </label>
                            <textarea
                              rows={4}
                              value={elaborations[q.question_id] || ''}
                              onChange={(e) => setElaboration(q.question_id, e.target.value)}
                              placeholder="Task, location, or issue behind your answer."
                            />
                          </div>
                        )}
                      </>
                    )}

                    {q.qtype === 'text' && (
                      <textarea
                        rows={5}
                        value={answers[q.question_id] || ''}
                        onChange={(e) => setAnswer(q.question_id, e.target.value)}
                        placeholder="Type your comment here."
                      />
                    )}

                    {missing && <p className="missing-note">This one still needs an answer.</p>}
                  </div>
                )
              })}

              {submitError && <div className="alert error">{submitError}</div>}

              <button
                type="button"
                className="primary"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? 'Sending…' : 'Submit my answers'}
              </button>
            </div>
          </>
        )}

        {screen === 'done' && (
          <div className="card-body done">
            <div className="check">&#10003;</div>
            <h2>Your response has been recorded.</h2>
            <p>Thank you.</p>
          </div>
        )}
      </div>

      <style jsx>{`
        .page {
          min-height: 100vh;
          background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .card {
          max-width: 800px;
          margin: 0 auto;
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
          overflow: hidden;
        }

        .card-header {
          background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
          color: white;
          padding: 30px;
          text-align: center;
        }

        .card-header img {
          max-height: 60px;
          margin-bottom: 15px;
        }

        .card-header h1 {
          margin: 0 0 10px 0;
          font-size: 24px;
        }

        .card-header p {
          margin: 0;
          opacity: 0.9;
          font-size: 14px;
        }

        .card-body {
          padding: 30px;
        }

        .form-group {
          margin-bottom: 24px;
        }

        .form-group label {
          display: block;
          margin-bottom: 10px;
          font-weight: 500;
          color: #1f2937;
          font-size: 17px;
        }

        .required::after {
          content: ' *';
          color: #991b1b;
        }

        .code-input {
          width: 100%;
          padding: 16px;
          min-height: 56px;
          border: 2px solid #d1d5db;
          border-radius: 8px;
          font-size: 28px;
          letter-spacing: 6px;
          text-align: center;
          text-transform: uppercase;
          font-family: ui-monospace, 'SF Mono', Menlo, monospace;
          box-sizing: border-box;
        }

        .code-input:focus {
          outline: none;
          border-color: #1e40af;
        }

        .hint {
          margin: 8px 0 0;
          font-size: 14px;
          color: #6b7280;
        }

        .name-role-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .text-input {
          width: 100%;
          padding: 14px;
          min-height: 52px;
          border: 2px solid #d1d5db;
          border-radius: 8px;
          font-size: 16px;
          font-family: inherit;
          box-sizing: border-box;
        }

        .text-input:focus {
          outline: none;
          border-color: #1e40af;
        }

        .elaboration {
          margin-top: 14px;
          padding: 14px;
          background: #f3f4f6;
          border-left: 4px solid #1e40af;
          border-radius: 6px;
        }

        .elaboration-label {
          display: block;
          margin-bottom: 10px;
          font-size: 15px;
          font-weight: 500;
          color: #1f2937;
          line-height: 1.5;
        }

        .privacy {
          background: #f3f4f6;
          border-left: 4px solid #1e40af;
          padding: 18px 20px;
          border-radius: 6px;
          margin-bottom: 28px;
        }

        .privacy p {
          margin: 0 0 14px;
          font-size: 15px;
          line-height: 1.6;
          color: #374151;
        }

        .privacy p:last-child {
          margin-bottom: 0;
        }

        .location-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .progress {
          position: sticky;
          top: 0;
          z-index: 10;
          background: white;
          border-bottom: 1px solid #e5e7eb;
          padding: 14px 30px;
        }

        .progress-text {
          font-size: 14px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 8px;
        }

        .progress-track {
          height: 8px;
          background: #e5e7eb;
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: #1e40af;
          border-radius: 4px;
          transition: width 0.2s ease;
        }

        .question {
          padding: 22px 0;
          border-bottom: 1px solid #e5e7eb;
        }

        .question:first-child {
          padding-top: 0;
        }

        .question.missing {
          background: #fef2f2;
          margin: 0 -30px;
          padding-left: 30px;
          padding-right: 30px;
          border-left: 4px solid #991b1b;
        }

        .prompt {
          display: flex;
          gap: 12px;
          font-size: 17px;
          line-height: 1.5;
          color: #1f2937;
          margin-bottom: 16px;
          font-weight: 500;
        }

        .number {
          flex: 0 0 28px;
          height: 28px;
          background: #1e3a8a;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 600;
        }

        .optional {
          font-weight: 400;
          color: #6b7280;
        }

        .likert-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 10px;
        }

        .select-list {
          display: grid;
          gap: 10px;
        }

        .choice {
          min-height: 56px;
          padding: 12px 14px;
          border: 2px solid #d1d5db;
          border-radius: 8px;
          background: white;
          color: #1f2937;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          text-align: center;
          line-height: 1.3;
          transition: border-color 0.15s, background 0.15s;
        }

        .select-list .choice {
          text-align: left;
        }

        .choice:hover {
          border-color: #1e40af;
        }

        .choice.selected {
          border-color: #1e3a8a;
          background: #1e3a8a;
          color: white;
        }

        .choice.large {
          min-height: 84px;
          font-size: 20px;
          font-weight: 600;
        }

        textarea {
          width: 100%;
          padding: 14px;
          border: 2px solid #d1d5db;
          border-radius: 8px;
          font-size: 16px;
          font-family: inherit;
          line-height: 1.5;
          resize: vertical;
          box-sizing: border-box;
        }

        textarea:focus {
          outline: none;
          border-color: #1e40af;
        }

        .missing-note {
          margin: 10px 0 0;
          color: #991b1b;
          font-size: 14px;
          font-weight: 500;
        }

        .alert {
          padding: 14px 16px;
          border-radius: 8px;
          margin-bottom: 20px;
          font-size: 15px;
          line-height: 1.5;
        }

        .alert.error {
          background: #fef2f2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }

        .primary {
          width: 100%;
          min-height: 56px;
          padding: 16px;
          background: #ea580c;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 18px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .primary:hover:not(:disabled) {
          background: #c2410c;
        }

        .primary:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        .done {
          text-align: center;
          padding: 60px 30px;
        }

        .check {
          width: 72px;
          height: 72px;
          margin: 0 auto 24px;
          border-radius: 50%;
          background: #dcfce7;
          color: #15803d;
          font-size: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .done h2 {
          margin: 0 0 12px;
          font-size: 22px;
          color: #1f2937;
        }

        .done p {
          margin: 0;
          font-size: 16px;
          color: #6b7280;
        }

        @media (max-width: 640px) {
          .page {
            padding: 0;
          }

          .card {
            border-radius: 0;
          }

          .card-body {
            padding: 20px;
          }

          .progress {
            padding: 12px 20px;
          }

          .question.missing {
            margin: 0 -20px;
            padding-left: 20px;
            padding-right: 20px;
          }

          .name-role-grid {
            grid-template-columns: 1fr;
          }

          .likert-grid {
            grid-template-columns: 1fr;
          }

          .likert-grid .choice {
            text-align: left;
          }
        }
      `}</style>
    </div>
  )
}

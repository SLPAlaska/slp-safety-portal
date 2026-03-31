'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

function ProgressRing({ percent, size = 80, stroke = 7 }) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percent / 100) * circumference
  const color = percent === 100 ? '#2e7d32' : percent > 0 ? '#1565c0' : '#ddd'
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#eee" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circumference} strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
    </svg>
  )
}

function formatTime(seconds) {
  if (!seconds) return '0m'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function StatusBadge({ status }) {
  const map = {
    'Complete':    { bg: '#e8f5e9', color: '#2e7d32' },
    'In Progress': { bg: '#e3f2fd', color: '#1565c0' },
    'Not Started': { bg: '#f5f5f5', color: '#999' },
  }
  const s = map[status] || { bg: '#f5f5f5', color: '#999' }
  return <span style={{ background: s.bg, color: s.color, padding: '3px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' }}>{status}</span>
}

export default function LmsDashboard() {
  const [courses, setCourses] = useState([])
  const [lmsUser, setLmsUser] = useState(null)
  const [isCompanyAdmin, setIsCompanyAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/lms/login'; return }

      // Check role
      const checkRes = await fetch('/api/lms/learner/check-user', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      const checkData = await checkRes.json()
      if (checkRes.ok && checkData.role === 'company_admin') setIsCompanyAdmin(true)

      const res = await fetch('/api/lms/learner/courses', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to load courses.'); setLoading(false); return }
      setCourses(data.courses || [])
      setLmsUser(data.lmsUser)
      setLoading(false)
    }
    load()
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    window.location.href = '/lms/login'
  }

  if (loading) return (
    <div style={S.page}>
      <div style={S.loadingCenter}>
        <div style={S.spinner} />
        <p style={{ color: '#666', marginTop: '16px' }}>Loading your training…</p>
      </div>
    </div>
  )

  const completedCount = courses.filter(c => c.status === 'Complete').length
  const inProgressCount = courses.filter(c => c.status === 'In Progress').length
  const totalTime = courses.reduce((sum, c) => sum + (c.total_time_seconds || 0), 0)

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div style={S.headerLeft}>
          <img src="/Logo.png" alt="SLP Alaska" style={S.logo} onError={e => e.target.style.display='none'} />
          <div>
            <h1 style={S.title}>My Training Dashboard</h1>
            <p style={S.subtitle}>Welcome back, {lmsUser?.full_name?.split(' ')[0] || 'Learner'}</p>
          </div>
        </div>
        <div style={S.headerRight}>
          {isCompanyAdmin && (
            <a href="/lms/company-dashboard" style={S.adminBtn}>🏢 Company Dashboard</a>
          )}
          <button onClick={handleSignOut} style={S.signOutBtn}>Sign Out</button>
        </div>
      </div>

      {/* Stats Bar */}
      <div style={S.statsBar}>
        <div style={S.statCard}>
          <div style={S.statNumber}>{courses.length}</div>
          <div style={S.statLabel}>Assigned Courses</div>
        </div>
        <div style={S.statCard}>
          <div style={{ ...S.statNumber, color: '#2e7d32' }}>{completedCount}</div>
          <div style={S.statLabel}>Completed</div>
        </div>
        <div style={S.statCard}>
          <div style={{ ...S.statNumber, color: '#1565c0' }}>{inProgressCount}</div>
          <div style={S.statLabel}>In Progress</div>
        </div>
        <div style={S.statCard}>
          <div style={S.statNumber}>{formatTime(totalTime)}</div>
          <div style={S.statLabel}>Total Time</div>
        </div>
      </div>

      {error && <div style={S.error}>{error}</div>}

      {courses.length === 0 ? (
        <div style={S.empty}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📚</div>
          <p style={{ fontSize: '18px', fontWeight: '600', color: '#333' }}>No courses assigned yet.</p>
          <p style={{ color: '#999', marginTop: '8px' }}>Contact your administrator to get started.</p>
        </div>
      ) : (
        <div style={S.grid}>
          {courses.map(course => (
            <div key={course.id} style={S.card}>
              <div style={S.cardTop}>
                <div style={S.cardTitleRow}>
                  <h2 style={S.cardTitle}>{course.title}</h2>
                  <StatusBadge status={course.status} />
                </div>
                {course.regulation_ref && <p style={S.regulation}>{course.regulation_ref}</p>}
              </div>
              <div style={S.cardMid}>
                <div style={S.ringWrap}>
                  <div style={S.ringInner}>
                    <ProgressRing percent={course.percent_complete} />
                    <div style={S.ringLabel}>{course.percent_complete}%</div>
                  </div>
                  <div style={S.ringCaption}>Slides</div>
                </div>
                <div style={S.cardStats}>
                  <div style={S.cardStat}>
                    <span style={S.cardStatLabel}>Slides Viewed</span>
                    <span style={S.cardStatVal}>{course.slides_viewed} / {course.total_slides}</span>
                  </div>
                  <div style={S.cardStat}>
                    <span style={S.cardStatLabel}>Time Spent</span>
                    <span style={S.cardStatVal}>{formatTime(course.total_time_seconds)}</span>
                  </div>
                  {course.best_score !== null && (
                    <div style={S.cardStat}>
                      <span style={S.cardStatLabel}>Best Score</span>
                      <span style={{ ...S.cardStatVal, color: course.passed ? '#2e7d32' : '#c62828' }}>{course.best_score}%</span>
                    </div>
                  )}
                  {course.completed_at && (
                    <div style={S.cardStat}>
                      <span style={S.cardStatLabel}>Completed</span>
                      <span style={S.cardStatVal}>{new Date(course.completed_at).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
              <div style={S.cardActions}>
                <button
                  style={{ ...S.btn, background: course.status === 'Complete' ? '#e8f5e9' : '#b71c1c', color: course.status === 'Complete' ? '#2e7d32' : '#fff' }}
                  onClick={() => window.location.href = `/lms/course/${course.id}`}
                >
                  {course.status === 'Complete' ? '✓ Review Course' : course.status === 'In Progress' ? '▶ Resume Course' : '▶ Start Course'}
                </button>
                {course.certificate_id && (
                  <button style={{ ...S.btn, background: '#f5f5f5', color: '#333', marginTop: '8px' }}
                    onClick={() => window.location.href = `/lms/certificate/${course.certificate_id}`}>
                    🎓 View Certificate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={S.footer}><p>SLP Alaska Training Portal • AnthroSafe™</p></div>
    </div>
  )
}

const S = {
  page: { minHeight: '100vh', background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)', fontFamily: 'Arial, Helvetica, sans-serif', padding: '24px' },
  loadingCenter: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' },
  spinner: { width: '48px', height: '48px', border: '4px solid #ddd', borderTop: '4px solid #b71c1c', borderRadius: '50%', animation: 'spin 1s linear infinite' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '16px' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' },
  logo: { height: '56px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' },
  title: { color: '#fff', fontSize: '24px', fontWeight: '700', margin: 0 },
  subtitle: { color: 'rgba(255,255,255,0.8)', fontSize: '14px', margin: 0 },
  adminBtn: { background: '#fbbf24', color: '#1a1a2e', border: 'none', borderRadius: '8px', padding: '9px 16px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', textDecoration: 'none', display: 'inline-block' },
  signOutBtn: { background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer', fontWeight: '600' },
  statsBar: { display: 'flex', gap: '16px', marginBottom: '28px', flexWrap: 'wrap' },
  statCard: { background: 'rgba(255,255,255,0.12)', borderRadius: '12px', padding: '16px 24px', flex: '1', minWidth: '120px', textAlign: 'center' },
  statNumber: { fontSize: '28px', fontWeight: '700', color: '#fbbf24' },
  statLabel: { fontSize: '11px', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' },
  error: { background: '#fff0f0', border: '1px solid #ffcdd2', color: '#c62828', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', fontSize: '14px' },
  empty: { textAlign: 'center', padding: '80px 24px', color: '#fff' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' },
  card: { background: '#fff', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column' },
  cardTop: { padding: '20px 20px 12px', borderBottom: '1px solid #f0f0f0' },
  cardTitleRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '6px' },
  cardTitle: { fontSize: '15px', fontWeight: '700', color: '#1a1a2e', margin: 0, lineHeight: '1.3' },
  regulation: { fontSize: '11px', color: '#999', margin: 0 },
  cardMid: { padding: '16px 20px', display: 'flex', gap: '16px', alignItems: 'center', flex: 1 },
  ringWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' },
  ringInner: { position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
  ringLabel: { position: 'absolute', fontSize: '14px', fontWeight: '700', color: '#1a1a2e' },
  ringCaption: { fontSize: '11px', color: '#999', textTransform: 'uppercase' },
  cardStats: { flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' },
  cardStat: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  cardStatLabel: { fontSize: '12px', color: '#999' },
  cardStatVal: { fontSize: '13px', fontWeight: '700', color: '#333' },
  cardActions: { padding: '16px 20px', borderTop: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column' },
  btn: { border: 'none', borderRadius: '8px', padding: '10px 16px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', textAlign: 'center' },
  footer: { textAlign: 'center', marginTop: '32px', color: 'rgba(255,255,255,0.5)', fontSize: '11px' },
}

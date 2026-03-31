'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

function StatusBadge({ status }) {
  const styles = {
    'Complete':     { background: '#e8f5e9', color: '#2e7d32' },
    'In Progress':  { background: '#e3f2fd', color: '#1565c0' },
    'Not Started':  { background: '#f5f5f5', color: '#999' },
  }
  return (
    <span style={{ ...styles[status], padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap' }}>
      {status}
    </span>
  )
}

export default function CompanyDashboard() {
  const router = useRouter()
  const [token, setToken] = useState(null)
  const [employees, setEmployees] = useState([])
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [assignCourseId, setAssignCourseId] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [assignError, setAssignError] = useState('')
  const [search, setSearch] = useState('')
  const [generatingMatrix, setGeneratingMatrix] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = '/lms/login'; return }
      setToken(session.access_token)
    })
  }, [])

  const load = useCallback(async () => {
    if (!token) return
    const res = await fetch('/api/lms/company-admin/employees', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    setEmployees(data.employees || [])
    setCourses(data.courses || [])
    setLoading(false)
  }, [token])

  useEffect(() => { load() }, [load])

  async function handleAssign(userId) {
    if (!assignCourseId) return
    setAssignError('')
    setAssigning(true)
    const res = await fetch('/api/lms/company-admin/assign', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, course_id: assignCourseId, action: 'assign' }),
    })
    const data = await res.json()
    setAssigning(false)
    if (!res.ok) { setAssignError(data.error); return }
    setAssignCourseId('')
    load()
  }

  async function handleRemove(userId, courseId) {
    if (!confirm('Remove this course assignment?')) return
    await fetch('/api/lms/company-admin/assign', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, course_id: courseId, action: 'remove' }),
    })
    load()
  }

  async function handleDownloadMatrix() {
    setGeneratingMatrix(true)
    const res = await fetch('/api/lms/company-admin/matrix', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const data = await res.json()
    setGeneratingMatrix(false)
    if (!res.ok) { setError(data.error); return }

    // Build CSV
    const { company_name, employees: emps, required_courses, individual_assignments, completions } = data

    // Get unique courses
    const courseMap = {}
    required_courses.forEach(r => {
      if (r.lms_courses) courseMap[r.lms_courses.id] = r.lms_courses.title + ' (Required)'
    })
    individual_assignments.forEach(i => {
      if (i.lms_courses && !courseMap[i.lms_courses.id]) courseMap[i.lms_courses.id] = i.lms_courses.title
    })
    const courseIds = Object.keys(courseMap)
    const courseTitles = courseIds.map(id => courseMap[id])

    const headers = ['Employee', 'Job Title', ...courseTitles]
    const rows = emps.map(emp => {
      const empIndividual = individual_assignments.filter(i => i.user_id === emp.id).map(i => i.course_id)
      const empCourseIds = [...new Set([...required_courses.map(r => r.course_id), ...empIndividual])]

      const cols = courseIds.map(courseId => {
        if (!empCourseIds.includes(courseId)) return 'N/A'
        const completion = completions.find(c => c.user_id === emp.id && c.course_id === courseId)
        if (completion) return `Complete (${new Date(completion.completed_at).toLocaleDateString()})`
        return 'Incomplete'
      })
      return [emp.full_name, emp.job_title || '', ...cols]
    })

    const csv = [
      [`${company_name} Training Matrix — Generated ${new Date().toLocaleDateString()}`],
      [],
      headers,
      ...rows,
    ].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${company_name.replace(/\s+/g, '_')}_Training_Matrix_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const filteredEmployees = employees.filter(e =>
    e.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (e.job_title || '').toLowerCase().includes(search.toLowerCase())
  )

  const totalEmployees = employees.length
  const fullyCompliant = employees.filter(e => e.courses.length > 0 && e.courses.every(c => c.status === 'Complete')).length
  const inProgress = employees.filter(e => e.courses.some(c => c.status === 'In Progress')).length
  const notStarted = employees.filter(e => e.courses.every(c => c.status === 'Not Started')).length

  if (loading) return (
    <div style={S.loadPage}>
      <div style={S.spinner} />
      <p style={{ color: '#fff', marginTop: '16px' }}>Loading company dashboard…</p>
    </div>
  )

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div style={S.headerLeft}>
          <img src="/Logo.png" alt="SLP Alaska" style={S.logo} onError={e => e.target.style.display = 'none'} />
          <div>
            <h1 style={S.title}>Company Training Dashboard</h1>
            <p style={S.subtitle}>Manage your team's training assignments and compliance</p>
          </div>
        </div>
        <div style={S.headerRight}>
          <button style={S.matrixBtn} onClick={handleDownloadMatrix} disabled={generatingMatrix}>
            {generatingMatrix ? 'Generating…' : '📊 Download Training Matrix'}
          </button>
          <button style={S.myTrainingBtn} onClick={() => router.push('/lms/dashboard')}>
            📚 My Training
          </button>
          <button style={S.signOutBtn} onClick={async () => { await supabase.auth.signOut(); window.location.href = '/lms/login' }}>
            Sign Out
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={S.statsBar}>
        <div style={S.statCard}>
          <div style={S.statNum}>{totalEmployees}</div>
          <div style={S.statLabel}>Total Employees</div>
        </div>
        <div style={S.statCard}>
          <div style={{ ...S.statNum, color: '#2e7d32' }}>{fullyCompliant}</div>
          <div style={S.statLabel}>Fully Compliant</div>
        </div>
        <div style={S.statCard}>
          <div style={{ ...S.statNum, color: '#fbbf24' }}>{inProgress}</div>
          <div style={S.statLabel}>In Progress</div>
        </div>
        <div style={S.statCard}>
          <div style={{ ...S.statNum, color: '#ef4444' }}>{notStarted}</div>
          <div style={S.statLabel}>Not Started</div>
        </div>
      </div>

      {error && <div style={S.error}>{error}</div>}

      {/* Search */}
      <input
        style={S.search}
        placeholder="🔍 Search employees by name or job title…"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {/* Employee Cards */}
      {filteredEmployees.length === 0 ? (
        <div style={S.empty}>
          <div style={{ fontSize: '48px' }}>👥</div>
          <p style={{ color: '#fff', fontSize: '18px', marginTop: '16px' }}>No employees found.</p>
        </div>
      ) : (
        <div style={S.grid}>
          {filteredEmployees.map(emp => (
            <div key={emp.id} style={S.card}>
              <div style={S.cardHeader}>
                <div>
                  <div style={S.empName}>{emp.full_name}</div>
                  <div style={S.empTitle}>{emp.job_title || 'No job title'}</div>
                </div>
                <div style={S.empStatus}>
                  {emp.active
                    ? <span style={S.badgeGreen}>{emp.must_change_pw ? 'Pending Login' : 'Active'}</span>
                    : <span style={S.badgeGray}>Inactive</span>
                  }
                </div>
              </div>

              {/* Course Status */}
              <div style={S.courseList}>
                {emp.courses.length === 0 ? (
                  <p style={S.noCourses}>No courses assigned yet.</p>
                ) : (
                  emp.courses.map(course => (
                    <div key={course.course_id} style={S.courseRow}>
                      <div style={S.courseInfo}>
                        <span style={S.courseTitle}>{course.title}</span>
                        {course.is_required && <span style={S.requiredTag}>Required</span>}
                      </div>
                      <div style={S.courseActions}>
                        <StatusBadge status={course.status} />
                        {!course.is_required && (
                          <button style={S.removeBtn} onClick={() => handleRemove(emp.id, course.course_id)}>✕</button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Assign Course */}
              <div style={S.assignRow}>
                <select
                  style={S.assignSelect}
                  value={selectedEmployee?.id === emp.id ? assignCourseId : ''}
                  onChange={e => { setSelectedEmployee(emp); setAssignCourseId(e.target.value); setAssignError('') }}
                >
                  <option value="">+ Assign a course…</option>
                  {courses
                    .filter(c => !emp.courses.find(ec => ec.course_id === c.id))
                    .map(c => <option key={c.id} value={c.id}>{c.title}</option>)
                  }
                </select>
                {selectedEmployee?.id === emp.id && assignCourseId && (
                  <button style={S.assignBtn} onClick={() => handleAssign(emp.id)} disabled={assigning}>
                    {assigning ? '…' : 'Assign'}
                  </button>
                )}
              </div>
              {selectedEmployee?.id === emp.id && assignError && (
                <div style={S.assignError}>{assignError}</div>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={S.footer}>SLP Alaska Training Portal • AnthroSafe™</div>
    </div>
  )
}

const S = {
  page: { minHeight: '100vh', background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)', fontFamily: 'Arial, Helvetica, sans-serif', padding: '24px' },
  loadPage: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)' },
  spinner: { width: '48px', height: '48px', border: '4px solid rgba(255,255,255,0.2)', borderTop: '4px solid #fff', borderRadius: '50%', animation: 'spin 1s linear infinite' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '16px' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' },
  logo: { height: '56px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' },
  title: { color: '#fff', fontSize: '22px', fontWeight: '700', margin: 0 },
  subtitle: { color: 'rgba(255,255,255,0.7)', fontSize: '13px', margin: 0 },
  matrixBtn: { background: '#fbbf24', color: '#1a1a2e', border: 'none', borderRadius: '8px', padding: '9px 16px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' },
  myTrainingBtn: { background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '8px', padding: '9px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  signOutBtn: { background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', padding: '9px 16px', fontSize: '13px', cursor: 'pointer' },
  statsBar: { display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' },
  statCard: { background: 'rgba(255,255,255,0.12)', borderRadius: '12px', padding: '16px 24px', flex: '1', minWidth: '120px', textAlign: 'center' },
  statNum: { fontSize: '28px', fontWeight: '700', color: '#fbbf24' },
  statLabel: { fontSize: '11px', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' },
  error: { background: '#fff0f0', border: '1px solid #ffcdd2', color: '#c62828', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', fontSize: '14px' },
  search: { width: '100%', padding: '12px 20px', borderRadius: '25px', border: 'none', fontSize: '14px', marginBottom: '20px', boxSizing: 'border-box', outline: 'none' },
  empty: { textAlign: 'center', padding: '60px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' },
  card: { background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '16px 16px 12px', borderBottom: '1px solid #f0f0f0', background: '#f9f9fb' },
  empName: { fontSize: '15px', fontWeight: '700', color: '#1a1a2e' },
  empTitle: { fontSize: '12px', color: '#999', marginTop: '2px' },
  empStatus: { flexShrink: 0 },
  badgeGreen: { background: '#e8f5e9', color: '#2e7d32', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' },
  badgeGray: { background: '#f5f5f5', color: '#999', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' },
  courseList: { padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '60px' },
  noCourses: { color: '#bbb', fontSize: '13px', margin: 0, textAlign: 'center', padding: '8px 0' },
  courseRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' },
  courseInfo: { display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 },
  courseTitle: { fontSize: '13px', color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  requiredTag: { background: '#fff3e0', color: '#e65100', padding: '1px 6px', borderRadius: '10px', fontSize: '10px', fontWeight: '700', flexShrink: 0 },
  courseActions: { display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 },
  removeBtn: { background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: '14px', padding: '0 2px', lineHeight: 1 },
  assignRow: { display: 'flex', gap: '8px', padding: '10px 16px', borderTop: '1px solid #f0f0f0', background: '#f9f9fb' },
  assignSelect: { flex: 1, padding: '7px 10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px', outline: 'none' },
  assignBtn: { background: '#b71c1c', color: '#fff', border: 'none', borderRadius: '6px', padding: '7px 14px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' },
  assignError: { padding: '0 16px 10px', fontSize: '12px', color: '#c62828' },
  footer: { textAlign: 'center', marginTop: '32px', color: 'rgba(255,255,255,0.4)', fontSize: '11px' },
}

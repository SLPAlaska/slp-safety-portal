'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const TABS = ['Employees', 'Assign Courses', 'Training Matrix', 'Reports']

function Modal({ title, onClose, children }) {
  return (
    <div style={S.overlay}>
      <div style={S.modal}>
        <div style={S.modalHeader}>
          <h2 style={S.modalTitle}>{title}</h2>
          <button onClick={onClose} style={S.closeBtn}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={S.field}>
      <label style={S.label}>{label}</label>
      {children}
    </div>
  )
}

// ─── EMPLOYEES TAB ──────────────────────────────────────────
function EmployeesTab({ token, companyId }) {
  const [users, setUsers] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(null)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ full_name: '', email: '', username: '', job_title: '', password: '', work_location: '', department: '', employee_id: '', hire_date: '' })

  const load = useCallback(async () => {
    const res = await fetch('/api/lms/company-admin/users', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const data = await res.json()
    setUsers(data.users || [])
  }, [token])

  useEffect(() => { if (token) load() }, [token, load])

  async function handleCreate() {
    setError(''); setSaving(true)
    const res = await fetch('/api/lms/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, company_id: companyId, role: 'learner' })
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error); return }
    setShowModal(false)
    setForm({ full_name: '', email: '', username: '', job_title: '', password: '', work_location: '', department: '', employee_id: '', hire_date: '' })
    load()
  }

  async function handleDeactivate(user) {
    if (!confirm(`Deactivate ${user.full_name}? They will lose access immediately.`)) return
    await fetch('/api/lms/delete-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, auth_user_id: user.auth_user_id })
    })
    load()
  }

  async function handleReactivate(user) {
    await fetch('/api/lms/reactivate-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, auth_user_id: user.auth_user_id })
    })
    load()
  }

  async function handleResetPassword(user) {
    const newPw = prompt(`Set new temporary password for ${user.full_name} (min 8 characters):`)
    if (!newPw || newPw.length < 8) { alert('Password must be at least 8 characters.'); return }
    setResetting(user.id)
    const res = await fetch('/api/lms/company-admin/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ user_id: user.id, password: newPw })
    })
    setResetting(null)
    if (res.ok) { alert(`Password reset for ${user.full_name}.`) } else { alert('Reset failed.') }
  }

  const filtered = users.filter(u =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.job_title?.toLowerCase().includes(search.toLowerCase())
  )

  const active = users.filter(u => u.active).length
  const pending = users.filter(u => u.active && u.must_change_pw).length

  return (
    <div>
      <div style={S.tabHeader}>
        <h2 style={S.tabTitle}>Employees</h2>
        <button style={S.btnPrimary} onClick={() => setShowModal(true)}>+ Add Employee</button>
      </div>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={S.statBox}><div style={S.statNum}>{users.length}</div><div style={S.statLbl}>Total</div></div>
        <div style={S.statBox}><div style={{ ...S.statNum, color: '#2e7d32' }}>{active}</div><div style={S.statLbl}>Active</div></div>
        <div style={S.statBox}><div style={{ ...S.statNum, color: '#f57c00' }}>{pending}</div><div style={S.statLbl}>Pending Login</div></div>
        <div style={S.statBox}><div style={{ ...S.statNum, color: '#b71c1c' }}>{users.length - active}</div><div style={S.statLbl}>Inactive</div></div>
      </div>
      <input
        style={{ ...S.input, maxWidth: '320px', marginBottom: '16px' }}
        placeholder="Search employees..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      <table style={S.table}>
        <thead><tr>{['Name', 'Email', 'Job Title', 'Location', 'Status', 'Actions'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
        <tbody>
          {filtered.map(u => (
            <tr key={u.id} style={S.tr}>
              <td style={S.td}>{u.full_name}</td>
              <td style={S.td}>{u.email}</td>
              <td style={S.td}>{u.job_title || '—'}</td>
              <td style={S.td}>{u.work_location || '—'}</td>
              <td style={S.td}>
                <span style={!u.active ? S.badgeGray : u.must_change_pw ? S.badgeOrange : S.badgeGreen}>
                  {!u.active ? 'Inactive' : u.must_change_pw ? 'Pending Login' : 'Active'}
                </span>
              </td>
              <td style={{ ...S.td }}>
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                  <button style={S.btnSmall} onClick={() => handleResetPassword(u)} disabled={resetting === u.id}>
                    {resetting === u.id ? '...' : 'Reset PW'}
                  </button>
                  {u.active
                    ? <button style={S.btnSmallRed} onClick={() => handleDeactivate(u)}>Deactivate</button>
                    : <button style={S.btnSmall} onClick={() => handleReactivate(u)}>Reactivate</button>
                  }
                </div>
              </td>
            </tr>
          ))}
          {filtered.length === 0 && <tr><td colSpan={6} style={S.empty}>No employees found.</td></tr>}
        </tbody>
      </table>

      {showModal && (
        <Modal title="Add Employee" onClose={() => { setShowModal(false); setError('') }}>
          <Field label="Full Name *"><input style={S.input} value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} /></Field>
          <Field label="Email *"><input style={S.input} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></Field>
          <Field label="Username *"><input style={S.input} value={form.username} placeholder="Unique login name" onChange={e => setForm(f => ({ ...f, username: e.target.value }))} /></Field>
          <Field label="Job Title"><input style={S.input} value={form.job_title} onChange={e => setForm(f => ({ ...f, job_title: e.target.value }))} /></Field>
          <Field label="Work Location"><input style={S.input} value={form.work_location} onChange={e => setForm(f => ({ ...f, work_location: e.target.value }))} /></Field>
          <Field label="Department"><input style={S.input} value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} /></Field>
          <Field label="Employee ID"><input style={S.input} value={form.employee_id} onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))} /></Field>
          <Field label="Hire Date"><input style={S.input} type="date" value={form.hire_date} onChange={e => setForm(f => ({ ...f, hire_date: e.target.value }))} /></Field>
          <Field label="Temporary Password *"><input style={S.input} type="password" value={form.password} placeholder="Min 8 characters" onChange={e => setForm(f => ({ ...f, password: e.target.value }))} /></Field>
          {error && <div style={S.error}>{error}</div>}
          <button style={S.btnPrimary} onClick={handleCreate} disabled={saving || !form.full_name || !form.email || !form.username || !form.password}>
            {saving ? 'Creating…' : 'Create Account'}
          </button>
        </Modal>
      )}
    </div>
  )
}

// ─── ASSIGN COURSES TAB ─────────────────────────────────────
function AssignCoursesTab({ token, companyId }) {
  const [users, setUsers] = useState([])
  const [courses, setCourses] = useState([])
  const [assignments, setAssignments] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ user_id: '', course_ids: [], due_date: '' })

  const load = useCallback(async () => {
    const [ur, cr, ar] = await Promise.all([
      fetch('/api/lms/company-admin/users', { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch('/api/lms/courses'),
      fetch('/api/lms/individual-assignments'),
    ])
    const [ud, cd, ad] = await Promise.all([ur.json(), cr.json(), ar.json()])
    setUsers((ud.users || []).filter(u => u.active))
    setCourses((cd.courses || []).filter(c => c.active))
    setAssignments(ad.assignments || [])
  }, [token])

  useEffect(() => { if (token) load() }, [token, load])

  async function handleAssign() {
    setError(''); setSaving(true)
    let anyError = null
    for (const course_id of form.course_ids) {
      const res = await fetch('/api/lms/individual-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: form.user_id, course_id, due_date: form.due_date || null })
      })
      const data = await res.json()
      if (!res.ok) anyError = data.error
    }
    setSaving(false)
    if (anyError) { setError(anyError); return }
    setShowModal(false)
    setForm({ user_id: '', course_ids: [], due_date: '' })
    load()
  }

  async function handleRemove(a) {
    if (!confirm(`Remove "${a.lms_courses?.title}" from ${a.lms_users?.full_name}?`)) return
    await fetch('/api/lms/individual-assignments', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: a.id })
    })
    load()
  }

  function toggleCourse(courseId) {
    setForm(f => {
      const ids = f.course_ids.includes(courseId)
        ? f.course_ids.filter(id => id !== courseId)
        : [...f.course_ids, courseId]
      return { ...f, course_ids: ids }
    })
  }

  const selectedUser = users.find(u => u.id === form.user_id)
  const alreadyAssigned = new Set(
    assignments.filter(a => a.user_id === form.user_id).map(a => a.course_id)
  )

  const companyAssignments = assignments.filter(a =>
    users.some(u => u.id === a.user_id)
  )

  return (
    <div>
      <div style={S.tabHeader}>
        <h2 style={S.tabTitle}>Individual Assignments</h2>
        <button style={S.btnPrimary} onClick={() => setShowModal(true)}>+ Assign Courses</button>
      </div>
      <div style={S.infoBox}>Individual assignments are in addition to company-wide required courses. Use these for role-specific or remedial training.</div>
      <br />
      <table style={S.table}>
        <thead><tr>{['Employee', 'Course', 'Due Date', 'Assigned', 'Actions'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
        <tbody>
          {companyAssignments.map(a => (
            <tr key={a.id} style={S.tr}>
              <td style={S.td}>{a.lms_users?.full_name}</td>
              <td style={S.td}>{a.lms_courses?.title}</td>
              <td style={S.td}>{a.due_date ? new Date(a.due_date).toLocaleDateString() : '—'}</td>
              <td style={S.td}>{new Date(a.assigned_at).toLocaleDateString()}</td>
              <td style={S.td}><button style={S.btnSmallRed} onClick={() => handleRemove(a)}>Remove</button></td>
            </tr>
          ))}
          {companyAssignments.length === 0 && <tr><td colSpan={5} style={S.empty}>No individual assignments yet.</td></tr>}
        </tbody>
      </table>

      {showModal && (
        <Modal title="Assign Courses" onClose={() => { setShowModal(false); setForm({ user_id: '', course_ids: [], due_date: '' }); setError('') }}>
          <Field label="Employee *">
            <select style={S.input} value={form.user_id} onChange={e => setForm(f => ({ ...f, user_id: e.target.value, course_ids: [] }))}>
              <option value="">— Select Employee —</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.full_name} {u.job_title ? `(${u.job_title})` : ''}</option>)}
            </select>
          </Field>
          {form.user_id && (
            <Field label="Courses * (select one or more)">
              <div style={{ border: '1px solid #ddd', borderRadius: '8px', maxHeight: '260px', overflowY: 'auto' }}>
                {courses.map(c => {
                  const assigned = alreadyAssigned.has(c.id)
                  const selected = form.course_ids.includes(c.id)
                  return (
                    <div
                      key={c.id}
                      onClick={() => !assigned && toggleCourse(c.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderBottom: '1px solid #f0f0f0', cursor: assigned ? 'default' : 'pointer', background: selected ? '#e3f2fd' : assigned ? '#f9f9f9' : '#fff', opacity: assigned ? 0.5 : 1 }}
                    >
                      <div style={{ width: '16px', height: '16px', borderRadius: '4px', border: selected ? 'none' : '1.5px solid #ccc', background: selected ? '#1565c0' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {selected && <span style={{ color: '#fff', fontSize: '11px', fontWeight: '700' }}>✓</span>}
                      </div>
                      <span style={{ fontSize: '13px', color: assigned ? '#999' : '#1a1a2e' }}>{c.title}</span>
                      {assigned && <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#999' }}>already assigned</span>}
                    </div>
                  )
                })}
              </div>
              {form.course_ids.length > 0 && <div style={{ fontSize: '12px', color: '#1565c0', marginTop: '6px', fontWeight: '600' }}>{form.course_ids.length} course{form.course_ids.length !== 1 ? 's' : ''} selected</div>}
            </Field>
          )}
          <Field label="Due Date (optional)">
            <input style={S.input} type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
          </Field>
          {error && <div style={S.error}>{error}</div>}
          <button style={S.btnPrimary} onClick={handleAssign} disabled={saving || !form.user_id || form.course_ids.length === 0}>
            {saving ? 'Assigning…' : `Assign ${form.course_ids.length || ''} Course${form.course_ids.length !== 1 ? 's' : ''}`}
          </button>
        </Modal>
      )}
    </div>
  )
}

// ─── TRAINING MATRIX TAB ────────────────────────────────────
function TrainingMatrixTab({ token }) {
  const [matrix, setMatrix] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/lms/company-admin/dashboard', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      setMatrix(data)
      setLoading(false)
    }
    if (token) load()
  }, [token])

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>Loading matrix...</div>
  if (!matrix) return <div style={S.empty}>Could not load matrix data.</div>

  const { employees = [], courses = [] } = matrix

  return (
    <div>
      <div style={S.tabHeader}>
        <h2 style={S.tabTitle}>Training Matrix</h2>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ ...S.table, fontSize: '12px', minWidth: '600px' }}>
          <thead>
            <tr>
              <th style={{ ...S.th, minWidth: '160px' }}>Employee</th>
              <th style={{ ...S.th, minWidth: '120px' }}>Job Title</th>
              {courses.map(c => (
                <th key={c.id} style={{ ...S.th, maxWidth: '100px', whiteSpace: 'normal', lineHeight: '1.3' }}>
                  {c.title}{c.is_required ? ' *' : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.map(emp => (
              <tr key={emp.id} style={S.tr}>
                <td style={{ ...S.td, fontWeight: '600' }}>{emp.full_name}</td>
                <td style={{ ...S.td, color: '#666' }}>{emp.job_title || '—'}</td>
                {courses.map(c => {
                  const cell = emp.courseData?.find(d => d.course_id === c.id)
                  const status = cell?.status || 'N/A'
                  const bg = status === 'Complete' ? '#e8f5e9' : status === 'In Progress' ? '#fff8e1' : status === 'Not Started' ? '#fff0f0' : '#f5f5f5'
                  const color = status === 'Complete' ? '#2e7d32' : status === 'In Progress' ? '#f57c00' : status === 'Not Started' ? '#c62828' : '#999'
                  return (
                    <td key={c.id} style={{ ...S.td, background: bg, textAlign: 'center' }}>
                      <span style={{ color, fontWeight: '600', fontSize: '11px' }}>
                        {status === 'Complete' && cell?.date ? new Date(cell.date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' }) : status === 'In Progress' ? `${cell?.pct || 0}%` : status === 'N/A' ? '—' : status}
                      </span>
                    </td>
                  )
                })}
              </tr>
            ))}
            {employees.length === 0 && <tr><td colSpan={courses.length + 2} style={S.empty}>No employee data.</td></tr>}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: '12px', fontSize: '12px', color: '#666' }}>* Required course</div>
    </div>
  )
}

// ─── REPORTS TAB ────────────────────────────────────────────
function ReportsTab({ token }) {
  const [downloading, setDownloading] = useState(false)

  async function downloadMatrix() {
    setDownloading(true)
    const res = await fetch('/api/lms/company-admin/matrix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({})
    })
    if (res.ok) {
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Training_Matrix_${new Date().toISOString().split('T')[0]}.pdf`
      a.click()
    } else {
      alert('PDF generation failed.')
    }
    setDownloading(false)
  }

  return (
    <div>
      <div style={S.tabHeader}>
        <h2 style={S.tabTitle}>Reports</h2>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '480px' }}>
        <div style={{ border: '1px solid #e5e5e5', borderRadius: '10px', padding: '20px' }}>
          <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '6px' }}>Training Compliance Matrix</div>
          <div style={{ fontSize: '13px', color: '#666', marginBottom: '16px' }}>Full compliance report showing all employees and their training status across all required and assigned courses.</div>
          <button style={S.btnPrimary} onClick={downloadMatrix} disabled={downloading}>
            {downloading ? 'Generating PDF…' : 'Download PDF Report'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── MAIN PAGE ───────────────────────────────────────────────
export default function CompanyAdminDashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('Employees')
  const [token, setToken] = useState(null)
  const [companyId, setCompanyId] = useState(null)
  const [companyName, setCompanyName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/lms/login'); return }
      const tok = session.access_token
      setToken(tok)
      const res = await fetch('/api/lms/company-admin/me', {
        headers: { 'Authorization': `Bearer ${tok}` }
      })
      if (!res.ok) { router.push('/lms/dashboard'); return }
      const data = await res.json()
      setCompanyId(data.company_id)
      setCompanyName(data.company_name)
      setLoading(false)
    })
  }, [router])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f0f2f5' }}>
      <div style={{ color: '#999' }}>Loading...</div>
    </div>
  )

  return (
    <div style={S.page}>
      <div style={S.pageHeader}>
        <div>
          <h1 style={S.pageTitle}>{companyName}</h1>
          <p style={S.pageSubtitle}>Training Administration Dashboard</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <a href="/lms/dashboard" style={S.backLink}>← Learner Dashboard</a>
          <button style={{ ...S.backLink, background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => { supabase.auth.signOut(); router.push('/lms/login') }}>Sign Out</button>
        </div>
      </div>
      <div style={S.tabBar}>
        {TABS.map(tab => (
          <button key={tab} style={{ ...S.tabBtn, ...(activeTab === tab ? S.tabBtnActive : {}) }} onClick={() => setActiveTab(tab)}>{tab}</button>
        ))}
      </div>
      <div style={S.tabContent}>
        {activeTab === 'Employees' && <EmployeesTab token={token} companyId={companyId} />}
        {activeTab === 'Assign Courses' && <AssignCoursesTab token={token} companyId={companyId} />}
        {activeTab === 'Training Matrix' && <TrainingMatrixTab token={token} />}
        {activeTab === 'Reports' && <ReportsTab token={token} />}
      </div>
    </div>
  )
}

const S = {
  page: { minHeight: '100vh', backgroundColor: '#f0f2f5', fontFamily: 'Arial, Helvetica, sans-serif', padding: '24px' },
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' },
  pageTitle: { fontSize: '26px', fontWeight: '700', color: '#1a1a2e', margin: '0 0 4px' },
  pageSubtitle: { fontSize: '14px', color: '#666', margin: 0 },
  backLink: { fontSize: '13px', color: '#b71c1c', textDecoration: 'none', fontWeight: '600' },
  tabBar: { display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '2px solid #ddd', flexWrap: 'wrap' },
  tabBtn: { padding: '10px 16px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#666', borderBottom: '2px solid transparent', marginBottom: '-2px' },
  tabBtnActive: { color: '#b71c1c', borderBottom: '2px solid #b71c1c' },
  tabContent: { background: '#fff', borderRadius: '10px', padding: '28px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' },
  tabHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  tabTitle: { fontSize: '18px', fontWeight: '700', color: '#1a1a2e', margin: 0 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  th: { textAlign: 'left', padding: '10px 12px', background: '#f7f7f9', color: '#555', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e5e5e5' },
  tr: { borderBottom: '1px solid #f0f0f0' },
  td: { padding: '10px 12px', color: '#333', verticalAlign: 'middle' },
  empty: { padding: '24px', textAlign: 'center', color: '#aaa', fontSize: '14px' },
  badgeGreen: { background: '#e8f5e9', color: '#2e7d32', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' },
  badgeGray: { background: '#f5f5f5', color: '#999', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' },
  badgeOrange: { background: '#fff8e1', color: '#f57c00', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' },
  badgeBlue: { background: '#e3f2fd', color: '#1565c0', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' },
  btnPrimary: { background: '#b71c1c', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 18px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' },
  btnSmall: { background: '#e3f2fd', color: '#1565c0', border: 'none', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
  btnSmallRed: { background: '#ffebee', color: '#b71c1c', border: 'none', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' },
  modal: { background: '#fff', borderRadius: '12px', padding: '32px', width: '100%', maxWidth: '520px', maxHeight: '85vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: '18px', fontWeight: '700', color: '#1a1a2e', margin: 0 },
  closeBtn: { background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#666' },
  field: { display: 'flex', flexDirection: 'column', gap: '5px' },
  label: { fontSize: '13px', fontWeight: '600', color: '#444' },
  input: { padding: '9px 12px', borderRadius: '7px', border: '1px solid #ddd', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box' },
  textarea: { padding: '9px 12px', borderRadius: '7px', border: '1px solid #ddd', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box', minHeight: '80px', resize: 'vertical' },
  error: { background: '#fff0f0', border: '1px solid #ffcdd2', color: '#c62828', borderRadius: '8px', padding: '10px 14px', fontSize: '13px' },
  infoBox: { background: '#e3f2fd', border: '1px solid #bbdefb', color: '#1565c0', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', lineHeight: '1.6' },
  statBox: { background: '#f7f7f9', borderRadius: '8px', padding: '12px 20px', textAlign: 'center', minWidth: '90px' },
  statNum: { fontSize: '24px', fontWeight: '700', color: '#1565c0' },
  statLbl: { fontSize: '11px', color: '#666', textTransform: 'uppercase', marginTop: '2px' },
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

function StatusBadge({ status }) {
  const map = {
    'Complete':    { bg: '#e8f5e9', color: '#2e7d32' },
    'In Progress': { bg: '#e3f2fd', color: '#1565c0' },
    'Not Started': { bg: '#ffebee', color: '#b71c1c' },
  }
  const s = map[status] || { bg: '#f5f5f5', color: '#999' }
  return <span style={{ background: s.bg, color: s.color, padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap' }}>{status}</span>
}

function TopNav({ onSignOut }) {
  return (
    <div style={S.topNav}>
      <div style={S.topNavLeft}>
        <img src="/Logo.png" alt="SLP Alaska" style={S.navLogo} onError={e => e.target.style.display='none'} />
        <span style={S.navTitle}>Company Training Dashboard</span>
      </div>
      <div style={S.topNavRight}>
        <a href="/lms/company-dashboard" style={S.navBtn}>🏢 Company Dashboard</a>
        <a href="/lms/dashboard" style={S.navBtn}>📚 My Training</a>
        <button style={{ ...S.navBtn, background: '#b71c1c', border: 'none', cursor: 'pointer' }} onClick={onSignOut}>Sign Out</button>
      </div>
    </div>
  )
}

function EditModal({ employee, onSave, onClose }) {
  const [form, setForm] = useState({
    job_title: employee.job_title || '',
    work_location: employee.work_location || '',
    client_project: employee.client_project || '',
    department: employee.department || '',
    employee_id: employee.employee_id || '',
    supervisor: employee.supervisor || '',
    hire_date: employee.hire_date || '',
  })
  return (
    <div style={S.overlay}>
      <div style={S.modal}>
        <div style={S.modalHeader}>
          <h3 style={{ margin: 0, color: '#1a1a2e' }}>Edit Employee — {employee.full_name}</h3>
          <button onClick={onClose} style={S.closeBtn}>✕</button>
        </div>
        {[
          ['Job Title', 'job_title'], ['Work Location', 'work_location'],
          ['Client / Project', 'client_project'], ['Department', 'department'],
          ['Employee ID', 'employee_id'], ['Supervisor', 'supervisor'],
        ].map(([label, key]) => (
          <div key={key} style={S.field}>
            <label style={S.label}>{label}</label>
            <input style={S.input} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
          </div>
        ))}
        <div style={S.field}>
          <label style={S.label}>Hire Date</label>
          <input type="date" style={S.input} value={form.hire_date} onChange={e => setForm(f => ({ ...f, hire_date: e.target.value }))} />
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button style={S.btnPrimary} onClick={() => onSave(form)}>Save Changes</button>
          <button style={S.btnSecondary} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

function FilterPanel({ employees, filters, setFilters, onDownload, generating }) {
  const locations = [...new Set(employees.map(e => e.work_location).filter(Boolean))].sort()
  const clients = [...new Set(employees.map(e => e.client_project).filter(Boolean))].sort()
  const departments = [...new Set(employees.map(e => e.department).filter(Boolean))].sort()

  return (
    <div style={S.filterPanel}>
      <div style={S.filterTitle}>📊 Filter & Export</div>
      <div style={S.filterRow}>
        <div style={S.filterField}>
          <label style={S.filterLabel}>Work Location</label>
          <select style={S.filterSelect} value={filters.work_location || ''} onChange={e => setFilters(f => ({ ...f, work_location: e.target.value || null }))}>
            <option value="">All Locations</option>
            {locations.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div style={S.filterField}>
          <label style={S.filterLabel}>Client / Project</label>
          <select style={S.filterSelect} value={filters.client_project || ''} onChange={e => setFilters(f => ({ ...f, client_project: e.target.value || null }))}>
            <option value="">All Clients</option>
            {clients.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={S.filterField}>
          <label style={S.filterLabel}>Department</label>
          <select style={S.filterSelect} value={filters.department || ''} onChange={e => setFilters(f => ({ ...f, department: e.target.value || null }))}>
            <option value="">All Departments</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div style={S.filterField}>
          <label style={S.filterLabel}>From Date</label>
          <input type="date" style={S.filterSelect} value={filters.date_from || ''} onChange={e => setFilters(f => ({ ...f, date_from: e.target.value || null }))} />
        </div>
        <div style={S.filterField}>
          <label style={S.filterLabel}>To Date</label>
          <input type="date" style={S.filterSelect} value={filters.date_to || ''} onChange={e => setFilters(f => ({ ...f, date_to: e.target.value || null }))} />
        </div>
        <button style={S.clearBtn} onClick={() => setFilters({})}>Clear</button>
        <button style={S.matrixBtn} onClick={onDownload} disabled={generating}>
          {generating ? '⏳ Generating PDF…' : '📄 Download Matrix PDF'}
        </button>
      </div>
    </div>
  )
}

export default function CompanyDashboard() {
  const [token, setToken] = useState(null)
  const [employees, setEmployees] = useState([])
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({})
  const [editingEmployee, setEditingEmployee] = useState(null)
  const [selectedEmployees, setSelectedEmployees] = useState([])
  const [generating, setGenerating] = useState(false)
  const [assigning, setAssigning] = useState({})
  const [assignSelects, setAssignSelects] = useState({})

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

  async function handleSaveEdit(form) {
    const res = await fetch('/api/lms/company-admin/employees', {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: editingEmployee.id, ...form }),
    })
    if (res.ok) { setEditingEmployee(null); load() }
  }

  async function handleAssign(userId, courseId) {
    if (!courseId) return
    setAssigning(a => ({ ...a, [userId]: true }))
    const res = await fetch('/api/lms/company-admin/assign', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, course_id: courseId, action: 'assign' }),
    })
    setAssigning(a => ({ ...a, [userId]: false }))
    setAssignSelects(s => ({ ...s, [userId]: '' }))
    if (res.ok) load()
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
    setGenerating(true)
    const filterPayload = {
      ...filters,
      employee_ids: selectedEmployees.length > 0 ? selectedEmployees : undefined,
    }
    const res = await fetch('/api/lms/company-admin/matrix', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ filters: filterPayload }),
    })
    setGenerating(false)
    if (!res.ok) { setError('Failed to generate matrix.'); return }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const cd = res.headers.get('content-disposition')
    const filename = cd?.match(/filename="(.+)"/)?.[1] || 'training_matrix.pdf'
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  function toggleSelectEmployee(id) {
    setSelectedEmployees(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id])
  }

  // Apply filters to displayed employees
  let filtered = employees.filter(emp => {
    if (search && !emp.full_name.toLowerCase().includes(search.toLowerCase()) &&
        !(emp.job_title || '').toLowerCase().includes(search.toLowerCase())) return false
    if (filters.work_location && emp.work_location !== filters.work_location) return false
    if (filters.client_project && emp.client_project !== filters.client_project) return false
    if (filters.department && emp.department !== filters.department) return false
    return true
  })

  const totalEmployees = employees.length
  const fullyCompliant = employees.filter(e => e.courses.length > 0 && e.courses.every(c => c.status === 'Complete')).length
  const atRisk = employees.filter(e => e.courses.some(c => c.status === 'Not Started' && c.is_required)).length
  const overallRate = (() => {
    const total = employees.reduce((s, e) => s + e.courses.filter(c => c.status !== 'N/A').length, 0)
    const complete = employees.reduce((s, e) => s + e.courses.filter(c => c.status === 'Complete').length, 0)
    return total > 0 ? Math.round((complete/total)*100) : 0
  })()
  const rateColor = overallRate >= 80 ? '#2e7d32' : overallRate >= 50 ? '#e65100' : '#b71c1c'

  if (loading) return (
    <div style={S.loadPage}>
      <div style={S.spinner} />
      <p style={{ color: '#fff', marginTop: '16px' }}>Loading company dashboard…</p>
    </div>
  )

  return (
    <div style={S.page}>
      <TopNav onSignOut={async () => { await supabase.auth.signOut(); window.location.href = '/lms/login' }} />

      <div style={S.body}>
        {/* Stats */}
        <div style={S.statsBar}>
          <div style={S.statCard}>
            <div style={{ ...S.statNum, color: rateColor }}>{overallRate}%</div>
            <div style={S.statLabel}>Overall Compliance</div>
          </div>
          <div style={S.statCard}>
            <div style={S.statNum}>{totalEmployees}</div>
            <div style={S.statLabel}>Total Employees</div>
          </div>
          <div style={S.statCard}>
            <div style={{ ...S.statNum, color: '#2e7d32' }}>{fullyCompliant}</div>
            <div style={S.statLabel}>Fully Compliant</div>
          </div>
          <div style={S.statCard}>
            <div style={{ ...S.statNum, color: '#b71c1c' }}>{atRisk}</div>
            <div style={S.statLabel}>At Risk</div>
          </div>
          <div style={S.statCard}>
            <div style={S.statNum}>{selectedEmployees.length > 0 ? selectedEmployees.length : 'All'}</div>
            <div style={S.statLabel}>Selected for Matrix</div>
          </div>
        </div>

        {error && <div style={S.error}>{error}</div>}

        {/* Filter Panel */}
        <FilterPanel
          employees={employees}
          filters={filters}
          setFilters={setFilters}
          onDownload={handleDownloadMatrix}
          generating={generating}
        />

        {/* Search + select all */}
        <div style={S.searchRow}>
          <input style={S.search} placeholder="🔍 Search by name or job title…" value={search} onChange={e => setSearch(e.target.value)} />
          <button style={S.btnSecondary} onClick={() => setSelectedEmployees(filtered.map(e => e.id))}>Select All Visible</button>
          <button style={S.btnSecondary} onClick={() => setSelectedEmployees([])}>Clear Selection</button>
          {selectedEmployees.length > 0 && (
            <span style={{ fontSize: '13px', color: '#1565c0', fontWeight: '600' }}>
              {selectedEmployees.length} selected for matrix
            </span>
          )}
        </div>

        {/* Employee Cards */}
        {filtered.length === 0 ? (
          <div style={S.empty}>
            <div style={{ fontSize: '48px' }}>👥</div>
            <p style={{ color: '#fff', fontSize: '18px', marginTop: '16px' }}>No employees found.</p>
          </div>
        ) : (
          <div style={S.grid}>
            {filtered.map(emp => {
              const isSelected = selectedEmployees.includes(emp.id)
              const allComplete = emp.courses.length > 0 && emp.courses.every(c => c.status === 'Complete')
              const hasAtRisk = emp.courses.some(c => c.status === 'Not Started' && c.is_required)
              const cardBorder = hasAtRisk ? '#b71c1c' : allComplete ? '#2e7d32' : '#e0e0e0'

              return (
                <div key={emp.id} style={{ ...S.card, borderTop: `3px solid ${cardBorder}`, outline: isSelected ? '2px solid #1565c0' : 'none' }}>
                  <div style={S.cardHeader}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <input type="checkbox" checked={isSelected} onChange={() => toggleSelectEmployee(emp.id)} style={{ marginTop: '3px' }} />
                      <div>
                        <div style={S.empName}>{emp.full_name}</div>
                        <div style={S.empMeta}>
                          {emp.job_title && <span>{emp.job_title}</span>}
                          {emp.work_location && <span> · 📍 {emp.work_location}</span>}
                          {emp.client_project && <span> · 🏗 {emp.client_project}</span>}
                          {emp.department && <span> · 🏷 {emp.department}</span>}
                        </div>
                        {(emp.employee_id || emp.supervisor || emp.hire_date) && (
                          <div style={S.empMeta2}>
                            {emp.employee_id && <span>ID: {emp.employee_id}</span>}
                            {emp.supervisor && <span> · Supervisor: {emp.supervisor}</span>}
                            {emp.hire_date && <span> · Hired: {new Date(emp.hire_date).toLocaleDateString()}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                      <span style={emp.active ? S.badgeGreen : S.badgeGray}>
                        {!emp.active ? 'Inactive' : emp.must_change_pw ? 'Pending Login' : 'Active'}
                      </span>
                      <button style={S.editBtn} onClick={() => setEditingEmployee(emp)}>✏ Edit</button>
                    </div>
                  </div>

                  {/* Courses */}
                  <div style={S.courseList}>
                    {emp.courses.length === 0 ? (
                      <p style={S.noCourses}>No courses assigned.</p>
                    ) : (
                      emp.courses.map(course => (
                        <div key={course.course_id} style={S.courseRow}>
                          <div style={S.courseInfo}>
                            <span style={S.courseTitle}>{course.title}</span>
                            {course.is_required && <span style={S.reqTag}>Required</span>}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <StatusBadge status={course.status} />
                            {course.status === 'Complete' && course.completed_at && (
                              <span style={{ fontSize: '10px', color: '#999' }}>{new Date(course.completed_at).toLocaleDateString()}</span>
                            )}
                            {!course.is_required && (
                              <button style={S.removeBtn} onClick={() => handleRemove(emp.id, course.course_id)}>✕</button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Assign */}
                  <div style={S.assignRow}>
                    <select
                      style={S.assignSelect}
                      value={assignSelects[emp.id] || ''}
                      onChange={e => setAssignSelects(s => ({ ...s, [emp.id]: e.target.value }))}
                    >
                      <option value="">+ Assign a course…</option>
                      {courses
                        .filter(c => !emp.courses.find(ec => ec.course_id === c.id))
                        .map(c => <option key={c.id} value={c.id}>{c.title}</option>)
                      }
                    </select>
                    {assignSelects[emp.id] && (
                      <button style={S.assignBtn}
                        onClick={() => handleAssign(emp.id, assignSelects[emp.id])}
                        disabled={assigning[emp.id]}>
                        {assigning[emp.id] ? '…' : 'Assign'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {editingEmployee && (
        <EditModal
          employee={editingEmployee}
          onSave={handleSaveEdit}
          onClose={() => setEditingEmployee(null)}
        />
      )}

      <div style={S.footer}>SLP Alaska Training Portal · AnthroSafe™ · Safety isn't expensive, it's PRICELESS!</div>
    </div>
  )
}

const S = {
  page: { minHeight: '100vh', background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)', fontFamily: 'Arial, Helvetica, sans-serif' },
  loadPage: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)' },
  spinner: { width: '48px', height: '48px', border: '4px solid rgba(255,255,255,0.2)', borderTop: '4px solid #fff', borderRadius: '50%', animation: 'spin 1s linear infinite' },
  topNav: { background: 'rgba(0,0,0,0.35)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(10px)' },
  topNavLeft: { display: 'flex', alignItems: 'center', gap: '14px' },
  navLogo: { height: '40px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' },
  navTitle: { color: '#fff', fontWeight: '700', fontSize: '16px' },
  topNavRight: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
  navBtn: { background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '7px', padding: '7px 14px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', textDecoration: 'none', display: 'inline-block' },
  body: { padding: '20px 24px' },
  statsBar: { display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' },
  statCard: { background: 'rgba(255,255,255,0.12)', borderRadius: '10px', padding: '14px 20px', flex: '1', minWidth: '100px', textAlign: 'center' },
  statNum: { fontSize: '26px', fontWeight: '700', color: '#fbbf24' },
  statLabel: { fontSize: '10px', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '3px' },
  error: { background: '#fff0f0', border: '1px solid #ffcdd2', color: '#c62828', borderRadius: '8px', padding: '12px 16px', marginBottom: '14px', fontSize: '14px' },
  filterPanel: { background: 'rgba(255,255,255,0.08)', borderRadius: '10px', padding: '14px 16px', marginBottom: '14px', border: '1px solid rgba(255,255,255,0.15)' },
  filterTitle: { color: '#fbbf24', fontWeight: '700', fontSize: '13px', marginBottom: '10px' },
  filterRow: { display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' },
  filterField: { display: 'flex', flexDirection: 'column', gap: '4px' },
  filterLabel: { fontSize: '11px', color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  filterSelect: { padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '12px', outline: 'none' },
  clearBtn: { background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', alignSelf: 'flex-end' },
  matrixBtn: { background: '#fbbf24', color: '#1a1a2e', border: 'none', borderRadius: '6px', padding: '8px 16px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', alignSelf: 'flex-end' },
  searchRow: { display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' },
  search: { flex: 1, minWidth: '200px', padding: '10px 16px', borderRadius: '20px', border: 'none', fontSize: '13px', outline: 'none' },
  btnPrimary: { background: '#b71c1c', color: '#fff', border: 'none', borderRadius: '7px', padding: '8px 16px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' },
  btnSecondary: { background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '7px', padding: '7px 12px', fontSize: '12px', cursor: 'pointer' },
  empty: { textAlign: 'center', padding: '60px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '14px' },
  card: { background: '#fff', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '14px 14px 10px', background: '#f9f9fb', borderBottom: '1px solid #f0f0f0' },
  empName: { fontSize: '14px', fontWeight: '700', color: '#1a1a2e' },
  empMeta: { fontSize: '11px', color: '#666', marginTop: '2px' },
  empMeta2: { fontSize: '10px', color: '#999', marginTop: '2px' },
  badgeGreen: { background: '#e8f5e9', color: '#2e7d32', padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' },
  badgeGray: { background: '#f5f5f5', color: '#999', padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' },
  editBtn: { background: '#e3f2fd', color: '#1565c0', border: 'none', borderRadius: '5px', padding: '4px 10px', fontSize: '11px', cursor: 'pointer', fontWeight: '600' },
  courseList: { padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '6px', minHeight: '50px' },
  noCourses: { color: '#bbb', fontSize: '12px', margin: 0, textAlign: 'center' },
  courseRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' },
  courseInfo: { display: 'flex', alignItems: 'center', gap: '5px', flex: 1, minWidth: 0 },
  courseTitle: { fontSize: '12px', color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  reqTag: { background: '#fff3e0', color: '#e65100', padding: '1px 5px', borderRadius: '8px', fontSize: '9px', fontWeight: '700', flexShrink: 0 },
  removeBtn: { background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: '12px', padding: '0 2px' },
  assignRow: { display: 'flex', gap: '6px', padding: '8px 14px', borderTop: '1px solid #f0f0f0', background: '#f9f9fb' },
  assignSelect: { flex: 1, padding: '6px 8px', borderRadius: '5px', border: '1px solid #ddd', fontSize: '12px', outline: 'none' },
  assignBtn: { background: '#b71c1c', color: '#fff', border: 'none', borderRadius: '5px', padding: '6px 12px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' },
  modal: { background: '#fff', borderRadius: '12px', padding: '28px', width: '100%', maxWidth: '480px', maxHeight: '85vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  closeBtn: { background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#666' },
  field: { display: 'flex', flexDirection: 'column', gap: '4px' },
  label: { fontSize: '12px', fontWeight: '600', color: '#444' },
  input: { padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px', outline: 'none' },
  footer: { textAlign: 'center', padding: '20px', color: 'rgba(255,255,255,0.4)', fontSize: '11px' },
}

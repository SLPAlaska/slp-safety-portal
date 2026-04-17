'use client'

// app/admin/lms/companies/[companyId]/page.js
//
// Super-admin view: company training matrix with rich filters.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

import { getCourseStatus, formatFrequency, STATUS_COLORS } from '@/lib/courseStatus'


export default function CompanyMatrixPage() {
  const params = useParams()
  const router = useRouter()
  const companyId = params.companyId

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [selectedUserIds, setSelectedUserIds] = useState([])
  const [workLocation, setWorkLocation] = useState('')
  const [department, setDepartment] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [supervisor, setSupervisor] = useState('')
  const [clientProject, setClientProject] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showMore, setShowMore] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    const res = await fetch(`/api/lms/admin/company-matrix?company_id=${companyId}`)
    const j = await res.json()
    if (!res.ok) { setError(j.error || 'Failed to load'); setLoading(false); return }
    setData(j); setLoading(false)
  }, [companyId])

  useEffect(() => { load() }, [load])

  const distinct = useMemo(() => {
    if (!data) return { locations: [], departments: [], jobTitles: [], supervisors: [], projects: [] }
    const pick = (key) => [...new Set(data.users.map(u => u[key]).filter(Boolean))].sort()
    return {
      locations: pick('work_location'),
      departments: pick('department'),
      jobTitles: pick('job_title'),
      supervisors: pick('supervisor'),
      projects: pick('client_project'),
    }
  }, [data])

  const completionMap = useMemo(() => {
    const m = {}
    if (!data) return m
    for (const c of data.completions) {
      if (!m[c.user_id]) m[c.user_id] = {}
      m[c.user_id][c.course_id] = c
    }
    return m
  }, [data])

  const userCourseMap = useMemo(() => {
    const m = {}
    if (!data) return m
    const reqSet = new Set(data.required_course_ids)
    const assnByUser = {}
    for (const a of data.assignments) {
      if (!assnByUser[a.user_id]) assnByUser[a.user_id] = new Set()
      assnByUser[a.user_id].add(a.course_id)
    }
    for (const u of data.users) {
      m[u.id] = new Set([...reqSet, ...(assnByUser[u.id] || new Set())])
    }
    return m
  }, [data])

  const filteredUsers = useMemo(() => {
    if (!data) return []
    let users = data.users
    if (selectedUserIds.length) users = users.filter(u => selectedUserIds.includes(u.id))
    if (workLocation)    users = users.filter(u => u.work_location === workLocation)
    if (department)      users = users.filter(u => u.department === department)
    if (jobTitle)        users = users.filter(u => u.job_title === jobTitle)
    if (supervisor)      users = users.filter(u => u.supervisor === supervisor)
    if (clientProject)   users = users.filter(u => u.client_project === clientProject)

    if (statusFilter !== 'all') {
      users = users.filter(u => {
        const courseIds = [...(userCourseMap[u.id] || [])]
        return courseIds.some(cid => {
          const course = data.courses.find(c => c.id === cid)
          if (!course) return false
          const comp = completionMap[u.id]?.[cid]
          const { status } = getCourseStatus(comp?.completed_at, course.refresher_frequency_months)
          if (statusFilter === 'red') return status === 'overdue' || status === 'never'
          if (statusFilter === 'yellow') return status === 'due_soon'
          if (statusFilter === 'red_yellow') return status !== 'current'
          if (statusFilter === 'green') return status === 'current'
          return true
        })
      })
    }
    return users
  }, [data, selectedUserIds, workLocation, department, jobTitle, supervisor, clientProject, statusFilter, userCourseMap, completionMap])

  const rollup = useMemo(() => {
    if (!data) return { current: 0, due_soon: 0, overdue: 0, never: 0, total: 0 }
    let current = 0, due_soon = 0, overdue = 0, never = 0
    for (const u of filteredUsers) {
      for (const cid of userCourseMap[u.id] || []) {
        const course = data.courses.find(c => c.id === cid)
        if (!course) continue
        const comp = completionMap[u.id]?.[cid]
        const { status } = getCourseStatus(comp?.completed_at, course.refresher_frequency_months)
        if (status === 'current')  current++
        if (status === 'due_soon') due_soon++
        if (status === 'overdue')  overdue++
        if (status === 'never')    never++
      }
    }
    return { current, due_soon, overdue, never, total: current + due_soon + overdue + never }
  }, [data, filteredUsers, userCourseMap, completionMap])

  function clearFilters() {
    setSelectedUserIds([]); setWorkLocation(''); setDepartment('')
    setJobTitle(''); setSupervisor(''); setClientProject(''); setStatusFilter('all')
  }

  if (loading) return <div style={S.page}><p>Loading…</p></div>
  if (error)   return <div style={S.page}><p style={{ color: '#dc2626' }}>{error}</p></div>
  if (!data)   return null

  return (
    <div style={S.page}>
      <div style={{ marginBottom: 16 }}>
        <Link href="/admin/lms" style={S.backLink}>← Back to LMS Admin</Link>
      </div>

      <h1 style={S.h1}>{data.company.name}</h1>
      <p style={S.subtitle}>
        {data.users.length} active employees · {data.courses.length} courses in matrix
      </p>

      <div style={S.rollupBar}>
        <RollupCell label="Current"  count={rollup.current}  total={rollup.total} color={STATUS_COLORS.current} />
        <RollupCell label="Due Soon" count={rollup.due_soon} total={rollup.total} color={STATUS_COLORS.due_soon} />
        <RollupCell label="Overdue"  count={rollup.overdue}  total={rollup.total} color={STATUS_COLORS.overdue} />
        <RollupCell label="Not Done" count={rollup.never}    total={rollup.total} color={STATUS_COLORS.never} />
      </div>

      <div style={S.filterBar}>
        <select value={workLocation} onChange={e => setWorkLocation(e.target.value)} style={S.select}>
          <option value="">All Work Locations</option>
          {distinct.locations.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <select value={department} onChange={e => setDepartment(e.target.value)} style={S.select}>
          <option value="">All Departments</option>
          {distinct.departments.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <select value={jobTitle} onChange={e => setJobTitle(e.target.value)} style={S.select}>
          <option value="">All Job Titles</option>
          {distinct.jobTitles.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={S.select}>
          <option value="all">All Statuses</option>
          <option value="red">Red only (overdue / not done)</option>
          <option value="yellow">Yellow only (due soon)</option>
          <option value="red_yellow">Red + Yellow</option>
          <option value="green">Green only (current)</option>
        </select>
        <button onClick={() => setShowMore(s => !s)} style={S.btnSmall}>
          {showMore ? 'Fewer filters' : 'More filters'}
        </button>
        <button onClick={clearFilters} style={S.btnSmall}>Clear</button>
        <span style={{ color: '#6b7280', fontSize: 14, marginLeft: 'auto' }}>
          {filteredUsers.length} of {data.users.length} users
        </span>
      </div>

      {showMore && (
        <div style={{ ...S.filterBar, marginTop: -8 }}>
          <select value={supervisor} onChange={e => setSupervisor(e.target.value)} style={S.select}>
            <option value="">All Supervisors</option>
            {distinct.supervisors.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <select value={clientProject} onChange={e => setClientProject(e.target.value)} style={S.select}>
            <option value="">All Client Projects</option>
            {distinct.projects.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <MultiUserPicker users={data.users} selected={selectedUserIds} setSelected={setSelectedUserIds} />
        </div>
      )}

      <div style={S.matrixWrap}>
        <table style={S.matrix}>
          <thead>
            <tr>
              <th style={{ ...S.th, ...S.stickyCol, minWidth: 220, textAlign: 'left' }}>Employee</th>
              {data.courses.map(c => (
                <th key={c.id} style={S.thRotated} title={`${c.title}\n${formatFrequency(c.refresher_frequency_months)}`}>
                  <div style={S.rotLabel}>
                    {c.title}
                    <div style={{ fontSize: 10, opacity: 0.7, fontWeight: 400 }}>
                      {formatFrequency(c.refresher_frequency_months)}
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(u => (
              <tr key={u.id}>
                <td style={{ ...S.td, ...S.stickyCol }}>
                  <Link href={`/admin/lms/users/${u.id}`} style={S.userLink}>
                    {u.full_name}
                  </Link>
                  <div style={S.userMeta}>{u.job_title || ''}</div>
                </td>
                {data.courses.map(c => {
                  const expected = userCourseMap[u.id]?.has(c.id)
                  if (!expected) {
                    return <td key={c.id} style={{ ...S.cell, background: '#f9fafb', color: '#9ca3af' }}>—</td>
                  }
                  const comp = completionMap[u.id]?.[c.id]
                  const { status, expiresAt, daysUntilExpiry } = getCourseStatus(comp?.completed_at, c.refresher_frequency_months)
                  const sc = STATUS_COLORS[status]
                  return (
                    <td key={c.id} style={{ ...S.cell, background: sc.bg, color: sc.fg, borderColor: sc.border }}
                        title={tooltipText(comp, status, expiresAt, daysUntilExpiry)}>
                      <div style={{ fontSize: 11, fontWeight: 600 }}>{shortStatus(status)}</div>
                      {comp?.completed_at && (
                        <div style={{ fontSize: 10, opacity: 0.85 }}>
                          {new Date(comp.completed_at).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr><td colSpan={data.courses.length + 1} style={{ ...S.td, textAlign: 'center', padding: 32, color: '#6b7280' }}>
                No users match the current filters.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function RollupCell({ label, count, total, color }) {
  const pct = total ? Math.round((count / total) * 100) : 0
  return (
    <div style={{ background: color.bg, color: color.fg, border: `1px solid ${color.border}`, padding: '10px 16px', borderRadius: 8, flex: 1 }}>
      <div style={{ fontSize: 12, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700 }}>{count}</div>
      <div style={{ fontSize: 11 }}>{pct}% of total cells</div>
    </div>
  )
}

function MultiUserPicker({ users, selected, setSelected }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const filtered = users.filter(u => (u.full_name || '').toLowerCase().includes(q.toLowerCase()))
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={S.select}>
        {selected.length ? `${selected.length} selected` : 'Filter by individuals'}
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, background: 'white', border: '1px solid #d1d5db', borderRadius: 6, padding: 8, zIndex: 10, minWidth: 280, maxHeight: 300, overflow: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <input type="text" placeholder="Search..." value={q} onChange={e => setQ(e.target.value)} style={{ width: '100%', padding: 6, marginBottom: 8, border: '1px solid #d1d5db', borderRadius: 4 }} />
          {filtered.map(u => (
            <label key={u.id} style={{ display: 'flex', alignItems: 'center', padding: 4 }}>
              <input
                type="checkbox"
                checked={selected.includes(u.id)}
                onChange={() => setSelected(sel => sel.includes(u.id) ? sel.filter(x => x !== u.id) : [...sel, u.id])}
                style={{ marginRight: 8 }}
              />
              {u.full_name}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

function shortStatus(s) {
  return { current: 'OK', due_soon: 'Due Soon', overdue: 'OVERDUE', never: 'MISSING' }[s] || s
}
function tooltipText(comp, status, expiresAt, days) {
  if (status === 'never') return 'Not completed'
  let t = `Completed: ${new Date(comp.completed_at).toLocaleDateString()}`
  if (expiresAt) t += `\nExpires: ${expiresAt.toLocaleDateString()}`
  if (days !== null) t += `\n${days < 0 ? `${-days} days overdue` : `${days} days until expiry`}`
  if (comp.granted_by_admin_id) t += `\n(Admin-granted credit)`
  return t
}

const S = {
  page: { padding: 24, maxWidth: '100%', overflow: 'auto' },
  h1: { fontSize: 28, fontWeight: 700, margin: 0 },
  subtitle: { color: '#6b7280', marginTop: 4, marginBottom: 16 },
  backLink: { color: '#dc2626', textDecoration: 'none', fontSize: 14 },
  rollupBar: { display: 'flex', gap: 12, marginBottom: 20 },
  filterBar: { display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' },
  select: { padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, background: 'white', cursor: 'pointer' },
  btnSmall: { padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: 6, background: 'white', cursor: 'pointer', fontSize: 14 },
  matrixWrap: { overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: 8, background: 'white' },
  matrix: { borderCollapse: 'collapse', minWidth: '100%' },
  th: { padding: 8, borderBottom: '2px solid #e5e7eb', background: '#f9fafb', fontSize: 12, fontWeight: 600, color: '#374151', position: 'sticky', top: 0 },
  thRotated: { padding: '8px 4px', borderBottom: '2px solid #e5e7eb', background: '#f9fafb', fontSize: 11, fontWeight: 600, color: '#374151', position: 'sticky', top: 0, height: 140, verticalAlign: 'bottom' },
  rotLabel: { writingMode: 'vertical-rl', transform: 'rotate(180deg)', whiteSpace: 'nowrap', lineHeight: 1.2 },
  stickyCol: { position: 'sticky', left: 0, background: 'white', zIndex: 2 },
  td: { padding: 8, borderBottom: '1px solid #f3f4f6', fontSize: 13 },
  userLink: { color: '#1f2937', textDecoration: 'none', fontWeight: 600 },
  userMeta: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  cell: { padding: 4, borderBottom: '1px solid #f3f4f6', borderRight: '1px solid #f3f4f6', textAlign: 'center', minWidth: 80, maxWidth: 100 },
}


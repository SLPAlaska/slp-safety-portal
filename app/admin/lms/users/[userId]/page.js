'use client'

// app/admin/lms/users/[userId]/page.js

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { getCourseStatus, formatFrequency, STATUS_COLORS } from '@/lib/courseStatus'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function UserTrainingPage() {
  const params = useParams()
  const userId = params.userId

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [grantOpen, setGrantOpen] = useState(false)
  const [grantCourseIds, setGrantCourseIds] = useState([])
  const [grantDate, setGrantDate] = useState(new Date().toISOString().slice(0, 10))
  const [grantNote, setGrantNote] = useState('')
  const [granting, setGranting] = useState(false)
  const [grantResult, setGrantResult] = useState(null)

  async function getToken() {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || null
  }

  const load = useCallback(async () => {
    setLoading(true); setError('')
    const token = await getToken()
    if (!token) { setError('Not signed in. Please log in again.'); setLoading(false); return }
    const res = await fetch(`/api/lms/admin/user-training?user_id=${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const j = await res.json()
    if (!res.ok) { setError(j.error || 'Failed to load'); setLoading(false); return }
    setData(j); setLoading(false)
  }, [userId])

  useEffect(() => { load() }, [load])

  const rows = useMemo(() => {
    if (!data) return []
    const reqSet = new Set(data.required_course_ids)
    const assnSet = new Set(data.assigned_course_ids)
    const compMap = Object.fromEntries(data.completions.map(c => [c.course_id, c]))
    return data.courses.map(course => {
      const comp = compMap[course.id]
      const { status, expiresAt, daysUntilExpiry } = getCourseStatus(comp?.completed_at, course.refresher_frequency_months)
      return {
        course,
        completion: comp,
        status, expiresAt, daysUntilExpiry,
        sources: [
          reqSet.has(course.id)  ? 'Required'  : null,
          assnSet.has(course.id) ? 'Assigned'  : null,
        ].filter(Boolean),
      }
    }).sort((a, b) => {
      const order = { overdue: 0, never: 1, due_soon: 2, current: 3 }
      const d = (order[a.status] ?? 9) - (order[b.status] ?? 9)
      if (d !== 0) return d
      return a.course.title.localeCompare(b.course.title)
    })
  }, [data])

  async function handleGrant() {
    if (!grantCourseIds.length) return
    setGranting(true); setGrantResult(null)
    const token = await getToken()
    const out = []
    for (const course_id of grantCourseIds) {
      const res = await fetch('/api/lms/grant-credit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ user_id: userId, course_id, completed_at: grantDate, grant_note: grantNote || null }),
      })
      const j = await res.json()
      out.push(res.ok
        ? { ok: true, course: j.course, cert: j.cert_number }
        : { ok: false, course: data.courses.find(c => c.id === course_id)?.title || course_id, error: j.error })
    }
    setGranting(false); setGrantResult(out)
    if (out.every(r => r.ok)) {
      setGrantOpen(false); setGrantCourseIds([]); setGrantNote('')
      load()
    }
  }

  if (loading) return <div style={S.page}><p>Loading…</p></div>
  if (error)   return <div style={S.page}><p style={{ color: '#dc2626' }}>{error}</p></div>
  if (!data)   return null

  const u = data.user
  const companyName = u.lms_companies?.name || '—'
  const rollup = rows.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1; return acc
  }, {})

  return (
    <div style={S.page}>
      <div style={{ marginBottom: 16 }}>
        <Link href={`/admin/lms/companies/${u.company_id}`} style={S.backLink}>← Back to {companyName}</Link>
      </div>

      <div style={S.header}>
        <div>
          <h1 style={S.h1}>{u.full_name}</h1>
          <p style={S.subtitle}>
            {u.job_title || 'No title'} · {companyName}
            {u.work_location && ` · ${u.work_location}`}
            {u.department && ` · ${u.department}`}
          </p>
          <p style={{ ...S.subtitle, fontSize: 13 }}>
            {u.email || u.username} · Role: {u.role || 'learner'}
            {u.hire_date && ` · Hired ${new Date(u.hire_date).toLocaleDateString()}`}
          </p>
        </div>
        <button style={S.btnPrimary} onClick={() => setGrantOpen(o => !o)}>
          {grantOpen ? 'Cancel' : '+ Grant Credit'}
        </button>
      </div>

      <div style={S.rollupBar}>
        <RollupCell label="Current"  count={rollup.current  || 0} color={STATUS_COLORS.current} />
        <RollupCell label="Due Soon" count={rollup.due_soon || 0} color={STATUS_COLORS.due_soon} />
        <RollupCell label="Overdue"  count={rollup.overdue  || 0} color={STATUS_COLORS.overdue} />
        <RollupCell label="Not Done" count={rollup.never    || 0} color={STATUS_COLORS.never} />
      </div>

      {grantOpen && (
        <div style={S.grantPanel}>
          <h3 style={{ margin: '0 0 12px 0' }}>Grant Credit to {u.full_name}</h3>
          <label style={S.label}>Courses</label>
          <div style={{ maxHeight: 240, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 6, padding: 12, background: 'white' }}>
            {data.courses.map(c => (
              <label key={c.id} style={{ display: 'flex', alignItems: 'center', padding: '4px 0' }}>
                <input type="checkbox"
                  checked={grantCourseIds.includes(c.id)}
                  onChange={() => setGrantCourseIds(ids => ids.includes(c.id) ? ids.filter(x => x !== c.id) : [...ids, c.id])}
                  style={{ marginRight: 8 }}
                />
                {c.title}
              </label>
            ))}
          </div>
          <label style={S.label}>Completion Date</label>
          <input type="date" value={grantDate} onChange={e => setGrantDate(e.target.value)} style={S.input} />
          <label style={S.label}>Note (optional)</label>
          <input type="text" value={grantNote} onChange={e => setGrantNote(e.target.value)} style={S.input}
                 placeholder="e.g., Completed at previous employer - cert on file" />
          <button style={S.btnPrimary} disabled={granting || grantCourseIds.length === 0} onClick={handleGrant}>
            {granting ? 'Granting…' : `Grant ${grantCourseIds.length} course${grantCourseIds.length === 1 ? '' : 's'}`}
          </button>
          {grantResult && (
            <ul style={{ marginTop: 12 }}>
              {grantResult.map((r, i) => (
                <li key={i} style={{ color: r.ok ? '#16a34a' : '#dc2626' }}>
                  {r.ok ? `OK  ${r.course} - cert ${r.cert}` : `FAIL  ${r.course} - ${r.error}`}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <table style={S.table}>
        <thead>
          <tr>
            <th style={S.th}>Status</th>
            <th style={S.th}>Course</th>
            <th style={S.th}>Source</th>
            <th style={S.th}>Refresher</th>
            <th style={S.th}>Completed</th>
            <th style={S.th}>Expires</th>
            <th style={S.th}>Certificate</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => {
            const sc = STATUS_COLORS[r.status]
            return (
              <tr key={r.course.id}>
                <td style={S.td}>
                  <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 12, background: sc.bg, color: sc.fg, border: `1px solid ${sc.border}`, fontSize: 11, fontWeight: 600 }}>
                    {sc.label}
                  </span>
                </td>
                <td style={S.td}>
                  <div style={{ fontWeight: 600 }}>{r.course.title}</div>
                  {r.course.regulatory_basis && (
                    <div style={{ fontSize: 11, color: '#6b7280' }}>{r.course.regulatory_basis}</div>
                  )}
                </td>
                <td style={S.td}>{r.sources.join(', ') || '—'}</td>
                <td style={S.td}>{formatFrequency(r.course.refresher_frequency_months)}</td>
                <td style={S.td}>
                  {r.completion?.completed_at
                    ? new Date(r.completion.completed_at).toLocaleDateString()
                    : <span style={{ color: '#9ca3af' }}>—</span>}
                  {r.completion?.granted_by_name && (
                    <div style={{ fontSize: 10, color: '#6b7280' }}>Granted by {r.completion.granted_by_name}</div>
                  )}
                </td>
                <td style={S.td}>
                  {r.expiresAt
                    ? <>
                        {r.expiresAt.toLocaleDateString()}
                        {r.daysUntilExpiry !== null && (
                          <div style={{ fontSize: 10, color: r.daysUntilExpiry < 0 ? '#991b1b' : '#6b7280' }}>
                            {r.daysUntilExpiry < 0 ? `${-r.daysUntilExpiry} days overdue` : `${r.daysUntilExpiry} days left`}
                          </div>
                        )}
                      </>
                    : <span style={{ color: '#9ca3af' }}>—</span>}
                </td>
                <td style={S.td}>
                  {r.completion?.certificate_id
                    ? <a href={`/lms/certificate/${r.completion.certificate_id}`} target="_blank" rel="noopener noreferrer" style={S.certLink}>
                        {r.completion.certificate_id}
                      </a>
                    : <span style={{ color: '#9ca3af' }}>—</span>}
                </td>
              </tr>
            )
          })}
          {rows.length === 0 && (
            <tr><td colSpan={7} style={{ ...S.td, textAlign: 'center', padding: 32, color: '#6b7280' }}>
              No courses assigned or required for this user yet.
            </td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function RollupCell({ label, count, color }) {
  return (
    <div style={{ background: color.bg, color: color.fg, border: `1px solid ${color.border}`, padding: '10px 16px', borderRadius: 8, flex: 1 }}>
      <div style={{ fontSize: 12, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700 }}>{count}</div>
    </div>
  )
}

const S = {
  page: { padding: 24, maxWidth: 1400, margin: '0 auto' },
  h1: { fontSize: 28, fontWeight: 700, margin: 0 },
  subtitle: { color: '#6b7280', marginTop: 4, marginBottom: 4 },
  backLink: { color: '#dc2626', textDecoration: 'none', fontSize: 14 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  rollupBar: { display: 'flex', gap: 12, marginBottom: 20 },
  grantPanel: { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, marginBottom: 20 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginTop: 12, marginBottom: 4 },
  input: { width: '100%', padding: 8, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' },
  btnPrimary: { padding: '10px 18px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600, marginTop: 12 },
  table: { width: '100%', borderCollapse: 'collapse', background: 'white', border: '1px solid #e5e7eb', borderRadius: 8 },
  th: { textAlign: 'left', padding: 10, borderBottom: '2px solid #e5e7eb', background: '#f9fafb', fontSize: 12, fontWeight: 600 },
  td: { padding: 10, borderBottom: '1px solid #f3f4f6', fontSize: 13, verticalAlign: 'top' },
  certLink: { color: '#dc2626', textDecoration: 'none', fontSize: 12, fontFamily: 'monospace' },
}

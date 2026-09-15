'use client'

// /game/reports — Run the Job admin analytics
//
// Open to platform super admins and MagTec company admins (the API route
// decides; this page just asks). Two questions it exists to answer:
//
//   1. What did people actually know? First-attempt scores only. Later runs
//      measure practice, which is good for the player and useless here.
//   2. Is the Monday email carrying this, or are people coming back on their
//      own? That is the prompted/voluntary split.
//
// Deliberately a separate page rather than a tab inside the company admin
// dashboard: super admins have no lms_users row and so cannot open that
// dashboard at all, and this is the report both of them need.

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function GameReports() {
  const [state, setState] = useState('loading')   // loading | ready | denied | error
  const [data, setData] = useState(null)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/lms/login'; return }
      try {
        const res = await fetch('/api/game/admin/analytics', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (res.status === 401 || res.status === 403) { setState('denied'); return }
        if (!res.ok) { setState('error'); return }
        setData(await res.json())
        setState('ready')
      } catch { setState('error') }
    }
    load()
  }, [])

  if (state === 'loading') return <Shell><p style={S.muted}>Loading…</p></Shell>
  if (state === 'denied') return (
    <Shell>
      <h2 style={S.h2}>Not your report</h2>
      <p style={S.muted}>
        Run the Job reporting is open to MagTec Alaska company admins and SLP super admins.
      </p>
      <a href="/lms/dashboard" style={S.link}>← Back to the portal</a>
    </Shell>
  )
  if (state === 'error') return (
    <Shell>
      <h2 style={S.h2}>Report unavailable</h2>
      <p style={S.muted}>Something on our end is not answering. Try again in a few minutes.</p>
    </Shell>
  )

  const runs = data.source_totals || { prompted: 0, voluntary: 0 }
  const pulls = data.pull_source_totals || { prompted: 0, voluntary: 0 }
  const totalRuns = runs.prompted + runs.voluntary
  const totalPulls = pulls.prompted + pulls.voluntary
  const played = data.employees.filter((e) => e.totals?.runs > 0).length

  return (
    <Shell>
      <div style={S.headRow}>
        <div>
          <h1 style={S.h1}>Run the Job — reports</h1>
          <p style={S.muted}>MagTec Alaska · knowledge assessment and engagement</p>
        </div>
        <button style={S.btn} onClick={() => downloadCsv(data)}>Download CSV</button>
      </div>

      {/* ── engagement */}
      <section style={S.card}>
        <h2 style={S.h2}>Prompted vs voluntary</h2>
        <p style={S.muted}>
          Prompted = arrived from the Monday email link. Voluntary = signed into the portal and
          went looking for it.
        </p>
        <div style={S.statRow}>
          <Stat label="Runs — prompted" value={runs.prompted} sub={pct(runs.prompted, totalRuns)} />
          <Stat label="Runs — voluntary" value={runs.voluntary} sub={pct(runs.voluntary, totalRuns)} />
          <Stat label="Pulls — prompted" value={pulls.prompted} sub={pct(pulls.prompted, totalPulls)} />
          <Stat label="Pulls — voluntary" value={pulls.voluntary} sub={pct(pulls.voluntary, totalPulls)} />
          <Stat label="Employees who played" value={played} sub={`of ${data.employees.length}`} />
        </div>
      </section>

      {/* ── deck summary */}
      <section style={S.card}>
        <h2 style={S.h2}>By deck — first attempts only</h2>
        <div style={S.scroll}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Deck</th>
                <th style={S.th}>Steps</th>
                <th style={S.th}>First attempts</th>
                <th style={S.th}>Not attempted</th>
                <th style={S.th}>Avg payout</th>
                <th style={S.th}>Avg wrong calls</th>
                <th style={S.th}>Clean first runs</th>
              </tr>
            </thead>
            <tbody>
              {data.decks.map((d) => (
                <tr key={d.id} style={S.tr}>
                  <td style={{ ...S.td, fontWeight: 700 }}>{d.title}</td>
                  <td style={S.td}>{d.steps}</td>
                  <td style={S.td}>{d.first_attempts}</td>
                  <td style={{ ...S.td, color: d.not_attempted ? '#b71c1c' : '#2e7d32' }}>
                    {d.not_attempted}
                  </td>
                  <td style={S.td}>{d.avg_coins?.toLocaleString() ?? '—'}</td>
                  <td style={S.td}>{d.avg_wrongs ?? '—'}</td>
                  <td style={S.td}>{d.clean_first_runs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── this week's hat */}
      <section style={S.card}>
        <h2 style={S.h2}>
          Drawing entries — week of {data.drawing?.week_start || '—'}
        </h2>
        <p style={S.muted}>
          One entry per person per deck for a clean run, and one for a perfect scored Safety
          Pull. Winners are drawn by hand — this is the hat.
        </p>
        {(data.drawing?.entries || []).length === 0 ? (
          <div style={S.empty}>No entries yet this week.</div>
        ) : (
          <div style={S.scroll}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>#</th>
                  <th style={S.th}>Name</th>
                  <th style={S.th}>Earned for</th>
                  <th style={S.th}>Deck</th>
                </tr>
              </thead>
              <tbody>
                {data.drawing.entries.map((e, i) => (
                  <tr key={i} style={S.tr}>
                    <td style={S.td}>{i + 1}</td>
                    <td style={{ ...S.td, fontWeight: 700 }}>{e.name}</td>
                    <td style={S.td}>
                      {e.reason === 'clean_run' ? 'Clean run' : 'Perfect Safety Pull'}
                    </td>
                    <td style={S.td}>{e.deck || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── the matrix */}
      <section style={S.card}>
        <h2 style={S.h2}>Knowledge assessment by employee</h2>
        <p style={S.muted}>
          Each cell is that employee&apos;s <b>first</b> run of that deck: payout, and wrong calls
          in parentheses. A dash means they have never run it.
        </p>
        <div style={S.scroll}>
          <table style={{ ...S.table, fontSize: '12px' }}>
            <thead>
              <tr>
                <th style={S.thSticky}>Employee</th>
                <th style={S.th}>Crew</th>
                {data.decks.map((d) => (
                  <th key={d.id} style={{ ...S.th, minWidth: '86px' }}>{d.title}</th>
                ))}
                <th style={S.th}>Runs</th>
                <th style={S.th}>Prompted</th>
                <th style={S.th}>Voluntary</th>
                <th style={S.th}>Clean</th>
                <th style={S.th}>Pulls</th>
              </tr>
            </thead>
            <tbody>
              {data.employees.map((e) => (
                <tr key={e.id} style={S.tr}>
                  <td style={{ ...S.tdSticky, fontWeight: 700 }}>
                    {e.full_name}
                    {e.job_title && <div style={S.tiny}>{e.job_title}</div>}
                  </td>
                  <td style={{ ...S.td, color: e.crew ? '#333' : '#b71c1c' }}>
                    {e.crew || 'no crew'}
                  </td>
                  {data.decks.map((d) => {
                    const f = e.first_attempts[d.id]
                    return (
                      <td key={d.id} style={{ ...S.td, ...(f ? {} : S.gap) }}>
                        {f
                          ? <>
                              {f.coins.toLocaleString()}
                              <span style={{ color: f.wrongs ? '#b71c1c' : '#2e7d32' }}>
                                {' '}({f.wrongs})
                              </span>
                            </>
                          : '—'}
                      </td>
                    )
                  })}
                  <td style={S.td}>{e.totals.runs}</td>
                  <td style={S.td}>{e.totals.prompted}</td>
                  <td style={S.td}>{e.totals.voluntary}</td>
                  <td style={S.td}>{e.totals.clean}</td>
                  <td style={S.td}>{e.totals.pulls}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <a href="/lms/dashboard" style={S.link}>← Back to the portal</a>
    </Shell>
  )
}

function pct(n, total) {
  if (!total) return '—'
  return Math.round((n / total) * 100) + '%'
}

function Stat({ label, value, sub }) {
  return (
    <div style={S.stat}>
      <div style={S.statNum}>{Number(value).toLocaleString()}</div>
      <div style={S.statLbl}>{label}</div>
      {sub && <div style={S.tiny}>{sub}</div>}
    </div>
  )
}

function Shell({ children }) {
  return <div style={S.page}><div style={S.wrap}>{children}</div></div>
}

/** First-attempt matrix as CSV, for the people who live in spreadsheets. */
function downloadCsv(data) {
  const esc = (v) => {
    const s = String(v ?? '')
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const header = [
    'Employee', 'Job title', 'Crew',
    ...data.decks.flatMap((d) => [`${d.title} payout`, `${d.title} wrong calls`]),
    'Runs', 'Prompted', 'Voluntary', 'Clean runs', 'Pulls', 'Scored pulls', 'Perfect pulls',
  ]
  const rows = data.employees.map((e) => [
    e.full_name, e.job_title || '', e.crew || '',
    ...data.decks.flatMap((d) => {
      const f = e.first_attempts[d.id]
      return f ? [f.coins, f.wrongs] : ['', '']
    }),
    e.totals.runs, e.totals.prompted, e.totals.voluntary, e.totals.clean,
    e.totals.pulls, e.totals.scored_pulls, e.totals.perfect_pulls,
  ])
  const csv = [header, ...rows].map((r) => r.map(esc).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `run-the-job-first-attempts-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

const S = {
  page: { minHeight: '100vh', background: '#f0f2f5', fontFamily: 'Arial, Helvetica, sans-serif', padding: '24px' },
  wrap: { maxWidth: '1200px', margin: '0 auto' },
  headRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' },
  h1: { fontSize: '26px', fontWeight: 700, color: '#1a1a2e', margin: '0 0 4px' },
  h2: { fontSize: '17px', fontWeight: 700, color: '#1a1a2e', margin: '0 0 6px' },
  muted: { fontSize: '13px', color: '#666', margin: '0 0 14px', lineHeight: 1.5 },
  tiny: { fontSize: '11px', color: '#888', marginTop: '2px' },
  card: { background: '#fff', borderRadius: '10px', padding: '22px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', marginBottom: '20px' },
  statRow: { display: 'flex', gap: '12px', flexWrap: 'wrap' },
  stat: { background: '#f7f7f9', borderRadius: '8px', padding: '12px 20px', textAlign: 'center', minWidth: '120px' },
  statNum: { fontSize: '24px', fontWeight: 700, color: '#1565c0' },
  statLbl: { fontSize: '11px', color: '#666', textTransform: 'uppercase', marginTop: '2px' },
  scroll: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th: { textAlign: 'left', padding: '9px 10px', background: '#f7f7f9', color: '#555', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e5e5e5', whiteSpace: 'nowrap' },
  thSticky: { textAlign: 'left', padding: '9px 10px', background: '#f7f7f9', color: '#555', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e5e5e5', position: 'sticky', left: 0, zIndex: 1 },
  tr: { borderBottom: '1px solid #f0f0f0' },
  td: { padding: '8px 10px', color: '#333', whiteSpace: 'nowrap' },
  tdSticky: { padding: '8px 10px', color: '#333', position: 'sticky', left: 0, background: '#fff', whiteSpace: 'nowrap' },
  gap: { background: '#fff6f6', color: '#c62828' },
  btn: { background: '#b71c1c', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 18px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' },
  link: { fontSize: '13px', color: '#b71c1c', textDecoration: 'none', fontWeight: 600 },
  empty: { padding: '20px', textAlign: 'center', color: '#aaa', fontSize: '14px' },
}

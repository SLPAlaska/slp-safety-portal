'use client'

import { useState, useMemo } from 'react'
import { supabase } from '../../lib/supabase'

const BRAND = 'AnthroSafe\u2122 Field Driven Safety \u2022 \u00A9 2026 SLP Alaska, LLC'
const XLSX_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'

function loadXlsx() {
  return new Promise((resolve, reject) => {
    if (window.XLSX) return resolve(window.XLSX)
    const s = document.createElement('script')
    s.src = XLSX_CDN
    s.onload = () => resolve(window.XLSX)
    s.onerror = () => reject(new Error('Could not load the spreadsheet library.'))
    document.head.appendChild(s)
  })
}

function answerFor(resp, sortOrder) {
  return (resp.answers || []).find(a => a.sort_order === sortOrder) || {}
}

export default function SurveyResults() {
  const [screen, setScreen] = useState('key') // key | results
  const [key, setKey] = useState('')
  const [keyError, setKeyError] = useState('')
  const [loading, setLoading] = useState(false)

  const [data, setData] = useState(null)
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState('')

  const fetchResults = async (accessKey) => {
    setLoading(true)
    setKeyError('')
    const { data: result, error } = await supabase.rpc('get_survey_results', {
      p_key: accessKey
    })
    setLoading(false)
    if (error) {
      setKeyError(
        error.message === 'Invalid access key'
          ? 'That key is not recognized.'
          : 'Something went wrong. Try again in a moment.'
      )
      return
    }
    setData(result)
    setScreen('results')
  }

  const handleUnlock = async (e) => {
    e.preventDefault()
    if (!key.trim()) {
      setKeyError('Enter the access key.')
      return
    }
    await fetchResults(key.trim())
  }

  const refresh = () => fetchResults(key.trim())

  const stats = useMemo(() => {
    if (!data) return null
    const responses = data.responses || []
    const questions = data.questions || []
    const likertQs = questions.filter(q => q.qtype === 'likert5')
    const selectQ = questions.find(q => q.qtype === 'select')
    const textQs = questions.filter(q => q.qtype === 'text')

    const byLoc = (loc) => responses.filter(r => r.work_location === loc)

    const likertRows = likertQs.map(q => {
      const vals = []
      const slopeVals = []
      const offVals = []
      for (const r of responses) {
        const a = answerFor(r, q.sort_order)
        if (a.likert != null) {
          vals.push(a.likert)
          if (r.work_location === 'Slope') slopeVals.push(a.likert)
          if (r.work_location === 'Off Slope') offVals.push(a.likert)
        }
      }
      const avg = (arr) => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null
      return {
        sort_order: q.sort_order,
        prompt: q.prompt,
        n: vals.length,
        avg: avg(vals),
        avgSlope: avg(slopeVals),
        avgOff: avg(offVals),
        disagree: vals.filter(v => v <= 2).length
      }
    }).sort((a, b) => (a.avg ?? 99) - (b.avg ?? 99))

    const incidentVotes = {}
    const elaborations = []
    if (selectQ) {
      for (const r of responses) {
        const a = answerFor(r, selectQ.sort_order)
        if (a.choice) {
          incidentVotes[a.choice] = (incidentVotes[a.choice] || 0) + 1
          if (a.free_text) {
            elaborations.push({
              choice: a.choice, text: a.free_text,
              loc: r.work_location, role: r.respondent_role
            })
          }
        }
      }
    }

    const comments = []
    for (const q of textQs) {
      for (const r of responses) {
        const a = answerFor(r, q.sort_order)
        if (a.free_text) {
          comments.push({
            prompt: q.prompt, text: a.free_text, loc: r.work_location,
            name: r.respondent_name, role: r.respondent_role, date: r.submitted_on
          })
        }
      }
    }

    return {
      total: responses.length,
      slope: byLoc('Slope').length,
      off: byLoc('Off Slope').length,
      gaveName: responses.filter(r => r.respondent_name).length,
      likertRows,
      incidentVotes: Object.entries(incidentVotes).sort((a, b) => b[1] - a[1]),
      elaborations,
      comments,
      selectQ,
      likertQs,
      textQs
    }
  }, [data])

  const downloadXlsx = async () => {
    setDownloading(true)
    setDownloadError('')
    try {
      const XLSX = await loadXlsx()
      const responses = data.responses || []
      const questions = data.questions || []
      const likertQs = questions.filter(q => q.qtype === 'likert5')
      const selectQ = questions.find(q => q.qtype === 'select')
      const textQs = questions.filter(q => q.qtype === 'text')

      const wb = XLSX.utils.book_new()

      // ---- Summary tab ----
      const s = []
      s.push([data.campaign?.title || 'Safety Culture Survey'])
      s.push([`Open ${data.campaign?.opens_at} through ${data.campaign?.closes_at}`])
      s.push([`Generated ${new Date().toLocaleString()}`])
      s.push([])
      s.push(['Total responses', stats.total])
      s.push(['Slope', stats.slope])
      s.push(['Off Slope', stats.off])
      s.push(['Gave name', stats.gaveName])
      s.push([])
      s.push(['Question', 'N', 'Avg (1-5)', 'Disagree (1-2)', 'Avg Slope', 'Avg Off Slope'])
      for (const row of stats.likertRows) {
        s.push([
          `Q${row.sort_order}. ${row.prompt}`, row.n,
          row.avg != null ? Number(row.avg.toFixed(2)) : '',
          row.disagree,
          row.avgSlope != null ? Number(row.avgSlope.toFixed(2)) : '',
          row.avgOff != null ? Number(row.avgOff.toFixed(2)) : ''
        ])
      }
      s.push([])
      if (selectQ) {
        s.push([selectQ.prompt, 'Votes'])
        for (const [choice, n] of stats.incidentVotes) s.push([choice, n])
        s.push([])
      }
      s.push([BRAND])
      const wsSummary = XLSX.utils.aoa_to_sheet(s)
      wsSummary['!cols'] = [{ wch: 70 }, { wch: 8 }, { wch: 10 }, { wch: 14 }, { wch: 10 }, { wch: 12 }]
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary')

      // ---- Slope / Off Slope tabs ----
      const header = ['Submitted', 'Name', 'Role']
      for (const q of likertQs) header.push(`Q${q.sort_order} (1-5)`)
      if (selectQ) {
        header.push(`Q${selectQ.sort_order} Incident Type`)
        header.push(`Q${selectQ.sort_order} Elaboration`)
      }
      for (const q of textQs) header.push(`Q${q.sort_order} Comment`)

      const buildRows = (loc) => {
        const rows = [header]
        for (const r of responses.filter(x => x.work_location === loc)) {
          const row = [r.submitted_on, r.respondent_name || '', r.respondent_role || '']
          for (const q of likertQs) row.push(answerFor(r, q.sort_order).likert ?? '')
          if (selectQ) {
            const a = answerFor(r, selectQ.sort_order)
            row.push(a.choice || '')
            row.push(a.free_text || '')
          }
          for (const q of textQs) row.push(answerFor(r, q.sort_order).free_text || '')
          rows.push(row)
        }
        rows.push([])
        rows.push([BRAND])
        return rows
      }

      for (const loc of ['Slope', 'Off Slope']) {
        const ws = XLSX.utils.aoa_to_sheet(buildRows(loc))
        const cols = [{ wch: 11 }, { wch: 20 }, { wch: 18 }]
        for (let i = 0; i < likertQs.length; i++) cols.push({ wch: 9 })
        if (selectQ) { cols.push({ wch: 24 }); cols.push({ wch: 50 }) }
        for (let i = 0; i < textQs.length; i++) cols.push({ wch: 50 })
        ws['!cols'] = cols
        XLSX.utils.book_append_sheet(wb, ws, loc)
      }

      XLSX.writeFile(wb, 'MagTec_Safety_Culture_Survey_Results.xlsx')
    } catch (err) {
      setDownloadError(err.message || 'Download failed. Check your connection and try again.')
    }
    setDownloading(false)
  }

  return (
    <div className="page">
      <div className="card">
        <div className="card-header">
          <img src="/Logo.png" alt="SLP Alaska" />
          <h1>{data?.campaign?.title || 'Survey Results'}</h1>
          {screen === 'results' && data?.campaign && (
            <p>Open {data.campaign.opens_at} through {data.campaign.closes_at}</p>
          )}
        </div>

        {screen === 'key' && (
          <div className="card-body">
            <form onSubmit={handleUnlock}>
              <div className="form-group">
                <label htmlFor="key" className="required">Access key</label>
                <input
                  id="key"
                  className="key-input"
                  type="password"
                  autoComplete="off"
                  value={key}
                  onChange={(e) => { setKey(e.target.value); setKeyError('') }}
                  placeholder="Enter access key"
                  disabled={loading}
                />
              </div>
              {keyError && <div className="alert error">{keyError}</div>}
              <button type="submit" className="primary" disabled={loading || !key}>
                {loading ? 'Checking\u2026' : 'View results'}
              </button>
            </form>
          </div>
        )}

        {screen === 'results' && stats && (
          <div className="card-body">
            <div className="toolbar">
              <button type="button" className="secondary" onClick={refresh} disabled={loading}>
                {loading ? 'Refreshing\u2026' : '\u21BB Refresh'}
              </button>
              <button
                type="button"
                className="primary slim"
                onClick={downloadXlsx}
                disabled={downloading || stats.total === 0}
              >
                {downloading ? 'Building file\u2026' : '\u2B07 Download XLSX'}
              </button>
            </div>
            {downloadError && <div className="alert error">{downloadError}</div>}

            <div className="kpi-grid">
              <div className="kpi"><div className="kpi-value">{stats.total}</div><div className="kpi-label">Responses</div></div>
              <div className="kpi"><div className="kpi-value">{stats.slope}</div><div className="kpi-label">Slope</div></div>
              <div className="kpi"><div className="kpi-value">{stats.off}</div><div className="kpi-label">Off Slope</div></div>
              <div className="kpi"><div className="kpi-value">{stats.gaveName}</div><div className="kpi-label">Gave name</div></div>
            </div>

            {stats.total === 0 && (
              <div className="empty">No responses yet. This page is live &mdash; refresh any time.</div>
            )}

            {stats.total > 0 && (
              <>
                <h2>Likert scores <span className="sub">(sorted worst first)</span></h2>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Question</th><th>N</th><th>Avg</th><th>Disagree</th><th>Slope</th><th>Off Slope</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.likertRows.map(row => (
                        <tr key={row.sort_order}>
                          <td>Q{row.sort_order}. {row.prompt}</td>
                          <td>{row.n}</td>
                          <td className={row.avg != null && row.avg < 3 ? 'bad' : row.avg >= 4 ? 'good' : ''}>
                            {row.avg != null ? row.avg.toFixed(2) : '\u2014'}
                          </td>
                          <td>{row.disagree}</td>
                          <td>{row.avgSlope != null ? row.avgSlope.toFixed(2) : '\u2014'}</td>
                          <td>{row.avgOff != null ? row.avgOff.toFixed(2) : '\u2014'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {stats.selectQ && stats.incidentVotes.length > 0 && (
                  <>
                    <h2>{stats.selectQ.prompt}</h2>
                    <div className="bars">
                      {stats.incidentVotes.map(([choice, n]) => (
                        <div key={choice} className="bar-row">
                          <div className="bar-label">{choice}</div>
                          <div className="bar-track">
                            <div
                              className="bar-fill"
                              style={{ width: `${(n / stats.incidentVotes[0][1]) * 100}%` }}
                            />
                          </div>
                          <div className="bar-n">{n}</div>
                        </div>
                      ))}
                    </div>
                    {stats.elaborations.length > 0 && (
                      <div className="quote-list">
                        {stats.elaborations.map((e, i) => (
                          <div key={i} className="quote">
                            <div className="quote-meta">{e.choice} &middot; {e.loc}{e.role ? ` \u00B7 ${e.role}` : ''}</div>
                            <div>{e.text}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {stats.comments.length > 0 && (
                  <>
                    <h2>Written comments</h2>
                    <div className="quote-list">
                      {stats.comments.map((cm, i) => (
                        <div key={i} className="quote">
                          <div className="quote-meta">
                            {cm.prompt} &middot; {cm.loc}
                            {cm.name ? ` \u00B7 ${cm.name}` : ''}
                            {cm.role ? ` (${cm.role})` : ''} &middot; {cm.date}
                          </div>
                          <div>{cm.text}</div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            <div className="brand-footer">{BRAND}</div>
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
          max-width: 1000px;
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

        .key-input {
          width: 100%;
          padding: 16px;
          min-height: 56px;
          border: 2px solid #d1d5db;
          border-radius: 8px;
          font-size: 20px;
          box-sizing: border-box;
        }

        .key-input:focus {
          outline: none;
          border-color: #1e40af;
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

        .primary.slim {
          width: auto;
          min-height: 44px;
          padding: 10px 20px;
          font-size: 15px;
        }

        .secondary {
          min-height: 44px;
          padding: 10px 20px;
          background: white;
          color: #1e3a8a;
          border: 2px solid #1e3a8a;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
        }

        .secondary:disabled {
          color: #9ca3af;
          border-color: #9ca3af;
          cursor: not-allowed;
        }

        .toolbar {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-bottom: 28px;
        }

        .kpi {
          background: #f3f4f6;
          border-radius: 8px;
          padding: 18px 12px;
          text-align: center;
        }

        .kpi-value {
          font-size: 32px;
          font-weight: 700;
          color: #1e3a8a;
        }

        .kpi-label {
          font-size: 13px;
          color: #6b7280;
          margin-top: 4px;
        }

        .empty {
          text-align: center;
          padding: 40px 20px;
          color: #6b7280;
          font-size: 16px;
        }

        h2 {
          font-size: 18px;
          color: #1f2937;
          margin: 30px 0 14px;
        }

        .sub {
          font-weight: 400;
          font-size: 14px;
          color: #6b7280;
        }

        .table-wrap {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }

        th {
          text-align: left;
          padding: 10px 12px;
          background: #1e3a8a;
          color: white;
          font-weight: 600;
          white-space: nowrap;
        }

        td {
          padding: 10px 12px;
          border-bottom: 1px solid #e5e7eb;
          color: #1f2937;
          vertical-align: top;
        }

        td.bad {
          color: #991b1b;
          font-weight: 700;
        }

        td.good {
          color: #15803d;
          font-weight: 700;
        }

        .bars {
          display: grid;
          gap: 10px;
        }

        .bar-row {
          display: grid;
          grid-template-columns: 220px 1fr 40px;
          align-items: center;
          gap: 12px;
        }

        .bar-label {
          font-size: 14px;
          color: #1f2937;
        }

        .bar-track {
          height: 22px;
          background: #e5e7eb;
          border-radius: 4px;
          overflow: hidden;
        }

        .bar-fill {
          height: 100%;
          background: #ea580c;
          border-radius: 4px;
          min-width: 6px;
        }

        .bar-n {
          font-size: 14px;
          font-weight: 700;
          color: #1e3a8a;
          text-align: right;
        }

        .quote-list {
          display: grid;
          gap: 12px;
          margin-top: 14px;
        }

        .quote {
          background: #f3f4f6;
          border-left: 4px solid #1e40af;
          border-radius: 6px;
          padding: 14px 16px;
          font-size: 15px;
          line-height: 1.55;
          color: #1f2937;
          white-space: pre-wrap;
        }

        .quote-meta {
          font-size: 12.5px;
          color: #6b7280;
          margin-bottom: 6px;
          font-weight: 600;
        }

        .brand-footer {
          margin-top: 36px;
          padding-top: 16px;
          border-top: 1px solid #e5e7eb;
          text-align: center;
          font-size: 12.5px;
          color: #6b7280;
        }

        @media (max-width: 720px) {
          .card-body {
            padding: 20px;
          }

          .kpi-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .bar-row {
            grid-template-columns: 1fr;
            gap: 4px;
          }

          .bar-n {
            text-align: left;
          }
        }
      `}</style>
    </div>
  )
}

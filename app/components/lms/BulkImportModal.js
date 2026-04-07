'use client';
// components/lms/BulkImportModal.js
import { useState, useRef } from 'react';

const EXPECTED_HEADERS = [
  'employee_number','first_name','last_name','username',
  'temp_password','email','job_title','department','location','hire_date','status'
];

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { error: 'CSV has no data rows', rows: [] };

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'));
  const missing = EXPECTED_HEADERS.filter(h => !headers.includes(h));
  if (missing.length > 0) return { error: `Missing columns: ${missing.join(', ')}`, rows: [] };

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    // Handle quoted fields
    const values = [];
    let cur = '';
    let inQuote = false;
    for (let c = 0; c < line.length; c++) {
      if (line[c] === '"') { inQuote = !inQuote; }
      else if (line[c] === ',' && !inQuote) { values.push(cur.trim()); cur = ''; }
      else { cur += line[c]; }
    }
    values.push(cur.trim());
    const row = {};
    headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
    rows.push(row);
  }
  return { error: null, rows };
}

export default function BulkImportModal({ company, onClose, onComplete }) {
  const [step, setStep] = useState('upload'); // upload | preview | importing | done
  const [parseError, setParseError] = useState(null);
  const [rows, setRows] = useState([]);
  const [results, setResults] = useState(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef();

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const { error, rows: parsed } = parseCSV(ev.target.result);
      if (error) { setParseError(error); setRows([]); return; }
      setParseError(null);
      setRows(parsed);
      setStep('preview');
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    setImporting(true);
    setStep('importing');
    try {
      const res = await fetch('/api/lms/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: company.id, users: rows }),
      });
      const data = await res.json();
      setResults(data);
      setStep('done');
      if (onComplete) onComplete(data);
    } catch (err) {
      setResults({ error: err.message });
      setStep('done');
    } finally {
      setImporting(false);
    }
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <div style={styles.headerTitle}>Bulk Import Employees</div>
            <div style={styles.headerSub}>{company.name}</div>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        {/* STEP: upload */}
        {step === 'upload' && (
          <div style={styles.body}>
            <div style={styles.uploadBox} onClick={() => fileRef.current.click()}>
              <div style={styles.uploadIcon}>📂</div>
              <div style={styles.uploadText}>Click to select CSV file</div>
              <div style={styles.uploadSub}>
                Required columns: first_name, last_name, username, temp_password, email, job_title, department, location, hire_date
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                style={{ display: 'none' }}
                onChange={handleFile}
              />
            </div>
            {parseError && <div style={styles.errorBox}>{parseError}</div>}
          </div>
        )}

        {/* STEP: preview */}
        {step === 'preview' && (
          <div style={styles.body}>
            <div style={styles.previewSummary}>
              <span style={styles.badge}>{rows.length} employees</span>
              <span style={{ color: '#94a3b8', fontSize: 13 }}>ready to import into {company.name}</span>
            </div>
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    {['Name','Username','Password','Email','Job Title','Location'].map(h => (
                      <th key={h} style={styles.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} style={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                      <td style={styles.td}>{r.first_name} {r.last_name}</td>
                      <td style={styles.td}><code style={styles.code}>{r.username}</code></td>
                      <td style={styles.td}><code style={styles.code}>{r.temp_password}</code></td>
                      <td style={styles.td}>{r.email || <span style={styles.noEmail}>none</span>}</td>
                      <td style={styles.td}>{r.job_title}</td>
                      <td style={styles.td}>{r.location}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={styles.footer}>
              <button onClick={() => { setStep('upload'); setRows([]); }} style={styles.btnSecondary}>
                ← Back
              </button>
              <button onClick={handleImport} style={styles.btnPrimary}>
                Import {rows.length} Employees →
              </button>
            </div>
          </div>
        )}

        {/* STEP: importing */}
        {step === 'importing' && (
          <div style={styles.body}>
            <div style={styles.centerState}>
              <div style={styles.spinner} />
              <div style={styles.importingText}>Importing employees…</div>
              <div style={styles.importingSub}>This may take a minute for large rosters.</div>
            </div>
          </div>
        )}

        {/* STEP: done */}
        {step === 'done' && results && (
          <div style={styles.body}>
            {results.error ? (
              <div style={styles.errorBox}>Import failed: {results.error}</div>
            ) : (
              <>
                <div style={styles.resultsGrid}>
                  <div style={styles.resultCard('#22c55e')}>
                    <div style={styles.resultNum}>{results.created}</div>
                    <div style={styles.resultLabel}>Created</div>
                  </div>
                  <div style={styles.resultCard('#f59e0b')}>
                    <div style={styles.resultNum}>{results.skipped}</div>
                    <div style={styles.resultLabel}>Skipped (existing)</div>
                  </div>
                  <div style={styles.resultCard('#ef4444')}>
                    <div style={styles.resultNum}>{results.errors}</div>
                    <div style={styles.resultLabel}>Errors</div>
                  </div>
                </div>

                {results.details?.errors?.length > 0 && (
                  <div style={styles.errorList}>
                    <div style={styles.errorListTitle}>Errors:</div>
                    {results.details.errors.map((e, i) => (
                      <div key={i} style={styles.errorListItem}>
                        <code>{e.username}</code> — {e.error}
                      </div>
                    ))}
                  </div>
                )}

                {results.details?.skipped?.length > 0 && (
                  <div style={styles.skippedList}>
                    <div style={styles.skippedTitle}>Skipped (already exist):</div>
                    {results.details.skipped.map((s, i) => (
                      <div key={i} style={styles.skippedItem}>{s.username}</div>
                    ))}
                  </div>
                )}
              </>
            )}
            <div style={styles.footer}>
              <button onClick={onClose} style={styles.btnPrimary}>Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  },
  modal: {
    background: '#1e293b', borderRadius: 12, width: '90%', maxWidth: 860,
    maxHeight: '90vh', display: 'flex', flexDirection: 'column',
    border: '1px solid #334155', overflow: 'hidden',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: '20px 24px', borderBottom: '1px solid #334155', flexShrink: 0,
  },
  headerTitle: { fontSize: 18, fontWeight: 700, color: '#f1f5f9' },
  headerSub: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
  closeBtn: {
    background: 'none', border: 'none', color: '#94a3b8', fontSize: 18,
    cursor: 'pointer', padding: '4px 8px', borderRadius: 6,
  },
  body: { padding: 24, overflowY: 'auto', flex: 1 },
  uploadBox: {
    border: '2px dashed #334155', borderRadius: 10, padding: '48px 24px',
    textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s',
  },
  uploadIcon: { fontSize: 40, marginBottom: 12 },
  uploadText: { fontSize: 16, fontWeight: 600, color: '#e2e8f0', marginBottom: 8 },
  uploadSub: { fontSize: 12, color: '#64748b', maxWidth: 480, margin: '0 auto' },
  errorBox: {
    background: '#450a0a', border: '1px solid #ef4444', borderRadius: 8,
    padding: '12px 16px', color: '#fca5a5', fontSize: 13, marginTop: 16,
  },
  previewSummary: {
    display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
  },
  badge: {
    background: '#1d4ed8', color: '#fff', fontSize: 12, fontWeight: 700,
    padding: '3px 10px', borderRadius: 20,
  },
  tableWrap: {
    overflowX: 'auto', overflowY: 'auto', maxHeight: 380,
    border: '1px solid #334155', borderRadius: 8,
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: {
    background: '#0f172a', color: '#94a3b8', fontWeight: 600,
    padding: '8px 12px', textAlign: 'left', position: 'sticky', top: 0,
    borderBottom: '1px solid #334155', whiteSpace: 'nowrap',
  },
  td: { padding: '7px 12px', color: '#cbd5e1', borderBottom: '1px solid #1e293b' },
  trEven: { background: '#1e293b' },
  trOdd: { background: '#182030' },
  code: { background: '#0f172a', padding: '2px 6px', borderRadius: 4, fontFamily: 'monospace', fontSize: 12 },
  noEmail: { color: '#475569', fontStyle: 'italic' },
  footer: {
    display: 'flex', justifyContent: 'flex-end', gap: 10,
    marginTop: 20, paddingTop: 16, borderTop: '1px solid #334155',
  },
  btnPrimary: {
    background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8,
    padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  btnSecondary: {
    background: '#334155', color: '#e2e8f0', border: 'none', borderRadius: 8,
    padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  centerState: { textAlign: 'center', padding: '60px 0' },
  spinner: {
    width: 40, height: 40, border: '4px solid #334155',
    borderTopColor: '#3b82f6', borderRadius: '50%',
    animation: 'spin 0.8s linear infinite', margin: '0 auto 20px',
  },
  importingText: { fontSize: 16, fontWeight: 600, color: '#e2e8f0' },
  importingSub: { fontSize: 13, color: '#64748b', marginTop: 6 },
  resultsGrid: { display: 'flex', gap: 16, marginBottom: 20 },
  resultCard: (color) => ({
    flex: 1, background: '#0f172a', border: `1px solid ${color}33`,
    borderRadius: 10, padding: '20px', textAlign: 'center',
  }),
  resultNum: { fontSize: 36, fontWeight: 800, color: '#f1f5f9' },
  resultLabel: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
  errorList: {
    background: '#450a0a', border: '1px solid #ef4444', borderRadius: 8,
    padding: 16, marginBottom: 12,
  },
  errorListTitle: { fontWeight: 700, color: '#fca5a5', marginBottom: 8, fontSize: 13 },
  errorListItem: { color: '#fca5a5', fontSize: 13, marginBottom: 4 },
  skippedList: {
    background: '#1c1a05', border: '1px solid #f59e0b', borderRadius: 8,
    padding: 16,
  },
  skippedTitle: { fontWeight: 700, color: '#fde68a', marginBottom: 8, fontSize: 13 },
  skippedItem: { color: '#fde68a', fontSize: 13 },
};

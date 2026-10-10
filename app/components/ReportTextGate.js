'use client';

// Spelling & grammar HARD GATE — browser side (shared by the investigation
// workbench, the final report page and the report generator).
//
// callReportTextGate() asks the server to check the report text it reads from
// the database. Anything other than { status: 'pass' } is treated as a block.
// <ReportTextGateModal> shows the flagged fields, lets the investigator fix
// them in place (apply a suggestion, edit, or keep a name/term), saves the
// fixes to the record they came from, and re-checks. There is no override.

import { useState } from 'react';
import { applyReplacement } from '@/lib/investigationTextGate';

export async function callReportTextGate(supabase, incidentId, keep = []) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/investigation-text-gate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token || ''}`,
      },
      body: JSON.stringify({ incidentId, keep }),
    });
    const json = await res.json().catch(() => null);
    if (!json || typeof json.status !== 'string') {
      return { status: 'error', reason: `The spelling & grammar check returned ${res.status}.` };
    }
    if (!res.ok && json.status === 'pass') return { status: 'error', reason: `Unexpected answer (${res.status}).` };
    return json;
  } catch (err) {
    return { status: 'error', reason: 'The spelling & grammar check could not be reached (' + (err?.message || 'network error') + ').' };
  }
}

/** Human message for a trigger refusal coming back from a Supabase update. */
export function textGateDbMessage(error) {
  const msg = error?.message || '';
  if (/TEXT_GATE/.test(msg)) {
    return 'Blocked: the spelling & grammar check has not passed for the current report text. Run the check, fix the flagged items, then try again.';
  }
  return null;
}

const C = { navy: '#1e3a5f', muted: '#6b7280', danger: '#b91c1c', border: '#d1d5db' };

export function ReportTextGateModal({ supabase, incidentId, action, result, onPass, onCancel }) {
  const [res, setRes] = useState(result);
  const [edits, setEdits] = useState(() => Object.fromEntries((result.fields || []).map(f => [f.key, f.text])));
  const [keep, setKeep] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const blocked = res.status !== 'fail';
  const fields = res.fields || [];
  const issuesBy = {};
  for (const i of res.issues || []) (issuesBy[i.key] = issuesBy[i.key] || []).push(i);

  function applyFix(field, issue, value) {
    // Offsets are against the text as checked; only safe while the field is unedited.
    setEdits(prev => {
      const cur = prev[field.key];
      if (cur.slice(issue.offset, issue.offset + issue.length) !== issue.word) return prev;
      const next = applyReplacement(cur, issue.offset, issue.length, value);
      // Shift later issues in this field so further fixes still line up.
      const delta = value.length - issue.length;
      for (const other of issuesBy[field.key] || []) {
        if (other !== issue && other.offset > issue.offset) other.offset += delta;
      }
      issue.applied = value;
      return { ...prev, [field.key]: next };
    });
  }

  async function recheck(extraKeep = []) {
    setBusy(true);
    setMsg('');
    try {
      // Save edited fields back to the row/column they came from.
      for (const f of fields) {
        const next = edits[f.key];
        if (typeof next !== 'string' || next === f.text) continue;
        const id = /^\d+$/.test(String(f.id)) ? Number(f.id) : f.id;
        const { error } = await supabase.from(f.table).update({ [f.column]: next }).eq('id', id);
        if (error) throw new Error(`${f.label}: ${error.message}`);
      }
      const allKeep = [...new Set([...keep, ...extraKeep])];
      const r = await callReportTextGate(supabase, incidentId, allKeep);
      if (r.status === 'pass') { setBusy(false); return onPass(); }
      setRes(r);
      setKeep(allKeep);
      if (r.status === 'fail') setEdits(Object.fromEntries((r.fields || []).map(f => [f.key, f.text])));
    } catch (err) {
      setMsg('Could not save your fixes: ' + err.message);
    }
    setBusy(false);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
      <div role="dialog" aria-label="Spelling and grammar check" style={{ background: 'white', borderRadius: 12, maxWidth: 820, width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#111827' }}>
            {blocked
              ? 'Spelling & grammar check could not run — blocked'
              : `Spelling & grammar — ${(res.issues || []).length} issue${(res.issues || []).length === 1 ? '' : 's'} in ${fields.length} field${fields.length === 1 ? '' : 's'}`}
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
            {blocked
              ? `You cannot ${action} until the check passes. Nothing was changed.`
              : `The final report must be clean before you can ${action}. Fix each item below, then Save & re-check. There is no override.`}
          </div>
        </div>

        <div style={{ padding: '12px 18px', overflowY: 'auto', flex: 1 }}>
          {blocked && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 12, fontSize: 13, color: '#7f1d1d' }}>
              {res.reason || 'The checker did not answer.'}
              <div style={{ marginTop: 6, color: C.muted, fontSize: 12 }}>Your work is saved. Wait a minute and try again.</div>
            </div>
          )}
          {!blocked && fields.map(f => (
            <div key={f.key} style={{ marginBottom: 16, paddingBottom: 14, borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: C.navy, marginBottom: 6 }}>{f.label}</div>
              <ul style={{ margin: '0 0 8px 18px', padding: 0, fontSize: 13 }}>
                {(issuesBy[f.key] || []).map((i, n) => {
                  const kept = keep.includes(i.word);
                  return (
                    <li key={n} style={{ marginBottom: 6, color: '#7c2d12' }}>
                      <strong style={{ background: '#fee2e2', padding: '0 4px', borderRadius: 3 }}>{i.word}</strong>{' '}
                      — {i.message}{i.kind === 'grammar' ? ' (grammar)' : ''}
                      {i.applied && <span style={{ color: '#166534' }}> → fixed to “{i.applied}”</span>}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                        {!i.applied && (i.replacements || []).slice(0, 4).map(v => (
                          <button key={v} type="button" disabled={busy} onClick={() => applyFix(f, i, v)}
                            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #16a34a', background: '#f0fdf4', color: '#166534', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                            {v || '(remove)'}
                          </button>
                        ))}
                        {i.canKeep && !i.applied && (
                          <button type="button" disabled={busy || kept} onClick={() => setKeep(k => [...new Set([...k, i.word])])}
                            style={{ padding: '6px 10px', borderRadius: 6, border: `1px solid ${C.border}`, background: kept ? '#e5e7eb' : 'white', color: '#374151', fontSize: 13, cursor: 'pointer' }}>
                            {kept ? 'Kept as name/term' : 'Keep — it’s a name/term'}
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
              <textarea
                value={edits[f.key] ?? ''}
                onChange={e => { const v = e.target.value; setEdits(p => ({ ...p, [f.key]: v })); }}
                rows={Math.min(8, Math.max(2, Math.ceil((edits[f.key] || '').length / 90)))}
                style={{ width: '100%', boxSizing: 'border-box', padding: 10, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, fontFamily: 'inherit' }}
                aria-label={`Edit ${f.label}`}
                disabled={busy}
              />
            </div>
          ))}
          {msg && <div style={{ color: C.danger, fontSize: 13, marginTop: 6 }}>{msg}</div>}
        </div>

        <div style={{ padding: '12px 18px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button type="button" onClick={onCancel} disabled={busy}
            style={{ padding: '10px 16px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'white', fontSize: 14, cursor: 'pointer' }}>
            Cancel — keep editing
          </button>
          <button type="button" onClick={() => recheck()} disabled={busy}
            style={{ padding: '10px 16px', borderRadius: 8, border: 'none', background: '#16a34a', color: 'white', fontSize: 14, fontWeight: 800, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
            {busy ? 'Checking…' : blocked ? 'Try again' : 'Save fixes & re-check'}
          </button>
        </div>
      </div>
    </div>
  );
}

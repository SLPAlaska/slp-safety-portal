'use client';

// THA hard gate panel (Setup & Evidence). The database trigger is the lock.
// This panel attaches a THA PDF, records a No-THA reason, or (Brian only)
// calls inv_gate_override for gate key THA, which logs the override.

import { useEffect, useRef, useState } from 'react';
import {
  THA_COPY,
  THA_DATE_WINDOWS,
  THA_GATE_KEY,
  THA_GATE_OWNER,
  NO_THA_DETAIL_MIN,
  NO_THA_REASONS,
  callThaApi,
  detailRequired,
  evaluateThaGate,
  filterThaBrowse,
  isThaPdfEvidence,
  reasonLabel,
  thaTimeLabel,
} from '@/lib/thaGate';

const C = {
  navy: '#1e3a5f', text: '#111827', muted: '#6b7280', border: '#e5e7eb',
  red: '#b91c1c', redBg: '#fef2f2', redBd: '#fecaca',
  green: '#166534', greenBg: '#f0fdf4', greenBd: '#bbf7d0',
  blue: '#1e40af', blueBg: '#eff6ff', blueBd: '#bfdbfe',
};

const btn = {
  background: 'white', color: C.navy, border: `1px solid ${C.border}`,
  borderRadius: 8, padding: '8px 12px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
};
const btnDark = { ...btn, background: C.navy, color: 'white', borderColor: C.navy };

export function ThaGatePanel({
  copy = THA_COPY.en,
  gate,
  suggestions = [],
  browse = [],
  dateWindowDays = 1,
  otherLocations = false,
  thaEvidence = [],
  noTha = { reason: '', detail: '' },
  isBrian = false,
  busy = false,
  error = '',
  onAttach,
  onUpload,
  onSaveNoTha,
  onClearNoTha,
  onOverride,
  onRevoke,
  onBrowseChange,
  onPreview,
}) {
  const [reason, setReason] = useState(noTha.reason || '');
  const [detail, setDetail] = useState(noTha.detail || '');
  const [noThaOn, setNoThaOn] = useState(!!(noTha.reason || gate?.via === 'no_tha'));
  const [filter, setFilter] = useState('');
  const [showBrowse, setShowBrowse] = useState(false);
  const [preview, setPreview] = useState(null);
  const [overrideOn, setOverrideOn] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const passed = gate?.status === 'pass';
  const tone = gate?.via === 'override' ? 'blue' : passed ? 'green' : 'red';
  const palette = tone === 'blue'
    ? { fg: C.blue, bg: C.blueBg, bd: C.blueBd }
    : tone === 'green'
      ? { fg: C.green, bg: C.greenBg, bd: C.greenBd }
      : { fg: C.red, bg: C.redBg, bd: C.redBd };
  const needsDetail = detailRequired(reason);
  const detailOk = !needsDetail || detail.trim().length >= NO_THA_DETAIL_MIN;
  const banner = gate?.status === 'error' ? copy.checkFailed : (gate?.message || copy.blocked);

  useEffect(() => {
    setReason(noTha.reason || '');
    setDetail(noTha.detail || '');
    if (noTha.reason || gate?.via === 'no_tha') setNoThaOn(true);
  }, [noTha.reason, noTha.detail, gate?.via]);

  const browseOpen = suggestions.length === 0 || showBrowse;
  const visibleBrowse = filterThaBrowse(browse, filter);

  async function openPreview(tha) {
    setPreview(tha);
    if (!onPreview) return;
    const extra = await onPreview(tha.tha_number);
    if (extra) setPreview((cur) => (cur && cur.tha_number === tha.tha_number ? { ...cur, ...extra } : cur));
  }

  return (
    <section id="qg-tha" data-testid="tha-gate-panel" style={{
      background: 'white', border: `1px solid ${palette.bd}`, borderLeft: `5px solid ${palette.fg}`,
      borderRadius: 12, padding: 16, marginBottom: 18,
    }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.4, color: C.muted }}>THA · REQUIRED BEFORE COMPLETE, APPROVAL, OR EXPORT</div>
      <h2 style={{ margin: '4px 0 6px', fontSize: 18, color: C.navy }}>{copy.title}</h2>
      <p style={{ margin: '0 0 10px', fontSize: 13, color: '#374151', lineHeight: 1.45 }}>{copy.intro}</p>
      <div data-testid="tha-gate-status" style={{ background: palette.bg, border: `1px solid ${palette.bd}`, borderRadius: 8, padding: '10px 12px', fontSize: 14, fontWeight: 700, color: palette.fg }}>
        {banner}
      </div>
      {error && <div style={{ marginTop: 8, fontSize: 13, color: C.red }}>{error}</div>}

      {thaEvidence.length > 0 && (
        <ul style={{ margin: '10px 0 0', paddingLeft: 18, fontSize: 13 }}>
          {thaEvidence.map((row) => (
            <li key={row.id || row.file_url}>
              <a href={row.file_url} target="_blank" rel="noreferrer">{row.file_name || row.source_tha_number || 'THA PDF'}</a>
              {row.source_tha_number ? ` · ${row.source_tha_number}` : ''}
            </li>
          ))}
        </ul>
      )}

      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{copy.suggestHeading}</div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{copy.suggestHint}</div>
        {suggestions.length === 0 && <div data-testid="tha-none-suggested" style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>{copy.noneSuggested}</div>}
        {suggestions.map((tha) => (
          <ThaRow key={tha.tha_number} tha={tha} copy={copy} busy={busy} onAttach={onAttach} onView={openPreview} />
        ))}
        {suggestions.length > 0 && !showBrowse && (
          <button type="button" data-testid="tha-show-browse" onClick={() => setShowBrowse(true)} style={{ ...btn, marginTop: 8 }}>
            {copy.showBrowse}
          </button>
        )}
      </div>

      {browseOpen && (
        <div style={{ marginTop: 14 }} data-testid="tha-browse-list">
          <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{copy.browseHeading}</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{copy.browseHint}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8, alignItems: 'center' }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: C.muted }}>
              {copy.dateWindowLabel}{' '}
              <select
                data-testid="tha-date-window"
                value={dateWindowDays}
                onChange={(e) => onBrowseChange?.({ days: Number(e.target.value), otherLocations })}
                style={{ ...inputStyle, width: 'auto', marginLeft: 4 }}
              >
                {THA_DATE_WINDOWS.map((days) => (
                  <option key={days} value={days}>± {days} day{days === 1 ? '' : 's'}</option>
                ))}
              </select>
            </label>
            <label style={{ fontSize: 13, color: C.text, display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                data-testid="tha-other-locations"
                type="checkbox"
                checked={otherLocations}
                onChange={(e) => onBrowseChange?.({ days: dateWindowDays, otherLocations: e.target.checked })}
              />
              {copy.otherLocations}
            </label>
          </div>
          <input
            data-testid="tha-browse-filter"
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={copy.filterPlaceholder}
            aria-label={copy.filterPlaceholder}
            style={{ ...inputStyle, marginTop: 8 }}
          />
          {visibleBrowse.length === 0 && (
            <div data-testid="tha-none-browse" style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>
              {copy.noneBrowse}
            </div>
          )}
          {visibleBrowse.map((tha) => (
            <ThaRow key={tha.tha_number} tha={tha} copy={copy} busy={busy} onAttach={onAttach} onView={openPreview} />
          ))}
        </div>
      )}

      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{copy.uploadHeading}</div>
        <div style={{ fontSize: 12, color: C.muted, margin: '2px 0 8px' }}>{copy.uploadHint}</div>
        <input
          data-testid="tha-upload"
          type="file"
          accept="application/pdf,.pdf"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) onUpload?.(file);
          }}
        />
      </div>

      <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
        <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 14, fontWeight: 800, color: C.text }}>
          <input
            data-testid="tha-no-tha"
            type="checkbox"
            checked={noThaOn}
            onChange={(e) => {
              const on = e.target.checked;
              setNoThaOn(on);
              if (!on && gate?.via === 'no_tha') onClearNoTha?.();
            }}
          />
          <span>
            {copy.noThaHeading}
            <span style={{ display: 'block', fontWeight: 500, fontSize: 12, color: C.muted, marginTop: 2 }}>{copy.noThaHint}</span>
          </span>
        </label>
        {noThaOn && (
          <div style={{ marginTop: 10 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.muted }} htmlFor="tha-no-reason">{copy.justificationLabel}</label>
            <select id="tha-no-reason" data-testid="tha-reason" value={reason} onChange={(e) => setReason(e.target.value)} style={{ ...inputStyle, marginTop: 4 }}>
              <option value="">Choose…</option>
              {NO_THA_REASONS.map((code) => <option key={code} value={code}>{copy.reasons[code]}</option>)}
            </select>
            {needsDetail && (
              <div style={{ marginTop: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: C.muted }} htmlFor="tha-no-detail">{copy.detailLabel}</label>
                <textarea
                  id="tha-no-detail"
                  data-testid="tha-reason-detail"
                  rows={3}
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  style={{ ...inputStyle, marginTop: 4 }}
                />
                <div style={{ fontSize: 12, color: detailOk ? C.muted : C.red, marginTop: 4 }}>
                  {copy.detailHint} {detail.trim().length}/{NO_THA_DETAIL_MIN}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
              <button
                type="button"
                data-testid="tha-save-no-tha"
                disabled={busy || !reason || !detailOk}
                onClick={() => onSaveNoTha?.({ reason, detail: detail.trim() })}
                style={{ ...btnDark, opacity: busy || !reason || !detailOk ? 0.5 : 1 }}
              >
                {busy ? 'Saving…' : copy.saveNoTha}
              </button>
              {gate?.via === 'no_tha' && (
                <button type="button" disabled={busy} onClick={() => onClearNoTha?.()} style={btn}>{copy.clearNoTha}</button>
              )}
            </div>
          </div>
        )}
      </div>

      {preview && (
        <ThaPreview copy={copy} tha={preview} onClose={() => setPreview(null)} onAttach={onAttach} busy={busy} />
      )}

      {isBrian && gate?.status === 'block' && (
        <div style={{ marginTop: 12 }}>
          {!overrideOn && (
            <button type="button" onClick={() => setOverrideOn(true)} style={{ ...btn, borderColor: C.blueBd, color: C.blue }}>{copy.override}</button>
          )}
          {overrideOn && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>{copy.overrideHint}</div>
              <textarea rows={2} value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} style={inputStyle} />
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button
                  type="button"
                  disabled={busy || overrideReason.trim().length < 10}
                  onClick={() => onOverride?.(overrideReason.trim())}
                  style={{ ...btnDark, opacity: busy || overrideReason.trim().length < 10 ? 0.5 : 1 }}
                >
                  {copy.override}
                </button>
                <button type="button" onClick={() => setOverrideOn(false)} style={btn}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}
      {isBrian && gate?.via === 'override' && (
        <button type="button" disabled={busy} onClick={() => onRevoke?.()} style={{ ...btn, marginTop: 10, color: C.blue }}>{copy.revoke}</button>
      )}
    </section>
  );
}

function ThaRow({ tha, copy, busy, onAttach, onView }) {
  const time = thaTimeLabel(tha.created_at);
  const crew = (tha.crew_names || []).filter(Boolean).join(', ');
  const site = [tha.location, tha.work_area].filter(Boolean).join(' · ');
  const why = [tha.match_location ? copy.whyLocation : null, tha.match_crew ? copy.whyCrew : null].filter(Boolean).join(', ');
  return (
    <div data-testid="tha-row" style={{ display: 'flex', gap: 10, alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', border: `1px solid ${C.border}`, borderRadius: 8, padding: 10, marginTop: 8 }}>
      <div style={{ fontSize: 13, flex: '1 1 220px', lineHeight: 1.45 }}>
        <div><strong>{copy.when}:</strong> {tha.date || '—'}{time ? ` · ${time}` : ''}</div>
        <div><strong>{copy.site}:</strong> {site || '—'}</div>
        <div><strong>{copy.job}:</strong> {tha.task_description || '—'}</div>
        <div><strong>{copy.crew}:</strong> {crew || '—'}</div>
        <div><strong>{copy.supervisor}:</strong> {tha.crew_lead || '—'}</div>
        {why ? <div style={{ color: C.muted }}>matches {why}</div> : null}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" data-testid="tha-view" onClick={() => onView?.(tha)} style={btn}>{copy.view}</button>
        <button type="button" data-testid="tha-attach" disabled={busy} onClick={() => onAttach?.(tha.tha_number)} style={{ ...btnDark, opacity: busy ? 0.5 : 1 }}>{copy.attach}</button>
      </div>
    </div>
  );
}

function ThaPreview({ copy, tha, onClose, onAttach, busy }) {
  const time = thaTimeLabel(tha.created_at);
  const site = [tha.location, tha.work_area].filter(Boolean).join(' · ');
  const names = (tha.crew || tha.crew_names || []).map((c) => (typeof c === 'string' ? c : c?.name)).filter(Boolean);
  return (
    <div role="dialog" aria-label={copy.previewTitle} data-testid="tha-preview" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
      <div style={{ background: 'white', borderRadius: 12, maxWidth: 680, width: '100%', maxHeight: '90vh', overflow: 'auto', padding: 16, fontFamily: 'system-ui, sans-serif' }}>
        <h3 style={{ margin: '0 0 8px', color: C.navy }}>{copy.previewTitle}</h3>
        <div style={{ fontSize: 14, lineHeight: 1.5 }}>
          <div><strong>{copy.when}:</strong> {tha.date || '—'}{time ? ` · ${time}` : ''}</div>
          <div><strong>{copy.site}:</strong> {site || '—'}</div>
          <div><strong>{copy.job}:</strong> {tha.task_description || '—'}</div>
          <div><strong>{copy.supervisor}:</strong> {tha.crew_lead || '—'}</div>
          <div><strong>{copy.crew}:</strong> {names.join(', ') || '—'}</div>
        </div>
        {(tha.steps || []).length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 800, fontSize: 13 }}>{copy.steps}</div>
            <ol style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 13 }}>
              {tha.steps.map((step) => (
                <li key={step.step_number} style={{ marginBottom: 6 }}>
                  {step.task_step || '—'}
                  {step.potential_hazards ? ` — ${step.potential_hazards}` : ''}
                </li>
              ))}
            </ol>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
          <button type="button" data-testid="tha-preview-close" onClick={onClose} style={btn}>{copy.closePreview}</button>
          <button type="button" data-testid="tha-preview-attach" disabled={busy} onClick={() => onAttach?.(tha.tha_number)} style={{ ...btnDark, opacity: busy ? 0.5 : 1 }}>{copy.attach}</button>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%', maxWidth: 520, boxSizing: 'border-box', padding: '8px 10px',
  borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14, fontFamily: 'inherit',
};

/**
 * Wired panel: loads suggestions from the API and writes through it.
 * Override still goes through inv_gate_override so only Brian's session works
 * and the activity log row is written by that function.
 */
export function ThaGate({ supabase, incident, evidence, userEmail, onEvidence, onIncident }) {
  const copy = THA_COPY.en;
  const [remote, setRemote] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [browseOpts, setBrowseOpts] = useState({ days: 1, otherLocations: false });
  const browseRef = useRef(browseOpts);
  const isBrian = String(userEmail || '').toLowerCase() === THA_GATE_OWNER;
  const localEvidence = (evidence || []).filter(isThaPdfEvidence);
  const localGate = evaluateThaGate({
    incident,
    evidence,
    override: remote?.gate?.via === 'override' ? remote.gate.override : null,
  });
  const gate = remote?.gate?.status ? remote.gate : localGate;

  async function refresh() {
    if (!incident?.id) return;
    const { days, otherLocations } = browseRef.current;
    const res = await callThaApi(supabase, {
      action: 'context',
      incidentId: incident.id,
      dateWindowDays: days,
      otherLocations,
    });
    if (res.ok) {
      setRemote(res);
      setError('');
    }
  }

  function onBrowseChange(next) {
    browseRef.current = next;
    setBrowseOpts(next);
    refresh();
  }

  async function onPreview(thaNumber) {
    const res = await callThaApi(supabase, { action: 'preview', incidentId: incident.id, thaNumber });
    if (!res.ok) {
      setError(res.error || 'Could not open that THA.');
      return null;
    }
    return res.tha ? { ...res.tha, steps: res.steps || [], crew: res.crew || [] } : null;
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incident?.id, incident?.no_tha, incident?.no_tha_reason, incident?.no_tha_reason_detail, localEvidence.length]);

  async function run(action, extra) {
    setBusy(true);
    setError('');
    try {
      const res = await callThaApi(supabase, { action, incidentId: incident.id, ...extra });
      if (!res.ok) {
        setError(res.error || 'Could not save.');
        return;
      }
      if (res.incident) onIncident?.(res.incident);
      if (res.evidence && onEvidence) await onEvidence();
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function onUpload(file) {
    if (!file || file.size > 8 * 1024 * 1024) {
      setError('The PDF must be under 8 MB.');
      return;
    }
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Could not read that file.'));
      reader.readAsDataURL(file);
    });
    const pdfBase64 = String(dataUrl).split(',')[1] || '';
    await run('upload', { fileName: file.name, pdfBase64 });
  }

  async function onOverride(reason) {
    setBusy(true);
    setError('');
    try {
      const { error: rpcError } = await supabase.rpc('inv_gate_override', {
        p_incident: incident.id, p_key: THA_GATE_KEY, p_reason: reason,
      });
      if (rpcError) {
        setError(rpcError.message);
        return;
      }
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function onRevoke() {
    setBusy(true);
    setError('');
    try {
      const { error: rpcError } = await supabase.rpc('inv_gate_override_revoke', {
        p_incident: incident.id, p_key: THA_GATE_KEY,
      });
      if (rpcError) {
        setError(rpcError.message);
        return;
      }
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <ThaGatePanel
      copy={copy}
      gate={gate}
      suggestions={remote?.suggestions || []}
      browse={remote?.browse || []}
      dateWindowDays={browseOpts.days}
      otherLocations={browseOpts.otherLocations}
      thaEvidence={remote?.evidence?.length ? remote.evidence : localEvidence}
      noTha={{ reason: incident?.no_tha_reason || '', detail: incident?.no_tha_reason_detail || '' }}
      isBrian={isBrian}
      busy={busy}
      error={error}
      onAttach={(thaNumber) => run('attach', { thaNumber })}
      onUpload={onUpload}
      onSaveNoTha={({ reason, detail }) => run('no_tha', { reason, detail })}
      onClearNoTha={() => run('clear_no_tha')}
      onOverride={onOverride}
      onRevoke={onRevoke}
      onBrowseChange={onBrowseChange}
      onPreview={onPreview}
    />
  );
}

export function thaReasonLabel(code) {
  return reasonLabel(code, 'en');
}

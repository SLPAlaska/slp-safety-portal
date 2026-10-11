'use client';

// Investigation Quality Gates (P0, Oct 11 2026) — browser side.
//
// The rules live in the database: public.inv_quality_gate_eval() (SQL 54) feeds
// this checklist, the incidents trigger that refuses Pending Approval /
// Approved / Closed / Mark Complete (SQL 55), and the report watermark. This
// file only shows the result and calls the three actions:
//   * inv_gate_ack       — investigator records a one-line reason on an amber item
//   * inv_gate_override  — Brian only (checked in the database by exact email)
//   * inv_hold_lessons   — un-publish lessons until the investigation is approved
// Nothing here can make a red item pass.

import { useState } from 'react';

export const GATE_OWNER_EMAIL = 'brian@slpalaska.com';

export async function loadQualityGate(supabase, incidentId) {
  try {
    const { data, error } = await supabase.rpc('inv_quality_gate', { p_incident: incidentId });
    if (error) return { status: 'error', applies: true, reason: error.message, items: [] };
    if (!data) return { status: 'error', applies: true, reason: 'Investigation not found.', items: [] };
    return data;
  } catch (e) {
    return { status: 'error', applies: true, reason: e?.message || 'network error', items: [] };
  }
}

/** Human message for a trigger refusal coming back from a Supabase update. */
export function qualityGateDbMessage(error) {
  const msg = error?.message || '';
  if (!/QUALITY_GATE/.test(msg)) return null;
  return msg.replace(/^.*?QUALITY_GATE:\s*/, '') + '\n\nOpen the Quality Checklist at the top of the workbench: each item says what is missing and jumps straight to it.';
}

/** Parse 'stage:3:q:U12' -> { stage: 3, target: 'q-U12' }. */
export function parseFix(fix) {
  const parts = String(fix || '').split(':');
  const stage = Number(parts[1]) || null;
  let target = null;
  if (parts[2] === 'q' && parts[3]) target = `q-${parts.slice(3).join(':')}`;
  else if (parts[2]) target = `qg-${parts[2]}`;
  return { stage, target };
}

const C = {
  navy: '#1e3a5f', muted: '#6b7280', border: '#e5e7eb', text: '#111827',
  red: '#b91c1c', redBg: '#fef2f2', redBd: '#fecaca',
  amber: '#92400e', amberBg: '#fffbeb', amberBd: '#fcd34d',
  green: '#166534', greenBg: '#f0fdf4', greenBd: '#bbf7d0',
  blue: '#1e40af', blueBg: '#eff6ff', blueBd: '#bfdbfe',
};

function levelStyle(level) {
  if (level === 'block') return { fg: C.red, bg: C.redBg, bd: C.redBd, tag: 'FIX FIRST' };
  if (level === 'warn') return { fg: C.amber, bg: C.amberBg, bd: C.amberBd, tag: 'NEEDS A REASON' };
  if (level === 'overridden') return { fg: C.blue, bg: C.blueBg, bd: C.blueBd, tag: 'OVERRIDDEN BY BRIAN' };
  if (level === 'acked') return { fg: C.amber, bg: C.amberBg, bd: C.amberBd, tag: 'REASON GIVEN' };
  return { fg: C.green, bg: C.greenBg, bd: C.greenBd, tag: 'OK' };
}

export function gateHeadline(gate) {
  if (!gate) return '';
  if (gate.status === 'error') return 'The quality check could not run: ' + (gate.reason || 'unknown error') + '. Approval stays locked until it runs.';
  const n = (gate.block_count || 0) + (gate.warn_count || 0);
  if (n === 0) return 'This investigation meets the SLP standard. Ready for approval.';
  return `Almost there. ${n} item${n === 1 ? '' : 's'} before this is ready for approval.`;
}

/**
 * The checklist. Props:
 *  gate, busy, userEmail, compact (modal), onReload, onJump(fix),
 *  onAck(key, reason), onOverride(key, reason), onRevoke(key), onHoldLessons(), onCreateCA(text)
 */
export function QualityChecklist({ gate, busy, userEmail, compact = false, onReload, onJump, onAck, onOverride, onRevoke, onHoldLessons, onCreateCA }) {
  const [open, setOpen] = useState(true);
  const [showPassed, setShowPassed] = useState(false);
  if (!gate) return null;
  const isBrian = String(userEmail || '').toLowerCase() === GATE_OWNER_EMAIL;
  const items = Array.isArray(gate.items) ? gate.items : [];
  const order = { block: 0, warn: 1, overridden: 2, acked: 3, pass: 4 };
  const sorted = [...items].sort((a, b) => (order[a.level] ?? 9) - (order[b.level] ?? 9));
  const open_ = sorted.filter(i => i.level === 'block' || i.level === 'warn');
  const done = sorted.filter(i => !(i.level === 'block' || i.level === 'warn'));
  const allGreen = gate.status === 'pass';

  return (
    <section id="qg-panel" style={{
      background: 'white', border: `1px solid ${allGreen ? C.greenBd : C.redBd}`,
      borderLeft: `5px solid ${allGreen ? C.green : gate.status === 'warn' ? C.amberBd : C.red}`,
      borderRadius: 12, padding: compact ? 14 : 16, marginBottom: 18,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.4, color: C.muted }}>QUALITY CHECKLIST · SLP INVESTIGATION STANDARD</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: allGreen ? C.green : C.navy, marginTop: 2 }}>{gateHeadline(gate)}</div>
        </div>
        {onReload && <button type="button" onClick={onReload} disabled={busy} style={btn}>{busy ? 'Checking…' : 'Re-check'}</button>}
        {!compact && <button type="button" onClick={() => setOpen(o => !o)} style={btn}>{open ? 'Hide' : 'Show'}</button>}
      </div>
      {!compact && open && !allGreen && (
        <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>
          Red items lock <strong>Submit for Approval, Approve, Close, Mark Complete</strong> and the client PDF (it prints as a DRAFT).
          Amber items need a one-line reason that Brian will see. Saving your work is never blocked.
        </div>
      )}
      {(open || compact) && (
        <div style={{ marginTop: 10 }}>
          {open_.map(it => <GateRow key={it.key} it={it} isBrian={isBrian} onJump={onJump} onAck={onAck} onOverride={onOverride} onRevoke={onRevoke} onHoldLessons={onHoldLessons} onCreateCA={onCreateCA} />)}
          {done.length > 0 && (
            <button type="button" onClick={() => setShowPassed(s => !s)} style={{ ...btnLink, marginTop: 6 }}>
              {showPassed ? 'Hide' : 'Show'} {done.length} item{done.length === 1 ? '' : 's'} already meeting the standard
            </button>
          )}
          {showPassed && done.map(it => <GateRow key={it.key} it={it} isBrian={isBrian} onJump={onJump} onRevoke={onRevoke} />)}
        </div>
      )}
    </section>
  );
}

function GateRow({ it, isBrian, onJump, onAck, onOverride, onRevoke, onHoldLessons, onCreateCA }) {
  const s = levelStyle(it.level);
  const [mode, setMode] = useState(null); // 'ack' | 'override'
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const evidence = Array.isArray(it.evidence) ? it.evidence.filter(e => typeof e === 'string') : [];
  const quoted = evidence.filter(e => /^[A-Z]{1,3}-?[A-Z0-9]*\d*:\s/.test(e) || /^(Local review|Root cause summary|5-Why root cause|Hazard type):/.test(e));

  async function submit() {
    if (reason.trim().length < 10) return;
    setBusy(true);
    try {
      if (mode === 'ack') await onAck?.(it.key, reason.trim());
      if (mode === 'override') await onOverride?.(it.key, reason.trim());
      setMode(null); setReason('');
    } finally { setBusy(false); }
  }

  return (
    <div style={{ border: `1px solid ${s.bd}`, background: s.bg, borderRadius: 10, padding: 12, marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: 'white', background: s.fg, padding: '2px 7px', borderRadius: 4, whiteSpace: 'nowrap' }}>{s.tag}</span>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{it.key} · {it.label}</div>
          <div style={{ fontSize: 13, color: '#374151', marginTop: 3, whiteSpace: 'pre-wrap' }}>{it.message}</div>
          {quoted.length > 0 && it.level !== 'pass' && (
            <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>
              What the report says now:
              <ul style={{ margin: '2px 0 0 18px', padding: 0 }}>
                {quoted.slice(0, 8).map((q, i) => <li key={i}>&ldquo;{q}&rdquo;</li>)}
              </ul>
            </div>
          )}
          {it.override && (
            <div style={{ fontSize: 12, color: C.blue, marginTop: 6 }}>
              Override reason ({it.override.by}): {it.override.reason}
            </div>
          )}
          {it.ack && (
            <div style={{ fontSize: 12, color: C.amber, marginTop: 6 }}>
              Reason ({it.ack.by}): {it.ack.reason}
            </div>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
        {it.level !== 'pass' && it.fix && onJump && <button type="button" onClick={() => onJump(it.fix)} style={btnFix}>Fix it →</button>}
        {it.suggest && onCreateCA && (it.level === 'block') && (
          <button type="button" onClick={() => onCreateCA(it.suggest)} style={btn}>Create CA from this answer</button>
        )}
        {it.key === 'G16' && it.level === 'block' && onHoldLessons && (
          <button type="button" onClick={async () => { setBusy(true); try { await onHoldLessons(); } finally { setBusy(false); } }} disabled={busy} style={btn}>Hold lessons until approval</button>
        )}
        {(it.level === 'warn' || it.level === 'acked') && onAck && mode !== 'ack' && (
          <button type="button" onClick={() => { setMode('ack'); setReason(it.ack?.reason || ''); }} style={btn}>{it.level === 'acked' ? 'Edit my reason' : 'Record my reason'}</button>
        )}
        {isBrian && it.level === 'block' && onOverride && mode !== 'override' && (
          <button type="button" onClick={() => { setMode('override'); setReason(''); }} style={{ ...btn, borderColor: C.blueBd, color: C.blue }}>Override (Brian only)</button>
        )}
        {isBrian && it.level === 'overridden' && onRevoke && (
          <button type="button" onClick={() => onRevoke(it.key)} style={{ ...btn, color: C.blue }}>Remove override</button>
        )}
      </div>
      {mode && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 4 }}>
            {mode === 'override' ? 'Override this check? Your reason will print on the reviewer page.' : 'One line: why is this acceptable here? Brian sees this.'}
          </div>
          <textarea rows={2} value={reason} onChange={e => setReason(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: 8, borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14 }} />
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            <button type="button" onClick={submit} disabled={busy || reason.trim().length < 10} style={{ ...btnFix, opacity: busy || reason.trim().length < 10 ? 0.5 : 1 }}>{busy ? 'Saving…' : 'Save reason'}</button>
            <button type="button" onClick={() => setMode(null)} style={btn}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Shown when a status change / complete / export is refused. */
export function QualityGateModal({ gate, action, userEmail, onClose, onContinue, onJump, onAck, onOverride, onRevoke, onHoldLessons, onCreateCA, onReload, busy }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div role="dialog" aria-label="Quality checklist" style={{ background: 'white', borderRadius: 12, maxWidth: 760, width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: 18 }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: C.navy }}>Not yet. These items need attention before you can {action}.</div>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 4, marginBottom: 10 }}>Tap <strong>Fix it</strong> on any item to jump straight to it. Your work is saved.</div>
        <QualityChecklist compact gate={gate} busy={busy} userEmail={userEmail} onReload={onReload}
          onJump={fix => { onClose(); onJump?.(fix); }} onAck={onAck} onOverride={onOverride} onRevoke={onRevoke}
          onHoldLessons={onHoldLessons} onCreateCA={text => { onClose(); onCreateCA?.(text); }} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
          <button type="button" onClick={onClose} style={btn}>Close</button>
          {gate?.status === 'pass' && onContinue && (
            <button type="button" onClick={onContinue} style={btnFix}>All clear: {action}</button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Diagonal DRAFT watermark: position fixed repeats on every printed page. */
export function DraftWatermark({ text = 'DRAFT — NOT APPROVED' }) {
  return (
    <div aria-hidden="true" className="qg-draft-watermark" style={{
      position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        transform: 'rotate(-35deg)', fontSize: 96, fontWeight: 900, letterSpacing: 6,
        color: 'rgba(185, 28, 28, 0.16)', whiteSpace: 'nowrap', fontFamily: 'system-ui, sans-serif',
        WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact',
      }}>{text}</div>
    </div>
  );
}

const btn = { padding: '6px 10px', fontSize: 12, fontWeight: 700, borderRadius: 6, border: '1px solid #d1d5db', background: 'white', color: '#1f2937', cursor: 'pointer' };
const btnFix = { ...btn, background: '#1e3a5f', color: 'white', borderColor: '#1e3a5f' };
const btnLink = { background: 'none', border: 'none', color: '#2d5a87', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0 };

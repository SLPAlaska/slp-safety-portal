'use client';

// 29 CFR Part 1904 Injury / Illness Classification Justification (Workbench stage 4).
// Autosaves through the Workbench's onIncidentChange. Rules: app/lib/osha1904.js.
// The WC note is stored separately and is never printed in the final report.

import { useState } from 'react';
import {
  OSHA1904_CLASSIFICATIONS, OSHA1904_CITATIONS, OSHA1904_TEMPLATES, OSHA1904_EXAMPLES,
  OSHA1904_MIN_CHARS, validateOsha1904, isRecordable, normCite,
} from '@/lib/osha1904';

const C = { navy: '#1e3a5f', steel: '#2d5a87', pale: '#eff6ff', line: '#d1d5db', muted: '#6b7280', text: '#111827', ok: '#166534', okBg: '#dcfce7', warn: '#92400e', warnBg: '#fef3c7' };

const SUGGEST = {
  first_aid: ['1904.5(a)', '1904.7(b)(5)(ii)'],
  bunkhouse: ['1904.5(a)', '1904.5(b)(6)', '1904.5(b)(2)(v)'],
  personal: ['1904.5(a)', '1904.5(b)(2)(iv)', '1904.5(b)(2)(v)', '1904.5(b)(2)(vi)'],
  other_not_recordable: ['1904.4(a)', '1904.6', '1904.7(a)'],
  recordable_mti: ['1904.5(a)', '1904.7(b)(5)', '1904.7(b)(5)(ii)'],
  recordable_rwi: ['1904.5(a)', '1904.7(b)(4)'],
  recordable_lti: ['1904.5(a)', '1904.7(b)(3)'],
  recordable_fatality: ['1904.5(a)', '1904.7(b)(2)', '1904.39'],
};

export function osha1904Value(incident) {
  return {
    classification: incident?.osha_1904_classification || '',
    work_related: incident?.osha_1904_work_related || '',
    basis: incident?.osha_1904_basis || [],
    justification: incident?.osha_1904_justification || '',
    days_away: incident?.osha_1904_days_away ?? '',
    days_restricted: incident?.osha_1904_days_restricted ?? '',
  };
}

export default function Osha1904Classification({ incident, userEmail, onIncidentChange }) {
  const [showAll, setShowAll] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const v = osha1904Value(incident);
  const injuryCase = !!incident?.injury_occurred;
  const check = validateOsha1904(v, { injuryCase });
  const rec = isRecordable(v.classification);

  function save(patch) {
    onIncidentChange({ ...patch, osha_1904_classified_by: userEmail || null, osha_1904_classified_at: new Date().toISOString() });
  }
  function toggleCite(cite) {
    const have = (v.basis || []);
    const next = have.some(b => normCite(b) === normCite(cite)) ? have.filter(b => normCite(b) !== normCite(cite)) : [...have, cite];
    save({ osha_1904_basis: next });
  }
  function insertTemplate() {
    const t = OSHA1904_TEMPLATES[v.classification];
    if (!t) return;
    if (v.justification.trim() && !window.confirm('Replace the current justification with the template? Your text will be lost.')) return;
    save({ osha_1904_justification: t });
  }

  const citeList = showAll ? OSHA1904_CITATIONS.map(c => c.cite) : (SUGGEST[v.classification] || ['1904.5(a)', '1904.7(a)']);
  const btn = (active) => ({
    padding: '10px 12px', minHeight: 44, borderRadius: 8, cursor: 'pointer', fontSize: 13, textAlign: 'left',
    border: `2px solid ${active ? C.navy : C.line}`, background: active ? C.navy : '#fff', color: active ? '#fff' : C.text, fontWeight: active ? 700 : 500,
  });
  const groups = [
    ['Not recordable', OSHA1904_CLASSIFICATIONS.filter(c => c.group !== 'rec')],
    ['OSHA recordable', OSHA1904_CLASSIFICATIONS.filter(c => c.group === 'rec')],
  ];

  return (
    <div>
      <div style={{ fontSize: 13, color: C.steel, padding: 10, background: C.pale, borderRadius: 6, borderLeft: `3px solid ${C.steel}`, marginBottom: 14 }}>
        Record <strong>why</strong> this case is or is not recordable on the OSHA 300 log, with the 29 CFR 1904 logic: work-relatedness (1904.5), then the general recording criteria (1904.7).
        This justification prints in the final investigation report. {injuryCase ? <strong>Required before this injury investigation can be approved or closed.</strong> : 'Pick "Not an injury or illness case" if nobody was hurt or made ill.'}
      </div>

      {groups.map(([title, opts]) => (
        <div key={title} style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{title}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
            {opts.map(o => (
              <button key={o.value} type="button" style={btn(v.classification === o.value)}
                onClick={() => save({ osha_1904_classification: o.value, ...(o.group === 'rec' ? { osha_1904_work_related: 'yes' } : (o.value === 'bunkhouse' || o.value === 'personal') ? { osha_1904_work_related: 'no' } : {}) })}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      ))}

      {v.classification && v.classification !== 'not_case' && (
        <>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', margin: '14px 0 10px' }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Work-related under 1904.5?</div>
            {['yes', 'no'].map(x => (
              <button key={x} type="button" style={{ ...btn(v.work_related === x), minWidth: 70, textAlign: 'center' }} onClick={() => save({ osha_1904_work_related: x })}>{x === 'yes' ? 'Yes' : 'No'}</button>
            ))}
            {v.classification === 'recordable_lti' && (
              <label style={{ fontSize: 13 }}>Days away (cap 180) <input type="number" min="1" max="180" value={v.days_away} onChange={e => save({ osha_1904_days_away: e.target.value === '' ? null : Number(e.target.value) })} style={{ width: 80, padding: 8, marginLeft: 6, border: `1px solid ${C.line}`, borderRadius: 6 }} /></label>
            )}
            {v.classification === 'recordable_rwi' && (
              <label style={{ fontSize: 13 }}>Days restricted / transferred <input type="number" min="1" max="180" value={v.days_restricted} onChange={e => save({ osha_1904_days_restricted: e.target.value === '' ? null : Number(e.target.value) })} style={{ width: 80, padding: 8, marginLeft: 6, border: `1px solid ${C.line}`, borderRadius: 6 }} /></label>
            )}
          </div>

          <div style={{ fontSize: 13, fontWeight: 600, margin: '6px 0' }}>Regulatory basis <span style={{ fontWeight: 400, color: C.muted }}>(tap to add; the narrative must still explain it)</span></div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {citeList.map(cite => {
              const meta = OSHA1904_CITATIONS.find(c => c.cite === cite);
              const on = (v.basis || []).some(b => normCite(b) === normCite(cite));
              return (
                <button key={cite} type="button" title={meta?.title || ''} onClick={() => toggleCite(cite)}
                  style={{ padding: '6px 10px', borderRadius: 999, fontSize: 12, cursor: 'pointer', border: `1px solid ${on ? C.navy : C.line}`, background: on ? C.navy : '#fff', color: on ? '#fff' : C.text }}>
                  {on ? '✓ ' : ''}§ {cite}{meta && showAll ? ` — ${meta.title}` : ''}
                </button>
              );
            })}
            <button type="button" onClick={() => setShowAll(s => !s)} style={{ padding: '6px 10px', borderRadius: 999, fontSize: 12, cursor: 'pointer', border: `1px dashed ${C.steel}`, background: '#fff', color: C.steel }}>{showAll ? 'Fewer' : 'All 1904 citations…'}</button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', margin: '14px 0 4px' }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Classification justification <span style={{ fontWeight: 400, color: C.muted }}>(prints in the final report)</span></div>
            <button type="button" onClick={insertTemplate} style={{ padding: '6px 12px', fontSize: 12, borderRadius: 6, cursor: 'pointer', border: `1px solid ${C.steel}`, background: '#fff', color: C.steel, fontWeight: 600 }}>Insert template</button>
          </div>
          <textarea
            value={v.justification}
            onChange={e => save({ osha_1904_justification: e.target.value })}
            rows={9}
            placeholder={'1904.5(a): what the employee was doing and whether the event occurred in the work environment; whether a 1904.5(b)(2) exception applies.\n1904.7: which general recording criterion is or is not met (medical treatment beyond first aid, restricted work, days away, loss of consciousness, death, significant diagnosed injury).\nConclusion: recordable / not recordable, and the classification.'}
            style={{ width: '100%', padding: 12, fontSize: 14, lineHeight: 1.5, border: `1px solid ${C.line}`, borderRadius: 8, fontFamily: 'inherit', boxSizing: 'border-box' }}
          />
          <div style={{ fontSize: 11, color: v.justification.trim().length >= OSHA1904_MIN_CHARS ? C.ok : C.muted, textAlign: 'right' }}>{v.justification.trim().length} / {OSHA1904_MIN_CHARS}+ characters</div>

          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, margin: '6px 0 12px' }}>
            <input type="checkbox" checked={!!incident?.osha_1904_privacy_case} onChange={e => save({ osha_1904_privacy_case: e.target.checked })} style={{ width: 20, height: 20 }} />
            Privacy concern case (1904.29(b)(7)): enter "privacy case" instead of the name on the 300 log
          </label>

          <div style={{ border: `1px dashed ${C.line}`, borderRadius: 8, padding: 12, background: '#fafafa' }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Workers&apos; compensation note <span style={{ fontWeight: 400, color: C.muted }}>— a SEPARATE decision from OSHA recordability. Confidential packet only; never printed in the final report.</span></div>
            <textarea
              value={incident?.osha_1904_wc_note || ''}
              onChange={e => onIncidentChange({ osha_1904_wc_note: e.target.value })}
              rows={3}
              placeholder="e.g. Likely compensable under the remote-site (bunkhouse) doctrine; carrier notified [date], claim # [number]."
              style={{ width: '100%', marginTop: 6, padding: 10, fontSize: 13, border: `1px solid ${C.line}`, borderRadius: 6, fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
          </div>
        </>
      )}

      <div style={{ marginTop: 14, padding: 12, borderRadius: 8, background: check.ok ? C.okBg : C.warnBg, color: check.ok ? C.ok : C.warn, fontSize: 13 }}>
        {check.ok
          ? <><strong>✓ 1904 classification complete.</strong> {rec === true ? 'Recordable: enter it on the OSHA 300 log within 7 calendar days (1904.29(b)(3)).' : rec === false ? 'Not recordable: keep this justification with the case file.' : ''}</>
          : <><strong>Still needed:</strong><ul style={{ margin: '6px 0 0 18px', padding: 0 }}>{check.issues.map(i => <li key={i}>{i}</li>)}</ul></>}
        {v.classification === 'recordable_fatality' && <div style={{ marginTop: 6 }}><strong>1904.39:</strong> report the fatality to OSHA within 8 hours.</div>}
      </div>

      <button type="button" onClick={() => setShowGuide(s => !s)} style={{ marginTop: 12, background: 'none', border: 'none', color: C.steel, cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: 0 }}>
        {showGuide ? '▾' : '▸'} Worked examples: how to write the justification
      </button>
      {showGuide && (
        <div style={{ display: 'grid', gap: 10, marginTop: 8 }}>
          {OSHA1904_EXAMPLES.map(ex => (
            <div key={ex.title} style={{ border: `1px solid ${C.line}`, borderLeft: `4px solid ${C.steel}`, borderRadius: 8, padding: 12, fontSize: 13, background: '#fff' }}>
              <div style={{ fontWeight: 700, color: C.navy }}>{ex.title}</div>
              <div style={{ marginTop: 4, color: C.text }}>{ex.summary}</div>
              <ul style={{ margin: '6px 0 0 18px', padding: 0 }}>{ex.logic.map(l => <li key={l} style={{ marginBottom: 2 }}>{l}</li>)}</ul>
              {ex.separate && <div style={{ marginTop: 6, color: C.muted, fontStyle: 'italic' }}>{ex.separate}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

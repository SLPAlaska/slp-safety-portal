'use client';

// Investigation Interview Guide (P0, 2026-10-10)
//
// Autopopulates the critical questions for an incident from inv_question_bank:
// universal core + the hazard bank(s) picked for the incident + the supervision
// & culture block (when triggered) + root cause / close-out. One card per
// question, one-tap chips, follow-up probes when a shallow answer is picked,
// Fact / Stated / Assumed on every answer, N/A only with a reason, autosave per
// answer with an on-device fallback when the network drops.
//
// Security: every read and write goes through the signed-in investigator's
// Supabase session. RLS (supabase/migrations/20261010212422_sql_2026_10_10_28_inv_interview_guide_schema.sql) is the boundary:
// investigator role in app_metadata only; confidential peer answers are
// readable only by the incident's team lead and super admins.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AUDIENCES, FACT_STATUSES, HAZARD_TYPES, WORK_SETTINGS,
  activeProbes, banksFor, cultureTriggers, guideProgress, isAnswered, suggestHazards,
} from '@/lib/investigationGuide';

const C = {
  navy: '#1e3a5f', steel: '#2d5a87', text: '#111827', muted: '#6b7280',
  border: '#d1d5db', borderL: '#e5e7eb', card: '#ffffff', success: '#16a34a',
  warning: '#f59e0b', danger: '#dc2626', amber: '#fef3c7', blueL: '#dbeafe',
};

const pendingKey = id => `inv_guide_pending_${id}`;
const cultureKey = id => `inv_guide_culture_${id}`;

const SAVE_FIELDS = [
  'incident_uuid', 'question_id', 'question_code', 'prompt_snapshot', 'bank',
  'interviewee_role', 'interviewee_label', 'answer_choice', 'answer_text', 'probe_answer',
  'fact_status', 'not_applicable', 'na_reason',
];

function readPending(incidentId) {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(pendingKey(incidentId)) || '{}') || {}; } catch { return {}; }
}
function writePending(incidentId, map) {
  if (typeof window === 'undefined') return;
  try {
    if (Object.keys(map).length === 0) localStorage.removeItem(pendingKey(incidentId));
    else localStorage.setItem(pendingKey(incidentId), JSON.stringify(map));
  } catch { /* storage full or blocked — the on-screen state still holds it */ }
}
export function isCultureForced(incidentId) {
  if (typeof window === 'undefined') return false;
  try { return localStorage.getItem(cultureKey(incidentId)) === '1'; } catch { return false; }
}

async function fetchQuestions(supabase, banks) {
  const { data, error } = await supabase
    .from('inv_question_bank')
    .select('id, code, bank, audience, stage, prompt, help, answer_type, options, is_critical, is_dig_deeper, is_confidential, sort')
    .in('bank', banks)
    .eq('active', true)
    .order('sort');
  if (error) throw error;
  const order = Object.fromEntries(banks.map((b, i) => [b, i]));
  return (data || []).sort((a, b) => (order[a.bank] - order[b.bank]) || (a.sort - b.sort));
}

async function fetchResponses(supabase, incidentUuid) {
  const { data, error } = await supabase
    .from('inv_question_responses')
    .select('*')
    .eq('incident_uuid', incidentUuid)
    .order('created_at');
  if (error) throw error;
  return data || [];
}

/**
 * Close-out helper for Stage 4: critical progress for this incident, computed
 * from the same rules the guide uses. Returns null if the guide data cannot be read.
 */
export async function loadGuideStatus(supabase, incident) {
  try {
    const banks = banksFor(incident, { cultureForced: isCultureForced(incident.id) });
    const [questions, rows] = await Promise.all([fetchQuestions(supabase, banks), fetchResponses(supabase, incident.id)]);
    const byCode = {};
    let conf = 0;
    rows.forEach(r => { if (r.is_confidential) conf++; else byCode[r.question_code] = r; });
    Object.entries(readPending(incident.id)).forEach(([code, p]) => { byCode[code] = { ...(byCode[code] || {}), ...p }; });
    return guideProgress(questions, byCode, { confidentialCount: conf });
  } catch (e) {
    console.warn('[InterviewGuide] status unavailable:', e?.message || e);
    return null;
  }
}

// =====================================================================
export default function InterviewGuide({ supabase, incident, userEmail, onIncidentPatched }) {
  const incidentId = incident.id;
  const [cultureForced, setCultureForced] = useState(() => isCultureForced(incidentId));
  const banks = useMemo(() => banksFor(incident, { cultureForced }), [incident, cultureForced]);
  const bankKey = banks.join(',');

  const [bankMeta, setBankMeta] = useState({});
  const [questions, setQuestions] = useState([]);
  const [resp, setResp] = useState({});          // code -> row (non-confidential + custom)
  const [conf, setConf] = useState([]);          // confidential rows this user can read
  const [confSaved, setConfSaved] = useState(0); // confidential rows saved this session
  const [saveState, setSaveState] = useState({}); // code -> 'saving' | 'saved' | 'local' | 'error:<msg>'
  const [pendingCount, setPendingCount] = useState(0);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('topic');
  const [openDeeper, setOpenDeeper] = useState({});
  const [priors, setPriors] = useState(null);

  const respRef = useRef(resp);
  useEffect(() => { respRef.current = resp; }, [resp]);
  const timers = useRef({});

  // ---------- load ----------
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setLoadError('');
      try {
        const [{ data: bm }, qs, rows] = await Promise.all([
          supabase.from('inv_question_banks').select('code, label, kind, preferred_ca, sort'),
          fetchQuestions(supabase, banks),
          fetchResponses(supabase, incidentId),
        ]);
        if (!alive) return;
        setBankMeta(Object.fromEntries((bm || []).map(b => [b.code, b])));
        setQuestions(qs);
        const byCode = {};
        const confRows = [];
        rows.forEach(r => { if (r.is_confidential) confRows.push(r); else byCode[r.question_code] = r; });
        // Anything stored on this device but not yet saved wins over the server copy.
        const pending = readPending(incidentId);
        Object.entries(pending).forEach(([code, p]) => { byCode[code] = { ...(byCode[code] || {}), ...p }; });
        setResp(byCode);
        setConf(confRows);
        setPendingCount(Object.keys(pending).length);
      } catch (e) {
        if (alive) setLoadError(e?.message || 'Could not load the question bank.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incidentId, bankKey]);

  // ---------- prior similar incidents (K4) ----------
  useEffect(() => {
    if (!banks.includes('culture') || !incident.company_name) { setPriors(null); return; }
    let alive = true;
    (async () => {
      const since = new Date(); since.setFullYear(since.getFullYear() - 1);
      const { data } = await supabase
        .from('incidents')
        .select('id, incident_id, incident_date, brief_description, hazard_types, incident_types, status')
        .eq('company_name', incident.company_name)
        .neq('id', incidentId)
        .gte('incident_date', since.toISOString().slice(0, 10))
        .order('incident_date', { ascending: false })
        .limit(200);
      if (!alive) return;
      const hz = incident.hazard_types || [];
      const it = incident.incident_types || [];
      const match = (data || []).filter(p =>
        hz.length ? (p.hazard_types || []).some(h => hz.includes(h)) : (p.incident_types || []).some(t => it.includes(t)));
      setPriors(match.slice(0, 10));
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bankKey, incident.company_name, (incident.hazard_types || []).join(',')]);

  // ---------- saving ----------
  const persist = useCallback(async (code) => {
    const row = respRef.current[code];
    if (!row) return;
    const payload = {};
    SAVE_FIELDS.forEach(f => { if (row[f] !== undefined) payload[f] = row[f]; });
    payload.answered_by_email = userEmail || null;
    payload.updated_at = new Date().toISOString();
    setSaveState(s => ({ ...s, [code]: 'saving' }));
    try {
      let id = row.id;
      if (id) {
        const { error } = await supabase.from('inv_question_responses').update(payload).eq('id', id);
        if (error) throw error;
      } else {
        const ins = await supabase.from('inv_question_responses').insert(payload).select('id').single();
        if (ins.error && ins.error.code === '23505') {
          // Someone (or another tab) created it first — adopt that row.
          const ex = await supabase.from('inv_question_responses').select('id')
            .eq('incident_uuid', incidentId).eq('question_code', code).eq('is_confidential', false).single();
          if (ex.error) throw ex.error;
          id = ex.data.id;
          const up = await supabase.from('inv_question_responses').update(payload).eq('id', id);
          if (up.error) throw up.error;
        } else if (ins.error) {
          throw ins.error;
        } else {
          id = ins.data.id;
        }
        setResp(prev => ({ ...prev, [code]: { ...prev[code], id } }));
      }
      const pending = readPending(incidentId);
      if (pending[code]) { delete pending[code]; writePending(incidentId, pending); }
      setPendingCount(Object.keys(pending).length);
      setSaveState(s => ({ ...s, [code]: 'saved' }));
    } catch (e) {
      const pending = readPending(incidentId);
      pending[code] = { ...payload, ...(row.id ? { id: row.id } : {}) };
      writePending(incidentId, pending);
      setPendingCount(Object.keys(pending).length);
      const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
      const msg = e?.message || String(e);
      setSaveState(s => ({ ...s, [code]: offline || /fetch|network/i.test(msg) ? 'local' : `error:${msg}` }));
    }
  }, [supabase, incidentId, userEmail]);

  const flushPending = useCallback(async () => {
    const pending = readPending(incidentId);
    for (const code of Object.keys(pending)) {
      if (!respRef.current[code]) continue;
      // eslint-disable-next-line no-await-in-loop
      await persist(code);
    }
  }, [incidentId, persist]);

  useEffect(() => {
    if (loading) return;
    flushPending();
    const onOnline = () => flushPending();
    window.addEventListener('online', onOnline);
    const t = setInterval(() => { if (Object.keys(readPending(incidentId)).length) flushPending(); }, 30000);
    return () => { window.removeEventListener('online', onOnline); clearInterval(t); };
  }, [loading, flushPending, incidentId]);

  useEffect(() => () => Object.values(timers.current).forEach(clearTimeout), []);

  function baseRow(q) {
    return {
      incident_uuid: incidentId,
      question_id: q.id || null,
      question_code: q.code,
      prompt_snapshot: q.prompt,
      bank: q.bank,
      interviewee_role: (q.audience && q.audience[0]) || 'INV',
      fact_status: 'stated',
      not_applicable: false,
    };
  }

  function updateAnswer(q, patch, { immediate = false } = {}) {
    setResp(prev => {
      const next = { ...prev, [q.code]: { ...(prev[q.code] || baseRow(q)), ...patch } };
      respRef.current = next;
      return next;
    });
    setSaveState(s => ({ ...s, [q.code]: 'typing' }));
    clearTimeout(timers.current[q.code]);
    timers.current[q.code] = setTimeout(() => persist(q.code), immediate ? 50 : 900);
  }

  // ---------- incident-level fields ----------
  async function patchIncident(patch) {
    onIncidentPatched(patch);
    const { data, error } = await supabase.from('incidents').update(patch).eq('id', incidentId)
      .select('hazard_types, work_setting, is_repeat').single();
    if (error) { alert('Could not save: ' + error.message); return; }
    onIncidentPatched(data);
  }
  function toggleHazard(code) {
    const cur = incident.hazard_types || [];
    const next = cur.includes(code) ? cur.filter(c => c !== code) : [...cur, code];
    patchIncident({ hazard_types: next.length ? next : null });
  }
  function toggleCulture() {
    const v = !cultureForced;
    setCultureForced(v);
    try { v ? localStorage.setItem(cultureKey(incidentId), '1') : localStorage.removeItem(cultureKey(incidentId)); } catch { /* ignore */ }
  }

  // ---------- custom questions ----------
  const [customDraft, setCustomDraft] = useState('');
  function addCustom() {
    const text = customDraft.trim();
    if (!text) return;
    const code = `CUSTOM-${Date.now().toString(36)}`;
    const q = { code, bank: 'custom', prompt: text, audience: ['INV'], answer_type: 'text', options: [] };
    updateAnswer(q, { answer_text: '' }, { immediate: true });
    setCustomDraft('');
  }
  const customQs = Object.values(resp)
    .filter(r => r.bank === 'custom')
    .map(r => ({ code: r.question_code, bank: 'custom', prompt: r.prompt_snapshot, audience: [r.interviewee_role || 'INV'], answer_type: 'text', options: [], is_critical: false }));

  // ---------- confidential peer answers ----------
  const [confDraft, setConfDraft] = useState('');
  const [confBusy, setConfBusy] = useState(false);
  async function addConfidential(q) {
    const text = confDraft.trim();
    if (!text) return;
    setConfBusy(true);
    // No .select(): only the team lead / super admins can read these back.
    const { error } = await supabase.from('inv_question_responses').insert({
      incident_uuid: incidentId, question_id: q.id, question_code: q.code, prompt_snapshot: q.prompt,
      bank: q.bank, interviewee_role: 'PEER', interviewee_label: null, answer_text: text,
      fact_status: 'stated', is_confidential: true, answered_by_email: userEmail || null,
    });
    setConfBusy(false);
    if (error) { alert('Could not save the confidential answer: ' + error.message); return; }
    setConfDraft('');
    setConfSaved(n => n + 1);
    const { data } = await supabase.from('inv_question_responses').select('*')
      .eq('incident_uuid', incidentId).eq('is_confidential', true).order('created_at');
    setConf(data || []);
  }

  // ---------- derived ----------
  const confCount = Math.max(conf.length, confSaved);
  const progress = useMemo(() => guideProgress(questions, resp, { confidentialCount: confCount }), [questions, resp, confCount]);
  const triggers = cultureTriggers(incident);
  const suggestions = suggestHazards(incident).filter(c => !(incident.hazard_types || []).includes(c));
  const pct = progress.criticalTotal ? Math.round((100 * progress.criticalDone) / progress.criticalTotal) : 0;

  const groups = useMemo(() => {
    if (view === 'person') {
      return AUDIENCES.map(a => ({
        key: a.code, title: a.label,
        items: questions.filter(q => ((q.audience && q.audience[0]) || 'INV') === a.code),
      })).filter(g => g.items.length);
    }
    return banks.map(b => ({
      key: b, title: bankMeta[b]?.label || b, preferred: bankMeta[b]?.preferred_ca,
      items: questions.filter(q => q.bank === b),
    })).filter(g => g.items.length);
  }, [view, banks, bankMeta, questions]);

  // =================================================================
  return (
    <section style={{ background: C.card, border: `1px solid ${C.borderL}`, borderLeft: `4px solid ${C.navy}`, borderRadius: 12, padding: 20, marginBottom: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: C.navy }}>Interview Guide</h3>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4, maxWidth: 720 }}>
            Ask these with the involved person, their supervisor and witnesses. Don&apos;t stop at the first answer —
            if a chip opens a follow-up, ask it. Tag every answer Verified, Stated or Assumed.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[['topic', 'By topic'], ['person', 'By person']].map(([k, l]) => (
            <button key={k} type="button" onClick={() => setView(k)} style={{ ...chip(view === k), minHeight: 36 }}>{l}</button>
          ))}
        </div>
      </div>

      {/* Scope: hazard type, setting, culture trigger */}
      <div style={{ marginTop: 16, padding: 14, background: '#f8fafc', border: `1px solid ${C.borderL}`, borderRadius: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 6 }}>Hazard type(s) — picks which question banks load</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {HAZARD_TYPES.map(h => {
            const on = (incident.hazard_types || []).includes(h.code);
            return (
              <button key={h.code} type="button" data-hazard={h.code} onClick={() => toggleHazard(h.code)} style={chip(on)}>
                <span aria-hidden>{h.icon}</span> {h.label}
              </button>
            );
          })}
        </div>
        {suggestions.length > 0 && (
          <div style={{ fontSize: 12, color: C.steel, marginTop: 8 }}>
            Suggested from the field report:{' '}
            {suggestions.map(c => (
              <button key={c} type="button" onClick={() => toggleHazard(c)} style={{ ...chip(false), minHeight: 30, padding: '4px 10px', fontSize: 12, marginRight: 6 }}>
                + {HAZARD_TYPES.find(h => h.code === c)?.label || c}
              </button>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', marginTop: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 700 }}>
            Work setting{' '}
            <select value={incident.work_setting || ''} onChange={e => patchIncident({ work_setting: e.target.value || null })} style={{ ...input, width: 'auto', minHeight: 36 }}>
              <option value="">— pick —</option>
              {WORK_SETTINGS.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
          </label>
          {incident.is_repeat && (
            <span style={{ fontSize: 12, fontWeight: 700, color: '#7f1d1d', background: '#fee2e2', padding: '4px 10px', borderRadius: 999 }}>
              REPEAT — same company &amp; hazard type in the last 12 months
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 10 }}>
          {triggers.length > 0
            ? <>Supervision &amp; culture block is <strong>on</strong>: {triggers.join(' · ')}</>
            : (
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={cultureForced} onChange={toggleCulture} style={{ width: 18, height: 18 }} />
                Include the supervision &amp; culture block (auto-on for Shop/Yard, repeats, severity A–E, SIF/PSIF)
              </label>
            )}
        </div>
      </div>

      {/* Progress */}
      <div style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, color: C.navy }}>
          <span data-testid="guide-progress">Critical: {progress.criticalDone} of {progress.criticalTotal} answered</span>
          <span style={{ color: C.muted, fontWeight: 500 }}>All answers: {progress.answeredAll} of {progress.total}</span>
        </div>
        <div style={{ height: 10, background: C.borderL, borderRadius: 999, marginTop: 6, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? C.success : C.steel, transition: 'width .3s' }} />
        </div>
        {pendingCount > 0 && (
          <div style={{ marginTop: 8, fontSize: 12, color: '#92400e', background: C.amber, padding: '6px 10px', borderRadius: 6 }}>
            {pendingCount} answer{pendingCount === 1 ? '' : 's'} stored on this device, not yet saved to the server. They will sync when the connection is back.
            {' '}<button type="button" onClick={flushPending} style={{ ...linkBtn }}>Retry now</button>
          </div>
        )}
        {(incident.hazard_types || []).length === 0 && !loading && (
          <div style={{ marginTop: 8, fontSize: 12, color: '#92400e' }}>
            No hazard type picked yet — only the universal and close-out questions are loaded. Pick at least one above.
          </div>
        )}
      </div>

      {loading && <div style={{ marginTop: 16, fontSize: 13, color: C.muted }}>Loading questions…</div>}
      {loadError && <div style={{ marginTop: 16, fontSize: 13, color: C.danger }}>Could not load the Interview Guide: {loadError}</div>}

      {!loading && !loadError && groups.map(g => {
        const crit = g.items.filter(q => q.is_critical);
        const deeper = g.items.filter(q => !q.is_critical);
        const done = crit.filter(q => q.is_confidential ? confCount >= 2 || isAnswered(q, resp[q.code]) : isAnswered(q, resp[q.code])).length;
        return (
          <div key={g.key} style={{ marginTop: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: `2px solid ${C.borderL}`, paddingBottom: 6 }}>
              <h4 style={{ margin: 0, fontSize: 15, color: C.navy }}>{g.title}</h4>
              <span style={{ fontSize: 12, color: done === crit.length ? C.success : C.muted, fontWeight: 700 }}>
                {done}/{crit.length} critical
              </span>
            </div>
            {g.preferred && (
              <div style={{ fontSize: 12, color: '#14532d', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '6px 10px', marginTop: 8 }}>
                <strong>Preferred corrective-action direction:</strong> {g.preferred}
              </div>
            )}
            {g.key === 'culture' && priors && (
              <PriorIncidents priors={priors} />
            )}
            {crit.map(q => q.is_confidential
              ? <ConfidentialCard key={q.code} q={q} rows={conf} savedThisSession={confSaved} draft={confDraft} setDraft={setConfDraft} busy={confBusy} onAdd={() => addConfidential(q)}
                  r={resp[q.code]} onNA={patch => updateAnswer(q, patch)} />
              : <QuestionCard key={q.code} q={q} r={resp[q.code]} state={saveState[q.code]} onChange={(patch, opts) => updateAnswer(q, patch, opts)} />)}
            {deeper.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <button type="button" onClick={() => setOpenDeeper(o => ({ ...o, [g.key]: !o[g.key] }))} style={{ ...linkBtn, fontSize: 13 }}>
                  {openDeeper[g.key] ? '▾' : '▸'} Dig deeper ({deeper.length} optional — latent / system causes)
                </button>
                {openDeeper[g.key] && deeper.map(q => (
                  <QuestionCard key={q.code} q={q} r={resp[q.code]} state={saveState[q.code]} onChange={(patch, opts) => updateAnswer(q, patch, opts)} />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {!loading && !loadError && (
        <div style={{ marginTop: 24 }}>
          <h4 style={{ margin: 0, fontSize: 15, color: C.navy, borderBottom: `2px solid ${C.borderL}`, paddingBottom: 6 }}>Your own questions</h4>
          <div style={{ fontSize: 12, color: C.muted, margin: '6px 0' }}>The bank is a floor, not a ceiling. If something doesn&apos;t add up, add the question you need and record the answer.</div>
          {customQs.map(q => (
            <QuestionCard key={q.code} q={q} r={resp[q.code]} state={saveState[q.code]} onChange={(patch, opts) => updateAnswer(q, patch, opts)} />
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input value={customDraft} onChange={e => setCustomDraft(e.target.value)} placeholder="Type a question to add…" style={{ ...input, minHeight: 40 }} />
            <button type="button" onClick={addCustom} style={primaryBtn}>Add question</button>
          </div>
        </div>
      )}

      {!loading && progress.missing.length > 0 && (
        <div style={{ marginTop: 20, fontSize: 12, color: C.muted }}>
          <strong>Still needed:</strong>{' '}
          {progress.missing.slice(0, 30).map(q => (
            <a key={q.code} href={`#q-${q.code}`} style={{ marginRight: 8, color: C.steel }}>{q.code}</a>
          ))}
          {progress.missing.length > 30 ? `… +${progress.missing.length - 30}` : ''}
        </div>
      )}
    </section>
  );
}

// =====================================================================
function QuestionCard({ q, r, state, onChange }) {
  const row = r || {};
  const picked = row.answer_choice || [];
  const probes = activeProbes(q, row);
  const answered = isAnswered(q, row);
  const isChoice = ['chips', 'multi', 'yesno'].includes(q.answer_type);
  const options = q.answer_type === 'yesno' && !(q.options || []).length
    ? [{ value: 'Yes', label: 'Yes' }, { value: 'No', label: 'No' }]
    : (q.options || []);

  function pick(v) {
    let next;
    if (q.answer_type === 'multi') next = picked.includes(v) ? picked.filter(x => x !== v) : [...picked, v];
    else next = picked.includes(v) ? [] : [v];
    onChange({ answer_choice: next, not_applicable: false }, { immediate: true });
  }

  const border = row.not_applicable ? C.border : answered ? '#86efac' : q.is_critical ? '#fcd34d' : C.borderL;
  return (
    <div id={`q-${q.code}`} data-code={q.code} style={{ border: `1px solid ${border}`, borderLeft: `4px solid ${border}`, borderRadius: 10, padding: 14, marginTop: 10, background: row.not_applicable ? '#f9fafb' : C.card }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, letterSpacing: 0.3 }}>
            {q.code}
            {(q.audience || []).map(a => <span key={a} style={tag}>{a}</span>)}
            {q.is_critical && <span style={{ ...tag, background: '#fef3c7', color: '#92400e' }}>CRITICAL</span>}
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginTop: 4, lineHeight: 1.35 }}>{q.prompt}</div>
          {q.help && <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{q.help}</div>}
        </div>
        <SaveBadge state={state} answered={answered} />
      </div>

      {!row.not_applicable && isChoice && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {options.map(o => (
            <button key={o.value} type="button" onClick={() => pick(o.value)} style={chip(picked.includes(o.value))}>
              {o.label}
            </button>
          ))}
        </div>
      )}

      {!row.not_applicable && probes.length > 0 && (
        <div style={{ marginTop: 10, padding: 10, background: C.blueL, borderRadius: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>Follow-up: {probes[0].probe}</div>
          <textarea value={row.probe_answer || ''} onChange={e => onChange({ probe_answer: e.target.value })} rows={2}
            placeholder="Keep asking — what made that possible?" style={{ ...input, marginTop: 6 }} />
        </div>
      )}

      {!row.not_applicable && (
        <textarea value={row.answer_text || ''} onChange={e => onChange({ answer_text: e.target.value })}
          rows={isChoice ? 2 : 3}
          placeholder={isChoice ? 'Details (optional)…' : 'Answer…'}
          style={{ ...input, marginTop: 10 }} />
      )}

      {row.not_applicable && (
        <input value={row.na_reason || ''} onChange={e => onChange({ na_reason: e.target.value })}
          placeholder="Why this doesn't apply (required)" style={{ ...input, marginTop: 10, minHeight: 40 }} />
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginTop: 10 }}>
        {!row.not_applicable && (
          <div style={{ display: 'flex', gap: 4 }} role="group" aria-label="Fact status">
            {FACT_STATUSES.map(f => (
              <button key={f.code} type="button" title={f.hint} onClick={() => onChange({ fact_status: f.code }, { immediate: true })}
                style={{ ...chip((row.fact_status || 'stated') === f.code), minHeight: 32, padding: '4px 10px', fontSize: 12 }}>
                {f.label}
              </button>
            ))}
          </div>
        )}
        {!row.not_applicable && (
          <>
            <select value={row.interviewee_role || (q.audience && q.audience[0]) || 'INV'} onChange={e => onChange({ interviewee_role: e.target.value }, { immediate: true })}
              style={{ ...input, width: 'auto', minHeight: 32, fontSize: 12 }} aria-label="Answered by role">
              {AUDIENCES.filter(a => a.code !== 'PEER').map(a => <option key={a.code} value={a.code}>{a.label}</option>)}
            </select>
            <input value={row.interviewee_label || ''} onChange={e => onChange({ interviewee_label: e.target.value })}
              placeholder="Who (role/initials)" style={{ ...input, width: 160, minHeight: 32, fontSize: 12 }} />
          </>
        )}
        <label style={{ fontSize: 12, color: C.muted, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', marginLeft: 'auto' }}>
          <input type="checkbox" checked={!!row.not_applicable} onChange={e => onChange({ not_applicable: e.target.checked }, { immediate: true })} style={{ width: 18, height: 18 }} />
          N/A
        </label>
      </div>
    </div>
  );
}

function ConfidentialCard({ q, rows, savedThisSession, draft, setDraft, busy, onAdd, r, onNA }) {
  const visible = rows.length;
  const count = Math.max(visible, savedThisSession);
  const row = r || {};
  return (
    <div id={`q-${q.code}`} data-code={q.code} style={{ border: '1px solid #c4b5fd', borderLeft: '4px solid #7c3aed', borderRadius: 10, padding: 14, marginTop: 10, background: '#faf5ff' }}>
      <div style={{ fontSize: 11, color: '#5b21b6', fontWeight: 800 }}>{q.code} · PRIVATE PEER · CONFIDENTIAL</div>
      <div style={{ fontSize: 15, fontWeight: 600, marginTop: 4 }}>{q.prompt}</div>
      <div style={{ fontSize: 12, color: '#5b21b6', marginTop: 6 }}>
        Ask 3–5 people who were <strong>not</strong> involved, one at a time, in private. Record the answer with <strong>no name</strong>.
        Only the investigation lead and super admins can read these. Never use them as evidence against anyone.
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, marginTop: 8, color: count >= 2 ? C.success : '#92400e' }}>
        {count} response{count === 1 ? '' : 's'} recorded {count >= 2 ? '✓' : '(need at least 2, or N/A with reason)'}
      </div>
      {visible > 0 && (
        <ol style={{ fontSize: 13, margin: '8px 0 0 18px' }}>
          {rows.map(x => <li key={x.id} style={{ whiteSpace: 'pre-wrap', marginBottom: 4 }}>{x.answer_text}</li>)}
        </ol>
      )}
      {visible === 0 && savedThisSession > 0 && (
        <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>Saved. You can&apos;t read these back unless you are the incident&apos;s team lead.</div>
      )}
      <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={3} placeholder="Their answer, in their words (no names)…" style={{ ...input, marginTop: 10 }} />
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
        <button type="button" onClick={onAdd} disabled={busy || !draft.trim()} style={{ ...primaryBtn, background: '#6d28d9', opacity: busy || !draft.trim() ? 0.6 : 1 }}>
          {busy ? 'Saving…' : 'Save confidential answer'}
        </button>
        <label style={{ fontSize: 12, color: C.muted, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={!!row.not_applicable} onChange={e => onNA({ not_applicable: e.target.checked })} style={{ width: 18, height: 18 }} />
          Lead records why not asked
        </label>
      </div>
      {row.not_applicable && (
        <input value={row.na_reason || ''} onChange={e => onNA({ na_reason: e.target.value })} placeholder="Why the private question wasn't asked (required)" style={{ ...input, marginTop: 8, minHeight: 40 }} />
      )}
    </div>
  );
}

function PriorIncidents({ priors }) {
  return (
    <div style={{ marginTop: 10, padding: 10, border: `1px dashed ${C.border}`, borderRadius: 8, fontSize: 12 }}>
      <div style={{ fontWeight: 700, color: C.navy }}>
        Similar incidents, same company, last 12 months ({priors.length}) — use for K4
      </div>
      {priors.length === 0 && <div style={{ color: C.muted, marginTop: 4 }}>None found with the same hazard type.</div>}
      {priors.map(p => (
        <div key={p.id} style={{ marginTop: 4 }}>
          <a href={`/investigation-workbench/${p.id}`} target="_blank" rel="noreferrer" style={{ color: C.steel, fontWeight: 700 }}>{p.incident_id || 'Incident'}</a>
          {' '}{p.incident_date} · {p.status} — {(p.brief_description || '').slice(0, 120)}
        </div>
      ))}
    </div>
  );
}

function SaveBadge({ state, answered }) {
  let text = answered ? '✓ Answered' : '';
  let color = C.success;
  if (state === 'typing' || state === 'saving') { text = 'Saving…'; color = C.muted; }
  else if (state === 'local') { text = 'On device'; color = '#92400e'; }
  else if (state && state.startsWith('error:')) { text = 'Not saved'; color = C.danger; }
  if (!text) return null;
  return <span title={state && state.startsWith('error:') ? state.slice(6) : ''} style={{ fontSize: 11, fontWeight: 700, color, whiteSpace: 'nowrap' }}>{text}</span>;
}

// ---------- styles ----------
function chip(on) {
  return {
    minHeight: 44, padding: '8px 14px', borderRadius: 999, cursor: 'pointer',
    border: `2px solid ${on ? C.navy : C.border}`, background: on ? C.navy : C.card,
    color: on ? 'white' : C.text, fontSize: 14, fontWeight: 600, lineHeight: 1.2,
  };
}
const input = {
  width: '100%', padding: '8px 10px', fontSize: 14, border: `1px solid ${C.border}`,
  borderRadius: 6, background: C.card, color: C.text, fontFamily: 'inherit', boxSizing: 'border-box',
};
const tag = { marginLeft: 6, fontSize: 10, background: '#eef2ff', color: '#3730a3', padding: '1px 6px', borderRadius: 4 };
const linkBtn = { background: 'none', border: 'none', color: C.steel, cursor: 'pointer', fontWeight: 700, padding: 0 };
const primaryBtn = { background: C.navy, color: 'white', padding: '10px 16px', borderRadius: 8, border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer', minHeight: 44 };

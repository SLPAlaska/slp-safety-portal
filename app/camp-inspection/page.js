'use client';
import { COMPANIES } from '@/lib/companies'
import { useState, useEffect, useRef, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { safeCloseout, makeRecordKey, submitPackage, stableUuid, newClientSubmissionId, processOfflineQueue, getOfflineQueueCount, OFFLINE_PACKAGE_DONE_EVENT } from '@/components/SafeSubmit';
import {
  CAMP_QUESTIONS,
  SECTIONS,
  RESPONSE_OPTIONS,
  INSPECTION_TYPES,
  CRITICALITY_COLORS,
  RESPONSE_COLORS
} from './questions';

const supabase = createClient(
  'https://iypezirwdlqpptjpeeyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
);

// NOTE: Sync this list with your other Field Forms (e.g. app/safety-meetings/page.js)
// if you've added/edited companies elsewhere. Apache Corp. is present per Trent's note.

const LOCATIONS = [
  // Sync with your standard portal LOCATIONS array if needed
  'Alpine','Kuparuk','Milne Point','Mustang','Nuna Pad','Prudhoe Bay',
  'Greater Mooses Tooth','Willow','Other'
];

const BRAND_RED = '#D71919';
const BRAND_DARK = '#A80A0A';
const PAGE_BG = '#F5F5F5';
const CARD_BG = '#FFFFFF';

// Map criticality → CA risk rank
function criticalityToRiskRank(c) {
  if (c === 'Critical') return 'Critical';
  if (c === 'High') return 'High';
  return 'Medium';
}

// Default CA due date based on criticality
function defaultDueDate(criticality) {
  const days = criticality === 'Critical' ? 7 : criticality === 'High' ? 14 : 30;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export default function CampInspection() {
  const [step, setStep] = useState('header'); // 'header' | 'section' | 'review' | 'complete'
  const [inspectionId, setInspectionId] = useState(null);
  const [inspectionCode, setInspectionCode] = useState(null);
  const [currentSection, setCurrentSection] = useState(1);

  const [meta, setMeta] = useState({
    inspector_name: '',
    inspector_email: '',
    company: '',
    camp_name: '',
    location: '',
    inspection_date: new Date().toISOString().split('T')[0],
    inspection_type: 'start-up',
    weather_conditions: '',
    gps_lat: null,
    gps_lng: null,
    general_notes: '',
    overall_findings: ''
  });

  // responses[qid] = { response, comment, photo_urls: [] }
  const [responses, setResponses] = useState({});
  const [goNoGo, setGoNoGo] = useState('');
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'error'
  const [submitting, setSubmitting] = useState(false);
  const [starting, setStarting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [uploading, setUploading] = useState({}); // {[qid]: bool}
  const [gettingGps, setGettingGps] = useState(false);

  const saveTimers = useRef({}); // {[qid]: timeoutId}
  // Latest responses for timers (a timer set in one render must save the
  // answer as it is when it fires, not as it was when it was set).
  const responsesRef = useRef(responses);
  responsesRef.current = responses;
  // What the server last accepted per question (JSON of the saved row), so
  // Submit re-sends only what did not get in (e.g. answered with no signal).
  const savedOk = useRef({});
  const photosCleared = useRef({});
  // Photos taken with no signal: kept on this phone with their question and
  // sent by the offline queue. {[qid]: [{ batch, previews: [objectURL] }]}
  const [pendingPhotos, setPendingPhotos] = useState({});
  // Started / submitted with no signal: saved on this phone, NOT sent yet.
  const [startQueued, setStartQueued] = useState(false);
  const [submitQueued, setSubmitQueued] = useState(false);

  // The offline queue sent something that belongs to this inspection.
  useEffect(() => {
    const onDone = (e) => {
      const d = (e && e.detail) || {};
      if (d.form_type !== 'camp-inspection' || !d.ref || d.ref.inspectionId !== inspectionId) return;
      if (d.ref.kind === 'start') setStartQueued(false);
      if (d.ref.kind === 'submit') setSubmitQueued(false);
      if (d.ref.kind === 'photos' && d.ref.qid) {
        const qid = d.ref.qid;
        const urls = (d.urls && d.urls.photos) || [];
        setPendingPhotos(prev => {
          const list = (prev[qid] || []).filter(b => {
            if (b.batch === d.ref.batch) { b.previews.forEach(u => { try { URL.revokeObjectURL(u); } catch (x) {} }); return false; }
            return true;
          });
          return { ...prev, [qid]: list };
        });
        if (urls.length) {
          photosCleared.current[qid] = false;
          setResponses(prev => {
            const cur = prev[qid] || { photo_urls: [] };
            const have = cur.photo_urls || [];
            return { ...prev, [qid]: { ...cur, photo_urls: [...have, ...urls.filter(u => !have.includes(u))] } };
          });
          scheduleSave(qid);
        }
      }
    };
    window.addEventListener(OFFLINE_PACKAGE_DONE_EVENT, onDone);
    return () => window.removeEventListener(OFFLINE_PACKAGE_DONE_EVENT, onDone);
  });

  // -------------------------------------------------------------------------
  // Derived counters
  // -------------------------------------------------------------------------
  const counters = useMemo(() => {
    const c = {
      compliant: 0, non_compliant: 0, needs_action: 0, na: 0, not_verified: 0,
      critical_findings: 0, answered: 0
    };
    CAMP_QUESTIONS.forEach(q => {
      const r = responses[q.id];
      if (!r || !r.response) return;
      c.answered++;
      if (r.response === 'Compliant') c.compliant++;
      else if (r.response === 'Non-Compliant') { c.non_compliant++; if (q.criticality === 'Critical') c.critical_findings++; }
      else if (r.response === 'N/A') c.na++;
      else if (r.response === 'Needs Action') c.needs_action++;
      else if (r.response === 'Not Verified') c.not_verified++;
    });
    return c;
  }, [responses]);

  const sectionProgress = useMemo(() => {
    const map = {};
    SECTIONS.forEach(s => { map[s.order] = { answered: 0, total: 0 }; });
    CAMP_QUESTIONS.forEach(q => {
      map[q.sectionOrder].total++;
      const r = responses[q.id];
      if (r && r.response) map[q.sectionOrder].answered++;
    });
    // Free-text sections (e.g. section 12) — total=1, answered=1 if any text entered
    SECTIONS.forEach(s => {
      if (s.freeText) {
        map[s.order].total = 1;
        const txt = (s.order === 12 ? (meta.overall_findings || '') : '').trim();
        map[s.order].answered = txt.length > 0 ? 1 : 0;
      }
    });
    return map;
  }, [responses, meta.overall_findings]);

  // -------------------------------------------------------------------------
  // GPS capture (optional)
  // -------------------------------------------------------------------------
  function captureGps() {
    if (!navigator.geolocation) {
      alert('Geolocation not supported by this browser.');
      return;
    }
    setGettingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMeta(m => ({ ...m, gps_lat: +pos.coords.latitude.toFixed(6), gps_lng: +pos.coords.longitude.toFixed(6) }));
        setGettingGps(false);
      },
      (err) => {
        alert('Could not get GPS: ' + err.message);
        setGettingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  // -------------------------------------------------------------------------
  // Start inspection — creates the camp_inspections row
  // -------------------------------------------------------------------------
  async function handleStart() {
    setErrorMsg('');
    if (!meta.inspector_name.trim()) { setErrorMsg('Inspector name is required.'); return; }
    if (!meta.company) { setErrorMsg('Company is required.'); return; }
    if (!meta.camp_name.trim()) { setErrorMsg('Camp name is required.'); return; }

    setStarting(true);
    try {
      // The inspection id and its claim code are made on the phone, so the
      // inspection can start with no signal (kept on this phone and sent by
      // the offline queue) and no read-back of the new row is needed.
      const newId = newClientSubmissionId();
      const code = makeRecordKey();
      const res = await submitPackage({
        formType: 'camp-inspection', label: 'Camp inspection (start)', table: 'camp_inspections',
        ref: { kind: 'start', inspectionId: newId },
        steps: [
          {
            kind: 'insert', table: 'camp_inspections', dupKeys: ['camp_inspections_pkey'],
            row: {
              id: newId,
              inspector_name: meta.inspector_name.trim(),
              inspector_email: meta.inspector_email.trim() || null,
              company: meta.company,
              camp_name: meta.camp_name.trim(),
              location: meta.location || null,
              inspection_date: meta.inspection_date,
              inspection_type: meta.inspection_type,
              weather_conditions: meta.weather_conditions.trim() || null,
              gps_lat: meta.gps_lat,
              gps_lng: meta.gps_lng,
              general_notes: meta.general_notes.trim() || null,
              status: 'in-progress',
              total_questions: CAMP_QUESTIONS.length
            }
          },
          { kind: 'insert', table: 'record_keys', row: { table_name: 'camp_inspections', record_id: newId, code }, dupKeys: ['record_keys_pkey'] }
        ]
      });
      if (!res.ok) throw (res.error || new Error('Could not start inspection.'));
      setInspectionCode(code);
      setInspectionId(newId);
      setStartQueued(!!res.queued);
      setStep('section');
      setCurrentSection(1);
      window.scrollTo(0, 0);
    } catch (e) {
      setErrorMsg('Could not start inspection: ' + e.message);
    } finally {
      setStarting(false);
    }
  }

  // -------------------------------------------------------------------------
  // Save / autosave a single question response (debounced upsert)
  // -------------------------------------------------------------------------
  function scheduleSave(qid) {
    if (!inspectionId) return;
    if (saveTimers.current[qid]) clearTimeout(saveTimers.current[qid]);
    setSaveStatus('saving');
    saveTimers.current[qid] = setTimeout(() => { saveResponse(qid); }, 700);
  }

  function responseRow(qid) {
    const q = CAMP_QUESTIONS.find(x => x.id === qid);
    const r = responsesRef.current[qid] || {};
    return {
      inspection_id: inspectionId,
      question_id: q.id,
      section: q.section,
      section_order: q.sectionOrder,
      subsection: q.subsection,
      question_text: q.questionText,
      criticality: q.criticality,
      response: r.response || null,
      comment: r.comment || null,
      // No photos in this screen's list: leave the server's list alone (a
      // photo saved on this phone may have just been merged in by the
      // offline queue). Only clear it when the last photo was removed here.
      ...(r.photo_urls && r.photo_urls.length
        ? { photo_urls: r.photo_urls }
        : (photosCleared.current[qid] ? { photo_urls: null } : {}))
    };
  }

  async function saveResponse(qid) {
    if (!inspectionId) return;
    const row = responseRow(qid);
    try {
      const { error } = await safeCloseout('camp_inspection_responses', inspectionId, inspectionCode, row, inspectionId, 'upsert');
      if (error) throw error;
      savedOk.current[qid] = JSON.stringify(row);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(s => s === 'saved' ? 'idle' : s), 1500);
    } catch (e) {
      setSaveStatus('error');
      console.error('Save failed:', e);
    }
  }

  function updateResponse(qid, patch) {
    setResponses(prev => ({ ...prev, [qid]: { ...(prev[qid] || { photo_urls: [] }), ...patch } }));
    scheduleSave(qid);
  }

  // -------------------------------------------------------------------------
  // Photo upload — to safety-photos bucket, path camp-inspection/{insp}/{qid}/
  // -------------------------------------------------------------------------
  async function handlePhotoUpload(qid, fileList) {
    if (!inspectionId || !fileList || !fileList.length) return;
    const files = Array.from(fileList);
    const q = CAMP_QUESTIONS.find(x => x.id === qid);
    const batch = `${Date.now()}`;
    setUploading(u => ({ ...u, [qid]: true }));
    try {
      // Anything saved on this phone earlier (e.g. the start) goes first.
      if (getOfflineQueueCount() > 0 && navigator.onLine !== false) { try { await processOfflineQueue(); } catch (x) {} }
      // Photos go up with the question they belong to. No signal: they stay
      // on this phone with it and the offline queue sends them (photo list is
      // merged on the server, never replaced, so nothing already there is lost).
      const res = await submitPackage({
        formType: 'camp-inspection', label: `Camp inspection photo (${qid})`, table: 'camp_inspection_responses',
        ref: { kind: 'photos', inspectionId, qid, batch },
        groups: [{ name: 'photos', files, bucket: 'safety-photos', prefix: 'camp-inspection', folder: `${inspectionId}/${qid}`, fileBase: batch, compress: true }],
        steps: [
          { kind: 'upload', group: 'photos' },
          {
            kind: 'closeout', table: 'camp_inspection_responses', recordId: inspectionId, code: inspectionCode, codeId: inspectionId, mode: 'merge',
            updates: { inspection_id: inspectionId, question_id: q.id, section: q.section, section_order: q.sectionOrder, subsection: q.subsection, question_text: q.questionText, criticality: q.criticality, photo_urls: { $urls: 'photos' } }
          }
        ]
      });
      if (!res.ok) throw (res.error || new Error('Photo save failed'));
      if (res.queued) {
        setPendingPhotos(prev => ({ ...prev, [qid]: [...(prev[qid] || []), { batch, previews: files.map(f => URL.createObjectURL(f)) }] }));
      } else {
        const urls = (res.urls && res.urls.photos) || [];
        const existing = (responsesRef.current[qid] && responsesRef.current[qid].photo_urls) || [];
        if (urls.length) { photosCleared.current[qid] = false; updateResponse(qid, { photo_urls: [...existing, ...urls.filter(u => !existing.includes(u))] }); }
        if (urls.length < files.length) alert(`${files.length - urls.length} photo(s) could not be uploaded (refused by storage). SLP has been told.`);
      }
    } catch (e) {
      alert('Photo upload failed: ' + e.message);
    } finally {
      setUploading(u => ({ ...u, [qid]: false }));
    }
  }

  function removePhoto(qid, url) {
    const cur = (responses[qid] && responses[qid].photo_urls) || [];
    const left = cur.filter(u => u !== url);
    photosCleared.current[qid] = left.length === 0;
    updateResponse(qid, { photo_urls: left });
  }

  // -------------------------------------------------------------------------
  // Submit — finalize inspection + spawn corrective actions
  // -------------------------------------------------------------------------
  async function handleSubmit() {
    if (!goNoGo) { setErrorMsg('Please select a Go / Conditional / No-Go decision.'); return; }
    setErrorMsg('');
    setSubmitting(true);
    try {
      // Anything saved on this phone earlier (start, photos) goes first.
      if (getOfflineQueueCount() > 0 && navigator.onLine !== false) { try { await processOfflineQueue(); } catch (x) {} }
      // Stop pending autosaves; Submit sends whatever the server does not have yet.
      for (const qid of Object.keys(saveTimers.current)) {
        if (saveTimers.current[qid]) { clearTimeout(saveTimers.current[qid]); saveTimers.current[qid] = null; }
      }

      const total = CAMP_QUESTIONS.length;
      const compliancePercent = counters.answered
        ? +(((counters.compliant + counters.na) / counters.answered) * 100).toFixed(2)
        : 0;

      const steps = [];
      // 1) Answers the server does not have yet (answered with no signal, or
      //    the last autosave did not get in). Merge: photo lists never shrink.
      for (const q of CAMP_QUESTIONS) {
        const r = responses[q.id];
        if (!r || (!r.response && !r.comment && !(r.photo_urls && r.photo_urls.length))) continue;
        const row = responseRow(q.id);
        if (savedOk.current[q.id] === JSON.stringify(row)) continue;
        steps.push({ kind: 'closeout', table: 'camp_inspection_responses', recordId: inspectionId, code: inspectionCode, codeId: inspectionId, mode: 'merge', updates: row });
      }

      // 2) Finalize the inspection
      steps.push({
        kind: 'closeout', table: 'camp_inspections', recordId: inspectionId, code: inspectionCode,
        updates: {
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          submitted_by_email: meta.inspector_email || null,
          go_no_go: goNoGo,
          general_notes: meta.general_notes.trim() || null,
          overall_findings: (meta.overall_findings || '').trim() || null,
          total_questions: total,
          compliant_count: counters.compliant,
          non_compliant_count: counters.non_compliant,
          needs_action_count: counters.needs_action,
          na_count: counters.na,
          not_verified_count: counters.not_verified,
          critical_findings_count: counters.critical_findings,
          compliance_percent: compliancePercent
        }
      });

      // 3) Corrective actions for non-compliant + needs-action items. Each has
      //    a fixed id (inspection + question), so a re-send never doubles it.
      const caQs = CAMP_QUESTIONS.filter(q => {
        const r = responses[q.id];
        return r && (r.response === 'Non-Compliant' || r.response === 'Needs Action');
      });
      if (caQs.length) {
        // response_id links each CA to its answer (looked up on the server).
        steps.push({ kind: 'field_data', sid: 'resp-ids', optional: true, view: 'camp_responses', params: { inspection: inspectionId, code: inspectionCode }, capture: 'respRows' });
        for (const q of caQs) {
          const r = responses[q.id];
          steps.push({
            kind: 'insert', table: 'camp_corrective_actions',
            row: {
              inspection_id: inspectionId,
              company: meta.company,
              camp_name: meta.camp_name.trim(),
              question_id: q.id,
              section: q.section,
              subsection: q.subsection,
              finding: (r.comment && r.comment.trim()) || q.questionText,
              criticality: q.criticality,
              risk_rank: criticalityToRiskRank(q.criticality),
              due_date: defaultDueDate(q.criticality),
              status: 'open',
              response_id: { $lookup: ['respRows', 'question_id', q.id, 'id'] },
              client_submission_id: stableUuid(`camp-ca:${inspectionId}:${q.id}`)
            }
          });
        }
      }

      const res = await submitPackage({
        formType: 'camp-inspection', label: 'Camp inspection (submit)', table: 'camp_inspections',
        ref: { kind: 'submit', inspectionId }, steps
      });
      if (!res.ok) throw (res.error || new Error('Submit failed'));

      setSubmitQueued(!!res.queued);
      setStep('complete');
      window.scrollTo(0, 0);
    } catch (e) {
      setErrorMsg('Submit failed: ' + e.message);
    } finally {
      setSubmitting(false);
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div style={{ minHeight: '100vh', background: PAGE_BG, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', color: '#111' }}>
      <Header />
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '16px' }}>
        <a href="/" style={{ display: 'inline-block', marginBottom: 12, color: BRAND_RED, textDecoration: 'none', fontWeight: 600 }}>← Back to Portal</a>

        {step === 'header' && (
          <HeaderForm
            meta={meta} setMeta={setMeta}
            handleStart={handleStart} starting={starting}
            captureGps={captureGps} gettingGps={gettingGps}
            errorMsg={errorMsg}
          />
        )}

        {step === 'section' && (
          <SectionWizard
            inspectionCode={inspectionCode}
            inspectionId={inspectionId}
            meta={meta}
            setMeta={setMeta}
            currentSection={currentSection}
            setCurrentSection={setCurrentSection}
            responses={responses}
            updateResponse={updateResponse}
            handlePhotoUpload={handlePhotoUpload}
            removePhoto={removePhoto}
            uploading={uploading}
            pendingPhotos={pendingPhotos}
            startQueued={startQueued}
            saveStatus={saveStatus}
            setSaveStatus={setSaveStatus}
            sectionProgress={sectionProgress}
            counters={counters}
            onGoToReview={() => { setStep('review'); window.scrollTo(0, 0); }}
          />
        )}

        {step === 'review' && (
          <ReviewScreen
            meta={meta} setMeta={setMeta}
            counters={counters}
            responses={responses}
            goNoGo={goNoGo} setGoNoGo={setGoNoGo}
            handleSubmit={handleSubmit} submitting={submitting}
            onBack={() => { setStep('section'); setCurrentSection(12); window.scrollTo(0, 0); }}
            errorMsg={errorMsg}
          />
        )}

        {step === 'complete' && submitQueued && (
          <div role="status" data-testid="camp-submit-saved-on-phone" style={{ background: '#FEF3C7', border: '2px solid #F59E0B', color: '#92400E', borderRadius: 8, padding: 14, marginBottom: 12, fontSize: 15, fontWeight: 700 }}>
            📵 No signal: this inspection (answers, photos and corrective actions) is saved on this phone and NOT sent yet. It sends by itself when you have signal — watch the bar at the top. Do not clear browser data.
          </div>
        )}
        {step === 'complete' && (
          <CompleteScreen
            inspectionId={inspectionId}
            meta={meta}
            counters={counters}
            goNoGo={goNoGo}
          />
        )}
      </div>
      <Footer />
    </div>
  );
}

// ============================================================================
// Header (logo, title, badge)
// ============================================================================
function Header() {
  return (
    <div style={{ background: '#fff', borderBottom: `4px solid ${BRAND_RED}`, padding: '12px 16px', textAlign: 'center' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <img src="/AnthroSafe_Logo.PNG" alt="AnthroSafe" style={{ height: 48 }} onError={(e) => { e.target.style.display = 'none'; }} />
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: BRAND_DARK, lineHeight: 1.1 }}>Remote Arctic Camp Inspection</div>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>AnthroSafe™ Field Driven Safety</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Footer (trademark)
// ============================================================================
function Footer() {
  return (
    <div style={{ marginTop: 32, padding: '16px', textAlign: 'center', fontSize: 12, color: '#6B7280' }}>
      AnthroSafe™ Field Driven Safety  •  © 2026 SLP Alaska, LLC
    </div>
  );
}

// ============================================================================
// Step 1: Header / kickoff form
// ============================================================================
function HeaderForm({ meta, setMeta, handleStart, starting, captureGps, gettingGps, errorMsg }) {
  const set = (k, v) => setMeta(m => ({ ...m, [k]: v }));
  return (
    <div style={cardStyle()}>
      <SectionTitle text="Inspection Setup" />
      <p style={{ color: '#6B7280', marginTop: -4, marginBottom: 16, fontSize: 14 }}>
        Fill in inspection details, then click <strong>Start Inspection</strong> to begin the 126-item walkthrough.
      </p>

      <FieldGrid>
        <Field label="Inspector Name *">
          <input style={inputStyle()} value={meta.inspector_name} onChange={e => set('inspector_name', e.target.value)} placeholder="e.g. Trent Smith" />
        </Field>
        <Field label="Inspector Email">
          <input type="email" style={inputStyle()} value={meta.inspector_email} onChange={e => set('inspector_email', e.target.value)} placeholder="optional" />
        </Field>
        <Field label="Client / Company *">
          <select style={inputStyle()} value={meta.company} onChange={e => set('company', e.target.value)}>
            <option value="">— Select —</option>
            {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Camp Name *">
          <input style={inputStyle()} value={meta.camp_name} onChange={e => set('camp_name', e.target.value)} placeholder='e.g. "Mustang Camp"' />
        </Field>
        <Field label="Location / Area">
          <select style={inputStyle()} value={meta.location} onChange={e => set('location', e.target.value)}>
            <option value="">— Select (optional) —</option>
            {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </Field>
        <Field label="Inspection Date *">
          <input type="date" style={inputStyle()} value={meta.inspection_date} onChange={e => set('inspection_date', e.target.value)} />
        </Field>
        <Field label="Inspection Type *">
          <select style={inputStyle()} value={meta.inspection_type} onChange={e => set('inspection_type', e.target.value)}>
            {INSPECTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>
        <Field label="Weather / Conditions">
          <input style={inputStyle()} value={meta.weather_conditions} onChange={e => set('weather_conditions', e.target.value)} placeholder='e.g. "-22°F, 18mph wind, blowing snow"' />
        </Field>
      </FieldGrid>

      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button type="button" onClick={captureGps} disabled={gettingGps} style={secondaryButton()}>
          {gettingGps ? 'Capturing GPS…' : '📍 Capture GPS'}
        </button>
        {meta.gps_lat && meta.gps_lng && (
          <div style={{ fontSize: 13, color: '#374151' }}>
            Lat <strong>{meta.gps_lat}</strong>, Lng <strong>{meta.gps_lng}</strong>
          </div>
        )}
      </div>

      <div style={{ marginTop: 16 }}>
        <Field label="General Notes (optional — you can add more at the end)">
          <textarea rows={3} style={{ ...inputStyle(), resize: 'vertical' }} value={meta.general_notes} onChange={e => set('general_notes', e.target.value)} />
        </Field>
      </div>

      {errorMsg && <div style={errorBoxStyle()}>{errorMsg}</div>}

      <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
        <button type="button" onClick={handleStart} disabled={starting} style={primaryButton()}>
          {starting ? 'Starting…' : 'Start Inspection →'}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Step 2: Section wizard (one section at a time)
// ============================================================================
function SectionWizard({ inspectionId, inspectionCode, meta, setMeta, currentSection, setCurrentSection, responses, updateResponse, handlePhotoUpload, removePhoto, uploading, pendingPhotos, startQueued, saveStatus, setSaveStatus, sectionProgress, counters, onGoToReview }) {
  const section = SECTIONS.find(s => s.order === currentSection);
  const questions = CAMP_QUESTIONS.filter(q => q.sectionOrder === currentSection);
  const sp = sectionProgress[currentSection];
  const isLastSection = currentSection === SECTIONS.length;

  function next() {
    if (isLastSection) { onGoToReview(); }
    else { setCurrentSection(currentSection + 1); window.scrollTo(0, 0); }
  }
  function prev() {
    if (currentSection > 1) { setCurrentSection(currentSection - 1); window.scrollTo(0, 0); }
  }

  return (
    <>
      <ProgressBar
        currentSection={currentSection}
        sectionTotal={SECTIONS.length}
        counters={counters}
        totalQuestions={CAMP_QUESTIONS.length}
        saveStatus={saveStatus}
        meta={meta}
      />

      {startQueued && (
        <div role="status" data-testid="camp-start-saved-on-phone" style={{ background: '#FEF3C7', border: '2px solid #F59E0B', color: '#92400E', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 14, fontWeight: 700 }}>
          📵 No signal: this inspection was started on this phone and is NOT on the server yet. Keep going; answers and photos stay on this phone and send when you have signal. Do not clear browser data.
        </div>
      )}
      <div style={cardStyle()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <SectionTitle text={`Section ${currentSection} of ${SECTIONS.length}`} />
          <div style={{ fontSize: 13, color: '#6B7280' }}>
            {section.freeText
              ? (sp.answered ? 'Filled in' : 'Not yet filled in')
              : `${sp.answered} / ${sp.total} answered in this section`}
          </div>
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, color: BRAND_DARK, marginBottom: 4 }}>{section.name.replace(/^\d+\.\s*/, '')}</div>

        <SectionNav currentSection={currentSection} setCurrentSection={setCurrentSection} sectionProgress={sectionProgress} />

        {section.freeText ? (
          <OverallFindingsBlock
            inspectionCode={inspectionCode}
            inspectionId={inspectionId}
            value={meta.overall_findings || ''}
            onChange={v => setMeta(m => ({ ...m, overall_findings: v }))}
            setSaveStatus={setSaveStatus}
          />
        ) : (
          questions.map(q => (
            <QuestionCard
              key={q.id}
              q={q}
              r={responses[q.id] || {}}
              updateResponse={updateResponse}
              handlePhotoUpload={handlePhotoUpload}
              removePhoto={removePhoto}
              uploading={!!uploading[q.id]}
              pending={((pendingPhotos || {})[q.id] || []).flatMap(b => b.previews)}
            />
          ))
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
          <button type="button" onClick={prev} disabled={currentSection === 1} style={secondaryButton()}>← Previous Section</button>
          <button type="button" onClick={next} style={primaryButton()}>
            {isLastSection ? 'Review & Submit →' : 'Next Section →'}
          </button>
        </div>
      </div>
    </>
  );
}

// ============================================================================
// Overall Condition & Findings — free-text section (section 12)
// ============================================================================
function OverallFindingsBlock({ inspectionId, inspectionCode, value, onChange, setSaveStatus }) {
  const timer = useRef(null);

  function handleChange(v) {
    onChange(v);
    if (!inspectionId) return;
    if (timer.current) clearTimeout(timer.current);
    setSaveStatus('saving');
    timer.current = setTimeout(async () => {
      try {
        const { error } = await safeCloseout('camp_inspections', inspectionId, inspectionCode, { overall_findings: v || null });
        if (error) throw error;
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus(s => s === 'saved' ? 'idle' : s), 1500);
      } catch (e) {
        setSaveStatus('error');
        console.error('Save overall_findings failed:', e);
      }
    }, 700);
  }

  return (
    <div style={{ padding: 16, background: '#FAFAFA', borderRadius: 8, border: '1px solid #E5E7EB' }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Narrative Summary</div>
      <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 10, lineHeight: 1.5 }}>
        Free-text section. Capture overall camp condition, notable observations not covered by the audit questions,
        qualitative concerns, recommendations, and anything else worth noting on the final report.
      </div>
      <textarea
        rows={16}
        value={value}
        onChange={e => handleChange(e.target.value)}
        placeholder="Overall condition summary, key strengths, areas of concern, recommendations…"
        style={{ width: '100%', padding: 10, fontSize: 14, borderRadius: 4, border: '1px solid #D1D5DB', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit', minHeight: 240, lineHeight: 1.5 }}
      />
      <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4, textAlign: 'right' }}>
        {value.length} character{value.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}

// ============================================================================
// Progress + autosave indicator
// ============================================================================
function ProgressBar({ currentSection, sectionTotal, counters, totalQuestions, saveStatus, meta }) {
  const pct = totalQuestions ? Math.round((counters.answered / totalQuestions) * 100) : 0;
  const saveText = {
    idle:    '',
    saving:  '💾 Saving…',
    saved:   '✓ Saved',
    error:   '⚠ Save error — check connection'
  }[saveStatus] || '';
  const saveColor = saveStatus === 'error' ? '#B91C1C' : saveStatus === 'saved' ? '#065F46' : '#6B7280';

  return (
    <div style={{ ...cardStyle(), padding: 12, marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, fontSize: 13 }}>
        <div><strong>{meta.company}</strong> · <strong>{meta.camp_name}</strong></div>
        <div style={{ color: saveColor }}>{saveText}</div>
      </div>
      <div style={{ marginTop: 8, height: 8, background: '#E5E7EB', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: BRAND_RED, transition: 'width 0.2s' }} />
      </div>
      <div style={{ marginTop: 6, fontSize: 12, color: '#6B7280', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
        <span>Section {currentSection} / {sectionTotal}</span>
        <span>{counters.answered} / {totalQuestions} answered ({pct}%)</span>
        <span style={{ color: counters.critical_findings > 0 ? '#B91C1C' : '#6B7280' }}>
          Critical findings: <strong>{counters.critical_findings}</strong>
        </span>
      </div>
    </div>
  );
}

function SectionNav({ currentSection, setCurrentSection, sectionProgress }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, margin: '8px 0 16px' }}>
      {SECTIONS.map(s => {
        const sp = sectionProgress[s.order];
        const done = sp.answered === sp.total;
        const partial = sp.answered > 0 && sp.answered < sp.total;
        const isCur = s.order === currentSection;
        return (
          <button key={s.order} type="button" onClick={() => { setCurrentSection(s.order); window.scrollTo(0, 0); }}
            title={s.name}
            style={{
              padding: '4px 8px', fontSize: 12, borderRadius: 4, cursor: 'pointer',
              border: `2px solid ${isCur ? BRAND_RED : (done ? '#10B981' : '#D1D5DB')}`,
              background: isCur ? BRAND_RED : (done ? '#D1FAE5' : (partial ? '#FEF3C7' : '#fff')),
              color: isCur ? '#fff' : '#111', fontWeight: isCur ? 700 : 500
            }}>
            {s.order}
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// Single question card
// ============================================================================
function QuestionCard({ q, r, updateResponse, handlePhotoUpload, removePhoto, uploading, pending = [] }) {
  const critColors = CRITICALITY_COLORS[q.criticality] || CRITICALITY_COLORS.Standard;
  const respColors = r.response ? RESPONSE_COLORS[r.response] : null;
  const photoUrls = r.photo_urls || [];
  const requiresPhoto = r.response === 'Non-Compliant' || r.response === 'Needs Action';

  return (
    <div style={{
      border: `1px solid ${respColors ? respColors.border : '#E5E7EB'}`,
      background: respColors ? respColors.bg : '#fff',
      borderRadius: 8, padding: 12, marginBottom: 10
    }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 6 }}>
        <span style={{ background: '#111', color: '#fff', fontSize: 11, padding: '2px 6px', borderRadius: 3, fontWeight: 700 }}>{q.id}</span>
        <span style={{
          background: critColors.bg, color: critColors.text, border: `1px solid ${critColors.border}`,
          fontSize: 11, padding: '2px 6px', borderRadius: 3, fontWeight: 700, textTransform: 'uppercase'
        }}>
          {q.criticality}
        </span>
        <span style={{ fontSize: 12, color: '#6B7280' }}>{q.subsection}</span>
      </div>

      <div style={{ fontSize: 14, color: '#111', marginBottom: 8, lineHeight: 1.4 }}>{q.questionText}</div>

      {q.referenceStandard && (
        <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 8 }}>
          <strong>Ref:</strong> {q.referenceStandard}{q.evidenceRequired ? ` · Evidence: ${q.evidenceRequired}` : ''}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        {RESPONSE_OPTIONS.map(opt => {
          const active = r.response === opt;
          const c = RESPONSE_COLORS[opt];
          return (
            <button key={opt} type="button" onClick={() => updateResponse(q.id, { response: opt })}
              style={{
                padding: '6px 12px', fontSize: 13, borderRadius: 4, cursor: 'pointer',
                border: `2px solid ${active ? c.border : '#D1D5DB'}`,
                background: active ? c.bg : '#fff',
                color: active ? c.text : '#374151',
                fontWeight: active ? 700 : 500
              }}>
              {opt}
            </button>
          );
        })}
      </div>

      <textarea
        rows={2}
        placeholder={requiresPhoto ? 'Describe the finding (required for Non-Compliant / Needs Action)…' : 'Comment (optional)…'}
        value={r.comment || ''}
        onChange={e => updateResponse(q.id, { comment: e.target.value })}
        style={{ ...inputStyle(), resize: 'vertical', marginBottom: 8 }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <label style={{ ...secondaryButton(), display: 'inline-block', cursor: 'pointer' }}>
          📷 Add Photo
          <input type="file" accept="image/*" multiple style={{ display: 'none' }}
            onChange={e => { handlePhotoUpload(q.id, e.target.files); e.target.value = ''; }} />
        </label>
        {uploading && <span style={{ fontSize: 12, color: '#6B7280' }}>Uploading…</span>}
        {requiresPhoto && photoUrls.length === 0 && pending.length === 0 && (
          <span style={{ fontSize: 11, color: '#B45309', fontWeight: 600 }}>📌 Photo recommended for this response</span>
        )}
      </div>

      {pending.length > 0 && (
        <div data-testid="camp-photos-on-phone" style={{ marginTop: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#92400E' }}>📵 {pending.length} photo(s) saved on this phone — NOT sent yet. They send by themselves when you have signal.</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
            {pending.map((url, i) => (
              <div key={i} style={{ width: 80, height: 80, borderRadius: 4, overflow: 'hidden', border: '2px dashed #F59E0B' }}>
                <img src={url} alt={`photo on phone ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {photoUrls.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {photoUrls.map((url, i) => (
            <div key={i} style={{ position: 'relative', width: 80, height: 80, borderRadius: 4, overflow: 'hidden', border: '1px solid #D1D5DB' }}>
              <img src={url} alt={`photo ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button type="button" onClick={() => removePhoto(q.id, url)}
                style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', fontSize: 12, lineHeight: 1 }}
                title="Remove photo">×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Step 3: Review & submit
// ============================================================================
function ReviewScreen({ meta, setMeta, counters, responses, goNoGo, setGoNoGo, handleSubmit, submitting, onBack, errorMsg }) {
  const findings = useMemo(() => {
    return CAMP_QUESTIONS
      .filter(q => {
        const r = responses[q.id];
        return r && (r.response === 'Non-Compliant' || r.response === 'Needs Action');
      })
      .map(q => ({
        q, r: responses[q.id]
      }));
  }, [responses]);

  const criticals = findings.filter(f => f.q.criticality === 'Critical');

  return (
    <div style={cardStyle()}>
      <SectionTitle text="Review & Submit" />

      {/* Counter summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 8, margin: '12px 0' }}>
        <Stat label="Compliant" value={counters.compliant} color="#065F46" bg="#D1FAE5" />
        <Stat label="Non-Compliant" value={counters.non_compliant} color="#991B1B" bg="#FEE2E2" />
        <Stat label="Needs Action" value={counters.needs_action} color="#92400E" bg="#FEF3C7" />
        <Stat label="N/A" value={counters.na} color="#374151" bg="#F3F4F6" />
        <Stat label="Not Verified" value={counters.not_verified} color="#2d5a87" bg="#E0E7FF" />
        <Stat label="Unanswered" value={CAMP_QUESTIONS.length - counters.answered} color="#6B7280" bg="#fff" />
      </div>

      {criticals.length > 0 && (
        <div style={{ background: '#FEE2E2', border: '1px solid #EF4444', borderRadius: 6, padding: 12, marginBottom: 12 }}>
          <div style={{ fontWeight: 700, color: '#991B1B', marginBottom: 6 }}>⚠ {criticals.length} CRITICAL FINDING{criticals.length > 1 ? 'S' : ''}</div>
          {criticals.map(({ q, r }) => (
            <div key={q.id} style={{ fontSize: 13, marginBottom: 4 }}>
              <strong>{q.id}</strong> · {q.subsection} — {r.response}
              {r.comment ? <div style={{ marginLeft: 12, color: '#374151', fontSize: 12 }}>{r.comment}</div> : null}
            </div>
          ))}
        </div>
      )}

      {findings.length > 0 && (
        <details style={{ marginBottom: 12 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 600, color: BRAND_DARK }}>
            All deficiencies ({findings.length}) — will auto-create corrective actions on submit
          </summary>
          <div style={{ marginTop: 8 }}>
            {findings.map(({ q, r }) => (
              <div key={q.id} style={{ borderBottom: '1px solid #E5E7EB', padding: '6px 0', fontSize: 13 }}>
                <strong>{q.id}</strong> ({q.criticality}) · {q.subsection} — {r.response}
                {r.comment ? <div style={{ color: '#6B7280', fontSize: 12 }}>{r.comment}</div> : null}
              </div>
            ))}
          </div>
        </details>
      )}

      <Field label="Final General Notes (optional)">
        <textarea rows={3} style={{ ...inputStyle(), resize: 'vertical' }}
          value={meta.general_notes} onChange={e => setMeta(m => ({ ...m, general_notes: e.target.value }))} />
      </Field>

      <div style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Go / No-Go Decision *</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { v: 'go', label: '✅ GO', bg: '#D1FAE5', border: '#10B981', color: '#065F46' },
            { v: 'conditional', label: '⚠ CONDITIONAL', bg: '#FEF3C7', border: '#F59E0B', color: '#92400E' },
            { v: 'no-go', label: '⛔ NO-GO', bg: '#FEE2E2', border: '#EF4444', color: '#991B1B' }
          ].map(opt => {
            const active = goNoGo === opt.v;
            return (
              <button key={opt.v} type="button" onClick={() => setGoNoGo(opt.v)}
                style={{
                  padding: '10px 16px', fontSize: 15, fontWeight: 700, borderRadius: 6, cursor: 'pointer',
                  border: `2px solid ${active ? opt.border : '#D1D5DB'}`,
                  background: active ? opt.bg : '#fff', color: active ? opt.color : '#374151'
                }}>
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {errorMsg && <div style={errorBoxStyle()}>{errorMsg}</div>}

      <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <button type="button" onClick={onBack} style={secondaryButton()}>← Back to Sections</button>
        <button type="button" onClick={handleSubmit} disabled={submitting} style={primaryButton()}>
          {submitting ? 'Submitting…' : `Submit Inspection${findings.length ? ` (+${findings.length} CAs)` : ''}`}
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value, color, bg }) {
  return (
    <div style={{ background: bg, padding: 10, borderRadius: 6, textAlign: 'center', border: '1px solid #E5E7EB' }}>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 11, color: '#374151', marginTop: 2 }}>{label}</div>
    </div>
  );
}

// ============================================================================
// Step 4: Completion screen
// ============================================================================
function CompleteScreen({ inspectionId, meta, counters, goNoGo }) {
  const decision = goNoGo === 'go' ? { label: 'GO', color: '#065F46', bg: '#D1FAE5' }
                 : goNoGo === 'conditional' ? { label: 'CONDITIONAL', color: '#92400E', bg: '#FEF3C7' }
                 : { label: 'NO-GO', color: '#991B1B', bg: '#FEE2E2' };
  return (
    <div style={cardStyle()}>
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <div style={{ fontSize: 48 }}>✅</div>
        <div style={{ fontSize: 24, fontWeight: 800, color: BRAND_DARK, marginTop: 8 }}>Inspection Submitted</div>
        <div style={{ marginTop: 4, color: '#6B7280' }}>{meta.company} · {meta.camp_name}</div>

        <div style={{ display: 'inline-block', padding: '8px 16px', borderRadius: 6, background: decision.bg, color: decision.color, fontWeight: 800, marginTop: 16, fontSize: 18 }}>
          {decision.label}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 8, margin: '20px auto', maxWidth: 600 }}>
          <Stat label="Compliant" value={counters.compliant} color="#065F46" bg="#D1FAE5" />
          <Stat label="Non-Compliant" value={counters.non_compliant} color="#991B1B" bg="#FEE2E2" />
          <Stat label="Needs Action" value={counters.needs_action} color="#92400E" bg="#FEF3C7" />
          <Stat label="Critical" value={counters.critical_findings} color="#991B1B" bg="#FEE2E2" />
        </div>

        {(counters.non_compliant + counters.needs_action) > 0 && (
          <div style={{ marginTop: 8, fontSize: 14, color: '#374151' }}>
            {counters.non_compliant + counters.needs_action} corrective actions created and ready for assignment.
          </div>
        )}

        <div style={{ marginTop: 24, fontSize: 12, color: '#6B7280' }}>
          Inspection ID: <code>{inspectionId}</code>
        </div>

        <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/" style={{ ...primaryButton(), textDecoration: 'none', display: 'inline-block' }}>← Back to Portal</a>
          <a href="/camp-inspection" style={{ ...secondaryButton(), textDecoration: 'none', display: 'inline-block' }} onClick={() => window.location.reload()}>+ Start Another Inspection</a>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Layout helpers
// ============================================================================
function cardStyle() {
  return {
    background: CARD_BG,
    borderRadius: 8,
    padding: 16,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    border: '1px solid #E5E7EB'
  };
}
function inputStyle() {
  return {
    width: '100%', padding: '8px 10px', fontSize: 14, borderRadius: 4,
    border: '1px solid #D1D5DB', boxSizing: 'border-box', background: '#fff', color: '#111'
  };
}
function primaryButton() {
  return {
    padding: '10px 18px', background: BRAND_RED, color: '#fff', fontSize: 15, fontWeight: 700,
    border: 'none', borderRadius: 6, cursor: 'pointer'
  };
}
function secondaryButton() {
  return {
    padding: '8px 14px', background: '#fff', color: '#374151', fontSize: 14, fontWeight: 600,
    border: '1px solid #D1D5DB', borderRadius: 6, cursor: 'pointer'
  };
}
function errorBoxStyle() {
  return {
    marginTop: 12, padding: '10px 12px', background: '#FEE2E2', color: '#991B1B',
    border: '1px solid #EF4444', borderRadius: 6, fontSize: 14
  };
}
function SectionTitle({ text }) {
  return <div style={{ fontSize: 18, fontWeight: 700, color: BRAND_DARK, marginBottom: 8 }}>{text}</div>;
}
function Field({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  );
}
function FieldGrid({ children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12 }}>{children}</div>;
}

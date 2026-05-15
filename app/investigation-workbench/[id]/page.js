'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

// =====================================================================
// AnthroSafe Investigation Workbench v2
// 4-stage stepper - structured RCA - hierarchy of controls - server PDF
// =====================================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const STAGES = [
  { id: 1, title: 'Setup & Evidence',  description: 'Confirm scope, gather photos and witnesses' },
  { id: 2, title: 'What Happened',     description: 'Build the timeline of events' },
  { id: 3, title: 'Why It Happened',   description: 'Identify root causes and contributing factors' },
  { id: 4, title: 'Close It Out',      description: 'Define corrective actions and approve' },
];

const RCA_CATEGORIES = [
  { key: 'equipment',     label: 'Equipment',           prompt: 'Was equipment functioning properly? Maintenance current? Right tool for the job?' },
  { key: 'environment',   label: 'Environment',         prompt: 'Weather, lighting, noise, temperature, space, terrain factors?' },
  { key: 'materials',     label: 'Materials',           prompt: 'Were correct materials available, in good condition, and used properly?' },
  { key: 'methods',       label: 'Methods',             prompt: 'Were procedures correct? Did the work plan match the actual task?' },
  { key: 'people',        label: 'People',              prompt: 'Training, fatigue, experience, fitness for duty, situational awareness?' },
  { key: 'management',    label: 'Management',          prompt: 'Was supervision adequate? Were resources and time provided?' },
  { key: 'communication', label: 'Communication',       prompt: 'Were expectations and hazards clearly communicated and understood?' },
  { key: 'training',      label: 'Training',            prompt: 'Was training current and adequate for the task and conditions?' },
  { key: 'procedures',    label: 'Procedures',          prompt: 'Did written procedures exist? Were they current and followed?' },
  { key: 'culture',       label: 'Culture',             prompt: 'Was Stop Work used? Pressure to shortcut? Was reporting encouraged?' },
];

const HIERARCHY_OF_CONTROLS = [
  { level: 1, name: 'Elimination',    desc: 'Remove the hazard entirely',     tone: 'strong' },
  { level: 2, name: 'Substitution',   desc: 'Replace with something safer',   tone: 'strong' },
  { level: 3, name: 'Engineering',    desc: 'Isolate people from the hazard', tone: 'good' },
  { level: 4, name: 'Administrative', desc: 'Change how people work',         tone: 'weak' },
  { level: 5, name: 'PPE',            desc: 'Protect the worker (last resort)', tone: 'weakest' },
];

const STATUS_FLOW = [
  'Submitted','Triage','First Draft','Asset Review','Final Review','Pending Approval','Approved','Closed'
];

// =====================================================================
// Theme
// =====================================================================
const C = {
  navy:    '#1e3a5f',
  steel:   '#2d5a87',
  bg:      '#f3f4f6',
  card:    '#ffffff',
  text:    '#111827',
  muted:   '#6b7280',
  border:  '#d1d5db',
  borderL: '#e5e7eb',
  success: '#16a34a',
  warning: '#f59e0b',
  danger:  '#dc2626',
  amber:   '#fef3c7',
  blueL:   '#dbeafe',
};

// =====================================================================
// Main component
// =====================================================================
export default function InvestigationWorkbench() {
  const params = useParams();
  const router = useRouter();
  const incidentId = params.id;

  const [authed, setAuthed] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [incident, setIncident] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [witnesses, setWitnesses] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [rcaFactors, setRcaFactors] = useState({}); // {category: {is_factor, description}}
  const [fiveWhy, setFiveWhy] = useState(null);
  const [localReview, setLocalReview] = useState(null);
  const [legacyRcaText, setLegacyRcaText] = useState('');
  const [correctiveActions, setCorrectiveActions] = useState([]);
  const [lessons, setLessons] = useState([]);

  const [currentStage, setCurrentStage] = useState(1);
  const [saving, setSaving] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);

  // -------- Auth --------
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('slp_inv_email') : '';
    if (saved && saved.endsWith('@slpalaska.com')) {
      setUserEmail(saved);
      setAuthed(true);
    } else {
      setLoading(false);
    }
  }, []);

  function handleLogin(e) {
    e.preventDefault();
    const email = e.target.email.value.trim().toLowerCase();
    if (!email.endsWith('@slpalaska.com')) {
      alert('Access restricted to @slpalaska.com accounts.');
      return;
    }
    localStorage.setItem('slp_inv_email', email);
    setUserEmail(email);
    setAuthed(true);
  }

  // -------- Data load --------
  useEffect(() => {
    if (!authed || !incidentId) return;
    loadAll();
  }, [authed, incidentId]);

  async function loadAll() {
    setLoading(true);
    setError('');
    try {
      // Phase 1: load incident first to get both ID forms
      const incR = await supabase.from('incidents').select('*').eq('id', incidentId).single();
      if (incR.error) throw incR.error;
      setIncident(incR.data);

      const fkText = incR.data.incident_id;  // INC-2026-0051 (used by legacy tables)
      const fkUuid = incR.data.id;            // UUID (used by rca_factors)

      // Phase 2: parallel load related tables with correct foreign-key form per table
      const [tlR, wR, evR, facR, fwR, lrR, caR, lessR, legR] = await Promise.all([
        supabase.from('timeline_events').select('*').eq('incident_id', fkText).order('event_date').order('event_time'),
        supabase.from('witness_statements').select('*').eq('incident_id', fkText).order('created_at'),
        supabase.from('investigation_evidence').select('*').eq('incident_id', fkText).order('uploaded_at'),
        supabase.from('rca_factors').select('*').eq('incident_id', fkUuid),
        supabase.from('five_why_analyses').select('*').eq('incident_id', fkText).order('updated_at', { ascending: false }).limit(1),
        supabase.from('local_reviews').select('*').eq('incident_id', fkText).order('updated_at', { ascending: false }).limit(1),
        supabase.from('investigation_corrective_actions').select('*').eq('incident_id', fkText).order('due_date'),
        supabase.from('lessons_learned').select('*').eq('incident_id', fkUuid).order('created_at'),
        supabase.from('rca_analyses').select('*').eq('incident_id', fkText).maybeSingle(),
      ]);

      const warn = (name, r) => { if (r.error) console.warn(`[Workbench] ${name}: ${r.error.message}`); };
      warn('timeline_events', tlR); warn('witness_statements', wR); warn('investigation_evidence', evR);
      warn('rca_factors', facR); warn('five_why_analyses', fwR); warn('local_reviews', lrR);
      warn('investigation_corrective_actions', caR); warn('lessons_learned', lessR); warn('rca_analyses', legR);

      setTimeline(tlR.data || []);
      setWitnesses(wR.data || []);
      setEvidence(evR.data || []);

      const facMap = {};
      RCA_CATEGORIES.forEach(c => { facMap[c.key] = { is_factor: false, description: '' }; });
      (facR.data || []).forEach(f => { facMap[f.category] = { is_factor: !!f.is_factor, description: f.description || '' }; });
      setRcaFactors(facMap);

      // five_why and local_review return arrays (limit 1); take first if exists
      const fw = Array.isArray(fwR.data) ? fwR.data[0] : fwR.data;
      const lr = Array.isArray(lrR.data) ? lrR.data[0] : lrR.data;
      setFiveWhy(fw || { why1:'', why2:'', why3:'', why4:'', why5:'', root_cause:'' });
      setLocalReview(lr || {});
      setLegacyRcaText(legR.data?.findings || legR.data?.rca_findings || '');
      setCorrectiveActions(caR.data || []);
      setLessons(lessR.data || []);

      // Resume at first incomplete stage
      const d = incR.data;
      if (!d.stage_1_complete) setCurrentStage(1);
      else if (!d.stage_2_complete) setCurrentStage(2);
      else if (!d.stage_3_complete) setCurrentStage(3);
      else setCurrentStage(4);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load investigation.');
    } finally {
      setLoading(false);
    }
  }

  // -------- Autosave for the incident record --------
  const autosaveTimer = useRef(null);
  function queueIncidentSave(patch) {
    setIncident(prev => ({ ...prev, ...patch }));
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(async () => {
      setSaving(true);
      const { error } = await supabase.from('incidents').update(patch).eq('id', incidentId);
      if (error) console.error('Autosave failed:', error);
      else setLastSavedAt(new Date());
      setSaving(false);
    }, 1200);
  }

  async function markStageComplete(stage) {
    const patch = { [`stage_${stage}_complete`]: true };
    setIncident(prev => ({ ...prev, ...patch }));
    await supabase.from('incidents').update(patch).eq('id', incidentId);
    if (stage < 4) setCurrentStage(stage + 1);
  }

  // -------- PDF generation --------
  async function handleGeneratePDF() {
    // Opens the new HTML report page in a new tab with auto-print enabled.
    // The new page handles photo compression client-side and uses window.print()
    // to produce a beautifully-formatted PDF.
    window.open(`/investigation-report/${incidentId}?print=1`, '_blank', 'noopener');
  }

  // ==========================================================
  // Render
  // ==========================================================
  if (!authed) return <LoginGate onSubmit={handleLogin} />;
  if (loading) return <FullScreenMessage text="Loading investigation..." />;
  if (error)   return <FullScreenMessage text={error} tone="danger" />;
  if (!incident) return <FullScreenMessage text="Investigation not found." tone="danger" />;

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'system-ui, -apple-system, sans-serif', color: C.text }}>
      <TopBar
        incident={incident}
        saving={saving}
        lastSavedAt={lastSavedAt}
        pdfGenerating={pdfGenerating}
        onPDF={handleGeneratePDF}
        onBack={() => router.push('/investigation-dashboard')}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 24, maxWidth: 1400, margin: '0 auto', padding: 24 }}>
        <Stepper
          stages={STAGES}
          current={currentStage}
          incident={incident}
          onJump={setCurrentStage}
        />

        <main>
          {currentStage === 1 && (
            <Stage1
              incident={incident}
              evidence={evidence}
              witnesses={witnesses}
              userEmail={userEmail}
              incidentId={incidentId}
              fkText={incident.incident_id}
              onIncidentChange={queueIncidentSave}
              onEvidenceReload={async () => {
                const { data } = await supabase.from('investigation_evidence').select('*').eq('incident_id', incident.incident_id).order('uploaded_at');
                setEvidence(data || []);
              }}
              onWitnessesReload={async () => {
                const { data } = await supabase.from('witness_statements').select('*').eq('incident_id', incident.incident_id).order('created_at');
                setWitnesses(data || []);
              }}
              onComplete={() => markStageComplete(1)}
            />
          )}

          {currentStage === 2 && (
            <Stage2
              timeline={timeline}
              fkText={incident.incident_id}
              userEmail={userEmail}
              onReload={async () => {
                const { data } = await supabase.from('timeline_events').select('*').eq('incident_id', incident.incident_id).order('event_date').order('event_time');
                setTimeline(data || []);
              }}
              onComplete={() => markStageComplete(2)}
            />
          )}

          {currentStage === 3 && (
            <Stage3
              incident={incident}
              rcaFactors={rcaFactors}
              setRcaFactors={setRcaFactors}
              fiveWhy={fiveWhy}
              setFiveWhy={setFiveWhy}
              localReview={localReview}
              setLocalReview={setLocalReview}
              legacyRcaText={legacyRcaText}
              incidentId={incidentId}
              fkText={incident.incident_id}
              userEmail={userEmail}
              onIncidentChange={queueIncidentSave}
              onComplete={() => markStageComplete(3)}
            />
          )}

          {currentStage === 4 && (
            <Stage4
              incident={incident}
              correctiveActions={correctiveActions}
              lessons={lessons}
              fkText={incident.incident_id}
              fkUuid={incident.id}
              userEmail={userEmail}
              pdfGenerating={pdfGenerating}
              onGeneratePDF={handleGeneratePDF}
              onIncidentChange={queueIncidentSave}
              onActionsReload={async () => {
                const { data } = await supabase.from('investigation_corrective_actions').select('*').eq('incident_id', incident.incident_id).order('due_date');
                setCorrectiveActions(data || []);
              }}
              onLessonsReload={async () => {
                const { data } = await supabase.from('lessons_learned').select('*').eq('incident_id', incident.id).order('created_at');
                setLessons(data || []);
              }}
              onComplete={() => markStageComplete(4)}
            />
          )}
        </main>
      </div>
    </div>
  );
}

// =====================================================================
// Top bar
// =====================================================================
function TopBar({ incident, saving, lastSavedAt, pdfGenerating, onPDF, onBack }) {
  return (
    <div style={{ background: `linear-gradient(135deg, ${C.navy}, ${C.steel})`, color: 'white', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button onClick={onBack} style={btnGhost}>← Dashboard</button>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{incident.incident_id || 'Investigation'}</div>
          <div style={{ fontSize: 12, opacity: 0.85 }}>{incident.investigation_type} - {incident.location} - {incident.status}</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 12, opacity: 0.85 }}>
          {saving ? 'Saving...' : lastSavedAt ? `Saved ${lastSavedAt.toLocaleTimeString()}` : ''}
        </span>
        <button onClick={onPDF} disabled={pdfGenerating} style={{ ...btnPrimary, opacity: pdfGenerating ? 0.6 : 1 }}>
          {pdfGenerating ? 'Generating PDF...' : 'Download PDF'}
        </button>
      </div>
    </div>
  );
}

// =====================================================================
// Stepper sidebar
// =====================================================================
function Stepper({ stages, current, incident, onJump }) {
  return (
    <aside style={{ position: 'sticky', top: 24, alignSelf: 'flex-start' }}>
      <div style={{ background: C.card, border: `1px solid ${C.borderL}`, borderRadius: 12, padding: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
          Investigation Path
        </div>
        {stages.map(stage => {
          const isCurrent = stage.id === current;
          const isComplete = incident[`stage_${stage.id}_complete`];
          const dotColor = isComplete ? C.success : isCurrent ? C.steel : C.border;
          return (
            <button
              key={stage.id}
              onClick={() => onJump(stage.id)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%',
                padding: '12px 8px', border: 'none', background: isCurrent ? C.blueL : 'transparent',
                borderRadius: 8, cursor: 'pointer', textAlign: 'left', marginBottom: 4,
              }}
            >
              <div style={{
                minWidth: 28, height: 28, borderRadius: '50%', background: dotColor,
                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 13,
              }}>
                {isComplete ? '✓' : stage.id}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: isCurrent ? C.navy : C.text }}>{stage.title}</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{stage.description}</div>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

// =====================================================================
// STAGE 1 - Setup & Evidence
// =====================================================================
function Stage1({ incident, evidence, witnesses, userEmail, incidentId, fkText, onIncidentChange, onEvidenceReload, onWitnessesReload, onComplete }) {
  return (
    <div>
      <StageHeader stage={1} title="Setup & Evidence" subtitle="Confirm the scope of this investigation, then gather photos and witness statements." />

      <Card title="Incident Summary" toneAccent={C.steel}>
        <div style={{ fontSize: 12, color: C.steel, marginBottom: 14, padding: 10, background: '#eff6ff', borderRadius: 6, borderLeft: `3px solid ${C.steel}` }}>
          Edit any field below to correct or clarify the original field report. Changes save automatically.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="Incident ID"        value={incident.incident_id}     onChange={v => onIncidentChange({ incident_id: v })} />
          <Field label="Status"             value={incident.status}          onChange={v => onIncidentChange({ status: v })} />
          <Field label="Date"   type="date" value={incident.incident_date}   onChange={v => onIncidentChange({ incident_date: v })} />
          <Field label="Time"   type="time" value={incident.incident_time}   onChange={v => onIncidentChange({ incident_time: v })} />
          <Field label="Location"           value={incident.location_name || incident.location}             onChange={v => onIncidentChange({ location_name: v })} />
          <Field label="Company"            value={incident.company_name || incident.company}               onChange={v => onIncidentChange({ company_name: v })} />
          <Field label="Reported By"        value={incident.reported_by_name || incident.reported_by || incident.submitted_by} onChange={v => onIncidentChange({ reported_by_name: v })} />
          <Field label="Reporter Email"     value={incident.reported_by_email}                              onChange={v => onIncidentChange({ reported_by_email: v })} />
          <Field label="Reporter Phone"     value={incident.reported_by_phone}                              onChange={v => onIncidentChange({ reported_by_phone: v })} />
          <Field label="Reporter Company"   value={incident.reported_by_company}                            onChange={v => onIncidentChange({ reported_by_company: v })} />
          <Field label="Safety Severity"    value={incident.safety_severity || incident.severity_safety}    onChange={v => onIncidentChange({ safety_severity: v })} />
          <Field label="Investigation Type" value={incident.investigation_type}                             onChange={v => onIncidentChange({ investigation_type: v })} />
        </div>
        {incident.safety_severity_description && (
          <div style={{ marginTop: 10, fontSize: 12, color: C.muted, fontStyle: 'italic' }}>
            Severity meaning: {incident.safety_severity_description}
          </div>
        )}
        <div style={{ marginTop: 14 }}>
          <Label>Brief Description</Label>
          <textarea
            value={incident.brief_description || incident.description || ''}
            onChange={e => onIncidentChange({ brief_description: e.target.value })}
            rows={3}
            style={inputStyle}
            placeholder="One- or two-sentence summary of what happened..."
          />
        </div>
        <div style={{ marginTop: 14 }}>
          <Label>Detailed Description</Label>
          <textarea
            value={incident.detailed_description || ''}
            onChange={e => onIncidentChange({ detailed_description: e.target.value })}
            rows={5}
            style={inputStyle}
            placeholder="Full account including conditions, sequence, and immediate response..."
          />
        </div>
      </Card>

      <AdditionalFields incident={incident} onChange={onIncidentChange} />

      <Card title={`Evidence (${evidence.length + (Array.isArray(incident.photo_urls) ? incident.photo_urls.length : 0)})`}>
        <EvidenceUploader
          incidentId={incidentId}
          fkText={fkText}
          userEmail={userEmail}
          onUploaded={onEvidenceReload}
        />
        <EvidenceList
          items={evidence}
          initialPhotos={Array.isArray(incident.photo_urls) ? incident.photo_urls : []}
          onChange={onEvidenceReload}
        />
      </Card>

      <Card title={`Witnesses (${witnesses.length})`}>
        <WitnessAdd fkText={fkText} userEmail={userEmail} onAdded={onWitnessesReload} />
        <WitnessList items={witnesses} onChange={onWitnessesReload} />
      </Card>

      <StageFooter
        complete={incident.stage_1_complete}
        onComplete={onComplete}
        nextLabel="Complete & Continue to Timeline"
      />
    </div>
  );
}

// =====================================================================
// STAGE 2 - Timeline
// =====================================================================
function Stage2({ timeline, fkText, userEmail, onReload, onComplete }) {
  const [form, setForm] = useState({ event_date: '', event_time: '', description: '', is_critical: false });
  const [busy, setBusy] = useState(false);

  async function addEvent() {
    if (!form.event_date || !form.description) return alert('Date and description are required.');
    setBusy(true);
    const { error } = await supabase.from('timeline_events').insert({
      incident_id: fkText,
      event_date: form.event_date,
      event_time: form.event_time,
      description: form.description,
      event_description: form.description,
      is_critical: form.is_critical,
      critical: form.is_critical,
      created_by_email: userEmail,
    });
    setBusy(false);
    if (error) return alert('Failed to add event: ' + error.message);
    setForm({ event_date: '', event_time: '', description: '', is_critical: false });
    onReload();
  }

  async function removeEvent(id) {
    if (!confirm('Remove this event?')) return;
    await supabase.from('timeline_events').delete().eq('id', id);
    onReload();
  }

  async function toggleCritical(ev) {
    const next = !(ev.is_critical || ev.critical);
    await supabase.from('timeline_events').update({
      is_critical: next,
      critical: next,
    }).eq('id', ev.id);
    onReload();
  }

  return (
    <div>
      <StageHeader stage={2} title="What Happened" subtitle="Build a chronological timeline. Flag the critical event(s) where the harm or near-harm occurred." />

      <Card title="Add Timeline Event">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field type="date" label="Date" value={form.event_date} onChange={v => setForm({ ...form, event_date: v })} />
          <Field type="time" label="Time" value={form.event_time} onChange={v => setForm({ ...form, event_time: v })} />
        </div>
        <div style={{ marginTop: 12 }}>
          <Label>What occurred?</Label>
          <textarea
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            rows={3}
            style={inputStyle}
            placeholder="Describe this event clearly and factually..."
          />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, cursor: 'pointer' }}>
          <input type="checkbox" checked={form.is_critical} onChange={e => setForm({ ...form, is_critical: e.target.checked })} />
          <span style={{ fontSize: 13 }}>This is the <strong style={{ color: C.danger }}>critical event</strong> (where the harm/near-harm happened)</span>
        </label>
        <button onClick={addEvent} disabled={busy} style={{ ...btnPrimaryDark, marginTop: 14 }}>
          {busy ? 'Adding...' : '+ Add Event'}
        </button>
      </Card>

      <Card title={`Timeline (${timeline.length} events)`}>
        {timeline.length === 0 ? (
          <Empty text="No events yet. Add the first one above." />
        ) : (
          <div style={{ position: 'relative', paddingLeft: 24 }}>
            <div style={{ position: 'absolute', left: 8, top: 8, bottom: 8, width: 2, background: C.borderL }} />
            {timeline.map((ev, i) => {
              const isCritical = ev.is_critical || ev.critical;
              const description = ev.description || ev.event_description || '';
              return (
              <div key={ev.id} style={{ position: 'relative', marginBottom: 18 }}>
                <div style={{
                  position: 'absolute', left: -22, top: 6, width: 14, height: 14, borderRadius: '50%',
                  background: isCritical ? C.danger : C.steel, border: `3px solid ${C.card}`,
                }} />
                <div style={{ background: isCritical ? C.amber : '#f9fafb', border: `1px solid ${isCritical ? C.warning : C.borderL}`, borderRadius: 8, padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: isCritical ? C.danger : C.navy }}>
                        {formatDate(ev.event_date)} {ev.event_time ? `at ${ev.event_time}` : ''}
                        {isCritical && <span style={{ marginLeft: 8, fontSize: 10, background: C.danger, color: 'white', padding: '2px 6px', borderRadius: 3 }}>CRITICAL</span>}
                      </div>
                      <div style={{ fontSize: 13, color: C.text, marginTop: 6, whiteSpace: 'pre-wrap' }}>{description}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => toggleCritical(ev)} style={btnSmall} title="Toggle critical">
                        {isCritical ? 'Unflag' : 'Flag'}
                      </button>
                      <button onClick={() => removeEvent(ev.id)} style={{ ...btnSmall, color: C.danger }}>Delete</button>
                    </div>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </Card>

      <StageFooter complete={false} onComplete={onComplete} nextLabel="Complete & Continue to Analysis" />
    </div>
  );
}

// =====================================================================
// STAGE 3 - Why It Happened (adaptive: Local Review / 5-Why / RCA)
// =====================================================================
function Stage3({ incident, rcaFactors, setRcaFactors, fiveWhy, setFiveWhy, localReview, setLocalReview, legacyRcaText, incidentId, fkText, userEmail, onIncidentChange, onComplete }) {
  const type = (incident.investigation_type || '').toLowerCase();
  const isLocal  = type.includes('local');
  const is5Why   = !isLocal && (type.includes('5') || type.includes('why'));
  const isRCA    = !isLocal && !is5Why;

  return (
    <div>
      <StageHeader
        stage={3}
        title="Why It Happened"
        subtitle={
          isLocal ? 'Guided local review for lower-severity incidents.' :
          is5Why  ? 'Drill down five times to reach the underlying cause.' :
                    'Identify which of the ten contributing factor categories played a role.'
        }
      />

      {legacyRcaText && (
        <Card title="Legacy Notes (read-only)" toneAccent={C.warning}>
          <div style={{ ...readOnlyBox, background: C.amber }}>{legacyRcaText}</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>
            These notes were entered before the structured RCA was available. They're preserved for reference.
          </div>
        </Card>
      )}

      {isLocal  && <LocalReviewForm  data={localReview} setData={setLocalReview} fkText={fkText} userEmail={userEmail} />}
      {is5Why   && <FiveWhyForm      data={fiveWhy}     setData={setFiveWhy}     fkText={fkText} userEmail={userEmail} />}
      {isRCA    && <StructuredRCA    factors={rcaFactors} setFactors={setRcaFactors} incident={incident} onIncidentChange={onIncidentChange} incidentUuid={incidentId} />}

      <StageFooter complete={false} onComplete={onComplete} nextLabel="Complete & Continue to Closure" />
    </div>
  );
}

function StructuredRCA({ factors, setFactors, incident, onIncidentChange, incidentUuid }) {
  async function saveFactor(category, patch) {
    const next = { ...factors[category], ...patch };
    setFactors(prev => ({ ...prev, [category]: next }));
    await supabase.from('rca_factors').upsert(
      { incident_id: incidentUuid, category, is_factor: next.is_factor, description: next.description },
      { onConflict: 'incident_id,category' }
    );
  }

  const factorCount = Object.values(factors).filter(f => f.is_factor).length;

  return (
    <>
      <Card title={`Contributing Factor Analysis (${factorCount} of 10 flagged)`}>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>
          For each category, mark whether it contributed to this incident. If yes, briefly explain how.
        </div>
        {RCA_CATEGORIES.map(cat => {
          const f = factors[cat.key] || { is_factor: false, description: '' };
          return (
            <div key={cat.key} style={{
              border: `1px solid ${f.is_factor ? C.warning : C.borderL}`,
              background: f.is_factor ? C.amber : '#fafafa',
              borderRadius: 8, padding: 14, marginBottom: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <input
                  type="checkbox"
                  checked={f.is_factor}
                  onChange={e => saveFactor(cat.key, { is_factor: e.target.checked })}
                  style={{ width: 18, height: 18, cursor: 'pointer' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>{cat.label}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{cat.prompt}</div>
                </div>
              </div>
              {f.is_factor && (
                <textarea
                  value={f.description}
                  onChange={e => saveFactor(cat.key, { description: e.target.value })}
                  rows={2}
                  placeholder={`Explain how ${cat.label.toLowerCase()} contributed...`}
                  style={{ ...inputStyle, marginTop: 6 }}
                />
              )}
            </div>
          );
        })}
      </Card>

      <Card title="Root Cause Summary" toneAccent={C.danger}>
        <Label>Based on the factors above, what was the underlying root cause?</Label>
        <textarea
          value={incident.root_cause_summary || ''}
          onChange={e => onIncidentChange({ root_cause_summary: e.target.value })}
          rows={4}
          placeholder="Synthesize the root cause in 2-4 sentences. This is what shows up most prominently in the PDF report."
          style={inputStyle}
        />
      </Card>
    </>
  );
}

function FiveWhyForm({ data, setData, fkText, userEmail }) {
  async function save(patch) {
    // Map to legacy column names where they differ
    const colMap = {
      root_cause: 'root_cause_identified',
    };
    const dbPatch = {};
    Object.entries(patch).forEach(([k, v]) => {
      dbPatch[colMap[k] || k] = v;
      dbPatch[k] = v; // also write the modern name if it exists
    });
    const next = { ...data, ...patch };
    setData(next);
    if (data?.id) {
      // existing row - update by id
      await supabase.from('five_why_analyses').update(dbPatch).eq('id', data.id);
    } else {
      // no row yet - insert
      const { data: inserted, error } = await supabase.from('five_why_analyses').insert({
        incident_id: fkText,
        created_by_email: userEmail,
        ...dbPatch,
      }).select().single();
      if (!error && inserted) setData({ ...inserted, ...next });
    }
  }
  return (
    <Card title="5-Why Drill-Down">
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 14 }}>
        Start with the immediate cause, then ask "why?" four more times to reach the underlying issue.
      </div>
      {[1, 2, 3, 4, 5].map(n => (
        <div key={n} style={{ marginBottom: 12 }}>
          <Label>Why #{n}</Label>
          <textarea
            value={data?.[`why${n}`] || ''}
            onChange={e => save({ [`why${n}`]: e.target.value })}
            rows={2}
            style={inputStyle}
            placeholder={n === 1 ? 'Why did this incident occur?' : 'And why was that the case?'}
          />
        </div>
      ))}
      <div style={{ marginTop: 16, padding: 12, background: C.amber, borderRadius: 8 }}>
        <Label>Root Cause</Label>
        <textarea
          value={data?.root_cause || data?.root_cause_identified || ''}
          onChange={e => save({ root_cause: e.target.value })}
          rows={3}
          style={inputStyle}
          placeholder="State the underlying root cause clearly."
        />
      </div>
    </Card>
  );
}

function LocalReviewForm({ data, setData, fkText, userEmail }) {
  // Map our UI field keys to the actual table columns
  const fields = [
    { key: 'what_happened',   label: 'What happened?',                          legacy: null },
    { key: 'immediate_cause', label: 'What was the immediate cause?',           legacy: 'immediate_causes' },
    { key: 'contributing',    label: 'What contributing factors were present?', legacy: 'findings' },
    { key: 'preventive',      label: 'What can prevent recurrence?',            legacy: 'do_differently' },
  ];
  async function save(uiKey, value) {
    const f = fields.find(x => x.key === uiKey);
    const dbPatch = {};
    if (f.legacy) dbPatch[f.legacy] = value;
    dbPatch[uiKey] = value;
    const next = { ...data, [uiKey]: value, ...(f.legacy ? { [f.legacy]: value } : {}) };
    setData(next);
    if (data?.id) {
      await supabase.from('local_reviews').update(dbPatch).eq('id', data.id);
    } else {
      const { data: inserted, error } = await supabase.from('local_reviews').insert({
        incident_id: fkText,
        created_by_email: userEmail,
        ...dbPatch,
      }).select().single();
      if (!error && inserted) setData({ ...inserted, ...next });
    }
  }
  function readField(f) {
    return data?.[f.key] || (f.legacy && data?.[f.legacy]) || '';
  }
  return (
    <Card title="Local Review">
      {fields.map(f => (
        <div key={f.key} style={{ marginBottom: 12 }}>
          <Label>{f.label}</Label>
          <textarea
            value={readField(f)}
            onChange={e => save(f.key, e.target.value)}
            rows={3}
            style={inputStyle}
          />
        </div>
      ))}
    </Card>
  );
}

// =====================================================================
// STAGE 4 - Close It Out
// =====================================================================
function Stage4({ incident, correctiveActions, lessons, fkText, fkUuid, userEmail, pdfGenerating, onGeneratePDF, onIncidentChange, onActionsReload, onLessonsReload, onComplete }) {
  return (
    <div>
      <StageHeader stage={4} title="Close It Out" subtitle="Define corrective actions using the hierarchy of controls, capture lessons learned, then approve and download the PDF." />

      <Card title={`Corrective Actions (${correctiveActions.length})`}>
        <CorrectiveActionAdd fkText={fkText} userEmail={userEmail} onAdded={onActionsReload} />
        <CorrectiveActionList items={correctiveActions} onChange={onActionsReload} />
      </Card>

      <Card title={`Lessons Learned (${lessons.length})`}>
        <LessonAdd fkUuid={fkUuid} userEmail={userEmail} onAdded={onLessonsReload} />
        <LessonList items={lessons} onChange={onLessonsReload} />
      </Card>

      <Card title="Status & Approval">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Label>Current status:</Label>
          <select
            value={incident.status || 'First Draft'}
            onChange={e => onIncidentChange({ status: e.target.value })}
            style={{ ...inputStyle, width: 'auto', flex: 'none' }}
          >
            {STATUS_FLOW.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <button onClick={onGeneratePDF} disabled={pdfGenerating} style={{ ...btnPrimaryDark, fontSize: 15 }}>
          {pdfGenerating ? 'Opening report...' : 'Open Printable Report (PDF)'}
        </button>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>
          Opens a beautifully-formatted report in a new tab. Photos are auto-compressed and the print dialog opens automatically — choose "Save as PDF" as the destination to download.
        </div>
      </Card>

      <StageFooter complete={incident.stage_4_complete} onComplete={onComplete} nextLabel="Mark Investigation Complete" />
    </div>
  );
}

// =====================================================================
// Evidence
// =====================================================================
function EvidenceUploader({ incidentId, fkText, userEmail, onUploaded }) {
  const [busy, setBusy] = useState(false);
  const [evidenceType, setEvidenceType] = useState('Photo');
  const [description, setDescription] = useState('');
  const fileRef = useRef(null);

  async function compressImage(file) {
    if (!file.type.startsWith('image/')) return file;
    return new Promise((resolve) => {
      const img = new window.Image();
      const reader = new FileReader();
      reader.onload = e => { img.src = e.target.result; };
      reader.readAsDataURL(file);
      img.onload = () => {
        const maxW = 1920;
        const scale = img.width > maxW ? maxW / img.width : 1;
        const canvas = document.createElement('canvas');
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => {
          const compressed = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
          resolve(compressed.size < file.size ? compressed : file);
        }, 'image/jpeg', 0.7);
      };
      img.onerror = () => resolve(file);
    });
  }

  async function handleFiles(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setBusy(true);
    for (const raw of files) {
      try {
        const file = await compressImage(raw);
        const ext = file.name.split('.').pop().toLowerCase();
        const path = `${incidentId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage.from('incident-evidence').upload(path, file, { upsert: false });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from('incident-evidence').getPublicUrl(path);
        const { error: insErr } = await supabase.from('investigation_evidence').insert({
          incident_id: fkText,
          evidence_type: evidenceType,
          description,
          file_url: urlData.publicUrl,
          file_name: file.name,
          uploaded_by: userEmail,
          uploaded_by_email: userEmail,
          uploaded_at: new Date().toISOString(),
          source: 'workbench',
        });
        if (insErr) throw insErr;
      } catch (err) {
        console.error('Upload failed for', raw.name, err);
        alert(`Upload failed for ${raw.name}: ${err.message}`);
      }
    }
    setBusy(false);
    setDescription('');
    if (fileRef.current) fileRef.current.value = '';
    onUploaded();
  }

  return (
    <div style={{ background: '#f9fafb', border: `1px dashed ${C.border}`, borderRadius: 8, padding: 14, marginBottom: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, marginBottom: 10 }}>
        <select value={evidenceType} onChange={e => setEvidenceType(e.target.value)} style={inputStyle}>
          {['Photo', 'Document', 'Video', 'Report', 'Other'].map(t => <option key={t}>{t}</option>)}
        </select>
        <input
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Brief description (optional)"
          style={inputStyle}
        />
      </div>
      <input
        ref={fileRef}
        type="file"
        multiple
        accept="image/*,application/pdf,video/*"
        onChange={handleFiles}
        disabled={busy}
        style={{ fontSize: 13 }}
      />
      <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>
        {busy ? 'Uploading and compressing...' : 'Photos auto-compress to ~800 KB before upload.'}
      </div>
    </div>
  );
}

function EvidenceList({ items, initialPhotos = [], onChange }) {
  async function remove(item) {
    if (item._isInitial) {
      alert('Initial-report photos can be removed by editing the photo_urls field in the incident record. Workbench-uploaded photos can be deleted directly.');
      return;
    }
    if (!confirm('Remove this evidence?')) return;
    await supabase.from('investigation_evidence').delete().eq('id', item.id);
    onChange();
  }
  const initialItems = (initialPhotos || []).map((url, i) => ({
    id: `initial-${i}`,
    evidence_type: 'Initial Field Report',
    description: '',
    file_url: url,
    file_name: (url || '').split('/').pop(),
    _isInitial: true,
  }));
  const allItems = [...initialItems, ...items];
  if (allItems.length === 0) return <Empty text="No evidence yet. Upload above." />;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
      {allItems.map(it => (
        <div key={it.id} style={{ border: `1px solid ${it._isInitial ? C.steel : C.borderL}`, borderRadius: 8, overflow: 'hidden', background: C.card, position: 'relative' }}>
          {it._isInitial && (
            <div style={{ position: 'absolute', top: 4, right: 4, background: C.steel, color: 'white', fontSize: 9, padding: '2px 6px', borderRadius: 3, fontWeight: 700, zIndex: 2 }}>
              FIELD REPORT
            </div>
          )}
          {/\.(jpe?g|png|webp|gif)$/i.test(it.file_url) ? (
            <a href={it.file_url} target="_blank" rel="noreferrer">
              <img src={it.file_url} alt={it.description} style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }} />
            </a>
          ) : (
            <a href={it.file_url} target="_blank" rel="noreferrer" style={{ height: 120, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, textDecoration: 'none' }}>
              📄
            </a>
          )}
          <div style={{ padding: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600 }}>{it.evidence_type}</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2, wordBreak: 'break-word' }}>{it.description || (it._isInitial ? 'From original field report' : '(no description)')}</div>
            {!it._isInitial && (
              <button onClick={() => remove(it)} style={{ ...btnSmall, color: C.danger, marginTop: 8 }}>Remove</button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// =====================================================================
// AdditionalFields - renders every other column on the incident row
// =====================================================================
function AdditionalFields({ incident, onChange }) {
  // Fields already shown in the primary Incident Summary card
  const PRIMARY = new Set([
    'id','incident_id','status',
    'incident_date','incident_time',
    'location','location_name','location_id',
    'company','company_name','company_id',
    'reported_by','reported_by_name','reported_by_email','reported_by_phone','reported_by_company','submitted_by',
    'brief_description','detailed_description','description',
    'safety_severity','severity_safety','safety_severity_description',
    'investigation_type',
  ]);
  // Internal tracking / handled-elsewhere fields - never show
  const HIDDEN = new Set([
    'created_at','updated_at',
    'stage_1_complete','stage_2_complete','stage_3_complete','stage_4_complete',
    'pdf_last_generated_at','root_cause_summary','root_cause_completed_at',
    'photo_urls',
    // JSONB shadow columns (we use normalized tables instead)
    'evidence','timeline','witnesses','corrective_actions','lessons_learned',
    'local_review','five_why','rca_analysis','tags',
    'report_pdf_url','report_pdf_id','report_generated_at',
  ]);

  const extras = Object.entries(incident || {}).filter(([k, v]) => {
    if (PRIMARY.has(k) || HIDDEN.has(k)) return false;
    if (v === null || v === undefined || v === '') return false;
    if (Array.isArray(v) && v.length === 0) return false;
    if (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0) return false;
    return true;
  });

  if (extras.length === 0) return null;

  return (
    <Card title={`Additional Details from Field Report (${extras.length})`} toneAccent={C.muted}>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 14, padding: 10, background: '#fafafa', borderRadius: 6, borderLeft: `3px solid ${C.muted}` }}>
        Every additional field captured by the original field report. All editable — autosaves on change.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {extras.map(([k, v]) => {
          const label = prettify(k);
          // Array → comma-joined editable text (best-effort)
          if (Array.isArray(v)) {
            const text = v.filter(x => typeof x !== 'object').join(', ');
            return (
              <div key={k} style={{ gridColumn: '1 / -1' }}>
                <Label>{label} <span style={{ color: C.muted, fontWeight: 400, fontSize: 10 }}>(list)</span></Label>
                <textarea
                  value={text}
                  onChange={e => onChange({ [k]: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                  rows={2}
                  style={inputStyle}
                />
              </div>
            );
          }
          // Object → JSON read-only display
          if (typeof v === 'object') {
            return (
              <div key={k} style={{ gridColumn: '1 / -1' }}>
                <Label>{label}</Label>
                <div style={{ ...readOnlyBox, fontFamily: 'monospace', fontSize: 11 }}>
                  {JSON.stringify(v, null, 2)}
                </div>
              </div>
            );
          }
          // Boolean → checkbox
          if (typeof v === 'boolean') {
            return (
              <div key={k}>
                <Label>{label}</Label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
                  <input
                    type="checkbox"
                    checked={!!v}
                    onChange={e => onChange({ [k]: e.target.checked })}
                  />
                  <span style={{ fontSize: 13 }}>{v ? 'Yes' : 'No'}</span>
                </label>
              </div>
            );
          }
          // Long string → textarea
          const strVal = String(v);
          if (strVal.length > 60 || strVal.includes('\n')) {
            return (
              <div key={k} style={{ gridColumn: '1 / -1' }}>
                <Label>{label}</Label>
                <textarea
                  value={strVal}
                  onChange={e => onChange({ [k]: e.target.value })}
                  rows={Math.min(8, Math.max(2, Math.ceil(strVal.length / 80)))}
                  style={inputStyle}
                />
              </div>
            );
          }
          // Short string / number → input
          return (
            <div key={k}>
              <Label>{label}</Label>
              <input
                type={typeof v === 'number' ? 'number' : 'text'}
                value={strVal}
                onChange={e => onChange({ [k]: typeof v === 'number' ? Number(e.target.value) : e.target.value })}
                style={inputStyle}
              />
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function prettify(s) {
  return (s || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// =====================================================================
// Witnesses
// =====================================================================
function WitnessAdd({ fkText, userEmail, onAdded }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', position: '', company: '', summary: '', additional_comments: '', acknowledgment: false });
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!form.name || !form.summary) return alert('Name and summary are required.');
    setBusy(true);
    const { error } = await supabase.from('witness_statements').insert({
      incident_id: fkText,
      name: form.name,
      witness_name: form.name,
      position: form.position,
      position_role: form.position,
      company: form.company,
      summary: form.summary,
      statement_summary: form.summary,
      additional_comments: form.additional_comments,
      acknowledgment: form.acknowledgment,
      created_by_email: userEmail,
    });
    setBusy(false);
    if (error) return alert('Failed: ' + error.message);
    setForm({ name: '', position: '', company: '', summary: '', additional_comments: '', acknowledgment: false });
    setOpen(false);
    onAdded();
  }

  if (!open) return <button onClick={() => setOpen(true)} style={btnPrimaryDark}>+ Add Witness Statement</button>;
  return (
    <div style={{ background: '#f9fafb', border: `1px solid ${C.borderL}`, borderRadius: 8, padding: 14, marginBottom: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
        <Field label="Name *"     value={form.name}     onChange={v => setForm({ ...form, name: v })} />
        <Field label="Position"   value={form.position} onChange={v => setForm({ ...form, position: v })} />
        <Field label="Company"    value={form.company}  onChange={v => setForm({ ...form, company: v })} />
      </div>
      <Label>Summary of statement *</Label>
      <textarea rows={3} value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })} style={inputStyle} />
      <div style={{ marginTop: 10 }}>
        <Label>Additional comments</Label>
        <textarea rows={2} value={form.additional_comments} onChange={e => setForm({ ...form, additional_comments: e.target.value })} style={inputStyle} />
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 13 }}>
        <input type="checkbox" checked={form.acknowledgment} onChange={e => setForm({ ...form, acknowledgment: e.target.checked })} />
        Witness has acknowledged the statement is accurate.
      </label>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button onClick={submit} disabled={busy} style={btnPrimaryDark}>{busy ? 'Saving...' : 'Save Statement'}</button>
        <button onClick={() => setOpen(false)} style={btnGhostDark}>Cancel</button>
      </div>
    </div>
  );
}

function WitnessList({ items, onChange }) {
  async function remove(id) {
    if (!confirm('Remove this witness statement?')) return;
    await supabase.from('witness_statements').delete().eq('id', id);
    onChange();
  }
  if (items.length === 0) return <Empty text="No witness statements yet." />;
  return items.map(w => {
    const name = w.name || w.witness_name || '(unnamed)';
    const position = w.position || w.position_role;
    const summary = w.summary || w.statement_summary;
    return (
    <div key={w.id} style={{ border: `1px solid ${C.borderL}`, borderRadius: 8, padding: 12, marginBottom: 10, background: '#fafafa' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>
            {name}
            {position && <span style={{ fontWeight: 400, color: C.muted, fontSize: 12 }}> — {position}</span>}
            {w.company && <span style={{ fontWeight: 400, color: C.muted, fontSize: 12 }}> ({w.company})</span>}
          </div>
          {summary && <div style={{ fontSize: 13, marginTop: 6, whiteSpace: 'pre-wrap' }}>{summary}</div>}
          {w.additional_comments && (
            <div style={{ fontSize: 12, marginTop: 8, color: C.muted, whiteSpace: 'pre-wrap' }}><em>Notes:</em> {w.additional_comments}</div>
          )}
          {w.acknowledgment && <div style={{ fontSize: 11, color: C.success, marginTop: 6 }}>✓ Acknowledged</div>}
        </div>
        <button onClick={() => remove(w.id)} style={{ ...btnSmall, color: C.danger }}>Delete</button>
      </div>
    </div>
    );
  });
}

// =====================================================================
// Corrective Actions
// =====================================================================
function CorrectiveActionAdd({ fkText, userEmail, onAdded }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    description: '', owner: '', due_date: '', status: 'Open',
    hierarchy_of_controls: '', hierarchy_level: null, hierarchy_justification: '',
  });
  const [busy, setBusy] = useState(false);
  const [showPpeWarning, setShowPpeWarning] = useState(false);

  function selectControl(control) {
    setForm(f => ({ ...f, hierarchy_of_controls: control.name, hierarchy_level: control.level }));
    setShowPpeWarning(control.level === 5);
  }

  async function submit() {
    if (!form.description || !form.owner || !form.due_date) {
      return alert('Description, owner, and due date are required.');
    }
    if (!form.hierarchy_of_controls) {
      return alert('Please select a hierarchy of controls level.');
    }
    if (form.hierarchy_level >= 4 && !form.hierarchy_justification) {
      return alert(`You picked ${form.hierarchy_of_controls}. Please briefly justify why a stronger control isn't feasible.`);
    }
    setBusy(true);
    const { error } = await supabase.from('investigation_corrective_actions').insert({
      incident_id: fkText,
      description: form.description,
      action_description: form.description,
      owner: form.owner,
      action_owner_name: form.owner,
      action_owner_email: userEmail,
      due_date: form.due_date,
      target_date: form.due_date,
      status: form.status,
      action_status: form.status,
      hierarchy_of_controls: form.hierarchy_of_controls,
      hierarchy_control: form.hierarchy_of_controls,
      hierarchy_level: form.hierarchy_level,
      hierarchy_justification: form.hierarchy_justification,
      created_by_email: userEmail,
    });
    setBusy(false);
    if (error) return alert('Failed: ' + error.message);
    setForm({ description: '', owner: '', due_date: '', status: 'Open', hierarchy_of_controls: '', hierarchy_level: null, hierarchy_justification: '' });
    setShowPpeWarning(false);
    setOpen(false);
    onAdded();
  }

  if (!open) return <button onClick={() => setOpen(true)} style={btnPrimaryDark}>+ Add Corrective Action</button>;
  return (
    <div style={{ background: '#f9fafb', border: `1px solid ${C.borderL}`, borderRadius: 8, padding: 14, marginBottom: 14 }}>
      <Label>What action will be taken? *</Label>
      <textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={inputStyle} />

      <div style={{ marginTop: 14 }}>
        <Label>Hierarchy of Controls *</Label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
          {HIERARCHY_OF_CONTROLS.map(h => {
            const selected = form.hierarchy_level === h.level;
            const tone = h.tone === 'strong' ? C.success : h.tone === 'good' ? C.steel : h.tone === 'weak' ? C.warning : C.danger;
            return (
              <button
                key={h.level}
                onClick={() => selectControl(h)}
                style={{
                  border: `2px solid ${selected ? tone : C.borderL}`,
                  background: selected ? tone : C.card,
                  color: selected ? 'white' : C.text,
                  padding: '10px 6px', borderRadius: 6, cursor: 'pointer',
                  fontSize: 11, fontWeight: 600, textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 10, opacity: 0.8 }}>Level {h.level}</div>
                <div>{h.name}</div>
              </button>
            );
          })}
        </div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
          <span>← Stronger (preferred)</span>
          <span>Weaker →</span>
        </div>
      </div>

      {showPpeWarning && (
        <div style={{ marginTop: 12, padding: 12, background: '#fee2e2', border: `1px solid ${C.danger}`, borderRadius: 8, color: '#7f1d1d', fontSize: 13 }}>
          <strong>PPE is the weakest control.</strong> Before settling on PPE, ask:
          <ul style={{ margin: '6px 0 0 18px' }}>
            <li>Can the hazard be eliminated?</li>
            <li>Can it be substituted with something safer?</li>
            <li>Can engineering controls isolate the worker?</li>
          </ul>
        </div>
      )}

      {form.hierarchy_level >= 4 && (
        <div style={{ marginTop: 12 }}>
          <Label>Justify why a stronger control isn't feasible</Label>
          <textarea
            rows={2}
            value={form.hierarchy_justification}
            onChange={e => setForm({ ...form, hierarchy_justification: e.target.value })}
            style={inputStyle}
          />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10, marginTop: 14 }}>
        <Field label="Owner *"    value={form.owner}    onChange={v => setForm({ ...form, owner: v })} />
        <Field label="Due Date *" type="date" value={form.due_date} onChange={v => setForm({ ...form, due_date: v })} />
        <div>
          <Label>Status</Label>
          <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={inputStyle}>
            {['Open', 'In Progress', 'Complete', 'Verified'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button onClick={submit} disabled={busy} style={btnPrimaryDark}>{busy ? 'Saving...' : 'Save Action'}</button>
        <button onClick={() => setOpen(false)} style={btnGhostDark}>Cancel</button>
      </div>
    </div>
  );
}

function CorrectiveActionList({ items, onChange }) {
  async function updateStatus(item, status) {
    await supabase.from('investigation_corrective_actions').update({ status, action_status: status }).eq('id', item.id);
    onChange();
  }
  async function remove(id) {
    if (!confirm('Remove this action?')) return;
    await supabase.from('investigation_corrective_actions').delete().eq('id', id);
    onChange();
  }
  if (items.length === 0) return <Empty text="No corrective actions yet." />;
  return items.map(c => {
    const description = c.description || c.action_description || '';
    const owner = c.owner || c.action_owner_name || '';
    const dueDate = c.due_date || c.target_date;
    const status = c.status || c.action_status || 'Open';
    const hierarchyName = c.hierarchy_of_controls || c.hierarchy_control;
    const lvl = c.hierarchy_level;
    const tone = lvl <= 2 ? C.success : lvl <= 3 ? C.steel : lvl === 4 ? C.warning : C.danger;
    return (
      <div key={c.id} style={{ border: `1px solid ${C.borderL}`, borderRadius: 8, padding: 12, marginBottom: 10, background: '#fafafa' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{description}</div>
            {hierarchyName && (
              <div style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, color: 'white', background: tone, padding: '2px 8px', borderRadius: 3, marginTop: 6 }}>
                {hierarchyName}{lvl ? ` (Level ${lvl})` : ''}
              </div>
            )}
            <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>
              Owner: <strong>{owner || '—'}</strong> &nbsp;|&nbsp;
              Due: <strong>{formatDate(dueDate)}</strong>
            </div>
            {c.hierarchy_justification && (
              <div style={{ fontSize: 11, color: C.muted, marginTop: 4, fontStyle: 'italic' }}>
                Justification: {c.hierarchy_justification}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
            <select value={status} onChange={e => updateStatus(c, e.target.value)} style={{ ...inputStyle, padding: '4px 6px', fontSize: 11, width: 110 }}>
              {['Open', 'In Progress', 'Complete', 'Verified'].map(s => <option key={s}>{s}</option>)}
            </select>
            <button onClick={() => remove(c.id)} style={{ ...btnSmall, color: C.danger }}>Delete</button>
          </div>
        </div>
      </div>
    );
  });
}

// =====================================================================
// Lessons
// =====================================================================
function LessonAdd({ fkUuid, userEmail, onAdded }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', key_takeaway: '' });
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!form.title) return alert('A title is required.');
    setBusy(true);
    const { error } = await supabase.from('lessons_learned').insert({
      incident_id: fkUuid,
      title: form.title,
      lesson_title: form.title,
      description: form.description,
      lesson_description: form.description,
      key_takeaway: form.key_takeaway,
      added_by: userEmail,
    });
    setBusy(false);
    if (error) return alert('Failed: ' + error.message);
    setForm({ title: '', description: '', key_takeaway: '' });
    setOpen(false);
    onAdded();
  }

  if (!open) return <button onClick={() => setOpen(true)} style={btnPrimaryDark}>+ Add Lesson Learned</button>;
  return (
    <div style={{ background: '#f9fafb', border: `1px solid ${C.borderL}`, borderRadius: 8, padding: 14, marginBottom: 14 }}>
      <Field label="Title *" value={form.title} onChange={v => setForm({ ...form, title: v })} />
      <div style={{ marginTop: 10 }}>
        <Label>Description</Label>
        <textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={inputStyle} />
      </div>
      <div style={{ marginTop: 10 }}>
        <Label>Key takeaway (one sentence)</Label>
        <input value={form.key_takeaway} onChange={e => setForm({ ...form, key_takeaway: e.target.value })} style={inputStyle} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button onClick={submit} disabled={busy} style={btnPrimaryDark}>{busy ? 'Saving...' : 'Save Lesson'}</button>
        <button onClick={() => setOpen(false)} style={btnGhostDark}>Cancel</button>
      </div>
    </div>
  );
}

function LessonList({ items, onChange }) {
  async function remove(id) {
    if (!confirm('Remove this lesson?')) return;
    await supabase.from('lessons_learned').delete().eq('id', id);
    onChange();
  }
  if (items.length === 0) return <Empty text="No lessons learned yet." />;
  return items.map(l => {
    const title = l.title || l.lesson_title || '(untitled)';
    const description = l.description || l.lesson_description;
    return (
    <div key={l.id} style={{ border: `1px solid ${C.borderL}`, borderRadius: 8, padding: 12, marginBottom: 10, background: '#fafafa' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>{title}</div>
          {description && <div style={{ fontSize: 13, marginTop: 6, whiteSpace: 'pre-wrap' }}>{description}</div>}
          {l.key_takeaway && (
            <div style={{ fontSize: 12, marginTop: 8, padding: 8, background: C.amber, borderRadius: 4, borderLeft: `3px solid ${C.warning}` }}>
              <strong>Takeaway:</strong> {l.key_takeaway}
            </div>
          )}
        </div>
        <button onClick={() => remove(l.id)} style={{ ...btnSmall, color: C.danger }}>Delete</button>
      </div>
    </div>
    );
  });
}

// =====================================================================
// Building blocks
// =====================================================================
function Card({ title, children, toneAccent }) {
  return (
    <section style={{
      background: C.card, border: `1px solid ${C.borderL}`,
      borderLeft: toneAccent ? `4px solid ${toneAccent}` : `1px solid ${C.borderL}`,
      borderRadius: 12, padding: 20, marginBottom: 18,
      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
    }}>
      <h3 style={{ margin: '0 0 14px 0', fontSize: 15, fontWeight: 700, color: C.navy }}>{title}</h3>
      {children}
    </section>
  );
}

function StageHeader({ stage, title, subtitle }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 0.5, textTransform: 'uppercase' }}>
        Stage {stage} of 4
      </div>
      <h1 style={{ margin: '4px 0 6px 0', fontSize: 26, fontWeight: 700, color: C.navy }}>{title}</h1>
      <div style={{ fontSize: 14, color: C.muted }}>{subtitle}</div>
    </div>
  );
}

function StageFooter({ complete, onComplete, nextLabel }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
      <button onClick={onComplete} style={{ ...btnPrimaryDark, fontSize: 14, padding: '12px 20px' }}>
        {complete ? '✓ Stage Complete — Re-mark Complete' : nextLabel}
      </button>
    </div>
  );
}

function Field({ label, value, onChange, readOnly, type = 'text' }) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        type={type}
        value={value || ''}
        onChange={e => onChange && onChange(e.target.value)}
        readOnly={readOnly}
        style={{ ...inputStyle, background: readOnly ? '#f3f4f6' : C.card }}
      />
    </div>
  );
}

function Label({ children }) {
  return <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 4 }}>{children}</div>;
}

function Empty({ text }) {
  return <div style={{ fontSize: 13, color: C.muted, fontStyle: 'italic', padding: 12 }}>{text}</div>;
}

function FullScreenMessage({ text, tone }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg, padding: 24 }}>
      <div style={{ background: C.card, padding: 28, borderRadius: 12, border: `1px solid ${C.borderL}`, color: tone === 'danger' ? C.danger : C.text, fontSize: 14 }}>
        {text}
      </div>
    </div>
  );
}

function LoginGate({ onSubmit }) {
  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <form onSubmit={onSubmit} style={{ background: C.card, padding: 28, borderRadius: 12, border: `1px solid ${C.borderL}`, width: 360 }}>
        <h2 style={{ margin: '0 0 6px 0', color: C.navy }}>Investigation Workbench</h2>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>Restricted to @slpalaska.com accounts.</div>
        <Label>Email</Label>
        <input name="email" type="email" required style={inputStyle} placeholder="you@slpalaska.com" />
        <button type="submit" style={{ ...btnPrimaryDark, marginTop: 14, width: '100%' }}>Continue</button>
      </form>
    </div>
  );
}

// =====================================================================
// Style primitives
// =====================================================================
const inputStyle = {
  width: '100%', padding: '8px 10px', fontSize: 13,
  border: `1px solid ${C.border}`, borderRadius: 6, background: C.card, color: C.text,
  fontFamily: 'inherit', boxSizing: 'border-box',
};
const readOnlyBox = {
  ...inputStyle, background: '#f9fafb', minHeight: 60, padding: 12, whiteSpace: 'pre-wrap',
};
const btnPrimary = {
  background: 'rgba(255,255,255,0.2)', color: 'white',
  padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.3)',
  fontSize: 13, fontWeight: 600, cursor: 'pointer',
};
const btnGhost = {
  background: 'transparent', color: 'white',
  padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.4)',
  fontSize: 13, cursor: 'pointer',
};
const btnPrimaryDark = {
  background: C.navy, color: 'white',
  padding: '10px 16px', borderRadius: 8, border: 'none',
  fontSize: 13, fontWeight: 600, cursor: 'pointer',
};
const btnGhostDark = {
  background: C.card, color: C.text,
  padding: '10px 16px', borderRadius: 8, border: `1px solid ${C.border}`,
  fontSize: 13, cursor: 'pointer',
};
const btnSmall = {
  background: 'transparent', border: 'none', cursor: 'pointer',
  fontSize: 11, fontWeight: 600, padding: '4px 8px', borderRadius: 4,
};

function formatDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

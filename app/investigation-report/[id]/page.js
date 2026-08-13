'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

// =====================================================================
// AnthroSafe Investigation Report - HTML-to-PDF via window.print()
// Beautiful styled report with client-side photo compression
// Auto-prints when opened with ?print=1
// =====================================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const LOGO_URL = '/AnthroSafe_Logo.PNG';

const RCA_CATEGORIES = [
  { key: 'equipment',     label: 'Equipment' },
  { key: 'environment',   label: 'Environment' },
  { key: 'materials',     label: 'Materials' },
  { key: 'methods',       label: 'Methods' },
  { key: 'people',        label: 'People' },
  { key: 'management',    label: 'Management' },
  { key: 'communication', label: 'Communication' },
  { key: 'training',      label: 'Training' },
  { key: 'procedures',    label: 'Procedures' },
  { key: 'culture',       label: 'Culture' },
];

// =====================================================================
// Inline SVG icons (no external dependency)
// =====================================================================
const I = {
  Clipboard: (p) => <svg {...iconProps(p)}><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>,
  Clock: (p) => <svg {...iconProps(p)}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Camera: (p) => <svg {...iconProps(p)}><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>,
  Users: (p) => <svg {...iconProps(p)}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Search: (p) => <svg {...iconProps(p)}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  CheckSquare: (p) => <svg {...iconProps(p)}><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  Lightbulb: (p) => <svg {...iconProps(p)}><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg>,
  BadgeCheck: (p) => <svg {...iconProps(p)}><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m9 12 2 2 4-4"/></svg>,
  AlertTriangle: (p) => <svg {...iconProps(p)}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  User: (p) => <svg {...iconProps(p)}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  FileText: (p) => <svg {...iconProps(p)}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  Download: (p) => <svg {...iconProps(p)}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  ArrowLeft: (p) => <svg {...iconProps(p)}><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
};
function iconProps({ size = 18, color = 'currentColor', stroke = 2 } = {}) {
  return { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round' };
}

// =====================================================================
// Photo compression helpers
// =====================================================================
function loadImg(src) {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function compressPhoto(url, maxW = 1200, quality = 0.65) {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return url;
    const blob = await resp.blob();
    const objectUrl = URL.createObjectURL(blob);
    const img = await loadImg(objectUrl);
    URL.revokeObjectURL(objectUrl);
    const canvas = document.createElement('canvas');
    const scale = img.width > maxW ? maxW / img.width : 1;
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', quality);
  } catch (e) {
    console.warn('Photo compress failed for', url, e);
    return url;
  }
}

// =====================================================================
// Main
// =====================================================================
export default function InvestigationReport() {
  const params = useParams();
  const router = useRouter();
  const incidentId = params.id;

  const [incident, setIncident] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [witnesses, setWitnesses] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [rcaFactors, setRcaFactors] = useState([]);
  const [fiveWhy, setFiveWhy] = useState(null);
  const [localReview, setLocalReview] = useState(null);
  const [correctiveActions, setCorrectiveActions] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [compressedMap, setCompressedMap] = useState({});  // {url: dataURL}
  const [loading, setLoading] = useState(true);
  const [photosReady, setPhotosReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, [incidentId]);

  // Note: we deliberately do NOT auto-print, even when ?print=1 is present.
  // Auto-print fires before the user sees the rendered page and Chrome's print
  // preview occasionally strips colors. The user clicks the prominent "Save as PDF"
  // button when they're ready - they preview first, then print.

  async function loadAll() {
    setLoading(true);
    setError('');
    try {
      const incR = await supabase.from('incidents').select('*').eq('id', incidentId).single();
      if (incR.error) throw incR.error;
      setIncident(incR.data);

      const fkText = incR.data.incident_id;
      const fkUuid = incR.data.id;
      // Legacy tables key off either form - search both to be safe
      const fkBoth = [fkText, fkUuid].filter(Boolean);

      const [tlR, wR, evR, facR, fwR, lrR, caR, lessR] = await Promise.all([
        supabase.from('timeline_events').select('*').in('incident_id', fkBoth).order('event_date').order('event_time'),
        supabase.from('witness_statements').select('*').in('incident_id', fkBoth).order('created_at'),
        supabase.from('investigation_evidence').select('*').in('incident_id', fkBoth).order('uploaded_at'),
        supabase.from('rca_factors').select('*').eq('incident_id', fkUuid),
        supabase.from('five_why_analyses').select('*').in('incident_id', fkBoth).order('updated_at', { ascending: false }).limit(1),
        supabase.from('local_reviews').select('*').in('incident_id', fkBoth).order('updated_at', { ascending: false }).limit(1),
        supabase.from('investigation_corrective_actions').select('*').in('incident_id', fkBoth).order('due_date'),
        supabase.from('lessons_learned').select('*').eq('incident_id', fkUuid).order('created_at'),
      ]);

      setTimeline(tlR.data || []);
      setWitnesses(wR.data || []);
      setEvidence(evR.data || []);
      setRcaFactors(facR.data || []);
      setFiveWhy(Array.isArray(fwR.data) ? fwR.data[0] : fwR.data);
      setLocalReview(Array.isArray(lrR.data) ? lrR.data[0] : lrR.data);
      setCorrectiveActions(caR.data || []);
      setLessons(lessR.data || []);

      // Collect photos from multiple possible sources:
      // (a) investigation_evidence rows (workbench-uploaded)
      // (b) incident.evidence JSONB array (legacy field-report photos)
      const evidenceUrls = (evR.data || [])
        .filter(e => e.file_url && /\.(jpe?g|png|webp|gif)$/i.test(e.file_url))
        .map(e => e.file_url);

      const jsonbEvidence = Array.isArray(incR.data.evidence) ? incR.data.evidence : [];
      const jsonbUrls = jsonbEvidence
        .map(e => (typeof e === 'string' ? e : (e?.url || e?.file_url || e?.path)))
        .filter(u => u && typeof u === 'string' && /\.(jpe?g|png|webp|gif)$/i.test(u));

      const allUrls = [...new Set([...jsonbUrls, ...evidenceUrls])].filter(Boolean);

      setLoading(false);

      const compMap = {};
      await Promise.all(allUrls.map(async (url) => {
        compMap[url] = await compressPhoto(url);
      }));
      setCompressedMap(compMap);
      setPhotosReady(true);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load investigation.');
      setLoading(false);
      setPhotosReady(true);
    }
  }

  if (loading) {
    return <FullScreenMessage text="Loading investigation report..." />;
  }
  if (error) {
    return <FullScreenMessage text={error} tone="danger" />;
  }
  if (!incident) {
    return <FullScreenMessage text="Investigation not found." tone="danger" />;
  }

  const inv = (incident.investigation_type || '').toLowerCase();
  const isLocal = inv.includes('local');
  const is5Why  = !isLocal && (inv.includes('5') || inv.includes('why'));
  const isRCA   = !isLocal && !is5Why;

  // Combine photos for the Evidence section
  const allPhotos = [
    ...(Array.isArray(incident.photo_urls) ? incident.photo_urls.map((url, i) => ({
      key: `i${i}`,
      url,
      caption: `Photo ${i + 1} from initial report`,
      tag: 'INITIAL',
    })) : []),
    ...evidence
      .filter(e => e.file_url && /\.(jpe?g|png|webp|gif)$/i.test(e.file_url))
      .map((e, i) => ({
        key: `e${i}`,
        url: e.file_url,
        caption: e.description ? `${e.evidence_type || 'Photo'} - ${e.description}` : (e.evidence_type || 'Photo'),
        tag: 'WORKBENCH',
      })),
  ];

  return (
    <>
      <PrintStyles />

      <div className="no-print" style={topBarStyle}>
        <button onClick={() => router.back()} style={btnGhost}>
          <I.ArrowLeft size={14} /> Back
        </button>
        <div style={{ color: '#fff', fontSize: 13, flex: 1, textAlign: 'center' }}>
          {photosReady
            ? <span><strong style={{ color: '#fbbf24' }}>Tip:</strong> When printing, expand "More settings" and check <strong>"Background graphics"</strong> for full color.</span>
            : <span style={{ opacity: 0.85 }}>Compressing photos for PDF... please wait</span>
          }
        </div>
        <button
          onClick={() => window.print()}
          disabled={!photosReady}
          style={{ ...btnPrimary, opacity: photosReady ? 1 : 0.6, fontSize: 14, padding: '10px 18px' }}
        >
          <I.Download size={16} /> Save as PDF
        </button>
      </div>

      <div style={reportContainerStyle}>
        <ReportHeader incident={incident} />

        <Section icon={<I.Clipboard size={16} color="#fff" />} title="Incident Summary">
          <IncidentSummary incident={incident} witnesses={witnesses} />
        </Section>

        {(incident.immediate_actions_taken || incident.suspected_root_causes || incident.causal_factors || incident.lessons_learned_initial) && (
          <Section icon={<I.FileText size={16} color="#fff" />} title="Initial Field-Report Findings">
            <InitialFindings incident={incident} />
          </Section>
        )}

        {timeline.length > 0 && (
          <Section icon={<I.Clock size={16} color="#fff" />} title="Timeline of Events" count={timeline.length}>
            <Timeline events={timeline} />
          </Section>
        )}

        {allPhotos.length > 0 && (
          <Section icon={<I.Camera size={16} color="#fff" />} title="Evidence" count={allPhotos.length} breakBefore>
            <Evidence photos={allPhotos} compressedMap={compressedMap} ready={photosReady} />
          </Section>
        )}

        {witnesses.length > 0 && (
          <Section icon={<I.Users size={16} color="#fff" />} title="Witness Statements" count={witnesses.length} breakBefore>
            <Witnesses witnesses={witnesses} />
          </Section>
        )}

        <Section
          icon={<I.Search size={16} color="#fff" />}
          title={isLocal ? 'Analysis - Local Review' : is5Why ? 'Analysis - 5-Why' : 'Analysis - Root Cause Analysis'}
        >
          {isLocal && <LocalReviewSection data={localReview} />}
          {is5Why  && <FiveWhySection      data={fiveWhy} />}
          {isRCA   && <RCASection          factors={rcaFactors} incident={incident} />}
        </Section>

        {correctiveActions.length > 0 && (
          <Section icon={<I.CheckSquare size={16} color="#fff" />} title="Corrective Actions" count={correctiveActions.length}>
            <CorrectiveActions actions={correctiveActions} />
          </Section>
        )}

        {lessons.length > 0 && (
          <Section icon={<I.Lightbulb size={16} color="#fff" />} title="Lessons Learned" count={lessons.length}>
            <LessonsLearned lessons={lessons} />
          </Section>
        )}

        <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <Section icon={<I.BadgeCheck size={16} color="#fff" />} title="Investigation Checklist">
            <Checklist
              timeline={timeline}
              photos={allPhotos}
              witnesses={witnesses}
              actions={correctiveActions}
              lessons={lessons}
              hasAnalysis={isLocal ? !!localReview : is5Why ? !!fiveWhy : rcaFactors.some(f => f.is_factor)}
            />
          </Section>

          <ReportFooter />
        </div>
      </div>
    </>
  );
}

// =====================================================================
// Header (red rounded card with logo, brand, ID, pills, metadata)
// =====================================================================
function ReportHeader({ incident }) {
  const severity = incident.safety_severity || incident.severity_safety || '';
  const psif = incident.psif_classification || '';
  const psifTone = /elevated/i.test(psif) ? 'dangerDark' : 'navy';

  return (
    <div style={{
      background: 'linear-gradient(135deg, #d71919 0%, #a80a0a 100%)',
      borderRadius: 14,
      padding: '22px 24px',
      color: 'white',
      marginBottom: 16,
      boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div style={{ display: 'flex', gap: 18, alignItems: 'center', flex: 1 }}>
          <img
            src={LOGO_URL}
            alt="AnthroSafe"
            crossOrigin="anonymous"
            style={{ width: 84, height: 84, objectFit: 'contain', flexShrink: 0, borderRadius: 8, background: 'rgba(255,255,255,0.05)' }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, letterSpacing: 2, opacity: 0.92, fontWeight: 700 }}>
              ANTHROSAFE™ FIELD DRIVEN SAFETY
            </div>
            <div style={{ fontSize: 30, fontWeight: 800, marginTop: 2, letterSpacing: -0.5 }}>
              {incident.incident_id || 'Investigation'}
            </div>
            <div style={{ fontSize: 14, opacity: 0.95, marginTop: 2 }}>
              {incident.investigation_type || 'Investigation'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
          {severity && <Pill tone="blue" label={`Severity ${severity}`} />}
          {psif && <Pill tone={psifTone} label={`PSIF: ${psif}`} />}
        </div>
      </div>

      <div style={{
        marginTop: 16,
        paddingTop: 14,
        borderTop: '1px solid rgba(255,255,255,0.22)',
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 12,
        fontSize: 11,
      }}>
        <Meta label="Date" value={formatDate(incident.incident_date)} />
        <Meta label="Company" value={incident.company_name || incident.company} />
        <Meta label="Location" value={incident.location_name || incident.location} />
        <Meta label="Status" value={incident.status} />
      </div>
    </div>
  );
}

function Meta({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 9, opacity: 0.75, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 600, marginTop: 2 }}>{value || '—'}</div>
    </div>
  );
}

function Pill({ label, tone }) {
  const tones = {
    blue:       { bg: '#2563eb', fg: '#fff' },
    navy:       { bg: '#1e3a5f', fg: '#fff' },
    dangerDark: { bg: '#1a1a1a', fg: '#fff' },
    success:    { bg: '#16a34a', fg: '#fff' },
    warning:    { bg: '#f59e0b', fg: '#fff' },
    danger:     { bg: '#dc2626', fg: '#fff' },
  };
  const t = tones[tone] || tones.navy;
  return (
    <span style={{
      background: t.bg, color: t.fg,
      padding: '4px 10px', borderRadius: 12,
      fontSize: 10, fontWeight: 700, textAlign: 'center',
      letterSpacing: 0.3, whiteSpace: 'nowrap',
    }}>{label}</span>
  );
}

// =====================================================================
// Section with red ribbon header
// =====================================================================
function Section({ icon, title, count, children, breakBefore }) {
  return (
    <section
      style={{
        marginBottom: 16,
        pageBreakInside: 'auto',
        breakInside: 'auto',
        pageBreakBefore: breakBefore ? 'always' : 'auto',
        breakBefore: breakBefore ? 'page' : 'auto',
      }}
      className={breakBefore ? 'section section-break-before' : 'section'}
    >
      <div className="section-header" style={{
        background: 'linear-gradient(90deg, #d71919 0%, #a80a0a 100%)',
        color: 'white',
        padding: '10px 16px',
        borderRadius: 6,
        fontSize: 13,
        fontWeight: 800,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
        pageBreakAfter: 'avoid',
        breakAfter: 'avoid',
      }}>
        {icon}
        <span>{title}{count !== undefined ? ` (${count})` : ''}</span>
      </div>
      <div style={{ padding: '12px 4px 0' }}>
        {children}
      </div>
    </section>
  );
}

// =====================================================================
// Incident Summary
// =====================================================================
function IncidentSummary({ incident, witnesses }) {
  const fields = [
    ['Incident ID',         incident.incident_id],
    ['Date',                formatDate(incident.incident_date)],
    ['Time',                incident.incident_time],
    ['Company',             incident.company_name || incident.company],
    ['Location',            incident.location_name || incident.location],
    ['Specific Location',   incident.specific_location_onsite],
    ['Operation Type',      incident.operation_type],
    ['Investigation Type',  incident.investigation_type],
    ['Reported By',         incident.reported_by_name || incident.reported_by || incident.submitted_by],
    ['Reporter Email',      incident.reported_by_email],
    ['Reporter Phone',      incident.reported_by_phone],
    ['Supervisor',          incident.supervisor_name],
    ['Supervisor Title',    incident.supervisor_title],
    ['Safety Severity',     incident.safety_severity || incident.severity_safety],
    ['Severity Meaning',    incident.safety_severity_description],
    ['Risk Ranking',        incident.risk_ranking || incident.risk_level],
    ['PSIF Classification', incident.psif_classification],
    ['Status',              incident.status],
  ].filter(([_, v]) => v);

  const mid = Math.ceil(fields.length / 2);
  const col1 = fields.slice(0, mid);
  const col2 = fields.slice(mid);

  const brief = incident.brief_description || incident.description;

  return (
    <div style={cardStyle}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 24px' }}>
        <div>{col1.map(([l, v]) => <FieldRow key={l} label={l} value={v} />)}</div>
        <div>{col2.map(([l, v]) => <FieldRow key={l} label={l} value={v} />)}</div>
      </div>

      {brief && (
        <div style={{ marginTop: 14 }}>
          <div style={blockLabelStyle}>Brief Description:</div>
          <div style={paraStyle}>{brief}</div>
        </div>
      )}
      {incident.detailed_description && (
        <div style={{ marginTop: 12 }}>
          <div style={blockLabelStyle}>Detailed Description:</div>
          <div style={paraStyle}>{incident.detailed_description}</div>
        </div>
      )}

      {/* Initial Witness callout (yellow) */}
      {witnesses.length > 0 && (
        <Callout tone="warning" title="Initial Witness Info" icon={<I.Users size={14} color="#92400e" />}>
          {witnesses.map((w, i) => {
            const name = w.name || w.witness_name;
            return <span key={w.id}>{i > 0 && ', '}{name || 'Unnamed'}</span>;
          })}
        </Callout>
      )}

      {/* Injured Person callout (green) - only if injury_occurred */}
      {incident.injury_occurred && (
        <Callout tone="success" title="Injured / Involved Person" icon={<I.User size={14} color="#166534" />}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 24px', fontSize: 12 }}>
            <FieldRow label="Name"        value={incident.injured_person_name || incident.injured_name} compact />
            <FieldRow label="Injury Type" value={incident.injury_nature || incident.injury_type} compact />
            <FieldRow label="Company"     value={incident.injured_person_company || incident.injured_company} compact />
            <FieldRow label="Body Part"   value={Array.isArray(incident.injured_body_parts) ? incident.injured_body_parts.join(', ') : (incident.body_part_affected || incident.injured_body_parts)} compact />
            <FieldRow label="Job Title"   value={incident.injured_person_position || incident.injured_job_title} compact />
            <FieldRow label="Time on Task" value={incident.injured_time_on_task} compact />
            <FieldRow label="Treatment"   value={incident.treatment_provided} compact />
            <FieldRow label="Physician"   value={incident.treating_physician} compact />
          </div>
        </Callout>
      )}
    </div>
  );
}

function FieldRow({ label, value, compact }) {
  if (!value) return null;
  return (
    <div style={{ fontSize: compact ? 11 : 12, lineHeight: 1.5, padding: '2px 0' }}>
      <span style={{ fontWeight: 700, color: '#1f2937' }}>{label}: </span>
      <span style={{ color: '#374151' }}>{value}</span>
    </div>
  );
}

// =====================================================================
// Initial Field-Report Findings
// =====================================================================
function InitialFindings({ incident }) {
  const blocks = [
    ['Immediate actions taken',  incident.immediate_actions_taken],
    ['Suspected root causes',    incident.suspected_root_causes],
    ['Causal factors',           incident.causal_factors],
    ['Initial lessons learned',  incident.lessons_learned_initial],
    ['Contributing factors (initial)', incident.contributing_factors_initial],
  ].filter(([_, v]) => v && typeof v === 'string' && v.trim());

  if (blocks.length === 0) return null;
  return (
    <div style={cardStyle}>
      {blocks.map(([label, val]) => (
        <div key={label} style={{ marginBottom: 12, breakInside: 'avoid', pageBreakInside: 'avoid' }}>
          <div style={blockLabelStyle}>{label}:</div>
          <div style={paraStyle}>{val}</div>
        </div>
      ))}
    </div>
  );
}

function Callout({ tone, title, icon, children }) {
  const tones = {
    warning: { bg: '#fffbeb', border: '#f59e0b', titleColor: '#92400e' },
    success: { bg: '#f0fdf4', border: '#16a34a', titleColor: '#166534' },
    info:    { bg: '#eff6ff', border: '#2563eb', titleColor: '#1e40af' },
    danger:  { bg: '#fef2f2', border: '#dc2626', titleColor: '#7f1d1d' },
  };
  const t = tones[tone] || tones.info;
  return (
    <div style={{
      marginTop: 14, padding: '12px 14px',
      background: t.bg, border: `1.5px solid ${t.border}`,
      borderRadius: 8, fontSize: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: t.titleColor, marginBottom: 6, fontSize: 12 }}>
        {icon}
        <span>{title}</span>
      </div>
      <div style={{ color: '#1f2937' }}>{children}</div>
    </div>
  );
}

// =====================================================================
// Timeline
// =====================================================================
function Timeline({ events }) {
  return (
    <div style={cardStyle}>
      {events.map((e, idx) => {
        const isCritical = e.is_critical || e.critical;
        const description = e.description || e.event_description || '';
        const dt = `${e.event_date || ''}${e.event_time ? ' ' + e.event_time.replace(/:\d\d$/, '') : ''}`.trim();
        return (
          <div key={e.id} style={{
            display: 'flex', gap: 10,
            padding: '8px 0',
            borderBottom: idx < events.length - 1 ? '1px solid #f3f4f6' : 'none',
            pageBreakInside: 'avoid',
          }}>
            <div style={{ minWidth: 28, fontSize: 12, fontWeight: 800, color: isCritical ? '#dc2626' : '#1f2937' }}>
              {idx + 1}.
            </div>
            <div style={{ flex: 1, fontSize: 12, lineHeight: 1.55 }}>
              <span style={{ fontWeight: 700, color: isCritical ? '#dc2626' : '#111827' }}>
                {dt}
              </span>
              <span style={{ color: isCritical ? '#dc2626' : '#4b5563', margin: '0 6px' }}>—</span>
              <span style={{ color: isCritical ? '#b91c1c' : '#374151', fontWeight: isCritical ? 600 : 400, whiteSpace: 'pre-wrap' }}>
                {description}
              </span>
              {isCritical && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  marginLeft: 8, fontSize: 10, fontWeight: 800, color: '#dc2626',
                  padding: '1px 6px', background: '#fef2f2', borderRadius: 3, border: '1px solid #fecaca',
                  whiteSpace: 'nowrap',
                }}>
                  <I.AlertTriangle size={10} color="#dc2626" /> CRITICAL
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// =====================================================================
// Evidence
// =====================================================================
function Evidence({ photos, compressedMap, ready }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: 14,
    }}>
      {photos.map((p, idx) => {
        const src = compressedMap[p.url] || p.url;
        return (
          <div key={p.key} style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#1f2937', marginBottom: 5 }}>
              {idx + 1}. {p.caption}
              {p.tag === 'INITIAL' && (
                <span style={{ marginLeft: 8, fontSize: 9, padding: '1px 6px', background: '#dbeafe', color: '#1e40af', borderRadius: 3, fontWeight: 700 }}>FIELD REPORT</span>
              )}
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: '#f9fafb', padding: 6, borderRadius: 6,
              height: 240, overflow: 'hidden',
            }}>
              <img
                src={src}
                alt={p.caption}
                style={{
                  maxWidth: '100%',
                  maxHeight: 228,
                  objectFit: 'contain',
                  borderRadius: 4,
                  border: '1px solid #e5e7eb',
                }}
              />
            </div>
          </div>
        );
      })}
      {!ready && (
        <div style={{ gridColumn: '1 / -1', fontSize: 11, fontStyle: 'italic', color: '#6b7280', textAlign: 'center', padding: 10 }}>
          Compressing photos for PDF... they will be embedded once ready.
        </div>
      )}
    </div>
  );
}

// =====================================================================
// Witnesses
// =====================================================================
function Witnesses({ witnesses }) {
  return (
    <div style={cardStyle}>
      {witnesses.map((w, i) => {
        const name = w.name || w.witness_name || 'Unnamed Witness';
        const position = w.position || w.position_role;
        const summary = w.summary || w.statement_summary;
        return (
          <div key={w.id} style={{
            marginBottom: 12, paddingBottom: 12,
            borderBottom: i < witnesses.length - 1 ? '1px solid #f3f4f6' : 'none',
            pageBreakInside: 'avoid',
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>
              {name}
              {position && <span style={{ fontWeight: 400, color: '#6b7280', fontSize: 11 }}> — {position}</span>}
              {w.company && <span style={{ fontWeight: 400, color: '#6b7280', fontSize: 11 }}> ({w.company})</span>}
            </div>
            {summary && <div style={{ ...paraStyle, marginTop: 4 }}>{summary}</div>}
            {w.additional_comments && (
              <div style={{ ...paraStyle, marginTop: 6, fontSize: 11, color: '#6b7280' }}>
                <em>Notes:</em> {w.additional_comments}
              </div>
            )}
            {w.acknowledgment && (
              <div style={{ fontSize: 10, color: '#16a34a', marginTop: 4, fontWeight: 600 }}>✓ Acknowledged</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// =====================================================================
// Analysis sections
// =====================================================================
function LocalReviewSection({ data }) {
  if (!data) return <EmptyMsg text="No local review entered yet." />;

  // Start with structured fields (new + legacy column names)
  let what       = data.what_happened || '';
  let immediate  = data.immediate_cause || data.immediate_causes || '';
  let contrib    = data.contributing    || data.findings         || '';
  let preventive = data.preventive      || data.do_differently   || '';
  let notes      = data.additional_notes || '';

  // Legacy rows often have everything dumped into analysis_text or review_text
  // as a single blob with embedded section headers. Parse it back into sections.
  const blob = data.analysis_text || data.review_text || '';
  if (blob && blob.length > (what.length + immediate.length + 80)) {
    const sections = parseAnalysisBlob(blob);
    if (sections.what_happened && sections.what_happened.length > what.length) what = sections.what_happened;
    if (!immediate  && sections.immediate_causes) immediate  = sections.immediate_causes;
    if (!contrib    && sections.contributing)     contrib    = sections.contributing;
    if (!preventive && sections.do_differently)   preventive = sections.do_differently;
    if (!notes      && sections.additional_notes) notes      = sections.additional_notes;
  }

  const blocks = [
    ['What Happened',             what],
    ['Immediate Causes',          immediate],
    ['Contributing Factors',      contrib],
    ['If You Could Do This Over', preventive],
    ['Additional Notes',          notes],
  ].filter(([_, v]) => v && typeof v === 'string' && v.trim());

  if (blocks.length === 0) return <EmptyMsg text="Local review fields are empty." />;
  return (
    <div style={cardStyle}>
      {blocks.map(([label, val]) => (
        <div key={label} style={{ marginBottom: 12 }}>
          <div style={blockLabelStyle}>{label}:</div>
          <div style={paraStyle}>{val}</div>
        </div>
      ))}
    </div>
  );
}

// Detect section headers like "What Happened:", "Immediate Causes:", etc. inside
// a single text blob and split them back into structured sections
function parseAnalysisBlob(text) {
  if (!text || typeof text !== 'string') return {};
  const labels = [
    { key: 'what_happened',    re: /^\s*What\s+Happened\s*:\s*/im },
    { key: 'immediate_causes', re: /^\s*Immediate\s+Causes?\s*:\s*/im },
    { key: 'contributing',     re: /^\s*Contributing(?:\s+Factors?)?\s*:\s*/im },
    { key: 'findings',         re: /^\s*Findings\s*:\s*/im },
    { key: 'do_differently',   re: /^\s*If\s+You\s+Could\s+Do\s+This\s+Over\s*:\s*/im },
    { key: 'additional_notes', re: /^\s*Additional\s+Notes\s*:\s*/im },
    { key: 'recommendations',  re: /^\s*Recommendations\s*:\s*/im },
  ];
  const hits = [];
  for (const { key, re } of labels) {
    const m = text.match(re);
    if (m && typeof m.index === 'number') hits.push({ key, start: m.index, headerLen: m[0].length });
  }
  hits.sort((a, b) => a.start - b.start);
  const out = {};
  for (let i = 0; i < hits.length; i++) {
    const h = hits[i];
    const contentStart = h.start + h.headerLen;
    const contentEnd = i + 1 < hits.length ? hits[i + 1].start : text.length;
    out[h.key] = text.substring(contentStart, contentEnd).trim();
  }
  return out;
}

function FiveWhySection({ data }) {
  if (!data) return <EmptyMsg text="No 5-Why analysis entered yet." />;
  const rootCause = data.root_cause || data.root_cause_identified;
  return (
    <div style={cardStyle}>
      {[1, 2, 3, 4, 5].map(n => {
        const v = data[`why${n}`];
        if (!v) return null;
        return (
          <div key={n} style={{ marginBottom: 10 }}>
            <div style={blockLabelStyle}>Why #{n}:</div>
            <div style={paraStyle}>{v}</div>
          </div>
        );
      })}
      {rootCause && (
        <div style={{
          marginTop: 14, padding: 12,
          background: '#fef3c7', border: '1.5px solid #f59e0b', borderRadius: 8,
        }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#dc2626', marginBottom: 4 }}>ROOT CAUSE</div>
          <div style={{ fontSize: 12, lineHeight: 1.55, color: '#111827' }}>{rootCause}</div>
        </div>
      )}
    </div>
  );
}

function RCASection({ factors, incident }) {
  const facMap = {};
  factors.forEach(f => { facMap[f.category] = f; });
  const activeFactors = RCA_CATEGORIES.filter(c => facMap[c.key]?.is_factor);

  return (
    <div style={cardStyle}>
      {activeFactors.length === 0 ? (
        <EmptyMsg text="No contributing factors flagged." />
      ) : (
        <>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>
            {activeFactors.length} of 10 categories identified as contributing factors:
          </div>
          {activeFactors.map(c => {
            const f = facMap[c.key];
            return (
              <div key={c.key} style={{
                marginBottom: 10, padding: 10,
                background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 6,
                pageBreakInside: 'avoid',
              }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#92400e' }}>{c.label}</div>
                {f.description && <div style={{ fontSize: 12, color: '#1f2937', marginTop: 4, whiteSpace: 'pre-wrap' }}>{f.description}</div>}
              </div>
            );
          })}
        </>
      )}
      {incident.root_cause_summary && (
        <div style={{
          marginTop: 14, padding: 12,
          background: '#fef3c7', border: '1.5px solid #f59e0b', borderRadius: 8,
        }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#dc2626', marginBottom: 4 }}>ROOT CAUSE SUMMARY</div>
          <div style={{ fontSize: 12, lineHeight: 1.55, color: '#111827', whiteSpace: 'pre-wrap' }}>
            {incident.root_cause_summary}
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================================================
// Corrective Actions
// =====================================================================
function CorrectiveActions({ actions }) {
  return (
    <div style={cardStyle}>
      {actions.map((c, i) => {
        const description = c.description || c.action_description || c.action || '';
        const owner = c.owner || c.action_owner_name || '';
        const dueDate = c.due_date || c.target_date;
        const status = c.status || c.action_status || 'Open';
        const hierarchyName = c.hierarchy_of_controls || c.hierarchy_control;
        const lvl = c.hierarchy_level;
        const lvlTone = lvl <= 2 ? '#16a34a' : lvl <= 3 ? '#2563eb' : lvl === 4 ? '#f59e0b' : '#dc2626';

        return (
          <div key={c.id} style={{
            marginBottom: 14, paddingBottom: 14,
            borderBottom: i < actions.length - 1 ? '1px solid #f3f4f6' : 'none',
            pageBreakInside: 'avoid',
          }}>
            <div style={{ fontSize: 12, color: '#111827', fontWeight: 600, lineHeight: 1.5 }}>
              <strong>{i + 1}.</strong> {description}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8, fontSize: 11, color: '#4b5563' }}>
              {hierarchyName && (
                <span>
                  <strong>Control:</strong>{' '}
                  <span style={{ color: lvlTone, fontWeight: 700 }}>
                    {lvl ? `${lvl}-${hierarchyName}` : hierarchyName}
                  </span>
                </span>
              )}
              {owner && <span><strong>Owner:</strong> {owner}</span>}
              {dueDate && <span><strong>Due:</strong> {formatDate(dueDate)}</span>}
              <span><strong>Status:</strong> {status}</span>
            </div>
            {c.hierarchy_justification && (
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6, fontStyle: 'italic' }}>
                Justification: {c.hierarchy_justification}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// =====================================================================
// Lessons Learned
// =====================================================================
function LessonsLearned({ lessons }) {
  return (
    <div style={cardStyle}>
      {lessons.map((l, i) => {
        const title = l.title || l.lesson_title || 'Lesson';
        const description = l.description || l.lesson_description;
        return (
          <div key={l.id} style={{
            marginBottom: 14, paddingBottom: 14,
            borderBottom: i < lessons.length - 1 ? '1px solid #f3f4f6' : 'none',
            pageBreakInside: 'avoid',
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{title}</div>
            {description && (
              <div style={{ ...paraStyle, marginTop: 6 }}>{description}</div>
            )}
            {l.key_takeaway && (
              <div style={{
                marginTop: 10, padding: '10px 12px',
                background: '#fef3c7', borderLeft: '4px solid #f59e0b', borderRadius: 4,
                fontSize: 12, color: '#7c2d12', fontStyle: 'italic',
              }}>
                <strong style={{ fontStyle: 'normal', color: '#92400e' }}>Key Takeaway: </strong>
                {l.key_takeaway}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// =====================================================================
// Investigation Checklist
// =====================================================================
function Checklist({ timeline, photos, witnesses, actions, lessons, hasAnalysis }) {
  const items = [
    { label: 'Timeline',  count: timeline.length,  done: timeline.length > 0 },
    { label: 'Evidence',  count: photos.length,    done: photos.length > 0 },
    { label: 'Witnesses', count: witnesses.length, done: witnesses.length > 0 },
    { label: 'Analysis',  count: null,             done: hasAnalysis },
    { label: 'Actions',   count: actions.length,   done: actions.length > 0 },
    { label: 'Lessons',   count: lessons.length,   done: lessons.length > 0 },
  ];
  return (
    <div style={{ ...cardStyle, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px' }}>
      {items.map(item => (
        <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 18, height: 18, borderRadius: 4,
            background: item.done ? '#16a34a' : '#e5e7eb',
            color: 'white', fontSize: 12, fontWeight: 800,
          }}>
            {item.done ? '✓' : ''}
          </span>
          <span style={{ color: '#1f2937', fontWeight: 600 }}>
            {item.label}{item.count !== null ? ` (${item.count})` : ''}
          </span>
        </div>
      ))}
    </div>
  );
}

// =====================================================================
// Footer (brand mark)
// =====================================================================
function ReportFooter() {
  return (
    <div style={{
      marginTop: 20, paddingTop: 14,
      borderTop: '2px solid #d71919',
      textAlign: 'center',
      pageBreakBefore: 'avoid',
      breakBefore: 'avoid',
      pageBreakInside: 'avoid',
      breakInside: 'avoid',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <img src={LOGO_URL} alt="" style={{ height: 24, width: 'auto', objectFit: 'contain' }} />
        <div style={{ fontSize: 12, fontWeight: 700, color: '#1f2937' }}>
          AnthroSafe™ Field Driven Safety
          <span style={{ color: '#6b7280', fontWeight: 400 }}> &nbsp;|&nbsp; © 2026 SLP Alaska, LLC</span>
        </div>
      </div>
      <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4 }}>
        Generated {new Date().toLocaleString()}
      </div>
    </div>
  );
}

// =====================================================================
// Loading / error screens
// =====================================================================
function FullScreenMessage({ text, tone }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#f3f4f6', padding: 24, fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{
        background: 'white', padding: 28, borderRadius: 12, border: '1px solid #e5e7eb',
        color: tone === 'danger' ? '#dc2626' : '#111827', fontSize: 14,
      }}>{text}</div>
    </div>
  );
}

function EmptyMsg({ text }) {
  return <div style={{ fontSize: 12, color: '#6b7280', fontStyle: 'italic', padding: 8 }}>{text}</div>;
}

// =====================================================================
// Print + base styles
// =====================================================================
function PrintStyles() {
  return (
    <style jsx global>{`
      @page {
        size: letter;
        margin: 0.45in 0.45in 0.55in 0.45in;
      }
      @media print {
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
          orphans: 3;
          widows: 3;
        }
        html, body {
          background: white !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .no-print { display: none !important; }
        .section { page-break-inside: auto; break-inside: auto; }
        .section-header {
          page-break-after: avoid !important;
          break-after: avoid !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        .avoid-break, .keep-together {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        .section-break-before {
          page-break-before: always !important;
          break-before: page !important;
        }
        img { max-width: 100% !important; page-break-inside: avoid; break-inside: avoid; }
        h1, h2, h3 { page-break-after: avoid; break-after: avoid; }
      }
      body {
        background: #f3f4f6;
        margin: 0;
        font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
        color: #111827;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    `}</style>
  );
}

// =====================================================================
// Style primitives
// =====================================================================
const reportContainerStyle = {
  maxWidth: 850,
  margin: '0 auto',
  padding: '24px',
  background: 'white',
  boxShadow: '0 0 20px rgba(0,0,0,0.06)',
};
const topBarStyle = {
  position: 'sticky', top: 0, zIndex: 10,
  background: '#1f2937', padding: '10px 20px',
  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
};
const cardStyle = {
  background: 'white',
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  padding: 16,
};
const blockLabelStyle = {
  fontSize: 12,
  fontWeight: 700,
  color: '#1f2937',
  marginBottom: 4,
  pageBreakAfter: 'avoid',
  breakAfter: 'avoid',
};
const paraStyle = {
  fontSize: 12,
  lineHeight: 1.55,
  color: '#374151',
  whiteSpace: 'pre-wrap',
  orphans: 3,
  widows: 3,
};
const btnPrimary = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  background: '#d71919', color: 'white',
  padding: '8px 16px', borderRadius: 6, border: 'none',
  fontSize: 13, fontWeight: 700, cursor: 'pointer',
};
const btnGhost = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  background: 'transparent', color: 'white',
  padding: '8px 14px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.3)',
  fontSize: 13, cursor: 'pointer',
};

// =====================================================================
// Utilities
// =====================================================================
function formatDate(d) {
  if (!d) return '';
  // CRITICAL: bare YYYY-MM-DD strings (Postgres `date` columns) are parsed by
  // new Date() as midnight UTC, which renders as the PREVIOUS day in Alaska.
  // Parse date-only strings as LOCAL dates so Aug 11 stays Aug 11.
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(d).trim());
  const dt = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

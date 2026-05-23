'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://iypezirwdlqpptjpeeyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
);

const BRAND_RED = '#D71919';
const BRAND_DARK = '#A80A0A';

const CRIT_COLORS = {
  Critical: { bg: '#D71919', color: '#fff', border: '#A80A0A' },
  High:     { bg: '#F59E0B', color: '#fff', border: '#B45309' },
  Standard: { bg: '#FEF3C7', color: '#78350F', border: '#FDE68A' }
};
const RESP_COLORS = {
  'Compliant':     { bg: '#D1FAE5', color: '#065F46', border: '#10B981' },
  'Non-Compliant': { bg: '#FEE2E2', color: '#991B1B', border: '#EF4444' },
  'N/A':           { bg: '#F3F4F6', color: '#374151', border: '#9CA3AF' },
  'Needs Action':  { bg: '#FEF3C7', color: '#92400E', border: '#F59E0B' },
  'Not Verified':  { bg: '#E0E7FF', color: '#3730A3', border: '#6366F1' }
};

export default function CampInspectionReport() {
  const params = useParams();
  const id = params?.id;
  const [loading, setLoading] = useState(true);
  const [insp, setInsp] = useState(null);
  const [responses, setResponses] = useState([]);
  const [cas, setCas] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => { if (id) loadData(id); }, [id]);

  async function loadData(inspectionId) {
    setLoading(true); setError('');
    try {
      const { data: i, error: ie } = await supabase
        .from('camp_inspections').select('*').eq('id', inspectionId).single();
      if (ie) throw ie;
      setInsp(i);

      const { data: rs, error: re } = await supabase
        .from('camp_inspection_responses').select('*').eq('inspection_id', inspectionId)
        .order('section_order', { ascending: true }).order('question_id', { ascending: true });
      if (re) throw re;
      setResponses(rs || []);

      const { data: cs } = await supabase
        .from('camp_corrective_actions').select('*').eq('inspection_id', inspectionId);
      setCas(cs || []);
    } catch (e) {
      setError(e.message || 'Failed to load inspection');
    } finally { setLoading(false); }
  }

  if (loading) return <PageShell><Box>Loading inspection…</Box></PageShell>;
  if (error)   return <PageShell><Box style={{ color: '#991B1B' }}>Error: {error}</Box></PageShell>;
  if (!insp)   return <PageShell><Box>Inspection not found.</Box></PageShell>;

  // Group responses by section
  const bySection = {};
  responses.forEach(r => {
    if (!bySection[r.section_order]) bySection[r.section_order] = { name: r.section, items: [] };
    bySection[r.section_order].items.push(r);
  });
  const sectionOrder = Object.keys(bySection).map(n => +n).sort((a, b) => a - b);

  const criticals = responses.filter(r => r.criticality === 'Critical' && (r.response === 'Non-Compliant' || r.response === 'Needs Action'));
  const allDef = responses.filter(r => r.response === 'Non-Compliant' || r.response === 'Needs Action');

  const goNoGo = insp.go_no_go;
  const goColors = {
    'go':          { bg: '#D1FAE5', color: '#065F46', label: '✅ GO' },
    'conditional': { bg: '#FEF3C7', color: '#92400E', label: '⚠ CONDITIONAL' },
    'no-go':       { bg: '#FEE2E2', color: '#991B1B', label: '⛔ NO-GO' }
  };
  const gg = goNoGo ? goColors[goNoGo] : null;

  return (
    <PageShell>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .print-page { background: #fff !important; padding: 0 !important; }
          .print-card { box-shadow: none !important; border: 1px solid #ccc !important; break-inside: avoid; }
        }
      `}</style>

      <div className="no-print" style={{ marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <Link href="/camp-inspection-dashboard" style={{ color: '#fbbf24', textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>← Back to Dashboard</Link>
        <button type="button" onClick={() => window.print()} style={{ padding: '6px 14px', background: BRAND_RED, color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>🖨 Print / Save PDF</button>
        {cas.length > 0 && (
          <Link href={`/camp-corrective-actions?inspection_id=${insp.id}`} style={{ padding: '6px 14px', background: '#F3F4F6', color: '#374151', border: '1px solid #D1D5DB', borderRadius: 4, fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>
            View {cas.length} Corrective Action{cas.length !== 1 ? 's' : ''}
          </Link>
        )}
      </div>

      {/* Header banner */}
      <Box className="print-card" style={{ borderTop: `6px solid ${BRAND_RED}`, marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Camp Inspection Report</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#1e3a5f', marginTop: 2 }}>{insp.camp_name}</div>
            <div style={{ fontSize: 16, color: '#374151', marginTop: 2 }}>{insp.company}</div>
          </div>
          {gg && (
            <div style={{ background: gg.bg, color: gg.color, padding: '10px 20px', borderRadius: 8, fontWeight: 800, fontSize: 20, textAlign: 'center' }}>
              {gg.label}
            </div>
          )}
        </div>

        <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, fontSize: 13 }}>
          <MetaItem label="Inspector" value={insp.inspector_name} />
          <MetaItem label="Date" value={insp.inspection_date} />
          <MetaItem label="Type" value={(insp.inspection_type || '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} />
          <MetaItem label="Status" value={insp.status} />
          <MetaItem label="Location" value={insp.location || '—'} />
          <MetaItem label="Weather" value={insp.weather_conditions || '—'} />
          <MetaItem label="GPS" value={insp.gps_lat && insp.gps_lng ? `${insp.gps_lat}, ${insp.gps_lng}` : '—'} />
          <MetaItem label="Submitted" value={insp.submitted_at ? new Date(insp.submitted_at).toLocaleString() : '—'} />
        </div>
      </Box>

      {/* Summary counters */}
      <Box className="print-card" style={{ marginBottom: 14 }}>
        <h3 style={sectionTitleStyle()}>Summary</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8 }}>
          <Counter label="Compliant" value={insp.compliant_count || 0} bg="#D1FAE5" color="#065F46" />
          <Counter label="Non-Compliant" value={insp.non_compliant_count || 0} bg="#FEE2E2" color="#991B1B" />
          <Counter label="Needs Action" value={insp.needs_action_count || 0} bg="#FEF3C7" color="#92400E" />
          <Counter label="N/A" value={insp.na_count || 0} bg="#F3F4F6" color="#374151" />
          <Counter label="Not Verified" value={insp.not_verified_count || 0} bg="#E0E7FF" color="#3730A3" />
          <Counter label="Critical" value={insp.critical_findings_count || 0} bg="#FEE2E2" color="#991B1B" />
          <Counter label="Compliance" value={`${insp.compliance_percent != null ? insp.compliance_percent : 0}%`} bg="#fff" color="#1e3a5f" />
        </div>
      </Box>

      {/* Critical findings call-out */}
      {criticals.length > 0 && (
        <Box className="print-card" style={{ marginBottom: 14, background: '#FEF2F2', borderLeft: `6px solid ${BRAND_RED}` }}>
          <h3 style={{ ...sectionTitleStyle(), color: '#991B1B' }}>⚠ {criticals.length} Critical Finding{criticals.length !== 1 ? 's' : ''}</h3>
          {criticals.map(r => (
            <div key={r.id} style={{ borderTop: '1px solid #FECACA', paddingTop: 8, marginTop: 8, fontSize: 13 }}>
              <div style={{ fontWeight: 700 }}>{r.question_id} · {r.subsection}</div>
              <div style={{ color: '#374151', marginTop: 2 }}>{r.question_text}</div>
              <div style={{ marginTop: 4 }}>
                <span style={{ ...badge(RESP_COLORS[r.response]?.bg, RESP_COLORS[r.response]?.color), fontSize: 11 }}>{r.response}</span>
                {r.comment && <span style={{ marginLeft: 8, color: '#374151', fontStyle: 'italic' }}>"{r.comment}"</span>}
              </div>
            </div>
          ))}
        </Box>
      )}

      {/* CA summary */}
      {cas.length > 0 && (
        <Box className="print-card" style={{ marginBottom: 14 }}>
          <h3 style={sectionTitleStyle()}>Corrective Actions ({cas.length})</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, marginBottom: 10 }}>
            {['open','in-progress','closed','verified','cancelled'].map(s => {
              const n = cas.filter(c => c.status === s).length;
              if (n === 0) return null;
              return <Counter key={s} label={s.replace(/-/g, ' ')} value={n} bg="#fff" color="#1e3a5f" />;
            })}
          </div>
          <div className="no-print" style={{ fontSize: 13 }}>
            <Link href={`/camp-corrective-actions?inspection_id=${insp.id}`} style={{ color: BRAND_RED, fontWeight: 600 }}>Manage corrective actions →</Link>
          </div>
        </Box>
      )}

      {/* Overall Condition & Findings (narrative) */}
      {insp.overall_findings && (
        <Box className="print-card" style={{ marginBottom: 14, borderLeft: `4px solid ${BRAND_RED}` }}>
          <h3 style={sectionTitleStyle()}>Overall Condition & Findings</h3>
          <div style={{ whiteSpace: 'pre-wrap', fontSize: 14, color: '#374151', lineHeight: 1.6 }}>{insp.overall_findings}</div>
        </Box>
      )}

      {/* General notes */}
      {insp.general_notes && (
        <Box className="print-card" style={{ marginBottom: 14 }}>
          <h3 style={sectionTitleStyle()}>General Notes</h3>
          <div style={{ whiteSpace: 'pre-wrap', fontSize: 14, color: '#374151' }}>{insp.general_notes}</div>
        </Box>
      )}

      {/* Section breakdown */}
      {sectionOrder.map(so => {
        const sec = bySection[so];
        return (
          <Box key={so} className="print-card" style={{ marginBottom: 14 }}>
            <h3 style={sectionTitleStyle()}>{sec.name}</h3>
            {sec.items.map(r => <ResponseRow key={r.id} r={r} />)}
          </Box>
        );
      })}

      <div style={{ textAlign: 'center', marginTop: 24, padding: 12, color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>
        AnthroSafe™ Field Driven Safety  •  © 2026 SLP Alaska, LLC
      </div>
    </PageShell>
  );
}

function ResponseRow({ r }) {
  const c = RESP_COLORS[r.response] || { bg: '#F3F4F6', color: '#374151', border: '#D1D5DB' };
  const crit = CRIT_COLORS[r.criticality] || CRIT_COLORS.Standard;
  const photos = r.photo_urls || [];
  return (
    <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 10, marginTop: 10, borderLeft: `4px solid ${c.border}`, paddingLeft: 10 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginBottom: 4 }}>
        <span style={{ background: '#111', color: '#fff', fontSize: 11, padding: '2px 6px', borderRadius: 3, fontWeight: 700 }}>{r.question_id}</span>
        <span style={{ ...badge(crit.bg, crit.color), border: `1px solid ${crit.border}`, fontSize: 10, textTransform: 'uppercase' }}>{r.criticality}</span>
        <span style={{ fontSize: 12, color: '#6B7280' }}>{r.subsection}</span>
        {r.response && <span style={{ ...badge(c.bg, c.color), fontSize: 11, marginLeft: 'auto', fontWeight: 700 }}>{r.response}</span>}
      </div>
      <div style={{ fontSize: 13, color: '#111', marginBottom: 4, lineHeight: 1.4 }}>{r.question_text}</div>
      {r.comment && (
        <div style={{ background: '#F9FAFB', borderLeft: '3px solid #9CA3AF', padding: '6px 10px', fontSize: 12, color: '#374151', borderRadius: 3, marginBottom: 6 }}>
          {r.comment}
        </div>
      )}
      {photos.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {photos.map((u, i) => (
            <a key={i} href={u} target="_blank" rel="noopener noreferrer" style={{ display: 'block' }}>
              <img src={u} alt={`Photo ${i+1}`} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 4, border: '1px solid #D1D5DB' }} />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function PageShell({ children }) {
  return (
    <div className="print-page" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)', padding: 16, fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div className="no-print" style={{ textAlign: 'center', padding: '12px 0', color: '#fff' }}>
          <img src="/AnthroSafe_Logo.PNG" alt="AnthroSafe" style={{ height: 50, marginBottom: 4, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }} onError={(e) => e.target.style.display = 'none'} />
          <h1 style={{ fontSize: 22, margin: 0, textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>Camp Inspection Report</h1>
        </div>
        {children}
      </div>
    </div>
  );
}

function Box({ children, style, className }) {
  return <div className={className} style={{ background: '#fff', borderRadius: 8, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', ...style }}>{children}</div>;
}
function MetaItem({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 13, color: '#111', marginTop: 2, fontWeight: 600 }}>{value}</div>
    </div>
  );
}
function Counter({ label, value, bg, color }) {
  return (
    <div style={{ background: bg, padding: 8, borderRadius: 4, textAlign: 'center', border: '1px solid #E5E7EB' }}>
      <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, color: '#374151', marginTop: 3, textTransform: 'capitalize' }}>{label}</div>
    </div>
  );
}
function sectionTitleStyle() {
  return { fontSize: 17, fontWeight: 700, color: BRAND_DARK, marginTop: 0, marginBottom: 10, paddingBottom: 6, borderBottom: '2px solid #E5E7EB' };
}
function badge(bg, color) {
  return { background: bg, color, padding: '2px 8px', borderRadius: 10, fontWeight: 600, display: 'inline-block' };
}

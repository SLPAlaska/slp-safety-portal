'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://iypezirwdlqpptjpeeyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
);

const BRAND_RED = '#D71919';
const BRAND_DARK = '#A80A0A';

export default function CampInspectionDashboard() {
  const [loading, setLoading] = useState(true);
  const [inspections, setInspections] = useState([]);
  const [caCounts, setCaCounts] = useState({}); // inspection_id -> { open, total, overdue }
  const [filters, setFilters] = useState({
    company: '', camp: '', status: 'all', dateRange: 'all', goNoGo: ''
  });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const { data: insps, error } = await supabase
        .from('camp_inspections')
        .select('*')
        .order('inspection_date', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      setInspections(insps || []);

      const { data: cas } = await supabase
        .from('camp_corrective_actions')
        .select('inspection_id, status, due_date');
      const today = new Date().toISOString().split('T')[0];
      const caMap = {};
      (cas || []).forEach(ca => {
        if (!caMap[ca.inspection_id]) caMap[ca.inspection_id] = { open: 0, total: 0, overdue: 0 };
        caMap[ca.inspection_id].total++;
        if (ca.status === 'open' || ca.status === 'in-progress') {
          caMap[ca.inspection_id].open++;
          if (ca.due_date && ca.due_date < today) caMap[ca.inspection_id].overdue++;
        }
      });
      setCaCounts(caMap);
    } catch (e) {
      console.error(e);
      alert('Failed to load inspections: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  const companies = useMemo(
    () => [...new Set(inspections.map(i => i.company).filter(Boolean))].sort(),
    [inspections]
  );

  const filtered = useMemo(() => {
    let arr = inspections;
    if (filters.company) arr = arr.filter(i => i.company === filters.company);
    if (filters.camp) arr = arr.filter(i => (i.camp_name || '').toLowerCase().includes(filters.camp.toLowerCase()));
    if (filters.status !== 'all') arr = arr.filter(i => i.status === filters.status);
    if (filters.goNoGo) arr = arr.filter(i => i.go_no_go === filters.goNoGo);
    if (filters.dateRange !== 'all') {
      const now = new Date();
      let cutoff = null;
      if (filters.dateRange === '7') cutoff = new Date(now.getTime() - 7*86400000);
      else if (filters.dateRange === '30') cutoff = new Date(now.getTime() - 30*86400000);
      else if (filters.dateRange === '90') cutoff = new Date(now.getTime() - 90*86400000);
      else if (filters.dateRange === 'ytd') cutoff = new Date(now.getFullYear(), 0, 1);
      else if (filters.dateRange === '365') cutoff = new Date(now.getTime() - 365*86400000);
      if (cutoff) arr = arr.filter(i => i.inspection_date && new Date(i.inspection_date) >= cutoff);
    }
    return arr;
  }, [inspections, filters]);

  const stats = useMemo(() => {
    const s = { total: filtered.length, inProgress: 0, submitted: 0, approved: 0, closed: 0,
                go: 0, conditional: 0, noGo: 0, critical: 0, openCAs: 0, overdueCAs: 0 };
    filtered.forEach(i => {
      s[({ 'in-progress':'inProgress', 'submitted':'submitted', 'approved':'approved', 'closed':'closed' })[i.status]]++;
      if (i.go_no_go === 'go') s.go++;
      else if (i.go_no_go === 'conditional') s.conditional++;
      else if (i.go_no_go === 'no-go') s.noGo++;
      s.critical += i.critical_findings_count || 0;
      const c = caCounts[i.id];
      if (c) { s.openCAs += c.open; s.overdueCAs += c.overdue; }
    });
    return s;
  }, [filtered, caCounts]);

  function resetFilters() {
    setFilters({ company: '', camp: '', status: 'all', dateRange: 'all', goNoGo: '' });
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)', padding: 16, fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', padding: '16px 0', color: '#fff' }}>
          <img src="/AnthroSafe_Logo.PNG" alt="AnthroSafe" style={{ height: 60, marginBottom: 8, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }} onError={(e) => e.target.style.display = 'none'} />
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>Camp Inspection Dashboard</h1>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 4 }}>All remote camp inspections — filter, review, follow up</div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <Link href="/" style={{ color: '#fbbf24', textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>← Back to Portal</Link>
          {' · '}
          <Link href="/camp-inspection" style={{ color: '#fbbf24', textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>+ New Inspection</Link>
          {' · '}
          <Link href="/camp-corrective-actions" style={{ color: '#fbbf24', textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>Corrective Actions →</Link>
        </div>

        {/* Stat tiles */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 14 }}>
          <Stat label="Total" value={stats.total} bg="#fff" color="#1e3a5f" />
          <Stat label="In Progress" value={stats.inProgress} bg="#E0E7FF" color="#3730A3" />
          <Stat label="Submitted" value={stats.submitted} bg="#D1FAE5" color="#065F46" />
          <Stat label="GO" value={stats.go} bg="#D1FAE5" color="#065F46" />
          <Stat label="Conditional" value={stats.conditional} bg="#FEF3C7" color="#92400E" />
          <Stat label="NO-GO" value={stats.noGo} bg="#FEE2E2" color="#991B1B" />
          <Stat label="Critical Findings" value={stats.critical} bg="#FEE2E2" color="#991B1B" />
          <Stat label="Open CAs" value={stats.openCAs} bg="#FEF3C7" color="#92400E" sub={stats.overdueCAs > 0 ? `${stats.overdueCAs} overdue` : null} subColor="#B91C1C" />
        </div>

        {/* Filter bar */}
        <div style={{ background: '#fff', borderRadius: 8, padding: 12, marginBottom: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
            <FilterField label="Client">
              <select value={filters.company} onChange={e => setFilters({ ...filters, company: e.target.value })} style={selectStyle()}>
                <option value="">All clients</option>
                {companies.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </FilterField>
            <FilterField label="Camp">
              <input type="text" placeholder="Search camp name…" value={filters.camp} onChange={e => setFilters({ ...filters, camp: e.target.value })} style={selectStyle()} />
            </FilterField>
            <FilterField label="Status">
              <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })} style={selectStyle()}>
                <option value="all">All statuses</option>
                <option value="in-progress">In Progress</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
                <option value="closed">Closed</option>
              </select>
            </FilterField>
            <FilterField label="Go/No-Go">
              <select value={filters.goNoGo} onChange={e => setFilters({ ...filters, goNoGo: e.target.value })} style={selectStyle()}>
                <option value="">Any</option>
                <option value="go">GO</option>
                <option value="conditional">Conditional</option>
                <option value="no-go">NO-GO</option>
              </select>
            </FilterField>
            <FilterField label="Date Range">
              <select value={filters.dateRange} onChange={e => setFilters({ ...filters, dateRange: e.target.value })} style={selectStyle()}>
                <option value="all">All time</option>
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="ytd">Year to date</option>
                <option value="365">Last 365 days</option>
              </select>
            </FilterField>
            <FilterField label=" ">
              <button type="button" onClick={resetFilters} style={{ padding: '8px 12px', background: '#F3F4F6', border: '1px solid #D1D5DB', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Reset Filters</button>
            </FilterField>
          </div>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 8 }}>
            Showing <strong>{filtered.length}</strong> of {inspections.length} inspections
          </div>
        </div>

        {/* Inspection cards */}
        {loading ? (
          <div style={{ background: '#fff', borderRadius: 8, padding: 40, textAlign: 'center', color: '#6B7280' }}>Loading inspections…</div>
        ) : filtered.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 8, padding: 40, textAlign: 'center', color: '#6B7280' }}>
            No inspections match those filters.
            {inspections.length === 0 && <div style={{ marginTop: 12 }}><Link href="/camp-inspection" style={{ color: BRAND_RED, fontWeight: 600 }}>Start the first inspection →</Link></div>}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(i => <InspectionCard key={i.id} insp={i} caInfo={caCounts[i.id] || { open: 0, total: 0, overdue: 0 }} />)}
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 24, padding: 12, color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>
          AnthroSafe™ Field Driven Safety  •  © 2026 SLP Alaska, LLC
        </div>
      </div>
    </div>
  );
}

function InspectionCard({ insp, caInfo }) {
  const statusColors = {
    'in-progress': { bg: '#E0E7FF', color: '#3730A3', label: 'In Progress' },
    'submitted':   { bg: '#D1FAE5', color: '#065F46', label: 'Submitted'   },
    'approved':    { bg: '#A7F3D0', color: '#064E3B', label: 'Approved'    },
    'closed':      { bg: '#E5E7EB', color: '#374151', label: 'Closed'      }
  };
  const goColors = {
    'go':          { bg: '#D1FAE5', color: '#065F46', label: '✅ GO' },
    'conditional': { bg: '#FEF3C7', color: '#92400E', label: '⚠ CONDITIONAL' },
    'no-go':       { bg: '#FEE2E2', color: '#991B1B', label: '⛔ NO-GO' }
  };
  const st = statusColors[insp.status] || { bg: '#F3F4F6', color: '#374151', label: insp.status };
  const gg = insp.go_no_go ? goColors[insp.go_no_go] : null;
  const compPct = insp.compliance_percent != null ? insp.compliance_percent : 0;

  return (
    <div style={{ background: '#fff', borderRadius: 8, padding: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: `4px solid ${insp.critical_findings_count > 0 ? BRAND_RED : '#10B981'}` }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr) auto', gap: 12, alignItems: 'start' }}>
        {/* Identity */}
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginBottom: 4 }}>
            <span style={{ ...badgeStyle(st.bg, st.color) }}>{st.label}</span>
            {gg && <span style={{ ...badgeStyle(gg.bg, gg.color), fontWeight: 700 }}>{gg.label}</span>}
            <span style={{ fontSize: 11, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>{insp.inspection_type}</span>
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#1e3a5f', marginBottom: 2 }}>{insp.camp_name}</div>
          <div style={{ fontSize: 13, color: '#374151' }}>{insp.company}</div>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
            {insp.inspection_date} · {insp.inspector_name}
            {insp.location ? ` · ${insp.location}` : ''}
          </div>
        </div>

        {/* Findings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
          {insp.critical_findings_count > 0 && (
            <div style={{ color: '#991B1B', fontWeight: 700 }}>⚠ {insp.critical_findings_count} Critical</div>
          )}
          <div style={{ color: '#991B1B' }}>Non-Compliant: <strong>{insp.non_compliant_count || 0}</strong></div>
          <div style={{ color: '#92400E' }}>Needs Action: <strong>{insp.needs_action_count || 0}</strong></div>
          <div style={{ color: '#374151' }}>Compliance: <strong>{compPct}%</strong></div>
        </div>

        {/* CA info */}
        <div style={{ fontSize: 13, color: '#374151' }}>
          <div>Corrective Actions: <strong>{caInfo.total}</strong></div>
          {caInfo.open > 0 && <div style={{ color: '#92400E' }}>Open: <strong>{caInfo.open}</strong></div>}
          {caInfo.overdue > 0 && <div style={{ color: '#991B1B', fontWeight: 700 }}>Overdue: {caInfo.overdue}</div>}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Link href={`/camp-inspection-report/${insp.id}`} style={{ ...buttonStyle('primary'), textDecoration: 'none', textAlign: 'center', fontSize: 13 }}>View Report</Link>
          {caInfo.total > 0 && (
            <Link href={`/camp-corrective-actions?inspection_id=${insp.id}`} style={{ ...buttonStyle('secondary'), textDecoration: 'none', textAlign: 'center', fontSize: 12 }}>View {caInfo.total} CA{caInfo.total !== 1 ? 's' : ''}</Link>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, bg, color, sub, subColor }) {
  return (
    <div style={{ background: bg, borderRadius: 6, padding: 10, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      <div style={{ fontSize: 24, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, color: '#374151', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: subColor || '#6B7280', marginTop: 2, fontWeight: 700 }}>{sub}</div>}
    </div>
  );
}

function FilterField({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      {children}
    </div>
  );
}

function selectStyle() {
  return { width: '100%', padding: '8px 10px', fontSize: 13, borderRadius: 4, border: '1px solid #D1D5DB', boxSizing: 'border-box', background: '#fff' };
}
function badgeStyle(bg, color) {
  return { background: bg, color, fontSize: 11, padding: '2px 8px', borderRadius: 12, fontWeight: 600, display: 'inline-block' };
}
function buttonStyle(variant) {
  if (variant === 'primary') return { padding: '6px 12px', background: BRAND_RED, color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 700, fontSize: 13 };
  return { padding: '6px 12px', background: '#F3F4F6', color: '#374151', border: '1px solid #D1D5DB', borderRadius: 4, cursor: 'pointer', fontWeight: 600, fontSize: 12 };
}

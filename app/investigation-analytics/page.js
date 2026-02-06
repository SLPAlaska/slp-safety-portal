'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://iypezirwdlqpptjpeeyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
);

const SLP_DOMAIN = '@slpalaska.com';

// Color palettes
const COLORS = {
  primary: '#991b1b',
  secondary: '#1e3a8a',
  navy: '#1e3a5f',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#dc2626',
  purple: '#7c3aed',
  teal: '#0d9488',
  chart: ['#991b1b', '#1e3a8a', '#22c55e', '#f59e0b', '#7c3aed', '#0d9488', '#dc2626', '#6366f1', '#ec4899', '#14b8a6']
};

const SEVERITY_COLORS = {
  'A': '#7F1D1D', 'B': '#991B1B', 'C': '#B91C1C', 'D': '#DC2626',
  'E': '#F97316', 'F': '#EAB308', 'G': '#22C55E'
};

const PSIF_COLORS = {
  'SIF-Actual': '#1f2937',
  'PSIF-Critical': '#dc2626',
  'PSIF-High': '#ea580c',
  'PSIF-Elevated': '#eab308',
  'STKY-Controlled': '#22c55e',
  'Non-STKY': '#3b82f6'
};

const ROOT_CAUSE_CATEGORIES = [
  'Human Factors', 'Equipment/Machinery', 'Environmental', 'Organizational',
  'Procedural', 'Design/Engineering', 'Communication', 'Training/Competency',
  'Supervision', 'External Factors'
];

const styles = {
  container: { minHeight: '100vh', background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)', padding: '20px' },
  wrapper: { maxWidth: '1400px', margin: '0 auto' },
  header: { background: 'linear-gradient(135deg, #991b1b 0%, #c41e3a 100%)', borderRadius: '16px 16px 0 0', padding: '20px 25px', color: 'white' },
  headerContent: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' },
  headerTitle: { fontSize: '28px', fontWeight: '700' },
  headerSubtitle: { fontSize: '14px', opacity: 0.9, marginTop: '5px' },
  card: { background: '#fff', borderRadius: '0 0 16px 16px', padding: '25px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' },
  loginCard: { background: '#fff', borderRadius: '16px', padding: '40px', maxWidth: '450px', margin: '50px auto', boxShadow: '0 10px 40px rgba(0,0,0,0.2)', textAlign: 'center' },
  kpiRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '25px' },
  kpiCard: { background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', borderRadius: '12px', padding: '20px', border: '2px solid #e2e8f0', position: 'relative', overflow: 'hidden' },
  kpiValue: { fontSize: '36px', fontWeight: '700', marginBottom: '5px' },
  kpiLabel: { fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px' },
  kpiTrend: { fontSize: '12px', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '5px' },
  kpiIcon: { position: 'absolute', top: '15px', right: '15px', fontSize: '24px', opacity: 0.3 },
  chartSection: { marginBottom: '25px' },
  chartCard: { background: '#fff', borderRadius: '12px', padding: '20px', border: '2px solid #e2e8f0' },
  chartTitle: { fontSize: '16px', fontWeight: '700', color: '#1e293b', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' },
  chartGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', marginBottom: '25px' },
  sectionHeader: { background: '#1e3a8a', color: 'white', padding: '12px 20px', borderRadius: '8px', fontSize: '16px', fontWeight: '600', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' },
  filterRow: { display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'flex-end' },
  filterGroup: { display: 'flex', flexDirection: 'column', gap: '5px' },
  filterLabel: { fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' },
  select: { padding: '10px 15px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', minWidth: '160px' },
  input: { width: '100%', padding: '12px 15px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box' },
  actionBtn: { padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
  primaryBtn: { background: 'linear-gradient(135deg, #991b1b 0%, #c41e3a 100%)', color: 'white' },
  secondaryBtn: { background: '#1e3a8a', color: 'white' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  th: { background: '#1e3a8a', color: 'white', padding: '12px 15px', textAlign: 'left', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase' },
  td: { padding: '12px 15px', borderBottom: '1px solid #e2e8f0' },
  barContainer: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' },
  barLabel: { width: '140px', fontSize: '13px', color: '#475569', flexShrink: 0 },
  barTrack: { flex: 1, height: '24px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '8px', color: 'white', fontSize: '12px', fontWeight: '600', transition: 'width 0.5s ease' },
  footer: { textAlign: 'center', padding: '20px', color: 'white', fontSize: '13px' },
  submitBtn: { width: '100%', padding: '14px', background: 'linear-gradient(135deg, #991b1b 0%, #c41e3a 100%)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' },
  badge: { display: 'inline-block', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' },
  heatmapCell: { padding: '8px', textAlign: 'center', borderRadius: '4px', fontSize: '14px', fontWeight: '600' },
  insightCard: { background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', border: '2px solid #f59e0b', borderRadius: '12px', padding: '20px', marginBottom: '15px' },
  alertCard: { background: 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)', border: '2px solid #dc2626', borderRadius: '12px', padding: '20px', marginBottom: '15px' }
};

function isSLPTeam(email) { return email && email.toLowerCase().endsWith(SLP_DOMAIN); }
function formatDate(d) { return d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'; }

// Simple SVG Chart Components
function BarChart({ data, maxValue, color = COLORS.primary }) {
  const max = maxValue || Math.max(...data.map(d => d.value), 1);
  return (
    <div>
      {data.map((item, i) => (
        <div key={i} style={styles.barContainer}>
          <div style={styles.barLabel}>{item.label}</div>
          <div style={styles.barTrack}>
            <div style={{ ...styles.barFill, width: `${(item.value / max) * 100}%`, background: item.color || color }}>
              {item.value > 0 && item.value}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ data, size = 200 }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return <div style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>No data</div>;
  
  let cumulativePercent = 0;
  const radius = size / 2 - 20;
  const circumference = 2 * Math.PI * radius;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#f1f5f9" strokeWidth="30" />
        {data.map((item, i) => {
          const percent = item.value / total;
          const strokeDasharray = `${percent * circumference} ${circumference}`;
          const strokeDashoffset = -cumulativePercent * circumference;
          cumulativePercent += percent;
          return (
            <circle
              key={i}
              cx={size/2}
              cy={size/2}
              r={radius}
              fill="none"
              stroke={item.color}
              strokeWidth="30"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
            />
          );
        })}
        <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="middle" style={{ transform: 'rotate(90deg)', transformOrigin: 'center', fontSize: '24px', fontWeight: '700', fill: '#1e293b' }}>
          {total}
        </text>
      </svg>
      <div>
        {data.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: item.color }} />
            <span style={{ fontSize: '13px', color: '#475569' }}>{item.label}: <strong>{item.value}</strong> ({total > 0 ? Math.round(item.value/total*100) : 0}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrendLine({ data, height = 60, color = COLORS.primary }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const width = 100;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - (v / max) * height}`).join(' ');
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" />
    </svg>
  );
}

export default function InvestigationAnalytics() {
  const [userEmail, setUserEmail] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Filter state
  const [dateRange, setDateRange] = useState('ytd');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [companies, setCompanies] = useState([]);
  
  // Data state
  const [incidents, setIncidents] = useState([]);
  const [correctiveActions, setCAs] = useState([]);
  const [kpis, setKpis] = useState({});
  const [charts, setCharts] = useState({});
  const [insights, setInsights] = useState([]);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('slp_user_email');
    if (saved && isSLPTeam(saved)) {
      setUserEmail(saved);
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAuthenticated) fetchData();
  }, [isAuthenticated, dateRange, companyFilter]);

  async function fetchData() {
    setLoading(true);
    try {
      // Calculate date range
      const now = new Date();
      let startDate;
      switch (dateRange) {
        case '30d': startDate = new Date(now.setDate(now.getDate() - 30)); break;
        case '90d': startDate = new Date(now.setDate(now.getDate() - 90)); break;
        case 'ytd': startDate = new Date(now.getFullYear(), 0, 1); break;
        case '12m': startDate = new Date(now.setFullYear(now.getFullYear() - 1)); break;
        default: startDate = new Date(now.getFullYear(), 0, 1);
      }
      const startDateStr = startDate.toISOString().split('T')[0];

      // Fetch incidents
      let incQuery = supabase
        .from('incidents')
        .select('*')
        .gte('incident_date', startDateStr)
        .order('incident_date', { ascending: false });

      if (companyFilter !== 'all') {
        incQuery = incQuery.eq('company_name', companyFilter);
      }

      const { data: incData } = await incQuery;
      setIncidents(incData || []);

      // Fetch corrective actions
      let caQuery = supabase
        .from('investigation_corrective_actions')
        .select(`*, incidents(company_name, incident_date)`)
        .order('target_date', { ascending: true });

      const { data: caData } = await caQuery;
      let filteredCAs = caData || [];
      if (companyFilter !== 'all') {
        filteredCAs = filteredCAs.filter(ca => ca.incidents?.company_name === companyFilter);
      }
      setCAs(filteredCAs);

      // Get unique companies
      const allCompanies = [...new Set((incData || []).map(i => i.company_name).filter(Boolean))];
      setCompanies(allCompanies.sort());

      // Calculate KPIs and charts
      calculateMetrics(incData || [], filteredCAs);
    } catch (e) {
      console.error('Error fetching data:', e);
    }
    setLoading(false);
  }

  function calculateMetrics(incidents, cas) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // KPIs
    const totalIncidents = incidents.length;
    const sifCount = incidents.filter(i => i.is_sif).length;
    const psifCount = incidents.filter(i => i.is_sif_p && !i.is_sif).length;
    const stkyCount = incidents.filter(i => i.psif_classification?.includes('STKY')).length;
    const openInvestigations = incidents.filter(i => !['Closed', 'Approved'].includes(i.status)).length;
    const overdueInvestigations = incidents.filter(i => 
      i.investigation_deadline && 
      new Date(i.investigation_deadline) < today && 
      !['Closed', 'Approved'].includes(i.status)
    ).length;

    const totalCAs = cas.length;
    const openCAs = cas.filter(ca => !['Completed', 'Verified'].includes(ca.action_status)).length;
    const overdueCAs = cas.filter(ca => 
      ca.target_date && 
      new Date(ca.target_date) < today && 
      !['Completed', 'Verified'].includes(ca.action_status)
    ).length;
    const closedCAs = cas.filter(ca => ['Completed', 'Verified'].includes(ca.action_status)).length;
    const caClosureRate = totalCAs > 0 ? Math.round((closedCAs / totalCAs) * 100) : 0;

    // Average investigation duration (for closed investigations)
    const closedInvestigations = incidents.filter(i => ['Closed', 'Approved'].includes(i.status) && i.incident_date && i.updated_at);
    let avgDuration = 0;
    if (closedInvestigations.length > 0) {
      const totalDays = closedInvestigations.reduce((sum, i) => {
        const start = new Date(i.incident_date);
        const end = new Date(i.updated_at);
        return sum + Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      }, 0);
      avgDuration = Math.round(totalDays / closedInvestigations.length);
    }

    setKpis({
      totalIncidents,
      sifCount,
      psifCount,
      stkyCount,
      openInvestigations,
      overdueInvestigations,
      totalCAs,
      openCAs,
      overdueCAs,
      caClosureRate,
      avgDuration
    });

    // PSIF Classification Distribution
    const psifDistribution = [
      { label: 'SIF-Actual', value: incidents.filter(i => i.psif_classification === 'SIF-Actual').length, color: PSIF_COLORS['SIF-Actual'] },
      { label: 'PSIF-Critical', value: incidents.filter(i => i.psif_classification === 'PSIF-Critical').length, color: PSIF_COLORS['PSIF-Critical'] },
      { label: 'PSIF-High', value: incidents.filter(i => i.psif_classification === 'PSIF-High').length, color: PSIF_COLORS['PSIF-High'] },
      { label: 'PSIF-Elevated', value: incidents.filter(i => i.psif_classification === 'PSIF-Elevated').length, color: PSIF_COLORS['PSIF-Elevated'] },
      { label: 'STKY-Controlled', value: incidents.filter(i => i.psif_classification === 'STKY-Controlled').length, color: PSIF_COLORS['STKY-Controlled'] },
      { label: 'Non-STKY', value: incidents.filter(i => i.psif_classification === 'Non-STKY').length, color: PSIF_COLORS['Non-STKY'] }
    ];

    // Severity Distribution
    const severityDistribution = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(sev => ({
      label: `Severity ${sev}`,
      value: incidents.filter(i => i.safety_severity === sev).length,
      color: SEVERITY_COLORS[sev]
    }));

    // Investigation Type Distribution
    const invTypeDistribution = [
      { label: 'Local Review', value: incidents.filter(i => i.investigation_type === 'Local Review').length, color: COLORS.success },
      { label: '5-Why Analysis', value: incidents.filter(i => i.investigation_type === '5-Why Analysis').length, color: COLORS.warning },
      { label: 'Root Cause Analysis', value: incidents.filter(i => i.investigation_type === 'Root Cause Analysis').length, color: COLORS.danger }
    ];

    // Incident Types
    const incidentTypeCounts = {};
    incidents.forEach(i => {
      const types = i.incident_types || [];
      types.forEach(t => {
        incidentTypeCounts[t] = (incidentTypeCounts[t] || 0) + 1;
      });
    });
    const incidentTypeDistribution = Object.entries(incidentTypeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([ label, value ], i) => ({ label, value, color: COLORS.chart[i % COLORS.chart.length] }));

    // Company Distribution
    const companyCounts = {};
    incidents.forEach(i => {
      if (i.company_name) {
        companyCounts[i.company_name] = (companyCounts[i.company_name] || 0) + 1;
      }
    });
    const companyDistribution = Object.entries(companyCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([ label, value ], i) => ({ label, value, color: COLORS.chart[i % COLORS.chart.length] }));

    // Monthly Trend
    const monthlyData = {};
    incidents.forEach(i => {
      if (i.incident_date) {
        const month = i.incident_date.substring(0, 7);
        monthlyData[month] = (monthlyData[month] || 0) + 1;
      }
    });
    const months = Object.keys(monthlyData).sort();
    const monthlyTrend = months.map(m => ({
      label: new Date(m + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      value: monthlyData[m]
    }));

    // Hierarchy of Controls Distribution
    const hocCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    cas.forEach(ca => {
      const level = parseInt(ca.hierarchy_control?.charAt(0));
      if (level >= 1 && level <= 5) hocCounts[level]++;
    });
    const hocDistribution = [
      { label: '1-Elimination', value: hocCounts[1], color: '#166534' },
      { label: '2-Substitution', value: hocCounts[2], color: '#15803d' },
      { label: '3-Engineering', value: hocCounts[3], color: '#eab308' },
      { label: '4-Administrative', value: hocCounts[4], color: '#f97316' },
      { label: '5-PPE', value: hocCounts[5], color: '#dc2626' }
    ];

    setCharts({
      psifDistribution,
      severityDistribution,
      invTypeDistribution,
      incidentTypeDistribution,
      companyDistribution,
      monthlyTrend,
      hocDistribution
    });

    // Generate Insights
    const newInsights = [];
    const newAlerts = [];

    // Alert: Overdue investigations
    if (overdueInvestigations > 0) {
      newAlerts.push({
        type: 'danger',
        title: `${overdueInvestigations} Overdue Investigation${overdueInvestigations > 1 ? 's' : ''}`,
        message: 'Investigations past their deadline require immediate attention.'
      });
    }

    // Alert: Overdue CAs
    if (overdueCAs > 0) {
      newAlerts.push({
        type: 'danger',
        title: `${overdueCAs} Overdue Corrective Action${overdueCAs > 1 ? 's' : ''}`,
        message: 'Action items past their target date need follow-up.'
      });
    }

    // Alert: SIF events
    if (sifCount > 0) {
      newAlerts.push({
        type: 'critical',
        title: `${sifCount} SIF Event${sifCount > 1 ? 's' : ''} Recorded`,
        message: 'Serious Injury/Fatality events require thorough investigation and executive review.'
      });
    }

    // Insight: PSIF rate
    const psifRate = totalIncidents > 0 ? Math.round(((sifCount + psifCount) / totalIncidents) * 100) : 0;
    if (psifRate > 20) {
      newInsights.push({
        type: 'warning',
        title: `${psifRate}% SIF Potential Rate`,
        message: 'Higher than target - review high energy controls and critical tasks.'
      });
    } else if (psifRate <= 10 && totalIncidents >= 10) {
      newInsights.push({
        type: 'positive',
        title: `${psifRate}% SIF Potential Rate`,
        message: 'Below target - direct energy controls are effective.'
      });
    }

    // Insight: CA closure rate
    if (caClosureRate >= 80 && totalCAs >= 10) {
      newInsights.push({
        type: 'positive',
        title: `${caClosureRate}% CA Closure Rate`,
        message: 'Excellent corrective action completion rate.'
      });
    } else if (caClosureRate < 50 && totalCAs >= 10) {
      newInsights.push({
        type: 'warning',
        title: `${caClosureRate}% CA Closure Rate`,
        message: 'Below target - review action ownership and deadlines.'
      });
    }

    // Insight: Hierarchy of Controls
    const highLevelControls = hocCounts[1] + hocCounts[2] + hocCounts[3];
    const lowLevelControls = hocCounts[4] + hocCounts[5];
    if (totalCAs > 10 && lowLevelControls > highLevelControls * 2) {
      newInsights.push({
        type: 'warning',
        title: 'Control Hierarchy Opportunity',
        message: 'Most CAs are Administrative/PPE. Look for Elimination, Substitution, or Engineering controls.'
      });
    }

    setInsights(newInsights);
    setAlerts(newAlerts);
  }

  function handleLogin(e) {
    e.preventDefault();
    if (!loginEmail) { setLoginError('Enter email'); return; }
    if (!isSLPTeam(loginEmail)) { setLoginError('Access restricted to @slpalaska.com'); return; }
    localStorage.setItem('slp_user_email', loginEmail.toLowerCase());
    setUserEmail(loginEmail.toLowerCase());
    setIsAuthenticated(true);
  }

  function handleLogout() {
    localStorage.removeItem('slp_user_email');
    setUserEmail('');
    setIsAuthenticated(false);
  }

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div style={styles.container}>
        <div style={styles.wrapper}>
          <a href="/" style={{ display: 'inline-block', marginBottom: '15px', padding: '10px 20px', backgroundColor: '#1e3a5f', color: '#fff', textDecoration: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '500' }}>← Back to Portal</a>
          <div style={styles.loginCard}>
            <img src="/Logo.png" alt="SLP Alaska" style={{ maxWidth: '200px', margin: '0 auto 25px', display: 'block' }} />
            <h1 style={{ color: '#1e293b', marginBottom: '10px', fontSize: '24px' }}>Investigation Analytics</h1>
            <p style={{ color: '#64748b', marginBottom: '30px' }}>Sign in to view analytics dashboard</p>
            <form onSubmit={handleLogin}>
              <input type="email" placeholder="your.name@slpalaska.com" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} style={styles.input} />
              {loginError && <p style={{ color: '#dc2626', fontSize: '14px', marginBottom: '15px' }}>{loginError}</p>}
              <button type="submit" style={styles.submitBtn}>Sign In</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Main Dashboard
  return (
    <div style={styles.container}>
      <div style={styles.wrapper}>
        <a href="/" style={{ display: 'inline-block', marginBottom: '15px', padding: '10px 20px', backgroundColor: '#1e3a5f', color: '#fff', textDecoration: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '500' }}>← Back to Portal</a>

        <div style={styles.header}>
          <div style={styles.headerContent}>
            <div>
              <img src="/Logo.png" alt="SLP Alaska" style={{ maxWidth: '150px', marginBottom: '10px' }} />
              <div style={styles.headerTitle}>📊 Investigation Analytics</div>
              <div style={styles.headerSubtitle}>AnthroSafe™ Powered by Field Driven Data™</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>{userEmail}</div>
              <button onClick={handleLogout} style={{ ...styles.actionBtn, background: 'rgba(255,255,255,0.2)', color: 'white', marginTop: '10px', padding: '8px 16px' }}>Sign Out</button>
            </div>
          </div>
        </div>

        <div style={styles.card}>
          {/* Filters */}
          <div style={styles.filterRow}>
            <div style={styles.filterGroup}>
              <span style={styles.filterLabel}>Date Range</span>
              <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} style={styles.select}>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
                <option value="ytd">Year to Date</option>
                <option value="12m">Last 12 Months</option>
              </select>
            </div>
            <div style={styles.filterGroup}>
              <span style={styles.filterLabel}>Company</span>
              <select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)} style={styles.select}>
                <option value="all">All Companies</option>
                {companies.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ ...styles.filterGroup, marginLeft: 'auto' }}>
              <span style={styles.filterLabel}>&nbsp;</span>
              <button onClick={fetchData} style={{ ...styles.actionBtn, ...styles.secondaryBtn }}>🔄 Refresh</button>
            </div>
          </div>

          {/* Alerts */}
          {alerts.length > 0 && (
            <div style={{ marginBottom: '25px' }}>
              {alerts.map((alert, i) => (
                <div key={i} style={alert.type === 'critical' ? { ...styles.alertCard, background: 'linear-gradient(135deg, #1f2937 0%, #374151 100%)', border: '2px solid #000' } : styles.alertCard}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '24px' }}>{alert.type === 'critical' ? '⚫' : '🚨'}</span>
                    <div>
                      <div style={{ fontWeight: '700', color: alert.type === 'critical' ? '#fff' : '#991b1b' }}>{alert.title}</div>
                      <div style={{ fontSize: '14px', color: alert.type === 'critical' ? '#d1d5db' : '#7f1d1d' }}>{alert.message}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* KPIs */}
          <div style={styles.kpiRow}>
            <div style={styles.kpiCard}>
              <div style={styles.kpiIcon}>📋</div>
              <div style={{ ...styles.kpiValue, color: COLORS.secondary }}>{kpis.totalIncidents || 0}</div>
              <div style={styles.kpiLabel}>Total Incidents</div>
            </div>
            <div style={{ ...styles.kpiCard, borderColor: '#1f2937' }}>
              <div style={styles.kpiIcon}>⚫</div>
              <div style={{ ...styles.kpiValue, color: '#1f2937' }}>{kpis.sifCount || 0}</div>
              <div style={styles.kpiLabel}>SIF Events</div>
            </div>
            <div style={{ ...styles.kpiCard, borderColor: COLORS.danger }}>
              <div style={styles.kpiIcon}>🔴</div>
              <div style={{ ...styles.kpiValue, color: COLORS.danger }}>{kpis.psifCount || 0}</div>
              <div style={styles.kpiLabel}>PSIF Events</div>
            </div>
            <div style={{ ...styles.kpiCard, borderColor: COLORS.success }}>
              <div style={styles.kpiIcon}>🟢</div>
              <div style={{ ...styles.kpiValue, color: COLORS.success }}>{kpis.stkyCount || 0}</div>
              <div style={styles.kpiLabel}>STKY Events</div>
            </div>
            <div style={{ ...styles.kpiCard, borderColor: COLORS.warning }}>
              <div style={styles.kpiIcon}>⏳</div>
              <div style={{ ...styles.kpiValue, color: COLORS.warning }}>{kpis.openInvestigations || 0}</div>
              <div style={styles.kpiLabel}>Open Investigations</div>
            </div>
            <div style={{ ...styles.kpiCard, borderColor: COLORS.danger }}>
              <div style={styles.kpiIcon}>⚠️</div>
              <div style={{ ...styles.kpiValue, color: COLORS.danger }}>{kpis.overdueInvestigations || 0}</div>
              <div style={styles.kpiLabel}>Overdue</div>
            </div>
          </div>

          <div style={styles.kpiRow}>
            <div style={styles.kpiCard}>
              <div style={styles.kpiIcon}>✅</div>
              <div style={{ ...styles.kpiValue, color: COLORS.secondary }}>{kpis.totalCAs || 0}</div>
              <div style={styles.kpiLabel}>Total CAs</div>
            </div>
            <div style={{ ...styles.kpiCard, borderColor: COLORS.warning }}>
              <div style={styles.kpiIcon}>🔄</div>
              <div style={{ ...styles.kpiValue, color: COLORS.warning }}>{kpis.openCAs || 0}</div>
              <div style={styles.kpiLabel}>Open CAs</div>
            </div>
            <div style={{ ...styles.kpiCard, borderColor: COLORS.danger }}>
              <div style={styles.kpiIcon}>📅</div>
              <div style={{ ...styles.kpiValue, color: COLORS.danger }}>{kpis.overdueCAs || 0}</div>
              <div style={styles.kpiLabel}>Overdue CAs</div>
            </div>
            <div style={{ ...styles.kpiCard, borderColor: COLORS.success }}>
              <div style={styles.kpiIcon}>📈</div>
              <div style={{ ...styles.kpiValue, color: COLORS.success }}>{kpis.caClosureRate || 0}%</div>
              <div style={styles.kpiLabel}>CA Closure Rate</div>
            </div>
            <div style={{ ...styles.kpiCard, borderColor: COLORS.purple }}>
              <div style={styles.kpiIcon}>⏱️</div>
              <div style={{ ...styles.kpiValue, color: COLORS.purple }}>{kpis.avgDuration || 0}</div>
              <div style={styles.kpiLabel}>Avg Days to Close</div>
            </div>
          </div>

          {/* Insights */}
          {insights.length > 0 && (
            <div style={{ marginBottom: '25px' }}>
              <div style={styles.sectionHeader}>💡 Insights & Recommendations</div>
              {insights.map((insight, i) => (
                <div key={i} style={insight.type === 'positive' ? { ...styles.insightCard, background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)', borderColor: '#22c55e' } : styles.insightCard}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '24px' }}>{insight.type === 'positive' ? '✅' : '💡'}</span>
                    <div>
                      <div style={{ fontWeight: '700', color: insight.type === 'positive' ? '#166534' : '#92400e' }}>{insight.title}</div>
                      <div style={{ fontSize: '14px', color: insight.type === 'positive' ? '#15803d' : '#78350f' }}>{insight.message}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Charts Row 1 */}
          <div style={styles.chartGrid}>
            <div style={styles.chartCard}>
              <div style={styles.chartTitle}>🎯 PSIF Classification Distribution</div>
              <DonutChart data={charts.psifDistribution || []} />
            </div>
            <div style={styles.chartCard}>
              <div style={styles.chartTitle}>📊 Severity Distribution</div>
              <BarChart data={charts.severityDistribution || []} />
            </div>
          </div>

          {/* Charts Row 2 */}
          <div style={styles.chartGrid}>
            <div style={styles.chartCard}>
              <div style={styles.chartTitle}>🔍 Investigation Type</div>
              <DonutChart data={charts.invTypeDistribution || []} size={180} />
            </div>
            <div style={styles.chartCard}>
              <div style={styles.chartTitle}>🏗️ Hierarchy of Controls (CAs)</div>
              <BarChart data={charts.hocDistribution || []} />
            </div>
          </div>

          {/* Charts Row 3 */}
          <div style={styles.chartGrid}>
            <div style={styles.chartCard}>
              <div style={styles.chartTitle}>📈 Monthly Incident Trend</div>
              {charts.monthlyTrend && charts.monthlyTrend.length > 0 ? (
                <BarChart data={charts.monthlyTrend} color={COLORS.secondary} />
              ) : (
                <p style={{ color: '#64748b', textAlign: 'center', padding: '40px' }}>Not enough data</p>
              )}
            </div>
            <div style={styles.chartCard}>
              <div style={styles.chartTitle}>🏢 Incidents by Company</div>
              <BarChart data={charts.companyDistribution || []} />
            </div>
          </div>

          {/* Incident Types */}
          <div style={styles.chartCard}>
            <div style={styles.chartTitle}>📋 Top Incident Types</div>
            <BarChart data={charts.incidentTypeDistribution || []} />
          </div>
        </div>

        <div style={styles.footer}>
          <div style={{ marginBottom: '5px' }}>
            <strong>AnthroSafe™ Powered by Field Driven Data™</strong>
          </div>
          <div>© 2026 SLP Alaska, LLC. All rights reserved.</div>
        </div>
      </div>
    </div>
  );
}

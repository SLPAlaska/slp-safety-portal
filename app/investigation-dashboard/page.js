'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  'https://iypezirwdlqpptjpeeyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
);

// SLP Alaska Team - Full Access
const SLP_DOMAIN = '@slpalaska.com';

const SLP_TEAM = [
  { name: 'Brian', email: 'brian@slpalaska.com', role: 'Admin' },
  { name: 'Daniel', email: 'daniel@slpalaska.com', role: 'Investigator' },
  { name: 'Mick', email: 'mick@slpalaska.com', role: 'Investigator' },
  { name: 'Lonnie', email: 'lonnie@slpalaska.com', role: 'Investigator' },
  { name: 'Todd', email: 'todd@slpalaska.com', role: 'Investigator' },
  { name: 'Krystal', email: 'krystal@slpalaska.com', role: 'Coordinator' },
  { name: 'Britney', email: 'britney@slpalaska.com', role: 'Coordinator' }
];

// ============================================================================
// CONSTANTS
// ============================================================================

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'Submitted', label: 'Submitted - Needs Triage' },
  { value: 'Under Review - Triage', label: 'Under Review - Triage' },
  { value: 'Under Review - First Draft', label: 'Under Review - First Draft' },
  { value: 'Under Review - Asset Review', label: 'Under Review - Asset Review' },
  { value: 'Under Review - Final Review', label: 'Under Review - Final Review' },
  { value: 'Pending Approval', label: 'Pending Approval' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Closed', label: 'Closed' }
];

const INVESTIGATION_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'Local Review', label: 'Local Review' },
  { value: '5-Why Analysis', label: '5-Why Analysis' },
  { value: 'Root Cause Analysis', label: 'Root Cause Analysis' },
  { value: 'Pending Classification', label: 'Pending Classification' }
];

const PSIF_OPTIONS = [
  { value: 'all', label: 'All Classifications' },
  { value: 'SIF-Actual', label: '⚫ SIF-Actual' },
  { value: 'PSIF-Critical', label: '🔴 PSIF-Critical' },
  { value: 'PSIF-High', label: '🟠 PSIF-High' },
  { value: 'PSIF-Elevated', label: '🟡 PSIF-Elevated' },
  { value: 'STKY-Controlled', label: '🟢 STKY-Controlled' },
  { value: 'Non-STKY', label: '🔵 Non-STKY' }
];

const PSIF_COLORS = {
  'SIF-Actual': { bg: '#1f2937', text: '#fff', border: '#000' },
  'PSIF-Critical': { bg: '#fef2f2', text: '#991b1b', border: '#dc2626' },
  'PSIF-High': { bg: '#fff7ed', text: '#9a3412', border: '#ea580c' },
  'PSIF-Elevated': { bg: '#fefce8', text: '#854d0e', border: '#eab308' },
  'STKY-Controlled': { bg: '#f0fdf4', text: '#166534', border: '#22c55e' },
  'Non-STKY': { bg: '#eff6ff', text: '#1e40af', border: '#3b82f6' }
};

const SEVERITY_COLORS = {
  'A': '#7F1D1D', 'B': '#991B1B', 'C': '#B91C1C', 'D': '#DC2626',
  'E': '#F97316', 'F': '#EAB308', 'G': '#22C55E'
};

const STATUS_COLORS = {
  'Draft': { bg: '#f3f4f6', text: '#374151' },
  'Submitted': { bg: '#fef3c7', text: '#92400e' },
  'Under Review - Triage': { bg: '#e0e7ff', text: '#3730a3' },
  'Under Review - First Draft': { bg: '#dbeafe', text: '#1e40af' },
  'Under Review - Asset Review': { bg: '#d1fae5', text: '#065f46' },
  'Under Review - Final Review': { bg: '#cffafe', text: '#0e7490' },
  'Pending Approval': { bg: '#fae8ff', text: '#86198f' },
  'Approved': { bg: '#dcfce7', text: '#166534' },
  'Closed': { bg: '#f3f4f6', text: '#374151' }
};

// ============================================================================
// STYLES
// ============================================================================

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)',
    padding: '20px'
  },
  wrapper: {
    maxWidth: '1400px',
    margin: '0 auto'
  },
  header: {
    background: 'linear-gradient(135deg, #991b1b 0%, #c41e3a 100%)',
    borderRadius: '16px 16px 0 0',
    padding: '25px 30px',
    color: 'white',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '20px'
  },
  headerTitle: {
    fontSize: '28px',
    fontWeight: '700',
    textShadow: '0 2px 4px rgba(0,0,0,0.2)'
  },
  headerSubtitle: {
    fontSize: '14px',
    opacity: '0.9',
    marginTop: '5px'
  },
  card: {
    background: '#ffffff',
    borderRadius: '0 0 16px 16px',
    padding: '25px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
  },
  loginCard: {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '40px',
    maxWidth: '450px',
    margin: '50px auto',
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
    textAlign: 'center'
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '15px',
    marginBottom: '25px'
  },
  statCard: {
    background: '#f8fafc',
    borderRadius: '12px',
    padding: '20px',
    textAlign: 'center',
    border: '2px solid #e2e8f0'
  },
  statNumber: {
    fontSize: '32px',
    fontWeight: '700',
    marginBottom: '5px'
  },
  statLabel: {
    fontSize: '12px',
    color: '#64748b',
    textTransform: 'uppercase',
    fontWeight: '600'
  },
  filterRow: {
    display: 'flex',
    gap: '15px',
    marginBottom: '20px',
    flexWrap: 'wrap',
    alignItems: 'center'
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px'
  },
  filterLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase'
  },
  select: {
    padding: '10px 15px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    minWidth: '180px',
    cursor: 'pointer'
  },
  searchInput: {
    padding: '10px 15px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    minWidth: '250px'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px'
  },
  th: {
    background: '#1e3a8a',
    color: 'white',
    padding: '12px 15px',
    textAlign: 'left',
    fontWeight: '600',
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  td: {
    padding: '15px',
    borderBottom: '1px solid #e2e8f0',
    verticalAlign: 'top'
  },
  trHover: {
    cursor: 'pointer',
    transition: 'background 0.2s'
  },
  badge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '600'
  },
  severityBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    color: 'white',
    fontWeight: '700',
    fontSize: '14px'
  },
  actionBtn: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    transition: 'all 0.2s'
  },
  primaryBtn: {
    background: 'linear-gradient(135deg, #991b1b 0%, #c41e3a 100%)',
    color: 'white'
  },
  secondaryBtn: {
    background: '#1e3a8a',
    color: 'white'
  },
  deadlineOverdue: {
    color: '#dc2626',
    fontWeight: '700'
  },
  deadlineSoon: {
    color: '#f59e0b',
    fontWeight: '600'
  },
  deadlineOk: {
    color: '#22c55e'
  },
  input: {
    width: '100%',
    padding: '12px 15px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '15px',
    marginBottom: '15px'
  },
  submitBtn: {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #991b1b 0%, #c41e3a 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modalContent: {
    background: 'white',
    borderRadius: '16px',
    padding: '30px',
    maxWidth: '500px',
    width: '90%',
    maxHeight: '80vh',
    overflow: 'auto'
  },
  modalHeader: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '20px'
  },
  footer: {
    textAlign: 'center',
    padding: '20px',
    color: 'white',
    fontSize: '13px'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#64748b'
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function isSLPTeam(email) {
  return email && email.toLowerCase().endsWith(SLP_DOMAIN);
}

function getDeadlineStatus(deadline) {
  if (!deadline) return { status: 'none', text: 'No deadline' };
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadlineDate = new Date(deadline);
  const diffDays = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return { status: 'overdue', text: `${Math.abs(diffDays)} days overdue`, style: styles.deadlineOverdue };
  } else if (diffDays <= 7) {
    return { status: 'soon', text: `${diffDays} days left`, style: styles.deadlineSoon };
  } else {
    return { status: 'ok', text: `${diffDays} days left`, style: styles.deadlineOk };
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function InvestigationDashboard() {
  // Auth State
  const [userEmail, setUserEmail] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginError, setLoginError] = useState('');

  // Data State
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    needsTriage: 0,
    inProgress: 0,
    overdue: 0,
    sifEvents: 0,
    psifCritical: 0
  });

  // Filter State
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [psifFilter, setPsifFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [assignTo, setAssignTo] = useState('');

  // ============================================================================
  // CHECK AUTH ON LOAD
  // ============================================================================

  useEffect(() => {
    const savedEmail = localStorage.getItem('slp_user_email');
    if (savedEmail && isSLPTeam(savedEmail)) {
      setUserEmail(savedEmail);
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  // ============================================================================
  // FETCH INCIDENTS
  // ============================================================================

  useEffect(() => {
    if (isAuthenticated) {
      fetchIncidents();
    }
  }, [isAuthenticated, statusFilter, typeFilter, psifFilter]);

  async function fetchIncidents() {
    setLoading(true);
    try {
      let query = supabase
        .from('incidents')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      if (typeFilter !== 'all') {
        query = query.eq('investigation_type', typeFilter);
      }
      if (psifFilter !== 'all') {
        query = query.eq('psif_classification', psifFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Apply search filter client-side
      let filtered = data || [];
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(inc =>
          inc.incident_id?.toLowerCase().includes(q) ||
          inc.brief_description?.toLowerCase().includes(q) ||
          inc.company_name?.toLowerCase().includes(q) ||
          inc.location_name?.toLowerCase().includes(q)
        );
      }

      setIncidents(filtered);
      calculateStats(data || []);
    } catch (error) {
      console.error('Error fetching incidents:', error);
    } finally {
      setLoading(false);
    }
  }

  function calculateStats(data) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = {
      total: data.length,
      needsTriage: data.filter(i => i.status === 'Submitted').length,
      inProgress: data.filter(i => i.status?.startsWith('Under Review')).length,
      overdue: data.filter(i => {
        if (!i.investigation_deadline || i.status === 'Closed') return false;
        return new Date(i.investigation_deadline) < today;
      }).length,
      sifEvents: data.filter(i => i.is_sif).length,
      psifCritical: data.filter(i => i.psif_classification === 'PSIF-Critical').length
    };

    setStats(stats);
  }

  // ============================================================================
  // HANDLERS
  // ============================================================================

  function handleLogin(e) {
    e.preventDefault();
    if (!loginEmail) {
      setLoginError('Please enter your email');
      return;
    }
    if (!isSLPTeam(loginEmail)) {
      setLoginError('Access restricted to SLP Alaska team members');
      return;
    }
    localStorage.setItem('slp_user_email', loginEmail.toLowerCase());
    setUserEmail(loginEmail.toLowerCase());
    setIsAuthenticated(true);
    setLoginError('');
  }

  function handleLogout() {
    localStorage.removeItem('slp_user_email');
    setUserEmail('');
    setIsAuthenticated(false);
  }

  function openAssignModal(incident) {
    setSelectedIncident(incident);
    setAssignTo(incident.team_leader_email || '');
    setShowAssignModal(true);
  }

  async function handleAssign() {
    if (!selectedIncident || !assignTo) return;

    try {
      const teamMember = SLP_TEAM.find(t => t.email === assignTo);
      
      const { error } = await supabase
        .from('incidents')
        .update({
          team_leader_email: assignTo,
          team_leader_name: teamMember?.name || assignTo.split('@')[0],
          status: selectedIncident.status === 'Submitted' ? 'Under Review - Triage' : selectedIncident.status,
          updated_at: new Date().toISOString(),
          updated_by_email: userEmail
        })
        .eq('id', selectedIncident.id);

      if (error) throw error;

      // Log activity
      await supabase.from('investigation_activity_log').insert({
        incident_id: selectedIncident.id,
        incident_id_text: selectedIncident.incident_id,
        action: `Assigned to ${teamMember?.name || assignTo}`,
        action_category: 'update',
        user_email: userEmail,
        details: { assigned_to: assignTo }
      });

      setShowAssignModal(false);
      fetchIncidents();
    } catch (error) {
      console.error('Error assigning investigator:', error);
      alert('Error assigning investigator');
    }
  }

  function navigateToIncident(incident) {
    window.location.href = `/investigation-workbench/${incident.id}`;
  }

  // ============================================================================
  // RENDER - LOGIN SCREEN
  // ============================================================================

  if (!isAuthenticated) {
    return (
      <div style={styles.container}>
        <div style={styles.wrapper}>
          <a href="/" style={{ display: 'inline-block', marginBottom: '15px', padding: '10px 20px', backgroundColor: '#1e3a5f', color: '#fff', textDecoration: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '500' }}>← Back to Portal</a>
          
          <div style={styles.loginCard}>
            <img src="/Logo.png" alt="SLP Alaska" style={{ maxWidth: '200px', margin: '0 auto 25px', display: 'block' }} />
            <h1 style={{ color: '#1e293b', marginBottom: '10px', fontSize: '24px' }}>Investigation Dashboard</h1>
            <p style={{ color: '#64748b', marginBottom: '30px' }}>Sign in with your SLP Alaska email</p>
            
            <form onSubmit={handleLogin}>
              <input
                type="email"
                placeholder="your.name@slpalaska.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                style={styles.input}
              />
              {loginError && (
                <p style={{ color: '#dc2626', fontSize: '14px', marginBottom: '15px' }}>{loginError}</p>
              )}
              <button type="submit" style={styles.submitBtn}>
                Sign In
              </button>
            </form>
            
            <p style={{ color: '#94a3b8', fontSize: '12px', marginTop: '25px' }}>
              Access restricted to @slpalaska.com email addresses
            </p>
          </div>
          
          <div style={styles.footer}>
            <span style={{ fontWeight: '500' }}>AnthroSafe™ Powered by Field Driven Data™</span>
            <span style={{ margin: '0 8px' }}>|</span>
            <span>© 2025 SLP Alaska</span>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER - DASHBOARD
  // ============================================================================

  return (
    <div style={styles.container}>
      <div style={styles.wrapper}>
        <a href="/" style={{ display: 'inline-block', marginBottom: '15px', padding: '10px 20px', backgroundColor: '#1e3a5f', color: '#fff', textDecoration: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '500' }}>← Back to Portal</a>
        
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <div>
              <img src="/Logo.png" alt="SLP Alaska" style={{ maxWidth: '150px', marginBottom: '10px' }} />
              <div style={styles.headerTitle}>📊 Investigation Dashboard</div>
              <div style={styles.headerSubtitle}>Incident Management & Investigation Tracking</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>Signed in as</div>
              <div style={{ fontWeight: '600' }}>{userEmail}</div>
              <button 
                onClick={handleLogout}
                style={{ ...styles.actionBtn, background: 'rgba(255,255,255,0.2)', color: 'white', marginTop: '10px' }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Main Card */}
        <div style={styles.card}>
          {/* Stats Row */}
          <div style={styles.statsRow}>
            <div style={styles.statCard}>
              <div style={{ ...styles.statNumber, color: '#1e3a8a' }}>{stats.total}</div>
              <div style={styles.statLabel}>Total Incidents</div>
            </div>
            <div style={{ ...styles.statCard, borderColor: '#f59e0b' }}>
              <div style={{ ...styles.statNumber, color: '#f59e0b' }}>{stats.needsTriage}</div>
              <div style={styles.statLabel}>Needs Triage</div>
            </div>
            <div style={{ ...styles.statCard, borderColor: '#3b82f6' }}>
              <div style={{ ...styles.statNumber, color: '#3b82f6' }}>{stats.inProgress}</div>
              <div style={styles.statLabel}>In Progress</div>
            </div>
            <div style={{ ...styles.statCard, borderColor: '#dc2626' }}>
              <div style={{ ...styles.statNumber, color: '#dc2626' }}>{stats.overdue}</div>
              <div style={styles.statLabel}>Overdue</div>
            </div>
            <div style={{ ...styles.statCard, borderColor: '#000', background: '#1f2937' }}>
              <div style={{ ...styles.statNumber, color: '#fff' }}>{stats.sifEvents}</div>
              <div style={{ ...styles.statLabel, color: '#fff' }}>SIF Events</div>
            </div>
            <div style={{ ...styles.statCard, borderColor: '#dc2626' }}>
              <div style={{ ...styles.statNumber, color: '#dc2626' }}>{stats.psifCritical}</div>
              <div style={styles.statLabel}>PSIF-Critical</div>
            </div>
          </div>

          {/* Filters */}
          <div style={styles.filterRow}>
            <div style={styles.filterGroup}>
              <span style={styles.filterLabel}>Status</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={styles.select}
              >
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            
            <div style={styles.filterGroup}>
              <span style={styles.filterLabel}>Investigation Type</span>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                style={styles.select}
              >
                {INVESTIGATION_TYPES.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            
            <div style={styles.filterGroup}>
              <span style={styles.filterLabel}>PSIF Classification</span>
              <select
                value={psifFilter}
                onChange={(e) => setPsifFilter(e.target.value)}
                style={styles.select}
              >
                {PSIF_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            
            <div style={{ ...styles.filterGroup, flex: 1 }}>
              <span style={styles.filterLabel}>Search</span>
              <input
                type="text"
                placeholder="Search incidents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyUp={(e) => e.key === 'Enter' && fetchIncidents()}
                style={styles.searchInput}
              />
            </div>
            
            <div style={{ ...styles.filterGroup, justifyContent: 'flex-end' }}>
              <span style={styles.filterLabel}>&nbsp;</span>
              <button
                onClick={fetchIncidents}
                style={{ ...styles.actionBtn, ...styles.secondaryBtn }}
              >
                🔄 Refresh
              </button>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div style={styles.emptyState}>
              <div style={{ fontSize: '40px', marginBottom: '15px' }}>⏳</div>
              <p>Loading incidents...</p>
            </div>
          ) : incidents.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={{ fontSize: '40px', marginBottom: '15px' }}>📋</div>
              <p>No incidents found matching your filters</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Incident ID</th>
                    <th style={styles.th}>Date</th>
                    <th style={styles.th}>Company</th>
                    <th style={styles.th}>Location</th>
                    <th style={styles.th}>Sev</th>
                    <th style={styles.th}>PSIF</th>
                    <th style={styles.th}>Type</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Deadline</th>
                    <th style={styles.th}>Assigned To</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {incidents.map(incident => {
                    const deadline = getDeadlineStatus(incident.investigation_deadline);
                    const psifStyle = PSIF_COLORS[incident.psif_classification] || {};
                    const statusStyle = STATUS_COLORS[incident.status] || { bg: '#f3f4f6', text: '#374151' };
                    
                    return (
                      <tr
                        key={incident.id}
                        style={styles.trHover}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={styles.td}>
                          <a
                            href={`/investigation-workbench/${incident.id}`}
                            style={{ color: '#1e3a8a', fontWeight: '600', textDecoration: 'none' }}
                          >
                            {incident.incident_id}
                          </a>
                          {incident.is_sif && (
                            <span style={{ marginLeft: '8px', fontSize: '12px' }}>⚫ SIF</span>
                          )}
                        </td>
                        <td style={styles.td}>{formatDate(incident.incident_date)}</td>
                        <td style={styles.td}>{incident.company_name || '-'}</td>
                        <td style={styles.td}>{incident.location_name || '-'}</td>
                        <td style={styles.td}>
                          {incident.safety_severity ? (
                            <span style={{
                              ...styles.severityBadge,
                              background: SEVERITY_COLORS[incident.safety_severity] || '#6b7280'
                            }}>
                              {incident.safety_severity}
                            </span>
                          ) : '-'}
                        </td>
                        <td style={styles.td}>
                          {incident.psif_classification ? (
                            <span style={{
                              ...styles.badge,
                              background: psifStyle.bg,
                              color: psifStyle.text,
                              border: `1px solid ${psifStyle.border}`
                            }}>
                              {incident.psif_classification}
                            </span>
                          ) : '-'}
                        </td>
                        <td style={styles.td}>
                          <span style={{ fontSize: '13px' }}>
                            {incident.investigation_type || 'Pending'}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <span style={{
                            ...styles.badge,
                            background: statusStyle.bg,
                            color: statusStyle.text
                          }}>
                            {incident.status}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <span style={deadline.style}>
                            {formatDate(incident.investigation_deadline)}
                            <br />
                            <span style={{ fontSize: '11px' }}>{deadline.text}</span>
                          </span>
                        </td>
                        <td style={styles.td}>
                          {incident.team_leader_name || (
                            <span style={{ color: '#f59e0b', fontStyle: 'italic' }}>Unassigned</span>
                          )}
                        </td>
                        <td style={styles.td}>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <button
                              onClick={() => navigateToIncident(incident)}
                              style={{ ...styles.actionBtn, ...styles.primaryBtn }}
                            >
                              Open
                            </button>
                            <button
                              onClick={() => openAssignModal(incident)}
                              style={{ ...styles.actionBtn, ...styles.secondaryBtn }}
                            >
                              Assign
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <span style={{ fontWeight: '500' }}>AnthroSafe™ Powered by Field Driven Data™</span>
          <span style={{ margin: '0 8px' }}>|</span>
          <span>© 2025 SLP Alaska</span>
        </div>
      </div>

      {/* Assign Modal */}
      {showAssignModal && selectedIncident && (
        <div style={styles.modal} onClick={() => setShowAssignModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              Assign Investigator
            </div>
            <p style={{ marginBottom: '20px', color: '#64748b' }}>
              Assign an investigator for <strong>{selectedIncident.incident_id}</strong>
            </p>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Select Team Member
              </label>
              <select
                value={assignTo}
                onChange={(e) => setAssignTo(e.target.value)}
                style={{ ...styles.select, width: '100%' }}
              >
                <option value="">-- Select Investigator --</option>
                {SLP_TEAM.map(member => (
                  <option key={member.email} value={member.email}>
                    {member.name} ({member.role})
                  </option>
                ))}
              </select>
            </div>
            
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowAssignModal(false)}
                style={{ ...styles.actionBtn, background: '#e2e8f0', color: '#475569' }}
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={!assignTo}
                style={{
                  ...styles.actionBtn,
                  ...styles.primaryBtn,
                  opacity: !assignTo ? 0.5 : 1
                }}
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://iypezirwdlqpptjpeeyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
);

const SLP_DOMAIN = '@slpalaska.com';

const HIERARCHY_OF_CONTROLS = [
  { level: 1, name: 'Elimination', color: '#166534' },
  { level: 2, name: 'Substitution', color: '#15803d' },
  { level: 3, name: 'Engineering Controls', color: '#eab308' },
  { level: 4, name: 'Administrative Controls', color: '#f97316' },
  { level: 5, name: 'PPE', color: '#dc2626' }
];

const STATUS_OPTIONS = ['Open', 'In Progress', 'Completed', 'Verified', 'Overdue'];

const styles = {
  container: { minHeight: '100vh', background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)', padding: '20px' },
  wrapper: { maxWidth: '1200px', margin: '0 auto' },
  header: { background: 'linear-gradient(135deg, #991b1b 0%, #c41e3a 100%)', borderRadius: '16px 16px 0 0', padding: '25px 30px', color: 'white' },
  headerTitle: { fontSize: '28px', fontWeight: '700' },
  headerSubtitle: { fontSize: '14px', opacity: 0.9, marginTop: '5px' },
  card: { background: '#fff', borderRadius: '0 0 16px 16px', padding: '25px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' },
  loginCard: { background: '#fff', borderRadius: '16px', padding: '40px', maxWidth: '450px', margin: '50px auto', boxShadow: '0 10px 40px rgba(0,0,0,0.2)', textAlign: 'center' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '15px', marginBottom: '25px' },
  statCard: { background: '#f8fafc', borderRadius: '12px', padding: '20px', textAlign: 'center', border: '2px solid #e2e8f0' },
  statNumber: { fontSize: '32px', fontWeight: '700', marginBottom: '5px' },
  statLabel: { fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' },
  filterRow: { display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'flex-end' },
  filterGroup: { display: 'flex', flexDirection: 'column', gap: '5px' },
  filterLabel: { fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' },
  select: { padding: '10px 15px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', minWidth: '160px' },
  input: { width: '100%', padding: '12px 15px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box' },
  textarea: { width: '100%', padding: '12px 15px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '15px', minHeight: '80px', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' },
  caCard: { border: '2px solid #e2e8f0', borderRadius: '12px', padding: '20px', marginBottom: '15px', transition: 'all 0.2s' },
  caCardOverdue: { borderColor: '#dc2626', background: '#fef2f2' },
  badge: { display: 'inline-block', padding: '4px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: '700' },
  actionBtn: { padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
  primaryBtn: { background: 'linear-gradient(135deg, #991b1b 0%, #c41e3a 100%)', color: 'white' },
  secondaryBtn: { background: '#1e3a8a', color: 'white' },
  successBtn: { background: '#059669', color: 'white' },
  outlineBtn: { background: 'white', color: '#1e3a8a', border: '2px solid #1e3a8a' },
  progressBar: { height: '10px', background: '#e2e8f0', borderRadius: '5px', overflow: 'hidden', marginTop: '10px' },
  progressFill: { height: '100%', background: 'linear-gradient(90deg, #22c55e, #16a34a)', transition: 'width 0.3s' },
  modal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalContent: { background: 'white', borderRadius: '16px', padding: '30px', maxWidth: '600px', width: '90%', maxHeight: '80vh', overflow: 'auto' },
  modalHeader: { fontSize: '20px', fontWeight: '700', color: '#1e293b', marginBottom: '20px' },
  footer: { textAlign: 'center', padding: '20px', color: 'white', fontSize: '13px' },
  submitBtn: { width: '100%', padding: '14px', background: 'linear-gradient(135deg, #991b1b 0%, #c41e3a 100%)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
  formGroup: { marginBottom: '20px' },
  label: { display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1e293b', fontSize: '14px' }
};

function isSLPTeam(email) { return email && email.toLowerCase().endsWith(SLP_DOMAIN); }
function formatDate(d) { return d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'; }

function getDeadlineStatus(targetDate, status) {
  if (!targetDate || status === 'Completed' || status === 'Verified') return { isOverdue: false, text: '' };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(targetDate);
  const diffDays = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { isOverdue: true, text: `${Math.abs(diffDays)} days overdue`, color: '#dc2626' };
  if (diffDays <= 7) return { isOverdue: false, text: `${diffDays} days left`, color: '#f59e0b' };
  return { isOverdue: false, text: `${diffDays} days left`, color: '#22c55e' };
}

export default function CorrectiveActionsTracker() {
  const [userEmail, setUserEmail] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSLP, setIsSLP] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(true);
  const [actions, setActions] = useState([]);
  const [stats, setStats] = useState({ total: 0, open: 0, inProgress: 0, completed: 0, overdue: 0 });
  const [statusFilter, setStatusFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [companies, setCompanies] = useState([]);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedCA, setSelectedCA] = useState(null);
  const [updateData, setUpdateData] = useState({ action_status: '', percent_complete: 0, completion_notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('slp_ca_user_email');
    if (saved) {
      setUserEmail(saved.toLowerCase());
      setIsAuthenticated(true);
      setIsSLP(isSLPTeam(saved));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAuthenticated) fetchActions();
  }, [isAuthenticated, statusFilter, companyFilter]);

  async function fetchActions() {
    setLoading(true);
    try {
      let query = supabase
        .from('investigation_corrective_actions')
        .select(`
          *,
          incidents (
            incident_id,
            brief_description,
            incident_date,
            company_name,
            location_name
          )
        `)
        .order('target_date', { ascending: true });

      // If not SLP team, only show their assigned actions
      if (!isSLP) {
        query = query.eq('action_owner_email', userEmail);
      }

      // Apply filters
      if (statusFilter !== 'all') {
        if (statusFilter === 'Overdue') {
          query = query.lt('target_date', new Date().toISOString().split('T')[0])
            .not('action_status', 'in', '("Completed","Verified")');
        } else {
          query = query.eq('action_status', statusFilter);
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      let filtered = data || [];
      
      // Company filter (SLP only)
      if (isSLP && companyFilter !== 'all') {
        filtered = filtered.filter(ca => ca.incidents?.company_name === companyFilter);
      }

      // Mark overdue items
      const today = new Date(); today.setHours(0, 0, 0, 0);
      filtered = filtered.map(ca => ({
        ...ca,
        isOverdue: ca.target_date && new Date(ca.target_date) < today && 
                   !['Completed', 'Verified'].includes(ca.action_status)
      }));

      setActions(filtered);
      calculateStats(data || []);

      // Get unique companies for filter (SLP only)
      if (isSLP) {
        const uniqueCompanies = [...new Set((data || []).map(ca => ca.incidents?.company_name).filter(Boolean))];
        setCompanies(uniqueCompanies.sort());
      }
    } catch (e) {
      console.error('Error fetching actions:', e);
    }
    setLoading(false);
  }

  function calculateStats(data) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    setStats({
      total: data.length,
      open: data.filter(a => a.action_status === 'Open').length,
      inProgress: data.filter(a => a.action_status === 'In Progress').length,
      completed: data.filter(a => ['Completed', 'Verified'].includes(a.action_status)).length,
      overdue: data.filter(a => a.target_date && new Date(a.target_date) < today && 
               !['Completed', 'Verified'].includes(a.action_status)).length
    });
  }

  function handleLogin(e) {
    e.preventDefault();
    if (!loginEmail) { setLoginError('Please enter your email'); return; }
    const email = loginEmail.toLowerCase().trim();
    localStorage.setItem('slp_ca_user_email', email);
    setUserEmail(email);
    setIsAuthenticated(true);
    setIsSLP(isSLPTeam(email));
    setLoginError('');
  }

  function handleLogout() {
    localStorage.removeItem('slp_ca_user_email');
    setUserEmail('');
    setIsAuthenticated(false);
    setIsSLP(false);
  }

  function openUpdateModal(ca) {
    setSelectedCA(ca);
    setUpdateData({
      action_status: ca.action_status || 'Open',
      percent_complete: ca.percent_complete || 0,
      completion_notes: ca.completion_notes || ''
    });
    setShowUpdateModal(true);
  }

  async function saveUpdate() {
    if (!selectedCA) return;
    setSaving(true);
    try {
      const updates = {
        action_status: updateData.action_status,
        percent_complete: updateData.percent_complete,
        completion_notes: updateData.completion_notes,
        updated_at: new Date().toISOString()
      };

      // If marking complete, add completion date
      if (updateData.action_status === 'Completed' && selectedCA.action_status !== 'Completed') {
        updates.completed_date = new Date().toISOString().split('T')[0];
        updates.completed_by_email = userEmail;
      }

      // Auto-set percent to 100 if completed
      if (updateData.action_status === 'Completed' || updateData.action_status === 'Verified') {
        updates.percent_complete = 100;
      }

      const { error } = await supabase
        .from('investigation_corrective_actions')
        .update(updates)
        .eq('id', selectedCA.id);

      if (error) throw error;

      // Log activity
      await supabase.from('investigation_activity_log').insert({
        incident_id: selectedCA.incident_id,
        action: `CA-${selectedCA.action_number} updated to ${updateData.action_status}`,
        action_category: 'update',
        user_email: userEmail,
        entity_type: 'corrective_action',
        entity_id: selectedCA.id,
        details: updates
      });

      setShowUpdateModal(false);
      fetchActions();
      alert('Action updated successfully!');
    } catch (e) {
      alert('Error updating: ' + e.message);
    }
    setSaving(false);
  }

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div style={styles.container}>
        <div style={styles.wrapper}>
          <a href="/" style={{ display: 'inline-block', marginBottom: '15px', padding: '10px 20px', backgroundColor: '#1e3a5f', color: '#fff', textDecoration: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '500' }}>← Back to Portal</a>
          
          <div style={styles.loginCard}>
            <img src="/Logo.png" alt="SLP Alaska" style={{ maxWidth: '200px', margin: '0 auto 25px', display: 'block' }} />
            <h1 style={{ color: '#1e293b', marginBottom: '10px', fontSize: '24px' }}>Corrective Actions</h1>
            <p style={{ color: '#64748b', marginBottom: '30px' }}>Enter your email to view your assigned actions</p>
            
            <form onSubmit={handleLogin}>
              <input
                type="email"
                placeholder="your.email@company.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                style={styles.input}
              />
              {loginError && <p style={{ color: '#dc2626', fontSize: '14px', marginBottom: '15px' }}>{loginError}</p>}
              <button type="submit" style={styles.submitBtn}>View My Actions</button>
            </form>
            
            <p style={{ color: '#94a3b8', fontSize: '12px', marginTop: '25px' }}>
              SLP team members see all actions. Others see only their assigned actions.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Main Tracker
  return (
    <div style={styles.container}>
      <div style={styles.wrapper}>
        <a href="/" style={{ display: 'inline-block', marginBottom: '15px', padding: '10px 20px', backgroundColor: '#1e3a5f', color: '#fff', textDecoration: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '500' }}>← Back to Portal</a>
        
        <div style={styles.header}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
            <div>
              <img src="/Logo.png" alt="SLP Alaska" style={{ maxWidth: '150px', marginBottom: '10px' }} />
              <div style={styles.headerTitle}>✅ Corrective Actions Tracker</div>
              <div style={styles.headerSubtitle}>
                {isSLP ? 'All Investigation Corrective Actions' : `Actions assigned to ${userEmail}`}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>{userEmail}</div>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>{isSLP ? 'SLP Team - Full Access' : 'Action Owner'}</div>
              <button onClick={handleLogout} style={{ ...styles.actionBtn, background: 'rgba(255,255,255,0.2)', color: 'white', marginTop: '10px', padding: '8px 16px' }}>
                Sign Out
              </button>
            </div>
          </div>
        </div>

        <div style={styles.card}>
          {/* Stats */}
          <div style={styles.statsRow}>
            <div style={styles.statCard}>
              <div style={{ ...styles.statNumber, color: '#1e3a8a' }}>{stats.total}</div>
              <div style={styles.statLabel}>Total Actions</div>
            </div>
            <div style={{ ...styles.statCard, borderColor: '#f59e0b' }}>
              <div style={{ ...styles.statNumber, color: '#f59e0b' }}>{stats.open}</div>
              <div style={styles.statLabel}>Open</div>
            </div>
            <div style={{ ...styles.statCard, borderColor: '#3b82f6' }}>
              <div style={{ ...styles.statNumber, color: '#3b82f6' }}>{stats.inProgress}</div>
              <div style={styles.statLabel}>In Progress</div>
            </div>
            <div style={{ ...styles.statCard, borderColor: '#22c55e' }}>
              <div style={{ ...styles.statNumber, color: '#22c55e' }}>{stats.completed}</div>
              <div style={styles.statLabel}>Completed</div>
            </div>
            <div style={{ ...styles.statCard, borderColor: '#dc2626' }}>
              <div style={{ ...styles.statNumber, color: '#dc2626' }}>{stats.overdue}</div>
              <div style={styles.statLabel}>Overdue</div>
            </div>
          </div>

          {/* Filters */}
          <div style={styles.filterRow}>
            <div style={styles.filterGroup}>
              <span style={styles.filterLabel}>Status</span>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={styles.select}>
                <option value="all">All Statuses</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Verified">Verified</option>
                <option value="Overdue">Overdue</option>
              </select>
            </div>
            
            {isSLP && (
              <div style={styles.filterGroup}>
                <span style={styles.filterLabel}>Company</span>
                <select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)} style={styles.select}>
                  <option value="all">All Companies</option>
                  {companies.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}
            
            <div style={{ ...styles.filterGroup, marginLeft: 'auto' }}>
              <span style={styles.filterLabel}>&nbsp;</span>
              <button onClick={fetchActions} style={{ ...styles.actionBtn, ...styles.secondaryBtn }}>
                🔄 Refresh
              </button>
            </div>
          </div>

          {/* Actions List */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
              <p>Loading...</p>
            </div>
          ) : actions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
              <div style={{ fontSize: '48px', marginBottom: '15px' }}>✅</div>
              <p>{isSLP ? 'No corrective actions found' : 'No actions assigned to you'}</p>
            </div>
          ) : (
            actions.map(ca => {
              const deadline = getDeadlineStatus(ca.target_date, ca.action_status);
              const controlLevel = parseInt(ca.hierarchy_control?.charAt(0)) || 5;
              const controlColor = HIERARCHY_OF_CONTROLS.find(h => h.level === controlLevel)?.color || '#64748b';
              
              return (
                <div 
                  key={ca.id} 
                  style={{ 
                    ...styles.caCard, 
                    ...(ca.isOverdue ? styles.caCardOverdue : {})
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: '700', fontSize: '16px' }}>CA-{ca.action_number}</span>
                        <span style={{ ...styles.badge, background: controlColor, color: 'white' }}>
                          {ca.hierarchy_control}
                        </span>
                        <span style={{ 
                          ...styles.badge, 
                          background: ca.action_status === 'Completed' || ca.action_status === 'Verified' ? '#dcfce7' : 
                                     ca.action_status === 'In Progress' ? '#dbeafe' : 
                                     ca.isOverdue ? '#fef2f2' : '#fef3c7',
                          color: ca.action_status === 'Completed' || ca.action_status === 'Verified' ? '#166534' : 
                                ca.action_status === 'In Progress' ? '#1e40af' : 
                                ca.isOverdue ? '#991b1b' : '#92400e'
                        }}>
                          {ca.isOverdue ? '⚠️ Overdue' : ca.action_status}
                        </span>
                      </div>
                      {isSLP && ca.incidents && (
                        <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '5px' }}>
                          <a href={`/investigation-workbench/${ca.incident_id}`} style={{ color: '#1e3a8a', textDecoration: 'none' }}>
                            {ca.incidents.incident_id}
                          </a>
                          {' • '}{ca.incidents.company_name} • {ca.incidents.location_name}
                        </div>
                      )}
                    </div>
                    <button 
                      onClick={() => openUpdateModal(ca)} 
                      style={{ ...styles.actionBtn, ...styles.primaryBtn }}
                    >
                      Update Status
                    </button>
                  </div>

                  <p style={{ margin: '0 0 15px', fontSize: '15px' }}>{ca.action_description}</p>

                  <div style={{ display: 'flex', gap: '20px', fontSize: '13px', color: '#64748b', flexWrap: 'wrap' }}>
                    <span>👤 {ca.action_owner_name || 'Unassigned'}</span>
                    <span>📧 {ca.action_owner_email || '-'}</span>
                    <span style={{ color: deadline.color, fontWeight: deadline.isOverdue ? '700' : '400' }}>
                      📅 Due: {formatDate(ca.target_date)} {deadline.text && `(${deadline.text})`}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ marginTop: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b', marginBottom: '5px' }}>
                      <span>Progress</span>
                      <span>{ca.percent_complete || 0}%</span>
                    </div>
                    <div style={styles.progressBar}>
                      <div style={{ ...styles.progressFill, width: `${ca.percent_complete || 0}%` }} />
                    </div>
                  </div>

                  {ca.completion_notes && (
                    <div style={{ marginTop: '15px', padding: '10px 15px', background: '#f8fafc', borderRadius: '8px', fontSize: '14px' }}>
                      <strong style={{ fontSize: '12px', color: '#64748b' }}>NOTES:</strong>
                      <p style={{ margin: '5px 0 0' }}>{ca.completion_notes}</p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div style={styles.footer}>
          <span style={{ fontWeight: '500' }}>Powered by Predictive Safety Analytics™</span> | © 2025 SLP Alaska
        </div>
      </div>

      {/* Update Modal */}
      {showUpdateModal && selectedCA && (
        <div style={styles.modal} onClick={() => setShowUpdateModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>Update Corrective Action</div>
            
            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
              <strong>CA-{selectedCA.action_number}</strong>
              <p style={{ margin: '5px 0 0', fontSize: '14px' }}>{selectedCA.action_description}</p>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Status</label>
              <select 
                value={updateData.action_status} 
                onChange={(e) => setUpdateData({ ...updateData, action_status: e.target.value })}
                style={styles.select}
              >
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Percent Complete: {updateData.percent_complete}%</label>
              <input 
                type="range" 
                min="0" 
                max="100" 
                step="5"
                value={updateData.percent_complete}
                onChange={(e) => setUpdateData({ ...updateData, percent_complete: parseInt(e.target.value) })}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b' }}>
                <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Notes / Comments</label>
              <textarea 
                value={updateData.completion_notes}
                onChange={(e) => setUpdateData({ ...updateData, completion_notes: e.target.value })}
                placeholder="Add notes about progress, blockers, or completion..."
                style={styles.textarea}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowUpdateModal(false)} style={{ ...styles.actionBtn, ...styles.outlineBtn }}>
                Cancel
              </button>
              <button onClick={saveUpdate} disabled={saving} style={{ ...styles.actionBtn, ...styles.primaryBtn, opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving...' : 'Save Update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

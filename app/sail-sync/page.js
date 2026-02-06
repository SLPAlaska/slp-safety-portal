'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://iypezirwdlqpptjpeeyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
);

const SLP_DOMAIN = '@slpalaska.com';

const SYNC_STATUS = {
  synced: { label: 'Synced', color: '#22c55e', bg: '#dcfce7', icon: '✅' },
  pending: { label: 'Pending Sync', color: '#f59e0b', bg: '#fef3c7', icon: '⏳' },
  error: { label: 'Sync Error', color: '#dc2626', bg: '#fee2e2', icon: '❌' },
  not_synced: { label: 'Not Synced', color: '#64748b', bg: '#f1f5f9', icon: '⬜' }
};

const styles = {
  container: { minHeight: '100vh', background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)', padding: '20px' },
  wrapper: { maxWidth: '1200px', margin: '0 auto' },
  header: { background: 'linear-gradient(135deg, #991b1b 0%, #c41e3a 100%)', borderRadius: '16px 16px 0 0', padding: '25px 30px', color: 'white' },
  headerTitle: { fontSize: '28px', fontWeight: '700' },
  headerSubtitle: { fontSize: '14px', opacity: 0.9, marginTop: '5px' },
  card: { background: '#fff', borderRadius: '0 0 16px 16px', padding: '25px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' },
  loginCard: { background: '#fff', borderRadius: '16px', padding: '40px', maxWidth: '450px', margin: '50px auto', boxShadow: '0 10px 40px rgba(0,0,0,0.2)', textAlign: 'center' },
  sectionHeader: { background: '#1e3a8a', color: 'white', padding: '12px 20px', borderRadius: '8px', fontSize: '16px', fontWeight: '600', marginBottom: '20px', marginTop: '25px', display: 'flex', alignItems: 'center', gap: '10px' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginBottom: '25px' },
  statCard: { background: '#f8fafc', borderRadius: '12px', padding: '20px', textAlign: 'center', border: '2px solid #e2e8f0' },
  statNumber: { fontSize: '32px', fontWeight: '700', marginBottom: '5px' },
  statLabel: { fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' },
  syncCard: { border: '2px solid #e2e8f0', borderRadius: '12px', padding: '20px', marginBottom: '15px' },
  syncCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' },
  input: { width: '100%', padding: '12px 15px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box' },
  select: { padding: '10px 15px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', background: 'white', minWidth: '160px' },
  actionBtn: { padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
  primaryBtn: { background: 'linear-gradient(135deg, #991b1b 0%, #c41e3a 100%)', color: 'white' },
  secondaryBtn: { background: '#1e3a8a', color: 'white' },
  successBtn: { background: '#22c55e', color: 'white' },
  warningBtn: { background: '#f59e0b', color: 'white' },
  outlineBtn: { background: 'white', color: '#1e3a8a', border: '2px solid #1e3a8a' },
  badge: { display: 'inline-block', padding: '4px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  th: { background: '#1e3a8a', color: 'white', padding: '12px 15px', textAlign: 'left', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase' },
  td: { padding: '12px 15px', borderBottom: '1px solid #e2e8f0' },
  infoBox: { background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', padding: '15px', marginBottom: '20px', fontSize: '14px', color: '#0369a1' },
  warningBox: { background: '#fef3c7', border: '2px solid #f59e0b', borderRadius: '8px', padding: '15px', marginBottom: '20px' },
  successBox: { background: '#dcfce7', border: '2px solid #22c55e', borderRadius: '8px', padding: '15px', marginBottom: '20px' },
  footer: { textAlign: 'center', padding: '20px', color: 'white', fontSize: '13px' },
  submitBtn: { width: '100%', padding: '14px', background: 'linear-gradient(135deg, #991b1b 0%, #c41e3a 100%)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' },
  checkbox: { width: '20px', height: '20px', cursor: 'pointer' },
  logEntry: { padding: '10px 15px', background: '#f8fafc', borderRadius: '6px', marginBottom: '8px', fontSize: '13px', borderLeft: '4px solid #1e3a8a' }
};

function isSLPTeam(email) { return email && email.toLowerCase().endsWith(SLP_DOMAIN); }
function formatDate(d) { return d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'; }
function formatDateTime(d) { return d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '-'; }

export default function SAILLogSync() {
  const [userEmail, setUserEmail] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');

  // Data
  const [correctiveActions, setCorrectiveActions] = useState([]);
  const [sailLog, setSailLog] = useState([]);
  const [syncLog, setSyncLog] = useState([]);
  const [selectedCAs, setSelectedCAs] = useState([]);
  const [stats, setStats] = useState({ total: 0, synced: 0, pending: 0, sailTotal: 0 });

  // Filters
  const [companyFilter, setCompanyFilter] = useState('all');
  const [companies, setCompanies] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('slp_user_email');
    if (saved && isSLPTeam(saved)) { setUserEmail(saved); setIsAuthenticated(true); }
    setLoading(false);
  }, []);

  useEffect(() => { if (isAuthenticated) fetchData(); }, [isAuthenticated, companyFilter]);

  async function fetchData() {
    setLoading(true);

    // Fetch investigation corrective actions
    const { data: caData } = await supabase
      .from('investigation_corrective_actions')
      .select(`
        *,
        incidents (
          incident_id,
          company_name,
          location_name,
          incident_date
        )
      `)
      .order('created_at', { ascending: false });

    let filteredCAs = caData || [];
    if (companyFilter !== 'all') {
      filteredCAs = filteredCAs.filter(ca => ca.incidents?.company_name === companyFilter);
    }
    setCorrectiveActions(filteredCAs);

    // Get unique companies
    const allCompanies = [...new Set((caData || []).map(ca => ca.incidents?.company_name).filter(Boolean))];
    setCompanies(allCompanies.sort());

    // Fetch SAIL Log entries (check if table exists)
    try {
      const { data: sailData, error } = await supabase
        .from('sail_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error) {
        setSailLog(sailData || []);
      }
    } catch (e) {
      console.log('SAIL Log table may not exist');
      setSailLog([]);
    }

    // Calculate stats
    const synced = filteredCAs.filter(ca => ca.synced_to_sail).length;
    const pending = filteredCAs.filter(ca => !ca.synced_to_sail).length;

    setStats({
      total: filteredCAs.length,
      synced,
      pending,
      sailTotal: sailLog.length
    });

    // Load sync log from localStorage
    const savedLog = localStorage.getItem('sail_sync_log');
    if (savedLog) {
      setSyncLog(JSON.parse(savedLog).slice(0, 50));
    }

    setLoading(false);
  }

  function toggleCASelection(caId) {
    setSelectedCAs(prev =>
      prev.includes(caId)
        ? prev.filter(id => id !== caId)
        : [...prev, caId]
    );
  }

  function selectAllPending() {
    const pendingCAs = correctiveActions.filter(ca => !ca.synced_to_sail);
    setSelectedCAs(pendingCAs.map(ca => ca.id));
  }

  function clearSelection() {
    setSelectedCAs([]);
  }

  async function syncSelectedToSAIL() {
    if (selectedCAs.length === 0) {
      alert('Please select at least one corrective action to sync');
      return;
    }

    setSyncing(true);
    const newLogEntries = [];
    let successCount = 0;
    let errorCount = 0;

    for (const caId of selectedCAs) {
      const ca = correctiveActions.find(c => c.id === caId);
      if (!ca) continue;

      try {
        // Create SAIL Log entry
        const sailEntry = {
          company: ca.incidents?.company_name,
          location: ca.incidents?.location_name,
          date_identified: ca.incidents?.incident_date,
          description: `Investigation CA: ${ca.action_description}`,
          action_required: ca.action_description,
          responsible_party: ca.action_owner_name,
          responsible_party_email: ca.action_owner_email,
          target_date: ca.target_date,
          status: ca.action_status === 'Completed' || ca.action_status === 'Verified' ? 'Closed' : 'Open',
          source: 'Investigation',
          source_reference: `${ca.incidents?.incident_id} / CA-${ca.action_number}`,
          hierarchy_control: ca.hierarchy_control
        };

        // Insert into SAIL Log
        const { data: newSail, error: sailError } = await supabase
          .from('sail_log')
          .insert(sailEntry)
          .select()
          .single();

        if (sailError) throw sailError;

        // Update CA with SAIL reference
        await supabase
          .from('investigation_corrective_actions')
          .update({
            sail_log_id: newSail.id,
            synced_to_sail: true,
            sail_sync_date: new Date().toISOString()
          })
          .eq('id', caId);

        successCount++;
        newLogEntries.push({
          timestamp: new Date().toISOString(),
          action: 'sync',
          ca_id: caId,
          ca_number: ca.action_number,
          incident_id: ca.incidents?.incident_id,
          sail_id: newSail.id,
          status: 'success',
          user: userEmail
        });

      } catch (error) {
        errorCount++;
        newLogEntries.push({
          timestamp: new Date().toISOString(),
          action: 'sync',
          ca_id: caId,
          ca_number: ca.action_number,
          incident_id: ca.incidents?.incident_id,
          status: 'error',
          error: error.message,
          user: userEmail
        });
      }
    }

    // Update sync log
    const updatedLog = [...newLogEntries, ...syncLog].slice(0, 100);
    setSyncLog(updatedLog);
    localStorage.setItem('sail_sync_log', JSON.stringify(updatedLog));

    setSyncing(false);
    setSelectedCAs([]);
    fetchData();

    alert(`Sync complete!\n✅ ${successCount} synced successfully\n${errorCount > 0 ? `❌ ${errorCount} errors` : ''}`);
  }

  async function syncStatusUpdate(ca) {
    // Two-way sync: Update SAIL Log status when CA status changes
    if (!ca.sail_log_id) return;

    try {
      const newStatus = ca.action_status === 'Completed' || ca.action_status === 'Verified' ? 'Closed' : 'Open';

      await supabase
        .from('sail_log')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', ca.sail_log_id);

      // Log the sync
      const logEntry = {
        timestamp: new Date().toISOString(),
        action: 'status_update',
        ca_id: ca.id,
        ca_number: ca.action_number,
        sail_id: ca.sail_log_id,
        new_status: newStatus,
        status: 'success',
        user: userEmail
      };

      const updatedLog = [logEntry, ...syncLog].slice(0, 100);
      setSyncLog(updatedLog);
      localStorage.setItem('sail_sync_log', JSON.stringify(updatedLog));

      alert('SAIL Log status updated!');
    } catch (error) {
      alert('Error updating SAIL Log: ' + error.message);
    }
  }

  async function unlinkFromSAIL(ca) {
    if (!confirm(`Unlink CA-${ca.action_number} from SAIL Log? This will not delete the SAIL entry.`)) return;

    await supabase
      .from('investigation_corrective_actions')
      .update({ sail_log_id: null, synced_to_sail: false, sail_sync_date: null })
      .eq('id', ca.id);

    fetchData();
    alert('Unlinked from SAIL Log');
  }

  function handleLogin(e) {
    e.preventDefault();
    if (!loginEmail) { setLoginError('Enter email'); return; }
    if (!isSLPTeam(loginEmail)) { setLoginError('Access restricted to @slpalaska.com'); return; }
    localStorage.setItem('slp_user_email', loginEmail.toLowerCase());
    setUserEmail(loginEmail.toLowerCase());
    setIsAuthenticated(true);
  }

  const pendingCAs = correctiveActions.filter(ca => !ca.synced_to_sail);
  const syncedCAs = correctiveActions.filter(ca => ca.synced_to_sail);

  // Login
  if (!isAuthenticated) {
    return (
      <div style={styles.container}><div style={styles.wrapper}>
        <a href="/" style={{ display: 'inline-block', marginBottom: '15px', padding: '10px 20px', backgroundColor: '#1e3a5f', color: '#fff', textDecoration: 'none', borderRadius: '6px' }}>← Back to Portal</a>
        <div style={styles.loginCard}>
          <img src="/Logo.png" alt="SLP Alaska" style={{ maxWidth: '200px', margin: '0 auto 25px', display: 'block' }} />
          <h1 style={{ color: '#1e293b', marginBottom: '10px', fontSize: '24px' }}>SAIL Log Sync</h1>
          <p style={{ color: '#64748b', marginBottom: '30px' }}>Sync investigation CAs with SAIL Log</p>
          <form onSubmit={handleLogin}>
            <input type="email" placeholder="your.name@slpalaska.com" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} style={styles.input} />
            {loginError && <p style={{ color: '#dc2626', fontSize: '14px', marginBottom: '15px' }}>{loginError}</p>}
            <button type="submit" style={styles.submitBtn}>Sign In</button>
          </form>
        </div>
      </div></div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.wrapper}>
        <a href="/" style={{ display: 'inline-block', marginBottom: '15px', padding: '10px 20px', backgroundColor: '#1e3a5f', color: '#fff', textDecoration: 'none', borderRadius: '6px' }}>← Back to Portal</a>

        <div style={styles.header}>
          <div>
            <img src="/Logo.png" alt="SLP Alaska" style={{ maxWidth: '150px', marginBottom: '10px' }} />
            <div style={styles.headerTitle}>🔗 SAIL Log Auto-Sync</div>
            <div style={styles.headerSubtitle}>Synchronize investigation corrective actions with SAIL Log</div>
          </div>
        </div>

        <div style={styles.card}>
          {/* Stats */}
          <div style={styles.statsRow}>
            <div style={styles.statCard}>
              <div style={{ ...styles.statNumber, color: '#1e3a8a' }}>{stats.total}</div>
              <div style={styles.statLabel}>Total Investigation CAs</div>
            </div>
            <div style={{ ...styles.statCard, borderColor: '#22c55e' }}>
              <div style={{ ...styles.statNumber, color: '#22c55e' }}>{stats.synced}</div>
              <div style={styles.statLabel}>Synced to SAIL</div>
            </div>
            <div style={{ ...styles.statCard, borderColor: '#f59e0b' }}>
              <div style={{ ...styles.statNumber, color: '#f59e0b' }}>{stats.pending}</div>
              <div style={styles.statLabel}>Pending Sync</div>
            </div>
            <div style={{ ...styles.statCard, borderColor: '#8b5cf6' }}>
              <div style={{ ...styles.statNumber, color: '#8b5cf6' }}>{sailLog.length}</div>
              <div style={styles.statLabel}>SAIL Log Entries</div>
            </div>
          </div>

          {/* Info Box */}
          <div style={styles.infoBox}>
            <strong>🔗 How SAIL Sync Works:</strong>
            <ul style={{ margin: '10px 0 0', paddingLeft: '20px' }}>
              <li>Select investigation CAs to sync to your existing SAIL Log</li>
              <li>Each CA creates a new SAIL entry with source reference</li>
              <li>Status changes can be synced back to SAIL Log</li>
              <li>One-way sync: CAs → SAIL (prevents duplicates)</li>
            </ul>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #e2e8f0', paddingBottom: '15px' }}>
            <button onClick={() => setActiveTab('pending')} style={{ ...styles.actionBtn, background: activeTab === 'pending' ? '#f59e0b' : '#f1f5f9', color: activeTab === 'pending' ? 'white' : '#64748b' }}>
              ⏳ Pending Sync ({pendingCAs.length})
            </button>
            <button onClick={() => setActiveTab('synced')} style={{ ...styles.actionBtn, background: activeTab === 'synced' ? '#22c55e' : '#f1f5f9', color: activeTab === 'synced' ? 'white' : '#64748b' }}>
              ✅ Synced ({syncedCAs.length})
            </button>
            <button onClick={() => setActiveTab('log')} style={{ ...styles.actionBtn, background: activeTab === 'log' ? '#1e3a8a' : '#f1f5f9', color: activeTab === 'log' ? 'white' : '#64748b' }}>
              📜 Sync Log
            </button>

            <div style={{ marginLeft: 'auto' }}>
              <select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)} style={styles.select}>
                <option value="all">All Companies</option>
                {companies.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Pending Tab */}
          {activeTab === 'pending' && (
            <div>
              {/* Bulk Actions */}
              {pendingCAs.length > 0 && (
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <button onClick={selectAllPending} style={{ ...styles.actionBtn, ...styles.outlineBtn }}>
                    ☑️ Select All ({pendingCAs.length})
                  </button>
                  {selectedCAs.length > 0 && (
                    <>
                      <button onClick={clearSelection} style={{ ...styles.actionBtn, ...styles.outlineBtn }}>
                        Clear Selection
                      </button>
                      <button
                        onClick={syncSelectedToSAIL}
                        disabled={syncing}
                        style={{ ...styles.actionBtn, ...styles.primaryBtn, opacity: syncing ? 0.6 : 1 }}
                      >
                        {syncing ? '⏳ Syncing...' : `🔗 Sync Selected (${selectedCAs.length}) to SAIL`}
                      </button>
                    </>
                  )}
                </div>
              )}

              {pendingCAs.length === 0 ? (
                <div style={styles.successBox}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '24px' }}>✅</span>
                    <div>
                      <strong>All Synced!</strong>
                      <div style={{ fontSize: '14px', color: '#166534' }}>All investigation corrective actions are synced to SAIL Log.</div>
                    </div>
                  </div>
                </div>
              ) : (
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Select</th>
                      <th style={styles.th}>Incident</th>
                      <th style={styles.th}>CA #</th>
                      <th style={styles.th}>Description</th>
                      <th style={styles.th}>Owner</th>
                      <th style={styles.th}>Due Date</th>
                      <th style={styles.th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingCAs.map(ca => (
                      <tr key={ca.id} style={{ background: selectedCAs.includes(ca.id) ? '#fef3c7' : 'transparent' }}>
                        <td style={styles.td}>
                          <input
                            type="checkbox"
                            checked={selectedCAs.includes(ca.id)}
                            onChange={() => toggleCASelection(ca.id)}
                            style={styles.checkbox}
                          />
                        </td>
                        <td style={styles.td}>
                          <div style={{ fontWeight: '600' }}>{ca.incidents?.incident_id}</div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>{ca.incidents?.company_name}</div>
                        </td>
                        <td style={styles.td}><strong>CA-{ca.action_number}</strong></td>
                        <td style={styles.td}><div style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ca.action_description}</div></td>
                        <td style={styles.td}>{ca.action_owner_name || '-'}</td>
                        <td style={styles.td}>{formatDate(ca.target_date)}</td>
                        <td style={styles.td}>
                          <span style={{ ...styles.badge, background: ca.action_status === 'Completed' ? '#dcfce7' : '#fef3c7', color: ca.action_status === 'Completed' ? '#166534' : '#92400e' }}>
                            {ca.action_status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Synced Tab */}
          {activeTab === 'synced' && (
            <div>
              {syncedCAs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  <p>No synced corrective actions yet</p>
                </div>
              ) : (
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Incident</th>
                      <th style={styles.th}>CA #</th>
                      <th style={styles.th}>Description</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Synced</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {syncedCAs.map(ca => (
                      <tr key={ca.id}>
                        <td style={styles.td}>
                          <div style={{ fontWeight: '600' }}>{ca.incidents?.incident_id}</div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>{ca.incidents?.company_name}</div>
                        </td>
                        <td style={styles.td}><strong>CA-{ca.action_number}</strong></td>
                        <td style={styles.td}><div style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ca.action_description}</div></td>
                        <td style={styles.td}>
                          <span style={{ ...styles.badge, background: ca.action_status === 'Completed' ? '#dcfce7' : '#fef3c7', color: ca.action_status === 'Completed' ? '#166534' : '#92400e' }}>
                            {ca.action_status}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <span style={{ ...styles.badge, background: '#dcfce7', color: '#166534' }}>✅ {formatDate(ca.sail_sync_date)}</span>
                        </td>
                        <td style={styles.td}>
                          <div style={{ display: 'flex', gap: '5px' }}>
                            <button onClick={() => syncStatusUpdate(ca)} style={{ ...styles.actionBtn, ...styles.secondaryBtn, padding: '5px 10px', fontSize: '11px' }}>
                              🔄 Sync Status
                            </button>
                            <button onClick={() => unlinkFromSAIL(ca)} style={{ ...styles.actionBtn, background: '#fee2e2', color: '#991b1b', padding: '5px 10px', fontSize: '11px' }}>
                              Unlink
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Sync Log Tab */}
          {activeTab === 'log' && (
            <div>
              <div style={styles.sectionHeader}>📜 Sync History</div>
              {syncLog.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  <p>No sync activity yet</p>
                </div>
              ) : (
                syncLog.map((entry, i) => (
                  <div
                    key={i}
                    style={{
                      ...styles.logEntry,
                      borderLeftColor: entry.status === 'success' ? '#22c55e' : '#dc2626'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ marginRight: '10px' }}>{entry.status === 'success' ? '✅' : '❌'}</span>
                        <strong>{entry.action === 'sync' ? 'Synced' : 'Status Update'}:</strong> {entry.incident_id} / CA-{entry.ca_number}
                        {entry.error && <span style={{ color: '#dc2626' }}> - {entry.error}</span>}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        {formatDateTime(entry.timestamp)} by {entry.user}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div style={styles.footer}>
          <div style={{ marginBottom: '5px' }}><strong>AnthroSafe™ Powered by Field Driven Data™</strong></div>
          <div>© 2026 SLP Alaska, LLC. All rights reserved.</div>
        </div>
      </div>
    </div>
  );
}

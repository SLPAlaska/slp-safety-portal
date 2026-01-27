'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://iypezirwdlqpptjpeeyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
);

const SLP_DOMAIN = '@slpalaska.com';

const SLP_TEAM = [
  { name: 'Brian', email: 'brian@slpalaska.com', role: 'Admin', notifications: ['all'] },
  { name: 'Daniel', email: 'daniel@slpalaska.com', role: 'Investigator', notifications: ['assigned', 'deadlines'] },
  { name: 'Mick', email: 'mick@slpalaska.com', role: 'Investigator', notifications: ['assigned', 'deadlines'] },
  { name: 'Lonnie', email: 'lonnie@slpalaska.com', role: 'Investigator', notifications: ['assigned', 'deadlines'] },
  { name: 'Todd', email: 'todd@slpalaska.com', role: 'Investigator', notifications: ['assigned', 'deadlines'] },
  { name: 'Krystal', email: 'krystal@slpalaska.com', role: 'Coordinator', notifications: ['new_incidents', 'deadlines'] },
  { name: 'Britney', email: 'britney@slpalaska.com', role: 'Coordinator', notifications: ['new_incidents', 'deadlines'] }
];

const NOTIFICATION_TYPES = [
  { id: 'new_incident', label: 'New Incident Reported', icon: '🚨', description: 'When a new incident is submitted' },
  { id: 'sif_alert', label: 'SIF/PSIF Alert', icon: '⚫', description: 'When a SIF or PSIF-Critical incident is reported' },
  { id: 'assigned', label: 'Investigation Assigned', icon: '👤', description: 'When you are assigned to an investigation' },
  { id: 'deadline_7day', label: '7-Day Deadline Warning', icon: '⏰', description: '7 days before investigation deadline' },
  { id: 'deadline_3day', label: '3-Day Deadline Warning', icon: '⚠️', description: '3 days before investigation deadline' },
  { id: 'overdue', label: 'Overdue Alert', icon: '🚨', description: 'When investigation passes deadline' },
  { id: 'ca_assigned', label: 'Corrective Action Assigned', icon: '✅', description: 'When a CA is assigned to someone' },
  { id: 'ca_due_soon', label: 'CA Due Soon', icon: '📅', description: '7 days before CA target date' },
  { id: 'ca_overdue', label: 'CA Overdue', icon: '❌', description: 'When CA passes target date' },
  { id: 'status_change', label: 'Status Change', icon: '🔄', description: 'When investigation status changes' },
  { id: 'weekly_digest', label: 'Weekly Digest', icon: '📊', description: 'Weekly summary every Monday' }
];

const styles = {
  container: { minHeight: '100vh', background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)', padding: '20px' },
  wrapper: { maxWidth: '1200px', margin: '0 auto' },
  header: { background: 'linear-gradient(135deg, #991b1b 0%, #c41e3a 100%)', borderRadius: '16px 16px 0 0', padding: '25px 30px', color: 'white' },
  headerTitle: { fontSize: '28px', fontWeight: '700' },
  headerSubtitle: { fontSize: '14px', opacity: 0.9, marginTop: '5px' },
  card: { background: '#fff', borderRadius: '0 0 16px 16px', padding: '25px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' },
  loginCard: { background: '#fff', borderRadius: '16px', padding: '40px', maxWidth: '450px', margin: '50px auto', boxShadow: '0 10px 40px rgba(0,0,0,0.2)', textAlign: 'center' },
  sectionHeader: { background: '#1e3a8a', color: 'white', padding: '12px 20px', borderRadius: '8px', fontSize: '16px', fontWeight: '600', marginBottom: '20px', marginTop: '25px', display: 'flex', alignItems: 'center', gap: '10px' },
  notificationCard: { border: '2px solid #e2e8f0', borderRadius: '12px', padding: '20px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' },
  notificationInfo: { display: 'flex', alignItems: 'center', gap: '15px', flex: 1 },
  notificationIcon: { fontSize: '28px', width: '50px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', borderRadius: '10px' },
  notificationText: { flex: 1 },
  notificationTitle: { fontWeight: '700', fontSize: '15px', marginBottom: '3px' },
  notificationDesc: { fontSize: '13px', color: '#64748b' },
  toggle: { width: '50px', height: '26px', borderRadius: '13px', background: '#e2e8f0', position: 'relative', cursor: 'pointer', transition: 'all 0.3s' },
  toggleActive: { background: '#22c55e' },
  toggleKnob: { width: '22px', height: '22px', borderRadius: '11px', background: 'white', position: 'absolute', top: '2px', left: '2px', transition: 'all 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' },
  toggleKnobActive: { left: '26px' },
  pendingCard: { border: '2px solid #f59e0b', borderRadius: '12px', padding: '15px', marginBottom: '10px', background: '#fffbeb' },
  sentCard: { border: '2px solid #22c55e', borderRadius: '12px', padding: '15px', marginBottom: '10px', background: '#f0fdf4' },
  input: { width: '100%', padding: '12px 15px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box' },
  actionBtn: { padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
  primaryBtn: { background: 'linear-gradient(135deg, #991b1b 0%, #c41e3a 100%)', color: 'white' },
  secondaryBtn: { background: '#1e3a8a', color: 'white' },
  successBtn: { background: '#22c55e', color: 'white' },
  badge: { display: 'inline-block', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  th: { background: '#1e3a8a', color: 'white', padding: '12px 15px', textAlign: 'left', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase' },
  td: { padding: '12px 15px', borderBottom: '1px solid #e2e8f0' },
  footer: { textAlign: 'center', padding: '20px', color: 'white', fontSize: '13px' },
  submitBtn: { width: '100%', padding: '14px', background: 'linear-gradient(135deg, #991b1b 0%, #c41e3a 100%)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginBottom: '25px' },
  statCard: { background: '#f8fafc', borderRadius: '12px', padding: '20px', textAlign: 'center', border: '2px solid #e2e8f0' },
  statNumber: { fontSize: '32px', fontWeight: '700', marginBottom: '5px' },
  statLabel: { fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }
};

function isSLPTeam(email) { return email && email.toLowerCase().endsWith(SLP_DOMAIN); }
function formatDate(d) { return d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'; }
function formatDateTime(d) { return d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '-'; }

export default function NotificationCenter() {
  const [userEmail, setUserEmail] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  
  // Notification preferences
  const [preferences, setPreferences] = useState({});
  
  // Pending notifications to send
  const [pendingNotifications, setPendingNotifications] = useState([]);
  const [sentNotifications, setSentNotifications] = useState([]);
  const [stats, setStats] = useState({ pending: 0, sentToday: 0, sentWeek: 0 });

  useEffect(() => {
    const saved = localStorage.getItem('slp_user_email');
    if (saved && isSLPTeam(saved)) {
      setUserEmail(saved);
      setIsAuthenticated(true);
      loadPreferences(saved);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      generatePendingNotifications();
      loadSentNotifications();
    }
  }, [isAuthenticated]);

  function loadPreferences(email) {
    // Load from localStorage (in production, this would be from database)
    const saved = localStorage.getItem(`notification_prefs_${email}`);
    if (saved) {
      setPreferences(JSON.parse(saved));
    } else {
      // Default all on
      const defaults = {};
      NOTIFICATION_TYPES.forEach(t => defaults[t.id] = true);
      setPreferences(defaults);
    }
  }

  function savePreferences() {
    localStorage.setItem(`notification_prefs_${userEmail}`, JSON.stringify(preferences));
    alert('Preferences saved!');
  }

  function togglePreference(id) {
    setPreferences(prev => ({ ...prev, [id]: !prev[id] }));
  }

  async function generatePendingNotifications() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const in7Days = new Date(today);
      in7Days.setDate(in7Days.getDate() + 7);
      const in3Days = new Date(today);
      in3Days.setDate(in3Days.getDate() + 3);

      // Fetch incidents
      const { data: incidents } = await supabase
        .from('incidents')
        .select('*')
        .not('status', 'in', '("Closed","Approved")')
        .order('investigation_deadline', { ascending: true });

      // Fetch CAs
      const { data: cas } = await supabase
        .from('investigation_corrective_actions')
        .select('*, incidents(incident_id, company_name)')
        .not('action_status', 'in', '("Completed","Verified")')
        .order('target_date', { ascending: true });

      const pending = [];

      // Check for overdue investigations
      (incidents || []).forEach(inc => {
        if (inc.investigation_deadline) {
          const deadline = new Date(inc.investigation_deadline);
          if (deadline < today) {
            pending.push({
              type: 'overdue',
              icon: '🚨',
              title: `OVERDUE: ${inc.incident_id}`,
              message: `Investigation was due ${formatDate(inc.investigation_deadline)}`,
              recipient: inc.team_leader_email || 'brian@slpalaska.com',
              incident_id: inc.incident_id,
              urgency: 'high',
              data: inc
            });
          } else if (deadline <= in3Days) {
            pending.push({
              type: 'deadline_3day',
              icon: '⚠️',
              title: `3-Day Warning: ${inc.incident_id}`,
              message: `Investigation due ${formatDate(inc.investigation_deadline)}`,
              recipient: inc.team_leader_email || 'brian@slpalaska.com',
              incident_id: inc.incident_id,
              urgency: 'medium',
              data: inc
            });
          } else if (deadline <= in7Days) {
            pending.push({
              type: 'deadline_7day',
              icon: '⏰',
              title: `7-Day Warning: ${inc.incident_id}`,
              message: `Investigation due ${formatDate(inc.investigation_deadline)}`,
              recipient: inc.team_leader_email || 'brian@slpalaska.com',
              incident_id: inc.incident_id,
              urgency: 'low',
              data: inc
            });
          }
        }
      });

      // Check for overdue CAs
      (cas || []).forEach(ca => {
        if (ca.target_date) {
          const targetDate = new Date(ca.target_date);
          if (targetDate < today) {
            pending.push({
              type: 'ca_overdue',
              icon: '❌',
              title: `OVERDUE CA: ${ca.incidents?.incident_id || ''} CA-${ca.action_number}`,
              message: `Action was due ${formatDate(ca.target_date)}`,
              recipient: ca.action_owner_email || 'brian@slpalaska.com',
              urgency: 'high',
              data: ca
            });
          } else if (targetDate <= in7Days) {
            pending.push({
              type: 'ca_due_soon',
              icon: '📅',
              title: `CA Due Soon: ${ca.incidents?.incident_id || ''} CA-${ca.action_number}`,
              message: `Action due ${formatDate(ca.target_date)}`,
              recipient: ca.action_owner_email || 'brian@slpalaska.com',
              urgency: 'medium',
              data: ca
            });
          }
        }
      });

      // Sort by urgency
      const urgencyOrder = { high: 0, medium: 1, low: 2 };
      pending.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

      setPendingNotifications(pending);
      setStats(prev => ({ ...prev, pending: pending.length }));
    } catch (e) {
      console.error('Error generating notifications:', e);
    }
  }

  async function loadSentNotifications() {
    // In production, this would load from a notifications_log table
    const saved = localStorage.getItem('sent_notifications');
    if (saved) {
      const sent = JSON.parse(saved);
      setSentNotifications(sent.slice(0, 50)); // Keep last 50
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const sentToday = sent.filter(n => new Date(n.sent_at) >= today).length;
      const sentWeek = sent.filter(n => new Date(n.sent_at) >= weekAgo).length;
      
      setStats(prev => ({ ...prev, sentToday, sentWeek }));
    }
  }

  async function sendNotification(notification) {
    // In production, this would call an API to send actual emails
    // For now, we'll simulate and log it
    
    const sentRecord = {
      ...notification,
      sent_at: new Date().toISOString(),
      sent_by: userEmail
    };

    // Add to sent list
    const currentSent = JSON.parse(localStorage.getItem('sent_notifications') || '[]');
    currentSent.unshift(sentRecord);
    localStorage.setItem('sent_notifications', JSON.stringify(currentSent.slice(0, 100)));

    // Remove from pending
    setPendingNotifications(prev => prev.filter(n => n !== notification));
    setSentNotifications(prev => [sentRecord, ...prev].slice(0, 50));
    
    setStats(prev => ({
      ...prev,
      pending: prev.pending - 1,
      sentToday: prev.sentToday + 1,
      sentWeek: prev.sentWeek + 1
    }));

    alert(`Notification sent to ${notification.recipient}!\n\n(In production, this sends an actual email)`);
  }

  async function sendAllPending() {
    if (pendingNotifications.length === 0) return;
    
    if (!confirm(`Send ${pendingNotifications.length} notifications?`)) return;

    for (const notification of pendingNotifications) {
      await sendNotification(notification);
    }
  }

  function handleLogin(e) {
    e.preventDefault();
    if (!loginEmail) { setLoginError('Enter email'); return; }
    if (!isSLPTeam(loginEmail)) { setLoginError('Access restricted to @slpalaska.com'); return; }
    localStorage.setItem('slp_user_email', loginEmail.toLowerCase());
    setUserEmail(loginEmail.toLowerCase());
    setIsAuthenticated(true);
    loadPreferences(loginEmail.toLowerCase());
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
            <h1 style={{ color: '#1e293b', marginBottom: '10px', fontSize: '24px' }}>Notification Center</h1>
            <p style={{ color: '#64748b', marginBottom: '30px' }}>Manage alerts and reminders</p>
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

  // Main Page
  return (
    <div style={styles.container}>
      <div style={styles.wrapper}>
        <a href="/" style={{ display: 'inline-block', marginBottom: '15px', padding: '10px 20px', backgroundColor: '#1e3a5f', color: '#fff', textDecoration: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '500' }}>← Back to Portal</a>

        <div style={styles.header}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
            <div>
              <img src="/Logo.png" alt="SLP Alaska" style={{ maxWidth: '150px', marginBottom: '10px' }} />
              <div style={styles.headerTitle}>🔔 Notification Center</div>
              <div style={styles.headerSubtitle}>Manage alerts, reminders, and email notifications</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>{userEmail}</div>
              <button onClick={handleLogout} style={{ ...styles.actionBtn, background: 'rgba(255,255,255,0.2)', color: 'white', marginTop: '10px', padding: '8px 16px' }}>Sign Out</button>
            </div>
          </div>
        </div>

        <div style={styles.card}>
          {/* Stats */}
          <div style={styles.statsRow}>
            <div style={{ ...styles.statCard, borderColor: '#f59e0b' }}>
              <div style={{ ...styles.statNumber, color: '#f59e0b' }}>{stats.pending}</div>
              <div style={styles.statLabel}>Pending</div>
            </div>
            <div style={{ ...styles.statCard, borderColor: '#22c55e' }}>
              <div style={{ ...styles.statNumber, color: '#22c55e' }}>{stats.sentToday}</div>
              <div style={styles.statLabel}>Sent Today</div>
            </div>
            <div style={{ ...styles.statCard, borderColor: '#3b82f6' }}>
              <div style={{ ...styles.statNumber, color: '#3b82f6' }}>{stats.sentWeek}</div>
              <div style={styles.statLabel}>Sent This Week</div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
            {['pending', 'sent', 'preferences'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  ...styles.actionBtn,
                  background: activeTab === tab ? '#1e3a8a' : '#f1f5f9',
                  color: activeTab === tab ? 'white' : '#64748b'
                }}
              >
                {tab === 'pending' && `📤 Pending (${stats.pending})`}
                {tab === 'sent' && '✅ Sent History'}
                {tab === 'preferences' && '⚙️ Preferences'}
              </button>
            ))}
          </div>

          {/* Pending Tab */}
          {activeTab === 'pending' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0 }}>Pending Notifications</h3>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={generatePendingNotifications} style={{ ...styles.actionBtn, ...styles.secondaryBtn }}>
                    🔄 Refresh
                  </button>
                  {pendingNotifications.length > 0 && (
                    <button onClick={sendAllPending} style={{ ...styles.actionBtn, ...styles.primaryBtn }}>
                      📧 Send All ({pendingNotifications.length})
                    </button>
                  )}
                </div>
              </div>

              {pendingNotifications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
                  <div style={{ fontSize: '48px', marginBottom: '15px' }}>✅</div>
                  <p>No pending notifications</p>
                </div>
              ) : (
                pendingNotifications.map((n, i) => (
                  <div key={i} style={{
                    ...styles.pendingCard,
                    borderColor: n.urgency === 'high' ? '#dc2626' : n.urgency === 'medium' ? '#f59e0b' : '#22c55e',
                    background: n.urgency === 'high' ? '#fef2f2' : n.urgency === 'medium' ? '#fffbeb' : '#f0fdf4'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <span style={{ fontSize: '28px' }}>{n.icon}</span>
                        <div>
                          <div style={{ fontWeight: '700' }}>{n.title}</div>
                          <div style={{ fontSize: '13px', color: '#64748b' }}>{n.message}</div>
                          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '5px' }}>
                            To: <strong>{n.recipient}</strong>
                          </div>
                        </div>
                      </div>
                      <button onClick={() => sendNotification(n)} style={{ ...styles.actionBtn, ...styles.successBtn }}>
                        📧 Send
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Sent Tab */}
          {activeTab === 'sent' && (
            <div>
              <h3 style={{ marginBottom: '20px' }}>Sent Notifications</h3>
              
              {sentNotifications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
                  <div style={{ fontSize: '48px', marginBottom: '15px' }}>📭</div>
                  <p>No notifications sent yet</p>
                </div>
              ) : (
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Type</th>
                      <th style={styles.th}>Title</th>
                      <th style={styles.th}>Recipient</th>
                      <th style={styles.th}>Sent At</th>
                      <th style={styles.th}>Sent By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sentNotifications.map((n, i) => (
                      <tr key={i}>
                        <td style={styles.td}><span style={{ fontSize: '20px' }}>{n.icon}</span></td>
                        <td style={styles.td}>{n.title}</td>
                        <td style={styles.td}>{n.recipient}</td>
                        <td style={styles.td}>{formatDateTime(n.sent_at)}</td>
                        <td style={styles.td}>{n.sent_by}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div>
              <h3 style={{ marginBottom: '20px' }}>Notification Preferences</h3>
              <p style={{ color: '#64748b', marginBottom: '25px' }}>
                Choose which notifications you want to receive. These settings apply to your email ({userEmail}).
              </p>

              {NOTIFICATION_TYPES.map(type => (
                <div key={type.id} style={styles.notificationCard}>
                  <div style={styles.notificationInfo}>
                    <div style={styles.notificationIcon}>{type.icon}</div>
                    <div style={styles.notificationText}>
                      <div style={styles.notificationTitle}>{type.label}</div>
                      <div style={styles.notificationDesc}>{type.description}</div>
                    </div>
                  </div>
                  <div
                    onClick={() => togglePreference(type.id)}
                    style={{
                      ...styles.toggle,
                      ...(preferences[type.id] ? styles.toggleActive : {})
                    }}
                  >
                    <div style={{
                      ...styles.toggleKnob,
                      ...(preferences[type.id] ? styles.toggleKnobActive : {})
                    }} />
                  </div>
                </div>
              ))}

              <div style={{ marginTop: '25px' }}>
                <button onClick={savePreferences} style={{ ...styles.actionBtn, ...styles.primaryBtn }}>
                  💾 Save Preferences
                </button>
              </div>
            </div>
          )}
        </div>

        <div style={styles.footer}>
          <div style={{ marginBottom: '5px' }}>
            <strong>Powered by Predictive Safety Analytics™</strong>
          </div>
          <div>© 2026 SLP Alaska, LLC. All rights reserved.</div>
        </div>
      </div>
    </div>
  );
}

'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://iypezirwdlqpptjpeeyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
);

const SLP_DOMAIN = '@slpalaska.com';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const HIERARCHY_COLORS = {
  1: '#166534', 2: '#15803d', 3: '#eab308', 4: '#f97316', 5: '#dc2626'
};

const STATUS_COLORS = {
  'Open': '#f59e0b',
  'In Progress': '#3b82f6',
  'Completed': '#22c55e',
  'Verified': '#059669',
  'Overdue': '#dc2626'
};

const styles = {
  container: { minHeight: '100vh', background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)', padding: '20px' },
  wrapper: { maxWidth: '1400px', margin: '0 auto' },
  header: { background: 'linear-gradient(135deg, #991b1b 0%, #c41e3a 100%)', borderRadius: '16px 16px 0 0', padding: '20px 25px', color: 'white' },
  headerTitle: { fontSize: '28px', fontWeight: '700' },
  headerSubtitle: { fontSize: '14px', opacity: 0.9, marginTop: '5px' },
  card: { background: '#fff', borderRadius: '0 0 16px 16px', padding: '20px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' },
  loginCard: { background: '#fff', borderRadius: '16px', padding: '40px', maxWidth: '450px', margin: '50px auto', boxShadow: '0 10px 40px rgba(0,0,0,0.2)', textAlign: 'center' },
  toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' },
  monthNav: { display: 'flex', alignItems: 'center', gap: '15px' },
  navBtn: { width: '40px', height: '40px', borderRadius: '50%', border: 'none', background: '#1e3a8a', color: 'white', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  monthTitle: { fontSize: '24px', fontWeight: '700', color: '#1e293b', minWidth: '200px', textAlign: 'center' },
  calendarGrid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', background: '#e2e8f0', borderRadius: '12px', overflow: 'hidden' },
  dayHeader: { background: '#1e3a8a', color: 'white', padding: '12px', textAlign: 'center', fontWeight: '600', fontSize: '13px' },
  dayCell: { background: 'white', minHeight: '120px', padding: '8px', position: 'relative', verticalAlign: 'top' },
  dayCellOther: { background: '#f8fafc' },
  dayCellToday: { background: '#dbeafe' },
  dayNumber: { fontWeight: '600', fontSize: '14px', color: '#1e293b', marginBottom: '5px' },
  dayNumberOther: { color: '#94a3b8' },
  dayNumberToday: { background: '#1e3a8a', color: 'white', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  actionChip: { fontSize: '11px', padding: '4px 8px', borderRadius: '6px', marginBottom: '4px', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', border: '2px solid', transition: 'all 0.2s' },
  actionChipOverdue: { background: '#fee2e2', borderColor: '#dc2626', color: '#991b1b' },
  moreCount: { fontSize: '11px', color: '#64748b', textAlign: 'center', cursor: 'pointer' },
  input: { width: '100%', padding: '10px 12px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' },
  select: { padding: '10px 12px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', background: 'white', minWidth: '160px' },
  actionBtn: { padding: '10px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
  primaryBtn: { background: 'linear-gradient(135deg, #991b1b 0%, #c41e3a 100%)', color: 'white' },
  secondaryBtn: { background: '#1e3a8a', color: 'white' },
  modal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalContent: { background: 'white', borderRadius: '16px', padding: '25px', maxWidth: '500px', width: '90%', maxHeight: '80vh', overflow: 'auto' },
  modalHeader: { fontSize: '18px', fontWeight: '700', color: '#1e293b', marginBottom: '20px' },
  statsRow: { display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' },
  statBadge: { padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' },
  legend: { display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '15px' },
  legendItem: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' },
  legendColor: { width: '12px', height: '12px', borderRadius: '3px' },
  footer: { textAlign: 'center', padding: '20px', color: 'white', fontSize: '13px' },
  submitBtn: { width: '100%', padding: '14px', background: 'linear-gradient(135deg, #991b1b 0%, #c41e3a 100%)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' },
  badge: { display: 'inline-block', padding: '3px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: '600' }
};

function isSLPTeam(email) { return email && email.toLowerCase().endsWith(SLP_DOMAIN); }
function formatDate(d) { return d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'; }

export default function ActionCalendar() {
  const [userEmail, setUserEmail] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(true);

  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [actions, setActions] = useState([]);
  const [investigations, setInvestigations] = useState([]);
  const [companyFilter, setCompanyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [companies, setCompanies] = useState([]);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [dayActions, setDayActions] = useState([]);

  // Stats
  const [stats, setStats] = useState({ total: 0, thisMonth: 0, overdue: 0, dueThisWeek: 0 });

  useEffect(() => {
    const saved = localStorage.getItem('slp_user_email');
    if (saved && isSLPTeam(saved)) { setUserEmail(saved); setIsAuthenticated(true); }
    setLoading(false);
  }, []);

  useEffect(() => { if (isAuthenticated) fetchData(); }, [isAuthenticated, currentDate, companyFilter, statusFilter]);

  async function fetchData() {
    setLoading(true);

    // Get date range for current month view (including overflow days)
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Extend range for calendar overflow
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));

    // Fetch corrective actions
    let query = supabase
      .from('investigation_corrective_actions')
      .select(`
        *,
        incidents (
          incident_id,
          company_name,
          location_name
        )
      `)
      .gte('target_date', startDate.toISOString().split('T')[0])
      .lte('target_date', endDate.toISOString().split('T')[0])
      .order('target_date', { ascending: true });

    if (statusFilter !== 'all') {
      if (statusFilter === 'active') {
        query = query.not('action_status', 'in', '("Completed","Verified")');
      } else {
        query = query.eq('action_status', statusFilter);
      }
    }

    const { data: caData } = await query;
    
    let filteredActions = caData || [];
    if (companyFilter !== 'all') {
      filteredActions = filteredActions.filter(ca => ca.incidents?.company_name === companyFilter);
    }

    // Mark overdue
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    filteredActions = filteredActions.map(ca => ({
      ...ca,
      isOverdue: ca.target_date && new Date(ca.target_date) < today && !['Completed', 'Verified'].includes(ca.action_status)
    }));

    setActions(filteredActions);

    // Fetch investigation deadlines
    const { data: incData } = await supabase
      .from('incidents')
      .select('id, incident_id, company_name, investigation_deadline, status')
      .gte('investigation_deadline', startDate.toISOString().split('T')[0])
      .lte('investigation_deadline', endDate.toISOString().split('T')[0])
      .not('status', 'in', '("Closed","Approved")');

    setInvestigations(incData || []);

    // Get unique companies
    const allCompanies = [...new Set((caData || []).map(ca => ca.incidents?.company_name).filter(Boolean))];
    setCompanies(allCompanies.sort());

    // Calculate stats
    const now = new Date();
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);

    const allCAs = caData || [];
    setStats({
      total: allCAs.length,
      thisMonth: allCAs.filter(ca => {
        const d = new Date(ca.target_date);
        return d >= monthStart && d <= monthEnd;
      }).length,
      overdue: allCAs.filter(ca => ca.target_date && new Date(ca.target_date) < today && !['Completed', 'Verified'].includes(ca.action_status)).length,
      dueThisWeek: allCAs.filter(ca => {
        const d = new Date(ca.target_date);
        return d >= today && d <= weekFromNow && !['Completed', 'Verified'].includes(ca.action_status);
      }).length
    });

    setLoading(false);
  }

  function getCalendarDays() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    // Previous month days
    const firstDayOfWeek = firstDay.getDay();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({ date, isCurrentMonth: false });
    }

    // Current month days
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push({ date: new Date(year, month, d), isCurrentMonth: true });
    }

    // Next month days
    const remaining = 42 - days.length; // 6 rows * 7 days
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }

    return days;
  }

  function getActionsForDate(date) {
    const dateStr = date.toISOString().split('T')[0];
    return actions.filter(ca => ca.target_date === dateStr);
  }

  function getInvestigationsForDate(date) {
    const dateStr = date.toISOString().split('T')[0];
    return investigations.filter(inv => inv.investigation_deadline === dateStr);
  }

  function isToday(date) {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  function prevMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  }

  function nextMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  }

  function goToToday() {
    setCurrentDate(new Date());
  }

  function openDayModal(date, dayActions, dayInvestigations) {
    setSelectedDate(date);
    setDayActions([...dayActions, ...dayInvestigations.map(inv => ({ ...inv, isInvestigation: true }))]);
    setShowModal(true);
  }

  function openActionModal(action) {
    setSelectedAction(action);
    setShowModal(true);
  }

  async function rescheduleAction(actionId, newDate) {
    await supabase
      .from('investigation_corrective_actions')
      .update({ target_date: newDate, updated_at: new Date().toISOString() })
      .eq('id', actionId);

    setShowModal(false);
    fetchData();
    alert('Action rescheduled!');
  }

  function handleLogin(e) {
    e.preventDefault();
    if (!loginEmail) { setLoginError('Enter email'); return; }
    if (!isSLPTeam(loginEmail)) { setLoginError('Access restricted to @slpalaska.com'); return; }
    localStorage.setItem('slp_user_email', loginEmail.toLowerCase());
    setUserEmail(loginEmail.toLowerCase());
    setIsAuthenticated(true);
  }

  // Login
  if (!isAuthenticated) {
    return (
      <div style={styles.container}><div style={styles.wrapper}>
        <a href="/" style={{ display: 'inline-block', marginBottom: '15px', padding: '10px 20px', backgroundColor: '#1e3a5f', color: '#fff', textDecoration: 'none', borderRadius: '6px' }}>← Back to Portal</a>
        <div style={styles.loginCard}>
          <img src="/Logo.png" alt="SLP Alaska" style={{ maxWidth: '200px', margin: '0 auto 25px', display: 'block' }} />
          <h1 style={{ color: '#1e293b', marginBottom: '10px', fontSize: '24px' }}>Action Calendar</h1>
          <p style={{ color: '#64748b', marginBottom: '30px' }}>Visual calendar of corrective action due dates</p>
          <form onSubmit={handleLogin}>
            <input type="email" placeholder="your.name@slpalaska.com" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} style={styles.input} />
            {loginError && <p style={{ color: '#dc2626', fontSize: '14px', marginBottom: '15px' }}>{loginError}</p>}
            <button type="submit" style={styles.submitBtn}>Sign In</button>
          </form>
        </div>
      </div></div>
    );
  }

  const calendarDays = getCalendarDays();

  return (
    <div style={styles.container}>
      <div style={styles.wrapper}>
        <a href="/" style={{ display: 'inline-block', marginBottom: '15px', padding: '10px 20px', backgroundColor: '#1e3a5f', color: '#fff', textDecoration: 'none', borderRadius: '6px' }}>← Back to Portal</a>

        <div style={styles.header}>
          <div>
            <img src="/Logo.png" alt="SLP Alaska" style={{ maxWidth: '150px', marginBottom: '10px' }} />
            <div style={styles.headerTitle}>📅 Action Calendar</div>
            <div style={styles.headerSubtitle}>Visual calendar of corrective action and investigation deadlines</div>
          </div>
        </div>

        <div style={styles.card}>
          {/* Stats */}
          <div style={styles.statsRow}>
            <div style={{ ...styles.statBadge, background: '#dbeafe', color: '#1e40af' }}>
              📋 {stats.total} Total Actions
            </div>
            <div style={{ ...styles.statBadge, background: '#fef3c7', color: '#92400e' }}>
              📅 {stats.thisMonth} This Month
            </div>
            <div style={{ ...styles.statBadge, background: '#fee2e2', color: '#991b1b' }}>
              ⚠️ {stats.overdue} Overdue
            </div>
            <div style={{ ...styles.statBadge, background: '#dcfce7', color: '#166534' }}>
              ⏰ {stats.dueThisWeek} Due This Week
            </div>
          </div>

          {/* Toolbar */}
          <div style={styles.toolbar}>
            <div style={styles.monthNav}>
              <button onClick={prevMonth} style={styles.navBtn}>←</button>
              <div style={styles.monthTitle}>
                {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
              </div>
              <button onClick={nextMonth} style={styles.navBtn}>→</button>
              <button onClick={goToToday} style={{ ...styles.actionBtn, ...styles.secondaryBtn, marginLeft: '10px' }}>Today</button>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)} style={styles.select}>
                <option value="all">All Companies</option>
                {companies.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={styles.select}>
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>

          {/* Legend */}
          <div style={styles.legend}>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendColor, background: '#3b82f6' }} />
              <span>Corrective Action</span>
            </div>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendColor, background: '#8b5cf6' }} />
              <span>Investigation Deadline</span>
            </div>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendColor, background: '#dc2626' }} />
              <span>Overdue</span>
            </div>
          </div>

          {/* Calendar Grid */}
          <div style={styles.calendarGrid}>
            {/* Day Headers */}
            {DAYS.map(day => (
              <div key={day} style={styles.dayHeader}>{day}</div>
            ))}

            {/* Calendar Days */}
            {calendarDays.map((day, i) => {
              const dayActions = getActionsForDate(day.date);
              const dayInvestigations = getInvestigationsForDate(day.date);
              const totalItems = dayActions.length + dayInvestigations.length;
              const maxDisplay = 3;

              return (
                <div
                  key={i}
                  style={{
                    ...styles.dayCell,
                    ...(!day.isCurrentMonth ? styles.dayCellOther : {}),
                    ...(isToday(day.date) ? styles.dayCellToday : {})
                  }}
                  onClick={() => totalItems > 0 && openDayModal(day.date, dayActions, dayInvestigations)}
                >
                  <div style={isToday(day.date) ? styles.dayNumberToday : { ...styles.dayNumber, ...(!day.isCurrentMonth ? styles.dayNumberOther : {}) }}>
                    {day.date.getDate()}
                  </div>

                  {/* Investigation Deadlines */}
                  {dayInvestigations.slice(0, maxDisplay).map(inv => (
                    <div
                      key={`inv-${inv.id}`}
                      style={{ ...styles.actionChip, background: '#ede9fe', borderColor: '#8b5cf6', color: '#5b21b6' }}
                      title={`${inv.incident_id} - Investigation Deadline`}
                    >
                      🔍 {inv.incident_id}
                    </div>
                  ))}

                  {/* Corrective Actions */}
                  {dayActions.slice(0, Math.max(0, maxDisplay - dayInvestigations.length)).map(ca => {
                    const level = parseInt(ca.hierarchy_control?.charAt(0)) || 5;
                    return (
                      <div
                        key={ca.id}
                        style={{
                          ...styles.actionChip,
                          ...(ca.isOverdue ? styles.actionChipOverdue : { background: '#dbeafe', borderColor: '#3b82f6', color: '#1e40af' })
                        }}
                        title={`CA-${ca.action_number}: ${ca.action_description}`}
                        onClick={(e) => { e.stopPropagation(); openActionModal(ca); }}
                      >
                        {ca.isOverdue && '⚠️ '}CA-{ca.action_number}
                      </div>
                    );
                  })}

                  {totalItems > maxDisplay && (
                    <div style={styles.moreCount}>+{totalItems - maxDisplay} more</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div style={styles.footer}>
          <div style={{ marginBottom: '5px' }}><strong>Powered by Predictive Safety Analytics™</strong></div>
          <div>© 2026 SLP Alaska, LLC. All rights reserved.</div>
        </div>
      </div>

      {/* Day Modal */}
      {showModal && selectedDate && !selectedAction && (
        <div style={styles.modal} onClick={() => setShowModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              📅 {formatDate(selectedDate)}
            </div>

            {dayActions.length === 0 ? (
              <p style={{ color: '#64748b' }}>No items on this date</p>
            ) : (
              dayActions.map((item, i) => (
                <div
                  key={i}
                  style={{
                    padding: '15px',
                    background: item.isInvestigation ? '#ede9fe' : item.isOverdue ? '#fee2e2' : '#f8fafc',
                    borderRadius: '8px',
                    marginBottom: '10px',
                    border: `2px solid ${item.isInvestigation ? '#8b5cf6' : item.isOverdue ? '#dc2626' : '#e2e8f0'}`
                  }}
                >
                  {item.isInvestigation ? (
                    <>
                      <div style={{ fontWeight: '700', marginBottom: '5px' }}>🔍 {item.incident_id}</div>
                      <div style={{ fontSize: '13px', color: '#64748b' }}>{item.company_name}</div>
                      <div style={{ fontSize: '12px', color: '#8b5cf6' }}>Investigation Deadline</div>
                    </>
                  ) : (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                        <span style={{ fontWeight: '700' }}>CA-{item.action_number}</span>
                        <span style={{ ...styles.badge, background: STATUS_COLORS[item.action_status] || '#64748b', color: 'white' }}>
                          {item.action_status}
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', marginBottom: '5px' }}>{item.action_description}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        {item.incidents?.incident_id} • {item.incidents?.company_name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        Owner: {item.action_owner_name || 'Unassigned'}
                      </div>
                      <button
                        onClick={() => { setSelectedAction(item); }}
                        style={{ ...styles.actionBtn, ...styles.primaryBtn, marginTop: '10px', width: '100%' }}
                      >
                        View / Reschedule
                      </button>
                    </>
                  )}
                </div>
              ))
            )}

            <button onClick={() => setShowModal(false)} style={{ ...styles.actionBtn, ...styles.secondaryBtn, width: '100%', marginTop: '10px' }}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* Action Detail Modal */}
      {showModal && selectedAction && (
        <div style={styles.modal} onClick={() => { setShowModal(false); setSelectedAction(null); }}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              Corrective Action Details
            </div>

            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <strong style={{ fontSize: '18px' }}>CA-{selectedAction.action_number}</strong>
                <span style={{ ...styles.badge, background: HIERARCHY_COLORS[parseInt(selectedAction.hierarchy_control?.charAt(0))] || '#64748b', color: 'white' }}>
                  {selectedAction.hierarchy_control}
                </span>
              </div>
              <p style={{ margin: '0 0 10px' }}>{selectedAction.action_description}</p>
              <div style={{ fontSize: '13px', color: '#64748b' }}>
                <div>📋 {selectedAction.incidents?.incident_id} • {selectedAction.incidents?.company_name}</div>
                <div>👤 Owner: {selectedAction.action_owner_name || 'Unassigned'}</div>
                <div>📧 {selectedAction.action_owner_email || '-'}</div>
                <div>📅 Current Due Date: <strong>{formatDate(selectedAction.target_date)}</strong></div>
                <div>Status: <span style={{ ...styles.badge, background: STATUS_COLORS[selectedAction.action_status], color: 'white' }}>{selectedAction.action_status}</span></div>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>Reschedule To:</label>
              <input
                type="date"
                defaultValue={selectedAction.target_date}
                id="newDate"
                style={styles.input}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setShowModal(false); setSelectedAction(null); }} style={{ ...styles.actionBtn, ...styles.secondaryBtn, flex: 1 }}>
                Cancel
              </button>
              <button
                onClick={() => {
                  const newDate = document.getElementById('newDate').value;
                  if (newDate) rescheduleAction(selectedAction.id, newDate);
                }}
                style={{ ...styles.actionBtn, ...styles.primaryBtn, flex: 1 }}
              >
                Save New Date
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

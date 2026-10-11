'use client';
// /corrective-actions — where the CA nag email sends action owners.
//
// Reads and writes ONLY through /api/corrective-actions, which scopes rows to
// the signed-in person (app/lib/caAccess.js): SLP staff see everything; a
// client sees the CAs they own, and a company admin sees their own company's.
// Sign-in is the AdminGate magic link in ./layout.js. The old "type any email"
// login and direct anon-key table reads were removed: RLS returned nothing to
// clients, and the saves wrote columns that do not exist.
import { useState, useEffect, useCallback } from 'react';
import { authFetch } from '@/lib/authFetch';

const HIERARCHY_OF_CONTROLS = [
  { level: 1, name: 'Elimination', color: '#166534' },
  { level: 2, name: 'Substitution', color: '#15803d' },
  { level: 3, name: 'Engineering Controls', color: '#eab308' },
  { level: 4, name: 'Administrative Controls', color: '#3b6ea5' },
  { level: 5, name: 'PPE', color: '#dc2626' }
];
const CLOSED = ['completed', 'complete', 'verified', 'verified effective', 'closed', 'cancelled', 'canceled', 'void'];
const isClosed = (s) => CLOSED.includes(String(s || '').toLowerCase());

const styles = {
  container: { minHeight: '100vh', background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)', padding: '20px' },
  wrapper: { maxWidth: '1200px', margin: '0 auto' },
  header: { background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)', borderRadius: '16px 16px 0 0', padding: '25px 30px', color: 'white' },
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
  primaryBtn: { background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)', color: 'white' },
  secondaryBtn: { background: '#1e3a8a', color: 'white' },
  successBtn: { background: '#059669', color: 'white' },
  outlineBtn: { background: 'white', color: '#1e3a8a', border: '2px solid #1e3a8a' },
  progressBar: { height: '10px', background: '#e2e8f0', borderRadius: '5px', overflow: 'hidden', marginTop: '10px' },
  progressFill: { height: '100%', background: 'linear-gradient(90deg, #1e3a5f, #2d5a87)', transition: 'width 0.3s' },
  modal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalContent: { background: 'white', borderRadius: '16px', padding: '30px', maxWidth: '600px', width: '90%', maxHeight: '80vh', overflow: 'auto' },
  modalHeader: { fontSize: '20px', fontWeight: '700', color: '#1e293b', marginBottom: '20px' },
  footer: { textAlign: 'center', padding: '20px', color: 'white', fontSize: '13px' },
  submitBtn: { width: '100%', padding: '14px', background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
  formGroup: { marginBottom: '20px' },
  label: { display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1e293b', fontSize: '14px' }
};

function formatDate(d) { return d ? new Date(String(d).length === 10 ? d + 'T12:00:00' : d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'; }
function dueOf(ca) { return ca.target_date || ca.due_date || null; }
function getDeadlineStatus(due, status) {
  if (!due || isClosed(status)) return { isOverdue: false, text: '' };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(due + 'T00:00:00');
  const diffDays = Math.round((target - today) / 86400000);
  if (diffDays < 0) return { isOverdue: true, text: `${Math.abs(diffDays)} days overdue`, color: '#dc2626' };
  if (diffDays <= 7) return { isOverdue: false, text: `${diffDays} days left`, color: '#f59e0b' };
  return { isOverdue: false, text: `${diffDays} days left`, color: '#22c55e' };
}

export default function CorrectiveActionsTracker() {
  const [rows, setRows] = useState([]);
  const [scope, setScope] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [statusFilter, setStatusFilter] = useState('open');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [selectedCA, setSelectedCA] = useState(null);
  const [updateData, setUpdateData] = useState({ action_status: '', notes: '' });
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState('');

  const fetchActions = useCallback(async () => {
    setLoading(true); setLoadError('');
    try {
      const res = await authFetch('/api/corrective-actions');
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || `Could not load (${res.status})`);
      setRows(j.rows || []); setScope(j.scope || null);
    } catch (e) { setLoadError(e.message || 'Could not load corrective actions.'); }
    setLoading(false);
  }, []);
  useEffect(() => { fetchActions(); }, [fetchActions]);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const withFlags = rows.map(ca => ({ ...ca, isOverdue: getDeadlineStatus(dueOf(ca), ca.effective_status).isOverdue }));
  const companies = [...new Set(withFlags.map(ca => ca.incident?.company_name).filter(Boolean))].sort();
  const visible = withFlags.filter(ca => {
    if (companyFilter !== 'all' && ca.incident?.company_name !== companyFilter) return false;
    if (statusFilter === 'all') return true;
    if (statusFilter === 'open') return !isClosed(ca.effective_status);
    if (statusFilter === 'Overdue') return ca.isOverdue;
    return ca.effective_status === statusFilter;
  });
  const stats = {
    total: withFlags.length,
    open: withFlags.filter(a => !isClosed(a.effective_status) && a.effective_status !== 'In Progress').length,
    inProgress: withFlags.filter(a => a.effective_status === 'In Progress').length,
    completed: withFlags.filter(a => isClosed(a.effective_status)).length,
    overdue: withFlags.filter(a => a.isOverdue).length,
  };

  function openUpdateModal(ca) {
    setSelectedCA(ca); setSaveError('');
    const statuses = scope?.statuses || [];
    setUpdateData({ action_status: statuses.includes(ca.effective_status) ? ca.effective_status : 'Completed', notes: '' });
  }

  async function saveUpdate() {
    if (!selectedCA) return;
    setSaving(true); setSaveError('');
    try {
      const res = await authFetch('/api/corrective-actions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedCA.id, action_status: updateData.action_status, notes: updateData.notes }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || `Save failed (${res.status})`);
      setSelectedCA(null);
      setFlash(`CA-${selectedCA.action_number ?? selectedCA.id} set to ${updateData.action_status}.` + (isClosed(updateData.action_status) ? ' Reminder emails for it stop.' : ''));
      fetchActions();
    } catch (e) { setSaveError(e.message || 'Save failed.'); }
    setSaving(false);
  }

  const subtitle = !scope ? '' : scope.all_companies ? 'All Investigation Corrective Actions (SLP staff)'
    : scope.company_admin ? `${scope.company_name || 'Your company'} corrective actions + any assigned to ${scope.email}`
    : `Actions assigned to ${scope.email}`;

  return (
    <div style={styles.container}>
      <div style={styles.wrapper}>
        <a href="/" style={{ display: 'inline-block', marginBottom: '15px', padding: '10px 20px', backgroundColor: '#1e3a5f', color: '#fff', textDecoration: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '500' }}>← Back to Portal</a>
        <div style={styles.header}>
          <img src="/Logo.png" alt="SLP Alaska" style={{ maxWidth: '150px', marginBottom: '10px' }} />
          <div style={styles.headerTitle}>✅ Corrective Actions</div>
          <div style={styles.headerSubtitle}>{subtitle}</div>
        </div>
        <div style={styles.card}>
          {flash && <div role="status" style={{ background: '#dcfce7', border: '2px solid #16a34a', color: '#14532d', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontWeight: 600 }}>{flash}</div>}
          <div style={styles.statsRow}>
            {[['Total', stats.total, '#1e3a8a', '#e2e8f0'], ['Open', stats.open, '#f59e0b', '#f59e0b'], ['In Progress', stats.inProgress, '#3b82f6', '#3b82f6'], ['Closed', stats.completed, '#22c55e', '#22c55e'], ['Overdue', stats.overdue, '#dc2626', '#dc2626']].map(([l, n, c, b]) => (
              <div key={l} style={{ ...styles.statCard, borderColor: b }}><div style={{ ...styles.statNumber, color: c }}>{n}</div><div style={styles.statLabel}>{l}</div></div>
            ))}
          </div>
          <div style={styles.filterRow}>
            <div style={styles.filterGroup}>
              <span style={styles.filterLabel}>Status</span>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={styles.select}>
                <option value="open">Still open</option>
                <option value="all">All</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Verified">Verified</option>
                <option value="Overdue">Overdue</option>
              </select>
            </div>
            {companies.length > 1 && (
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
              <button onClick={fetchActions} style={{ ...styles.actionBtn, ...styles.secondaryBtn }}>🔄 Refresh</button>
            </div>
          </div>

          {loadError ? (
            <div role="alert" style={{ background: '#fef2f2', border: '2px solid #b91c1c', color: '#7f1d1d', padding: '14px', borderRadius: '8px', fontWeight: 600 }}>{loadError}</div>
          ) : loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}><p>Loading...</p></div>
          ) : visible.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
              <div style={{ fontSize: '48px', marginBottom: '15px' }}>✅</div>
              <p>{rows.length === 0 ? `No corrective actions are assigned to ${scope?.email || 'you'}.` : 'Nothing matches this filter.'}</p>
            </div>
          ) : visible.map(ca => {
            const deadline = getDeadlineStatus(dueOf(ca), ca.effective_status);
            const controlLevel = parseInt(String(ca.hierarchy_control || '').charAt(0)) || 5;
            const controlColor = HIERARCHY_OF_CONTROLS.find(h => h.level === controlLevel)?.color || '#64748b';
            const closed = isClosed(ca.effective_status);
            return (
              <div key={ca.id} data-testid="ca-card" style={{ ...styles.caCard, ...(ca.isOverdue ? styles.caCardOverdue : {}) }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: '700', fontSize: '16px' }}>CA-{ca.action_number ?? ca.id}</span>
                      {ca.hierarchy_control && <span style={{ ...styles.badge, background: controlColor, color: 'white' }}>{ca.hierarchy_control}</span>}
                      <span style={{ ...styles.badge, background: closed ? '#dcfce7' : ca.effective_status === 'In Progress' ? '#dbeafe' : ca.isOverdue ? '#fef2f2' : '#fef3c7', color: closed ? '#166534' : ca.effective_status === 'In Progress' ? '#1e40af' : ca.isOverdue ? '#991b1b' : '#92400e' }}>
                        {ca.isOverdue ? '⚠️ Overdue' : ca.effective_status}
                      </span>
                    </div>
                    {ca.incident && (
                      <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '5px' }}>
                        {scope?.all_companies
                          ? <a href={`/investigation-workbench/${ca.incident.id}`} style={{ color: '#1e3a8a', textDecoration: 'none' }}>{ca.incident.incident_id}</a>
                          : <strong>{ca.incident.incident_id}</strong>}
                        {' • '}{ca.incident.company_name}{ca.incident.location_name ? ' • ' + ca.incident.location_name : ''}{ca.incident.incident_date ? ' • ' + formatDate(ca.incident.incident_date) : ''}
                        {ca.incident.brief_description && <div style={{ marginTop: '4px', color: '#334155' }}>{String(ca.incident.brief_description).replace(/^Brief Description:\s*/i, '')}</div>}
                      </div>
                    )}
                  </div>
                  {!(closed && !scope?.all_companies && ca.effective_status !== 'Completed') && (
                    <button onClick={() => openUpdateModal(ca)} style={{ ...styles.actionBtn, ...(closed ? styles.outlineBtn : styles.successBtn) }}>
                      {closed ? 'Update' : 'Close / Update'}
                    </button>
                  )}
                </div>
                <p style={{ margin: '0 0 15px', fontSize: '15px', whiteSpace: 'pre-wrap' }}>{ca.action_description || ca.description}</p>
                <div style={{ display: 'flex', gap: '20px', fontSize: '13px', color: '#64748b', flexWrap: 'wrap' }}>
                  <span>👤 {ca.action_owner_name || 'Unassigned'}</span>
                  <span>📧 {ca.action_owner_email || '-'}</span>
                  <span style={{ color: deadline.color, fontWeight: deadline.isOverdue ? '700' : '400' }}>📅 Due: {formatDate(dueOf(ca))} {deadline.text && `(${deadline.text})`}</span>
                </div>
                {ca.completion_notes && (
                  <div style={{ marginTop: '15px', padding: '10px 15px', background: '#f8fafc', borderRadius: '8px', fontSize: '14px' }}>
                    <strong style={{ fontSize: '12px', color: '#64748b' }}>CLOSE-OUT NOTES:</strong>
                    <p style={{ margin: '5px 0 0', whiteSpace: 'pre-wrap' }}>{ca.completion_notes}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div style={styles.footer}><span style={{ fontWeight: '500' }}>AnthroSafe™ Field Driven Safety</span> | © 2026 SLP Alaska, LLC</div>
      </div>

      {selectedCA && (
        <div style={styles.modal} onClick={() => setSelectedCA(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>Close / Update CA-{selectedCA.action_number ?? selectedCA.id}</div>
            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
              {selectedCA.incident && <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>{selectedCA.incident.incident_id} • {selectedCA.incident.company_name}</div>}
              <p style={{ margin: 0, fontSize: '14px', whiteSpace: 'pre-wrap' }}>{selectedCA.action_description || selectedCA.description}</p>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Status</label>
              <select value={updateData.action_status} onChange={(e) => setUpdateData({ ...updateData, action_status: e.target.value })} style={styles.select}>
                {(scope?.statuses || []).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {updateData.action_status === 'Completed' && <p style={{ fontSize: '13px', color: '#475569', margin: '8px 0 0' }}>Completed stops the reminder emails. SLP Alaska then verifies it worked.</p>}
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>What was done {updateData.action_status === 'Completed' ? '*' : '(optional)'}</label>
              <textarea value={updateData.notes} onChange={(e) => setUpdateData({ ...updateData, notes: e.target.value })}
                placeholder="What was changed, who did it, when, and where the proof is (photos, procedure, sign-in sheet)..." style={styles.textarea} />
            </div>
            {saveError && <div role="alert" style={{ background: '#fef2f2', border: '2px solid #b91c1c', color: '#7f1d1d', padding: '10px', borderRadius: '8px', marginBottom: '12px', fontWeight: 600 }}>{saveError}</div>}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setSelectedCA(null)} style={{ ...styles.actionBtn, ...styles.outlineBtn }}>Cancel</button>
              <button onClick={saveUpdate} disabled={saving} style={{ ...styles.actionBtn, ...styles.primaryBtn, opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

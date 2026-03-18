'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const COMPANIES = ['All', 'A-C Electric', 'AKE-Line', 'Apache Corp.', 'Armstrong Oil & Gas', 'ASRC Energy Services', 'CCI-Industrial', 'Chosen Construction', 'CINGSA', 'Coho Enterprises', 'Conam Construction', 'ConocoPhillips', 'Five Star Oilfield Services', 'Fox Energy Services', 'G.A. West', 'GBR Equipment', 'GLM Energy Services', 'Graham Industrial Coatings', 'Harvest Midstream', 'Hilcorp Alaska', 'MagTec Alaska', 'Merkes Builders', 'Narwhal Exploration', 'Nordic-Calista', 'Parker TRS', 'Peninsula Paving', 'Pollard Wireline', 'Ridgeline Oilfield Services', 'Santos', 'Summit Excavation', 'Tesoro Refinery', 'Yellowjacket', 'Other'];

const STATUSES = ['All', 'Open', 'In Progress', 'Delayed', 'Pending Verification', 'Closed'];
const PRIORITIES = ['High', 'Medium', 'Low'];
const HIERARCHY_CONTROLS = ['1-Elimination', '2-Substitution', '3-Engineering Controls', '4-Administrative Controls', '5-PPE'];

const PRIORITY_COLORS = { 'High': '#ef4444', 'Medium': '#f59e0b', 'Low': '#22c55e' };
const STATUS_COLORS = {
  'Open': { bg: '#fee2e2', color: '#dc2626' },
  'In Progress': { bg: '#fef3c7', color: '#d97706' },
  'Delayed': { bg: '#fce7f3', color: '#be185d' },
  'Pending Verification': { bg: '#dbeafe', color: '#1e40af' },
  'Closed': { bg: '#dcfce7', color: '#16a34a' }
};

const SLP_TEAM = [
  'Brian Pletcher', 'Jeremiah Johnson', 'Todd Larson', 'Ryan McAfee',
  'Matt Sherbahn', 'Tyler Wallis', 'John Doe'
];

export default function SAILManagement() {
  const [loading, setLoading] = useState(true);
  const [sailItems, setSailItems] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [stats, setStats] = useState({ total: 0, open: 0, inProgress: 0, delayed: 0, closed: 0, avgDaysOpen: 0, overdue: 0 });

  // Edit modal
  const [editItem, setEditItem] = useState(null);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);

  // Detail view
  const [detailItem, setDetailItem] = useState(null);

  useEffect(() => { loadData(); }, [selectedCompany, selectedStatus]);

  async function loadData() {
    setLoading(true);
    try {
      let query = supabase.from('sail_log').select('*').order('date', { ascending: false });
      if (selectedCompany !== 'All') query = query.eq('client_company', selectedCompany);
      if (selectedStatus !== 'All') query = query.eq('status', selectedStatus);

      const { data: items, error } = await query;
      if (error) throw error;

      setSailItems(items || []);

      const all = items || [];
      const open = all.filter(i => i.status === 'Open');
      const inProg = all.filter(i => i.status === 'In Progress');
      const delayed = all.filter(i => i.status === 'Delayed');
      const closed = all.filter(i => i.status === 'Closed');
      const activeItems = all.filter(i => i.status !== 'Closed');
      const overdue = activeItems.filter(i => i.target_completion_date && new Date(i.target_completion_date) < new Date());
      const avgDays = activeItems.length > 0
        ? Math.round(activeItems.reduce((sum, item) => sum + calcDays(item.date), 0) / activeItems.length)
        : 0;

      setStats({ total: all.length, open: open.length, inProgress: inProg.length, delayed: delayed.length, closed: closed.length, avgDaysOpen: avgDays, overdue: overdue.length });
    } catch (error) {
      console.error('Error loading SAIL data:', error);
      alert('Error loading SAIL data: ' + error.message);
    } finally { setLoading(false); }
  }

  function calcDays(dateStr) {
    if (!dateStr) return 0;
    return Math.floor((new Date() - new Date(dateStr)) / (1000 * 60 * 60 * 24));
  }

  function isOverdue(item) {
    return item.status !== 'Closed' && item.target_completion_date && new Date(item.target_completion_date) < new Date();
  }

  function openEdit(item) {
    setEditData({
      status: item.status || 'Open',
      assigned_to: item.assigned_to || '',
      assigned_to_email: item.assigned_to_email || '',
      target_completion_date: item.target_completion_date || '',
      priority: item.priority || 'Medium',
      hierarchy_control: item.hierarchy_control || '',
      corrective_action: item.corrective_action || '',
      immediate_action: item.immediate_action || '',
      action_item_description: item.action_item_description || '',
      update_narrative: ''
    });
    setEditItem(item);
  }

  async function saveEdit() {
    if (!editItem) return;
    setSaving(true);
    try {
      const updates = {
        status: editData.status,
        assigned_to: editData.assigned_to || null,
        target_completion_date: editData.target_completion_date || null,
        priority: editData.priority,
        hierarchy_control: editData.hierarchy_control || null,
        corrective_action: editData.corrective_action || null,
        immediate_action: editData.immediate_action || null,
        action_item_description: editData.action_item_description
      };

      // If closing, set closure fields
      if (editData.status === 'Closed' && editItem.status !== 'Closed') {
        updates.date_closed = new Date().toLocaleDateString('en-CA');
        updates.closure_date = new Date().toLocaleDateString('en-CA');
        updates.closed_by = 'SLP Safety';
      }

      // If reopening, clear closure fields
      if (editData.status !== 'Closed' && editItem.status === 'Closed') {
        updates.date_closed = null;
        updates.closure_date = null;
        updates.closed_by = null;
      }

      // Append narrative to corrective_action if provided
      if (editData.update_narrative && editData.update_narrative.trim()) {
        const timestamp = new Date().toLocaleString();
        const narrativeEntry = '\n\n--- Update ' + timestamp + ' ---\n' + editData.update_narrative.trim();
        updates.corrective_action = (updates.corrective_action || '') + narrativeEntry;
      }

      const { error } = await supabase.from('sail_log').update(updates).eq('id', editItem.id);
      if (error) throw error;

      alert('SAIL item updated!');
      setEditItem(null);
      loadData();
    } catch (error) {
      alert('Error: ' + error.message);
    } finally { setSaving(false); }
  }

  // Filter and sort
  const filtered = sailItems.filter(item => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (item.action_item_description || '').toLowerCase().includes(s) ||
      (item.assigned_to || '').toLowerCase().includes(s) ||
      (item.client_company || '').toLowerCase().includes(s) ||
      (item.location || '').toLowerCase().includes(s) ||
      (item.category || '').toLowerCase().includes(s) ||
      (item.corrective_action || '').toLowerCase().includes(s);
  }).sort((a, b) => {
    let va = a[sortBy] || '';
    let vb = b[sortBy] || '';
    if (sortBy === 'date' || sortBy === 'target_completion_date') {
      va = va ? new Date(va).getTime() : 0;
      vb = vb ? new Date(vb).getTime() : 0;
    }
    if (typeof va === 'string') { va = va.toLowerCase(); vb = vb.toLowerCase(); }
    if (va < vb) return sortDir === 'asc' ? -1 : 1;
    if (va > vb) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  function toggleSort(col) {
    if (sortBy === col) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  }

  const s = {
    container: { minHeight: '100vh', background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)', padding: '20px' },
    wrapper: { maxWidth: '1500px', margin: '0 auto' },
    header: { background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', borderRadius: '16px 16px 0 0', padding: '25px 30px', color: 'white' },
    card: { background: 'white', borderRadius: '0 0 16px 16px', padding: '25px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' },
    statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '25px' },
    statCard: { background: '#f8fafc', borderRadius: '12px', padding: '16px', textAlign: 'center', border: '2px solid #e2e8f0' },
    statNum: { fontSize: '28px', fontWeight: '700', marginBottom: '3px' },
    statLabel: { fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' },
    filterRow: { display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap' },
    select: { padding: '8px 12px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', background: 'white' },
    input: { padding: '8px 12px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', width: '100%', boxSizing: 'border-box' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { background: '#f8fafc', padding: '10px 12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#475569', borderBottom: '2px solid #e2e8f0', cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none' },
    td: { padding: '10px 12px', borderBottom: '1px solid #f1f5f9', fontSize: '13px', verticalAlign: 'top' },
    badge: { display: 'inline-block', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' },
    btn: { padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600' },
    primaryBtn: { background: '#1e40af', color: 'white' },
    successBtn: { background: '#22c55e', color: 'white' },
    warningBtn: { background: '#f59e0b', color: 'white' },
    dangerBtn: { background: '#ef4444', color: 'white' },
    secondaryBtn: { background: '#64748b', color: 'white' },
    modal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modalContent: { background: 'white', borderRadius: '16px', padding: '30px', maxWidth: '750px', width: '95%', maxHeight: '90vh', overflowY: 'auto' },
    textarea: { width: '100%', padding: '10px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', minHeight: '80px', resize: 'vertical', boxSizing: 'border-box' },
    fieldLabel: { display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '5px' },
    fieldGroup: { marginBottom: '16px' },
    twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' },
    threeCol: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' },
    footer: { textAlign: 'center', padding: '20px', color: 'rgba(255,255,255,0.7)', fontSize: '13px', marginTop: '20px' }
  };

  if (loading) return (
    <div style={{ ...s.container, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'white', fontSize: '24px' }}>Loading SAIL items...</div>
    </div>
  );

  return (
    <div style={s.container}>
      <div style={s.wrapper}>
        {/* Header */}
        <div style={s.header}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <button onClick={() => window.location.href = '/portal'} style={{ background: 'rgba(255,255,255,0.2)', color: 'white', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>{'\u2190'} Back to Portal</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <img src="/Logo.png" alt="SLP Alaska" style={{ height: '50px' }} />
            <div>
              <h1 style={{ margin: 0, fontSize: '26px' }}>SAIL Log Management</h1>
              <p style={{ margin: '5px 0 0 0', opacity: 0.9, fontSize: '14px' }}>Safety Action Item Log {'\u2014'} Track, Update, Reassign, Close</p>
            </div>
          </div>
        </div>

        <div style={s.card}>
          {/* Stats */}
          <div style={s.statsRow}>
            <div style={s.statCard}><div style={{ ...s.statNum, color: '#3b82f6' }}>{stats.total}</div><div style={s.statLabel}>Total</div></div>
            <div style={s.statCard}><div style={{ ...s.statNum, color: '#ef4444' }}>{stats.open}</div><div style={s.statLabel}>Open</div></div>
            <div style={s.statCard}><div style={{ ...s.statNum, color: '#d97706' }}>{stats.inProgress}</div><div style={s.statLabel}>In Progress</div></div>
            <div style={{ ...s.statCard, border: stats.delayed > 0 ? '2px solid #be185d' : undefined }}><div style={{ ...s.statNum, color: '#be185d' }}>{stats.delayed}</div><div style={s.statLabel}>Delayed</div></div>
            <div style={{ ...s.statCard, border: stats.overdue > 0 ? '2px solid #dc2626' : undefined }}><div style={{ ...s.statNum, color: '#dc2626' }}>{stats.overdue}</div><div style={s.statLabel}>Overdue</div></div>
            <div style={s.statCard}><div style={{ ...s.statNum, color: '#22c55e' }}>{stats.closed}</div><div style={s.statLabel}>Closed</div></div>
            <div style={s.statCard}><div style={{ ...s.statNum, color: '#f59e0b' }}>{stats.avgDaysOpen}</div><div style={s.statLabel}>Avg Days Open</div></div>
          </div>

          {/* Filters */}
          <div style={s.filterRow}>
            <select value={selectedCompany} onChange={e => setSelectedCompany(e.target.value)} style={s.select}>
              {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)} style={s.select}>
              {STATUSES.map(st => <option key={st} value={st}>{st}</option>)}
            </select>
            <input placeholder="Search descriptions, owners, locations..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ ...s.input, maxWidth: '350px' }} />
            <button onClick={loadData} style={{ ...s.btn, ...s.secondaryBtn }}>{'\uD83D\uDD04'} Refresh</button>
            <div style={{ marginLeft: 'auto', fontSize: '13px', color: '#64748b' }}>{filtered.length} items</div>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={s.table}>
              <thead>
                <tr>
                  {[
                    { key: 'date', label: 'Date' },
                    { key: 'client_company', label: 'Company' },
                    { key: 'location', label: 'Location' },
                    { key: 'category', label: 'Category' },
                    { key: 'action_item_description', label: 'Description' },
                    { key: 'assigned_to', label: 'Assigned To' },
                    { key: 'priority', label: 'Priority' },
                    { key: 'target_completion_date', label: 'Due Date' },
                    { key: 'status', label: 'Status' },
                    { key: null, label: 'Actions' }
                  ].map(col => (
                    <th key={col.label} onClick={() => col.key && toggleSort(col.key)} style={{ ...s.th, cursor: col.key ? 'pointer' : 'default' }}>
                      {col.label} {sortBy === col.key ? (sortDir === 'asc' ? '\u25B2' : '\u25BC') : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan="10" style={{ ...s.td, textAlign: 'center', color: '#94a3b8', padding: '40px' }}>No SAIL items found</td></tr>
                ) : filtered.map(item => {
                  const daysOpen = item.status !== 'Closed' ? calcDays(item.date) : null;
                  const overdue = isOverdue(item);
                  const sc = STATUS_COLORS[item.status] || STATUS_COLORS['Open'];
                  return (
                    <tr key={item.id} style={{ background: overdue ? '#fff5f5' : 'transparent' }}>
                      <td style={s.td}>{item.date ? new Date(item.date).toLocaleDateString() : '\u2014'}</td>
                      <td style={s.td}>{item.client_company || '\u2014'}</td>
                      <td style={s.td}>{item.location || '\u2014'}</td>
                      <td style={s.td}>{item.category || '\u2014'}</td>
                      <td style={{ ...s.td, maxWidth: '250px' }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer', color: '#1e40af', textDecoration: 'underline' }} onClick={() => setDetailItem(item)} title="Click to view details">
                          {item.action_item_description || '\u2014'}
                        </div>
                      </td>
                      <td style={s.td}>
                        <span style={{ fontWeight: item.assigned_to ? '500' : '400', color: item.assigned_to ? '#1e293b' : '#94a3b8' }}>
                          {item.assigned_to || 'Unassigned'}
                        </span>
                      </td>
                      <td style={s.td}>
                        {item.priority && <span style={{ ...s.badge, background: (PRIORITY_COLORS[item.priority] || '#94a3b8') + '22', color: PRIORITY_COLORS[item.priority] || '#94a3b8' }}>{item.priority}</span>}
                      </td>
                      <td style={s.td}>
                        {item.target_completion_date ? (
                          <span style={{ fontWeight: '500', color: overdue ? '#dc2626' : '#1e293b' }}>
                            {new Date(item.target_completion_date).toLocaleDateString()}
                            {overdue && <span style={{ display: 'block', fontSize: '10px', color: '#dc2626', fontWeight: '700' }}>OVERDUE</span>}
                          </span>
                        ) : <span style={{ color: '#94a3b8' }}>No date</span>}
                      </td>
                      <td style={s.td}>
                        <span style={{ ...s.badge, background: sc.bg, color: sc.color }}>{item.status}</span>
                        {daysOpen !== null && <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>{daysOpen}d open</div>}
                      </td>
                      <td style={s.td}>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button onClick={() => openEdit(item)} style={{ ...s.btn, ...s.primaryBtn }}>Edit</button>
                          <button onClick={() => setDetailItem(item)} style={{ ...s.btn, background: '#e2e8f0', color: '#475569' }}>View</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div style={s.footer}>
          <span style={{ fontWeight: '500' }}>AnthroSafe{'\u2122'} Field Driven Safety</span> | {'\u00A9'} 2026 SLP Alaska, LLC
        </div>
      </div>

      {/* ============================================================ */}
      {/* EDIT MODAL */}
      {/* ============================================================ */}
      {editItem && (
        <div style={s.modal} onClick={() => setEditItem(null)}>
          <div style={s.modalContent} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>Edit SAIL Item</h2>
              <button onClick={() => setEditItem(null)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#94a3b8' }}>{'\u2715'}</button>
            </div>

            {/* Item header info */}
            <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '10px', padding: '15px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', fontSize: '13px', color: '#64748b' }}>
                <span><strong>Company:</strong> {editItem.client_company}</span>
                <span><strong>Location:</strong> {editItem.location}</span>
                <span><strong>Category:</strong> {editItem.category}</span>
                <span><strong>Opened:</strong> {editItem.date ? new Date(editItem.date).toLocaleDateString() : 'N/A'}</span>
                <span><strong>Days Open:</strong> {calcDays(editItem.date)}</span>
                {editItem.source_form && <span><strong>Source:</strong> {editItem.source_form}</span>}
              </div>
            </div>

            {/* Description */}
            <div style={s.fieldGroup}>
              <label style={s.fieldLabel}>Action Item Description</label>
              <textarea value={editData.action_item_description} onChange={e => setEditData({ ...editData, action_item_description: e.target.value })} style={{ ...s.textarea, minHeight: '70px' }} />
            </div>

            {/* Status + Priority + Hierarchy */}
            <div style={s.threeCol}>
              <div style={s.fieldGroup}>
                <label style={s.fieldLabel}>Status</label>
                <select value={editData.status} onChange={e => setEditData({ ...editData, status: e.target.value })} style={s.input}>
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Delayed">Delayed</option>
                  <option value="Pending Verification">Pending Verification</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
              <div style={s.fieldGroup}>
                <label style={s.fieldLabel}>Priority</label>
                <select value={editData.priority} onChange={e => setEditData({ ...editData, priority: e.target.value })} style={s.input}>
                  {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div style={s.fieldGroup}>
                <label style={s.fieldLabel}>Hierarchy of Control</label>
                <select value={editData.hierarchy_control} onChange={e => setEditData({ ...editData, hierarchy_control: e.target.value })} style={s.input}>
                  <option value="">-- Select --</option>
                  {HIERARCHY_CONTROLS.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            </div>

            {/* Assigned To + Due Date */}
            <div style={s.twoCol}>
              <div style={s.fieldGroup}>
                <label style={s.fieldLabel}>Assigned To</label>
                <input placeholder="Enter name of person responsible..." value={editData.assigned_to} onChange={e => setEditData({ ...editData, assigned_to: e.target.value })} style={s.input} />
              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Assignee Email</label>
                <input type="email" placeholder="email@company.com" value={editData.assigned_to_email || ''} onChange={e => setEditData({ ...editData, assigned_to_email: e.target.value })} style={s.input} />
              </div>
              </div>
              <div style={s.fieldGroup}>
                <label style={s.fieldLabel}>Target Completion Date</label>
                <input type="date" value={editData.target_completion_date} onChange={e => setEditData({ ...editData, target_completion_date: e.target.value })} style={s.input} />
                {editItem.target_completion_date && editData.target_completion_date !== editItem.target_completion_date && (
                  <div style={{ fontSize: '11px', color: '#f59e0b', marginTop: '4px' }}>
                    Changed from {new Date(editItem.target_completion_date).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>

            {/* Immediate Action */}
            <div style={s.fieldGroup}>
              <label style={s.fieldLabel}>Immediate Action Taken</label>
              <textarea value={editData.immediate_action} onChange={e => setEditData({ ...editData, immediate_action: e.target.value })} placeholder="What immediate action was taken?" style={{ ...s.textarea, minHeight: '60px' }} />
            </div>

            {/* Corrective Action / History */}
            <div style={s.fieldGroup}>
              <label style={s.fieldLabel}>Corrective Action / Resolution Notes</label>
              <textarea value={editData.corrective_action} onChange={e => setEditData({ ...editData, corrective_action: e.target.value })} placeholder="Describe corrective actions taken or planned..." style={{ ...s.textarea, minHeight: '80px' }} />
            </div>

            {/* Update Narrative (delay explanation, progress note, etc.) */}
            <div style={{ ...s.fieldGroup, background: '#fffbeb', border: '2px solid #fbbf24', borderRadius: '10px', padding: '15px' }}>
              <label style={{ ...s.fieldLabel, color: '#92400e' }}>Add Update Narrative (optional)</label>
              <div style={{ fontSize: '11px', color: '#92400e', marginBottom: '8px', fontStyle: 'italic' }}>
                Use this to explain delays, provide progress updates, or add context. This will be timestamped and appended to the corrective action notes.
              </div>
              <textarea value={editData.update_narrative} onChange={e => setEditData({ ...editData, update_narrative: e.target.value })} placeholder="e.g., Parts on order - ETA 3/15. Extended target date to 3/20 to allow for installation..." style={{ ...s.textarea, minHeight: '70px', borderColor: '#fbbf24' }} />
            </div>

            {/* Warning if closing */}
            {editData.status === 'Closed' && editItem.status !== 'Closed' && (
              <div style={{ background: '#f0fdf4', border: '2px solid #22c55e', borderRadius: '10px', padding: '15px', marginBottom: '16px' }}>
                <strong style={{ color: '#15803d' }}>Closing this item.</strong>
                <span style={{ color: '#166534', fontSize: '13px' }}> Make sure corrective actions are documented above. This will set the closure date to today.</span>
              </div>
            )}

            {/* Warning if marking delayed */}
            {editData.status === 'Delayed' && editItem.status !== 'Delayed' && (
              <div style={{ background: '#fce7f3', border: '2px solid #ec4899', borderRadius: '10px', padding: '15px', marginBottom: '16px' }}>
                <strong style={{ color: '#be185d' }}>Marking as Delayed.</strong>
                <span style={{ color: '#9d174d', fontSize: '13px' }}> Please add an update narrative above explaining the reason for the delay and the new expected timeline.</span>
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button onClick={() => setEditItem(null)} style={{ ...s.btn, ...s.secondaryBtn, padding: '10px 20px' }}>Cancel</button>
              <button onClick={saveEdit} disabled={saving} style={{ ...s.btn, ...s.primaryBtn, padding: '10px 24px', fontSize: '14px', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* DETAIL VIEW MODAL */}
      {/* ============================================================ */}
      {detailItem && (
        <div style={s.modal} onClick={() => setDetailItem(null)}>
          <div style={s.modalContent} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>SAIL Item Details</h2>
              <button onClick={() => setDetailItem(null)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#94a3b8' }}>{'\u2715'}</button>
            </div>

            <div style={{ display: 'grid', gap: '12px' }}>
              {[
                ['Company', detailItem.client_company],
                ['Location', detailItem.location],
                ['Category', detailItem.category],
                ['Date Opened', detailItem.date ? new Date(detailItem.date).toLocaleDateString() : 'N/A'],
                ['Submitter', detailItem.submitter_name],
                ['Status', detailItem.status],
                ['Priority', detailItem.priority],
                ['Assigned To', detailItem.assigned_to || 'Unassigned'],
                ['Target Date', detailItem.target_completion_date ? new Date(detailItem.target_completion_date).toLocaleDateString() : 'Not set'],
                ['Hierarchy of Control', detailItem.hierarchy_control || 'Not set'],
                ['Days Open', detailItem.status !== 'Closed' ? calcDays(detailItem.date) + ' days' : 'Closed'],
                ['Source', detailItem.source_form || detailItem.source || 'Direct entry'],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                  <span style={{ fontWeight: '600', color: '#64748b', minWidth: '160px', fontSize: '13px' }}>{label}:</span>
                  <span style={{ fontSize: '13px', color: '#1e293b' }}>{value || '\u2014'}</span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '20px' }}>
              <label style={{ ...s.fieldLabel, marginBottom: '8px' }}>Action Item Description</label>
              <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', fontSize: '14px', lineHeight: '1.6' }}>
                {detailItem.action_item_description || 'No description'}
              </div>
            </div>

            {detailItem.immediate_action && (
              <div style={{ marginTop: '15px' }}>
                <label style={{ ...s.fieldLabel, marginBottom: '8px' }}>Immediate Action</label>
                <div style={{ background: '#fefce8', padding: '15px', borderRadius: '8px', fontSize: '14px', lineHeight: '1.6' }}>
                  {detailItem.immediate_action}
                </div>
              </div>
            )}

            {detailItem.corrective_action && (
              <div style={{ marginTop: '15px' }}>
                <label style={{ ...s.fieldLabel, marginBottom: '8px' }}>Corrective Action / Update History</label>
                <div style={{ background: '#f0fdf4', padding: '15px', borderRadius: '8px', fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                  {detailItem.corrective_action}
                </div>
              </div>
            )}

            {detailItem.status === 'Closed' && (
              <div style={{ marginTop: '15px', background: '#dcfce7', padding: '15px', borderRadius: '8px' }}>
                <strong style={{ color: '#15803d' }}>Closed:</strong> {detailItem.date_closed ? new Date(detailItem.date_closed).toLocaleDateString() : 'N/A'}
                {detailItem.closed_by && <span style={{ color: '#166534' }}> by {detailItem.closed_by}</span>}
              </div>
            )}

            {detailItem.photo_url && (
              <div style={{ marginTop: '15px' }}>
                <label style={{ ...s.fieldLabel, marginBottom: '8px' }}>Photo</label>
                <a href={detailItem.photo_url} target="_blank" style={{ color: '#1e40af' }}>View Photo</a>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button onClick={() => { setDetailItem(null); openEdit(detailItem); }} style={{ ...s.btn, ...s.primaryBtn, padding: '10px 20px' }}>Edit This Item</button>
              <button onClick={() => setDetailItem(null)} style={{ ...s.btn, ...s.secondaryBtn, padding: '10px 20px' }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

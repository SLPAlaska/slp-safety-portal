'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const COMPANIES = ['All', 'A-C Electric', 'AKE-Line', 'Apache Corp.', 'Armstrong Oil & Gas', 'ASRC Energy Services', 'CCI-Industrial', 'Chosen Construction', 'CINGSA', 'Coho Enterprises', 'Conam Construction', 'ConocoPhillips', 'Five Star Oilfield Services', 'Fox Energy Services', 'G.A. West', 'GBR Equipment', 'GLM Energy Services', 'Graham Industrial Coatings', 'Harvest Midstream', 'Hilcorp Alaska', 'MagTec Alaska', 'Merkes Builders', 'Nordic-Calista', 'Parker TRS', 'Peninsula Paving', 'Pollard Wireline', 'Ridgeline Oilfield Services', 'Santos', 'Summit Excavation', 'Yellowjacket'];

const PRIORITY_COLORS = {
  'High': '#ef4444',
  'Medium': '#f59e0b',
  'Low': '#22c55e'
};

export default function SAILManagement() {
  const [loading, setLoading] = useState(true);
  const [sailItems, setSailItems] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('All');
  const [stats, setStats] = useState({ total: 0, open: 0, closed: 0, avgDaysOpen: 0 });
  const [closingItem, setClosingItem] = useState(null);
  const [closingNotes, setClosingNotes] = useState('');

  useEffect(() => {
    loadData();
  }, [selectedCompany]);

  async function loadData() {
    setLoading(true);
    try {
      // Load SAIL items
      let query = supabase
        .from('sail_log')
        .select('*')
        .order('date', { ascending: false });

      if (selectedCompany !== 'All') {
        query = query.eq('client_company', selectedCompany);
      }

      const { data: items, error } = await query;
      
      if (error) throw error;

      setSailItems(items || []);

      // Calculate stats
      const openItems = items?.filter(i => i.status === 'Open') || [];
      const closedItems = items?.filter(i => i.status === 'Closed') || [];
      
      const avgDays = openItems.length > 0
        ? Math.round(openItems.reduce((sum, item) => sum + calculateDaysOpen(item.date), 0) / openItems.length)
        : 0;

      setStats({
        total: items?.length || 0,
        open: openItems.length,
        closed: closedItems.length,
        avgDaysOpen: avgDays
      });

    } catch (error) {
      console.error('Error loading SAIL data:', error);
      alert('Error loading SAIL data: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  function calculateDaysOpen(dateOpened) {
    const today = new Date();
    const opened = new Date(dateOpened);
    return Math.floor((today - opened) / (1000 * 60 * 60 * 24));
  }

  async function closeItem(item) {
    if (!closingNotes.trim()) {
      alert('Please enter corrective action notes');
      return;
    }

    try {
      const { error } = await supabase
        .from('sail_log')
        .update({
          status: 'Closed',
          corrective_action: closingNotes,
          date_closed: new Date().toISOString().split('T')[0]
        })
        .eq('id', item.id);

      if (error) throw error;

      alert('SAIL item closed successfully!');
      setClosingItem(null);
      setClosingNotes('');
      loadData();

    } catch (error) {
      console.error('Error closing SAIL item:', error);
      alert('Error closing item: ' + error.message);
    }
  }

  const styles = {
    container: { minHeight: '100vh', background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)', padding: '20px' },
    wrapper: { maxWidth: '1400px', margin: '0 auto' },
    header: { background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', borderRadius: '16px 16px 0 0', padding: '25px 30px', color: 'white' },
    card: { background: 'white', borderRadius: '0 0 16px 16px', padding: '25px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' },
    statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '25px' },
    statCard: { background: '#f8fafc', borderRadius: '12px', padding: '20px', textAlign: 'center', border: '2px solid #e2e8f0' },
    statNumber: { fontSize: '32px', fontWeight: '700', marginBottom: '5px' },
    statLabel: { fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' },
    filterRow: { display: 'flex', gap: '15px', marginBottom: '20px', alignItems: 'center' },
    select: { padding: '10px 15px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', background: 'white' },
    table: { width: '100%', borderCollapse: 'collapse', background: 'white' },
    th: { background: '#f8fafc', padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#475569', borderBottom: '2px solid #e2e8f0' },
    td: { padding: '12px', borderBottom: '1px solid #e2e8f0', fontSize: '14px' },
    badge: { display: 'inline-block', padding: '4px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' },
    btn: { padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
    primaryBtn: { background: '#22c55e', color: 'white' },
    dangerBtn: { background: '#ef4444', color: 'white' },
    secondaryBtn: { background: '#64748b', color: 'white' },
    modal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modalContent: { background: 'white', borderRadius: '16px', padding: '30px', maxWidth: '600px', width: '90%' },
    textarea: { width: '100%', padding: '12px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', minHeight: '120px', resize: 'vertical', boxSizing: 'border-box' }
  };

  if (loading) {
    return (
      <div style={{ ...styles.container, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'white', fontSize: '24px' }}>Loading SAIL items...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.wrapper}>
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <img src="/Logo.png" alt="SLP Alaska" style={{ height: '50px' }} />
            <div>
              <h1 style={{ margin: 0, fontSize: '28px' }}>📝 SAIL Log Management</h1>
              <p style={{ margin: '5px 0 0 0', opacity: 0.9 }}>Safety Action Item Log - View and Close Items</p>
            </div>
          </div>
        </div>

        <div style={styles.card}>
          {/* Stats Cards */}
          <div style={styles.statsRow}>
            <div style={styles.statCard}>
              <div style={{ ...styles.statNumber, color: '#3b82f6' }}>{stats.total}</div>
              <div style={styles.statLabel}>Total Items</div>
            </div>
            <div style={styles.statCard}>
              <div style={{ ...styles.statNumber, color: '#ef4444' }}>{stats.open}</div>
              <div style={styles.statLabel}>Open Items</div>
            </div>
            <div style={styles.statCard}>
              <div style={{ ...styles.statNumber, color: '#22c55e' }}>{stats.closed}</div>
              <div style={styles.statLabel}>Closed Items</div>
            </div>
            <div style={styles.statCard}>
              <div style={{ ...styles.statNumber, color: '#f59e0b' }}>{stats.avgDaysOpen}</div>
              <div style={styles.statLabel}>Avg Days Open</div>
            </div>
          </div>

          {/* Filters */}
          <div style={styles.filterRow}>
            <label style={{ fontWeight: '600' }}>Filter by Company:</label>
            <select 
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              style={styles.select}
            >
              {COMPANIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <button onClick={loadData} style={{ ...styles.btn, ...styles.secondaryBtn }}>
              🔄 Refresh
            </button>
          </div>

          {/* SAIL Items Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Company</th>
                  <th style={styles.th}>Location</th>
                  <th style={styles.th}>Category</th>
                  <th style={styles.th}>Description</th>
                  <th style={styles.th}>Priority</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Days Open</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sailItems.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ ...styles.td, textAlign: 'center', color: '#94a3b8', padding: '40px' }}>
                      No SAIL items found
                    </td>
                  </tr>
                ) : (
                  sailItems.map(item => {
                    const daysOpen = item.status === 'Open' ? calculateDaysOpen(item.date) : 0;
                    return (
                      <tr key={item.id}>
                        <td style={styles.td}>{new Date(item.date).toLocaleDateString()}</td>
                        <td style={styles.td}>{item.client_company}</td>
                        <td style={styles.td}>{item.location}</td>
                        <td style={styles.td}>{item.category}</td>
                        <td style={styles.td}>
                          <div style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.action_item_description}
                          </div>
                        </td>
                        <td style={styles.td}>
                          <span style={{ 
                            ...styles.badge, 
                            background: PRIORITY_COLORS[item.priority] + '22',
                            color: PRIORITY_COLORS[item.priority]
                          }}>
                            {item.priority}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <span style={{ 
                            ...styles.badge,
                            background: item.status === 'Open' ? '#fee2e2' : '#dcfce7',
                            color: item.status === 'Open' ? '#dc2626' : '#16a34a'
                          }}>
                            {item.status}
                          </span>
                        </td>
                        <td style={styles.td}>
                          {item.status === 'Open' && (
                            <span style={{ 
                              fontWeight: '600',
                              color: daysOpen > 30 ? '#dc2626' : daysOpen > 14 ? '#f59e0b' : '#16a34a'
                            }}>
                              {daysOpen} days
                            </span>
                          )}
                          {item.status === 'Closed' && (
                            <span style={{ color: '#94a3b8' }}>—</span>
                          )}
                        </td>
                        <td style={styles.td}>
                          {item.status === 'Open' ? (
                            <button
                              onClick={() => setClosingItem(item)}
                              style={{ ...styles.btn, ...styles.primaryBtn }}
                            >
                              ✓ Close
                            </button>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '12px' }}>
                              Closed {item.date_closed && new Date(item.date_closed).toLocaleDateString()}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Close Item Modal */}
      {closingItem && (
        <div style={styles.modal} onClick={() => setClosingItem(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>Close SAIL Item</h2>
            <div style={{ marginBottom: '20px', padding: '15px', background: '#f8fafc', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '5px' }}>
                {closingItem.client_company} - {closingItem.location}
              </div>
              <div style={{ fontWeight: '600' }}>{closingItem.category}</div>
              <div style={{ fontSize: '14px', color: '#475569', marginTop: '5px' }}>
                {closingItem.action_item_description}
              </div>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Corrective Action Taken *
              </label>
              <textarea
                value={closingNotes}
                onChange={(e) => setClosingNotes(e.target.value)}
                placeholder="Describe what action was taken to resolve this item..."
                style={styles.textarea}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setClosingItem(null);
                  setClosingNotes('');
                }}
                style={{ ...styles.btn, ...styles.secondaryBtn }}
              >
                Cancel
              </button>
              <button
                onClick={() => closeItem(closingItem)}
                style={{ ...styles.btn, ...styles.primaryBtn }}
              >
                ✓ Close Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

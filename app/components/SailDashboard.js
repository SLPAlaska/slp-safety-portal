'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://iypezirwdlqpptjpeeyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
);

/**
 * SAIL Dashboard Widget
 * 
 * Shows open SAIL items by company with:
 * - Open item count
 * - Average days open
 * - Oldest open item
 * - Priority breakdown
 * 
 * Usage:
 * <SailDashboard />
 * <SailDashboard companyFilter="Ridgeline Oilfield Services" />
 */

export default function SailDashboard({ companyFilter = null }) {
  const [stats, setStats] = useState([]);
  const [openItems, setOpenItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState(companyFilter);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, [selectedCompany]);

  const loadDashboardData = async () => {
    setLoading(true);
    
    try {
      // Try to use the view first, fall back to direct query
      let { data: statsData, error: statsError } = await supabase
        .from('sail_dashboard_stats')
        .select('*');
      
      // If view doesn't exist, calculate manually
      if (statsError) {
        const { data: rawData } = await supabase
          .from('sail_log')
          .select('*');
        
        if (rawData) {
          // Group by company and calculate stats
          const companyMap = {};
          const today = new Date();
          
          rawData.forEach(item => {
            const company = item.client_company;
            if (!companyMap[company]) {
              companyMap[company] = {
                company: company,
                open_items: 0,
                closed_items: 0,
                total_items: 0,
                days_open_sum: 0,
                oldest_open_days: 0,
                high_priority_open: 0,
                medium_priority_open: 0,
                low_priority_open: 0
              };
            }
            
            const c = companyMap[company];
            c.total_items++;
            
            if (item.status === 'Open') {
              c.open_items++;
              const dateOpened = new Date(item.date_opened || item.date);
              const daysOpen = Math.floor((today - dateOpened) / (1000 * 60 * 60 * 24));
              c.days_open_sum += daysOpen;
              if (daysOpen > c.oldest_open_days) c.oldest_open_days = daysOpen;
              
              if (item.priority === 'High') c.high_priority_open++;
              else if (item.priority === 'Medium') c.medium_priority_open++;
              else c.low_priority_open++;
            } else {
              c.closed_items++;
            }
          });
          
          statsData = Object.values(companyMap).map(c => ({
            ...c,
            avg_days_open: c.open_items > 0 ? Math.round(c.days_open_sum / c.open_items) : 0
          })).sort((a, b) => b.open_items - a.open_items);
        }
      }
      
      // Filter by company if specified
      if (selectedCompany && statsData) {
        statsData = statsData.filter(s => s.company === selectedCompany);
      }
      
      setStats(statsData || []);
      
      // Load open items for detail view
      let itemsQuery = supabase
        .from('sail_log')
        .select('*')
        .eq('status', 'Open')
        .order('date_opened', { ascending: true, nullsFirst: false });
      
      if (selectedCompany) {
        itemsQuery = itemsQuery.eq('client_company', selectedCompany);
      }
      
      const { data: itemsData } = await itemsQuery;
      setOpenItems(itemsData || []);
      
    } catch (error) {
      console.error('Error loading SAIL dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDaysOpen = (dateOpened) => {
    const today = new Date();
    const opened = new Date(dateOpened);
    return Math.floor((today - opened) / (1000 * 60 * 60 * 24));
  };

  const closeItem = async (itemId) => {
    const closedBy = prompt('Closed by (your name):');
    if (!closedBy) return;
    
    const correctiveAction = prompt('Corrective action taken:');
    
    await supabase
      .from('sail_log_entries')
      .update({
        status: 'Closed',
        date_closed: new Date().toISOString().split('T')[0],
        closed_by: closedBy,
        corrective_action: correctiveAction
      })
      .eq('id', itemId);
    
    loadDashboardData();
  };

  const getTotalOpen = () => stats.reduce((sum, s) => sum + (s.open_items || 0), 0);
  const getTotalHighPriority = () => stats.reduce((sum, s) => sum + (s.high_priority_open || 0), 0);

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '24px', marginBottom: '10px' }}>⏳</div>
        <p>Loading SAIL Dashboard...</p>
      </div>
    );
  }

  return (
    <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        padding: '20px',
        color: 'white'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px' }}>📝 SAIL Log Dashboard</h2>
            <p style={{ margin: '5px 0 0 0', opacity: 0.9, fontSize: '14px' }}>Safety Action Item Log - Open Items Tracking</p>
          </div>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{getTotalOpen()}</div>
              <div style={{ fontSize: '12px', opacity: 0.9 }}>Open Items</div>
            </div>
            {getTotalHighPriority() > 0 && (
              <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.2)', padding: '8px 15px', borderRadius: '8px' }}>
                <div style={{ fontSize: '28px', fontWeight: 'bold' }}>🔴 {getTotalHighPriority()}</div>
                <div style={{ fontSize: '12px', opacity: 0.9 }}>High Priority</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Company Filter */}
      {!companyFilter && (
        <div style={{ padding: '15px 20px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc' }}>
          <select
            value={selectedCompany || ''}
            onChange={(e) => setSelectedCompany(e.target.value || null)}
            style={{ padding: '8px 12px', border: '2px solid #d1d5db', borderRadius: '6px', fontSize: '14px', minWidth: '200px' }}
          >
            <option value="">All Companies</option>
            {[...new Set(stats.map(s => s.company))].sort().map(company => (
              <option key={company} value={company}>{company}</option>
            ))}
          </select>
        </div>
      )}

      {/* Stats Table */}
      <div style={{ padding: '20px' }}>
        {stats.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>✅</div>
            <p>No open SAIL items! Great job!</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb', fontSize: '14px', color: '#374151' }}>Company</th>
                  <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #e5e7eb', fontSize: '14px', color: '#374151' }}>Open</th>
                  <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #e5e7eb', fontSize: '14px', color: '#374151' }}>Avg Days</th>
                  <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #e5e7eb', fontSize: '14px', color: '#374151' }}>Oldest</th>
                  <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #e5e7eb', fontSize: '14px', color: '#374151' }}>Priority</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((company, idx) => (
                  <tr key={company.company} style={{ background: idx % 2 === 0 ? 'white' : '#f8fafc' }}>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb', fontWeight: '500' }}>{company.company}</td>
                    <td style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>
                      <span style={{
                        background: company.open_items > 0 ? '#fef3c7' : '#d1fae5',
                        color: company.open_items > 0 ? '#92400e' : '#065f46',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontWeight: '600'
                      }}>
                        {company.open_items}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>
                      {company.avg_days_open || 0} days
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>
                      <span style={{
                        color: company.oldest_open_days > 30 ? '#dc2626' : company.oldest_open_days > 14 ? '#f59e0b' : '#16a34a',
                        fontWeight: '600'
                      }}>
                        {company.oldest_open_days || 0} days
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>
                      <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                        {company.high_priority_open > 0 && <span title="High">🔴 {company.high_priority_open}</span>}
                        {company.medium_priority_open > 0 && <span title="Medium">🟡 {company.medium_priority_open}</span>}
                        {company.low_priority_open > 0 && <span title="Low">🟢 {company.low_priority_open}</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Toggle Details Button */}
      {openItems.length > 0 && (
        <div style={{ padding: '0 20px 20px' }}>
          <button
            onClick={() => setShowDetails(!showDetails)}
            style={{
              width: '100%',
              padding: '12px',
              background: showDetails ? '#6b7280' : '#f8fafc',
              color: showDetails ? 'white' : '#374151',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px'
            }}
          >
            {showDetails ? '▲ Hide Details' : '▼ Show Open Items Details'} ({openItems.length} items)
          </button>
        </div>
      )}

      {/* Detailed Open Items List */}
      {showDetails && openItems.length > 0 && (
        <div style={{ padding: '0 20px 20px' }}>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
            {openItems.map((item, idx) => {
              const daysOpen = calculateDaysOpen(item.date_opened || item.date);
              return (
                <div
                  key={item.id}
                  style={{
                    padding: '15px',
                    background: idx % 2 === 0 ? 'white' : '#f8fafc',
                    borderBottom: idx < openItems.length - 1 ? '1px solid #e5e7eb' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '15px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '5px' }}>
                        <span style={{ fontSize: '16px' }}>
                          {item.priority === 'High' ? '🔴' : item.priority === 'Medium' ? '🟡' : '🟢'}
                        </span>
                        <span style={{ fontWeight: '600', color: '#1e293b' }}>{item.category}</span>
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>• {item.client_company}</span>
                      </div>
                      <p style={{ margin: '5px 0', color: '#4b5563', fontSize: '14px' }}>{item.action_item_description}</p>
                      <div style={{ display: 'flex', gap: '15px', fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
                        <span>📍 {item.location}</span>
                        <span>👤 {item.submitter_name}</span>
                        {item.assigned_to && <span>➡️ {item.assigned_to}</span>}
                        {item.source_form && <span>📋 {item.source_form}</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontSize: '18px',
                        fontWeight: 'bold',
                        color: daysOpen > 30 ? '#dc2626' : daysOpen > 14 ? '#f59e0b' : '#16a34a'
                      }}>
                        {daysOpen} days
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>open</div>
                      <button
                        onClick={() => closeItem(item.id)}
                        style={{
                          marginTop: '8px',
                          padding: '6px 12px',
                          background: '#16a34a',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        ✓ Close Item
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

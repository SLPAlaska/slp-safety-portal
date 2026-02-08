'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

const COMPANIES = [
  'A-C Electric', 'AKE-Line', 'Apache Corp.', 'Armstrong Oil & Gas', 'ASRC Energy Services',
  'CCI-Industrial', 'Chosen Construction', 'CINGSA', 'Coho Enterprises', 'Conam Construction',
  'ConocoPhillips', 'Five Star Oilfield Services', 'Fox Energy Services', 'G.A. West',
  'GBR Equipment', 'GLM Energy Services', 'Graham Industrial Coatings', 'Harvest Midstream',
  'Hilcorp Alaska', 'MagTec Alaska', 'Merkes Builders', 'Nordic-Calista', 'Parker TRS',
  'Peninsula Paving', 'Pollard Wireline', 'Ridgeline Oilfield Services', 'Santos',
  'Summit Excavation', 'Tesoro Refinery', 'Yellowjacket'
]

// Report categories - will grow as we migrate more forms
const REPORT_CATEGORIES = [
  {
    id: 'bbs-observations',
    title: 'BBS Observations',
    icon: '📋',
    table: 'bbs_observations',
    available: true,
    columns: [
      { key: 'observation_date', label: 'Date' },
      { key: 'submitter_name', label: 'Submitter' },
      { key: 'location', label: 'Location' },
      { key: 'observation_type', label: 'Type' },
      { key: 'observation_category', label: 'Category' },
      { key: 'job_stop_required', label: 'Job Stop', type: 'boolean' },
      { key: 'stky_event', label: 'STKY', type: 'boolean' },
      { key: 'what_did_you_see', label: 'Observation' },
    ]
  },
  {
    id: 'permits',
    title: 'Permits',
    icon: '📝',
    table: 'permits',
    available: false, // Not yet migrated
  },
  {
    id: 'tha-jsa',
    title: 'THA/JSA',
    icon: '☀️',
    table: 'tha_forms',
    available: false,
  },
  {
    id: 'incidents',
    title: 'Incident Reports',
    icon: '🚨',
    table: 'incidents',
    available: false,
  },
  {
    id: 'monthly-inspections',
    title: 'Monthly Inspections',
    icon: '📅',
    table: 'monthly_inspections',
    available: false,
  },
  {
    id: 'equipment-inspections',
    title: 'Equipment Inspections',
    icon: '🚛',
    table: 'equipment_inspections',
    available: false,
  },
]

export default function ClientReports() {
  const [selectedCompany, setSelectedCompany] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [activeCategory, setActiveCategory] = useState(null)
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' })
  const [typeFilter, setTypeFilter] = useState('All')

  const handleLogin = () => {
    if (selectedCompany) {
      setIsLoggedIn(true)
    }
  }

  const handleLogout = () => {
    setIsLoggedIn(false)
    setSelectedCompany('')
    setActiveCategory(null)
    setData([])
  }

  const loadCategoryData = async (category) => {
    if (!category.available) return
    
    setActiveCategory(category)
    setLoading(true)
    
    try {
      let query = supabase
        .from(category.table)
        .select('*')
        .eq('client_company', selectedCompany)
        .order('created_at', { ascending: false })
      
      if (dateFilter.start) {
        query = query.gte('observation_date', dateFilter.start)
      }
      if (dateFilter.end) {
        query = query.lte('observation_date', dateFilter.end)
      }
      if (typeFilter !== 'All' && category.id === 'bbs-observations') {
        query = query.eq('observation_type', typeFilter)
      }
      
      const { data: results, error } = await query
      
      if (error) throw error
      setData(results || [])
    } catch (error) {
      console.error('Error loading data:', error)
      setData([])
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = () => {
    if (!data.length || !activeCategory) return
    
    const headers = activeCategory.columns.map(col => col.label).join(',')
    const rows = data.map(row => 
      activeCategory.columns.map(col => {
        let value = row[col.key]
        if (col.type === 'boolean') value = value ? 'Yes' : 'No'
        if (typeof value === 'string' && value.includes(',')) value = `"${value}"`
        return value || ''
      }).join(',')
    ).join('\n')
    
    const csv = headers + '\n' + rows
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedCompany}_${activeCategory.id}_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  // Reload data when filters change
  useEffect(() => {
    if (activeCategory && activeCategory.available) {
      loadCategoryData(activeCategory)
    }
  }, [dateFilter, typeFilter])

  return (
    <div className="client-reports-page">
      <style jsx global>{`
        .client-reports-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
          padding: 20px;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        .container {
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .back-link {
          display: inline-block;
          margin-bottom: 20px;
          color: white;
          text-decoration: none;
          font-weight: 500;
          padding: 8px 16px;
          background: rgba(255,255,255,0.2);
          border-radius: 6px;
          transition: background 0.3s;
        }
        
        .back-link:hover {
          background: rgba(255,255,255,0.3);
        }
        
        .header {
          text-align: center;
          padding: 20px;
          background: rgba(255,255,255,0.95);
          border-radius: 16px;
          margin-bottom: 25px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        }
        
        .header img {
          max-height: 60px;
          margin-bottom: 10px;
        }
        
        .header h1 {
          color: #1e3a5f;
          font-size: 28px;
          margin-bottom: 5px;
        }
        
        .header .subtitle {
          color: #64748b;
          font-size: 14px;
        }
        
        .login-box {
          background: rgba(255,255,255,0.95);
          border-radius: 12px;
          padding: 40px;
          max-width: 500px;
          margin: 0 auto;
          box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        }
        
        .login-box h2 {
          color: #1e3a5f;
          margin-bottom: 20px;
          text-align: center;
        }
        
        .login-box select {
          width: 100%;
          padding: 12px;
          border: 2px solid #e0e0e0;
          border-radius: 6px;
          font-size: 16px;
          margin-bottom: 20px;
        }
        
        .login-box select:focus {
          outline: none;
          border-color: #1e3a5f;
        }
        
        .login-btn {
          width: 100%;
          padding: 15px;
          background: linear-gradient(135deg, #1e3a5f 0%, #0f3460 100%);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .login-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 5px 20px rgba(30, 58, 95, 0.4);
        }
        
        .login-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
        
        .dashboard {
          display: grid;
          grid-template-columns: 300px 1fr;
          gap: 20px;
        }
        
        @media (max-width: 900px) {
          .dashboard {
            grid-template-columns: 1fr;
          }
        }
        
        .sidebar {
          background: rgba(255,255,255,0.95);
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        }
        
        .company-header {
          padding-bottom: 15px;
          border-bottom: 2px solid #e2e8f0;
          margin-bottom: 15px;
        }
        
        .company-header h3 {
          color: #1e3a5f;
          font-size: 16px;
          margin-bottom: 5px;
        }
        
        .company-header .company-name {
          color: #ea580c;
          font-size: 18px;
          font-weight: 700;
        }
        
        .logout-btn {
          width: 100%;
          padding: 8px;
          background: #fee2e2;
          color: #991b1b;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          margin-top: 10px;
        }
        
        .logout-btn:hover {
          background: #fecaca;
        }
        
        .category-list {
          list-style: none;
        }
        
        .category-item {
          padding: 12px 15px;
          border-radius: 8px;
          cursor: pointer;
          margin-bottom: 8px;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .category-item:hover {
          background: #e0f2fe;
        }
        
        .category-item.active {
          background: #1e3a5f;
          color: white;
        }
        
        .category-item.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .category-item .icon {
          font-size: 20px;
        }
        
        .category-item .title {
          flex: 1;
          font-weight: 500;
        }
        
        .category-item .badge {
          background: rgba(0,0,0,0.1);
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 11px;
        }
        
        .category-item.active .badge {
          background: rgba(255,255,255,0.2);
        }
        
        .category-item.disabled .badge {
          background: #fef3c7;
          color: #92400e;
        }
        
        .main-content {
          background: rgba(255,255,255,0.95);
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        }
        
        .content-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 15px;
        }
        
        .content-header h2 {
          color: #1e3a5f;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .filters {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        
        .filters input,
        .filters select {
          padding: 8px 12px;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          font-size: 13px;
        }
        
        .filters input:focus,
        .filters select:focus {
          outline: none;
          border-color: #1e3a5f;
        }
        
        .export-btn {
          padding: 8px 16px;
          background: #22c55e;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 5px;
        }
        
        .export-btn:hover {
          background: #16a34a;
        }
        
        .export-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
        
        .stats-row {
          display: flex;
          gap: 15px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        
        .stat-card {
          background: #f8fafc;
          padding: 15px 20px;
          border-radius: 8px;
          border-left: 4px solid #1e3a5f;
        }
        
        .stat-card.safe {
          border-left-color: #22c55e;
        }
        
        .stat-card.at-risk {
          border-left-color: #ef4444;
        }
        
        .stat-card.stky {
          border-left-color: #dc2626;
        }
        
        .stat-card .number {
          font-size: 24px;
          font-weight: 700;
          color: #1e3a5f;
        }
        
        .stat-card .label {
          font-size: 12px;
          color: #64748b;
          text-transform: uppercase;
        }
        
        .data-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        
        .data-table th {
          background: #1e3a5f;
          color: white;
          padding: 12px 10px;
          text-align: left;
          font-weight: 600;
          white-space: nowrap;
        }
        
        .data-table td {
          padding: 10px;
          border-bottom: 1px solid #e2e8f0;
        }
        
        .data-table tr:hover {
          background: #f8fafc;
        }
        
        .data-table .badge {
          display: inline-block;
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
        }
        
        .data-table .badge.safe {
          background: #d1fae5;
          color: #065f46;
        }
        
        .data-table .badge.at-risk {
          background: #fee2e2;
          color: #991b1b;
        }
        
        .data-table .badge.yes {
          background: #fecaca;
          color: #991b1b;
        }
        
        .data-table .badge.no {
          background: #e2e8f0;
          color: #64748b;
        }
        
        .table-container {
          overflow-x: auto;
        }
        
        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #64748b;
        }
        
        .empty-state .icon {
          font-size: 48px;
          margin-bottom: 15px;
        }
        
        .select-prompt {
          text-align: center;
          padding: 60px 20px;
          color: #64748b;
        }
        
        .select-prompt .icon {
          font-size: 48px;
          margin-bottom: 15px;
        }
        
        .loading {
          text-align: center;
          padding: 40px;
          color: #64748b;
        }
        
        .footer {
          text-align: center;
          margin-top: 30px;
          color: rgba(255,255,255,0.7);
          font-size: 11px;
        }
      `}</style>

      <div className="container">
        <Link href="/" className="back-link">← Back to Safety Portal</Link>
        
        <div className="header">
          <img src="/Logo.png" alt="SLP Alaska Logo" />
          <h1>📊 Client Reports</h1>
          <p className="subtitle">View and export your company's safety data</p>
        </div>
        
        {!isLoggedIn ? (
          <div className="login-box">
            <h2>Select Your Company</h2>
            <select 
              value={selectedCompany} 
              onChange={(e) => setSelectedCompany(e.target.value)}
            >
              <option value="">-- Select Company --</option>
              {COMPANIES.map(company => (
                <option key={company} value={company}>{company}</option>
              ))}
            </select>
            <button 
              className="login-btn" 
              onClick={handleLogin}
              disabled={!selectedCompany}
            >
              View Reports
            </button>
          </div>
        ) : (
          <div className="dashboard">
            <div className="sidebar">
              <div className="company-header">
                <h3>Viewing Reports For:</h3>
                <div className="company-name">{selectedCompany}</div>
                <button className="logout-btn" onClick={handleLogout}>
                  Switch Company
                </button>
              </div>
              
              <ul className="category-list">
                {REPORT_CATEGORIES.map(category => (
                  <li 
                    key={category.id}
                    className={`category-item ${activeCategory?.id === category.id ? 'active' : ''} ${!category.available ? 'disabled' : ''}`}
                    onClick={() => category.available && loadCategoryData(category)}
                  >
                    <span className="icon">{category.icon}</span>
                    <span className="title">{category.title}</span>
                    {!category.available && <span className="badge">Coming Soon</span>}
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="main-content">
              {!activeCategory ? (
                <div className="select-prompt">
                  <div className="icon">👈</div>
                  <h3>Select a Report Category</h3>
                  <p>Choose a category from the sidebar to view your data</p>
                </div>
              ) : loading ? (
                <div className="loading">
                  <p>Loading data...</p>
                </div>
              ) : (
                <>
                  <div className="content-header">
                    <h2>
                      <span>{activeCategory.icon}</span>
                      {activeCategory.title}
                    </h2>
                    <div className="filters">
                      <input 
                        type="date" 
                        placeholder="Start Date"
                        value={dateFilter.start}
                        onChange={(e) => setDateFilter(prev => ({ ...prev, start: e.target.value }))}
                      />
                      <input 
                        type="date" 
                        placeholder="End Date"
                        value={dateFilter.end}
                        onChange={(e) => setDateFilter(prev => ({ ...prev, end: e.target.value }))}
                      />
                      {activeCategory.id === 'bbs-observations' && (
                        <select 
                          value={typeFilter} 
                          onChange={(e) => setTypeFilter(e.target.value)}
                        >
                          <option value="All">All Types</option>
                          <option value="Safe">Safe</option>
                          <option value="At-Risk">At-Risk</option>
                        </select>
                      )}
                      <button 
                        className="export-btn" 
                        onClick={exportToCSV}
                        disabled={!data.length}
                      >
                        📥 Export CSV
                      </button>
                    </div>
                  </div>
                  
                  {activeCategory.id === 'bbs-observations' && data.length > 0 && (
                    <div className="stats-row">
                      <div className="stat-card">
                        <div className="number">{data.length}</div>
                        <div className="label">Total Observations</div>
                      </div>
                      <div className="stat-card safe">
                        <div className="number">{data.filter(d => d.observation_type === 'Safe').length}</div>
                        <div className="label">Safe</div>
                      </div>
                      <div className="stat-card at-risk">
                        <div className="number">{data.filter(d => d.observation_type === 'At-Risk').length}</div>
                        <div className="label">At-Risk</div>
                      </div>
                      <div className="stat-card stky">
                        <div className="number">{data.filter(d => d.stky_event).length}</div>
                        <div className="label">STKY Events</div>
                      </div>
                    </div>
                  )}
                  
                  {data.length === 0 ? (
                    <div className="empty-state">
                      <div className="icon">📭</div>
                      <h3>No Data Found</h3>
                      <p>No {activeCategory.title.toLowerCase()} found for {selectedCompany}</p>
                    </div>
                  ) : (
                    <div className="table-container">
                      <table className="data-table">
                        <thead>
                          <tr>
                            {activeCategory.columns.map(col => (
                              <th key={col.key}>{col.label}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {data.map((row, idx) => (
                            <tr key={row.id || idx}>
                              {activeCategory.columns.map(col => (
                                <td key={col.key}>
                                  {col.type === 'boolean' ? (
                                    <span className={`badge ${row[col.key] ? 'yes' : 'no'}`}>
                                      {row[col.key] ? 'Yes' : 'No'}
                                    </span>
                                  ) : col.key === 'observation_type' ? (
                                    <span className={`badge ${row[col.key] === 'Safe' ? 'safe' : 'at-risk'}`}>
                                      {row[col.key]}
                                    </span>
                                  ) : col.key === 'what_did_you_see' ? (
                                    <span title={row[col.key]}>
                                      {row[col.key]?.substring(0, 50)}{row[col.key]?.length > 50 ? '...' : ''}
                                    </span>
                                  ) : (
                                    row[col.key] || '-'
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
        
        <div className="footer">
          <p>© 2026 SLP Alaska | AnthroSafe™ Field Driven Safety</p>
        </div>
      </div>
    </div>
  )
}

'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mnxxvoqombrvpaafawbf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ueHh2b3FvbWJydnBhYWZhd2JmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYyOTk3NjEsImV4cCI6MjA1MTg3NTc2MX0.z7VyWA8s7L_cfAu3-Lx03X0Y3ZkxYfGxTa5OWBFsPvI'
);

const COMPANY_CREDENTIALS = {
  'MAGTEC2026': { company: 'MagTec Alaska', password: 'PSA2026$$SLP' },
  'POLLARD2026': { company: 'Pollard Wireline', password: 'PSA2026$$SLP' },
  'AKELINE2026': { company: 'AKE-Line', password: 'PSA2026$$SLP' },
  'GBR2026': { company: 'GBR Equipment', password: 'PSA2026$$SLP' },
  'CHOSEN2026': { company: 'Chosen Construction', password: 'PSA2026$$SLP' },
  'YELLOWJACKET2026': { company: 'Yellowjacket', password: 'PSA2026$$SLP' },
  'PENINSULA2026': { company: 'Peninsula Paving', password: 'PSA2026$$SLP' },
  'CINGSA2026': { company: 'CINGSA', password: 'PSA2026$$SLP' }
};

const FORM_TABLES = {
  'THA Assessments': 'tha_assessments',
  'Incident Reports': 'incident_reports',
  'Property Damage Reports': 'property_damage_reports',
  'Witness Statements': 'witness_statements',
  'Corrective Actions': 'corrective_actions',
  'BBS Observations': 'bbs_observations',
  'Good Catch Reports': 'good_catch_reports',
  'Hazard ID Forms': 'hazard_id_forms',
  'Hot Work Permits': 'hot_work_permits',
  'Confined Space Permits': 'confined_space_permits',
  'LOTO Permits': 'loto_permits',
  'Excavation Permits': 'excavation_permits',
  'Opening/Blinding Permits': 'opening_blinding_permits',
  'Crane Inspections': 'crane_inspections',
  'Equipment Inspections': 'equipment_inspections',
  'Fire Extinguisher Inspections': 'fire_extinguisher_inspections'
};

const DATE_RANGES = {
  'Last Week': 7,
  'Last Month': 30,
  'Last Year': 365,
  'Year to Date': 'ytd',
  'Custom Range': 'custom'
};

const LOCATIONS = [
  'All',
  'Kenai', 'CIO', 'Beaver Creek', 'Swanson River', 'Ninilchik', 'Nikiski', 'Other Kenai Asset',
  'Deadhorse', 'Prudhoe Bay', 'Kuparuk', 'Alpine', 'Willow', 'ENI', 'PIKKA', 
  'Point Thompson', 'North Star Island', 'Endicott', 'Badami', 'Other North Slope'
];

export default function ClientExport() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [companyCode, setCompanyCode] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState('');
  
  const [selectedForms, setSelectedForms] = useState({});
  const [dateRange, setDateRange] = useState('Last Month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [exportFormat, setExportFormat] = useState('csv');
  const [exporting, setExporting] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');

    const cred = COMPANY_CREDENTIALS[companyCode.toUpperCase()];
    
    if (!cred) {
      setError('Invalid company code');
      return;
    }

    if (cred.password !== password) {
      setError('Invalid password');
      return;
    }

    setCompanyName(cred.company);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCompanyCode('');
    setPassword('');
    setCompanyName('');
    setSelectedForms({});
  };

  const toggleFormSelection = (formName) => {
    setSelectedForms(prev => ({
      ...prev,
      [formName]: !prev[formName]
    }));
  };

  const selectAllForms = () => {
    const all = {};
    Object.keys(FORM_TABLES).forEach(form => all[form] = true);
    setSelectedForms(all);
  };

  const deselectAllForms = () => {
    setSelectedForms({});
  };

  const getDateFilter = () => {
    const now = new Date();
    let startDate;

    if (dateRange === 'Last Week') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (dateRange === 'Last Month') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (dateRange === 'Last Year') {
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    } else if (dateRange === 'Year to Date') {
      startDate = new Date(now.getFullYear(), 0, 1);
    } else if (dateRange === 'Custom Range' && customStartDate) {
      startDate = new Date(customStartDate);
    }

    const endDate = dateRange === 'Custom Range' && customEndDate 
      ? new Date(customEndDate) 
      : now;

    return { startDate, endDate };
  };

  const exportData = async () => {
    const formsToExport = Object.keys(selectedForms).filter(form => selectedForms[form]);
    
    if (formsToExport.length === 0) {
      alert('Please select at least one form to export');
      return;
    }

    setExporting(true);

    try {
      const { startDate, endDate } = getDateFilter();
      const allData = [];

      for (const formName of formsToExport) {
        const tableName = FORM_TABLES[formName];
        
        let query = supabase
          .from(tableName)
          .select('*')
          .eq('company', companyName);

        if (selectedLocation !== 'All') {
          query = query.eq('location', selectedLocation);
        }

        if (startDate) {
          query = query.gte('date', startDate.toISOString().split('T')[0]);
        }
        if (endDate) {
          query = query.lte('date', endDate.toISOString().split('T')[0]);
        }

        const { data, error } = await query;

        if (error) {
          console.error(`Error fetching ${formName}:`, error);
          continue;
        }

        if (data && data.length > 0) {
          data.forEach(row => {
            allData.push({
              'Form Type': formName,
              ...row
            });
          });
        }
      }

      if (allData.length === 0) {
        alert('No data found for selected criteria');
        setExporting(false);
        return;
      }

      downloadCSV(allData);

    } catch (err) {
      console.error(err);
      alert('Export failed: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  const downloadCSV = (data) => {
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => {
        const value = row[h] || '';
        // Escape quotes and wrap in quotes if contains comma
        return typeof value === 'string' && (value.includes(',') || value.includes('"'))
          ? `"${value.replace(/"/g, '""')}"`
          : value;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${companyName.replace(/\s+/g, '_')}_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e3a8a 0%, #7f1d1d 100%)',
      padding: '20px'
    },
    loginBox: {
      maxWidth: '400px',
      margin: '100px auto',
      background: 'white',
      borderRadius: '12px',
      padding: '40px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
    },
    dashboardContainer: {
      maxWidth: '1200px',
      margin: '0 auto',
      background: 'white',
      borderRadius: '12px',
      padding: '30px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
    },
    header: {
      textAlign: 'center',
      marginBottom: '30px'
    },
    title: {
      fontSize: '24px',
      fontWeight: '700',
      color: '#1f2937',
      margin: '10px 0'
    },
    subtitle: {
      fontSize: '14px',
      color: '#6b7280'
    },
    inputGroup: {
      marginBottom: '20px'
    },
    label: {
      display: 'block',
      marginBottom: '8px',
      fontSize: '14px',
      fontWeight: '600',
      color: '#374151'
    },
    input: {
      width: '100%',
      padding: '12px',
      border: '2px solid #d1d5db',
      borderRadius: '6px',
      fontSize: '15px',
      boxSizing: 'border-box'
    },
    button: {
      width: '100%',
      padding: '14px',
      background: 'linear-gradient(135deg, #1e3a8a 0%, #7f1d1d 100%)',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '16px',
      fontWeight: '600',
      cursor: 'pointer',
      marginTop: '10px'
    },
    error: {
      background: '#fef2f2',
      border: '1px solid #fecaca',
      color: '#dc2626',
      padding: '12px',
      borderRadius: '6px',
      marginBottom: '20px',
      fontSize: '14px'
    },
    section: {
      marginBottom: '30px',
      padding: '20px',
      border: '1px solid #e5e7eb',
      borderRadius: '8px'
    },
    sectionTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#1f2937',
      marginBottom: '15px'
    },
    formGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
      gap: '10px'
    },
    checkbox: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '10px',
      border: '1px solid #e5e7eb',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '14px'
    },
    filterRow: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '15px',
      marginBottom: '20px'
    },
    select: {
      width: '100%',
      padding: '10px',
      border: '2px solid #d1d5db',
      borderRadius: '6px',
      fontSize: '14px',
      background: 'white'
    },
    exportButton: {
      padding: '16px 32px',
      background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '18px',
      fontWeight: '600',
      cursor: 'pointer',
      width: '100%',
      marginTop: '20px'
    },
    logoutButton: {
      padding: '8px 16px',
      background: '#6b7280',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      fontSize: '14px',
      cursor: 'pointer'
    },
    topBar: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
      paddingBottom: '20px',
      borderBottom: '2px solid #e5e7eb'
    },
    companyName: {
      fontSize: '20px',
      fontWeight: '600',
      color: '#1e3a8a'
    }
  };

  if (!isLoggedIn) {
    return (
      <div style={styles.container}>
        <div style={styles.loginBox}>
          <div style={styles.header}>
            <img src="/Logo.png" alt="SLP Alaska" style={{ maxWidth: '200px', marginBottom: '20px' }} />
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>🔐</div>
            <h1 style={styles.title}>Client Data Export</h1>
            <p style={styles.subtitle}>Enter your company credentials</p>
          </div>

          {error && <div style={styles.error}>⚠️ {error}</div>}

          <form onSubmit={handleLogin}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Company Code</label>
              <input
                type="text"
                value={companyCode}
                onChange={(e) => setCompanyCode(e.target.value)}
                placeholder="e.g., MAGTEC2026"
                required
                style={styles.input}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={styles.input}
              />
            </div>

            <button type="submit" style={styles.button}>
              Login
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <a href="/" style={{ color: '#3b82f6', fontSize: '14px', textDecoration: 'none' }}>
              ← Back to Portal
            </a>
          </div>
        </div>
        
        <div style={{ textAlign: 'center', padding: '20px', color: 'rgba(255,255,255,0.8)', fontSize: '12px', marginTop: '40px' }}>
          <div style={{ fontWeight: '500', marginBottom: '5px' }}>Powered by Predictive Safety Analytics™</div>
          <div>© 2026 SLP Alaska, LLC</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.dashboardContainer}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <img src="/Logo.png" alt="SLP Alaska" style={{ maxWidth: '180px' }} />
        </div>
        
        <div style={styles.topBar}>
          <div>
            <div style={styles.companyName}>{companyName}</div>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>Data Export Dashboard</div>
          </div>
          <button onClick={handleLogout} style={styles.logoutButton}>
            Logout
          </button>
        </div>

        <div style={styles.section}>
          <div style={styles.sectionTitle}>📊 Select Forms to Export</div>
          <div style={{ marginBottom: '15px', display: 'flex', gap: '10px' }}>
            <button onClick={selectAllForms} style={{ ...styles.logoutButton, background: '#3b82f6' }}>
              Select All
            </button>
            <button onClick={deselectAllForms} style={styles.logoutButton}>
              Deselect All
            </button>
          </div>
          <div style={styles.formGrid}>
            {Object.keys(FORM_TABLES).map(formName => (
              <label
                key={formName}
                style={{
                  ...styles.checkbox,
                  background: selectedForms[formName] ? '#dbeafe' : 'white',
                  borderColor: selectedForms[formName] ? '#3b82f6' : '#e5e7eb'
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedForms[formName] || false}
                  onChange={() => toggleFormSelection(formName)}
                />
                <span>{formName}</span>
              </label>
            ))}
          </div>
        </div>

        <div style={styles.section}>
          <div style={styles.sectionTitle}>📅 Filters</div>
          <div style={styles.filterRow}>
            <div>
              <label style={styles.label}>Date Range</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                style={styles.select}
              >
                {Object.keys(DATE_RANGES).map(range => (
                  <option key={range} value={range}>{range}</option>
                ))}
              </select>
            </div>

            {dateRange === 'Custom Range' && (
              <>
                <div>
                  <label style={styles.label}>Start Date</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    style={styles.input}
                  />
                </div>
                <div>
                  <label style={styles.label}>End Date</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    style={styles.input}
                  />
                </div>
              </>
            )}

            <div>
              <label style={styles.label}>Location</label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                style={styles.select}
              >
                {LOCATIONS.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <button
          onClick={exportData}
          disabled={exporting}
          style={{
            ...styles.exportButton,
            opacity: exporting ? 0.5 : 1,
            cursor: exporting ? 'not-allowed' : 'pointer'
          }}
        >
          {exporting ? '⏳ Exporting...' : '📥 Export Data (CSV)'}
        </button>
      </div>
      
      <div style={{ textAlign: 'center', padding: '20px', color: 'rgba(255,255,255,0.8)', fontSize: '12px', marginTop: '20px' }}>
        <div style={{ fontWeight: '500', marginBottom: '5px' }}>Powered by Predictive Safety Analytics™</div>
        <div>© 2026 SLP Alaska, LLC</div>
      </div>
    </div>
  );
}

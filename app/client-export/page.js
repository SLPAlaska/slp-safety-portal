'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mnxxvoqombrvpaafawbf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ueHh2b3FvbWJydnBhYWZhd2JmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYyOTk3NjEsImV4cCI6MjA1MTg3NTc2MX0.z7VyWA8s7L_cfAu3-Lx03X0Y3ZkxYfGxTa5OWBFsPvI';

const supabase = createClient(supabaseUrl, supabaseKey);

const COMPANY_CREDENTIALS = {
  'MAGTEC2026': { company: 'MagTec', searchTerms: ['MagTec', 'Mag Tec'], password: 'PSA2026$$SLP' },
  'POLLARD2026': { company: 'Pollard', searchTerms: ['Pollard', 'Pollard Wireline'], password: 'PSA2026$$SLP' },
  'AKELINE2026': { company: 'AKE-Line', searchTerms: ['AKE-Line', 'AKE Line', 'AKELINE'], password: 'PSA2026$$SLP' },
  'GBR2026': { company: 'GBR', searchTerms: ['GBR', 'GBR Equipment'], password: 'PSA2026$$SLP' },
  'CHOSEN2026': { company: 'Chosen', searchTerms: ['Chosen', 'Chosen Construction'], password: 'PSA2026$$SLP' },
  'YELLOWJACKET2026': { company: 'Yellowjacket', searchTerms: ['Yellowjacket', 'Yellow Jacket'], password: 'PSA2026$$SLP' },
  'PENINSULA2026': { company: 'Peninsula', searchTerms: ['Peninsula', 'Peninsula Paving'], password: 'PSA2026$$SLP' },
  'CINGSA2026': { company: 'CINGSA', searchTerms: ['CINGSA'], password: 'PSA2026$$SLP' }
};

const FORM_CATEGORIES = {
  'Investigation & Incidents': {
    'THA Assessments': 'tha_submissions',
    'Incident Reports': 'incidents',
    'Property Damage Reports': 'property_damage_reports',
    'Witness Statements': 'witness_statements',
    'Corrective Actions': 'corrective_actions',
    'Lessons Learned': 'lessons_learned',
  },
  'Observations & Field Forms': {
    'BBS Observations': 'bbs_observations',
    'Good Catch/Near Miss': 'good_catch_near_miss',
    'Hazard ID Reports': 'hazard_id_reports',
    'EHS Field Evaluations': 'ehs_field_evaluations',
    'Risk Control Conversations': 'risk_control_conversations',
    'STOP & Take 5': 'stop_take_5',
  },
  'Permits': {
    'Hot Work Permits': 'hot_work_permits',
    'Confined Space (CSE) Permits': 'cse_permits',
    'Excavation Permits': 'excavation_permits',
    'Opening/Blinding Permits': 'opening_blinding_permits',
    'Unit Work Permits': 'unit_work_permits',
    'Energy Isolation (EI) Permits': 'ei_permits',
  },
  'Equipment Inspections': {
    'Crane Inspections': 'crane_inspections',
    'Forklift Inspections': 'forklift_inspections',
    'Vehicle Inspections': 'vehicle_inspections',
    'Heavy Equipment Inspections': 'heavy_equipment_inspections',
    'Fire Extinguisher Inspections': 'fire_extinguisher_inspections',
    'AED Inspections': 'aed_inspections',
  },
  'LSR Audits': {
    'LSR Audits': 'lsr_audits',
    'Confined Space Audits': 'lsr_confined_space_audits',
    'Driving Audits': 'lsr_driving_audits',
    'Energy Isolation Audits': 'lsr_energy_isolation_audits',
    'Fall Protection Audits': 'lsr_fall_protection_audits',
    'Line of Fire Audits': 'lsr_line_of_fire_audits',
  },
  'Training & Evaluations': {
    'Aerial Lift Evaluations': 'aerial_lift_evaluations',
    'Forklift Evaluations': 'forklift_evaluations',
    'Loader Evaluations': 'loader_evaluations',
    'Excavator Evaluations': 'excavator_evaluations',
    'Short Service Employee Evaluations': 'see_evaluations',
  },
  'Other Forms': {
    'Safety Meetings': 'safety_meetings',
    'Management of Change': 'management_of_change',
    'Critical Lift Plans': 'critical_lift_plans',
    'Fall Protection Plans': 'fall_protection_plans',
    'Daily Activity Logs': 'daily_activity_logs',
    'PPE Inspections': 'ppe_inspections',
  }
};

const DATE_RANGES = ['Last Week', 'Last Month', 'Last 3 Months', 'Last Year', 'Year to Date', 'Custom Range'];

const LOCATIONS = [
  'All', 'Kenai', 'CIO', 'Beaver Creek', 'Swanson River', 'Ninilchik', 'Nikiski', 'Other Kenai Asset',
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
  const [dateRange, setDateRange] = useState('Year to Date');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState('');

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

  const selectAllInCategory = (category) => {
    const categoryForms = FORM_CATEGORIES[category];
    setSelectedForms(prev => {
      const updated = { ...prev };
      Object.keys(categoryForms).forEach(form => updated[form] = true);
      return updated;
    });
  };

  const selectAllForms = () => {
    const all = {};
    Object.values(FORM_CATEGORIES).forEach(category => {
      Object.keys(category).forEach(form => all[form] = true);
    });
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
    } else if (dateRange === 'Last 3 Months') {
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
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
    setExportStatus('Gathering data...');

    try {
      const { startDate, endDate } = getDateFilter();
      const allData = [];
      let fetchedCount = 0;

      // Get company search terms once
      const cred = Object.values(COMPANY_CREDENTIALS).find(c => c.company === companyName);
      const searchTerms = cred?.searchTerms || [companyName];
      console.log('Searching for company:', companyName, 'using terms:', searchTerms);

      for (const formName of formsToExport) {
        // Find the table name
        let tableName = null;
        Object.values(FORM_CATEGORIES).forEach(category => {
          if (category[formName]) tableName = category[formName];
        });

        if (!tableName) continue;

        setExportStatus(`Fetching ${formName}... (${++fetchedCount}/${formsToExport.length})`);

        // TEMPORARILY: Fetch ALL data with no filters to see what's there
        let query = supabase.from(tableName).select('*');

        const { data, error } = await query;

        if (error) {
          console.error(`Error fetching ${formName}:`, error);
          setExportStatus(`Error: ${error.message}`);
          continue;
        }

        console.log(`${tableName} returned ${data?.length || 0} total rows`);
        
        // Show sample data for debugging
        if (data && data.length > 0) {
          console.log('Sample row:', data[0]);
          console.log('Company field:', data[0].company || data[0].client || 'NONE');
        }

        // Filter client-side for fuzzy company matching
        if (data && data.length > 0) {
          const filtered = data.filter(row => {
            const companyField = (row.company || row.client || '').toLowerCase();
            const matches = searchTerms.some(term => 
              companyField.includes(term.toLowerCase())
            );
            return matches;
          });

          console.log(`Filtered from ${data.length} to ${filtered.length} rows for company`);

          filtered.forEach(row => {
            allData.push({
              'Form Type': formName,
              'Table': tableName,
              ...row
            });
          });
        }
      }

      if (allData.length === 0) {
        setExportStatus('');
        alert('No data found for selected criteria. This could mean:\n\n1. No records exist for your company in these forms\n2. The date range has no data\n3. The location filter is too restrictive\n\nTry selecting "All" locations and "Year to Date"');
        setExporting(false);
        return;
      }

      setExportStatus(`Preparing download (${allData.length} records)...`);
      downloadCSV(allData);
      setExportStatus('');

    } catch (err) {
      console.error(err);
      alert('Export failed: ' + err.message);
      setExportStatus('');
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
        const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        return stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')
          ? `"${stringValue.replace(/"/g, '""')}"`
          : stringValue;
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
      padding: '30px 20px'
    },
    loginBox: {
      maxWidth: '450px',
      margin: '80px auto',
      background: 'white',
      borderRadius: '16px',
      padding: '50px',
      boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
    },
    dashboardContainer: {
      maxWidth: '1400px',
      margin: '0 auto',
      background: 'linear-gradient(to bottom, #ffffff 0%, #f0f4f8 100%)',
      borderRadius: '16px',
      padding: '40px',
      boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
      border: '3px solid #1e3a8a'
    },
    header: {
      textAlign: 'center',
      marginBottom: '35px'
    },
    title: {
      fontSize: '28px',
      fontWeight: '700',
      color: '#1f2937',
      margin: '15px 0 8px'
    },
    subtitle: {
      fontSize: '15px',
      color: '#6b7280',
      lineHeight: '1.5'
    },
    inputGroup: {
      marginBottom: '25px'
    },
    label: {
      display: 'block',
      marginBottom: '10px',
      fontSize: '15px',
      fontWeight: '600',
      color: '#374151'
    },
    input: {
      width: '100%',
      padding: '14px',
      border: '2px solid #d1d5db',
      borderRadius: '8px',
      fontSize: '15px',
      boxSizing: 'border-box',
      transition: 'border-color 0.2s'
    },
    button: {
      width: '100%',
      padding: '16px',
      background: 'linear-gradient(135deg, #1e3a8a 0%, #7f1d1d 100%)',
      color: 'white',
      border: 'none',
      borderRadius: '10px',
      fontSize: '17px',
      fontWeight: '600',
      cursor: 'pointer',
      marginTop: '10px',
      transition: 'transform 0.2s',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
    },
    error: {
      background: '#fee2e2',
      border: '2px solid #fca5a5',
      color: '#dc2626',
      padding: '14px',
      borderRadius: '8px',
      marginBottom: '20px',
      fontSize: '14px',
      fontWeight: '500'
    },
    categorySection: {
      marginBottom: '30px',
      background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
      border: '2px solid #3b82f6',
      borderRadius: '12px',
      padding: '25px',
      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.1)'
    },
    categoryHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
      paddingBottom: '15px',
      borderBottom: '2px solid #e5e7eb'
    },
    categoryTitle: {
      fontSize: '20px',
      fontWeight: '700',
      color: '#1e3a8a'
    },
    formGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: '12px'
    },
    checkbox: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '14px',
      border: '2px solid #e5e7eb',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '15px',
      fontWeight: '500',
      transition: 'all 0.2s',
      background: 'white'
    },
    filterSection: {
      background: '#eff6ff',
      border: '2px solid #bfdbfe',
      borderRadius: '12px',
      padding: '25px',
      marginBottom: '30px'
    },
    filterTitle: {
      fontSize: '20px',
      fontWeight: '700',
      color: '#1e3a8a',
      marginBottom: '20px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    },
    filterRow: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '20px'
    },
    select: {
      width: '100%',
      padding: '12px',
      border: '2px solid #d1d5db',
      borderRadius: '8px',
      fontSize: '15px',
      background: 'white',
      fontWeight: '500'
    },
    exportButton: {
      padding: '20px 40px',
      background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
      color: 'white',
      border: 'none',
      borderRadius: '12px',
      fontSize: '20px',
      fontWeight: '700',
      cursor: 'pointer',
      width: '100%',
      boxShadow: '0 6px 20px rgba(5, 150, 105, 0.3)',
      transition: 'transform 0.2s'
    },
    smallButton: {
      padding: '10px 18px',
      background: '#3b82f6',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'background 0.2s'
    },
    logoutButton: {
      padding: '10px 20px',
      background: '#6b7280',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '15px',
      fontWeight: '600',
      cursor: 'pointer'
    },
    topBar: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '30px',
      paddingBottom: '25px',
      borderBottom: '3px solid #e5e7eb'
    },
    companyBadge: {
      background: 'linear-gradient(135deg, #1e3a8a 0%, #7f1d1d 100%)',
      color: 'white',
      padding: '12px 24px',
      borderRadius: '10px',
      fontSize: '22px',
      fontWeight: '700',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
    },
    statusBar: {
      background: '#fef3c7',
      border: '2px solid #fbbf24',
      borderRadius: '8px',
      padding: '12px 20px',
      marginTop: '15px',
      fontSize: '15px',
      fontWeight: '600',
      color: '#92400e',
      textAlign: 'center'
    }
  };

  if (!isLoggedIn) {
    return (
      <div style={styles.container}>
        <div style={styles.loginBox}>
          <div style={styles.header}>
            <img src="/Logo.png" alt="SLP Alaska" style={{ maxWidth: '220px', marginBottom: '25px' }} />
            <div style={{ fontSize: '56px', marginBottom: '15px' }}>🔐</div>
            <h1 style={styles.title}>Client Data Export</h1>
            <p style={styles.subtitle}>Secure access to your safety data<br/>Enter your company credentials below</p>
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
              🔓 Login to Dashboard
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '25px' }}>
            <a href="/" style={{ color: '#3b82f6', fontSize: '15px', textDecoration: 'none', fontWeight: '600' }}>
              ← Back to Portal
            </a>
          </div>
        </div>
        
        <div style={{ textAlign: 'center', padding: '25px', color: 'rgba(255,255,255,0.9)', fontSize: '13px', marginTop: '40px' }}>
          <div style={{ fontWeight: '600', marginBottom: '6px' }}>Powered by Predictive Safety Analytics™</div>
          <div style={{ fontWeight: '500' }}>© 2026 SLP Alaska, LLC</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.dashboardContainer}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <img src="/Logo.png" alt="SLP Alaska" style={{ maxWidth: '200px', marginBottom: '15px' }} />
          <div style={{ fontSize: '20px', fontWeight: '600', color: '#1e3a8a', marginBottom: '5px' }}>
            Safety • Leadership • Performance
          </div>
          <div style={{ fontSize: '16px', fontStyle: 'italic', color: '#b91c1c', fontWeight: '600' }}>
            "Safety isn't expensive, it's PRICELESS!"
          </div>
        </div>
        
        <div style={styles.topBar}>
          <div style={styles.companyBadge}>{companyName}</div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <a href="/" style={{ textDecoration: 'none' }}>
              <button style={{ ...styles.logoutButton, background: '#3b82f6' }}>
                ← Back to Portal
              </button>
            </a>
            <button onClick={handleLogout} style={styles.logoutButton}>
              🚪 Logout
            </button>
          </div>
        </div>

        <div style={styles.filterSection}>
          <div style={styles.filterTitle}>📅 Filter Your Data</div>
          <div style={styles.filterRow}>
            <div>
              <label style={styles.label}>Date Range</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                style={styles.select}
              >
                {DATE_RANGES.map(range => (
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

        <div style={{ marginBottom: '20px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button onClick={selectAllForms} style={styles.smallButton}>
            ✅ Select All Forms
          </button>
          <button onClick={deselectAllForms} style={{ ...styles.smallButton, background: '#6b7280' }}>
            ❌ Deselect All
          </button>
        </div>

        {Object.entries(FORM_CATEGORIES).map(([categoryName, forms]) => (
          <div key={categoryName} style={styles.categorySection}>
            <div style={styles.categoryHeader}>
              <div style={styles.categoryTitle}>{categoryName}</div>
              <button onClick={() => selectAllInCategory(categoryName)} style={styles.smallButton}>
                Select All
              </button>
            </div>
            <div style={styles.formGrid}>
              {Object.keys(forms).map(formName => (
                <label
                  key={formName}
                  style={{
                    ...styles.checkbox,
                    background: selectedForms[formName] ? '#dbeafe' : 'white',
                    borderColor: selectedForms[formName] ? '#3b82f6' : '#e5e7eb',
                    transform: selectedForms[formName] ? 'scale(1.02)' : 'scale(1)'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedForms[formName] || false}
                    onChange={() => toggleFormSelection(formName)}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span>{formName}</span>
                </label>
              ))}
            </div>
          </div>
        ))}

        <button
          onClick={exportData}
          disabled={exporting}
          style={{
            ...styles.exportButton,
            opacity: exporting ? 0.6 : 1,
            cursor: exporting ? 'not-allowed' : 'pointer',
            transform: exporting ? 'scale(0.98)' : 'scale(1)'
          }}
        >
          {exporting ? '⏳ Exporting...' : '📥 Export Selected Data (CSV)'}
        </button>

        {exportStatus && <div style={styles.statusBar}>⚙️ {exportStatus}</div>}
      </div>
      
      <div style={{ textAlign: 'center', padding: '25px', color: 'rgba(255,255,255,0.9)', fontSize: '13px', marginTop: '25px' }}>
        <div style={{ fontWeight: '600', marginBottom: '6px' }}>Powered by Predictive Safety Analytics™</div>
        <div style={{ fontWeight: '500' }}>© 2026 SLP Alaska, LLC</div>
      </div>
    </div>
  );
}
"// force rebuild" 

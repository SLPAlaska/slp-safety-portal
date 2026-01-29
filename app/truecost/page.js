'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://iypezirwdlqpptjpeeyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
);

const SLP_DOMAIN = '@slpalaska.com';

// Industry standard indirect cost multipliers by severity
const INDIRECT_MULTIPLIERS = {
  'A': 8.0,  // Fatality - extremely high indirect costs
  'B': 6.0,  // Permanent disability
  'C': 4.5,  // Major injury
  'D': 3.5,  // Moderate injury
  'E': 2.5,  // Minor injury with lost time
  'F': 1.5,  // First aid with restricted duty
  'G': 1.0   // First aid only
};

// Cost categories
const DIRECT_COST_CATEGORIES = [
  { id: 'medical', name: 'Medical Expenses', description: 'Treatment, hospitalization, rehabilitation', icon: '🏥' },
  { id: 'workers_comp', name: 'Workers Compensation', description: 'WC payments, premium increases', icon: '📋' },
  { id: 'property_damage', name: 'Property Damage', description: 'Equipment, facilities, vehicles', icon: '🔧' },
  { id: 'environmental', name: 'Environmental Cleanup', description: 'Spill response, remediation', icon: '🌿' },
  { id: 'legal', name: 'Legal & Regulatory', description: 'Fines, legal fees, settlements', icon: '⚖️' },
  { id: 'emergency', name: 'Emergency Response', description: 'First responders, medevac', icon: '🚑' }
];

const INDIRECT_COST_CATEGORIES = [
  { id: 'lost_productivity', name: 'Lost Productivity', description: 'Production delays, crew standby', icon: '⏱️' },
  { id: 'investigation', name: 'Investigation Time', description: 'Staff time for investigation', icon: '🔍' },
  { id: 'training', name: 'Training & Replacement', description: 'Hiring, training replacements', icon: '📚' },
  { id: 'administrative', name: 'Administrative Costs', description: 'Reporting, paperwork, meetings', icon: '📝' },
  { id: 'reputation', name: 'Reputation Impact', description: 'Client relationships, contracts', icon: '🏢' },
  { id: 'morale', name: 'Morale & Turnover', description: 'Employee morale, increased turnover', icon: '👥' },
  { id: 'schedule', name: 'Schedule Delays', description: 'Project delays, penalties', icon: '📅' },
  { id: 'equipment', name: 'Equipment Downtime', description: 'Lost equipment availability', icon: '🚧' }
];

const SEVERITY_COLORS = {
  'A': '#7F1D1D', 'B': '#991B1B', 'C': '#B91C1C', 'D': '#DC2626',
  'E': '#F97316', 'F': '#EAB308', 'G': '#22C55E'
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
  totalCard: { background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)', borderRadius: '16px', padding: '30px', color: 'white', textAlign: 'center', marginBottom: '25px' },
  totalAmount: { fontSize: '48px', fontWeight: '700', marginBottom: '10px' },
  totalLabel: { fontSize: '14px', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '1px' },
  costRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px' },
  costCard: { border: '2px solid #e2e8f0', borderRadius: '12px', padding: '20px' },
  costCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' },
  costCardTitle: { fontWeight: '700', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '10px' },
  costCardTotal: { fontSize: '24px', fontWeight: '700' },
  costItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#f8fafc', borderRadius: '8px', marginBottom: '8px' },
  costItemLabel: { display: 'flex', alignItems: 'center', gap: '10px' },
  costItemIcon: { fontSize: '20px' },
  input: { width: '100%', padding: '12px 15px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box' },
  currencyInput: { width: '120px', padding: '10px 12px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', textAlign: 'right' },
  select: { width: '100%', padding: '12px 15px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '15px', background: 'white' },
  actionBtn: { padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '15px', fontWeight: '600' },
  primaryBtn: { background: 'linear-gradient(135deg, #991b1b 0%, #c41e3a 100%)', color: 'white' },
  secondaryBtn: { background: '#1e3a8a', color: 'white' },
  successBtn: { background: '#22c55e', color: 'white' },
  formGroup: { marginBottom: '20px' },
  label: { display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1e293b', fontSize: '14px' },
  footer: { textAlign: 'center', padding: '20px', color: 'white', fontSize: '13px' },
  submitBtn: { width: '100%', padding: '14px', background: 'linear-gradient(135deg, #991b1b 0%, #c41e3a 100%)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginBottom: '25px' },
  statCard: { background: '#f8fafc', borderRadius: '12px', padding: '20px', textAlign: 'center', border: '2px solid #e2e8f0' },
  statNumber: { fontSize: '28px', fontWeight: '700', marginBottom: '5px' },
  statLabel: { fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' },
  breakdownBar: { height: '30px', borderRadius: '8px', overflow: 'hidden', display: 'flex', marginBottom: '15px' },
  roiCard: { background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', borderRadius: '12px', padding: '25px', color: 'white', marginTop: '25px' },
  roiTitle: { fontSize: '14px', opacity: 0.9, marginBottom: '5px' },
  roiValue: { fontSize: '36px', fontWeight: '700' },
  infoBox: { background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', padding: '15px', marginBottom: '20px', fontSize: '14px', color: '#0369a1' },
  badge: { display: 'inline-block', padding: '4px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' }
};

function isSLPTeam(email) { return email && email.toLowerCase().endsWith(SLP_DOMAIN); }
function formatDate(d) { return d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'; }
function formatCurrency(amount) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount || 0); }

export default function TrueCostCalculator() {
  const [userEmail, setUserEmail] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('calculator');

  // Incident selection
  const [incidents, setIncidents] = useState([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState('');
  const [selectedIncident, setSelectedIncident] = useState(null);

  // Cost data
  const [directCosts, setDirectCosts] = useState({});
  const [indirectCosts, setIndirectCosts] = useState({});
  const [useAutoCalculate, setUseAutoCalculate] = useState(true);
  const [customMultiplier, setCustomMultiplier] = useState(3.0);
  const [notes, setNotes] = useState('');

  // Aggregate stats
  const [aggregateStats, setAggregateStats] = useState({ totalCost: 0, avgCost: 0, incidentCount: 0, caROI: 0 });

  useEffect(() => {
    const saved = localStorage.getItem('slp_user_email');
    if (saved && isSLPTeam(saved)) { setUserEmail(saved); setIsAuthenticated(true); }
    setLoading(false);
  }, []);

  useEffect(() => { if (isAuthenticated) { fetchIncidents(); fetchAggregateStats(); } }, [isAuthenticated]);

  async function fetchIncidents() {
    const { data } = await supabase
      .from('incidents')
      .select('id, incident_id, brief_description, company_name, incident_date, safety_severity, status')
      .order('incident_date', { ascending: false });
    setIncidents(data || []);
  }

  async function fetchAggregateStats() {
    const { data } = await supabase.from('incident_costs').select('total_cost');
    if (data && data.length > 0) {
      const total = data.reduce((sum, d) => sum + (d.total_cost || 0), 0);
      setAggregateStats({
        totalCost: total,
        avgCost: Math.round(total / data.length),
        incidentCount: data.length,
        caROI: Math.round(total * 0.3) // Estimate 30% prevented by CAs
      });
    }
  }

  async function loadIncidentCosts(incidentId) {
    setLoading(true);
    
    try {
      // Load incident details
      const { data: incident, error: incidentError } = await supabase
        .from('incidents')
        .select('*')
        .eq('id', incidentId)
        .single();
      
      if (incidentError) throw incidentError;
      setSelectedIncident(incident);

      // Load existing cost data
      const { data: costData, error: costError } = await supabase
        .from('incident_costs')
        .select('*')
        .eq('incident_id', incidentId)
        .maybeSingle();

      if (costError && costError.code !== 'PGRST116') {
        console.error('Error loading cost data:', costError);
      }

      if (costData) {
        // Load saved costs
        console.log('Loading existing cost data:', costData);
        setDirectCosts({
          medical: costData.cat1_subtotal || 0,
          workers_comp: costData.cat2_subtotal || 0,
          property_damage: costData.cat3_subtotal || 0,
          environmental: costData.cat4_subtotal || 0,
          legal: costData.cat5_subtotal || 0,
          emergency: costData.cat6_subtotal || 0
        });
        setIndirectCosts({
          lost_productivity: costData.cat7_subtotal || 0,
          investigation: costData.cat8_subtotal || 0,
          training: costData.cat9_subtotal || 0
        });
        setNotes(costData.notes || '');
        setUseAutoCalculate(costData.total_indirect_costs > 0 ? false : true);
      } else {
        // Reset to defaults for new calculation
        console.log('No existing cost data found - starting fresh');
        setDirectCosts({});
        setIndirectCosts({});
        setUseAutoCalculate(true);
        setCustomMultiplier(INDIRECT_MULTIPLIERS[incident?.safety_severity] || 3.0);
        setNotes('');
      }
      
    } catch (error) {
      console.error('Error in loadIncidentCosts:', error);
      alert('Error loading incident: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  function calculateTotals() {
    const directTotal = Object.values(directCosts).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
    
    let indirectTotal;
    if (useAutoCalculate) {
      const multiplier = INDIRECT_MULTIPLIERS[selectedIncident?.safety_severity] || customMultiplier;
      indirectTotal = directTotal * multiplier;
    } else {
      indirectTotal = Object.values(indirectCosts).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
    }

    const totalCost = directTotal + indirectTotal;
    const ratio = directTotal > 0 ? (indirectTotal / directTotal).toFixed(1) : 0;

    return { directTotal, indirectTotal, totalCost, ratio };
  }

  async function saveCosts() {
    if (!selectedIncidentId) {
      alert('Please select an incident first');
      return;
    }
    setSaving(true);

    try {
      const { directTotal, indirectTotal, totalCost, ratio } = calculateTotals();

      // Map the costs to the actual database columns
      const costRecord = {
        cost_record_id: `COST-${selectedIncident?.incident_id || Date.now()}`,
        incident_id: selectedIncidentId,
        entry_date: new Date().toISOString(),
        entered_by: userEmail,
        last_updated: new Date().toISOString(),
        
        // Direct costs from form (storing in category subtotals)
        cat1_subtotal: directCosts.medical || 0,
        cat2_subtotal: directCosts.workers_comp || 0,
        cat3_subtotal: directCosts.property_damage || 0,
        cat4_subtotal: directCosts.environmental || 0,
        cat5_subtotal: directCosts.legal || 0,
        cat6_subtotal: directCosts.emergency || 0,
        
        // Indirect costs
        cat7_subtotal: indirectCosts.lost_productivity || 0,
        cat8_subtotal: indirectCosts.investigation || 0,
        cat9_subtotal: indirectCosts.training || 0,
        
        // Totals
        total_direct_costs: directTotal,
        total_indirect_costs: indirectTotal,
        total_all_costs: totalCost,
        direct_indirect_ratio: `1:${ratio}`,
        
        notes: notes,
        review_status: 'Draft'
      };

      // Check if cost record already exists
      const { data: existing, error: fetchError } = await supabase
        .from('incident_costs')
        .select('id')
        .eq('incident_id', selectedIncidentId)
        .maybeSingle();

      if (fetchError) {
        console.error('Error checking existing record:', fetchError);
        throw fetchError;
      }

      let result;
      if (existing) {
        // Update existing record
        result = await supabase
          .from('incident_costs')
          .update(costRecord)
          .eq('id', existing.id);
        console.log('Updated existing cost record');
      } else {
        // Insert new record
        result = await supabase
          .from('incident_costs')
          .insert(costRecord);
        console.log('Inserted new cost record');
      }

      if (result.error) {
        console.error('Supabase error:', result.error);
        throw result.error;
      }

      // Update incident table with total cost
      await supabase
        .from('incidents')
        .update({ total_cost: totalCost })
        .eq('id', selectedIncidentId);

      setSaving(false);
      await fetchAggregateStats();
      alert(`TrueCost™ ${existing ? 'updated' : 'saved'} successfully! Total: ${formatCurrency(totalCost)}`);
      
    } catch (error) {
      console.error('Error saving costs:', error);
      alert('Error saving costs: ' + error.message);
      setSaving(false);
    }
  }

  function handleLogin(e) {
    e.preventDefault();
    if (!loginEmail) { setLoginError('Enter email'); return; }
    if (!isSLPTeam(loginEmail)) { setLoginError('Access restricted to @slpalaska.com'); return; }
    localStorage.setItem('slp_user_email', loginEmail.toLowerCase());
    setUserEmail(loginEmail.toLowerCase());
    setIsAuthenticated(true);
  }

  const { directTotal, indirectTotal, totalCost, ratio } = calculateTotals();

  // Login
  if (!isAuthenticated) {
    return (
      <div style={styles.container}><div style={styles.wrapper}>
        <a href="/" style={{ display: 'inline-block', marginBottom: '15px', padding: '10px 20px', backgroundColor: '#1e3a5f', color: '#fff', textDecoration: 'none', borderRadius: '6px' }}>← Back to Portal</a>
        <div style={styles.loginCard}>
          <img src="/Logo.png" alt="SLP Alaska" style={{ maxWidth: '200px', margin: '0 auto 25px', display: 'block' }} />
          <h1 style={{ color: '#1e293b', marginBottom: '10px', fontSize: '24px' }}>TrueCost™ Calculator</h1>
          <p style={{ color: '#64748b', marginBottom: '30px' }}>Calculate the true cost of incidents</p>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
            <div>
              <img src="/Logo.png" alt="SLP Alaska" style={{ maxWidth: '150px', marginBottom: '10px' }} />
              <div style={styles.headerTitle}>💰 TrueCost™ Calculator</div>
              <div style={styles.headerSubtitle}>Calculate the true cost of incidents • Direct + Indirect costs</div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '13px', opacity: 0.9 }}>
              {userEmail}
            </div>
          </div>
        </div>

        <div style={styles.card}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '25px', borderBottom: '2px solid #e2e8f0', paddingBottom: '15px' }}>
            <button onClick={() => setActiveTab('calculator')} style={{ ...styles.actionBtn, background: activeTab === 'calculator' ? '#1e3a8a' : '#f1f5f9', color: activeTab === 'calculator' ? 'white' : '#64748b' }}>
              🧮 Calculator
            </button>
            <button onClick={() => setActiveTab('summary')} style={{ ...styles.actionBtn, background: activeTab === 'summary' ? '#1e3a8a' : '#f1f5f9', color: activeTab === 'summary' ? 'white' : '#64748b' }}>
              📊 Cost Summary
            </button>
          </div>

          {/* Summary Tab */}
          {activeTab === 'summary' && (
            <div>
              <div style={styles.statsRow}>
                <div style={{ ...styles.statCard, borderColor: '#991b1b' }}>
                  <div style={{ ...styles.statNumber, color: '#991b1b' }}>{formatCurrency(aggregateStats.totalCost)}</div>
                  <div style={styles.statLabel}>Total Incident Costs</div>
                </div>
                <div style={styles.statCard}>
                  <div style={{ ...styles.statNumber, color: '#1e3a8a' }}>{formatCurrency(aggregateStats.avgCost)}</div>
                  <div style={styles.statLabel}>Avg Cost per Incident</div>
                </div>
                <div style={styles.statCard}>
                  <div style={{ ...styles.statNumber, color: '#7c3aed' }}>{aggregateStats.incidentCount}</div>
                  <div style={styles.statLabel}>Incidents Costed</div>
                </div>
                <div style={{ ...styles.statCard, borderColor: '#22c55e' }}>
                  <div style={{ ...styles.statNumber, color: '#22c55e' }}>{formatCurrency(aggregateStats.caROI)}</div>
                  <div style={styles.statLabel}>Est. Costs Prevented</div>
                </div>
              </div>

              <div style={styles.roiCard}>
                <div style={styles.roiTitle}>CORRECTIVE ACTIONS ROI</div>
                <div style={styles.roiValue}>
                  {aggregateStats.totalCost > 0 ? Math.round((aggregateStats.caROI / aggregateStats.totalCost) * 100) : 0}% Estimated Prevention
                </div>
                <p style={{ margin: '15px 0 0', opacity: 0.9, fontSize: '14px' }}>
                  Based on industry data, effective corrective actions prevent approximately 30% of repeat incidents.
                </p>
              </div>

              <div style={styles.infoBox}>
                <strong>💡 TrueCost™ Insight:</strong> For every $1 in direct costs, incidents typically incur $2-$10 in indirect costs including lost productivity, investigation time, training, and reputation impact.
              </div>
            </div>
          )}

          {/* Calculator Tab */}
          {activeTab === 'calculator' && (
            <div>
              {/* Incident Selection */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Select Incident</label>
                <select
                  value={selectedIncidentId}
                  onChange={(e) => { setSelectedIncidentId(e.target.value); if (e.target.value) loadIncidentCosts(e.target.value); }}
                  style={styles.select}
                >
                  <option value="">-- Select an Incident --</option>
                  {incidents.map(inc => (
                    <option key={inc.id} value={inc.id}>
                      {inc.incident_id} - {inc.company_name} - {formatDate(inc.incident_date)} (Sev: {inc.safety_severity || 'N/A'})
                    </option>
                  ))}
                </select>
              </div>

              {selectedIncident && (
                <>
                  {/* Incident Info */}
                  <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', marginBottom: '25px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                      <div>
                        <strong style={{ fontSize: '18px' }}>{selectedIncident.incident_id}</strong>
                        <p style={{ margin: '5px 0 0', color: '#64748b' }}>{selectedIncident.brief_description}</p>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <span style={{ ...styles.badge, background: SEVERITY_COLORS[selectedIncident.safety_severity] || '#64748b', color: 'white' }}>
                          Severity {selectedIncident.safety_severity}
                        </span>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>
                          Multiplier: {INDIRECT_MULTIPLIERS[selectedIncident.safety_severity] || 3.0}x
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Total Cost Display */}
                  <div style={styles.totalCard}>
                    <div style={styles.totalLabel}>Total TrueCost™</div>
                    <div style={styles.totalAmount}>{formatCurrency(totalCost)}</div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', marginTop: '15px', fontSize: '14px' }}>
                      <span>Direct: {formatCurrency(directTotal)}</span>
                      <span>|</span>
                      <span>Indirect: {formatCurrency(indirectTotal)}</span>
                      <span>|</span>
                      <span>Ratio: 1:{ratio}</span>
                    </div>
                  </div>

                  {/* Cost Breakdown Visual */}
                  {totalCost > 0 && (
                    <div style={styles.breakdownBar}>
                      <div style={{ width: `${(directTotal / totalCost) * 100}%`, background: '#991b1b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '12px', fontWeight: '600' }}>
                        {Math.round((directTotal / totalCost) * 100)}% Direct
                      </div>
                      <div style={{ width: `${(indirectTotal / totalCost) * 100}%`, background: '#1e3a8a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '12px', fontWeight: '600' }}>
                        {Math.round((indirectTotal / totalCost) * 100)}% Indirect
                      </div>
                    </div>
                  )}

                  <div style={styles.costRow}>
                    {/* Direct Costs */}
                    <div style={styles.costCard}>
                      <div style={styles.costCardHeader}>
                        <div style={{ ...styles.costCardTitle, color: '#991b1b' }}>🏥 Direct Costs</div>
                        <div style={{ ...styles.costCardTotal, color: '#991b1b' }}>{formatCurrency(directTotal)}</div>
                      </div>
                      
                      {DIRECT_COST_CATEGORIES.map(cat => (
                        <div key={cat.id} style={styles.costItem}>
                          <div style={styles.costItemLabel}>
                            <span style={styles.costItemIcon}>{cat.icon}</span>
                            <div>
                              <div style={{ fontWeight: '600', fontSize: '13px' }}>{cat.name}</div>
                              <div style={{ fontSize: '11px', color: '#94a3b8' }}>{cat.description}</div>
                            </div>
                          </div>
                          <input
                            type="number"
                            value={directCosts[cat.id] || ''}
                            onChange={(e) => setDirectCosts({ ...directCosts, [cat.id]: e.target.value })}
                            placeholder="$0"
                            style={styles.currencyInput}
                          />
                        </div>
                      ))}
                    </div>

                    {/* Indirect Costs */}
                    <div style={styles.costCard}>
                      <div style={styles.costCardHeader}>
                        <div style={{ ...styles.costCardTitle, color: '#1e3a8a' }}>📊 Indirect Costs</div>
                        <div style={{ ...styles.costCardTotal, color: '#1e3a8a' }}>{formatCurrency(indirectTotal)}</div>
                      </div>

                      {/* Auto-calculate toggle */}
                      <div style={{ background: '#f0f9ff', padding: '12px', borderRadius: '8px', marginBottom: '15px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={useAutoCalculate}
                            onChange={() => setUseAutoCalculate(!useAutoCalculate)}
                            style={{ width: '18px', height: '18px' }}
                          />
                          <span style={{ fontSize: '13px' }}>
                            Auto-calculate using industry multiplier ({INDIRECT_MULTIPLIERS[selectedIncident?.safety_severity] || 3.0}x for Severity {selectedIncident?.safety_severity})
                          </span>
                        </label>
                      </div>

                      {useAutoCalculate ? (
                        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                          <div style={{ fontSize: '14px', marginBottom: '10px' }}>
                            Indirect costs auto-calculated at <strong>{INDIRECT_MULTIPLIERS[selectedIncident?.safety_severity] || 3.0}x</strong> direct costs
                          </div>
                          <div style={{ fontSize: '24px', fontWeight: '700', color: '#1e3a8a' }}>
                            {formatCurrency(indirectTotal)}
                          </div>
                        </div>
                      ) : (
                        INDIRECT_COST_CATEGORIES.map(cat => (
                          <div key={cat.id} style={styles.costItem}>
                            <div style={styles.costItemLabel}>
                              <span style={styles.costItemIcon}>{cat.icon}</span>
                              <div>
                                <div style={{ fontWeight: '600', fontSize: '13px' }}>{cat.name}</div>
                                <div style={{ fontSize: '11px', color: '#94a3b8' }}>{cat.description}</div>
                              </div>
                            </div>
                            <input
                              type="number"
                              value={indirectCosts[cat.id] || ''}
                              onChange={(e) => setIndirectCosts({ ...indirectCosts, [cat.id]: e.target.value })}
                              placeholder="$0"
                              style={styles.currencyInput}
                            />
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Cost Calculation Notes</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add any notes about cost assumptions or calculations..."
                      style={{ ...styles.input, minHeight: '80px', resize: 'vertical' }}
                    />
                  </div>

                  {/* Save Button */}
                  <div style={{ textAlign: 'center', marginTop: '25px' }}>
                    <button
                      onClick={saveCosts}
                      disabled={saving}
                      style={{ ...styles.actionBtn, ...styles.primaryBtn, padding: '15px 40px', fontSize: '16px', opacity: saving ? 0.6 : 1 }}
                    >
                      {saving ? '⏳ Saving...' : '💾 Save TrueCost™'}
                    </button>
                  </div>
                </>
              )}

              {!selectedIncident && (
                <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
                  <div style={{ fontSize: '48px', marginBottom: '15px' }}>💰</div>
                  <p>Select an incident above to calculate TrueCost™</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={styles.footer}>
          <div style={{ marginBottom: '5px' }}><strong>Powered by Predictive Safety Analytics™</strong></div>
          <div>© 2026 SLP Alaska, LLC. All rights reserved.</div>
        </div>
      </div>
    </div>
  );
}

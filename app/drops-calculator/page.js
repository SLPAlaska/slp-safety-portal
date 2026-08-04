'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { safeInsert } from '@/components/SafeSubmit';

const supabase = createClient(
  'https://iypezirwdlqpptjpeeyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
);

const COMPANIES = [
  'A-C Electric','Ace Energy Services', 'AKE-Line','Apache Corp.','Armstrong Oil & Gas','ASRC Energy Services',
  'CCI-Industrial','Chosen Construction','CINGSA','Coho Enterprises','Conam Construction',
  'ConocoPhillips','Five Star Oilfield Services','Fox Energy Services','G.A. West',
  'GBR Equipment','GLM Energy Services','Graham Industrial Coatings','Harvest Midstream',
  'Hilcorp Alaska','MagTec Alaska','Merkes Builders','Narwhal Exploration','Nordic-Calista','Parker TRS',
  'Peninsula Paving','Pollard Wireline','Ridgeline Oilfield Services','Santos',
  'Summit Excavation','Tesoro Refinery','Yellowjacket','Other'
];

const LOCATIONS = [
  'Kenai','CIO','Beaver Creek','Swanson River','Ninilchik','Nikiski','Other Kenai Asset',
  'Deadhorse','Prudhoe Bay','Kuparuk','Alpine','Willow','ENI','PIKKA',
  'Point Thompson','North Star Island','Endicott','Badami', 'West Harrison Bay', 'Other North Slope'
];

// --- PHYSICS: All formulas are standard, public-domain physics ---
// Potential Energy: PE = m * g * h (Joules)
// Impact Force estimate: F = PE / d (stopping distance, typically 0.01m for steel-on-steel)
// Exclusion zone radius: R = sqrt(2 * h) * bounce factor
const GRAVITY = 9.81; // m/s^2
const LBS_TO_KG = 0.453592;
const FT_TO_M = 0.3048;
const JOULES_TO_FTLBS = 0.737562;
const DEFAULT_STOP_DIST = 0.01; // meters, hard surface impact

// --- SLP ALASKA ORIGINAL RISK MATRIX ---
// Consequence levels based on energy (Joules)
const CONSEQUENCE_LEVELS = [
  { level: 1, label: 'Negligible', color: '#22c55e', maxEnergy: 20, description: 'Minor bruise or no injury expected' },
  { level: 2, label: 'Minor', color: '#84cc16', maxEnergy: 80, description: 'First aid level injury likely' },
  { level: 3, label: 'Moderate', color: '#eab308', maxEnergy: 200, description: 'Medical treatment injury possible' },
  { level: 4, label: 'Major', color: '#f97316', maxEnergy: 500, description: 'Serious injury or permanent disability possible' },
  { level: 5, label: 'Critical', color: '#ef4444', maxEnergy: Infinity, description: 'Fatality or life-altering injury possible' },
];

// Likelihood levels
const LIKELIHOOD_LEVELS = [
  { level: 1, label: 'Rare', description: 'Object fully secured, inspected, no history of drops' },
  { level: 2, label: 'Unlikely', description: 'Object secured, minor wear noted, infrequent handling' },
  { level: 3, label: 'Possible', description: 'Object handled frequently, some securing gaps noted' },
  { level: 4, label: 'Likely', description: 'Object poorly secured, vibration/wind exposure, wear visible' },
  { level: 5, label: 'Almost Certain', description: 'Object unsecured or hanging, active work overhead, history of drops' },
];

// Risk matrix color: matrix[likelihood-1][consequence-1]
const RISK_MATRIX = [
  ['#22c55e','#22c55e','#84cc16','#eab308','#eab308'],
  ['#22c55e','#84cc16','#eab308','#eab308','#f97316'],
  ['#84cc16','#eab308','#eab308','#f97316','#ef4444'],
  ['#eab308','#eab308','#f97316','#ef4444','#ef4444'],
  ['#eab308','#f97316','#ef4444','#ef4444','#7f1d1d'],
];

const RISK_LABELS = [
  ['Low','Low','Low-Med','Medium','Medium'],
  ['Low','Low-Med','Medium','Medium','High'],
  ['Low-Med','Medium','Medium','High','Critical'],
  ['Medium','Medium','High','Critical','Critical'],
  ['Medium','High','Critical','Critical','Critical'],
];

const COMMON_OBJECTS = [
  { name: 'Bolt (3/4")', weight_lbs: 0.5 },
  { name: 'Wrench (12")', weight_lbs: 2.0 },
  { name: 'Hammer', weight_lbs: 2.5 },
  { name: 'Pipe wrench (18")', weight_lbs: 5.0 },
  { name: 'Hard hat', weight_lbs: 1.0 },
  { name: 'Radio/walkie-talkie', weight_lbs: 0.75 },
  { name: 'Drill/impact gun', weight_lbs: 6.0 },
  { name: 'Shackle (1")', weight_lbs: 3.5 },
  { name: 'Chain section (3 ft)', weight_lbs: 10.0 },
  { name: 'Scaffold clamp', weight_lbs: 2.5 },
  { name: 'Grinder (4.5")', weight_lbs: 5.5 },
  { name: 'Come-along', weight_lbs: 12.0 },
  { name: 'Fire extinguisher (10lb)', weight_lbs: 16.0 },
  { name: 'Valve (2" gate)', weight_lbs: 25.0 },
  { name: 'Custom', weight_lbs: 0 },
];

export default function DropsCalculator() {
  const [formData, setFormData] = useState({
    assessor_name: '', date: new Date().toISOString().split('T')[0], company: '', location: '',
    work_area: '', task_description: '',
    object_name: '', weight_lbs: '', height_ft: '',
    likelihood: 3, notes: '', controls: '',
  });
  const [results, setResults] = useState(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState('');
  const [activeTab, setActiveTab] = useState('calculator');

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field !== 'controls' && field !== 'notes') {
      setResults(null);
      setSaved(false);
    }
  };

  const selectPreset = (preset) => {
    setSelectedPreset(preset.name);
    if (preset.name === 'Custom') {
      handleChange('object_name', '');
      handleChange('weight_lbs', '');
    } else {
      setFormData(prev => ({ ...prev, object_name: preset.name, weight_lbs: String(preset.weight_lbs) }));
      setResults(null);
      setSaved(false);
    }
  };

  const calculate = () => {
    const w_lbs = parseFloat(formData.weight_lbs);
    const h_ft = parseFloat(formData.height_ft);
    if (!w_lbs || !h_ft || w_lbs <= 0 || h_ft <= 0) return;

    const mass_kg = w_lbs * LBS_TO_KG;
    const height_m = h_ft * FT_TO_M;

    // Potential energy (Joules)
    const energy_j = mass_kg * GRAVITY * height_m;
    const energy_ftlbs = energy_j * JOULES_TO_FTLBS;

    // Impact velocity: v = sqrt(2 * g * h)
    const velocity_ms = Math.sqrt(2 * GRAVITY * height_m);
    const velocity_fps = velocity_ms * 3.28084;

    // Estimated impact force (Newtons) assuming hard surface stop distance
    const force_n = energy_j / DEFAULT_STOP_DIST;
    const force_lbs = force_n * 0.224809;

    // Consequence level based on energy
    const consequence = CONSEQUENCE_LEVELS.find(c => energy_j <= c.maxEnergy) || CONSEQUENCE_LEVELS[4];

    // Exclusion zone: conservative estimate based on height and bounce factor
    // R = sqrt(2h) * 1.5 bounce factor (this is a simplified, non-proprietary model)
    const exclusion_m = Math.sqrt(2 * height_m) * 1.5;
    const exclusion_ft = exclusion_m / FT_TO_M;

    // Risk rating from matrix
    const likelihoodIdx = parseInt(formData.likelihood) - 1;
    const consequenceIdx = consequence.level - 1;
    const riskColor = RISK_MATRIX[likelihoodIdx][consequenceIdx];
    const riskLabel = RISK_LABELS[likelihoodIdx][consequenceIdx];

    setResults({
      mass_kg: mass_kg.toFixed(2),
      height_m: height_m.toFixed(2),
      energy_j: energy_j.toFixed(1),
      energy_ftlbs: energy_ftlbs.toFixed(1),
      velocity_ms: velocity_ms.toFixed(1),
      velocity_fps: velocity_fps.toFixed(1),
      force_n: force_n.toFixed(0),
      force_lbs: force_lbs.toFixed(0),
      consequence,
      exclusion_m: exclusion_m.toFixed(1),
      exclusion_ft: exclusion_ft.toFixed(1),
      riskColor,
      riskLabel,
      likelihood: parseInt(formData.likelihood),
    });
  };

  const saveToDatabase = async () => {
    try {
    if (!results || !formData.assessor_name || !formData.company || !formData.location) return;
        setSaving(true);
        const record = {
          assessor_name: formData.assessor_name,
          date: formData.date,
          company: formData.company,
          location: formData.location,
          work_area: formData.work_area,
          task_description: formData.task_description,
          object_name: formData.object_name,
          weight_lbs: parseFloat(formData.weight_lbs),
          height_ft: parseFloat(formData.height_ft),
          energy_joules: parseFloat(results.energy_j),
          energy_ftlbs: parseFloat(results.energy_ftlbs),
          impact_velocity_fps: parseFloat(results.velocity_fps),
          impact_force_lbs: parseFloat(results.force_lbs),
          consequence_level: results.consequence.level,
          consequence_label: results.consequence.label,
          likelihood_level: results.likelihood,
          likelihood_label: LIKELIHOOD_LEVELS[results.likelihood - 1].label,
          risk_rating: results.riskLabel,
          exclusion_zone_ft: parseFloat(results.exclusion_ft),
          controls: formData.controls,
          notes: formData.notes,
        };
    
        const { error } = await safeInsert('drops_calculations', [record]);
        setSaving(false);
        if (error) {
          console.error('Save error:', error);
          alert('Error saving: ' + error.message);
        } else {
          setSaved(true);
        }
    } catch(e) { console.error('saveToDatabase error:', e); }
  };

  const printReport = () => {
    if (!results) return;
    const win = window.open('', '_blank');
    if (!win) { alert('Please allow pop-ups to print.'); return; }
    const lk = LIKELIHOOD_LEVELS[results.likelihood - 1];

    let html = '<!DOCTYPE html><html><head><title>Dropped Object Assessment</title>';
    html += '<style>';
    html += 'body{font-family:Calibri,sans-serif;font-size:11pt;color:#333;margin:0;padding:30px;max-width:850px;margin:0 auto;}';
    html += '.header{text-align:center;border-bottom:3px solid #1e3a5f;padding-bottom:15px;margin-bottom:20px;}';
    html += '.header img{height:60px;}';
    html += '.header h1{font-size:18pt;color:#1e3a5f;margin:8px 0 2px;}';
    html += '.header h2{font-size:12pt;color:#b91c1c;margin:2px 0;font-weight:normal;}';
    html += '.header p{font-size:9pt;color:#666;margin:2px 0;}';
    html += '.section{margin:15px 0;padding:12px;border:1px solid #ddd;border-radius:6px;}';
    html += '.section h3{font-size:12pt;color:#1e3a5f;margin:0 0 8px;border-bottom:1px solid #e2e8f0;padding-bottom:4px;}';
    html += '.grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 20px;}';
    html += '.grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px 20px;}';
    html += '.field{font-size:10pt;}.field strong{color:#1e3a5f;}';
    html += '.risk-box{text-align:center;padding:15px;border-radius:8px;color:white;font-size:16pt;font-weight:bold;margin:10px 0;}';
    html += '.matrix{border-collapse:collapse;width:100%;margin:10px 0;}';
    html += '.matrix td,.matrix th{border:1px solid #ccc;padding:6px;text-align:center;font-size:9pt;}';
    html += '.matrix th{background:#1e3a5f;color:white;}';
    html += '.footer{text-align:center;margin-top:25px;padding-top:10px;border-top:2px solid #1e3a5f;font-size:8pt;color:#999;}';
    html += '.warn{background:#fef3c7;border:1px solid #f59e0b;padding:8px 12px;border-radius:6px;font-size:10pt;margin:8px 0;}';
    html += '@media print{body{padding:15px;}}';
    html += '</style></head><body>';

    html += '<div class="header">';
    html += '<img src="/Logo.png" alt="SLP Alaska" onerror="this.style.display=\'none\'">';
    html += '<h1>Dropped Object Energy Assessment</h1>';
    html += '<h2>SLP Alaska Safety Assessment Tool</h2>';
    html += '<p>' + formData.company + ' | ' + formData.location + (formData.work_area ? ' - ' + formData.work_area : '') + ' | ' + formData.date + '</p>';
    html += '</div>';

    html += '<button onclick="window.print()" style="background:#1e3a5f;color:white;border:none;padding:10px 30px;border-radius:6px;font-size:12pt;cursor:pointer;display:block;margin:0 auto 15px;">Print / Save PDF</button>';

    html += '<div class="section"><h3>Assessment Information</h3><div class="grid">';
    html += '<div class="field"><strong>Assessor:</strong> ' + formData.assessor_name + '</div>';
    html += '<div class="field"><strong>Date:</strong> ' + formData.date + '</div>';
    html += '<div class="field"><strong>Company:</strong> ' + formData.company + '</div>';
    html += '<div class="field"><strong>Location:</strong> ' + formData.location + '</div>';
    html += '<div class="field"><strong>Work Area:</strong> ' + (formData.work_area || 'N/A') + '</div>';
    html += '<div class="field"><strong>Task:</strong> ' + (formData.task_description || 'N/A') + '</div>';
    html += '</div></div>';

    html += '<div class="section"><h3>Object & Drop Parameters</h3><div class="grid">';
    html += '<div class="field"><strong>Object:</strong> ' + formData.object_name + '</div>';
    html += '<div class="field"><strong>Weight:</strong> ' + formData.weight_lbs + ' lbs (' + results.mass_kg + ' kg)</div>';
    html += '<div class="field"><strong>Drop Height:</strong> ' + formData.height_ft + ' ft (' + results.height_m + ' m)</div>';
    html += '</div></div>';

    html += '<div class="section"><h3>Energy & Impact Analysis</h3><div class="grid3">';
    html += '<div class="field"><strong>Potential Energy:</strong><br>' + results.energy_j + ' J (' + results.energy_ftlbs + ' ft-lbs)</div>';
    html += '<div class="field"><strong>Impact Velocity:</strong><br>' + results.velocity_fps + ' ft/s (' + results.velocity_ms + ' m/s)</div>';
    html += '<div class="field"><strong>Est. Impact Force:</strong><br>' + Number(results.force_lbs).toLocaleString() + ' lbs (' + Number(results.force_n).toLocaleString() + ' N)</div>';
    html += '</div></div>';

    html += '<div class="section"><h3>Risk Assessment</h3>';
    html += '<div class="grid">';
    html += '<div class="field"><strong>Consequence:</strong> Level ' + results.consequence.level + ' - ' + results.consequence.label + '<br><em>' + results.consequence.description + '</em></div>';
    html += '<div class="field"><strong>Likelihood:</strong> Level ' + results.likelihood + ' - ' + lk.label + '<br><em>' + lk.description + '</em></div>';
    html += '</div>';
    html += '<div class="risk-box" style="background:' + results.riskColor + '">' + results.riskLabel + ' Risk</div>';
    html += '</div>';

    html += '<div class="section"><h3>Exclusion Zone</h3>';
    html += '<div class="field"><strong>Recommended Minimum Exclusion Radius:</strong> ' + results.exclusion_ft + ' ft (' + results.exclusion_m + ' m)</div>';
    html += '<p style="font-size:9pt;color:#666;margin-top:6px;">Based on drop height with 1.5x bounce/deflection safety factor. Actual exclusion zones should account for site-specific conditions including wind, obstructions, and ricochet potential.</p>';
    html += '</div>';

    if (formData.controls) {
      html += '<div class="section"><h3>Controls & Mitigations</h3>';
      html += '<div class="field">' + formData.controls.replace(/\n/g, '<br>') + '</div></div>';
    }
    if (formData.notes) {
      html += '<div class="section"><h3>Additional Notes</h3>';
      html += '<div class="field">' + formData.notes.replace(/\n/g, '<br>') + '</div></div>';
    }

    html += '<div class="footer">';
    html += '<p>AnthroSafe\u2122 Field Driven Safety \u00A9 2026 SLP Alaska, LLC</p>';
    html += '<p>Safety \u2022 Leadership \u2022 Performance | (907) 202-3274</p>';
    html += '<p style="margin-top:6px;font-size:7pt;">Energy calculations based on standard gravitational potential energy formulas (PE=mgh). Impact force estimates assume rigid body impact. Exclusion zones are estimates only \u2014 site-specific engineering assessment may be required for critical lifts.</p>';
    html += '</div></body></html>';

    win.document.write(html);
    win.document.close();
  };

  const st = {
    container: { minHeight: '100vh', background: 'linear-gradient(135deg, #1e3a8a 0%, #475569 100%)', padding: '0 0 40px 0' },
    backBtn: { display: 'inline-block', padding: '10px 16px', color: 'white', textDecoration: 'none', fontSize: '14px', opacity: 0.9 },
    header: { textAlign: 'center', padding: '20px 20px 24px', color: 'white' },
    logoContainer: { width: '80px', height: '80px', background: 'white', borderRadius: '16px', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' },
    logo: { maxWidth: '60px', maxHeight: '60px' },
    badge: { display: 'inline-block', padding: '6px 16px', background: 'rgba(255,255,255,0.2)', borderRadius: '20px', fontSize: '13px', fontWeight: '600', letterSpacing: '1px' },
    card: { maxWidth: '800px', margin: '0 auto', background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' },
    sectionHeader: { background: 'linear-gradient(135deg, #991b1b 0%, #b91c1c 100%)', color: 'white', padding: '12px 16px', borderRadius: '8px', fontSize: '15px', fontWeight: '600', marginTop: '24px', marginBottom: '16px' },
    fieldGroup: { marginBottom: '16px' },
    label: { display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' },
    input: { width: '100%', padding: '10px 12px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', outline: 'none' },
    select: { width: '100%', padding: '10px 12px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', background: 'white' },
    textarea: { width: '100%', padding: '10px 12px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', outline: 'none', minHeight: '80px', resize: 'vertical' },
    row: { display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' },
    halfField: { flex: '1 1 200px' },
    calcBtn: { width: '100%', padding: '16px', background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', letterSpacing: '0.5px', marginTop: '16px' },
    saveBtn: { width: '100%', padding: '14px', background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', marginTop: '10px' },
    printBtn: { width: '100%', padding: '14px', background: 'linear-gradient(135deg, #991b1b 0%, #c41e3a 100%)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', marginTop: '10px' },
    resultBox: { padding: '16px', borderRadius: '12px', marginTop: '12px', border: '2px solid #e2e8f0' },
    resultLabel: { fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' },
    resultValue: { fontSize: '22px', fontWeight: '700', color: '#1e3a5f', marginTop: '2px' },
    resultSub: { fontSize: '12px', color: '#9ca3af' },
    riskBox: { textAlign: 'center', padding: '20px', borderRadius: '12px', color: 'white', marginTop: '16px' },
    tab: { padding: '10px 20px', border: 'none', borderRadius: '8px 8px 0 0', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
    presetGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px', marginBottom: '16px' },
    presetBtn: { padding: '8px 10px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', background: 'white', textAlign: 'left' },
    presetBtnActive: { padding: '8px 10px', border: '2px solid #2563eb', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', background: '#eff6ff', textAlign: 'left', color: '#1e40af', fontWeight: '600' },
    matrixCell: { padding: '8px', textAlign: 'center', fontSize: '10px', fontWeight: '600', color: 'white', border: '1px solid rgba(255,255,255,0.3)', minWidth: '60px' },
    matrixHeader: { padding: '8px', textAlign: 'center', fontSize: '10px', fontWeight: '700', background: '#1e3a5f', color: 'white', border: '1px solid #ccc' },
    footer: { textAlign: 'center', padding: '20px', color: 'rgba(255,255,255,0.7)', fontSize: '12px' },
    savedBanner: { background: '#059669', color: 'white', padding: '12px', borderRadius: '8px', textAlign: 'center', fontWeight: '600', marginTop: '10px' },
  };

  return (
    <div style={st.container}>
      <a href="/" style={st.backBtn}>{'\u2190'} Back to Portal</a>

      <div style={st.header}>
        <div style={st.logoContainer}>
          <img src="/Logo.png" alt="SLP Alaska" style={st.logo} />
        </div>
        <div style={st.badge}>{'\u{26A0}\u{FE0F}'} DROPPED OBJECT ENERGY ASSESSMENT</div>
        <p style={{ fontSize: '13px', marginTop: '8px', opacity: 0.8 }}>Energy Calculator &bull; Risk Matrix &bull; Exclusion Zone</p>
      </div>

      {/* Tabs */}
      <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', gap: '4px', paddingLeft: '24px' }}>
        <button style={{ ...st.tab, background: activeTab === 'calculator' ? 'white' : 'rgba(255,255,255,0.2)', color: activeTab === 'calculator' ? '#1e3a5f' : 'white' }} onClick={() => setActiveTab('calculator')}>
          {'\u{1F4CA}'} Calculator
        </button>
        <button style={{ ...st.tab, background: activeTab === 'matrix' ? 'white' : 'rgba(255,255,255,0.2)', color: activeTab === 'matrix' ? '#1e3a5f' : 'white' }} onClick={() => setActiveTab('matrix')}>
          {'\u{1F7E8}'} Risk Matrix
        </button>
      </div>

      <div style={st.card}>

        {/* === RISK MATRIX TAB === */}
        {activeTab === 'matrix' && (
          <div>
            <div style={st.sectionHeader}>SLP Alaska Risk Assessment Matrix</div>
            <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>Likelihood (vertical) vs Consequence (horizontal). Colors indicate risk level.</p>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr>
                    <th style={st.matrixHeader}>Likelihood / Consequence</th>
                    {CONSEQUENCE_LEVELS.map(c => (
                      <th key={c.level} style={st.matrixHeader}>{c.level}. {c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {LIKELIHOOD_LEVELS.slice().reverse().map((lk, ri) => {
                    const li = 4 - ri;
                    return (
                      <tr key={lk.level}>
                        <td style={{ ...st.matrixHeader, textAlign: 'left', fontSize: '11px' }}>{lk.level}. {lk.label}</td>
                        {CONSEQUENCE_LEVELS.map((c, ci) => (
                          <td key={ci} style={{ ...st.matrixCell, background: RISK_MATRIX[li][ci] }}>
                            {RISK_LABELS[li][ci]}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ ...st.sectionHeader, marginTop: '24px' }}>Consequence Levels (by Impact Energy)</div>
            {CONSEQUENCE_LEVELS.map(c => (
              <div key={c.level} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: c.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '13px' }}>{c.level}</div>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '13px', color: '#1e3a5f' }}>{c.label} {c.maxEnergy === Infinity ? '(> 500 J)' : '(\u2264 ' + c.maxEnergy + ' J)'}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{c.description}</div>
                </div>
              </div>
            ))}

            <div style={{ ...st.sectionHeader, marginTop: '24px' }}>Likelihood Levels</div>
            {LIKELIHOOD_LEVELS.map(lk => (
              <div key={lk.level} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#1e3a5f', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '13px' }}>{lk.level}</div>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '13px', color: '#1e3a5f' }}>{lk.label}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{lk.description}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* === CALCULATOR TAB === */}
        {activeTab === 'calculator' && (
          <div>
            <div style={st.sectionHeader}>Assessment Information</div>
            <div style={st.row}>
              <div style={st.halfField}>
                <label style={st.label}>Assessor Name *</label>
                <input style={st.input} value={formData.assessor_name} onChange={(e) => handleChange('assessor_name', e.target.value)} placeholder="Full name" />
              </div>
              <div style={st.halfField}>
                <label style={st.label}>Date *</label>
                <input type="date" style={st.input} value={formData.date} onChange={(e) => handleChange('date', e.target.value)} />
              </div>
            </div>
            <div style={st.row}>
              <div style={st.halfField}>
                <label style={st.label}>Company *</label>
                <select style={st.select} value={formData.company} onChange={(e) => handleChange('company', e.target.value)}>
                  <option value="">Select Company</option>
                  {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={st.halfField}>
                <label style={st.label}>Location *</label>
                <select style={st.select} value={formData.location} onChange={(e) => handleChange('location', e.target.value)}>
                  <option value="">Select Location</option>
                  {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
            <div style={st.row}>
              <div style={st.halfField}>
                <label style={st.label}>Work Area</label>
                <input style={st.input} value={formData.work_area} onChange={(e) => handleChange('work_area', e.target.value)} placeholder="e.g. Derrick floor, Pipe rack" />
              </div>
              <div style={st.halfField}>
                <label style={st.label}>Task Description</label>
                <input style={st.input} value={formData.task_description} onChange={(e) => handleChange('task_description', e.target.value)} placeholder="e.g. Crane operations, scaffold work" />
              </div>
            </div>

            <div style={st.sectionHeader}>Object Selection</div>
            <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>Select a common object or enter custom weight:</p>
            <div style={st.presetGrid}>
              {COMMON_OBJECTS.map(obj => (
                <button key={obj.name} style={selectedPreset === obj.name ? st.presetBtnActive : st.presetBtn} onClick={() => selectPreset(obj)}>
                  <div style={{ fontWeight: '600', fontSize: '12px' }}>{obj.name}</div>
                  {obj.weight_lbs > 0 && <div style={{ fontSize: '10px', color: '#9ca3af' }}>{obj.weight_lbs} lbs</div>}
                </button>
              ))}
            </div>
            <div style={st.row}>
              <div style={st.halfField}>
                <label style={st.label}>Object Name *</label>
                <input style={st.input} value={formData.object_name} onChange={(e) => handleChange('object_name', e.target.value)} placeholder="What could drop?" />
              </div>
              <div style={st.halfField}>
                <label style={st.label}>Weight (lbs) *</label>
                <input type="number" step="0.1" style={st.input} value={formData.weight_lbs} onChange={(e) => handleChange('weight_lbs', e.target.value)} placeholder="Weight in pounds" />
              </div>
            </div>

            <div style={st.sectionHeader}>Drop Parameters</div>
            <div style={st.row}>
              <div style={st.halfField}>
                <label style={st.label}>Drop Height (ft) *</label>
                <input type="number" step="0.5" style={st.input} value={formData.height_ft} onChange={(e) => handleChange('height_ft', e.target.value)} placeholder="Height in feet" />
              </div>
              <div style={st.halfField}>
                <label style={st.label}>Likelihood of Drop (1-5) *</label>
                <select style={st.select} value={formData.likelihood} onChange={(e) => handleChange('likelihood', e.target.value)}>
                  {LIKELIHOOD_LEVELS.map(lk => (
                    <option key={lk.level} value={lk.level}>{lk.level} - {lk.label}: {lk.description}</option>
                  ))}
                </select>
              </div>
            </div>

            <button onClick={calculate} style={st.calcBtn}>
              {'\u{1F4CA}'} Calculate Energy &amp; Risk
            </button>

            {/* === RESULTS === */}
            {results && (
              <div>
                <div style={st.sectionHeader}>{'\u26A1'} Energy &amp; Impact Results</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
                  <div style={st.resultBox}>
                    <div style={st.resultLabel}>Potential Energy</div>
                    <div style={st.resultValue}>{results.energy_j} J</div>
                    <div style={st.resultSub}>{results.energy_ftlbs} ft-lbs</div>
                  </div>
                  <div style={st.resultBox}>
                    <div style={st.resultLabel}>Impact Velocity</div>
                    <div style={st.resultValue}>{results.velocity_fps} ft/s</div>
                    <div style={st.resultSub}>{results.velocity_ms} m/s</div>
                  </div>
                  <div style={st.resultBox}>
                    <div style={st.resultLabel}>Est. Impact Force</div>
                    <div style={st.resultValue}>{Number(results.force_lbs).toLocaleString()} lbs</div>
                    <div style={st.resultSub}>{Number(results.force_n).toLocaleString()} N</div>
                  </div>
                  <div style={st.resultBox}>
                    <div style={st.resultLabel}>Exclusion Zone Radius</div>
                    <div style={st.resultValue}>{results.exclusion_ft} ft</div>
                    <div style={st.resultSub}>{results.exclusion_m} m min. radius</div>
                  </div>
                </div>

                <div style={st.sectionHeader}>{'\u{1F6E1}\u{FE0F}'} Risk Assessment</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ ...st.resultBox, borderColor: results.consequence.color }}>
                    <div style={st.resultLabel}>Consequence</div>
                    <div style={{ ...st.resultValue, color: results.consequence.color }}>Level {results.consequence.level} - {results.consequence.label}</div>
                    <div style={st.resultSub}>{results.consequence.description}</div>
                  </div>
                  <div style={st.resultBox}>
                    <div style={st.resultLabel}>Likelihood</div>
                    <div style={st.resultValue}>Level {results.likelihood} - {LIKELIHOOD_LEVELS[results.likelihood - 1].label}</div>
                    <div style={st.resultSub}>{LIKELIHOOD_LEVELS[results.likelihood - 1].description}</div>
                  </div>
                </div>

                <div style={{ ...st.riskBox, background: results.riskColor }}>
                  <div style={{ fontSize: '14px', opacity: 0.9 }}>Overall Risk Rating</div>
                  <div style={{ fontSize: '28px', fontWeight: '800', margin: '4px 0' }}>{results.riskLabel}</div>
                  <div style={{ fontSize: '12px', opacity: 0.85 }}>Consequence {results.consequence.level} x Likelihood {results.likelihood}</div>
                </div>

                <div style={st.sectionHeader}>Controls &amp; Mitigations</div>
                <div style={st.fieldGroup}>
                  <label style={st.label}>What controls are in place or recommended?</label>
                  <textarea style={st.textarea} value={formData.controls} onChange={(e) => handleChange('controls', e.target.value)} placeholder="e.g. Tool lanyards, barricades, nets, tethering, secondary retention..." />
                </div>
                <div style={st.fieldGroup}>
                  <label style={st.label}>Additional Notes</label>
                  <textarea style={st.textarea} value={formData.notes} onChange={(e) => handleChange('notes', e.target.value)} placeholder="Any additional observations or comments..." />
                </div>

                <button onClick={saveToDatabase} disabled={saving || saved || !formData.assessor_name || !formData.company || !formData.location} style={{ ...st.saveBtn, opacity: (saving || saved || !formData.assessor_name || !formData.company || !formData.location) ? 0.6 : 1 }}>
                  {saving ? '\u23F3 Saving...' : saved ? '\u2705 Saved to Database' : '\u{1F4BE} Save Assessment'}
                </button>

                {saved && <div style={st.savedBanner}>{'\u2705'} Assessment saved to AnthroSafe{'\u2122'} database</div>}

                <button onClick={printReport} style={st.printBtn}>
                  {'\u{1F5A8}\u{FE0F}'} Print / Save PDF Report
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={st.footer}>
        <div>AnthroSafe{'\u2122'} Field Driven Safety</div>
        <div>{'\u00A9'} 2026 SLP Alaska, LLC</div>
        <div style={{ marginTop: '6px', fontSize: '9px', opacity: 0.6 }}>Energy calculations use standard physics formulas (PE=mgh). Not a substitute for engineering assessment.</div>
      </div>
    </div>
  );
}

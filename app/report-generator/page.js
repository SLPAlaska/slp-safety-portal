'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://iypezirwdlqpptjpeeyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
);

const SLP_DOMAIN = '@slpalaska.com';
const REPORT_TEMPLATES = [
  { id: 'executive', name: 'Executive Summary', description: 'High-level overview for leadership', pages: '1-2' },
  { id: 'detailed', name: 'Detailed Investigation Report', description: 'Full investigation with all findings', pages: '5-10' },
  { id: 'client', name: 'Client Deliverable', description: 'Professional report for client', pages: '3-5' },
  { id: 'regulatory', name: 'Regulatory Submission', description: 'Format for OSHA/regulatory reporting', pages: '2-4' }
];
const SEVERITY_COLORS = { 'A': '#7F1D1D', 'B': '#991B1B', 'C': '#B91C1C', 'D': '#DC2626', 'E': '#F97316', 'F': '#EAB308', 'G': '#22C55E' };
const PSIF_DISPLAY = { 'SIF-Actual': { bg: '#1f2937', text: '#fff' }, 'PSIF-Critical': { bg: '#dc2626', text: '#fff' }, 'PSIF-High': { bg: '#ea580c', text: '#fff' }, 'PSIF-Elevated': { bg: '#eab308', text: '#000' }, 'STKY-Controlled': { bg: '#22c55e', text: '#fff' }, 'Non-STKY': { bg: '#3b82f6', text: '#fff' } };
const HIERARCHY_COLORS = { 1: '#166534', 2: '#15803d', 3: '#eab308', 4: '#f97316', 5: '#dc2626' };

const styles = {
  container: { minHeight: '100vh', background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)', padding: '20px' },
  wrapper: { maxWidth: '1000px', margin: '0 auto' },
  header: { background: 'linear-gradient(135deg, #991b1b 0%, #c41e3a 100%)', borderRadius: '16px 16px 0 0', padding: '25px 30px', color: 'white' },
  headerTitle: { fontSize: '28px', fontWeight: '700' },
  card: { background: '#fff', borderRadius: '0 0 16px 16px', padding: '25px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' },
  loginCard: { background: '#fff', borderRadius: '16px', padding: '40px', maxWidth: '450px', margin: '50px auto', boxShadow: '0 10px 40px rgba(0,0,0,0.2)', textAlign: 'center' },
  sectionHeader: { background: '#1e3a8a', color: 'white', padding: '12px 20px', borderRadius: '8px', fontSize: '16px', fontWeight: '600', marginBottom: '20px', marginTop: '25px' },
  templateCard: { border: '2px solid #e2e8f0', borderRadius: '12px', padding: '20px', marginBottom: '15px', cursor: 'pointer', transition: 'all 0.2s' },
  templateSelected: { borderColor: '#991b1b', background: '#fef2f2' },
  input: { width: '100%', padding: '12px 15px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box' },
  select: { width: '100%', padding: '12px 15px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '15px', background: 'white' },
  actionBtn: { padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '15px', fontWeight: '600' },
  primaryBtn: { background: 'linear-gradient(135deg, #991b1b 0%, #c41e3a 100%)', color: 'white' },
  checkbox: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', cursor: 'pointer' },
  formGroup: { marginBottom: '20px' },
  footer: { textAlign: 'center', padding: '20px', color: 'white', fontSize: '13px' },
  submitBtn: { width: '100%', padding: '14px', background: 'linear-gradient(135deg, #991b1b 0%, #c41e3a 100%)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' }
};

function isSLPTeam(email) { return email && email.toLowerCase().endsWith(SLP_DOMAIN); }
function formatDate(d) { return d ? new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '-'; }

export default function ReportGenerator() {
  const [userEmail, setUserEmail] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [incidents, setIncidents] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState('detailed');
  const [incidentData, setIncidentData] = useState(null);
  const [options, setOptions] = useState({ includeTimeline: true, includeEvidence: true, includeWitnesses: true, includeAnalysis: true, includeCAs: true, includeLessons: true });

  useEffect(() => {
    const saved = localStorage.getItem('slp_user_email');
    if (saved && isSLPTeam(saved)) { setUserEmail(saved); setIsAuthenticated(true); }
    setLoading(false);
  }, []);

  useEffect(() => { if (isAuthenticated) fetchIncidents(); }, [isAuthenticated]);

  async function fetchIncidents() {
    const { data } = await supabase.from('incidents').select('id, incident_id, brief_description, company_name, incident_date, status, investigation_type').in('status', ['Approved', 'Closed', 'Under Review - Final Review', 'Pending Approval']).order('incident_date', { ascending: false });
    setIncidents(data || []);
  }

  async function loadIncidentData(incidentId) {
    setLoading(true);
    const { data: incident } = await supabase.from('incidents').select('*').eq('id', incidentId).single();
    const { data: timeline } = await supabase.from('timeline_events').select('*').eq('incident_id', incidentId).order('sequence_number');
    const { data: evidence } = await supabase.from('investigation_evidence').select('*').eq('incident_id', incidentId).order('evidence_number');
    const { data: witnesses } = await supabase.from('witness_statements').select('*').eq('incident_id', incidentId).order('witness_number');
    const { data: localReview } = await supabase.from('local_reviews').select('*').eq('incident_id', incidentId).single();
    const { data: fiveWhy } = await supabase.from('five_why_analyses').select('*').eq('incident_id', incidentId).single();
    const { data: rca } = await supabase.from('rca_analyses').select('*').eq('incident_id', incidentId).single();
    const { data: cas } = await supabase.from('investigation_corrective_actions').select('*').eq('incident_id', incidentId).order('action_number');
    const { data: lessons } = await supabase.from('investigation_lessons_learned').select('*').eq('incident_id', incidentId).order('lesson_number');
    setIncidentData({ incident, timeline: timeline || [], evidence: evidence || [], witnesses: witnesses || [], localReview, fiveWhy, rca, cas: cas || [], lessons: lessons || [] });
    setLoading(false);
  }

  function generateReport() {
    if (!incidentData) return;
    setGenerating(true);
    const { incident, timeline, witnesses, localReview, fiveWhy, rca, cas, lessons } = incidentData;
    const psif = PSIF_DISPLAY[incident.psif_classification] || {};
    
    const html = `<!DOCTYPE html><html><head><title>Investigation Report - ${incident.incident_id}</title>
<style>
@page{margin:0.75in;size:letter}body{font-family:Arial,sans-serif;max-width:8.5in;margin:0 auto;color:#1e293b;line-height:1.6;font-size:11pt}
.cover{page-break-after:always;text-align:center;padding-top:2in}.cover-title{font-size:28pt;font-weight:bold;color:#991b1b;margin-bottom:10px}
.cover-subtitle{font-size:16pt;color:#1e3a8a;margin-bottom:40px}.cover-incident{font-size:24pt;font-weight:bold;margin:30px 0}
.cover-meta{font-size:12pt;color:#64748b}.cover-footer{position:absolute;bottom:1in;left:0;right:0;text-align:center;font-size:10pt;color:#64748b}
h1{color:#991b1b;font-size:18pt;border-bottom:3px solid #991b1b;padding-bottom:10px;margin-top:30px}
h2{color:#1e3a8a;font-size:14pt;margin-top:25px}h3{color:#475569;font-size:12pt;margin-top:20px}
.section{margin-bottom:25px}.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:15px;margin:15px 0}
.info-item{background:#f8fafc;padding:12px;border-radius:6px}.info-label{font-size:10pt;color:#64748b;text-transform:uppercase;margin-bottom:3px}
.info-value{font-weight:bold}.badge{display:inline-block;padding:4px 12px;border-radius:4px;font-size:10pt;font-weight:bold}
.timeline-item{border-left:3px solid #1e3a8a;padding-left:15px;margin-bottom:15px}
.timeline-critical{border-left-color:#dc2626;background:#fef2f2;padding:10px 15px;border-radius:0 6px 6px 0}
.ca-item{background:#f8fafc;padding:15px;border-radius:8px;margin-bottom:10px;border-left:4px solid #1e3a8a}
.lesson-item{background:#fffbeb;border:2px solid #f59e0b;padding:15px;border-radius:8px;margin-bottom:10px}
.takeaway{background:#fef3c7;padding:10px;border-radius:6px;margin-top:10px}
.why-item{padding:15px;background:#f8fafc;border-radius:8px;margin-bottom:10px;margin-left:20px;border-left:4px solid #991b1b}
.witness-item{background:#f8fafc;padding:15px;border-radius:8px;margin-bottom:10px}
.footer{margin-top:40px;padding-top:20px;border-top:2px solid #e2e8f0;text-align:center;font-size:9pt;color:#64748b}
table{width:100%;border-collapse:collapse;margin:15px 0}th{background:#1e3a8a;color:white;padding:10px;text-align:left;font-size:10pt}
td{padding:10px;border-bottom:1px solid #e2e8f0;font-size:10pt}.page-break{page-break-before:always}
</style></head><body>
<div class="cover">
<div class="cover-title">INCIDENT INVESTIGATION REPORT</div>
<div class="cover-subtitle">${selectedTemplate === 'executive' ? 'Executive Summary' : selectedTemplate === 'client' ? 'Client Report' : 'Detailed Investigation'}</div>
<div class="cover-incident">${incident.incident_id}</div>
<div class="cover-meta">
<p><strong>Company:</strong> ${incident.company_name || 'N/A'}</p>
<p><strong>Location:</strong> ${incident.location_name || 'N/A'}</p>
<p><strong>Date:</strong> ${formatDate(incident.incident_date)}</p>
<p><strong>Type:</strong> ${incident.investigation_type || 'N/A'}</p>
</div>
<div class="cover-footer"><strong>CONFIDENTIAL</strong><br>AnthroSafe™ Powered by Field Driven Data™ | © 2026 SLP Alaska, LLC</div>
</div>

<h1>1. Executive Summary</h1>
<div class="section">
<div class="info-grid">
<div class="info-item"><div class="info-label">Incident ID</div><div class="info-value">${incident.incident_id}</div></div>
<div class="info-item"><div class="info-label">Date & Time</div><div class="info-value">${formatDate(incident.incident_date)} ${incident.incident_time || ''}</div></div>
<div class="info-item"><div class="info-label">Company</div><div class="info-value">${incident.company_name || 'N/A'}</div></div>
<div class="info-item"><div class="info-label">Location</div><div class="info-value">${incident.location_name || 'N/A'}</div></div>
<div class="info-item"><div class="info-label">Severity</div><div class="info-value"><span class="badge" style="background:${SEVERITY_COLORS[incident.safety_severity] || '#64748b'};color:white">${incident.safety_severity || 'N/A'}</span></div></div>
<div class="info-item"><div class="info-label">PSIF Classification</div><div class="info-value"><span class="badge" style="background:${psif.bg || '#64748b'};color:${psif.text || '#fff'}">${incident.psif_classification || 'N/A'}</span></div></div>
</div>
<h2>Description</h2>
<p>${incident.brief_description || ''}</p>
${incident.detailed_description ? `<p>${incident.detailed_description}</p>` : ''}
</div>

${options.includeTimeline && timeline.length > 0 && selectedTemplate !== 'executive' ? `
<h1 class="page-break">2. Event Timeline</h1>
<div class="section">
${timeline.map(t => `<div class="timeline-item ${t.is_critical_event ? 'timeline-critical' : ''}">
<div style="font-size:10pt;color:#64748b">${formatDate(t.event_date)} ${t.event_time || ''} ${t.is_critical_event ? '⚠️ CRITICAL' : ''}</div>
<p style="margin:5px 0 0">${t.event_description}</p>
</div>`).join('')}
</div>` : ''}

${options.includeWitnesses && witnesses.length > 0 && selectedTemplate !== 'executive' ? `
<h1>3. Witness Statements</h1>
<div class="section">
${witnesses.map(w => `<div class="witness-item">
<strong>${w.witness_name}</strong> ${w.position_role ? `- ${w.position_role}` : ''} ${w.company ? `(${w.company})` : ''}
<p style="margin:10px 0 0">${w.statement_summary}</p>
</div>`).join('')}
</div>` : ''}

${options.includeAnalysis ? `
<h1 class="page-break">${selectedTemplate === 'executive' ? '2' : '4'}. Root Cause Analysis</h1>
<div class="section">
<p><strong>Investigation Type:</strong> ${incident.investigation_type}</p>
${incident.investigation_type === 'Local Review' && localReview ? `
<h2>Local Review</h2>
<h3>Post-Incident Actions</h3><p>${localReview.post_incident_actions || 'None'}</p>
<h3>What Would Be Done Differently</h3><p>${localReview.do_over_response || 'None'}</p>
` : ''}
${incident.investigation_type === '5-Why Analysis' && fiveWhy ? `
<h2>5-Why Analysis</h2>
${fiveWhy.why_1_answer ? `<div class="why-item"><strong>Why 1:</strong> ${fiveWhy.why_1_answer}</div>` : ''}
${fiveWhy.why_2_answer ? `<div class="why-item"><strong>Why 2:</strong> ${fiveWhy.why_2_answer}</div>` : ''}
${fiveWhy.why_3_answer ? `<div class="why-item"><strong>Why 3:</strong> ${fiveWhy.why_3_answer}</div>` : ''}
${fiveWhy.why_4_answer ? `<div class="why-item"><strong>Why 4:</strong> ${fiveWhy.why_4_answer}</div>` : ''}
${fiveWhy.why_5_answer ? `<div class="why-item"><strong>Why 5:</strong> ${fiveWhy.why_5_answer}</div>` : ''}
<h3>Root Cause</h3><p><strong>Category:</strong> ${fiveWhy.root_cause_category_name || 'N/A'}</p><p>${fiveWhy.root_cause_identified || 'None'}</p>
` : ''}
${incident.investigation_type === 'Root Cause Analysis' && rca ? `
<h2>Comprehensive RCA</h2>
<h3>Problem Statement</h3><p>${rca.problem_statement || 'None'}</p>
<h3>Contributing Factors</h3>
<table><tr><th>Category</th><th>Findings</th></tr>
${rca.equipment_factors ? `<tr><td>Equipment</td><td>${rca.equipment_factors}</td></tr>` : ''}
${rca.procedure_factors ? `<tr><td>Procedures</td><td>${rca.procedure_factors}</td></tr>` : ''}
${rca.training_factors ? `<tr><td>Training</td><td>${rca.training_factors}</td></tr>` : ''}
${rca.human_factors ? `<tr><td>Human Factors</td><td>${rca.human_factors}</td></tr>` : ''}
${rca.communication_factors ? `<tr><td>Communication</td><td>${rca.communication_factors}</td></tr>` : ''}
${rca.organizational_factors ? `<tr><td>Organizational</td><td>${rca.organizational_factors}</td></tr>` : ''}
</table>
<h3>Root Causes</h3><p>${rca.root_causes_identified || 'None'}</p>
${rca.systemic_issues ? `<h3>Systemic Issues</h3><p>${rca.systemic_issues}</p>` : ''}
` : ''}
</div>` : ''}

${options.includeCAs && cas.length > 0 ? `
<h1 class="page-break">${selectedTemplate === 'executive' ? '3' : '5'}. Corrective Actions</h1>
<div class="section">
${cas.map(ca => {
  const lvl = parseInt(ca.hierarchy_control?.charAt(0)) || 5;
  return `<div class="ca-item" style="border-left-color:${HIERARCHY_COLORS[lvl] || '#1e3a8a'}">
<div style="display:flex;justify-content:space-between;margin-bottom:8px">
<span style="font-weight:bold">CA-${ca.action_number}</span>
<span class="badge" style="background:${HIERARCHY_COLORS[lvl]};color:white">${ca.hierarchy_control}</span>
</div>
<p>${ca.action_description}</p>
<p style="font-size:10pt;color:#64748b"><strong>Owner:</strong> ${ca.action_owner_name || 'TBD'} | <strong>Due:</strong> ${formatDate(ca.target_date)} | <strong>Status:</strong> ${ca.action_status}</p>
</div>`;
}).join('')}
</div>` : ''}

${options.includeLessons && lessons.length > 0 ? `
<h1>${selectedTemplate === 'executive' ? '4' : '6'}. Lessons Learned</h1>
<div class="section">
${lessons.map(l => `<div class="lesson-item">
<strong>💡 ${l.lesson_title}</strong>
<p>${l.lesson_description}</p>
${l.key_takeaway ? `<div class="takeaway"><strong>Key Takeaway:</strong> ${l.key_takeaway}</div>` : ''}
</div>`).join('')}
</div>` : ''}

<div class="footer">
<p><strong>Report Generated:</strong> ${formatDate(new Date())} by ${userEmail}</p>
<p><strong>AnthroSafe™ Powered by Field Driven Data™</strong></p>
<p>© 2026 SLP Alaska, LLC. All rights reserved.</p>
</div>
</body></html>`;

    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    setGenerating(false);
    alert('Report generated! Use Print (Ctrl+P) to save as PDF.');
  }

  function handleLogin(e) {
    e.preventDefault();
    if (!loginEmail) { setLoginError('Enter email'); return; }
    if (!isSLPTeam(loginEmail)) { setLoginError('Access restricted to @slpalaska.com'); return; }
    localStorage.setItem('slp_user_email', loginEmail.toLowerCase());
    setUserEmail(loginEmail.toLowerCase());
    setIsAuthenticated(true);
  }

  if (!isAuthenticated) {
    return (
      <div style={styles.container}><div style={styles.wrapper}>
        <a href="/" style={{ display: 'inline-block', marginBottom: '15px', padding: '10px 20px', backgroundColor: '#1e3a5f', color: '#fff', textDecoration: 'none', borderRadius: '6px' }}>← Back to Portal</a>
        <div style={styles.loginCard}>
          <img src="/Logo.png" alt="SLP Alaska" style={{ maxWidth: '200px', margin: '0 auto 25px', display: 'block' }} />
          <h1 style={{ color: '#1e293b', marginBottom: '10px', fontSize: '24px' }}>Report Generator</h1>
          <p style={{ color: '#64748b', marginBottom: '30px' }}>Generate professional investigation reports</p>
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
    <div style={styles.container}><div style={styles.wrapper}>
      <a href="/" style={{ display: 'inline-block', marginBottom: '15px', padding: '10px 20px', backgroundColor: '#1e3a5f', color: '#fff', textDecoration: 'none', borderRadius: '6px' }}>← Back to Portal</a>
      <div style={styles.header}>
        <div><img src="/Logo.png" alt="SLP Alaska" style={{ maxWidth: '150px', marginBottom: '10px' }} />
        <div style={styles.headerTitle}>📄 Report Generator</div>
        <div style={{ fontSize: '14px', opacity: 0.9, marginTop: '5px' }}>Generate professional investigation reports</div></div>
      </div>
      <div style={styles.card}>
        <div style={styles.sectionHeader}>Step 1: Select Investigation</div>
        <div style={styles.formGroup}>
          <select value={selectedIncident || ''} onChange={(e) => { setSelectedIncident(e.target.value); if (e.target.value) loadIncidentData(e.target.value); }} style={styles.select}>
            <option value="">-- Select an Investigation --</option>
            {incidents.map(i => <option key={i.id} value={i.id}>{i.incident_id} - {i.company_name} - {formatDate(i.incident_date)} ({i.status})</option>)}
          </select>
        </div>

        <div style={styles.sectionHeader}>Step 2: Select Template</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px' }}>
          {REPORT_TEMPLATES.map(t => (
            <div key={t.id} onClick={() => setSelectedTemplate(t.id)} style={{ ...styles.templateCard, ...(selectedTemplate === t.id ? styles.templateSelected : {}) }}>
              <div style={{ fontWeight: '700', marginBottom: '5px' }}>{t.name}</div>
              <div style={{ fontSize: '13px', color: '#64748b' }}>{t.description}</div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '5px' }}>~{t.pages} pages</div>
            </div>
          ))}
        </div>

        <div style={styles.sectionHeader}>Step 3: Report Options</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
          {[{ key: 'includeTimeline', label: 'Timeline' }, { key: 'includeWitnesses', label: 'Witnesses' }, { key: 'includeAnalysis', label: 'Root Cause Analysis' }, { key: 'includeCAs', label: 'Corrective Actions' }, { key: 'includeLessons', label: 'Lessons Learned' }].map(o => (
            <label key={o.key} style={styles.checkbox}>
              <input type="checkbox" checked={options[o.key]} onChange={() => setOptions(p => ({ ...p, [o.key]: !p[o.key] }))} style={{ width: '18px', height: '18px' }} />
              Include {o.label}
            </label>
          ))}
        </div>

        <div style={{ marginTop: '30px', textAlign: 'center' }}>
          <button onClick={generateReport} disabled={!incidentData || generating} style={{ ...styles.actionBtn, ...styles.primaryBtn, padding: '15px 40px', fontSize: '16px', opacity: !incidentData || generating ? 0.5 : 1 }}>
            {generating ? '⏳ Generating...' : '📄 Generate Report'}
          </button>
          <p style={{ color: '#64748b', fontSize: '13px', marginTop: '10px' }}>Opens in new window. Use Print → Save as PDF.</p>
        </div>
      </div>
      <div style={styles.footer}><strong>AnthroSafe™ Powered by Field Driven Data™</strong><br/>© 2026 SLP Alaska, LLC</div>
    </div></div>
  );
}

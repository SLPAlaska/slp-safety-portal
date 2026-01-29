'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://iypezirwdlqpptjpeeyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
);

const SLP_DOMAIN = '@slpalaska.com';

const ROOT_CAUSE_CATEGORIES = [
  { id: 'human', name: 'Human Factors' },
  { id: 'equipment', name: 'Equipment/Machinery' },
  { id: 'environmental', name: 'Environmental' },
  { id: 'organizational', name: 'Organizational' },
  { id: 'procedural', name: 'Procedural' },
  { id: 'design', name: 'Design/Engineering' },
  { id: 'communication', name: 'Communication' },
  { id: 'training', name: 'Training/Competency' },
  { id: 'supervision', name: 'Supervision' },
  { id: 'external', name: 'External Factors' }
];

const HIERARCHY_OF_CONTROLS = [
  { level: 1, name: 'Elimination', description: 'Physically remove the hazard', color: '#166534' },
  { level: 2, name: 'Substitution', description: 'Replace with less hazardous', color: '#15803d' },
  { level: 3, name: 'Engineering Controls', description: 'Isolate people from hazard', color: '#eab308' },
  { level: 4, name: 'Administrative Controls', description: 'Change how people work', color: '#f97316' },
  { level: 5, name: 'PPE', description: 'Protect the worker', color: '#dc2626' }
];

const PSIF_DISPLAY = {
  'SIF-Actual': { bg: '#1f2937', text: '#fff', icon: '⚫' },
  'PSIF-Critical': { bg: '#dc2626', text: '#fff', icon: '🔴' },
  'PSIF-High': { bg: '#ea580c', text: '#fff', icon: '🟠' },
  'PSIF-Elevated': { bg: '#eab308', text: '#000', icon: '🟡' },
  'STKY-Controlled': { bg: '#22c55e', text: '#fff', icon: '🟢' },
  'Non-STKY': { bg: '#3b82f6', text: '#fff', icon: '🔵' }
};

const SEVERITY_COLORS = { 'A': '#7F1D1D', 'B': '#991B1B', 'C': '#B91C1C', 'D': '#DC2626', 'E': '#F97316', 'F': '#EAB308', 'G': '#22C55E' };

const TABS = [
  { id: 'overview', label: '📋 Overview' },
  { id: 'timeline', label: '⏱️ Timeline' },
  { id: 'evidence', label: '📷 Evidence' },
  { id: 'witnesses', label: '👥 Witnesses' },
  { id: 'analysis', label: '🔍 Analysis' },
  { id: 'actions', label: '✅ Corrective Actions' },
  { id: 'lessons', label: '💡 Lessons Learned' },
  { id: 'review', label: '📝 Review & Approve' }
];

const styles = {
  container: { minHeight: '100vh', background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)', padding: '20px' },
  wrapper: { maxWidth: '1200px', margin: '0 auto' },
  header: { background: 'linear-gradient(135deg, #991b1b 0%, #c41e3a 100%)', borderRadius: '16px 16px 0 0', padding: '20px 25px', color: 'white' },
  card: { background: '#fff', borderRadius: '0 0 16px 16px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' },
  tabNav: { display: 'flex', borderBottom: '2px solid #e2e8f0', overflowX: 'auto', background: '#f8fafc' },
  tab: { padding: '15px 20px', cursor: 'pointer', fontWeight: '600', fontSize: '14px', color: '#64748b', borderBottom: '3px solid transparent', whiteSpace: 'nowrap' },
  tabActive: { color: '#991b1b', borderBottomColor: '#991b1b', background: 'white' },
  tabContent: { padding: '25px' },
  sectionHeader: { background: '#1e3a8a', color: 'white', padding: '12px 20px', borderRadius: '8px', fontSize: '16px', fontWeight: '600', marginBottom: '20px' },
  formGroup: { marginBottom: '20px' },
  label: { display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1e293b', fontSize: '14px' },
  input: { width: '100%', padding: '12px 15px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box' },
  select: { width: '100%', padding: '12px 15px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '15px', background: 'white' },
  textarea: { width: '100%', padding: '12px 15px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '15px', minHeight: '100px', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
  row3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' },
  infoBox: { background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', padding: '15px', marginBottom: '20px', fontSize: '14px', color: '#0369a1' },
  actionBtn: { padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
  primaryBtn: { background: 'linear-gradient(135deg, #991b1b 0%, #c41e3a 100%)', color: 'white' },
  secondaryBtn: { background: '#1e3a8a', color: 'white' },
  outlineBtn: { background: 'white', color: '#1e3a8a', border: '2px solid #1e3a8a' },
  badge: { display: 'inline-block', padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' },
  whyCard: { background: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: '12px', padding: '20px', marginBottom: '15px' },
  whyNumber: { width: '40px', height: '40px', borderRadius: '50%', background: '#991b1b', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '18px', marginBottom: '10px' },
  timelineItem: { display: 'flex', gap: '15px', marginBottom: '20px' },
  timelineDot: { width: '16px', height: '16px', borderRadius: '50%', background: '#1e3a8a', flexShrink: 0, marginTop: '4px' },
  timelineContent: { flex: 1, background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' },
  caCard: { border: '2px solid #e2e8f0', borderRadius: '12px', padding: '20px', marginBottom: '15px' },
  witnessCard: { border: '2px solid #e2e8f0', borderRadius: '12px', padding: '20px', marginBottom: '15px', background: '#fafafa' },
  footer: { textAlign: 'center', padding: '20px', color: 'white', fontSize: '13px' },
  loginCard: { background: '#fff', borderRadius: '16px', padding: '40px', maxWidth: '450px', margin: '50px auto', boxShadow: '0 10px 40px rgba(0,0,0,0.2)', textAlign: 'center' },
  submitBtn: { width: '100%', padding: '14px', background: 'linear-gradient(135deg, #991b1b 0%, #c41e3a 100%)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' }
};

function isSLPTeam(email) { return email && email.toLowerCase().endsWith(SLP_DOMAIN); }
function formatDate(d) { return d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'; }

export default function InvestigationWorkbench({ params }) {
  const incidentId = params?.id;
  const [userEmail, setUserEmail] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginError, setLoginError] = useState('');
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [localReview, setLocalReview] = useState(null);
  const [fiveWhy, setFiveWhy] = useState(null);
  const [rcaAnalysis, setRcaAnalysis] = useState(null);
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [witnesses, setWitnesses] = useState([]);
  const [correctiveActions, setCorrectiveActions] = useState([]);
  const [lessonsLearned, setLessonsLearned] = useState([]);
  const [newTimelineEvent, setNewTimelineEvent] = useState({ event_date: '', event_time: '', event_description: '', is_critical_event: false });
  const [newWitness, setNewWitness] = useState({ witness_name: '', position_role: '', company: '', statement_summary: '' });
  const [newCA, setNewCA] = useState({ action_description: '', action_owner_name: '', action_owner_email: '', target_date: '', hierarchy_control: '' });
  const [newLesson, setNewLesson] = useState({ lesson_title: '', lesson_description: '', key_takeaway: '' });
  const [whyAnswers, setWhyAnswers] = useState({ why_1_answer: '', why_2_answer: '', why_3_answer: '', why_4_answer: '', why_5_answer: '', root_cause_category: '', root_cause_identified: '' });
  const [rcaData, setRcaData] = useState({ problem_statement: '', equipment_factors: '', procedure_factors: '', training_factors: '', human_factors: '', communication_factors: '', supervision_factors: '', design_factors: '', maintenance_factors: '', environmental_factors: '', organizational_factors: '', root_causes_identified: '', systemic_issues: '', recommendations: '' });
  const [localReviewData, setLocalReviewData] = useState({ post_incident_actions: '', do_over_response: '', reviewed_by_name: '', supervisor_name: '', safety_rep_name: '' });

  useEffect(() => {
    const saved = localStorage.getItem('slp_user_email');
    if (saved && isSLPTeam(saved)) { setUserEmail(saved); setIsAuthenticated(true); }
    setLoading(false);
  }, []);

  useEffect(() => { if (isAuthenticated && incidentId) fetchIncidentData(); }, [isAuthenticated, incidentId]);

  async function fetchIncidentData() {
    setLoading(true);
    try {
      const { data: inc } = await supabase.from('incidents').select('*').eq('id', incidentId).single();
      setIncident(inc);
      const [{ data: lr }, { data: fw }, { data: rca }, { data: tl }, { data: ev }, { data: wi }, { data: ca }, { data: ll }] = await Promise.all([
        supabase.from('local_reviews').select('*').eq('incident_id', incidentId).maybeSingle(),
        supabase.from('five_why_analyses').select('*').eq('incident_id', incidentId).maybeSingle(),
        supabase.from('rca_analyses').select('*').eq('incident_id', incidentId).maybeSingle(),
        supabase.from('timeline_events').select('*').eq('incident_id', incidentId).order('sequence_number'),
        supabase.from('investigation_evidence').select('*').eq('incident_id', incidentId).order('evidence_number'),
        supabase.from('witness_statements').select('*').eq('incident_id', incidentId).order('witness_number'),
        supabase.from('investigation_corrective_actions').select('*').eq('incident_id', incidentId).order('action_number'),
        supabase.from('investigation_lessons_learned').select('*').eq('incident_id', incidentId).order('lesson_number')
      ]);
      setLocalReview(lr); setFiveWhy(fw); setRcaAnalysis(rca);
      setTimelineEvents(tl || []); setEvidence(ev || []); setWitnesses(wi || []);
      setCorrectiveActions(ca || []); setLessonsLearned(ll || []);
      if (lr) setLocalReviewData({ post_incident_actions: lr.post_incident_actions || '', do_over_response: lr.do_over_response || '', reviewed_by_name: lr.reviewed_by_name || '', supervisor_name: lr.supervisor_name || '', safety_rep_name: lr.safety_rep_name || '' });
      if (fw) setWhyAnswers({ why_1_answer: fw.why_1_answer || '', why_2_answer: fw.why_2_answer || '', why_3_answer: fw.why_3_answer || '', why_4_answer: fw.why_4_answer || '', why_5_answer: fw.why_5_answer || '', root_cause_category: fw.root_cause_category_name || '', root_cause_identified: fw.root_cause_identified || '' });
      if (rca) setRcaData(rca);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function saveLocalReview() {
    setSaving(true);
    try {
      const data = { incident_id: incidentId, ...localReviewData, status: 'Draft', updated_by_email: userEmail };
      if (localReview) await supabase.from('local_reviews').update(data).eq('id', localReview.id);
      else { const { data: n } = await supabase.from('local_reviews').insert({ ...data, created_by_email: userEmail }).select().single(); setLocalReview(n); }
      alert('Local Review saved!');
    } catch (e) { alert('Error: ' + e.message); }
    setSaving(false);
  }

  async function saveFiveWhy() {
    setSaving(true);
    try {
      const data = { incident_id: incidentId, why_1_question: 'Why did this incident occur?', why_1_answer: whyAnswers.why_1_answer, why_2_answer: whyAnswers.why_2_answer, why_3_answer: whyAnswers.why_3_answer, why_4_answer: whyAnswers.why_4_answer, why_5_answer: whyAnswers.why_5_answer, root_cause_category_name: whyAnswers.root_cause_category, root_cause_identified: whyAnswers.root_cause_identified, status: 'Draft', analyzed_by_email: userEmail };
      if (fiveWhy) await supabase.from('five_why_analyses').update(data).eq('id', fiveWhy.id);
      else { const { data: n } = await supabase.from('five_why_analyses').insert(data).select().single(); setFiveWhy(n); }
      await supabase.from('incidents').update({ root_causes_count: whyAnswers.root_cause_identified ? 1 : 0 }).eq('id', incidentId);
      alert('5-Why saved!');
    } catch (e) { alert('Error: ' + e.message); }
    setSaving(false);
  }

  async function saveRCA() {
    setSaving(true);
    try {
      const data = { incident_id: incidentId, ...rcaData, status: 'Draft', completed_by_email: userEmail };
      if (rcaAnalysis) await supabase.from('rca_analyses').update(data).eq('id', rcaAnalysis.id);
      else { const { data: n } = await supabase.from('rca_analyses').insert(data).select().single(); setRcaAnalysis(n); }
      alert('RCA saved!');
    } catch (e) { alert('Error: ' + e.message); }
    setSaving(false);
  }

  async function addTimelineEvent() {
    if (!newTimelineEvent.event_description) { alert('Enter description'); return; }
    const num = timelineEvents.length + 1;
    const { data } = await supabase.from('timeline_events').insert({ incident_id: incidentId, sequence_number: num, ...newTimelineEvent, created_by_email: userEmail }).select().single();
    setTimelineEvents([...timelineEvents, data]);
    setNewTimelineEvent({ event_date: '', event_time: '', event_description: '', is_critical_event: false });
    await supabase.from('incidents').update({ timeline_event_count: num, timeline_developed: true }).eq('id', incidentId);
  }

  async function addWitness() {
    if (!newWitness.witness_name || !newWitness.statement_summary) { alert('Enter name and statement'); return; }
    const num = witnesses.length + 1;
    const { data } = await supabase.from('witness_statements').insert({ incident_id: incidentId, witness_number: num, ...newWitness, created_by_email: userEmail }).select().single();
    setWitnesses([...witnesses, data]);
    setNewWitness({ witness_name: '', position_role: '', company: '', statement_summary: '' });
    await supabase.from('incidents').update({ witness_count: num }).eq('id', incidentId);
  }

  async function addCorrectiveAction() {
    if (!newCA.action_description || !newCA.target_date || !newCA.hierarchy_control) { alert('Fill required fields'); return; }
    const num = correctiveActions.length + 1;
    const { data } = await supabase.from('investigation_corrective_actions').insert({ incident_id: incidentId, action_number: num, ...newCA, action_status: 'Open', created_by_email: userEmail }).select().single();
    setCorrectiveActions([...correctiveActions, data]);
    setNewCA({ action_description: '', action_owner_name: '', action_owner_email: '', target_date: '', hierarchy_control: '' });
    await supabase.from('incidents').update({ corrective_actions_count: num }).eq('id', incidentId);
  }

  async function addLesson() {
    if (!newLesson.lesson_title || !newLesson.lesson_description) { alert('Enter title and description'); return; }
    const num = lessonsLearned.length + 1;
    const { data } = await supabase.from('investigation_lessons_learned').insert({ incident_id: incidentId, lesson_number: num, ...newLesson, added_by_email: userEmail }).select().single();
    setLessonsLearned([...lessonsLearned, data]);
    setNewLesson({ lesson_title: '', lesson_description: '', key_takeaway: '' });
    await supabase.from('incidents').update({ lessons_learned_count: num }).eq('id', incidentId);
  }

  async function updateStatus(newStatus) {
    await supabase.from('incidents').update({ status: newStatus, updated_by_email: userEmail }).eq('id', incidentId);
    setIncident({ ...incident, status: newStatus });
    alert('Status updated to: ' + newStatus);
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
      <div style={styles.container}>
        <div style={styles.wrapper}>
          <a href="/" style={{ display: 'inline-block', marginBottom: '15px', padding: '10px 20px', backgroundColor: '#1e3a5f', color: '#fff', textDecoration: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '500' }}>← Back to Portal</a>
          <div style={styles.loginCard}>
            <img src="/Logo.png" alt="SLP Alaska" style={{ maxWidth: '200px', margin: '0 auto 25px', display: 'block' }} />
            <h1 style={{ color: '#1e293b', marginBottom: '10px', fontSize: '24px' }}>Investigation Workbench</h1>
            <p style={{ color: '#64748b', marginBottom: '30px' }}>Sign in with your SLP Alaska email</p>
            <form onSubmit={handleLogin}>
              <input type="email" placeholder="your.name@slpalaska.com" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} style={styles.input} />
              {loginError && <p style={{ color: '#dc2626', fontSize: '14px', marginBottom: '15px' }}>{loginError}</p>}
              <button type="submit" style={styles.submitBtn}>Sign In</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (loading) return <div style={styles.container}><div style={{ textAlign: 'center', padding: '100px', color: 'white' }}><p>Loading...</p></div></div>;
  if (!incident) return <div style={styles.container}><div style={styles.wrapper}><a href="/investigation-dashboard" style={{ display: 'inline-block', marginBottom: '15px', padding: '10px 20px', backgroundColor: '#1e3a5f', color: '#fff', textDecoration: 'none', borderRadius: '6px' }}>← Back to Dashboard</a><div style={styles.loginCard}><h2 style={{ color: '#dc2626' }}>Incident Not Found</h2></div></div></div>;

  const psifDisplay = PSIF_DISPLAY[incident.psif_classification] || {};

  return (
    <div style={styles.container}>
      <div style={styles.wrapper}>
        <a href="/investigation-dashboard" style={{ display: 'inline-block', marginBottom: '15px', padding: '10px 20px', backgroundColor: '#1e3a5f', color: '#fff', textDecoration: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '500' }}>← Back to Dashboard</a>
        
        <div style={styles.header}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '15px' }}>
            <div>
              <div style={{ fontSize: '28px', fontWeight: '700' }}>{incident.incident_id}</div>
              <div style={{ marginTop: '5px', opacity: 0.9 }}>{incident.brief_description}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              {incident.safety_severity && <span style={{ ...styles.badge, background: SEVERITY_COLORS[incident.safety_severity], color: 'white', marginRight: '10px' }}>Severity {incident.safety_severity}</span>}
              {incident.psif_classification && <span style={{ ...styles.badge, background: psifDisplay.bg, color: psifDisplay.text }}>{psifDisplay.icon} {incident.psif_classification}</span>}
              <div style={{ fontSize: '14px', marginTop: '10px' }}><strong>{incident.investigation_type}</strong> | Due: {formatDate(incident.investigation_deadline)}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '20px', marginTop: '15px', fontSize: '14px', opacity: 0.95, flexWrap: 'wrap' }}>
            <span>📅 {formatDate(incident.incident_date)}</span>
            <span>🏢 {incident.company_name}</span>
            <span>📍 {incident.location_name}</span>
            <span>👤 {incident.team_leader_name || 'Unassigned'}</span>
            <span style={{ padding: '2px 10px', background: 'rgba(255,255,255,0.2)', borderRadius: '10px' }}>{incident.status}</span>
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.tabNav}>
            {TABS.map(tab => (
              <div key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ ...styles.tab, ...(activeTab === tab.id ? styles.tabActive : {}) }}>{tab.label}</div>
            ))}
          </div>

          <div style={styles.tabContent}>
            {activeTab === 'overview' && (
              <div>
                <div style={styles.sectionHeader}>📋 Incident Overview</div>
                <div style={styles.row}>
                  <div><p><strong>Date:</strong> {formatDate(incident.incident_date)} {incident.incident_time}</p><p><strong>Location:</strong> {incident.location_name}</p><p><strong>Company:</strong> {incident.company_name}</p></div>
                  <div><p><strong>Reported By:</strong> {incident.reported_by_name}</p><p><strong>Types:</strong> {incident.incident_types_text || '-'}</p></div>
                </div>
                <div style={styles.formGroup}><label style={styles.label}>Description</label><p style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px' }}>{incident.brief_description}</p></div>
                {incident.detailed_description && <div style={styles.formGroup}><label style={styles.label}>Details</label><p style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', whiteSpace: 'pre-wrap' }}>{incident.detailed_description}</p></div>}
                <div style={styles.sectionHeader}>📊 Progress</div>
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                  <div style={{ padding: '15px 20px', background: '#f8fafc', borderRadius: '8px', textAlign: 'center' }}><div style={{ fontSize: '24px', fontWeight: '700', color: '#1e3a8a' }}>{timelineEvents.length}</div><div style={{ fontSize: '12px', color: '#64748b' }}>Timeline</div></div>
                  <div style={{ padding: '15px 20px', background: '#f8fafc', borderRadius: '8px', textAlign: 'center' }}><div style={{ fontSize: '24px', fontWeight: '700', color: '#1e3a8a' }}>{evidence.length}</div><div style={{ fontSize: '12px', color: '#64748b' }}>Evidence</div></div>
                  <div style={{ padding: '15px 20px', background: '#f8fafc', borderRadius: '8px', textAlign: 'center' }}><div style={{ fontSize: '24px', fontWeight: '700', color: '#1e3a8a' }}>{witnesses.length}</div><div style={{ fontSize: '12px', color: '#64748b' }}>Witnesses</div></div>
                  <div style={{ padding: '15px 20px', background: '#f8fafc', borderRadius: '8px', textAlign: 'center' }}><div style={{ fontSize: '24px', fontWeight: '700', color: '#1e3a8a' }}>{correctiveActions.length}</div><div style={{ fontSize: '12px', color: '#64748b' }}>Actions</div></div>
                  <div style={{ padding: '15px 20px', background: '#f8fafc', borderRadius: '8px', textAlign: 'center' }}><div style={{ fontSize: '24px', fontWeight: '700', color: '#1e3a8a' }}>{lessonsLearned.length}</div><div style={{ fontSize: '12px', color: '#64748b' }}>Lessons</div></div>
                </div>
              </div>
            )}

            {activeTab === 'timeline' && (
              <div>
                <div style={styles.sectionHeader}>⏱️ Event Timeline</div>
                <div style={styles.infoBox}>Build a chronological sequence of events. Mark critical events that directly contributed to the incident.</div>
                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '25px' }}>
                  <h4 style={{ marginTop: 0 }}>Add Event</h4>
                  <div style={styles.row3}>
                    <div style={styles.formGroup}><label style={styles.label}>Date</label><input type="date" value={newTimelineEvent.event_date} onChange={(e) => setNewTimelineEvent({ ...newTimelineEvent, event_date: e.target.value })} style={styles.input} /></div>
                    <div style={styles.formGroup}><label style={styles.label}>Time</label><input type="time" value={newTimelineEvent.event_time} onChange={(e) => setNewTimelineEvent({ ...newTimelineEvent, event_time: e.target.value })} style={styles.input} /></div>
                    <div style={styles.formGroup}><label style={styles.label}>Critical?</label><label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px' }}><input type="checkbox" checked={newTimelineEvent.is_critical_event} onChange={(e) => setNewTimelineEvent({ ...newTimelineEvent, is_critical_event: e.target.checked })} /> Yes</label></div>
                  </div>
                  <div style={styles.formGroup}><label style={styles.label}>Description *</label><textarea value={newTimelineEvent.event_description} onChange={(e) => setNewTimelineEvent({ ...newTimelineEvent, event_description: e.target.value })} placeholder="What happened..." style={styles.textarea} /></div>
                  <button onClick={addTimelineEvent} style={{ ...styles.actionBtn, ...styles.primaryBtn }}>+ Add Event</button>
                </div>
                {timelineEvents.length === 0 ? <p style={{ textAlign: 'center', color: '#64748b' }}>No events yet</p> : (
                  <div style={{ paddingLeft: '30px', borderLeft: '3px solid #e2e8f0' }}>
                    {timelineEvents.map(e => (
                      <div key={e.id} style={styles.timelineItem}>
                        <div style={{ ...styles.timelineDot, background: e.is_critical_event ? '#dc2626' : '#1e3a8a', marginLeft: '-39px' }} />
                        <div style={{ ...styles.timelineContent, borderColor: e.is_critical_event ? '#dc2626' : '#e2e8f0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontWeight: '600' }}>#{e.sequence_number} {e.event_date && formatDate(e.event_date)} {e.event_time}</span>
                            {e.is_critical_event && <span style={{ ...styles.badge, background: '#dc2626', color: 'white' }}>⚠️ Critical</span>}
                          </div>
                          <p style={{ margin: 0 }}>{e.event_description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'evidence' && (
              <div>
                <div style={styles.sectionHeader}>📷 Evidence</div>
                {evidence.length === 0 ? <p style={{ textAlign: 'center', color: '#64748b' }}>No evidence yet</p> : evidence.map(e => (
                  <div key={e.id} style={{ ...styles.caCard, display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '8px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>{e.evidence_type === 'Photo' ? '📷' : '📄'}</div>
                    <div><strong>#{e.evidence_number}: {e.file_name || e.evidence_type}</strong><p style={{ margin: '5px 0 0', color: '#64748b' }}>{e.description}</p></div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'witnesses' && (
              <div>
                <div style={styles.sectionHeader}>👥 Witnesses</div>
                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '25px' }}>
                  <h4 style={{ marginTop: 0 }}>Add Witness</h4>
                  <div style={styles.row}>
                    <div style={styles.formGroup}><label style={styles.label}>Name *</label><input type="text" value={newWitness.witness_name} onChange={(e) => setNewWitness({ ...newWitness, witness_name: e.target.value })} style={styles.input} /></div>
                    <div style={styles.formGroup}><label style={styles.label}>Position</label><input type="text" value={newWitness.position_role} onChange={(e) => setNewWitness({ ...newWitness, position_role: e.target.value })} style={styles.input} /></div>
                  </div>
                  <div style={styles.formGroup}><label style={styles.label}>Company</label><input type="text" value={newWitness.company} onChange={(e) => setNewWitness({ ...newWitness, company: e.target.value })} style={styles.input} /></div>
                  <div style={styles.formGroup}><label style={styles.label}>Statement *</label><textarea value={newWitness.statement_summary} onChange={(e) => setNewWitness({ ...newWitness, statement_summary: e.target.value })} style={styles.textarea} /></div>
                  <button onClick={addWitness} style={{ ...styles.actionBtn, ...styles.primaryBtn }}>+ Add Witness</button>
                </div>
                {witnesses.map(w => <div key={w.id} style={styles.witnessCard}><strong>#{w.witness_number}: {w.witness_name}</strong> <span style={{ color: '#64748b' }}>{w.position_role} {w.company && `• ${w.company}`}</span><p style={{ margin: '10px 0 0' }}>{w.statement_summary}</p></div>)}
              </div>
            )}

            {activeTab === 'analysis' && (
              <div>
                <div style={styles.sectionHeader}>🔍 Root Cause Analysis</div>
                {incident.investigation_type === 'Local Review' && (
                  <div>
                    <div style={styles.infoBox}><strong>Local Review</strong></div>
                    <div style={styles.formGroup}><label style={styles.label}>Actions taken since incident</label><textarea value={localReviewData.post_incident_actions} onChange={(e) => setLocalReviewData({ ...localReviewData, post_incident_actions: e.target.value })} style={styles.textarea} /></div>
                    <div style={styles.formGroup}><label style={styles.label}>If you could "do over", what would you do differently?</label><textarea value={localReviewData.do_over_response} onChange={(e) => setLocalReviewData({ ...localReviewData, do_over_response: e.target.value })} style={styles.textarea} /></div>
                    <div style={styles.row3}>
                      <div style={styles.formGroup}><label style={styles.label}>Reviewed By</label><input type="text" value={localReviewData.reviewed_by_name} onChange={(e) => setLocalReviewData({ ...localReviewData, reviewed_by_name: e.target.value })} style={styles.input} /></div>
                      <div style={styles.formGroup}><label style={styles.label}>Supervisor</label><input type="text" value={localReviewData.supervisor_name} onChange={(e) => setLocalReviewData({ ...localReviewData, supervisor_name: e.target.value })} style={styles.input} /></div>
                      <div style={styles.formGroup}><label style={styles.label}>Safety Rep</label><input type="text" value={localReviewData.safety_rep_name} onChange={(e) => setLocalReviewData({ ...localReviewData, safety_rep_name: e.target.value })} style={styles.input} /></div>
                    </div>
                    <button onClick={saveLocalReview} disabled={saving} style={{ ...styles.actionBtn, ...styles.primaryBtn, opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving...' : '💾 Save'}</button>
                  </div>
                )}
                {incident.investigation_type === '5-Why Analysis' && (
                  <div>
                    <div style={styles.infoBox}><strong>5-Why Analysis</strong> - Ask "Why?" repeatedly to find the root cause.</div>
                    {[1, 2, 3, 4, 5].map(n => (
                      <div key={n} style={styles.whyCard}>
                        <div style={{ display: 'flex', gap: '15px' }}>
                          <div style={styles.whyNumber}>{n}</div>
                          <div style={{ flex: 1 }}>
                            <label style={styles.label}>{n === 1 ? 'Why did this incident occur?' : 'Why did that happen?'}</label>
                            <textarea value={whyAnswers[`why_${n}_answer`]} onChange={(e) => setWhyAnswers({ ...whyAnswers, [`why_${n}_answer`]: e.target.value })} style={styles.textarea} disabled={n > 1 && !whyAnswers[`why_${n - 1}_answer`]} />
                          </div>
                        </div>
                      </div>
                    ))}
                    <div style={styles.formGroup}><label style={styles.label}>Root Cause Category</label><select value={whyAnswers.root_cause_category} onChange={(e) => setWhyAnswers({ ...whyAnswers, root_cause_category: e.target.value })} style={styles.select}><option value="">-- Select --</option>{ROOT_CAUSE_CATEGORIES.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select></div>
                    <div style={styles.formGroup}><label style={styles.label}>Root Cause Statement</label><textarea value={whyAnswers.root_cause_identified} onChange={(e) => setWhyAnswers({ ...whyAnswers, root_cause_identified: e.target.value })} style={styles.textarea} /></div>
                    <button onClick={saveFiveWhy} disabled={saving} style={{ ...styles.actionBtn, ...styles.primaryBtn, opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving...' : '💾 Save'}</button>
                  </div>
                )}
                {incident.investigation_type === 'Root Cause Analysis' && (
                  <div>
                    <div style={styles.infoBox}><strong>Full RCA</strong> - Comprehensive analysis across all factor categories.</div>
                    <div style={styles.formGroup}><label style={styles.label}>Problem Statement *</label><textarea value={rcaData.problem_statement} onChange={(e) => setRcaData({ ...rcaData, problem_statement: e.target.value })} style={styles.textarea} /></div>
                    <div style={styles.row}>
                      <div style={styles.formGroup}><label style={styles.label}>Equipment Factors</label><textarea value={rcaData.equipment_factors} onChange={(e) => setRcaData({ ...rcaData, equipment_factors: e.target.value })} style={{ ...styles.textarea, minHeight: '80px' }} /></div>
                      <div style={styles.formGroup}><label style={styles.label}>Procedure Factors</label><textarea value={rcaData.procedure_factors} onChange={(e) => setRcaData({ ...rcaData, procedure_factors: e.target.value })} style={{ ...styles.textarea, minHeight: '80px' }} /></div>
                    </div>
                    <div style={styles.row}>
                      <div style={styles.formGroup}><label style={styles.label}>Training Factors</label><textarea value={rcaData.training_factors} onChange={(e) => setRcaData({ ...rcaData, training_factors: e.target.value })} style={{ ...styles.textarea, minHeight: '80px' }} /></div>
                      <div style={styles.formGroup}><label style={styles.label}>Human Factors</label><textarea value={rcaData.human_factors} onChange={(e) => setRcaData({ ...rcaData, human_factors: e.target.value })} style={{ ...styles.textarea, minHeight: '80px' }} /></div>
                    </div>
                    <div style={styles.row}>
                      <div style={styles.formGroup}><label style={styles.label}>Communication Factors</label><textarea value={rcaData.communication_factors} onChange={(e) => setRcaData({ ...rcaData, communication_factors: e.target.value })} style={{ ...styles.textarea, minHeight: '80px' }} /></div>
                      <div style={styles.formGroup}><label style={styles.label}>Organizational Factors</label><textarea value={rcaData.organizational_factors} onChange={(e) => setRcaData({ ...rcaData, organizational_factors: e.target.value })} style={{ ...styles.textarea, minHeight: '80px' }} /></div>
                    </div>
                    <div style={styles.formGroup}><label style={styles.label}>Root Causes Identified *</label><textarea value={rcaData.root_causes_identified} onChange={(e) => setRcaData({ ...rcaData, root_causes_identified: e.target.value })} style={styles.textarea} /></div>
                    <div style={styles.formGroup}><label style={styles.label}>Systemic Issues</label><textarea value={rcaData.systemic_issues} onChange={(e) => setRcaData({ ...rcaData, systemic_issues: e.target.value })} style={styles.textarea} /></div>
                    <div style={styles.formGroup}><label style={styles.label}>Recommendations</label><textarea value={rcaData.recommendations} onChange={(e) => setRcaData({ ...rcaData, recommendations: e.target.value })} style={styles.textarea} /></div>
                    <button onClick={saveRCA} disabled={saving} style={{ ...styles.actionBtn, ...styles.primaryBtn, opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving...' : '💾 Save'}</button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'actions' && (
              <div>
                <div style={styles.sectionHeader}>✅ Corrective Actions</div>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>{HIERARCHY_OF_CONTROLS.map(h => <span key={h.level} style={{ padding: '6px 12px', borderRadius: '20px', background: h.color, color: 'white', fontSize: '12px', fontWeight: '600' }}>{h.level}. {h.name}</span>)}</div>
                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '25px' }}>
                  <h4 style={{ marginTop: 0 }}>Add Corrective Action</h4>
                  <div style={styles.formGroup}><label style={styles.label}>Description *</label><textarea value={newCA.action_description} onChange={(e) => setNewCA({ ...newCA, action_description: e.target.value })} style={styles.textarea} /></div>
                  <div style={styles.row}>
                    <div style={styles.formGroup}><label style={styles.label}>Owner Name</label><input type="text" value={newCA.action_owner_name} onChange={(e) => setNewCA({ ...newCA, action_owner_name: e.target.value })} style={styles.input} /></div>
                    <div style={styles.formGroup}><label style={styles.label}>Owner Email</label><input type="email" value={newCA.action_owner_email} onChange={(e) => setNewCA({ ...newCA, action_owner_email: e.target.value })} style={styles.input} /></div>
                  </div>
                  <div style={styles.row}>
                    <div style={styles.formGroup}><label style={styles.label}>Target Date *</label><input type="date" value={newCA.target_date} onChange={(e) => setNewCA({ ...newCA, target_date: e.target.value })} style={styles.input} /></div>
                    <div style={styles.formGroup}><label style={styles.label}>Control Level *</label><select value={newCA.hierarchy_control} onChange={(e) => setNewCA({ ...newCA, hierarchy_control: e.target.value })} style={styles.select}><option value="">-- Select --</option>{HIERARCHY_OF_CONTROLS.map(h => <option key={h.level} value={`${h.level}-${h.name}`}>{h.level}. {h.name}</option>)}</select></div>
                  </div>
                  <button onClick={addCorrectiveAction} style={{ ...styles.actionBtn, ...styles.primaryBtn }}>+ Add Action</button>
                </div>
                {correctiveActions.map(ca => {
                  const lvl = parseInt(ca.hierarchy_control?.charAt(0)) || 5;
                  const clr = HIERARCHY_OF_CONTROLS.find(h => h.level === lvl)?.color || '#64748b';
                  return (
                    <div key={ca.id} style={styles.caCard}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                        <strong>CA-{ca.action_number}</strong>
                        <span style={{ ...styles.badge, background: clr, color: 'white' }}>{ca.hierarchy_control}</span>
                        <span style={{ ...styles.badge, background: ca.action_status === 'Completed' ? '#dcfce7' : '#fef3c7', color: ca.action_status === 'Completed' ? '#166534' : '#92400e' }}>{ca.action_status}</span>
                      </div>
                      <p style={{ margin: '0 0 10px' }}>{ca.action_description}</p>
                      <div style={{ fontSize: '13px', color: '#64748b' }}>👤 {ca.action_owner_name || 'Unassigned'} | 📅 Due: {formatDate(ca.target_date)}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'lessons' && (
              <div>
                <div style={styles.sectionHeader}>💡 Lessons Learned</div>
                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '25px' }}>
                  <h4 style={{ marginTop: 0 }}>Add Lesson</h4>
                  <div style={styles.formGroup}><label style={styles.label}>Title *</label><input type="text" value={newLesson.lesson_title} onChange={(e) => setNewLesson({ ...newLesson, lesson_title: e.target.value })} style={styles.input} /></div>
                  <div style={styles.formGroup}><label style={styles.label}>Description *</label><textarea value={newLesson.lesson_description} onChange={(e) => setNewLesson({ ...newLesson, lesson_description: e.target.value })} style={styles.textarea} /></div>
                  <div style={styles.formGroup}><label style={styles.label}>Key Takeaway</label><textarea value={newLesson.key_takeaway} onChange={(e) => setNewLesson({ ...newLesson, key_takeaway: e.target.value })} style={{ ...styles.textarea, minHeight: '80px' }} /></div>
                  <button onClick={addLesson} style={{ ...styles.actionBtn, ...styles.primaryBtn }}>+ Add Lesson</button>
                </div>
                {lessonsLearned.map(l => (
                  <div key={l.id} style={{ ...styles.witnessCard, background: '#fffbeb', borderColor: '#fcd34d' }}>
                    <strong>💡 {l.lesson_title}</strong>
                    <p style={{ margin: '10px 0' }}>{l.lesson_description}</p>
                    {l.key_takeaway && <div style={{ background: 'white', padding: '10px 15px', borderRadius: '8px', borderLeft: '4px solid #f59e0b' }}><strong style={{ fontSize: '12px', color: '#92400e' }}>KEY TAKEAWAY:</strong><p style={{ margin: '5px 0 0' }}>{l.key_takeaway}</p></div>}
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'review' && (
              <div>
                <div style={styles.sectionHeader}>📝 Review & Approval</div>
                <h4>Status: <span style={{ color: '#991b1b' }}>{incident.status}</span></h4>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', margin: '20px 0' }}>
                  {incident.status === 'Submitted' && <button onClick={() => updateStatus('Under Review - Triage')} style={{ ...styles.actionBtn, ...styles.secondaryBtn }}>Begin Triage</button>}
                  {incident.status === 'Under Review - Triage' && <button onClick={() => updateStatus('Under Review - First Draft')} style={{ ...styles.actionBtn, ...styles.secondaryBtn }}>Move to First Draft</button>}
                  {incident.status === 'Under Review - First Draft' && <button onClick={() => updateStatus('Under Review - Asset Review')} style={{ ...styles.actionBtn, ...styles.secondaryBtn }}>Submit for Asset Review</button>}
                  {incident.status === 'Under Review - Asset Review' && <button onClick={() => updateStatus('Under Review - Final Review')} style={{ ...styles.actionBtn, ...styles.secondaryBtn }}>Submit for Final Review</button>}
                  {incident.status === 'Under Review - Final Review' && <button onClick={() => updateStatus('Pending Approval')} style={{ ...styles.actionBtn, ...styles.secondaryBtn }}>Submit for Approval</button>}
                  {incident.status === 'Pending Approval' && <><button onClick={() => updateStatus('Approved')} style={{ ...styles.actionBtn, ...styles.primaryBtn }}>✅ Approve</button><button onClick={() => updateStatus('Under Review - Final Review')} style={{ ...styles.actionBtn, ...styles.outlineBtn }}>Return for Revision</button></>}
                  {incident.status === 'Approved' && <button onClick={() => updateStatus('Closed')} style={{ ...styles.actionBtn, background: '#059669', color: 'white' }}>🔒 Close Investigation</button>}
                </div>
                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px' }}>
                  <h4>Checklist</h4>
                  {[
                    { label: 'Timeline developed', done: timelineEvents.length > 0, count: timelineEvents.length },
                    { label: 'Evidence collected', done: evidence.length > 0, count: evidence.length },
                    { label: 'Witnesses interviewed', done: witnesses.length > 0, count: witnesses.length },
                    { label: 'Analysis completed', done: localReview || fiveWhy || rcaAnalysis, count: null },
                    { label: 'Corrective actions defined', done: correctiveActions.length > 0, count: correctiveActions.length },
                    { label: 'Lessons documented', done: lessonsLearned.length > 0, count: lessonsLearned.length }
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                      <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: item.done ? '#22c55e' : '#e2e8f0', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>{item.done ? '✓' : ''}</span>
                      <span>{item.label} {item.count !== null && `(${item.count})`}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={styles.footer}>
          <span style={{ fontWeight: '500' }}>Powered by Predictive Safety Analytics™</span> | © 2025 SLP Alaska
        </div>
      </div>
    </div>
  );
}

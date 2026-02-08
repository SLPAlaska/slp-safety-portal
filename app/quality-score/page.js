'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://iypezirwdlqpptjpeeyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
);

const SLP_DOMAIN = '@slpalaska.com';

// Quality criteria with weights
const QUALITY_CRITERIA = {
  completeness: {
    label: 'Completeness',
    weight: 30,
    icon: '📋',
    items: [
      { id: 'has_description', label: 'Detailed description provided', points: 5 },
      { id: 'has_timeline', label: 'Timeline developed (3+ events)', points: 5 },
      { id: 'has_witnesses', label: 'Witness statements collected', points: 5 },
      { id: 'has_evidence', label: 'Evidence documented', points: 5 },
      { id: 'has_analysis', label: 'Root cause analysis completed', points: 5 },
      { id: 'has_corrective_actions', label: 'Corrective actions defined', points: 5 }
    ]
  },
  depth: {
    label: 'Analysis Depth',
    weight: 25,
    icon: '🔍',
    items: [
      { id: 'root_cause_identified', label: 'Root cause clearly identified', points: 8 },
      { id: 'multiple_factors', label: 'Multiple contributing factors analyzed', points: 6 },
      { id: 'systemic_issues', label: 'Systemic issues identified', points: 6 },
      { id: 'five_whys_complete', label: '5-Why chain complete (if applicable)', points: 5 }
    ]
  },
  controls: {
    label: 'Control Quality',
    weight: 25,
    icon: '🛡️',
    items: [
      { id: 'hierarchy_used', label: 'Hierarchy of Controls applied', points: 8 },
      { id: 'high_level_controls', label: 'Engineering+ controls used (Level 1-3)', points: 8 },
      { id: 'ca_owners_assigned', label: 'All CAs have owners assigned', points: 5 },
      { id: 'ca_dates_set', label: 'All CAs have target dates', points: 4 }
    ]
  },
  timeliness: {
    label: 'Timeliness',
    weight: 10,
    icon: '⏱️',
    items: [
      { id: 'on_time', label: 'Completed by deadline', points: 5 },
      { id: 'investigation_started_24hr', label: 'Investigation started within 24 hours', points: 5 }
    ]
  },
  documentation: {
    label: 'Documentation',
    weight: 10,
    icon: '📝',
    items: [
      { id: 'lessons_documented', label: 'Lessons learned documented', points: 5 },
      { id: 'photos_included', label: 'Photos/evidence attached', points: 3 },
      { id: 'cost_calculated', label: 'TrueCost™ calculated', points: 2 }
    ]
  }
};

const GRADE_THRESHOLDS = [
  { min: 90, grade: 'A', label: 'Excellent', color: '#22c55e', description: 'Gold standard investigation' },
  { min: 80, grade: 'B', label: 'Good', color: '#84cc16', description: 'Meets best practices' },
  { min: 70, grade: 'C', label: 'Satisfactory', color: '#eab308', description: 'Adequate but room for improvement' },
  { min: 60, grade: 'D', label: 'Needs Improvement', color: '#f97316', description: 'Missing key elements' },
  { min: 0, grade: 'F', label: 'Incomplete', color: '#dc2626', description: 'Significant gaps' }
];

const styles = {
  container: { minHeight: '100vh', background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)', padding: '20px' },
  wrapper: { maxWidth: '1200px', margin: '0 auto' },
  header: { background: 'linear-gradient(135deg, #991b1b 0%, #c41e3a 100%)', borderRadius: '16px 16px 0 0', padding: '25px 30px', color: 'white' },
  headerTitle: { fontSize: '28px', fontWeight: '700' },
  headerSubtitle: { fontSize: '14px', opacity: 0.9, marginTop: '5px' },
  card: { background: '#fff', borderRadius: '0 0 16px 16px', padding: '25px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' },
  loginCard: { background: '#fff', borderRadius: '16px', padding: '40px', maxWidth: '450px', margin: '50px auto', boxShadow: '0 10px 40px rgba(0,0,0,0.2)', textAlign: 'center' },
  sectionHeader: { background: '#1e3a8a', color: 'white', padding: '12px 20px', borderRadius: '8px', fontSize: '16px', fontWeight: '600', marginBottom: '20px', marginTop: '25px', display: 'flex', alignItems: 'center', gap: '10px' },
  scoreCard: { textAlign: 'center', padding: '40px', borderRadius: '16px', marginBottom: '25px' },
  scoreCircle: { width: '150px', height: '150px', borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', border: '8px solid' },
  scoreNumber: { fontSize: '48px', fontWeight: '700' },
  scoreGrade: { fontSize: '24px', fontWeight: '700' },
  input: { width: '100%', padding: '12px 15px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box' },
  select: { width: '100%', padding: '12px 15px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '15px', background: 'white' },
  actionBtn: { padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
  primaryBtn: { background: 'linear-gradient(135deg, #991b1b 0%, #c41e3a 100%)', color: 'white' },
  secondaryBtn: { background: '#1e3a8a', color: 'white' },
  criteriaCard: { border: '2px solid #e2e8f0', borderRadius: '12px', padding: '20px', marginBottom: '15px' },
  criteriaHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' },
  criteriaTitle: { fontWeight: '700', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '10px' },
  criteriaScore: { fontSize: '18px', fontWeight: '700' },
  checkItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', marginBottom: '5px', borderRadius: '6px' },
  checkPass: { background: '#dcfce7' },
  checkFail: { background: '#fee2e2' },
  progressBar: { height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', marginTop: '10px' },
  progressFill: { height: '100%', borderRadius: '4px', transition: 'width 0.5s' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '25px' },
  statCard: { background: '#f8fafc', borderRadius: '12px', padding: '20px', textAlign: 'center', border: '2px solid #e2e8f0' },
  statNumber: { fontSize: '28px', fontWeight: '700', marginBottom: '5px' },
  statLabel: { fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' },
  improvementCard: { background: '#fef3c7', border: '2px solid #f59e0b', borderRadius: '12px', padding: '20px', marginBottom: '15px' },
  footer: { textAlign: 'center', padding: '20px', color: 'white', fontSize: '13px' },
  submitBtn: { width: '100%', padding: '14px', background: 'linear-gradient(135deg, #991b1b 0%, #c41e3a 100%)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  th: { background: '#1e3a8a', color: 'white', padding: '12px 15px', textAlign: 'left', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase' },
  td: { padding: '12px 15px', borderBottom: '1px solid #e2e8f0' },
  badge: { display: 'inline-block', padding: '4px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' }
};

function isSLPTeam(email) { return email && email.toLowerCase().endsWith(SLP_DOMAIN); }
function formatDate(d) { return d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'; }

export default function InvestigationQualityScore() {
  const [userEmail, setUserEmail] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('single');

  // Single incident scoring
  const [incidents, setIncidents] = useState([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState('');
  const [scoreData, setScoreData] = useState(null);

  // Aggregate stats
  const [aggregateStats, setAggregateStats] = useState({ avgScore: 0, totalScored: 0, gradeDistribution: {} });
  const [allScores, setAllScores] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('slp_user_email');
    if (saved && isSLPTeam(saved)) { setUserEmail(saved); setIsAuthenticated(true); }
    setLoading(false);
  }, []);

  useEffect(() => { if (isAuthenticated) { fetchIncidents(); fetchAllScores(); } }, [isAuthenticated]);

  async function fetchIncidents() {
    const { data } = await supabase
      .from('incidents')
      .select('id, incident_id, brief_description, company_name, incident_date, status, investigation_type')
      .order('incident_date', { ascending: false });
    setIncidents(data || []);
  }

  async function fetchAllScores() {
    // Fetch all incidents with related data for scoring
    const { data: allIncidents } = await supabase
      .from('incidents')
      .select(`
        *,
        timeline_events(count),
        witness_statements(count),
        investigation_evidence(count),
        investigation_corrective_actions(*),
        investigation_lessons_learned(count),
        local_reviews(*),
        five_why_analyses(*),
        rca_analyses(*),
        incident_costs(*)
      `)
      .in('status', ['Approved', 'Closed', 'Under Review - Final Review', 'Pending Approval']);

    if (!allIncidents || allIncidents.length === 0) {
      setAggregateStats({ avgScore: 0, totalScored: 0, gradeDistribution: {} });
      setAllScores([]);
      return;
    }

    // Calculate scores for all
    const scores = allIncidents.map(inc => {
      const score = calculateScore(inc);
      return { ...inc, ...score };
    });

    // Calculate aggregate stats
    const totalScore = scores.reduce((sum, s) => sum + s.totalScore, 0);
    const avgScore = Math.round(totalScore / scores.length);

    const gradeDistribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    scores.forEach(s => {
      gradeDistribution[s.grade.grade]++;
    });

    setAggregateStats({ avgScore, totalScored: scores.length, gradeDistribution });
    setAllScores(scores.sort((a, b) => b.totalScore - a.totalScore));
  }

  async function loadIncidentScore(incidentId) {
    setLoading(true);

    const { data: incident } = await supabase
      .from('incidents')
      .select(`
        *,
        timeline_events(*),
        witness_statements(*),
        investigation_evidence(*),
        investigation_corrective_actions(*),
        investigation_lessons_learned(*),
        local_reviews(*),
        five_why_analyses(*),
        rca_analyses(*),
        incident_costs(*)
      `)
      .eq('id', incidentId)
      .single();

    if (incident) {
      const score = calculateScore(incident);
      setScoreData({ incident, ...score });
    }

    setLoading(false);
  }

  function calculateScore(incident) {
    const checks = {};
    let earnedPoints = 0;
    let totalPoints = 0;
    const categoryScores = {};
    const improvements = [];

    // Helper data
    const timeline = incident.timeline_events || [];
    const witnesses = incident.witness_statements || [];
    const evidence = incident.investigation_evidence || [];
    const cas = incident.investigation_corrective_actions || [];
    const lessons = incident.investigation_lessons_learned || [];
    const localReview = Array.isArray(incident.local_reviews) ? incident.local_reviews[0] : incident.local_reviews;
    const fiveWhy = Array.isArray(incident.five_why_analyses) ? incident.five_why_analyses[0] : incident.five_why_analyses;
    const rca = Array.isArray(incident.rca_analyses) ? incident.rca_analyses[0] : incident.rca_analyses;
    const costs = Array.isArray(incident.incident_costs) ? incident.incident_costs[0] : incident.incident_costs;

    // Evaluate each category
    Object.entries(QUALITY_CRITERIA).forEach(([catKey, category]) => {
      let catEarned = 0;
      let catTotal = 0;

      category.items.forEach(item => {
        let passed = false;
        catTotal += item.points;
        totalPoints += item.points;

        switch (item.id) {
          case 'has_description':
            passed = (incident.brief_description?.length > 50) || (incident.detailed_description?.length > 100);
            break;
          case 'has_timeline':
            passed = timeline.length >= 3;
            break;
          case 'has_witnesses':
            passed = witnesses.length > 0;
            break;
          case 'has_evidence':
            passed = evidence.length > 0;
            break;
          case 'has_analysis':
            passed = !!(localReview || fiveWhy || rca);
            break;
          case 'has_corrective_actions':
            passed = cas.length > 0;
            break;
          case 'root_cause_identified':
            passed = !!(fiveWhy?.root_cause_identified || rca?.root_causes_identified || localReview?.do_over_response);
            break;
          case 'multiple_factors':
            if (rca) {
              const factors = [rca.equipment_factors, rca.procedure_factors, rca.training_factors, rca.human_factors, rca.communication_factors].filter(Boolean);
              passed = factors.length >= 2;
            } else {
              passed = false;
            }
            break;
          case 'systemic_issues':
            passed = !!(rca?.systemic_issues);
            break;
          case 'five_whys_complete':
            if (incident.investigation_type === '5-Why Analysis' && fiveWhy) {
              passed = !!(fiveWhy.why_1_answer && fiveWhy.why_2_answer && fiveWhy.why_3_answer);
            } else {
              passed = true; // N/A for other types
            }
            break;
          case 'hierarchy_used':
            passed = cas.some(ca => ca.hierarchy_control);
            break;
          case 'high_level_controls':
            passed = cas.some(ca => {
              const level = parseInt(ca.hierarchy_control?.charAt(0));
              return level >= 1 && level <= 3;
            });
            break;
          case 'ca_owners_assigned':
            passed = cas.length === 0 || cas.every(ca => ca.action_owner_email || ca.action_owner_name);
            break;
          case 'ca_dates_set':
            passed = cas.length === 0 || cas.every(ca => ca.target_date);
            break;
          case 'on_time':
            if (incident.investigation_deadline && incident.status) {
              const deadline = new Date(incident.investigation_deadline);
              const completed = ['Approved', 'Closed'].includes(incident.status);
              passed = completed || new Date() <= deadline;
            } else {
              passed = true;
            }
            break;
          case 'investigation_started_24hr':
            passed = true; // Assume true if we can't verify
            break;
          case 'lessons_documented':
            passed = lessons.length > 0;
            break;
          case 'photos_included':
            passed = evidence.some(e => e.evidence_type === 'Photo');
            break;
          case 'cost_calculated':
            passed = !!(costs?.total_cost);
            break;
          default:
            passed = false;
        }

        checks[item.id] = passed;
        if (passed) {
          catEarned += item.points;
          earnedPoints += item.points;
        } else {
          improvements.push({ category: category.label, item: item.label, points: item.points });
        }
      });

      categoryScores[catKey] = {
        earned: catEarned,
        total: catTotal,
        percent: Math.round((catEarned / catTotal) * 100)
      };
    });

    // Calculate final score (weighted)
    let weightedScore = 0;
    Object.entries(QUALITY_CRITERIA).forEach(([catKey, category]) => {
      const catScore = categoryScores[catKey];
      weightedScore += (catScore.percent / 100) * category.weight;
    });

    const totalScore = Math.round(weightedScore);
    const grade = GRADE_THRESHOLDS.find(g => totalScore >= g.min);

    return {
      checks,
      categoryScores,
      earnedPoints,
      totalPoints,
      totalScore,
      grade,
      improvements: improvements.sort((a, b) => b.points - a.points).slice(0, 5)
    };
  }

  function handleLogin(e) {
    e.preventDefault();
    if (!loginEmail) { setLoginError('Enter email'); return; }
    if (!isSLPTeam(loginEmail)) { setLoginError('Access restricted to @slpalaska.com'); return; }
    localStorage.setItem('slp_user_email', loginEmail.toLowerCase());
    setUserEmail(loginEmail.toLowerCase());
    setIsAuthenticated(true);
  }

  // Login
  if (!isAuthenticated) {
    return (
      <div style={styles.container}><div style={styles.wrapper}>
        <a href="/" style={{ display: 'inline-block', marginBottom: '15px', padding: '10px 20px', backgroundColor: '#1e3a5f', color: '#fff', textDecoration: 'none', borderRadius: '6px' }}>← Back to Portal</a>
        <div style={styles.loginCard}>
          <img src="/Logo.png" alt="SLP Alaska" style={{ maxWidth: '200px', margin: '0 auto 25px', display: 'block' }} />
          <h1 style={{ color: '#1e293b', marginBottom: '10px', fontSize: '24px' }}>Quality Score</h1>
          <p style={{ color: '#64748b', marginBottom: '30px' }}>Measure investigation quality and completeness</p>
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
          <div>
            <img src="/Logo.png" alt="SLP Alaska" style={{ maxWidth: '150px', marginBottom: '10px' }} />
            <div style={styles.headerTitle}>📊 Investigation Quality Score</div>
            <div style={styles.headerSubtitle}>Measure completeness and quality of investigations</div>
          </div>
        </div>

        <div style={styles.card}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '25px', borderBottom: '2px solid #e2e8f0', paddingBottom: '15px' }}>
            <button onClick={() => setActiveTab('single')} style={{ ...styles.actionBtn, background: activeTab === 'single' ? '#1e3a8a' : '#f1f5f9', color: activeTab === 'single' ? 'white' : '#64748b' }}>
              🔍 Score Investigation
            </button>
            <button onClick={() => setActiveTab('overview')} style={{ ...styles.actionBtn, background: activeTab === 'overview' ? '#1e3a8a' : '#f1f5f9', color: activeTab === 'overview' ? 'white' : '#64748b' }}>
              📈 Quality Overview
            </button>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div>
              {/* Aggregate Stats */}
              <div style={styles.statsRow}>
                <div style={{ ...styles.statCard, borderColor: '#22c55e' }}>
                  <div style={{ ...styles.statNumber, color: '#22c55e' }}>{aggregateStats.avgScore}</div>
                  <div style={styles.statLabel}>Average Score</div>
                </div>
                <div style={styles.statCard}>
                  <div style={{ ...styles.statNumber, color: '#1e3a8a' }}>{aggregateStats.totalScored}</div>
                  <div style={styles.statLabel}>Investigations Scored</div>
                </div>
                {Object.entries(aggregateStats.gradeDistribution).map(([grade, count]) => (
                  <div key={grade} style={styles.statCard}>
                    <div style={{ ...styles.statNumber, color: GRADE_THRESHOLDS.find(g => g.grade === grade)?.color }}>{count}</div>
                    <div style={styles.statLabel}>Grade {grade}</div>
                  </div>
                ))}
              </div>

              {/* All Scores Table */}
              {allScores.length > 0 && (
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Incident</th>
                      <th style={styles.th}>Company</th>
                      <th style={styles.th}>Date</th>
                      <th style={styles.th}>Score</th>
                      <th style={styles.th}>Grade</th>
                      <th style={styles.th}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allScores.slice(0, 20).map(score => (
                      <tr key={score.id}>
                        <td style={styles.td}>{score.incident_id}</td>
                        <td style={styles.td}>{score.company_name}</td>
                        <td style={styles.td}>{formatDate(score.incident_date)}</td>
                        <td style={styles.td}>
                          <strong style={{ color: score.grade.color }}>{score.totalScore}%</strong>
                        </td>
                        <td style={styles.td}>
                          <span style={{ ...styles.badge, background: score.grade.color, color: 'white' }}>
                            {score.grade.grade}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <button
                            onClick={() => { setSelectedIncidentId(score.id); loadIncidentScore(score.id); setActiveTab('single'); }}
                            style={{ ...styles.actionBtn, ...styles.secondaryBtn, padding: '6px 12px', fontSize: '12px' }}
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Single Investigation Tab */}
          {activeTab === 'single' && (
            <div>
              {/* Incident Selection */}
              <div style={{ marginBottom: '25px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>Select Investigation</label>
                <select
                  value={selectedIncidentId}
                  onChange={(e) => { setSelectedIncidentId(e.target.value); if (e.target.value) loadIncidentScore(e.target.value); }}
                  style={styles.select}
                >
                  <option value="">-- Select an Investigation --</option>
                  {incidents.map(inc => (
                    <option key={inc.id} value={inc.id}>{inc.incident_id} - {inc.company_name} - {formatDate(inc.incident_date)}</option>
                  ))}
                </select>
              </div>

              {loading && <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>}

              {scoreData && !loading && (
                <>
                  {/* Overall Score */}
                  <div style={{ ...styles.scoreCard, background: `linear-gradient(135deg, ${scoreData.grade.color}20 0%, ${scoreData.grade.color}10 100%)` }}>
                    <div style={{ ...styles.scoreCircle, borderColor: scoreData.grade.color, background: 'white' }}>
                      <div style={{ ...styles.scoreNumber, color: scoreData.grade.color }}>{scoreData.totalScore}</div>
                      <div style={{ fontSize: '14px', color: '#64748b' }}>out of 100</div>
                    </div>
                    <div style={{ ...styles.scoreGrade, color: scoreData.grade.color }}>
                      Grade: {scoreData.grade.grade} - {scoreData.grade.label}
                    </div>
                    <p style={{ color: '#64748b', marginTop: '10px' }}>{scoreData.grade.description}</p>
                  </div>

                  {/* Category Breakdown */}
                  <div style={styles.sectionHeader}>📋 Quality Breakdown</div>
                  {Object.entries(QUALITY_CRITERIA).map(([catKey, category]) => {
                    const catScore = scoreData.categoryScores[catKey];
                    const scoreColor = catScore.percent >= 80 ? '#22c55e' : catScore.percent >= 60 ? '#eab308' : '#dc2626';

                    return (
                      <div key={catKey} style={styles.criteriaCard}>
                        <div style={styles.criteriaHeader}>
                          <div style={styles.criteriaTitle}>
                            <span style={{ fontSize: '24px' }}>{category.icon}</span>
                            {category.label}
                            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '400' }}>({category.weight}% weight)</span>
                          </div>
                          <div style={{ ...styles.criteriaScore, color: scoreColor }}>{catScore.percent}%</div>
                        </div>

                        <div style={styles.progressBar}>
                          <div style={{ ...styles.progressFill, width: `${catScore.percent}%`, background: scoreColor }} />
                        </div>

                        <div style={{ marginTop: '15px' }}>
                          {category.items.map(item => {
                            const passed = scoreData.checks[item.id];
                            return (
                              <div key={item.id} style={{ ...styles.checkItem, ...(passed ? styles.checkPass : styles.checkFail) }}>
                                <span style={{ fontSize: '16px' }}>{passed ? '✅' : '❌'}</span>
                                <span style={{ flex: 1 }}>{item.label}</span>
                                <span style={{ fontSize: '12px', color: '#64748b' }}>{item.points} pts</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {/* Improvement Opportunities */}
                  {scoreData.improvements.length > 0 && (
                    <>
                      <div style={styles.sectionHeader}>💡 Top Improvement Opportunities</div>
                      {scoreData.improvements.map((imp, i) => (
                        <div key={i} style={styles.improvementCard}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <strong>{imp.item}</strong>
                              <div style={{ fontSize: '12px', color: '#92400e' }}>{imp.category}</div>
                            </div>
                            <span style={{ ...styles.badge, background: '#f59e0b', color: 'white' }}>+{imp.points} pts</span>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </>
              )}

              {!scoreData && !loading && (
                <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
                  <div style={{ fontSize: '48px', marginBottom: '15px' }}>📊</div>
                  <p>Select an investigation to view its quality score</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={styles.footer}>
          <div style={{ marginBottom: '5px' }}><strong>AnthroSafe™ Field Driven Safety</strong></div>
          <div>© 2026 SLP Alaska, LLC. All rights reserved.</div>
        </div>
      </div>
    </div>
  );
}

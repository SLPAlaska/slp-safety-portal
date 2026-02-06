'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://iypezirwdlqpptjpeeyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
);

const SLP_DOMAIN = '@slpalaska.com';

// Keywords for pattern matching
const HAZARD_KEYWORDS = {
  'fall': ['fall', 'fell', 'slip', 'trip', 'ladder', 'scaffold', 'stairs', 'elevation', 'height'],
  'struck_by': ['struck', 'hit', 'impact', 'falling object', 'dropped', 'swing', 'crane', 'load'],
  'caught_in': ['caught', 'pinch', 'crush', 'between', 'rotating', 'machine', 'equipment'],
  'electrical': ['electrical', 'shock', 'electrocution', 'arc flash', 'voltage', 'wire', 'energized'],
  'chemical': ['chemical', 'exposure', 'inhalation', 'spill', 'toxic', 'h2s', 'vapor', 'fume'],
  'fire': ['fire', 'burn', 'flame', 'ignition', 'explosion', 'hot work', 'welding'],
  'pressure': ['pressure', 'hydraulic', 'pneumatic', 'release', 'line', 'hose', 'fitting'],
  'vehicle': ['vehicle', 'driving', 'collision', 'backing', 'rollover', 'truck', 'forklift'],
  'lifting': ['lifting', 'ergonomic', 'strain', 'back', 'manual handling', 'overexertion'],
  'confined_space': ['confined', 'space', 'tank', 'vessel', 'atmosphere', 'entry', 'permit']
};

const SEVERITY_COLORS = {
  'A': '#7F1D1D', 'B': '#991B1B', 'C': '#B91C1C', 'D': '#DC2626',
  'E': '#F97316', 'F': '#EAB308', 'G': '#22C55E'
};

const PSIF_COLORS = {
  'SIF-Actual': { bg: '#1f2937', text: '#fff' },
  'PSIF-Critical': { bg: '#dc2626', text: '#fff' },
  'PSIF-High': { bg: '#ea580c', text: '#fff' },
  'PSIF-Elevated': { bg: '#eab308', text: '#000' },
  'STKY-Controlled': { bg: '#22c55e', text: '#fff' },
  'Non-STKY': { bg: '#3b82f6', text: '#fff' }
};

const styles = {
  container: { minHeight: '100vh', background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)', padding: '20px' },
  wrapper: { maxWidth: '1200px', margin: '0 auto' },
  header: { background: 'linear-gradient(135deg, #991b1b 0%, #c41e3a 100%)', borderRadius: '16px 16px 0 0', padding: '25px 30px', color: 'white' },
  headerTitle: { fontSize: '28px', fontWeight: '700' },
  headerSubtitle: { fontSize: '14px', opacity: 0.9, marginTop: '5px' },
  card: { background: '#fff', borderRadius: '0 0 16px 16px', padding: '25px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' },
  loginCard: { background: '#fff', borderRadius: '16px', padding: '40px', maxWidth: '450px', margin: '50px auto', boxShadow: '0 10px 40px rgba(0,0,0,0.2)', textAlign: 'center' },
  sectionHeader: { background: '#1e3a8a', color: 'white', padding: '12px 20px', borderRadius: '8px', fontSize: '16px', fontWeight: '600', marginBottom: '20px', marginTop: '25px' },
  searchBox: { background: '#f8fafc', borderRadius: '12px', padding: '25px', marginBottom: '25px' },
  input: { width: '100%', padding: '15px 20px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '16px', boxSizing: 'border-box' },
  select: { padding: '12px 15px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', background: 'white', minWidth: '180px' },
  actionBtn: { padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '15px', fontWeight: '600' },
  primaryBtn: { background: 'linear-gradient(135deg, #991b1b 0%, #c41e3a 100%)', color: 'white' },
  secondaryBtn: { background: '#1e3a8a', color: 'white' },
  resultCard: { border: '2px solid #e2e8f0', borderRadius: '12px', padding: '20px', marginBottom: '15px', transition: 'all 0.2s' },
  resultCardHigh: { borderColor: '#dc2626', background: '#fef2f2' },
  resultCardMedium: { borderColor: '#f59e0b', background: '#fffbeb' },
  matchScore: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '50px', height: '50px', borderRadius: '50%', fontWeight: '700', fontSize: '18px', color: 'white', marginRight: '15px' },
  badge: { display: 'inline-block', padding: '4px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', marginRight: '8px' },
  patternCard: { background: '#f8fafc', borderRadius: '12px', padding: '20px', marginBottom: '15px', border: '2px solid #e2e8f0' },
  patternHeader: { display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' },
  patternIcon: { fontSize: '32px', width: '60px', height: '60px', background: '#1e3a8a', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  patternCount: { fontSize: '24px', fontWeight: '700', color: '#991b1b' },
  patternLabel: { fontSize: '14px', color: '#64748b' },
  footer: { textAlign: 'center', padding: '20px', color: 'white', fontSize: '13px' },
  submitBtn: { width: '100%', padding: '14px', background: 'linear-gradient(135deg, #991b1b 0%, #c41e3a 100%)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginBottom: '25px' },
  statCard: { background: '#f8fafc', borderRadius: '12px', padding: '20px', textAlign: 'center', border: '2px solid #e2e8f0' },
  statNumber: { fontSize: '28px', fontWeight: '700', marginBottom: '5px' },
  statLabel: { fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' },
  warningBox: { background: '#fef2f2', border: '2px solid #dc2626', borderRadius: '12px', padding: '20px', marginBottom: '20px' },
  infoBox: { background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', padding: '15px', marginBottom: '20px', fontSize: '14px', color: '#0369a1' }
};

function isSLPTeam(email) { return email && email.toLowerCase().endsWith(SLP_DOMAIN); }
function formatDate(d) { return d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'; }

export default function SimilarIncidentFinder() {
  const [userEmail, setUserEmail] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIncidentId, setSelectedIncidentId] = useState('');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [incidents, setIncidents] = useState([]);
  const [companies, setCompanies] = useState([]);

  // Results
  const [similarIncidents, setSimilarIncidents] = useState([]);
  const [patterns, setPatterns] = useState([]);
  const [repeatPatterns, setRepeatPatterns] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('slp_user_email');
    if (saved && isSLPTeam(saved)) { setUserEmail(saved); setIsAuthenticated(true); }
    setLoading(false);
  }, []);

  useEffect(() => { if (isAuthenticated) fetchIncidents(); }, [isAuthenticated]);

  async function fetchIncidents() {
    const { data } = await supabase
      .from('incidents')
      .select('id, incident_id, brief_description, detailed_description, company_name, location_name, incident_date, incident_types, safety_severity, psif_classification')
      .order('incident_date', { ascending: false });
    setIncidents(data || []);
    
    const uniqueCompanies = [...new Set((data || []).map(i => i.company_name).filter(Boolean))];
    setCompanies(uniqueCompanies.sort());

    // Analyze patterns on load
    analyzeAllPatterns(data || []);
  }

  function analyzeAllPatterns(allIncidents) {
    // Find repeat patterns by company and type
    const companyTypeCounts = {};
    const hazardCounts = {};

    allIncidents.forEach(inc => {
      const key = `${inc.company_name}|${(inc.incident_types || []).join(',')}`;
      companyTypeCounts[key] = (companyTypeCounts[key] || 0) + 1;

      // Detect hazard keywords
      const text = `${inc.brief_description || ''} ${inc.detailed_description || ''}`.toLowerCase();
      Object.entries(HAZARD_KEYWORDS).forEach(([hazard, keywords]) => {
        if (keywords.some(kw => text.includes(kw))) {
          hazardCounts[hazard] = (hazardCounts[hazard] || 0) + 1;
        }
      });
    });

    // Find repeats (>1 occurrence)
    const repeats = Object.entries(companyTypeCounts)
      .filter(([_, count]) => count > 1)
      .map(([key, count]) => {
        const [company, types] = key.split('|');
        return { company, types: types || 'Unspecified', count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    setRepeatPatterns(repeats);

    // Top hazard patterns
    const topPatterns = Object.entries(hazardCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([hazard, count]) => ({
        hazard,
        count,
        label: hazard.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        icon: getHazardIcon(hazard)
      }));

    setPatterns(topPatterns);
  }

  function getHazardIcon(hazard) {
    const icons = {
      'fall': '🪜', 'struck_by': '⚠️', 'caught_in': '⚙️', 'electrical': '⚡',
      'chemical': '🧪', 'fire': '🔥', 'pressure': '💨', 'vehicle': '🚗',
      'lifting': '💪', 'confined_space': '🕳️'
    };
    return icons[hazard] || '⚠️';
  }

  function calculateSimilarity(inc1, inc2) {
    let score = 0;
    const text1 = `${inc1.brief_description || ''} ${inc1.detailed_description || ''}`.toLowerCase();
    const text2 = `${inc2.brief_description || ''} ${inc2.detailed_description || ''}`.toLowerCase();

    // Same company +20
    if (inc1.company_name === inc2.company_name) score += 20;

    // Same location +15
    if (inc1.location_name && inc1.location_name === inc2.location_name) score += 15;

    // Same incident types +25
    const types1 = inc1.incident_types || [];
    const types2 = inc2.incident_types || [];
    const commonTypes = types1.filter(t => types2.includes(t));
    if (commonTypes.length > 0) score += Math.min(25, commonTypes.length * 10);

    // Same severity +10
    if (inc1.safety_severity === inc2.safety_severity) score += 10;

    // Keyword overlap +30 max
    const words1 = text1.split(/\W+/).filter(w => w.length > 3);
    const words2 = text2.split(/\W+/).filter(w => w.length > 3);
    const commonWords = words1.filter(w => words2.includes(w));
    const keywordScore = Math.min(30, (commonWords.length / Math.max(words1.length, 1)) * 60);
    score += keywordScore;

    // Hazard category match
    Object.entries(HAZARD_KEYWORDS).forEach(([_, keywords]) => {
      const match1 = keywords.some(kw => text1.includes(kw));
      const match2 = keywords.some(kw => text2.includes(kw));
      if (match1 && match2) score += 10;
    });

    return Math.min(100, Math.round(score));
  }

  async function searchSimilar() {
    setSearching(true);
    let baseIncident = null;
    let searchText = searchQuery.toLowerCase();

    // If incident selected, use it as base
    if (selectedIncidentId) {
      baseIncident = incidents.find(i => i.id === selectedIncidentId);
      searchText = `${baseIncident?.brief_description || ''} ${baseIncident?.detailed_description || ''}`.toLowerCase();
    }

    // Filter and score incidents
    let results = incidents
      .filter(inc => {
        if (baseIncident && inc.id === baseIncident.id) return false;
        if (companyFilter !== 'all' && inc.company_name !== companyFilter) return false;
        return true;
      })
      .map(inc => {
        let score;
        if (baseIncident) {
          score = calculateSimilarity(baseIncident, inc);
        } else {
          // Text search scoring
          const text = `${inc.brief_description || ''} ${inc.detailed_description || ''} ${inc.company_name || ''}`.toLowerCase();
          const words = searchText.split(/\W+/).filter(w => w.length > 2);
          const matches = words.filter(w => text.includes(w));
          score = Math.round((matches.length / Math.max(words.length, 1)) * 100);
        }
        return { ...inc, similarityScore: score };
      })
      .filter(inc => inc.similarityScore > 20)
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, 15);

    setSimilarIncidents(results);
    setSearching(false);
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
          <h1 style={{ color: '#1e293b', marginBottom: '10px', fontSize: '24px' }}>Similar Incident Finder</h1>
          <p style={{ color: '#64748b', marginBottom: '30px' }}>Find patterns and similar incidents</p>
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
            <div style={styles.headerTitle}>🔍 Similar Incident Finder</div>
            <div style={styles.headerSubtitle}>Detect patterns and find similar incidents using AI-powered analysis</div>
          </div>
        </div>

        <div style={styles.card}>
          {/* Repeat Patterns Warning */}
          {repeatPatterns.length > 0 && (
            <div style={styles.warningBox}>
              <div style={{ fontWeight: '700', marginBottom: '10px', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '10px' }}>
                ⚠️ REPEAT INCIDENT PATTERNS DETECTED
              </div>
              {repeatPatterns.map((rp, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < repeatPatterns.length - 1 ? '1px solid #fecaca' : 'none' }}>
                  <span><strong>{rp.company}</strong> - {rp.types}</span>
                  <span style={{ ...styles.badge, background: '#dc2626', color: 'white' }}>{rp.count} incidents</span>
                </div>
              ))}
            </div>
          )}

          {/* Pattern Analysis */}
          <div style={styles.sectionHeader}>📊 Hazard Pattern Analysis</div>
          <div style={styles.statsRow}>
            {patterns.map((p, i) => (
              <div key={i} style={styles.statCard}>
                <div style={{ fontSize: '32px', marginBottom: '10px' }}>{p.icon}</div>
                <div style={{ ...styles.statNumber, color: '#1e3a8a' }}>{p.count}</div>
                <div style={styles.statLabel}>{p.label}</div>
              </div>
            ))}
          </div>

          {/* Search Box */}
          <div style={styles.sectionHeader}>🔎 Find Similar Incidents</div>
          <div style={styles.searchBox}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>Search by Description</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter keywords to find similar incidents (e.g., 'slip fall ladder')..."
                style={styles.input}
              />
            </div>

            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>Or Compare to Incident</label>
                <select
                  value={selectedIncidentId}
                  onChange={(e) => setSelectedIncidentId(e.target.value)}
                  style={{ ...styles.select, width: '100%' }}
                >
                  <option value="">-- Select Incident --</option>
                  {incidents.slice(0, 50).map(inc => (
                    <option key={inc.id} value={inc.id}>{inc.incident_id} - {inc.brief_description?.substring(0, 40)}...</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>Company</label>
                <select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)} style={styles.select}>
                  <option value="all">All Companies</option>
                  {companies.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <button
                onClick={searchSimilar}
                disabled={searching || (!searchQuery && !selectedIncidentId)}
                style={{ ...styles.actionBtn, ...styles.primaryBtn, height: '46px', opacity: searching || (!searchQuery && !selectedIncidentId) ? 0.5 : 1 }}
              >
                {searching ? '⏳ Searching...' : '🔍 Find Similar'}
              </button>
            </div>
          </div>

          {/* Results */}
          {similarIncidents.length > 0 && (
            <div>
              <div style={styles.sectionHeader}>📋 Similar Incidents Found ({similarIncidents.length})</div>
              
              {similarIncidents.map((inc, i) => {
                const scoreColor = inc.similarityScore >= 70 ? '#dc2626' : inc.similarityScore >= 50 ? '#f59e0b' : '#22c55e';
                const cardStyle = inc.similarityScore >= 70 ? styles.resultCardHigh : inc.similarityScore >= 50 ? styles.resultCardMedium : {};
                const psif = PSIF_COLORS[inc.psif_classification] || {};

                return (
                  <div key={inc.id} style={{ ...styles.resultCard, ...cardStyle }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                      <div style={{ ...styles.matchScore, background: scoreColor }}>
                        {inc.similarityScore}%
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
                          <div>
                            <a href={`/investigation-workbench/${inc.id}`} style={{ fontWeight: '700', fontSize: '16px', color: '#1e3a8a', textDecoration: 'none' }}>
                              {inc.incident_id}
                            </a>
                            <span style={{ marginLeft: '10px', color: '#64748b', fontSize: '13px' }}>
                              {inc.company_name} • {inc.location_name} • {formatDate(inc.incident_date)}
                            </span>
                          </div>
                          <div>
                            {inc.safety_severity && (
                              <span style={{ ...styles.badge, background: SEVERITY_COLORS[inc.safety_severity], color: 'white' }}>
                                Sev {inc.safety_severity}
                              </span>
                            )}
                            {inc.psif_classification && (
                              <span style={{ ...styles.badge, background: psif.bg, color: psif.text }}>
                                {inc.psif_classification}
                              </span>
                            )}
                          </div>
                        </div>
                        <p style={{ margin: 0, color: '#475569', fontSize: '14px' }}>{inc.brief_description}</p>
                        {inc.incident_types && inc.incident_types.length > 0 && (
                          <div style={{ marginTop: '10px' }}>
                            {inc.incident_types.map((t, j) => (
                              <span key={j} style={{ ...styles.badge, background: '#e0e7ff', color: '#3730a3' }}>{t}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {similarIncidents.length === 0 && (searchQuery || selectedIncidentId) && !searching && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              <p>No similar incidents found. Try different search terms.</p>
            </div>
          )}

          <div style={styles.infoBox}>
            <strong>💡 How Similarity is Calculated:</strong> The algorithm considers company, location, incident types, severity, and keyword overlap in descriptions. Higher scores (70%+) indicate very similar incidents that may represent repeat patterns requiring additional controls.
          </div>
        </div>

        <div style={styles.footer}>
          <div style={{ marginBottom: '5px' }}><strong>AnthroSafe™ Powered by Field Driven Data™</strong></div>
          <div>© 2026 SLP Alaska, LLC. All rights reserved.</div>
        </div>
      </div>
    </div>
  );
}

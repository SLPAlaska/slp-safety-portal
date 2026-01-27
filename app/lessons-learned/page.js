'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://iypezirwdlqpptjpeeyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
);

const SLP_DOMAIN = '@slpalaska.com';

const LESSON_CATEGORIES = [
  'All Categories',
  'Procedures & Processes',
  'Training & Competency',
  'Equipment & Tools',
  'Communication',
  'Hazard Recognition',
  'Risk Assessment',
  'PPE & Controls',
  'Supervision',
  'Human Factors',
  'Environmental',
  'Emergency Response',
  'Other'
];

const PSIF_DISPLAY = {
  'SIF-Actual': { bg: '#1f2937', text: '#fff', icon: '⚫' },
  'PSIF-Critical': { bg: '#dc2626', text: '#fff', icon: '🔴' },
  'PSIF-High': { bg: '#ea580c', text: '#fff', icon: '🟠' },
  'PSIF-Elevated': { bg: '#eab308', text: '#000', icon: '🟡' },
  'STKY-Controlled': { bg: '#22c55e', text: '#fff', icon: '🟢' },
  'Non-STKY': { bg: '#3b82f6', text: '#fff', icon: '🔵' }
};

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
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginBottom: '25px' },
  statCard: { background: '#f8fafc', borderRadius: '12px', padding: '20px', textAlign: 'center', border: '2px solid #e2e8f0' },
  statNumber: { fontSize: '32px', fontWeight: '700', marginBottom: '5px' },
  statLabel: { fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' },
  filterRow: { display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'flex-end' },
  filterGroup: { display: 'flex', flexDirection: 'column', gap: '5px' },
  filterLabel: { fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' },
  select: { padding: '10px 15px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', minWidth: '180px' },
  input: { width: '100%', padding: '12px 15px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box' },
  searchInput: { padding: '10px 15px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', minWidth: '250px' },
  lessonCard: { border: '2px solid #e2e8f0', borderRadius: '12px', padding: '20px', marginBottom: '15px', background: '#fffbeb', borderColor: '#fcd34d' },
  badge: { display: 'inline-block', padding: '4px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: '700' },
  actionBtn: { padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
  primaryBtn: { background: 'linear-gradient(135deg, #991b1b 0%, #c41e3a 100%)', color: 'white' },
  secondaryBtn: { background: '#1e3a8a', color: 'white' },
  successBtn: { background: '#059669', color: 'white' },
  outlineBtn: { background: 'white', color: '#1e3a8a', border: '2px solid #1e3a8a' },
  warningBtn: { background: '#f59e0b', color: 'white' },
  modal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalContent: { background: 'white', borderRadius: '16px', padding: '30px', maxWidth: '800px', width: '95%', maxHeight: '90vh', overflow: 'auto' },
  modalHeader: { fontSize: '20px', fontWeight: '700', color: '#1e293b', marginBottom: '20px' },
  footer: { textAlign: 'center', padding: '20px', color: 'white', fontSize: '13px' },
  submitBtn: { width: '100%', padding: '14px', background: 'linear-gradient(135deg, #991b1b 0%, #c41e3a 100%)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' },
  bulletinPreview: { border: '2px solid #1e3a8a', borderRadius: '12px', padding: '30px', background: 'white', fontFamily: 'Georgia, serif' },
  bulletinHeader: { textAlign: 'center', borderBottom: '3px solid #991b1b', paddingBottom: '20px', marginBottom: '20px' },
  bulletinSection: { marginBottom: '20px' },
  bulletinSectionTitle: { background: '#1e3a8a', color: 'white', padding: '8px 15px', borderRadius: '4px', fontSize: '14px', fontWeight: '700', marginBottom: '10px' },
  takeawayBox: { background: '#fef3c7', border: '2px solid #f59e0b', borderRadius: '8px', padding: '15px', marginTop: '15px' },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', cursor: 'pointer', fontSize: '14px' },
  formGroup: { marginBottom: '20px' },
  label: { display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1e293b', fontSize: '14px' },
  textarea: { width: '100%', padding: '12px 15px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '15px', minHeight: '80px', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }
};

function isSLPTeam(email) { return email && email.toLowerCase().endsWith(SLP_DOMAIN); }
function formatDate(d) { return d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'; }

export default function LessonsLearnedBulletins() {
  const [userEmail, setUserEmail] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState([]);
  const [stats, setStats] = useState({ total: 0, published: 0, pending: 0, categories: 0 });
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [selectedLessons, setSelectedLessons] = useState([]);
  const [bulletinTitle, setBulletinTitle] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('slp_user_email');
    if (saved && isSLPTeam(saved)) {
      setUserEmail(saved);
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAuthenticated) fetchLessons();
  }, [isAuthenticated, categoryFilter]);

  async function fetchLessons() {
    setLoading(true);
    try {
      let query = supabase
        .from('investigation_lessons_learned')
        .select(`
          *,
          incidents (
            incident_id,
            brief_description,
            incident_date,
            company_name,
            location_name,
            safety_severity,
            psif_classification,
            investigation_type
          )
        `)
        .order('created_at', { ascending: false });

      if (categoryFilter !== 'All Categories') {
        query = query.eq('lesson_category', categoryFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      let filtered = data || [];
      
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(l =>
          l.lesson_title?.toLowerCase().includes(q) ||
          l.lesson_description?.toLowerCase().includes(q) ||
          l.key_takeaway?.toLowerCase().includes(q) ||
          l.incidents?.incident_id?.toLowerCase().includes(q)
        );
      }

      setLessons(filtered);
      calculateStats(data || []);
    } catch (e) {
      console.error('Error fetching lessons:', e);
    }
    setLoading(false);
  }

  function calculateStats(data) {
    const categories = [...new Set(data.map(l => l.lesson_category).filter(Boolean))];
    setStats({
      total: data.length,
      published: data.filter(l => l.bulletin_generated).length,
      pending: data.filter(l => !l.bulletin_generated).length,
      categories: categories.length
    });
  }

  function handleLogin(e) {
    e.preventDefault();
    if (!loginEmail) { setLoginError('Please enter your email'); return; }
    if (!isSLPTeam(loginEmail)) { setLoginError('Access restricted to SLP Alaska team'); return; }
    localStorage.setItem('slp_user_email', loginEmail.toLowerCase());
    setUserEmail(loginEmail.toLowerCase());
    setIsAuthenticated(true);
  }

  function handleLogout() {
    localStorage.removeItem('slp_user_email');
    setUserEmail('');
    setIsAuthenticated(false);
  }

  function openPreview(lesson) {
    setSelectedLesson(lesson);
    setShowPreviewModal(true);
  }

  function toggleLessonSelection(lessonId) {
    setSelectedLessons(prev => 
      prev.includes(lessonId) 
        ? prev.filter(id => id !== lessonId)
        : [...prev, lessonId]
    );
  }

  function openCreateBulletin() {
    if (selectedLessons.length === 0) {
      alert('Please select at least one lesson');
      return;
    }
    const selected = lessons.filter(l => selectedLessons.includes(l.id));
    setBulletinTitle(`Safety Bulletin - ${formatDate(new Date())}`);
    setShowCreateModal(true);
  }

  async function generateBulletin() {
    setGenerating(true);
    try {
      const selected = lessons.filter(l => selectedLessons.includes(l.id));
      
      // Mark lessons as published
      for (const lesson of selected) {
        await supabase
          .from('investigation_lessons_learned')
          .update({
            bulletin_generated: true,
            bulletin_generated_date: new Date().toISOString()
          })
          .eq('id', lesson.id);
      }

      // Generate HTML bulletin
      const bulletinHtml = generateBulletinHtml(selected, bulletinTitle);
      
      // Open in new window for printing/saving as PDF
      const printWindow = window.open('', '_blank');
      printWindow.document.write(bulletinHtml);
      printWindow.document.close();

      setShowCreateModal(false);
      setSelectedLessons([]);
      fetchLessons();
      alert('Bulletin generated! Use your browser\'s Print function to save as PDF.');
    } catch (e) {
      alert('Error generating bulletin: ' + e.message);
    }
    setGenerating(false);
  }

  function generateBulletinHtml(selectedLessons, title) {
    const today = formatDate(new Date());
    
    return `
<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <style>
    @page { margin: 0.5in; }
    body { 
      font-family: Arial, sans-serif; 
      max-width: 8.5in; 
      margin: 0 auto; 
      padding: 20px;
      color: #1e293b;
      line-height: 1.5;
    }
    .header {
      text-align: center;
      border-bottom: 4px solid #991b1b;
      padding-bottom: 20px;
      margin-bottom: 25px;
    }
    .header img { max-width: 200px; margin-bottom: 10px; }
    .header h1 { 
      color: #991b1b; 
      font-size: 28px; 
      margin: 10px 0 5px;
      text-transform: uppercase;
    }
    .header .subtitle { color: #64748b; font-size: 14px; }
    .header .date { color: #1e3a8a; font-weight: bold; margin-top: 10px; }
    .lesson {
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 25px;
      page-break-inside: avoid;
    }
    .lesson-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 15px;
      flex-wrap: wrap;
      gap: 10px;
    }
    .lesson-number {
      background: #1e3a8a;
      color: white;
      padding: 5px 15px;
      border-radius: 20px;
      font-weight: bold;
      font-size: 12px;
    }
    .incident-ref {
      background: #f1f5f9;
      padding: 5px 12px;
      border-radius: 4px;
      font-size: 12px;
      color: #64748b;
    }
    .lesson-title {
      font-size: 18px;
      font-weight: bold;
      color: #1e293b;
      margin-bottom: 10px;
    }
    .lesson-description {
      margin-bottom: 15px;
      color: #475569;
    }
    .takeaway-box {
      background: #fef3c7;
      border: 2px solid #f59e0b;
      border-radius: 8px;
      padding: 15px;
    }
    .takeaway-label {
      font-size: 12px;
      font-weight: bold;
      color: #92400e;
      text-transform: uppercase;
      margin-bottom: 5px;
    }
    .takeaway-text {
      font-size: 15px;
      font-weight: 500;
      color: #78350f;
    }
    .severity-badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 4px;
      color: white;
      font-size: 11px;
      font-weight: bold;
    }
    .meta-row {
      display: flex;
      gap: 15px;
      font-size: 12px;
      color: #64748b;
      margin-top: 15px;
      flex-wrap: wrap;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 2px solid #e2e8f0;
      font-size: 12px;
      color: #64748b;
    }
    .footer strong { color: #1e3a8a; }
    @media print {
      body { padding: 0; }
      .lesson { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>💡 Safety Lessons Learned</h1>
    <div class="subtitle">SLP Alaska Incident Investigation System</div>
    <div class="date">${title} • Published: ${today}</div>
  </div>

  ${selectedLessons.map((lesson, index) => {
    const severityColor = SEVERITY_COLORS[lesson.incidents?.safety_severity] || '#64748b';
    return `
  <div class="lesson">
    <div class="lesson-header">
      <span class="lesson-number">LESSON #${index + 1}</span>
      <span class="incident-ref">
        ${lesson.incidents?.incident_id || 'N/A'} • 
        ${lesson.incidents?.company_name || ''} • 
        ${formatDate(lesson.incidents?.incident_date)}
      </span>
    </div>
    
    <div class="lesson-title">${lesson.lesson_title || 'Untitled Lesson'}</div>
    
    <div class="lesson-description">${lesson.lesson_description || ''}</div>
    
    ${lesson.key_takeaway ? `
    <div class="takeaway-box">
      <div class="takeaway-label">⚠️ Key Takeaway</div>
      <div class="takeaway-text">${lesson.key_takeaway}</div>
    </div>
    ` : ''}
    
    <div class="meta-row">
      ${lesson.incidents?.safety_severity ? `
        <span>Severity: <span class="severity-badge" style="background: ${severityColor}">${lesson.incidents.safety_severity}</span></span>
      ` : ''}
      ${lesson.incidents?.investigation_type ? `<span>Investigation: ${lesson.incidents.investigation_type}</span>` : ''}
      ${lesson.lesson_category ? `<span>Category: ${lesson.lesson_category}</span>` : ''}
    </div>
  </div>
    `;
  }).join('')}

  <div class="footer">
    <strong>SLP Alaska</strong> • Powered by Predictive Safety Analytics™<br>
    This bulletin is for internal distribution. Share with your team during safety meetings.
  </div>
</body>
</html>
    `;
  }

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div style={styles.container}>
        <div style={styles.wrapper}>
          <a href="/" style={{ display: 'inline-block', marginBottom: '15px', padding: '10px 20px', backgroundColor: '#1e3a5f', color: '#fff', textDecoration: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '500' }}>← Back to Portal</a>
          
          <div style={styles.loginCard}>
            <img src="/Logo.png" alt="SLP Alaska" style={{ maxWidth: '200px', margin: '0 auto 25px', display: 'block' }} />
            <h1 style={{ color: '#1e293b', marginBottom: '10px', fontSize: '24px' }}>Lessons Learned</h1>
            <p style={{ color: '#64748b', marginBottom: '30px' }}>Sign in to access lessons and generate bulletins</p>
            
            <form onSubmit={handleLogin}>
              <input
                type="email"
                placeholder="your.name@slpalaska.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                style={styles.input}
              />
              {loginError && <p style={{ color: '#dc2626', fontSize: '14px', marginBottom: '15px' }}>{loginError}</p>}
              <button type="submit" style={styles.submitBtn}>Sign In</button>
            </form>
            
            <p style={{ color: '#94a3b8', fontSize: '12px', marginTop: '25px' }}>
              Access restricted to @slpalaska.com
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Main Page
  return (
    <div style={styles.container}>
      <div style={styles.wrapper}>
        <a href="/" style={{ display: 'inline-block', marginBottom: '15px', padding: '10px 20px', backgroundColor: '#1e3a5f', color: '#fff', textDecoration: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '500' }}>← Back to Portal</a>
        
        <div style={styles.header}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
            <div>
              <img src="/Logo.png" alt="SLP Alaska" style={{ maxWidth: '150px', marginBottom: '10px' }} />
              <div style={styles.headerTitle}>💡 Lessons Learned Bulletins</div>
              <div style={styles.headerSubtitle}>Generate and distribute safety lessons from investigations</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>{userEmail}</div>
              <button onClick={handleLogout} style={{ ...styles.actionBtn, background: 'rgba(255,255,255,0.2)', color: 'white', marginTop: '10px', padding: '8px 16px' }}>
                Sign Out
              </button>
            </div>
          </div>
        </div>

        <div style={styles.card}>
          {/* Stats */}
          <div style={styles.statsRow}>
            <div style={styles.statCard}>
              <div style={{ ...styles.statNumber, color: '#1e3a8a' }}>{stats.total}</div>
              <div style={styles.statLabel}>Total Lessons</div>
            </div>
            <div style={{ ...styles.statCard, borderColor: '#22c55e' }}>
              <div style={{ ...styles.statNumber, color: '#22c55e' }}>{stats.published}</div>
              <div style={styles.statLabel}>Published</div>
            </div>
            <div style={{ ...styles.statCard, borderColor: '#f59e0b' }}>
              <div style={{ ...styles.statNumber, color: '#f59e0b' }}>{stats.pending}</div>
              <div style={styles.statLabel}>Pending</div>
            </div>
            <div style={{ ...styles.statCard, borderColor: '#8b5cf6' }}>
              <div style={{ ...styles.statNumber, color: '#8b5cf6' }}>{stats.categories}</div>
              <div style={styles.statLabel}>Categories</div>
            </div>
          </div>

          {/* Filters & Actions */}
          <div style={styles.filterRow}>
            <div style={styles.filterGroup}>
              <span style={styles.filterLabel}>Category</span>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={styles.select}>
                {LESSON_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            
            <div style={styles.filterGroup}>
              <span style={styles.filterLabel}>Search</span>
              <input
                type="text"
                placeholder="Search lessons..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyUp={(e) => e.key === 'Enter' && fetchLessons()}
                style={styles.searchInput}
              />
            </div>
            
            <div style={{ ...styles.filterGroup, marginLeft: 'auto' }}>
              <span style={styles.filterLabel}>&nbsp;</span>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={fetchLessons} style={{ ...styles.actionBtn, ...styles.secondaryBtn }}>
                  🔄 Refresh
                </button>
                <button 
                  onClick={openCreateBulletin} 
                  disabled={selectedLessons.length === 0}
                  style={{ 
                    ...styles.actionBtn, 
                    ...styles.primaryBtn,
                    opacity: selectedLessons.length === 0 ? 0.5 : 1
                  }}
                >
                  📄 Generate Bulletin ({selectedLessons.length})
                </button>
              </div>
            </div>
          </div>

          {/* Select All */}
          {lessons.length > 0 && (
            <div style={{ marginBottom: '15px', display: 'flex', gap: '15px', alignItems: 'center' }}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={selectedLessons.length === lessons.length}
                  onChange={() => {
                    if (selectedLessons.length === lessons.length) {
                      setSelectedLessons([]);
                    } else {
                      setSelectedLessons(lessons.map(l => l.id));
                    }
                  }}
                  style={{ width: '18px', height: '18px' }}
                />
                Select All ({lessons.length})
              </label>
              {selectedLessons.length > 0 && (
                <span style={{ color: '#64748b', fontSize: '14px' }}>
                  {selectedLessons.length} selected
                </span>
              )}
            </div>
          )}

          {/* Lessons List */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
              <p>Loading lessons...</p>
            </div>
          ) : lessons.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
              <div style={{ fontSize: '48px', marginBottom: '15px' }}>💡</div>
              <p>No lessons found</p>
              <p style={{ fontSize: '13px' }}>Lessons are created during incident investigations</p>
            </div>
          ) : (
            lessons.map(lesson => {
              const psifDisplay = PSIF_DISPLAY[lesson.incidents?.psif_classification] || {};
              const isSelected = selectedLessons.includes(lesson.id);
              
              return (
                <div 
                  key={lesson.id} 
                  style={{ 
                    ...styles.lessonCard,
                    borderColor: isSelected ? '#1e3a8a' : '#fcd34d',
                    background: isSelected ? '#eff6ff' : '#fffbeb'
                  }}
                >
                  <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleLessonSelection(lesson.id)}
                      style={{ width: '20px', height: '20px', marginTop: '3px', cursor: 'pointer' }}
                    />
                    
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: '700', fontSize: '16px' }}>💡 {lesson.lesson_title}</span>
                            {lesson.bulletin_generated && (
                              <span style={{ ...styles.badge, background: '#dcfce7', color: '#166534' }}>
                                ✓ Published
                              </span>
                            )}
                            {lesson.lesson_category && (
                              <span style={{ ...styles.badge, background: '#e0e7ff', color: '#3730a3' }}>
                                {lesson.lesson_category}
                              </span>
                            )}
                          </div>
                          {lesson.incidents && (
                            <div style={{ fontSize: '13px', color: '#64748b' }}>
                              <a href={`/investigation-workbench/${lesson.incident_id}`} style={{ color: '#1e3a8a', textDecoration: 'none' }}>
                                {lesson.incidents.incident_id}
                              </a>
                              {' • '}{lesson.incidents.company_name} • {lesson.incidents.location_name} • {formatDate(lesson.incidents.incident_date)}
                              {lesson.incidents.safety_severity && (
                                <span style={{ 
                                  ...styles.badge, 
                                  background: SEVERITY_COLORS[lesson.incidents.safety_severity],
                                  color: 'white',
                                  marginLeft: '10px'
                                }}>
                                  Sev {lesson.incidents.safety_severity}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <button 
                          onClick={() => openPreview(lesson)} 
                          style={{ ...styles.actionBtn, ...styles.outlineBtn, padding: '6px 12px', fontSize: '12px' }}
                        >
                          👁️ Preview
                        </button>
                      </div>

                      <p style={{ margin: '0 0 10px', color: '#475569' }}>{lesson.lesson_description}</p>

                      {lesson.key_takeaway && (
                        <div style={styles.takeawayBox}>
                          <div style={{ fontSize: '11px', fontWeight: '700', color: '#92400e', marginBottom: '5px' }}>⚠️ KEY TAKEAWAY</div>
                          <div style={{ color: '#78350f', fontWeight: '500' }}>{lesson.key_takeaway}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div style={styles.footer}>
          <span style={{ fontWeight: '500' }}>Powered by Predictive Safety Analytics™</span> | © 2025 SLP Alaska
        </div>
      </div>

      {/* Preview Modal */}
      {showPreviewModal && selectedLesson && (
        <div style={styles.modal} onClick={() => setShowPreviewModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>Lesson Preview</div>
            
            <div style={styles.bulletinPreview}>
              <div style={styles.bulletinHeader}>
                <h2 style={{ color: '#991b1b', margin: '0 0 5px' }}>💡 Safety Lesson Learned</h2>
                <div style={{ color: '#64748b', fontSize: '14px' }}>
                  {selectedLesson.incidents?.incident_id} • {formatDate(selectedLesson.incidents?.incident_date)}
                </div>
              </div>

              <h3 style={{ color: '#1e293b', marginBottom: '15px' }}>{selectedLesson.lesson_title}</h3>
              
              <p style={{ color: '#475569', marginBottom: '20px', lineHeight: '1.6' }}>
                {selectedLesson.lesson_description}
              </p>

              {selectedLesson.key_takeaway && (
                <div style={styles.takeawayBox}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#92400e', marginBottom: '5px' }}>⚠️ KEY TAKEAWAY</div>
                  <div style={{ color: '#78350f', fontWeight: '500', fontSize: '15px' }}>{selectedLesson.key_takeaway}</div>
                </div>
              )}

              <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #e2e8f0', fontSize: '13px', color: '#64748b' }}>
                <strong>Incident:</strong> {selectedLesson.incidents?.brief_description}<br />
                <strong>Company:</strong> {selectedLesson.incidents?.company_name} • <strong>Location:</strong> {selectedLesson.incidents?.location_name}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button onClick={() => setShowPreviewModal(false)} style={{ ...styles.actionBtn, ...styles.outlineBtn }}>
                Close
              </button>
              <button 
                onClick={() => {
                  setSelectedLessons([selectedLesson.id]);
                  setShowPreviewModal(false);
                  openCreateBulletin();
                }} 
                style={{ ...styles.actionBtn, ...styles.primaryBtn }}
              >
                Generate Bulletin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Bulletin Modal */}
      {showCreateModal && (
        <div style={styles.modal} onClick={() => setShowCreateModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>Generate Safety Bulletin</div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Bulletin Title</label>
              <input
                type="text"
                value={bulletinTitle}
                onChange={(e) => setBulletinTitle(e.target.value)}
                style={styles.input}
              />
            </div>

            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
              <strong>Selected Lessons ({selectedLessons.length})</strong>
              <ul style={{ margin: '10px 0 0', paddingLeft: '20px' }}>
                {lessons.filter(l => selectedLessons.includes(l.id)).map(l => (
                  <li key={l.id} style={{ marginBottom: '5px' }}>{l.lesson_title}</li>
                ))}
              </ul>
            </div>

            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>
              This will generate a printable bulletin. Use your browser's Print function (Ctrl+P) to save as PDF.
            </p>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowCreateModal(false)} style={{ ...styles.actionBtn, ...styles.outlineBtn }}>
                Cancel
              </button>
              <button 
                onClick={generateBulletin} 
                disabled={generating}
                style={{ ...styles.actionBtn, ...styles.primaryBtn, opacity: generating ? 0.6 : 1 }}
              >
                {generating ? 'Generating...' : '📄 Generate & Print'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

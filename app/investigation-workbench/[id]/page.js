'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function InvestigationWorkbench() {
  const { id } = useParams();
  const [userEmail, setUserEmail] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Overview');
  
  // Investigation Data State
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [witnesses, setWitnesses] = useState([]);
  const [correctiveActions, setCorrectiveActions] = useState([]);
  const [lessonsLearned, setLessonsLearned] = useState([]);
  const [localReview, setLocalReview] = useState('');
  const [fiveWhy, setFiveWhy] = useState('');
  const [rcaAnalysis, setRcaAnalysis] = useState('');
  
  // Evidence Upload State
  const [showEvidenceUpload, setShowEvidenceUpload] = useState(false);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [newEvidence, setNewEvidence] = useState({
    type: 'Photo',
    description: '',
    files: []
  });

  // New Entry States
  const [newTimelineEvent, setNewTimelineEvent] = useState({ date: '', time: '', description: '', critical: false });
  const [newWitness, setNewWitness] = useState({ name: '', position: '', company: '', statement: '' });
  const [newCA, setNewCA] = useState({ action: '', hierarchy: 'Elimination', owner: '', dueDate: '', status: 'Open' });
  const [newLesson, setNewLesson] = useState({ title: '', description: '', keyTakeaway: '' });

  useEffect(() => {
    const savedEmail = localStorage.getItem('slp_investigator_email');
    if (savedEmail && savedEmail.endsWith('@slpalaska.com')) {
      setUserEmail(savedEmail);
      setAuthenticated(true);
      loadIncident();
    } else {
      setLoading(false);
    }
  }, []);

  async function loadIncident() {
    try {
      console.log('Loading incident with ID:', id);
      
      const { data, error } = await supabase
        .from('incidents')
        .select('*')
        .eq('id', id)
        .single();

      console.log('Supabase response:', { data, error });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      if (!data) {
        throw new Error('No incident found with this ID');
      }
      
      console.log('Incident loaded successfully:', data);
      
      setIncident(data);
      setTimelineEvents(data.timeline || []);
      setEvidence(data.evidence || []);
      setWitnesses(data.witnesses || []);
      setCorrectiveActions(data.corrective_actions || []);
      setLessonsLearned(data.lessons_learned || []);
      setLocalReview(data.local_review || '');
      setFiveWhy(data.five_why || '');
      setRcaAnalysis(data.rca_analysis || '');
    } catch (error) {
      console.error('Error loading incident:', error);
      alert('Error loading incident: ' + error.message + '\n\nCheck browser console (F12) for details');
      setIncident(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    if (userEmail.endsWith('@slpalaska.com')) {
      localStorage.setItem('slp_investigator_email', userEmail);
      setAuthenticated(true);
      loadIncident();
    } else {
      alert('Access restricted to @slpalaska.com email addresses');
    }
  }

  async function updateIncident(field, value) {
    try {
      const { error } = await supabase
        .from('incidents')
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating incident:', error);
      alert('Error updating: ' + error.message);
    }
  }

  async function updateStatus(newStatus) {
    try {
      const { error } = await supabase
        .from('incidents')
        .update({ 
          status: newStatus, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', id);

      if (error) throw error;
      setIncident({ ...incident, status: newStatus });
      alert(`Investigation status updated to: ${newStatus}`);
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error updating status: ' + error.message);
    }
  }

  // Timeline Functions
  function addTimelineEvent() {
    if (!newTimelineEvent.date || !newTimelineEvent.description) {
      alert('Please fill in date and description');
      return;
    }
    const updated = [...timelineEvents, { ...newTimelineEvent, id: Date.now() }];
    setTimelineEvents(updated);
    updateIncident('timeline', updated);
    setNewTimelineEvent({ date: '', time: '', description: '', critical: false });
  }

  // Evidence Upload Function
  async function uploadEvidence() {
    if (!newEvidence.files.length) return;
    
    setUploadingEvidence(true);
    try {
      const uploadedItems = [];
      
      for (const file of newEvidence.files) {
        // Create unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase
          .storage
          .from('incident-evidence')
          .upload(fileName, file);
        
        if (uploadError) throw uploadError;
        
        // Get public URL
        const { data: { publicUrl } } = supabase
          .storage
          .from('incident-evidence')
          .getPublicUrl(fileName);
        
        uploadedItems.push({
          type: newEvidence.type,
          description: newEvidence.description,
          url: publicUrl,
          filename: file.name,
          uploaded_by: userEmail,
          uploaded_at: new Date().toISOString(),
          source: 'workbench'
        });
      }
      
      // Update incident evidence array in database
      const updatedEvidence = [...evidence, ...uploadedItems];
      
      const { error: updateError } = await supabase
        .from('incidents')
        .update({ 
          evidence: updatedEvidence,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (updateError) throw updateError;
      
      // Update local state
      setEvidence(updatedEvidence);
      
      // Reset form
      setNewEvidence({ type: 'Photo', description: '', files: [] });
      setShowEvidenceUpload(false);
      
      alert('Evidence uploaded successfully!');
      
    } catch (error) {
      console.error('Error uploading evidence:', error);
      alert('Error uploading evidence: ' + error.message);
    } finally {
      setUploadingEvidence(false);
    }
  }

  // Witness Functions
  function addWitness() {
    if (!newWitness.name || !newWitness.statement) {
      alert('Please fill in name and statement');
      return;
    }
    const updated = [...witnesses, { ...newWitness, id: Date.now() }];
    setWitnesses(updated);
    updateIncident('witnesses', updated);
    setNewWitness({ name: '', position: '', company: '', statement: '' });
  }

  // Corrective Action Functions
  function addCorrectiveAction() {
    if (!newCA.action || !newCA.owner) {
      alert('Please fill in action and owner');
      return;
    }
    const updated = [...correctiveActions, { ...newCA, id: Date.now() }];
    setCorrectiveActions(updated);
    updateIncident('corrective_actions', updated);
    setNewCA({ action: '', hierarchy: 'Elimination', owner: '', dueDate: '', status: 'Open' });
  }

  // Lessons Learned Functions
  function addLesson() {
    if (!newLesson.title || !newLesson.description) {
      alert('Please fill in title and description');
      return;
    }
    const updated = [...lessonsLearned, { ...newLesson, id: Date.now() }];
    setLessonsLearned(updated);
    updateIncident('lessons_learned', updated);
    setNewLesson({ title: '', description: '', keyTakeaway: '' });
  }

  const styles = {
    container: { minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
    card: { background: 'white', borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', maxWidth: '1400px', margin: '0 auto', overflow: 'hidden' },
    header: { background: 'linear-gradient(135deg, #1e40af 0%, #7c3aed 100%)', color: 'white', padding: '30px', textAlign: 'center' },
    tabBar: { display: 'flex', borderBottom: '2px solid #e2e8f0', background: '#f8fafc', overflowX: 'auto' },
    tab: { padding: '15px 25px', cursor: 'pointer', fontWeight: '500', whiteSpace: 'nowrap', transition: 'all 0.2s' },
    activeTab: { borderBottom: '3px solid #3b82f6', color: '#3b82f6', background: 'white' },
    content: { padding: '30px' },
    input: { width: '100%', padding: '12px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' },
    primaryBtn: { background: '#3b82f6', color: 'white', padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '500' },
    secondaryBtn: { background: '#8b5cf6', color: 'white' },
    outlineBtn: { background: 'white', color: '#3b82f6', border: '2px solid #3b82f6' },
    actionBtn: { padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '500', fontSize: '14px' },
    footer: { background: '#1e293b', color: 'white', padding: '20px', textAlign: 'center' }
  };

  if (loading) {
    return (
      <div style={{ ...styles.container, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'white', fontSize: '24px' }}>Loading investigation...</div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div style={{ ...styles.container, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ ...styles.card, maxWidth: '500px', padding: '40px' }}>
          <h2 style={{ marginBottom: '20px', color: '#1e293b' }}>🔐 Investigation Workbench Access</h2>
          <p style={{ marginBottom: '30px', color: '#64748b' }}>Enter your SLP Alaska email to access the investigation system</p>
          <form onSubmit={handleLogin}>
            <input
              type="email"
              placeholder="your.name@slpalaska.com"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              style={{ ...styles.input, marginBottom: '20px' }}
              required
            />
            <button type="submit" style={{ ...styles.primaryBtn, width: '100%' }}>Access Workbench</button>
          </form>
        </div>
      </div>
    );
  }

  if (!incident) {
    return (
      <div style={{ ...styles.container, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'white', fontSize: '24px' }}>Incident not found</div>
      </div>
    );
  }

  const tabs = ['Overview', 'Timeline', 'Evidence', 'Witnesses', 'Analysis', 'Corrective Actions', 'Lessons Learned', 'Review & Approve'];

  return (
    <div style={styles.container}>
      <div style={{ padding: '40px 20px' }}>
        <div style={styles.card}>
          <div style={styles.header}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', marginBottom: '10px' }}>
              <img 
                src="/Logo.png" 
                alt="SLP Alaska" 
                style={{ height: '50px' }}
              />
              <h1 style={{ margin: 0, fontSize: '32px' }}>🔍 Investigation Workbench</h1>
            </div>
            <p style={{ margin: '10px 0 0 0', opacity: 0.9 }}>{incident.incident_id} | {incident.investigation_type}</p>
          </div>

          <div style={styles.tabBar}>
            {tabs.map(tab => (
              <div
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  ...styles.tab,
                  ...(activeTab === tab ? styles.activeTab : {})
                }}
              >
                {tab}
              </div>
            ))}
          </div>

          <div style={styles.content}>
            {/* OVERVIEW TAB */}
            {activeTab === 'Overview' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '30px' }}>
                  <div>
                    <h3>Incident Summary</h3>
                    <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px' }}>
                      <div style={{ marginBottom: '15px' }}>
                        <strong>Location:</strong> {incident.location_name || 'Not specified'}
                      </div>
                      <div style={{ marginBottom: '15px' }}>
                        <strong>Date/Time:</strong> {incident.incident_date ? new Date(incident.incident_date).toLocaleString() : 'Not specified'}
                      </div>
                      <div style={{ marginBottom: '15px' }}>
                        <strong>Description:</strong> {incident.brief_description || incident.detailed_description || 'No description provided'}
                      </div>
                      <div style={{ marginBottom: '15px' }}>
                        <strong>Severity:</strong>{' '}
                        {incident.safety_severity ? (
                          <span style={{ 
                            background: incident.safety_severity === 'A' || incident.safety_severity === 'B' ? '#fee2e2' : 
                                       incident.safety_severity === 'C' || incident.safety_severity === 'D' ? '#fef3c7' : '#dbeafe',
                            color: incident.safety_severity === 'A' || incident.safety_severity === 'B' ? '#dc2626' : 
                                  incident.safety_severity === 'C' || incident.safety_severity === 'D' ? '#d97706' : '#2563eb',
                            padding: '4px 12px',
                            borderRadius: '6px',
                            fontWeight: '500'
                          }}>
                            {incident.safety_severity} - {incident.safety_severity_description}
                          </span>
                        ) : 'Not specified'}
                      </div>
                      <div>
                        <strong>PSIF Classification:</strong> {incident.psif_classification || 'Not classified'}
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3>Investigation Progress</h3>
                    <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px' }}>
                      <div style={{ marginBottom: '15px' }}>
                        <strong>Status:</strong> {incident.status}
                      </div>
                      <div style={{ marginBottom: '15px' }}>
                        <strong>Timeline Events:</strong> {timelineEvents.length}
                      </div>
                      <div style={{ marginBottom: '15px' }}>
                        <strong>Evidence Items:</strong> {evidence.length}
                      </div>
                      <div style={{ marginBottom: '15px' }}>
                        <strong>Witnesses:</strong> {witnesses.length}
                      </div>
                      <div style={{ marginBottom: '15px' }}>
                        <strong>Corrective Actions:</strong> {correctiveActions.length}
                      </div>
                      <div>
                        <strong>Lessons:</strong> {lessonsLearned.length}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TIMELINE TAB */}
            {activeTab === 'Timeline' && (
              <div>
                <h3>Investigation Timeline</h3>
                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr auto', gap: '10px', marginBottom: '15px' }}>
                    <input
                      type="date"
                      value={newTimelineEvent.date}
                      onChange={(e) => setNewTimelineEvent({ ...newTimelineEvent, date: e.target.value })}
                      style={styles.input}
                    />
                    <input
                      type="time"
                      value={newTimelineEvent.time}
                      onChange={(e) => setNewTimelineEvent({ ...newTimelineEvent, time: e.target.value })}
                      style={styles.input}
                    />
                    <input
                      placeholder="Event description"
                      value={newTimelineEvent.description}
                      onChange={(e) => setNewTimelineEvent({ ...newTimelineEvent, description: e.target.value })}
                      style={styles.input}
                    />
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}>
                      <input
                        type="checkbox"
                        checked={newTimelineEvent.critical}
                        onChange={(e) => setNewTimelineEvent({ ...newTimelineEvent, critical: e.target.checked })}
                      />
                      Critical
                    </label>
                  </div>
                  <button onClick={addTimelineEvent} style={styles.primaryBtn}>+ Add Event</button>
                </div>
                <div style={{ display: 'grid', gap: '15px' }}>
                  {timelineEvents.sort((a, b) => new Date(a.date + ' ' + (a.time || '00:00')) - new Date(b.date + ' ' + (b.time || '00:00'))).map((event, i) => (
                    <div key={i} style={{ 
                      background: event.critical ? '#fef3c7' : 'white', 
                      border: event.critical ? '2px solid #f59e0b' : '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '15px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <strong>{event.date} {event.time && `at ${event.time}`}</strong>
                        {event.critical && <span style={{ color: '#f59e0b', fontWeight: '500' }}>⚠️ Critical Event</span>}
                      </div>
                      <p style={{ margin: 0 }}>{event.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* EVIDENCE TAB - WITH UPLOAD */}
            {activeTab === 'Evidence' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3>Evidence Collection</h3>
                  <button 
                    onClick={() => setShowEvidenceUpload(!showEvidenceUpload)}
                    style={{ ...styles.primaryBtn, padding: '10px 20px' }}
                  >
                    {showEvidenceUpload ? 'Cancel' : '+ Add Evidence'}
                  </button>
                </div>

                {/* Evidence Upload Form */}
                {showEvidenceUpload && (
                  <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
                    <h4>Upload New Evidence</h4>
                    <div style={{ display: 'grid', gap: '15px' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Evidence Type</label>
                        <select 
                          value={newEvidence.type}
                          onChange={(e) => setNewEvidence({...newEvidence, type: e.target.value})}
                          style={styles.input}
                        >
                          <option value="Photo">Photo</option>
                          <option value="Document">Document</option>
                          <option value="Video">Video</option>
                          <option value="Report">Report</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      
                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Description</label>
                        <textarea
                          value={newEvidence.description}
                          onChange={(e) => setNewEvidence({...newEvidence, description: e.target.value})}
                          placeholder="Describe this evidence..."
                          style={{ ...styles.input, minHeight: '80px', resize: 'vertical' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Select File(s)</label>
                        <input
                          type="file"
                          multiple
                          accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
                          onChange={(e) => setNewEvidence({...newEvidence, files: Array.from(e.target.files)})}
                          style={{ ...styles.input, padding: '10px' }}
                        />
                        {newEvidence.files.length > 0 && (
                          <div style={{ marginTop: '10px', fontSize: '14px', color: '#64748b' }}>
                            {newEvidence.files.length} file(s) selected
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button 
                          onClick={uploadEvidence}
                          disabled={uploadingEvidence || !newEvidence.files.length}
                          style={{ 
                            ...styles.primaryBtn, 
                            opacity: uploadingEvidence || !newEvidence.files.length ? 0.5 : 1,
                            cursor: uploadingEvidence || !newEvidence.files.length ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {uploadingEvidence ? 'Uploading...' : 'Upload Evidence'}
                        </button>
                        <button 
                          onClick={() => {
                            setShowEvidenceUpload(false);
                            setNewEvidence({ type: 'Photo', description: '', files: [] });
                          }}
                          style={styles.outlineBtn}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Evidence Display */}
                <div style={{ display: 'grid', gap: '15px' }}>
                  {evidence.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                      No evidence uploaded yet. Click "Add Evidence" to upload files.
                    </div>
                  ) : (
                    evidence.map((item, i) => (
                      <div key={i} style={{ 
                        background: 'white', 
                        border: '1px solid #e2e8f0', 
                        borderRadius: '8px', 
                        padding: '15px',
                        display: 'flex',
                        gap: '15px'
                      }}>
                        {/* Preview */}
                        <div style={{ 
                          width: '120px', 
                          height: '120px', 
                          borderRadius: '8px', 
                          overflow: 'hidden',
                          flexShrink: 0,
                          background: '#f1f5f9',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {item.url && item.type === 'Photo' ? (
                            <img 
                              src={item.url} 
                              alt={item.description} 
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <div style={{ fontSize: '48px', color: '#94a3b8' }}>
                              {item.type === 'Document' ? '📄' : 
                               item.type === 'Video' ? '🎥' : 
                               item.type === 'Report' ? '📊' : '📎'}
                            </div>
                          )}
                        </div>

                        {/* Details */}
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                            <div>
                              <span style={{ 
                                background: '#dbeafe', 
                                color: '#1e40af', 
                                padding: '4px 12px', 
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '500'
                              }}>
                                {item.type}
                              </span>
                              {item.source === 'initial_report' && (
                                <span style={{ 
                                  marginLeft: '8px',
                                  background: '#f3e8ff', 
                                  color: '#7c3aed', 
                                  padding: '4px 12px', 
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: '500'
                                }}>
                                  Initial Report
                                </span>
                              )}
                            </div>
                            {item.url && (
                              <a 
                                href={item.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '14px' }}
                              >
                                View/Download →
                              </a>
                            )}
                          </div>
                          
                          <p style={{ margin: '10px 0', color: '#334155' }}>
                            {item.description || 'No description provided'}
                          </p>
                          
                          <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                            {item.uploaded_by && `Uploaded by ${item.uploaded_by} • `}
                            {item.uploaded_at && new Date(item.uploaded_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* WITNESSES TAB */}
            {activeTab === 'Witnesses' && (
              <div>
                <h3>Witness Statements</h3>
                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '15px' }}>
                    <input
                      placeholder="Witness Name"
                      value={newWitness.name}
                      onChange={(e) => setNewWitness({ ...newWitness, name: e.target.value })}
                      style={styles.input}
                    />
                    <input
                      placeholder="Position/Title"
                      value={newWitness.position}
                      onChange={(e) => setNewWitness({ ...newWitness, position: e.target.value })}
                      style={styles.input}
                    />
                    <input
                      placeholder="Company"
                      value={newWitness.company}
                      onChange={(e) => setNewWitness({ ...newWitness, company: e.target.value })}
                      style={styles.input}
                    />
                  </div>
                  <textarea
                    placeholder="Witness statement / What did they observe?"
                    value={newWitness.statement}
                    onChange={(e) => setNewWitness({ ...newWitness, statement: e.target.value })}
                    style={{ ...styles.input, minHeight: '100px', resize: 'vertical', marginBottom: '15px' }}
                  />
                  <button onClick={addWitness} style={styles.primaryBtn}>+ Add Witness</button>
                </div>
                <div style={{ display: 'grid', gap: '15px' }}>
                  {witnesses.map((witness, i) => (
                    <div key={i} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '15px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <strong>{witness.name}</strong>
                        <span style={{ color: '#64748b' }}>{witness.position} {witness.company && `- ${witness.company}`}</span>
                      </div>
                      <p style={{ margin: 0, color: '#334155' }}>{witness.statement}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ANALYSIS TAB */}
            {activeTab === 'Analysis' && (
              <div>
                <h3>Investigation Analysis</h3>
                {incident.investigation_type === 'Local Review' && (
                  <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px' }}>
                    <h4>Local Review Questions</h4>
                    <textarea
                      placeholder="What happened? What were the immediate causes? What should we do differently?"
                      value={localReview}
                      onChange={(e) => {
                        setLocalReview(e.target.value);
                        updateIncident('local_review', e.target.value);
                      }}
                      style={{ ...styles.input, minHeight: '200px', resize: 'vertical' }}
                    />
                  </div>
                )}
                {incident.investigation_type === '5-Why Analysis' && (
                  <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px' }}>
                    <h4>5-Why Analysis</h4>
                    <textarea
                      placeholder="Why did this happen? (Drill down 5 times)"
                      value={fiveWhy}
                      onChange={(e) => {
                        setFiveWhy(e.target.value);
                        updateIncident('five_why', e.target.value);
                      }}
                      style={{ ...styles.input, minHeight: '300px', resize: 'vertical' }}
                    />
                  </div>
                )}
                {incident.investigation_type === 'Full RCA' && (
                  <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px' }}>
                    <h4>Root Cause Analysis</h4>
                    <p style={{ marginBottom: '15px', color: '#64748b' }}>
                      Analyze contributing factors across: Equipment, Environment, Materials, Methods, People, Management, Communication, Training, Procedures, Organizational Culture
                    </p>
                    <textarea
                      placeholder="Full RCA findings and root causes..."
                      value={rcaAnalysis}
                      onChange={(e) => {
                        setRcaAnalysis(e.target.value);
                        updateIncident('rca_analysis', e.target.value);
                      }}
                      style={{ ...styles.input, minHeight: '400px', resize: 'vertical' }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* CORRECTIVE ACTIONS TAB */}
            {activeTab === 'Corrective Actions' && (
              <div>
                <h3>Corrective Actions</h3>
                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
                  <textarea
                    placeholder="Corrective action description"
                    value={newCA.action}
                    onChange={(e) => setNewCA({ ...newCA, action: e.target.value })}
                    style={{ ...styles.input, minHeight: '80px', resize: 'vertical', marginBottom: '15px' }}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px', marginBottom: '15px' }}>
                    <select
                      value={newCA.hierarchy}
                      onChange={(e) => setNewCA({ ...newCA, hierarchy: e.target.value })}
                      style={styles.input}
                    >
                      <option value="Elimination">Elimination</option>
                      <option value="Substitution">Substitution</option>
                      <option value="Engineering">Engineering Controls</option>
                      <option value="Administrative">Administrative</option>
                      <option value="PPE">PPE</option>
                    </select>
                    <input
                      placeholder="Action Owner"
                      value={newCA.owner}
                      onChange={(e) => setNewCA({ ...newCA, owner: e.target.value })}
                      style={styles.input}
                    />
                    <input
                      type="date"
                      value={newCA.dueDate}
                      onChange={(e) => setNewCA({ ...newCA, dueDate: e.target.value })}
                      style={styles.input}
                    />
                    <select
                      value={newCA.status}
                      onChange={(e) => setNewCA({ ...newCA, status: e.target.value })}
                      style={styles.input}
                    >
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                  <button onClick={addCorrectiveAction} style={styles.primaryBtn}>+ Add Corrective Action</button>
                </div>
                <div style={{ display: 'grid', gap: '15px' }}>
                  {correctiveActions.map((ca, i) => (
                    <div key={i} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '15px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <div>
                          <span style={{ 
                            background: '#dbeafe', 
                            color: '#1e40af', 
                            padding: '4px 12px', 
                            borderRadius: '6px',
                            fontSize: '12px',
                            marginRight: '8px'
                          }}>
                            {ca.hierarchy}
                          </span>
                          <span style={{ 
                            background: ca.status === 'Completed' ? '#dcfce7' : ca.status === 'In Progress' ? '#fef3c7' : '#fee2e2',
                            color: ca.status === 'Completed' ? '#15803d' : ca.status === 'In Progress' ? '#d97706' : '#dc2626',
                            padding: '4px 12px', 
                            borderRadius: '6px',
                            fontSize: '12px'
                          }}>
                            {ca.status}
                          </span>
                        </div>
                        <span style={{ color: '#64748b' }}>Due: {ca.dueDate}</span>
                      </div>
                      <p style={{ margin: '10px 0', color: '#334155' }}>{ca.action}</p>
                      <div style={{ fontSize: '13px', color: '#64748b' }}>Owner: {ca.owner}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* LESSONS LEARNED TAB */}
            {activeTab === 'Lessons Learned' && (
              <div>
                <h3>Lessons Learned</h3>
                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
                  <input
                    placeholder="Lesson Title"
                    value={newLesson.title}
                    onChange={(e) => setNewLesson({ ...newLesson, title: e.target.value })}
                    style={{ ...styles.input, marginBottom: '15px' }}
                  />
                  <textarea
                    placeholder="Detailed description of the lesson"
                    value={newLesson.description}
                    onChange={(e) => setNewLesson({ ...newLesson, description: e.target.value })}
                    style={{ ...styles.input, minHeight: '100px', resize: 'vertical', marginBottom: '15px' }}
                  />
                  <input
                    placeholder="Key Takeaway (one sentence)"
                    value={newLesson.keyTakeaway}
                    onChange={(e) => setNewLesson({ ...newLesson, keyTakeaway: e.target.value })}
                    style={{ ...styles.input, marginBottom: '15px' }}
                  />
                  <button onClick={addLesson} style={styles.primaryBtn}>+ Add Lesson</button>
                </div>
                <div style={{ display: 'grid', gap: '15px' }}>
                  {lessonsLearned.map((lesson, i) => (
                    <div key={i} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '15px' }}>
                      <h4 style={{ marginTop: 0, color: '#1e40af' }}>{lesson.title}</h4>
                      <p style={{ margin: '10px 0', color: '#334155' }}>{lesson.description}</p>
                      {lesson.keyTakeaway && (
                        <div style={{ background: '#fef3c7', padding: '10px', borderRadius: '6px', marginTop: '10px' }}>
                          <strong>Key Takeaway:</strong> {lesson.keyTakeaway}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* REVIEW & APPROVE TAB */}
            {activeTab === 'Review & Approve' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
                  <div>
                    <h3>Investigation Status</h3>
                    <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
                      <div style={{ marginBottom: '15px' }}>
                        <strong>Current Status:</strong>{' '}
                        <span style={{ 
                          background: '#dbeafe', 
                          color: '#1e40af', 
                          padding: '6px 15px', 
                          borderRadius: '8px',
                          fontWeight: '500'
                        }}>
                          {incident.status}
                        </span>
                      </div>
                    </div>
                    <h4>Status Actions</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                      {incident.status === 'Submitted - Awaiting Triage' && <button onClick={() => updateStatus('Triage - Investigation Required')} style={{ ...styles.actionBtn, ...styles.primaryBtn }}>Start Triage</button>}
                      {incident.status === 'Triage - Investigation Required' && <button onClick={() => updateStatus('Investigation - First Draft')} style={{ ...styles.actionBtn, ...styles.primaryBtn }}>Begin Investigation</button>}
                      {incident.status === 'Investigation - First Draft' && <button onClick={() => updateStatus('Under Review - Asset Input')} style={{ ...styles.actionBtn, ...styles.primaryBtn }}>Submit for Asset Review</button>}
                      {incident.status === 'Under Review - Asset Input' && <button onClick={() => updateStatus('Under Review - Final Review')} style={{ ...styles.actionBtn, ...styles.primaryBtn }}>Move to Final Review</button>}
                      {incident.status === 'Under Review - Final Review' && <button onClick={() => updateStatus('Pending Approval')} style={{ ...styles.actionBtn, ...styles.secondaryBtn }}>Submit for Approval</button>}
                      {incident.status === 'Pending Approval' && <><button onClick={() => updateStatus('Approved')} style={{ ...styles.actionBtn, ...styles.primaryBtn }}>✅ Approve</button><button onClick={() => updateStatus('Under Review - Final Review')} style={{ ...styles.actionBtn, ...styles.outlineBtn }}>Return for Revision</button></>}
                      {incident.status === 'Approved' && <button onClick={() => updateStatus('Closed')} style={{ ...styles.actionBtn, background: '#059669', color: 'white' }}>🔒 Close Investigation</button>}
                    </div>
                  </div>
                  <div>
                    <h3>Completion Checklist</h3>
                    <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px' }}>
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

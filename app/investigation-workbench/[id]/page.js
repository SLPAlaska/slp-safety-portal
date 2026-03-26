'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// ============================================================================
// ROOT CAUSE TAXONOMY (39 root causes in 10 categories)
// ============================================================================
const ROOT_CAUSE_TAXONOMY = {
  'Equipment/Tools': ['Defective equipment','Improper tool for task','Equipment not available','Equipment not maintained','Equipment design flaw'],
  'Procedures': ['No procedure exists','Procedure incomplete','Procedure not followed','Procedure outdated','Procedure unclear/confusing'],
  'Training': ['No training provided','Inadequate training','Training not current','On-the-job training insufficient'],
  'Human Factors': ['Fatigue','Complacency','Distraction','Rushing','Frustration','Line of fire awareness'],
  'Communication': ['No communication','Miscommunication','Language barrier','Shift handover failure'],
  'Supervision': ['Inadequate oversight','Supervisor not present','Failed to enforce standards'],
  'Design/Engineering': ['Facility design flaw','Inadequate engineering controls','Guard/barrier missing'],
  'Maintenance': ['Preventive maintenance missed','Corrective maintenance delayed','Maintenance procedure inadequate'],
  'Environmental': ['Weather conditions','Lighting','Noise','Temperature extremes','Surface conditions'],
  'Organizational/Culture': ['Production pressure','Inadequate staffing','Budget constraints','Safety culture deficiency']
};

// ============================================================================
// CAUSAL FACTOR TAXONOMY (16 factors in 3 groups)
// ============================================================================
const CAUSAL_FACTOR_TAXONOMY = {
  'Immediate Causes': ['Unsafe Act','Unsafe Condition','Human Error','Equipment Failure','Environmental Hazard'],
  'Contributing Factors': ['Inadequate Work Planning','Inadequate Hazard Assessment','Inadequate Communication','Inadequate Training/Competency','Insufficient Resources','Fatigue/Fitness for Duty'],
  'Systemic Factors': ['Management System Gap','Organizational Culture','Regulatory/Compliance Gap','Inadequate Change Management','Contractor Management Deficiency']
};

export default function InvestigationWorkbench() {
  const { id } = useParams();
  const [userEmail, setUserEmail] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Overview');
  const [saving, setSaving] = useState(false);
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [witnesses, setWitnesses] = useState([]);
  const [correctiveActions, setCorrectiveActions] = useState([]);
  const [lessonsLearned, setLessonsLearned] = useState([]);
  const [showEvidenceUpload, setShowEvidenceUpload] = useState(false);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [newEvidence, setNewEvidence] = useState({ type: 'Photo', description: '', files: [] });
  const [newTimelineEvent, setNewTimelineEvent] = useState({ event_date: '', event_time: '', event_description: '', critical: false });
  const [newWitness, setNewWitness] = useState({ witness_name: '', position_role: '', company: '', statement_summary: '' });
  const [newCA, setNewCA] = useState({ action_description: '', hierarchy_control: '1-Elimination', action_owner_name: '', action_owner_email: '', target_date: '', action_status: 'Open' });
  const [newLesson, setNewLesson] = useState({ lesson_title: '', lesson_description: '', key_takeaway: '' });
  const [editingTimeline, setEditingTimeline] = useState(null);
  const [editingWitness, setEditingWitness] = useState(null);
  const [editingCA, setEditingCA] = useState(null);
  const [editingLesson, setEditingLesson] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [incidentEdits, setIncidentEdits] = useState({});
  const [spellCheckResults, setSpellCheckResults] = useState(null);
  const [spellChecking, setSpellChecking] = useState(false);

  // ============================================================================
  // STRUCTURED ANALYSIS STATE
  // ============================================================================

  // Local Review - structured
  const [localReviewData, setLocalReviewData] = useState({
    what_happened: '',
    immediate_causes: '',
    do_differently: '',
    additional_notes: ''
  });

  // 5-Why Analysis - structured
  const [fiveWhyData, setFiveWhyData] = useState({
    problem_statement: '',
    why1: '', why2: '', why3: '', why4: '', why5: '',
    root_cause_category: '',
    root_cause_identified: '',
    causal_factors: [],
    team_leader: '',
    team_members: ''
  });

  // RCA - structured with 10 contributing factor categories
  const [rcaData, setRcaData] = useState({
    problem_statement: '',
    equipment_factors: '',
    procedure_factors: '',
    training_factors: '',
    human_factors: '',
    communication_factors: '',
    supervision_factors: '',
    design_factors: '',
    maintenance_factors: '',
    environmental_factors: '',
    organizational_factors: '',
    root_causes_identified: '',
    contributing_factors_summary: '',
    systemic_issues: '',
    recommendations: '',
    rca_method: 'Standard RCA',
    team_leader: '',
    team_members: ''
  });

  // Legacy plain text (for backward compatibility)
  const [localReview, setLocalReview] = useState('');
  const [fiveWhy, setFiveWhy] = useState('');
  const [rcaAnalysis, setRcaAnalysis] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('slp_investigator_email');
    if (saved && saved.endsWith('@slpalaska.com')) { setUserEmail(saved); setAuthenticated(true); loadAll(); }
    else setLoading(false);
  }, []);

  async function loadAll() {
    try {
      const { data: inc, error } = await supabase.from('incidents').select('*').eq('id', id).single();
      if (error) throw error;
      if (!inc) throw new Error('No incident found');
      setIncident(inc);
      const [tR, eR, wR, cR, lR, lrR, fwR, rcR] = await Promise.all([
        supabase.from('timeline_events').select('*').eq('incident_id', id).order('sequence_number'),
        supabase.from('investigation_evidence').select('*').eq('incident_id', id).order('evidence_number'),
        supabase.from('witness_statements').select('*').eq('incident_id', id).order('witness_number'),
        supabase.from('investigation_corrective_actions').select('*').eq('incident_id', id).order('action_number'),
        supabase.from('investigation_lessons_learned').select('*').eq('incident_id', id).order('lesson_number'),
        supabase.from('local_reviews').select('*').eq('incident_id', id).maybeSingle(),
        supabase.from('five_why_analyses').select('*').eq('incident_id', id).maybeSingle(),
        supabase.from('rca_analyses').select('*').eq('incident_id', id).maybeSingle()
      ]);
      setTimelineEvents(tR.data || []); setEvidence(eR.data || []); setWitnesses(wR.data || []);
      setCorrectiveActions(cR.data || []); setLessonsLearned(lR.data || []);

      // Load Local Review (structured or legacy)
      if (lrR.data) {
        setLocalReview(lrR.data.review_text || lrR.data.findings || '');
        setLocalReviewData({
          what_happened: lrR.data.what_happened || '',
          immediate_causes: lrR.data.immediate_causes || '',
          do_differently: lrR.data.do_differently || '',
          additional_notes: lrR.data.additional_notes || ''
        });
      }

      // Load 5-Why (structured or legacy)
      if (fwR.data) {
        setFiveWhy(fwR.data.analysis_text || fwR.data.findings || '');
        setFiveWhyData({
          problem_statement: fwR.data.problem_statement || '',
          why1: fwR.data.why1 || '', why2: fwR.data.why2 || '', why3: fwR.data.why3 || '',
          why4: fwR.data.why4 || '', why5: fwR.data.why5 || '',
          root_cause_category: fwR.data.root_cause_category || '',
          root_cause_identified: fwR.data.root_cause_identified || '',
          causal_factors: fwR.data.causal_factors || [],
          team_leader: fwR.data.team_leader || '',
          team_members: fwR.data.team_members || ''
        });
      }

      // Load RCA (structured or legacy)
      if (rcR.data) {
        setRcaAnalysis(rcR.data.analysis_text || rcR.data.findings || '');
        setRcaData({
          problem_statement: rcR.data.problem_statement || '',
          equipment_factors: rcR.data.equipment_factors || '',
          procedure_factors: rcR.data.procedure_factors || '',
          training_factors: rcR.data.training_factors || '',
          human_factors: rcR.data.human_factors || '',
          communication_factors: rcR.data.communication_factors || '',
          supervision_factors: rcR.data.supervision_factors || '',
          design_factors: rcR.data.design_factors || '',
          maintenance_factors: rcR.data.maintenance_factors || '',
          environmental_factors: rcR.data.environmental_factors || '',
          organizational_factors: rcR.data.organizational_factors || '',
          root_causes_identified: rcR.data.root_causes_identified || '',
          contributing_factors_summary: rcR.data.contributing_factors_summary || '',
          systemic_issues: rcR.data.systemic_issues || '',
          recommendations: rcR.data.recommendations || '',
          rca_method: rcR.data.rca_method || 'Standard RCA',
          team_leader: rcR.data.team_leader || '',
          team_members: rcR.data.team_members || ''
        });
      }
    } catch (e) { console.error(e); alert('Error: ' + e.message); setIncident(null); }
    finally { setLoading(false); }
  }

  async function handleLogin(e) { e.preventDefault(); if (userEmail.endsWith('@slpalaska.com')) { localStorage.setItem('slp_investigator_email', userEmail); setAuthenticated(true); loadAll(); } else alert('Restricted to @slpalaska.com'); }
  async function updateStatus(st) { try { const { error } = await supabase.from('incidents').update({ status: st, updated_at: new Date().toISOString() }).eq('id', id); if (error) throw error; setIncident({ ...incident, status: st }); alert('Status: ' + st); } catch (e) { alert(e.message); } }

  async function saveIncidentField(field, value) {
    setSaving(true);
    try {
      // Coerce boolean fields — Supabase stores these as true/false, not 'YES'/'No'
      const BOOLEAN_FIELDS = ['is_sif', 'is_sif_p'];
      let coerced = value;
      if (BOOLEAN_FIELDS.includes(field)) coerced = (value === 'YES' || value === true);
      const { error } = await supabase.from('incidents').update({ [field]: coerced, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      setIncident({ ...incident, [field]: coerced });
      setEditingField(null);
      setIncidentEdits({});
    } catch (e) { alert('Save failed: ' + e.message); } finally { setSaving(false); }
  }

  async function addTimelineEvent() { if (!newTimelineEvent.event_date || !newTimelineEvent.event_description) { alert('Fill date+description'); return; } setSaving(true); try { const n=timelineEvents.length+1; const { data, error } = await supabase.from('timeline_events').insert({ incident_id:id, sequence_number:n, event_date:newTimelineEvent.event_date, event_time:newTimelineEvent.event_time||null, event_description:newTimelineEvent.event_description, critical:newTimelineEvent.critical, created_by_email:userEmail }).select().single(); if(error)throw error; setTimelineEvents([...timelineEvents,data]); setNewTimelineEvent({event_date:'',event_time:'',event_description:'',critical:false}); await supabase.from('incidents').update({timeline_event_count:n,timeline_developed:true}).eq('id',id); } catch(e){alert(e.message);} finally{setSaving(false);} }
  async function saveTimelineEdit(item) { setSaving(true); try { const{error}=await supabase.from('timeline_events').update({event_date:item.event_date,event_time:item.event_time,event_description:item.event_description,critical:item.critical}).eq('id',item.id); if(error)throw error; setTimelineEvents(timelineEvents.map(e=>e.id===item.id?{...e,...item}:e)); setEditingTimeline(null); } catch(e){alert(e.message);} finally{setSaving(false);} }
  async function deleteTimelineEvent(item) { if(!confirm('Delete event?'))return; try { const{error}=await supabase.from('timeline_events').delete().eq('id',item.id); if(error)throw error; const u=timelineEvents.filter(e=>e.id!==item.id); setTimelineEvents(u); await supabase.from('incidents').update({timeline_event_count:u.length}).eq('id',id); } catch(e){alert(e.message);} }

  async function uploadEvidence() { if(!newEvidence.files.length)return; setUploadingEvidence(true); try { for(const file of newEvidence.files){ const ext=file.name.split('.').pop(); const fn=`${incident.incident_id}_ev_${Date.now()}.${ext}`; const fp=`incidents/${id}/${fn}`; const{error:ue}=await supabase.storage.from('evidence').upload(fp,file); if(ue)throw ue; const{data:ud}=supabase.storage.from('evidence').getPublicUrl(fp); const n=evidence.length+1; const{data,error}=await supabase.from('investigation_evidence').insert({incident_id:id,evidence_number:n,evidence_type:newEvidence.type,evidence_category:'Investigation',file_name:fn,file_url:ud.publicUrl,description:newEvidence.description||`${newEvidence.type} from investigation`,uploaded_by_email:userEmail,source:'workbench'}).select().single(); if(error)throw error; setEvidence(prev=>[...prev,data]); } await supabase.from('incidents').update({evidence_count:evidence.length+newEvidence.files.length}).eq('id',id); setNewEvidence({type:'Photo',description:'',files:[]}); setShowEvidenceUpload(false); alert('Uploaded!'); } catch(e){alert(e.message);} finally{setUploadingEvidence(false);} }

  async function addWitness() { if(!newWitness.witness_name||!newWitness.statement_summary){alert('Fill name+statement');return;} setSaving(true); try { const n=witnesses.length+1; const{data,error}=await supabase.from('witness_statements').insert({incident_id:id,witness_number:n,witness_name:newWitness.witness_name,position_role:newWitness.position_role||null,company:newWitness.company||null,statement_summary:newWitness.statement_summary,created_by_email:userEmail}).select().single(); if(error)throw error; setWitnesses([...witnesses,data]); setNewWitness({witness_name:'',position_role:'',company:'',statement_summary:''}); await supabase.from('incidents').update({witness_count:n}).eq('id',id); } catch(e){alert(e.message);} finally{setSaving(false);} }
  async function saveWitnessEdit(item) { setSaving(true); try { const{error}=await supabase.from('witness_statements').update({witness_name:item.witness_name,position_role:item.position_role,company:item.company,statement_summary:item.statement_summary}).eq('id',item.id); if(error)throw error; setWitnesses(witnesses.map(w=>w.id===item.id?{...w,...item}:w)); setEditingWitness(null); } catch(e){alert(e.message);} finally{setSaving(false);} }
  async function deleteWitness(item) { if(!confirm('Delete witness?'))return; try { const{error}=await supabase.from('witness_statements').delete().eq('id',item.id); if(error)throw error; const u=witnesses.filter(w=>w.id!==item.id); setWitnesses(u); await supabase.from('incidents').update({witness_count:u.length}).eq('id',id); } catch(e){alert(e.message);} }

  async function addCA() { if(!newCA.action_description||!newCA.action_owner_name){alert('Fill action+owner');return;} setSaving(true); try { const n=correctiveActions.length+1; const{data,error}=await supabase.from('investigation_corrective_actions').insert({incident_id:id,action_number:n,action_description:newCA.action_description,hierarchy_control:newCA.hierarchy_control,action_owner_name:newCA.action_owner_name,action_owner_email:newCA.action_owner_email||null,target_date:newCA.target_date||null,action_status:newCA.action_status,created_by_email:userEmail}).select().single(); if(error)throw error; setCorrectiveActions([...correctiveActions,data]); // Send assignment email
      if(newCA.action_owner_email&&newCA.action_owner_email.includes('@')){
        try{
          const incRef=currentIncident?.incident_id||'Investigation';
          await fetch('https://api.resend.com/emails',{method:'POST',headers:{'Authorization':'Bearer ' + process.env.RESEND_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({from:'SLP Alaska Safety <reports@slpalaska.com>',to:[newCA.action_owner_email],subject:`Corrective Action Assigned — ${incRef} — Due ${newCA.target_date||'TBD'}`,html:`<div style="font-family:Arial,sans-serif;max-width:600px"><div style="background:linear-gradient(135deg,#991b1b,#1e3a8a);padding:20px;border-radius:8px 8px 0 0"><h2 style="color:white;margin:0">🔴 Corrective Action Assigned</h2></div><div style="background:#f8fafc;padding:20px;border:1px solid #e2e8f0"><p>Hi <strong>${newCA.action_owner_name}</strong>,</p><p>A corrective action has been assigned to you from an incident investigation.</p><table style="width:100%;border-collapse:collapse;margin:15px 0"><tr><td style="padding:8px;background:#991b1b;color:white;font-weight:bold;width:35%">Incident</td><td style="padding:8px;border:1px solid #e2e8f0">${incRef}</td></tr><tr><td style="padding:8px;background:#991b1b;color:white;font-weight:bold">Action Required</td><td style="padding:8px;border:1px solid #e2e8f0">${newCA.action_description}</td></tr><tr><td style="padding:8px;background:#991b1b;color:white;font-weight:bold">Due Date</td><td style="padding:8px;border:1px solid #e2e8f0;color:#dc2626;font-weight:bold">${newCA.target_date||'Not set'}</td></tr></table><a href="https://portal.slpalaska.com/investigation-workbench" style="display:inline-block;padding:12px 24px;background:#991b1b;color:white;text-decoration:none;border-radius:6px;font-weight:bold">View Investigation →</a></div></div>`})});
        }catch(emailErr){console.error('CA email failed:',emailErr);}
      }
      setNewCA({action_description:'',hierarchy_control:'1-Elimination',action_owner_name:'',action_owner_email:'',target_date:'',action_status:'Open'}); await supabase.from('incidents').update({corrective_actions_count:n}).eq('id',id); } catch(e){alert(e.message);} finally{setSaving(false);} }
  async function saveCAEdit(item) { setSaving(true); try { const{error}=await supabase.from('investigation_corrective_actions').update({action_description:item.action_description,hierarchy_control:item.hierarchy_control,action_owner_name:item.action_owner_name,target_date:item.target_date||null,action_status:item.action_status}).eq('id',item.id); if(error)throw error; setCorrectiveActions(correctiveActions.map(c=>c.id===item.id?{...c,...item}:c)); setEditingCA(null); } catch(e){alert(e.message);} finally{setSaving(false);} }
  async function deleteCA(item) { if(!confirm('Delete action?'))return; try { const{error}=await supabase.from('investigation_corrective_actions').delete().eq('id',item.id); if(error)throw error; const u=correctiveActions.filter(c=>c.id!==item.id); setCorrectiveActions(u); await supabase.from('incidents').update({corrective_actions_count:u.length}).eq('id',id); } catch(e){alert(e.message);} }

  async function addLesson() { if(!newLesson.lesson_title||!newLesson.lesson_description){alert('Fill title+description');return;} setSaving(true); try { const n=lessonsLearned.length+1; const{data,error}=await supabase.from('investigation_lessons_learned').insert({incident_id:id,lesson_number:n,lesson_title:newLesson.lesson_title,lesson_description:newLesson.lesson_description,key_takeaway:newLesson.key_takeaway||null,added_by_email:userEmail}).select().single(); if(error)throw error; setLessonsLearned([...lessonsLearned,data]); setNewLesson({lesson_title:'',lesson_description:'',key_takeaway:''}); await supabase.from('incidents').update({lessons_learned_count:n}).eq('id',id); } catch(e){alert(e.message);} finally{setSaving(false);} }
  async function saveLessonEdit(item) { setSaving(true); try { const{error}=await supabase.from('investigation_lessons_learned').update({lesson_title:item.lesson_title,lesson_description:item.lesson_description,key_takeaway:item.key_takeaway}).eq('id',item.id); if(error)throw error; setLessonsLearned(lessonsLearned.map(l=>l.id===item.id?{...l,...item}:l)); setEditingLesson(null); } catch(e){alert(e.message);} finally{setSaving(false);} }
  async function deleteLesson(item) { if(!confirm('Delete lesson?'))return; try { const{error}=await supabase.from('investigation_lessons_learned').delete().eq('id',item.id); if(error)throw error; const u=lessonsLearned.filter(l=>l.id!==item.id); setLessonsLearned(u); await supabase.from('incidents').update({lessons_learned_count:u.length}).eq('id',id); } catch(e){alert(e.message);} }

  // ============================================================================
  // STRUCTURED SAVE FUNCTIONS
  // ============================================================================

  async function saveLocalReview() {
    setSaving(true);
    try {
      const combined = `What Happened: ${localReviewData.what_happened}\n\nImmediate Causes: ${localReviewData.immediate_causes}\n\nIf You Could Do This Over: ${localReviewData.do_differently}\n\nAdditional Notes: ${localReviewData.additional_notes}`;
      const payload = {
        incident_id: id,
        review_text: combined,
        findings: combined,
        analysis_text: combined,
        what_happened: localReviewData.what_happened,
        immediate_causes: localReviewData.immediate_causes,
        do_differently: localReviewData.do_differently,
        additional_notes: localReviewData.additional_notes,
        updated_at: new Date().toISOString()
      };
      const { data: ex } = await supabase.from('local_reviews').select('id').eq('incident_id', id).maybeSingle();
      if (ex) {
        const { error } = await supabase.from('local_reviews').update(payload).eq('id', ex.id);
        if (error) throw error;
      } else {
        payload.created_by_email = userEmail;
        const { error } = await supabase.from('local_reviews').insert(payload);
        if (error) throw error;
      }
      setLocalReview(combined);
      alert('Local Review saved!');
    } catch (e) { alert(e.message); } finally { setSaving(false); }
  }

  async function saveFiveWhyAnalysis() {
    setSaving(true);
    try {
      const combined = `Problem: ${fiveWhyData.problem_statement}\nWhy 1: ${fiveWhyData.why1}\nWhy 2: ${fiveWhyData.why2}\nWhy 3: ${fiveWhyData.why3}\nWhy 4: ${fiveWhyData.why4}\nWhy 5 (Root Cause): ${fiveWhyData.why5}\nRoot Cause Category: ${fiveWhyData.root_cause_category}\nRoot Cause: ${fiveWhyData.root_cause_identified}\nCausal Factors: ${(fiveWhyData.causal_factors||[]).join(', ')}`;
      const payload = {
        incident_id: id,
        analysis_text: combined,
        findings: combined,
        review_text: combined,
        problem_statement: fiveWhyData.problem_statement,
        why1: fiveWhyData.why1, why2: fiveWhyData.why2, why3: fiveWhyData.why3,
        why4: fiveWhyData.why4, why5: fiveWhyData.why5,
        root_cause_category: fiveWhyData.root_cause_category,
        root_cause_identified: fiveWhyData.root_cause_identified,
        causal_factors: fiveWhyData.causal_factors,
        team_leader: fiveWhyData.team_leader,
        team_members: fiveWhyData.team_members,
        updated_at: new Date().toISOString()
      };
      const { data: ex } = await supabase.from('five_why_analyses').select('id').eq('incident_id', id).maybeSingle();
      if (ex) {
        const { error } = await supabase.from('five_why_analyses').update(payload).eq('id', ex.id);
        if (error) throw error;
      } else {
        payload.created_by_email = userEmail;
        const { error } = await supabase.from('five_why_analyses').insert(payload);
        if (error) throw error;
      }
      setFiveWhy(combined);
      alert('5-Why Analysis saved!');
    } catch (e) { alert(e.message); } finally { setSaving(false); }
  }

  async function saveRCAAnalysis() {
    setSaving(true);
    try {
      const combined = `Problem Statement: ${rcaData.problem_statement}\n\nEquipment: ${rcaData.equipment_factors}\nProcedures: ${rcaData.procedure_factors}\nTraining: ${rcaData.training_factors}\nHuman Factors: ${rcaData.human_factors}\nCommunication: ${rcaData.communication_factors}\nSupervision: ${rcaData.supervision_factors}\nDesign/Engineering: ${rcaData.design_factors}\nMaintenance: ${rcaData.maintenance_factors}\nEnvironmental: ${rcaData.environmental_factors}\nOrganizational: ${rcaData.organizational_factors}\n\nRoot Causes: ${rcaData.root_causes_identified}\nContributing Factors: ${rcaData.contributing_factors_summary}\nSystemic Issues: ${rcaData.systemic_issues}\nRecommendations: ${rcaData.recommendations}`;
      const payload = {
        incident_id: id,
        analysis_text: combined,
        findings: combined,
        review_text: combined,
        problem_statement: rcaData.problem_statement,
        equipment_factors: rcaData.equipment_factors,
        procedure_factors: rcaData.procedure_factors,
        training_factors: rcaData.training_factors,
        human_factors: rcaData.human_factors,
        communication_factors: rcaData.communication_factors,
        supervision_factors: rcaData.supervision_factors,
        design_factors: rcaData.design_factors,
        maintenance_factors: rcaData.maintenance_factors,
        environmental_factors: rcaData.environmental_factors,
        organizational_factors: rcaData.organizational_factors,
        root_causes_identified: rcaData.root_causes_identified,
        contributing_factors_summary: rcaData.contributing_factors_summary,
        systemic_issues: rcaData.systemic_issues,
        recommendations: rcaData.recommendations,
        rca_method: rcaData.rca_method,
        team_leader: rcaData.team_leader,
        team_members: rcaData.team_members,
        updated_at: new Date().toISOString()
      };
      const { data: ex } = await supabase.from('rca_analyses').select('id').eq('incident_id', id).maybeSingle();
      if (ex) {
        const { error } = await supabase.from('rca_analyses').update(payload).eq('id', ex.id);
        if (error) throw error;
      } else {
        payload.created_by_email = userEmail;
        const { error } = await supabase.from('rca_analyses').insert(payload);
        if (error) throw error;
      }
      setRcaAnalysis(combined);
      alert('RCA saved!');
    } catch (e) { alert(e.message); } finally { setSaving(false); }
  }

  // Legacy save for backward compat (not used by new structured forms but kept)
  async function saveAnalysis(type, text) { setSaving(true); try { const tbl={'Local Review':'local_reviews','5-Why Analysis':'five_why_analyses','Full RCA':'rca_analyses','Root Cause Analysis':'rca_analyses'}[type]; if(!tbl)return; const{data:ex}=await supabase.from(tbl).select('id').eq('incident_id',id).maybeSingle(); const p={incident_id:id,findings:text,analysis_text:text,review_text:text,updated_at:new Date().toISOString()}; if(ex){const{error}=await supabase.from(tbl).update(p).eq('id',ex.id);if(error)throw error;}else{p.created_by_email=userEmail;const{error}=await supabase.from(tbl).insert(p);if(error)throw error;} alert('Saved!'); } catch(e){alert(e.message);} finally{setSaving(false);} }

  // ============================================================================
  // SPELL CHECK & GRAMMAR (US English)
  // ============================================================================
  const DICTIONARY = new Set([
    'psif','stky','lopc','loto','lockout','tagout','jsa','jha','tha','ppe','sif','hse',
    'spud','bop','blowout','wellbore','casing','tubing','annulus','derrick','drawworks',
    'roughneck','roustabout','toolpusher','mudlogger','wireline','coiled','slickline',
    'swamper','hotshot','haul','laydown','rigup','rigdown','nippleup','nippledown',
    'pikka','kenai','nikiski','kachemak','soldotna','deadhorse','prudhoe','kuparuk',
    'nuiqsut','colville','dalton','haul','slope','tundra','permafrost','breakup',
    'hilcorp','conocophillips','santos','eni','repsol','exxon','bp','alyeska','taps',
    'h2s','lel','scba','msds','sds','gfci','ldar','nfpa','osha','api','ansi',
    'connex','matting','dunnage','rigging','sling','shackle','turnbuckle','crosby',
    'hydrotest','psi','psig','bbl','mcf','bopd','mmscfd'
  ]);

  function checkSpelling(text) {
    const issues = [];
    if (!text || text.length < 3) return issues;
    const words = text.match(/[a-zA-Z']+/g) || [];
    const COMMON = new Set(['the','be','to','of','and','a','in','that','have','i','it','for','not','on','with','he','as','you','do','at','this','but','his','by','from','they','we','say','her','she','or','an','will','my','one','all','would','there','their','what','so','up','out','if','about','who','get','which','go','me','when','no','make','can','like','time','just','him','know','take','people','into','year','your','good','some','could','them','see','other','than','then','now','look','only','come','its','over','think','also','back','after','use','two','how','our','work','first','well','way','even','new','want','because','any','these','give','day','most','us']);
    const seen = new Set();
    words.forEach(word => {
      const lower = word.toLowerCase();
      if (lower.length < 3 || COMMON.has(lower) || DICTIONARY.has(lower) || seen.has(lower)) return;
      if (/^[A-Z]{2,}$/.test(word)) return;
      if (/^\d/.test(word)) return;
      seen.add(lower);
      const MISSPELLINGS = {'recieve':'receive','occured':'occurred','occurence':'occurrence','seperate':'separate','definately':'definitely','accomodate':'accommodate','enviroment':'environment','maintanence':'maintenance','equiptment':'equipment','safty':'safety','hazzard':'hazard','assesment':'assessment','procedur':'procedure','incedent':'incident','investagation':'investigation','immediatly':'immediately','recomendation':'recommendation','comunication':'communication','observaton':'observation','deficency':'deficiency','gaurd':'guard','visable':'visible','availble':'available','neccesary':'necessary','responsable':'responsible','completly':'completely','aproximately':'approximately','consistant':'consistent','dependant':'dependent','occassion':'occasion','personel':'personnel','refered':'referred','similiar':'similar','suficient':'sufficient','untill':'until','vehical':'vehicle','wether':'whether','thier':'their','alot':'a lot','wierd':'weird','calender':'calendar','liason':'liaison','milage':'mileage','noticable':'noticeable','privledge':'privilege','publically':'publicly','rythm':'rhythm','supercede':'supersede','truely':'truly','tyrany':'tyranny','vaccum':'vacuum','writting':'writing'};
      if (MISSPELLINGS[lower]) issues.push({ word, suggestion: MISSPELLINGS[lower], type: 'spelling', severity: 'error' });
    });
    return issues;
  }

  function checkGrammar(text) {
    const issues = [];
    if (!text || text.length < 5) return issues;
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 5);
    sentences.forEach(sentence => {
      const trimmed = sentence.trim();
      const words = trimmed.split(/\s+/);
      for (let i = 0; i < words.length - 1; i++) {
        const repeated = [words[i], words[i + 1]];
        if (repeated[0].toLowerCase() === repeated[1]?.toLowerCase()) {
          const skip = ['had','that','is','was'];
          if (skip.includes(repeated[0].toLowerCase())) return;
          issues.push({ word: `${repeated[0]} ${repeated[1]}`, suggestion: repeated[0], msg: 'Repeated word', type: 'grammar', severity: 'warning' });
        }
      }
    });
    return issues;
  }

  function runSpellCheck() {
    setSpellChecking(true);
    const allResults = [];
    const fields = [
      { section: 'Timeline', field: 'events', text: timelineEvents.map(e => e.event_description).join('. ') },
      { section: 'Witnesses', field: 'statements', text: witnesses.map(w => w.statement_summary).join('. ') },
      { section: 'Analysis', id: 'local', field: 'local_review', text: localReview || '' },
      { section: 'Analysis', id: '5why', field: 'five_why', text: fiveWhy || '' },
      { section: 'Analysis', id: 'rca', field: 'rca', text: rcaAnalysis || '' },
      { section: 'Actions', field: 'descriptions', text: correctiveActions.map(ca => ca.action_description).join('. ') },
      { section: 'Lessons', field: 'descriptions', text: lessonsLearned.map(l => `${l.lesson_title}. ${l.lesson_description}. ${l.key_takeaway||''}`).join('. ') }
    ];
    fields.forEach(({ section, field, text }) => {
      if (!text || text.trim().length < 3) return;
      const spelling = checkSpelling(text);
      const grammar = checkGrammar(text);
      spelling.forEach(issue => {
        const idx = text.toLowerCase().indexOf(issue.word.toLowerCase());
        const context = text.substring(Math.max(0, idx - 30), Math.min(text.length, idx + issue.word.length + 30));
        allResults.push({ ...issue, section, field, context });
      });
      grammar.forEach(issue => {
        const idx = text.toLowerCase().indexOf(issue.word.toLowerCase());
        const context = text.substring(Math.max(0, idx - 30), Math.min(text.length, idx + issue.word.length + 30));
        allResults.push({ ...issue, section, field, context });
      });
    });
    setSpellCheckResults(allResults);
    setSpellChecking(false);
  }

  // ============================================================================
  // PDF GENERATION
  // ============================================================================
  function generatePDF() {
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><title>${incident.incident_id} - Investigation Report</title><style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:900px;margin:0 auto;padding:40px;color:#1e293b;font-size:12px;line-height:1.5}
.header{background:linear-gradient(135deg,#991b1b,#c41e3a);color:white;padding:25px;border-radius:10px;margin-bottom:30px}
.header-title{font-size:22px;font-weight:700}
.badge{display:inline-block;padding:3px 10px;border-radius:4px;font-size:11px;margin-left:8px}
.section{margin-bottom:25px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden}
.section-title{background:#f1f5f9;padding:12px 16px;font-weight:600;font-size:14px;border-bottom:1px solid #e2e8f0}
.section-body{padding:16px}
.row{margin-bottom:6px} .label{font-weight:600;color:#64748b;margin-right:8px}
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.timeline-item{padding:10px 0;border-bottom:1px solid #f1f5f9} .timeline-item:last-child{border-bottom:none}
.critical{color:#dc2626;font-weight:600}
.checklist-item{display:flex;align-items:center;gap:8px;margin-bottom:6px}
.check-yes{width:18px;height:18px;background:#22c55e;border-radius:50%;color:white;display:flex;align-items:center;justify-content:center;font-size:11px}
.check-no{width:18px;height:18px;background:#e2e8f0;border-radius:50%}
.analysis-text{white-space:pre-wrap}
@media print{body{padding:20px} .header{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
<div class="header"><div style="display:flex;justify-content:space-between;align-items:flex-start"><div style="display:flex;align-items:center;gap:15px"><img src="${window.location.origin}/Logo.png" style="width:50px;height:50px;border-radius:8px" onerror="this.style.display='none'"/><div><div style="font-size:10px;opacity:0.8;letter-spacing:1px;text-transform:uppercase;margin-bottom:2px">AnthroSafe&trade; Field Driven Safety</div><div class="header-title">${incident.incident_id||'Report'}</div><div style="font-size:13px;opacity:0.9">${incident.investigation_type||''} Investigation</div></div></div><div>${incident.safety_severity?`<span class="badge" style="background:${'AB'.includes(incident.safety_severity)?'#dc2626':'CD'.includes(incident.safety_severity)?'#f97316':'#3b82f6'};color:white">Severity ${incident.safety_severity}</span>`:''} ${incident.psif_classification?`<span class="badge" style="background:#1f2937;color:white">${incident.psif_classification}</span>`:''}</div></div><div style="display:flex;gap:20px;margin-top:10px;font-size:11px;opacity:0.85;flex-wrap:wrap"><span>Date: ${incident.incident_date||'N/A'}</span><span>Company: ${incident.company_name||'N/A'}</span><span>Location: ${incident.location_name||'N/A'}</span></div></div>
<div class="section"><div class="section-title">Incident Summary</div><div class="section-body"><div class="two-col"><div><div class="row"><span class="label">ID:</span>${incident.incident_id||'N/A'}</div><div class="row"><span class="label">Date:</span>${incident.incident_date||'N/A'} ${incident.incident_time||''}</div><div class="row"><span class="label">Company:</span>${incident.company_name||'N/A'}</div></div><div><div class="row"><span class="label">Investigation:</span>${incident.investigation_type||'N/A'}</div><div class="row"><span class="label">Severity:</span>${incident.safety_severity||'N/A'}</div><div class="row"><span class="label">PSIF:</span>${incident.psif_classification||'N/A'}</div></div></div><div style="margin-top:12px"><div class="row"><span class="label">Description:</span></div><div>${incident.brief_description||incident.detailed_description||'None'}</div></div>${incident.witness_statement_summary?`<div style="margin-top:12px"><span class="label">Initial Witness Info:</span><div>${incident.witness_statement_summary}</div></div>`:''}</div></div>
${timelineEvents.length?`<div class="section"><div class="section-title">Timeline of Events (${timelineEvents.length})</div><div class="section-body">${timelineEvents.map((e,i)=>`<div class="timeline-item"><strong>${i+1}.</strong> ${e.event_date} ${e.event_time||''} - <span class="${e.critical?'critical':''}">${e.event_description}</span></div>`).join('')}</div></div>`:''}
${evidence.length?`<div class="section"><div class="section-title">Evidence (${evidence.length})</div><div class="section-body">${evidence.map((e,i)=>`<div class="row">${i+1}. [${e.evidence_type}] ${e.description||e.file_name}</div>`).join('')}</div></div>`:''}
${witnesses.length?`<div class="section"><div class="section-title">Witness Statements (${witnesses.length})</div><div class="section-body">${witnesses.map(w=>`<div style="margin-bottom:12px"><strong>${w.witness_name}</strong> ${w.position_role?`(${w.position_role})`:''} ${w.company?`- ${w.company}`:''}<div style="margin-top:4px">${w.statement_summary}</div></div>`).join('')}</div></div>`:''}
${(localReview||fiveWhy||rcaAnalysis)?`<div class="section"><div class="section-title">Analysis — ${incident.investigation_type||'N/A'}</div><div class="section-body"><div class="analysis-text">${localReview||fiveWhy||rcaAnalysis}</div></div></div>`:''}
${(()=>{
  const factors=[{key:'equipment_factors',label:'Equipment'},{key:'procedure_factors',label:'Procedures'},{key:'training_factors',label:'Training'},{key:'human_factors',label:'Human Factors'},{key:'communication_factors',label:'Communication'},{key:'supervision_factors',label:'Supervision'},{key:'design_factors',label:'Design/Eng.'},{key:'maintenance_factors',label:'Maintenance'},{key:'environmental_factors',label:'Environmental'},{key:'organizational_factors',label:'Organizational'}];
  const active=factors.filter(f=>rcaData[f.key]&&rcaData[f.key].trim());
  if(active.length===0)return '';
  const svgEl=document.getElementById('causal-tree-svg');
  const svgHTML=svgEl?new XMLSerializer().serializeToString(svgEl):'';
  return '<div class="section"><div class="section-title">Causal Tree Diagram</div><div class="section-body" style="text-align:center;overflow:auto">'+svgHTML+'</div></div>';
})()}
${correctiveActions.length?`<div class="section"><div class="section-title">Corrective Actions (${correctiveActions.length})</div><div class="section-body">${correctiveActions.map((ca,i)=>`<div style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid #f1f5f9"><strong>${i+1}. ${ca.action_description}</strong><div style="margin-top:4px"><span class="label">Control:</span>${ca.hierarchy_control} | <span class="label">Owner:</span>${ca.action_owner_name} | <span class="label">Due:</span>${ca.target_date||'—'} | <span class="label">Status:</span>${ca.action_status}</div></div>`).join('')}</div></div>`:''}
${lessonsLearned.length?`<div class="section"><div class="section-title">Lessons Learned (${lessonsLearned.length})</div><div class="section-body">${lessonsLearned.map(l=>`<div style="margin-bottom:12px"><strong>${l.lesson_title}</strong><div>${l.lesson_description}</div>${l.key_takeaway?`<div style="margin-top:4px;font-style:italic;color:#7c3aed">Key Takeaway: ${l.key_takeaway}</div>`:''}</div>`).join('')}</div></div>`:''}
<div class="section"><div class="section-title">Checklist</div><div class="section-body"><div class="two-col"><div><div class="checklist-item"><span class="${timelineEvents.length?'check-yes':'check-no'}">${timelineEvents.length?'✓':''}</span> Timeline (${timelineEvents.length})</div><div class="checklist-item"><span class="${evidence.length?'check-yes':'check-no'}">${evidence.length?'✓':''}</span> Evidence (${evidence.length})</div><div class="checklist-item"><span class="${witnesses.length?'check-yes':'check-no'}">${witnesses.length?'✓':''}</span> Witnesses (${witnesses.length})</div></div><div><div class="checklist-item"><span class="${(localReview||fiveWhy||rcaAnalysis)?'check-yes':'check-no'}">${(localReview||fiveWhy||rcaAnalysis)?'✓':''}</span> Analysis</div><div class="checklist-item"><span class="${correctiveActions.length?'check-yes':'check-no'}">${correctiveActions.length?'✓':''}</span> Actions (${correctiveActions.length})</div><div class="checklist-item"><span class="${lessonsLearned.length?'check-yes':'check-no'}">${lessonsLearned.length?'✓':''}</span> Lessons (${lessonsLearned.length})</div></div></div></div></div>
<div style="text-align:center;margin-top:30px;padding:20px;color:#64748b;font-size:11px;border-top:2px solid #e2e8f0"><strong>AnthroSafe™ Field Driven Safety</strong> | © 2026 SLP Alaska, LLC<br>Generated ${new Date().toLocaleString()}</div>
</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 500);
  }

  // ============================================================================
  // STYLES
  // ============================================================================
  // ============================================================================
  // EDITABLE FIELD COMPONENT — defined here so it never re-mounts on keystroke
  // ============================================================================
  const EditableText = ({ field, label, value, type='text', options=null }) => {
    const isEditing = editingField === field;
    const currentVal = isEditing ? (incidentEdits[field] ?? value ?? '') : (value ?? '');
    return (
      <div style={{marginBottom:'12px',padding:'10px',borderRadius:'8px',background:isEditing?'#eff6ff':'transparent',border:isEditing?'1px solid #3b82f6':'1px solid transparent',transition:'all 0.15s'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'8px'}}>
          <div style={{flex:1}}>
            <strong style={{color:'#64748b',fontSize:'12px',textTransform:'uppercase',letterSpacing:'0.05em'}}>{label}</strong>
            {isEditing ? (
              <div style={{marginTop:'6px'}}>
                {options ? (
                  <select value={currentVal} onChange={e=>setIncidentEdits(prev=>({...prev,[field]:e.target.value}))} style={{...st.input,marginBottom:'8px'}}>
                    {options.map(o=><option key={o}>{o}</option>)}
                  </select>
                ) : type==='textarea' ? (
                  <textarea value={currentVal} onChange={e=>setIncidentEdits(prev=>({...prev,[field]:e.target.value}))} style={{...st.input,minHeight:'100px',resize:'vertical',marginBottom:'8px'}} />
                ) : (
                  <input type={type} value={currentVal} onChange={e=>setIncidentEdits(prev=>({...prev,[field]:e.target.value}))} style={{...st.input,marginBottom:'8px'}} autoFocus />
                )}
                <div style={{display:'flex',gap:'8px'}}>
                  <button onClick={()=>saveIncidentField(field, incidentEdits[field]??value)} disabled={saving} style={{...st.primaryBtn,padding:'6px 14px',fontSize:'13px'}}>{saving?'Saving...':'💾 Save'}</button>
                  <button onClick={()=>{setEditingField(null);setIncidentEdits({});}} style={{...st.outlineBtn,padding:'6px 14px',fontSize:'13px'}}>Cancel</button>
                </div>
              </div>
            ) : (
              <div style={{marginTop:'4px',color:'#1e293b',fontSize:'14px'}}>{currentVal||<span style={{color:'#94a3b8',fontStyle:'italic'}}>Not set — click ✏️ to edit</span>}</div>
            )}
          </div>
          {!isEditing && (
            <button onClick={()=>{setEditingField(field);setIncidentEdits(prev=>({...prev,[field]:value??''}));}} style={{background:'#dbeafe',color:'#1e40af',border:'none',padding:'4px 10px',borderRadius:'4px',cursor:'pointer',fontSize:'12px',flexShrink:0,marginTop:'16px'}}>✏️</button>
          )}
        </div>
      </div>
    );
  };

  const st = {
    input: { width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' },
    primaryBtn: { background: '#1e40af', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', fontSize: '14px', opacity: saving ? 0.6 : 1 },
    secondaryBtn: { background: '#7c3aed', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', fontSize: '14px' },
    outlineBtn: { background: 'white', color: '#64748b', border: '1px solid #d1d5db', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', fontSize: '14px' },
    dangerBtn: { background: '#dc2626', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' },
    footer: { textAlign: 'center', padding: '20px', color: 'rgba(255,255,255,0.7)', fontSize: '13px', marginTop: '20px' },
    sectionHeader: { background: '#1e40af', color: 'white', padding: '10px 16px', borderRadius: '8px', fontWeight: '600', fontSize: '14px', marginBottom: '15px', marginTop: '20px' },
    factorCard: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', marginBottom: '12px' },
    factorLabel: { fontWeight: '600', color: '#1e293b', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' },
    factorHint: { fontSize: '12px', color: '#94a3b8', marginBottom: '8px', fontStyle: 'italic' },
    whyBox: { background: '#fff', border: '2px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '16px', transition: 'border-color 0.2s' },
    whyNumber: { background: '#1e40af', color: 'white', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '16px', flexShrink: 0 },
    whyArrow: { textAlign: 'center', fontSize: '24px', color: '#94a3b8', margin: '-8px 0' }
  };

  const EditDeleteBtns = ({ onEdit, onDelete }) => (
    <div style={{ display: 'flex', gap: '6px' }}>
      <button onClick={onEdit} style={{ background: '#dbeafe', color: '#1e40af', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>✏️</button>
      <button onClick={onDelete} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>🗑️</button>
    </div>
  );
  const SaveCancelBtns = ({ onSave, onCancel }) => (
    <div style={{ display: 'flex', gap: '10px' }}>
      <button onClick={onSave} disabled={saving} style={st.primaryBtn}>{saving ? 'Saving...' : '💾 Save'}</button>
      <button onClick={onCancel} style={st.outlineBtn}>Cancel</button>
    </div>
  );

  // ============================================================================
  // TOGGLE CAUSAL FACTOR
  // ============================================================================
  function toggleCausalFactor(factor) {
    const current = fiveWhyData.causal_factors || [];
    if (current.includes(factor)) {
      setFiveWhyData({ ...fiveWhyData, causal_factors: current.filter(f => f !== factor) });
    } else {
      setFiveWhyData({ ...fiveWhyData, causal_factors: [...current, factor] });
    }
  }

  if (loading) return <div style={{ minHeight: '100vh', background: '#1e3a5f', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '18px' }}>Loading...</div>;
  if (!authenticated) return <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#1e3a5f,#2d5a87)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ background: 'white', borderRadius: '16px', padding: '40px', maxWidth: '450px', width: '90%', boxShadow: '0 10px 40px rgba(0,0,0,0.2)', textAlign: 'center' }}><img src="/Logo.png" alt="SLP" style={{ width: '80px', marginBottom: '15px' }} /><h2>Investigation Workbench</h2><p style={{ color: '#64748b' }}>Restricted to SLP investigators</p><form onSubmit={handleLogin}><input type="email" placeholder="your@slpalaska.com" value={userEmail} onChange={e => setUserEmail(e.target.value)} style={{ ...st.input, marginBottom: '15px' }} /><button type="submit" style={{ ...st.primaryBtn, width: '100%' }}>Sign In</button></form></div></div>;
  if (!incident) return <div style={{ minHeight: '100vh', background: '#1e3a5f', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}><div style={{ textAlign: 'center' }}><h2>Incident Not Found</h2><a href="/investigation-dashboard" style={{ color: '#93c5fd' }}>← Back to Dashboard</a></div></div>;

  const tabs = ['Overview', 'Timeline', 'Evidence', 'Witnesses', 'Analysis', 'Corrective Actions', 'Lessons Learned', 'Review & Approve'];
  const analysisHasContent = !!(localReview || fiveWhy || rcaAnalysis || localReviewData.what_happened || fiveWhyData.problem_statement || rcaData.problem_statement);

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#1e3a5f,#2d5a87)' }}>
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
        <button onClick={()=>window.location.href='/portal'} style={{ background: '#1e40af', color: 'white', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', textDecoration: 'none', fontSize: '14px' }}>{'\u2190'} Portal</button>
        <button onClick={()=>window.location.href='/investigation-dashboard'} style={{ background: '#059669', color: 'white', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', textDecoration: 'none', fontSize: '14px' }}>{'\u2190'} Dashboard</button>
        <button onClick={generatePDF} style={{ background: '#7c3aed', color: 'white', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px' }}>🖨️ Print PDF</button>
      </div>

      <div style={{ background: 'linear-gradient(135deg,#4338ca,#6d28d9)', borderRadius: '16px 16px 0 0', padding: '25px', color: 'white', textAlign: 'center' }}>
        <img src="/Logo.png" alt="SLP" style={{ width: '60px', marginBottom: '10px' }} />
        <h1 style={{ margin: 0, fontSize: '26px' }}>Investigation Workbench</h1>
        <p style={{ margin: '10px 0 0 0', opacity: 0.9 }}>{incident.incident_id} | {incident.investigation_type}</p>
      </div>

      <div style={{ background: 'white', borderRadius: '0 0 16px 16px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', overflow: 'auto', borderBottom: '2px solid #e2e8f0', background: '#f8fafc' }}>
          {tabs.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '12px 18px', border: 'none', background: activeTab === tab ? 'white' : 'transparent', color: activeTab === tab ? '#1e40af' : '#64748b', cursor: 'pointer', fontWeight: activeTab === tab ? '600' : '400', borderBottom: activeTab === tab ? '3px solid #1e40af' : '3px solid transparent', whiteSpace: 'nowrap', fontSize: '14px' }}>{tab}</button>
          ))}
        </div>

        <div style={{ padding: '25px' }}>
        {/* OVERVIEW */}
        {activeTab==='Overview' && (()=>{
          return (
            <div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
                <h3 style={{margin:0}}>Incident Summary</h3>
                <span style={{fontSize:'12px',color:'#94a3b8'}}>Click ✏️ on any field to edit</span>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'20px',marginBottom:'20px'}}>
                <div style={{background:'#f8fafc',padding:'15px',borderRadius:'10px'}}>
                  <div style={{fontWeight:'600',color:'#1e40af',marginBottom:'10px',fontSize:'13px',textTransform:'uppercase',letterSpacing:'0.05em'}}>📋 Basic Info</div>
                  <EditableText field="incident_id" label="Incident ID" value={incident.incident_id} />
                  <EditableText field="incident_date" label="Date" value={incident.incident_date} type="date" />
                  <EditableText field="incident_time" label="Time" value={incident.incident_time} type="time" />
                  <EditableText field="company_name" label="Company" value={incident.company_name} />
                  <EditableText field="location_name" label="Location" value={incident.location_name} />
                  <EditableText field="incident_type" label="Incident Type" value={incident.incident_type} options={['Near Miss','First Aid','Medical Treatment','Recordable','Restricted Work','Lost Time','Fatality','Property Damage','Environmental','Vehicle','Fire','Other']} />
                </div>
                <div style={{background:'#f8fafc',padding:'15px',borderRadius:'10px'}}>
                  <div style={{fontWeight:'600',color:'#1e40af',marginBottom:'10px',fontSize:'13px',textTransform:'uppercase',letterSpacing:'0.05em'}}>⚠️ Classification</div>
                  <EditableText field="status" label="Status" value={incident.status} options={['Draft','Submitted','Under Review - Triage','Under Review - First Draft','Under Review - Asset Review','Under Review - Final Review','Pending Approval','Approved','Closed']} />
                  <EditableText field="safety_severity" label="Severity" value={incident.safety_severity} options={['A','B','C','D','1','2','3','4','5']} />
                  <EditableText field="psif_classification" label="PSIF" value={incident.psif_classification} options={['PSIF Actual','PSIF Potential','Non-PSIF']} />
                  <EditableText field="investigation_type" label="Investigation Type" value={incident.investigation_type} options={['Local Review','5-Why Analysis','Full RCA']} />
                  <EditableText field="is_sif" label="SIF Actual" value={incident.is_sif?'YES':'No'} options={['YES','No']} />
                  <EditableText field="is_sif_p" label="SIF Potential" value={incident.is_sif_p?'YES':'No'} options={['YES','No']} />
                </div>
              </div>
              <div style={{background:'#f8fafc',padding:'15px',borderRadius:'10px',marginBottom:'16px'}}>
                <div style={{fontWeight:'600',color:'#1e40af',marginBottom:'10px',fontSize:'13px',textTransform:'uppercase',letterSpacing:'0.05em'}}>📝 Incident Description</div>
                <EditableText field="brief_description" label="Brief Description" value={incident.brief_description} type="textarea" />
                <EditableText field="detailed_description" label="Detailed Description" value={incident.detailed_description} type="textarea" />
              </div>
              <div style={{background:'#fffbeb',padding:'15px',borderRadius:'10px',border:'1px solid #fbbf24',marginBottom:'16px'}}>
                <div style={{fontWeight:'600',color:'#b45309',marginBottom:'10px',fontSize:'13px',textTransform:'uppercase',letterSpacing:'0.05em'}}>👁️ Witness Info (Initial Report)</div>
                <EditableText field="witness_statement_summary" label="Initial Witness Summary" value={incident.witness_statement_summary} type="textarea" />
              </div>
              <div style={{background:'#f0fdf4',padding:'15px',borderRadius:'10px',border:'1px solid #86efac'}}>
                <div style={{fontWeight:'600',color:'#166534',marginBottom:'10px',fontSize:'13px',textTransform:'uppercase',letterSpacing:'0.05em'}}>👷 Injured / Involved Person</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                  <EditableText field="injured_name" label="Name" value={incident.injured_name} />
                  <EditableText field="injured_company" label="Company" value={incident.injured_company} />
                  <EditableText field="injured_job_title" label="Job Title" value={incident.injured_job_title} />
                  <EditableText field="injured_time_on_task" label="Time on Task" value={incident.injured_time_on_task} />
                  <EditableText field="body_part_affected" label="Body Part Affected" value={incident.body_part_affected} />
                  <EditableText field="injury_type" label="Injury Type" value={incident.injury_type} />
                </div>
              </div>
            </div>
          );
        })()}

        {/* TIMELINE */}
        {activeTab==='Timeline' && <div>
          <h3>Timeline</h3>
          <div style={{background:'#f8fafc',padding:'20px',borderRadius:'12px',marginBottom:'20px',display:'grid',gridTemplateColumns:'1fr 1fr 3fr auto',gap:'10px',alignItems:'start'}}>
            <input type="date" value={newTimelineEvent.event_date} onChange={e=>setNewTimelineEvent({...newTimelineEvent,event_date:e.target.value})} style={st.input} />
            <input type="time" value={newTimelineEvent.event_time} onChange={e=>setNewTimelineEvent({...newTimelineEvent,event_time:e.target.value})} style={st.input} />
            <input placeholder="What happened?" value={newTimelineEvent.event_description} onChange={e=>setNewTimelineEvent({...newTimelineEvent,event_description:e.target.value})} style={st.input} />
            <label style={{display:'flex',alignItems:'center',gap:'5px',whiteSpace:'nowrap'}}><input type="checkbox" checked={newTimelineEvent.critical} onChange={e=>setNewTimelineEvent({...newTimelineEvent,critical:e.target.checked})} /> Critical</label>
          </div>
          <button onClick={addTimelineEvent} disabled={saving} style={{...st.primaryBtn,marginBottom:'20px'}}>+ Add Event</button>
          <div style={{display:'grid',gap:'10px'}}>
            {timelineEvents.map((ev,i)=>(
              <div key={ev.id} style={{background:'white',border:`2px solid ${ev.critical?'#dc2626':'#e2e8f0'}`,borderRadius:'8px',padding:'12px'}}>
                {editingTimeline===ev.id ? <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 3fr auto',gap:'10px',alignItems:'start'}}>
                  <input type="date" value={ev.event_date||''} onChange={e=>setTimelineEvents(timelineEvents.map(x=>x.id===ev.id?{...x,event_date:e.target.value}:x))} style={st.input} />
                  <input type="time" value={ev.event_time||''} onChange={e=>setTimelineEvents(timelineEvents.map(x=>x.id===ev.id?{...x,event_time:e.target.value}:x))} style={st.input} />
                  <input value={ev.event_description} onChange={e=>setTimelineEvents(timelineEvents.map(x=>x.id===ev.id?{...x,event_description:e.target.value}:x))} style={st.input} />
                  <SaveCancelBtns onSave={()=>saveTimelineEdit(ev)} onCancel={()=>{setEditingTimeline(null);loadAll();}} />
                </div> : <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div><strong style={{color:ev.critical?'#dc2626':'#1e40af'}}>#{i+1}</strong> <span style={{color:'#64748b'}}>{ev.event_date} {ev.event_time||''}</span> — {ev.event_description} {ev.critical&&<span style={{color:'#dc2626',fontWeight:'600'}}>⚠️ CRITICAL</span>}</div>
                  <EditDeleteBtns onEdit={()=>setEditingTimeline(ev.id)} onDelete={()=>deleteTimelineEvent(ev)} />
                </div>}
              </div>
            ))}
          </div>
        </div>}

        {/* EVIDENCE */}
        {activeTab==='Evidence' && <div>
          <h3>Evidence</h3>
          <button onClick={()=>setShowEvidenceUpload(!showEvidenceUpload)} style={st.primaryBtn}>+ Upload Evidence</button>
          {showEvidenceUpload && <div style={{background:'#f8fafc',padding:'20px',borderRadius:'12px',marginTop:'15px',marginBottom:'20px'}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:'15px',marginBottom:'15px'}}>
              <div><label style={{display:'block',marginBottom:'5px',fontWeight:'500'}}>Type</label><select value={newEvidence.type} onChange={e=>setNewEvidence({...newEvidence,type:e.target.value})} style={st.input}><option>Photo</option><option>Video</option><option>Document</option><option>Diagram</option><option>Other</option></select></div>
              <div><label style={{display:'block',marginBottom:'5px',fontWeight:'500'}}>Description</label><input value={newEvidence.description} onChange={e=>setNewEvidence({...newEvidence,description:e.target.value})} placeholder="Brief description..." style={st.input} /></div>
            </div>
            <div><label style={{display:'block',marginBottom:'5px',fontWeight:'500'}}>Files</label><input type="file" multiple accept="image/*,video/*,.pdf,.doc,.docx" onChange={e=>setNewEvidence({...newEvidence,files:Array.from(e.target.files)})} style={{...st.input,padding:'10px'}} />{newEvidence.files.length>0&&<div style={{marginTop:'10px',fontSize:'14px',color:'#64748b'}}>{newEvidence.files.length} file(s)</div>}</div>
            <button onClick={uploadEvidence} disabled={uploadingEvidence} style={{...st.primaryBtn,marginTop:'15px'}}>{uploadingEvidence?'Uploading...':'📤 Upload'}</button>
          </div>}
          <div style={{display:'grid',gap:'10px',marginTop:'15px'}}>
            {evidence.map((ev,i)=>(
              <div key={ev.id} style={{background:'white',border:'1px solid #e2e8f0',borderRadius:'8px',padding:'12px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div><strong>#{ev.evidence_number||i+1}</strong> [{ev.evidence_type}] {ev.description||ev.file_name} {ev.file_url && <a href={ev.file_url} target="_blank" style={{color:'#1e40af',marginLeft:'8px'}}>View</a>}</div>
              </div>
            ))}
          </div>
        </div>}

        {/* WITNESSES */}
        {activeTab==='Witnesses' && <div>
          <h3>Witness Statements</h3>
          <div style={{background:'#f8fafc',padding:'20px',borderRadius:'12px',marginBottom:'20px'}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'10px',marginBottom:'15px'}}>
              <input placeholder="Name *" value={newWitness.witness_name} onChange={e=>setNewWitness({...newWitness,witness_name:e.target.value})} style={st.input} />
              <input placeholder="Position/Role" value={newWitness.position_role} onChange={e=>setNewWitness({...newWitness,position_role:e.target.value})} style={st.input} />
              <input placeholder="Company" value={newWitness.company} onChange={e=>setNewWitness({...newWitness,company:e.target.value})} style={st.input} />
            </div>
            <textarea placeholder="Statement *" value={newWitness.statement_summary} onChange={e=>setNewWitness({...newWitness,statement_summary:e.target.value})} style={{...st.input,minHeight:'100px',resize:'vertical',marginBottom:'15px'}} />
            <button onClick={addWitness} disabled={saving} style={st.primaryBtn}>+ Add Witness</button>
          </div>
          <div style={{display:'grid',gap:'15px'}}>
            {witnesses.map(w=>(
              <div key={w.id} style={{background:'white',border:'1px solid #e2e8f0',borderRadius:'8px',padding:'15px'}}>
                {editingWitness===w.id ? <div style={{display:'grid',gap:'10px'}}>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'10px'}}>
                    <input value={w.witness_name} onChange={e=>setWitnesses(witnesses.map(x=>x.id===w.id?{...x,witness_name:e.target.value}:x))} style={st.input} />
                    <input value={w.position_role||''} onChange={e=>setWitnesses(witnesses.map(x=>x.id===w.id?{...x,position_role:e.target.value}:x))} style={st.input} />
                    <input value={w.company||''} onChange={e=>setWitnesses(witnesses.map(x=>x.id===w.id?{...x,company:e.target.value}:x))} style={st.input} />
                  </div>
                  <textarea value={w.statement_summary} onChange={e=>setWitnesses(witnesses.map(x=>x.id===w.id?{...x,statement_summary:e.target.value}:x))} style={{...st.input,minHeight:'100px',resize:'vertical'}} />
                  <SaveCancelBtns onSave={()=>saveWitnessEdit(w)} onCancel={()=>{setEditingWitness(null);loadAll();}} />
                </div> : <div>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:'10px'}}>
                    <div><strong>{w.witness_name}</strong> <span style={{color:'#64748b'}}>{w.position_role} {w.company&&`- ${w.company}`}</span></div>
                    <EditDeleteBtns onEdit={()=>setEditingWitness(w.id)} onDelete={()=>deleteWitness(w)} />
                  </div>
                  <p style={{margin:0,color:'#334155'}}>{w.statement_summary}</p>
                </div>}
              </div>
            ))}
          </div>
        </div>}

        {/* ============================================================ */}
        {/* ANALYSIS TAB - FULL STRUCTURED FORMS */}
        {/* ============================================================ */}
        {activeTab==='Analysis' && <div>
          <h3>Analysis</h3>

          {/* Method Selector + Logic Tree Link */}
          <div style={{background:'#f0f9ff',padding:'16px',borderRadius:'12px',marginBottom:'20px',border:'1px solid #bae6fd'}}>
            <div style={{display:'flex',alignItems:'center',gap:'15px',flexWrap:'wrap'}}>
              <span style={{fontWeight:'600',color:'#0369a1'}}>Analysis Method:</span>
              <select value={incident.investigation_type||'Local Review'} onChange={async(e)=>{const newType=e.target.value;try{const{error}=await supabase.from('incidents').update({investigation_type:newType,updated_at:new Date().toISOString()}).eq('id',id);if(error)throw error;setIncident({...incident,investigation_type:newType});}catch(err){alert(err.message);}}} style={{padding:'8px 12px',borderRadius:'8px',border:'1px solid #0284c7',fontSize:'14px',fontWeight:'500',background:'white',cursor:'pointer',minWidth:'200px'}}>
                <option value="Local Review">Local Review</option>
                <option value="5-Why Analysis">5-Why Analysis</option>
                <option value="Full RCA">Comprehensive RCA</option>
              </select>
              <a href={`/logic-tree?incident=${id}`} target="_blank" style={{background:'#059669',color:'white',padding:'8px 16px',borderRadius:'8px',textDecoration:'none',fontSize:'13px',fontWeight:'500',display:'inline-flex',alignItems:'center',gap:'6px'}}>🌳 Open Logic Tree Builder</a>
            </div>
          </div>

          {/* =============================== */}
          {/* LOCAL REVIEW - STRUCTURED */}
          {/* =============================== */}
          {incident.investigation_type==='Local Review' && <div>
            <div style={st.sectionHeader}>📋 Local Review</div>
            <p style={{color:'#64748b',marginBottom:'20px'}}>Supervisor-level quick review for lower-risk events.</p>

            <div style={st.factorCard}>
              <div style={st.factorLabel}>What Happened?</div>
              <div style={st.factorHint}>Describe the event in your own words. What was the sequence of events?</div>
              <textarea value={localReviewData.what_happened} onChange={e=>setLocalReviewData({...localReviewData,what_happened:e.target.value})} placeholder="Describe what happened leading up to and during the event..." style={{...st.input,minHeight:'120px',resize:'vertical'}} />
            </div>

            <div style={st.factorCard}>
              <div style={st.factorLabel}>Immediate Causes</div>
              <div style={st.factorHint}>What were the immediate unsafe acts or conditions?</div>
              <textarea value={localReviewData.immediate_causes} onChange={e=>setLocalReviewData({...localReviewData,immediate_causes:e.target.value})} placeholder="List the immediate causes identified..." style={{...st.input,minHeight:'100px',resize:'vertical'}} />
            </div>

            <div style={{...st.factorCard,border:'2px solid #f59e0b',background:'#fffbeb'}}>
              <div style={st.factorLabel}>⭐ If You Could Do This Over, What Would You Do Differently?</div>
              <div style={st.factorHint}>This is the most important question. Think about what changes would have prevented this event.</div>
              <textarea value={localReviewData.do_differently} onChange={e=>setLocalReviewData({...localReviewData,do_differently:e.target.value})} placeholder="If we could go back in time, what would we change?" style={{...st.input,minHeight:'120px',resize:'vertical'}} />
            </div>

            <div style={st.factorCard}>
              <div style={st.factorLabel}>Additional Notes</div>
              <textarea value={localReviewData.additional_notes} onChange={e=>setLocalReviewData({...localReviewData,additional_notes:e.target.value})} placeholder="Any other observations, recommendations, or context..." style={{...st.input,minHeight:'80px',resize:'vertical'}} />
            </div>

            <button onClick={saveLocalReview} disabled={saving} style={{...st.primaryBtn,marginTop:'15px',padding:'12px 30px',fontSize:'16px'}}>{saving?'Saving...':'💾 Save Local Review'}</button>
          </div>}

          {/* =============================== */}
          {/* 5-WHY ANALYSIS - STRUCTURED */}
          {/* =============================== */}
          {incident.investigation_type==='5-Why Analysis' && <div>
            <div style={st.sectionHeader}>🔍 5-Why Analysis</div>
            <p style={{color:'#64748b',marginBottom:'20px'}}>Drill down through 5 levels of "Why?" to find the root cause.</p>

            {/* Team */}
            <div style={{...st.factorCard,background:'#f0f9ff',border:'1px solid #bae6fd'}}>
              <div style={st.factorLabel}>👥 Investigation Team</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:'12px',marginTop:'8px'}}>
                <div><label style={{fontSize:'12px',color:'#64748b'}}>Team Leader</label><input value={fiveWhyData.team_leader} onChange={e=>setFiveWhyData({...fiveWhyData,team_leader:e.target.value})} placeholder="Lead investigator..." style={st.input} /></div>
                <div><label style={{fontSize:'12px',color:'#64748b'}}>Team Members</label><input value={fiveWhyData.team_members} onChange={e=>setFiveWhyData({...fiveWhyData,team_members:e.target.value})} placeholder="List all team members..." style={st.input} /></div>
              </div>
            </div>

            {/* Problem Statement */}
            <div style={st.factorCard}>
              <div style={st.factorLabel}>📝 Problem Statement</div>
              <div style={st.factorHint}>Clearly define the incident/problem being investigated</div>
              <textarea value={fiveWhyData.problem_statement} onChange={e=>setFiveWhyData({...fiveWhyData,problem_statement:e.target.value})} placeholder="Clearly and concisely state the problem..." style={{...st.input,minHeight:'80px',resize:'vertical'}} />
            </div>

            {/* The 5 Whys */}
            <div style={{marginTop:'20px'}}>
              {[
                {n:1,q:'Why did this incident occur?',key:'why1'},
                {n:2,q:'Why did that happen?',key:'why2'},
                {n:3,q:'Why did that happen?',key:'why3'},
                {n:4,q:'Why did that happen?',key:'why4'},
                {n:5,q:'Why did that happen? (Root Cause)',key:'why5'}
              ].map(({n,q,key})=>(
                <div key={n}>
                  {n>1 && <div style={st.whyArrow}>↓</div>}
                  <div style={{...st.whyBox,borderColor:fiveWhyData[key]?'#22c55e':'#e2e8f0'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'10px'}}>
                      <div style={{...st.whyNumber,background:n===5?'#dc2626':'#1e40af'}}>{n}</div>
                      <div style={{fontWeight:'600',color:n===5?'#dc2626':'#1e293b'}}>{q}</div>
                    </div>
                    <textarea value={fiveWhyData[key]} onChange={e=>setFiveWhyData({...fiveWhyData,[key]:e.target.value})} placeholder={n===5?'This should be the root cause...':'Answer why this happened...'} style={{...st.input,minHeight:n===5?'100px':'70px',resize:'vertical',borderColor:n===5?'#fca5a5':'#d1d5db'}} />
                  </div>
                </div>
              ))}
            </div>

            {/* Root Cause Classification */}
            <div style={{...st.sectionHeader,background:'#dc2626',marginTop:'25px'}}>🎯 Root Cause Classification</div>

            <div style={st.factorCard}>
              <div style={st.factorLabel}>Root Cause Category</div>
              <select value={fiveWhyData.root_cause_category} onChange={e=>setFiveWhyData({...fiveWhyData,root_cause_category:e.target.value,root_cause_identified:''})} style={{...st.input,marginBottom:'12px'}}>
                <option value="">— Select Category —</option>
                {Object.keys(ROOT_CAUSE_TAXONOMY).map(cat=><option key={cat} value={cat}>{cat}</option>)}
              </select>
              {fiveWhyData.root_cause_category && <>
                <div style={st.factorLabel}>Specific Root Cause</div>
                <select value={fiveWhyData.root_cause_identified} onChange={e=>setFiveWhyData({...fiveWhyData,root_cause_identified:e.target.value})} style={st.input}>
                  <option value="">— Select Root Cause —</option>
                  {(ROOT_CAUSE_TAXONOMY[fiveWhyData.root_cause_category]||[]).map(rc=><option key={rc} value={rc}>{rc}</option>)}
                </select>
              </>}
            </div>

            {/* Causal Factor Taxonomy */}
            <div style={{...st.sectionHeader,background:'#f59e0b',color:'#1e293b'}}>🔗 Causal Factors (select all that apply)</div>
            {Object.entries(CAUSAL_FACTOR_TAXONOMY).map(([group, factors])=>(
              <div key={group} style={{marginBottom:'15px'}}>
                <div style={{fontWeight:'600',color:'#475569',marginBottom:'8px',fontSize:'13px',textTransform:'uppercase',letterSpacing:'0.05em'}}>{group}</div>
                <div style={{display:'flex',flexWrap:'wrap',gap:'8px'}}>
                  {factors.map(f=>{
                    const selected = (fiveWhyData.causal_factors||[]).includes(f);
                    return <button key={f} onClick={()=>toggleCausalFactor(f)} style={{padding:'6px 14px',borderRadius:'20px',border:selected?'2px solid #1e40af':'2px solid #d1d5db',background:selected?'#dbeafe':'white',color:selected?'#1e40af':'#64748b',cursor:'pointer',fontSize:'13px',fontWeight:selected?'600':'400',transition:'all 0.15s'}}>{selected?'✓ ':''}{f}</button>;
                  })}
                </div>
              </div>
            ))}

            <button onClick={saveFiveWhyAnalysis} disabled={saving} style={{...st.primaryBtn,marginTop:'20px',padding:'12px 30px',fontSize:'16px'}}>{saving?'Saving...':'💾 Save 5-Why Analysis'}</button>
          </div>}

          {/* =============================== */}
          {/* COMPREHENSIVE RCA - STRUCTURED */}
          {/* =============================== */}
          {(incident.investigation_type==='Full RCA'||incident.investigation_type==='Root Cause Analysis') && <div>
            <div style={st.sectionHeader}>🔬 Comprehensive Root Cause Analysis</div>
            <p style={{color:'#64748b',marginBottom:'20px'}}>Full multi-factor analysis examining all contributing factor categories.</p>

            {/* Team */}
            <div style={{...st.factorCard,background:'#f0f9ff',border:'1px solid #bae6fd'}}>
              <div style={st.factorLabel}>👥 Investigation Team</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:'12px',marginTop:'8px'}}>
                <div><label style={{fontSize:'12px',color:'#64748b'}}>Team Leader</label><input value={rcaData.team_leader} onChange={e=>setRcaData({...rcaData,team_leader:e.target.value})} placeholder="Lead investigator..." style={st.input} /></div>
                <div><label style={{fontSize:'12px',color:'#64748b'}}>Team Members</label><input value={rcaData.team_members} onChange={e=>setRcaData({...rcaData,team_members:e.target.value})} placeholder="List all team members..." style={st.input} /></div>
              </div>
              <div style={{marginTop:'12px'}}>
                <label style={{fontSize:'12px',color:'#64748b'}}>RCA Method</label>
                <select value={rcaData.rca_method} onChange={e=>setRcaData({...rcaData,rca_method:e.target.value})} style={st.input}>
                  <option value="Standard RCA">Standard RCA</option>
                  <option value="Fishbone/Ishikawa">Fishbone / Ishikawa Diagram</option>
                  <option value="Fault Tree Analysis">Fault Tree Analysis</option>
                  <option value="Change Analysis">Change Analysis</option>
                  <option value="Barrier Analysis">Barrier Analysis</option>
                </select>
              </div>
            </div>

            {/* Problem Statement */}
            <div style={st.factorCard}>
              <div style={st.factorLabel}>📝 Problem Statement</div>
              <div style={st.factorHint}>Clearly define the incident being investigated</div>
              <textarea value={rcaData.problem_statement} onChange={e=>setRcaData({...rcaData,problem_statement:e.target.value})} placeholder="Clearly and concisely define the problem..." style={{...st.input,minHeight:'100px',resize:'vertical'}} />
            </div>

            {/* 10 Contributing Factor Categories */}
            <div style={{...st.sectionHeader,background:'#7c3aed'}}>🔬 Contributing Factor Analysis</div>
            <p style={{color:'#64748b',marginBottom:'20px'}}>Analyze each category for potential contributing factors. Leave blank if not applicable.</p>

            {[
              {key:'equipment_factors',icon:'🔧',label:'Equipment / Tools',hint:'Equipment failures, defects, wrong tool for task, design issues, maintenance status...'},
              {key:'procedure_factors',icon:'📋',label:'Procedures',hint:'Missing procedures, unclear or outdated procedures, procedures not followed, conflicting procedures...'},
              {key:'training_factors',icon:'🎓',label:'Training',hint:'No training provided, inadequate training, training not current, competency gaps, OJT issues...'},
              {key:'human_factors',icon:'🧠',label:'Human Factors',hint:'Fatigue, complacency, distraction, rushing, frustration, decision-making, situational awareness...'},
              {key:'communication_factors',icon:'💬',label:'Communication',hint:'Miscommunication, language barriers, shift handover failures, unclear instructions, missing comms...'},
              {key:'supervision_factors',icon:'👷',label:'Supervision',hint:'Inadequate oversight, supervisor not present, failed to enforce standards, workload management...'},
              {key:'design_factors',icon:'📐',label:'Design / Engineering',hint:'Facility design flaws, inadequate engineering controls, missing guards or barriers, ergonomic issues...'},
              {key:'maintenance_factors',icon:'🔨',label:'Maintenance',hint:'Preventive maintenance missed, corrective maintenance delayed, inadequate maintenance procedures...'},
              {key:'environmental_factors',icon:'🌡️',label:'Environmental',hint:'Weather conditions, lighting, noise, temperature extremes, surface conditions, visibility, confined space...'},
              {key:'organizational_factors',icon:'🏢',label:'Organizational / Culture',hint:'Production pressure, inadequate staffing, budget constraints, safety culture, management of change...'}
            ].map(({key,icon,label,hint})=>(
              <div key={key} style={st.factorCard}>
                <div style={st.factorLabel}>{icon} {label}</div>
                <div style={st.factorHint}>{hint}</div>
                <textarea value={rcaData[key]} onChange={e=>setRcaData({...rcaData,[key]:e.target.value})} placeholder={`Describe any ${label.toLowerCase()} that contributed to this event...`} style={{...st.input,minHeight:'80px',resize:'vertical'}} />
              </div>
            ))}

            {/* Root Causes, Contributing Factors, Systemic Issues, Recommendations */}
            <div style={{...st.sectionHeader,background:'#dc2626',marginTop:'25px'}}>🎯 Root Cause Identification</div>

            <div style={st.factorCard}>
              <div style={st.factorLabel}>Root Causes Identified</div>
              <div style={st.factorHint}>Based on the analysis above, what are the fundamental root causes?</div>
              <textarea value={rcaData.root_causes_identified} onChange={e=>setRcaData({...rcaData,root_causes_identified:e.target.value})} placeholder="List all root causes identified from the analysis..." style={{...st.input,minHeight:'120px',resize:'vertical'}} />
            </div>

            <div style={st.factorCard}>
              <div style={st.factorLabel}>Contributing Factors Summary</div>
              <textarea value={rcaData.contributing_factors_summary} onChange={e=>setRcaData({...rcaData,contributing_factors_summary:e.target.value})} placeholder="Summarize all contributing factors..." style={{...st.input,minHeight:'100px',resize:'vertical'}} />
            </div>

            <div style={{...st.factorCard,border:'2px solid #f59e0b',background:'#fffbeb'}}>
              <div style={st.factorLabel}>⚠️ Systemic Issues</div>
              <div style={st.factorHint}>Are there systemic/organizational issues that allowed this to happen? Could this happen elsewhere?</div>
              <textarea value={rcaData.systemic_issues} onChange={e=>setRcaData({...rcaData,systemic_issues:e.target.value})} placeholder="Identify any systemic issues that need to be addressed organization-wide..." style={{...st.input,minHeight:'100px',resize:'vertical'}} />
            </div>

            <div style={{...st.factorCard,border:'2px solid #22c55e',background:'#f0fdf4'}}>
              <div style={st.factorLabel}>✅ Recommendations</div>
              <div style={st.factorHint}>What specific recommendations come out of this analysis? (Corrective actions will be tracked separately)</div>
              <textarea value={rcaData.recommendations} onChange={e=>setRcaData({...rcaData,recommendations:e.target.value})} placeholder="List recommendations for preventing recurrence..." style={{...st.input,minHeight:'120px',resize:'vertical'}} />
            </div>

            {/* =============================== */}
            {/* CAUSAL TREE DIAGRAM (auto-generated) */}
            {/* =============================== */}
            {(() => {
              // Build tree data from RCA fields
              const factors = [
                {key:'equipment_factors',icon:'🔧',label:'Equipment',color:'#3b82f6'},
                {key:'procedure_factors',icon:'📋',label:'Procedures',color:'#8b5cf6'},
                {key:'training_factors',icon:'🎓',label:'Training',color:'#06b6d4'},
                {key:'human_factors',icon:'🧠',label:'Human Factors',color:'#f59e0b'},
                {key:'communication_factors',icon:'💬',label:'Communication',color:'#ec4899'},
                {key:'supervision_factors',icon:'👷',label:'Supervision',color:'#14b8a6'},
                {key:'design_factors',icon:'📐',label:'Design/Eng.',color:'#6366f1'},
                {key:'maintenance_factors',icon:'🔨',label:'Maintenance',color:'#f97316'},
                {key:'environmental_factors',icon:'🌡️',label:'Environmental',color:'#22c55e'},
                {key:'organizational_factors',icon:'🏢',label:'Organizational',color:'#ef4444'}
              ];
              const activeFactors = factors.filter(f => rcaData[f.key] && rcaData[f.key].trim().length > 0);
              const hasRootCauses = rcaData.root_causes_identified && rcaData.root_causes_identified.trim().length > 0;
              const hasSystemic = rcaData.systemic_issues && rcaData.systemic_issues.trim().length > 0;
              const hasEvent = incident.brief_description || incident.detailed_description;

              if (activeFactors.length === 0 && !hasRootCauses) return null;

              // Layout calculations
              const nodeW = 150, nodeH = 56, padX = 16, padY = 70;
              const tier2Count = activeFactors.length;
              const tier3Items = [];
              if (hasRootCauses) {
                const roots = rcaData.root_causes_identified.split(/\n|;|,/).map(s=>s.trim()).filter(s=>s.length>2);
                roots.forEach(r => tier3Items.push({label:r,color:'#dc2626'}));
              }
              if (hasSystemic) {
                const sys = rcaData.systemic_issues.split(/\n|;|,/).map(s=>s.trim()).filter(s=>s.length>2);
                sys.forEach(s => tier3Items.push({label:s,color:'#f59e0b'}));
              }
              const tier3Count = tier3Items.length;
              const maxCols = Math.max(tier2Count, tier3Count, 1);
              const svgW = Math.max(maxCols * (nodeW + padX) + padX, 600);
              const svgH = 80 + (tier2Count > 0 ? padY + nodeH : 0) + (tier3Count > 0 ? padY + nodeH : 0) + padY + nodeH + 40;

              // Tier positions
              const eventX = svgW / 2, eventY = 40;
              const tier2Y = eventY + padY + nodeH;
              const tier2StartX = (svgW - tier2Count * (nodeW + padX) + padX) / 2;
              const tier3Y = tier2Count > 0 ? tier2Y + padY + nodeH : eventY + padY + nodeH;
              const tier3StartX = (svgW - tier3Count * (nodeW + padX) + padX) / 2;

              function truncate(str, max) {
                if (!str) return '';
                const s = str.trim();
                return s.length > max ? s.substring(0, max-2) + '...' : s;
              }

              function exportCausalTreeSVG() {
                const svgEl = document.getElementById('causal-tree-svg');
                if (!svgEl) return;
                const svgData = new XMLSerializer().serializeToString(svgEl);
                const blob = new Blob([svgData], {type: 'image/svg+xml'});
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `causal-tree-${incident.incident_id || 'diagram'}.svg`;
                a.click();
                URL.revokeObjectURL(url);
              }

              return (
                <div style={{marginTop:'30px'}}>
                  <div style={{...st.sectionHeader,background:'#1e293b',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span>🌳 Causal Tree Diagram</span>
                    <button onClick={exportCausalTreeSVG} style={{background:'rgba(255,255,255,0.2)',color:'white',border:'1px solid rgba(255,255,255,0.3)',padding:'4px 14px',borderRadius:'6px',cursor:'pointer',fontSize:'12px'}}>📷 Export SVG</button>
                  </div>
                  <p style={{color:'#64748b',marginBottom:'15px',fontSize:'13px'}}>Auto-generated from your analysis. Only categories with content appear. Export as SVG for reports.</p>
                  <div style={{background:'#fafafa',border:'2px solid #e2e8f0',borderRadius:'12px',padding:'20px',overflow:'auto'}}>
                    <svg id="causal-tree-svg" width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} xmlns="http://www.w3.org/2000/svg" style={{display:'block',margin:'0 auto',maxWidth:'100%'}}>
                      {/* Background */}
                      <rect width={svgW} height={svgH} fill="#fafafa" rx="8"/>

                      {/* TIER 0: EVENT NODE */}
                      <rect x={eventX - nodeW*0.75} y={eventY - 20} width={nodeW*1.5} height={nodeH} rx="10" fill="#1e293b" stroke="#0f172a" strokeWidth="2"/>
                      <text x={eventX} y={eventY + 2} textAnchor="middle" fill="white" fontSize="11" fontWeight="600">⚡ INCIDENT EVENT</text>
                      <text x={eventX} y={eventY + 18} textAnchor="middle" fill="#94a3b8" fontSize="9">{truncate(hasEvent ? (incident.brief_description || incident.detailed_description) : incident.incident_id, 40)}</text>

                      {/* Lines from event to tier 2 */}
                      {activeFactors.map((f, i) => {
                        const fx = tier2StartX + i * (nodeW + padX) + nodeW/2;
                        return <line key={`l1-${i}`} x1={eventX} y1={eventY + nodeH - 20} x2={fx} y2={tier2Y - 20} stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4,3"/>;
                      })}

                      {/* TIER 1: CONTRIBUTING FACTOR NODES */}
                      {activeFactors.map((f, i) => {
                        const fx = tier2StartX + i * (nodeW + padX);
                        const cx = fx + nodeW/2;
                        return (
                          <g key={`t2-${i}`}>
                            <rect x={fx} y={tier2Y - 20} width={nodeW} height={nodeH} rx="8" fill="white" stroke={f.color} strokeWidth="2.5"/>
                            <rect x={fx} y={tier2Y - 20} width={nodeW} height={18} rx="8" fill={f.color}/>
                            <rect x={fx} y={tier2Y - 10} width={nodeW} height={10} fill={f.color}/>
                            <text x={cx} y={tier2Y - 5} textAnchor="middle" fill="white" fontSize="9" fontWeight="700">{f.icon} {f.label}</text>
                            <text x={cx} y={tier2Y + 14} textAnchor="middle" fill="#334155" fontSize="8">{truncate(rcaData[f.key], 22)}</text>
                            <text x={cx} y={tier2Y + 26} textAnchor="middle" fill="#64748b" fontSize="7">{truncate(rcaData[f.key]?.substring(22), 22)}</text>
                          </g>
                        );
                      })}

                      {/* Lines from tier 2 to tier 3 */}
                      {tier3Items.map((item, i) => {
                        const tx = tier3StartX + i * (nodeW + padX) + nodeW/2;
                        // Connect to nearest tier2 node or event
                        const sourceY = tier2Count > 0 ? tier2Y + nodeH - 20 : eventY + nodeH - 20;
                        const sourceX = tier2Count > 0 ? tier2StartX + Math.min(i, tier2Count-1) * (nodeW + padX) + nodeW/2 : eventX;
                        return <line key={`l2-${i}`} x1={sourceX} y1={sourceY} x2={tx} y2={tier3Y - 20} stroke={item.color} strokeWidth="1.5" strokeDasharray="4,3"/>;
                      })}

                      {/* TIER 2: ROOT CAUSES & SYSTEMIC ISSUES */}
                      {tier3Items.map((item, i) => {
                        const tx = tier3StartX + i * (nodeW + padX);
                        const cx = tx + nodeW/2;
                        const isSystemic = item.color === '#f59e0b';
                        return (
                          <g key={`t3-${i}`}>
                            <rect x={tx} y={tier3Y - 20} width={nodeW} height={nodeH} rx="8" fill={isSystemic ? '#fffbeb' : '#fef2f2'} stroke={item.color} strokeWidth="2.5"/>
                            <rect x={tx} y={tier3Y - 20} width={nodeW} height={18} rx="8" fill={item.color}/>
                            <rect x={tx} y={tier3Y - 10} width={nodeW} height={10} fill={item.color}/>
                            <text x={cx} y={tier3Y - 5} textAnchor="middle" fill="white" fontSize="9" fontWeight="700">{isSystemic ? '⚠️ SYSTEMIC' : '🎯 ROOT CAUSE'}</text>
                            <text x={cx} y={tier3Y + 14} textAnchor="middle" fill="#334155" fontSize="8">{truncate(item.label, 22)}</text>
                            <text x={cx} y={tier3Y + 26} textAnchor="middle" fill="#64748b" fontSize="7">{truncate(item.label?.substring(22), 22)}</text>
                          </g>
                        );
                      })}

                      {/* Watermark */}
                      <text x={svgW - 10} y={svgH - 8} textAnchor="end" fill="#cbd5e1" fontSize="8">AnthroSafe{'\u2122'} Causal Tree | {incident.incident_id} | {new Date().toLocaleDateString()}</text>
                    </svg>
                  </div>
                </div>
              );
            })()}

            <button onClick={saveRCAAnalysis} disabled={saving} style={{...st.primaryBtn,marginTop:'20px',padding:'12px 30px',fontSize:'16px'}}>{saving?'Saving...':'💾 Save Comprehensive RCA'}</button>
          </div>}
        </div>}

        {/* CORRECTIVE ACTIONS */}
        {activeTab==='Corrective Actions' && <div>
          <h3>Corrective Actions</h3>
          <div style={{background:'#f8fafc',padding:'20px',borderRadius:'12px',marginBottom:'20px'}}>
            <textarea placeholder="Action description *" value={newCA.action_description} onChange={e=>setNewCA({...newCA,action_description:e.target.value})} style={{...st.input,minHeight:'80px',resize:'vertical',marginBottom:'15px'}} />
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:'10px',marginBottom:'15px'}}>
              <select value={newCA.hierarchy_control} onChange={e=>setNewCA({...newCA,hierarchy_control:e.target.value})} style={st.input}><option value="1-Elimination">1. Elimination</option><option value="2-Substitution">2. Substitution</option><option value="3-Engineering Controls">3. Engineering Controls</option><option value="4-Administrative Controls">4. Administrative Controls</option><option value="5-PPE">5. PPE</option></select>
              <input placeholder="Owner *" value={newCA.action_owner_name} onChange={e=>setNewCA({...newCA,action_owner_name:e.target.value})} style={st.input} />
        <input type="email" placeholder="Owner email" value={newCA.action_owner_email} onChange={e=>setNewCA({...newCA,action_owner_email:e.target.value})} style={st.input}/>
              <input type="date" value={newCA.target_date} onChange={e=>setNewCA({...newCA,target_date:e.target.value})} style={st.input} />
              <select value={newCA.action_status} onChange={e=>setNewCA({...newCA,action_status:e.target.value})} style={st.input}><option value="Open">Open</option><option value="In Progress">In Progress</option><option value="Pending Verification">Pending Verification</option><option value="Completed">Completed</option><option value="Verified Effective">Verified Effective</option><option value="Overdue">Overdue</option><option value="Cancelled">Cancelled</option></select>
            </div>
            <button onClick={addCA} disabled={saving} style={st.primaryBtn}>+ Add Action</button>
          </div>
          <div style={{display:'grid',gap:'15px'}}>
            {correctiveActions.map(ca=>(
              <div key={ca.id} style={{background:'white',border:'1px solid #e2e8f0',borderRadius:'8px',padding:'15px'}}>
                {editingCA===ca.id ? <div style={{display:'grid',gap:'10px'}}>
                  <textarea value={ca.action_description} onChange={e=>setCorrectiveActions(correctiveActions.map(x=>x.id===ca.id?{...x,action_description:e.target.value}:x))} style={{...st.input,minHeight:'80px',resize:'vertical'}} />
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:'10px'}}>
                    <select value={ca.hierarchy_control} onChange={e=>setCorrectiveActions(correctiveActions.map(x=>x.id===ca.id?{...x,hierarchy_control:e.target.value}:x))} style={st.input}><option value="1-Elimination">1. Elimination</option><option value="2-Substitution">2. Substitution</option><option value="3-Engineering Controls">3. Engineering Controls</option><option value="4-Administrative Controls">4. Administrative Controls</option><option value="5-PPE">5. PPE</option></select>
                    <input value={ca.action_owner_name||''} onChange={e=>setCorrectiveActions(correctiveActions.map(x=>x.id===ca.id?{...x,action_owner_name:e.target.value}:x))} style={st.input} />
                    <input type="date" value={ca.target_date||''} onChange={e=>setCorrectiveActions(correctiveActions.map(x=>x.id===ca.id?{...x,target_date:e.target.value}:x))} style={st.input} />
                    <select value={ca.action_status} onChange={e=>setCorrectiveActions(correctiveActions.map(x=>x.id===ca.id?{...x,action_status:e.target.value}:x))} style={st.input}><option value="Open">Open</option><option value="In Progress">In Progress</option><option value="Pending Verification">Pending Verification</option><option value="Completed">Completed</option><option value="Verified Effective">Verified Effective</option><option value="Overdue">Overdue</option><option value="Cancelled">Cancelled</option></select>
                  </div>
                  <SaveCancelBtns onSave={()=>saveCAEdit(ca)} onCancel={()=>{setEditingCA(null);loadAll();}} />
                </div> : <div>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:'10px'}}>
                    <div><span style={{background:'#dbeafe',color:'#1e40af',padding:'4px 12px',borderRadius:'6px',fontSize:'12px',marginRight:'8px'}}>{ca.hierarchy_control}</span><span style={{background:ca.action_status==='Completed'?'#dcfce7':ca.action_status==='In Progress'?'#fef3c7':'#fee2e2',color:ca.action_status==='Completed'?'#15803d':ca.action_status==='In Progress'?'#d97706':'#dc2626',padding:'4px 12px',borderRadius:'6px',fontSize:'12px'}}>{ca.action_status}</span></div>
                    <div style={{display:'flex',gap:'8px',alignItems:'center'}}><span style={{color:'#64748b',fontSize:'13px'}}>Due: {ca.target_date||'—'}</span><EditDeleteBtns onEdit={()=>setEditingCA(ca.id)} onDelete={()=>deleteCA(ca)} /></div>
                  </div>
                  <p style={{margin:'10px 0',color:'#334155'}}>{ca.action_description}</p>
                  <div style={{fontSize:'13px',color:'#64748b'}}>Owner: {ca.action_owner_name}</div>
                </div>}
              </div>
            ))}
          </div>
        </div>}

        {/* LESSONS */}
        {activeTab==='Lessons Learned' && <div>
          <h3>Lessons Learned</h3>
          <div style={{background:'#f8fafc',padding:'20px',borderRadius:'12px',marginBottom:'20px'}}>
            <input placeholder="Title *" value={newLesson.lesson_title} onChange={e=>setNewLesson({...newLesson,lesson_title:e.target.value})} style={{...st.input,marginBottom:'15px'}} />
            <textarea placeholder="Description *" value={newLesson.lesson_description} onChange={e=>setNewLesson({...newLesson,lesson_description:e.target.value})} style={{...st.input,minHeight:'100px',resize:'vertical',marginBottom:'15px'}} />
            <input placeholder="Key Takeaway" value={newLesson.key_takeaway} onChange={e=>setNewLesson({...newLesson,key_takeaway:e.target.value})} style={{...st.input,marginBottom:'15px'}} />
            <button onClick={addLesson} disabled={saving} style={st.primaryBtn}>+ Add Lesson</button>
          </div>
          <div style={{display:'grid',gap:'15px'}}>
            {lessonsLearned.map(l=>(
              <div key={l.id} style={{background:'white',border:'1px solid #e2e8f0',borderRadius:'8px',padding:'15px'}}>
                {editingLesson===l.id ? <div style={{display:'grid',gap:'10px'}}>
                  <input value={l.lesson_title} onChange={e=>setLessonsLearned(lessonsLearned.map(x=>x.id===l.id?{...x,lesson_title:e.target.value}:x))} style={st.input} />
                  <textarea value={l.lesson_description} onChange={e=>setLessonsLearned(lessonsLearned.map(x=>x.id===l.id?{...x,lesson_description:e.target.value}:x))} style={{...st.input,minHeight:'100px',resize:'vertical'}} />
                  <input value={l.key_takeaway||''} onChange={e=>setLessonsLearned(lessonsLearned.map(x=>x.id===l.id?{...x,key_takeaway:e.target.value}:x))} placeholder="Key takeaway" style={st.input} />
                  <SaveCancelBtns onSave={()=>saveLessonEdit(l)} onCancel={()=>{setEditingLesson(null);loadAll();}} />
                </div> : <div>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:'10px'}}>
                    <h4 style={{marginTop:0,color:'#1e40af'}}>{l.lesson_title}</h4>
                    <EditDeleteBtns onEdit={()=>setEditingLesson(l.id)} onDelete={()=>deleteLesson(l)} />
                  </div>
                  <p style={{margin:'10px 0',color:'#334155'}}>{l.lesson_description}</p>
                  {l.key_takeaway && <div style={{background:'#fef3c7',padding:'10px',borderRadius:'6px',marginTop:'10px'}}><strong>Key Takeaway:</strong> {l.key_takeaway}</div>}
                </div>}
              </div>
            ))}
          </div>
        </div>}

        {/* REVIEW */}
        {activeTab==='Review & Approve' && <div>
          {/* SPELL CHECK SECTION */}
          <div style={{background:'#f8fafc',padding:'20px',borderRadius:'12px',marginBottom:'25px',border:'2px solid #e2e8f0'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'15px'}}>
              <h3 style={{margin:0}}>📝 Spell Check & Grammar Review (US English)</h3>
              <button onClick={runSpellCheck} disabled={spellChecking} style={{...st.primaryBtn,background:'#7c3aed',padding:'10px 24px'}}>{spellChecking?'Checking...':'🔍 Run Spell Check'}</button>
            </div>
            {spellCheckResults===null && <p style={{color:'#64748b',margin:0}}>Run spell check before completing the investigation to catch spelling and grammar issues across all text fields.</p>}
            {spellCheckResults!==null && spellCheckResults.length===0 && <div style={{background:'#f0fdf4',border:'2px solid #22c55e',borderRadius:'8px',padding:'20px',textAlign:'center'}}><span style={{fontSize:'48px',display:'block',marginBottom:'10px'}}>✅</span><strong style={{color:'#15803d',fontSize:'18px'}}>No issues found!</strong><p style={{color:'#166534',margin:'10px 0 0 0'}}>All text fields pass spelling and grammar checks.</p></div>}
            {spellCheckResults!==null && spellCheckResults.length>0 && <div>
              <div style={{display:'flex',gap:'15px',marginBottom:'15px',flexWrap:'wrap'}}>
                <span style={{background:'#fef2f2',color:'#dc2626',padding:'6px 14px',borderRadius:'8px',fontWeight:'500',fontSize:'14px'}}>🔴 {spellCheckResults.filter(r=>r.severity==='error').length} Spelling</span>
                <span style={{background:'#fefce8',color:'#ca8a04',padding:'6px 14px',borderRadius:'8px',fontWeight:'500',fontSize:'14px'}}>🟡 {spellCheckResults.filter(r=>r.severity==='warning').length} Grammar</span>
                <span style={{color:'#64748b',fontSize:'14px',padding:'6px 0'}}>Navigate to each tab to fix issues, then re-run check.</span>
              </div>
              <div style={{maxHeight:'400px',overflowY:'auto',border:'1px solid #e2e8f0',borderRadius:'8px'}}>
                {spellCheckResults.map((r,i)=>(
                  <div key={i} style={{padding:'12px 16px',borderBottom:'1px solid #f1f5f9',background:r.severity==='error'?'#fef2f2':'#fefce8',display:'flex',gap:'12px',alignItems:'flex-start'}}>
                    <span style={{fontSize:'18px',flexShrink:0}}>{r.severity==='error'?'🔴':'🟡'}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'4px'}}>
                        <span style={{background:'#dbeafe',color:'#1e40af',padding:'2px 10px',borderRadius:'4px',fontSize:'12px',fontWeight:'500'}}>{r.section}</span>
                        <span style={{color:'#64748b',fontSize:'12px'}}>{r.field}</span>
                      </div>
                      <div style={{fontSize:'14px'}}>
                        {r.type==='spelling' ? <span><strong style={{color:'#dc2626',textDecoration:'line-through'}}>{r.word}</strong> → <strong style={{color:'#15803d'}}>{r.suggestion}</strong></span> : <span><strong style={{color:'#ca8a04'}}>{r.word}</strong> — {r.msg}{r.suggestion&&r.suggestion!=='(review manually)'?<span> → <strong style={{color:'#15803d'}}>{r.suggestion}</strong></span>:''}</span>}
                      </div>
                      <div style={{fontSize:'12px',color:'#94a3b8',marginTop:'4px',fontStyle:'italic',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>...{r.context}...</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>}
          </div>

          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:'20px'}}>
            <div><h3>Status</h3><div style={{background:'#f8fafc',padding:'20px',borderRadius:'12px',marginBottom:'20px'}}><strong>Current:</strong> <span style={{background:'#dbeafe',color:'#1e40af',padding:'6px 15px',borderRadius:'8px',fontWeight:'500'}}>{incident.status}</span></div>
              <h4>Actions</h4><div style={{display:'flex',flexWrap:'wrap',gap:'10px'}}>
                {incident.status==='Draft'&&<button onClick={()=>updateStatus('Submitted')} style={st.primaryBtn}>Submit</button>}
                {incident.status==='Submitted'&&<button onClick={()=>updateStatus('Under Review - Triage')} style={st.primaryBtn}>Start Triage</button>}
                {incident.status==='Under Review - Triage'&&<button onClick={()=>updateStatus('Under Review - First Draft')} style={st.primaryBtn}>Begin Investigation</button>}
                {incident.status==='Under Review - First Draft'&&<button onClick={()=>updateStatus('Under Review - Asset Review')} style={st.primaryBtn}>Asset Review</button>}
                {incident.status==='Under Review - Asset Review'&&<button onClick={()=>updateStatus('Under Review - Final Review')} style={st.primaryBtn}>Final Review</button>}
                {incident.status==='Under Review - Final Review'&&<button onClick={()=>updateStatus('Pending Approval')} style={st.secondaryBtn}>Submit for Approval</button>}
                {incident.status==='Pending Approval'&&<><button onClick={()=>updateStatus('Approved')} style={st.primaryBtn}>✅ Approve</button><button onClick={()=>updateStatus('Under Review - Final Review')} style={st.outlineBtn}>Return</button></>}
                {incident.status==='Approved'&&<button onClick={()=>updateStatus('Closed')} style={{...st.primaryBtn,background:'#059669'}}>🔒 Close</button>}
                {incident.status==='Closed'&&<div style={{color:'#059669',fontWeight:'500',padding:'10px 20px'}}>✅ Closed</div>}
              </div>
            </div>
            <div><h3>Checklist</h3><div style={{background:'#f8fafc',padding:'20px',borderRadius:'12px'}}>
              {[{l:'Timeline',d:timelineEvents.length>0,c:timelineEvents.length},{l:'Evidence',d:evidence.length>0,c:evidence.length},{l:'Witnesses',d:witnesses.length>0,c:witnesses.length},{l:'Analysis',d:analysisHasContent,c:null},{l:'Actions',d:correctiveActions.length>0,c:correctiveActions.length},{l:'Lessons',d:lessonsLearned.length>0,c:lessonsLearned.length}].map((item,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'10px'}}>
                  <span style={{width:'24px',height:'24px',borderRadius:'50%',background:item.d?'#22c55e':'#e2e8f0',color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'14px'}}>{item.d?'✓':''}</span>
                  <span>{item.l} {item.c!==null&&`(${item.c})`}</span>
                </div>
              ))}
            </div></div>
          </div>
        </div>}
      </div>
      </div>
    </div>

    <div style={st.footer}><span style={{fontWeight:'500'}}>AnthroSafe{'\u2122'} Field Driven Safety</span> | {'\u00A9'} 2026 SLP Alaska, LLC</div>
    </div>
  );
}

'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

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
  const [localReview, setLocalReview] = useState('');
  const [fiveWhy, setFiveWhy] = useState('');
  const [rcaAnalysis, setRcaAnalysis] = useState('');
  const [showEvidenceUpload, setShowEvidenceUpload] = useState(false);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [newEvidence, setNewEvidence] = useState({ type: 'Photo', description: '', files: [] });
  const [newTimelineEvent, setNewTimelineEvent] = useState({ event_date: '', event_time: '', event_description: '', critical: false });
  const [newWitness, setNewWitness] = useState({ witness_name: '', position_role: '', company: '', statement_summary: '' });
  const [newCA, setNewCA] = useState({ action_description: '', hierarchy_control: '1-Elimination', action_owner_name: '', target_date: '', action_status: 'Open' });
  const [newLesson, setNewLesson] = useState({ lesson_title: '', lesson_description: '', key_takeaway: '' });
  const [editingTimeline, setEditingTimeline] = useState(null);
  const [editingWitness, setEditingWitness] = useState(null);
  const [editingCA, setEditingCA] = useState(null);
  const [editingLesson, setEditingLesson] = useState(null);
  const [spellCheckResults, setSpellCheckResults] = useState(null);
  const [spellChecking, setSpellChecking] = useState(false);

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
      setLocalReview(lrR.data?.review_text || lrR.data?.findings || '');
      setFiveWhy(fwR.data?.analysis_text || fwR.data?.findings || '');
      setRcaAnalysis(rcR.data?.analysis_text || rcR.data?.findings || '');
    } catch (e) { console.error(e); alert('Error: ' + e.message); setIncident(null); }
    finally { setLoading(false); }
  }

  async function handleLogin(e) { e.preventDefault(); if (userEmail.endsWith('@slpalaska.com')) { localStorage.setItem('slp_investigator_email', userEmail); setAuthenticated(true); loadAll(); } else alert('Restricted to @slpalaska.com'); }
  async function updateStatus(st) { try { const { error } = await supabase.from('incidents').update({ status: st, updated_at: new Date().toISOString() }).eq('id', id); if (error) throw error; setIncident({ ...incident, status: st }); alert('Status: ' + st); } catch (e) { alert(e.message); } }

  async function addTimelineEvent() { if (!newTimelineEvent.event_date || !newTimelineEvent.event_description) { alert('Fill date+description'); return; } setSaving(true); try { const n=timelineEvents.length+1; const { data, error } = await supabase.from('timeline_events').insert({ incident_id:id, sequence_number:n, event_date:newTimelineEvent.event_date, event_time:newTimelineEvent.event_time||null, event_description:newTimelineEvent.event_description, critical:newTimelineEvent.critical, created_by_email:userEmail }).select().single(); if(error)throw error; setTimelineEvents([...timelineEvents,data]); setNewTimelineEvent({event_date:'',event_time:'',event_description:'',critical:false}); await supabase.from('incidents').update({timeline_event_count:n,timeline_developed:true}).eq('id',id); } catch(e){alert(e.message);} finally{setSaving(false);} }
  async function saveTimelineEdit(item) { setSaving(true); try { const{error}=await supabase.from('timeline_events').update({event_date:item.event_date,event_time:item.event_time,event_description:item.event_description,critical:item.critical}).eq('id',item.id); if(error)throw error; setTimelineEvents(timelineEvents.map(e=>e.id===item.id?{...e,...item}:e)); setEditingTimeline(null); } catch(e){alert(e.message);} finally{setSaving(false);} }
  async function deleteTimelineEvent(item) { if(!confirm('Delete event?'))return; try { const{error}=await supabase.from('timeline_events').delete().eq('id',item.id); if(error)throw error; const u=timelineEvents.filter(e=>e.id!==item.id); setTimelineEvents(u); await supabase.from('incidents').update({timeline_event_count:u.length}).eq('id',id); } catch(e){alert(e.message);} }

  async function uploadEvidence() { if(!newEvidence.files.length)return; setUploadingEvidence(true); try { for(const file of newEvidence.files){ const ext=file.name.split('.').pop(); const fn=`${incident.incident_id}_ev_${Date.now()}.${ext}`; const fp=`incidents/${id}/${fn}`; const{error:ue}=await supabase.storage.from('evidence').upload(fp,file); if(ue)throw ue; const{data:ud}=supabase.storage.from('evidence').getPublicUrl(fp); const n=evidence.length+1; const{data,error}=await supabase.from('investigation_evidence').insert({incident_id:id,evidence_number:n,evidence_type:newEvidence.type,evidence_category:'Investigation',file_name:fn,file_url:ud.publicUrl,description:newEvidence.description||`${newEvidence.type} from investigation`,uploaded_by_email:userEmail,source:'workbench'}).select().single(); if(error)throw error; setEvidence(prev=>[...prev,data]); } await supabase.from('incidents').update({evidence_count:evidence.length+newEvidence.files.length}).eq('id',id); setNewEvidence({type:'Photo',description:'',files:[]}); setShowEvidenceUpload(false); alert('Uploaded!'); } catch(e){alert(e.message);} finally{setUploadingEvidence(false);} }

  async function addWitness() { if(!newWitness.witness_name||!newWitness.statement_summary){alert('Fill name+statement');return;} setSaving(true); try { const n=witnesses.length+1; const{data,error}=await supabase.from('witness_statements').insert({incident_id:id,witness_number:n,witness_name:newWitness.witness_name,position_role:newWitness.position_role||null,company:newWitness.company||null,statement_summary:newWitness.statement_summary,created_by_email:userEmail}).select().single(); if(error)throw error; setWitnesses([...witnesses,data]); setNewWitness({witness_name:'',position_role:'',company:'',statement_summary:''}); await supabase.from('incidents').update({witness_count:n}).eq('id',id); } catch(e){alert(e.message);} finally{setSaving(false);} }
  async function saveWitnessEdit(item) { setSaving(true); try { const{error}=await supabase.from('witness_statements').update({witness_name:item.witness_name,position_role:item.position_role,company:item.company,statement_summary:item.statement_summary}).eq('id',item.id); if(error)throw error; setWitnesses(witnesses.map(w=>w.id===item.id?{...w,...item}:w)); setEditingWitness(null); } catch(e){alert(e.message);} finally{setSaving(false);} }
  async function deleteWitness(item) { if(!confirm('Delete witness?'))return; try { const{error}=await supabase.from('witness_statements').delete().eq('id',item.id); if(error)throw error; const u=witnesses.filter(w=>w.id!==item.id); setWitnesses(u); await supabase.from('incidents').update({witness_count:u.length}).eq('id',id); } catch(e){alert(e.message);} }

  async function addCA() { if(!newCA.action_description||!newCA.action_owner_name){alert('Fill action+owner');return;} setSaving(true); try { const n=correctiveActions.length+1; const{data,error}=await supabase.from('investigation_corrective_actions').insert({incident_id:id,action_number:n,action_description:newCA.action_description,hierarchy_control:newCA.hierarchy_control,action_owner_name:newCA.action_owner_name,target_date:newCA.target_date||null,action_status:newCA.action_status,created_by_email:userEmail}).select().single(); if(error)throw error; setCorrectiveActions([...correctiveActions,data]); setNewCA({action_description:'',hierarchy_control:'1-Elimination',action_owner_name:'',target_date:'',action_status:'Open'}); await supabase.from('incidents').update({corrective_actions_count:n}).eq('id',id); } catch(e){alert(e.message);} finally{setSaving(false);} }
  async function saveCAEdit(item) { setSaving(true); try { const{error}=await supabase.from('investigation_corrective_actions').update({action_description:item.action_description,hierarchy_control:item.hierarchy_control,action_owner_name:item.action_owner_name,target_date:item.target_date||null,action_status:item.action_status}).eq('id',item.id); if(error)throw error; setCorrectiveActions(correctiveActions.map(c=>c.id===item.id?{...c,...item}:c)); setEditingCA(null); } catch(e){alert(e.message);} finally{setSaving(false);} }
  async function deleteCA(item) { if(!confirm('Delete action?'))return; try { const{error}=await supabase.from('investigation_corrective_actions').delete().eq('id',item.id); if(error)throw error; const u=correctiveActions.filter(c=>c.id!==item.id); setCorrectiveActions(u); await supabase.from('incidents').update({corrective_actions_count:u.length}).eq('id',id); } catch(e){alert(e.message);} }

  async function addLesson() { if(!newLesson.lesson_title||!newLesson.lesson_description){alert('Fill title+description');return;} setSaving(true); try { const n=lessonsLearned.length+1; const{data,error}=await supabase.from('investigation_lessons_learned').insert({incident_id:id,lesson_number:n,lesson_title:newLesson.lesson_title,lesson_description:newLesson.lesson_description,key_takeaway:newLesson.key_takeaway||null,added_by_email:userEmail}).select().single(); if(error)throw error; setLessonsLearned([...lessonsLearned,data]); setNewLesson({lesson_title:'',lesson_description:'',key_takeaway:''}); await supabase.from('incidents').update({lessons_learned_count:n}).eq('id',id); } catch(e){alert(e.message);} finally{setSaving(false);} }
  async function saveLessonEdit(item) { setSaving(true); try { const{error}=await supabase.from('investigation_lessons_learned').update({lesson_title:item.lesson_title,lesson_description:item.lesson_description,key_takeaway:item.key_takeaway}).eq('id',item.id); if(error)throw error; setLessonsLearned(lessonsLearned.map(l=>l.id===item.id?{...l,...item}:l)); setEditingLesson(null); } catch(e){alert(e.message);} finally{setSaving(false);} }
  async function deleteLesson(item) { if(!confirm('Delete lesson?'))return; try { const{error}=await supabase.from('investigation_lessons_learned').delete().eq('id',item.id); if(error)throw error; const u=lessonsLearned.filter(l=>l.id!==item.id); setLessonsLearned(u); await supabase.from('incidents').update({lessons_learned_count:u.length}).eq('id',id); } catch(e){alert(e.message);} }

  async function saveAnalysis(type, text) { setSaving(true); try { const tbl={'Local Review':'local_reviews','5-Why Analysis':'five_why_analyses','Full RCA':'rca_analyses','Root Cause Analysis':'rca_analyses'}[type]; if(!tbl)return; const{data:ex}=await supabase.from(tbl).select('id').eq('incident_id',id).maybeSingle(); const p={incident_id:id,findings:text,analysis_text:text,review_text:text,updated_at:new Date().toISOString()}; if(ex){const{error}=await supabase.from(tbl).update(p).eq('id',ex.id);if(error)throw error;}else{p.created_by_email=userEmail;const{error}=await supabase.from(tbl).insert(p);if(error)throw error;} alert('Saved!'); } catch(e){alert(e.message);} finally{setSaving(false);} }

  // ============================================================================
  // SPELL CHECK & GRAMMAR (US English)
  // ============================================================================

  // Common misspellings dictionary (safety/oilfield/investigation terms + general)
  const DICTIONARY = new Set([
    // Allow these industry terms (not misspellings)
    'psif','stky','lopc','loto','lockout','tagout','jsa','jha','tha','ppe','sif','hse',
    'spud','bop','blowout','wellbore','casing','tubing','annulus','derrick','drawworks',
    'doghouse','mousehole','rathole','roughneck','roustabout','toolpusher','driller',
    'floorhand','swamper','hotshot','coiled','wireline','snubbing','workover','frac',
    'slickline','bradenhead','flowback','kickback','h2s','nfpa','osha','api','ansi',
    'hilcorp','conocophillips','slp','anthrosafe','supabase','ridgeline','kuparuk',
    'prudhoe','endicott','badami','nikiski','ninilchik','kenai','pikka','deadhorse'
  ]);

  // Common misspellings with corrections
  const MISSPELLINGS = {
    'recieve':'receive','beleive':'believe','occured':'occurred','occurence':'occurrence',
    'occurrance':'occurrence','seperate':'separate','definately':'definitely','accomodate':'accommodate',
    'acheive':'achieve','agressive':'aggressive','apparant':'apparent','calender':'calendar',
    'catagory':'category','comittee':'committee','concious':'conscious','consistant':'consistent',
    'develope':'develop','enviroment':'environment','enviromental':'environmental','equiptment':'equipment',
    'explaination':'explanation','foriegn':'foreign','goverment':'government','gaurd':'guard',
    'harrass':'harass','immediatly':'immediately','independant':'independent','indispensible':'indispensable',
    'liason':'liaison','maintenence':'maintenance','maintainance':'maintenance','managment':'management',
    'manuever':'maneuver','millenium':'millennium','neccessary':'necessary','noticable':'noticeable',
    'occassion':'occasion','persistant':'persistent','personell':'personnel','personnell':'personnel',
    'posession':'possession','preceed':'precede','preceeding':'preceding','privledge':'privilege',
    'proceedure':'procedure','profesional':'professional','publically':'publicly','recomend':'recommend',
    'refered':'referred','referance':'reference','relevent':'relevant','rythm':'rhythm',
    'safty':'safety','saftey':'safety','sargent':'sergeant','seize':'seize','similer':'similar',
    'succesful':'successful','successfull':'successful','supercede':'supersede','surprize':'surprise',
    'temperture':'temperature','tendancy':'tendency','threshhold':'threshold','tommorow':'tomorrow',
    'truely':'truly','unforseen':'unforeseen','untill':'until','unusuall':'unusual','useable':'usable',
    'vehical':'vehicle','wierd':'weird','wellfare':'welfare','wether':'whether','withold':'withhold',
    'writting':'writing','incidant':'incident','incedent':'incident','investigaton':'investigation',
    'investagation':'investigation','corective':'corrective','correctve':'corrective','hazardus':'hazardous',
    'hazzardous':'hazardous','hazzard':'hazard','injurey':'injury','injery':'injury',
    'fatallity':'fatality','fataliy':'fatality','emergancy':'emergency','emergencey':'emergency',
    'preventation':'prevention','safegaurd':'safeguard','complience':'compliance','compliancy':'compliance',
    'mitagation':'mitigation','mitigattion':'mitigation','escallation':'escalation',
    'containement':'containment','contamanation':'contamination','remidiation':'remediation',
    'remedation':'remediation','decomissioning':'decommissioning','decomissioned':'decommissioned',
    'pressurised':'pressurized','unauthorised':'unauthorized','utilised':'utilized','recognised':'recognized',
    'analysed':'analyzed','minimised':'minimized','neutralised':'neutralized','organisation':'organization',
    'behaviours':'behaviors','colour':'color','honour':'honor','labour':'labor','favour':'favor',
    'defence':'defense','licence':'license','practise':'practice','judgement':'judgment',
    'acknowledgement':'acknowledgment','cancelled':'canceled','modelling':'modeling',
    'travelling':'traveling','focussed':'focused','fuelling':'fueling','levelling':'leveling',
    'councillor':'councilor','counsellor':'counselor','fulfil':'fulfill','enrol':'enroll',
    'instal':'install','skilful':'skillful','wilful':'willful',
    'dont':'don\'t','cant':'can\'t','wont':'won\'t','didnt':'didn\'t','wasnt':'wasn\'t',
    'isnt':'isn\'t','arent':'aren\'t','couldnt':'couldn\'t','shouldnt':'shouldn\'t','wouldnt':'wouldn\'t',
    'hasnt':'hasn\'t','havent':'haven\'t','hadnt':'hadn\'t','doesnt':'doesn\'t',
    'its':'its (or it\'s if meaning "it is")', 'alot':'a lot','infront':'in front',
    'eachother':'each other','everytime':'every time','infact':'in fact','alright':'all right',
    'noone':'no one','aswell':'as well','inbetween':'in between','ontop':'on top',
    'thier':'their','teh':'the','adn':'and','taht':'that','wiht':'with','hte':'the',
    'becuase':'because','becasue':'because','beacuse':'because','thn':'then','than':'than',
    'wich':'which','whcih':'which','htey':'they','jsut':'just','abuot':'about'
  };

  // Grammar patterns to check
  const GRAMMAR_RULES = [
    { pattern: /\bi\b(?![.\-'])/g, fix: 'I', msg: 'Capitalize "I"' },
    { pattern: /([.!?])\s+[a-z]/g, fix: null, msg: 'Capitalize after sentence-ending punctuation' },
    { pattern: /\s{2,}/g, fix: ' ', msg: 'Multiple spaces' },
    { pattern: /\byour\b\s+(a|an|the|going|not|very|really|quite|so|too)\b/gi, fix: null, msg: 'Possible "you\'re" instead of "your"' },
    { pattern: /\bthere\b\s+(was|were|is|are|will|would|could|should|has|have|had)\b\s+\w+ing\b/gi, fix: null, msg: 'Check: should this be "their" (possessive)?' },
    { pattern: /\bthen\b\s+(I|we|he|she|they|it)\b/gi, fix: null, msg: 'Check: should this be "than" (comparison)?' },
    { pattern: /\bcould of\b/gi, fix: 'could have', msg: '"could of" should be "could have"' },
    { pattern: /\bshould of\b/gi, fix: 'should have', msg: '"should of" should be "should have"' },
    { pattern: /\bwould of\b/gi, fix: 'would have', msg: '"would of" should be "would have"' },
    { pattern: /\beffect\b\s+(the|a|an|this|that|our|my|his|her|their|its)\b\s+\w+/gi, fix: null, msg: 'Check: should this be "affect" (verb)?' },
    { pattern: /[,]\s*$/gm, fix: null, msg: 'Trailing comma at end of line' },
    { pattern: /\b(very|really|extremely|highly)\s+\1\b/gi, fix: null, msg: 'Repeated word' },
    { pattern: /\b(\w+)\s+\1\b/gi, fix: null, msg: 'Possible repeated word' }
  ];

  function runSpellCheck() {
    setSpellChecking(true);
    const results = [];

    // Gather all text fields
    const textSources = [
      ...timelineEvents.map(e => ({ section: 'Timeline', id: e.id, field: 'description', text: e.event_description || '' })),
      ...witnesses.map(w => ({ section: 'Witnesses', id: w.id, field: 'statement_summary', text: w.statement_summary || '' })),
      ...witnesses.map(w => ({ section: 'Witnesses', id: w.id, field: 'witness_name', text: w.witness_name || '' })),
      ...correctiveActions.map(c => ({ section: 'Corrective Actions', id: c.id, field: 'action_description', text: c.action_description || '' })),
      ...lessonsLearned.map(l => ({ section: 'Lessons Learned', id: l.id, field: 'lesson_title', text: l.lesson_title || '' })),
      ...lessonsLearned.map(l => ({ section: 'Lessons Learned', id: l.id, field: 'lesson_description', text: l.lesson_description || '' })),
      ...lessonsLearned.map(l => ({ section: 'Lessons Learned', id: l.id, field: 'key_takeaway', text: l.key_takeaway || '' })),
      { section: 'Analysis', id: 'local', field: 'local_review', text: localReview || '' },
      { section: 'Analysis', id: '5why', field: 'five_why', text: fiveWhy || '' },
      { section: 'Analysis', id: 'rca', field: 'rca', text: rcaAnalysis || '' }
    ];

    textSources.forEach(source => {
      if (!source.text || source.text.trim().length === 0) return;
      const words = source.text.replace(/[.,!?;:()"'\/\-]/g, ' ').split(/\s+/).filter(w => w.length > 1);

      // Spelling check
      words.forEach(word => {
        const lower = word.toLowerCase();
        if (DICTIONARY.has(lower)) return;
        if (/^\d+$/.test(word) || /^[A-Z]{2,}$/.test(word)) return; // numbers and acronyms
        if (MISSPELLINGS[lower]) {
          results.push({
            section: source.section,
            type: 'spelling',
            severity: 'error',
            word: word,
            suggestion: MISSPELLINGS[lower],
            context: getWordContext(source.text, word),
            field: source.field
          });
        }
      });

      // Grammar check
      GRAMMAR_RULES.forEach(rule => {
        const matches = source.text.match(rule.pattern);
        if (matches) {
          matches.forEach(match => {
            // Skip repeated word check for common patterns
            if (rule.msg === 'Possible repeated word') {
              const repeated = match.trim().split(/\s+/);
              if (repeated[0].toLowerCase() === repeated[1]?.toLowerCase()) {
                // Allow "had had", "that that"
                if (['had','that','is','was'].includes(repeated[0].toLowerCase())) return;
              } else return;
            }
            results.push({
              section: source.section,
              type: 'grammar',
              severity: 'warning',
              word: match.trim(),
              suggestion: rule.fix || '(review manually)',
              context: getWordContext(source.text, match.trim()),
              msg: rule.msg,
              field: source.field
            });
          });
        }
      });
    });

    // US English check - common British spellings
    setSpellCheckResults(results);
    setSpellChecking(false);
  }

  function getWordContext(text, word) {
    const idx = text.toLowerCase().indexOf(word.toLowerCase());
    if (idx === -1) return word;
    const start = Math.max(0, idx - 30);
    const end = Math.min(text.length, idx + word.length + 30);
    return (start > 0 ? '...' : '') + text.slice(start, end) + (end < text.length ? '...' : '');
  }

  function generatePDF() {
    const sorted = [...timelineEvents].sort((a, b) => new Date(a.event_date + ' ' + (a.event_time || '00:00')) - new Date(b.event_date + ' ' + (b.event_time || '00:00')));
    const html = `<!DOCTYPE html><html><head><title>Report - ${incident.incident_id}</title><style>@page{margin:0.6in;size:letter}*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:11px;color:#1a1a1a;line-height:1.4}.header{background:linear-gradient(135deg,#1e3a5f,#2d5a87);color:white;padding:20px 25px;margin:-0.6in -0.6in 20px -0.6in}.header-title{font-size:22px;font-weight:700}.section{margin-bottom:18px;page-break-inside:avoid}.section-title{background:#1e3a5f;color:white;padding:7px 14px;font-size:13px;font-weight:700;border-radius:4px 4px 0 0}.section-body{border:1px solid #d1d5db;border-top:none;padding:14px;border-radius:0 0 4px 4px}.row{display:flex;gap:15px;margin-bottom:8px}.row .label{font-weight:700;min-width:130px;color:#374151}table{width:100%;border-collapse:collapse;margin-top:8px}th{background:#f3f4f6;padding:6px 10px;text-align:left;font-size:10px;font-weight:700;border:1px solid #d1d5db}td{padding:6px 10px;border:1px solid #d1d5db;font-size:11px}.critical-row{background:#fef3c7}.badge{display:inline-block;padding:3px 10px;border-radius:4px;font-weight:700;font-size:10px}.hierarchy-badge{display:inline-block;padding:2px 8px;border-radius:3px;font-size:9px;font-weight:700;color:white}.analysis-text{white-space:pre-wrap;background:#f9fafb;padding:10px;border-radius:4px;border:1px solid #e5e7eb}.two-col{display:grid;grid-template-columns:1fr 1fr;gap:15px}.check-yes{width:16px;height:16px;border-radius:50%;background:#22c55e;color:white;display:inline-flex;align-items:center;justify-content:center;font-size:10px}.check-no{width:16px;height:16px;border-radius:50%;background:#e2e8f0;display:inline-block}.checklist-item{display:flex;align-items:center;gap:8px;margin-bottom:5px}.takeaway{background:#fef3c7;padding:8px 12px;border-radius:4px;border-left:3px solid #f59e0b;margin-top:6px}.footer{margin-top:25px;padding-top:10px;border-top:2px solid #1e3a5f;text-align:center;font-size:9px;color:#6b7280}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body>
<div class="header"><div style="display:flex;justify-content:space-between"><div><div class="header-title">${incident.incident_id||'Report'}</div><div style="font-size:13px;opacity:0.9">${incident.investigation_type||''} Investigation</div></div><div>${incident.safety_severity?`<span class="badge" style="background:${'AB'.includes(incident.safety_severity)?'#dc2626':'CD'.includes(incident.safety_severity)?'#f97316':'#3b82f6'};color:white">Severity ${incident.safety_severity}</span>`:''} ${incident.psif_classification?`<span class="badge" style="background:#1f2937;color:white">${incident.psif_classification}</span>`:''}</div></div><div style="display:flex;gap:20px;margin-top:10px;font-size:11px;opacity:0.85;flex-wrap:wrap"><span>Date: ${incident.incident_date||'N/A'}</span><span>Company: ${incident.company_name||'N/A'}</span><span>Location: ${incident.location_name||'N/A'}</span></div></div>
<div class="section"><div class="section-title">Incident Summary</div><div class="section-body"><div class="two-col"><div><div class="row"><span class="label">ID:</span>${incident.incident_id||'N/A'}</div><div class="row"><span class="label">Date:</span>${incident.incident_date||'N/A'} ${incident.incident_time||''}</div><div class="row"><span class="label">Company:</span>${incident.company_name||'N/A'}</div></div><div><div class="row"><span class="label">Investigation:</span>${incident.investigation_type||'N/A'}</div><div class="row"><span class="label">Severity:</span>${incident.safety_severity||'N/A'}</div><div class="row"><span class="label">PSIF:</span>${incident.psif_classification||'N/A'}</div></div></div><div style="margin-top:12px"><div class="row"><span class="label">Description:</span></div><div>${incident.brief_description||incident.detailed_description||'None'}</div></div>${incident.witness_statement_summary?`<div style="margin-top:12px"><span class="label">Initial Witness Info:</span><div>${incident.witness_statement_summary}</div></div>`:''}</div></div>
${sorted.length?`<div class="section"><div class="section-title">Timeline (${sorted.length})</div><div class="section-body"><table><thead><tr><th>Date</th><th>Time</th><th>Description</th><th>Critical</th></tr></thead><tbody>${sorted.map(e=>`<tr class="${e.critical?'critical-row':''}"><td>${e.event_date||''}</td><td>${e.event_time||'-'}</td><td>${e.event_description||''}</td><td>${e.critical?'Yes':'No'}</td></tr>`).join('')}</tbody></table></div></div>`:''}
${evidence.length?`<div class="section"><div class="section-title">Evidence (${evidence.length})</div><div class="section-body"><table><thead><tr><th>Type</th><th>Description</th><th>Source</th></tr></thead><tbody>${evidence.map(e=>`<tr><td>${e.evidence_type||''}</td><td>${e.description||''}</td><td>${e.source||'initial_report'}</td></tr>`).join('')}</tbody></table></div></div>`:''}
${witnesses.length?`<div class="section"><div class="section-title">Witnesses (${witnesses.length})</div><div class="section-body">${witnesses.map(w=>`<div style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid #e5e7eb"><strong>${w.witness_name||''}</strong> <span style="color:#6b7280">${w.position_role||''} ${w.company?'- '+w.company:''}</span><div style="margin-top:4px">${w.statement_summary||''}</div></div>`).join('')}</div></div>`:''}
${(localReview||fiveWhy||rcaAnalysis)?`<div class="section"><div class="section-title">Analysis</div><div class="section-body"><div class="analysis-text">${localReview||fiveWhy||rcaAnalysis}</div></div></div>`:''}
${correctiveActions.length?`<div class="section"><div class="section-title">Corrective Actions (${correctiveActions.length})</div><div class="section-body"><table><thead><tr><th>#</th><th>Action</th><th>Control</th><th>Owner</th><th>Due</th><th>Status</th></tr></thead><tbody>${correctiveActions.map((c,i)=>{const h=c.hierarchy_control||'N/A';const hc=h.includes('Elimination')?'#166534':h.includes('Substitution')?'#15803d':h.includes('Engineering')?'#ca8a04':h.includes('Administrative')?'#ea580c':'#dc2626';return`<tr><td>${i+1}</td><td>${c.action_description||''}</td><td><span class="hierarchy-badge" style="background:${hc}">${h}</span></td><td>${c.action_owner_name||'-'}</td><td>${c.target_date||'-'}</td><td>${c.action_status||'Open'}</td></tr>`;}).join('')}</tbody></table></div></div>`:''}
${lessonsLearned.length?`<div class="section"><div class="section-title">Lessons (${lessonsLearned.length})</div><div class="section-body">${lessonsLearned.map(l=>`<div style="margin-bottom:12px"><strong>${l.lesson_title||''}</strong><div>${l.lesson_description||''}</div>${l.key_takeaway?`<div class="takeaway"><strong>Takeaway:</strong> ${l.key_takeaway}</div>`:''}</div>`).join('')}</div></div>`:''}
<div class="section"><div class="section-title">Checklist</div><div class="section-body"><div class="two-col"><div><div class="checklist-item"><span class="${timelineEvents.length?'check-yes':'check-no'}">${timelineEvents.length?'✓':''}</span> Timeline (${timelineEvents.length})</div><div class="checklist-item"><span class="${evidence.length?'check-yes':'check-no'}">${evidence.length?'✓':''}</span> Evidence (${evidence.length})</div><div class="checklist-item"><span class="${witnesses.length?'check-yes':'check-no'}">${witnesses.length?'✓':''}</span> Witnesses (${witnesses.length})</div></div><div><div class="checklist-item"><span class="${(localReview||fiveWhy||rcaAnalysis)?'check-yes':'check-no'}">${(localReview||fiveWhy||rcaAnalysis)?'✓':''}</span> Analysis</div><div class="checklist-item"><span class="${correctiveActions.length?'check-yes':'check-no'}">${correctiveActions.length?'✓':''}</span> Actions (${correctiveActions.length})</div><div class="checklist-item"><span class="${lessonsLearned.length?'check-yes':'check-no'}">${lessonsLearned.length?'✓':''}</span> Lessons (${lessonsLearned.length})</div></div></div></div></div>
<div class="footer"><strong>AnthroSafe™</strong> | © 2026 SLP Alaska, LLC | Generated: ${new Date().toLocaleString()} | CONFIDENTIAL</div></body></html>`;
    const w = window.open('', '_blank'); w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500);
  }

  const st = {
    container:{minHeight:'100vh',background:'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'},
    card:{background:'white',borderRadius:'16px',boxShadow:'0 20px 60px rgba(0,0,0,0.3)',maxWidth:'1400px',margin:'0 auto',overflow:'hidden'},
    header:{background:'linear-gradient(135deg, #1e40af 0%, #7c3aed 100%)',color:'white',padding:'30px',textAlign:'center'},
    tabBar:{display:'flex',borderBottom:'2px solid #e2e8f0',background:'#f8fafc',overflowX:'auto'},
    tab:{padding:'15px 25px',cursor:'pointer',fontWeight:'500',whiteSpace:'nowrap'},
    activeTab:{borderBottom:'3px solid #3b82f6',color:'#3b82f6',background:'white'},
    content:{padding:'30px'},
    input:{width:'100%',padding:'12px',border:'2px solid #e2e8f0',borderRadius:'8px',fontSize:'14px',boxSizing:'border-box'},
    primaryBtn:{background:'#3b82f6',color:'white',padding:'12px 24px',borderRadius:'8px',border:'none',cursor:'pointer',fontWeight:'500'},
    secondaryBtn:{background:'#8b5cf6',color:'white',padding:'10px 20px',borderRadius:'8px',border:'none',cursor:'pointer',fontWeight:'500'},
    outlineBtn:{background:'white',color:'#3b82f6',border:'2px solid #3b82f6',padding:'10px 20px',borderRadius:'8px',cursor:'pointer',fontWeight:'500'},
    dangerBtn:{background:'#dc2626',color:'white',padding:'8px 16px',borderRadius:'6px',border:'none',cursor:'pointer',fontSize:'13px'},
    editBtn:{background:'#f59e0b',color:'white',padding:'8px 16px',borderRadius:'6px',border:'none',cursor:'pointer',fontSize:'13px'},
    saveBtn:{background:'#22c55e',color:'white',padding:'8px 16px',borderRadius:'6px',border:'none',cursor:'pointer',fontSize:'13px'},
    footer:{background:'#1e293b',color:'white',padding:'20px',textAlign:'center'}
  };

  if (loading) return <div style={{...st.container,display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{color:'white',fontSize:'24px'}}>Loading...</div></div>;
  if (!authenticated) return (<div style={{...st.container,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}><div style={{...st.card,maxWidth:'500px',padding:'40px'}}><h2 style={{marginBottom:'20px',color:'#1e293b'}}>🔐 Investigation Workbench</h2><p style={{marginBottom:'30px',color:'#64748b'}}>Enter your SLP Alaska email</p><form onSubmit={handleLogin}><input type="email" placeholder="your.name@slpalaska.com" value={userEmail} onChange={(e)=>setUserEmail(e.target.value)} style={{...st.input,marginBottom:'20px'}} required /><button type="submit" style={{...st.primaryBtn,width:'100%'}}>Access Workbench</button></form></div></div>);
  if (!incident) return <div style={{...st.container,display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{color:'white',fontSize:'24px'}}>Incident not found</div></div>;

  const tabs = ['Overview','Timeline','Evidence','Witnesses','Analysis','Corrective Actions','Lessons Learned','Review & Approve'];
  const EditDeleteBtns = ({onEdit,onDelete}) => <div style={{display:'flex',gap:'8px'}}><button onClick={onEdit} style={st.editBtn}>✏️ Edit</button><button onClick={onDelete} style={st.dangerBtn}>🗑️</button></div>;
  const SaveCancelBtns = ({onSave,onCancel}) => <div style={{display:'flex',gap:'8px'}}><button onClick={onSave} style={st.saveBtn}>✓ Save</button><button onClick={onCancel} style={st.outlineBtn}>Cancel</button></div>;

  return (
    <div style={st.container}><div style={{padding:'40px 20px'}}><div style={st.card}>
      <div style={st.header}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'15px'}}>
          <div style={{display:'flex',gap:'10px',flexWrap:'wrap'}}>
            <a href="https://portal.slpalaska.com" style={{background:'rgba(255,255,255,0.2)',color:'white',padding:'8px 16px',borderRadius:'8px',textDecoration:'none',fontSize:'14px'}}>← Portal</a>
            <a href="/investigation-dashboard" style={{background:'rgba(255,255,255,0.2)',color:'white',padding:'8px 16px',borderRadius:'8px',textDecoration:'none',fontSize:'14px'}}>← Dashboard</a>
            <button onClick={generatePDF} style={{background:'rgba(255,255,255,0.2)',color:'white',padding:'8px 16px',borderRadius:'8px',border:'1px solid rgba(255,255,255,0.3)',fontSize:'14px',cursor:'pointer'}}>🖨️ Print PDF</button>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'15px',marginBottom:'10px'}}>
          <img src="/Logo.png" alt="SLP Alaska" style={{height:'50px'}} />
          <h1 style={{margin:0,fontSize:'32px'}}>🔍 Investigation Workbench</h1>
        </div>
        <p style={{margin:'10px 0 0 0',opacity:0.9}}>{incident.incident_id} | {incident.investigation_type}</p>
        {saving && <p style={{margin:'5px 0 0 0',fontSize:'13px',opacity:0.8}}>💾 Saving...</p>}
      </div>

      <div style={st.tabBar}>{tabs.map(tab=><div key={tab} onClick={()=>setActiveTab(tab)} style={{...st.tab,...(activeTab===tab?st.activeTab:{})}}>{tab}</div>)}</div>

      <div style={st.content}>
        {/* OVERVIEW */}
        {activeTab==='Overview' && <div>
          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:'20px',marginBottom:'30px'}}>
            <div><h3>Incident Summary</h3><div style={{background:'#f8fafc',padding:'20px',borderRadius:'12px'}}>
              <div style={{marginBottom:'15px'}}><strong>Date/Time:</strong> {incident.incident_date||'N/A'} {incident.incident_time||''}</div>
              <div style={{marginBottom:'15px'}}><strong>Location:</strong> {incident.location_name||'N/A'}</div>
              <div style={{marginBottom:'15px'}}><strong>Company:</strong> {incident.company_name||'N/A'}</div>
              <div style={{marginBottom:'15px'}}><strong>Description:</strong> {incident.brief_description||incident.detailed_description||'None'}</div>
              <div style={{marginBottom:'15px'}}><strong>Severity:</strong> {incident.safety_severity||'N/A'} | <strong>PSIF:</strong> {incident.psif_classification||'N/A'}</div>
              {incident.witness_statement_summary && <div style={{marginBottom:'15px',background:'#eff6ff',padding:'12px',borderRadius:'8px',borderLeft:'4px solid #3b82f6'}}><strong>Initial Witness Info:</strong><br/>{incident.witness_statement_summary}</div>}
              {incident.immediate_actions_taken && <div style={{background:'#f0fdf4',padding:'12px',borderRadius:'8px',borderLeft:'4px solid #22c55e'}}><strong>Immediate Actions:</strong><br/>{incident.immediate_actions_taken}</div>}
            </div></div>
            <div><h3>Progress</h3><div style={{background:'#f8fafc',padding:'20px',borderRadius:'12px'}}>
              <div style={{marginBottom:'15px'}}><strong>Status:</strong> {incident.status}</div>
              <div style={{marginBottom:'15px'}}><strong>Timeline:</strong> {timelineEvents.length}</div>
              <div style={{marginBottom:'15px'}}><strong>Evidence:</strong> {evidence.length}</div>
              <div style={{marginBottom:'15px'}}><strong>Witnesses:</strong> {witnesses.length}</div>
              <div style={{marginBottom:'15px'}}><strong>Actions:</strong> {correctiveActions.length}</div>
              <div><strong>Lessons:</strong> {lessonsLearned.length}</div>
            </div></div>
          </div>
        </div>}

        {/* TIMELINE */}
        {activeTab==='Timeline' && <div>
          <h3>Timeline</h3>
          <div style={{background:'#f8fafc',padding:'20px',borderRadius:'12px',marginBottom:'20px'}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 2fr auto',gap:'10px',marginBottom:'15px'}}>
              <input type="date" value={newTimelineEvent.event_date} onChange={e=>setNewTimelineEvent({...newTimelineEvent,event_date:e.target.value})} style={st.input} />
              <input type="time" value={newTimelineEvent.event_time} onChange={e=>setNewTimelineEvent({...newTimelineEvent,event_time:e.target.value})} style={st.input} />
              <input placeholder="Event description" value={newTimelineEvent.event_description} onChange={e=>setNewTimelineEvent({...newTimelineEvent,event_description:e.target.value})} style={st.input} />
              <label style={{display:'flex',alignItems:'center',gap:'5px',whiteSpace:'nowrap'}}><input type="checkbox" checked={newTimelineEvent.critical} onChange={e=>setNewTimelineEvent({...newTimelineEvent,critical:e.target.checked})} /> Critical</label>
            </div>
            <button onClick={addTimelineEvent} disabled={saving} style={st.primaryBtn}>+ Add Event</button>
          </div>
          <div style={{display:'grid',gap:'15px'}}>
            {[...timelineEvents].sort((a,b)=>new Date(a.event_date+' '+(a.event_time||'00:00'))-new Date(b.event_date+' '+(b.event_time||'00:00'))).map(ev=>(
              <div key={ev.id} style={{background:ev.critical?'#fef3c7':'white',border:ev.critical?'2px solid #f59e0b':'1px solid #e2e8f0',borderRadius:'8px',padding:'15px'}}>
                {editingTimeline===ev.id ? <div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 2fr',gap:'10px',marginBottom:'10px'}}>
                    <input type="date" value={ev.event_date} onChange={e=>setTimelineEvents(timelineEvents.map(x=>x.id===ev.id?{...x,event_date:e.target.value}:x))} style={st.input} />
                    <input type="time" value={ev.event_time||''} onChange={e=>setTimelineEvents(timelineEvents.map(x=>x.id===ev.id?{...x,event_time:e.target.value}:x))} style={st.input} />
                    <input value={ev.event_description} onChange={e=>setTimelineEvents(timelineEvents.map(x=>x.id===ev.id?{...x,event_description:e.target.value}:x))} style={st.input} />
                  </div>
                  <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
                    <label><input type="checkbox" checked={ev.critical} onChange={e=>setTimelineEvents(timelineEvents.map(x=>x.id===ev.id?{...x,critical:e.target.checked}:x))} /> Critical</label>
                    <SaveCancelBtns onSave={()=>saveTimelineEdit(ev)} onCancel={()=>{setEditingTimeline(null);loadAll();}} />
                  </div>
                </div> : <div>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:'10px'}}>
                    <strong>{ev.event_date} {ev.event_time&&`at ${ev.event_time}`}</strong>
                    <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
                      {ev.critical && <span style={{color:'#f59e0b',fontWeight:'500'}}>⚠️ Critical</span>}
                      <EditDeleteBtns onEdit={()=>setEditingTimeline(ev.id)} onDelete={()=>deleteTimelineEvent(ev)} />
                    </div>
                  </div>
                  <p style={{margin:0}}>{ev.event_description}</p>
                </div>}
              </div>
            ))}
          </div>
        </div>}

        {/* EVIDENCE */}
        {activeTab==='Evidence' && <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
            <h3>Evidence</h3>
            <button onClick={()=>setShowEvidenceUpload(!showEvidenceUpload)} style={{...st.primaryBtn,padding:'10px 20px'}}>{showEvidenceUpload?'Cancel':'+ Add Evidence'}</button>
          </div>
          {showEvidenceUpload && <div style={{background:'#f8fafc',padding:'20px',borderRadius:'12px',marginBottom:'20px'}}>
            <h4>Upload Evidence</h4>
            <div style={{display:'grid',gap:'15px'}}>
              <div><label style={{display:'block',marginBottom:'5px',fontWeight:'500'}}>Type</label><select value={newEvidence.type} onChange={e=>setNewEvidence({...newEvidence,type:e.target.value})} style={st.input}><option value="Photo">Photo</option><option value="Document">Document</option><option value="Video">Video</option><option value="Report">Report</option><option value="Other">Other</option></select></div>
              <div><label style={{display:'block',marginBottom:'5px',fontWeight:'500'}}>Description</label><textarea value={newEvidence.description} onChange={e=>setNewEvidence({...newEvidence,description:e.target.value})} placeholder="Describe..." style={{...st.input,minHeight:'80px',resize:'vertical'}} /></div>
              <div><label style={{display:'block',marginBottom:'5px',fontWeight:'500'}}>Files</label><input type="file" multiple accept="image/*,video/*,.pdf,.doc,.docx" onChange={e=>setNewEvidence({...newEvidence,files:Array.from(e.target.files)})} style={{...st.input,padding:'10px'}} />{newEvidence.files.length>0&&<div style={{marginTop:'10px',fontSize:'14px',color:'#64748b'}}>{newEvidence.files.length} file(s)</div>}</div>
              <div style={{display:'flex',gap:'10px'}}><button onClick={uploadEvidence} disabled={uploadingEvidence||!newEvidence.files.length} style={{...st.primaryBtn,opacity:uploadingEvidence||!newEvidence.files.length?0.5:1}}>{uploadingEvidence?'Uploading...':'Upload'}</button><button onClick={()=>{setShowEvidenceUpload(false);setNewEvidence({type:'Photo',description:'',files:[]});}} style={st.outlineBtn}>Cancel</button></div>
            </div>
          </div>}
          <div style={{display:'grid',gap:'15px'}}>
            {evidence.length===0?<div style={{textAlign:'center',padding:'40px',color:'#94a3b8'}}>No evidence yet.</div>:evidence.map(item=>(
              <div key={item.id} style={{background:'white',border:'1px solid #e2e8f0',borderRadius:'8px',padding:'15px',display:'flex',gap:'15px'}}>
                <div style={{width:'120px',height:'120px',borderRadius:'8px',overflow:'hidden',flexShrink:0,background:'#f1f5f9',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  {item.file_url&&(item.evidence_type==='Photo'||item.file_name?.match(/\.(jpg|jpeg|png|gif|webp)$/i))?<img src={item.file_url} alt={item.description} style={{width:'100%',height:'100%',objectFit:'cover'}} />:<div style={{fontSize:'48px',color:'#94a3b8'}}>{item.evidence_type==='Document'?'📄':item.evidence_type==='Video'?'🎥':'📎'}</div>}
                </div>
                <div style={{flex:1}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:'10px'}}>
                    <div><span style={{background:'#dbeafe',color:'#1e40af',padding:'4px 12px',borderRadius:'6px',fontSize:'12px',fontWeight:'500'}}>{item.evidence_type||'Photo'}</span>
                    {(item.source==='initial_report'||!item.source)&&<span style={{marginLeft:'8px',background:'#f3e8ff',color:'#7c3aed',padding:'4px 12px',borderRadius:'6px',fontSize:'12px'}}>Initial Report</span>}
                    {item.source==='workbench'&&<span style={{marginLeft:'8px',background:'#dcfce7',color:'#15803d',padding:'4px 12px',borderRadius:'6px',fontSize:'12px'}}>Workbench</span>}</div>
                    {item.file_url&&<a href={item.file_url} target="_blank" rel="noopener noreferrer" style={{color:'#3b82f6',textDecoration:'none',fontSize:'14px'}}>View →</a>}
                  </div>
                  <p style={{margin:'10px 0',color:'#334155'}}>{item.description||'No description'}</p>
                  <div style={{fontSize:'13px',color:'#94a3b8'}}>{item.uploaded_by_email&&`By ${item.uploaded_by_email}`}{item.created_at&&` • ${new Date(item.created_at).toLocaleString()}`}</div>
                </div>
              </div>
            ))}
          </div>
        </div>}

        {/* WITNESSES */}
        {activeTab==='Witnesses' && <div>
          <h3>Witness Statements</h3>
          {incident.witness_statement_summary && <div style={{background:'#eff6ff',border:'2px solid #bfdbfe',borderRadius:'12px',padding:'20px',marginBottom:'20px'}}><h4 style={{margin:'0 0 10px 0',color:'#1e40af'}}>📋 Initial Witness Info (from Incident Report)</h4><p style={{margin:0,color:'#334155'}}>{incident.witness_statement_summary}</p></div>}
          <div style={{background:'#f8fafc',padding:'20px',borderRadius:'12px',marginBottom:'20px'}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'10px',marginBottom:'15px'}}>
              <input placeholder="Name *" value={newWitness.witness_name} onChange={e=>setNewWitness({...newWitness,witness_name:e.target.value})} style={st.input} />
              <input placeholder="Position" value={newWitness.position_role} onChange={e=>setNewWitness({...newWitness,position_role:e.target.value})} style={st.input} />
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

        {/* ANALYSIS */}
        {activeTab==='Analysis' && <div>
          <h3>Analysis</h3>
          <div style={{background:'#f0f9ff',padding:'16px',borderRadius:'12px',marginBottom:'20px',border:'1px solid #bae6fd',display:'flex',alignItems:'center',gap:'15px',flexWrap:'wrap'}}>
            <span style={{fontWeight:'600',color:'#0369a1'}}>Analysis Method:</span>
            <select value={incident.investigation_type||'Local Review'} onChange={async(e)=>{const newType=e.target.value;try{const{error}=await supabase.from('incidents').update({investigation_type:newType,updated_at:new Date().toISOString()}).eq('id',id);if(error)throw error;setIncident({...incident,investigation_type:newType});}catch(err){alert(err.message);}}} style={{padding:'8px 12px',borderRadius:'8px',border:'1px solid #0284c7',fontSize:'14px',fontWeight:'500',background:'white',cursor:'pointer',minWidth:'200px'}}>
              <option value="Local Review">Local Review</option>
              <option value="5-Why Analysis">5-Why Analysis</option>
              <option value="Full RCA">Comprehensive RCA</option>
            </select>
            <span style={{fontSize:'12px',color:'#64748b',fontStyle:'italic'}}>System recommended: {incident.investigation_type||'N/A'} — override anytime</span>
          </div>
          {incident.investigation_type==='Local Review' && <div style={{background:'#f8fafc',padding:'20px',borderRadius:'12px'}}><h4>Local Review</h4><textarea placeholder="What happened? Immediate causes? What to do differently?" value={localReview} onChange={e=>setLocalReview(e.target.value)} style={{...st.input,minHeight:'200px',resize:'vertical',marginBottom:'15px'}} /><button onClick={()=>saveAnalysis('Local Review',localReview)} disabled={saving} style={st.primaryBtn}>{saving?'Saving...':'💾 Save'}</button></div>}
          {incident.investigation_type==='5-Why Analysis' && <div style={{background:'#f8fafc',padding:'20px',borderRadius:'12px'}}><h4>5-Why Analysis</h4><textarea placeholder="Why did this happen? Drill down 5 times" value={fiveWhy} onChange={e=>setFiveWhy(e.target.value)} style={{...st.input,minHeight:'300px',resize:'vertical',marginBottom:'15px'}} /><button onClick={()=>saveAnalysis('5-Why Analysis',fiveWhy)} disabled={saving} style={st.primaryBtn}>{saving?'Saving...':'💾 Save'}</button></div>}
          {(incident.investigation_type==='Full RCA'||incident.investigation_type==='Root Cause Analysis') && <div style={{background:'#f8fafc',padding:'20px',borderRadius:'12px'}}><h4>Root Cause Analysis</h4><p style={{marginBottom:'15px',color:'#64748b'}}>Analyze: Equipment, Environment, Materials, Methods, People, Management, Communication, Training, Procedures, Culture</p><textarea placeholder="RCA findings..." value={rcaAnalysis} onChange={e=>setRcaAnalysis(e.target.value)} style={{...st.input,minHeight:'400px',resize:'vertical',marginBottom:'15px'}} /><button onClick={()=>saveAnalysis('Full RCA',rcaAnalysis)} disabled={saving} style={st.primaryBtn}>{saving?'Saving...':'💾 Save'}</button></div>}
        </div>}

        {/* CORRECTIVE ACTIONS */}
        {activeTab==='Corrective Actions' && <div>
          <h3>Corrective Actions</h3>
          <div style={{background:'#f8fafc',padding:'20px',borderRadius:'12px',marginBottom:'20px'}}>
            <textarea placeholder="Action description *" value={newCA.action_description} onChange={e=>setNewCA({...newCA,action_description:e.target.value})} style={{...st.input,minHeight:'80px',resize:'vertical',marginBottom:'15px'}} />
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:'10px',marginBottom:'15px'}}>
              <select value={newCA.hierarchy_control} onChange={e=>setNewCA({...newCA,hierarchy_control:e.target.value})} style={st.input}><option value="1-Elimination">1. Elimination</option><option value="2-Substitution">2. Substitution</option><option value="3-Engineering Controls">3. Engineering Controls</option><option value="4-Administrative Controls">4. Administrative Controls</option><option value="5-PPE">5. PPE</option></select>
              <input placeholder="Owner *" value={newCA.action_owner_name} onChange={e=>setNewCA({...newCA,action_owner_name:e.target.value})} style={st.input} />
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
              {[{l:'Timeline',d:timelineEvents.length>0,c:timelineEvents.length},{l:'Evidence',d:evidence.length>0,c:evidence.length},{l:'Witnesses',d:witnesses.length>0,c:witnesses.length},{l:'Analysis',d:!!(localReview||fiveWhy||rcaAnalysis),c:null},{l:'Actions',d:correctiveActions.length>0,c:correctiveActions.length},{l:'Lessons',d:lessonsLearned.length>0,c:lessonsLearned.length}].map((item,i)=>(
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

    <div style={st.footer}><span style={{fontWeight:'500'}}>AnthroSafe™ Field Driven Safety</span> | © 2026 SLP Alaska, LLC</div>
    </div></div>
  );
}

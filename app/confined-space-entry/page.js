'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://iypezirwdlqpptjpeeyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
);

const COMPANIES = ['A-C Electric','AKE-Line','Apache Corp.','Armstrong Oil & Gas','ASRC Energy Services','CCI-Industrial','Chosen Construction','CINGSA','Coho Enterprises','Conam Construction','ConocoPhillips','Five Star Oilfield Services','Fox Energy Services','G.A. West','GBR Equipment','GLM Energy Services','Graham Industrial Coatings','Harvest Midstream','Hilcorp Alaska','MagTec Alaska','Merkes Builders','Nordic-Calista','Parker TRS','Peninsula Paving','Pollard Wireline','Ridgeline Oilfield Services','Santos','Summit Excavation','Tesoro Refinery','Yellowjacket','Other'];
const LOCATIONS = ['Kenai','CIO','Beaver Creek','Swanson River','Ninilchik','Nikiski','Other Kenai Asset','Deadhorse','Prudhoe Bay','Kuparuk','Alpine','Willow','ENI','PIKKA','Point Thompson','North Star Island','Endicott','Badami','Other North Slope'];
const ENTRY_TYPES = ['Full Permit Entry','Alternate Entry Procedures'];
const RESPIRATORY_TYPES = ['N/A - Not Required','APR - Air Purifying Respirator','SAR - Supplied Air Respirator','SCBA - Self Contained Breathing Apparatus','Escape Only'];
const RESCUE_TEAM_TYPES = ['On-Site Rescue Team','Off-Site Rescue Service','Self-Rescue Only (Alternate Entry)','Combination On-Site/Off-Site'];
const COMMUNICATION_METHODS = ['Voice/Visual','Two-Way Radio','Hardwired Communication','Hand Signals','Combination'];
const PHYSICAL_HAZARDS = [{id:'engulfment',label:'Engulfment'},{id:'entrapment',label:'Entrapment'},{id:'mechanical',label:'Mechanical'},{id:'electrical',label:'Electrical'},{id:'thermal',label:'Thermal'},{id:'noise',label:'Noise'},{id:'fall',label:'Fall'},{id:'slipTrip',label:'Slip/Trip'},{id:'chemical',label:'Chemical'},{id:'biological',label:'Biological'},{id:'radiation',label:'Radiation'},{id:'other',label:'Other'}];

function generatePermitNumber(){const now=new Date();const d=now.getFullYear()+String(now.getMonth()+1).padStart(2,'0')+String(now.getDate()).padStart(2,'0');return 'CSE-'+d+'-'+String(Math.floor(Math.random()*10000)).padStart(4,'0');}

function calculateIndicators(data){
  let good=0,bad=0;const notes=[];
  if(data.preEntryBriefing==='Yes'){good++;notes.push('Pre-Entry Briefing');}
  if(data.hazardsCommunicated==='Yes')good++;
  if(data.emergencyProceduresReviewed==='Yes')good++;
  if(data.equipmentInspected==='Yes')good++;
  if(data.attendantTrained==='Yes'){good++;notes.push('Trained Attendant');}
  if(data.continuousAirMonitoring==='Yes'){good++;notes.push('Continuous Monitoring');}
  if(data.rescueTeamIdentified==='Yes')good++;
  if(data.rescueEquipmentAvailable==='Yes')good++;
  if(data.lotoRequired==='Yes'&&data.lotoVerified==='Yes'){good++;notes.push('LOTO Verified');}
  if(data.retrievalSystem==='Yes')good++;
  if(data.permitsPosted==='Yes')good++;
  if(data.oxygenAcceptable==='No'){bad+=2;notes.push('CRITICAL: O2 out of range');}
  if(data.lelAcceptable==='No'){bad+=2;notes.push('CRITICAL: LEL exceeded');}
  if(data.h2sAcceptable==='No'){bad+=2;notes.push('CRITICAL: H2S exceeded');}
  if(data.coAcceptable==='No'){bad+=2;notes.push('CRITICAL: CO exceeded');}
  if(data.attendantTrained!=='Yes'){bad++;notes.push('Attendant not trained');}
  if(data.preEntryBriefing!=='Yes'){bad++;notes.push('No Pre-Entry Briefing');}
  if(data.rescueTeamIdentified!=='Yes'){bad++;notes.push('No Rescue Team');}
  if(data.lotoRequired==='Yes'&&data.lotoVerified!=='Yes'){bad++;notes.push('LOTO not verified');}
  return {good,bad,notes};
}

export default function ConfinedSpaceEntry(){
  const [activeTab,setActiveTab]=useState('new');
  const [isSubmitting,setIsSubmitting]=useState(false);
  const [submitted,setSubmitted]=useState(false);
  const [submittedPermit,setSubmittedPermit]=useState(null);
  const [openPermits,setOpenPermits]=useState([]);
  const [selectedPermit,setSelectedPermit]=useState(null);
  const [closeoutSuccess,setCloseoutSuccess]=useState(false);
  
  const [formData,setFormData]=useState({
    permitInitiator:'',date:new Date().toISOString().split('T')[0],entryType:'',company:'',location:'',phoneRadio:'',spaceId:'',spaceDescription:'',entrySupervisor:'',purposeOfEntry:'',
    oxygenInitial:'',oxygenAcceptable:'',lelInitial:'',lelAcceptable:'',h2sInitial:'',h2sAcceptable:'',coInitial:'',coAcceptable:'',otherToxic:'',otherToxicLevel:'',atmosphericHazard:'',
    physicalHazards:{},otherHazardDescription:'',
    alternateEntryEligible:'',onlyAtmosphericHazard:'',ventilationControlsHazard:'',monitoringDataSupports:'',
    continuousAirMonitoring:'',forcedAirVentilation:'',naturalVentilation:'',respiratoryProtection:'',respiratoryType:'',
    lotoRequired:'',lotoVerified:'',lineBreakingBlanking:'',
    retrievalSystem:'',tripodDavit:'',fullBodyHarness:'',lifelineAttached:'',fallProtection:'',
    hearingProtection:'',eyeFaceProtection:'',headProtection:'',handProtection:'',footProtection:'',protectiveClothing:'',
    communicationMethod:'',lightingProvided:'',gfciProtectedTools:'',hotWorkPermitRequired:'',barriersBarricades:'',
    rescueTeamIdentified:'',rescueTeamType:'',rescueEquipmentAvailable:'',rescueResponseTime:'',hospitalMedicalFacility:'',emergencyContactNumber:'',
    attendantName:'',attendantTrained:'',
    entrant1Name:'',entrant1TimeIn:'',entrant1TimeOut:'',entrant2Name:'',entrant2TimeIn:'',entrant2TimeOut:'',entrant3Name:'',entrant3TimeIn:'',entrant3TimeOut:'',
    preEntryBriefing:'',hazardsCommunicated:'',emergencyProceduresReviewed:'',equipmentInspected:'',permitsPosted:'',
    entrySupervisorSignature:'',attendantSignature:'',startTime:'',expirationTime:''
  });
  
  const [closeoutData,setCloseoutData]=useState({allEntrantsExited:false,spaceSecured:false,equipmentRetrieved:false,ventilationSecured:false,timePermitClosed:'',closeOutEntrySupervisor:'',closeOutAttendant:''});

  useEffect(()=>{if(activeTab==='closeout')loadOpenPermits();},[activeTab]);

  const loadOpenPermits=async()=>{try{const{data}=await supabase.from('cse_permits').select('*').eq('permit_status','Open').order('created_at',{ascending:false});setOpenPermits(data||[]);}catch(e){console.error(e);}};

  const handleChange=(e)=>{const{name,value}=e.target;setFormData(p=>({...p,[name]:value}));};
  const handleHazardToggle=(id)=>{setFormData(p=>({...p,physicalHazards:{...p.physicalHazards,[id]:!p.physicalHazards[id]}}));};
  const handleVerificationToggle=(field)=>{setFormData(p=>({...p,[field]:p[field]==='Yes'?'':'Yes'}));};

  const handleSubmit=async(e)=>{e.preventDefault();setIsSubmitting(true);
    try{
      const permitNumber=generatePermitNumber();
      const indicators=calculateIndicators(formData);
      const entrants=[
        formData.entrant1Name?{name:formData.entrant1Name,timeIn:formData.entrant1TimeIn,timeOut:formData.entrant1TimeOut}:null,
        formData.entrant2Name?{name:formData.entrant2Name,timeIn:formData.entrant2TimeIn,timeOut:formData.entrant2TimeOut}:null,
        formData.entrant3Name?{name:formData.entrant3Name,timeIn:formData.entrant3TimeIn,timeOut:formData.entrant3TimeOut}:null
      ].filter(Boolean);
      
      const{error}=await supabase.from('cse_permits').insert([{
        permit_number:permitNumber,permit_status:'Open',permit_initiator:formData.permitInitiator,date:formData.date,company:formData.company,location:formData.location,phone_radio:formData.phoneRadio,space_id:formData.spaceId,space_description:formData.spaceDescription,entry_type:formData.entryType,entry_supervisor:formData.entrySupervisor,purpose_of_entry:formData.purposeOfEntry,
        oxygen_initial:formData.oxygenInitial,oxygen_acceptable:formData.oxygenAcceptable,lel_initial:formData.lelInitial,lel_acceptable:formData.lelAcceptable,h2s_initial:formData.h2sInitial,h2s_acceptable:formData.h2sAcceptable,co_initial:formData.coInitial,co_acceptable:formData.coAcceptable,other_toxic:formData.otherToxic,other_toxic_level:formData.otherToxicLevel,atmospheric_hazard:formData.atmosphericHazard,
        physical_hazards:formData.physicalHazards,other_hazard_description:formData.otherHazardDescription,
        alternate_entry_eligible:formData.alternateEntryEligible,only_atmospheric_hazard:formData.onlyAtmosphericHazard,ventilation_controls_hazard:formData.ventilationControlsHazard,monitoring_data_supports:formData.monitoringDataSupports,
        continuous_air_monitoring:formData.continuousAirMonitoring,forced_air_ventilation:formData.forcedAirVentilation,natural_ventilation:formData.naturalVentilation,respiratory_protection:formData.respiratoryProtection,respiratory_type:formData.respiratoryType,
        loto_required:formData.lotoRequired,loto_verified:formData.lotoVerified,line_breaking_blanking:formData.lineBreakingBlanking,
        retrieval_system:formData.retrievalSystem,tripod_davit:formData.tripodDavit,full_body_harness:formData.fullBodyHarness,lifeline_attached:formData.lifelineAttached,fall_protection:formData.fallProtection,
        hearing_protection:formData.hearingProtection,eye_face_protection:formData.eyeFaceProtection,head_protection:formData.headProtection,hand_protection:formData.handProtection,foot_protection:formData.footProtection,protective_clothing:formData.protectiveClothing,
        communication_method:formData.communicationMethod,lighting_provided:formData.lightingProvided,gfci_protected_tools:formData.gfciProtectedTools,hot_work_permit_required:formData.hotWorkPermitRequired,barriers_barricades:formData.barriersBarricades,
        rescue_team_identified:formData.rescueTeamIdentified,rescue_team_type:formData.rescueTeamType,rescue_equipment_available:formData.rescueEquipmentAvailable,rescue_response_time:formData.rescueResponseTime,hospital_medical_facility:formData.hospitalMedicalFacility,emergency_contact_number:formData.emergencyContactNumber,
        attendant_name:formData.attendantName,attendant_trained:formData.attendantTrained,entrants:entrants,
        pre_entry_briefing:formData.preEntryBriefing,hazards_communicated:formData.hazardsCommunicated,emergency_procedures_reviewed:formData.emergencyProceduresReviewed,equipment_inspected:formData.equipmentInspected,permits_posted:formData.permitsPosted,
        entry_supervisor_signature:formData.entrySupervisorSignature,attendant_signature:formData.attendantSignature,start_time:formData.startTime||null,expiration_time:formData.expirationTime||null,
        good_indicators:indicators.good,bad_indicators:indicators.bad,indicator_notes:indicators.notes.join('; ')
      }]);
      if(error)throw error;
      setSubmittedPermit(permitNumber);setSubmitted(true);
    }catch(e){console.error(e);alert('Error: '+e.message);}finally{setIsSubmitting(false);}
  };

  const submitCloseout=async()=>{if(!selectedPermit){alert('Select a permit');return;}if(!closeoutData.closeOutEntrySupervisor||!closeoutData.closeOutAttendant){alert('Fill required fields');return;}
    setIsSubmitting(true);try{
      const{error}=await supabase.from('cse_permits').update({permit_status:'Closed',all_entrants_exited:closeoutData.allEntrantsExited?'Yes':'No',space_secured:closeoutData.spaceSecured?'Yes':'No',equipment_retrieved:closeoutData.equipmentRetrieved?'Yes':'No',ventilation_secured:closeoutData.ventilationSecured?'Yes':'No',time_permit_closed:closeoutData.timePermitClosed||null,close_out_entry_supervisor:closeoutData.closeOutEntrySupervisor,close_out_attendant:closeoutData.closeOutAttendant,closed_at:new Date().toISOString()}).eq('permit_number',selectedPermit);
      if(error)throw error;setCloseoutSuccess(true);
    }catch(e){console.error(e);alert('Error: '+e.message);}finally{setIsSubmitting(false);}
  };

  const resetForm=()=>{setFormData({permitInitiator:'',date:new Date().toISOString().split('T')[0],entryType:'',company:'',location:'',phoneRadio:'',spaceId:'',spaceDescription:'',entrySupervisor:'',purposeOfEntry:'',oxygenInitial:'',oxygenAcceptable:'',lelInitial:'',lelAcceptable:'',h2sInitial:'',h2sAcceptable:'',coInitial:'',coAcceptable:'',otherToxic:'',otherToxicLevel:'',atmosphericHazard:'',physicalHazards:{},otherHazardDescription:'',alternateEntryEligible:'',onlyAtmosphericHazard:'',ventilationControlsHazard:'',monitoringDataSupports:'',continuousAirMonitoring:'',forcedAirVentilation:'',naturalVentilation:'',respiratoryProtection:'',respiratoryType:'',lotoRequired:'',lotoVerified:'',lineBreakingBlanking:'',retrievalSystem:'',tripodDavit:'',fullBodyHarness:'',lifelineAttached:'',fallProtection:'',hearingProtection:'',eyeFaceProtection:'',headProtection:'',handProtection:'',footProtection:'',protectiveClothing:'',communicationMethod:'',lightingProvided:'',gfciProtectedTools:'',hotWorkPermitRequired:'',barriersBarricades:'',rescueTeamIdentified:'',rescueTeamType:'',rescueEquipmentAvailable:'',rescueResponseTime:'',hospitalMedicalFacility:'',emergencyContactNumber:'',attendantName:'',attendantTrained:'',entrant1Name:'',entrant1TimeIn:'',entrant1TimeOut:'',entrant2Name:'',entrant2TimeIn:'',entrant2TimeOut:'',entrant3Name:'',entrant3TimeIn:'',entrant3TimeOut:'',preEntryBriefing:'',hazardsCommunicated:'',emergencyProceduresReviewed:'',equipmentInspected:'',permitsPosted:'',entrySupervisorSignature:'',attendantSignature:'',startTime:'',expirationTime:''});setSubmitted(false);setSubmittedPermit(null);};
  const resetCloseout=()=>{setCloseoutData({allEntrantsExited:false,spaceSecured:false,equipmentRetrieved:false,ventilationSecured:false,timePermitClosed:'',closeOutEntrySupervisor:'',closeOutAttendant:''});setSelectedPermit(null);setCloseoutSuccess(false);loadOpenPermits();};

  const s={container:{minHeight:'100vh',background:'linear-gradient(135deg, #1e3a8a 0%, #b91c1c 100%)',padding:'20px'},formContainer:{maxWidth:'1000px',margin:'0 auto',background:'white',borderRadius:'12px',boxShadow:'0 4px 6px rgba(0,0,0,0.1)',overflow:'hidden'},header:{background:'linear-gradient(135deg, #1e3a8a 0%, #b91c1c 100%)',color:'white',padding:'25px',textAlign:'center'},content:{padding:'25px'},tabs:{display:'flex',background:'#f1f5f9',padding:'8px',gap:'8px'},tab:{flex:1,padding:'12px',border:'none',borderRadius:'8px',fontWeight:'600',cursor:'pointer',fontSize:'14px',transition:'all 0.2s'},tabActive:{background:'#1e3a8a',color:'white'},tabInactive:{background:'white',color:'#475569'},section:{marginBottom:'15px',border:'1px solid #e5e7eb',borderRadius:'10px',overflow:'hidden'},sectionHeader:{color:'white',padding:'10px 15px',fontWeight:'600',fontSize:'14px'},sectionBlue:{background:'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)'},sectionRed:{background:'linear-gradient(135deg, #b91c1c 0%, #991b1b 100%)'},sectionOrange:{background:'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'},sectionGreen:{background:'linear-gradient(135deg, #059669 0%, #047857 100%)'},sectionPurple:{background:'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)'},sectionCyan:{background:'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)'},sectionAmber:{background:'linear-gradient(135deg, #d97706 0%, #b45309 100%)'},sectionSlate:{background:'linear-gradient(135deg, #475569 0%, #334155 100%)'},sectionBody:{padding:'12px',background:'#f8fafc'},formRow:{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))',gap:'12px',marginBottom:'12px'},formGroup:{display:'flex',flexDirection:'column'},label:{fontWeight:'600',color:'#374151',marginBottom:'4px',fontSize:'13px'},required:{color:'#b91c1c'},input:{padding:'8px 10px',border:'2px solid #d1d5db',borderRadius:'6px',fontSize:'14px'},select:{padding:'8px 10px',border:'2px solid #d1d5db',borderRadius:'6px',fontSize:'14px',background:'white'},textarea:{padding:'8px 10px',border:'2px solid #d1d5db',borderRadius:'6px',fontSize:'14px',minHeight:'60px',resize:'vertical'},infoBox:{background:'#eff6ff',borderLeft:'4px solid #1e3a8a',padding:'10px',marginBottom:'12px',fontSize:'13px',borderRadius:'0 6px 6px 0'},warningBox:{background:'#fef3c7',borderLeft:'4px solid #d97706',padding:'10px',marginBottom:'12px',fontSize:'13px',borderRadius:'0 6px 6px 0'},atmoGrid:{display:'grid',gridTemplateColumns:'2fr 1fr 1fr',gap:'8px',alignItems:'center',background:'white',padding:'8px',borderRadius:'6px',marginBottom:'8px'},atmoLabel:{fontWeight:'600',fontSize:'13px'},atmoRange:{fontSize:'11px',color:'#6b7280'},hazardGrid:{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(150px, 1fr))',gap:'8px'},hazardItem:{display:'flex',alignItems:'center',background:'white',padding:'8px 10px',borderRadius:'6px',border:'1px solid #e5e7eb',cursor:'pointer',transition:'all 0.2s',fontSize:'13px'},hazardItemChecked:{background:'#fef2f2',borderColor:'#b91c1c'},mitigationItem:{display:'flex',justifyContent:'space-between',alignItems:'center',background:'white',padding:'8px 12px',borderRadius:'6px',border:'1px solid #e5e7eb',marginBottom:'6px'},mitigationLabel:{fontSize:'13px'},mitigationSelect:{width:'100px',padding:'5px 8px',fontSize:'13px'},entrantRow:{display:'grid',gridTemplateColumns:'2fr 1fr 1fr',gap:'10px',background:'white',padding:'10px',borderRadius:'6px',marginBottom:'8px'},verificationItem:{display:'flex',alignItems:'center',background:'white',padding:'10px',borderRadius:'6px',marginBottom:'6px',cursor:'pointer',border:'1px solid #e5e7eb'},verificationItemChecked:{background:'#dcfce7',borderLeft:'3px solid #059669'},submitBtn:{width:'100%',padding:'14px',background:'linear-gradient(135deg, #1e3a8a 0%, #b91c1c 100%)',color:'white',border:'none',borderRadius:'10px',fontSize:'16px',fontWeight:'600',cursor:'pointer',marginTop:'15px'},submitBtnGreen:{background:'linear-gradient(135deg, #059669 0%, #047857 100%)'},successMessage:{background:'linear-gradient(135deg, #059669 0%, #047857 100%)',color:'white',padding:'30px',borderRadius:'12px',textAlign:'center',margin:'20px 0'},permitCard:{background:'white',border:'2px solid #e5e7eb',borderRadius:'8px',padding:'12px',marginBottom:'10px',cursor:'pointer',transition:'all 0.2s'},permitCardSelected:{borderColor:'#059669',background:'#f0fdf4'}};

  if(submitted&&submittedPermit){return(<div style={s.container}><div style={{maxWidth:'600px',margin:'0 auto',paddingTop:'50px'}}><div style={s.successMessage}><div style={{fontSize:'48px',marginBottom:'15px'}}>✅</div><h2 style={{margin:'0 0 10px'}}>Permit Issued Successfully!</h2><div style={{background:'rgba(255,255,255,0.2)',padding:'12px',borderRadius:'8px',fontSize:'20px',fontWeight:'bold',margin:'15px 0'}}>{submittedPermit}</div><p>The permit is now OPEN. Remember to close out when work is complete.</p><div style={{display:'flex',gap:'10px',justifyContent:'center',marginTop:'20px',flexWrap:'wrap'}}><button onClick={resetForm} style={{...s.submitBtn,maxWidth:'200px',background:'white',color:'#059669'}}>Issue Another</button><a href="/" style={{...s.submitBtn,maxWidth:'200px',background:'#6b7280',textDecoration:'none',textAlign:'center'}}>Back to Portal</a></div></div></div></div>);}

  return(<div style={s.container}><div style={s.formContainer}>
    <div style={s.header}><a href="/" style={{color:'white',textDecoration:'none',fontSize:'14px'}}>← Back to Portal</a><div style={{background:'rgba(255,255,255,0.95)',borderRadius:'12px',padding:'15px',width:'fit-content',margin:'15px auto',boxShadow:'0 4px 15px rgba(0,0,0,0.2)'}}><img src="/Logo.png" alt="SLP Alaska" style={{maxWidth:'180px',height:'auto'}}/></div><div style={{display:'inline-block',background:'white',color:'#991b1b',padding:'5px 14px',borderRadius:'20px',fontWeight:'700',fontSize:'12px',marginBottom:'12px',border:'3px solid white'}}>🚧 OSHA 29 CFR 1910.146</div><h1 style={{margin:'0 0 5px',fontSize:'20px'}}>Confined Space Entry Permit</h1><p style={{opacity:0.9,fontSize:'13px'}}>SLP Alaska Safety Management System</p></div>
    
    <div style={s.tabs}><button style={{...s.tab,...(activeTab==='new'?s.tabActive:s.tabInactive)}} onClick={()=>setActiveTab('new')}>📝 New Permit</button><button style={{...s.tab,...(activeTab==='closeout'?s.tabActive:s.tabInactive)}} onClick={()=>setActiveTab('closeout')}>✅ Close Out Permit</button></div>
    
    <div style={s.content}>
      {activeTab==='new'&&(<form onSubmit={handleSubmit}>
        {/* PERMIT INFO */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionBlue}}>📋 Permit Information</div><div style={s.sectionBody}>
          <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Permit Initiator <span style={s.required}>*</span></label><input type="text" name="permitInitiator" value={formData.permitInitiator} onChange={handleChange} required style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Date <span style={s.required}>*</span></label><input type="date" name="date" value={formData.date} onChange={handleChange} required style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Entry Type <span style={s.required}>*</span></label><select name="entryType" value={formData.entryType} onChange={handleChange} required style={s.select}><option value="">Select...</option>{ENTRY_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></div></div>
          <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Client/Company <span style={s.required}>*</span></label><select name="company" value={formData.company} onChange={handleChange} required style={s.select}><option value="">Select...</option>{COMPANIES.map(c=><option key={c} value={c}>{c}</option>)}</select></div><div style={s.formGroup}><label style={s.label}>Location <span style={s.required}>*</span></label><select name="location" value={formData.location} onChange={handleChange} required style={s.select}><option value="">Select...</option>{LOCATIONS.map(l=><option key={l} value={l}>{l}</option>)}</select></div><div style={s.formGroup}><label style={s.label}>Phone/Radio</label><input type="text" name="phoneRadio" value={formData.phoneRadio} onChange={handleChange} style={s.input}/></div></div>
          <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Space ID/Name <span style={s.required}>*</span></label><input type="text" name="spaceId" value={formData.spaceId} onChange={handleChange} required placeholder="e.g., Tank-101" style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Entry Supervisor <span style={s.required}>*</span></label><input type="text" name="entrySupervisor" value={formData.entrySupervisor} onChange={handleChange} required style={s.input}/></div></div>
          <div style={s.formGroup}><label style={s.label}>Space Description</label><textarea name="spaceDescription" value={formData.spaceDescription} onChange={handleChange} placeholder="Describe the confined space..." style={s.textarea}/></div>
          <div style={s.formGroup}><label style={s.label}>Purpose of Entry <span style={s.required}>*</span></label><textarea name="purposeOfEntry" value={formData.purposeOfEntry} onChange={handleChange} required placeholder="Describe the work..." style={s.textarea}/></div>
        </div></div>
        
        {/* ATMOSPHERIC */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionRed}}>🌡️ Atmospheric Monitoring</div><div style={s.sectionBody}>
          <div style={s.infoBox}>Acceptable ranges: O₂: 19.5-23.5% | LEL: &lt;10% | H₂S: &lt;10 ppm | CO: &lt;25 ppm</div>
          <div style={s.atmoGrid}><div><span style={s.atmoLabel}>Oxygen (O₂)</span><br/><span style={s.atmoRange}>19.5% - 23.5%</span></div><input type="text" name="oxygenInitial" value={formData.oxygenInitial} onChange={handleChange} placeholder="Initial %" style={s.input}/><select name="oxygenAcceptable" value={formData.oxygenAcceptable} onChange={handleChange} style={s.select}><option value="">Acceptable?</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
          <div style={s.atmoGrid}><div><span style={s.atmoLabel}>LEL (Combustible)</span><br/><span style={s.atmoRange}>&lt;10% LEL</span></div><input type="text" name="lelInitial" value={formData.lelInitial} onChange={handleChange} placeholder="Initial %" style={s.input}/><select name="lelAcceptable" value={formData.lelAcceptable} onChange={handleChange} style={s.select}><option value="">Acceptable?</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
          <div style={s.atmoGrid}><div><span style={s.atmoLabel}>Hydrogen Sulfide (H₂S)</span><br/><span style={s.atmoRange}>&lt;10 ppm</span></div><input type="text" name="h2sInitial" value={formData.h2sInitial} onChange={handleChange} placeholder="Initial ppm" style={s.input}/><select name="h2sAcceptable" value={formData.h2sAcceptable} onChange={handleChange} style={s.select}><option value="">Acceptable?</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
          <div style={s.atmoGrid}><div><span style={s.atmoLabel}>Carbon Monoxide (CO)</span><br/><span style={s.atmoRange}>&lt;25 ppm</span></div><input type="text" name="coInitial" value={formData.coInitial} onChange={handleChange} placeholder="Initial ppm" style={s.input}/><select name="coAcceptable" value={formData.coAcceptable} onChange={handleChange} style={s.select}><option value="">Acceptable?</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
          <div style={s.atmoGrid}><div><span style={s.atmoLabel}>Other Toxic (specify)</span></div><input type="text" name="otherToxic" value={formData.otherToxic} onChange={handleChange} placeholder="Name" style={s.input}/><input type="text" name="otherToxicLevel" value={formData.otherToxicLevel} onChange={handleChange} placeholder="Level" style={s.input}/></div>
          <div style={{...s.formRow,marginTop:'10px'}}><div style={s.formGroup}><label style={s.label}>Atmospheric Hazard Present?</label><select name="atmosphericHazard" value={formData.atmosphericHazard} onChange={handleChange} style={s.select}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option></select></div></div>
        </div></div>
        
        {/* PHYSICAL HAZARDS */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionOrange}}>⚠️ Physical Hazards</div><div style={s.sectionBody}>
          <p style={{fontSize:'13px',marginBottom:'10px',color:'#6b7280'}}>Check all hazards present:</p>
          <div style={s.hazardGrid}>{PHYSICAL_HAZARDS.map(h=><div key={h.id} style={{...s.hazardItem,...(formData.physicalHazards[h.id]?s.hazardItemChecked:{})}} onClick={()=>handleHazardToggle(h.id)}><input type="checkbox" checked={formData.physicalHazards[h.id]||false} readOnly style={{marginRight:'8px',accentColor:'#b91c1c'}}/><span>{h.label}</span></div>)}</div>
          <div style={{...s.formGroup,marginTop:'10px'}}><label style={s.label}>Other Hazard Description</label><input type="text" name="otherHazardDescription" value={formData.otherHazardDescription} onChange={handleChange} style={s.input}/></div>
        </div></div>
        
        {/* ALTERNATE ENTRY */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionAmber}}>📋 Alternate Entry Eligibility</div><div style={s.sectionBody}>
          <div style={s.warningBox}>Alternate Entry may only be used when the ONLY hazard is atmospheric AND can be controlled by continuous ventilation.</div>
          <div style={s.mitigationItem}><span style={s.mitigationLabel}>Alternate Entry Eligible?</span><select name="alternateEntryEligible" value={formData.alternateEntryEligible} onChange={handleChange} style={s.mitigationSelect}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
          <div style={s.mitigationItem}><span style={s.mitigationLabel}>Only hazard is atmospheric?</span><select name="onlyAtmosphericHazard" value={formData.onlyAtmosphericHazard} onChange={handleChange} style={s.mitigationSelect}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
          <div style={s.mitigationItem}><span style={s.mitigationLabel}>Ventilation controls the hazard?</span><select name="ventilationControlsHazard" value={formData.ventilationControlsHazard} onChange={handleChange} style={s.mitigationSelect}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
          <div style={s.mitigationItem}><span style={s.mitigationLabel}>Monitoring data supports safe entry?</span><select name="monitoringDataSupports" value={formData.monitoringDataSupports} onChange={handleChange} style={s.mitigationSelect}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
        </div></div>
        
        {/* MITIGATIONS */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionGreen}}>🛡️ Required Controls & Mitigations</div><div style={s.sectionBody}>
          <p style={{fontSize:'13px',fontWeight:'600',marginBottom:'8px'}}>Ventilation & Respiratory</p>
          <div style={s.mitigationItem}><span style={s.mitigationLabel}>Continuous Air Monitoring</span><select name="continuousAirMonitoring" value={formData.continuousAirMonitoring} onChange={handleChange} style={s.mitigationSelect}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option><option value="N/A">N/A</option></select></div>
          <div style={s.mitigationItem}><span style={s.mitigationLabel}>Forced Air Ventilation</span><select name="forcedAirVentilation" value={formData.forcedAirVentilation} onChange={handleChange} style={s.mitigationSelect}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option><option value="N/A">N/A</option></select></div>
          <div style={s.mitigationItem}><span style={s.mitigationLabel}>Natural Ventilation</span><select name="naturalVentilation" value={formData.naturalVentilation} onChange={handleChange} style={s.mitigationSelect}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option><option value="N/A">N/A</option></select></div>
          <div style={s.mitigationItem}><span style={s.mitigationLabel}>Respiratory Protection Required</span><select name="respiratoryProtection" value={formData.respiratoryProtection} onChange={handleChange} style={s.mitigationSelect}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
          <div style={s.mitigationItem}><span style={s.mitigationLabel}>Respiratory Type</span><select name="respiratoryType" value={formData.respiratoryType} onChange={handleChange} style={{...s.mitigationSelect,width:'200px'}}><option value="">Select...</option>{RESPIRATORY_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
          
          <p style={{fontSize:'13px',fontWeight:'600',margin:'12px 0 8px'}}>Isolation & Lockout</p>
          <div style={s.mitigationItem}><span style={s.mitigationLabel}>LOTO Required</span><select name="lotoRequired" value={formData.lotoRequired} onChange={handleChange} style={s.mitigationSelect}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
          <div style={s.mitigationItem}><span style={s.mitigationLabel}>LOTO Verified</span><select name="lotoVerified" value={formData.lotoVerified} onChange={handleChange} style={s.mitigationSelect}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option><option value="N/A">N/A</option></select></div>
          <div style={s.mitigationItem}><span style={s.mitigationLabel}>Line Breaking/Blanking</span><select name="lineBreakingBlanking" value={formData.lineBreakingBlanking} onChange={handleChange} style={s.mitigationSelect}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option><option value="N/A">N/A</option></select></div>
          
          <p style={{fontSize:'13px',fontWeight:'600',margin:'12px 0 8px'}}>Retrieval & Fall Protection</p>
          <div style={s.mitigationItem}><span style={s.mitigationLabel}>Retrieval System</span><select name="retrievalSystem" value={formData.retrievalSystem} onChange={handleChange} style={s.mitigationSelect}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option><option value="N/A">N/A</option></select></div>
          <div style={s.mitigationItem}><span style={s.mitigationLabel}>Tripod/Davit</span><select name="tripodDavit" value={formData.tripodDavit} onChange={handleChange} style={s.mitigationSelect}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option><option value="N/A">N/A</option></select></div>
          <div style={s.mitigationItem}><span style={s.mitigationLabel}>Full Body Harness</span><select name="fullBodyHarness" value={formData.fullBodyHarness} onChange={handleChange} style={s.mitigationSelect}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option><option value="N/A">N/A</option></select></div>
          <div style={s.mitigationItem}><span style={s.mitigationLabel}>Lifeline Attached</span><select name="lifelineAttached" value={formData.lifelineAttached} onChange={handleChange} style={s.mitigationSelect}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option><option value="N/A">N/A</option></select></div>
          <div style={s.mitigationItem}><span style={s.mitigationLabel}>Fall Protection</span><select name="fallProtection" value={formData.fallProtection} onChange={handleChange} style={s.mitigationSelect}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option><option value="N/A">N/A</option></select></div>
          
          <p style={{fontSize:'13px',fontWeight:'600',margin:'12px 0 8px'}}>PPE Requirements</p>
          <div style={s.mitigationItem}><span style={s.mitigationLabel}>Hearing Protection</span><select name="hearingProtection" value={formData.hearingProtection} onChange={handleChange} style={s.mitigationSelect}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option><option value="N/A">N/A</option></select></div>
          <div style={s.mitigationItem}><span style={s.mitigationLabel}>Eye/Face Protection</span><select name="eyeFaceProtection" value={formData.eyeFaceProtection} onChange={handleChange} style={s.mitigationSelect}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option><option value="N/A">N/A</option></select></div>
          <div style={s.mitigationItem}><span style={s.mitigationLabel}>Head Protection</span><select name="headProtection" value={formData.headProtection} onChange={handleChange} style={s.mitigationSelect}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option><option value="N/A">N/A</option></select></div>
          <div style={s.mitigationItem}><span style={s.mitigationLabel}>Hand Protection</span><select name="handProtection" value={formData.handProtection} onChange={handleChange} style={s.mitigationSelect}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option><option value="N/A">N/A</option></select></div>
          <div style={s.mitigationItem}><span style={s.mitigationLabel}>Foot Protection</span><select name="footProtection" value={formData.footProtection} onChange={handleChange} style={s.mitigationSelect}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option><option value="N/A">N/A</option></select></div>
          <div style={s.mitigationItem}><span style={s.mitigationLabel}>Protective Clothing</span><select name="protectiveClothing" value={formData.protectiveClothing} onChange={handleChange} style={s.mitigationSelect}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option><option value="N/A">N/A</option></select></div>
          
          <p style={{fontSize:'13px',fontWeight:'600',margin:'12px 0 8px'}}>Other Controls</p>
          <div style={s.mitigationItem}><span style={s.mitigationLabel}>Communication Method</span><select name="communicationMethod" value={formData.communicationMethod} onChange={handleChange} style={{...s.mitigationSelect,width:'180px'}}><option value="">Select...</option>{COMMUNICATION_METHODS.map(m=><option key={m} value={m}>{m}</option>)}</select></div>
          <div style={s.mitigationItem}><span style={s.mitigationLabel}>Lighting Provided</span><select name="lightingProvided" value={formData.lightingProvided} onChange={handleChange} style={s.mitigationSelect}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option><option value="N/A">N/A</option></select></div>
          <div style={s.mitigationItem}><span style={s.mitigationLabel}>GFCI Protected Tools</span><select name="gfciProtectedTools" value={formData.gfciProtectedTools} onChange={handleChange} style={s.mitigationSelect}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option><option value="N/A">N/A</option></select></div>
          <div style={s.mitigationItem}><span style={s.mitigationLabel}>Hot Work Permit Required</span><select name="hotWorkPermitRequired" value={formData.hotWorkPermitRequired} onChange={handleChange} style={s.mitigationSelect}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
          <div style={s.mitigationItem}><span style={s.mitigationLabel}>Barriers/Barricades</span><select name="barriersBarricades" value={formData.barriersBarricades} onChange={handleChange} style={s.mitigationSelect}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option><option value="N/A">N/A</option></select></div>
        </div></div>
        
        {/* RESCUE */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionPurple}}>🚑 Rescue Provisions</div><div style={s.sectionBody}>
          <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Rescue Team Identified <span style={s.required}>*</span></label><select name="rescueTeamIdentified" value={formData.rescueTeamIdentified} onChange={handleChange} required style={s.select}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option></select></div><div style={s.formGroup}><label style={s.label}>Rescue Team Type</label><select name="rescueTeamType" value={formData.rescueTeamType} onChange={handleChange} style={s.select}><option value="">Select...</option>{RESCUE_TEAM_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></div></div>
          <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Rescue Equipment Available</label><select name="rescueEquipmentAvailable" value={formData.rescueEquipmentAvailable} onChange={handleChange} style={s.select}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option></select></div><div style={s.formGroup}><label style={s.label}>Rescue Response Time</label><input type="text" name="rescueResponseTime" value={formData.rescueResponseTime} onChange={handleChange} placeholder="e.g., <5 minutes" style={s.input}/></div></div>
          <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Hospital/Medical Facility</label><input type="text" name="hospitalMedicalFacility" value={formData.hospitalMedicalFacility} onChange={handleChange} style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Emergency Contact Number</label><input type="text" name="emergencyContactNumber" value={formData.emergencyContactNumber} onChange={handleChange} style={s.input}/></div></div>
        </div></div>
        
        {/* PERSONNEL */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionCyan}}>👷 Personnel</div><div style={s.sectionBody}>
          <p style={{fontSize:'13px',fontWeight:'600',marginBottom:'8px'}}>Attendant</p>
          <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Attendant Name <span style={s.required}>*</span></label><input type="text" name="attendantName" value={formData.attendantName} onChange={handleChange} required style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Attendant Trained?</label><select name="attendantTrained" value={formData.attendantTrained} onChange={handleChange} style={s.select}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option></select></div></div>
          <p style={{fontSize:'13px',fontWeight:'600',margin:'12px 0 8px'}}>Entrants</p>
          <div style={s.entrantRow}><div style={s.formGroup}><label style={s.label}>Entrant 1 Name</label><input type="text" name="entrant1Name" value={formData.entrant1Name} onChange={handleChange} style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Time In</label><input type="time" name="entrant1TimeIn" value={formData.entrant1TimeIn} onChange={handleChange} style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Time Out</label><input type="time" name="entrant1TimeOut" value={formData.entrant1TimeOut} onChange={handleChange} style={s.input}/></div></div>
          <div style={s.entrantRow}><div style={s.formGroup}><label style={s.label}>Entrant 2 Name</label><input type="text" name="entrant2Name" value={formData.entrant2Name} onChange={handleChange} style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Time In</label><input type="time" name="entrant2TimeIn" value={formData.entrant2TimeIn} onChange={handleChange} style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Time Out</label><input type="time" name="entrant2TimeOut" value={formData.entrant2TimeOut} onChange={handleChange} style={s.input}/></div></div>
          <div style={s.entrantRow}><div style={s.formGroup}><label style={s.label}>Entrant 3 Name</label><input type="text" name="entrant3Name" value={formData.entrant3Name} onChange={handleChange} style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Time In</label><input type="time" name="entrant3TimeIn" value={formData.entrant3TimeIn} onChange={handleChange} style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Time Out</label><input type="time" name="entrant3TimeOut" value={formData.entrant3TimeOut} onChange={handleChange} style={s.input}/></div></div>
        </div></div>
        
        {/* VERIFICATION */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionSlate}}>✅ Pre-Entry Verification</div><div style={s.sectionBody}>
          {[{id:'preEntryBriefing',label:'Pre-Entry Briefing Conducted'},{id:'hazardsCommunicated',label:'All Hazards Communicated to Entrants'},{id:'emergencyProceduresReviewed',label:'Emergency Procedures Reviewed'},{id:'equipmentInspected',label:'Equipment Inspected'},{id:'permitsPosted',label:'Permit Posted at Entry Point'}].map(v=><div key={v.id} style={{...s.verificationItem,...(formData[v.id]==='Yes'?s.verificationItemChecked:{})}} onClick={()=>handleVerificationToggle(v.id)}><input type="checkbox" checked={formData[v.id]==='Yes'} readOnly style={{marginRight:'10px',width:'18px',height:'18px',accentColor:'#059669'}}/><span style={{fontSize:'13px'}}>{v.label}</span></div>)}
        </div></div>
        
        {/* AUTHORIZATION */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionBlue}}>✍️ Authorization</div><div style={s.sectionBody}>
          <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Entry Supervisor Signature <span style={s.required}>*</span></label><input type="text" name="entrySupervisorSignature" value={formData.entrySupervisorSignature} onChange={handleChange} required placeholder="Type full name" style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Attendant Signature <span style={s.required}>*</span></label><input type="text" name="attendantSignature" value={formData.attendantSignature} onChange={handleChange} required placeholder="Type full name" style={s.input}/></div></div>
          <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Permit Start Time <span style={s.required}>*</span></label><input type="time" name="startTime" value={formData.startTime} onChange={handleChange} required style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Permit Expiration Time <span style={s.required}>*</span></label><input type="time" name="expirationTime" value={formData.expirationTime} onChange={handleChange} required style={s.input}/></div></div>
        </div></div>
        
        <button type="submit" disabled={isSubmitting} style={{...s.submitBtn,opacity:isSubmitting?0.5:1}}>{isSubmitting?'Issuing Permit...':'Issue Confined Space Entry Permit'}</button>
      </form>)}

      {/* CLOSE OUT TAB */}
      {activeTab==='closeout'&&<div>{closeoutSuccess?<div style={s.successMessage}><div style={{fontSize:'48px',marginBottom:'15px'}}>✅</div><h2 style={{margin:'0 0 10px'}}>Permit Closed Successfully!</h2><p>The permit has been closed out and recorded.</p><button onClick={resetCloseout} style={{...s.submitBtn,maxWidth:'250px',background:'white',color:'#059669',marginTop:'15px'}}>Close Another Permit</button></div>:<>
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionGreen}}>🔍 Select Permit to Close</div><div style={s.sectionBody}>
          {openPermits.length===0?<p style={{textAlign:'center',color:'#6b7280'}}>No open permits found.</p>:openPermits.map(p=><div key={p.permit_number} style={{...s.permitCard,...(selectedPermit===p.permit_number?s.permitCardSelected:{})}} onClick={()=>setSelectedPermit(p.permit_number)}><div style={{fontWeight:'700',color:'#1e3a8a',fontSize:'14px'}}>{p.permit_number}</div><div style={{fontSize:'13px',color:'#6b7280',marginTop:'4px'}}>{p.location} | {p.space_id} | {p.permit_initiator}</div></div>)}
        </div></div>
        
        {selectedPermit&&<div style={s.section}><div style={{...s.sectionHeader,...s.sectionGreen}}>✅ Close Out Checklist</div><div style={s.sectionBody}>
          <div style={s.infoBox}><strong>Closing Permit:</strong> {selectedPermit}</div>
          {[{id:'allEntrantsExited',label:'All Entrants Have Exited the Space'},{id:'spaceSecured',label:'Space Secured (covers replaced, barriers removed)'},{id:'equipmentRetrieved',label:'All Equipment Retrieved'},{id:'ventilationSecured',label:'Ventilation Equipment Secured'}].map(v=><div key={v.id} style={{...s.verificationItem,...(closeoutData[v.id]?s.verificationItemChecked:{})}} onClick={()=>setCloseoutData(p=>({...p,[v.id]:!p[v.id]}))}><input type="checkbox" checked={closeoutData[v.id]} readOnly style={{marginRight:'10px',width:'18px',height:'18px',accentColor:'#059669'}}/><span style={{fontSize:'13px'}}>{v.label}</span></div>)}
          <div style={{...s.formRow,marginTop:'12px'}}><div style={s.formGroup}><label style={s.label}>Time Permit Closed <span style={s.required}>*</span></label><input type="time" value={closeoutData.timePermitClosed} onChange={e=>setCloseoutData(p=>({...p,timePermitClosed:e.target.value}))} required style={s.input}/></div></div>
          <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Entry Supervisor <span style={s.required}>*</span></label><input type="text" value={closeoutData.closeOutEntrySupervisor} onChange={e=>setCloseoutData(p=>({...p,closeOutEntrySupervisor:e.target.value}))} required placeholder="Type full name" style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Attendant <span style={s.required}>*</span></label><input type="text" value={closeoutData.closeOutAttendant} onChange={e=>setCloseoutData(p=>({...p,closeOutAttendant:e.target.value}))} required placeholder="Type full name" style={s.input}/></div></div>
          <button type="button" onClick={submitCloseout} disabled={isSubmitting} style={{...s.submitBtn,...s.submitBtnGreen,opacity:isSubmitting?0.5:1}}>{isSubmitting?'Closing...':'Close Out Permit'}</button>
        </div></div>}
      </>}</div>}
    </div>
    
    <div style={{textAlign:'center',padding:'20px',background:'linear-gradient(to bottom, #f8fafc, #ffffff)',color:'#64748b',fontSize:'11px',borderTop:'1px solid #e2e8f0'}}><span style={{color:'#1e3a5f',fontWeight:'500'}}>AnthroSafe™ Powered by Field Driven Data™</span><span style={{color:'#94a3b8',margin:'0 8px'}}>|</span><span style={{color:'#475569'}}>© 2025 SLP Alaska</span></div>
  </div></div>);
}

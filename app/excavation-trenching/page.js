'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://iypezirwdlqpptjpeeyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
);

const COMPANIES = ['A-C Electric','AKE-Line','Apache Corp.','Armstrong Oil & Gas','ASRC Energy Services','CCI-Industrial','Chosen Construction','CINGSA','Coho Enterprises','Conam Construction','ConocoPhillips','Five Star Oilfield Services','Fox Energy Services','G.A. West','GBR Equipment','GLM Energy Services','Graham Industrial Coatings','Harvest Midstream','Hilcorp Alaska','MagTec Alaska','Merkes Builders','Nordic-Calista','Parker TRS','Peninsula Paving','Pollard Wireline','Ridgeline Oilfield Services','Santos','Summit Excavation','Tesoro Refinery','Yellowjacket','Other'];
const LOCATIONS = ['Kenai','CIO','Beaver Creek','Swanson River','Ninilchik','Nikiski','Other Kenai Asset','Deadhorse','Prudhoe Bay','Kuparuk','Alpine','Willow','ENI','PIKKA','Point Thompson','North Star Island','Endicott','Badami','Other North Slope'];
const EXCAVATION_TYPES = ['Trench','Bell-Bottom Pier Hole','Shaft','Open Excavation','Tunnel','Other'];
const SOIL_CLASSIFICATIONS = ['Type A - Cohesive (clay, silty clay)','Type B - Cohesive (angular gravel, silt)','Type C - Granular (gravel, sand)','Layered - Multiple Types','Unknown - Assume Type C'];
const CLASSIFICATION_METHODS = ['Visual Test','Manual Test (Thumb Penetration)','Pocket Penetrometer','Shearvane','Laboratory Analysis','Multiple Methods'];
const PROTECTIVE_SYSTEM_TYPES = ['None - Under 4ft','Sloping','Benching','Shoring','Shielding (Trench Box)','Combination','PE Designed System'];
const SLOPING_ANGLES = ['N/A','3/4:1 (53°) - Type A','1:1 (45°) - Type B','1.5:1 (34°) - Type C','Per PE Design'];
const SHORING_TYPES = ['N/A','Timber','Aluminum Hydraulic','Pneumatic','Screw Jacks','Other'];
const SHIELDING_TYPES = ['N/A','Steel Trench Box','Aluminum Trench Shield','Manhole Box','Slide Rail System','Other'];
const DURATION_OPTIONS = ['Less than 1 day','1-3 days','4-7 days','1-2 weeks','2-4 weeks','More than 1 month'];
const HAZARD_CATEGORIES = [{id:'heights',label:'Working at Heights'},{id:'confinedSpace',label:'Confined Space'},{id:'highPressure',label:'High Pressure'},{id:'criticalLifts',label:'Critical Lifts'},{id:'traffic',label:'Traffic Exposure'},{id:'utilities',label:'Underground Utilities'},{id:'water',label:'Water Accumulation'},{id:'structures',label:'Adjacent Structures'}];

function generatePermitNumber(){const now=new Date();const d=now.getFullYear()+String(now.getMonth()+1).padStart(2,'0')+String(now.getDate()).padStart(2,'0');return 'EXC-'+d+'-'+String(Math.floor(Math.random()*10000)).padStart(4,'0');}

function calculateIndicators(data){
  let good=0,bad=0;const notes=[];
  if(data.oneCallTicket){good++;notes.push('One-Call ticket obtained');}
  if(data.competentPersonName){good++;notes.push('Competent person assigned');}
  if(data.dailyInspectionsPlanned==='Yes')good++;
  if(data.protectiveSystemType&&data.protectiveSystemType!=='None - Under 4ft')good++;
  if(data.ladderAccess==='Yes'||data.rampAccess==='Yes')good++;
  if(data.spoilPileSetback==='Yes')good++;
  if(data.jsaCompleted==='Yes')good++;
  if(data.crewBriefing==='Yes')good++;
  if(data.barricadesFencing==='Yes')good++;
  if(data.crewAcknowledgment==='Yes')good++;
  const depth=parseFloat(data.estimatedDepth)||0;
  if(depth>=5&&data.protectiveSystemType==='None - Under 4ft'){bad+=2;notes.push('CRITICAL: No protective system >=5ft');}
  if(!data.oneCallTicket){bad++;notes.push('No One-Call ticket');}
  if(!data.competentPersonName){bad++;notes.push('No competent person');}
  if(data.waterPresent==='Yes')bad++;
  if(data.adjacentStructures==='Yes'&&data.structureProtectionPlan!=='Yes')bad++;
  if(data.previouslyDisturbed==='Yes')bad+=0.5;
  if(depth>=4&&data.ladderAccess!=='Yes'&&data.rampAccess!=='Yes')bad++;
  if(data.spoilPileSetback==='No')bad++;
  return {good,bad,notes};
}

export default function ExcavationPermit(){
  const [activeTab,setActiveTab]=useState('new');
  const [isSubmitting,setIsSubmitting]=useState(false);
  const [submitted,setSubmitted]=useState(false);
  const [submittedPermit,setSubmittedPermit]=useState(null);
  const [openPermits,setOpenPermits]=useState([]);
  const [selectedPermit,setSelectedPermit]=useState(null);
  const [closeoutSuccess,setCloseoutSuccess]=useState(false);
  const [showDepthWarning,setShowDepthWarning]=useState(false);
  
  const getDefaultExpDate=()=>{const d=new Date();d.setDate(d.getDate()+7);return d.toISOString().split('T')[0];};
  
  const [formData,setFormData]=useState({
    permitInitiator:'',date:new Date().toISOString().split('T')[0],durationOfWork:'',company:'',location:'',phoneRadio:'',excavationLocationDesc:'',purposeOfExcavation:'',
    excavationType:'',estimatedDepth:'',estimatedLength:'',estimatedWidth:'',
    oneCallTicket:'',oneCallDate:'',electricalLocated:'',gasLocated:'',waterLocated:'',sewerLocated:'',telecomLocated:'',otherUtilities:'',handDigRequired:'',privateUtilities:'',
    soilClassification:'',classifiedBy:'',classificationMethod:'',previouslyDisturbed:'',waterPresent:'',
    protectiveSystemType:'',slopingAngle:'',shoringType:'',shieldingType:'',tabulatedData:'',peDesignRequired:'',
    competentPersonName:'',competentPersonCompany:'',dailyInspectionsPlanned:'',
    ladderAccess:'',ladderSpacing:'',rampAccess:'',stepsStairs:'',
    spoilPileSetback:'',surfaceWaterControls:'',dewateringRequired:'',trafficControls:'',barricadesFencing:'',warningSigns:'',adjacentStructures:'',structureProtectionPlan:'',
    atmosphericTesting:'',o2Level:'',lelLevel:'',h2sLevel:'',coLevel:'',ventilationRequired:'',
    mobileEquipment:'',spottersRequired:'',stopLogs:'',equipmentSetback:'',
    areaOperatorNotified:'',jsaCompleted:'',crewBriefing:'',emergencyPlan:'',rescueEquipment:'',firstAidAvailable:'',communicationEstablished:'',
    hazardCategories:{},hazardTask1:'',hazard1:'',mitigation1:'',hazardTask2:'',hazard2:'',mitigation2:'',hazardTask3:'',hazard3:'',mitigation3:'',
    workGroupLeader:'',competentPersonSignature:'',areaOperator:'',responsibleSupervisor:'',startDate:new Date().toISOString().split('T')[0],expirationDate:getDefaultExpDate(),crewAcknowledgment:''
  });
  
  const [closeoutData,setCloseoutData]=useState({jobCompleted:false,excavationBackfilled:false,areaRestored:false,utilitiesVerified:false,timePermitClosed:'',closeOutWorker:'',closeOutSupervisor:''});

  useEffect(()=>{if(activeTab==='closeout')loadOpenPermits();},[activeTab]);
  useEffect(()=>{setShowDepthWarning(parseFloat(formData.estimatedDepth)>=4);},[formData.estimatedDepth]);

  const loadOpenPermits=async()=>{try{const{data}=await supabase.from('excavation_permits').select('*').eq('permit_status','Open').order('created_at',{ascending:false});setOpenPermits(data||[]);}catch(e){console.error(e);}};

  const handleChange=(e)=>{const{name,value}=e.target;setFormData(p=>({...p,[name]:value}));};
  const handleHazardToggle=(id)=>{setFormData(p=>({...p,hazardCategories:{...p.hazardCategories,[id]:!p.hazardCategories[id]}}));};

  const handleSubmit=async(e)=>{e.preventDefault();setIsSubmitting(true);
    try{
      const permitNumber=generatePermitNumber();
      const indicators=calculateIndicators(formData);
      
      const{error}=await supabase.from('excavation_permits').insert([{
        permit_number:permitNumber,permit_status:'Open',permit_initiator:formData.permitInitiator,date:formData.date,company:formData.company,location:formData.location,phone_radio:formData.phoneRadio,duration_of_work:formData.durationOfWork,excavation_location_desc:formData.excavationLocationDesc,purpose_of_excavation:formData.purposeOfExcavation,
        excavation_type:formData.excavationType,estimated_depth:parseFloat(formData.estimatedDepth)||null,estimated_length:parseFloat(formData.estimatedLength)||null,estimated_width:parseFloat(formData.estimatedWidth)||null,
        one_call_ticket:formData.oneCallTicket,one_call_date:formData.oneCallDate||null,electrical_located:formData.electricalLocated,gas_located:formData.gasLocated,water_located:formData.waterLocated,sewer_located:formData.sewerLocated,telecom_located:formData.telecomLocated,other_utilities:formData.otherUtilities,hand_dig_required:formData.handDigRequired,private_utilities:formData.privateUtilities,
        soil_classification:formData.soilClassification,classified_by:formData.classifiedBy,classification_method:formData.classificationMethod,previously_disturbed:formData.previouslyDisturbed,water_present:formData.waterPresent,
        protective_system_type:formData.protectiveSystemType,sloping_angle:formData.slopingAngle,shoring_type:formData.shoringType,shielding_type:formData.shieldingType,tabulated_data:formData.tabulatedData,pe_design_required:formData.peDesignRequired,
        competent_person_name:formData.competentPersonName,competent_person_company:formData.competentPersonCompany,daily_inspections_planned:formData.dailyInspectionsPlanned,
        ladder_access:formData.ladderAccess,ladder_spacing:formData.ladderSpacing,ramp_access:formData.rampAccess,steps_stairs:formData.stepsStairs,
        spoil_pile_setback:formData.spoilPileSetback,surface_water_controls:formData.surfaceWaterControls,dewatering_required:formData.dewateringRequired,traffic_controls:formData.trafficControls,barricades_fencing:formData.barricadesFencing,warning_signs:formData.warningSigns,adjacent_structures:formData.adjacentStructures,structure_protection_plan:formData.structureProtectionPlan,
        atmospheric_testing:formData.atmosphericTesting,o2_level:formData.o2Level,lel_level:formData.lelLevel,h2s_level:formData.h2sLevel,co_level:formData.coLevel,ventilation_required:formData.ventilationRequired,
        mobile_equipment:formData.mobileEquipment,spotters_required:formData.spottersRequired,stop_logs:formData.stopLogs,equipment_setback:formData.equipmentSetback,
        area_operator_notified:formData.areaOperatorNotified,jsa_completed:formData.jsaCompleted,crew_briefing:formData.crewBriefing,emergency_plan:formData.emergencyPlan,rescue_equipment:formData.rescueEquipment,first_aid_available:formData.firstAidAvailable,communication_established:formData.communicationEstablished,
        hazard_categories:formData.hazardCategories,hazard_task_1:formData.hazardTask1,hazard_1:formData.hazard1,mitigation_1:formData.mitigation1,hazard_task_2:formData.hazardTask2,hazard_2:formData.hazard2,mitigation_2:formData.mitigation2,hazard_task_3:formData.hazardTask3,hazard_3:formData.hazard3,mitigation_3:formData.mitigation3,
        work_group_leader:formData.workGroupLeader,competent_person_signature:formData.competentPersonSignature,area_operator:formData.areaOperator,responsible_supervisor:formData.responsibleSupervisor,start_date:formData.startDate||null,expiration_date:formData.expirationDate||null,crew_acknowledgment:formData.crewAcknowledgment,
        good_indicators:indicators.good,bad_indicators:indicators.bad,indicator_notes:indicators.notes.join('; ')
      }]);
      if(error)throw error;
      setSubmittedPermit(permitNumber);setSubmitted(true);
    }catch(e){console.error(e);alert('Error: '+e.message);}finally{setIsSubmitting(false);}
  };

  const submitCloseout=async()=>{if(!selectedPermit){alert('Select a permit');return;}if(!closeoutData.closeOutWorker||!closeoutData.closeOutSupervisor){alert('Fill required fields');return;}
    setIsSubmitting(true);try{
      const{error}=await supabase.from('excavation_permits').update({permit_status:'Closed',job_completed:closeoutData.jobCompleted?'Yes':'No',excavation_backfilled:closeoutData.excavationBackfilled?'Yes':'No',area_restored:closeoutData.areaRestored?'Yes':'No',utilities_verified:closeoutData.utilitiesVerified?'Yes':'No',time_permit_closed:closeoutData.timePermitClosed||null,close_out_worker:closeoutData.closeOutWorker,close_out_supervisor:closeoutData.closeOutSupervisor,closed_at:new Date().toISOString()}).eq('permit_number',selectedPermit);
      if(error)throw error;setCloseoutSuccess(true);
    }catch(e){console.error(e);alert('Error: '+e.message);}finally{setIsSubmitting(false);}
  };

  const getDefaultExpDateFn=()=>{const d=new Date();d.setDate(d.getDate()+7);return d.toISOString().split('T')[0];};
  const resetForm=()=>{setFormData({permitInitiator:'',date:new Date().toISOString().split('T')[0],durationOfWork:'',company:'',location:'',phoneRadio:'',excavationLocationDesc:'',purposeOfExcavation:'',excavationType:'',estimatedDepth:'',estimatedLength:'',estimatedWidth:'',oneCallTicket:'',oneCallDate:'',electricalLocated:'',gasLocated:'',waterLocated:'',sewerLocated:'',telecomLocated:'',otherUtilities:'',handDigRequired:'',privateUtilities:'',soilClassification:'',classifiedBy:'',classificationMethod:'',previouslyDisturbed:'',waterPresent:'',protectiveSystemType:'',slopingAngle:'',shoringType:'',shieldingType:'',tabulatedData:'',peDesignRequired:'',competentPersonName:'',competentPersonCompany:'',dailyInspectionsPlanned:'',ladderAccess:'',ladderSpacing:'',rampAccess:'',stepsStairs:'',spoilPileSetback:'',surfaceWaterControls:'',dewateringRequired:'',trafficControls:'',barricadesFencing:'',warningSigns:'',adjacentStructures:'',structureProtectionPlan:'',atmosphericTesting:'',o2Level:'',lelLevel:'',h2sLevel:'',coLevel:'',ventilationRequired:'',mobileEquipment:'',spottersRequired:'',stopLogs:'',equipmentSetback:'',areaOperatorNotified:'',jsaCompleted:'',crewBriefing:'',emergencyPlan:'',rescueEquipment:'',firstAidAvailable:'',communicationEstablished:'',hazardCategories:{},hazardTask1:'',hazard1:'',mitigation1:'',hazardTask2:'',hazard2:'',mitigation2:'',hazardTask3:'',hazard3:'',mitigation3:'',workGroupLeader:'',competentPersonSignature:'',areaOperator:'',responsibleSupervisor:'',startDate:new Date().toISOString().split('T')[0],expirationDate:getDefaultExpDateFn(),crewAcknowledgment:''});setSubmitted(false);setSubmittedPermit(null);};
  const resetCloseout=()=>{setCloseoutData({jobCompleted:false,excavationBackfilled:false,areaRestored:false,utilitiesVerified:false,timePermitClosed:'',closeOutWorker:'',closeOutSupervisor:''});setSelectedPermit(null);setCloseoutSuccess(false);loadOpenPermits();};

  const s={container:{minHeight:'100vh',background:'linear-gradient(135deg, #1e3a8a 0%, #b91c1c 100%)',padding:'20px'},formContainer:{maxWidth:'1000px',margin:'0 auto',background:'white',borderRadius:'12px',boxShadow:'0 4px 6px rgba(0,0,0,0.1)',overflow:'hidden'},header:{background:'linear-gradient(135deg, #1e3a8a 0%, #b91c1c 100%)',color:'white',padding:'25px',textAlign:'center'},content:{padding:'25px'},tabs:{display:'flex',background:'#f1f5f9',padding:'8px',gap:'8px'},tab:{flex:1,padding:'12px',border:'none',borderRadius:'8px',fontWeight:'600',cursor:'pointer',fontSize:'14px',transition:'all 0.2s'},tabActive:{background:'#1e3a8a',color:'white'},tabInactive:{background:'white',color:'#475569'},section:{marginBottom:'15px',border:'1px solid #e5e7eb',borderRadius:'10px',overflow:'hidden'},sectionHeader:{color:'white',padding:'10px 15px',fontWeight:'600',fontSize:'14px'},sectionBlue:{background:'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)'},sectionRed:{background:'linear-gradient(135deg, #b91c1c 0%, #991b1b 100%)'},sectionGreen:{background:'linear-gradient(135deg, #059669 0%, #047857 100%)'},sectionPurple:{background:'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)'},sectionCyan:{background:'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)'},sectionAmber:{background:'linear-gradient(135deg, #92400e 0%, #78350f 100%)'},sectionOrange:{background:'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'},sectionSlate:{background:'linear-gradient(135deg, #475569 0%, #334155 100%)'},sectionBody:{padding:'12px',background:'#f8fafc'},formRow:{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))',gap:'12px',marginBottom:'12px'},formGroup:{display:'flex',flexDirection:'column'},label:{fontWeight:'600',color:'#374151',marginBottom:'4px',fontSize:'13px'},required:{color:'#b91c1c'},input:{padding:'8px 10px',border:'2px solid #d1d5db',borderRadius:'6px',fontSize:'14px'},select:{padding:'8px 10px',border:'2px solid #d1d5db',borderRadius:'6px',fontSize:'14px',background:'white'},textarea:{padding:'8px 10px',border:'2px solid #d1d5db',borderRadius:'6px',fontSize:'14px',minHeight:'60px',resize:'vertical'},infoBox:{background:'#eff6ff',borderLeft:'4px solid #1e3a8a',padding:'10px',marginBottom:'12px',fontSize:'13px',borderRadius:'0 6px 6px 0'},warningBox:{background:'#fef3c7',borderLeft:'4px solid #92400e',padding:'10px',marginBottom:'12px',fontSize:'13px',borderRadius:'0 6px 6px 0'},depthWarning:{background:'#fee2e2',borderLeft:'4px solid #b91c1c',padding:'10px',marginTop:'8px',fontSize:'13px',borderRadius:'0 6px 6px 0',color:'#991b1b'},utilityGrid:{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(150px, 1fr))',gap:'8px'},utilityItem:{display:'flex',justifyContent:'space-between',alignItems:'center',background:'white',padding:'8px 10px',borderRadius:'6px',border:'1px solid #e5e7eb'},utilityLabel:{fontSize:'13px'},utilitySelect:{width:'70px',padding:'4px 6px',fontSize:'12px'},mitigationItem:{display:'flex',justifyContent:'space-between',alignItems:'center',background:'white',padding:'8px 12px',borderRadius:'6px',border:'1px solid #e5e7eb',marginBottom:'6px'},mitigationLabel:{fontSize:'13px',flex:1},mitigationSelect:{width:'100px',padding:'5px 8px',fontSize:'13px'},hazardGrid:{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))',gap:'8px'},hazardItem:{display:'flex',alignItems:'center',background:'white',padding:'8px 10px',borderRadius:'6px',border:'1px solid #e5e7eb',cursor:'pointer',fontSize:'13px'},hazardItemChecked:{background:'#fef3c7',borderColor:'#92400e'},hazardTable:{width:'100%',borderCollapse:'collapse',background:'white',borderRadius:'6px',overflow:'hidden'},hazardTableTh:{background:'#f1f5f9',padding:'8px',textAlign:'left',fontSize:'13px',fontWeight:'600'},hazardTableTd:{padding:'6px',borderTop:'1px solid #e5e7eb'},verificationItem:{display:'flex',alignItems:'center',background:'white',padding:'10px',borderRadius:'6px',marginBottom:'6px',cursor:'pointer',border:'1px solid #e5e7eb'},verificationItemChecked:{background:'#dcfce7',borderLeft:'3px solid #059669'},submitBtn:{width:'100%',padding:'14px',background:'linear-gradient(135deg, #1e3a8a 0%, #b91c1c 100%)',color:'white',border:'none',borderRadius:'10px',fontSize:'16px',fontWeight:'600',cursor:'pointer',marginTop:'15px'},submitBtnGreen:{background:'linear-gradient(135deg, #059669 0%, #047857 100%)'},successMessage:{background:'linear-gradient(135deg, #059669 0%, #047857 100%)',color:'white',padding:'30px',borderRadius:'12px',textAlign:'center',margin:'20px 0'},permitCard:{background:'white',border:'2px solid #e5e7eb',borderRadius:'8px',padding:'12px',marginBottom:'10px',cursor:'pointer',transition:'all 0.2s'},permitCardSelected:{borderColor:'#059669',background:'#f0fdf4'}};

  if(submitted&&submittedPermit){return(<div style={s.container}><div style={{maxWidth:'600px',margin:'0 auto',paddingTop:'50px'}}><div style={s.successMessage}><div style={{fontSize:'48px',marginBottom:'15px'}}>✅</div><h2 style={{margin:'0 0 10px'}}>Permit Issued Successfully!</h2><div style={{background:'rgba(255,255,255,0.2)',padding:'12px',borderRadius:'8px',fontSize:'20px',fontWeight:'bold',margin:'15px 0'}}>{submittedPermit}</div><p>Daily inspections must be conducted by competent person.</p><div style={{display:'flex',gap:'10px',justifyContent:'center',marginTop:'20px',flexWrap:'wrap'}}><button onClick={resetForm} style={{...s.submitBtn,maxWidth:'200px',background:'white',color:'#059669'}}>Issue Another</button><a href="/" style={{...s.submitBtn,maxWidth:'200px',background:'#6b7280',textDecoration:'none',textAlign:'center'}}>Back to Portal</a></div></div></div></div>);}

  return(<div style={s.container}><div style={s.formContainer}>
    <div style={s.header}><a href="/" style={{color:'white',textDecoration:'none',fontSize:'14px'}}>← Back to Portal</a><div style={{background:'rgba(255,255,255,0.95)',borderRadius:'12px',padding:'15px',width:'fit-content',margin:'15px auto',boxShadow:'0 4px 15px rgba(0,0,0,0.2)'}}><img src="/Logo.png" alt="SLP Alaska" style={{maxWidth:'180px',height:'auto'}}/></div><div style={{display:'inline-block',background:'white',color:'#92400e',padding:'5px 14px',borderRadius:'20px',fontWeight:'700',fontSize:'12px',marginBottom:'12px',border:'3px solid white'}}>🚧 OSHA 1926 Subpart P</div><h1 style={{margin:'0 0 5px',fontSize:'20px'}}>Excavation & Trenching Permit</h1><p style={{opacity:0.9,fontSize:'13px'}}>SLP Alaska Safety Management System</p></div>
    
    <div style={s.tabs}><button style={{...s.tab,...(activeTab==='new'?s.tabActive:s.tabInactive)}} onClick={()=>setActiveTab('new')}>📝 New Permit</button><button style={{...s.tab,...(activeTab==='closeout'?s.tabActive:s.tabInactive)}} onClick={()=>setActiveTab('closeout')}>✅ Close Out Permit</button></div>
    
    <div style={s.content}>
      {activeTab==='new'&&(<form onSubmit={handleSubmit}>
        {/* PERMIT INFO */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionBlue}}>📋 Permit Information</div><div style={s.sectionBody}>
          <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Permit Initiator <span style={s.required}>*</span></label><input type="text" name="permitInitiator" value={formData.permitInitiator} onChange={handleChange} required style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Date <span style={s.required}>*</span></label><input type="date" name="date" value={formData.date} onChange={handleChange} required style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Duration of Work</label><select name="durationOfWork" value={formData.durationOfWork} onChange={handleChange} style={s.select}><option value="">Select...</option>{DURATION_OPTIONS.map(d=><option key={d} value={d}>{d}</option>)}</select></div></div>
          <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Client/Company <span style={s.required}>*</span></label><select name="company" value={formData.company} onChange={handleChange} required style={s.select}><option value="">Select...</option>{COMPANIES.map(c=><option key={c} value={c}>{c}</option>)}</select></div><div style={s.formGroup}><label style={s.label}>Location <span style={s.required}>*</span></label><select name="location" value={formData.location} onChange={handleChange} required style={s.select}><option value="">Select...</option>{LOCATIONS.map(l=><option key={l} value={l}>{l}</option>)}</select></div><div style={s.formGroup}><label style={s.label}>Phone/Radio</label><input type="text" name="phoneRadio" value={formData.phoneRadio} onChange={handleChange} style={s.input}/></div></div>
          <div style={s.formGroup}><label style={s.label}>Excavation Location Description <span style={s.required}>*</span></label><input type="text" name="excavationLocationDesc" value={formData.excavationLocationDesc} onChange={handleChange} required placeholder="e.g., 50ft north of Well Pad A" style={s.input}/></div>
          <div style={s.formGroup}><label style={s.label}>Purpose of Excavation <span style={s.required}>*</span></label><textarea name="purposeOfExcavation" value={formData.purposeOfExcavation} onChange={handleChange} required placeholder="Describe the work requiring excavation..." style={s.textarea}/></div>
        </div></div>
        
        {/* EXCAVATION DETAILS */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionAmber}}>📐 Excavation Details</div><div style={s.sectionBody}>
          <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Excavation Type <span style={s.required}>*</span></label><select name="excavationType" value={formData.excavationType} onChange={handleChange} required style={s.select}><option value="">Select...</option>{EXCAVATION_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></div><div style={s.formGroup}><label style={s.label}>Estimated Depth (ft) <span style={s.required}>*</span></label><input type="number" name="estimatedDepth" value={formData.estimatedDepth} onChange={handleChange} required step="0.5" min="0" style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Estimated Length (ft)</label><input type="number" name="estimatedLength" value={formData.estimatedLength} onChange={handleChange} step="0.5" min="0" style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Estimated Width (ft)</label><input type="number" name="estimatedWidth" value={formData.estimatedWidth} onChange={handleChange} step="0.5" min="0" style={s.input}/></div></div>
          {showDepthWarning&&<div style={s.depthWarning}>⚠️ Excavations 4+ feet require ladder access. 5+ feet require protective systems per OSHA.</div>}
        </div></div>
        
        {/* UTILITY LOCATING */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionOrange}}>📞 Utility Locating (One-Call/811)</div><div style={s.sectionBody}>
          <div style={s.infoBox}>⚠️ Call 811 at least 48 hours before digging. Hand dig within tolerance zone (18" each side of marked utility).</div>
          <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>One-Call/811 Ticket # <span style={s.required}>*</span></label><input type="text" name="oneCallTicket" value={formData.oneCallTicket} onChange={handleChange} required placeholder="Ticket number" style={s.input}/></div><div style={s.formGroup}><label style={s.label}>One-Call Date</label><input type="date" name="oneCallDate" value={formData.oneCallDate} onChange={handleChange} style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Hand Dig Required?</label><select name="handDigRequired" value={formData.handDigRequired} onChange={handleChange} style={s.select}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option></select></div></div>
          <p style={{fontSize:'13px',marginBottom:'8px',color:'#6b7280'}}>Utility Location Status:</p>
          <div style={s.utilityGrid}>{[{id:'electricalLocated',label:'Electrical'},{id:'gasLocated',label:'Gas'},{id:'waterLocated',label:'Water'},{id:'sewerLocated',label:'Sewer'},{id:'telecomLocated',label:'Telecom'},{id:'privateUtilities',label:'Private'}].map(u=><div key={u.id} style={s.utilityItem}><span style={s.utilityLabel}>{u.label}</span><select name={u.id} value={formData[u.id]} onChange={handleChange} style={s.utilitySelect}><option value="">-</option><option value="Yes">Yes</option><option value="No">No</option><option value="N/A">N/A</option></select></div>)}</div>
          <div style={{...s.formGroup,marginTop:'10px'}}><label style={s.label}>Other Utilities</label><input type="text" name="otherUtilities" value={formData.otherUtilities} onChange={handleChange} placeholder="e.g., Fiber optic, steam lines" style={s.input}/></div>
        </div></div>
        
        {/* SOIL CLASSIFICATION */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionPurple}}>🧪 Soil Classification</div><div style={s.sectionBody}>
          <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Soil Classification <span style={s.required}>*</span></label><select name="soilClassification" value={formData.soilClassification} onChange={handleChange} required style={s.select}><option value="">Select...</option>{SOIL_CLASSIFICATIONS.map(c=><option key={c} value={c}>{c}</option>)}</select></div><div style={s.formGroup}><label style={s.label}>Classified By</label><input type="text" name="classifiedBy" value={formData.classifiedBy} onChange={handleChange} placeholder="Competent person name" style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Classification Method</label><select name="classificationMethod" value={formData.classificationMethod} onChange={handleChange} style={s.select}><option value="">Select...</option>{CLASSIFICATION_METHODS.map(m=><option key={m} value={m}>{m}</option>)}</select></div></div>
          <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Previously Disturbed?</label><select name="previouslyDisturbed" value={formData.previouslyDisturbed} onChange={handleChange} style={s.select}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option></select></div><div style={s.formGroup}><label style={s.label}>Water Present?</label><select name="waterPresent" value={formData.waterPresent} onChange={handleChange} style={s.select}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option></select></div></div>
        </div></div>
        
        {/* PROTECTIVE SYSTEMS */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionRed}}>🛡️ Protective Systems</div><div style={s.sectionBody}>
          <div style={s.warningBox}>⚠️ OSHA requires protective systems for excavations 5 feet or deeper (4 feet if hazardous conditions exist).</div>
          <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Protective System Type <span style={s.required}>*</span></label><select name="protectiveSystemType" value={formData.protectiveSystemType} onChange={handleChange} required style={s.select}><option value="">Select...</option>{PROTECTIVE_SYSTEM_TYPES.map(p=><option key={p} value={p}>{p}</option>)}</select></div><div style={s.formGroup}><label style={s.label}>Sloping Angle</label><select name="slopingAngle" value={formData.slopingAngle} onChange={handleChange} style={s.select}><option value="">Select...</option>{SLOPING_ANGLES.map(a=><option key={a} value={a}>{a}</option>)}</select></div></div>
          <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Shoring Type</label><select name="shoringType" value={formData.shoringType} onChange={handleChange} style={s.select}><option value="">Select...</option>{SHORING_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></div><div style={s.formGroup}><label style={s.label}>Shielding Type</label><select name="shieldingType" value={formData.shieldingType} onChange={handleChange} style={s.select}><option value="">Select...</option>{SHIELDING_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></div></div>
          <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Tabulated Data Available?</label><select name="tabulatedData" value={formData.tabulatedData} onChange={handleChange} style={s.select}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option></select></div><div style={s.formGroup}><label style={s.label}>PE Design Required?</label><select name="peDesignRequired" value={formData.peDesignRequired} onChange={handleChange} style={s.select}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option></select></div></div>
        </div></div>
        
        {/* COMPETENT PERSON */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionCyan}}>👷 Competent Person</div><div style={s.sectionBody}>
          <div style={s.infoBox}>A competent person must be designated to perform daily inspections and have authority to take corrective action.</div>
          <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Competent Person Name <span style={s.required}>*</span></label><input type="text" name="competentPersonName" value={formData.competentPersonName} onChange={handleChange} required style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Company</label><select name="competentPersonCompany" value={formData.competentPersonCompany} onChange={handleChange} style={s.select}><option value="">Select...</option>{COMPANIES.map(c=><option key={c} value={c}>{c}</option>)}</select></div><div style={s.formGroup}><label style={s.label}>Daily Inspections Planned?</label><select name="dailyInspectionsPlanned" value={formData.dailyInspectionsPlanned} onChange={handleChange} style={s.select}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option></select></div></div>
        </div></div>
        
        {/* ACCESS & EGRESS */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionGreen}}>🪜 Access & Egress</div><div style={s.sectionBody}>
          <div style={s.infoBox}>Excavations 4 feet or deeper require a ladder, ramp, or other safe means of egress within 25 feet of workers.</div>
          <div style={s.utilityGrid}>{[{id:'ladderAccess',label:'Ladder Access'},{id:'ladderSpacing',label:'Ladder Spacing ≤25ft'},{id:'rampAccess',label:'Ramp Access'},{id:'stepsStairs',label:'Steps/Stairs'}].map(a=><div key={a.id} style={s.utilityItem}><span style={s.utilityLabel}>{a.label}</span><select name={a.id} value={formData[a.id]} onChange={handleChange} style={s.utilitySelect}><option value="">-</option><option value="Yes">Yes</option><option value="No">No</option>{a.id==='ladderSpacing'&&<option value="N/A">N/A</option>}</select></div>)}</div>
        </div></div>
        
        {/* SITE SAFETY CONTROLS */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionSlate}}>🚧 Site Safety Controls</div><div style={s.sectionBody}>
          {[{id:'spoilPileSetback',label:'Spoil Pile ≥2 ft from Edge?'},{id:'surfaceWaterControls',label:'Surface Water Controls?'},{id:'dewateringRequired',label:'Dewatering Required?'},{id:'trafficControls',label:'Traffic Controls in Place?'},{id:'barricadesFencing',label:'Barricades/Fencing?'},{id:'warningSigns',label:'Warning Signs Posted?'},{id:'adjacentStructures',label:'Adjacent Structures?'},{id:'structureProtectionPlan',label:'Structure Protection Plan?'}].map(c=><div key={c.id} style={s.mitigationItem}><span style={s.mitigationLabel}>{c.label}</span><select name={c.id} value={formData[c.id]} onChange={handleChange} style={s.mitigationSelect}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option>{(c.id==='surfaceWaterControls'||c.id==='trafficControls'||c.id==='structureProtectionPlan')&&<option value="N/A">N/A</option>}</select></div>)}
        </div></div>
        
        {/* ATMOSPHERIC MONITORING */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionOrange}}>💨 Atmospheric Monitoring</div><div style={s.sectionBody}>
          <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Atmospheric Testing Required?</label><select name="atmosphericTesting" value={formData.atmosphericTesting} onChange={handleChange} style={s.select}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option></select></div><div style={s.formGroup}><label style={s.label}>Ventilation Required?</label><select name="ventilationRequired" value={formData.ventilationRequired} onChange={handleChange} style={s.select}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option></select></div></div>
          <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>O₂ Level (%)</label><input type="text" name="o2Level" value={formData.o2Level} onChange={handleChange} placeholder="19.5-23.5%" style={s.input}/></div><div style={s.formGroup}><label style={s.label}>LEL (%)</label><input type="text" name="lelLevel" value={formData.lelLevel} onChange={handleChange} placeholder="<10%" style={s.input}/></div><div style={s.formGroup}><label style={s.label}>H₂S (ppm)</label><input type="text" name="h2sLevel" value={formData.h2sLevel} onChange={handleChange} placeholder="<10 ppm" style={s.input}/></div><div style={s.formGroup}><label style={s.label}>CO (ppm)</label><input type="text" name="coLevel" value={formData.coLevel} onChange={handleChange} placeholder="<25 ppm" style={s.input}/></div></div>
        </div></div>
        
        {/* MOBILE EQUIPMENT */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionAmber}}>🚜 Mobile Equipment Safety</div><div style={s.sectionBody}>
          {[{id:'mobileEquipment',label:'Mobile Equipment Used?'},{id:'spottersRequired',label:'Spotters Required?'},{id:'stopLogs',label:'Stop Logs/Barricades at Edge?'},{id:'equipmentSetback',label:'Equipment Setback Maintained?'}].map(m=><div key={m.id} style={s.mitigationItem}><span style={s.mitigationLabel}>{m.label}</span><select name={m.id} value={formData[m.id]} onChange={handleChange} style={s.mitigationSelect}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option>{m.id!=='mobileEquipment'&&<option value="N/A">N/A</option>}</select></div>)}
        </div></div>
        
        {/* PRE-WORK REQUIREMENTS */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionCyan}}>📋 Pre-Work Requirements</div><div style={s.sectionBody}>
          {[{id:'areaOperatorNotified',label:'Area Operator Notified?'},{id:'jsaCompleted',label:'JSA/JHA Completed?'},{id:'crewBriefing',label:'Crew Briefing Held?'},{id:'emergencyPlan',label:'Emergency Plan Reviewed?'},{id:'rescueEquipment',label:'Rescue Equipment Available?'},{id:'firstAidAvailable',label:'First Aid Available?'},{id:'communicationEstablished',label:'Communication Established?'}].map(p=><div key={p.id} style={s.mitigationItem}><span style={s.mitigationLabel}>{p.label}</span><select name={p.id} value={formData[p.id]} onChange={handleChange} style={s.mitigationSelect}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option></select></div>)}
        </div></div>
        
        {/* HAZARD CATEGORIES */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionRed}}>⚠️ Additional Hazard Categories</div><div style={s.sectionBody}>
          <p style={{fontSize:'13px',marginBottom:'8px',color:'#6b7280'}}>Check all additional hazards present:</p>
          <div style={s.hazardGrid}>{HAZARD_CATEGORIES.map(h=><div key={h.id} style={{...s.hazardItem,...(formData.hazardCategories[h.id]?s.hazardItemChecked:{})}} onClick={()=>handleHazardToggle(h.id)}><input type="checkbox" checked={formData.hazardCategories[h.id]||false} readOnly style={{marginRight:'8px',accentColor:'#92400e'}}/><span>{h.label}</span></div>)}</div>
        </div></div>
        
        {/* HAZARD MITIGATION TABLE */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionPurple}}>🔧 Hazard Mitigation</div><div style={s.sectionBody}>
          <table style={s.hazardTable}><thead><tr><th style={s.hazardTableTh}>Task</th><th style={s.hazardTableTh}>Hazard</th><th style={s.hazardTableTh}>Mitigation</th></tr></thead><tbody>
            {[1,2,3].map(n=><tr key={n}><td style={s.hazardTableTd}><input type="text" name={`hazardTask${n}`} value={formData[`hazardTask${n}`]} onChange={handleChange} placeholder="Task" style={{...s.input,width:'100%'}}/></td><td style={s.hazardTableTd}><input type="text" name={`hazard${n}`} value={formData[`hazard${n}`]} onChange={handleChange} placeholder="Hazard" style={{...s.input,width:'100%'}}/></td><td style={s.hazardTableTd}><input type="text" name={`mitigation${n}`} value={formData[`mitigation${n}`]} onChange={handleChange} placeholder="Mitigation" style={{...s.input,width:'100%'}}/></td></tr>)}
          </tbody></table>
        </div></div>
        
        {/* AUTHORIZATION */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionBlue}}>✍️ Authorization</div><div style={s.sectionBody}>
          <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Work Group Leader <span style={s.required}>*</span></label><input type="text" name="workGroupLeader" value={formData.workGroupLeader} onChange={handleChange} required style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Competent Person Signature <span style={s.required}>*</span></label><input type="text" name="competentPersonSignature" value={formData.competentPersonSignature} onChange={handleChange} required placeholder="Type full name" style={s.input}/></div></div>
          <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Area Operator</label><input type="text" name="areaOperator" value={formData.areaOperator} onChange={handleChange} style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Responsible Supervisor <span style={s.required}>*</span></label><input type="text" name="responsibleSupervisor" value={formData.responsibleSupervisor} onChange={handleChange} required style={s.input}/></div></div>
          <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Start Date <span style={s.required}>*</span></label><input type="date" name="startDate" value={formData.startDate} onChange={handleChange} required style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Expiration Date <span style={s.required}>*</span></label><input type="date" name="expirationDate" value={formData.expirationDate} onChange={handleChange} required style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Crew Acknowledgment</label><select name="crewAcknowledgment" value={formData.crewAcknowledgment} onChange={handleChange} style={s.select}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option></select></div></div>
        </div></div>
        
        <button type="submit" disabled={isSubmitting} style={{...s.submitBtn,opacity:isSubmitting?0.5:1}}>{isSubmitting?'Issuing Permit...':'Issue Excavation Permit'}</button>
      </form>)}
      
      {/* CLOSE OUT TAB */}
      {activeTab==='closeout'&&<div>{closeoutSuccess?<div style={s.successMessage}><div style={{fontSize:'48px',marginBottom:'15px'}}>✅</div><h2 style={{margin:'0 0 10px'}}>Permit Closed Successfully!</h2><p>Excavation work has been completed and documented.</p><button onClick={resetCloseout} style={{...s.submitBtn,maxWidth:'250px',background:'white',color:'#059669',marginTop:'15px'}}>Close Another Permit</button></div>:<>
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionGreen}}>🔍 Select Permit to Close</div><div style={s.sectionBody}>
          {openPermits.length===0?<p style={{textAlign:'center',color:'#6b7280'}}>No open permits found.</p>:openPermits.map(p=><div key={p.permit_number} style={{...s.permitCard,...(selectedPermit===p.permit_number?s.permitCardSelected:{})}} onClick={()=>setSelectedPermit(p.permit_number)}><div style={{fontWeight:'700',color:'#1e3a8a',fontSize:'14px'}}>{p.permit_number}</div><div style={{fontSize:'13px',color:'#6b7280',marginTop:'4px'}}>{p.location} | {p.excavation_location_desc?.substring(0,40)}</div></div>)}
        </div></div>
        
        {selectedPermit&&<div style={s.section}><div style={{...s.sectionHeader,...s.sectionGreen}}>✅ Close Out Checklist</div><div style={s.sectionBody}>
          <div style={s.infoBox}><strong>Closing Permit:</strong> {selectedPermit}</div>
          {[{id:'jobCompleted',label:'Job Completed as Planned'},{id:'excavationBackfilled',label:'Excavation Backfilled & Compacted'},{id:'areaRestored',label:'Area Restored / Surface Repaired'},{id:'utilitiesVerified',label:'Utilities Verified Intact'}].map(v=><div key={v.id} style={{...s.verificationItem,...(closeoutData[v.id]?s.verificationItemChecked:{})}} onClick={()=>setCloseoutData(p=>({...p,[v.id]:!p[v.id]}))}><input type="checkbox" checked={closeoutData[v.id]} readOnly style={{marginRight:'10px',width:'18px',height:'18px',accentColor:'#059669'}}/><span style={{fontSize:'13px'}}>{v.label}</span></div>)}
          <div style={{...s.formRow,marginTop:'12px'}}><div style={s.formGroup}><label style={s.label}>Time Permit Closed <span style={s.required}>*</span></label><input type="time" value={closeoutData.timePermitClosed} onChange={e=>setCloseoutData(p=>({...p,timePermitClosed:e.target.value}))} required style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Close Out By (Worker) <span style={s.required}>*</span></label><input type="text" value={closeoutData.closeOutWorker} onChange={e=>setCloseoutData(p=>({...p,closeOutWorker:e.target.value}))} required style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Supervisor <span style={s.required}>*</span></label><input type="text" value={closeoutData.closeOutSupervisor} onChange={e=>setCloseoutData(p=>({...p,closeOutSupervisor:e.target.value}))} required style={s.input}/></div></div>
          <button type="button" onClick={submitCloseout} disabled={isSubmitting} style={{...s.submitBtn,...s.submitBtnGreen,opacity:isSubmitting?0.5:1}}>{isSubmitting?'Closing...':'Close Out Permit'}</button>
        </div></div>}
      </>}</div>}
    </div>
    
    <div style={{textAlign:'center',padding:'20px',background:'linear-gradient(to bottom, #f8fafc, #ffffff)',color:'#64748b',fontSize:'11px',borderTop:'1px solid #e2e8f0'}}><span style={{color:'#1e3a5f',fontWeight:'500'}}>AnthroSafe™ Powered by Field Driven Data™</span><span style={{color:'#94a3b8',margin:'0 8px'}}>|</span><span style={{color:'#475569'}}>© 2025 SLP Alaska</span></div>
  </div></div>);
}

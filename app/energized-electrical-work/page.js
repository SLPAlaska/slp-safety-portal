'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://iypezirwdlqpptjpeeyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
);

const COMPANIES = ['A-C Electric','AKE-Line','Apache Corp.','Armstrong Oil & Gas','ASRC Energy Services','CCI-Industrial','Chosen Construction','CINGSA','Coho Enterprises','Conam Construction','ConocoPhillips','Five Star Oilfield Services','Fox Energy Services','G.A. West','GBR Equipment','GLM Energy Services','Graham Industrial Coatings','Harvest Midstream','Hilcorp Alaska','MagTec Alaska','Merkes Builders','Nordic-Calista','Parker TRS','Peninsula Paving','Pollard Wireline','Ridgeline Oilfield Services','Santos','Summit Excavation','Tesoro Refinery','Yellowjacket','Other'];
const LOCATIONS = ['Kenai','CIO','Beaver Creek','Swanson River','Ninilchik','Nikiski','Other Kenai Asset','Deadhorse','Prudhoe Bay','Kuparuk','Alpine','Willow','ENI','PIKKA','Point Thompson','North Star Island','Endicott','Badami','Other North Slope'];
const NOMINAL_VOLTAGES = ['≤50V','51-240V','241-480V','481-600V','601-1000V','1001-4160V','4161-13800V','>13800V'];
const PPE_CATEGORIES = ['Category 1 (4 cal/cm²)','Category 2 (8 cal/cm²)','Category 3 (25 cal/cm²)','Category 4 (40 cal/cm²)'];
const HAZARD_RISK_CATEGORIES = ['Low (≤1.2 cal/cm²)','Medium (1.2-8 cal/cm²)','High (8-25 cal/cm²)','Extreme (25-40 cal/cm²)','Prohibited (>40 cal/cm²)'];
const VOLTAGE_RATED_GLOVES = ['N/A','Class 00 (500V AC)','Class 0 (1000V AC)','Class 1 (7500V AC)','Class 2 (17000V AC)','Class 3 (26500V AC)','Class 4 (36000V AC)'];
const ADDITIONAL_HAZARDS = [{id:'workingAtHeights',label:'Working at Heights'},{id:'confinedSpace',label:'Confined Space'},{id:'wetDampLocation',label:'Wet/Damp Location'},{id:'outdoorWeather',label:'Outdoor/Weather'}];

function generatePermitNumber(){const now=new Date();const d=now.getFullYear()+String(now.getMonth()+1).padStart(2,'0')+String(now.getDate()).padStart(2,'0');return 'EEW-'+d+'-'+String(Math.floor(Math.random()*10000)).padStart(4,'0');}

function calculateIndicators(data){
  let good=0,bad=0;const notes=[];
  if(data.qualifiedPerson==='Yes')good++;
  if(data.jobBriefing==='Yes'){good++;notes.push('Job Briefing Conducted');}
  if(data.testEquipmentVerified==='Yes')good++;
  if(data.barricadesSigns==='Yes'){good++;notes.push('Barricades/Signs in Place');}
  if(data.emergencyProcedures==='Yes')good++;
  if(data.safetyWatchAlerter==='Yes'){good++;notes.push('Safety Watch Assigned');}
  if(data.lotoAttempted==='Yes'){good++;notes.push('LOTO Attempted First');}
  if(data.approachBoundariesMarked==='Yes')good++;
  if(data.arcRatedClothing==='Yes')good++;
  if(data.voltageRatedGloves&&data.voltageRatedGloves!=='N/A'&&data.voltageRatedGloves!=='')good++;
  if(data.crewAcknowledgment==='Yes')good++;
  if(data.rescueEquipment==='Yes')good++;
  if(data.arcFlashAbove40==='Yes'){bad+=3;notes.push('CRITICAL: Arc Flash >40 cal/cm²');}
  if(data.qualifiedPerson!=='Yes'){bad+=2;notes.push('WARNING: No Qualified Person');}
  if(data.lotoAttempted!=='Yes'){bad++;notes.push('LOTO Not Attempted First');}
  if(data.jobBriefing!=='Yes'){bad++;notes.push('No Job Briefing');}
  if(!data.justification||data.justification===''){bad++;notes.push('No Justification');}
  if(data.additionalHazards?.wetDampLocation){bad++;notes.push('Wet/Damp Location');}
  if(data.safetyWatchAlerter!=='Yes'){bad++;notes.push('No Safety Watch');}
  return {good,bad,notes};
}

export default function EnergizedElectricalWork(){
  const [activeTab,setActiveTab]=useState('new');
  const [isSubmitting,setIsSubmitting]=useState(false);
  const [submitted,setSubmitted]=useState(false);
  const [submittedPermit,setSubmittedPermit]=useState(null);
  const [openPermits,setOpenPermits]=useState([]);
  const [selectedPermit,setSelectedPermit]=useState(null);
  const [closeoutSuccess,setCloseoutSuccess]=useState(false);
  
  const [formData,setFormData]=useState({
    permitInitiator:'',date:new Date().toISOString().split('T')[0],phoneRadio:'',company:'',location:'',equipmentId:'',nominalVoltage:'',workDescription:'',justification:'',
    shockHazardPresent:'',limitedApproach:'',restrictedApproach:'',prohibitedApproach:'',
    arcFlashLabel:'',arcFlashBoundary:'',incidentEnergy:'',ppeCategory:'',workingDistance:'',faultCurrent:'',clearingTime:'',hazardRiskCategory:'',arcFlashAbove40:'',
    arcRatedClothing:'',arcRatingMinimum:'',arcRatedFaceShield:'',arcFlashSuitHood:'',safetyGlasses:'',arcRatedHardHat:'',
    voltageRatedGloves:'',leatherProtectors:'',voltageRatedTools:'',insulatedMatting:'',hearingProtection:'',voltageRatedSleeves:'',
    qualifiedPerson:'',jobBriefing:'',testEquipmentVerified:'',barricadesSigns:'',emergencyProcedures:'',safetyWatchAlerter:'',singleLineDiagram:'',rescueEquipment:'',secondQualifiedPerson:'',
    correctCircuit:'',lotoAttempted:'',properTestEquipment:'',approachBoundariesMarked:'',nonConductiveLadders:'',conductiveItemsRemoved:'',illuminationAdequate:'',workingSpaceClear:'',
    additionalHazards:{},hazardTask1:'',hazard1:'',mitigation1:'',hazardTask2:'',hazard2:'',mitigation2:'',
    qualifiedPersonSignature:'',responsibleSupervisor:'',areaOperator:'',startTime:'',expirationTime:'',crewAcknowledgment:''
  });
  
  const [closeoutData,setCloseoutData]=useState({workCompleted:false,areaSecured:false,equipmentRestored:false,barricadesRemoved:false,timePermitClosed:'',closeOutWorker:'',closeOutSupervisor:''});

  useEffect(()=>{if(activeTab==='closeout')loadOpenPermits();},[activeTab]);

  const loadOpenPermits=async()=>{try{const{data}=await supabase.from('eew_permits').select('*').eq('permit_status','Open').order('created_at',{ascending:false});setOpenPermits(data||[]);}catch(e){console.error(e);}};

  const handleChange=(e)=>{const{name,value}=e.target;setFormData(p=>({...p,[name]:value}));};
  const handleHazardToggle=(id)=>{setFormData(p=>({...p,additionalHazards:{...p.additionalHazards,[id]:!p.additionalHazards[id]}}));};

  const handleSubmit=async(e)=>{e.preventDefault();setIsSubmitting(true);
    try{
      const permitNumber=generatePermitNumber();
      const indicators=calculateIndicators(formData);
      
      const{error}=await supabase.from('eew_permits').insert([{
        permit_number:permitNumber,permit_status:'Open',permit_initiator:formData.permitInitiator,date:formData.date,company:formData.company,location:formData.location,phone_radio:formData.phoneRadio,equipment_id:formData.equipmentId,nominal_voltage:formData.nominalVoltage,work_description:formData.workDescription,justification:formData.justification,
        shock_hazard_present:formData.shockHazardPresent,limited_approach:formData.limitedApproach,restricted_approach:formData.restrictedApproach,prohibited_approach:formData.prohibitedApproach,
        arc_flash_label:formData.arcFlashLabel,arc_flash_boundary:formData.arcFlashBoundary,incident_energy:formData.incidentEnergy,ppe_category:formData.ppeCategory,working_distance:formData.workingDistance,fault_current:formData.faultCurrent,clearing_time:formData.clearingTime,hazard_risk_category:formData.hazardRiskCategory,arc_flash_above_40:formData.arcFlashAbove40,
        arc_rated_clothing:formData.arcRatedClothing,arc_rating_minimum:formData.arcRatingMinimum,arc_rated_face_shield:formData.arcRatedFaceShield,arc_flash_suit_hood:formData.arcFlashSuitHood,safety_glasses:formData.safetyGlasses,arc_rated_hard_hat:formData.arcRatedHardHat,
        voltage_rated_gloves:formData.voltageRatedGloves,leather_protectors:formData.leatherProtectors,voltage_rated_tools:formData.voltageRatedTools,insulated_matting:formData.insulatedMatting,hearing_protection:formData.hearingProtection,voltage_rated_sleeves:formData.voltageRatedSleeves,
        qualified_person:formData.qualifiedPerson,job_briefing:formData.jobBriefing,test_equipment_verified:formData.testEquipmentVerified,barricades_signs:formData.barricadesSigns,emergency_procedures:formData.emergencyProcedures,safety_watch_alerter:formData.safetyWatchAlerter,single_line_diagram:formData.singleLineDiagram,rescue_equipment:formData.rescueEquipment,second_qualified_person:formData.secondQualifiedPerson,
        correct_circuit:formData.correctCircuit,loto_attempted:formData.lotoAttempted,proper_test_equipment:formData.properTestEquipment,approach_boundaries_marked:formData.approachBoundariesMarked,non_conductive_ladders:formData.nonConductiveLadders,conductive_items_removed:formData.conductiveItemsRemoved,illumination_adequate:formData.illuminationAdequate,working_space_clear:formData.workingSpaceClear,
        additional_hazards:formData.additionalHazards,hazard_task_1:formData.hazardTask1,hazard_1:formData.hazard1,mitigation_1:formData.mitigation1,hazard_task_2:formData.hazardTask2,hazard_2:formData.hazard2,mitigation_2:formData.mitigation2,
        qualified_person_signature:formData.qualifiedPersonSignature,responsible_supervisor:formData.responsibleSupervisor,area_operator:formData.areaOperator,start_time:formData.startTime||null,expiration_time:formData.expirationTime||null,crew_acknowledgment:formData.crewAcknowledgment,
        good_indicators:indicators.good,bad_indicators:indicators.bad,indicator_notes:indicators.notes.join('; ')
      }]);
      if(error)throw error;
      setSubmittedPermit(permitNumber);setSubmitted(true);
    }catch(e){console.error(e);alert('Error: '+e.message);}finally{setIsSubmitting(false);}
  };

  const submitCloseout=async()=>{if(!selectedPermit){alert('Select a permit');return;}if(!closeoutData.closeOutWorker||!closeoutData.closeOutSupervisor){alert('Fill required fields');return;}
    setIsSubmitting(true);try{
      const{error}=await supabase.from('eew_permits').update({permit_status:'Closed',work_completed:closeoutData.workCompleted?'Yes':'No',area_secured:closeoutData.areaSecured?'Yes':'No',equipment_restored:closeoutData.equipmentRestored?'Yes':'No',barricades_removed:closeoutData.barricadesRemoved?'Yes':'No',time_permit_closed:closeoutData.timePermitClosed||null,close_out_worker:closeoutData.closeOutWorker,close_out_supervisor:closeoutData.closeOutSupervisor,closed_at:new Date().toISOString()}).eq('permit_number',selectedPermit);
      if(error)throw error;setCloseoutSuccess(true);
    }catch(e){console.error(e);alert('Error: '+e.message);}finally{setIsSubmitting(false);}
  };

  const resetForm=()=>{setFormData({permitInitiator:'',date:new Date().toISOString().split('T')[0],phoneRadio:'',company:'',location:'',equipmentId:'',nominalVoltage:'',workDescription:'',justification:'',shockHazardPresent:'',limitedApproach:'',restrictedApproach:'',prohibitedApproach:'',arcFlashLabel:'',arcFlashBoundary:'',incidentEnergy:'',ppeCategory:'',workingDistance:'',faultCurrent:'',clearingTime:'',hazardRiskCategory:'',arcFlashAbove40:'',arcRatedClothing:'',arcRatingMinimum:'',arcRatedFaceShield:'',arcFlashSuitHood:'',safetyGlasses:'',arcRatedHardHat:'',voltageRatedGloves:'',leatherProtectors:'',voltageRatedTools:'',insulatedMatting:'',hearingProtection:'',voltageRatedSleeves:'',qualifiedPerson:'',jobBriefing:'',testEquipmentVerified:'',barricadesSigns:'',emergencyProcedures:'',safetyWatchAlerter:'',singleLineDiagram:'',rescueEquipment:'',secondQualifiedPerson:'',correctCircuit:'',lotoAttempted:'',properTestEquipment:'',approachBoundariesMarked:'',nonConductiveLadders:'',conductiveItemsRemoved:'',illuminationAdequate:'',workingSpaceClear:'',additionalHazards:{},hazardTask1:'',hazard1:'',mitigation1:'',hazardTask2:'',hazard2:'',mitigation2:'',qualifiedPersonSignature:'',responsibleSupervisor:'',areaOperator:'',startTime:'',expirationTime:'',crewAcknowledgment:''});setSubmitted(false);setSubmittedPermit(null);};
  const resetCloseout=()=>{setCloseoutData({workCompleted:false,areaSecured:false,equipmentRestored:false,barricadesRemoved:false,timePermitClosed:'',closeOutWorker:'',closeOutSupervisor:''});setSelectedPermit(null);setCloseoutSuccess(false);loadOpenPermits();};

  const s={container:{minHeight:'100vh',background:'linear-gradient(135deg, #1e3a8a 0%, #b91c1c 100%)',padding:'20px'},formContainer:{maxWidth:'1000px',margin:'0 auto',background:'white',borderRadius:'12px',boxShadow:'0 4px 6px rgba(0,0,0,0.1)',overflow:'hidden'},header:{background:'linear-gradient(135deg, #1e3a8a 0%, #b91c1c 100%)',color:'white',padding:'25px',textAlign:'center'},content:{padding:'25px'},tabs:{display:'flex',background:'#f1f5f9',padding:'8px',gap:'8px'},tab:{flex:1,padding:'12px',border:'none',borderRadius:'8px',fontWeight:'600',cursor:'pointer',fontSize:'14px',transition:'all 0.2s'},tabActive:{background:'#1e3a8a',color:'white'},tabInactive:{background:'white',color:'#475569'},section:{marginBottom:'15px',border:'1px solid #e5e7eb',borderRadius:'10px',overflow:'hidden'},sectionHeader:{color:'white',padding:'10px 15px',fontWeight:'600',fontSize:'14px'},sectionBlue:{background:'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)'},sectionYellow:{background:'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)'},sectionOrange:{background:'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'},sectionGreen:{background:'linear-gradient(135deg, #059669 0%, #047857 100%)'},sectionPurple:{background:'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)'},sectionCyan:{background:'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)'},sectionAmber:{background:'linear-gradient(135deg, #d97706 0%, #b45309 100%)'},sectionRed:{background:'linear-gradient(135deg, #b91c1c 0%, #991b1b 100%)'},sectionBody:{padding:'12px',background:'#f8fafc'},formRow:{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))',gap:'12px',marginBottom:'12px'},formGroup:{display:'flex',flexDirection:'column'},label:{fontWeight:'600',color:'#374151',marginBottom:'4px',fontSize:'13px'},required:{color:'#b91c1c'},input:{padding:'8px 10px',border:'2px solid #d1d5db',borderRadius:'6px',fontSize:'14px'},select:{padding:'8px 10px',border:'2px solid #d1d5db',borderRadius:'6px',fontSize:'14px',background:'white'},textarea:{padding:'8px 10px',border:'2px solid #d1d5db',borderRadius:'6px',fontSize:'14px',minHeight:'60px',resize:'vertical'},infoBox:{background:'#eff6ff',borderLeft:'4px solid #1e3a8a',padding:'10px',marginBottom:'12px',fontSize:'13px',borderRadius:'0 6px 6px 0'},warningBox:{background:'#fef3c7',borderLeft:'4px solid #d97706',padding:'10px',marginBottom:'12px',fontSize:'13px',borderRadius:'0 6px 6px 0'},dangerBox:{background:'#fee2e2',borderLeft:'4px solid #b91c1c',padding:'10px',marginBottom:'12px',fontSize:'13px',borderRadius:'0 6px 6px 0'},boundaryGrid:{display:'grid',gridTemplateColumns:'2fr 1fr',gap:'8px',alignItems:'center',background:'white',padding:'8px',borderRadius:'6px',marginBottom:'8px'},boundaryLabel:{fontWeight:'600',fontSize:'13px'},ppeGrid:{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))',gap:'8px'},ppeItem:{background:'white',padding:'8px 12px',borderRadius:'6px',border:'1px solid #e5e7eb',display:'flex',justifyContent:'space-between',alignItems:'center'},ppeLabel:{fontSize:'13px'},ppeSelect:{width:'80px',padding:'4px 6px',fontSize:'12px'},mitigationItem:{display:'flex',justifyContent:'space-between',alignItems:'center',background:'white',padding:'8px 12px',borderRadius:'6px',border:'1px solid #e5e7eb',marginBottom:'6px'},mitigationLabel:{fontSize:'13px'},mitigationSelect:{width:'120px',padding:'5px 8px',fontSize:'13px'},hazardGrid:{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(150px, 1fr))',gap:'8px'},hazardItem:{display:'flex',alignItems:'center',background:'white',padding:'8px 10px',borderRadius:'6px',border:'1px solid #e5e7eb',cursor:'pointer',fontSize:'13px'},hazardItemChecked:{background:'#fef2f2',borderColor:'#b91c1c'},hazardTable:{width:'100%',borderCollapse:'collapse',background:'white',borderRadius:'6px',overflow:'hidden'},hazardTableTh:{background:'#f1f5f9',padding:'8px',textAlign:'left',fontSize:'13px',fontWeight:'600'},hazardTableTd:{padding:'8px',borderTop:'1px solid #e5e7eb'},verificationItem:{display:'flex',alignItems:'center',background:'white',padding:'10px',borderRadius:'6px',marginBottom:'6px',cursor:'pointer',border:'1px solid #e5e7eb'},verificationItemChecked:{background:'#dcfce7',borderLeft:'3px solid #059669'},submitBtn:{width:'100%',padding:'14px',background:'linear-gradient(135deg, #1e3a8a 0%, #b91c1c 100%)',color:'white',border:'none',borderRadius:'10px',fontSize:'16px',fontWeight:'600',cursor:'pointer',marginTop:'15px'},submitBtnGreen:{background:'linear-gradient(135deg, #059669 0%, #047857 100%)'},successMessage:{background:'linear-gradient(135deg, #059669 0%, #047857 100%)',color:'white',padding:'30px',borderRadius:'12px',textAlign:'center',margin:'20px 0'},permitCard:{background:'white',border:'2px solid #e5e7eb',borderRadius:'8px',padding:'12px',marginBottom:'10px',cursor:'pointer',transition:'all 0.2s'},permitCardSelected:{borderColor:'#059669',background:'#f0fdf4'}};

  if(submitted&&submittedPermit){return(<div style={s.container}><div style={{maxWidth:'600px',margin:'0 auto',paddingTop:'50px'}}><div style={s.successMessage}><div style={{fontSize:'48px',marginBottom:'15px'}}>✅</div><h2 style={{margin:'0 0 10px'}}>Permit Issued Successfully!</h2><div style={{background:'rgba(255,255,255,0.2)',padding:'12px',borderRadius:'8px',fontSize:'20px',fontWeight:'bold',margin:'15px 0'}}>{submittedPermit}</div><p>The permit is now OPEN. Remember to close out when work is complete.</p><div style={{display:'flex',gap:'10px',justifyContent:'center',marginTop:'20px',flexWrap:'wrap'}}><button onClick={resetForm} style={{...s.submitBtn,maxWidth:'200px',background:'white',color:'#059669'}}>Issue Another</button><a href="/" style={{...s.submitBtn,maxWidth:'200px',background:'#6b7280',textDecoration:'none',textAlign:'center'}}>Back to Portal</a></div></div></div></div>);}

  return(<div style={s.container}><div style={s.formContainer}>
    <div style={s.header}><a href="/" style={{color:'white',textDecoration:'none',fontSize:'14px'}}>← Back to Portal</a><div style={{background:'rgba(255,255,255,0.95)',borderRadius:'12px',padding:'15px',width:'fit-content',margin:'15px auto',boxShadow:'0 4px 15px rgba(0,0,0,0.2)'}}><img src="/Logo.png" alt="SLP Alaska" style={{maxWidth:'180px',height:'auto'}}/></div><div style={{display:'inline-block',background:'white',color:'#991b1b',padding:'5px 14px',borderRadius:'20px',fontWeight:'700',fontSize:'12px',marginBottom:'12px',border:'3px solid #eab308'}}>⚡ NFPA 70E Compliant</div><h1 style={{margin:'0 0 5px',fontSize:'20px'}}>Energized Electrical Work Permit</h1><p style={{opacity:0.9,fontSize:'13px'}}>SLP Alaska Safety Management System</p></div>
    
    <div style={s.tabs}><button style={{...s.tab,...(activeTab==='new'?s.tabActive:s.tabInactive)}} onClick={()=>setActiveTab('new')}>📝 New Permit</button><button style={{...s.tab,...(activeTab==='closeout'?s.tabActive:s.tabInactive)}} onClick={()=>setActiveTab('closeout')}>✅ Close Out Permit</button></div>
    
    <div style={s.content}>
      {activeTab==='new'&&(<form onSubmit={handleSubmit}>
        {/* PERMIT INFO */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionBlue}}>📋 Permit Information</div><div style={s.sectionBody}>
          <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Permit Initiator <span style={s.required}>*</span></label><input type="text" name="permitInitiator" value={formData.permitInitiator} onChange={handleChange} required style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Date <span style={s.required}>*</span></label><input type="date" name="date" value={formData.date} onChange={handleChange} required style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Phone/Radio</label><input type="text" name="phoneRadio" value={formData.phoneRadio} onChange={handleChange} style={s.input}/></div></div>
          <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Client/Company <span style={s.required}>*</span></label><select name="company" value={formData.company} onChange={handleChange} required style={s.select}><option value="">Select...</option>{COMPANIES.map(c=><option key={c} value={c}>{c}</option>)}</select></div><div style={s.formGroup}><label style={s.label}>Location <span style={s.required}>*</span></label><select name="location" value={formData.location} onChange={handleChange} required style={s.select}><option value="">Select...</option>{LOCATIONS.map(l=><option key={l} value={l}>{l}</option>)}</select></div></div>
          <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Equipment/Circuit ID <span style={s.required}>*</span></label><input type="text" name="equipmentId" value={formData.equipmentId} onChange={handleChange} required placeholder="e.g., MCC-101, Panel A" style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Nominal Voltage <span style={s.required}>*</span></label><select name="nominalVoltage" value={formData.nominalVoltage} onChange={handleChange} required style={s.select}><option value="">Select...</option>{NOMINAL_VOLTAGES.map(v=><option key={v} value={v}>{v}</option>)}</select></div></div>
          <div style={s.formGroup}><label style={s.label}>Work Description <span style={s.required}>*</span></label><textarea name="workDescription" value={formData.workDescription} onChange={handleChange} required placeholder="Describe the energized work..." style={s.textarea}/></div>
          <div style={s.formGroup}><label style={s.label}>Justification for Energized Work <span style={s.required}>*</span></label><textarea name="justification" value={formData.justification} onChange={handleChange} required placeholder="Explain why de-energization is not feasible..." style={s.textarea}/></div>
        </div></div>
        
        {/* SHOCK HAZARD */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionYellow,color:'#000'}}>⚡ Shock Hazard Analysis</div><div style={s.sectionBody}>
          <div style={s.infoBox}>Approach boundaries based on NFPA 70E Table 130.4(D)(a) - vary by voltage level.</div>
          <div style={{...s.formRow,marginBottom:'12px'}}><div style={s.formGroup}><label style={s.label}>Shock Hazard Present?</label><select name="shockHazardPresent" value={formData.shockHazardPresent} onChange={handleChange} style={s.select}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option></select></div></div>
          <div style={s.boundaryGrid}><span style={s.boundaryLabel}>Limited Approach Boundary (ft)</span><input type="text" name="limitedApproach" value={formData.limitedApproach} onChange={handleChange} placeholder="e.g., 3.5 ft" style={s.input}/></div>
          <div style={s.boundaryGrid}><span style={s.boundaryLabel}>Restricted Approach Boundary (ft)</span><input type="text" name="restrictedApproach" value={formData.restrictedApproach} onChange={handleChange} placeholder="e.g., 1.0 ft" style={s.input}/></div>
          <div style={s.boundaryGrid}><span style={s.boundaryLabel}>Prohibited Approach Boundary (in)</span><input type="text" name="prohibitedApproach" value={formData.prohibitedApproach} onChange={handleChange} placeholder="e.g., 1 in" style={s.input}/></div>
        </div></div>
        
        {/* ARC FLASH */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionOrange}}>🔥 Arc Flash Hazard Analysis</div><div style={s.sectionBody}>
          <div style={s.dangerBox}><strong>⚠️ WARNING:</strong> Arc flash incident energy &gt;40 cal/cm² is PROHIBITED - work must not proceed until energy is reduced.</div>
          <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Arc Flash Label Present?</label><select name="arcFlashLabel" value={formData.arcFlashLabel} onChange={handleChange} style={s.select}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option></select></div><div style={s.formGroup}><label style={s.label}>Arc Flash Boundary (ft)</label><input type="text" name="arcFlashBoundary" value={formData.arcFlashBoundary} onChange={handleChange} placeholder="e.g., 4 ft" style={s.input}/></div></div>
          <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Incident Energy (cal/cm²) <span style={s.required}>*</span></label><input type="text" name="incidentEnergy" value={formData.incidentEnergy} onChange={handleChange} required placeholder="e.g., 8.5" style={s.input}/></div><div style={s.formGroup}><label style={s.label}>PPE Category <span style={s.required}>*</span></label><select name="ppeCategory" value={formData.ppeCategory} onChange={handleChange} required style={s.select}><option value="">Select...</option>{PPE_CATEGORIES.map(p=><option key={p} value={p}>{p}</option>)}</select></div></div>
          <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Working Distance (in)</label><input type="text" name="workingDistance" value={formData.workingDistance} onChange={handleChange} placeholder="e.g., 18" style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Fault Current (kA)</label><input type="text" name="faultCurrent" value={formData.faultCurrent} onChange={handleChange} placeholder="e.g., 25" style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Clearing Time (cycles)</label><input type="text" name="clearingTime" value={formData.clearingTime} onChange={handleChange} placeholder="e.g., 6" style={s.input}/></div></div>
          <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Hazard Risk Category</label><select name="hazardRiskCategory" value={formData.hazardRiskCategory} onChange={handleChange} style={s.select}><option value="">Select...</option>{HAZARD_RISK_CATEGORIES.map(h=><option key={h} value={h}>{h}</option>)}</select></div><div style={s.formGroup}><label style={s.label}>Arc Flash &gt;40 cal/cm²?</label><select name="arcFlashAbove40" value={formData.arcFlashAbove40} onChange={handleChange} style={s.select}><option value="">Select...</option><option value="No">No</option><option value="Yes">Yes - STOP WORK</option></select></div></div>
        </div></div>
        
        {/* PPE */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionGreen}}>🛡️ PPE Requirements</div><div style={s.sectionBody}>
          <p style={{fontSize:'13px',fontWeight:'600',marginBottom:'8px'}}>Arc Flash PPE</p>
          <div style={s.ppeGrid}>
            <div style={s.ppeItem}><span style={s.ppeLabel}>Arc-Rated Clothing</span><select name="arcRatedClothing" value={formData.arcRatedClothing} onChange={handleChange} style={s.ppeSelect}><option value="">--</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
            <div style={s.ppeItem}><span style={s.ppeLabel}>Arc Rating Min (cal/cm²)</span><input type="text" name="arcRatingMinimum" value={formData.arcRatingMinimum} onChange={handleChange} placeholder="e.g., 8" style={{...s.ppeSelect,width:'60px'}}/></div>
            <div style={s.ppeItem}><span style={s.ppeLabel}>Arc-Rated Face Shield</span><select name="arcRatedFaceShield" value={formData.arcRatedFaceShield} onChange={handleChange} style={s.ppeSelect}><option value="">--</option><option value="Yes">Yes</option><option value="No">No</option><option value="N/A">N/A</option></select></div>
            <div style={s.ppeItem}><span style={s.ppeLabel}>Arc Flash Suit Hood</span><select name="arcFlashSuitHood" value={formData.arcFlashSuitHood} onChange={handleChange} style={s.ppeSelect}><option value="">--</option><option value="Yes">Yes</option><option value="No">No</option><option value="N/A">N/A</option></select></div>
            <div style={s.ppeItem}><span style={s.ppeLabel}>Safety Glasses</span><select name="safetyGlasses" value={formData.safetyGlasses} onChange={handleChange} style={s.ppeSelect}><option value="">--</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
            <div style={s.ppeItem}><span style={s.ppeLabel}>Arc-Rated Hard Hat</span><select name="arcRatedHardHat" value={formData.arcRatedHardHat} onChange={handleChange} style={s.ppeSelect}><option value="">--</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
          </div>
          <p style={{fontSize:'13px',fontWeight:'600',margin:'12px 0 8px'}}>Shock Protection PPE</p>
          <div style={s.ppeGrid}>
            <div style={s.ppeItem}><span style={s.ppeLabel}>Voltage-Rated Gloves</span><select name="voltageRatedGloves" value={formData.voltageRatedGloves} onChange={handleChange} style={{...s.ppeSelect,width:'140px'}}><option value="">Select...</option>{VOLTAGE_RATED_GLOVES.map(g=><option key={g} value={g}>{g}</option>)}</select></div>
            <div style={s.ppeItem}><span style={s.ppeLabel}>Leather Protectors</span><select name="leatherProtectors" value={formData.leatherProtectors} onChange={handleChange} style={s.ppeSelect}><option value="">--</option><option value="Yes">Yes</option><option value="No">No</option><option value="N/A">N/A</option></select></div>
            <div style={s.ppeItem}><span style={s.ppeLabel}>Voltage-Rated Tools</span><select name="voltageRatedTools" value={formData.voltageRatedTools} onChange={handleChange} style={s.ppeSelect}><option value="">--</option><option value="Yes">Yes</option><option value="No">No</option><option value="N/A">N/A</option></select></div>
            <div style={s.ppeItem}><span style={s.ppeLabel}>Insulated Matting</span><select name="insulatedMatting" value={formData.insulatedMatting} onChange={handleChange} style={s.ppeSelect}><option value="">--</option><option value="Yes">Yes</option><option value="No">No</option><option value="N/A">N/A</option></select></div>
            <div style={s.ppeItem}><span style={s.ppeLabel}>Hearing Protection</span><select name="hearingProtection" value={formData.hearingProtection} onChange={handleChange} style={s.ppeSelect}><option value="">--</option><option value="Yes">Yes</option><option value="No">No</option><option value="N/A">N/A</option></select></div>
            <div style={s.ppeItem}><span style={s.ppeLabel}>Voltage-Rated Sleeves</span><select name="voltageRatedSleeves" value={formData.voltageRatedSleeves} onChange={handleChange} style={s.ppeSelect}><option value="">--</option><option value="Yes">Yes</option><option value="No">No</option><option value="N/A">N/A</option></select></div>
          </div>
        </div></div>
        
        {/* SAFE WORK PRACTICES */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionPurple}}>📋 Safe Work Practices</div><div style={s.sectionBody}>
          <div style={s.mitigationItem}><span style={s.mitigationLabel}>Qualified Person Assigned?</span><select name="qualifiedPerson" value={formData.qualifiedPerson} onChange={handleChange} style={s.mitigationSelect}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
          <div style={s.mitigationItem}><span style={s.mitigationLabel}>Job Briefing Conducted?</span><select name="jobBriefing" value={formData.jobBriefing} onChange={handleChange} style={s.mitigationSelect}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
          <div style={s.mitigationItem}><span style={s.mitigationLabel}>Test Equipment Verified?</span><select name="testEquipmentVerified" value={formData.testEquipmentVerified} onChange={handleChange} style={s.mitigationSelect}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
          <div style={s.mitigationItem}><span style={s.mitigationLabel}>Barricades/Signs in Place?</span><select name="barricadesSigns" value={formData.barricadesSigns} onChange={handleChange} style={s.mitigationSelect}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
          <div style={s.mitigationItem}><span style={s.mitigationLabel}>Emergency Procedures Reviewed?</span><select name="emergencyProcedures" value={formData.emergencyProcedures} onChange={handleChange} style={s.mitigationSelect}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
          <div style={s.mitigationItem}><span style={s.mitigationLabel}>Safety Watch/Alerter Assigned?</span><select name="safetyWatchAlerter" value={formData.safetyWatchAlerter} onChange={handleChange} style={s.mitigationSelect}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
          <div style={s.mitigationItem}><span style={s.mitigationLabel}>Single-Line Diagram Reviewed?</span><select name="singleLineDiagram" value={formData.singleLineDiagram} onChange={handleChange} style={s.mitigationSelect}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option><option value="N/A">N/A</option></select></div>
          <div style={s.mitigationItem}><span style={s.mitigationLabel}>Rescue Equipment Available?</span><select name="rescueEquipment" value={formData.rescueEquipment} onChange={handleChange} style={s.mitigationSelect}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
          <div style={s.mitigationItem}><span style={s.mitigationLabel}>Second Qualified Person Present?</span><select name="secondQualifiedPerson" value={formData.secondQualifiedPerson} onChange={handleChange} style={s.mitigationSelect}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
        </div></div>
        
        {/* VERIFICATION */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionCyan}}>✓ Verification Checks</div><div style={s.sectionBody}>
          <div style={s.mitigationItem}><span style={s.mitigationLabel}>Correct Circuit Identified?</span><select name="correctCircuit" value={formData.correctCircuit} onChange={handleChange} style={s.mitigationSelect}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
          <div style={s.mitigationItem}><span style={s.mitigationLabel}>LOTO Attempted First?</span><select name="lotoAttempted" value={formData.lotoAttempted} onChange={handleChange} style={s.mitigationSelect}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
          <div style={s.mitigationItem}><span style={s.mitigationLabel}>Proper Test Equipment Available?</span><select name="properTestEquipment" value={formData.properTestEquipment} onChange={handleChange} style={s.mitigationSelect}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
          <div style={s.mitigationItem}><span style={s.mitigationLabel}>Approach Boundaries Marked?</span><select name="approachBoundariesMarked" value={formData.approachBoundariesMarked} onChange={handleChange} style={s.mitigationSelect}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
          <div style={s.mitigationItem}><span style={s.mitigationLabel}>Non-Conductive Ladders Only?</span><select name="nonConductiveLadders" value={formData.nonConductiveLadders} onChange={handleChange} style={s.mitigationSelect}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option><option value="N/A">N/A</option></select></div>
          <div style={s.mitigationItem}><span style={s.mitigationLabel}>Conductive Items Removed?</span><select name="conductiveItemsRemoved" value={formData.conductiveItemsRemoved} onChange={handleChange} style={s.mitigationSelect}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
          <div style={s.mitigationItem}><span style={s.mitigationLabel}>Illumination Adequate?</span><select name="illuminationAdequate" value={formData.illuminationAdequate} onChange={handleChange} style={s.mitigationSelect}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
          <div style={s.mitigationItem}><span style={s.mitigationLabel}>Working Space Clear?</span><select name="workingSpaceClear" value={formData.workingSpaceClear} onChange={handleChange} style={s.mitigationSelect}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
        </div></div>
        
        {/* ADDITIONAL HAZARDS */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionRed}}>⚠️ Additional Hazard Categories</div><div style={s.sectionBody}>
          <p style={{fontSize:'13px',marginBottom:'10px',color:'#6b7280'}}>Check all that apply - additional permits may be required:</p>
          <div style={s.hazardGrid}>{ADDITIONAL_HAZARDS.map(h=><div key={h.id} style={{...s.hazardItem,...(formData.additionalHazards[h.id]?s.hazardItemChecked:{})}} onClick={()=>handleHazardToggle(h.id)}><input type="checkbox" checked={formData.additionalHazards[h.id]||false} readOnly style={{marginRight:'8px',accentColor:'#b91c1c'}}/><span>{h.label}</span></div>)}</div>
        </div></div>
        
        {/* HAZARD MITIGATION TABLE */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionAmber}}>📝 Hazard Mitigation Table</div><div style={s.sectionBody}>
          <table style={s.hazardTable}><thead><tr><th style={s.hazardTableTh}>Task</th><th style={s.hazardTableTh}>Hazard</th><th style={s.hazardTableTh}>Mitigation</th></tr></thead><tbody>
            <tr><td style={s.hazardTableTd}><input type="text" name="hazardTask1" value={formData.hazardTask1} onChange={handleChange} placeholder="Task description" style={{...s.input,width:'100%'}}/></td><td style={s.hazardTableTd}><input type="text" name="hazard1" value={formData.hazard1} onChange={handleChange} placeholder="Hazard identified" style={{...s.input,width:'100%'}}/></td><td style={s.hazardTableTd}><input type="text" name="mitigation1" value={formData.mitigation1} onChange={handleChange} placeholder="Mitigation measure" style={{...s.input,width:'100%'}}/></td></tr>
            <tr><td style={s.hazardTableTd}><input type="text" name="hazardTask2" value={formData.hazardTask2} onChange={handleChange} placeholder="Task description" style={{...s.input,width:'100%'}}/></td><td style={s.hazardTableTd}><input type="text" name="hazard2" value={formData.hazard2} onChange={handleChange} placeholder="Hazard identified" style={{...s.input,width:'100%'}}/></td><td style={s.hazardTableTd}><input type="text" name="mitigation2" value={formData.mitigation2} onChange={handleChange} placeholder="Mitigation measure" style={{...s.input,width:'100%'}}/></td></tr>
          </tbody></table>
        </div></div>
        
        {/* AUTHORIZATION */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionBlue}}>✍️ Authorization</div><div style={s.sectionBody}>
          <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Qualified Person Signature <span style={s.required}>*</span></label><input type="text" name="qualifiedPersonSignature" value={formData.qualifiedPersonSignature} onChange={handleChange} required placeholder="Type full name" style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Responsible Supervisor <span style={s.required}>*</span></label><input type="text" name="responsibleSupervisor" value={formData.responsibleSupervisor} onChange={handleChange} required placeholder="Type full name" style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Area Operator</label><input type="text" name="areaOperator" value={formData.areaOperator} onChange={handleChange} placeholder="Type full name" style={s.input}/></div></div>
          <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Permit Start Time <span style={s.required}>*</span></label><input type="time" name="startTime" value={formData.startTime} onChange={handleChange} required style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Permit Expiration Time <span style={s.required}>*</span></label><input type="time" name="expirationTime" value={formData.expirationTime} onChange={handleChange} required style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Crew Acknowledges Stop Work?</label><select name="crewAcknowledgment" value={formData.crewAcknowledgment} onChange={handleChange} style={s.select}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option></select></div></div>
        </div></div>
        
        <button type="submit" disabled={isSubmitting} style={{...s.submitBtn,opacity:isSubmitting?0.5:1}}>{isSubmitting?'Issuing Permit...':'Issue Energized Electrical Work Permit'}</button>
      </form>)}
      
      {/* CLOSE OUT TAB */}
      {activeTab==='closeout'&&<div>{closeoutSuccess?<div style={s.successMessage}><div style={{fontSize:'48px',marginBottom:'15px'}}>✅</div><h2 style={{margin:'0 0 10px'}}>Permit Closed Successfully!</h2><p>The permit has been closed out and recorded.</p><button onClick={resetCloseout} style={{...s.submitBtn,maxWidth:'250px',background:'white',color:'#059669',marginTop:'15px'}}>Close Another Permit</button></div>:<>
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionGreen}}>🔍 Select Permit to Close</div><div style={s.sectionBody}>
          {openPermits.length===0?<p style={{textAlign:'center',color:'#6b7280'}}>No open permits found.</p>:openPermits.map(p=><div key={p.permit_number} style={{...s.permitCard,...(selectedPermit===p.permit_number?s.permitCardSelected:{})}} onClick={()=>setSelectedPermit(p.permit_number)}><div style={{fontWeight:'700',color:'#1e3a8a',fontSize:'14px'}}>{p.permit_number}</div><div style={{fontSize:'13px',color:'#6b7280',marginTop:'4px'}}>{p.location} | {p.equipment_id} | {p.nominal_voltage}</div></div>)}
        </div></div>
        
        {selectedPermit&&<div style={s.section}><div style={{...s.sectionHeader,...s.sectionGreen}}>✅ Close Out Checklist</div><div style={s.sectionBody}>
          <div style={s.infoBox}><strong>Closing Permit:</strong> {selectedPermit}</div>
          {[{id:'workCompleted',label:'Work Completed as Described'},{id:'areaSecured',label:'Area Secured and Safe'},{id:'equipmentRestored',label:'Equipment Restored to Normal'},{id:'barricadesRemoved',label:'Barricades/Signs Removed'}].map(v=><div key={v.id} style={{...s.verificationItem,...(closeoutData[v.id]?s.verificationItemChecked:{})}} onClick={()=>setCloseoutData(p=>({...p,[v.id]:!p[v.id]}))}><input type="checkbox" checked={closeoutData[v.id]} readOnly style={{marginRight:'10px',width:'18px',height:'18px',accentColor:'#059669'}}/><span style={{fontSize:'13px'}}>{v.label}</span></div>)}
          <div style={{...s.formRow,marginTop:'12px'}}><div style={s.formGroup}><label style={s.label}>Time Permit Closed <span style={s.required}>*</span></label><input type="time" value={closeoutData.timePermitClosed} onChange={e=>setCloseoutData(p=>({...p,timePermitClosed:e.target.value}))} required style={s.input}/></div></div>
          <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Qualified Worker <span style={s.required}>*</span></label><input type="text" value={closeoutData.closeOutWorker} onChange={e=>setCloseoutData(p=>({...p,closeOutWorker:e.target.value}))} required placeholder="Type full name" style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Supervisor <span style={s.required}>*</span></label><input type="text" value={closeoutData.closeOutSupervisor} onChange={e=>setCloseoutData(p=>({...p,closeOutSupervisor:e.target.value}))} required placeholder="Type full name" style={s.input}/></div></div>
          <button type="button" onClick={submitCloseout} disabled={isSubmitting} style={{...s.submitBtn,...s.submitBtnGreen,opacity:isSubmitting?0.5:1}}>{isSubmitting?'Closing...':'Close Out Permit'}</button>
        </div></div>}
      </>}</div>}
    </div>
    
    <div style={{textAlign:'center',padding:'20px',background:'linear-gradient(to bottom, #f8fafc, #ffffff)',color:'#64748b',fontSize:'11px',borderTop:'1px solid #e2e8f0'}}><span style={{color:'#1e3a5f',fontWeight:'500'}}>AnthroSafe™ Powered by Field Driven Data™</span><span style={{color:'#94a3b8',margin:'0 8px'}}>|</span><span style={{color:'#475569'}}>© 2025 SLP Alaska</span></div>
  </div></div>);
}

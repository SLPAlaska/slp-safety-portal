'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://iypezirwdlqpptjpeeyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
);

const COMPANIES = ['A-C Electric','AKE-Line','Apache Corp.','Armstrong Oil & Gas','ASRC Energy Services','CCI-Industrial','Chosen Construction','CINGSA','Coho Enterprises','Conam Construction','ConocoPhillips','Five Star Oilfield Services','Fox Energy Services','G.A. West','GBR Equipment','GLM Energy Services','Graham Industrial Coatings','Harvest Midstream','Hilcorp Alaska','MagTec Alaska','Merkes Builders','Nordic-Calista','Parker TRS','Peninsula Paving','Pollard Wireline','Ridgeline Oilfield Services','Santos','Summit Excavation','Tesoro Refinery','Yellowjacket','Other'];
const LOCATIONS = ['Kenai','CIO','Beaver Creek','Swanson River','Ninilchik','Nikiski','Other Kenai Asset','Deadhorse','Prudhoe Bay','Kuparuk','Alpine','Willow','ENI','PIKKA','Point Thompson','North Star Island','Endicott','Badami','Other North Slope'];

const WORK_ENVIRONMENTS = [
  {value:'aerial_lift',label:'Aerial Lift / Manlift / Scissor Lift',icon:'🏗️'},
  {value:'unprotected_edge',label:'Unprotected Edge / Leading Edge',icon:'⚠️'},
  {value:'roof_work',label:'Roof Work',icon:'🏠'},
  {value:'scaffolding',label:'Scaffolding',icon:'🪜'},
  {value:'ladder',label:'Fixed Ladder / Ladder Climbing',icon:'🪜'},
  {value:'steel_erection',label:'Steel Erection',icon:'🏗️'},
  {value:'tower_climbing',label:'Tower / Structure Climbing',icon:'📡'},
  {value:'confined_space',label:'Confined Space Entry with Fall Hazard',icon:'🕳️'},
  {value:'excavation',label:'Excavation Edge',icon:'🚧'},
  {value:'other',label:'Other Work at Height',icon:'📋'}
];

const AERIAL_LIFT_TYPES = ['Boom Lift (Articulating)','Boom Lift (Telescopic)','Scissor Lift','Vertical Mast Lift','Personnel Basket on Crane','Other'];

export default function FallProtectionPlan(){
  const [isSubmitting,setIsSubmitting]=useState(false);
  const [submitted,setSubmitted]=useState(false);
  const [planNumber,setPlanNumber]=useState('');
  const [recommendation,setRecommendation]=useState(null);
  const [warnings,setWarnings]=useState([]);
  const [formData,setFormData]=useState({
    datesOfWork:'',company:'',location:'',specificLocation:'',workTasks:'',
    workEnvironment:'',aerialLiftType:'',roofType:'',
    heightAboveLower:'',landingHazardPresent:'',landingHazardDesc:'',fallHazardTypes:[],fallHazardDetails:'',
    anchorPointLocation:'',anchorHorizontalOffset:'',anchorAboveDrings:'',
    userSelectedSystem:'',
    anchorageType:'',anchorageStrength:'',anchorageLocation:'',bodySupportType:'',positioningDRings:'',
    freeFallDistance:'6',decelerationDistance:'3.5',workerHeight:'6',safetyBuffer:'3',availableClearance:'',
    controlledAccessZone:'',warningLineSystem:'',safetyMonitorName:'',
    emergencyResponsePlan:'',emergencyPhone:'',emergencyEquipmentDetails:'',
    harnessQty:'0',lanyardQty:'0',srlQty:'0',positioningLanyardQty:'0',restraintLanyardQty:'0',anchorageConnectorQty:'0',connectingDevicesQty:'0',otherEquipment:'',
    workersProtected:'',additionalWorkers:'',
    competentPersonName:'',competentPersonSignature:'',qualifiedPersonRequired:'',qualifiedPersonName:'',qualifiedPersonSignature:'',
    equipmentInspected:false,personnelTrained:false,approvedByCompetent:false,designedByQualified:false
  });

  const handleChange=(e)=>{const{name,value,type,checked}=e.target;setFormData(p=>({...p,[name]:type==='checkbox'?checked:value}));};
  const handleHazardType=(hazard)=>{setFormData(p=>({...p,fallHazardTypes:p.fallHazardTypes.includes(hazard)?p.fallHazardTypes.filter(h=>h!==hazard):[...p.fallHazardTypes,hazard]}));};

  // Calculate recommendation whenever relevant fields change
  useEffect(()=>{
    calculateRecommendation();
  },[formData.workEnvironment,formData.aerialLiftType,formData.anchorHorizontalOffset,formData.anchorAboveDrings,formData.heightAboveLower,formData.userSelectedSystem]);

  const calculateRecommendation=()=>{
    const w=[];
    let rec={system:'',equipment:[],explanation:'',priority:'info'};
    const env=formData.workEnvironment;
    const height=parseFloat(formData.heightAboveLower)||0;
    const horizOffset=parseFloat(formData.anchorHorizontalOffset)||0;
    const selected=formData.userSelectedSystem;

    // AERIAL LIFT / MANLIFT - ALWAYS positioning/restraint
    if(env==='aerial_lift'){
      rec={
        system:'positioning_restraint',
        equipment:['Full Body Harness','Positioning Lanyard (3-6 ft adjustable)','OR Restraint Lanyard'],
        explanation:'In aerial lifts, the goal is to KEEP THE WORKER INSIDE THE BASKET. A positioning device or restraint lanyard prevents the worker from being ejected if the lift tips, jolts, or is struck.',
        priority:'critical'
      };
      w.push({type:'critical',title:'⛔ NEVER Use Shock-Absorbing Lanyard in Aerial Lift',message:'A 6-foot shock-absorbing lanyard allows the worker to climb over the guardrails. If the lift tips, the worker will fall OUTSIDE the basket and swing underneath it. The deceleration device provides no benefit - the goal is to STAY IN THE BASKET.'});
      w.push({type:'warning',title:'Attachment Point',message:'Always attach to the designated anchor point INSIDE the basket, NOT to adjacent structures.'});
      
      if(selected==='shock_absorbing_lanyard'){
        w.push({type:'critical',title:'🚨 WRONG EQUIPMENT SELECTED',message:'You selected a shock-absorbing lanyard for aerial lift work. This is DANGEROUS and violates best practices. Change to a positioning or restraint lanyard immediately.'});
      }
    }
    // UNPROTECTED EDGE - Restraint preferred
    else if(env==='unprotected_edge'){
      rec={
        system:'fall_restraint',
        equipment:['Full Body Harness','Restraint Lanyard (length calculated to reach edge only)','Fixed or Portable Anchor Point'],
        explanation:'Fall RESTRAINT prevents the worker from reaching the fall hazard. The lanyard length must be calculated so the worker can reach the edge to work, but CANNOT go over it. This eliminates the fall entirely rather than arresting it.',
        priority:'recommended'
      };
      w.push({type:'info',title:'Restraint vs Arrest',message:'Fall restraint is preferred over fall arrest when feasible. It prevents the fall from occurring rather than stopping it after it starts.'});
      w.push({type:'warning',title:'Lanyard Length Critical',message:'Measure the distance from anchor point to edge. Restraint lanyard must be short enough that worker cannot reach past the edge.'});
    }
    // ROOF WORK
    else if(env==='roof_work'){
      rec={
        system:'fall_arrest_or_restraint',
        equipment:['Full Body Harness','SRL or Shock-Absorbing Lanyard','Roof Anchor or Horizontal Lifeline','Warning Line System (if applicable)'],
        explanation:'Roof work requires either fall arrest (if worker may go over edge) or fall restraint (if keeping worker away from edge). Consider warning lines at 6ft from edge with monitor, or 15ft without.',
        priority:'recommended'
      };
      if(height>20){
        w.push({type:'warning',title:'High-Risk Height',message:`Working at ${height} ft requires careful attention to clearance calculations and rescue planning.`});
      }
    }
    // SCAFFOLDING
    else if(env==='scaffolding'){
      rec={
        system:'guardrails_preferred',
        equipment:['Guardrail System (primary)','Full Body Harness + Lanyard (if guardrails incomplete)','Scaffold Anchor Points'],
        explanation:'Guardrails are the preferred protection on scaffolding. Personal fall arrest is required when guardrails are not feasible or during erection/dismantling.',
        priority:'info'
      };
    }
    // LADDER CLIMBING
    else if(env==='ladder'){
      rec={
        system:'ladder_safety_system',
        equipment:['Full Body Harness','Ladder Safety System (Vertical Lifeline or Rail)','Self-Retracting Lanyard for fixed ladders'],
        explanation:'Fixed ladders over 24 ft require a ladder safety system. The system arrests falls while allowing climbing movement.',
        priority:'recommended'
      };
    }
    // TOWER/STRUCTURE CLIMBING
    else if(env==='tower_climbing'){
      rec={
        system:'100_percent_tieoff',
        equipment:['Full Body Harness with Dorsal + Side D-rings','Twin-Leg Lanyard (100% tie-off)','Vertical Lifeline System','Positioning Lanyard for work positioning'],
        explanation:'Tower climbing requires 100% tie-off - worker must be connected at all times during climbing. Twin-leg lanyards allow continuous attachment while moving between anchor points.',
        priority:'critical'
      };
    }
    // DEFAULT
    else if(env){
      rec={
        system:'fall_arrest',
        equipment:['Full Body Harness','Shock-Absorbing Lanyard or SRL','Adequate Anchor Point (5,000 lbs)'],
        explanation:'Standard fall arrest system for general work at height. Ensure adequate clearance below and proper anchor point.',
        priority:'info'
      };
    }

    // PENDULUM EFFECT CHECK
    if(horizOffset>0){
      const pendulumAngle=Math.atan(horizOffset/(parseFloat(formData.anchorAboveDrings)||10))*180/Math.PI;
      if(horizOffset>=4){
        w.push({type:'critical',title:'🔄 SEVERE PENDULUM HAZARD',message:`Anchor point is ${horizOffset} ft horizontally offset. If worker falls, they will swing ${Math.round(pendulumAngle)}° and may strike obstacles or the structure. RELOCATE ANCHOR POINT to be directly above work area, or use horizontal lifeline.`});
      }else if(horizOffset>=2){
        w.push({type:'warning',title:'Pendulum Risk Present',message:`Anchor point is ${horizOffset} ft horizontally offset. Worker will swing in arc if fall occurs. Evaluate for obstacles in swing path and consider repositioning anchor.`});
      }
    }

    // SRL WITH OFFSET WARNING
    if(selected==='srl'&&horizOffset>2){
      w.push({type:'warning',title:'SRL + Offset = Swing',message:'SRLs allow worker mobility but if anchor is offset, a fall will result in pendulum swing. Consider horizontal lifeline or multiple anchor points.'});
    }

    // CLEARANCE CHECK
    const estimatedClearance=parseFloat(formData.freeFallDistance||6)+parseFloat(formData.decelerationDistance||3.5)+parseFloat(formData.workerHeight||6)+parseFloat(formData.safetyBuffer||3);
    const availClearance=parseFloat(formData.availableClearance)||0;
    if(availClearance>0&&availClearance<estimatedClearance){
      w.push({type:'critical',title:'⚠️ INSUFFICIENT CLEARANCE',message:`Need ${estimatedClearance.toFixed(1)} ft clearance but only ${availClearance} ft available. Worker may strike lower level. Use shorter lanyard, SRL, or different system.`});
    }

    setRecommendation(rec);
    setWarnings(w);
  };

  const estimatedClearance=parseFloat(formData.freeFallDistance||6)+parseFloat(formData.decelerationDistance||3.5)+parseFloat(formData.workerHeight||6)+parseFloat(formData.safetyBuffer||3);

  const handleSubmit=async(e)=>{e.preventDefault();setIsSubmitting(true);
    const newPlanNumber='FPP-'+new Date().toISOString().slice(0,10).replace(/-/g,'')+'-'+String(Math.floor(Math.random()*9999)).padStart(4,'0');
    try{
      const{error}=await supabase.from('fall_protection_plans').insert([{
        plan_number:newPlanNumber,dates_of_work:formData.datesOfWork,company:formData.company,location:formData.location,specific_location:formData.specificLocation,work_tasks:formData.workTasks,
        work_environment:formData.workEnvironment,aerial_lift_type:formData.aerialLiftType,roof_type:formData.roofType,
        height_above_lower:formData.heightAboveLower||null,landing_hazard_present:formData.landingHazardPresent,landing_hazard_desc:formData.landingHazardDesc,fall_hazard_types:formData.fallHazardTypes.join(', '),fall_hazard_details:formData.fallHazardDetails,
        anchor_point_location:formData.anchorPointLocation,anchor_horizontal_offset:formData.anchorHorizontalOffset||null,anchor_above_drings:formData.anchorAboveDrings||null,pendulum_risk:warnings.some(w=>w.title.includes('Pendulum'))?'Yes':'No',
        recommended_system:recommendation?.system||'',recommended_equipment:recommendation?.equipment?.join(', ')||'',recommendation_warnings:warnings.map(w=>w.title).join('; '),user_selected_system:formData.userSelectedSystem,
        primary_protection_method:formData.userSelectedSystem,fall_arrest_system_type:formData.userSelectedSystem,anchorage_type:formData.anchorageType,anchorage_strength:formData.anchorageStrength,anchorage_location:formData.anchorageLocation,body_support_type:formData.bodySupportType,positioning_d_rings:formData.positioningDRings,
        free_fall_distance:formData.freeFallDistance||null,deceleration_distance:formData.decelerationDistance||null,worker_height:formData.workerHeight||null,safety_buffer:formData.safetyBuffer||null,estimated_clearance:estimatedClearance,available_clearance:formData.availableClearance||null,clearance_adequate:parseFloat(formData.availableClearance)>=estimatedClearance?'Yes':'No',
        controlled_access_zone:formData.controlledAccessZone,warning_line_system:formData.warningLineSystem,safety_monitor_name:formData.safetyMonitorName,
        emergency_response_plan:formData.emergencyResponsePlan,emergency_phone:formData.emergencyPhone,emergency_equipment_details:formData.emergencyEquipmentDetails,
        harness_qty:parseInt(formData.harnessQty)||0,lanyard_qty:parseInt(formData.lanyardQty)||0,srl_qty:parseInt(formData.srlQty)||0,positioning_lanyard_qty:parseInt(formData.positioningLanyardQty)||0,restraint_lanyard_qty:parseInt(formData.restraintLanyardQty)||0,anchorage_connector_qty:parseInt(formData.anchorageConnectorQty)||0,connecting_devices_qty:parseInt(formData.connectingDevicesQty)||0,other_equipment:formData.otherEquipment,
        workers_protected:formData.workersProtected,additional_workers:formData.additionalWorkers,
        competent_person_name:formData.competentPersonName,competent_person_signature:formData.competentPersonSignature,qualified_person_required:formData.qualifiedPersonRequired,qualified_person_name:formData.qualifiedPersonName,qualified_person_signature:formData.qualifiedPersonSignature,
        equipment_inspected:formData.equipmentInspected?'Yes':'',personnel_trained:formData.personnelTrained?'Yes':'',approved_by_competent:formData.approvedByCompetent?'Yes':'',designed_by_qualified:formData.designedByQualified?'Yes':''
      }]);
      if(error)throw error;
      setPlanNumber(newPlanNumber);
      setSubmitted(true);
    }catch(e){console.error(e);alert('Error: '+e.message);}finally{setIsSubmitting(false);}
  };

  const resetForm=()=>{setFormData({datesOfWork:'',company:'',location:'',specificLocation:'',workTasks:'',workEnvironment:'',aerialLiftType:'',roofType:'',heightAboveLower:'',landingHazardPresent:'',landingHazardDesc:'',fallHazardTypes:[],fallHazardDetails:'',anchorPointLocation:'',anchorHorizontalOffset:'',anchorAboveDrings:'',userSelectedSystem:'',anchorageType:'',anchorageStrength:'',anchorageLocation:'',bodySupportType:'',positioningDRings:'',freeFallDistance:'6',decelerationDistance:'3.5',workerHeight:'6',safetyBuffer:'3',availableClearance:'',controlledAccessZone:'',warningLineSystem:'',safetyMonitorName:'',emergencyResponsePlan:'',emergencyPhone:'',emergencyEquipmentDetails:'',harnessQty:'0',lanyardQty:'0',srlQty:'0',positioningLanyardQty:'0',restraintLanyardQty:'0',anchorageConnectorQty:'0',connectingDevicesQty:'0',otherEquipment:'',workersProtected:'',additionalWorkers:'',competentPersonName:'',competentPersonSignature:'',qualifiedPersonRequired:'',qualifiedPersonName:'',qualifiedPersonSignature:'',equipmentInspected:false,personnelTrained:false,approvedByCompetent:false,designedByQualified:false});setRecommendation(null);setWarnings([]);setSubmitted(false);};

  const s={
    container:{minHeight:'100vh',background:'linear-gradient(135deg, #1e3a8a 0%, #b91c1c 100%)',padding:'20px'},
    formContainer:{maxWidth:'900px',margin:'0 auto',background:'white',borderRadius:'12px',boxShadow:'0 4px 6px rgba(0,0,0,0.1)',overflow:'hidden'},
    header:{background:'linear-gradient(135deg, #1e3a8a 0%, #b91c1c 100%)',color:'white',padding:'30px',textAlign:'center'},
    content:{padding:'30px'},
    section:{marginBottom:'25px',padding:'20px',background:'#f8fafc',borderRadius:'12px',border:'1px solid #e5e7eb'},
    sectionHeader:{background:'#1e3a8a',color:'white',padding:'12px 20px',margin:'-20px -20px 20px',fontWeight:'600',fontSize:'15px',display:'flex',alignItems:'center',gap:'10px',borderRadius:'12px 12px 0 0'},
    sectionRed:{background:'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)'},
    sectionGreen:{background:'linear-gradient(135deg, #059669 0%, #047857 100%)'},
    sectionPurple:{background:'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)'},
    sectionOrange:{background:'linear-gradient(135deg, #1e3a8a 0%, #b91c1c 100%)'},
    sectionCyan:{background:'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)'},
    formRow:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'20px',marginBottom:'15px'},
    formGroup:{marginBottom:'15px'},
    label:{display:'block',marginBottom:'6px',fontWeight:'500',color:'#1f2937',fontSize:'14px'},
    required:{color:'#dc2626'},
    input:{width:'100%',padding:'12px',border:'2px solid #d1d5db',borderRadius:'8px',fontSize:'16px'},
    select:{width:'100%',padding:'12px',border:'2px solid #d1d5db',borderRadius:'8px',fontSize:'16px',background:'white'},
    textarea:{width:'100%',padding:'12px',border:'2px solid #d1d5db',borderRadius:'8px',fontSize:'16px',minHeight:'80px',resize:'vertical'},
    radioGroup:{display:'flex',gap:'15px',flexWrap:'wrap'},
    radioOption:{display:'flex',alignItems:'center',gap:'8px',padding:'10px 15px',border:'2px solid #d1d5db',borderRadius:'8px',cursor:'pointer',transition:'all 0.2s',fontSize:'14px'},
    radioSelected:{borderColor:'#1e3a8a',background:'rgba(30,58,138,0.05)'},
    checkboxGrid:{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))',gap:'10px'},
    checkboxOption:{display:'flex',alignItems:'center',gap:'8px',padding:'10px',border:'1px solid #d1d5db',borderRadius:'6px',cursor:'pointer',fontSize:'13px'},
    checkboxSelected:{borderColor:'#1e3a8a',background:'rgba(30,58,138,0.05)'},
    envGrid:{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))',gap:'12px'},
    envCard:{padding:'15px',border:'2px solid #e5e7eb',borderRadius:'10px',cursor:'pointer',textAlign:'center',transition:'all 0.2s'},
    envCardSelected:{borderColor:'#1e3a8a',background:'#dbeafe'},
    recBox:{padding:'20px',borderRadius:'12px',marginTop:'20px'},
    recCritical:{background:'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',border:'2px solid #dc2626'},
    recRecommended:{background:'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',border:'2px solid #059669'},
    recInfo:{background:'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',border:'2px solid #3b82f6'},
    warningBox:{padding:'15px',borderRadius:'8px',marginBottom:'10px'},
    warningCritical:{background:'#fef2f2',borderLeft:'4px solid #dc2626'},
    warningWarn:{background:'#fef3c7',borderLeft:'4px solid #f59e0b'},
    warningInfo:{background:'#eff6ff',borderLeft:'4px solid #3b82f6'},
    clearanceCalc:{background:'#fef3c7',border:'2px solid #f59e0b',borderRadius:'8px',padding:'20px',margin:'20px 0'},
    clearanceResult:{display:'flex',alignItems:'center',gap:'20px',marginTop:'15px',padding:'15px',background:'white',borderRadius:'8px'},
    equipGrid:{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(120px, 1fr))',gap:'15px'},
    equipItem:{background:'#f3f4f6',borderRadius:'8px',padding:'15px',textAlign:'center'},
    submitBtn:{width:'100%',padding:'16px',background:'linear-gradient(135deg, #1e3a8a 0%, #b91c1c 100%)',color:'white',border:'none',borderRadius:'8px',fontSize:'18px',fontWeight:'600',cursor:'pointer',marginTop:'20px'},
    successMessage:{background:'linear-gradient(135deg, #059669 0%, #047857 100%)',color:'white',padding:'30px',borderRadius:'8px',textAlign:'center',marginTop:'20px'},
    verifyItem:{display:'flex',alignItems:'center',gap:'10px',padding:'12px',background:'white',border:'1px solid #d1d5db',borderRadius:'8px',marginBottom:'10px'},
    verifyChecked:{borderColor:'#059669',background:'rgba(5,150,105,0.05)'}
  };

  if(submitted){return(<div style={s.container}><div style={{maxWidth:'600px',margin:'0 auto',paddingTop:'50px'}}><div style={s.successMessage}><div style={{fontSize:'48px',marginBottom:'15px'}}>✓</div><h2 style={{margin:'0 0 10px'}}>Fall Protection Plan Submitted!</h2><div style={{fontSize:'24px',fontWeight:'700',background:'rgba(255,255,255,0.2)',padding:'10px 20px',borderRadius:'8px',margin:'15px 0',display:'inline-block'}}>{planNumber}</div><p style={{marginBottom:'20px'}}>Keep this plan number for your records.</p><div style={{display:'flex',gap:'10px',justifyContent:'center',flexWrap:'wrap'}}><button onClick={resetForm} style={{padding:'14px 30px',background:'white',color:'#059669',border:'none',borderRadius:'8px',fontSize:'16px',fontWeight:'600',cursor:'pointer'}}>Create New Plan</button><a href="/" style={{padding:'14px 30px',background:'#6b7280',color:'white',border:'none',borderRadius:'8px',fontSize:'16px',fontWeight:'600',textDecoration:'none'}}>Back to Portal</a></div></div></div></div>);}

  return(<div style={s.container}><div style={s.formContainer}>
    <div style={s.header}><a href="/" style={{color:'white',textDecoration:'none',fontSize:'14px'}}>← Back to Portal</a><div style={{background:'rgba(255,255,255,0.95)',borderRadius:'12px',padding:'15px',width:'fit-content',margin:'15px auto',boxShadow:'0 4px 15px rgba(0,0,0,0.2)'}}><img src="/Logo.png" alt="SLP Alaska" style={{maxWidth:'180px',height:'auto'}}/></div><h1 style={{margin:'0',fontSize:'26px',fontWeight:'700'}}>Fall Protection Plan</h1><p style={{margin:'10px 0 0',opacity:0.9,fontSize:'14px'}}>OSHA 1926/1910 Compliant Documentation</p><div style={{display:'inline-block',background:'white',color:'#b91c1c',padding:'5px 15px',borderRadius:'20px',fontSize:'11px',fontWeight:'600',marginTop:'10px'}}>⚠️ OSHA COMPLIANT</div></div>
    
    <div style={s.content}><form onSubmit={handleSubmit}>
      {/* General Information */}
      <div style={s.section}><div style={s.sectionHeader}>📋 General Information</div>
        <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Date(s) of Work <span style={s.required}>*</span></label><input type="text" name="datesOfWork" value={formData.datesOfWork} onChange={handleChange} required placeholder="e.g., 01/15/2026 or 01/15-01/20/2026" style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Company <span style={s.required}>*</span></label><select name="company" value={formData.company} onChange={handleChange} required style={s.select}><option value="">-- Select Company --</option>{COMPANIES.map(c=><option key={c} value={c}>{c}</option>)}</select></div></div>
        <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Location <span style={s.required}>*</span></label><select name="location" value={formData.location} onChange={handleChange} required style={s.select}><option value="">-- Select Location --</option>{LOCATIONS.map(l=><option key={l} value={l}>{l}</option>)}</select></div><div style={s.formGroup}><label style={s.label}>Specific Location</label><input type="text" name="specificLocation" value={formData.specificLocation} onChange={handleChange} placeholder="e.g., Building A Roof, Tower Section 3" style={s.input}/></div></div>
        <div style={s.formGroup}><label style={s.label}>Work Task(s) to be Performed <span style={s.required}>*</span></label><textarea name="workTasks" value={formData.workTasks} onChange={handleChange} required placeholder="Describe the specific work tasks requiring fall protection..." style={s.textarea}/></div>
      </div>
      
      {/* Work Environment Selection - THIS DRIVES RECOMMENDATIONS */}
      <div style={s.section}><div style={{...s.sectionHeader,...s.sectionOrange}}>🏗️ Work Environment - SELECT FIRST</div>
        <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:'8px',padding:'15px',marginBottom:'20px',fontSize:'13px',color:'#b91c1c'}}><strong>Important:</strong> Select your work environment first. The system will recommend the most appropriate fall protection based on your selection.</div>
        <div style={s.envGrid}>{WORK_ENVIRONMENTS.map(env=>(<div key={env.value} onClick={()=>setFormData(p=>({...p,workEnvironment:env.value}))} style={{...s.envCard,...(formData.workEnvironment===env.value?s.envCardSelected:{})}}><div style={{fontSize:'28px',marginBottom:'8px'}}>{env.icon}</div><div style={{fontWeight:'600',fontSize:'14px'}}>{env.label}</div></div>))}</div>
        
        {formData.workEnvironment==='aerial_lift'&&<div style={{marginTop:'20px'}}><div style={s.formGroup}><label style={s.label}>Aerial Lift Type</label><select name="aerialLiftType" value={formData.aerialLiftType} onChange={handleChange} style={s.select}><option value="">-- Select Lift Type --</option>{AERIAL_LIFT_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></div></div>}
      </div>
      
      {/* SMART RECOMMENDATION BOX */}
      {recommendation&&recommendation.system&&(<div style={{...s.recBox,...(recommendation.priority==='critical'?s.recCritical:recommendation.priority==='recommended'?s.recRecommended:s.recInfo)}}>
        <h3 style={{margin:'0 0 15px',color:recommendation.priority==='critical'?'#991b1b':'#065f46',display:'flex',alignItems:'center',gap:'10px'}}>{recommendation.priority==='critical'?'🚨':'✅'} Recommended Fall Protection System</h3>
        <div style={{background:'white',padding:'15px',borderRadius:'8px',marginBottom:'15px'}}>
          <div style={{fontWeight:'700',fontSize:'16px',marginBottom:'10px',color:'#1e3a8a'}}>{recommendation.system.replace(/_/g,' ').toUpperCase()}</div>
          <div style={{marginBottom:'10px'}}><strong>Equipment:</strong><ul style={{margin:'5px 0 0 20px',padding:0}}>{recommendation.equipment.map((eq,i)=><li key={i}>{eq}</li>)}</ul></div>
          <div style={{fontSize:'14px',color:'#4b5563'}}>{recommendation.explanation}</div>
        </div>
        
        {warnings.length>0&&<div><h4 style={{margin:'0 0 10px',color:'#991b1b'}}>⚠️ Warnings & Alerts</h4>{warnings.map((w,i)=><div key={i} style={{...s.warningBox,...(w.type==='critical'?s.warningCritical:w.type==='warning'?s.warningWarn:s.warningInfo)}}><div style={{fontWeight:'700',marginBottom:'5px'}}>{w.title}</div><div style={{fontSize:'13px'}}>{w.message}</div></div>)}</div>}
      </div>)}
      
      {/* Hazard Assessment */}
      <div style={s.section}><div style={{...s.sectionHeader,...s.sectionRed}}>⚠️ STEP I: Hazard Assessment</div>
        <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:'8px',padding:'15px',marginBottom:'20px',fontSize:'13px',color:'#991b1b'}}><strong>OSHA Requirements:</strong> Work at heights of 6 feet or more in construction (1926) or 4 feet in general industry (1910) requires fall protection.</div>
        <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Height Above Lower Level (ft) <span style={s.required}>*</span></label><input type="number" name="heightAboveLower" value={formData.heightAboveLower} onChange={handleChange} min="0" step="0.5" required placeholder="Enter height in feet" style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Landing Hazard Present? <span style={s.required}>*</span></label><div style={s.radioGroup}><label style={{...s.radioOption,...(formData.landingHazardPresent==='Yes'?s.radioSelected:{})}}><input type="radio" name="landingHazardPresent" value="Yes" checked={formData.landingHazardPresent==='Yes'} onChange={handleChange}/>Yes</label><label style={{...s.radioOption,...(formData.landingHazardPresent==='No'?s.radioSelected:{})}}><input type="radio" name="landingHazardPresent" value="No" checked={formData.landingHazardPresent==='No'} onChange={handleChange}/>No</label></div></div></div>
        {formData.landingHazardPresent==='Yes'&&<div style={s.formGroup}><label style={s.label}>Describe Landing Hazard</label><textarea name="landingHazardDesc" value={formData.landingHazardDesc} onChange={handleChange} placeholder="e.g., Concrete floor, equipment below, water, rebar..." style={s.textarea}/></div>}
        <div style={s.formGroup}><label style={s.label}>Fall Hazard Type(s)</label><div style={s.checkboxGrid}>{['Unprotected Edge','Leading Edge','Floor Opening','Wall Opening','Excavation','Scaffolding','Ladder Work','Aerial Lift','Roof Work','Steel Erection','Other'].map(h=>(<label key={h} style={{...s.checkboxOption,...(formData.fallHazardTypes.includes(h)?s.checkboxSelected:{})}}><input type="checkbox" checked={formData.fallHazardTypes.includes(h)} onChange={()=>handleHazardType(h)}/>{h}</label>))}</div></div>
        <div style={s.formGroup}><label style={s.label}>Additional Hazard Details</label><textarea name="fallHazardDetails" value={formData.fallHazardDetails} onChange={handleChange} placeholder="Provide additional details about the fall hazards..." style={s.textarea}/></div>
      </div>
      
      {/* Anchor Point Analysis - NEW */}
      <div style={s.section}><div style={{...s.sectionHeader,...s.sectionPurple}}>⚓ Anchor Point Analysis</div>
        <div style={{background:'#f5f3ff',border:'1px solid #c4b5fd',borderRadius:'8px',padding:'15px',marginBottom:'20px',fontSize:'13px',color:'#5b21b6'}}><strong>Pendulum Effect:</strong> If the anchor point is not directly above the work area, a fall will result in a pendulum swing. This can cause the worker to strike obstacles or the structure.</div>
        <div style={s.formGroup}><label style={s.label}>Where is the anchor point located relative to the work area?</label><select name="anchorPointLocation" value={formData.anchorPointLocation} onChange={handleChange} style={s.select}><option value="">-- Select --</option><option value="Directly overhead">Directly overhead (ideal)</option><option value="Slightly offset">Slightly offset (less than 2 ft)</option><option value="Moderately offset">Moderately offset (2-4 ft)</option><option value="Significantly offset">Significantly offset (more than 4 ft)</option><option value="Horizontal lifeline">Horizontal lifeline system</option></select></div>
        <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Horizontal Offset from Work Area (ft)</label><input type="number" name="anchorHorizontalOffset" value={formData.anchorHorizontalOffset} onChange={handleChange} min="0" step="0.5" placeholder="0 if directly above" style={s.input}/><small style={{color:'#6b7280',fontSize:'12px'}}>Distance anchor is to the side of work position</small></div><div style={s.formGroup}><label style={s.label}>Anchor Height Above D-Rings (ft)</label><input type="number" name="anchorAboveDrings" value={formData.anchorAboveDrings} onChange={handleChange} min="0" step="0.5" placeholder="Height above attachment point" style={s.input}/><small style={{color:'#6b7280',fontSize:'12px'}}>Vertical distance from D-ring to anchor</small></div></div>
      </div>
      
      {/* Your Selected System */}
      <div style={s.section}><div style={{...s.sectionHeader,...s.sectionGreen}}>🛡️ STEP II: Your Selected Protection System</div>
        <div style={s.formGroup}><label style={s.label}>Select Fall Protection System <span style={s.required}>*</span></label><select name="userSelectedSystem" value={formData.userSelectedSystem} onChange={handleChange} required style={s.select}><option value="">-- Select System --</option><optgroup label="Fall Restraint (Prevents Fall)"><option value="positioning_lanyard">Positioning Lanyard (Aerial Lifts, Work Positioning)</option><option value="restraint_lanyard">Restraint Lanyard (Keeps Worker from Edge)</option></optgroup><optgroup label="Fall Arrest (Stops Fall After It Occurs)"><option value="shock_absorbing_lanyard">Shock-Absorbing Lanyard (6 ft max)</option><option value="srl">Self-Retracting Lifeline (SRL)</option><option value="vertical_lifeline">Vertical Lifeline System</option><option value="horizontal_lifeline">Horizontal Lifeline System</option></optgroup><optgroup label="Passive Protection"><option value="guardrails">Guardrail System</option><option value="safety_net">Safety Net System</option><option value="hole_cover">Floor/Hole Cover</option></optgroup><optgroup label="Specialized"><option value="ladder_safety">Ladder Safety System</option><option value="twin_leg_100">Twin-Leg Lanyard (100% Tie-Off)</option></optgroup></select></div>
        
        {formData.userSelectedSystem==='shock_absorbing_lanyard'&&formData.workEnvironment==='aerial_lift'&&<div style={{background:'#fef2f2',border:'2px solid #dc2626',borderRadius:'8px',padding:'20px',marginTop:'15px'}}><h4 style={{color:'#991b1b',margin:'0 0 10px'}}>🚨 DANGEROUS SELECTION</h4><p style={{margin:0,color:'#991b1b'}}>A shock-absorbing lanyard should NOT be used in an aerial lift. The 6 ft length allows the worker to climb over the guardrails. If the lift tips or is struck, the worker will be ejected and swing OUTSIDE the basket. <strong>Change to a positioning or restraint lanyard.</strong></p></div>}
      </div>
      
      {/* System Details */}
      <div style={s.section}><div style={{...s.sectionHeader,...s.sectionPurple}}>📐 STEP III: System Details & Clearance</div>
        <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Anchorage Type <span style={s.required}>*</span></label><select name="anchorageType" value={formData.anchorageType} onChange={handleChange} required style={s.select}><option value="">-- Select --</option><option value="Structural Steel">Structural Steel</option><option value="Concrete Anchor">Concrete Anchor</option><option value="Engineered Anchor Point">Engineered Anchor Point</option><option value="Horizontal Lifeline">Horizontal Lifeline</option><option value="Vertical Lifeline">Vertical Lifeline</option><option value="Scaffold Anchor">Scaffold Anchor</option><option value="Roof Anchor">Roof Anchor</option><option value="Aerial Lift Anchor">Aerial Lift Basket Anchor</option><option value="Mobile Anchor">Mobile Anchor</option><option value="Other">Other</option></select></div><div style={s.formGroup}><label style={s.label}>Anchorage Strength <span style={s.required}>*</span></label><select name="anchorageStrength" value={formData.anchorageStrength} onChange={handleChange} required style={s.select}><option value="">-- Select --</option><option value="5,000 lbs per worker">5,000 lbs per worker (Standard)</option><option value="3,600 lbs (Engineered)">3,600 lbs (Engineered System)</option><option value="2x MAF (Certified)">2x Max Arrest Force (Certified)</option><option value="Unknown - Needs Evaluation">Unknown - Needs Evaluation</option></select></div></div>
        <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Body Support Type <span style={s.required}>*</span></label><select name="bodySupportType" value={formData.bodySupportType} onChange={handleChange} required style={s.select}><option value="">-- Select --</option><option value="Full Body Harness">Full Body Harness</option><option value="Body Belt (Positioning Only)">Body Belt (Positioning Only)</option><option value="Chest Harness (Ladder)">Chest Harness (Ladder Climbing)</option></select></div><div style={s.formGroup}><label style={s.label}>Positioning D-Rings Used?</label><div style={s.radioGroup}><label style={{...s.radioOption,...(formData.positioningDRings==='Yes'?s.radioSelected:{})}}><input type="radio" name="positioningDRings" value="Yes" checked={formData.positioningDRings==='Yes'} onChange={handleChange}/>Yes</label><label style={{...s.radioOption,...(formData.positioningDRings==='No'?s.radioSelected:{})}}><input type="radio" name="positioningDRings" value="No" checked={formData.positioningDRings==='No'} onChange={handleChange}/>No</label></div></div></div>
        
        {/* Clearance Calculator */}
        <div style={s.clearanceCalc}><h4 style={{margin:'0 0 15px',color:'#92400e',display:'flex',alignItems:'center',gap:'8px'}}>📏 Fall Clearance Calculator</h4><p style={{fontSize:'13px',color:'#92400e',marginBottom:'15px'}}>Calculate minimum clearance required to prevent contact with lower level during fall arrest.</p>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4, 1fr)',gap:'15px'}}>
            <div style={s.formGroup}><label style={s.label}>Free Fall (ft)</label><input type="number" name="freeFallDistance" value={formData.freeFallDistance} onChange={handleChange} min="0" max="6" step="0.5" style={s.input}/><small style={{color:'#6b7280'}}>Max 6 ft per OSHA</small></div>
            <div style={s.formGroup}><label style={s.label}>Deceleration (ft)</label><input type="number" name="decelerationDistance" value={formData.decelerationDistance} onChange={handleChange} min="0" step="0.5" style={s.input}/><small style={{color:'#6b7280'}}>Typically 3.5 ft</small></div>
            <div style={s.formGroup}><label style={s.label}>Worker Height (ft)</label><input type="number" name="workerHeight" value={formData.workerHeight} onChange={handleChange} min="0" step="0.5" style={s.input}/><small style={{color:'#6b7280'}}>D-ring to feet</small></div>
            <div style={s.formGroup}><label style={s.label}>Safety Buffer (ft)</label><input type="number" name="safetyBuffer" value={formData.safetyBuffer} onChange={handleChange} min="0" step="0.5" style={s.input}/><small style={{color:'#6b7280'}}>3 ft recommended</small></div>
          </div>
          <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Estimated Required Clearance (ft)</label><input type="text" value={estimatedClearance.toFixed(1)} readOnly style={{...s.input,background:'#f3f4f6',fontWeight:'700',fontSize:'20px'}}/></div><div style={s.formGroup}><label style={s.label}>Available Clearance (ft) <span style={s.required}>*</span></label><input type="number" name="availableClearance" value={formData.availableClearance} onChange={handleChange} min="0" step="0.5" required placeholder="Enter available clearance" style={s.input}/></div></div>
          {formData.availableClearance&&<div style={s.clearanceResult}><div><div style={{fontSize:'32px',fontWeight:'700',color:'#1e3a8a'}}>{estimatedClearance.toFixed(1)} ft</div><div style={{fontSize:'12px',color:'#6b7280'}}>Required Clearance</div></div><div style={{padding:'5px 15px',borderRadius:'20px',fontWeight:'600',fontSize:'13px',...(parseFloat(formData.availableClearance)>=estimatedClearance?{background:'#d1fae5',color:'#065f46'}:{background:'#fecaca',color:'#991b1b'})}}>{parseFloat(formData.availableClearance)>=estimatedClearance?'✓ ADEQUATE':'✗ INADEQUATE - Review Required'}</div></div>}
        </div>
        
        <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Controlled Access Zone Used?</label><div style={s.radioGroup}><label style={{...s.radioOption,...(formData.controlledAccessZone==='Yes'?s.radioSelected:{})}}><input type="radio" name="controlledAccessZone" value="Yes" checked={formData.controlledAccessZone==='Yes'} onChange={handleChange}/>Yes</label><label style={{...s.radioOption,...(formData.controlledAccessZone==='No'?s.radioSelected:{})}}><input type="radio" name="controlledAccessZone" value="No" checked={formData.controlledAccessZone==='No'} onChange={handleChange}/>No</label><label style={{...s.radioOption,...(formData.controlledAccessZone==='N/A'?s.radioSelected:{})}}><input type="radio" name="controlledAccessZone" value="N/A" checked={formData.controlledAccessZone==='N/A'} onChange={handleChange}/>N/A</label></div></div><div style={s.formGroup}><label style={s.label}>Warning Line System Used?</label><div style={s.radioGroup}><label style={{...s.radioOption,...(formData.warningLineSystem==='Yes'?s.radioSelected:{})}}><input type="radio" name="warningLineSystem" value="Yes" checked={formData.warningLineSystem==='Yes'} onChange={handleChange}/>Yes</label><label style={{...s.radioOption,...(formData.warningLineSystem==='No'?s.radioSelected:{})}}><input type="radio" name="warningLineSystem" value="No" checked={formData.warningLineSystem==='No'} onChange={handleChange}/>No</label></div></div></div>
        {formData.warningLineSystem==='Yes'&&<div style={s.formGroup}><label style={s.label}>Safety Monitor Name</label><input type="text" name="safetyMonitorName" value={formData.safetyMonitorName} onChange={handleChange} placeholder="Name of designated safety monitor" style={s.input}/></div>}
      </div>
      
      {/* Emergency Response */}
      <div style={s.section}><div style={{...s.sectionHeader,...s.sectionRed}}>🚨 Emergency Response</div>
        <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:'8px',padding:'15px',marginBottom:'20px',fontSize:'13px',color:'#991b1b'}}><strong>Rescue Plan Required:</strong> OSHA requires employers to provide for prompt rescue of workers in the event of a fall, or ensure workers can rescue themselves.</div>
        <div style={s.formGroup}><label style={s.label}>Emergency Response Plan in Place? <span style={s.required}>*</span></label><div style={s.radioGroup}><label style={{...s.radioOption,...(formData.emergencyResponsePlan==='Yes'?{...s.radioSelected,borderColor:'#059669',background:'rgba(5,150,105,0.1)'}:{})}}><input type="radio" name="emergencyResponsePlan" value="Yes" checked={formData.emergencyResponsePlan==='Yes'} onChange={handleChange} required/>Yes</label><label style={{...s.radioOption,...(formData.emergencyResponsePlan==='No'?{...s.radioSelected,borderColor:'#dc2626',background:'rgba(220,38,38,0.1)'}:{})}}><input type="radio" name="emergencyResponsePlan" value="No" checked={formData.emergencyResponsePlan==='No'} onChange={handleChange}/>No - Plan Required</label></div></div>
        <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Emergency Phone Number <span style={s.required}>*</span></label><input type="tel" name="emergencyPhone" value={formData.emergencyPhone} onChange={handleChange} required placeholder="e.g., 911 or site emergency number" style={s.input}/></div></div>
        <div style={s.formGroup}><label style={s.label}>Emergency/Rescue Equipment Available</label><textarea name="emergencyEquipmentDetails" value={formData.emergencyEquipmentDetails} onChange={handleChange} placeholder="List rescue equipment available (e.g., rescue kit, ladder, aerial lift, trained rescue team)..." style={s.textarea}/></div>
      </div>
      
      {/* Equipment */}
      <div style={s.section}><div style={{...s.sectionHeader,...s.sectionCyan}}>🔧 Equipment Requirements</div>
        <div style={s.equipGrid}>
          <div style={s.equipItem}><label style={{fontSize:'12px',color:'#6b7280',marginBottom:'8px',display:'block'}}>Full Body Harnesses</label><input type="number" name="harnessQty" value={formData.harnessQty} onChange={handleChange} min="0" style={{...s.input,width:'80px',textAlign:'center',fontWeight:'600',fontSize:'18px',margin:'0 auto'}}/></div>
          <div style={s.equipItem}><label style={{fontSize:'12px',color:'#6b7280',marginBottom:'8px',display:'block'}}>Shock-Absorbing Lanyards</label><input type="number" name="lanyardQty" value={formData.lanyardQty} onChange={handleChange} min="0" style={{...s.input,width:'80px',textAlign:'center',fontWeight:'600',fontSize:'18px',margin:'0 auto'}}/></div>
          <div style={s.equipItem}><label style={{fontSize:'12px',color:'#6b7280',marginBottom:'8px',display:'block'}}>SRLs</label><input type="number" name="srlQty" value={formData.srlQty} onChange={handleChange} min="0" style={{...s.input,width:'80px',textAlign:'center',fontWeight:'600',fontSize:'18px',margin:'0 auto'}}/></div>
          <div style={s.equipItem}><label style={{fontSize:'12px',color:'#6b7280',marginBottom:'8px',display:'block'}}>Positioning Lanyards</label><input type="number" name="positioningLanyardQty" value={formData.positioningLanyardQty} onChange={handleChange} min="0" style={{...s.input,width:'80px',textAlign:'center',fontWeight:'600',fontSize:'18px',margin:'0 auto'}}/></div>
          <div style={s.equipItem}><label style={{fontSize:'12px',color:'#6b7280',marginBottom:'8px',display:'block'}}>Restraint Lanyards</label><input type="number" name="restraintLanyardQty" value={formData.restraintLanyardQty} onChange={handleChange} min="0" style={{...s.input,width:'80px',textAlign:'center',fontWeight:'600',fontSize:'18px',margin:'0 auto'}}/></div>
          <div style={s.equipItem}><label style={{fontSize:'12px',color:'#6b7280',marginBottom:'8px',display:'block'}}>Anchorage Connectors</label><input type="number" name="anchorageConnectorQty" value={formData.anchorageConnectorQty} onChange={handleChange} min="0" style={{...s.input,width:'80px',textAlign:'center',fontWeight:'600',fontSize:'18px',margin:'0 auto'}}/></div>
        </div>
        <div style={{...s.formGroup,marginTop:'20px'}}><label style={s.label}>Other Equipment</label><input type="text" name="otherEquipment" value={formData.otherEquipment} onChange={handleChange} placeholder="List any other fall protection equipment needed..." style={s.input}/></div>
      </div>
      
      {/* Workers */}
      <div style={s.section}><div style={s.sectionHeader}>👷 Workers Protected</div>
        <div style={s.formGroup}><label style={s.label}>Names of Workers (Primary) <span style={s.required}>*</span></label><textarea name="workersProtected" value={formData.workersProtected} onChange={handleChange} required placeholder="List names of workers who will be using fall protection..." style={s.textarea}/></div>
        <div style={s.formGroup}><label style={s.label}>Additional Workers (if applicable)</label><textarea name="additionalWorkers" value={formData.additionalWorkers} onChange={handleChange} placeholder="List any additional workers..." style={s.textarea}/></div>
      </div>
      
      {/* Signatures */}
      <div style={s.section}><div style={{...s.sectionHeader,...s.sectionOrange}}>✍️ Signatures & Approval</div>
        <div style={{background:'#f3f4f6',borderRadius:'8px',padding:'20px',marginBottom:'20px'}}><h4 style={{margin:'0 0 15px',color:'#1f2937'}}>Competent Person (Required)</h4><div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Name <span style={s.required}>*</span></label><input type="text" name="competentPersonName" value={formData.competentPersonName} onChange={handleChange} required style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Signature (Type Full Name) <span style={s.required}>*</span></label><input type="text" name="competentPersonSignature" value={formData.competentPersonSignature} onChange={handleChange} required placeholder="Type full name as signature" style={s.input}/></div></div></div>
        <div style={s.formGroup}><label style={s.label}>Is a Qualified Person Required for this Plan?</label><div style={s.radioGroup}><label style={{...s.radioOption,...(formData.qualifiedPersonRequired==='Yes'?s.radioSelected:{})}}><input type="radio" name="qualifiedPersonRequired" value="Yes" checked={formData.qualifiedPersonRequired==='Yes'} onChange={handleChange}/>Yes</label><label style={{...s.radioOption,...(formData.qualifiedPersonRequired==='No'?s.radioSelected:{})}}><input type="radio" name="qualifiedPersonRequired" value="No" checked={formData.qualifiedPersonRequired==='No'} onChange={handleChange}/>No</label></div></div>
        {formData.qualifiedPersonRequired==='Yes'&&<div style={{background:'#f3f4f6',borderRadius:'8px',padding:'20px'}}><h4 style={{margin:'0 0 15px',color:'#1f2937'}}>Qualified Person</h4><div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Name</label><input type="text" name="qualifiedPersonName" value={formData.qualifiedPersonName} onChange={handleChange} style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Signature (Type Full Name)</label><input type="text" name="qualifiedPersonSignature" value={formData.qualifiedPersonSignature} onChange={handleChange} placeholder="Type full name as signature" style={s.input}/></div></div></div>}
      </div>
      
      {/* Verifications */}
      <div style={s.section}><div style={{...s.sectionHeader,...s.sectionGreen}}>✅ Verifications</div>
        <div><label style={{...s.verifyItem,...(formData.equipmentInspected?s.verifyChecked:{})}}><input type="checkbox" name="equipmentInspected" checked={formData.equipmentInspected} onChange={handleChange} style={{width:'20px',height:'20px'}}/><span>All fall protection equipment has been inspected prior to use</span></label><label style={{...s.verifyItem,...(formData.personnelTrained?s.verifyChecked:{})}}><input type="checkbox" name="personnelTrained" checked={formData.personnelTrained} onChange={handleChange} style={{width:'20px',height:'20px'}}/><span>All personnel have been trained on fall protection requirements and equipment use</span></label><label style={{...s.verifyItem,...(formData.approvedByCompetent?s.verifyChecked:{})}}><input type="checkbox" name="approvedByCompetent" checked={formData.approvedByCompetent} onChange={handleChange} style={{width:'20px',height:'20px'}}/><span>This plan has been reviewed and approved by a Competent Person</span></label><label style={{...s.verifyItem,...(formData.designedByQualified?s.verifyChecked:{})}}><input type="checkbox" name="designedByQualified" checked={formData.designedByQualified} onChange={handleChange} style={{width:'20px',height:'20px'}}/><span>Any engineered systems have been designed/approved by a Qualified Person</span></label></div>
      </div>
      
      <button type="submit" disabled={isSubmitting} style={{...s.submitBtn,opacity:isSubmitting?0.5:1}}>{isSubmitting?'Submitting...':'Submit Fall Protection Plan'}</button>
    </form></div>
    
    <div style={{textAlign:'center',padding:'20px',background:'linear-gradient(to bottom, #f8fafc, #ffffff)',color:'#64748b',fontSize:'11px',borderTop:'1px solid #e2e8f0'}}><span style={{color:'#1e3a5f',fontWeight:'500'}}>Powered by Predictive Safety Analytics™</span><span style={{color:'#94a3b8',margin:'0 8px'}}>|</span><span style={{color:'#475569'}}>© 2025 SLP Alaska</span></div>
  </div></div>);
}

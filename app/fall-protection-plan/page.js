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

// System options with metadata for smart recommendations
const PROTECTION_SYSTEMS = {
  positioning_lanyard:{name:'Positioning Lanyard',category:'restraint',clearanceNeeded:false,bestFor:['aerial_lift','steel_erection'],description:'Keeps worker in position, prevents ejection from basket'},
  restraint_lanyard:{name:'Restraint Lanyard',category:'restraint',clearanceNeeded:false,bestFor:['unprotected_edge','roof_work','excavation'],description:'Prevents worker from reaching fall hazard'},
  shock_absorbing_lanyard:{name:'Shock-Absorbing Lanyard (6 ft)',category:'arrest',clearanceNeeded:true,minClearance:18.5,bestFor:['roof_work','steel_erection','other'],notFor:['aerial_lift'],description:'Arrests fall after it occurs - requires adequate clearance'},
  srl:{name:'Self-Retracting Lifeline (SRL)',category:'arrest',clearanceNeeded:true,minClearance:12,bestFor:['roof_work','steel_erection','tower_climbing','other'],description:'Minimizes free fall distance, allows mobility'},
  vertical_lifeline:{name:'Vertical Lifeline System',category:'arrest',clearanceNeeded:true,bestFor:['ladder','tower_climbing'],description:'For climbing applications'},
  horizontal_lifeline:{name:'Horizontal Lifeline System',category:'arrest',clearanceNeeded:true,bestFor:['roof_work','steel_erection'],description:'Allows lateral movement across work area'},
  guardrails:{name:'Guardrail System',category:'passive',clearanceNeeded:false,bestFor:['scaffolding','roof_work','unprotected_edge'],description:'Passive protection - no worker action required'},
  safety_net:{name:'Safety Net System',category:'passive',clearanceNeeded:false,bestFor:['steel_erection'],description:'Catches falling workers'},
  hole_cover:{name:'Floor/Hole Cover',category:'passive',clearanceNeeded:false,bestFor:['roof_work','scaffolding'],description:'Covers floor openings'},
  ladder_safety:{name:'Ladder Safety System',category:'arrest',clearanceNeeded:false,bestFor:['ladder'],description:'Rail or cable system for ladder climbing'},
  twin_leg_100:{name:'Twin-Leg Lanyard (100% Tie-Off)',category:'arrest',clearanceNeeded:true,bestFor:['tower_climbing','steel_erection'],description:'Maintains continuous connection during movement'}
};

export default function FallProtectionPlan(){
  const [isSubmitting,setIsSubmitting]=useState(false);
  const [submitted,setSubmitted]=useState(false);
  const [planNumber,setPlanNumber]=useState('');
  const [complianceGrade,setComplianceGrade]=useState({grade:'',score:0,color:'',issues:[],suggestions:[]});
  const [showGuidance,setShowGuidance]=useState(false);
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
  
  // Auto-select recommended system
  const applyRecommendedSystem=(systemKey)=>{
    setFormData(p=>({...p,userSelectedSystem:systemKey}));
  };

  const estimatedClearance=parseFloat(formData.freeFallDistance||6)+parseFloat(formData.decelerationDistance||3.5)+parseFloat(formData.workerHeight||6)+parseFloat(formData.safetyBuffer||3);

  // Calculate compliance grade whenever relevant fields change
  useEffect(()=>{
    calculateComplianceGrade();
  },[formData.workEnvironment,formData.aerialLiftType,formData.anchorHorizontalOffset,formData.anchorAboveDrings,formData.heightAboveLower,formData.userSelectedSystem,formData.availableClearance,formData.freeFallDistance,formData.decelerationDistance,formData.workerHeight,formData.safetyBuffer,formData.emergencyResponsePlan,formData.equipmentInspected,formData.personnelTrained]);

  const calculateComplianceGrade=()=>{
    const issues=[];
    const suggestions=[];
    let score=100;
    
    const env=formData.workEnvironment;
    const height=parseFloat(formData.heightAboveLower)||0;
    const horizOffset=parseFloat(formData.anchorHorizontalOffset)||0;
    const selected=formData.userSelectedSystem;
    const estClearance=parseFloat(formData.freeFallDistance||6)+parseFloat(formData.decelerationDistance||3.5)+parseFloat(formData.workerHeight||6)+parseFloat(formData.safetyBuffer||3);
    const availClearance=parseFloat(formData.availableClearance)||0;
    const system=PROTECTION_SYSTEMS[selected];

    // ==================== CRITICAL ISSUES (Blocks Submission) ====================
    
    // CRITICAL #1: Shock absorbing lanyard in aerial lift
    if(env==='aerial_lift' && selected==='shock_absorbing_lanyard'){
      score=0;
      issues.push({
        severity:'critical',
        title:'Wrong Equipment for Aerial Lift',
        problem:'A 6-foot shock-absorbing lanyard allows the worker to climb over guardrails and be ejected if the lift tips.',
        solution:'Use a Positioning Lanyard or Restraint Lanyard instead.',
        action:'positioning_lanyard'
      });
    }

    // CRITICAL #2: Insufficient clearance with fall arrest system
    if(availClearance>0 && availClearance<estClearance && selected && system?.clearanceNeeded){
      score=0;
      const deficit=estClearance-availClearance;
      issues.push({
        severity:'critical',
        title:'Insufficient Fall Clearance',
        problem:`You need ${estClearance.toFixed(1)} ft but only have ${availClearance} ft available (${deficit.toFixed(1)} ft short). Worker will strike lower level.`,
        solution:availClearance>=12?'Switch to an SRL which requires less clearance, or use fall restraint to prevent the fall entirely.':'Use fall restraint (positioning or restraint lanyard) which prevents the fall and requires no clearance.',
        action:availClearance>=12?'srl':'restraint_lanyard'
      });
    }

    // CRITICAL #3: Severe pendulum hazard
    if(horizOffset>=6){
      score=0;
      issues.push({
        severity:'critical',
        title:'Severe Pendulum Hazard',
        problem:`Anchor is ${horizOffset} ft offset. A fall will cause dangerous swing into structure/obstacles.`,
        solution:'Install a horizontal lifeline system or relocate anchor directly above work area.',
        action:'horizontal_lifeline'
      });
    }

    // CRITICAL #4: No system selected for height work
    if(height>=6 && !selected && env){
      score=0;
      issues.push({
        severity:'critical',
        title:'No Fall Protection Selected',
        problem:`Working at ${height} ft requires fall protection per OSHA.`,
        solution:'Select a fall protection system appropriate for your work environment.',
        action:env==='aerial_lift'?'positioning_lanyard':env==='unprotected_edge'?'restraint_lanyard':'srl'
      });
    }

    // ==================== MAJOR ISSUES (Significant point deduction) ====================

    // Not using the BEST system for the environment
    if(selected && env && system){
      if(system.notFor?.includes(env)){
        score=Math.min(score,20);
        issues.push({
          severity:'major',
          title:'Wrong System for This Work',
          problem:`${system.name} is not appropriate for ${WORK_ENVIRONMENTS.find(w=>w.value===env)?.label}.`,
          solution:`Recommended: ${getBestSystemForEnv(env)}`,
          action:getBestSystemKeyForEnv(env)
        });
      }else if(!system.bestFor?.includes(env) && score>0){
        score-=15;
        suggestions.push({
          title:'Better Option Available',
          message:`${system.name} will work, but ${getBestSystemForEnv(env)} is better suited for this environment.`,
          action:getBestSystemKeyForEnv(env)
        });
      }
    }

    // Moderate pendulum risk
    if(horizOffset>=2 && horizOffset<6 && score>0){
      score-=20;
      issues.push({
        severity:'major',
        title:'Pendulum Risk Present',
        problem:`Anchor is ${horizOffset} ft offset - worker will swing in an arc if they fall.`,
        solution:'Consider horizontal lifeline or repositioning anchor closer to work area.',
        action:'horizontal_lifeline'
      });
    }

    // ==================== MINOR ISSUES (Small point deduction) ====================

    // No emergency response plan
    if(formData.emergencyResponsePlan==='No' && score>0){
      score-=15;
      issues.push({
        severity:'minor',
        title:'No Rescue Plan',
        problem:'OSHA requires a prompt rescue plan for fall events.',
        solution:'Establish emergency response procedures before work begins.'
      });
    }

    // Equipment not inspected
    if(!formData.equipmentInspected && selected && score>0){
      score-=10;
      suggestions.push({
        title:'Equipment Inspection',
        message:'Verify all fall protection equipment has been inspected prior to use.'
      });
    }

    // Personnel not trained
    if(!formData.personnelTrained && selected && score>0){
      score-=10;
      suggestions.push({
        title:'Training Verification',
        message:'Confirm all workers are trained on fall protection equipment and procedures.'
      });
    }

    // Marginal clearance
    if(availClearance>0 && availClearance>=estClearance && availClearance<estClearance+3 && system?.clearanceNeeded && score>0){
      score-=5;
      suggestions.push({
        title:'Marginal Clearance',
        message:`Clearance is adequate but minimal. Consider SRL for reduced free-fall distance.`
      });
    }

    // Determine grade
    let grade,color;
    if(score>=90){grade='A';color='#059669';}
    else if(score>=80){grade='B';color='#0891b2';}
    else if(score>=70){grade='C';color='#f59e0b';}
    else if(score>=60){grade='D';color='#ea580c';}
    else{grade='F';color='#dc2626';}

    // Can't submit if F
    const canSubmit=score>=60;

    setComplianceGrade({grade,score,color,issues,suggestions,canSubmit});
  };

  const getBestSystemForEnv=(env)=>{
    const map={
      aerial_lift:'Positioning Lanyard',
      unprotected_edge:'Restraint Lanyard or Guardrails',
      roof_work:'SRL with Roof Anchor or Warning Line System',
      scaffolding:'Guardrail System',
      ladder:'Ladder Safety System',
      steel_erection:'SRL or Positioning System',
      tower_climbing:'Twin-Leg 100% Tie-Off with SRL',
      confined_space:'Retrieval System with SRL',
      excavation:'Restraint Lanyard',
      other:'SRL or Shock-Absorbing Lanyard'
    };
    return map[env]||'Appropriate fall protection';
  };

  const getBestSystemKeyForEnv=(env)=>{
    const map={
      aerial_lift:'positioning_lanyard',
      unprotected_edge:'restraint_lanyard',
      roof_work:'srl',
      scaffolding:'guardrails',
      ladder:'ladder_safety',
      steel_erection:'srl',
      tower_climbing:'twin_leg_100',
      confined_space:'srl',
      excavation:'restraint_lanyard',
      other:'srl'
    };
    return map[env]||'srl';
  };

  const handleSubmit=async(e)=>{
    e.preventDefault();
    if(!complianceGrade.canSubmit){
      setShowGuidance(true);
      return;
    }
    setIsSubmitting(true);
    const newPlanNumber='FPP-'+new Date().toISOString().slice(0,10).replace(/-/g,'')+'-'+String(Math.floor(Math.random()*9999)).padStart(4,'0');
    try{
      const{error}=await supabase.from('fall_protection_plans').insert([{
        plan_number:newPlanNumber,dates_of_work:formData.datesOfWork,company:formData.company,location:formData.location,specific_location:formData.specificLocation,work_tasks:formData.workTasks,
        work_environment:formData.workEnvironment,aerial_lift_type:formData.aerialLiftType,roof_type:formData.roofType,
        height_above_lower:formData.heightAboveLower||null,landing_hazard_present:formData.landingHazardPresent,landing_hazard_desc:formData.landingHazardDesc,fall_hazard_types:formData.fallHazardTypes.join(', '),fall_hazard_details:formData.fallHazardDetails,
        anchor_point_location:formData.anchorPointLocation,anchor_horizontal_offset:formData.anchorHorizontalOffset||null,anchor_above_drings:formData.anchorAboveDrings||null,pendulum_risk:parseFloat(formData.anchorHorizontalOffset)>=2?'Yes':'No',
        recommended_system:getBestSystemKeyForEnv(formData.workEnvironment),recommended_equipment:'',recommendation_warnings:complianceGrade.issues.map(i=>i.title).join('; '),user_selected_system:formData.userSelectedSystem,
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

  const resetForm=()=>{setFormData({datesOfWork:'',company:'',location:'',specificLocation:'',workTasks:'',workEnvironment:'',aerialLiftType:'',roofType:'',heightAboveLower:'',landingHazardPresent:'',landingHazardDesc:'',fallHazardTypes:[],fallHazardDetails:'',anchorPointLocation:'',anchorHorizontalOffset:'',anchorAboveDrings:'',userSelectedSystem:'',anchorageType:'',anchorageStrength:'',anchorageLocation:'',bodySupportType:'',positioningDRings:'',freeFallDistance:'6',decelerationDistance:'3.5',workerHeight:'6',safetyBuffer:'3',availableClearance:'',controlledAccessZone:'',warningLineSystem:'',safetyMonitorName:'',emergencyResponsePlan:'',emergencyPhone:'',emergencyEquipmentDetails:'',harnessQty:'0',lanyardQty:'0',srlQty:'0',positioningLanyardQty:'0',restraintLanyardQty:'0',anchorageConnectorQty:'0',connectingDevicesQty:'0',otherEquipment:'',workersProtected:'',additionalWorkers:'',competentPersonName:'',competentPersonSignature:'',qualifiedPersonRequired:'',qualifiedPersonName:'',qualifiedPersonSignature:'',equipmentInspected:false,personnelTrained:false,approvedByCompetent:false,designedByQualified:false});setComplianceGrade({grade:'',score:0,color:'',issues:[],suggestions:[],canSubmit:false});setSubmitted(false);setShowGuidance(false);};

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
    sectionOrange:{background:'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)'},
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
    clearanceCalc:{background:'#fef3c7',border:'2px solid #f59e0b',borderRadius:'8px',padding:'20px',margin:'20px 0'},
    clearanceResult:{display:'flex',alignItems:'center',gap:'20px',marginTop:'15px',padding:'15px',background:'white',borderRadius:'8px'},
    equipGrid:{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(120px, 1fr))',gap:'15px'},
    equipItem:{background:'#f3f4f6',borderRadius:'8px',padding:'15px',textAlign:'center'},
    submitBtn:{width:'100%',padding:'16px',background:'linear-gradient(135deg, #059669 0%, #047857 100%)',color:'white',border:'none',borderRadius:'8px',fontSize:'18px',fontWeight:'600',cursor:'pointer',marginTop:'20px'},
    submitBtnDisabled:{width:'100%',padding:'16px',background:'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',color:'white',border:'none',borderRadius:'8px',fontSize:'18px',fontWeight:'600',cursor:'pointer',marginTop:'20px'},
    successMessage:{background:'linear-gradient(135deg, #059669 0%, #047857 100%)',color:'white',padding:'30px',borderRadius:'8px',textAlign:'center',marginTop:'20px'},
    verifyItem:{display:'flex',alignItems:'center',gap:'10px',padding:'12px',background:'white',border:'1px solid #d1d5db',borderRadius:'8px',marginBottom:'10px'},
    verifyChecked:{borderColor:'#059669',background:'rgba(5,150,105,0.05)'},
    // GRADE BOX STYLES
    gradeBox:{padding:'25px',borderRadius:'16px',marginBottom:'25px',border:'3px solid'},
    gradeCircle:{width:'100px',height:'100px',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'48px',fontWeight:'800',color:'white',margin:'0 auto 15px',boxShadow:'0 4px 15px rgba(0,0,0,0.2)'},
    issueCard:{background:'white',borderRadius:'10px',padding:'15px',marginBottom:'12px',borderLeft:'4px solid'},
    fixButton:{padding:'8px 16px',background:'#1e3a8a',color:'white',border:'none',borderRadius:'6px',fontSize:'13px',fontWeight:'600',cursor:'pointer',marginTop:'10px'},
    suggestionCard:{background:'#fffbeb',border:'1px solid #fcd34d',borderRadius:'8px',padding:'12px',marginBottom:'10px'}
  };

  // Compliance Grade Component
  const ComplianceGradeBox=()=>{
    if(!formData.workEnvironment)return null;
    const{grade,score,color,issues,suggestions,canSubmit}=complianceGrade;
    const criticalIssues=issues.filter(i=>i.severity==='critical');
    const majorIssues=issues.filter(i=>i.severity==='major');
    const minorIssues=issues.filter(i=>i.severity==='minor');
    
    return(
      <div style={{...s.gradeBox,borderColor:color,background:canSubmit?'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)':'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)'}}>
        <div style={{display:'flex',alignItems:'flex-start',gap:'25px',flexWrap:'wrap'}}>
          <div style={{textAlign:'center'}}>
            <div style={{...s.gradeCircle,background:color}}>{grade||'?'}</div>
            <div style={{fontSize:'14px',fontWeight:'600',color:color}}>Compliance Score: {score}/100</div>
            <div style={{fontSize:'12px',color:'#6b7280',marginTop:'5px'}}>{canSubmit?'✓ Ready to Submit':'✗ Cannot Submit'}</div>
          </div>
          
          <div style={{flex:1,minWidth:'300px'}}>
            {criticalIssues.length>0&&(
              <div style={{marginBottom:'15px'}}>
                <h4 style={{color:'#991b1b',margin:'0 0 10px',fontSize:'14px'}}>🚫 CRITICAL - Must Fix to Submit:</h4>
                {criticalIssues.map((issue,i)=>(
                  <div key={i} style={{...s.issueCard,borderColor:'#dc2626'}}>
                    <div style={{fontWeight:'700',color:'#991b1b',marginBottom:'5px'}}>{issue.title}</div>
                    <div style={{fontSize:'13px',color:'#1f2937',marginBottom:'8px'}}>{issue.problem}</div>
                    <div style={{fontSize:'13px',color:'#065f46',background:'#d1fae5',padding:'8px',borderRadius:'4px'}}><strong>✓ Solution:</strong> {issue.solution}</div>
                    {issue.action&&<button onClick={()=>applyRecommendedSystem(issue.action)} style={s.fixButton}>Apply Fix: Use {PROTECTION_SYSTEMS[issue.action]?.name}</button>}
                  </div>
                ))}
              </div>
            )}
            
            {majorIssues.length>0&&(
              <div style={{marginBottom:'15px'}}>
                <h4 style={{color:'#ea580c',margin:'0 0 10px',fontSize:'14px'}}>⚠️ Major Issues:</h4>
                {majorIssues.map((issue,i)=>(
                  <div key={i} style={{...s.issueCard,borderColor:'#f59e0b'}}>
                    <div style={{fontWeight:'700',color:'#92400e',marginBottom:'5px'}}>{issue.title}</div>
                    <div style={{fontSize:'13px',color:'#1f2937',marginBottom:'5px'}}>{issue.problem}</div>
                    <div style={{fontSize:'13px',color:'#065f46'}}><strong>Solution:</strong> {issue.solution}</div>
                    {issue.action&&<button onClick={()=>applyRecommendedSystem(issue.action)} style={{...s.fixButton,background:'#ea580c'}}>Apply: {PROTECTION_SYSTEMS[issue.action]?.name}</button>}
                  </div>
                ))}
              </div>
            )}
            
            {minorIssues.length>0&&(
              <div style={{marginBottom:'15px'}}>
                <h4 style={{color:'#6b7280',margin:'0 0 10px',fontSize:'14px'}}>ℹ️ Minor Issues:</h4>
                {minorIssues.map((issue,i)=>(
                  <div key={i} style={{...s.issueCard,borderColor:'#d1d5db'}}>
                    <div style={{fontWeight:'600',color:'#374151',marginBottom:'3px'}}>{issue.title}</div>
                    <div style={{fontSize:'13px',color:'#6b7280'}}>{issue.solution}</div>
                  </div>
                ))}
              </div>
            )}
            
            {suggestions.length>0&&canSubmit&&(
              <div>
                <h4 style={{color:'#0891b2',margin:'0 0 10px',fontSize:'14px'}}>💡 Suggestions to Improve:</h4>
                {suggestions.map((sug,i)=>(
                  <div key={i} style={s.suggestionCard}>
                    <div style={{fontWeight:'600',color:'#92400e',marginBottom:'3px'}}>{sug.title}</div>
                    <div style={{fontSize:'13px',color:'#78350f'}}>{sug.message}</div>
                    {sug.action&&<button onClick={()=>applyRecommendedSystem(sug.action)} style={{...s.fixButton,background:'#0891b2',marginTop:'8px'}}>Try: {PROTECTION_SYSTEMS[sug.action]?.name}</button>}
                  </div>
                ))}
              </div>
            )}
            
            {canSubmit&&issues.length===0&&suggestions.length===0&&(
              <div style={{background:'#d1fae5',padding:'15px',borderRadius:'8px',textAlign:'center'}}>
                <div style={{fontSize:'24px',marginBottom:'5px'}}>✓</div>
                <div style={{fontWeight:'600',color:'#065f46'}}>Excellent! This plan meets all requirements.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if(submitted){return(<div style={s.container}><div style={{maxWidth:'600px',margin:'0 auto',paddingTop:'50px'}}><div style={s.successMessage}><div style={{fontSize:'48px',marginBottom:'15px'}}>✓</div><h2 style={{margin:'0 0 10px'}}>Fall Protection Plan Approved & Submitted!</h2><div style={{fontSize:'24px',fontWeight:'700',background:'rgba(255,255,255,0.2)',padding:'10px 20px',borderRadius:'8px',margin:'15px 0',display:'inline-block'}}>{planNumber}</div><p style={{marginBottom:'5px'}}>Compliance Grade: <strong style={{fontSize:'20px'}}>{complianceGrade.grade}</strong> ({complianceGrade.score}/100)</p><p style={{marginBottom:'20px',opacity:0.9}}>Keep this plan number for your records.</p><div style={{display:'flex',gap:'10px',justifyContent:'center',flexWrap:'wrap'}}><button onClick={resetForm} style={{padding:'14px 30px',background:'white',color:'#059669',border:'none',borderRadius:'8px',fontSize:'16px',fontWeight:'600',cursor:'pointer'}}>Create New Plan</button><a href="/" style={{padding:'14px 30px',background:'#6b7280',color:'white',border:'none',borderRadius:'8px',fontSize:'16px',fontWeight:'600',textDecoration:'none'}}>Back to Portal</a></div></div></div></div>);}

  return(<div style={s.container}><div style={s.formContainer}>
    <div style={s.header}><a href="/" style={{color:'white',textDecoration:'none',fontSize:'14px'}}>← Back to Portal</a><div style={{background:'rgba(255,255,255,0.95)',borderRadius:'12px',padding:'15px',width:'fit-content',margin:'15px auto',boxShadow:'0 4px 15px rgba(0,0,0,0.2)'}}><img src="/Logo.png" alt="SLP Alaska" style={{maxWidth:'180px',height:'auto'}}/></div><h1 style={{margin:'0',fontSize:'26px',fontWeight:'700'}}>Fall Protection Plan</h1><p style={{margin:'10px 0 0',opacity:0.9,fontSize:'14px'}}>OSHA 1926/1910 Compliant Documentation</p><div style={{display:'inline-block',background:'white',color:'#b91c1c',padding:'5px 15px',borderRadius:'20px',fontSize:'11px',fontWeight:'600',marginTop:'10px'}}>⚠️ SMART COMPLIANCE ASSISTANT</div></div>
    
    <div style={s.content}><form onSubmit={handleSubmit}>
      
      {/* COMPLIANCE GRADE BOX - Shows after environment selected */}
      <ComplianceGradeBox/>

      {/* General Information */}
      <div style={s.section}><div style={s.sectionHeader}>📋 General Information</div>
        <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Date(s) of Work <span style={s.required}>*</span></label><input type="text" name="datesOfWork" value={formData.datesOfWork} onChange={handleChange} required placeholder="e.g., 01/15/2026 or 01/15-01/20/2026" style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Company <span style={s.required}>*</span></label><select name="company" value={formData.company} onChange={handleChange} required style={s.select}><option value="">-- Select Company --</option>{COMPANIES.map(c=><option key={c} value={c}>{c}</option>)}</select></div></div>
        <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Location <span style={s.required}>*</span></label><select name="location" value={formData.location} onChange={handleChange} required style={s.select}><option value="">-- Select Location --</option>{LOCATIONS.map(l=><option key={l} value={l}>{l}</option>)}</select></div><div style={s.formGroup}><label style={s.label}>Specific Location</label><input type="text" name="specificLocation" value={formData.specificLocation} onChange={handleChange} placeholder="e.g., Building A Roof, Tower Section 3" style={s.input}/></div></div>
        <div style={s.formGroup}><label style={s.label}>Work Task(s) to be Performed <span style={s.required}>*</span></label><textarea name="workTasks" value={formData.workTasks} onChange={handleChange} required placeholder="Describe the specific work tasks requiring fall protection..." style={s.textarea}/></div>
      </div>
      
      {/* Work Environment Selection */}
      <div style={s.section}><div style={{...s.sectionHeader,background:'linear-gradient(135deg, #1e3a8a 0%, #b91c1c 100%)'}}>🏗️ Work Environment - SELECT FIRST</div>
        <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:'8px',padding:'15px',marginBottom:'20px',fontSize:'13px',color:'#1e40af'}}><strong>Start Here:</strong> Select your work environment. The system will guide you to the correct fall protection and show your compliance grade in real-time.</div>
        <div style={s.envGrid}>{WORK_ENVIRONMENTS.map(env=>(<div key={env.value} onClick={()=>setFormData(p=>({...p,workEnvironment:env.value}))} style={{...s.envCard,...(formData.workEnvironment===env.value?s.envCardSelected:{})}}><div style={{fontSize:'28px',marginBottom:'8px'}}>{env.icon}</div><div style={{fontWeight:'600',fontSize:'14px'}}>{env.label}</div></div>))}</div>
        
        {formData.workEnvironment==='aerial_lift'&&<div style={{marginTop:'20px'}}><div style={s.formGroup}><label style={s.label}>Aerial Lift Type</label><select name="aerialLiftType" value={formData.aerialLiftType} onChange={handleChange} style={s.select}><option value="">-- Select Lift Type --</option>{AERIAL_LIFT_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></div></div>}
        
        {/* RECOMMENDED SYSTEM CALLOUT */}
        {formData.workEnvironment&&(
          <div style={{marginTop:'20px',padding:'15px',background:'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)',borderRadius:'10px',color:'white'}}>
            <div style={{fontWeight:'700',marginBottom:'5px'}}>✓ Recommended for {WORK_ENVIRONMENTS.find(w=>w.value===formData.workEnvironment)?.label}:</div>
            <div style={{fontSize:'18px',fontWeight:'600'}}>{getBestSystemForEnv(formData.workEnvironment)}</div>
            <button type="button" onClick={()=>applyRecommendedSystem(getBestSystemKeyForEnv(formData.workEnvironment))} style={{marginTop:'10px',padding:'8px 20px',background:'white',color:'#1e3a8a',border:'none',borderRadius:'6px',fontWeight:'600',cursor:'pointer'}}>Apply Recommended System</button>
          </div>
        )}
      </div>
      
      {/* Hazard Assessment */}
      <div style={s.section}><div style={{...s.sectionHeader,...s.sectionRed}}>⚠️ STEP I: Hazard Assessment</div>
        <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:'8px',padding:'15px',marginBottom:'20px',fontSize:'13px',color:'#991b1b'}}><strong>OSHA Requirements:</strong> Work at heights of 6 feet or more in construction (1926) or 4 feet in general industry (1910) requires fall protection.</div>
        <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Height Above Lower Level (ft) <span style={s.required}>*</span></label><input type="number" name="heightAboveLower" value={formData.heightAboveLower} onChange={handleChange} min="0" step="0.5" required placeholder="Enter height in feet" style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Landing Hazard Present? <span style={s.required}>*</span></label><div style={s.radioGroup}><label style={{...s.radioOption,...(formData.landingHazardPresent==='Yes'?s.radioSelected:{})}}><input type="radio" name="landingHazardPresent" value="Yes" checked={formData.landingHazardPresent==='Yes'} onChange={handleChange}/>Yes</label><label style={{...s.radioOption,...(formData.landingHazardPresent==='No'?s.radioSelected:{})}}><input type="radio" name="landingHazardPresent" value="No" checked={formData.landingHazardPresent==='No'} onChange={handleChange}/>No</label></div></div></div>
        {formData.landingHazardPresent==='Yes'&&<div style={s.formGroup}><label style={s.label}>Describe Landing Hazard</label><textarea name="landingHazardDesc" value={formData.landingHazardDesc} onChange={handleChange} placeholder="e.g., Concrete floor, equipment below, water, rebar..." style={s.textarea}/></div>}
        <div style={s.formGroup}><label style={s.label}>Fall Hazard Type(s)</label><div style={s.checkboxGrid}>{['Unprotected Edge','Leading Edge','Floor Opening','Wall Opening','Excavation','Scaffolding','Ladder Work','Aerial Lift','Roof Work','Steel Erection','Other'].map(h=>(<label key={h} style={{...s.checkboxOption,...(formData.fallHazardTypes.includes(h)?s.checkboxSelected:{})}}><input type="checkbox" checked={formData.fallHazardTypes.includes(h)} onChange={()=>handleHazardType(h)}/>{h}</label>))}</div></div>
      </div>
      
      {/* Anchor Point Analysis */}
      <div style={s.section}><div style={{...s.sectionHeader,...s.sectionPurple}}>⚓ Anchor Point Analysis</div>
        <div style={{background:'#f5f3ff',border:'1px solid #c4b5fd',borderRadius:'8px',padding:'15px',marginBottom:'20px',fontSize:'13px',color:'#5b21b6'}}><strong>Pendulum Effect:</strong> If the anchor point is not directly above the work area, a fall will result in a pendulum swing. Keep offset under 2 ft when possible.</div>
        <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Horizontal Offset from Work Area (ft)</label><input type="number" name="anchorHorizontalOffset" value={formData.anchorHorizontalOffset} onChange={handleChange} min="0" step="0.5" placeholder="0 if directly above" style={{...s.input,...(parseFloat(formData.anchorHorizontalOffset)>=6?{borderColor:'#dc2626',background:'#fef2f2'}:parseFloat(formData.anchorHorizontalOffset)>=2?{borderColor:'#f59e0b',background:'#fffbeb'}:{})}}/><small style={{color:parseFloat(formData.anchorHorizontalOffset)>=6?'#dc2626':parseFloat(formData.anchorHorizontalOffset)>=2?'#92400e':'#6b7280'}}>{parseFloat(formData.anchorHorizontalOffset)>=6?'🚫 Too far - will not allow submission':parseFloat(formData.anchorHorizontalOffset)>=2?'⚠️ Pendulum risk - consider horizontal lifeline':'✓ Acceptable'}</small></div><div style={s.formGroup}><label style={s.label}>Anchor Height Above D-Rings (ft)</label><input type="number" name="anchorAboveDrings" value={formData.anchorAboveDrings} onChange={handleChange} min="0" step="0.5" placeholder="Height above attachment point" style={s.input}/></div></div>
      </div>
      
      {/* Your Selected System */}
      <div style={s.section}><div style={{...s.sectionHeader,...s.sectionGreen}}>🛡️ STEP II: Fall Protection System</div>
        <div style={s.formGroup}><label style={s.label}>Select Fall Protection System <span style={s.required}>*</span></label>
          <select name="userSelectedSystem" value={formData.userSelectedSystem} onChange={handleChange} required style={{...s.select,...(complianceGrade.issues.some(i=>i.severity==='critical'&&i.action)?{borderColor:'#dc2626',background:'#fef2f2'}:formData.userSelectedSystem?{borderColor:'#059669',background:'#ecfdf5'}:{})}}>
            <option value="">-- Select System --</option>
            <optgroup label="🛑 Fall Restraint (Prevents Fall - No Clearance Needed)">
              <option value="positioning_lanyard">Positioning Lanyard (Aerial Lifts, Work Positioning)</option>
              <option value="restraint_lanyard">Restraint Lanyard (Keeps Worker from Edge)</option>
            </optgroup>
            <optgroup label="🪢 Fall Arrest (Stops Fall - Requires Clearance)">
              <option value="shock_absorbing_lanyard">Shock-Absorbing Lanyard (6 ft) - Needs 18.5 ft clearance</option>
              <option value="srl">Self-Retracting Lifeline (SRL) - Needs ~12 ft clearance</option>
              <option value="vertical_lifeline">Vertical Lifeline System</option>
              <option value="horizontal_lifeline">Horizontal Lifeline System</option>
            </optgroup>
            <optgroup label="🚧 Passive Protection">
              <option value="guardrails">Guardrail System</option>
              <option value="safety_net">Safety Net System</option>
              <option value="hole_cover">Floor/Hole Cover</option>
            </optgroup>
            <optgroup label="🔧 Specialized">
              <option value="ladder_safety">Ladder Safety System</option>
              <option value="twin_leg_100">Twin-Leg Lanyard (100% Tie-Off)</option>
            </optgroup>
          </select>
        </div>
        
        {/* System info card */}
        {formData.userSelectedSystem && PROTECTION_SYSTEMS[formData.userSelectedSystem] && (
          <div style={{padding:'15px',background:PROTECTION_SYSTEMS[formData.userSelectedSystem].notFor?.includes(formData.workEnvironment)?'#fef2f2':'#f0fdf4',border:`2px solid ${PROTECTION_SYSTEMS[formData.userSelectedSystem].notFor?.includes(formData.workEnvironment)?'#dc2626':'#22c55e'}`,borderRadius:'8px',marginTop:'10px'}}>
            <div style={{fontWeight:'700',color:PROTECTION_SYSTEMS[formData.userSelectedSystem].notFor?.includes(formData.workEnvironment)?'#991b1b':'#166534',marginBottom:'5px'}}>
              {PROTECTION_SYSTEMS[formData.userSelectedSystem].notFor?.includes(formData.workEnvironment)?'🚫 NOT Recommended':'✓ Selected:'} {PROTECTION_SYSTEMS[formData.userSelectedSystem].name}
            </div>
            <div style={{fontSize:'13px',color:'#374151'}}>{PROTECTION_SYSTEMS[formData.userSelectedSystem].description}</div>
            {PROTECTION_SYSTEMS[formData.userSelectedSystem].clearanceNeeded && (
              <div style={{fontSize:'12px',color:'#92400e',marginTop:'5px'}}>⚠️ Requires fall clearance calculation</div>
            )}
          </div>
        )}
      </div>
      
      {/* System Details & Clearance */}
      <div style={s.section}><div style={{...s.sectionHeader,...s.sectionPurple}}>📐 STEP III: System Details & Clearance</div>
        <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Anchorage Type <span style={s.required}>*</span></label><select name="anchorageType" value={formData.anchorageType} onChange={handleChange} required style={s.select}><option value="">-- Select --</option><option value="Structural Steel">Structural Steel</option><option value="Concrete Anchor">Concrete Anchor</option><option value="Engineered Anchor Point">Engineered Anchor Point</option><option value="Horizontal Lifeline">Horizontal Lifeline</option><option value="Vertical Lifeline">Vertical Lifeline</option><option value="Roof Anchor">Roof Anchor</option><option value="Aerial Lift Anchor">Aerial Lift Basket Anchor</option><option value="Mobile Anchor">Mobile Anchor</option><option value="Other">Other</option></select></div><div style={s.formGroup}><label style={s.label}>Anchorage Strength <span style={s.required}>*</span></label><select name="anchorageStrength" value={formData.anchorageStrength} onChange={handleChange} required style={s.select}><option value="">-- Select --</option><option value="5,000 lbs per worker">5,000 lbs per worker (Standard)</option><option value="3,600 lbs (Engineered)">3,600 lbs (Engineered System)</option><option value="2x MAF (Certified)">2x Max Arrest Force (Certified)</option></select></div></div>
        <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Body Support Type <span style={s.required}>*</span></label><select name="bodySupportType" value={formData.bodySupportType} onChange={handleChange} required style={s.select}><option value="">-- Select --</option><option value="Full Body Harness">Full Body Harness</option><option value="Body Belt (Positioning Only)">Body Belt (Positioning Only)</option></select></div><div style={s.formGroup}><label style={s.label}>Positioning D-Rings Used?</label><div style={s.radioGroup}><label style={{...s.radioOption,...(formData.positioningDRings==='Yes'?s.radioSelected:{})}}><input type="radio" name="positioningDRings" value="Yes" checked={formData.positioningDRings==='Yes'} onChange={handleChange}/>Yes</label><label style={{...s.radioOption,...(formData.positioningDRings==='No'?s.radioSelected:{})}}><input type="radio" name="positioningDRings" value="No" checked={formData.positioningDRings==='No'} onChange={handleChange}/>No</label></div></div></div>
        
        {/* Clearance Calculator - Only show for systems that need it */}
        {formData.userSelectedSystem && PROTECTION_SYSTEMS[formData.userSelectedSystem]?.clearanceNeeded && (
          <div style={{...s.clearanceCalc,...(complianceGrade.issues.some(i=>i.title.includes('Clearance'))?{background:'#fef2f2',borderColor:'#dc2626'}:{})}}>
            <h4 style={{margin:'0 0 15px',color:complianceGrade.issues.some(i=>i.title.includes('Clearance'))?'#991b1b':'#92400e',display:'flex',alignItems:'center',gap:'8px'}}>📏 Fall Clearance Calculator <span style={{fontSize:'12px',fontWeight:'400'}}>(Required for {PROTECTION_SYSTEMS[formData.userSelectedSystem].name})</span></h4>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4, 1fr)',gap:'15px'}}>
              <div style={s.formGroup}><label style={s.label}>Free Fall (ft)</label><input type="number" name="freeFallDistance" value={formData.freeFallDistance} onChange={handleChange} min="0" max="6" step="0.5" style={s.input}/><small style={{color:'#6b7280'}}>Max 6 ft per OSHA</small></div>
              <div style={s.formGroup}><label style={s.label}>Deceleration (ft)</label><input type="number" name="decelerationDistance" value={formData.decelerationDistance} onChange={handleChange} min="0" step="0.5" style={s.input}/><small style={{color:'#6b7280'}}>Typically 3.5 ft</small></div>
              <div style={s.formGroup}><label style={s.label}>Worker Height (ft)</label><input type="number" name="workerHeight" value={formData.workerHeight} onChange={handleChange} min="0" step="0.5" style={s.input}/><small style={{color:'#6b7280'}}>D-ring to feet</small></div>
              <div style={s.formGroup}><label style={s.label}>Safety Buffer (ft)</label><input type="number" name="safetyBuffer" value={formData.safetyBuffer} onChange={handleChange} min="0" step="0.5" style={s.input}/><small style={{color:'#6b7280'}}>3 ft recommended</small></div>
            </div>
            <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Required Clearance (ft)</label><input type="text" value={estimatedClearance.toFixed(1)} readOnly style={{...s.input,background:'#f3f4f6',fontWeight:'700',fontSize:'20px'}}/></div><div style={s.formGroup}><label style={s.label}>Available Clearance (ft) <span style={s.required}>*</span></label><input type="number" name="availableClearance" value={formData.availableClearance} onChange={handleChange} min="0" step="0.5" required placeholder="Enter available clearance" style={{...s.input,...(parseFloat(formData.availableClearance)>0&&parseFloat(formData.availableClearance)<estimatedClearance?{borderColor:'#dc2626',background:'#fef2f2'}:{})}}/></div></div>
            {formData.availableClearance&&<div style={s.clearanceResult}><div><div style={{fontSize:'32px',fontWeight:'700',color:parseFloat(formData.availableClearance)>=estimatedClearance?'#059669':'#dc2626'}}>{estimatedClearance.toFixed(1)} ft</div><div style={{fontSize:'12px',color:'#6b7280'}}>Required</div></div><div style={{padding:'8px 20px',borderRadius:'20px',fontWeight:'600',fontSize:'14px',...(parseFloat(formData.availableClearance)>=estimatedClearance?{background:'#d1fae5',color:'#065f46'}:{background:'#fecaca',color:'#991b1b'})}}>{parseFloat(formData.availableClearance)>=estimatedClearance?'✓ ADEQUATE':'🚫 INADEQUATE'}</div>{parseFloat(formData.availableClearance)<estimatedClearance&&parseFloat(formData.availableClearance)>=12&&<button type="button" onClick={()=>applyRecommendedSystem('srl')} style={{padding:'8px 16px',background:'#1e3a8a',color:'white',border:'none',borderRadius:'6px',fontSize:'13px',cursor:'pointer'}}>Switch to SRL (less clearance needed)</button>}{parseFloat(formData.availableClearance)<12&&<button type="button" onClick={()=>applyRecommendedSystem('restraint_lanyard')} style={{padding:'8px 16px',background:'#1e3a8a',color:'white',border:'none',borderRadius:'6px',fontSize:'13px',cursor:'pointer'}}>Switch to Restraint (no clearance needed)</button>}</div>}
          </div>
        )}
        
        <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Controlled Access Zone?</label><div style={s.radioGroup}><label style={{...s.radioOption,...(formData.controlledAccessZone==='Yes'?s.radioSelected:{})}}><input type="radio" name="controlledAccessZone" value="Yes" checked={formData.controlledAccessZone==='Yes'} onChange={handleChange}/>Yes</label><label style={{...s.radioOption,...(formData.controlledAccessZone==='No'?s.radioSelected:{})}}><input type="radio" name="controlledAccessZone" value="No" checked={formData.controlledAccessZone==='No'} onChange={handleChange}/>No</label><label style={{...s.radioOption,...(formData.controlledAccessZone==='N/A'?s.radioSelected:{})}}><input type="radio" name="controlledAccessZone" value="N/A" checked={formData.controlledAccessZone==='N/A'} onChange={handleChange}/>N/A</label></div></div><div style={s.formGroup}><label style={s.label}>Warning Line System?</label><div style={s.radioGroup}><label style={{...s.radioOption,...(formData.warningLineSystem==='Yes'?s.radioSelected:{})}}><input type="radio" name="warningLineSystem" value="Yes" checked={formData.warningLineSystem==='Yes'} onChange={handleChange}/>Yes</label><label style={{...s.radioOption,...(formData.warningLineSystem==='No'?s.radioSelected:{})}}><input type="radio" name="warningLineSystem" value="No" checked={formData.warningLineSystem==='No'} onChange={handleChange}/>No</label></div></div></div>
      </div>
      
      {/* Emergency Response */}
      <div style={s.section}><div style={{...s.sectionHeader,...s.sectionRed}}>🚨 Emergency Response</div>
        <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:'8px',padding:'15px',marginBottom:'20px',fontSize:'13px',color:'#991b1b'}}><strong>Rescue Plan Required:</strong> OSHA requires a prompt rescue plan. Suspension trauma can occur within minutes.</div>
        <div style={s.formGroup}><label style={s.label}>Emergency Response Plan in Place? <span style={s.required}>*</span></label><div style={s.radioGroup}><label style={{...s.radioOption,...(formData.emergencyResponsePlan==='Yes'?{...s.radioSelected,borderColor:'#059669',background:'rgba(5,150,105,0.1)'}:{})}}><input type="radio" name="emergencyResponsePlan" value="Yes" checked={formData.emergencyResponsePlan==='Yes'} onChange={handleChange} required/>Yes</label><label style={{...s.radioOption,...(formData.emergencyResponsePlan==='No'?{...s.radioSelected,borderColor:'#dc2626',background:'rgba(220,38,38,0.1)'}:{})}}><input type="radio" name="emergencyResponsePlan" value="No" checked={formData.emergencyResponsePlan==='No'} onChange={handleChange}/>No</label></div></div>
        <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Emergency Phone <span style={s.required}>*</span></label><input type="tel" name="emergencyPhone" value={formData.emergencyPhone} onChange={handleChange} required placeholder="911 or site number" style={s.input}/></div></div>
        <div style={s.formGroup}><label style={s.label}>Rescue Equipment Available</label><textarea name="emergencyEquipmentDetails" value={formData.emergencyEquipmentDetails} onChange={handleChange} placeholder="e.g., Rescue kit, aerial lift, trained rescue team..." style={s.textarea}/></div>
      </div>
      
      {/* Equipment */}
      <div style={s.section}><div style={{...s.sectionHeader,...s.sectionCyan}}>🔧 Equipment</div>
        <div style={s.equipGrid}>
          <div style={s.equipItem}><label style={{fontSize:'12px',color:'#6b7280',marginBottom:'8px',display:'block'}}>Harnesses</label><input type="number" name="harnessQty" value={formData.harnessQty} onChange={handleChange} min="0" style={{...s.input,width:'60px',textAlign:'center',fontWeight:'600',margin:'0 auto'}}/></div>
          <div style={s.equipItem}><label style={{fontSize:'12px',color:'#6b7280',marginBottom:'8px',display:'block'}}>Shock Lanyards</label><input type="number" name="lanyardQty" value={formData.lanyardQty} onChange={handleChange} min="0" style={{...s.input,width:'60px',textAlign:'center',fontWeight:'600',margin:'0 auto'}}/></div>
          <div style={s.equipItem}><label style={{fontSize:'12px',color:'#6b7280',marginBottom:'8px',display:'block'}}>SRLs</label><input type="number" name="srlQty" value={formData.srlQty} onChange={handleChange} min="0" style={{...s.input,width:'60px',textAlign:'center',fontWeight:'600',margin:'0 auto'}}/></div>
          <div style={s.equipItem}><label style={{fontSize:'12px',color:'#6b7280',marginBottom:'8px',display:'block'}}>Positioning</label><input type="number" name="positioningLanyardQty" value={formData.positioningLanyardQty} onChange={handleChange} min="0" style={{...s.input,width:'60px',textAlign:'center',fontWeight:'600',margin:'0 auto'}}/></div>
          <div style={s.equipItem}><label style={{fontSize:'12px',color:'#6b7280',marginBottom:'8px',display:'block'}}>Restraint</label><input type="number" name="restraintLanyardQty" value={formData.restraintLanyardQty} onChange={handleChange} min="0" style={{...s.input,width:'60px',textAlign:'center',fontWeight:'600',margin:'0 auto'}}/></div>
          <div style={s.equipItem}><label style={{fontSize:'12px',color:'#6b7280',marginBottom:'8px',display:'block'}}>Anchors</label><input type="number" name="anchorageConnectorQty" value={formData.anchorageConnectorQty} onChange={handleChange} min="0" style={{...s.input,width:'60px',textAlign:'center',fontWeight:'600',margin:'0 auto'}}/></div>
        </div>
      </div>
      
      {/* Workers */}
      <div style={s.section}><div style={s.sectionHeader}>👷 Workers</div>
        <div style={s.formGroup}><label style={s.label}>Workers Protected <span style={s.required}>*</span></label><textarea name="workersProtected" value={formData.workersProtected} onChange={handleChange} required placeholder="Names of workers using fall protection..." style={s.textarea}/></div>
      </div>
      
      {/* Signatures */}
      <div style={s.section}><div style={{...s.sectionHeader,...s.sectionOrange}}>✍️ Signatures</div>
        <div style={{background:'#f3f4f6',borderRadius:'8px',padding:'20px',marginBottom:'15px'}}><h4 style={{margin:'0 0 15px',color:'#1f2937'}}>Competent Person (Required)</h4><div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Name <span style={s.required}>*</span></label><input type="text" name="competentPersonName" value={formData.competentPersonName} onChange={handleChange} required style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Signature <span style={s.required}>*</span></label><input type="text" name="competentPersonSignature" value={formData.competentPersonSignature} onChange={handleChange} required placeholder="Type full name" style={s.input}/></div></div></div>
        <div style={s.formGroup}><label style={s.label}>Qualified Person Required?</label><div style={s.radioGroup}><label style={{...s.radioOption,...(formData.qualifiedPersonRequired==='Yes'?s.radioSelected:{})}}><input type="radio" name="qualifiedPersonRequired" value="Yes" checked={formData.qualifiedPersonRequired==='Yes'} onChange={handleChange}/>Yes</label><label style={{...s.radioOption,...(formData.qualifiedPersonRequired==='No'?s.radioSelected:{})}}><input type="radio" name="qualifiedPersonRequired" value="No" checked={formData.qualifiedPersonRequired==='No'} onChange={handleChange}/>No</label></div></div>
        {formData.qualifiedPersonRequired==='Yes'&&<div style={{background:'#f3f4f6',borderRadius:'8px',padding:'20px'}}><h4 style={{margin:'0 0 15px'}}>Qualified Person</h4><div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Name</label><input type="text" name="qualifiedPersonName" value={formData.qualifiedPersonName} onChange={handleChange} style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Signature</label><input type="text" name="qualifiedPersonSignature" value={formData.qualifiedPersonSignature} onChange={handleChange} style={s.input}/></div></div></div>}
      </div>
      
      {/* Verifications */}
      <div style={s.section}><div style={{...s.sectionHeader,...s.sectionGreen}}>✅ Verifications</div>
        <div><label style={{...s.verifyItem,...(formData.equipmentInspected?s.verifyChecked:{})}}><input type="checkbox" name="equipmentInspected" checked={formData.equipmentInspected} onChange={handleChange} style={{width:'20px',height:'20px'}}/><span>Equipment inspected prior to use</span></label><label style={{...s.verifyItem,...(formData.personnelTrained?s.verifyChecked:{})}}><input type="checkbox" name="personnelTrained" checked={formData.personnelTrained} onChange={handleChange} style={{width:'20px',height:'20px'}}/><span>Personnel trained on fall protection</span></label><label style={{...s.verifyItem,...(formData.approvedByCompetent?s.verifyChecked:{})}}><input type="checkbox" name="approvedByCompetent" checked={formData.approvedByCompetent} onChange={handleChange} style={{width:'20px',height:'20px'}}/><span>Approved by Competent Person</span></label></div>
      </div>
      
      {/* SUBMIT BUTTON */}
      {complianceGrade.canSubmit ? (
        <button type="submit" disabled={isSubmitting} style={{...s.submitBtn,opacity:isSubmitting?0.5:1}}>{isSubmitting?'Submitting...':'✓ Submit Fall Protection Plan (Grade: '+complianceGrade.grade+')'}</button>
      ) : (
        <div>
          <button type="button" onClick={()=>setShowGuidance(true)} style={s.submitBtnDisabled}>🚫 Cannot Submit - Grade: {complianceGrade.grade} (Must be D or higher)</button>
          <p style={{textAlign:'center',color:'#991b1b',marginTop:'10px',fontSize:'14px'}}>Review the compliance issues above and apply the recommended fixes.</p>
        </div>
      )}
    </form></div>
    
    <div style={{textAlign:'center',padding:'20px',background:'linear-gradient(to bottom, #f8fafc, #ffffff)',color:'#64748b',fontSize:'11px',borderTop:'1px solid #e2e8f0'}}><span style={{color:'#1e3a5f',fontWeight:'500'}}>Powered by Predictive Safety Analytics™</span><span style={{color:'#94a3b8',margin:'0 8px'}}>|</span><span style={{color:'#475569'}}>© 2025 SLP Alaska</span></div>
  </div></div>);
}

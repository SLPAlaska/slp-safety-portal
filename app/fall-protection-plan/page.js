'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://iypezirwdlqpptjpeeyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
);

const COMPANIES = ['A-C Electric','AKE-Line','Apache Corp.','Armstrong Oil & Gas','ASRC Energy Services','CCI-Industrial','Chosen Construction','CINGSA','Coho Enterprises','Conam Construction','ConocoPhillips','Five Star Oilfield Services','Fox Energy Services','G.A. West','GBR Equipment','GLM Energy Services','Graham Industrial Coatings','Harvest Midstream','Hilcorp Alaska','MagTec Alaska','Merkes Builders','Narwhal Exploration','Nordic-Calista','Parker TRS','Peninsula Paving','Pollard Wireline','Ridgeline Oilfield Services','Santos','Summit Excavation','Tesoro Refinery','Yellowjacket','Other'];
const LOCATIONS = ['Kenai','CIO','Beaver Creek','Swanson River','Ninilchik','Nikiski','Other Kenai Asset','Deadhorse','Prudhoe Bay','Kuparuk','Alpine','Willow','ENI','PIKKA','Point Thompson','North Star Island','Endicott','Badami','West Harrison Bay','Other North Slope'];

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
    equipmentInspected:false,personnelTrained:false,approvedByCompetent:false,designedByQualified:false,
    // Rescue Plan fields
    rescueSelfRescuePossible:'',rescueWorkerMobility:'',rescueSelfRescueMethod:'',
    rescueMechEquipAvailable:'',rescueMechEquipType:'',rescueMechEquipLocation:'',rescueMechEquipOperator:'',
    rescueAidedAvailable:'',rescueAidedTeamTrained:'',rescueAidedPersonnel:'',rescueAidedMethod:'',
    rescueEmsDistance:'',rescueEmsPhone:'',rescueSuspensionTraumaKit:'',
    rescueAlertSignal:'',rescueAssemblyPoint:'',rescueTimeTarget:'',rescuePrimaryMethod:'',
    rescueAdditionalNotes:''
  });

  const [wizardStep, setWizardStep] = useState(1); // 1=Environment 2=Height/Task 3=SystemGuide 4=Details 5=Rescue Plan 6=Submit
  const totalSteps = 6;

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

  // Full hierarchy recommendation based on environment + height + task
  const getSystemRecommendation = (env, height, tasks) => {
    const h = parseFloat(height) || 0;

    // LEVEL 1 — Elimination / Passive (always show first)
    const level1 = [];
    if (env === 'scaffolding') level1.push({ key:'guardrails', label:'Guardrail System', why:'Passive — no worker action required. Eliminates fall exposure entirely.' });
    if (env === 'unprotected_edge') level1.push({ key:'guardrails', label:'Guardrail System', why:'Best option — passive barrier prevents fall without worker action.' });
    if (env === 'roof_work') level1.push({ key:'guardrails', label:'Guardrail / Parapet', why:'If parapet ≥39 in. present, fall hazard is eliminated.' });
    if (env === 'excavation') level1.push({ key:'hole_cover', label:'Barricade / Cover', why:'Barrier around excavation edge eliminates exposure.' });

    // LEVEL 2 — Restraint (prevents fall, no clearance math needed)
    const level2 = [];
    if (env === 'aerial_lift') level2.push({ key:'positioning_lanyard', label:'Positioning Lanyard', why:'Keeps worker in basket — prevents ejection. No free-fall clearance needed.' });
    if (['unprotected_edge','roof_work','excavation'].includes(env)) level2.push({ key:'restraint_lanyard', label:'Restraint Lanyard', why:'Physically prevents reaching the edge — fall cannot occur. No clearance calculation required.' });
    if (env === 'scaffolding') level2.push({ key:'restraint_lanyard', label:'Restraint Lanyard', why:'Prevents worker from passing guardrail opening.' });

    // LEVEL 3 — Arrest (practical primary for most field work)
    const level3 = [];
    if (env === 'tower_climbing' || env === 'steel_erection') {
      level3.push({ key:'twin_leg_100', label:'Twin-Leg 100% Tie-Off Lanyard', why:'Maintains continuous connection during transitions — never unclipped.' });
    }
    if (['roof_work','steel_erection','tower_climbing','other','unprotected_edge','confined_space'].includes(env)) {
      level3.push({ key:'srl', label:'Self-Retracting Lifeline (SRL)', why:'Best arrest option — minimizes free-fall, allows mobility, needs ~12 ft clearance.' });
    }
    if (['ladder','tower_climbing'].includes(env)) {
      level3.push({ key:'vertical_lifeline', label:'Vertical Lifeline', why:'Designed for climbing — provides continuous arrest protection on ladders/structures.' });
      level3.push({ key:'ladder_safety', label:'Ladder Safety System (Rail/Cable)', why:'Fixed rail or cable system for permanent ladder protection.' });
    }
    if (['roof_work','steel_erection'].includes(env)) {
      level3.push({ key:'horizontal_lifeline', label:'Horizontal Lifeline', why:'Allows lateral movement across work area with continuous arrest protection.' });
    }
    if (h > 0 && h < 18.5) {
      // Not enough clearance for shock lanyard — push SRL or restraint
      level3.push({ key:'srl', label:'SRL (preferred over shock lanyard here)', why:`At ${h} ft, a 6-ft shock lanyard needs 18.5 ft clearance — you may not have enough. SRL needs ~12 ft.` });
    } else {
      level3.push({ key:'shock_absorbing_lanyard', label:'Shock-Absorbing Lanyard (6 ft)', why:`Standard arrest lanyard — needs 18.5 ft total clearance. ${h > 0 && h < 18.5 ? '⚠️ Clearance may be insufficient at this height.' : 'Verify clearance below.'}` });
    }

    // LEVEL 4 — Catch systems (below worker, steel erection)
    const level4 = [];
    if (env === 'steel_erection') level4.push({ key:'safety_net', label:'Safety Net System', why:'OSHA 1926.502(c) — required for steel erection when other methods infeasible.' });

    // Determine the TOP recommendation
    let topRec = null;
    if (level1.length > 0) topRec = { ...level1[0], tier: 1, tierLabel: '🛑 Elimination / Passive (Most Protective)' };
    else if (level2.length > 0) topRec = { ...level2[0], tier: 2, tierLabel: '🔒 Fall Restraint (Prevents Fall)' };
    else if (level3.length > 0) topRec = { ...level3[0], tier: 3, tierLabel: '🪢 Fall Arrest (Stops Fall)' };

    return { topRec, level1, level2, level3, level4 };
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
        equipment_inspected:formData.equipmentInspected?'Yes':'',personnel_trained:formData.personnelTrained?'Yes':'',approved_by_competent:formData.approvedByCompetent?'Yes':'',designed_by_qualified:formData.designedByQualified?'Yes':'',
        rescue_primary_method:formData.rescuePrimaryMethod,rescue_self_rescue_possible:formData.rescueSelfRescuePossible,rescue_self_rescue_method:formData.rescueSelfRescueMethod,
        rescue_mech_equip_available:formData.rescueMechEquipAvailable,rescue_mech_equip_type:formData.rescueMechEquipType,rescue_mech_equip_location:formData.rescueMechEquipLocation,rescue_mech_equip_operator:formData.rescueMechEquipOperator,
        rescue_aided_available:formData.rescueAidedAvailable,rescue_aided_personnel:formData.rescueAidedPersonnel,rescue_aided_method:formData.rescueAidedMethod,
        rescue_ems_phone:formData.rescueEmsPhone,rescue_suspension_trauma_kit:formData.rescueSuspensionTraumaKit,
        rescue_alert_signal:formData.rescueAlertSignal,rescue_assembly_point:formData.rescueAssemblyPoint,rescue_time_target:formData.rescueTimeTarget,rescue_notes:formData.rescueAdditionalNotes
      }]);
      if(error)throw error;
      setPlanNumber(newPlanNumber);
      setSubmitted(true);
    }catch(e){console.error(e);alert('Error: '+e.message);}finally{setIsSubmitting(false);}
  };

  const resetForm=()=>{setFormData({datesOfWork:'',company:'',location:'',specificLocation:'',workTasks:'',workEnvironment:'',aerialLiftType:'',roofType:'',heightAboveLower:'',landingHazardPresent:'',landingHazardDesc:'',fallHazardTypes:[],fallHazardDetails:'',anchorPointLocation:'',anchorHorizontalOffset:'',anchorAboveDrings:'',userSelectedSystem:'',anchorageType:'',anchorageStrength:'',anchorageLocation:'',bodySupportType:'',positioningDRings:'',freeFallDistance:'6',decelerationDistance:'3.5',workerHeight:'6',safetyBuffer:'3',availableClearance:'',controlledAccessZone:'',warningLineSystem:'',safetyMonitorName:'',emergencyResponsePlan:'',emergencyPhone:'',emergencyEquipmentDetails:'',harnessQty:'0',lanyardQty:'0',srlQty:'0',positioningLanyardQty:'0',restraintLanyardQty:'0',anchorageConnectorQty:'0',connectingDevicesQty:'0',otherEquipment:'',workersProtected:'',additionalWorkers:'',competentPersonName:'',competentPersonSignature:'',qualifiedPersonRequired:'',qualifiedPersonName:'',qualifiedPersonSignature:'',equipmentInspected:false,personnelTrained:false,approvedByCompetent:false,designedByQualified:false,
    rescueSelfRescuePossible:'',rescueWorkerMobility:'',rescueSelfRescueMethod:'',
    rescueMechEquipAvailable:'',rescueMechEquipType:'',rescueMechEquipLocation:'',rescueMechEquipOperator:'',
    rescueAidedAvailable:'',rescueAidedTeamTrained:'',rescueAidedPersonnel:'',rescueAidedMethod:'',
    rescueEmsDistance:'',rescueEmsPhone:'',rescueSuspensionTraumaKit:'',
    rescueAlertSignal:'',rescueAssemblyPoint:'',rescueTimeTarget:'',rescuePrimaryMethod:'',
    rescueAdditionalNotes:''});setComplianceGrade({grade:'',score:0,color:'',issues:[],suggestions:[],canSubmit:false});setSubmitted(false);setShowGuidance(false);};

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
    suggestionCard:{background:'#fffbeb',border:'1px solid #fcd34d',borderRadius:'8px',padding:'12px',marginBottom:'10px'},
    // WIZARD STYLES
    wizardProgress:{display:'flex',alignItems:'center',gap:'0',marginBottom:'30px',padding:'0 10px'},
    wizardStep:{display:'flex',flexDirection:'column',alignItems:'center',flex:1,position:'relative'},
    wizardStepCircle:{width:'36px',height:'36px',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:'700',fontSize:'14px',zIndex:1,position:'relative'},
    wizardStepLine:{position:'absolute',top:'18px',left:'50%',width:'100%',height:'3px',zIndex:0},
    wizardStepLabel:{fontSize:'10px',marginTop:'6px',textAlign:'center',fontWeight:'600',maxWidth:'60px'},
    bigCard:{padding:'20px',border:'3px solid #e5e7eb',borderRadius:'14px',cursor:'pointer',textAlign:'center',transition:'all 0.2s',background:'white',display:'flex',flexDirection:'column',alignItems:'center',gap:'10px'},
    bigCardSelected:{borderColor:'#1e3a8a',background:'linear-gradient(135deg,#dbeafe,#eff6ff)',transform:'scale(1.02)'},
    bigCardIcon:{fontSize:'40px'},
    bigCardLabel:{fontWeight:'700',fontSize:'14px',color:'#1e293b',lineHeight:'1.3'},
    tierCard:{borderRadius:'12px',padding:'16px',marginBottom:'12px',border:'2px solid'},
    tierLabel:{fontWeight:'800',fontSize:'12px',letterSpacing:'0.5px',marginBottom:'10px',display:'flex',alignItems:'center',gap:'6px'},
    recCard:{background:'white',borderRadius:'8px',padding:'12px',marginBottom:'8px',display:'flex',alignItems:'flex-start',gap:'12px',cursor:'pointer',border:'2px solid transparent',transition:'all 0.2s'},
    recCardSelected:{borderColor:'#1e3a8a',background:'#eff6ff'},
    nextBtn:{width:'100%',padding:'16px',background:'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)',color:'white',border:'none',borderRadius:'10px',fontSize:'16px',fontWeight:'700',cursor:'pointer',marginTop:'20px',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'},
    backBtn:{padding:'10px 20px',background:'white',color:'#1e3a8a',border:'2px solid #1e3a8a',borderRadius:'8px',fontSize:'14px',fontWeight:'600',cursor:'pointer'}
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

  // ── WIZARD STEP RENDERER ─────────────────────────────────────────────────────
  const STEPS = ['Environment','Height & Task','Protection','Details','Rescue','Submit'];

  const WizardProgress = () => (
    <div style={s.wizardProgress}>
      {STEPS.map((label,i)=>{
        const num = i+1;
        const done = wizardStep > num;
        const active = wizardStep === num;
        return (
          <div key={num} style={s.wizardStep}>
            {i < STEPS.length-1 && <div style={{...s.wizardStepLine, background: done?'#1e3a8a':'#d1d5db'}}/>}
            <div style={{...s.wizardStepCircle, background: done?'#059669': active?'#1e3a8a':'#d1d5db', color:'white'}}>
              {done ? '✓' : num}
            </div>
            <div style={{...s.wizardStepLabel, color: active?'#1e3a8a': done?'#059669':'#9ca3af'}}>{label}</div>
          </div>
        );
      })}
    </div>
  );

  // STEP 1: Work Environment
  const Step1 = () => (
    <div>
      <div style={{background:'#eff6ff',border:'2px solid #bfdbfe',borderRadius:'10px',padding:'15px',marginBottom:'20px',fontSize:'14px',color:'#1e40af',fontWeight:'600'}}>
        👆 Tap your work environment below. The system will guide you to the safest fall protection for that task.
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))',gap:'12px'}}>
        {WORK_ENVIRONMENTS.map(env=>(
          <div key={env.value}
            onClick={()=>{setFormData(p=>({...p,workEnvironment:env.value}));}}
            style={{...s.bigCard,...(formData.workEnvironment===env.value?s.bigCardSelected:{})}}>
            <div style={s.bigCardIcon}>{env.icon}</div>
            <div style={s.bigCardLabel}>{env.label}</div>
          </div>
        ))}
      </div>
      {formData.workEnvironment==='aerial_lift'&&(
        <div style={{marginTop:'20px'}}>
          <label style={s.label}>Aerial Lift Type</label>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(200px,1fr))',gap:'10px',marginTop:'8px'}}>
            {AERIAL_LIFT_TYPES.map(t=>(
              <div key={t} onClick={()=>setFormData(p=>({...p,aerialLiftType:t}))}
                style={{...s.bigCard,padding:'12px',...(formData.aerialLiftType===t?s.bigCardSelected:{})}}>
                <div style={{fontSize:'13px',fontWeight:'600'}}>{t}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      <button style={{...s.nextBtn,opacity:formData.workEnvironment?1:0.4}} disabled={!formData.workEnvironment}
        onClick={()=>setWizardStep(2)}>
        Next: Height & Task Details →
      </button>
    </div>
  );

  // STEP 2: Height + task type + hazards
  const TASK_TYPES = [
    {value:'inspection',label:'Inspection / Assessment',icon:'🔍'},
    {value:'maintenance',label:'Maintenance / Repair',icon:'🔧'},
    {value:'installation',label:'Installation / Construction',icon:'🏗️'},
    {value:'painting',label:'Painting / Coating',icon:'🎨'},
    {value:'cleaning',label:'Cleaning / Housekeeping',icon:'🧹'},
    {value:'electrical',label:'Electrical Work',icon:'⚡'},
    {value:'rigging',label:'Rigging / Material Handling',icon:'🪝'},
    {value:'erection',label:'Steel / Structure Erection',icon:'🔩'},
    {value:'roofing',label:'Roofing / Membrane Work',icon:'🏠'},
    {value:'other',label:'Other',icon:'📋'},
  ];

  const Step2 = () => {
    const h = parseFloat(formData.heightAboveLower)||0;
    const triggerHeight = 6; // OSHA construction default
    return (
      <div>
        <div style={{background:'#fef3c7',border:'2px solid #f59e0b',borderRadius:'10px',padding:'15px',marginBottom:'20px',fontSize:'13px',color:'#92400e'}}>
          <strong>OSHA Trigger Heights:</strong> Construction (1926) — 6 ft &nbsp;|&nbsp; General Industry (1910) — 4 ft &nbsp;|&nbsp; Scaffolding — 10 ft &nbsp;|&nbsp; Steel Erection — 15 ft
        </div>

        <label style={{...s.label,fontSize:'16px',fontWeight:'700'}}>How high above the lower level will workers be?</label>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:'10px',margin:'12px 0 20px'}}>
          {[['Under 4 ft','<4'],['4–6 ft','4-6'],['6–10 ft','6-10'],['10–15 ft','10-15'],['15–20 ft','15-20'],['20–30 ft','20-30'],['30–50 ft','30-50'],['Over 50 ft','>50']].map(([lbl,val])=>(
            <div key={val} onClick={()=>setFormData(p=>({...p,heightAboveLower:val}))}
              style={{...s.bigCard,padding:'14px',...(formData.heightAboveLower===val?s.bigCardSelected:{})}}>
              <div style={{fontSize:'20px',fontWeight:'800',color:formData.heightAboveLower===val?'#1e3a8a':'#374151'}}>{lbl}</div>
            </div>
          ))}
        </div>

        <label style={{...s.label,fontSize:'16px',fontWeight:'700'}}>What type of task?</label>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:'10px',margin:'12px 0 20px'}}>
          {TASK_TYPES.map(t=>(
            <div key={t.value} onClick={()=>setFormData(p=>({...p,workTasks:t.label}))}
              style={{...s.bigCard,padding:'14px',...(formData.workTasks===t.label?s.bigCardSelected:{})}}>
              <div style={{fontSize:'24px'}}>{t.icon}</div>
              <div style={{fontSize:'12px',fontWeight:'600'}}>{t.label}</div>
            </div>
          ))}
        </div>

        <label style={{...s.label,fontSize:'16px',fontWeight:'700'}}>Landing hazard below?</label>
        <div style={{display:'flex',gap:'12px',margin:'12px 0 20px'}}>
          {[['Yes — Hazardous (concrete, equipment, rebar...)','Yes','#dc2626'],['No — Soft/clear landing','No','#059669']].map(([lbl,val,col])=>(
            <div key={val} onClick={()=>setFormData(p=>({...p,landingHazardPresent:val}))} style={{flex:1,...s.bigCard,padding:'14px',borderColor:formData.landingHazardPresent===val?col:'#e5e7eb',background:formData.landingHazardPresent===val?col+'11':'white'}}>
              <div style={{fontSize:'13px',fontWeight:'700',color:formData.landingHazardPresent===val?col:'#374151'}}>{lbl}</div>
            </div>
          ))}
        </div>
        {formData.landingHazardPresent==='Yes'&&(
          <input type="text" name="landingHazardDesc" value={formData.landingHazardDesc} onChange={handleChange}
            placeholder="Describe the landing hazard (e.g., concrete floor, impalement hazard)..."
            style={{...s.input,marginBottom:'15px'}}/>
        )}

        <div style={{display:'flex',gap:'12px'}}>
          <button style={s.backBtn} onClick={()=>setWizardStep(1)}>← Back</button>
          <button style={{...s.nextBtn,flex:1,opacity:(formData.heightAboveLower&&formData.workTasks)?1:0.4}}
            disabled={!formData.heightAboveLower||!formData.workTasks}
            onClick={()=>setWizardStep(3)}>
            Next: Get My Protection System →
          </button>
        </div>
      </div>
    );
  };

  // STEP 3: System Guide — the heart of the wizard
  const Step3 = () => {
    const rec = getSystemRecommendation(formData.workEnvironment, formData.heightAboveLower, formData.workTasks);
    const envLabel = WORK_ENVIRONMENTS.find(w=>w.value===formData.workEnvironment)?.label || formData.workEnvironment;
    const h = formData.heightAboveLower;

    const TIER_STYLES = {
      1: { border:'#059669', bg:'#ecfdf5', label:'🛑 Level 1 — Elimination / Passive Protection', labelColor:'#065f46', badge:'MOST PROTECTIVE' },
      2: { border:'#1e3a8a', bg:'#eff6ff', label:'🔒 Level 2 — Fall Restraint (Prevents Fall)', labelColor:'#1e3a8a', badge:'PREVENTS FALL' },
      3: { border:'#f59e0b', bg:'#fffbeb', label:'🪢 Level 3 — Fall Arrest (Stops Fall)', labelColor:'#92400e', badge:'PRIMARY FIELD METHOD' },
      4: { border:'#7c3aed', bg:'#f5f3ff', label:'🕸️ Level 4 — Catch Systems', labelColor:'#5b21b6', badge:'SUPPLEMENTAL' },
    };

    const renderTier = (level, tierNum) => {
      if (!level || level.length === 0) return null;
      const ts = TIER_STYLES[tierNum];
      return (
        <div style={{...s.tierCard, borderColor:ts.border, background:ts.bg, marginBottom:'14px'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'10px'}}>
            <div style={{fontWeight:'800',fontSize:'13px',color:ts.labelColor}}>{ts.label}</div>
            <div style={{background:ts.border,color:'white',fontSize:'10px',fontWeight:'700',padding:'3px 8px',borderRadius:'20px'}}>{ts.badge}</div>
          </div>
          {level.map((sys,i)=>(
            <div key={i}
              onClick={()=>{setFormData(p=>({...p,userSelectedSystem:sys.key}));}}
              style={{...s.recCard,...(formData.userSelectedSystem===sys.key?s.recCardSelected:{}),borderColor:formData.userSelectedSystem===sys.key?ts.border:'transparent'}}>
              <div style={{fontSize:'24px',flexShrink:0}}>{formData.userSelectedSystem===sys.key?'✅':'⬜'}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:'700',fontSize:'14px',color:'#1e293b',marginBottom:'3px'}}>{sys.label}</div>
                <div style={{fontSize:'12px',color:'#6b7280',lineHeight:'1.4'}}>{sys.why}</div>
              </div>
            </div>
          ))}
        </div>
      );
    };

    return (
      <div>
        <div style={{background:'linear-gradient(135deg,#1e3a8a,#1e40af)',borderRadius:'12px',padding:'18px',marginBottom:'20px',color:'white'}}>
          <div style={{fontSize:'12px',opacity:0.8,marginBottom:'4px'}}>Based on: {envLabel} at {h} ft</div>
          {rec.topRec ? (
            <div>
              <div style={{fontSize:'11px',background:'rgba(255,255,255,0.2)',display:'inline-block',padding:'2px 10px',borderRadius:'20px',marginBottom:'8px'}}>{rec.topRec.tierLabel}</div>
              <div style={{fontSize:'20px',fontWeight:'800'}}>{rec.topRec.label}</div>
              <div style={{fontSize:'12px',opacity:0.85,marginTop:'4px'}}>{rec.topRec.why}</div>
              <button onClick={()=>setFormData(p=>({...p,userSelectedSystem:rec.topRec.key}))}
                style={{marginTop:'12px',padding:'8px 20px',background:'white',color:'#1e3a8a',border:'none',borderRadius:'8px',fontWeight:'700',cursor:'pointer',fontSize:'13px'}}>
                ✓ Use This System
              </button>
            </div>
          ) : <div style={{fontSize:'16px'}}>Select your environment and height to get a recommendation.</div>}
        </div>

        <div style={{fontSize:'13px',fontWeight:'600',color:'#6b7280',marginBottom:'14px',textAlign:'center'}}>
          OSHA HIERARCHY — Most protective first. Select a system, or tap any option below.
        </div>

        {renderTier(rec.level1, 1)}
        {renderTier(rec.level2, 2)}
        {renderTier(rec.level3, 3)}
        {renderTier(rec.level4, 4)}

        {formData.userSelectedSystem && PROTECTION_SYSTEMS[formData.userSelectedSystem] && (
          <div style={{background:'#f0fdf4',border:'2px solid #22c55e',borderRadius:'10px',padding:'14px',marginTop:'10px'}}>
            <div style={{fontWeight:'700',color:'#166534',marginBottom:'4px'}}>✅ Selected: {PROTECTION_SYSTEMS[formData.userSelectedSystem].name}</div>
            <div style={{fontSize:'13px',color:'#374151'}}>{PROTECTION_SYSTEMS[formData.userSelectedSystem].description}</div>
            {PROTECTION_SYSTEMS[formData.userSelectedSystem].clearanceNeeded && (
              <div style={{marginTop:'8px',padding:'8px 12px',background:'#fef3c7',borderRadius:'6px',fontSize:'12px',color:'#92400e',fontWeight:'600'}}>
                ⚠️ This system requires a fall clearance calculation — you'll complete that in the next step.
              </div>
            )}
          </div>
        )}

        <div style={{display:'flex',gap:'12px',marginTop:'20px'}}>
          <button style={s.backBtn} onClick={()=>setWizardStep(2)}>← Back</button>
          <button style={{...s.nextBtn,flex:1,opacity:formData.userSelectedSystem?1:0.4}}
            disabled={!formData.userSelectedSystem}
            onClick={()=>setWizardStep(4)}>
            Next: Plan Details →
          </button>
        </div>
      </div>
    );
  };

  // STEP 4: Details (anchor, clearance, emergency, equipment)
  const Step4 = () => {
    const needsClearance = PROTECTION_SYSTEMS[formData.userSelectedSystem]?.clearanceNeeded;
    return (
      <div>
        {/* Compliance grade inline */}
        <ComplianceGradeBox/>

        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionPurple}}>⚓ Anchor Point</div>
          <div style={s.formRow}>
            <div style={s.formGroup}><label style={s.label}>Anchorage Type *</label>
              <select name="anchorageType" value={formData.anchorageType} onChange={handleChange} required style={s.select}>
                <option value="">-- Select --</option>
                {['Structural Steel','Concrete Anchor','Engineered Anchor Point','Horizontal Lifeline','Vertical Lifeline','Roof Anchor','Aerial Lift Basket Anchor','Mobile Anchor','Other'].map(o=><option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div style={s.formGroup}><label style={s.label}>Anchorage Strength *</label>
              <select name="anchorageStrength" value={formData.anchorageStrength} onChange={handleChange} required style={s.select}>
                <option value="">-- Select --</option>
                <option value="5,000 lbs per worker">5,000 lbs per worker (Standard)</option>
                <option value="3,600 lbs (Engineered)">3,600 lbs (Engineered System)</option>
                <option value="2x MAF (Certified)">2× Max Arrest Force (Certified)</option>
              </select>
            </div>
          </div>
          <div style={s.formRow}>
            <div style={s.formGroup}><label style={s.label}>Horizontal Offset from Work Area (ft)</label>
              <input type="number" name="anchorHorizontalOffset" value={formData.anchorHorizontalOffset} onChange={handleChange} min="0" step="0.5" placeholder="0 = directly above" style={{...s.input,...(parseFloat(formData.anchorHorizontalOffset)>=6?{borderColor:'#dc2626',background:'#fef2f2'}:parseFloat(formData.anchorHorizontalOffset)>=2?{borderColor:'#f59e0b',background:'#fffbeb'}:{})}}/>
              <small style={{color:parseFloat(formData.anchorHorizontalOffset)>=6?'#dc2626':parseFloat(formData.anchorHorizontalOffset)>=2?'#92400e':'#6b7280',fontSize:'12px'}}>
                {parseFloat(formData.anchorHorizontalOffset)>=6?'🚫 Too far — pendulum hazard':parseFloat(formData.anchorHorizontalOffset)>=2?'⚠️ Swing risk — consider horizontal lifeline':'✓ Acceptable'}
              </small>
            </div>
            <div style={s.formGroup}><label style={s.label}>Body Support Type *</label>
              <select name="bodySupportType" value={formData.bodySupportType} onChange={handleChange} required style={s.select}>
                <option value="">-- Select --</option>
                <option value="Full Body Harness">Full Body Harness</option>
                <option value="Body Belt (Positioning Only)">Body Belt (Positioning Only)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Clearance calc — only if system needs it */}
        {needsClearance && (
          <div style={s.section}><div style={{...s.sectionHeader,background:'linear-gradient(135deg,#f59e0b,#d97706)'}}>📏 Fall Clearance Check</div>
            <div style={{background:'#fef3c7',borderRadius:'8px',padding:'12px',marginBottom:'16px',fontSize:'13px',color:'#92400e'}}>
              <strong>{PROTECTION_SYSTEMS[formData.userSelectedSystem]?.name}</strong> requires adequate clearance below the anchor. The worker must not strike the lower level before the system arrests the fall.
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'12px',marginBottom:'16px'}}>
              <div style={s.formGroup}><label style={s.label}>Free Fall (ft)</label><input type="number" name="freeFallDistance" value={formData.freeFallDistance} onChange={handleChange} min="0" max="6" step="0.5" style={s.input}/><small style={{color:'#6b7280',fontSize:'11px'}}>Max 6 ft (OSHA)</small></div>
              <div style={s.formGroup}><label style={s.label}>Deceleration (ft)</label><input type="number" name="decelerationDistance" value={formData.decelerationDistance} onChange={handleChange} min="0" step="0.5" style={s.input}/><small style={{color:'#6b7280',fontSize:'11px'}}>Typically 3.5 ft</small></div>
              <div style={s.formGroup}><label style={s.label}>Worker Height (ft)</label><input type="number" name="workerHeight" value={formData.workerHeight} onChange={handleChange} min="0" step="0.5" style={s.input}/><small style={{color:'#6b7280',fontSize:'11px'}}>D-ring to feet</small></div>
              <div style={s.formGroup}><label style={s.label}>Safety Buffer (ft)</label><input type="number" name="safetyBuffer" value={formData.safetyBuffer} onChange={handleChange} min="0" step="0.5" style={s.input}/><small style={{color:'#6b7280',fontSize:'11px'}}>3 ft recommended</small></div>
            </div>
            <div style={s.formRow}>
              <div style={s.formGroup}><label style={s.label}>Required Clearance</label><input type="text" value={estimatedClearance.toFixed(1)+' ft'} readOnly style={{...s.input,background:'#f3f4f6',fontWeight:'700',fontSize:'20px'}}/></div>
              <div style={s.formGroup}><label style={s.label}>Available Clearance (ft) *</label>
                <input type="number" name="availableClearance" value={formData.availableClearance} onChange={handleChange} min="0" step="0.5" required placeholder="Measure and enter" style={{...s.input,...(parseFloat(formData.availableClearance)>0&&parseFloat(formData.availableClearance)<estimatedClearance?{borderColor:'#dc2626',background:'#fef2f2'}:{})}}/>
              </div>
            </div>
            {formData.availableClearance && (
              <div style={{padding:'14px',borderRadius:'10px',textAlign:'center',background:parseFloat(formData.availableClearance)>=estimatedClearance?'#dcfce7':'#fee2e2',border:`2px solid ${parseFloat(formData.availableClearance)>=estimatedClearance?'#22c55e':'#dc2626'}`}}>
                <div style={{fontSize:'22px',fontWeight:'800',color:parseFloat(formData.availableClearance)>=estimatedClearance?'#166534':'#991b1b'}}>
                  {parseFloat(formData.availableClearance)>=estimatedClearance?'✅ CLEARANCE ADEQUATE':'🚫 INSUFFICIENT CLEARANCE'}
                </div>
                {parseFloat(formData.availableClearance)<estimatedClearance && (
                  <div style={{marginTop:'10px',display:'flex',gap:'10px',justifyContent:'center',flexWrap:'wrap'}}>
                    {parseFloat(formData.availableClearance)>=12&&<button type="button" onClick={()=>setFormData(p=>({...p,userSelectedSystem:'srl'}))} style={{padding:'8px 16px',background:'#1e3a8a',color:'white',border:'none',borderRadius:'6px',fontSize:'13px',cursor:'pointer',fontWeight:'600'}}>Switch to SRL (~12 ft needed)</button>}
                    <button type="button" onClick={()=>setFormData(p=>({...p,userSelectedSystem:'restraint_lanyard'}))} style={{padding:'8px 16px',background:'#059669',color:'white',border:'none',borderRadius:'6px',fontSize:'13px',cursor:'pointer',fontWeight:'600'}}>Switch to Restraint (no clearance needed)</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionRed}}>🚨 Emergency Response</div>
          <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:'8px',padding:'12px',marginBottom:'15px',fontSize:'13px',color:'#991b1b'}}><strong>Rescue Plan Required (OSHA):</strong> Suspension trauma can occur within minutes of a fall. Rescue must be prompt.</div>
          <div style={s.formGroup}><label style={s.label}>Emergency Response Plan in Place? *</label>
            <div style={s.radioGroup}>
              {['Yes','No'].map(v=><label key={v} style={{...s.radioOption,...(formData.emergencyResponsePlan===v?{...s.radioSelected,borderColor:v==='Yes'?'#059669':'#dc2626'}:{})}}><input type="radio" name="emergencyResponsePlan" value={v} checked={formData.emergencyResponsePlan===v} onChange={handleChange} required/>{v}</label>)}
            </div>
          </div>
          <div style={s.formRow}>
            <div style={s.formGroup}><label style={s.label}>Emergency Phone *</label><input type="tel" name="emergencyPhone" value={formData.emergencyPhone} onChange={handleChange} required placeholder="911 or site number" style={s.input}/></div>
          </div>
          <div style={s.formGroup}><label style={s.label}>Rescue Equipment Available</label><textarea name="emergencyEquipmentDetails" value={formData.emergencyEquipmentDetails} onChange={handleChange} placeholder="e.g., Rescue kit, aerial lift, trained rescue team..." style={s.textarea}/></div>
        </div>

        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionCyan}}>🔧 Equipment Quantities</div>
          <div style={s.equipGrid}>
            {[['harnessQty','Harnesses'],['lanyardQty','Shock Lanyards'],['srlQty','SRLs'],['positioningLanyardQty','Positioning'],['restraintLanyardQty','Restraint'],['anchorageConnectorQty','Anchors']].map(([name,lbl])=>(
              <div key={name} style={s.equipItem}><label style={{fontSize:'12px',color:'#6b7280',marginBottom:'8px',display:'block'}}>{lbl}</label><input type="number" name={name} value={formData[name]} onChange={handleChange} min="0" style={{...s.input,width:'60px',textAlign:'center',fontWeight:'600',margin:'0 auto'}}/></div>
            ))}
          </div>
        </div>

        <div style={{display:'flex',gap:'12px',marginTop:'10px'}}>
          <button style={s.backBtn} onClick={()=>setWizardStep(3)}>← Back</button>
          <button style={{...s.nextBtn,flex:1}} onClick={()=>setWizardStep(5)}>Next: Rescue Plan →</button>
        </div>
      </div>
    );
  };


  // STEP 5: Rescue Plan
  const getRescueRecommendation = (env, height, selectedSystem) => {
    const h = parseFloat(height) || 0;
    const isArrest = PROTECTION_SYSTEMS[selectedSystem]?.category === 'arrest';
    const isHighWork = h >= 20;
    const isVeryHigh = h >= 50;
    const isAerialLift = env === 'aerial_lift';
    const isTower = env === 'tower_climbing';
    const isConfined = env === 'confined_space';
    const isScaffold = env === 'scaffolding';

    // Self-rescue feasibility
    const selfRescueFeasible = isAerialLift || isScaffold || h <= 10;
    const selfRescueMethod = isAerialLift
      ? 'Operate lift to lower platform to ground level. If inoperable, use emergency lowering valve on basket.'
      : isScaffold
        ? 'Climb to nearest scaffold landing/access ladder and descend under own power.'
        : h <= 10
          ? 'If not injured and can reach structure, self-rescue via ladder or fixed access point.'
          : null;

    // Mechanical rescue
    const mechFeasible = isAerialLift || isScaffold || !isConfined;
    const mechBest = isAerialLift
      ? 'Use second aerial lift or scissor lift positioned adjacent to reach suspended worker.'
      : isTower
        ? 'Mechanical ascender/descender device operated by rescuer climbing to worker position.'
        : isConfined
          ? 'Retrieval winch/tripod system — raise worker vertically from confined space entry point.'
          : isHighWork
            ? 'Rescue ladder system, aerial lift, or rope access descent with rescuer attachment.'
            : 'Extension ladder, aerial lift, or portable mechanical advantage system (3:1 Z-rig).';

    // Aided rescue
    const aidedMethod = isVeryHigh || isTower
      ? 'Trained rope access rescue team. Fire department aerial ladder truck if accessible. Helicopter if remote.'
      : isConfined
        ? 'Confined space rescue team with retrieval system. EMS standing by at entry point.'
        : isAerialLift
          ? 'Emergency services with aerial capability. Second aerial lift operated by trained personnel.'
          : 'Fire department aerial platform, trained rescue team with ladder access, or rope rescue system.';

    // Time target
    const timeTarget = isVeryHigh ? '< 10 minutes (suspension trauma risk high at this height)'
      : isConfined ? '< 6 minutes (atmospheric hazard escalation risk)'
        : '< 15 minutes (OSHA prompt rescue standard)';

    // Primary recommended method
    const primaryMethod = selfRescueFeasible ? 'Self-Rescue (Primary) → Mechanical Assist (Backup) → Aided Rescue (Emergency)'
      : mechFeasible ? 'Mechanical Rescue (Primary) → Aided Rescue (Backup)'
        : 'Aided Rescue by Trained Personnel (Primary)';

    return { selfRescueFeasible, selfRescueMethod, mechFeasible, mechBest, aidedMethod, timeTarget, primaryMethod, isConfined, isHighWork, isVeryHigh };
  };

  const Step5Rescue = () => {
    const env = formData.workEnvironment;
    const rec = getRescueRecommendation(env, formData.heightAboveLower, formData.userSelectedSystem);
    const envLabel = WORK_ENVIRONMENTS.find(w=>w.value===env)?.label || env;
    const h = formData.heightAboveLower;
    const selSystem = PROTECTION_SYSTEMS[formData.userSelectedSystem]?.name || 'Not selected';

    // Auto-apply recommendation if primaryMethod not yet set
    const applyRec = () => {
      setFormData(p=>({
        ...p,
        rescuePrimaryMethod: rec.primaryMethod,
        rescueSelfRescuePossible: rec.selfRescueFeasible ? 'Yes' : 'No',
        rescueSelfRescueMethod: rec.selfRescueMethod || '',
        rescueMechEquipAvailable: rec.mechFeasible ? 'Yes' : 'No',
        rescueAidedAvailable: 'Yes',
        rescueAidedMethod: rec.aidedMethod,
        rescueTimeTarget: rec.timeTarget,
        rescueSuspensionTraumaKit: 'Yes',
      }));
    };

    return (
      <div>
        {/* Context Banner */}
        <div style={{background:'linear-gradient(135deg,#991b1b,#b91c1c)',borderRadius:'12px',padding:'18px',marginBottom:'20px',color:'white'}}>
          <div style={{fontWeight:'800',fontSize:'16px',marginBottom:'8px'}}>🚨 Rescue Plan Required by OSHA</div>
          <div style={{fontSize:'12px',opacity:0.85,marginBottom:'12px'}}>
            OSHA 1926.502(d) requires a prompt rescue plan before work begins. Suspension trauma can begin within <strong>3–5 minutes</strong> of a fall arrest event.
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',fontSize:'12px'}}>
            <div style={{background:'rgba(255,255,255,0.15)',borderRadius:'6px',padding:'8px'}}>
              <div style={{fontWeight:'700',marginBottom:'2px'}}>Environment</div>
              <div>{envLabel || 'Not selected'}</div>
            </div>
            <div style={{background:'rgba(255,255,255,0.15)',borderRadius:'6px',padding:'8px'}}>
              <div style={{fontWeight:'700',marginBottom:'2px'}}>Height / System</div>
              <div>{h || '?'} ft &nbsp;|&nbsp; {selSystem}</div>
            </div>
          </div>
        </div>

        {/* Smart Recommendation */}
        {env && (
          <div style={{background:'#eff6ff',border:'2px solid #1e3a8a',borderRadius:'12px',padding:'16px',marginBottom:'20px'}}>
            <div style={{fontWeight:'800',color:'#1e3a8a',marginBottom:'4px',fontSize:'14px'}}>🧠 Recommended Rescue Strategy for This Scenario</div>
            <div style={{fontSize:'13px',color:'#1e40af',fontWeight:'600',marginBottom:'12px'}}>{rec.primaryMethod}</div>
            <div style={{fontSize:'12px',color:'#374151',background:'white',borderRadius:'8px',padding:'10px',marginBottom:'10px'}}>
              <strong>Target Rescue Time:</strong> {rec.timeTarget}
            </div>
            {rec.isVeryHigh && (
              <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:'6px',padding:'8px',fontSize:'12px',color:'#991b1b',marginBottom:'8px'}}>
                ⚠️ <strong>Extreme Height:</strong> At {h} ft, suspension trauma risk is critical. A dedicated rescue standby team is strongly recommended.
              </div>
            )}
            {rec.isConfined && (
              <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:'6px',padding:'8px',fontSize:'12px',color:'#991b1b',marginBottom:'8px'}}>
                ⚠️ <strong>Confined Space:</strong> Retrieval system (tripod + winch) must be pre-rigged at entry point before worker enters. Non-entry rescue is mandatory unless rescuer is trained and equipped.
              </div>
            )}
            <button type="button" onClick={applyRec}
              style={{padding:'10px 20px',background:'#1e3a8a',color:'white',border:'none',borderRadius:'8px',fontWeight:'700',cursor:'pointer',fontSize:'13px',width:'100%'}}>
              ✓ Apply This Rescue Plan (I'll review and customize below)
            </button>
          </div>
        )}

        {/* THREE TIERS */}

        {/* TIER 1 — SELF RESCUE */}
        <div style={{background:'#f0fdf4',border:'2px solid #22c55e',borderRadius:'12px',padding:'16px',marginBottom:'16px'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'12px'}}>
            <div style={{fontWeight:'800',fontSize:'14px',color:'#166534'}}>🧗 Tier 1 — Self-Rescue</div>
            <div style={{fontSize:'10px',background:'#22c55e',color:'white',padding:'3px 8px',borderRadius:'20px',fontWeight:'700'}}>ALWAYS FIRST</div>
          </div>
          <div style={{background:'#dcfce7',borderRadius:'6px',padding:'8px',marginBottom:'12px',fontSize:'12px',color:'#166534'}}>
            The suspended worker rescues themselves using their own mobility, equipment, or accessible structure. No additional personnel required. <strong>Fastest possible rescue — attempt first.</strong>
          </div>

          <div style={{marginBottom:'10px'}}>
            <label style={s.label}>Is self-rescue feasible for this scenario?</label>
            <div style={{display:'flex',gap:'10px'}}>
              {[['Yes — Worker can reach structure or access point','Yes'],['No — Worker will be freely suspended','No'],['Maybe — Depends on injury/conditions','Maybe']].map(([lbl,val])=>(
                <div key={val} onClick={()=>setFormData(p=>({...p,rescueSelfRescuePossible:val}))}
                  style={{flex:1,...s.bigCard,padding:'12px',borderColor:formData.rescueSelfRescuePossible===val?'#22c55e':'#e5e7eb',background:formData.rescueSelfRescuePossible===val?'#dcfce7':'white'}}>
                  <div style={{fontSize:'11px',fontWeight:'700',color:formData.rescueSelfRescuePossible===val?'#166534':'#374151'}}>{lbl}</div>
                </div>
              ))}
            </div>
          </div>

          {rec.selfRescueMethod && (
            <div style={{background:'white',borderRadius:'8px',padding:'10px',marginBottom:'10px',border:'1px solid #bbf7d0'}}>
              <div style={{fontSize:'11px',fontWeight:'700',color:'#166534',marginBottom:'4px'}}>💡 Recommended self-rescue method for {envLabel}:</div>
              <div style={{fontSize:'12px',color:'#374151'}}>{rec.selfRescueMethod}</div>
            </div>
          )}

          <label style={s.label}>Self-Rescue Method / Procedure</label>
          <textarea name="rescueSelfRescueMethod" value={formData.rescueSelfRescueMethod} onChange={handleChange}
            placeholder={rec.selfRescueMethod || 'Describe how the worker can rescue themselves — e.g., reach ladder, operate lift, climb to platform...'}
            style={{...s.textarea,minHeight:'60px',background:'white'}}/>
        </div>

        {/* TIER 2 — MECHANICAL RESCUE */}
        <div style={{background:'#fffbeb',border:'2px solid #f59e0b',borderRadius:'12px',padding:'16px',marginBottom:'16px'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'12px'}}>
            <div style={{fontWeight:'800',fontSize:'14px',color:'#92400e'}}>⚙️ Tier 2 — Mechanically Assisted Rescue</div>
            <div style={{fontSize:'10px',background:'#f59e0b',color:'white',padding:'3px 8px',borderRadius:'20px',fontWeight:'700'}}>IF SELF-RESCUE FAILS</div>
          </div>
          <div style={{background:'#fef3c7',borderRadius:'6px',padding:'8px',marginBottom:'12px',fontSize:'12px',color:'#92400e'}}>
            Use equipment (aerial lift, ladder, rope system, retrieval winch, descender device) to reach and lower the suspended worker. Can often be performed by on-site personnel without specialized rescue training.
          </div>

          <div style={{marginBottom:'10px'}}>
            <label style={s.label}>Is mechanical rescue equipment available on site?</label>
            <div style={{display:'flex',gap:'10px'}}>
              {[['Yes — Equipment on site','Yes'],['No — Must be called in','No']].map(([lbl,val])=>(
                <div key={val} onClick={()=>setFormData(p=>({...p,rescueMechEquipAvailable:val}))}
                  style={{flex:1,...s.bigCard,padding:'12px',borderColor:formData.rescueMechEquipAvailable===val?'#f59e0b':'#e5e7eb',background:formData.rescueMechEquipAvailable===val?'#fef3c7':'white'}}>
                  <div style={{fontSize:'12px',fontWeight:'700',color:formData.rescueMechEquipAvailable===val?'#92400e':'#374151'}}>{lbl}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{background:'white',borderRadius:'8px',padding:'10px',marginBottom:'10px',border:'1px solid #fde68a'}}>
            <div style={{fontSize:'11px',fontWeight:'700',color:'#92400e',marginBottom:'4px'}}>💡 Best mechanical method for {envLabel}:</div>
            <div style={{fontSize:'12px',color:'#374151'}}>{rec.mechBest}</div>
          </div>

          <div style={s.formRow}>
            <div style={s.formGroup}>
              <label style={s.label}>Equipment Type(s)</label>
              <input type="text" name="rescueMechEquipType" value={formData.rescueMechEquipType} onChange={handleChange}
                placeholder="e.g., Aerial lift, tripod/winch, rope descent system, extension ladder..."
                style={{...s.input,background:'white'}}/>
            </div>
            <div style={s.formGroup}>
              <label style={s.label}>Equipment Location on Site</label>
              <input type="text" name="rescueMechEquipLocation" value={formData.rescueMechEquipLocation} onChange={handleChange}
                placeholder="e.g., Equipment yard, Truck 3, Tool crib..."
                style={{...s.input,background:'white'}}/>
            </div>
          </div>
          <div style={s.formGroup}>
            <label style={s.label}>Designated Operator / Rescuer</label>
            <input type="text" name="rescueMechEquipOperator" value={formData.rescueMechEquipOperator} onChange={handleChange}
              placeholder="Name(s) of person trained to operate rescue equipment..."
              style={{...s.input,background:'white'}}/>
          </div>
        </div>

        {/* TIER 3 — AIDED RESCUE */}
        <div style={{background:'#fef2f2',border:'2px solid #dc2626',borderRadius:'12px',padding:'16px',marginBottom:'16px'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'12px'}}>
            <div style={{fontWeight:'800',fontSize:'14px',color:'#991b1b'}}>🚒 Tier 3 — Aided Rescue by Trained Personnel</div>
            <div style={{fontSize:'10px',background:'#dc2626',color:'white',padding:'3px 8px',borderRadius:'20px',fontWeight:'700'}}>EMERGENCY BACKUP</div>
          </div>
          <div style={{background:'#fee2e2',borderRadius:'6px',padding:'8px',marginBottom:'12px',fontSize:'12px',color:'#991b1b'}}>
            Trained rescue personnel (fire dept, rescue team, rope access technicians) are called to assist. This is the slowest option — <strong>suspension trauma risk increases significantly after 5 minutes</strong>. Always have Tiers 1 & 2 ready so Tier 3 is rarely needed.
          </div>

          <div style={{marginBottom:'10px'}}>
            <label style={s.label}>Is a trained rescue team available / on call?</label>
            <div style={{display:'flex',gap:'10px'}}>
              {[['Yes — On site or quick response','Yes'],['No — Must call 911 / EMS','No']].map(([lbl,val])=>(
                <div key={val} onClick={()=>setFormData(p=>({...p,rescueAidedAvailable:val}))}
                  style={{flex:1,...s.bigCard,padding:'12px',borderColor:formData.rescueAidedAvailable===val?'#dc2626':'#e5e7eb',background:formData.rescueAidedAvailable===val?'#fee2e2':'white'}}>
                  <div style={{fontSize:'12px',fontWeight:'700',color:formData.rescueAidedAvailable===val?'#991b1b':'#374151'}}>{lbl}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{background:'white',borderRadius:'8px',padding:'10px',marginBottom:'10px',border:'1px solid #fecaca'}}>
            <div style={{fontSize:'11px',fontWeight:'700',color:'#991b1b',marginBottom:'4px'}}>💡 Recommended aided rescue approach for {envLabel}:</div>
            <div style={{fontSize:'12px',color:'#374151'}}>{rec.aidedMethod}</div>
          </div>

          <div style={s.formRow}>
            <div style={s.formGroup}>
              <label style={s.label}>Rescue Personnel / Team</label>
              <input type="text" name="rescueAidedPersonnel" value={formData.rescueAidedPersonnel} onChange={handleChange}
                placeholder="e.g., Site rescue team, Fire Dept Station 3, Rope access contractor..."
                style={{...s.input,background:'white'}}/>
            </div>
            <div style={s.formGroup}>
              <label style={s.label}>EMS / Emergency Phone</label>
              <input type="tel" name="rescueEmsPhone" value={formData.rescueEmsPhone} onChange={handleChange}
                placeholder="911 or site emergency number"
                style={{...s.input,background:'white'}}/>
            </div>
          </div>
          <div style={s.formGroup}>
            <label style={s.label}>Aided Rescue Procedure</label>
            <textarea name="rescueAidedMethod" value={formData.rescueAidedMethod} onChange={handleChange}
              placeholder={rec.aidedMethod}
              style={{...s.textarea,minHeight:'60px',background:'white'}}/>
          </div>
        </div>

        {/* CRITICAL DETAILS */}
        <div style={{background:'#f8fafc',border:'2px solid #1e3a8a',borderRadius:'12px',padding:'16px',marginBottom:'16px'}}>
          <div style={{fontWeight:'800',fontSize:'14px',color:'#1e3a8a',marginBottom:'14px'}}>📋 Critical Rescue Details</div>

          <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:'8px',padding:'10px',marginBottom:'14px',fontSize:'12px',color:'#991b1b'}}>
            <strong>⚠️ Suspension Trauma (Harness Hang Syndrome):</strong> A conscious worker suspended in a harness can lose consciousness within 3–30 minutes due to blood pooling. Upon rescue, lay victim horizontal immediately — do NOT sit them upright. Have trained first aid available.
          </div>

          <div style={s.formRow}>
            <div style={s.formGroup}>
              <label style={s.label}>Suspension Trauma Kit Available?</label>
              <div style={{display:'flex',gap:'8px'}}>
                {['Yes','No'].map(v=>(
                  <div key={v} onClick={()=>setFormData(p=>({...p,rescueSuspensionTraumaKit:v}))}
                    style={{flex:1,...s.bigCard,padding:'10px',borderColor:formData.rescueSuspensionTraumaKit===v?(v==='Yes'?'#22c55e':'#dc2626'):'#e5e7eb',background:formData.rescueSuspensionTraumaKit===v?(v==='Yes'?'#dcfce7':'#fee2e2'):'white'}}>
                    <div style={{fontSize:'13px',fontWeight:'700',color:formData.rescueSuspensionTraumaKit===v?(v==='Yes'?'#166534':'#991b1b'):'#374151'}}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={s.formGroup}>
              <label style={s.label}>Target Rescue Time</label>
              <input type="text" name="rescueTimeTarget" value={formData.rescueTimeTarget} onChange={handleChange}
                placeholder={rec.timeTarget}
                style={{...s.input,background:'white'}}/>
            </div>
          </div>

          <div style={s.formRow}>
            <div style={s.formGroup}>
              <label style={s.label}>Alert / Distress Signal</label>
              <input type="text" name="rescueAlertSignal" value={formData.rescueAlertSignal} onChange={handleChange}
                placeholder="e.g., Radio: Channel 3 MAYDAY, 3 whistle blasts, air horn..."
                style={{...s.input,background:'white'}}/>
            </div>
            <div style={s.formGroup}>
              <label style={s.label}>Assembly / Staging Point</label>
              <input type="text" name="rescueAssemblyPoint" value={formData.rescueAssemblyPoint} onChange={handleChange}
                placeholder="e.g., Main gate, south parking area, base of structure..."
                style={{...s.input,background:'white'}}/>
            </div>
          </div>

          <div style={s.formGroup}>
            <label style={s.label}>Primary Rescue Method Summary</label>
            <textarea name="rescuePrimaryMethod" value={formData.rescuePrimaryMethod} onChange={handleChange}
              placeholder={rec.primaryMethod}
              style={{...s.textarea,minHeight:'60px',background:'white',fontWeight:'600'}}/>
          </div>

          <div style={s.formGroup}>
            <label style={s.label}>Additional Notes / Site-Specific Considerations</label>
            <textarea name="rescueAdditionalNotes" value={formData.rescueAdditionalNotes} onChange={handleChange}
              placeholder="Remote location, no cell service, helicopter access, extreme weather procedures, nearest hospital..."
              style={{...s.textarea,background:'white'}}/>
          </div>
        </div>

        <div style={{display:'flex',gap:'12px',marginTop:'10px'}}>
          <button style={s.backBtn} type="button" onClick={()=>setWizardStep(4)}>← Back</button>
          <button style={{...s.nextBtn,flex:1,opacity:(formData.rescueSelfRescuePossible&&formData.rescueMechEquipAvailable&&formData.rescueAidedAvailable)?1:0.5}}
            disabled={!formData.rescueSelfRescuePossible||!formData.rescueMechEquipAvailable||!formData.rescueAidedAvailable}
            type="button" onClick={()=>setWizardStep(6)}>
            Next: Sign & Submit →
          </button>
        </div>
      </div>
    );
  };

  // STEP 6: Personnel, signatures, verifications, submit
  const Step5 = () => (
    <div>
      <ComplianceGradeBox/>

      <div style={s.section}><div style={s.sectionHeader}>📋 Job Information</div>
        <div style={s.formRow}>
          <div style={s.formGroup}><label style={s.label}>Date(s) of Work *</label><input type="text" name="datesOfWork" value={formData.datesOfWork} onChange={handleChange} required placeholder="e.g., 03/17/2026" style={s.input}/></div>
          <div style={s.formGroup}><label style={s.label}>Company *</label><select name="company" value={formData.company} onChange={handleChange} required style={s.select}><option value="">-- Select --</option>{COMPANIES.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
        </div>
        <div style={s.formRow}>
          <div style={s.formGroup}><label style={s.label}>Location *</label><select name="location" value={formData.location} onChange={handleChange} required style={s.select}><option value="">-- Select --</option>{LOCATIONS.map(l=><option key={l} value={l}>{l}</option>)}</select></div>
          <div style={s.formGroup}><label style={s.label}>Specific Location</label><input type="text" name="specificLocation" value={formData.specificLocation} onChange={handleChange} placeholder="Building, area, structure..." style={s.input}/></div>
        </div>
        <div style={s.formGroup}><label style={s.label}>Work Description</label><textarea name="workTasks" value={formData.workTasks} onChange={handleChange} placeholder="Describe the work requiring fall protection..." style={s.textarea}/></div>
      </div>

      <div style={s.section}><div style={{...s.sectionHeader,...s.sectionGreen}}>👷 Workers Protected</div>
        <div style={s.formGroup}><label style={s.label}>Workers Using Fall Protection *</label><textarea name="workersProtected" value={formData.workersProtected} onChange={handleChange} required placeholder="Names of all workers using fall protection..." style={s.textarea}/></div>
      </div>

      <div style={s.section}><div style={{...s.sectionHeader,...s.sectionOrange}}>✍️ Signatures</div>
        <div style={s.formRow}>
          <div style={s.formGroup}><label style={s.label}>Competent Person Name *</label><input type="text" name="competentPersonName" value={formData.competentPersonName} onChange={handleChange} required style={s.input}/></div>
          <div style={s.formGroup}><label style={s.label}>Competent Person Signature *</label><input type="text" name="competentPersonSignature" value={formData.competentPersonSignature} onChange={handleChange} required placeholder="Type full name" style={s.input}/></div>
        </div>
      </div>

      <div style={s.section}><div style={{...s.sectionHeader,...s.sectionGreen}}>✅ Final Verifications</div>
        <div>
          {[['equipmentInspected','Equipment inspected prior to use'],['personnelTrained','Personnel trained on fall protection'],['approvedByCompetent','Plan approved by Competent Person']].map(([name,lbl])=>(
            <label key={name} style={{...s.verifyItem,...(formData[name]?s.verifyChecked:{})}}><input type="checkbox" name={name} checked={formData[name]} onChange={handleChange} style={{width:'20px',height:'20px'}}/><span>{lbl}</span></label>
          ))}
        </div>
      </div>

      <div style={{display:'flex',gap:'12px',marginTop:'10px'}}>
        <button style={s.backBtn} type="button" onClick={()=>setWizardStep(5)}>← Back</button>
        <div style={{flex:1}}>
          {complianceGrade.canSubmit ? (
            <button type="submit" disabled={isSubmitting} style={{...s.nextBtn,background:'linear-gradient(135deg,#059669,#047857)',opacity:isSubmitting?0.5:1}}>
              {isSubmitting?'Submitting...':'✓ Submit Fall Protection Plan (Grade: '+complianceGrade.grade+')'}
            </button>
          ) : (
            <div>
              <button type="button" onClick={()=>setShowGuidance(true)} style={{...s.nextBtn,background:'linear-gradient(135deg,#dc2626,#991b1b)'}}>
                🚫 Cannot Submit — Grade: {complianceGrade.grade||'?'} (Must fix issues above)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if(submitted){return(<div style={s.container}><div style={{maxWidth:'600px',margin:'0 auto',paddingTop:'50px'}}><div style={s.successMessage}><div style={{fontSize:'48px',marginBottom:'15px'}}>✓</div><h2 style={{margin:'0 0 10px'}}>Fall Protection Plan Approved & Submitted!</h2><div style={{fontSize:'24px',fontWeight:'700',background:'rgba(255,255,255,0.2)',padding:'10px 20px',borderRadius:'8px',margin:'15px 0',display:'inline-block'}}>{planNumber}</div><p style={{marginBottom:'5px'}}>Compliance Grade: <strong style={{fontSize:'20px'}}>{complianceGrade.grade}</strong> ({complianceGrade.score}/100)</p><p style={{marginBottom:'20px',opacity:0.9}}>Keep this plan number for your records.</p><div style={{display:'flex',gap:'10px',justifyContent:'center',flexWrap:'wrap'}}><button onClick={resetForm} style={{padding:'14px 30px',background:'white',color:'#059669',border:'none',borderRadius:'8px',fontSize:'16px',fontWeight:'600',cursor:'pointer'}}>Create New Plan</button><a href="https://portal.slpalaska.com" style={{padding:'14px 30px',background:'#6b7280',color:'white',border:'none',borderRadius:'8px',fontSize:'16px',fontWeight:'600',textDecoration:'none'}}>Back to Portal</a></div></div></div></div>);}

  return(<div style={s.container}><div style={s.formContainer}>
    <div style={s.header}><a href="https://portal.slpalaska.com" style={{color:'white',textDecoration:'none',fontSize:'14px'}}>← Back to Portal</a><div style={{background:'rgba(255,255,255,0.95)',borderRadius:'12px',padding:'15px',width:'fit-content',margin:'15px auto',boxShadow:'0 4px 15px rgba(0,0,0,0.2)'}}><img src="/Logo.png" alt="SLP Alaska" style={{maxWidth:'180px',height:'auto'}}/></div><h1 style={{margin:'0',fontSize:'26px',fontWeight:'700'}}>Fall Protection Plan</h1><p style={{margin:'10px 0 0',opacity:0.9,fontSize:'14px'}}>OSHA 1926/1910 Compliant — Guided Protection Wizard</p><div style={{display:'inline-block',background:'white',color:'#b91c1c',padding:'5px 15px',borderRadius:'20px',fontSize:'11px',fontWeight:'600',marginTop:'10px'}}>🛡️ HIERARCHY OF CONTROLS</div></div>
    
    <div style={s.content}><form onSubmit={handleSubmit}>
      
      {/* WIZARD PROGRESS */}
      <WizardProgress/>
      {wizardStep===1&&<Step1/>}
      {wizardStep===2&&<Step2/>}
      {wizardStep===3&&<Step3/>}
      {wizardStep===4&&<Step4/>}
      {wizardStep===5&&<Step5Rescue/>}
      {wizardStep===6&&<Step5/>}
      
    </form></div>
    
    <div style={{textAlign:'center',padding:'20px',background:'linear-gradient(to bottom, #f8fafc, #ffffff)',color:'#64748b',fontSize:'11px',borderTop:'1px solid #e2e8f0'}}><span style={{color:'#1e3a5f',fontWeight:'500'}}>AnthroSafe™ Field Driven Safety</span><span style={{color:'#94a3b8',margin:'0 8px'}}>|</span><span style={{color:'#475569'}}>© 2026 SLP Alaska, LLC</span></div>
  </div></div>);
}

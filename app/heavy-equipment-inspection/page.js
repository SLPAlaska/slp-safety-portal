'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://iypezirwdlqpptjpeeyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
);

const COMPANIES = ['A-C Electric','AKE-Line','Apache Corp.','Armstrong Oil & Gas','ASRC Energy Services','CCI-Industrial','Chosen Construction','CINGSA','Coho Enterprises','Conam Construction','ConocoPhillips','Five Star Oilfield Services','Fox Energy Services','G.A. West','GBR Equipment','GLM Energy Services','Graham Industrial Coatings','Harvest Midstream','Hilcorp Alaska','MagTec Alaska','Merkes Builders','Nordic-Calista','Parker TRS','Peninsula Paving','Pollard Wireline','Ridgeline Oilfield Services','Santos','Summit Excavation','Tesoro Refinery','Yellowjacket','Other'];
const LOCATIONS = ['Kenai','CIO','Beaver Creek','Swanson River','Ninilchik','Nikiski','Other Kenai Asset','Deadhorse','Prudhoe Bay','Kuparuk','Alpine','Willow','ENI','PIKKA','Point Thompson','North Star Island','Endicott','Badami','Other North Slope'];
const SHIFTS = ['Day Shift','Night Shift','Swing Shift'];
const EQUIPMENT_TYPES = ['Excavator','Wheel Loader','Track Loader','Bulldozer','Backhoe','Skid Steer','Mini Excavator','Motor Grader','Articulated Hauler','Compactor/Roller','Telehandler','Forklift','Crane','Other'];

const FLUID_ITEMS = [{id:'engineOil',label:'Engine Oil',options:['OK','Low - Added','Needs Attention']},{id:'hydraulicFluid',label:'Hydraulic Fluid',options:['OK','Low - Added','Needs Attention']},{id:'coolant',label:'Coolant',options:['OK','Low - Added','Needs Attention']},{id:'fuel',label:'Fuel Level',options:['Full','3/4','1/2','1/4','Low - Needs Fuel']},{id:'def',label:'DEF (if equipped)',options:['OK','Low - Added','Needs Attention','N/A']}];
const ENGINE_ITEMS = [{id:'leaksCheck',label:'Leaks Check (Oil, Coolant, Hydraulic)',options:['No Leaks','Minor Leak','Major Leak - DNO']},{id:'beltsHoses',label:'Belts and Hoses',options:['OK','Worn','Damaged - DNO']},{id:'airFilter',label:'Air Filter Indicator',options:['OK','Service Soon','Restricted - Service']},{id:'radiator',label:'Radiator/Cooler',options:['OK','Dirty - Clean','Damaged']},{id:'battery',label:'Battery Condition',options:['OK','Corrosion - Clean','Weak - Replace']}];
const LIGHT_ITEMS = [{id:'headlights',label:'Headlights',options:['OK','Needs Repair','N/A']},{id:'workLights',label:'Work Lights',options:['OK','Needs Repair','N/A']},{id:'tailBrake',label:'Tail/Brake Lights',options:['OK','Needs Repair','N/A']},{id:'turnSignals',label:'Turn Signals',options:['OK','Needs Repair','N/A']},{id:'beacon',label:'Beacon/Strobe',options:['OK','Needs Repair','N/A']}];
const SAFETY_ITEMS = [{id:'backupAlarm',label:'Backup Alarm',options:['OK','Not Working - DNO']},{id:'horn',label:'Horn',options:['OK','Not Working']},{id:'mirrors',label:'Mirrors',options:['OK','Damaged/Missing','Needs Adjustment']},{id:'windowsGlass',label:'Windows/Glass',options:['OK','Cracked','Broken - DNO']},{id:'wipers',label:'Wipers/Washers',options:['OK','Worn','Not Working']},{id:'ropsFops',label:'ROPS/FOPS Structure',options:['OK','Damaged - DNO']},{id:'seatSeatbelt',label:'Seat/Seatbelt',options:['OK','Damaged','Not Working - DNO']},{id:'fireExtinguisher',label:'Fire Extinguisher',options:['OK - Charged','Needs Recharge','Missing - DNO']}];
const CONTROL_ITEMS = [{id:'controlsResponse',label:'Controls Response',options:['OK','Sluggish','Not Responding - DNO']},{id:'gauges',label:'Gauges/Instruments',options:['OK','Not Working']},{id:'warningSystems',label:'Warning Systems',options:['OK','Warning Active','Not Working']}];
const TRACK_ITEMS = [{id:'tracksTiresCondition',label:'Tracks/Tires Condition',options:['OK','Worn','Damaged - DNO']},{id:'tracksTiresTension',label:'Track Tension / Tire Pressure',options:['OK','Adjusted','Needs Attention','N/A']},{id:'undercarriage',label:'Undercarriage (Rollers, Idlers, Sprockets)',options:['OK','Worn','Damaged','N/A']}];
const ATTACH_ITEMS = [{id:'bucketBladeCondition',label:'Bucket/Blade Condition',options:['OK','Worn','Damaged','N/A']},{id:'bucketTeeth',label:'Bucket Teeth/Tips',options:['OK','Worn','Missing/Broken','N/A']},{id:'cuttingEdge',label:'Cutting Edge',options:['OK','Worn','Needs Replacement','N/A']},{id:'boomCondition',label:'Boom Condition',options:['OK','Cracked - DNO','N/A']},{id:'stickArm',label:'Stick/Arm Condition',options:['OK','Cracked - DNO','N/A']},{id:'cylinders',label:'Hydraulic Cylinders',options:['OK','Leaking','Damaged - DNO']},{id:'pinsBushings',label:'Pins and Bushings',options:['OK','Worn','Excessive Play - DNO']},{id:'quickCoupler',label:'Quick Coupler',options:['OK','Damaged','N/A']},{id:'attachmentSecure',label:'Attachment Secure',options:['OK','Loose - Tighten','Not Secure - DNO']}];
const OPER_ITEMS = [{id:'swingMechanism',label:'Swing Mechanism',options:['OK','Noisy','Not Working - DNO','N/A']},{id:'brakeFunction',label:'Service Brakes',options:['OK','Weak','Not Working - DNO']},{id:'parkingBrake',label:'Parking Brake',options:['OK','Weak','Not Holding - DNO']},{id:'steeringResponse',label:'Steering Response',options:['OK','Sluggish','Not Responding - DNO']},{id:'travelFunction',label:'Travel Function',options:['OK','Sluggish','Not Working - DNO']},{id:'hydraulicResponse',label:'Hydraulic Response',options:['OK','Slow','Not Working - DNO']},{id:'greasePoints',label:'Grease Points',options:['Greased','Needs Greasing']}];

function getItemStyle(value){
  if(!value)return{};
  if(value.includes('OK')||value.includes('No Leaks')||value==='Full'||value==='Greased'||value==='3/4'||value==='1/2')return{borderColor:'#16a34a',background:'#f0fdf4'};
  if(value.includes('DNO')||value.includes('Major')||value.includes('Broken')||value.includes('Missing'))return{borderColor:'#dc2626',background:'#fef2f2'};
  if(value==='N/A')return{borderColor:'#6b7280',background:'#f9fafb'};
  return{borderColor:'#eab308',background:'#fefce8'};
}

export default function HeavyEquipmentInspection(){
  const [isSubmitting,setIsSubmitting]=useState(false);
  const [submitted,setSubmitted]=useState(false);
  const [formData,setFormData]=useState({
    operatorName:'',date:new Date().toISOString().split('T')[0],shift:'',location:'',company:'',equipmentNumber:'',equipmentType:'',make:'',model:'',hourMeter:'',
    engineOil:'',hydraulicFluid:'',coolant:'',fuel:'',def:'',
    leaksCheck:'',beltsHoses:'',airFilter:'',radiator:'',battery:'',
    headlights:'',workLights:'',tailBrake:'',turnSignals:'',beacon:'',
    backupAlarm:'',horn:'',mirrors:'',windowsGlass:'',wipers:'',ropsFops:'',seatSeatbelt:'',fireExtinguisher:'',
    controlsResponse:'',gauges:'',warningSystems:'',
    tracksTiresCondition:'',tracksTiresTension:'',undercarriage:'',
    bucketBladeCondition:'',bucketTeeth:'',cuttingEdge:'',boomCondition:'',stickArm:'',cylinders:'',pinsBushings:'',quickCoupler:'',attachmentSecure:'',
    swingMechanism:'',brakeFunction:'',parkingBrake:'',steeringResponse:'',travelFunction:'',hydraulicResponse:'',greasePoints:'',
    overallCondition:'',inspectionResult:'',defectsFound:'',defectDescription:'',comments:''
  });

  const handleChange=(e)=>{const{name,value}=e.target;setFormData(p=>({...p,[name]:value}));};

  const handleSubmit=async(e)=>{e.preventDefault();setIsSubmitting(true);
    try{
      const{error}=await supabase.from('heavy_equipment_inspections').insert([{
        operator_name:formData.operatorName,date:formData.date,shift:formData.shift,location:formData.location,company:formData.company,equipment_number:formData.equipmentNumber,equipment_type:formData.equipmentType,make:formData.make,model:formData.model,hour_meter:formData.hourMeter,
        engine_oil:formData.engineOil,hydraulic_fluid:formData.hydraulicFluid,coolant:formData.coolant,fuel:formData.fuel,def:formData.def,
        leaks_check:formData.leaksCheck,belts_hoses:formData.beltsHoses,air_filter:formData.airFilter,radiator:formData.radiator,battery:formData.battery,
        headlights:formData.headlights,work_lights:formData.workLights,tail_brake:formData.tailBrake,turn_signals:formData.turnSignals,beacon:formData.beacon,
        backup_alarm:formData.backupAlarm,horn:formData.horn,mirrors:formData.mirrors,windows_glass:formData.windowsGlass,wipers:formData.wipers,rops_fops:formData.ropsFops,seat_seatbelt:formData.seatSeatbelt,fire_extinguisher:formData.fireExtinguisher,
        controls_response:formData.controlsResponse,gauges:formData.gauges,warning_systems:formData.warningSystems,
        tracks_tires_condition:formData.tracksTiresCondition,tracks_tires_tension:formData.tracksTiresTension,undercarriage:formData.undercarriage,
        bucket_blade_condition:formData.bucketBladeCondition,bucket_teeth:formData.bucketTeeth,cutting_edge:formData.cuttingEdge,boom_condition:formData.boomCondition,stick_arm:formData.stickArm,cylinders:formData.cylinders,pins_bushings:formData.pinsBushings,quick_coupler:formData.quickCoupler,attachment_secure:formData.attachmentSecure,
        swing_mechanism:formData.swingMechanism,brake_function:formData.brakeFunction,parking_brake:formData.parkingBrake,steering_response:formData.steeringResponse,travel_function:formData.travelFunction,hydraulic_response:formData.hydraulicResponse,grease_points:formData.greasePoints,
        overall_condition:formData.overallCondition,inspection_result:formData.inspectionResult,defects_found:formData.defectsFound,defect_description:formData.defectDescription,comments:formData.comments
      }]);
      if(error)throw error;
      setSubmitted(true);
    }catch(e){console.error(e);alert('Error: '+e.message);}finally{setIsSubmitting(false);}
  };

  const resetForm=()=>{setFormData({operatorName:'',date:new Date().toISOString().split('T')[0],shift:'',location:'',company:'',equipmentNumber:'',equipmentType:'',make:'',model:'',hourMeter:'',engineOil:'',hydraulicFluid:'',coolant:'',fuel:'',def:'',leaksCheck:'',beltsHoses:'',airFilter:'',radiator:'',battery:'',headlights:'',workLights:'',tailBrake:'',turnSignals:'',beacon:'',backupAlarm:'',horn:'',mirrors:'',windowsGlass:'',wipers:'',ropsFops:'',seatSeatbelt:'',fireExtinguisher:'',controlsResponse:'',gauges:'',warningSystems:'',tracksTiresCondition:'',tracksTiresTension:'',undercarriage:'',bucketBladeCondition:'',bucketTeeth:'',cuttingEdge:'',boomCondition:'',stickArm:'',cylinders:'',pinsBushings:'',quickCoupler:'',attachmentSecure:'',swingMechanism:'',brakeFunction:'',parkingBrake:'',steeringResponse:'',travelFunction:'',hydraulicResponse:'',greasePoints:'',overallCondition:'',inspectionResult:'',defectsFound:'',defectDescription:'',comments:''});setSubmitted(false);};

  const s={container:{minHeight:'100vh',background:'linear-gradient(135deg, #1e3a8a 0%, #b91c1c 100%)',padding:'20px'},formContainer:{maxWidth:'900px',margin:'0 auto',background:'white',borderRadius:'12px',boxShadow:'0 4px 6px rgba(0,0,0,0.1)',overflow:'hidden'},header:{background:'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)',color:'white',padding:'25px',textAlign:'center'},content:{padding:'25px'},section:{marginBottom:'15px',border:'1px solid #e5e7eb',borderRadius:'10px',overflow:'hidden'},sectionHeader:{color:'white',padding:'10px 15px',fontWeight:'600',fontSize:'14px'},sectionBlue:{background:'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)'},sectionCyan:{background:'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)'},sectionPurple:{background:'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)'},sectionYellow:{background:'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)'},sectionRed:{background:'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)'},sectionGreen:{background:'linear-gradient(135deg, #059669 0%, #047857 100%)'},sectionOrange:{background:'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)'},sectionIndigo:{background:'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)'},sectionTeal:{background:'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)'},sectionBody:{padding:'12px',background:'#f8fafc'},formRow:{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))',gap:'12px',marginBottom:'12px'},formGroup:{display:'flex',flexDirection:'column'},label:{fontWeight:'600',color:'#374151',marginBottom:'4px',fontSize:'13px'},required:{color:'#b91c1c'},input:{padding:'8px 10px',border:'2px solid #d1d5db',borderRadius:'6px',fontSize:'14px'},select:{padding:'8px 10px',border:'2px solid #d1d5db',borderRadius:'6px',fontSize:'14px',background:'white'},textarea:{padding:'8px 10px',border:'2px solid #d1d5db',borderRadius:'6px',fontSize:'14px',minHeight:'60px',resize:'vertical'},infoBox:{background:'#dbeafe',borderLeft:'4px solid #3b82f6',padding:'10px',marginBottom:'12px',fontSize:'13px',borderRadius:'0 6px 6px 0'},inspectionGrid:{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))',gap:'10px'},inspectionItem:{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 12px',background:'white',border:'2px solid #e5e7eb',borderRadius:'8px',gap:'10px'},inspectionSelect:{padding:'6px 10px',border:'1px solid #d1d5db',borderRadius:'6px',fontSize:'13px',minWidth:'140px'},radioGroup:{display:'flex',gap:'15px',flexWrap:'wrap'},radioItem:{display:'flex',alignItems:'center',gap:'8px',padding:'10px 15px',background:'white',border:'2px solid #e5e7eb',borderRadius:'8px',cursor:'pointer',fontSize:'13px',transition:'all 0.2s'},radioItemPass:{borderColor:'#16a34a',background:'#dcfce7'},radioItemFail:{borderColor:'#dc2626',background:'#fee2e2'},submitBtn:{width:'100%',padding:'14px',background:'linear-gradient(135deg, #1e3a8a 0%, #b91c1c 100%)',color:'white',border:'none',borderRadius:'10px',fontSize:'16px',fontWeight:'600',cursor:'pointer',marginTop:'15px'},successMessage:{background:'linear-gradient(135deg, #059669 0%, #047857 100%)',color:'white',padding:'30px',borderRadius:'12px',textAlign:'center',margin:'20px 0'}};

  const InspectionSection=({title,items,color})=>(<div style={s.section}><div style={{...s.sectionHeader,...color}}>{title}</div><div style={s.sectionBody}><div style={s.inspectionGrid}>{items.map(item=><div key={item.id} style={{...s.inspectionItem,...getItemStyle(formData[item.id])}}><span style={{fontSize:'13px',color:'#374151',flex:1}}>{item.label}</span><select name={item.id} value={formData[item.id]} onChange={handleChange} style={s.inspectionSelect}><option value="">Select...</option>{item.options.map(o=><option key={o} value={o}>{o}</option>)}</select></div>)}</div></div></div>);

  if(submitted){return(<div style={s.container}><div style={{maxWidth:'600px',margin:'0 auto',paddingTop:'50px'}}><div style={s.successMessage}><div style={{fontSize:'48px',marginBottom:'15px'}}>✅</div><h2 style={{margin:'0 0 10px'}}>Inspection Submitted!</h2><p style={{marginBottom:'20px'}}>Heavy Equipment Daily Inspection recorded successfully.</p><div style={{display:'flex',gap:'10px',justifyContent:'center',flexWrap:'wrap'}}><button onClick={resetForm} style={{...s.submitBtn,maxWidth:'200px',background:'white',color:'#059669'}}>Submit Another</button><a href="/" style={{...s.submitBtn,maxWidth:'200px',background:'#6b7280',textDecoration:'none',textAlign:'center'}}>Back to Portal</a></div></div></div></div>);}

  return(<div style={s.container}><div style={s.formContainer}>
    <div style={s.header}><a href="/" style={{color:'white',textDecoration:'none',fontSize:'14px'}}>← Back to Portal</a><div style={{background:'rgba(255,255,255,0.95)',borderRadius:'12px',padding:'15px',width:'fit-content',margin:'15px auto',boxShadow:'0 4px 15px rgba(0,0,0,0.2)'}}><img src="/Logo.png" alt="SLP Alaska" style={{maxWidth:'180px',height:'auto'}}/></div><div style={{display:'inline-block',background:'white',color:'#1e3a8a',padding:'5px 14px',borderRadius:'20px',fontWeight:'700',fontSize:'12px',marginBottom:'12px',border:'3px solid white'}}>🚜 DAILY PRE-SHIFT</div><h1 style={{margin:'0 0 5px',fontSize:'20px'}}>Heavy Equipment Daily Inspection</h1><p style={{opacity:0.9,fontSize:'13px'}}>Excavators, Loaders, Dozers & More</p></div>
    
    <div style={s.content}><form onSubmit={handleSubmit}>
      {/* EQUIPMENT & OPERATOR INFO */}
      <div style={s.section}><div style={{...s.sectionHeader,...s.sectionBlue}}>📋 Equipment & Operator Information</div><div style={s.sectionBody}>
        <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Operator Name <span style={s.required}>*</span></label><input type="text" name="operatorName" value={formData.operatorName} onChange={handleChange} required style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Date <span style={s.required}>*</span></label><input type="date" name="date" value={formData.date} onChange={handleChange} required style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Shift <span style={s.required}>*</span></label><select name="shift" value={formData.shift} onChange={handleChange} required style={s.select}><option value="">Select...</option>{SHIFTS.map(sh=><option key={sh} value={sh}>{sh}</option>)}</select></div></div>
        <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Company <span style={s.required}>*</span></label><select name="company" value={formData.company} onChange={handleChange} required style={s.select}><option value="">Select...</option>{COMPANIES.map(c=><option key={c} value={c}>{c}</option>)}</select></div><div style={s.formGroup}><label style={s.label}>Location <span style={s.required}>*</span></label><select name="location" value={formData.location} onChange={handleChange} required style={s.select}><option value="">Select...</option>{LOCATIONS.map(l=><option key={l} value={l}>{l}</option>)}</select></div><div style={s.formGroup}><label style={s.label}>Equipment Number <span style={s.required}>*</span></label><input type="text" name="equipmentNumber" value={formData.equipmentNumber} onChange={handleChange} required placeholder="e.g., EX-001" style={s.input}/></div></div>
        <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Equipment Type <span style={s.required}>*</span></label><select name="equipmentType" value={formData.equipmentType} onChange={handleChange} required style={s.select}><option value="">Select...</option>{EQUIPMENT_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></div><div style={s.formGroup}><label style={s.label}>Make</label><input type="text" name="make" value={formData.make} onChange={handleChange} placeholder="e.g., Caterpillar, Komatsu" style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Model</label><input type="text" name="model" value={formData.model} onChange={handleChange} placeholder="e.g., 320, D6" style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Hour Meter</label><input type="text" name="hourMeter" value={formData.hourMeter} onChange={handleChange} placeholder="e.g., 5432" style={s.input}/></div></div>
      </div></div>
      
      {/* FLUID LEVELS */}
      <div style={s.section}><div style={{...s.sectionHeader,...s.sectionCyan}}>🛢️ Fluid Levels</div><div style={s.sectionBody}>
        <div style={s.infoBox}>ℹ️ Check all fluid levels with engine OFF and on level ground. Top off as needed before operation.</div>
        <InspectionSection title="" items={FLUID_ITEMS} color={{}}/>
      </div></div>
      
      {/* ENGINE & MECHANICAL */}
      <InspectionSection title="⚙️ Engine & Mechanical" items={ENGINE_ITEMS} color={s.sectionPurple}/>
      
      {/* LIGHTS & SIGNALS */}
      <InspectionSection title="💡 Lights & Signals" items={LIGHT_ITEMS} color={s.sectionYellow}/>
      
      {/* SAFETY EQUIPMENT & CAB */}
      <InspectionSection title="🛡️ Safety Equipment & Cab" items={SAFETY_ITEMS} color={s.sectionRed}/>
      
      {/* CONTROLS & INSTRUMENTS */}
      <InspectionSection title="🎛️ Controls & Instruments" items={CONTROL_ITEMS} color={s.sectionGreen}/>
      
      {/* TRACKS/TIRES & UNDERCARRIAGE */}
      <InspectionSection title="🔩 Tracks/Tires & Undercarriage" items={TRACK_ITEMS} color={s.sectionOrange}/>
      
      {/* ATTACHMENTS & WORK EQUIPMENT */}
      <InspectionSection title="🪣 Attachments & Work Equipment" items={ATTACH_ITEMS} color={s.sectionIndigo}/>
      
      {/* OPERATIONAL CHECKS */}
      <div style={s.section}><div style={{...s.sectionHeader,...s.sectionTeal}}>🔄 Operational Checks</div><div style={s.sectionBody}>
        <div style={s.infoBox}>ℹ️ Perform these checks in a safe, open area with engine running. Ensure all personnel are clear.</div>
        <div style={s.inspectionGrid}>{OPER_ITEMS.map(item=><div key={item.id} style={{...s.inspectionItem,...getItemStyle(formData[item.id])}}><span style={{fontSize:'13px',color:'#374151',flex:1}}>{item.label}</span><select name={item.id} value={formData[item.id]} onChange={handleChange} style={s.inspectionSelect}><option value="">Select...</option>{item.options.map(o=><option key={o} value={o}>{o}</option>)}</select></div>)}</div>
      </div></div>
      
      {/* OVERALL & RESULT */}
      <div style={s.section}><div style={{...s.sectionHeader,...s.sectionGreen}}>✅ Overall Condition & Inspection Result</div><div style={s.sectionBody}>
        <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Overall Equipment Condition <span style={s.required}>*</span></label><select name="overallCondition" value={formData.overallCondition} onChange={handleChange} required style={s.select}><option value="">Select...</option><option value="Good">Good - No Issues</option><option value="Fair">Fair - Minor Issues Noted</option><option value="Poor">Poor - Needs Immediate Attention</option></select></div></div>
        <div style={s.formGroup}><label style={s.label}>Inspection Result <span style={s.required}>*</span></label><div style={s.radioGroup}><label style={{...s.radioItem,...(formData.inspectionResult==='Pass - Safe to Operate'?s.radioItemPass:{})}}><input type="radio" name="inspectionResult" value="Pass - Safe to Operate" checked={formData.inspectionResult==='Pass - Safe to Operate'} onChange={handleChange} required/><span>✅ Pass - Safe to Operate</span></label><label style={{...s.radioItem,...(formData.inspectionResult==='Fail - Do Not Operate'?s.radioItemFail:{})}}><input type="radio" name="inspectionResult" value="Fail - Do Not Operate" checked={formData.inspectionResult==='Fail - Do Not Operate'} onChange={handleChange}/><span>❌ Fail - Do Not Operate</span></label></div></div>
        <div style={{...s.formGroup,marginTop:'12px'}}><label style={s.label}>Defects Found? <span style={s.required}>*</span></label><div style={s.radioGroup}><label style={s.radioItem}><input type="radio" name="defectsFound" value="Yes" checked={formData.defectsFound==='Yes'} onChange={handleChange} required/><span>Yes</span></label><label style={s.radioItem}><input type="radio" name="defectsFound" value="No" checked={formData.defectsFound==='No'} onChange={handleChange}/><span>No</span></label></div></div>
        {formData.defectsFound==='Yes'&&<div style={{...s.formGroup,marginTop:'12px'}}><label style={s.label}>Defect Description <span style={s.required}>*</span></label><textarea name="defectDescription" value={formData.defectDescription} onChange={handleChange} required placeholder="Describe all defects found..." style={s.textarea}/></div>}
        <div style={{...s.formGroup,marginTop:'12px'}}><label style={s.label}>Additional Comments</label><textarea name="comments" value={formData.comments} onChange={handleChange} placeholder="Any additional notes or observations..." style={s.textarea}/></div>
      </div></div>
      
      <button type="submit" disabled={isSubmitting} style={{...s.submitBtn,opacity:isSubmitting?0.5:1}}>{isSubmitting?'Submitting...':'Submit Inspection'}</button>
    </form></div>
    
    <div style={{textAlign:'center',padding:'20px',background:'linear-gradient(to bottom, #f8fafc, #ffffff)',color:'#64748b',fontSize:'11px',borderTop:'1px solid #e2e8f0'}}><span style={{color:'#1e3a5f',fontWeight:'500'}}>AnthroSafe™ Powered by Field Driven Data™</span><span style={{color:'#94a3b8',margin:'0 8px'}}>|</span><span style={{color:'#475569'}}>© 2025 SLP Alaska</span></div>
  </div></div>);
}

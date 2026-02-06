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
const FORKLIFT_TYPES = ['Sit-Down Counterbalance (IC)','Sit-Down Counterbalance (Electric)','Stand-Up Counterbalance','Reach Truck','Order Picker','Pallet Jack (Electric)','Pallet Jack (Manual)','Rough Terrain','Telehandler','Walkie Stacker','Other'];

const POWER_ITEMS = [{id:'fuelBattery',label:'Fuel/LPG Level',options:['Full','3/4','1/2','1/4','Low - Needs Fuel']},{id:'engineOil',label:'Engine Oil Level',options:['OK','Low - Added','Needs Attention','N/A']},{id:'hydraulicFluid',label:'Hydraulic Fluid Level',options:['OK','Low - Added','Needs Attention']},{id:'coolant',label:'Coolant Level',options:['OK','Low - Added','Needs Attention','N/A']},{id:'leaksCheck',label:'Leaks Check',options:['No Leaks','Minor Leak','Major Leak - DNO']}];
const ELECTRIC_ITEMS = [{id:'batteryCondition',label:'Battery Condition',options:['OK','Corrosion Present','Damaged - DNO']},{id:'batteryConnections',label:'Battery Connections',options:['OK - Tight','Loose - Tightened','Damaged - DNO']},{id:'electrolyteLevel',label:'Electrolyte Level',options:['OK','Low - Added Water','N/A - Sealed']},{id:'chargerCondition',label:'Charger Condition',options:['OK','Damaged Cord','Not Working']}];
const FORK_ITEMS = [{id:'forksCondition',label:'Forks Condition',options:['OK','Worn','Bent - DNO']},{id:'forksCracks',label:'Forks - Cracks at Heel',options:['None','Cracked - DNO']},{id:'forkPins',label:'Fork Pins/Locks',options:['OK - Secure','Missing - DNO']},{id:'backrest',label:'Load Backrest',options:['OK','Damaged','Missing - DNO']}];
const MAST_ITEMS = [{id:'mastCondition',label:'Mast Condition',options:['OK','Damaged','Cracked - DNO']},{id:'mastChains',label:'Mast Chains',options:['OK - Lubricated','Dry - Needs Lube','Worn/Damaged - DNO']},{id:'carriageRollers',label:'Carriage Rollers',options:['OK','Worn','Damaged - DNO']},{id:'liftCylinders',label:'Lift Cylinders',options:['OK','Leaking','Damaged - DNO']},{id:'tiltCylinders',label:'Tilt Cylinders',options:['OK','Leaking','Damaged - DNO']},{id:'attachmentsSecure',label:'Attachments Secure',options:['OK','Loose','N/A']}];
const TIRE_ITEMS = [{id:'tiresCondition',label:'Tires Condition',options:['OK','Worn','Chunking/Damaged - DNO']},{id:'tirePressure',label:'Tire Pressure (Pneumatic)',options:['OK','Low - Inflated','Flat - DNO','N/A - Solid']},{id:'wheelLugs',label:'Wheel Lugs',options:['OK - Tight','Loose - Tightened','Missing - DNO']}];
const BRAKE_ITEMS = [{id:'serviceBrake',label:'Service Brake',options:['OK','Soft/Spongy','Not Working - DNO']},{id:'parkingBrake',label:'Parking Brake',options:['OK - Holds','Weak','Not Holding - DNO']},{id:'inchingPedal',label:'Inching Pedal',options:['OK','Stiff','Not Working','N/A']},{id:'steeringResponse',label:'Steering Response',options:['OK','Loose/Play','Not Responding - DNO']}];
const CONTROL_ITEMS = [{id:'liftFunction',label:'Lift Function',options:['OK','Slow','Not Working - DNO']},{id:'lowerFunction',label:'Lower Function',options:['OK','Drifts Down','Not Working - DNO']},{id:'tiltFunction',label:'Tilt Function',options:['OK','Slow','Not Working - DNO']},{id:'sideShift',label:'Side Shift (if equipped)',options:['OK','Not Working','N/A']}];
const LIGHT_ITEMS = [{id:'horn',label:'Horn',options:['OK','Not Working - DNO']},{id:'backupAlarm',label:'Backup Alarm',options:['OK','Not Working - DNO']},{id:'headlights',label:'Headlights',options:['OK','Not Working','N/A']},{id:'tailLights',label:'Tail Lights',options:['OK','Not Working','N/A']},{id:'warningLights',label:'Warning Lights',options:['OK - None Active','Warning Active']},{id:'strobeBeacon',label:'Strobe/Beacon',options:['OK','Not Working','N/A']},{id:'mirrors',label:'Mirrors',options:['OK','Damaged/Missing','N/A']}];
const SAFETY_ITEMS = [{id:'overheadGuard',label:'Overhead Guard',options:['OK','Damaged - DNO']},{id:'seatbelt',label:'Seatbelt',options:['OK','Damaged - DNO','N/A']},{id:'seatCondition',label:'Seat Condition',options:['OK','Worn/Torn','Broken - DNO']},{id:'gauges',label:'Gauges/Display',options:['OK','Not Working']},{id:'dataPlate',label:'Data Plate Visible',options:['Yes','No/Illegible']},{id:'capacityPlate',label:'Capacity Plate Visible',options:['Yes','No/Illegible - DNO']},{id:'fireExtinguisher',label:'Fire Extinguisher',options:['OK - Charged','Needs Recharge','Missing','N/A']}];

function getItemStyle(value){
  if(!value)return{};
  if(value.includes('OK')||value.includes('No Leaks')||value==='Full'||value==='Yes'||value==='3/4'||value==='1/2'||value==='None'||value.includes('Secure')||value.includes('Tight')||value.includes('Holds')||value.includes('Lubricated')||value.includes('Charged'))return{borderColor:'#16a34a',background:'#f0fdf4'};
  if(value.includes('DNO')||value.includes('Cracked')||value.includes('Bent')||value.includes('Missing')||value.includes('Broken')||value.includes('Not Working')||value.includes('Not Holding')||value.includes('Not Responding')||value.includes('Flat')||value.includes('Illegible'))return{borderColor:'#dc2626',background:'#fef2f2'};
  if(value==='N/A'||value.includes('Sealed')||value.includes('Solid'))return{borderColor:'#6b7280',background:'#f9fafb'};
  return{borderColor:'#eab308',background:'#fefce8'};
}

export default function ForkliftInspection(){
  const [isSubmitting,setIsSubmitting]=useState(false);
  const [submitted,setSubmitted]=useState(false);
  const [formData,setFormData]=useState({
    operatorName:'',date:new Date().toISOString().split('T')[0],shift:'',location:'',company:'',forkliftNumber:'',forkliftType:'',make:'',model:'',hourMeter:'',
    fuelBattery:'',engineOil:'',hydraulicFluid:'',coolant:'',leaksCheck:'',
    batteryCondition:'',batteryConnections:'',electrolyteLevel:'',chargerCondition:'',
    forksCondition:'',forksCracks:'',forkPins:'',backrest:'',
    mastCondition:'',mastChains:'',carriageRollers:'',liftCylinders:'',tiltCylinders:'',attachmentsSecure:'',
    tiresCondition:'',tirePressure:'',wheelLugs:'',
    serviceBrake:'',parkingBrake:'',inchingPedal:'',steeringResponse:'',
    liftFunction:'',lowerFunction:'',tiltFunction:'',sideShift:'',
    horn:'',backupAlarm:'',headlights:'',tailLights:'',warningLights:'',strobeBeacon:'',mirrors:'',
    overheadGuard:'',seatbelt:'',seatCondition:'',gauges:'',dataPlate:'',capacityPlate:'',fireExtinguisher:'',
    overallCondition:'',inspectionResult:'',defectsFound:'',defectDescription:'',comments:''
  });

  const isElectric=formData.forkliftType.includes('Electric')||formData.forkliftType.includes('Reach')||formData.forkliftType.includes('Order Picker')||formData.forkliftType.includes('Walkie');
  const handleChange=(e)=>{const{name,value}=e.target;setFormData(p=>({...p,[name]:value}));};

  const handleSubmit=async(e)=>{e.preventDefault();setIsSubmitting(true);
    try{
      const{error}=await supabase.from('forklift_inspections').insert([{
        operator_name:formData.operatorName,date:formData.date,shift:formData.shift,location:formData.location,company:formData.company,forklift_number:formData.forkliftNumber,forklift_type:formData.forkliftType,make:formData.make,model:formData.model,hour_meter:formData.hourMeter,
        fuel_battery:formData.fuelBattery,engine_oil:formData.engineOil,hydraulic_fluid:formData.hydraulicFluid,coolant:formData.coolant,leaks_check:formData.leaksCheck,
        battery_condition:formData.batteryCondition,battery_connections:formData.batteryConnections,electrolyte_level:formData.electrolyteLevel,charger_condition:formData.chargerCondition,
        forks_condition:formData.forksCondition,forks_cracks:formData.forksCracks,fork_pins:formData.forkPins,backrest:formData.backrest,
        mast_condition:formData.mastCondition,mast_chains:formData.mastChains,carriage_rollers:formData.carriageRollers,lift_cylinders:formData.liftCylinders,tilt_cylinders:formData.tiltCylinders,attachments_secure:formData.attachmentsSecure,
        tires_condition:formData.tiresCondition,tire_pressure:formData.tirePressure,wheel_lugs:formData.wheelLugs,
        service_brake:formData.serviceBrake,parking_brake:formData.parkingBrake,inching_pedal:formData.inchingPedal,steering_response:formData.steeringResponse,
        lift_function:formData.liftFunction,lower_function:formData.lowerFunction,tilt_function:formData.tiltFunction,side_shift:formData.sideShift,
        horn:formData.horn,backup_alarm:formData.backupAlarm,headlights:formData.headlights,tail_lights:formData.tailLights,warning_lights:formData.warningLights,strobe_beacon:formData.strobeBeacon,mirrors:formData.mirrors,
        overhead_guard:formData.overheadGuard,seatbelt:formData.seatbelt,seat_condition:formData.seatCondition,gauges:formData.gauges,data_plate:formData.dataPlate,capacity_plate:formData.capacityPlate,fire_extinguisher:formData.fireExtinguisher,
        overall_condition:formData.overallCondition,inspection_result:formData.inspectionResult,defects_found:formData.defectsFound,defect_description:formData.defectDescription,comments:formData.comments
      }]);
      if(error)throw error;
      setSubmitted(true);
    }catch(e){console.error(e);alert('Error: '+e.message);}finally{setIsSubmitting(false);}
  };

  const resetForm=()=>{setFormData({operatorName:'',date:new Date().toISOString().split('T')[0],shift:'',location:'',company:'',forkliftNumber:'',forkliftType:'',make:'',model:'',hourMeter:'',fuelBattery:'',engineOil:'',hydraulicFluid:'',coolant:'',leaksCheck:'',batteryCondition:'',batteryConnections:'',electrolyteLevel:'',chargerCondition:'',forksCondition:'',forksCracks:'',forkPins:'',backrest:'',mastCondition:'',mastChains:'',carriageRollers:'',liftCylinders:'',tiltCylinders:'',attachmentsSecure:'',tiresCondition:'',tirePressure:'',wheelLugs:'',serviceBrake:'',parkingBrake:'',inchingPedal:'',steeringResponse:'',liftFunction:'',lowerFunction:'',tiltFunction:'',sideShift:'',horn:'',backupAlarm:'',headlights:'',tailLights:'',warningLights:'',strobeBeacon:'',mirrors:'',overheadGuard:'',seatbelt:'',seatCondition:'',gauges:'',dataPlate:'',capacityPlate:'',fireExtinguisher:'',overallCondition:'',inspectionResult:'',defectsFound:'',defectDescription:'',comments:''});setSubmitted(false);};

  const s={container:{minHeight:'100vh',background:'linear-gradient(135deg, #1e3a8a 0%, #b91c1c 100%)',padding:'20px'},formContainer:{maxWidth:'900px',margin:'0 auto',background:'white',borderRadius:'12px',boxShadow:'0 4px 6px rgba(0,0,0,0.1)',overflow:'hidden'},header:{background:'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)',color:'white',padding:'25px',textAlign:'center'},content:{padding:'25px'},section:{marginBottom:'15px',border:'1px solid #e5e7eb',borderRadius:'10px',overflow:'hidden'},sectionHeader:{color:'white',padding:'10px 15px',fontWeight:'600',fontSize:'14px'},sectionBlue:{background:'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)'},sectionGreen:{background:'linear-gradient(135deg, #16a34a 0%, #15803d 100%)'},sectionYellow:{background:'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)'},sectionOrange:{background:'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)'},sectionPurple:{background:'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)'},sectionCyan:{background:'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)'},sectionRed:{background:'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)'},sectionTeal:{background:'linear-gradient(135deg, #059669 0%, #047857 100%)'},sectionAmber:{background:'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'},sectionIndigo:{background:'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)'},sectionBody:{padding:'12px',background:'#f8fafc'},formRow:{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))',gap:'12px',marginBottom:'12px'},formGroup:{display:'flex',flexDirection:'column'},label:{fontWeight:'600',color:'#374151',marginBottom:'4px',fontSize:'13px'},required:{color:'#b91c1c'},input:{padding:'8px 10px',border:'2px solid #d1d5db',borderRadius:'6px',fontSize:'14px'},select:{padding:'8px 10px',border:'2px solid #d1d5db',borderRadius:'6px',fontSize:'14px',background:'white'},textarea:{padding:'8px 10px',border:'2px solid #d1d5db',borderRadius:'6px',fontSize:'14px',minHeight:'60px',resize:'vertical'},criticalBox:{background:'#fee2e2',borderLeft:'4px solid #dc2626',padding:'10px',marginBottom:'12px',fontSize:'13px',borderRadius:'0 6px 6px 0',color:'#991b1b'},inspectionGrid:{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))',gap:'10px'},inspectionItem:{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 12px',background:'white',border:'2px solid #e5e7eb',borderRadius:'8px',gap:'10px'},inspectionSelect:{padding:'6px 10px',border:'1px solid #d1d5db',borderRadius:'6px',fontSize:'13px',minWidth:'140px'},radioGroup:{display:'flex',gap:'15px',flexWrap:'wrap'},radioItem:{display:'flex',alignItems:'center',gap:'8px',padding:'10px 15px',background:'white',border:'2px solid #e5e7eb',borderRadius:'8px',cursor:'pointer',fontSize:'13px',transition:'all 0.2s'},radioItemPass:{borderColor:'#16a34a',background:'#dcfce7'},radioItemFail:{borderColor:'#dc2626',background:'#fee2e2'},submitBtn:{width:'100%',padding:'14px',background:'linear-gradient(135deg, #1e3a8a 0%, #b91c1c 100%)',color:'white',border:'none',borderRadius:'10px',fontSize:'16px',fontWeight:'600',cursor:'pointer',marginTop:'15px'},successMessage:{background:'linear-gradient(135deg, #059669 0%, #047857 100%)',color:'white',padding:'30px',borderRadius:'12px',textAlign:'center',margin:'20px 0'}};

  const InspectionSection=({title,items,color,critical})=>(<div style={s.section}><div style={{...s.sectionHeader,...color}}>{title}</div><div style={s.sectionBody}>{critical&&<div style={s.criticalBox}>🚨 CRITICAL: {critical}</div>}<div style={s.inspectionGrid}>{items.map(item=><div key={item.id} style={{...s.inspectionItem,...getItemStyle(formData[item.id])}}><span style={{fontSize:'13px',color:'#374151',flex:1}}>{item.id==='fuelBattery'?(isElectric?'Battery Charge Level':item.label):item.label}</span><select name={item.id} value={formData[item.id]} onChange={handleChange} style={s.inspectionSelect}><option value="">Select...</option>{item.options.map(o=><option key={o} value={o}>{o}</option>)}</select></div>)}</div></div></div>);

  if(submitted){return(<div style={s.container}><div style={{maxWidth:'600px',margin:'0 auto',paddingTop:'50px'}}><div style={s.successMessage}><div style={{fontSize:'48px',marginBottom:'15px'}}>✅</div><h2 style={{margin:'0 0 10px'}}>Inspection Submitted!</h2><p style={{marginBottom:'20px'}}>Pre-Shift Forklift Inspection recorded successfully.</p><div style={{display:'flex',gap:'10px',justifyContent:'center',flexWrap:'wrap'}}><button onClick={resetForm} style={{...s.submitBtn,maxWidth:'200px',background:'white',color:'#059669'}}>Submit Another</button><a href="/" style={{...s.submitBtn,maxWidth:'200px',background:'#6b7280',textDecoration:'none',textAlign:'center'}}>Back to Portal</a></div></div></div></div>);}

  return(<div style={s.container}><div style={s.formContainer}>
    <div style={s.header}><a href="/" style={{color:'white',textDecoration:'none',fontSize:'14px'}}>← Back to Portal</a><div style={{background:'rgba(255,255,255,0.95)',borderRadius:'12px',padding:'15px',width:'fit-content',margin:'15px auto',boxShadow:'0 4px 15px rgba(0,0,0,0.2)'}}><img src="/Logo.png" alt="SLP Alaska" style={{maxWidth:'180px',height:'auto'}}/></div><div style={{display:'inline-block',background:'white',color:'#f59e0b',padding:'5px 14px',borderRadius:'20px',fontWeight:'700',fontSize:'12px',marginBottom:'12px',border:'3px solid white'}}>⚠️ OSHA 29 CFR 1910.178</div><h1 style={{margin:'0 0 5px',fontSize:'20px'}}>🚜 Pre-Shift Forklift Inspection</h1><p style={{opacity:0.9,fontSize:'13px'}}>Daily Inspection - All Powered Industrial Trucks</p></div>
    
    <div style={s.content}><form onSubmit={handleSubmit}>
      {/* FORKLIFT & OPERATOR INFO */}
      <div style={s.section}><div style={{...s.sectionHeader,...s.sectionBlue}}>📋 Forklift & Operator Information</div><div style={s.sectionBody}>
        <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Operator Name <span style={s.required}>*</span></label><input type="text" name="operatorName" value={formData.operatorName} onChange={handleChange} required style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Date <span style={s.required}>*</span></label><input type="date" name="date" value={formData.date} onChange={handleChange} required style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Shift <span style={s.required}>*</span></label><select name="shift" value={formData.shift} onChange={handleChange} required style={s.select}><option value="">Select...</option>{SHIFTS.map(sh=><option key={sh} value={sh}>{sh}</option>)}</select></div></div>
        <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Company <span style={s.required}>*</span></label><select name="company" value={formData.company} onChange={handleChange} required style={s.select}><option value="">Select...</option>{COMPANIES.map(c=><option key={c} value={c}>{c}</option>)}</select></div><div style={s.formGroup}><label style={s.label}>Location <span style={s.required}>*</span></label><select name="location" value={formData.location} onChange={handleChange} required style={s.select}><option value="">Select...</option>{LOCATIONS.map(l=><option key={l} value={l}>{l}</option>)}</select></div><div style={s.formGroup}><label style={s.label}>Forklift Number <span style={s.required}>*</span></label><input type="text" name="forkliftNumber" value={formData.forkliftNumber} onChange={handleChange} required placeholder="e.g., FL-001" style={s.input}/></div></div>
        <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Forklift Type <span style={s.required}>*</span></label><select name="forkliftType" value={formData.forkliftType} onChange={handleChange} required style={s.select}><option value="">Select...</option>{FORKLIFT_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></div><div style={s.formGroup}><label style={s.label}>Make</label><input type="text" name="make" value={formData.make} onChange={handleChange} placeholder="e.g., Toyota, Hyster, Crown" style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Model</label><input type="text" name="model" value={formData.model} onChange={handleChange} placeholder="e.g., 8FGU25" style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Hour Meter</label><input type="text" name="hourMeter" value={formData.hourMeter} onChange={handleChange} placeholder="e.g., 5432" style={s.input}/></div></div>
      </div></div>
      
      {/* POWER SOURCE (IC Engine) */}
      <InspectionSection title="⛽ Power Source - Fuel/Fluids (IC Engine)" items={POWER_ITEMS} color={s.sectionGreen}/>
      
      {/* ELECTRIC SECTION */}
      {isElectric&&<InspectionSection title="🔋 Battery & Charging (Electric Units)" items={ELECTRIC_ITEMS} color={s.sectionYellow}/>}
      
      {/* FORKS */}
      <InspectionSection title="🔱 Forks & Load Handling" items={FORK_ITEMS} color={s.sectionOrange} critical="Cracked, bent, or worn forks = DO NOT OPERATE. Forks must be replaced when worn to 90% of original thickness."/>
      
      {/* MAST */}
      <InspectionSection title="🏗️ Mast & Hydraulics" items={MAST_ITEMS} color={s.sectionPurple}/>
      
      {/* TIRES */}
      <InspectionSection title="🛞 Tires & Wheels" items={TIRE_ITEMS} color={s.sectionCyan}/>
      
      {/* BRAKES */}
      <InspectionSection title="🛑 Brakes & Steering" items={BRAKE_ITEMS} color={s.sectionRed} critical="Non-functional brakes or steering = DO NOT OPERATE"/>
      
      {/* CONTROLS */}
      <InspectionSection title="🎮 Controls & Operation" items={CONTROL_ITEMS} color={s.sectionTeal}/>
      
      {/* LIGHTS */}
      <InspectionSection title="💡 Lights & Alarms" items={LIGHT_ITEMS} color={s.sectionAmber}/>
      
      {/* SAFETY */}
      <InspectionSection title="🛡️ Safety Equipment" items={SAFETY_ITEMS} color={s.sectionIndigo}/>
      
      {/* OVERALL & RESULT */}
      <div style={s.section}><div style={{...s.sectionHeader,...s.sectionGreen}}>✅ Overall Condition & Inspection Result</div><div style={s.sectionBody}>
        <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Overall Forklift Condition <span style={s.required}>*</span></label><select name="overallCondition" value={formData.overallCondition} onChange={handleChange} required style={s.select}><option value="">Select...</option><option value="Good">Good - No Issues</option><option value="Fair">Fair - Minor Issues Noted</option><option value="Poor">Poor - Needs Immediate Attention</option></select></div></div>
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

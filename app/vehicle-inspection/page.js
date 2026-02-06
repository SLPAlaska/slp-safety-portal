'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://iypezirwdlqpptjpeeyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
);

const COMPANIES = ['A-C Electric','AKE-Line','Apache Corp.','Armstrong Oil & Gas','ASRC Energy Services','CCI-Industrial','Chosen Construction','CINGSA','Coho Enterprises','Conam Construction','ConocoPhillips','Five Star Oilfield Services','Fox Energy Services','G.A. West','GBR Equipment','GLM Energy Services','Graham Industrial Coatings','Harvest Midstream','Hilcorp Alaska','MagTec Alaska','Merkes Builders','Nordic-Calista','Parker TRS','Peninsula Paving','Pollard Wireline','Ridgeline Oilfield Services','Santos','Summit Excavation','Tesoro Refinery','Yellowjacket','Other'];
const LOCATIONS = ['Kenai','CIO','Beaver Creek','Swanson River','Ninilchik','Nikiski','Other Kenai Asset','Deadhorse','Prudhoe Bay','Kuparuk','Alpine','Willow','ENI','PIKKA','Point Thompson','North Star Island','Endicott','Badami','Other North Slope'];
const VEHICLE_TYPES = ['Pickup Truck','Service Truck','Flatbed Truck','Box Truck','Semi Truck','Tanker Truck','Vacuum Truck','Dump Truck','Water Truck','Crew Cab','SUV','Van','Bus','Other'];

const ENGINE_ITEMS = [{id:'engineCompartment',label:'Engine Compartment (Visual)',options:['OK','Dirty','Issues Found']},{id:'oilLevel',label:'Oil Level',options:['OK','Low - Added','Low - Needs Service']},{id:'coolantLevel',label:'Coolant Level',options:['OK','Low - Added','Low - Needs Service']},{id:'powerSteering',label:'Power Steering Fluid',options:['OK','Low - Added','Low - Needs Service']},{id:'beltsHoses',label:'Belts and Hoses',options:['OK','Worn','Damaged - DNO']},{id:'leaks',label:'Leaks (Oil, Coolant, Fuel)',options:['No Leaks','Minor Leak','Major Leak - DNO']}];
const LIGHT_ITEMS = [{id:'headlights',label:'Headlights (High/Low)',options:['OK','Out - DNO']},{id:'turnSignals',label:'Turn Signals (Front/Rear)',options:['OK','Out - DNO']},{id:'brakeLights',label:'Brake Lights',options:['OK','Out - DNO']},{id:'hazardLights',label:'Hazard/4-Way Flashers',options:['OK','Not Working']},{id:'clearanceLights',label:'Clearance/Marker Lights',options:['OK','Out','N/A']},{id:'reflectors',label:'Reflectors',options:['OK','Missing/Damaged']}];
const CAB_ITEMS = [{id:'horn',label:'Horn',options:['OK','Not Working - DNO']},{id:'windshield',label:'Windshield',options:['OK','Chipped','Cracked - DNO']},{id:'wipers',label:'Wipers/Washers',options:['OK','Worn','Not Working']},{id:'mirrors',label:'Mirrors (All)',options:['OK','Damaged','Missing - DNO']},{id:'steeringPlay',label:'Steering Play',options:['OK - Normal','Excessive Play - DNO']},{id:'brakePedal',label:'Brake Pedal',options:['OK - Firm','Soft/Spongy','Goes to Floor - DNO']},{id:'parkingBrake',label:'Parking Brake',options:['OK - Holds','Weak','Not Holding - DNO']},{id:'clutch',label:'Clutch (if equipped)',options:['OK','Slipping','N/A']},{id:'gauges',label:'Gauges/Instruments',options:['OK','Not Working']},{id:'warningLights',label:'Warning Lights/Indicators',options:['OK - None Active','Warning Active']},{id:'seatbelts',label:'Seatbelts',options:['OK','Damaged - DNO']}];
const SAFETY_ITEMS = [{id:'fireExtinguisher',label:'Fire Extinguisher',options:['OK - Charged','Needs Recharge','Missing - DNO']},{id:'warningTriangles',label:'Warning Triangles/Flares',options:['OK - Present','Missing']},{id:'firstAidKit',label:'First Aid Kit',options:['OK - Stocked','Needs Restock','Missing']}];
const TIRE_ITEMS = [{id:'tiresCondition',label:'Tires Condition',options:['OK','Worn','Damaged - DNO']},{id:'tiresPressure',label:'Tire Pressure',options:['OK','Low - Inflated','Flat - DNO']},{id:'tiresTread',label:'Tread Depth',options:['OK - Adequate','Marginal','Below Minimum - DNO']},{id:'wheelsLugs',label:'Wheel Lugs',options:['OK - Tight','Loose - Tightened','Missing - DNO']},{id:'wheelsDamage',label:'Wheels - Cracks/Damage',options:['OK','Minor Damage','Cracked - DNO']}];
const BRAKE_ITEMS = [{id:'airPressure',label:'Air Pressure Build-Up',options:['OK - Normal','Slow Build','Not Building - DNO','N/A']},{id:'airLeaks',label:'Air Leaks (Listen)',options:['No Leaks','Minor Leak','Major Leak - DNO','N/A']},{id:'slackAdjusters',label:'Slack Adjusters',options:['OK - In Spec','Out of Adjustment','N/A']}];
const TRAILER_ITEMS = [{id:'couplingDevices',label:'Coupling Devices',options:['OK','Worn','Damaged - DNO']},{id:'fifthWheel',label:'Fifth Wheel',options:['OK - Locked','Not Locked - DNO','N/A']},{id:'safetyChains',label:'Safety Chains/Cables',options:['OK - Connected','Damaged','Missing - DNO']},{id:'trailerLights',label:'Trailer Lights',options:['OK','Out - DNO']},{id:'trailerBrakes',label:'Trailer Brakes',options:['OK','Not Working - DNO']},{id:'landingGear',label:'Landing Gear',options:['OK - Raised','Damaged','N/A']}];
const CARGO_ITEMS = [{id:'cargoSecure',label:'Cargo Secure',options:['OK - Secure','Needs Securing','N/A - No Cargo']},{id:'doorsSecure',label:'Doors/Tailgate Secure',options:['OK','Not Latching']},{id:'bodyDamage',label:'Body Damage',options:['None','Minor Damage','Major Damage']}];
const FUEL_ITEMS = [{id:'fuelLevel',label:'Fuel Level',options:['Full','3/4','1/2','1/4','Low - Needs Fuel']},{id:'defLevel',label:'DEF Level (if equipped)',options:['OK','Low - Added','N/A']}];

function getItemStyle(value){
  if(!value)return{};
  if(value.includes('OK')||value.includes('No Leaks')||value==='Full'||value==='None'||value==='3/4'||value==='1/2'||value.includes('Tight')||value.includes('Firm')||value.includes('Holds')||value.includes('Locked')||value.includes('Connected')||value.includes('Raised')||value.includes('Charged')||value.includes('Present')||value.includes('Stocked')||value.includes('Secure')||value.includes('Adequate')||value.includes('Normal')||value.includes('In Spec'))return{borderColor:'#16a34a',background:'#f0fdf4'};
  if(value.includes('DNO')||value.includes('Missing')||value.includes('Not Working')||value.includes('Not Holding')||value.includes('Not Locked')||value.includes('Goes to Floor')||value.includes('Excessive')||value.includes('Out -')||value.includes('Flat')||value.includes('Below Minimum')||value.includes('Not Building')||value.includes('Major'))return{borderColor:'#dc2626',background:'#fef2f2'};
  if(value==='N/A'||value.includes('No Cargo'))return{borderColor:'#6b7280',background:'#f9fafb'};
  return{borderColor:'#eab308',background:'#fefce8'};
}

export default function VehicleInspection(){
  const [isSubmitting,setIsSubmitting]=useState(false);
  const [submitted,setSubmitted]=useState(false);
  const [formData,setFormData]=useState({
    driverName:'',date:new Date().toISOString().split('T')[0],location:'',company:'',vehicleNumber:'',licensePlate:'',vehicleType:'',odometer:'',trailerNumber:'',trailerLicense:'',
    engineCompartment:'',oilLevel:'',coolantLevel:'',powerSteering:'',beltsHoses:'',leaks:'',
    headlights:'',turnSignals:'',brakeLights:'',hazardLights:'',clearanceLights:'',reflectors:'',
    horn:'',windshield:'',wipers:'',mirrors:'',steeringPlay:'',brakePedal:'',parkingBrake:'',clutch:'',gauges:'',warningLights:'',seatbelts:'',
    fireExtinguisher:'',warningTriangles:'',firstAidKit:'',
    tiresCondition:'',tiresPressure:'',tiresTread:'',wheelsLugs:'',wheelsDamage:'',
    airPressure:'',airLeaks:'',slackAdjusters:'',
    couplingDevices:'',fifthWheel:'',safetyChains:'',trailerLights:'',trailerBrakes:'',landingGear:'',
    cargoSecure:'',doorsSecure:'',bodyDamage:'',
    fuelLevel:'',defLevel:'',
    overallCondition:'',inspectionResult:'',defectsFound:'',defectDescription:'',previousDefectsCorrected:'',comments:''
  });

  const hasTrailer=formData.vehicleType.includes('Semi')||formData.vehicleType.includes('Tanker')||formData.vehicleType.includes('Flatbed');
  const handleChange=(e)=>{const{name,value}=e.target;setFormData(p=>({...p,[name]:value}));};

  const handleSubmit=async(e)=>{e.preventDefault();setIsSubmitting(true);
    try{
      const{error}=await supabase.from('vehicle_inspections').insert([{
        driver_name:formData.driverName,date:formData.date,location:formData.location,company:formData.company,vehicle_number:formData.vehicleNumber,license_plate:formData.licensePlate,vehicle_type:formData.vehicleType,odometer:formData.odometer,trailer_number:formData.trailerNumber,trailer_license:formData.trailerLicense,
        engine_compartment:formData.engineCompartment,oil_level:formData.oilLevel,coolant_level:formData.coolantLevel,power_steering:formData.powerSteering,belts_hoses:formData.beltsHoses,leaks:formData.leaks,
        headlights:formData.headlights,turn_signals:formData.turnSignals,brake_lights:formData.brakeLights,hazard_lights:formData.hazardLights,clearance_lights:formData.clearanceLights,reflectors:formData.reflectors,
        horn:formData.horn,windshield:formData.windshield,wipers:formData.wipers,mirrors:formData.mirrors,steering_play:formData.steeringPlay,brake_pedal:formData.brakePedal,parking_brake:formData.parkingBrake,clutch:formData.clutch,gauges:formData.gauges,warning_lights:formData.warningLights,seatbelts:formData.seatbelts,
        fire_extinguisher:formData.fireExtinguisher,warning_triangles:formData.warningTriangles,first_aid_kit:formData.firstAidKit,
        tires_condition:formData.tiresCondition,tires_pressure:formData.tiresPressure,tires_tread:formData.tiresTread,wheels_lugs:formData.wheelsLugs,wheels_damage:formData.wheelsDamage,
        air_pressure:formData.airPressure,air_leaks:formData.airLeaks,slack_adjusters:formData.slackAdjusters,
        coupling_devices:formData.couplingDevices,fifth_wheel:formData.fifthWheel,safety_chains:formData.safetyChains,trailer_lights:formData.trailerLights,trailer_brakes:formData.trailerBrakes,landing_gear:formData.landingGear,
        cargo_secure:formData.cargoSecure,doors_secure:formData.doorsSecure,body_damage:formData.bodyDamage,
        fuel_level:formData.fuelLevel,def_level:formData.defLevel,
        overall_condition:formData.overallCondition,inspection_result:formData.inspectionResult,defects_found:formData.defectsFound,defect_description:formData.defectDescription,previous_defects_corrected:formData.previousDefectsCorrected,comments:formData.comments
      }]);
      if(error)throw error;
      setSubmitted(true);
    }catch(e){console.error(e);alert('Error: '+e.message);}finally{setIsSubmitting(false);}
  };

  const resetForm=()=>{setFormData({driverName:'',date:new Date().toISOString().split('T')[0],location:'',company:'',vehicleNumber:'',licensePlate:'',vehicleType:'',odometer:'',trailerNumber:'',trailerLicense:'',engineCompartment:'',oilLevel:'',coolantLevel:'',powerSteering:'',beltsHoses:'',leaks:'',headlights:'',turnSignals:'',brakeLights:'',hazardLights:'',clearanceLights:'',reflectors:'',horn:'',windshield:'',wipers:'',mirrors:'',steeringPlay:'',brakePedal:'',parkingBrake:'',clutch:'',gauges:'',warningLights:'',seatbelts:'',fireExtinguisher:'',warningTriangles:'',firstAidKit:'',tiresCondition:'',tiresPressure:'',tiresTread:'',wheelsLugs:'',wheelsDamage:'',airPressure:'',airLeaks:'',slackAdjusters:'',couplingDevices:'',fifthWheel:'',safetyChains:'',trailerLights:'',trailerBrakes:'',landingGear:'',cargoSecure:'',doorsSecure:'',bodyDamage:'',fuelLevel:'',defLevel:'',overallCondition:'',inspectionResult:'',defectsFound:'',defectDescription:'',previousDefectsCorrected:'',comments:''});setSubmitted(false);};

  const s={container:{minHeight:'100vh',background:'linear-gradient(135deg, #1e3a8a 0%, #b91c1c 100%)',padding:'20px'},formContainer:{maxWidth:'900px',margin:'0 auto',background:'white',borderRadius:'12px',boxShadow:'0 4px 6px rgba(0,0,0,0.1)',overflow:'hidden'},header:{background:'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)',color:'white',padding:'25px',textAlign:'center'},content:{padding:'25px'},section:{marginBottom:'15px',border:'1px solid #e5e7eb',borderRadius:'10px',overflow:'hidden'},sectionHeader:{color:'white',padding:'10px 15px',fontWeight:'600',fontSize:'14px'},sectionBlue:{background:'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)'},sectionPurple:{background:'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)'},sectionYellow:{background:'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)'},sectionGreen:{background:'linear-gradient(135deg, #059669 0%, #047857 100%)'},sectionRed:{background:'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)'},sectionCyan:{background:'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)'},sectionOrange:{background:'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)'},sectionIndigo:{background:'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)'},sectionTeal:{background:'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)'},sectionBody:{padding:'12px',background:'#f8fafc'},formRow:{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))',gap:'12px',marginBottom:'12px'},formGroup:{display:'flex',flexDirection:'column'},label:{fontWeight:'600',color:'#374151',marginBottom:'4px',fontSize:'13px'},required:{color:'#b91c1c'},input:{padding:'8px 10px',border:'2px solid #d1d5db',borderRadius:'6px',fontSize:'14px'},select:{padding:'8px 10px',border:'2px solid #d1d5db',borderRadius:'6px',fontSize:'14px',background:'white'},textarea:{padding:'8px 10px',border:'2px solid #d1d5db',borderRadius:'6px',fontSize:'14px',minHeight:'60px',resize:'vertical'},criticalBox:{background:'#fee2e2',borderLeft:'4px solid #dc2626',padding:'10px',marginBottom:'12px',fontSize:'13px',borderRadius:'0 6px 6px 0',color:'#991b1b'},inspectionGrid:{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))',gap:'10px'},inspectionItem:{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 12px',background:'white',border:'2px solid #e5e7eb',borderRadius:'8px',gap:'10px'},inspectionSelect:{padding:'6px 10px',border:'1px solid #d1d5db',borderRadius:'6px',fontSize:'13px',minWidth:'140px'},radioGroup:{display:'flex',gap:'15px',flexWrap:'wrap'},radioItem:{display:'flex',alignItems:'center',gap:'8px',padding:'10px 15px',background:'white',border:'2px solid #e5e7eb',borderRadius:'8px',cursor:'pointer',fontSize:'13px',transition:'all 0.2s'},radioItemPass:{borderColor:'#16a34a',background:'#dcfce7'},radioItemFail:{borderColor:'#dc2626',background:'#fee2e2'},submitBtn:{width:'100%',padding:'14px',background:'linear-gradient(135deg, #1e3a8a 0%, #b91c1c 100%)',color:'white',border:'none',borderRadius:'10px',fontSize:'16px',fontWeight:'600',cursor:'pointer',marginTop:'15px'},successMessage:{background:'linear-gradient(135deg, #059669 0%, #047857 100%)',color:'white',padding:'30px',borderRadius:'12px',textAlign:'center',margin:'20px 0'}};

  const InspectionSection=({title,items,color,critical})=>(<div style={s.section}><div style={{...s.sectionHeader,...color}}>{title}</div><div style={s.sectionBody}>{critical&&<div style={s.criticalBox}>🚨 CRITICAL: {critical}</div>}<div style={s.inspectionGrid}>{items.map(item=><div key={item.id} style={{...s.inspectionItem,...getItemStyle(formData[item.id])}}><span style={{fontSize:'13px',color:'#374151',flex:1}}>{item.label}</span><select name={item.id} value={formData[item.id]} onChange={handleChange} style={s.inspectionSelect}><option value="">Select...</option>{item.options.map(o=><option key={o} value={o}>{o}</option>)}</select></div>)}</div></div></div>);

  if(submitted){return(<div style={s.container}><div style={{maxWidth:'600px',margin:'0 auto',paddingTop:'50px'}}><div style={s.successMessage}><div style={{fontSize:'48px',marginBottom:'15px'}}>✅</div><h2 style={{margin:'0 0 10px'}}>Inspection Submitted!</h2><p style={{marginBottom:'20px'}}>Pre-Trip Vehicle Inspection (DVIR) recorded successfully.</p><div style={{display:'flex',gap:'10px',justifyContent:'center',flexWrap:'wrap'}}><button onClick={resetForm} style={{...s.submitBtn,maxWidth:'200px',background:'white',color:'#059669'}}>Submit Another</button><a href="/" style={{...s.submitBtn,maxWidth:'200px',background:'#6b7280',textDecoration:'none',textAlign:'center'}}>Back to Portal</a></div></div></div></div>);}

  return(<div style={s.container}><div style={s.formContainer}>
    <div style={s.header}><a href="/" style={{color:'white',textDecoration:'none',fontSize:'14px'}}>← Back to Portal</a><div style={{background:'rgba(255,255,255,0.95)',borderRadius:'12px',padding:'15px',width:'fit-content',margin:'15px auto',boxShadow:'0 4px 15px rgba(0,0,0,0.2)'}}><img src="/Logo.png" alt="SLP Alaska" style={{maxWidth:'180px',height:'auto'}}/></div><div style={{display:'inline-block',background:'white',color:'#f59e0b',padding:'5px 14px',borderRadius:'20px',fontWeight:'700',fontSize:'12px',marginBottom:'12px',border:'3px solid white'}}>⚠️ DOT/FMCSA | CFR 49 Part 396</div><h1 style={{margin:'0 0 5px',fontSize:'20px'}}>🚛 Pre-Trip Vehicle Inspection</h1><p style={{opacity:0.9,fontSize:'13px'}}>Daily Vehicle Inspection Report (DVIR)</p></div>
    
    <div style={s.content}><form onSubmit={handleSubmit}>
      {/* VEHICLE & DRIVER INFO */}
      <div style={s.section}><div style={{...s.sectionHeader,...s.sectionBlue}}>📋 Vehicle & Driver Information</div><div style={s.sectionBody}>
        <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Driver Name <span style={s.required}>*</span></label><input type="text" name="driverName" value={formData.driverName} onChange={handleChange} required style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Date <span style={s.required}>*</span></label><input type="date" name="date" value={formData.date} onChange={handleChange} required style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Company <span style={s.required}>*</span></label><select name="company" value={formData.company} onChange={handleChange} required style={s.select}><option value="">Select...</option>{COMPANIES.map(c=><option key={c} value={c}>{c}</option>)}</select></div></div>
        <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Location <span style={s.required}>*</span></label><select name="location" value={formData.location} onChange={handleChange} required style={s.select}><option value="">Select...</option>{LOCATIONS.map(l=><option key={l} value={l}>{l}</option>)}</select></div><div style={s.formGroup}><label style={s.label}>Vehicle Number <span style={s.required}>*</span></label><input type="text" name="vehicleNumber" value={formData.vehicleNumber} onChange={handleChange} required placeholder="e.g., V-001" style={s.input}/></div><div style={s.formGroup}><label style={s.label}>License Plate</label><input type="text" name="licensePlate" value={formData.licensePlate} onChange={handleChange} placeholder="e.g., ABC-1234" style={s.input}/></div></div>
        <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Vehicle Type <span style={s.required}>*</span></label><select name="vehicleType" value={formData.vehicleType} onChange={handleChange} required style={s.select}><option value="">Select...</option>{VEHICLE_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></div><div style={s.formGroup}><label style={s.label}>Odometer</label><input type="text" name="odometer" value={formData.odometer} onChange={handleChange} placeholder="e.g., 125000" style={s.input}/></div></div>
      </div></div>
      
      {/* TRAILER INFO (conditional) */}
      {hasTrailer&&<div style={s.section}><div style={{...s.sectionHeader,...s.sectionIndigo}}>🚚 Trailer Information</div><div style={s.sectionBody}>
        <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Trailer Number</label><input type="text" name="trailerNumber" value={formData.trailerNumber} onChange={handleChange} placeholder="e.g., TR-001" style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Trailer License Plate</label><input type="text" name="trailerLicense" value={formData.trailerLicense} onChange={handleChange} placeholder="e.g., TRL-5678" style={s.input}/></div></div>
      </div></div>}
      
      {/* ENGINE */}
      <InspectionSection title="⚙️ Engine Compartment" items={ENGINE_ITEMS} color={s.sectionPurple}/>
      
      {/* LIGHTS */}
      <InspectionSection title="💡 Lights & Signals" items={LIGHT_ITEMS} color={s.sectionYellow}/>
      
      {/* CAB */}
      <InspectionSection title="🚗 Cab Interior & Controls" items={CAB_ITEMS} color={s.sectionGreen}/>
      
      {/* SAFETY EQUIPMENT */}
      <InspectionSection title="🛡️ Safety Equipment" items={SAFETY_ITEMS} color={s.sectionRed}/>
      
      {/* TIRES */}
      <InspectionSection title="🛞 Tires & Wheels" items={TIRE_ITEMS} color={s.sectionCyan} critical="Tread depth must be at least 4/32 inch on steer tires, 2/32 inch on other tires per DOT regulations"/>
      
      {/* BRAKES */}
      <InspectionSection title="🛑 Brakes & Air System" items={BRAKE_ITEMS} color={s.sectionOrange}/>
      
      {/* TRAILER COUPLING (conditional) */}
      {hasTrailer&&<InspectionSection title="🔗 Trailer & Coupling" items={TRAILER_ITEMS} color={s.sectionIndigo}/>}
      
      {/* CARGO */}
      <InspectionSection title="📦 Cargo & Body" items={CARGO_ITEMS} color={s.sectionTeal}/>
      
      {/* FUEL */}
      <InspectionSection title="⛽ Fuel" items={FUEL_ITEMS} color={s.sectionGreen}/>
      
      {/* OVERALL & RESULT */}
      <div style={s.section}><div style={{...s.sectionHeader,...s.sectionGreen}}>✅ Overall Condition & Inspection Result</div><div style={s.sectionBody}>
        <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Overall Vehicle Condition <span style={s.required}>*</span></label><select name="overallCondition" value={formData.overallCondition} onChange={handleChange} required style={s.select}><option value="">Select...</option><option value="Good">Good - No Issues</option><option value="Fair">Fair - Minor Issues Noted</option><option value="Poor">Poor - Needs Immediate Attention</option></select></div></div>
        <div style={s.formGroup}><label style={s.label}>Inspection Result <span style={s.required}>*</span></label><div style={s.radioGroup}><label style={{...s.radioItem,...(formData.inspectionResult==='Pass - Safe to Operate'?s.radioItemPass:{})}}><input type="radio" name="inspectionResult" value="Pass - Safe to Operate" checked={formData.inspectionResult==='Pass - Safe to Operate'} onChange={handleChange} required/><span>✅ Pass - Safe to Operate</span></label><label style={{...s.radioItem,...(formData.inspectionResult==='Fail - Do Not Operate'?s.radioItemFail:{})}}><input type="radio" name="inspectionResult" value="Fail - Do Not Operate" checked={formData.inspectionResult==='Fail - Do Not Operate'} onChange={handleChange}/><span>❌ Fail - Do Not Operate</span></label></div></div>
        <div style={{...s.formRow,marginTop:'12px'}}><div style={s.formGroup}><label style={s.label}>Defects Found? <span style={s.required}>*</span></label><div style={s.radioGroup}><label style={s.radioItem}><input type="radio" name="defectsFound" value="Yes" checked={formData.defectsFound==='Yes'} onChange={handleChange} required/><span>Yes</span></label><label style={s.radioItem}><input type="radio" name="defectsFound" value="No" checked={formData.defectsFound==='No'} onChange={handleChange}/><span>No</span></label></div></div><div style={s.formGroup}><label style={s.label}>Previous Defects Corrected?</label><div style={s.radioGroup}><label style={s.radioItem}><input type="radio" name="previousDefectsCorrected" value="Yes" checked={formData.previousDefectsCorrected==='Yes'} onChange={handleChange}/><span>Yes</span></label><label style={s.radioItem}><input type="radio" name="previousDefectsCorrected" value="No" checked={formData.previousDefectsCorrected==='No'} onChange={handleChange}/><span>No</span></label><label style={s.radioItem}><input type="radio" name="previousDefectsCorrected" value="N/A" checked={formData.previousDefectsCorrected==='N/A'} onChange={handleChange}/><span>N/A</span></label></div></div></div>
        {formData.defectsFound==='Yes'&&<div style={{...s.formGroup,marginTop:'12px'}}><label style={s.label}>Defect Description <span style={s.required}>*</span></label><textarea name="defectDescription" value={formData.defectDescription} onChange={handleChange} required placeholder="Describe all defects found..." style={s.textarea}/></div>}
        <div style={{...s.formGroup,marginTop:'12px'}}><label style={s.label}>Additional Comments</label><textarea name="comments" value={formData.comments} onChange={handleChange} placeholder="Any additional notes or observations..." style={s.textarea}/></div>
      </div></div>
      
      <button type="submit" disabled={isSubmitting} style={{...s.submitBtn,opacity:isSubmitting?0.5:1}}>{isSubmitting?'Submitting...':'Submit Inspection'}</button>
    </form></div>
    
    <div style={{textAlign:'center',padding:'20px',background:'linear-gradient(to bottom, #f8fafc, #ffffff)',color:'#64748b',fontSize:'11px',borderTop:'1px solid #e2e8f0'}}><span style={{color:'#1e3a5f',fontWeight:'500'}}>AnthroSafe™ Powered by Field Driven Data™</span><span style={{color:'#94a3b8',margin:'0 8px'}}>|</span><span style={{color:'#475569'}}>© 2025 SLP Alaska</span></div>
  </div></div>);
}

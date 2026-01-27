'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://iypezirwdlqpptjpeeyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
);

const COMPANIES = ['A-C Electric','AKE-Line','Apache Corp.','Armstrong Oil & Gas','ASRC Energy Services','CCI-Industrial','Chosen Construction','CINGSA','Coho Enterprises','Conam Construction','ConocoPhillips','Five Star Oilfield Services','Fox Energy Services','G.A. West','GBR Equipment','GLM Energy Services','Graham Industrial Coatings','Harvest Midstream','Hilcorp Alaska','MagTec Alaska','Merkes Builders','Nordic-Calista','Parker TRS','Peninsula Paving','Pollard Wireline','Ridgeline Oilfield Services','Santos','Summit Excavation','Tesoro Refinery','Yellowjacket','Other'];
const LOCATIONS = ['Kenai','CIO','Beaver Creek','Swanson River','Ninilchik','Nikiski','Other Kenai Asset','Deadhorse','Prudhoe Bay','Kuparuk','Alpine','Willow','ENI','PIKKA','Point Thompson','North Star Island','Endicott','Badami','Other North Slope'];
const EMPLOYEE_ACTIVITIES = ['Driving','Operating equipment','Manual handling/lifting','Walking/moving on foot','Maintenance work','Loading/unloading','Inspection activities','Stationary work','Other'];
const DRIVING_FACTORS = ['Speed too fast for conditions','Following too closely','Improper backing','Failure to yield','Distracted driving','Fatigue','Poor visibility','Road/weather conditions','Equipment malfunction','Third party action','None - not driving related','Other'];
const TRAVELING_OPTIONS = ['Straight ahead','Turning left','Turning right','Backing','Changing lanes','Parked','Stopped in traffic','Entering/exiting parking','Other'];
const HAZARD_TYPES = ['Pre-existing condition','Created by the employee','Created by a co-worker','Created by a third party','Unknown','Other'];
const PROTECTIVE_METHODS = ['Better training','Pre-job planning/JSA','Spotter/ground guide','Reduced speed','Better communication','Equipment inspection','Defensive driving techniques','Proper PPE','Engineering controls','Better lighting','Mirrors/cameras','None identified','Other'];
const ENERGY_TYPES = ['Gravity (falls, drops, collapse)','Motion (vehicles, moving equipment)','Mechanical (rotating, pinch points)','Electrical (shock, arc flash)','Pressure (hydraulic, pneumatic)','Chemical (toxic, corrosive, flammable)','Temperature (burns, cold exposure)','Other high energy source'];

export default function PropertyDamageReport(){
  const [isSubmitting,setIsSubmitting]=useState(false);
  const [submitted,setSubmitted]=useState(false);
  const [photoPreview,setPhotoPreview]=useState(null);
  const [preTripPreview,setPreTripPreview]=useState(null);
  const [psifResult,setPsifResult]=useState({classification:'',explanation:'',badgeClass:''});
  const [selectedEnergyTypes,setSelectedEnergyTypes]=useState([]);
  const [formData,setFormData]=useState({
    personName:'',incidentDate:new Date().toISOString().split('T')[0],company:'',location:'',
    securityNotified:'',injuriesInvolved:'',spillInvolved:'',spillVolumeOutside:'',totalSpillVolume:'',
    namesContactInvolved:'',weatherLocation:'',witnessNames:'',
    truckVehicleNumber:'',equipmentId:'',vehiclesEquipmentInvolved:'',priorCondition:'',
    equipmentAsIntended:'',lastInspection:'',warningsBeforehand:'',unusualSounds:'',priorIncidents:'',
    describeIncident:'',employeeActivity:'',shortServiceEmployee:'',hazardsCaused:'',
    drivingFactors:'',driverTraveling:'',hazardType:'',dotRightOfWay:'',precipitatingEvents:'',
    appropriatePPE:'',describePPE:'',protectiveMethods:'',procedureErrors:'',
    correctiveActions:'',
    preTripUrl:'',photoUrl:'',
    highEnergyPresent:'',energyReleaseOccurred:'',directControlStatus:'',energyTypes:'',psifClassification:'',stkyEvent:''
  });

  const handleChange=(e)=>{const{name,value}=e.target;setFormData(p=>({...p,[name]:value}));};

  const handleEnergyTypeChange=(type)=>{
    setSelectedEnergyTypes(prev=>{
      if(prev.includes(type)){return prev.filter(t=>t!==type);}
      return[...prev,type];
    });
  };

  // Calculate PSIF classification whenever relevant fields change
  useEffect(()=>{
    calculatePSIF();
  },[formData.highEnergyPresent,formData.energyReleaseOccurred,formData.directControlStatus,selectedEnergyTypes]);

  const calculatePSIF=()=>{
    const{highEnergyPresent,energyReleaseOccurred,directControlStatus}=formData;
    let classification='',explanation='',badgeClass='',isSTKY='No';
    
    if(highEnergyPresent==='No'){
      classification='Non-STKY';
      explanation='✓ Low energy event - not a SIF precursor';
      badgeClass='nonStky';
      isSTKY='No';
    }else if(highEnergyPresent==='Yes'){
      isSTKY='Yes';
      if(directControlStatus==='Yes-Failed'){
        classification='PSIF-Critical';
        explanation='⚠️ CRITICAL: Direct control was in place but FAILED';
        badgeClass='critical';
      }else if(energyReleaseOccurred==='Yes'&&directControlStatus==='No-None'){
        classification='PSIF-Critical';
        explanation='⚠️ High energy released with NO controls in place';
        badgeClass='critical';
      }else if(energyReleaseOccurred==='Yes'&&directControlStatus==='No-Alternative'){
        classification='PSIF-High';
        explanation='⚠️ High energy released - only alternative controls (PPE/procedures) were present';
        badgeClass='high';
      }else if(energyReleaseOccurred==='No'&&(directControlStatus==='No-Alternative'||directControlStatus==='No-None')){
        classification='PSIF-Elevated';
        explanation='⚡ High energy present - direct controls not in place';
        badgeClass='elevated';
      }else if(directControlStatus==='Yes-Effective'){
        classification='STKY-Controlled';
        explanation='✓ High energy present but effectively controlled';
        badgeClass='controlled';
      }else{
        classification='STKY-Evaluate';
        explanation='⚡ High energy identified - complete assessment';
        badgeClass='elevated';
      }
    }
    
    setPsifResult({classification,explanation,badgeClass});
    setFormData(p=>({...p,psifClassification:classification,stkyEvent:isSTKY,energyTypes:selectedEnergyTypes.join(', ')}));
  };

  const handlePhotoChange=(e,type)=>{
    const file=e.target.files[0];
    if(file){
      const reader=new FileReader();
      reader.onload=(ev)=>{
        if(type==='photo'){setPhotoPreview(ev.target.result);setFormData(p=>({...p,photoUrl:ev.target.result}));}
        else{setPreTripPreview(ev.target.result);setFormData(p=>({...p,preTripUrl:ev.target.result}));}
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit=async(e)=>{e.preventDefault();setIsSubmitting(true);
    try{
      const{error}=await supabase.from('property_damage_reports').insert([{
        person_name:formData.personName,incident_date:formData.incidentDate,company:formData.company,location:formData.location,
        security_notified:formData.securityNotified,injuries_involved:formData.injuriesInvolved,
        spill_involved:formData.spillInvolved,spill_volume_outside:formData.spillVolumeOutside||null,total_spill_volume:formData.totalSpillVolume||null,
        names_contact_involved:formData.namesContactInvolved||null,weather_location:formData.weatherLocation,witness_names:formData.witnessNames||null,
        truck_vehicle_number:formData.truckVehicleNumber||null,equipment_id:formData.equipmentId||null,vehicles_equipment_involved:formData.vehiclesEquipmentInvolved||null,
        prior_condition:formData.priorCondition||null,equipment_as_intended:formData.equipmentAsIntended||null,last_inspection:formData.lastInspection||null,
        warnings_beforehand:formData.warningsBeforehand||null,unusual_sounds:formData.unusualSounds||null,prior_incidents:formData.priorIncidents||null,
        describe_incident:formData.describeIncident,employee_activity:formData.employeeActivity,short_service_employee:formData.shortServiceEmployee||null,hazards_caused:formData.hazardsCaused||null,
        driving_factors:formData.drivingFactors||null,driver_traveling:formData.driverTraveling||null,hazard_type:formData.hazardType||null,
        dot_right_of_way:formData.dotRightOfWay||null,precipitating_events:formData.precipitatingEvents||null,
        appropriate_ppe:formData.appropriatePPE||null,describe_ppe:formData.describePPE||null,protective_methods:formData.protectiveMethods||null,procedure_errors:formData.procedureErrors||null,
        corrective_actions:formData.correctiveActions||null,
        pre_trip_url:formData.preTripUrl||null,photo_url:formData.photoUrl||null,
        high_energy_present:formData.highEnergyPresent||null,energy_release_occurred:formData.energyReleaseOccurred||null,
        direct_control_status:formData.directControlStatus||null,energy_types:formData.energyTypes||null,
        psif_classification:formData.psifClassification||null,stky_event:formData.stkyEvent||null
      }]);
      if(error)throw error;
      setSubmitted(true);
    }catch(e){console.error(e);alert('Error: '+e.message);}finally{setIsSubmitting(false);}
  };

  const resetForm=()=>{setFormData({personName:'',incidentDate:new Date().toISOString().split('T')[0],company:'',location:'',securityNotified:'',injuriesInvolved:'',spillInvolved:'',spillVolumeOutside:'',totalSpillVolume:'',namesContactInvolved:'',weatherLocation:'',witnessNames:'',truckVehicleNumber:'',equipmentId:'',vehiclesEquipmentInvolved:'',priorCondition:'',equipmentAsIntended:'',lastInspection:'',warningsBeforehand:'',unusualSounds:'',priorIncidents:'',describeIncident:'',employeeActivity:'',shortServiceEmployee:'',hazardsCaused:'',drivingFactors:'',driverTraveling:'',hazardType:'',dotRightOfWay:'',precipitatingEvents:'',appropriatePPE:'',describePPE:'',protectiveMethods:'',procedureErrors:'',correctiveActions:'',preTripUrl:'',photoUrl:'',highEnergyPresent:'',energyReleaseOccurred:'',directControlStatus:'',energyTypes:'',psifClassification:'',stkyEvent:''});setPhotoPreview(null);setPreTripPreview(null);setSelectedEnergyTypes([]);setPsifResult({classification:'',explanation:'',badgeClass:''});setSubmitted(false);};

  const s={
    container:{minHeight:'100vh',background:'linear-gradient(135deg, #1e3a8a 0%, #b91c1c 100%)',padding:'20px'},
    formBox:{maxWidth:'900px',margin:'0 auto',background:'white',borderRadius:'16px',boxShadow:'0 20px 60px rgba(0,0,0,0.3)',overflow:'hidden'},
    header:{background:'linear-gradient(135deg, #1e3a8a 0%, #b91c1c 100%)',color:'white',padding:'30px',textAlign:'center'},
    logoBox:{background:'rgba(255,255,255,0.95)',borderRadius:'12px',padding:'15px',width:'fit-content',margin:'0 auto 20px',boxShadow:'0 4px 15px rgba(0,0,0,0.2)'},
    badge:{display:'inline-block',background:'white',color:'#b91c1c',padding:'6px 16px',borderRadius:'20px',fontWeight:'700',fontSize:'0.85rem',marginBottom:'15px',border:'3px solid #d97706'},
    content:{padding:'30px'},
    warningBox:{background:'#fef3c7',border:'2px solid #f59e0b',borderRadius:'8px',padding:'15px',marginBottom:'20px',display:'flex',alignItems:'center',gap:'10px'},
    section:{marginBottom:'30px',border:'1px solid #e5e7eb',borderRadius:'12px',overflow:'hidden'},
    sectionHeader:{color:'white',padding:'12px 20px',fontWeight:'600',fontSize:'1rem'},
    sectionBlue:{background:'linear-gradient(135deg, #1e3a8a, #1e40af)'},
    sectionRed:{background:'linear-gradient(135deg, #b91c1c, #dc2626)'},
    sectionOrange:{background:'linear-gradient(135deg, #d97706, #ea580c)'},
    sectionBody:{padding:'20px',background:'#f8fafc'},
    formRow:{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(250px, 1fr))',gap:'20px',marginBottom:'20px'},
    formGroup:{display:'flex',flexDirection:'column'},
    fullWidth:{gridColumn:'1 / -1'},
    label:{fontWeight:'600',color:'#374151',marginBottom:'6px',fontSize:'0.9rem'},
    required:{color:'#b91c1c'},
    input:{padding:'12px 14px',border:'2px solid #d1d5db',borderRadius:'8px',fontSize:'1rem',background:'white'},
    select:{padding:'12px 14px',border:'2px solid #d1d5db',borderRadius:'8px',fontSize:'1rem',background:'white'},
    textarea:{padding:'12px 14px',border:'2px solid #d1d5db',borderRadius:'8px',fontSize:'1rem',minHeight:'100px',resize:'vertical'},
    spillFields:{marginTop:'15px',padding:'15px',background:'#fef3c7',borderRadius:'8px',border:'1px solid #f59e0b'},
    // STKY Styles
    stkySection:{background:'#fef2f2',border:'2px solid #fecaca',borderRadius:'8px',padding:'20px'},
    stkyLabel:{fontWeight:'600',color:'#991b1b',marginBottom:'10px',fontSize:'14px'},
    stkyRow:{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',flexWrap:'wrap',gap:'10px'},
    stkyOptions:{display:'flex',gap:'10px'},
    stkyOption:{padding:'8px 20px',border:'2px solid #d1d5db',borderRadius:'6px',cursor:'pointer',fontWeight:'500',transition:'all 0.2s',background:'white'},
    stkyOptionSelected:{borderColor:'#b91c1c',background:'#fef2f2',color:'#b91c1c'},
    energyGrid:{display:'grid',gridTemplateColumns:'repeat(2, 1fr)',gap:'10px',marginTop:'15px'},
    energyItem:{display:'flex',alignItems:'center',gap:'8px',padding:'8px 12px',background:'white',border:'1px solid #e5e7eb',borderRadius:'6px',fontSize:'13px',cursor:'pointer'},
    energyItemSelected:{borderColor:'#b91c1c',background:'#fef2f2'},
    psifBadge:{marginTop:'15px',padding:'15px 20px',borderRadius:'8px',textAlign:'center',fontWeight:'bold',fontSize:'14px'},
    psifCritical:{background:'#fecaca',color:'#991b1b',border:'2px solid #dc2626'},
    psifHigh:{background:'#fed7aa',color:'#9a3412',border:'2px solid #ea580c'},
    psifElevated:{background:'#fef3c7',color:'#92400e',border:'2px solid #f59e0b'},
    psifControlled:{background:'#d1fae5',color:'#065f46',border:'2px solid #22c55e'},
    psifNonStky:{background:'#dbeafe',color:'#1e40af',border:'2px solid #3b82f6'},
    photoUpload:{border:'2px dashed #d1d5db',borderRadius:'8px',padding:'30px',textAlign:'center',background:'white',cursor:'pointer'},
    photoUploadActive:{borderColor:'#059669',background:'rgba(5,150,105,0.05)'},
    photoPreview:{maxWidth:'200px',maxHeight:'150px',margin:'10px auto',borderRadius:'8px'},
    submitBtn:{width:'100%',padding:'16px 32px',background:'linear-gradient(135deg, #b91c1c, #dc2626)',color:'white',border:'none',borderRadius:'10px',fontSize:'1.1rem',fontWeight:'600',cursor:'pointer',boxShadow:'0 4px 15px rgba(185,28,28,0.3)'},
    successBox:{background:'linear-gradient(135deg, #059669 0%, #047857 100%)',color:'white',padding:'40px',borderRadius:'12px',textAlign:'center',margin:'20px'},
    footer:{textAlign:'center',padding:'20px',background:'linear-gradient(to bottom, #f8fafc, #ffffff)',color:'#64748b',fontSize:'11px',borderTop:'1px solid #e2e8f0'}
  };

  const getPsifBadgeStyle=()=>{
    switch(psifResult.badgeClass){
      case'critical':return s.psifCritical;
      case'high':return s.psifHigh;
      case'elevated':return s.psifElevated;
      case'controlled':return s.psifControlled;
      case'nonStky':return s.psifNonStky;
      default:return{};
    }
  };

  if(submitted){return(<div style={s.container}><div style={{maxWidth:'600px',margin:'0 auto',paddingTop:'50px'}}><div style={s.successBox}><div style={{fontSize:'4rem',marginBottom:'20px'}}>✅</div><h2 style={{margin:'0 0 10px'}}>Report Submitted Successfully!</h2><p style={{marginBottom:'20px'}}>Your property damage report has been recorded.</p><div style={{display:'flex',gap:'10px',justifyContent:'center',flexWrap:'wrap'}}><button onClick={resetForm} style={{padding:'12px 24px',background:'white',color:'#059669',border:'none',borderRadius:'8px',fontSize:'1rem',fontWeight:'600',cursor:'pointer'}}>Submit Another Report</button><a href="/" style={{padding:'12px 24px',background:'rgba(255,255,255,0.2)',color:'white',border:'none',borderRadius:'8px',fontSize:'1rem',fontWeight:'600',textDecoration:'none'}}>Back to Portal</a></div></div></div></div>);}

  return(<div style={s.container}><div style={s.formBox}>
    <div style={s.header}>
      <a href="/" style={{color:'white',textDecoration:'none',fontSize:'14px'}}>← Back to Portal</a>
      <div style={s.logoBox}><img src="/Logo.png" alt="SLP Alaska" style={{maxWidth:'200px',height:'auto'}}/></div>
      <div style={s.badge}>⚠️ PROPERTY DAMAGE REPORT</div>
      <h1 style={{fontSize:'1.5rem',marginBottom:'8px',textShadow:'2px 2px 4px rgba(0,0,0,0.3)'}}>Property Damage Report</h1>
      <p style={{opacity:0.95,fontSize:'1rem'}}>SLP Alaska Safety Management System</p>
    </div>
    
    <div style={s.content}>
      <div style={s.warningBox}><span style={{fontSize:'1.5rem'}}>⚠️</span><span>Please complete this form as thoroughly as possible. All incidents must be reported promptly.</span></div>
      
      <form onSubmit={handleSubmit}>
        {/* Basic Information */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionBlue}}>📋 Basic Information</div><div style={s.sectionBody}>
          <div style={s.formRow}>
            <div style={s.formGroup}><label style={s.label}>Name of Person Completing Form <span style={s.required}>*</span></label><input type="text" name="personName" value={formData.personName} onChange={handleChange} required style={s.input}/></div>
            <div style={s.formGroup}><label style={s.label}>Date of Incident <span style={s.required}>*</span></label><input type="date" name="incidentDate" value={formData.incidentDate} onChange={handleChange} required style={s.input}/></div>
          </div>
          <div style={s.formRow}>
            <div style={s.formGroup}><label style={s.label}>Client/Company <span style={s.required}>*</span></label><select name="company" value={formData.company} onChange={handleChange} required style={s.select}><option value="">Select Company...</option>{COMPANIES.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
            <div style={s.formGroup}><label style={s.label}>Location <span style={s.required}>*</span></label><select name="location" value={formData.location} onChange={handleChange} required style={s.select}><option value="">Select Location...</option>{LOCATIONS.map(l=><option key={l} value={l}>{l}</option>)}</select></div>
          </div>
          <div style={s.formRow}>
            <div style={s.formGroup}><label style={s.label}>Security/Police Notified? <span style={s.required}>*</span></label><select name="securityNotified" value={formData.securityNotified} onChange={handleChange} required style={s.select}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option><option value="Not Required">Not Required</option></select></div>
            <div style={s.formGroup}><label style={s.label}>Injuries Involved? <span style={s.required}>*</span></label><select name="injuriesInvolved" value={formData.injuriesInvolved} onChange={handleChange} required style={s.select}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
          </div>
          <div style={s.formRow}>
            <div style={s.formGroup}><label style={s.label}>Spill Involved? <span style={s.required}>*</span></label><select name="spillInvolved" value={formData.spillInvolved} onChange={handleChange} required style={s.select}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
          </div>
          {formData.spillInvolved==='Yes'&&(<div style={s.spillFields}><div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Spill Volume Outside Containment</label><input type="text" name="spillVolumeOutside" value={formData.spillVolumeOutside} onChange={handleChange} placeholder="e.g., 5 gallons" style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Total Spill Volume</label><input type="text" name="totalSpillVolume" value={formData.totalSpillVolume} onChange={handleChange} placeholder="e.g., 10 gallons" style={s.input}/></div></div></div>)}
        </div></div>
        
        {/* STKY/PSIF Assessment */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionRed}}>⚡ SIF Potential Assessment</div><div style={s.sectionBody}>
          <div style={s.stkySection}>
            <div style={s.stkyLabel}>STKY = Stuff That Kills You</div>
            <p style={{fontSize:'13px',color:'#666',marginBottom:'15px'}}>This assessment identifies whether this property damage event involved high-energy hazards with Serious Injury or Fatality (SIF) potential.</p>
            
            <div style={s.stkyRow}>
              <span style={{fontWeight:'600'}}>Did this event involve HIGH ENERGY? *</span>
              <div style={s.stkyOptions}>
                <div onClick={()=>setFormData(p=>({...p,highEnergyPresent:'Yes'}))} style={{...s.stkyOption,...(formData.highEnergyPresent==='Yes'?s.stkyOptionSelected:{})}}>Yes</div>
                <div onClick={()=>setFormData(p=>({...p,highEnergyPresent:'No'}))} style={{...s.stkyOption,...(formData.highEnergyPresent==='No'?s.stkyOptionSelected:{})}}>No</div>
              </div>
            </div>
            <p style={{fontSize:'12px',color:'#718096',marginTop:'5px'}}>High energy = gravity (falls, drops), motion (vehicles, equipment), electrical, pressure, chemical, temperature extremes</p>
            
            {formData.highEnergyPresent==='Yes'&&(<>
              <div style={{marginTop:'15px'}}>
                <label style={{marginBottom:'10px',display:'block',fontWeight:'600'}}>What ENERGY TYPES were involved?</label>
                <div style={s.energyGrid}>
                  {ENERGY_TYPES.map(type=>(<div key={type} onClick={()=>handleEnergyTypeChange(type)} style={{...s.energyItem,...(selectedEnergyTypes.includes(type)?s.energyItemSelected:{})}}><input type="checkbox" checked={selectedEnergyTypes.includes(type)} readOnly style={{width:'16px',height:'16px'}}/><span>{type}</span></div>))}
                </div>
              </div>
              
              <div style={{...s.stkyRow,marginTop:'15px'}}>
                <span style={{fontWeight:'600'}}>Did UNCONTROLLED ENERGY RELEASE occur? *</span>
                <div style={s.stkyOptions}>
                  <div onClick={()=>setFormData(p=>({...p,energyReleaseOccurred:'Yes'}))} style={{...s.stkyOption,...(formData.energyReleaseOccurred==='Yes'?s.stkyOptionSelected:{})}}>Yes</div>
                  <div onClick={()=>setFormData(p=>({...p,energyReleaseOccurred:'No'}))} style={{...s.stkyOption,...(formData.energyReleaseOccurred==='No'?s.stkyOptionSelected:{})}}>No</div>
                </div>
              </div>
              <p style={{fontSize:'12px',color:'#718096',marginTop:'5px'}}>Did energy transfer to equipment, property, or environment causing the damage?</p>
              
              <div style={{marginTop:'15px'}}>
                <label style={{display:'block',marginBottom:'8px',fontWeight:'600'}}>Were DIRECT CONTROLS in place? *</label>
                <select name="directControlStatus" value={formData.directControlStatus} onChange={handleChange} style={{...s.select,width:'100%'}}>
                  <option value="">-- Select --</option>
                  <option value="Yes-Effective">Yes - Direct control was in place and EFFECTIVE</option>
                  <option value="Yes-Failed">Yes - Direct control was in place but FAILED</option>
                  <option value="No-Alternative">No - Only alternative controls (PPE, procedures, warnings)</option>
                  <option value="No-None">No - No controls were in place</option>
                </select>
                <p style={{fontSize:'12px',color:'#718096',marginTop:'5px'}}>Direct Controls = Elimination, Substitution, Engineering Controls, Guarding. Alternative = PPE, Procedures, Training, Warnings</p>
              </div>
            </>)}
            
            {psifResult.classification&&formData.highEnergyPresent&&(<div style={{...s.psifBadge,...getPsifBadgeStyle()}}><strong>{psifResult.classification}</strong><br/>{psifResult.explanation}</div>)}
          </div>
        </div></div>
        
        {/* People & Location */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionRed}}>👥 People & Location Details</div><div style={s.sectionBody}>
          <div style={s.formGroup}><label style={s.label}>Name(s) and Contact Info of Those Involved</label><textarea name="namesContactInvolved" value={formData.namesContactInvolved} onChange={handleChange} placeholder="List all persons involved with contact information..." style={s.textarea}/></div>
          <div style={{...s.formGroup,marginTop:'20px'}}><label style={s.label}>Weather Conditions and Specific Location <span style={s.required}>*</span></label><textarea name="weatherLocation" value={formData.weatherLocation} onChange={handleChange} required placeholder="Describe weather conditions and exact location..." style={s.textarea}/></div>
          <div style={{...s.formGroup,marginTop:'20px'}}><label style={s.label}>Names & Contact Info of ALL Witnesses</label><textarea name="witnessNames" value={formData.witnessNames} onChange={handleChange} placeholder="List all witnesses with contact information..." style={s.textarea}/></div>
        </div></div>
        
        {/* Vehicle & Equipment */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionOrange}}>🚗 Vehicle & Equipment Information</div><div style={s.sectionBody}>
          <div style={s.formRow}>
            <div style={s.formGroup}><label style={s.label}>Truck or Vehicle Number</label><input type="text" name="truckVehicleNumber" value={formData.truckVehicleNumber} onChange={handleChange} style={s.input}/></div>
            <div style={s.formGroup}><label style={s.label}>Equipment ID #</label><input type="text" name="equipmentId" value={formData.equipmentId} onChange={handleChange} style={s.input}/></div>
          </div>
          <div style={s.formGroup}><label style={s.label}>Number of & Types of Vehicles/Equipment Involved</label><textarea name="vehiclesEquipmentInvolved" value={formData.vehiclesEquipmentInvolved} onChange={handleChange} placeholder="Describe all vehicles and equipment involved..." style={s.textarea}/></div>
          <div style={{...s.formGroup,marginTop:'20px'}}><label style={s.label}>Condition of Property/Equipment Prior to Incident</label><textarea name="priorCondition" value={formData.priorCondition} onChange={handleChange} placeholder="Describe the condition before the incident..." style={s.textarea}/></div>
          <div style={{...s.formRow,marginTop:'20px'}}>
            <div style={s.formGroup}><label style={s.label}>Equipment Used as Intended?</label><select name="equipmentAsIntended" value={formData.equipmentAsIntended} onChange={handleChange} style={s.select}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option><option value="N/A">N/A</option></select></div>
            <div style={s.formGroup}><label style={s.label}>When Was Last Inspection/Maintenance?</label><input type="text" name="lastInspection" value={formData.lastInspection} onChange={handleChange} placeholder="Date or timeframe" style={s.input}/></div>
          </div>
          <div style={s.formRow}>
            <div style={s.formGroup}><label style={s.label}>Any Warnings of Potential Failure?</label><select name="warningsBeforehand" value={formData.warningsBeforehand} onChange={handleChange} style={s.select}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option><option value="Unknown">Unknown</option></select></div>
            <div style={s.formGroup}><label style={s.label}>Any Unusual Sounds/Movements/Malfunctions?</label><select name="unusualSounds" value={formData.unusualSounds} onChange={handleChange} style={s.select}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option><option value="Unknown">Unknown</option></select></div>
          </div>
          <div style={s.formRow}>
            <div style={s.formGroup}><label style={s.label}>Equipment Involved in Prior Incidents?</label><select name="priorIncidents" value={formData.priorIncidents} onChange={handleChange} style={s.select}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option><option value="Unknown">Unknown</option></select></div>
          </div>
        </div></div>
        
        {/* Incident Details */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionBlue}}>📝 Incident Details</div><div style={s.sectionBody}>
          <div style={s.formGroup}><label style={s.label}>Describe in Detail What Happened <span style={s.required}>*</span></label><textarea name="describeIncident" value={formData.describeIncident} onChange={handleChange} required placeholder="Provide a detailed description of the incident..." style={{...s.textarea,minHeight:'150px'}}/></div>
          <div style={{...s.formRow,marginTop:'20px'}}>
            <div style={s.formGroup}><label style={s.label}>What Was Employee Doing at Time of Incident? <span style={s.required}>*</span></label><select name="employeeActivity" value={formData.employeeActivity} onChange={handleChange} required style={s.select}><option value="">Select...</option>{EMPLOYEE_ACTIVITIES.map(a=><option key={a} value={a}>{a}</option>)}</select></div>
            <div style={s.formGroup}><label style={s.label}>Was This a Short-Service Employee?</label><select name="shortServiceEmployee" value={formData.shortServiceEmployee} onChange={handleChange} style={s.select}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option><option value="Unknown">Unknown</option></select></div>
          </div>
          <div style={{...s.formGroup,marginTop:'20px'}}><label style={s.label}>What Hazards Caused/Contributed to the Event?</label><textarea name="hazardsCaused" value={formData.hazardsCaused} onChange={handleChange} placeholder="Describe contributing hazards..." style={s.textarea}/></div>
        </div></div>
        
        {/* Driving Factors */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionRed}}>🚙 Driving & Travel Factors</div><div style={s.sectionBody}>
          <div style={s.formRow}>
            <div style={s.formGroup}><label style={s.label}>What Driving Factors Were Involved?</label><select name="drivingFactors" value={formData.drivingFactors} onChange={handleChange} style={s.select}><option value="">Select...</option>{DRIVING_FACTORS.map(f=><option key={f} value={f}>{f}</option>)}</select></div>
            <div style={s.formGroup}><label style={s.label}>The Driver Was Traveling...</label><select name="driverTraveling" value={formData.driverTraveling} onChange={handleChange} style={s.select}><option value="">Select...</option>{TRAVELING_OPTIONS.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
          </div>
          <div style={s.formRow}>
            <div style={s.formGroup}><label style={s.label}>The Hazard Which Caused the Incident Was...</label><select name="hazardType" value={formData.hazardType} onChange={handleChange} style={s.select}><option value="">Select...</option>{HAZARD_TYPES.map(h=><option key={h} value={h}>{h}</option>)}</select></div>
            <div style={s.formGroup}><label style={s.label}>Was Incident Within a DOT Right-of-Way?</label><select name="dotRightOfWay" value={formData.dotRightOfWay} onChange={handleChange} style={s.select}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option><option value="Unknown">Unknown</option></select></div>
          </div>
          <div style={s.formRow}>
            <div style={s.formGroup}><label style={s.label}>Precipitating Events in Sole Control of Employee?</label><select name="precipitatingEvents" value={formData.precipitatingEvents} onChange={handleChange} style={s.select}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option><option value="Partially">Partially</option><option value="Unknown">Unknown</option></select></div>
          </div>
        </div></div>
        
        {/* PPE & Prevention */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionOrange}}>🦺 PPE & Prevention</div><div style={s.sectionBody}>
          <div style={s.formRow}>
            <div style={s.formGroup}><label style={s.label}>Involved Parties Wearing Appropriate PPE?</label><select name="appropriatePPE" value={formData.appropriatePPE} onChange={handleChange} style={s.select}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option><option value="Partially">Partially</option><option value="N/A">N/A</option></select></div>
            <div style={s.formGroup}><label style={s.label}>What Protective Methods Could Have Prevented This?</label><select name="protectiveMethods" value={formData.protectiveMethods} onChange={handleChange} style={s.select}><option value="">Select...</option>{PROTECTIVE_METHODS.map(m=><option key={m} value={m}>{m}</option>)}</select></div>
          </div>
          <div style={s.formGroup}><label style={s.label}>Please Describe PPE in Use</label><textarea name="describePPE" value={formData.describePPE} onChange={handleChange} placeholder="List PPE that was being worn..." style={s.textarea}/></div>
          <div style={{...s.formRow,marginTop:'20px'}}>
            <div style={s.formGroup}><label style={s.label}>Did Procedure Errors (or Missing Procedures) Contribute?</label><select name="procedureErrors" value={formData.procedureErrors} onChange={handleChange} style={s.select}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option><option value="Possibly">Possibly</option><option value="Unknown">Unknown</option></select></div>
          </div>
        </div></div>
        
        {/* Corrective Actions */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionBlue}}>💡 Corrective Actions</div><div style={s.sectionBody}>
          <div style={s.formGroup}><label style={s.label}>Recommended Corrective Actions</label><textarea name="correctiveActions" value={formData.correctiveActions} onChange={handleChange} placeholder="Describe recommended corrective actions to prevent recurrence..." style={{...s.textarea,minHeight:'120px'}}/></div>
        </div></div>
        
        {/* Photo Documentation */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionRed}}>📸 Photo Documentation</div><div style={s.sectionBody}>
          <div style={s.formRow}>
            <div style={s.formGroup}>
              <label style={s.label}>Pre-Trip Inspection Photo (Optional)</label>
              <div style={{...s.photoUpload,...(preTripPreview?s.photoUploadActive:{})}} onClick={()=>document.getElementById('preTripInput').click()}>
                <div style={{fontSize:'2.5rem',marginBottom:'10px'}}>📋</div>
                <p style={{color:'#6b7280'}}>Click to upload Pre-Trip Inspection</p>
                {preTripPreview&&<img src={preTripPreview} alt="Preview" style={s.photoPreview}/>}
              </div>
              <input type="file" id="preTripInput" accept="image/*" onChange={(e)=>handlePhotoChange(e,'preTrip')} style={{display:'none'}}/>
            </div>
            <div style={s.formGroup}>
              <label style={s.label}>Incident Photo (Optional)</label>
              <div style={{...s.photoUpload,...(photoPreview?s.photoUploadActive:{})}} onClick={()=>document.getElementById('photoInput').click()}>
                <div style={{fontSize:'2.5rem',marginBottom:'10px'}}>📷</div>
                <p style={{color:'#6b7280'}}>Click to upload Incident Photo</p>
                {photoPreview&&<img src={photoPreview} alt="Preview" style={s.photoPreview}/>}
              </div>
              <input type="file" id="photoInput" accept="image/*" onChange={(e)=>handlePhotoChange(e,'photo')} style={{display:'none'}}/>
            </div>
          </div>
        </div></div>
        
        <button type="submit" disabled={isSubmitting} style={{...s.submitBtn,opacity:isSubmitting?0.6:1,cursor:isSubmitting?'not-allowed':'pointer'}}>{isSubmitting?'Submitting...':'Submit Property Damage Report'}</button>
      </form>
    </div>
    
    <div style={s.footer}><span style={{color:'#1e3a5f',fontWeight:'500'}}>Powered by Predictive Safety Analytics™</span><span style={{color:'#94a3b8',margin:'0 8px'}}>|</span><span style={{color:'#475569'}}>© 2025 SLP Alaska</span></div>
  </div></div>);
}

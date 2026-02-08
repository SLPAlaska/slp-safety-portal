'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://iypezirwdlqpptjpeeyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
);

const COMPANIES = ['A-C Electric','AKE-Line','Apache Corp.','Armstrong Oil & Gas','ASRC Energy Services','CCI-Industrial','Chosen Construction','CINGSA','Coho Enterprises','Conam Construction','ConocoPhillips','Five Star Oilfield Services','Fox Energy Services','G.A. West','GBR Equipment','GLM Energy Services','Graham Industrial Coatings','Harvest Midstream','Hilcorp Alaska','MagTec Alaska','Merkes Builders','Nordic-Calista','Parker TRS','Peninsula Paving','Pollard Wireline','Ridgeline Oilfield Services','Santos','Summit Excavation','Tesoro Refinery','Yellowjacket','Other'];
const LOCATIONS = ['Kenai','CIO','Beaver Creek','Swanson River','Ninilchik','Nikiski','Other Kenai Asset','Deadhorse','Prudhoe Bay','Kuparuk','Alpine','Willow','ENI','PIKKA','Point Thompson','North Star Island','Endicott','Badami','Other North Slope'];
const LOCKOUT_TYPES = ['Simple Lockout (Single Source)','Complex Lockout (Multiple Sources)','Group Lockout/Tagout','Shift Change Lockout'];
const LOCK_COLORS = ['Red','Blue','Green','Yellow','Orange','Black','White','Other'];
const VERIFICATION_METHODS = ['Voltage Test (Meter)','Pressure Gauge Reading','Try Start Test','Visual Inspection','Capacitor Discharge Test','Temperature Check','Multiple Methods'];
const ENERGY_SOURCES = [{id:'electrical',label:'Electrical',detail:'electricalVoltage',placeholder:'Voltage'},{id:'hydraulic',label:'Hydraulic',detail:'hydraulicPressure',placeholder:'PSI'},{id:'pneumatic',label:'Pneumatic',detail:'pneumaticPressure',placeholder:'PSI'},{id:'mechanical',label:'Mechanical',detail:'mechanicalType',placeholder:'Type'},{id:'thermal',label:'Thermal',detail:'thermalType',placeholder:'Hot/Cold'},{id:'chemical',label:'Chemical',detail:'chemicalType',placeholder:'Type'},{id:'gravity',label:'Gravity',detail:'gravityType',placeholder:'Type'},{id:'stored',label:'Stored',detail:'storedType',placeholder:'Type'},{id:'radiation',label:'Radiation',detail:'radiationType',placeholder:'Type'},{id:'other',label:'Other',detail:'otherEnergyType',placeholder:'Specify'}];

function generatePermitNumber(){const now=new Date();const d=now.getFullYear()+String(now.getMonth()+1).padStart(2,'0')+String(now.getDate()).padStart(2,'0');return 'EI-'+d+'-'+String(Math.floor(Math.random()*10000)).padStart(4,'0');}

function calculateIndicators(data){
  let good=0,bad=0;const notes=[];
  if(data.preJobBriefing==='Yes'){good++;notes.push('Pre-Job Briefing Conducted');}
  if(data.hazardsCommunicated==='Yes')good++;
  if(data.zeroEnergyVerified==='Yes'){good++;notes.push('Zero Energy State Verified');}
  if(data.tryTestPerformed==='Yes'){good++;notes.push('Try Test Performed');}
  if(data.allDevicesTagged==='Yes')good++;
  if(data.lockboxUsed==='Yes'){good++;notes.push('Lockbox Procedure Used');}
  if(data.tagStubsInLockbox==='Yes')good++;
  if(data.storedEnergyReleased==='Yes')good++;
  if(data.affectedPersonnelNotified==='Yes')good++;
  if(data.emergencyProcedures==='Yes')good++;
  if(data.zeroEnergyVerified!=='Yes'){bad+=2;notes.push('CRITICAL: Zero energy not verified');}
  if(data.tryTestPerformed!=='Yes'){bad++;notes.push('Try test not performed');}
  if(data.preJobBriefing!=='Yes'){bad++;notes.push('No pre-job briefing');}
  if(data.allDevicesTagged!=='Yes'){bad++;notes.push('Devices not all tagged');}
  const hasEnergy=Object.values(data.energySources||{}).some(v=>v);
  if(hasEnergy&&(!data.totalIsolationPoints||data.totalIsolationPoints===0)){bad+=2;notes.push('CRITICAL: Energy but no isolation points');}
  if(data.energySources?.stored&&data.storedEnergyReleased!=='Yes'){bad++;notes.push('Stored energy not released');}
  return {good,bad,notes};
}

export default function EnergyIsolation(){
  const [activeTab,setActiveTab]=useState('new');
  const [isSubmitting,setIsSubmitting]=useState(false);
  const [submitted,setSubmitted]=useState(false);
  const [submittedPermit,setSubmittedPermit]=useState(null);
  const [openPermits,setOpenPermits]=useState([]);
  const [selectedPermit,setSelectedPermit]=useState(null);
  const [closeoutSuccess,setCloseoutSuccess]=useState(false);
  const [workerSelectedPermit,setWorkerSelectedPermit]=useState(null);
  const [activeWorkers,setActiveWorkers]=useState([]);
  const [workerSuccess,setWorkerSuccess]=useState(false);
  const [workerMessage,setWorkerMessage]=useState('');
  
  const [formData,setFormData]=useState({
    permitInitiator:'',date:new Date().toISOString().split('T')[0],lockoutType:'',company:'',location:'',phoneRadio:'',workArea:'',equipmentId:'',workDescription:'',authorizedPersonName:'',authorizedPersonLock:'',
    energySources:{},energyDetails:{},
    totalIsolationPoints:0,electricalIsolations:0,valveIsolations:0,blindIsolations:0,otherIsolations:0,
    lockboxUsed:'',lockboxLocation:'',controlLockColor:'',controlLockNumber:'',deviceLockSet1:'',deviceLockSet2:'',deviceLockSet3:'',
    zeroEnergyVerified:'',verificationMethod:'',tryTestPerformed:'',storedEnergyReleased:'',allDevicesTagged:'',tagStubsInLockbox:'',
    preJobBriefing:'',hazardsCommunicated:'',emergencyProcedures:'',affectedPersonnelNotified:'',
    authorizedPersonSignature:'',supervisorApproval:'',startTime:'',expirationTime:''
  });
  
  const [workerData,setWorkerData]=useState({workerName:'',company:'',personalLockNumber:'',workingUnder:'Individual',verifiedIsolation:'',verifiedZeroEnergy:''});
  const [closeoutData,setCloseoutData]=useState({allWorkersSignedOut:false,personalLocksRemoved:false,deviceLocksRemoved:false,tagsRemovedMatched:false,equipmentClear:false,safeToReenergize:false,timePermitClosed:'',closeOutBy:''});

  useEffect(()=>{if(activeTab==='closeout'||activeTab==='worker')loadOpenPermits();},[activeTab]);

  const loadOpenPermits=async()=>{try{const{data}=await supabase.from('ei_permits').select('*').eq('permit_status','Open').order('created_at',{ascending:false});setOpenPermits(data||[]);}catch(e){console.error(e);}};
  const loadActiveWorkers=async(pn)=>{try{const{data}=await supabase.from('ei_worker_log').select('*').eq('permit_number',pn).is('sign_out_time',null);setActiveWorkers(data||[]);}catch(e){console.error(e);}};

  const handleChange=(e)=>{const{name,value}=e.target;setFormData(p=>({...p,[name]:value}));};
  const handleEnergyToggle=(id)=>{setFormData(p=>({...p,energySources:{...p.energySources,[id]:!p.energySources[id]}}));};
  const handleEnergyDetail=(id,value)=>{setFormData(p=>({...p,energyDetails:{...p.energyDetails,[id]:value}}));};

  const handleSubmit=async(e)=>{e.preventDefault();setIsSubmitting(true);
    try{
      const permitNumber=generatePermitNumber();
      const indicators=calculateIndicators(formData);
      
      const{error}=await supabase.from('ei_permits').insert([{
        permit_number:permitNumber,permit_status:'Open',permit_initiator:formData.permitInitiator,date:formData.date,company:formData.company,location:formData.location,phone_radio:formData.phoneRadio,work_area:formData.workArea,equipment_id:formData.equipmentId,work_description:formData.workDescription,authorized_person_name:formData.authorizedPersonName,authorized_person_lock:formData.authorizedPersonLock,lockout_type:formData.lockoutType,
        energy_sources:{sources:formData.energySources,details:formData.energyDetails},
        total_isolation_points:parseInt(formData.totalIsolationPoints)||0,electrical_isolations:parseInt(formData.electricalIsolations)||0,valve_isolations:parseInt(formData.valveIsolations)||0,blind_isolations:parseInt(formData.blindIsolations)||0,other_isolations:parseInt(formData.otherIsolations)||0,
        lockbox_used:formData.lockboxUsed,lockbox_location:formData.lockboxLocation,control_lock_color:formData.controlLockColor,control_lock_number:formData.controlLockNumber,device_lock_set_1:formData.deviceLockSet1,device_lock_set_2:formData.deviceLockSet2,device_lock_set_3:formData.deviceLockSet3,
        zero_energy_verified:formData.zeroEnergyVerified,verification_method:formData.verificationMethod,try_test_performed:formData.tryTestPerformed,stored_energy_released:formData.storedEnergyReleased,all_devices_tagged:formData.allDevicesTagged,tag_stubs_in_lockbox:formData.tagStubsInLockbox,
        pre_job_briefing:formData.preJobBriefing,hazards_communicated:formData.hazardsCommunicated,emergency_procedures:formData.emergencyProcedures,affected_personnel_notified:formData.affectedPersonnelNotified,
        authorized_person_signature:formData.authorizedPersonSignature,supervisor_approval:formData.supervisorApproval,start_time:formData.startTime||null,expiration_time:formData.expirationTime||null,
        good_indicators:indicators.good,bad_indicators:indicators.bad,indicator_notes:indicators.notes.join('; ')
      }]);
      if(error)throw error;
      
      // Auto sign-in authorized person
      if(formData.authorizedPersonName){
        await supabase.from('ei_worker_log').insert([{permit_number:permitNumber,worker_name:formData.authorizedPersonName,company:formData.company,personal_lock_number:formData.authorizedPersonLock||'N/A',working_under:'Authorized Person',verified_isolation:'Yes',verified_zero_energy:'Yes'}]);
      }
      setSubmittedPermit(permitNumber);setSubmitted(true);
    }catch(e){console.error(e);alert('Error: '+e.message);}finally{setIsSubmitting(false);}
  };

  const signInWorker=async()=>{if(!workerSelectedPermit){alert('Select a permit');return;}if(!workerData.workerName||!workerData.personalLockNumber){alert('Name and lock # required');return;}
    setIsSubmitting(true);try{
      const{error}=await supabase.from('ei_worker_log').insert([{permit_number:workerSelectedPermit,worker_name:workerData.workerName,company:workerData.company,personal_lock_number:workerData.personalLockNumber,working_under:workerData.workingUnder,verified_isolation:workerData.verifiedIsolation,verified_zero_energy:workerData.verifiedZeroEnergy}]);
      if(error)throw error;
      setWorkerMessage(workerData.workerName+' signed in successfully!');setWorkerSuccess(true);
    }catch(e){console.error(e);alert('Error: '+e.message);}finally{setIsSubmitting(false);}
  };

  const signOutWorker=async(workerId,workerName)=>{setIsSubmitting(true);try{
      const{error}=await supabase.from('ei_worker_log').update({sign_out_time:new Date().toISOString()}).eq('id',workerId);
      if(error)throw error;
      loadActiveWorkers(workerSelectedPermit);
    }catch(e){console.error(e);alert('Error: '+e.message);}finally{setIsSubmitting(false);}
  };

  const submitCloseout=async()=>{if(!selectedPermit){alert('Select a permit');return;}if(!closeoutData.closeOutBy){alert('Close out by required');return;}
    if(activeWorkers.length>0){alert('Workers still signed in!');return;}
    setIsSubmitting(true);try{
      const{error}=await supabase.from('ei_permits').update({permit_status:'Closed',all_workers_signed_out:closeoutData.allWorkersSignedOut?'Yes':'No',personal_locks_removed:closeoutData.personalLocksRemoved?'Yes':'No',device_locks_removed:closeoutData.deviceLocksRemoved?'Yes':'No',tags_removed_matched:closeoutData.tagsRemovedMatched?'Yes':'No',equipment_clear:closeoutData.equipmentClear?'Yes':'No',safe_to_reenergize:closeoutData.safeToReenergize?'Yes':'No',time_permit_closed:closeoutData.timePermitClosed||null,close_out_by:closeoutData.closeOutBy,closed_at:new Date().toISOString()}).eq('permit_number',selectedPermit);
      if(error)throw error;setCloseoutSuccess(true);
    }catch(e){console.error(e);alert('Error: '+e.message);}finally{setIsSubmitting(false);}
  };

  const resetForm=()=>{setFormData({permitInitiator:'',date:new Date().toISOString().split('T')[0],lockoutType:'',company:'',location:'',phoneRadio:'',workArea:'',equipmentId:'',workDescription:'',authorizedPersonName:'',authorizedPersonLock:'',energySources:{},energyDetails:{},totalIsolationPoints:0,electricalIsolations:0,valveIsolations:0,blindIsolations:0,otherIsolations:0,lockboxUsed:'',lockboxLocation:'',controlLockColor:'',controlLockNumber:'',deviceLockSet1:'',deviceLockSet2:'',deviceLockSet3:'',zeroEnergyVerified:'',verificationMethod:'',tryTestPerformed:'',storedEnergyReleased:'',allDevicesTagged:'',tagStubsInLockbox:'',preJobBriefing:'',hazardsCommunicated:'',emergencyProcedures:'',affectedPersonnelNotified:'',authorizedPersonSignature:'',supervisorApproval:'',startTime:'',expirationTime:''});setSubmitted(false);setSubmittedPermit(null);};
  const resetCloseout=()=>{setCloseoutData({allWorkersSignedOut:false,personalLocksRemoved:false,deviceLocksRemoved:false,tagsRemovedMatched:false,equipmentClear:false,safeToReenergize:false,timePermitClosed:'',closeOutBy:''});setSelectedPermit(null);setCloseoutSuccess(false);setActiveWorkers([]);loadOpenPermits();};
  const resetWorker=()=>{setWorkerData({workerName:'',company:'',personalLockNumber:'',workingUnder:'Individual',verifiedIsolation:'',verifiedZeroEnergy:''});setWorkerSelectedPermit(null);setWorkerSuccess(false);setActiveWorkers([]);loadOpenPermits();};

  const s={container:{minHeight:'100vh',background:'linear-gradient(135deg, #1e3a8a 0%, #b91c1c 100%)',padding:'20px'},formContainer:{maxWidth:'1000px',margin:'0 auto',background:'white',borderRadius:'12px',boxShadow:'0 4px 6px rgba(0,0,0,0.1)',overflow:'hidden'},header:{background:'linear-gradient(135deg, #1e3a8a 0%, #b91c1c 100%)',color:'white',padding:'25px',textAlign:'center'},content:{padding:'25px'},tabs:{display:'flex',background:'#f1f5f9',padding:'8px',gap:'8px'},tab:{flex:1,padding:'12px',border:'none',borderRadius:'8px',fontWeight:'600',cursor:'pointer',fontSize:'13px',transition:'all 0.2s'},tabActive:{background:'#1e3a8a',color:'white'},tabInactive:{background:'white',color:'#475569'},section:{marginBottom:'15px',border:'1px solid #e5e7eb',borderRadius:'10px',overflow:'hidden'},sectionHeader:{color:'white',padding:'10px 15px',fontWeight:'600',fontSize:'14px'},sectionBlue:{background:'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)'},sectionRed:{background:'linear-gradient(135deg, #b91c1c 0%, #991b1b 100%)'},sectionGreen:{background:'linear-gradient(135deg, #059669 0%, #047857 100%)'},sectionPurple:{background:'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)'},sectionCyan:{background:'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)'},sectionAmber:{background:'linear-gradient(135deg, #d97706 0%, #b45309 100%)'},sectionBody:{padding:'12px',background:'#f8fafc'},formRow:{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))',gap:'12px',marginBottom:'12px'},formGroup:{display:'flex',flexDirection:'column'},label:{fontWeight:'600',color:'#374151',marginBottom:'4px',fontSize:'13px'},required:{color:'#b91c1c'},input:{padding:'8px 10px',border:'2px solid #d1d5db',borderRadius:'6px',fontSize:'14px'},select:{padding:'8px 10px',border:'2px solid #d1d5db',borderRadius:'6px',fontSize:'14px',background:'white'},textarea:{padding:'8px 10px',border:'2px solid #d1d5db',borderRadius:'6px',fontSize:'14px',minHeight:'60px',resize:'vertical'},infoBox:{background:'#eff6ff',borderLeft:'4px solid #1e3a8a',padding:'10px',marginBottom:'12px',fontSize:'13px',borderRadius:'0 6px 6px 0'},warningBox:{background:'#fef3c7',borderLeft:'4px solid #d97706',padding:'10px',marginBottom:'12px',fontSize:'13px',borderRadius:'0 6px 6px 0'},energyGrid:{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))',gap:'8px'},energyItem:{display:'flex',alignItems:'center',background:'white',padding:'8px 10px',borderRadius:'6px',border:'1px solid #e5e7eb',cursor:'pointer',fontSize:'13px'},energyItemChecked:{background:'#fef2f2',borderColor:'#b91c1c'},isolationCount:{display:'grid',gridTemplateColumns:'repeat(5, 1fr)',gap:'8px',marginTop:'10px'},countItem:{background:'white',padding:'8px',borderRadius:'6px',textAlign:'center',border:'1px solid #e5e7eb'},countLabel:{display:'block',fontSize:'11px',marginBottom:'4px'},countInput:{width:'100%',textAlign:'center',padding:'4px',fontSize:'14px',border:'1px solid #d1d5db',borderRadius:'4px'},mitigationItem:{display:'flex',justifyContent:'space-between',alignItems:'center',background:'white',padding:'8px 12px',borderRadius:'6px',border:'1px solid #e5e7eb',marginBottom:'6px'},mitigationLabel:{fontSize:'13px'},mitigationSelect:{width:'120px',padding:'5px 8px',fontSize:'13px'},verificationItem:{display:'flex',alignItems:'center',background:'white',padding:'10px',borderRadius:'6px',marginBottom:'6px',cursor:'pointer',border:'1px solid #e5e7eb'},verificationItemChecked:{background:'#dcfce7',borderLeft:'3px solid #059669'},submitBtn:{width:'100%',padding:'14px',background:'linear-gradient(135deg, #1e3a8a 0%, #b91c1c 100%)',color:'white',border:'none',borderRadius:'10px',fontSize:'16px',fontWeight:'600',cursor:'pointer',marginTop:'15px'},submitBtnGreen:{background:'linear-gradient(135deg, #059669 0%, #047857 100%)'},submitBtnPurple:{background:'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)'},successMessage:{background:'linear-gradient(135deg, #059669 0%, #047857 100%)',color:'white',padding:'30px',borderRadius:'12px',textAlign:'center',margin:'20px 0'},permitCard:{background:'white',border:'2px solid #e5e7eb',borderRadius:'8px',padding:'12px',marginBottom:'10px',cursor:'pointer',transition:'all 0.2s'},permitCardSelected:{borderColor:'#059669',background:'#f0fdf4'},workerCard:{background:'white',border:'2px solid #e5e7eb',borderRadius:'8px',padding:'12px',marginBottom:'10px',display:'flex',justifyContent:'space-between',alignItems:'center'},workerInfo:{flex:1},workerName:{fontWeight:'700',color:'#1e3a8a'},workerDetails:{fontSize:'13px',color:'#6b7280'},signoutBtn:{padding:'8px 16px',background:'#b91c1c',color:'white',border:'none',borderRadius:'6px',cursor:'pointer',fontSize:'13px'}};

  if(submitted&&submittedPermit){return(<div style={s.container}><div style={{maxWidth:'600px',margin:'0 auto',paddingTop:'50px'}}><div style={s.successMessage}><div style={{fontSize:'48px',marginBottom:'15px'}}>✅</div><h2 style={{margin:'0 0 10px'}}>Permit Issued Successfully!</h2><div style={{background:'rgba(255,255,255,0.2)',padding:'12px',borderRadius:'8px',fontSize:'20px',fontWeight:'bold',margin:'15px 0'}}>{submittedPermit}</div><p>The permit is now OPEN. Workers can now sign in.</p><div style={{display:'flex',gap:'10px',justifyContent:'center',marginTop:'20px',flexWrap:'wrap'}}><button onClick={resetForm} style={{...s.submitBtn,maxWidth:'200px',background:'white',color:'#059669'}}>Issue Another</button><a href="/" style={{...s.submitBtn,maxWidth:'200px',background:'#6b7280',textDecoration:'none',textAlign:'center'}}>Back to Portal</a></div></div></div></div>);}

  return(<div style={s.container}><div style={s.formContainer}>
    <div style={s.header}><a href="/" style={{color:'white',textDecoration:'none',fontSize:'14px'}}>← Back to Portal</a><div style={{background:'rgba(255,255,255,0.95)',borderRadius:'12px',padding:'15px',width:'fit-content',margin:'15px auto',boxShadow:'0 4px 15px rgba(0,0,0,0.2)'}}><img src="/Logo.png" alt="SLP Alaska" style={{maxWidth:'180px',height:'auto'}}/></div><div style={{display:'inline-block',background:'white',color:'#991b1b',padding:'5px 14px',borderRadius:'20px',fontWeight:'700',fontSize:'12px',marginBottom:'12px',border:'3px solid white'}}>🔒 OSHA 29 CFR 1910.147</div><h1 style={{margin:'0 0 5px',fontSize:'20px'}}>Energy Isolation / LOTO Permit</h1><p style={{opacity:0.9,fontSize:'13px'}}>SLP Alaska Safety Management System</p></div>
    
    <div style={s.tabs}><button style={{...s.tab,...(activeTab==='new'?s.tabActive:s.tabInactive)}} onClick={()=>setActiveTab('new')}>📝 New Permit</button><button style={{...s.tab,...(activeTab==='worker'?s.tabActive:s.tabInactive)}} onClick={()=>setActiveTab('worker')}>👷 Worker Sign In/Out</button><button style={{...s.tab,...(activeTab==='closeout'?s.tabActive:s.tabInactive)}} onClick={()=>setActiveTab('closeout')}>✅ Close Out</button></div>
    
    <div style={s.content}>
      {activeTab==='new'&&(<form onSubmit={handleSubmit}>
        {/* PERMIT INFO */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionBlue}}>📋 Permit Information</div><div style={s.sectionBody}>
          <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Permit Initiator <span style={s.required}>*</span></label><input type="text" name="permitInitiator" value={formData.permitInitiator} onChange={handleChange} required style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Date <span style={s.required}>*</span></label><input type="date" name="date" value={formData.date} onChange={handleChange} required style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Lockout Type <span style={s.required}>*</span></label><select name="lockoutType" value={formData.lockoutType} onChange={handleChange} required style={s.select}><option value="">Select...</option>{LOCKOUT_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></div></div>
          <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Client/Company <span style={s.required}>*</span></label><select name="company" value={formData.company} onChange={handleChange} required style={s.select}><option value="">Select...</option>{COMPANIES.map(c=><option key={c} value={c}>{c}</option>)}</select></div><div style={s.formGroup}><label style={s.label}>Location <span style={s.required}>*</span></label><select name="location" value={formData.location} onChange={handleChange} required style={s.select}><option value="">Select...</option>{LOCATIONS.map(l=><option key={l} value={l}>{l}</option>)}</select></div><div style={s.formGroup}><label style={s.label}>Phone/Radio</label><input type="text" name="phoneRadio" value={formData.phoneRadio} onChange={handleChange} style={s.input}/></div></div>
          <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Work Area/Module</label><input type="text" name="workArea" value={formData.workArea} onChange={handleChange} placeholder="e.g., Module 5" style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Equipment ID <span style={s.required}>*</span></label><input type="text" name="equipmentId" value={formData.equipmentId} onChange={handleChange} required placeholder="e.g., P-101" style={s.input}/></div></div>
          <div style={s.formGroup}><label style={s.label}>Work Description <span style={s.required}>*</span></label><textarea name="workDescription" value={formData.workDescription} onChange={handleChange} required placeholder="Describe the work requiring energy isolation..." style={s.textarea}/></div>
          <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Authorized Person <span style={s.required}>*</span></label><input type="text" name="authorizedPersonName" value={formData.authorizedPersonName} onChange={handleChange} required style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Lock Number</label><input type="text" name="authorizedPersonLock" value={formData.authorizedPersonLock} onChange={handleChange} placeholder="e.g., 001" style={s.input}/></div></div>
        </div></div>
        
        {/* ENERGY SOURCES */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionRed}}>⚡ Energy Sources Present</div><div style={s.sectionBody}>
          <p style={{fontSize:'13px',marginBottom:'10px',color:'#6b7280'}}>Check all energy sources present and specify details:</p>
          <div style={s.energyGrid}>{ENERGY_SOURCES.map(e=><div key={e.id} style={{...s.energyItem,...(formData.energySources[e.id]?s.energyItemChecked:{})}} onClick={()=>handleEnergyToggle(e.id)}><input type="checkbox" checked={formData.energySources[e.id]||false} readOnly style={{marginRight:'8px',accentColor:'#b91c1c'}}/><span style={{flex:1}}>{e.label}</span><input type="text" value={formData.energyDetails[e.id]||''} onChange={(ev)=>{ev.stopPropagation();handleEnergyDetail(e.id,ev.target.value);}} onClick={(ev)=>ev.stopPropagation()} placeholder={e.placeholder} style={{width:'70px',padding:'4px 6px',fontSize:'12px',border:'1px solid #d1d5db',borderRadius:'4px'}}/></div>)}</div>
        </div></div>
        
        {/* ISOLATION POINTS */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionPurple}}>🔧 Isolation Points Summary</div><div style={s.sectionBody}>
          <div style={s.infoBox}>Enter the number of each type of isolation device being used.</div>
          <div style={s.isolationCount}><div style={s.countItem}><label style={s.countLabel}>Total Points</label><input type="number" name="totalIsolationPoints" value={formData.totalIsolationPoints} onChange={handleChange} min="0" style={s.countInput}/></div><div style={s.countItem}><label style={s.countLabel}>Electrical</label><input type="number" name="electricalIsolations" value={formData.electricalIsolations} onChange={handleChange} min="0" style={s.countInput}/></div><div style={s.countItem}><label style={s.countLabel}>Valves</label><input type="number" name="valveIsolations" value={formData.valveIsolations} onChange={handleChange} min="0" style={s.countInput}/></div><div style={s.countItem}><label style={s.countLabel}>Blinds</label><input type="number" name="blindIsolations" value={formData.blindIsolations} onChange={handleChange} min="0" style={s.countInput}/></div><div style={s.countItem}><label style={s.countLabel}>Other</label><input type="number" name="otherIsolations" value={formData.otherIsolations} onChange={handleChange} min="0" style={s.countInput}/></div></div>
        </div></div>
        
        {/* LOCKBOX */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionAmber}}>📦 Lockbox & Control Locks</div><div style={s.sectionBody}>
          <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Lockbox Used?</label><select name="lockboxUsed" value={formData.lockboxUsed} onChange={handleChange} style={s.select}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option></select></div><div style={s.formGroup}><label style={s.label}>Lockbox Location</label><input type="text" name="lockboxLocation" value={formData.lockboxLocation} onChange={handleChange} placeholder="e.g., At equipment" style={s.input}/></div></div>
          <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Control Lock Color</label><select name="controlLockColor" value={formData.controlLockColor} onChange={handleChange} style={s.select}><option value="">Select...</option>{LOCK_COLORS.map(c=><option key={c} value={c}>{c}</option>)}</select></div><div style={s.formGroup}><label style={s.label}>Control Lock Number</label><input type="text" name="controlLockNumber" value={formData.controlLockNumber} onChange={handleChange} placeholder="e.g., C-001" style={s.input}/></div></div>
          <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Device Lock Set 1</label><input type="text" name="deviceLockSet1" value={formData.deviceLockSet1} onChange={handleChange} placeholder="e.g., Red 1-10" style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Device Lock Set 2</label><input type="text" name="deviceLockSet2" value={formData.deviceLockSet2} onChange={handleChange} placeholder="e.g., Blue 1-10" style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Device Lock Set 3</label><input type="text" name="deviceLockSet3" value={formData.deviceLockSet3} onChange={handleChange} placeholder="Optional" style={s.input}/></div></div>
        </div></div>
        
        {/* VERIFICATION */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionGreen}}>✓ Verification & Zero Energy</div><div style={s.sectionBody}>
          <div style={s.mitigationItem}><span style={s.mitigationLabel}>Zero Energy State Verified?</span><select name="zeroEnergyVerified" value={formData.zeroEnergyVerified} onChange={handleChange} style={s.mitigationSelect}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
          <div style={s.mitigationItem}><span style={s.mitigationLabel}>Verification Method</span><select name="verificationMethod" value={formData.verificationMethod} onChange={handleChange} style={{...s.mitigationSelect,width:'180px'}}><option value="">Select...</option>{VERIFICATION_METHODS.map(m=><option key={m} value={m}>{m}</option>)}</select></div>
          <div style={s.mitigationItem}><span style={s.mitigationLabel}>Try Test Performed?</span><select name="tryTestPerformed" value={formData.tryTestPerformed} onChange={handleChange} style={s.mitigationSelect}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
          <div style={s.mitigationItem}><span style={s.mitigationLabel}>Stored Energy Released?</span><select name="storedEnergyReleased" value={formData.storedEnergyReleased} onChange={handleChange} style={s.mitigationSelect}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option><option value="N/A">N/A</option></select></div>
          <div style={s.mitigationItem}><span style={s.mitigationLabel}>All Devices Tagged?</span><select name="allDevicesTagged" value={formData.allDevicesTagged} onChange={handleChange} style={s.mitigationSelect}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
          <div style={s.mitigationItem}><span style={s.mitigationLabel}>Tag Stubs in Lockbox?</span><select name="tagStubsInLockbox" value={formData.tagStubsInLockbox} onChange={handleChange} style={s.mitigationSelect}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option><option value="N/A">N/A</option></select></div>
        </div></div>
        
        {/* PRE-WORK */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionCyan}}>📋 Pre-Work Requirements</div><div style={s.sectionBody}>
          <div style={s.mitigationItem}><span style={s.mitigationLabel}>Pre-Job Briefing Conducted?</span><select name="preJobBriefing" value={formData.preJobBriefing} onChange={handleChange} style={s.mitigationSelect}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
          <div style={s.mitigationItem}><span style={s.mitigationLabel}>Hazards Communicated to Workers?</span><select name="hazardsCommunicated" value={formData.hazardsCommunicated} onChange={handleChange} style={s.mitigationSelect}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
          <div style={s.mitigationItem}><span style={s.mitigationLabel}>Emergency Procedures Reviewed?</span><select name="emergencyProcedures" value={formData.emergencyProcedures} onChange={handleChange} style={s.mitigationSelect}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
          <div style={s.mitigationItem}><span style={s.mitigationLabel}>Affected Personnel Notified?</span><select name="affectedPersonnelNotified" value={formData.affectedPersonnelNotified} onChange={handleChange} style={s.mitigationSelect}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
        </div></div>
        
        {/* AUTHORIZATION */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionBlue}}>✍️ Authorization</div><div style={s.sectionBody}>
          <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Authorized Person Signature <span style={s.required}>*</span></label><input type="text" name="authorizedPersonSignature" value={formData.authorizedPersonSignature} onChange={handleChange} required placeholder="Type full name" style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Supervisor Approval <span style={s.required}>*</span></label><input type="text" name="supervisorApproval" value={formData.supervisorApproval} onChange={handleChange} required placeholder="Type full name" style={s.input}/></div></div>
          <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Permit Start Time <span style={s.required}>*</span></label><input type="time" name="startTime" value={formData.startTime} onChange={handleChange} required style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Permit Expiration Time <span style={s.required}>*</span></label><input type="time" name="expirationTime" value={formData.expirationTime} onChange={handleChange} required style={s.input}/></div></div>
        </div></div>
        
        <button type="submit" disabled={isSubmitting} style={{...s.submitBtn,opacity:isSubmitting?0.5:1}}>{isSubmitting?'Issuing Permit...':'Issue Energy Isolation Permit'}</button>
      </form>)}

      {/* WORKER TAB */}
      {activeTab==='worker'&&<div>{workerSuccess?<div style={s.successMessage}><div style={{fontSize:'48px',marginBottom:'15px'}}>✅</div><h2 style={{margin:'0 0 10px'}}>{workerMessage}</h2><button onClick={resetWorker} style={{...s.submitBtn,maxWidth:'200px',background:'white',color:'#059669',marginTop:'15px'}}>Continue</button></div>:<>
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionPurple}}>🔍 Select Permit</div><div style={s.sectionBody}>
          {openPermits.length===0?<p style={{textAlign:'center',color:'#6b7280'}}>No open permits found.</p>:openPermits.map(p=><div key={p.permit_number} style={{...s.permitCard,...(workerSelectedPermit===p.permit_number?s.permitCardSelected:{})}} onClick={()=>{setWorkerSelectedPermit(p.permit_number);loadActiveWorkers(p.permit_number);}}><div style={{fontWeight:'700',color:'#1e3a8a',fontSize:'14px'}}>{p.permit_number}</div><div style={{fontSize:'13px',color:'#6b7280',marginTop:'4px'}}>{p.location} | {p.equipment_id}</div></div>)}
        </div></div>
        
        {workerSelectedPermit&&<>
          <div style={s.section}><div style={{...s.sectionHeader,...s.sectionCyan}}>👷 Active Workers</div><div style={s.sectionBody}>
            {activeWorkers.length===0?<p style={{textAlign:'center',color:'#6b7280'}}>No workers currently signed in.</p>:activeWorkers.map(w=><div key={w.id} style={s.workerCard}><div style={s.workerInfo}><div style={s.workerName}>{w.worker_name}</div><div style={s.workerDetails}>Lock #{w.personal_lock_number} | In: {new Date(w.sign_in_time).toLocaleTimeString()}</div></div><button style={s.signoutBtn} onClick={()=>signOutWorker(w.id,w.worker_name)}>Sign Out</button></div>)}
          </div></div>
          
          <div style={s.section}><div style={{...s.sectionHeader,...s.sectionGreen}}>➕ Sign In New Worker</div><div style={s.sectionBody}>
            <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Worker Name <span style={s.required}>*</span></label><input type="text" value={workerData.workerName} onChange={e=>setWorkerData(p=>({...p,workerName:e.target.value}))} style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Company</label><select value={workerData.company} onChange={e=>setWorkerData(p=>({...p,company:e.target.value}))} style={s.select}><option value="">Select...</option>{COMPANIES.map(c=><option key={c} value={c}>{c}</option>)}</select></div></div>
            <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Personal Lock Number <span style={s.required}>*</span></label><input type="text" value={workerData.personalLockNumber} onChange={e=>setWorkerData(p=>({...p,personalLockNumber:e.target.value}))} placeholder="e.g., 001" style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Working Under</label><select value={workerData.workingUnder} onChange={e=>setWorkerData(p=>({...p,workingUnder:e.target.value}))} style={s.select}><option value="Individual">Individual</option><option value="Designated Worker">Designated Worker</option></select></div></div>
            <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Verified Isolation?</label><select value={workerData.verifiedIsolation} onChange={e=>setWorkerData(p=>({...p,verifiedIsolation:e.target.value}))} style={s.select}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option></select></div><div style={s.formGroup}><label style={s.label}>Verified Zero Energy?</label><select value={workerData.verifiedZeroEnergy} onChange={e=>setWorkerData(p=>({...p,verifiedZeroEnergy:e.target.value}))} style={s.select}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option></select></div></div>
            <button type="button" onClick={signInWorker} disabled={isSubmitting} style={{...s.submitBtn,...s.submitBtnPurple,opacity:isSubmitting?0.5:1}}>{isSubmitting?'Signing In...':'Sign In Worker'}</button>
          </div></div>
        </>}
      </>}</div>}
      
      {/* CLOSE OUT TAB */}
      {activeTab==='closeout'&&<div>{closeoutSuccess?<div style={s.successMessage}><div style={{fontSize:'48px',marginBottom:'15px'}}>✅</div><h2 style={{margin:'0 0 10px'}}>Permit Closed Successfully!</h2><p>Energy isolation has been terminated. Equipment may be re-energized.</p><button onClick={resetCloseout} style={{...s.submitBtn,maxWidth:'250px',background:'white',color:'#059669',marginTop:'15px'}}>Close Another Permit</button></div>:<>
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionGreen}}>🔍 Select Permit to Close</div><div style={s.sectionBody}>
          {openPermits.length===0?<p style={{textAlign:'center',color:'#6b7280'}}>No open permits found.</p>:openPermits.map(p=><div key={p.permit_number} style={{...s.permitCard,...(selectedPermit===p.permit_number?s.permitCardSelected:{})}} onClick={()=>{setSelectedPermit(p.permit_number);loadActiveWorkers(p.permit_number);}}><div style={{fontWeight:'700',color:'#1e3a8a',fontSize:'14px'}}>{p.permit_number}</div><div style={{fontSize:'13px',color:'#6b7280',marginTop:'4px'}}>{p.location} | {p.equipment_id} | {p.permit_initiator}</div></div>)}
        </div></div>
        
        {selectedPermit&&<div style={s.section}><div style={{...s.sectionHeader,...s.sectionGreen}}>✅ Close Out Checklist</div><div style={s.sectionBody}>
          <div style={s.infoBox}><strong>Closing Permit:</strong> {selectedPermit}</div>
          {activeWorkers.length>0&&<div style={s.warningBox}>⚠️ Workers still signed in - they must sign out before closing permit.</div>}
          {[{id:'allWorkersSignedOut',label:'All Workers Signed Out'},{id:'personalLocksRemoved',label:'All Personal Locks Removed'},{id:'deviceLocksRemoved',label:'All Device Locks Removed'},{id:'tagsRemovedMatched',label:'Tags Removed & Stubs Matched'},{id:'equipmentClear',label:'Equipment Clear & Ready for Startup'},{id:'safeToReenergize',label:'Safe to Re-Energize'}].map(v=><div key={v.id} style={{...s.verificationItem,...(closeoutData[v.id]?s.verificationItemChecked:{})}} onClick={()=>setCloseoutData(p=>({...p,[v.id]:!p[v.id]}))}><input type="checkbox" checked={closeoutData[v.id]} readOnly style={{marginRight:'10px',width:'18px',height:'18px',accentColor:'#059669'}}/><span style={{fontSize:'13px'}}>{v.label}</span></div>)}
          <div style={{...s.formRow,marginTop:'12px'}}><div style={s.formGroup}><label style={s.label}>Time Permit Closed <span style={s.required}>*</span></label><input type="time" value={closeoutData.timePermitClosed} onChange={e=>setCloseoutData(p=>({...p,timePermitClosed:e.target.value}))} required style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Close Out By <span style={s.required}>*</span></label><input type="text" value={closeoutData.closeOutBy} onChange={e=>setCloseoutData(p=>({...p,closeOutBy:e.target.value}))} required placeholder="Authorized Person" style={s.input}/></div></div>
          <button type="button" onClick={submitCloseout} disabled={isSubmitting||activeWorkers.length>0} style={{...s.submitBtn,...s.submitBtnGreen,opacity:(isSubmitting||activeWorkers.length>0)?0.5:1}}>{isSubmitting?'Closing...':'Close Out Permit'}</button>
        </div></div>}
      </>}</div>}
    </div>
    
    <div style={{textAlign:'center',padding:'20px',background:'linear-gradient(to bottom, #f8fafc, #ffffff)',color:'#64748b',fontSize:'11px',borderTop:'1px solid #e2e8f0'}}><span style={{color:'#1e3a5f',fontWeight:'500'}}>AnthroSafe™ Field Driven Safety</span><span style={{color:'#94a3b8',margin:'0 8px'}}>|</span><span style={{color:'#475569'}}>© 2026 SLP Alaska, LLC</span></div>
  </div></div>);
}

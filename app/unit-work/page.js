'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://iypezirwdlqpptjpeeyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
);

const COMPANIES = ['A-C Electric','AKE-Line','Apache Corp.','Armstrong Oil & Gas','ASRC Energy Services','CCI-Industrial','Chosen Construction','CINGSA','Coho Enterprises','Conam Construction','ConocoPhillips','Five Star Oilfield Services','Fox Energy Services','G.A. West','GBR Equipment','GLM Energy Services','Graham Industrial Coatings','Harvest Midstream','Hilcorp Alaska','MagTec Alaska','Merkes Builders','Nordic-Calista','Parker TRS','Peninsula Paving','Pollard Wireline','Ridgeline Oilfield Services','Santos','Summit Excavation','Tesoro Refinery','Yellowjacket','Other'];
const LOCATIONS = ['Kenai','CIO','Beaver Creek','Swanson River','Ninilchik','Nikiski','Other Kenai Asset','Deadhorse','Prudhoe Bay','Kuparuk','Alpine','Willow','ENI','PIKKA','Point Thompson','North Star Island','Endicott','Badami','Other North Slope'];
const RESPIRATORY_TYPES = ['Half-Face APR','Full-Face APR','PAPR','Supplied Air','SCBA'];
const HAZARD_CATEGORIES = [{id:'heights',label:'🪜 Heights / Fall Protection'},{id:'overWater',label:'🌊 Working Over Water'},{id:'highPressure',label:'💨 High Pressure Work'},{id:'lifting',label:'🏗️ Lifting Operations'},{id:'lowTemp',label:'🥶 Low Temp / High Wind'},{id:'manualHandling',label:'📦 Manual Material Handling (>50lb)'},{id:'excavation',label:'🚧 Excavation / Trenching'},{id:'otherHazard',label:'❗ Other High Hazard Work'}];
const GENERAL_VERIFICATIONS = [{id:'v1',label:'V1: Work area/equipment compatible and safe for work'},{id:'v2',label:'V2: ACWR/Pre-job safety review complete'},{id:'v3',label:'V3: Correct tools and equipment for task'},{id:'v4',label:'V4: Zero energy state verified (if applicable)'},{id:'v5',label:'V5: Work may cause remote alarm or shutdown'},{id:'v6',label:'V6: Work near halon/water mist discharge nozzle'},{id:'v7',label:'V7: Hoses and cords properly secured'},{id:'v8',label:'V8: All hazards discussed with workers'},{id:'v9',label:'V9: Critical lift plan reviewed (if applicable)'},{id:'v10',label:'V10: Flammable liquid transfer controls in place'}];
const HOT_TAP_VERIFICATIONS = [{id:'ht1',label:'HT1: Hot tap package complete and reviewed'},{id:'ht2',label:'HT2: Hot tap machine tested and verified'},{id:'ht3',label:'HT3: Supervisor notified and aware'},{id:'ht4',label:'HT4: Safety review completed with crew'}];
const XRAY_VERIFICATIONS = [{id:'xr1',label:'XR1: Warning signs and lights posted'},{id:'xr2',label:'XR2: Boundary limits clearly delineated'},{id:'xr3',label:'XR3: UVs bypassed (if required)'}];

function generatePermitNumber(){const now=new Date();const d=now.getFullYear()+String(now.getMonth()+1).padStart(2,'0')+String(now.getDate()).padStart(2,'0');return 'UWP-'+d+'-'+String(Math.floor(Math.random()*10000)).padStart(4,'0');}

function calculateIndicators(data){
  let good=0,bad=0;const notes=[];
  if(data.generalVerification?.v8){good++;notes.push('Hazards discussed with workers');}
  if(data.generalVerification?.v4)good++;
  if(data.generalVerification?.v1)good++;
  if(data.generalVerification?.v3)good++;
  if(data.generalVerification?.v7)good++;
  if(data.workGroupLeaderSign)good++;
  if(data.areaOperator)good++;
  let hazardCount=0;Object.values(data.hazardCategories||{}).forEach(v=>{if(v)hazardCount++;});
  if(hazardCount>0){good++;notes.push(hazardCount+' hazard categories identified');}
  if(data.crewMembers?.length>0){good++;notes.push(data.crewMembers.length+' crew members acknowledged hazards');}
  if(!data.generalVerification?.v8){bad++;notes.push('Hazards not discussed with workers');}
  if(!data.workGroupLeaderSign){bad++;notes.push('No work group leader signature');}
  if(!data.areaOperator){bad++;notes.push('No area operator authorization');}
  if(data.hotTapping==='Yes'&&!data.hotTapVerification?.ht1){bad++;notes.push('Hot tap package incomplete');}
  return {good,bad,notes};
}

export default function UnitWorkPermit(){
  const [activeTab,setActiveTab]=useState('new');
  const [isSubmitting,setIsSubmitting]=useState(false);
  const [submitted,setSubmitted]=useState(false);
  const [submittedPermit,setSubmittedPermit]=useState(null);
  const [openPermits,setOpenPermits]=useState([]);
  const [selectedPermit,setSelectedPermit]=useState(null);
  const [closeoutSuccess,setCloseoutSuccess]=useState(false);
  
  const [formData,setFormData]=useState({
    permitInitiator:'',date:new Date().toISOString().split('T')[0],company:'',location:'',phoneRadio:'',toolsEquipment:'',workDescription:'',workGroupLeader:'',
    respiratoryRequired:'',respiratoryType:'',hotTapping:'',hydroTesting:'',
    fireHalonBypassed:'',remoteShutdownsDisabled:'',
    atmoTestingRequired:'',atmoTests:[{time:'',oxygen:'',lel:'',h2s:'',co:'',other:'',tester:''},{time:'',oxygen:'',lel:'',h2s:'',co:'',other:'',tester:''}],
    hazardCategories:{},taskHazardMitigations:[{task:'',hazard:'',mitigation:''},{task:'',hazard:'',mitigation:''},{task:'',hazard:'',mitigation:''}],specialPrecautions:'',
    generalVerification:{},hotTapVerification:{},xrayVerification:{},
    crewMembers:[{name:'',company:''}],
    hotWorkPermit:'',confinedSpacePermit:'',energyIsolationPermit:'',processOpeningPermit:'',
    workGroupLeaderSign:'',supervisorApproval:'',boardOperator:'',areaOperator:'',startTime:'',expirationTime:''
  });
  
  const [closeoutData,setCloseoutData]=useState({jobCompleted:false,workAreaSecured:false,bypassedSystemsRestored:false,dsdLogUpdated:false,timePermitClosed:'',closeOutBy:'',areaOperatorCloseOut:''});

  useEffect(()=>{if(activeTab==='closeout')loadOpenPermits();},[activeTab]);

  const loadOpenPermits=async()=>{try{const{data}=await supabase.from('unit_work_permits').select('*').eq('permit_status','Open').order('created_at',{ascending:false});setOpenPermits(data||[]);}catch(e){console.error(e);}};

  const handleChange=(e)=>{const{name,value}=e.target;setFormData(p=>({...p,[name]:value}));};
  const handleHazardToggle=(id)=>{setFormData(p=>({...p,hazardCategories:{...p.hazardCategories,[id]:!p.hazardCategories[id]}}));};
  const handleGenVerifToggle=(id)=>{setFormData(p=>({...p,generalVerification:{...p.generalVerification,[id]:!p.generalVerification[id]}}));};
  const handleHotTapToggle=(id)=>{setFormData(p=>({...p,hotTapVerification:{...p.hotTapVerification,[id]:!p.hotTapVerification[id]}}));};
  const handleXrayToggle=(id)=>{setFormData(p=>({...p,xrayVerification:{...p.xrayVerification,[id]:!p.xrayVerification[id]}}));};
  
  const handleAtmoChange=(idx,field,value)=>{setFormData(p=>{const tests=[...p.atmoTests];tests[idx]={...tests[idx],[field]:value};return{...p,atmoTests:tests};});};
  const addAtmoTest=()=>{setFormData(p=>({...p,atmoTests:[...p.atmoTests,{time:'',oxygen:'',lel:'',h2s:'',co:'',other:'',tester:''}]}));};
  
  const handleTaskChange=(idx,field,value)=>{setFormData(p=>{const tasks=[...p.taskHazardMitigations];tasks[idx]={...tasks[idx],[field]:value};return{...p,taskHazardMitigations:tasks};});};
  
  const handleCrewChange=(idx,field,value)=>{setFormData(p=>{const crew=[...p.crewMembers];crew[idx]={...crew[idx],[field]:value};return{...p,crewMembers:crew};});};
  const addCrewMember=()=>{setFormData(p=>({...p,crewMembers:[...p.crewMembers,{name:'',company:''}]}));};
  const removeCrewMember=(idx)=>{setFormData(p=>({...p,crewMembers:p.crewMembers.filter((_,i)=>i!==idx)}));};

  const handleSubmit=async(e)=>{e.preventDefault();setIsSubmitting(true);
    try{
      const permitNumber=generatePermitNumber();
      const indicators=calculateIndicators(formData);
      const validCrew=formData.crewMembers.filter(c=>c.name);
      
      const{error}=await supabase.from('unit_work_permits').insert([{
        permit_number:permitNumber,permit_status:'Open',permit_initiator:formData.permitInitiator,date:formData.date,company:formData.company,location:formData.location,phone_radio:formData.phoneRadio,tools_equipment:formData.toolsEquipment,work_description:formData.workDescription,work_group_leader:formData.workGroupLeader,
        respiratory_required:formData.respiratoryRequired,respiratory_type:formData.respiratoryType,hot_tapping:formData.hotTapping,hydro_testing:formData.hydroTesting,
        fire_halon_bypassed:formData.fireHalonBypassed,remote_shutdowns_disabled:formData.remoteShutdownsDisabled,
        atmo_testing_required:formData.atmoTestingRequired,atmo_tests:formData.atmoTests.filter(t=>t.time||t.oxygen),
        hazard_categories:formData.hazardCategories,task_hazard_mitigations:formData.taskHazardMitigations.filter(t=>t.task),special_precautions:formData.specialPrecautions,
        general_verification:formData.generalVerification,hot_tap_verification:formData.hotTapVerification,xray_verification:formData.xrayVerification,
        hot_work_permit:formData.hotWorkPermit,confined_space_permit:formData.confinedSpacePermit,energy_isolation_permit:formData.energyIsolationPermit,process_opening_permit:formData.processOpeningPermit,
        work_group_leader_sign:formData.workGroupLeaderSign,supervisor_approval:formData.supervisorApproval,board_operator:formData.boardOperator,area_operator:formData.areaOperator,start_time:formData.startTime||null,expiration_time:formData.expirationTime||null,
        good_indicators:indicators.good,bad_indicators:indicators.bad,indicator_notes:indicators.notes.join('; '),crew_count:validCrew.length
      }]);
      if(error)throw error;
      
      // Insert crew members
      if(validCrew.length>0){
        const crewRows=validCrew.map(c=>({permit_number:permitNumber,crew_name:c.name,company:c.company,acknowledged_hazards:'Yes'}));
        await supabase.from('unit_work_crew_log').insert(crewRows);
      }
      
      setSubmittedPermit(permitNumber);setSubmitted(true);
    }catch(e){console.error(e);alert('Error: '+e.message);}finally{setIsSubmitting(false);}
  };

  const submitCloseout=async()=>{if(!selectedPermit){alert('Select a permit');return;}if(!closeoutData.closeOutBy||!closeoutData.areaOperatorCloseOut){alert('Fill required fields');return;}
    setIsSubmitting(true);try{
      const{error}=await supabase.from('unit_work_permits').update({permit_status:'Closed',job_completed:closeoutData.jobCompleted?'Yes':'',work_area_secured:closeoutData.workAreaSecured?'Yes':'',bypassed_systems_restored:closeoutData.bypassedSystemsRestored?'Yes':'',dsd_log_updated:closeoutData.dsdLogUpdated?'Yes':'',time_permit_closed:closeoutData.timePermitClosed||null,close_out_by:closeoutData.closeOutBy,area_operator_close_out:closeoutData.areaOperatorCloseOut,closed_at:new Date().toISOString()}).eq('permit_number',selectedPermit);
      if(error)throw error;setCloseoutSuccess(true);
    }catch(e){console.error(e);alert('Error: '+e.message);}finally{setIsSubmitting(false);}
  };

  const resetForm=()=>{setFormData({permitInitiator:'',date:new Date().toISOString().split('T')[0],company:'',location:'',phoneRadio:'',toolsEquipment:'',workDescription:'',workGroupLeader:'',respiratoryRequired:'',respiratoryType:'',hotTapping:'',hydroTesting:'',fireHalonBypassed:'',remoteShutdownsDisabled:'',atmoTestingRequired:'',atmoTests:[{time:'',oxygen:'',lel:'',h2s:'',co:'',other:'',tester:''},{time:'',oxygen:'',lel:'',h2s:'',co:'',other:'',tester:''}],hazardCategories:{},taskHazardMitigations:[{task:'',hazard:'',mitigation:''},{task:'',hazard:'',mitigation:''},{task:'',hazard:'',mitigation:''}],specialPrecautions:'',generalVerification:{},hotTapVerification:{},xrayVerification:{},crewMembers:[{name:'',company:''}],hotWorkPermit:'',confinedSpacePermit:'',energyIsolationPermit:'',processOpeningPermit:'',workGroupLeaderSign:'',supervisorApproval:'',boardOperator:'',areaOperator:'',startTime:'',expirationTime:''});setSubmitted(false);setSubmittedPermit(null);};
  const resetCloseout=()=>{setCloseoutData({jobCompleted:false,workAreaSecured:false,bypassedSystemsRestored:false,dsdLogUpdated:false,timePermitClosed:'',closeOutBy:'',areaOperatorCloseOut:''});setSelectedPermit(null);setCloseoutSuccess(false);loadOpenPermits();};

  const s={container:{minHeight:'100vh',background:'linear-gradient(135deg, #1e3a8a 0%, #b91c1c 100%)',padding:'20px'},formContainer:{maxWidth:'1000px',margin:'0 auto',background:'white',borderRadius:'12px',boxShadow:'0 4px 6px rgba(0,0,0,0.1)',overflow:'hidden'},header:{background:'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)',color:'white',padding:'25px',textAlign:'center'},content:{padding:'25px'},tabs:{display:'flex',background:'#f1f5f9',padding:'8px',gap:'8px'},tab:{flex:1,padding:'12px',border:'none',borderRadius:'8px',fontWeight:'600',cursor:'pointer',fontSize:'14px',transition:'all 0.2s'},tabActive:{background:'#1e3a8a',color:'white'},tabInactive:{background:'white',color:'#475569'},section:{marginBottom:'15px',border:'1px solid #e5e7eb',borderRadius:'10px',overflow:'hidden'},sectionHeader:{color:'white',padding:'10px 15px',fontWeight:'600',fontSize:'14px'},sectionBlue:{background:'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)'},sectionPurple:{background:'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)'},sectionCyan:{background:'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)'},sectionGreen:{background:'linear-gradient(135deg, #059669 0%, #047857 100%)'},sectionOrange:{background:'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)'},sectionAmber:{background:'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)'},sectionRed:{background:'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)'},sectionIndigo:{background:'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)'},sectionTeal:{background:'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)'},sectionBody:{padding:'12px',background:'#f8fafc'},formRow:{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))',gap:'12px',marginBottom:'12px'},formGroup:{display:'flex',flexDirection:'column'},label:{fontWeight:'600',color:'#374151',marginBottom:'4px',fontSize:'13px'},required:{color:'#b91c1c'},input:{padding:'8px 10px',border:'2px solid #d1d5db',borderRadius:'6px',fontSize:'14px'},select:{padding:'8px 10px',border:'2px solid #d1d5db',borderRadius:'6px',fontSize:'14px',background:'white'},textarea:{padding:'8px 10px',border:'2px solid #d1d5db',borderRadius:'6px',fontSize:'14px',minHeight:'60px',resize:'vertical'},infoBox:{background:'#dbeafe',borderLeft:'4px solid #3b82f6',padding:'10px',marginBottom:'12px',fontSize:'13px',borderRadius:'0 6px 6px 0'},warningBox:{background:'#fef3c7',borderLeft:'4px solid #f59e0b',padding:'10px',marginBottom:'12px',fontSize:'13px',borderRadius:'0 6px 6px 0'},criticalBox:{background:'#fee2e2',borderLeft:'4px solid #dc2626',padding:'10px',marginBottom:'12px',fontSize:'13px',borderRadius:'0 6px 6px 0'},checkboxGrid:{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))',gap:'8px'},checkboxItem:{display:'flex',alignItems:'center',background:'white',padding:'8px 10px',borderRadius:'6px',border:'2px solid #e5e7eb',cursor:'pointer',fontSize:'13px',transition:'all 0.2s'},checkboxItemChecked:{borderColor:'#1e3a8a',background:'#dbeafe'},checkboxItemHazard:{borderColor:'#dc2626',background:'#fee2e2'},radioGroup:{display:'flex',gap:'10px',flexWrap:'wrap'},radioItem:{display:'flex',alignItems:'center',gap:'6px',padding:'8px 12px',background:'white',border:'2px solid #e5e7eb',borderRadius:'6px',cursor:'pointer',fontSize:'13px'},radioItemSelected:{borderColor:'#1e3a8a',background:'#dbeafe'},verificationList:{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))',gap:'8px'},verificationItem:{display:'flex',alignItems:'flex-start',gap:'10px',padding:'10px',background:'white',border:'2px solid #e5e7eb',borderRadius:'6px',cursor:'pointer'},verificationItemChecked:{borderColor:'#059669',background:'#f0fdf4'},atmoRow:{display:'grid',gridTemplateColumns:'80px repeat(5,1fr) 120px',gap:'8px',marginBottom:'8px',alignItems:'end'},atmoRowHeader:{fontWeight:'600',fontSize:'12px',color:'#6b7280'},atmoInput:{padding:'6px',border:'1px solid #d1d5db',borderRadius:'4px',fontSize:'13px'},crewRow:{display:'grid',gridTemplateColumns:'1fr 1fr auto',gap:'10px',marginBottom:'8px',alignItems:'center'},crewInput:{padding:'8px',border:'1px solid #d1d5db',borderRadius:'6px',fontSize:'13px'},addBtn:{padding:'8px 15px',background:'#0d9488',color:'white',border:'none',borderRadius:'6px',cursor:'pointer',fontSize:'13px'},removeBtn:{padding:'6px 12px',background:'#dc2626',color:'white',border:'none',borderRadius:'6px',cursor:'pointer',fontSize:'12px'},taskTable:{width:'100%',borderCollapse:'collapse'},taskTh:{background:'#1e3a8a',color:'white',padding:'10px',textAlign:'left',fontSize:'13px'},taskTd:{padding:'6px',borderBottom:'1px solid #e5e7eb'},taskInput:{width:'100%',padding:'8px',border:'1px solid #d1d5db',borderRadius:'4px',fontSize:'13px'},submitBtn:{width:'100%',padding:'14px',background:'linear-gradient(135deg, #1e3a8a 0%, #b91c1c 100%)',color:'white',border:'none',borderRadius:'10px',fontSize:'16px',fontWeight:'600',cursor:'pointer',marginTop:'15px'},submitBtnGreen:{background:'linear-gradient(135deg, #059669 0%, #047857 100%)'},successMessage:{background:'linear-gradient(135deg, #059669 0%, #047857 100%)',color:'white',padding:'30px',borderRadius:'12px',textAlign:'center',margin:'20px 0'},permitCard:{background:'white',border:'2px solid #e5e7eb',borderRadius:'8px',padding:'12px',marginBottom:'10px',cursor:'pointer',transition:'all 0.2s'},permitCardSelected:{borderColor:'#059669',background:'#f0fdf4'}};

  if(submitted&&submittedPermit){return(<div style={s.container}><div style={{maxWidth:'600px',margin:'0 auto',paddingTop:'50px'}}><div style={s.successMessage}><div style={{fontSize:'48px',marginBottom:'15px'}}>✅</div><h2 style={{margin:'0 0 10px'}}>Permit Issued Successfully!</h2><div style={{background:'rgba(255,255,255,0.2)',padding:'12px',borderRadius:'8px',fontSize:'20px',fontWeight:'bold',margin:'15px 0'}}>{submittedPermit}</div><p>All crew members must acknowledge hazards before work begins.</p><div style={{display:'flex',gap:'10px',justifyContent:'center',marginTop:'20px',flexWrap:'wrap'}}><button onClick={resetForm} style={{...s.submitBtn,maxWidth:'200px',background:'white',color:'#059669'}}>Issue Another</button><a href="/" style={{...s.submitBtn,maxWidth:'200px',background:'#6b7280',textDecoration:'none',textAlign:'center'}}>Back to Portal</a></div></div></div></div>);}

  return(<div style={s.container}><div style={s.formContainer}>
    <div style={s.header}><a href="/" style={{color:'white',textDecoration:'none',fontSize:'14px'}}>← Back to Portal</a><div style={{background:'rgba(255,255,255,0.95)',borderRadius:'12px',padding:'15px',width:'fit-content',margin:'15px auto',boxShadow:'0 4px 15px rgba(0,0,0,0.2)'}}><img src="/Logo.png" alt="SLP Alaska" style={{maxWidth:'180px',height:'auto'}}/></div><div style={{display:'inline-block',background:'white',color:'#1e40af',padding:'5px 14px',borderRadius:'20px',fontWeight:'700',fontSize:'12px',marginBottom:'12px',border:'3px solid white'}}>📋 MASTER PERMIT</div><h1 style={{margin:'0 0 5px',fontSize:'20px'}}>Unit Work Permit</h1><p style={{opacity:0.9,fontSize:'13px'}}>Master Permit - Coordinating All Work Activities</p></div>
    
    <div style={s.tabs}><button style={{...s.tab,...(activeTab==='new'?s.tabActive:s.tabInactive)}} onClick={()=>setActiveTab('new')}>📝 New Permit</button><button style={{...s.tab,...(activeTab==='closeout'?s.tabActive:s.tabInactive)}} onClick={()=>setActiveTab('closeout')}>✅ Close Out Permit</button></div>
    
    <div style={s.content}>
      {activeTab==='new'&&(<form onSubmit={handleSubmit}>
        {/* SECTION 1: PERMIT INFO */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionBlue}}>📋 Section 1: Permit Information</div><div style={s.sectionBody}>
          <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Permit Initiator <span style={s.required}>*</span></label><input type="text" name="permitInitiator" value={formData.permitInitiator} onChange={handleChange} required style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Date <span style={s.required}>*</span></label><input type="date" name="date" value={formData.date} onChange={handleChange} required style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Company <span style={s.required}>*</span></label><select name="company" value={formData.company} onChange={handleChange} required style={s.select}><option value="">Select...</option>{COMPANIES.map(c=><option key={c} value={c}>{c}</option>)}</select></div></div>
          <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Location <span style={s.required}>*</span></label><select name="location" value={formData.location} onChange={handleChange} required style={s.select}><option value="">Select...</option>{LOCATIONS.map(l=><option key={l} value={l}>{l}</option>)}</select></div><div style={s.formGroup}><label style={s.label}>Phone/Radio</label><input type="text" name="phoneRadio" value={formData.phoneRadio} onChange={handleChange} style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Work Group Leader <span style={s.required}>*</span></label><input type="text" name="workGroupLeader" value={formData.workGroupLeader} onChange={handleChange} required style={s.input}/></div></div>
          <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Tools/Equipment</label><input type="text" name="toolsEquipment" value={formData.toolsEquipment} onChange={handleChange} placeholder="List major tools/equipment" style={s.input}/></div></div>
          <div style={s.formGroup}><label style={s.label}>Work Description <span style={s.required}>*</span></label><textarea name="workDescription" value={formData.workDescription} onChange={handleChange} required placeholder="Describe the work to be performed..." style={s.textarea}/></div>
          <div style={{...s.formRow,marginTop:'12px'}}><div style={s.formGroup}><label style={s.label}>Respiratory Protection Required?</label><div style={s.radioGroup}>{['Yes','No'].map(v=><label key={v} style={{...s.radioItem,...(formData.respiratoryRequired===v?s.radioItemSelected:{})}}><input type="radio" name="respiratoryRequired" value={v} checked={formData.respiratoryRequired===v} onChange={handleChange}/><span>{v}</span></label>)}</div></div>{formData.respiratoryRequired==='Yes'&&<div style={s.formGroup}><label style={s.label}>Respiratory Type</label><select name="respiratoryType" value={formData.respiratoryType} onChange={handleChange} style={s.select}><option value="">Select...</option>{RESPIRATORY_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></div>}<div style={s.formGroup}><label style={s.label}>Hot Tapping Operations?</label><div style={s.radioGroup}>{['Yes','No'].map(v=><label key={v} style={{...s.radioItem,...(formData.hotTapping===v?s.radioItemSelected:{})}}><input type="radio" name="hotTapping" value={v} checked={formData.hotTapping===v} onChange={handleChange}/><span>{v}</span></label>)}</div></div><div style={s.formGroup}><label style={s.label}>Hydro Testing?</label><div style={s.radioGroup}>{['Yes','No'].map(v=><label key={v} style={{...s.radioItem,...(formData.hydroTesting===v?s.radioItemSelected:{})}}><input type="radio" name="hydroTesting" value={v} checked={formData.hydroTesting===v} onChange={handleChange}/><span>{v}</span></label>)}</div></div></div>
        </div></div>
        
        {/* SECTION 2: AREA OPERATOR */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionPurple}}>🔧 Section 2: Area Operator Requirements</div><div style={s.sectionBody}>
          <div style={s.warningBox}>⚠️ Complete this section with the Area Operator. Systems bypassed must be documented in DSD log.</div>
          <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Fire/Halon System Bypassed?</label><div style={s.radioGroup}>{['Yes','No','N/A'].map(v=><label key={v} style={{...s.radioItem,...(formData.fireHalonBypassed===v?s.radioItemSelected:{})}}><input type="radio" name="fireHalonBypassed" value={v} checked={formData.fireHalonBypassed===v} onChange={handleChange}/><span>{v}</span></label>)}</div></div><div style={s.formGroup}><label style={s.label}>Remote Shutdowns Disabled?</label><div style={s.radioGroup}>{['Yes','No','N/A'].map(v=><label key={v} style={{...s.radioItem,...(formData.remoteShutdownsDisabled===v?s.radioItemSelected:{})}}><input type="radio" name="remoteShutdownsDisabled" value={v} checked={formData.remoteShutdownsDisabled===v} onChange={handleChange}/><span>{v}</span></label>)}</div></div></div>
        </div></div>
        
        {/* SECTION 3: ATMOSPHERIC TESTING */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionCyan}}>🌬️ Section 3: Atmospheric Testing</div><div style={s.sectionBody}>
          <div style={s.formGroup}><label style={s.label}>Atmospheric Testing Required? <span style={s.required}>*</span></label><div style={s.radioGroup}>{['Yes','No'].map(v=><label key={v} style={{...s.radioItem,...(formData.atmoTestingRequired===v?s.radioItemSelected:{})}}><input type="radio" name="atmoTestingRequired" value={v} checked={formData.atmoTestingRequired===v} onChange={handleChange} required/><span>{v}</span></label>)}</div></div>
          {formData.atmoTestingRequired==='Yes'&&<><div style={s.infoBox}>ℹ️ Acceptable Levels: O₂: 19.5-23.5% | LEL: &lt; 10% | H₂S: &lt; 10 ppm | CO: &lt; 25 ppm</div><div style={{background:'white',border:'2px solid #0891b2',borderRadius:'8px',padding:'12px'}}><div style={s.atmoRow}><div style={s.atmoRowHeader}>Time</div><div style={s.atmoRowHeader}>O₂ %</div><div style={s.atmoRowHeader}>LEL %</div><div style={s.atmoRowHeader}>H₂S ppm</div><div style={s.atmoRowHeader}>CO ppm</div><div style={s.atmoRowHeader}>Other</div><div style={s.atmoRowHeader}>Tester</div></div>{formData.atmoTests.map((t,i)=><div key={i} style={s.atmoRow}><input type="time" value={t.time} onChange={e=>handleAtmoChange(i,'time',e.target.value)} style={s.atmoInput}/><input type="text" value={t.oxygen} onChange={e=>handleAtmoChange(i,'oxygen',e.target.value)} placeholder="19.5-23.5" style={s.atmoInput}/><input type="text" value={t.lel} onChange={e=>handleAtmoChange(i,'lel',e.target.value)} placeholder="<10" style={s.atmoInput}/><input type="text" value={t.h2s} onChange={e=>handleAtmoChange(i,'h2s',e.target.value)} placeholder="<10" style={s.atmoInput}/><input type="text" value={t.co} onChange={e=>handleAtmoChange(i,'co',e.target.value)} placeholder="<25" style={s.atmoInput}/><input type="text" value={t.other} onChange={e=>handleAtmoChange(i,'other',e.target.value)} style={s.atmoInput}/><input type="text" value={t.tester} onChange={e=>handleAtmoChange(i,'tester',e.target.value)} style={s.atmoInput}/></div>)}</div><button type="button" onClick={addAtmoTest} style={{...s.addBtn,marginTop:'10px'}}>+ Add Another Test</button></>}
        </div></div>
        
        {/* SECTION 4: CRITICAL HAZARDS */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionRed}}>⚠️ Section 4: Critical Hazard Categories</div><div style={s.sectionBody}>
          <div style={s.criticalBox}>🚨 Check ALL applicable hazard categories. Each checked category requires specific controls and documentation.</div>
          <div style={s.checkboxGrid}>{HAZARD_CATEGORIES.map(h=><div key={h.id} style={{...s.checkboxItem,...(formData.hazardCategories[h.id]?s.checkboxItemHazard:{})}} onClick={()=>handleHazardToggle(h.id)}><input type="checkbox" checked={formData.hazardCategories[h.id]||false} readOnly style={{marginRight:'8px',accentColor:'#dc2626'}}/><span>{h.label}</span></div>)}</div>
        </div></div>
        
        {/* SECTION 5: TASK/HAZARD/MITIGATION */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionIndigo}}>📝 Section 5: Task/Hazard/Mitigation Analysis</div><div style={s.sectionBody}>
          <table style={s.taskTable}><thead><tr><th style={{...s.taskTh,width:'30%'}}>Task</th><th style={{...s.taskTh,width:'30%'}}>Hazard</th><th style={{...s.taskTh,width:'40%'}}>Mitigation</th></tr></thead><tbody>{formData.taskHazardMitigations.map((t,i)=><tr key={i}><td style={s.taskTd}><input type="text" value={t.task} onChange={e=>handleTaskChange(i,'task',e.target.value)} placeholder="Task description" style={s.taskInput}/></td><td style={s.taskTd}><input type="text" value={t.hazard} onChange={e=>handleTaskChange(i,'hazard',e.target.value)} placeholder="Associated hazard" style={s.taskInput}/></td><td style={s.taskTd}><input type="text" value={t.mitigation} onChange={e=>handleTaskChange(i,'mitigation',e.target.value)} placeholder="Control measure" style={s.taskInput}/></td></tr>)}</tbody></table>
          <div style={{...s.formGroup,marginTop:'15px'}}><label style={s.label}>Special Precautions / Additional Notes</label><textarea name="specialPrecautions" value={formData.specialPrecautions} onChange={handleChange} placeholder="Any special precautions or additional safety requirements..." style={s.textarea}/></div>
        </div></div>
        
        {/* SECTION 6: GENERAL VERIFICATION */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionGreen}}>✅ Section 6: General Verification</div><div style={s.sectionBody}>
          <div style={s.infoBox}>ℹ️ All applicable items must be verified before work begins. Mark N/A if not applicable to this work.</div>
          <div style={s.verificationList}>{GENERAL_VERIFICATIONS.map(v=><div key={v.id} style={{...s.verificationItem,...(formData.generalVerification[v.id]?s.verificationItemChecked:{})}} onClick={()=>handleGenVerifToggle(v.id)}><input type="checkbox" checked={formData.generalVerification[v.id]||false} readOnly style={{marginTop:'3px',accentColor:'#059669'}}/><span style={{fontSize:'13px',lineHeight:'1.4'}}>{v.label}</span></div>)}</div>
        </div></div>
        
        {/* HOT TAP VERIFICATION */}
        {formData.hotTapping==='Yes'&&<div style={s.section}><div style={{...s.sectionHeader,...s.sectionOrange}}>🔥 Hot Tap Verification</div><div style={s.sectionBody}>
          <div style={s.criticalBox}>🚨 Hot Tapping requires additional verification. All items must be confirmed.</div>
          <div style={s.verificationList}>{HOT_TAP_VERIFICATIONS.map(v=><div key={v.id} style={{...s.verificationItem,...(formData.hotTapVerification[v.id]?s.verificationItemChecked:{})}} onClick={()=>handleHotTapToggle(v.id)}><input type="checkbox" checked={formData.hotTapVerification[v.id]||false} readOnly style={{marginTop:'3px',accentColor:'#ea580c'}}/><span style={{fontSize:'13px',lineHeight:'1.4'}}>{v.label}</span></div>)}</div>
        </div></div>}
        
        {/* X-RAY VERIFICATION */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionAmber}}>☢️ X-Ray / Radiography Verification (if applicable)</div><div style={s.sectionBody}>
          <div style={s.verificationList}>{XRAY_VERIFICATIONS.map(v=><div key={v.id} style={{...s.verificationItem,...(formData.xrayVerification[v.id]?s.verificationItemChecked:{})}} onClick={()=>handleXrayToggle(v.id)}><input type="checkbox" checked={formData.xrayVerification[v.id]||false} readOnly style={{marginTop:'3px',accentColor:'#eab308'}}/><span style={{fontSize:'13px',lineHeight:'1.4'}}>{v.label}</span></div>)}</div>
        </div></div>
        
        {/* SECTION 7: CREW SIGN-IN */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionTeal}}>👷 Section 7: Crew Sign-In</div><div style={s.sectionBody}>
          <div style={s.infoBox}>ℹ️ All crew members must acknowledge hazards before beginning work. Add each crew member below.</div>
          <div style={{background:'white',border:'2px solid #0d9488',borderRadius:'8px',padding:'12px'}}>{formData.crewMembers.map((c,i)=><div key={i} style={s.crewRow}><input type="text" value={c.name} onChange={e=>handleCrewChange(i,'name',e.target.value)} placeholder="Crew Member Name" style={s.crewInput}/><select value={c.company} onChange={e=>handleCrewChange(i,'company',e.target.value)} style={{...s.crewInput,background:'white'}}><option value="">Select Company...</option>{COMPANIES.map(co=><option key={co} value={co}>{co}</option>)}</select>{i>0&&<button type="button" onClick={()=>removeCrewMember(i)} style={s.removeBtn}>Remove</button>}</div>)}</div>
          <button type="button" onClick={addCrewMember} style={{...s.addBtn,marginTop:'10px'}}>+ Add Crew Member</button>
        </div></div>
        
        {/* SECTION 8: RELATED PERMITS */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionPurple}}>🔗 Section 8: Related Permits</div><div style={s.sectionBody}>
          <div style={s.infoBox}>ℹ️ Reference any related permits that apply to this work scope.</div>
          <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Hot Work Permit #</label><input type="text" name="hotWorkPermit" value={formData.hotWorkPermit} onChange={handleChange} placeholder="e.g., HWP-20260127-0001" style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Confined Space Entry Permit #</label><input type="text" name="confinedSpacePermit" value={formData.confinedSpacePermit} onChange={handleChange} placeholder="e.g., CSE-20260127-0001" style={s.input}/></div></div>
          <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Energy Isolation (LOTO) Permit #</label><input type="text" name="energyIsolationPermit" value={formData.energyIsolationPermit} onChange={handleChange} placeholder="e.g., EI-20260127-0001" style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Process Opening/Blinding Permit #</label><input type="text" name="processOpeningPermit" value={formData.processOpeningPermit} onChange={handleChange} placeholder="e.g., POB-20260127-0001" style={s.input}/></div></div>
        </div></div>
        
        {/* SECTION 9: AUTHORIZATION */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionGreen}}>✍️ Section 9: Authorization</div><div style={s.sectionBody}>
          <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Work Group Leader Signature <span style={s.required}>*</span></label><input type="text" name="workGroupLeaderSign" value={formData.workGroupLeaderSign} onChange={handleChange} required style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Supervisor Approval <span style={s.required}>*</span></label><input type="text" name="supervisorApproval" value={formData.supervisorApproval} onChange={handleChange} required style={s.input}/></div></div>
          <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Board Operator</label><input type="text" name="boardOperator" value={formData.boardOperator} onChange={handleChange} style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Area Operator <span style={s.required}>*</span></label><input type="text" name="areaOperator" value={formData.areaOperator} onChange={handleChange} required style={s.input}/></div></div>
          <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Start Time <span style={s.required}>*</span></label><input type="time" name="startTime" value={formData.startTime} onChange={handleChange} required style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Expiration Time <span style={s.required}>*</span></label><input type="time" name="expirationTime" value={formData.expirationTime} onChange={handleChange} required style={s.input}/></div></div>
        </div></div>
        
        <button type="submit" disabled={isSubmitting} style={{...s.submitBtn,opacity:isSubmitting?0.5:1}}>{isSubmitting?'Issuing Permit...':'Submit Permit'}</button>
      </form>)}
      
      {/* CLOSE OUT TAB */}
      {activeTab==='closeout'&&<div>{closeoutSuccess?<div style={s.successMessage}><div style={{fontSize:'48px',marginBottom:'15px'}}>✅</div><h2 style={{margin:'0 0 10px'}}>Permit Closed Successfully!</h2><p>Work area has been returned to safe condition.</p><button onClick={resetCloseout} style={{...s.submitBtn,maxWidth:'250px',background:'white',color:'#059669',marginTop:'15px'}}>Close Another Permit</button></div>:<>
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionGreen}}>🔍 Select Permit to Close Out</div><div style={s.sectionBody}>
          {openPermits.length===0?<p style={{textAlign:'center',color:'#6b7280'}}>No open permits found.</p>:openPermits.map(p=><div key={p.permit_number} style={{...s.permitCard,...(selectedPermit===p.permit_number?s.permitCardSelected:{})}} onClick={()=>setSelectedPermit(p.permit_number)}><div style={{fontWeight:'700',color:'#1e3a8a',fontSize:'14px'}}>{p.permit_number}</div><div style={{fontSize:'13px',color:'#6b7280',marginTop:'4px'}}>{p.location} | {p.work_description?.substring(0,50)}</div></div>)}
        </div></div>
        
        {selectedPermit&&<div style={s.section}><div style={{...s.sectionHeader,...s.sectionRed}}>✅ Close Out Checklist</div><div style={s.sectionBody}>
          <div style={s.warningBox}>⚠️ Verify all items before closing the permit. Work area must be returned to safe condition.</div>
          <div style={s.infoBox}><strong>Closing Permit:</strong> {selectedPermit}</div>
          <div style={s.checkboxGrid}>{[{id:'jobCompleted',label:'Job Completed as Planned'},{id:'workAreaSecured',label:'Work Area Secured'},{id:'bypassedSystemsRestored',label:'Bypassed Systems Restored'},{id:'dsdLogUpdated',label:'DSD Log Updated'}].map(v=><div key={v.id} style={{...s.checkboxItem,...(closeoutData[v.id]?s.checkboxItemChecked:{})}} onClick={()=>setCloseoutData(p=>({...p,[v.id]:!p[v.id]}))}><input type="checkbox" checked={closeoutData[v.id]} readOnly style={{marginRight:'8px',accentColor:'#1e3a8a'}}/><span>{v.label}</span></div>)}</div>
          <div style={{...s.formRow,marginTop:'12px'}}><div style={s.formGroup}><label style={s.label}>Time Permit Closed <span style={s.required}>*</span></label><input type="time" value={closeoutData.timePermitClosed} onChange={e=>setCloseoutData(p=>({...p,timePermitClosed:e.target.value}))} required style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Closed Out By <span style={s.required}>*</span></label><input type="text" value={closeoutData.closeOutBy} onChange={e=>setCloseoutData(p=>({...p,closeOutBy:e.target.value}))} required style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Area Operator Close Out <span style={s.required}>*</span></label><input type="text" value={closeoutData.areaOperatorCloseOut} onChange={e=>setCloseoutData(p=>({...p,areaOperatorCloseOut:e.target.value}))} required style={s.input}/></div></div>
          <button type="button" onClick={submitCloseout} disabled={isSubmitting} style={{...s.submitBtn,...s.submitBtnGreen,opacity:isSubmitting?0.5:1}}>{isSubmitting?'Closing...':'Close Out Permit'}</button>
        </div></div>}
      </>}</div>}
    </div>
    
    <div style={{textAlign:'center',padding:'20px',background:'linear-gradient(to bottom, #f8fafc, #ffffff)',color:'#64748b',fontSize:'11px',borderTop:'1px solid #e2e8f0'}}><span style={{color:'#1e3a5f',fontWeight:'500'}}>Powered by Predictive Safety Analytics™</span><span style={{color:'#94a3b8',margin:'0 8px'}}>|</span><span style={{color:'#475569'}}>© 2025 SLP Alaska</span></div>
  </div></div>);
}

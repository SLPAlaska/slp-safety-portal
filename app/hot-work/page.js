'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://iypezirwdlqpptjpeeyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
);

const COMPANIES = ['A-C Electric','AKE-Line','Apache Corp.','Armstrong Oil & Gas','ASRC Energy Services','CCI-Industrial','Chosen Construction','CINGSA','Coho Enterprises','Conam Construction','ConocoPhillips','Five Star Oilfield Services','Fox Energy Services','G.A. West','GBR Equipment','GLM Energy Services','Graham Industrial Coatings','Harvest Midstream','Hilcorp Alaska','MagTec Alaska','Merkes Builders','Nordic-Calista','Parker TRS','Peninsula Paving','Pollard Wireline','Ridgeline Oilfield Services','Santos','Summit Excavation','Tesoro Refinery','Yellowjacket','Other'];
const LOCATIONS = ['Kenai','CIO','Beaver Creek','Swanson River','Ninilchik','Nikiski','Other Kenai Asset','Deadhorse','Prudhoe Bay','Kuparuk','Alpine','Willow','ENI','PIKKA','Point Thompson','North Star Island','Endicott','Badami','Other North Slope'];
const HOT_WORK_TYPES = ['Arc Welding','Gas Welding (Oxy-Acetylene)','Cutting (Torch)','Grinding','Brazing','Soldering','Heat Treatment','Thawing Pipe','Hot Tapping','Other'];
const TOOLS_EQUIPMENT = ['Arc Welder','MIG Welder','TIG Welder','Stick Welder','Oxy-Acetylene Torch','Plasma Cutter','Angle Grinder','Bench Grinder','Chop Saw','Heat Gun','Propane Torch','Multiple Tools','Other'];
const FIRE_WATCH_DURATIONS = ['30 minutes','60 minutes','Continuous','Other'];
const HAZARD_CATEGORIES = [{id:'workingAtHeights',label:'Working at Heights'},{id:'workingOverWater',label:'Working Over Water'},{id:'highPressureWork',label:'High Pressure Work'},{id:'criticalLifts',label:'Critical Lifts'},{id:'lowTempHighWind',label:'Low Temp/High Wind'},{id:'manualHandling',label:'Manual Handling >50lb'},{id:'excavationTrenching',label:'Excavation/Trenching'},{id:'otherHighHazard',label:'Other High Hazard'}];

function generatePermitNumber(){const now=new Date();const d=now.getFullYear()+String(now.getMonth()+1).padStart(2,'0')+String(now.getDate()).padStart(2,'0');return 'HWP-'+d+'-'+String(Math.floor(Math.random()*10000)).padStart(4,'0');}

function calculateIndicators(data){
  let good=0,bad=0;const notes=[];
  if(data.workAreaCompatible==='Yes')good++;
  if(data.correctLineEquipment==='Yes')good++;
  if(data.verifiedZeroEnergy==='Yes')good++;
  if(data.flammablesRemoved==='Yes')good++;
  if(data.sparkContainment==='Yes')good++;
  if(data.fireExtinguisher==='Yes')good++;
  if(data.sumpsDrainsCovered==='Yes')good++;
  if(data.gasTest1Time&&data.gasTest1Tester){good++;notes.push('Gas testing completed');}
  if(data.continualGasMonitoring==='Yes'){good++;notes.push('Continual gas monitoring in place');}
  if(data.hazard1&&data.mitigation1){good++;notes.push('Hazards identified with mitigations');}
  if(data.crewAcknowledgment==='Yes'){good++;notes.push('Crew acknowledged stop work authority');}
  if(data.fireWatch==='Yes'){good++;notes.push('Fire watch assigned');}
  if(data.fireHalonBypassed==='Yes'){bad++;notes.push('WARNING: Fire/Halon system bypassed');}
  if(data.remoteShutdowns==='Yes'){bad++;notes.push('WARNING: Remote shutdowns disabled');}
  if(data.remoteAlarmPossible==='Yes'){bad++;notes.push('CAUTION: Work may cause remote alarm');}
  if(data.nearHalonWaterMist==='Yes'){bad++;notes.push('CAUTION: Work near Halon/Water Mist discharge');}
  if(data.workAreaCompatible==='No'||!data.workAreaCompatible){bad++;notes.push('ISSUE: Work area compatibility not verified');}
  if(data.fireExtinguisher!=='Yes'){bad++;notes.push('ISSUE: Fire extinguisher not confirmed');}
  if(data.hazardCategories?.workingAtHeights)bad+=0.5;
  if(data.hazardCategories?.highPressureWork)bad+=0.5;
  if(data.hazardCategories?.criticalLifts)bad+=0.5;
  if(data.hazardCategories?.lowTempHighWind)bad+=0.5;
  return {good:Math.round(good),bad:Math.round(bad),notes};
}

export default function HotWorkPermit(){
  const [activeTab,setActiveTab]=useState('new');
  const [isSubmitting,setIsSubmitting]=useState(false);
  const [submitted,setSubmitted]=useState(false);
  const [submittedPermit,setSubmittedPermit]=useState(null);
  const [openPermits,setOpenPermits]=useState([]);
  const [selectedPermit,setSelectedPermit]=useState(null);
  const [closeoutSuccess,setCloseoutSuccess]=useState(false);
  
  const [formData,setFormData]=useState({
    permitInitiator:'',date:new Date().toISOString().split('T')[0],hotWorkType:'',company:'',location:'',phoneRadio:'',toolsEquipment:'',workLocationDetail:'',workDescription:'',
    zeroEnergyState:'',flowPressureReq:'',flammableAtmosphere:'',fireHalonBypassed:'',remoteShutdowns:'',
    gasTest1Time:'',gasTest1O2:'',gasTest1LEL:'',gasTest1H2S:'',gasTest1CO:'',gasTest1Other:'',gasTest1Tester:'',
    gasTest2Time:'',gasTest2O2:'',gasTest2LEL:'',gasTest2H2S:'',gasTest2CO:'',gasTest2Other:'',gasTest2Tester:'',
    specialPrecautionsNA:'',specialPrecautions:'',
    safetyReviewedWelding:'',workAreaCompatible:'',correctLineEquipment:'',verifiedZeroEnergy:'',flammablesRemoved:'',remoteAlarmPossible:'',nearHalonWaterMist:'',continualGasMonitoring:'',sumpsDrainsCovered:'',sparkContainment:'',purgeReviewed:'',fireExtinguisher:'',respiratoryProtection:'',
    fireWatch:'',fireWatchDuration:'',
    weldingMachineGrounded:'',hosesConnected:'',gasCylindersSecured:'',ventilationAdequate:'',inServiceWeldingPackage:'',utReportVerified:'',
    hazardCategories:{},hazardTask1:'',hazard1:'',mitigation1:'',hazardTask2:'',hazard2:'',mitigation2:'',hazardTask3:'',hazard3:'',mitigation3:'',
    workGroupLeader:'',companySafetyRep:'',responsibleSupervisor:'',boardOperator:'',areaOperator:'',startTime:'',expirationTime:'',crewAcknowledgment:''
  });
  
  const [closeoutData,setCloseoutData]=useState({jobCompleted:false,workAreaSecured:false,systemsReturned:false,safetyDefeatedLog:false,fireWatchCompleted:false,timePermitClosed:'',closeOutWorker:'',closeOutOperator:''});

  useEffect(()=>{if(activeTab==='closeout')loadOpenPermits();},[activeTab]);

  const loadOpenPermits=async()=>{try{const{data}=await supabase.from('hot_work_permits').select('*').eq('permit_status','Open').order('created_at',{ascending:false});setOpenPermits(data||[]);}catch(e){console.error(e);}};

  const handleChange=(e)=>{const{name,value}=e.target;setFormData(p=>({...p,[name]:value}));};
  const handleHazardToggle=(id)=>{setFormData(p=>({...p,hazardCategories:{...p.hazardCategories,[id]:!p.hazardCategories[id]}}));};

  const handleSubmit=async(e)=>{e.preventDefault();setIsSubmitting(true);
    try{
      const permitNumber=generatePermitNumber();
      const indicators=calculateIndicators(formData);
      
      const{error}=await supabase.from('hot_work_permits').insert([{
        permit_number:permitNumber,permit_status:'Open',permit_initiator:formData.permitInitiator,date:formData.date,company:formData.company,location:formData.location,hot_work_type:formData.hotWorkType,tools_equipment:formData.toolsEquipment,phone_radio:formData.phoneRadio,work_description:formData.workDescription,work_location_detail:formData.workLocationDetail,
        zero_energy_state:formData.zeroEnergyState,flow_pressure_req:formData.flowPressureReq,flammable_atmosphere:formData.flammableAtmosphere,fire_halon_bypassed:formData.fireHalonBypassed,remote_shutdowns:formData.remoteShutdowns,
        gas_test_1_time:formData.gasTest1Time||null,gas_test_1_o2:formData.gasTest1O2,gas_test_1_lel:formData.gasTest1LEL,gas_test_1_h2s:formData.gasTest1H2S,gas_test_1_co:formData.gasTest1CO,gas_test_1_other:formData.gasTest1Other,gas_test_1_tester:formData.gasTest1Tester,
        gas_test_2_time:formData.gasTest2Time||null,gas_test_2_o2:formData.gasTest2O2,gas_test_2_lel:formData.gasTest2LEL,gas_test_2_h2s:formData.gasTest2H2S,gas_test_2_co:formData.gasTest2CO,gas_test_2_other:formData.gasTest2Other,gas_test_2_tester:formData.gasTest2Tester,
        special_precautions_na:formData.specialPrecautionsNA,special_precautions:formData.specialPrecautions,
        safety_reviewed_welding:formData.safetyReviewedWelding,work_area_compatible:formData.workAreaCompatible,correct_line_equipment:formData.correctLineEquipment,verified_zero_energy:formData.verifiedZeroEnergy,flammables_removed:formData.flammablesRemoved,remote_alarm_possible:formData.remoteAlarmPossible,near_halon_water_mist:formData.nearHalonWaterMist,continual_gas_monitoring:formData.continualGasMonitoring,sumps_drains_covered:formData.sumpsDrainsCovered,spark_containment:formData.sparkContainment,purge_reviewed:formData.purgeReviewed,fire_extinguisher:formData.fireExtinguisher,respiratory_protection:formData.respiratoryProtection,
        fire_watch:formData.fireWatch,fire_watch_duration:formData.fireWatchDuration,
        welding_machine_grounded:formData.weldingMachineGrounded,hoses_connected:formData.hosesConnected,gas_cylinders_secured:formData.gasCylindersSecured,ventilation_adequate:formData.ventilationAdequate,in_service_welding_package:formData.inServiceWeldingPackage,ut_report_verified:formData.utReportVerified,
        hazard_categories:formData.hazardCategories,hazard_task_1:formData.hazardTask1,hazard_1:formData.hazard1,mitigation_1:formData.mitigation1,hazard_task_2:formData.hazardTask2,hazard_2:formData.hazard2,mitigation_2:formData.mitigation2,hazard_task_3:formData.hazardTask3,hazard_3:formData.hazard3,mitigation_3:formData.mitigation3,
        work_group_leader:formData.workGroupLeader,company_safety_rep:formData.companySafetyRep,responsible_supervisor:formData.responsibleSupervisor,board_operator:formData.boardOperator,area_operator:formData.areaOperator,start_time:formData.startTime||null,expiration_time:formData.expirationTime||null,crew_acknowledgment:formData.crewAcknowledgment,
        good_indicators:indicators.good,bad_indicators:indicators.bad,indicator_notes:indicators.notes.join('; ')
      }]);
      if(error)throw error;
      setSubmittedPermit(permitNumber);setSubmitted(true);
    }catch(e){console.error(e);alert('Error: '+e.message);}finally{setIsSubmitting(false);}
  };

  const submitCloseout=async()=>{if(!selectedPermit){alert('Select a permit');return;}if(!closeoutData.closeOutWorker||!closeoutData.closeOutOperator){alert('Fill required fields');return;}
    setIsSubmitting(true);try{
      const{error}=await supabase.from('hot_work_permits').update({permit_status:'Closed',job_completed:closeoutData.jobCompleted?'Yes':'No',work_area_secured:closeoutData.workAreaSecured?'Yes':'No',systems_returned:closeoutData.systemsReturned?'Yes':'No',safety_defeated_log:closeoutData.safetyDefeatedLog?'Yes':'No',fire_watch_completed:closeoutData.fireWatchCompleted?'Yes':'No',time_permit_closed:closeoutData.timePermitClosed||null,close_out_worker:closeoutData.closeOutWorker,close_out_operator:closeoutData.closeOutOperator,closed_at:new Date().toISOString()}).eq('permit_number',selectedPermit);
      if(error)throw error;setCloseoutSuccess(true);
    }catch(e){console.error(e);alert('Error: '+e.message);}finally{setIsSubmitting(false);}
  };

  const resetForm=()=>{setFormData({permitInitiator:'',date:new Date().toISOString().split('T')[0],hotWorkType:'',company:'',location:'',phoneRadio:'',toolsEquipment:'',workLocationDetail:'',workDescription:'',zeroEnergyState:'',flowPressureReq:'',flammableAtmosphere:'',fireHalonBypassed:'',remoteShutdowns:'',gasTest1Time:'',gasTest1O2:'',gasTest1LEL:'',gasTest1H2S:'',gasTest1CO:'',gasTest1Other:'',gasTest1Tester:'',gasTest2Time:'',gasTest2O2:'',gasTest2LEL:'',gasTest2H2S:'',gasTest2CO:'',gasTest2Other:'',gasTest2Tester:'',specialPrecautionsNA:'',specialPrecautions:'',safetyReviewedWelding:'',workAreaCompatible:'',correctLineEquipment:'',verifiedZeroEnergy:'',flammablesRemoved:'',remoteAlarmPossible:'',nearHalonWaterMist:'',continualGasMonitoring:'',sumpsDrainsCovered:'',sparkContainment:'',purgeReviewed:'',fireExtinguisher:'',respiratoryProtection:'',fireWatch:'',fireWatchDuration:'',weldingMachineGrounded:'',hosesConnected:'',gasCylindersSecured:'',ventilationAdequate:'',inServiceWeldingPackage:'',utReportVerified:'',hazardCategories:{},hazardTask1:'',hazard1:'',mitigation1:'',hazardTask2:'',hazard2:'',mitigation2:'',hazardTask3:'',hazard3:'',mitigation3:'',workGroupLeader:'',companySafetyRep:'',responsibleSupervisor:'',boardOperator:'',areaOperator:'',startTime:'',expirationTime:'',crewAcknowledgment:''});setSubmitted(false);setSubmittedPermit(null);};
  const resetCloseout=()=>{setCloseoutData({jobCompleted:false,workAreaSecured:false,systemsReturned:false,safetyDefeatedLog:false,fireWatchCompleted:false,timePermitClosed:'',closeOutWorker:'',closeOutOperator:''});setSelectedPermit(null);setCloseoutSuccess(false);loadOpenPermits();};

  const s={container:{minHeight:'100vh',background:'linear-gradient(135deg, #1e3a8a 0%, #b91c1c 100%)',padding:'20px'},formContainer:{maxWidth:'1000px',margin:'0 auto',background:'white',borderRadius:'12px',boxShadow:'0 4px 6px rgba(0,0,0,0.1)',overflow:'hidden'},header:{background:'linear-gradient(135deg, #1e3a8a 0%, #b91c1c 100%)',color:'white',padding:'25px',textAlign:'center'},content:{padding:'25px'},tabs:{display:'flex',background:'#f1f5f9',padding:'8px',gap:'8px'},tab:{flex:1,padding:'12px',border:'none',borderRadius:'8px',fontWeight:'600',cursor:'pointer',fontSize:'14px',transition:'all 0.2s'},tabActive:{background:'#1e3a8a',color:'white'},tabInactive:{background:'white',color:'#475569'},section:{marginBottom:'15px',border:'1px solid #e5e7eb',borderRadius:'10px',overflow:'hidden'},sectionHeader:{color:'white',padding:'10px 15px',fontWeight:'600',fontSize:'14px'},sectionBlue:{background:'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)'},sectionRed:{background:'linear-gradient(135deg, #b91c1c 0%, #991b1b 100%)'},sectionGreen:{background:'linear-gradient(135deg, #059669 0%, #047857 100%)'},sectionPurple:{background:'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)'},sectionCyan:{background:'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)'},sectionAmber:{background:'linear-gradient(135deg, #d97706 0%, #b45309 100%)'},sectionOrange:{background:'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)'},sectionBody:{padding:'12px',background:'#f8fafc'},formRow:{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))',gap:'12px',marginBottom:'12px'},formGroup:{display:'flex',flexDirection:'column'},label:{fontWeight:'600',color:'#374151',marginBottom:'4px',fontSize:'13px'},required:{color:'#b91c1c'},input:{padding:'8px 10px',border:'2px solid #d1d5db',borderRadius:'6px',fontSize:'14px'},select:{padding:'8px 10px',border:'2px solid #d1d5db',borderRadius:'6px',fontSize:'14px',background:'white'},textarea:{padding:'8px 10px',border:'2px solid #d1d5db',borderRadius:'6px',fontSize:'14px',minHeight:'60px',resize:'vertical'},infoBox:{background:'#eff6ff',borderLeft:'4px solid #1e3a8a',padding:'10px',marginBottom:'12px',fontSize:'13px',borderRadius:'0 6px 6px 0'},warningBox:{background:'#fef3c7',borderLeft:'4px solid #d97706',padding:'10px',marginBottom:'12px',fontSize:'13px',borderRadius:'0 6px 6px 0'},mitigationItem:{display:'flex',justifyContent:'space-between',alignItems:'center',background:'white',padding:'8px 12px',borderRadius:'6px',border:'1px solid #e5e7eb',marginBottom:'6px'},mitigationLabel:{fontSize:'13px',flex:1},mitigationSelect:{width:'100px',padding:'5px 8px',fontSize:'13px'},hazardGrid:{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))',gap:'8px'},hazardItem:{display:'flex',alignItems:'center',background:'white',padding:'8px 10px',borderRadius:'6px',border:'1px solid #e5e7eb',cursor:'pointer',fontSize:'13px'},hazardItemChecked:{background:'#fef3c7',borderColor:'#d97706'},hazardTable:{width:'100%',borderCollapse:'collapse',background:'white',borderRadius:'6px',overflow:'hidden'},hazardTableTh:{background:'#f1f5f9',padding:'8px',textAlign:'left',fontSize:'13px',fontWeight:'600'},hazardTableTd:{padding:'6px',borderTop:'1px solid #e5e7eb'},verificationItem:{display:'flex',alignItems:'center',background:'white',padding:'10px',borderRadius:'6px',marginBottom:'6px',cursor:'pointer',border:'1px solid #e5e7eb'},verificationItemChecked:{background:'#dcfce7',borderLeft:'3px solid #059669'},submitBtn:{width:'100%',padding:'14px',background:'linear-gradient(135deg, #1e3a8a 0%, #b91c1c 100%)',color:'white',border:'none',borderRadius:'10px',fontSize:'16px',fontWeight:'600',cursor:'pointer',marginTop:'15px'},submitBtnGreen:{background:'linear-gradient(135deg, #059669 0%, #047857 100%)'},successMessage:{background:'linear-gradient(135deg, #059669 0%, #047857 100%)',color:'white',padding:'30px',borderRadius:'12px',textAlign:'center',margin:'20px 0'},permitCard:{background:'white',border:'2px solid #e5e7eb',borderRadius:'8px',padding:'12px',marginBottom:'10px',cursor:'pointer',transition:'all 0.2s'},permitCardSelected:{borderColor:'#059669',background:'#f0fdf4'}};

  if(submitted&&submittedPermit){return(<div style={s.container}><div style={{maxWidth:'600px',margin:'0 auto',paddingTop:'50px'}}><div style={s.successMessage}><div style={{fontSize:'48px',marginBottom:'15px'}}>✅</div><h2 style={{margin:'0 0 10px'}}>Permit Issued Successfully!</h2><div style={{background:'rgba(255,255,255,0.2)',padding:'12px',borderRadius:'8px',fontSize:'20px',fontWeight:'bold',margin:'15px 0'}}>{submittedPermit}</div><p>Fire watch must continue for at least 30 minutes after hot work is completed.</p><div style={{display:'flex',gap:'10px',justifyContent:'center',marginTop:'20px',flexWrap:'wrap'}}><button onClick={resetForm} style={{...s.submitBtn,maxWidth:'200px',background:'white',color:'#059669'}}>Issue Another</button><a href="/" style={{...s.submitBtn,maxWidth:'200px',background:'#6b7280',textDecoration:'none',textAlign:'center'}}>Back to Portal</a></div></div></div></div>);}

  return(<div style={s.container}><div style={s.formContainer}>
    <div style={s.header}><a href="/" style={{color:'white',textDecoration:'none',fontSize:'14px'}}>← Back to Portal</a><div style={{background:'rgba(255,255,255,0.95)',borderRadius:'12px',padding:'15px',width:'fit-content',margin:'15px auto',boxShadow:'0 4px 15px rgba(0,0,0,0.2)'}}><img src="/Logo.png" alt="SLP Alaska" style={{maxWidth:'180px',height:'auto'}}/></div><div style={{display:'inline-block',background:'white',color:'#ea580c',padding:'5px 14px',borderRadius:'20px',fontWeight:'700',fontSize:'12px',marginBottom:'12px',border:'3px solid white'}}>🔥 HOT WORK PERMIT</div><h1 style={{margin:'0 0 5px',fontSize:'20px'}}>Hot Work Permit</h1><p style={{opacity:0.9,fontSize:'13px'}}>SLP Alaska Safety Management System</p></div>
    
    <div style={s.tabs}><button style={{...s.tab,...(activeTab==='new'?s.tabActive:s.tabInactive)}} onClick={()=>setActiveTab('new')}>📝 New Permit</button><button style={{...s.tab,...(activeTab==='closeout'?s.tabActive:s.tabInactive)}} onClick={()=>setActiveTab('closeout')}>✅ Close Out Permit</button></div>
    
    <div style={s.content}>
      {activeTab==='new'&&(<form onSubmit={handleSubmit}>
        {/* PERMIT INFO */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionBlue}}>📋 Permit Information</div><div style={s.sectionBody}>
          <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Permit Initiator <span style={s.required}>*</span></label><input type="text" name="permitInitiator" value={formData.permitInitiator} onChange={handleChange} required style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Date <span style={s.required}>*</span></label><input type="date" name="date" value={formData.date} onChange={handleChange} required style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Hot Work Type <span style={s.required}>*</span></label><select name="hotWorkType" value={formData.hotWorkType} onChange={handleChange} required style={s.select}><option value="">Select...</option>{HOT_WORK_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></div></div>
          <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Client/Company <span style={s.required}>*</span></label><select name="company" value={formData.company} onChange={handleChange} required style={s.select}><option value="">Select...</option>{COMPANIES.map(c=><option key={c} value={c}>{c}</option>)}</select></div><div style={s.formGroup}><label style={s.label}>Location <span style={s.required}>*</span></label><select name="location" value={formData.location} onChange={handleChange} required style={s.select}><option value="">Select...</option>{LOCATIONS.map(l=><option key={l} value={l}>{l}</option>)}</select></div><div style={s.formGroup}><label style={s.label}>Phone/Radio</label><input type="text" name="phoneRadio" value={formData.phoneRadio} onChange={handleChange} style={s.input}/></div></div>
          <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Tools/Equipment Used</label><select name="toolsEquipment" value={formData.toolsEquipment} onChange={handleChange} style={s.select}><option value="">Select...</option>{TOOLS_EQUIPMENT.map(t=><option key={t} value={t}>{t}</option>)}</select></div><div style={s.formGroup}><label style={s.label}>Work Location Detail</label><input type="text" name="workLocationDetail" value={formData.workLocationDetail} onChange={handleChange} placeholder="e.g., Pipe rack Level 2" style={s.input}/></div></div>
          <div style={s.formGroup}><label style={s.label}>Work Description <span style={s.required}>*</span></label><textarea name="workDescription" value={formData.workDescription} onChange={handleChange} required placeholder="Describe the hot work being performed..." style={s.textarea}/></div>
        </div></div>
        
        {/* AREA OPERATOR REQUIREMENTS */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionOrange}}>⚠️ Area Operator Requirements</div><div style={s.sectionBody}>
          <div style={s.warningBox}>These items must be verified by the Area Operator/Issuing Authority before hot work begins.</div>
          {[{id:'zeroEnergyState',label:'Zero Energy State Achieved?'},{id:'flowPressureReq',label:'Flow/Pressure Requirements Met?'},{id:'flammableAtmosphere',label:'Flammable Atmosphere Mitigated?'},{id:'fireHalonBypassed',label:'Fire/Halon/Water Mist Bypassed?'},{id:'remoteShutdowns',label:'Remote Shutdowns Disabled?'}].map(item=><div key={item.id} style={s.mitigationItem}><span style={s.mitigationLabel}>{item.label}</span><select name={item.id} value={formData[item.id]} onChange={handleChange} style={s.mitigationSelect}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option>{(item.id==='zeroEnergyState'||item.id==='flowPressureReq')&&<option value="N/A">N/A</option>}</select></div>)}
        </div></div>
        
        {/* GAS TESTING */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionPurple}}>🧪 Gas Testing</div><div style={s.sectionBody}>
          <div style={s.infoBox}>Gas testing required before and during hot work. Acceptable levels: O₂: 19.5-23.5%, LEL: &lt;10%, H₂S: &lt;10 ppm, CO: &lt;25 ppm</div>
          <p style={{fontSize:'13px',fontWeight:'600',marginBottom:'8px'}}>Test 1 (Initial):</p>
          <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Time</label><input type="time" name="gasTest1Time" value={formData.gasTest1Time} onChange={handleChange} style={s.input}/></div><div style={s.formGroup}><label style={s.label}>O₂ (%)</label><input type="text" name="gasTest1O2" value={formData.gasTest1O2} onChange={handleChange} placeholder="19.5-23.5" style={s.input}/></div><div style={s.formGroup}><label style={s.label}>LEL (%)</label><input type="text" name="gasTest1LEL" value={formData.gasTest1LEL} onChange={handleChange} placeholder="<10" style={s.input}/></div><div style={s.formGroup}><label style={s.label}>H₂S (ppm)</label><input type="text" name="gasTest1H2S" value={formData.gasTest1H2S} onChange={handleChange} placeholder="<10" style={s.input}/></div><div style={s.formGroup}><label style={s.label}>CO (ppm)</label><input type="text" name="gasTest1CO" value={formData.gasTest1CO} onChange={handleChange} placeholder="<25" style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Other</label><input type="text" name="gasTest1Other" value={formData.gasTest1Other} onChange={handleChange} style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Tester</label><input type="text" name="gasTest1Tester" value={formData.gasTest1Tester} onChange={handleChange} style={s.input}/></div></div>
          <p style={{fontSize:'13px',fontWeight:'600',margin:'12px 0 8px'}}>Test 2 (Follow-up):</p>
          <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Time</label><input type="time" name="gasTest2Time" value={formData.gasTest2Time} onChange={handleChange} style={s.input}/></div><div style={s.formGroup}><label style={s.label}>O₂ (%)</label><input type="text" name="gasTest2O2" value={formData.gasTest2O2} onChange={handleChange} style={s.input}/></div><div style={s.formGroup}><label style={s.label}>LEL (%)</label><input type="text" name="gasTest2LEL" value={formData.gasTest2LEL} onChange={handleChange} style={s.input}/></div><div style={s.formGroup}><label style={s.label}>H₂S (ppm)</label><input type="text" name="gasTest2H2S" value={formData.gasTest2H2S} onChange={handleChange} style={s.input}/></div><div style={s.formGroup}><label style={s.label}>CO (ppm)</label><input type="text" name="gasTest2CO" value={formData.gasTest2CO} onChange={handleChange} style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Other</label><input type="text" name="gasTest2Other" value={formData.gasTest2Other} onChange={handleChange} style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Tester</label><input type="text" name="gasTest2Tester" value={formData.gasTest2Tester} onChange={handleChange} style={s.input}/></div></div>
        </div></div>
        
        {/* SPECIAL PRECAUTIONS */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionAmber}}>📝 Special Precautions</div><div style={s.sectionBody}>
          <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Special Precautions N/A?</label><select name="specialPrecautionsNA" value={formData.specialPrecautionsNA} onChange={handleChange} style={s.select}><option value="">Select...</option><option value="Yes">Yes - N/A</option><option value="No">No - Required</option></select></div></div>
          <div style={s.formGroup}><label style={s.label}>Special Precautions Details</label><textarea name="specialPrecautions" value={formData.specialPrecautions} onChange={handleChange} placeholder="List any special precautions required..." style={s.textarea}/></div>
        </div></div>
        
        {/* VERIFICATION OF CONDITIONS */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionGreen}}>✓ Verification of Conditions</div><div style={s.sectionBody}>
          {[{id:'safetyReviewedWelding',label:'Safety Requirements Reviewed for Welding/Cutting?'},{id:'workAreaCompatible',label:'Work Area Compatible with Hot Work?'},{id:'correctLineEquipment',label:'Correct Line/Equipment Identified?'},{id:'verifiedZeroEnergy',label:'Zero Energy State Verified?',na:true},{id:'flammablesRemoved',label:'Flammables Removed/Protected (35ft)?'},{id:'remoteAlarmPossible',label:'Work May Cause Remote Alarm?'},{id:'nearHalonWaterMist',label:'Near Halon/Water Mist Discharge?'},{id:'continualGasMonitoring',label:'Continual Gas Monitoring in Place?'},{id:'sumpsDrainsCovered',label:'Sumps/Drains/Vents Covered?',na:true},{id:'sparkContainment',label:'Spark Containment Adequate?'},{id:'purgeReviewed',label:'Purge Required/Reviewed?',na:true},{id:'fireExtinguisher',label:'Fire Extinguisher Present?'},{id:'respiratoryProtection',label:'Respiratory Protection Required?'}].map(v=><div key={v.id} style={s.mitigationItem}><span style={s.mitigationLabel}>{v.label}</span><select name={v.id} value={formData[v.id]} onChange={handleChange} style={s.mitigationSelect}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option>{v.na&&<option value="N/A">N/A</option>}</select></div>)}
        </div></div>
        
        {/* FIRE WATCH */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionRed}}>🔥 Fire Watch</div><div style={s.sectionBody}>
          <div style={s.warningBox}>Fire watch is required during hot work and for a minimum of 30 minutes after hot work is completed.</div>
          <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Fire Watch Assigned?</label><select name="fireWatch" value={formData.fireWatch} onChange={handleChange} style={s.select}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option></select></div><div style={s.formGroup}><label style={s.label}>Fire Watch Duration</label><select name="fireWatchDuration" value={formData.fireWatchDuration} onChange={handleChange} style={s.select}><option value="">Select...</option>{FIRE_WATCH_DURATIONS.map(d=><option key={d} value={d}>{d}</option>)}</select></div></div>
        </div></div>
        
        {/* IN-SERVICE WELDING */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionCyan}}>⚡ In-Service Welding Requirements</div><div style={s.sectionBody}>
          {[{id:'weldingMachineGrounded',label:'Welding Machine Properly Grounded?',na:true},{id:'hosesConnected',label:'Hoses/Cables Connected Properly?',na:true},{id:'gasCylindersSecured',label:'Gas Cylinders Secured Upright?',na:true},{id:'ventilationAdequate',label:'Ventilation Adequate?'},{id:'inServiceWeldingPackage',label:'In-Service Welding Package Required?',na:true},{id:'utReportVerified',label:'UT Report Verified (Min Wall)?',na:true}].map(w=><div key={w.id} style={s.mitigationItem}><span style={s.mitigationLabel}>{w.label}</span><select name={w.id} value={formData[w.id]} onChange={handleChange} style={s.mitigationSelect}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option>{w.na&&<option value="N/A">N/A</option>}</select></div>)}
        </div></div>
        
        {/* CRITICAL HAZARD CATEGORIES */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionRed}}>⚠️ Critical Hazard Categories</div><div style={s.sectionBody}>
          <p style={{fontSize:'13px',marginBottom:'8px',color:'#6b7280'}}>Check all hazard categories that apply:</p>
          <div style={s.hazardGrid}>{HAZARD_CATEGORIES.map(h=><div key={h.id} style={{...s.hazardItem,...(formData.hazardCategories[h.id]?s.hazardItemChecked:{})}} onClick={()=>handleHazardToggle(h.id)}><input type="checkbox" checked={formData.hazardCategories[h.id]||false} readOnly style={{marginRight:'8px',accentColor:'#ea580c'}}/><span>{h.label}</span></div>)}</div>
        </div></div>
        
        {/* HAZARD MITIGATION TABLE */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionPurple}}>🔧 Hazard Mitigation</div><div style={s.sectionBody}>
          <table style={s.hazardTable}><thead><tr><th style={s.hazardTableTh}>Task</th><th style={s.hazardTableTh}>Hazard</th><th style={s.hazardTableTh}>Mitigation</th></tr></thead><tbody>
            {[1,2,3].map(n=><tr key={n}><td style={s.hazardTableTd}><input type="text" name={`hazardTask${n}`} value={formData[`hazardTask${n}`]} onChange={handleChange} placeholder="Task" style={{...s.input,width:'100%'}}/></td><td style={s.hazardTableTd}><input type="text" name={`hazard${n}`} value={formData[`hazard${n}`]} onChange={handleChange} placeholder="Hazard" style={{...s.input,width:'100%'}}/></td><td style={s.hazardTableTd}><input type="text" name={`mitigation${n}`} value={formData[`mitigation${n}`]} onChange={handleChange} placeholder="Mitigation" style={{...s.input,width:'100%'}}/></td></tr>)}
          </tbody></table>
        </div></div>
        
        {/* AUTHORIZATION */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionBlue}}>✍️ Authorization</div><div style={s.sectionBody}>
          <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Work Group Leader <span style={s.required}>*</span></label><input type="text" name="workGroupLeader" value={formData.workGroupLeader} onChange={handleChange} required style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Company Safety Rep</label><input type="text" name="companySafetyRep" value={formData.companySafetyRep} onChange={handleChange} style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Responsible Supervisor <span style={s.required}>*</span></label><input type="text" name="responsibleSupervisor" value={formData.responsibleSupervisor} onChange={handleChange} required style={s.input}/></div></div>
          <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Board Operator</label><input type="text" name="boardOperator" value={formData.boardOperator} onChange={handleChange} style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Area Operator</label><input type="text" name="areaOperator" value={formData.areaOperator} onChange={handleChange} style={s.input}/></div></div>
          <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Start Time <span style={s.required}>*</span></label><input type="time" name="startTime" value={formData.startTime} onChange={handleChange} required style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Expiration Time <span style={s.required}>*</span></label><input type="time" name="expirationTime" value={formData.expirationTime} onChange={handleChange} required style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Crew Acknowledgment</label><select name="crewAcknowledgment" value={formData.crewAcknowledgment} onChange={handleChange} style={s.select}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option></select></div></div>
        </div></div>
        
        <button type="submit" disabled={isSubmitting} style={{...s.submitBtn,opacity:isSubmitting?0.5:1}}>{isSubmitting?'Issuing Permit...':'Issue Hot Work Permit'}</button>
      </form>)}
      
      {/* CLOSE OUT TAB */}
      {activeTab==='closeout'&&<div>{closeoutSuccess?<div style={s.successMessage}><div style={{fontSize:'48px',marginBottom:'15px'}}>✅</div><h2 style={{margin:'0 0 10px'}}>Permit Closed Successfully!</h2><p>Hot work has been completed and area has been secured.</p><button onClick={resetCloseout} style={{...s.submitBtn,maxWidth:'250px',background:'white',color:'#059669',marginTop:'15px'}}>Close Another Permit</button></div>:<>
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionGreen}}>🔍 Select Permit to Close</div><div style={s.sectionBody}>
          {openPermits.length===0?<p style={{textAlign:'center',color:'#6b7280'}}>No open permits found.</p>:openPermits.map(p=><div key={p.permit_number} style={{...s.permitCard,...(selectedPermit===p.permit_number?s.permitCardSelected:{})}} onClick={()=>setSelectedPermit(p.permit_number)}><div style={{fontWeight:'700',color:'#1e3a8a',fontSize:'14px'}}>{p.permit_number}</div><div style={{fontSize:'13px',color:'#6b7280',marginTop:'4px'}}>{p.location} | {p.work_description?.substring(0,40)}</div></div>)}
        </div></div>
        
        {selectedPermit&&<div style={s.section}><div style={{...s.sectionHeader,...s.sectionGreen}}>✅ Close Out Checklist</div><div style={s.sectionBody}>
          <div style={s.infoBox}><strong>Closing Permit:</strong> {selectedPermit}</div>
          {[{id:'jobCompleted',label:'Job Completed as Planned'},{id:'workAreaSecured',label:'Work Area Secured & Inspected'},{id:'systemsReturned',label:'Systems Returned to Service'},{id:'safetyDefeatedLog',label:'Safety Defeated Log Updated'},{id:'fireWatchCompleted',label:'Fire Watch Completed (30+ min after)'}].map(v=><div key={v.id} style={{...s.verificationItem,...(closeoutData[v.id]?s.verificationItemChecked:{})}} onClick={()=>setCloseoutData(p=>({...p,[v.id]:!p[v.id]}))}><input type="checkbox" checked={closeoutData[v.id]} readOnly style={{marginRight:'10px',width:'18px',height:'18px',accentColor:'#059669'}}/><span style={{fontSize:'13px'}}>{v.label}</span></div>)}
          <div style={{...s.formRow,marginTop:'12px'}}><div style={s.formGroup}><label style={s.label}>Time Permit Closed <span style={s.required}>*</span></label><input type="time" value={closeoutData.timePermitClosed} onChange={e=>setCloseoutData(p=>({...p,timePermitClosed:e.target.value}))} required style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Close Out By (Worker) <span style={s.required}>*</span></label><input type="text" value={closeoutData.closeOutWorker} onChange={e=>setCloseoutData(p=>({...p,closeOutWorker:e.target.value}))} required style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Area Operator <span style={s.required}>*</span></label><input type="text" value={closeoutData.closeOutOperator} onChange={e=>setCloseoutData(p=>({...p,closeOutOperator:e.target.value}))} required style={s.input}/></div></div>
          <button type="button" onClick={submitCloseout} disabled={isSubmitting} style={{...s.submitBtn,...s.submitBtnGreen,opacity:isSubmitting?0.5:1}}>{isSubmitting?'Closing...':'Close Out Permit'}</button>
        </div></div>}
      </>}</div>}
    </div>
    
    <div style={{textAlign:'center',padding:'20px',background:'linear-gradient(to bottom, #f8fafc, #ffffff)',color:'#64748b',fontSize:'11px',borderTop:'1px solid #e2e8f0'}}><span style={{color:'#1e3a5f',fontWeight:'500'}}>AnthroSafe™ Powered by Field Driven Data™</span><span style={{color:'#94a3b8',margin:'0 8px'}}>|</span><span style={{color:'#475569'}}>© 2025 SLP Alaska</span></div>
  </div></div>);
}

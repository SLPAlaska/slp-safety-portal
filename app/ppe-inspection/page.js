'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://iypezirwdlqpptjpeeyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
);

const COMPANIES = ['A-C Electric','AKE-Line','Apache Corp.','Armstrong Oil & Gas','ASRC Energy Services','CCI-Industrial','Chosen Construction','CINGSA','Coho Enterprises','Conam Construction','ConocoPhillips','Five Star Oilfield Services','Fox Energy Services','G.A. West','GBR Equipment','GLM Energy Services','Graham Industrial Coatings','Harvest Midstream','Hilcorp Alaska','MagTec Alaska','Merkes Builders','Nordic-Calista','Parker TRS','Peninsula Paving','Pollard Wireline','Ridgeline Oilfield Services','Santos','Summit Excavation','Tesoro Refinery','Yellowjacket','Other'];
const LOCATIONS = ['Kenai','CIO','Beaver Creek','Swanson River','Ninilchik','Nikiski','Other Kenai Asset','Deadhorse','Prudhoe Bay','Kuparuk','Alpine','Willow','ENI','PIKKA','Point Thompson','North Star Island','Endicott','Badami','Other North Slope'];

export default function PPEInspection(){
  const [isSubmitting,setIsSubmitting]=useState(false);
  const [submitted,setSubmitted]=useState(false);
  const [expandedSections,setExpandedSections]=useState({head:false,eye:false,hearing:false,respiratory:false,hand:false,body:false,foot:false,fall:false});
  const [formData,setFormData]=useState({
    inspectorName:'',date:new Date().toISOString().split('T')[0],company:'',location:'',employeeName:'',employeeId:'',
    headProtectionInspected:'No',hardHatType:'',hardHatCondition:'',suspensionSystem:'',shellCracks:'',expirationDateCheck:'',chinStrap:'',headProtectionResult:'',
    eyeFaceProtectionInspected:'No',eyeProtectionType:'',lensCondition:'',frameCondition:'',antiFogCoating:'',sideShields:'',faceShieldCondition:'',eyeFaceProtectionResult:'',
    hearingProtectionInspected:'No',hearingProtectionType:'',earmuffCondition:'',earCushions:'',headbandTension:'',earplugCondition:'',nrrRatingVisible:'',hearingProtectionResult:'',
    respiratoryProtectionInspected:'No',respiratorType:'',facepieceCondition:'',strapsHarness:'',valvesCondition:'',cartridgeFilterStatus:'',cartridgeExpiration:'',fitTestCurrent:'',medicalClearanceCurrent:'',respiratoryProtectionResult:'',
    handProtectionInspected:'No',gloveType:'',gloveMaterial:'',tearsHoles:'',chemicalResistance:'',gripCondition:'',cuffCondition:'',handProtectionResult:'',
    bodyProtectionInspected:'No',bodyProtectionType:'',frClothingCondition:'',arcRatingVisible:'',chemicalSuitCondition:'',seamsClosures:'',highVisCondition:'',reflectiveStrips:'',bodyProtectionResult:'',
    footProtectionInspected:'No',footwearType:'',steelCompositeToe:'',soleCondition:'',upperCondition:'',metatarsalGuard:'',ehRating:'',lacesClosures:'',footProtectionResult:'',
    fallProtectionInspected:'No',harnessPresent:'',lanyardSrlPresent:'',fallProtectionStatus:'',
    overallResult:'',ppeReplacementNeeded:'',replacementItems:'',trainingCurrent:'',comments:''
  });

  const handleChange=(e)=>{const{name,value}=e.target;setFormData(p=>({...p,[name]:value}));};
  const toggleSection=(section,value)=>{
    setExpandedSections(p=>({...p,[section]:value==='Yes'}));
    const fieldMap={head:'headProtectionInspected',eye:'eyeFaceProtectionInspected',hearing:'hearingProtectionInspected',respiratory:'respiratoryProtectionInspected',hand:'handProtectionInspected',body:'bodyProtectionInspected',foot:'footProtectionInspected',fall:'fallProtectionInspected'};
    setFormData(p=>({...p,[fieldMap[section]]:value}));
  };

  const handleSubmit=async(e)=>{e.preventDefault();setIsSubmitting(true);
    const sectionsInspected=[];
    if(formData.headProtectionInspected==='Yes')sectionsInspected.push('Head');
    if(formData.eyeFaceProtectionInspected==='Yes')sectionsInspected.push('Eye/Face');
    if(formData.hearingProtectionInspected==='Yes')sectionsInspected.push('Hearing');
    if(formData.respiratoryProtectionInspected==='Yes')sectionsInspected.push('Respiratory');
    if(formData.handProtectionInspected==='Yes')sectionsInspected.push('Hand');
    if(formData.bodyProtectionInspected==='Yes')sectionsInspected.push('Body');
    if(formData.footProtectionInspected==='Yes')sectionsInspected.push('Foot');
    if(formData.fallProtectionInspected==='Yes')sectionsInspected.push('Fall');
    try{
      const{error}=await supabase.from('ppe_inspections').insert([{
        inspector_name:formData.inspectorName,date:formData.date,company:formData.company,location:formData.location,employee_name:formData.employeeName,employee_id:formData.employeeId,sections_inspected:sectionsInspected.join(', '),
        head_protection_inspected:formData.headProtectionInspected,hard_hat_type:formData.hardHatType,hard_hat_condition:formData.hardHatCondition,suspension_system:formData.suspensionSystem,shell_cracks:formData.shellCracks,expiration_date_check:formData.expirationDateCheck,chin_strap:formData.chinStrap,head_protection_result:formData.headProtectionResult,
        eye_face_protection_inspected:formData.eyeFaceProtectionInspected,eye_protection_type:formData.eyeProtectionType,lens_condition:formData.lensCondition,frame_condition:formData.frameCondition,anti_fog_coating:formData.antiFogCoating,side_shields:formData.sideShields,face_shield_condition:formData.faceShieldCondition,eye_face_protection_result:formData.eyeFaceProtectionResult,
        hearing_protection_inspected:formData.hearingProtectionInspected,hearing_protection_type:formData.hearingProtectionType,earmuff_condition:formData.earmuffCondition,ear_cushions:formData.earCushions,headband_tension:formData.headbandTension,earplug_condition:formData.earplugCondition,nrr_rating_visible:formData.nrrRatingVisible,hearing_protection_result:formData.hearingProtectionResult,
        respiratory_protection_inspected:formData.respiratoryProtectionInspected,respirator_type:formData.respiratorType,facepiece_condition:formData.facepieceCondition,straps_harness:formData.strapsHarness,valves_condition:formData.valvesCondition,cartridge_filter_status:formData.cartridgeFilterStatus,cartridge_expiration:formData.cartridgeExpiration,fit_test_current:formData.fitTestCurrent,medical_clearance_current:formData.medicalClearanceCurrent,respiratory_protection_result:formData.respiratoryProtectionResult,
        hand_protection_inspected:formData.handProtectionInspected,glove_type:formData.gloveType,glove_material:formData.gloveMaterial,tears_holes:formData.tearsHoles,chemical_resistance:formData.chemicalResistance,grip_condition:formData.gripCondition,cuff_condition:formData.cuffCondition,hand_protection_result:formData.handProtectionResult,
        body_protection_inspected:formData.bodyProtectionInspected,body_protection_type:formData.bodyProtectionType,fr_clothing_condition:formData.frClothingCondition,arc_rating_visible:formData.arcRatingVisible,chemical_suit_condition:formData.chemicalSuitCondition,seams_closures:formData.seamsClosures,high_vis_condition:formData.highVisCondition,reflective_strips:formData.reflectiveStrips,body_protection_result:formData.bodyProtectionResult,
        foot_protection_inspected:formData.footProtectionInspected,footwear_type:formData.footwearType,steel_composite_toe:formData.steelCompositeToe,sole_condition:formData.soleCondition,upper_condition:formData.upperCondition,metatarsal_guard:formData.metatarsalGuard,eh_rating:formData.ehRating,laces_closures:formData.lacesClosures,foot_protection_result:formData.footProtectionResult,
        fall_protection_inspected:formData.fallProtectionInspected,harness_present:formData.harnessPresent,lanyard_srl_present:formData.lanyardSrlPresent,fall_protection_status:formData.fallProtectionStatus,
        overall_result:formData.overallResult,ppe_replacement_needed:formData.ppeReplacementNeeded,replacement_items:formData.replacementItems,training_current:formData.trainingCurrent,comments:formData.comments
      }]);
      if(error)throw error;
      setSubmitted(true);
    }catch(e){console.error(e);alert('Error: '+e.message);}finally{setIsSubmitting(false);}
  };

  const resetForm=()=>{setFormData({inspectorName:'',date:new Date().toISOString().split('T')[0],company:'',location:'',employeeName:'',employeeId:'',headProtectionInspected:'No',hardHatType:'',hardHatCondition:'',suspensionSystem:'',shellCracks:'',expirationDateCheck:'',chinStrap:'',headProtectionResult:'',eyeFaceProtectionInspected:'No',eyeProtectionType:'',lensCondition:'',frameCondition:'',antiFogCoating:'',sideShields:'',faceShieldCondition:'',eyeFaceProtectionResult:'',hearingProtectionInspected:'No',hearingProtectionType:'',earmuffCondition:'',earCushions:'',headbandTension:'',earplugCondition:'',nrrRatingVisible:'',hearingProtectionResult:'',respiratoryProtectionInspected:'No',respiratorType:'',facepieceCondition:'',strapsHarness:'',valvesCondition:'',cartridgeFilterStatus:'',cartridgeExpiration:'',fitTestCurrent:'',medicalClearanceCurrent:'',respiratoryProtectionResult:'',handProtectionInspected:'No',gloveType:'',gloveMaterial:'',tearsHoles:'',chemicalResistance:'',gripCondition:'',cuffCondition:'',handProtectionResult:'',bodyProtectionInspected:'No',bodyProtectionType:'',frClothingCondition:'',arcRatingVisible:'',chemicalSuitCondition:'',seamsClosures:'',highVisCondition:'',reflectiveStrips:'',bodyProtectionResult:'',footProtectionInspected:'No',footwearType:'',steelCompositeToe:'',soleCondition:'',upperCondition:'',metatarsalGuard:'',ehRating:'',lacesClosures:'',footProtectionResult:'',fallProtectionInspected:'No',harnessPresent:'',lanyardSrlPresent:'',fallProtectionStatus:'',overallResult:'',ppeReplacementNeeded:'',replacementItems:'',trainingCurrent:'',comments:''});setExpandedSections({head:false,eye:false,hearing:false,respiratory:false,hand:false,body:false,foot:false,fall:false});setSubmitted(false);};

  const s={container:{minHeight:'100vh',background:'linear-gradient(135deg, #1e3a5f 0%, #002855 100%)',padding:'20px'},formContainer:{maxWidth:'800px',margin:'0 auto',background:'white',borderRadius:'16px',boxShadow:'0 20px 60px rgba(0,0,0,0.3)',overflow:'hidden'},header:{background:'white',padding:'30px',textAlign:'center',borderBottom:'4px solid #dc2626'},content:{padding:'30px'},section:{marginBottom:'20px',padding:'20px',background:'#f8fafc',borderRadius:'12px',borderLeft:'4px solid #002855'},sectionTitle:{fontSize:'18px',fontWeight:'700',color:'#002855',marginBottom:'20px',display:'flex',alignItems:'center',gap:'10px'},formRow:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'20px',marginBottom:'15px'},formGroup:{marginBottom:'15px'},label:{display:'block',marginBottom:'8px',fontWeight:'600',color:'#334155',fontSize:'14px'},required:{color:'#dc2626'},input:{width:'100%',padding:'12px 16px',border:'2px solid #e2e8f0',borderRadius:'10px',fontSize:'15px',background:'white'},select:{width:'100%',padding:'12px 16px',border:'2px solid #e2e8f0',borderRadius:'10px',fontSize:'15px',background:'white'},textarea:{width:'100%',padding:'12px 16px',border:'2px solid #e2e8f0',borderRadius:'10px',fontSize:'15px',minHeight:'100px',resize:'vertical'},
    ppeToggle:{background:'white',border:'2px solid #e2e8f0',borderRadius:'12px',marginBottom:'15px',overflow:'hidden'},ppeToggleHeader:{padding:'15px 20px',display:'flex',alignItems:'center',justifyContent:'space-between'},ppeToggleTitle:{fontWeight:'600',color:'#334155',display:'flex',alignItems:'center',gap:'10px'},ppeIcon:{fontSize:'20px'},toggleSwitch:{display:'flex',gap:'8px'},toggleBtn:{padding:'8px 16px',borderRadius:'8px',fontSize:'13px',fontWeight:'600',cursor:'pointer',border:'none',transition:'all 0.2s'},toggleBtnActive:{background:'#002855',color:'white'},toggleBtnInactive:{background:'#f1f5f9',color:'#64748b'},ppeContent:{padding:'20px',background:'#f8fafc',borderTop:'2px solid #e2e8f0'},
    submitBtn:{width:'100%',padding:'16px 32px',background:'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',color:'white',border:'none',borderRadius:'12px',fontSize:'18px',fontWeight:'700',cursor:'pointer',marginTop:'20px',textTransform:'uppercase',letterSpacing:'1px'},successMessage:{textAlign:'center',padding:'60px 30px'},successIcon:{width:'80px',height:'80px',background:'#16a34a',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px',fontSize:'40px',color:'white'},infoText:{fontSize:'12px',color:'#64748b',marginTop:'5px',fontStyle:'italic'}};

  const PPEToggle=({id,icon,title,section,children})=>(<div style={s.ppeToggle}><div style={s.ppeToggleHeader}><div style={s.ppeToggleTitle}><span style={s.ppeIcon}>{icon}</span>{title}</div><div style={s.toggleSwitch}><button type="button" onClick={()=>toggleSection(section,'No')} style={{...s.toggleBtn,...(!expandedSections[section]?s.toggleBtnActive:s.toggleBtnInactive)}}>No</button><button type="button" onClick={()=>toggleSection(section,'Yes')} style={{...s.toggleBtn,...(expandedSections[section]?s.toggleBtnActive:s.toggleBtnInactive)}}>Yes</button></div></div>{expandedSections[section]&&<div style={s.ppeContent}>{children}</div>}</div>);

  const FormField=({label,name,value,options,required})=>(<div style={s.formGroup}><label style={s.label}>{label}{required&&<span style={s.required}> *</span>}</label><select name={name} value={value} onChange={handleChange} style={s.select} required={required}><option value="">Select...</option>{options.map(o=><option key={o} value={o}>{o}</option>)}</select></div>);

  if(submitted){return(<div style={s.container}><div style={{maxWidth:'600px',margin:'0 auto',paddingTop:'50px'}}><div style={{background:'white',borderRadius:'16px',padding:'40px',textAlign:'center'}}><div style={s.successIcon}>✓</div><h2 style={{color:'#16a34a',marginBottom:'10px'}}>Inspection Submitted!</h2><p style={{color:'#64748b',marginBottom:'30px'}}>PPE Inspection has been recorded.</p><div style={{display:'flex',gap:'10px',justifyContent:'center',flexWrap:'wrap'}}><button onClick={resetForm} style={{padding:'14px 40px',background:'#002855',color:'white',border:'none',borderRadius:'10px',fontSize:'16px',fontWeight:'600',cursor:'pointer'}}>Start New Inspection</button><a href="/" style={{padding:'14px 40px',background:'#6b7280',color:'white',border:'none',borderRadius:'10px',fontSize:'16px',fontWeight:'600',textDecoration:'none'}}>Back to Portal</a></div></div></div></div>);}

  return(<div style={s.container}><div style={s.formContainer}>
    <div style={s.header}><a href="/" style={{color:'#002855',textDecoration:'none',fontSize:'14px'}}>← Back to Portal</a><div style={{margin:'15px auto',width:'fit-content'}}><img src="/Logo.png" alt="SLP Alaska" style={{maxWidth:'120px',height:'auto'}}/></div><h1 style={{color:'#002855',fontSize:'28px',fontWeight:'700',marginBottom:'5px'}}>Comprehensive PPE Inspection</h1><p style={{color:'#64748b',fontSize:'14px'}}>SLP Alaska Safety Management System</p></div>
    
    <div style={s.content}><form onSubmit={handleSubmit}>
      {/* General Information */}
      <div style={s.section}><div style={s.sectionTitle}><span style={{width:'32px',height:'32px',background:'#002855',borderRadius:'8px',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:'16px'}}>📋</span>General Information</div>
        <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Inspector Name <span style={s.required}>*</span></label><input type="text" name="inspectorName" value={formData.inspectorName} onChange={handleChange} required placeholder="Your full name" style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Date <span style={s.required}>*</span></label><input type="date" name="date" value={formData.date} onChange={handleChange} required style={s.input}/></div></div>
        <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Company <span style={s.required}>*</span></label><select name="company" value={formData.company} onChange={handleChange} required style={s.select}><option value="">Select Company...</option>{COMPANIES.map(c=><option key={c} value={c}>{c}</option>)}</select></div><div style={s.formGroup}><label style={s.label}>Location <span style={s.required}>*</span></label><select name="location" value={formData.location} onChange={handleChange} required style={s.select}><option value="">Select Location...</option>{LOCATIONS.map(l=><option key={l} value={l}>{l}</option>)}</select></div></div>
        <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Employee Name (Being Inspected) <span style={s.required}>*</span></label><input type="text" name="employeeName" value={formData.employeeName} onChange={handleChange} required placeholder="Employee's full name" style={s.input}/></div><div style={s.formGroup}><label style={s.label}>Employee ID</label><input type="text" name="employeeId" value={formData.employeeId} onChange={handleChange} placeholder="If applicable" style={s.input}/></div></div>
      </div>
      
      {/* PPE Categories */}
      <div style={s.section}><div style={s.sectionTitle}><span style={{width:'32px',height:'32px',background:'#002855',borderRadius:'8px',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:'16px'}}>🛡️</span>PPE Categories to Inspect</div><p style={s.infoText}>Select "Yes" for each PPE category you want to inspect. Only selected sections will expand.</p>
        
        {/* Head Protection */}
        <PPEToggle icon="⛑️" title="Head Protection (Hard Hat)" section="head">
          <div style={s.formRow}><FormField label="Hard Hat Type" name="hardHatType" value={formData.hardHatType} options={['Type I - Top Impact','Type II - Top & Side Impact','Full Brim','Cap Style']}/><FormField label="Hard Hat Condition" name="hardHatCondition" value={formData.hardHatCondition} options={['Good','Fair','Poor - Needs Replacement']}/></div>
          <div style={s.formRow}><FormField label="Suspension System" name="suspensionSystem" value={formData.suspensionSystem} options={['Good - Properly Adjusted','Needs Adjustment','Damaged - Needs Replacement']}/><FormField label="Shell Cracks/Dents" name="shellCracks" value={formData.shellCracks} options={['None - Shell Intact','Minor Surface Wear','Cracks/Dents Present - Replace']}/></div>
          <div style={s.formRow}><FormField label="Expiration Date Check" name="expirationDateCheck" value={formData.expirationDateCheck} options={['Current - Within Date','Approaching Expiration','Expired - Replace','No Date Visible']}/><FormField label="Chin Strap (If Required)" name="chinStrap" value={formData.chinStrap} options={['N/A - Not Required','Present & Functional','Missing or Damaged']}/></div>
          <FormField label="Head Protection Result" name="headProtectionResult" value={formData.headProtectionResult} options={['Pass','Fail - Needs Attention']}/>
        </PPEToggle>
        
        {/* Eye/Face Protection */}
        <PPEToggle icon="👓" title="Eye/Face Protection" section="eye">
          <div style={s.formRow}><FormField label="Eye Protection Type" name="eyeProtectionType" value={formData.eyeProtectionType} options={['Safety Glasses','Safety Goggles','Face Shield','Welding Helmet','Prescription Safety Glasses']}/><FormField label="Lens Condition" name="lensCondition" value={formData.lensCondition} options={['Clear - No Damage','Minor Scratches','Heavy Scratches - Replace','Cracked - Replace']}/></div>
          <div style={s.formRow}><FormField label="Frame Condition" name="frameCondition" value={formData.frameCondition} options={['Good','Bent - Needs Adjustment','Broken - Replace']}/><FormField label="Anti-Fog Coating" name="antiFogCoating" value={formData.antiFogCoating} options={['N/A','Effective','Worn - Reapply/Replace']}/></div>
          <div style={s.formRow}><FormField label="Side Shields" name="sideShields" value={formData.sideShields} options={['N/A - Integrated','Present & Secure','Missing or Loose']}/><FormField label="Face Shield Condition" name="faceShieldCondition" value={formData.faceShieldCondition} options={['N/A','Good','Scratched - Replace','Cracked - Replace']}/></div>
          <FormField label="Eye/Face Protection Result" name="eyeFaceProtectionResult" value={formData.eyeFaceProtectionResult} options={['Pass','Fail - Needs Attention']}/>
        </PPEToggle>
        
        {/* Hearing Protection */}
        <PPEToggle icon="🎧" title="Hearing Protection" section="hearing">
          <div style={s.formRow}><FormField label="Hearing Protection Type" name="hearingProtectionType" value={formData.hearingProtectionType} options={['Earmuffs','Disposable Earplugs','Reusable Earplugs','Canal Caps','Electronic Earmuffs']}/><FormField label="Earmuff Condition" name="earmuffCondition" value={formData.earmuffCondition} options={['N/A','Good','Worn - Replace']}/></div>
          <div style={s.formRow}><FormField label="Ear Cushions" name="earCushions" value={formData.earCushions} options={['N/A','Good - Pliable','Hardened/Cracked - Replace']}/><FormField label="Headband Tension" name="headbandTension" value={formData.headbandTension} options={['N/A','Good','Loose - Replace']}/></div>
          <div style={s.formRow}><FormField label="Earplug Condition" name="earplugCondition" value={formData.earplugCondition} options={['N/A','Good - Clean','Dirty/Damaged - Replace']}/><FormField label="NRR Rating Visible" name="nrrRatingVisible" value={formData.nrrRatingVisible} options={['Yes','No']}/></div>
          <FormField label="Hearing Protection Result" name="hearingProtectionResult" value={formData.hearingProtectionResult} options={['Pass','Fail - Needs Attention']}/>
        </PPEToggle>
        
        {/* Respiratory Protection */}
        <PPEToggle icon="😷" title="Respiratory Protection" section="respiratory">
          <div style={s.formRow}><FormField label="Respirator Type" name="respiratorType" value={formData.respiratorType} options={['N95 Disposable','Half-Face APR','Full-Face APR','PAPR','SCBA','Supplied Air']}/><FormField label="Facepiece Condition" name="facepieceCondition" value={formData.facepieceCondition} options={['Good - No Defects','Minor Wear','Cracked/Torn - Replace']}/></div>
          <div style={s.formRow}><FormField label="Straps/Harness" name="strapsHarness" value={formData.strapsHarness} options={['Good - Elastic','Stretched - Replace','Broken - Replace']}/><FormField label="Valves Condition" name="valvesCondition" value={formData.valvesCondition} options={['Good - Functional','Dirty - Clean','Damaged - Replace']}/></div>
          <div style={s.formRow}><FormField label="Cartridge/Filter Status" name="cartridgeFilterStatus" value={formData.cartridgeFilterStatus} options={['N/A - Disposable','Good - Within Service Life','Needs Replacement']}/><FormField label="Cartridge Expiration" name="cartridgeExpiration" value={formData.cartridgeExpiration} options={['N/A','Current','Expired - Replace']}/></div>
          <div style={s.formRow}><FormField label="Fit Test Current" name="fitTestCurrent" value={formData.fitTestCurrent} options={['Yes - Within 12 Months','No - Overdue','N/A - Disposable']}/><FormField label="Medical Clearance Current" name="medicalClearanceCurrent" value={formData.medicalClearanceCurrent} options={['Yes','No - Needs Clearance','Unknown']}/></div>
          <FormField label="Respiratory Protection Result" name="respiratoryProtectionResult" value={formData.respiratoryProtectionResult} options={['Pass','Fail - Needs Attention']}/>
        </PPEToggle>
        
        {/* Hand Protection */}
        <PPEToggle icon="🧤" title="Hand Protection" section="hand">
          <div style={s.formRow}><FormField label="Glove Type" name="gloveType" value={formData.gloveType} options={['Leather Work Gloves','Cut-Resistant','Chemical Resistant','Welding Gloves','Insulated/Cold Weather','Nitrile Disposable','Impact Resistant']}/><FormField label="Glove Material" name="gloveMaterial" value={formData.gloveMaterial} options={['Leather','Nitrile','Neoprene','Kevlar','PVC','Rubber','Synthetic']}/></div>
          <div style={s.formRow}><FormField label="Tears/Holes" name="tearsHoles" value={formData.tearsHoles} options={['None','Minor Wear','Tears/Holes Present - Replace']}/><FormField label="Chemical Resistance" name="chemicalResistance" value={formData.chemicalResistance} options={['N/A','Good','Degraded - Replace']}/></div>
          <div style={s.formRow}><FormField label="Grip Condition" name="gripCondition" value={formData.gripCondition} options={['Good','Worn - Reduced Grip','Smooth - Replace']}/><FormField label="Cuff Condition" name="cuffCondition" value={formData.cuffCondition} options={['Good','Frayed/Torn','N/A']}/></div>
          <FormField label="Hand Protection Result" name="handProtectionResult" value={formData.handProtectionResult} options={['Pass','Fail - Needs Attention']}/>
        </PPEToggle>
        
        {/* Body Protection */}
        <PPEToggle icon="🦺" title="Body Protection" section="body">
          <div style={s.formRow}><FormField label="Body Protection Type" name="bodyProtectionType" value={formData.bodyProtectionType} options={['FR Coveralls','FR Shirt/Pants','High-Vis Vest','Chemical Suit','Welding Jacket','Rain Gear','Insulated Coveralls']}/><FormField label="FR Clothing Condition" name="frClothingCondition" value={formData.frClothingCondition} options={['N/A','Good - No Damage','Minor Wear','Holes/Tears - Replace','Contaminated - Replace']}/></div>
          <div style={s.formRow}><FormField label="Arc Rating Visible" name="arcRatingVisible" value={formData.arcRatingVisible} options={['N/A','Yes - Legible','No - Faded']}/><FormField label="Chemical Suit Condition" name="chemicalSuitCondition" value={formData.chemicalSuitCondition} options={['N/A','Good','Damaged - Replace']}/></div>
          <div style={s.formRow}><FormField label="Seams/Closures" name="seamsClosures" value={formData.seamsClosures} options={['Good - Intact','Coming Apart - Repair/Replace']}/><FormField label="High-Vis Condition" name="highVisCondition" value={formData.highVisCondition} options={['N/A','Good - Bright','Faded - Replace','Dirty - Clean']}/></div>
          <FormField label="Reflective Strips" name="reflectiveStrips" value={formData.reflectiveStrips} options={['N/A','Good - Reflective','Damaged/Missing - Replace']}/>
          <FormField label="Body Protection Result" name="bodyProtectionResult" value={formData.bodyProtectionResult} options={['Pass','Fail - Needs Attention']}/>
        </PPEToggle>
        
        {/* Foot Protection */}
        <PPEToggle icon="👢" title="Foot Protection" section="foot">
          <div style={s.formRow}><FormField label="Footwear Type" name="footwearType" value={formData.footwearType} options={['Steel Toe Boots','Composite Toe Boots','Metatarsal Guard Boots','Rubber Boots (Steel Toe)','Insulated Boots','Chemical Resistant Boots']}/><FormField label="Steel/Composite Toe" name="steelCompositeToe" value={formData.steelCompositeToe} options={['Good - No Exposure','Exposed - Replace']}/></div>
          <div style={s.formRow}><FormField label="Sole Condition" name="soleCondition" value={formData.soleCondition} options={['Good - Good Tread','Worn - Reduced Traction','Separating - Replace']}/><FormField label="Upper Condition" name="upperCondition" value={formData.upperCondition} options={['Good','Cracked/Torn - Replace']}/></div>
          <div style={s.formRow}><FormField label="Metatarsal Guard" name="metatarsalGuard" value={formData.metatarsalGuard} options={['N/A - Not Required','Present & Secure','Missing/Damaged']}/><FormField label="EH (Electrical Hazard) Rating" name="ehRating" value={formData.ehRating} options={['N/A - Not Required','Yes - EH Rated','No - Needs EH Boots']}/></div>
          <FormField label="Laces/Closures" name="lacesClosures" value={formData.lacesClosures} options={['Good','Frayed - Replace Laces','Broken - Replace']}/>
          <FormField label="Foot Protection Result" name="footProtectionResult" value={formData.footProtectionResult} options={['Pass','Fail - Needs Attention']}/>
        </PPEToggle>
        
        {/* Fall Protection */}
        <PPEToggle icon="🪢" title="Fall Protection" section="fall">
          <p style={{...s.infoText,marginBottom:'15px'}}>For detailed fall protection inspection, use the dedicated Fall Protection Inspection form. This section is for basic presence/status check only.</p>
          <div style={s.formRow}><FormField label="Harness Present" name="harnessPresent" value={formData.harnessPresent} options={['Yes - Available','No - Not Available','N/A - Not Required']}/><FormField label="Lanyard/SRL Present" name="lanyardSrlPresent" value={formData.lanyardSrlPresent} options={['Yes - Available','No - Not Available','N/A - Not Required']}/></div>
          <FormField label="Fall Protection Status" name="fallProtectionStatus" value={formData.fallProtectionStatus} options={['Available & Current Inspection','Available - Needs Inspection','Not Available - Required','N/A']}/>
        </PPEToggle>
      </div>
      
      {/* Overall Assessment */}
      <div style={s.section}><div style={s.sectionTitle}><span style={{width:'32px',height:'32px',background:'#002855',borderRadius:'8px',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:'16px'}}>✅</span>Overall Assessment</div>
        <div style={s.formRow}><div style={s.formGroup}><label style={s.label}>Overall PPE Result <span style={s.required}>*</span></label><select name="overallResult" value={formData.overallResult} onChange={handleChange} required style={s.select}><option value="">Select...</option><option value="Pass - All PPE Acceptable">Pass - All PPE Acceptable</option><option value="Fail - PPE Needs Attention">Fail - PPE Needs Attention</option></select></div><div style={s.formGroup}><label style={s.label}>PPE Replacement Needed <span style={s.required}>*</span></label><select name="ppeReplacementNeeded" value={formData.ppeReplacementNeeded} onChange={handleChange} required style={s.select}><option value="">Select...</option><option value="No">No</option><option value="Yes">Yes</option></select></div></div>
        {formData.ppeReplacementNeeded==='Yes'&&<div style={s.formGroup}><label style={s.label}>Items Needing Replacement</label><textarea name="replacementItems" value={formData.replacementItems} onChange={handleChange} placeholder="List specific PPE items that need replacement..." style={s.textarea}/></div>}
        <div style={s.formGroup}><label style={s.label}>Is Safety Training Current?</label><select name="trainingCurrent" value={formData.trainingCurrent} onChange={handleChange} style={s.select}><option value="">Select...</option><option value="Yes">Yes</option><option value="No - Needs Training">No - Needs Training</option><option value="Unknown">Unknown</option></select></div>
        <div style={s.formGroup}><label style={s.label}>Additional Comments</label><textarea name="comments" value={formData.comments} onChange={handleChange} placeholder="Any additional observations, notes, or recommendations..." style={s.textarea}/></div>
      </div>
      
      <button type="submit" disabled={isSubmitting} style={{...s.submitBtn,opacity:isSubmitting?0.5:1}}>{isSubmitting?'Submitting...':'Submit PPE Inspection'}</button>
    </form></div>
    
    <div style={{textAlign:'center',padding:'20px',background:'linear-gradient(to bottom, #f8fafc, #ffffff)',color:'#64748b',fontSize:'11px',borderTop:'1px solid #e2e8f0'}}><span style={{color:'#1e3a5f',fontWeight:'500'}}>Powered by Predictive Safety Analytics™</span><span style={{color:'#94a3b8',margin:'0 8px'}}>|</span><span style={{color:'#475569'}}>© 2025 SLP Alaska</span></div>
  </div></div>);
}

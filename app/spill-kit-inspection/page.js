'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://iypezirwdlqpptjpeeyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
);

const COMPANIES = ['A-C Electric','AKE-Line','Apache Corp.','Armstrong Oil & Gas','ASRC Energy Services','CCI-Industrial','Chosen Construction','CINGSA','Coho Enterprises','Conam Construction','ConocoPhillips','Five Star Oilfield Services','Fox Energy Services','G.A. West','GBR Equipment','GLM Energy Services','Graham Industrial Coatings','Harvest Midstream','Hilcorp Alaska','MagTec Alaska','Merkes Builders','Nordic-Calista','Parker TRS','Peninsula Paving','Pollard Wireline','Ridgeline Oilfield Services','Santos','Summit Excavation','Tesoro Refinery','Yellowjacket','Other'];
const LOCATIONS = ['Kenai','CIO','Beaver Creek','Swanson River','Ninilchik','Nikiski','Other Kenai Asset','Deadhorse','Prudhoe Bay','Kuparuk','Alpine','Willow','ENI','PIKKA','Point Thompson','North Star Island','Endicott','Badami','Other North Slope'];
const KIT_TYPES = ['Universal Spill Kit','Oil-Only Spill Kit','Hazmat Spill Kit','Vehicle Spill Kit','Drum Spill Kit','55-Gallon Drum Kit','Overpack Drum Kit','Portable/Bag Kit','Wall-Mount Kit','Cabinet Kit','Other'];
const INSPECTION_REASONS = ['Scheduled Inspection','Post-Spill Replenishment','New Kit Installation','Random Audit','Pre-Job Verification','Regulatory Compliance','Annual Inventory','Other'];
const ITEM_CONDITIONS = ['Good','Fair','Poor','N/A'];
const OVERALL_CONDITIONS = ['Excellent','Good','Fair','Poor','Critical'];
const INSPECTION_RESULTS = ['Pass - Fully Stocked','Pass - Minor Items Restocked','Conditional Pass - Items Ordered','Fail - Missing Critical Items','Fail - Kit Damaged/Unusable'];
const ABSORBENT_TYPES = ['Universal','Oil-Only','Hazmat','Mixed'];

export default function SpillKitInspection(){
  const [isSubmitting,setIsSubmitting]=useState(false);
  const [submitted,setSubmitted]=useState(false);
  const [formData,setFormData]=useState({
    inspectorName:'',inspectionDate:'',company:'',location:'',
    kitId:'',kitType:'',kitLocationDescription:'',inspectionReason:'',
    containerCondition:'',containerSealed:'',signageVisible:'',easilyAccessible:'',
    absorbentPads:'',absorbentSocks:'',absorbentPillows:'',looseAbsorbent:'',absorbentType:'',
    disposalBags:'',tiesFasteners:'',overpackDrum:'',drainCovers:'',
    chemicalGloves:'',safetyGoggles:'',coveralls:'',bootCovers:'',
    scoopShovel:'',broomBrush:'',ductTape:'',cautionTape:'',flashlight:'',
    spillInstructions:'',sdsSheets:'',inventoryChecklist:'',
    overallCondition:'',inspectionResult:'',itemsRestocked:'',restockList:'',itemsMissing:'',missingItemsList:'',comments:''
  });

  const handleChange=(e)=>{const{name,value}=e.target;setFormData(p=>({...p,[name]:value}));};

  const handleSubmit=async(e)=>{e.preventDefault();setIsSubmitting(true);
    try{
      const{error}=await supabase.from('spill_kit_inspections').insert([{
        inspector_name:formData.inspectorName,inspection_date:formData.inspectionDate,company:formData.company,location:formData.location,
        kit_id:formData.kitId,kit_type:formData.kitType,kit_location_description:formData.kitLocationDescription,inspection_reason:formData.inspectionReason,
        container_condition:formData.containerCondition,container_sealed:formData.containerSealed,signage_visible:formData.signageVisible,easily_accessible:formData.easilyAccessible,
        absorbent_pads:formData.absorbentPads,absorbent_socks:formData.absorbentSocks,absorbent_pillows:formData.absorbentPillows,loose_absorbent:formData.looseAbsorbent,absorbent_type:formData.absorbentType,
        disposal_bags:formData.disposalBags,ties_fasteners:formData.tiesFasteners,overpack_drum:formData.overpackDrum,drain_covers:formData.drainCovers,
        chemical_gloves:formData.chemicalGloves,safety_goggles:formData.safetyGoggles,coveralls:formData.coveralls,boot_covers:formData.bootCovers,
        scoop_shovel:formData.scoopShovel,broom_brush:formData.broomBrush,duct_tape:formData.ductTape,caution_tape:formData.cautionTape,flashlight:formData.flashlight,
        spill_instructions:formData.spillInstructions,sds_sheets:formData.sdsSheets,inventory_checklist:formData.inventoryChecklist,
        overall_condition:formData.overallCondition,inspection_result:formData.inspectionResult,items_restocked:formData.itemsRestocked,restock_list:formData.restockList,items_missing:formData.itemsMissing,missing_items_list:formData.missingItemsList,comments:formData.comments
      }]);
      if(error)throw error;
      setSubmitted(true);
    }catch(e){console.error(e);alert('Error: '+e.message);}finally{setIsSubmitting(false);}
  };

  const resetForm=()=>{setFormData({inspectorName:'',inspectionDate:'',company:'',location:'',kitId:'',kitType:'',kitLocationDescription:'',inspectionReason:'',containerCondition:'',containerSealed:'',signageVisible:'',easilyAccessible:'',absorbentPads:'',absorbentSocks:'',absorbentPillows:'',looseAbsorbent:'',absorbentType:'',disposalBags:'',tiesFasteners:'',overpackDrum:'',drainCovers:'',chemicalGloves:'',safetyGoggles:'',coveralls:'',bootCovers:'',scoopShovel:'',broomBrush:'',ductTape:'',cautionTape:'',flashlight:'',spillInstructions:'',sdsSheets:'',inventoryChecklist:'',overallCondition:'',inspectionResult:'',itemsRestocked:'',restockList:'',itemsMissing:'',missingItemsList:'',comments:''});setSubmitted(false);};

  const getConditionStyle=(val)=>{
    if(val==='Good')return{borderColor:'#059669',background:'rgba(5,150,105,0.1)'};
    if(val==='Fair')return{borderColor:'#f59e0b',background:'rgba(245,158,11,0.1)'};
    if(val==='Poor')return{borderColor:'#dc2626',background:'rgba(220,38,38,0.1)'};
    if(val==='N/A')return{borderColor:'#6b7280',background:'rgba(107,114,128,0.1)'};
    return{};
  };

  const s={
    container:{minHeight:'100vh',background:'linear-gradient(135deg, #1e3a8a 0%, #b91c1c 100%)',padding:'20px'},
    formBox:{maxWidth:'950px',margin:'0 auto',background:'white',borderRadius:'16px',boxShadow:'0 20px 60px rgba(0,0,0,0.3)',overflow:'hidden'},
    header:{background:'linear-gradient(135deg, #1e3a8a 0%, #b91c1c 100%)',color:'white',padding:'30px',textAlign:'center'},
    logoBox:{background:'rgba(255,255,255,0.95)',borderRadius:'12px',padding:'15px',width:'fit-content',margin:'0 auto 20px',boxShadow:'0 4px 15px rgba(0,0,0,0.2)'},
    badge:{display:'inline-block',background:'white',color:'#d97706',padding:'6px 16px',borderRadius:'20px',fontWeight:'700',fontSize:'0.85rem',marginBottom:'15px',border:'3px solid #d97706',boxShadow:'0 2px 8px rgba(0,0,0,0.2)'},
    content:{padding:'30px'},
    section:{marginBottom:'25px',border:'1px solid #e5e7eb',borderRadius:'12px',overflow:'hidden'},
    sectionHeader:{color:'white',padding:'12px 20px',fontWeight:'600',fontSize:'1rem'},
    sectionBlue:{background:'linear-gradient(135deg, #1e3a8a, #1e40af)'},
    sectionRed:{background:'linear-gradient(135deg, #b91c1c, #dc2626)'},
    sectionOrange:{background:'linear-gradient(135deg, #d97706, #ea580c)'},
    sectionGreen:{background:'linear-gradient(135deg, #059669, #047857)'},
    sectionPurple:{background:'linear-gradient(135deg, #7c3aed, #6d28d9)'},
    sectionCyan:{background:'linear-gradient(135deg, #0891b2, #0e7490)'},
    sectionBody:{padding:'20px',background:'#f8fafc'},
    formRow:{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))',gap:'20px',marginBottom:'20px'},
    formGroup:{display:'flex',flexDirection:'column'},
    label:{fontWeight:'600',color:'#374151',marginBottom:'6px',fontSize:'0.9rem'},
    required:{color:'#b91c1c'},
    input:{padding:'10px 12px',border:'2px solid #d1d5db',borderRadius:'8px',fontSize:'0.95rem',background:'white'},
    select:{padding:'10px 12px',border:'2px solid #d1d5db',borderRadius:'8px',fontSize:'0.95rem',background:'white'},
    textarea:{padding:'10px 12px',border:'2px solid #d1d5db',borderRadius:'8px',fontSize:'0.95rem',minHeight:'80px',resize:'vertical'},
    checklistGrid:{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))',gap:'12px'},
    checklistItem:{display:'flex',justifyContent:'space-between',alignItems:'center',background:'white',padding:'12px 15px',borderRadius:'8px',border:'2px solid #e5e7eb',transition:'all 0.2s'},
    checklistSelect:{width:'100px',padding:'6px 8px',fontSize:'0.85rem',border:'2px solid #d1d5db',borderRadius:'6px'},
    conditionalField:{marginTop:'15px',padding:'15px',background:'#fef3c7',border:'2px solid #f59e0b',borderRadius:'8px'},
    submitBtn:{width:'100%',padding:'16px 32px',background:'linear-gradient(135deg, #1e3a8a, #1e40af)',color:'white',border:'none',borderRadius:'10px',fontSize:'1.1rem',fontWeight:'600',cursor:'pointer',boxShadow:'0 4px 15px rgba(30,58,138,0.3)',marginTop:'10px'},
    successBox:{background:'linear-gradient(135deg, #059669 0%, #047857 100%)',color:'white',padding:'40px',borderRadius:'12px',textAlign:'center',margin:'20px'},
    footer:{textAlign:'center',padding:'20px',background:'linear-gradient(to bottom, #f8fafc, #ffffff)',color:'#64748b',fontSize:'11px',borderTop:'1px solid #e2e8f0'}
  };

  const ChecklistItem=({label,name,value})=>(
    <div style={{...s.checklistItem,...getConditionStyle(value)}}>
      <label style={{...s.label,marginBottom:0,flex:1}}>{label}</label>
      <select name={name} value={value} onChange={handleChange} style={s.checklistSelect}>
        <option value="">Select...</option>
        {ITEM_CONDITIONS.map(c=><option key={c} value={c}>{c}</option>)}
      </select>
    </div>
  );

  if(submitted){return(<div style={s.container}><div style={{maxWidth:'600px',margin:'0 auto',paddingTop:'50px'}}><div style={s.successBox}><div style={{fontSize:'4rem',marginBottom:'20px'}}>✅</div><h2 style={{margin:'0 0 10px'}}>Inspection Submitted Successfully!</h2><p style={{marginBottom:'20px'}}>Your spill kit inspection has been recorded.</p><div style={{display:'flex',gap:'10px',justifyContent:'center',flexWrap:'wrap'}}><button onClick={resetForm} style={{padding:'12px 24px',background:'white',color:'#059669',border:'none',borderRadius:'8px',fontSize:'1rem',fontWeight:'600',cursor:'pointer'}}>Submit Another Inspection</button><a href="/" style={{padding:'12px 24px',background:'rgba(255,255,255,0.2)',color:'white',border:'none',borderRadius:'8px',fontSize:'1rem',fontWeight:'600',textDecoration:'none'}}>Back to Portal</a></div></div></div></div>);}

  return(<div style={s.container}><div style={s.formBox}>
    <div style={s.header}>
      <a href="/" style={{color:'white',textDecoration:'none',fontSize:'14px'}}>← Back to Portal</a>
      <div style={s.logoBox}><img src="/Logo.png" alt="SLP Alaska" style={{maxWidth:'200px',height:'auto'}}/></div>
      <div style={s.badge}>🛢️ SPILL KIT</div>
      <h1 style={{fontSize:'1.5rem',marginBottom:'8px',textShadow:'2px 2px 4px rgba(0,0,0,0.3)'}}>Spill Kit Inspection</h1>
      <p style={{opacity:0.95,fontSize:'1rem'}}>SLP Alaska Safety Management System</p>
    </div>
    
    <div style={s.content}><form onSubmit={handleSubmit}>
      {/* Basic Information */}
      <div style={s.section}><div style={{...s.sectionHeader,...s.sectionBlue}}>📋 Basic Information</div><div style={s.sectionBody}>
        <div style={s.formRow}>
          <div style={s.formGroup}><label style={s.label}>Inspector Name <span style={s.required}>*</span></label><input type="text" name="inspectorName" value={formData.inspectorName} onChange={handleChange} required style={s.input}/></div>
          <div style={s.formGroup}><label style={s.label}>Date <span style={s.required}>*</span></label><input type="date" name="inspectionDate" value={formData.inspectionDate} onChange={handleChange} required style={s.input}/></div>
        </div>
        <div style={s.formRow}>
          <div style={s.formGroup}><label style={s.label}>Client/Company <span style={s.required}>*</span></label><select name="company" value={formData.company} onChange={handleChange} required style={s.select}><option value="">Select Company...</option>{COMPANIES.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
          <div style={s.formGroup}><label style={s.label}>Location <span style={s.required}>*</span></label><select name="location" value={formData.location} onChange={handleChange} required style={s.select}><option value="">Select Location...</option>{LOCATIONS.map(l=><option key={l} value={l}>{l}</option>)}</select></div>
        </div>
      </div></div>
      
      {/* Kit Information */}
      <div style={s.section}><div style={{...s.sectionHeader,...s.sectionOrange}}>🛢️ Kit Information</div><div style={s.sectionBody}>
        <div style={s.formRow}>
          <div style={s.formGroup}><label style={s.label}>Kit ID/Number <span style={s.required}>*</span></label><input type="text" name="kitId" value={formData.kitId} onChange={handleChange} required placeholder="e.g., SK-001" style={s.input}/></div>
          <div style={s.formGroup}><label style={s.label}>Kit Type <span style={s.required}>*</span></label><select name="kitType" value={formData.kitType} onChange={handleChange} required style={s.select}><option value="">Select Kit Type...</option>{KIT_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
        </div>
        <div style={s.formRow}>
          <div style={s.formGroup}><label style={s.label}>Inspection Reason <span style={s.required}>*</span></label><select name="inspectionReason" value={formData.inspectionReason} onChange={handleChange} required style={s.select}><option value="">Select Reason...</option>{INSPECTION_REASONS.map(r=><option key={r} value={r}>{r}</option>)}</select></div>
          <div style={s.formGroup}><label style={s.label}>Kit Location Description</label><input type="text" name="kitLocationDescription" value={formData.kitLocationDescription} onChange={handleChange} placeholder="e.g., Near Tank Farm Entrance" style={s.input}/></div>
        </div>
      </div></div>
      
      {/* Container/Cabinet */}
      <div style={s.section}><div style={{...s.sectionHeader,...s.sectionGreen}}>📦 Container/Cabinet</div><div style={s.sectionBody}>
        <div style={s.checklistGrid}>
          <ChecklistItem label="Container Condition" name="containerCondition" value={formData.containerCondition}/>
          <ChecklistItem label="Container Sealed/Secured" name="containerSealed" value={formData.containerSealed}/>
          <ChecklistItem label="Signage Visible" name="signageVisible" value={formData.signageVisible}/>
          <ChecklistItem label="Easily Accessible" name="easilyAccessible" value={formData.easilyAccessible}/>
        </div>
      </div></div>
      
      {/* Absorbents */}
      <div style={s.section}><div style={{...s.sectionHeader,...s.sectionPurple}}>🧽 Absorbents</div><div style={s.sectionBody}>
        <div style={s.checklistGrid}>
          <ChecklistItem label="Absorbent Pads" name="absorbentPads" value={formData.absorbentPads}/>
          <ChecklistItem label="Absorbent Socks/Booms" name="absorbentSocks" value={formData.absorbentSocks}/>
          <ChecklistItem label="Absorbent Pillows" name="absorbentPillows" value={formData.absorbentPillows}/>
          <ChecklistItem label="Loose Absorbent" name="looseAbsorbent" value={formData.looseAbsorbent}/>
        </div>
        <div style={{...s.formRow,marginTop:'15px',marginBottom:0}}>
          <div style={s.formGroup}><label style={s.label}>Absorbent Type</label><select name="absorbentType" value={formData.absorbentType} onChange={handleChange} style={s.select}><option value="">Select Type...</option>{ABSORBENT_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
        </div>
      </div></div>
      
      {/* Containment & Disposal */}
      <div style={s.section}><div style={{...s.sectionHeader,...s.sectionCyan}}>🗑️ Containment & Disposal</div><div style={s.sectionBody}>
        <div style={s.checklistGrid}>
          <ChecklistItem label="Disposal Bags" name="disposalBags" value={formData.disposalBags}/>
          <ChecklistItem label="Ties/Fasteners" name="tiesFasteners" value={formData.tiesFasteners}/>
          <ChecklistItem label="Overpack Drum" name="overpackDrum" value={formData.overpackDrum}/>
          <ChecklistItem label="Drain Covers" name="drainCovers" value={formData.drainCovers}/>
        </div>
      </div></div>
      
      {/* PPE */}
      <div style={s.section}><div style={{...s.sectionHeader,...s.sectionRed}}>🦺 PPE</div><div style={s.sectionBody}>
        <div style={s.checklistGrid}>
          <ChecklistItem label="Chemical Gloves" name="chemicalGloves" value={formData.chemicalGloves}/>
          <ChecklistItem label="Safety Goggles" name="safetyGoggles" value={formData.safetyGoggles}/>
          <ChecklistItem label="Coveralls/Suits" name="coveralls" value={formData.coveralls}/>
          <ChecklistItem label="Boot Covers" name="bootCovers" value={formData.bootCovers}/>
        </div>
      </div></div>
      
      {/* Tools & Accessories */}
      <div style={s.section}><div style={{...s.sectionHeader,...s.sectionBlue}}>🔧 Tools & Accessories</div><div style={s.sectionBody}>
        <div style={s.checklistGrid}>
          <ChecklistItem label="Scoop/Shovel" name="scoopShovel" value={formData.scoopShovel}/>
          <ChecklistItem label="Broom/Brush" name="broomBrush" value={formData.broomBrush}/>
          <ChecklistItem label="Duct Tape" name="ductTape" value={formData.ductTape}/>
          <ChecklistItem label="Caution Tape" name="cautionTape" value={formData.cautionTape}/>
          <ChecklistItem label="Flashlight" name="flashlight" value={formData.flashlight}/>
        </div>
      </div></div>
      
      {/* Documentation */}
      <div style={s.section}><div style={{...s.sectionHeader,...s.sectionGreen}}>📄 Documentation</div><div style={s.sectionBody}>
        <div style={s.checklistGrid}>
          <ChecklistItem label="Spill Response Instructions" name="spillInstructions" value={formData.spillInstructions}/>
          <ChecklistItem label="SDS Sheets Available" name="sdsSheets" value={formData.sdsSheets}/>
          <ChecklistItem label="Inventory Checklist" name="inventoryChecklist" value={formData.inventoryChecklist}/>
        </div>
      </div></div>
      
      {/* Overall Result */}
      <div style={s.section}><div style={{...s.sectionHeader,...s.sectionOrange}}>📊 Overall Result</div><div style={s.sectionBody}>
        <div style={s.formRow}>
          <div style={s.formGroup}><label style={s.label}>Overall Condition <span style={s.required}>*</span></label><select name="overallCondition" value={formData.overallCondition} onChange={handleChange} required style={s.select}><option value="">Select Condition...</option>{OVERALL_CONDITIONS.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
          <div style={s.formGroup}><label style={s.label}>Inspection Result <span style={s.required}>*</span></label><select name="inspectionResult" value={formData.inspectionResult} onChange={handleChange} required style={s.select}><option value="">Select Result...</option>{INSPECTION_RESULTS.map(r=><option key={r} value={r}>{r}</option>)}</select></div>
        </div>
        <div style={s.formRow}>
          <div style={s.formGroup}><label style={s.label}>Items Restocked During Inspection?</label><select name="itemsRestocked" value={formData.itemsRestocked} onChange={handleChange} style={s.select}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
          <div style={s.formGroup}><label style={s.label}>Items Missing?</label><select name="itemsMissing" value={formData.itemsMissing} onChange={handleChange} style={s.select}><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
        </div>
        {formData.itemsRestocked==='Yes'&&<div style={s.conditionalField}><div style={s.formGroup}><label style={s.label}>Items Restocked (List)</label><textarea name="restockList" value={formData.restockList} onChange={handleChange} placeholder="List items that were restocked..." style={s.textarea}/></div></div>}
        {formData.itemsMissing==='Yes'&&<div style={s.conditionalField}><div style={s.formGroup}><label style={s.label}>Missing Items (List)</label><textarea name="missingItemsList" value={formData.missingItemsList} onChange={handleChange} placeholder="List items that are missing..." style={s.textarea}/></div></div>}
        <div style={{...s.formRow,marginTop:'15px',marginBottom:0}}>
          <div style={{...s.formGroup,gridColumn:'1 / -1'}}><label style={s.label}>Additional Comments</label><textarea name="comments" value={formData.comments} onChange={handleChange} placeholder="Any additional observations or notes..." style={s.textarea}/></div>
        </div>
      </div></div>
      
      <button type="submit" disabled={isSubmitting} style={{...s.submitBtn,opacity:isSubmitting?0.6:1,cursor:isSubmitting?'not-allowed':'pointer'}}>{isSubmitting?'Submitting...':'Submit Spill Kit Inspection'}</button>
    </form></div>
    
    <div style={s.footer}><span style={{color:'#1e3a5f',fontWeight:'500'}}>AnthroSafe™ Field Driven Safety</span><span style={{color:'#94a3b8',margin:'0 8px'}}>|</span><span style={{color:'#475569'}}>© 2026 SLP Alaska, LLC</span></div>
  </div></div>);
}

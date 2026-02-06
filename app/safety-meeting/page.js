'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://iypezirwdlqpptjpeeyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
);

const COMPANIES = ['A-C Electric','AKE-Line','Apache Corp.','Armstrong Oil & Gas','ASRC Energy Services','CCI-Industrial','Chosen Construction','CINGSA','Coho Enterprises','Conam Construction','ConocoPhillips','Five Star Oilfield Services','Fox Energy Services','G.A. West','GBR Equipment','GLM Energy Services','Graham Industrial Coatings','Harvest Midstream','Hilcorp Alaska','MagTec Alaska','Merkes Builders','Nordic-Calista','Parker TRS','Peninsula Paving','Pollard Wireline','Ridgeline Oilfield Services','Santos','Summit Excavation','Tesoro Refinery','Yellowjacket','Other'];
const LOCATIONS = ['Kenai','CIO','Beaver Creek','Swanson River','Ninilchik','Nikiski','Other Kenai Asset','Deadhorse','Prudhoe Bay','Kuparuk','Alpine','Willow','ENI','PIKKA','Point Thompson','North Star Island','Endicott','Badami','Other North Slope'];
const MEETING_TYPES = ['Daily Toolbox Meeting','Weekly Safety Meeting','Pre-Job Safety Meeting','JSA Review Meeting','Incident Debrief','Safety Stand-Down','Emergency Response Drill','New Employee Orientation','Contractor Safety Meeting','Management Safety Review','Other'];

export default function SafetyMeeting(){
  const [isSubmitting,setIsSubmitting]=useState(false);
  const [submitted,setSubmitted]=useState(false);
  const [photoPreview,setPhotoPreview]=useState(null);
  const [formData,setFormData]=useState({
    personLeading:'',meetingDate:new Date().toISOString().split('T')[0],company:'',location:'',meetingType:'',safetyRepOnSite:'',
    meetingStartTime:'',meetingEndTime:'',
    listAttendees:'',
    topicsDiscussed:'',tasksHazardsControls:'',majorEnergySources:'',reactToChange:'',
    photoUrl:''
  });

  const handleChange=(e)=>{const{name,value}=e.target;setFormData(p=>({...p,[name]:value}));};

  const handlePhotoChange=(e)=>{
    const file=e.target.files[0];
    if(file){
      const reader=new FileReader();
      reader.onload=(ev)=>{setPhotoPreview(ev.target.result);setFormData(p=>({...p,photoUrl:ev.target.result}));};
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit=async(e)=>{e.preventDefault();setIsSubmitting(true);
    try{
      const{error}=await supabase.from('safety_meetings').insert([{
        person_leading:formData.personLeading,
        meeting_date:formData.meetingDate,
        company:formData.company,
        location:formData.location,
        meeting_type:formData.meetingType,
        safety_rep_on_site:formData.safetyRepOnSite||null,
        meeting_start_time:formData.meetingStartTime||null,
        meeting_end_time:formData.meetingEndTime||null,
        list_attendees:formData.listAttendees,
        topics_discussed:formData.topicsDiscussed,
        tasks_hazards_controls:formData.tasksHazardsControls||null,
        major_energy_sources:formData.majorEnergySources||null,
        react_to_change:formData.reactToChange||null,
        photo_url:formData.photoUrl||null
      }]);
      if(error)throw error;
      setSubmitted(true);
    }catch(e){console.error(e);alert('Error: '+e.message);}finally{setIsSubmitting(false);}
  };

  const resetForm=()=>{setFormData({personLeading:'',meetingDate:new Date().toISOString().split('T')[0],company:'',location:'',meetingType:'',safetyRepOnSite:'',meetingStartTime:'',meetingEndTime:'',listAttendees:'',topicsDiscussed:'',tasksHazardsControls:'',majorEnergySources:'',reactToChange:'',photoUrl:''});setPhotoPreview(null);setSubmitted(false);};

  const s={
    container:{minHeight:'100vh',background:'linear-gradient(135deg, #1e3a8a 0%, #b91c1c 100%)',padding:'20px'},
    formBox:{maxWidth:'850px',margin:'0 auto',background:'white',borderRadius:'16px',boxShadow:'0 20px 60px rgba(0,0,0,0.3)',overflow:'hidden'},
    header:{background:'linear-gradient(135deg, #1e3a8a 0%, #b91c1c 100%)',color:'white',padding:'30px',textAlign:'center'},
    logoBox:{background:'rgba(255,255,255,0.95)',borderRadius:'12px',padding:'15px',width:'fit-content',margin:'0 auto 20px',boxShadow:'0 4px 15px rgba(0,0,0,0.2)'},
    badge:{display:'inline-block',background:'white',color:'#1e3a8a',padding:'6px 16px',borderRadius:'20px',fontWeight:'700',fontSize:'0.85rem',marginBottom:'15px',border:'3px solid #0d9488',boxShadow:'0 2px 8px rgba(0,0,0,0.2)'},
    content:{padding:'30px'},
    section:{marginBottom:'30px',border:'1px solid #e5e7eb',borderRadius:'12px',overflow:'hidden'},
    sectionHeader:{color:'white',padding:'12px 20px',fontWeight:'600',fontSize:'1rem'},
    sectionBlue:{background:'linear-gradient(135deg, #1e3a8a, #1e40af)'},
    sectionRed:{background:'linear-gradient(135deg, #b91c1c, #dc2626)'},
    sectionTeal:{background:'linear-gradient(135deg, #0d9488, #0f766e)'},
    sectionBody:{padding:'20px',background:'#f8fafc'},
    formRow:{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(250px, 1fr))',gap:'20px',marginBottom:'20px'},
    formGroup:{display:'flex',flexDirection:'column'},
    fullWidth:{gridColumn:'1 / -1'},
    label:{fontWeight:'600',color:'#374151',marginBottom:'6px',fontSize:'0.9rem'},
    required:{color:'#b91c1c'},
    input:{padding:'12px 14px',border:'2px solid #d1d5db',borderRadius:'8px',fontSize:'1rem',background:'white'},
    select:{padding:'12px 14px',border:'2px solid #d1d5db',borderRadius:'8px',fontSize:'1rem',background:'white'},
    textarea:{padding:'12px 14px',border:'2px solid #d1d5db',borderRadius:'8px',fontSize:'1rem',minHeight:'100px',resize:'vertical'},
    photoUpload:{border:'2px dashed #d1d5db',borderRadius:'8px',padding:'30px',textAlign:'center',background:'white',cursor:'pointer',transition:'all 0.2s'},
    photoUploadActive:{borderColor:'#059669',background:'rgba(5,150,105,0.05)'},
    photoIcon:{fontSize:'2.5rem',marginBottom:'10px'},
    photoPreview:{maxWidth:'200px',maxHeight:'150px',margin:'10px auto',borderRadius:'8px'},
    submitBtn:{width:'100%',padding:'16px 32px',background:'linear-gradient(135deg, #1e3a8a, #1e40af)',color:'white',border:'none',borderRadius:'10px',fontSize:'1.1rem',fontWeight:'600',cursor:'pointer',boxShadow:'0 4px 15px rgba(30,58,138,0.3)'},
    successBox:{background:'linear-gradient(135deg, #059669 0%, #047857 100%)',color:'white',padding:'40px',borderRadius:'12px',textAlign:'center',margin:'20px'},
    footer:{textAlign:'center',padding:'20px',background:'linear-gradient(to bottom, #f8fafc, #ffffff)',color:'#64748b',fontSize:'11px',borderTop:'1px solid #e2e8f0'}
  };

  if(submitted){return(<div style={s.container}><div style={{maxWidth:'600px',margin:'0 auto',paddingTop:'50px'}}><div style={s.successBox}><div style={{fontSize:'4rem',marginBottom:'20px'}}>✅</div><h2 style={{margin:'0 0 10px'}}>Meeting Submitted Successfully!</h2><p style={{marginBottom:'20px'}}>Your safety meeting has been recorded.</p><div style={{display:'flex',gap:'10px',justifyContent:'center',flexWrap:'wrap'}}><button onClick={resetForm} style={{padding:'12px 24px',background:'white',color:'#059669',border:'none',borderRadius:'8px',fontSize:'1rem',fontWeight:'600',cursor:'pointer'}}>Submit Another Meeting</button><a href="/" style={{padding:'12px 24px',background:'rgba(255,255,255,0.2)',color:'white',border:'none',borderRadius:'8px',fontSize:'1rem',fontWeight:'600',textDecoration:'none'}}>Back to Portal</a></div></div></div></div>);}

  return(<div style={s.container}><div style={s.formBox}>
    <div style={s.header}>
      <a href="/" style={{color:'white',textDecoration:'none',fontSize:'14px'}}>← Back to Portal</a>
      <div style={s.logoBox}><img src="/Logo.png" alt="SLP Alaska" style={{maxWidth:'200px',height:'auto'}}/></div>
      <div style={s.badge}>📋 SAFETY MEETING</div>
      <h1 style={{fontSize:'1.5rem',marginBottom:'8px',textShadow:'2px 2px 4px rgba(0,0,0,0.3)'}}>Safety Meeting Form</h1>
      <p style={{opacity:0.95,fontSize:'1rem'}}>SLP Alaska Safety Management System</p>
    </div>
    
    <div style={s.content}>
      <form onSubmit={handleSubmit}>
        {/* Meeting Information */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionBlue}}>📋 Meeting Information</div><div style={s.sectionBody}>
          <div style={s.formRow}>
            <div style={s.formGroup}><label style={s.label}>Name of Person Leading Meeting <span style={s.required}>*</span></label><input type="text" name="personLeading" value={formData.personLeading} onChange={handleChange} required style={s.input}/></div>
            <div style={s.formGroup}><label style={s.label}>Date <span style={s.required}>*</span></label><input type="date" name="meetingDate" value={formData.meetingDate} onChange={handleChange} required style={s.input}/></div>
          </div>
          <div style={s.formRow}>
            <div style={s.formGroup}><label style={s.label}>Client/Company <span style={s.required}>*</span></label><select name="company" value={formData.company} onChange={handleChange} required style={s.select}><option value="">Select Company...</option>{COMPANIES.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
            <div style={s.formGroup}><label style={s.label}>Location <span style={s.required}>*</span></label><select name="location" value={formData.location} onChange={handleChange} required style={s.select}><option value="">Select Location...</option>{LOCATIONS.map(l=><option key={l} value={l}>{l}</option>)}</select></div>
          </div>
          <div style={s.formRow}>
            <div style={s.formGroup}><label style={s.label}>Type of Meeting <span style={s.required}>*</span></label><select name="meetingType" value={formData.meetingType} onChange={handleChange} required style={s.select}><option value="">Select Meeting Type...</option>{MEETING_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
            <div style={s.formGroup}><label style={s.label}>Safety Rep On Site</label><input type="text" name="safetyRepOnSite" value={formData.safetyRepOnSite} onChange={handleChange} placeholder="Name of safety representative" style={s.input}/></div>
          </div>
          <div style={s.formRow}>
            <div style={s.formGroup}><label style={s.label}>Meeting Start Time <span style={s.required}>*</span></label><input type="time" name="meetingStartTime" value={formData.meetingStartTime} onChange={handleChange} required style={s.input}/></div>
            <div style={s.formGroup}><label style={s.label}>Meeting End Time <span style={s.required}>*</span></label><input type="time" name="meetingEndTime" value={formData.meetingEndTime} onChange={handleChange} required style={s.input}/></div>
          </div>
        </div></div>
        
        {/* Attendees */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionTeal}}>👥 Attendees</div><div style={s.sectionBody}>
          <div style={s.formGroup}><label style={s.label}>List of Attendees <span style={s.required}>*</span></label><textarea name="listAttendees" value={formData.listAttendees} onChange={handleChange} required placeholder="List all attendees (one per line or comma-separated)..." style={{...s.textarea,minHeight:'120px'}}/></div>
        </div></div>
        
        {/* Topics Discussed */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionRed}}>📝 Topics Discussed</div><div style={s.sectionBody}>
          <div style={s.formGroup}><label style={s.label}>Topics Discussed <span style={s.required}>*</span></label><textarea name="topicsDiscussed" value={formData.topicsDiscussed} onChange={handleChange} required placeholder="List all safety topics discussed during the meeting..." style={s.textarea}/></div>
          <div style={{...s.formGroup,marginTop:'20px'}}><label style={s.label}>Tasks/Hazards/Controls Discussed</label><textarea name="tasksHazardsControls" value={formData.tasksHazardsControls} onChange={handleChange} placeholder="Describe specific tasks, associated hazards, and control measures discussed..." style={s.textarea}/></div>
          <div style={{...s.formGroup,marginTop:'20px'}}><label style={s.label}>Major Energy Sources Discussed</label><textarea name="majorEnergySources" value={formData.majorEnergySources} onChange={handleChange} placeholder="List major energy sources discussed (electrical, hydraulic, pneumatic, chemical, thermal, etc.)..." style={s.textarea}/></div>
          <div style={{...s.formGroup,marginTop:'20px'}}><label style={s.label}>How Will We React to Change?</label><textarea name="reactToChange" value={formData.reactToChange} onChange={handleChange} placeholder="Describe how the team will handle changes to the work plan or unexpected situations..." style={s.textarea}/></div>
        </div></div>
        
        {/* Documentation */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionBlue}}>📸 Documentation</div><div style={s.sectionBody}>
          <div style={s.formGroup}>
            <label style={s.label}>Toolbox Meeting Form Photo (Optional)</label>
            <div style={{...s.photoUpload,...(photoPreview?s.photoUploadActive:{})}} onClick={()=>document.getElementById('photoInput').click()}>
              <div style={s.photoIcon}>📷</div>
              <p style={{color:'#6b7280'}}>Click to upload photo of signed toolbox meeting form</p>
              {photoPreview&&<img src={photoPreview} alt="Preview" style={s.photoPreview}/>}
            </div>
            <input type="file" id="photoInput" accept="image/*" onChange={handlePhotoChange} style={{display:'none'}}/>
          </div>
        </div></div>
        
        <button type="submit" disabled={isSubmitting} style={{...s.submitBtn,opacity:isSubmitting?0.6:1,cursor:isSubmitting?'not-allowed':'pointer'}}>{isSubmitting?'Submitting...':'Submit Safety Meeting Form'}</button>
      </form>
    </div>
    
    <div style={s.footer}><span style={{color:'#1e3a5f',fontWeight:'500'}}>AnthroSafe™ Powered by Field Driven Data™</span><span style={{color:'#94a3b8',margin:'0 8px'}}>|</span><span style={{color:'#475569'}}>© 2025 SLP Alaska</span></div>
  </div></div>);
}

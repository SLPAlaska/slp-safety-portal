'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://iypezirwdlqpptjpeeyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
);

const COMPANIES = ['A-C Electric','AKE-Line','Apache Corp.','Armstrong Oil & Gas','ASRC Energy Services','CCI-Industrial','Chosen Construction','CINGSA','Coho Enterprises','Conam Construction','ConocoPhillips','Five Star Oilfield Services','Fox Energy Services','G.A. West','GBR Equipment','GLM Energy Services','Graham Industrial Coatings','Harvest Midstream','Hilcorp Alaska','MagTec Alaska','Merkes Builders','Nordic-Calista','Parker TRS','Peninsula Paving','Pollard Wireline','Ridgeline Oilfield Services','Santos','Summit Excavation','Tesoro Refinery','Yellowjacket','Other'];

const LOCATIONS = ['Kenai','CIO','Beaver Creek','Swanson River','Ninilchik','Nikiski','Other Kenai Asset','Deadhorse','Prudhoe Bay','Kuparuk','Alpine','Willow','ENI','PIKKA','Point Thompson','North Star Island','Endicott','Badami','Other North Slope'];

const AUDIT_TYPES = [
  'LSR-Work Permits','LSR-Confined Spaces','LSR-Line of Fire','LSR-Energy Isolation',
  'LSR-Driving','LSR-Working at Heights','BBS Observation','MBWA',
  'JSA Review','Equipment Inspection','PPE Inspection','Housekeeping'
];

export default function DailyActivityLog(){
  const [isSubmitting,setIsSubmitting]=useState(false);
  const [submitted,setSubmitted]=useState(false);
  const [formData,setFormData]=useState({
    name:'',
    date:new Date().toISOString().split('T')[0],
    company:'',
    locationsVisited:[],
    trainingTopics:'',
    auditsCompleted:[],
    deficienciesIdentified:'',
    supportProvided:'',
    commentsConcerns:'',
    actionItems:'',
    planAhead:''
  });

  const handleChange=(e)=>{
    const{name,value}=e.target;
    setFormData(p=>({...p,[name]:value}));
  };

  const handleLocationChange=(location)=>{
    setFormData(p=>({
      ...p,
      locationsVisited:p.locationsVisited.includes(location)
        ?p.locationsVisited.filter(l=>l!==location)
        :[...p.locationsVisited,location]
    }));
  };

  const handleAuditChange=(audit)=>{
    setFormData(p=>({
      ...p,
      auditsCompleted:p.auditsCompleted.includes(audit)
        ?p.auditsCompleted.filter(a=>a!==audit)
        :[...p.auditsCompleted,audit]
    }));
  };

  const handleSubmit=async(e)=>{
    e.preventDefault();
    if(formData.locationsVisited.length===0){
      alert('Please select at least one location visited.');
      return;
    }
    setIsSubmitting(true);
    try{
      const{error}=await supabase.from('daily_activity_logs').insert([{
        name:formData.name,
        date:formData.date,
        company:formData.company,
        locations_visited:formData.locationsVisited.join(', '),
        training_topics:formData.trainingTopics,
        audits_completed:formData.auditsCompleted.join(', '),
        deficiencies_identified:formData.deficienciesIdentified,
        support_provided:formData.supportProvided,
        comments_concerns:formData.commentsConcerns,
        action_items:formData.actionItems,
        plan_ahead:formData.planAhead
      }]);
      if(error)throw error;
      setSubmitted(true);
    }catch(e){
      console.error(e);
      alert('Error: '+e.message);
    }finally{
      setIsSubmitting(false);
    }
  };

  const resetForm=()=>{
    setFormData({
      name:'',date:new Date().toISOString().split('T')[0],company:'',
      locationsVisited:[],trainingTopics:'',auditsCompleted:[],
      deficienciesIdentified:'',supportProvided:'',commentsConcerns:'',
      actionItems:'',planAhead:''
    });
    setSubmitted(false);
  };

  const s={
    container:{minHeight:'100vh',background:'linear-gradient(135deg, #1e3a8a 0%, #b91c1c 100%)',padding:'20px'},
    formContainer:{maxWidth:'800px',margin:'0 auto',background:'white',borderRadius:'16px',boxShadow:'0 20px 60px rgba(0,0,0,0.3)',overflow:'hidden'},
    header:{background:'linear-gradient(135deg, #1e3a8a 0%, #b91c1c 100%)',color:'white',padding:'30px',textAlign:'center'},
    content:{padding:'30px'},
    section:{marginBottom:'25px',border:'1px solid #e5e7eb',borderRadius:'12px',overflow:'hidden'},
    sectionHeader:{color:'white',padding:'12px 20px',fontWeight:'600',fontSize:'1rem'},
    sectionBlue:{background:'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)'},
    sectionRed:{background:'linear-gradient(135deg, #b91c1c 0%, #991b1b 100%)'},
    sectionBody:{padding:'20px',background:'#fafafa'},
    formGroup:{marginBottom:'20px'},
    label:{display:'block',marginBottom:'8px',fontWeight:'600',color:'#1f2937',fontSize:'0.95rem'},
    required:{color:'#b91c1c'},
    input:{width:'100%',padding:'12px 16px',border:'2px solid #d1d5db',borderRadius:'8px',fontSize:'1rem',background:'white'},
    select:{width:'100%',padding:'12px 16px',border:'2px solid #d1d5db',borderRadius:'8px',fontSize:'1rem',background:'white'},
    textarea:{width:'100%',padding:'12px 16px',border:'2px solid #d1d5db',borderRadius:'8px',fontSize:'1rem',minHeight:'100px',resize:'vertical'},
    checkboxGrid:{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))',gap:'10px',background:'white',padding:'15px',borderRadius:'8px',border:'2px solid #d1d5db'},
    checkboxItem:{display:'flex',alignItems:'center',gap:'8px',cursor:'pointer',padding:'8px',borderRadius:'6px',transition:'all 0.2s'},
    checkboxItemChecked:{background:'#dbeafe',border:'1px solid #3b82f6'},
    checkbox:{width:'18px',height:'18px',accentColor:'#1e3a8a'},
    submitBtn:{width:'100%',padding:'16px 32px',background:'linear-gradient(135deg, #1e3a8a 0%, #b91c1c 100%)',color:'white',border:'none',borderRadius:'10px',fontSize:'1.1rem',fontWeight:'600',cursor:'pointer',boxShadow:'0 4px 15px rgba(30,58,138,0.3)'},
    successMessage:{background:'linear-gradient(135deg, #059669 0%, #047857 100%)',color:'white',padding:'40px',borderRadius:'12px',textAlign:'center',margin:'20px 0'}
  };

  if(submitted){
    return(
      <div style={s.container}>
        <div style={{maxWidth:'600px',margin:'0 auto',paddingTop:'50px'}}>
          <div style={s.successMessage}>
            <div style={{fontSize:'4rem',marginBottom:'15px'}}>✓</div>
            <h2 style={{fontSize:'1.5rem',marginBottom:'10px'}}>Activity Log Submitted!</h2>
            <p style={{marginBottom:'20px'}}>Your Manager & HSE Daily Activity Log has been recorded.</p>
            <div style={{display:'flex',gap:'10px',justifyContent:'center',flexWrap:'wrap'}}>
              <button onClick={resetForm} style={{padding:'12px 24px',background:'white',color:'#059669',border:'none',borderRadius:'8px',fontSize:'1rem',fontWeight:'600',cursor:'pointer'}}>Submit Another Log</button>
              <a href="/" style={{padding:'12px 24px',background:'#6b7280',color:'white',border:'none',borderRadius:'8px',fontSize:'1rem',fontWeight:'600',cursor:'pointer',textDecoration:'none'}}>Back to Portal</a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return(
    <div style={s.container}>
      <div style={s.formContainer}>
        <div style={s.header}>
          <a href="/" style={{color:'white',textDecoration:'none',fontSize:'14px'}}>← Back to Portal</a>
          <div style={{background:'rgba(255,255,255,0.95)',borderRadius:'12px',padding:'15px',width:'fit-content',margin:'15px auto',boxShadow:'0 4px 15px rgba(0,0,0,0.2)'}}>
            <img src="/Logo.png" alt="SLP Alaska" style={{maxWidth:'200px',height:'auto'}}/>
          </div>
          <div style={{display:'inline-block',background:'white',color:'#1e3a8a',padding:'6px 16px',borderRadius:'20px',fontWeight:'700',fontSize:'0.85rem',marginBottom:'15px',border:'3px solid #b91c1c'}}>📋 DAILY ACTIVITY LOG</div>
          <h1 style={{fontSize:'1.6rem',marginBottom:'8px',textShadow:'2px 2px 4px rgba(0,0,0,0.3)'}}>Manager & HSE Daily Activity Log</h1>
          <p style={{opacity:0.95,fontSize:'1rem'}}>SLP Alaska Safety Management System</p>
        </div>

        <div style={s.content}>
          <form onSubmit={handleSubmit}>
            {/* Basic Information */}
            <div style={s.section}>
              <div style={{...s.sectionHeader,...s.sectionBlue}}>Basic Information</div>
              <div style={s.sectionBody}>
                <div style={s.formGroup}>
                  <label style={s.label}>Name <span style={s.required}>*</span></label>
                  <input type="text" name="name" value={formData.name} onChange={handleChange} required placeholder="Your full name" style={s.input}/>
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>Date <span style={s.required}>*</span></label>
                  <input type="date" name="date" value={formData.date} onChange={handleChange} required style={s.input}/>
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>Company <span style={s.required}>*</span></label>
                  <select name="company" value={formData.company} onChange={handleChange} required style={s.select}>
                    <option value="">-- Select Company --</option>
                    {COMPANIES.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Locations Visited */}
            <div style={s.section}>
              <div style={{...s.sectionHeader,...s.sectionRed}}>Locations Visited</div>
              <div style={s.sectionBody}>
                <div style={s.formGroup}>
                  <label style={s.label}>Select all locations visited today <span style={s.required}>*</span></label>
                  <div style={s.checkboxGrid}>
                    {LOCATIONS.map(loc=>(
                      <label key={loc} style={{...s.checkboxItem,...(formData.locationsVisited.includes(loc)?s.checkboxItemChecked:{})}}>
                        <input type="checkbox" checked={formData.locationsVisited.includes(loc)} onChange={()=>handleLocationChange(loc)} style={s.checkbox}/>
                        <span style={{fontSize:'0.9rem',color:'#374151'}}>{loc}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Training & Audits */}
            <div style={s.section}>
              <div style={{...s.sectionHeader,...s.sectionBlue}}>Training & Audits</div>
              <div style={s.sectionBody}>
                <div style={s.formGroup}>
                  <label style={s.label}>Training Topics Discussed</label>
                  <textarea name="trainingTopics" value={formData.trainingTopics} onChange={handleChange} placeholder="List any training topics discussed with crews..." style={s.textarea}/>
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>Audits Completed</label>
                  <div style={s.checkboxGrid}>
                    {AUDIT_TYPES.map(audit=>(
                      <label key={audit} style={{...s.checkboxItem,...(formData.auditsCompleted.includes(audit)?s.checkboxItemChecked:{})}}>
                        <input type="checkbox" checked={formData.auditsCompleted.includes(audit)} onChange={()=>handleAuditChange(audit)} style={s.checkbox}/>
                        <span style={{fontSize:'0.9rem',color:'#374151'}}>{audit}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Issues & Support */}
            <div style={s.section}>
              <div style={{...s.sectionHeader,...s.sectionRed}}>Issues & Support</div>
              <div style={s.sectionBody}>
                <div style={s.formGroup}>
                  <label style={s.label}>Deficiencies Identified</label>
                  <textarea name="deficienciesIdentified" value={formData.deficienciesIdentified} onChange={handleChange} placeholder="List any deficiencies or issues identified..." style={s.textarea}/>
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>Support Provided</label>
                  <textarea name="supportProvided" value={formData.supportProvided} onChange={handleChange} placeholder="Describe any support provided to crews..." style={s.textarea}/>
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>Comments/Concerns from Crew</label>
                  <textarea name="commentsConcerns" value={formData.commentsConcerns} onChange={handleChange} placeholder="Document any comments or concerns raised by crew members..." style={s.textarea}/>
                </div>
              </div>
            </div>

            {/* Action Items & Planning */}
            <div style={s.section}>
              <div style={{...s.sectionHeader,...s.sectionBlue}}>Action Items & Planning</div>
              <div style={s.sectionBody}>
                <div style={s.formGroup}>
                  <label style={s.label}>Action Items for Follow Up</label>
                  <textarea name="actionItems" value={formData.actionItems} onChange={handleChange} placeholder="List any action items requiring follow up..." style={s.textarea}/>
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>Plan Ahead for Upcoming Activity</label>
                  <textarea name="planAhead" value={formData.planAhead} onChange={handleChange} placeholder="Describe plans or preparations for upcoming activities..." style={s.textarea}/>
                </div>
              </div>
            </div>

            <button type="submit" disabled={isSubmitting} style={{...s.submitBtn,opacity:isSubmitting?0.5:1}}>
              {isSubmitting?'Submitting...':'Submit Activity Log'}
            </button>
          </form>
        </div>

        <div style={{textAlign:'center',padding:'20px',background:'linear-gradient(to bottom, #f8fafc, #ffffff)',color:'#64748b',fontSize:'11px',borderTop:'1px solid #e2e8f0'}}>
          <span style={{color:'#1e3a5f',fontWeight:'500'}}>Powered by Predictive Safety Analytics™</span>
          <span style={{color:'#94a3b8',margin:'0 8px'}}>|</span>
          <span style={{color:'#475569'}}>© 2025 SLP Alaska</span>
        </div>
      </div>
    </div>
  );
}

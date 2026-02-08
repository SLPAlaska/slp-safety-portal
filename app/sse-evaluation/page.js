'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://iypezirwdlqpptjpeeyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
);

const COMPANIES = ['A-C Electric','AKE-Line','Apache Corp.','Armstrong Oil & Gas','ASRC Energy Services','CCI-Industrial','Chosen Construction','CINGSA','Coho Enterprises','Conam Construction','ConocoPhillips','Five Star Oilfield Services','Fox Energy Services','G.A. West','GBR Equipment','GLM Energy Services','Graham Industrial Coatings','Harvest Midstream','Hilcorp Alaska','MagTec Alaska','Merkes Builders','Nordic-Calista','Parker TRS','Peninsula Paving','Pollard Wireline','Ridgeline Oilfield Services','Santos','Summit Excavation','Tesoro Refinery','Yellowjacket','Other'];
const LOCATIONS = ['Kenai','CIO','Beaver Creek','Swanson River','Ninilchik','Nikiski','Other Kenai Asset','Deadhorse','Prudhoe Bay','Kuparuk','Alpine','Willow','ENI','PIKKA','Point Thompson','North Star Island','Endicott','Badami','Other North Slope'];
const RATINGS = ['Excellent','Good','Satisfactory','Needs Improvement','Unsatisfactory'];
const GRADUATE_OPTIONS = [
  {value:'Yes - Ready to Graduate',label:'Yes - Ready to Graduate',type:'yes'},
  {value:'No - Needs More Time',label:'No - Needs More Time',type:'no'},
  {value:'No - Needs Additional Training',label:'No - Needs Additional Training',type:'no'},
  {value:'Pending Review',label:'Pending Review',type:'pending'}
];

export default function SSEEvaluation(){
  const [isSubmitting,setIsSubmitting]=useState(false);
  const [submitted,setSubmitted]=useState(false);
  const [formData,setFormData]=useState({
    evaluatorName:'',company:'',location:'',
    sseName:'',hireDate:'',
    safetyAttitude:'',trainingCompliance:'',adherencePolicies:'',
    comments:'',graduateEmployee:''
  });

  const handleChange=(e)=>{const{name,value}=e.target;setFormData(p=>({...p,[name]:value}));};

  const handleSubmit=async(e)=>{e.preventDefault();setIsSubmitting(true);
    try{
      const{error}=await supabase.from('sse_evaluations').insert([{
        evaluator_name:formData.evaluatorName,
        company:formData.company,
        location:formData.location,
        sse_name:formData.sseName,
        hire_date:formData.hireDate,
        safety_attitude:formData.safetyAttitude,
        training_compliance:formData.trainingCompliance,
        adherence_policies:formData.adherencePolicies,
        comments:formData.comments,
        graduate_employee:formData.graduateEmployee
      }]);
      if(error)throw error;
      setSubmitted(true);
    }catch(e){console.error(e);alert('Error: '+e.message);}finally{setIsSubmitting(false);}
  };

  const resetForm=()=>{setFormData({evaluatorName:'',company:'',location:'',sseName:'',hireDate:'',safetyAttitude:'',trainingCompliance:'',adherencePolicies:'',comments:'',graduateEmployee:''});setSubmitted(false);};

  const getRatingColor=(rating)=>{
    if(rating==='Excellent')return{border:'#059669',bg:'rgba(5,150,105,0.1)'};
    if(rating==='Good')return{border:'#0891b2',bg:'rgba(8,145,178,0.1)'};
    if(rating==='Satisfactory')return{border:'#f59e0b',bg:'rgba(245,158,11,0.1)'};
    if(rating==='Needs Improvement')return{border:'#ea580c',bg:'rgba(234,88,12,0.1)'};
    if(rating==='Unsatisfactory')return{border:'#dc2626',bg:'rgba(220,38,38,0.1)'};
    return{border:'#d1d5db',bg:'white'};
  };

  const s={
    container:{minHeight:'100vh',background:'linear-gradient(135deg, #1e3a8a 0%, #b91c1c 100%)',padding:'20px'},
    formBox:{maxWidth:'850px',margin:'0 auto',background:'white',borderRadius:'16px',boxShadow:'0 20px 60px rgba(0,0,0,0.3)',overflow:'hidden'},
    header:{background:'linear-gradient(135deg, #1e3a8a 0%, #b91c1c 100%)',color:'white',padding:'30px',textAlign:'center'},
    logoBox:{background:'rgba(255,255,255,0.95)',borderRadius:'12px',padding:'15px',width:'fit-content',margin:'0 auto 20px',boxShadow:'0 4px 15px rgba(0,0,0,0.2)'},
    badge:{display:'inline-block',background:'white',color:'#1e3a8a',padding:'6px 16px',borderRadius:'20px',fontWeight:'700',fontSize:'0.85rem',marginBottom:'15px',border:'3px solid #4f46e5',boxShadow:'0 2px 8px rgba(0,0,0,0.2)'},
    content:{padding:'30px'},
    infoBox:{background:'#eff6ff',border:'2px solid #3b82f6',borderRadius:'8px',padding:'15px',marginBottom:'25px',display:'flex',alignItems:'flex-start',gap:'10px'},
    section:{marginBottom:'30px',border:'1px solid #e5e7eb',borderRadius:'12px',overflow:'hidden'},
    sectionHeader:{color:'white',padding:'12px 20px',fontWeight:'600',fontSize:'1rem'},
    sectionBlue:{background:'linear-gradient(135deg, #1e3a8a, #1e40af)'},
    sectionRed:{background:'linear-gradient(135deg, #b91c1c, #dc2626)'},
    sectionIndigo:{background:'linear-gradient(135deg, #4f46e5, #7c3aed)'},
    sectionBody:{padding:'20px',background:'#f8fafc'},
    formRow:{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(250px, 1fr))',gap:'20px',marginBottom:'20px'},
    formGroup:{display:'flex',flexDirection:'column'},
    label:{fontWeight:'600',color:'#374151',marginBottom:'6px',fontSize:'0.9rem'},
    required:{color:'#b91c1c'},
    input:{padding:'12px 14px',border:'2px solid #d1d5db',borderRadius:'8px',fontSize:'1rem',background:'white'},
    select:{padding:'12px 14px',border:'2px solid #d1d5db',borderRadius:'8px',fontSize:'1rem',background:'white'},
    textarea:{padding:'12px 14px',border:'2px solid #d1d5db',borderRadius:'8px',fontSize:'1rem',minHeight:'100px',resize:'vertical'},
    ratingCard:{background:'white',border:'2px solid #e5e7eb',borderRadius:'10px',padding:'20px',marginBottom:'15px'},
    ratingLabel:{fontWeight:'600',color:'#374151',marginBottom:'10px',display:'block'},
    ratingOptions:{display:'flex',flexWrap:'wrap',gap:'10px'},
    ratingOption:{flex:1,minWidth:'120px'},
    ratingBtn:{display:'block',padding:'12px 16px',textAlign:'center',border:'2px solid #d1d5db',borderRadius:'8px',cursor:'pointer',fontWeight:'500',transition:'all 0.2s',background:'white'},
    graduateOptions:{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))',gap:'10px'},
    graduateBtn:{display:'block',padding:'15px 20px',textAlign:'center',border:'2px solid #d1d5db',borderRadius:'8px',cursor:'pointer',fontWeight:'500',transition:'all 0.2s',background:'white'},
    submitBtn:{width:'100%',padding:'16px 32px',background:'linear-gradient(135deg, #1e3a8a, #1e40af)',color:'white',border:'none',borderRadius:'10px',fontSize:'1.1rem',fontWeight:'600',cursor:'pointer',boxShadow:'0 4px 15px rgba(30,58,138,0.3)'},
    successBox:{background:'linear-gradient(135deg, #059669 0%, #047857 100%)',color:'white',padding:'40px',borderRadius:'12px',textAlign:'center',margin:'20px'},
    footer:{textAlign:'center',padding:'20px',background:'linear-gradient(to bottom, #f8fafc, #ffffff)',color:'#64748b',fontSize:'11px',borderTop:'1px solid #e2e8f0'}
  };

  const RatingSelector=({label,name,value})=>(
    <div style={s.ratingCard}>
      <span style={s.ratingLabel}>{label} <span style={s.required}>*</span></span>
      <div style={s.ratingOptions}>
        {RATINGS.map(rating=>{
          const colors=getRatingColor(rating);
          const isSelected=value===rating;
          return(
            <div key={rating} style={s.ratingOption}>
              <div 
                onClick={()=>setFormData(p=>({...p,[name]:rating}))}
                style={{...s.ratingBtn,borderColor:isSelected?colors.border:'#d1d5db',background:isSelected?colors.border:'white',color:isSelected?'white':'#374151'}}
              >
                {rating}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  if(submitted){return(<div style={s.container}><div style={{maxWidth:'600px',margin:'0 auto',paddingTop:'50px'}}><div style={s.successBox}><div style={{fontSize:'4rem',marginBottom:'20px'}}>✅</div><h2 style={{margin:'0 0 10px'}}>Evaluation Submitted Successfully!</h2><p style={{marginBottom:'20px'}}>Your SSE evaluation has been recorded.</p><div style={{display:'flex',gap:'10px',justifyContent:'center',flexWrap:'wrap'}}><button onClick={resetForm} style={{padding:'12px 24px',background:'white',color:'#059669',border:'none',borderRadius:'8px',fontSize:'1rem',fontWeight:'600',cursor:'pointer'}}>Submit Another Evaluation</button><a href="/" style={{padding:'12px 24px',background:'rgba(255,255,255,0.2)',color:'white',border:'none',borderRadius:'8px',fontSize:'1rem',fontWeight:'600',textDecoration:'none'}}>Back to Portal</a></div></div></div></div>);}

  return(<div style={s.container}><div style={s.formBox}>
    <div style={s.header}>
      <a href="/" style={{color:'white',textDecoration:'none',fontSize:'14px'}}>← Back to Portal</a>
      <div style={s.logoBox}><img src="/Logo.png" alt="SLP Alaska" style={{maxWidth:'200px',height:'auto'}}/></div>
      <div style={s.badge}>👷 SSE EVALUATION</div>
      <h1 style={{fontSize:'1.5rem',marginBottom:'8px',textShadow:'2px 2px 4px rgba(0,0,0,0.3)'}}>Short Service Employee Evaluation</h1>
      <p style={{opacity:0.95,fontSize:'1rem'}}>SLP Alaska Safety Management System</p>
    </div>
    
    <div style={s.content}>
      <div style={s.infoBox}>
        <span style={{fontSize:'1.5rem'}}>📋</span>
        <p style={{margin:0,color:'#1e40af',fontSize:'0.95rem'}}>Complete this evaluation for employees with less than 6 months of service. Regular evaluations help track progress and identify training needs.</p>
      </div>
      
      <form onSubmit={handleSubmit}>
        {/* Basic Information */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionBlue}}>📋 Basic Information</div><div style={s.sectionBody}>
          <div style={s.formRow}>
            <div style={s.formGroup}><label style={s.label}>Name of Evaluator <span style={s.required}>*</span></label><input type="text" name="evaluatorName" value={formData.evaluatorName} onChange={handleChange} required style={s.input}/></div>
            <div style={s.formGroup}><label style={s.label}>Client/Company <span style={s.required}>*</span></label><select name="company" value={formData.company} onChange={handleChange} required style={s.select}><option value="">Select Company...</option>{COMPANIES.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
          </div>
          <div style={s.formRow}>
            <div style={s.formGroup}><label style={s.label}>Location <span style={s.required}>*</span></label><select name="location" value={formData.location} onChange={handleChange} required style={s.select}><option value="">Select Location...</option>{LOCATIONS.map(l=><option key={l} value={l}>{l}</option>)}</select></div>
          </div>
        </div></div>
        
        {/* SSE Information */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionIndigo}}>👤 Short Service Employee Information</div><div style={s.sectionBody}>
          <div style={s.formRow}>
            <div style={s.formGroup}><label style={s.label}>SSE Being Evaluated <span style={s.required}>*</span></label><input type="text" name="sseName" value={formData.sseName} onChange={handleChange} required placeholder="Full name of employee" style={s.input}/></div>
            <div style={s.formGroup}><label style={s.label}>Hire Date <span style={s.required}>*</span></label><input type="date" name="hireDate" value={formData.hireDate} onChange={handleChange} required style={s.input}/></div>
          </div>
        </div></div>
        
        {/* Performance Ratings */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionRed}}>⭐ Performance Ratings</div><div style={s.sectionBody}>
          <RatingSelector label="Safety Attitude" name="safetyAttitude" value={formData.safetyAttitude}/>
          <RatingSelector label="Training Compliance" name="trainingCompliance" value={formData.trainingCompliance}/>
          <RatingSelector label="Adherence to Policies & Procedures" name="adherencePolicies" value={formData.adherencePolicies}/>
        </div></div>
        
        {/* Comments */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionBlue}}>💬 Comments</div><div style={s.sectionBody}>
          <div style={s.formGroup}><label style={s.label}>Additional Comments</label><textarea name="comments" value={formData.comments} onChange={handleChange} placeholder="Provide any additional observations, areas for improvement, or commendations..." style={s.textarea}/></div>
        </div></div>
        
        {/* Graduation Decision */}
        <div style={s.section}><div style={{...s.sectionHeader,...s.sectionIndigo}}>🎓 Graduation Decision</div><div style={s.sectionBody}>
          <label style={{...s.label,marginBottom:'15px'}}>Graduate Employee from SSE Program? <span style={s.required}>*</span></label>
          <div style={s.graduateOptions}>
            {GRADUATE_OPTIONS.map(opt=>{
              const isSelected=formData.graduateEmployee===opt.value;
              let selectedStyle={};
              if(isSelected){
                if(opt.type==='yes')selectedStyle={borderColor:'#059669',background:'#059669',color:'white'};
                else if(opt.type==='no')selectedStyle={borderColor:'#f59e0b',background:'#f59e0b',color:'white'};
                else selectedStyle={borderColor:'#6b7280',background:'#6b7280',color:'white'};
              }
              return(
                <div key={opt.value} onClick={()=>setFormData(p=>({...p,graduateEmployee:opt.value}))} style={{...s.graduateBtn,...selectedStyle}}>
                  {opt.label}
                </div>
              );
            })}
          </div>
        </div></div>
        
        <button type="submit" disabled={isSubmitting||!formData.safetyAttitude||!formData.trainingCompliance||!formData.adherencePolicies||!formData.graduateEmployee} style={{...s.submitBtn,opacity:(isSubmitting||!formData.safetyAttitude||!formData.trainingCompliance||!formData.adherencePolicies||!formData.graduateEmployee)?0.6:1,cursor:(isSubmitting||!formData.safetyAttitude||!formData.trainingCompliance||!formData.adherencePolicies||!formData.graduateEmployee)?'not-allowed':'pointer'}}>{isSubmitting?'Submitting...':'Submit SSE Evaluation'}</button>
      </form>
    </div>
    
    <div style={s.footer}><span style={{color:'#1e3a5f',fontWeight:'500'}}>AnthroSafe™ Field Driven Safety</span><span style={{color:'#94a3b8',margin:'0 8px'}}>|</span><span style={{color:'#475569'}}>© 2026 SLP Alaska, LLC</span></div>
  </div></div>);
}

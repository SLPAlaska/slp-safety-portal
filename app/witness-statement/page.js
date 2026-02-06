'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://iypezirwdlqpptjpeeyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
);

const REPORT_TYPES = ['Injury/Illness','Near Miss','Equipment Damage','Property Damage','Vehicle Incident','Environmental Impact','Spill/Release','Fire/Explosion','Security Incident','HR Issue','Harassment/Discrimination','Policy Violation','Quality Issue','Other'];

export default function WitnessStatement(){
  const [isSubmitting,setIsSubmitting]=useState(false);
  const [submitted,setSubmitted]=useState(false);
  const [statementId,setStatementId]=useState('');
  const [formData,setFormData]=useState({
    reportType:'',incidentDate:'',incidentTime:'',incidentLocation:'',
    witnessName:'',witnessPhone:'',witnessEmail:'',company:'',jobTitle:'',
    whatWitnessed:'',otherWitnesses:'',otherWitnessNames:'',additionalComments:'',
    acknowledgment:false
  });

  const handleChange=(e)=>{const{name,value,type,checked}=e.target;setFormData(p=>({...p,[name]:type==='checkbox'?checked:value}));};

  const generateStatementId=()=>{
    const now=new Date();
    const year=now.getFullYear();
    const month=String(now.getMonth()+1).padStart(2,'0');
    const day=String(now.getDate()).padStart(2,'0');
    const random=Math.floor(Math.random()*10000).toString().padStart(4,'0');
    return `WS-${year}${month}${day}-${random}`;
  };

  const handleSubmit=async(e)=>{e.preventDefault();setIsSubmitting(true);
    const newStatementId=generateStatementId();
    try{
      const{error}=await supabase.from('witness_statements').insert([{
        statement_id:newStatementId,
        report_type:formData.reportType,
        incident_date:formData.incidentDate,
        incident_time:formData.incidentTime,
        incident_location:formData.incidentLocation,
        witness_name:formData.witnessName,
        witness_phone:formData.witnessPhone,
        witness_email:formData.witnessEmail,
        company:formData.company,
        job_title:formData.jobTitle,
        what_witnessed:formData.whatWitnessed,
        other_witnesses:formData.otherWitnesses,
        other_witness_names:formData.otherWitnessNames||null,
        additional_comments:formData.additionalComments||null,
        acknowledgment:formData.acknowledgment?'Yes':'No'
      }]);
      if(error)throw error;
      setStatementId(newStatementId);
      setSubmitted(true);
    }catch(e){console.error(e);alert('Error: '+e.message);}finally{setIsSubmitting(false);}
  };

  const resetForm=()=>{setFormData({reportType:'',incidentDate:'',incidentTime:'',incidentLocation:'',witnessName:'',witnessPhone:'',witnessEmail:'',company:'',jobTitle:'',whatWitnessed:'',otherWitnesses:'',otherWitnessNames:'',additionalComments:'',acknowledgment:false});setSubmitted(false);setStatementId('');};

  const s={
    container:{minHeight:'100vh',background:'linear-gradient(135deg, #1e3a8a 0%, #b91c1c 100%)',padding:'20px'},
    formBox:{maxWidth:'700px',margin:'0 auto',background:'white',borderRadius:'16px',boxShadow:'0 20px 60px rgba(0,0,0,0.3)',overflow:'hidden'},
    header:{background:'linear-gradient(135deg, #1e3a8a 0%, #b91c1c 100%)',color:'white',padding:'30px',textAlign:'center',borderBottom:'4px solid #c41e3a'},
    logoBox:{background:'rgba(255,255,255,0.95)',borderRadius:'12px',padding:'15px',width:'fit-content',margin:'0 auto 20px',boxShadow:'0 4px 15px rgba(0,0,0,0.2)'},
    badge:{display:'inline-block',background:'white',color:'#c41e3a',padding:'6px 16px',borderRadius:'20px',fontWeight:'700',fontSize:'0.85rem',marginBottom:'15px',border:'3px solid #c41e3a',boxShadow:'0 2px 8px rgba(0,0,0,0.2)'},
    content:{padding:'30px'},
    sectionTitle:{color:'#c41e3a',fontSize:'16px',fontWeight:'700',margin:'25px 0 15px',paddingBottom:'8px',borderBottom:'2px solid #ea580c'},
    firstSection:{marginTop:0},
    formGroup:{marginBottom:'18px'},
    label:{display:'block',marginBottom:'6px',fontWeight:'500',color:'#1e3a5f',fontSize:'14px'},
    required:{color:'#c41e3a'},
    input:{width:'100%',padding:'12px 14px',border:'2px solid #e2e8f0',borderRadius:'8px',fontSize:'15px',background:'#fff'},
    select:{width:'100%',padding:'12px 14px',border:'2px solid #e2e8f0',borderRadius:'8px',fontSize:'15px',background:'#fff'},
    textarea:{width:'100%',padding:'12px 14px',border:'2px solid #e2e8f0',borderRadius:'8px',fontSize:'15px',minHeight:'150px',resize:'vertical',fontFamily:'inherit'},
    textareaSmall:{minHeight:'80px'},
    row:{display:'flex',gap:'15px'},
    rowItem:{flex:1},
    radioGroup:{display:'flex',gap:'20px',marginTop:'8px'},
    radioOption:{display:'flex',alignItems:'center',gap:'8px',cursor:'pointer'},
    radioInput:{width:'18px',height:'18px',cursor:'pointer'},
    note:{background:'#fef3c7',borderLeft:'4px solid #f59e0b',padding:'12px 15px',margin:'20px 0',borderRadius:'0 8px 8px 0',fontSize:'13px',color:'#92400e'},
    checkboxGroup:{display:'flex',alignItems:'flex-start',gap:'10px',padding:'15px',background:'#f8fafc',borderRadius:'8px',border:'2px solid #e2e8f0'},
    checkboxInput:{width:'20px',height:'20px',marginTop:'2px',cursor:'pointer',flexShrink:0},
    checkboxLabel:{fontWeight:'400',fontSize:'13px',lineHeight:'1.5',cursor:'pointer'},
    submitBtn:{width:'100%',padding:'16px',background:'linear-gradient(135deg, #c41e3a 0%, #a01830 100%)',color:'white',border:'none',borderRadius:'8px',fontSize:'16px',fontWeight:'700',cursor:'pointer',marginTop:'25px',textTransform:'uppercase',letterSpacing:'1px'},
    successBox:{textAlign:'center',padding:'60px 30px'},
    successIcon:{fontSize:'4rem',color:'#059669',marginBottom:'15px'},
    statementIdBox:{fontFamily:'monospace',fontSize:'18px',background:'#f0fdf4',padding:'10px 20px',borderRadius:'8px',display:'inline-block',margin:'15px 0',border:'2px solid #059669'},
    footer:{textAlign:'center',padding:'20px',background:'linear-gradient(to bottom, #f8fafc, #ffffff)',color:'#64748b',fontSize:'11px',borderTop:'1px solid #e2e8f0'}
  };

  if(submitted){return(<div style={s.container}><div style={{maxWidth:'600px',margin:'0 auto',paddingTop:'50px'}}><div style={{...s.formBox,padding:'0'}}><div style={s.successBox}><div style={s.successIcon}>✓</div><h2 style={{color:'#059669',marginBottom:'15px'}}>Statement Submitted Successfully</h2><p style={{color:'#374151',marginBottom:'10px'}}>Your witness statement has been recorded.</p><p style={{color:'#374151'}}>Statement Reference Number:</p><div style={s.statementIdBox}>{statementId}</div><p style={{marginTop:'20px',fontSize:'13px',color:'#6b7280'}}>Please save this reference number for your records.<br/>The Safety Team will contact you if additional information is needed.</p><div style={{display:'flex',gap:'10px',justifyContent:'center',marginTop:'25px',flexWrap:'wrap'}}><button onClick={resetForm} style={{padding:'12px 24px',background:'#059669',color:'white',border:'none',borderRadius:'8px',fontSize:'14px',fontWeight:'600',cursor:'pointer'}}>Submit Another Statement</button><a href="/" style={{padding:'12px 24px',background:'#6b7280',color:'white',border:'none',borderRadius:'8px',fontSize:'14px',fontWeight:'600',textDecoration:'none'}}>Back to Portal</a></div></div></div></div></div>);}

  return(<div style={s.container}><div style={s.formBox}>
    <div style={s.header}>
      <a href="/" style={{color:'white',textDecoration:'none',fontSize:'14px'}}>← Back to Portal</a>
      <div style={s.logoBox}><img src="/Logo.png" alt="SLP Alaska" style={{maxWidth:'150px',height:'auto'}}/></div>
      <div style={s.badge}>📝 WITNESS STATEMENT</div>
      <h1 style={{fontSize:'28px',marginBottom:'5px',fontWeight:'700'}}>Witness Statement Form</h1>
      <p style={{fontSize:'14px',fontWeight:'500',opacity:0.9}}>Confidential Incident Documentation</p>
    </div>
    
    <div style={s.content}>
      <form onSubmit={handleSubmit}>
        {/* Incident Information */}
        <div style={{...s.sectionTitle,...s.firstSection}}>INCIDENT INFORMATION</div>
        
        <div style={s.formGroup}>
          <label style={s.label}>Type of Report <span style={s.required}>*</span></label>
          <select name="reportType" value={formData.reportType} onChange={handleChange} required style={s.select}>
            <option value="">Select Report Type...</option>
            {REPORT_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        
        <div style={s.row}>
          <div style={{...s.formGroup,...s.rowItem}}><label style={s.label}>Incident Date <span style={s.required}>*</span></label><input type="date" name="incidentDate" value={formData.incidentDate} onChange={handleChange} required style={s.input}/></div>
          <div style={{...s.formGroup,...s.rowItem}}><label style={s.label}>Incident Time <span style={s.required}>*</span></label><input type="time" name="incidentTime" value={formData.incidentTime} onChange={handleChange} required style={s.input}/></div>
        </div>
        
        <div style={s.formGroup}><label style={s.label}>Incident Location <span style={s.required}>*</span></label><input type="text" name="incidentLocation" value={formData.incidentLocation} onChange={handleChange} required placeholder="Building, area, or specific location" style={s.input}/></div>
        
        {/* Witness Information */}
        <div style={s.sectionTitle}>WITNESS INFORMATION</div>
        
        <div style={s.formGroup}><label style={s.label}>Witness Name <span style={s.required}>*</span></label><input type="text" name="witnessName" value={formData.witnessName} onChange={handleChange} required style={s.input}/></div>
        
        <div style={s.row}>
          <div style={{...s.formGroup,...s.rowItem}}><label style={s.label}>Phone Number <span style={s.required}>*</span></label><input type="tel" name="witnessPhone" value={formData.witnessPhone} onChange={handleChange} required placeholder="(XXX) XXX-XXXX" style={s.input}/></div>
          <div style={{...s.formGroup,...s.rowItem}}><label style={s.label}>Email Address <span style={s.required}>*</span></label><input type="email" name="witnessEmail" value={formData.witnessEmail} onChange={handleChange} required style={s.input}/></div>
        </div>
        
        <div style={s.row}>
          <div style={{...s.formGroup,...s.rowItem}}><label style={s.label}>Company <span style={s.required}>*</span></label><input type="text" name="company" value={formData.company} onChange={handleChange} required placeholder="Company name" style={s.input}/></div>
          <div style={{...s.formGroup,...s.rowItem}}><label style={s.label}>Job Title <span style={s.required}>*</span></label><input type="text" name="jobTitle" value={formData.jobTitle} onChange={handleChange} required style={s.input}/></div>
        </div>
        
        {/* Witness Statement */}
        <div style={s.sectionTitle}>WITNESS STATEMENT</div>
        
        <div style={s.note}>Please provide a detailed account of what you observed. Include what you saw, heard, and any actions taken. Be as specific as possible about the sequence of events.</div>
        
        <div style={s.formGroup}>
          <label style={s.label}>What did you witness? <span style={s.required}>*</span></label>
          <textarea name="whatWitnessed" value={formData.whatWitnessed} onChange={handleChange} required placeholder="Describe what you witnessed in your own words. Include:
• What were you doing when the incident occurred?
• What did you see happen?
• What did you hear?
• What actions were taken immediately after?
• Any other relevant details..." style={s.textarea}/>
        </div>
        
        <div style={s.formGroup}>
          <label style={s.label}>Were there other witnesses? <span style={s.required}>*</span></label>
          <div style={s.radioGroup}>
            <label style={s.radioOption}><input type="radio" name="otherWitnesses" value="Yes" checked={formData.otherWitnesses==='Yes'} onChange={handleChange} required style={s.radioInput}/><span>Yes</span></label>
            <label style={s.radioOption}><input type="radio" name="otherWitnesses" value="No" checked={formData.otherWitnesses==='No'} onChange={handleChange} style={s.radioInput}/><span>No</span></label>
          </div>
        </div>
        
        {formData.otherWitnesses==='Yes'&&(
          <div style={s.formGroup}><label style={s.label}>Other Witness Names</label><textarea name="otherWitnessNames" value={formData.otherWitnessNames} onChange={handleChange} placeholder="Please list names of other witnesses (one per line)" style={{...s.textarea,...s.textareaSmall}}/></div>
        )}
        
        <div style={s.formGroup}><label style={s.label}>Additional Comments</label><textarea name="additionalComments" value={formData.additionalComments} onChange={handleChange} placeholder="Any other information you think may be relevant..." style={{...s.textarea,...s.textareaSmall}}/></div>
        
        {/* Acknowledgment */}
        <div style={s.sectionTitle}>ACKNOWLEDGMENT</div>
        
        <div style={s.checkboxGroup}>
          <input type="checkbox" name="acknowledgment" checked={formData.acknowledgment} onChange={handleChange} required style={s.checkboxInput}/>
          <label style={s.checkboxLabel} onClick={()=>setFormData(p=>({...p,acknowledgment:!p.acknowledgment}))}>I hereby certify that the information provided in this statement is true and accurate to the best of my knowledge. I understand that this statement may be used as part of an official incident investigation and may be shared with relevant parties as necessary.</label>
        </div>
        
        <button type="submit" disabled={isSubmitting||!formData.acknowledgment} style={{...s.submitBtn,opacity:(isSubmitting||!formData.acknowledgment)?0.6:1,cursor:(isSubmitting||!formData.acknowledgment)?'not-allowed':'pointer'}}>{isSubmitting?'Submitting...':'Submit Witness Statement'}</button>
      </form>
    </div>
    
    <div style={s.footer}><span style={{color:'#1e3a5f',fontWeight:'500'}}>AnthroSafe™ Powered by Field Driven Data™</span><span style={{color:'#94a3b8',margin:'0 8px'}}>|</span><span style={{color:'#475569'}}>© 2025 SLP Alaska</span></div>
  </div></div>);
}

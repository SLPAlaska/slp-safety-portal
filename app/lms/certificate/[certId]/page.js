'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

export default function CertificatePage() {
  const params = useParams()
  const certId = params['certId']
  const [cert, setCert] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/lms/certificate/' + certId)
      if (!res.ok) { setNotFound(true); setLoading(false); return }
      const data = await res.json()
      setCert(data.cert)
      setLoading(false)
    }
    if (certId) load()
  }, [certId])

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontFamily:'Arial,sans-serif'}}>
      <p>Loading certificate...</p>
    </div>
  )

  if (notFound) return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100vh',fontFamily:'Arial,sans-serif'}}>
      <div style={{fontSize:'48px',marginBottom:'16px'}}>?</div>
      <h2 style={{color:'#b71c1c'}}>Certificate Not Found</h2>
      <p style={{color:'#666'}}>Certificate ID: {certId}</p>
      <p style={{color:'#999',fontSize:'13px'}}>This certificate may not exist or the link may be incorrect.</p>
    </div>
  )

  const issuedDate = cert.issued_at ? new Date(cert.issued_at).toLocaleDateString('en-US',{month:'2-digit',day:'2-digit',year:'numeric'}) : ''
  const expiresDate = cert.expires_at ? new Date(cert.expires_at).toLocaleDateString('en-US',{month:'2-digit',day:'2-digit',year:'numeric'}) : ''

  // Split course title from body text if completion_text starts with the title
  const completionText = cert.completion_text || ''

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap');
        @media print {
          .no-print { display: none !important; }
          html, body { margin: 0; padding: 0; background: #fff !important; }
          .cert-page-bg { background: #fff !important; padding: 0 !important; }
          .cert-outer { box-shadow: none !important; margin: 0 !important; width: 100% !important; }
        }
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; background: #d0d0d0; }
      `}</style>

      {/* Toolbar */}
      <div className="no-print" style={{display:'flex',justifyContent:'center',gap:'12px',padding:'16px',background:'#555'}}>
        <button onClick={() => window.print()}
          style={{background:'#b71c1c',color:'#fff',border:'none',borderRadius:'8px',padding:'10px 28px',fontSize:'14px',fontWeight:'700',cursor:'pointer'}}>
          Print / Save PDF
        </button>
        <button onClick={() => window.history.back()}
          style={{background:'#fff',color:'#333',border:'1px solid #ccc',borderRadius:'8px',padding:'10px 20px',fontSize:'14px',cursor:'pointer'}}>
          Back
        </button>
      </div>

      {/* Page background */}
      <div className="cert-page-bg" style={{background:'#d0d0d0',padding:'24px 20px 48px',display:'flex',justifyContent:'center'}}>

        {/* Certificate card */}
        <div className="cert-outer" style={{
          width:'960px',
          background:'#fff',
          position:'relative',
          boxShadow:'0 6px 40px rgba(0,0,0,0.25)',
          fontFamily:'Georgia,serif',
        }}>

          {/* === BORDER SYSTEM === */}
          {/* Outer red border */}
          <div style={{position:'absolute',inset:0,border:'12px solid #b71c1c',pointerEvents:'none',zIndex:10}} />
          {/* White gap */}
          <div style={{position:'absolute',inset:'12px',border:'4px solid #fff',pointerEvents:'none',zIndex:10}} />
          {/* Inner red line */}
          <div style={{position:'absolute',inset:'16px',border:'2px solid #b71c1c',pointerEvents:'none',zIndex:10}} />

          {/* Dashed vertical strips inside outer border */}
          <div style={{position:'absolute',top:'16px',bottom:'16px',left:'2px',width:'10px',
            backgroundImage:'repeating-linear-gradient(to bottom, #b71c1c 0px, #b71c1c 10px, transparent 10px, transparent 18px)',
            pointerEvents:'none',zIndex:10}} />
          <div style={{position:'absolute',top:'16px',bottom:'16px',right:'2px',width:'10px',
            backgroundImage:'repeating-linear-gradient(to bottom, #b71c1c 0px, #b71c1c 10px, transparent 10px, transparent 18px)',
            pointerEvents:'none',zIndex:10}} />

          {/* === CONTENT === */}
          <div style={{position:'relative',zIndex:5,padding:'32px 70px 28px',display:'flex',flexDirection:'column',alignItems:'center'}}>

            {/* Script title */}
            <div style={{fontFamily:'"Great Vibes",cursive',fontSize:'72px',color:'#999',lineHeight:1.1,marginBottom:'2px',textAlign:'center'}}>
              Certificate of Completion
            </div>

            {/* Red rule under title */}
            <div style={{width:'360px',height:'2px',background:'#b71c1c',marginBottom:'14px'}} />

            {/* Verifies that */}
            <div style={{fontFamily:'Arial,Helvetica,sans-serif',fontSize:'12px',fontWeight:'700',letterSpacing:'0.18em',color:'#444',marginBottom:'6px',textTransform:'uppercase'}}>
              This Certificate Verifies That
            </div>

            {/* Learner name */}
            <div style={{fontSize:'46px',color:'#bbb',fontFamily:'Georgia,serif',fontWeight:'400',marginBottom:'14px',letterSpacing:'0.02em',textAlign:'center'}}>
              {cert.full_name}
            </div>

            {/* Completion text */}
            <div style={{textAlign:'center',maxWidth:'700px',marginBottom:'14px'}}>
              <div style={{fontSize:'15px',fontWeight:'700',color:'#222',fontFamily:'Arial,Helvetica,sans-serif',marginBottom:'8px',letterSpacing:'0.02em'}}>
                {cert.course_title}
              </div>
              {completionText.replace(cert.course_title, '').trim().split('\n').filter(l => l.trim()).map((line, i) => (
                <p key={i} style={{fontSize:'13px',color:'#333',lineHeight:'1.7',margin:'0 0 4px',fontFamily:'Arial,Helvetica,sans-serif'}}>
                  {line.trim()}
                </p>
              ))}
            </div>

            {/* Conducted by */}
            <div style={{fontSize:'12px',fontWeight:'700',letterSpacing:'0.14em',color:'#333',textTransform:'uppercase',marginBottom:'4px',fontFamily:'Arial,Helvetica,sans-serif'}}>
              This Training Was Conducted On {issuedDate} By
            </div>

            {/* Company */}
            <div style={{fontSize:'24px',fontWeight:'700',color:'#222',fontFamily:'Arial,Helvetica,sans-serif',letterSpacing:'0.04em',marginBottom:'2px'}}>
              SLP Alaska, LLC
            </div>

            {/* Expiration */}
            <div style={{fontSize:'12px',fontWeight:'700',letterSpacing:'0.12em',color:'#555',textTransform:'uppercase',marginBottom:'16px',fontFamily:'Arial,Helvetica,sans-serif'}}>
              Expiration Date: {expiresDate}
            </div>

            {/* === BOTTOM ROW === */}
            <div style={{
              display:'grid',
              gridTemplateColumns:'160px 1fr 160px',
              alignItems:'center',
              width:'100%',
              gap:'8px',
              marginTop:'4px',
            }}>

              {/* LEFT: CSP + ASP */}
              <div style={{display:'flex',gap:'10px',alignItems:'center',justifyContent:'flex-start'}}>
                <img src="/CSP_Seal.jpg" alt="CSP" style={{width:'72px',height:'72px',objectFit:'contain',flexShrink:0}} />
                <img src="/ASP_Seal.png" alt="ASP" style={{width:'72px',height:'72px',objectFit:'contain',flexShrink:0}} />
              </div>

              {/* CENTER: Signature + AnthroSafe logo */}
              <div style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
                {/* Signature */}
                <div style={{width:'200px',borderBottom:'1.5px solid #333',paddingBottom:'2px',marginBottom:'4px',textAlign:'center'}}>
                  <span style={{fontFamily:'"Great Vibes",cursive',fontSize:'30px',color:'#222'}}>Brian Walden</span>
                </div>
                <div style={{fontFamily:'Arial,Helvetica,sans-serif',fontSize:'11px',fontWeight:'700',color:'#333',letterSpacing:'0.1em',marginBottom:'12px',textTransform:'uppercase'}}>
                  Brian Walden, Trainer
                </div>
                {/* AnthroSafe logo */}
                <img src="/AnthroSafe_Logo.PNG" alt="AnthroSafe" style={{height:'70px',objectFit:'contain',maxWidth:'180px',display:'block'}} />
              </div>

              {/* RIGHT: OHST + CSHM + OSHA */}
              <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:'8px'}}>
                <div style={{display:'flex',gap:'10px',alignItems:'center',justifyContent:'flex-end'}}>
                  <img src="/OHST_Seal.png" alt="OHST" style={{width:'72px',height:'72px',objectFit:'contain',flexShrink:0}} />
                  <img src="/CSHM_Seal.png" alt="CSHM" style={{width:'72px',height:'72px',objectFit:'contain',flexShrink:0}} />
                </div>
                {/* OSHA Compliant */}
                <div style={{
                  border:'2.5px solid #003087',padding:'3px 10px',
                  display:'inline-flex',flexDirection:'column',alignItems:'center',
                  background:'#fff',
                }}>
                  <div style={{fontSize:'18px',fontWeight:'900',color:'#003087',fontFamily:'Arial,sans-serif',letterSpacing:'-0.01em',lineHeight:1}}>OSHA</div>
                  <div style={{fontSize:'7px',fontWeight:'700',color:'#003087',fontFamily:'Arial,sans-serif',letterSpacing:'0.08em'}}>COMPLIANT</div>
                </div>
              </div>

            </div>

            {/* Cert number footer */}
            <div style={{marginTop:'14px',fontSize:'10px',color:'#bbb',fontFamily:'Arial,sans-serif',letterSpacing:'0.06em',textAlign:'center'}}>
              Certificate No: {cert.cert_number}&nbsp;&nbsp;&bull;&nbsp;&nbsp;Verify at portal.slpalaska.com/lms/certificate/{cert.cert_number}
            </div>

          </div>
        </div>
      </div>
    </>
  )
}

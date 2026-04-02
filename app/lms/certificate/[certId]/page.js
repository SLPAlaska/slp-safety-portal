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

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap');
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 0; }
          .cert-outer { box-shadow: none !important; margin: 0 !important; }
        }
        body { background: #e8e8e8; margin: 0; padding: 0; }
      `}</style>

      {/* Print / Back buttons */}
      <div className="no-print" style={{display:'flex',justifyContent:'center',gap:'12px',padding:'20px',background:'#e8e8e8'}}>
        <button
          onClick={() => window.print()}
          style={{background:'#b71c1c',color:'#fff',border:'none',borderRadius:'8px',padding:'10px 24px',fontSize:'14px',fontWeight:'700',cursor:'pointer'}}
        >
          Print / Save PDF
        </button>
        <button
          onClick={() => window.history.back()}
          style={{background:'#fff',color:'#333',border:'1px solid #ccc',borderRadius:'8px',padding:'10px 24px',fontSize:'14px',cursor:'pointer'}}
        >
          Back
        </button>
      </div>

      {/* Certificate */}
      <div style={{display:'flex',justifyContent:'center',padding:'0 20px 40px',background:'#e8e8e8'}}>
        <div className="cert-outer" style={{
          width:'1000px',
          minHeight:'720px',
          background:'#fff',
          position:'relative',
          boxShadow:'0 4px 32px rgba(0,0,0,0.18)',
          padding:'0',
          fontFamily:'Georgia, serif',
        }}>

          {/* Outer red border */}
          <div style={{
            position:'absolute',inset:'10px',
            border:'6px solid #b71c1c',
            pointerEvents:'none',
            zIndex:1,
          }} />
          {/* Inner thin border */}
          <div style={{
            position:'absolute',inset:'20px',
            border:'1.5px solid #b71c1c',
            pointerEvents:'none',
            zIndex:1,
          }} />

          {/* Corner ornaments */}
          {['top:10px;left:10px','top:10px;right:10px','bottom:10px;left:10px','bottom:10px;right:10px'].map((pos,i) => {
            const styles = {}
            pos.split(';').forEach(p => { const [k,v]=p.split(':'); styles[k]=v })
            return (
              <div key={i} style={{
                position:'absolute', ...styles,
                width:'32px', height:'32px',
                background:'#b71c1c',
                zIndex:2,
              }} />
            )
          })}

          {/* Red side decorative strips */}
          <div style={{position:'absolute',top:'42px',bottom:'42px',left:'10px',width:'6px',background:'repeating-linear-gradient(180deg,#b71c1c 0px,#b71c1c 18px,#fff 18px,#fff 24px)',zIndex:1}} />
          <div style={{position:'absolute',top:'42px',bottom:'42px',right:'10px',width:'6px',background:'repeating-linear-gradient(180deg,#b71c1c 0px,#b71c1c 18px,#fff 18px,#fff 24px)',zIndex:1}} />

          {/* Content area */}
          <div style={{position:'relative',zIndex:3,padding:'40px 80px 36px',display:'flex',flexDirection:'column',alignItems:'center'}}>

            {/* Script title */}
            <div style={{fontFamily:'"Great Vibes", cursive',fontSize:'68px',color:'#888',lineHeight:1.1,marginBottom:'4px',marginTop:'8px'}}>
              Certificate of Completion
            </div>

            {/* Underline */}
            <div style={{width:'340px',height:'1px',background:'#b71c1c',marginBottom:'16px'}} />

            {/* Verifies that */}
            <div style={{fontFamily:'Arial,sans-serif',fontSize:'13px',fontWeight:'700',letterSpacing:'0.15em',color:'#333',marginBottom:'8px',textTransform:'uppercase'}}>
              This Certificate Verifies That
            </div>

            {/* Learner name */}
            <div style={{fontSize:'42px',color:'#aaa',fontFamily:'Georgia,serif',fontWeight:'400',marginBottom:'16px',letterSpacing:'0.02em'}}>
              {cert.full_name}
            </div>

            {/* Completion text */}
            <div style={{fontSize:'14px',color:'#333',textAlign:'center',lineHeight:'1.7',maxWidth:'700px',marginBottom:'18px',fontFamily:'Arial,sans-serif'}}>
              {cert.completion_text}
            </div>

            {/* Conducted by */}
            <div style={{fontSize:'13px',fontWeight:'700',letterSpacing:'0.12em',color:'#333',textTransform:'uppercase',marginBottom:'6px',fontFamily:'Arial,sans-serif'}}>
              This Training Was Conducted On {issuedDate} By
            </div>

            {/* Company */}
            <div style={{fontSize:'32px',fontWeight:'700',color:'#333',fontFamily:'Arial,sans-serif',letterSpacing:'0.04em',marginBottom:'4px'}}>
              SLP Alaska, LLC
            </div>

            {/* Expiration */}
            <div style={{fontSize:'13px',fontWeight:'700',letterSpacing:'0.1em',color:'#555',textTransform:'uppercase',marginBottom:'20px',fontFamily:'Arial,sans-serif'}}>
              Expiration Date: {expiresDate}
            </div>

            {/* Bottom row: badges + signature + badges */}
            <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',width:'100%',marginTop:'4px'}}>

              {/* Left badges */}
              <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
                {['CSP','ASP'].map(b => (
                  <div key={b} style={{
                    width:'64px',height:'64px',borderRadius:'50%',
                    border:'3px solid #b71c1c',
                    display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
                    background:'#fff',
                  }}>
                    <div style={{fontSize:'7px',color:'#b71c1c',fontWeight:'700',letterSpacing:'0.08em',fontFamily:'Arial,sans-serif',textAlign:'center',lineHeight:1.2}}>BOARD OF<br/>CERTIFIED<br/>SAFETY</div>
                    <div style={{fontSize:'14px',fontWeight:'900',color:'#2d5a27',fontFamily:'Arial,sans-serif'}}>{b}</div>
                    <div style={{fontSize:'6px',color:'#b71c1c',fontWeight:'700',letterSpacing:'0.06em',fontFamily:'Arial,sans-serif'}}>PROFESSIONALS</div>
                  </div>
                ))}
              </div>

              {/* Center: signature + logo */}
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',flex:1,padding:'0 24px'}}>
                {/* Signature line */}
                <div style={{width:'220px',borderBottom:'1.5px solid #333',marginBottom:'4px',paddingBottom:'4px'}}>
                  <div style={{fontFamily:'"Great Vibes",cursive',fontSize:'28px',color:'#333',textAlign:'center'}}>Brian Walden</div>
                </div>
                <div style={{fontFamily:'Arial,sans-serif',fontSize:'12px',fontWeight:'700',color:'#333',letterSpacing:'0.08em',marginBottom:'14px'}}>
                  Brian Walden, TRAINER
                </div>
                {/* SLP Alaska Logo placeholder */}
                <img
                  src="/Logo.png"
                  alt="SLP Alaska"
                  style={{height:'60px',objectFit:'contain'}}
                  onError={e => { e.target.style.display='none' }}
                />
              </div>

              {/* Right badges */}
              <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:'8px'}}>
                <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
                  {['OHST','CSHM'].map(b => (
                    <div key={b} style={{
                      width:'64px',height:'64px',borderRadius:'50%',
                      border:'3px solid #b71c1c',
                      display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
                      background:'#fff',
                    }}>
                      <div style={{fontSize:'7px',color:'#b71c1c',fontWeight:'700',letterSpacing:'0.05em',fontFamily:'Arial,sans-serif',textAlign:'center',lineHeight:1.2}}>BOARD OF<br/>CERTIFIED<br/>SAFETY</div>
                      <div style={{fontSize:'13px',fontWeight:'900',color:'#2d5a27',fontFamily:'Arial,sans-serif'}}>{b}</div>
                      <div style={{fontSize:'6px',color:'#b71c1c',fontWeight:'700',letterSpacing:'0.04em',fontFamily:'Arial,sans-serif'}}>PROFESSIONALS</div>
                    </div>
                  ))}
                </div>
                {/* OSHA Compliant */}
                <div style={{
                  border:'2px solid #003087',padding:'4px 8px',
                  display:'flex',flexDirection:'column',alignItems:'center',
                  background:'#fff',
                }}>
                  <div style={{fontSize:'16px',fontWeight:'900',color:'#003087',fontFamily:'Arial,sans-serif',letterSpacing:'-0.02em'}}>OSHA</div>
                  <div style={{fontSize:'8px',fontWeight:'700',color:'#003087',fontFamily:'Arial,sans-serif',letterSpacing:'0.06em'}}>COMPLIANT</div>
                </div>
              </div>
            </div>

            {/* Certificate number */}
            <div style={{marginTop:'16px',fontSize:'11px',color:'#aaa',fontFamily:'Arial,sans-serif',letterSpacing:'0.08em'}}>
              Certificate No: {cert.cert_number} &nbsp;&bull;&nbsp; Verify at portal.slpalaska.com/lms/certificate/{cert.cert_number}
            </div>

          </div>
        </div>
      </div>
    </>
  )
}

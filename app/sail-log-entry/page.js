'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://iypezirwdlqpptjpeeyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
)

const COMPANIES = ['A-C Electric','AKE-Line','Apache Corp.','Armstrong Oil & Gas','ASRC Energy Services','CCI- Industrial','Chosen Construction','CINGSA','Coho Enterprises','Conam Construction','ConocoPhillips','Five Star Oilfield Services','Fox Energy Services','G.A. West','GBR Equipment','GLM Energy Services','Graham Industrial Coatings','Harvest Midstream','Hilcorp Alaska','MagTec Alaska','Merkes Builders','Nordic-Calista','Parker TRS','Peninsula Paving','Pollard Wireline','Ridgeline Oilfield Services','Santos','Summit Excavation','Tesoro Refinery','Yellowjacket','Other']

const LOCATIONS = ['Kenai','CIO','Beaver Creek','Swanson River','Ninilchik','Nikiski','Other Kenai Asset','Deadhorse','Prudhoe Bay','Kuparuk','Alpine','Willow','ENI','PIKKA','Point Thompson','North Star Island','Endicott','Badami','Other North Slope']

const PRIORITIES = ['A - Critical', 'B - Moderate', 'C - Best Practice']

const STATUSES = ['Open', 'In Progress', 'Closed']

export default function SAILLogEntry() {
  const [formData, setFormData] = useState({
    submitter_name: '',
    date: '',
    client_company: '',
    location: '',
    action_item_description: '',
    immediate_action: '',
    assigned_to: '',
    target_completion_date: '',
    priority: '',
    status: '',
    closure_date: ''
  })
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState(null)

  useEffect(() => {
    const now = new Date()
    const alaskaTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Anchorage' }))
    const year = alaskaTime.getFullYear()
    const month = String(alaskaTime.getMonth() + 1).padStart(2, '0')
    const day = String(alaskaTime.getDate()).padStart(2, '0')
    setFormData(prev => ({ ...prev, date: `${year}-${month}-${day}` }))
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setPhoto(file)
      setPhotoPreview(file.name)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus(null)

    try {
      let photoUrl = null

      if (photo) {
        const fileExt = photo.name.split('.').pop()
        const fileName = `sail-log-photos/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('safety-photos')
          .upload(fileName, photo)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('safety-photos')
          .getPublicUrl(fileName)

        photoUrl = publicUrl
      }

      const submitData = {
        ...formData,
        date: formData.date || null,
        target_completion_date: formData.target_completion_date || null,
        closure_date: formData.closure_date || null,
        immediate_action: formData.immediate_action || null,
        photo_url: photoUrl,
        created_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('sail_log')
        .insert([submitData])

      if (error) throw error

      setSubmitStatus('success')
      setFormData({
        submitter_name: '',
        date: new Date().toISOString().split('T')[0],
        client_company: '',
        location: '',
        action_item_description: '',
        immediate_action: '',
        assigned_to: '',
        target_completion_date: '',
        priority: '',
        status: '',
        closure_date: ''
      })
      setPhoto(null)
      setPhotoPreview('')

    } catch (error) {
      console.error('Error submitting form:', error)
      setSubmitStatus('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setSubmitStatus(null)
    window.scrollTo(0, 0)
  }

  if (submitStatus === 'success') {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1e3a8a 0%, #b91c1c 100%)', padding: '20px' }}>
        <div style={{ maxWidth: '850px', margin: '0 auto', background: 'white', borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
          <div style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', color: 'white', padding: '40px', textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: '15px' }}>✅</div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Action Item Submitted Successfully!</h2>
            <p>Your SAIL Log entry has been recorded.</p>
            <button
              onClick={resetForm}
              style={{ marginTop: '20px', padding: '12px 24px', background: 'white', color: '#059669', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: '600', cursor: 'pointer' }}
            >
              Submit Another Entry
            </button>
          </div>
        </div>
      </div>
    )
  }

  const inputStyle = { width: '100%', padding: '12px 14px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '1rem', background: 'white' }
  const labelStyle = { display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151', fontSize: '0.9rem' }
  const sectionStyle = { marginBottom: '30px', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }
  const sectionBodyStyle = { padding: '20px', background: '#f8fafc' }
  const formRowStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '20px' }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1e3a8a 0%, #b91c1c 100%)', padding: '20px', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      <div style={{ maxWidth: '850px', margin: '0 auto', background: 'white', borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
        
        {/* Header */}
<div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #b91c1c 100%)', color: 'white', padding: '30px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <a href="/" style={{ display: 'inline-block', marginBottom: '20px', color: 'white', textDecoration: 'none', fontSize: '0.95rem' }}>
            ← Back to Portal
          </a>
          <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: '12px', padding: '15px', display: 'inline-block', margin: '0 auto 20px auto', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
            <img src="/Logo.png" alt="SLP Alaska" style={{ maxWidth: '200px', height: 'auto', display: 'block', margin: '0 auto' }} />
          </div>
          <div style={{ display: 'inline-block', background: 'white', color: '#1e3a8a', padding: '6px 16px', borderRadius: '20px', fontWeight: '700', fontSize: '0.85rem', marginBottom: '15px', border: '3px solid #f59e0b', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
            ⚓ SAIL LOG
          </div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '8px', textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>Safety Action Item List</h1>
          <p style={{ opacity: 0.95, fontSize: '1rem' }}>SLP Alaska Safety Management System</p>
        </div>

        {/* Form Content */}
        <div style={{ padding: '30px' }}>
          <form onSubmit={handleSubmit}>

            {/* Basic Information */}
            <div style={sectionStyle}>
              <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)', color: 'white', padding: '12px 20px', fontWeight: '600', fontSize: '1rem' }}>
                📋 Basic Information
              </div>
              <div style={sectionBodyStyle}>
                <div style={formRowStyle}>
                  <div>
                    <label style={labelStyle}>Name of Submitter <span style={{ color: '#b91c1c' }}>*</span></label>
                    <input type="text" name="submitter_name" value={formData.submitter_name} onChange={handleChange} required style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Date <span style={{ color: '#b91c1c' }}>*</span></label>
                    <input type="date" name="date" value={formData.date} onChange={handleChange} required style={inputStyle} />
                  </div>
                </div>
                <div style={{ ...formRowStyle, marginBottom: 0 }}>
                  <div>
                    <label style={labelStyle}>Client/Company <span style={{ color: '#b91c1c' }}>*</span></label>
                    <select name="client_company" value={formData.client_company} onChange={handleChange} required style={inputStyle}>
                      <option value="">Select Company...</option>
                      {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Location <span style={{ color: '#b91c1c' }}>*</span></label>
                    <select name="location" value={formData.location} onChange={handleChange} required style={inputStyle}>
                      <option value="">Select Location...</option>
                      {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Item Details */}
            <div style={sectionStyle}>
              <div style={{ background: 'linear-gradient(135deg, #b91c1c 0%, #dc2626 100%)', color: 'white', padding: '12px 20px', fontWeight: '600', fontSize: '1rem' }}>
                🎯 Action Item Details
              </div>
              <div style={sectionBodyStyle}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={labelStyle}>Action Item Description & Purpose <span style={{ color: '#b91c1c' }}>*</span></label>
                  <textarea name="action_item_description" value={formData.action_item_description} onChange={handleChange} required placeholder="Describe the action item, what needs to be done, and why..." style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }} />
                </div>
                <div style={{ marginBottom: 0 }}>
                  <label style={labelStyle}>Immediate Action Taken</label>
                  <textarea name="immediate_action" value={formData.immediate_action} onChange={handleChange} placeholder="Describe any immediate actions already taken..." style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }} />
                </div>
              </div>
            </div>

            {/* Assignment & Priority */}
            <div style={sectionStyle}>
              <div style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: 'white', padding: '12px 20px', fontWeight: '600', fontSize: '1rem' }}>
                👤 Assignment & Priority
              </div>
              <div style={sectionBodyStyle}>
                <div style={formRowStyle}>
                  <div>
                    <label style={labelStyle}>Action Assigned To <span style={{ color: '#b91c1c' }}>*</span></label>
                    <input type="text" name="assigned_to" value={formData.assigned_to} onChange={handleChange} required placeholder="Name of person responsible" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Target Completion Date <span style={{ color: '#b91c1c' }}>*</span></label>
                    <input type="date" name="target_completion_date" value={formData.target_completion_date} onChange={handleChange} required style={inputStyle} />
                  </div>
                </div>
                <div style={formRowStyle}>
                  <div>
                    <label style={labelStyle}>Priority <span style={{ color: '#b91c1c' }}>*</span></label>
                    <select name="priority" value={formData.priority} onChange={handleChange} required style={{ ...inputStyle, fontWeight: '600' }}>
                      <option value="">Select Priority...</option>
                      {PRIORITIES.map(p => (
                        <option key={p} value={p} style={{ 
                          color: p.includes('Critical') ? '#dc2626' : p.includes('Moderate') ? '#f59e0b' : '#22c55e',
                          fontWeight: p.includes('Critical') ? 'bold' : 'normal'
                        }}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Status <span style={{ color: '#b91c1c' }}>*</span></label>
                    <select name="status" value={formData.status} onChange={handleChange} required style={inputStyle}>
                      <option value="">Select Status...</option>
                      {STATUSES.map(s => (
                        <option key={s} value={s} style={{ 
                          color: s === 'Open' ? '#dc2626' : s === 'In Progress' ? '#f59e0b' : '#22c55e'
                        }}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Priority Legend */}
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginTop: '10px', padding: '10px', background: 'white', borderRadius: '8px', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#dc2626' }}></span>
                    A - Critical: Safety/Environmental/OSHA
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f59e0b' }}></span>
                    B - Moderate: Operational Impact
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#22c55e' }}></span>
                    C - Best Practice: Improvement
                  </div>
                </div>

                <div style={{ ...formRowStyle, marginTop: '20px', marginBottom: 0 }}>
                  <div>
                    <label style={labelStyle}>Closure Date (if closed)</label>
                    <input type="date" name="closure_date" value={formData.closure_date} onChange={handleChange} style={inputStyle} />
                  </div>
                </div>
              </div>
            </div>

            {/* Photo Documentation */}
            <div style={sectionStyle}>
              <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)', color: 'white', padding: '12px 20px', fontWeight: '600', fontSize: '1rem' }}>
                📸 Photo Documentation
              </div>
              <div style={sectionBodyStyle}>
                <label style={labelStyle}>Photo (Optional)</label>
                <div
                  onClick={() => document.getElementById('photo').click()}
                  style={{
                    border: photoPreview ? '2px dashed #059669' : '2px dashed #d1d5db',
                    borderRadius: '8px',
                    padding: '30px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: photoPreview ? 'rgba(5, 150, 105, 0.05)' : 'white'
                  }}
                >
                  <input type="file" id="photo" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
                  <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>📷</div>
                  <p style={{ color: '#6b7280' }}>Click to upload photo</p>
                  {photoPreview && <p style={{ marginTop: '10px', color: '#059669', fontWeight: '600' }}>{photoPreview}</p>}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '16px 32px',
                background: isSubmitting ? '#9ca3af' : 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '1.1rem',
                fontWeight: '600',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                boxShadow: isSubmitting ? 'none' : '0 4px 15px rgba(30, 58, 138, 0.3)'
              }}
            >
              {isSubmitting ? 'Submitting...' : 'Submit SAIL Log Entry'}
            </button>

            {submitStatus === 'error' && (
              <div style={{ marginTop: '20px', padding: '15px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', textAlign: 'center' }}>
                Error submitting form. Please try again.
              </div>
            )}

          </form>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '20px 10px', marginTop: '30px', borderTop: '1px solid #e2e8f0', fontSize: '11px', color: '#64748b', background: 'linear-gradient(to bottom, #f8fafc, #ffffff)' }}>
          <span style={{ color: '#1e3a5f', fontWeight: '500' }}>AnthroSafe™ Powered by Field Driven Data™</span>
          <span style={{ color: '#94a3b8', margin: '0 8px' }}>|</span>
          <span style={{ color: '#475569' }}>© 2025 SLP Alaska</span>
        </div>

      </div>
    </div>
  )
}

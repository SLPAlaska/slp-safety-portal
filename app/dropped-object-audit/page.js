'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const COMPANIES = ['A-C Electric', 'AKE-Line', 'Apache Corp.', 'Armstrong Oil & Gas', 'ASRC Energy Services', 'CCI- Industrial', 'Chosen Construction', 'CINGSA', 'Coho Enterprises', 'Conam Construction', 'ConocoPhillips', 'Five Star Oilfield Services', 'Fox Energy Services', 'G.A. West', 'GBR Equipment', 'GLM Energy Services', 'Graham Industrial Coatings', 'Harvest Midstream', 'Hilcorp Alaska', 'MagTec Alaska', 'Merkes Builders', 'Nordic-Calista', 'Parker TRS', 'Peninsula Paving', 'Pollard Wireline', 'Ridgeline Oilfield Services', 'Santos', 'Summit Excavation', 'Tesoro Refinery', 'Yellowjacket', 'Other']

const LOCATIONS = ['Kenai', 'CIO', 'Beaver Creek', 'Swanson River', 'Ninilchik', 'Nikiski', 'Other Kenai Asset', 'Deadhorse', 'Prudhoe Bay', 'Kuparuk', 'Alpine', 'Willow', 'ENI', 'PIKKA', 'Point Thompson', 'North Star Island', 'Endicott', 'Badami', 'Other North Slope']

export default function DroppedObjectAuditForm() {
  const [formData, setFormData] = useState({
    auditor_name: '',
    audit_date: new Date().toISOString().split('T')[0],
    company: '',
    location: '',
    specific_location: '',
    potential_dropped_object: '',
    corrective_action: '',
    further_assistance_needed: '',
    photo_url: ''
  })

  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [status, setStatus] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setPhotoFile(file)
      const reader = new FileReader()
      reader.onload = (e) => setPhotoPreview(e.target.result)
      reader.readAsDataURL(file)
    }
  }

  const uploadPhoto = async (file) => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `dropped-object-photos/${fileName}`

      const { data, error } = await supabase.storage
        .from('safety-photos')
        .upload(filePath, file)

      if (error) throw error

      const { data: urlData } = supabase.storage
        .from('safety-photos')
        .getPublicUrl(filePath)

      return urlData.publicUrl
    } catch (error) {
      console.error('Error uploading photo:', error)
      return null
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setStatus('Submitting...')

    try {
      let photoUrl = ''
      if (photoFile) {
        setStatus('Uploading photo...')
        photoUrl = await uploadPhoto(photoFile)
      }

      const dataToSubmit = {
        ...formData,
        photo_url: photoUrl || null
      }

      const { data, error } = await supabase
        .from('dropped_object_audits')
        .insert([dataToSubmit])

      if (error) throw error

      setStatus('✅ Audit submitted successfully!')
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (error) {
      console.error('Error:', error)
      setStatus('❌ Error submitting audit: ' + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', padding: '20px' }}>
      <style jsx>{`
        .container { max-width: 700px; margin: 0 auto; background: white; borderRadius: 12px; boxShadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden; }
        .header { background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); color: white; padding: 30px; textAlign: center; }
        .header h1 { margin: 0; fontSize: 24px; fontWeight: 700; }
        .header p { margin: 10px 0 0; opacity: 0.9; fontSize: 14px; }
        .drops-badge { display: inline-block; background: #f59e0b; color: #000; padding: 5px 15px; borderRadius: 20px; fontSize: 11px; fontWeight: 600; marginTop: 10px; }
        .info-box { background: #fef3c7; borderLeft: 4px solid #f59e0b; padding: 15px; marginBottom: 20px; borderRadius: 0 8px 8px 0; }
        .info-box h4 { margin: 0 0 8px; color: #92400e; }
        .info-box p { margin: 0; fontSize: 14px; color: #78350f; }
        .section-header { background: #1e3a8a; color: white; padding: 12px 20px; margin: 25px -30px 20px; fontWeight: 600; fontSize: 15px; }
        .section-header.orange { background: #ea580c; }
        .section-header.green { background: #059669; }
        .form-content { padding: 30px; }
        .form-group { marginBottom: 20px; }
        label { display: block; marginBottom: 6px; fontWeight: 500; }
        .required::after { content: " *"; color: #dc2626; }
        input, select, textarea { width: 100%; padding: 12px; border: 2px solid #d1d5db; borderRadius: 8px; fontSize: 16px; }
        input:focus, select:focus, textarea:focus { outline: none; borderColor: #1e3a8a; boxShadow: 0 0 0 3px rgba(30,58,138,0.1); }
        textarea { minHeight: 100px; resize: vertical; }
        .row { display: flex; gap: 20px; }
        .row .form-group { flex: 1; }
        .radio-group { display: flex; gap: 15px; flexWrap: wrap; }
        .radio-option { display: flex; alignItems: center; gap: 8px; padding: 12px 20px; border: 2px solid #d1d5db; borderRadius: 8px; cursor: pointer; flex: 1; minWidth: 120px; justifyContent: center; }
        .radio-option:hover { borderColor: #1e3a8a; }
        .radio-option.selected { borderColor: #1e3a8a; background: rgba(30,58,138,0.05); }
        .radio-option.yes.selected { borderColor: #dc2626; background: rgba(220,38,38,0.1); }
        .radio-option.no.selected { borderColor: #059669; background: rgba(5,150,105,0.1); }
        .photo-upload { border: 2px dashed #d1d5db; borderRadius: 8px; padding: 30px; textAlign: center; cursor: pointer; }
        .photo-upload:hover { borderColor: #1e3a8a; background: rgba(30,58,138,0.02); }
        .photo-upload.has-photo { borderStyle: solid; borderColor: #059669; }
        .photo-preview { maxWidth: 200px; maxHeight: 150px; marginTop: 10px; borderRadius: 4px; }
        .submit-btn { width: 100%; padding: 16px; background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); color: white; border: none; borderRadius: 8px; fontSize: 18px; fontWeight: 600; cursor: pointer; marginTop: 20px; }
        .submit-btn:disabled { background: #d1d5db; cursor: not-allowed; }
        @media (max-width: 768px) {
          .row { flexDirection: column; gap: 0; }
          .form-content { padding: 20px; }
          .section-header { marginLeft: -20px; marginRight: -20px; }
        }
      `}</style>

      <div className="container">
        <div className="header">
          <h1>Dropped Object Prevention Audit</h1>
          <p>Identify and Document Potential Drop Hazards</p>
          <div className="drops-badge">⚠️ DROPS Prevention Program</div>
        </div>

        <div className="form-content">
          <div className="info-box">
            <h4>🎯 DROPS Awareness</h4>
            <p>Dropped objects are a leading cause of injuries and fatalities in the oil and gas industry. This audit helps identify potential hazards before they cause harm. Document any item that could fall from height and cause injury or damage.</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="section-header">📋 Audit Information</div>

            <div className="row">
              <div className="form-group">
                <label className="required">Name of Auditor</label>
                <input type="text" name="auditor_name" value={formData.auditor_name} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="required">Date</label>
                <input type="date" name="audit_date" value={formData.audit_date} onChange={handleChange} required />
              </div>
            </div>

            <div className="row">
              <div className="form-group">
                <label className="required">Company</label>
                <select name="company" value={formData.company} onChange={handleChange} required>
                  <option value="">-- Select Company --</option>
                  {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="required">Location</label>
                <select name="location" value={formData.location} onChange={handleChange} required>
                  <option value="">-- Select Location --</option>
                  {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="required">Specific Location</label>
              <input type="text" name="specific_location" value={formData.specific_location} onChange={handleChange} placeholder="e.g., Module A, Platform Level 3, Pipe Rack Section 5" required />
            </div>

            <div className="section-header orange">⚠️ Dropped Object Hazard</div>

            <div className="form-group">
              <label className="required">Potential Dropped Object Identified</label>
              <textarea name="potential_dropped_object" value={formData.potential_dropped_object} onChange={handleChange} placeholder="Describe the potential dropped object hazard in detail:
• What is the item?
• Where is it located (height, position)?
• What is the potential for it to fall?
• What could be struck if it fell?" required />
            </div>

            <div className="section-header green">✅ Corrective Action</div>

            <div className="form-group">
              <label className="required">Corrective Action Taken</label>
              <textarea name="corrective_action" value={formData.corrective_action} onChange={handleChange} placeholder="Describe the corrective action taken:
• Was the item secured, removed, or barricaded?
• What tools/methods were used?
• Who was involved in the correction?
• Any temporary vs. permanent fixes?" required />
            </div>

            <div className="form-group">
              <label className="required">Is Further Assistance Needed?</label>
              <div className="radio-group">
                {['Yes', 'No', 'N/A'].map(option => (
                  <label key={option} className={`radio-option ${option.toLowerCase()} ${formData.further_assistance_needed === option ? 'selected' : ''}`}>
                    <input type="radio" name="further_assistance_needed" value={option} checked={formData.further_assistance_needed === option} onChange={handleChange} required />
                    <span>{option === 'Yes' ? 'Yes - Needs Follow-up' : option === 'No' ? 'No - Resolved' : 'N/A'}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="section-header">📷 Photo Documentation</div>

            <div className="form-group">
              <label>Photo Evidence (Recommended)</label>
              <div className={`photo-upload ${photoPreview ? 'has-photo' : ''}`} onClick={() => document.getElementById('photoInput').click()}>
                <input type="file" id="photoInput" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
                {!photoPreview && <p>📷 Tap to take or upload photo</p>}
                {!photoPreview && <p style={{ fontSize: '12px', color: '#6b7280' }}>Photo documentation helps track hazards and verify corrections</p>}
                {photoPreview && <img src={photoPreview} className="photo-preview" alt="Preview" />}
              </div>
            </div>

            <button type="submit" className="submit-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Dropped Object Audit'}
            </button>

            {status && (
              <div style={{ marginTop: '15px', padding: '12px', background: status.includes('✅') ? '#d1fae5' : '#fee2e2', color: status.includes('✅') ? '#065f46' : '#991b1b', borderRadius: '6px', textAlign: 'center' }}>
                {status}
              </div>
            )}
          </form>
        </div>
      </div>

      <div style={{ textAlign: 'center', padding: '20px 10px', marginTop: '30px', borderTop: '1px solid #e2e8f0', fontSize: '11px', color: '#64748b' }}>
        <span style={{ color: '#1e3a5f', fontWeight: 500 }}>Powered by Predictive Safety Analytics™</span>
        <span style={{ color: '#94a3b8', margin: '0 8px' }}>|</span>
        <span style={{ color: '#475569' }}>© 2025 SLP Alaska</span>
      </div>
    </div>
  )
}

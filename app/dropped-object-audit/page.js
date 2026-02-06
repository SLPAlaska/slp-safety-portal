'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://iypezirwdlqpptjpeeyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
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

      const { error } = await supabase.storage.from('safety-photos').upload(filePath, file)
      if (error) throw error

      const { data: urlData } = supabase.storage.from('safety-photos').getPublicUrl(filePath)
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

      const { error } = await supabase.from('dropped_object_audits').insert([dataToSubmit])
      if (error) throw error

      setStatus('✅ Audit submitted successfully!')
      setTimeout(() => window.location.reload(), 2000)
    } catch (error) {
      console.error('Error:', error)
      setStatus('❌ Error submitting audit: ' + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const styles = {
    container: { maxWidth: '700px', margin: '0 auto', background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', overflow: 'hidden' },
    header: { background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)', color: 'white', padding: '30px', textAlign: 'center' },
    formContent: { padding: '30px' },
    sectionHeader: { background: '#1e3a8a', color: 'white', padding: '12px 20px', margin: '25px -30px 20px', fontWeight: 600, fontSize: '15px' },
    infoBox: { background: '#fef3c7', borderLeft: '4px solid #f59e0b', padding: '15px', marginBottom: '20px', borderRadius: '0 8px 8px 0' },
    row: { display: 'flex', gap: '20px', flexWrap: 'wrap' },
    formGroup: { flex: '1', minWidth: '200px', marginBottom: '20px' },
    label: { display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' },
    input: { width: '100%', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box' },
    select: { width: '100%', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box' },
    textarea: { width: '100%', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px', minHeight: '100px', resize: 'vertical', boxSizing: 'border-box' },
    radioGroup: { display: 'flex', gap: '15px', flexWrap: 'wrap' },
    radioOption: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', border: '2px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', flex: '1', minWidth: '120px', justifyContent: 'center' },
    photoUpload: { border: '2px dashed #d1d5db', borderRadius: '8px', padding: '30px', textAlign: 'center', cursor: 'pointer' },
    submitBtn: { width: '100%', padding: '16px', background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '18px', fontWeight: 600, cursor: 'pointer', marginTop: '20px' },
    footer: { textAlign: 'center', padding: '20px 10px', marginTop: '30px', fontSize: '11px', color: '#64748b' }
  }

  return (
    <div style={{ padding: '20px', backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
      <a href="/" style={{ display: 'inline-block', marginBottom: '15px', padding: '10px 20px', backgroundColor: '#1e3a5f', color: '#fff', textDecoration: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '500' }}>← Back to Portal</a>
      
      <div style={styles.container}>
        <div style={styles.header}>
          <img src="/Logo.png" alt="SLP Alaska Logo" style={{ maxWidth: '180px', height: 'auto', marginBottom: '15px', display: 'block', margin: '0 auto 15px auto' }} />
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>Dropped Object Prevention Audit</h1>
          <p style={{ margin: '10px 0 0', opacity: 0.9, fontSize: '14px' }}>Identify and Document Potential Drop Hazards</p>
          <div style={{ display: 'inline-block', background: '#f59e0b', color: '#000', padding: '5px 15px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, marginTop: '10px' }}>⚠️ DROPS Prevention Program</div>
        </div>

        <div style={styles.formContent}>
          <div style={styles.infoBox}>
            <h4 style={{ margin: '0 0 8px', color: '#92400e' }}>🎯 DROPS Awareness</h4>
            <p style={{ margin: 0, fontSize: '14px', color: '#78350f' }}>Dropped objects are a leading cause of injuries and fatalities in the oil and gas industry. This audit helps identify potential hazards before they cause harm. Document any item that could fall from height and cause injury or damage.</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ ...styles.sectionHeader, marginTop: 0 }}>📋 Audit Information</div>

            <div style={styles.row}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Name of Auditor <span style={{ color: '#dc2626' }}>*</span></label>
                <input type="text" name="auditor_name" value={formData.auditor_name} onChange={handleChange} required style={styles.input} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Date <span style={{ color: '#dc2626' }}>*</span></label>
                <input type="date" name="audit_date" value={formData.audit_date} onChange={handleChange} required style={styles.input} />
              </div>
            </div>

            <div style={styles.row}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Company <span style={{ color: '#dc2626' }}>*</span></label>
                <select name="company" value={formData.company} onChange={handleChange} required style={styles.select}>
                  <option value="">-- Select Company --</option>
                  {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Location <span style={{ color: '#dc2626' }}>*</span></label>
                <select name="location" value={formData.location} onChange={handleChange} required style={styles.select}>
                  <option value="">-- Select Location --</option>
                  {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Specific Location <span style={{ color: '#dc2626' }}>*</span></label>
              <input type="text" name="specific_location" value={formData.specific_location} onChange={handleChange} placeholder="e.g., Module A, Platform Level 3, Pipe Rack Section 5" required style={styles.input} />
            </div>

            <div style={{ ...styles.sectionHeader, background: '#ea580c' }}>⚠️ Dropped Object Hazard</div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Potential Dropped Object Identified <span style={{ color: '#dc2626' }}>*</span></label>
              <textarea name="potential_dropped_object" value={formData.potential_dropped_object} onChange={handleChange} placeholder="Describe the potential dropped object hazard in detail:
• What is the item?
• Where is it located (height, position)?
• What is the potential for it to fall?
• What could be struck if it fell?" required style={styles.textarea} />
            </div>

            <div style={{ ...styles.sectionHeader, background: '#059669' }}>✅ Corrective Action</div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Corrective Action Taken <span style={{ color: '#dc2626' }}>*</span></label>
              <textarea name="corrective_action" value={formData.corrective_action} onChange={handleChange} placeholder="Describe the corrective action taken:
• Was the item secured, removed, or barricaded?
• What tools/methods were used?
• Who was involved in the correction?
• Any temporary vs. permanent fixes?" required style={styles.textarea} />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Is Further Assistance Needed? <span style={{ color: '#dc2626' }}>*</span></label>
              <div style={styles.radioGroup}>
                {[{ v: 'Yes', l: 'Yes - Needs Follow-up' }, { v: 'No', l: 'No - Resolved' }, { v: 'N/A', l: 'N/A' }].map(({ v, l }) => (
                  <label key={v} style={{ ...styles.radioOption, borderColor: formData.further_assistance_needed === v ? (v === 'Yes' ? '#dc2626' : v === 'No' ? '#059669' : '#1e3a8a') : '#d1d5db', background: formData.further_assistance_needed === v ? (v === 'Yes' ? 'rgba(220,38,38,0.1)' : v === 'No' ? 'rgba(5,150,105,0.1)' : 'rgba(30,58,138,0.05)') : '#fff' }}>
                    <input type="radio" name="further_assistance_needed" value={v} checked={formData.further_assistance_needed === v} onChange={handleChange} required />
                    <span>{l}</span>
                  </label>
                ))}
              </div>
            </div>

            <div style={styles.sectionHeader}>📷 Photo Documentation</div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Photo Evidence (Recommended)</label>
              <div style={{ ...styles.photoUpload, borderColor: photoPreview ? '#059669' : '#d1d5db', borderStyle: photoPreview ? 'solid' : 'dashed' }} onClick={() => document.getElementById('photoInput').click()}>
                <input type="file" id="photoInput" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
                {!photoPreview && <><p>📷 Tap to take or upload photo</p><p style={{ fontSize: '12px', color: '#6b7280' }}>Photo documentation helps track hazards and verify corrections</p></>}
                {photoPreview && <img src={photoPreview} style={{ maxWidth: '200px', maxHeight: '150px', marginTop: '10px', borderRadius: '4px' }} alt="Preview" />}
              </div>
            </div>

            <button type="submit" style={{ ...styles.submitBtn, background: isSubmitting ? '#d1d5db' : 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)', cursor: isSubmitting ? 'not-allowed' : 'pointer' }} disabled={isSubmitting}>
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

      <div style={styles.footer}>
        <span style={{ color: '#1e3a5f', fontWeight: 500 }}>AnthroSafe™ Powered by Field Driven Data™</span>
        <span style={{ color: '#94a3b8', margin: '0 8px' }}>|</span>
        <span style={{ color: '#475569' }}>© 2025 SLP Alaska</span>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://iypezirwdlqpptjpeeyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
)

const COMPANIES = ['A-C Electric', 'AKE-Line', 'Apache Corp.', 'Armstrong Oil & Gas', 'ASRC Energy Services', 'CCI- Industrial', 'Chosen Construction', 'CINGSA', 'Coho Enterprises', 'Conam Construction', 'ConocoPhillips', 'Five Star Oilfield Services', 'Fox Energy Services', 'G.A. West', 'GBR Equipment', 'GLM Energy Services', 'Graham Industrial Coatings', 'Harvest Midstream', 'Hilcorp Alaska', 'MagTec Alaska', 'Merkes Builders', 'Nordic-Calista', 'Parker TRS', 'Peninsula Paving', 'Pollard Wireline', 'Ridgeline Oilfield Services', 'Santos', 'Summit Excavation', 'Tesoro Refinery', 'Yellowjacket', 'Other']

const LOCATIONS = ['Kenai', 'CIO', 'Beaver Creek', 'Swanson River', 'Ninilchik', 'Nikiski', 'Other Kenai Asset', 'Deadhorse', 'Prudhoe Bay', 'Kuparuk', 'Alpine', 'Willow', 'ENI', 'PIKKA', 'Point Thompson', 'North Star Island', 'Endicott', 'Badami', 'Other North Slope']

export default function EHSFieldEvaluationForm() {
  const [formData, setFormData] = useState({
    auditor_name: '',
    audit_date: new Date().toISOString().split('T')[0],
    company: '',
    location: '',
    specific_location: '',
    description_of_work: '',
    findings: '',
    understanding_hazards: '',
    following_work_permit: '',
    communication_sim_ops: '',
    knowledge_eap: '',
    appropriate_ppe: '',
    positioning_equipment: '',
    gas_venting: '',
    bonding_grounding: '',
    ppe_certifications: '',
    atmospheric_monitors: '',
    well_entry_guidelines: '',
    pressure_tests: '',
    action_items: '',
    responsible_party: '',
    sail_log: ''
  })

  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [status, setStatus] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
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
      const filePath = `ehs-photos/${fileName}`
      const { error } = await supabase.storage.from('safety-photos').upload(filePath, file)
      if (error) throw error
      const { data: urlData } = supabase.storage.from('safety-photos').getPublicUrl(filePath)
      return urlData.publicUrl
    } catch (error) {
      console.error('Photo upload error:', error)
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

      const { error } = await supabase.from('ehs_field_evaluations').insert([dataToSubmit])
      if (error) throw error

      setStatus('✅ EHS Field Evaluation submitted successfully!')
      setTimeout(() => window.location.reload(), 2000)
    } catch (error) {
      console.error('Error:', error)
      setStatus('❌ Error: ' + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const RatingTable = () => {
    const ratings = [
      { name: 'understanding_hazards', label: 'Understanding of Hazards and Mitigations' },
      { name: 'following_work_permit', label: 'Following Work Permit Requirements' },
      { name: 'communication_sim_ops', label: 'Communication of Simultaneous Operations' },
      { name: 'knowledge_eap', label: 'Knowledge of Emergency Action Plans' },
      { name: 'appropriate_ppe', label: 'Appropriate Use of Adequate PPE' },
      { name: 'positioning_equipment', label: 'Appropriate Positioning of Equipment' },
      { name: 'gas_venting', label: 'Appropriate Gas Venting Operations' },
      { name: 'bonding_grounding', label: 'Adequate Bonding/Grounding' }
    ]

    return (
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
        <thead>
          <tr style={{ background: '#f3f4f6', borderBottom: '2px solid #d1d5db' }}>
            <th style={{ textAlign: 'left', padding: '10px', fontSize: '12px', width: '40%' }}>Performance Category</th>
            <th style={{ textAlign: 'center', padding: '10px 5px', fontSize: '12px', color: '#059669' }}>Excellent</th>
            <th style={{ textAlign: 'center', padding: '10px 5px', fontSize: '12px', color: '#65a30d' }}>Good</th>
            <th style={{ textAlign: 'center', padding: '10px 5px', fontSize: '12px', color: '#f59e0b' }}>OK</th>
            <th style={{ textAlign: 'center', padding: '10px 5px', fontSize: '12px', color: '#f97316' }}>Needs Improvement</th>
            <th style={{ textAlign: 'center', padding: '10px 5px', fontSize: '12px', color: '#dc2626' }}>Poor</th>
          </tr>
        </thead>
        <tbody>
          {ratings.map((rating, idx) => (
            <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
              <td style={{ padding: '12px 10px', fontSize: '14px' }}>{rating.label}</td>
              {['Excellent', 'Good', 'OK', 'Needs Improvement', 'Poor'].map(value => (
                <td key={value} style={{ textAlign: 'center', padding: '12px 5px' }}>
                  <input type="radio" name={rating.name} value={value} checked={formData[rating.name] === value} onChange={handleChange} required style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  return (
    <div style={{ padding: '20px', backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
      <a href="/" style={{ display: 'inline-block', marginBottom: '15px', padding: '10px 20px', backgroundColor: '#1e3a5f', color: '#fff', textDecoration: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '500' }}>← Back to Portal</a>
      <div style={{ maxWidth: '900px', margin: '0 auto', background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        
        <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)', color: 'white', padding: '30px', textAlign: 'center' }}>
          <img src="/Logo.png" alt="SLP Alaska Logo" style={{ maxWidth: '180px', height: 'auto', marginBottom: '15px', display: 'block', margin: '0 auto 15px auto' }} />
          <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 700 }}>EHS Field Evaluation</h1>
          <p style={{ margin: '10px 0 0', opacity: 0.9, fontSize: '14px' }}>Environment, Health & Safety Field Assessment</p>
          <div style={{ display: 'inline-block', background: '#059669', padding: '5px 15px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, marginTop: '10px' }}>🛡️ Safety Performance Evaluation</div>
        </div>

        <div style={{ padding: '30px' }}>
          <form onSubmit={handleSubmit}>
            
            <div style={{ background: '#1e3a8a', color: 'white', padding: '12px 20px', margin: '0 -30px 20px', fontWeight: 600, fontSize: '15px' }}>📋 Evaluation Information</div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>Name of Auditor *</label>
                <input type="text" name="auditor_name" value={formData.auditor_name} onChange={handleChange} required style={{ width: '100%', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>Date *</label>
                <input type="date" name="audit_date" value={formData.audit_date} onChange={handleChange} required style={{ width: '100%', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>Company *</label>
                <select name="company" value={formData.company} onChange={handleChange} required style={{ width: '100%', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box' }}>
                  <option value="">-- Select Company --</option>
                  {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>Location *</label>
                <select name="location" value={formData.location} onChange={handleChange} required style={{ width: '100%', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box' }}>
                  <option value="">-- Select Location --</option>
                  {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>Specific Location</label>
              <input type="text" name="specific_location" value={formData.specific_location} onChange={handleChange} placeholder="e.g., Well Pad A, Module 3" style={{ width: '100%', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>Description of Work Being Performed *</label>
              <textarea name="description_of_work" value={formData.description_of_work} onChange={handleChange} required placeholder="Describe the work activities being evaluated..." style={{ width: '100%', minHeight: '100px', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: '25px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>General Findings/Observations</label>
              <textarea name="findings" value={formData.findings} onChange={handleChange} placeholder="Document your overall observations during the evaluation..." style={{ width: '100%', minHeight: '100px', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>

            <div style={{ background: '#059669', color: 'white', padding: '12px 20px', margin: '25px -30px 20px', fontWeight: 600, fontSize: '15px' }}>⭐ Performance Ratings</div>
            
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '15px' }}>Rate each category based on observed performance during the evaluation.</p>
            
            <RatingTable />

            <div style={{ background: '#ea580c', color: 'white', padding: '12px 20px', margin: '25px -30px 20px', fontWeight: 600, fontSize: '15px' }}>✅ Compliance Checks</div>
            
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
              <thead>
                <tr style={{ background: '#f3f4f6', borderBottom: '2px solid #d1d5db' }}>
                  <th style={{ textAlign: 'left', padding: '10px', fontSize: '13px', width: '50%' }}>Compliance Item</th>
                  <th style={{ textAlign: 'left', padding: '10px', fontSize: '13px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 10px', fontSize: '14px' }}>PPE Certifications Current</td>
                  <td style={{ padding: '12px 10px' }}>
                    <select name="ppe_certifications" value={formData.ppe_certifications} onChange={handleChange} required style={{ width: '100%', maxWidth: '250px', padding: '10px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}>
                      <option value="">-- Select --</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                      <option value="N/A">N/A</option>
                    </select>
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 10px', fontSize: '14px' }}>Atmospheric Monitors Calibrated & Bump Tested</td>
                  <td style={{ padding: '12px 10px' }}>
                    <select name="atmospheric_monitors" value={formData.atmospheric_monitors} onChange={handleChange} required style={{ width: '100%', maxWidth: '250px', padding: '10px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}>
                      <option value="">-- Select --</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                      <option value="Not needed for operation">Not needed for operation</option>
                      <option value="Needs Improvement">Needs Improvement</option>
                    </select>
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 10px', fontSize: '14px' }}>Well Entry Guidelines Available & Followed</td>
                  <td style={{ padding: '12px 10px' }}>
                    <select name="well_entry_guidelines" value={formData.well_entry_guidelines} onChange={handleChange} required style={{ width: '100%', maxWidth: '250px', padding: '10px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}>
                      <option value="">-- Select --</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                      <option value="N/A">N/A</option>
                      <option value="Needs Improvement">Needs Improvement</option>
                    </select>
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '12px 10px', fontSize: '14px' }}>Hi/Low Pressure Tests Completed</td>
                  <td style={{ padding: '12px 10px' }}>
                    <select name="pressure_tests" value={formData.pressure_tests} onChange={handleChange} required style={{ width: '100%', maxWidth: '250px', padding: '10px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}>
                      <option value="">-- Select --</option>
                      <option value="Yes- Parameters Documented">Yes - Parameters Documented</option>
                      <option value="No- Parameters Not Documented">No - Parameters Not Documented</option>
                      <option value="N/A">N/A</option>
                      <option value="Needs Improvement">Needs Improvement</option>
                    </select>
                  </td>
                </tr>
              </tbody>
            </table>

            <div style={{ background: '#f59e0b', color: '#000', padding: '12px 20px', margin: '25px -30px 20px', fontWeight: 600, fontSize: '15px' }}>📝 Action Items</div>
            
            <div style={{ background: '#fef3c7', border: '2px solid #f59e0b', borderRadius: '8px', padding: '20px', margin: '20px 0' }}>
              <h4 style={{ margin: '0 0 15px', color: '#92400e', display: 'flex', alignItems: 'center', gap: '8px' }}>⚠️ Follow-Up Required</h4>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>Action Items Needing Follow Up</label>
                <textarea name="action_items" value={formData.action_items} onChange={handleChange} placeholder="List any action items identified during the evaluation that require follow-up..." style={{ width: '100%', minHeight: '80px', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>Responsible Party & Due Date</label>
                <input type="text" name="responsible_party" value={formData.responsible_party} onChange={handleChange} placeholder="e.g., John Smith - 12/15/2024" style={{ width: '100%', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '10px', fontWeight: 500, fontSize: '14px' }}>Actions Added to SAIL Log? *</label>
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                  {[{ v: 'Yes', l: 'Yes - Added to SAIL' }, { v: 'No', l: 'No - Not Added' }, { v: 'N/A', l: 'N/A - No Actions' }].map(({ v, l }) => (
                    <label key={v} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 15px', border: '2px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>
                      <input type="radio" name="sail_log" value={v} checked={formData.sail_log === v} onChange={handleChange} required />
                      <span>{l}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ background: '#1e3a8a', color: 'white', padding: '12px 20px', margin: '25px -30px 20px', fontWeight: 600, fontSize: '15px' }}>📷 Photo Documentation</div>
            
            <div style={{ marginBottom: '25px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>Photo (Optional)</label>
              <div onClick={() => document.getElementById('photoInput').click()} style={{ border: photoPreview ? '2px solid #059669' : '2px dashed #d1d5db', borderRadius: '8px', padding: '30px', textAlign: 'center', cursor: 'pointer' }}>
                <input type="file" id="photoInput" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
                {!photoPreview && <><p>📷 Tap to take or upload photo</p><p style={{ fontSize: '12px', color: '#6b7280' }}>Document observations or issues found</p></>}
                {photoPreview && <img src={photoPreview} alt="Preview" style={{ maxWidth: '200px', maxHeight: '150px', marginTop: '10px', borderRadius: '4px' }} />}
              </div>
            </div>

            <button type="submit" disabled={isSubmitting} style={{ width: '100%', padding: '16px', background: isSubmitting ? '#d1d5db' : 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '18px', fontWeight: 600, cursor: isSubmitting ? 'not-allowed' : 'pointer', marginTop: '20px' }}>
              {isSubmitting ? 'Submitting...' : 'Submit EHS Field Evaluation'}
            </button>

            {status && (
              <div style={{ marginTop: '15px', padding: '12px', background: status.includes('✅') ? '#d1fae5' : '#fee2e2', color: status.includes('✅') ? '#065f46' : '#991b1b', borderRadius: '6px', textAlign: 'center' }}>
                {status}
              </div>
            )}
          </form>
        </div>
      </div>

      <div style={{ textAlign: 'center', padding: '20px 10px', marginTop: '30px', fontSize: '11px', color: '#64748b' }}>
        <span style={{ color: '#1e3a5f', fontWeight: 500 }}>AnthroSafe™ Powered by Field Driven Data™</span>
        <span style={{ color: '#94a3b8', margin: '0 8px' }}>|</span>
        <span style={{ color: '#475569' }}>© 2025 SLP Alaska</span>
      </div>
    </div>
  )
}

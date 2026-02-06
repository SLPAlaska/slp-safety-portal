'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://iypezirwdlqpptjpeeyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
)

const COMPANIES = ['A-C Electric','AKE-Line','Apache Corp.','Armstrong Oil & Gas','ASRC Energy Services','CCI- Industrial','Chosen Construction','CINGSA','Coho Enterprises','Conam Construction','ConocoPhillips','Five Star Oilfield Services','Fox Energy Services','G.A. West','GBR Equipment','GLM Energy Services','Graham Industrial Coatings','Harvest Midstream','Hilcorp Alaska','MagTec Alaska','Merkes Builders','Nordic-Calista','Parker TRS','Peninsula Paving','Pollard Wireline','Ridgeline Oilfield Services','Santos','Summit Excavation','Tesoro Refinery','Yellowjacket','Other']

const LOCATIONS = ['Kenai','CIO','Beaver Creek','Swanson River','Ninilchik','Nikiski','Other Kenai Asset','Deadhorse','Prudhoe Bay','Kuparuk','Alpine','Willow','ENI','PIKKA','Point Thompson','North Star Island','Endicott','Badami','Other North Slope']

const YES_NO_OPTIONS = ['Yes', 'No', 'N/A', 'Needs Improvement']

export default function PressureCrosscheck() {
  const [formData, setFormData] = useState({
    auditor_name: '',
    date: '',
    client_company: '',
    unit_number: '',
    employees_on_location: '',
    specific_location: '',
    valves_checked: '',
    weakest_link: '',
    max_working_pressure: '',
    max_expected_pressure: '',
    overpressure_devices: '',
    opd_set_verified: '',
    rigged_up_per_procedure: '',
    job_procedure_reviewed: '',
    area_clear_buffer_zones: '',
    jsa_completed: '',
    systems_isolated: '',
    last_similar_job_date: '',
    lessons_learned: '',
    how_start_pump: '',
    what_if_pressure_wrong: '',
    how_opd_works: '',
    whip_checks_in_place: '',
    operator_name: '',
    recommended_improvements: ''
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
        const fileName = `pressure-crosscheck-photos/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('safety-photos')
          .upload(fileName, photo)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('safety-photos')
          .getPublicUrl(fileName)

        photoUrl = publicUrl
      }

      const { error } = await supabase
        .from('pressure_crosscheck')
        .insert([{
          ...formData,
          photo_url: photoUrl,
          created_at: new Date().toISOString()
        }])

      if (error) throw error

      setSubmitStatus('success')
      setFormData({
        auditor_name: '',
        date: new Date().toISOString().split('T')[0],
        client_company: '',
        unit_number: '',
        employees_on_location: '',
        specific_location: '',
        valves_checked: '',
        weakest_link: '',
        max_working_pressure: '',
        max_expected_pressure: '',
        overpressure_devices: '',
        opd_set_verified: '',
        rigged_up_per_procedure: '',
        job_procedure_reviewed: '',
        area_clear_buffer_zones: '',
        jsa_completed: '',
        systems_isolated: '',
        last_similar_job_date: '',
        lessons_learned: '',
        how_start_pump: '',
        what_if_pressure_wrong: '',
        how_opd_works: '',
        whip_checks_in_place: '',
        operator_name: '',
        recommended_improvements: ''
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
        <div style={{ maxWidth: '800px', margin: '0 auto', background: 'white', borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
          <div style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', color: 'white', padding: '40px', textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: '15px' }}>✅</div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Crosscheck Submitted Successfully!</h2>
            <p>Your pressure crosscheck has been recorded.</p>
            <button
              onClick={resetForm}
              style={{ marginTop: '20px', padding: '12px 24px', background: 'white', color: '#059669', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: '600', cursor: 'pointer' }}
            >
              Submit Another Crosscheck
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
      <div style={{ maxWidth: '800px', margin: '0 auto', background: 'white', borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
        
        {/* Header */}
<div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #b91c1c 100%)', color: 'white', padding: '30px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <a href="/" style={{ display: 'inline-block', marginBottom: '20px', color: 'white', textDecoration: 'none', fontSize: '0.95rem' }}>
            ← Back to Portal
          </a>
          <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: '12px', padding: '15px', display: 'inline-block', margin: '0 auto 20px auto', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
            <img src="/Logo.png" alt="SLP Alaska" style={{ maxWidth: '200px', height: 'auto', display: 'block', margin: '0 auto' }} />
          </div>
          <div style={{ display: 'inline-block', background: 'white', color: '#1e3a8a', padding: '6px 16px', borderRadius: '20px', fontWeight: '700', fontSize: '0.85rem', marginBottom: '15px', border: '3px solid #b91c1c', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
            PRESSURE CROSSCHECK
          </div>
          <h1 style={{ fontSize: '1.6rem', marginBottom: '8px', textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>Pressure Crosscheck Form</h1>
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
                    <label style={labelStyle}>Name of Auditor <span style={{ color: '#b91c1c' }}>*</span></label>
                    <input type="text" name="auditor_name" value={formData.auditor_name} onChange={handleChange} required style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Date <span style={{ color: '#b91c1c' }}>*</span></label>
                    <input type="date" name="date" value={formData.date} onChange={handleChange} required style={inputStyle} />
                  </div>
                </div>
                <div style={formRowStyle}>
                  <div>
                    <label style={labelStyle}>Client/Company <span style={{ color: '#b91c1c' }}>*</span></label>
                    <select name="client_company" value={formData.client_company} onChange={handleChange} required style={inputStyle}>
                      <option value="">Select Company...</option>
                      {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Specific Location <span style={{ color: '#b91c1c' }}>*</span></label>
                    <select name="specific_location" value={formData.specific_location} onChange={handleChange} required style={inputStyle}>
                      <option value="">Select Location...</option>
                      {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                </div>
                <div style={formRowStyle}>
                  <div>
                    <label style={labelStyle}>Unit # <span style={{ color: '#b91c1c' }}>*</span></label>
                    <input type="text" name="unit_number" value={formData.unit_number} onChange={handleChange} required style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Employees On Location <span style={{ color: '#b91c1c' }}>*</span></label>
                    <input type="number" name="employees_on_location" value={formData.employees_on_location} onChange={handleChange} required min="1" style={inputStyle} />
                  </div>
                </div>
              </div>
            </div>

            {/* Pressure System Information */}
            <div style={sectionStyle}>
              <div style={{ background: 'linear-gradient(135deg, #b91c1c 0%, #dc2626 100%)', color: 'white', padding: '12px 20px', fontWeight: '600', fontSize: '1rem' }}>
                ⚙️ Pressure System Information
              </div>
              <div style={sectionBodyStyle}>
                <div style={formRowStyle}>
                  <div>
                    <label style={labelStyle}>Have valves been visually checked? <span style={{ color: '#b91c1c' }}>*</span></label>
                    <select name="valves_checked" value={formData.valves_checked} onChange={handleChange} required style={inputStyle}>
                      <option value="">Select...</option>
                      {YES_NO_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>What is the weakest link in the system?</label>
                    <input type="text" name="weakest_link" value={formData.weakest_link} onChange={handleChange} style={inputStyle} />
                  </div>
                </div>
                <div style={formRowStyle}>
                  <div>
                    <label style={labelStyle}>Maximum Working Pressure (PSI) <span style={{ color: '#b91c1c' }}>*</span></label>
                    <input type="text" name="max_working_pressure" value={formData.max_working_pressure} onChange={handleChange} required style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Maximum Expected Pressure (PSI) <span style={{ color: '#b91c1c' }}>*</span></label>
                    <input type="text" name="max_expected_pressure" value={formData.max_expected_pressure} onChange={handleChange} required style={inputStyle} />
                  </div>
                </div>
                <div style={{ marginBottom: '0' }}>
                  <label style={labelStyle}>What overpressure devices are in place?</label>
                  <textarea name="overpressure_devices" value={formData.overpressure_devices} onChange={handleChange} placeholder="Describe overpressure protection devices..." style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} />
                </div>
              </div>
            </div>

            {/* Safety Verification */}
            <div style={sectionStyle}>
              <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)', color: 'white', padding: '12px 20px', fontWeight: '600', fontSize: '1rem' }}>
                ✅ Safety Verification
              </div>
              <div style={sectionBodyStyle}>
                <div style={formRowStyle}>
                  <div>
                    <label style={labelStyle}>OPD Set & Verified? <span style={{ color: '#b91c1c' }}>*</span></label>
                    <select name="opd_set_verified" value={formData.opd_set_verified} onChange={handleChange} required style={inputStyle}>
                      <option value="">Select...</option>
                      {YES_NO_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Rigged up per procedure? <span style={{ color: '#b91c1c' }}>*</span></label>
                    <select name="rigged_up_per_procedure" value={formData.rigged_up_per_procedure} onChange={handleChange} required style={inputStyle}>
                      <option value="">Select...</option>
                      {YES_NO_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                </div>
                <div style={formRowStyle}>
                  <div>
                    <label style={labelStyle}>Job procedure reviewed? <span style={{ color: '#b91c1c' }}>*</span></label>
                    <select name="job_procedure_reviewed" value={formData.job_procedure_reviewed} onChange={handleChange} required style={inputStyle}>
                      <option value="">Select...</option>
                      {YES_NO_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Area clear with buffer zones? <span style={{ color: '#b91c1c' }}>*</span></label>
                    <select name="area_clear_buffer_zones" value={formData.area_clear_buffer_zones} onChange={handleChange} required style={inputStyle}>
                      <option value="">Select...</option>
                      {YES_NO_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                </div>
                <div style={formRowStyle}>
                  <div>
                    <label style={labelStyle}>JSA Completed & Reviewed? <span style={{ color: '#b91c1c' }}>*</span></label>
                    <select name="jsa_completed" value={formData.jsa_completed} onChange={handleChange} required style={inputStyle}>
                      <option value="">Select...</option>
                      {YES_NO_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>All systems isolated as required? <span style={{ color: '#b91c1c' }}>*</span></label>
                    <select name="systems_isolated" value={formData.systems_isolated} onChange={handleChange} required style={inputStyle}>
                      <option value="">Select...</option>
                      {YES_NO_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ ...formRowStyle, marginBottom: '0' }}>
                  <div>
                    <label style={labelStyle}>All whip checks rated & in place? <span style={{ color: '#b91c1c' }}>*</span></label>
                    <select name="whip_checks_in_place" value={formData.whip_checks_in_place} onChange={handleChange} required style={inputStyle}>
                      <option value="">Select...</option>
                      {YES_NO_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Operator Information & Experience */}
            <div style={sectionStyle}>
              <div style={{ background: 'linear-gradient(135deg, #b91c1c 0%, #dc2626 100%)', color: 'white', padding: '12px 20px', fontWeight: '600', fontSize: '1rem' }}>
                👷 Operator Information & Experience
              </div>
              <div style={sectionBodyStyle}>
                <div style={formRowStyle}>
                  <div>
                    <label style={labelStyle}>Operator's Name <span style={{ color: '#b91c1c' }}>*</span></label>
                    <input type="text" name="operator_name" value={formData.operator_name} onChange={handleChange} required style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Last time operator completed similar job</label>
                    <input type="date" name="last_similar_job_date" value={formData.last_similar_job_date} onChange={handleChange} style={inputStyle} />
                  </div>
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={labelStyle}>Any lessons learned from past jobs?</label>
                  <textarea name="lessons_learned" value={formData.lessons_learned} onChange={handleChange} placeholder="Describe any lessons learned..." style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={labelStyle}>How will they start pump and build pressure?</label>
                  <textarea name="how_start_pump" value={formData.how_start_pump} onChange={handleChange} placeholder="Describe the procedure..." style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={labelStyle}>What if pressure gauge isn't what's expected?</label>
                  <textarea name="what_if_pressure_wrong" value={formData.what_if_pressure_wrong} onChange={handleChange} placeholder="Describe the contingency plan..." style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} />
                </div>
                <div style={{ marginBottom: '0' }}>
                  <label style={labelStyle}>How does OPD work? Is it Inspected/Certified?</label>
                  <textarea name="how_opd_works" value={formData.how_opd_works} onChange={handleChange} placeholder="Describe OPD operation and certification status..." style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} />
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div style={sectionStyle}>
              <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)', color: 'white', padding: '12px 20px', fontWeight: '600', fontSize: '1rem' }}>
                💡 Recommendations
              </div>
              <div style={sectionBodyStyle}>
                <div style={{ marginBottom: '0' }}>
                  <label style={labelStyle}>Recommended Improvements</label>
                  <textarea name="recommended_improvements" value={formData.recommended_improvements} onChange={handleChange} placeholder="Enter any recommended improvements..." style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} />
                </div>
              </div>
            </div>

            {/* Photo Documentation */}
            <div style={sectionStyle}>
              <div style={{ background: 'linear-gradient(135deg, #b91c1c 0%, #dc2626 100%)', color: 'white', padding: '12px 20px', fontWeight: '600', fontSize: '1rem' }}>
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
              {isSubmitting ? 'Submitting...' : 'Submit Pressure Crosscheck'}
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

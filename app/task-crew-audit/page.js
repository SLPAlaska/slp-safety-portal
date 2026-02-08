'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://iypezirwdlqpptjpeeyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
)

const COMPANIES = ['A-C Electric','AKE-Line','Apache Corp.','Armstrong Oil & Gas','ASRC Energy Services','CCI- Industrial','Chosen Construction','CINGSA','Coho Enterprises','Conam Construction','ConocoPhillips','Five Star Oilfield Services','Fox Energy Services','G.A. West','GBR Equipment','GLM Energy Services','Graham Industrial Coatings','Harvest Midstream','Hilcorp Alaska','MagTec Alaska','Merkes Builders','Nordic-Calista','Parker TRS','Peninsula Paving','Pollard Wireline','Ridgeline Oilfield Services','Santos','Summit Excavation','Tesoro Refinery','Yellowjacket','Other']

const LOCATIONS = ['Kenai','CIO','Beaver Creek','Swanson River','Ninilchik','Nikiski','Other Kenai Asset','Deadhorse','Prudhoe Bay','Kuparuk','Alpine','Willow','ENI','PIKKA','Point Thompson','North Star Island','Endicott','Badami','Other North Slope']

const OBSERVATION_TYPES = [
  'Safe Behaviors Observed',
  'At-Risk Behaviors Observed',
  'Mixed - Both Safe and At-Risk',
  'No Observations Made'
]

const INTERVENTION_OPTIONS = [
  'No Intervention Needed',
  'Verbal Coaching Provided',
  'Work Paused - Hazard Corrected',
  'Job Stopped - Immediate Danger',
  'Job Stopped - Permit Issue',
  'Job Stopped - Equipment Issue'
]

const TRAINING_TOPICS = [
  'None Discussed',
  'Hazard Recognition',
  'PPE Requirements',
  'Lockout/Tagout',
  'Confined Space',
  'Fall Protection',
  'Hot Work',
  'Lifting/Rigging',
  'Chemical Safety',
  'Emergency Response',
  'JSA/THA Process',
  'Stop Work Authority',
  'Cold Weather Safety',
  'Driving Safety',
  'Other'
]

const COACHING_OPTIONS = [
  'No Coaching Needed',
  'Positive Reinforcement',
  'Corrective Coaching',
  'Both Positive & Corrective',
  'Formal Training Recommended'
]

const JSA_THA_OPTIONS = [
  'Yes - Fully Reflective',
  'Partially - Needs Updates',
  'No - Not Reflective of Work',
  'No JSA/THA Present',
  'N/A'
]

const PPE_OPTIONS = [
  'Yes - All PPE Adequate & Worn',
  'Minor Issue - Corrected On-Site',
  'Major Issue - Work Stopped',
  'PPE Not Available',
  'N/A'
]

export default function TaskCrewAudit() {
  const [formData, setFormData] = useState({
    auditor_name: '',
    date: new Date().toISOString().split('T')[0],
    company: '',
    location: '',
    site_details: '',
    total_personnel: '',
    observations: '',
    interventions: '',
    training_topics: '',
    coaching_conducted: '',
    jsa_tha_reflective: '',
    ppe_adequate: '',
    what_went_well: '',
    atta_boys: ''
  })
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setPhotoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => setPhotoPreview(reader.result)
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      let photoUrl = null

      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `task-crew-audit/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('safety-photos')
          .upload(filePath, photoFile)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('safety-photos')
          .getPublicUrl(filePath)

        photoUrl = publicUrl
      }

      const { error } = await supabase
        .from('task_crew_audit')
        .insert([{
          ...formData,
          total_personnel: formData.total_personnel ? parseInt(formData.total_personnel) : null,
          photo_url: photoUrl
        }])

      if (error) throw error

      setIsSuccess(true)
    } catch (error) {
      console.error('Error submitting form:', error)
      alert('Error submitting form: ' + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      auditor_name: '',
      date: new Date().toISOString().split('T')[0],
      company: '',
      location: '',
      site_details: '',
      total_personnel: '',
      observations: '',
      interventions: '',
      training_topics: '',
      coaching_conducted: '',
      jsa_tha_reflective: '',
      ppe_adequate: '',
      what_went_well: '',
      atta_boys: ''
    })
    setPhotoFile(null)
    setPhotoPreview(null)
    setIsSuccess(false)
  }

  const styles = {
    backButton: {
      display: 'inline-block',
      margin: '20px',
      padding: '10px 20px',
      color: '#1e3a8a',
      textDecoration: 'none',
      fontWeight: '600',
      fontSize: '0.95rem',
      border: '2px solid #1e3a8a',
      borderRadius: '8px'
    },
    container: {
      maxWidth: '900px',
      margin: '0 auto',
      background: 'white',
      borderRadius: '16px',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
      overflow: 'hidden'
    },
    header: {
      background: 'linear-gradient(135deg, #1e3a8a 0%, #7c3aed 100%)',
      color: 'white',
      padding: '30px',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    },
    logoContainer: {
      background: 'rgba(255, 255, 255, 0.95)',
      borderRadius: '12px',
      padding: '15px',
      marginBottom: '20px',
      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)'
    },
    logo: {
      maxWidth: '200px',
      height: 'auto',
      display: 'block'
    },
    badge: {
      display: 'inline-block',
      background: 'white',
      color: '#7c3aed',
      padding: '6px 16px',
      borderRadius: '20px',
      fontWeight: '700',
      fontSize: '0.85rem',
      marginBottom: '15px',
      border: '3px solid #7c3aed',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
    },
    title: {
      fontSize: '1.5rem',
      marginBottom: '8px',
      textShadow: '2px 2px 4px rgba(0, 0, 0, 0.3)'
    },
    subtitle: {
      opacity: 0.95,
      fontSize: '1rem',
      margin: 0
    },
    formContent: {
      padding: '25px'
    },
    section: {
      marginBottom: '20px',
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      overflow: 'hidden'
    },
    sectionHeaderBlue: {
      background: 'linear-gradient(135deg, #1e3a8a, #1e40af)',
      color: 'white',
      padding: '12px 18px',
      fontWeight: '600',
      fontSize: '0.95rem'
    },
    sectionHeaderCyan: {
      background: 'linear-gradient(135deg, #0891b2, #0e7490)',
      color: 'white',
      padding: '12px 18px',
      fontWeight: '600',
      fontSize: '0.95rem'
    },
    sectionHeaderGreen: {
      background: 'linear-gradient(135deg, #059669, #047857)',
      color: 'white',
      padding: '12px 18px',
      fontWeight: '600',
      fontSize: '0.95rem'
    },
    sectionHeaderOrange: {
      background: 'linear-gradient(135deg, #d97706, #ea580c)',
      color: 'white',
      padding: '12px 18px',
      fontWeight: '600',
      fontSize: '0.95rem'
    },
    sectionHeaderPurple: {
      background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
      color: 'white',
      padding: '12px 18px',
      fontWeight: '600',
      fontSize: '0.95rem'
    },
    sectionBody: {
      padding: '18px',
      background: '#f8fafc'
    },
    formRow: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '15px',
      marginBottom: '15px'
    },
    formGroup: {
      display: 'flex',
      flexDirection: 'column'
    },
    formGroupFull: {
      display: 'flex',
      flexDirection: 'column',
      gridColumn: '1 / -1'
    },
    label: {
      fontWeight: '600',
      color: '#374151',
      marginBottom: '6px',
      fontSize: '0.85rem'
    },
    required: {
      color: '#b91c1c'
    },
    input: {
      padding: '10px 12px',
      border: '2px solid #d1d5db',
      borderRadius: '8px',
      fontSize: '0.9rem',
      background: 'white'
    },
    textarea: {
      padding: '10px 12px',
      border: '2px solid #d1d5db',
      borderRadius: '8px',
      fontSize: '0.9rem',
      background: 'white',
      minHeight: '80px',
      resize: 'vertical',
      fontFamily: 'inherit'
    },
    infoBox: {
      background: 'linear-gradient(135deg, #ede9fe, #e0e7ff)',
      border: '1px solid #c4b5fd',
      borderRadius: '8px',
      padding: '12px 15px',
      marginBottom: '15px',
      fontSize: '0.85rem',
      color: '#5b21b6'
    },
    photoUpload: {
      border: '2px dashed #d1d5db',
      borderRadius: '8px',
      padding: '25px',
      textAlign: 'center',
      background: 'white',
      cursor: 'pointer',
      transition: 'all 0.2s'
    },
    photoUploadHasPhoto: {
      border: '2px dashed #059669',
      borderRadius: '8px',
      padding: '25px',
      textAlign: 'center',
      background: 'rgba(5, 150, 105, 0.05)',
      cursor: 'pointer'
    },
    photoIcon: {
      fontSize: '2rem',
      marginBottom: '8px'
    },
    photoPreview: {
      maxWidth: '180px',
      maxHeight: '120px',
      margin: '10px auto',
      borderRadius: '8px',
      display: 'block'
    },
    submitBtn: {
      width: '100%',
      padding: '14px 28px',
      background: 'linear-gradient(135deg, #1e3a8a, #1e40af)',
      color: 'white',
      border: 'none',
      borderRadius: '10px',
      fontSize: '1.05rem',
      fontWeight: '600',
      cursor: 'pointer',
      boxShadow: '0 4px 15px rgba(30, 58, 138, 0.3)'
    },
    submitBtnDisabled: {
      width: '100%',
      padding: '14px 28px',
      background: '#9ca3af',
      color: 'white',
      border: 'none',
      borderRadius: '10px',
      fontSize: '1.05rem',
      fontWeight: '600',
      cursor: 'not-allowed'
    },
    successMessage: {
      textAlign: 'center',
      padding: '40px'
    },
    successIcon: {
      fontSize: '4rem',
      color: '#059669',
      marginBottom: '20px'
    },
    successTitle: {
      color: '#059669',
      marginBottom: '10px'
    },
    newFormBtn: {
      marginTop: '20px',
      padding: '12px 24px',
      background: '#1e3a8a',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '1rem',
      cursor: 'pointer'
    },
    loadingOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    },
    spinner: {
      width: '60px',
      height: '60px',
      border: '5px solid #f3f3f3',
      borderTop: '5px solid #1e3a8a',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    },
    footer: {
      textAlign: 'center',
      padding: '20px 10px',
      marginTop: '30px',
      borderTop: '1px solid #e2e8f0',
      fontSize: '11px',
      color: '#64748b',
      background: 'linear-gradient(to bottom, #f8fafc, #ffffff)'
    },
    trademark: {
      color: '#1e3a5f',
      fontWeight: '500'
    },
    divider: {
      color: '#94a3b8',
      margin: '0 8px'
    },
    copyright: {
      color: '#475569'
    }
  }

  if (isSuccess) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1e3a8a 0%, #7c3aed 100%)', padding: '20px' }}>
        <a href="/" style={styles.backButton}>← Back to Portal</a>
        <div style={styles.container}>
          <div style={styles.header}>
            <div style={styles.logoContainer}>
              <img src="/Logo.png" alt="SLP Alaska" style={styles.logo} />
            </div>
            <div style={styles.badge}>👷 CREW AUDIT</div>
            <h1 style={styles.title}>Task/Crew Audit</h1>
            <p style={styles.subtitle}>SLP Alaska Safety Management System</p>
          </div>
          <div style={styles.successMessage}>
            <div style={styles.successIcon}>✅</div>
            <h2 style={styles.successTitle}>Audit Submitted Successfully!</h2>
            <p>Your task/crew audit has been recorded.</p>
            <button style={styles.newFormBtn} onClick={resetForm}>Submit Another Audit</button>
          </div>
          <div style={styles.footer}>
            <span style={styles.trademark}>AnthroSafe™ Field Driven Safety</span>
            <span style={styles.divider}>|</span>
            <span style={styles.copyright}>© 2026 SLP Alaska, LLC</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1e3a8a 0%, #7c3aed 100%)', padding: '20px' }}>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      
      {isSubmitting && (
        <div style={styles.loadingOverlay}>
          <div style={styles.spinner}></div>
        </div>
      )}

      <a href="/" style={styles.backButton}>← Back to Portal</a>
      
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.logoContainer}>
            <img src="/Logo.png" alt="SLP Alaska" style={styles.logo} />
          </div>
          <div style={styles.badge}>👷 CREW AUDIT</div>
          <h1 style={styles.title}>Task/Crew Audit</h1>
          <p style={styles.subtitle}>SLP Alaska Safety Management System</p>
        </div>

        <div style={styles.formContent}>
          <form onSubmit={handleSubmit}>
            
            {/* BASIC INFO SECTION */}
            <div style={styles.section}>
              <div style={styles.sectionHeaderBlue}>📋 Basic Information</div>
              <div style={styles.sectionBody}>
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Name of Auditor <span style={styles.required}>*</span></label>
                    <input
                      type="text"
                      name="auditor_name"
                      value={formData.auditor_name}
                      onChange={handleChange}
                      required
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Date <span style={styles.required}>*</span></label>
                    <input
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleChange}
                      required
                      style={styles.input}
                    />
                  </div>
                </div>
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Client/Company <span style={styles.required}>*</span></label>
                    <select name="company" value={formData.company} onChange={handleChange} required style={styles.input}>
                      <option value="">Select Company...</option>
                      {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Location <span style={styles.required}>*</span></label>
                    <select name="location" value={formData.location} onChange={handleChange} required style={styles.input}>
                      <option value="">Select Location...</option>
                      {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* SITE CONDITIONS SECTION */}
            <div style={styles.section}>
              <div style={styles.sectionHeaderCyan}>🌤️ Site Conditions</div>
              <div style={styles.sectionBody}>
                <div style={styles.formRow}>
                  <div style={styles.formGroupFull}>
                    <label style={styles.label}>Site Details, Conditions & Weather</label>
                    <textarea
                      name="site_details"
                      value={formData.site_details}
                      onChange={handleChange}
                      placeholder="Describe site conditions, weather, and any relevant environmental factors..."
                      style={styles.textarea}
                    />
                  </div>
                </div>
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Total Personnel on Crew Audited <span style={styles.required}>*</span></label>
                    <input
                      type="number"
                      name="total_personnel"
                      value={formData.total_personnel}
                      onChange={handleChange}
                      min="1"
                      required
                      placeholder="Number of workers"
                      style={styles.input}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* OBSERVATIONS SECTION */}
            <div style={styles.section}>
              <div style={styles.sectionHeaderGreen}>👁️ Observations & Interventions</div>
              <div style={styles.sectionBody}>
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Observations <span style={styles.required}>*</span></label>
                    <select name="observations" value={formData.observations} onChange={handleChange} required style={styles.input}>
                      <option value="">Select Observation Type...</option>
                      {OBSERVATION_TYPES.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Interventions or Job Stoppages <span style={styles.required}>*</span></label>
                    <select name="interventions" value={formData.interventions} onChange={handleChange} required style={styles.input}>
                      <option value="">Select...</option>
                      {INTERVENTION_OPTIONS.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* TRAINING & COACHING SECTION */}
            <div style={styles.section}>
              <div style={styles.sectionHeaderOrange}>📚 Training & Coaching</div>
              <div style={styles.sectionBody}>
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Training Topics Discussed</label>
                    <select name="training_topics" value={formData.training_topics} onChange={handleChange} style={styles.input}>
                      <option value="">Select Topic...</option>
                      {TRAINING_TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Coaching Conducted</label>
                    <select name="coaching_conducted" value={formData.coaching_conducted} onChange={handleChange} style={styles.input}>
                      <option value="">Select...</option>
                      {COACHING_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* JSA & PPE SECTION */}
            <div style={styles.section}>
              <div style={styles.sectionHeaderPurple}>📝 JSA/THA & PPE Compliance</div>
              <div style={styles.sectionBody}>
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>JSA/THA Reflective of Work Performed <span style={styles.required}>*</span></label>
                    <select name="jsa_tha_reflective" value={formData.jsa_tha_reflective} onChange={handleChange} required style={styles.input}>
                      <option value="">Select...</option>
                      {JSA_THA_OPTIONS.map(j => <option key={j} value={j}>{j}</option>)}
                    </select>
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>All Required PPE Adequate & Worn <span style={styles.required}>*</span></label>
                    <select name="ppe_adequate" value={formData.ppe_adequate} onChange={handleChange} required style={styles.input}>
                      <option value="">Select...</option>
                      {PPE_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* FEEDBACK SECTION */}
            <div style={styles.section}>
              <div style={styles.sectionHeaderBlue}>💬 Feedback & Recognition</div>
              <div style={styles.sectionBody}>
                <div style={styles.infoBox}>
                  Provide constructive feedback to help improve safety performance. Recognize good work and identify opportunities for improvement.
                </div>
                <div style={styles.formRow}>
                  <div style={styles.formGroupFull}>
                    <label style={styles.label}>What Went Well / What Didn't / How to Improve</label>
                    <textarea
                      name="what_went_well"
                      value={formData.what_went_well}
                      onChange={handleChange}
                      placeholder="Document what went well, any issues observed, and recommendations for improvement..."
                      style={styles.textarea}
                    />
                  </div>
                </div>
                <div style={styles.formRow}>
                  <div style={styles.formGroupFull}>
                    <label style={styles.label}>Atta Boys / Opportunities for Improvement</label>
                    <textarea
                      name="atta_boys"
                      value={formData.atta_boys}
                      onChange={handleChange}
                      placeholder="Recognize outstanding performance and identify specific improvement opportunities..."
                      style={styles.textarea}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* PHOTO SECTION */}
            <div style={styles.section}>
              <div style={styles.sectionHeaderCyan}>📸 Photo Documentation</div>
              <div style={styles.sectionBody}>
                <div style={styles.formRow}>
                  <div style={styles.formGroupFull}>
                    <label style={styles.label}>Photo (Optional)</label>
                    <div 
                      style={photoPreview ? styles.photoUploadHasPhoto : styles.photoUpload}
                      onClick={() => document.getElementById('photoInput').click()}
                    >
                      <div style={styles.photoIcon}>📷</div>
                      <p>{photoPreview ? 'Photo selected - Click to change' : 'Click to upload photo'}</p>
                      {photoPreview && <img src={photoPreview} alt="Preview" style={styles.photoPreview} />}
                    </div>
                    <input
                      type="file"
                      id="photoInput"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      style={{ display: 'none' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              style={isSubmitting ? styles.submitBtnDisabled : styles.submitBtn}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Task/Crew Audit'}
            </button>
          </form>
        </div>

        <div style={styles.footer}>
          <span style={styles.trademark}>AnthroSafe™ Field Driven Safety</span>
          <span style={styles.divider}>|</span>
          <span style={styles.copyright}>© 2026 SLP Alaska, LLC</span>
        </div>
      </div>
    </div>
  )
}

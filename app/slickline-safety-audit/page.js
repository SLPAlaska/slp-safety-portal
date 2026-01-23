'use client'

import React, { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://iypezirwdlqpptjpeeyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
)

const COMPANIES = ['A-C Electric','AKE-Line','Apache Corp.','Armstrong Oil & Gas','ASRC Energy Services','CCI- Industrial','Chosen Construction','CINGSA','Coho Enterprises','Conam Construction','ConocoPhillips','Five Star Oilfield Services','Fox Energy Services','G.A. West','GBR Equipment','GLM Energy Services','Graham Industrial Coatings','Harvest Midstream','Hilcorp Alaska','MagTec Alaska','Merkes Builders','Nordic-Calista','Parker TRS','Peninsula Paving','Pollard Wireline','Ridgeline Oilfield Services','Santos','Summit Excavation','Tesoro Refinery','Yellowjacket','Other']

const LOCATIONS = ['Kenai','CIO','Beaver Creek','Swanson River','Ninilchik','Nikiski','Other Kenai Asset','Deadhorse','Prudhoe Bay','Kuparuk','Alpine','Willow','ENI','PIKKA','Point Thompson','North Star Island','Endicott','Badami','Other North Slope']

const AUDIT_RESPONSES = ['Yes', 'No', 'Needs Improvement', 'N/A']

const PPE_QUESTIONS = [
  { id: 'correct_ppe', label: 'Correct PPE in Use' },
  { id: 'rigging_rated', label: 'All Rigging Rated & in Good Condition' },
  { id: 'rigging_inspection', label: 'All Rigging Undergo Pre-Use Inspection' },
  { id: 'slickline_condition', label: 'Slickline Free of Kinks, Frays & in Good Condition' },
  { id: 'weight_indicators', label: 'All Weight Indicators Functioning Properly' }
]

const OPS_QUESTIONS = [
  { id: 'work_areas_clean', label: 'Work Areas Clean and Free of Hazards' },
  { id: 'crew_emergency', label: 'Crew Familiar with Emergency Procedures/Alarms' },
  { id: 'tools_maintained', label: 'Tools/Vehicles/Equipment Maintained in Good Condition' },
  { id: 'spill_containment', label: 'Spill Containment and Control Adequate' }
]

const TRAINING_QUESTIONS = [
  { id: 'crew_trained', label: 'Crew Trained in Safe Operations and Emergency Actions' },
  { id: 'new_hires_mentored', label: 'New Hires Mentored by Experienced Personnel' },
  { id: 'jsa_hazards', label: 'JSA for Each Slickline Activity IDs Real-Time Hazards' },
  { id: 'jsa_personnel', label: 'JSA Assigns Personnel for Specific Activity' }
]

export default function SlicklineSafetyAuditPage() {
  const [formData, setFormData] = useState({
    auditor_name: '',
    date: new Date().toISOString().split('T')[0],
    client_company: '',
    location: '',
    unit_number: '',
    correct_ppe: '',
    rigging_rated: '',
    rigging_inspection: '',
    slickline_condition: '',
    weight_indicators: '',
    work_areas_clean: '',
    crew_emergency: '',
    tools_maintained: '',
    spill_containment: '',
    crew_trained: '',
    new_hires_mentored: '',
    jsa_hazards: '',
    jsa_personnel: '',
    improvements: ''
  })

  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleRadioChange = (questionId, value) => {
    setFormData(prev => ({ ...prev, [questionId]: value }))
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
    setSubmitting(true)

    try {
      let photoUrl = ''

      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `slickline-safety-audit/${fileName}`

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
        .from('slickline_safety_audit')
        .insert([{
          ...formData,
          photo_url: photoUrl,
          created_at: new Date().toISOString()
        }])

      if (error) throw error

      setSubmitted(true)
    } catch (error) {
      console.error('Error submitting form:', error)
      alert('Error submitting form: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      auditor_name: '',
      date: new Date().toISOString().split('T')[0],
      client_company: '',
      location: '',
      unit_number: '',
      correct_ppe: '',
      rigging_rated: '',
      rigging_inspection: '',
      slickline_condition: '',
      weight_indicators: '',
      work_areas_clean: '',
      crew_emergency: '',
      tools_maintained: '',
      spill_containment: '',
      crew_trained: '',
      new_hires_mentored: '',
      jsa_hazards: '',
      jsa_personnel: '',
      improvements: ''
    })
    setPhotoFile(null)
    setPhotoPreview(null)
    setSubmitted(false)
  }

  const renderAuditQuestion = (question) => (
    <div key={question.id} style={styles.auditQuestion}>
      <span style={styles.questionText}>{question.label}</span>
      <div style={styles.questionOptions}>
        {AUDIT_RESPONSES.map(response => (
          <label key={response} style={styles.radioLabel}>
            <input
              type="radio"
              name={question.id}
              value={response}
              checked={formData[question.id] === response}
              onChange={() => handleRadioChange(question.id, response)}
              required
              style={styles.radioInput}
            />
            <span style={{
              ...styles.radioButton,
              ...(formData[question.id] === response ? 
                (response === 'Yes' ? styles.radioYes :
                 response === 'No' ? styles.radioNo :
                 response === 'Needs Improvement' ? styles.radioNeeds :
                 styles.radioNA) : {})
            }}>
              {response}
            </span>
          </label>
        ))}
      </div>
    </div>
  )

  if (submitted) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.successMessage}>
            <div style={styles.successIcon}>✅</div>
            <h2 style={styles.successTitle}>Audit Submitted Successfully!</h2>
            <p style={styles.successText}>Your slickline safety audit has been recorded.</p>
            <button onClick={resetForm} style={styles.newFormBtn}>
              Submit Another Audit
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <a href="/" style={styles.backButton}>← Back to Portal</a>
        
        <div style={styles.header}>
          <div style={styles.logoContainer}>
            <img src="/Logo.png" alt="SLP Alaska" style={styles.logo} />
          </div>
          <div style={styles.auditBadge}>🔧 SLICKLINE AUDIT</div>
          <h1 style={styles.title}>Slickline Safety Audit</h1>
          <p style={styles.subtitle}>SLP Alaska Safety Management System</p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* BASIC INFO SECTION */}
          <div style={styles.section}>
            <div style={{...styles.sectionHeader, ...styles.sectionHeaderBlue}}>
              📋 Basic Information
            </div>
            <div style={styles.sectionBody}>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Name of Auditor <span style={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    name="auditor_name"
                    value={formData.auditor_name}
                    onChange={handleInputChange}
                    required
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Date <span style={styles.required}>*</span>
                  </label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    required
                    style={styles.input}
                  />
                </div>
              </div>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Client/Company <span style={styles.required}>*</span>
                  </label>
                  <select
                    name="client_company"
                    value={formData.client_company}
                    onChange={handleInputChange}
                    required
                    style={styles.select}
                  >
                    <option value="">Select Company...</option>
                    {COMPANIES.map(company => (
                      <option key={company} value={company}>{company}</option>
                    ))}
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Location <span style={styles.required}>*</span>
                  </label>
                  <select
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    required
                    style={styles.select}
                  >
                    <option value="">Select Location...</option>
                    {LOCATIONS.map(location => (
                      <option key={location} value={location}>{location}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Unit # <span style={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    name="unit_number"
                    value={formData.unit_number}
                    onChange={handleInputChange}
                    required
                    style={styles.input}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* PPE & EQUIPMENT SECTION */}
          <div style={styles.section}>
            <div style={{...styles.sectionHeader, ...styles.sectionHeaderRed}}>
              🦺 PPE & Equipment
            </div>
            <div style={styles.sectionBody}>
              {PPE_QUESTIONS.map(renderAuditQuestion)}
            </div>
          </div>

          {/* OPERATIONS & SAFETY SECTION */}
          <div style={styles.section}>
            <div style={{...styles.sectionHeader, ...styles.sectionHeaderSlate}}>
              ⚙️ Operations & Safety
            </div>
            <div style={styles.sectionBody}>
              {OPS_QUESTIONS.map(renderAuditQuestion)}
            </div>
          </div>

          {/* TRAINING & JSA SECTION */}
          <div style={styles.section}>
            <div style={{...styles.sectionHeader, ...styles.sectionHeaderBlue}}>
              📚 Training & JSA
            </div>
            <div style={styles.sectionBody}>
              {TRAINING_QUESTIONS.map(renderAuditQuestion)}
            </div>
          </div>

          {/* IMPROVEMENTS SECTION */}
          <div style={styles.section}>
            <div style={{...styles.sectionHeader, ...styles.sectionHeaderRed}}>
              💡 Improvements
            </div>
            <div style={styles.sectionBody}>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Identify and Discuss Improvements/Unidentified Hazards
                </label>
                <textarea
                  name="improvements"
                  value={formData.improvements}
                  onChange={handleInputChange}
                  placeholder="Describe any recommended improvements or hazards identified during the audit..."
                  style={styles.textarea}
                />
              </div>
            </div>
          </div>

          {/* PHOTO SECTION */}
          <div style={styles.section}>
            <div style={{...styles.sectionHeader, ...styles.sectionHeaderSlate}}>
              📸 Photo Documentation
            </div>
            <div style={styles.sectionBody}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Photo (Optional)</label>
                <div
                  style={{
                    ...styles.photoUpload,
                    ...(photoPreview ? styles.photoUploadHasPhoto : {})
                  }}
                  onClick={() => document.getElementById('photoInput').click()}
                >
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" style={styles.photoPreview} />
                  ) : (
                    <>
                      <div style={styles.photoIcon}>📷</div>
                      <p>Click to upload photo</p>
                    </>
                  )}
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

          <button
            type="submit"
            disabled={submitting}
            style={{
              ...styles.submitBtn,
              ...(submitting ? styles.submitBtnDisabled : {})
            }}
          >
            {submitting ? 'Submitting...' : 'Submit Slickline Safety Audit'}
          </button>
        </form>

        {/* SLP TRADEMARK FOOTER */}
        <div style={styles.footer}>
          <span style={styles.trademark}>Powered by Predictive Safety Analytics™</span>
          <span style={styles.divider}>|</span>
          <span style={styles.copyright}>© 2025 SLP Alaska</span>
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1e3a8a 0%, #b91c1c 100%)',
    padding: '20px',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif"
  },
  card: {
    maxWidth: '900px',
    margin: '0 auto',
    background: 'white',
    borderRadius: '16px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    overflow: 'hidden'
  },
  backButton: {
    display: 'inline-block',
    margin: '20px',
    padding: '10px 20px',
    color: '#1e3a8a',
    textDecoration: 'none',
    fontWeight: '600',
    fontSize: '0.95rem',
    border: '2px solid #1e3a8a',
    borderRadius: '8px',
    transition: 'all 0.2s'
  },
  header: {
  background: 'linear-gradient(135deg, #1e3a8a 0%, #b91c1c 100%)',
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
    display: 'inline-block',
    marginBottom: '20px',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)'
  },
  logo: {
    maxWidth: '200px',
    height: 'auto',
    display: 'block'
  },
  auditBadge: {
    display: 'inline-block',
    background: 'white',
    color: '#1e3a8a',
    padding: '6px 16px',
    borderRadius: '20px',
    fontWeight: '700',
    fontSize: '0.85rem',
    marginBottom: '15px',
    border: '3px solid #475569',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
  },
  title: {
    fontSize: '1.5rem',
    marginBottom: '8px',
    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.3)',
    margin: '0 0 8px 0'
  },
  subtitle: {
    opacity: '0.95',
    fontSize: '1rem',
    margin: 0
  },
  form: {
    padding: '30px'
  },
  section: {
    marginBottom: '30px',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    overflow: 'hidden'
  },
  sectionHeader: {
    color: 'white',
    padding: '12px 20px',
    fontWeight: '600',
    fontSize: '1rem'
  },
  sectionHeaderBlue: {
    background: 'linear-gradient(135deg, #1e3a8a, #1e40af)'
  },
  sectionHeaderRed: {
    background: 'linear-gradient(135deg, #b91c1c, #dc2626)'
  },
  sectionHeaderSlate: {
    background: 'linear-gradient(135deg, #475569, #334155)'
  },
  sectionBody: {
    padding: '20px',
    background: '#f8fafc'
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '20px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column'
  },
  label: {
    fontWeight: '600',
    color: '#374151',
    marginBottom: '6px',
    fontSize: '0.9rem'
  },
  required: {
    color: '#b91c1c'
  },
  input: {
    padding: '12px 14px',
    border: '2px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '1rem',
    transition: 'all 0.2s',
    background: 'white',
    outline: 'none'
  },
  select: {
    padding: '12px 14px',
    border: '2px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '1rem',
    transition: 'all 0.2s',
    background: 'white',
    outline: 'none'
  },
  textarea: {
    padding: '12px 14px',
    border: '2px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '1rem',
    minHeight: '100px',
    resize: 'vertical',
    background: 'white',
    outline: 'none',
    fontFamily: 'inherit'
  },
  auditQuestion: {
    background: 'white',
    border: '2px solid #e5e7eb',
    borderRadius: '10px',
    padding: '15px 20px',
    marginBottom: '12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '15px'
  },
  questionText: {
    flex: '1',
    minWidth: '250px',
    fontWeight: '500',
    color: '#374151'
  },
  questionOptions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  radioLabel: {
    cursor: 'pointer'
  },
  radioInput: {
    display: 'none'
  },
  radioButton: {
    display: 'block',
    padding: '8px 16px',
    border: '2px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '0.9rem',
    fontWeight: '500',
    transition: 'all 0.2s',
    background: 'white'
  },
  radioYes: {
    borderColor: '#059669',
    background: '#059669',
    color: 'white'
  },
  radioNo: {
    borderColor: '#b91c1c',
    background: '#b91c1c',
    color: 'white'
  },
  radioNeeds: {
    borderColor: '#d97706',
    background: '#d97706',
    color: 'white'
  },
  radioNA: {
    borderColor: '#6b7280',
    background: '#6b7280',
    color: 'white'
  },
  photoUpload: {
    border: '2px dashed #d1d5db',
    borderRadius: '8px',
    padding: '30px',
    textAlign: 'center',
    background: 'white',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  photoUploadHasPhoto: {
    borderColor: '#059669',
    background: 'rgba(5, 150, 105, 0.05)'
  },
  photoIcon: {
    fontSize: '2.5rem',
    marginBottom: '10px'
  },
  photoPreview: {
    maxWidth: '200px',
    maxHeight: '150px',
    borderRadius: '8px'
  },
  submitBtn: {
    width: '100%',
    padding: '16px 32px',
    background: 'linear-gradient(135deg, #1e3a8a, #1e40af)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '1.1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s',
    boxShadow: '0 4px 15px rgba(30, 58, 138, 0.3)'
  },
  submitBtnDisabled: {
    background: '#9ca3af',
    cursor: 'not-allowed',
    boxShadow: 'none'
  },
  successMessage: {
    textAlign: 'center',
    padding: '60px 40px'
  },
  successIcon: {
    fontSize: '4rem',
    marginBottom: '20px'
  },
  successTitle: {
    color: '#059669',
    marginBottom: '10px',
    fontSize: '1.5rem'
  },
  successText: {
    color: '#374151',
    marginBottom: '20px'
  },
  newFormBtn: {
    padding: '12px 24px',
    background: '#1e3a8a',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    cursor: 'pointer',
    transition: 'all 0.2s'
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

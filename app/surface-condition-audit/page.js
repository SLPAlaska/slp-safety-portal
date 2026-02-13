'use client'

import React, { useState, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import MultiPhotoUpload from '@/components/MultiPhotoUpload';

const supabase = createClient(
  'https://iypezirwdlqpptjpeeyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
)

const COMPANIES = ['A-C Electric','AKE-Line','Apache Corp.','Armstrong Oil & Gas','ASRC Energy Services','CCI- Industrial','Chosen Construction','CINGSA','Coho Enterprises','Conam Construction','ConocoPhillips','Five Star Oilfield Services','Fox Energy Services','G.A. West','GBR Equipment','GLM Energy Services','Graham Industrial Coatings','Harvest Midstream','Hilcorp Alaska','MagTec Alaska','Merkes Builders','Nordic-Calista','Parker TRS','Peninsula Paving','Pollard Wireline','Ridgeline Oilfield Services','Santos','Summit Excavation','Tesoro Refinery','Yellowjacket','Other']

const LOCATIONS = ['Kenai','CIO','Beaver Creek','Swanson River','Ninilchik','Nikiski','Other Kenai Asset','Deadhorse','Prudhoe Bay','Kuparuk','Alpine','Willow','ENI','PIKKA','Point Thompson','North Star Island','Endicott','Badami','Other North Slope']

const WEATHER_CONDITIONS = [
  'Clear/Sunny',
  'Partly Cloudy',
  'Overcast',
  'Light Rain',
  'Heavy Rain',
  'Light Snow',
  'Heavy Snow',
  'Blizzard/Whiteout',
  'Fog',
  'Freezing Rain/Ice',
  'Windy',
  'Extreme Cold'
]

const AUDIT_RESPONSES = ['Yes', 'No', 'Needs Improvement', 'N/A']

const WALKING_QUESTIONS = [
  { id: 'walking_surfaces', label: 'Walking Surfaces Free of Tripping Hazards' },
  { id: 'pad_level', label: 'Pad Properly Level to Minimize Uneven Surfaces' },
  { id: 'access_routes', label: 'Access Routes Clear of Snow/Ice Buildup' },
  { id: 'equipment_stored', label: 'Equipment/Materials Stored Appropriately' },
  { id: 'areas_scarified', label: 'Areas Scarified by Loader Implement Routinely' },
  { id: 'high_traffic_maintained', label: 'High Foot Traffic Areas Routinely Maintained' },
  { id: 'entries_grating', label: 'Camp and Rig Entries Have Grating or Anti-Slip' }
]

const BARRIER_QUESTIONS = [
  { id: 'guardrails', label: 'Guardrails Present in Elevated Areas' },
  { id: 'physical_barriers', label: 'Physical Barriers in Place Around High-Risk Zones' },
  { id: 'perimeter_markers', label: 'Perimeter Markers to Define Safe Walking Areas' },
  { id: 'lighting_adequate', label: 'Lighting Adequate for Safe Navigation' }
]

const EQUIPMENT_QUESTIONS = [
  { id: 'traction_devices', label: 'Workers Wearing Traction Devices When Required' },
  { id: 'snow_removal', label: 'Snow Removal Equipment Readily Available' },
  { id: 'spill_cleanup', label: 'Spill Cleanup Available in High Traffic Areas' }
]

export default function SurfaceConditionAuditPage() {
  const [formData, setFormData] = useState({
    auditor_name: '',
    date: new Date().toISOString().split('T')[0],
    company: '',
    location: '',
    weather_conditions: '',
    temperature: '',
    walking_surfaces: '',
    pad_level: '',
    access_routes: '',
    equipment_stored: '',
    areas_scarified: '',
    high_traffic_maintained: '',
    entries_grating: '',
    guardrails: '',
    physical_barriers: '',
    perimeter_markers: '',
    lighting_adequate: '',
    traction_devices: '',
    snow_removal: '',
    spill_cleanup: '',
    comments: ''
  })

  const photoRef = useRef();
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleRadioChange = (questionId, value) => {
    setFormData(prev => ({ ...prev, [questionId]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      // Generate a unique submission ID for photo storage path
      const submissionId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      // Upload photos if any were staged
      let photoUrls = [];
      if (photoRef.current && photoRef.current.hasPhotos()) {
        photoUrls = await photoRef.current.uploadAll(submissionId);
      }

      const { error } = await supabase
        .from('surface_condition_audit')
        .insert([{
          ...formData,
          photo_urls: photoUrls.length > 0 ? photoUrls : null,
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
      company: '',
      location: '',
      weather_conditions: '',
      temperature: '',
      walking_surfaces: '',
      pad_level: '',
      access_routes: '',
      equipment_stored: '',
      areas_scarified: '',
      high_traffic_maintained: '',
      entries_grating: '',
      guardrails: '',
      physical_barriers: '',
      perimeter_markers: '',
      lighting_adequate: '',
      traction_devices: '',
      snow_removal: '',
      spill_cleanup: '',
      comments: ''
    })
    if (photoRef.current) photoRef.current.reset();
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
            <p style={styles.successText}>Your surface condition audit has been recorded.</p>
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
          <div style={styles.badge}>🧊 SURFACE AUDIT</div>
          <h1 style={styles.title}>Surface Condition Audit</h1>
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
                    Auditor Name <span style={styles.required}>*</span>
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
                    name="company"
                    value={formData.company}
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
            </div>
          </div>

          {/* WEATHER CONDITIONS SECTION */}
          <div style={styles.section}>
            <div style={{...styles.sectionHeader, ...styles.sectionHeaderCyan}}>
              🌡️ Weather Conditions
            </div>
            <div style={styles.sectionBody}>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Weather Conditions <span style={styles.required}>*</span>
                  </label>
                  <select
                    name="weather_conditions"
                    value={formData.weather_conditions}
                    onChange={handleInputChange}
                    required
                    style={styles.select}
                  >
                    <option value="">Select Weather...</option>
                    {WEATHER_CONDITIONS.map(weather => (
                      <option key={weather} value={weather}>{weather}</option>
                    ))}
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Temperature (°F)</label>
                  <input
                    type="text"
                    name="temperature"
                    value={formData.temperature}
                    onChange={handleInputChange}
                    placeholder="e.g., 25°F or -10°F"
                    style={styles.input}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* WALKING SURFACES SECTION */}
          <div style={styles.section}>
            <div style={{...styles.sectionHeader, ...styles.sectionHeaderSlate}}>
              👟 Walking Surfaces
            </div>
            <div style={styles.sectionBody}>
              {WALKING_QUESTIONS.map(renderAuditQuestion)}
            </div>
          </div>

          {/* SAFETY BARRIERS SECTION */}
          <div style={styles.section}>
            <div style={{...styles.sectionHeader, ...styles.sectionHeaderOrange}}>
              🚧 Safety Barriers & Markings
            </div>
            <div style={styles.sectionBody}>
              {BARRIER_QUESTIONS.map(renderAuditQuestion)}
            </div>
          </div>

          {/* EQUIPMENT & PPE SECTION */}
          <div style={styles.section}>
            <div style={{...styles.sectionHeader, ...styles.sectionHeaderGreen}}>
              🛠️ Equipment & PPE
            </div>
            <div style={styles.sectionBody}>
              {EQUIPMENT_QUESTIONS.map(renderAuditQuestion)}
            </div>
          </div>

          {/* COMMENTS SECTION */}
          <div style={styles.section}>
            <div style={{...styles.sectionHeader, ...styles.sectionHeaderBlue}}>
              💬 Additional Comments
            </div>
            <div style={styles.sectionBody}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Comments or Observations</label>
                <textarea
                  name="comments"
                  value={formData.comments}
                  onChange={handleInputChange}
                  placeholder="Any additional observations about surface conditions, hazards identified, or recommendations..."
                  style={styles.textarea}
                />
              </div>
            </div>
          </div>

          {/* PHOTO SECTION */}
          <MultiPhotoUpload ref={photoRef} formType="surface-condition-audit" />


          <button
            type="submit"
            disabled={submitting}
            style={{
              ...styles.submitBtn,
              ...(submitting ? styles.submitBtnDisabled : {})
            }}
          >
            {submitting ? 'Submitting...' : 'Submit Surface Condition Audit'}
          </button>
        </form>

        {/* SLP TRADEMARK FOOTER */}
        <div style={styles.footer}>
          <span style={styles.trademark}>AnthroSafe™ Field Driven Safety</span>
          <span style={styles.divider}>|</span>
          <span style={styles.copyright}>© 2026 SLP Alaska, LLC</span>
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
    padding: '20px',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif"
  },
  card: {
    maxWidth: '950px',
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
    borderRadius: '8px'
  },
  header: {
    background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
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
    color: '#0891b2',
    padding: '6px 16px',
    borderRadius: '20px',
    fontWeight: '700',
    fontSize: '0.85rem',
    marginBottom: '15px',
    border: '3px solid #0891b2',
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
    marginBottom: '25px',
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
  sectionHeaderCyan: {
    background: 'linear-gradient(135deg, #0891b2, #0e7490)'
  },
  sectionHeaderSlate: {
    background: 'linear-gradient(135deg, #475569, #334155)'
  },
  sectionHeaderOrange: {
    background: 'linear-gradient(135deg, #d97706, #ea580c)'
  },
  sectionHeaderGreen: {
    background: 'linear-gradient(135deg, #059669, #047857)'
  },
  sectionBody: {
    padding: '20px',
    background: '#f8fafc'
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
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
    padding: '10px 12px',
    border: '2px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '0.95rem',
    background: 'white',
    outline: 'none'
  },
  select: {
    padding: '10px 12px',
    border: '2px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '0.95rem',
    background: 'white',
    outline: 'none'
  },
  textarea: {
    padding: '10px 12px',
    border: '2px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '0.95rem',
    minHeight: '80px',
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
    cursor: 'pointer'
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

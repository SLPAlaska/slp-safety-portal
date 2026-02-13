'use client'

import { useState, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import MultiPhotoUpload from '@/components/MultiPhotoUpload';

const supabase = createClient(
  'https://iypezirwdlqpptjpeeyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
)

const COMPANIES = ['A-C Electric','AKE-Line','Apache Corp.','Armstrong Oil & Gas','ASRC Energy Services','CCI- Industrial','Chosen Construction','CINGSA','Coho Enterprises','Conam Construction','ConocoPhillips','Five Star Oilfield Services','Fox Energy Services','G.A. West','GBR Equipment','GLM Energy Services','Graham Industrial Coatings','Harvest Midstream','Hilcorp Alaska','MagTec Alaska','Merkes Builders','Nordic-Calista','Parker TRS','Peninsula Paving','Pollard Wireline','Ridgeline Oilfield Services','Santos','Summit Excavation','Tesoro Refinery','Yellowjacket','Other']

const LOCATIONS = ['Kenai','CIO','Beaver Creek','Swanson River','Ninilchik','Nikiski','Other Kenai Asset','Deadhorse','Prudhoe Bay','Kuparuk','Alpine','Willow','ENI','PIKKA','Point Thompson','North Star Island','Endicott','Badami','Other North Slope']

const YES_NO_NEEDS = ['Yes', 'No', 'Needs Improvement']

const QUALITY_SCORES = [
  { value: 'A - Excellent (90-100%)', letter: 'A', desc: 'Excellent', color: '#22c55e' },
  { value: 'B - Good (80-89%)', letter: 'B', desc: 'Good', color: '#84cc16' },
  { value: 'C - Average (70-79%)', letter: 'C', desc: 'Average', color: '#f59e0b' },
  { value: 'D - Below Average (60-69%)', letter: 'D', desc: 'Below Avg', color: '#f97316' },
  { value: 'F - Failing (Below 60%)', letter: 'F', desc: 'Failing', color: '#dc2626' }
]

export default function ToolboxMeetingAssessment() {
  const [formData, setFormData] = useState({
    auditor_name: '',
    date: new Date().toISOString().split('T')[0],
    client: '',
    location: '',
    meeting_leader: '',
    safety_concerns: '',
    daily_tasks: '',
    what_how_questions: '',
    facilitation_comments: '',
    hazards_addressed: '',
    stop_the_job: '',
    incidents_discussed: '',
    lessons_learned: '',
    facilitator_prepared: '',
    meeting_space: '',
    environment_ok: '',
    quality_score: '',
    improvement_opportunities: ''
  })
  const photoRef = useRef();
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Generate a unique submission ID for photo storage path
      const submissionId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      // Upload photos if any were staged
      let photoUrls = [];
      if (photoRef.current && photoRef.current.hasPhotos()) {
        photoUrls = await photoRef.current.uploadAll(submissionId);
      }

      const { error } = await supabase
        .from('toolbox_meeting_assessment')
        .insert([{
          ...formData,
          photo_urls: photoUrls.length > 0 ? photoUrls : null
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
      client: '',
      location: '',
      meeting_leader: '',
      safety_concerns: '',
      daily_tasks: '',
      what_how_questions: '',
      facilitation_comments: '',
      hazards_addressed: '',
      stop_the_job: '',
      incidents_discussed: '',
      lessons_learned: '',
      facilitator_prepared: '',
      meeting_space: '',
      environment_ok: '',
      quality_score: '',
      improvement_opportunities: ''
    })
    if (photoRef.current) photoRef.current.reset();
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
      borderRadius: '8px',
      background: 'white'
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
      background: 'linear-gradient(135deg, #1e3a8a 0%, #059669 100%)',
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
      color: '#059669',
      padding: '6px 16px',
      borderRadius: '20px',
      fontWeight: '700',
      fontSize: '0.85rem',
      marginBottom: '15px',
      border: '3px solid #059669',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
    },
    title: {
      fontSize: '1.4rem',
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
    sectionHeaderGreen: {
      background: 'linear-gradient(135deg, #059669, #047857)',
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
    sectionHeaderOrange: {
      background: 'linear-gradient(135deg, #d97706, #ea580c)',
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
      minHeight: '70px',
      resize: 'vertical',
      fontFamily: 'inherit'
    },
    criteriaItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      background: 'white',
      padding: '12px 15px',
      borderRadius: '8px',
      border: '1px solid #e5e7eb',
      marginBottom: '10px'
    },
    criteriaLabel: {
      flex: 1,
      fontWeight: '600',
      color: '#374151',
      fontSize: '0.85rem'
    },
    criteriaSelect: {
      width: '160px',
      padding: '8px 10px',
      fontSize: '0.85rem',
      border: '2px solid #d1d5db',
      borderRadius: '8px',
      background: 'white'
    },
    gradeSelector: {
      display: 'flex',
      gap: '10px',
      flexWrap: 'wrap',
      justifyContent: 'center'
    },
    gradeOption: {
      position: 'relative'
    },
    gradeInput: {
      display: 'none'
    },
    gradeLabel: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '15px 20px',
      border: '3px solid #d1d5db',
      borderRadius: '12px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      minWidth: '80px',
      background: 'white'
    },
    gradeLabelSelected: {
      color: 'white'
    },
    gradeLetter: {
      fontSize: '1.8rem',
      fontWeight: '700'
    },
    gradeDesc: {
      fontSize: '0.7rem',
      color: '#6b7280'
    },
    gradeDescSelected: {
      fontSize: '0.7rem',
      color: 'white'
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

  const CriteriaItem = ({ label, name, value, onChange, required = true }) => (
    <div style={styles.criteriaItem}>
      <label style={styles.criteriaLabel}>
        {label} {required && <span style={styles.required}>*</span>}
      </label>
      <select
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        style={styles.criteriaSelect}
      >
        <option value="">Select...</option>
        {YES_NO_NEEDS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  )

  if (isSuccess) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1e3a8a 0%, #059669 100%)', padding: '20px' }}>
        <a href="/" style={styles.backButton}>← Back to Portal</a>
        <div style={styles.container}>
          <div style={styles.header}>
            <div style={styles.logoContainer}>
              <img src="/Logo.png" alt="SLP Alaska" style={styles.logo} />
            </div>
            <div style={styles.badge}>🛠️ TOOLBOX MEETING</div>
            <h1 style={styles.title}>Toolbox Meeting Quality Assessment</h1>
            <p style={styles.subtitle}>SLP Alaska Safety Management System</p>
          </div>
          <div style={styles.successMessage}>
            <div style={styles.successIcon}>✅</div>
            <h2 style={styles.successTitle}>Assessment Submitted Successfully!</h2>
            <p>Your toolbox meeting assessment has been recorded.</p>
            <button style={styles.newFormBtn} onClick={resetForm}>Submit Another Assessment</button>
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
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1e3a8a 0%, #059669 100%)', padding: '20px' }}>
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
          <div style={styles.badge}>🛠️ TOOLBOX MEETING</div>
          <h1 style={styles.title}>Toolbox Meeting Quality Assessment</h1>
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
                    <select name="client" value={formData.client} onChange={handleChange} required style={styles.input}>
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
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Meeting Leader Name</label>
                    <input
                      type="text"
                      name="meeting_leader"
                      value={formData.meeting_leader}
                      onChange={handleChange}
                      placeholder="Name of person leading the meeting"
                      style={styles.input}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* CONTENT & FACILITATION SECTION */}
            <div style={styles.section}>
              <div style={styles.sectionHeaderGreen}>📢 Meeting Content & Facilitation</div>
              <div style={styles.sectionBody}>
                <CriteriaItem
                  label="Safety/Weather Concerns Discussed"
                  name="safety_concerns"
                  value={formData.safety_concerns}
                  onChange={handleChange}
                />
                <CriteriaItem
                  label="Daily Tasks & Scope Reviewed"
                  name="daily_tasks"
                  value={formData.daily_tasks}
                  onChange={handleChange}
                />
                <CriteriaItem
                  label="What & How Questions Asked"
                  name="what_how_questions"
                  value={formData.what_how_questions}
                  onChange={handleChange}
                />
                <div style={{ ...styles.formRow, marginTop: '12px' }}>
                  <div style={styles.formGroupFull}>
                    <label style={styles.label}>Facilitation Comments</label>
                    <textarea
                      name="facilitation_comments"
                      value={formData.facilitation_comments}
                      onChange={handleChange}
                      placeholder="Comments on meeting facilitation quality..."
                      style={styles.textarea}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SAFETY TOPICS SECTION */}
            <div style={styles.section}>
              <div style={styles.sectionHeaderPurple}>⚠️ Safety Topics Coverage</div>
              <div style={styles.sectionBody}>
                <CriteriaItem
                  label="Hazards Identified & Addressed"
                  name="hazards_addressed"
                  value={formData.hazards_addressed}
                  onChange={handleChange}
                />
                <CriteriaItem
                  label="Stop the Job Requirements Addressed"
                  name="stop_the_job"
                  value={formData.stop_the_job}
                  onChange={handleChange}
                />
                <CriteriaItem
                  label="Recent Incidents/Near Misses Discussed"
                  name="incidents_discussed"
                  value={formData.incidents_discussed}
                  onChange={handleChange}
                />
                <CriteriaItem
                  label="Lessons Learned Discussed"
                  name="lessons_learned"
                  value={formData.lessons_learned}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* MEETING ENVIRONMENT SECTION */}
            <div style={styles.section}>
              <div style={styles.sectionHeaderOrange}>🏢 Meeting Environment</div>
              <div style={styles.sectionBody}>
                <CriteriaItem
                  label="Facilitator Prepared"
                  name="facilitator_prepared"
                  value={formData.facilitator_prepared}
                  onChange={handleChange}
                />
                <CriteriaItem
                  label="Meeting Space Adequate"
                  name="meeting_space"
                  value={formData.meeting_space}
                  onChange={handleChange}
                />
                <CriteriaItem
                  label="Environment Not Distracting"
                  name="environment_ok"
                  value={formData.environment_ok}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* OVERALL SCORE SECTION */}
            <div style={styles.section}>
              <div style={styles.sectionHeaderBlue}>📊 Overall Meeting Quality Score</div>
              <div style={styles.sectionBody}>
                <div style={styles.formRow}>
                  <div style={styles.formGroupFull}>
                    <label style={{ ...styles.label, textAlign: 'center', marginBottom: '15px' }}>
                      Select Overall Grade <span style={styles.required}>*</span>
                    </label>
                    <div style={styles.gradeSelector}>
                      {QUALITY_SCORES.map(grade => {
                        const isSelected = formData.quality_score === grade.value
                        return (
                          <div key={grade.letter} style={styles.gradeOption}>
                            <input
                              type="radio"
                              id={`grade_${grade.letter.toLowerCase()}`}
                              name="quality_score"
                              value={grade.value}
                              checked={isSelected}
                              onChange={handleChange}
                              required
                              style={styles.gradeInput}
                            />
                            <label
                              htmlFor={`grade_${grade.letter.toLowerCase()}`}
                              style={{
                                ...styles.gradeLabel,
                                ...(isSelected ? {
                                  borderColor: grade.color,
                                  background: grade.color,
                                  color: 'white'
                                } : {})
                              }}
                            >
                              <span style={styles.gradeLetter}>{grade.letter}</span>
                              <span style={isSelected ? styles.gradeDescSelected : styles.gradeDesc}>
                                {grade.desc}
                              </span>
                            </label>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* IMPROVEMENT SECTION */}
            <div style={styles.section}>
              <div style={styles.sectionHeaderCyan}>💡 Improvement Opportunities</div>
              <div style={styles.sectionBody}>
                <div style={styles.formRow}>
                  <div style={styles.formGroupFull}>
                    <label style={styles.label}>Opportunities for Improvement</label>
                    <textarea
                      name="improvement_opportunities"
                      value={formData.improvement_opportunities}
                      onChange={handleChange}
                      placeholder="Document any areas where the toolbox meeting could be improved..."
                      style={styles.textarea}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* PHOTO SECTION */}
            <MultiPhotoUpload ref={photoRef} formType="toolbox-meeting-assessment" />


            <button
              type="submit"
              disabled={isSubmitting}
              style={isSubmitting ? styles.submitBtnDisabled : styles.submitBtn}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Assessment'}
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

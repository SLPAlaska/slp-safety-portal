'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://iypezirwdlqpptjpeeyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
)

const COMPANIES = ['A-C Electric','AKE-Line','Apache Corp.','Armstrong Oil & Gas','ASRC Energy Services','CCI- Industrial','Chosen Construction','CINGSA','Coho Enterprises','Conam Construction','ConocoPhillips','Five Star Oilfield Services','Fox Energy Services','G.A. West','GBR Equipment','GLM Energy Services','Graham Industrial Coatings','Harvest Midstream','Hilcorp Alaska','MagTec Alaska','Merkes Builders','Nordic-Calista','Parker TRS','Peninsula Paving','Pollard Wireline','Ridgeline Oilfield Services','Santos','Summit Excavation','Tesoro Refinery','Yellowjacket','Other']

const LOCATIONS = ['Kenai','CIO','Beaver Creek','Swanson River','Ninilchik','Nikiski','Other Kenai Asset','Deadhorse','Prudhoe Bay','Kuparuk','Alpine','Willow','ENI','PIKKA','Point Thompson','North Star Island','Endicott','Badami','Other North Slope']

const YES_NO_NA = ['Yes', 'No', 'N/A']

const WELD_TYPES = [
  'MIG Welding - Carbon Steel',
  'MIG Welding - Stainless Steel',
  'MIG Welding - Aluminum',
  'TIG Welding - Carbon Steel',
  'TIG Welding - Stainless Steel',
  'TIG Welding - Aluminum',
  'Stick Welding (SMAW)',
  'Flux Core (FCAW)',
  'Grinding - Metal',
  'Cutting - Torch/Plasma',
  'Brazing/Soldering',
  'Other'
]

const OVERALL_SCORES = [
  { value: 'A - Excellent (90-100%)', letter: 'A', desc: 'Excellent', color: '#22c55e' },
  { value: 'B - Good (80-89%)', letter: 'B', desc: 'Good', color: '#84cc16' },
  { value: 'C - Average (70-79%)', letter: 'C', desc: 'Average', color: '#f59e0b' },
  { value: 'D - Below Average (60-69%)', letter: 'D', desc: 'Below Avg', color: '#f97316' },
  { value: 'F - Failing (Below 60%)', letter: 'F', desc: 'Failing', color: '#dc2626' }
]

export default function WeldingGrindingAudit() {
  const [formData, setFormData] = useState({
    auditor_name: '',
    date: new Date().toISOString().split('T')[0],
    company: '',
    location: '',
    weld_type: '',
    sufficient_ventilation: '',
    engineering_controls: '',
    adequate_ppe: '',
    hot_work_permit: '',
    confined_space: '',
    flammables_secured: '',
    firewatch_present: '',
    overhead_sparks_controlled: '',
    overhead_controls: '',
    twenty_foot_rule: '',
    fr_clothing: '',
    tools_condition: '',
    cords_routed: '',
    cylinders_stored: '',
    obvious_violations: '',
    violative_conditions: '',
    issues_discussed: '',
    sail_log_added: '',
    corrective_actions: '',
    overall_score: ''
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
        const filePath = `welding-grinding-audit/${fileName}`

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
        .from('welding_grinding_audit')
        .insert([{
          ...formData,
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
      weld_type: '',
      sufficient_ventilation: '',
      engineering_controls: '',
      adequate_ppe: '',
      hot_work_permit: '',
      confined_space: '',
      flammables_secured: '',
      firewatch_present: '',
      overhead_sparks_controlled: '',
      overhead_controls: '',
      twenty_foot_rule: '',
      fr_clothing: '',
      tools_condition: '',
      cords_routed: '',
      cylinders_stored: '',
      obvious_violations: '',
      violative_conditions: '',
      issues_discussed: '',
      sail_log_added: '',
      corrective_actions: '',
      overall_score: ''
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
      background: 'linear-gradient(135deg, #f97316 0%, #b91c1c 100%)',
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
      color: '#b91c1c',
      padding: '6px 16px',
      borderRadius: '20px',
      fontWeight: '700',
      fontSize: '0.85rem',
      marginBottom: '15px',
      border: '3px solid white',
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
      padding: '10px 18px',
      fontWeight: '600',
      fontSize: '0.95rem'
    },
    sectionHeaderGreen: {
      background: 'linear-gradient(135deg, #059669, #047857)',
      color: 'white',
      padding: '10px 18px',
      fontWeight: '600',
      fontSize: '0.95rem'
    },
    sectionHeaderRed: {
      background: 'linear-gradient(135deg, #b91c1c, #dc2626)',
      color: 'white',
      padding: '10px 18px',
      fontWeight: '600',
      fontSize: '0.95rem'
    },
    sectionHeaderOrange: {
      background: 'linear-gradient(135deg, #f97316, #ea580c)',
      color: 'white',
      padding: '10px 18px',
      fontWeight: '600',
      fontSize: '0.95rem'
    },
    sectionHeaderSlate: {
      background: 'linear-gradient(135deg, #475569, #334155)',
      color: 'white',
      padding: '10px 18px',
      fontWeight: '600',
      fontSize: '0.95rem'
    },
    sectionHeaderPurple: {
      background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
      color: 'white',
      padding: '10px 18px',
      fontWeight: '600',
      fontSize: '0.95rem'
    },
    sectionHeaderCyan: {
      background: 'linear-gradient(135deg, #0891b2, #0e7490)',
      color: 'white',
      padding: '10px 18px',
      fontWeight: '600',
      fontSize: '0.95rem'
    },
    sectionBody: {
      padding: '15px',
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
      marginBottom: '5px',
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
    auditItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      background: 'white',
      padding: '10px 15px',
      borderRadius: '8px',
      border: '1px solid #e5e7eb',
      marginBottom: '8px'
    },
    auditLabel: {
      flex: 1,
      fontWeight: '600',
      color: '#374151',
      fontSize: '0.85rem',
      paddingRight: '10px'
    },
    auditSelect: {
      width: '100px',
      padding: '6px 8px',
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
      padding: '12px 18px',
      border: '3px solid #d1d5db',
      borderRadius: '12px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      minWidth: '70px',
      background: 'white'
    },
    gradeLetter: {
      fontSize: '1.6rem',
      fontWeight: '700'
    },
    gradeDesc: {
      fontSize: '0.65rem',
      color: '#6b7280'
    },
    gradeDescSelected: {
      fontSize: '0.65rem',
      color: 'white'
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
      background: 'linear-gradient(135deg, #f97316, #b91c1c)',
      color: 'white',
      border: 'none',
      borderRadius: '10px',
      fontSize: '1.05rem',
      fontWeight: '600',
      cursor: 'pointer',
      boxShadow: '0 4px 15px rgba(249, 115, 22, 0.3)'
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
      borderTop: '5px solid #f97316',
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

  const AuditItem = ({ label, name }) => (
    <div style={styles.auditItem}>
      <label style={styles.auditLabel}>{label}</label>
      <select
        name={name}
        value={formData[name]}
        onChange={handleChange}
        style={styles.auditSelect}
      >
        <option value="">Select...</option>
        {YES_NO_NA.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  )

  if (isSuccess) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1e3a8a 0%, #f97316 100%)', padding: '20px' }}>
        <a href="/" style={styles.backButton}>← Back to Portal</a>
        <div style={styles.container}>
          <div style={styles.header}>
            <div style={styles.logoContainer}>
              <img src="/Logo.png" alt="SLP Alaska" style={styles.logo} />
            </div>
            <div style={styles.badge}>⚡ WELDING / GRINDING</div>
            <h1 style={styles.title}>Welding/Grinding Audit</h1>
            <p style={styles.subtitle}>SLP Alaska Safety Management System</p>
          </div>
          <div style={styles.successMessage}>
            <div style={styles.successIcon}>✅</div>
            <h2 style={styles.successTitle}>Audit Submitted Successfully!</h2>
            <p>Your welding/grinding audit has been recorded.</p>
            <button style={styles.newFormBtn} onClick={resetForm}>Submit Another Audit</button>
          </div>
          <div style={styles.footer}>
            <span style={styles.trademark}>Powered by Predictive Safety Analytics™</span>
            <span style={styles.divider}>|</span>
            <span style={styles.copyright}>© 2025 SLP Alaska</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1e3a8a 0%, #f97316 100%)', padding: '20px' }}>
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
          <div style={styles.badge}>⚡ WELDING / GRINDING</div>
          <h1 style={styles.title}>Welding/Grinding Audit</h1>
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
                <div style={styles.formRow}>
                  <div style={styles.formGroupFull}>
                    <label style={styles.label}>Type of Weld/Material being Welded <span style={styles.required}>*</span></label>
                    <select name="weld_type" value={formData.weld_type} onChange={handleChange} required style={styles.input}>
                      <option value="">Select Type...</option>
                      {WELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* VENTILATION & PPE SECTION */}
            <div style={styles.section}>
              <div style={styles.sectionHeaderGreen}>🛡️ Ventilation & PPE</div>
              <div style={styles.sectionBody}>
                <AuditItem label="Sufficient Ventilation" name="sufficient_ventilation" />
                <div style={{ ...styles.formRow, marginTop: '10px' }}>
                  <div style={styles.formGroupFull}>
                    <label style={styles.label}>List of Useful Engineering Controls</label>
                    <textarea
                      name="engineering_controls"
                      value={formData.engineering_controls}
                      onChange={handleChange}
                      placeholder="Describe engineering controls in use..."
                      style={styles.textarea}
                    />
                  </div>
                </div>
                <div style={{ marginTop: '10px' }}>
                  <AuditItem label="Adequate PPE in Use" name="adequate_ppe" />
                </div>
                <AuditItem label="All Workers Wearing Adequate FR Clothing" name="fr_clothing" />
              </div>
            </div>

            {/* HOT WORK & PERMITS SECTION */}
            <div style={styles.section}>
              <div style={styles.sectionHeaderRed}>🔥 Hot Work & Permits</div>
              <div style={styles.sectionBody}>
                <AuditItem label="Hot Work Permit Complete & In Use" name="hot_work_permit" />
                <AuditItem label="Is This a Confined Space?" name="confined_space" />
                <AuditItem label="Flammable Materials Adequately Secured" name="flammables_secured" />
                <AuditItem label="Firewatch Present & Engaged" name="firewatch_present" />
              </div>
            </div>

            {/* SPARKS & DEBRIS SECTION */}
            <div style={styles.section}>
              <div style={styles.sectionHeaderOrange}>✨ Sparks & Debris Control</div>
              <div style={styles.sectionBody}>
                <AuditItem label="Overhead Sparks & Debris Controlled" name="overhead_sparks_controlled" />
                <div style={{ ...styles.formRow, marginTop: '10px' }}>
                  <div style={styles.formGroupFull}>
                    <label style={styles.label}>List Controls for Overhead Sparks/Debris</label>
                    <textarea
                      name="overhead_controls"
                      value={formData.overhead_controls}
                      onChange={handleChange}
                      placeholder="Describe controls being used..."
                      style={styles.textarea}
                    />
                  </div>
                </div>
                <div style={{ marginTop: '10px' }}>
                  <AuditItem label="20 ft Rule Followed by Workers in Proximity" name="twenty_foot_rule" />
                </div>
              </div>
            </div>

            {/* EQUIPMENT SECTION */}
            <div style={styles.section}>
              <div style={styles.sectionHeaderSlate}>🔧 Equipment & Tools</div>
              <div style={styles.sectionBody}>
                <AuditItem label="Tools in Adequate Manufactured Condition" name="tools_condition" />
                <AuditItem label="Cords/Leads Routed to Prevent Trips" name="cords_routed" />
                <AuditItem label="Compressed Gas Cylinders Adequately Stored" name="cylinders_stored" />
              </div>
            </div>

            {/* VIOLATIONS SECTION */}
            <div style={styles.section}>
              <div style={styles.sectionHeaderPurple}>⚠️ Violations & Issues</div>
              <div style={styles.sectionBody}>
                <AuditItem label="Are There Any Obvious Violations?" name="obvious_violations" />
                <div style={{ ...styles.formRow, marginTop: '10px' }}>
                  <div style={styles.formGroupFull}>
                    <label style={styles.label}>List the Violative Conditions</label>
                    <textarea
                      name="violative_conditions"
                      value={formData.violative_conditions}
                      onChange={handleChange}
                      placeholder="Describe any violations found..."
                      style={styles.textarea}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* FOLLOW-UP SECTION */}
            <div style={styles.section}>
              <div style={styles.sectionHeaderCyan}>📝 Follow-Up Actions</div>
              <div style={styles.sectionBody}>
                <AuditItem label="Issues Discussed with Crew" name="issues_discussed" />
                <AuditItem label="Any Items Added to SAIL Log" name="sail_log_added" />
                <div style={{ ...styles.formRow, marginTop: '10px' }}>
                  <div style={styles.formGroupFull}>
                    <label style={styles.label}>Corrective Actions Implemented</label>
                    <textarea
                      name="corrective_actions"
                      value={formData.corrective_actions}
                      onChange={handleChange}
                      placeholder="Describe any corrective actions taken..."
                      style={styles.textarea}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* OVERALL SCORE SECTION */}
            <div style={styles.section}>
              <div style={styles.sectionHeaderBlue}>📊 Overall Audit Score</div>
              <div style={styles.sectionBody}>
                <div style={styles.formRow}>
                  <div style={styles.formGroupFull}>
                    <label style={{ ...styles.label, textAlign: 'center', marginBottom: '15px' }}>
                      Select Overall Grade <span style={styles.required}>*</span>
                    </label>
                    <div style={styles.gradeSelector}>
                      {OVERALL_SCORES.map(grade => {
                        const isSelected = formData.overall_score === grade.value
                        return (
                          <div key={grade.letter} style={styles.gradeOption}>
                            <input
                              type="radio"
                              id={`grade_${grade.letter.toLowerCase()}`}
                              name="overall_score"
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

            {/* PHOTO SECTION */}
            <div style={styles.section}>
              <div style={styles.sectionHeaderOrange}>📸 Photo Documentation</div>
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
              {isSubmitting ? 'Submitting...' : 'Submit Welding/Grinding Audit'}
            </button>
          </form>
        </div>

        <div style={styles.footer}>
          <span style={styles.trademark}>Powered by Predictive Safety Analytics™</span>
          <span style={styles.divider}>|</span>
          <span style={styles.copyright}>© 2025 SLP Alaska</span>
        </div>
      </div>
    </div>
  )
}

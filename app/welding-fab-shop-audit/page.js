'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://iypezirwdlqpptjpeeyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
)

const COMPANIES = ['A-C Electric','AKE-Line','Apache Corp.','Armstrong Oil & Gas','ASRC Energy Services','CCI- Industrial','Chosen Construction','CINGSA','Coho Enterprises','Conam Construction','ConocoPhillips','Five Star Oilfield Services','Fox Energy Services','G.A. West','GBR Equipment','GLM Energy Services','Graham Industrial Coatings','Harvest Midstream','Hilcorp Alaska','MagTec Alaska','Merkes Builders','Nordic-Calista','Parker TRS','Peninsula Paving','Pollard Wireline','Ridgeline Oilfield Services','Santos','Summit Excavation','Tesoro Refinery','Yellowjacket','Other']

const LOCATIONS = ['Kenai','CIO','Beaver Creek','Swanson River','Ninilchik','Nikiski','Other Kenai Asset','Deadhorse','Prudhoe Bay','Kuparuk','Alpine','Willow','ENI','PIKKA','Point Thompson','North Star Island','Endicott','Badami','Other North Slope']

const AUDIT_RESPONSES = ['Yes', 'No', 'Needs Improvement', 'N/A']

const AUDIT_QUESTIONS = {
  chemical: [
    { id: 'access_sds', text: 'Access to SDS for Chemicals' },
    { id: 'chemical_training', text: 'Adequate Training on Chemical Handling' },
    { id: 'osha_posters', text: 'OSHA Workplace Posters Displayed' },
    { id: 'emergency_plan', text: 'Written Emergency Action Plan in Place' },
    { id: 'flammable_storage', text: 'Proper Storage of Flammable Liquids Maintained' }
  ],
  fire: [
    { id: 'fire_extinguishers', text: 'Working Fire Extinguishers Readily Available' },
    { id: 'fire_ext_inspection', text: 'Fire Extinguisher Have Current Inspection & Cert' },
    { id: 'smoking_areas', text: 'Smoking in Designated Areas Only' },
    { id: 'evacuation_routes', text: 'Emergency Evacuation Routes Visible & Communicated' }
  ],
  ventilation: [
    { id: 'proper_ventilation', text: 'Proper Ventilation Where Required' },
    { id: 'appropriate_ppe', text: 'Appropriate PPE Provided and Used' },
    { id: 'respiratory_protection', text: 'Respiratory Protection & LEV in Use When Necessary' }
  ],
  equipment: [
    { id: 'lifting_equipment', text: 'Lifting Equipment is Inspected & Maintained' },
    { id: 'jack_stands', text: 'Rated Jack Stands In Use As Needed' },
    { id: 'hand_power_tools', text: 'Hand/Power Tools Maintained & Inspected' },
    { id: 'grinder_guards', text: 'Guards are in Place on Grinders and Similar Equip' },
    { id: 'compressed_air_tools', text: 'Compressed Air Tools W/Safety Nozzles' },
    { id: 'electrical_equipment', text: 'Electrical Equipment Maintained & Inspected' }
  ],
  electrical: [
    { id: 'gfci_use', text: 'Use of GFCI is Evident' },
    { id: 'exhaust_extraction', text: 'Exhaust Extraction System Inspected & Cleaned' },
    { id: 'co_monitoring', text: 'Carbon Monoxide Monitoring In Place' },
    { id: 'noise_levels', text: 'Noise Levels Evaluated & Documented' }
  ],
  personnel: [
    { id: 'hearing_protection', text: 'Hearing Protection Provided & Used' },
    { id: 'body_mechanics', text: 'Safe Body Mechanics In Practice' },
    { id: 'cpr_first_aid', text: 'At Least 1 Employee is Trained in CPR/1st Aid' },
    { id: 'walking_surfaces', text: 'Walking Working Surfaces are Clean & Dry & Clear' }
  ]
}

export default function WeldingFabShopAudit() {
  const [formData, setFormData] = useState({
    auditor_name: '',
    date: new Date().toISOString().split('T')[0],
    company: '',
    location: '',
    // Chemical
    access_sds: '',
    chemical_training: '',
    osha_posters: '',
    emergency_plan: '',
    flammable_storage: '',
    // Fire
    fire_extinguishers: '',
    fire_ext_inspection: '',
    smoking_areas: '',
    evacuation_routes: '',
    // Ventilation
    proper_ventilation: '',
    appropriate_ppe: '',
    respiratory_protection: '',
    // Equipment
    lifting_equipment: '',
    jack_stands: '',
    hand_power_tools: '',
    grinder_guards: '',
    compressed_air_tools: '',
    electrical_equipment: '',
    // Electrical
    gfci_use: '',
    exhaust_extraction: '',
    co_monitoring: '',
    noise_levels: '',
    // Personnel
    hearing_protection: '',
    body_mechanics: '',
    cpr_first_aid: '',
    walking_surfaces: '',
    // Improvements
    opportunities: ''
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
        const filePath = `welding-fab-shop-audit/${fileName}`

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
        .from('welding_fab_shop_audit')
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
      access_sds: '',
      chemical_training: '',
      osha_posters: '',
      emergency_plan: '',
      flammable_storage: '',
      fire_extinguishers: '',
      fire_ext_inspection: '',
      smoking_areas: '',
      evacuation_routes: '',
      proper_ventilation: '',
      appropriate_ppe: '',
      respiratory_protection: '',
      lifting_equipment: '',
      jack_stands: '',
      hand_power_tools: '',
      grinder_guards: '',
      compressed_air_tools: '',
      electrical_equipment: '',
      gfci_use: '',
      exhaust_extraction: '',
      co_monitoring: '',
      noise_levels: '',
      hearing_protection: '',
      body_mechanics: '',
      cpr_first_aid: '',
      walking_surfaces: '',
      opportunities: ''
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
      maxWidth: '950px',
      margin: '0 auto',
      background: 'white',
      borderRadius: '16px',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
      overflow: 'hidden'
    },
    header: {
      background: 'linear-gradient(135deg, #1e3a8a 0%, #f97316 100%)',
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
      color: '#f97316',
      padding: '6px 16px',
      borderRadius: '20px',
      fontWeight: '700',
      fontSize: '0.85rem',
      marginBottom: '15px',
      border: '3px solid #f97316',
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
    sectionHeaderOrange: {
      background: 'linear-gradient(135deg, #f97316, #ea580c)',
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
    sectionHeaderGreen: {
      background: 'linear-gradient(135deg, #059669, #047857)',
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
      minHeight: '80px',
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
      fontSize: '0.8rem',
      paddingRight: '10px'
    },
    auditSelect: {
      width: '130px',
      padding: '6px 8px',
      fontSize: '0.8rem',
      border: '2px solid #d1d5db',
      borderRadius: '8px',
      background: 'white'
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

  const AuditItem = ({ id, text }) => (
    <div style={styles.auditItem}>
      <label style={styles.auditLabel}>{text}</label>
      <select
        name={id}
        value={formData[id]}
        onChange={handleChange}
        style={styles.auditSelect}
      >
        <option value="">Select...</option>
        {AUDIT_RESPONSES.map(opt => <option key={opt} value={opt}>{opt}</option>)}
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
            <div style={styles.badge}>🔥 WELDING/FAB SHOP</div>
            <h1 style={styles.title}>Welding/Fab Shop Audit</h1>
            <p style={styles.subtitle}>SLP Alaska Safety Management System</p>
          </div>
          <div style={styles.successMessage}>
            <div style={styles.successIcon}>✅</div>
            <h2 style={styles.successTitle}>Audit Submitted Successfully!</h2>
            <p>Your welding/fab shop audit has been recorded.</p>
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
          <div style={styles.badge}>🔥 WELDING/FAB SHOP</div>
          <h1 style={styles.title}>Welding/Fab Shop Audit</h1>
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

            {/* CHEMICAL & EMERGENCY SECTION */}
            <div style={styles.section}>
              <div style={styles.sectionHeaderOrange}>🧪 Chemical Safety & Emergency</div>
              <div style={styles.sectionBody}>
                {AUDIT_QUESTIONS.chemical.map(q => (
                  <AuditItem key={q.id} id={q.id} text={q.text} />
                ))}
              </div>
            </div>

            {/* FIRE SAFETY SECTION */}
            <div style={styles.section}>
              <div style={styles.sectionHeaderRed}>🔥 Fire Safety</div>
              <div style={styles.sectionBody}>
                {AUDIT_QUESTIONS.fire.map(q => (
                  <AuditItem key={q.id} id={q.id} text={q.text} />
                ))}
              </div>
            </div>

            {/* VENTILATION & PPE SECTION */}
            <div style={styles.section}>
              <div style={styles.sectionHeaderGreen}>🛡️ Ventilation & PPE</div>
              <div style={styles.sectionBody}>
                {AUDIT_QUESTIONS.ventilation.map(q => (
                  <AuditItem key={q.id} id={q.id} text={q.text} />
                ))}
              </div>
            </div>

            {/* EQUIPMENT SECTION */}
            <div style={styles.section}>
              <div style={styles.sectionHeaderSlate}>🔧 Equipment & Tools</div>
              <div style={styles.sectionBody}>
                {AUDIT_QUESTIONS.equipment.map(q => (
                  <AuditItem key={q.id} id={q.id} text={q.text} />
                ))}
              </div>
            </div>

            {/* ELECTRICAL & AIR QUALITY SECTION */}
            <div style={styles.section}>
              <div style={styles.sectionHeaderPurple}>⚡ Electrical & Air Quality</div>
              <div style={styles.sectionBody}>
                {AUDIT_QUESTIONS.electrical.map(q => (
                  <AuditItem key={q.id} id={q.id} text={q.text} />
                ))}
              </div>
            </div>

            {/* PERSONNEL SAFETY SECTION */}
            <div style={styles.section}>
              <div style={styles.sectionHeaderCyan}>👷 Personnel Safety</div>
              <div style={styles.sectionBody}>
                {AUDIT_QUESTIONS.personnel.map(q => (
                  <AuditItem key={q.id} id={q.id} text={q.text} />
                ))}
              </div>
            </div>

            {/* IMPROVEMENTS SECTION */}
            <div style={styles.section}>
              <div style={styles.sectionHeaderBlue}>💡 Improvements</div>
              <div style={styles.sectionBody}>
                <div style={styles.formRow}>
                  <div style={styles.formGroupFull}>
                    <label style={styles.label}>Opportunities for Improvement</label>
                    <textarea
                      name="opportunities"
                      value={formData.opportunities}
                      onChange={handleChange}
                      placeholder="Document any areas where the shop could improve safety..."
                      style={styles.textarea}
                    />
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
              {isSubmitting ? 'Submitting...' : 'Submit Welding/Fab Shop Audit'}
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

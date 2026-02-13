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

const SEVERITY_LEVELS = [
  '1 - Minor (First Aid)',
  '2 - Moderate (Medical Treatment)',
  '3 - Serious (Lost Time Injury)',
  '4 - Major (Permanent Disability)',
  '5 - Catastrophic (Fatality)'
]

const PROBABILITY_LEVELS = [
  'A - Almost Certain',
  'B - Likely',
  'C - Possible',
  'D - Unlikely',
  'E - Rare'
]

const ENERGY_TYPES = [
  { value: 'Gravity', icon: '⬇️', label: 'Gravity', sublabel: 'Falls, drops, collapse' },
  { value: 'Motion', icon: '🚗', label: 'Motion', sublabel: 'Vehicles, moving equipment' },
  { value: 'Mechanical', icon: '⚙️', label: 'Mechanical', sublabel: 'Rotating, pinch points' },
  { value: 'Electrical', icon: '⚡', label: 'Electrical', sublabel: 'Shock, arc flash' },
  { value: 'Pressure', icon: '💨', label: 'Pressure', sublabel: 'Hydraulic, pneumatic, gas' },
  { value: 'Chemical', icon: '☠️', label: 'Chemical', sublabel: 'Toxic, corrosive, flammable' },
  { value: 'Temperature', icon: '🔥', label: 'Temperature', sublabel: 'Burns, cold exposure' },
  { value: 'Stored', icon: '🔋', label: 'Stored Energy', sublabel: 'Springs, capacitors' }
]

const CONTROL_TYPES = [
  { value: 'Elimination', icon: '🚫', label: 'Elimination' },
  { value: 'Substitution', icon: '🔄', label: 'Substitution' },
  { value: 'Engineering', icon: '🔧', label: 'Engineering' },
  { value: 'Guarding', icon: '🚧', label: 'Guarding' },
  { value: 'LOTO', icon: '🔒', label: 'LOTO/Isolation' },
  { value: 'Warnings', icon: '⚠️', label: 'Warnings/Signs' },
  { value: 'Procedures', icon: '📋', label: 'Procedures' },
  { value: 'PPE', icon: '🦺', label: 'PPE' }
]

const SAFE_TO_PROCEED_OPTIONS = [
  { value: 'Yes - Safe to Proceed', label: '✅ Yes - Safe to Proceed', type: 'yes' },
  { value: 'Conditional - With Additional Controls', label: '⚠️ Conditional - With Controls', type: 'conditional' },
  { value: 'No - Stop Work', label: '🛑 No - Stop Work', type: 'no' }
]

export default function StopTake5Page() {
  const [formData, setFormData] = useState({
    name: '',
    date: new Date().toISOString().split('T')[0],
    company: '',
    location: '',
    task_description: '',
    describe_hazards: '',
    describe_risks: '',
    describe_controls: '',
    severity_consequence: '',
    probability: '',
    safe_to_proceed: ''
  })

  const [selectedEnergy, setSelectedEnergy] = useState([])
  const [selectedControls, setSelectedControls] = useState([])
  const [riskLevel, setRiskLevel] = useState('')
  const [riskClass, setRiskClass] = useState('')
  const photoRef = useRef();
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))

    if (name === 'severity_consequence' || name === 'probability') {
      calculateRisk(
        name === 'severity_consequence' ? value : formData.severity_consequence,
        name === 'probability' ? value : formData.probability
      )
    }
  }

  const calculateRisk = (severity, probability) => {
    if (!severity || !probability) {
      setRiskLevel('Select severity and probability to calculate risk level')
      setRiskClass('')
      return
    }

    const sevNum = parseInt(severity.charAt(0)) || 0
    const probMap = { 'A': 5, 'B': 4, 'C': 3, 'D': 2, 'E': 1 }
    const probNum = probMap[probability.charAt(0)] || 0
    const riskScore = sevNum * probNum

    if (riskScore >= 15) {
      setRiskLevel('🛑 HIGH RISK - Stop Work, Additional Controls Required')
      setRiskClass('high')
    } else if (riskScore >= 8) {
      setRiskLevel('⚠️ MEDIUM RISK - Additional Controls Required')
      setRiskClass('medium')
    } else {
      setRiskLevel('✅ LOW/MINIMAL RISK - Proceed with Caution')
      setRiskClass('low')
    }
  }

  const getRiskLevelText = () => {
    if (!formData.severity_consequence || !formData.probability) return ''
    const sevNum = parseInt(formData.severity_consequence.charAt(0)) || 0
    const probMap = { 'A': 5, 'B': 4, 'C': 3, 'D': 2, 'E': 1 }
    const probNum = probMap[formData.probability.charAt(0)] || 0
    const riskScore = sevNum * probNum

    if (riskScore >= 15) return 'HIGH - Stop Work'
    if (riskScore >= 8) return 'MEDIUM - Additional Controls Required'
    if (riskScore >= 4) return 'LOW - Proceed with Caution'
    return 'MINIMAL - Proceed'
  }

  const toggleEnergy = (value) => {
    setSelectedEnergy(prev =>
      prev.includes(value) ? prev.filter(e => e !== value) : [...prev, value]
    )
  }

  const toggleControl = (value) => {
    setSelectedControls(prev =>
      prev.includes(value) ? prev.filter(c => c !== value) : [...prev, value]
    )
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

      const calculatedRiskLevel = getRiskLevelText()

      const { error } = await supabase
        .from('stop_take_5')
        .insert([{
          ...formData,
          energy_types: selectedEnergy.join(', '),
          control_types: selectedControls.join(', '),
          risk_level: calculatedRiskLevel,
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
      name: '',
      date: new Date().toISOString().split('T')[0],
      company: '',
      location: '',
      task_description: '',
      describe_hazards: '',
      describe_risks: '',
      describe_controls: '',
      severity_consequence: '',
      probability: '',
      safe_to_proceed: ''
    })
    setSelectedEnergy([])
    setSelectedControls([])
    setRiskLevel('')
    setRiskClass('')
    if (photoRef.current) photoRef.current.reset();
    setSubmitted(false)
  }

  if (submitted) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.successMessage}>
            <div style={styles.successIcon}>✅</div>
            <h2 style={styles.successTitle}>Assessment Submitted Successfully!</h2>
            <p style={styles.successText}>Your STOP & Take 5 risk assessment has been recorded.</p>
            <button onClick={resetForm} style={styles.newFormBtn}>
              Submit Another Assessment
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
          <div style={styles.stopBadge}>🛑 STOP & TAKE 5</div>
          <h1 style={styles.title}>Risk Assessment</h1>
          <p style={styles.subtitle}>SLP Alaska Safety Management System</p>
        </div>

        <div style={styles.formContent}>
          {/* STOP Steps */}
          <div style={styles.stopSteps}>
            {['STOP', 'THINK', 'OBSERVE', 'PLAN', 'PROCEED'].map((step, idx) => (
              <div key={step} style={styles.stopStep}>
                <span style={styles.stepNumber}>{idx + 1}</span>
                <span style={styles.stepText}>{step}</span>
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {/* BASIC INFO SECTION */}
            <div style={styles.section}>
              <div style={{...styles.sectionHeader, ...styles.sectionHeaderBlue}}>
                📋 Basic Information
              </div>
              <div style={styles.sectionBody}>
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      Your Name <span style={styles.required}>*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
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
                <div style={styles.formRow}>
                  <div style={{...styles.formGroup, gridColumn: '1 / -1'}}>
                    <label style={styles.label}>
                      Task/Job Description <span style={styles.required}>*</span>
                    </label>
                    <input
                      type="text"
                      name="task_description"
                      value={formData.task_description}
                      onChange={handleInputChange}
                      required
                      placeholder="What task are you about to perform?"
                      style={styles.input}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ENERGY WHEEL SECTION */}
            <div style={styles.section}>
              <div style={{...styles.sectionHeader, ...styles.sectionHeaderRed}}>
                ⚡ Energy Wheel - Identify High Energy Sources
              </div>
              <div style={styles.sectionBody}>
                <div style={styles.energyWheelSection}>
                  <div style={styles.energyWheelTitle}>⚡ What ENERGY TYPES are present in this task?</div>
                  <div style={styles.energyWheelSubtitle}>Select all energy sources that could cause serious injury if released uncontrolled.</div>

                  <div style={styles.energyGrid}>
                    {ENERGY_TYPES.map(energy => (
                      <div
                        key={energy.value}
                        style={{
                          ...styles.energyItem,
                          ...(selectedEnergy.includes(energy.value) ? styles.energyItemSelected : {})
                        }}
                        onClick={() => toggleEnergy(energy.value)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedEnergy.includes(energy.value)}
                          onChange={() => {}}
                          style={styles.energyCheckbox}
                        />
                        <span style={styles.energyIcon}>{energy.icon}</span>
                        <span style={styles.energyLabel}>
                          {energy.label}<br/>
                          <small style={styles.energySublabel}>{energy.sublabel}</small>
                        </span>
                      </div>
                    ))}
                  </div>

                  <div style={styles.controlTypeSection}>
                    <div style={{...styles.energyWheelTitle, color: '#065f46'}}>🛡️ What CONTROL TYPES will be used?</div>
                    <div style={styles.energyWheelSubtitle}>Select controls in place to manage identified energy sources.</div>

                    <div style={styles.controlTypeGrid}>
                      {CONTROL_TYPES.map(control => (
                        <div
                          key={control.value}
                          style={{
                            ...styles.controlTypeItem,
                            ...(selectedControls.includes(control.value) ? styles.controlTypeItemSelected : {})
                          }}
                          onClick={() => toggleControl(control.value)}
                        >
                          <input
                            type="checkbox"
                            checked={selectedControls.includes(control.value)}
                            onChange={() => {}}
                            style={styles.controlCheckbox}
                          />
                          <span>{control.icon} {control.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {(selectedEnergy.length > 0 || selectedControls.length > 0) && (
                    <div style={styles.energySummary}>
                      <div style={styles.energySummaryTitle}>📊 Energy & Controls Summary</div>
                      <div style={{marginBottom: '8px'}}><strong>Energy Sources:</strong></div>
                      <div style={styles.energyTags}>
                        {selectedEnergy.length > 0 ? selectedEnergy.map(e => (
                          <span key={e} style={styles.energyTag}>⚡ {e}</span>
                        )) : <span style={{color: '#666', fontSize: '0.75rem'}}>None selected</span>}
                      </div>
                      <div style={{margin: '10px 0 8px'}}><strong>Controls in Place:</strong></div>
                      <div style={styles.energyTags}>
                        {selectedControls.length > 0 ? selectedControls.map(c => (
                          <span key={c} style={styles.controlTag}>🛡️ {c}</span>
                        )) : <span style={{color: '#666', fontSize: '0.75rem'}}>None selected</span>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* HAZARD IDENTIFICATION SECTION */}
            <div style={styles.section}>
              <div style={{...styles.sectionHeader, ...styles.sectionHeaderRed}}>
                ⚠️ Step 1-3: Identify Hazards
              </div>
              <div style={styles.sectionBody}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Describe the Hazards <span style={styles.required}>*</span>
                  </label>
                  <textarea
                    name="describe_hazards"
                    value={formData.describe_hazards}
                    onChange={handleInputChange}
                    required
                    placeholder="What hazards exist in this work area? (e.g., pinch points, fall hazards, chemical exposure, energized equipment)"
                    style={styles.textarea}
                  />
                </div>
                <div style={{...styles.formGroup, marginTop: '20px'}}>
                  <label style={styles.label}>
                    Describe the Risks <span style={styles.required}>*</span>
                  </label>
                  <textarea
                    name="describe_risks"
                    value={formData.describe_risks}
                    onChange={handleInputChange}
                    required
                    placeholder="What could go wrong? What are the potential consequences?"
                    style={styles.textarea}
                  />
                </div>
              </div>
            </div>

            {/* CONTROLS SECTION */}
            <div style={styles.section}>
              <div style={{...styles.sectionHeader, ...styles.sectionHeaderGreen}}>
                🛡️ Step 4: Plan Controls
              </div>
              <div style={styles.sectionBody}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Describe the Controls <span style={styles.required}>*</span>
                  </label>
                  <textarea
                    name="describe_controls"
                    value={formData.describe_controls}
                    onChange={handleInputChange}
                    required
                    placeholder="What controls will you put in place to eliminate or reduce the risks? (e.g., PPE, barriers, lockout/tagout, spotters)"
                    style={styles.textarea}
                  />
                </div>
              </div>
            </div>

            {/* RISK ASSESSMENT SECTION */}
            <div style={styles.section}>
              <div style={{...styles.sectionHeader, ...styles.sectionHeaderOrange}}>
                📊 Risk Assessment
              </div>
              <div style={styles.sectionBody}>
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      Severity / Consequence <span style={styles.required}>*</span>
                    </label>
                    <select
                      name="severity_consequence"
                      value={formData.severity_consequence}
                      onChange={handleInputChange}
                      required
                      style={styles.select}
                    >
                      <option value="">Select Severity...</option>
                      {SEVERITY_LEVELS.map(level => (
                        <option key={level} value={level}>{level}</option>
                      ))}
                    </select>
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      Probability <span style={styles.required}>*</span>
                    </label>
                    <select
                      name="probability"
                      value={formData.probability}
                      onChange={handleInputChange}
                      required
                      style={styles.select}
                    >
                      <option value="">Select Probability...</option>
                      {PROBABILITY_LEVELS.map(level => (
                        <option key={level} value={level}>{level}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={styles.riskMatrix}>
                  <h4 style={{textAlign: 'center', marginBottom: '15px', color: '#374151'}}>Risk Level Result</h4>
                  <div style={{
                    ...styles.riskResult,
                    ...(riskClass === 'high' ? styles.riskResultHigh :
                        riskClass === 'medium' ? styles.riskResultMedium :
                        riskClass === 'low' ? styles.riskResultLow : {})
                  }}>
                    {riskLevel || 'Select severity and probability to calculate risk level'}
                  </div>
                </div>
              </div>
            </div>

            {/* PROCEED DECISION SECTION */}
            <div style={styles.section}>
              <div style={{...styles.sectionHeader, ...styles.sectionHeaderBlue}}>
                ✅ Step 5: Decision to Proceed
              </div>
              <div style={styles.sectionBody}>
                <label style={{...styles.label, marginBottom: '15px'}}>
                  Is it safe to proceed with the task? <span style={styles.required}>*</span>
                </label>
                <div style={styles.safeProceed}>
                  {SAFE_TO_PROCEED_OPTIONS.map(option => (
                    <label
                      key={option.value}
                      style={{
                        ...styles.safeOption,
                        ...(formData.safe_to_proceed === option.value ?
                          (option.type === 'yes' ? styles.safeOptionYes :
                           option.type === 'conditional' ? styles.safeOptionConditional :
                           styles.safeOptionNo) : {})
                      }}
                    >
                      <input
                        type="radio"
                        name="safe_to_proceed"
                        value={option.value}
                        checked={formData.safe_to_proceed === option.value}
                        onChange={handleInputChange}
                        required
                        style={{display: 'none'}}
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* PHOTO SECTION */}
            <MultiPhotoUpload ref={photoRef} formType="stop-take-5" />


            <button
              type="submit"
              disabled={submitting}
              style={{
                ...styles.submitBtn,
                ...(submitting ? styles.submitBtnDisabled : {})
              }}
            >
              {submitting ? 'Submitting...' : 'Submit STOP & Take 5 Assessment'}
            </button>
          </form>
        </div>

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
    borderRadius: '8px'
  },
  header: {
  background: 'linear-gradient(135deg, #1e3a8a 0%, #b91c1c 100%)',
  color: 'white',
  padding: '30px',
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center'  // This ensures all children are centered
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
  stopBadge: {
  display: 'inline-block',
  background: '#dc2626',
  color: 'white',
  padding: '8px 20px',
  borderRadius: '8px',
  fontWeight: '700',
  fontSize: '1rem',
  marginBottom: '15px',
  border: '3px solid white',
  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
  letterSpacing: '2px',
  margin: '0 auto 15px auto'  // Centers the badge
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
  formContent: {
    padding: '30px'
  },
  stopSteps: {
    display: 'flex',
    justifyContent: 'center',
    gap: '10px',
    marginBottom: '25px',
    flexWrap: 'wrap'
  },
  stopStep: {
    background: 'linear-gradient(135deg, #1e3a8a, #1e40af)',
    color: 'white',
    padding: '12px 20px',
    borderRadius: '10px',
    textAlign: 'center',
    flex: '1',
    minWidth: '100px',
    maxWidth: '150px'
  },
  stepNumber: {
    fontSize: '1.5rem',
    fontWeight: '700',
    display: 'block'
  },
  stepText: {
    fontSize: '0.8rem',
    opacity: '0.9'
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
  sectionHeaderRed: {
    background: 'linear-gradient(135deg, #b91c1c, #dc2626)'
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
    background: 'white',
    outline: 'none'
  },
  select: {
    padding: '12px 14px',
    border: '2px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '1rem',
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
  energyWheelSection: {
    background: 'linear-gradient(135deg, #fef2f2 0%, #fff7ed 100%)',
    border: '2px solid #dc2626',
    borderRadius: '12px',
    padding: '20px'
  },
  energyWheelTitle: {
    color: '#991b1b',
    fontWeight: 'bold',
    fontSize: '1rem',
    marginBottom: '10px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  energyWheelSubtitle: {
    fontSize: '0.85rem',
    color: '#666',
    marginBottom: '15px'
  },
  energyGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '10px',
    marginBottom: '15px'
  },
  energyItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px',
    background: 'white',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  energyItemSelected: {
    borderColor: '#dc2626',
    background: '#fecaca'
  },
  energyCheckbox: {
    width: '18px',
    height: '18px',
    flexShrink: 0
  },
  energyIcon: {
    fontSize: '1.25rem'
  },
  energyLabel: {
    flex: 1,
    fontSize: '0.85rem',
    fontWeight: '500',
    lineHeight: '1.3'
  },
  energySublabel: {
    color: '#666',
    fontWeight: '400'
  },
  controlTypeSection: {
    marginTop: '20px',
    paddingTop: '15px',
    borderTop: '1px solid #fecaca'
  },
  controlTypeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: '8px'
  },
  controlTypeItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px',
    background: 'white',
    border: '2px solid #e5e7eb',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.8rem',
    transition: 'all 0.2s'
  },
  controlTypeItemSelected: {
    borderColor: '#22c55e',
    background: '#d1fae5'
  },
  controlCheckbox: {
    width: '16px',
    height: '16px',
    flexShrink: 0
  },
  energySummary: {
    marginTop: '15px',
    padding: '12px',
    background: 'white',
    borderRadius: '8px',
    border: '1px solid #e5e7eb'
  },
  energySummaryTitle: {
    fontWeight: 'bold',
    fontSize: '0.85rem',
    marginBottom: '8px',
    color: '#991b1b'
  },
  energyTags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px'
  },
  energyTag: {
    background: '#dc2626',
    color: 'white',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '0.7rem',
    fontWeight: '500'
  },
  controlTag: {
    background: '#22c55e',
    color: 'white',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '0.7rem',
    fontWeight: '500'
  },
  riskMatrix: {
    background: 'white',
    border: '2px solid #e5e7eb',
    borderRadius: '10px',
    padding: '20px',
    marginTop: '15px'
  },
  riskResult: {
    textAlign: 'center',
    padding: '15px',
    borderRadius: '8px',
    fontWeight: '700',
    fontSize: '1.1rem',
    background: '#f3f4f6',
    color: '#374151'
  },
  riskResultHigh: {
    background: '#fef2f2',
    color: '#dc2626',
    border: '2px solid #dc2626'
  },
  riskResultMedium: {
    background: '#fffbeb',
    color: '#f59e0b',
    border: '2px solid #f59e0b'
  },
  riskResultLow: {
    background: '#f0fdf4',
    color: '#22c55e',
    border: '2px solid #22c55e'
  },
  safeProceed: {
    display: 'flex',
    gap: '15px',
    flexWrap: 'wrap'
  },
  safeOption: {
    flex: '1',
    minWidth: '150px',
    padding: '15px 20px',
    textAlign: 'center',
    border: '2px solid #d1d5db',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontWeight: '600',
    background: 'white'
  },
  safeOptionYes: {
    borderColor: '#059669',
    background: '#059669',
    color: 'white'
  },
  safeOptionConditional: {
    borderColor: '#f59e0b',
    background: '#f59e0b',
    color: 'white'
  },
  safeOptionNo: {
    borderColor: '#dc2626',
    background: '#dc2626',
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

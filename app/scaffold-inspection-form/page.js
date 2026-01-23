'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://iypezirwdlqpptjpeeyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
)

const COMPANIES = ['A-C Electric','AKE-Line','Apache Corp.','Armstrong Oil & Gas','ASRC Energy Services','CCI- Industrial','Chosen Construction','CINGSA','Coho Enterprises','Conam Construction','ConocoPhillips','Five Star Oilfield Services','Fox Energy Services','G.A. West','GBR Equipment','GLM Energy Services','Graham Industrial Coatings','Harvest Midstream','Hilcorp Alaska','MagTec Alaska','Merkes Builders','Nordic-Calista','Parker TRS','Peninsula Paving','Pollard Wireline','Ridgeline Oilfield Services','Santos','Summit Excavation','Tesoro Refinery','Yellowjacket','Other']

const LOCATIONS = ['Kenai','CIO','Beaver Creek','Swanson River','Ninilchik','Nikiski','Other Kenai Asset','Deadhorse','Prudhoe Bay','Kuparuk','Alpine','Willow','ENI','PIKKA','Point Thompson','North Star Island','Endicott','Badami','Other North Slope']

export default function ScaffoldInspectionForm() {
  const [formData, setFormData] = useState({
    company: '',
    project_name: '',
    location: '',
    inspector_name: '',
    scaffold_location: '',
    scaffold_height: '',
    number_of_levels: '',
    load_capacity: '',
    
    // Foundation & Base - EMPTY so nothing is pre-checked
    base_plates_mudsills_adequate: '',
    level_and_plumb: '',
    adequate_base_support: '',
    screw_jacks_properly_set: '',
    
    // Planking/Decking
    planking_secured: '',
    planking_fully_decked: '',
    no_damaged_planks: '',
    proper_overlap: '',
    
    // Guardrails
    top_rail_installed: '',
    mid_rail_installed: '',
    toeboards_installed: '',
    guardrails_secure: '',
    
    // Access
    proper_ladder_access: '',
    ladder_secured: '',
    ladder_extends_3ft: '',
    stairs_installed_properly: '',
    
    // Frame & Structure
    frames_secured: '',
    diagonal_bracing_installed: '',
    pins_and_clips_secured: '',
    no_damaged_components: '',
    
    // Ties & Anchorage
    tied_to_structure: '',
    ties_adequate: '',
    tie_spacing_compliant: '',
    
    // Overhead Protection
    overhead_protection_required: '',
    overhead_protection_adequate: '',
    
    // Platforms
    platforms_level: '',
    platform_width_adequate: '',
    platforms_fully_planked: '',
    
    // Safety
    fall_protection_required: '',
    fall_protection_available: '',
    tag_system_in_place: '',
    warning_signs_posted: '',
    
    // Load & Use
    scaffold_tagged: '',
    load_capacity_posted: '',
    no_overloading: '',
    material_properly_stored: '',
    
    // Weather & Environment
    debris_removed: '',
    ice_snow_removed: '',
    weather_conditions_safe: '',
    
    // General Condition
    no_modifications_unauthorized: '',
    scaffold_complete: '',
    competent_person_inspected: '',
    
    // Additional
    outriggers_used: '',
    outriggers_level: '',
    casters_locked: '',
    scaffold_inside_power_lines: '',
    electrical_hazards_present: '',
    scaffold_accessible_by_public: '',
    
    defects_found: '',
    corrective_action: '',
    additional_notes: ''
  })

  const [status, setStatus] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setStatus('Submitting...')

    try {
      const dataToSubmit = {
        ...formData,
        scaffold_height: formData.scaffold_height ? parseFloat(formData.scaffold_height) : null,
        number_of_levels: formData.number_of_levels ? parseInt(formData.number_of_levels) : null,
        load_capacity: formData.load_capacity ? parseFloat(formData.load_capacity) : null,
        submission_date: new Date().toISOString()
      }

      const { error } = await supabase
        .from('scaffold_inspections')
        .insert([dataToSubmit])

      if (error) throw error

      setIsSuccess(true)
    } catch (error) {
      console.error('Error:', error)
      setStatus('❌ Error submitting inspection: ' + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const resetForm = () => {
    setFormData({
      company: '',
      project_name: '',
      location: '',
      inspector_name: '',
      scaffold_location: '',
      scaffold_height: '',
      number_of_levels: '',
      load_capacity: '',
      base_plates_mudsills_adequate: '',
      level_and_plumb: '',
      adequate_base_support: '',
      screw_jacks_properly_set: '',
      planking_secured: '',
      planking_fully_decked: '',
      no_damaged_planks: '',
      proper_overlap: '',
      top_rail_installed: '',
      mid_rail_installed: '',
      toeboards_installed: '',
      guardrails_secure: '',
      proper_ladder_access: '',
      ladder_secured: '',
      ladder_extends_3ft: '',
      stairs_installed_properly: '',
      frames_secured: '',
      diagonal_bracing_installed: '',
      pins_and_clips_secured: '',
      no_damaged_components: '',
      tied_to_structure: '',
      ties_adequate: '',
      tie_spacing_compliant: '',
      overhead_protection_required: '',
      overhead_protection_adequate: '',
      platforms_level: '',
      platform_width_adequate: '',
      platforms_fully_planked: '',
      fall_protection_required: '',
      fall_protection_available: '',
      tag_system_in_place: '',
      warning_signs_posted: '',
      scaffold_tagged: '',
      load_capacity_posted: '',
      no_overloading: '',
      material_properly_stored: '',
      debris_removed: '',
      ice_snow_removed: '',
      weather_conditions_safe: '',
      no_modifications_unauthorized: '',
      scaffold_complete: '',
      competent_person_inspected: '',
      outriggers_used: '',
      outriggers_level: '',
      casters_locked: '',
      scaffold_inside_power_lines: '',
      electrical_hazards_present: '',
      scaffold_accessible_by_public: '',
      defects_found: '',
      corrective_action: '',
      additional_notes: ''
    })
    setStatus('')
    setIsSuccess(false)
  }

  const getInspectionResult = () => {
    // Get all the inspection field values (exclude text fields)
    const inspectionFields = Object.entries(formData).filter(([key]) => 
      !['company', 'project_name', 'location', 'inspector_name', 'scaffold_location', 
        'scaffold_height', 'number_of_levels', 'load_capacity', 'defects_found', 
        'corrective_action', 'additional_notes'].includes(key)
    )
    
    const values = inspectionFields.map(([, value]) => value)
    const hasDeficient = values.includes('deficient')
    const allAnswered = values.every(v => v !== '')
    
    if (hasDeficient) return { text: 'DEFICIENCIES FOUND', color: '#dc2626' }
    if (!allAnswered) return { text: 'INCOMPLETE', color: '#f59e0b' }
    return { text: 'PASS', color: '#059669' }
  }

  const result = getInspectionResult()
  const hasDefects = Object.values(formData).includes('deficient')

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
      background: 'linear-gradient(135deg, #1e3a8a 0%, #475569 100%)',
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
      color: '#475569',
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
      textShadow: '2px 2px 4px rgba(0, 0, 0, 0.3)'
    },
    subtitle: {
      opacity: 0.95,
      fontSize: '0.9rem',
      margin: 0
    },
    formContent: {
      padding: '25px'
    },
    section: {
      marginBottom: '25px'
    },
    sectionTitle: {
      color: '#1e3a8a',
      fontSize: '18px',
      marginBottom: '15px',
      borderBottom: '2px solid #3b82f6',
      paddingBottom: '8px'
    },
    formRow: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '15px',
      marginBottom: '15px'
    },
    formGroup: {
      marginBottom: '15px'
    },
    label: {
      display: 'block',
      marginBottom: '5px',
      fontWeight: '500',
      color: '#374151',
      fontSize: '0.9rem'
    },
    input: {
      width: '100%',
      padding: '10px 12px',
      border: '2px solid #d1d5db',
      borderRadius: '8px',
      fontSize: '0.9rem',
      background: 'white'
    },
    textarea: {
      width: '100%',
      padding: '10px 12px',
      border: '2px solid #d1d5db',
      borderRadius: '8px',
      fontSize: '0.9rem',
      background: 'white',
      fontFamily: 'inherit',
      resize: 'vertical'
    },
    tableContainer: {
      background: '#f9fafb',
      padding: '15px',
      borderRadius: '8px',
      overflowX: 'auto'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse'
    },
    th: {
      textAlign: 'left',
      padding: '10px 8px',
      fontSize: '13px',
      fontWeight: '600',
      borderBottom: '2px solid #d1d5db',
      background: '#f3f4f6'
    },
    thCenter: {
      textAlign: 'center',
      padding: '10px 8px',
      fontSize: '13px',
      fontWeight: '600',
      borderBottom: '2px solid #d1d5db',
      background: '#f3f4f6',
      width: '80px'
    },
    td: {
      padding: '12px 8px',
      fontSize: '14px',
      borderBottom: '1px solid #e5e7eb'
    },
    tdCenter: {
      textAlign: 'center',
      padding: '12px 8px',
      borderBottom: '1px solid #e5e7eb'
    },
    radio: {
      width: '18px',
      height: '18px',
      cursor: 'pointer'
    },
    resultBox: {
      marginTop: '30px',
      padding: '20px',
      color: 'white',
      borderRadius: '8px',
      textAlign: 'center'
    },
    defectsBox: {
      marginTop: '30px',
      padding: '20px',
      background: '#fef2f2',
      borderRadius: '8px',
      border: '2px solid #dc2626'
    },
    submitBtn: {
      width: '100%',
      marginTop: '30px',
      padding: '15px',
      background: '#1e3a8a',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '16px',
      fontWeight: '600',
      cursor: 'pointer'
    },
    submitBtnDisabled: {
      width: '100%',
      marginTop: '30px',
      padding: '15px',
      background: '#9ca3af',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '16px',
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

  // Inspection Section Component
  const InspectionSection = ({ title, items }) => (
    <div style={styles.section}>
      <h3 style={styles.sectionTitle}>{title}</h3>
      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Item</th>
              <th style={styles.thCenter}>OK</th>
              <th style={{ ...styles.thCenter, width: '100px' }}>Deficient</th>
              <th style={styles.thCenter}>N/A</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.name}>
                <td style={styles.td}>{item.label}</td>
                <td style={styles.tdCenter}>
                  <input 
                    type="radio" 
                    name={item.name} 
                    value="ok" 
                    checked={formData[item.name] === 'ok'} 
                    onChange={handleChange}
                    style={styles.radio}
                  />
                </td>
                <td style={styles.tdCenter}>
                  <input 
                    type="radio" 
                    name={item.name} 
                    value="deficient" 
                    checked={formData[item.name] === 'deficient'} 
                    onChange={handleChange}
                    style={styles.radio}
                  />
                </td>
                <td style={styles.tdCenter}>
                  <input 
                    type="radio" 
                    name={item.name} 
                    value="na" 
                    checked={formData[item.name] === 'na'} 
                    onChange={handleChange}
                    style={styles.radio}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  if (isSuccess) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1e3a8a 0%, #475569 100%)', padding: '20px' }}>
        <a href="/" style={styles.backButton}>← Back to Portal</a>
        <div style={styles.container}>
          <div style={styles.header}>
            <div style={styles.logoContainer}>
              <img src="/Logo.png" alt="SLP Alaska" style={styles.logo} />
            </div>
            <div style={styles.badge}>🔩 SCAFFOLD INSPECTION</div>
            <h1 style={styles.title}>Daily Scaffold Inspection</h1>
            <p style={styles.subtitle}>OSHA 1926.451 & 1926.452 Compliant</p>
          </div>
          <div style={styles.successMessage}>
            <div style={styles.successIcon}>✅</div>
            <h2 style={styles.successTitle}>Inspection Submitted Successfully!</h2>
            <p>Your scaffold inspection has been recorded.</p>
            <button style={styles.newFormBtn} onClick={resetForm}>Submit Another Inspection</button>
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
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1e3a8a 0%, #475569 100%)', padding: '20px' }}>
      <a href="/" style={styles.backButton}>← Back to Portal</a>
      
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.logoContainer}>
            <img src="/Logo.png" alt="SLP Alaska" style={styles.logo} />
          </div>
          <div style={styles.badge}>🔩 SCAFFOLD INSPECTION</div>
          <h1 style={styles.title}>Daily Scaffold Inspection</h1>
          <p style={styles.subtitle}>OSHA 1926.451 & 1926.452 Compliant</p>
        </div>

        <div style={styles.formContent}>
          <form onSubmit={handleSubmit}>
            
            {/* Basic Information */}
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Basic Information</h2>
              
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Company *</label>
                  <select name="company" value={formData.company} onChange={handleChange} required style={styles.input}>
                    <option value="">Select Company</option>
                    {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Location *</label>
                  <select name="location" value={formData.location} onChange={handleChange} required style={styles.input}>
                    <option value="">Select Location</option>
                    {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Project Name *</label>
                  <input type="text" name="project_name" value={formData.project_name} onChange={handleChange} required style={styles.input} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Inspector Name *</label>
                  <input type="text" name="inspector_name" value={formData.inspector_name} onChange={handleChange} required style={styles.input} />
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Scaffold Location *</label>
                <input type="text" name="scaffold_location" value={formData.scaffold_location} onChange={handleChange} required style={styles.input} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Height (ft)</label>
                  <input type="number" name="scaffold_height" value={formData.scaffold_height} onChange={handleChange} step="0.1" style={styles.input} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Levels</label>
                  <input type="number" name="number_of_levels" value={formData.number_of_levels} onChange={handleChange} style={styles.input} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Load Capacity (lbs)</label>
                  <input type="number" name="load_capacity" value={formData.load_capacity} onChange={handleChange} style={styles.input} />
                </div>
              </div>
            </div>

            {/* Inspection Sections */}
            <InspectionSection title="Foundation & Base" items={[
              { name: 'base_plates_mudsills_adequate', label: 'Base plates/mudsills adequate and secure' },
              { name: 'level_and_plumb', label: 'Scaffold level and plumb' },
              { name: 'adequate_base_support', label: 'Adequate base support on firm foundation' },
              { name: 'screw_jacks_properly_set', label: 'Screw jacks properly set and secure' }
            ]} />

            <InspectionSection title="Planking/Decking" items={[
              { name: 'planking_secured', label: 'Planking secured and in good condition' },
              { name: 'planking_fully_decked', label: 'Platform fully decked (no gaps)' },
              { name: 'no_damaged_planks', label: 'No damaged, cracked, or weak planks' },
              { name: 'proper_overlap', label: 'Proper overlap at supports (min 6")' }
            ]} />

            <InspectionSection title="Guardrails" items={[
              { name: 'top_rail_installed', label: 'Top rail installed (42" ± 3")' },
              { name: 'mid_rail_installed', label: 'Mid rail installed (21" from platform)' },
              { name: 'toeboards_installed', label: 'Toeboards installed (min 3.5")' },
              { name: 'guardrails_secure', label: 'Guardrails secure and undamaged' }
            ]} />

            <InspectionSection title="Access" items={[
              { name: 'proper_ladder_access', label: 'Proper ladder/stair access provided' },
              { name: 'ladder_secured', label: 'Ladder secured to scaffold' },
              { name: 'ladder_extends_3ft', label: 'Ladder extends 3 ft above platform' },
              { name: 'stairs_installed_properly', label: 'Stairs installed properly with handrails' }
            ]} />

            <InspectionSection title="Frame & Structure" items={[
              { name: 'frames_secured', label: 'Frames properly connected and secured' },
              { name: 'diagonal_bracing_installed', label: 'Diagonal bracing installed' },
              { name: 'pins_and_clips_secured', label: 'All pins, clips, and locks secured' },
              { name: 'no_damaged_components', label: 'No damaged components' }
            ]} />

            <InspectionSection title="Ties & Anchorage" items={[
              { name: 'tied_to_structure', label: 'Scaffold tied to structure' },
              { name: 'ties_adequate', label: 'Ties adequate and secure' },
              { name: 'tie_spacing_compliant', label: 'Tie spacing compliant (26\' horizontal, 30\' vertical)' }
            ]} />

            <InspectionSection title="Overhead Protection" items={[
              { name: 'overhead_protection_required', label: 'Overhead protection required?' },
              { name: 'overhead_protection_adequate', label: 'Overhead protection adequate if required' }
            ]} />

            <InspectionSection title="Platforms" items={[
              { name: 'platforms_level', label: 'Platforms level' },
              { name: 'platform_width_adequate', label: 'Platform width adequate (min 18")' },
              { name: 'platforms_fully_planked', label: 'Platforms fully planked' }
            ]} />

            <InspectionSection title="Safety" items={[
              { name: 'fall_protection_required', label: 'Fall protection required (>10 ft)' },
              { name: 'fall_protection_available', label: 'Fall protection available if required' },
              { name: 'tag_system_in_place', label: 'Tag system in place' },
              { name: 'warning_signs_posted', label: 'Warning signs posted if needed' }
            ]} />

            <InspectionSection title="Load & Use" items={[
              { name: 'scaffold_tagged', label: 'Scaffold properly tagged' },
              { name: 'load_capacity_posted', label: 'Load capacity posted' },
              { name: 'no_overloading', label: 'No overloading' },
              { name: 'material_properly_stored', label: 'Material properly stored on platform' }
            ]} />

            <InspectionSection title="Weather & Environment" items={[
              { name: 'debris_removed', label: 'Debris removed from platforms' },
              { name: 'ice_snow_removed', label: 'Ice/snow removed' },
              { name: 'weather_conditions_safe', label: 'Weather conditions safe for use' }
            ]} />

            <InspectionSection title="General Condition" items={[
              { name: 'no_modifications_unauthorized', label: 'No unauthorized modifications' },
              { name: 'scaffold_complete', label: 'Scaffold complete and ready for use' },
              { name: 'competent_person_inspected', label: 'Competent person inspected' }
            ]} />

            <InspectionSection title="Additional Items" items={[
              { name: 'outriggers_used', label: 'Outriggers used if required' },
              { name: 'outriggers_level', label: 'Outriggers level and secure' },
              { name: 'casters_locked', label: 'Casters locked (mobile scaffolds)' },
              { name: 'scaffold_inside_power_lines', label: 'Scaffold inside power line clearance' },
              { name: 'electrical_hazards_present', label: 'Electrical hazards present' },
              { name: 'scaffold_accessible_by_public', label: 'Scaffold accessible by public' }
            ]} />

            {/* Inspection Result */}
            <div style={{ ...styles.resultBox, background: result.color }}>
              <h2 style={{ fontSize: '24px', marginBottom: '5px' }}>INSPECTION STATUS: {result.text}</h2>
              <p style={{ fontSize: '14px', opacity: 0.9 }}>Based on checklist responses</p>
            </div>

            {/* Defects Section */}
            {hasDefects && (
              <div style={styles.defectsBox}>
                <h3 style={{ color: '#dc2626', marginBottom: '15px' }}>⚠️ DEFECTS FOUND - ACTION REQUIRED</h3>
                
                <div style={styles.formGroup}>
                  <label style={styles.label}>Defects/Issues Found *</label>
                  <textarea 
                    name="defects_found" 
                    value={formData.defects_found} 
                    onChange={handleChange} 
                    rows="4" 
                    required={hasDefects}
                    placeholder="Describe all deficiencies found..."
                    style={styles.textarea} 
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Corrective Action Taken *</label>
                  <textarea 
                    name="corrective_action" 
                    value={formData.corrective_action} 
                    onChange={handleChange} 
                    rows="4" 
                    required={hasDefects}
                    placeholder="Describe corrective actions taken or planned..."
                    style={styles.textarea} 
                  />
                </div>
              </div>
            )}

            {/* Additional Notes */}
            <div style={{ marginTop: '20px' }}>
              <label style={styles.label}>Additional Notes</label>
              <textarea 
                name="additional_notes" 
                value={formData.additional_notes} 
                onChange={handleChange} 
                rows="3" 
                placeholder="Any additional observations or comments..."
                style={styles.textarea} 
              />
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              disabled={isSubmitting} 
              style={isSubmitting ? styles.submitBtnDisabled : styles.submitBtn}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Inspection'}
            </button>

            {status && !isSuccess && (
              <div style={{ 
                marginTop: '15px',
                padding: '12px',
                background: status.includes('✅') ? '#d1fae5' : '#fee2e2',
                color: status.includes('✅') ? '#065f46' : '#991b1b',
                borderRadius: '6px',
                textAlign: 'center'
              }}>
                {status}
              </div>
            )}
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

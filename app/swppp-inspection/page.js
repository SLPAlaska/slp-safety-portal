'use client'

import React, { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://iypezirwdlqpptjpeeyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
)

const COMPANIES = ['A-C Electric','AKE-Line','Apache Corp.','Armstrong Oil & Gas','ASRC Energy Services','CCI- Industrial','Chosen Construction','CINGSA','Coho Enterprises','Conam Construction','ConocoPhillips','Five Star Oilfield Services','Fox Energy Services','G.A. West','GBR Equipment','GLM Energy Services','Graham Industrial Coatings','Harvest Midstream','Hilcorp Alaska','MagTec Alaska','Merkes Builders','Nordic-Calista','Parker TRS','Peninsula Paving','Pollard Wireline','Ridgeline Oilfield Services','Santos','Summit Excavation','Tesoro Refinery','Yellowjacket','Other']

const LOCATIONS = ['Kenai','CIO','Beaver Creek','Swanson River','Ninilchik','Nikiski','Other Kenai Asset','Deadhorse','Prudhoe Bay','Kuparuk','Alpine','Willow','ENI','PIKKA','Point Thompson','North Star Island','Endicott','Badami','Other North Slope']

const STAGES_OF_WORK = ['Pre-Construction','Site Preparation','Mobilization','Active Drilling','Completion Operations','Production','Workover','Demobilization','Site Restoration','Post-Construction','Maintenance','Other']

const CONDITION_OPTIONS = ['Good', 'Fair', 'Poor', 'Needs Improvement', 'N/A']
const YES_NO_NA = ['Yes', 'No', 'N/A']
const RUNOFF_OPTIONS = ['None Observed','Minor - Contained','Moderate - Partially Contained','Significant - Uncontained','N/A - Frozen Conditions']
const NON_COMPLIANCE_STATUS = ['No Non-Compliance','Minor - Corrected On-Site','Minor - Correction Scheduled','Major - Immediate Action Required','Major - Reported to Regulatory Agency']
const INSPECTION_RESULTS = ['Pass - No Issues','Pass - Minor Corrections Made','Conditional - Follow-Up Required','Fail - Corrective Action Required','Fail - Stop Work Order']

export default function SWPPPInspectionPage() {
  const [formData, setFormData] = useState({
    auditor_name: '', date: new Date().toISOString().split('T')[0], company: '', location: '', stage_of_work: '',
    access_roads: '', ice_roads_stable: '', bmps_effective: '', bmp_explanation: '',
    evidence_runoff: '', drainage_condition: '', outfalls_condition: '',
    secondary_containment: '', spill_prevention: '', haz_waste_storage: '',
    drilling_waste: '', sewage_wastewater: '', trash_litter: '',
    vegetation_condition: '', snow_piles: '', ice_road_maintenance: '', sediment_pollution: '',
    wildlife_encounters: '', wildlife_deterrence: '',
    non_compliance_obs: '', any_spills: '', erosion_events: '', habitat_disturbances: '',
    inspection_results: '', non_compliance_status: '', swppp_on_site: ''
  })
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleInputChange = (e) => {
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
    setSubmitting(true)
    try {
      let photoUrl = ''
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `swppp-inspection/${fileName}`
        const { error: uploadError } = await supabase.storage.from('safety-photos').upload(filePath, photoFile)
        if (uploadError) throw uploadError
        const { data: { publicUrl } } = supabase.storage.from('safety-photos').getPublicUrl(filePath)
        photoUrl = publicUrl
      }
      const { error } = await supabase.from('swppp_inspection').insert([{ ...formData, photo_url: photoUrl, created_at: new Date().toISOString() }])
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
      auditor_name: '', date: new Date().toISOString().split('T')[0], company: '', location: '', stage_of_work: '',
      access_roads: '', ice_roads_stable: '', bmps_effective: '', bmp_explanation: '',
      evidence_runoff: '', drainage_condition: '', outfalls_condition: '',
      secondary_containment: '', spill_prevention: '', haz_waste_storage: '',
      drilling_waste: '', sewage_wastewater: '', trash_litter: '',
      vegetation_condition: '', snow_piles: '', ice_road_maintenance: '', sediment_pollution: '',
      wildlife_encounters: '', wildlife_deterrence: '',
      non_compliance_obs: '', any_spills: '', erosion_events: '', habitat_disturbances: '',
      inspection_results: '', non_compliance_status: '', swppp_on_site: ''
    })
    setPhotoFile(null)
    setPhotoPreview(null)
    setSubmitted(false)
  }

  const renderChecklistItem = (label, name, options = CONDITION_OPTIONS) => (
    <div style={styles.checklistItem}>
      <label style={styles.checklistLabel}>{label}</label>
      <select name={name} value={formData[name]} onChange={handleInputChange} style={styles.checklistSelect}>
        <option value="">Select...</option>
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  )

  if (submitted) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.successMessage}>
            <div style={styles.successIcon}>✅</div>
            <h2 style={styles.successTitle}>Inspection Submitted Successfully!</h2>
            <p style={styles.successText}>Your SWPPP inspection has been recorded.</p>
            <button onClick={resetForm} style={styles.newFormBtn}>Submit Another Inspection</button>
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
          <div style={styles.badge}>💧 SWPPP</div>
          <h1 style={styles.title}>Stormwater Pollution Prevention Plan Inspection</h1>
          <p style={styles.subtitle}>SLP Alaska Safety Management System</p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* BASIC INFO */}
          <div style={styles.section}>
            <div style={{...styles.sectionHeader, ...styles.sectionHeaderBlue}}>📋 Basic Information</div>
            <div style={styles.sectionBody}>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Name of Auditor <span style={styles.required}>*</span></label>
                  <input type="text" name="auditor_name" value={formData.auditor_name} onChange={handleInputChange} required style={styles.input} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Date <span style={styles.required}>*</span></label>
                  <input type="date" name="date" value={formData.date} onChange={handleInputChange} required style={styles.input} />
                </div>
              </div>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Client/Company <span style={styles.required}>*</span></label>
                  <select name="company" value={formData.company} onChange={handleInputChange} required style={styles.select}>
                    <option value="">Select Company...</option>
                    {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Location <span style={styles.required}>*</span></label>
                  <select name="location" value={formData.location} onChange={handleInputChange} required style={styles.select}>
                    <option value="">Select Location...</option>
                    {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Current Stage of Work <span style={styles.required}>*</span></label>
                  <select name="stage_of_work" value={formData.stage_of_work} onChange={handleInputChange} required style={styles.select}>
                    <option value="">Select Stage...</option>
                    {STAGES_OF_WORK.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* ACCESS & BMPs */}
          <div style={styles.section}>
            <div style={{...styles.sectionHeader, ...styles.sectionHeaderTeal}}>🛣️ Access Roads & BMPs</div>
            <div style={styles.sectionBody}>
              {renderChecklistItem('Access Roads in Good Condition w/Sediment Control', 'access_roads')}
              {renderChecklistItem('Ice Roads Stable with Runoff Management', 'ice_roads_stable')}
              {renderChecklistItem('Functionality of BMPs Effective', 'bmps_effective')}
              <div style={{...styles.formGroup, marginTop: '15px'}}>
                <label style={styles.label}>If BMPs Need Improvement - Explain</label>
                <textarea name="bmp_explanation" value={formData.bmp_explanation} onChange={handleInputChange} placeholder="Describe any BMP issues..." style={styles.textarea} />
              </div>
            </div>
          </div>

          {/* DRAINAGE & RUNOFF */}
          <div style={styles.section}>
            <div style={{...styles.sectionHeader, ...styles.sectionHeaderCyan}}>💧 Drainage & Runoff</div>
            <div style={styles.sectionBody}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Evidence of Runoff</label>
                <select name="evidence_runoff" value={formData.evidence_runoff} onChange={handleInputChange} style={styles.select}>
                  <option value="">Select...</option>
                  {RUNOFF_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              {renderChecklistItem('Drainage Condition', 'drainage_condition')}
              {renderChecklistItem('Outfalls Condition', 'outfalls_condition')}
            </div>
          </div>

          {/* CONTAINMENT & SPILL PREVENTION */}
          <div style={styles.section}>
            <div style={{...styles.sectionHeader, ...styles.sectionHeaderOrange}}>🛢️ Containment & Spill Prevention</div>
            <div style={styles.sectionBody}>
              {renderChecklistItem('Secondary Containment for Fuels/Chemicals', 'secondary_containment')}
              {renderChecklistItem('Spill Prevention Measures in Place', 'spill_prevention')}
              {renderChecklistItem('Hazardous Waste Storage Proper', 'haz_waste_storage')}
            </div>
          </div>

          {/* WASTE MANAGEMENT */}
          <div style={styles.section}>
            <div style={{...styles.sectionHeader, ...styles.sectionHeaderGreen}}>🗑️ Waste Management</div>
            <div style={styles.sectionBody}>
              {renderChecklistItem('Proper Storage & Disposal of Drilling Waste', 'drilling_waste')}
              {renderChecklistItem('Sewage & Wastewater Handling Adequate', 'sewage_wastewater')}
              {renderChecklistItem('Trash and Litter Management Effective', 'trash_litter')}
            </div>
          </div>

          {/* ENVIRONMENTAL CONDITIONS */}
          <div style={styles.section}>
            <div style={{...styles.sectionHeader, ...styles.sectionHeaderPurple}}>🌲 Environmental Conditions</div>
            <div style={styles.sectionBody}>
              {renderChecklistItem('Condition of Surrounding Vegetation', 'vegetation_condition')}
              {renderChecklistItem('Snow Piles Placed Away from Waters', 'snow_piles')}
              {renderChecklistItem('Ice Road Maintenance Adequate', 'ice_road_maintenance')}
              {renderChecklistItem('Evidence of Sediment/Pollution Near Water Body', 'sediment_pollution')}
            </div>
          </div>

          {/* WILDLIFE */}
          <div style={styles.section}>
            <div style={{...styles.sectionHeader, ...styles.sectionHeaderTeal}}>🐻 Wildlife</div>
            <div style={styles.sectionBody}>
              {renderChecklistItem('Evidence of Wildlife Encounters or Impacts', 'wildlife_encounters', YES_NO_NA)}
              {renderChecklistItem('Deterrence Measures Sufficient for Wildlife', 'wildlife_deterrence')}
            </div>
          </div>

          {/* INCIDENTS */}
          <div style={styles.section}>
            <div style={{...styles.sectionHeader, ...styles.sectionHeaderRed}}>⚠️ Incidents & Non-Compliance</div>
            <div style={styles.sectionBody}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Non-Compliance Observations - Describe</label>
                <textarea name="non_compliance_obs" value={formData.non_compliance_obs} onChange={handleInputChange} placeholder="Describe any non-compliance observations..." style={styles.textarea} />
              </div>
              <div style={{...styles.formGroup, marginTop: '15px'}}>
                <label style={styles.label}>Any Spills? (Type, Size, Location, Response)</label>
                <textarea name="any_spills" value={formData.any_spills} onChange={handleInputChange} placeholder="Document any spills observed..." style={styles.textarea} />
              </div>
              <div style={{...styles.formGroup, marginTop: '15px'}}>
                <label style={styles.label}>Erosion Events - Describe</label>
                <textarea name="erosion_events" value={formData.erosion_events} onChange={handleInputChange} placeholder="Describe any erosion events..." style={styles.textarea} />
              </div>
              <div style={{...styles.formGroup, marginTop: '15px'}}>
                <label style={styles.label}>Any Habitat Disturbances - Describe</label>
                <textarea name="habitat_disturbances" value={formData.habitat_disturbances} onChange={handleInputChange} placeholder="Describe any habitat disturbances..." style={styles.textarea} />
              </div>
            </div>
          </div>

          {/* INSPECTION RESULTS */}
          <div style={styles.section}>
            <div style={{...styles.sectionHeader, ...styles.sectionHeaderBlue}}>📊 Inspection Results</div>
            <div style={styles.sectionBody}>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Inspection Results <span style={styles.required}>*</span></label>
                  <select name="inspection_results" value={formData.inspection_results} onChange={handleInputChange} required style={styles.select}>
                    <option value="">Select Result...</option>
                    {INSPECTION_RESULTS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Non-Compliance Status <span style={styles.required}>*</span></label>
                  <select name="non_compliance_status" value={formData.non_compliance_status} onChange={handleInputChange} required style={styles.select}>
                    <option value="">Select Status...</option>
                    {NON_COMPLIANCE_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>SWPPP On-Site Available & Current? <span style={styles.required}>*</span></label>
                  <select name="swppp_on_site" value={formData.swppp_on_site} onChange={handleInputChange} required style={styles.select}>
                    <option value="">Select...</option>
                    {YES_NO_NA.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* PHOTO */}
          <div style={styles.section}>
            <div style={{...styles.sectionHeader, ...styles.sectionHeaderCyan}}>📸 Photo Documentation</div>
            <div style={styles.sectionBody}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Photo (Optional)</label>
                <div style={{...styles.photoUpload, ...(photoPreview ? styles.photoUploadHasPhoto : {})}} onClick={() => document.getElementById('photoInput').click()}>
                  {photoPreview ? <img src={photoPreview} alt="Preview" style={styles.photoPreview} /> : <><div style={styles.photoIcon}>📷</div><p>Click to upload photo</p></>}
                </div>
                <input type="file" id="photoInput" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
              </div>
            </div>
          </div>

          <button type="submit" disabled={submitting} style={{...styles.submitBtn, ...(submitting ? styles.submitBtnDisabled : {})}}>
            {submitting ? 'Submitting...' : 'Submit SWPPP Inspection'}
          </button>
        </form>

        <div style={styles.footer}>
          <span style={styles.trademark}>AnthroSafe™ Powered by Field Driven Data™</span>
          <span style={styles.divider}>|</span>
          <span style={styles.copyright}>© 2025 SLP Alaska</span>
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: { minHeight: '100vh', background: 'linear-gradient(135deg, #1e3a8a 0%, #0d9488 100%)', padding: '20px', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif" },
  card: { maxWidth: '950px', margin: '0 auto', background: 'white', borderRadius: '16px', boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)', overflow: 'hidden' },
  backButton: { display: 'inline-block', margin: '20px', padding: '10px 20px', color: '#1e3a8a', textDecoration: 'none', fontWeight: '600', fontSize: '0.95rem', border: '2px solid #1e3a8a', borderRadius: '8px' },
  header: { background: 'linear-gradient(135deg, #1e3a8a 0%, #0d9488 100%)', color: 'white', padding: '30px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  logoContainer: { background: 'rgba(255, 255, 255, 0.95)', borderRadius: '12px', padding: '15px', marginBottom: '20px', boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)' },
  logo: { maxWidth: '200px', height: 'auto', display: 'block' },
  badge: { display: 'inline-block', background: 'white', color: '#0d9488', padding: '6px 16px', borderRadius: '20px', fontWeight: '700', fontSize: '0.85rem', marginBottom: '15px', border: '3px solid #0d9488', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)' },
  title: { fontSize: '1.4rem', marginBottom: '8px', textShadow: '2px 2px 4px rgba(0, 0, 0, 0.3)', margin: '0 0 8px 0' },
  subtitle: { opacity: '0.95', fontSize: '1rem', margin: 0 },
  form: { padding: '25px' },
  section: { marginBottom: '20px', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' },
  sectionHeader: { color: 'white', padding: '10px 18px', fontWeight: '600', fontSize: '0.95rem' },
  sectionHeaderBlue: { background: 'linear-gradient(135deg, #1e3a8a, #1e40af)' },
  sectionHeaderTeal: { background: 'linear-gradient(135deg, #0d9488, #0f766e)' },
  sectionHeaderCyan: { background: 'linear-gradient(135deg, #0891b2, #0e7490)' },
  sectionHeaderGreen: { background: 'linear-gradient(135deg, #059669, #047857)' },
  sectionHeaderOrange: { background: 'linear-gradient(135deg, #d97706, #ea580c)' },
  sectionHeaderPurple: { background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' },
  sectionHeaderRed: { background: 'linear-gradient(135deg, #b91c1c, #dc2626)' },
  sectionBody: { padding: '15px', background: '#f8fafc' },
  formRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px' },
  formGroup: { display: 'flex', flexDirection: 'column' },
  label: { fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '0.85rem' },
  required: { color: '#b91c1c' },
  input: { padding: '10px 12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '0.9rem', background: 'white', outline: 'none' },
  select: { padding: '10px 12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '0.9rem', background: 'white', outline: 'none' },
  textarea: { padding: '10px 12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '0.9rem', minHeight: '70px', resize: 'vertical', background: 'white', outline: 'none', fontFamily: 'inherit' },
  checklistItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '10px 15px', borderRadius: '8px', border: '1px solid #e5e7eb', marginBottom: '8px' },
  checklistLabel: { flex: '1', fontWeight: '500', color: '#374151', fontSize: '0.85rem', marginBottom: 0 },
  checklistSelect: { width: '140px', padding: '6px 8px', fontSize: '0.8rem', border: '2px solid #d1d5db', borderRadius: '6px', background: 'white' },
  photoUpload: { border: '2px dashed #d1d5db', borderRadius: '8px', padding: '25px', textAlign: 'center', background: 'white', cursor: 'pointer' },
  photoUploadHasPhoto: { borderColor: '#059669', background: 'rgba(5, 150, 105, 0.05)' },
  photoIcon: { fontSize: '2rem', marginBottom: '8px' },
  photoPreview: { maxWidth: '180px', maxHeight: '120px', borderRadius: '8px' },
  submitBtn: { width: '100%', padding: '14px 28px', background: 'linear-gradient(135deg, #1e3a8a, #1e40af)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '1.05rem', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 15px rgba(30, 58, 138, 0.3)' },
  submitBtnDisabled: { background: '#9ca3af', cursor: 'not-allowed', boxShadow: 'none' },
  successMessage: { textAlign: 'center', padding: '60px 40px' },
  successIcon: { fontSize: '4rem', marginBottom: '20px' },
  successTitle: { color: '#059669', marginBottom: '10px', fontSize: '1.5rem' },
  successText: { color: '#374151', marginBottom: '20px' },
  newFormBtn: { padding: '12px 24px', background: '#1e3a8a', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1rem', cursor: 'pointer' },
  footer: { textAlign: 'center', padding: '20px 10px', marginTop: '30px', borderTop: '1px solid #e2e8f0', fontSize: '11px', color: '#64748b', background: 'linear-gradient(to bottom, #f8fafc, #ffffff)' },
  trademark: { color: '#1e3a5f', fontWeight: '500' },
  divider: { color: '#94a3b8', margin: '0 8px' },
  copyright: { color: '#475569' }
}

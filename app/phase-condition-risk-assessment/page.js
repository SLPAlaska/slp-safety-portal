'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://iypezirwdlqpptjpeeyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
)

const COMPANIES = ['A-C Electric','AKE-Line','Apache Corp.','Armstrong Oil & Gas','ASRC Energy Services','CCI- Industrial','Chosen Construction','CINGSA','Coho Enterprises','Conam Construction','ConocoPhillips','Five Star Oilfield Services','Fox Energy Services','G.A. West','GBR Equipment','GLM Energy Services','Graham Industrial Coatings','Harvest Midstream','Hilcorp Alaska','MagTec Alaska','Merkes Builders','Nordic-Calista','Parker TRS','Peninsula Paving','Pollard Wireline','Ridgeline Oilfield Services','Santos','Summit Excavation','Tesoro Refinery','Yellowjacket','Other']

const LOCATIONS = ['Kenai','CIO','Beaver Creek','Swanson River','Ninilchik','Nikiski','Other Kenai Asset','Deadhorse','Prudhoe Bay','Kuparuk','Alpine','Willow','ENI','PIKKA','Point Thompson','North Star Island','Endicott','Badami','Other North Slope']

const HAZARDS = [
  'Extreme Cold',
  'High Winds',
  'Low Visibility',
  'Whiteout Conditions',
  'Ice Road Conditions',
  'Blowing Snow',
  'Frostbite Risk',
  'Hypothermia Risk',
  'Equipment Malfunction',
  'Communication Limitations',
  'Limited Evacuation Options',
  'Wildlife'
]

const CONTROLS = [
  'Warm-up Shelter Available',
  'Buddy System in Place',
  'Cold Weather PPE',
  'Regular Warm-up Breaks',
  'Emergency Communication',
  'Vehicle Staged for Evacuation',
  'Medic On-Site',
  'Weather Monitoring',
  'Work/Rest Rotation',
  'Hot Beverages Available',
  'Reduced Work Scope',
  'Additional Supervision'
]

export default function PhaseConditionRiskAssessment() {
  const [formData, setFormData] = useState({
    assessor_name: '',
    date: '',
    location: '',
    company: '',
    people_at_location: '',
    people_on_ice_road: '',
    supervisor_in_charge: '',
    crew_members: '',
    task_work_scope: '',
    weather: '',
    hazards_risks: [],
    risk_controls: [],
    evacuation_vehicle: '',
    medic_contact: '',
    medic_capabilities: '',
    muster_locations: '',
    re_eval_frequency: '',
    phase2_work: '',
    phase3_workplan: '',
    work_suspended: '',
    team_approves: ''
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

  const handleCheckboxChange = (field, value) => {
    setFormData(prev => {
      const currentValues = prev[field]
      if (currentValues.includes(value)) {
        return { ...prev, [field]: currentValues.filter(v => v !== value) }
      } else {
        return { ...prev, [field]: [...currentValues, value] }
      }
    })
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
    
    if (formData.hazards_risks.length === 0) {
      alert('Please select at least one hazard/risk.')
      return
    }
    
    if (formData.risk_controls.length === 0) {
      alert('Please select at least one risk control/mitigation measure.')
      return
    }
    
    setIsSubmitting(true)
    setSubmitStatus(null)

    try {
      let photoUrl = null

      if (photo) {
        const fileExt = photo.name.split('.').pop()
        const fileName = `phase-condition-photos/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
        
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
        .from('phase_condition_risk_assessment')
        .insert([{
          ...formData,
          hazards_risks: formData.hazards_risks.join(', '),
          risk_controls: formData.risk_controls.join(', '),
          photo_url: photoUrl,
          created_at: new Date().toISOString()
        }])

      if (error) throw error

      setSubmitStatus('success')
      setFormData({
        assessor_name: '',
        date: new Date().toISOString().split('T')[0],
        location: '',
        company: '',
        people_at_location: '',
        people_on_ice_road: '',
        supervisor_in_charge: '',
        crew_members: '',
        task_work_scope: '',
        weather: '',
        hazards_risks: [],
        risk_controls: [],
        evacuation_vehicle: '',
        medic_contact: '',
        medic_capabilities: '',
        muster_locations: '',
        re_eval_frequency: '',
        phase2_work: '',
        phase3_workplan: '',
        work_suspended: '',
        team_approves: ''
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
            <div style={{ fontSize: '4rem', marginBottom: '15px' }}>✓</div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Assessment Submitted!</h2>
            <p>Your Phase Condition Risk Assessment has been recorded.</p>
            <button
              onClick={resetForm}
              style={{ marginTop: '20px', padding: '12px 24px', background: 'white', color: '#059669', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: '600', cursor: 'pointer' }}
            >
              Submit Another Assessment
            </button>
          </div>
        </div>
      </div>
    )
  }

  const inputStyle = { width: '100%', padding: '12px 16px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '1rem', background: 'white' }
  const labelStyle = { display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1f2937', fontSize: '0.95rem' }
  const sectionStyle = { marginBottom: '30px', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }
  const sectionContentStyle = { padding: '20px', background: '#fafafa' }
  const formGroupStyle = { marginBottom: '20px' }

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
            PHASE CONDITION ASSESSMENT
          </div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '8px', textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>Phase Condition Risk Assessment</h1>
          <p style={{ opacity: 0.95, fontSize: '1rem' }}>SLP Alaska Safety Management System</p>
        </div>

        {/* Form Content */}
        <div style={{ padding: '30px' }}>
          <form onSubmit={handleSubmit}>

            {/* Assessment Information */}
            <div style={sectionStyle}>
              <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)', color: 'white', padding: '12px 20px', fontWeight: '600', fontSize: '1rem' }}>
                Assessment Information
              </div>
              <div style={sectionContentStyle}>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Name of Assessor(s) <span style={{ color: '#b91c1c' }}>*</span></label>
                  <input type="text" name="assessor_name" value={formData.assessor_name} onChange={handleChange} required placeholder="Enter assessor name(s)" style={inputStyle} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                  <div>
                    <label style={labelStyle}>Date <span style={{ color: '#b91c1c' }}>*</span></label>
                    <input type="date" name="date" value={formData.date} onChange={handleChange} required style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Location <span style={{ color: '#b91c1c' }}>*</span></label>
                    <select name="location" value={formData.location} onChange={handleChange} required style={inputStyle}>
                      <option value="">-- Select Location --</option>
                      {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Company <span style={{ color: '#b91c1c' }}>*</span></label>
                  <select name="company" value={formData.company} onChange={handleChange} required style={inputStyle}>
                    <option value="">-- Select Company --</option>
                    {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Personnel Information */}
            <div style={sectionStyle}>
              <div style={{ background: 'linear-gradient(135deg, #b91c1c 0%, #991b1b 100%)', color: 'white', padding: '12px 20px', fontWeight: '600', fontSize: '1rem' }}>
                Personnel Information
              </div>
              <div style={sectionContentStyle}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                  <div>
                    <label style={labelStyle}>Number of People at Location <span style={{ color: '#b91c1c' }}>*</span></label>
                    <input type="number" name="people_at_location" value={formData.people_at_location} onChange={handleChange} required min="0" placeholder="0" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Number of People on Ice Road</label>
                    <input type="number" name="people_on_ice_road" value={formData.people_on_ice_road} onChange={handleChange} min="0" placeholder="0" style={inputStyle} />
                  </div>
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Supervisor in Charge <span style={{ color: '#b91c1c' }}>*</span></label>
                  <input type="text" name="supervisor_in_charge" value={formData.supervisor_in_charge} onChange={handleChange} required placeholder="Supervisor's full name" style={inputStyle} />
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Names of Crew Members Involved <span style={{ color: '#b91c1c' }}>*</span></label>
                  <textarea name="crew_members" value={formData.crew_members} onChange={handleChange} required placeholder="List all crew members involved..." style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} />
                </div>
              </div>
            </div>

            {/* Work Scope */}
            <div style={sectionStyle}>
              <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)', color: 'white', padding: '12px 20px', fontWeight: '600', fontSize: '1rem' }}>
                Work Scope
              </div>
              <div style={sectionContentStyle}>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Task/Work Scope <span style={{ color: '#b91c1c' }}>*</span></label>
                  <textarea name="task_work_scope" value={formData.task_work_scope} onChange={handleChange} required placeholder="Describe the task or work scope..." style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} />
                </div>
              </div>
            </div>

            {/* Weather Conditions */}
            <div style={sectionStyle}>
              <div style={{ background: 'linear-gradient(135deg, #b91c1c 0%, #991b1b 100%)', color: 'white', padding: '12px 20px', fontWeight: '600', fontSize: '1rem' }}>
                Weather Conditions
              </div>
              <div style={sectionContentStyle}>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Weather (Temp, Wind Speed, Visibility, Wind Chill) <span style={{ color: '#b91c1c' }}>*</span></label>
                  <textarea name="weather" value={formData.weather} onChange={handleChange} required placeholder="Example: Temp: -20°F, Wind: 15 mph, Visibility: 1/4 mile, Wind Chill: -45°F" style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} />
                </div>
              </div>
            </div>

            {/* Hazards & Risk Controls */}
            <div style={sectionStyle}>
              <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)', color: 'white', padding: '12px 20px', fontWeight: '600', fontSize: '1rem' }}>
                Hazards & Risk Controls
              </div>
              <div style={sectionContentStyle}>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Hazards & Risks (select all that apply) <span style={{ color: '#b91c1c' }}>*</span></label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px', background: 'white', padding: '15px', borderRadius: '8px', border: '2px solid #d1d5db' }}>
                    {HAZARDS.map(hazard => (
                      <label key={hazard} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={formData.hazards_risks.includes(hazard)}
                          onChange={() => handleCheckboxChange('hazards_risks', hazard)}
                          style={{ width: '18px', height: '18px', accentColor: '#1e3a8a' }}
                        />
                        <span style={{ fontSize: '0.9rem', color: '#374151' }}>{hazard}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Risk Controls & Mitigation Measures (select all that apply) <span style={{ color: '#b91c1c' }}>*</span></label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px', background: 'white', padding: '15px', borderRadius: '8px', border: '2px solid #d1d5db' }}>
                    {CONTROLS.map(control => (
                      <label key={control} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={formData.risk_controls.includes(control)}
                          onChange={() => handleCheckboxChange('risk_controls', control)}
                          style={{ width: '18px', height: '18px', accentColor: '#1e3a8a' }}
                        />
                        <span style={{ fontSize: '0.9rem', color: '#374151' }}>{control}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Emergency Preparedness */}
            <div style={sectionStyle}>
              <div style={{ background: 'linear-gradient(135deg, #b91c1c 0%, #991b1b 100%)', color: 'white', padding: '12px 20px', fontWeight: '600', fontSize: '1rem' }}>
                Emergency Preparedness
              </div>
              <div style={sectionContentStyle}>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Evacuation Vehicle(s) ID & Driver Name(s) <span style={{ color: '#b91c1c' }}>*</span></label>
                  <textarea name="evacuation_vehicle" value={formData.evacuation_vehicle} onChange={handleChange} required placeholder="List vehicle ID(s) and assigned driver(s)..." style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} />
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>On-Site Medic Contact <span style={{ color: '#b91c1c' }}>*</span></label>
                  <input type="text" name="medic_contact" value={formData.medic_contact} onChange={handleChange} required placeholder="Medic name and contact info" style={inputStyle} />
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Verify Medic Has Care Capabilities <span style={{ color: '#b91c1c' }}>*</span></label>
                  <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', background: 'white', padding: '15px', borderRadius: '8px', border: '2px solid #d1d5db' }}>
                    {['Yes - Verified', 'No - Not Verified', 'N/A'].map(option => (
                      <label key={option} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="medic_capabilities"
                          value={option}
                          checked={formData.medic_capabilities === option}
                          onChange={handleChange}
                          required
                          style={{ width: '18px', height: '18px', accentColor: '#1e3a8a' }}
                        />
                        <span style={{ fontSize: '0.95rem', color: '#374151' }}>{option}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Muster Locations <span style={{ color: '#b91c1c' }}>*</span></label>
                  <textarea name="muster_locations" value={formData.muster_locations} onChange={handleChange} required placeholder="List primary and secondary muster locations..." style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} />
                </div>
              </div>
            </div>

            {/* Re-Evaluation */}
            <div style={sectionStyle}>
              <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)', color: 'white', padding: '12px 20px', fontWeight: '600', fontSize: '1rem' }}>
                Re-Evaluation
              </div>
              <div style={sectionContentStyle}>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Re-Evaluation Frequency <span style={{ color: '#b91c1c' }}>*</span></label>
                  <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', background: 'white', padding: '15px', borderRadius: '8px', border: '2px solid #d1d5db' }}>
                    {['Every 30 Minutes', 'Every Hour', 'Every 2 Hours', 'Every 4 Hours', 'As Conditions Change'].map(option => (
                      <label key={option} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="re_eval_frequency"
                          value={option}
                          checked={formData.re_eval_frequency === option}
                          onChange={handleChange}
                          required
                          style={{ width: '18px', height: '18px', accentColor: '#1e3a8a' }}
                        />
                        <span style={{ fontSize: '0.95rem', color: '#374151' }}>{option}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Phase Work Plans */}
            <div style={sectionStyle}>
              <div style={{ background: 'linear-gradient(135deg, #b91c1c 0%, #991b1b 100%)', color: 'white', padding: '12px 20px', fontWeight: '600', fontSize: '1rem' }}>
                Phase Work Plans
              </div>
              <div style={sectionContentStyle}>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Phase 2 Available Work (Describe)</label>
                  <textarea name="phase2_work" value={formData.phase2_work} onChange={handleChange} placeholder="Describe work that can be performed under Phase 2 conditions..." style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} />
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Phase 3 Workplan (Describe)</label>
                  <textarea name="phase3_workplan" value={formData.phase3_workplan} onChange={handleChange} placeholder="Describe workplan for Phase 3 conditions..." style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} />
                </div>
              </div>
            </div>

            {/* Status & Approval */}
            <div style={sectionStyle}>
              <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)', color: 'white', padding: '12px 20px', fontWeight: '600', fontSize: '1rem' }}>
                Status & Approval
              </div>
              <div style={sectionContentStyle}>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Work Suspended? <span style={{ color: '#b91c1c' }}>*</span></label>
                  <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', background: 'white', padding: '15px', borderRadius: '8px', border: '2px solid #d1d5db' }}>
                    {['No - Work Continuing', 'Yes - Work Suspended', 'Modified Work Only'].map(option => (
                      <label key={option} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="work_suspended"
                          value={option}
                          checked={formData.work_suspended === option}
                          onChange={handleChange}
                          required
                          style={{ width: '18px', height: '18px', accentColor: '#1e3a8a' }}
                        />
                        <span style={{ fontSize: '0.95rem', color: '#374151' }}>{option}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Phase Management Team Approves Plan? <span style={{ color: '#b91c1c' }}>*</span></label>
                  <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', background: 'white', padding: '15px', borderRadius: '8px', border: '2px solid #d1d5db' }}>
                    {['Yes - Approved', 'No - Not Approved', 'Pending Review'].map(option => (
                      <label key={option} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="team_approves"
                          value={option}
                          checked={formData.team_approves === option}
                          onChange={handleChange}
                          required
                          style={{ width: '18px', height: '18px', accentColor: '#1e3a8a' }}
                        />
                        <span style={{ fontSize: '0.95rem', color: '#374151' }}>{option}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Photo Upload */}
            <div style={sectionStyle}>
              <div style={{ background: 'linear-gradient(135deg, #b91c1c 0%, #991b1b 100%)', color: 'white', padding: '12px 20px', fontWeight: '600', fontSize: '1rem' }}>
                Photo Documentation
              </div>
              <div style={sectionContentStyle}>
                <label style={labelStyle}>Upload Photo (optional)</label>
                <div
                  onClick={() => document.getElementById('photo').click()}
                  style={{
                    border: photoPreview ? '2px dashed #059669' : '2px dashed #d1d5db',
                    borderRadius: '12px',
                    padding: '30px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: photoPreview ? '#ecfdf5' : 'white'
                  }}
                >
                  <input type="file" id="photo" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
                  <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>📷</div>
                  <div style={{ color: '#6b7280', fontSize: '0.95rem' }}>Click or tap to upload a photo</div>
                  {photoPreview && <div style={{ marginTop: '10px', color: '#059669', fontWeight: '600' }}>{photoPreview}</div>}
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
                background: isSubmitting ? '#9ca3af' : 'linear-gradient(135deg, #1e3a8a 0%, #b91c1c 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '1.1rem',
                fontWeight: '600',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                boxShadow: isSubmitting ? 'none' : '0 4px 15px rgba(30, 58, 138, 0.3)'
              }}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Assessment'}
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
          <span style={{ color: '#1e3a5f', fontWeight: '500' }}>Powered by Predictive Safety Analytics™</span>
          <span style={{ color: '#94a3b8', margin: '0 8px' }}>|</span>
          <span style={{ color: '#475569' }}>© 2025 SLP Alaska</span>
        </div>

      </div>
    </div>
  )
}

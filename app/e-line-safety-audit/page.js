'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://iypezirwdlqpptjpeeyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
)

const COMPANIES = ['A-C Electric', 'AKE-Line', 'Apache Corp.', 'Armstrong Oil & Gas', 'ASRC Energy Services', 'CCI- Industrial', 'Chosen Construction', 'CINGSA', 'Coho Enterprises', 'Conam Construction', 'ConocoPhillips', 'Five Star Oilfield Services', 'Fox Energy Services', 'G.A. West', 'GBR Equipment', 'GLM Energy Services', 'Graham Industrial Coatings', 'Harvest Midstream', 'Hilcorp Alaska', 'MagTec Alaska', 'Merkes Builders', 'Nordic-Calista', 'Parker TRS', 'Peninsula Paving', 'Pollard Wireline', 'Ridgeline Oilfield Services', 'Santos', 'Summit Excavation', 'Tesoro Refinery', 'Yellowjacket', 'Other']

const LOCATIONS = ['Kenai', 'CIO', 'Beaver Creek', 'Swanson River', 'Ninilchik', 'Nikiski', 'Other Kenai Asset', 'Deadhorse', 'Prudhoe Bay', 'Kuparuk', 'Alpine', 'Willow', 'ENI', 'PIKKA', 'Point Thompson', 'North Star Island', 'Endicott', 'Badami', 'Other North Slope']

export default function ELineSafetyAuditForm() {
  const [formData, setFormData] = useState({
    auditor_name: '', audit_date: new Date().toISOString().split('T')[0], job_number: '', company: '', location: '', well_name: '', client_rep: '', unit_id: '', crew_size: '',
    jsa_reviewed: '', work_permit: '', hot_work_permit: '', confined_space_permit: '', emergency_plan: '', client_requirements: '', pre_job_meeting: '',
    crew_training: '', well_control_cert: '', h2s_training: '', first_aid_cpr: '', ppe_appropriate: '', frc_worn: '',
    unit_pre_trip: '', drum_cable: '', measuring_device: '', depth_counter: '', weak_point: '', cable_head: '', tools_inspected: '',
    lubricator_condition: '', lubricator_pressure: '', grease_injection: '', stuffing_box: '', flow_tubes: '', bop_installed: '', bop_tested: '', bop_pressure: '',
    low_pressure_test: '', low_test_pressure: '', high_pressure_test: '', high_test_pressure: '', test_documented: '',
    sheave_condition: '', sheave_aligned: '', weight_indicator: '', gin_pole: '', guy_wires: '', floor_anchors: '',
    unit_grounded: '', bonding_verified: '', electrical_connections: '', cable_insulation: '', control_panel: '',
    well_status: '', wellhead_condition: '', pressure_readings: '', flow_line: '', kill_line: '',
    access_egress: '', work_area_barricaded: '', wind_conditions: '', weather_conditions: '', lighting_adequate: '', housekeeping: '',
    radio_check: '', emergency_contacts: '', muster_point: '', client_communication: '',
    overall_result: '', job_approved: '', critical_issues: '', issue_description: '', corrective_actions: '', comments: ''
  })

  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [showIssues, setShowIssues] = useState(false)
  const [resultDisplay, setResultDisplay] = useState({ text: 'Select audit result above', className: 'result-pending' })
  const [status, setStatus] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (name === 'critical_issues') setShowIssues(value === 'Yes')
    if (name === 'overall_result') {
      if (value.includes('Pass - All')) setResultDisplay({ text: '✅ AUDIT PASSED - Job Safe to Proceed', className: 'result-pass' })
      else if (value.includes('Pass - Minor')) setResultDisplay({ text: '⚠️ PASSED WITH NOTES - Address minor issues', className: 'result-warning' })
      else if (value.includes('Fail')) setResultDisplay({ text: '🛑 AUDIT FAILED - Do not proceed until resolved', className: 'result-fail' })
      else setResultDisplay({ text: 'Select audit result above', className: 'result-pending' })
    }
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setPhotoFile(file)
      const reader = new FileReader()
      reader.onload = (e) => setPhotoPreview(e.target.result)
      reader.readAsDataURL(file)
    }
  }

  const uploadPhoto = async (file) => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `eline-photos/${fileName}`
      const { error } = await supabase.storage.from('safety-photos').upload(filePath, file)
      if (error) throw error
      const { data: urlData } = supabase.storage.from('safety-photos').getPublicUrl(filePath)
      return urlData.publicUrl
    } catch (error) {
      console.error('Photo upload error:', error)
      return null
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setStatus('Submitting...')

    try {
      let photoUrl = ''
      if (photoFile) {
        setStatus('Uploading photo...')
        photoUrl = await uploadPhoto(photoFile)
      }

      const dataToSubmit = {
        ...formData,
        crew_size: formData.crew_size ? parseInt(formData.crew_size) : null,
        low_test_pressure: formData.low_test_pressure ? parseFloat(formData.low_test_pressure) : null,
        high_test_pressure: formData.high_test_pressure ? parseFloat(formData.high_test_pressure) : null,
        photo_url: photoUrl || null
      }

      const { error } = await supabase.from('eline_safety_audits').insert([dataToSubmit])
      if (error) throw error

      setStatus('✅ E-Line Safety Audit submitted successfully!')
      setTimeout(() => window.location.reload(), 2000)
    } catch (error) {
      console.error('Error:', error)
      setStatus('❌ Error: ' + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const ChecklistTable = ({ title, items, valueKey }) => (
    <div style={{ marginBottom: '25px' }}>
      {title && <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#1e3a8a' }}>{title}</h3>}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f3f4f6', borderBottom: '2px solid #d1d5db' }}>
            <th style={{ textAlign: 'left', padding: '10px', fontSize: '13px' }}>Item</th>
            {valueKey === 'yn' ? (
              <>
                <th style={{ textAlign: 'center', padding: '10px', fontSize: '13px', width: '60px' }}>Yes</th>
                <th style={{ textAlign: 'center', padding: '10px', fontSize: '13px', width: '60px' }}>No</th>
                <th style={{ textAlign: 'center', padding: '10px', fontSize: '13px', width: '60px' }}>N/A</th>
              </>
            ) : (
              <>
                <th style={{ textAlign: 'center', padding: '10px', fontSize: '13px', width: '60px' }}>OK</th>
                <th style={{ textAlign: 'center', padding: '10px', fontSize: '13px', width: '90px' }}>Deficient</th>
                <th style={{ textAlign: 'center', padding: '10px', fontSize: '13px', width: '60px' }}>N/A</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
              <td style={{ padding: '10px', fontSize: '14px' }}>{item.label}</td>
              {valueKey === 'yn' ? (
                <>
                  <td style={{ textAlign: 'center', padding: '10px' }}><input type="radio" name={item.name} value="Yes" checked={formData[item.name] === 'Yes'} onChange={handleChange} required style={{ width: '18px', height: '18px', cursor: 'pointer' }} /></td>
                  <td style={{ textAlign: 'center', padding: '10px' }}><input type="radio" name={item.name} value="No" checked={formData[item.name] === 'No'} onChange={handleChange} style={{ width: '18px', height: '18px', cursor: 'pointer' }} /></td>
                  <td style={{ textAlign: 'center', padding: '10px' }}><input type="radio" name={item.name} value="N/A" checked={formData[item.name] === 'N/A'} onChange={handleChange} style={{ width: '18px', height: '18px', cursor: 'pointer' }} /></td>
                </>
              ) : (
                <>
                  <td style={{ textAlign: 'center', padding: '10px' }}><input type="radio" name={item.name} value="OK" checked={formData[item.name] === 'OK'} onChange={handleChange} required style={{ width: '18px', height: '18px', cursor: 'pointer' }} /></td>
                  <td style={{ textAlign: 'center', padding: '10px' }}><input type="radio" name={item.name} value="Deficient" checked={formData[item.name] === 'Deficient'} onChange={handleChange} style={{ width: '18px', height: '18px', cursor: 'pointer' }} /></td>
                  <td style={{ textAlign: 'center', padding: '10px' }}><input type="radio" name={item.name} value="N/A" checked={formData[item.name] === 'N/A'} onChange={handleChange} style={{ width: '18px', height: '18px', cursor: 'pointer' }} /></td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  return (
    <div style={{ padding: '20px', backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
      <a href="/" style={{ display: 'inline-block', marginBottom: '15px', padding: '10px 20px', backgroundColor: '#1e3a5f', color: '#fff', textDecoration: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '500' }}>← Back to Portal</a>
      <div style={{ maxWidth: '900px', margin: '0 auto', background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        
        <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)', color: 'white', padding: '30px', textAlign: 'center' }}>
          <img src="/Logo.png" alt="SLP Alaska Logo" style={{ maxWidth: '180px', height: 'auto', marginBottom: '15px', display: 'block', margin: '0 auto 15px auto' }} />
          <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 700 }}>E-Line Safety Audit</h1>
          <p style={{ margin: '10px 0 0', opacity: 0.9, fontSize: '14px' }}>Pre-Job Safety Audit for Electric Line Operations</p>
          <div style={{ display: 'inline-block', background: '#f59e0b', color: '#000', padding: '5px 15px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, marginTop: '10px' }}>⚡ Electric Line Operations</div>
        </div>

        <div style={{ padding: '30px' }}>
          <form onSubmit={handleSubmit}>
            
            <div style={{ background: '#1e3a8a', color: 'white', padding: '12px 20px', margin: '0 -30px 20px', fontWeight: 600, fontSize: '15px' }}>📋 Job Information</div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '18px' }}>
              <div><label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>Auditor Name *</label><input type="text" name="auditor_name" value={formData.auditor_name} onChange={handleChange} required style={{ width: '100%', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box' }} /></div>
              <div><label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>Date *</label><input type="date" name="audit_date" value={formData.audit_date} onChange={handleChange} required style={{ width: '100%', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box' }} /></div>
              <div><label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>Job Number *</label><input type="text" name="job_number" value={formData.job_number} onChange={handleChange} required style={{ width: '100%', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box' }} /></div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '18px' }}>
              <div><label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>Company *</label><select name="company" value={formData.company} onChange={handleChange} required style={{ width: '100%', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box' }}><option value="">-- Select Company --</option>{COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
              <div><label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>Location *</label><select name="location" value={formData.location} onChange={handleChange} required style={{ width: '100%', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box' }}><option value="">-- Select Location --</option>{LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}</select></div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '18px' }}>
              <div><label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>Well Name/ID *</label><input type="text" name="well_name" value={formData.well_name} onChange={handleChange} required style={{ width: '100%', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box' }} /></div>
              <div><label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>Client Representative</label><input type="text" name="client_rep" value={formData.client_rep} onChange={handleChange} style={{ width: '100%', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box' }} /></div>
              <div><label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>E-Line Unit ID *</label><input type="text" name="unit_id" value={formData.unit_id} onChange={handleChange} required style={{ width: '100%', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box' }} /></div>
            </div>

            <div style={{ maxWidth: '200px', marginBottom: '25px' }}><label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>Crew Size</label><input type="number" name="crew_size" value={formData.crew_size} onChange={handleChange} min="1" max="20" style={{ width: '100%', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box' }} /></div>

            <div style={{ background: '#ea580c', color: 'white', padding: '12px 20px', margin: '25px -30px 20px', fontWeight: 600, fontSize: '15px' }}>📝 Pre-Job Planning</div>
            <ChecklistTable items={[
              { name: 'jsa_reviewed', label: 'JSA/JHA reviewed with crew' },
              { name: 'work_permit', label: 'Work permit obtained' },
              { name: 'hot_work_permit', label: 'Hot work permit (if required)' },
              { name: 'confined_space_permit', label: 'Confined space permit (if required)' },
              { name: 'emergency_plan', label: 'Emergency action plan reviewed' },
              { name: 'client_requirements', label: 'Client-specific requirements reviewed' },
              { name: 'pre_job_meeting', label: 'Pre-job safety meeting held' }
            ]} valueKey="yn" />

            <div style={{ background: '#059669', color: 'white', padding: '12px 20px', margin: '25px -30px 20px', fontWeight: 600, fontSize: '15px' }}>👷 Personnel & Training</div>
            <ChecklistTable items={[
              { name: 'crew_training', label: 'Crew training certifications current' },
              { name: 'well_control_cert', label: 'Well control certification current' },
              { name: 'h2s_training', label: 'H2S training current' },
              { name: 'first_aid_cpr', label: 'First Aid/CPR training current' },
              { name: 'ppe_appropriate', label: 'PPE appropriate for task' },
              { name: 'frc_worn', label: 'FRC/Nomex worn by all personnel' }
            ]} valueKey="yn" />

            <div style={{ background: '#7c3aed', color: 'white', padding: '12px 20px', margin: '25px -30px 20px', fontWeight: 600, fontSize: '15px' }}>🚛 E-Line Unit & Equipment</div>
            <ChecklistTable items={[
              { name: 'unit_pre_trip', label: 'Unit pre-trip inspection complete' },
              { name: 'drum_cable', label: 'Drum and cable condition' },
              { name: 'measuring_device', label: 'Measuring device calibrated' },
              { name: 'depth_counter', label: 'Depth counter zeroed' },
              { name: 'weak_point', label: 'Weak point installed and verified' },
              { name: 'cable_head', label: 'Cable head inspected' },
              { name: 'tools_inspected', label: 'Tools inspected and ready' }
            ]} valueKey="ok" />

            <div style={{ background: '#dc2626', color: 'white', padding: '12px 20px', margin: '25px -30px 20px', fontWeight: 600, fontSize: '15px' }}>🔧 Pressure Control Equipment</div>
            <ChecklistTable items={[
              { name: 'lubricator_condition', label: 'Lubricator condition' },
              { name: 'lubricator_pressure', label: 'Lubricator pressure rating adequate' },
              { name: 'grease_injection', label: 'Grease injection head condition' },
              { name: 'stuffing_box', label: 'Stuffing box condition' },
              { name: 'flow_tubes', label: 'Flow tubes inspected' },
              { name: 'bop_installed', label: 'BOP installed correctly' },
              { name: 'bop_tested', label: 'BOP function tested' },
              { name: 'bop_pressure', label: 'BOP pressure rating adequate' }
            ]} valueKey="ok" />

            <div style={{ background: '#0891b2', color: 'white', padding: '12px 20px', margin: '25px -30px 20px', fontWeight: 600, fontSize: '15px' }}>📊 Pressure Testing</div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '10px', background: '#f3f4f6', borderRadius: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
              <label style={{ margin: 0, minWidth: '150px', fontWeight: 500 }}>Low Pressure Test: *</label>
              <div style={{ display: 'flex', gap: '15px', flex: 1, flexWrap: 'wrap' }}>
                {['Pass', 'Fail', 'N/A'].map(v => <label key={v} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 15px', border: '2px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', background: '#fff' }}><input type="radio" name="low_pressure_test" value={v} checked={formData.low_pressure_test === v} onChange={handleChange} required /><span>{v}</span></label>)}
              </div>
              <input type="number" name="low_test_pressure" value={formData.low_test_pressure} onChange={handleChange} placeholder="PSI" style={{ width: '120px', padding: '10px', border: '2px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box' }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '10px', background: '#f3f4f6', borderRadius: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
              <label style={{ margin: 0, minWidth: '150px', fontWeight: 500 }}>High Pressure Test: *</label>
              <div style={{ display: 'flex', gap: '15px', flex: 1, flexWrap: 'wrap' }}>
                {['Pass', 'Fail', 'N/A'].map(v => <label key={v} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 15px', border: '2px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', background: '#fff' }}><input type="radio" name="high_pressure_test" value={v} checked={formData.high_pressure_test === v} onChange={handleChange} required /><span>{v}</span></label>)}
              </div>
              <input type="number" name="high_test_pressure" value={formData.high_test_pressure} onChange={handleChange} placeholder="PSI" style={{ width: '120px', padding: '10px', border: '2px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: '25px' }}>
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: 500 }}>Pressure Tests Documented? *</label>
              <div style={{ display: 'flex', gap: '15px' }}>
                {['Yes', 'No'].map(v => <label key={v} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 15px', border: '2px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}><input type="radio" name="test_documented" value={v} checked={formData.test_documented === v} onChange={handleChange} required /><span>{v}</span></label>)}
              </div>
            </div>

            <div style={{ background: '#1e3a8a', color: 'white', padding: '12px 20px', margin: '25px -30px 20px', fontWeight: 600, fontSize: '15px' }}>🔗 Rigging & Sheaves</div>
            <ChecklistTable items={[
              { name: 'sheave_condition', label: 'Sheave wheel condition' },
              { name: 'sheave_aligned', label: 'Sheave properly aligned' },
              { name: 'weight_indicator', label: 'Weight indicator working' },
              { name: 'gin_pole', label: 'Gin pole/mast secured' },
              { name: 'guy_wires', label: 'Guy wires properly tensioned' },
              { name: 'floor_anchors', label: 'Floor anchors secure' }
            ]} valueKey="ok" />

            <div style={{ background: '#f59e0b', color: '#000', padding: '12px 20px', margin: '25px -30px 20px', fontWeight: 600, fontSize: '15px' }}>⚡ Electrical Safety</div>
            <ChecklistTable items={[
              { name: 'unit_grounded', label: 'Unit properly grounded' },
              { name: 'bonding_verified', label: 'Bonding verified' },
              { name: 'electrical_connections', label: 'Electrical connections secure' },
              { name: 'cable_insulation', label: 'Cable insulation intact' },
              { name: 'control_panel', label: 'Control panel condition' }
            ]} valueKey="ok" />

            <div style={{ background: '#ea580c', color: 'white', padding: '12px 20px', margin: '25px -30px 20px', fontWeight: 600, fontSize: '15px' }}>🛢️ Well Site Safety</div>
            <ChecklistTable items={[
              { name: 'well_status', label: 'Well status verified with client' },
              { name: 'wellhead_condition', label: 'Wellhead condition acceptable' },
              { name: 'pressure_readings', label: 'Pressure readings noted' },
              { name: 'flow_line', label: 'Flow line secured' },
              { name: 'kill_line', label: 'Kill line available' }
            ]} valueKey="ok" />

            <div style={{ background: '#059669', color: 'white', padding: '12px 20px', margin: '25px -30px 20px', fontWeight: 600, fontSize: '15px' }}>🌍 Site Conditions</div>
            <ChecklistTable items={[
              { name: 'access_egress', label: 'Access/egress routes clear' },
              { name: 'work_area_barricaded', label: 'Work area barricaded' },
              { name: 'wind_conditions', label: 'Wind conditions acceptable' },
              { name: 'weather_conditions', label: 'Weather conditions acceptable' },
              { name: 'lighting_adequate', label: 'Lighting adequate' },
              { name: 'housekeeping', label: 'Housekeeping acceptable' }
            ]} valueKey="ok" />

            <div style={{ background: '#1e3a8a', color: 'white', padding: '12px 20px', margin: '25px -30px 20px', fontWeight: 600, fontSize: '15px' }}>📻 Communications</div>
            <ChecklistTable items={[
              { name: 'radio_check', label: 'Radio check complete' },
              { name: 'emergency_contacts', label: 'Emergency contacts posted' },
              { name: 'muster_point', label: 'Muster point identified' },
              { name: 'client_communication', label: 'Client communication established' }
            ]} valueKey="yn" />

            <div style={{ background: '#dc2626', color: 'white', padding: '12px 20px', margin: '25px -30px 20px', fontWeight: 600, fontSize: '15px' }}>✅ Audit Result</div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '18px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>Overall Audit Result *</label>
                <select name="overall_result" value={formData.overall_result} onChange={handleChange} required style={{ width: '100%', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box' }}>
                  <option value="">-- Select --</option>
                  <option value="Pass - All Items OK">✅ Pass - All Items OK</option>
                  <option value="Pass - Minor Issues">⚠️ Pass - Minor Issues Noted</option>
                  <option value="Fail - Critical Issues">❌ Fail - Critical Issues Found</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>Job Approved to Proceed? *</label>
                <select name="job_approved" value={formData.job_approved} onChange={handleChange} required style={{ width: '100%', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box' }}>
                  <option value="">-- Select --</option>
                  <option value="Yes">Yes - Approved</option>
                  <option value="No">No - Not Approved</option>
                  <option value="Conditional">Conditional - With Corrective Actions</option>
                </select>
              </div>
            </div>

            <div style={{ padding: '20px', borderRadius: '10px', textAlign: 'center', margin: '20px 0', fontWeight: 600, fontSize: '18px', background: resultDisplay.className === 'result-pass' ? '#d1fae5' : resultDisplay.className === 'result-warning' ? '#fef3c7' : resultDisplay.className === 'result-fail' ? '#fee2e2' : '#f3f4f6', border: resultDisplay.className === 'result-pass' ? '2px solid #059669' : resultDisplay.className === 'result-warning' ? '2px solid #f59e0b' : resultDisplay.className === 'result-fail' ? '2px solid #dc2626' : '2px solid #d1d5db', color: resultDisplay.className === 'result-pass' ? '#065f46' : resultDisplay.className === 'result-warning' ? '#92400e' : resultDisplay.className === 'result-fail' ? '#991b1b' : '#6b7280' }}>
              {resultDisplay.text}
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: 500 }}>Critical Issues Found? *</label>
              <div style={{ display: 'flex', gap: '15px' }}>
                {['Yes', 'No'].map(v => <label key={v} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 15px', border: '2px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}><input type="radio" name="critical_issues" value={v} checked={formData.critical_issues === v} onChange={handleChange} required /><span>{v}</span></label>)}
              </div>
            </div>

            {showIssues && (
              <div style={{ background: '#fef2f2', border: '2px solid #dc2626', borderRadius: '8px', padding: '20px', marginTop: '15px' }}>
                <h3 style={{ color: '#dc2626', marginBottom: '15px' }}>⚠️ CRITICAL ISSUES - ACTION REQUIRED</h3>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>Issue Description *</label>
                  <textarea name="issue_description" value={formData.issue_description} onChange={handleChange} required={showIssues} placeholder="Describe all critical issues found..." style={{ width: '100%', minHeight: '80px', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px', resize: 'vertical', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>Corrective Actions Required *</label>
                  <textarea name="corrective_actions" value={formData.corrective_actions} onChange={handleChange} required={showIssues} placeholder="Describe corrective actions taken or required..." style={{ width: '100%', minHeight: '80px', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px', resize: 'vertical', boxSizing: 'border-box' }} />
                </div>
              </div>
            )}

            <div style={{ marginBottom: '25px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>Additional Comments</label>
              <textarea name="comments" value={formData.comments} onChange={handleChange} placeholder="Any additional observations or notes..." style={{ width: '100%', minHeight: '80px', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>

            <div style={{ background: '#1e3a8a', color: 'white', padding: '12px 20px', margin: '25px -30px 20px', fontWeight: 600, fontSize: '15px' }}>📷 Photo Documentation</div>
            
            <div style={{ marginBottom: '25px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>Photo (Optional)</label>
              <div onClick={() => document.getElementById('photoInput').click()} style={{ border: photoPreview ? '2px solid #059669' : '2px dashed #d1d5db', borderRadius: '8px', padding: '30px', textAlign: 'center', cursor: 'pointer' }}>
                <input type="file" id="photoInput" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
                {!photoPreview && <><p>📷 Tap to take or upload photo</p><p style={{ fontSize: '12px', color: '#6b7280' }}>Document equipment setup or any issues found</p></>}
                {photoPreview && <img src={photoPreview} alt="Preview" style={{ maxWidth: '200px', maxHeight: '150px', marginTop: '10px', borderRadius: '4px' }} />}
              </div>
            </div>

            <button type="submit" disabled={isSubmitting} style={{ width: '100%', padding: '16px', background: isSubmitting ? '#d1d5db' : 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '18px', fontWeight: 600, cursor: isSubmitting ? 'not-allowed' : 'pointer', marginTop: '20px' }}>
              {isSubmitting ? 'Submitting...' : 'Submit E-Line Safety Audit'}
            </button>

            {status && (
              <div style={{ marginTop: '15px', padding: '12px', background: status.includes('✅') ? '#d1fae5' : '#fee2e2', color: status.includes('✅') ? '#065f46' : '#991b1b', borderRadius: '6px', textAlign: 'center' }}>
                {status}
              </div>
            )}
          </form>
        </div>
      </div>

      <div style={{ textAlign: 'center', padding: '20px 10px', marginTop: '30px', fontSize: '11px', color: '#64748b' }}>
        <span style={{ color: '#1e3a5f', fontWeight: 500 }}>AnthroSafe™ Powered by Field Driven Data™</span>
        <span style={{ color: '#94a3b8', margin: '0 8px' }}>|</span>
        <span style={{ color: '#475569' }}>© 2025 SLP Alaska</span>
      </div>
    </div>
  )
}

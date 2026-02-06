'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

const COMPANIES = [
  'A-C Electric', 'AKE-Line', 'Apache Corp.', 'Armstrong Oil & Gas', 'ASRC Energy Services',
  'CCI-Industrial', 'Chosen Construction', 'CINGSA', 'Coho Enterprises', 'Conam Construction',
  'ConocoPhillips', 'Five Star Oilfield Services', 'Fox Energy Services', 'G.A. West',
  'GBR Equipment', 'GLM Energy Services', 'Graham Industrial Coatings', 'Harvest Midstream',
  'Hilcorp Alaska', 'MagTec Alaska', 'Merkes Builders', 'Nordic-Calista', 'Parker TRS',
  'Peninsula Paving', 'Pollard Wireline', 'Ridgeline Oilfield Services', 'Santos',
  'Summit Excavation', 'Tesoro Refinery', 'Yellowjacket', 'Other'
]

const LOCATIONS = [
  'Kenai', 'CIO', 'Beaver Creek', 'Swanson River', 'Ninilchik', 'Nikiski', 'Other Kenai Asset',
  'Deadhorse', 'Prudhoe Bay', 'Kuparuk', 'Alpine', 'Willow', 'ENI', 'PIKKA', 'Point Thompson',
  'North Star Island', 'Endicott', 'Badami', 'Other North Slope'
]

const EXCAVATION_TYPES = ['Trench', 'Bell-Bottom Pier Hole', 'Shaft', 'Open Excavation', 'Other']
const SOIL_CLASSIFICATIONS = ['Type A - Stable Rock', 'Type A - Clay', 'Type B - Silt', 'Type B - Medium Clay', 'Type B - Unstable Rock', 'Type C - Gravel', 'Type C - Sand', 'Type C - Submerged Soil', 'Layered - Multiple Types']
const PROTECTIVE_SYSTEMS = ['Sloping', 'Benching', 'Shoring - Timber', 'Shoring - Aluminum Hydraulic', 'Shielding - Trench Box', 'Shielding - Steel Plate', 'Combination', 'None Required (<4ft)']
const WEATHER_CONDITIONS = ['Clear/Sunny', 'Partly Cloudy', 'Overcast', 'Light Rain', 'Heavy Rain', 'Snow', 'Freezing Rain', 'High Wind']

export default function CompetentPersonForm() {
  const [formData, setFormData] = useState({
    inspectionDate: new Date().toISOString().split('T')[0],
    inspectionTime: new Date().toTimeString().slice(0, 5),
    competentPerson: '', company: '', location: '', specificLocation: '',
    excavationType: '', depthFt: '', lengthFt: '', widthFt: '',
    soilClassification: '', protectiveSystem: '', weatherConditions: '',
    rainLast24hrs: '', freezeThaw: '', caveInPotential: '', soilStability: '',
    waterAccumulation: '', protectiveSystemCondition: '', shoringSecure: '',
    slopeAngle: '', spoilPileSetback: '', ladderAccessOk: '', ladderWithin25ft: '',
    rampStairsOk: '', trafficControlsOk: '', barricadesOk: '', warningSignsOk: '',
    adjacentStructuresOk: '', utilitiesProtected: '', atmosphereTested: '',
    o2Level: '', lelLevel: '', h2sLevel: '', coLevel: '', ventilationAdequate: '',
    surfaceEncumbrances: '', equipmentSetback: '', ppeInUse: '', emergencyEquipment: '',
    workAuthorized: '', correctiveActions: '', inspectorSignature: ''
  })

  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const setField = (name, value) => setFormData(prev => ({ ...prev, [name]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage({ type: '', text: '' })

    try {
      const inspectionNumber = `CP-${Date.now()}`
      const { error } = await supabase.from('competent_person_inspections').insert([{
        inspection_number: inspectionNumber,
        inspection_date: formData.inspectionDate,
        inspection_time: formData.inspectionTime,
        competent_person: formData.competentPerson,
        company: formData.company,
        location: formData.location,
        specific_location: formData.specificLocation || null,
        excavation_type: formData.excavationType,
        depth_ft: formData.depthFt ? parseFloat(formData.depthFt) : null,
        length_ft: formData.lengthFt ? parseFloat(formData.lengthFt) : null,
        width_ft: formData.widthFt ? parseFloat(formData.widthFt) : null,
        soil_classification: formData.soilClassification,
        protective_system: formData.protectiveSystem,
        weather_conditions: formData.weatherConditions,
        rain_last_24hrs: formData.rainLast24hrs,
        freeze_thaw: formData.freezeThaw,
        cave_in_potential: formData.caveInPotential,
        soil_stability: formData.soilStability,
        water_accumulation: formData.waterAccumulation,
        protective_system_condition: formData.protectiveSystemCondition,
        shoring_secure: formData.shoringSecure,
        slope_angle: formData.slopeAngle,
        spoil_pile_setback: formData.spoilPileSetback,
        ladder_access_ok: formData.ladderAccessOk,
        ladder_within_25ft: formData.ladderWithin25ft,
        ramp_stairs_ok: formData.rampStairsOk,
        traffic_controls_ok: formData.trafficControlsOk,
        barricades_ok: formData.barricadesOk,
        warning_signs_ok: formData.warningSignsOk,
        adjacent_structures_ok: formData.adjacentStructuresOk,
        utilities_protected: formData.utilitiesProtected,
        atmosphere_tested: formData.atmosphereTested,
        o2_level: formData.o2Level || null,
        lel_level: formData.lelLevel || null,
        h2s_level: formData.h2sLevel || null,
        co_level: formData.coLevel || null,
        ventilation_adequate: formData.ventilationAdequate || null,
        surface_encumbrances: formData.surfaceEncumbrances,
        equipment_setback: formData.equipmentSetback,
        ppe_in_use: formData.ppeInUse,
        emergency_equipment: formData.emergencyEquipment,
        work_authorized: formData.workAuthorized,
        corrective_actions: formData.correctiveActions || null,
        inspector_signature: formData.inspectorSignature
      }])

      if (error) throw error
      setMessage({ type: 'success', text: `Inspection submitted successfully! Inspection #: ${inspectionNumber}` })
      setFormData({
        inspectionDate: new Date().toISOString().split('T')[0],
        inspectionTime: new Date().toTimeString().slice(0, 5),
        competentPerson: '', company: '', location: '', specificLocation: '',
        excavationType: '', depthFt: '', lengthFt: '', widthFt: '',
        soilClassification: '', protectiveSystem: '', weatherConditions: '',
        rainLast24hrs: '', freezeThaw: '', caveInPotential: '', soilStability: '',
        waterAccumulation: '', protectiveSystemCondition: '', shoringSecure: '',
        slopeAngle: '', spoilPileSetback: '', ladderAccessOk: '', ladderWithin25ft: '',
        rampStairsOk: '', trafficControlsOk: '', barricadesOk: '', warningSignsOk: '',
        adjacentStructuresOk: '', utilitiesProtected: '', atmosphereTested: '',
        o2Level: '', lelLevel: '', h2sLevel: '', coLevel: '', ventilationAdequate: '',
        surfaceEncumbrances: '', equipmentSetback: '', ppeInUse: '', emergencyEquipment: '',
        workAuthorized: '', correctiveActions: '', inspectorSignature: ''
      })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      console.error('Error:', error)
      setMessage({ type: 'error', text: 'Error submitting form: ' + error.message })
    } finally {
      setSubmitting(false)
    }
  }

  const YesNo = ({ field, options = ['Yes', 'No'] }) => (
    <div className="yes-no-group">
      {options.map(opt => (
        <div key={opt} className={`yes-no-option ${formData[field] === opt ? 'selected' : ''}`}
          onClick={() => setField(field, opt)}>{opt}</div>
      ))}
    </div>
  )

  const CheckItem = ({ label, field, options = ['Yes', 'No', 'N/A'] }) => (
    <div className="checklist-item">
      <label>{label} *</label>
      <YesNo field={field} options={options} />
    </div>
  )

  return (
    <div className="cp-form-page">
      <style jsx global>{`
        .cp-form-page { 
          min-height: 100vh; 
          background: #b91c1c;
          padding: 20px; 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
        }
        .back-link { display: inline-block; margin-bottom: 20px; color: white; text-decoration: none; font-weight: 600; padding: 10px 20px; background: #1e3a8a; border-radius: 6px; transition: background 0.3s; }
        .back-link:hover { background: #1e40af; }
        .cp-container { max-width: 800px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); padding: 0; overflow: hidden; border: 4px solid #1e3a8a; }
        
        .cp-header { background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 30px; text-align: center; border-bottom: 6px solid #1e3a8a; }
        .cp-header img { max-height: 80px; margin-bottom: 15px; }
        .cp-header h1 { color: white; margin: 0 0 10px 0; font-size: 28px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); }
        .cp-header .subtitle { color: #fecaca; font-size: 16px; font-weight: 600; }
        .osha-badge { display: inline-block; background: #1e3a8a; color: white; padding: 8px 20px; border-radius: 20px; font-size: 12px; margin-top: 15px; font-weight: 600; border: 2px solid white; }
        
        .form-content { padding: 30px 40px 40px 40px; }
        
        .warning-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 25px; border-radius: 0 8px 8px 0; font-size: 14px; color: #92400e; }
        .message { padding: 15px; border-radius: 6px; margin-bottom: 20px; text-align: center; font-weight: 500; }
        .message.success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .message.error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        
        .section-header { background: #1e3a8a; color: white; padding: 12px 20px; margin: 30px -40px 20px -40px; font-weight: 600; font-size: 16px; }
        .section-header.red { background: #dc2626; }
        .section-header.green { background: #15803d; }
        .section-header:first-of-type { margin-top: 0; }
        
        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; margin-bottom: 8px; color: #1e3a8a; font-weight: 600; }
        .form-group input, .form-group select, .form-group textarea { width: 100%; padding: 12px; border: 2px solid #cbd5e1; border-radius: 8px; font-size: 16px; transition: border-color 0.3s; box-sizing: border-box; }
        .form-group input:focus, .form-group select:focus, .form-group textarea:focus { outline: none; border-color: #1e3a8a; box-shadow: 0 0 0 3px rgba(30, 58, 138, 0.1); }
        .form-group textarea { min-height: 100px; resize: vertical; }
        .form-row { display: flex; gap: 20px; }
        .form-row .form-group { flex: 1; }
        .form-row-3 { display: flex; gap: 20px; }
        .form-row-3 .form-group { flex: 1; }
        
        .checklist-item { background: #f1f5f9; border-radius: 8px; padding: 15px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; border-left: 4px solid #1e3a8a; }
        .checklist-item label { font-weight: 600; color: #1e3a8a; flex: 1; min-width: 200px; margin: 0; }
        .yes-no-group { display: flex; gap: 8px; flex-wrap: wrap; }
        .yes-no-option { padding: 8px 16px; border: 2px solid #cbd5e1; border-radius: 6px; cursor: pointer; transition: all 0.2s; font-weight: 600; text-align: center; background: white; }
        .yes-no-option:hover { border-color: #1e3a8a; background: #eff6ff; }
        .yes-no-option.selected { background: #1e3a8a; color: white; border-color: #1e3a8a; }
        
        .atmosphere-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; background: #f1f5f9; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 2px solid #1e3a8a; }
        .atmosphere-item label { display: block; font-size: 14px; color: #1e3a8a; margin-bottom: 5px; font-weight: 600; }
        .atmosphere-item input { width: 100%; padding: 10px; border: 2px solid #cbd5e1; border-radius: 6px; font-size: 14px; box-sizing: border-box; }
        
        .authorization-section { background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 3px solid #1e3a8a; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .authorization-section h3 { color: #1e3a8a; margin: 0 0 15px 0; font-size: 18px; }
        .auth-options { display: flex; gap: 15px; flex-wrap: wrap; }
        .auth-option { flex: 1; min-width: 200px; padding: 20px; border: 3px solid #cbd5e1; border-radius: 8px; cursor: pointer; text-align: center; transition: all 0.2s; background: white; }
        .auth-option:hover { border-color: #1e3a8a; }
        .auth-option.selected-yes { background: #15803d; color: white; border-color: #15803d; }
        .auth-option.selected-no { background: #dc2626; color: white; border-color: #dc2626; }
        .auth-option .icon { font-size: 28px; margin-bottom: 8px; }
        .auth-option .title { font-weight: 700; font-size: 16px; }
        
        .submit-btn { width: 100%; padding: 18px; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; border: none; border-radius: 8px; font-size: 20px; font-weight: 700; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; margin-top: 20px; text-transform: uppercase; letter-spacing: 1px; border: 3px solid #1e3a8a; }
        .submit-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(185, 28, 28, 0.4); }
        .submit-btn:disabled { background: #9ca3af; cursor: not-allowed; transform: none; box-shadow: none; border-color: #6b7280; }
        
        .footer { text-align: center; margin-top: 30px; padding: 20px; border-top: 3px solid #1e3a8a; color: #1e3a8a; font-size: 14px; font-weight: 600; background: #f1f5f9; }
        
        @media (max-width: 600px) {
          .form-content { padding: 20px; }
          .section-header { margin-left: -20px; margin-right: -20px; }
          .form-row, .form-row-3 { flex-direction: column; gap: 0; }
          .checklist-item { flex-direction: column; align-items: flex-start; }
          .auth-options { flex-direction: column; }
        }
      `}</style>

      <Link href="/" className="back-link">← Back to Safety Portal</Link>
      
      <div className="cp-container">
        <div className="cp-header">
          <img src="/Logo.png" alt="SLP Alaska Logo" />
          <h1>Competent Person Daily Inspection</h1>
          <p className="subtitle">Trench & Excavation Safety Inspection</p>
          <span className="osha-badge">OSHA 1926 Subpart P Compliant</span>
        </div>
        
        <div className="form-content">
          {message.text && <div className={`message ${message.type}`}>{message.text}</div>}
          
          <form onSubmit={handleSubmit}>
            <div className="section-header">📋 Basic Information</div>
            <div className="form-row">
              <div className="form-group">
                <label>Inspection Date *</label>
                <input type="date" name="inspectionDate" value={formData.inspectionDate} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Inspection Time *</label>
                <input type="time" name="inspectionTime" value={formData.inspectionTime} onChange={handleChange} required />
              </div>
            </div>
            <div className="form-group">
              <label>Competent Person Name *</label>
              <input type="text" name="competentPerson" value={formData.competentPerson} onChange={handleChange} required />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Company *</label>
                <select name="company" value={formData.company} onChange={handleChange} required>
                  <option value="">-- Select Company --</option>
                  {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Location *</label>
                <select name="location" value={formData.location} onChange={handleChange} required>
                  <option value="">-- Select Location --</option>
                  {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Specific Location / Description</label>
              <input type="text" name="specificLocation" value={formData.specificLocation} onChange={handleChange} placeholder="e.g., Pad A - East side of tank farm" />
            </div>

            <div className="section-header">🔍 Excavation Details</div>
            <div className="form-group">
              <label>Excavation Type *</label>
              <select name="excavationType" value={formData.excavationType} onChange={handleChange} required>
                <option value="">-- Select Type --</option>
                {EXCAVATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-row-3">
              <div className="form-group">
                <label>Depth (ft) *</label>
                <input type="number" name="depthFt" value={formData.depthFt} onChange={handleChange} step="0.1" required />
              </div>
              <div className="form-group">
                <label>Length (ft)</label>
                <input type="number" name="lengthFt" value={formData.lengthFt} onChange={handleChange} step="0.1" />
              </div>
              <div className="form-group">
                <label>Width (ft)</label>
                <input type="number" name="widthFt" value={formData.widthFt} onChange={handleChange} step="0.1" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Soil Classification *</label>
                <select name="soilClassification" value={formData.soilClassification} onChange={handleChange} required>
                  <option value="">-- Select Classification --</option>
                  {SOIL_CLASSIFICATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Protective System *</label>
                <select name="protectiveSystem" value={formData.protectiveSystem} onChange={handleChange} required>
                  <option value="">-- Select System --</option>
                  {PROTECTIVE_SYSTEMS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            <div className="section-header">🌤️ Environmental Conditions</div>
            <div className="form-group">
              <label>Current Weather Conditions *</label>
              <select name="weatherConditions" value={formData.weatherConditions} onChange={handleChange} required>
                <option value="">-- Select Conditions --</option>
                {WEATHER_CONDITIONS.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
            <CheckItem label="Rain in Last 24 Hours?" field="rainLast24hrs" options={['Yes', 'No']} />
            <CheckItem label="Freeze/Thaw Conditions?" field="freezeThaw" options={['Yes', 'No']} />

            <div className="section-header red">⚠️ Hazard Assessment</div>
            <div className="warning-box">
              <strong>⚠️ Critical Safety Checks</strong><br />
              Answer carefully. Any "Yes" to hazards or "No" to safety measures requires immediate corrective action.
            </div>
            <CheckItem label="Evidence of Cave-In Potential?" field="caveInPotential" options={['Yes', 'No']} />
            <CheckItem label="Soil Stability Acceptable?" field="soilStability" options={['Yes', 'Marginal', 'No']} />
            <CheckItem label="Water Accumulation Present?" field="waterAccumulation" options={['Yes - Action Required', 'Minor', 'No']} />

            <div className="section-header">🛡️ Protective System Inspection</div>
            <CheckItem label="Protective System Condition" field="protectiveSystemCondition" options={['Good', 'Acceptable', 'Deficient']} />
            <CheckItem label="Shoring/Shielding Properly Secured?" field="shoringSecure" />
            <CheckItem label="Slope Angle Properly Maintained?" field="slopeAngle" />
            <CheckItem label="Spoil Pile 2ft+ From Edge?" field="spoilPileSetback" options={['Yes', 'No']} />

            <div className="section-header green">🪜 Access & Egress</div>
            <CheckItem label="Ladder Access Adequate?" field="ladderAccessOk" />
            <CheckItem label="Ladder Within 25ft of Workers?" field="ladderWithin25ft" />
            <CheckItem label="Ramps/Stairs Safe Condition?" field="rampStairsOk" />

            <div className="section-header">🚧 Site Controls</div>
            <CheckItem label="Traffic Controls in Place?" field="trafficControlsOk" />
            <CheckItem label="Barricades Adequate?" field="barricadesOk" options={['Yes', 'No']} />
            <CheckItem label="Warning Signs Posted?" field="warningSignsOk" options={['Yes', 'No']} />
            <CheckItem label="Adjacent Structures Stable?" field="adjacentStructuresOk" />
            <CheckItem label="Underground Utilities Protected?" field="utilitiesProtected" />

            <div className="section-header red">💨 Atmosphere Testing</div>
            <CheckItem label="Atmosphere Testing Required/Performed?" field="atmosphereTested" options={['Yes - Tested', 'Not Required', 'Required - Not Done']} />
            
            {formData.atmosphereTested === 'Yes - Tested' && (
              <>
                <div className="atmosphere-grid">
                  <div className="atmosphere-item">
                    <label>O2 Level (%)</label>
                    <input type="text" name="o2Level" value={formData.o2Level} onChange={handleChange} placeholder="19.5-23.5%" />
                  </div>
                  <div className="atmosphere-item">
                    <label>LEL Level (%)</label>
                    <input type="text" name="lelLevel" value={formData.lelLevel} onChange={handleChange} placeholder="<10%" />
                  </div>
                  <div className="atmosphere-item">
                    <label>H2S Level (ppm)</label>
                    <input type="text" name="h2sLevel" value={formData.h2sLevel} onChange={handleChange} placeholder="<10 ppm" />
                  </div>
                  <div className="atmosphere-item">
                    <label>CO Level (ppm)</label>
                    <input type="text" name="coLevel" value={formData.coLevel} onChange={handleChange} placeholder="<25 ppm" />
                  </div>
                </div>
                <CheckItem label="Ventilation Adequate?" field="ventilationAdequate" />
              </>
            )}

            <div className="section-header green">✅ General Safety</div>
            <CheckItem label="Surface Encumbrances Removed/Supported?" field="surfaceEncumbrances" />
            <CheckItem label="Equipment Set Back From Edge?" field="equipmentSetback" />
            <CheckItem label="Required PPE in Use?" field="ppeInUse" options={['Yes', 'No']} />
            <CheckItem label="Emergency/Rescue Equipment Available?" field="emergencyEquipment" options={['Yes', 'No']} />

            <div className="section-header green">📝 Authorization</div>
            <div className="authorization-section">
              <h3>Work Authorization Decision</h3>
              <div className="auth-options">
                <div className={`auth-option ${formData.workAuthorized === 'Yes' ? 'selected-yes' : ''}`} onClick={() => setField('workAuthorized', 'Yes')}>
                  <div className="icon">✅</div>
                  <div className="title">Yes - Work Authorized</div>
                </div>
                <div className={`auth-option ${formData.workAuthorized === 'No' ? 'selected-no' : ''}`} onClick={() => setField('workAuthorized', 'No')}>
                  <div className="icon">🛑</div>
                  <div className="title">No - Work Stopped</div>
                </div>
              </div>
            </div>
            <div className="form-group">
              <label>Corrective Actions Required (if any)</label>
              <textarea name="correctiveActions" value={formData.correctiveActions} onChange={handleChange} placeholder="Describe any corrective actions needed..." />
            </div>
            <div className="form-group">
              <label>Inspector Signature (Type Full Name) *</label>
              <input type="text" name="inspectorSignature" value={formData.inspectorSignature} onChange={handleChange} placeholder="Type your full name as signature" required />
            </div>

            <button type="submit" className="submit-btn" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Daily Inspection'}
            </button>
          </form>
          
          <div className="footer">
            <span>AnthroSafe™ Powered by Field Driven Data™</span> | <span>© 2025 SLP Alaska</span>
          </div>
        </div>
      </div>
    </div>
  )
}

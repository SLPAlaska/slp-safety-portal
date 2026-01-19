'use client'

import { useState, useEffect } from 'react'
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

const CRITICAL_CRITERIA = [
  'Over 75% of crane capacity',
  'Two crane lift',
  'Personnel being lifted',
  'Lift over live equipment',
  'Load cannot be re-lifted if dropped',
  'Blind lift',
  'Near power lines',
  'Unusual load characteristics'
]

const CRANE_TYPES = ['Hydraulic Truck Crane', 'Lattice Boom Crawler', 'Rough Terrain Crane', 'All Terrain Crane', 'Tower Crane', 'Overhead/Gantry Crane']
const WEIGHT_SOURCES = ['Certified Scale', 'Manufacturer Specs', 'Shipping Documents', 'Calculated', 'Estimated (Add 10%)']
const SLING_TYPES = ['Wire Rope', 'Synthetic Web', 'Synthetic Round', 'Chain', 'Metal Mesh']
const GROUND_CONDITIONS = ['Firm/Stable', 'Gravel Pad', 'Concrete', 'Asphalt', 'Soft/Unstable - Matting Required', 'Frozen Ground']
const WEATHER_CONDITIONS = ['Clear', 'Overcast', 'Light Precipitation', 'Heavy Precipitation', 'Snow', 'Fog/Low Visibility']
const POWER_LINE_OPTIONS = ['None in area', 'Present - Safe distance maintained', 'Present - De-energized', 'Present - Requires dedicated spotter']
const COMM_METHODS = ['Hand Signals', 'Radio', 'Voice (Direct)', 'Hardwired Headset']
const BACKUP_COMM = ['Hand Signals', 'Radio', 'Voice (Direct)', 'Air Horn (Emergency Stop)']

export default function CriticalLiftPlanForm() {
  const [formData, setFormData] = useState({
    liftPlanNumber: '', date: new Date().toISOString().split('T')[0],
    preparedBy: '', company: '', location: '', liftDescription: '',
    criticalCriteria: [],
    loadDescription: '', loadWeight: '', riggingWeight: '', weightSource: '',
    loadLength: '', loadWidth: '', loadHeight: '', centerOfGravity: '',
    craneNumber: '', craneType: '', craneMake: '', craneModel: '',
    craneCapacity: '', boomLength: '', operatingRadius: '', capacityAtRadius: '', counterweight: '',
    windSpeed: 'Under 20 mph', temperature: 'Above 0°F', otherDerating: '0',
    slingType: '', slingSize: '', numberOfLegs: '1', slingAngle: '90', slingWLL: '',
    shackleSize: '', shackleWLL: '',
    groundConditions: '', weatherConditions: '',
    overheadHazards: '', undergroundHazards: '', powerLines: 'None in area', exclusionZone: '',
    craneOperator: '', signalPerson: '', riggers: '', liftDirector: '', spotters: '',
    communicationMethod: '', backupCommunication: '', radioChannel: '',
    emergencyProcedures: '', comments: ''
  })

  const [calculations, setCalculations] = useState({
    totalLoad: 0, totalLoadTons: '0.00', capacityAtRadius: 0,
    windDerating: 0, coldDerating: 0, totalDerating: 0,
    netCapacity: '0.00', percentCapacity: '0.0', capacityStatus: 'Enter values to calculate',
    slingCapacityAtAngle: 0, riggingAdequate: '--'
  })

  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const toggleCriteria = (criteria) => {
    setFormData(prev => ({
      ...prev,
      criticalCriteria: prev.criticalCriteria.includes(criteria)
        ? prev.criticalCriteria.filter(c => c !== criteria)
        : [...prev.criticalCriteria, criteria]
    }))
  }

  // Auto-calculate whenever relevant fields change
  useEffect(() => {
    calculateAll()
  }, [formData.loadWeight, formData.riggingWeight, formData.capacityAtRadius, 
      formData.windSpeed, formData.temperature, formData.otherDerating,
      formData.slingWLL, formData.numberOfLegs, formData.slingAngle])

  const calculateAll = () => {
    const loadWeight = parseFloat(formData.loadWeight) || 0
    const riggingWeight = parseFloat(formData.riggingWeight) || 0
    const totalLoad = loadWeight + riggingWeight
    const totalLoadTons = (totalLoad / 2000).toFixed(2)
    const capacityAtRadius = parseFloat(formData.capacityAtRadius) || 0

    let windDerating = 0
    if (formData.windSpeed === '20-30 mph') windDerating = 10
    else if (formData.windSpeed === '30-40 mph') windDerating = 25
    else if (formData.windSpeed === 'Over 40 mph') windDerating = 100

    let coldDerating = 0
    if (formData.temperature === '-20°F to 0°F') coldDerating = 5
    else if (formData.temperature === '-40°F to -20°F') coldDerating = 10
    else if (formData.temperature === 'Below -40°F') coldDerating = 15

    const otherDerating = parseFloat(formData.otherDerating) || 0
    const totalDerating = windDerating + coldDerating + otherDerating
    const netCapacity = (capacityAtRadius * (1 - totalDerating / 100)).toFixed(2)
    const percentCapacity = parseFloat(netCapacity) > 0 ? ((parseFloat(totalLoadTons) / parseFloat(netCapacity)) * 100).toFixed(1) : '0.0'

    let capacityStatus = 'Enter values to calculate'
    if (formData.windSpeed === 'Over 40 mph') {
      capacityStatus = '🛑 NO LIFT - Wind Speed Too High'
    } else if (parseFloat(percentCapacity) > 100) {
      capacityStatus = '🛑 OVERLOADED - DO NOT LIFT'
    } else if (parseFloat(percentCapacity) > 90) {
      capacityStatus = '⚠️ EXTREME CAUTION - Near Capacity'
    } else if (parseFloat(percentCapacity) > 85) {
      capacityStatus = '⚠️ CRITICAL - Requires Additional Approval'
    } else if (parseFloat(percentCapacity) > 75) {
      capacityStatus = '⚠️ CAUTION - Monitor Conditions'
    } else if (parseFloat(percentCapacity) > 0) {
      capacityStatus = '✅ ACCEPTABLE - Within Safe Limits'
    }

    // Rigging calculations
    const slingWLL = parseFloat(formData.slingWLL) || 0
    const numberOfLegs = parseInt(formData.numberOfLegs) || 1
    const slingAngle = parseInt(formData.slingAngle) || 90

    let angleFactor = 1.0
    if (slingAngle >= 90) angleFactor = 1.0
    else if (slingAngle >= 60) angleFactor = 0.866
    else if (slingAngle >= 45) angleFactor = 0.707
    else angleFactor = 0.5

    const slingCapacityAtAngle = Math.round(slingWLL * numberOfLegs * angleFactor)
    const riggingAdequate = totalLoad > 0 ? (slingCapacityAtAngle >= totalLoad ? 'YES ✅' : 'NO ❌') : '--'

    setCalculations({
      totalLoad, totalLoadTons, capacityAtRadius,
      windDerating, coldDerating, totalDerating,
      netCapacity, percentCapacity, capacityStatus,
      slingCapacityAtAngle, riggingAdequate
    })
  }

  const getStatusColor = () => {
    const pct = parseFloat(calculations.percentCapacity)
    if (formData.windSpeed === 'Over 40 mph' || pct > 100) return 'status-red'
    if (pct > 90) return 'status-red'
    if (pct > 85) return 'status-orange'
    if (pct > 75) return 'status-yellow'
    if (pct > 0) return 'status-green'
    return 'status-blue'
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage({ type: '', text: '' })

    try {
      if (formData.criticalCriteria.length === 0) {
        setMessage({ type: 'error', text: 'Please select at least one critical lift criterion.' })
        setSubmitting(false)
        return
      }

      const { data, error } = await supabase.from('critical_lift_plans').insert([{
        lift_plan_number: formData.liftPlanNumber,
        date: formData.date,
        prepared_by: formData.preparedBy,
        company: formData.company,
        location: formData.location,
        lift_description: formData.liftDescription,
        critical_criteria: formData.criticalCriteria,
        load_description: formData.loadDescription,
        load_weight: parseFloat(formData.loadWeight) || 0,
        rigging_weight: parseFloat(formData.riggingWeight) || 0,
        weight_source: formData.weightSource,
        load_length: formData.loadLength,
        load_width: formData.loadWidth,
        load_height: formData.loadHeight,
        center_of_gravity: formData.centerOfGravity,
        crane_number: formData.craneNumber,
        crane_type: formData.craneType,
        crane_make: formData.craneMake,
        crane_model: formData.craneModel,
        crane_capacity: formData.craneCapacity,
        boom_length: formData.boomLength,
        operating_radius: formData.operatingRadius,
        capacity_at_radius: parseFloat(formData.capacityAtRadius) || 0,
        counterweight: formData.counterweight,
        wind_speed: formData.windSpeed,
        temperature: formData.temperature,
        other_derating: parseFloat(formData.otherDerating) || 0,
        total_load: calculations.totalLoad,
        total_load_tons: parseFloat(calculations.totalLoadTons),
        net_capacity: parseFloat(calculations.netCapacity),
        percent_capacity: parseFloat(calculations.percentCapacity),
        capacity_status: calculations.capacityStatus,
        sling_type: formData.slingType,
        sling_size: formData.slingSize,
        number_of_legs: parseInt(formData.numberOfLegs),
        sling_angle: parseInt(formData.slingAngle),
        sling_wll: parseFloat(formData.slingWLL) || 0,
        sling_capacity_at_angle: calculations.slingCapacityAtAngle,
        rigging_adequate: calculations.riggingAdequate,
        shackle_size: formData.shackleSize,
        shackle_wll: parseFloat(formData.shackleWLL) || 0,
        ground_conditions: formData.groundConditions,
        weather_conditions: formData.weatherConditions,
        overhead_hazards: formData.overheadHazards,
        underground_hazards: formData.undergroundHazards,
        power_lines: formData.powerLines,
        exclusion_zone: parseFloat(formData.exclusionZone) || 0,
        crane_operator: formData.craneOperator,
        signal_person: formData.signalPerson,
        riggers: formData.riggers,
        lift_director: formData.liftDirector,
        spotters: formData.spotters,
        communication_method: formData.communicationMethod,
        backup_communication: formData.backupCommunication,
        radio_channel: formData.radioChannel,
        emergency_procedures: formData.emergencyProcedures,
        comments: formData.comments
      }])

      if (error) throw error
      setMessage({ type: 'success', text: `Critical Lift Plan ${formData.liftPlanNumber} successfully saved!` })
    } catch (error) {
      console.error('Error:', error)
      setMessage({ type: 'error', text: `Error: ${error.message}` })
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      liftPlanNumber: '', date: new Date().toISOString().split('T')[0],
      preparedBy: '', company: '', location: '', liftDescription: '',
      criticalCriteria: [],
      loadDescription: '', loadWeight: '', riggingWeight: '', weightSource: '',
      loadLength: '', loadWidth: '', loadHeight: '', centerOfGravity: '',
      craneNumber: '', craneType: '', craneMake: '', craneModel: '',
      craneCapacity: '', boomLength: '', operatingRadius: '', capacityAtRadius: '', counterweight: '',
      windSpeed: 'Under 20 mph', temperature: 'Above 0°F', otherDerating: '0',
      slingType: '', slingSize: '', numberOfLegs: '1', slingAngle: '90', slingWLL: '',
      shackleSize: '', shackleWLL: '',
      groundConditions: '', weatherConditions: '',
      overheadHazards: '', undergroundHazards: '', powerLines: 'None in area', exclusionZone: '',
      craneOperator: '', signalPerson: '', riggers: '', liftDirector: '', spotters: '',
      communicationMethod: '', backupCommunication: '', radioChannel: '',
      emergencyProcedures: '', comments: ''
    })
    setMessage({ type: '', text: '' })
  }

  return (
    <div>
      <style jsx>{`
       * { margin: 0; padding: 0; box-sizing: border-box; }
       body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f1f5f9; }
       .lift-container { max-width: 1200px; margin: 0 auto; padding: 20px; }
       .back-link { display: inline-block; margin-bottom: 20px; padding: 10px 20px; background: #1e3a8a; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; }
       .back-link:hover { background: #1e40af; }
       .lift-header { background: linear-gradient(135deg, #991b1b 0%, #c41e3a 100%); color: white; padding: 40px; text-align: center; border-radius: 12px 12px 0 0; border: 4px solid #1e3a8a; }
       .lift-header img { height: 80px; margin-bottom: 15px; }
       .lift-header h1 { font-size: 42px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 2px; }
       .subtitle { font-size: 18px; font-weight: 300; margin-top: 8px; }
       .critical-badge { display: inline-block; margin-top: 15px; padding: 12px 24px; background: #fbbf24; color: #78350f; font-weight: 700; font-size: 16px; border-radius: 30px; border: 3px solid #78350f; }
       .form-content { background: white; padding: 40px; border: 4px solid #1e3a8a; border-top: none; border-radius: 0 0 12px 12px; }
       .message { padding: 15px; margin-bottom: 20px; border-radius: 8px; font-weight: 600; }
       .message.success { background: #d1fae5; color: #065f46; border: 2px solid #10b981; }
       .message.error { background: #fee2e2; color: #991b1b; border: 2px solid #ef4444; }
       .section-header { background: #1e3a8a; color: white; padding: 15px 20px; margin: 30px -40px 20px -40px; font-size: 20px; font-weight: 700; border-left: 6px solid #dc2626; }
       .section-header.red { background: linear-gradient(135deg, #991b1b 0%, #dc2626 100%); }
       .section-header.orange { background: linear-gradient(135deg, #c2410c 0%, #ea580c 100%); }
       .section-header.green { background: linear-gradient(135deg, #065f46 0%, #059669 100%); }
       .info-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 20px; color: #78350f; font-weight: 600; border-radius: 4px; }
       .form-row { display: flex; gap: 20px; margin-bottom: 20px; }
       .form-row-3 { display: flex; gap: 20px; margin-bottom: 20px; }
       .form-row-3 .form-group { flex: 1; }
       .form-row-4 { display: flex; gap: 15px; margin-bottom: 20px; }
       .form-row-4 .form-group { flex: 1; }
       .form-group { flex: 1; margin-bottom: 20px; }
       .form-group label { display: block; margin-bottom: 8px; font-weight: 600; color: #1e3a8a; font-size: 15px; }
       .form-group input, .form-group select, .form-group textarea { width: 100%; padding: 12px; border: 2px solid #cbd5e1; border-radius: 6px; font-size: 15px; }
       .form-group input:focus, .form-group select:focus, .form-group textarea:focus { outline: none; border-color: #dc2626; }
       .form-group textarea { min-height: 100px; resize: vertical; font-family: inherit; }
       .checkbox-group { display: flex; flex-wrap: wrap; gap: 12px; }
       .checkbox-option { display: flex; align-items: center; gap: 8px; padding: 12px 16px; border: 2px solid #cbd5e1; border-radius: 8px; cursor: pointer; background: white; transition: all 0.2s; }
       .checkbox-option:hover { border-color: #dc2626; background: #fef2f2; }
       .checkbox-option.checked { background: #fee2e2; border-color: #dc2626; font-weight: 600; }
       .checkbox-option input[type="checkbox"] { width: 18px; height: 18px; cursor: pointer; }
       .calc-display { background: #f1f5f9; padding: 15px; border-radius: 8px; border: 2px solid #cbd5e1; font-size: 16px; font-weight: 600; color: #1e3a8a; text-align: center; }
       .capacity-status { padding: 20px; border-radius: 10px; text-align: center; font-size: 20px; font-weight: 700; margin: 20px 0; border: 3px solid; }
       .status-red { background: #fee2e2; color: #991b1b; border-color: #dc2626; }
       .status-orange { background: #fed7aa; color: #9a3412; border-color: #ea580c; }
       .status-yellow { background: #fef3c7; color: #78350f; border-color: #f59e0b; }
       .status-green { background: #d1fae5; color: #065f46; border-color: #10b981; }
       .status-blue { background: #dbeafe; color: #1e3a8a; border-color: #3b82f6; }
       .rigging-display { padding: 15px; border-radius: 8px; font-size: 18px; font-weight: 700; text-align: center; }
       .rigging-ok { background: #d1fae5; color: #065f46; border: 2px solid #10b981; }
       .rigging-bad { background: #fee2e2; color: #991b1b; border: 2px solid #ef4444; }
       .rigging-neutral { background: #f1f5f9; color: #475569; border: 2px solid #cbd5e1; }
       .submit-btn { width: 100%; padding: 18px; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; border: none; border-radius: 8px; font-size: 20px; font-weight: 700; cursor: pointer; margin-top: 20px; text-transform: uppercase; letter-spacing: 1px; border: 3px solid #1e3a8a; }
       .submit-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(220,38,38,0.4); }
       .submit-btn:disabled { background: #9ca3af; cursor: not-allowed; transform: none; box-shadow: none; border-color: #6b7280; }
       .reset-btn { width: 100%; padding: 14px; background: #1e3a8a; color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; margin-top: 10px; }
       .footer { text-align: center; margin-top: 30px; padding: 20px; border-top: 3px solid #1e3a8a; color: #1e3a8a; font-size: 14px; font-weight: 600; background: #f1f5f9; }
       @media (max-width: 768px) {
         .form-content { padding: 20px; }
         .section-header { margin-left: -20px; margin-right: -20px; }
         .form-row, .form-row-3, .form-row-4 { flex-direction: column; gap: 0; }
         .checkbox-group { flex-direction: column; }
       }
     `}</style>

      <Link href="/" className="back-link">← Back to Safety Portal</Link>

      <div className="lift-container">
        <div className="lift-header">
          <img src="/Logo.png" alt="SLP Alaska Logo" />
          <h1>Critical Lift Plan</h1>
          <p className="subtitle">Comprehensive Lift Planning with Auto-Calculations</p>
          <span className="critical-badge">⚠️ Critical Lift Documentation Required</span>
        </div>

        <div className="form-content">
          {message.text && <div className={`message ${message.type}`}>{message.text}</div>}

          <form onSubmit={handleSubmit}>
            <div className="section-header">📋 Lift Plan Information</div>
            <div className="form-row">
              <div className="form-group">
                <label>Lift Plan Number *</label>
                <input type="text" name="liftPlanNumber" value={formData.liftPlanNumber} onChange={handleChange} placeholder="e.g., CLP-2024-001" required />
              </div>
              <div className="form-group">
                <label>Date *</label>
                <input type="date" name="date" value={formData.date} onChange={handleChange} required />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Prepared By *</label>
                <input type="text" name="preparedBy" value={formData.preparedBy} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Company *</label>
                <select name="company" value={formData.company} onChange={handleChange} required>
                  <option value="">-- Select Company --</option>
                  {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Location *</label>
                <select name="location" value={formData.location} onChange={handleChange} required>
                  <option value="">-- Select Location --</option>
                  {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Lift Description *</label>
                <input type="text" name="liftDescription" value={formData.liftDescription} onChange={handleChange} placeholder="Brief description of lift" required />
              </div>
            </div>

            <div className="section-header red">⚠️ Critical Lift Criteria</div>
            <div className="info-box">Select all criteria that make this lift CRITICAL. A lift is critical if ANY of these apply.</div>
            <div className="form-group">
              <label>Why is this lift classified as CRITICAL? *</label>
              <div className="checkbox-group">
                {CRITICAL_CRITERIA.map(criteria => (
                  <label key={criteria} className={`checkbox-option ${formData.criticalCriteria.includes(criteria) ? 'checked' : ''}`} onClick={() => toggleCriteria(criteria)}>
                    <input type="checkbox" checked={formData.criticalCriteria.includes(criteria)} readOnly />
                    <span>{criteria}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="section-header orange">📦 Load Information</div>
            <div className="form-row">
              <div className="form-group">
                <label>Load Description *</label>
                <input type="text" name="loadDescription" value={formData.loadDescription} onChange={handleChange} placeholder="What is being lifted?" required />
              </div>
              <div className="form-group">
                <label>Weight Source *</label>
                <select name="weightSource" value={formData.weightSource} onChange={handleChange} required>
                  <option value="">-- Select --</option>
                  {WEIGHT_SOURCES.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row-3">
              <div className="form-group">
                <label>Load Weight (lbs) *</label>
                <input type="number" name="loadWeight" value={formData.loadWeight} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Rigging Weight (lbs) *</label>
                <input type="number" name="riggingWeight" value={formData.riggingWeight} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Total Load</label>
                <div className="calc-display">{calculations.totalLoad.toLocaleString()} lbs ({calculations.totalLoadTons} tons)</div>
              </div>
            </div>
            <div className="form-row-4">
              <div className="form-group">
                <label>Length (ft)</label>
                <input type="text" name="loadLength" value={formData.loadLength} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Width (ft)</label>
                <input type="text" name="loadWidth" value={formData.loadWidth} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Height (ft)</label>
                <input type="text" name="loadHeight" value={formData.loadHeight} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Center of Gravity</label>
                <input type="text" name="centerOfGravity" value={formData.centerOfGravity} onChange={handleChange} placeholder="e.g., Center, Offset 2ft left" />
              </div>
            </div>

            <div className="section-header">🏗️ Crane Information</div>
            <div className="form-row">
              <div className="form-group">
                <label>Crane Number *</label>
                <input type="text" name="craneNumber" value={formData.craneNumber} onChange={handleChange} placeholder="e.g., C-101" required />
              </div>
              <div className="form-group">
                <label>Crane Type *</label>
                <select name="craneType" value={formData.craneType} onChange={handleChange} required>
                  <option value="">-- Select --</option>
                  {CRANE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Make *</label>
                <input type="text" name="craneMake" value={formData.craneMake} onChange={handleChange} placeholder="e.g., Grove" required />
              </div>
              <div className="form-group">
                <label>Model *</label>
                <input type="text" name="craneModel" value={formData.craneModel} onChange={handleChange} placeholder="e.g., GMK5250L" required />
              </div>
            </div>
            <div className="form-row-3">
              <div className="form-group">
                <label>Crane Capacity (tons) *</label>
                <input type="text" name="craneCapacity" value={formData.craneCapacity} onChange={handleChange} placeholder="e.g., 300 tons" required />
              </div>
              <div className="form-group">
                <label>Boom Length (ft) *</label>
                <input type="text" name="boomLength" value={formData.boomLength} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Operating Radius (ft) *</label>
                <input type="text" name="operatingRadius" value={formData.operatingRadius} onChange={handleChange} required />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Capacity at Radius (tons) *</label>
                <input type="number" step="0.1" name="capacityAtRadius" value={formData.capacityAtRadius} onChange={handleChange} placeholder="From load chart" required />
              </div>
              <div className="form-group">
                <label>Counterweight Configuration</label>
                <input type="text" name="counterweight" value={formData.counterweight} onChange={handleChange} placeholder="e.g., Full - 120,000 lbs" />
              </div>
            </div>

            <div className="section-header orange">⚡ Capacity Calculations & Derating</div>
            <div className="form-row-3">
              <div className="form-group">
                <label>Wind Speed</label>
                <select name="windSpeed" value={formData.windSpeed} onChange={handleChange}>
                  <option value="Under 20 mph">Under 20 mph (0% derate)</option>
                  <option value="20-30 mph">20-30 mph (10% derate)</option>
                  <option value="30-40 mph">30-40 mph (25% derate)</option>
                  <option value="Over 40 mph">Over 40 mph (NO LIFT)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Temperature</label>
                <select name="temperature" value={formData.temperature} onChange={handleChange}>
                  <option value="Above 0°F">Above 0°F (0% derate)</option>
                  <option value="-20°F to 0°F">-20°F to 0°F (5% derate)</option>
                  <option value="-40°F to -20°F">-40°F to -20°F (10% derate)</option>
                  <option value="Below -40°F">Below -40°F (15% derate)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Other Derating (%)</label>
                <input type="number" step="0.1" name="otherDerating" value={formData.otherDerating} onChange={handleChange} />
              </div>
            </div>
            <div className={`capacity-status ${getStatusColor()}`}>
              <div style={{fontSize: '24px', marginBottom: '10px'}}>{calculations.capacityStatus}</div>
              <div style={{fontSize: '18px'}}>Net Capacity: {calculations.netCapacity} tons | Load: {calculations.totalLoadTons} tons | {calculations.percentCapacity}% of capacity</div>
              <div style={{fontSize: '14px', marginTop: '8px'}}>Total Derating: {calculations.totalDerating}% (Wind: {calculations.windDerating}%, Cold: {calculations.coldDerating}%, Other: {formData.otherDerating}%)</div>
            </div>

            <div className="section-header">🔗 Rigging Equipment</div>
            <div className="form-row-3">
              <div className="form-group">
                <label>Sling Type *</label>
                <select name="slingType" value={formData.slingType} onChange={handleChange} required>
                  <option value="">-- Select --</option>
                  {SLING_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Sling Size *</label>
                <input type="text" name="slingSize" value={formData.slingSize} onChange={handleChange} placeholder="e.g., 1 inch" required />
              </div>
              <div className="form-group">
                <label>Number of Legs *</label>
                <select name="numberOfLegs" value={formData.numberOfLegs} onChange={handleChange} required>
                  <option value="1">1 Leg</option>
                  <option value="2">2 Legs</option>
                  <option value="3">3 Legs</option>
                  <option value="4">4 Legs</option>
                </select>
              </div>
            </div>
            <div className="form-row-3">
              <div className="form-group">
                <label>Sling Angle (degrees) *</label>
                <select name="slingAngle" value={formData.slingAngle} onChange={handleChange} required>
                  <option value="90">90° (Vertical) - 100%</option>
                  <option value="60">60° - 86.6%</option>
                  <option value="45">45° - 70.7%</option>
                  <option value="30">30° - 50%</option>
                </select>
              </div>
              <div className="form-group">
                <label>Sling WLL (lbs each) *</label>
                <input type="number" name="slingWLL" value={formData.slingWLL} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Rigging Capacity</label>
                <div className={`rigging-display ${calculations.riggingAdequate === 'YES ✅' ? 'rigging-ok' : calculations.riggingAdequate === 'NO ❌' ? 'rigging-bad' : 'rigging-neutral'}`}>
                  {calculations.slingCapacityAtAngle.toLocaleString()} lbs - {calculations.riggingAdequate}
                </div>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Shackle Size</label>
                <input type="text" name="shackleSize" value={formData.shackleSize} onChange={handleChange} placeholder="e.g., 1-1/2 inch" />
              </div>
              <div className="form-group">
                <label>Shackle WLL (lbs)</label>
                <input type="number" name="shackleWLL" value={formData.shackleWLL} onChange={handleChange} />
              </div>
            </div>

            <div className="section-header">🌍 Site Conditions & Hazards</div>
            <div className="form-row">
              <div className="form-group">
                <label>Ground Conditions *</label>
                <select name="groundConditions" value={formData.groundConditions} onChange={handleChange} required>
                  <option value="">-- Select --</option>
                  {GROUND_CONDITIONS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Weather Conditions *</label>
                <select name="weatherConditions" value={formData.weatherConditions} onChange={handleChange} required>
                  <option value="">-- Select --</option>
                  {WEATHER_CONDITIONS.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Overhead Hazards</label>
                <input type="text" name="overheadHazards" value={formData.overheadHazards} onChange={handleChange} placeholder="Describe overhead hazards" />
              </div>
              <div className="form-group">
                <label>Underground Hazards</label>
                <input type="text" name="undergroundHazards" value={formData.undergroundHazards} onChange={handleChange} placeholder="Describe underground hazards" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Power Lines</label>
                <select name="powerLines" value={formData.powerLines} onChange={handleChange}>
                  {POWER_LINE_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Exclusion Zone Radius (ft) *</label>
                <input type="number" name="exclusionZone" value={formData.exclusionZone} onChange={handleChange} required />
              </div>
            </div>

            <div className="section-header green">👷 Personnel</div>
            <div className="form-row">
              <div className="form-group">
                <label>Crane Operator *</label>
                <input type="text" name="craneOperator" value={formData.craneOperator} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Signal Person *</label>
                <input type="text" name="signalPerson" value={formData.signalPerson} onChange={handleChange} required />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Rigger(s) *</label>
                <input type="text" name="riggers" value={formData.riggers} onChange={handleChange} placeholder="Names of riggers" required />
              </div>
              <div className="form-group">
                <label>Lift Director *</label>
                <input type="text" name="liftDirector" value={formData.liftDirector} onChange={handleChange} required />
              </div>
            </div>
            <div className="form-group">
              <label>Spotter(s)</label>
              <input type="text" name="spotters" value={formData.spotters} onChange={handleChange} placeholder="Names of spotters if required" />
            </div>

            <div className="section-header">📻 Communication</div>
            <div className="form-row-3">
              <div className="form-group">
                <label>Primary Communication *</label>
                <select name="communicationMethod" value={formData.communicationMethod} onChange={handleChange} required>
                  <option value="">-- Select --</option>
                  {COMM_METHODS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Backup Communication</label>
                <select name="backupCommunication" value={formData.backupCommunication} onChange={handleChange}>
                  <option value="">-- Select --</option>
                  {BACKUP_COMM.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Radio Channel</label>
                <input type="text" name="radioChannel" value={formData.radioChannel} onChange={handleChange} placeholder="Channel number" />
              </div>
            </div>

            <div className="section-header red">🚨 Emergency Procedures</div>
            <div className="form-group">
              <label>Emergency Procedures</label>
              <textarea name="emergencyProcedures" value={formData.emergencyProcedures} onChange={handleChange} placeholder="Describe emergency procedures for this lift..." />
            </div>
            <div className="form-group">
              <label>Additional Comments</label>
              <textarea name="comments" value={formData.comments} onChange={handleChange} placeholder="Any additional notes or special considerations..." />
            </div>

            <button type="submit" className="submit-btn" disabled={submitting}>
              {submitting ? 'Generating Lift Plan...' : 'Generate Critical Lift Plan'}
            </button>
            {message.type === 'success' && (
              <button type="button" className="reset-btn" onClick={resetForm}>Create Another Lift Plan</button>
            )}
          </form>
          
          <div className="footer">
            <span>Powered by Predictive Safety Analytics™</span> | <span>© 2025 SLP Alaska</span>
          </div>
        </div>
      </div>
    </div>
  )
}

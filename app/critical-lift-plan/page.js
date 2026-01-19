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
      const { error } = await supabase.from('critical_lift_plans').insert([{
        lift_plan_number: formData.liftPlanNumber,
        plan_date: formData.date,
        prepared_by: formData.preparedBy,
        company: formData.company,
        location: formData.location,
        lift_description: formData.liftDescription,
        critical_criteria: formData.criticalCriteria.join(', '),
        load_description: formData.loadDescription,
        load_weight: parseFloat(formData.loadWeight) || null,
        rigging_weight: parseFloat(formData.riggingWeight) || null,
        total_load: calculations.totalLoad,
        total_load_tons: parseFloat(calculations.totalLoadTons),
        weight_source: formData.weightSource,
        load_length: formData.loadLength || null,
        load_width: formData.loadWidth || null,
        load_height: formData.loadHeight || null,
        center_of_gravity: formData.centerOfGravity || null,
        crane_number: formData.craneNumber,
        crane_type: formData.craneType,
        crane_make: formData.craneMake || null,
        crane_model: formData.craneModel || null,
        crane_capacity: parseFloat(formData.craneCapacity) || null,
        boom_length: parseFloat(formData.boomLength) || null,
        operating_radius: parseFloat(formData.operatingRadius) || null,
        capacity_at_radius: parseFloat(formData.capacityAtRadius) || null,
        counterweight: formData.counterweight || null,
        wind_speed: formData.windSpeed,
        wind_derating: calculations.windDerating,
        temperature: formData.temperature,
        cold_derating: calculations.coldDerating,
        other_derating: parseFloat(formData.otherDerating) || 0,
        net_capacity: parseFloat(calculations.netCapacity),
        percent_capacity: parseFloat(calculations.percentCapacity),
        capacity_status: calculations.capacityStatus,
        sling_type: formData.slingType,
        sling_size: formData.slingSize,
        number_of_legs: parseInt(formData.numberOfLegs),
        sling_angle: parseInt(formData.slingAngle),
        sling_wll: parseFloat(formData.slingWLL) || null,
        sling_capacity_at_angle: calculations.slingCapacityAtAngle,
        shackle_size: formData.shackleSize || null,
        shackle_wll: parseFloat(formData.shackleWLL) || null,
        rigging_adequate: calculations.riggingAdequate,
        ground_conditions: formData.groundConditions,
        weather_conditions: formData.weatherConditions,
        overhead_hazards: formData.overheadHazards || null,
        underground_hazards: formData.undergroundHazards || null,
        power_lines: formData.powerLines,
        exclusion_zone: parseFloat(formData.exclusionZone) || null,
        crane_operator: formData.craneOperator,
        signal_person: formData.signalPerson,
        riggers: formData.riggers,
        lift_director: formData.liftDirector,
        spotters: formData.spotters || null,
        communication_method: formData.communicationMethod,
        backup_communication: formData.backupCommunication || null,
        radio_channel: formData.radioChannel || null,
        emergency_procedures: formData.emergencyProcedures || null,
        comments: formData.comments || null
      }])

      if (error) throw error
      setMessage({ type: 'success', text: `Critical Lift Plan submitted! Capacity: ${calculations.percentCapacity}% - ${calculations.capacityStatus}` })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      console.error('Error:', error)
      setMessage({ type: 'error', text: 'Error: ' + error.message })
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
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="lift-form-page">
      <style jsx global>{`
        .lift-form-page { min-height: 100vh; background: #1e3a8a; padding: 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        .back-link { display: inline-block; margin-bottom: 20px; color: white; text-decoration: none; font-weight: 600; padding: 10px 20px; background: #dc2626; border-radius: 6px; }
        .back-link:hover { background: #b91c1c; }
        .lift-container { max-width: 900px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); overflow: hidden; border: 4px solid #dc2626; }
        .lift-header { background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 30px; text-align: center; border-bottom: 6px solid #1e3a8a; }
        .lift-header img { max-height: 80px; margin-bottom: 15px; }
        .lift-header h1 { color: white; margin: 0 0 10px 0; font-size: 32px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); }
        .lift-header .subtitle { color: #fecaca; font-size: 16px; }
        .critical-badge { display: inline-block; background: #1e3a8a; color: white; padding: 8px 25px; border-radius: 25px; font-size: 14px; margin-top: 15px; font-weight: 700; border: 3px solid white; text-transform: uppercase; letter-spacing: 1px; }
        .form-content { padding: 30px 40px 40px 40px; }
        .message { padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: center; font-weight: 600; }
        .message.success { background: #d4edda; color: #155724; border: 2px solid #c3e6cb; }
        .message.error { background: #f8d7da; color: #721c24; border: 2px solid #f5c6cb; }
        .section-header { background: #1e3a8a; color: white; padding: 12px 20px; margin: 30px -40px 20px -40px; font-weight: 700; font-size: 16px; display: flex; align-items: center; gap: 10px; }
        .section-header.red { background: #dc2626; }
        .section-header.green { background: #15803d; }
        .section-header.orange { background: #ea580c; }
        .section-header:first-of-type { margin-top: 0; }
        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; margin-bottom: 8px; color: #1e3a8a; font-weight: 600; }
        .form-group input, .form-group select, .form-group textarea { width: 100%; padding: 12px; border: 2px solid #cbd5e1; border-radius: 8px; font-size: 16px; box-sizing: border-box; }
        .form-group input:focus, .form-group select:focus, .form-group textarea:focus { outline: none; border-color: #1e3a8a; box-shadow: 0 0 0 3px rgba(30,58,138,0.1); }
        .form-group textarea { min-height: 80px; resize: vertical; }
        .form-row { display: flex; gap: 20px; }
        .form-row .form-group { flex: 1; }
        .form-row-3 { display: flex; gap: 20px; }
        .form-row-3 .form-group { flex: 1; }
        .form-row-4 { display: flex; gap: 15px; }
        .form-row-4 .form-group { flex: 1; }
        .info-box { background: #eff6ff; border-left: 4px solid #1e3a8a; padding: 12px 15px; margin-bottom: 20px; font-size: 14px; color: #1e3a8a; }
        .checkbox-group { display: flex; flex-wrap: wrap; gap: 10px; }
        .checkbox-option { display: flex; align-items: center; gap: 8px; padding: 10px 15px; border: 2px solid #cbd5e1; border-radius: 8px; cursor: pointer; transition: all 0.2s; background: white; }
        .checkbox-option:hover { border-color: #1e3a8a; }
        .checkbox-option.checked { border-color: #dc2626; background: #fef2f2; }
        .checkbox-option input { display: none; }
        .calc-panel { background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 3px solid #1e3a8a; border-radius: 12px; padding: 20px; margin: 25px 0; }
        .calc-panel h3 { color: #1e3a8a; margin: 0 0 15px; font-size: 18px; display: flex; align-items: center; gap: 10px; }
        .calc-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(30,58,138,0.15); }
        .calc-row:last-of-type { border-bottom: none; }
        .calc-label { color: #475569; font-weight: 500; }
        .calc-value { font-weight: 700; color: #1e3a8a; }
        .calc-highlight { font-size: 28px; color: #dc2626; }
        .status-box { padding: 15px; border-radius: 8px; text-align: center; font-weight: 700; margin-top: 15px; font-size: 16px; }
        .status-blue { background: #dbeafe; color: #1e3a8a; border: 2px solid #1e3a8a; }
        .status-green { background: #d1fae5; color: #065f46; border: 2px solid #10b981; }
        .status-yellow { background: #fef3c7; color: #92400e; border: 2px solid #f59e0b; }
        .status-orange { background: #ffedd5; color: #9a3412; border: 2px solid #f97316; }
        .status-red { background: #fee2e2; color: #991b1b; border: 2px solid #ef4444; }
        .rigging-display { padding: 12px; border-radius: 8px; font-weight: 700; text-align: center; }
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
// Add to your state management section
const [criticalCriteria, setCriticalCriteria] = useState([]);

// The checkbox section - replace your current one with this:
<div className="space-y-2">
  <label className="block text-sm font-medium text-gray-700">
    ⚠️ Critical Lift Criteria
  </label>
  <p className="text-sm text-gray-600 mb-2">
    Select all criteria that make this lift CRITICAL. A lift is critical if ANY of these apply.
  </p>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Why is this lift classified as CRITICAL? *
  </label>
  <div className="space-y-2">
    {[
      'Over 75% of crane capacity',
      'Two crane lift',
      'Personnel being lifted',
      'Lift over live equipment',
      'Load cannot be re-lifted if dropped',
      'Blind lift',
      'Near power lines',
      'Unusual load characteristics'
    ].map((criterion) => (
      <label key={criterion} className="flex items-start space-x-2 cursor-pointer">
        <input
          type="checkbox"
          checked={criticalCriteria.includes(criterion)}
          onChange={(e) => {
            if (e.target.checked) {
              setCriticalCriteria([...criticalCriteria, criterion]);
            } else {
              setCriticalCriteria(criticalCriteria.filter(c => c !== criterion));
            }
          }}
          className="mt-1 h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
        />
        <span className="text-sm text-gray-700">{criterion}</span>
      </label>
    ))}
  </div>
</div>

            <div className="section-header orange">📦 Load Information</div>
            <div className="form-group">
              <label>Load Description *</label>
              <textarea name="loadDescription" value={formData.loadDescription} onChange={handleChange} placeholder="Detailed description of load being lifted" required />
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
                <label>Weight Source *</label>
                <select name="weightSource" value={formData.weightSource} onChange={handleChange} required>
                  <option value="">-- Select --</option>
                  {WEIGHT_SOURCES.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row-4">
              <div className="form-group">
                <label>Length (in)</label>
                <input type="number" name="loadLength" value={formData.loadLength} onChange={handleChange} step="0.1" />
              </div>
              <div className="form-group">
                <label>Width (in)</label>
                <input type="number" name="loadWidth" value={formData.loadWidth} onChange={handleChange} step="0.1" />
              </div>
              <div className="form-group">
                <label>Height (in)</label>
                <input type="number" name="loadHeight" value={formData.loadHeight} onChange={handleChange} step="0.1" />
              </div>
              <div className="form-group">
                <label>Center of Gravity</label>
                <input type="text" name="centerOfGravity" value={formData.centerOfGravity} onChange={handleChange} placeholder="Location/offset" />
              </div>
            </div>

            <div className="section-header">🏗️ Crane Information</div>
            <div className="form-row-3">
              <div className="form-group">
                <label>Crane Number/ID *</label>
                <input type="text" name="craneNumber" value={formData.craneNumber} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Crane Type *</label>
                <select name="craneType" value={formData.craneType} onChange={handleChange} required>
                  <option value="">-- Select --</option>
                  {CRANE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Max Capacity (tons) *</label>
                <input type="number" name="craneCapacity" value={formData.craneCapacity} onChange={handleChange} step="0.1" required />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Crane Make</label>
                <input type="text" name="craneMake" value={formData.craneMake} onChange={handleChange} placeholder="e.g., Liebherr, Grove" />
              </div>
              <div className="form-group">
                <label>Crane Model</label>
                <input type="text" name="craneModel" value={formData.craneModel} onChange={handleChange} placeholder="e.g., LTM 1100" />
              </div>
            </div>
            <div className="form-row-3">
              <div className="form-group">
                <label>Boom Length (ft) *</label>
                <input type="number" name="boomLength" value={formData.boomLength} onChange={handleChange} step="0.1" required />
              </div>
              <div className="form-group">
                <label>Operating Radius (ft) *</label>
                <input type="number" name="operatingRadius" value={formData.operatingRadius} onChange={handleChange} step="0.1" required />
              </div>
              <div className="form-group">
                <label>Capacity at Radius (tons) *</label>
                <input type="number" name="capacityAtRadius" value={formData.capacityAtRadius} onChange={handleChange} step="0.01" required />
              </div>
            </div>
            <div className="form-group">
              <label>Counterweight (lbs)</label>
              <input type="text" name="counterweight" value={formData.counterweight} onChange={handleChange} placeholder="Counterweight configuration" />
            </div>

            <div className="section-header red">📉 De-rating Factors</div>
            <div className="form-row-3">
              <div className="form-group">
                <label>Wind Speed *</label>
                <select name="windSpeed" value={formData.windSpeed} onChange={handleChange} required>
                  <option value="Under 20 mph">Under 20 mph (No de-rate)</option>
                  <option value="20-30 mph">20-30 mph (-10%)</option>
                  <option value="30-40 mph">30-40 mph (-25%)</option>
                  <option value="Over 40 mph">Over 40 mph (NO LIFT)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Temperature *</label>
                <select name="temperature" value={formData.temperature} onChange={handleChange} required>
                  <option value="Above 0°F">Above 0°F (No de-rate)</option>
                  <option value="-20°F to 0°F">-20°F to 0°F (-5%)</option>
                  <option value="-40°F to -20°F">-40°F to -20°F (-10%)</option>
                  <option value="Below -40°F">Below -40°F (-15%)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Other De-rating (%)</label>
                <input type="number" name="otherDerating" value={formData.otherDerating} onChange={handleChange} min="0" max="100" />
              </div>
            </div>

            {/* CALCULATIONS PANEL */}
            <div className="calc-panel">
              <h3>📊 CAPACITY CALCULATIONS</h3>
              <div className="calc-row">
                <span className="calc-label">Total Load (Load + Rigging):</span>
                <span className="calc-value">{calculations.totalLoad.toLocaleString()} lbs ({calculations.totalLoadTons} tons)</span>
              </div>
              <div className="calc-row">
                <span className="calc-label">Gross Capacity at Radius:</span>
                <span className="calc-value">{calculations.capacityAtRadius} tons</span>
              </div>
              <div className="calc-row">
                <span className="calc-label">Wind De-rating:</span>
                <span className="calc-value">-{calculations.windDerating}%</span>
              </div>
              <div className="calc-row">
                <span className="calc-label">Cold De-rating:</span>
                <span className="calc-value">-{calculations.coldDerating}%</span>
              </div>
              <div className="calc-row">
                <span className="calc-label">Other De-rating:</span>
                <span className="calc-value">-{formData.otherDerating || 0}%</span>
              </div>
              <div className="calc-row">
                <span className="calc-label">NET Available Capacity:</span>
                <span className="calc-value">{calculations.netCapacity} tons</span>
              </div>
              <div className="calc-row" style={{borderTop: '2px solid #1e3a8a', paddingTop: '15px', marginTop: '10px'}}>
                <span className="calc-label" style={{fontWeight: 700}}>% OF CAPACITY USED:</span>
                <span className="calc-value calc-highlight">{calculations.percentCapacity}%</span>
              </div>
              <div className={`status-box ${getStatusColor()}`}>{calculations.capacityStatus}</div>
            </div>

            <div className="section-header green">🔗 Rigging Plan</div>
            <div className="form-row-3">
              <div className="form-group">
                <label>Sling Type *</label>
                <select name="slingType" value={formData.slingType} onChange={handleChange} required>
                  <option value="">-- Select --</option>
                  {SLING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
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

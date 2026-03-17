'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

const COMPANIES = [
  'A-C Electric', 'AKE-Line', 'Apache Corp.', 'Armstrong Oil & Gas', 'ASRC Energy Services',
  'CCI-Industrial', 'Chosen Construction', 'CINGSA', 'Coho Enterprises', 'Conam Construction',
  'ConocoPhillips', 'Five Star Oilfield Services', 'Fox Energy Services', 'G.A. West',
  'GBR Equipment', 'GLM Energy Services', 'Graham Industrial Coatings', 'Harvest Midstream',
  'Hilcorp Alaska', 'MagTec Alaska', 'Merkes Builders','Narwhal Exploration', 'Nordic-Calista', 'Parker TRS',
  'Peninsula Paving', 'Pollard Wireline', 'Ridgeline Oilfield Services', 'Santos',
  'Summit Excavation', 'Tesoro Refinery', 'Yellowjacket', 'Other'
]

const LOCATIONS = [
  'Kenai', 'CIO', 'Beaver Creek', 'Swanson River', 'Ninilchik', 'Nikiski', 'Other Kenai Asset',
  'Deadhorse', 'Prudhoe Bay', 'Kuparuk', 'Alpine', 'Willow', 'ENI', 'PIKKA', 'Point Thompson',
  'North Star Island', 'Endicott', 'Badami', 'West Harrison Bay', 'Other North Slope'
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
const POWER_LINE_OPTIONS = [
  'None in area',
  'Unknown voltage — Assume overhead distribution (≤50kV)',
  '≤50V (de minimis)',
  '51V–1,000V (LV Distribution)',
  '1,001V–15kV (MV Distribution)',
  '15kV–35kV (MV Distribution)',
  '35kV–50kV (Sub-Transmission)',
  '50kV–100kV (Transmission)',
  '100kV–200kV (Transmission)',
  '200kV–350kV (High Voltage)',
  '350kV–500kV (Extra High Voltage)',
  '500kV–750kV (Ultra High Voltage)',
  '>750kV (Ultra High Voltage)',
  'De-energized & Grounded — Confirmed by Utility'
]

// OSHA 1926.1408 Table A — Minimum clearance distances for cranes/derricks near power lines
// "Unknown" scenario defaults to ≤50kV per OSHA guidance (most conservative assumption for overhead distribution)
const POWER_LINE_CLEARANCE = {
  'None in area':                                          null,
  'De-energized & Grounded — Confirmed by Utility':       { min: '0 ft (confirmed de-energized)', exclusion: 0,  note: 'Written confirmation from utility required. Treat as energized until utility authorizes.', osha: 'OSHA 1926.1407', color: '#059669' },
  '≤50V (de minimis)':                                    { min: '10 ft',  exclusion: 10, note: 'Minimum 10 ft applies even at very low voltages per OSHA 1926.1408.', osha: 'OSHA 1926.1408 Table A', color: '#eab308' },
  '51V–1,000V (LV Distribution)':                         { min: '10 ft',  exclusion: 10, note: 'Standard minimum clearance. Dedicated spotter required when operating within 20 ft.', osha: 'OSHA 1926.1408 Table A', color: '#eab308' },
  '1,001V–15kV (MV Distribution)':                        { min: '10 ft',  exclusion: 10, note: 'Standard minimum clearance. Dedicated spotter required when operating within 20 ft.', osha: 'OSHA 1926.1408 Table A', color: '#eab308' },
  '15kV–35kV (MV Distribution)':                          { min: '10 ft',  exclusion: 10, note: 'Standard minimum clearance. Dedicated spotter required when operating within 20 ft.', osha: 'OSHA 1926.1408 Table A', color: '#f97316' },
  '35kV–50kV (Sub-Transmission)':                         { min: '10 ft',  exclusion: 10, note: 'Standard minimum clearance. Dedicated spotter required when operating within 20 ft.', osha: 'OSHA 1926.1408 Table A', color: '#f97316' },
  'Unknown voltage — Assume overhead distribution (≤50kV)':{ min: '20 ft', exclusion: 20, note: '⚠️ CONSERVATIVE DEFAULT: When voltage is unknown, OSHA requires 20 ft minimum. Do not assume lower clearance. Contact utility to confirm voltage.', osha: 'OSHA 1926.1408(a)(2)', color: '#dc2626' },
  '50kV–100kV (Transmission)':                            { min: '15 ft',  exclusion: 15, note: 'Add 0.4 in per kV above 50kV. Dedicated spotter required. Pre-work utility notification recommended.', osha: 'OSHA 1926.1408 Table A', color: '#dc2626' },
  '100kV–200kV (Transmission)':                           { min: '20 ft',  exclusion: 20, note: 'High voltage transmission — engineering review required. Utility coordination mandatory.', osha: 'OSHA 1926.1408 Table A', color: '#dc2626' },
  '200kV–350kV (High Voltage)':                           { min: '25 ft',  exclusion: 25, note: 'High voltage — stop work and notify utility. Engineering controls and utility coordination required.', osha: 'OSHA 1926.1408 Table A', color: '#991b1b' },
  '350kV–500kV (Extra High Voltage)':                     { min: '35 ft',  exclusion: 35, note: 'STOP WORK — Extra high voltage. Do not operate until utility has de-energized and confirmed in writing.', osha: 'OSHA 1926.1408 Table A', color: '#991b1b' },
  '500kV–750kV (Ultra High Voltage)':                     { min: '45 ft',  exclusion: 45, note: 'STOP WORK — Ultra high voltage. Crane operation near this line requires utility de-energization.', osha: 'OSHA 1926.1408 Table A', color: '#991b1b' },
  '>750kV (Ultra High Voltage)':                          { min: '50 ft',  exclusion: 50, note: 'STOP WORK — Maximum hazard. Crane work prohibited within 50 ft. Utility de-energization and engineering review required.', osha: 'OSHA 1926.1408 Table A', color: '#991b1b' },
}
const COMM_METHODS = ['Hand Signals', 'Radio', 'Voice (Direct)', 'Hardwired Headset']
const BACKUP_COMM = ['Hand Signals', 'Radio', 'Voice (Direct)', 'Air Horn (Emergency Stop)']

export default function CriticalLiftPlanForm() {
  const [formData, setFormData] = useState({
    liftPlanNumber: '', date: new Date().toLocaleDateString('en-CA'),
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
    overheadHazards: '', undergroundHazards: '', powerLines: 'None in area', powerLineVoltage: 'None in area', exclusionZone: '',
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
    if (name === 'powerLineVoltage') {
      const clearance = POWER_LINE_CLEARANCE[value]
      setFormData(prev => ({
        ...prev,
        powerLineVoltage: value,
        powerLines: value === 'None in area' ? 'None in area' : value === 'De-energized & Grounded — Confirmed by Utility' ? 'Present - De-energized' : 'Present - Requires dedicated spotter',
        exclusionZone: clearance ? String(clearance.exclusion) : prev.exclusionZone
      }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
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


  const printLiftPlan = () => {
    const win = window.open('', '_blank');
    if (!win) { alert('Please allow pop-ups to print.'); return; }
    const d = formData;
    const calc = calculations;
    const row = (label, value) => value ? `<tr><td class="lbl">${label}</td><td>${value}</td></tr>` : '';
    const section = (title, color='#1e3a8a') => `<tr><td colspan="2" class="section" style="background:${color}">${title}</td></tr>`;

    const html = `<!DOCTYPE html><html><head><title>Critical Lift Plan — ${d.liftPlanNumber||'Draft'}</title>
<style>
  @page{size:letter;margin:0.6in}
  body{font-family:Arial,sans-serif;font-size:10pt;color:#1a1a1a;margin:0}
  .header{display:flex;align-items:center;gap:20px;border-bottom:3px solid #1e3a8a;padding-bottom:12px;margin-bottom:16px}
  .header img{height:55px}
  .header-text h1{font-size:16pt;color:#1e3a8a;margin:0 0 2px}
  .header-text p{margin:0;font-size:9pt;color:#555}
  .badge{display:inline-block;background:#991b1b;color:white;padding:3px 10px;border-radius:4px;font-size:8pt;font-weight:bold;margin-top:4px}
  table{width:100%;border-collapse:collapse;margin-bottom:14px}
  td{padding:5px 8px;border:1px solid #d1d5db;font-size:9.5pt;vertical-align:top}
  .lbl{font-weight:600;width:38%;background:#f1f5f9;color:#1e3a8a}
  .section{font-weight:700;font-size:10pt;color:white;padding:7px 10px;letter-spacing:0.3px}
  .status-box{border:2px solid #1e3a8a;border-radius:6px;padding:10px;margin-bottom:14px;text-align:center}
  .status-box .big{font-size:16pt;font-weight:800}
  .criteria-grid{display:flex;flex-wrap:wrap;gap:6px;padding:8px}
  .criteria-item{background:#fee2e2;border:1px solid #fca5a5;padding:3px 8px;border-radius:4px;font-size:8.5pt}
  .footer{text-align:center;font-size:8pt;color:#888;border-top:1px solid #d1d5db;padding-top:8px;margin-top:16px}
  .print-btn{display:block;margin:0 auto 16px;padding:10px 32px;background:#1e3a8a;color:white;border:none;border-radius:6px;font-size:12pt;cursor:pointer}
  @media print{.print-btn{display:none}}
</style></head><body>
<button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
<div class="header">
  <img src="/Logo.png" onerror="this.style.display='none'" alt="SLP Alaska">
  <div class="header-text">
    <h1>Critical Lift Plan</h1>
    <p>SLP Alaska Safety Management System</p>
    <span class="badge">⚠️ CRITICAL LIFT — PERMIT REQUIRED</span>
  </div>
  <div style="margin-left:auto;text-align:right;font-size:9pt">
    <div style="font-size:14pt;font-weight:800;color:#1e3a8a">${d.liftPlanNumber||'—'}</div>
    <div>${d.date}</div>
    <div>${d.company} | ${d.location}</div>
  </div>
</div>

<div class="status-box" style="border-color:${parseFloat(calc.percentCapacity)>100?'#dc2626':parseFloat(calc.percentCapacity)>85?'#f59e0b':'#059669'}">
  <div class="big" style="color:${parseFloat(calc.percentCapacity)>100?'#dc2626':parseFloat(calc.percentCapacity)>85?'#f59e0b':'#059669'}">${calc.capacityStatus}</div>
  <div style="font-size:9.5pt;margin-top:4px">Net Capacity: ${calc.netCapacity} tons | Total Load: ${calc.totalLoadTons} tons | ${calc.percentCapacity}% of capacity | Derating: ${calc.totalDerating}%</div>
</div>

<table>
  ${section('📋 Lift Information')}
  ${row('Prepared By', d.preparedBy)}
  ${row('Company', d.company)}
  ${row('Location', d.location)}
  ${row('Lift Description', d.liftDescription)}
  ${section('⚠️ Critical Lift Criteria', '#991b1b')}
  <tr><td colspan="2" style="padding:6px">
    <div class="criteria-grid">${(d.criticalCriteria||[]).map(c=>`<span class="criteria-item">⚠️ ${c}</span>`).join('')||'None selected'}</div>
  </td></tr>
  ${section('⚖️ Load Information')}
  ${row('Load Description', d.loadDescription)}
  ${row('Load Weight', d.loadWeight ? d.loadWeight+' lbs' : '')}
  ${row('Rigging Weight', d.riggingWeight ? d.riggingWeight+' lbs' : '')}
  ${row('Total Load', calc.totalLoad ? calc.totalLoad.toLocaleString()+' lbs ('+calc.totalLoadTons+' tons)' : '')}
  ${row('Weight Source', d.weightSource)}
  ${row('Dimensions (L×W×H)', [d.loadLength,d.loadWidth,d.loadHeight].filter(Boolean).join(' × ')+' ft')}
  ${row('Center of Gravity', d.centerOfGravity)}
  ${section('🏗️ Crane Information')}
  ${row('Crane ID', d.craneNumber)}
  ${row('Type', d.craneType)}
  ${row('Make / Model', [d.craneMake,d.craneModel].filter(Boolean).join(' / '))}
  ${row('Crane Capacity', d.craneCapacity ? d.craneCapacity+' tons' : '')}
  ${row('Boom Length', d.boomLength ? d.boomLength+' ft' : '')}
  ${row('Operating Radius', d.operatingRadius ? d.operatingRadius+' ft' : '')}
  ${row('Capacity at Radius', d.capacityAtRadius ? d.capacityAtRadius+' tons (from load chart)' : '')}
  ${row('Counterweight', d.counterweight)}
  ${section('⚡ Capacity & Derating')}
  ${row('Wind Speed', d.windSpeed)}
  ${row('Temperature', d.temperature)}
  ${row('Wind Derating', calc.windDerating+'%')}
  ${row('Cold Derating', calc.coldDerating+'%')}
  ${row('Other Derating', d.otherDerating+'%')}
  ${row('Total Derating', calc.totalDerating+'%')}
  ${row('Net Capacity', calc.netCapacity+' tons')}
  ${row('% of Capacity', calc.percentCapacity+'%')}
  ${section('🔗 Rigging')}
  ${row('Sling Type', d.slingType)}
  ${row('Sling Size', d.slingSize)}
  ${row('Number of Legs', d.numberOfLegs)}
  ${row('Sling Angle', d.slingAngle+'°')}
  ${row('Sling WLL (each)', d.slingWLL ? d.slingWLL+' lbs' : '')}
  ${row('Sling Capacity at Angle', calc.slingCapacityAtAngle ? calc.slingCapacityAtAngle.toLocaleString()+' lbs — '+calc.riggingAdequate : '')}
  ${row('Shackle Size', d.shackleSize)}
  ${row('Shackle WLL', d.shackleWLL ? d.shackleWLL+' lbs' : '')}
  ${section('🌍 Site Conditions')}
  ${row('Ground Conditions', d.groundConditions)}
  ${row('Weather Conditions', d.weatherConditions)}
  ${row('Overhead Hazards', d.overheadHazards)}
  ${row('Underground Hazards', d.undergroundHazards)}
  ${row('Power Line Voltage', d.powerLineVoltage)}
  ${row('Exclusion Zone', d.exclusionZone ? d.exclusionZone+' ft' : '')}
  ${section('👷 Personnel', '#065f46')}
  ${row('Crane Operator', d.craneOperator)}
  ${row('Signal Person', d.signalPerson)}
  ${row('Rigger(s)', d.riggers)}
  ${row('Lift Director', d.liftDirector)}
  ${row('Spotter(s)', d.spotters)}
  ${section('📻 Communication')}
  ${row('Primary Method', d.communicationMethod)}
  ${row('Backup Method', d.backupCommunication)}
  ${row('Radio Channel', d.radioChannel)}
  ${section('🚨 Emergency Procedures', '#991b1b')}
  ${row('Emergency Procedures', d.emergencyProcedures)}
  ${row('Additional Comments', d.comments)}
</table>
<div class="footer">AnthroSafe™ Field Driven Safety © 2026 SLP Alaska, LLC | Safety • Leadership • Performance | Printed: ${new Date().toLocaleString()}</div>
</body></html>`;
    win.document.write(html);
    win.document.close();
  };

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
      liftPlanNumber: '', date: new Date().toLocaleDateString('en-CA'),
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
      overheadHazards: '', undergroundHazards: '', powerLines: 'None in area', powerLineVoltage: 'None in area', exclusionZone: '',
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

      <a href="https://portal.slpalaska.com" className="back-link">← Back to Safety Portal</a>

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
                <label>Power Lines — Voltage in Area</label>
                <select name="powerLineVoltage" value={formData.powerLineVoltage} onChange={handleChange}>
                  {POWER_LINE_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <div style={{fontSize:'12px',color:'#6b7280',marginTop:'4px'}}>If voltage is unknown, select "Unknown" — OSHA requires 20 ft minimum clearance</div>
              </div>
              <div className="form-group">
                <label>Exclusion Zone Radius (ft) *</label>
                <input type="number" name="exclusionZone" value={formData.exclusionZone} onChange={handleChange} required />
                <div style={{fontSize:'12px',color:'#6b7280',marginTop:'4px'}}>Auto-fills from voltage selection — may be increased but not decreased</div>
              </div>
            </div>

            {formData.powerLineVoltage && formData.powerLineVoltage !== 'None in area' && POWER_LINE_CLEARANCE[formData.powerLineVoltage] && (
              <div style={{border:`2px solid ${POWER_LINE_CLEARANCE[formData.powerLineVoltage].color}`,borderRadius:'8px',padding:'16px',marginBottom:'20px',background:'#fff7ed'}}>
                <div style={{fontWeight:'700',fontSize:'14px',color:POWER_LINE_CLEARANCE[formData.powerLineVoltage].color,marginBottom:'12px'}}>
                  ⚡ {POWER_LINE_CLEARANCE[formData.powerLineVoltage].osha} — Power Line Approach Requirements
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'10px',marginBottom:'12px'}}>
                  <div style={{background:'white',borderRadius:'6px',padding:'10px',textAlign:'center',border:'1px solid #e5e7eb'}}>
                    <div style={{fontSize:'11px',color:'#6b7280',fontWeight:'600',marginBottom:'4px'}}>MINIMUM CLEARANCE</div>
                    <div style={{fontSize:'20px',fontWeight:'800',color:POWER_LINE_CLEARANCE[formData.powerLineVoltage].color}}>{POWER_LINE_CLEARANCE[formData.powerLineVoltage].min}</div>
                    <div style={{fontSize:'10px',color:'#6b7280',marginTop:'2px'}}>No part of crane/load may enter</div>
                  </div>
                  <div style={{background:'white',borderRadius:'6px',padding:'10px',textAlign:'center',border:'1px solid #e5e7eb'}}>
                    <div style={{fontSize:'11px',color:'#6b7280',fontWeight:'600',marginBottom:'4px'}}>SPOTTER REQUIRED WITHIN</div>
                    <div style={{fontSize:'20px',fontWeight:'800',color:'#d97706'}}>20 ft</div>
                    <div style={{fontSize:'10px',color:'#6b7280',marginTop:'2px'}}>Dedicated observer, eyes on lines</div>
                  </div>
                  <div style={{background:'white',borderRadius:'6px',padding:'10px',textAlign:'center',border:'1px solid #e5e7eb'}}>
                    <div style={{fontSize:'11px',color:'#6b7280',fontWeight:'600',marginBottom:'4px'}}>UTILITY NOTIFICATION</div>
                    <div style={{fontSize:'20px',fontWeight:'800',color:'#1e3a8a'}}>Required</div>
                    <div style={{fontSize:'10px',color:'#6b7280',marginTop:'2px'}}>Before work begins</div>
                  </div>
                </div>
                <div style={{background: POWER_LINE_CLEARANCE[formData.powerLineVoltage].color === '#059669' ? '#dcfce7' : '#fee2e2', borderRadius:'6px',padding:'10px',fontSize:'13px',color: POWER_LINE_CLEARANCE[formData.powerLineVoltage].color,fontWeight:'600'}}>
                  📋 {POWER_LINE_CLEARANCE[formData.powerLineVoltage].note}
                </div>
                <div style={{marginTop:'10px',padding:'8px 12px',background:'#eff6ff',borderRadius:'6px',fontSize:'12px',color:'#1e3a8a'}}>
                  <strong>OSHA 1926.1408 Requirements:</strong> A dedicated spotter must be assigned whose sole responsibility is watching the power lines. All personnel must know the emergency response plan if contact occurs. Crane operator must be able to see or communicate with spotter at all times.
                </div>
              </div>
            )}

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

            <div style={{display:'flex',gap:'12px',flexWrap:'wrap'}}>
              <button type="submit" className="submit-btn" disabled={submitting} style={{flex:1}}>
                {submitting ? 'Generating Lift Plan...' : 'Generate Critical Lift Plan'}
              </button>
              <button type="button" onClick={printLiftPlan}
                style={{flex:1,padding:'16px 32px',background:'linear-gradient(135deg,#374151,#1f2937)',color:'white',border:'none',borderRadius:'8px',fontSize:'16px',fontWeight:'600',cursor:'pointer'}}>
                🖨️ Print / Save PDF
              </button>
            </div>
            {message.type === 'success' && (
              <button type="button" className="reset-btn" onClick={resetForm}>Create Another Lift Plan</button>
            )}
          </form>
          
          <div className="footer">
            <span>AnthroSafe™ Field Driven Safety</span> | <span>© 2026 SLP Alaska, LLC</span>
          </div>
        </div>
      </div>
    </div>
  )
}

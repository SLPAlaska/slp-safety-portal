'use client'
import { COMPANIES } from '@/lib/companies'

import { useState, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import MultiPhotoUpload from '@/components/MultiPhotoUpload';
import { safeSubmit } from '@/components/SafeSubmit';

const supabase = createClient(
  'https://iypezirwdlqpptjpeeyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
)

const LOCATIONS = ['Kenai', 'CIO', 'Beaver Creek', 'Swanson River', 'Ninilchik', 'Nikiski', 'Other Kenai Asset', 'Deadhorse', 'Prudhoe Bay', 'Kuparuk', 'Alpine', 'Willow', 'ENI', 'PIKKA', 'Point Thompson', 'North Star Island', 'Endicott', 'Badami', 'West Harrison Bay', 'Other North Slope']

export default function ELineSafetyAuditForm() {
  const [formData, setFormData] = useState({
    auditor_name: '', audit_date: new Date().toLocaleDateString('en-CA'), job_number: '', company: '', location: '', well_name: '', client_rep: '', unit_id: '', crew_size: '',
    jsa_reviewed: '', work_permit: '', hot_work_permit: '', confined_space_permit: '', emergency_plan: '', client_requirements: '', pre_job_meeting: '',
    first_aid_cpr: '', ppe_appropriate: '',
    unit_pre_trip: '', tools_inspected: '',
    lubricator_condition: '', annual_lubricator_inspection: '', bop_installed: '', bop_tested: '',
    low_test_pressure: '', high_test_pressure: '', test_documented: '',
    sheave_aligned: '', weight_indicator: '',
    unit_grounded: '', bonding_verified: '', electrical_connections: '',
    well_status: '', wellhead_condition: '',
    access_egress: '', work_area_barricaded: '', wind_weather_conditions: '', lighting_equipment: '', housekeeping: '',
    radio_check: '', emergency_contacts: '', muster_point_location: '',
    overall_result: '', comments: ''
  })

  const photoRef = useRef();
  const [resultDisplay, setResultDisplay] = useState({ text: 'Select audit result above', className: 'result-pending' })
  const [status, setStatus] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (name === 'overall_result') {
      if (value.includes('Pass - All')) setResultDisplay({ text: '✅ AUDIT PASSED - Job Safe to Proceed', className: 'result-pass' })
      else if (value.includes('Pass - Minor')) setResultDisplay({ text: '⚠️ PASSED WITH NOTES - Address minor issues', className: 'result-warning' })
      else if (value.includes('Fail')) setResultDisplay({ text: '🛑 AUDIT FAILED - Do not proceed until resolved', className: 'result-fail' })
      else setResultDisplay({ text: 'Select audit result above', className: 'result-pending' })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setStatus('Submitting...')

    try {
      // Generate a unique submission ID for photo storage path
      const result = await safeSubmit({
        table: 'eline_safety_audits',
        data: { ...formData },
        photoRef: photoRef,
        formType: 'e-line-safety-audit'
      });

      if (result.success) {
        setStatus('✅ Submitted successfully!');
        setTimeout(() => window.location.reload(), 2000);
        if (result.photoWarning) {
          console.warn(result.photoWarning);
        }
      } else {
        alert(result.error || 'Submission failed. Please try again.');
      }
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
      <a href="https://portal.slpalaska.com" style={{ display: 'inline-block', marginBottom: '15px', padding: '10px 20px', backgroundColor: '#1e3a5f', color: '#fff', textDecoration: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '500' }}>← Back to Portal</a>
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '18px' }}>
              <div><label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>Well Name/ID *</label><input type="text" name="well_name" value={formData.well_name} onChange={handleChange} required style={{ width: '100%', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box' }} /></div>
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
              { name: 'first_aid_cpr', label: 'First Aid/CPR training current' },
              { name: 'ppe_appropriate', label: 'PPE appropriate for task' }
            ]} valueKey="yn" />

            <div style={{ background: '#7c3aed', color: 'white', padding: '12px 20px', margin: '25px -30px 20px', fontWeight: 600, fontSize: '15px' }}>🚛 E-Line Unit & Equipment</div>
            <ChecklistTable items={[
              { name: 'unit_pre_trip', label: 'Unit pre-trip inspection complete' },
              { name: 'tools_inspected', label: 'Tools inspected and ready' }
            ]} valueKey="ok" />

            <div style={{ background: '#dc2626', color: 'white', padding: '12px 20px', margin: '25px -30px 20px', fontWeight: 600, fontSize: '15px' }}>🔧 Pressure Control Equipment</div>
            <ChecklistTable items={[
              { name: 'lubricator_condition', label: 'Lubricator condition' },
              { name: 'annual_lubricator_inspection', label: 'Annual Lubricator Inspection complete and Color Coded Correctly' },
              { name: 'bop_installed', label: 'WLV installed correctly' },
              { name: 'bop_tested', label: 'WLV function tested' }
            ]} valueKey="ok" />

            <div style={{ background: '#0891b2', color: 'white', padding: '12px 20px', margin: '25px -30px 20px', fontWeight: 600, fontSize: '15px' }}>📊 Pressure Testing</div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '18px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>Low Pressure Test PSI</label>
                <input type="number" name="low_test_pressure" value={formData.low_test_pressure} onChange={handleChange} min="0" step="1" inputMode="numeric" placeholder="PSI" style={{ width: '100%', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>High Pressure Test PSI</label>
                <input type="number" name="high_test_pressure" value={formData.high_test_pressure} onChange={handleChange} min="0" step="1" inputMode="numeric" placeholder="PSI" style={{ width: '100%', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box' }} />
              </div>
            </div>

            <div style={{ marginBottom: '25px' }}>
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: 500 }}>Pressure Tests Documented? *</label>
              <div style={{ display: 'flex', gap: '15px' }}>
                {['Yes', 'No'].map(v => <label key={v} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 15px', border: '2px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}><input type="radio" name="test_documented" value={v} checked={formData.test_documented === v} onChange={handleChange} required /><span>{v}</span></label>)}
              </div>
            </div>

            <div style={{ background: '#1e3a8a', color: 'white', padding: '12px 20px', margin: '25px -30px 20px', fontWeight: 600, fontSize: '15px' }}>🔗 Rigging & Sheaves</div>
            <ChecklistTable items={[
              { name: 'sheave_aligned', label: 'Sheave properly aligned' },
              { name: 'weight_indicator', label: 'Weight indicator working' }
            ]} valueKey="ok" />

            <div style={{ background: '#f59e0b', color: '#000', padding: '12px 20px', margin: '25px -30px 20px', fontWeight: 600, fontSize: '15px' }}>⚡ Electrical Safety</div>
            <ChecklistTable items={[
              { name: 'unit_grounded', label: 'Unit properly grounded' },
              { name: 'bonding_verified', label: 'Bonding verified' },
              { name: 'electrical_connections', label: 'Electrical connections secure' }
            ]} valueKey="ok" />

            <div style={{ background: '#ea580c', color: 'white', padding: '12px 20px', margin: '25px -30px 20px', fontWeight: 600, fontSize: '15px' }}>🛢️ Well Site Safety</div>
            <ChecklistTable items={[
              { name: 'well_status', label: 'Well status verified with client' },
              { name: 'wellhead_condition', label: 'Wellhead condition acceptable' }
            ]} valueKey="ok" />

            <div style={{ background: '#059669', color: 'white', padding: '12px 20px', margin: '25px -30px 20px', fontWeight: 600, fontSize: '15px' }}>🌍 Site Conditions</div>
            <ChecklistTable items={[
              { name: 'access_egress', label: 'Access/egress routes clear' },
              { name: 'work_area_barricaded', label: 'Work area barricaded' },
              { name: 'housekeeping', label: 'Housekeeping acceptable' }
            ]} valueKey="ok" />

            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>Wind and Weather Conditions</label>
              <textarea name="wind_weather_conditions" value={formData.wind_weather_conditions} onChange={handleChange} placeholder="Wind speed and direction, temperature, visibility, precipitation, and any limits they place on the job..." style={{ width: '100%', minHeight: '90px', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: '25px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>List lighting equipment on location</label>
              <input type="text" name="lighting_equipment" value={formData.lighting_equipment} onChange={handleChange} placeholder="e.g. 2 light plants, unit-mounted floods, headlamps" style={{ width: '100%', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box' }} />
            </div>

            <div style={{ background: '#1e3a8a', color: 'white', padding: '12px 20px', margin: '25px -30px 20px', fontWeight: 600, fontSize: '15px' }}>📻 Communications</div>
            <ChecklistTable items={[
              { name: 'radio_check', label: 'Radio check complete' },
              { name: 'emergency_contacts', label: 'Emergency contacts posted' }
            ]} valueKey="yn" />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>Muster Point Location</label>
                <input type="text" name="muster_point_location" value={formData.muster_point_location} onChange={handleChange} placeholder="Where the crew musters" style={{ width: '100%', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>Client Rep Name</label>
                <input type="text" name="client_rep" value={formData.client_rep} onChange={handleChange} placeholder="Client representative on location" style={{ width: '100%', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box' }} />
              </div>
            </div>

            <div style={{ background: '#dc2626', color: 'white', padding: '12px 20px', margin: '25px -30px 20px', fontWeight: 600, fontSize: '15px' }}>✅ Audit Result</div>
            
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>Overall Audit Result *</label>
              <select name="overall_result" value={formData.overall_result} onChange={handleChange} required style={{ width: '100%', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box' }}>
                <option value="">-- Select --</option>
                <option value="Pass - All Items OK">✅ Pass - All Items OK</option>
                <option value="Pass - Minor Issues">⚠️ Pass - Minor Issues Noted</option>
                <option value="Fail - Critical Issues">❌ Fail - Critical Issues Found</option>
              </select>
            </div>

            <div style={{ padding: '20px', borderRadius: '10px', textAlign: 'center', margin: '20px 0', fontWeight: 600, fontSize: '18px', background: resultDisplay.className === 'result-pass' ? '#d1fae5' : resultDisplay.className === 'result-warning' ? '#fef3c7' : resultDisplay.className === 'result-fail' ? '#fee2e2' : '#f3f4f6', border: resultDisplay.className === 'result-pass' ? '2px solid #059669' : resultDisplay.className === 'result-warning' ? '2px solid #f59e0b' : resultDisplay.className === 'result-fail' ? '2px solid #dc2626' : '2px solid #d1d5db', color: resultDisplay.className === 'result-pass' ? '#065f46' : resultDisplay.className === 'result-warning' ? '#92400e' : resultDisplay.className === 'result-fail' ? '#991b1b' : '#6b7280' }}>
              {resultDisplay.text}
            </div>

            <div style={{ marginBottom: '25px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>Additional Comments</label>
              <textarea name="comments" value={formData.comments} onChange={handleChange} placeholder="Any critical issues found, corrective actions taken or required, and any other observations..." style={{ width: '100%', minHeight: '220px', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>

            {/* Photo Documentation */}
            <MultiPhotoUpload ref={photoRef} formType="e-line-safety-audit" />

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
        <span style={{ color: '#1e3a5f', fontWeight: 500 }}>AnthroSafe™ Field Driven Safety</span>
        <span style={{ color: '#94a3b8', margin: '0 8px' }}>|</span>
        <span style={{ color: '#475569' }}>© 2026 SLP Alaska, LLC</span>
      </div>
    </div>
  )
}

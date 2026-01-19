'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const COMPANIES = ['A-C Electric', 'Acuren', 'Alutiiq', 'Arctic Catering', 'Brooks Range Supply', 'Calista', 'CCI', 'Cruz Construction', 'Denali Universal Services (DUS)', 'Doyon Anvil', 'Evergreen Helicopters', 'Fairweather', 'Flowline Alaska', 'Grizzly Camp Services', 'Kakivik Asset Management', 'Lounsbury', 'Lynden', 'Maritime Helicopters', 'Nordic Calista', 'North Arrow', 'Northern Air Cargo', 'NANA/Colt', 'Peak Oilfield Service', 'PND', 'Price Gregory', 'SAExploration', 'Solaris', 'Sourdough Express', 'Weston', 'Yellowjacket', 'Other']

const LOCATIONS = ['Kenai', 'Nikishka/NLT', 'Beaver Creek', 'Swanson River', 'Prudhoe Bay', 'Endicott', 'Alpine', 'Kuparuk', 'Colville', 'Miluveach', 'CD5', 'GMT1', 'GMT2', 'Deadhorse', 'Sag River', 'Pump Station 1', 'Pump Station 2', 'Pump Station 3', 'Other']

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
    
    // Foundation & Base
    base_plates_mudsills_adequate: 'ok',
    level_and_plumb: 'ok',
    adequate_base_support: 'ok',
    screw_jacks_properly_set: 'ok',
    
    // Planking/Decking
    planking_secured: 'ok',
    planking_fully_decked: 'ok',
    no_damaged_planks: 'ok',
    proper_overlap: 'ok',
    
    // Guardrails
    top_rail_installed: 'ok',
    mid_rail_installed: 'ok',
    toeboards_installed: 'ok',
    guardrails_secure: 'ok',
    
    // Access
    proper_ladder_access: 'ok',
    ladder_secured: 'ok',
    ladder_extends_3ft: 'ok',
    stairs_installed_properly: 'ok',
    
    // Frame & Structure
    frames_secured: 'ok',
    diagonal_bracing_installed: 'ok',
    pins_and_clips_secured: 'ok',
    no_damaged_components: 'ok',
    
    // Ties & Anchorage
    tied_to_structure: 'ok',
    ties_adequate: 'ok',
    tie_spacing_compliant: 'ok',
    
    // Overhead Protection
    overhead_protection_required: 'ok',
    overhead_protection_adequate: 'ok',
    
    // Platforms
    platforms_level: 'ok',
    platform_width_adequate: 'ok',
    platforms_fully_planked: 'ok',
    
    // Safety
    fall_protection_required: 'ok',
    fall_protection_available: 'ok',
    tag_system_in_place: 'ok',
    warning_signs_posted: 'ok',
    
    // Load & Use
    scaffold_tagged: 'ok',
    load_capacity_posted: 'ok',
    no_overloading: 'ok',
    material_properly_stored: 'ok',
    
    // Weather & Environment
    debris_removed: 'ok',
    ice_snow_removed: 'ok',
    weather_conditions_safe: 'ok',
    
    // General Condition
    no_modifications_unauthorized: 'ok',
    scaffold_complete: 'ok',
    competent_person_inspected: 'ok',
    
    // Additional
    outriggers_used: 'ok',
    outriggers_level: 'ok',
    casters_locked: 'ok',
    scaffold_inside_power_lines: 'ok',
    electrical_hazards_present: 'ok',
    scaffold_accessible_by_public: 'ok',
    
    defects_found: '',
    corrective_action: '',
    additional_notes: ''
  })

  const [status, setStatus] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

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

      const { data, error } = await supabase
        .from('scaffold_inspections')
        .insert([dataToSubmit])

      if (error) throw error

      setStatus('✅ Inspection submitted successfully!')
      setTimeout(() => {
        window.location.reload()
      }, 2000)
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

  const getInspectionResult = () => {
    const values = Object.values(formData)
    if (values.includes('deficient')) return { text: 'FAIL', color: '#dc2626' }
    if (values.includes('na')) return { text: 'WARNING', color: '#ea580c' }
    return { text: 'PASS', color: '#059669' }
  }

  const result = getInspectionResult()
  const hasDefects = formData.defects_found.trim().length > 0

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
      padding: '20px'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', background: 'white', borderRadius: '12px', padding: '30px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ color: '#1e3a8a', fontSize: '28px', marginBottom: '10px' }}>Daily Scaffold Inspection</h1>
          <p style={{ color: '#64748b', fontSize: '14px' }}>OSHA 1926.451 & 1926.452 Compliant</p>
        </div>

        <form onSubmit={handleSubmit}>
          
          {/* Basic Information */}
          <div style={{ marginBottom: '30px' }}>
            <h2 style={{ color: '#1e3a8a', fontSize: '20px', marginBottom: '15px', borderBottom: '2px solid #3b82f6', paddingBottom: '8px' }}>Basic Information</h2>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Company *</label>
              <select name="company" value={formData.company} onChange={handleChange} required style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                <option value="">Select Company</option>
                {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Project Name *</label>
              <input type="text" name="project_name" value={formData.project_name} onChange={handleChange} required style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Location *</label>
              <select name="location" value={formData.location} onChange={handleChange} required style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                <option value="">Select Location</option>
                {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Inspector Name *</label>
              <input type="text" name="inspector_name" value={formData.inspector_name} onChange={handleChange} required style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Scaffold Location *</label>
              <input type="text" name="scaffold_location" value={formData.scaffold_location} onChange={handleChange} required style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Height (ft)</label>
                <input type="number" name="scaffold_height" value={formData.scaffold_height} onChange={handleChange} step="0.1" style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Levels</label>
                <input type="number" name="number_of_levels" value={formData.number_of_levels} onChange={handleChange} style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Load Capacity (lbs)</label>
                <input type="number" name="load_capacity" value={formData.load_capacity} onChange={handleChange} style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
              </div>
            </div>
          </div>

          {/* Inspection Checklist - Foundation */}
          <InspectionSection title="Foundation & Base" items={[
            { name: 'base_plates_mudsills_adequate', label: 'Base plates/mudsills adequate and secure' },
            { name: 'level_and_plumb', label: 'Scaffold level and plumb' },
            { name: 'adequate_base_support', label: 'Adequate base support on firm foundation' },
            { name: 'screw_jacks_properly_set', label: 'Screw jacks properly set and secure' }
          ]} formData={formData} handleChange={handleChange} />

          {/* Planking */}
          <InspectionSection title="Planking/Decking" items={[
            { name: 'planking_secured', label: 'Planking secured and in good condition' },
            { name: 'planking_fully_decked', label: 'Platform fully decked (no gaps)' },
            { name: 'no_damaged_planks', label: 'No damaged, cracked, or weak planks' },
            { name: 'proper_overlap', label: 'Proper overlap at supports (min 6")' }
          ]} formData={formData} handleChange={handleChange} />

          {/* Guardrails */}
          <InspectionSection title="Guardrails" items={[
            { name: 'top_rail_installed', label: 'Top rail installed (42" ± 3")' },
            { name: 'mid_rail_installed', label: 'Mid rail installed (21" from platform)' },
            { name: 'toeboards_installed', label: 'Toeboards installed (min 3.5")' },
            { name: 'guardrails_secure', label: 'Guardrails secure and undamaged' }
          ]} formData={formData} handleChange={handleChange} />

          {/* Access */}
          <InspectionSection title="Access" items={[
            { name: 'proper_ladder_access', label: 'Proper ladder/stair access provided' },
            { name: 'ladder_secured', label: 'Ladder secured to scaffold' },
            { name: 'ladder_extends_3ft', label: 'Ladder extends 3 ft above platform' },
            { name: 'stairs_installed_properly', label: 'Stairs installed properly with handrails' }
          ]} formData={formData} handleChange={handleChange} />

          {/* Frame & Structure */}
          <InspectionSection title="Frame & Structure" items={[
            { name: 'frames_secured', label: 'Frames properly connected and secured' },
            { name: 'diagonal_bracing_installed', label: 'Diagonal bracing installed' },
            { name: 'pins_and_clips_secured', label: 'All pins, clips, and locks secured' },
            { name: 'no_damaged_components', label: 'No damaged components' }
          ]} formData={formData} handleChange={handleChange} />

          {/* Ties & Anchorage */}
          <InspectionSection title="Ties & Anchorage" items={[
            { name: 'tied_to_structure', label: 'Scaffold tied to structure' },
            { name: 'ties_adequate', label: 'Ties adequate and secure' },
            { name: 'tie_spacing_compliant', label: 'Tie spacing compliant (26\' horizontal, 30\' vertical)' }
          ]} formData={formData} handleChange={handleChange} />

          {/* Overhead Protection */}
          <InspectionSection title="Overhead Protection" items={[
            { name: 'overhead_protection_required', label: 'Overhead protection required?' },
            { name: 'overhead_protection_adequate', label: 'Overhead protection adequate if required' }
          ]} formData={formData} handleChange={handleChange} />

          {/* Platforms */}
          <InspectionSection title="Platforms" items={[
            { name: 'platforms_level', label: 'Platforms level' },
            { name: 'platform_width_adequate', label: 'Platform width adequate (min 18")' },
            { name: 'platforms_fully_planked', label: 'Platforms fully planked' }
          ]} formData={formData} handleChange={handleChange} />

          {/* Safety */}
          <InspectionSection title="Safety" items={[
            { name: 'fall_protection_required', label: 'Fall protection required (>10 ft)' },
            { name: 'fall_protection_available', label: 'Fall protection available if required' },
            { name: 'tag_system_in_place', label: 'Tag system in place' },
            { name: 'warning_signs_posted', label: 'Warning signs posted if needed' }
          ]} formData={formData} handleChange={handleChange} />

          {/* Load & Use */}
          <InspectionSection title="Load & Use" items={[
            { name: 'scaffold_tagged', label: 'Scaffold properly tagged' },
            { name: 'load_capacity_posted', label: 'Load capacity posted' },
            { name: 'no_overloading', label: 'No overloading' },
            { name: 'material_properly_stored', label: 'Material properly stored on platform' }
          ]} formData={formData} handleChange={handleChange} />

          {/* Weather */}
          <InspectionSection title="Weather & Environment" items={[
            { name: 'debris_removed', label: 'Debris removed from platforms' },
            { name: 'ice_snow_removed', label: 'Ice/snow removed' },
            { name: 'weather_conditions_safe', label: 'Weather conditions safe for use' }
          ]} formData={formData} handleChange={handleChange} />

          {/* General */}
          <InspectionSection title="General Condition" items={[
            { name: 'no_modifications_unauthorized', label: 'No unauthorized modifications' },
            { name: 'scaffold_complete', label: 'Scaffold complete and ready for use' },
            { name: 'competent_person_inspected', label: 'Competent person inspected' }
          ]} formData={formData} handleChange={handleChange} />

          {/* Additional */}
          <InspectionSection title="Additional Items" items={[
            { name: 'outriggers_used', label: 'Outriggers used if required' },
            { name: 'outriggers_level', label: 'Outriggers level and secure' },
            { name: 'casters_locked', label: 'Casters locked (mobile scaffolds)' },
            { name: 'scaffold_inside_power_lines', label: 'Scaffold inside power line clearance' },
            { name: 'electrical_hazards_present', label: 'Electrical hazards present' },
            { name: 'scaffold_accessible_by_public', label: 'Scaffold accessible by public' }
          ]} formData={formData} handleChange={handleChange} />

          {/* Inspection Result */}
          <div style={{ marginTop: '30px', padding: '20px', background: result.color, color: 'white', borderRadius: '8px', textAlign: 'center' }}>
            <h2 style={{ fontSize: '24px', marginBottom: '5px' }}>INSPECTION RESULT: {result.text}</h2>
            <p style={{ fontSize: '14px', opacity: 0.9 }}>Based on checklist responses</p>
          </div>

          {/* Defects Section - only show if defects found */}
          {hasDefects && (
            <div style={{ marginTop: '30px', padding: '20px', background: '#fef2f2', borderRadius: '8px', border: '2px solid #dc2626' }}>
              <h3 style={{ color: '#dc2626', marginBottom: '15px' }}>⚠️ DEFECTS FOUND - ACTION REQUIRED</h3>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Defects/Issues Found *</label>
                <textarea name="defects_found" value={formData.defects_found} onChange={handleChange} rows="4" style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Corrective Action Taken *</label>
                <textarea name="corrective_action" value={formData.corrective_action} onChange={handleChange} rows="4" style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
              </div>
            </div>
          )}

          {/* Additional Notes */}
          <div style={{ marginTop: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Additional Notes</label>
            <textarea name="additional_notes" value={formData.additional_notes} onChange={handleChange} rows="3" style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
          </div>

          {/* Submit Button */}
          <button type="submit" disabled={isSubmitting} style={{ 
            width: '100%',
            marginTop: '30px',
            padding: '15px',
            background: isSubmitting ? '#9ca3af' : '#1e3a8a',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: isSubmitting ? 'not-allowed' : 'pointer'
          }}>
            {isSubmitting ? 'Submitting...' : 'Submit Inspection'}
          </button>

          {status && (
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
    </div>
  )
}

function InspectionSection({ title, items, formData, handleChange }) {
  return (
    <div style={{ marginBottom: '25px' }}>
      <h3 style={{ color: '#1e3a8a', fontSize: '16px', marginBottom: '12px', borderBottom: '1px solid #e5e7eb', paddingBottom: '6px' }}>{title}</h3>
      <div style={{ background: '#f9fafb', padding: '15px', borderRadius: '6px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #d1d5db' }}>
              <th style={{ textAlign: 'left', padding: '8px', fontSize: '13px', fontWeight: '600' }}>Item</th>
              <th style={{ textAlign: 'center', padding: '8px', fontSize: '13px', fontWeight: '600', width: '80px' }}>OK</th>
              <th style={{ textAlign: 'center', padding: '8px', fontSize: '13px', fontWeight: '600', width: '100px' }}>Deficient</th>
              <th style={{ textAlign: 'center', padding: '8px', fontSize: '13px', fontWeight: '600', width: '80px' }}>N/A</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.name} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '10px 8px', fontSize: '14px' }}>{item.label}</td>
                <td style={{ textAlign: 'center', padding: '10px 8px' }}>
                  <input type="radio" name={item.name} value="ok" checked={formData[item.name] === 'ok'} onChange={handleChange} />
                </td>
                <td style={{ textAlign: 'center', padding: '10px 8px' }}>
                  <input type="radio" name={item.name} value="deficient" checked={formData[item.name] === 'deficient'} onChange={handleChange} />
                </td>
                <td style={{ textAlign: 'center', padding: '10px 8px' }}>
                  <input type="radio" name={item.name} value="na" checked={formData[item.name] === 'na'} onChange={handleChange} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

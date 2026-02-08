'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://iypezirwdlqpptjpeeyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
)

const COMPANIES = ['A-C Electric','AKE-Line','Apache Corp.','Armstrong Oil & Gas','ASRC Energy Services','CCI- Industrial','Chosen Construction','CINGSA','Coho Enterprises','Conam Construction','ConocoPhillips','Five Star Oilfield Services','Fox Energy Services','G.A. West','GBR Equipment','GLM Energy Services','Graham Industrial Coatings','Harvest Midstream','Hilcorp Alaska','MagTec Alaska','Merkes Builders','Nordic-Calista','Parker TRS','Peninsula Paving','Pollard Wireline','Ridgeline Oilfield Services','Santos','Summit Excavation','Tesoro Refinery','Yellowjacket','Other']

const LOCATIONS = ['Kenai','CIO','Beaver Creek','Swanson River','Ninilchik','Nikiski','Other Kenai Asset','Deadhorse','Prudhoe Bay','Kuparuk','Alpine','Willow','ENI','PIKKA','Point Thompson','North Star Island','Endicott','Badami','Other North Slope']

const ENERGY_TYPES = [
  { value: 'Gravity', icon: '⬇️', label: 'Gravity', description: 'Falls, drops' },
  { value: 'Motion', icon: '🚗', label: 'Motion', description: 'Vehicles, equipment' },
  { value: 'Mechanical', icon: '⚙️', label: 'Mechanical', description: 'Rotating, pinch' },
  { value: 'Electrical', icon: '⚡', label: 'Electrical', description: 'Shock, arc flash' },
  { value: 'Pressure', icon: '💨', label: 'Pressure', description: 'Hydraulic, gas' },
  { value: 'Chemical', icon: '☠️', label: 'Chemical', description: 'Toxic, corrosive' },
  { value: 'Temperature', icon: '🔥', label: 'Temperature', description: 'Burns, cold' },
  { value: 'Stored', icon: '🔋', label: 'Stored', description: 'Springs, capacitors' }
]

const CONTROL_TYPES = [
  { value: 'Elimination', icon: '🚫' },
  { value: 'Substitution', icon: '🔄' },
  { value: 'Engineering', icon: '🔧' },
  { value: 'Guarding', icon: '🚧' },
  { value: 'LOTO', icon: '🔒' },
  { value: 'Warnings', icon: '⚠️' },
  { value: 'Procedures', icon: '📋' },
  { value: 'PPE', icon: '🦺' }
]

export default function RiskControlConversation() {
  const [formData, setFormData] = useState({
    observer_name: '',
    date: '',
    client_company: '',
    location: '',
    work_group: '',
    job_task: '',
    energy_types: [],
    control_types: [],
    sif_potential: '',
    question1: '',
    question2: '',
    question3: '',
    question4: '',
    question5: '',
    observer_notes: ''
  })
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

  const toggleEnergy = (value) => {
    setFormData(prev => {
      const current = prev.energy_types
      if (current.includes(value)) {
        return { ...prev, energy_types: current.filter(v => v !== value) }
      } else {
        return { ...prev, energy_types: [...current, value] }
      }
    })
  }

  const toggleControl = (value) => {
    setFormData(prev => {
      const current = prev.control_types
      if (current.includes(value)) {
        return { ...prev, control_types: current.filter(v => v !== value) }
      } else {
        return { ...prev, control_types: [...current, value] }
      }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus(null)

    try {
      const { error } = await supabase
        .from('risk_control_conversation')
        .insert([{
          ...formData,
          energy_types: formData.energy_types.join(', '),
          control_types: formData.control_types.join(', '),
          created_at: new Date().toISOString()
        }])

      if (error) throw error

      setSubmitStatus('success')
      setFormData({
        observer_name: '',
        date: new Date().toISOString().split('T')[0],
        client_company: '',
        location: '',
        work_group: '',
        job_task: '',
        energy_types: [],
        control_types: [],
        sif_potential: '',
        question1: '',
        question2: '',
        question3: '',
        question4: '',
        question5: '',
        observer_notes: ''
      })

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
            <div style={{ fontSize: '4rem', marginBottom: '15px' }}>✅</div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Conversation Submitted Successfully!</h2>
            <p>Your risk control conversation has been recorded.</p>
            <button
              onClick={resetForm}
              style={{ marginTop: '20px', padding: '12px 24px', background: 'white', color: '#059669', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: '600', cursor: 'pointer' }}
            >
              Start Another Conversation
            </button>
          </div>
        </div>
      </div>
    )
  }

  const inputStyle = { width: '100%', padding: '12px 14px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '1rem', background: 'white' }
  const labelStyle = { display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151', fontSize: '0.9rem' }
  const sectionStyle = { marginBottom: '30px', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }
  const sectionBodyStyle = { padding: '20px', background: '#f8fafc' }
  const formRowStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '20px' }

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
          <div style={{ display: 'inline-block', background: 'white', color: '#1e3a8a', padding: '6px 16px', borderRadius: '20px', fontWeight: '700', fontSize: '0.85rem', marginBottom: '15px', border: '3px solid #7c3aed', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
            💬 RISK CONTROL CONVERSATION
          </div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '8px', textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>Risk Control Conversation</h1>
          <p style={{ opacity: 0.95, fontSize: '1rem' }}>SLP Alaska Safety Management System</p>
        </div>

        {/* Form Content */}
        <div style={{ padding: '30px' }}>
          
          {/* Info Box */}
          <div style={{ background: '#eff6ff', border: '2px solid #3b82f6', borderRadius: '8px', padding: '15px', marginBottom: '20px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <span style={{ fontSize: '1.5rem' }}>💡</span>
            <p style={{ margin: 0, color: '#1e40af', fontSize: '0.95rem' }}>Use this form to document risk control conversations with workers. These discussions help identify hazards and ensure controls are adequate before work begins.</p>
          </div>

          <form onSubmit={handleSubmit}>

            {/* Basic Information */}
            <div style={sectionStyle}>
              <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)', color: 'white', padding: '12px 20px', fontWeight: '600', fontSize: '1rem' }}>
                📋 Basic Information
              </div>
              <div style={sectionBodyStyle}>
                <div style={formRowStyle}>
                  <div>
                    <label style={labelStyle}>Observer Name <span style={{ color: '#b91c1c' }}>*</span></label>
                    <input type="text" name="observer_name" value={formData.observer_name} onChange={handleChange} required style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Date <span style={{ color: '#b91c1c' }}>*</span></label>
                    <input type="date" name="date" value={formData.date} onChange={handleChange} required style={inputStyle} />
                  </div>
                </div>
                <div style={formRowStyle}>
                  <div>
                    <label style={labelStyle}>Client/Company <span style={{ color: '#b91c1c' }}>*</span></label>
                    <select name="client_company" value={formData.client_company} onChange={handleChange} required style={inputStyle}>
                      <option value="">Select Company...</option>
                      {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Location <span style={{ color: '#b91c1c' }}>*</span></label>
                    <select name="location" value={formData.location} onChange={handleChange} required style={inputStyle}>
                      <option value="">Select Location...</option>
                      {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ ...formRowStyle, marginBottom: 0 }}>
                  <div>
                    <label style={labelStyle}>Work Group <span style={{ color: '#b91c1c' }}>*</span></label>
                    <input type="text" name="work_group" value={formData.work_group} onChange={handleChange} required placeholder="e.g., Pump Crew, Welding Team" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Job/Task <span style={{ color: '#b91c1c' }}>*</span></label>
                    <input type="text" name="job_task" value={formData.job_task} onChange={handleChange} required placeholder="e.g., Pipeline repair, Equipment inspection" style={inputStyle} />
                  </div>
                </div>
              </div>
            </div>

            {/* Hazardous Energy Identification */}
            <div style={sectionStyle}>
              <div style={{ background: 'linear-gradient(135deg, #b91c1c 0%, #dc2626 100%)', color: 'white', padding: '12px 20px', fontWeight: '600', fontSize: '1rem' }}>
                ⚡ Hazardous Energy Identification
              </div>
              <div style={sectionBodyStyle}>
                
                {/* Energy Wheel Section */}
                <div style={{ background: 'linear-gradient(135deg, #fef2f2 0%, #fff7ed 100%)', border: '2px solid #dc2626', borderRadius: '12px', padding: '20px', marginBottom: '15px' }}>
                  <div style={{ color: '#991b1b', fontWeight: 'bold', fontSize: '1rem', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    ⚡ What energy sources are present in this task?
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '15px' }}>
                    Select all energy types that workers could be exposed to during this task.
                  </div>
                  
                  {/* Energy Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px', marginBottom: '15px' }}>
                    {ENERGY_TYPES.map(energy => (
                      <div
                        key={energy.value}
                        onClick={() => toggleEnergy(energy.value)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '12px',
                          background: formData.energy_types.includes(energy.value) ? '#fecaca' : 'white',
                          border: `2px solid ${formData.energy_types.includes(energy.value) ? '#dc2626' : '#e5e7eb'}`,
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        <span style={{ fontSize: '1.25rem' }}>{energy.icon}</span>
                        <div style={{ flex: 1, fontSize: '0.8rem', fontWeight: '500', lineHeight: 1.3 }}>
                          {energy.label}<br/>
                          <small style={{ color: '#666', fontWeight: '400' }}>{energy.description}</small>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Control Types Section */}
                  <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #fecaca' }}>
                    <div style={{ color: '#065f46', fontWeight: 'bold', fontSize: '1rem', marginBottom: '10px' }}>
                      🛡️ What controls are in place for these energies?
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '15px' }}>
                      Select the types of controls being used.
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px' }}>
                      {CONTROL_TYPES.map(control => (
                        <div
                          key={control.value}
                          onClick={() => toggleControl(control.value)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px',
                            background: formData.control_types.includes(control.value) ? '#d1fae5' : 'white',
                            border: `2px solid ${formData.control_types.includes(control.value) ? '#22c55e' : '#e5e7eb'}`,
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            transition: 'all 0.2s'
                          }}
                        >
                          <span>{control.icon}</span>
                          <span>{control.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Energy Summary */}
                  {(formData.energy_types.length > 0 || formData.control_types.length > 0) && (
                    <div style={{ marginTop: '15px', padding: '12px', background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '8px', color: '#991b1b' }}>
                        📊 Energy & Controls Summary
                      </div>
                      <div style={{ marginBottom: '8px' }}><strong>Energy Sources:</strong></div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                        {formData.energy_types.length > 0 
                          ? formData.energy_types.map(e => (
                              <span key={e} style={{ background: '#dc2626', color: 'white', padding: '4px 10px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: '500' }}>
                                ⚡ {e}
                              </span>
                            ))
                          : <span style={{ color: '#666', fontSize: '0.75rem' }}>None selected</span>
                        }
                      </div>
                      <div style={{ marginBottom: '8px' }}><strong>Controls in Place:</strong></div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {formData.control_types.length > 0 
                          ? formData.control_types.map(c => (
                              <span key={c} style={{ background: '#22c55e', color: 'white', padding: '4px 10px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: '500' }}>
                                🛡️ {c}
                              </span>
                            ))
                          : <span style={{ color: '#666', fontSize: '0.75rem' }}>None selected</span>
                        }
                      </div>
                    </div>
                  )}
                </div>

                {/* SIF Potential Section */}
                <div style={{ background: 'linear-gradient(135deg, #fef2f2 0%, #fce7f3 100%)', border: '2px solid #dc2626', borderRadius: '12px', padding: '20px' }}>
                  <div style={{ color: '#991b1b', fontWeight: 'bold', fontSize: '1rem', marginBottom: '10px' }}>
                    ⚠️ Serious Injury/Fatality Potential
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '15px' }}>
                    Could this task result in a serious injury or fatality if controls fail or an error occurs?
                  </div>
                  
                  <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                    <label style={{ flex: 1, minWidth: '120px' }}>
                      <input
                        type="radio"
                        name="sif_potential"
                        value="Yes"
                        checked={formData.sif_potential === 'Yes'}
                        onChange={handleChange}
                        style={{ display: 'none' }}
                      />
                      <div style={{
                        display: 'block',
                        padding: '15px 20px',
                        textAlign: 'center',
                        border: `2px solid ${formData.sif_potential === 'Yes' ? '#dc2626' : '#d1d5db'}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '0.9rem',
                        background: formData.sif_potential === 'Yes' ? '#dc2626' : 'white',
                        color: formData.sif_potential === 'Yes' ? 'white' : '#374151'
                      }}>
                        ⚠️ Yes - SIF Potential
                      </div>
                    </label>
                    <label style={{ flex: 1, minWidth: '120px' }}>
                      <input
                        type="radio"
                        name="sif_potential"
                        value="No"
                        checked={formData.sif_potential === 'No'}
                        onChange={handleChange}
                        style={{ display: 'none' }}
                      />
                      <div style={{
                        display: 'block',
                        padding: '15px 20px',
                        textAlign: 'center',
                        border: `2px solid ${formData.sif_potential === 'No' ? '#22c55e' : '#d1d5db'}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '0.9rem',
                        background: formData.sif_potential === 'No' ? '#22c55e' : 'white',
                        color: formData.sif_potential === 'No' ? 'white' : '#374151'
                      }}>
                        ✅ No - Lower Risk
                      </div>
                    </label>
                  </div>

                  {formData.sif_potential && (
                    <div style={{ marginTop: '15px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        fontWeight: 'bold',
                        fontSize: '0.85rem',
                        background: formData.sif_potential === 'Yes' ? '#dc2626' : '#22c55e',
                        color: 'white'
                      }}>
                        {formData.sif_potential === 'Yes' ? '⚠️ SIF POTENTIAL IDENTIFIED' : '✅ Lower Risk Task'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Risk Control Questions */}
            <div style={sectionStyle}>
              <div style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', color: 'white', padding: '12px 20px', fontWeight: '600', fontSize: '1rem' }}>
                🎯 Risk Control Questions
              </div>
              <div style={sectionBodyStyle}>
                {[
                  { num: 1, label: 'What could go wrong with this task?', placeholder: 'Identify potential hazards, risks, or things that could go wrong...' },
                  { num: 2, label: 'How likely is it to happen?', placeholder: 'Assess the probability - rarely, occasionally, frequently...' },
                  { num: 3, label: 'What are the potential consequences?', placeholder: 'Describe the severity of potential outcomes - minor injury, serious injury, fatality, property damage...' },
                  { num: 4, label: 'What controls are currently in place?', placeholder: 'List existing safeguards - PPE, procedures, barriers, training, permits...' },
                  { num: 5, label: 'Are the controls adequate? If not, what else is needed?', placeholder: 'Evaluate if current controls are sufficient. If not, recommend additional measures...' }
                ].map(q => (
                  <div key={q.num} style={{ background: 'white', border: '2px solid #e5e7eb', borderRadius: '10px', padding: '20px', marginBottom: '15px' }}>
                    <div style={{ fontWeight: '600', color: '#374151', marginBottom: '10px', display: 'flex', alignItems: 'center' }}>
                      <span style={{ display: 'inline-block', background: '#1e3a8a', color: 'white', width: '28px', height: '28px', borderRadius: '50%', textAlign: 'center', lineHeight: '28px', fontWeight: '700', fontSize: '0.9rem', marginRight: '10px' }}>
                        {q.num}
                      </span>
                      {q.label}
                    </div>
                    <textarea
                      name={`question${q.num}`}
                      value={formData[`question${q.num}`]}
                      onChange={handleChange}
                      placeholder={q.placeholder}
                      style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Observer Notes */}
            <div style={sectionStyle}>
              <div style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', color: 'white', padding: '12px 20px', fontWeight: '600', fontSize: '1rem' }}>
                📝 Observer Notes
              </div>
              <div style={sectionBodyStyle}>
                <label style={labelStyle}>Additional Observations or Comments</label>
                <textarea
                  name="observer_notes"
                  value={formData.observer_notes}
                  onChange={handleChange}
                  placeholder="Record any additional observations, concerns, commendations, or follow-up items..."
                  style={{ ...inputStyle, minHeight: '120px', resize: 'vertical' }}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '16px 32px',
                background: isSubmitting ? '#9ca3af' : 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '1.1rem',
                fontWeight: '600',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                boxShadow: isSubmitting ? 'none' : '0 4px 15px rgba(30, 58, 138, 0.3)'
              }}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Risk Control Conversation'}
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
          <span style={{ color: '#1e3a5f', fontWeight: '500' }}>AnthroSafe™ Field Driven Safety</span>
          <span style={{ color: '#94a3b8', margin: '0 8px' }}>|</span>
          <span style={{ color: '#475569' }}>© 2026 SLP Alaska, LLC</span>
        </div>

      </div>
    </div>
  )
}

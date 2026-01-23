'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://iypezirwdlqpptjpeeyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
)

const COMPANIES = ['A-C Electric','AKE-Line','Apache Corp.','Armstrong Oil & Gas','ASRC Energy Services','CCI- Industrial','Chosen Construction','CINGSA','Coho Enterprises','Conam Construction','ConocoPhillips','Five Star Oilfield Services','Fox Energy Services','G.A. West','GBR Equipment','GLM Energy Services','Graham Industrial Coatings','Harvest Midstream','Hilcorp Alaska','MagTec Alaska','Merkes Builders','Nordic-Calista','Parker TRS','Peninsula Paving','Pollard Wireline','Ridgeline Oilfield Services','Santos','Summit Excavation','Tesoro Refinery','Yellowjacket','Other']

const LOCATIONS = ['Kenai','CIO','Beaver Creek','Swanson River','Ninilchik','Nikiski','Other Kenai Asset','Deadhorse','Prudhoe Bay','Kuparuk','Alpine','Willow','ENI','PIKKA','Point Thompson','North Star Island','Endicott','Badami','Other North Slope']

export default function MBWAForm() {
  const [formData, setFormData] = useState({
    company: '',
    submitter_name: '',
    date: '',
    location: '',
    person_observed: '',
    doing_today: '',
    getting_it_done_safely: '',
    feel_about_stopping: '',
    set_example: '',
    comfortable_bringing_issues: '',
    increase_safety_performance: '',
    senior_management_opinion: '',
    emergency_action: '',
    simops_going_on: '',
    simops_interact: '',
    incident_free_possible: '',
    roadblocks: '',
    contribute_to_safety: '',
    support_from_clients: '',
    bbs_frequency: '',
    hazard_id_frequency: '',
    good_catch_frequency: '',
    weekly_commitment: '',
    enjoy_most: '',
    career_goals: '',
    safety_expectations: '',
    one_thing_change: ''
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

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setPhoto(file)
      setPhotoPreview(file.name)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus(null)

    try {
      let photoUrl = null

      if (photo) {
        const fileExt = photo.name.split('.').pop()
        const fileName = `mbwa-photos/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
        
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
        .from('mbwa')
        .insert([{
          ...formData,
          photo_url: photoUrl,
          created_at: new Date().toISOString()
        }])

      if (error) throw error

      setSubmitStatus('success')
      setFormData({
        company: '',
        submitter_name: '',
        date: new Date().toISOString().split('T')[0],
        location: '',
        person_observed: '',
        doing_today: '',
        getting_it_done_safely: '',
        feel_about_stopping: '',
        set_example: '',
        comfortable_bringing_issues: '',
        increase_safety_performance: '',
        senior_management_opinion: '',
        emergency_action: '',
        simops_going_on: '',
        simops_interact: '',
        incident_free_possible: '',
        roadblocks: '',
        contribute_to_safety: '',
        support_from_clients: '',
        bbs_frequency: '',
        hazard_id_frequency: '',
        good_catch_frequency: '',
        weekly_commitment: '',
        enjoy_most: '',
        career_goals: '',
        safety_expectations: '',
        one_thing_change: ''
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
            <h2 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>MBWA Submitted Successfully!</h2>
            <p>Thank you for the engagement.</p>
            <button
              onClick={resetForm}
              style={{ marginTop: '20px', padding: '12px 24px', background: 'white', color: '#059669', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: '600', cursor: 'pointer' }}
            >
              Submit Another MBWA
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1e3a8a 0%, #b91c1c 100%)', padding: '20px', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', background: 'white', borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
        
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #b91c1c 100%)', color: 'white', padding: '30px', textAlign: 'center' }}>
          <a href="/" style={{ display: 'inline-block', marginBottom: '20px', color: 'white', textDecoration: 'none', fontSize: '0.95rem' }}>
            ← Back to Portal
          </a>
          <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: '12px', padding: '15px', display: 'inline-block', margin: '0 auto 20px auto', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
            <img src="/Logo.png" alt="SLP Alaska" style={{ maxWidth: '200px', height: 'auto', display: 'block', margin: '0 auto' }} />
          </div>
          <div style={{ display: 'inline-block', background: 'white', color: '#1e3a8a', padding: '6px 16px', borderRadius: '20px', fontWeight: '700', fontSize: '0.85rem', marginBottom: '15px', border: '3px solid #b91c1c', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
            MANAGEMENT BY WALK AROUND
          </div>
          <h1 style={{ fontSize: '1.8rem', marginBottom: '8px', textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>MBWA</h1>
          <p style={{ opacity: 0.95, fontSize: '1rem' }}>SLP Alaska Safety Management System</p>
        </div>

        {/* Form Content */}
        <div style={{ padding: '30px' }}>
          <form onSubmit={handleSubmit}>

            {/* Basic Information */}
            <div style={{ marginBottom: '30px', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)', color: 'white', padding: '12px 20px', fontWeight: '600', fontSize: '1rem' }}>
                Basic Information
              </div>
              <div style={{ padding: '20px', background: '#fafafa' }}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1f2937', fontSize: '0.95rem' }}>
                    Company <span style={{ color: '#b91c1c' }}>*</span>
                  </label>
                  <select name="company" value={formData.company} onChange={handleChange} required style={{ width: '100%', padding: '12px 16px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '1rem', background: 'white', cursor: 'pointer' }}>
                    <option value="">-- Select Company --</option>
                    {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1f2937', fontSize: '0.95rem' }}>
                    Name of Submitter <span style={{ color: '#b91c1c' }}>*</span>
                  </label>
                  <input type="text" name="submitter_name" value={formData.submitter_name} onChange={handleChange} required placeholder="Your full name" style={{ width: '100%', padding: '12px 16px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '1rem', background: 'white' }} />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1f2937', fontSize: '0.95rem' }}>
                    Date <span style={{ color: '#b91c1c' }}>*</span>
                  </label>
                  <input type="date" name="date" value={formData.date} onChange={handleChange} required style={{ width: '100%', padding: '12px 16px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '1rem', background: 'white' }} />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1f2937', fontSize: '0.95rem' }}>
                    Location <span style={{ color: '#b91c1c' }}>*</span>
                  </label>
                  <select name="location" value={formData.location} onChange={handleChange} required style={{ width: '100%', padding: '12px 16px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '1rem', background: 'white', cursor: 'pointer' }}>
                    <option value="">-- Select Location --</option>
                    {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1f2937', fontSize: '0.95rem' }}>
                    Person Observed <span style={{ color: '#b91c1c' }}>*</span>
                  </label>
                  <input type="text" name="person_observed" value={formData.person_observed} onChange={handleChange} required placeholder="Name of person you spoke with" style={{ width: '100%', padding: '12px 16px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '1rem', background: 'white' }} />
                </div>
              </div>
            </div>

            {/* Daily Work & Safety */}
            <div style={{ marginBottom: '30px', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ background: 'linear-gradient(135deg, #b91c1c 0%, #991b1b 100%)', color: 'white', padding: '12px 20px', fontWeight: '600', fontSize: '1rem' }}>
                Daily Work & Safety
              </div>
              <div style={{ padding: '20px', background: '#fafafa' }}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1f2937', fontSize: '0.95rem' }}>
                    What are you doing today? <span style={{ color: '#b91c1c' }}>*</span>
                  </label>
                  <textarea name="doing_today" value={formData.doing_today} onChange={handleChange} required placeholder="Describe their current tasks..." style={{ width: '100%', padding: '12px 16px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '1rem', background: 'white', minHeight: '80px', resize: 'vertical' }} />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1f2937', fontSize: '0.95rem' }}>
                    How are you getting it done safely? <span style={{ color: '#b91c1c' }}>*</span>
                  </label>
                  <textarea name="getting_it_done_safely" value={formData.getting_it_done_safely} onChange={handleChange} required placeholder="Their approach to safety..." style={{ width: '100%', padding: '12px 16px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '1rem', background: 'white', minHeight: '80px', resize: 'vertical' }} />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1f2937', fontSize: '0.95rem' }}>
                    How do you feel about stopping the job? <span style={{ color: '#b91c1c' }}>*</span>
                  </label>
                  <textarea name="feel_about_stopping" value={formData.feel_about_stopping} onChange={handleChange} required placeholder="Their comfort level with stop work authority..." style={{ width: '100%', padding: '12px 16px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '1rem', background: 'white', minHeight: '80px', resize: 'vertical' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1f2937', fontSize: '0.95rem' }}>
                    How do you set the example for co-workers? <span style={{ color: '#b91c1c' }}>*</span>
                  </label>
                  <textarea name="set_example" value={formData.set_example} onChange={handleChange} required placeholder="How they lead by example..." style={{ width: '100%', padding: '12px 16px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '1rem', background: 'white', minHeight: '80px', resize: 'vertical' }} />
                </div>
              </div>
            </div>

            {/* Communication & Management */}
            <div style={{ marginBottom: '30px', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)', color: 'white', padding: '12px 20px', fontWeight: '600', fontSize: '1rem' }}>
                Communication & Management
              </div>
              <div style={{ padding: '20px', background: '#fafafa' }}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1f2937', fontSize: '0.95rem' }}>
                    Comfortable bringing issues to management? <span style={{ color: '#b91c1c' }}>*</span>
                  </label>
                  <textarea name="comfortable_bringing_issues" value={formData.comfortable_bringing_issues} onChange={handleChange} required placeholder="Their comfort level with management communication..." style={{ width: '100%', padding: '12px 16px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '1rem', background: 'white', minHeight: '80px', resize: 'vertical' }} />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1f2937', fontSize: '0.95rem' }}>
                    What would you do to increase safety and performance? <span style={{ color: '#b91c1c' }}>*</span>
                  </label>
                  <textarea name="increase_safety_performance" value={formData.increase_safety_performance} onChange={handleChange} required placeholder="Their suggestions for improvement..." style={{ width: '100%', padding: '12px 16px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '1rem', background: 'white', minHeight: '80px', resize: 'vertical' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1f2937', fontSize: '0.95rem' }}>
                    Opinion of senior management involvement? <span style={{ color: '#b91c1c' }}>*</span>
                  </label>
                  <textarea name="senior_management_opinion" value={formData.senior_management_opinion} onChange={handleChange} required placeholder="Their view on management engagement..." style={{ width: '100%', padding: '12px 16px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '1rem', background: 'white', minHeight: '80px', resize: 'vertical' }} />
                </div>
              </div>
            </div>

            {/* Emergency & SIMOPS */}
            <div style={{ marginBottom: '30px', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ background: 'linear-gradient(135deg, #b91c1c 0%, #991b1b 100%)', color: 'white', padding: '12px 20px', fontWeight: '600', fontSize: '1rem' }}>
                Emergency & SIMOPS
              </div>
              <div style={{ padding: '20px', background: '#fafafa' }}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1f2937', fontSize: '0.95rem' }}>
                    What's your current emergency action plan? <span style={{ color: '#b91c1c' }}>*</span>
                  </label>
                  <textarea name="emergency_action" value={formData.emergency_action} onChange={handleChange} required placeholder="Their understanding of emergency procedures..." style={{ width: '100%', padding: '12px 16px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '1rem', background: 'white', minHeight: '80px', resize: 'vertical' }} />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1f2937', fontSize: '0.95rem' }}>
                    What SIMOPS are going on? <span style={{ color: '#b91c1c' }}>*</span>
                  </label>
                  <textarea name="simops_going_on" value={formData.simops_going_on} onChange={handleChange} required placeholder="Simultaneous operations awareness..." style={{ width: '100%', padding: '12px 16px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '1rem', background: 'white', minHeight: '80px', resize: 'vertical' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1f2937', fontSize: '0.95rem' }}>
                    How do you interact with SIMOPS? <span style={{ color: '#b91c1c' }}>*</span>
                  </label>
                  <textarea name="simops_interact" value={formData.simops_interact} onChange={handleChange} required placeholder="Their coordination with other operations..." style={{ width: '100%', padding: '12px 16px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '1rem', background: 'white', minHeight: '80px', resize: 'vertical' }} />
                </div>
              </div>
            </div>

            {/* Incident Free & Contributions */}
            <div style={{ marginBottom: '30px', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)', color: 'white', padding: '12px 20px', fontWeight: '600', fontSize: '1rem' }}>
                Incident Free & Contributions
              </div>
              <div style={{ padding: '20px', background: '#fafafa' }}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1f2937', fontSize: '0.95rem' }}>
                    Is Incident Free possible? <span style={{ color: '#b91c1c' }}>*</span>
                  </label>
                  <textarea name="incident_free_possible" value={formData.incident_free_possible} onChange={handleChange} required placeholder="Their belief in incident-free operations..." style={{ width: '100%', padding: '12px 16px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '1rem', background: 'white', minHeight: '80px', resize: 'vertical' }} />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1f2937', fontSize: '0.95rem' }}>
                    What roadblocks exist? <span style={{ color: '#b91c1c' }}>*</span>
                  </label>
                  <textarea name="roadblocks" value={formData.roadblocks} onChange={handleChange} required placeholder="Barriers to safety or performance..." style={{ width: '100%', padding: '12px 16px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '1rem', background: 'white', minHeight: '80px', resize: 'vertical' }} />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1f2937', fontSize: '0.95rem' }}>
                    How do you contribute to safety? <span style={{ color: '#b91c1c' }}>*</span>
                  </label>
                  <textarea name="contribute_to_safety" value={formData.contribute_to_safety} onChange={handleChange} required placeholder="Their personal safety contributions..." style={{ width: '100%', padding: '12px 16px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '1rem', background: 'white', minHeight: '80px', resize: 'vertical' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1f2937', fontSize: '0.95rem' }}>
                    What support do you need from clients? <span style={{ color: '#b91c1c' }}>*</span>
                  </label>
                  <textarea name="support_from_clients" value={formData.support_from_clients} onChange={handleChange} required placeholder="Support needs from client companies..." style={{ width: '100%', padding: '12px 16px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '1rem', background: 'white', minHeight: '80px', resize: 'vertical' }} />
                </div>
              </div>
            </div>

            {/* Safety Engagement Frequency */}
            <div style={{ marginBottom: '30px', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ background: 'linear-gradient(135deg, #b91c1c 0%, #991b1b 100%)', color: 'white', padding: '12px 20px', fontWeight: '600', fontSize: '1rem' }}>
                Safety Engagement Frequency
              </div>
              <div style={{ padding: '20px', background: '#fafafa' }}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1f2937', fontSize: '0.95rem' }}>
                    How often do you conduct BBS Observations? <span style={{ color: '#b91c1c' }}>*</span>
                  </label>
                  <textarea name="bbs_frequency" value={formData.bbs_frequency} onChange={handleChange} required placeholder="Behavior-Based Safety observation frequency..." style={{ width: '100%', padding: '12px 16px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '1rem', background: 'white', minHeight: '80px', resize: 'vertical' }} />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1f2937', fontSize: '0.95rem' }}>
                    How often do you submit Hazard IDs? <span style={{ color: '#b91c1c' }}>*</span>
                  </label>
                  <textarea name="hazard_id_frequency" value={formData.hazard_id_frequency} onChange={handleChange} required placeholder="Hazard identification submission frequency..." style={{ width: '100%', padding: '12px 16px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '1rem', background: 'white', minHeight: '80px', resize: 'vertical' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1f2937', fontSize: '0.95rem' }}>
                    How often do you submit Good Catch/Near Misses? <span style={{ color: '#b91c1c' }}>*</span>
                  </label>
                  <textarea name="good_catch_frequency" value={formData.good_catch_frequency} onChange={handleChange} required placeholder="Good catch and near miss reporting frequency..." style={{ width: '100%', padding: '12px 16px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '1rem', background: 'white', minHeight: '80px', resize: 'vertical' }} />
                </div>
              </div>
            </div>

            {/* Commitments & Career */}
            <div style={{ marginBottom: '30px', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)', color: 'white', padding: '12px 20px', fontWeight: '600', fontSize: '1rem' }}>
                Commitments & Career
              </div>
              <div style={{ padding: '20px', background: '#fafafa' }}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1f2937', fontSize: '0.95rem' }}>
                    One thing you'll commit to this week for safety? <span style={{ color: '#b91c1c' }}>*</span>
                  </label>
                  <textarea name="weekly_commitment" value={formData.weekly_commitment} onChange={handleChange} required placeholder="Their weekly safety commitment..." style={{ width: '100%', padding: '12px 16px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '1rem', background: 'white', minHeight: '80px', resize: 'vertical' }} />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1f2937', fontSize: '0.95rem' }}>
                    What do you enjoy most about your job? <span style={{ color: '#b91c1c' }}>*</span>
                  </label>
                  <textarea name="enjoy_most" value={formData.enjoy_most} onChange={handleChange} required placeholder="What they find rewarding..." style={{ width: '100%', padding: '12px 16px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '1rem', background: 'white', minHeight: '80px', resize: 'vertical' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1f2937', fontSize: '0.95rem' }}>
                    What do you want to do in your career? <span style={{ color: '#b91c1c' }}>*</span>
                  </label>
                  <textarea name="career_goals" value={formData.career_goals} onChange={handleChange} required placeholder="Their career aspirations..." style={{ width: '100%', padding: '12px 16px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '1rem', background: 'white', minHeight: '80px', resize: 'vertical' }} />
                </div>
              </div>
            </div>

            {/* Expectations & Feedback */}
            <div style={{ marginBottom: '30px', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ background: 'linear-gradient(135deg, #b91c1c 0%, #991b1b 100%)', color: 'white', padding: '12px 20px', fontWeight: '600', fontSize: '1rem' }}>
                Expectations & Feedback
              </div>
              <div style={{ padding: '20px', background: '#fafafa' }}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1f2937', fontSize: '0.95rem' }}>
                    What are my safety expectations of you and your group? <span style={{ color: '#b91c1c' }}>*</span>
                  </label>
                  <textarea name="safety_expectations" value={formData.safety_expectations} onChange={handleChange} required placeholder="Their understanding of safety expectations..." style={{ width: '100%', padding: '12px 16px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '1rem', background: 'white', minHeight: '80px', resize: 'vertical' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1f2937', fontSize: '0.95rem' }}>
                    One thing you'd change about this company and why? <span style={{ color: '#b91c1c' }}>*</span>
                  </label>
                  <textarea name="one_thing_change" value={formData.one_thing_change} onChange={handleChange} required placeholder="Their suggestion for company improvement..." style={{ width: '100%', padding: '12px 16px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '1rem', background: 'white', minHeight: '80px', resize: 'vertical' }} />
                </div>
              </div>
            </div>

            {/* Photo Upload */}
            <div style={{ marginBottom: '30px', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)', color: 'white', padding: '12px 20px', fontWeight: '600', fontSize: '1rem' }}>
                Photo Documentation
              </div>
              <div style={{ padding: '20px', background: '#fafafa' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1f2937', fontSize: '0.95rem' }}>
                  Upload Photo (optional)
                </label>
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
              {isSubmitting ? 'Submitting...' : 'Submit MBWA'}
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

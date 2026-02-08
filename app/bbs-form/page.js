'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import AddToSailLog from '@/components/AddToSailLog'

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

const CATEGORIES = [
  { value: 'PPE', label: 'PPE (Personal Protective Equipment)' },
  { value: 'Body Position', label: 'Body Position / Ergonomics' },
  { value: 'Tools & Equipment', label: 'Tools & Equipment' },
  { value: 'Procedures', label: 'Procedures / Work Practices' },
  { value: 'Housekeeping', label: 'Housekeeping' },
  { value: 'Communication', label: 'Communication' },
  { value: 'Line of Fire', label: 'Line of Fire' },
  { value: 'Energy Isolation', label: 'Energy Isolation / LOTO' },
  { value: 'Lifting & Rigging', label: 'Lifting & Rigging' },
  { value: 'Driving & Vehicles', label: 'Driving & Vehicles' },
  { value: 'Environmental', label: 'Environmental' },
  { value: 'Other', label: 'Other' },
]

export default function BBSObservationForm() {
  const [formData, setFormData] = useState({
    clientCompany: '',
    submitterName: '',
    date: new Date().toISOString().split('T')[0],
    location: '',
    project: '',
    observationType: '',
    observationCategory: '',
    jobStopRequired: '',
    nearMiss: '',
    potentialEquipmentDamage: '',
    stkyEvent: '',
    whatDidYouSee: '',
    whatDidYouTalkAbout: '',
    actionTaken: '',
    observedAgree: ''
  })
  
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submittedData, setSubmittedData] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const { error } = await supabase.from('bbs_observations').insert([{
        client_company: formData.clientCompany,
        submitter_name: formData.submitterName,
        observation_date: formData.date,
        location: formData.location,
        project: formData.project || null,
        observation_type: formData.observationType,
        observation_category: formData.observationCategory,
        job_stop_required: formData.jobStopRequired === 'Yes',
        near_miss: formData.nearMiss === 'Yes',
        potential_equipment_damage: formData.potentialEquipmentDamage === 'Yes',
        stky_event: formData.stkyEvent === 'Yes',
        what_did_you_see: formData.whatDidYouSee,
        what_did_you_talk_about: formData.whatDidYouTalkAbout || null,
        action_taken: formData.actionTaken || null,
        observed_agree: formData.observedAgree
      }])

      if (error) throw error

      // Store submitted data for SAIL Log prefill
      setSubmittedData({...formData})
      setSubmitted(true)
    } catch (error) {
      console.error('Error:', error)
      alert('Error submitting form: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      clientCompany: '',
      submitterName: '',
      date: new Date().toISOString().split('T')[0],
      location: '',
      project: '',
      observationType: '',
      observationCategory: '',
      jobStopRequired: '',
      nearMiss: '',
      potentialEquipmentDamage: '',
      stkyEvent: '',
      whatDidYouSee: '',
      whatDidYouTalkAbout: '',
      actionTaken: '',
      observedAgree: ''
    })
    setSubmitted(false)
    setSubmittedData(null)
  }

  // Success Screen
  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1e3a8a 0%, #991b1b 100%)', padding: '20px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', paddingTop: '50px' }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '40px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)' }}>
            <div style={{ fontSize: '60px', marginBottom: '20px' }}>✅</div>
            <h2 style={{ color: '#16a34a', marginBottom: '15px', fontSize: '24px' }}>Observation Submitted!</h2>
            <p style={{ color: '#6b7280', marginBottom: '25px' }}>BBS Observation recorded successfully. Thank you for your safety observation!</p>
            
            {/* SAIL Log Integration */}
            {submittedData && (submittedData.observationType === 'At-Risk' || submittedData.jobStopRequired === 'Yes' || submittedData.nearMiss === 'Yes' || submittedData.stkyEvent === 'Yes') && (
              <div style={{ 
                background: '#fffbeb', 
                border: '2px solid #f59e0b', 
                borderRadius: '12px', 
                padding: '20px', 
                marginBottom: '25px' 
              }}>
                <p style={{ color: '#92400e', marginBottom: '15px', fontSize: '14px' }}>
                  ⚠️ This observation may need follow-up. Add it to the SAIL Log?
                </p>
                <AddToSailLog
                  sourceForm="bbs-observation"
                  prefillData={{
                    company: submittedData.clientCompany,
                    location: submittedData.location,
                    reported_by: submittedData.submitterName,
                    issue_description: `${submittedData.observationType} Observation - ${submittedData.observationCategory}: ${submittedData.whatDidYouSee}`
                  }}
                />
              </div>
            )}

            {/* Always show SAIL Log option but less prominently for safe observations */}
            {submittedData && submittedData.observationType === 'Safe' && submittedData.jobStopRequired !== 'Yes' && submittedData.nearMiss !== 'Yes' && submittedData.stkyEvent !== 'Yes' && (
              <div style={{ 
                background: '#f0fdf4', 
                border: '1px solid #86efac', 
                borderRadius: '12px', 
                padding: '15px', 
                marginBottom: '25px' 
              }}>
                <p style={{ color: '#166534', marginBottom: '10px', fontSize: '13px' }}>
                  Need to track a follow-up item?
                </p>
                <AddToSailLog
                  sourceForm="bbs-observation"
                  prefillData={{
                    company: submittedData.clientCompany,
                    location: submittedData.location,
                    reported_by: submittedData.submitterName,
                    issue_description: `Safe Observation - ${submittedData.observationCategory}: ${submittedData.whatDidYouSee}`
                  }}
                />
              </div>
            )}
            
            <button
              onClick={resetForm}
              style={{
                background: 'linear-gradient(135deg, #1e3a8a 0%, #991b1b 100%)',
                color: 'white',
                border: 'none',
                padding: '12px 30px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Submit Another Observation
            </button>

            <div style={{ marginTop: '20px' }}>
              <Link href="/" style={{ color: '#1e3a8a', textDecoration: 'none', fontSize: '14px' }}>
                ← Back to Safety Portal
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bbs-form-page">
      <style jsx global>{`
        .bbs-form-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #1e3a8a 0%, #991b1b 100%);
          padding: 20px;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        .back-link {
          display: inline-block;
          margin-bottom: 20px;
          color: white;
          text-decoration: none;
          font-weight: 500;
          padding: 8px 16px;
          background: rgba(255,255,255,0.2);
          border-radius: 6px;
          transition: background 0.3s;
        }
        
        .back-link:hover {
          background: rgba(255,255,255,0.3);
        }
        
        .bbs-container {
          max-width: 800px;
          margin: 0 auto;
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
          padding: 40px;
        }
        
        .bbs-header {
          text-align: center;
          margin-bottom: 30px;
        }
        
        .bbs-header img {
          max-height: 60px;
          margin-bottom: 15px;
        }
        
        .bbs-header h1 {
          color: #1e3a8a;
          margin: 0 0 10px 0;
          font-size: 28px;
        }
        
        .bbs-header .subtitle {
          color: #991b1b;
          font-size: 16px;
          font-weight: 600;
        }
        
        .info-box {
          background: #e0f2fe;
          border-left: 4px solid #0284c7;
          padding: 15px;
          margin-bottom: 25px;
          border-radius: 0 8px 8px 0;
          font-size: 14px;
          color: #0c4a6e;
        }
        
        .form-group {
          margin-bottom: 20px;
        }
        
        .form-group label {
          display: block;
          font-weight: 600;
          margin-bottom: 8px;
          color: #1e3a5f;
        }
        
        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 12px;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          font-size: 15px;
          transition: border-color 0.3s;
        }
        
        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          border-color: #1e3a8a;
          outline: none;
        }
        
        .form-group textarea {
          min-height: 100px;
          resize: vertical;
        }
        
        .section-header {
          background: #1e3a8a;
          color: white;
          padding: 12px 18px;
          margin: 25px -40px;
          font-weight: 600;
          font-size: 16px;
        }
        
        .section-header.red {
          background: linear-gradient(135deg, #991b1b 0%, #7f1d1d 100%);
        }
        
        .type-options {
          display: flex;
          gap: 15px;
          margin-bottom: 20px;
        }
        
        .type-option {
          flex: 1;
          padding: 20px;
          border: 3px solid #e2e8f0;
          border-radius: 12px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s;
        }
        
        .type-option .icon {
          font-size: 32px;
          margin-bottom: 10px;
        }
        
        .type-option .title {
          font-weight: 700;
          font-size: 18px;
          margin-bottom: 5px;
        }
        
        .type-option.safe:hover,
        .type-option.safe.selected {
          border-color: #16a34a;
          background: #f0fdf4;
        }
        
        .type-option.at-risk:hover,
        .type-option.at-risk.selected {
          border-color: #dc2626;
          background: #fef2f2;
        }
        
        .flags-section {
          background: #f8fafc;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
        }
        
        .flag-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid #e2e8f0;
        }
        
        .flag-row:last-child {
          border-bottom: none;
        }
        
        .flag-label {
          font-weight: 600;
          color: #1e3a5f;
        }
        
        .yes-no-group {
          display: flex;
          gap: 10px;
        }
        
        .yes-no-option {
          padding: 8px 20px;
          border: 2px solid #e2e8f0;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        }
        
        .yes-no-option:hover {
          border-color: #1e3a8a;
        }
        
        .yes-no-option.selected {
          background: #1e3a8a;
          border-color: #1e3a8a;
          color: white;
        }
        
        .stky-section {
          background: linear-gradient(135deg, #fef2f2 0%, #fff1f2 100%);
          border: 2px solid #fecaca;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
        }
        
        .stky-section .section-label {
          color: #991b1b;
          font-weight: 700;
          font-size: 14px;
          margin-bottom: 10px;
        }
        
        .stky-badge {
          margin-top: 15px;
          padding: 12px;
          border-radius: 8px;
          font-weight: 600;
          text-align: center;
        }
        
        .stky-badge.yes {
          background: #fee2e2;
          color: #991b1b;
          border: 2px solid #fca5a5;
        }
        
        .stky-badge.no {
          background: #dcfce7;
          color: #166534;
          border: 2px solid #86efac;
        }
        
        .submit-btn {
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, #1e3a8a 0%, #991b1b 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 18px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(30, 58, 138, 0.4);
        }
        
        .submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
          color: #64748b;
          font-size: 12px;
        }
        
        @media (max-width: 600px) {
          .bbs-container {
            padding: 20px;
          }
          
          .section-header {
            margin: 25px -20px;
          }
          
          .type-options {
            flex-direction: column;
          }
          
          .flag-row {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>

      <Link href="/" className="back-link">← Back to Safety Portal</Link>
      
      <div className="bbs-container">
        <div className="bbs-header">
          <img src="/Logo.png" alt="SLP Alaska Logo" />
          <h1>BBS Observation Report</h1>
          <p className="subtitle">Behavior-Based Safety Observation</p>
        </div>
        
        <div className="info-box">
          <strong>BBS Observations</strong> help identify safe behaviors to reinforce and at-risk behaviors to correct before incidents occur. Your observations make a difference!
        </div>
        
        <form onSubmit={handleSubmit}>
          {/* Basic Information */}
          <div className="form-group">
            <label>Client/Company *</label>
            <select name="clientCompany" value={formData.clientCompany} onChange={handleChange} required>
              <option value="">-- Select Client/Company --</option>
              {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          
          <div className="form-group">
            <label>Name of Submitter *</label>
            <input type="text" name="submitterName" value={formData.submitterName} onChange={handleChange} required />
          </div>
          
          <div className="form-group">
            <label>Date *</label>
            <input type="date" name="date" value={formData.date} onChange={handleChange} required />
          </div>
          
          <div className="form-group">
            <label>Location *</label>
            <select name="location" value={formData.location} onChange={handleChange} required>
              <option value="">-- Select Location --</option>
              {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          
          <div className="form-group">
            <label>Project / Additional Details</label>
            <input type="text" name="project" value={formData.project} onChange={handleChange} placeholder="e.g., Rig 42, Pad A, Building 3" />
          </div>
          
          {/* Observation Type */}
          <div className="section-header">Type of Observation</div>
          <div className="type-options">
            <div 
              className={`type-option safe ${formData.observationType === 'Safe' ? 'selected' : ''}`}
              onClick={() => setFormData(prev => ({ ...prev, observationType: 'Safe' }))}
            >
              <div className="icon">✅</div>
              <div className="title">Safe</div>
              <div>Positive behavior observed</div>
            </div>
            <div 
              className={`type-option at-risk ${formData.observationType === 'At-Risk' ? 'selected' : ''}`}
              onClick={() => setFormData(prev => ({ ...prev, observationType: 'At-Risk' }))}
            >
              <div className="icon">⚠️</div>
              <div className="title">At-Risk</div>
              <div>Behavior needing correction</div>
            </div>
          </div>
          
          <div className="form-group">
            <label>Category of Observation *</label>
            <select name="observationCategory" value={formData.observationCategory} onChange={handleChange} required>
              <option value="">-- Select Category --</option>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          
          {/* Safety Flags */}
          <div className="section-header">Safety Flags</div>
          <div className="flags-section">
            <div className="flag-row">
              <span className="flag-label">Job Stop Required? *</span>
              <div className="yes-no-group">
                {['Yes', 'No'].map(opt => (
                  <div 
                    key={opt}
                    className={`yes-no-option ${formData.jobStopRequired === opt ? 'selected' : ''}`}
                    onClick={() => setFormData(prev => ({ ...prev, jobStopRequired: opt }))}
                  >{opt}</div>
                ))}
              </div>
            </div>
            
            <div className="flag-row">
              <span className="flag-label">Near Miss? *</span>
              <div className="yes-no-group">
                {['Yes', 'No'].map(opt => (
                  <div 
                    key={opt}
                    className={`yes-no-option ${formData.nearMiss === opt ? 'selected' : ''}`}
                    onClick={() => setFormData(prev => ({ ...prev, nearMiss: opt }))}
                  >{opt}</div>
                ))}
              </div>
            </div>
            
            <div className="flag-row">
              <span className="flag-label">Potential Equipment Damage? *</span>
              <div className="yes-no-group">
                {['Yes', 'No'].map(opt => (
                  <div 
                    key={opt}
                    className={`yes-no-option ${formData.potentialEquipmentDamage === opt ? 'selected' : ''}`}
                    onClick={() => setFormData(prev => ({ ...prev, potentialEquipmentDamage: opt }))}
                  >{opt}</div>
                ))}
              </div>
            </div>
          </div>
          
          {/* STKY Section */}
          <div className="section-header red">⚡ SIF Potential Assessment</div>
          <div className="stky-section">
            <div className="section-label">STKY = Stuff That Kills You</div>
            <p>Did this observation involve a high-energy hazard that could result in serious injury or fatality?</p>
            
            <div className="flag-row" style={{borderBottom: 'none', paddingTop: 0}}>
              <span className="flag-label">STKY Hazard Present? *</span>
              <div className="yes-no-group">
                {['Yes', 'No'].map(opt => (
                  <div 
                    key={opt}
                    className={`yes-no-option ${formData.stkyEvent === opt ? 'selected' : ''}`}
                    onClick={() => setFormData(prev => ({ ...prev, stkyEvent: opt }))}
                  >{opt}</div>
                ))}
              </div>
            </div>
            
            <p style={{fontSize: '12px', color: '#718096', marginTop: '10px'}}>
              High energy = gravity (falls), motion (vehicles), electrical, pressure, chemical, temperature extremes, LOTO situations
            </p>
            
            {formData.stkyEvent && (
              <div className={`stky-badge ${formData.stkyEvent === 'Yes' ? 'yes' : 'no'}`}>
                {formData.stkyEvent === 'Yes' 
                  ? '⚡ STKY HAZARD IDENTIFIED - This observation involves SIF potential'
                  : '✓ Non-STKY - Low energy situation'}
              </div>
            )}
          </div>
          
          {/* Observation Details */}
          <div className="section-header">Observation Details</div>
          
          <div className="form-group">
            <label>What did you see? *</label>
            <textarea name="whatDidYouSee" value={formData.whatDidYouSee} onChange={handleChange} placeholder="Describe the behavior or condition you observed..." required />
          </div>
          
          <div className="form-group">
            <label>What did you talk about?</label>
            <textarea name="whatDidYouTalkAbout" value={formData.whatDidYouTalkAbout} onChange={handleChange} placeholder="Describe the conversation you had with the person..." />
          </div>
          
          <div className="form-group">
            <label>What action was taken or agreement made?</label>
            <textarea name="actionTaken" value={formData.actionTaken} onChange={handleChange} placeholder="Describe any corrective actions or agreements..." />
          </div>
          
          <div className="form-group">
            <label>Does the "Observed" Agree with your findings? *</label>
            <div className="yes-no-group">
              {['Yes', 'No', 'Partially'].map(opt => (
                <div 
                  key={opt}
                  className={`yes-no-option ${formData.observedAgree === opt ? 'selected' : ''}`}
                  onClick={() => setFormData(prev => ({ ...prev, observedAgree: opt }))}
                >{opt}</div>
              ))}
            </div>
          </div>
          
          <button type="submit" className="submit-btn" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Observation'}
          </button>
        </form>
        
        <div className="footer">
          <span>AnthroSafe™ Field Driven Safety</span> | <span>© 2026 SLP Alaska, LLC</span>
        </div>
      </div>
    </div>
  )
}

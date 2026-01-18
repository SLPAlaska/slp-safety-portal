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
  const [message, setMessage] = useState({ type: '', text: '' })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage({ type: '', text: '' })

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

      setMessage({ type: 'success', text: 'BBS Observation submitted successfully! Thank you for your safety observation.' })
      
      // Reset form
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

      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      console.error('Error:', error)
      setMessage({ type: 'error', text: 'Error submitting form: ' + error.message })
    } finally {
      setSubmitting(false)
    }
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
        
        .message {
          padding: 15px;
          border-radius: 6px;
          margin-bottom: 20px;
          text-align: center;
          font-weight: 500;
        }
        
        .message.success {
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }
        
        .message.error {
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }
        
        .form-group {
          margin-bottom: 25px;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 8px;
          color: #333;
          font-weight: 600;
          font-size: 14px;
        }
        
        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 12px;
          border: 2px solid #e0e0e0;
          border-radius: 6px;
          font-size: 14px;
          font-family: inherit;
          transition: border-color 0.3s;
        }
        
        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #991b1b;
        }
        
        .form-group textarea {
          min-height: 100px;
          resize: vertical;
        }
        
        .section-header {
          background: #1e3a8a;
          color: white;
          padding: 12px 20px;
          border-radius: 6px;
          margin: 30px 0 20px 0;
          font-size: 16px;
          font-weight: 600;
        }
        
        .section-header.red {
          background: #dc2626;
        }
        
        .type-options {
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
          margin-bottom: 20px;
        }
        
        .type-option {
          flex: 1;
          min-width: 150px;
          padding: 20px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s;
          text-align: center;
          background: white;
        }
        
        .type-option:hover {
          border-color: #1e3a8a;
          background: #f8fafc;
        }
        
        .type-option.selected.safe {
          border-color: #22c55e;
          background: #f0fdf4;
        }
        
        .type-option.selected.at-risk {
          border-color: #991b1b;
          background: #fef2f2;
        }
        
        .type-option .icon {
          font-size: 36px;
          margin-bottom: 10px;
        }
        
        .type-option .title {
          font-weight: 600;
          font-size: 16px;
        }
        
        .type-option.safe .title { color: #22c55e; }
        .type-option.at-risk .title { color: #991b1b; }
        
        .flags-section {
          background: #fef2f2;
          padding: 20px;
          border-radius: 8px;
          border-left: 4px solid #991b1b;
          margin-bottom: 20px;
        }
        
        .flag-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px 0;
          border-bottom: 1px solid #e0e0e0;
          flex-wrap: wrap;
          gap: 10px;
        }
        
        .flag-row:last-child {
          border-bottom: none;
        }
        
        .flag-label {
          font-weight: 600;
          color: #333;
        }
        
        .yes-no-group {
          display: flex;
          gap: 10px;
        }
        
        .yes-no-option {
          padding: 10px 20px;
          border: 2px solid #e0e0e0;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.3s;
          font-weight: 500;
          background: white;
        }
        
        .yes-no-option:hover {
          border-color: #1e3a8a;
        }
        
        .yes-no-option.selected {
          border-color: #991b1b;
          background: #fef2f2;
          color: #991b1b;
        }
        
        .stky-section {
          background: #fef2f2;
          padding: 20px;
          border-radius: 8px;
          border-left: 4px solid #dc2626;
          margin-bottom: 20px;
        }
        
        .stky-section .section-label {
          font-weight: 600;
          color: #991b1b;
          margin-bottom: 10px;
          font-size: 14px;
        }
        
        .stky-section p {
          font-size: 13px;
          color: #666;
          margin-bottom: 15px;
        }
        
        .stky-badge {
          margin-top: 15px;
          padding: 12px 20px;
          border-radius: 6px;
          text-align: center;
          font-weight: bold;
          font-size: 14px;
        }
        
        .stky-badge.yes {
          background: #fecaca;
          color: #991b1b;
          border: 2px solid #dc2626;
        }
        
        .stky-badge.no {
          background: #dbeafe;
          color: #1e40af;
          border: 2px solid #3b82f6;
        }
        
        .submit-btn {
          width: 100%;
          padding: 15px;
          background: linear-gradient(135deg, #991b1b 0%, #1e3a8a 100%);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 5px 20px rgba(153, 27, 27, 0.4);
        }
        
        .submit-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
          transform: none;
        }
        
        .footer {
          text-align: center;
          padding: 20px 10px;
          margin-top: 30px;
          border-top: 1px solid #e2e8f0;
          font-size: 11px;
          color: #64748b;
        }
        
        @media (max-width: 600px) {
          .bbs-container {
            padding: 20px;
          }
          
          .bbs-header h1 {
            font-size: 24px;
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
        
        {message.text && (
          <div className={`message ${message.type}`}>{message.text}</div>
        )}
        
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
          <span>Powered by Predictive Safety Analytics™</span> | <span>© 2026 SLP Alaska</span>
        </div>
      </div>
    </div>
  )
}

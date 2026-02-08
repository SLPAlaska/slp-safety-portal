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

export default function ColdWeatherAssessment() {
  const [formData, setFormData] = useState({
    assessorName: '',
    date: new Date().toISOString().split('T')[0],
    location: '',
    company: '',
    currentTemp: '',
    windSpeed: '',
    workDescription: '',
    exposureDuration: '',
    contingencyPlan: '',
    personnelManagement: '',
    isCritical: '',
    criticalExplanation: '',
    impactIfStops: '',
    riskIfPause: '',
    benefitsOfPausing: '',
    contractorResponsible: '',
    hseRep: '',
    stopWorkAuthority: '',
    crewMembers: '',
    jobStopped: '',
    supervisorApproval: ''
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
      const { error } = await supabase.from('cold_weather_assessments').insert([{
        assessor_name: formData.assessorName,
        assessment_date: formData.date,
        location: formData.location,
        company: formData.company,
        current_temp: formData.currentTemp,
        wind_speed: formData.windSpeed,
        work_description: formData.workDescription,
        exposure_duration: formData.exposureDuration,
        contingency_plan: formData.contingencyPlan,
        personnel_management: formData.personnelManagement,
        is_critical: formData.isCritical,
        critical_explanation: formData.criticalExplanation || null,
        impact_if_stops: formData.impactIfStops,
        risk_if_pause: formData.riskIfPause,
        benefits_of_pausing: formData.benefitsOfPausing,
        contractor_responsible: formData.contractorResponsible,
        hse_rep: formData.hseRep,
        stop_work_authority: formData.stopWorkAuthority,
        crew_members: formData.crewMembers,
        job_stopped: formData.jobStopped,
        supervisor_approval: formData.supervisorApproval
      }])

      if (error) throw error

      setMessage({ type: 'success', text: 'Cold Weather Risk Assessment submitted successfully!' })
      
      // Reset form
      setFormData({
        assessorName: '',
        date: new Date().toISOString().split('T')[0],
        location: '',
        company: '',
        currentTemp: '',
        windSpeed: '',
        workDescription: '',
        exposureDuration: '',
        contingencyPlan: '',
        personnelManagement: '',
        isCritical: '',
        criticalExplanation: '',
        impactIfStops: '',
        riskIfPause: '',
        benefitsOfPausing: '',
        contractorResponsible: '',
        hseRep: '',
        stopWorkAuthority: '',
        crewMembers: '',
        jobStopped: '',
        supervisorApproval: ''
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
    <div className="form-page">
      <style jsx global>{`
        .form-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
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
        
        .form-container {
          max-width: 800px;
          margin: 0 auto;
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
          overflow: hidden;
        }
        
        .form-header {
          background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
          color: white;
          padding: 30px;
          text-align: center;
        }
        
        .form-header img {
          max-height: 60px;
          margin-bottom: 15px;
        }
        
        .form-header h1 {
          margin: 0 0 10px 0;
          font-size: 24px;
        }
        
        .form-header p {
          margin: 0;
          opacity: 0.9;
          font-size: 14px;
        }
        
        .form-content {
          padding: 30px;
        }
        
        .section-header {
          background: #1e3a8a;
          color: white;
          padding: 12px 20px;
          margin: 25px -30px 20px;
          font-weight: 600;
          font-size: 16px;
        }
        
        .section-header:first-of-type {
          margin-top: 0;
        }
        
        .form-group {
          margin-bottom: 20px;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 6px;
          font-weight: 500;
          color: #1f2937;
        }
        
        .required::after {
          content: " *";
          color: #991b1b;
        }
        
        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 12px;
          border: 2px solid #d1d5db;
          border-radius: 8px;
          font-size: 16px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        
        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #1e3a8a;
          box-shadow: 0 0 0 3px rgba(30, 58, 138, 0.1);
        }
        
        .form-group textarea {
          min-height: 100px;
          resize: vertical;
        }
        
        .row {
          display: flex;
          gap: 20px;
        }
        
        .row .form-group {
          flex: 1;
        }
        
        .radio-group {
          display: flex;
          gap: 15px;
          flex-wrap: wrap;
        }
        
        .radio-option {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          border: 2px solid #d1d5db;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          background: white;
        }
        
        .radio-option:hover {
          border-color: #1e3a8a;
        }
        
        .radio-option.selected {
          border-color: #1e3a8a;
          background: rgba(30, 58, 138, 0.05);
        }
        
        .critical-section {
          background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
          border: 2px solid #991b1b;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        
        .critical-section h3 {
          color: #991b1b;
          margin: 0 0 15px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .conditional-field {
          margin-top: 15px;
          padding: 15px;
          background: white;
          border-radius: 8px;
          border-left: 4px solid #ea580c;
        }
        
        .message {
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
          text-align: center;
          font-weight: 500;
        }
        
        .message.success {
          background: #d1fae5;
          color: #065f46;
          border: 1px solid #a7f3d0;
        }
        
        .message.error {
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }
        
        .submit-btn {
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, #991b1b 0%, #b91c1c 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 18px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          margin-top: 20px;
        }
        
        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(153, 27, 27, 0.4);
        }
        
        .submit-btn:disabled {
          background: #d1d5db;
          cursor: not-allowed;
          transform: none;
        }
        
        .footer {
          text-align: center;
          padding: 20px;
          border-top: 1px solid #e5e7eb;
          font-size: 11px;
          color: #64748b;
        }
        
        @media (max-width: 600px) {
          .row {
            flex-direction: column;
            gap: 0;
          }
          
          .radio-group {
            flex-direction: column;
          }
          
          .form-content {
            padding: 20px;
          }
          
          .section-header {
            margin-left: -20px;
            margin-right: -20px;
          }
        }
      `}</style>

      <Link href="/" className="back-link">← Back to Safety Portal</Link>
      
      <div className="form-container">
        <div className="form-header">
          <img src="/Logo.png" alt="SLP Alaska Logo" />
          <h1>Cold Weather Operating Risk Assessment</h1>
          <p>Complete this assessment before conducting work in extreme cold conditions</p>
        </div>
        
        <div className="form-content">
          {message.text && (
            <div className={`message ${message.type}`}>{message.text}</div>
          )}
          
          <form onSubmit={handleSubmit}>
            {/* Basic Information */}
            <div className="section-header">Basic Information</div>
            
            <div className="row">
              <div className="form-group">
                <label className="required">Assessor Name</label>
                <input type="text" name="assessorName" value={formData.assessorName} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="required">Date</label>
                <input type="date" name="date" value={formData.date} onChange={handleChange} required />
              </div>
            </div>
            
            <div className="row">
              <div className="form-group">
                <label className="required">Company</label>
                <select name="company" value={formData.company} onChange={handleChange} required>
                  <option value="">-- Select Company --</option>
                  {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="required">Location</label>
                <select name="location" value={formData.location} onChange={handleChange} required>
                  <option value="">-- Select Location --</option>
                  {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
            
            {/* Weather Conditions */}
            <div className="section-header">Current Weather Conditions</div>
            
            <div className="row">
              <div className="form-group">
                <label className="required">Current Temperature</label>
                <input type="text" name="currentTemp" value={formData.currentTemp} onChange={handleChange} placeholder="e.g., -25°F" required />
              </div>
              <div className="form-group">
                <label className="required">Wind Speed & Direction</label>
                <input type="text" name="windSpeed" value={formData.windSpeed} onChange={handleChange} placeholder="e.g., 15 mph NW" required />
              </div>
            </div>
            
            {/* Work Details */}
            <div className="section-header">Work Description</div>
            
            <div className="form-group">
              <label className="required">Description of Work to be Performed</label>
              <textarea name="workDescription" value={formData.workDescription} onChange={handleChange} placeholder="Describe the work activities planned..." required />
            </div>
            
            <div className="form-group">
              <label className="required">Anticipated Exposure Duration</label>
              <input type="text" name="exposureDuration" value={formData.exposureDuration} onChange={handleChange} placeholder="e.g., 2 hours with 15 min warm-up breaks" required />
            </div>
            
            {/* Safety Planning */}
            <div className="section-header">Safety Planning</div>
            
            <div className="form-group">
              <label className="required">Contingency Plan for Equipment Failures</label>
              <textarea name="contingencyPlan" value={formData.contingencyPlan} onChange={handleChange} placeholder="Describe backup plans if equipment fails in cold..." required />
            </div>
            
            <div className="form-group">
              <label className="required">How Will Personnel Be Managed for Safety?</label>
              <textarea name="personnelManagement" value={formData.personnelManagement} onChange={handleChange} placeholder="Describe rotation schedules, warm-up breaks, buddy system, etc..." required />
            </div>
            
            {/* Critical Work Assessment */}
            <div className="section-header">Critical Work Assessment</div>
            
            <div className="critical-section">
              <h3>⚠️ Is This Work CRITICAL?</h3>
              <div className="form-group">
                <div className="radio-group">
                  <div 
                    className={`radio-option ${formData.isCritical === 'Yes' ? 'selected' : ''}`}
                    onClick={() => setFormData(prev => ({ ...prev, isCritical: 'Yes' }))}
                  >
                    <input type="radio" name="isCritical" value="Yes" checked={formData.isCritical === 'Yes'} onChange={handleChange} required />
                    <span>Yes - Work is Critical</span>
                  </div>
                  <div 
                    className={`radio-option ${formData.isCritical === 'No' ? 'selected' : ''}`}
                    onClick={() => setFormData(prev => ({ ...prev, isCritical: 'No' }))}
                  >
                    <input type="radio" name="isCritical" value="No" checked={formData.isCritical === 'No'} onChange={handleChange} />
                    <span>No - Work Can Wait</span>
                  </div>
                </div>
              </div>
              
              {formData.isCritical === 'Yes' && (
                <div className="conditional-field">
                  <div className="form-group" style={{marginBottom: 0}}>
                    <label className="required">If Yes - Please Explain Why This Work is Critical</label>
                    <textarea name="criticalExplanation" value={formData.criticalExplanation} onChange={handleChange} placeholder="Explain why this work cannot be delayed..." required />
                  </div>
                </div>
              )}
            </div>
            
            {/* Risk Analysis */}
            <div className="section-header">Risk / Benefit Analysis</div>
            
            <div className="form-group">
              <label className="required">Impact If Work Stops Until It Warms</label>
              <textarea name="impactIfStops" value={formData.impactIfStops} onChange={handleChange} placeholder="What happens if we wait for better weather?" required />
            </div>
            
            <div className="form-group">
              <label className="required">Risk If We Pause The Work</label>
              <textarea name="riskIfPause" value={formData.riskIfPause} onChange={handleChange} placeholder="What are the risks of stopping mid-task?" required />
            </div>
            
            <div className="form-group">
              <label className="required">Primary Benefits of Pausing</label>
              <textarea name="benefitsOfPausing" value={formData.benefitsOfPausing} onChange={handleChange} placeholder="What safety benefits come from waiting?" required />
            </div>
            
            {/* Personnel */}
            <div className="section-header">Personnel & Authorization</div>
            
            <div className="row">
              <div className="form-group">
                <label className="required">Person Responsible for Contractor Group</label>
                <input type="text" name="contractorResponsible" value={formData.contractorResponsible} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="required">HSE Rep on Site</label>
                <input type="text" name="hseRep" value={formData.hseRep} onChange={handleChange} required />
              </div>
            </div>
            
            <div className="form-group">
              <label className="required">Work Crew Acknowledges STOP WORK AUTHORITY</label>
              <div className="radio-group">
                <div 
                  className={`radio-option ${formData.stopWorkAuthority === 'Yes' ? 'selected' : ''}`}
                  onClick={() => setFormData(prev => ({ ...prev, stopWorkAuthority: 'Yes' }))}
                >
                  <input type="radio" name="stopWorkAuthority" value="Yes" checked={formData.stopWorkAuthority === 'Yes'} onChange={handleChange} required />
                  <span>Yes - Acknowledged</span>
                </div>
                <div 
                  className={`radio-option ${formData.stopWorkAuthority === 'No' ? 'selected' : ''}`}
                  onClick={() => setFormData(prev => ({ ...prev, stopWorkAuthority: 'No' }))}
                >
                  <input type="radio" name="stopWorkAuthority" value="No" checked={formData.stopWorkAuthority === 'No'} onChange={handleChange} />
                  <span>No</span>
                </div>
              </div>
            </div>
            
            <div className="form-group">
              <label className="required">Names of Crew Members Performing Work</label>
              <textarea name="crewMembers" value={formData.crewMembers} onChange={handleChange} placeholder="List all crew members..." required />
            </div>
            
            {/* Final Decision */}
            <div className="section-header">Final Decision</div>
            
            <div className="form-group">
              <label className="required">Job Stopped Due to Cold Weather Conditions?</label>
              <div className="radio-group">
                <div 
                  className={`radio-option ${formData.jobStopped === 'Yes' ? 'selected' : ''}`}
                  onClick={() => setFormData(prev => ({ ...prev, jobStopped: 'Yes' }))}
                >
                  <input type="radio" name="jobStopped" value="Yes" checked={formData.jobStopped === 'Yes'} onChange={handleChange} required />
                  <span>Yes - Job Stopped</span>
                </div>
                <div 
                  className={`radio-option ${formData.jobStopped === 'No' ? 'selected' : ''}`}
                  onClick={() => setFormData(prev => ({ ...prev, jobStopped: 'No' }))}
                >
                  <input type="radio" name="jobStopped" value="No" checked={formData.jobStopped === 'No'} onChange={handleChange} />
                  <span>No - Proceeding with Work</span>
                </div>
              </div>
            </div>
            
            <div className="form-group">
              <label className="required">Approval of Field Supervisor and HSE</label>
              <input type="text" name="supervisorApproval" value={formData.supervisorApproval} onChange={handleChange} placeholder="Names of approving supervisor and HSE rep" required />
            </div>
            
            <button type="submit" className="submit-btn" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Assessment'}
            </button>
          </form>
          
          <div className="footer">
            <span>AnthroSafe™ Field Driven Safety</span> | <span>© 2026 SLP Alaska</span>
          </div>
        </div>
      </div>
    </div>
  )
}

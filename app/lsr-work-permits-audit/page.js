'use client';

import { useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import AddToSailLog from '@/components/AddToSailLog';
import MultiPhotoUpload from '@/components/MultiPhotoUpload';

const supabase = createClient(
  'https://iypezirwdlqpptjpeeyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
);

const COMPANIES = [
  'A-C Electric', 'AKE-Line', 'Apache Corp.', 'Armstrong Oil & Gas', 'ASRC Energy Services',
  'CCI-Industrial', 'Chosen Construction', 'CINGSA', 'Coho Enterprises', 'Conam Construction',
  'ConocoPhillips', 'Five Star Oilfield Services', 'Fox Energy Services', 'G.A. West', 'GBR Equipment',
  'GLM Energy Services', 'Graham Industrial Coatings', 'Harvest Midstream', 'Hilcorp Alaska',
  'MagTec Alaska', 'Merkes Builders', 'Nordic-Calista', 'Parker TRS', 'Peninsula Paving',
  'Pollard Wireline', 'Ridgeline Oilfield Services', 'Santos', 'Summit Excavation', 'Yellowjacket', 'Other'
];

const LOCATIONS = [
  'Kenai', 'CIO', 'Beaver Creek', 'Swanson River', 'Ninilchik', 'Nikiski', 'Other Kenai Asset',
  'Deadhorse', 'Prudhoe Bay', 'Kuparuk', 'Alpine', 'Willow', 'ENI', 'PIKKA',
  'Point Thompson', 'North Star Island', 'Endicott', 'Badami', 'Other North Slope'
];

const AUDIT_OPTIONS = ['Yes', 'No', 'Needs Improvement', 'N/A'];

export default function LSRWorkPermitsAudit() {
  const [formData, setFormData] = useState({
    auditor_name: '',
    date: new Date().toISOString().split('T')[0],
    company: '',
    location: '',
    // Hazard Identification & Scope
    hazards_identified: '',
    scope_defined: '',
    crew_prepared: '',
    training_adequate: '',
    // SIMOPS & Hazard Mitigation
    simops_coordination: '',
    hazard_mitigation: '',
    hazards_change_risk: '',
    // Work Controls & Authorization
    stop_job_criteria: '',
    permits_signed: '',
    signed_before_work: '',
    sections_completed: '',
    // Energy Isolation & Testing
    eip_appropriate: '',
    atmospheric_testing: '',
    // Comments
    opportunities_improvement: ''
  });

  const photoRef = useRef();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRadioChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Generate a unique submission ID for photo storage path
      const submissionId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      // Upload photos if any were staged
      let photoUrls = [];
      if (photoRef.current && photoRef.current.hasPhotos()) {
        photoUrls = await photoRef.current.uploadAll(submissionId);
      }

      const { error } = await supabase
        .from('lsr_work_permits_audits')
        .insert([{
          ...formData,
          photo_urls: photoUrls.length > 0 ? photoUrls : null
        }]);

      if (error) throw error;
      setSubmitted(true);
    } catch (error) {
      console.error('Submission error:', error);
      alert('Error submitting audit: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      auditor_name: '',
      date: new Date().toISOString().split('T')[0],
      company: '',
      location: '',
      hazards_identified: '',
      scope_defined: '',
      crew_prepared: '',
      training_adequate: '',
      simops_coordination: '',
      hazard_mitigation: '',
      hazards_change_risk: '',
      stop_job_criteria: '',
      permits_signed: '',
      signed_before_work: '',
      sections_completed: '',
      eip_appropriate: '',
      atmospheric_testing: '',
      opportunities_improvement: ''
    });
    if (photoRef.current) photoRef.current.reset();
    setSubmitted(false);
  };

  const getOptionStyle = (name, value) => {
    const isSelected = formData[name] === value;
    let baseStyle = {
      display: 'flex',
      alignItems: 'center',
      gap: '5px',
      padding: '6px 10px',
      border: '2px solid #d1d5db',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '12px',
      transition: 'all 0.2s',
      background: 'white'
    };
    
    if (isSelected) {
      baseStyle.borderColor = '#1e3a8a';
      baseStyle.background = 'rgba(30, 58, 138, 0.05)';
    }
    
    return baseStyle;
  };

  // Success Screen
  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1e3a8a 0%, #b91c1c 100%)', padding: '20px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', paddingTop: '50px' }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '40px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)' }}>
            <div style={{ fontSize: '60px', marginBottom: '20px' }}>✅</div>
            <h2 style={{ color: '#16a34a', marginBottom: '15px', fontSize: '24px' }}>Audit Submitted!</h2>
            <p style={{ color: '#6b7280', marginBottom: '25px' }}>LSR-Work Permits Audit recorded successfully.</p>
            
            {/* SAIL Log Integration */}
            <div style={{ 
              background: '#fffbeb', 
              border: '2px solid #f59e0b', 
              borderRadius: '12px', 
              padding: '20px', 
              marginBottom: '25px' 
            }}>
              <p style={{ color: '#92400e', marginBottom: '15px', fontSize: '14px' }}>
                ⚠️ Did you find an issue that needs follow-up?
              </p>
              <AddToSailLog
                sourceForm="lsr-work-permits-audit"
                prefillData={{
                  company: formData.company,
                  location: formData.location,
                  reported_by: formData.auditor_name,
                  issue_description: formData.opportunities_improvement
                }}
              />
            </div>
            
            <button
              onClick={resetForm}
              style={{
                background: 'linear-gradient(135deg, #1e3a8a 0%, #b91c1c 100%)',
                color: 'white',
                border: 'none',
                padding: '12px 30px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Start New Audit
            </button>
          </div>
        </div>
      </div>
    );
  }

  const AuditQuestion = ({ label, name, required = true }) => (
    <div style={{ background: '#f3f4f6', borderRadius: '8px', padding: '12px 15px', marginBottom: '10px', borderLeft: '4px solid #1e3a8a' }}>
      <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '500', color: '#374151' }}>
        {label} {required && <span style={{ color: '#dc2626' }}>*</span>}
      </label>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {AUDIT_OPTIONS.map(option => (
          <label
            key={option}
            onClick={() => handleRadioChange(name, option)}
            style={getOptionStyle(name, option)}
          >
            <input
              type="radio"
              name={name}
              value={option}
              checked={formData[name] === option}
              onChange={() => {}}
              required={required}
              style={{ width: '14px', height: '14px' }}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </div>
  );

  const SectionHeader = ({ children, icon, color = 'primary' }) => {
    const colors = {
      primary: '#1e3a8a',
      secondary: '#1e40af',
      danger: '#b91c1c',
      green: '#059669'
    };
    return (
      <div style={{
        background: colors[color],
        color: 'white',
        padding: '10px 18px',
        margin: '20px -25px 15px',
        fontWeight: '600',
        fontSize: '14px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        {icon} {children}
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', padding: '20px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <a href="/" style={{ color: '#1e3a8a', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px', marginBottom: '15px', fontSize: '14px' }}>
          ← Back to Portal
        </a>

        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #b91c1c 100%)', color: 'white', padding: '25px', textAlign: 'center' }}>
            <img src="/Logo.png" alt="SLP Alaska" style={{ maxWidth: '160px', marginBottom: '10px' }} />
            <h1 style={{ margin: '0', fontSize: '24px' }}>LSR-Work Permits Audit</h1>
            <p style={{ margin: '8px 0 0', opacity: 0.9, fontSize: '13px' }}>Life Saving Rules - Safe Work Authorization & Permit Verification</p>
            <div style={{ display: 'inline-block', background: 'white', color: '#1e3a8a', padding: '6px 16px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', marginTop: '10px', border: '3px solid #b91c1c' }}>
              📋 WORK PERMITS AUDIT
            </div>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} style={{ padding: '25px' }}>
            {/* Auditor Information */}
            <SectionHeader icon="👤" color="primary">Auditor Information</SectionHeader>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '13px' }}>
                  Name of Auditor <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input type="text" name="auditor_name" value={formData.auditor_name} onChange={handleChange} required
                  style={{ width: '100%', padding: '10px', border: '2px solid #d1d5db', borderRadius: '6px', fontSize: '15px' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '13px' }}>
                  Date <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input type="date" name="date" value={formData.date} onChange={handleChange} required
                  style={{ width: '100%', padding: '10px', border: '2px solid #d1d5db', borderRadius: '6px', fontSize: '15px' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '13px' }}>
                  Company <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select name="company" value={formData.company} onChange={handleChange} required
                  style={{ width: '100%', padding: '10px', border: '2px solid #d1d5db', borderRadius: '6px', fontSize: '15px' }}>
                  <option value="">-- Select Company --</option>
                  {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '13px' }}>
                  Location <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select name="location" value={formData.location} onChange={handleChange} required
                  style={{ width: '100%', padding: '10px', border: '2px solid #d1d5db', borderRadius: '6px', fontSize: '15px' }}>
                  <option value="">-- Select Location --</option>
                  {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>

            {/* Hazard Identification & Scope */}
            <SectionHeader icon="🎯" color="secondary">Hazard Identification & Scope</SectionHeader>
            
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '12px', marginBottom: '15px', fontSize: '12px', color: '#991b1b', borderLeft: '4px solid #b91c1c' }}>
              <strong>Life Saving Rule:</strong> Work Permits ensure hazards are identified and controlled before work begins. All permits must be properly completed, signed, and understood by all workers.
            </div>
            
            <AuditQuestion label="Hazards Adequately Identified?" name="hazards_identified" />
            <AuditQuestion label="Scope of Work Adequately Defined?" name="scope_defined" />
            <AuditQuestion label="Crew prepared for scope changes?" name="crew_prepared" />
            <AuditQuestion label="Training adequate for scope of work?" name="training_adequate" />

            {/* SIMOPS & Hazard Mitigation */}
            <SectionHeader icon="⚠️" color="danger">SIMOPS & Hazard Mitigation</SectionHeader>
            
            <AuditQuestion label="SIMOPS coordination noted on permit & adequate?" name="simops_coordination" />
            <AuditQuestion label="Hazard Mitigation Sufficient?" name="hazard_mitigation" />
            <AuditQuestion label="Hazards of Change or Combined Risk Addressed?" name="hazards_change_risk" />

            {/* Work Controls & Authorization */}
            <SectionHeader icon="✅" color="primary">Work Controls & Authorization</SectionHeader>
            
            <AuditQuestion label="Stop the Job Criteria Established & Understood?" name="stop_job_criteria" />
            <AuditQuestion label="Permits Signed by All Authorized Parties?" name="permits_signed" />
            <AuditQuestion label="Were permits signed BEFORE work began?" name="signed_before_work" />
            <AuditQuestion label="All applicable permit sections completed?" name="sections_completed" />

            {/* Energy Isolation & Testing */}
            <SectionHeader icon="🔌" color="secondary">Energy Isolation & Testing</SectionHeader>
            
            <AuditQuestion label="EIP Appropriate for scope and zero energy verified?" name="eip_appropriate" />
            <AuditQuestion label="Atmospheric testing properly documented?" name="atmospheric_testing" />

            {/* Opportunities for Improvement */}
            <SectionHeader icon="💡" color="green">Opportunities for Improvement</SectionHeader>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '13px' }}>
                Identify any opportunities for improvement
              </label>
              <textarea name="opportunities_improvement" value={formData.opportunities_improvement} onChange={handleChange}
                placeholder="Note any coaching opportunities, positive observations, or areas needing improvement..."
                style={{ width: '100%', padding: '10px', border: '2px solid #d1d5db', borderRadius: '6px', fontSize: '15px', minHeight: '80px', resize: 'vertical' }} />
            </div>

            {/* Photo Documentation */}
            <MultiPhotoUpload ref={photoRef} formType="lsr-work-permits-audit" />


            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              style={{
                width: '100%',
                padding: '14px',
                background: submitting ? '#9ca3af' : 'linear-gradient(135deg, #1e3a8a 0%, #b91c1c 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: submitting ? 'not-allowed' : 'pointer'
              }}
            >
              {submitting ? 'Submitting...' : 'Submit Work Permits Audit'}
            </button>
          </form>

          {/* Footer */}
          <div style={{ textAlign: 'center', padding: '20px 10px', borderTop: '1px solid #e2e8f0', fontSize: '11px', color: '#64748b', background: 'linear-gradient(to bottom, #f8fafc, #ffffff)' }}>
            <span style={{ color: '#1e3a5f', fontWeight: '500' }}>AnthroSafe™ Field Driven Safety</span>
            <span style={{ color: '#94a3b8', margin: '0 8px' }}>|</span>
            <span style={{ color: '#475569' }}>© 2026 SLP Alaska, LLC</span>
          </div>
        </div>
      </div>
    </div>
  );
}

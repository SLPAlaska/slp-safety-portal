'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import AddToSailLog from '@/components/AddToSailLog';

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
const YES_NO_OPTIONS = ['Yes', 'No'];

export default function LSRConfinedSpaceAudit() {
  const [formData, setFormData] = useState({
    auditor_name: '',
    date: new Date().toISOString().split('T')[0],
    company: '',
    location: '',
    // Procedures & Permits
    confined_space_procedure: '',
    permit_posted: '',
    permit_classified: '',
    // Personnel Qualifications
    supervisor_qualified: '',
    attendant_qualified: '',
    confirmed_roles: '',
    // Communication & Entry Log
    communication_plan: '',
    entry_log: '',
    radio_checks: '',
    // Rescue & Emergency
    rescue_services: '',
    rescue_plan: '',
    travel_restrictions: '',
    // Safety & Hazard Controls
    safety_controls_ppe: '',
    hazard_mitigations: '',
    hot_work_stipulation: '',
    space_isolated: '',
    ventilation_plan: '',
    // Review
    audit_reviewed: '',
    commentary_no_needs: '',
    crew_comments: ''
  });

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRadioChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const uploadPhoto = async () => {
    if (!photoFile) return null;
    
    const fileExt = photoFile.name.split('.').pop();
    const fileName = `lsr-confined-space-${Date.now()}.${fileExt}`;
    const filePath = `lsr-confined-space-audit/${fileName}`;

    const { error } = await supabase.storage
      .from('safety-photos')
      .upload(filePath, photoFile);

    if (error) {
      console.error('Photo upload error:', error);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('safety-photos')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      let photoUrl = null;
      if (photoFile) {
        photoUrl = await uploadPhoto();
      }

      const { error } = await supabase
        .from('lsr_confined_space_audits')
        .insert([{
          ...formData,
          photo_url: photoUrl
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
      confined_space_procedure: '',
      permit_posted: '',
      permit_classified: '',
      supervisor_qualified: '',
      attendant_qualified: '',
      confirmed_roles: '',
      communication_plan: '',
      entry_log: '',
      radio_checks: '',
      rescue_services: '',
      rescue_plan: '',
      travel_restrictions: '',
      safety_controls_ppe: '',
      hazard_mitigations: '',
      hot_work_stipulation: '',
      space_isolated: '',
      ventilation_plan: '',
      audit_reviewed: '',
      commentary_no_needs: '',
      crew_comments: ''
    });
    setPhotoFile(null);
    setPhotoPreview(null);
    setSubmitted(false);
  };

  const getOptionStyle = (name, value) => {
    const isSelected = formData[name] === value;
    let baseStyle = {
      flex: 1,
      minWidth: '100px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '10px 12px',
      border: '2px solid #d1d5db',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: '500',
      transition: 'all 0.2s',
      background: 'white',
      textAlign: 'center'
    };
    
    if (isSelected) {
      baseStyle.background = '#1e3a8a';
      baseStyle.borderColor = '#1e3a8a';
      baseStyle.color = 'white';
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
            <p style={{ color: '#6b7280', marginBottom: '25px' }}>LSR-Confined Space Audit recorded successfully.</p>
            
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
                sourceForm="lsr-confined-space-audit"
                prefillData={{
                  company: formData.company,
                  location: formData.location,
                  reported_by: formData.auditor_name,
                  issue_description: formData.commentary_no_needs || formData.crew_comments
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
              Submit Another Audit
            </button>
          </div>
        </div>
      </div>
    );
  }

  const AuditQuestion = ({ label, name, options = AUDIT_OPTIONS, required = true, number }) => (
    <div style={{ marginBottom: '20px' }}>
      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1f2937', fontSize: '14px' }}>
        {number && `${number}. `}{label} {required && <span style={{ color: '#b91c1c' }}>*</span>}
      </label>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {options.map(option => (
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
              style={{ display: 'none' }}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </div>
  );

  const SectionHeader = ({ children, color = 'blue' }) => (
    <div style={{
      background: color === 'blue' 
        ? 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)'
        : 'linear-gradient(135deg, #b91c1c 0%, #991b1b 100%)',
      color: 'white',
      padding: '12px 20px',
      fontWeight: '600',
      fontSize: '16px',
      marginBottom: '20px',
      borderRadius: '8px 8px 0 0',
      margin: '-20px -20px 20px -20px'
    }}>
      {children}
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1e3a8a 0%, #b91c1c 100%)', padding: '20px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <a href="/" style={{ color: 'white', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px', marginBottom: '15px', fontSize: '14px' }}>
          ← Back to Portal
        </a>

        <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #b91c1c 100%)', color: 'white', padding: '30px', textAlign: 'center' }}>
            <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: '12px', padding: '15px', display: 'inline-block', marginBottom: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
              <img src="/Logo.png" alt="SLP Alaska" style={{ maxWidth: '200px', height: 'auto' }} />
            </div>
            <div style={{ display: 'inline-block', background: 'white', color: '#1e3a8a', padding: '6px 16px', borderRadius: '20px', fontWeight: '700', fontSize: '13px', marginBottom: '15px', border: '3px solid #b91c1c' }}>
              🛡️ LIFE SAVING RULE
            </div>
            <h1 style={{ fontSize: '28px', marginBottom: '8px', textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>Confined Spaces Audit</h1>
            <p style={{ opacity: 0.95, fontSize: '16px' }}>SLP Alaska Safety Management System</p>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} style={{ padding: '30px' }}>
            {/* Auditor Information */}
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden', marginBottom: '30px' }}>
              <SectionHeader color="blue">Auditor Information</SectionHeader>
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1f2937', fontSize: '14px' }}>
                      Name of Auditor <span style={{ color: '#b91c1c' }}>*</span>
                    </label>
                    <input type="text" name="auditor_name" value={formData.auditor_name} onChange={handleChange} required
                      placeholder="Enter your full name"
                      style={{ width: '100%', padding: '12px 16px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1f2937', fontSize: '14px' }}>
                      Date <span style={{ color: '#b91c1c' }}>*</span>
                    </label>
                    <input type="date" name="date" value={formData.date} onChange={handleChange} required
                      style={{ width: '100%', padding: '12px 16px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Work Location */}
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden', marginBottom: '30px' }}>
              <SectionHeader color="red">Work Location</SectionHeader>
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1f2937', fontSize: '14px' }}>
                      Company <span style={{ color: '#b91c1c' }}>*</span>
                    </label>
                    <select name="company" value={formData.company} onChange={handleChange} required
                      style={{ width: '100%', padding: '12px 16px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }}>
                      <option value="">-- Select Company --</option>
                      {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1f2937', fontSize: '14px' }}>
                      Location <span style={{ color: '#b91c1c' }}>*</span>
                    </label>
                    <select name="location" value={formData.location} onChange={handleChange} required
                      style={{ width: '100%', padding: '12px 16px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }}>
                      <option value="">-- Select Location --</option>
                      {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Confined Space Procedures & Permits */}
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden', marginBottom: '30px' }}>
              <SectionHeader color="blue">Confined Space Procedures & Permits</SectionHeader>
              <div style={{ padding: '20px', background: '#fafafa' }}>
                <AuditQuestion number="1" label="Confined Space Procedure on Jobsite & Available?" name="confined_space_procedure" />
                <AuditQuestion number="2" label="Permit posted w/risks identified & mitigated adequately?" name="permit_posted" />
                <AuditQuestion number="3" label="Permit properly classified (regulated or non)?" name="permit_classified" options={YES_NO_OPTIONS} />
              </div>
            </div>

            {/* Personnel Qualifications */}
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden', marginBottom: '30px' }}>
              <SectionHeader color="red">Personnel Qualifications</SectionHeader>
              <div style={{ padding: '20px', background: '#fafafa' }}>
                <AuditQuestion number="4" label="Supervisor qualified/identified to the workers & Documented on the Permit?" name="supervisor_qualified" />
                <AuditQuestion number="5" label="Attendant qualified, documented & identified?" name="attendant_qualified" />
                <AuditQuestion number="6" label="Sup. Attendant, Entrants Confirmed Roles per ASH?" name="confirmed_roles" />
              </div>
            </div>

            {/* Communication & Entry Log */}
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden', marginBottom: '30px' }}>
              <SectionHeader color="blue">Communication & Entry Log</SectionHeader>
              <div style={{ padding: '20px', background: '#fafafa' }}>
                <AuditQuestion number="7" label="Is there an effective constant communication plan in place?" name="communication_plan" />
                <AuditQuestion number="8" label="Is the entry log available and current?" name="entry_log" />
                <AuditQuestion number="9" label="Radio checks for all involved completed?" name="radio_checks" />
              </div>
            </div>

            {/* Rescue & Emergency Planning */}
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden', marginBottom: '30px' }}>
              <SectionHeader color="red">Rescue & Emergency Planning</SectionHeader>
              <div style={{ padding: '20px', background: '#fafafa' }}>
                <AuditQuestion number="10" label="Rescue services notified & available?" name="rescue_services" />
                <AuditQuestion number="11" label="Rescue plan adequate & communicated to crew?" name="rescue_plan" />
                <AuditQuestion number="12" label="Travel restrictions verified to not impact response operations?" name="travel_restrictions" />
              </div>
            </div>

            {/* Safety & Hazard Controls */}
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden', marginBottom: '30px' }}>
              <SectionHeader color="blue">Safety & Hazard Controls</SectionHeader>
              <div style={{ padding: '20px', background: '#fafafa' }}>
                <AuditQuestion number="13" label="Safety Controls & PPE Appropriate for Tasks?" name="safety_controls_ppe" />
                <AuditQuestion number="14" label="Hazard Mitigations Effective?" name="hazard_mitigations" />
                <AuditQuestion number="15" label="Hot Work stipulation adherence by All involved?" name="hot_work_stipulation" />
                <AuditQuestion number="16" label="Is the space adequately isolated (blinds, etc.)?" name="space_isolated" />
                <AuditQuestion number="17" label="Ventilation Plan effectively provide air exchanges?" name="ventilation_plan" />
              </div>
            </div>

            {/* Review & Comments */}
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden', marginBottom: '30px' }}>
              <SectionHeader color="red">Review & Comments</SectionHeader>
              <div style={{ padding: '20px', background: '#fafafa' }}>
                <AuditQuestion number="18" label="Was audit reviewed with crew?" name="audit_reviewed" options={YES_NO_OPTIONS} />
                
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1f2937', fontSize: '14px' }}>
                    Provide commentary on any No or Needs Improvement
                  </label>
                  <textarea name="commentary_no_needs" value={formData.commentary_no_needs} onChange={handleChange}
                    placeholder="Explain any items marked as No or Needs Improvement..."
                    style={{ width: '100%', padding: '12px 16px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px', minHeight: '100px', resize: 'vertical' }} />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1f2937', fontSize: '14px' }}>
                    List crew comments and/or Atta Boys here
                  </label>
                  <textarea name="crew_comments" value={formData.crew_comments} onChange={handleChange}
                    placeholder="Enter crew comments, recognitions, or positive observations..."
                    style={{ width: '100%', padding: '12px 16px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px', minHeight: '100px', resize: 'vertical' }} />
                </div>
              </div>
            </div>

            {/* Photo Documentation */}
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden', marginBottom: '30px' }}>
              <SectionHeader color="blue">Photo Documentation</SectionHeader>
              <div style={{ padding: '20px', background: '#fafafa' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1f2937', fontSize: '14px' }}>
                  Upload Photo (optional)
                </label>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  <label style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 20px',
                    background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)',
                    color: 'white',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}>
                    📷 Take Photo
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoChange}
                      style={{ display: 'none' }}
                    />
                  </label>
                  
                  <label style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 20px',
                    background: '#6b7280',
                    color: 'white',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}>
                    📁 Choose File
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
                
                {photoPreview && (
                  <div style={{ marginTop: '10px' }}>
                    <img src={photoPreview} alt="Preview" style={{ maxWidth: '200px', maxHeight: '150px', borderRadius: '8px' }} />
                    <button
                      type="button"
                      onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                      style={{
                        display: 'block',
                        marginTop: '8px',
                        padding: '6px 12px',
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      ✕ Remove Photo
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              style={{
                width: '100%',
                padding: '16px 32px',
                background: submitting ? '#9ca3af' : 'linear-gradient(135deg, #1e3a8a 0%, #b91c1c 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '18px',
                fontWeight: '600',
                cursor: submitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 15px rgba(30,58,138,0.3)'
              }}
            >
              {submitting ? 'Submitting...' : 'Submit Confined Spaces Audit'}
            </button>
          </form>

          {/* Footer */}
          <div style={{ textAlign: 'center', padding: '20px 10px', borderTop: '1px solid #e2e8f0', fontSize: '11px', color: '#64748b', background: 'linear-gradient(to bottom, #f8fafc, #ffffff)' }}>
            <span style={{ color: '#1e3a5f', fontWeight: '500' }}>Powered by Predictive Safety Analytics™</span>
            <span style={{ color: '#94a3b8', margin: '0 8px' }}>|</span>
            <span style={{ color: '#475569' }}>© 2025 SLP Alaska</span>
          </div>
        </div>
      </div>
    </div>
  );
}

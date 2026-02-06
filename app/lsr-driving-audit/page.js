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

export default function LSRDrivingAudit() {
  const [formData, setFormData] = useState({
    auditor_name: '',
    date: new Date().toISOString().split('T')[0],
    company: '',
    location: '',
    work_area: '',
    // Journey Management
    journey_management: '',
    // Radio Communication
    functional_radio: '',
    driver_knows_radio: '',
    radio_set_for_work: '',
    // Vehicle Inspection
    walkaround_360: '',
    cab_bed_free_debris: '',
    ppe_arctic_gear: '',
    adequate_fuel: '',
    // Driver Knowledge
    speed_limits: '',
    phase_conditions: '',
    phase_iii_shelter: '',
    // Passengers & Policy
    passengers_active: '',
    phones_distractions: '',
    // Discussion
    discussed_with_team: '',
    comments: ''
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
    const fileName = `lsr-driving-${Date.now()}.${fileExt}`;
    const filePath = `lsr-driving-audit/${fileName}`;

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
        .from('lsr_driving_audits')
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
      work_area: '',
      journey_management: '',
      functional_radio: '',
      driver_knows_radio: '',
      radio_set_for_work: '',
      walkaround_360: '',
      cab_bed_free_debris: '',
      ppe_arctic_gear: '',
      adequate_fuel: '',
      speed_limits: '',
      phase_conditions: '',
      phase_iii_shelter: '',
      passengers_active: '',
      phones_distractions: '',
      discussed_with_team: '',
      comments: ''
    });
    setPhotoFile(null);
    setPhotoPreview(null);
    setSubmitted(false);
  };

  const getOptionStyle = (name, value) => {
    const isSelected = formData[name] === value;
    let baseStyle = {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '8px 12px',
      border: '2px solid #d1d5db',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '13px',
      transition: 'all 0.2s',
      background: 'white'
    };
    
    if (isSelected) {
      if (value === 'Yes') {
        baseStyle.borderColor = '#16a34a';
        baseStyle.background = '#f0fdf4';
      } else if (value === 'No') {
        baseStyle.borderColor = '#dc2626';
        baseStyle.background = '#fef2f2';
      } else if (value === 'Needs Improvement') {
        baseStyle.borderColor = '#f59e0b';
        baseStyle.background = '#fffbeb';
      } else {
        baseStyle.borderColor = '#0d9488';
        baseStyle.background = '#f0fdfa';
      }
    }
    
    return baseStyle;
  };

  // Success Screen
  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)', padding: '20px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', paddingTop: '50px' }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '40px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)' }}>
            <div style={{ fontSize: '60px', marginBottom: '20px' }}>✅</div>
            <h2 style={{ color: '#16a34a', marginBottom: '15px', fontSize: '24px' }}>Audit Submitted!</h2>
            <p style={{ color: '#6b7280', marginBottom: '25px' }}>LSR-Driving Audit recorded successfully.</p>
            
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
                sourceForm="lsr-driving-audit"
                prefillData={{
                  company: formData.company,
                  location: formData.location,
                  reported_by: formData.auditor_name,
                  issue_description: formData.comments
                }}
              />
            </div>
            
            <button
              onClick={resetForm}
              style={{
                background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
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
    <div style={{ background: '#f3f4f6', borderRadius: '8px', padding: '12px 15px', marginBottom: '10px' }}>
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

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', padding: '20px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <a href="/" style={{ color: '#0d9488', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px', marginBottom: '15px', fontSize: '14px' }}>
          ← Back to Portal
        </a>

        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)', color: 'white', padding: '25px', textAlign: 'center' }}>
            <img src="/Logo.png" alt="SLP Alaska" style={{ maxWidth: '160px', marginBottom: '10px' }} />
            <h1 style={{ margin: '0', fontSize: '24px' }}>LSR-Driving Audit</h1>
            <p style={{ margin: '8px 0 0', opacity: 0.9, fontSize: '13px' }}>Life Saving Rules - Driving Safety Verification</p>
            <div style={{ display: 'inline-block', background: 'white', color: '#0d9488', padding: '4px 12px', borderRadius: '15px', fontSize: '11px', fontWeight: '600', marginTop: '8px' }}>
              🚗 DRIVING SAFETY AUDIT
            </div>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} style={{ padding: '25px' }}>
            {/* Auditor Information */}
            <div style={{ background: '#0d9488', color: 'white', padding: '10px 18px', margin: '0 -25px 15px', fontWeight: '600', fontSize: '14px' }}>
              👤 Auditor Information
            </div>
            
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
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '13px' }}>
                Specify Work Area
              </label>
              <input type="text" name="work_area" value={formData.work_area} onChange={handleChange}
                placeholder="e.g., Pad 3, Main Road, Pipeline ROW"
                style={{ width: '100%', padding: '10px', border: '2px solid #d1d5db', borderRadius: '6px', fontSize: '15px' }} />
            </div>

            {/* Journey Management */}
            <div style={{ background: '#ea580c', color: 'white', padding: '10px 18px', margin: '20px -25px 15px', fontWeight: '600', fontSize: '14px' }}>
              🗺️ Journey Management
            </div>
            
            <div style={{ background: '#ccfbf1', border: '1px solid #5eead4', borderRadius: '6px', padding: '12px', marginBottom: '15px', fontSize: '12px', color: '#0f766e' }}>
              <strong>ASH Book Reference:</strong> All drivers must have an approved Journey Management Plan for travel outside of established work areas.
            </div>
            
            <AuditQuestion label="Journey Management Process in use?" name="journey_management" />

            {/* Radio Communication */}
            <div style={{ background: '#0891b2', color: 'white', padding: '10px 18px', margin: '20px -25px 15px', fontWeight: '600', fontSize: '14px' }}>
              📻 Radio Communication
            </div>
            
            <AuditQuestion label="Is there a functional radio in the vehicle?" name="functional_radio" />
            <AuditQuestion label="Driver knows how to use the radio (if equipped)?" name="driver_knows_radio" />
            <AuditQuestion label="Is the radio set for the work area?" name="radio_set_for_work" />

            {/* Vehicle Inspection */}
            <div style={{ background: '#059669', color: 'white', padding: '10px 18px', margin: '20px -25px 15px', fontWeight: '600', fontSize: '14px' }}>
              🔍 Vehicle Inspection
            </div>
            
            <AuditQuestion label="360 Walkaround conducted per the ASH Book?" name="walkaround_360" />
            <AuditQuestion label="Vehicle cab and bed free of debris and trash?" name="cab_bed_free_debris" />
            <AuditQuestion label="All PPE & Arctic Gear as appropriate?" name="ppe_arctic_gear" />
            <AuditQuestion label="Adequate fuel (1/2 tank min.) per ASH Book?" name="adequate_fuel" />

            {/* Driver Knowledge */}
            <div style={{ background: '#dc2626', color: 'white', padding: '10px 18px', margin: '20px -25px 15px', fontWeight: '600', fontSize: '14px' }}>
              📚 Driver Knowledge
            </div>
            
            <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '6px', padding: '12px', marginBottom: '15px', fontSize: '12px', color: '#92400e' }}>
              <strong>Phase Conditions:</strong> Drivers must know current weather phase conditions and associated travel restrictions.
            </div>
            
            <AuditQuestion label="Driver knows all different types of speed limits?" name="speed_limits" />
            <AuditQuestion label="Driver can recite requirements - Phase Conditions?" name="phase_conditions" />
            <AuditQuestion label="Phase III - Place to shelter w/ food & water?" name="phase_iii_shelter" />

            {/* Passengers & Policy */}
            <div style={{ background: '#1e3a8a', color: 'white', padding: '10px 18px', margin: '20px -25px 15px', fontWeight: '600', fontSize: '14px' }}>
              👥 Passengers & Policy Adherence
            </div>
            
            <AuditQuestion label="Are passengers Active if present?" name="passengers_active" />
            <AuditQuestion label="Policy adherence for phones/distractions?" name="phones_distractions" />

            {/* Audit Discussion */}
            <div style={{ background: '#059669', color: 'white', padding: '10px 18px', margin: '20px -25px 15px', fontWeight: '600', fontSize: '14px' }}>
              💬 Audit Discussion
            </div>
            
            <div style={{ background: '#f3f4f6', borderRadius: '8px', padding: '12px 15px', marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '500', color: '#374151' }}>
                Was this audit discussed with the team? <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['Yes', 'No'].map(option => (
                  <label
                    key={option}
                    onClick={() => handleRadioChange('discussed_with_team', option)}
                    style={getOptionStyle('discussed_with_team', option)}
                  >
                    <input
                      type="radio"
                      name="discussed_with_team"
                      value={option}
                      checked={formData.discussed_with_team === option}
                      onChange={() => {}}
                      required
                      style={{ width: '14px', height: '14px' }}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '13px' }}>
                Any comments, improvements, or atta boys?
              </label>
              <textarea name="comments" value={formData.comments} onChange={handleChange}
                placeholder="Recognition, coaching opportunities, or areas for improvement..."
                style={{ width: '100%', padding: '10px', border: '2px solid #d1d5db', borderRadius: '6px', fontSize: '15px', minHeight: '80px', resize: 'vertical' }} />
            </div>

            {/* Photo Documentation */}
            <div style={{ background: '#1e3a8a', color: 'white', padding: '10px 18px', margin: '20px -25px 15px', fontWeight: '600', fontSize: '14px' }}>
              📷 Photo Documentation
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '13px' }}>
                Photo (Optional)
              </label>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
                <label style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
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
                  padding: '10px 16px',
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
                  <img src={photoPreview} alt="Preview" style={{ maxWidth: '180px', maxHeight: '120px', borderRadius: '4px' }} />
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

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              style={{
                width: '100%',
                padding: '14px',
                background: submitting ? '#9ca3af' : 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: submitting ? 'not-allowed' : 'pointer'
              }}
            >
              {submitting ? 'Submitting...' : 'Submit Driving Audit'}
            </button>
          </form>

          {/* Footer */}
          <div style={{ textAlign: 'center', padding: '20px 10px', borderTop: '1px solid #e2e8f0', fontSize: '11px', color: '#64748b', background: 'linear-gradient(to bottom, #f8fafc, #ffffff)' }}>
            <span style={{ color: '#1e3a5f', fontWeight: '500' }}>AnthroSafe™ Powered by Field Driven Data™</span>
            <span style={{ color: '#94a3b8', margin: '0 8px' }}>|</span>
            <span style={{ color: '#475569' }}>© 2025 SLP Alaska</span>
          </div>
        </div>
      </div>
    </div>
  );
}

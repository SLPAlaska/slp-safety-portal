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

export default function LSRFallProtectionAudit() {
  const [formData, setFormData] = useState({
    auditor_name: '',
    date: new Date().toISOString().split('T')[0],
    company: '',
    location: '',
    // Work Platforms & Scaffolds
    fixed_mobile_platform: '',
    scaffold_tag_inspection: '',
    platform_guardrails: '',
    // Fall Protection Requirements
    fall_protection_100: '',
    workers_aware_hazards: '',
    roofs_guardrails: '',
    // Harness & Equipment
    harnesses_condition: '',
    snap_hooks_d_rings: '',
    double_action_locking: '',
    // Anchor Points
    anchor_points_rated: '',
    piping_anchors_approved: '',
    no_guardrails_anchorage: '',
    free_fall_limit: '',
    // Ladder Safety
    ladders_4to1_ratio: '',
    ladders_extend_3to5: '',
    not_leaning_past_rails: '',
    // Dropped Objects
    dropped_object_prevention: '',
    // Comments
    opportunities_improvement: ''
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
    const fileName = `lsr-fall-protection-${Date.now()}.${fileExt}`;
    const filePath = `lsr-fall-protection-audit/${fileName}`;

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
        .from('lsr_fall_protection_audits')
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
      fixed_mobile_platform: '',
      scaffold_tag_inspection: '',
      platform_guardrails: '',
      fall_protection_100: '',
      workers_aware_hazards: '',
      roofs_guardrails: '',
      harnesses_condition: '',
      snap_hooks_d_rings: '',
      double_action_locking: '',
      anchor_points_rated: '',
      piping_anchors_approved: '',
      no_guardrails_anchorage: '',
      free_fall_limit: '',
      ladders_4to1_ratio: '',
      ladders_extend_3to5: '',
      not_leaning_past_rails: '',
      dropped_object_prevention: '',
      opportunities_improvement: ''
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
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)', padding: '20px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', paddingTop: '50px' }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '40px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)' }}>
            <div style={{ fontSize: '60px', marginBottom: '20px' }}>✅</div>
            <h2 style={{ color: '#16a34a', marginBottom: '15px', fontSize: '24px' }}>Audit Submitted!</h2>
            <p style={{ color: '#6b7280', marginBottom: '25px' }}>LSR-Fall Protection Audit recorded successfully.</p>
            
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
                sourceForm="lsr-fall-protection-audit"
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
                background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)',
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
          <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)', color: 'white', padding: '25px', textAlign: 'center' }}>
            <img src="/Logo.png" alt="SLP Alaska" style={{ maxWidth: '160px', marginBottom: '10px' }} />
            <h1 style={{ margin: '0', fontSize: '24px' }}>LSR-Fall Protection Audit</h1>
            <p style={{ margin: '8px 0 0', opacity: 0.9, fontSize: '13px' }}>Life Saving Rules - Fall Protection Verification</p>
            <div style={{ display: 'inline-block', background: '#ea580c', color: 'white', padding: '4px 12px', borderRadius: '15px', fontSize: '11px', fontWeight: '600', marginTop: '8px' }}>
              🪜 FALL PROTECTION AUDIT
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

            {/* Work Platforms & Scaffolds */}
            <SectionHeader icon="🏗️" color="secondary">Work Platforms & Scaffolds</SectionHeader>
            
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '12px', marginBottom: '15px', fontSize: '12px', color: '#991b1b' }}>
              <strong>Life Saving Rule:</strong> Falls are a leading cause of fatalities. 100% fall protection is required when working at heights greater than 6 feet.
            </div>
            
            <AuditQuestion label="Possible to use fixed or mobile work platform?" name="fixed_mobile_platform" />
            <AuditQuestion label="Scaffold Tag Inspection within past 24-hours?" name="scaffold_tag_inspection" />
            <AuditQuestion label="Platform >4' - are there guardrails in place?" name="platform_guardrails" />

            {/* Fall Protection Requirements */}
            <SectionHeader icon="⚠️" color="primary">Fall Protection Requirements</SectionHeader>
            
            <AuditQuestion label=">6' fall potential - 100% continuous fall protection?" name="fall_protection_100" />
            <AuditQuestion label="Workers aware of all hazards & mitigation?" name="workers_aware_hazards" />
            <AuditQuestion label="Roofs with >/< 4/12 pitch w/ edges >6' have guardrails?" name="roofs_guardrails" />

            {/* Harness & Equipment */}
            <SectionHeader icon="🦺" color="secondary">Harness & Equipment</SectionHeader>
            
            <AuditQuestion label="Harnesses in good condition & worn correctly?" name="harnesses_condition" />
            <AuditQuestion label="Snap hooks & D-Rings rated at 5,000lbs?" name="snap_hooks_d_rings" />
            <AuditQuestion label="All Snap hooks Double-Action Self-Locking?" name="double_action_locking" />

            {/* Anchor Points */}
            <SectionHeader icon="⚓" color="primary">Anchor Points</SectionHeader>
            
            <AuditQuestion label="Anchor Points Rated at 5,000lbs & evaluated?" name="anchor_points_rated" />
            <AuditQuestion label="Process Piping Anchors Approved by Engineer?" name="piping_anchors_approved" />
            <AuditQuestion label="No guardrails, conduit, or scaffold used as anchorage?" name="no_guardrails_anchorage" />
            <AuditQuestion label="Fall Protection system limits free fall to less than 6'?" name="free_fall_limit" />

            {/* Ladder Safety */}
            <SectionHeader icon="🪜" color="secondary">Ladder Safety</SectionHeader>
            
            <AuditQuestion label="Extension/Straight ladders being used at 4:1 ratio?" name="ladders_4to1_ratio" />
            <AuditQuestion label="Ladders extend 3-5 rungs above landing surface?" name="ladders_extend_3to5" />
            <AuditQuestion label="Workers not leaning out past ladder rails?" name="not_leaning_past_rails" />

            {/* Dropped Object Prevention */}
            <SectionHeader icon="📦" color="primary">Dropped Object Prevention</SectionHeader>
            
            <AuditQuestion label="Dropped object prevention accounted for?" name="dropped_object_prevention" />

            {/* Opportunities for Improvement */}
            <SectionHeader icon="💡" color="green">Opportunities for Improvement</SectionHeader>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '13px' }}>
                Describe any opportunities for improvement
              </label>
              <textarea name="opportunities_improvement" value={formData.opportunities_improvement} onChange={handleChange}
                placeholder="Note any coaching opportunities, positive observations, or areas needing improvement..."
                style={{ width: '100%', padding: '10px', border: '2px solid #d1d5db', borderRadius: '6px', fontSize: '15px', minHeight: '80px', resize: 'vertical' }} />
            </div>

            {/* Photo Documentation */}
            <SectionHeader icon="📷" color="primary">Photo Documentation</SectionHeader>
            
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
                background: submitting ? '#9ca3af' : 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: submitting ? 'not-allowed' : 'pointer'
              }}
            >
              {submitting ? 'Submitting...' : 'Submit Fall Protection Audit'}
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

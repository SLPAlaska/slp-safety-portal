'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://iypezirwdlqpptjpeeyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
);

const COMPANIES = ['A-C Electric','AKE-Line','Apache Corp.','Armstrong Oil & Gas','ASRC Energy Services','CCI- Industrial','Chosen Construction','CINGSA','Coho Enterprises','Conam Construction','ConocoPhillips','Five Star Oilfield Services','Fox Energy Services','G.A. West','GBR Equipment','GLM Energy Services','Graham Industrial Coatings','Harvest Midstream','Hilcorp Alaska','MagTec Alaska','Merkes Builders','Nordic-Calista','Parker TRS','Peninsula Paving','Pollard Wireline','Ridgeline Oilfield Services','Santos','Summit Excavation','Tesoro Refinery','Yellowjacket','Other'];

const LOCATIONS = ['Kenai','CIO','Beaver Creek','Swanson River','Ninilchik','Nikiski','Other Kenai Asset','Deadhorse','Prudhoe Bay','Kuparuk','Alpine','Willow','ENI','PIKKA','Point Thompson','North Star Island','Endicott','Badami','Other North Slope'];

const PERMIT_TYPES = ['Hot Work','Confined Space','Lock Out / Tag Out','Excavation','Line Break','Electrical','Fluid Transfer','General Work','Multiple','Other'];

const AUDIT_OPTIONS = ['Yes', 'No', 'Needs Improvement', 'N/A'];

export default function LocationAuditForm() {
  const [formData, setFormData] = useState({
    auditor_name: '',
    date: new Date().toISOString().split('T')[0],
    company: '',
    location: '',
    specific_location: '',
    crew_supervisor: '',
    crew_member_names: '',
    work_description: '',
    is_there_permit: '',
    type_of_permit: '',
    hazards_idd: '',
    unidentified_hazards: '',
    tha_jsa_posted: '',
    employees_complying_tha: '',
    fire_extinguishers: '',
    emergency_eye_wash: '',
    emergency_evacuation: '',
    familiar_with_alarms: '',
    adequate_ppe: '',
    spill_prevention: '',
    opportunities_improvement: ''
  });

  const [photos, setPhotos] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (e) => {
    const files = Array.from(e.target.files);
    setPhotos(prev => [...prev, ...files]);
  };

  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const uploadPhotos = async () => {
    const uploadedUrls = [];
    for (const photo of photos) {
      const fileName = `location-audit/${Date.now()}-${photo.name}`;
      const { error } = await supabase.storage.from('safety-photos').upload(fileName, photo);
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('safety-photos').getPublicUrl(fileName);
        uploadedUrls.push(publicUrl);
      }
    }
    return uploadedUrls;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      let photoUrls = [];
      if (photos.length > 0) {
        photoUrls = await uploadPhotos();
      }

      const submitData = {};
      for (const [key, value] of Object.entries(formData)) {
        submitData[key] = value === '' ? null : value;
      }
      submitData.photo_urls = photoUrls.length > 0 ? photoUrls : null;

      const { error } = await supabase.from('location_audit_reports').insert([submitData]).select();

      if (error) throw error;

      setSubmitStatus('success');
      setFormData({
        auditor_name: '', date: new Date().toISOString().split('T')[0], company: '', location: '',
        specific_location: '', crew_supervisor: '', crew_member_names: '', work_description: '',
        is_there_permit: '', type_of_permit: '', hazards_idd: '', unidentified_hazards: '',
        tha_jsa_posted: '', employees_complying_tha: '', fire_extinguishers: '', emergency_eye_wash: '',
        emergency_evacuation: '', familiar_with_alarms: '', adequate_ppe: '', spill_prevention: '',
        opportunities_improvement: ''
      });
      setPhotos([]);
    } catch (error) {
      setSubmitStatus('error: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const styles = {
    container: { maxWidth: '900px', margin: '0 auto', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', overflow: 'hidden', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
    header: { background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', color: '#fff', padding: '25px', textAlign: 'center' },
    formContent: { padding: '25px' },
    sectionHeader: { padding: '10px 18px', margin: '20px -25px 15px', fontWeight: '600', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' },
    row: { display: 'flex', gap: '15px', flexWrap: 'wrap' },
    formGroup: { flex: '1', minWidth: '200px', marginBottom: '15px' },
    fullWidth: { width: '100%', marginBottom: '15px' },
    label: { display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '13px' },
    input: { width: '100%', padding: '10px', border: '2px solid #d1d5db', borderRadius: '6px', fontSize: '15px', boxSizing: 'border-box' },
    select: { width: '100%', padding: '10px', border: '2px solid #d1d5db', borderRadius: '6px', fontSize: '15px', boxSizing: 'border-box', backgroundColor: '#fff' },
    textarea: { width: '100%', padding: '10px', border: '2px solid #d1d5db', borderRadius: '6px', fontSize: '15px', minHeight: '80px', resize: 'vertical', boxSizing: 'border-box' },
    radioGroup: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
    radioOption: { display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', border: '2px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
    auditQuestion: { background: '#f3f4f6', borderRadius: '8px', padding: '15px', marginBottom: '12px' },
    conditionalField: { marginTop: '15px', padding: '15px', background: '#fef3c7', borderRadius: '8px', border: '1px solid #fcd34d' },
    infoBox: { background: '#f3e8ff', border: '1px solid #c4b5fd', borderRadius: '6px', padding: '12px', marginBottom: '15px', fontSize: '12px', color: '#6d28d9' },
    photoUpload: { border: '2px dashed #d1d5db', borderRadius: '8px', padding: '25px', textAlign: 'center', cursor: 'pointer' },
    submitBtn: { width: '100%', padding: '14px', background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', marginTop: '15px' },
    successMessage: { background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', color: '#fff', padding: '25px', borderRadius: '8px', textAlign: 'center', marginTop: '15px' },
    footer: { textAlign: 'center', padding: '20px 10px', marginTop: '30px', borderTop: '1px solid #e2e8f0', fontSize: '11px', color: '#64748b' }
  };

  const RadioGroup = ({ label, name, options = AUDIT_OPTIONS, required = true }) => (
    <div style={styles.auditQuestion}>
      <label style={{ ...styles.label, marginBottom: '10px', fontSize: '14px' }}>{label} {required && <span style={{ color: '#dc2626' }}>*</span>}</label>
      <div style={styles.radioGroup}>
        {options.map(opt => (
          <label key={opt} style={{ ...styles.radioOption, borderColor: formData[name] === opt ? '#7c3aed' : '#d1d5db', background: formData[name] === opt ? 'rgba(124,58,237,0.05)' : '#fff' }}>
            <input type="radio" name={name} value={opt} checked={formData[name] === opt} onChange={handleChange} required={required} style={{ width: '16px', height: '16px' }} />
            <span>{opt}</span>
          </label>
        ))}
      </div>
    </div>
  );

  if (submitStatus === 'success') {
    return (
      <div style={{ padding: '20px', backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
        <div style={styles.container}>
          <div style={styles.header}>
            <img src="/Logo.png" alt="SLP Alaska" style={{ maxWidth: '180px', margin: '0 auto 15px auto', display: 'block' }} />
            <h1 style={{ margin: 0, fontSize: '24px' }}>Location Audit Report</h1>
          </div>
          <div style={styles.formContent}>
            <div style={styles.successMessage}>
              <h2>✓ Location Audit Submitted!</h2>
              <p>Thank you for conducting this safety audit.</p>
              <button onClick={() => setSubmitStatus(null)} style={{ ...styles.submitBtn, background: '#fff', color: '#059669', marginTop: '10px' }}>Start New Audit</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
      <div style={styles.container}>
        <div style={styles.header}>
          <img src="/Logo.png" alt="SLP Alaska" style={{ maxWidth: '180px', margin: '0 auto 15px auto', display: 'block' }} />
          <h1 style={{ margin: 0, fontSize: '24px' }}>Location Audit Report</h1>
          <p style={{ margin: '8px 0 0', opacity: 0.9, fontSize: '13px' }}>Comprehensive Safety Audit for Work Locations</p>
          <div style={{ display: 'inline-block', background: '#fff', color: '#7c3aed', padding: '4px 12px', borderRadius: '15px', fontSize: '11px', fontWeight: '600', marginTop: '8px' }}>🔍 SITE SAFETY AUDIT</div>
        </div>

        <div style={styles.formContent}>
          <form onSubmit={handleSubmit}>
            {/* Auditor Information */}
            <div style={{ ...styles.sectionHeader, backgroundColor: '#7c3aed', marginTop: 0 }}>👤 Auditor Information</div>
            <div style={styles.row}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Name of Auditor <span style={{ color: '#dc2626' }}>*</span></label>
                <input type="text" name="auditor_name" value={formData.auditor_name} onChange={handleChange} required style={styles.input} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Date <span style={{ color: '#dc2626' }}>*</span></label>
                <input type="date" name="date" value={formData.date} onChange={handleChange} required style={styles.input} />
              </div>
            </div>

            {/* Work Location & Crew */}
            <div style={{ ...styles.sectionHeader, backgroundColor: '#ea580c' }}>📍 Work Location & Crew</div>
            <div style={styles.row}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Company <span style={{ color: '#dc2626' }}>*</span></label>
                <select name="company" value={formData.company} onChange={handleChange} required style={styles.select}>
                  <option value="">-- Select Company --</option>
                  {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Location <span style={{ color: '#dc2626' }}>*</span></label>
                <select name="location" value={formData.location} onChange={handleChange} required style={styles.select}>
                  <option value="">-- Select Location --</option>
                  {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
            <div style={styles.fullWidth}>
              <label style={styles.label}>Specific Location</label>
              <input type="text" name="specific_location" value={formData.specific_location} onChange={handleChange} placeholder="Building, pad, well site, etc." style={styles.input} />
            </div>
            <div style={styles.row}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Crew Supervisor <span style={{ color: '#dc2626' }}>*</span></label>
                <input type="text" name="crew_supervisor" value={formData.crew_supervisor} onChange={handleChange} required style={styles.input} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Crew Member Names</label>
                <input type="text" name="crew_member_names" value={formData.crew_member_names} onChange={handleChange} placeholder="List crew members present" style={styles.input} />
              </div>
            </div>
            <div style={styles.fullWidth}>
              <label style={styles.label}>Work Description <span style={{ color: '#dc2626' }}>*</span></label>
              <textarea name="work_description" value={formData.work_description} onChange={handleChange} placeholder="Describe the work being performed..." required style={styles.textarea} />
            </div>

            {/* Permit Information */}
            <div style={{ ...styles.sectionHeader, backgroundColor: '#0891b2' }}>📋 Permit Information</div>
            <div style={styles.fullWidth}>
              <label style={styles.label}>Is there a permit for this work? <span style={{ color: '#dc2626' }}>*</span></label>
              <div style={styles.radioGroup}>
                {['Yes', 'No'].map(opt => (
                  <label key={opt} style={{ ...styles.radioOption, borderColor: formData.is_there_permit === opt ? '#7c3aed' : '#d1d5db', background: formData.is_there_permit === opt ? 'rgba(124,58,237,0.05)' : '#fff' }}>
                    <input type="radio" name="is_there_permit" value={opt} checked={formData.is_there_permit === opt} onChange={handleChange} required style={{ width: '16px', height: '16px' }} />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </div>
            {formData.is_there_permit === 'Yes' && (
              <div style={styles.conditionalField}>
                <label style={styles.label}>Type of Permit</label>
                <select name="type_of_permit" value={formData.type_of_permit} onChange={handleChange} style={styles.select}>
                  <option value="">-- Select Permit Type --</option>
                  {PERMIT_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            )}

            {/* Safety Audit Questions */}
            <div style={{ ...styles.sectionHeader, backgroundColor: '#dc2626' }}>⚠️ Safety Audit Questions</div>
            <div style={styles.infoBox}>Answer each question based on your observations at the work site. Select "Needs Improvement" when partial compliance is observed.</div>

            <RadioGroup label="Are the hazards identified correctly?" name="hazards_idd" />
            {(formData.hazards_idd === 'No' || formData.hazards_idd === 'Needs Improvement') && (
              <div style={styles.conditionalField}>
                <label style={styles.label}>List Unidentified Hazards</label>
                <textarea name="unidentified_hazards" value={formData.unidentified_hazards} onChange={handleChange} placeholder="Describe hazards that were not properly identified..." style={styles.textarea} />
              </div>
            )}

            <RadioGroup label="Is the THA/JSA posted at the work site?" name="tha_jsa_posted" options={['Yes', 'No', 'N/A']} />
            <RadioGroup label="Are employees complying with THA/JSA?" name="employees_complying_tha" />
            <RadioGroup label="Are adequate fire extinguishers readily available?" name="fire_extinguishers" />
            <RadioGroup label="Is adequate emergency eye wash available?" name="emergency_eye_wash" />
            <RadioGroup label="Emergency evacuation routes & safe areas designated?" name="emergency_evacuation" />
            <RadioGroup label="Are employees familiar with area alarms?" name="familiar_with_alarms" />
            <RadioGroup label="Adequate PPE being used appropriately?" name="adequate_ppe" />
            <RadioGroup label="Adequate Spill Prevention & Control in Place?" name="spill_prevention" />

            {/* Opportunities for Improvement */}
            <div style={{ ...styles.sectionHeader, backgroundColor: '#059669' }}>💡 Opportunities & Recognition</div>
            <div style={styles.fullWidth}>
              <label style={styles.label}>Any opportunities for improvement or recognition?</label>
              <textarea name="opportunities_improvement" value={formData.opportunities_improvement} onChange={handleChange} placeholder="Note any safety improvements needed, positive observations, or recognition for crew members..." style={styles.textarea} />
            </div>

            {/* Photo Documentation */}
            <div style={{ ...styles.sectionHeader, backgroundColor: '#1e3a8a' }}>📷 Photo Documentation</div>
            <div style={styles.fullWidth}>
              <label style={styles.label}>Photo (Optional)</label>
              <div style={styles.photoUpload}>
                <input type="file" accept="image/*" multiple onChange={handlePhotoChange} style={{ display: 'none' }} id="photoInput" />
                <label htmlFor="photoInput" style={{ cursor: 'pointer' }}><p>📷 Tap to take or upload photo</p></label>
              </div>
              {photos.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' }}>
                  {photos.map((photo, index) => (
                    <div key={index} style={{ position: 'relative' }}>
                      <img src={URL.createObjectURL(photo)} alt={`Preview ${index + 1}`} style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '4px' }} />
                      <button type="button" onClick={() => removePhoto(index)} style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', fontSize: '12px' }}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {submitStatus && submitStatus.startsWith('error') && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '15px', marginTop: '15px', color: '#991b1b' }}>
                <strong>Error:</strong> {submitStatus.replace('error: ', '')}
              </div>
            )}

            <button type="submit" disabled={isSubmitting} style={{ ...styles.submitBtn, opacity: isSubmitting ? 0.6 : 1 }}>
              {isSubmitting ? 'Submitting...' : 'Submit Location Audit'}
            </button>
          </form>
        </div>

        <div style={styles.footer}>
          <span style={{ color: '#1e3a5f', fontWeight: '500' }}>Powered by Predictive Safety Analytics™</span>
          <span style={{ color: '#94a3b8', margin: '0 8px' }}>|</span>
          <span style={{ color: '#475569' }}>© 2025 SLP Alaska</span>
        </div>
      </div>
    </div>
  );
}

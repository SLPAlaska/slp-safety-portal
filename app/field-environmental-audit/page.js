'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://iypezirwdlqpptjpeeyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
);

const COMPANIES = ['A-C Electric','AKE-Line','Apache Corp.','Armstrong Oil & Gas','ASRC Energy Services','CCI- Industrial','Chosen Construction','CINGSA','Coho Enterprises','Conam Construction','ConocoPhillips','Five Star Oilfield Services','Fox Energy Services','G.A. West','GBR Equipment','GLM Energy Services','Graham Industrial Coatings','Harvest Midstream','Hilcorp Alaska','MagTec Alaska','Merkes Builders','Nordic-Calista','Parker TRS','Peninsula Paving','Pollard Wireline','Ridgeline Oilfield Services','Santos','Summit Excavation','Tesoro Refinery','Yellowjacket','Other'];

const LOCATIONS = ['Kenai','CIO','Beaver Creek','Swanson River','Ninilchik','Nikiski','Other Kenai Asset','Deadhorse','Prudhoe Bay','Kuparuk','Alpine','Willow','ENI','PIKKA','Point Thompson','North Star Island','Endicott','Badami','Other North Slope'];

const AUDIT_OPTIONS = ['Yes', 'No', 'Needs Improvement', 'N/A'];

export default function FieldEnvironmentalAuditForm() {
  const [formData, setFormData] = useState({
    auditor_name: '',
    date: new Date().toISOString().split('T')[0],
    company: '',
    location: '',
    specific_location: '',
    weather_conditions: '',
    spill_prevention: '',
    spill_prevention_notes: '',
    waste_management: '',
    waste_management_notes: '',
    secondary_containment: '',
    secondary_containment_notes: '',
    hazmat_storage: '',
    hazmat_storage_notes: '',
    stormwater_controls: '',
    stormwater_controls_notes: '',
    dust_control: '',
    dust_control_notes: '',
    wildlife_protection: '',
    wildlife_protection_notes: '',
    permits_current: '',
    permits_notes: '',
    positive_observations: '',
    corrective_actions: '',
    additional_notes: ''
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
      const fileName = `field-environmental-audit/${Date.now()}-${photo.name}`;
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

      const { error } = await supabase.from('field_environmental_audits').insert([submitData]).select();

      if (error) throw error;

      setSubmitStatus('success');
      setFormData({
        auditor_name: '', date: new Date().toISOString().split('T')[0], company: '', location: '',
        specific_location: '', weather_conditions: '', spill_prevention: '', spill_prevention_notes: '',
        waste_management: '', waste_management_notes: '', secondary_containment: '', secondary_containment_notes: '',
        hazmat_storage: '', hazmat_storage_notes: '', stormwater_controls: '', stormwater_controls_notes: '',
        dust_control: '', dust_control_notes: '', wildlife_protection: '', wildlife_protection_notes: '',
        permits_current: '', permits_notes: '', positive_observations: '', corrective_actions: '', additional_notes: ''
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
    header: { background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', color: '#fff', padding: '25px', textAlign: 'center' },
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
    infoBox: { background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: '6px', padding: '12px', marginBottom: '15px', fontSize: '12px', color: '#047857' },
    photoUpload: { border: '2px dashed #d1d5db', borderRadius: '8px', padding: '25px', textAlign: 'center', cursor: 'pointer' },
    submitBtn: { width: '100%', padding: '14px', background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', marginTop: '15px' },
    successMessage: { background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', color: '#fff', padding: '25px', borderRadius: '8px', textAlign: 'center', marginTop: '15px' },
    footer: { textAlign: 'center', padding: '20px 10px', marginTop: '30px', borderTop: '1px solid #e2e8f0', fontSize: '11px', color: '#64748b' }
  };

  const RadioGroup = ({ label, name, notesName, options = AUDIT_OPTIONS, required = true }) => (
    <div style={styles.auditQuestion}>
      <label style={{ ...styles.label, marginBottom: '10px', fontSize: '14px' }}>{label} {required && <span style={{ color: '#dc2626' }}>*</span>}</label>
      <div style={styles.radioGroup}>
        {options.map(opt => (
          <label key={opt} style={{ ...styles.radioOption, borderColor: formData[name] === opt ? '#059669' : '#d1d5db', background: formData[name] === opt ? 'rgba(5,150,105,0.05)' : '#fff' }}>
            <input type="radio" name={name} value={opt} checked={formData[name] === opt} onChange={handleChange} required={required} style={{ width: '16px', height: '16px' }} />
            <span>{opt}</span>
          </label>
        ))}
      </div>
      {notesName && (formData[name] === 'No' || formData[name] === 'Needs Improvement') && (
        <div style={{ marginTop: '10px' }}>
          <input type="text" name={notesName} value={formData[notesName]} onChange={handleChange} placeholder="Describe the issue..." style={styles.input} />
        </div>
      )}
    </div>
  );

  if (submitStatus === 'success') {
    return (
      <div style={{ padding: '20px', backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
        <a href="/" style={{ display: 'inline-block', marginBottom: '15px', padding: '10px 20px', backgroundColor: '#1e3a5f', color: '#fff', textDecoration: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '500' }}>← Back to Portal</a>
        <div style={styles.container}>
          <div style={styles.header}>
            <img src="/Logo.png" alt="SLP Alaska" style={{ maxWidth: '180px', margin: '0 auto 15px auto', display: 'block' }} />
            <h1 style={{ margin: 0, fontSize: '24px' }}>Field Environmental Audit</h1>
          </div>
          <div style={styles.formContent}>
            <div style={styles.successMessage}>
              <h2>✓ Environmental Audit Submitted!</h2>
              <p>Thank you for conducting this environmental audit.</p>
              <button onClick={() => setSubmitStatus(null)} style={{ ...styles.submitBtn, background: '#fff', color: '#059669', marginTop: '10px' }}>Start New Audit</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
      <a href="/" style={{ display: 'inline-block', marginBottom: '15px', padding: '10px 20px', backgroundColor: '#1e3a5f', color: '#fff', textDecoration: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '500' }}>← Back to Portal</a>
      <div style={styles.container}>
        <div style={styles.header}>
          <img src="/Logo.png" alt="SLP Alaska" style={{ maxWidth: '180px', margin: '0 auto 15px auto', display: 'block' }} />
          <h1 style={{ margin: 0, fontSize: '24px' }}>Field Environmental Audit</h1>
          <p style={{ margin: '8px 0 0', opacity: 0.9, fontSize: '13px' }}>Environmental Compliance Field Assessment</p>
          <div style={{ display: 'inline-block', background: '#fff', color: '#059669', padding: '4px 12px', borderRadius: '15px', fontSize: '11px', fontWeight: '600', marginTop: '8px' }}>🌿 ENVIRONMENTAL AUDIT</div>
        </div>

        <div style={styles.formContent}>
          <form onSubmit={handleSubmit}>
            <div style={{ ...styles.sectionHeader, backgroundColor: '#059669', marginTop: 0 }}>👤 Auditor Information</div>
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

            <div style={{ ...styles.sectionHeader, backgroundColor: '#ea580c' }}>📍 Location Information</div>
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
            <div style={styles.row}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Specific Location</label>
                <input type="text" name="specific_location" value={formData.specific_location} onChange={handleChange} placeholder="Building, pad, well site, etc." style={styles.input} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Weather Conditions</label>
                <input type="text" name="weather_conditions" value={formData.weather_conditions} onChange={handleChange} placeholder="e.g., Clear, 45°F, Light Wind" style={styles.input} />
              </div>
            </div>

            <div style={{ ...styles.sectionHeader, backgroundColor: '#1e3a8a' }}>🔍 Environmental Audit Questions</div>
            <div style={styles.infoBox}>Answer each question based on your field observations. Select "Needs Improvement" when partial compliance is observed.</div>

            <RadioGroup label="Spill Prevention & Control measures in place?" name="spill_prevention" notesName="spill_prevention_notes" />
            <RadioGroup label="Waste Management - proper storage, labeling, disposal?" name="waste_management" notesName="waste_management_notes" />
            <RadioGroup label="Secondary Containment adequate and maintained?" name="secondary_containment" notesName="secondary_containment_notes" />
            <RadioGroup label="Hazardous Materials properly stored and labeled?" name="hazmat_storage" notesName="hazmat_storage_notes" />
            <RadioGroup label="Stormwater controls in place and functional?" name="stormwater_controls" notesName="stormwater_controls_notes" />
            <RadioGroup label="Dust control measures adequate?" name="dust_control" notesName="dust_control_notes" />
            <RadioGroup label="Wildlife protection measures in place?" name="wildlife_protection" notesName="wildlife_protection_notes" />
            <RadioGroup label="Environmental permits current and posted?" name="permits_current" notesName="permits_notes" />

            <div style={{ ...styles.sectionHeader, backgroundColor: '#059669' }}>💡 Observations & Actions</div>
            <div style={styles.fullWidth}>
              <label style={styles.label}>Positive Observations</label>
              <textarea name="positive_observations" value={formData.positive_observations} onChange={handleChange} placeholder="Note any positive environmental practices observed..." style={styles.textarea} />
            </div>
            <div style={styles.fullWidth}>
              <label style={styles.label}>Corrective Actions Required</label>
              <textarea name="corrective_actions" value={formData.corrective_actions} onChange={handleChange} placeholder="List any corrective actions needed..." style={styles.textarea} />
            </div>
            <div style={styles.fullWidth}>
              <label style={styles.label}>Additional Notes</label>
              <textarea name="additional_notes" value={formData.additional_notes} onChange={handleChange} placeholder="Any other observations or comments..." style={styles.textarea} />
            </div>

            <div style={{ ...styles.sectionHeader, backgroundColor: '#7c3aed' }}>📷 Photo Documentation</div>
            <div style={styles.fullWidth}>
              <label style={styles.label}>Photos (Optional)</label>
              <div style={styles.photoUpload}>
                <input type="file" accept="image/*" multiple onChange={handlePhotoChange} style={{ display: 'none' }} id="photoInput" />
                <label htmlFor="photoInput" style={{ cursor: 'pointer' }}><p>📷 Tap to take or upload photos</p></label>
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
              {isSubmitting ? 'Submitting...' : 'Submit Environmental Audit'}
            </button>
          </form>
        </div>

        <div style={styles.footer}>
          <span style={{ color: '#1e3a5f', fontWeight: '500' }}>AnthroSafe™ Powered by Field Driven Data™</span>
          <span style={{ color: '#94a3b8', margin: '0 8px' }}>|</span>
          <span style={{ color: '#475569' }}>© 2025 SLP Alaska</span>
        </div>
      </div>
    </div>
  );
}

'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://iypezirwdlqpptjpeeyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
);

const COMPANIES = [
  'A-C Electric', 'AKE-Line', 'Apache Corp.', 'Armstrong Oil & Gas', 'ASRC Energy Services',
  'CCI- Industrial', 'Chosen Construction', 'CINGSA', 'Coho Enterprises', 'Conam Construction',
  'ConocoPhillips', 'Five Star Oilfield Services', 'Fox Energy Services', 'G.A. West',
  'GBR Equipment', 'GLM Energy Services', 'Graham Industrial Coatings', 'Harvest Midstream',
  'Hilcorp Alaska', 'MagTec Alaska', 'Merkes Builders', 'Nordic-Calista', 'Parker TRS',
  'Peninsula Paving', 'Pollard Wireline', 'Ridgeline Oilfield Services', 'Santos',
  'Summit Excavation', 'Tesoro Refinery', 'Yellowjacket', 'Other'
];

const LOCATIONS = [
  'Kenai', 'CIO', 'Beaver Creek', 'Swanson River', 'Ninilchik', 'Nikiski', 'Other Kenai Asset',
  'Deadhorse', 'Prudhoe Bay', 'Kuparuk', 'Alpine', 'Willow', 'ENI', 'PIKKA',
  'Point Thompson', 'North Star Island', 'Endicott', 'Badami', 'Other North Slope'
];

const ENERGY_TYPES = [
  { value: 'Gravity', label: 'Gravity (falls, dropped objects)' },
  { value: 'Motion', label: 'Motion (vehicles, struck-by)' },
  { value: 'Mechanical', label: 'Mechanical (rotating, pinch points)' },
  { value: 'Electrical', label: 'Electrical (shock, arc flash)' },
  { value: 'Pressure', label: 'Pressure (hydraulic, pneumatic)' },
  { value: 'Chemical', label: 'Chemical (H2S, toxic, flammable)' },
  { value: 'Temperature', label: 'Temperature (burns, cold stress)' },
  { value: 'Other', label: 'Other high-energy source' }
];

export default function GoodCatchNearMissForm() {
  const [formData, setFormData] = useState({
    reporter_name: '',
    date: new Date().toISOString().split('T')[0],
    company: '',
    location: '',
    report_type: '',
    description: '',
    potential_consequences: '',
    high_energy_present: '',
    energy_release_occurred: '',
    direct_control_present: '',
    energy_types: [],
    psif_classification: '',
    stky_event: '',
    immediate_actions: '',
    recommended_actions: '',
    additional_notes: ''
  });

  const [photos, setPhotos] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEnergyTypeChange = (value) => {
    setFormData(prev => {
      const current = prev.energy_types;
      if (current.includes(value)) {
        return { ...prev, energy_types: current.filter(v => v !== value) };
      } else {
        return { ...prev, energy_types: [...current, value] };
      }
    });
  };

  const updatePSIF = (field, value) => {
    const newData = { ...formData, [field]: value };
    
    const isHighEnergy = newData.high_energy_present === 'Yes';
    const hadRelease = newData.energy_release_occurred === 'Yes';
    const hasDirectControl = newData.direct_control_present === 'Yes';
    const noControls = newData.direct_control_present === 'No-None';

    let psif = '';
    let stky = '';

    if (newData.high_energy_present && newData.energy_release_occurred && newData.direct_control_present) {
      if (isHighEnergy && hadRelease && noControls) {
        psif = 'PSIF-Critical';
        stky = 'Yes';
      } else if (isHighEnergy && hadRelease && !hasDirectControl) {
        psif = 'PSIF-High';
        stky = 'Yes';
      } else if (isHighEnergy && !hadRelease && !hasDirectControl) {
        psif = 'PSIF-Elevated';
        stky = 'Yes';
      } else if (isHighEnergy && hasDirectControl) {
        psif = 'STKY-Controlled';
        stky = 'Yes';
      } else {
        psif = 'Non-STKY';
        stky = 'No';
      }
    }

    setFormData({ ...newData, psif_classification: psif, stky_event: stky });
  };

  const getPSIFStyle = () => {
    switch (formData.psif_classification) {
      case 'PSIF-Critical':
        return { bg: '#fee2e2', border: '#dc2626', badgeBg: '#dc2626', text: 'High energy release with NO controls. Requires immediate escalation.' };
      case 'PSIF-High':
        return { bg: '#ffedd5', border: '#ea580c', badgeBg: '#ea580c', text: 'High energy release with only alternative controls. Direct controls needed.' };
      case 'PSIF-Elevated':
        return { bg: '#fef3c7', border: '#f59e0b', badgeBg: '#f59e0b', text: 'High energy present without direct controls. Good catch - controls need improvement.' };
      case 'STKY-Controlled':
        return { bg: '#d1fae5', border: '#059669', badgeBg: '#059669', text: 'High energy hazard with direct controls in place. System working as intended.' };
      case 'Non-STKY':
        return { bg: '#dbeafe', border: '#3b82f6', badgeBg: '#3b82f6', text: 'Lower energy event. Standard follow-up procedures apply.' };
      default:
        return null;
    }
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
      const fileName = `good-catch/${Date.now()}-${photo.name}`;
      const { data, error } = await supabase.storage.from('safety-photos').upload(fileName, photo);
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

      const submitData = {
        reporter_name: formData.reporter_name || null,
        date: formData.date || null,
        company: formData.company || null,
        location: formData.location || null,
        report_type: formData.report_type || null,
        description: formData.description || null,
        potential_consequences: formData.potential_consequences || null,
        high_energy_present: formData.high_energy_present || null,
        energy_release_occurred: formData.energy_release_occurred || null,
        direct_control_present: formData.direct_control_present || null,
        energy_types: formData.energy_types.length > 0 ? formData.energy_types.join(', ') : null,
        psif_classification: formData.psif_classification || null,
        stky_event: formData.stky_event || null,
        immediate_actions: formData.immediate_actions || null,
        recommended_actions: formData.recommended_actions || null,
        additional_notes: formData.additional_notes || null,
        photo_urls: photoUrls.length > 0 ? photoUrls : null
      };

      const { data, error } = await supabase.from('good_catch_near_miss').insert([submitData]).select();

      if (error) throw error;

      setSubmitStatus('success');
      setFormData({
        reporter_name: '', date: new Date().toISOString().split('T')[0], company: '', location: '',
        report_type: '', description: '', potential_consequences: '', high_energy_present: '',
        energy_release_occurred: '', direct_control_present: '', energy_types: [],
        psif_classification: '', stky_event: '', immediate_actions: '', recommended_actions: '', additional_notes: ''
      });
      setPhotos([]);
    } catch (error) {
      setSubmitStatus('error: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const styles = {
    container: { maxWidth: '800px', margin: '0 auto', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', overflow: 'hidden', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
    header: { background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', color: '#fff', padding: '30px', textAlign: 'center' },
    headerTitle: { margin: '0', fontSize: '26px', fontWeight: '700' },
    headerSubtitle: { margin: '10px 0 0', opacity: '0.9', fontSize: '14px' },
    badge: { display: 'inline-block', background: '#fff', color: '#059669', padding: '5px 15px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', marginTop: '10px' },
    formContent: { padding: '30px' },
    sectionHeader: { padding: '12px 20px', margin: '25px -30px 20px', fontWeight: '600', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '10px', color: '#fff' },
    row: { display: 'flex', gap: '20px', flexWrap: 'wrap' },
    formGroup: { flex: '1', minWidth: '200px', marginBottom: '20px' },
    label: { display: 'block', marginBottom: '6px', fontWeight: '500', color: '#1f2937', fontSize: '14px' },
    input: { width: '100%', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box' },
    select: { width: '100%', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box', backgroundColor: '#fff' },
    textarea: { width: '100%', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px', minHeight: '100px', resize: 'vertical', boxSizing: 'border-box' },
    infoBox: { background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '15px', marginBottom: '20px', fontSize: '13px', color: '#065f46' },
    infoBoxWarning: { background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '8px', padding: '15px', marginBottom: '20px', fontSize: '13px', color: '#92400e' },
    reportTypeSelector: { display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' },
    reportTypeOption: { flex: '1', minWidth: '200px', padding: '20px', border: '3px solid #d1d5db', borderRadius: '12px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' },
    photoUpload: { border: '2px dashed #d1d5db', borderRadius: '8px', padding: '30px', textAlign: 'center', cursor: 'pointer' },
    photoPreview: { display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' },
    photoThumb: { width: '80px', height: '80px', objectFit: 'cover', borderRadius: '4px' },
    submitBtn: { width: '100%', padding: '16px', background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '18px', fontWeight: '600', cursor: 'pointer', marginTop: '20px' },
    successMessage: { background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', color: '#fff', padding: '30px', borderRadius: '8px', textAlign: 'center', marginTop: '20px' },
    footer: { textAlign: 'center', padding: '20px 10px', marginTop: '30px', borderTop: '1px solid #e2e8f0', fontSize: '11px', color: '#64748b', background: 'linear-gradient(to bottom, #f8fafc, #ffffff)' }
  };

  const psifStyle = getPSIFStyle();

  if (submitStatus === 'success') {
    return (
      <div style={{ padding: '20px', backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
        <a href="/" style={{ display: 'inline-block', marginBottom: '15px', padding: '10px 20px', backgroundColor: '#1e3a5f', color: '#fff', textDecoration: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '500' }}>← Back to Portal</a>
        <div style={styles.container}>
          <div style={styles.header}>
            <img src="/Logo.png" alt="SLP Alaska" style={{ maxWidth: '180px', margin: '0 auto 15px auto', display: 'block' }} />
            <h1 style={styles.headerTitle}>Good Catch / Near Miss Report</h1>
          </div>
          <div style={styles.formContent}>
            <div style={styles.successMessage}>
              <h2>✓ Report Submitted Successfully!</h2>
              <p>Thank you for your safety observation. Your report helps keep everyone safe.</p>
              <button onClick={() => setSubmitStatus(null)} style={{ ...styles.submitBtn, background: '#fff', color: '#059669', marginTop: '15px' }}>Submit Another Report</button>
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
          <h1 style={styles.headerTitle}>Good Catch / Near Miss Report</h1>
          <p style={styles.headerSubtitle}>Report Safety Observations to Help Prevent Incidents</p>
          <div style={styles.badge}>🛡️ PROACTIVE SAFETY REPORTING</div>
        </div>

        <div style={styles.formContent}>
          <form onSubmit={handleSubmit}>
            <div style={{ ...styles.sectionHeader, backgroundColor: '#059669', marginTop: '0' }}>👤 Reporter Information</div>
            <div style={styles.row}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Your Name <span style={{ color: '#dc2626' }}>*</span></label>
                <input type="text" name="reporter_name" value={formData.reporter_name} onChange={handleChange} required style={styles.input} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Date of Observation <span style={{ color: '#dc2626' }}>*</span></label>
                <input type="date" name="date" value={formData.date} onChange={handleChange} required style={styles.input} />
              </div>
            </div>
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

            <div style={{ ...styles.sectionHeader, backgroundColor: '#1e3a8a' }}>📋 Report Type</div>
            <div style={styles.infoBox}>
              <strong>Good Catch:</strong> A potential hazard or unsafe condition that was identified and corrected before an incident occurred.<br />
              <strong>Near Miss:</strong> An unplanned event that did not result in injury or damage but had the potential to do so.
            </div>
            <div style={styles.reportTypeSelector}>
              <div onClick={() => setFormData(prev => ({ ...prev, report_type: 'Good Catch' }))} style={{ ...styles.reportTypeOption, borderColor: formData.report_type === 'Good Catch' ? '#059669' : '#d1d5db', background: formData.report_type === 'Good Catch' ? 'rgba(5, 150, 105, 0.05)' : '#fff' }}>
                <div style={{ fontSize: '36px', marginBottom: '10px' }}>✅</div>
                <div style={{ fontWeight: '600', fontSize: '16px', marginBottom: '5px' }}>Good Catch</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Hazard identified & corrected before incident</div>
              </div>
              <div onClick={() => setFormData(prev => ({ ...prev, report_type: 'Near Miss' }))} style={{ ...styles.reportTypeOption, borderColor: formData.report_type === 'Near Miss' ? '#f59e0b' : '#d1d5db', background: formData.report_type === 'Near Miss' ? 'rgba(245, 158, 11, 0.05)' : '#fff' }}>
                <div style={{ fontSize: '36px', marginBottom: '10px' }}>⚠️</div>
                <div style={{ fontWeight: '600', fontSize: '16px', marginBottom: '5px' }}>Near Miss</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Event that could have caused harm but didn't</div>
              </div>
            </div>

            <div style={{ ...styles.sectionHeader, backgroundColor: '#ea580c' }}>📝 Observation Details</div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Description of Observation <span style={{ color: '#dc2626' }}>*</span></label>
              <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Describe what you observed in detail..." required style={styles.textarea} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Potential Consequences <span style={{ color: '#dc2626' }}>*</span></label>
              <textarea name="potential_consequences" value={formData.potential_consequences} onChange={handleChange} placeholder="What could have happened if this wasn't caught or addressed?" required style={styles.textarea} />
            </div>

            <div style={{ ...styles.sectionHeader, backgroundColor: '#dc2626' }}>⚠️ SIF Potential Assessment</div>
            <div style={styles.infoBoxWarning}>
              <strong>STKY = Stuff That Kills You</strong><br />
              Help us identify events with serious injury or fatality potential, even if no one was hurt.
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>1. Was HIGH ENERGY present? <span style={{ color: '#dc2626' }}>*</span></label>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 8px 0' }}>(Falls/gravity, vehicles/motion, electrical, pressure, chemical, rotating equipment, temperature extremes)</p>
              <div style={{ display: 'flex', gap: '20px' }}>
                <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input type="radio" name="high_energy_present" value="Yes" checked={formData.high_energy_present === 'Yes'} onChange={(e) => updatePSIF('high_energy_present', e.target.value)} required /> Yes
                </label>
                <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input type="radio" name="high_energy_present" value="No" checked={formData.high_energy_present === 'No'} onChange={(e) => updatePSIF('high_energy_present', e.target.value)} /> No
                </label>
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>2. Did an uncontrolled energy release occur? <span style={{ color: '#dc2626' }}>*</span></label>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 8px 0' }}>(Object fell, contact made, pressure released, exposure occurred, vehicle struck something, etc.)</p>
              <div style={{ display: 'flex', gap: '20px' }}>
                <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input type="radio" name="energy_release_occurred" value="Yes" checked={formData.energy_release_occurred === 'Yes'} onChange={(e) => updatePSIF('energy_release_occurred', e.target.value)} required /> Yes
                </label>
                <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input type="radio" name="energy_release_occurred" value="No" checked={formData.energy_release_occurred === 'No'} onChange={(e) => updatePSIF('energy_release_occurred', e.target.value)} /> No
                </label>
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>3. Was a DIRECT CONTROL in place? <span style={{ color: '#dc2626' }}>*</span></label>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 8px 0' }}>Direct Controls = Barriers that work even if someone makes a mistake (guards, lockout, barricades, isolation)</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input type="radio" name="direct_control_present" value="Yes" checked={formData.direct_control_present === 'Yes'} onChange={(e) => updatePSIF('direct_control_present', e.target.value)} required /> Yes - Direct control was in place
                </label>
                <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input type="radio" name="direct_control_present" value="No-Alternative" checked={formData.direct_control_present === 'No-Alternative'} onChange={(e) => updatePSIF('direct_control_present', e.target.value)} /> No - Only alternative controls (PPE, procedures, training, warnings)
                </label>
                <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input type="radio" name="direct_control_present" value="No-None" checked={formData.direct_control_present === 'No-None'} onChange={(e) => updatePSIF('direct_control_present', e.target.value)} /> No controls were in place
                </label>
              </div>
            </div>

            {formData.high_energy_present === 'Yes' && (
              <div style={styles.formGroup}>
                <label style={styles.label}>4. What type(s) of energy were involved? (Select all that apply)</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginTop: '8px' }}>
                  {ENERGY_TYPES.map(et => (
                    <label key={et.value} style={{ cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input type="checkbox" checked={formData.energy_types.includes(et.value)} onChange={() => handleEnergyTypeChange(et.value)} /> {et.label}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {psifStyle && (
              <div style={{ padding: '15px', borderRadius: '8px', margin: '15px 0', background: psifStyle.bg, border: `2px solid ${psifStyle.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ padding: '8px 16px', borderRadius: '6px', fontWeight: '700', fontSize: '14px', background: psifStyle.badgeBg, color: '#fff' }}>{formData.psif_classification}</span>
                  <span style={{ fontSize: '13px', color: '#4b5563' }}>{psifStyle.text}</span>
                </div>
              </div>
            )}

            <div style={{ ...styles.sectionHeader, backgroundColor: '#7c3aed' }}>🔧 Actions & Recommendations</div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Immediate Actions Taken</label>
              <textarea name="immediate_actions" value={formData.immediate_actions} onChange={handleChange} placeholder="What actions were taken immediately to address the situation?" style={styles.textarea} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Recommended Corrective Actions</label>
              <textarea name="recommended_actions" value={formData.recommended_actions} onChange={handleChange} placeholder="What additional actions should be taken to prevent recurrence?" style={styles.textarea} />
            </div>

            <div style={{ ...styles.sectionHeader, backgroundColor: '#1e3a8a' }}>📎 Additional Information</div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Additional Notes</label>
              <textarea name="additional_notes" value={formData.additional_notes} onChange={handleChange} placeholder="Any other relevant information..." style={styles.textarea} />
            </div>

            <div style={{ ...styles.sectionHeader, backgroundColor: '#059669' }}>📷 Photo Documentation</div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Photo (Optional but Recommended)</label>
              <div style={styles.photoUpload}>
                <input type="file" accept="image/*" multiple onChange={handlePhotoChange} style={{ display: 'none' }} id="photoInput" />
                <label htmlFor="photoInput" style={{ cursor: 'pointer' }}>
                  <p>📷 Tap to take or upload photos</p>
                  <p style={{ fontSize: '12px', color: '#6b7280' }}>Photos help others understand the observation</p>
                </label>
              </div>
              {photos.length > 0 && (
                <div style={styles.photoPreview}>
                  {photos.map((photo, index) => (
                    <div key={index} style={{ position: 'relative' }}>
                      <img src={URL.createObjectURL(photo)} alt={`Preview ${index + 1}`} style={styles.photoThumb} />
                      <button type="button" onClick={() => removePhoto(index)} style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', fontSize: '12px' }}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {submitStatus && submitStatus.startsWith('error') && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '15px', marginTop: '20px', color: '#991b1b' }}>
                <strong>Error:</strong> {submitStatus.replace('error: ', '')}
              </div>
            )}

            <button type="submit" disabled={isSubmitting} style={{ ...styles.submitBtn, opacity: isSubmitting ? 0.6 : 1 }}>
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
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

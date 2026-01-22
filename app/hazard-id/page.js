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
  { value: 'Gravity', label: 'Gravity (falls, drops, collapse)' },
  { value: 'Motion', label: 'Motion (vehicles, moving equipment)' },
  { value: 'Mechanical', label: 'Mechanical (rotating, pinch points)' },
  { value: 'Electrical', label: 'Electrical (shock, arc flash)' },
  { value: 'Pressure', label: 'Pressure (hydraulic, pneumatic)' },
  { value: 'Chemical', label: 'Chemical (toxic, corrosive, flammable)' },
  { value: 'Temperature', label: 'Temperature (burns, cold exposure)' },
  { value: 'Other', label: 'Other high-energy source' }
];

const DIRECT_CONTROL_OPTIONS = [
  { value: 'Yes-Effective', label: 'Yes - Effective direct controls in place' },
  { value: 'Yes-Inadequate', label: 'Yes - But controls are inadequate' },
  { value: 'No-Alternative', label: 'No - Only alternative controls (PPE, procedures, warnings)' },
  { value: 'No-None', label: 'No - No controls in place' }
];

export default function HazardIDForm() {
  const [formData, setFormData] = useState({
    reporter_name: '',
    company: '',
    location: '',
    date: new Date().toISOString().split('T')[0],
    specific_location: '',
    hazard_description: '',
    potential_consequences: '',
    near_miss: '',
    threat_level: '',
    high_energy_present: '',
    energy_types: [],
    energy_release_occurred: '',
    direct_control_status: '',
    psif_classification: '',
    stky_event: '',
    immediate_actions: '',
    additional_action_necessary: '',
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

  const updateSTKYClassification = (field, value) => {
    const newData = { ...formData, [field]: value };
    const highEnergy = newData.high_energy_present;
    const energyRelease = newData.energy_release_occurred;
    const directControl = newData.direct_control_status;

    let classification = '';
    let stky = '';

    if (highEnergy === 'No') {
      classification = 'Non-STKY';
      stky = 'No';
    } else if (highEnergy === 'Yes') {
      stky = 'Yes';

      if (directControl === 'No-None') {
        classification = 'PSIF-Critical';
      } else if (directControl === 'Yes-Inadequate') {
        classification = 'PSIF-Critical';
      } else if (directControl === 'No-Alternative') {
        if (energyRelease === 'Yes') {
          classification = 'PSIF-High';
        } else {
          classification = 'PSIF-Elevated';
        }
      } else if (directControl === 'Yes-Effective') {
        classification = 'STKY-Controlled';
      } else {
        classification = 'STKY-Pending';
      }
    }

    setFormData({ ...newData, psif_classification: classification, stky_event: stky });
  };

  const getPSIFStyle = () => {
    switch (formData.psif_classification) {
      case 'PSIF-Critical':
        return { bg: '#fee2e2', border: '#dc2626', badgeBg: '#dc2626', text: 'CRITICAL: High energy hazard with NO controls or inadequate controls' };
      case 'PSIF-High':
        return { bg: '#ffedd5', border: '#ea580c', badgeBg: '#ea580c', text: 'High energy could be released - only PPE/procedures in place' };
      case 'PSIF-Elevated':
        return { bg: '#fef3c7', border: '#f59e0b', badgeBg: '#f59e0b', text: 'High energy hazard - relying on alternative controls only' };
      case 'STKY-Controlled':
        return { bg: '#d1fae5', border: '#059669', badgeBg: '#059669', text: 'High energy hazard with effective direct controls' };
      case 'STKY-Pending':
        return { bg: '#fef3c7', border: '#f59e0b', badgeBg: '#f59e0b', text: 'High energy identified - complete assessment' };
      case 'Non-STKY':
        return { bg: '#dbeafe', border: '#3b82f6', badgeBg: '#3b82f6', text: 'Low energy hazard - not a SIF precursor' };
      default:
        return null;
    }
  };

  const getThreatStyle = (level) => {
    const styles = {
      Low: { color: '#059669', bg: 'rgba(5, 150, 105, 0.1)', border: '#059669', icon: '🟢' },
      Medium: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', border: '#f59e0b', icon: '🟡' },
      High: { color: '#ea580c', bg: 'rgba(234, 88, 12, 0.1)', border: '#ea580c', icon: '🟠' },
      Critical: { color: '#dc2626', bg: 'rgba(220, 38, 38, 0.1)', border: '#dc2626', icon: '🔴' }
    };
    return styles[level] || { color: '#d1d5db', bg: '#fff', border: '#d1d5db', icon: '' };
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
      const fileName = `hazard-id/${Date.now()}-${photo.name}`;
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

      const submitData = {
        reporter_name: formData.reporter_name || null,
        company: formData.company || null,
        location: formData.location || null,
        date: formData.date || null,
        specific_location: formData.specific_location || null,
        hazard_description: formData.hazard_description || null,
        potential_consequences: formData.potential_consequences || null,
        near_miss: formData.near_miss || null,
        threat_level: formData.threat_level || null,
        high_energy_present: formData.high_energy_present || null,
        energy_types: formData.energy_types.length > 0 ? formData.energy_types.join(', ') : null,
        energy_release_occurred: formData.energy_release_occurred || null,
        direct_control_status: formData.direct_control_status || null,
        psif_classification: formData.psif_classification || null,
        stky_event: formData.stky_event || null,
        immediate_actions: formData.immediate_actions || null,
        additional_action_necessary: formData.additional_action_necessary || null,
        recommended_actions: formData.recommended_actions || null,
        additional_notes: formData.additional_notes || null,
        photo_urls: photoUrls.length > 0 ? photoUrls : null
      };

      const { error } = await supabase.from('hazard_id_reports').insert([submitData]).select();

      if (error) throw error;

      setSubmitStatus('success');
      setFormData({
        reporter_name: '', company: '', location: '', date: new Date().toISOString().split('T')[0],
        specific_location: '', hazard_description: '', potential_consequences: '', near_miss: '',
        threat_level: '', high_energy_present: '', energy_types: [], energy_release_occurred: '',
        direct_control_status: '', psif_classification: '', stky_event: '', immediate_actions: '',
        additional_action_necessary: '', recommended_actions: '', additional_notes: ''
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
    header: { background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)', color: '#fff', padding: '30px', textAlign: 'center' },
    formContent: { padding: '30px' },
    sectionHeader: { padding: '12px 20px', margin: '25px -30px 20px', fontWeight: '600', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '10px', color: '#fff' },
    row: { display: 'flex', gap: '20px', flexWrap: 'wrap' },
    formGroup: { flex: '1', minWidth: '200px', marginBottom: '20px' },
    label: { display: 'block', marginBottom: '6px', fontWeight: '500', color: '#1f2937', fontSize: '14px' },
    input: { width: '100%', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box' },
    select: { width: '100%', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box', backgroundColor: '#fff' },
    textarea: { width: '100%', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px', minHeight: '100px', resize: 'vertical', boxSizing: 'border-box' },
    radioGroup: { display: 'flex', gap: '15px', flexWrap: 'wrap' },
    radioOption: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', border: '2px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' },
    threatSelector: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' },
    infoBox: { background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '8px', padding: '15px', marginBottom: '20px', fontSize: '13px', color: '#92400e' },
    energyCheckboxGroup: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginTop: '10px' },
    photoUpload: { border: '2px dashed #d1d5db', borderRadius: '8px', padding: '30px', textAlign: 'center', cursor: 'pointer' },
    photoPreview: { display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' },
    photoThumb: { width: '80px', height: '80px', objectFit: 'cover', borderRadius: '4px' },
    submitBtn: { width: '100%', padding: '16px', background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '18px', fontWeight: '600', cursor: 'pointer', marginTop: '20px' },
    successMessage: { background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', color: '#fff', padding: '30px', borderRadius: '8px', textAlign: 'center', marginTop: '20px' },
    footer: { textAlign: 'center', padding: '20px 10px', marginTop: '30px', borderTop: '1px solid #e2e8f0', fontSize: '11px', color: '#64748b' }
  };

  const psifStyle = getPSIFStyle();

  if (submitStatus === 'success') {
    return (
      <div style={{ padding: '20px', backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
        <a href="/" style={{ display: 'inline-block', marginBottom: '15px', padding: '10px 20px', backgroundColor: '#1e3a5f', color: '#fff', textDecoration: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '500' }}>← Back to Portal</a>
        <div style={styles.container}>
          <div style={styles.header}>
            <img src="/Logo.png" alt="SLP Alaska" style={{ maxWidth: '180px', margin: '0 auto 15px auto', display: 'block' }} />
            <h1 style={{ margin: 0, fontSize: '26px' }}>Hazard ID Report</h1>
          </div>
          <div style={styles.formContent}>
            <div style={styles.successMessage}>
              <h2>✓ Hazard Report Submitted!</h2>
              <p>Thank you for identifying this hazard. Your report helps keep everyone safe.</p>
              <button onClick={() => setSubmitStatus(null)} style={{ ...styles.submitBtn, background: '#fff', color: '#059669', marginTop: '15px' }}>Report Another Hazard</button>
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
          <h1 style={{ margin: 0, fontSize: '26px' }}>Hazard ID Report</h1>
          <p style={{ margin: '10px 0 0', opacity: 0.9, fontSize: '14px' }}>Identify and Report Workplace Hazards</p>
          <div style={{ display: 'inline-block', background: '#fff', color: '#dc2626', padding: '5px 15px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', marginTop: '10px' }}>⚠️ HAZARD IDENTIFICATION</div>
        </div>

        <div style={styles.formContent}>
          <form onSubmit={handleSubmit}>
            <div style={{ ...styles.sectionHeader, backgroundColor: '#dc2626', marginTop: 0 }}>👤 Reporter Information</div>
            <div style={styles.row}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Your Name <span style={{ color: '#dc2626' }}>*</span></label>
                <input type="text" name="reporter_name" value={formData.reporter_name} onChange={handleChange} required style={styles.input} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Date <span style={{ color: '#dc2626' }}>*</span></label>
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
            <div style={styles.formGroup}>
              <label style={styles.label}>Specific Location</label>
              <input type="text" name="specific_location" value={formData.specific_location} onChange={handleChange} placeholder="Building, area, equipment..." style={styles.input} />
            </div>

            <div style={{ ...styles.sectionHeader, backgroundColor: '#ea580c' }}>📝 Hazard Details</div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Hazard Description <span style={{ color: '#dc2626' }}>*</span></label>
              <textarea name="hazard_description" value={formData.hazard_description} onChange={handleChange} required placeholder="Describe the hazard you identified..." style={styles.textarea} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Potential Consequences <span style={{ color: '#dc2626' }}>*</span></label>
              <textarea name="potential_consequences" value={formData.potential_consequences} onChange={handleChange} required placeholder="What could happen if this hazard is not addressed?" style={styles.textarea} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Was this a Near Miss? <span style={{ color: '#dc2626' }}>*</span></label>
              <div style={styles.radioGroup}>
                {['Yes', 'No'].map(option => (
                  <label key={option} style={{ ...styles.radioOption, borderColor: formData.near_miss === option ? '#dc2626' : '#d1d5db', background: formData.near_miss === option ? 'rgba(220, 38, 38, 0.05)' : '#fff' }}>
                    <input type="radio" name="near_miss" value={option} checked={formData.near_miss === option} onChange={handleChange} required style={{ width: '18px', height: '18px' }} />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Threat Level <span style={{ color: '#dc2626' }}>*</span></label>
              <div style={styles.threatSelector}>
                {['Low', 'Medium', 'High', 'Critical'].map(level => {
                  const threatStyle = getThreatStyle(level);
                  const isSelected = formData.threat_level === level;
                  return (
                    <div key={level} onClick={() => setFormData(prev => ({ ...prev, threat_level: level }))} style={{ padding: '15px 10px', border: `2px solid ${isSelected ? threatStyle.border : '#d1d5db'}`, borderRadius: '8px', textAlign: 'center', cursor: 'pointer', background: isSelected ? threatStyle.bg : '#fff' }}>
                      <div style={{ fontSize: '24px' }}>{threatStyle.icon}</div>
                      <div style={{ fontWeight: '600', fontSize: '14px', color: threatStyle.color }}>{level.toUpperCase()}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ ...styles.sectionHeader, backgroundColor: '#7c3aed' }}>⚡ STKY Assessment</div>
            <div style={styles.infoBox}>
              <strong>STKY = Stuff That Kills You</strong><br />
              This assessment identifies whether this hazard involves high-energy sources with Serious Injury or Fatality (SIF) potential.
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Is HIGH ENERGY present? <span style={{ color: '#dc2626' }}>*</span></label>
              <div style={styles.radioGroup}>
                {['Yes', 'No'].map(option => (
                  <label key={option} style={{ ...styles.radioOption, borderColor: formData.high_energy_present === option ? '#dc2626' : '#d1d5db', background: formData.high_energy_present === option ? 'rgba(220, 38, 38, 0.05)' : '#fff' }}>
                    <input type="radio" name="high_energy_present" value={option} checked={formData.high_energy_present === option} onChange={(e) => updateSTKYClassification('high_energy_present', e.target.value)} required style={{ width: '18px', height: '18px' }} />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
              <p style={{ fontSize: '12px', color: '#718096', marginTop: '8px' }}>High energy = gravity (falls, drops), motion (vehicles, equipment), electrical, pressure, chemical, temperature extremes</p>
            </div>

            {formData.high_energy_present === 'Yes' && (
              <>
                <div style={styles.formGroup}>
                  <label style={styles.label}>What type(s) of energy? (Select all that apply)</label>
                  <div style={styles.energyCheckboxGroup}>
                    {ENERGY_TYPES.map(et => (
                      <label key={et.value} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={formData.energy_types.includes(et.value)} onChange={() => handleEnergyTypeChange(et.value)} />
                        {et.label}
                      </label>
                    ))}
                  </div>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Did an uncontrolled energy release occur?</label>
                  <div style={styles.radioGroup}>
                    {['Yes', 'No'].map(option => (
                      <label key={option} style={{ ...styles.radioOption, borderColor: formData.energy_release_occurred === option ? '#dc2626' : '#d1d5db', background: formData.energy_release_occurred === option ? 'rgba(220, 38, 38, 0.05)' : '#fff' }}>
                        <input type="radio" name="energy_release_occurred" value={option} checked={formData.energy_release_occurred === option} onChange={(e) => updateSTKYClassification('energy_release_occurred', e.target.value)} style={{ width: '18px', height: '18px' }} />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Were DIRECT CONTROLS in place?</label>
                  <select name="direct_control_status" value={formData.direct_control_status} onChange={(e) => updateSTKYClassification('direct_control_status', e.target.value)} style={styles.select}>
                    <option value="">-- Select --</option>
                    {DIRECT_CONTROL_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {psifStyle && formData.high_energy_present && (
              <div style={{ padding: '15px', borderRadius: '8px', margin: '15px 0', background: psifStyle.bg, border: `2px solid ${psifStyle.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ padding: '8px 16px', borderRadius: '6px', fontWeight: '700', fontSize: '14px', background: psifStyle.badgeBg, color: '#fff' }}>{formData.psif_classification}</span>
                  <span style={{ fontSize: '13px', color: '#4b5563' }}>{psifStyle.text}</span>
                </div>
              </div>
            )}

            <div style={{ ...styles.sectionHeader, backgroundColor: '#059669' }}>🔧 Actions</div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Immediate Actions Taken</label>
              <textarea name="immediate_actions" value={formData.immediate_actions} onChange={handleChange} placeholder="What actions were taken immediately?" style={styles.textarea} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Is Additional Action Necessary?</label>
              <div style={styles.radioGroup}>
                {['Yes', 'No'].map(option => (
                  <label key={option} style={{ ...styles.radioOption, borderColor: formData.additional_action_necessary === option ? '#dc2626' : '#d1d5db', background: formData.additional_action_necessary === option ? 'rgba(220, 38, 38, 0.05)' : '#fff' }}>
                    <input type="radio" name="additional_action_necessary" value={option} checked={formData.additional_action_necessary === option} onChange={handleChange} style={{ width: '18px', height: '18px' }} />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </div>
            {formData.additional_action_necessary === 'Yes' && (
              <div style={styles.formGroup}>
                <label style={styles.label}>Recommended Actions</label>
                <textarea name="recommended_actions" value={formData.recommended_actions} onChange={handleChange} placeholder="What additional actions should be taken?" style={styles.textarea} />
              </div>
            )}
            <div style={styles.formGroup}>
              <label style={styles.label}>Additional Notes</label>
              <textarea name="additional_notes" value={formData.additional_notes} onChange={handleChange} placeholder="Any other relevant information..." style={styles.textarea} />
            </div>

            <div style={{ ...styles.sectionHeader, backgroundColor: '#1e3a8a' }}>📷 Photo Documentation</div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Photo (Recommended)</label>
              <div style={styles.photoUpload}>
                <input type="file" accept="image/*" multiple onChange={handlePhotoChange} style={{ display: 'none' }} id="photoInput" />
                <label htmlFor="photoInput" style={{ cursor: 'pointer' }}>
                  <p>📷 Tap to take or upload photos</p>
                  <p style={{ fontSize: '12px', color: '#6b7280' }}>Photos help document the hazard</p>
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
              {isSubmitting ? 'Submitting...' : 'Submit Hazard Report'}
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

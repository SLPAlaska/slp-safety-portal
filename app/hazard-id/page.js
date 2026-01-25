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
    submitter_name: '',
    email_address: '',
    company: '',
    location: '',
    date: new Date().toISOString().split('T')[0],
    identified_hazard: '',
    near_miss: '',
    threat_level: '',
    high_energy_present: '',
    energy_types: [],
    energy_release_potential: '',
    direct_control_status: '',
    psif_classification: '',
    stky_event: '',
    corrective_action_taken: '',
    additional_action_necessary: '',
    suggested_corrective_action: ''
  });

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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
    const energyRelease = newData.energy_release_potential;
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
    const fileName = `hazard-id/${Date.now()}-${photoFile.name}`;
    const { error } = await supabase.storage.from('safety-photos').upload(fileName, photoFile);
    if (error) return null;
    const { data: { publicUrl } } = supabase.storage.from('safety-photos').getPublicUrl(fileName);
    return publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let photoUrl = null;
      if (photoFile) {
        photoUrl = await uploadPhoto();
      }

      const submitData = {
        submitter_name: formData.submitter_name,
        email_address: formData.email_address || null,
        company: formData.company,
        location: formData.location,
        date: formData.date,
        identified_hazard: formData.identified_hazard,
        near_miss: formData.near_miss,
        threat_level: formData.threat_level,
        corrective_action_taken: formData.corrective_action_taken || null,
        additional_action_necessary: formData.additional_action_necessary,
        suggested_corrective_action: formData.suggested_corrective_action || null,
        high_energy_present: formData.high_energy_present || null,
        energy_release_potential: formData.energy_release_potential || null,
        direct_control_status: formData.direct_control_status || null,
        energy_types: formData.energy_types.length > 0 ? formData.energy_types.join(', ') : null,
        psif_classification: formData.psif_classification || null,
        stky_event: formData.stky_event || null,
        photo_url: photoUrl
      };

      const { error } = await supabase.from('hazard_id_reports').insert([submitData]);
      if (error) throw error;

      setSubmitted(true);
    } catch (error) {
      console.error('Error:', error);
      alert('Error: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      submitter_name: '',
      email_address: '',
      company: '',
      location: '',
      date: new Date().toISOString().split('T')[0],
      identified_hazard: '',
      near_miss: '',
      threat_level: '',
      high_energy_present: '',
      energy_types: [],
      energy_release_potential: '',
      direct_control_status: '',
      psif_classification: '',
      stky_event: '',
      corrective_action_taken: '',
      additional_action_necessary: '',
      suggested_corrective_action: ''
    });
    setPhotoFile(null);
    setPhotoPreview(null);
    setSubmitted(false);
  };

  const getPSIFStyle = () => {
    switch (formData.psif_classification) {
      case 'PSIF-Critical': return { bg: '#fee2e2', border: '#dc2626', badgeBg: '#dc2626', text: 'CRITICAL: High energy hazard with NO controls or inadequate controls' };
      case 'PSIF-High': return { bg: '#ffedd5', border: '#ea580c', badgeBg: '#ea580c', text: 'High energy could be released - only PPE/procedures in place' };
      case 'PSIF-Elevated': return { bg: '#fef3c7', border: '#f59e0b', badgeBg: '#f59e0b', text: 'High energy hazard - relying on alternative controls only' };
      case 'STKY-Controlled': return { bg: '#d1fae5', border: '#059669', badgeBg: '#059669', text: 'High energy hazard with effective direct controls' };
      case 'STKY-Pending': return { bg: '#fef3c7', border: '#f59e0b', badgeBg: '#f59e0b', text: 'High energy identified - complete assessment' };
      case 'Non-STKY': return { bg: '#dbeafe', border: '#3b82f6', badgeBg: '#3b82f6', text: 'Low energy hazard - not a SIF precursor' };
      default: return null;
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

  const psifStyle = getPSIFStyle();

  // Success Screen
  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)', padding: '20px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', paddingTop: '50px' }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '40px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)' }}>
            <div style={{ fontSize: '60px', marginBottom: '20px' }}>✅</div>
            <h2 style={{ color: '#16a34a', marginBottom: '15px', fontSize: '24px' }}>Hazard Report Submitted!</h2>
            <p style={{ color: '#6b7280', marginBottom: '25px' }}>Thank you for identifying this hazard. Your report helps keep everyone safe.</p>
            <button onClick={resetForm} style={{ background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)', color: 'white', border: 'none', padding: '12px 30px', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}>
              Submit Another Report
            </button>
          </div>
        </div>
      </div>
    );
  }

  const styles = {
    input: { width: '100%', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box' },
    select: { width: '100%', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box', backgroundColor: '#fff' },
    textarea: { width: '100%', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px', minHeight: '100px', resize: 'vertical', boxSizing: 'border-box' },
    label: { display: 'block', marginBottom: '6px', fontWeight: '500', color: '#1f2937', fontSize: '14px' },
    formGroup: { marginBottom: '20px' },
    sectionHeader: { padding: '12px 20px', margin: '25px -30px 20px', fontWeight: '600', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '10px', color: '#fff' },
    radioGroup: { display: 'flex', gap: '15px', flexWrap: 'wrap' },
    radioOption: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', border: '2px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', padding: '20px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)', color: 'white', padding: '30px', textAlign: 'center' }}>
          <a href="/" style={{ color: 'white', textDecoration: 'none', fontSize: '14px' }}>← Back to Portal</a>
          <img src="/Logo.png" alt="SLP Alaska" style={{ maxWidth: '160px', margin: '15px auto', display: 'block' }} />
          <h1 style={{ margin: '0', fontSize: '26px' }}>Hazard ID Report</h1>
          <p style={{ margin: '10px 0 0', opacity: 0.9 }}>Report Identified Hazards to Protect Our Team</p>
          <div style={{ display: 'inline-block', background: 'white', color: '#dc2626', padding: '5px 15px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', marginTop: '10px' }}>⚠️ HAZARD IDENTIFICATION</div>
        </div>

        {/* Form */}
        <div style={{ padding: '30px' }}>
          <form onSubmit={handleSubmit}>
            
            {/* Submitter Info */}
            <div style={{ ...styles.sectionHeader, backgroundColor: '#dc2626', marginTop: 0 }}>👤 Submitter Information</div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Your Name <span style={{ color: '#dc2626' }}>*</span></label>
                <input type="text" name="submitter_name" value={formData.submitter_name} onChange={handleChange} required style={styles.input} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Email Address</label>
                <input type="email" name="email_address" value={formData.email_address} onChange={handleChange} placeholder="optional" style={styles.input} />
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Company <span style={{ color: '#dc2626' }}>*</span></label>
                <select name="company" value={formData.company} onChange={handleChange} required style={styles.select}>
                  <option value="">-- Select Company --</option>
                  {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Date <span style={{ color: '#dc2626' }}>*</span></label>
                <input type="date" name="date" value={formData.date} onChange={handleChange} required style={styles.input} />
              </div>
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Location <span style={{ color: '#dc2626' }}>*</span></label>
              <select name="location" value={formData.location} onChange={handleChange} required style={styles.select}>
                <option value="">-- Select Location --</option>
                {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>

            {/* Hazard Details */}
            <div style={{ ...styles.sectionHeader, backgroundColor: '#ea580c' }}>⚠️ Hazard Details</div>
            
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '15px', marginBottom: '20px', fontSize: '13px', color: '#991b1b' }}>
              <strong>What is a Hazard?</strong> Any condition, behavior, or situation that has the potential to cause injury, illness, damage, or environmental harm.
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Identified Hazard <span style={{ color: '#dc2626' }}>*</span></label>
              <textarea name="identified_hazard" value={formData.identified_hazard} onChange={handleChange} placeholder="Describe the hazard you identified in detail..." required style={styles.textarea} />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Was this a Near Miss? <span style={{ color: '#dc2626' }}>*</span></label>
              <div style={styles.radioGroup}>
                {['Yes', 'No'].map(opt => (
                  <label key={opt} onClick={() => setFormData(prev => ({ ...prev, near_miss: opt }))} style={{ ...styles.radioOption, borderColor: formData.near_miss === opt ? '#dc2626' : '#d1d5db', background: formData.near_miss === opt ? 'rgba(220,38,38,0.05)' : '#fff' }}>
                    <input type="radio" name="near_miss" value={opt} checked={formData.near_miss === opt} onChange={() => {}} required style={{ width: '18px', height: '18px' }} />
                    <span>{opt === 'Yes' ? 'Yes - An incident almost occurred' : 'No - Potential hazard identified'}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Threat Level */}
            <div style={{ ...styles.sectionHeader, backgroundColor: '#7c3aed' }}>📊 Threat Level Assessment</div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Threat Level <span style={{ color: '#dc2626' }}>*</span></label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                {['Low', 'Medium', 'High', 'Critical'].map(level => {
                  const threatStyle = getThreatStyle(level);
                  const isSelected = formData.threat_level === level;
                  return (
                    <div key={level} onClick={() => setFormData(prev => ({ ...prev, threat_level: level }))} style={{ padding: '15px 10px', border: `2px solid ${isSelected ? threatStyle.border : '#d1d5db'}`, borderRadius: '8px', textAlign: 'center', cursor: 'pointer', background: isSelected ? threatStyle.bg : '#fff' }}>
                      <div style={{ fontSize: '24px' }}>{threatStyle.icon}</div>
                      <div style={{ fontWeight: '600', fontSize: '14px', color: threatStyle.color }}>{level.toUpperCase()}</div>
                      <input type="radio" name="threat_level" value={level} checked={isSelected} onChange={() => {}} required style={{ display: 'none' }} />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* STKY Assessment */}
            <div style={{ ...styles.sectionHeader, backgroundColor: '#dc2626' }}>⚡ SIF Potential Assessment</div>
            
            <div style={{ background: '#fef2f2', border: '2px solid #fecaca', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
              <div style={{ fontWeight: '600', color: '#991b1b', marginBottom: '15px' }}>STKY = Stuff That Kills You</div>
              <p style={{ fontSize: '13px', color: '#666', marginBottom: '15px' }}>This assessment identifies whether this hazard involves high-energy sources with Serious Injury or Fatality (SIF) potential.</p>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Could this hazard involve HIGH ENERGY? <span style={{ color: '#dc2626' }}>*</span></label>
                <div style={styles.radioGroup}>
                  {['Yes', 'No'].map(opt => (
                    <label key={opt} onClick={() => updateSTKYClassification('high_energy_present', opt)} style={{ ...styles.radioOption, borderColor: formData.high_energy_present === opt ? '#dc2626' : '#d1d5db', background: formData.high_energy_present === opt ? 'rgba(220,38,38,0.05)' : '#fff' }}>
                      <input type="radio" name="high_energy_present" value={opt} checked={formData.high_energy_present === opt} onChange={() => {}} required style={{ width: '18px', height: '18px' }} />
                      <span>{opt === 'Yes' ? 'Yes - Could cause serious harm or death' : 'No - Low energy situation'}</span>
                    </label>
                  ))}
                </div>
                <p style={{ fontSize: '12px', color: '#718096', marginTop: '8px' }}>High energy = gravity (falls, drops), motion (vehicles, equipment), electrical, pressure, chemical, temperature extremes</p>
              </div>

              {formData.high_energy_present === 'Yes' && (
                <>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>What ENERGY TYPES are involved?</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                      {ENERGY_TYPES.map(et => (
                        <label key={et.value} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
                          <input type="checkbox" checked={formData.energy_types.includes(et.value)} onChange={() => handleEnergyTypeChange(et.value)} />
                          {et.label}
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  <div style={styles.formGroup}>
                    <label style={styles.label}>If left uncontrolled, could energy be released to a person?</label>
                    <div style={styles.radioGroup}>
                      {['Yes', 'No'].map(opt => (
                        <label key={opt} onClick={() => updateSTKYClassification('energy_release_potential', opt)} style={{ ...styles.radioOption, borderColor: formData.energy_release_potential === opt ? '#dc2626' : '#d1d5db', background: formData.energy_release_potential === opt ? 'rgba(220,38,38,0.05)' : '#fff' }}>
                          <input type="radio" name="energy_release_potential" value={opt} checked={formData.energy_release_potential === opt} onChange={() => {}} style={{ width: '18px', height: '18px' }} />
                          <span>{opt === 'Yes' ? 'Yes - Energy could contact/affect someone' : 'No - Energy is/would be contained'}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Are DIRECT CONTROLS currently in place?</label>
                    <select value={formData.direct_control_status} onChange={(e) => updateSTKYClassification('direct_control_status', e.target.value)} style={styles.select}>
                      <option value="">-- Select --</option>
                      {DIRECT_CONTROL_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                    <p style={{ fontSize: '12px', color: '#718096', marginTop: '8px' }}>Direct Controls = Elimination, Substitution, Engineering Controls, Guarding. Alternative = PPE, Procedures, Training, Warnings</p>
                  </div>
                </>
              )}

              {psifStyle && formData.high_energy_present && (
                <div style={{ padding: '15px', borderRadius: '8px', margin: '15px 0', background: psifStyle.bg, border: `2px solid ${psifStyle.border}`, textAlign: 'center' }}>
                  <span style={{ padding: '8px 16px', borderRadius: '6px', fontWeight: '700', fontSize: '14px', background: psifStyle.badgeBg, color: '#fff' }}>{formData.psif_classification}</span>
                  <p style={{ fontSize: '13px', color: '#4b5563', marginTop: '10px' }}>{psifStyle.text}</p>
                </div>
              )}
            </div>

            {/* Corrective Actions */}
            <div style={{ ...styles.sectionHeader, backgroundColor: '#059669' }}>🔧 Corrective Actions</div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Corrective Action Already Taken</label>
              <textarea name="corrective_action_taken" value={formData.corrective_action_taken} onChange={handleChange} placeholder="What immediate actions were taken to address the hazard?" style={styles.textarea} />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Is Additional Action Necessary? <span style={{ color: '#dc2626' }}>*</span></label>
              <div style={styles.radioGroup}>
                {['Yes', 'No'].map(opt => (
                  <label key={opt} onClick={() => setFormData(prev => ({ ...prev, additional_action_necessary: opt }))} style={{ ...styles.radioOption, borderColor: formData.additional_action_necessary === opt ? '#dc2626' : '#d1d5db', background: formData.additional_action_necessary === opt ? 'rgba(220,38,38,0.05)' : '#fff' }}>
                    <input type="radio" name="additional_action_necessary" value={opt} checked={formData.additional_action_necessary === opt} onChange={() => {}} required style={{ width: '18px', height: '18px' }} />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </div>
            
            {formData.additional_action_necessary === 'Yes' && (
              <div style={{ ...styles.formGroup, background: '#fef3c7', padding: '15px', borderRadius: '8px', border: '1px solid #fcd34d' }}>
                <label style={styles.label}>Suggested Corrective Action</label>
                <textarea name="suggested_corrective_action" value={formData.suggested_corrective_action} onChange={handleChange} placeholder="What additional actions should be taken?" style={styles.textarea} />
              </div>
            )}

            {/* Photo */}
            <div style={{ ...styles.sectionHeader, backgroundColor: '#1e3a8a' }}>📷 Photo Documentation</div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Photo (Recommended)</label>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: '#dc2626', color: 'white', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>
                  📷 Take Photo
                  <input type="file" accept="image/*" capture="environment" onChange={handlePhotoChange} style={{ display: 'none' }} />
                </label>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: '#6b7280', color: 'white', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>
                  📁 Choose File
                  <input type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
                </label>
              </div>
              {photoPreview && (
                <div>
                  <img src={photoPreview} alt="Preview" style={{ maxWidth: '200px', maxHeight: '150px', borderRadius: '8px' }} />
                  <button type="button" onClick={() => { setPhotoFile(null); setPhotoPreview(null); }} style={{ display: 'block', marginTop: '8px', padding: '6px 12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>✕ Remove</button>
                </div>
              )}
            </div>

            {/* Submit */}
            <button type="submit" disabled={isSubmitting} style={{ width: '100%', padding: '16px', background: isSubmitting ? '#9ca3af' : 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '18px', fontWeight: '600', cursor: isSubmitting ? 'not-allowed' : 'pointer', marginTop: '20px' }}>
              {isSubmitting ? 'Submitting...' : 'Submit Hazard Report'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '20px 10px', borderTop: '1px solid #e2e8f0', fontSize: '11px', color: '#64748b', background: 'linear-gradient(to bottom, #f8fafc, #ffffff)' }}>
          <span style={{ color: '#1e3a5f', fontWeight: '500' }}>Powered by Predictive Safety Analytics™</span>
          <span style={{ color: '#94a3b8', margin: '0 8px' }}>|</span>
          <span style={{ color: '#475569' }}>© 2025 SLP Alaska</span>
        </div>
      </div>
    </div>
  );
}

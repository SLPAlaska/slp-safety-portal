'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

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
  'Pollard Wireline', 'Ridgeline Oilfield Services', 'Santos', 'Summit Excavation', 'Tesoro Refinery', 'Yellowjacket', 'Other'
];

const LOCATIONS = [
  'Kenai', 'CIO', 'Beaver Creek', 'Swanson River', 'Ninilchik', 'Nikiski', 'Other Kenai Asset',
  'Deadhorse', 'Prudhoe Bay', 'Kuparuk', 'Alpine', 'Willow', 'ENI', 'PIKKA',
  'Point Thompson', 'North Star Island', 'Endicott', 'Badami', 'Other North Slope'
];

const DRILL_TYPES = [
  'Fire Evacuation', 'Gas Release/H2S', 'Oil Spill Response', 'Medical Emergency',
  'Confined Space Rescue', 'Man Overboard', 'Severe Weather/Shelter', 'Security Threat',
  'Full-Scale Exercise', 'Tabletop Exercise', 'Other'
];

export default function EmergencyDrillEvaluation() {
  const [formData, setFormData] = useState({
    evaluator_name: '',
    date: new Date().toISOString().split('T')[0],
    location: '',
    company: '',
    drill_type: '',
    drill_scenario: '',
    announced_status: '',
    total_participants: '',
    drill_start_time: '',
    all_clear_time: '',
    total_duration: '',
    // Alarm & Communication
    alarm_audible: '',
    visual_alarms: '',
    pa_system: '',
    // Evacuation Response
    prompt_response: '',
    evac_routes: '',
    muster_points: '',
    accountability: '',
    headcount_time: '',
    all_accounted_for: '',
    visitors_included: '',
    // ERT
    ert_responded: '',
    ert_ppe: '',
    ert_communication: '',
    ert_actions: '',
    incident_commander: '',
    // Equipment
    equipment_accessible: '',
    fire_extinguishers: '',
    first_aid_kits: '',
    spill_kits: '',
    exits_accessible: '',
    assembly_area_safe: '',
    // External & Post-Drill
    external_comms: '',
    debrief_conducted: '',
    overall_rating: '',
    strengths_observed: '',
    areas_improvement: '',
    corrective_actions: '',
    follow_up_date: ''
  });

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Auto-calculate duration
    if (name === 'drill_start_time' || name === 'all_clear_time') {
      const startTime = name === 'drill_start_time' ? value : formData.drill_start_time;
      const endTime = name === 'all_clear_time' ? value : formData.all_clear_time;
      
      if (startTime && endTime) {
        const start = new Date(`2000-01-01T${startTime}`);
        const end = new Date(`2000-01-01T${endTime}`);
        let duration = (end - start) / 60000;
        if (duration < 0) duration += 1440; // Handle overnight
        setFormData(prev => ({ ...prev, total_duration: Math.round(duration).toString() }));
      }
    }
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
    const fileName = `drill-${Date.now()}.${fileExt}`;
    const filePath = `emergency-drill-evaluation/${fileName}`;

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
        .from('emergency_drill_evaluations')
        .insert([{
          ...formData,
          total_participants: formData.total_participants ? parseInt(formData.total_participants) : null,
          total_duration: formData.total_duration ? parseInt(formData.total_duration) : null,
          headcount_time: formData.headcount_time ? parseInt(formData.headcount_time) : null,
          photo_url: photoUrl
        }]);

      if (error) throw error;
      setSubmitted(true);
    } catch (error) {
      console.error('Submission error:', error);
      alert('Error submitting evaluation: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      evaluator_name: '',
      date: new Date().toISOString().split('T')[0],
      location: '',
      company: '',
      drill_type: '',
      drill_scenario: '',
      announced_status: '',
      total_participants: '',
      drill_start_time: '',
      all_clear_time: '',
      total_duration: '',
      alarm_audible: '',
      visual_alarms: '',
      pa_system: '',
      prompt_response: '',
      evac_routes: '',
      muster_points: '',
      accountability: '',
      headcount_time: '',
      all_accounted_for: '',
      visitors_included: '',
      ert_responded: '',
      ert_ppe: '',
      ert_communication: '',
      ert_actions: '',
      incident_commander: '',
      equipment_accessible: '',
      fire_extinguishers: '',
      first_aid_kits: '',
      spill_kits: '',
      exits_accessible: '',
      assembly_area_safe: '',
      external_comms: '',
      debrief_conducted: '',
      overall_rating: '',
      strengths_observed: '',
      areas_improvement: '',
      corrective_actions: '',
      follow_up_date: ''
    });
    setPhotoFile(null);
    setPhotoPreview(null);
    setSubmitted(false);
  };

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)', padding: '20px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', paddingTop: '50px' }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '40px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)' }}>
            <div style={{ fontSize: '60px', marginBottom: '20px' }}>✅</div>
            <h2 style={{ color: '#059669', marginBottom: '15px', fontSize: '24px' }}>Drill Evaluation Submitted!</h2>
            <p style={{ color: '#6b7280', marginBottom: '25px' }}>Emergency Drill Evaluation recorded successfully.</p>
            <button
              onClick={resetForm}
              style={{
                background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                color: 'white',
                border: 'none',
                padding: '12px 30px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Start New Evaluation
            </button>
          </div>
        </div>
      </div>
    );
  }

  const EvalRow = ({ label, name, required = true }) => (
    <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
      <td style={{ padding: '12px 8px', fontSize: '14px', textAlign: 'left', paddingLeft: '12px' }}>{label}</td>
      {['Yes', 'No', 'Needs Improvement', 'N/A'].map(val => (
        <td key={val} style={{ padding: '12px 8px', textAlign: 'center' }}>
          <input
            type="radio"
            name={name}
            value={val}
            checked={formData[name] === val}
            onChange={handleChange}
            required={required && val === 'Yes'}
            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
          />
        </td>
      ))}
    </tr>
  );

  const RadioGroup = ({ label, name, options, required = true }) => (
    <div style={{ marginBottom: '15px' }}>
      <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '8px', fontSize: '14px' }}>
        {label} {required && <span style={{ color: '#dc2626' }}>*</span>}
      </label>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {options.map(opt => (
          <label key={opt.value} style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 15px',
            background: formData[name] === opt.value ? (opt.bg || '#dbeafe') : 'white',
            border: `2px solid ${formData[name] === opt.value ? (opt.border || '#1e3a8a') : '#d1d5db'}`,
            borderRadius: '8px', cursor: 'pointer', fontSize: '14px'
          }}>
            <input type="radio" name={name} value={opt.value} checked={formData[name] === opt.value} onChange={handleChange} required={required} />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', padding: '20px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <a href="/" style={{ color: '#dc2626', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px', marginBottom: '15px', fontSize: '14px' }}>
          ← Back to Portal
        </a>

        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)', color: 'white', padding: '30px', textAlign: 'center' }}>
            <img src="/Logo.png" alt="SLP Alaska" style={{ maxWidth: '180px', marginBottom: '15px' }} />
            <h1 style={{ margin: '0', fontSize: '26px', fontWeight: '700' }}>Emergency Drill Evaluation</h1>
            <p style={{ margin: '10px 0 0', opacity: '0.9', fontSize: '14px' }}>Comprehensive Assessment of Emergency Response Readiness</p>
            <div style={{ display: 'inline-block', background: '#f59e0b', color: '#000', padding: '5px 15px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', marginTop: '10px' }}>
              🚨 EMERGENCY PREPAREDNESS
            </div>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} style={{ padding: '30px' }}>
            {/* Drill Information */}
            <div style={{ background: '#dc2626', color: 'white', padding: '12px 20px', margin: '0 -30px 20px', fontWeight: '600', fontSize: '15px' }}>
              📋 Drill Information
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Evaluator Name *</label>
                <input type="text" name="evaluator_name" value={formData.evaluator_name} onChange={handleChange} required
                  style={{ width: '100%', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Date *</label>
                <input type="date" name="date" value={formData.date} onChange={handleChange} required
                  style={{ width: '100%', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Location *</label>
                <select name="location" value={formData.location} onChange={handleChange} required
                  style={{ width: '100%', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }}>
                  <option value="">Select Location...</option>
                  {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Company *</label>
                <select name="company" value={formData.company} onChange={handleChange} required
                  style={{ width: '100%', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }}>
                  <option value="">Select Company...</option>
                  {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Drill Type *</label>
                <select name="drill_type" value={formData.drill_type} onChange={handleChange} required
                  style={{ width: '100%', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }}>
                  <option value="">Select Drill Type...</option>
                  {DRILL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Announced or Unannounced *</label>
                <select name="announced_status" value={formData.announced_status} onChange={handleChange} required
                  style={{ width: '100%', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }}>
                  <option value="">Select...</option>
                  <option value="Announced">Announced</option>
                  <option value="Unannounced">Unannounced</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Drill Scenario Description *</label>
              <textarea name="drill_scenario" value={formData.drill_scenario} onChange={handleChange} required
                placeholder="Describe the emergency scenario simulated during this drill..."
                style={{ width: '100%', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px', minHeight: '100px', resize: 'vertical' }} />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Total Number of Participants *</label>
              <input type="number" name="total_participants" value={formData.total_participants} onChange={handleChange} required min="1"
                placeholder="Enter number of participants"
                style={{ width: '100%', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }} />
            </div>

            {/* Timing */}
            <div style={{ background: '#ea580c', color: 'white', padding: '12px 20px', margin: '25px -30px 20px', fontWeight: '600', fontSize: '15px' }}>
              ⏱️ Drill Timing
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Drill Start Time *</label>
                <input type="time" name="drill_start_time" value={formData.drill_start_time} onChange={handleChange} required
                  style={{ width: '100%', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>All Clear Time *</label>
                <input type="time" name="all_clear_time" value={formData.all_clear_time} onChange={handleChange} required
                  style={{ width: '100%', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Total Duration (min)</label>
                <input type="number" name="total_duration" value={formData.total_duration} readOnly
                  style={{ width: '100%', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px', background: '#f3f4f6' }} />
              </div>
            </div>

            {formData.total_duration && (
              <div style={{ background: '#f3f4f6', borderRadius: '8px', padding: '15px', textAlign: 'center', marginBottom: '20px' }}>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#1e3a8a' }}>{formData.total_duration}</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Minutes Total Duration</div>
              </div>
            )}

            {/* Alarm & Communication Systems */}
            <div style={{ background: '#1e3a8a', color: 'white', padding: '12px 20px', margin: '25px -30px 20px', fontWeight: '600', fontSize: '15px' }}>
              🔔 Alarm & Communication Systems
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
              <thead>
                <tr style={{ background: '#f3f4f6' }}>
                  <th style={{ padding: '10px 8px', textAlign: 'left', paddingLeft: '12px', width: '50%', fontSize: '12px' }}>Evaluation Criteria</th>
                  <th style={{ padding: '10px 8px', textAlign: 'center', fontSize: '12px', color: '#059669' }}>Yes</th>
                  <th style={{ padding: '10px 8px', textAlign: 'center', fontSize: '12px', color: '#dc2626' }}>No</th>
                  <th style={{ padding: '10px 8px', textAlign: 'center', fontSize: '12px', color: '#ea580c' }}>Needs Improvement</th>
                  <th style={{ padding: '10px 8px', textAlign: 'center', fontSize: '12px', color: '#6b7280' }}>N/A</th>
                </tr>
              </thead>
              <tbody>
                <EvalRow label="Alarm audible throughout facility" name="alarm_audible" />
                <EvalRow label="Visual alarms functional" name="visual_alarms" />
                <EvalRow label="PA system clear and understandable" name="pa_system" />
              </tbody>
            </table>

            {/* Evacuation Response */}
            <div style={{ background: '#059669', color: 'white', padding: '12px 20px', margin: '25px -30px 20px', fontWeight: '600', fontSize: '15px' }}>
              🚶 Evacuation Response
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
              <thead>
                <tr style={{ background: '#f3f4f6' }}>
                  <th style={{ padding: '10px 8px', textAlign: 'left', paddingLeft: '12px', width: '50%', fontSize: '12px' }}>Evaluation Criteria</th>
                  <th style={{ padding: '10px 8px', textAlign: 'center', fontSize: '12px', color: '#059669' }}>Yes</th>
                  <th style={{ padding: '10px 8px', textAlign: 'center', fontSize: '12px', color: '#dc2626' }}>No</th>
                  <th style={{ padding: '10px 8px', textAlign: 'center', fontSize: '12px', color: '#ea580c' }}>Needs Improvement</th>
                  <th style={{ padding: '10px 8px', textAlign: 'center', fontSize: '12px', color: '#6b7280' }}>N/A</th>
                </tr>
              </thead>
              <tbody>
                <EvalRow label="Personnel responded promptly to alarm" name="prompt_response" />
                <EvalRow label="Evacuation routes used correctly" name="evac_routes" />
                <EvalRow label="Muster points used correctly" name="muster_points" />
                <EvalRow label="Personnel accountability completed" name="accountability" />
              </tbody>
            </table>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Time to Complete Headcount (minutes)</label>
                <input type="number" name="headcount_time" value={formData.headcount_time} onChange={handleChange} min="0"
                  placeholder="Enter time in minutes"
                  style={{ width: '100%', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }} />
              </div>
            </div>

            <RadioGroup label="All Personnel Accounted For?" name="all_accounted_for" options={[
              { value: 'Yes', label: 'Yes', bg: '#dcfce7', border: '#059669' },
              { value: 'No', label: 'No', bg: '#fee2e2', border: '#dc2626' }
            ]} />

            <RadioGroup label="Visitors/Contractors Included in Drill?" name="visitors_included" options={[
              { value: 'Yes', label: 'Yes', bg: '#dcfce7', border: '#059669' },
              { value: 'No', label: 'No', bg: '#fee2e2', border: '#dc2626' },
              { value: 'N/A', label: 'N/A - No visitors present', bg: '#f3f4f6', border: '#6b7280' }
            ]} />

            {/* Emergency Response Team */}
            <div style={{ background: '#7c3aed', color: 'white', padding: '12px 20px', margin: '25px -30px 20px', fontWeight: '600', fontSize: '15px' }}>
              👷 Emergency Response Team (ERT)
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
              <thead>
                <tr style={{ background: '#f3f4f6' }}>
                  <th style={{ padding: '10px 8px', textAlign: 'left', paddingLeft: '12px', width: '50%', fontSize: '12px' }}>Evaluation Criteria</th>
                  <th style={{ padding: '10px 8px', textAlign: 'center', fontSize: '12px', color: '#059669' }}>Yes</th>
                  <th style={{ padding: '10px 8px', textAlign: 'center', fontSize: '12px', color: '#dc2626' }}>No</th>
                  <th style={{ padding: '10px 8px', textAlign: 'center', fontSize: '12px', color: '#ea580c' }}>Needs Improvement</th>
                  <th style={{ padding: '10px 8px', textAlign: 'center', fontSize: '12px', color: '#6b7280' }}>N/A</th>
                </tr>
              </thead>
              <tbody>
                <EvalRow label="Emergency Response Team responded" name="ert_responded" />
                <EvalRow label="ERT proper PPE worn" name="ert_ppe" />
                <EvalRow label="ERT communication effective" name="ert_communication" />
                <EvalRow label="ERT actions appropriate for scenario" name="ert_actions" />
                <EvalRow label="Incident Commander identified" name="incident_commander" />
              </tbody>
            </table>

            {/* Emergency Equipment & Facilities */}
            <div style={{ background: '#ea580c', color: 'white', padding: '12px 20px', margin: '25px -30px 20px', fontWeight: '600', fontSize: '15px' }}>
              🧯 Emergency Equipment & Facilities
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
              <thead>
                <tr style={{ background: '#f3f4f6' }}>
                  <th style={{ padding: '10px 8px', textAlign: 'left', paddingLeft: '12px', width: '50%', fontSize: '12px' }}>Evaluation Criteria</th>
                  <th style={{ padding: '10px 8px', textAlign: 'center', fontSize: '12px', color: '#059669' }}>Yes</th>
                  <th style={{ padding: '10px 8px', textAlign: 'center', fontSize: '12px', color: '#dc2626' }}>No</th>
                  <th style={{ padding: '10px 8px', textAlign: 'center', fontSize: '12px', color: '#ea580c' }}>Needs Improvement</th>
                  <th style={{ padding: '10px 8px', textAlign: 'center', fontSize: '12px', color: '#6b7280' }}>N/A</th>
                </tr>
              </thead>
              <tbody>
                <EvalRow label="Emergency equipment accessible" name="equipment_accessible" />
                <EvalRow label="Fire extinguishers identified/located" name="fire_extinguishers" />
                <EvalRow label="First aid kits accessible" name="first_aid_kits" />
                <EvalRow label="Spill kits accessible" name="spill_kits" />
                <EvalRow label="Emergency exits clear and accessible" name="exits_accessible" />
                <EvalRow label="Assembly area safe and appropriate" name="assembly_area_safe" />
              </tbody>
            </table>

            {/* External Communication */}
            <div style={{ background: '#1e3a8a', color: 'white', padding: '12px 20px', margin: '25px -30px 20px', fontWeight: '600', fontSize: '15px' }}>
              📞 External Communication
            </div>

            <RadioGroup label="Communication with External Responders (if applicable)" name="external_comms" options={[
              { value: 'Yes', label: 'Yes - Successfully contacted', bg: '#dcfce7', border: '#059669' },
              { value: 'No', label: 'No - Communication issues', bg: '#fee2e2', border: '#dc2626' },
              { value: 'Needs Improvement', label: 'Needs Improvement', bg: '#fef3c7', border: '#f59e0b' },
              { value: 'N/A', label: 'N/A - Not part of drill', bg: '#f3f4f6', border: '#6b7280' }
            ]} />

            {/* Post-Drill Evaluation */}
            <div style={{ background: '#f59e0b', color: '#000', padding: '12px 20px', margin: '25px -30px 20px', fontWeight: '600', fontSize: '15px' }}>
              📝 Post-Drill Evaluation
            </div>

            <RadioGroup label="Post-Drill Debrief Conducted?" name="debrief_conducted" options={[
              { value: 'Yes', label: 'Yes', bg: '#dcfce7', border: '#059669' },
              { value: 'No', label: 'No', bg: '#fee2e2', border: '#dc2626' },
              { value: 'Partial', label: 'Partial', bg: '#fef3c7', border: '#f59e0b' }
            ]} />

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '8px', fontSize: '14px' }}>Overall Drill Rating *</label>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {[
                  { value: 'Excellent', label: '⭐ Excellent', bg: 'rgba(5,150,105,0.1)', border: '#059669' },
                  { value: 'Good', label: '👍 Good', bg: 'rgba(101,163,13,0.1)', border: '#65a30d' },
                  { value: 'Satisfactory', label: '✓ Satisfactory', bg: 'rgba(245,158,11,0.1)', border: '#f59e0b' },
                  { value: 'Needs Improvement', label: '⚠️ Needs Improvement', bg: 'rgba(249,115,22,0.1)', border: '#f97316' },
                  { value: 'Unsatisfactory', label: '❌ Unsatisfactory', bg: 'rgba(220,38,38,0.1)', border: '#dc2626' }
                ].map(opt => (
                  <label key={opt.value} style={{
                    display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 15px',
                    background: formData.overall_rating === opt.value ? opt.bg : 'white',
                    border: `2px solid ${formData.overall_rating === opt.value ? opt.border : '#d1d5db'}`,
                    borderRadius: '8px', cursor: 'pointer', fontSize: '14px'
                  }}>
                    <input type="radio" name="overall_rating" value={opt.value} checked={formData.overall_rating === opt.value} onChange={handleChange} required />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Strengths Observed *</label>
              <textarea name="strengths_observed" value={formData.strengths_observed} onChange={handleChange} required
                placeholder="Describe what went well during the drill..."
                style={{ width: '100%', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px', minHeight: '100px', resize: 'vertical' }} />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Areas for Improvement *</label>
              <textarea name="areas_improvement" value={formData.areas_improvement} onChange={handleChange} required
                placeholder="Describe areas that need improvement..."
                style={{ width: '100%', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px', minHeight: '100px', resize: 'vertical' }} />
            </div>

            <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '8px', padding: '15px', marginBottom: '20px', fontSize: '13px', color: '#92400e' }}>
              <strong>⚠️ Corrective Actions:</strong> Document any required corrective actions and assign responsible parties with due dates.
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Corrective Actions Required</label>
              <textarea name="corrective_actions" value={formData.corrective_actions} onChange={handleChange}
                placeholder="List specific corrective actions needed..."
                style={{ width: '100%', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px', minHeight: '100px', resize: 'vertical' }} />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Follow-Up Date</label>
              <input type="date" name="follow_up_date" value={formData.follow_up_date} onChange={handleChange}
                style={{ width: '100%', padding: '12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }} />
            </div>

            {/* Photo Documentation */}
            <div style={{ background: '#1e3a8a', color: 'white', padding: '12px 20px', margin: '25px -30px 20px', fontWeight: '600', fontSize: '15px' }}>
              📷 Photo Documentation
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
                <label style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
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
              <p style={{ fontSize: '12px', color: '#6b7280', margin: '5px 0' }}>Document drill activities or issues observed</p>
              
              {photoPreview && (
                <div style={{ marginTop: '10px' }}>
                  <img src={photoPreview} alt="Preview" style={{ maxWidth: '200px', maxHeight: '150px', borderRadius: '8px', display: 'block' }} />
                  <button
                    type="button"
                    onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                    style={{
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
            <button type="submit" disabled={submitting}
              style={{
                width: '100%',
                padding: '16px',
                background: submitting ? '#d1d5db' : 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '18px',
                fontWeight: '600',
                cursor: submitting ? 'not-allowed' : 'pointer',
                marginTop: '20px'
              }}>
              {submitting ? 'Submitting...' : 'Submit Drill Evaluation'}
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

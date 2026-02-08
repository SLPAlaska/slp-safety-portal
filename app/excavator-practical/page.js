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

const ENERGY_SOURCES = [
  { value: 'Gravity', icon: '🪨' },
  { value: 'Motion', icon: '🏃' },
  { value: 'Mechanical', icon: '⚙️' },
  { value: 'Electrical', icon: '⚡' },
  { value: 'Pressure', icon: '💨' },
  { value: 'Chemical', icon: '🧪' },
  { value: 'Temperature', icon: '🌡️' },
  { value: 'Stored', icon: '🔋' }
];

const FOLLOW_UP_OPTIONS = [
  'None - Employee is competent',
  'Refresher Training Required',
  'Additional Practice with Supervision',
  'Formal Training Course Required',
  'Equipment-Specific Training Required'
];

// Evaluation items by section
const PRE_OPERATION_ITEMS = [
  { name: 'walk_around_inspection', label: 'Conducted walk-around inspection?', critical: true },
  { name: 'hydraulic_fluid', label: 'Checked hydraulic fluid levels?', critical: false },
  { name: 'alarm_horn', label: 'Tested backup alarm and horn?', critical: true },
  { name: 'tracks_undercarriage', label: 'Inspected tracks/undercarriage for damage?', critical: true },
  { name: 'bucket_attachment', label: 'Checked bucket and attachment condition?', critical: false }
];

const EXCAVATION_ITEMS = [
  { name: 'swing_radius', label: 'Maintains awareness of swing radius?', critical: true },
  { name: 'no_swing_over_personnel', label: 'Never swings loads over personnel?', critical: true },
  { name: 'smooth_movements', label: 'Uses smooth, controlled movements?', critical: false },
  { name: 'excavation_angles', label: 'Maintains proper excavation angles?', critical: true },
  { name: 'overhead_hazards', label: 'Avoids overhead hazards (power lines, structures)?', critical: true }
];

const TRAVEL_ITEMS = [
  { name: 'bucket_position', label: 'Travels with bucket in proper position?', critical: true },
  { name: 'safe_speed', label: 'Maintains safe travel speed?', critical: false },
  { name: 'ground_stability', label: 'Checks ground stability before positioning?', critical: true },
  { name: 'exclusion_zone', label: 'Maintains exclusion zone around equipment?', critical: true }
];

const SAFETY_ITEMS = [
  { name: 'proper_ppe', label: 'Uses proper PPE (hard hat, high-vis, safety boots)?', critical: true },
  { name: 'seatbelt_rops', label: 'Uses seatbelt and ROPS protection?', critical: true },
  { name: 'ground_communication', label: 'Communicates effectively with ground personnel?', critical: false },
  { name: 'no_passengers', label: 'Never allows passengers on equipment?', critical: true }
];

const SHUTDOWN_ITEMS = [
  { name: 'bucket_to_ground', label: 'Lowers bucket to ground before shutdown?', critical: true },
  { name: 'parking_brake_key', label: 'Engages parking brake and removes key?', critical: false },
  { name: 'authorized_parking', label: 'Parks in authorized area away from traffic?', critical: true }
];

const ALL_CRITICAL_ITEMS = [
  ...PRE_OPERATION_ITEMS.filter(i => i.critical),
  ...EXCAVATION_ITEMS.filter(i => i.critical),
  ...TRAVEL_ITEMS.filter(i => i.critical),
  ...SAFETY_ITEMS.filter(i => i.critical),
  ...SHUTDOWN_ITEMS.filter(i => i.critical)
];

export default function ExcavatorPractical() {
  const [formData, setFormData] = useState({
    employee_name: '',
    evaluator_name: '',
    company: '',
    location: '',
    evaluation_date: new Date().toISOString().split('T')[0],
    equipment_id: '',
    energy_sources: [],
    stky_assessment: '',
    walk_around_inspection: '',
    hydraulic_fluid: '',
    alarm_horn: '',
    tracks_undercarriage: '',
    bucket_attachment: '',
    swing_radius: '',
    no_swing_over_personnel: '',
    smooth_movements: '',
    excavation_angles: '',
    overhead_hazards: '',
    bucket_position: '',
    safe_speed: '',
    ground_stability: '',
    exclusion_zone: '',
    proper_ppe: '',
    seatbelt_rops: '',
    ground_communication: '',
    no_passengers: '',
    bucket_to_ground: '',
    parking_brake_key: '',
    authorized_parking: '',
    overall_assessment: '',
    follow_up_required: 'None - Employee is competent',
    evaluator_comments: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [assessmentId, setAssessmentId] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleEnergySource = (source) => {
    setFormData(prev => {
      const current = prev.energy_sources;
      if (current.includes(source)) {
        return { ...prev, energy_sources: current.filter(s => s !== source) };
      } else {
        return { ...prev, energy_sources: [...current, source] };
      }
    });
  };

  const setPassFail = (name, value) => {
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      const hasFailure = ALL_CRITICAL_ITEMS.some(item => newData[item.name] === 'Fail');
      if (hasFailure && newData.overall_assessment !== 'FAIL') {
        newData.overall_assessment = 'FAIL';
      }
      return newData;
    });
  };

  const generateAssessmentId = () => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const random = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    return `EXCAVATOR-${dateStr}-${random}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const newAssessmentId = generateAssessmentId();
      
      const submitData = {
        assessment_id: newAssessmentId,
        employee_name: formData.employee_name,
        evaluator_name: formData.evaluator_name,
        company: formData.company,
        location: formData.location,
        evaluation_date: formData.evaluation_date,
        equipment_id: formData.equipment_id || null,
        energy_sources: formData.energy_sources.join(', ') || null,
        stky_assessment: formData.stky_assessment,
        walk_around_inspection: formData.walk_around_inspection,
        hydraulic_fluid: formData.hydraulic_fluid,
        alarm_horn: formData.alarm_horn,
        tracks_undercarriage: formData.tracks_undercarriage,
        bucket_attachment: formData.bucket_attachment,
        swing_radius: formData.swing_radius,
        no_swing_over_personnel: formData.no_swing_over_personnel,
        smooth_movements: formData.smooth_movements,
        excavation_angles: formData.excavation_angles,
        overhead_hazards: formData.overhead_hazards,
        bucket_position: formData.bucket_position,
        safe_speed: formData.safe_speed,
        ground_stability: formData.ground_stability,
        exclusion_zone: formData.exclusion_zone,
        proper_ppe: formData.proper_ppe,
        seatbelt_rops: formData.seatbelt_rops,
        ground_communication: formData.ground_communication,
        no_passengers: formData.no_passengers,
        bucket_to_ground: formData.bucket_to_ground,
        parking_brake_key: formData.parking_brake_key,
        authorized_parking: formData.authorized_parking,
        overall_assessment: formData.overall_assessment,
        follow_up_required: formData.follow_up_required,
        evaluator_comments: formData.evaluator_comments || null
      };

      const { error } = await supabase.from('excavator_evaluations').insert([submitData]);
      if (error) throw error;

      setAssessmentId(newAssessmentId);
      setSubmitted(true);
    } catch (error) {
      console.error('Error:', error);
      alert('Error submitting evaluation: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      employee_name: '',
      evaluator_name: '',
      company: '',
      location: '',
      evaluation_date: new Date().toISOString().split('T')[0],
      equipment_id: '',
      energy_sources: [],
      stky_assessment: '',
      walk_around_inspection: '',
      hydraulic_fluid: '',
      alarm_horn: '',
      tracks_undercarriage: '',
      bucket_attachment: '',
      swing_radius: '',
      no_swing_over_personnel: '',
      smooth_movements: '',
      excavation_angles: '',
      overhead_hazards: '',
      bucket_position: '',
      safe_speed: '',
      ground_stability: '',
      exclusion_zone: '',
      proper_ppe: '',
      seatbelt_rops: '',
      ground_communication: '',
      no_passengers: '',
      bucket_to_ground: '',
      parking_brake_key: '',
      authorized_parking: '',
      overall_assessment: '',
      follow_up_required: 'None - Employee is competent',
      evaluator_comments: ''
    });
    setSubmitted(false);
    setAssessmentId('');
  };

  const renderPassFailItem = (item) => (
    <div key={item.name} style={item.critical ? styles.safetyCritical : { marginBottom: '15px' }}>
      <label style={{ ...styles.label, color: item.critical ? '#dc2626' : '#374151' }}>
        {item.label} <span style={{ color: '#ef4444' }}>*</span>
      </label>
      <div style={{ display: 'flex', gap: '15px', marginTop: '8px' }}>
        <div
          onClick={() => setPassFail(item.name, 'Pass')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px',
            border: `2px solid ${formData[item.name] === 'Pass' ? '#d97706' : '#e5e7eb'}`,
            borderRadius: '8px', cursor: 'pointer',
            background: formData[item.name] === 'Pass' ? '#fed7aa' : 'white'
          }}
        >
          <input type="radio" name={item.name} value="Pass" checked={formData[item.name] === 'Pass'} onChange={() => {}} required />
          <span>✅ Pass</span>
        </div>
        <div
          onClick={() => setPassFail(item.name, 'Fail')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px',
            border: `2px solid ${formData[item.name] === 'Fail' ? '#dc2626' : '#e5e7eb'}`,
            borderRadius: '8px', cursor: 'pointer',
            background: formData[item.name] === 'Fail' ? '#fee2e2' : 'white'
          }}
        >
          <input type="radio" name={item.name} value="Fail" checked={formData[item.name] === 'Fail'} onChange={() => {}} />
          <span>❌ Fail</span>
        </div>
      </div>
    </div>
  );

  // Success Screen
  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #92400e 0%, #b45309 50%, #d97706 100%)', padding: '20px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', paddingTop: '50px' }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '40px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)' }}>
            <div style={{ fontSize: '60px', marginBottom: '20px' }}>✅</div>
            <h2 style={{ color: '#059669', marginBottom: '10px', fontSize: '24px' }}>Evaluation Submitted!</h2>
            <p style={{ color: '#6b7280', marginBottom: '20px' }}>Assessment ID: <strong>{assessmentId}</strong></p>
            <div style={{ padding: '15px', background: formData.overall_assessment === 'PASS' ? '#d1fae5' : '#fee2e2', borderRadius: '8px', marginBottom: '25px' }}>
              <span style={{ fontSize: '18px', fontWeight: '700', color: formData.overall_assessment === 'PASS' ? '#065f46' : '#991b1b' }}>
                {formData.overall_assessment === 'PASS' ? '✅ PASS' : '❌ FAIL'} - {formData.employee_name}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={resetForm} style={{ background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                New Evaluation
              </button>
              <a href="/" style={{ background: '#6b7280', color: 'white', padding: '12px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', textDecoration: 'none' }}>
                Back to Portal
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const styles = {
    input: { width: '100%', padding: '12px 16px', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' },
    select: { width: '100%', padding: '12px 16px', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', background: 'white' },
    textarea: { width: '100%', padding: '12px 16px', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', minHeight: '100px', resize: 'vertical', boxSizing: 'border-box' },
    label: { display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' },
    section: { marginBottom: '35px', background: '#fef7ed', borderRadius: '12px', padding: '25px', borderLeft: '4px solid #d97706' },
    sectionHeader: { display: 'flex', alignItems: 'center', marginBottom: '20px', fontSize: '18px', fontWeight: '600', color: '#1e293b' },
    safetyCritical: { background: '#fef2f2', border: '2px solid #fca5a5', borderRadius: '8px', padding: '12px', marginBottom: '15px' }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #92400e 0%, #b45309 50%, #d97706 100%)', padding: '20px' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto', background: 'white', borderRadius: '16px', boxShadow: '0 25px 50px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
        
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)', color: 'white', padding: '30px', textAlign: 'center' }}>
          <a href="/" style={{ color: 'white', textDecoration: 'none', fontSize: '14px' }}>← Back to Portal</a>
          <div style={{ fontSize: '48px', margin: '15px 0' }}>🚜</div>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: '700' }}>Excavator Practical Evaluation</h1>
          <p style={{ opacity: 0.9, fontSize: '16px' }}>Heavy Equipment Excavator Operator Assessment</p>
        </div>

        {/* Form */}
        <div style={{ padding: '40px' }}>
          <form onSubmit={handleSubmit}>
            
            {/* Basic Information */}
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <span style={{ fontSize: '24px', marginRight: '12px' }}>📋</span>
                Basic Information
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
                <div>
                  <label style={styles.label}>Employee Name <span style={{ color: '#ef4444' }}>*</span></label>
                  <input type="text" name="employee_name" value={formData.employee_name} onChange={handleChange} required style={styles.input} />
                </div>
                <div>
                  <label style={styles.label}>Evaluator Name <span style={{ color: '#ef4444' }}>*</span></label>
                  <input type="text" name="evaluator_name" value={formData.evaluator_name} onChange={handleChange} required style={styles.input} />
                </div>
                <div>
                  <label style={styles.label}>Company <span style={{ color: '#ef4444' }}>*</span></label>
                  <select name="company" value={formData.company} onChange={handleChange} required style={styles.select}>
                    <option value="">Select Company...</option>
                    {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={styles.label}>Location <span style={{ color: '#ef4444' }}>*</span></label>
                  <select name="location" value={formData.location} onChange={handleChange} required style={styles.select}>
                    <option value="">Select Location...</option>
                    {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label style={styles.label}>Evaluation Date <span style={{ color: '#ef4444' }}>*</span></label>
                  <input type="date" name="evaluation_date" value={formData.evaluation_date} onChange={handleChange} required style={styles.input} />
                </div>
                <div>
                  <label style={styles.label}>Excavator ID/Model</label>
                  <input type="text" name="equipment_id" value={formData.equipment_id} onChange={handleChange} placeholder="e.g., CAT-320, JD-210G" style={styles.input} />
                </div>
              </div>
            </div>

            {/* Energy Sources */}
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <span style={{ fontSize: '24px', marginRight: '12px' }}>⚡</span>
                Energy Sources Present (Select all that apply)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                {ENERGY_SOURCES.map(source => (
                  <div
                    key={source.value}
                    onClick={() => toggleEnergySource(source.value)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px', padding: '12px',
                      border: `2px solid ${formData.energy_sources.includes(source.value) ? '#d97706' : '#e5e7eb'}`,
                      borderRadius: '8px', cursor: 'pointer',
                      background: formData.energy_sources.includes(source.value) ? '#fed7aa' : 'white'
                    }}
                  >
                    <span>{source.icon}</span>
                    <span>{source.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* STKY Assessment */}
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <span style={{ fontSize: '24px', marginRight: '12px' }}>💀</span>
                STKY Assessment
              </div>
              <div style={styles.safetyCritical}>
                <label style={{ ...styles.label, color: '#dc2626' }}>
                  Does this excavator operation involve Life-Threatening, Life-Altering, or Life-Ending potential? <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginTop: '10px' }}>
                  {[
                    { value: 'Yes', label: '🔴 Yes - High Energy/SIF Potential' },
                    { value: 'No', label: '🟢 No - Low Energy Operation' }
                  ].map(opt => (
                    <div
                      key={opt.value}
                      onClick={() => setFormData(prev => ({ ...prev, stky_assessment: opt.value }))}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px',
                        border: `2px solid ${formData.stky_assessment === opt.value ? '#d97706' : '#e5e7eb'}`,
                        borderRadius: '8px', cursor: 'pointer',
                        background: formData.stky_assessment === opt.value ? '#fed7aa' : 'white'
                      }}
                    >
                      <input type="radio" name="stky_assessment" value={opt.value} checked={formData.stky_assessment === opt.value} onChange={() => {}} required />
                      <span>{opt.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Pre-Operation Inspection */}
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <span style={{ fontSize: '24px', marginRight: '12px' }}>🔍</span>
                Pre-Operation Inspection
              </div>
              {PRE_OPERATION_ITEMS.map(renderPassFailItem)}
            </div>

            {/* Excavation Operations */}
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <span style={{ fontSize: '24px', marginRight: '12px' }}>🚧</span>
                Excavation Operations
              </div>
              {EXCAVATION_ITEMS.map(renderPassFailItem)}
            </div>

            {/* Travel and Positioning */}
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <span style={{ fontSize: '24px', marginRight: '12px' }}>🚛</span>
                Travel and Positioning
              </div>
              {TRAVEL_ITEMS.map(renderPassFailItem)}
            </div>

            {/* Safety Protocols */}
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <span style={{ fontSize: '24px', marginRight: '12px' }}>🦺</span>
                Safety Protocols
              </div>
              {SAFETY_ITEMS.map(renderPassFailItem)}
            </div>

            {/* Shutdown Procedures */}
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <span style={{ fontSize: '24px', marginRight: '12px' }}>🛑</span>
                Shutdown and Parking
              </div>
              {SHUTDOWN_ITEMS.map(renderPassFailItem)}
            </div>

            {/* Final Assessment */}
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <span style={{ fontSize: '24px', marginRight: '12px' }}>💭</span>
                Final Assessment
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={styles.label}>Evaluator Comments</label>
                <textarea
                  name="evaluator_comments"
                  value={formData.evaluator_comments}
                  onChange={handleChange}
                  placeholder="Provide specific observations, areas for improvement, or commendations..."
                  style={styles.textarea}
                />
              </div>

              <div style={styles.safetyCritical}>
                <label style={{ ...styles.label, color: '#dc2626' }}>
                  Overall Assessment <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <p style={{ marginBottom: '10px', fontSize: '14px', color: '#dc2626' }}>
                  <strong>Note:</strong> Any safety-critical failure results in automatic FAIL.
                </p>
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                  <div
                    onClick={() => setFormData(prev => ({ ...prev, overall_assessment: 'PASS' }))}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px',
                      border: `2px solid ${formData.overall_assessment === 'PASS' ? '#059669' : '#e5e7eb'}`,
                      borderRadius: '8px', cursor: 'pointer',
                      background: formData.overall_assessment === 'PASS' ? '#d1fae5' : 'white'
                    }}
                  >
                    <input type="radio" name="overall_assessment" value="PASS" checked={formData.overall_assessment === 'PASS'} onChange={() => {}} required />
                    <span style={{ fontWeight: '600' }}>✅ PASS - Competent for independent operation</span>
                  </div>
                  <div
                    onClick={() => setFormData(prev => ({ ...prev, overall_assessment: 'FAIL' }))}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px',
                      border: `2px solid ${formData.overall_assessment === 'FAIL' ? '#dc2626' : '#e5e7eb'}`,
                      borderRadius: '8px', cursor: 'pointer',
                      background: formData.overall_assessment === 'FAIL' ? '#fee2e2' : 'white'
                    }}
                  >
                    <input type="radio" name="overall_assessment" value="FAIL" checked={formData.overall_assessment === 'FAIL'} onChange={() => {}} />
                    <span style={{ fontWeight: '600' }}>❌ FAIL - Requires additional training</span>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '20px' }}>
                <label style={styles.label}>Follow-up Action Required?</label>
                <select name="follow_up_required" value={formData.follow_up_required} onChange={handleChange} style={styles.select}>
                  {FOLLOW_UP_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
            </div>

            {/* Submit */}
            <div style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', margin: '-40px -40px 0', padding: '30px 40px', borderTop: '1px solid #e2e8f0' }}>
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  width: '100%', padding: '16px 32px',
                  background: isSubmitting ? '#9ca3af' : 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                  color: 'white', border: 'none', borderRadius: '8px',
                  fontSize: '16px', fontWeight: '600', cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)'
                }}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Excavator Evaluation'}
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '20px', background: '#f1f5f9', color: '#64748b', fontSize: '11px', borderTop: '1px solid #e2e8f0' }}>
          <span style={{ color: '#1e3a5f', fontWeight: '500' }}>AnthroSafe™ Field Driven Safety</span>
          <span style={{ color: '#94a3b8', margin: '0 8px' }}>|</span>
          <span style={{ color: '#475569' }}>© 2026 SLP Alaska, LLC</span>
        </div>
      </div>
    </div>
  );
}

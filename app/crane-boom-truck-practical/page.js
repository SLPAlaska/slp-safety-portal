'use client';
import { COMPANIES } from '@/lib/companies'
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { safeInsert } from '@/components/SafeSubmit';

const supabase = createClient(
  'https://iypezirwdlqpptjpeeyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
);

const LOCATIONS = [
  'Kenai', 'CIO', 'Beaver Creek', 'Swanson River', 'Ninilchik', 'Nikiski', 'Other Kenai Asset',
  'Deadhorse', 'Prudhoe Bay', 'Kuparuk', 'Alpine', 'Willow', 'ENI', 'PIKKA',
  'Point Thompson', 'North Star Island', 'Endicott', 'Badami', 'West Harrison Bay', 'Other North Slope'
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

// Configuration evaluated (29 CFR 1926.1427: the record shows make, model, and configuration)
const SPAN_OPTIONS = ['Full span', 'Mid span', 'Other (describe in comments)'];
const JIB_OPTIONS = ['No jib', 'Jib stowed', 'Jib erected'];
const BLIND_OPTIONS = [
  { value: 'Evaluated - competent', label: '✅ Evaluated - competent for blind lifts' },
  { value: 'Not evaluated', label: '🚫 Not evaluated - not authorized for blind lifts' }
];

// Safety critical items with their sections
const PRE_OPERATION_ITEMS = [
  { name: 'pre_lift_inspection', label: 'Conducted complete pre-lift inspection?', critical: true },
  { name: 'load_chart', label: 'Verified load chart and capacity ratings?', critical: true },
  { name: 'fluid_check', label: 'Checked hydraulic fluid and engine oil?', critical: false },
  { name: 'wire_rope_inspection', label: 'Inspected wire rope/cables for damage?', critical: true },
  { name: 'load_block_hook', label: 'Tested load block and hook operation?', critical: true },
  { name: 'lmi_tested', label: 'Tested LMI, anti-two-block, and level indicator?', critical: true }
];

const OUTRIGGER_ITEMS = [
  { name: 'firm_level_ground', label: 'Sets up on firm, level ground?', critical: true },
  { name: 'outrigger_setup', label: 'Properly extends and sets all outriggers?', critical: true },
  { name: 'outrigger_floats', label: 'Uses proper outrigger floats/pads?', critical: true },
  { name: 'underground_utilities', label: 'Checks for underground utilities/hazards?', critical: false },
  { name: 'stabilizer_locks', label: 'Sets front stabilizer and outrigger span locks per the manufacturer?', critical: true },
  { name: 'lmi_mode', label: 'Sets LMI mode to match span, jib, and parts of line, and checks it against a known load?', critical: true }
];

const LIFTING_ITEMS = [
  { name: 'load_calculation', label: 'Calculates load weight and verifies capacity?', critical: true },
  { name: 'rigging_slings', label: 'Uses proper rigging and sling angles?', critical: true },
  { name: 'test_lift', label: 'Performs test lift (6 inches maximum)?', critical: true },
  { name: 'signal_person', label: 'Uses signal person when required?', critical: true },
  { name: 'no_swing_over_personnel', label: 'Never swings loads over personnel?', critical: true }
];

const SAFETY_ITEMS = [
  { name: 'proper_ppe', label: 'Uses proper PPE (hard hat, high-vis, safety boots)?', critical: true },
  { name: 'power_line_safety', label: 'Maintains safe distance from power lines?', critical: true },
  { name: 'exclusion_zones', label: 'Establishes and maintains exclusion zones?', critical: true },
  { name: 'hand_signals', label: 'Uses standard hand signals correctly?', critical: false }
];

const SHUTDOWN_ITEMS = [
  { name: 'load_block_secured', label: 'Lowers load block to ground or secure position?', critical: true },
  { name: 'boom_retracted', label: 'Retracts boom to transport position?', critical: false },
  { name: 'outriggers_retracted', label: 'Properly retracts outriggers?', critical: false },
  { name: 'equipment_secured', label: 'Secures equipment in authorized area?', critical: true }
];

const ALL_ITEMS = [...PRE_OPERATION_ITEMS, ...OUTRIGGER_ITEMS, ...LIFTING_ITEMS, ...SAFETY_ITEMS, ...SHUTDOWN_ITEMS];
const ALL_CRITICAL_ITEMS = ALL_ITEMS.filter(i => i.critical);

const EMPTY_FORM = () => ({
  employee_name: '',
  evaluator_name: '',
  company: '',
  location: '',
  evaluation_date: new Date().toLocaleDateString('en-CA'),
  equipment_id: '',
  crane_make: '',
  crane_model: '',
  crane_serial: '',
  outrigger_span: '',
  jib_config: '',
  parts_of_line: '',
  blind_lift: '',
  energy_sources: [],
  stky_assessment: '',
  ...Object.fromEntries(ALL_ITEMS.map(i => [i.name, ''])),
  overall_assessment: '',
  follow_up_required: 'None - Employee is competent',
  evaluator_comments: '',
  evaluator_signature: '',
  evaluator_attestation: false
});

export default function CraneBoomPractical() {
  const [formData, setFormData] = useState(EMPTY_FORM());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [assessmentId, setAssessmentId] = useState('');

  const criticalFailure = ALL_CRITICAL_ITEMS.some(item => formData[item.name] === 'Fail');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
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
      // Auto-fail logic
      const hasFailure = ALL_CRITICAL_ITEMS.some(item => newData[item.name] === 'Fail');
      if (hasFailure && newData.overall_assessment !== 'FAIL') {
        newData.overall_assessment = 'FAIL';
      }
      return newData;
    });
  };

  const setOverall = (value) => {
    // PASS is blocked while any safety-critical item is failed.
    if (value === 'PASS' && criticalFailure) return;
    setFormData(prev => ({ ...prev, overall_assessment: value }));
  };

  const generateAssessmentId = () => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const random = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    return `CRANE-${dateStr}-${random}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.overall_assessment === 'PASS' && criticalFailure) {
      alert('A safety-critical item is marked Fail. The overall assessment must be FAIL.');
      return;
    }
    if (!formData.evaluator_attestation || !formData.evaluator_signature.trim()) {
      alert('The evaluator must sign and check the qualification statement.');
      return;
    }
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
        crane_make: formData.crane_make,
        crane_model: formData.crane_model,
        crane_serial: formData.crane_serial,
        outrigger_span: formData.outrigger_span,
        jib_config: formData.jib_config,
        parts_of_line: formData.parts_of_line,
        blind_lift: formData.blind_lift,
        energy_sources: formData.energy_sources.join(', ') || null,
        stky_assessment: formData.stky_assessment,
        ...Object.fromEntries(ALL_ITEMS.map(i => [i.name, formData[i.name]])),
        overall_assessment: formData.overall_assessment,
        follow_up_required: formData.follow_up_required,
        evaluator_comments: formData.evaluator_comments || null,
        evaluator_signature: formData.evaluator_signature.trim(),
        evaluator_attestation: true,
        signed_at: new Date().toISOString()
      };

      const { error } = await safeInsert('crane_boom_evaluations', [submitData]);
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
    setFormData(EMPTY_FORM());
    setSubmitted(false);
    setAssessmentId('');
  };

  // Render Pass/Fail item
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
            border: `2px solid ${formData[item.name] === 'Pass' ? '#c2410c' : '#e5e7eb'}`,
            borderRadius: '8px', cursor: 'pointer',
            background: formData[item.name] === 'Pass' ? '#fed7d7' : 'white'
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

  // Render a single-choice button group
  const renderChoice = (name, options, required = true) => (
    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '8px' }}>
      {options.map(opt => {
        const value = typeof opt === 'string' ? opt : opt.value;
        const label = typeof opt === 'string' ? opt : opt.label;
        return (
          <div
            key={value}
            onClick={() => setFormData(prev => ({ ...prev, [name]: value }))}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px',
              border: `2px solid ${formData[name] === value ? '#c2410c' : '#e5e7eb'}`,
              borderRadius: '8px', cursor: 'pointer',
              background: formData[name] === value ? '#fed7d7' : 'white'
            }}
          >
            <input type="radio" name={name} value={value} checked={formData[name] === value} onChange={() => {}} required={required} />
            <span>{label}</span>
          </div>
        );
      })}
    </div>
  );

  // Success Screen
  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #7c2d12 0%, #9a3412 50%, #c2410c 100%)', padding: '20px' }}>
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
              <button onClick={resetForm} style={{ background: 'linear-gradient(135deg, #c2410c 0%, #9a3412 100%)', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                New Evaluation
              </button>
              <a href="https://portal.slpalaska.com" style={{ background: '#6b7280', color: 'white', padding: '12px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', textDecoration: 'none' }}>
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
    section: { marginBottom: '35px', background: '#fef2f2', borderRadius: '12px', padding: '25px', borderLeft: '4px solid #c2410c' },
    sectionHeader: { display: 'flex', alignItems: 'center', marginBottom: '20px', fontSize: '18px', fontWeight: '600', color: '#1e293b' },
    safetyCritical: { background: '#fef2f2', border: '2px solid #fca5a5', borderRadius: '8px', padding: '12px', marginBottom: '15px' }
  };

  const req = <span style={{ color: '#ef4444' }}>*</span>;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #7c2d12 0%, #9a3412 50%, #c2410c 100%)', padding: '20px' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto', background: 'white', borderRadius: '16px', boxShadow: '0 25px 50px rgba(0,0,0,0.25)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #c2410c 0%, #9a3412 100%)', color: 'white', padding: '30px', textAlign: 'center' }}>
          <a href="https://portal.slpalaska.com" style={{ color: 'white', textDecoration: 'none', fontSize: '14px' }}>← Back to Portal</a>
          <div style={{ fontSize: '48px', margin: '15px 0' }}>🏗️</div>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: '700' }}>Crane/Boom Truck Practical Evaluation</h1>
          <p style={{ opacity: 0.9, fontSize: '16px' }}>Mobile Crane & Boom Truck Operator Assessment</p>
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
                  <label style={styles.label}>Employee Name {req}</label>
                  <input type="text" name="employee_name" value={formData.employee_name} onChange={handleChange} required style={styles.input} />
                </div>
                <div>
                  <label style={styles.label}>Evaluator Name {req}</label>
                  <input type="text" name="evaluator_name" value={formData.evaluator_name} onChange={handleChange} required style={styles.input} />
                </div>
                <div>
                  <label style={styles.label}>Company {req}</label>
                  <select name="company" value={formData.company} onChange={handleChange} required style={styles.select}>
                    <option value="">Select Company...</option>
                    {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={styles.label}>Location {req}</label>
                  <select name="location" value={formData.location} onChange={handleChange} required style={styles.select}>
                    <option value="">Select Location...</option>
                    {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label style={styles.label}>Evaluation Date {req}</label>
                  <input type="date" name="evaluation_date" value={formData.evaluation_date} onChange={handleChange} required style={styles.input} />
                </div>
                <div>
                  <label style={styles.label}>Unit / Truck Number</label>
                  <input type="text" name="equipment_id" value={formData.equipment_id} onChange={handleChange} placeholder="e.g., Unit 14" style={styles.input} />
                </div>
              </div>
            </div>

            {/* Crane Evaluated */}
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <span style={{ fontSize: '24px', marginRight: '12px' }}>🏗️</span>
                Crane and Configuration Evaluated
              </div>
              <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '-10px', marginBottom: '15px' }}>
                The evaluation covers only the crane and configuration recorded here (29 CFR 1926.1427).
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                <div>
                  <label style={styles.label}>Make {req}</label>
                  <input type="text" name="crane_make" value={formData.crane_make} onChange={handleChange} required placeholder="e.g., National Crane" style={styles.input} />
                </div>
                <div>
                  <label style={styles.label}>Model {req}</label>
                  <input type="text" name="crane_model" value={formData.crane_model} onChange={handleChange} required placeholder="e.g., 18142" style={styles.input} />
                </div>
                <div>
                  <label style={styles.label}>Serial Number {req}</label>
                  <input type="text" name="crane_serial" value={formData.crane_serial} onChange={handleChange} required style={styles.input} />
                </div>
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={styles.label}>Outrigger Span {req}</label>
                {renderChoice('outrigger_span', SPAN_OPTIONS)}
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={styles.label}>Jib {req}</label>
                {renderChoice('jib_config', JIB_OPTIONS)}
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={styles.label}>Parts of Line {req}</label>
                <input type="text" name="parts_of_line" value={formData.parts_of_line} onChange={handleChange} required placeholder="e.g., 2" style={{ ...styles.input, maxWidth: '180px' }} />
              </div>
              <div>
                <label style={styles.label}>Blind Lifts {req}</label>
                {renderChoice('blind_lift', BLIND_OPTIONS)}
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
                      border: `2px solid ${formData.energy_sources.includes(source.value) ? '#c2410c' : '#e5e7eb'}`,
                      borderRadius: '8px', cursor: 'pointer',
                      background: formData.energy_sources.includes(source.value) ? '#fed7d7' : 'white'
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
                  Does this crane/boom truck operation involve Life-Threatening, Life-Altering, or Life-Ending potential? {req}
                </label>
                {renderChoice('stky_assessment', [
                  { value: 'Yes', label: '🔴 Yes - High Energy/SIF Potential' },
                  { value: 'No', label: '🟢 No - Low Energy Operation' }
                ])}
              </div>
            </div>

            <div style={{ ...styles.safetyCritical, marginBottom: '25px', fontSize: '14px', color: '#991b1b' }}>
              <strong>Items outlined in red are safety-critical.</strong> A Fail on any of them makes the overall assessment FAIL.
            </div>

            {/* Pre-Operation Inspection */}
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <span style={{ fontSize: '24px', marginRight: '12px' }}>🔍</span>
                Pre-Operation Inspection
              </div>
              {PRE_OPERATION_ITEMS.map(renderPassFailItem)}
            </div>

            {/* Outrigger Setup */}
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <span style={{ fontSize: '24px', marginRight: '12px' }}>🦵</span>
                Outrigger Setup & Ground Conditions
              </div>
              {OUTRIGGER_ITEMS.map(renderPassFailItem)}
            </div>

            {/* Lifting Operations */}
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <span style={{ fontSize: '24px', marginRight: '12px' }}>🏗️</span>
                Lifting Operations
              </div>
              {LIFTING_ITEMS.map(renderPassFailItem)}
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
                Shutdown and Securing
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
                  Overall Assessment {req}
                </label>
                <p style={{ marginBottom: '10px', fontSize: '14px', color: '#dc2626' }}>
                  <strong>Note:</strong> Any safety-critical failure results in automatic FAIL.
                  {criticalFailure && ' A safety-critical item is marked Fail, so PASS is not available.'}
                </p>
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                  <div
                    onClick={() => setOverall('PASS')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px',
                      border: `2px solid ${formData.overall_assessment === 'PASS' ? '#059669' : '#e5e7eb'}`,
                      borderRadius: '8px', cursor: criticalFailure ? 'not-allowed' : 'pointer',
                      opacity: criticalFailure ? 0.45 : 1,
                      background: formData.overall_assessment === 'PASS' ? '#d1fae5' : 'white'
                    }}
                  >
                    <input type="radio" name="overall_assessment" value="PASS" checked={formData.overall_assessment === 'PASS'} onChange={() => {}} disabled={criticalFailure} required />
                    <span style={{ fontWeight: '600' }}>✅ PASS - Competent for independent operation</span>
                  </div>
                  <div
                    onClick={() => setOverall('FAIL')}
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

            {/* Evaluator Sign-off */}
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <span style={{ fontSize: '24px', marginRight: '12px' }}>✍️</span>
                Evaluator Sign-off
              </div>
              <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '15px', cursor: 'pointer', fontSize: '14px', color: '#374151' }}>
                <input type="checkbox" name="evaluator_attestation" checked={formData.evaluator_attestation} onChange={handleChange} required style={{ marginTop: '3px' }} />
                <span>I have the knowledge, training, and experience to evaluate operators on this equipment. I personally observed this operator on the crane and configuration recorded above, and this evaluation is accurate.</span>
              </label>
              <label style={styles.label}>Evaluator Signature (type full name) {req}</label>
              <input type="text" name="evaluator_signature" value={formData.evaluator_signature} onChange={handleChange} required style={{ ...styles.input, fontFamily: 'cursive', fontSize: '18px' }} />
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>The date and time are recorded when you submit.</p>
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
                {isSubmitting ? 'Submitting...' : 'Submit Crane/Boom Truck Evaluation'}
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

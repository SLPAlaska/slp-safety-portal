'use client';
import { COMPANIES } from '@/lib/companies';
import { Fragment, useState, useRef } from 'react';
import MultiPhotoUpload from '@/components/MultiPhotoUpload';
import { safeSubmit, fieldData } from '@/components/SafeSubmit';
import AnswerRow, { answerSelect } from '@/components/AnswerRow';

// Beam Clamp Inspection
// Rigging use: ASME B30.20 Ch. 20-6 (anchoring clamps). Fall protection use: ANSI Z359.18 / Z359.2, OSHA 1910.140 / 1926.502.
const CONFIG = {
  table: 'beam_clamp_inspections',
  formType: 'beam-clamp-inspection',
  title: 'Beam Clamp Inspection',
  icon: '\u{1F529}',
  subtitle: 'Rigging & Fall Protection Anchor Inspection',
  idPlaceholder: 'e.g., BC-001',
  mfgPlaceholder: 'e.g., CM, Harrington, 3M DBI-SALA, Guardian',
  standardsDefault: 'ASME B30.20 | ANSI Z359.18 | Inspect Before Each Use',
  standardsRigging: 'ASME B30.20 | OSHA 29 CFR 1926.251 | Inspect Before Each Use',
  standardsFP: 'ANSI Z359.18 | OSHA 1910.140 / 1926.502 | Inspect Before Each Use',
  uses: ['Rigging / Hoist Anchor', 'Fall Protection Anchor'],
  fpUse: 'Fall Protection Anchor',
  types: ['Screw-Adjust Beam Clamp', 'Fixed / Bolted Beam Clamp', 'Sliding Beam Anchor', 'Trolley Beam Anchor', 'Other'],
  capacities: ['1/2 Ton', '1 Ton', '2 Ton', '3 Ton', '5 Ton', '10 Ton', '5,000 lbs (1 User - Fall Protection)', 'Other'],
  sizeFields: [
    { name: 'flange_width_range', label: 'Rated Flange Width Range', placeholder: 'e.g., 3 - 9 in' },
    { name: 'beam_flange_width', label: 'Actual Beam Flange Width', placeholder: 'e.g., 6 in' }
  ],
  usageNote: null,
  sections: [
    {
      title: 'Identification & Markings', icon: '\u{1F3F7}\uFE0F', color: '#0891b2',
      note: { tone: 'info', text: 'Missing or illegible capacity markings or product safety labels require removal from service.' },
      items: [
        { name: 'markings_legible', label: 'Capacity, Manufacturer & Flange Range Legible' },
        { name: 'labels_present', label: 'Product Safety Labels Present & Legible' }
      ]
    },
    {
      title: 'Body & Structure', icon: '\u{1F534}', color: '#dc2626',
      note: { tone: 'critical', text: 'CRITICAL: Cracks, distortion, heat damage, or any unauthorized weld or modification requires immediate removal from service.' },
      items: [
        { name: 'body_cracks_deformation', label: 'No Cracks, Bends, Twists or Distortion' },
        { name: 'weld_cracks', label: 'No Cracked Welds', na: true },
        { name: 'pitting_corrosion', label: 'No Excessive Pitting or Corrosion' },
        { name: 'nicks_gouges', label: 'No Excessive Nicks or Gouges' },
        { name: 'heat_damage', label: 'No Heat Damage, Arc Strikes or Weld Spatter' },
        { name: 'unauthorized_mods', label: 'No Unauthorized Welds, Mods or Replacement Parts' }
      ]
    },
    {
      title: 'Jaws & Adjustment', icon: '\u{1F527}', color: '#7c3aed',
      note: { tone: 'warning', text: 'Jaws must seat fully on the flange with no gap. The clamp must be rated for the actual flange width.' },
      items: [
        { name: 'jaw_condition', label: 'Jaws Not Worn, Spread, Bent or Cracked' },
        { name: 'jaw_seating', label: 'Jaws Fully Seated on Flange, No Gap' },
        { name: 'spindle_threads', label: 'Spindle / Screw Threads Undamaged & Clean', na: true },
        { name: 'lock_mechanism', label: 'Lock Nut / Locking Pin Present & Engaged', na: true }
      ]
    },
    {
      title: 'Load Connection & Function', icon: '\u{1F517}', color: '#ea580c',
      items: [
        { name: 'pins_condition', label: 'Pins Not Bent, Worn or Distorted', na: true },
        { name: 'shackle_eye_condition', label: 'Load Eye / Attachment Point Not Elongated or Cracked', labelFP: 'D-Ring / Attachment Point Not Elongated or Cracked' },
        { name: 'moving_parts_function', label: 'Moving Parts Operate Freely, Not Seized', na: true }
      ]
    },
    {
      title: 'Supporting Beam', icon: '\u{1F3D7}\uFE0F', color: '#475569',
      items: [
        { name: 'beam_condition', label: 'Beam Flange Free of Damage or Section Loss' },
        { name: 'beam_capacity_verified', label: 'Beam Capacity Verified by Qualified Person', labelFP: 'Anchorage Supports 5,000 lbs or Designed by Qualified Person' }
      ]
    },
    {
      title: 'Fall Protection Anchor', icon: '\u{1F9BA}', color: '#b45309', fpOnly: true,
      note: { tone: 'critical', text: 'Any anchor that has arrested a fall must be permanently retired. It cannot be repaired or returned to service.' },
      items: [
        {
          name: 'fall_arrest_evidence', label: 'No Evidence It Has Arrested a Fall',
          options: [
            { value: 'Pass', label: 'Pass - No Fall Arrest' },
            { value: 'Fail - Arrested a Fall', label: 'Fail - Has Arrested a Fall' }
          ]
        },
        { name: 'fp_annual_current', label: 'Annual Competent Person Inspection Current' }
      ]
    }
  ]
};

const LOCATIONS = [
  'Kenai', 'CIO', 'Beaver Creek', 'Swanson River', 'Ninilchik', 'Nikiski', 'Other Kenai Asset',
  'Deadhorse', 'Prudhoe Bay', 'Kuparuk', 'Alpine', 'Willow', 'ENI', 'PIKKA',
  'Point Thompson', 'North Star Island', 'Endicott', 'Badami', 'West Harrison Bay', 'Other North Slope'
];

// ASME B30.20 periodic inspection intervals by service class
const SERVICE_CLASSES = [
  { value: 'Normal', label: 'Normal - periodic inspection yearly', months: 12 },
  { value: 'Heavy', label: 'Heavy - periodic inspection semiannually', months: 6 },
  { value: 'Severe', label: 'Severe - periodic inspection quarterly', months: 3 },
  { value: 'Special', label: 'Special / Infrequent - as set by Qualified Person', months: null }
];

const IDLE_OPTIONS = ['In Regular Use', 'Idle 1 Month to 1 Year', 'Idle Over 1 Year'];

const ACTIONS = [
  'Tagged Out of Service',
  'Quarantined for Qualified Person Review',
  'Sent for Repair (Qualified Person)',
  'Removed & Destroyed',
  'Other'
];
const RETIRE_ACTION = 'Removed & Destroyed (Retired - Fall Arrest)';

const PASS_FAIL = [{ value: 'Pass', label: 'Pass' }, { value: 'Fail', label: 'Fail' }];
const PASS_FAIL_NA = [...PASS_FAIL, { value: 'N/A', label: 'N/A' }];

const ITEM_NAMES = CONFIG.sections.flatMap(s => s.items.map(i => i.name));
const FP_ITEM_NAMES = CONFIG.sections.filter(s => s.fpOnly).flatMap(s => s.items.map(i => i.name));

const today = () => new Date().toLocaleDateString('en-CA');

const addMonths = (iso, months) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1 + months, d)).toISOString().slice(0, 10);
};

const blankForm = () => {
  const f = {
    inspector_name: '',
    date: today(),
    company: '',
    location: '',
    clamp_id: '',
    clamp_type: '',
    manufacturer: '',
    model: '',
    serial_number: '',
    capacity_wll: '',
    service_class: '',
    last_periodic_date: '',
    last_periodic_by: '',
    idle_status: '',
    overall_condition: '',
    inspection_result: '',
    action_taken: '',
    comments: ''
  };
  if (CONFIG.uses) f.clamp_use = '';
  CONFIG.sizeFields.forEach(s => { f[s.name] = ''; });
  ITEM_NAMES.forEach(n => { f[n] = ''; });
  return f;
};

const NOTE_STYLES = {
  critical: { background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)', border: '2px solid #dc2626', color: '#991b1b' },
  warning: { background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', border: '2px solid #f59e0b', color: '#92400e' },
  info: { background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)', border: '2px solid #3b82f6', color: '#1e40af' }
};

const inputStyle = { width: '100%', padding: '10px 12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' };
const labelStyle = { display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' };
const fieldGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: '15px' };
const itemGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', gap: '12px' };
const sectionStyle = (color) => ({ background: '#f8fafc', borderRadius: '12px', padding: '20px', marginBottom: '20px', borderLeft: `4px solid ${color}` });
const headingStyle = (color) => ({ fontSize: '18px', fontWeight: '700', color, marginBottom: '15px' });
const pageBg = { minHeight: '100vh', background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #b91c1c 100%)', padding: '20px' };
const primaryBtn = { background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)', color: 'white', border: 'none', padding: '12px 30px', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' };

const note = (tone, text) => {
  const s = NOTE_STYLES[tone];
  return (
    <div style={{ background: s.background, border: s.border, borderRadius: '8px', padding: '12px 15px', marginBottom: '15px' }}>
      <p style={{ fontSize: '13px', color: s.color, margin: 0 }}>{text}</p>
    </div>
  );
};

const getItemStyle = (value) => {
  if (value === 'Pass') return { borderColor: '#16a34a', background: '#f0fdf4' };
  if (value && value.includes('Fail')) return { borderColor: '#dc2626', background: '#fef2f2' };
  if (value === 'N/A') return { borderColor: '#6b7280', background: '#f9fafb' };
  return {};
};

export default function ClampInspection() {
  const [formData, setFormData] = useState(blankForm);
  const photoRef = useRef();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [duplicateConfirmed, setDuplicateConfirmed] = useState(false);

  const isFP = !!CONFIG.fpUse && formData.clamp_use === CONFIG.fpUse;
  const visibleSections = CONFIG.sections.filter(s => !s.fpOnly || isFP);
  const visibleItems = visibleSections.flatMap(s => s.items);
  const anyFail = visibleItems.some(i => (formData[i.name] || '').startsWith('Fail'));
  const fallArrest = isFP && (formData.fall_arrest_evidence || '').startsWith('Fail');

  const serviceClass = SERVICE_CLASSES.find(c => c.value === formData.service_class);
  const periodMonths = isFP ? 12 : (serviceClass ? serviceClass.months : null);
  const nextDue = formData.last_periodic_date && periodMonths ? addMonths(formData.last_periodic_date, periodMonths) : null;
  const overdue = !!nextDue && nextDue < today();

  const standards = isFP ? CONFIG.standardsFP : (formData.clamp_use || !CONFIG.uses ? CONFIG.standardsRigging : CONFIG.standardsDefault);
  const actionOptions = fallArrest ? [RETIRE_ACTION] : ACTIONS;

  const checkDuplicate = async (clampId) => {
    const id = (clampId || '').trim();
    if (id.length < 3 || duplicateConfirmed) return;
    let rows = [];
    try {
      rows = (await fieldData('recent_check', { table: CONFIG.table, id })).rows || [];
    } catch (e) {
      console.error(e);
    }
    if (rows.length > 0) {
      const last = rows[0];
      const d = new Date(last.date + 'T00:00:00');
      const daysAgo = Math.floor((new Date() - d) / 86400000);
      setDuplicateWarning({ daysAgo, date: d.toLocaleDateString(), inspector: last.inspector_name });
    } else {
      setDuplicateWarning(null);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const next = { ...prev, [name]: value };
      if (name === 'clamp_use') {
        next.service_class = '';
        FP_ITEM_NAMES.forEach(n => { next[n] = ''; });
      }
      if (ITEM_NAMES.includes(name) && value.startsWith('Fail')) next.inspection_result = 'Fail';
      if (name === 'fall_arrest_evidence' && value.startsWith('Fail')) next.action_taken = RETIRE_ACTION;
      if (name === 'fall_arrest_evidence' && !value.startsWith('Fail') && prev.action_taken === RETIRE_ACTION) next.action_taken = '';
      if (name === 'inspection_result' && value === 'Pass') next.action_taken = '';
      return next;
    });
    if (name === 'clamp_id') {
      setDuplicateWarning(null);
      setDuplicateConfirmed(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (anyFail && formData.inspection_result !== 'Fail') {
      alert('One or more items failed. The Inspection Result must be Fail.');
      return;
    }
    setSubmitting(true);
    try {
      const data = { ...formData, next_periodic_due: nextDue };
      if (isFP) data.service_class = null;
      else FP_ITEM_NAMES.forEach(n => { data[n] = null; });
      if (data.inspection_result !== 'Fail') data.action_taken = null;

      const result = await safeSubmit({ table: CONFIG.table, data, photoRef, formType: CONFIG.formType });
      if (result.success) {
        setSubmitted(true);
        if (result.photoWarning) console.warn(result.photoWarning);
      } else {
        alert(result.error || 'Submission failed. Please try again.');
      }
    } catch (error) {
      console.error('Submission error:', error);
      alert('Error submitting inspection: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData(blankForm());
    if (photoRef.current) photoRef.current.reset();
    setSubmitted(false);
    setDuplicateWarning(null);
    setDuplicateConfirmed(false);
    if (typeof window !== 'undefined') window.scrollTo(0, 0);
  };

  // Render helpers (plain functions, not components, so inputs keep focus while typing)
  const textField = (label, name, { required = false, type = 'text', placeholder = '' } = {}) => (
    <div>
      <label style={labelStyle}>{label}{required ? ' *' : ''}</label>
      <input type={type} name={name} value={formData[name]} onChange={handleChange} required={required}
        placeholder={placeholder} style={inputStyle} />
    </div>
  );

  const selectField = (label, name, options, { required = false, placeholder = 'Select...' } = {}) => (
    <div>
      <label style={labelStyle}>{label}{required ? ' *' : ''}</label>
      <select name={name} value={formData[name]} onChange={handleChange} required={required} style={inputStyle}>
        <option value="">{placeholder}</option>
        {options.map(o => {
          const v = typeof o === 'string' ? o : o.value;
          const l = typeof o === 'string' ? o : o.label;
          return <option key={v} value={v}>{l}</option>;
        })}
      </select>
    </div>
  );

  const inspectionItem = (it) => {
    const opts = it.options || (it.na ? PASS_FAIL_NA : PASS_FAIL);
    const label = isFP && it.labelFP ? it.labelFP : it.label;
    return (
      <AnswerRow
        key={it.name}
        label={label}
        labelStyle={{ fontSize: '14px', color: '#374151' }}
        style={{ padding: '10px 12px', background: 'white', border: '2px solid #e5e7eb', borderRadius: '8px', ...getItemStyle(formData[it.name]) }}
      >
        <select
          className={answerSelect}
          name={it.name}
          value={formData[it.name]}
          onChange={handleChange}
          required
          style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
        >
          <option value="">Select...</option>
          {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </AnswerRow>
    );
  };

  if (submitted) {
    return (
      <div style={pageBg}>
        <div style={{ maxWidth: '600px', margin: '0 auto', paddingTop: '50px' }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '40px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)' }}>
            <div style={{ fontSize: '60px', marginBottom: '20px' }}>{'\u2705'}</div>
            <h2 style={{ color: '#16a34a', marginBottom: '15px', fontSize: '24px' }}>Inspection Submitted!</h2>
            <p style={{ color: '#6b7280', marginBottom: '25px' }}>{CONFIG.title} recorded successfully.</p>
            <button onClick={resetForm} style={primaryBtn}>Submit Another Inspection</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageBg}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <a href="https://portal.slpalaska.com" style={{ color: 'white', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px', marginBottom: '15px', fontSize: '14px' }}>
          {'\u2190 Back to Portal'}
        </a>

        <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)', color: 'white', padding: '30px 20px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              <div style={{ background: 'white', borderRadius: '16px', padding: '15px 25px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
                <img src="/Logo.png" alt="SLP Alaska" style={{ height: '90px', width: 'auto' }} />
              </div>
            </div>
            <h1 style={{ fontSize: '28px', marginBottom: '5px', textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>{CONFIG.icon + ' ' + CONFIG.title}</h1>
            <p style={{ fontSize: '16px', opacity: '0.9' }}>{CONFIG.subtitle}</p>
            <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 15px', marginTop: '15px', fontSize: '13px' }}>
              {'\u26A0\uFE0F ' + standards}
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ padding: '25px' }}>
            {/* Clamp & Inspector Information */}
            <div style={sectionStyle('#1e3a8a')}>
              <h3 style={headingStyle('#1e3a8a')}>{'\u{1F4CB} Clamp & Inspector Information'}</h3>
              <div style={fieldGrid}>
                {textField('Inspector Name', 'inspector_name', { required: true })}
                {textField('Inspection Date', 'date', { required: true, type: 'date' })}
                {selectField('Company', 'company', COMPANIES, { required: true, placeholder: 'Select Company...' })}
                {selectField('Location', 'location', LOCATIONS, { required: true, placeholder: 'Select Location...' })}
                <div>
                  <label style={labelStyle}>Clamp ID / Tag Number *</label>
                  <input type="text" name="clamp_id" value={formData.clamp_id} onChange={handleChange} required
                    placeholder={CONFIG.idPlaceholder}
                    onBlur={() => checkDuplicate(formData.clamp_id)}
                    style={inputStyle} />
                  {duplicateWarning && !duplicateConfirmed && (
                    <div style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', border: '2px solid #f59e0b', borderRadius: '8px', padding: '15px', marginTop: '10px' }}>
                      <h4 style={{ color: '#92400e', marginBottom: '8px', fontSize: '14px' }}>{'\u26A0\uFE0F Recently Inspected'}</h4>
                      <p style={{ color: '#92400e', fontSize: '13px', marginBottom: '10px' }}>
                        This clamp was inspected <strong>{duplicateWarning.daysAgo} days ago</strong> on {duplicateWarning.date} by {duplicateWarning.inspector}.
                      </p>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button type="button" onClick={() => setDuplicateConfirmed(true)}
                          style={{ background: '#f59e0b', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
                          Inspect Anyway
                        </button>
                        <button type="button" onClick={() => { setFormData(prev => ({ ...prev, clamp_id: '' })); setDuplicateWarning(null); }}
                          style={{ background: '#6b7280', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
                          Enter Different ID
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                {CONFIG.uses && selectField('Clamp Use', 'clamp_use', CONFIG.uses, { required: true, placeholder: 'Select Use...' })}
                {selectField('Clamp Type', 'clamp_type', CONFIG.types, { required: true, placeholder: 'Select Type...' })}
                {selectField(isFP ? 'Rated Capacity' : 'Capacity / WLL', 'capacity_wll', CONFIG.capacities, { required: true, placeholder: 'Select Capacity...' })}
                {CONFIG.sizeFields.map(s => <Fragment key={s.name}>{textField(s.label, s.name, { placeholder: s.placeholder })}</Fragment>)}
                {textField('Manufacturer', 'manufacturer', { placeholder: CONFIG.mfgPlaceholder })}
                {textField('Model', 'model')}
                {textField('Serial Number', 'serial_number')}
              </div>
            </div>

            {CONFIG.usageNote && note(CONFIG.usageNote.tone, CONFIG.usageNote.text)}

            {/* Service & Periodic Inspection */}
            <div style={sectionStyle('#1e40af')}>
              <h3 style={headingStyle('#1e40af')}>{'\u{1F4C5} Service Class & Periodic Inspection'}</h3>
              {isFP
                ? note('info', 'Fall protection anchors: inspect before each use, plus a formal documented inspection by a Competent Person other than the user at least annually (ANSI Z359.2 / Z359.18). Follow the manufacturer if it requires a shorter interval.')
                : note('info', 'ASME B30.20: monthly frequent inspection for normal service. Documented periodic inspection by a Qualified Person yearly (normal), semiannually (heavy), or quarterly (severe).')}
              <div style={fieldGrid}>
                {!isFP && selectField('Service Class', 'service_class', SERVICE_CLASSES, { required: true, placeholder: 'Select Service Class...' })}
                {selectField('Usage Status', 'idle_status', IDLE_OPTIONS, { required: true })}
                {textField(isFP ? 'Last Annual Inspection Date' : 'Last Periodic Inspection Date', 'last_periodic_date', { type: 'date' })}
                {textField(isFP ? 'Last Annual Inspection By (Competent Person)' : 'Last Periodic Inspection By (Qualified Person)', 'last_periodic_by')}
              </div>
              <div style={{ marginTop: '15px' }}>
                {nextDue && !overdue && note('info', 'Next periodic inspection due: ' + nextDue)}
                {overdue && note('critical', 'PERIODIC INSPECTION OVERDUE (was due ' + nextDue + '). Remove from service until the periodic inspection is completed and documented.')}
                {!formData.last_periodic_date && note('warning', 'No periodic inspection date entered. A documented periodic inspection is required to establish the inspection baseline.')}
                {formData.idle_status === 'Idle Over 1 Year' && note('critical', 'Idle over 1 year: a full periodic inspection by a Qualified Person is required before this clamp returns to service.')}
              </div>
            </div>

            {/* Inspection Sections */}
            {visibleSections.map(section => (
              <div key={section.title} style={sectionStyle(section.color)}>
                <h3 style={headingStyle(section.color)}>{section.icon + ' ' + section.title}</h3>
                {section.note && note(section.note.tone, section.note.text)}
                <div style={itemGrid}>
                  {section.items.map(it => inspectionItem(it))}
                </div>
              </div>
            ))}

            {/* Overall & Result */}
            <div style={sectionStyle('#16a34a')}>
              <h3 style={headingStyle('#16a34a')}>{'\u2705 Overall Condition & Inspection Result'}</h3>
              {fallArrest && note('critical', 'This anchor has arrested a fall. It must be permanently retired and destroyed. It cannot be repaired or returned to service.')}
              {anyFail && !fallArrest && note('critical', 'One or more items failed. Remove the clamp from service and tag it. A Qualified Person must approve any return to service.')}
              <div style={{ ...fieldGrid, marginBottom: '15px' }}>
                {selectField('Overall Clamp Condition', 'overall_condition', [
                  { value: 'Good', label: 'Good - Ready for Use' },
                  { value: 'Fair', label: 'Fair - Minor Wear (Monitor)' },
                  { value: 'Poor', label: 'Poor - Significant Wear' },
                  { value: 'Critical', label: 'Critical - Remove from Service' }
                ], { required: true })}
                <div>
                  <label style={labelStyle}>Inspection Result *</label>
                  <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                    <label style={{
                      display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 15px',
                      background: formData.inspection_result === 'Pass' ? '#dcfce7' : 'white',
                      border: `2px solid ${formData.inspection_result === 'Pass' ? '#16a34a' : '#e5e7eb'}`,
                      borderRadius: '8px', cursor: anyFail ? 'not-allowed' : 'pointer', opacity: anyFail ? 0.5 : 1
                    }}>
                      <input type="radio" name="inspection_result" value="Pass" checked={formData.inspection_result === 'Pass'}
                        onChange={handleChange} disabled={anyFail} required />
                      <span>{'\u2705 Pass'}</span>
                    </label>
                    <label style={{
                      display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 15px',
                      background: formData.inspection_result === 'Fail' ? '#fee2e2' : 'white',
                      border: `2px solid ${formData.inspection_result === 'Fail' ? '#dc2626' : '#e5e7eb'}`,
                      borderRadius: '8px', cursor: 'pointer'
                    }}>
                      <input type="radio" name="inspection_result" value="Fail" checked={formData.inspection_result === 'Fail'} onChange={handleChange} />
                      <span>{'\u274C Fail - Remove from Service'}</span>
                    </label>
                  </div>
                </div>
              </div>

              {formData.inspection_result === 'Fail' && (
                <div style={{ marginBottom: '15px' }}>
                  {selectField('Action Taken', 'action_taken', actionOptions, { required: true, placeholder: 'Select Action...' })}
                </div>
              )}

              <div>
                <label style={labelStyle}>Comments</label>
                <textarea name="comments" value={formData.comments} onChange={handleChange}
                  placeholder="Deficiencies found, measurements taken, or recommendations..."
                  style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} />
              </div>
            </div>

            {/* Photo Documentation */}
            <MultiPhotoUpload ref={photoRef} formType={CONFIG.formType} />

            {/* Submit Buttons */}
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button type="submit" disabled={submitting}
                style={{ ...primaryBtn, background: submitting ? '#9ca3af' : primaryBtn.background, cursor: submitting ? 'not-allowed' : 'pointer' }}>
                {submitting ? 'Submitting...' : 'Submit Inspection'}
              </button>
              <button type="button" onClick={resetForm} style={{ ...primaryBtn, background: '#6b7280' }}>
                Clear Form
              </button>
            </div>
          </form>

          {/* Footer */}
          <div style={{ textAlign: 'center', padding: '20px 10px', borderTop: '1px solid #e2e8f0', fontSize: '11px', color: '#64748b', background: 'linear-gradient(to bottom, #f8fafc, #ffffff)' }}>
            <span style={{ color: '#1e3a5f', fontWeight: '500' }}>{'AnthroSafe\u2122 Field Driven Safety'}</span>
            <span style={{ color: '#94a3b8', margin: '0 8px' }}>|</span>
            <span style={{ color: '#475569' }}>{'\u00A9 2026 SLP Alaska, LLC'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

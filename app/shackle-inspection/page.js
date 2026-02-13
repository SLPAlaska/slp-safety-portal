'use client';

import { useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import MultiPhotoUpload from '@/components/MultiPhotoUpload';

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

const SHACKLE_TYPES = [
  'Anchor Shackle (Bow)', 'Chain Shackle (D)', 'Screw Pin Anchor', 'Screw Pin Chain',
  'Bolt Type Anchor', 'Bolt Type Chain', 'Round Pin Anchor', 'Wide Body Shackle', 'Web Sling Shackle', 'Other'
];

const SIZES = [
  '1/4 in', '5/16 in', '3/8 in', '7/16 in', '1/2 in', '5/8 in', '3/4 in', '7/8 in',
  '1 in', '1-1/8 in', '1-1/4 in', '1-1/2 in', '1-3/4 in', '2 in', 'Other'
];

const CAPACITIES = [
  '1/2 Ton', '3/4 Ton', '1 Ton', '1-1/2 Ton', '2 Ton', '3-1/4 Ton', '4-3/4 Ton',
  '6-1/2 Ton', '8-1/2 Ton', '9-1/2 Ton', '12 Ton', '17 Ton', '25 Ton', '35 Ton', '55 Ton', '85 Ton', 'Other'
];

export default function ShackleInspection() {
  const [formData, setFormData] = useState({
    inspector_name: '',
    date: new Date().toISOString().split('T')[0],
    company: '',
    location: '',
    specific_location: '',
    quantity_inspected: 1,
    shackle_type: '',
    size: '',
    capacity_wll: '',
    manufacturer: '',
    // Body Condition
    body_cracks: '',
    body_wear: '',
    body_distortion: '',
    // Pin Condition
    pin_straightness: '',
    pin_thread: '',
    pin_wear: '',
    pin_securement: '',
    cotter_pin: '',
    // Markings
    capacity_marking: '',
    manufacturer_marking: '',
    proper_match: '',
    no_unauthorized_repairs: '',
    // Results
    overall_condition: '',
    inspection_result: '',
    quantity_passed: 0,
    quantity_failed: 0,
    action_taken: '',
    comments: ''
  });

  const photoRef = useRef();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Auto-update quantity passed/failed based on result
    if (name === 'inspection_result') {
      const qty = parseInt(formData.quantity_inspected) || 1;
      if (value === 'All Pass') {
        setFormData(prev => ({ ...prev, [name]: value, quantity_passed: qty, quantity_failed: 0 }));
      } else if (value === 'All Fail') {
        setFormData(prev => ({ ...prev, [name]: value, quantity_passed: 0, quantity_failed: qty }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Generate a unique submission ID for photo storage path
      const submissionId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      // Upload photos if any were staged
      let photoUrls = [];
      if (photoRef.current && photoRef.current.hasPhotos()) {
        photoUrls = await photoRef.current.uploadAll(submissionId);
      }

      const { error } = await supabase
        .from('shackle_inspections')
        .insert([{
          ...formData,
          photo_urls: photoUrls.length > 0 ? photoUrls : null
        }]);

      if (error) throw error;
      setSubmitted(true);
    } catch (error) {
      console.error('Submission error:', error);
      alert('Error submitting inspection: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      inspector_name: '',
      date: new Date().toISOString().split('T')[0],
      company: '',
      location: '',
      specific_location: '',
      quantity_inspected: 1,
      shackle_type: '',
      size: '',
      capacity_wll: '',
      manufacturer: '',
      body_cracks: '',
      body_wear: '',
      body_distortion: '',
      pin_straightness: '',
      pin_thread: '',
      pin_wear: '',
      pin_securement: '',
      cotter_pin: '',
      capacity_marking: '',
      manufacturer_marking: '',
      proper_match: '',
      no_unauthorized_repairs: '',
      overall_condition: '',
      inspection_result: '',
      quantity_passed: 0,
      quantity_failed: 0,
      action_taken: '',
      comments: ''
    });
    if (photoRef.current) photoRef.current.reset();
    setSubmitted(false);
  };

  const getItemStyle = (value) => {
    if (value === 'Pass') return { borderColor: '#16a34a', background: '#f0fdf4' };
    if (value === 'Fail') return { borderColor: '#dc2626', background: '#fef2f2' };
    if (value === 'N/A') return { borderColor: '#6b7280', background: '#f9fafb' };
    return {};
  };

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #b91c1c 100%)', padding: '20px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', paddingTop: '50px' }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '40px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)' }}>
            <div style={{ fontSize: '60px', marginBottom: '20px' }}>✅</div>
            <h2 style={{ color: '#16a34a', marginBottom: '15px', fontSize: '24px' }}>Inspection Submitted!</h2>
            <p style={{ color: '#6b7280', marginBottom: '25px' }}>Shackle Inspection recorded successfully.</p>
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
              Submit Another Inspection
            </button>
          </div>
        </div>
      </div>
    );
  }

  const InspectionItem = ({ label, name, showNA = false }) => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '10px 12px',
      background: 'white',
      border: '2px solid #e5e7eb',
      borderRadius: '8px',
      gap: '10px',
      ...getItemStyle(formData[name])
    }}>
      <span style={{ fontSize: '14px', color: '#374151', flex: 1 }}>{label}</span>
      <select
        name={name}
        value={formData[name]}
        onChange={handleChange}
        style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', minWidth: '100px' }}
      >
        <option value="">Select...</option>
        <option value="Pass">Pass</option>
        <option value="Fail">Fail</option>
        {showNA && <option value="N/A">N/A</option>}
      </select>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #b91c1c 100%)', padding: '20px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <a href="/" style={{ color: 'white', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px', marginBottom: '15px', fontSize: '14px' }}>
          ← Back to Portal
        </a>

        <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)', color: 'white', padding: '30px 20px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              <div style={{ background: 'white', borderRadius: '16px', padding: '15px 25px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
                <img src="/Logo.png" alt="SLP Alaska" style={{ height: '90px', width: 'auto' }} />
              </div>
            </div>
            <h1 style={{ fontSize: '28px', marginBottom: '5px', textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>⛓️ Shackle Inspection</h1>
            <p style={{ fontSize: '16px', opacity: '0.9' }}>Rigging Hardware Inspection</p>
            <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 15px', marginTop: '15px', fontSize: '13px' }}>
              ⚠️ OSHA 29 CFR 1926.251 & ASME B30.26 Compliant | Inspect Before Each Use
            </div>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} style={{ padding: '25px' }}>
            {/* Inspector & Location Information */}
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '20px', marginBottom: '20px', borderLeft: '4px solid #1e3a8a' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e3a8a', marginBottom: '15px' }}>
                📋 Inspector & Location Information
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Inspector Name *</label>
                  <input type="text" name="inspector_name" value={formData.inspector_name} onChange={handleChange} required
                    style={{ width: '100%', padding: '10px 12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Inspection Date *</label>
                  <input type="date" name="date" value={formData.date} onChange={handleChange} required
                    style={{ width: '100%', padding: '10px 12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Company *</label>
                  <select name="company" value={formData.company} onChange={handleChange} required
                    style={{ width: '100%', padding: '10px 12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }}>
                    <option value="">Select Company...</option>
                    {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Location *</label>
                  <select name="location" value={formData.location} onChange={handleChange} required
                    style={{ width: '100%', padding: '10px 12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }}>
                    <option value="">Select Location...</option>
                    {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Specific Location *</label>
                  <input type="text" name="specific_location" value={formData.specific_location} onChange={handleChange} required
                    placeholder="e.g., Rig Floor, Pipe Rack, Shop"
                    style={{ width: '100%', padding: '10px 12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Quantity Inspected *</label>
                  <input type="number" name="quantity_inspected" value={formData.quantity_inspected} onChange={handleChange} required min="1"
                    style={{ width: '100%', padding: '10px 12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }} />
                </div>
              </div>
            </div>

            {/* Shackle Details */}
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '20px', marginBottom: '20px', borderLeft: '4px solid #6366f1' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#6366f1', marginBottom: '15px' }}>
                🔩 Shackle Details
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Shackle Type *</label>
                  <select name="shackle_type" value={formData.shackle_type} onChange={handleChange} required
                    style={{ width: '100%', padding: '10px 12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }}>
                    <option value="">Select Type...</option>
                    {SHACKLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Size *</label>
                  <select name="size" value={formData.size} onChange={handleChange} required
                    style={{ width: '100%', padding: '10px 12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }}>
                    <option value="">Select Size...</option>
                    {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Capacity / WLL</label>
                  <select name="capacity_wll" value={formData.capacity_wll} onChange={handleChange}
                    style={{ width: '100%', padding: '10px 12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }}>
                    <option value="">Select Capacity...</option>
                    {CAPACITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Manufacturer</label>
                  <input type="text" name="manufacturer" value={formData.manufacturer} onChange={handleChange}
                    placeholder="e.g., Crosby, CM, Van Beest"
                    style={{ width: '100%', padding: '10px 12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }} />
                </div>
              </div>
            </div>

            {/* Body Condition */}
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '20px', marginBottom: '20px', borderLeft: '4px solid #dc2626' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#dc2626', marginBottom: '15px' }}>
                🔴 Shackle Body Condition
              </h3>
              <div style={{ background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)', border: '2px solid #dc2626', borderRadius: '8px', padding: '12px 15px', marginBottom: '15px' }}>
                <p style={{ fontSize: '13px', color: '#991b1b', margin: 0 }}>
                  🚨 CRITICAL: Any cracks, significant wear, or distortion requires immediate removal from service. Never use a shackle that shows 10% or more wear.
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                <InspectionItem label="No Cracks / Nicks / Gouges" name="body_cracks" />
                <InspectionItem label="No Excessive Wear / Corrosion" name="body_wear" />
                <InspectionItem label="No Distortion / Stretching / Bending" name="body_distortion" />
              </div>
            </div>

            {/* Pin Condition */}
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '20px', marginBottom: '20px', borderLeft: '4px solid #7c3aed' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#7c3aed', marginBottom: '15px' }}>
                📍 Pin Condition
              </h3>
              <div style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', border: '2px solid #f59e0b', borderRadius: '8px', padding: '12px 15px', marginBottom: '15px' }}>
                <p style={{ fontSize: '13px', color: '#92400e', margin: 0 }}>
                  ⚠️ Never substitute a bolt for a shackle pin. Pins must be properly matched to the shackle body and fully seated.
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                <InspectionItem label="Pin Straight (Not Bent)" name="pin_straightness" />
                <InspectionItem label="Threads in Good Condition" name="pin_thread" />
                <InspectionItem label="No Excessive Wear / Corrosion" name="pin_wear" />
                <InspectionItem label="Pin Properly Secured" name="pin_securement" />
                <InspectionItem label="Cotter Pin / Nut Present (If Required)" name="cotter_pin" showNA />
              </div>
            </div>

            {/* Markings & Identification */}
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '20px', marginBottom: '20px', borderLeft: '4px solid #0891b2' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0891b2', marginBottom: '15px' }}>
                🏷️ Markings & Identification
              </h3>
              <div style={{ background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)', border: '2px solid #3b82f6', borderRadius: '8px', padding: '12px 15px', marginBottom: '15px' }}>
                <p style={{ fontSize: '13px', color: '#1e40af', margin: 0 }}>
                  ℹ️ All shackles must have legible capacity markings. Never use a shackle with illegible or missing WLL marking.
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                <InspectionItem label="Capacity/WLL Marking Legible" name="capacity_marking" />
                <InspectionItem label="Manufacturer Marking Present" name="manufacturer_marking" showNA />
                <InspectionItem label="Pin Properly Matched to Body" name="proper_match" />
                <InspectionItem label="No Unauthorized Repairs/Modifications" name="no_unauthorized_repairs" />
              </div>
            </div>

            {/* Overall & Result */}
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '20px', marginBottom: '20px', borderLeft: '4px solid #16a34a' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#16a34a', marginBottom: '15px' }}>
                ✅ Overall Condition & Inspection Result
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Overall Condition *</label>
                  <select name="overall_condition" value={formData.overall_condition} onChange={handleChange} required
                    style={{ width: '100%', padding: '10px 12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }}>
                    <option value="">Select...</option>
                    <option value="Good">Good - Ready for Use</option>
                    <option value="Fair">Fair - Minor Issues Noted</option>
                    <option value="Poor">Poor - Needs Attention</option>
                    <option value="Critical">Critical - Remove from Service</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Inspection Result *</label>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <label style={{
                      display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 15px',
                      background: formData.inspection_result === 'All Pass' ? '#dcfce7' : 'white',
                      border: `2px solid ${formData.inspection_result === 'All Pass' ? '#16a34a' : '#e5e7eb'}`,
                      borderRadius: '8px', cursor: 'pointer', fontSize: '14px'
                    }}>
                      <input type="radio" name="inspection_result" value="All Pass" checked={formData.inspection_result === 'All Pass'} onChange={handleChange} required />
                      <span>✅ All Pass</span>
                    </label>
                    <label style={{
                      display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 15px',
                      background: formData.inspection_result === 'Partial Pass' ? '#fef3c7' : 'white',
                      border: `2px solid ${formData.inspection_result === 'Partial Pass' ? '#f59e0b' : '#e5e7eb'}`,
                      borderRadius: '8px', cursor: 'pointer', fontSize: '14px'
                    }}>
                      <input type="radio" name="inspection_result" value="Partial Pass" checked={formData.inspection_result === 'Partial Pass'} onChange={handleChange} />
                      <span>⚠️ Partial Pass</span>
                    </label>
                    <label style={{
                      display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 15px',
                      background: formData.inspection_result === 'All Fail' ? '#fee2e2' : 'white',
                      border: `2px solid ${formData.inspection_result === 'All Fail' ? '#dc2626' : '#e5e7eb'}`,
                      borderRadius: '8px', cursor: 'pointer', fontSize: '14px'
                    }}>
                      <input type="radio" name="inspection_result" value="All Fail" checked={formData.inspection_result === 'All Fail'} onChange={handleChange} />
                      <span>❌ All Fail</span>
                    </label>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Quantity Passed</label>
                  <input type="number" name="quantity_passed" value={formData.quantity_passed} onChange={handleChange} min="0"
                    style={{ width: '100%', padding: '10px 12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Quantity Failed</label>
                  <input type="number" name="quantity_failed" value={formData.quantity_failed} onChange={handleChange} min="0"
                    style={{ width: '100%', padding: '10px 12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }} />
                </div>
              </div>

              {(formData.inspection_result === 'Partial Pass' || formData.inspection_result === 'All Fail') && (
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Action Taken (for failed shackles)</label>
                  <select name="action_taken" value={formData.action_taken} onChange={handleChange}
                    style={{ width: '100%', padding: '10px 12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }}>
                    <option value="">Select Action...</option>
                    <option value="Tagged Out of Service">Tagged Out of Service</option>
                    <option value="Removed from Service">Removed from Service</option>
                    <option value="Sent for Recertification">Sent for Recertification</option>
                    <option value="Destroyed/Disposed">Destroyed/Disposed</option>
                    <option value="Quarantined for Review">Quarantined for Review</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Comments</label>
                <textarea name="comments" value={formData.comments} onChange={handleChange}
                  placeholder="Any additional notes, deficiencies found, or recommendations..."
                  style={{ width: '100%', padding: '10px 12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px', minHeight: '80px', resize: 'vertical' }} />
              </div>
            </div>

            {/* Photo Documentation */}
            <MultiPhotoUpload ref={photoRef} formType="shackle-inspection" />

            {/* Submit Buttons */}
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button type="submit" disabled={submitting}
                style={{
                  background: submitting ? '#9ca3af' : 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '12px 30px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: submitting ? 'not-allowed' : 'pointer'
                }}>
                {submitting ? 'Submitting...' : 'Submit Inspection'}
              </button>
              <button type="button" onClick={resetForm}
                style={{
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  padding: '12px 30px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}>
                Clear Form
              </button>
            </div>
          </form>

          {/* Footer */}
          <div style={{ textAlign: 'center', padding: '20px 10px', borderTop: '1px solid #e2e8f0', fontSize: '11px', color: '#64748b', background: 'linear-gradient(to bottom, #f8fafc, #ffffff)' }}>
            <span style={{ color: '#1e3a5f', fontWeight: '500' }}>AnthroSafe™ Field Driven Safety</span>
            <span style={{ color: '#94a3b8', margin: '0 8px' }}>|</span>
            <span style={{ color: '#475569' }}>© 2026 SLP Alaska, LLC</span>
          </div>
        </div>
      </div>
    </div>
  );
}

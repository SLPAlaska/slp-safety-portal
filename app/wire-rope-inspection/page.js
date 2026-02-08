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
  'Pollard Wireline', 'Ridgeline Oilfield Services', 'Santos', 'Summit Excavation', 'Yellowjacket', 'Other'
];

const LOCATIONS = [
  'Kenai', 'CIO', 'Beaver Creek', 'Swanson River', 'Ninilchik', 'Nikiski', 'Other Kenai Asset',
  'Deadhorse', 'Prudhoe Bay', 'Kuparuk', 'Alpine', 'Willow', 'ENI', 'PIKKA',
  'Point Thompson', 'North Star Island', 'Endicott', 'Badami', 'Other North Slope'
];

const ROPE_TYPES = [
  '6x19 IWRC', '6x19 Fiber Core', '6x37 IWRC', '6x37 Fiber Core', '8x19 IWRC',
  '19x7 Rotation Resistant', '35x7 Rotation Resistant', 'Wire Rope Sling', 'Bridle Sling', 'Choker Sling', 'Other'
];

const CAPACITIES = [
  '1/2 Ton', '1 Ton', '2 Ton', '3 Ton', '5 Ton', '7.5 Ton',
  '10 Ton', '15 Ton', '20 Ton', '25 Ton', '30 Ton', 'Other'
];

const DIAMETERS = [
  '1/4 in', '5/16 in', '3/8 in', '7/16 in', '1/2 in', '9/16 in',
  '5/8 in', '3/4 in', '7/8 in', '1 in', '1-1/8 in', '1-1/4 in', 'Other'
];

const LENGTHS = ['3 ft', '4 ft', '6 ft', '8 ft', '10 ft', '12 ft', '15 ft', '20 ft', '25 ft', '30 ft', 'Other'];

const CORE_TYPES = [
  'IWRC (Independent Wire Rope Core)', 'Fiber Core', 'Strand Core', 'WSC (Wire Strand Core)', 'Unknown'
];

export default function WireRopeInspection() {
  const [formData, setFormData] = useState({
    inspector_name: '',
    date: new Date().toISOString().split('T')[0],
    company: '',
    location: '',
    rope_id: '',
    rope_type: '',
    capacity_wll: '',
    diameter: '',
    length: '',
    core_type: '',
    manufacturer: '',
    // Wire & Strand Condition
    broken_wires: '',
    corrosion: '',
    kinking: '',
    bird_caging: '',
    core_protrusion: '',
    crushing: '',
    heat_damage: '',
    abrasion_wear: '',
    diameter_reduction: '',
    strand_displacement: '',
    // End Terminations
    end_fitting: '',
    thimble_condition: '',
    ferrule_condition: '',
    // Identification & Maintenance
    missing_tag: '',
    proper_lubrication: '',
    // Results
    overall_condition: '',
    inspection_result: '',
    action_taken: '',
    comments: ''
  });

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [duplicateConfirmed, setDuplicateConfirmed] = useState(false);

  const checkDuplicateInspection = async (ropeId) => {
    if (!ropeId || duplicateConfirmed) return;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await supabase
      .from('wire_rope_inspections')
      .select('date, inspector_name')
      .ilike('rope_id', ropeId)
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      const lastInspection = data[0];
      const inspectionDate = new Date(lastInspection.date);
      const daysAgo = Math.floor((new Date() - inspectionDate) / (1000 * 60 * 60 * 24));
      
      setDuplicateWarning({
        daysAgo,
        date: inspectionDate.toLocaleDateString(),
        inspector: lastInspection.inspector_name
      });
    } else {
      setDuplicateWarning(null);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'rope_id' && value.length >= 3) {
      checkDuplicateInspection(value);
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
    const fileName = `wire-rope-${Date.now()}.${fileExt}`;
    const filePath = `wire-rope-inspection/${fileName}`;

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
        .from('wire_rope_inspections')
        .insert([{
          ...formData,
          photo_url: photoUrl
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
      rope_id: '',
      rope_type: '',
      capacity_wll: '',
      diameter: '',
      length: '',
      core_type: '',
      manufacturer: '',
      broken_wires: '',
      corrosion: '',
      kinking: '',
      bird_caging: '',
      core_protrusion: '',
      crushing: '',
      heat_damage: '',
      abrasion_wear: '',
      diameter_reduction: '',
      strand_displacement: '',
      end_fitting: '',
      thimble_condition: '',
      ferrule_condition: '',
      missing_tag: '',
      proper_lubrication: '',
      overall_condition: '',
      inspection_result: '',
      action_taken: '',
      comments: ''
    });
    setPhotoFile(null);
    setPhotoPreview(null);
    setSubmitted(false);
    setDuplicateWarning(null);
    setDuplicateConfirmed(false);
  };

  const getItemStyle = (value) => {
    if (value === 'Pass') return { borderColor: '#16a34a', background: '#f0fdf4' };
    if (value && value.includes('Fail')) return { borderColor: '#dc2626', background: '#fef2f2' };
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
            <p style={{ color: '#6b7280', marginBottom: '25px' }}>Wire Rope Inspection recorded successfully.</p>
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

  const InspectionItem = ({ label, name, options = null, showNA = false }) => (
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
        style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', minWidth: '120px' }}
      >
        <option value="">Select...</option>
        {options ? options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        )) : (
          <>
            <option value="Pass">Pass</option>
            <option value="Fail">Fail</option>
            {showNA && <option value="N/A">N/A</option>}
          </>
        )}
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
            <h1 style={{ fontSize: '28px', marginBottom: '5px', textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>🔗 Wire Rope Inspection</h1>
            <p style={{ fontSize: '16px', opacity: '0.9' }}>Rigging Equipment Inspection</p>
            <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 15px', marginTop: '15px', fontSize: '13px' }}>
              ⚠️ OSHA 29 CFR 1926.251 & ASME B30.9 Compliant | Monthly Inspection Required
            </div>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} style={{ padding: '25px' }}>
            {/* Wire Rope & Inspector Information */}
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '20px', marginBottom: '20px', borderLeft: '4px solid #1e3a8a' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e3a8a', marginBottom: '15px' }}>
                📋 Wire Rope & Inspector Information
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
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Wire Rope ID / Tag *</label>
                  <input type="text" name="rope_id" value={formData.rope_id} onChange={handleChange} required
                    placeholder="e.g., WR-001"
                    onBlur={() => checkDuplicateInspection(formData.rope_id)}
                    style={{ width: '100%', padding: '10px 12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }} />
                  
                  {duplicateWarning && !duplicateConfirmed && (
                    <div style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', border: '2px solid #f59e0b', borderRadius: '8px', padding: '15px', marginTop: '10px' }}>
                      <h4 style={{ color: '#92400e', marginBottom: '8px', fontSize: '14px' }}>⚠️ Recently Inspected</h4>
                      <p style={{ color: '#92400e', fontSize: '13px', marginBottom: '10px' }}>
                        This wire rope was inspected <strong>{duplicateWarning.daysAgo} days ago</strong> on {duplicateWarning.date} by {duplicateWarning.inspector}.
                      </p>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button type="button" onClick={() => setDuplicateConfirmed(true)}
                          style={{ background: '#f59e0b', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
                          Inspect Anyway
                        </button>
                        <button type="button" onClick={() => { setFormData(prev => ({ ...prev, rope_id: '' })); setDuplicateWarning(null); }}
                          style={{ background: '#6b7280', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
                          Enter Different ID
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Wire Rope Type *</label>
                  <select name="rope_type" value={formData.rope_type} onChange={handleChange} required
                    style={{ width: '100%', padding: '10px 12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }}>
                    <option value="">Select Type...</option>
                    {ROPE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Capacity / WLL *</label>
                  <select name="capacity_wll" value={formData.capacity_wll} onChange={handleChange} required
                    style={{ width: '100%', padding: '10px 12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }}>
                    <option value="">Select Capacity...</option>
                    {CAPACITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Diameter</label>
                  <select name="diameter" value={formData.diameter} onChange={handleChange}
                    style={{ width: '100%', padding: '10px 12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }}>
                    <option value="">Select Diameter...</option>
                    {DIAMETERS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Length</label>
                  <select name="length" value={formData.length} onChange={handleChange}
                    style={{ width: '100%', padding: '10px 12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }}>
                    <option value="">Select Length...</option>
                    {LENGTHS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Core Type</label>
                  <select name="core_type" value={formData.core_type} onChange={handleChange}
                    style={{ width: '100%', padding: '10px 12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }}>
                    <option value="">Select Core...</option>
                    {CORE_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Manufacturer</label>
                  <input type="text" name="manufacturer" value={formData.manufacturer} onChange={handleChange}
                    placeholder="e.g., Bridon, WireCo, Union"
                    style={{ width: '100%', padding: '10px 12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }} />
                </div>
              </div>
            </div>

            {/* Wire & Strand Condition */}
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '20px', marginBottom: '20px', borderLeft: '4px solid #dc2626' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#dc2626', marginBottom: '15px' }}>
                🔴 Wire & Strand Condition
              </h3>
              <div style={{ background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)', border: '2px solid #dc2626', borderRadius: '8px', padding: '12px 15px', marginBottom: '15px' }}>
                <p style={{ fontSize: '13px', color: '#991b1b', margin: 0 }}>
                  🚨 CRITICAL: Wire rope must be removed from service if broken wires exceed limits, or if kinking, bird caging, core protrusion, or crushing is present. See ASME B30.9 for specific criteria.
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                <InspectionItem label="No Broken Wires (Beyond Limits)" name="broken_wires" options={[
                  { value: 'Pass', label: 'Pass' },
                  { value: 'Fail', label: 'Fail - Broken Wires Found' }
                ]} />
                <InspectionItem label="No Excessive Corrosion / Rust" name="corrosion" />
                <InspectionItem label="No Kinking" name="kinking" options={[
                  { value: 'Pass', label: 'Pass' },
                  { value: 'Fail', label: 'Fail - Kinks Present' }
                ]} />
                <InspectionItem label="No Bird Caging" name="bird_caging" options={[
                  { value: 'Pass', label: 'Pass' },
                  { value: 'Fail', label: 'Fail - Bird Caging Present' }
                ]} />
                <InspectionItem label="No Core Protrusion" name="core_protrusion" options={[
                  { value: 'Pass', label: 'Pass' },
                  { value: 'Fail', label: 'Fail - Core Protrusion' }
                ]} />
                <InspectionItem label="No Crushing / Flattening" name="crushing" />
                <InspectionItem label="No Heat Damage / Discoloration" name="heat_damage" />
                <InspectionItem label="No Excessive Abrasion / Wear" name="abrasion_wear" />
                <InspectionItem label="No Diameter Reduction (>5%)" name="diameter_reduction" options={[
                  { value: 'Pass', label: 'Pass' },
                  { value: 'Fail', label: 'Fail - Exceeds Limit' }
                ]} />
                <InspectionItem label="No Strand Displacement / Popped Strands" name="strand_displacement" />
              </div>
            </div>

            {/* End Terminations */}
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '20px', marginBottom: '20px', borderLeft: '4px solid #7c3aed' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#7c3aed', marginBottom: '15px' }}>
                🔧 End Terminations & Fittings
              </h3>
              <div style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', border: '2px solid #f59e0b', borderRadius: '8px', padding: '12px 15px', marginBottom: '15px' }}>
                <p style={{ fontSize: '13px', color: '#92400e', margin: 0 }}>
                  ⚠️ Inspect all fittings, thimbles, and ferrules for cracks, deformation, and proper seating. Damaged terminations require immediate removal.
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                <InspectionItem label="End Fittings in Good Condition" name="end_fitting" showNA />
                <InspectionItem label="Thimbles Not Cracked / Distorted" name="thimble_condition" showNA />
                <InspectionItem label="Ferrules / Sleeves in Good Condition" name="ferrule_condition" showNA />
              </div>
            </div>

            {/* Identification & Maintenance */}
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '20px', marginBottom: '20px', borderLeft: '4px solid #0891b2' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0891b2', marginBottom: '15px' }}>
                🏷️ Identification & Maintenance
              </h3>
              <div style={{ background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)', border: '2px solid #3b82f6', borderRadius: '8px', padding: '12px 15px', marginBottom: '15px' }}>
                <p style={{ fontSize: '13px', color: '#1e40af', margin: 0 }}>
                  ℹ️ All wire rope slings must have legible identification tags. Proper lubrication extends rope life and aids inspection.
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                <InspectionItem label="Tag Present & Legible" name="missing_tag" options={[
                  { value: 'Pass', label: 'Pass' },
                  { value: 'Fail', label: 'Fail - Missing/Illegible' }
                ]} />
                <InspectionItem label="Properly Lubricated" name="proper_lubrication" options={[
                  { value: 'Pass', label: 'Pass' },
                  { value: 'Fail', label: 'Fail - Needs Lubrication' }
                ]} />
              </div>
            </div>

            {/* Overall & Result */}
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '20px', marginBottom: '20px', borderLeft: '4px solid #16a34a' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#16a34a', marginBottom: '15px' }}>
                ✅ Overall Condition & Inspection Result
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Overall Wire Rope Condition *</label>
                  <select name="overall_condition" value={formData.overall_condition} onChange={handleChange} required
                    style={{ width: '100%', padding: '10px 12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }}>
                    <option value="">Select...</option>
                    <option value="Good">Good - Ready for Use</option>
                    <option value="Fair">Fair - Minor Wear (Monitor)</option>
                    <option value="Poor">Poor - Significant Wear</option>
                    <option value="Critical">Critical - Remove from Service</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Inspection Result *</label>
                  <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                    <label style={{
                      display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 15px',
                      background: formData.inspection_result === 'Pass' ? '#dcfce7' : 'white',
                      border: `2px solid ${formData.inspection_result === 'Pass' ? '#16a34a' : '#e5e7eb'}`,
                      borderRadius: '8px', cursor: 'pointer'
                    }}>
                      <input type="radio" name="inspection_result" value="Pass" checked={formData.inspection_result === 'Pass'} onChange={handleChange} required />
                      <span>✅ Pass</span>
                    </label>
                    <label style={{
                      display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 15px',
                      background: formData.inspection_result === 'Fail' ? '#fee2e2' : 'white',
                      border: `2px solid ${formData.inspection_result === 'Fail' ? '#dc2626' : '#e5e7eb'}`,
                      borderRadius: '8px', cursor: 'pointer'
                    }}>
                      <input type="radio" name="inspection_result" value="Fail" checked={formData.inspection_result === 'Fail'} onChange={handleChange} />
                      <span>❌ Fail - Remove from Service</span>
                    </label>
                  </div>
                </div>
              </div>

              {formData.inspection_result === 'Fail' && (
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Action Taken *</label>
                  <select name="action_taken" value={formData.action_taken} onChange={handleChange} required
                    style={{ width: '100%', padding: '10px 12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }}>
                    <option value="">Select Action...</option>
                    <option value="Tagged Out of Service">Tagged Out of Service</option>
                    <option value="Removed & Destroyed">Removed & Destroyed</option>
                    <option value="Quarantined for Review">Quarantined for Review</option>
                    <option value="Sent for Recertification">Sent for Recertification</option>
                    <option value="Re-lubricated">Re-lubricated</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Comments</label>
                <textarea name="comments" value={formData.comments} onChange={handleChange}
                  placeholder="Any additional notes, deficiencies found, broken wire count, or recommendations..."
                  style={{ width: '100%', padding: '10px 12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px', minHeight: '80px', resize: 'vertical' }} />
              </div>
            </div>

            {/* Photo */}
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '20px', marginBottom: '20px', borderLeft: '4px solid #1e3a8a' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e3a8a', marginBottom: '15px' }}>
                📸 Photo Documentation
              </h3>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
                <label style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)',
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

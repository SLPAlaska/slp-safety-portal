'use client';

import { useState, useEffect } from 'react';
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

const KIT_TYPES = [
  'ANSI Class A', 'ANSI Class B', 'Industrial', 'Vehicle/Mobile', 'Construction',
  'Bloodborne Pathogen Kit', 'Trauma Kit', 'Burn Kit', 'Personal/Individual', 'Other'
];

export default function FirstAidKitInspection() {
  const [formData, setFormData] = useState({
    inspector_name: '',
    date: new Date().toISOString().split('T')[0],
    company: '',
    location: '',
    kit_id: '',
    kit_type: '',
    kit_location_description: '',
    // Accessibility
    easily_accessible: '',
    clearly_marked: '',
    seal_intact: '',
    expiration_checked: '',
    // Basic Supplies
    adhesive_bandages: '',
    gauze_pads: '',
    gauze_rolls: '',
    adhesive_tape: '',
    elastic_bandages: '',
    triangular_bandages: '',
    // Tools & Wound Care
    scissors: '',
    tweezers: '',
    disposable_gloves: '',
    cpr_mask: '',
    antiseptic_wipes: '',
    antibiotic_ointment: '',
    burn_cream: '',
    // Emergency Items
    eye_wash: '',
    cold_pack: '',
    first_aid_guide: '',
    emergency_blanket: '',
    splint_materials: '',
    // Trauma Items
    tourniquet: '',
    blood_stopper: '',
    sam_splint: '',
    // Results
    overall_condition: '',
    inspection_result: '',
    items_restocked: '',
    restock_list: '',
    expired_items_removed: '',
    comments: ''
  });

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [duplicateConfirmed, setDuplicateConfirmed] = useState(false);

  const checkDuplicateInspection = async (kitId) => {
    if (!kitId || duplicateConfirmed) return;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await supabase
      .from('first_aid_kit_inspections')
      .select('date, inspector_name')
      .ilike('kit_id', kitId)
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

    if (name === 'kit_id' && value.length >= 3) {
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
    const fileName = `firstaid-${Date.now()}.${fileExt}`;
    const filePath = `first-aid-kit-inspection/${fileName}`;

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
        .from('first_aid_kit_inspections')
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
      kit_id: '',
      kit_type: '',
      kit_location_description: '',
      easily_accessible: '',
      clearly_marked: '',
      seal_intact: '',
      expiration_checked: '',
      adhesive_bandages: '',
      gauze_pads: '',
      gauze_rolls: '',
      adhesive_tape: '',
      elastic_bandages: '',
      triangular_bandages: '',
      scissors: '',
      tweezers: '',
      disposable_gloves: '',
      cpr_mask: '',
      antiseptic_wipes: '',
      antibiotic_ointment: '',
      burn_cream: '',
      eye_wash: '',
      cold_pack: '',
      first_aid_guide: '',
      emergency_blanket: '',
      splint_materials: '',
      tourniquet: '',
      blood_stopper: '',
      sam_splint: '',
      overall_condition: '',
      inspection_result: '',
      items_restocked: '',
      restock_list: '',
      expired_items_removed: '',
      comments: ''
    });
    setPhotoFile(null);
    setPhotoPreview(null);
    setSubmitted(false);
    setDuplicateWarning(null);
    setDuplicateConfirmed(false);
  };

  const getAccessibilityStyle = (value) => {
    if (value === 'Pass' || value === 'Pass - All Current') return { borderColor: '#16a34a', background: '#f0fdf4' };
    if (value === 'Fail' || value === 'Fail - Expired Items Found') return { borderColor: '#dc2626', background: '#fef2f2' };
    if (value === 'N/A') return { borderColor: '#6b7280', background: '#f9fafb' };
    return {};
  };

  const getSupplyStyle = (value) => {
    if (value === 'Stocked') return { borderColor: '#16a34a', background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' };
    if (value === 'Low') return { borderColor: '#f59e0b', background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)' };
    if (value === 'Empty') return { borderColor: '#dc2626', background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)' };
    if (value === 'N/A') return { borderColor: '#6b7280', background: '#f9fafb' };
    return {};
  };

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #002868 0%, #002868 33%, #FFFFFF 33%, #FFFFFF 66%, #BF0A30 66%, #BF0A30 100%)', padding: '20px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', paddingTop: '50px' }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '40px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4), 0 0 0 4px #BF0A30, 0 0 0 8px #FFFFFF, 0 0 0 12px #002868' }}>
            <div style={{ fontSize: '60px', marginBottom: '20px' }}>✅</div>
            <h2 style={{ color: '#16a34a', marginBottom: '15px', fontSize: '24px' }}>Inspection Submitted!</h2>
            <p style={{ color: '#6b7280', marginBottom: '25px' }}>First Aid Kit Inspection recorded successfully.</p>
            <div style={{ color: '#002868', fontSize: '20px', letterSpacing: '5px', marginBottom: '20px' }}>★ ★ ★</div>
            <button
              onClick={resetForm}
              style={{
                background: 'linear-gradient(135deg, #002868 0%, #001845 50%, #BF0A30 100%)',
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

  const AccessibilityItem = ({ label, name, options = null }) => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '10px 12px',
      background: 'white',
      border: '2px solid #e5e7eb',
      borderRadius: '8px',
      gap: '10px',
      ...getAccessibilityStyle(formData[name])
    }}>
      <span style={{ fontSize: '14px', color: '#374151', flex: 1 }}>{label}</span>
      <select
        name={name}
        value={formData[name]}
        onChange={handleChange}
        style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', minWidth: '140px' }}
      >
        <option value="">Select...</option>
        {options ? options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>) : (
          <>
            <option value="Pass">Pass</option>
            <option value="Fail">Fail</option>
            <option value="N/A">N/A</option>
          </>
        )}
      </select>
    </div>
  );

  const SupplyItem = ({ label, name, showNA = false }) => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '10px 12px',
      background: 'white',
      border: '2px solid #e5e7eb',
      borderRadius: '8px',
      gap: '10px',
      ...getSupplyStyle(formData[name])
    }}>
      <span style={{ fontSize: '14px', color: '#374151', flex: 1 }}>{label}</span>
      <select
        name={name}
        value={formData[name]}
        onChange={handleChange}
        style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', minWidth: '140px' }}
      >
        <option value="">Select...</option>
        <option value="Stocked">Stocked</option>
        <option value="Low">Low - Needs Restock</option>
        <option value="Empty">Empty</option>
        {showNA && <option value="N/A">N/A</option>}
      </select>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #002868 0%, #002868 33%, #FFFFFF 33%, #FFFFFF 66%, #BF0A30 66%, #BF0A30 100%)', padding: '20px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <a href="/" style={{ color: 'white', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px', marginBottom: '15px', fontSize: '14px' }}>
          ← Back to Portal
        </a>

        <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4), 0 0 0 4px #BF0A30, 0 0 0 8px #FFFFFF, 0 0 0 12px #002868', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg, #002868 0%, #001845 50%, #BF0A30 100%)', color: 'white', padding: '30px 20px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              <div style={{ background: 'linear-gradient(135deg, #FFFFFF 0%, #f0f0f0 100%)', borderRadius: '16px', padding: '15px 25px', boxShadow: '0 4px 15px rgba(0,0,0,0.3)', border: '3px solid #BF0A30' }}>
                <img src="/Logo.png" alt="SLP Alaska" style={{ height: '90px', width: 'auto' }} />
              </div>
            </div>
            <h1 style={{ fontSize: '28px', marginBottom: '5px', textShadow: '2px 2px 4px rgba(0,0,0,0.5)', letterSpacing: '1px' }}>🏥 First Aid Kit Monthly Inspection</h1>
            <p style={{ fontSize: '16px', opacity: '0.95' }}>Monthly Equipment Safety Inspection</p>
            <div style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)', border: '2px solid rgba(255,255,255,0.3)', borderRadius: '8px', padding: '10px 15px', marginTop: '15px', fontSize: '13px' }}>
              ⚠️ OSHA 29 CFR 1910.151(b) & ANSI Z308.1 Compliant | Monthly Inspection Required
            </div>
          </div>

          {/* USA Banner */}
          <div style={{ background: 'linear-gradient(90deg, #002868 0%, #002868 40%, #BF0A30 60%, #BF0A30 100%)', color: 'white', textAlign: 'center', padding: '8px', fontWeight: '600', letterSpacing: '2px', fontSize: '12px' }}>
            ★ ★ ★ SAFETY FIRST • ALASKA PROUD ★ ★ ★
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} style={{ padding: '25px', background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)' }}>
            {/* Kit & Inspector Information */}
            <div style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', borderRadius: '12px', padding: '20px', marginBottom: '20px', borderLeft: '5px solid #002868', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#002868', marginBottom: '15px', paddingBottom: '10px', borderBottom: '2px solid #e5e7eb' }}>
                📋 Kit & Inspector Information
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
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Kit ID / Unit Number *</label>
                  <input type="text" name="kit_id" value={formData.kit_id} onChange={handleChange} required
                    placeholder="e.g., FAK-001"
                    onBlur={() => checkDuplicateInspection(formData.kit_id)}
                    style={{ width: '100%', padding: '10px 12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }} />
                  
                  {duplicateWarning && !duplicateConfirmed && (
                    <div style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', border: '2px solid #f59e0b', borderRadius: '8px', padding: '15px', marginTop: '10px' }}>
                      <h4 style={{ color: '#92400e', marginBottom: '8px', fontSize: '14px' }}>⚠️ Recently Inspected</h4>
                      <p style={{ color: '#92400e', fontSize: '13px', marginBottom: '10px' }}>
                        This kit was inspected <strong>{duplicateWarning.daysAgo} days ago</strong> on {duplicateWarning.date} by {duplicateWarning.inspector}.
                      </p>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button type="button" onClick={() => setDuplicateConfirmed(true)}
                          style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                          Inspect Anyway
                        </button>
                        <button type="button" onClick={() => { setFormData(prev => ({ ...prev, kit_id: '' })); setDuplicateWarning(null); }}
                          style={{ background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                          Enter Different ID
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Kit Type *</label>
                  <select name="kit_type" value={formData.kit_type} onChange={handleChange} required
                    style={{ width: '100%', padding: '10px 12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }}>
                    <option value="">Select Type...</option>
                    {KIT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Kit Location Description *</label>
                  <input type="text" name="kit_location_description" value={formData.kit_location_description} onChange={handleChange} required
                    placeholder="e.g., Break Room Wall, Near Entrance, Vehicle Cab"
                    style={{ width: '100%', padding: '10px 12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }} />
                </div>
              </div>
            </div>

            {/* Accessibility & General Condition */}
            <div style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', borderRadius: '12px', padding: '20px', marginBottom: '20px', borderLeft: '5px solid #002868', borderRight: '5px solid #BF0A30', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#002868', marginBottom: '15px', paddingBottom: '10px', borderBottom: '2px solid #e5e7eb' }}>
                🚶 Accessibility & General Condition
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                <AccessibilityItem label="Easily Accessible (Unobstructed)" name="easily_accessible" options={[{ value: 'Pass', label: 'Pass' }, { value: 'Fail', label: 'Fail' }]} />
                <AccessibilityItem label="Clearly Marked / Signage Visible" name="clearly_marked" options={[{ value: 'Pass', label: 'Pass' }, { value: 'Fail', label: 'Fail' }]} />
                <AccessibilityItem label="Seal/Tamper Indicator Intact" name="seal_intact" />
                <AccessibilityItem label="All Expiration Dates Checked" name="expiration_checked" options={[{ value: 'Pass', label: 'Pass - All Current' }, { value: 'Fail', label: 'Fail - Expired Items Found' }]} />
              </div>
            </div>

            {/* Basic Supplies */}
            <div style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', borderRadius: '12px', padding: '20px', marginBottom: '20px', borderLeft: '5px solid #BF0A30', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#BF0A30', marginBottom: '15px', paddingBottom: '10px', borderBottom: '2px solid #e5e7eb' }}>
                🩹 Basic Supplies (ANSI Z308.1 Required)
              </h3>
              <div style={{ background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)', border: '2px solid #002868', borderRadius: '8px', padding: '12px 15px', marginBottom: '15px' }}>
                <p style={{ fontSize: '13px', color: '#1e40af', margin: 0 }}>
                  ℹ️ ANSI Z308.1 minimum requirements include: adhesive bandages, gauze pads, tape, bandage compresses, and antiseptic.
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                <SupplyItem label="Adhesive Bandages (Assorted)" name="adhesive_bandages" />
                <SupplyItem label="Gauze Pads (Sterile)" name="gauze_pads" />
                <SupplyItem label="Gauze Rolls / Roller Bandages" name="gauze_rolls" />
                <SupplyItem label="Adhesive Tape" name="adhesive_tape" />
                <SupplyItem label="Elastic Bandages (ACE)" name="elastic_bandages" showNA />
                <SupplyItem label="Triangular Bandages" name="triangular_bandages" showNA />
              </div>
            </div>

            {/* Tools & Wound Care */}
            <div style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', borderRadius: '12px', padding: '20px', marginBottom: '20px', borderLeft: '5px solid #002868', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#002868', marginBottom: '15px', paddingBottom: '10px', borderBottom: '2px solid #e5e7eb' }}>
                🔧 Tools & Wound Care
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                <SupplyItem label="Scissors" name="scissors" />
                <SupplyItem label="Tweezers" name="tweezers" />
                <SupplyItem label="Disposable Gloves (Nitrile/Latex)" name="disposable_gloves" />
                <SupplyItem label="CPR Mask / Breathing Barrier" name="cpr_mask" showNA />
                <SupplyItem label="Antiseptic Wipes / Towelettes" name="antiseptic_wipes" />
                <SupplyItem label="Antibiotic Ointment" name="antibiotic_ointment" showNA />
                <SupplyItem label="Burn Cream / Burn Gel" name="burn_cream" showNA />
              </div>
            </div>

            {/* Emergency Items */}
            <div style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', borderRadius: '12px', padding: '20px', marginBottom: '20px', borderLeft: '5px solid #BF0A30', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#BF0A30', marginBottom: '15px', paddingBottom: '10px', borderBottom: '2px solid #e5e7eb' }}>
                🚑 Emergency & Specialty Items
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                <SupplyItem label="Eye Wash Solution" name="eye_wash" showNA />
                <SupplyItem label="Cold Pack (Instant)" name="cold_pack" showNA />
                <SupplyItem label="First Aid Guide / Instructions" name="first_aid_guide" />
                <SupplyItem label="Emergency Blanket (Mylar)" name="emergency_blanket" showNA />
                <SupplyItem label="Splint Materials" name="splint_materials" showNA />
              </div>
            </div>

            {/* Trauma Items */}
            <div style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', borderRadius: '12px', padding: '20px', marginBottom: '20px', borderLeft: '5px solid #002868', borderRight: '5px solid #BF0A30', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#002868', marginBottom: '15px', paddingBottom: '10px', borderBottom: '2px solid #e5e7eb' }}>
                🩸 Trauma / Advanced Items
              </h3>
              <div style={{ background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)', border: '2px solid #BF0A30', borderRadius: '8px', padding: '12px 15px', marginBottom: '15px' }}>
                <p style={{ fontSize: '13px', color: '#991b1b', margin: 0 }}>
                  🚨 CRITICAL: Trauma items are essential for severe bleeding emergencies. "Stop the Bleed" certified personnel should be available.
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                <SupplyItem label="Tourniquet (CAT/SOFT-T)" name="tourniquet" showNA />
                <SupplyItem label="Blood Stopper / Hemostatic Agent" name="blood_stopper" showNA />
                <SupplyItem label="SAM Splint" name="sam_splint" showNA />
              </div>
            </div>

            {/* Overall & Result */}
            <div style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', borderRadius: '12px', padding: '20px', marginBottom: '20px', borderLeft: '5px solid #16a34a', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#16a34a', marginBottom: '15px', paddingBottom: '10px', borderBottom: '2px solid #e5e7eb' }}>
                ✅ Overall Condition & Inspection Result
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Overall Kit Condition *</label>
                  <select name="overall_condition" value={formData.overall_condition} onChange={handleChange} required
                    style={{ width: '100%', padding: '10px 12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }}>
                    <option value="">Select...</option>
                    <option value="Good">Good - Fully Stocked</option>
                    <option value="Fair">Fair - Minor Items Needed</option>
                    <option value="Poor">Poor - Multiple Items Missing</option>
                    <option value="Critical">Critical - Not Ready for Use</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Inspection Result *</label>
                  <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                    <label style={{
                      display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 15px',
                      background: formData.inspection_result === 'Pass - Fully Stocked' ? 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)' : 'white',
                      border: `2px solid ${formData.inspection_result === 'Pass - Fully Stocked' ? '#16a34a' : '#e5e7eb'}`,
                      borderRadius: '8px', cursor: 'pointer'
                    }}>
                      <input type="radio" name="inspection_result" value="Pass - Fully Stocked" checked={formData.inspection_result === 'Pass - Fully Stocked'} onChange={handleChange} required />
                      <span>✅ Pass - Fully Stocked</span>
                    </label>
                    <label style={{
                      display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 15px',
                      background: formData.inspection_result === 'Fail - Needs Attention' ? 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)' : 'white',
                      border: `2px solid ${formData.inspection_result === 'Fail - Needs Attention' ? '#dc2626' : '#e5e7eb'}`,
                      borderRadius: '8px', cursor: 'pointer'
                    }}>
                      <input type="radio" name="inspection_result" value="Fail - Needs Attention" checked={formData.inspection_result === 'Fail - Needs Attention'} onChange={handleChange} />
                      <span>❌ Fail - Needs Attention</span>
                    </label>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Items Restocked This Inspection? *</label>
                  <select name="items_restocked" value={formData.items_restocked} onChange={handleChange} required
                    style={{ width: '100%', padding: '10px 12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }}>
                    <option value="">Select...</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Expired Items Removed?</label>
                  <select name="expired_items_removed" value={formData.expired_items_removed} onChange={handleChange}
                    style={{ width: '100%', padding: '10px 12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }}>
                    <option value="">Select...</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                    <option value="N/A">N/A - None Expired</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Restock List (if applicable)</label>
                <textarea name="restock_list" value={formData.restock_list} onChange={handleChange}
                  placeholder="List items that need to be restocked..."
                  style={{ width: '100%', padding: '10px 12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px', minHeight: '80px', resize: 'vertical' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Comments</label>
                <textarea name="comments" value={formData.comments} onChange={handleChange}
                  placeholder="Any additional notes, observations, or recommendations..."
                  style={{ width: '100%', padding: '10px 12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px', minHeight: '80px', resize: 'vertical' }} />
              </div>
            </div>

            {/* Photo */}
            <div style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', borderRadius: '12px', padding: '20px', marginBottom: '20px', borderLeft: '5px solid #002868', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#002868', marginBottom: '15px', paddingBottom: '10px', borderBottom: '2px solid #e5e7eb' }}>
                📸 Photo Documentation
              </h3>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
                <label style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  background: 'linear-gradient(135deg, #002868 0%, #001845 100%)',
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

            {/* Stars Decoration */}
            <div style={{ color: '#002868', fontSize: '20px', letterSpacing: '5px', textAlign: 'center', margin: '15px 0' }}>★ ★ ★ ★ ★</div>

            {/* Submit Buttons */}
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button type="submit" disabled={submitting}
                style={{
                  background: submitting ? '#9ca3af' : 'linear-gradient(135deg, #002868 0%, #001845 50%, #BF0A30 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '12px 30px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
                }}>
                {submitting ? 'Submitting...' : '🇺🇸 Submit Inspection'}
              </button>
              <button type="button" onClick={resetForm}
                style={{
                  background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
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
            <span style={{ color: '#1e3a5f', fontWeight: '500' }}>Powered by Predictive Safety Analytics™</span>
            <span style={{ color: '#94a3b8', margin: '0 8px' }}>|</span>
            <span style={{ color: '#475569' }}>© 2025 SLP Alaska</span>
          </div>
        </div>
      </div>
    </div>
  );
}

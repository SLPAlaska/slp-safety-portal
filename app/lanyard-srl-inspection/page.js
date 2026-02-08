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

const EQUIPMENT_TYPES = [
  'Shock-Absorbing Lanyard (Single)', 'Shock-Absorbing Lanyard (Twin/Y)', 'Restraint Lanyard',
  'Positioning Lanyard', 'SRL - Cable', 'SRL - Webbing', 'SRL-P (Personal)', 'SRL-LE (Leading Edge)', 'Other'
];

const LENGTHS = ['3 ft', '4 ft', '6 ft', '8 ft', '10 ft', '11 ft', '15 ft', '20 ft', '30 ft', '50 ft', 'Other'];

const CAPACITIES = ['130-310 lbs', '130-420 lbs', '400 lbs', 'Other'];

const CONNECTOR_TYPES = [
  'Snap Hook (Steel)', 'Snap Hook (Aluminum)', 'Rebar Hook',
  'Carabiner (Auto-Locking)', 'Carabiner (Screw Gate)', 'Swivel Connector', 'Other'
];

export default function LanyardSRLInspection() {
  const [formData, setFormData] = useState({
    inspector_name: '',
    date: new Date().toISOString().split('T')[0],
    company: '',
    location: '',
    equipment_id: '',
    assigned_user: '',
    equipment_type: '',
    manufacturer: '',
    model: '',
    manufacture_date: '',
    length: '',
    capacity: '',
    connector_type: '',
    // Labels
    labels_legible: '',
    // Webbing/Cable
    webbing_cuts: '',
    webbing_frays: '',
    webbing_burns: '',
    webbing_chemical: '',
    webbing_corrosion: '',
    webbing_kinks: '',
    stitching_intact: '',
    // Shock Absorber
    shock_absorber_condition: '',
    shock_pack_deployed: '',
    // Connectors
    snap_hooks_function: '',
    snap_hook_gates: '',
    snap_hook_corrosion: '',
    carabiner_function: '',
    carabiner_locking: '',
    thimbles_terminations: '',
    // SRL
    srl_housing: '',
    srl_retraction: '',
    srl_braking: '',
    srl_swivel: '',
    srl_cable_condition: '',
    srl_indicator: '',
    // Fall History
    fall_indicator: '',
    previous_fall: '',
    // Results
    overall_condition: '',
    inspection_result: '',
    action_taken: '',
    next_inspection_due: '',
    comments: ''
  });

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [duplicateConfirmed, setDuplicateConfirmed] = useState(false);

  useEffect(() => {
    const nextDue = new Date();
    nextDue.setDate(nextDue.getDate() + 30);
    setFormData(prev => ({
      ...prev,
      next_inspection_due: nextDue.toISOString().split('T')[0]
    }));
  }, []);

  const checkDuplicateInspection = async (equipmentId) => {
    if (!equipmentId || duplicateConfirmed) return;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await supabase
      .from('lanyard_srl_inspections')
      .select('date, inspector_name')
      .ilike('equipment_id', equipmentId)
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

    if (name === 'equipment_id' && value.length >= 3) {
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
    const fileName = `lanyard-srl-${Date.now()}.${fileExt}`;
    const filePath = `lanyard-srl-inspection/${fileName}`;

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
        .from('lanyard_srl_inspections')
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
    const nextDue = new Date();
    nextDue.setDate(nextDue.getDate() + 30);
    
    setFormData({
      inspector_name: '',
      date: new Date().toISOString().split('T')[0],
      company: '',
      location: '',
      equipment_id: '',
      assigned_user: '',
      equipment_type: '',
      manufacturer: '',
      model: '',
      manufacture_date: '',
      length: '',
      capacity: '',
      connector_type: '',
      labels_legible: '',
      webbing_cuts: '',
      webbing_frays: '',
      webbing_burns: '',
      webbing_chemical: '',
      webbing_corrosion: '',
      webbing_kinks: '',
      stitching_intact: '',
      shock_absorber_condition: '',
      shock_pack_deployed: '',
      snap_hooks_function: '',
      snap_hook_gates: '',
      snap_hook_corrosion: '',
      carabiner_function: '',
      carabiner_locking: '',
      thimbles_terminations: '',
      srl_housing: '',
      srl_retraction: '',
      srl_braking: '',
      srl_swivel: '',
      srl_cable_condition: '',
      srl_indicator: '',
      fall_indicator: '',
      previous_fall: '',
      overall_condition: '',
      inspection_result: '',
      action_taken: '',
      next_inspection_due: nextDue.toISOString().split('T')[0],
      comments: ''
    });
    setPhotoFile(null);
    setPhotoPreview(null);
    setSubmitted(false);
    setDuplicateWarning(null);
    setDuplicateConfirmed(false);
  };

  const getItemStyle = (value) => {
    if (value && (value.includes('Pass') || value === 'Pass')) return { borderColor: '#16a34a', background: '#f0fdf4' };
    if (value && (value.includes('Fail') || value === 'Fail')) return { borderColor: '#dc2626', background: '#fef2f2' };
    if (value && value.includes('N/A')) return { borderColor: '#6b7280', background: '#f9fafb' };
    return {};
  };

  // Determine which conditional sections to show
  const showShockAbsorber = formData.equipment_type.includes('Shock-Absorbing') || formData.equipment_type.includes('SRL');
  const showSRL = formData.equipment_type.includes('SRL');

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #b91c1c 100%)', padding: '20px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', paddingTop: '50px' }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '40px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)' }}>
            <div style={{ fontSize: '60px', marginBottom: '20px' }}>✅</div>
            <h2 style={{ color: '#16a34a', marginBottom: '15px', fontSize: '24px' }}>Inspection Submitted!</h2>
            <p style={{ color: '#6b7280', marginBottom: '25px' }}>Lanyard/SRL Inspection recorded successfully.</p>
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
            <h1 style={{ fontSize: '28px', marginBottom: '5px', textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>🔗 Lanyard and SRL Inspection</h1>
            <p style={{ fontSize: '16px', opacity: '0.9' }}>Monthly Fall Protection Equipment Inspection</p>
            <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 15px', marginTop: '15px', fontSize: '13px' }}>
              ⚠️ OSHA 29 CFR 1926.502 & ANSI Z359.1/Z359.14 Compliant | Monthly Inspection Required
            </div>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} style={{ padding: '25px' }}>
            {/* Equipment & Inspector Information */}
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '20px', marginBottom: '20px', borderLeft: '4px solid #1e3a8a' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e3a8a', marginBottom: '15px' }}>
                📋 Equipment & Inspector Information
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
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Equipment ID / Serial Number *</label>
                  <input type="text" name="equipment_id" value={formData.equipment_id} onChange={handleChange} required
                    placeholder="e.g., LAN-001 or S/N 12345"
                    onBlur={() => checkDuplicateInspection(formData.equipment_id)}
                    style={{ width: '100%', padding: '10px 12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }} />
                  
                  {duplicateWarning && !duplicateConfirmed && (
                    <div style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', border: '2px solid #f59e0b', borderRadius: '8px', padding: '15px', marginTop: '10px' }}>
                      <h4 style={{ color: '#92400e', marginBottom: '8px', fontSize: '14px' }}>⚠️ Recently Inspected</h4>
                      <p style={{ color: '#92400e', fontSize: '13px', marginBottom: '10px' }}>
                        This equipment was inspected <strong>{duplicateWarning.daysAgo} days ago</strong> on {duplicateWarning.date} by {duplicateWarning.inspector}.
                      </p>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button type="button" onClick={() => setDuplicateConfirmed(true)}
                          style={{ background: '#f59e0b', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
                          Inspect Anyway
                        </button>
                        <button type="button" onClick={() => { setFormData(prev => ({ ...prev, equipment_id: '' })); setDuplicateWarning(null); }}
                          style={{ background: '#6b7280', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
                          Enter Different ID
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Assigned User</label>
                  <input type="text" name="assigned_user" value={formData.assigned_user} onChange={handleChange}
                    placeholder="Name of person assigned this equipment"
                    style={{ width: '100%', padding: '10px 12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Equipment Type *</label>
                  <select name="equipment_type" value={formData.equipment_type} onChange={handleChange} required
                    style={{ width: '100%', padding: '10px 12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }}>
                    <option value="">Select Type...</option>
                    {EQUIPMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Manufacturer *</label>
                  <input type="text" name="manufacturer" value={formData.manufacturer} onChange={handleChange} required
                    placeholder="e.g., 3M, Miller, MSA, DBI-SALA"
                    style={{ width: '100%', padding: '10px 12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Model</label>
                  <input type="text" name="model" value={formData.model} onChange={handleChange}
                    placeholder="e.g., Turbolite, Scorpion"
                    style={{ width: '100%', padding: '10px 12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Manufacture Date</label>
                  <input type="date" name="manufacture_date" value={formData.manufacture_date} onChange={handleChange}
                    style={{ width: '100%', padding: '10px 12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }} />
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
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Capacity / Working Load Limit</label>
                  <select name="capacity" value={formData.capacity} onChange={handleChange}
                    style={{ width: '100%', padding: '10px 12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }}>
                    <option value="">Select Capacity...</option>
                    {CAPACITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Connector Type</label>
                  <select name="connector_type" value={formData.connector_type} onChange={handleChange}
                    style={{ width: '100%', padding: '10px 12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }}>
                    <option value="">Select Connector...</option>
                    {CONNECTOR_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Labels */}
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '20px', marginBottom: '20px', borderLeft: '4px solid #7c3aed' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#7c3aed', marginBottom: '15px' }}>
                🏷️ Labels & Identification
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                <InspectionItem label="Labels Legible & Intact" name="labels_legible" />
              </div>
            </div>

            {/* Webbing / Cable Condition */}
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '20px', marginBottom: '20px', borderLeft: '4px solid #ea580c' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#ea580c', marginBottom: '15px' }}>
                🧵 Webbing / Cable Condition
              </h3>
              <div style={{ background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)', border: '2px solid #dc2626', borderRadius: '8px', padding: '12px 15px', marginBottom: '15px' }}>
                <p style={{ fontSize: '13px', color: '#991b1b', margin: 0 }}>
                  🚨 CRITICAL: Any cuts, frays, burns, or chemical damage to webbing/cable requires immediate removal from service.
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                <InspectionItem label="No Cuts / Tears" name="webbing_cuts" />
                <InspectionItem label="No Frays / Broken Fibers" name="webbing_frays" />
                <InspectionItem label="No Burns / Heat Damage" name="webbing_burns" />
                <InspectionItem label="No Chemical Damage / Discoloration" name="webbing_chemical" />
                <InspectionItem label="No Corrosion (Cable)" name="webbing_corrosion" showNA />
                <InspectionItem label="No Kinks / Bird Caging (Cable)" name="webbing_kinks" showNA />
                <InspectionItem label="Stitching Intact (All Areas)" name="stitching_intact" />
              </div>
            </div>

            {/* Shock Absorber (Conditional) */}
            {showShockAbsorber && (
              <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '20px', marginBottom: '20px', borderLeft: '4px solid #dc2626' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#dc2626', marginBottom: '15px' }}>
                  💥 Shock Absorber / Energy Absorber
                </h3>
                <div style={{ background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)', border: '2px solid #dc2626', borderRadius: '8px', padding: '12px 15px', marginBottom: '15px' }}>
                  <p style={{ fontSize: '13px', color: '#991b1b', margin: 0 }}>
                    🚨 CRITICAL: If shock pack shows ANY signs of deployment or activation, remove from service immediately.
                  </p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                  <InspectionItem label="Shock Absorber Pack Condition" name="shock_absorber_condition" showNA />
                  <InspectionItem label="Shock Pack NOT Deployed" name="shock_pack_deployed" options={[
                    { value: 'Pass', label: 'Pass - Not Deployed' },
                    { value: 'Fail', label: 'Fail - Deployed/Activated' },
                    { value: 'N/A', label: 'N/A' }
                  ]} />
                </div>
              </div>
            )}

            {/* Connectors */}
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '20px', marginBottom: '20px', borderLeft: '4px solid #0891b2' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0891b2', marginBottom: '15px' }}>
                🔗 Connectors (Snap Hooks / Carabiners)
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                <InspectionItem label="Snap Hooks Function Properly" name="snap_hooks_function" showNA />
                <InspectionItem label="Snap Hook Gates Close & Lock" name="snap_hook_gates" showNA />
                <InspectionItem label="No Corrosion / Pitting" name="snap_hook_corrosion" />
                <InspectionItem label="Carabiner Functions Properly" name="carabiner_function" showNA />
                <InspectionItem label="Carabiner Locking Mechanism Works" name="carabiner_locking" showNA />
                <InspectionItem label="Thimbles/Terminations Secure" name="thimbles_terminations" showNA />
              </div>
            </div>

            {/* SRL Specific (Conditional) */}
            {showSRL && (
              <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '20px', marginBottom: '20px', borderLeft: '4px solid #7c3aed' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#7c3aed', marginBottom: '15px' }}>
                  ⚙️ Self-Retracting Lifeline (SRL) Components
                </h3>
                <div style={{ background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)', border: '2px solid #3b82f6', borderRadius: '8px', padding: '12px 15px', marginBottom: '15px' }}>
                  <p style={{ fontSize: '13px', color: '#1e40af', margin: 0 }}>
                    ℹ️ SRLs require functional testing: Verify retraction, braking, and indicator status per manufacturer requirements.
                  </p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                  <InspectionItem label="SRL Housing Condition (No Cracks)" name="srl_housing" showNA />
                  <InspectionItem label="Retraction Test - Smooth Operation" name="srl_retraction" showNA />
                  <InspectionItem label="Braking Test - Locks on Quick Pull" name="srl_braking" showNA />
                  <InspectionItem label="Swivel Connector Functions" name="srl_swivel" showNA />
                  <InspectionItem label="SRL Cable/Webbing Condition" name="srl_cable_condition" showNA />
                  <InspectionItem label="Load/Fall Indicator Clear" name="srl_indicator" options={[
                    { value: 'Pass', label: 'Pass - Indicator Clear' },
                    { value: 'Fail', label: 'Fail - Indicator Triggered' },
                    { value: 'N/A', label: 'N/A' }
                  ]} />
                </div>
              </div>
            )}

            {/* Fall History */}
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '20px', marginBottom: '20px', borderLeft: '4px solid #dc2626' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#dc2626', marginBottom: '15px' }}>
                ⚠️ Fall Indicators & History
              </h3>
              <div style={{ background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)', border: '2px solid #dc2626', borderRadius: '8px', padding: '12px 15px', marginBottom: '15px' }}>
                <p style={{ fontSize: '13px', color: '#991b1b', margin: 0 }}>
                  🚨 CRITICAL: Any equipment that has been subjected to fall arrest forces MUST be immediately removed from service - even if no visible damage is present.
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                <InspectionItem label="Fall Indicator Status (If Equipped)" name="fall_indicator" options={[
                  { value: 'Pass', label: 'Pass - Not Triggered' },
                  { value: 'Fail', label: 'Fail - Indicator Triggered' },
                  { value: 'N/A', label: 'N/A - No Indicator' }
                ]} />
                <InspectionItem label="No Previous Fall Exposure" name="previous_fall" options={[
                  { value: 'Pass', label: 'Pass - No Fall History' },
                  { value: 'Fail', label: 'Fail - Fall Exposure Reported' }
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
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Overall Equipment Condition *</label>
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
                    <option value="Sent for Repair">Sent for Repair</option>
                    <option value="Quarantined for Review">Quarantined for Review</option>
                    <option value="Destroyed/Cut Up">Destroyed/Cut Up</option>
                    <option value="Returned to Manufacturer">Returned to Manufacturer</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Next Inspection Due</label>
                  <input type="date" name="next_inspection_due" value={formData.next_inspection_due} onChange={handleChange}
                    style={{ width: '100%', padding: '10px 12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }} />
                </div>
              </div>

              <div style={{ marginTop: '15px' }}>
                <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Comments</label>
                <textarea name="comments" value={formData.comments} onChange={handleChange}
                  placeholder="Any additional notes, deficiencies found, or recommendations..."
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

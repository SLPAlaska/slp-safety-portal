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

const HOIST_TYPES = [
  'Manual Chain Hoist', 'Electric Chain Hoist', 'Air/Pneumatic Chain Hoist',
  'Lever Hoist/Come-Along', 'Other'
];

const CAPACITIES = ['1/4 Ton', '1/2 Ton', '1 Ton', '2 Ton', '3 Ton', '5 Ton', '10 Ton', 'Other'];

export default function ChainHoistInspection() {
  const [formData, setFormData] = useState({
    inspector_name: '',
    date: new Date().toISOString().split('T')[0],
    company: '',
    location: '',
    hoist_id: '',
    hoist_type: '',
    capacity: '',
    manufacturer: '',
    model: '',
    chain_size: '',
    number_of_falls: '',
    // Chain condition
    chain_wear: '',
    chain_corrosion: '',
    chain_kinks: '',
    chain_lubrication: '',
    chain_guide: '',
    // Hook condition
    hook_throat: '',
    hook_twist: '',
    hook_cracks: '',
    hook_latch: '',
    hook_swivel: '',
    // Operating mechanism
    load_brake: '',
    lifting_mechanism: '',
    chain_container: '',
    pendant_controls: '',
    // Housing & labels
    housing_frame: '',
    suspension_hook: '',
    warning_labels: '',
    capacity_marking: '',
    // Testing
    load_test_current: '',
    operational_test: '',
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
    // Set next inspection due to 30 days from now
    const nextDue = new Date();
    nextDue.setDate(nextDue.getDate() + 30);
    setFormData(prev => ({
      ...prev,
      next_inspection_due: nextDue.toISOString().split('T')[0]
    }));
  }, []);

  const checkDuplicateInspection = async (hoistId) => {
    if (!hoistId || duplicateConfirmed) return;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await supabase
      .from('chain_hoist_inspections')
      .select('date, inspector_name')
      .ilike('hoist_id', hoistId)
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

    if (name === 'hoist_id' && value.length >= 3) {
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
    const fileName = `chain-hoist-${Date.now()}.${fileExt}`;
    const filePath = `chain-hoist-inspection/${fileName}`;

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
        .from('chain_hoist_inspections')
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
      hoist_id: '',
      hoist_type: '',
      capacity: '',
      manufacturer: '',
      model: '',
      chain_size: '',
      number_of_falls: '',
      chain_wear: '',
      chain_corrosion: '',
      chain_kinks: '',
      chain_lubrication: '',
      chain_guide: '',
      hook_throat: '',
      hook_twist: '',
      hook_cracks: '',
      hook_latch: '',
      hook_swivel: '',
      load_brake: '',
      lifting_mechanism: '',
      chain_container: '',
      pendant_controls: '',
      housing_frame: '',
      suspension_hook: '',
      warning_labels: '',
      capacity_marking: '',
      load_test_current: '',
      operational_test: '',
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
            <p style={{ color: '#6b7280', marginBottom: '25px' }}>Chain Hoist Inspection recorded successfully.</p>
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
        style={{
          padding: '6px 10px',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          fontSize: '14px',
          minWidth: '100px'
        }}
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
        {/* Back Button */}
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
            <div style={{ fontSize: '14px', background: 'rgba(255,255,255,0.2)', padding: '6px 16px', borderRadius: '20px', display: 'inline-block', marginBottom: '10px' }}>⛓️ CHAIN HOIST INSPECTION</div>
            <h1 style={{ fontSize: '28px', marginBottom: '5px', textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>Chain Hoist Inspection</h1>
            <p style={{ fontSize: '16px', opacity: '0.9' }}>Monthly Equipment Inspection</p>
            <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 15px', marginTop: '15px', fontSize: '13px' }}>
              ⚠️ OSHA 29 CFR 1910.179 & ASME B30.16 Compliant | Monthly Inspection Required
            </div>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} style={{ padding: '25px' }}>
            {/* Hoist & Inspector Information */}
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '20px', marginBottom: '20px', borderLeft: '4px solid #1e3a8a' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e3a8a', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                📋 Hoist & Inspector Information
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
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Hoist ID / Serial Number *</label>
                  <input type="text" name="hoist_id" value={formData.hoist_id} onChange={handleChange} required
                    placeholder="e.g., CH-001 or S/N 12345"
                    onBlur={() => checkDuplicateInspection(formData.hoist_id)}
                    style={{ width: '100%', padding: '10px 12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }} />
                  
                  {/* Duplicate Warning */}
                  {duplicateWarning && !duplicateConfirmed && (
                    <div style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', border: '2px solid #f59e0b', borderRadius: '8px', padding: '15px', marginTop: '10px' }}>
                      <h4 style={{ color: '#92400e', marginBottom: '8px', fontSize: '14px' }}>⚠️ Recently Inspected</h4>
                      <p style={{ color: '#92400e', fontSize: '13px', marginBottom: '10px' }}>
                        This hoist was inspected <strong>{duplicateWarning.daysAgo} days ago</strong> on {duplicateWarning.date} by {duplicateWarning.inspector}.
                      </p>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button type="button" onClick={() => setDuplicateConfirmed(true)}
                          style={{ background: '#f59e0b', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
                          Inspect Anyway
                        </button>
                        <button type="button" onClick={() => { setFormData(prev => ({ ...prev, hoist_id: '' })); setDuplicateWarning(null); }}
                          style={{ background: '#6b7280', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
                          Enter Different ID
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Hoist Type *</label>
                  <select name="hoist_type" value={formData.hoist_type} onChange={handleChange} required
                    style={{ width: '100%', padding: '10px 12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }}>
                    <option value="">Select Type...</option>
                    {HOIST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Capacity *</label>
                  <select name="capacity" value={formData.capacity} onChange={handleChange} required
                    style={{ width: '100%', padding: '10px 12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }}>
                    <option value="">Select Capacity...</option>
                    {CAPACITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Manufacturer</label>
                  <input type="text" name="manufacturer" value={formData.manufacturer} onChange={handleChange}
                    placeholder="e.g., CM, Harrington, Yale"
                    style={{ width: '100%', padding: '10px 12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Model</label>
                  <input type="text" name="model" value={formData.model} onChange={handleChange}
                    placeholder="e.g., Series 622"
                    style={{ width: '100%', padding: '10px 12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Chain Size</label>
                  <input type="text" name="chain_size" value={formData.chain_size} onChange={handleChange}
                    placeholder="e.g., 1/4 inch"
                    style={{ width: '100%', padding: '10px 12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Number of Falls</label>
                  <select name="number_of_falls" value={formData.number_of_falls} onChange={handleChange}
                    style={{ width: '100%', padding: '10px 12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }}>
                    <option value="">Select...</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Chain Condition */}
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '20px', marginBottom: '20px', borderLeft: '4px solid #ea580c' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#ea580c', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                ⛓️ Chain Condition
              </h3>
              <div style={{ background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)', border: '2px solid #dc2626', borderRadius: '8px', padding: '12px 15px', marginBottom: '15px' }}>
                <p style={{ fontSize: '13px', color: '#991b1b', margin: 0 }}>
                  🚨 CRITICAL: Any chain showing wear, stretch, corrosion, or damage must be removed from service immediately.
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                <InspectionItem label="Chain Wear/Stretch" name="chain_wear" />
                <InspectionItem label="Chain Corrosion/Rust" name="chain_corrosion" />
                <InspectionItem label="Chain Kinks/Twists" name="chain_kinks" />
                <InspectionItem label="Chain Lubrication" name="chain_lubrication" />
                <InspectionItem label="Chain Guide/Sprocket" name="chain_guide" showNA />
              </div>
            </div>

            {/* Hook Condition */}
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '20px', marginBottom: '20px', borderLeft: '4px solid #dc2626' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#dc2626', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                🪝 Hook Condition
              </h3>
              <div style={{ background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)', border: '2px solid #dc2626', borderRadius: '8px', padding: '12px 15px', marginBottom: '15px' }}>
                <p style={{ fontSize: '13px', color: '#991b1b', margin: 0 }}>
                  🚨 CRITICAL: Hooks showing throat opening &gt;15% increase, twist &gt;10°, cracks, or non-functioning latch = REMOVE FROM SERVICE
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                <InspectionItem label="Hook Throat Opening" name="hook_throat" />
                <InspectionItem label="Hook Twist/Bend" name="hook_twist" />
                <InspectionItem label="Hook Cracks/Gouges" name="hook_cracks" />
                <InspectionItem label="Hook Latch Function" name="hook_latch" />
                <InspectionItem label="Hook Swivel Operation" name="hook_swivel" showNA />
              </div>
            </div>

            {/* Operating Mechanism */}
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '20px', marginBottom: '20px', borderLeft: '4px solid #7c3aed' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#7c3aed', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                ⚙️ Operating Mechanism
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                <InspectionItem label="Load Brake Function" name="load_brake" />
                <InspectionItem label="Lifting Mechanism Smooth" name="lifting_mechanism" />
                <InspectionItem label="Chain Container Condition" name="chain_container" showNA />
                <InspectionItem label="Pendant/Controls Function" name="pendant_controls" showNA />
              </div>
            </div>

            {/* Housing & Labels */}
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '20px', marginBottom: '20px', borderLeft: '4px solid #059669' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#059669', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                🏠 Housing, Frame & Labels
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                <InspectionItem label="Housing/Frame Condition" name="housing_frame" />
                <InspectionItem label="Suspension Hook/Attachment" name="suspension_hook" />
                <InspectionItem label="Warning Labels Legible" name="warning_labels" />
                <InspectionItem label="Capacity Marking Visible" name="capacity_marking" />
              </div>
            </div>

            {/* Testing */}
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '20px', marginBottom: '20px', borderLeft: '4px solid #0891b2' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0891b2', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                🧪 Testing & Certification
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                <InspectionItem label="Load Test Current" name="load_test_current" showNA />
                <InspectionItem label="Operational Test Performed" name="operational_test" />
              </div>
            </div>

            {/* Overall & Result */}
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '20px', marginBottom: '20px', borderLeft: '4px solid #16a34a' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#16a34a', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                ✅ Overall Condition & Inspection Result
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Overall Hoist Condition *</label>
                  <select name="overall_condition" value={formData.overall_condition} onChange={handleChange} required
                    style={{ width: '100%', padding: '10px 12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }}>
                    <option value="">Select...</option>
                    <option value="Good">Good - No Issues</option>
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
                    <option value="Replaced">Replaced</option>
                    <option value="Destroyed/Disposed">Destroyed/Disposed</option>
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
                  placeholder="Any additional notes, observations, or recommendations..."
                  style={{ width: '100%', padding: '10px 12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px', minHeight: '80px', resize: 'vertical' }} />
              </div>
            </div>

            {/* Photo */}
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '20px', marginBottom: '20px', borderLeft: '4px solid #1e3a8a' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e3a8a', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                📸 Photo Documentation
              </h3>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
                {/* Camera Capture Button - Mobile */}
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
                
                {/* File Upload Button */}
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

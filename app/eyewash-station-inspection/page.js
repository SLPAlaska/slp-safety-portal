'use client';

import { useState, useEffect, useRef } from 'react';
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

const STATION_TYPES = [
  'Eyewash Only', 'Eye/Face Wash', 'Combination Eyewash/Shower', 'Drench Shower Only',
  'Portable Eyewash', 'Personal Eyewash (Bottle)', 'Other'
];

const WATER_SOURCES = [
  'Plumbed - Potable Water', 'Self-Contained Tank', 'Gravity-Fed Tank',
  'Pressurized Tank', 'Bottled Solution', 'Other'
];

export default function EyewashStationInspection() {
  const [formData, setFormData] = useState({
    inspector_name: '',
    date: new Date().toISOString().split('T')[0],
    company: '',
    location: '',
    specific_location: '',
    station_id: '',
    station_type: '',
    water_source: '',
    combination_unit: '',
    manufacturer: '',
    install_date: '',
    last_annual_cert: '',
    // Accessibility
    accessible: '',
    within_distance: '',
    signage_visible: '',
    // Water Flow
    activation_tested: '',
    water_flow_adequate: '',
    both_nozzles_flow: '',
    water_temp_tepid: '',
    flushed_minimum: '',
    // Components
    nozzle_covers: '',
    dust_covers: '',
    basin_clean: '',
    no_contamination: '',
    drain_functional: '',
    valves_operate: '',
    stay_open_valve: '',
    piping_condition: '',
    // Documentation
    inspection_tag_present: '',
    inspection_tag_current: '',
    annual_cert_current: '',
    // Portable
    portable_tank_full: '',
    solution_not_expired: '',
    // Results
    overall_condition: '',
    inspection_result: '',
    action_taken: '',
    next_inspection_due: '',
    comments: ''
  });

  const photoRef = useRef();
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

  const checkDuplicateInspection = async (stationId) => {
    if (!stationId || duplicateConfirmed) return;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await supabase
      .from('eyewash_station_inspections')
      .select('date, inspector_name')
      .ilike('station_id', stationId)
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

    if (name === 'station_id' && value.length >= 3) {
      checkDuplicateInspection(value);
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
        .from('eyewash_station_inspections')
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
    const nextDue = new Date();
    nextDue.setDate(nextDue.getDate() + 30);
    
    setFormData({
      inspector_name: '',
      date: new Date().toISOString().split('T')[0],
      company: '',
      location: '',
      specific_location: '',
      station_id: '',
      station_type: '',
      water_source: '',
      combination_unit: '',
      manufacturer: '',
      install_date: '',
      last_annual_cert: '',
      accessible: '',
      within_distance: '',
      signage_visible: '',
      activation_tested: '',
      water_flow_adequate: '',
      both_nozzles_flow: '',
      water_temp_tepid: '',
      flushed_minimum: '',
      nozzle_covers: '',
      dust_covers: '',
      basin_clean: '',
      no_contamination: '',
      drain_functional: '',
      valves_operate: '',
      stay_open_valve: '',
      piping_condition: '',
      inspection_tag_present: '',
      inspection_tag_current: '',
      annual_cert_current: '',
      portable_tank_full: '',
      solution_not_expired: '',
      overall_condition: '',
      inspection_result: '',
      action_taken: '',
      next_inspection_due: nextDue.toISOString().split('T')[0],
      comments: ''
    });
    if (photoRef.current) photoRef.current.reset();
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
            <p style={{ color: '#6b7280', marginBottom: '25px' }}>Eyewash Station Inspection recorded successfully.</p>
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
            <h1 style={{ fontSize: '28px', marginBottom: '5px', textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>🚿 Emergency Eyewash Station Inspection</h1>
            <p style={{ fontSize: '16px', opacity: '0.9' }}>Monthly Equipment Safety Inspection</p>
            <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 15px', marginTop: '15px', fontSize: '13px' }}>
              ⚠️ OSHA 29 CFR 1910.151(c) & ANSI Z358.1-2014 Compliant | Monthly Inspection Required
            </div>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} style={{ padding: '25px' }}>
            {/* Station & Inspector Information */}
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '20px', marginBottom: '20px', borderLeft: '4px solid #1e3a8a' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e3a8a', marginBottom: '15px' }}>
                📋 Station & Inspector Information
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
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Specific Location (Building/Area) *</label>
                  <input type="text" name="specific_location" value={formData.specific_location} onChange={handleChange} required
                    placeholder="e.g., Shop B, Lab 102, Battery Room"
                    style={{ width: '100%', padding: '10px 12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Station ID / Tag Number *</label>
                  <input type="text" name="station_id" value={formData.station_id} onChange={handleChange} required
                    placeholder="e.g., EW-001"
                    onBlur={() => checkDuplicateInspection(formData.station_id)}
                    style={{ width: '100%', padding: '10px 12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }} />
                  
                  {duplicateWarning && !duplicateConfirmed && (
                    <div style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', border: '2px solid #f59e0b', borderRadius: '8px', padding: '15px', marginTop: '10px' }}>
                      <h4 style={{ color: '#92400e', marginBottom: '8px', fontSize: '14px' }}>⚠️ Recently Inspected</h4>
                      <p style={{ color: '#92400e', fontSize: '13px', marginBottom: '10px' }}>
                        This station was inspected <strong>{duplicateWarning.daysAgo} days ago</strong> on {duplicateWarning.date} by {duplicateWarning.inspector}.
                      </p>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button type="button" onClick={() => setDuplicateConfirmed(true)}
                          style={{ background: '#f59e0b', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
                          Inspect Anyway
                        </button>
                        <button type="button" onClick={() => { setFormData(prev => ({ ...prev, station_id: '' })); setDuplicateWarning(null); }}
                          style={{ background: '#6b7280', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
                          Enter Different ID
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Station Type *</label>
                  <select name="station_type" value={formData.station_type} onChange={handleChange} required
                    style={{ width: '100%', padding: '10px 12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }}>
                    <option value="">Select Type...</option>
                    {STATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Water Source *</label>
                  <select name="water_source" value={formData.water_source} onChange={handleChange} required
                    style={{ width: '100%', padding: '10px 12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }}>
                    <option value="">Select Source...</option>
                    {WATER_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Combination Unit with Shower?</label>
                  <select name="combination_unit" value={formData.combination_unit} onChange={handleChange}
                    style={{ width: '100%', padding: '10px 12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }}>
                    <option value="">Select...</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Manufacturer</label>
                  <input type="text" name="manufacturer" value={formData.manufacturer} onChange={handleChange}
                    placeholder="e.g., Bradley, Haws, Speakman"
                    style={{ width: '100%', padding: '10px 12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Install Date</label>
                  <input type="date" name="install_date" value={formData.install_date} onChange={handleChange}
                    style={{ width: '100%', padding: '10px 12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Last Annual Certification</label>
                  <input type="date" name="last_annual_cert" value={formData.last_annual_cert} onChange={handleChange}
                    style={{ width: '100%', padding: '10px 12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }} />
                </div>
              </div>
            </div>

            {/* Accessibility & Location */}
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '20px', marginBottom: '20px', borderLeft: '4px solid #059669' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#059669', marginBottom: '15px' }}>
                🚶 Accessibility & Location
              </h3>
              <div style={{ background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)', border: '2px solid #3b82f6', borderRadius: '8px', padding: '12px 15px', marginBottom: '15px' }}>
                <p style={{ fontSize: '13px', color: '#1e40af', margin: 0 }}>
                  ℹ️ ANSI Z358.1 requires eyewash stations to be within 10 seconds (55 feet) travel distance from hazard, on same level, and free of obstructions.
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                <InspectionItem label="Accessible & Unobstructed" name="accessible" />
                <InspectionItem label="Within 10 Seconds of Hazard" name="within_distance" />
                <InspectionItem label="Signage Visible & Correct" name="signage_visible" />
              </div>
            </div>

            {/* Water Flow & Quality */}
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '20px', marginBottom: '20px', borderLeft: '4px solid #0891b2' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0891b2', marginBottom: '15px' }}>
                💧 Water Flow & Quality
              </h3>
              <div style={{ background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)', border: '2px solid #dc2626', borderRadius: '8px', padding: '12px 15px', marginBottom: '15px' }}>
                <p style={{ fontSize: '13px', color: '#991b1b', margin: 0 }}>
                  🚨 CRITICAL: Water must be tepid (60-100°F / 16-38°C) and flow for minimum 15 minutes. Weekly flushing required for plumbed units.
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                <InspectionItem label="Activation Tested" name="activation_tested" />
                <InspectionItem label="Water Flow Adequate (0.4 GPM min)" name="water_flow_adequate" />
                <InspectionItem label="Both Nozzles Flow Equally" name="both_nozzles_flow" />
                <InspectionItem label="Water Temp Tepid (60-100°F)" name="water_temp_tepid" />
                <InspectionItem label="Flushed Minimum 3 Minutes" name="flushed_minimum" />
              </div>
            </div>

            {/* Components & Condition */}
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '20px', marginBottom: '20px', borderLeft: '4px solid #7c3aed' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#7c3aed', marginBottom: '15px' }}>
                🔧 Components & Condition
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                <InspectionItem label="Nozzle Covers Present" name="nozzle_covers" />
                <InspectionItem label="Dust Covers Functional" name="dust_covers" showNA />
                <InspectionItem label="Basin/Bowl Clean" name="basin_clean" />
                <InspectionItem label="No Algae or Contamination" name="no_contamination" />
                <InspectionItem label="Drain Functional" name="drain_functional" />
                <InspectionItem label="Valves Operate Properly" name="valves_operate" />
                <InspectionItem label="Stay-Open Valve Works" name="stay_open_valve" />
                <InspectionItem label="Piping Condition" name="piping_condition" />
              </div>
            </div>

            {/* Documentation & Certification */}
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '20px', marginBottom: '20px', borderLeft: '4px solid #ea580c' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#ea580c', marginBottom: '15px' }}>
                📄 Documentation & Certification
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                <InspectionItem label="Inspection Tag Present" name="inspection_tag_present" />
                <InspectionItem label="Inspection Tag Current" name="inspection_tag_current" />
                <InspectionItem label="Annual Certification Current" name="annual_cert_current" showNA />
              </div>
            </div>

            {/* Portable/Self-Contained Units */}
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '20px', marginBottom: '20px', borderLeft: '4px solid #eab308' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#eab308', marginBottom: '15px' }}>
                🧴 Portable/Self-Contained Units (If Applicable)
              </h3>
              <div style={{ background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)', border: '2px solid #3b82f6', borderRadius: '8px', padding: '12px 15px', marginBottom: '15px' }}>
                <p style={{ fontSize: '13px', color: '#1e40af', margin: 0 }}>
                  ℹ️ Complete this section only for portable eyewash stations, gravity-fed tanks, or bottled solutions.
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                <InspectionItem label="Portable Tank Full" name="portable_tank_full" showNA />
                <InspectionItem label="Solution Not Expired" name="solution_not_expired" showNA />
              </div>
            </div>

            {/* Overall & Result */}
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '20px', marginBottom: '20px', borderLeft: '4px solid #16a34a' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#16a34a', marginBottom: '15px' }}>
                ✅ Overall Condition & Inspection Result
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '5px', fontSize: '14px' }}>Overall Station Condition *</label>
                  <select name="overall_condition" value={formData.overall_condition} onChange={handleChange} required
                    style={{ width: '100%', padding: '10px 12px', border: '2px solid #d1d5db', borderRadius: '8px', fontSize: '16px' }}>
                    <option value="">Select...</option>
                    <option value="Good">Good - Fully Operational</option>
                    <option value="Fair">Fair - Minor Issues Noted</option>
                    <option value="Poor">Poor - Needs Immediate Attention</option>
                    <option value="Critical">Critical - Out of Service</option>
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
                      <span>❌ Fail - Tag Out of Service</span>
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
                    <option value="Work Order Submitted">Work Order Submitted</option>
                    <option value="Repaired On-Site">Repaired On-Site</option>
                    <option value="Solution Replaced">Solution Replaced</option>
                    <option value="Tank Refilled">Tank Refilled</option>
                    <option value="Scheduled for Repair">Scheduled for Repair</option>
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

            {/* Photo Documentation */}
            <MultiPhotoUpload ref={photoRef} formType="eyewash-station-inspection" />

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

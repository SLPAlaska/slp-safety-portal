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

const VEHICLE_TYPES = ['Pickup Truck', 'SUV', 'Van', 'Sedan', 'Heavy Truck', 'Bus', 'ATV/UTV', 'Snowmachine', 'Other'];

const WEATHER_OPTIONS = ['Clear', 'Partly Cloudy', 'Overcast', 'Light Rain', 'Heavy Rain', 'Light Snow', 'Heavy Snow', 'Fog', 'Ice Storm', 'Blizzard', 'High Winds'];

const ROAD_OPTIONS = ['Dry', 'Wet', 'Icy', 'Snow Packed', 'Muddy', 'Gravel', 'Under Construction', 'Closed'];

const VISIBILITY_OPTIONS = ['Good (>1 mile)', 'Fair (1/4-1 mile)', 'Poor (<1/4 mile)', 'Very Poor (Whiteout)'];

const CHECKIN_OPTIONS = ['Every 30 minutes', 'Every hour', 'Every 2 hours', 'At each stop', 'Departure and arrival only'];

const JOURNEY_STATUS_OPTIONS = ['Planned', 'In Progress', 'Completed', 'Delayed', 'Cancelled', 'Emergency'];

export default function JourneyManagementForm() {
  const [formData, setFormData] = useState({
    submitted_by: '',
    travel_date: new Date().toISOString().split('T')[0],
    company: '',
    origin_location: '',
    destination_location: '',
    intermediate_stops: '',
    primary_route: '',
    alternate_route: '',
    est_departure_time: '',
    est_arrival_time: '',
    est_duration: '',
    driver_name: '',
    driver_phone: '',
    passengers: '',
    total_persons: '1',
    vehicle_type: '',
    vehicle_id: '',
    pre_trip_completed: '',
    weather_conditions: '',
    road_conditions: '',
    visibility: '',
    temperature: '',
    hazards_identified: '',
    risk_level: '',
    travel_approved: '',
    sat_phone_available: '',
    comm_device_id: '',
    check_in_frequency: '',
    check_in_contact: '',
    check_in_phone: '',
    survival_kit_present: 'No',
    survival_kit_verified: 'No',
    fuel_adequate: 'No',
    food_water: 'No',
    arctic_gear: 'No',
    first_aid_kit: 'No',
    fire_extinguisher: 'No',
    recovery_equipment: 'No',
    additional_equipment: '',
    supervisor_name: '',
    supervisor_phone: '',
    supervisor_approval: '',
    special_instructions: '',
    return_journey: '',
    actual_departure: '',
    actual_arrival: '',
    journey_status: 'Planned'
  });

  const [photos, setPhotos] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckbox = (field) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field] === 'Yes' ? 'No' : 'Yes'
    }));
  };

  const handlePhotoChange = (e) => {
    const files = Array.from(e.target.files);
    setPhotos(prev => [...prev, ...files]);
  };

  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const uploadPhotos = async () => {
    const uploadedUrls = [];
    for (const photo of photos) {
      const fileName = `journey-management/${Date.now()}-${photo.name}`;
      const { error } = await supabase.storage.from('safety-photos').upload(fileName, photo);
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('safety-photos').getPublicUrl(fileName);
        uploadedUrls.push(publicUrl);
      }
    }
    return uploadedUrls;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      console.log('Starting Journey Management submission...');

      let photoUrls = [];
      if (photos.length > 0) {
        photoUrls = await uploadPhotos();
      }

      const submitData = {};
      for (const [key, value] of Object.entries(formData)) {
        submitData[key] = value === '' ? null : value;
      }
      submitData.photo_urls = photoUrls.length > 0 ? photoUrls : null;

      console.log('Submitting to Supabase:', submitData);

      const { data, error } = await supabase
        .from('journey_management')
        .insert([submitData])
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Success:', data);
      setSubmitStatus('success');

      setFormData({
        submitted_by: '',
        travel_date: new Date().toISOString().split('T')[0],
        company: '',
        origin_location: '',
        destination_location: '',
        intermediate_stops: '',
        primary_route: '',
        alternate_route: '',
        est_departure_time: '',
        est_arrival_time: '',
        est_duration: '',
        driver_name: '',
        driver_phone: '',
        passengers: '',
        total_persons: '1',
        vehicle_type: '',
        vehicle_id: '',
        pre_trip_completed: '',
        weather_conditions: '',
        road_conditions: '',
        visibility: '',
        temperature: '',
        hazards_identified: '',
        risk_level: '',
        travel_approved: '',
        sat_phone_available: '',
        comm_device_id: '',
        check_in_frequency: '',
        check_in_contact: '',
        check_in_phone: '',
        survival_kit_present: 'No',
        survival_kit_verified: 'No',
        fuel_adequate: 'No',
        food_water: 'No',
        arctic_gear: 'No',
        first_aid_kit: 'No',
        fire_extinguisher: 'No',
        recovery_equipment: 'No',
        additional_equipment: '',
        supervisor_name: '',
        supervisor_phone: '',
        supervisor_approval: '',
        special_instructions: '',
        return_journey: '',
        actual_departure: '',
        actual_arrival: '',
        journey_status: 'Planned'
      });
      setPhotos([]);

    } catch (error) {
      console.error('Submission error:', error);
      setSubmitStatus('error: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const styles = {
    container: { maxWidth: '950px', margin: '0 auto', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', overflow: 'hidden', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
    header: { background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)', color: '#fff', padding: '25px', textAlign: 'center' },
    headerTitle: { margin: '0', fontSize: '24px', fontWeight: '700' },
    headerSubtitle: { margin: '8px 0 0', opacity: '0.9', fontSize: '13px' },
    badge: { display: 'inline-block', background: '#fff', color: '#1e3a8a', padding: '4px 12px', borderRadius: '15px', fontSize: '11px', fontWeight: '600', marginTop: '8px' },
    formContent: { padding: '25px' },
    sectionHeader: { padding: '10px 18px', margin: '20px -25px 15px', fontWeight: '600', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' },
    row: { display: 'flex', gap: '15px', flexWrap: 'wrap' },
    row3: { display: 'flex', gap: '12px', flexWrap: 'wrap' },
    row4: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
    formGroup: { flex: '1', minWidth: '180px', marginBottom: '15px' },
    fullWidth: { width: '100%', marginBottom: '15px' },
    label: { display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '13px', color: '#1f2937' },
    input: { width: '100%', padding: '10px', border: '2px solid #d1d5db', borderRadius: '6px', fontSize: '15px', boxSizing: 'border-box' },
    select: { width: '100%', padding: '10px', border: '2px solid #d1d5db', borderRadius: '6px', fontSize: '15px', boxSizing: 'border-box', backgroundColor: '#fff' },
    textarea: { width: '100%', padding: '10px', border: '2px solid #d1d5db', borderRadius: '6px', fontSize: '15px', minHeight: '70px', resize: 'vertical', boxSizing: 'border-box' },
    radioGroup: { display: 'flex', gap: '12px', flexWrap: 'wrap' },
    radioOption: { display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', border: '2px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
    riskSelector: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' },
    riskOption: { padding: '12px 8px', border: '3px solid #d1d5db', borderRadius: '8px', textAlign: 'center', cursor: 'pointer' },
    checkboxGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' },
    checkboxItem: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
    infoBox: { borderRadius: '6px', padding: '12px', marginBottom: '15px', fontSize: '12px' },
    photoUpload: { border: '2px dashed #d1d5db', borderRadius: '8px', padding: '25px', textAlign: 'center', cursor: 'pointer' },
    photoPreview: { display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' },
    photoThumb: { width: '80px', height: '80px', objectFit: 'cover', borderRadius: '4px' },
    submitBtn: { width: '100%', padding: '14px', background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', marginTop: '15px' },
    successMessage: { background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', color: '#fff', padding: '25px', borderRadius: '8px', textAlign: 'center', marginTop: '15px' },
    footer: { textAlign: 'center', padding: '20px 10px', marginTop: '30px', borderTop: '1px solid #e2e8f0', fontSize: '11px', color: '#64748b', background: 'linear-gradient(to bottom, #f8fafc, #ffffff)' }
  };

  const getRiskStyle = (level) => {
    const isSelected = formData.risk_level === level;
    const colors = {
      Low: { border: '#059669', bg: 'rgba(5, 150, 105, 0.1)', icon: '🟢' },
      Medium: { border: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', icon: '🟡' },
      High: { border: '#ea580c', bg: 'rgba(234, 88, 12, 0.1)', icon: '🟠' },
      Critical: { border: '#dc2626', bg: 'rgba(220, 38, 38, 0.1)', icon: '🔴' }
    };
    const c = colors[level];
    return {
      ...styles.riskOption,
      borderColor: isSelected ? c.border : '#d1d5db',
      background: isSelected ? c.bg : '#fff'
    };
  };

  if (submitStatus === 'success') {
    return (
      <div style={{ padding: '20px', backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
        <div style={styles.container}>
          <div style={styles.header}>
            <img src="/Logo.png" alt="SLP Alaska" style={{ maxWidth: '180px', margin: '0 auto 15px auto', display: 'block' }} />
            <h1 style={styles.headerTitle}>Journey Management Plan</h1>
          </div>
          <div style={styles.formContent}>
            <div style={styles.successMessage}>
              <h2>✓ Journey Management Plan Submitted!</h2>
              <p>Travel safely and check in as planned.</p>
              <button onClick={() => setSubmitStatus(null)} style={{ ...styles.submitBtn, background: '#fff', color: '#059669', marginTop: '10px' }}>
                Create New Plan
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
      <div style={styles.container}>
        <div style={styles.header}>
          <img src="/Logo.png" alt="SLP Alaska" style={{ maxWidth: '180px', margin: '0 auto 15px auto', display: 'block' }} />
          <h1 style={styles.headerTitle}>Journey Management Plan</h1>
          <p style={styles.headerSubtitle}>Pre-Trip Planning for Safe Travel in Alaska</p>
          <div style={styles.badge}>🚗 TRAVEL SAFETY PLAN</div>
        </div>

        <div style={styles.formContent}>
          <form onSubmit={handleSubmit}>
            {/* Trip Information */}
            <div style={{ ...styles.sectionHeader, backgroundColor: '#1e3a8a', marginTop: '0' }}>📋 Trip Information</div>

            <div style={styles.row}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Submitted By <span style={{ color: '#dc2626' }}>*</span></label>
                <input type="text" name="submitted_by" value={formData.submitted_by} onChange={handleChange} required style={styles.input} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Date of Travel <span style={{ color: '#dc2626' }}>*</span></label>
                <input type="date" name="travel_date" value={formData.travel_date} onChange={handleChange} required style={styles.input} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Company <span style={{ color: '#dc2626' }}>*</span></label>
                <select name="company" value={formData.company} onChange={handleChange} required style={styles.select}>
                  <option value="">-- Select Company --</option>
                  {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div style={styles.row}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Origin Location <span style={{ color: '#dc2626' }}>*</span></label>
                <select name="origin_location" value={formData.origin_location} onChange={handleChange} required style={styles.select}>
                  <option value="">-- Select Location --</option>
                  {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Destination Location <span style={{ color: '#dc2626' }}>*</span></label>
                <select name="destination_location" value={formData.destination_location} onChange={handleChange} required style={styles.select}>
                  <option value="">-- Select Location --</option>
                  {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>

            <div style={styles.fullWidth}>
              <label style={styles.label}>Intermediate Stops</label>
              <input type="text" name="intermediate_stops" value={formData.intermediate_stops} onChange={handleChange} placeholder="List any planned stops along the route" style={styles.input} />
            </div>

            <div style={styles.row}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Primary Route <span style={{ color: '#dc2626' }}>*</span></label>
                <input type="text" name="primary_route" value={formData.primary_route} onChange={handleChange} placeholder="e.g., Dalton Highway" required style={styles.input} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Alternate Route</label>
                <input type="text" name="alternate_route" value={formData.alternate_route} onChange={handleChange} placeholder="Backup route if primary is impassable" style={styles.input} />
              </div>
            </div>

            <div style={styles.row3}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Est. Departure Time <span style={{ color: '#dc2626' }}>*</span></label>
                <input type="time" name="est_departure_time" value={formData.est_departure_time} onChange={handleChange} required style={styles.input} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Est. Arrival Time <span style={{ color: '#dc2626' }}>*</span></label>
                <input type="time" name="est_arrival_time" value={formData.est_arrival_time} onChange={handleChange} required style={styles.input} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Est. Duration</label>
                <input type="text" name="est_duration" value={formData.est_duration} onChange={handleChange} placeholder="e.g., 4 hours" style={styles.input} />
              </div>
            </div>

            {/* Driver & Vehicle */}
            <div style={{ ...styles.sectionHeader, backgroundColor: '#ea580c' }}>🚗 Driver & Vehicle Information</div>

            <div style={styles.row}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Driver Name <span style={{ color: '#dc2626' }}>*</span></label>
                <input type="text" name="driver_name" value={formData.driver_name} onChange={handleChange} required style={styles.input} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Driver Phone <span style={{ color: '#dc2626' }}>*</span></label>
                <input type="tel" name="driver_phone" value={formData.driver_phone} onChange={handleChange} required style={styles.input} />
              </div>
            </div>

            <div style={styles.row}>
              <div style={styles.formGroup}>
                <label style={styles.label}>All Passengers (Names)</label>
                <input type="text" name="passengers" value={formData.passengers} onChange={handleChange} placeholder="List all passenger names" style={styles.input} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Total # of Persons <span style={{ color: '#dc2626' }}>*</span></label>
                <input type="number" name="total_persons" value={formData.total_persons} onChange={handleChange} min="1" required style={styles.input} />
              </div>
            </div>

            <div style={styles.row3}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Vehicle Type <span style={{ color: '#dc2626' }}>*</span></label>
                <select name="vehicle_type" value={formData.vehicle_type} onChange={handleChange} required style={styles.select}>
                  <option value="">-- Select --</option>
                  {VEHICLE_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Vehicle ID / License Plate <span style={{ color: '#dc2626' }}>*</span></label>
                <input type="text" name="vehicle_id" value={formData.vehicle_id} onChange={handleChange} required style={styles.input} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Pre-Trip Inspection Completed? <span style={{ color: '#dc2626' }}>*</span></label>
                <div style={styles.radioGroup}>
                  {['Yes', 'No'].map(opt => (
                    <label key={opt} style={{ ...styles.radioOption, borderColor: formData.pre_trip_completed === opt ? '#1e3a8a' : '#d1d5db', background: formData.pre_trip_completed === opt ? 'rgba(30, 58, 138, 0.05)' : '#fff' }}>
                      <input type="radio" name="pre_trip_completed" value={opt} checked={formData.pre_trip_completed === opt} onChange={handleChange} required style={{ width: '16px', height: '16px' }} />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Conditions Assessment */}
            <div style={{ ...styles.sectionHeader, backgroundColor: '#0891b2' }}>🌡️ Conditions Assessment</div>

            <div style={styles.row4}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Weather <span style={{ color: '#dc2626' }}>*</span></label>
                <select name="weather_conditions" value={formData.weather_conditions} onChange={handleChange} required style={styles.select}>
                  <option value="">-- Select --</option>
                  {WEATHER_OPTIONS.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Road Conditions <span style={{ color: '#dc2626' }}>*</span></label>
                <select name="road_conditions" value={formData.road_conditions} onChange={handleChange} required style={styles.select}>
                  <option value="">-- Select --</option>
                  {ROAD_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Visibility <span style={{ color: '#dc2626' }}>*</span></label>
                <select name="visibility" value={formData.visibility} onChange={handleChange} required style={styles.select}>
                  <option value="">-- Select --</option>
                  {VISIBILITY_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Temperature</label>
                <input type="text" name="temperature" value={formData.temperature} onChange={handleChange} placeholder="e.g., -20°F" style={styles.input} />
              </div>
            </div>

            <div style={styles.fullWidth}>
              <label style={styles.label}>Hazards Identified</label>
              <textarea name="hazards_identified" value={formData.hazards_identified} onChange={handleChange} placeholder="Wildlife, construction zones, known dangerous curves, avalanche areas, etc." style={styles.textarea} />
            </div>

            <div style={styles.fullWidth}>
              <label style={styles.label}>Risk Level <span style={{ color: '#dc2626' }}>*</span></label>
              <div style={styles.riskSelector}>
                {['Low', 'Medium', 'High', 'Critical'].map(level => (
                  <div key={level} onClick={() => setFormData(prev => ({ ...prev, risk_level: level }))} style={getRiskStyle(level)}>
                    <div>{level === 'Low' ? '🟢' : level === 'Medium' ? '🟡' : level === 'High' ? '🟠' : '🔴'}</div>
                    <div style={{ fontWeight: '600', fontSize: '12px' }}>{level.toUpperCase()}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={styles.fullWidth}>
              <label style={styles.label}>Travel Approved for Current Conditions? <span style={{ color: '#dc2626' }}>*</span></label>
              <div style={styles.radioGroup}>
                {['Yes', 'No', 'Conditional'].map(opt => (
                  <label key={opt} style={{ ...styles.radioOption, borderColor: formData.travel_approved === opt ? '#1e3a8a' : '#d1d5db', background: formData.travel_approved === opt ? 'rgba(30, 58, 138, 0.05)' : '#fff' }}>
                    <input type="radio" name="travel_approved" value={opt} checked={formData.travel_approved === opt} onChange={handleChange} required style={{ width: '16px', height: '16px' }} />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Communication Plan */}
            <div style={{ ...styles.sectionHeader, backgroundColor: '#7c3aed' }}>📡 Communication Plan</div>

            <div style={{ ...styles.infoBox, background: '#fef3c7', border: '1px solid #fcd34d', color: '#92400e' }}>
              <strong>Remote Travel:</strong> Satellite communication (InReach, Sat Phone) is required for travel on remote roads where cell service is unavailable.
            </div>

            <div style={styles.row}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Satellite Phone/InReach Available? <span style={{ color: '#dc2626' }}>*</span></label>
                <div style={styles.radioGroup}>
                  {['Yes', 'No', 'N/A - Cell Coverage'].map(opt => (
                    <label key={opt} style={{ ...styles.radioOption, borderColor: formData.sat_phone_available === opt ? '#1e3a8a' : '#d1d5db', background: formData.sat_phone_available === opt ? 'rgba(30, 58, 138, 0.05)' : '#fff' }}>
                      <input type="radio" name="sat_phone_available" value={opt} checked={formData.sat_phone_available === opt} onChange={handleChange} required style={{ width: '16px', height: '16px' }} />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Communication Device ID</label>
                <input type="text" name="comm_device_id" value={formData.comm_device_id} onChange={handleChange} placeholder="Sat phone # or InReach ID" style={styles.input} />
              </div>
            </div>

            <div style={styles.row3}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Check-In Frequency <span style={{ color: '#dc2626' }}>*</span></label>
                <select name="check_in_frequency" value={formData.check_in_frequency} onChange={handleChange} required style={styles.select}>
                  <option value="">-- Select --</option>
                  {CHECKIN_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Check-In Contact Person <span style={{ color: '#dc2626' }}>*</span></label>
                <input type="text" name="check_in_contact" value={formData.check_in_contact} onChange={handleChange} required style={styles.input} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Check-In Contact Phone <span style={{ color: '#dc2626' }}>*</span></label>
                <input type="tel" name="check_in_phone" value={formData.check_in_phone} onChange={handleChange} required style={styles.input} />
              </div>
            </div>

            {/* Safety Equipment */}
            <div style={{ ...styles.sectionHeader, backgroundColor: '#dc2626' }}>🧰 Safety Equipment Checklist</div>

            <div style={{ ...styles.infoBox, background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b' }}>
              <strong>Arctic Survival:</strong> All occupants must have appropriate arctic survival gear. Vehicles must carry emergency supplies for extended survival if stranded.
            </div>

            <div style={styles.checkboxGrid}>
              {[
                { field: 'survival_kit_present', label: 'Emergency Survival Kit Present' },
                { field: 'survival_kit_verified', label: 'Survival Kit Contents Verified' },
                { field: 'fuel_adequate', label: 'Fuel Adequate for Round Trip' },
                { field: 'food_water', label: 'Food & Water for All Occupants' },
                { field: 'arctic_gear', label: 'Arctic Gear for All Occupants' },
                { field: 'first_aid_kit', label: 'First Aid Kit Present' },
                { field: 'fire_extinguisher', label: 'Fire Extinguisher Present' },
                { field: 'recovery_equipment', label: 'Recovery Equipment Present' }
              ].map(item => (
                <div key={item.field} onClick={() => handleCheckbox(item.field)} style={{ ...styles.checkboxItem, background: formData[item.field] === 'Yes' ? '#d1fae5' : '#fff', borderColor: formData[item.field] === 'Yes' ? '#059669' : '#d1d5db' }}>
                  <input type="checkbox" checked={formData[item.field] === 'Yes'} readOnly style={{ width: '18px', height: '18px' }} />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>

            <div style={{ ...styles.fullWidth, marginTop: '15px' }}>
              <label style={styles.label}>Additional PPE/Equipment Notes</label>
              <textarea name="additional_equipment" value={formData.additional_equipment} onChange={handleChange} placeholder="Chains, tow straps, shovel, flares, extra clothing, etc." style={styles.textarea} />
            </div>

            {/* Supervisor Approval */}
            <div style={{ ...styles.sectionHeader, backgroundColor: '#059669' }}>✅ Supervisor Approval</div>

            <div style={styles.row3}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Supervisor Name <span style={{ color: '#dc2626' }}>*</span></label>
                <input type="text" name="supervisor_name" value={formData.supervisor_name} onChange={handleChange} required style={styles.input} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Supervisor Phone <span style={{ color: '#dc2626' }}>*</span></label>
                <input type="tel" name="supervisor_phone" value={formData.supervisor_phone} onChange={handleChange} required style={styles.input} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Supervisor Approval <span style={{ color: '#dc2626' }}>*</span></label>
                <div style={styles.radioGroup}>
                  {['Approved', 'Denied'].map(opt => (
                    <label key={opt} style={{ ...styles.radioOption, borderColor: formData.supervisor_approval === opt ? '#1e3a8a' : '#d1d5db', background: formData.supervisor_approval === opt ? 'rgba(30, 58, 138, 0.05)' : '#fff' }}>
                      <input type="radio" name="supervisor_approval" value={opt} checked={formData.supervisor_approval === opt} onChange={handleChange} required style={{ width: '16px', height: '16px' }} />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div style={styles.fullWidth}>
              <label style={styles.label}>Special Instructions or Notes</label>
              <textarea name="special_instructions" value={formData.special_instructions} onChange={handleChange} placeholder="Any special instructions, restrictions, or notes for this journey..." style={styles.textarea} />
            </div>

            <div style={styles.fullWidth}>
              <label style={styles.label}>Return Journey Required?</label>
              <div style={styles.radioGroup}>
                {['Yes - Same Day', 'Yes - Next Day', 'No - One Way'].map(opt => (
                  <label key={opt} style={{ ...styles.radioOption, borderColor: formData.return_journey === opt ? '#1e3a8a' : '#d1d5db', background: formData.return_journey === opt ? 'rgba(30, 58, 138, 0.05)' : '#fff' }}>
                    <input type="radio" name="return_journey" value={opt} checked={formData.return_journey === opt} onChange={handleChange} style={{ width: '16px', height: '16px' }} />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Journey Status */}
            <div style={{ ...styles.sectionHeader, backgroundColor: '#f59e0b', color: '#000' }}>📍 Journey Status (Optional - Complete After Trip)</div>

            <div style={styles.row3}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Actual Departure Time</label>
                <input type="time" name="actual_departure" value={formData.actual_departure} onChange={handleChange} style={styles.input} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Actual Arrival Time</label>
                <input type="time" name="actual_arrival" value={formData.actual_arrival} onChange={handleChange} style={styles.input} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Journey Status</label>
                <select name="journey_status" value={formData.journey_status} onChange={handleChange} style={styles.select}>
                  {JOURNEY_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Photo/Route Map */}
            <div style={{ ...styles.sectionHeader, backgroundColor: '#1e3a8a' }}>📷 Route Map / Photo</div>

            <div style={styles.fullWidth}>
              <label style={styles.label}>Upload Route Map or Photo (Optional)</label>
              <div style={styles.photoUpload}>
                <input type="file" accept="image/*" multiple onChange={handlePhotoChange} style={{ display: 'none' }} id="photoInput" />
                <label htmlFor="photoInput" style={{ cursor: 'pointer' }}>
                  <p>📷 Tap to upload route map or photo</p>
                </label>
              </div>
              {photos.length > 0 && (
                <div style={styles.photoPreview}>
                  {photos.map((photo, index) => (
                    <div key={index} style={{ position: 'relative' }}>
                      <img src={URL.createObjectURL(photo)} alt={`Preview ${index + 1}`} style={styles.photoThumb} />
                      <button type="button" onClick={() => removePhoto(index)} style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', fontSize: '12px' }}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {submitStatus && submitStatus.startsWith('error') && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '15px', marginTop: '15px', color: '#991b1b' }}>
                <strong>Error:</strong> {submitStatus.replace('error: ', '')}
              </div>
            )}

            <button type="submit" disabled={isSubmitting} style={{ ...styles.submitBtn, opacity: isSubmitting ? 0.6 : 1 }}>
              {isSubmitting ? 'Submitting...' : 'Submit Journey Plan'}
            </button>
          </form>
        </div>

        <div style={styles.footer}>
          <span style={{ color: '#1e3a5f', fontWeight: '500' }}>Powered by Predictive Safety Analytics™</span>
          <span style={{ color: '#94a3b8', margin: '0 8px' }}>|</span>
          <span style={{ color: '#475569' }}>© 2025 SLP Alaska</span>
        </div>
      </div>
    </div>
  );
}

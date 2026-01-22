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

const VEHICLE_TYPES = ['Pickup Truck', 'SUV', 'Van', 'Box Truck', 'Semi/Tractor', 'ATV/UTV', 'Snowmachine', 'Bus', 'Other'];
const WEATHER_OPTIONS = ['Clear', 'Partly Cloudy', 'Overcast', 'Light Rain', 'Heavy Rain', 'Light Snow', 'Heavy Snow', 'Fog', 'Ice/Freezing Rain', 'Blizzard', 'Extreme Cold (<-20°F)'];
const ROAD_OPTIONS = ['Dry Pavement', 'Wet Pavement', 'Icy', 'Snow Packed', 'Gravel - Good', 'Gravel - Rough', 'Ice Road', 'Off-Road', 'Unknown'];
const VISIBILITY_OPTIONS = ['Good (>1 mile)', 'Fair (1/4-1 mile)', 'Poor (<1/4 mile)', 'Very Poor (Whiteout)'];
const CHECKIN_OPTIONS = ['Every 30 minutes', 'Every 1 hour', 'Every 2 hours', 'At destination only', 'Other'];
const JOURNEY_STATUS_OPTIONS = ['Not Started', 'In Progress', 'Completed Safely', 'Delayed', 'Cancelled', 'Emergency'];

export default function JourneyManagementForm() {
  const [formData, setFormData] = useState({
    driver_name: '',
    travel_date: new Date().toISOString().split('T')[0],
    departure_time: '',
    estimated_arrival: '',
    company: '',
    origin: '',
    destination: '',
    route_description: '',
    alternate_route: '',
    passengers: '',
    vehicle_type: '',
    vehicle_id: '',
    pre_trip_completed: '',
    weather_conditions: '',
    road_conditions: '',
    visibility: '',
    risk_level: '',
    travel_approved: '',
    sat_phone_available: '',
    sat_phone_number: '',
    check_in_frequency: '',
    check_in_contact: '',
    check_in_phone: '',
    emergency_supplies: '',
    cold_weather_gear: '',
    first_aid_kit: '',
    fire_extinguisher: '',
    recovery_equipment: '',
    communication_device: '',
    fuel_level: '',
    hazards_identified: '',
    mitigation_measures: '',
    supervisor_name: '',
    supervisor_approval: '',
    additional_notes: '',
    return_journey: '',
    actual_arrival: '',
    journey_status: '',
    journey_notes: ''
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
      let photoUrls = [];
      if (photos.length > 0) {
        photoUrls = await uploadPhotos();
      }

      const submitData = {};
      for (const [key, value] of Object.entries(formData)) {
        submitData[key] = value === '' ? null : value;
      }
      submitData.photo_urls = photoUrls.length > 0 ? photoUrls : null;

      const { error } = await supabase.from('journey_management').insert([submitData]).select();

      if (error) throw error;

      setSubmitStatus('success');
      setFormData({
        driver_name: '', travel_date: new Date().toISOString().split('T')[0], departure_time: '',
        estimated_arrival: '', company: '', origin: '', destination: '', route_description: '',
        alternate_route: '', passengers: '', vehicle_type: '', vehicle_id: '', pre_trip_completed: '',
        weather_conditions: '', road_conditions: '', visibility: '', risk_level: '', travel_approved: '',
        sat_phone_available: '', sat_phone_number: '', check_in_frequency: '', check_in_contact: '',
        check_in_phone: '', emergency_supplies: '', cold_weather_gear: '', first_aid_kit: '',
        fire_extinguisher: '', recovery_equipment: '', communication_device: '', fuel_level: '',
        hazards_identified: '', mitigation_measures: '', supervisor_name: '', supervisor_approval: '',
        additional_notes: '', return_journey: '', actual_arrival: '', journey_status: '', journey_notes: ''
      });
      setPhotos([]);
    } catch (error) {
      setSubmitStatus('error: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const styles = {
    container: { maxWidth: '950px', margin: '0 auto', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', overflow: 'hidden', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
    header: { background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)', color: '#fff', padding: '25px', textAlign: 'center' },
    formContent: { padding: '25px' },
    sectionHeader: { padding: '10px 18px', margin: '20px -25px 15px', fontWeight: '600', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' },
    row: { display: 'flex', gap: '15px', flexWrap: 'wrap' },
    formGroup: { flex: '1', minWidth: '200px', marginBottom: '15px' },
    fullWidth: { width: '100%', marginBottom: '15px' },
    label: { display: 'block', marginBottom: '5px', fontWeight: '500', fontSize: '13px' },
    input: { width: '100%', padding: '10px', border: '2px solid #d1d5db', borderRadius: '6px', fontSize: '15px', boxSizing: 'border-box' },
    select: { width: '100%', padding: '10px', border: '2px solid #d1d5db', borderRadius: '6px', fontSize: '15px', boxSizing: 'border-box', backgroundColor: '#fff' },
    textarea: { width: '100%', padding: '10px', border: '2px solid #d1d5db', borderRadius: '6px', fontSize: '15px', minHeight: '80px', resize: 'vertical', boxSizing: 'border-box' },
    radioGroup: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
    radioOption: { display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', border: '2px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
    riskSelector: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' },
    infoBox: { background: '#dbeafe', border: '1px solid #93c5fd', borderRadius: '6px', padding: '12px', marginBottom: '15px', fontSize: '12px', color: '#1e40af' },
    checkboxGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' },
    checkboxItem: { padding: '10px', border: '2px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' },
    photoUpload: { border: '2px dashed #d1d5db', borderRadius: '8px', padding: '25px', textAlign: 'center', cursor: 'pointer' },
    photoThumb: { width: '80px', height: '80px', objectFit: 'cover', borderRadius: '4px' },
    submitBtn: { width: '100%', padding: '14px', background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', marginTop: '15px' },
    successMessage: { background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', color: '#fff', padding: '25px', borderRadius: '8px', textAlign: 'center', marginTop: '15px' },
    footer: { textAlign: 'center', padding: '20px 10px', marginTop: '30px', borderTop: '1px solid #e2e8f0', fontSize: '11px', color: '#64748b' }
  };

  const getRiskStyle = (level) => {
    const isSelected = formData.risk_level === level;
    const colors = {
      Low: { border: '#059669', bg: 'rgba(5, 150, 105, 0.1)', icon: '🟢' },
      Medium: { border: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', icon: '🟡' },
      High: { border: '#ea580c', bg: 'rgba(234, 88, 12, 0.1)', icon: '🟠' },
      Critical: { border: '#dc2626', bg: 'rgba(220, 38, 38, 0.1)', icon: '🔴' }
    };
    const c = colors[level] || { border: '#d1d5db', bg: '#fff', icon: '' };
    return {
      padding: '12px 8px', border: `2px solid ${isSelected ? c.border : '#d1d5db'}`,
      borderRadius: '6px', textAlign: 'center', cursor: 'pointer',
      background: isSelected ? c.bg : '#fff'
    };
  };

  if (submitStatus === 'success') {
    return (
      <div style={{ padding: '20px', backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
        <a href="/" style={{ display: 'inline-block', marginBottom: '15px', padding: '10px 20px', backgroundColor: '#1e3a5f', color: '#fff', textDecoration: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '500' }}>← Back to Portal</a>
        <div style={styles.container}>
          <div style={styles.header}>
            <img src="/Logo.png" alt="SLP Alaska" style={{ maxWidth: '180px', margin: '0 auto 15px auto', display: 'block' }} />
            <h1 style={{ margin: 0, fontSize: '24px' }}>Journey Management Plan</h1>
          </div>
          <div style={styles.formContent}>
            <div style={styles.successMessage}>
              <h2>✓ Journey Plan Submitted!</h2>
              <p>Your journey management plan has been recorded. Travel safely!</p>
              <button onClick={() => setSubmitStatus(null)} style={{ ...styles.submitBtn, background: '#fff', color: '#059669', marginTop: '10px' }}>Submit Another Plan</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
      <a href="/" style={{ display: 'inline-block', marginBottom: '15px', padding: '10px 20px', backgroundColor: '#1e3a5f', color: '#fff', textDecoration: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '500' }}>← Back to Portal</a>
      <div style={styles.container}>
        <div style={styles.header}>
          <img src="/Logo.png" alt="SLP Alaska" style={{ maxWidth: '180px', margin: '0 auto 15px auto', display: 'block' }} />
          <h1 style={{ margin: 0, fontSize: '24px' }}>Journey Management Plan</h1>
          <p style={{ margin: '8px 0 0', opacity: 0.9, fontSize: '13px' }}>Pre-Trip Planning & Risk Assessment</p>
          <div style={{ display: 'inline-block', background: '#fff', color: '#1e3a8a', padding: '4px 12px', borderRadius: '15px', fontSize: '11px', fontWeight: '600', marginTop: '8px' }}>🚗 SAFE TRAVEL PLANNING</div>
        </div>

        <div style={styles.formContent}>
          <form onSubmit={handleSubmit}>
            <div style={{ ...styles.sectionHeader, backgroundColor: '#1e3a8a', marginTop: 0 }}>👤 Driver & Trip Information</div>
            <div style={styles.row}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Driver Name <span style={{ color: '#dc2626' }}>*</span></label>
                <input type="text" name="driver_name" value={formData.driver_name} onChange={handleChange} required style={styles.input} />
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
                <label style={styles.label}>Origin <span style={{ color: '#dc2626' }}>*</span></label>
                <select name="origin" value={formData.origin} onChange={handleChange} required style={styles.select}>
                  <option value="">-- Select Origin --</option>
                  {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Destination <span style={{ color: '#dc2626' }}>*</span></label>
                <select name="destination" value={formData.destination} onChange={handleChange} required style={styles.select}>
                  <option value="">-- Select Destination --</option>
                  {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
            <div style={styles.row}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Travel Date <span style={{ color: '#dc2626' }}>*</span></label>
                <input type="date" name="travel_date" value={formData.travel_date} onChange={handleChange} required style={styles.input} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Departure Time <span style={{ color: '#dc2626' }}>*</span></label>
                <input type="time" name="departure_time" value={formData.departure_time} onChange={handleChange} required style={styles.input} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Estimated Arrival</label>
                <input type="time" name="estimated_arrival" value={formData.estimated_arrival} onChange={handleChange} style={styles.input} />
              </div>
            </div>
            <div style={styles.fullWidth}>
              <label style={styles.label}>Route Description</label>
              <textarea name="route_description" value={formData.route_description} onChange={handleChange} placeholder="Describe your planned route..." style={styles.textarea} />
            </div>
            <div style={styles.fullWidth}>
              <label style={styles.label}>All Passengers (Names)</label>
              <input type="text" name="passengers" value={formData.passengers} onChange={handleChange} placeholder="List all passenger names" style={styles.input} />
            </div>

            <div style={{ ...styles.sectionHeader, backgroundColor: '#059669' }}>🚗 Vehicle Information</div>
            <div style={styles.row}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Vehicle Type <span style={{ color: '#dc2626' }}>*</span></label>
                <select name="vehicle_type" value={formData.vehicle_type} onChange={handleChange} required style={styles.select}>
                  <option value="">-- Select Vehicle --</option>
                  {VEHICLE_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Vehicle ID / License</label>
                <input type="text" name="vehicle_id" value={formData.vehicle_id} onChange={handleChange} style={styles.input} />
              </div>
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

            <div style={{ ...styles.sectionHeader, backgroundColor: '#ea580c' }}>🌤️ Conditions & Risk Assessment</div>
            <div style={styles.row}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Weather Conditions <span style={{ color: '#dc2626' }}>*</span></label>
                <select name="weather_conditions" value={formData.weather_conditions} onChange={handleChange} required style={styles.select}>
                  <option value="">-- Select Weather --</option>
                  {WEATHER_OPTIONS.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Road Conditions <span style={{ color: '#dc2626' }}>*</span></label>
                <select name="road_conditions" value={formData.road_conditions} onChange={handleChange} required style={styles.select}>
                  <option value="">-- Select Road Conditions --</option>
                  {ROAD_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Visibility</label>
                <select name="visibility" value={formData.visibility} onChange={handleChange} style={styles.select}>
                  <option value="">-- Select Visibility --</option>
                  {VISIBILITY_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Overall Risk Level <span style={{ color: '#dc2626' }}>*</span></label>
              <div style={styles.riskSelector}>
                {['Low', 'Medium', 'High', 'Critical'].map(level => (
                  <div key={level} onClick={() => setFormData(prev => ({ ...prev, risk_level: level }))} style={getRiskStyle(level)}>
                    <div style={{ fontSize: '20px' }}>{level === 'Low' ? '🟢' : level === 'Medium' ? '🟡' : level === 'High' ? '🟠' : '🔴'}</div>
                    <div style={{ fontWeight: '600', fontSize: '12px' }}>{level.toUpperCase()}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ ...styles.sectionHeader, backgroundColor: '#7c3aed' }}>📞 Communication Plan</div>
            <div style={styles.infoBox}>
              <strong>Remote Travel:</strong> Satellite communication (InReach, Sat Phone) is required for travel on remote roads where cell service is unavailable.
            </div>
            <div style={styles.row}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Satellite Phone Available?</label>
                <div style={styles.radioGroup}>
                  {['Yes', 'No', 'N/A - Cell Coverage'].map(opt => (
                    <label key={opt} style={{ ...styles.radioOption, borderColor: formData.sat_phone_available === opt ? '#1e3a8a' : '#d1d5db', background: formData.sat_phone_available === opt ? 'rgba(30, 58, 138, 0.05)' : '#fff' }}>
                      <input type="radio" name="sat_phone_available" value={opt} checked={formData.sat_phone_available === opt} onChange={handleChange} style={{ width: '16px', height: '16px' }} />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div style={styles.row}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Check-In Frequency</label>
                <select name="check_in_frequency" value={formData.check_in_frequency} onChange={handleChange} style={styles.select}>
                  <option value="">-- Select --</option>
                  {CHECKIN_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Check-In Contact Name</label>
                <input type="text" name="check_in_contact" value={formData.check_in_contact} onChange={handleChange} style={styles.input} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Check-In Phone</label>
                <input type="tel" name="check_in_phone" value={formData.check_in_phone} onChange={handleChange} style={styles.input} />
              </div>
            </div>

            <div style={{ ...styles.sectionHeader, backgroundColor: '#dc2626' }}>🧰 Emergency Equipment Checklist</div>
            <div style={styles.checkboxGrid}>
              {[
                { field: 'emergency_supplies', label: '🧊 Emergency Survival Supplies' },
                { field: 'cold_weather_gear', label: '🧥 Cold Weather Gear' },
                { field: 'first_aid_kit', label: '🩹 First Aid Kit' },
                { field: 'fire_extinguisher', label: '🧯 Fire Extinguisher' },
                { field: 'recovery_equipment', label: '🔧 Recovery Equipment' },
                { field: 'communication_device', label: '📱 Communication Device' }
              ].map(item => (
                <div key={item.field} onClick={() => handleCheckbox(item.field)} style={{ ...styles.checkboxItem, background: formData[item.field] === 'Yes' ? '#d1fae5' : '#fff', borderColor: formData[item.field] === 'Yes' ? '#059669' : '#d1d5db' }}>
                  <input type="checkbox" checked={formData[item.field] === 'Yes'} readOnly style={{ width: '18px', height: '18px' }} />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>

            <div style={{ ...styles.sectionHeader, backgroundColor: '#1e3a8a' }}>✅ Approval</div>
            <div style={styles.row}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Supervisor Name</label>
                <input type="text" name="supervisor_name" value={formData.supervisor_name} onChange={handleChange} style={styles.input} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Supervisor Approval</label>
                <div style={styles.radioGroup}>
                  {['Approved', 'Denied'].map(opt => (
                    <label key={opt} style={{ ...styles.radioOption, borderColor: formData.supervisor_approval === opt ? '#1e3a8a' : '#d1d5db', background: formData.supervisor_approval === opt ? 'rgba(30, 58, 138, 0.05)' : '#fff' }}>
                      <input type="radio" name="supervisor_approval" value={opt} checked={formData.supervisor_approval === opt} onChange={handleChange} style={{ width: '16px', height: '16px' }} />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Return Journey?</label>
              <div style={styles.radioGroup}>
                {['Yes - Same Day', 'Yes - Next Day', 'No - One Way'].map(opt => (
                  <label key={opt} style={{ ...styles.radioOption, borderColor: formData.return_journey === opt ? '#1e3a8a' : '#d1d5db', background: formData.return_journey === opt ? 'rgba(30, 58, 138, 0.05)' : '#fff' }}>
                    <input type="radio" name="return_journey" value={opt} checked={formData.return_journey === opt} onChange={handleChange} style={{ width: '16px', height: '16px' }} />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ ...styles.sectionHeader, backgroundColor: '#f59e0b', color: '#000' }}>📍 Journey Status (Optional - Complete After Trip)</div>
            <div style={styles.row}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Actual Arrival Time</label>
                <input type="time" name="actual_arrival" value={formData.actual_arrival} onChange={handleChange} style={styles.input} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Journey Status</label>
                <select name="journey_status" value={formData.journey_status} onChange={handleChange} style={styles.select}>
                  <option value="">-- Select Status --</option>
                  {JOURNEY_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div style={{ ...styles.sectionHeader, backgroundColor: '#6b7280' }}>📷 Attachments</div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Upload Route Map or Photo (Optional)</label>
              <div style={styles.photoUpload}>
                <input type="file" accept="image/*" multiple onChange={handlePhotoChange} style={{ display: 'none' }} id="photoInput" />
                <label htmlFor="photoInput" style={{ cursor: 'pointer' }}><p>📷 Tap to upload</p></label>
              </div>
              {photos.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' }}>
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

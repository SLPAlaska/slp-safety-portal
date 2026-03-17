'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://iypezirwdlqpptjpeeyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
);

const COMPANIES = [
  'A-C Electric','AKE-Line','Apache Corp.','Armstrong Oil & Gas','ASRC Energy Services',
  'CCI-Industrial','Chosen Construction','CINGSA','Coho Enterprises','Conam Construction',
  'ConocoPhillips','Five Star Oilfield Services','Fox Energy Services','G.A. West',
  'GBR Equipment','GLM Energy Services','Graham Industrial Coatings','Harvest Midstream',
  'Hilcorp Alaska','MagTec Alaska','Merkes Builders','Narwhal Exploration','Nordic-Calista','Parker TRS',
  'Peninsula Paving','Pollard Wireline','Ridgeline Oilfield Services','Santos',
  'Summit Excavation','Tesoro Refinery','Yellowjacket','Other'
];

const LOCATIONS = [
  'Kenai','CIO','Beaver Creek','Swanson River','Ninilchik','Nikiski','Other Kenai Asset',
  'Deadhorse','Prudhoe Bay','Kuparuk','Alpine','Willow','ENI','PIKKA',
  'Point Thompson','North Star Island','Endicott','Badami', 'West Harrison Bay', 'Other North Slope'
];

// Inspection sections per 18 AAC 75.075(c) & (d)
const INSPECTION_SECTIONS = [
  {
    title: 'Secondary Containment Integrity',
    color: '#991b1b',
    ref: '18 AAC 75.075(a)(1)',
    items: [
      { id: 'berms_dikes_intact', label: 'Berms, dikes, or retaining walls are intact and structurally sound with no visible cracks, erosion, or settlement' },
      { id: 'liner_intact', label: 'Containment liner (if applicable) is intact with no tears, punctures, holes, or degradation' },
      { id: 'liner_chemical_resistance', label: 'Liner shows no signs of chemical degradation, swelling, or softening from stored product exposure' },
      { id: 'liner_weather_damage', label: 'Liner/containment materials show no damage from prevailing weather conditions (UV, freeze-thaw, wind)' },
      { id: 'containment_capacity_adequate', label: 'Containment area has adequate capacity (100% of largest tank volume + precipitation freeboard)' },
      { id: 'no_structural_settling', label: 'No evidence of foundation settling, frost heave, or ground deformation beneath containment' },
    ]
  },
  {
    title: 'Containment Area Condition',
    color: '#1e3a8a',
    ref: '18 AAC 75.075(c)',
    items: [
      { id: 'free_of_debris', label: 'Containment area is free of debris, trash, tools, and non-essential materials' },
      { id: 'free_of_vegetation', label: 'Containment area is free of vegetation growth' },
      { id: 'free_of_excessive_water', label: 'Containment area is free of excessive accumulated water, snow, or ice' },
      { id: 'no_conditions_impair', label: 'No other materials or conditions present that might interfere with the effectiveness of the system' },
      { id: 'containment_access_clear', label: 'Access to containment area is unobstructed for inspection and emergency response' },
    ]
  },
  {
    title: 'Oil Leak & Spill Check',
    color: '#991b1b',
    ref: '18 AAC 75.075(c)',
    items: [
      { id: 'no_oil_leaks_tanks', label: 'No visible oil leaks from tanks (shells, bottoms, fittings, valves, or seams)' },
      { id: 'no_oil_leaks_piping', label: 'No visible oil leaks from piping, connections, hoses, or transfer equipment' },
      { id: 'no_oil_on_ground', label: 'No oil staining, sheens, or spilled product on the ground within or outside the containment area' },
      { id: 'no_oil_in_water', label: 'No oil sheen or product detected in any accumulated water within containment' },
      { id: 'drip_pans_inspected', label: 'Drip pans and catch basins at fill connections are in place, intact, and emptied as needed' },
    ]
  },
  {
    title: 'Drainage Controls',
    color: '#1e3a8a',
    ref: '18 AAC 75.075(d)',
    items: [
      { id: 'drain_valves_closed_locked', label: 'All drain valves are in the closed and locked position' },
      { id: 'drain_valves_failsafe', label: 'Drain valves are failsafe design (default to closed on equipment failure)' },
      { id: 'drain_valves_operable', label: 'Drain valves are operable and in good working condition' },
      { id: 'water_inspected_before_drain', label: 'If water was drained this week: water was inspected for oil presence before discharge' },
      { id: 'drain_record_documented', label: 'If water was drained this week: drainage operation was documented in the 5-year written record' },
      { id: 'no_unauthorized_discharge', label: 'No unauthorized discharge of water to land or waters of the state' },
    ]
  },
  {
    title: 'Tank Condition & Overfill Prevention',
    color: '#991b1b',
    ref: '18 AAC 75.065/066/075',
    items: [
      { id: 'tank_shells_condition', label: 'Tank shells show no visible corrosion, dents, bulging, or structural damage' },
      { id: 'tank_foundations_stable', label: 'Tank foundations/supports are stable, level, and free of frost heave or settlement' },
      { id: 'tank_vents_clear', label: 'Tank vents are clear and unobstructed' },
      { id: 'gauging_devices_working', label: 'Level gauging devices and liquid level indicators are functional and readable' },
      { id: 'overfill_prevention_working', label: 'Overfill prevention systems (high-level alarms, auto shutoffs) are functional' },
      { id: 'fill_containment_intact', label: 'Fixed overfill spill containment at each fill connection is intact and functional' },
      { id: 'tank_labels_placards', label: 'Tank labeling, product identification, and ADEC spill reporting placards are posted and legible' },
    ]
  },
  {
    title: 'Piping & Transfer Equipment',
    color: '#1e3a8a',
    ref: '18 AAC 75.080/025',
    items: [
      { id: 'piping_no_leaks', label: 'All aboveground piping is free of leaks, corrosion, or mechanical damage' },
      { id: 'piping_supports_intact', label: 'Pipe supports, hangers, and insulation are intact and secure' },
      { id: 'valves_operable', label: 'All valves are operable and in correct positions (open/closed as required)' },
      { id: 'hoses_condition', label: 'Transfer hoses are in good condition with no cracking, bulging, or coupling damage' },
      { id: 'manifolds_capped', label: 'Manifolds not in use are blank flanged or capped' },
    ]
  },
  {
    title: 'Safety & Emergency Equipment',
    color: '#991b1b',
    ref: 'General Compliance',
    items: [
      { id: 'fire_extinguishers', label: 'Fire extinguishers are present, charged, inspected, and accessible' },
      { id: 'spill_kit_stocked', label: 'Spill response kits are stocked, accessible, and materials are in usable condition' },
      { id: 'no_smoking_signs', label: '"No Smoking" and other required warning signs are posted and visible' },
      { id: 'adec_placard_posted', label: 'ADEC Spill Reporting Placard is posted with current contact information' },
      { id: 'emergency_shutoffs_accessible', label: 'Emergency shutoff controls are marked, accessible, and functional' },
      { id: 'lighting_adequate', label: 'Area lighting is adequate and in working order (if applicable)' },
      { id: 'security_fencing_intact', label: 'Security fencing, gates, and locks are intact (if applicable)' },
    ]
  },
];

const INITIAL_STATE = {};
INSPECTION_SECTIONS.forEach(section => {
  section.items.forEach(item => {
    INITIAL_STATE[item.id] = '';
  });
});

export default function WeeklyTankInspection() {
  const [formData, setFormData] = useState({
    inspector_name: '',
    date: new Date().toISOString().split('T')[0],
    company: '',
    location: '',
    tank_farm_id: '',
    tank_farm_description: '',
    number_of_tanks: '',
    largest_tank_capacity_bbl: '',
    product_stored: '',
    weather_conditions: '',
    temperature_f: '',
    ...INITIAL_STATE,
    water_drained_this_week: '',
    water_drain_volume_gal: '',
    sheen_present_on_drain: '',
    corrective_actions_needed: '',
    corrective_action_details: '',
    overall_result: '',
    inspector_comments: '',
    photos: []
  });

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [photoFiles, setPhotoFiles] = useState([]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePhotoChange = (e) => {
    const files = Array.from(e.target.files);
    setPhotoFiles(prev => [...prev, ...files]);
  };

  const removePhoto = (index) => {
    setPhotoFiles(prev => prev.filter((_, i) => i !== index));
  };

  const calculateResult = () => {
    let totalItems = 0;
    let answered = 0;
    let deficiencies = 0;

    INSPECTION_SECTIONS.forEach(section => {
      section.items.forEach(item => {
        totalItems++;
        const val = formData[item.id];
        if (val) answered++;
        if (val === 'deficient' || val === 'na_requires_followup') deficiencies++;
      });
    });

    if (answered < totalItems) return { status: 'INCOMPLETE', color: '#f59e0b', answered, totalItems, deficiencies };
    if (deficiencies > 0) return { status: 'DEFICIENCIES FOUND', color: '#dc2626', answered, totalItems, deficiencies };
    return { status: 'SATISFACTORY', color: '#22c55e', answered, totalItems, deficiencies };
  };

  const handleSubmit = async () => {
    if (!formData.inspector_name || !formData.company || !formData.location || !formData.tank_farm_id) {
      alert('Please fill in all required fields: Inspector Name, Company, Location, and Tank Farm ID.');
      return;
    }

    setSubmitting(true);

    try {
      // Upload photos
      const photoUrls = [];
      for (const file of photoFiles) {
        const fileName = `${Date.now()}-${file.name}`;
        const { data, error } = await supabase.storage
          .from('safety-photos')
          .upload(`weekly-tank-inspection/${fileName}`, file);
        if (!error && data) {
          const { data: urlData } = supabase.storage
            .from('safety-photos')
            .getPublicUrl(`weekly-tank-inspection/${fileName}`);
          photoUrls.push(urlData.publicUrl);
        }
      }

      const result = calculateResult();
      const inspectionId = `TANK-${formData.date.replace(/-/g, '')}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

      const submitData = {
        ...formData,
        inspection_id: inspectionId,
        overall_result: result.status,
        deficiency_count: result.deficiencies,
        items_inspected: result.totalItems,
        items_answered: result.answered,
        photos: photoUrls,
      };

      const { error } = await supabase
        .from('weekly_tank_inspections')
        .insert([submitData]);

      if (error) throw error;
      setSuccess(true);
    } catch (err) {
      console.error('Submit error:', err);
      alert('Error submitting inspection. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const result = calculateResult();

  if (success) {
    return (
      <div style={styles.container}>
        <div style={styles.successScreen}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>✅</div>
          <h2 style={{ color: '#22c55e', marginBottom: '10px' }}>Inspection Submitted Successfully</h2>
          <p style={{ color: '#94a3b8', marginBottom: '30px' }}>
            Weekly Tank Farm Inspection has been recorded and is now reflected in the AnthroSafe™ Dashboard.
          </p>
          <button onClick={() => { setSuccess(false); setFormData({ ...formData, ...INITIAL_STATE, inspector_comments: '', corrective_action_details: '', corrective_actions_needed: '', water_drained_this_week: '', water_drain_volume_gal: '', sheen_present_on_drain: '' }); setPhotoFiles([]); }} style={styles.submitBtn}>
            Submit Another Inspection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Back Button */}
      <a href="/" style={styles.backBtn}>← Back to Portal</a>

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.logoContainer}>
          <img src="/Logo.png" alt="SLP Alaska" style={styles.logo} />
        </div>
        <div style={styles.badge}>🛢️ WEEKLY TANK FARM INSPECTION</div>
        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', marginTop: '5px' }}>
          Per ADEC 18 AAC 75.075(c) & (d)
        </div>
      </div>

      <div style={styles.card}>
        {/* Regulatory Reference Banner */}
        <div style={{ background: '#fef3c7', border: '2px solid #f59e0b', borderRadius: '8px', padding: '12px 16px', marginBottom: '24px', fontSize: '13px', color: '#92400e' }}>
          <strong>⚠️ Regulatory Basis:</strong> This inspection satisfies the documented weekly inspection requirement under 18 AAC 75.075(c): <em>"Facility personnel shall...conduct documented weekly inspections of secondary containment areas."</em> Records must be maintained for a minimum of 5 years.
        </div>

        {/* General Information */}
        <div style={styles.sectionHeader}>General Information</div>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Inspector Name *</label>
          <input style={styles.input} value={formData.inspector_name} onChange={(e) => handleChange('inspector_name', e.target.value)} placeholder="Full name" />
        </div>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Date *</label>
          <input type="date" style={styles.input} value={formData.date} onChange={(e) => handleChange('date', e.target.value)} />
        </div>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Company *</label>
          <select style={styles.input} value={formData.company} onChange={(e) => handleChange('company', e.target.value)}>
            <option value="">Select Company</option>
            {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Location *</label>
          <select style={styles.input} value={formData.location} onChange={(e) => handleChange('location', e.target.value)}>
            <option value="">Select Location</option>
            {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>

        {/* Tank Farm Identification */}
        <div style={{ ...styles.sectionHeader, background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)' }}>Tank Farm Identification</div>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Tank Farm ID / Name *</label>
          <input style={styles.input} value={formData.tank_farm_id} onChange={(e) => handleChange('tank_farm_id', e.target.value)} placeholder="e.g., Tank Farm Alpha, TF-01" />
        </div>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Tank Farm Description</label>
          <input style={styles.input} value={formData.tank_farm_description} onChange={(e) => handleChange('tank_farm_description', e.target.value)} placeholder="e.g., 3x 600 BBL uprights - diesel, motor oil, hyd fluid" />
        </div>
        <div style={styles.row}>
          <div style={styles.halfField}>
            <label style={styles.label}>Number of Tanks</label>
            <input type="number" style={styles.input} value={formData.number_of_tanks} onChange={(e) => handleChange('number_of_tanks', e.target.value)} />
          </div>
          <div style={styles.halfField}>
            <label style={styles.label}>Largest Tank (BBL)</label>
            <input type="number" style={styles.input} value={formData.largest_tank_capacity_bbl} onChange={(e) => handleChange('largest_tank_capacity_bbl', e.target.value)} placeholder="e.g., 600" />
          </div>
        </div>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Product(s) Stored</label>
          <input style={styles.input} value={formData.product_stored} onChange={(e) => handleChange('product_stored', e.target.value)} placeholder="e.g., Diesel #2, Motor Oil, Hydraulic Fluid" />
        </div>

        {/* Environmental Conditions */}
        <div style={styles.sectionHeader}>Environmental Conditions at Time of Inspection</div>
        <div style={styles.row}>
          <div style={styles.halfField}>
            <label style={styles.label}>Weather Conditions</label>
            <select style={styles.input} value={formData.weather_conditions} onChange={(e) => handleChange('weather_conditions', e.target.value)}>
              <option value="">Select</option>
              <option value="Clear">Clear</option>
              <option value="Overcast">Overcast</option>
              <option value="Rain">Rain</option>
              <option value="Snow">Snow</option>
              <option value="Fog">Fog</option>
              <option value="High Wind">High Wind</option>
              <option value="Whiteout">Whiteout</option>
              <option value="Extreme Cold">Extreme Cold (&lt;-40°F)</option>
            </select>
          </div>
          <div style={styles.halfField}>
            <label style={styles.label}>Temperature (°F)</label>
            <input type="number" style={styles.input} value={formData.temperature_f} onChange={(e) => handleChange('temperature_f', e.target.value)} placeholder="e.g., -25" />
          </div>
        </div>

        {/* Inspection Sections */}
        {INSPECTION_SECTIONS.map((section, sIdx) => (
          <div key={sIdx}>
            <div style={{ ...styles.sectionHeader, background: `linear-gradient(135deg, ${section.color} 0%, ${section.color}dd 100%)` }}>
              {section.title}
              <span style={{ float: 'right', fontSize: '11px', opacity: 0.85, fontWeight: '400' }}>{section.ref}</span>
            </div>
            {section.items.map((item, iIdx) => (
              <div key={item.id} style={{ padding: '12px 0', borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '14px', color: '#1e293b', marginBottom: '8px', lineHeight: '1.4' }}>{item.label}</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {[
                    { value: 'satisfactory', label: '✅ Satisfactory', bg: '#dcfce7', border: '#22c55e', color: '#15803d' },
                    { value: 'deficient', label: '❌ Deficient', bg: '#fee2e2', border: '#dc2626', color: '#991b1b' },
                    { value: 'na', label: '➖ N/A', bg: '#f1f5f9', border: '#94a3b8', color: '#475569' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleChange(item.id, opt.value)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        border: `2px solid ${formData[item.id] === opt.value ? opt.border : '#e2e8f0'}`,
                        background: formData[item.id] === opt.value ? opt.bg : 'white',
                        color: formData[item.id] === opt.value ? opt.color : '#94a3b8',
                        fontSize: '13px',
                        fontWeight: formData[item.id] === opt.value ? '600' : '400',
                        cursor: 'pointer',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}

        {/* Water Drainage Section */}
        <div style={{ ...styles.sectionHeader, background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)' }}>
          Water Drainage Record
          <span style={{ float: 'right', fontSize: '11px', opacity: 0.85, fontWeight: '400' }}>18 AAC 75.075(d)</span>
        </div>
        <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '13px', color: '#0369a1' }}>
          Per 18 AAC 75.075(d): Written records of each drainage operation must be kept for 5 years, including whether a sheen was present.
        </div>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Was water drained from containment this week?</label>
          <div style={{ display: 'flex', gap: '12px' }}>
            {['Yes', 'No'].map(opt => (
              <button key={opt} type="button" onClick={() => handleChange('water_drained_this_week', opt)}
                style={{ padding: '8px 24px', borderRadius: '6px', border: `2px solid ${formData.water_drained_this_week === opt ? '#1e3a8a' : '#e2e8f0'}`, background: formData.water_drained_this_week === opt ? '#dbeafe' : 'white', color: formData.water_drained_this_week === opt ? '#1e3a8a' : '#94a3b8', fontSize: '14px', fontWeight: formData.water_drained_this_week === opt ? '600' : '400', cursor: 'pointer' }}>
                {opt}
              </button>
            ))}
          </div>
        </div>
        {formData.water_drained_this_week === 'Yes' && (
          <>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Approximate Volume Drained (gallons)</label>
              <input type="number" style={styles.input} value={formData.water_drain_volume_gal} onChange={(e) => handleChange('water_drain_volume_gal', e.target.value)} placeholder="Estimated gallons" />
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Was a sheen present on the water before discharge?</label>
              <div style={{ display: 'flex', gap: '12px' }}>
                {['Yes - Sheen Present', 'No - No Sheen'].map(opt => (
                  <button key={opt} type="button" onClick={() => handleChange('sheen_present_on_drain', opt)}
                    style={{ padding: '8px 16px', borderRadius: '6px', border: `2px solid ${formData.sheen_present_on_drain === opt ? (opt.includes('Yes') ? '#dc2626' : '#22c55e') : '#e2e8f0'}`, background: formData.sheen_present_on_drain === opt ? (opt.includes('Yes') ? '#fee2e2' : '#dcfce7') : 'white', color: formData.sheen_present_on_drain === opt ? (opt.includes('Yes') ? '#991b1b' : '#15803d') : '#94a3b8', fontSize: '13px', fontWeight: formData.sheen_present_on_drain === opt ? '600' : '400', cursor: 'pointer' }}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            {formData.sheen_present_on_drain === 'Yes - Sheen Present' && (
              <div style={{ background: '#fef2f2', border: '2px solid #dc2626', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '13px', color: '#991b1b' }}>
                <strong>⚠️ STOP:</strong> Water with a visible sheen must NOT be discharged. Contain and report to ADEC immediately. Document the sheen observation and containment actions taken.
              </div>
            )}
          </>
        )}

        {/* Corrective Actions */}
        <div style={styles.sectionHeader}>Corrective Actions</div>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Are corrective actions needed?</label>
          <div style={{ display: 'flex', gap: '12px' }}>
            {['Yes', 'No'].map(opt => (
              <button key={opt} type="button" onClick={() => handleChange('corrective_actions_needed', opt)}
                style={{ padding: '8px 24px', borderRadius: '6px', border: `2px solid ${formData.corrective_actions_needed === opt ? (opt === 'Yes' ? '#dc2626' : '#22c55e') : '#e2e8f0'}`, background: formData.corrective_actions_needed === opt ? (opt === 'Yes' ? '#fee2e2' : '#dcfce7') : 'white', color: formData.corrective_actions_needed === opt ? (opt === 'Yes' ? '#991b1b' : '#15803d') : '#94a3b8', fontSize: '14px', fontWeight: formData.corrective_actions_needed === opt ? '600' : '400', cursor: 'pointer' }}>
                {opt}
              </button>
            ))}
          </div>
        </div>
        {formData.corrective_actions_needed === 'Yes' && (
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Describe corrective actions required, responsible party, and target completion date</label>
            <textarea style={{ ...styles.input, minHeight: '100px' }} value={formData.corrective_action_details} onChange={(e) => handleChange('corrective_action_details', e.target.value)} placeholder="Describe each deficiency found, the corrective action required, who is responsible, and the target date for completion..." />
          </div>
        )}

        {/* Inspector Comments */}
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Inspector Comments / Additional Observations</label>
          <textarea style={{ ...styles.input, minHeight: '80px' }} value={formData.inspector_comments} onChange={(e) => handleChange('inspector_comments', e.target.value)} placeholder="Additional notes, observations, or recommendations..." />
        </div>

        {/* Photo Upload */}
        <div style={{ ...styles.sectionHeader, background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)' }}>Photo Documentation</div>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Attach Photos (deficiencies, conditions, repairs)</label>
          <input type="file" accept="image/*" multiple onChange={handlePhotoChange} style={styles.input} />
          {photoFiles.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              {photoFiles.map((file, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', background: '#f1f5f9', borderRadius: '6px', marginBottom: '4px', fontSize: '13px' }}>
                  <span>📷 {file.name}</span>
                  <button type="button" onClick={() => removePhoto(i)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '16px' }}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Result Summary */}
        <div style={{ background: result.color === '#22c55e' ? '#f0fdf4' : result.color === '#dc2626' ? '#fef2f2' : '#fffbeb', border: `2px solid ${result.color}`, borderRadius: '12px', padding: '20px', margin: '24px 0', textAlign: 'center' }}>
          <div style={{ fontSize: '28px', fontWeight: '700', color: result.color }}>{result.status}</div>
          <div style={{ fontSize: '14px', color: '#64748b', marginTop: '8px' }}>
            {result.answered} of {result.totalItems} items inspected | {result.deficiencies} deficienc{result.deficiencies === 1 ? 'y' : 'ies'} found
          </div>
        </div>

        {/* Submit */}
        <button onClick={handleSubmit} disabled={submitting} style={{ ...styles.submitBtn, opacity: submitting ? 0.6 : 1 }}>
          {submitting ? 'Submitting...' : 'Submit Inspection'}
        </button>
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <div>AnthroSafe™ Field Driven Safety</div>
        <div>© 2026 SLP Alaska, LLC</div>
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', background: 'linear-gradient(135deg, #1e3a8a 0%, #475569 100%)', padding: '0 0 40px 0' },
  backBtn: { display: 'inline-block', padding: '10px 16px', color: 'white', textDecoration: 'none', fontSize: '14px', opacity: 0.9 },
  header: { textAlign: 'center', padding: '20px 20px 24px', color: 'white' },
  logoContainer: { width: '80px', height: '80px', background: 'white', borderRadius: '16px', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' },
  logo: { maxWidth: '60px', maxHeight: '60px' },
  badge: { display: 'inline-block', padding: '6px 16px', background: 'rgba(255,255,255,0.2)', borderRadius: '20px', fontSize: '13px', fontWeight: '600', letterSpacing: '1px' },
  card: { maxWidth: '800px', margin: '0 auto', background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' },
  sectionHeader: { background: 'linear-gradient(135deg, #991b1b 0%, #b91c1c 100%)', color: 'white', padding: '12px 16px', borderRadius: '8px', fontSize: '15px', fontWeight: '600', marginTop: '24px', marginBottom: '16px' },
  fieldGroup: { marginBottom: '16px' },
  label: { display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' },
  input: { width: '100%', padding: '10px 12px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', outline: 'none' },
  row: { display: 'flex', gap: '12px', marginBottom: '16px' },
  halfField: { flex: 1 },
  submitBtn: { width: '100%', padding: '16px', background: 'linear-gradient(135deg, #991b1b 0%, #c41e3a 100%)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', letterSpacing: '0.5px' },
  successScreen: { maxWidth: '500px', margin: '80px auto', background: 'white', borderRadius: '16px', padding: '40px', textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' },
  footer: { textAlign: 'center', padding: '20px', color: 'rgba(255,255,255,0.7)', fontSize: '12px' },
};

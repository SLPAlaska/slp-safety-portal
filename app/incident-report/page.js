'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://iypezirwdlqpptjpeeyf.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
);

// ============================================================================
// CONSTANTS & REFERENCE DATA
// ============================================================================

const COMPANIES = [
  'A-C Electric', 'AKE-Line', 'Apache Corp.', 'Armstrong Oil & Gas', 'ASRC Energy Services',
  'CCI-Industrial', 'Chosen Construction', 'CINGSA', 'Coho Enterprises', 'Conam Construction',
  'ConocoPhillips', 'Five Star Oilfield Services', 'Fox Energy Services', 'G.A. West',
  'GBR Equipment', 'GLM Energy Services', 'Graham Industrial Coatings', 'Harvest Midstream',
  'Hilcorp Alaska', 'MagTec Alaska', 'Merkes Builders', 'Nordic-Calista', 'Parker TRS',
  'Peninsula Paving', 'Pollard Wireline', 'Ridgeline Oilfield Services', 'Santos',
  'Summit Excavation', 'Tesoro Refinery', 'Yellowjacket', 'Other'
];

const LOCATIONS = [
  'Kenai', 'CIO', 'Beaver Creek', 'Swanson River', 'Ninilchik', 'Nikiski', 'Other Kenai Asset',
  'Deadhorse', 'Prudhoe Bay', 'Kuparuk', 'Alpine', 'Willow', 'ENI', 'PIKKA',
  'Point Thompson', 'North Star Island', 'Endicott', 'Badami', 'Other North Slope',
  'Anchorage Office', 'Other'
];

const INCIDENT_TYPES = [
  { value: 'Injury-Classification Pending', label: 'Injury - Classification Pending', category: 'injury' },
  { value: 'Illness-Classification Pending', label: 'Illness - Classification Pending', category: 'injury' },
  { value: 'Near Miss', label: 'Near Miss / Close Call', category: 'safety' },
  { value: 'First Aid', label: 'First Aid Only', category: 'injury' },
  { value: 'Property Damage', label: 'Property / Equipment Damage', category: 'property' },
  { value: 'Vehicle Incident', label: 'Vehicle Incident', category: 'vehicle' },
  { value: 'Spill', label: 'Spill / Release', category: 'environmental' },
  { value: 'Environmental Impact', label: 'Environmental Impact', category: 'environmental' },
  { value: 'Fire', label: 'Fire', category: 'pse' },
  { value: 'Explosion', label: 'Explosion', category: 'pse' },
  { value: 'Process Safety Event', label: 'Process Safety Event (LOPC)', category: 'pse' },
  { value: 'Security Incident', label: 'Security Incident', category: 'security' },
  { value: 'Other', label: 'Other', category: 'other' }
];

const SAFETY_SEVERITY_OPTIONS = [
  { value: 'A', label: 'A - Fatality', description: 'Fatality or potential for >25 fatalities', color: '#7F1D1D' },
  { value: 'B', label: 'B - Permanent Total Disability', description: 'Permanent total disability or potential for 10-25 fatalities', color: '#991B1B' },
  { value: 'C', label: 'C - Serious Injury', description: 'Serious injury (hospitalization) or potential for 3-9 fatalities', color: '#B91C1C' },
  { value: 'D', label: 'D - Lost Time Injury', description: 'Lost workday case or potential for 1-2 fatalities', color: '#DC2626' },
  { value: 'E', label: 'E - Medical Treatment', description: 'Medical treatment or permanent partial disability potential', color: '#F97316' },
  { value: 'F', label: 'F - First Aid / Minor', description: 'First aid or single/multiple recordable potential', color: '#EAB308' },
  { value: 'G', label: 'G - Near Miss / No Injury', description: 'Near miss or first aid/exposure potential', color: '#22C55E' }
];

const ENVIRONMENTAL_SEVERITY_OPTIONS = [
  { value: '1', label: 'Level 1 - Catastrophic', description: '>1000 bbl to HCA Water or >10,000 bbl to Non-HCA Ground', color: '#7F1D1D' },
  { value: '2', label: 'Level 2 - Major', description: '100-1000 bbl to HCA Water or 5000-10000 bbl to Non-HCA Ground', color: '#DC2626' },
  { value: '3', label: 'Level 3 - Moderate', description: '10-100 bbl to HCA Water or 1000-5000 bbl to Non-HCA Ground', color: '#F97316' },
  { value: '4', label: 'Level 4 - Minor', description: '1-10 bbl to HCA Water or 100-1000 bbl to Non-HCA Ground', color: '#EAB308' },
  { value: '5', label: 'Level 5 - Negligible', description: '<1 bbl to HCA Water or ≤10 bbl to Pad/Disturbed Ground', color: '#22C55E' }
];

const ENERGY_TYPES = [
  { value: 'Gravity', label: 'Gravity', description: 'Falls, drops, collapse, falling objects' },
  { value: 'Motion', label: 'Motion', description: 'Vehicles, moving equipment, struck-by' },
  { value: 'Mechanical', label: 'Mechanical', description: 'Rotating equipment, pinch points, crushing' },
  { value: 'Electrical', label: 'Electrical', description: 'Shock, arc flash, electrocution' },
  { value: 'Pressure', label: 'Pressure', description: 'Hydraulic, pneumatic, compressed gas, LOPC' },
  { value: 'Chemical', label: 'Chemical', description: 'Toxic, corrosive, flammable, H2S' },
  { value: 'Temperature', label: 'Temperature', description: 'Burns, cold stress, cryogenic' },
  { value: 'Radiation', label: 'Radiation', description: 'Ionizing, non-ionizing radiation' },
  { value: 'Other', label: 'Other', description: 'Other high-energy source' }
];

const DIRECT_CONTROL_OPTIONS = [
  { value: 'Yes-Effective', label: 'Yes - Effective direct controls in place', description: 'Engineering controls, guarding, isolation, LOTO functioning as designed' },
  { value: 'Yes-Failed', label: 'Yes - But controls FAILED', description: 'Direct controls were in place but did not function as intended' },
  { value: 'No-Alternative', label: 'No - Only alternative controls', description: 'Relying on PPE, procedures, warnings, training only' },
  { value: 'No-None', label: 'No - NO controls in place', description: 'No controls of any kind were present' }
];

const RELEASE_LOCATION_TYPES = [
  { value: 'HCA Water', label: 'HCA Water (High Consequence Area)' },
  { value: 'Non-HCA Water', label: 'Non-HCA Water' },
  { value: 'HCA Ground', label: 'HCA Ground' },
  { value: 'Non-HCA Ground', label: 'Non-HCA Ground' },
  { value: 'Pad/Disturbed Ground', label: 'Pad / Already Disturbed Ground' },
  { value: 'Secondary Containment', label: 'Within Secondary Containment' },
  { value: 'Unknown', label: 'Unknown' }
];

const BODY_PARTS = [
  'Head', 'Face', 'Eyes', 'Ears', 'Neck', 'Shoulder (L)', 'Shoulder (R)', 
  'Upper Arm (L)', 'Upper Arm (R)', 'Elbow (L)', 'Elbow (R)',
  'Forearm (L)', 'Forearm (R)', 'Wrist (L)', 'Wrist (R)', 
  'Hand (L)', 'Hand (R)', 'Finger(s) (L)', 'Finger(s) (R)',
  'Chest', 'Upper Back', 'Lower Back', 'Abdomen', 'Hip (L)', 'Hip (R)',
  'Thigh (L)', 'Thigh (R)', 'Knee (L)', 'Knee (R)',
  'Lower Leg (L)', 'Lower Leg (R)', 'Ankle (L)', 'Ankle (R)',
  'Foot (L)', 'Foot (R)', 'Toe(s) (L)', 'Toe(s) (R)', 'Multiple', 'Internal'
];

// ============================================================================
// CLASSIFICATION FUNCTIONS
// ============================================================================

function calculatePSIFClassification(highEnergy, energyRelease, directControl, safetySeverity) {
  // SIF-Actual: Actual serious injury/fatality (Severity A or B)
  if (safetySeverity === 'A' || safetySeverity === 'B') {
    return 'SIF-Actual';
  }

  // If no high energy present, it's Non-STKY
  if (!highEnergy || highEnergy === 'No') {
    return 'Non-STKY';
  }

  // High energy present - evaluate controls
  if (energyRelease === 'Yes') {
    // Energy was released
    if (directControl === 'Yes-Failed' || directControl === 'No-None') {
      return 'PSIF-Critical';
    } else if (directControl === 'No-Alternative') {
      return 'PSIF-High';
    } else if (directControl === 'Yes-Effective') {
      return 'PSIF-Elevated';
    }
    return 'PSIF-High';
  } else {
    // High energy present but no release
    if (directControl === 'Yes-Effective') {
      return 'STKY-Controlled';
    } else if (directControl === 'Yes-Failed' || directControl === 'No-Alternative' || directControl === 'No-None') {
      return 'PSIF-Elevated';
    }
    return 'STKY-Controlled';
  }
}

function determineInvestigationType(safetySeverity, envSeverity, psTier, isSIF, isSIFP, psifClass) {
  // SIF Events always get RCA
  if (isSIF) return { type: 'Root Cause Analysis', days: 42 };

  // Tier 1 or Tier 2 PSE always get RCA
  if (psTier === 'Tier 1' || psTier === 'Tier 2') return { type: 'Root Cause Analysis', days: 42 };

  // Severity A, B, C get RCA
  if (['A', 'B', 'C'].includes(safetySeverity)) return { type: 'Root Cause Analysis', days: 42 };

  // Environmental Risk Level 1-2 get RCA
  if (['1', '2'].includes(envSeverity)) return { type: 'Root Cause Analysis', days: 42 };

  // SIF-P, PSIF-Critical, PSIF-High
  if (isSIFP || psifClass === 'PSIF-Critical' || psifClass === 'PSIF-High') {
    if (['A', 'B', 'C'].includes(safetySeverity)) return { type: 'Root Cause Analysis', days: 42 };
    return { type: '5-Why Analysis', days: 30 };
  }

  // Tier 3 HiPo gets 5-Why
  if (psTier === 'Tier 3 HiPo') return { type: '5-Why Analysis', days: 30 };

  // Severity D or E get 5-Why
  if (['D', 'E'].includes(safetySeverity)) return { type: '5-Why Analysis', days: 30 };

  // Environmental Risk Level 3 gets 5-Why
  if (envSeverity === '3') return { type: '5-Why Analysis', days: 30 };

  // Default to Local Review
  return { type: 'Local Review', days: 14 };
}

function calculateDeadlineDate(incidentDate, days) {
  const date = new Date(incidentDate);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

// ============================================================================
// STYLES
// ============================================================================

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)',
    padding: '20px'
  },
  formWrapper: {
    maxWidth: '900px',
    margin: '0 auto'
  },
  header: {
    background: 'linear-gradient(135deg, #991b1b 0%, #c41e3a 100%)',
    borderRadius: '16px 16px 0 0',
    padding: '25px 30px',
    color: 'white',
    textAlign: 'center',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
  },
  headerTitle: {
    fontSize: '28px',
    fontWeight: '700',
    marginBottom: '5px',
    textShadow: '0 2px 4px rgba(0,0,0,0.2)'
  },
  headerSubtitle: {
    fontSize: '14px',
    opacity: '0.9'
  },
  card: {
    background: '#ffffff',
    borderRadius: '0 0 16px 16px',
    padding: '30px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
  },
  sectionHeader: {
    background: '#1e3a8a',
    color: 'white',
    padding: '12px 20px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    marginTop: '25px',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  formGroup: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: '600',
    color: '#1e293b',
    fontSize: '14px'
  },
  required: {
    color: '#dc2626',
    marginLeft: '2px'
  },
  input: {
    width: '100%',
    padding: '12px 15px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '15px',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box'
  },
  select: {
    width: '100%',
    padding: '12px 15px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '15px',
    backgroundColor: '#fff',
    cursor: 'pointer'
  },
  textarea: {
    width: '100%',
    padding: '12px 15px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '15px',
    minHeight: '100px',
    resize: 'vertical',
    fontFamily: 'inherit',
    boxSizing: 'border-box'
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px'
  },
  row3: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '20px'
  },
  checkboxGroup: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '10px'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 12px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s ease'
  },
  checkboxLabelSelected: {
    borderColor: '#dc2626',
    background: 'rgba(0, 40, 85, 0.05)'
  },
  radioGroup: {
    display: 'flex',
    gap: '15px',
    flexWrap: 'wrap'
  },
  radioOption: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 20px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s ease',
    flex: '1',
    minWidth: '120px',
    justifyContent: 'center'
  },
  severityCard: {
    padding: '15px',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginBottom: '10px'
  },
  infoBox: {
    background: '#f0f9ff',
    border: '1px solid #bae6fd',
    borderRadius: '8px',
    padding: '15px',
    marginBottom: '20px',
    fontSize: '14px',
    color: '#0369a1'
  },
  warningBox: {
    background: '#fef3c7',
    border: '1px solid #fcd34d',
    borderRadius: '8px',
    padding: '15px',
    marginBottom: '20px',
    fontSize: '14px',
    color: '#92400e'
  },
  errorBox: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '15px',
    marginBottom: '20px',
    fontSize: '14px',
    color: '#991b1b'
  },
  successBox: {
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '8px',
    padding: '20px',
    textAlign: 'center'
  },
  submitBtn: {
    width: '100%',
    padding: '16px',
    background: 'linear-gradient(135deg, #991b1b 0%, #c41e3a 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '18px',
    fontWeight: '700',
    cursor: 'pointer',
    marginTop: '20px',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 15px rgba(153, 27, 27, 0.3)'
  },
  footer: {
    textAlign: 'center',
    padding: '20px',
    color: 'white',
    fontSize: '13px'
  },
  badge: {
    display: 'inline-block',
    padding: '6px 14px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '700',
    color: 'white'
  },
  classificationBox: {
    padding: '20px',
    borderRadius: '12px',
    marginTop: '20px',
    marginBottom: '20px',
    border: '3px solid'
  },
  photoUpload: {
    border: '2px dashed #cbd5e1',
    borderRadius: '12px',
    padding: '30px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    background: '#f8fafc'
  },
  photoPreview: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    marginTop: '15px'
  },
  photoThumb: {
    width: '80px',
    height: '80px',
    objectFit: 'cover',
    borderRadius: '8px',
    border: '2px solid #e2e8f0'
  }
};

// ============================================================================
// PSIF CLASSIFICATION DISPLAY
// ============================================================================

const PSIF_DISPLAY = {
  'SIF-Actual': {
    bg: '#1f2937',
    border: '#000000',
    badgeBg: '#000000',
    text: 'ACTUAL SERIOUS INJURY OR FATALITY',
    icon: '⚫'
  },
  'PSIF-Critical': {
    bg: '#fef2f2',
    border: '#dc2626',
    badgeBg: '#dc2626',
    text: 'CRITICAL: High energy with NO controls or controls FAILED',
    icon: '🔴'
  },
  'PSIF-High': {
    bg: '#fff7ed',
    border: '#ea580c',
    badgeBg: '#ea580c',
    text: 'HIGH: Energy released with only alternative controls (PPE/procedures)',
    icon: '🟠'
  },
  'PSIF-Elevated': {
    bg: '#fefce8',
    border: '#eab308',
    badgeBg: '#eab308',
    text: 'ELEVATED: High SIF potential - direct controls not in place or not effective',
    icon: '🟡'
  },
  'STKY-Controlled': {
    bg: '#f0fdf4',
    border: '#22c55e',
    badgeBg: '#22c55e',
    text: 'CONTROLLED: High energy present but effectively controlled',
    icon: '🟢'
  },
  'Non-STKY': {
    bg: '#eff6ff',
    border: '#3b82f6',
    badgeBg: '#3b82f6',
    text: 'LOW ENERGY: Not a SIF precursor event',
    icon: '🔵'
  }
};

const INVESTIGATION_TYPE_DISPLAY = {
  'Root Cause Analysis': { bg: '#7f1d1d', color: '#fff', icon: '🔬' },
  '5-Why Analysis': { bg: '#f97316', color: '#fff', icon: '❓' },
  'Local Review': { bg: '#22c55e', color: '#fff', icon: '📋' }
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function IncidentReportForm() {
  // Form State
  const [formData, setFormData] = useState({
    // Basic Info
    incident_date: new Date().toISOString().split('T')[0],
    incident_time: '',
    location_name: '',
    company_name: '',
    reported_by_name: '',
    reported_by_email: '',
    reported_by_phone: '',
    
    // Description
    brief_description: '',
    detailed_description: '',
    
    // Classification
    incident_types: [],
    
    // Injury Details
    injury_occurred: '',
    injured_person_name: '',
    injured_person_company: '',
    injured_body_parts: [],
    injury_nature: '',
    treatment_provided: '',
    
    // Safety Severity
    safety_severity: '',
    potential_safety_severity: '',
    
    // STKY/PSIF Assessment
    high_energy_present: '',
    energy_types: [],
    energy_release_occurred: '',
    direct_control_status: '',
    decs_present: '',
    
    // Environmental
    environmental_release: '',
    release_material: '',
    release_volume: '',
    release_volume_unit: 'bbl',
    release_location_type: '',
    environmental_severity: '',
    spill_contained: '',
    containment_method: '',
    
    // Property Damage
    property_damage: '',
    property_damage_description: '',
    property_damage_cost: '',
    
    // Vehicle
    vehicle_type: '',
    vehicle_id: '',
    vehicle_damage_description: '',
    other_vehicle_involved: '',
    
    // Process Safety
    is_pse: '',
    pse_type: '',
    ps_tier: 'None',
    
    // Initial Investigation
    witness_statement_summary: '',
    immediate_actions_taken: '',
    suspected_root_causes: '',
    lessons_learned_initial: ''
  });

  // Calculated fields
  const [psifClassification, setPsifClassification] = useState('');
  const [investigationType, setInvestigationType] = useState({ type: '', days: 0 });
  const [isSIF, setIsSIF] = useState(false);
  const [isSIFP, setIsSIFP] = useState(false);

  // UI State
  const [photos, setPhotos] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdIncidentId, setCreatedIncidentId] = useState('');

  // ============================================================================
  // EFFECTS - Auto-calculate classifications
  // ============================================================================

  useEffect(() => {
    // Calculate PSIF Classification
    const psif = calculatePSIFClassification(
      formData.high_energy_present,
      formData.energy_release_occurred,
      formData.direct_control_status,
      formData.safety_severity
    );
    setPsifClassification(psif);

    // Determine SIF and SIF-P flags
    const sif = ['A', 'B'].includes(formData.safety_severity) || 
                formData.incident_types.includes('Fatality') ||
                formData.incident_types.includes('Life Altering Injury');
    setIsSIF(sif);

    const sifp = !sif && (['C', 'D'].includes(formData.safety_severity) || 
                 psif === 'PSIF-Critical' || psif === 'PSIF-High');
    setIsSIFP(sifp);

    // Determine Investigation Type
    const invType = determineInvestigationType(
      formData.safety_severity,
      formData.environmental_severity,
      formData.ps_tier,
      sif,
      sifp,
      psif
    );
    setInvestigationType(invType);

  }, [
    formData.high_energy_present,
    formData.energy_release_occurred,
    formData.direct_control_status,
    formData.safety_severity,
    formData.environmental_severity,
    formData.ps_tier,
    formData.incident_types
  ]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleIncidentTypeChange = (value) => {
    setFormData(prev => {
      const current = prev.incident_types;
      if (current.includes(value)) {
        return { ...prev, incident_types: current.filter(v => v !== value) };
      } else {
        return { ...prev, incident_types: [...current, value] };
      }
    });
  };

  const handleEnergyTypeChange = (value) => {
    setFormData(prev => {
      const current = prev.energy_types;
      if (current.includes(value)) {
        return { ...prev, energy_types: current.filter(v => v !== value) };
      } else {
        return { ...prev, energy_types: [...current, value] };
      }
    });
  };

  const handleBodyPartChange = (value) => {
    setFormData(prev => {
      const current = prev.injured_body_parts;
      if (current.includes(value)) {
        return { ...prev, injured_body_parts: current.filter(v => v !== value) };
      } else {
        return { ...prev, injured_body_parts: [...current, value] };
      }
    });
  };

  const handlePhotoChange = (e) => {
    const files = Array.from(e.target.files);
    setPhotos(prev => [...prev, ...files]);
  };

  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // ============================================================================
  // SUBMIT
  // ============================================================================

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      // Calculate deadline
      const deadlineDate = calculateDeadlineDate(formData.incident_date, investigationType.days);

      // Prepare data for Supabase
      const incidentData = {
        incident_date: formData.incident_date,
        incident_time: formData.incident_time || null,
        location_name: formData.location_name,
        company_name: formData.company_name,
        reported_by_name: formData.reported_by_name,
        reported_by_email: formData.reported_by_email,
        reported_by_phone: formData.reported_by_phone || null,
        brief_description: formData.brief_description,
        detailed_description: formData.detailed_description || null,
        incident_types: formData.incident_types,
        incident_types_text: formData.incident_types.join(', '),
        injury_occurred: formData.injury_occurred === 'Yes',
        injured_person_name: formData.injured_person_name || null,
        injured_person_company: formData.injured_person_company || null,
        injured_body_parts: formData.injured_body_parts.length > 0 ? formData.injured_body_parts : null,
        injury_nature: formData.injury_nature || null,
        treatment_provided: formData.treatment_provided || null,
        safety_severity: formData.safety_severity || null,
        safety_severity_description: SAFETY_SEVERITY_OPTIONS.find(s => s.value === formData.safety_severity)?.description || null,
        potential_safety_severity: formData.potential_safety_severity || null,
        is_sif: isSIF,
        is_sif_p: isSIFP,
        high_energy_present: formData.high_energy_present === 'Yes',
        energy_types: formData.energy_types.length > 0 ? formData.energy_types : null,
        energy_types_text: formData.energy_types.join(', ') || null,
        energy_release_occurred: formData.energy_release_occurred === 'Yes',
        direct_control_status: formData.direct_control_status || null,
        psif_classification: psifClassification || null,
        stky_event: formData.high_energy_present === 'Yes',
        decs_present: formData.decs_present || null,
        environmental_release: formData.environmental_release === 'Yes',
        release_material: formData.release_material || null,
        release_volume: formData.release_volume ? parseFloat(formData.release_volume) : null,
        release_volume_unit: formData.release_volume_unit || 'bbl',
        release_location_type: formData.release_location_type || null,
        environmental_severity: formData.environmental_severity || null,
        spill_contained: formData.spill_contained === 'Yes',
        containment_method: formData.containment_method || null,
        property_damage: formData.property_damage === 'Yes',
        property_damage_description: formData.property_damage_description || null,
        property_damage_cost: formData.property_damage_cost ? parseFloat(formData.property_damage_cost) : null,
        vehicle_incident: formData.incident_types.includes('Vehicle Incident'),
        vehicle_type: formData.vehicle_type || null,
        vehicle_id: formData.vehicle_id || null,
        vehicle_damage_description: formData.vehicle_damage_description || null,
        other_vehicle_involved: formData.other_vehicle_involved === 'Yes',
        is_pse: formData.is_pse === 'Yes',
        pse_type: formData.pse_type || null,
        ps_tier: formData.ps_tier || 'None',
        investigation_type: investigationType.type,
        investigation_deadline: deadlineDate,
        investigation_deadline_reason: `${investigationType.days} days from incident date per SLP Investigation Standards`,
        scene_preservation_level: isSIF || formData.safety_severity === 'A' ? 'Full Preservation - Do Not Disturb' :
                                  (isSIFP || ['B', 'C'].includes(formData.safety_severity)) ? 'Photographs and Documentation' : 'Standard',
        witness_statement_summary: formData.witness_statement_summary || null,
        immediate_actions_taken: formData.immediate_actions_taken || null,
        suspected_root_causes: formData.suspected_root_causes || null,
        lessons_learned_initial: formData.lessons_learned_initial || null,
        status: 'Submitted',
        created_by_email: formData.reported_by_email
      };

      // Insert into Supabase
      const { data, error } = await supabase
        .from('incidents')
        .insert([incidentData])
        .select()
        .single();

      if (error) throw error;

      // Upload photos if any
      if (photos.length > 0 && data) {
        for (let i = 0; i < photos.length; i++) {
          const photo = photos[i];
          const fileExt = photo.name.split('.').pop();
          const fileName = `${data.incident_id}_${i + 1}.${fileExt}`;
          const filePath = `incidents/${data.id}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('evidence')
            .upload(filePath, photo);

          if (!uploadError) {
            // Get public URL
            const { data: urlData } = supabase.storage
              .from('evidence')
              .getPublicUrl(filePath);

            // Insert evidence record
            await supabase
              .from('investigation_evidence')
              .insert({
                incident_id: data.id,
                evidence_number: i + 1,
                evidence_type: 'Photo',
                evidence_category: 'Incident Scene',
                file_name: fileName,
                file_url: urlData.publicUrl,
                description: `Photo ${i + 1} from initial report`,
                uploaded_by_email: formData.reported_by_email
              });
          }
        }

        // Update evidence count
        await supabase
          .from('incidents')
          .update({ evidence_count: photos.length })
          .eq('id', data.id);
      }

      // Log activity
      await supabase
        .from('investigation_activity_log')
        .insert({
          incident_id: data.id,
          incident_id_text: data.incident_id,
          action: 'Incident reported',
          action_category: 'create',
          user_email: formData.reported_by_email,
          details: {
            investigation_type: investigationType.type,
            psif_classification: psifClassification,
            safety_severity: formData.safety_severity
          }
        });

      setCreatedIncidentId(data.incident_id);
      setShowSuccess(true);
      setSubmitStatus('success');

    } catch (error) {
      console.error('Error submitting incident:', error);
      setSubmitStatus(`error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================================================
  // CONDITIONAL RENDERS
  // ============================================================================

  const showInjurySection = formData.incident_types.some(t => 
    ['Injury-Classification Pending', 'Illness-Classification Pending', 'First Aid'].includes(t)
  ) || formData.injury_occurred === 'Yes';

  const showEnvironmentalSection = formData.incident_types.some(t => 
    ['Spill', 'Environmental Impact'].includes(t)
  ) || formData.environmental_release === 'Yes';

  const showVehicleSection = formData.incident_types.includes('Vehicle Incident');

  const showPropertySection = formData.incident_types.includes('Property Damage') || formData.property_damage === 'Yes';

  const showPSESection = formData.incident_types.some(t => 
    ['Fire', 'Explosion', 'Process Safety Event'].includes(t)
  ) || formData.is_pse === 'Yes';

  // ============================================================================
  // RENDER SUCCESS
  // ============================================================================

  if (showSuccess) {
    const invDisplay = INVESTIGATION_TYPE_DISPLAY[investigationType.type] || {};
    const psifDisplay = PSIF_DISPLAY[psifClassification] || {};

    return (
      <div style={styles.container}>
        <div style={styles.formWrapper}>
          <a href="/" style={{ display: 'inline-block', marginBottom: '15px', padding: '10px 20px', backgroundColor: '#1e3a5f', color: '#fff', textDecoration: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '500' }}>← Back to Portal</a>
          
          <div style={styles.header}>
            <img src="/Logo.png" alt="SLP Alaska" style={{ maxWidth: '180px', margin: '0 auto 15px auto', display: 'block' }} />
            <div style={styles.headerTitle}>✅ Incident Reported Successfully</div>
          </div>
          <div style={styles.card}>
            <div style={styles.successBox}>
              <div style={{ fontSize: '60px', marginBottom: '20px' }}>✅</div>
              <h2 style={{ color: '#166534', marginBottom: '10px' }}>Incident Report Submitted</h2>
              <p style={{ fontSize: '24px', fontWeight: '700', color: '#991b1b', marginBottom: '20px' }}>
                {createdIncidentId}
              </p>
              </p>
              
              <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', flexWrap: 'wrap', marginBottom: '25px' }}>
                <span style={{ ...styles.badge, background: invDisplay.bg }}>
                  {invDisplay.icon} {investigationType.type}
                </span>
                <span style={{ ...styles.badge, background: psifDisplay.badgeBg }}>
                  {psifDisplay.icon} {psifClassification}
                </span>
              </div>

              <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '25px' }}>
                <p style={{ marginBottom: '10px' }}>
                  <strong>Investigation Deadline:</strong>{' '}
                  {calculateDeadlineDate(formData.incident_date, investigationType.days)}
                </p>
                <p style={{ marginBottom: '10px' }}>
                  <strong>Scene Preservation:</strong>{' '}
                  {isSIF ? 'Full Preservation - Do Not Disturb' : 
                   isSIFP ? 'Photographs and Documentation' : 'Standard'}
                </p>
                {isSIF && (
                  <p style={{ color: '#dc2626', fontWeight: '700', marginTop: '15px' }}>
                    ⚠️ SIF EVENT - Preserve scene and notify management immediately
                  </p>
                )}
              </div>

              <button 
                onClick={() => {
                  setShowSuccess(false);
                  setFormData({
                    incident_date: new Date().toISOString().split('T')[0],
                    incident_time: '',
                    location_name: '',
                    company_name: '',
                    reported_by_name: '',
                    reported_by_email: '',
                    reported_by_phone: '',
                    brief_description: '',
                    detailed_description: '',
                    incident_types: [],
                    injury_occurred: '',
                    injured_person_name: '',
                    injured_person_company: '',
                    injured_body_parts: [],
                    injury_nature: '',
                    treatment_provided: '',
                    safety_severity: '',
                    potential_safety_severity: '',
                    high_energy_present: '',
                    energy_types: [],
                    energy_release_occurred: '',
                    direct_control_status: '',
                    decs_present: '',
                    environmental_release: '',
                    release_material: '',
                    release_volume: '',
                    release_volume_unit: 'bbl',
                    release_location_type: '',
                    environmental_severity: '',
                    spill_contained: '',
                    containment_method: '',
                    property_damage: '',
                    property_damage_description: '',
                    property_damage_cost: '',
                    vehicle_type: '',
                    vehicle_id: '',
                    vehicle_damage_description: '',
                    other_vehicle_involved: '',
                    is_pse: '',
                    pse_type: '',
                    ps_tier: 'None',
                    witness_statement_summary: '',
                    immediate_actions_taken: '',
                    suspected_root_causes: '',
                    lessons_learned_initial: ''
                  });
                  setPhotos([]);
                }}
                style={styles.submitBtn}
              >
                Report Another Incident
              </button>
            </div>
          </div>
          <div style={styles.footer}>
            <span style={{ fontWeight: '500' }}>Powered by Predictive Safety Analytics™</span>
            <span style={{ margin: '0 8px' }}>|</span>
            <span>© 2025 SLP Alaska</span>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER FORM
  // ============================================================================

  const psifDisplay = PSIF_DISPLAY[psifClassification];
  const invDisplay = INVESTIGATION_TYPE_DISPLAY[investigationType.type];

  return (
    <div style={styles.container}>
      <div style={styles.formWrapper}>
        <a href="/" style={{ display: 'inline-block', marginBottom: '15px', padding: '10px 20px', backgroundColor: '#1e3a5f', color: '#fff', textDecoration: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '500' }}>← Back to Portal</a>
        
        {/* Header */}
        <div style={styles.header}>
          <img src="/Logo.png" alt="SLP Alaska" style={{ maxWidth: '180px', margin: '0 auto 15px auto', display: 'block' }} />
          <div style={styles.headerTitle}>🚨 Incident Report</div>
          <div style={styles.headerSubtitle}>SLP Alaska Incident Investigation System</div>
        </div>

        {/* Form Card */}
        <div style={styles.card}>
          <form onSubmit={handleSubmit}>
            
            {/* ============================================================ */}
            {/* SECTION 1: BASIC INFORMATION */}
            {/* ============================================================ */}
            <div style={styles.sectionHeader}>
              📋 Basic Information
            </div>

            <div style={styles.row}>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Incident Date <span style={styles.required}>*</span>
                </label>
                <input
                  type="date"
                  name="incident_date"
                  value={formData.incident_date}
                  onChange={handleChange}
                  required
                  style={styles.input}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Incident Time</label>
                <input
                  type="time"
                  name="incident_time"
                  value={formData.incident_time}
                  onChange={handleChange}
                  style={styles.input}
                />
              </div>
            </div>

            <div style={styles.row}>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Location <span style={styles.required}>*</span>
                </label>
                <select
                  name="location_name"
                  value={formData.location_name}
                  onChange={handleChange}
                  required
                  style={styles.select}
                >
                  <option value="">-- Select Location --</option>
                  {LOCATIONS.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Company <span style={styles.required}>*</span>
                </label>
                <select
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleChange}
                  required
                  style={styles.select}
                >
                  <option value="">-- Select Company --</option>
                  {COMPANIES.map(co => (
                    <option key={co} value={co}>{co}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ ...styles.sectionHeader, background: '#475569', marginTop: '10px' }}>
              👤 Reporter Information
            </div>

            <div style={styles.row3}>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Your Name <span style={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  name="reported_by_name"
                  value={formData.reported_by_name}
                  onChange={handleChange}
                  required
                  placeholder="First Last"
                  style={styles.input}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Email <span style={styles.required}>*</span>
                </label>
                <input
                  type="email"
                  name="reported_by_email"
                  value={formData.reported_by_email}
                  onChange={handleChange}
                  required
                  placeholder="email@company.com"
                  style={styles.input}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Phone</label>
                <input
                  type="tel"
                  name="reported_by_phone"
                  value={formData.reported_by_phone}
                  onChange={handleChange}
                  placeholder="(907) 555-1234"
                  style={styles.input}
                />
              </div>
            </div>

            {/* ============================================================ */}
            {/* SECTION 2: INCIDENT DESCRIPTION */}
            {/* ============================================================ */}
            <div style={styles.sectionHeader}>
              📝 Incident Description
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                Incident Type(s) <span style={styles.required}>*</span>
                <span style={{ fontWeight: 'normal', color: '#64748b', marginLeft: '8px' }}>
                  (Select all that apply)
                </span>
              </label>
              <div style={styles.checkboxGroup}>
                {INCIDENT_TYPES.map(type => (
                  <label
                    key={type.value}
                    style={{
                      ...styles.checkboxLabel,
                      ...(formData.incident_types.includes(type.value) ? styles.checkboxLabelSelected : {})
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={formData.incident_types.includes(type.value)}
                      onChange={() => handleIncidentTypeChange(type.value)}
                      style={{ width: '18px', height: '18px' }}
                    />
                    {type.label}
                  </label>
                ))}
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                Brief Description <span style={styles.required}>*</span>
              </label>
              <textarea
                name="brief_description"
                value={formData.brief_description}
                onChange={handleChange}
                required
                placeholder="Describe what happened in a few sentences..."
                style={styles.textarea}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Detailed Description</label>
              <textarea
                name="detailed_description"
                value={formData.detailed_description}
                onChange={handleChange}
                placeholder="Provide additional details about the sequence of events, conditions, and circumstances..."
                style={{ ...styles.textarea, minHeight: '150px' }}
              />
            </div>

            {/* ============================================================ */}
            {/* SECTION 3: SEVERITY ASSESSMENT */}
            {/* ============================================================ */}
            <div style={{ ...styles.sectionHeader, background: '#dc2626' }}>
              ⚠️ Severity Assessment
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                Was there an injury or illness? <span style={styles.required}>*</span>
              </label>
              <div style={styles.radioGroup}>
                {['Yes', 'No'].map(option => (
                  <label
                    key={option}
                    style={{
                      ...styles.radioOption,
                      borderColor: formData.injury_occurred === option ? '#dc2626' : '#e2e8f0',
                      background: formData.injury_occurred === option ? 'rgba(220, 38, 38, 0.05)' : '#fff'
                    }}
                  >
                    <input
                      type="radio"
                      name="injury_occurred"
                      value={option}
                      checked={formData.injury_occurred === option}
                      onChange={handleChange}
                      required
                      style={{ width: '18px', height: '18px' }}
                    />
                    {option}
                  </label>
                ))}
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                Safety Severity - ACTUAL Outcome <span style={styles.required}>*</span>
              </label>
              <div>
                {SAFETY_SEVERITY_OPTIONS.map(sev => (
                  <div
                    key={sev.value}
                    onClick={() => setFormData(prev => ({ ...prev, safety_severity: sev.value }))}
                    style={{
                      ...styles.severityCard,
                      borderColor: formData.safety_severity === sev.value ? sev.color : '#e2e8f0',
                      background: formData.safety_severity === sev.value ? `${sev.color}10` : '#fff',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '8px',
                        background: sev.color,
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '700',
                        fontSize: '18px'
                      }}>
                        {sev.value}
                      </div>
                      <div>
                        <div style={{ fontWeight: '600', color: '#1e293b' }}>{sev.label}</div>
                        <div style={{ fontSize: '13px', color: '#64748b' }}>{sev.description}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                Safety Severity - POTENTIAL Outcome (What could have happened?)
              </label>
              <select
                name="potential_safety_severity"
                value={formData.potential_safety_severity}
                onChange={handleChange}
                style={styles.select}
              >
                <option value="">-- Select Potential Severity --</option>
                {SAFETY_SEVERITY_OPTIONS.map(sev => (
                  <option key={sev.value} value={sev.value}>{sev.label}</option>
                ))}
              </select>
            </div>

            {/* ============================================================ */}
            {/* SECTION 4: STKY/PSIF ASSESSMENT */}
            {/* ============================================================ */}
            <div style={{ ...styles.sectionHeader, background: '#7c3aed' }}>
              ⚡ STKY / SIF Potential Assessment
            </div>

            <div style={styles.infoBox}>
              <strong>STKY = Stuff That Kills You</strong><br />
              This assessment identifies whether high-energy sources were present that could result in Serious Injury or Fatality (SIF).
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                Was HIGH ENERGY present? <span style={styles.required}>*</span>
              </label>
              <div style={styles.radioGroup}>
                {['Yes', 'No'].map(option => (
                  <label
                    key={option}
                    style={{
                      ...styles.radioOption,
                      borderColor: formData.high_energy_present === option ? '#7c3aed' : '#e2e8f0',
                      background: formData.high_energy_present === option ? 'rgba(124, 58, 237, 0.05)' : '#fff'
                    }}
                  >
                    <input
                      type="radio"
                      name="high_energy_present"
                      value={option}
                      checked={formData.high_energy_present === option}
                      onChange={handleChange}
                      required
                      style={{ width: '18px', height: '18px' }}
                    />
                    {option}
                  </label>
                ))}
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>
                High energy includes: gravity (falls, drops), motion (vehicles, equipment), electrical, pressure, chemical, temperature extremes
              </p>
            </div>

            {formData.high_energy_present === 'Yes' && (
              <>
                <div style={styles.formGroup}>
                  <label style={styles.label}>What type(s) of energy? (Select all that apply)</label>
                  <div style={styles.checkboxGroup}>
                    {ENERGY_TYPES.map(et => (
                      <label
                        key={et.value}
                        style={{
                          ...styles.checkboxLabel,
                          ...(formData.energy_types.includes(et.value) ? styles.checkboxLabelSelected : {})
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={formData.energy_types.includes(et.value)}
                          onChange={() => handleEnergyTypeChange(et.value)}
                          style={{ width: '18px', height: '18px' }}
                        />
                        <div>
                          <div style={{ fontWeight: '500' }}>{et.label}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{et.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Did an uncontrolled energy release occur?</label>
                  <div style={styles.radioGroup}>
                    {['Yes', 'No'].map(option => (
                      <label
                        key={option}
                        style={{
                          ...styles.radioOption,
                          borderColor: formData.energy_release_occurred === option ? '#7c3aed' : '#e2e8f0',
                          background: formData.energy_release_occurred === option ? 'rgba(124, 58, 237, 0.05)' : '#fff'
                        }}
                      >
                        <input
                          type="radio"
                          name="energy_release_occurred"
                          value={option}
                          checked={formData.energy_release_occurred === option}
                          onChange={handleChange}
                          style={{ width: '18px', height: '18px' }}
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Were DIRECT CONTROLS in place?</label>
                  <select
                    name="direct_control_status"
                    value={formData.direct_control_status}
                    onChange={handleChange}
                    style={styles.select}
                  >
                    <option value="">-- Select Control Status --</option>
                    {DIRECT_CONTROL_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <p style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>
                    Direct controls = Engineering controls, guarding, barriers, LOTO, interlocks
                  </p>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>What controls were present? (Describe)</label>
                  <textarea
                    name="decs_present"
                    value={formData.decs_present}
                    onChange={handleChange}
                    placeholder="List the specific controls that were in place (or note if none)..."
                    style={styles.textarea}
                  />
                </div>
              </>
            )}

            {/* PSIF Classification Display */}
            {psifDisplay && formData.high_energy_present && (
              <div style={{
                ...styles.classificationBox,
                background: psifDisplay.bg,
                borderColor: psifDisplay.border
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '28px' }}>{psifDisplay.icon}</span>
                  <span style={{
                    ...styles.badge,
                    background: psifDisplay.badgeBg,
                    fontSize: '16px',
                    padding: '8px 18px'
                  }}>
                    {psifClassification}
                  </span>
                </div>
                <p style={{ fontSize: '14px', color: '#374151', margin: 0 }}>
                  {psifDisplay.text}
                </p>
              </div>
            )}

            {/* Investigation Type Display */}
            {investigationType.type && invDisplay && (
              <div style={{
                background: '#f8fafc',
                border: '2px solid #e2e8f0',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '15px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '24px' }}>{invDisplay.icon}</span>
                    <div>
                      <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>
                        Required Investigation
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>
                        {investigationType.type}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Deadline</div>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: '#dc2626' }}>
                      {calculateDeadlineDate(formData.incident_date, investigationType.days)}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      ({investigationType.days} days)
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SIF Alert */}
            {isSIF && (
              <div style={{
                ...styles.errorBox,
                background: '#1f2937',
                border: '3px solid #000',
                color: '#fff'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '24px' }}>⚫</span>
                  <strong style={{ fontSize: '18px' }}>SIF EVENT - SERIOUS INJURY OR FATALITY</strong>
                </div>
                <ul style={{ margin: '10px 0 0 20px', padding: 0 }}>
                  <li>DO NOT disturb the scene</li>
                  <li>Notify management IMMEDIATELY</li>
                  <li>Root Cause Analysis required within 42 days</li>
                  <li>External investigator may be required</li>
                </ul>
              </div>
            )}

            {/* SIF-P Alert */}
            {!isSIF && isSIFP && (
              <div style={styles.warningBox}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '20px' }}>⚠️</span>
                  <strong>SIF POTENTIAL EVENT</strong>
                </div>
                <p style={{ margin: '10px 0 0 0' }}>
                  This incident had the potential for a serious injury or fatality. Preserve scene, document with photographs, and ensure thorough investigation.
                </p>
              </div>
            )}

            {/* ============================================================ */}
            {/* CONDITIONAL SECTION: INJURY DETAILS */}
            {/* ============================================================ */}
            {showInjurySection && (
              <>
                <div style={{ ...styles.sectionHeader, background: '#be123c' }}>
                  🩹 Injury / Illness Details
                </div>

                <div style={styles.row}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Injured Person's Name</label>
                    <input
                      type="text"
                      name="injured_person_name"
                      value={formData.injured_person_name}
                      onChange={handleChange}
                      placeholder="Name of injured person"
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Injured Person's Company</label>
                    <select
                      name="injured_person_company"
                      value={formData.injured_person_company}
                      onChange={handleChange}
                      style={styles.select}
                    >
                      <option value="">-- Select Company --</option>
                      {COMPANIES.map(co => (
                        <option key={co} value={co}>{co}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Body Part(s) Affected (Select all that apply)</label>
                  <div style={{ ...styles.checkboxGroup, gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
                    {BODY_PARTS.map(part => (
                      <label
                        key={part}
                        style={{
                          ...styles.checkboxLabel,
                          padding: '8px 10px',
                          fontSize: '13px',
                          ...(formData.injured_body_parts.includes(part) ? styles.checkboxLabelSelected : {})
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={formData.injured_body_parts.includes(part)}
                          onChange={() => handleBodyPartChange(part)}
                          style={{ width: '16px', height: '16px' }}
                        />
                        {part}
                      </label>
                    ))}
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Nature of Injury / Illness</label>
                  <textarea
                    name="injury_nature"
                    value={formData.injury_nature}
                    onChange={handleChange}
                    placeholder="Describe the type of injury (laceration, strain, burn, etc.)..."
                    style={styles.textarea}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Treatment Provided</label>
                  <textarea
                    name="treatment_provided"
                    value={formData.treatment_provided}
                    onChange={handleChange}
                    placeholder="Describe first aid or medical treatment provided..."
                    style={styles.textarea}
                  />
                </div>
              </>
            )}

            {/* ============================================================ */}
            {/* CONDITIONAL SECTION: ENVIRONMENTAL */}
            {/* ============================================================ */}
            {showEnvironmentalSection && (
              <>
                <div style={{ ...styles.sectionHeader, background: '#0369a1' }}>
                  🌊 Environmental Release Details
                </div>

                <div style={styles.row}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Was there an environmental release?</label>
                    <div style={styles.radioGroup}>
                      {['Yes', 'No'].map(option => (
                        <label
                          key={option}
                          style={{
                            ...styles.radioOption,
                            borderColor: formData.environmental_release === option ? '#0369a1' : '#e2e8f0',
                            background: formData.environmental_release === option ? 'rgba(3, 105, 161, 0.05)' : '#fff'
                          }}
                        >
                          <input
                            type="radio"
                            name="environmental_release"
                            value={option}
                            checked={formData.environmental_release === option}
                            onChange={handleChange}
                            style={{ width: '18px', height: '18px' }}
                          />
                          {option}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Material Released</label>
                    <input
                      type="text"
                      name="release_material"
                      value={formData.release_material}
                      onChange={handleChange}
                      placeholder="Crude oil, produced water, glycol, etc."
                      style={styles.input}
                    />
                  </div>
                </div>

                <div style={styles.row3}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Volume Released</label>
                    <input
                      type="number"
                      name="release_volume"
                      value={formData.release_volume}
                      onChange={handleChange}
                      placeholder="0"
                      step="0.01"
                      min="0"
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Unit</label>
                    <select
                      name="release_volume_unit"
                      value={formData.release_volume_unit}
                      onChange={handleChange}
                      style={styles.select}
                    >
                      <option value="bbl">Barrels (bbl)</option>
                      <option value="gal">Gallons (gal)</option>
                      <option value="lbs">Pounds (lbs)</option>
                      <option value="scf">Standard Cubic Feet (scf)</option>
                    </select>
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Release Location Type</label>
                    <select
                      name="release_location_type"
                      value={formData.release_location_type}
                      onChange={handleChange}
                      style={styles.select}
                    >
                      <option value="">-- Select --</option>
                      {RELEASE_LOCATION_TYPES.map(loc => (
                        <option key={loc.value} value={loc.value}>{loc.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Environmental Severity</label>
                  <div>
                    {ENVIRONMENTAL_SEVERITY_OPTIONS.map(sev => (
                      <div
                        key={sev.value}
                        onClick={() => setFormData(prev => ({ ...prev, environmental_severity: sev.value }))}
                        style={{
                          ...styles.severityCard,
                          borderColor: formData.environmental_severity === sev.value ? sev.color : '#e2e8f0',
                          background: formData.environmental_severity === sev.value ? `${sev.color}10` : '#fff'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '8px',
                            background: sev.color,
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '700',
                            fontSize: '18px'
                          }}>
                            {sev.value}
                          </div>
                          <div>
                            <div style={{ fontWeight: '600', color: '#1e293b' }}>{sev.label}</div>
                            <div style={{ fontSize: '13px', color: '#64748b' }}>{sev.description}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={styles.row}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Was the spill contained?</label>
                    <div style={styles.radioGroup}>
                      {['Yes', 'No'].map(option => (
                        <label
                          key={option}
                          style={{
                            ...styles.radioOption,
                            borderColor: formData.spill_contained === option ? '#0369a1' : '#e2e8f0',
                            background: formData.spill_contained === option ? 'rgba(3, 105, 161, 0.05)' : '#fff'
                          }}
                        >
                          <input
                            type="radio"
                            name="spill_contained"
                            value={option}
                            checked={formData.spill_contained === option}
                            onChange={handleChange}
                            style={{ width: '18px', height: '18px' }}
                          />
                          {option}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Containment Method</label>
                    <input
                      type="text"
                      name="containment_method"
                      value={formData.containment_method}
                      onChange={handleChange}
                      placeholder="Secondary containment, absorbents, berms, etc."
                      style={styles.input}
                    />
                  </div>
                </div>
              </>
            )}

            {/* ============================================================ */}
            {/* CONDITIONAL SECTION: PROPERTY DAMAGE */}
            {/* ============================================================ */}
            {showPropertySection && (
              <>
                <div style={{ ...styles.sectionHeader, background: '#b45309' }}>
                  🔧 Property / Equipment Damage
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Was there property or equipment damage?</label>
                  <div style={styles.radioGroup}>
                    {['Yes', 'No'].map(option => (
                      <label
                        key={option}
                        style={{
                          ...styles.radioOption,
                          borderColor: formData.property_damage === option ? '#b45309' : '#e2e8f0',
                          background: formData.property_damage === option ? 'rgba(180, 83, 9, 0.05)' : '#fff'
                        }}
                      >
                        <input
                          type="radio"
                          name="property_damage"
                          value={option}
                          checked={formData.property_damage === option}
                          onChange={handleChange}
                          style={{ width: '18px', height: '18px' }}
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                </div>

                {formData.property_damage === 'Yes' && (
                  <>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Describe the Damage</label>
                      <textarea
                        name="property_damage_description"
                        value={formData.property_damage_description}
                        onChange={handleChange}
                        placeholder="Describe what was damaged and the extent of damage..."
                        style={styles.textarea}
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Estimated Damage Cost ($)</label>
                      <input
                        type="number"
                        name="property_damage_cost"
                        value={formData.property_damage_cost}
                        onChange={handleChange}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        style={styles.input}
                      />
                    </div>
                  </>
                )}
              </>
            )}

            {/* ============================================================ */}
            {/* CONDITIONAL SECTION: VEHICLE */}
            {/* ============================================================ */}
            {showVehicleSection && (
              <>
                <div style={{ ...styles.sectionHeader, background: '#4338ca' }}>
                  🚗 Vehicle Incident Details
                </div>

                <div style={styles.row}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Vehicle Type</label>
                    <input
                      type="text"
                      name="vehicle_type"
                      value={formData.vehicle_type}
                      onChange={handleChange}
                      placeholder="Pickup, Semi, Forklift, etc."
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Vehicle ID / Unit Number</label>
                    <input
                      type="text"
                      name="vehicle_id"
                      value={formData.vehicle_id}
                      onChange={handleChange}
                      placeholder="Unit #, License plate, etc."
                      style={styles.input}
                    />
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Vehicle Damage Description</label>
                  <textarea
                    name="vehicle_damage_description"
                    value={formData.vehicle_damage_description}
                    onChange={handleChange}
                    placeholder="Describe damage to vehicle(s)..."
                    style={styles.textarea}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Was another vehicle involved?</label>
                  <div style={styles.radioGroup}>
                    {['Yes', 'No'].map(option => (
                      <label
                        key={option}
                        style={{
                          ...styles.radioOption,
                          borderColor: formData.other_vehicle_involved === option ? '#4338ca' : '#e2e8f0',
                          background: formData.other_vehicle_involved === option ? 'rgba(67, 56, 202, 0.05)' : '#fff'
                        }}
                      >
                        <input
                          type="radio"
                          name="other_vehicle_involved"
                          value={option}
                          checked={formData.other_vehicle_involved === option}
                          onChange={handleChange}
                          style={{ width: '18px', height: '18px' }}
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ============================================================ */}
            {/* CONDITIONAL SECTION: PROCESS SAFETY */}
            {/* ============================================================ */}
            {showPSESection && (
              <>
                <div style={{ ...styles.sectionHeader, background: '#9f1239' }}>
                  🏭 Process Safety Event Details
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Is this a Process Safety Event?</label>
                  <div style={styles.radioGroup}>
                    {['Yes', 'No'].map(option => (
                      <label
                        key={option}
                        style={{
                          ...styles.radioOption,
                          borderColor: formData.is_pse === option ? '#9f1239' : '#e2e8f0',
                          background: formData.is_pse === option ? 'rgba(159, 18, 57, 0.05)' : '#fff'
                        }}
                      >
                        <input
                          type="radio"
                          name="is_pse"
                          value={option}
                          checked={formData.is_pse === option}
                          onChange={handleChange}
                          style={{ width: '18px', height: '18px' }}
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                </div>

                {formData.is_pse === 'Yes' && (
                  <>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>PSE Type</label>
                      <select
                        name="pse_type"
                        value={formData.pse_type}
                        onChange={handleChange}
                        style={styles.select}
                      >
                        <option value="">-- Select Type --</option>
                        <option value="LOPC">Loss of Primary Containment (LOPC)</option>
                        <option value="Fire">Fire</option>
                        <option value="Explosion">Explosion</option>
                        <option value="Pressure Release">Pressure Release</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>API 754 Process Safety Tier</label>
                      <select
                        name="ps_tier"
                        value={formData.ps_tier}
                        onChange={handleChange}
                        style={styles.select}
                      >
                        <option value="None">Not Applicable / Unknown</option>
                        <option value="Tier 1">Tier 1 - LOPC with major consequences</option>
                        <option value="Tier 2">Tier 2 - LOPC with lesser consequences</option>
                        <option value="Tier 3 HiPo">Tier 3 HiPo - Near miss with high potential</option>
                        <option value="Tier 3">Tier 3 - Leading indicator / near miss</option>
                      </select>
                    </div>
                  </>
                )}
              </>
            )}

            {/* ============================================================ */}
            {/* SECTION: INITIAL INVESTIGATION */}
            {/* ============================================================ */}
            <div style={{ ...styles.sectionHeader, background: '#059669' }}>
              🔍 Initial Investigation
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Immediate Actions Taken</label>
              <textarea
                name="immediate_actions_taken"
                value={formData.immediate_actions_taken}
                onChange={handleChange}
                placeholder="What actions were taken immediately after the incident?"
                style={styles.textarea}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Witness Information (if any)</label>
              <textarea
                name="witness_statement_summary"
                value={formData.witness_statement_summary}
                onChange={handleChange}
                placeholder="Names and brief summary of what witnesses observed..."
                style={styles.textarea}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Suspected Root Causes (Initial Assessment)</label>
              <textarea
                name="suspected_root_causes"
                value={formData.suspected_root_causes}
                onChange={handleChange}
                placeholder="What do you think caused or contributed to this incident?"
                style={styles.textarea}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Initial Lessons Learned</label>
              <textarea
                name="lessons_learned_initial"
                value={formData.lessons_learned_initial}
                onChange={handleChange}
                placeholder="What lessons can be learned from this incident?"
                style={styles.textarea}
              />
            </div>

            {/* ============================================================ */}
            {/* SECTION: PHOTO UPLOAD */}
            {/* ============================================================ */}
            <div style={{ ...styles.sectionHeader, background: '#1e3a8a' }}>
              📷 Photo Documentation
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Photos (Recommended)</label>
              <div style={styles.photoUpload}>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoChange}
                  style={{ display: 'none' }}
                  id="photoInput"
                />
                <label htmlFor="photoInput" style={{ cursor: 'pointer' }}>
                  <div style={{ fontSize: '40px', marginBottom: '10px' }}>📷</div>
                  <p style={{ fontWeight: '600', color: '#1e293b', marginBottom: '5px' }}>
                    Tap to take or upload photos
                  </p>
                  <p style={{ fontSize: '13px', color: '#64748b' }}>
                    Photos help document the incident scene and conditions
                  </p>
                </label>
              </div>
              {photos.length > 0 && (
                <div style={styles.photoPreview}>
                  {photos.map((photo, index) => (
                    <div key={index} style={{ position: 'relative' }}>
                      <img
                        src={URL.createObjectURL(photo)}
                        alt={`Preview ${index + 1}`}
                        style={styles.photoThumb}
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        style={{
                          position: 'absolute',
                          top: '-8px',
                          right: '-8px',
                          background: '#dc2626',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '50%',
                          width: '24px',
                          height: '24px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '700'
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Error Display */}
            {submitStatus && submitStatus.startsWith('error') && (
              <div style={styles.errorBox}>
                <strong>Error:</strong> {submitStatus.replace('error: ', '')}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                ...styles.submitBtn,
                opacity: isSubmitting ? 0.6 : 1,
                cursor: isSubmitting ? 'not-allowed' : 'pointer'
              }}
            >
              {isSubmitting ? '⏳ Submitting...' : '🚨 Submit Incident Report'}
            </button>

          </form>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <span style={{ fontWeight: '500' }}>Powered by Predictive Safety Analytics™</span>
          <span style={{ margin: '0 8px' }}>|</span>
          <span>© 2025 SLP Alaska</span>
        </div>
      </div>
    </div>
  );
}

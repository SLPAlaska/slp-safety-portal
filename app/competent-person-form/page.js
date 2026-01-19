'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

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
  'Deadhorse', 'Prudhoe Bay', 'Kuparuk', 'Alpine', 'Willow', 'ENI', 'PIKKA', 'Point Thompson',
  'North Star Island', 'Endicott', 'Badami', 'Other North Slope'
];

const EXCAVATION_TYPES = [
  'Trench', 'Bell-Bottom Pier Hole', 'Shaft', 'Open Excavation', 'Other'
];

const SOIL_CLASSIFICATIONS = [
  'Type A - Stable Rock', 'Type A - Clay', 'Type B - Silt', 'Type B - Medium Clay',
  'Type B - Unstable Rock', 'Type C - Gravel', 'Type C - Sand', 'Type C - Submerged Soil',
  'Layered - Multiple Types'
];

const PROTECTIVE_SYSTEMS = [
  'Sloping', 'Benching', 'Shoring - Timber', 'Shoring - Aluminum Hydraulic',
  'Shielding - Trench Box', 'Shielding - Steel Plate', 'Combination', 'None Required (<4ft)'
];

const WEATHER_CONDITIONS = [
  'Clear/Sunny', 'Partly Cloudy', 'Overcast', 'Light Rain', 'Heavy Rain',
  'Snow', 'Freezing Rain', 'High Wind'
];

export default function CompetentPersonForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [inspectionNumber, setInspectionNumber] = useState('');
  const [showAtmosphereReadings, setShowAtmosphereReadings] = useState(false);
  
  const [formData, setFormData] = useState({
    inspection_date: new Date().toISOString().split('T')[0],
    inspection_time: new Date().toTimeString().slice(0, 5),
    competent_person: '',
    company: '',
    location: '',
    specific_location: '',
    excavation_type: '',
    depth_ft: '',
    length_ft: '',
    width_ft: '',
    soil_classification: '',
    protective_system: '',
    weather_conditions: '',
    rain_last_24hrs: '',
    freeze_thaw: '',
    cave_in_potential: '',
    soil_stability: '',
    water_accumulation: '',
    protective_system_condition: '',
    shoring_secure: '',
    slope_angle: '',
    spoil_pile_setback: '',
    ladder_access_ok: '',
    ladder_within_25ft: '',
    ramp_stairs_ok: '',
    traffic_controls_ok: '',
    barricades_ok: '',
    warning_signs_ok: '',
    adjacent_structures_ok: '',
    utilities_protected: '',
    atmosphere_tested: '',
    o2_level: '',
    lel_level: '',
    h2s_level: '',
    co_level: '',
    ventilation_adequate: '',
    surface_encumbrances: '',
    equipment_setback: '',
    ppe_in_use: '',
    emergency_equipment: '',
    work_authorized: '',
    corrective_actions: '',
    inspector_signature: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'atmosphere_tested') {
      setShowAtmosphereReadings(value === 'Yes - Tested');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const timestamp = new Date().toISOString();
      const inspNum = `CP-${Date.now()}`;
      
      const { error } = await supabase
        .from('competent_person_inspections')
        .insert([{
          ...formData,
          inspection_number: inspNum,
          depth_ft: formData.depth_ft ? parseFloat(formData.depth_ft) : null,
          length_ft: formData.length_ft ? parseFloat(formData.length_ft) : null,
          width_ft: formData.width_ft ? parseFloat(formData.width_ft) : null,
          created_at: timestamp,
        }]);

      if (error) throw error;

      setInspectionNumber(inspNum);
      setSubmitSuccess(true);
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Error submitting inspection. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      inspection_date: new Date().toISOString().split('T')[0],
      inspection_time: new Date().toTimeString().slice(0, 5),
      competent_person: '',
      company: '',
      location: '',
      specific_location: '',
      excavation_type: '',
      depth_ft: '',
      length_ft: '',
      width_ft: '',
      soil_classification: '',
      protective_system: '',
      weather_conditions: '',
      rain_last_24hrs: '',
      freeze_thaw: '',
      cave_in_potential: '',
      soil_stability: '',
      water_accumulation: '',
      protective_system_condition: '',
      shoring_secure: '',
      slope_angle: '',
      spoil_pile_setback: '',
      ladder_access_ok: '',
      ladder_within_25ft: '',
      ramp_stairs_ok: '',
      traffic_controls_ok: '',
      barricades_ok: '',
      warning_signs_ok: '',
      adjacent_structures_ok: '',
      utilities_protected: '',
      atmosphere_tested: '',
      o2_level: '',
      lel_level: '',
      h2s_level: '',
      co_level: '',
      ventilation_adequate: '',
      surface_encumbrances: '',
      equipment_setback: '',
      ppe_in_use: '',
      emergency_equipment: '',
      work_authorized: '',
      corrective_actions: '',
      inspector_signature: '',
    });
    setSubmitSuccess(false);
    setShowAtmosphereReadings(false);
  };

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl shadow-xl p-8 text-center text-white">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold mb-2">Inspection Submitted Successfully!</h2>
            <p className="text-green-100 text-lg mb-6">Inspection Number: {inspectionNumber}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={resetForm}
                className="px-6 py-3 bg-white text-green-700 font-semibold rounded-lg hover:bg-green-50 transition-colors"
              >
                Submit Another Inspection
              </button>
              <Link
                href="/"
                className="px-6 py-3 bg-green-800 text-white font-semibold rounded-lg hover:bg-green-900 transition-colors"
              >
                Back to Portal
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-800 to-red-700 rounded-t-2xl shadow-xl p-8 text-center text-white">
          <div className="flex justify-center mb-4">
            <img src="/slp-logo.png" alt="SLP Alaska" className="h-16" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Competent Person Daily Inspection</h1>
          <p className="text-red-100">Trench & Excavation Safety Inspection</p>
          <span className="inline-block mt-3 px-4 py-1.5 bg-white/20 rounded-full text-sm font-medium">
            OSHA 1926 Subpart P Compliant
          </span>
        </div>

        {/* Form */}
        <div className="bg-white rounded-b-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* Basic Information */}
            <section>
              <div className="bg-gradient-to-r from-red-800 to-red-700 text-white px-6 py-3 -mx-8 mb-6 flex items-center gap-3">
                <span className="text-xl">📋</span>
                <h2 className="text-lg font-semibold">Basic Information</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Inspection Date <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="date"
                    name="inspection_date"
                    value={formData.inspection_date}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-red-500 focus:ring-0 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Inspection Time <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="time"
                    name="inspection_time"
                    value={formData.inspection_time}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-red-500 focus:ring-0 transition-colors"
                  />
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Competent Person Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  name="competent_person"
                  value={formData.competent_person}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-red-500 focus:ring-0 transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company <span className="text-red-600">*</span>
                  </label>
                  <select
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-red-500 focus:ring-0 transition-colors"
                  >
                    <option value="">-- Select Company --</option>
                    {COMPANIES.map(company => (
                      <option key={company} value={company}>{company}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location <span className="text-red-600">*</span>
                  </label>
                  <select
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-red-500 focus:ring-0 transition-colors"
                  >
                    <option value="">-- Select Location --</option>
                    {LOCATIONS.map(location => (
                      <option key={location} value={location}>{location}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Specific Location / Description
                </label>
                <input
                  type="text"
                  name="specific_location"
                  value={formData.specific_location}
                  onChange={handleChange}
                  placeholder="e.g., Pad A - East side of tank farm"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-red-500 focus:ring-0 transition-colors"
                />
              </div>
            </section>

            {/* Excavation Details */}
            <section>
              <div className="bg-gradient-to-r from-blue-800 to-blue-700 text-white px-6 py-3 -mx-8 mb-6 flex items-center gap-3">
                <span className="text-xl">🔍</span>
                <h2 className="text-lg font-semibold">Excavation Details</h2>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Excavation Type <span className="text-red-600">*</span>
                </label>
                <select
                  name="excavation_type"
                  value={formData.excavation_type}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-0 transition-colors"
                >
                  <option value="">-- Select Type --</option>
                  {EXCAVATION_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Depth (ft) <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="number"
                    name="depth_ft"
                    value={formData.depth_ft}
                    onChange={handleChange}
                    step="0.1"
                    required
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-0 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Length (ft)
                  </label>
                  <input
                    type="number"
                    name="length_ft"
                    value={formData.length_ft}
                    onChange={handleChange}
                    step="0.1"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-0 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Width (ft)
                  </label>
                  <input
                    type="number"
                    name="width_ft"
                    value={formData.width_ft}
                    onChange={handleChange}
                    step="0.1"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-0 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Soil Classification <span className="text-red-600">*</span>
                  </label>
                  <select
                    name="soil_classification"
                    value={formData.soil_classification}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-0 transition-colors"
                  >
                    <option value="">-- Select Classification --</option>
                    {SOIL_CLASSIFICATIONS.map(soil => (
                      <option key={soil} value={soil}>{soil}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Protective System <span className="text-red-600">*</span>
                  </label>
                  <select
                    name="protective_system"
                    value={formData.protective_system}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-0 transition-colors"
                  >
                    <option value="">-- Select System --</option>
                    {PROTECTIVE_SYSTEMS.map(system => (
                      <option key={system} value={system}>{system}</option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            {/* Environmental Conditions */}
            <section>
              <div className="bg-gradient-to-r from-red-800 to-red-700 text-white px-6 py-3 -mx-8 mb-6 flex items-center gap-3">
                <span className="text-xl">🌤️</span>
                <h2 className="text-lg font-semibold">Environmental Conditions</h2>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Weather Conditions <span className="text-red-600">*</span>
                </label>
                <select
                  name="weather_conditions"
                  value={formData.weather_conditions}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-red-500 focus:ring-0 transition-colors"
                >
                  <option value="">-- Select Conditions --</option>
                  {WEATHER_CONDITIONS.map(weather => (
                    <option key={weather} value={weather}>{weather}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Rain in Last 24 Hours? <span className="text-red-600">*</span>
                  </label>
                  <div className="flex gap-4">
                    {['Yes', 'No'].map(option => (
                      <label key={option} className={`flex-1 flex items-center justify-center gap-2 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.rain_last_24hrs === option 
                          ? option === 'Yes' ? 'border-amber-500 bg-amber-50' : 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <input
                          type="radio"
                          name="rain_last_24hrs"
                          value={option}
                          checked={formData.rain_last_24hrs === option}
                          onChange={handleChange}
                          required
                          className="sr-only"
                        />
                        <span className="font-medium">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Freeze/Thaw Conditions? <span className="text-red-600">*</span>
                  </label>
                  <div className="flex gap-4">
                    {['Yes', 'No'].map(option => (
                      <label key={option} className={`flex-1 flex items-center justify-center gap-2 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.freeze_thaw === option 
                          ? option === 'Yes' ? 'border-amber-500 bg-amber-50' : 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <input
                          type="radio"
                          name="freeze_thaw"
                          value={option}
                          checked={formData.freeze_thaw === option}
                          onChange={handleChange}
                          required
                          className="sr-only"
                        />
                        <span className="font-medium">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Hazard Assessment */}
            <section>
              <div className="bg-gradient-to-r from-red-600 to-red-500 text-white px-6 py-3 -mx-8 mb-6 flex items-center gap-3">
                <span className="text-xl">⚠️</span>
                <h2 className="text-lg font-semibold">Hazard Assessment</h2>
              </div>

              <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <h4 className="font-semibold text-amber-800">Critical Safety Checks</h4>
                    <p className="text-amber-700 text-sm">Answer the following questions carefully. Any "Yes" to hazards or "No" to safety measures requires immediate corrective action.</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                {/* Cave-In Potential */}
                <div className="bg-gray-50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <label className="font-medium text-gray-700">
                    Evidence of Cave-In Potential? <span className="text-red-600">*</span>
                  </label>
                  <div className="flex gap-3">
                    {['Yes', 'No'].map(option => (
                      <label key={option} className={`px-6 py-2 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.cave_in_potential === option 
                          ? option === 'Yes' ? 'border-red-500 bg-red-50 text-red-700' : 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <input
                          type="radio"
                          name="cave_in_potential"
                          value={option}
                          checked={formData.cave_in_potential === option}
                          onChange={handleChange}
                          required
                          className="sr-only"
                        />
                        <span className="font-medium">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Soil Stability */}
                <div className="bg-gray-50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <label className="font-medium text-gray-700">
                    Soil Stability Acceptable? <span className="text-red-600">*</span>
                  </label>
                  <div className="flex gap-3">
                    {['Yes', 'Marginal', 'No'].map(option => (
                      <label key={option} className={`px-4 py-2 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.soil_stability === option 
                          ? option === 'Yes' ? 'border-green-500 bg-green-50 text-green-700' 
                            : option === 'Marginal' ? 'border-amber-500 bg-amber-50 text-amber-700'
                            : 'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <input
                          type="radio"
                          name="soil_stability"
                          value={option}
                          checked={formData.soil_stability === option}
                          onChange={handleChange}
                          required
                          className="sr-only"
                        />
                        <span className="font-medium">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Water Accumulation */}
                <div className="bg-gray-50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <label className="font-medium text-gray-700">
                    Water Accumulation Present? <span className="text-red-600">*</span>
                  </label>
                  <div className="flex gap-3 flex-wrap">
                    {['Yes - Action Required', 'Minor', 'No'].map(option => (
                      <label key={option} className={`px-4 py-2 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.water_accumulation === option 
                          ? option === 'No' ? 'border-green-500 bg-green-50 text-green-700' 
                            : option === 'Minor' ? 'border-amber-500 bg-amber-50 text-amber-700'
                            : 'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <input
                          type="radio"
                          name="water_accumulation"
                          value={option}
                          checked={formData.water_accumulation === option}
                          onChange={handleChange}
                          required
                          className="sr-only"
                        />
                        <span className="font-medium text-sm">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Protective System Inspection */}
            <section>
              <div className="bg-gradient-to-r from-blue-800 to-blue-700 text-white px-6 py-3 -mx-8 mb-6 flex items-center gap-3">
                <span className="text-xl">🛡️</span>
                <h2 className="text-lg font-semibold">Protective System Inspection</h2>
              </div>
              
              <div className="space-y-4">
                {/* Protective System Condition */}
                <div className="bg-gray-50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <label className="font-medium text-gray-700">
                    Protective System Condition <span className="text-red-600">*</span>
                  </label>
                  <div className="flex gap-3">
                    {['Good', 'Acceptable', 'Deficient'].map(option => (
                      <label key={option} className={`px-4 py-2 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.protective_system_condition === option 
                          ? option === 'Good' ? 'border-green-500 bg-green-50 text-green-700' 
                            : option === 'Acceptable' ? 'border-amber-500 bg-amber-50 text-amber-700'
                            : 'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <input
                          type="radio"
                          name="protective_system_condition"
                          value={option}
                          checked={formData.protective_system_condition === option}
                          onChange={handleChange}
                          required
                          className="sr-only"
                        />
                        <span className="font-medium">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Shoring Secure */}
                <div className="bg-gray-50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <label className="font-medium text-gray-700">
                    Shoring/Shielding Properly Secured? <span className="text-red-600">*</span>
                  </label>
                  <div className="flex gap-3">
                    {['Yes', 'No', 'N/A'].map(option => (
                      <label key={option} className={`px-4 py-2 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.shoring_secure === option 
                          ? option === 'Yes' ? 'border-green-500 bg-green-50 text-green-700' 
                            : option === 'N/A' ? 'border-gray-400 bg-gray-100 text-gray-600'
                            : 'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <input
                          type="radio"
                          name="shoring_secure"
                          value={option}
                          checked={formData.shoring_secure === option}
                          onChange={handleChange}
                          required
                          className="sr-only"
                        />
                        <span className="font-medium">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Slope Angle */}
                <div className="bg-gray-50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <label className="font-medium text-gray-700">
                    Slope Angle Properly Maintained? <span className="text-red-600">*</span>
                  </label>
                  <div className="flex gap-3">
                    {['Yes', 'No', 'N/A'].map(option => (
                      <label key={option} className={`px-4 py-2 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.slope_angle === option 
                          ? option === 'Yes' ? 'border-green-500 bg-green-50 text-green-700' 
                            : option === 'N/A' ? 'border-gray-400 bg-gray-100 text-gray-600'
                            : 'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <input
                          type="radio"
                          name="slope_angle"
                          value={option}
                          checked={formData.slope_angle === option}
                          onChange={handleChange}
                          required
                          className="sr-only"
                        />
                        <span className="font-medium">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Spoil Pile Setback */}
                <div className="bg-gray-50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <label className="font-medium text-gray-700">
                    Spoil Pile 2ft+ From Edge? <span className="text-red-600">*</span>
                  </label>
                  <div className="flex gap-3">
                    {['Yes', 'No'].map(option => (
                      <label key={option} className={`px-6 py-2 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.spoil_pile_setback === option 
                          ? option === 'Yes' ? 'border-green-500 bg-green-50 text-green-700' 
                            : 'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <input
                          type="radio"
                          name="spoil_pile_setback"
                          value={option}
                          checked={formData.spoil_pile_setback === option}
                          onChange={handleChange}
                          required
                          className="sr-only"
                        />
                        <span className="font-medium">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Access & Egress */}
            <section>
              <div className="bg-gradient-to-r from-green-700 to-green-600 text-white px-6 py-3 -mx-8 mb-6 flex items-center gap-3">
                <span className="text-xl">🪜</span>
                <h2 className="text-lg font-semibold">Access & Egress</h2>
              </div>
              
              <div className="space-y-4">
                {/* Ladder Access */}
                <div className="bg-gray-50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <label className="font-medium text-gray-700">
                    Ladder Access Adequate? <span className="text-red-600">*</span>
                  </label>
                  <div className="flex gap-3">
                    {['Yes', 'No', 'N/A'].map(option => (
                      <label key={option} className={`px-4 py-2 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.ladder_access_ok === option 
                          ? option === 'Yes' ? 'border-green-500 bg-green-50 text-green-700' 
                            : option === 'N/A' ? 'border-gray-400 bg-gray-100 text-gray-600'
                            : 'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <input
                          type="radio"
                          name="ladder_access_ok"
                          value={option}
                          checked={formData.ladder_access_ok === option}
                          onChange={handleChange}
                          required
                          className="sr-only"
                        />
                        <span className="font-medium">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Ladder Within 25ft */}
                <div className="bg-gray-50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <label className="font-medium text-gray-700">
                    Ladder Within 25ft of Workers? <span className="text-red-600">*</span>
                  </label>
                  <div className="flex gap-3">
                    {['Yes', 'No', 'N/A'].map(option => (
                      <label key={option} className={`px-4 py-2 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.ladder_within_25ft === option 
                          ? option === 'Yes' ? 'border-green-500 bg-green-50 text-green-700' 
                            : option === 'N/A' ? 'border-gray-400 bg-gray-100 text-gray-600'
                            : 'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <input
                          type="radio"
                          name="ladder_within_25ft"
                          value={option}
                          checked={formData.ladder_within_25ft === option}
                          onChange={handleChange}
                          required
                          className="sr-only"
                        />
                        <span className="font-medium">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Ramps/Stairs */}
                <div className="bg-gray-50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <label className="font-medium text-gray-700">
                    Ramps/Stairs Safe Condition? <span className="text-red-600">*</span>
                  </label>
                  <div className="flex gap-3">
                    {['Yes', 'No', 'N/A'].map(option => (
                      <label key={option} className={`px-4 py-2 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.ramp_stairs_ok === option 
                          ? option === 'Yes' ? 'border-green-500 bg-green-50 text-green-700' 
                            : option === 'N/A' ? 'border-gray-400 bg-gray-100 text-gray-600'
                            : 'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <input
                          type="radio"
                          name="ramp_stairs_ok"
                          value={option}
                          checked={formData.ramp_stairs_ok === option}
                          onChange={handleChange}
                          required
                          className="sr-only"
                        />
                        <span className="font-medium">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Site Controls */}
            <section>
              <div className="bg-gradient-to-r from-red-800 to-red-700 text-white px-6 py-3 -mx-8 mb-6 flex items-center gap-3">
                <span className="text-xl">🚧</span>
                <h2 className="text-lg font-semibold">Site Controls</h2>
              </div>
              
              <div className="space-y-4">
                {/* Traffic Controls */}
                <div className="bg-gray-50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <label className="font-medium text-gray-700">
                    Traffic Controls in Place? <span className="text-red-600">*</span>
                  </label>
                  <div className="flex gap-3">
                    {['Yes', 'No', 'N/A'].map(option => (
                      <label key={option} className={`px-4 py-2 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.traffic_controls_ok === option 
                          ? option === 'Yes' ? 'border-green-500 bg-green-50 text-green-700' 
                            : option === 'N/A' ? 'border-gray-400 bg-gray-100 text-gray-600'
                            : 'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <input
                          type="radio"
                          name="traffic_controls_ok"
                          value={option}
                          checked={formData.traffic_controls_ok === option}
                          onChange={handleChange}
                          required
                          className="sr-only"
                        />
                        <span className="font-medium">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Barricades */}
                <div className="bg-gray-50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <label className="font-medium text-gray-700">
                    Barricades Adequate? <span className="text-red-600">*</span>
                  </label>
                  <div className="flex gap-3">
                    {['Yes', 'No'].map(option => (
                      <label key={option} className={`px-6 py-2 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.barricades_ok === option 
                          ? option === 'Yes' ? 'border-green-500 bg-green-50 text-green-700' 
                            : 'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <input
                          type="radio"
                          name="barricades_ok"
                          value={option}
                          checked={formData.barricades_ok === option}
                          onChange={handleChange}
                          required
                          className="sr-only"
                        />
                        <span className="font-medium">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Warning Signs */}
                <div className="bg-gray-50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <label className="font-medium text-gray-700">
                    Warning Signs Posted? <span className="text-red-600">*</span>
                  </label>
                  <div className="flex gap-3">
                    {['Yes', 'No'].map(option => (
                      <label key={option} className={`px-6 py-2 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.warning_signs_ok === option 
                          ? option === 'Yes' ? 'border-green-500 bg-green-50 text-green-700' 
                            : 'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <input
                          type="radio"
                          name="warning_signs_ok"
                          value={option}
                          checked={formData.warning_signs_ok === option}
                          onChange={handleChange}
                          required
                          className="sr-only"
                        />
                        <span className="font-medium">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Adjacent Structures */}
                <div className="bg-gray-50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <label className="font-medium text-gray-700">
                    Adjacent Structures Stable? <span className="text-red-600">*</span>
                  </label>
                  <div className="flex gap-3">
                    {['Yes', 'No', 'N/A'].map(option => (
                      <label key={option} className={`px-4 py-2 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.adjacent_structures_ok === option 
                          ? option === 'Yes' ? 'border-green-500 bg-green-50 text-green-700' 
                            : option === 'N/A' ? 'border-gray-400 bg-gray-100 text-gray-600'
                            : 'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <input
                          type="radio"
                          name="adjacent_structures_ok"
                          value={option}
                          checked={formData.adjacent_structures_ok === option}
                          onChange={handleChange}
                          required
                          className="sr-only"
                        />
                        <span className="font-medium">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Utilities Protected */}
                <div className="bg-gray-50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <label className="font-medium text-gray-700">
                    Underground Utilities Protected? <span className="text-red-600">*</span>
                  </label>
                  <div className="flex gap-3">
                    {['Yes', 'No', 'N/A'].map(option => (
                      <label key={option} className={`px-4 py-2 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.utilities_protected === option 
                          ? option === 'Yes' ? 'border-green-500 bg-green-50 text-green-700' 
                            : option === 'N/A' ? 'border-gray-400 bg-gray-100 text-gray-600'
                            : 'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <input
                          type="radio"
                          name="utilities_protected"
                          value={option}
                          checked={formData.utilities_protected === option}
                          onChange={handleChange}
                          required
                          className="sr-only"
                        />
                        <span className="font-medium">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Atmosphere Testing */}
            <section>
              <div className="bg-gradient-to-r from-red-600 to-red-500 text-white px-6 py-3 -mx-8 mb-6 flex items-center gap-3">
                <span className="text-xl">💨</span>
                <h2 className="text-lg font-semibold">Atmosphere Testing</h2>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Atmosphere Testing Required/Performed? <span className="text-red-600">*</span>
                </label>
                <div className="flex flex-wrap gap-3">
                  {['Yes - Tested', 'Not Required', 'Required - Not Done'].map(option => (
                    <label key={option} className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.atmosphere_tested === option 
                        ? option === 'Yes - Tested' ? 'border-green-500 bg-green-50 text-green-700' 
                          : option === 'Not Required' ? 'border-gray-400 bg-gray-100 text-gray-600'
                          : 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <input
                        type="radio"
                        name="atmosphere_tested"
                        value={option}
                        checked={formData.atmosphere_tested === option}
                        onChange={handleChange}
                        required
                        className="sr-only"
                      />
                      <span className="font-medium text-sm text-center">{option}</span>
                    </label>
                  ))}
                </div>
              </div>

              {showAtmosphereReadings && (
                <div className="mt-6 p-6 bg-gray-50 rounded-xl">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">O2 Level (%)</label>
                      <input
                        type="text"
                        name="o2_level"
                        value={formData.o2_level}
                        onChange={handleChange}
                        placeholder="19.5-23.5%"
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-red-500 focus:ring-0 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">LEL Level (%)</label>
                      <input
                        type="text"
                        name="lel_level"
                        value={formData.lel_level}
                        onChange={handleChange}
                        placeholder="<10%"
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-red-500 focus:ring-0 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">H2S Level (ppm)</label>
                      <input
                        type="text"
                        name="h2s_level"
                        value={formData.h2s_level}
                        onChange={handleChange}
                        placeholder="<10 ppm"
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-red-500 focus:ring-0 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">CO Level (ppm)</label>
                      <input
                        type="text"
                        name="co_level"
                        value={formData.co_level}
                        onChange={handleChange}
                        placeholder="<25 ppm"
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-red-500 focus:ring-0 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Ventilation Adequate? <span className="text-red-600">*</span>
                    </label>
                    <div className="flex gap-3">
                      {['Yes', 'No', 'N/A'].map(option => (
                        <label key={option} className={`px-4 py-2 border-2 rounded-lg cursor-pointer transition-all ${
                          formData.ventilation_adequate === option 
                            ? option === 'Yes' ? 'border-green-500 bg-green-50 text-green-700' 
                              : option === 'N/A' ? 'border-gray-400 bg-gray-100 text-gray-600'
                              : 'border-red-500 bg-red-50 text-red-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}>
                          <input
                            type="radio"
                            name="ventilation_adequate"
                            value={option}
                            checked={formData.ventilation_adequate === option}
                            onChange={handleChange}
                            className="sr-only"
                          />
                          <span className="font-medium">{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* General Safety */}
            <section>
              <div className="bg-gradient-to-r from-green-700 to-green-600 text-white px-6 py-3 -mx-8 mb-6 flex items-center gap-3">
                <span className="text-xl">✅</span>
                <h2 className="text-lg font-semibold">General Safety</h2>
              </div>
              
              <div className="space-y-4">
                {/* Surface Encumbrances */}
                <div className="bg-gray-50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <label className="font-medium text-gray-700">
                    Surface Encumbrances Removed/Supported? <span className="text-red-600">*</span>
                  </label>
                  <div className="flex gap-3">
                    {['Yes', 'No', 'N/A'].map(option => (
                      <label key={option} className={`px-4 py-2 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.surface_encumbrances === option 
                          ? option === 'Yes' ? 'border-green-500 bg-green-50 text-green-700' 
                            : option === 'N/A' ? 'border-gray-400 bg-gray-100 text-gray-600'
                            : 'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <input
                          type="radio"
                          name="surface_encumbrances"
                          value={option}
                          checked={formData.surface_encumbrances === option}
                          onChange={handleChange}
                          required
                          className="sr-only"
                        />
                        <span className="font-medium">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Equipment Setback */}
                <div className="bg-gray-50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <label className="font-medium text-gray-700">
                    Equipment Set Back From Edge? <span className="text-red-600">*</span>
                  </label>
                  <div className="flex gap-3">
                    {['Yes', 'No', 'N/A'].map(option => (
                      <label key={option} className={`px-4 py-2 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.equipment_setback === option 
                          ? option === 'Yes' ? 'border-green-500 bg-green-50 text-green-700' 
                            : option === 'N/A' ? 'border-gray-400 bg-gray-100 text-gray-600'
                            : 'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <input
                          type="radio"
                          name="equipment_setback"
                          value={option}
                          checked={formData.equipment_setback === option}
                          onChange={handleChange}
                          required
                          className="sr-only"
                        />
                        <span className="font-medium">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* PPE In Use */}
                <div className="bg-gray-50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <label className="font-medium text-gray-700">
                    Required PPE in Use? <span className="text-red-600">*</span>
                  </label>
                  <div className="flex gap-3">
                    {['Yes', 'No'].map(option => (
                      <label key={option} className={`px-6 py-2 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.ppe_in_use === option 
                          ? option === 'Yes' ? 'border-green-500 bg-green-50 text-green-700' 
                            : 'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <input
                          type="radio"
                          name="ppe_in_use"
                          value={option}
                          checked={formData.ppe_in_use === option}
                          onChange={handleChange}
                          required
                          className="sr-only"
                        />
                        <span className="font-medium">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Emergency Equipment */}
                <div className="bg-gray-50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <label className="font-medium text-gray-700">
                    Emergency/Rescue Equipment Available? <span className="text-red-600">*</span>
                  </label>
                  <div className="flex gap-3">
                    {['Yes', 'No'].map(option => (
                      <label key={option} className={`px-6 py-2 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.emergency_equipment === option 
                          ? option === 'Yes' ? 'border-green-500 bg-green-50 text-green-700' 
                            : 'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <input
                          type="radio"
                          name="emergency_equipment"
                          value={option}
                          checked={formData.emergency_equipment === option}
                          onChange={handleChange}
                          required
                          className="sr-only"
                        />
                        <span className="font-medium">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Authorization */}
            <section>
              <div className="bg-gradient-to-r from-green-700 to-green-600 text-white px-6 py-3 -mx-8 mb-6 flex items-center gap-3">
                <span className="text-xl">📝</span>
                <h2 className="text-lg font-semibold">Authorization</h2>
              </div>
              
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-400 rounded-xl p-6 mb-6">
                <h3 className="text-lg font-semibold text-green-800 mb-4">Work Authorization Decision</h3>
                <div className="flex flex-col sm:flex-row gap-4">
                  <label className={`flex-1 flex items-center justify-center gap-3 p-5 border-2 rounded-xl cursor-pointer transition-all ${
                    formData.work_authorized === 'Yes' 
                      ? 'border-green-500 bg-green-100 text-green-800' 
                      : 'border-gray-200 hover:border-green-300'
                  }`}>
                    <input
                      type="radio"
                      name="work_authorized"
                      value="Yes"
                      checked={formData.work_authorized === 'Yes'}
                      onChange={handleChange}
                      required
                      className="sr-only"
                    />
                    <span className="text-2xl">✅</span>
                    <span className="font-semibold">Yes - Work Authorized</span>
                  </label>
                  <label className={`flex-1 flex items-center justify-center gap-3 p-5 border-2 rounded-xl cursor-pointer transition-all ${
                    formData.work_authorized === 'No' 
                      ? 'border-red-500 bg-red-100 text-red-800' 
                      : 'border-gray-200 hover:border-red-300'
                  }`}>
                    <input
                      type="radio"
                      name="work_authorized"
                      value="No"
                      checked={formData.work_authorized === 'No'}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <span className="text-2xl">🛑</span>
                    <span className="font-semibold">No - Work Stopped</span>
                  </label>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Corrective Actions Required (if any)
                </label>
                <textarea
                  name="corrective_actions"
                  value={formData.corrective_actions}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Describe any corrective actions needed before work can continue or resume..."
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-red-500 focus:ring-0 transition-colors resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Inspector Signature (Type Full Name) <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  name="inspector_signature"
                  value={formData.inspector_signature}
                  onChange={handleChange}
                  required
                  placeholder="Type your full name as signature"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-red-500 focus:ring-0 transition-colors"
                />
              </div>
            </section>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-4 px-6 rounded-xl text-white font-semibold text-lg transition-all ${
                isSubmitting 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-red-700 to-red-600 hover:from-red-800 hover:to-red-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
              }`}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-3">
                  <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Submitting Inspection...
                </span>
              ) : (
                'Submit Daily Inspection'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center py-6 text-sm text-gray-500">
          <span className="font-medium text-gray-600">Powered by Predictive Safety Analytics™</span>
          <span className="mx-2">|</span>
          <span>© 2025 SLP Alaska</span>
        </div>
      </div>
    </div>
  );
}

// app/lib/elineAuditLabels.js
//
// Column -> human label for the E-Line Safety Audit, for anything that renders
// a stored submission: exports, print views, PDFs, report generators.
//
// WHY THIS FILE EXISTS
//
// The 2026-09-18 revision renamed "BOP" to "WLV" (wireline valve) everywhere on
// the form, but did NOT rename the `bop_installed` / `bop_tested` columns —
// renaming them would orphan every audit submitted before that date. So the
// column name and the label people should see have deliberately drifted apart,
// and a renderer that prints raw column names will print "BOP" at a client.
// Anything rendering this table should map through LABELS first.
//
// RETIRED holds the items the revision removed from the form. Their columns
// still exist and still hold data on historical rows, so a renderer showing an
// old submission needs labels for them too — it just must not offer them as
// inputs on a new audit.

/** Labels for every field the current form writes. */
export const LABELS = {
  // Job information
  auditor_name: 'Auditor Name',
  audit_date: 'Date',
  job_number: 'Job Number',
  company: 'Company',
  location: 'Location',
  well_name: 'Well Name/ID',
  unit_id: 'E-Line Unit ID',
  crew_size: 'Crew Size',

  // Pre-job planning
  jsa_reviewed: 'JSA/JHA reviewed with crew',
  work_permit: 'Work permit obtained',
  hot_work_permit: 'Hot work permit (if required)',
  confined_space_permit: 'Confined space permit (if required)',
  emergency_plan: 'Emergency action plan reviewed',
  client_requirements: 'Client-specific requirements reviewed',
  pre_job_meeting: 'Pre-job safety meeting held',

  // Personnel and training
  first_aid_cpr: 'First Aid/CPR training current',
  ppe_appropriate: 'PPE appropriate for task',

  // E-Line unit and equipment
  unit_pre_trip: 'Unit pre-trip inspection complete',
  tools_inspected: 'Tools inspected and ready',

  // Pressure control equipment
  lubricator_condition: 'Lubricator condition',
  annual_lubricator_inspection: 'Annual Lubricator Inspection complete and Color Coded Correctly',
  // Columns kept for history; labels renamed BOP -> WLV.
  bop_installed: 'WLV installed correctly',
  bop_tested: 'WLV function tested',

  // Pressure testing
  low_test_pressure: 'Low Pressure Test PSI',
  high_test_pressure: 'High Pressure Test PSI',
  test_documented: 'Pressure Tests Documented',

  // Rigging and sheaves
  sheave_aligned: 'Sheave properly aligned',
  weight_indicator: 'Weight indicator working',

  // Electrical safety
  unit_grounded: 'Unit properly grounded',
  bonding_verified: 'Bonding verified',
  electrical_connections: 'Electrical connections secure',

  // Well site safety
  well_status: 'Well status verified with client',
  wellhead_condition: 'Wellhead condition acceptable',

  // Site conditions
  access_egress: 'Access/egress routes clear',
  work_area_barricaded: 'Work area barricaded',
  housekeeping: 'Housekeeping acceptable',
  wind_weather_conditions: 'Wind and Weather Conditions',
  lighting_equipment: 'Lighting equipment on location',

  // Communications
  radio_check: 'Radio check complete',
  emergency_contacts: 'Emergency contacts posted',
  muster_point_location: 'Muster Point Location',
  client_rep: 'Client Rep Name',

  // Result
  overall_result: 'Overall Audit Result',
  comments: 'Additional Comments',
}

/**
 * Items the 2026-09-18 revision removed from the form. New submissions leave
 * these NULL; submissions before that date still carry values, so a renderer
 * showing history needs these labels. Do not offer them as form inputs.
 */
export const RETIRED_LABELS = {
  crew_training: 'Crew training certifications current',
  well_control_cert: 'Well control certification current',
  h2s_training: 'H2S training current',
  frc_worn: 'FRC/Nomex worn by all personnel',
  drum_cable: 'Drum and cable condition',
  measuring_device: 'Measuring device calibrated',
  depth_counter: 'Depth counter zeroed',
  weak_point: 'Weak point installed and verified',
  cable_head: 'Cable head inspected',
  lubricator_pressure: 'Lubricator pressure rating adequate',
  grease_injection: 'Grease injection head condition',
  stuffing_box: 'Stuffing box condition',
  flow_tubes: 'Flow tubes inspected',
  // Renamed WLV here too: a client reading an old audit should not see "BOP".
  bop_pressure: 'WLV pressure rating adequate',
  low_pressure_test: 'Low Pressure Test result',
  high_pressure_test: 'High Pressure Test result',
  sheave_condition: 'Sheave wheel condition',
  gin_pole: 'Gin pole/mast secured',
  guy_wires: 'Guy wires properly tensioned',
  floor_anchors: 'Floor anchors secure',
  cable_insulation: 'Cable insulation intact',
  control_panel: 'Control panel condition',
  pressure_readings: 'Pressure readings noted',
  flow_line: 'Flow line secured',
  kill_line: 'Kill line available',
  wind_conditions: 'Wind conditions acceptable',
  weather_conditions: 'Weather conditions acceptable',
  lighting_adequate: 'Lighting adequate',
  muster_point: 'Muster point identified',
  client_communication: 'Client communication established',
  job_approved: 'Job Approved to Proceed',
  critical_issues: 'Critical Issues Found',
  issue_description: 'Issue Description',
  corrective_actions: 'Corrective Actions Required',
}

const ALL = { ...LABELS, ...RETIRED_LABELS }

/**
 * The label to print for a stored column. Falls back to the column name so an
 * unmapped column is still rendered rather than dropped — but note that a
 * fallback is how "BOP" would reach a client, so new columns belong in LABELS.
 */
export function elineLabel(column) {
  return ALL[column] || column
}

/** True for columns the current form no longer collects. */
export function isRetiredElineField(column) {
  return Object.prototype.hasOwnProperty.call(RETIRED_LABELS, column)
}

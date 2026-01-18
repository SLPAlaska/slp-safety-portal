/**
 * SLP Alaska Predictive Safety Analytics Dashboard
 * VERSION 18 - ENERGY SOURCE & SIF POTENTIAL ANALYTICS
 * 
 * PRESERVED: Safety Culture Index, Predictive Risk Score, Safe/At-Risk Ratio,
 *            Job Stop Rate, Near Misses, Open Action Items, HSE Contacts, TrueCost
 * 
 * NEW IN V18:
 * - Energy Source Analytics (aggregated across THA/JSA, STOP Take 5, Risk Control Conversation)
 * - Control Type Analytics (hierarchy of controls tracking)
 * - SIF Potential (STKY/PSIF) tracking from Good Catch, Incident, BBS, Hazard ID, Property Damage
 * - Enhanced Predictive Risk Score using energy/control data
 * - Enhanced Safety Culture Index using control hierarchy quality
 */

// ============================================================================
// CACHE CONFIGURATION
// ============================================================================
var CACHE_SPREADSHEET_ID = '11wywrjMrfomUY5IVJtYjnOiQtvp9vJvYQEQaMhJzbDM';
var CACHE_SHEET_NAME = 'DashboardCache';
var CACHE_MAX_AGE_MINUTES = 30;

var PRELOAD_COMBINATIONS = [
  { company: 'All', location: 'All', year: String(new Date().getFullYear()) },
  { company: 'All', location: 'All', year: String(new Date().getFullYear() - 1) },
  { company: 'All', location: 'All', year: 'All' }
];

// ============================================================================
// ALL SPREADSHEET IDs
// ============================================================================
var SPREADSHEET_IDS = {
  'Incident Investigation': '1-aKn7VFKoOOKwYIGe3Q4YtMeef4QfwNI91kjMUrxbgw',
  'SAIL Log': '1QGPvUrflRzrF2RD8BQwZDI2fOn-330cy0Y2O42yPNQk',
  'Property Damage': '1Oi7yAxiCxJwtPJS4qL9JGzoDi7UC2bRqK0OOCpRHU_E',
  'BBS Observations': '18VMxKGgftyFXin9JAxiUalNhcKHM1bGvi15T6rH9oGc',
  'Hazard ID': '19zpBRdYq71FeOmNrBPKpQdN1qsy3maMMV_PerjI96m8',
  'Good Catch Near Miss': '1PzsNXvC_z7LROK_856YbQL4RZwSnpJuVE5jUxFHdrjM',
  'Risk Control Conversation': '1gzTODxi2HwKwEf7Aerh99jjpqHQe8k2E1SfclJWVNy4',
  'THA JSA': '1tyZI7IQffkZ9lvCVIWtXptDkM5WA5mf8gL8EDrsWGRY',
  'STOP Take 5': '1u_mFnNX1RhFfUCOPbM6TbCDfUj-cUMLHfZVXemm7QPs',
  'Safety Meeting': '1giVM3ruybtb6pV67bYbLUK7Jgn2wjirtd_0aegA',
  'Toolbox Meeting': '1FqWP8qcaVwyKX0B05TFXgcep1NDNFCVBjG2wi7lSBss',
  'Manage By Walk Around': '1Ib0lWEwDefyDaLPwCo4jp1OFpMBhy1ixqnxyVwuAscg',
  'Manager HSE Daily Log': '1I2r2SNZvHlzM_q8FDh1qoAIviDmYHvgSd7ktBaTbnc0',
  'LSR Driving': '1xnjquDBmdbtavsdannUYYNIWA6b-vdj34ujJip45Ezs',
  'LSR Energy Isolation': '11IkI2T1ghxShBV43muAcI0KesQIicJFQxeWlLks-1Lo',
  'LSR Fall Protection': '1286IBcAI5T07LF3_yHWkmrZR8onb8IeR4fWWFuMsddw',
  'LSR Lifting Operations': '1M0elRJ660Pd34yY9h4u_xCYbm7-jF9m48zlSEM0V7KY',
  'LSR Line of Fire': '1E--IOtAhrYJnFXXXlMf_mIM1hquifLxndUv7nEmt6pk',
  'LSR Work Permits': '1WvB0m4PWmVZS60h2UG06ro6CRbV-U1WHyj5YvfYah9E',
  'LSR Confined Spaces': '1QKrDsFrx1GZPpBrXWgqx-CmxfXiwoArHulYi8YTuybE',
  'EHS Field Evaluation': '1vY-oF83KDiNhpn8t59q-ZyZhrMrJH2FXIW0wm34Prpo',
  'Task Crew Audit': '1Sosi0Yr7gwCPnVAWh9G4vuu70vZX73PZo7yaufMDVSs',
  'Location Audit': '1uHVkKKMKbfnpbk-rx5BzdNRudZSnkrLYTRiZCI3ioc',
  'Surface Condition Audit': '17kiWVILdVROkdKR5QUVvpST1z0-tUiSYoIeJSDc3K7Q',
  'Dropped Object Prevention': '1nOoUHQ1kKAyZX48B0BUw0LRqsAFeU6QvFuy6GHg-5Bc',
  'Slickline Safety Audit': '1vRSAfTKDHHnrBGc6fB-GpQc-qWwDftbYm0XA1NAqPrU',
  'E-Line Audit': '1rt5WrfqNIvIAIVJVIdK-OjMcgE9rtb8Bj5m_iG_Rd9g',
  'Welding Fab Shop Audit': '1TJnQw0sBy6gm4EK4GOsv9TKhRMO_VHcQvLE2TnSFDmM',
  'Welding Grinding Audit': '1JealPjImrI13sXk8l9WdBhICHjTJPlLSXClZNFvfe5M',
  'Confined Space Entry Permit': '1G-Bl4pQCPgl2vpiGRzSDDJy-NUoAkWQj2san7Ka3ay0',
  'Energized Electrical Work Permit': '1C6t5nUwNnSA6LFwvhMvM1w4pww8lSFHQg8i47IC722U',
  'Energy Isolation LOTO Permit': '1YtGlnm3WSUX-dijeOx9llsEZsrmQZICN-ik7zr-Bu8A',
  'Excavation Trenching Permit': '1i9TGVvGPOH0G3GSOLgYyTEYqtp_oeGl_FmwU26Q9WHY',
  'Hot Work Permit': '1LRx-ddYn6sxUmW1OjF7-sDI-xFWkj_wVzUIIJ1do9LM',
  'Opening Blinding Permit': '1l1gEOaiLdroXO_-n8y-keX77VYhc9sn3Qk47F63Z89k',
  'Unit Work Permit': '1m-iCpmPHxjeXAMl3SRDzu5PMzo82cjMrpSTt7O1RIZw',
  'Heavy Equipment Daily Inspection': '1_cNv8OhTgfCrn9da1YO4EMjdrX8L3fMS1Onsgo7pGfc',
  'Pre-Shift Crane Inspection': '1OWrbgW8gpU0Jq36wYGFXBMmRLJvwsHmAyOTYupRTgnc',
  'Pre-Shift Forklift Inspection': '1DPIvfZ7uhvE0GFY_Jtyjfuvm1M3wJbUjLO3xLmBLkh8',
  'Pre-Trip Vehicle Inspection': '1ldWSB1MsPvrAUPgKi66jVDl9d9CxMt_ISfR9dSeGPLE',
  'Chain Hoist Inspection': '1RvTaEhktt1ujLRHewrOTFUta9rTgcsfigp_viUSh4t0',
  'Emergency Eyewash Station Inspection': '1MeIVOOpeQsnRT2-joHIN8QB3hH3x277mThZlVB6Yotk',
  'Fall Protection Harness Inspection': '1Z00xpD0JshRyfzopwXFssaM-FMBSvneLgbRc5h0WqoE',
  'Fire Extinguisher Inspection': '1EPRjPbwqXUijCs8-6K02cOtYKOaHjSqAAb_aSyc8v-M',
  'First Aid Kit Inspection': '1hYnvkyvP1X7a2ChVZH4oqC-EaWhv3KNSKkoogj-v74Y',
  'Ladder Inspection': '1V5jX9_XG88giT8VHCW_AlwjM6dqIZjiQjJL-AJFZQIc',
  'Lanyard SRL Inspection': '1nGBUvRiWIM3h18wEDpR_EKDrcyzVLajPV5YPjxDE73w',
  'Monthly AED Inspection': '1LWstdyMQUsWN-yghPYXD_o4ev1VMwWuOWK_W0okfTM0',
  'Shackle Inspection': '1kVmTopzLY3ASWCE-AnvMP6MoQKOR67dFE5IQkZVa5Mk',
  'Synthetic Sling Inspection': '1A7dNcto-cZjhHQAopllkcVWh_wVTZrsZ5gVE5TToXHc',
  'Wire Rope Inspection': '1H64bwd5OS12IUvn5n0-iM0r9kaLo5UISwCzZ7srfCpQ',
  'Spill Kit Inspection': '1HZKxjusaYKDfLRoVrz6KwKvolN1zketHD-3UBlV10So',
  'SWPPP Inspection': '177XcIuWardqNeFiTVXtoPuuUiYwO5q3mfubBw2Lz5lc'
};

// ============================================================================
// ENERGY SOURCE CONFIGURATION - The 8 Energy Types
// ============================================================================
var ENERGY_TYPES = ['Gravity', 'Motion', 'Mechanical', 'Electrical', 'Pressure', 'Chemical', 'Temperature', 'Stored'];

var ENERGY_COLUMN_PATTERNS = {
  'Gravity': ['gravity', 'fall', 'dropped object', 'falling', 'height'],
  'Motion': ['motion', 'struck', 'caught', 'vehicle', 'kinetic', 'moving'],
  'Mechanical': ['mechanical', 'rotating', 'tension', 'compression', 'pinch'],
  'Electrical': ['electrical', 'electric', 'shock', 'arc flash', 'electrocution'],
  'Pressure': ['pressure', 'hydraulic', 'pneumatic', 'vessel', 'compressed'],
  'Chemical': ['chemical', 'exposure', 'spill', 'release', 'toxic', 'hazmat'],
  'Temperature': ['temperature', 'thermal', 'burn', 'cold', 'heat', 'hot'],
  'Stored': ['stored', 'spring', 'capacitor', 'accumulator', 'potential']
};

// ============================================================================
// CONTROL TYPE CONFIGURATION - Hierarchy of Controls (8 Types)
// ============================================================================
var CONTROL_TYPES = ['Elimination', 'Substitution', 'Engineering', 'Guarding', 'LOTO', 'Warnings', 'Administrative', 'PPE'];

var CONTROL_HIERARCHY = {
  'Elimination': 1, 'Substitution': 1, 'Engineering': 1,
  'Guarding': 2, 'LOTO': 2, 'Warnings': 2,
  'Administrative': 3, 'PPE': 3
};

var CONTROL_COLUMN_PATTERNS = {
  'Elimination': ['elimination', 'eliminate', 'remove hazard'],
  'Substitution': ['substitution', 'substitute', 'replace'],
  'Engineering': ['engineering', 'engineer', 'isolate'],
  'Guarding': ['guarding', 'guard', 'barrier', 'barricade'],
  'LOTO': ['loto', 'lockout', 'tagout', 'lock out', 'tag out', 'isolation'],
  'Warnings': ['warning', 'signal', 'alarm', 'sign', 'alert'],
  'Administrative': ['administrative', 'procedure', 'sop', 'training', 'permit'],
  'PPE': ['ppe', 'personal protective', 'equipment', 'gloves', 'glasses', 'hard hat']
};

// ============================================================================
// SIF POTENTIAL CONFIGURATION
// ============================================================================
var SIF_COLUMN_PATTERNS = {
  'sifPotential': ['sif potential', 'psif', 'stky', 'sif_potential', 'serious injury', 'fatality potential'],
  'highEnergy': ['high energy', 'high_energy', 'energy present', 'highenergy'],
  'energyRelease': ['energy release', 'release occurred', 'energy_release'],
  'directControl': ['direct control', 'control status', 'direct_control', 'dec'],
  'actualSeverity': ['actual severity', 'actual_severity', 'outcome severity'],
  'potentialSeverity': ['potential severity', 'potential_severity', 'could have been']
};

// ============================================================================
// FORM GROUPINGS
// ============================================================================
var ENERGY_SOURCE_FORMS = ['THA JSA', 'STOP Take 5', 'Risk Control Conversation'];
var SIF_POTENTIAL_FORMS = ['Good Catch Near Miss', 'Incident Investigation', 'BBS Observations', 'Hazard ID', 'Property Damage'];
var HSE_CONTACT_FORMS = ['EHS Field Evaluation', 'Task Crew Audit', 'Location Audit', 'Surface Condition Audit', 'Dropped Object Prevention', 'Slickline Safety Audit', 'E-Line Audit', 'Welding Fab Shop Audit', 'Welding Grinding Audit'];

var TRUECOST_SHEET_NAME = 'Incident Costs';

// ============================================================================
// MASTER COMPANY & LOCATION LISTS
// ============================================================================
var MASTER_COMPANIES = ['A-C Electric', 'AKE-Line', 'Apache Corp.', 'Armstrong Oil & Gas', 'ASRC Energy Services', 'CCI-Industrial', 'Chosen Construction', 'CINGSA', 'Coho Enterprises', 'Conam Construction', 'ConocoPhillips', 'Five Star Oilfield Services', 'Fox Energy Services', 'G.A. West', 'GBR Equipment', 'GLM Energy Services', 'Graham Industrial Coatings', 'Harvest Midstream', 'Hilcorp Alaska', 'MagTec Alaska', 'Merkes Builders', 'Nordic-Calista', 'Parker TRS', 'Peninsula Paving', 'Pollard Wireline', 'Ridgeline Oilfield Services', 'Santos', 'Summit Excavation', 'Yellowjacket', 'Other'];

var MASTER_LOCATIONS = ['Kenai', 'CIO', 'Beaver Creek', 'Swanson River', 'Ninilchik', 'Nikiski', 'Other Kenai Asset', 'Deadhorse', 'Prudhoe Bay', 'Kuparuk', 'Alpine', 'Willow', 'ENI', 'PIKKA', 'Point Thompson', 'North Star Island', 'Endicott', 'Badami', 'Other North Slope'];

var COMPANY_ALIASES = {
  'magtec': 'MagTec Alaska', 'mag tec': 'MagTec Alaska', 'mag-tec': 'MagTec Alaska',
  'yellowjacket': 'Yellowjacket', 'yellow jacket': 'Yellowjacket',
  'ake-line': 'AKE-Line', 'akeline': 'AKE-Line',
  'pollard': 'Pollard Wireline', 'hilcorp': 'Hilcorp Alaska',
  'ridgeline': 'Ridgeline Oilfield Services',
  'conocophillips': 'ConocoPhillips', 'conoco': 'ConocoPhillips', 'cop': 'ConocoPhillips',
  'cci industrial': 'CCI-Industrial', 'cci-industrial': 'CCI-Industrial', 'cci': 'CCI-Industrial',
  'peninsula paving': 'Peninsula Paving', 'harvest': 'Harvest Midstream',
  'gbr': 'GBR Equipment', 'chosen': 'Chosen Construction',
  'nordic calista': 'Nordic-Calista', 'nordic-calista': 'Nordic-Calista',
  'fox energy': 'Fox Energy Services', 'armstrong': 'Armstrong Oil & Gas',
  'summit': 'Summit Excavation', 'coho': 'Coho Enterprises',
  'conam': 'Conam Construction', 'five star': 'Five Star Oilfield Services',
  'glm': 'GLM Energy Services', 'graham': 'Graham Industrial Coatings',
  'merkes': 'Merkes Builders', 'parker': 'Parker TRS',
  'asrc': 'ASRC Energy Services', 'apache': 'Apache Corp.',
  'a-c electric': 'A-C Electric', 'ac electric': 'A-C Electric'
};

var KEY_FILTER_SOURCES = ['BBS Observations', 'Hazard ID', 'Good Catch Near Miss', 'THA JSA', 'SAIL Log', 'Incident Investigation', 'Safety Meeting', 'Toolbox Meeting', 'Manage By Walk Around', 'Manager HSE Daily Log', 'Risk Control Conversation', 'STOP Take 5', 'Location Audit', 'Task Crew Audit', 'EHS Field Evaluation', 'Property Damage', 'LSR Driving'];

// ============================================================================
// CACHE FUNCTIONS
// ============================================================================
function getCacheSheet() {
  if (!CACHE_SPREADSHEET_ID || CACHE_SPREADSHEET_ID === 'YOUR_CACHE_SPREADSHEET_ID_HERE') return null;
  try {
    var ss = SpreadsheetApp.openById(CACHE_SPREADSHEET_ID);
    var sheet = ss.getSheetByName(CACHE_SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(CACHE_SHEET_NAME);
      sheet.appendRow(['FilterKey', 'LastUpdated', 'DataJSON']);
      sheet.setFrozenRows(1);
    }
    return sheet;
  } catch (e) { return null; }
}

function getCachedDashboardData(companyFilter, locationFilter, yearFilter) {
  var sheet = getCacheSheet();
  if (!sheet) return null;
  var filterKey = (companyFilter || 'All') + '_' + (locationFilter || 'All') + '_' + (yearFilter || 'All');
  try {
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return null;
    var data = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
    for (var i = 0; i < data.length; i++) {
      if (data[i][0] === filterKey) {
        var lastUpdated = new Date(data[i][1]);
        var ageMinutes = (new Date() - lastUpdated) / (1000 * 60);
        if (ageMinutes < CACHE_MAX_AGE_MINUTES) {
          var parsed = JSON.parse(data[i][2]);
          parsed.fromCache = true;
          parsed.cacheAge = Math.round(ageMinutes);
          return parsed;
        }
      }
    }
  } catch (e) {}
  return null;
}

function updateDashboardCache(companyFilter, locationFilter, yearFilter, data) {
  var sheet = getCacheSheet();
  if (!sheet) return;
  var filterKey = (companyFilter || 'All') + '_' + (locationFilter || 'All') + '_' + (yearFilter || 'All');
  try {
    var lastRow = sheet.getLastRow();
    var rowToUpdate = -1;
    if (lastRow >= 2) {
      var existingKeys = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (var i = 0; i < existingKeys.length; i++) {
        if (existingKeys[i][0] === filterKey) { rowToUpdate = i + 2; break; }
      }
    }
    var dataToStore = JSON.parse(JSON.stringify(data));
    delete dataToStore.fromCache;
    delete dataToStore.cacheAge;
    var rowData = [filterKey, new Date().toISOString(), JSON.stringify(dataToStore)];
    if (rowToUpdate > 0) sheet.getRange(rowToUpdate, 1, 1, 3).setValues([rowData]);
    else sheet.appendRow(rowData);
  } catch (e) {}
}

function scheduledCacheUpdate() {
  for (var i = 0; i < PRELOAD_COMBINATIONS.length; i++) {
    var combo = PRELOAD_COMBINATIONS[i];
    try {
      var data = calculateDashboardData(combo.company, combo.location, combo.year);
      updateDashboardCache(combo.company, combo.location, combo.year, data);
    } catch (e) {}
  }
}

function setupDashboardCache() {
  var sheet = getCacheSheet();
  if (!sheet) return { success: false, message: 'Cache spreadsheet not accessible' };
  var triggers = ScriptApp.getProjectTriggers();
  var hasScheduledTrigger = false;
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'scheduledCacheUpdate') { hasScheduledTrigger = true; break; }
  }
  if (!hasScheduledTrigger) ScriptApp.newTrigger('scheduledCacheUpdate').timeBased().everyMinutes(15).create();
  scheduledCacheUpdate();
  return { success: true, message: 'Cache setup complete!' };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
function isInYear(dateValue, yearFilter) {
  if (!yearFilter || yearFilter === 'All') return true;
  if (!dateValue) return false;
  var year = parseInt(yearFilter, 10);
  if (isNaN(year)) return true;
  if (dateValue instanceof Date) return dateValue.getFullYear() === year;
  if (typeof dateValue === 'string') {
    var parsed = new Date(dateValue.trim());
    if (!isNaN(parsed.getTime())) return parsed.getFullYear() === year;
    var match = dateValue.match(/\b(20\d{2})\b/);
    if (match) return parseInt(match[1], 10) === year;
  }
  return true;
}

function getRowDate(row) {
  if (!row || row.length === 0) return null;
  var firstCell = row[0];
  if (firstCell instanceof Date) return firstCell;
  if (firstCell && typeof firstCell === 'string') {
    var parsed = new Date(firstCell.trim());
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

function isValidDataRow(row, cols) {
  if (!row || row.length === 0) return false;
  var firstCell = row[0];
  if (firstCell instanceof Date) {
    var year = firstCell.getFullYear();
    if (year >= 2020 && year <= 2030) return true;
  }
  if (firstCell && typeof firstCell === 'string') {
    var str = firstCell.trim();
    if (/^\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}/.test(str) || /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(str)) return true;
  }
  return false;
}

function isValidFilterValue(value) {
  if (value === null || value === undefined || value instanceof Date) return false;
  var str = String(value).trim();
  if (str === '' || str.length === 0 || str.length > 100) return false;
  if (/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s/i.test(str)) return false;
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(str) || /^\d{4}-\d{2}-\d{2}/.test(str)) return false;
  if (str.indexOf('GMT') !== -1 || /^\d+$/.test(str)) return false;
  var invalidValues = ['timestamp', 'date', 'time', 'undefined', 'null', 'n/a', 'na', 'none', '-', '#n/a', '#ref!', '#value!'];
  return invalidValues.indexOf(str.toLowerCase()) === -1;
}

function normalizeCompany(company) {
  if (company instanceof Date) return null;
  var str = String(company).trim();
  if (/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s/i.test(str) || /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(str) || /^\d{4}-\d{2}-\d{2}/.test(str) || str.indexOf('GMT') !== -1) return null;
  var lowerStr = str.toLowerCase();
  return COMPANY_ALIASES[lowerStr] || str;
}

function detectColumns(headers, firstDataRow) {
  var result = { companyCol: -1, locationCol: -1, statusCol: -1, dateCol: -1, offset: 0 };
  if (firstDataRow && firstDataRow.length > 0) {
    var firstCell = firstDataRow[0];
    var firstHeader = headers[0] ? String(headers[0]).toLowerCase().trim() : '';
    if (firstCell instanceof Date && firstHeader !== 'timestamp') result.offset = 1;
  }
  for (var i = 0; i < headers.length; i++) {
    var h = String(headers[i]).toLowerCase().trim();
    if (result.companyCol === -1 && (h === 'company' || h === 'client' || h === 'company name' || h === 'client name' || h === 'customer' || h === 'work group' || h.indexOf('company') !== -1)) result.companyCol = i + result.offset;
    if (result.locationCol === -1 && (h === 'location' || h === 'site' || h === 'work location' || h === 'job location' || h === 'project location' || h === 'field location' || h.indexOf('location') !== -1)) result.locationCol = i + result.offset;
    if (result.statusCol === -1 && (h === 'status' || h === 'item status' || h === 'action status' || h.indexOf('status') !== -1)) result.statusCol = i + result.offset;
    if (result.dateCol === -1 && (h === 'timestamp' || h === 'date' || h === 'submitted' || h === 'date submitted' || h === 'observation date' || h === 'incident date')) result.dateCol = i + result.offset;
  }
  return result;
}

function findDataSheet(spreadsheet) {
  var sheets = spreadsheet.getSheets();
  var dataSheet = null, maxRows = 0;
  for (var i = 0; i < sheets.length; i++) {
    var name = sheets[i].getName().toLowerCase();
    if (name === 'dashboard data') continue;
    if (name.indexOf('data') !== -1 || name.indexOf('responses') !== -1 || name.indexOf('form') !== -1) {
      var rows = sheets[i].getLastRow();
      if (rows > maxRows) { maxRows = rows; dataSheet = sheets[i]; }
    }
  }
  if (!dataSheet) {
    for (var i = 0; i < sheets.length; i++) {
      var name = sheets[i].getName().toLowerCase();
      if (name.indexOf('dashboard') === -1 && name.indexOf('summary') === -1 && name.indexOf('chart') === -1) {
        var rows = sheets[i].getLastRow();
        if (rows > maxRows) { maxRows = rows; dataSheet = sheets[i]; }
      }
    }
  }
  return dataSheet || (sheets.length > 0 ? sheets[0] : null);
}

// ============================================================================
// ENERGY SOURCE & CONTROL DETECTION FUNCTIONS
// ============================================================================
function detectEnergyColumns(headers) {
  var energyCols = {};
  for (var i = 0; i < headers.length; i++) {
    var h = String(headers[i]).toLowerCase().trim();
    for (var energyType in ENERGY_COLUMN_PATTERNS) {
      var patterns = ENERGY_COLUMN_PATTERNS[energyType];
      for (var p = 0; p < patterns.length; p++) {
        if (h.indexOf(patterns[p]) !== -1) { energyCols[energyType] = i; break; }
      }
    }
  }
  return energyCols;
}

function detectControlColumns(headers) {
  var controlCols = {};
  for (var i = 0; i < headers.length; i++) {
    var h = String(headers[i]).toLowerCase().trim();
    for (var controlType in CONTROL_COLUMN_PATTERNS) {
      var patterns = CONTROL_COLUMN_PATTERNS[controlType];
      for (var p = 0; p < patterns.length; p++) {
        if (h.indexOf(patterns[p]) !== -1) { controlCols[controlType] = i; break; }
      }
    }
  }
  return controlCols;
}

function detectSIFColumns(headers) {
  var sifCols = {};
  for (var i = 0; i < headers.length; i++) {
    var h = String(headers[i]).toLowerCase().trim();
    for (var sifType in SIF_COLUMN_PATTERNS) {
      var patterns = SIF_COLUMN_PATTERNS[sifType];
      for (var p = 0; p < patterns.length; p++) {
        if (h.indexOf(patterns[p]) !== -1) { sifCols[sifType] = i; break; }
      }
    }
  }
  return sifCols;
}

function parseEnergyTypes(cellValue) {
  if (!cellValue) return [];
  var str = String(cellValue).trim();
  if (str === '' || str.toLowerCase() === 'no' || str.toLowerCase() === 'false' || str.toLowerCase() === 'none') return [];
  var types = [], parts = str.split(',');
  for (var i = 0; i < parts.length; i++) {
    var part = parts[i].trim();
    for (var j = 0; j < ENERGY_TYPES.length; j++) {
      if (part.toLowerCase().indexOf(ENERGY_TYPES[j].toLowerCase()) !== -1 && types.indexOf(ENERGY_TYPES[j]) === -1) types.push(ENERGY_TYPES[j]);
    }
  }
  return types;
}

function parseControlTypes(cellValue) {
  if (!cellValue) return [];
  var str = String(cellValue).trim();
  if (str === '' || str.toLowerCase() === 'no' || str.toLowerCase() === 'false' || str.toLowerCase() === 'none') return [];
  var types = [], parts = str.split(',');
  for (var i = 0; i < parts.length; i++) {
    var part = parts[i].trim();
    for (var j = 0; j < CONTROL_TYPES.length; j++) {
      if (part.toLowerCase().indexOf(CONTROL_TYPES[j].toLowerCase()) !== -1 && types.indexOf(CONTROL_TYPES[j]) === -1) types.push(CONTROL_TYPES[j]);
    }
  }
  return types;
}

function isYesValue(cellValue) {
  if (!cellValue) return false;
  var str = String(cellValue).toLowerCase().trim();
  return str === 'yes' || str === 'true' || str === '1' || str === 'y';
}

function getBestControlLevel(controls) {
  if (!controls || controls.length === 0) return 0;
  var best = 3;
  for (var i = 0; i < controls.length; i++) {
    var level = CONTROL_HIERARCHY[controls[i]] || 3;
    if (level < best) best = level;
  }
  return best;
}

// ============================================================================
// ENERGY SOURCE ANALYTICS PROCESSING
// ============================================================================
function processEnergySourceAnalytics(result, companyFilter, locationFilter, yearFilter) {
  var energyMetrics = {
    totalObservations: 0,
    byEnergyType: {},
    byControlType: {},
    byForm: {},
    controlQuality: { tier1Count: 0, tier2Count: 0, tier3Count: 0, noControlCount: 0 },
    energyControlMatrix: {},
    highEnergyWithWeakControls: [],
    controlHierarchyScore: 0
  };
  
  for (var i = 0; i < ENERGY_TYPES.length; i++) {
    energyMetrics.byEnergyType[ENERGY_TYPES[i]] = 0;
    energyMetrics.energyControlMatrix[ENERGY_TYPES[i]] = { tier1: 0, tier2: 0, tier3: 0, none: 0 };
  }
  for (var i = 0; i < CONTROL_TYPES.length; i++) energyMetrics.byControlType[CONTROL_TYPES[i]] = 0;
  
  for (var f = 0; f < ENERGY_SOURCE_FORMS.length; f++) {
    var formName = ENERGY_SOURCE_FORMS[f];
    var sheetId = SPREADSHEET_IDS[formName];
    if (!sheetId) continue;
    energyMetrics.byForm[formName] = { total: 0, energyTypes: {}, controlTypes: {} };
    
    try {
      var ss = SpreadsheetApp.openById(sheetId);
      var sheet = findDataSheet(ss);
      if (!sheet || sheet.getLastRow() < 2) continue;
      
      var lastCol = Math.min(sheet.getLastColumn(), 50);
      var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      var firstDataRow = sheet.getRange(2, 1, 1, lastCol).getValues()[0];
      var cols = detectColumns(headers, firstDataRow);
      var energyCols = detectEnergyColumns(headers);
      var controlCols = detectControlColumns(headers);
      
      var combinedEnergyCol = -1, combinedControlCol = -1;
      for (var h = 0; h < headers.length; h++) {
        var hdr = String(headers[h]).toLowerCase().trim();
        if (hdr === 'energy_types' || hdr === 'energy types' || hdr === 'energytypes') combinedEnergyCol = h;
        if (hdr === 'control_types' || hdr === 'control types' || hdr === 'controltypes') combinedControlCol = h;
      }
      
      var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, lastCol).getValues();
      
      for (var r = 0; r < data.length; r++) {
        var row = data[r];
        if (!isValidDataRow(row, cols)) continue;
        if (yearFilter && yearFilter !== 'All' && !isInYear(getRowDate(row), yearFilter)) continue;
        if (companyFilter && companyFilter !== 'All' && cols.companyCol >= 0 && normalizeCompany(row[cols.companyCol]) !== companyFilter) continue;
        if (locationFilter && locationFilter !== 'All' && cols.locationCol >= 0 && String(row[cols.locationCol]).trim() !== locationFilter) continue;
        
        var rowEnergies = [], rowControls = [];
        
        if (combinedEnergyCol >= 0 && row[combinedEnergyCol]) rowEnergies = parseEnergyTypes(row[combinedEnergyCol]);
        if (combinedControlCol >= 0 && row[combinedControlCol]) rowControls = parseControlTypes(row[combinedControlCol]);
        
        for (var energyType in energyCols) {
          if (energyCols[energyType] < row.length && isYesValue(row[energyCols[energyType]]) && rowEnergies.indexOf(energyType) === -1) rowEnergies.push(energyType);
        }
        for (var controlType in controlCols) {
          if (controlCols[controlType] < row.length && isYesValue(row[controlCols[controlType]]) && rowControls.indexOf(controlType) === -1) rowControls.push(controlType);
        }
        
        if (rowEnergies.length > 0) {
          energyMetrics.totalObservations++;
          energyMetrics.byForm[formName].total++;
          
          for (var e = 0; e < rowEnergies.length; e++) {
            var energy = rowEnergies[e];
            energyMetrics.byEnergyType[energy] = (energyMetrics.byEnergyType[energy] || 0) + 1;
            energyMetrics.byForm[formName].energyTypes[energy] = (energyMetrics.byForm[formName].energyTypes[energy] || 0) + 1;
          }
          
          for (var c = 0; c < rowControls.length; c++) {
            var control = rowControls[c];
            energyMetrics.byControlType[control] = (energyMetrics.byControlType[control] || 0) + 1;
            energyMetrics.byForm[formName].controlTypes[control] = (energyMetrics.byForm[formName].controlTypes[control] || 0) + 1;
          }
          
          var bestControlLevel = getBestControlLevel(rowControls);
          if (bestControlLevel === 1) energyMetrics.controlQuality.tier1Count++;
          else if (bestControlLevel === 2) energyMetrics.controlQuality.tier2Count++;
          else if (bestControlLevel === 3) energyMetrics.controlQuality.tier3Count++;
          else energyMetrics.controlQuality.noControlCount++;
          
          for (var e = 0; e < rowEnergies.length; e++) {
            var energy = rowEnergies[e];
            if (bestControlLevel === 1) energyMetrics.energyControlMatrix[energy].tier1++;
            else if (bestControlLevel === 2) energyMetrics.energyControlMatrix[energy].tier2++;
            else if (bestControlLevel === 3) energyMetrics.energyControlMatrix[energy].tier3++;
            else energyMetrics.energyControlMatrix[energy].none++;
          }
          
          var highEnergyTypes = ['Gravity', 'Electrical', 'Pressure', 'Chemical'];
          for (var e = 0; e < rowEnergies.length; e++) {
            if (highEnergyTypes.indexOf(rowEnergies[e]) !== -1 && bestControlLevel >= 3) {
              energyMetrics.highEnergyWithWeakControls.push({
                form: formName, energy: rowEnergies[e],
                controls: rowControls.length > 0 ? rowControls.join(', ') : 'None',
                company: cols.companyCol >= 0 ? String(row[cols.companyCol]) : 'Unknown',
                date: getRowDate(row)
              });
            }
          }
        }
      }
    } catch (e) {}
  }
  
  var totalWithControls = energyMetrics.controlQuality.tier1Count + energyMetrics.controlQuality.tier2Count + energyMetrics.controlQuality.tier3Count;
  if (totalWithControls > 0) {
    energyMetrics.controlHierarchyScore = Math.round((energyMetrics.controlQuality.tier1Count * 100 + energyMetrics.controlQuality.tier2Count * 60 + energyMetrics.controlQuality.tier3Count * 30) / totalWithControls);
  }
  
  // Sanitize data for JSON transfer - convert dates to strings
  energyMetrics.highEnergyWithWeakControls = energyMetrics.highEnergyWithWeakControls.slice(0, 10).map(function(item) {
    return {
      form: item.form || '',
      energy: item.energy || '',
      controls: item.controls || '',
      company: item.company || '',
      date: item.date ? item.date.toISOString() : ''
    };
  });
  result.energySourceMetrics = energyMetrics;
}

// ============================================================================
// SIF POTENTIAL ANALYTICS PROCESSING
// ============================================================================
function processSIFPotentialAnalytics(result, companyFilter, locationFilter, yearFilter) {
  var sifMetrics = {
    totalEvents: 0, sifPotentialCount: 0, sifPotentialRate: 0,
    byForm: {}, byEnergyType: {},
    directControlStatus: { effective: 0, failed: 0, alternativeOnly: 0, none: 0 },
    severityComparison: { actualLow: 0, actualMedium: 0, actualHigh: 0, potentialLow: 0, potentialMedium: 0, potentialHigh: 0, potentialExceededActual: 0 },
    sifEvents: []
  };
  
  for (var i = 0; i < ENERGY_TYPES.length; i++) sifMetrics.byEnergyType[ENERGY_TYPES[i]] = 0;
  
  for (var f = 0; f < SIF_POTENTIAL_FORMS.length; f++) {
    var formName = SIF_POTENTIAL_FORMS[f];
    var sheetId = SPREADSHEET_IDS[formName];
    if (!sheetId) continue;
    sifMetrics.byForm[formName] = { total: 0, sifPotential: 0 };
    
    try {
      var ss = SpreadsheetApp.openById(sheetId);
      var sheet = findDataSheet(ss);
      if (!sheet || sheet.getLastRow() < 2) continue;
      
      var lastCol = Math.min(sheet.getLastColumn(), 50);
      var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      var firstDataRow = sheet.getRange(2, 1, 1, lastCol).getValues()[0];
      var cols = detectColumns(headers, firstDataRow);
      var sifCols = detectSIFColumns(headers);
      var energyCols = detectEnergyColumns(headers);
      
      var psifCol = -1, highEnergyCol = -1, directControlCol = -1, energyTypeCol = -1;
      var actualSeverityCol = -1, potentialSeverityCol = -1;
      
      for (var h = 0; h < headers.length; h++) {
        var hdr = String(headers[h]).toLowerCase().trim();
        if (hdr.indexOf('psif') !== -1 || hdr.indexOf('sif_potential') !== -1 || hdr.indexOf('sif potential') !== -1 || hdr === 'stky' || hdr === 'stky_event') psifCol = h;
        if (hdr.indexOf('high_energy') !== -1 || hdr.indexOf('high energy') !== -1) highEnergyCol = h;
        if (hdr.indexOf('direct_control') !== -1 || hdr.indexOf('direct control') !== -1) directControlCol = h;
        if (hdr.indexOf('energy_type') !== -1 || hdr.indexOf('energy type') !== -1 || hdr === 'incident energy') energyTypeCol = h;
        if (hdr.indexOf('actual_severity') !== -1 || hdr.indexOf('actual severity') !== -1) actualSeverityCol = h;
        if (hdr.indexOf('potential_severity') !== -1 || hdr.indexOf('potential severity') !== -1) potentialSeverityCol = h;
      }
      
      if (psifCol === -1 && sifCols.sifPotential !== undefined) psifCol = sifCols.sifPotential;
      if (highEnergyCol === -1 && sifCols.highEnergy !== undefined) highEnergyCol = sifCols.highEnergy;
      if (directControlCol === -1 && sifCols.directControl !== undefined) directControlCol = sifCols.directControl;
      
      var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, lastCol).getValues();
      
      for (var r = 0; r < data.length; r++) {
        var row = data[r];
        if (!isValidDataRow(row, cols)) continue;
        if (yearFilter && yearFilter !== 'All' && !isInYear(getRowDate(row), yearFilter)) continue;
        if (companyFilter && companyFilter !== 'All' && cols.companyCol >= 0 && normalizeCompany(row[cols.companyCol]) !== companyFilter) continue;
        if (locationFilter && locationFilter !== 'All' && cols.locationCol >= 0 && String(row[cols.locationCol]).trim() !== locationFilter) continue;
        
        sifMetrics.totalEvents++;
        sifMetrics.byForm[formName].total++;
        
        var isSIFPotential = false;
        
        if (psifCol >= 0 && psifCol < row.length) {
          var psifVal = String(row[psifCol]).toLowerCase().trim();
          if (psifVal === 'yes' || psifVal === 'true' || psifVal === 'psif' || psifVal === 'sif' || psifVal === 'stky' || psifVal.indexOf('potential') !== -1) isSIFPotential = true;
        }
        
        if (!isSIFPotential && highEnergyCol >= 0 && highEnergyCol < row.length && isYesValue(row[highEnergyCol])) isSIFPotential = true;
        
        if (actualSeverityCol >= 0 && potentialSeverityCol >= 0) {
          var actualSev = String(row[actualSeverityCol]).toLowerCase().trim();
          var potentialSev = String(row[potentialSeverityCol]).toLowerCase().trim();
          var severityRank = { 'low': 1, 'minor': 1, 'first aid': 1, 'medium': 2, 'moderate': 2, 'medical': 2, 'high': 3, 'severe': 3, 'serious': 3, 'fatal': 4, 'fatality': 4 };
          var actualRank = severityRank[actualSev] || 0;
          var potentialRank = severityRank[potentialSev] || 0;
          
          if (actualRank > 0) {
            if (actualRank === 1) sifMetrics.severityComparison.actualLow++;
            else if (actualRank === 2) sifMetrics.severityComparison.actualMedium++;
            else sifMetrics.severityComparison.actualHigh++;
          }
          if (potentialRank > 0) {
            if (potentialRank === 1) sifMetrics.severityComparison.potentialLow++;
            else if (potentialRank === 2) sifMetrics.severityComparison.potentialMedium++;
            else sifMetrics.severityComparison.potentialHigh++;
          }
          if (potentialRank > actualRank && potentialRank >= 3) {
            sifMetrics.severityComparison.potentialExceededActual++;
            isSIFPotential = true;
          }
        }
        
        if (isSIFPotential) {
          sifMetrics.sifPotentialCount++;
          sifMetrics.byForm[formName].sifPotential++;
          
          if (directControlCol >= 0 && directControlCol < row.length) {
            var dcStatus = String(row[directControlCol]).toLowerCase().trim();
            if (dcStatus.indexOf('effective') !== -1) sifMetrics.directControlStatus.effective++;
            else if (dcStatus.indexOf('failed') !== -1) sifMetrics.directControlStatus.failed++;
            else if (dcStatus.indexOf('alternative') !== -1) sifMetrics.directControlStatus.alternativeOnly++;
            else if (dcStatus.indexOf('none') !== -1 || dcStatus === 'no') sifMetrics.directControlStatus.none++;
          }
          
          if (energyTypeCol >= 0 && energyTypeCol < row.length) {
            var energies = parseEnergyTypes(row[energyTypeCol]);
            for (var e = 0; e < energies.length; e++) sifMetrics.byEnergyType[energies[e]] = (sifMetrics.byEnergyType[energies[e]] || 0) + 1;
          } else {
            for (var energyType in energyCols) {
              if (energyCols[energyType] < row.length && isYesValue(row[energyCols[energyType]])) sifMetrics.byEnergyType[energyType] = (sifMetrics.byEnergyType[energyType] || 0) + 1;
            }
          }
          
          if (sifMetrics.sifEvents.length < 10) {
            sifMetrics.sifEvents.push({
              form: formName, date: getRowDate(row),
              company: cols.companyCol >= 0 ? String(row[cols.companyCol]) : 'Unknown',
              location: cols.locationCol >= 0 ? String(row[cols.locationCol]) : 'Unknown'
            });
          }
        }
      }
    } catch (e) {}
  }
  
  if (sifMetrics.totalEvents > 0) sifMetrics.sifPotentialRate = Math.round((sifMetrics.sifPotentialCount / sifMetrics.totalEvents) * 100);
  
  // Sanitize data for JSON transfer - convert dates to strings
  sifMetrics.sifEvents = sifMetrics.sifEvents.map(function(item) {
    return {
      form: item.form || '',
      date: item.date ? item.date.toISOString() : '',
      company: item.company || '',
      location: item.location || ''
    };
  });
  result.sifMetrics = sifMetrics;
}

// ============================================================================
// TRUECOST, LSR, INCIDENT INVESTIGATION (Same as V17)
// ============================================================================
function getTrueCostSummary(companyFilter, locationFilter, yearFilter) {
  var result = { totalCosts: 0, directCosts: 0, indirectCosts: 0, incidentsCosted: 0, avgCostPerIncident: 0, ratio: '0:1',
    byCategory: { medical: 0, labor: 0, equipment: 0, environmental: 0, legal: 0, operations: 0, insurance: 0, investigation: 0, communication: 0 },
    topCostCategory: 'None', hasData: false };
  try {
    var incidentSheetId = SPREADSHEET_IDS['Incident Investigation'];
    if (!incidentSheetId) return result;
    var ss = SpreadsheetApp.openById(incidentSheetId);
    var costSheet = ss.getSheetByName(TRUECOST_SHEET_NAME);
    if (!costSheet || costSheet.getLastRow() < 2) return result;
    var data = costSheet.getDataRange().getValues();
    var headers = data[0];
    var colMap = {};
    for (var i = 0; i < headers.length; i++) colMap[headers[i]] = i;
    var incidentInfo = {};
    var incidentsSheet = ss.getSheetByName('Incidents');
    if (incidentsSheet && incidentsSheet.getLastRow() > 1) {
      var incData = incidentsSheet.getRange(2, 1, incidentsSheet.getLastRow() - 1, 7).getValues();
      for (var i = 0; i < incData.length; i++) {
        var incId = String(incData[i][0]);
        if (incId) incidentInfo[incId] = { company: String(incData[i][6] || ''), location: String(incData[i][5] || ''), date: incData[i][3] };
      }
    }
    for (var r = 1; r < data.length; r++) {
      var row = data[r];
      var incidentId = String(row[colMap['Incident_ID']] || '');
      if (!incidentId) continue;
      var incInfo = incidentInfo[incidentId] || { company: '', location: '', date: null };
      if (yearFilter && yearFilter !== 'All' && !isInYear(incInfo.date, yearFilter)) continue;
      if (companyFilter && companyFilter !== 'All' && normalizeCompany(incInfo.company) !== companyFilter) continue;
      if (locationFilter && locationFilter !== 'All' && incInfo.location.trim() !== locationFilter) continue;
      var direct = parseFloat(row[colMap['Total_Direct_Costs']]) || 0;
      var indirect = parseFloat(row[colMap['Total_Indirect_Costs']]) || 0;
      var total = parseFloat(row[colMap['Total_All_Costs']]) || 0;
      if (total > 0) {
        result.hasData = true;
        result.incidentsCosted++;
        result.directCosts += direct;
        result.indirectCosts += indirect;
        result.totalCosts += total;
        result.byCategory.medical += parseFloat(row[colMap['Cat1_Medical_Subtotal']]) || 0;
        result.byCategory.labor += parseFloat(row[colMap['Cat2_Labor_Subtotal']]) || 0;
        result.byCategory.equipment += parseFloat(row[colMap['Cat3_Equipment_Subtotal']]) || 0;
        result.byCategory.environmental += parseFloat(row[colMap['Cat4_Environmental_Subtotal']]) || 0;
        result.byCategory.legal += parseFloat(row[colMap['Cat5_Legal_Subtotal']]) || 0;
        result.byCategory.operations += parseFloat(row[colMap['Cat6_Operations_Subtotal']]) || 0;
        result.byCategory.insurance += parseFloat(row[colMap['Cat7_Insurance_Subtotal']]) || 0;
        result.byCategory.investigation += parseFloat(row[colMap['Cat8_Investigation_Subtotal']]) || 0;
        result.byCategory.communication += parseFloat(row[colMap['Cat9_Communication_Subtotal']]) || 0;
      }
    }
    if (result.incidentsCosted > 0) result.avgCostPerIncident = Math.round(result.totalCosts / result.incidentsCosted);
    if (result.directCosts > 0) result.ratio = (result.indirectCosts / result.directCosts).toFixed(1) + ':1';
    var categories = [
      { name: 'Medical & Workers Comp', value: result.byCategory.medical },
      { name: 'Labor & Productivity', value: result.byCategory.labor },
      { name: 'Equipment & Property', value: result.byCategory.equipment },
      { name: 'Environmental', value: result.byCategory.environmental },
      { name: 'Regulatory & Legal', value: result.byCategory.legal },
      { name: 'Operations & Business', value: result.byCategory.operations },
      { name: 'Insurance & Risk', value: result.byCategory.insurance },
      { name: 'Investigation & CA', value: result.byCategory.investigation },
      { name: 'Communication & Rep', value: result.byCategory.communication }
    ];
    categories.sort(function(a, b) { return b.value - a.value; });
    if (categories[0].value > 0) result.topCostCategory = categories[0].name;
  } catch (e) {}
  return result;
}

function processLSRNeedsImprovement(result, companyFilter, locationFilter, yearFilter) {
  var needsImprovementItems = [];
  var lsrForms = [
    { name: 'LSR Driving', id: SPREADSHEET_IDS['LSR Driving'], category: 'Driving' },
    { name: 'LSR Energy Isolation', id: SPREADSHEET_IDS['LSR Energy Isolation'], category: 'Energy Isolation' },
    { name: 'LSR Fall Protection', id: SPREADSHEET_IDS['LSR Fall Protection'], category: 'Fall Protection' },
    { name: 'LSR Lifting Operations', id: SPREADSHEET_IDS['LSR Lifting Operations'], category: 'Lifting Operations' },
    { name: 'LSR Line of Fire', id: SPREADSHEET_IDS['LSR Line of Fire'], category: 'Line of Fire' },
    { name: 'LSR Work Permits', id: SPREADSHEET_IDS['LSR Work Permits'], category: 'Work Permits' },
    { name: 'LSR Confined Spaces', id: SPREADSHEET_IDS['LSR Confined Spaces'], category: 'Confined Space' }
  ];
  
  for (var f = 0; f < lsrForms.length; f++) {
    var formInfo = lsrForms[f];
    if (!formInfo.id) continue;
    try {
      var ss = SpreadsheetApp.openById(formInfo.id);
      var sheets = ss.getSheets();
      var dataSheet = null;
      for (var i = 0; i < sheets.length; i++) {
        var name = sheets[i].getName().toLowerCase();
        if (name.indexOf('data') !== -1 && name.indexOf('dashboard') === -1) { dataSheet = sheets[i]; break; }
      }
      if (!dataSheet || dataSheet.getLastRow() < 2) continue;
      var lastCol = Math.min(dataSheet.getLastColumn(), 40);
      var headers = dataSheet.getRange(1, 1, 1, lastCol).getValues()[0];
      var data = dataSheet.getRange(2, 1, dataSheet.getLastRow() - 1, lastCol).getValues();
      var companyCol = -1, locationCol = -1, dateCol = -1;
      for (var h = 0; h < headers.length; h++) {
        var hdr = String(headers[h]).toLowerCase().trim();
        if (hdr === 'company' || hdr === 'client' || hdr === 'client/work group' || hdr === 'work group') companyCol = h;
        if (hdr === 'location' || hdr === 'job location' || hdr === 'site location' || hdr === 'specify work area' || hdr === 'work area') locationCol = h;
        if (hdr === 'date' || hdr === 'timestamp' || hdr === 'audit date') dateCol = h;
      }
      for (var r = 0; r < data.length; r++) {
        var row = data[r];
        var rowDate = getRowDate(row);
        if (dateCol >= 0 && row[dateCol] instanceof Date) rowDate = row[dateCol];
        if (yearFilter && yearFilter !== 'All' && !isInYear(rowDate, yearFilter)) continue;
        var rowCompany = companyCol >= 0 ? normalizeCompany(row[companyCol]) : 'Unknown';
        var rowLocation = 'Unknown';
        if (locationCol >= 0) {
          var locVal = String(row[locationCol]).trim();
          var locLower = locVal.toLowerCase();
          if (locVal.length > 0 && locVal.length < 50 && locLower !== 'yes' && locLower !== 'no' && locLower !== 'n/a' && locLower !== 'needs improvement' && locLower !== 'ni') rowLocation = locVal;
        }
        if (companyFilter && companyFilter !== 'All' && rowCompany !== companyFilter) continue;
        if (locationFilter && locationFilter !== 'All' && rowLocation !== locationFilter) continue;
        for (var c = 0; c < row.length && c < headers.length; c++) {
          var val = String(row[c]).toLowerCase().trim();
          var header = String(headers[c]).trim();
          if (!header || header.length < 5) continue;
          var hdrLower = header.toLowerCase();
          if (hdrLower === 'timestamp' || hdrLower === 'date' || hdrLower.indexOf('name') !== -1 || hdrLower.indexOf('client') !== -1 || hdrLower.indexOf('company') !== -1 || hdrLower.indexOf('location') !== -1 || hdrLower.indexOf('area') !== -1 || hdrLower.indexOf('comment') !== -1 || hdrLower.indexOf('note') !== -1 || hdrLower.indexOf('opportunity') !== -1 || hdrLower.indexOf('list any') !== -1) continue;
          var noIsGood = (hdrLower.indexOf('no ') === 0 || hdrLower.indexOf('no knots') !== -1 || hdrLower.indexOf('no kinks') !== -1 || hdrLower.indexOf('no defects') !== -1 || hdrLower.indexOf('no damage') !== -1 || hdrLower.indexOf('no visible') !== -1 || hdrLower.indexOf('no signs of') !== -1 || hdrLower.indexOf('no cracks') !== -1 || hdrLower.indexOf('no leaks') !== -1 || hdrLower.indexOf('free of') !== -1 || hdrLower.indexOf('absence of') !== -1);
          var isNegativeResponse = false;
          if (val === 'needs improvement' || val === 'ni') isNegativeResponse = true;
          else if ((val === 'no' || val === 'n') && !noIsGood) isNegativeResponse = true;
          if (isNegativeResponse) {
            needsImprovementItems.push({ category: formInfo.category, question: header.length > 60 ? header.substring(0, 57) + '...' : header, company: rowCompany, location: rowLocation, date: rowDate, response: val === 'needs improvement' || val === 'ni' ? 'Needs Improvement' : 'No' });
          }
        }
      }
    } catch (e) {}
  }
  
  var questionCounts = {};
  for (var i = 0; i < needsImprovementItems.length; i++) {
    var item = needsImprovementItems[i];
    var key = item.category + ': ' + item.question;
    if (!questionCounts[key]) questionCounts[key] = { category: item.category, question: item.question, count: 0, companies: {}, locations: {} };
    questionCounts[key].count++;
    questionCounts[key].companies[item.company] = (questionCounts[key].companies[item.company] || 0) + 1;
    questionCounts[key].locations[item.location] = (questionCounts[key].locations[item.location] || 0) + 1;
  }
  var sortedIssues = [];
  for (var key in questionCounts) {
    var q = questionCounts[key];
    var topCompany = '', topCompanyCount = 0, topLocation = '', topLocationCount = 0;
    for (var comp in q.companies) { if (q.companies[comp] > topCompanyCount) { topCompanyCount = q.companies[comp]; topCompany = comp; } }
    for (var loc in q.locations) { if (q.locations[loc] > topLocationCount) { topLocationCount = q.locations[loc]; topLocation = loc; } }
    sortedIssues.push({ category: q.category, issue: q.question, count: q.count, topCompany: topCompany, topLocation: topLocation });
  }
  sortedIssues.sort(function(a, b) { return b.count - a.count; });
  result.areasNeedingFocus = sortedIssues.slice(0, 10);
  return needsImprovementItems.length;
}

function processIncidentInvestigation(result, openItemsList, companyFilter, locationFilter, yearFilter, today) {
  var sheetId = SPREADSHEET_IDS['Incident Investigation'];
  if (!sheetId) return;
  try {
    var ss = SpreadsheetApp.openById(sheetId);
    var incidentsSheet = ss.getSheetByName('Incidents');
    if (incidentsSheet && incidentsSheet.getLastRow() > 1) {
      var data = incidentsSheet.getRange(2, 1, incidentsSheet.getLastRow() - 1, 50).getValues();
      for (var r = 0; r < data.length; r++) {
        var row = data[r];
        var incidentId = row[0], status = String(row[2] || '').toLowerCase(), incidentDate = row[3];
        var location = String(row[5] || ''), company = String(row[6] || '');
        var incidentType = String(row[10] || '').toLowerCase(), actualOutcome = String(row[12] || '').toLowerCase();
        var envRelease = String(row[19] || '').toLowerCase();
        if (!incidentId || incidentId === '') continue;
        if (yearFilter && yearFilter !== 'All' && !isInYear(incidentDate, yearFilter)) continue;
        if (companyFilter && companyFilter !== 'All' && normalizeCompany(company) !== companyFilter) continue;
        if (locationFilter && locationFilter !== 'All' && location.trim() !== locationFilter) continue;
        result.laggingIndicators.totalIncidents++;
        if (status === 'closed' || status === 'complete' || status === 'completed') result.laggingIndicators.closedIncidents++;
        else {
          result.laggingIndicators.openIncidents++;
          if (incidentDate instanceof Date) {
            var daysOpen = Math.floor((today - incidentDate) / (1000 * 60 * 60 * 24));
            if (daysOpen > 0) openItemsList.push({ form: 'Incident Investigation', company: company || 'N/A', location: location || 'N/A', status: status || 'Open', daysOpen: daysOpen });
          }
        }
        if (actualOutcome.indexOf('first aid') !== -1 || incidentType.indexOf('first aid') !== -1) result.laggingIndicators.firstAid++;
        if (actualOutcome.indexOf('recordable') !== -1 || actualOutcome.indexOf('medical treatment') !== -1 || incidentType.indexOf('recordable') !== -1 || incidentType.indexOf('medical treatment') !== -1) result.laggingIndicators.recordable++;
        if (actualOutcome.indexOf('lost time') !== -1 || actualOutcome.indexOf('lwc') !== -1 || actualOutcome.indexOf('lti') !== -1 || incidentType.indexOf('lost time') !== -1 || incidentType.indexOf('lwc') !== -1 || incidentType.indexOf('lti') !== -1) result.laggingIndicators.lostTime++;
        if (incidentType.indexOf('vehicle') !== -1 || incidentType.indexOf('mvi') !== -1 || incidentType.indexOf('motor vehicle') !== -1 || incidentType.indexOf('driving') !== -1) result.laggingIndicators.vehicleIncidents++;
        if (envRelease === 'true' || envRelease === 'yes' || incidentType.indexOf('environmental') !== -1 || incidentType.indexOf('spill') !== -1 || incidentType.indexOf('release') !== -1) result.laggingIndicators.environmentalReleases++;
      }
    }
    var caSheet = ss.getSheetByName('Corrective Actions');
    if (caSheet && caSheet.getLastRow() > 1) {
      var caData = caSheet.getRange(2, 1, caSheet.getLastRow() - 1, 18).getValues();
      var incidentInfo = {};
      if (incidentsSheet && incidentsSheet.getLastRow() > 1) {
        var incData = incidentsSheet.getRange(2, 1, incidentsSheet.getLastRow() - 1, 7).getValues();
        for (var i = 0; i < incData.length; i++) {
          var incId = String(incData[i][0]);
          if (incId) incidentInfo[incId] = { location: String(incData[i][5] || ''), company: String(incData[i][6] || ''), date: incData[i][3] };
        }
      }
      for (var r = 0; r < caData.length; r++) {
        var caRow = caData[r];
        var incidentId = String(caRow[0] || ''), actionDesc = String(caRow[2] || '');
        var targetDate = caRow[9], actionStatus = String(caRow[14] || '').toLowerCase(), completionDate = caRow[15];
        if (!incidentId || incidentId === '') continue;
        var linkedInfo = incidentInfo[incidentId] || { location: 'N/A', company: 'N/A', date: null };
        if (yearFilter && yearFilter !== 'All' && !isInYear(linkedInfo.date, yearFilter)) continue;
        if (companyFilter && companyFilter !== 'All' && normalizeCompany(linkedInfo.company) !== companyFilter) continue;
        if (locationFilter && locationFilter !== 'All' && linkedInfo.location.trim() !== locationFilter) continue;
        var isOpen = !(actionStatus.indexOf('closed') !== -1 || actionStatus.indexOf('completed') !== -1 || actionStatus.indexOf('verified') !== -1 || completionDate instanceof Date);
        if (isOpen) {
          var daysOpen = 0, referenceDate = targetDate instanceof Date ? targetDate : (linkedInfo.date instanceof Date ? linkedInfo.date : null);
          if (referenceDate) { daysOpen = Math.floor((today - referenceDate) / (1000 * 60 * 60 * 24)); if (daysOpen < 0) daysOpen = 0; }
          var isOverdue = targetDate instanceof Date && targetDate < today;
          openItemsList.push({ form: 'Corrective Action', company: linkedInfo.company || 'N/A', location: linkedInfo.location || 'N/A', status: isOverdue ? 'OVERDUE' : (actionStatus || 'Open'), daysOpen: daysOpen, description: actionDesc.substring(0, 50) });
        }
      }
    }
  } catch (e) {}
}

function getLSRAuditCount(sheetId, yearFilter) {
  if (yearFilter && yearFilter !== 'All') return 0;
  try {
    var ss = SpreadsheetApp.openById(sheetId);
    var sheets = ss.getSheets();
    for (var i = 0; i < sheets.length; i++) {
      if (sheets[i].getName() === 'Dashboard Data') {
        var totalCell = sheets[i].getRange(2, 2).getValue();
        if (typeof totalCell === 'number') return totalCell;
        var parsed = parseInt(totalCell, 10);
        if (!isNaN(parsed)) return parsed;
      }
    }
  } catch (e) {}
  return 0;
}

// ============================================================================
// GET FILTER OPTIONS
// ============================================================================
function getFilterOptions() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get('filterOptions_v18');
  if (cached) { try { return JSON.parse(cached); } catch (e) {} }
  var companies = {}, locations = {}, years = {};
  var currentYear = new Date().getFullYear();
  for (var y = currentYear; y >= currentYear - 3; y--) years[y] = true;
  for (var i = 0; i < MASTER_COMPANIES.length; i++) companies[MASTER_COMPANIES[i]] = true;
  for (var i = 0; i < MASTER_LOCATIONS.length; i++) locations[MASTER_LOCATIONS[i]] = true;
  for (var i = 0; i < KEY_FILTER_SOURCES.length; i++) {
    var formName = KEY_FILTER_SOURCES[i];
    var sheetId = SPREADSHEET_IDS[formName];
    if (!sheetId) continue;
    try {
      var ss = SpreadsheetApp.openById(sheetId);
      var sheet = findDataSheet(ss);
      if (!sheet || sheet.getLastRow() < 2) continue;
      var lastCol = Math.min(sheet.getLastColumn(), 20);
      var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      var firstDataRow = sheet.getRange(2, 1, 1, lastCol).getValues()[0];
      var cols = detectColumns(headers, firstDataRow);
      var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, lastCol).getValues();
      for (var r = 0; r < data.length; r++) {
        var row = data[r];
        if (!isValidDataRow(row, cols)) continue;
        var rowDate = getRowDate(row);
        if (rowDate instanceof Date) { var year = rowDate.getFullYear(); if (year >= 2020 && year <= 2030) years[year] = true; }
        if (cols.companyCol >= 0 && cols.companyCol < row.length) {
          var companyVal = row[cols.companyCol];
          if (isValidFilterValue(companyVal)) { var normalized = normalizeCompany(companyVal); if (normalized && isValidFilterValue(normalized)) companies[normalized] = true; }
        }
        if (cols.locationCol >= 0 && cols.locationCol < row.length) {
          var locationVal = row[cols.locationCol];
          if (isValidFilterValue(locationVal)) { var locStr = String(locationVal).trim(); if (locStr.length > 0 && locStr.length < 100) locations[locStr] = true; }
        }
      }
    } catch (e) {}
  }
  var result = { companies: Object.keys(companies).sort(), locations: Object.keys(locations).sort(), years: Object.keys(years).sort().reverse() };
  try { cache.put('filterOptions_v18', JSON.stringify(result), 600); } catch (e) {}
  return result;
}

function refreshData() {
  var cache = CacheService.getScriptCache();
  cache.remove('filterOptions_v18');
  return { success: true, message: 'Refreshing data...' };
}

// ============================================================================
// GET DASHBOARD DATA - Main entry point
// ============================================================================
function getDashboardData(companyFilter, locationFilter, yearFilter, forceRefresh) {
  if (!yearFilter) yearFilter = String(new Date().getFullYear());
  if (!forceRefresh) {
    var cached = getCachedDashboardData(companyFilter, locationFilter, yearFilter);
    if (cached) return cached;
  }
  var result = calculateDashboardData(companyFilter, locationFilter, yearFilter);
  updateDashboardCache(companyFilter, locationFilter, yearFilter, result);
  return result;
}

// ============================================================================
// CALCULATE DASHBOARD DATA - VERSION 18 with Energy Source & SIF
// ============================================================================
function calculateDashboardData(companyFilter, locationFilter, yearFilter) {
  var result = {
    displayYear: yearFilter,
    safetyCultureIndex: 0,
    predictiveRiskScore: 0,
    bbsMetrics: { total: 0, safe: 0, atRisk: 0, safeRatio: 0, jobStops: 0, jobStopRate: 0, nearMisses: 0, potentialDamage: 0, byCategory: {} },
    nearMissMetrics: { totalReported: 0, fromBBS: 0, fromHazardID: 0, goodCatches: 0, nearMisses: 0 },
    hazardMetrics: { total: 0, highThreat: 0, mediumThreat: 0, lowThreat: 0 },
    leadingIndicators: { thas: 0, safetyMeetings: 0, toolboxMeetings: 0, stopTake5: 0, riskConversations: 0, mbwa: 0, lsrAudits: 0, hseContacts: 0 },
    laggingIndicators: { totalIncidents: 0, openIncidents: 0, closedIncidents: 0, firstAid: 0, recordable: 0, lostTime: 0, vehicleIncidents: 0, propertyDamage: 0, environmentalReleases: 0, sailOpen: 0, sailCritical: 0, sailOverdue: 0 },
    trueCost: { totalCosts: 0, directCosts: 0, indirectCosts: 0, incidentsCosted: 0, avgCostPerIncident: 0, ratio: '0:1', byCategory: {}, topCostCategory: 'None', hasData: false },
    aging: { avgDaysOpen: 0, over30Days: 0, over60Days: 0, over90Days: 0 },
    areasNeedingFocus: [],
    openItems: [],
    energySourceMetrics: { totalObservations: 0, byEnergyType: {}, byControlType: {}, byForm: {}, controlQuality: { tier1Count: 0, tier2Count: 0, tier3Count: 0, noControlCount: 0 }, energyControlMatrix: {}, highEnergyWithWeakControls: [], controlHierarchyScore: 0 },
    sifMetrics: { totalEvents: 0, sifPotentialCount: 0, sifPotentialRate: 0, byForm: {}, byEnergyType: {}, directControlStatus: { effective: 0, failed: 0, alternativeOnly: 0, none: 0 }, severityComparison: {}, sifEvents: [] },
    lastUpdated: new Date().toISOString()
  };
  
  var today = new Date();
  var openItemsList = [];
  var isFiltering = (companyFilter && companyFilter !== 'All') || (locationFilter && locationFilter !== 'All');
  var isYearFiltering = (yearFilter && yearFilter !== 'All');
  var bbsObservationsCount = 0;
  
  processIncidentInvestigation(result, openItemsList, companyFilter, locationFilter, yearFilter, today);
  var needsImprovementCount = processLSRNeedsImprovement(result, companyFilter, locationFilter, yearFilter);
  result.trueCost = getTrueCostSummary(companyFilter, locationFilter, yearFilter);
  processEnergySourceAnalytics(result, companyFilter, locationFilter, yearFilter);
  processSIFPotentialAnalytics(result, companyFilter, locationFilter, yearFilter);
  
  for (var formName in SPREADSHEET_IDS) {
    var sheetId = SPREADSHEET_IDS[formName];
    var formLower = formName.toLowerCase();
    if (formLower.indexOf('incident') !== -1 && formLower.indexOf('investigation') !== -1) continue;
    if (formLower.indexOf('lsr') !== -1) {
      if (!isFiltering && !isYearFiltering) result.leadingIndicators.lsrAudits += getLSRAuditCount(sheetId, yearFilter);
      continue;
    }
    try {
      var ss = SpreadsheetApp.openById(sheetId);
      var sheet = findDataSheet(ss);
      if (!sheet || sheet.getLastRow() < 2) continue;
      var lastCol = Math.min(sheet.getLastColumn(), 30);
      var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      var firstDataRow = sheet.getRange(2, 1, 1, lastCol).getValues()[0];
      var cols = detectColumns(headers, firstDataRow);
      var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, lastCol).getValues();
      
      for (var r = 0; r < data.length; r++) {
        var row = data[r];
        if (!isValidDataRow(row, cols)) continue;
        if (yearFilter && yearFilter !== 'All' && !isInYear(getRowDate(row), yearFilter)) continue;
        if (companyFilter && companyFilter !== 'All' && cols.companyCol >= 0 && normalizeCompany(row[cols.companyCol]) !== companyFilter) continue;
        if (locationFilter && locationFilter !== 'All' && cols.locationCol >= 0 && String(row[cols.locationCol]).trim() !== locationFilter) continue;
        
        if (formLower.indexOf('bbs') !== -1) {
          result.bbsMetrics.total++;
          bbsObservationsCount++;
          for (var c = 0; c < row.length && c < headers.length; c++) {
            var hdr = String(headers[c]).toLowerCase();
            var val = String(row[c]).toLowerCase().trim();
            if (hdr.indexOf('type') !== -1 && hdr.indexOf('observation') !== -1) {
              if (val === 'safe') result.bbsMetrics.safe++;
              else if (val === 'at-risk' || val === 'at risk' || val === 'atrisk' || val === 'unsafe') result.bbsMetrics.atRisk++;
            }
            if ((hdr.indexOf('job stop') !== -1 || hdr.indexOf('stop work') !== -1) && (val === 'yes' || val === 'true')) result.bbsMetrics.jobStops++;
            if (hdr.indexOf('near miss') !== -1 && (val === 'yes' || val === 'true')) { result.bbsMetrics.nearMisses++; result.nearMissMetrics.fromBBS++; }
            if ((hdr.indexOf('potential') !== -1 || hdr.indexOf('damage') !== -1) && (val === 'yes' || val === 'true')) result.bbsMetrics.potentialDamage++;
            if (hdr.indexOf('category') !== -1) { var catVal = String(row[c]).trim(); if (catVal && catVal.length > 0 && catVal.length < 50 && catVal.toLowerCase() !== 'safe' && catVal.toLowerCase() !== 'at-risk') result.bbsMetrics.byCategory[catVal] = (result.bbsMetrics.byCategory[catVal] || 0) + 1; }
          }
        }
        
        if (formLower.indexOf('hazard') !== -1) {
          result.hazardMetrics.total++;
          for (var c = 0; c < row.length && c < headers.length; c++) {
            var hdr = String(headers[c]).toLowerCase();
            var val = String(row[c]).toLowerCase();
            if (hdr.indexOf('threat') !== -1 || hdr.indexOf('severity') !== -1 || hdr.indexOf('risk') !== -1) {
              if (val.indexOf('high') !== -1 || val.indexOf('critical') !== -1) result.hazardMetrics.highThreat++;
              else if (val.indexOf('medium') !== -1 || val.indexOf('moderate') !== -1) result.hazardMetrics.mediumThreat++;
              else if (val.indexOf('low') !== -1) result.hazardMetrics.lowThreat++;
            }
            if (hdr.indexOf('near miss') !== -1 && (val === 'yes' || val === 'true')) result.nearMissMetrics.fromHazardID++;
          }
        }
        
        if (formLower.indexOf('good catch') !== -1 || formLower.indexOf('near miss') !== -1) {
          result.nearMissMetrics.totalReported++;
          for (var c = 0; c < row.length && c < headers.length; c++) {
            var hdr = String(headers[c]).toLowerCase();
            var val = String(row[c]).toLowerCase();
            if (hdr.indexOf('type') !== -1 || hdr.indexOf('category') !== -1) {
              if (val.indexOf('good catch') !== -1) result.nearMissMetrics.goodCatches++;
              if (val.indexOf('near miss') !== -1) result.nearMissMetrics.nearMisses++;
            }
          }
        }
        
        if (formLower.indexOf('tha') !== -1 || formLower.indexOf('jsa') !== -1) result.leadingIndicators.thas++;
        if (formLower.indexOf('safety meeting') !== -1 && formLower.indexOf('toolbox') === -1) result.leadingIndicators.safetyMeetings++;
        if (formLower.indexOf('toolbox') !== -1) result.leadingIndicators.toolboxMeetings++;
        if (formLower.indexOf('stop') !== -1 && formLower.indexOf('take 5') !== -1) result.leadingIndicators.stopTake5++;
        if (formLower.indexOf('risk control') !== -1 || formLower.indexOf('conversation') !== -1) result.leadingIndicators.riskConversations++;
        if (formLower.indexOf('mbwa') !== -1 || formLower.indexOf('walk around') !== -1) result.leadingIndicators.mbwa++;
        if (HSE_CONTACT_FORMS.indexOf(formName) !== -1) result.leadingIndicators.hseContacts++;
        if (formLower.indexOf('property damage') !== -1) result.laggingIndicators.propertyDamage++;
        
        if (formLower.indexOf('sail') !== -1 && cols.statusCol >= 0) {
          var sailStatus = String(row[cols.statusCol]).toLowerCase();
          if (sailStatus.indexOf('open') !== -1 || sailStatus.indexOf('pending') !== -1) {
            result.laggingIndicators.sailOpen++;
            for (var c = 0; c < row.length && c < headers.length; c++) {
              var hdr = String(headers[c]).toLowerCase();
              var val = String(row[c]).toLowerCase();
              if ((hdr.indexOf('priority') !== -1 || hdr.indexOf('severity') !== -1) && (val.indexOf('critical') !== -1 || val.indexOf('high') !== -1)) result.laggingIndicators.sailCritical++;
              if ((hdr.indexOf('target') !== -1 || hdr.indexOf('due') !== -1) && row[c] instanceof Date && row[c] < today) result.laggingIndicators.sailOverdue++;
            }
            if (cols.dateCol >= 0 && row[cols.dateCol] instanceof Date) {
              var sailDaysOpen = Math.floor((today - row[cols.dateCol]) / (1000 * 60 * 60 * 24));
              if (sailDaysOpen > 0) openItemsList.push({ form: 'SAIL Log', company: cols.companyCol >= 0 ? String(row[cols.companyCol]) : 'N/A', location: cols.locationCol >= 0 ? String(row[cols.locationCol]) : 'N/A', status: sailStatus, daysOpen: sailDaysOpen });
            }
          }
        }
      }
    } catch (e) {}
  }
  
  if (result.bbsMetrics.atRisk > 0) result.bbsMetrics.safeRatio = Math.round((result.bbsMetrics.safe / result.bbsMetrics.atRisk) * 10) / 10;
  else if (result.bbsMetrics.safe > 0) result.bbsMetrics.safeRatio = result.bbsMetrics.safe;
  if (result.bbsMetrics.atRisk > 0) result.bbsMetrics.jobStopRate = Math.round((result.bbsMetrics.jobStops / result.bbsMetrics.atRisk) * 100);
  else if (result.bbsMetrics.jobStops > 0 && result.bbsMetrics.total > 0) result.bbsMetrics.jobStopRate = Math.round((result.bbsMetrics.jobStops / result.bbsMetrics.total) * 100);
  
  var sciComponents = [];
  if (result.bbsMetrics.total > 0) sciComponents.push(Math.min(100, result.bbsMetrics.safeRatio * 20));
  if (result.bbsMetrics.atRisk > 0) sciComponents.push(Math.min(100, result.bbsMetrics.jobStopRate));
  if (bbsObservationsCount > 0) sciComponents.push(Math.min(100, result.nearMissMetrics.totalReported * 5));
  var leadingTotal = bbsObservationsCount + result.leadingIndicators.thas + result.leadingIndicators.safetyMeetings + result.leadingIndicators.toolboxMeetings + result.leadingIndicators.hseContacts;
  var laggingTotal = result.laggingIndicators.totalIncidents + result.laggingIndicators.propertyDamage;
  if (leadingTotal + laggingTotal > 0) sciComponents.push(Math.min(100, (leadingTotal / (leadingTotal + laggingTotal + 1)) * 100));
  if (result.energySourceMetrics.controlHierarchyScore > 0) sciComponents.push(result.energySourceMetrics.controlHierarchyScore);
  result.safetyCultureIndex = sciComponents.length > 0 ? Math.round(sciComponents.reduce(function(a, b) { return a + b; }, 0) / sciComponents.length) : 50;
  
  var riskFactors = [];
  if (result.bbsMetrics.safeRatio < 5) riskFactors.push(100 - (result.bbsMetrics.safeRatio * 20));
  if (result.bbsMetrics.atRisk > 0) riskFactors.push(Math.min(100, result.bbsMetrics.atRisk * 5));
  riskFactors.push(Math.min(100, result.laggingIndicators.openIncidents * 10));
  riskFactors.push(Math.min(100, result.laggingIndicators.sailOverdue * 15));
  riskFactors.push(Math.min(100, result.hazardMetrics.highThreat * 10));
  if (needsImprovementCount > 0) riskFactors.push(Math.min(100, needsImprovementCount * 3));
  if (result.sifMetrics.sifPotentialRate > 0) riskFactors.push(Math.min(100, result.sifMetrics.sifPotentialRate * 2));
  if (result.energySourceMetrics.highEnergyWithWeakControls.length > 0) riskFactors.push(Math.min(100, result.energySourceMetrics.highEnergyWithWeakControls.length * 10));
  if (result.energySourceMetrics.controlHierarchyScore > 0 && result.energySourceMetrics.controlHierarchyScore < 50) riskFactors.push(100 - result.energySourceMetrics.controlHierarchyScore);
  var dcFailures = result.sifMetrics.directControlStatus.failed + result.sifMetrics.directControlStatus.none;
  if (dcFailures > 0) riskFactors.push(Math.min(100, dcFailures * 15));
  result.predictiveRiskScore = riskFactors.length > 0 ? Math.round(riskFactors.reduce(function(a, b) { return a + b; }, 0) / riskFactors.length) : 0;
  
  if (openItemsList.length > 0) {
    var totalDays = 0;
    for (var i = 0; i < openItemsList.length; i++) {
      totalDays += openItemsList[i].daysOpen;
      if (openItemsList[i].daysOpen > 90) result.aging.over90Days++;
      else if (openItemsList[i].daysOpen > 60) result.aging.over60Days++;
      else if (openItemsList[i].daysOpen > 30) result.aging.over30Days++;
    }
    result.aging.avgDaysOpen = Math.round(totalDays / openItemsList.length);
    openItemsList.sort(function(a, b) { return b.daysOpen - a.daysOpen; });
    result.openItems = openItemsList.slice(0, 10);
  }
  // Trim large arrays to prevent response size issues
  if (result.energySourceMetrics && result.energySourceMetrics.highEnergyWithWeakControls) {
    result.energySourceMetrics.highEnergyWithWeakControls = result.energySourceMetrics.highEnergyWithWeakControls.slice(0, 5);
  }
  if (result.sifMetrics && result.sifMetrics.sifEvents) {
    result.sifMetrics.sifEvents = result.sifMetrics.sifEvents.slice(0, 5);
  }
  if (result.openItems) {
    result.openItems = result.openItems.slice(0, 5);
  }
  if (result.areasNeedingFocus) {
    result.areasNeedingFocus = result.areasNeedingFocus.slice(0, 5);
  }
  return result;
}

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Dashboard')
    .setTitle('SLP Safety Analytics')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function testDashboard() {
  var result = getDashboardData('All', 'All', '2025', true);
  var jsonString = JSON.stringify(result);
  Logger.log('Data size: ' + jsonString.length + ' characters');
  Logger.log('Got data: ' + (result ? 'yes' : 'null'));
}

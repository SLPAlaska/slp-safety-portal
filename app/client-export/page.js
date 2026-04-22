'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://iypezirwdlqpptjpeeyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
);

const COMPANY_CREDENTIALS = {
  'MAGTEC2026': { company: 'MagTec Alaska', searchTerms: ['MagTec', 'Mag Tec', 'MagTec Alaska'], password: 'PSA2026$$SLP' },
  'POLLARD2026': { company: 'Pollard Wireline', searchTerms: ['Pollard', 'Pollard Wireline'], password: 'PSA2026$$SLP' },
  'AKELINE2026': { company: 'AKE-Line', searchTerms: ['AKE-Line', 'AKE Line', 'AKELINE'], password: 'PSA2026$$SLP' },
  'GBR2026': { company: 'GBR Equipment', searchTerms: ['GBR', 'GBR Equipment'], password: 'PSA2026$$SLP' },
  'CHOSEN2026': { company: 'Chosen Construction', searchTerms: ['Chosen', 'Chosen Construction'], password: 'PSA2026$$SLP' },
  'YELLOWJACKET2026': { company: 'Yellowjacket', searchTerms: ['Yellowjacket', 'Yellow Jacket'], password: 'PSA2026$$SLP' },
  'PENINSULA2026': { company: 'Peninsula Paving', searchTerms: ['Peninsula', 'Peninsula Paving'], password: 'PSA2026$$SLP' },
  'CINGSA2026': { company: 'CINGSA', searchTerms: ['CINGSA'], password: 'PSA2026$$SLP' },
  'NARWHAL2026': { company: 'Narwhal Exploration', searchTerms: ['Narwhal', 'Narwhal Exploration'], password: 'PSA2026$$SLP' },
  'HARVEST2026': { company: 'Harvest Midstream', searchTerms: ['Harvest Midstream', 'Harvest'], password: 'PSA2026$$SLP' },
};

// Categories mirror portal homepage exactly (excluding PSA tools, ASH Book, Client Export)
// Tables that use a different column name for company
const COMPANY_COLUMN_MAP = {
  'bbs_observations': 'client_company',
  'pressure_crosscheck': 'client_company',
  'sail_log': 'client_company',
  'toolbox_meeting_assessment': 'client',
  'incidents': 'company_name',
  'lessons_learned': 'company_name',
  'management_of_change': 'company'  // Added company column
};

const FORM_CATEGORIES = {
  'Training & Competency': {
    icon: '\u{1F3AF}',
    forms: {
      'Aerial Lift Practical Evaluation': 'aerial_lift_evaluations',
      'Crane/Boom Truck Practical Evaluation': 'crane_boom_evaluations',
      'Excavator Practical Evaluation': 'excavator_evaluations',
      'Forklift Practical Evaluation': 'forklift_evaluations',
      'Loader Practical Evaluation': 'loader_evaluations',
    }
  },
  'Field Forms': {
    icon: '\u{1F4CB}',
    forms: {
      'BBS Observation': 'bbs_observations',
      'Cold Weather Operating Risk Assessment': 'cold_weather_assessments',
      'Dropped Object Prevention Audit': 'dropped_object_audits',
      'E-Line Safety Audit': 'eline_safety_audits',
      'EHS Field Evaluation': 'ehs_field_evaluations',
      'Field Environmental Audit': 'field_environmental_audits',
      'Flammable Storage Audit': 'flammable_storage_audits',
      'Fluid Transfer Permit Audit': 'fluid_transfer_audits',
      'Good Catch / Near Miss': 'good_catch_near_miss',
      'Hazard ID Report': 'hazard_id_reports',
      'Journey Management': 'journey_management',
      'Location Audit Report': 'location_audit_reports',
      'Manage By Walk Around': 'mbwa',
      'Phase Condition Risk Assessment': 'phase_condition_risk_assessment',
      'Pressure Cross Check': 'pressure_crosscheck',
      'Risk Control Conversation': 'risk_control_conversations',
      'SAIL Log Entry': 'sail_log',
      'Slickline Safety Audit': 'slickline_safety_audits',
      'STOP & Take 5': 'stop_take_5',
      'Surface Condition Audit': 'surface_condition_audits',
      'SWPPP Inspection': 'swppp_inspection',
      'Task/Crew Audit': 'task_crew_audits',
      'Toolbox Meeting Quality Assessment': 'toolbox_meeting_assessment',
      'Welding/Fab Shop Audit': 'welding_fab_shop_audits',
      'Welding/Grinding Audit': 'welding_grinding_audits',
    }
  },
  'Monthly Inspections': {
    icon: '\u{1F4C5}',
    forms: {
      'Chain Hoist Inspection': 'chain_hoist_inspections',
      'Emergency Drill Evaluation': 'emergency_drill_evaluations',
      'Emergency Eyewash Inspection': 'eyewash_station_inspections',
      'Fall Protection Harness Inspection': 'harness_inspections',
      'Fire Extinguisher Inspection': 'fire_extinguisher_inspections',
      'First Aid Kit Inspection': 'first_aid_kit_inspections',
      'Ladder Inspection': 'ladder_inspections',
      'Lanyard & SRL Inspection': 'lanyard_srl_inspections',
      'Monthly AED Inspection': 'aed_inspections',
      'Shackle Inspection': 'shackle_inspections',
      'Synthetic Sling Inspection': 'synthetic_sling_inspections',
      'Wire Rope Inspection': 'wire_rope_inspections',
    }
  },
  'Permits': {
    icon: '\u{1F4DD}',
    forms: {
      'Confined Space Entry': 'cse_permits',
      'Energized Electrical Work': 'eew_permits',
      'Energy Isolation / LOTO': 'ei_permits',
      'Excavation & Trenching': 'excavation_permits',
      'Hot Work': 'hot_work_permits',
      'Opening & Blinding': 'opening_blinding_permits',
      'Unit Work Permit': 'unit_work_permits',
    }
  },
  'Lifesaving Rules Audits': {
    icon: '\u{1F6E1}\u{FE0F}',
    forms: {
      'LSR-Confined Space Audit': 'lsr_confined_space_audits',
      'LSR-Driving Audit': 'lsr_driving_audits',
      'LSR-Energy Isolation': 'lsr_energy_isolation_audits',
      'LSR-Fall Protection': 'lsr_fall_protection_audits',
      'LSR-Lifting Operations': 'lsr_lifting_operations_audits',
      'LSR-Line of Fire': 'lsr_line_of_fire_audits',
      'LSR-Work Permits': 'lsr_work_permits_audits',
    }
  },
  'Equipment Inspections': {
    icon: '\u{1F69B}',
    forms: {
      'Heavy Equipment': 'heavy_equipment_inspections',
      'Crane Inspection': 'crane_inspections',
      'Forklift Inspection': 'forklift_inspections',
      'Vehicle Inspection': 'vehicle_inspections',
    }
  },
  'Daily Forms': {
    icon: '\u{2600}\u{FE0F}',
    forms: {
      'Daily Scaffold Inspection': 'scaffold_inspections',
      'Exc. & Trench Competent Person Daily Inspection': 'competent_person_inspections',
      'THA / JSA': 'tha_assessments',
    }
  },
  'Incident & Investigation': {
    icon: '\u{1F6A8}',
    forms: {
      'Incident Report': 'incidents',
      'Property Damage Report': 'property_damage_reports',
      'Witness Statement': 'witness_statements',
      'Corrective Actions': 'investigation_corrective_actions',
      'Lessons Learned': 'lessons_learned',
    }
  },
  'Management of Change': {
    icon: '\u{1F504}',
    forms: {
      'Management of Change': 'management_of_change',
    }
  },
  'HSE & Manager Daily Activity Log': {
    icon: '\u{1F4CA}',
    forms: {
      'Manager & HSE Activity Log': 'manager_hse_daily_logs',
    }
  },
  'Critical Lift Plans': {
    icon: '\u{1F3D7}\u{FE0F}',
    forms: {
      'Critical Lift Plans': 'critical_lift_plans',
    }
  },
  'Fall Protection Plan': {
    icon: '\u{1FAA2}',
    forms: {
      'Fall Protection Plan': 'fall_protection_plans',
    }
  },
  'Short Service Employee Evaluation': {
    icon: '\u{1F477}',
    forms: {
      'SSE Evaluation': 'sse_evaluations',
    }
  },
  'Seasonal Inspections': {
    icon: '\u{1F328}\u{FE0F}',
    forms: {
      'Spill Kit Inspection': 'spill_kit_inspections',
      'Weekly Tank Farm Inspection': 'weekly_tank_inspections',
    }
  },
  'Safety Meeting Form': {
    icon: '\u{1F465}',
    forms: {
      'Safety Meeting': 'safety_meetings',
    }
  },
  'PPE Inspection Form': {
    icon: '\u{1F9BA}',
    forms: {
      'Comprehensive PPE Inspection': 'ppe_inspections',
    }
  },
};

const DATE_RANGES = ['Last Week', 'Last Month', 'Last 3 Months', 'Last Year', 'Year to Date', 'Custom Range'];

const LOCATIONS = [
  'All', 'Kenai', 'CIO', 'Beaver Creek', 'Swanson River', 'Ninilchik', 'Nikiski', 'Other Kenai Asset',
  'Deadhorse', 'Prudhoe Bay', 'Kuparuk', 'Alpine', 'Willow', 'ENI', 'PIKKA',
  'Point Thompson', 'North Star Island', 'Endicott', 'Badami', 'West Harrison Bay', 'Other North Slope'
];

export default function ClientExport() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [companyCode, setCompanyCode] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [searchTerms, setSearchTerms] = useState([]);
  const [error, setError] = useState('');

  const [selectedForms, setSelectedForms] = useState({});
  const [dateRange, setDateRange] = useState('Year to Date');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState('');
  const [exportResults, setExportResults] = useState(null);
  const [openCategories, setOpenCategories] = useState({});

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');
    const cred = COMPANY_CREDENTIALS[companyCode.toUpperCase()];
    if (!cred) { setError('Invalid company code'); return; }
    if (cred.password !== password) { setError('Invalid password'); return; }
    setCompanyName(cred.company);
    setSearchTerms(cred.searchTerms);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCompanyCode('');
    setPassword('');
    setCompanyName('');
    setSearchTerms([]);
    setSelectedForms({});
    setExportResults(null);
    setExportStatus('');
  };

  const toggleCategory = (cat) => {
    setOpenCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const toggleFormSelection = (formName) => {
    setSelectedForms(prev => ({ ...prev, [formName]: !prev[formName] }));
  };

  const selectAllInCategory = (category) => {
    const forms = FORM_CATEGORIES[category].forms;
    setSelectedForms(prev => {
      const updated = { ...prev };
      Object.keys(forms).forEach(f => updated[f] = true);
      return updated;
    });
  };

  const selectAllForms = () => {
    const all = {};
    Object.values(FORM_CATEGORIES).forEach(cat => {
      Object.keys(cat.forms).forEach(f => all[f] = true);
    });
    setSelectedForms(all);
  };

  const deselectAllForms = () => setSelectedForms({});

  const getDateRange = () => {
    const now = new Date();
    let start, end = now.toISOString();
    switch (dateRange) {
      case 'Last Week':
        start = new Date(now - 7 * 86400000).toISOString(); break;
      case 'Last Month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).toISOString(); break;
      case 'Last 3 Months':
        start = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()).toISOString(); break;
      case 'Last Year':
        start = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString(); break;
      case 'Year to Date':
        start = new Date(now.getFullYear(), 0, 1).toISOString(); break;
      case 'Custom Range':
        start = customStartDate ? new Date(customStartDate).toISOString() : new Date(now.getFullYear(), 0, 1).toISOString();
        end = customEndDate ? new Date(customEndDate + 'T23:59:59').toISOString() : now.toISOString();
        break;
      default:
        start = new Date(now.getFullYear(), 0, 1).toISOString();
    }
    return { start, end };
  };

  const selectedCount = Object.values(selectedForms).filter(Boolean).length;
  const totalFormCount = Object.values(FORM_CATEGORIES).reduce((sum, cat) => sum + Object.keys(cat.forms).length, 0);

  const handleExport = async () => {
    const selected = Object.entries(selectedForms).filter(([_, v]) => v);
    if (selected.length === 0) { setExportStatus('Please select at least one form type.'); return; }

    setExporting(true);
    setExportStatus('Querying database...');
    setExportResults(null);

    const { start, end } = getDateRange();

    const results = {};
    let totalRecords = 0;
    let errorList = [];

    const tableMap = {};
    Object.values(FORM_CATEGORIES).forEach(cat => {
      Object.entries(cat.forms).forEach(([name, table]) => { tableMap[name] = table; });
    });

    for (const [formName] of selected) {
      const table = tableMap[formName];
      if (!table) { continue; }

      try {
        setExportStatus('Querying ' + formName + '...');

        const companyCol = COMPANY_COLUMN_MAP.hasOwnProperty(table) ? COMPANY_COLUMN_MAP[table] : 'company';
        
        let query = supabase
          .from(table)
          .select('*')
          .gte('created_at', start)
          .lte('created_at', end);
        
        // Filter by company — OR across all search terms to catch alternate names
        if (companyCol && searchTerms.length > 0) {
          const orFilter = searchTerms.map(term => `${companyCol}.ilike.%${term}%`).join(',');
          query = query.or(orFilter);
        }
        
        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) {
          console.error('Query error for', table, ':', error);
          errorList.push(formName + ': ' + error.message);
        } else if (data && data.length > 0) {
          if (selectedLocation !== 'All') {
            const filtered = data.filter(row => row.location && row.location.toLowerCase().includes(selectedLocation.toLowerCase()));
            if (filtered.length > 0) {
              results[formName] = filtered;
              totalRecords += filtered.length;
            }
          } else {
            results[formName] = data;
            totalRecords += data.length;
          }
        }
      } catch (err) {
        console.error('Catch error for', formName, ':', err);
        errorList.push(formName + ': ' + err.message);
      }
    }

    if (totalRecords === 0 && errorList.length === 0) {
      setExportStatus('No records found for ' + companyName + ' in the selected date range and forms.');
    } else if (totalRecords === 0 && errorList.length > 0) {
      setExportStatus('Query errors occurred: ' + errorList.join('; '));
    } else {
      let msg = 'Found ' + totalRecords + ' records across ' + Object.keys(results).length + ' form types.';
      if (errorList.length > 0) { msg += ' (' + errorList.length + ' form types had errors)'; }
      setExportStatus(msg);
      setExportResults(results);
    }

    setExporting(false);
  };

  const NICE_HEADERS = {
    id: 'ID', created_at: 'Created', tha_number: 'THA Number', status: 'Status', date: 'Date',
    company: 'Company', location: 'Location', work_area: 'Work Area', crew_lead: 'Crew Lead',
    phone_radio: 'Phone/Radio', task_description: 'Task Description', job_planning_notes: 'Job Planning Notes',
    procedure_exists: 'Procedure Exists', procedure_reviewed: 'Procedure Reviewed',
    driving_backing: 'Driving/Backing', walkaround_360: '360 Walkaround', seatbelts_checked: 'Seatbelts',
    spotter_when_backing: 'Spotter When Backing', load_secured: 'Load Secured',
    general_items: 'General Items', ppe_requirements: 'PPE Requirements', permits_required: 'Permits Required',
    potential_hazards: 'Potential Hazards', energy_types: 'Energy Types', control_types: 'Control Types',
    quality_score: 'Quality Score', quality_grade: 'Grade', quality_notes: 'Quality Notes',
    good_controls_count: 'Good Controls', awareness_only_count: 'Awareness Only',
    photo_url: 'Photo', pdf_url: 'PDF', scope_changed: 'Scope Changed',
    tha_updated_if_changed: 'THA Updated', client_rep_visited: 'Client Rep Visited',
    hse_visited: 'HSE Visited', job_stopped: 'Job Stopped', housekeeping_complete: 'Housekeeping Complete',
    all_permits_closed: 'Permits Closed', info_passed_to_oncoming: 'Info to Oncoming',
    aar_went_well: 'AAR Went Well', aar_didnt_go_as_planned: 'AAR Issues',
    aar_how_improve: 'AAR Improvements', lessons_learned: 'Lessons Learned',
    crew_comments: 'Crew Comments', closed_by: 'Closed By', closed_at: 'Closed At',
    last_modified: 'Last Modified', inspector_name: 'Inspector', inspector_phone: 'Phone',
    tank_farm_id: 'Tank Farm ID', result: 'Result', notes: 'Notes',
    submitted_by: 'Submitted By', submitted_at: 'Submitted At',
  };

  const formatHeader = (key) => NICE_HEADERS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  const formatCell = (val) => {
    if (val === null || val === undefined || val === '') return '';
    if (typeof val === 'object') {
      try {
        const entries = Object.entries(val).filter(([_, v]) => v === true);
        return entries.map(([k]) => k).join(', ') || JSON.stringify(val);
      } catch (e) { return String(val); }
    }
    return String(val);
  };

  const SKIP_COLS = ['id', 'photo_url', 'photo_urls', 'pdf_url', 'last_modified'];

  const getVisibleHeaders = (data) => {
    if (!data || data.length === 0) return [];
    return Object.keys(data[0]).filter(h => !SKIP_COLS.includes(h));
  };

  const downloadExcel = (formName, data) => {
    if (!data || data.length === 0) return;
    const headers = getVisibleHeaders(data);

    let html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">';
    html += '<head><meta charset="utf-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>' + formName + '</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->';
    html += '<style>td,th{font-family:Calibri;font-size:12pt;text-align:center;vertical-align:middle;border:1px solid #ccc;padding:6px 10px;}th{font-weight:bold;background-color:#1e3a5f;color:white;}.title{font-size:16pt;font-weight:bold;text-align:center;border:none;color:#1e3a5f;}.subtitle{font-size:10pt;text-align:center;border:none;color:#666;}.footer{font-size:9pt;text-align:center;border:none;color:#999;font-style:italic;}</style></head><body>';

    html += '<table>';
    html += '<tr><td colspan="' + headers.length + '" class="title">SLP Alaska - ' + companyName + '</td></tr>';
    html += '<tr><td colspan="' + headers.length + '" class="subtitle">' + formName + ' | Exported: ' + new Date().toLocaleDateString() + ' | Records: ' + data.length + '</td></tr>';
    html += '<tr><td colspan="' + headers.length + '"></td></tr>';

    html += '<tr>';
    headers.forEach(h => { html += '<th>' + formatHeader(h) + '</th>'; });
    html += '</tr>';

    data.forEach(row => {
      html += '<tr>';
      headers.forEach(h => { html += '<td>' + formatCell(row[h]).replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</td>'; });
      html += '</tr>';
    });

    html += '<tr><td colspan="' + headers.length + '"></td></tr>';
    html += '<tr><td colspan="' + headers.length + '" class="footer">AnthroSafe\u2122 Field Driven Safety \u00A9 2026 SLP Alaska, LLC | Safety \u2022 Leadership \u2022 Performance</td></tr>';
    html += '</table></body></html>';

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = companyName.replace(/\s+/g, '_') + '_' + formName.replace(/[\s\/]+/g, '_') + '_' + new Date().toISOString().split('T')[0] + '.xls';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAllExcel = () => {
    if (!exportResults) return;
    Object.entries(exportResults).forEach(([formName, data], i) => {
      setTimeout(() => downloadExcel(formName, data), i * 200);
    });
  };

  const printPDF = (formName, data) => {
    if (!data || data.length === 0) return;
    const headers = getVisibleHeaders(data);
    const win = window.open('', '_blank');
    if (!win) { alert('Please allow pop-ups to print reports.'); return; }

    let html = '<!DOCTYPE html><html><head><title>' + companyName + ' - ' + formName + '</title>';
    html += '<style>';
    html += '@page{size:landscape;margin:0.5in;}';
    html += 'body{font-family:Calibri,sans-serif;font-size:10pt;color:#333;margin:0;padding:20px;}';
    html += '.header{text-align:center;margin-bottom:20px;border-bottom:3px solid #1e3a5f;padding-bottom:15px;}';
    html += '.header img{height:60px;margin-bottom:8px;}';
    html += '.header h1{font-size:18pt;color:#1e3a5f;margin:5px 0;}';
    html += '.header h2{font-size:12pt;color:#b91c1c;margin:3px 0;font-weight:normal;}';
    html += '.header p{font-size:9pt;color:#666;margin:2px 0;}';
    html += 'table{width:100%;border-collapse:collapse;margin-top:10px;page-break-inside:auto;}';
    html += 'tr{page-break-inside:avoid;page-break-after:auto;}';
    html += 'th{background:#1e3a5f;color:white;font-weight:bold;font-size:9pt;padding:6px 4px;text-align:center;border:1px solid #ccc;}';
    html += 'td{font-size:9pt;padding:5px 4px;text-align:center;border:1px solid #ddd;word-wrap:break-word;max-width:200px;}';
    html += 'tr:nth-child(even) td{background:#f8fafc;}';
    html += '.footer{text-align:center;margin-top:20px;padding-top:10px;border-top:2px solid #1e3a5f;font-size:8pt;color:#999;}';
    html += '.stats{display:flex;justify-content:center;gap:30px;margin:10px 0;font-size:10pt;}';
    html += '.stats span{background:#f0f9ff;padding:4px 12px;border-radius:4px;border:1px solid #bae6fd;}';
    html += '@media print{body{padding:0;}.no-print{display:none !important;}}';
    html += '</style></head><body>';

    html += '<div class="header">';
    html += '<img src="/Logo.png" alt="SLP Alaska" onerror="this.style.display=\'none\'">';
    html += '<h1>SLP Alaska</h1>';
    html += '<h2>' + formName + ' Report</h2>';
    html += '<p>' + companyName + ' | ' + (selectedLocation === 'All' ? 'All Locations' : selectedLocation) + ' | ' + dateRange + '</p>';
    html += '<div class="stats"><span><strong>' + data.length + '</strong> Records</span><span>Exported: ' + new Date().toLocaleDateString() + '</span></div>';
    html += '</div>';

    html += '<button class="no-print" onclick="window.print()" style="background:#1e3a5f;color:white;border:none;padding:10px 30px;border-radius:6px;font-size:12pt;cursor:pointer;display:block;margin:0 auto 15px;">Print / Save PDF</button>';

    html += '<table><thead><tr>';
    headers.forEach(h => { html += '<th>' + formatHeader(h) + '</th>'; });
    html += '</tr></thead><tbody>';

    data.forEach(row => {
      html += '<tr>';
      headers.forEach(h => { html += '<td>' + formatCell(row[h]).replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</td>'; });
      html += '</tr>';
    });

    html += '</tbody></table>';
    html += '<div class="footer">';
    html += '<p>AnthroSafe\u2122 Field Driven Safety \u00A9 2026 SLP Alaska, LLC</p>';
    html += '<p>Safety \u2022 Leadership \u2022 Performance | (907) 202-3274</p>';
    html += '</div></body></html>';

    win.document.write(html);
    win.document.close();
  };

  const printAllPDF = () => {
    if (!exportResults) return;
    Object.entries(exportResults).forEach(([formName, data], i) => {
      setTimeout(() => printPDF(formName, data), i * 500);
    });
  };

  const s = {
    wrapper: { minHeight: '100vh', background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)', padding: '15px', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" },
    container: { maxWidth: '900px', margin: '0 auto' },
    header: { textAlign: 'center', padding: '30px 20px 20px', color: 'white' },
    logo: { maxWidth: '80px', maxHeight: '80px' },
    logoBox: { width: '100px', height: '100px', background: 'white', borderRadius: '16px', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' },
    title: { fontSize: '26px', fontWeight: '700', marginBottom: '4px' },
    subtitle: { fontSize: '13px', color: 'rgba(255,255,255,0.8)', marginBottom: '15px' },
    loginCard: { background: 'white', borderRadius: '12px', padding: '30px', maxWidth: '400px', margin: '20px auto', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' },
    input: { width: '100%', padding: '12px 14px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', marginBottom: '12px', boxSizing: 'border-box' },
    btnPrimary: { width: '100%', padding: '12px', background: 'linear-gradient(135deg, #b91c1c 0%, #991b1b 100%)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' },
    btnSmall: { padding: '6px 14px', background: '#e2e8f0', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: '500' },
    btnExport: { padding: '14px 28px', background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', width: '100%' },
    btnDownload: { padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: '500' },
    section: { background: 'rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px', marginBottom: '15px', border: '1px solid rgba(255,255,255,0.1)' },
    sectionTitle: { color: '#fbbf24', fontSize: '14px', fontWeight: '700', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' },
    categoryHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255,255,255,0.06)', borderRadius: '8px', cursor: 'pointer', marginBottom: '4px', border: '1px solid rgba(255,255,255,0.08)' },
    categoryTitle: { color: 'white', fontSize: '13px', fontWeight: '600' },
    formItem: { display: 'flex', alignItems: 'center', padding: '8px 14px 8px 30px', cursor: 'pointer' },
    checkbox: { marginRight: '10px', width: '16px', height: '16px', accentColor: '#059669' },
    formLabel: { color: 'rgba(255,255,255,0.85)', fontSize: '13px' },
    error: { color: '#ef4444', fontSize: '13px', marginBottom: '10px', textAlign: 'center' },
    badge: { background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', padding: '2px 8px', borderRadius: '10px', fontSize: '11px' },
    statusBar: { textAlign: 'center', color: 'rgba(255,255,255,0.9)', padding: '12px', fontSize: '13px' },
    resultCard: { background: 'rgba(255,255,255,0.06)', borderRadius: '8px', padding: '14px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.1)' },
    resultName: { color: 'white', fontSize: '13px', fontWeight: '500' },
    resultCount: { color: '#34d399', fontSize: '12px' },
    companyBanner: { background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', color: 'white', padding: '12px 20px', borderRadius: '8px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    footer: { textAlign: 'center', padding: '20px', color: 'rgba(255,255,255,0.7)', fontSize: '12px' },
    topBar: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' },
    selectInput: { padding: '10px 12px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', fontSize: '13px', background: 'rgba(255,255,255,0.08)', color: 'white', flex: '1', minWidth: '150px' },
  };

  // LOGIN SCREEN
  if (!isLoggedIn) {
    return (
      <div style={s.wrapper}>
        <div style={s.container}>
          <div style={s.header}>
            <div style={s.logoBox}>
              <img src="/Logo.png" alt="SLP Alaska" style={s.logo} />
            </div>
            <div style={s.title}>Client Data Export</div>
            <div style={s.subtitle}>SLP Alaska Safety Portal</div>
          </div>
          <div style={s.loginCard}>
            <h3 style={{ textAlign: 'center', marginBottom: '20px', color: '#1e3a5f', fontSize: '16px' }}>Client Login</h3>
            <form onSubmit={handleLogin}>
              <input style={s.input} type="text" placeholder="Company Code (e.g. MAGTEC2026)" value={companyCode} onChange={(e) => setCompanyCode(e.target.value)} />
              <input style={s.input} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
              {error && <div style={s.error}>{error}</div>}
              <button type="submit" style={s.btnPrimary}>Sign In</button>
            </form>
            <p style={{ textAlign: 'center', marginTop: '15px', fontSize: '11px', color: '#9ca3af' }}>Contact SLP Alaska for access credentials</p>
          </div>
          <div style={s.footer}>
            <p>&copy; 2026 SLP Alaska | <a href="tel:9072023274" style={{ color: '#fbbf24', textDecoration: 'none' }}>(907) 202-3274</a></p>
            <p style={{ marginTop: '8px', fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>AnthroSafe&trade; Field Driven Safety &copy; 2026 SLP Alaska, LLC</p>
          </div>
        </div>
      </div>
    );
  }

  // EXPORT INTERFACE
  return (
    <div style={s.wrapper}>
      <div style={s.container}>
        <div style={s.header}>
          <div style={s.logoBox}>
            <img src="/Logo.png" alt="SLP Alaska" style={s.logo} />
          </div>
          <div style={s.title}>Client Data Export</div>
          <div style={s.subtitle}>{totalFormCount} Form Types &middot; 16 Categories</div>
        </div>

        <div style={s.companyBanner}>
          <div>
            <div style={{ fontWeight: '700', fontSize: '15px' }}>{companyName}</div>
            <div style={{ fontSize: '11px', opacity: 0.85 }}>Data Export Portal</div>
          </div>
          <button onClick={handleLogout} style={{ ...s.btnSmall, background: 'rgba(255,255,255,0.2)', color: 'white' }}>Sign Out</button>
        </div>

        <div style={s.section}>
          <div style={s.sectionTitle}>Filters</div>
          <div style={s.topBar}>
            <select style={s.selectInput} value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
              {DATE_RANGES.map(d => <option key={d} value={d} style={{ color: '#000' }}>{d}</option>)}
            </select>
            <select style={s.selectInput} value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)}>
              {LOCATIONS.map(l => <option key={l} value={l} style={{ color: '#000' }}>{l}</option>)}
            </select>
          </div>
          {dateRange === 'Custom Range' && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <input type="date" style={{ ...s.selectInput, colorScheme: 'dark' }} value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} />
              <input type="date" style={{ ...s.selectInput, colorScheme: 'dark' }} value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} />
            </div>
          )}
        </div>

        <div style={s.section}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={s.sectionTitle}>Select Forms ({selectedCount} selected)</div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={selectAllForms} style={{ ...s.btnSmall, background: '#059669', color: 'white' }}>Select All</button>
              <button onClick={deselectAllForms} style={s.btnSmall}>Clear</button>
            </div>
          </div>

          {Object.entries(FORM_CATEGORIES).map(([catName, catData]) => {
            const formNames = Object.keys(catData.forms);
            const selectedInCat = formNames.filter(f => selectedForms[f]).length;
            const isOpen = openCategories[catName];

            return (
              <div key={catName} style={{ marginBottom: '2px' }}>
                <div style={s.categoryHeader} onClick={() => toggleCategory(catName)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{catData.icon}</span>
                    <span style={s.categoryTitle}>{catName}</span>
                    {selectedInCat > 0 && <span style={{ background: '#059669', color: 'white', padding: '1px 7px', borderRadius: '8px', fontSize: '10px' }}>{selectedInCat}</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={s.badge}>{formNames.length}</span>
                    <button onClick={(e) => { e.stopPropagation(); selectAllInCategory(catName); }} style={{ ...s.btnSmall, fontSize: '10px', padding: '3px 8px' }}>All</button>
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>{'\u25BC'}</span>
                  </div>
                </div>
                {isOpen && formNames.map(formName => (
                  <div key={formName} style={s.formItem} onClick={() => toggleFormSelection(formName)}>
                    <input type="checkbox" checked={!!selectedForms[formName]} onChange={() => {}} style={s.checkbox} />
                    <span style={s.formLabel}>{formName}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        <button onClick={handleExport} disabled={exporting || selectedCount === 0} style={{ ...s.btnExport, opacity: (exporting || selectedCount === 0) ? 0.5 : 1 }}>
          {exporting ? '\u23F3 Exporting...' : '\u{1F4E5} Export ' + selectedCount + ' Form Type' + (selectedCount !== 1 ? 's' : '')}
        </button>

        {exportStatus && <div style={s.statusBar}>{exportStatus}</div>}

        {exportResults && (
          <div style={{ ...s.section, marginTop: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={s.sectionTitle}>Export Results</div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={downloadAllExcel} style={s.btnDownload}>{'\u{1F4E5}'} All Excel</button>
                <button onClick={printAllPDF} style={{ ...s.btnDownload, background: '#b91c1c' }}>{'\u{1F5A8}'} All PDF</button>
              </div>
            </div>
            {Object.entries(exportResults).map(([formName, data]) => (
              <div key={formName} style={s.resultCard}>
                <div>
                  <div style={s.resultName}>{formName}</div>
                  <div style={s.resultCount}>{data.length} record{data.length !== 1 ? 's' : ''}</div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => downloadExcel(formName, data)} style={s.btnDownload}>Excel</button>
                  <button onClick={() => printPDF(formName, data)} style={{ ...s.btnDownload, background: '#b91c1c' }}>Print/PDF</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={s.footer}>
          <p>&copy; 2026 SLP Alaska | <a href="tel:9072023274" style={{ color: '#fbbf24', textDecoration: 'none' }}>(907) 202-3274</a></p>
          <p style={{ marginTop: '5px' }}>Safety &bull; Leadership &bull; Performance</p>
          <p style={{ marginTop: '8px', fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>AnthroSafe&trade; Field Driven Safety &copy; 2026 SLP Alaska, LLC</p>
        </div>
      </div>
    </div>
  );
}

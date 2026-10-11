'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { isDaAdmin } from '@/lib/daAdmins'
import { filterCategories, isPathEnabled, isModuleEnabled } from '@/lib/modules'
import quickStart from '../config/quickstart.json'

// Shared, lock-free auth client. Portal pages each build their own Supabase
// client and brawl over the browser auth lock; this one reuses AdminGate's
// singleton rather than joining the fight.
const supabaseAuth = (typeof globalThis !== 'undefined' && globalThis.__slpAuthClient)
  || (globalThis.__slpAuthClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://iypezirwdlqpptjpeeyf.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { lock: async (_n, _t, fn) => await fn() } }))

const FORM_CATEGORIES = [
  {
    id: 'training-competency',
    title: 'Training & Competency',
    icon: '🎯',
    isTraining: true,
    forms: [
      { name: 'Online Training Portal (LMS)', href: '/lms/login', isLocal: true },
      { name: 'Aerial Lift Practical Evaluation', href: '/aerial-lift-practical', isLocal: true },
      { name: 'Crane/Boom Truck Practical Evaluation', href: '/crane-boom-truck-practical', isLocal: true },
      { name: 'Excavator Practical Evaluation', href:'/excavator-practical', isLocal: true },
      { name: 'Forklift Practical Evaluation', href:'/forklift-practical', isLocal: true },
      { name: 'Loader Practical Evaluation', href: '/loader-practical', isLocal: true},
    ]
  },
  {
    id: 'field-forms',
    title: 'Field Forms',
    icon: '📋',
    forms: [
      { name: 'BBS Observation', href: '/bbs-form', isLocal: true },
      { name: 'Camp Corrective Actions', href: '/camp-corrective-actions', isLocal: true },
      { name: 'Camp Inspection', href: '/camp-inspection', isLocal: true },
      { name: 'Camp Inspection Dashboard', href: '/camp-inspection-dashboard', isLocal: true },
      { name: 'Cold Weather Operating Risk Assessment', href: '/cold-weather-form', isLocal: true },
      { name: 'Dropped Object Prevention Audit', href: '/dropped-object-audit', isLocal: true },
      { name: 'E-Line Safety Audit', href: '/e-line-safety-audit', isLocal: true },
      { name: 'EHS Field Evaluation', href: '/ehs-field-evaluation', isLocal: true },
      { name: 'Field Environmental Audit', href: '/field-environmental-audit', isLocal: true },
      { name: 'Flammable Storage Audit', href: '/flammable-storage-audit', isLocal: true },
      { name: 'Fluid Transfer Permit Audit', href: '/fluid-transfer', isLocal: true}, 
      { name: 'Good Catch / Near Miss', href: '/good-catch', isLocal: true },
      { name: 'Hazard ID Report', href: '/hazard-id', isLocal: true },
      { name: 'Journey Management', href: '/journey-management', isLocal: true },
      { name: 'Location Audit Report', href: '/location-audit-report', isLocal: true },
      { name: 'Manage By Walk Around', href: '/manage-by-walk-around', isLocal: true },
      { name: 'Phase Condition Risk Assessment', href: '/phase-condition-risk-assessment', isLocal: true },
      { name: 'Pressure Cross Check', href: '/pressure-crosscheck', isLocal: true },
      { name: 'Risk Control Conversation', href: '/risk-control-conversation', isLocal: true },
      { name: 'SAIL Log Entry', href: '/sail-log-entry', isLocal: true },
      { name: 'Slickline Safety Audit', href: '/slickline-safety-audit', isLocal: true },
      { name: 'STOP & Take 5', href: '/stop-take-5', isLocal: true },
      { name: 'Surface Condition Audit', href: '/surface-condition-audit', isLocal: true },
      { name: 'SWPPP Inspection', href: '/swppp-inspection', isLocal: true },
      { name: 'Task/Crew Audit', href: '/task-crew-audit', isLocal: true },
      { name: 'Toolbox Meeting Quality Assessment', href: '/toolbox-meeting-assessment', isLocal: true },
      { name: 'Welding/Fab Shop Audit', href: '/welding-fab-shop-audit', isLocal: true },
      { name: 'Welding/Grinding Audit', href: '/welding-grinding-audit', isLocal: true },
    ]
  },
  {
    id: 'monthly-inspections',
    title: 'Monthly Inspections',
    icon: '📅',
    forms: [
      { name: 'Beam Clamp Inspection', href: '/beam-clamp-inspection', isLocal: true },
      { name: 'Chain Hoist Inspection', href: '/chain-hoist-inspection', isLocal: true },
      { name: 'Emergency Drill Evaluation', href: '/emergency-drill-evaluation', isLocal: true },
      { name: 'Emergency Eyewash Inspection', href: '/eyewash-station-inspection', isLocal: true },
      { name: 'Fall Protection Harness Inspection', href: '/harness-inspection', isLocal: true },
      { name: 'Fire Extinguisher Inspection', href: '/fire-extinguisher-inspection', isLocal: true },
      { name: 'First Aid Kit Inspection', href: '/first-aid-kit-inspection', isLocal: true },
      { name: 'Ladder Inspection', href: '/ladder-inspection', isLocal: true },
      { name: 'Lanyard & SRL Inspection', href: '/lanyard-srl-inspection', isLocal: true },
      { name: 'Monthly AED Inspection', href: '/aed-inspection', isLocal: true },
      { name: 'Plate Clamp Inspection', href: '/plate-clamp-inspection', isLocal: true },
      { name: 'Shackle Inspection', href: '/shackle-inspection', isLocal: true },
      { name: 'Synthetic Sling Inspection', href: '/synthetic-sling-inspection', isLocal: true },
      { name: 'Wire Rope Inspection', href: '/wire-rope-inspection', isLocal: true },
    ]
  },
  {
    id: 'permits',
    title: 'Permits',
    icon: '📝',
    forms: [
      { name: 'Confined Space Entry', href: '/confined-space-entry', isLocal: true },
      { name: 'Energized Electrical Work', href: '/energized-electrical-work', isLocal: true },
      { name: 'Energy Isolation / LOTO', href: '/energy-isolation', isLocal: true },
      { name: 'Excavation & Trenching', href: '/excavation-trenching', isLocal: true },
      { name: 'Hot Work', href: '/hot-work', isLocal: true },
      { name: 'Opening & Blinding', href: '/opening-blinding', isLocal: true },
      { name: 'Unit Work Permit', href: '/unit-work', isLocal: true },
    ]
  },
  {
    id: 'lsr-audits',
    title: 'Lifesaving Rules Audits',
    icon: '🛡️',
    forms: [
      { name: 'LSR-Confined Space Audit', href: '/lsr-confined-space-audit', isLocal: true },
      { name: 'LSR-Driving Audit', href: '/lsr-driving-audit', isLocal: true },
      { name: 'LSR-Energy Isolation', href: '/lsr-energy-isolation-audit', isLocal: true },
      { name: 'LSR-Fall Protection', href: '/lsr-fall-protection-audit', isLocal: true },
      { name: 'LSR-Lifting Operations', href: '/lsr-lifting-operations-audit', isLocal: true },
      { name: 'LSR-Line of Fire', href: '/lsr-line-of-fire-audit', isLocal: true },
      { name: 'LSR-Work Permits', href: '/lsr-work-permits-audit', isLocal: true },
    ]
  },
  {
    id: 'equipment-inspections',
    title: 'Equipment Inspections',
    icon: '🚛',
    forms: [
      { name: 'Heavy Equipment', href: '/heavy-equipment-inspection', isLocal: true },
      { name: 'Crane Inspection', href: '/crane-inspection', isLocal: true },
      { name: 'Forklift Inspection', href: '/forklift-inspection', isLocal: true },
      { name: 'Vehicle Inspection', href: '/vehicle-inspection', isLocal: true },
    ]
  },
  {
    id: 'daily-forms',
    title: 'Daily Forms',
    icon: '☀️',
    forms: [
      { name: 'Daily Scaffold Inspection', href: '/scaffold-inspection-form', isLocal: true },
      { name: 'Exc. & Trench Competent Person Daily Inspection Form', href: '/competent-person-form', isLocal: true },
      { name: 'THA / JSA', href: '/tha-jsa', isLocal: true },
    ]
  },
  {
    id: 'incident-forms',
    title: 'Incident & Investigation',
    icon: '🚨',
    forms: [
      { name: 'Incident Report', href: '/incident-report', isLocal: true },
      { name: 'Property Damage Report', href: '/property-damage-report', isLocal: true },
      { name: 'Witness Statement', href: '/witness-statement', isLocal: true },
      { name: 'Investigation Dashboard', href: '/investigation-dashboard', isLocal: true },
      { name: 'Corrective Actions', href: '/corrective-actions', isLocal: true },
      { name: 'Lessons Learned', href: '/lessons-learned', isLocal: true },
    ]
  },
  {
    id: 'psa-tools',
    title: 'Predictive Safety Analytics™',
    icon: '📊',
    isPSA: true,
    forms: [
      { name: 'Predictive Safety Dashboard (company login)', href: 'https://slp-safety-dashboard.vercel.app', isLocal: false, module: 'analytics', icon: '📊' },
      { name: 'Investigation Analytics', href: '/investigation-analytics', isLocal: true },
      { name: 'TrueCost™ Calculator', href: '/truecost', isLocal: true },
      { name: 'Similar Incident Finder', href: '/similar-incidents', isLocal: true },
      { name: 'Quality Score', href: '/quality-score', isLocal: true },
      { name: 'Logic Tree Builder', href: '/logic-tree', isLocal: true },
      { name: 'Action Calendar', href: '/action-calendar', isLocal: true },
      { name: 'Report Generator', href: '/report-generator', isLocal: true },
      { name: 'Notification Center', href: '/notifications', isLocal: true },
      { name: 'SAIL Log Sync', href: '/sail-sync', isLocal: true },
      { name: 'SAIL Log Management', href: '/sail-management', isLocal: true },
    ]
  },
  {
    id: 'ash-book',
    title: '2026 ASH Book',
    icon: '📘',
    forms: [
      { name: '2026 ASH Book', href: '/2026-ASH-Book.pdf', isLocal: true }
    ]
  },
  {
    id: 'moc',
    title: 'Management of Change',
    icon: '🔄',
    forms: [
      { name: 'Management of Change', href: '/management-of-change', isLocal: true },
    ]
  },
  {
    id: 'hse-log',
    title: 'HSE & Manager Daily Activity Log',
    icon: '📊',
    forms: [
      { name: 'Manager & HSE Activity Log', href: '/daily-activity-log', isLocal: true },
    ]
  },
  {
    id: 'lift-plans',
    title: 'Critical Lift Plans',
    icon: '🏗️',
    forms: [
      { name: 'Critical Lift Plans', href: '/critical-lift-plan', isLocal: true },
    ]
  },
  {
    id: 'fall-protection-plan',
    title: 'Fall Protection Plan',
    icon: '🪢',
    forms: [
      { name: 'Fall Protection Plan', href: '/fall-protection-plan', isLocal: true },
    ]
  },
  {
    id: 'sse',
    title: 'Short Service Employee Evaluation',
    icon: '👷',
    forms: [
      { name: 'SSE Evaluation', href: '/sse-evaluation', isLocal: true },
    ]
  },
  {
    id: 'seasonal',
    title: 'Seasonal Inspections',
    icon: '🌨️',
    forms: [
      { name: 'Spill Kit Inspection', href: '/spill-kit-inspection', isLocal: true },
      { name: 'Weekly Tank Farm Inspection', href: '/weekly-tank-inspection', isLocal: true },
    ]
  },
  {
    id: 'safety-meeting',
    title: 'Safety Meeting Form',
    icon: '👥',
    forms: [
      { name: 'Safety Meeting', href: '/safety-meeting', isLocal: true },
    ]
  },
  {
    id: 'ppe',
    title: 'PPE Inspection Form',
    icon: '🦺',
    forms: [
      { name: 'Comprehensive PPE Inspection', href: '/ppe-inspection', isLocal: true },
    ]
  },
  {
    id: 'drops',
    title: 'Dropped Object Prevention',
    icon: '\u26A0\uFE0F',
    forms: [
      { name: 'Dropped Object Energy Assessment', href: '/drops-calculator', isLocal: true },
    ]
  },
  {
    id: 'weather',
    title: 'Weather & Phase Conditions',
    icon: '🌍',
    forms: [
      { name: 'Weather Globe & ASH Book Phases', href: '/weather', isLocal: true },
    ]
  },{
    id: 'client-export',
    title: 'Client Data Export',
    icon: '🔐',
    forms: [
      { name: 'Client Data Export Portal', href: '/client-export', isLocal: true },
    ]
  }
]

// Its own tile rather than an entry inside Predictive Safety Analytics.
//
// Two reasons. It is a separate service line - SLP Alaska acts as a C/TPA in
// the FMCSA Clearinghouse, which is not analytics - and it is restricted to
// three people, so folding it into PSA would make that tile's form count
// change depending on who is looking, which reads as a bug rather than as a
// permission.
const PSA_INDEX = FORM_CATEGORIES.findIndex(c => c.isPSA)

const DA_CATEGORY = {
  id: 'da-testing',
  title: 'Drug & Alcohol Testing',
  icon: '\u2695\uFE0F',
  isDA: true,
  forms: [
    { name: 'D&A Console \u2014 Clearinghouse, Random Testing, MIS', href: '/da-testing', isLocal: true },
  ],
}

export default function SafetyPortal() {
  const [searchQuery, setSearchQuery] = useState('')
  const [openFolders, setOpenFolders] = useState({})

  // Whether to SHOW the D&A console link. Hiding it is courtesy, not security:
  // /api/da re-checks the same list server-side on every call, so someone who
  // types the URL is refused rather than shown a broken page.
  const [daAdmin, setDaAdmin] = useState(false)
  useEffect(() => {
    supabaseAuth.auth.getSession()
      .then(({ data: { session } }) => setDaAdmin(isDaAdmin(session?.user?.email)))
      .catch(() => setDaAdmin(false))
  }, [])

  // In the grid for the three C/TPA administrators, absent for everyone else.
  // Absence is presentation, not protection: /api/da re-checks the same list
  // server-side, so someone who knows the URL is refused there rather than
  // shown a page that half works.
  // Module switches (config/portal.json) hide links and tiles for modules that
  // are off. With every module on, filterCategories returns the list unchanged.
  const visibleCategories = filterCategories(FORM_CATEGORIES)
  const visiblePsaIndex = visibleCategories.findIndex(c => c.isPSA)
  const showDa = daAdmin && isPathEnabled(DA_CATEGORY.forms[0].href)
  const daAt = visiblePsaIndex >= 0 ? visiblePsaIndex + 1 : Math.min(PSA_INDEX + 1, visibleCategories.length)
  const categories = showDa
    ? [...visibleCategories.slice(0, daAt), DA_CATEGORY,
       ...visibleCategories.slice(daAt)]
    : visibleCategories

  // Quick Start: one tap to the most-used forms (ranked by live use, see
  // config/quickstart.json). Pinned reporting buttons first. Each button hides
  // when its own module is off; the whole row is the quick-start module.
  const quickButtons = isModuleEnabled('quick-start')
    ? [
        ...(quickStart.pinned || []).map(i => ({ ...i, pinned: true })),
        ...quickStart.items.slice(0, quickStart.homeCount || 8),
      ].filter(i => isPathEnabled(i.href))
    : []
  const helpOn = isModuleEnabled('help-desk')

  const totalForms = categories.reduce((sum, category) => sum + category.forms.length, 0)

  const filteredCategories = categories.map(category => {
    const matchingForms = category.forms.filter(form => 
      form.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
    
    if (matchingForms.length === 0) return null
    
    return {
      ...category,
      forms: matchingForms
    }
  }).filter(Boolean)

  const toggleFolder = (categoryId) => {
    setOpenFolders(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }))
  }

  return (
    <div className="page-wrapper">
      <style jsx global>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .page-wrapper {
          min-height: 100vh;
          background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
          padding: 15px;
        }
        
        .container {
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .header {
          text-align: center;
          padding: 25px 0;
        }
        
        .logo {
          max-width: 200px;
          margin-bottom: 15px;
          filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
        }
        
        h1 {
          color: white;
          font-size: 28px;
          font-weight: 700;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        
        .subtitle {
          color: rgba(255,255,255,0.9);
          font-size: 14px;
          margin-top: 5px;
        }
        
        .tagline {
          color: #bfdbfe;
          font-style: italic;
          margin-top: 10px;
          font-size: 15px;
        }
        
        .stats-bar {
          display: flex;
          justify-content: center;
          gap: 30px;
          margin-top: 20px;
        }
        
        .stat-item {
          text-align: center;
        }
        
        .stat-number {
          color: #bfdbfe;
          font-size: 28px;
          font-weight: 700;
        }
        
        .stat-label {
          color: rgba(255,255,255,0.8);
          font-size: 11px;
          text-transform: uppercase;
        }
        
        .search-box {
          width: 100%;
          max-width: 500px;
          margin: 20px auto;
          display: block;
          padding: 14px 20px;
          border: none;
          border-radius: 25px;
          font-size: 15px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        }
        
        .search-box:focus {
          outline: none;
          box-shadow: 0 4px 25px rgba(59, 110, 165, 0.5);
        }
        
        .folders-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 15px;
        }
        
        .folder {
          background: rgba(255,255,255,0.95);
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0,0,0,0.2);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .folder:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 30px rgba(0,0,0,0.3);
        }
        
        .folder-header {
          background: linear-gradient(135deg, #2d5a87 0%, #3b6ea5 100%);
          color: white;
          padding: 15px 20px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-weight: 600;
          font-size: 14px;
        }
        
        .folder-header:hover {
          background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
        }
        
        
        
        
        


        .folder-icon {
          font-size: 20px;
          margin-right: 10px;
        }
        
        .folder-title {
          display: flex;
          align-items: center;
          flex: 1;
        }
        
        .folder-count {
          background: rgba(255,255,255,0.2);
          padding: 3px 10px;
          border-radius: 12px;
          font-size: 11px;
          margin-right: 10px;
        }
        
        .folder-arrow {
          font-size: 12px;
          transition: transform 0.3s;
        }
        
        .folder.open .folder-arrow {
          transform: rotate(180deg);
        }
        
        .folder-content {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.3s ease-out;
          background: #f8fafc;
        }
        
        .folder.open .folder-content {
          max-height: 1500px;
        }
        
        .form-link {
          display: block !important;
          padding: 12px 20px;
          color: #1e3a5f !important;
          text-decoration: none !important;
          border-bottom: 1px solid #e2e8f0;
          font-size: 13px;
          transition: background 0.2s, padding-left 0.2s;
        }
        
        a.form-link {
          display: block !important;
          color: #1e3a5f !important;
          text-decoration: none !important;
        }
        
        .form-link:hover {
          background: #e0f2fe;
          padding-left: 28px;
          color: #1e3a5f;
        }
        
        .form-link:last-child {
          border-bottom: none;
        }
        
        .footer {
          text-align: center;
          margin-top: 30px;
          color: rgba(255,255,255,0.9);
          font-size: 11px;
        }
        
        .footer a {
          color: #bfdbfe;
          text-decoration: none;
        }
        
        .footer .powered-by {
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid rgba(255,255,255,0.2);
          font-size: 10px;
          color: rgba(255,255,255,0.7);
        }
        
        .quick-start {
          max-width: 760px;
          margin: 18px auto 0;
        }

        .quick-title {
          color: #bfdbfe;
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          text-align: center;
          margin-bottom: 8px;
        }

        .quick-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 8px;
        }

        a.quick-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255,255,255,0.95);
          color: #1e3a5f;
          text-decoration: none;
          font-weight: 700;
          font-size: 14px;
          padding: 11px 12px;
          border-radius: 12px;
          min-height: 46px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        }

        a.quick-btn.pinned {
          border-left: 5px solid #b91c1c;
        }

        a.help-btn {
          display: inline-block;
          margin-top: 14px;
          background: #ffffff;
          color: #1e3a5f;
          font-weight: 700;
          font-size: 14px;
          padding: 9px 18px;
          border-radius: 999px;
          text-decoration: none;
          box-shadow: 0 3px 12px rgba(0,0,0,0.25);
        }

        .no-results {
          text-align: center;
          padding: 40px;
          color: rgba(255,255,255,0.7);
        }
        
        @media (max-width: 600px) {
          .page-wrapper { padding: 10px; }
          .quick-grid { grid-template-columns: repeat(2, 1fr); }
          h1 { font-size: 22px; }
          .folder-header { padding: 12px 15px; font-size: 13px; }
          .form-link { padding: 10px 15px; font-size: 12px; }
          .stats-bar { gap: 15px; }
        }
      `}</style>

      <div className="container">
        <div className="header">
          <img src="/Logo.png" alt="SLP Alaska Logo" className="logo" />
          <h1>SLP Safety Portal</h1>
          <p className="subtitle">Safety • Leadership • Performance</p>
          <p className="tagline">"Safety isn't expensive, it's PRICELESS!"</p>
          
          <div className="stats-bar">
            <div className="stat-item">
              <div className="stat-number">{totalForms}</div>
              <div className="stat-label">Forms</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">{visibleCategories.length}</div>
              <div className="stat-label">Categories</div>
            </div>
          </div>

          {helpOn && (
            <Link href="/help" className="help-btn">❓ Help Desk: ask anything</Link>
          )}

          {quickButtons.length > 0 && (
            <div className="quick-start">
              <div className="quick-title">⚡ Quick Start</div>
              <div className="quick-grid">
                {quickButtons.map(q => (
                  <Link key={q.href} href={q.href} className={`quick-btn${q.pinned ? ' pinned' : ''}`}>
                    <span style={{ fontSize: '20px' }}>{q.icon}</span>{q.short}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <input
          type="text"
          className="search-box"
          placeholder="🔍 Search forms..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        
        <div className="folders-grid">
          {filteredCategories.map(category => (
            <div key={category.id} className={`folder ${openFolders[category.id] ? 'open' : ''}`}>
              <div 
                className={`folder-header ${category.isTraining ? 'training-header' : ''} ${category.isPSA ? 'psa-header' : ''} ${category.isDA ? 'da-header' : ''}`}
                onClick={() => toggleFolder(category.id)}
              >
                <div className="folder-title">
                  <span className="folder-icon">{category.icon}</span>
                  {category.title}
                </div>
                <span className="folder-count">{category.forms.length}</span>
                <span className="folder-arrow">▼</span>
              </div>
              <div className="folder-content">
                {category.forms.map((form, idx) => (
                  <div key={idx} style={{ display: 'block', width: '100%' }}>
                    {form.isLocal ? (
                      <Link href={form.href} className="form-link">
                        ⚡ {form.name}
                      </Link>
                    ) : (
                      <a href={form.href} target="_blank" rel="noopener noreferrer" className="form-link">
                        {form.icon || '📄'} {form.name}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        {filteredCategories.length === 0 && (
          <div className="no-results">
            <p>No forms found matching your search.</p>
          </div>
        )}
        
        <div className="footer">
          <p>© 2026 SLP Alaska | <a href="tel:9072023274">(907) 202-3274</a></p>
          <p style={{marginTop: '5px'}}>Safety • Leadership • Performance</p>
          <p className="powered-by">AnthroSafe™ Field Driven Safety © 2026 SLP Alaska, LLC</p>
        </div>
      </div>
    </div>
  )
}

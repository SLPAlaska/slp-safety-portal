'use client'

import { useState } from 'react'
import Link from 'next/link'

const FORM_CATEGORIES = [
  {
    id: 'training-competency',
    title: 'Training & Competency',
    icon: '🎯',
    isTraining: true,
    forms: [
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
      { name: 'Chain Hoist Inspection', href: '/chain-hoist-inspection', isLocal: true },
      { name: 'Emergency Drill Evaluation', href: '/emergency-drill-evaluation', isLocal: true },
      { name: 'Emergency Eyewash Inspection', href: '/eyewash-station-inspection', isLocal: true },
      { name: 'Fall Protection Harness Inspection', href: '/harness-inspection', isLocal: true },
      { name: 'Fire Extinguisher Inspection', href: '/fire-extinguisher-inspection', isLocal: true },
      { name: 'First Aid Kit Inspection', href: '/first-aid-kit-inspection', isLocal: true },
      { name: 'Ladder Inspection', href: '/ladder-inspection', isLocal: true },
      { name: 'Lanyard & SRL Inspection', href: '/lanyard-srl-inspection', isLocal: true },
      { name: 'Monthly AED Inspection', href: '/aed-inspection', isLocal: true },
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
      { name: 'Opening & Blinding', href: 'https://script.google.com/macros/s/AKfycbyT5tL5gxVhfDdhjEhxiCHzPK3B6qtyVMo1jZJR3o5JVFw1pScf9Sv7riRo_OzNCz2O/exec' },
      { name: 'Unit Work', href: 'https://script.google.com/macros/s/AKfycbx9qgMB2V0VXAeD_MXf9_G00KLCY9xmGZyu5jhjNVUE7JMBGta-_ttWt7iUHL7AvE6KoA/exec' },
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
      { name: 'Heavy Equipment Daily Inspection', href: 'https://script.google.com/macros/s/AKfycbzFGKDv1xRpgWMFDiGQ64ydsA7aJ9Ci8hOKhXQS8yoRDT9XYCR2g836ptxMElrV_6XY/exec' },
      { name: 'Pre-Shift Crane Inspection', href: 'https://script.google.com/macros/s/AKfycbzwdSq235XV12PxTZXh0ZbZHK7VCRNB0n7wkv5V_B_7YjrmFn8k_9SRHLs3TkVP9ApDFg/exec' },
      { name: 'Pre-Shift Forklift Inspection', href: 'https://script.google.com/macros/s/AKfycbwOYvwcDUoqn2kSFDtqYtA8os2lwj4b7tGiEf06qbP0hA-Grd_X0HNM7sl1c6cPt6Vg/exec' },
      { name: 'Pre-Trip Vehicle Inspection', href: 'https://script.google.com/macros/s/AKfycby7dAiPMAePSi1cOlkKmdvqr7ONKgz9zOorQm-OHLOcjrGh3VLFVdOtjpYn7NWMqwRE/exec' },
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
    title: 'Incident Forms',
    icon: '🚨',
    forms: [
      { name: 'Incident Investigation Form', href: 'https://script.google.com/macros/s/AKfycbxSaiG_z2j6pr1mryb1cngLLaMBKkUppYaFnaL15uNfYXYoaadDzr5ZdJK3byXf4zyM/exec' },
      { name: 'Property Damage Report', href: 'https://script.google.com/macros/s/AKfycbwTxdpgiZy9TVZlJxTBaT-gIZAdIQH3g8cLuBTnKQsOyeGGOXyIQfgiCUyFitmsJSk/exec' },
      { name: 'Witness Statement', href: 'https://script.google.com/macros/s/AKfycbx5S-hLUojKV7XTgXNpM3Aole8Uc3oZvuI8fb39x80oa2k1E3W-ooQQ4QTOfNjBoMl7Hg/exec' },
    ]
  },
  {
    id: 'ash-book',
    title: '2026 ASH Book',
    icon: '📘',
    forms: [
      { name: '2026 Alaska Safety Handbook', href: 'https://drive.google.com/file/d/11daeYCQKbR1rHdg7cRC_WdamJSBla7ge/view?usp=sharing' },
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
      { name: 'HSE & Manager Daily Activity Log', href: 'https://script.google.com/macros/s/AKfycbxXu8hF2hRERz_aNPZGT9jY8t6heUDT-pYcgTrxfxuOZxQfgXhQPcaKcMj47NqWW5-G/exec' },
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
      { name: 'Fall Protection Plan', href: 'https://script.google.com/macros/s/AKfycbxHyt7snMiiN9fq4fH69u5UuYJIj6cSMRVTC_v0vIx1Zj0ax1LDTBFITB7S7jXVf6ll/exec' },
    ]
  },
  {
    id: 'sse',
    title: 'Short Service Employee Evaluation',
    icon: '👷',
    forms: [
      { name: 'Short Service Employee Evaluation', href: 'https://script.google.com/macros/s/AKfycbz98upjxlZHW9i29jm-M0GHjRIArazPVvWRJdwtLJLdbZpiU3DWpEtEON3DJm4noIBOdA/exec' },
    ]
  },
  {
    id: 'seasonal',
    title: 'Seasonal Inspections',
    icon: '🌨️',
    forms: [
      { name: 'Spill Kit Inspection Form', href: 'https://script.google.com/macros/s/AKfycbwmre18ewqS254jsjUPJjlyxoY46hsATzONOTE1lXqxqIBBopt5Ne7EU6QvZCNEqcJ3/exec' },
    ]
  },
  {
    id: 'safety-meeting',
    title: 'Safety Meeting Form',
    icon: '👥',
    forms: [
      { name: 'Safety Meeting Form', href: 'https://script.google.com/macros/s/AKfycbyi_NKqRvL3Ohmw3T-9rFsIyyp7qw_N2HYi2C_BPTKc7EblqcO_fDycRp-zlLf6aHgR9g/exec' },
    ]
  },
  {
    id: 'ppe',
    title: 'PPE Inspection Form',
    icon: '🦺',
    forms: [
      { name: 'PPE Inspection Form', href: 'https://script.google.com/macros/s/AKfycbzvoTWJdCivaYY0ub9TY4sNuR_pHqx2ExtI7yH3HR-sdcYUUB-X0GoR8mB-4BbrNnmX2g/exec' },
    ]
  }
]

export default function SafetyPortal() {
  const [searchQuery, setSearchQuery] = useState('')
  const [openFolders, setOpenFolders] = useState({})

  const totalForms = FORM_CATEGORIES.reduce((sum, category) => sum + category.forms.length, 0)

  const filteredCategories = FORM_CATEGORIES.map(category => {
    const matchingForms = category.forms.filter(form => 
      form.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
    return { ...category, forms: matchingForms }
  }).filter(category => category.forms.length > 0)

  const toggleFolder = (id) => {
    setOpenFolders(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="page-wrapper">
      <style jsx>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        .page-wrapper {
          font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
          min-height: 100vh;
          padding: 20px;
        }
        
        .container { 
          max-width: 900px; 
          margin: 0 auto; 
        }
        
        .header {
          text-align: center;
          padding: 20px;
          background: rgba(255,255,255,0.95);
          border-radius: 16px;
          margin-bottom: 25px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        }
        
        .logo { 
          max-width: 200px; 
          margin-bottom: 10px;
        }
        
        h1 { 
          color: #c41e3a; 
          font-size: 28px; 
          margin-bottom: 5px;
          font-weight: 700;
        }
        
        .subtitle { 
          color: #1e3a5f; 
          font-size: 14px;
          font-weight: 500;
        }
        
        .tagline {
          color: #ea580c;
          font-size: 12px;
          font-style: italic;
          margin-top: 8px;
        }
        
        .stats-bar {
          display: flex;
          justify-content: center;
          gap: 30px;
          margin-top: 15px;
        }
        
        .stat-item {
          text-align: center;
        }
        
        .stat-number {
          font-size: 24px;
          font-weight: 700;
          color: #1e3a5f;
        }
        
        .stat-label {
          font-size: 11px;
          color: #64748b;
          text-transform: uppercase;
        }
        
        .search-box {
          width: 100%;
          padding: 12px 20px;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          font-size: 14px;
          margin-bottom: 20px;
          background: rgba(255,255,255,0.95);
        }
        
        .search-box:focus {
          outline: none;
          border-color: #ea580c;
          box-shadow: 0 0 0 3px rgba(234,88,12,0.2);
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
          background: linear-gradient(135deg, #ea580c 0%, #c41e3a 100%);
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
          background: linear-gradient(135deg, #c41e3a 0%, #9a1830 100%);
        }
        
        .training-header {
          background: linear-gradient(135deg, #059669 0%, #047857 100%) !important;
        }
        
        .training-header:hover {
          background: linear-gradient(135deg, #047857 0%, #065f46 100%) !important;
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
          color: #c41e3a;
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
          color: #fbbf24;
          text-decoration: none;
        }
        
        .footer .powered-by {
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid rgba(255,255,255,0.2);
          font-size: 10px;
          color: rgba(255,255,255,0.7);
        }
        
        .no-results {
          text-align: center;
          padding: 40px;
          color: rgba(255,255,255,0.7);
        }
        
        @media (max-width: 600px) {
          .page-wrapper { padding: 10px; }
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
              <div className="stat-number">{FORM_CATEGORIES.length}</div>
              <div className="stat-label">Categories</div>
            </div>
          </div>
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
                className={`folder-header ${category.isTraining ? 'training-header' : ''}`}
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
                        📄 {form.name}
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
          <p>© 2025 SLP Alaska | <a href="tel:9072023274">(907) 202-3274</a></p>
          <p style={{marginTop: '5px'}}>Safety • Leadership • Performance</p>
          <p className="powered-by">Powered by Predictive Safety Analytics™ © 2025 SLP Alaska</p>
        </div>
      </div>
    </div>
  )
}

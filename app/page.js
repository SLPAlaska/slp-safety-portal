'use client'

import { useState } from 'react'
import Link from 'next/link'

const FORM_CATEGORIES = [
  {
    id: 'cat1-incident',
    title: 'Category 1: Incident Investigation',
    icon: '🚨',
    forms: [
      { name: 'Incident Report', href: '/incident-report', isLocal: true },
      { name: 'Property Damage Report', href: '/property-damage-report', isLocal: true },
      { name: 'Witness Statement', href: '/witness-statement', isLocal: true },
      { name: 'Investigation Dashboard', href: '/investigation-dashboard', isLocal: true },
      { name: 'Corrective Actions', href: '/corrective-actions', isLocal: true },
      { name: 'Lessons Learned', href: '/lessons-learned', isLocal: true },
      { name: 'Investigation Analytics', href: '/investigation-analytics', isLocal: true },
      { name: 'TrueCost Calculator', href: '/truecost', isLocal: true },
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
    id: 'cat2-stop-cards',
    title: 'Category 2: STOP Cards & Field Observations',
    icon: '🛑',
    forms: [
      { name: 'BBS Observation', href: '/bbs-form', isLocal: true },
      { name: 'EHS Field Evaluation', href: '/ehs-field-evaluation', isLocal: true },
      { name: 'Exclusion Zone Audit', href: '/exclusion-zone-audit', isLocal: true },
      { name: 'Field Environmental Audit', href: '/field-environmental-audit', isLocal: true },
      { name: 'Good Catch/Near Miss Report', href: '/good-catch', isLocal: true },
      { name: 'Hazard ID Form', href: '/hazard-id', isLocal: true },
      { name: 'Location Audit Report', href: '/location-audit-report', isLocal: true },
      { name: 'Manage by Walk Around', href: '/manage-by-walk-around', isLocal: true },
      { name: 'Comprehensive PPE Inspection', href: '/ppe-inspection', isLocal: true },
      { name: 'Risk Control Conversation', href: '/risk-control-conversation', isLocal: true },
      { name: 'STOP & Take 5 Risk Assessment', href: '/stop-take-5', isLocal: true },
      { name: 'Surface Condition Audit', href: '/surface-condition-audit', isLocal: true },
      { name: 'Task/Crew Audit', href: '/task-crew-audit', isLocal: true },
    ]
  },
  {
    id: 'cat3-safety-meetings',
    title: 'Category 3: Safety Meetings & Management Engagement',
    icon: '👥',
    forms: [
      { name: 'Emergency Drill and Evaluation Form', href: '/emergency-drill-evaluation', isLocal: true },
      { name: 'Fall Protection Plan', href: '/fall-protection-plan', isLocal: true },
      { name: 'Safety Meeting Form', href: '/safety-meeting-form', isLocal: true },
      { name: 'Toolbox Talk', href: '/toolbox-meeting-assessment', isLocal: true },
    ]
  },
  {
    id: 'cat4-lsr-audits',
    title: 'Category 4: Lifesaving Rules Audits',
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
    id: 'cat5-critical-lift',
    title: 'Category 5: Critical Lift Plan',
    icon: '🏗️',
    forms: [
      { name: 'Critical Lift Plan', href: '/critical-lift-plans', isLocal: true },
    ]
  },
  {
    id: 'cat6-drilling-equipment',
    title: 'Category 6: Drilling Equipment Inspections',
    icon: '🔧',
    forms: [
      { name: 'Accumulator Test', href: '/accumulator-test', isLocal: true },
      { name: 'BOP Daily Visual Inspection', href: '/bop-inspection', isLocal: true },
      { name: 'Crown/Traveling Block Inspection', href: '/crown-block-inspection', isLocal: true },
      { name: 'Draw-works Inspection', href: '/drawworks-inspection', isLocal: true },
      { name: 'Iron Roughneck Inspection', href: '/iron-roughneck-inspection', isLocal: true },
      { name: 'Mud System Inspection', href: '/mud-system-inspection', isLocal: true },
      { name: 'Power System Inspection', href: '/power-system-inspection', isLocal: true },
      { name: 'Rig Floor Daily Inspection', href: '/rig-floor-inspection', isLocal: true },
      { name: 'Top Drive Inspection', href: '/top-drive-inspection', isLocal: true },
    ]
  },
  {
    id: 'cat7-daily-mobile',
    title: 'Category 7: Daily Mobile Equipment Inspections',
    icon: '🚛',
    forms: [
      { name: 'Aerial Lift Inspection', href: '/aerial-lift-inspection', isLocal: true },
      { name: 'Forklift Pre-Shift Inspection', href: '/forklift-inspection', isLocal: true },
      { name: 'Pickup/Crew Van Inspection', href: '/vehicle-inspection', isLocal: true },
      { name: 'Daily Scaffold Inspection', href: '/scaffold-inspection', isLocal: true },
      { name: 'THA / JSA', href: '/tha-jsa', isLocal: true },
    ]
  },
  {
    id: 'cat8-monthly',
    title: 'Category 8: General Monthly Inspections',
    icon: '📅',
    forms: [
      { name: 'Fire Extinguisher Inspection', href: '/fire-extinguisher-inspection', isLocal: true },
      { name: 'Emergency Eyewash Inspection', href: '/eyewash-station-inspection', isLocal: true },
      { name: 'First Aid Kit Inspection', href: '/first-aid-kit-inspection', isLocal: true },
      { name: 'Monthly AED Inspection', href: '/aed-inspection', isLocal: true },
      { name: 'Ladder Inspection', href: '/ladder-inspection', isLocal: true },
      { name: 'Fall Protection Harness Inspection', href: '/harness-inspection', isLocal: true },
      { name: 'Lanyard & SRL Inspection', href: '/lanyard-srl-inspection', isLocal: true },
      { name: 'Shackle Inspection', href: '/shackle-inspection', isLocal: true },
      { name: 'Synthetic Sling Inspection', href: '/synthetic-sling-inspection', isLocal: true },
      { name: 'Wire Rope Inspection', href: '/wire-rope-inspection', isLocal: true },
      { name: 'Chain Hoist Inspection', href: '/chain-hoist-inspection', isLocal: true },
      { name: 'Emergency Drill Evaluation', href: '/emergency-drill-evaluation', isLocal: true },
      { name: 'Spill Kit Inspection', href: '/spill-kit-inspection', isLocal: true },
    ]
  },
  {
    id: 'cat9-permits',
    title: 'Category 9: Permit to Work',
    icon: '📝',
    forms: [
      { name: 'Hot Work', href: '/hot-work', isLocal: true },
      { name: 'Confined Space Entry', href: '/confined-space-entry', isLocal: true },
      { name: 'Energy Isolation / LOTO', href: '/energy-isolation', isLocal: true },
      { name: 'Excavation & Trenching', href: '/excavation-trenching', isLocal: true },
      { name: 'Energized Electrical Work', href: '/energized-electrical-work', isLocal: true },
      { name: 'Opening & Blinding', href: '/opening-blinding', isLocal: true },
    ]
  },
  {
    id: 'cat10-training',
    title: 'Category 10: Training & Competency',
    icon: '🎯',
    isTraining: true,
    forms: [
      { name: 'Aerial Lift Practical Evaluation', href: '/aerial-lift-practical', isLocal: true },
      { name: 'Forklift Practical Evaluation', href: '/forklift-practical', isLocal: true },
      { name: 'Loader Practical Evaluation', href: '/loader-practical', isLocal: true },
    ]
  },
  {
    id: 'cat11-client-export',
    title: 'Category 11: Client Data Export',
    icon: '🔐',
    forms: [
      { name: 'Client Data Export Portal', href: '/client-export', isLocal: true },
    ]
  },
]

export default function SafetyPortalHomepage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [openFolders, setOpenFolders] = useState({})

  const totalForms = FORM_CATEGORIES.reduce((sum, cat) => sum + cat.forms.length, 0)

  const filteredCategories = FORM_CATEGORIES.map(category => ({
    ...category,
    forms: category.forms.filter(form =>
      form.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.forms.length > 0)

  const toggleFolder = (categoryId) => {
    setOpenFolders(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }))
  }

  return (
    <div>
      <style jsx>{`
        .container {
          min-height: 100vh;
          background: linear-gradient(to bottom, #f8f9fa 0%, #e9ecef 100%);
        }
        
        .header {
          background: linear-gradient(135deg, #2c2c2c 0%, #1a1a1a 100%);
          padding: 40px 20px 50px 20px;
          text-align: center;
          position: relative;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        }
        
        .header::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, #7f1d1d 0%, #991b1b 50%, #7f1d1d 100%);
        }
        
        .logo {
          height: 100px;
          margin-bottom: 25px;
          filter: drop-shadow(0 2px 8px rgba(0,0,0,0.2));
        }
        
        h1 {
          font-size: 3rem;
          margin: 0 0 12px 0;
          font-weight: 700;
          color: #ffffff;
          letter-spacing: -0.5px;
        }
        
        .subtitle {
          font-size: 1.1rem;
          font-style: italic;
          margin: 0 0 30px 0;
          color: #d1d5db;
          font-weight: 400;
        }
        
        .stats-bar {
          display: flex;
          justify-content: center;
          gap: 50px;
          margin-top: 30px;
        }
        
        .stat-item {
          text-align: center;
        }
        
        .stat-number {
          font-size: 3rem;
          font-weight: 700;
          color: #ffffff;
          line-height: 1;
        }
        
        .stat-label {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: #9ca3af;
          margin-top: 8px;
          font-weight: 600;
        }
        
        .search-box {
          width: 90%;
          max-width: 600px;
          padding: 16px 24px;
          margin: -25px auto 40px auto;
          display: block;
          border: none;
          border-radius: 50px;
          font-size: 16px;
          background: white;
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
          position: relative;
          z-index: 10;
        }
        
        .search-box:focus {
          outline: none;
          box-shadow: 0 8px 32px rgba(127, 29, 29, 0.2);
        }
        
        .folders-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
          gap: 20px;
          padding: 20px;
          max-width: 1400px;
          margin: 0 auto;
        }
        
        .folder {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          transition: all 0.3s ease;
          border: 1px solid #e5e7eb;
        }
        
        .folder:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
          border-color: #7f1d1d;
        }
        
        .folder-header {
          background: linear-gradient(135deg, #4b5563 0%, #374151 100%);
          color: white;
          padding: 16px 20px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-weight: 600;
          font-size: 14px;
          transition: background 0.3s;
        }
        
        .folder-header:hover {
          background: linear-gradient(135deg, #374151 0%, #1f2937 100%);
        }
        
        .training-header {
          background: linear-gradient(135deg, #059669 0%, #047857 100%) !important;
        }
        
        .training-header:hover {
          background: linear-gradient(135deg, #047857 0%, #065f46 100%) !important;
        }
        
        .folder-icon {
          font-size: 22px;
          margin-right: 12px;
        }
        
        .folder-title {
          display: flex;
          align-items: center;
          flex: 1;
          font-size: 15px;
        }
        
        .folder-count {
          background: rgba(255,255,255,0.25);
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          margin-right: 12px;
          font-weight: 700;
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
          transition: max-height 0.4s ease-out;
          background: #fafafa;
        }
        
        .folder.open .folder-content {
          max-height: 2000px;
        }
        
        .form-link {
          display: block !important;
          padding: 14px 20px;
          color: #374151 !important;
          text-decoration: none !important;
          border-bottom: 1px solid #e5e7eb;
          font-size: 14px;
          transition: all 0.2s;
          font-weight: 500;
        }
        
        a.form-link {
          display: block !important;
          color: #374151 !important;
          text-decoration: none !important;
        }
        
        .form-link:hover {
          background: #f3f4f6;
          padding-left: 32px;
          color: #7f1d1d !important;
          border-left: 4px solid #7f1d1d;
        }
        
        .form-link:last-child {
          border-bottom: none;
        }
        
        .footer {
          text-align: center;
          padding: 40px 20px;
          color: #6b7280;
          font-size: 13px;
          background: #f8f9fa;
          border-top: 1px solid #e5e7eb;
        }
        
        .footer-highlight {
          font-weight: 600;
          color: #dc2626;
          font-size: 14px;
          margin-bottom: 15px;
          display: block;
        }
        
        .footer .powered-by {
          margin-top: 15px;
          padding-top: 15px;
          border-top: 1px solid #e5e7eb;
          font-size: 11px;
          color: #9ca3af;
        }
        
        .no-results {
          text-align: center;
          padding: 60px 20px;
          color: #6b7280;
        }
        
        @media (max-width: 768px) {
          h1 { font-size: 2rem; }
          .subtitle { font-size: 0.95rem; }
          .stat-number { font-size: 2.5rem; }
          .stats-bar { gap: 30px; }
          .folders-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="container">
        <div className="header">
          <img src="/Logo.png" alt="Ridgeline Logo" className="logo" />
          <h1>Ridgeline Safety Portal</h1>
          <p className="subtitle">"No Heroes. No Shortcuts. Just Safe Work — The Ridgeline Standard."</p>
          
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
          <span className="footer-highlight">
            For ANY incidents, contact Ridgeline HSE immediately
          </span>
          <p className="powered-by">Powered by Predictive Safety Analytics™ © 2026 SLP Alaska, LLC</p>
        </div>
      </div>
    </div>
  )
}

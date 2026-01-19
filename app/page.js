'use client'

import { useState } from 'react'
import Link from 'next/link'

// Form data organized by category
const FORM_CATEGORIES = [
  {
    id: 'training-competency',
    title: 'Training & Competency',
    icon: '🎯',
    color: 'green',
    forms: [
      { name: 'Aerial Lift Practical Evaluation', href: 'https://script.google.com/macros/s/AKfycbwJ6NO7yeqOlhmzo0U2ozZiamuv-pAPju0mUOTMyrxYQz93onlw-YSnkQwuqbmFAdzH/exec' },
      { name: 'Crane/Boom Truck Practical Evaluation', href: 'https://script.google.com/macros/s/AKfycbxE2BjVP7-YLadBLnP73FXNdbuAY5dJSH6BTjgNh55mVhLB_7ZLvTCLorno1HQQpUX1uw/exec' },
      { name: 'Excavator Practical Evaluation', href: 'https://script.google.com/macros/s/AKfycbyC1OAR4sSVBSWpSbSlFo3r_kmjwbod8DZwY_kwzq82iBN1yPJUKrCC_D4IMh1GGplg8Q/exec' },
      { name: 'Forklift Practical Evaluation', href: 'https://script.google.com/macros/s/AKfycbyEcFuhiB_iJCITKBUq1T4LZNDFVT0jQTwWQh3wYKpr9ns1Z3tBDYq-uH03vyRAFogHeA/exec' },
      { name: 'Loader Practical Evaluation', href: 'https://script.google.com/macros/s/AKfycbyOmSAcddYvtvq9JaZqRIyopvYloJjyjWrdaBEy-hH6EMyfb8XGgFhhm-U376Xb-JCv/exec' },
    ]
  },
  {
    id: 'field-forms',
    title: 'Field Forms',
    icon: '📋',
    color: 'orange',
    forms: [
      { name: 'BBS Observation', href: '/bbs-form', isLocal: true },
      { name: 'Cold Weather Operating Risk Assessment', href: '/cold-weather-form', isLocal: true },
      { name: 'Dropped Object Prevention Audit', href: 'https://script.google.com/macros/s/AKfycbxovEzZnCQ3BSgj-Rv19PxBuBC22j6qJUecc5syoTNBeHtFVkiPzs1vnR8IKEOmppBb/exec' },
      { name: 'E-Line Safety Audit', href: 'https://script.google.com/macros/s/AKfycbzWiONuRMrESw5MrmNstG4VcPVPXWqxcJGNNipH8Oht2-mXXUFo3yOy9I9cJjmIuEFw/exec' },
      { name: 'EHS Field Verification', href: 'https://script.google.com/macros/s/AKfycbyjNDMLYDpFTPYdC0dWxVmVeMalG6ycfkHoy0o-cWBmSj0RlcpmPTMl7VVlW2ibzap7/exec' },
      { name: 'Field Environmental Audit', href: 'https://script.google.com/macros/s/AKfycbzn7KMeUmMRRbHi1b4oWCXgMB5S19s4jJi-QKUgtunfG19xaXuGf_RfXIDIGGrsjs0EsQ/exec' },
      { name: 'Flammable Locker Audit', href: 'https://script.google.com/macros/s/AKfycbwPZSUDfXSkLsDphPFs9Om8gk-DQdVQx2BHpnuWU09hBYW26Aba4qofVWSqZXScRS8q/exec' },
      { name: 'Fluid Transfer Permit Audit', href: 'https://script.google.com/macros/s/AKfycbwbR8Ap2INqGrenW7Orb6EWmEk76JFqLxocgSnr7msHK3hIar9S6ACEbGo6YJ9aQ7nRQg/exec' },
      { name: 'Good Catch Near Miss Reports', href: 'https://script.google.com/macros/s/AKfycbxk9rghhuIUn0eAQVSMeXxTCJQcKINWKS5zGDngCyQF6jod4O-qWUP60QKwCk3zww2MZQ/exec' },
      { name: 'Hazard ID Form', href: 'https://script.google.com/macros/s/AKfycbzcLbpEMqgpBbegIHT8If48H8TM_fws9T5GA3THd65iobYfPnOlxVvzGmL5Y3n8JQE5WA/exec' },
      { name: 'Journey Management', href: 'https://script.google.com/macros/s/AKfycbwnlOQ8Fja8hk0lBnhBGxYNyaIYkmFqRFJBbk1XixhiadfTn8pH1Bq-vfuu4Lz9e0AL/exec' },
      { name: 'Location Audit Report', href: 'https://script.google.com/macros/s/AKfycbwKC5ARuSAGcmPRgj1KSDw-1qlq203QExtv4ItKGkFHToCez4mlvw_A79wxy6aQd6K2cg/exec' },
      { name: 'Manage By Walk Around', href: 'https://script.google.com/macros/s/AKfycbzuohsLesgs4JVIsK9oxqXugFCzTxqhnKS9RvbbwmDNbBishHZZNt_jBvy92bU7sv9u/exec' },
      { name: 'Phase Condition Risk Assessment', href: 'https://script.google.com/macros/s/AKfycbzf4gYi3Z88mpAe7blen9qqEjURKGxjRZ6Q35W8gHGXSAzzNwJzvg4y-Qk5NLdhQn_Y/exec' },
      { name: 'Pressure Cross Check', href: 'https://script.google.com/macros/s/AKfycbzkeVL5B-z0vFaUMfG5hdXQSy9AVbAB3J9LhpBLCRXFerQF01aqsMCjYWoCOgDfePsPZg/exec' },
      { name: 'Risk Control Conversation', href: 'https://script.google.com/macros/s/AKfycbz4uBfmY5cXBjsxb6UvJiE4l5gJEf6gOegzZEEOF4t0xB2AojWoctWcvajbKmSPWXF45Q/exec' },
      { name: 'SAIL Log Entry', href: 'https://script.google.com/macros/s/AKfycbxnSfNUSigIihfSTr25QVb8RSGR1QCoavtqt3UY1Wy8FblsN9EWjEEcwdMQ4fqEGkDd/exec' },
      { name: 'Slickline Safety Audit', href: 'https://script.google.com/macros/s/AKfycbz3C5VgSfri5L_VJa5DWUtV0zPLJn3hZkCTbJNsWc1iUzOkMVzcf71MSmtnoB5TkcK7/exec' },
      { name: 'STOP & Take 5 Risk Assessment', href: 'https://script.google.com/macros/s/AKfycbzC9l1K8qWVLbk8dGQU7avM6PHvk1o4kTB8S1CX_-IRUNikWFbXzrm8XtvHmpUpRHaY/exec' },
      { name: 'Surface Condition Audit', href: 'https://script.google.com/macros/s/AKfycbxTgMCBCOL22oT3x-2gDuL1pVxDAsOrEVvgKPQe-hy8HqDjm8WKTkSSRacZaqH_fYD0ng/exec' },
      { name: 'SWPPP Inspection Form', href: 'https://script.google.com/macros/s/AKfycbyC9TIg7vFsUBuv-DHi7vJK33ncPMwtrhKO5mDMGPSSrw7MAn3iXWR20NEBx6BUm3_RiQ/exec' },
      { name: 'Task/Crew Audit', href: 'https://script.google.com/macros/s/AKfycbxoUU-6wbpzFRL4jjhL_hKTCdNlcLSh8OY2Ieku4VGy4YasxF2f6IFuykW4-vlyRUFF/exec' },
      { name: 'Toolbox Meeting Quality Assessment', href: 'https://script.google.com/macros/s/AKfycbzGVoKjw9V7XHS0rwXOU2F_0Cz142hoMdPE13Yy0DjxvJb-Iam4uMUrpwpuGt8NXujt9A/exec' },
      { name: 'Welding/Fab Shop Audit', href: 'https://script.google.com/macros/s/AKfycbzR6WchEksev9SU4UEL73yn-7wVAUa8X2a536KnDZQytV9_N5vhQgwa5B08A4XIcTwu/exec' },
      { name: 'Welding/Grinding Audit', href: 'https://script.google.com/macros/s/AKfycbwuDgToFoNNtu237LbVaRmbe-umJj0vssRMM86ipFqBV_sYIpN4qFtjj3L0hgOUPx7Qrw/exec' },
    ]
  },
  {
    id: 'monthly-inspections',
    title: 'Monthly Inspections',
    icon: '📅',
    color: 'red',
    forms: [
      { name: 'Chain Hoist Inspection', href: 'https://script.google.com/macros/s/AKfycbwOGv4xCGJ9hVLQdAgFO4EnK-pQj0kO09c1hwda6ien-N51FX1C8tp5nfGilNxbrZkb8A/exec' },
      { name: 'Emergency Drill Evaluation', href: 'https://script.google.com/macros/s/AKfycbxdMN764DWm0nuU2mqxf-ucpcj3w1pBIhK_f82AJ8Aon2nJAmBRQdA9cez_4CszVHe_sw/exec' },
      { name: 'Emergency Eyewash Inspection', href: 'https://script.google.com/macros/s/AKfycbxy6RCbdAIk-gyz1EKHJmW8RJqBCCD1kOpz_5nG-WAbeShjMG-WgZP4JWe0lMs9XfH3/exec' },
      { name: 'Fall Protection Harness Inspection', href: 'https://script.google.com/macros/s/AKfycbzqimBH2F9Fw5_DA6CoDkhZn_eiBIAcr6K3BrETcb4P4v_rwCvxwxl0W5Bb2mYXOgYvaw/exec' },
      { name: 'Fire Extinguisher Inspection', href: 'https://script.google.com/macros/s/AKfycbyhr-XbN-ltKWYlU93KCb9boBH0r5Vj_LAN4bKkhy041jStZFINbVvDKEdCveX8ad1ExA/exec' },
      { name: 'First Aid Kit Inspection', href: 'https://script.google.com/macros/s/AKfycbwliKpwhkamrbJdB9pdBiShqdcJSs82tjqhbmRLWdT-SP5VqvLq-w5yeIEni-vqgfx7EQ/exec' },
      { name: 'Ladder Inspection', href: 'https://script.google.com/macros/s/AKfycbyX0n6LQ327fZihUaRuAR8A3q_GA68U3BQcI-ASHNa-jxVL-QwPzil7arLlgTyeLoLDzg/exec' },
      { name: 'Lanyard & SRL Inspection', href: 'https://script.google.com/macros/s/AKfycbwBpMpm0ObECgliOGoEkuob0vtzF6UsaMqJKMHRCeHfgSUtHlMZXesBJ_T3mQrcq4H0Ug/exec' },
      { name: 'Monthly AED Inspection', href: 'https://script.google.com/macros/s/AKfycby6nfjcuYnc-vpa3bNtd8HknUKO1otRKQAzqBlyRcwXqPaCKoxJtVA1IkrDJGCvhyyd/exec' },
      { name: 'Shackle Inspection', href: 'https://script.google.com/macros/s/AKfycbwllh5m6X__W6js5GbvaBGxM1Bs_txGhMVzFzWLa9LaAoPJnoQ9f6edZnj-h0b3LEvPfw/exec' },
      { name: 'Synthetic Sling Inspection', href: 'https://script.google.com/macros/s/AKfycbzAmCEGrC-LN7S8ZFSpq3FMhPByCvyXE2stzyQvC6RPU7G2ZwOwiL8-GJvKyr_syUXvhA/exec' },
      { name: 'Wire Rope Inspection', href: 'https://script.google.com/macros/s/AKfycbz8m_7pS6mvzw_Gn55V1d7pZ9iTQ4Du5P-ugsv3J1FvufhDOHeux1Hfb0zZkRx-bNfZ/exec' },
    ]
  },
  {
    id: 'permits',
    title: 'Permits',
    icon: '📝',
    color: 'red',
    forms: [
      { name: 'Confined Space Entry', href: 'https://script.google.com/macros/s/AKfycbyeB2ZC6nn5cQV9Sz0qUyuSSnGsNXJiGsFgJ2x_zRG-9NDHkUmEEUNZYu8EVzRaleVfPA/exec' },
      { name: 'Energized Electrical Work', href: 'https://script.google.com/macros/s/AKfycbyVGarPGIcDZuGaEh01Qe46HMq1Op3Hv17gkY2fr4VqtwrwxOfzh981RXo0_6K18Ycesw/exec' },
      { name: 'Energy Isolation/LOTO', href: 'https://script.google.com/macros/s/AKfycbzFiwE_fiVhSku3-0YISA1KTVpF8BshNUfe3oIjGNDjKxG-72gUxBistS0UehjjoUf1Zw/exec' },
      { name: 'Excavation & Trenching', href: 'https://script.google.com/macros/s/AKfycbxHKFquYsGlJzidCvpMyp0ABSxsPvoSHwFqx0kN09BIfA_RtAcTsYEDwHBohOmmQGrrfA/exec' },
      { name: 'Hot Work', href: 'https://script.google.com/macros/s/AKfycbydcL8Rl1gHTRdUMbQ1N2a3El7p1m2mfjQ3esrZV3RoS9V-Ql9IKa4x_3g2-YhcMT0/exec' },
      { name: 'Opening & Blinding', href: 'https://script.google.com/macros/s/AKfycbyT5tL5gxVhfDdhjEhxiCHzPK3B6qtyVMo1jZJR3o5JVFw1pScf9Sv7riRo_OzNCz2O/exec' },
      { name: 'Unit Work', href: 'https://script.google.com/macros/s/AKfycbx9qgMB2V0VXAeD_MXf9_G00KLCY9xmGZyu5jhjNVUE7JMBGta-_ttWt7iUHL7AvE6KoA/exec' },
    ]
  },
  {
    id: 'lsr-audits',
    title: 'Lifesaving Rules Audits',
    icon: '🛡️',
    color: 'red',
    forms: [
      { name: 'LSR- Confined Spaces', href: 'https://script.google.com/macros/s/AKfycbygYWMVhaVv5DHGBiE69b6Snu2LqX8M8lW0Z6_FAYTZ2ve4QzH36JIXCHsI-4HVQ9KdiQ/exec' },
      { name: 'LSR- Driving', href: 'https://script.google.com/macros/s/AKfycbycddyDWHlMcQXge5a93mQLQaI9CRHivwbw1wiwWKQIIAqWeirBgiHUAtMaAaqJC04M/exec' },
      { name: 'LSR- Energy Isolation', href: 'https://script.google.com/macros/s/AKfycbx1kGrBt3GkOrr8UVpnUXWvJAe9Q3RmlQir_BBc2ew7kksxATtnfkpGcoqnZFqNdL2A/exec' },
      { name: 'LSR- Fall Protection', href: 'https://script.google.com/macros/s/AKfycbwxgJWfAHkZKn5rpb9CZGxYPXzAfLpT9t3ZY654bnxb-xy4nVMLvKpUDAkwYbY7dgWZ/exec' },
      { name: 'LSR- Lifting Operations', href: 'https://script.google.com/macros/s/AKfycbxjt7-lP5XW7aHWXkT7zXvwMGsbfIlypXLJ5kyWRoh3TWnjcuVBdm9Z6rPz_eAPuZk/exec' },
      { name: 'LSR- Line of Fire', href: 'https://script.google.com/macros/s/AKfycbwnvV9vUvROcSm1v50PVViYiWuvt1ERYcuF8ocYs5hh2qBM1ZlkFJ-G1tcpM5xIVmt57g/exec' },
      { name: 'LSR- Work Permits', href: 'https://script.google.com/macros/s/AKfycbwKRIWLRPA9ORqSb91t_92KRViZZ60Wm5pSHERY7Ykswqcn53UQufW-IV8oUDAOTtoX/exec' },
    ]
  },
  {
    id: 'equipment-inspections',
    title: 'Equipment Inspections',
    icon: '🚛',
    color: 'red',
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
    color: 'red',
    forms: [
      { name: 'Daily Scaffold Inspection', href: '/scaffold-inspection-form', isLocal: true },
      { name: 'Exc. & Trench Competent Person Daily Inspection Form', href: '/competent-person-form', isLocal: true },
      { name: 'Fillable THA/JSA', href: 'https://script.google.com/macros/s/AKfycbyXG_2TUazwZEqAGdE6ULettW6fXk94XYM0_6mKRwfa8_Jh6mEHFU2j6RyF5_DQE0PP/exec' },
    ]
  },
  {
    id: 'incident-forms',
    title: 'Incident Forms',
    icon: '🚨',
    color: 'red',
    forms: [
      { name: 'Incident Investigation Form', href: 'https://script.google.com/macros/s/AKfycbxSaiG_z2j6pr1mryb1cngLLaMBKkUppYaFnaL15uNfYXYoaadDzr5ZdJK3byXf4zyM/exec' },
      { name: 'Property Damage Report', href: 'https://script.google.com/macros/s/AKfycbwTxdpgiZy9TVZlJxTBaT-gIZAdIQH3g8cLuBTnKQsOyeGGOXyIQfgiCUyFitmsJSk/exec' },
    ]
  },
  {
    id: 'critical-lift',
    title: 'Critical Lift Plans',
    icon: '🏗️',
    color: 'red',
    forms: [
      { name: 'Critical Lift Plan', href: '/critical-lift-plan', isLocal: true },
    ]
  }
]

export default function SafetyPortal() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(null)

  const totalForms = FORM_CATEGORIES.reduce((sum, category) => sum + category.forms.length, 0)

  const filteredCategories = FORM_CATEGORIES.filter(category => 
    category.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    category.forms.some(form => form.name.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const handleCategoryClick = (category) => {
    setSelectedCategory(category)
  }

  const handleBackClick = () => {
    setSelectedCategory(null)
  }

  if (selectedCategory) {
    return (
      <div className="portal-page">
        <style jsx>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { background: #1e293b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
          .portal-page { min-height: 100vh; background: #1e293b; padding: 20px; }
          .back-btn { background: #475569; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; margin-bottom: 20px; }
          .back-btn:hover { background: #64748b; }
          .category-header { background: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 20px; }
          .category-title { font-size: 28px; font-weight: 700; color: #1e293b; }
          .forms-list { display: flex; flex-direction: column; gap: 12px; }
          .form-item { background: white; padding: 16px 20px; border-radius: 8px; text-decoration: none; color: #1e293b; display: flex; justify-content: space-between; align-items: center; transition: transform 0.2s; }
          .form-item:hover { transform: translateX(4px); background: #f8fafc; }
          .form-name { font-size: 16px; font-weight: 500; }
          .local-badge { background: #10b981; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; }
        `}</style>

        <button className="back-btn" onClick={handleBackClick}>← Back to Categories</button>
        
        <div className="category-header">
          <div className="category-title">{selectedCategory.icon} {selectedCategory.title}</div>
        </div>

        <div className="forms-list">
          {selectedCategory.forms.map((form, idx) => (
            form.isLocal ? (
              <Link key={idx} href={form.href} className="form-item">
                <span className="form-name">{form.name}</span>
                <span className="local-badge">⚡ NEW</span>
              </Link>
            ) : (
              <a key={idx} href={form.href} target="_blank" rel="noopener noreferrer" className="form-item">
                <span className="form-name">{form.name}</span>
              </a>
            )
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="portal-page">
      <style jsx>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #1e293b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        
        .portal-page {
          min-height: 100vh;
          background: #1e293b;
          padding: 20px;
        }
        
        .container {
          max-width: 800px;
          margin: 0 auto;
        }
        
        .header-card {
          background: white;
          border-radius: 12px;
          padding: 40px 30px;
          text-align: center;
          margin-bottom: 30px;
        }
        
        .logo {
          max-width: 180px;
          height: auto;
          margin-bottom: 20px;
        }
        
        .title {
          font-size: 32px;
          font-weight: 700;
          color: #dc2626;
          margin-bottom: 8px;
        }
        
        .subtitle {
          font-size: 16px;
          color: #1e293b;
          font-weight: 500;
          margin-bottom: 5px;
        }
        
        .tagline {
          font-size: 14px;
          color: #ea580c;
          font-style: italic;
        }
        
        .stats {
          display: flex;
          justify-content: center;
          gap: 40px;
          margin: 30px 0;
        }
        
        .stat {
          text-align: center;
        }
        
        .stat-number {
          font-size: 36px;
          font-weight: 700;
          color: #1e293b;
        }
        
        .stat-label {
          font-size: 12px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-top: 4px;
        }
        
        .search-box {
          width: 100%;
          padding: 15px 20px;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          margin-bottom: 20px;
          background: #f1f5f9;
        }
        
        .search-box:focus {
          outline: 2px solid #3b82f6;
        }
        
        .categories-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 15px;
        }
        
        .category-card {
          background: linear-gradient(135deg, #f97316 0%, #dc2626 100%);
          border-radius: 12px;
          padding: 20px;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          color: white;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border: none;
          text-align: left;
        }
        
        .category-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 16px rgba(0,0,0,0.3);
        }
        
        .category-card.green {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        }
        
        .category-card.orange {
          background: linear-gradient(135deg, #f97316 0%, #dc2626 100%);
        }
        
        .category-card.red {
          background: linear-gradient(135deg, #f97316 0%, #dc2626 100%);
        }
        
        .category-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .category-icon {
          font-size: 28px;
        }
        
        .category-title {
          font-size: 15px;
          font-weight: 600;
        }
        
        .category-count {
          background: rgba(255,255,255,0.3);
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 700;
          min-width: 40px;
          text-align: center;
        }
        
        .footer {
          text-align: center;
          color: #94a3b8;
          font-size: 12px;
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #334155;
        }
        
        .footer a {
          color: #f97316;
          text-decoration: none;
        }
        
        .footer-powered {
          margin-top: 8px;
          font-size: 10px;
          color: #64748b;
        }
        
        @media (max-width: 600px) {
          .categories-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="container">
        <div className="header-card">
          <img src="/Logo.png" alt="SLP Alaska Logo" className="logo" />
          <h1 className="title">SLP Safety Portal</h1>
          <p className="subtitle">Safety • Leadership • Performance</p>
          <p className="tagline">"Safety isn't expensive, it's PRICELESS!"</p>
          
          <div className="stats">
            <div className="stat">
              <div className="stat-number">{totalForms}</div>
              <div className="stat-label">Forms</div>
            </div>
            <div className="stat">
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
        
        <div className="categories-grid">
          {filteredCategories.map(category => (
            <button
              key={category.id}
              className={`category-card ${category.color}`}
              onClick={() => handleCategoryClick(category)}
            >
              <div className="category-left">
                <span className="category-icon">{category.icon}</span>
                <span className="category-title">{category.title}</span>
              </div>
              <span className="category-count">{category.forms.length}</span>
            </button>
          ))}
        </div>
        
        <div className="footer">
          <p>© 2025 SLP Alaska | <a href="tel:9072023274">(907) 202-3274</a></p>
          <p>Safety • Leadership • Performance</p>
          <p className="footer-powered">Powered by Predictive Safety Analytics™ © 2025 SLP Alaska</p>
        </div>
      </div>
    </div>
  )
}

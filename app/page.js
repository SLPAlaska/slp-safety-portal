'use client'

import { useState } from 'react'
import Link from 'next/link'

// Form data organized by category
const FORM_CATEGORIES = [
  {
    id: 'training-competency',
    title: 'Training & Competency',
    icon: '🎯',
    isTraining: true,
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
      { name: 'Daily Scaffold Inspection', href: 'https://script.google.com/macros/s/AKfycbzq5zwZDZR15CP1YgOF-jKw5b36qgoXl_m8n6zaVnDOkfiIWGkFCe0JfLXlOYl4iHAAIA/exec' },
      { name: 'Exc. & Trench Competent Person Daily Inspection Form', href: '/competent-person-form', isLocal: true },
      { name: 'Fillable THA/JSA', href: 'https://script.google.com/macros/s/AKfycbyXG_2TUazwZEqAGdE6ULettW6fXk94XYM0_6mKRwfa8_Jh6mEHFU2j6RyF5_DQE0PP/exec' },
    ]
  },
  {
    id: 'incident-forms',
    title: 'Incident Forms',
    icon: '🚨',
    forms: [
      { name: 'Incident Investigation Form', href: 'https://script.google.com/macros/s/AKfycbxSaiG_z2j6pr1mryb1cngLLaMBKkUppYaFnaL15uNfYXYoaadDzr5ZdJK3byXf4zyM/exec' },
      { name: 'Property Damage Report', href: 'https://script.google.com/macros/s/AKfycbwTxdpgiZy9TVZlJxTBaT-gIZAdIQH3g8cLuBTnKQsOyeGGOXyIQfgiCUyFitmsJSk/exec' },
    ]
  },
  {
    id: 'critical-lift',
    title: 'Critical Lift Planning',
    icon: '🏗️',
    forms: [
      { name: 'Critical Lift Plan', href: '/critical-lift-plan', isLocal: true },
    ]
  }
]

export default function SafetyPortal() {
  const [searchQuery, setSearchQuery] = useState('')
  const [openFolders, setOpenFolders] = useState({})

  const totalForms = FORM_CATEGORIES.reduce((sum, category) => sum + category.forms.length, 0)

  const filteredCategories = FORM_CATEGORIES
    .map(category => ({
      ...category,
      forms: category.forms.filter(form => 
        form.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }))
    .filter(category => category.forms.length > 0)

  const toggleFolder = (id) => {
    setOpenFolders(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="portal-page">
      <style jsx>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body, html { height: 100%; }
        
        .portal-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .container {
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .header {
          text-align: center;
          color: white;
          margin-bottom: 30px;
        }
        
        .logo {
          max-width: 200px;
          height: auto;
          margin-bottom: 20px;
          filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));
        }
        
        .header h1 {
          font-size: 32px;
          font-weight: 700;
          margin-bottom: 10px;
          text-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        .subtitle {
          font-size: 18px;
          margin-bottom: 5px;
          opacity: 0.95;
        }
        
        .tagline {
          font-size: 14px;
          opacity: 0.85;
          font-style: italic;
        }
        
        .stats-bar {
          display: flex;
          justify-content: center;
          gap: 30px;
          margin-bottom: 30px;
        }
        
        .stat-item {
          background: rgba(255,255,255,0.15);
          backdrop-filter: blur(10px);
          padding: 15px 30px;
          border-radius: 10px;
          text-align: center;
          color: white;
        }
        
        .stat-number {
          font-size: 32px;
          font-weight: 700;
        }
        
        .stat-label {
          font-size: 12px;
          opacity: 0.9;
          margin-top: 5px;
        }
        
        .search-box {
          width: 100%;
          padding: 15px 20px;
          font-size: 16px;
          border: none;
          border-radius: 10px;
          margin-bottom: 30px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        .search-box:focus {
          outline: 3px solid #fbbf24;
        }
        
        .folders-grid {
          display: grid;
          gap: 20px;
        }
        
        .folder {
          background: white;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .folder:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 12px rgba(0,0,0,0.15);
        }
        
        .folder-header {
          background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
          color: white;
          padding: 15px 20px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-weight: 600;
          font-size: 15px;
        }
        
        .folder-header.training {
          background: linear-gradient(135deg, #059669 0%, #10b981 100%);
        }
        
        .folder-title {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .folder-icon {
          font-size: 20px;
        }
        
        .folder-count {
          background: rgba(255,255,255,0.2);
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px;
        }
        
        .folder-arrow {
          transition: transform 0.3s;
          font-size: 12px;
        }
        
        .folder.open .folder-arrow {
          transform: rotate(180deg);
        }
        
        .folder-content {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.3s ease;
        }
        
        .folder.open .folder-content {
          max-height: 2000px;
        }
        
        .form-link {
          display: block;
          padding: 12px 20px;
          color: #1e3a8a;
          text-decoration: none;
          border-bottom: 1px solid #f3f4f6;
          transition: background 0.2s;
          font-size: 14px;
        }
        
        .form-link:last-child {
          border-bottom: none;
        }
        
        .form-link:hover {
          background: #f8fafc;
        }
        
        .form-link::before {
          content: "📄 ";
          margin-right: 8px;
        }
        
        .form-link.local::before {
          content: "⚡ ";
        }
        
        .no-results {
          text-align: center;
          padding: 40px;
          color: rgba(255,255,255,0.7);
        }
        
        .footer {
          text-align: center;
          margin-top: 30px;
          color: rgba(255,255,255,0.7);
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
          color: rgba(255,255,255,0.5);
        }
        
        @media (max-width: 600px) {
          .portal-page { padding: 10px; }
          .header h1 { font-size: 22px; }
          .folder-header { padding: 12px 15px; font-size: 13px; }
          .form-link { padding: 10px 15px; font-size: 12px; }
          .stats-bar { gap: 15px; }
          .stat-item { padding: 8px 15px; }
        }
      `}</style>

      <div className="container">
        <div className="header">
          <img src="/Logo.png" alt="SLP Alaska Logo" className="logo" />
          <h1>🛡️ SLP Safety Portal</h1>
          <p className="subtitle">Safety • Leadership • Performance</p>
          <p className="tagline">"Safety isn't expensive, it's PRICELESS!"</p>
        </div>
        
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
        
        <input
          type="text"
          className="search-box"
          placeholder="🔍 Search forms..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            // Auto-open folders when searching
            if (e.target.value) {
              const newOpen = {}
              FORM_CATEGORIES.forEach(cat => { newOpen[cat.id] = true })
              setOpenFolders(newOpen)
            } else {
              setOpenFolders({})
            }
          }}
        />
        
        {filteredCategories.length === 0 ? (
          <div className="no-results">
            <p>No forms found matching your search.</p>
          </div>
        ) : (
          <div className="folders-grid">
            {filteredCategories.map(category => (
              <div key={category.id} className={`folder ${openFolders[category.id] ? 'open' : ''}`}>
                <div 
                  className={`folder-header ${category.isTraining ? 'training' : ''}`}
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
                    form.isLocal ? (
                      <Link key={idx} href={form.href} className={`form-link ${form.isLocal ? 'local' : ''}`}>
                        {form.name}
                      </Link>
                    ) : (
                      <a key={idx} href={form.href} target="_blank" rel="noopener noreferrer" className="form-link">
                        {form.name}
                      </a>
                    )
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="footer">
          <p>© 2026 SLP Alaska | <a href="tel:9072023274">(907) 202-3274</a></p>
          <p style={{marginTop: '5px'}}>Safety • Leadership • Performance</p>
          <p className="powered-by">Powered by Predictive Safety Analytics™ © 2026 SLP Alaska</p>
        </div>
      </div>
    </div>
  )
}

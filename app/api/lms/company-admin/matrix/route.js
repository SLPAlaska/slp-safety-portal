import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib'

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16)/255
  const g = parseInt(hex.slice(3,5),16)/255
  const b = parseInt(hex.slice(5,7),16)/255
  return rgb(r,g,b)
}

const COLORS = {
  complete:    hexToRgb('#1b5e20'),
  completeBg:  hexToRgb('#e8f5e9'),
  inProgress:  hexToRgb('#0d47a1'),
  inProgBg:    hexToRgb('#e3f2fd'),
  notStarted:  hexToRgb('#b71c1c'),
  notStartBg:  hexToRgb('#ffebee'),
  na:          hexToRgb('#9e9e9e'),
  naBg:        hexToRgb('#f5f5f5'),
  headerBg:    hexToRgb('#1e3a5f'),
  headerText:  hexToRgb('#ffffff'),
  subHeaderBg: hexToRgb('#2d5a87'),
  altRow:      hexToRgb('#f8fafc'),
  border:      hexToRgb('#e0e0e0'),
  black:       rgb(0,0,0),
  white:       rgb(1,1,1),
  slpRed:      hexToRgb('#b71c1c'),
  slpBlue:     hexToRgb('#1e3a5f'),
  gold:        hexToRgb('#fbbf24'),
}

export async function POST(request) {
  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  const authHeader = request.headers.get('authorization')
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: adminUser } = await supabaseAdmin
    .from('lms_users')
    .select('id, company_id, role, full_name, lms_companies(name)')
    .eq('auth_user_id', user.id)
    .single()

  if (!adminUser || adminUser.role !== 'company_admin')
    return NextResponse.json({ error: 'Access denied.' }, { status: 403 })

  const body = await request.json()
  const { filters = {} } = body
  const { work_location, client_project, department, employee_ids, course_ids, date_from, date_to } = filters

  // Fetch all employees in company
  let empQuery = supabaseAdmin
    .from('lms_users')
    .select('id, full_name, job_title, work_location, client_project, department, employee_id, hire_date')
    .eq('company_id', adminUser.company_id)
    .eq('active', true)
    .neq('role', 'company_admin')
    .order('full_name')

  const { data: allEmployees } = await empQuery

  // Apply filters
  let employees = allEmployees || []
  if (work_location) employees = employees.filter(e => e.work_location === work_location)
  if (client_project) employees = employees.filter(e => e.client_project === client_project)
  if (department) employees = employees.filter(e => e.department === department)
  if (employee_ids?.length > 0) employees = employees.filter(e => employee_ids.includes(e.id))

  const employeeIds = employees.map(e => e.id)

  // Fetch required courses
  const { data: required } = await supabaseAdmin
    .from('lms_required_courses')
    .select('course_id, lms_courses(id, title, regulation_ref)')
    .eq('company_id', adminUser.company_id)

  // Fetch individual assignments
  const { data: individual } = employeeIds.length > 0
    ? await supabaseAdmin.from('lms_individual_assignments')
        .select('user_id, course_id, lms_courses(id, title, regulation_ref)').in('user_id', employeeIds)
    : { data: [] }

  // Build course map
  const courseMap = {}
  ;(required || []).forEach(r => {
    if (r.lms_courses) courseMap[r.course_id] = { ...r.lms_courses, is_required: true }
  })
  ;(individual || []).forEach(i => {
    if (i.lms_courses && !courseMap[i.course_id])
      courseMap[i.course_id] = { ...i.lms_courses, is_required: false }
  })

  let courseIds = Object.keys(courseMap)
  if (course_ids?.length > 0) courseIds = courseIds.filter(id => course_ids.includes(id))

  // Sort: required first, then alphabetical
  courseIds.sort((a,b) => {
    const aReq = courseMap[a]?.is_required ? 0 : 1
    const bReq = courseMap[b]?.is_required ? 0 : 1
    if (aReq !== bReq) return aReq - bReq
    return courseMap[a]?.title.localeCompare(courseMap[b]?.title)
  })

  // Fetch completions
  const { data: completions } = employeeIds.length > 0
    ? await supabaseAdmin.from('lms_completions')
        .select('user_id, course_id, completed_at, certificate_id').in('user_id', employeeIds)
    : { data: [] }

  // Fetch progress
  const { data: progress } = employeeIds.length > 0
    ? await supabaseAdmin.from('lms_progress')
        .select('user_id, course_id, slide_id, completed').in('user_id', employeeIds)
    : { data: [] }

  // Fetch slide counts
  const { data: slideCounts } = await supabaseAdmin
    .from('lms_slides').select('course_id').in('course_id', courseIds)

  // Build matrix data
  const matrix = employees.map(emp => {
    const empCourseIds = [
      ...new Set([
        ...(required || []).map(r => r.course_id),
        ...(individual || []).filter(i => i.user_id === emp.id).map(i => i.course_id),
      ])
    ].filter(id => courseIds.includes(id))

    const courseData = courseIds.map(courseId => {
      if (!empCourseIds.includes(courseId)) return { status: 'N/A', date: null, cert: null }
      const completion = (completions || []).find(c => {
        if (c.user_id !== emp.id || c.course_id !== courseId) return false
        if (date_from && new Date(c.completed_at) < new Date(date_from)) return false
        if (date_to && new Date(c.completed_at) > new Date(date_to)) return false
        return true
      })
      if (completion) return { status: 'Complete', date: completion.completed_at, cert: completion.certificate_id }
      const courseProgress = (progress || []).filter(p => p.user_id === emp.id && p.course_id === courseId && p.completed)
      const totalSlides = (slideCounts || []).filter(s => s.course_id === courseId).length
      if (courseProgress.length > 0 && totalSlides > 0) {
        const pct = Math.round((courseProgress.length / totalSlides) * 100)
        return { status: 'In Progress', pct, date: null, cert: null }
      }
      return { status: 'Not Started', date: null, cert: null }
    })

    return { ...emp, courseData }
  })

  // Compute summary stats
  const totalAssignments = matrix.reduce((sum, emp) => sum + emp.courseData.filter(c => c.status !== 'N/A').length, 0)
  const totalComplete = matrix.reduce((sum, emp) => sum + emp.courseData.filter(c => c.status === 'Complete').length, 0)
  const overallCompliance = totalAssignments > 0 ? Math.round((totalComplete / totalAssignments) * 100) : 0
  const fullyCompliant = matrix.filter(emp => emp.courseData.filter(c => c.status !== 'N/A').every(c => c.status === 'Complete')).length
  const atRisk = matrix.filter(emp => emp.courseData.some(c => c.status === 'Not Started' && courseMap[courseIds[emp.courseData.indexOf(c)]]?.is_required)).length

  // Course compliance rates
  const courseCompliance = courseIds.map(courseId => {
    const idx = courseIds.indexOf(courseId)
    const assigned = matrix.filter(e => e.courseData[idx]?.status !== 'N/A')
    const complete = assigned.filter(e => e.courseData[idx]?.status === 'Complete')
    return {
      title: courseMap[courseId]?.title || '',
      rate: assigned.length > 0 ? Math.round((complete.length / assigned.length) * 100) : 0,
      assigned: assigned.length,
      complete: complete.length,
      is_required: courseMap[courseId]?.is_required || false,
    }
  }).sort((a,b) => a.rate - b.rate)

  // ── BUILD PDF ──────────────────────────────────────────────
  const pdfDoc = await PDFDocument.create()
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique)

  const companyName = adminUser.lms_companies?.name || 'Company'
  const generatedDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const filterDesc = [
    work_location ? `Location: ${work_location}` : null,
    client_project ? `Client: ${client_project}` : null,
    department ? `Department: ${department}` : null,
    employee_ids?.length > 0 ? `Selected employees: ${employee_ids.length}` : null,
    date_from || date_to ? `Period: ${date_from || 'Start'} – ${date_to || 'Present'}` : null,
  ].filter(Boolean).join(' | ') || 'All Employees'

  // ── PAGE 1: EXECUTIVE SUMMARY ──────────────────────────────
  const sumPage = pdfDoc.addPage([792, 612]) // Letter landscape
  const sw = sumPage.getWidth()
  const sh = sumPage.getHeight()

  // Header band
  sumPage.drawRectangle({ x: 0, y: sh - 90, width: sw, height: 90, color: COLORS.slpBlue })

  // Title
  sumPage.drawText('TRAINING COMPLIANCE REPORT', {
    x: 30, y: sh - 38, size: 20, font: fontBold, color: COLORS.white,
  })
  sumPage.drawText(`${companyName}  |  CONFIDENTIAL`, {
    x: 30, y: sh - 58, size: 11, font: fontRegular, color: COLORS.gold,
  })
  sumPage.drawText(`Generated: ${generatedDate}  |  Filter: ${filterDesc}  |  By: ${adminUser.full_name}`, {
    x: 30, y: sh - 76, size: 9, font: fontRegular, color: rgb(0.8, 0.85, 0.9),
  })

  // SLP Alaska tag top right
  sumPage.drawText('SLP Alaska, LLC', { x: sw - 160, y: sh - 38, size: 12, font: fontBold, color: COLORS.gold })
  sumPage.drawText('AnthroSafe™ Safety Platform', { x: sw - 175, y: sh - 54, size: 8, font: fontRegular, color: rgb(0.7,0.75,0.85) })
  sumPage.drawText('Safety isn\'t expensive, it\'s PRICELESS!', { x: sw - 200, y: sh - 68, size: 7.5, font: fontOblique, color: rgb(0.7,0.75,0.85) })

  // Overall compliance big circle area
  const complianceColor = overallCompliance >= 80 ? COLORS.complete : overallCompliance >= 50 ? COLORS.inProgress : COLORS.notStarted
  const complianceBgColor = overallCompliance >= 80 ? COLORS.completeBg : overallCompliance >= 50 ? COLORS.inProgBg : hexToRgb('#ffebee')

  sumPage.drawRectangle({ x: 30, y: sh - 220, width: 160, height: 120, color: complianceBgColor, borderColor: complianceColor, borderWidth: 2 })
  sumPage.drawText('OVERALL COMPLIANCE', { x: 40, y: sh - 115, size: 8, font: fontBold, color: complianceColor })
  sumPage.drawText(`${overallCompliance}%`, { x: 55, y: sh - 165, size: 42, font: fontBold, color: complianceColor })
  sumPage.drawText(`${totalComplete} of ${totalAssignments} completed`, { x: 42, y: sh - 185, size: 8, font: fontRegular, color: complianceColor })

  // Stat boxes
  const statBoxes = [
    { label: 'EMPLOYEES ASSESSED', value: String(employees.length), color: COLORS.slpBlue, bg: hexToRgb('#e8edf5') },
    { label: 'FULLY COMPLIANT', value: String(fullyCompliant), color: COLORS.complete, bg: COLORS.completeBg },
    { label: 'AT RISK', value: String(atRisk), color: COLORS.notStarted, bg: hexToRgb('#ffebee') },
    { label: 'COURSES TRACKED', value: String(courseIds.length), color: hexToRgb('#4a148c'), bg: hexToRgb('#f3e5f5') },
  ]

  statBoxes.forEach((box, i) => {
    const x = 210 + i * 140
    sumPage.drawRectangle({ x, y: sh - 220, width: 125, height: 120, color: box.bg, borderColor: box.color, borderWidth: 1.5 })
    sumPage.drawText(box.label, { x: x + 8, y: sh - 115, size: 7, font: fontBold, color: box.color })
    sumPage.drawText(box.value, { x: x + 35, y: sh - 165, size: 38, font: fontBold, color: box.color })
  })

  // Course compliance table
  sumPage.drawText('COURSE-BY-COURSE COMPLIANCE', {
    x: 30, y: sh - 248, size: 10, font: fontBold, color: COLORS.slpBlue,
  })
  sumPage.drawRectangle({ x: 30, y: sh - 260, width: 430, height: 14, color: COLORS.headerBg })
  sumPage.drawText('Course Title', { x: 35, y: sh - 257, size: 7.5, font: fontBold, color: COLORS.white })
  sumPage.drawText('Required', { x: 275, y: sh - 257, size: 7.5, font: fontBold, color: COLORS.white })
  sumPage.drawText('Assigned', { x: 320, y: sh - 257, size: 7.5, font: fontBold, color: COLORS.white })
  sumPage.drawText('Complete', { x: 365, y: sh - 257, size: 7.5, font: fontBold, color: COLORS.white })
  sumPage.drawText('Rate', { x: 410, y: sh - 257, size: 7.5, font: fontBold, color: COLORS.white })

  const maxCourseRows = Math.min(courseCompliance.length, 16)
  courseCompliance.slice(0, maxCourseRows).forEach((c, i) => {
    const y = sh - 274 - i * 14
    const rowBg = i % 2 === 0 ? COLORS.white : COLORS.altRow
    const rateColor = c.rate >= 80 ? COLORS.complete : c.rate >= 50 ? COLORS.inProgress : COLORS.notStarted
    sumPage.drawRectangle({ x: 30, y: y - 4, width: 430, height: 14, color: rowBg })
    const title = c.title.length > 45 ? c.title.slice(0, 42) + '…' : c.title
    sumPage.drawText(title, { x: 35, y, size: 7, font: fontRegular, color: COLORS.black })
    sumPage.drawText(c.is_required ? "*" : "-", { x: 290, y, size: 7, font: fontRegular, color: c.is_required ? COLORS.slpRed : COLORS.na })
    sumPage.drawText(String(c.assigned), { x: 335, y, size: 7, font: fontRegular, color: COLORS.black })
    sumPage.drawText(String(c.complete), { x: 380, y, size: 7, font: fontRegular, color: COLORS.complete })
    sumPage.drawText(`${c.rate}%`, { x: 415, y, size: 7.5, font: fontBold, color: rateColor })
  })

  // Employees needing attention (right column)
  sumPage.drawText('EMPLOYEES REQUIRING ATTENTION', {
    x: 480, y: sh - 248, size: 10, font: fontBold, color: COLORS.slpRed,
  })
  sumPage.drawRectangle({ x: 480, y: sh - 260, width: 285, height: 14, color: COLORS.notStarted })
  sumPage.drawText('Employee', { x: 485, y: sh - 257, size: 7.5, font: fontBold, color: COLORS.white })
  sumPage.drawText('Incomplete Required', { x: 630, y: sh - 257, size: 7.5, font: fontBold, color: COLORS.white })

  const atRiskEmployees = matrix
    .map(emp => {
      const incomplete = emp.courseData.filter((c, i) => c.status !== 'Complete' && c.status !== 'N/A' && courseMap[courseIds[i]]?.is_required).length
      return { ...emp, incomplete }
    })
    .filter(e => e.incomplete > 0)
    .sort((a,b) => b.incomplete - a.incomplete)

  const maxAtRisk = Math.min(atRiskEmployees.length, 16)
  atRiskEmployees.slice(0, maxAtRisk).forEach((emp, i) => {
    const y = sh - 274 - i * 14
    const rowBg = i % 2 === 0 ? COLORS.white : hexToRgb('#fff5f5')
    sumPage.drawRectangle({ x: 480, y: y - 4, width: 285, height: 14, color: rowBg })
    const name = emp.full_name.length > 28 ? emp.full_name.slice(0,25) + '…' : emp.full_name
    sumPage.drawText(name, { x: 485, y, size: 7, font: fontRegular, color: COLORS.black })
    sumPage.drawText(String(emp.incomplete), { x: 680, y, size: 7.5, font: fontBold, color: COLORS.notStarted })
  })

  // Footer
  sumPage.drawRectangle({ x: 0, y: 0, width: sw, height: 24, color: COLORS.slpBlue })
  sumPage.drawText('SLP Alaska, LLC  |  AnthroSafe™ Training Compliance Platform  |  CONFIDENTIAL — FOR AUTHORIZED USE ONLY', {
    x: 30, y: 8, size: 7, font: fontRegular, color: rgb(0.7,0.75,0.85),
  })
  sumPage.drawText('Page 1', { x: sw - 50, y: 8, size: 7, font: fontRegular, color: rgb(0.7,0.75,0.85) })

  // ── GRID PAGES ─────────────────────────────────────────────
  const numCourses = courseIds.length
  const isLandscape = numCourses > 5

  const pageW = isLandscape ? 792 : 612
  const pageH = isLandscape ? 612 : 792
  const margin = 28

  // Column widths
  const empColW = 130
  const titleColW = 70
  const availW = pageW - margin * 2 - empColW - titleColW
  const cellW = numCourses > 0 ? Math.max(Math.min(availW / numCourses, 80), 40) : 80
  const headerH = numCourses > 6 ? 70 : 40
  const rowH = 20

  // How many employees per page
  const usableH = pageH - margin * 2 - headerH - 30
  const rowsPerPage = Math.floor(usableH / rowH)

  const totalPages = Math.ceil(matrix.length / rowsPerPage)

  for (let pageNum = 0; pageNum < totalPages; pageNum++) {
    const page = pdfDoc.addPage([pageW, pageH])
    const pw = page.getWidth()
    const ph = page.getHeight()

    // Page header band
    page.drawRectangle({ x: 0, y: ph - 36, width: pw, height: 36, color: COLORS.slpBlue })
    page.drawText(`${companyName} — Training Compliance Matrix`, {
      x: margin, y: ph - 22, size: 11, font: fontBold, color: COLORS.white,
    })
    page.drawText(`${filterDesc}  |  ${generatedDate}  |  CONFIDENTIAL`, {
      x: margin, y: ph - 33, size: 7.5, font: fontRegular, color: rgb(0.7,0.75,0.85),
    })
    page.drawText(`Page ${pageNum + 2} of ${totalPages + 1}`, {
      x: pw - 80, y: ph - 22, size: 8, font: fontRegular, color: COLORS.gold,
    })

    const tableTop = ph - 36 - 8
    const startX = margin
    const headerY = tableTop - headerH

    // Column headers background
    page.drawRectangle({ x: startX, y: headerY, width: empColW + titleColW, height: headerH, color: COLORS.subHeaderBg })
    page.drawText('EMPLOYEE', { x: startX + 4, y: headerY + headerH/2 - 3, size: 7, font: fontBold, color: COLORS.white })
    page.drawText('TITLE / LOCATION', { x: startX + empColW + 4, y: headerY + headerH/2 - 3, size: 6.5, font: fontBold, color: COLORS.white })

    // Course headers
    courseIds.forEach((courseId, ci) => {
      const x = startX + empColW + titleColW + ci * cellW
      const course = courseMap[courseId]
      const isReq = course?.is_required
      page.drawRectangle({ x, y: headerY, width: cellW, height: headerH,
        color: isReq ? COLORS.headerBg : COLORS.subHeaderBg,
        borderColor: COLORS.white, borderWidth: 0.5,
      })
      const title = course?.title || ''
      const maxChars = Math.floor(cellW / 3.8)
      const words = title.split(' ')
      let lines = []
      let line = ''
      words.forEach(w => {
        if ((line + ' ' + w).trim().length <= maxChars) {
          line = (line + ' ' + w).trim()
        } else {
          if (line) lines.push(line)
          line = w.slice(0, maxChars)
        }
      })
      if (line) lines.push(line)
      lines = lines.slice(0, headerH > 50 ? 5 : 3)
      const lineH = 9
      const textBlockH = lines.length * lineH
      const startTextY = headerY + headerH/2 + textBlockH/2 - lineH + 2
      lines.forEach((l, li) => {
        page.drawText(l, {
          x: x + 2, y: startTextY - li * lineH,
          size: 6.5, font: isReq ? fontBold : fontRegular, color: COLORS.white,
        })
      })
      if (isReq) {
        page.drawText("*", { x: x + cellW/2 - 4, y: headerY + 4, size: 7, font: fontBold, color: COLORS.gold })
      }
    })

    // Employee rows
    const pageEmployees = matrix.slice(pageNum * rowsPerPage, (pageNum + 1) * rowsPerPage)
    pageEmployees.forEach((emp, ri) => {
      const y = headerY - (ri + 1) * rowH
      const rowBg = ri % 2 === 0 ? COLORS.white : COLORS.altRow

      // Employee name cell
      page.drawRectangle({ x: startX, y, width: empColW, height: rowH, color: rowBg, borderColor: COLORS.border, borderWidth: 0.3 })
      const name = emp.full_name.length > 20 ? emp.full_name.slice(0,18) + '…' : emp.full_name
      page.drawText(name, { x: startX + 3, y: y + rowH/2 - 3, size: 7.5, font: fontBold, color: COLORS.slpBlue })

      // Title/location cell
      page.drawRectangle({ x: startX + empColW, y, width: titleColW, height: rowH, color: rowBg, borderColor: COLORS.border, borderWidth: 0.3 })
      const titleText = (emp.job_title || '').slice(0, 14)
      const locText = (emp.work_location || emp.client_project || '').slice(0, 14)
      page.drawText(titleText, { x: startX + empColW + 3, y: y + rowH/2 + 1, size: 6, font: fontRegular, color: COLORS.black })
      if (locText) page.drawText(locText, { x: startX + empColW + 3, y: y + rowH/2 - 7, size: 5.5, font: fontOblique, color: COLORS.na })

      // Course cells
      emp.courseData.forEach((cell, ci) => {
        const cx = startX + empColW + titleColW + ci * cellW
        let bg, textColor, label

        if (cell.status === 'N/A') {
          bg = COLORS.naBg; textColor = COLORS.na; label = '—'
        } else if (cell.status === 'Complete') {
          bg = COLORS.completeBg; textColor = COLORS.complete
          label = cell.date ? new Date(cell.date).toLocaleDateString('en-US', {month:'numeric',day:'numeric',year:'2-digit'}) : '✓'
        } else if (cell.status === 'In Progress') {
          bg = COLORS.inProgBg; textColor = COLORS.inProgress
          label = cell.pct ? `${cell.pct}%` : 'In Prog'
        } else {
          bg = hexToRgb('#ffebee'); textColor = COLORS.notStarted; label = 'NOT STARTED'
        }

        page.drawRectangle({ x: cx, y, width: cellW, height: rowH, color: bg, borderColor: COLORS.border, borderWidth: 0.3 })
        const labelSize = label.length > 8 ? 5.5 : 7
        const labelX = cx + cellW/2 - (label.length * labelSize * 0.3)
        page.drawText(label, { x: Math.max(cx + 2, labelX), y: y + rowH/2 - 3, size: labelSize, font: cell.status === 'Complete' ? fontBold : fontRegular, color: textColor })
      })
    })

    // Legend
    const legendY = margin + 8
    const legendItems = [
      { label: "* Required Course", color: COLORS.complete },
      { label: '✓ Complete (with date)', color: COLORS.complete },
      { label: 'In Progress (%)', color: COLORS.inProgress },
      { label: 'NOT STARTED', color: COLORS.notStarted },
      { label: '— Not Assigned', color: COLORS.na },
    ]
    legendItems.forEach((item, i) => {
      page.drawRectangle({ x: margin + i * 130, y: legendY - 2, width: 10, height: 10,
        color: i === 0 ? COLORS.headerBg : i === 1 ? COLORS.completeBg : i === 2 ? COLORS.inProgBg : i === 3 ? hexToRgb('#ffebee') : COLORS.naBg,
        borderColor: item.color, borderWidth: 1,
      })
      page.drawText(item.label, { x: margin + i * 130 + 14, y: legendY, size: 6.5, font: fontRegular, color: item.color })
    })

    // Footer
    page.drawRectangle({ x: 0, y: 0, width: pw, height: 20, color: COLORS.slpBlue })
    page.drawText('SLP Alaska, LLC  |  AnthroSafe™  |  CONFIDENTIAL', {
      x: margin, y: 6, size: 6.5, font: fontRegular, color: rgb(0.7,0.75,0.85),
    })
    page.drawText(`Generated ${generatedDate} by ${adminUser.full_name}`, {
      x: pw - 200, y: 6, size: 6.5, font: fontRegular, color: rgb(0.7,0.75,0.85),
    })
  }

  const pdfBytes = await pdfDoc.save()
  const filename = `${companyName.replace(/\s+/g,'_')}_Training_Matrix_${new Date().toISOString().split('T')[0]}.pdf`

  return new NextResponse(pdfBytes, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

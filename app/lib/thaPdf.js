// Build a THA PDF from tha_assessments + task steps + crew sign-offs.
// Used when tha_assessments.pdf_url is empty. Standard fonts are WinAnsi,
// so characters outside that set are replaced. The bytes are then stored on
// the incident-evidence path, the same bucket as other investigation evidence.

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 48;
const NAVY = rgb(0.118, 0.227, 0.373);
const TEXT = rgb(0.1, 0.1, 0.12);
const MUTED = rgb(0.35, 0.38, 0.42);

function win(value) {
  return String(value ?? '').replace(/\r\n/g, '\n').replace(/[^\x09\x0a\x20-\x7e]/g, '?');
}

function showVal(value) {
  if (value == null || value === '') return '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.map(showVal).filter(Boolean).join(', ');
  if (typeof value === 'object') {
    const on = Object.entries(value)
      .filter(([, v]) => v === true || v === 'Yes' || v === 'yes')
      .map(([k]) => k.replace(/_/g, ' '));
    if (on.length) return on.join(', ');
    const bits = Object.entries(value)
      .filter(([, v]) => v != null && v !== '' && v !== false)
      .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${showVal(v)}`);
    return bits.join('; ');
  }
  return String(value);
}

function wrap(text, font, size, maxW) {
  const out = [];
  for (const para of win(text).split('\n')) {
    if (!para.trim()) { out.push(''); continue; }
    const words = para.split(/\s+/);
    let line = '';
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) > maxW && line) {
        out.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    if (line) out.push(line);
  }
  return out.length ? out : [''];
}

/**
 * @returns {Promise<Uint8Array>} PDF bytes
 */
export async function buildThaPdf({ tha, steps = [], crew = [], incidentId } = {}) {
  if (!tha?.tha_number) throw new Error('THA number is required to build the PDF.');
  const pdf = await PDFDocument.create();
  pdf.setTitle(`THA ${tha.tha_number}`);
  pdf.setAuthor('SLP Alaska');
  pdf.setProducer('AnthroSafe Investigation Workbench');
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const maxW = PAGE_W - MARGIN * 2;
  let page = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  function newPage() {
    page = pdf.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN;
  }
  function ensure(h) {
    if (y - h < MARGIN) newPage();
  }
  function write(text, { size = 10, face = font, color = TEXT, gap = 3 } = {}) {
    for (const line of wrap(text, face, size, maxW)) {
      const h = size + gap;
      ensure(h);
      if (line) page.drawText(line, { x: MARGIN, y: y - size, size, font: face, color });
      y -= h;
    }
  }
  function heading(text) {
    y -= 6;
    write(text, { size: 12, face: bold, color: NAVY, gap: 4 });
  }
  function field(label, value) {
    const shown = showVal(value);
    if (!shown) return;
    write(`${label}: ${shown}`, { size: 10, gap: 2 });
  }

  write('TASK HAZARD ANALYSIS', { size: 16, face: bold, color: NAVY, gap: 4 });
  write(String(tha.tha_number), { size: 13, face: bold, gap: 6 });
  if (incidentId) write(`Attached to investigation ${incidentId}`, { size: 9, face: font, color: MUTED, gap: 8 });

  heading('Job');
  field('Date', tha.date);
  field('Company', tha.company);
  field('Location', tha.location);
  field('Work area', tha.work_area);
  field('Crew lead', tha.crew_lead);
  field('Phone / radio', tha.phone_radio);
  field('Status', tha.status);
  field('Task', tha.task_description);
  field('Job planning', tha.job_planning_notes);
  field('Procedure exists', tha.procedure_exists);
  field('Procedure reviewed', tha.procedure_reviewed);
  field('Energy types', tha.energy_types);
  field('Controls', tha.control_types);
  field('PPE', tha.ppe_requirements);
  field('Permits', tha.permits_required);
  field('Potential hazards', tha.potential_hazards);
  field('Residual risk', tha.residual_risk);
  field('Stop-work trigger', tha.stop_work_trigger);

  heading('Task steps');
  const ordered = [...(steps || [])].sort((a, b) => (a.step_number || 0) - (b.step_number || 0));
  if (ordered.length === 0) write('No task steps were recorded on this THA.', { size: 10, color: MUTED });
  ordered.forEach((step, i) => {
    const n = step.step_number || i + 1;
    write(`${n}. ${showVal(step.task_step) || '(no task text)'}`, { size: 10, face: bold, gap: 2 });
    if (step.potential_hazards) write(`   Hazard: ${showVal(step.potential_hazards)}`, { size: 10, gap: 2 });
    if (step.recommended_actions) write(`   Control: ${showVal(step.recommended_actions)}`, { size: 10, gap: 3 });
  });

  heading('Crew sign-offs');
  if (!crew?.length) write('No crew sign-offs were recorded on this THA.', { size: 10, color: MUTED });
  (crew || []).forEach((person) => {
    const when = person.sign_off_time ? String(person.sign_off_time).replace('T', ' ').slice(0, 16) : '';
    const bits = [person.crew_member_name, person.company, when].filter(Boolean).join(' - ');
    write(bits || '(unnamed)', { size: 10, gap: 2 });
    if (person.comments) write(`   ${showVal(person.comments)}`, { size: 9, color: MUTED, gap: 2 });
  });

  if (tha.closed_by || tha.closed_at) {
    heading('Close-out');
    field('Closed by', tha.closed_by);
    field('Closed at', tha.closed_at);
    field('What went well', tha.aar_went_well);
    field('What did not', tha.aar_didnt_go_as_planned);
    field('How to improve', tha.aar_how_improve);
  }

  y -= 10;
  write('This PDF is the THA evidence copy on the investigation. It was built from the THA record, its task steps, and crew sign-offs.', {
    size: 8, color: MUTED, gap: 2,
  });

  return pdf.save();
}

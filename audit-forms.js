/**
 * SLP Alaska Portal — Form Audit Script
 *
 * Scans all page.js files and reports potential issues:
 *   - Optional date fields sent without || null (will crash Supabase)
 *   - ...formData spread in insert (all date fields need review)
 *   - document.getElementById usage
 *   - console.log in production code
 *   - Missing try/catch on Supabase calls
 *   - External <Link> tags remaining
 *   - Double commas remaining
 *   - Missing Tesoro Refinery
 *   - CCI- Industrial spacing issue
 *
 * Run from portal root:
 *   node audit-forms.js
 *
 * Outputs a report. Does NOT modify files.
 */

const fs = require('fs');
const path = require('path');

const APP_DIR = path.join(process.cwd(), 'app');

function getAllPageFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...getAllPageFiles(full));
    else if (entry.name === 'page.js') results.push(full);
  }
  return results;
}

function auditFile(filePath) {
  let content;
  try { content = fs.readFileSync(filePath, 'utf8'); }
  catch (e) { return [{ severity: 'ERROR', msg: 'Cannot read file: ' + e.message }]; }

  const issues = [];
  const lines = content.split('\n');

  // ── Double commas ──────────────────────────────────────────────────────────
  for (let i = 0; i < lines.length; i++) {
    if (/,,/.test(lines[i]) && !lines[i].trim().startsWith('//')) {
      issues.push({ severity: 'FIX', msg: `Line ${i+1}: Double comma` });
    }
  }

  // ── External Link tag ─────────────────────────────────────────────────────
  if (/<Link\s+href="https?:\/\//.test(content)) {
    issues.push({ severity: 'FIX', msg: 'External <Link href="https://"> — must be <a> tag (build error)' });
  }
  if (/<\/Link>/.test(content) && !/<Link\s+href="\//.test(content)) {
    issues.push({ severity: 'FIX', msg: 'Orphaned </Link> closing tag — build error' });
  }

  // ── Spread insert with optional date fields ────────────────────────────────
  if (/\.insert\(\[\{\s*\.\.\.formData/.test(content) || /insert\(\[{\s*\.\.\.formData/.test(content)) {
    // Find date fields in formData that are optional (no 'required' nearby)
    const dateInputs = [...content.matchAll(/type="date"\s+name="(\w+)"/g)].map(m => m[1]);
    const requiredDates = [...content.matchAll(/type="date"\s+name="(\w+)"[^/]*required/g)].map(m => m[1]);
    const optionalDates = dateInputs.filter(d => !requiredDates.includes(d));
    if (optionalDates.length > 0) {
      issues.push({ severity: 'FIX', msg: `Spread insert + optional date fields: ${optionalDates.join(', ')} — need || null` });
    } else {
      issues.push({ severity: 'WARN', msg: 'Uses ...formData spread in insert — verify all optional fields have || null' });
    }
  }

  // ── Explicit insert — check for date fields without || null ───────────────
  if (content.includes('.insert([{') && !(/\.insert\(\[\{\s*\.\.\.formData/.test(content))) {
    const insertStart = content.indexOf('.insert([{');
    const insertEnd = content.indexOf('}])', insertStart);
    if (insertStart > 0 && insertEnd > 0) {
      const insertBlock = content.slice(insertStart, insertEnd);
      // Find date column assignments
      const dateAssigns = [...insertBlock.matchAll(/(\w+_date|\w+_expiration|\w+_install_date|\w+_service_date|\w+_due|\w+_cert):\s*formData\.\w+(?!\s*\|\|)/g)];
      for (const m of dateAssigns) {
        issues.push({ severity: 'FIX', msg: `Optional date column '${m[1]}' may send empty string — needs || null` });
      }
    }
  }

  // ── document.getElementById ────────────────────────────────────────────────
  if (/document\.getElementById/.test(content)) {
    issues.push({ severity: 'FIX', msg: 'document.getElementById used — anti-pattern in React, use controlled state' });
  }

  // ── console.log in production ─────────────────────────────────────────────
  const logCount = (content.match(/console\.log\(/g) || []).length;
  if (logCount > 0) {
    issues.push({ severity: 'WARN', msg: `${logCount} console.log statement(s) — remove for production` });
  }

  // ── Missing try/catch on Supabase insert/update ───────────────────────────
  const supabaseCalls = (content.match(/await supabase\.(from|rpc)/g) || []).length;
  const tryCatches = (content.match(/try\s*\{/g) || []).length;
  if (supabaseCalls > 0 && tryCatches === 0) {
    issues.push({ severity: 'FIX', msg: `${supabaseCalls} Supabase call(s) with no try/catch — unhandled errors will crash` });
  }

  // ── Missing Tesoro Refinery ───────────────────────────────────────────────
  if (content.includes('const COMPANIES') && !content.includes("'Tesoro Refinery'")) {
    issues.push({ severity: 'FIX', msg: "Missing 'Tesoro Refinery' in COMPANIES" });
  }

  // ── CCI- Industrial spacing ───────────────────────────────────────────────
  if (content.includes("'CCI- Industrial'")) {
    issues.push({ severity: 'FIX', msg: "'CCI- Industrial' has extra space — should be 'CCI-Industrial'" });
  }

  // ── styles/components defined after early return ──────────────────────────
  const earlyReturnIdx = content.search(/if\s*\(submitted\)\s*\{|if\s*\(!isLoggedIn\)/);
  const constAfter = earlyReturnIdx > 0
    ? [...content.slice(earlyReturnIdx).matchAll(/^\s{2}const\s+(styles|s\s*=|InspectionItem|CheckItem|YesNo)\s*=/mg)]
    : [];
  if (constAfter.length > 0) {
    issues.push({ severity: 'WARN', msg: `Component/style const defined after early return — inaccessible if that branch renders` });
  }

  // ── localStorage usage ────────────────────────────────────────────────────
  if (/localStorage/.test(content) && !filePath.includes('action-calendar')) {
    issues.push({ severity: 'WARN', msg: 'localStorage used — will not work in incognito/private browsing' });
  }

  return issues;
}

// ── Run ─────────────────────────────────────────────────────────────────────
console.log('SLP Alaska Portal — Form Audit Report');
console.log('======================================\n');

if (!fs.existsSync(APP_DIR)) {
  console.error('ERROR: app/ directory not found. Run from portal root.');
  process.exit(1);
}

const files = getAllPageFiles(APP_DIR);
console.log(`Auditing ${files.length} page.js files...\n`);

let totalFix = 0, totalWarn = 0, cleanCount = 0;
const fixFiles = [], warnFiles = [], cleanFiles = [];

for (const f of files) {
  const issues = auditFile(f);
  const rel = path.relative(process.cwd(), f);
  const fixes = issues.filter(i => i.severity === 'FIX');
  const warns = issues.filter(i => i.severity === 'WARN');

  if (fixes.length > 0) {
    totalFix += fixes.length;
    fixFiles.push({ file: rel, fixes, warns });
  } else if (warns.length > 0) {
    totalWarn += warns.length;
    warnFiles.push({ file: rel, warns });
  } else {
    cleanFiles.push(rel);
    cleanCount++;
  }
}

// Print fixes first
if (fixFiles.length > 0) {
  console.log(`\n⚠️  FILES NEEDING FIXES (${fixFiles.length}):`);
  console.log('─'.repeat(60));
  for (const r of fixFiles) {
    console.log(`\n  📄 ${r.file}`);
    for (const i of r.fixes) console.log(`     🔴 ${i.msg}`);
    for (const i of r.warns) console.log(`     🟡 ${i.msg}`);
  }
}

if (warnFiles.length > 0) {
  console.log(`\n\n🟡 FILES WITH WARNINGS ONLY (${warnFiles.length}):`);
  console.log('─'.repeat(60));
  for (const r of warnFiles) {
    console.log(`\n  📄 ${r.file}`);
    for (const i of r.warns) console.log(`     🟡 ${i.msg}`);
  }
}

console.log(`\n\n✅ CLEAN FILES (${cleanCount})`);

console.log('\n\n======================================');
console.log(`SUMMARY: ${fixFiles.length} files need fixes | ${warnFiles.length} files have warnings | ${cleanCount} files clean`);
console.log(`Total issues: ${totalFix} fixes needed, ${totalWarn} warnings`);

/**
 * SLP Alaska Portal — Batch Fix Script #2
 *
 * Fixes:
 *   1. 'CCI- Industrial' → 'CCI-Industrial' (extra space)
 *   2. Optional date columns missing || null in explicit inserts
 *   3. console.log removal (production cleanup)
 *
 * Run from portal root:
 *   node fix-batch2.js
 */

const fs = require('fs');
const path = require('path');

const APP_DIR = path.join(process.cwd(), 'app');
const RESULTS = { fixed: [], skipped: [], errors: [] };

// Known optional date columns that need || null
// Identified from audit output — column name → formData field name
const DATE_NULL_FIXES = {
  'app\\bbs-form\\page.js':              [['assessment_date', 'observationDate'], ['observation_date', 'observationDate']],
  'app\\cold-weather-form\\page.js':     [['assessment_date', 'date']],
  'app\\competent-person-form\\page.js': [['inspection_date', 'inspectionDate']],
  'app\\excavation-trenching\\page.js':  [['one_call_date', 'oneCallDate'], ['start_date', 'startDate'], ['expiration_date', 'expirationDate']],
  'app\\ppe-inspection\\page.js':        [['cartridge_expiration', 'cartridgeExpiration']],
  'app\\pressure-crosscheck\\page.js':   [['last_similar_job_date', 'lastSimilarJobDate']],
  'app\\property-damage-report\\page.js':[['incident_date', 'incidentDate']],
  'app\\safety-meeting\\page.js':        [['meeting_date', 'meetingDate']],
  'app\\spill-kit-inspection\\page.js':  [['inspection_date', 'inspectionDate']],
  'app\\sse-evaluation\\page.js':        [['hire_date', 'hireDate']],
  'app\\witness-statement\\page.js':     [['incident_date', 'incidentDate']],
};

function getAllPageFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...getAllPageFiles(full));
    else if (entry.name === 'page.js') results.push(full);
  }
  return results;
}

function fixFile(filePath) {
  let content;
  try { content = fs.readFileSync(filePath, 'utf8'); }
  catch (e) { RESULTS.errors.push({ file: filePath, error: e.message }); return; }

  const original = content;
  const changes = [];
  const relPath = path.relative(process.cwd(), filePath);

  // ── FIX 1: CCI- Industrial spacing ────────────────────────────────────────
  if (content.includes("'CCI- Industrial'")) {
    content = content.replace(/'CCI- Industrial'/g, "'CCI-Industrial'");
    changes.push("Fixed 'CCI- Industrial' → 'CCI-Industrial'");
  }

  // ── FIX 2: Optional date || null ──────────────────────────────────────────
  const winPath = relPath; // already uses backslashes on Windows output
  const unixPath = relPath.replace(/\\/g, '/');
  
  // Check both path formats
  const dateFixes = DATE_NULL_FIXES[winPath] || DATE_NULL_FIXES[unixPath] || 
                    DATE_NULL_FIXES['app\\' + relPath.split('app\\')[1]] ||
                    DATE_NULL_FIXES['app/' + relPath.split('app/')[1]];

  if (dateFixes) {
    for (const [col, field] of dateFixes) {
      // Match: column_name: formData.fieldName (without || null)
      // Don't re-add if already has || null
      const pattern = new RegExp(`(${col}:\\s*formData\\.${field})(?!\\s*\\|\\|)`, 'g');
      if (pattern.test(content)) {
        content = content.replace(
          new RegExp(`(${col}:\\s*formData\\.${field})(?!\\s*\\|\\|)`, 'g'),
          `$1 || null`
        );
        changes.push(`Added || null to ${col}`);
      }
    }
  }

  // ── FIX 3: Remove console.log (not console.error) ─────────────────────────
  // Only remove standalone console.log lines, not ones inside error handlers
  const logCount = (content.match(/console\.log\(/g) || []).length;
  if (logCount > 0) {
    // Remove full-line console.log statements
    content = content.replace(/^[ \t]*console\.log\([^)]*\);?\s*\n/gm, '');
    // Remove inline console.log (end of line)
    content = content.replace(/\s*console\.log\([^)]*\);/g, '');
    const remaining = (content.match(/console\.log\(/g) || []).length;
    const removed = logCount - remaining;
    if (removed > 0) changes.push(`Removed ${removed} console.log statement(s)`);
    if (remaining > 0) changes.push(`Note: ${remaining} console.log(s) not auto-removed (multi-line or complex)`);
  }

  // ── Write back if changed ──────────────────────────────────────────────────
  if (content !== original) {
    try {
      fs.writeFileSync(filePath, content, 'utf8');
      RESULTS.fixed.push({ file: relPath, changes });
    } catch (e) {
      RESULTS.errors.push({ file: filePath, error: e.message });
    }
  } else {
    RESULTS.skipped.push(relPath);
  }
}

// ── Run ──────────────────────────────────────────────────────────────────────
console.log('SLP Alaska Portal — Batch Fix Script #2');
console.log('=========================================\n');

if (!fs.existsSync(APP_DIR)) {
  console.error('ERROR: app/ directory not found. Run from portal root.');
  process.exit(1);
}

const files = getAllPageFiles(APP_DIR);
console.log(`Scanning ${files.length} page.js files...\n`);
for (const f of files) fixFile(f);

console.log(`FIXED (${RESULTS.fixed.length} files):`);
for (const r of RESULTS.fixed) {
  console.log(`  ✅ ${r.file}`);
  for (const c of r.changes) console.log(`       → ${c}`);
}

if (RESULTS.errors.length > 0) {
  console.log(`\nERRORS (${RESULTS.errors.length}):`);
  for (const e of RESULTS.errors) console.log(`  ❌ ${e.file}: ${e.error}`);
}

console.log('\n----------------------------------------');
console.log(`Total: ${RESULTS.fixed.length} fixed, ${RESULTS.skipped.length} clean, ${RESULTS.errors.length} errors`);
console.log('\nNext step:');
console.log('  git add -A');
console.log('  git commit -m "Batch fix 2: CCI spacing, date null guards, console.log cleanup"');
console.log('  git push');

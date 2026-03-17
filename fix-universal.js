/**
 * SLP Alaska Portal — Universal Fix Script
 * 
 * Fixes across ALL page.js files in app/:
 *   1. Double commas in LOCATIONS array
 *   2. External <Link href="https://"> → <a> (and removes Link import)
 *   3. Missing 'Tesoro Refinery' in COMPANIES
 *   4. Missing 'Other' in COMPANIES (some forms omit it)
 *
 * Run from portal root:
 *   node fix-universal.js
 */

const fs = require('fs');
const path = require('path');

const APP_DIR = path.join(process.cwd(), 'app');
const RESULTS = { fixed: [], skipped: [], errors: [] };

function getAllPageFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getAllPageFiles(full));
    } else if (entry.name === 'page.js') {
      results.push(full);
    }
  }
  return results;
}

function fixFile(filePath) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    RESULTS.errors.push({ file: filePath, error: e.message });
    return;
  }

  const original = content;
  const changes = [];

  // ── FIX 1: Double commas in LOCATIONS ──────────────────────────────────────
  const doubleCommaPattern = /('Badami'),,\s*('West Harrison Bay'),,\s*('Other North Slope')/g;
  if (doubleCommaPattern.test(content)) {
    content = content.replace(
      /('Badami'),,\s*('West Harrison Bay'),,\s*('Other North Slope')/g,
      "$1, $2, $3"
    );
    changes.push('Fixed double commas in LOCATIONS');
  }

  // ── FIX 2: <Link> for external URLs → <a> ──────────────────────────────────
  // Handle single-line: <Link href="https://...">text</Link>
  const linkExternal = /<Link\s+(href="https?:\/\/[^"]*"[^>]*)>([\s\S]*?)<\/Link>/g;
  if (linkExternal.test(content)) {
    content = content.replace(
      /<Link\s+(href="https?:\/\/[^"]*"[^>]*)>([\s\S]*?)<\/Link>/g,
      '<a $1>$2</a>'
    );
    changes.push('Replaced external <Link> with <a>');
  }

  // Remove Link import only if no internal <Link> tags remain
  if (changes.some(c => c.includes('<Link>')) || 
      (content.includes("import Link from 'next/link'") && !/<Link\s+href="\//.test(content) && !/<Link\s+to/.test(content))) {
    if (!/<Link[\s>]/.test(content) && content.includes("import Link from 'next/link'")) {
      content = content.replace(/import Link from 'next\/link'\n/g, '');
      content = content.replace(/import Link from "next\/link"\n/g, '');
      changes.push('Removed unused Link import');
    }
  }

  // ── FIX 3: Add 'Tesoro Refinery' if missing ────────────────────────────────
  if (content.includes('const COMPANIES') && 
      !content.includes("'Tesoro Refinery'") &&
      content.includes("'Summit Excavation'")) {
    content = content.replace(
      "'Summit Excavation', 'Yellowjacket'",
      "'Summit Excavation', 'Tesoro Refinery', 'Yellowjacket'"
    );
    // Also handle compact (no spaces) version
    content = content.replace(
      "'Summit Excavation','Yellowjacket'",
      "'Summit Excavation','Tesoro Refinery','Yellowjacket'"
    );
    if (content.includes("'Tesoro Refinery'")) {
      changes.push('Added Tesoro Refinery to COMPANIES');
    }
  }

  // ── FIX 4: Add 'Other' to COMPANIES if missing ─────────────────────────────
  if (content.includes('const COMPANIES') && 
      !content.includes("'Other'") &&
      content.includes("'Yellowjacket'")) {
    content = content.replace(
      "'Yellowjacket']",
      "'Yellowjacket', 'Other']"
    );
    content = content.replace(
      "'Yellowjacket'\n]",
      "'Yellowjacket', 'Other'\n]"
    );
    if (content.includes("'Other'")) {
      changes.push("Added 'Other' to COMPANIES");
    }
  }

  // ── Write back if changed ───────────────────────────────────────────────────
  if (content !== original) {
    try {
      fs.writeFileSync(filePath, content, 'utf8');
      const rel = path.relative(process.cwd(), filePath);
      RESULTS.fixed.push({ file: rel, changes });
    } catch (e) {
      RESULTS.errors.push({ file: filePath, error: e.message });
    }
  } else {
    RESULTS.skipped.push(path.relative(process.cwd(), filePath));
  }
}

// ── Run ─────────────────────────────────────────────────────────────────────
console.log('SLP Alaska Portal — Universal Fix Script');
console.log('========================================\n');

if (!fs.existsSync(APP_DIR)) {
  console.error('ERROR: app/ directory not found. Run from portal root.');
  process.exit(1);
}

const files = getAllPageFiles(APP_DIR);
console.log(`Scanning ${files.length} page.js files...\n`);

for (const f of files) {
  fixFile(f);
}

// ── Report ──────────────────────────────────────────────────────────────────
console.log(`FIXED (${RESULTS.fixed.length} files):`);
for (const r of RESULTS.fixed) {
  console.log(`  ✅ ${r.file}`);
  for (const c of r.changes) console.log(`       → ${c}`);
}

console.log(`\nSKIPPED — already clean (${RESULTS.skipped.length} files)`);

if (RESULTS.errors.length > 0) {
  console.log(`\nERRORS (${RESULTS.errors.length}):`);
  for (const e of RESULTS.errors) console.log(`  ❌ ${e.file}: ${e.error}`);
}

console.log('\n----------------------------------------');
console.log(`Total: ${RESULTS.fixed.length} fixed, ${RESULTS.skipped.length} clean, ${RESULTS.errors.length} errors`);
console.log('\nNext step:');
console.log('  git add -A');
console.log('  git commit -m "Universal fixes: double commas, Link→a, Tesoro, Other"');
console.log('  git push');

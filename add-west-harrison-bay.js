// add-west-harrison-bay.js
// Run from repo root: node add-west-harrison-bay.js
// Adds 'West Harrison Bay' to LOCATIONS array in all form page.js files

const fs = require('fs');
const path = require('path');

let filesUpdated = 0;
let filesSkipped = 0;
let filesAlreadyHave = 0;

function walkDirectory(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir);
  
  entries.forEach(entry => {
    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !['node_modules', '.next', '.git', 'components', 'lib'].includes(entry)) {
      walkDirectory(fullPath);
    } else if (stat.isFile() && (entry === 'page.js' || entry === 'page.jsx')) {
      processFile(fullPath);
    }
  });
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Skip files that don't have a LOCATIONS array
  if (!content.includes('LOCATIONS') || !content.includes('Other North Slope')) {
    filesSkipped++;
    return;
  }
  
  // Skip if already has West Harrison Bay
  if (content.includes('West Harrison Bay')) {
    filesAlreadyHave++;
    console.log(`  ✅ Already has it: ${filePath}`);
    return;
  }
  
  // Pattern 1: Multi-line format with 'Badami', 'Other North Slope'
  // Pattern 2: Single-line format with 'Badami','Other North Slope'
  // We want to insert 'West Harrison Bay' between Badami and Other North Slope
  
  const patterns = [
    // Match 'Badami' followed by optional whitespace/comma then 'Other North Slope'
    /('Badami')(\s*,\s*)('Other North Slope')/g,
    // Match "Badami" with double quotes
    /("Badami")(\s*,\s*)("Other North Slope")/g,
  ];
  
  let modified = false;
  
  for (const pattern of patterns) {
    if (pattern.test(content)) {
      content = content.replace(pattern, `$1,$2'West Harrison Bay',$2$3`);
      modified = true;
      break;
    }
  }
  
  // Fallback: just find 'Badami' in a LOCATIONS context and add after it
  if (!modified) {
    // Try inserting after 'Badami' with flexible spacing
    const badamiRegex = /('Badami')\s*,\s*('Other North Slope')/;
    const badamiRegex2 = /('Badami'),('Other North Slope')/;
    
    if (badamiRegex.test(content)) {
      content = content.replace(badamiRegex, "'Badami','West Harrison Bay','Other North Slope'");
      modified = true;
    } else if (badamiRegex2.test(content)) {
      content = content.replace(badamiRegex2, "'Badami','West Harrison Bay','Other North Slope'");
      modified = true;
    }
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    filesUpdated++;
    console.log(`  📍 Updated: ${filePath}`);
  } else {
    console.log(`  ⚠️  Could not find insertion point: ${filePath}`);
  }
}

console.log('🏔️  Adding West Harrison Bay to all forms...\n');
walkDirectory('./app');

console.log(`\n=== Summary ===`);
console.log(`📍 Files updated: ${filesUpdated}`);
console.log(`✅ Already had it: ${filesAlreadyHave}`);
console.log(`⏭️  Skipped (no LOCATIONS): ${filesSkipped}`);
console.log(`\n✨ Done! Now run: git add -A && git commit -m "Add West Harrison Bay to all form locations" && git push`);

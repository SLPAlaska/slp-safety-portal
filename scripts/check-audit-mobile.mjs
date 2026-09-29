// Mobile layout check for every audit / inspection form.
//
// For each route at 320, 360, 390 and 414px wide it asserts:
//   1. the page does not scroll horizontally
//      (document.documentElement.scrollWidth <= window.innerWidth)
//   2. every Yes / No / N/A (and Pass / Fail / N/A) answer control is fully
//      inside the viewport -- buttons, radio labels, and selects that offer N/A
//   3. every N/A label renders on one line, and its button is no taller than
//      the other answer buttons on the same row
// and saves a full-page screenshot of each form at 360px to
// scripts/mobile-shots/ (gitignored).
//
// Usage:
//   npm run dev                              (in another terminal)
//   node scripts/check-audit-mobile.mjs [--base http://localhost:3000] [route ...]
//
// Exits non-zero if any route fails at any width.

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const AUDIT_ROUTES = [
  '/aed-inspection',
  '/camp-inspection',
  '/chain-hoist-inspection',
  '/competent-person-form',
  '/confined-space-entry',
  '/crane-inspection',
  '/dropped-object-audit',
  '/e-line-safety-audit',
  '/ehs-field-evaluation',
  '/emergency-drill-evaluation',
  '/energized-electrical-work',
  '/energy-isolation',
  '/excavation-trenching',
  '/eyewash-station-inspection',
  '/field-environmental-audit',
  '/fire-extinguisher-inspection',
  '/first-aid-kit-inspection',
  '/flammable-storage-audit',
  '/fluid-transfer',
  '/forklift-inspection',
  '/harness-inspection',
  '/heavy-equipment-inspection',
  '/hot-work',
  '/ladder-inspection',
  '/lanyard-srl-inspection',
  '/location-audit-report',
  '/lsr-confined-space-audit',
  '/lsr-driving-audit',
  '/lsr-energy-isolation-audit',
  '/lsr-fall-protection-audit',
  '/lsr-lifting-operations-audit',
  '/lsr-line-of-fire-audit',
  '/lsr-work-permits-audit',
  '/opening-blinding',
  '/phase-condition-risk-assessment',
  '/ppe-inspection',
  '/pressure-crosscheck',
  '/scaffold-inspection-form',
  '/shackle-inspection',
  '/slickline-safety-audit',
  '/spill-kit-inspection',
  '/surface-condition-audit',
  '/swppp-inspection',
  '/synthetic-sling-inspection',
  '/task-crew-audit',
  '/tha-jsa',
  '/unit-work',
  '/vehicle-inspection',
  '/weekly-tank-inspection',
  '/welding-fab-shop-audit',
  '/welding-grinding-audit',
  '/wire-rope-inspection',
];

const WIDTHS = [320, 360, 390, 414];
const SHOT_WIDTH = 360;
const HERE = dirname(fileURLToPath(import.meta.url));
const SHOT_DIR = join(HERE, 'mobile-shots');

// Some forms only render their answer rows after an interaction. Each setup
// runs after load and before measuring.
const SETUP = {
  // Wizard: the header step must be completed before any question renders.
  // Start inserts a camp_inspections row; the network guard below fakes it.
  '/camp-inspection': async (page) => {
    await page.getByPlaceholder('e.g. Trent Smith').fill('Layout Check');
    await page.locator('select').first().selectOption({ index: 1 });
    await page.getByPlaceholder('e.g. "Mustang Camp"').fill('Layout Check');
    await page.getByRole('button', { name: /Start Inspection/ }).click();
    await page.getByText(/Previous Section/).waitFor({ timeout: 15000 });
  },
  // Ladder-type sections are conditional; Combination shows all of them.
  '/ladder-inspection': async (page) => {
    await page.locator('select[name="ladder_type"]').selectOption('Combination Ladder');
  },
};

// The checker must never write to the database. Reads go through; every
// write is answered locally with a fake row so wizards can advance.
async function guardWrites(context) {
  await context.route(/supabase\.co\//, (route) => {
    const req = route.request();
    if (req.method() === 'GET' || req.method() === 'HEAD' || req.method() === 'OPTIONS') return route.continue();
    return route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ id: '00000000-0000-0000-0000-000000000000' }),
    });
  });
}

function parseArgs(argv) {
  let base = 'http://localhost:3000';
  const routes = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--base') base = argv[++i];
    else routes.push(argv[i].startsWith('/') ? argv[i] : '/' + argv[i]);
  }
  return { base: base.replace(/\/$/, ''), routes: routes.length ? routes : AUDIT_ROUTES };
}

// Runs inside the page. Returns a list of human-readable failures.
function measure() {
  const ANSWER = /^(yes|no|n\/a|na|pass|fail)$/i;
  const vw = window.innerWidth;
  const failures = [];
  const text = (el) => (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.display !== 'none';
  };
  const describe = (el) => {
    const q = el.closest('[data-answer-row]')?.parentElement || el.parentElement?.parentElement;
    const ctx = q ? text(q).slice(0, 50) : '';
    return `"${text(el) || el.tagName.toLowerCase()}"${ctx ? ` near "${ctx}"` : ''}`;
  };

  const sw = document.documentElement.scrollWidth;
  if (sw > vw) failures.push(`page scrollWidth ${sw} > innerWidth ${vw}`);

  // Answer controls: anything clickable whose text is an answer word (button,
  // label, role=radio, or a styled div with cursor:pointer), outermost only;
  // visible radio inputs whose value is an answer word (table layouts); and
  // selects offering N/A.
  const clickable = (el) =>
    el.matches('button, label, [role="radio"]') || getComputedStyle(el).cursor === 'pointer';
  const found = new Set();
  for (const el of document.querySelectorAll('body *')) {
    if (!visible(el) || !ANSWER.test(text(el)) || !clickable(el)) continue;
    let p = el.parentElement;
    while (p && !found.has(p)) p = p.parentElement;
    if (!p) found.add(el);
  }
  const controls = [...found];
  for (const el of document.querySelectorAll('input[type="radio"]')) {
    if (visible(el) && ANSWER.test(el.value) && !el.closest('label, [role="radio"]')) controls.push(el);
  }
  for (const el of document.querySelectorAll('select')) {
    const hasNA = [...el.options].some((o) => /^n\/?a\b/i.test(o.textContent.trim()));
    if (hasNA && visible(el)) controls.push(el);
  }

  for (const el of controls) {
    const r = el.getBoundingClientRect();
    if (r.left < -0.5 || r.right > vw + 0.5) {
      failures.push(`${describe(el)} outside viewport (${Math.round(r.left)}..${Math.round(r.right)} of ${vw})`);
    }
  }

  // N/A must render on one line, and be no taller than its siblings.
  for (const el of controls) {
    if (el.tagName === 'SELECT' || el.tagName === 'INPUT' || !/^n\/?a$/i.test(text(el))) continue;
    // Measure the text only: a radio label also holds the <input>, whose box
    // sits at a different top and would read as a second line.
    const rects = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.textContent.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      rects.push(...[...range.getClientRects()].filter((q) => q.width > 0));
    }
    const lines = [];
    for (const q of rects) {
      if (!lines.some((l) => Math.abs(l.top - q.top) < q.height / 2)) lines.push(q);
    }
    if (lines.length > 1) failures.push(`${describe(el)} wraps onto ${lines.length} lines`);
    // Siblings on the same visual line of the answer row: a wrapped row puts
    // N/A on a line of its own, where there is nothing to compare against.
    const box = el.getBoundingClientRect();
    const sibs = controls.filter((c) => {
      if (c === el || c.tagName !== el.tagName || c.parentElement !== el.parentElement) return false;
      const b = c.getBoundingClientRect();
      return b.top < box.bottom && b.bottom > box.top;
    });
    for (const s of sibs) {
      const sh = s.getBoundingClientRect().height;
      if (box.height > sh + 2) failures.push(`${describe(el)} height ${Math.round(box.height)} > sibling "${text(s)}" ${Math.round(sh)}`);
    }
  }

  return { failures, controls: controls.length };
}

async function main() {
  const { base, routes } = parseArgs(process.argv.slice(2));
  mkdirSync(SHOT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const results = [];
  let anyFail = false;

  for (const route of routes) {
    const row = { route, widths: {} };
    for (const width of WIDTHS) {
      const context = await browser.newContext({
        viewport: { width, height: 800 },
        deviceScaleFactor: 1,
        isMobile: true,
        hasTouch: true,
      });
      await guardWrites(context);
      const page = await context.newPage();
      let outcome;
      try {
        const resp = await page.goto(base + route, { waitUntil: 'networkidle', timeout: 120000 });
        if (!resp || resp.status() >= 400) throw new Error(`HTTP ${resp ? resp.status() : 'no response'}`);
        if (SETUP[route]) await SETUP[route](page);
        await page.waitForTimeout(300);
        const m = await page.evaluate(measure);
        outcome = { pass: m.failures.length === 0, controls: m.controls, failures: m.failures };
        if (width === SHOT_WIDTH) {
          await page.screenshot({ path: join(SHOT_DIR, route.replace(/^\//, '').replace(/\//g, '_') + '.png'), fullPage: true });
        }
      } catch (err) {
        outcome = { pass: false, controls: 0, failures: [`error: ${err.message.split('\n')[0]}`] };
      }
      await context.close();
      if (!outcome.pass) anyFail = true;
      row.widths[width] = outcome;
    }
    results.push(row);
    const cells = WIDTHS.map((w) => `${w}:${row.widths[w].pass ? 'PASS' : 'FAIL'}`).join('  ');
    console.log(`${route.padEnd(36)} ${cells}  (${row.widths[SHOT_WIDTH].controls} controls)`);
    for (const w of WIDTHS) {
      for (const f of row.widths[w].failures.slice(0, 3)) console.log(`    [${w}] ${f}`);
      if (row.widths[w].failures.length > 3) console.log(`    [${w}] ... ${row.widths[w].failures.length - 3} more`);
    }
  }

  await browser.close();
  const failed = results.filter((r) => WIDTHS.some((w) => !r.widths[w].pass)).length;
  console.log(`\n${results.length - failed}/${results.length} routes PASS at all widths`);
  process.exit(anyFail ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});

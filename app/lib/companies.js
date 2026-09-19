// app/lib/companies.js
//
// The one list of client companies the field forms offer.
//
// WHY THIS EXISTS
//
// Until 2026-09-18 this array was copy-pasted into 77 files and had drifted
// into four different versions. app/camp-inspection carried only 20 of the 33
// names — a Yellowjacket or Merkes Builders crew filling in a camp inspection
// could not pick their own employer, so the record was filed under 'Other' or
// under whichever company looked closest. Either way it stopped being their
// record: 'Other' belongs to no tenant and shows up on nobody's dashboard, and
// a near-miss pick files one company's inspection inside another's.
//
// It also carried spellings no other form used — 'GBR' and 'Ridgeline' against
// everyone else's 'GBR Equipment' and 'Ridgeline Oilfield Services' — so the
// same company's records split across two names depending which form was used.
//
// EVERY form imports COMPANIES from here. Do not re-declare the array in a
// page; that is exactly how the four versions happened.
//
// ADDING A COMPANY
//
// Add the canonical spelling here, then decide whether it is an LMS tenant:
//
//   - a tenant (its people take training, its admins log in) needs a
//     lms_companies row, and that row's sail_company_names must contain this
//     exact string, or its admins will open SAIL to an empty page that looks
//     just like "no open items"
//   - not a tenant (an operator whose sites we work on) belongs in
//     NON_TENANT_COMPANIES below
//
// `npm run check:companies` fails if a name is in neither category, so a new
// entry cannot quietly become invisible. Run it after editing this file.

/**
 * Canonical company names, alphabetical. These are the exact strings written
 * to `company` / `client_company` / `company_name` columns, and the exact
 * strings lms_companies.sail_company_names is matched against — the SAIL scope
 * check uses equality, never a substring or ILIKE.
 */
export const COMPANIES = [
  'A-C Electric',
  'Ace Energy Services',
  'AKE-Line',
  'Apache Corp.',
  'Armstrong Oil & Gas',
  'ASRC Energy Services',
  'CCI-Industrial',
  'Chosen Construction',
  'CINGSA',
  'Coho Enterprises',
  'Conam Construction',
  'ConocoPhillips',
  'Five Star Oilfield Services',
  'Fox Energy Services',
  'G.A. West',
  'GBR Equipment',
  'GLM Energy Services',
  'Graham Industrial Coatings',
  'Harvest Midstream',
  'Hilcorp Alaska',
  'MagTec Alaska',
  'Merkes Builders',
  'Narwhal Exploration',
  'Nordic-Calista',
  'Parker TRS',
  'Peninsula Paving',
  'Pollard Wireline',
  'Ridgeline Oilfield Services',
  'Santos',
  'SLP Alaska',
  'Summit Excavation',
  'Tesoro Refinery',
  'Yellowjacket',
  'Other',
]

/**
 * Names that are deliberately NOT LMS tenants: operators and clients whose
 * sites we work on, who have no lms_companies row and no company admin.
 *
 * Listing one here is a statement that nobody will ever look for these records
 * on a company dashboard. If that changes, give it an lms_companies row and
 * remove it from this set — do not leave it in both.
 */
export const NON_TENANT_COMPANIES = new Set([
  'A-C Electric',
  'Armstrong Oil & Gas',
  'ASRC Energy Services',
  'CCI-Industrial',
  'CINGSA',
  'Coho Enterprises',
  'Conam Construction',
  'ConocoPhillips',
  'Five Star Oilfield Services',
  'Fox Energy Services',
  'G.A. West',
  'GLM Energy Services',
  'Graham Industrial Coatings',
  'Hilcorp Alaska',
  'Narwhal Exploration',
  'Nordic-Calista',
  'Parker TRS',
  'Peninsula Paving',
  'Ridgeline Oilfield Services',
  'Santos',
  'SLP Alaska',
  'Summit Excavation',
  'Tesoro Refinery',
  // 'Other' is the escape hatch, not a company. A record filed under it
  // belongs to no tenant and appears on no company dashboard, which is why it
  // is last in the dropdown rather than a convenient default.
  'Other',
])

/**
 * For filter dropdowns that offer an unscoped view (SAIL Management).
 * 'All' is a UI filter and never a stored value.
 */
export const COMPANY_FILTER_OPTIONS = ['All', ...COMPANIES]

export default COMPANIES

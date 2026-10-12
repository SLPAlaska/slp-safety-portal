// THA close-out: who is allowed to close.
//
// Since 11 Oct 2026 a THA is closed by a person NAMED on it (the crew lead or
// anyone on the crew sign-on list), not by a close-out code. The code was the
// friction that stopped crews closing THAs, so after-action reviews were never
// written. The name check keeps the original goal: someone from another crew
// or company cannot close a THA they are not on.
//
// Pure functions, no imports: used by /api/closeout (the authority), by the
// THA page (instant feedback) and by scripts/check-tha-close.mjs.

export const THA_CLOSE_RULE_VERSION = '2026-10-11.named-person';

const NICK = [
  ['michael', 'mike', 'mick', 'mikey'], ['william', 'bill', 'will', 'billy', 'willie', 'liam'],
  ['robert', 'rob', 'bob', 'bobby', 'robbie'], ['james', 'jim', 'jimmy', 'jamie'],
  ['joseph', 'joe', 'joey'], ['thomas', 'tom', 'tommy'], ['david', 'dave', 'davey'],
  ['christopher', 'chris'], ['matthew', 'matt'], ['daniel', 'dan', 'danny'],
  ['steven', 'stephen', 'steve'], ['richard', 'rick', 'rich', 'ricky', 'dick'],
  ['nicholas', 'nick', 'nicky'], ['anthony', 'tony'], ['jonathan', 'jon', 'john', 'johnny', 'jack'],
  ['benjamin', 'ben', 'benny'], ['samuel', 'sam', 'sammy'], ['alexander', 'alex', 'xander'],
  ['andrew', 'andy', 'drew'], ['patrick', 'pat', 'paddy'], ['joshua', 'josh'], ['jacob', 'jake'],
  ['zachary', 'zach', 'zack'], ['kenneth', 'ken', 'kenny'], ['ronald', 'ron', 'ronnie'],
  ['donald', 'don', 'donnie'], ['gregory', 'greg'], ['jeffrey', 'jeff', 'geoffrey'],
  ['lawrence', 'larry'], ['timothy', 'tim', 'timmy'], ['elizabeth', 'liz', 'beth', 'lizzie'],
  ['katherine', 'kathryn', 'catherine', 'kate', 'katie', 'kathy', 'cathy'], ['jennifer', 'jen', 'jenny'],
  ['edward', 'ed', 'eddie', 'ted', 'teddy'], ['charles', 'charlie', 'chuck', 'chas'],
  ['francis', 'frank', 'frankie'], ['brian', 'bryan'], ['raymond', 'ray'], ['gerald', 'jerry'],
  ['terrence', 'terry'], ['douglas', 'doug'], ['phillip', 'philip', 'phil'], ['nathan', 'nate', 'nathaniel'],
  ['frederick', 'fred', 'freddie'], ['leonard', 'leo', 'len', 'lenny'], ['randall', 'randy'],
  ['rodney', 'rod'], ['bradley', 'brad'], ['tyler', 'ty'], ['vincent', 'vince'], ['eugene', 'gene'],
  ['harold', 'hal', 'harry'], ['henry', 'hank'], ['walter', 'walt'], ['jose', 'pepe'],
  ['manuel', 'manny'], ['roberto', 'beto'], ['alberto', 'al', 'albert'], ['ernest', 'ernie'],
];
const NICK_GROUP = new Map();
NICK.forEach((g, i) => g.forEach((n) => { if (!NICK_GROUP.has(n)) NICK_GROUP.set(n, new Set()); NICK_GROUP.get(n).add(i); }));

/** "  O'Brien, José  M. " → "jose m obrien" */
export function normaliseName(raw) {
  let s = String(raw || '').trim();
  if (!s) return '';
  // "Last, First" → "First Last"
  const comma = s.split(',');
  if (comma.length === 2 && comma[0].trim() && comma[1].trim()) s = comma[1] + ' ' + comma[0];
  s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  s = s.replace(/['’`.]/g, '').replace(/[^a-z\s-]/g, ' ').replace(/-/g, ' ');
  // Drop suffixes that people sometimes add and sometimes don't.
  const toks = s.split(/\s+/).filter(Boolean).filter((t) => !['jr', 'sr', 'ii', 'iii', 'iv'].includes(t));
  return toks.join(' ');
}

function lev(a, b) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 1) return 2;
  const m = a.length, n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}

function sameFirst(a, b) {
  if (a === b) return true;
  const ga = NICK_GROUP.get(a), gb = NICK_GROUP.get(b);
  if (ga && gb) for (const g of ga) if (gb.has(g)) return true;
  return a.length >= 4 && b.length >= 4 && lev(a, b) <= 1; // one-letter slip: "Mathew" / "Matthew"
}
function sameLast(a, b) {
  if (a === b) return true;
  return a.length >= 5 && b.length >= 5 && lev(a, b) <= 1; // "Thompson" / "Thomson"
}

/**
 * Does the name someone typed (or tapped) match this listed name?
 * Full name listed → first AND last must match (nicknames and a one-letter
 * slip allowed; middle names / initials ignored). Single word listed
 * (e.g. crew lead entered as "Mike") → that word must be one of the typed words.
 */
export function namesMatch(typed, listed) {
  const t = normaliseName(typed), l = normaliseName(listed);
  if (!t || !l) return false;
  if (t === l) return true;
  const tt = t.split(' '), lt = l.split(' ');
  const tFull = tt.filter((x) => x.length > 1), lFull = lt.filter((x) => x.length > 1);
  if (!tFull.length || !lFull.length) return false;
  if (lFull.length === 1) return tFull.some((x) => sameFirst(x, lFull[0]) || sameLast(x, lFull[0]));
  if (tFull.length === 1) return false; // listed has first + last; one word is not enough
  const tF = tFull[0], tL = tFull[tFull.length - 1], lF = lFull[0], lL = lFull[lFull.length - 1];
  if (sameFirst(tF, lF) && sameLast(tL, lL)) return true;
  return sameFirst(tL, lF) && sameLast(tF, lL); // entered last-name-first without a comma: "Gonzalez Gerardo"
}

/** Everyone named on a THA: crew lead + crew sign-on names, de-duplicated, original spelling kept. */
export function namedPeople(tha, crew) {
  const out = [];
  const seen = new Set();
  const add = (n, role) => {
    const k = normaliseName(n);
    if (!k || seen.has(k)) return;
    seen.add(k);
    out.push({ name: String(n).trim(), role });
  };
  if (tha && tha.crew_lead) add(tha.crew_lead, 'Crew lead');
  (crew || []).forEach((c) => add(c && (c.crew_member_name || c.name), 'Crew'));
  return out;
}

/** Returns the listed person the closer matches, or null. Exact normalised match wins over fuzzy. */
export function findNamedCloser(closer, people) {
  const n = normaliseName(closer);
  if (!n) return null;
  const exact = people.find((p) => normaliseName(p.name) === n);
  if (exact) return exact;
  const hits = people.filter((p) => namesMatch(closer, p.name));
  return hits.length === 1 ? hits[0] : (hits[0] || null);
}

export const AAR_FIELDS = ['aar_went_well', 'aar_didnt_go_as_planned', 'aar_how_improve'];

/** After-action review: all three questions answered (a short answer like "nothing" counts). */
export function missingAar(updates) {
  return AAR_FIELDS.filter((k) => String((updates || {})[k] || '').trim().length < 2);
}

export function notNamedMessage(thaNumber) {
  return 'Only a person named on this THA (the crew lead or someone on its crew sign-on) can close ' + (thaNumber || 'it') +
    ', and the after-action review is required to close it. Tap your name on the list. Not on the list? This is not your THA; ask its crew lead to close it.';
}
export const AAR_REQUIRED_MESSAGE = 'The after-action review is required to close a THA: answer all 3 questions (what went well, what did not go as planned, how we will improve). A short answer such as "nothing" is fine.';

// ---------------------------------------------------------------------------
// SIGN-IN + COMPANY LOCK (Phase 1, since 11 Oct 2026, rule 2026-10-11.lms-company)
//
// A name tap alone proved nothing about WHO was tapping: the names on every
// open THA are public. On 11 Oct a Pollard login saw MagTec's and Chosen's
// open THAs on the close-out list. Seeing them is fine. Closing them is not.
//
// To close a THA now (server: /api/closeout closeTha; this is the rule):
//   1. Signed in (LMS magic link / password; the session sticks until sign-out).
//   2. The company comes from the LMS account (lms_users.company_id ->
//      lms_companies.name + sail_company_names). The client never sends it.
//   3. THA.company must be that company. HARD BLOCK otherwise.
//   4. Learner / crew: their own LMS name must be named on the THA (crew lead
//      or crew sign-on). They close as themselves.
//      Company admin: may close for any person named on the THA (tap that
//      person); the audit log records the admin as the closer.
//      SLP staff (super admin / portal_staff): any THA, any company.
// No Job bar in Phase 1, so there is no job/location check yet.

export const THA_CLOSE_COMPANY_RULE = '2026-10-11.lms-company';

/** "MagTec Alaska, LLC" -> "magtec alaska llc" (case, punctuation, spacing). */
export function companyKey(raw) {
  return String(raw || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Is `company` one of `names` (a company's LMS name + its known spellings)? */
export function companyIn(company, names) {
  const k = companyKey(company);
  if (!k) return false;
  return (names || []).some((n) => companyKey(n) === k);
}

export const SIGN_IN_TO_CLOSE_MESSAGE = 'Sign in to close a THA. Anyone can view THAs; only the crew\'s own company can close them. Use the email on your SLP training (LMS) account.';

export function companyMismatchMessage(thaNumber, thaCompany, yourCompany) {
  return (thaNumber || 'This THA') + ' belongs to ' + (thaCompany || 'another company') + '. You are signed in for ' +
    (yourCompany || 'a different company') + '. You can view it, but only ' + (thaCompany || 'that company') + '\'s own crew can close it.';
}

/**
 * The whole close decision, pure (no I/O).
 *   scope   null when signed out, else
 *           { email, fullName, isStaff, role, companyName, companyNames: [...] }
 *           derived server-side from the caller's own session (never the body)
 *   tha     { tha_number, company }
 *   people  namedPeople(tha, crew)
 *   tapped  the name the closer tapped/typed (may be blank)
 * Returns { ok:true, closedBy, onBehalf, as } or { ok:false, status, reason, error }.
 */
export function decideThaClose({ scope, tha, people, tapped }) {
  const n = tha && tha.tha_number;
  const list = people || [];
  const person = String(tapped || '').trim() ? findNamedCloser(tapped, list) : null;
  if (!scope) return { ok: false, status: 401, reason: 'signed_out', error: SIGN_IN_TO_CLOSE_MESSAGE };

  if (scope.isStaff) {
    // SLP staff: any company. Record the named person they tapped, else themselves.
    if (String(tapped || '').trim() && !person) return { ok: false, status: 403, reason: 'not_named', error: notNamedMessage(n) };
    const closedBy = person ? person.name : (scope.fullName || scope.email);
    return { ok: true, closedBy, onBehalf: !!person && !namesMatch(scope.fullName || '', person.name), as: 'staff' };
  }

  if (!scope.companyNames || !scope.companyNames.length) {
    return { ok: false, status: 403, reason: 'no_company', error: 'You are signed in as ' + scope.email + ', but that sign-in is not linked to an active company on the SLP training (LMS) site, so it cannot close THAs. Ask your company admin or SLP Alaska to add you, or ask your crew lead to close it.' };
  }
  if (!companyIn(tha && tha.company, scope.companyNames)) {
    return { ok: false, status: 403, reason: 'company_mismatch', error: companyMismatchMessage(n, tha && tha.company, scope.companyName) };
  }

  if (scope.role === 'company_admin') {
    if (!person) return { ok: false, status: 403, reason: 'not_named', error: notNamedMessage(n) + ' As a company admin you can close it for anyone named on it: tap their name.' };
    return { ok: true, closedBy: person.name, onBehalf: !namesMatch(scope.fullName || '', person.name), as: 'company_admin' };
  }

  // Learner / crew: must be named on this THA themselves, and closes as themselves.
  const self = scope.fullName ? findNamedCloser(scope.fullName, list) : null;
  if (!self) {
    return { ok: false, status: 403, reason: 'not_named_self', error: 'You are signed in as ' + (scope.fullName || scope.email) + ', and that name is not on ' + (n || 'this THA') + ' (crew lead or crew sign-on). Only someone named on it can close it. Sign onto the crew first if you were on it, or ask your crew lead or company admin to close it.' };
  }
  if (person && person.name !== self.name) {
    return { ok: false, status: 403, reason: 'not_you', error: 'You are signed in as ' + (scope.fullName || scope.email) + '. You can only close a THA as yourself: tap your own name (' + self.name + '), or ask your company admin to close it for ' + person.name + '.' };
  }
  return { ok: true, closedBy: self.name, onBehalf: false, as: 'crew' };
}

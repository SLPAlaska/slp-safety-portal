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

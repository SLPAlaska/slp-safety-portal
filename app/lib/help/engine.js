// SLP Safety Portal Help Desk: the answer engine.
//
// Pure functions, no network, no React: the whole bank ships inside the page
// bundle, so a search works with zero signal. scripts/check-help.mjs runs this
// exact file against sample questions.
//
// Matching is deliberately forgiving because people type on a phone with
// gloves on: lower-case, light stemming, synonyms, prefix matches and one or
// two typos per word are all accepted.

import { FORMS } from './forms.js'
import { HOWTO, TOPICS, SLP_PHONE, SLP_PHONE_TEL } from './howto.js'

export { TOPICS, SLP_PHONE, SLP_PHONE_TEL }

// ── Text normalising ───────────────────────────────────────────────────────
const STOP = new Set(('a an the and or of to in on at for is are was were be been do does did i me my we our you your it its this that ' +
  'can could should would will how what where when which who why there here with from by as am have has had get got about into ' +
  'please help need want find use using form forms page portal slp one any some just').split(' '))

export function stem(w) {
  if (w.length > 5 && w.endsWith('ing')) return w.slice(0, -3)
  if (w.length > 4 && w.endsWith('ies')) return w.slice(0, -3) + 'y'
  if (w.length > 4 && w.endsWith('ed')) return w.slice(0, -2)
  if (w.length > 4 && w.endsWith('es') && /(ch|sh|x|ss)es$/.test(w)) return w.slice(0, -2)
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1)
  return w
}

export function normalize(text) {
  return String(text || '').toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9₂ ]+/g, ' ')
    .replace(/₂/g, '2')
    .replace(/\s+/g, ' ').trim()
}

export function tokens(text, keepStop = false) {
  return normalize(text).split(' ').filter((w) => w && (keepStop || !STOP.has(w))).map(stem)
}

// ── Synonyms: any word on a line finds the others ──────────────────────────
// Field words first. Multi-word phrases are matched on the normalised query.
const SYN_LINES = [
  'tha jsa jha task hazard analysis job safety analysis pre job plan pjp',
  'bbs observation card stop card behavior behaviour',
  'near miss nearmiss close call good catch almost',
  'incident accident injury injured hurt',
  'loto lockout lock out tagout tag out energy isolation',
  'sling slings rigging',
  'extinguisher extinguishers fe',
  'lms training course class elearning online learning',
  'password pw passcode pass word',
  'login log in sign in signin logon log on',
  'logout log out sign out signout',
  'certificate cert certification card',
  'sail action item action items punch list to do todo',
  'corrective action ca capa',
  'permit permits',
  'harness harnesses',
  'forklift fork lift telehandler lull',
  'manlift man lift aerial lift scissor lift boom lift mewp',
  'vehicle truck pickup car',
  'phone cell mobile iphone android',
  'offline signal service reception connection internet wifi',
  'photo photos picture pictures pic pics image camera',
  'delete remove erase',
  'edit change fix correct',
  'broken not working doesnt work wont work does not work',
  'spill release leak',
  'gas h2s lel',
  'excavation trench trenching dig digging',
  'confined space cse',
  'hot work welding cutting torch',
  'toolbox tailgate pre job meeting pjsm',
  'mbwa walk around walkaround',
  'moc management of change',
  'sse short service employee new hire',
  'd and a drug alcohol drug test',
  'journey trip travel drive driving',
  'weather cold wind chill temperature',
  'stop take 5 take five take 5 stop and take five lmra',
  'recordable osha 1904 first aid',
  'investigation investigate rca root cause',
  'overdue late past due',
  'print printout pdf copy',
  'submit send turn in',
  'stuck frozen freeze hang blank',
  'eyewash eye wash',
  'aed defibrillator defib',
  'ladder ladders',
  'scaffold scaffolding',
  'lifesaving life saving lsr',
]
const SYN = new Map()
for (const line of SYN_LINES) {
  const words = [...new Set(tokens(line, true))]
  for (const w of words) {
    if (!SYN.has(w)) SYN.set(w, new Set())
    for (const o of words) if (o !== w) SYN.get(w).add(o)
  }
}

function editDistance(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    let best = i
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
      if (cur[j] < best) best = cur[j]
    }
    if (best > max) return max + 1
    prev = cur
  }
  return prev[b.length]
}

// ── Emergency / STOP WORK detection ────────────────────────────────────────
// Shown as a banner above the answers, never instead of them. Words that are
// usually paperwork ("fire extinguisher", "emergency drill") are excluded.
const CRITICAL = [
  /\b911\b/, /\bman down\b/, /\bnot breathing\b/, /\bunconscious\b/, /\bunresponsive\b/, /\bpassed out\b/,
  /\bbleeding\b/, /\belectrocut/, /\bshocked\b/, /\btrapped\b/, /\bpinned\b/, /\bcrushed\b/, /\bexplo(sion|ded|de)\b/,
  /\bblow ?out\b/, /\boverdose\b/, /\bheart attack\b/, /\bcardiac\b/, /\bseizure\b/, /\bstroke\b/, /\bdying\b/,
  /\bfatal(ity)?\b/, /\bsomeone (is |got |just )?(hurt|injured|down)\b/, /\b(is|got|been|im|i am) (hurt|injured)\b/,
  /\bon fire\b/, /\b(there is|theres|its|it is) (a )?fire\b/, /\bfire now\b/, /\bsmoke\b/, /\bgas leak\b/, /\bsmell gas\b/,
  /\bh2s (alarm|leak|release|monitor)\b/, /\b(alarm|monitor) (is )?(going off|alarming|sounding)\b/, /\balarming\b/,
  /\bevacuat/, /\b(spill|spilling|leaking|release) (now|right now|happening)\b/, /\bfell\b/, /\bfall from\b/,
  /\bsomeone fell\b/, /\bfrostbit/, /\bhypotherm/, /\bburned\b/, /\bhelp me\b/, /\burgent\b/, /\bemergency\b/,
  /\bstop work\b/, /\bunsafe\b/, /\brollover\b/, /\bcrash(ed)?\b/, /\bwreck\b/,
]
const NOT_CRITICAL = /\b(extinguisher|drill|eyewash|inspection|evaluation|audit|form|permit|plan|training|course|aed|kit|quiz)\b/

export function isCritical(query) {
  const q = normalize(query)
  if (!q) return false
  if (!CRITICAL.some((r) => r.test(q))) return false
  // "emergency drill evaluation", "fire extinguisher inspection" are paperwork.
  if (NOT_CRITICAL.test(q) && !/\b(911|man down|not breathing|unconscious|bleeding|trapped|crushed|explo|on fire|gas leak|evacuat|someone (is |got )?(hurt|injured))/.test(q)) return false
  return true
}

// ── Bank ───────────────────────────────────────────────────────────────────
// gate: { isEnabled(id), isPathEnabled(path) } from app/lib/modules.js.
export function buildBank(gate) {
  const on = (id) => !id || !gate || gate.isEnabled(id)
  const pathOn = (p) => !p || /^(tel|mailto):/.test(p) || !gate || gate.isPathEnabled(p)
  const keepLinks = (links) => (links || []).filter(([, href]) => pathOn(href))

  const entries = []
  for (const h of HOWTO) {
    if (!on(h.module)) continue
    entries.push({ ...h, links: keepLinks(h.links), kind: 'howto' })
  }
  for (const f of FORMS) {
    if (!on(f.module) || !pathOn(f.href) || f.href === '/help') continue
    const parts = [f.what]
    if (f.when) parts.push('When: ' + f.when)
    if (f.tips) parts.push('Tip: ' + f.tips)
    entries.push({
      id: 'form:' + f.href,
      kind: 'form',
      topic: 'forms',
      module: f.module,
      href: f.noLink ? null : f.href,
      q: 'Where is the ' + f.name + ' and what is it for?',
      title: f.name,
      a: parts.join('\n\n'),
      k: f.name + ' ' + (f.k || ''),
      links: f.noLink ? [] : [['Open ' + f.name, f.href]],
    })
  }
  for (const e of entries) {
    e._title = new Set(tokens(e.title || e.q))
    e._q = new Set(tokens(e.q))
    e._k = new Set(tokens(e.k))
    e._a = new Set(tokens(e.a))
    e._norm = ' ' + normalize((e.title || '') + ' ' + e.q + ' ' + e.k) + ' '
  }
  return entries
}

function fieldHit(word, set) {
  if (set.has(word)) return 1
  if (word.length >= 3) {
    for (const t of set) {
      if (t.length > word.length && t.startsWith(word)) return 0.75
    }
  }
  if (word.length >= 5) {
    const max = word.length >= 8 ? 2 : 1
    for (const t of set) {
      if (Math.abs(t.length - word.length) <= max && editDistance(word, t, max) <= max) return 0.7
    }
  }
  return 0
}

function scoreEntry(e, qWords, qNorm) {
  let score = 0
  let matched = 0
  for (const { w, syn } of qWords) {
    let best = 0
    const cands = [[w, 1], ...syn.map((s) => [s, 0.8])]
    for (const [c, mult] of cands) {
      const s = mult * Math.max(
        3.0 * fieldHit(c, e._title),
        2.5 * fieldHit(c, e._q),
        2.0 * fieldHit(c, e._k),
        0.6 * (e._a.has(c) ? 1 : 0),
      )
      if (s > best) best = s
    }
    if (best > 0) matched++
    score += best
  }
  if (!qWords.length) return 0
  const coverage = matched / qWords.length
  score = score * (0.4 + coverage)
  // Precision: prefer the answer whose own question is mostly the words asked.
  const qset = new Set(qWords.flatMap(({ w, syn }) => [w, ...syn]))
  const head = e.kind === 'form' ? e._title : e._q
  if (head.size) {
    let hit = 0
    for (const t of head) if (qset.has(t)) hit++
    score += 1.5 * (hit / head.size)
  }
  if (qNorm.length >= 4 && e._norm.includes(' ' + qNorm + ' ')) score += 6
  else if (qNorm.length >= 6 && e._norm.includes(qNorm)) score += 3
  return score
}

// Returns [{ entry, score }] best first. context: current page path.
export function search(bank, query, { limit = 8, context = '' } = {}) {
  const qNorm = normalize(query)
  const base = tokens(query)
  const words = []
  const seen = new Set()
  // Multi-word synonym phrases ("lock out", "near miss") collapse to one token.
  for (const w of base) {
    if (seen.has(w)) continue
    seen.add(w)
    words.push({ w, syn: [...(SYN.get(w) || [])] })
  }
  if (!words.length) return []
  const critical = isCritical(query)
  const out = []
  for (const e of bank) {
    let s = scoreEntry(e, words, qNorm)
    if (s <= 0) continue
    if (critical && e.critical) s += 4
    if (context && (e.href === context || (e.links || []).some(([, h]) => h === context))) s += 1.5
    out.push({ entry: e, score: s })
  }
  out.sort((a, b) => b.score - a.score || (a.entry.kind === 'howto' ? -1 : 1))
  // Drop weak tail matches once there are strong ones.
  const top = out.length ? out[0].score : 0
  return out.filter((r) => r.score >= Math.max(1.5, top * 0.25)).slice(0, limit)
}

// Answers tied to the page the person came from (?from=/hot-work).
export function forPage(bank, path) {
  if (!path || path === '/') return []
  const p = String(path).split('?')[0]
  return bank.filter((e) => e.href === p || (e.links || []).some(([, h]) => h === p)).slice(0, 6)
}

export function bankStats(bank) {
  return { total: bank.length, howto: bank.filter((e) => e.kind === 'howto').length, forms: bank.filter((e) => e.kind === 'form').length }
}

// scripts/sweep-secrets.mjs
//
//   npm run sweep:secrets                      # auto-discover this session
//   npm run sweep:secrets -- <scratchpad-path> # or point it at one
//
// The end-of-session sweep required by CLAUDE.md for any session that touches
// driver data. Scans the three places tool output persists and reports what it
// finds.
//
// IT REPORTS, IT DOES NOT DELETE. Deleting is a decision for a person, and a
// sweep that cleans up after itself gives nobody the chance to notice that
// something was written there at all.
//
// It prints file names and the KIND of match, never the matched value. A sweep
// that echoes what it found has recreated the problem it went looking for.

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join, basename } from 'node:path'
import { homedir, tmpdir } from 'node:os'

const PATTERNS = [
  ['supabase JWT (anon or service-role)', /eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}/],
  ['anthropic api key', /sk-ant-[A-Za-z0-9_-]{20,}/],
  ['resend api key', /\bre_[A-Za-z0-9_]{16,}/],
  ['elevenlabs api key', /\bsk_[a-f0-9]{32,}/],
  ['aws access key id', /\bAKIA[0-9A-Z]{16}\b/],
  ['private key block', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['client export password (pre-cutover)', /PSA2026/],
  ['client export secret (per-client)', /\b[A-Z2-9]{5}-[A-Z2-9]{5}-[A-Z2-9]{5}-[A-Z2-9]{5}\b/],
  // Driver identification data. The CDL pattern deliberately catches the
  // Excel float artefact ('1234567.0') as well as a bare number next to a CDL
  // label, because that is the shape the imported spreadsheet produced.
  ['CDL number in cleartext', /'\d{6,10}\.0'|CDL\s*Number|cdl_number"?\s*[:=]\s*"?\d{6}/i],
  // A bare MM/DD/YYYY is just a date — it appears in every SOP and log in the
  // project. Only flag one that sits next to a birth-date label, or the
  // FMCSA bulk file's own DOB column. Matching every date would bury the real
  // findings in noise, and a sweep nobody reads is worse than no sweep.
  ['date of birth in cleartext',
   /\b(dob|date[_ ]of[_ ]birth|birth[_ ]?date)\b["' :=\t]{0,6}\d{1,4}[-/]\d{1,2}[-/]\d{2,4}|LastName\tFirstName\tDOB/i],
  ['generic secret assignment', /(secret|passwo?rd|api[_-]?key|token)\s*[:=]\s*['"][^'"\s]{8,}/i],
]

const SKIP_NAME = new Set(['sweep-secrets.mjs'])

function sessionDirs() {
  const out = []
  const arg = process.argv[2]
  if (arg) out.push(['scratchpad (given)', arg])

  // Temp/claude/<project>/<session>/{scratchpad,tasks}
  const tempRoot = join(tmpdir(), 'claude')
  if (existsSync(tempRoot)) {
    for (const proj of readdirSync(tempRoot)) {
      const pd = join(tempRoot, proj)
      if (!statSync(pd).isDirectory()) continue
      for (const sess of readdirSync(pd)) {
        const sd = join(pd, sess)
        if (!statSync(sd).isDirectory()) continue
        for (const sub of ['scratchpad', 'tasks']) {
          const p = join(sd, sub)
          if (existsSync(p) && (!arg || p !== arg)) out.push([`${sub} (${sess.slice(0, 8)})`, p])
        }
      }
    }
  }

  // ~/.claude/projects/<project>/<session>/tool-results  <- the persistent one
  const projRoot = join(homedir(), '.claude', 'projects')
  if (existsSync(projRoot)) {
    for (const proj of readdirSync(projRoot)) {
      const pd = join(projRoot, proj)
      if (!statSync(pd).isDirectory()) continue
      for (const sess of readdirSync(pd)) {
        const tr = join(pd, sess, 'tool-results')
        if (existsSync(tr)) out.push([`tool-results (${sess.slice(0, 8)}) NOT TEMPORARY`, tr])
      }
    }
  }
  return out
}

function walk(dir) {
  const files = []
  const stack = [dir]
  while (stack.length) {
    const d = stack.pop()
    let entries
    try { entries = readdirSync(d, { withFileTypes: true }) } catch { continue }
    for (const e of entries) {
      const p = join(d, e.name)
      if (e.isDirectory()) { if (e.name !== 'node_modules' && e.name !== '__pycache__') stack.push(p) }
      else if (!SKIP_NAME.has(e.name)) files.push(p)
    }
  }
  return files
}

let flagged = 0, scanned = 0, binary = 0
const report = []

for (const [label, dir] of sessionDirs()) {
  if (!existsSync(dir)) continue
  const hits = []
  for (const p of walk(dir)) {
    let buf
    try { buf = readFileSync(p) } catch { continue }
    const size = buf.length
    if (buf.subarray(0, 4096).includes(0)) {
      binary++
      hits.push([p, size, ['BINARY — not scanned, inspect by hand']])
      continue
    }
    scanned++
    const text = buf.toString('utf8')
    const found = PATTERNS.filter(([, re]) => re.test(text)).map(([name]) => name)
    if (found.length) { flagged++; hits.push([p, size, found]) }
  }
  if (hits.length) report.push([label, dir, hits])
}

console.log('='.repeat(78))
console.log('END-OF-SESSION SWEEP')
console.log('='.repeat(78))
console.log(`scanned ${scanned} text file(s), ${binary} binary, ${flagged} flagged\n`)

if (!report.length) {
  console.log('Nothing flagged. No secret, credential or driver identification')
  console.log('data found in any scratchpad, tasks or tool-results directory.')
} else {
  for (const [label, dir, hits] of report) {
    console.log(`\n${label}`)
    console.log(`  ${dir}`)
    for (const [p, size, found] of hits) {
      console.log(`\n    ${basename(p)}  (${size.toLocaleString()} bytes)`)
      for (const f of found) console.log(`        - ${f}`)
    }
  }
  console.log('\n' + '='.repeat(78))
  console.log('Report these before deleting anything. When deleting, overwrite with')
  console.log('random bytes and fsync before unlinking, so the contents are not')
  console.log('merely de-linked.')
}
process.exit(0)

// Guards the offline re-send wiring. The queue in SafeSubmit.js is useless
// unless something starts it: that was the bug fixed here (initOfflineSync
// existed but nothing ever called it, so forms saved with no signal were
// never re-sent). Run: npm run check:offline
import { readFileSync } from 'node:fs'
const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')
const fails = []
const layout = read('app/layout.js')
const sync = read('app/components/OfflineSync.js')
const safe = read('app/components/SafeSubmit.js')
if (!/import OfflineSync from '@\/components\/OfflineSync'/.test(layout) || !/<OfflineSync \/>/.test(layout)) fails.push('app/layout.js must mount <OfflineSync /> on every page')
if (!/initOfflineSync\(\)/.test(sync)) fails.push('OfflineSync must call initOfflineSync()')
for (const ev of ["'online'", "'focus'", "'pageshow'", "'visibilitychange'"]) if (!safe.includes(ev)) fails.push(`initOfflineSync must listen for ${ev}`)
if (!/setInterval\(kick/.test(safe)) fails.push('initOfflineSync must retry on a timer (navigator.onLine lies on weak LTE)')
if (/gaveUp\s*=\s*true/.test(safe)) fails.push('queued items must never be given up on / hidden')
if (/localStorage\.setItem\(QUEUE_KEY, JSON\.stringify\(remaining\)\)/.test(safe)) fails.push('flush must not overwrite the whole queue (drops items queued mid-flush)')
if (!/NOT sent/.test(sync)) fails.push('bar must say NOT sent while items wait')
// Offline photos + idempotent inserts (PR: offline photo sync / client ids)
if (!/\[CLIENT_ID_COLUMN\]: clientId/.test(safe)) fails.push('safeSubmit must stamp every insert with client_submission_id')
if (!/isSameSubmissionDuplicate\(error, dupKeys\)/.test(safe)) fails.push('a 23505 on client_submission_id must count as already saved')
if (!/indexedDB\.open\(PHOTO_DB/.test(safe)) fails.push('queued photos must be kept in IndexedDB')
if (!/flushItemPhotos\(item\)[\s\S]*insertOnce\(item\.target_table/.test(safe)) fails.push('flush must upload queued photos BEFORE inserting the form')
if (!/item\.data\[CLIENT_ID_COLUMN\] = newClientSubmissionId\(\)/.test(safe)) fails.push('items queued by older builds must get a client id before the first re-send')
if (!/getOfflineQueuePhotoCount/.test(sync)) fails.push('bar must count queued photos')
{
  const { readdirSync, statSync } = await import('node:fs')
  const walk = (d) => readdirSync(new URL('../' + d, import.meta.url)).flatMap(n => {
    const rel = d + '/' + n
    return statSync(new URL('../' + rel, import.meta.url)).isDirectory() ? walk(rel) : [rel]
  })
  for (const f of walk('app').filter(f => /page\.js$/.test(f))) {
    if (/photoRef\.current\.uploadAll\(/.test(read(f))) fails.push(`${f}: pass photoRef to safeSubmit/safeInsert instead of calling uploadAll() (photos would be lost offline)`)
  }
}

// Incident / THA / Camp on the same offline photo path (packages)
if (!/export async function submitPackage/.test(safe)) fails.push('SafeSubmit must offer submitPackage for multi-step forms')
if (!/kind === 'package'[\s\S]*flushPackageItem\(item\)/.test(safe)) fails.push('flush must send queued packages')
if (!/savePhotos\(`\$\{item\.photoKey \|\| item\.id\}:\$\{g\.name\}`/.test(safe)) fails.push('package photos must be kept in IndexedDB')
{
  const inc = read('app/incident-report/page.js')
  const handle = inc.slice(inc.indexOf('const handleSubmit'), inc.indexOf('// CONDITIONAL RENDERS'))
  if (!/submitPackage\(/.test(handle)) fails.push('Incident Report submit must go through submitPackage (offline photos)')
  if (/supabase\s*\.storage|from\('incidents'\)\s*\.insert/.test(handle)) fails.push('Incident Report submit must not upload/insert directly (needs signal, and read-back fails for non-staff)')
  const tha = read('app/tha-jsa/page.js')
  if (/supabase\.storage/.test(tha)) fails.push('THA photos must ride with SafeSubmit, not upload on pick')
  if (!/photoColumn:'photo_url'/.test(tha)) fails.push('THA must hand its photos to safeInsert (photo_url)')
  const camp = read('app/camp-inspection/page.js')
  if (/supabase\.storage|from\('camp_inspections'\)\s*\.insert/.test(camp)) fails.push('Camp must start / upload through submitPackage')
  if (!/mode: 'merge'/.test(camp)) fails.push('Camp queued answers/photos must use merge (never shrink photo lists)')
}
if (fails.length) { console.error('offline re-send: FAILED\n - ' + fails.join('\n - ')); process.exit(1) }
console.log('offline re-send: all checks passed')

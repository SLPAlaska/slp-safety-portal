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
if (!/isSameSubmissionDuplicate\(error\)/.test(safe)) fails.push('a 23505 on client_submission_id must count as already saved')
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
if (fails.length) { console.error('offline re-send: FAILED\n - ' + fails.join('\n - ')); process.exit(1) }
console.log('offline re-send: all checks passed')

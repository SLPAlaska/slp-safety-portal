'use client';
import { createClient } from '@supabase/supabase-js';
import { compressImage } from '@/components/MultiPhotoUpload';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://iypezirwdlqpptjpeeyf.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4'
);

const ADMIN_EMAIL = 'brian@slpalaska.com';

/**
 * SafeSubmit v2 - Bulletproof form submission system
 * 
 * GUARANTEES:
 * 1. User data is NEVER lost - backup table + localStorage fallback
 * 2. Photo failures are non-fatal - form saves without photos, admin notified
 * 3. Admin gets email alert on ANY failure
 * 4. User always sees success if data was captured (even in backup)
 * 5. Offline submissions queue on the phone and re-send automatically when
 *    signal returns (started by <OfflineSync/> in app/layout.js)
 */

/**
 * Convert top-level '' values to null.
 *
 * Blank optional fields arrive from the forms as empty strings. Postgres
 * accepts '' for text columns but rejects it for date/numeric/uuid
 * ('invalid input syntax for type date: ""'), which is what lands rows in
 * failed_submissions.
 *
 * Deliberately exact and shallow: only a strict '' becomes null. 0, false,
 * null, undefined, whitespace-only strings, nested objects and array members
 * are left exactly as they are. No truthiness tests.
 */
export function nullifyEmptyStrings(obj) {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const out = { ...obj };
  for (const key of Object.keys(out)) {
    if (out[key] === '') out[key] = null;
  }
  return out;
}

// ── Client submission IDs (idempotent inserts) ─────────────────────────────
//
// Every row SafeSubmit inserts carries a client_submission_id made on the
// phone. Each form table has a UNIQUE index on that column
// (supabase/migrations/*_sql_2026_10_11_41_client_submission_id.sql), so when
// the server saved a row but the phone never got the reply (weak LTE), the
// retry is refused as a duplicate of the SAME submission and we treat that as
// "already in". Result: a retry can neither lose the form nor double it.

export const CLIENT_ID_COLUMN = 'client_submission_id';

export function newClientSubmissionId() {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  } catch (e) {}
  const b = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(b);
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** The server already has this exact submission (same client_submission_id). */
export function isSameSubmissionDuplicate(err, extraKeys) {
  if (!err || String(err.code) !== '23505') return false;
  const txt = `${err.message || ''} ${err.details || ''}`;
  if (new RegExp(CLIENT_ID_COLUMN).test(txt)) return true;
  // A phone-made primary key (incidents.id, camp_inspections.id) or the
  // record_keys (table, record) key: the server already has THIS record.
  return Array.isArray(extraKeys) && extraKeys.some(k => k && txt.includes(k));
}

/**
 * A stable UUID made from a string, so the same thing (photo 2 of incident X,
 * the corrective action for question Q of camp inspection Y) gets the same
 * client_submission_id on every try, even after a page-level retry.
 */
export function stableUuid(str) {
  const s = String(str || '');
  // Four independent 32-bit FNV-1a passes with different seeds -> 128 bits.
  const seeds = [0x811c9dc5, 0x01000193, 0x5bd1e995, 0x27d4eb2f];
  const words = seeds.map(seed => {
    let h = seed >>> 0;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; h ^= h >>> 13; }
    return h >>> 0;
  });
  const h = words.map(w => w.toString(16).padStart(8, '0')).join('');
  const v = (parseInt(h[16], 16) & 0x3) | 0x8;
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${v.toString(16)}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

// A table without the column (one added later and not yet migrated) must
// still accept the form: drop the id for that table and send without it.
const tablesWithoutClientId = new Set();
function isMissingClientIdColumn(err) {
  if (!err) return false;
  const txt = `${err.message || ''} ${err.details || ''} ${err.hint || ''}`;
  return (String(err.code) === 'PGRST204' || String(err.code) === '42703') && new RegExp(CLIENT_ID_COLUMN).test(txt);
}
function withoutClientId(row) {
  if (!row || typeof row !== 'object') return row;
  const { [CLIENT_ID_COLUMN]: _drop, ...rest } = row;
  return rest;
}

/**
 * One insert attempt with the idempotency rules applied.
 * Returns { error, duplicate }. duplicate=true means "the server already had
 * it" and counts as success.
 */
async function insertOnce(table, row, { timeoutMs, dupKeys } = {}) {
  const send = async (r) => {
    let q = supabase.from(table).insert([r]);
    if (timeoutMs && typeof AbortSignal !== 'undefined' && AbortSignal.timeout) q = q.abortSignal(AbortSignal.timeout(timeoutMs));
    const { error } = await q;
    return error || null;
  };
  let r = tablesWithoutClientId.has(table) ? withoutClientId(row) : row;
  let error = await send(r);
  if (error && isMissingClientIdColumn(error) && r && r[CLIENT_ID_COLUMN] !== undefined) {
    tablesWithoutClientId.add(table);
    error = await send(withoutClientId(r));
  }
  if (error && isSameSubmissionDuplicate(error, dupKeys)) return { error: null, duplicate: true };
  return { error, duplicate: false };
}

// ── Photo sources ───────────────────────────────────────────────────────────
//
// A form hands SafeSubmit its photos either as a MultiPhotoUpload ref
// (photoRef) or as a plain array of File objects (photos). Both become the
// same small interface: hasPhotos / uploadAll / getFiles.

const PHOTO_BUCKET = 'safety-photos';

function slugPrefix(s) {
  return String(s || 'form').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'form';
}

function filesPhotoSource(files, prefix) {
  const list = (files || []).filter(Boolean);
  return {
    hasPhotos: () => list.length > 0,
    async getFiles() {
      const out = [];
      for (const f of list) { try { out.push(await compressImage(f)); } catch (e) { out.push(f); } }
      return out;
    },
    async uploadAll(submissionId) {
      const urls = [];
      const failedFiles = [];
      for (let i = 0; i < list.length; i++) {
        let file = list[i];
        try { file = await compressImage(file); } catch (e) {}
        const path = `${prefix}/${submissionId}/${i + 1}.${fileExt(file)}`;
        const r = await uploadPhotoFile(path, file);
        if (r.ok) urls.push(r.url); else failedFiles.push(file);
      }
      return { urls, failedCount: failedFiles.length, failedFiles };
    }
  };
}

function fileExt(file) {
  const fromName = String((file && file.name) || '').split('.').pop().toLowerCase();
  if (fromName && fromName.length <= 5 && /^[a-z0-9]+$/.test(fromName)) return fromName;
  const t = String((file && file.type) || '');
  if (t.includes('png')) return 'png';
  if (t.includes('webp')) return 'webp';
  if (t.includes('gif')) return 'gif';
  if (t.includes('heic')) return 'heic';
  return 'jpg';
}

function isStorageDuplicate(err) {
  if (!err) return false;
  return String(err.statusCode || err.status || '') === '409' || /already exists|Duplicate/i.test(`${err.error || ''} ${err.message || ''}`);
}

/**
 * Upload one photo to a fixed path. Re-sending to the same path after a lost
 * reply is refused as "already exists": the photo is there, so that is OK.
 * Returns { ok, url, network, error }.
 */
async function uploadPhotoFile(path, file, timeoutMs = 60000, bucket = PHOTO_BUCKET) {
  let timer = null;
  try {
    const upload = supabase.storage.from(bucket).upload(path, file, { contentType: file.type || 'image/jpeg', upsert: false });
    const timeout = new Promise((_, rej) => { timer = setTimeout(() => rej(Object.assign(new Error('Photo upload timed out'), { name: 'TimeoutError' })), timeoutMs); });
    const { error } = await Promise.race([upload, timeout]);
    if (error && !isStorageDuplicate(error)) {
      // 5xx / 408 / 429 are the storage service struggling, not a bad photo:
      // keep it and try again later, like a dropped connection.
      const st = Number(error.status);
      const transient = st >= 500 || st === 408 || st === 429;
      return { ok: false, network: transient || isNetworkError(error) || isAbort(error) || isStorageNetwork(error), error };
    }
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return { ok: true, url: data.publicUrl };
  } catch (e) {
    return { ok: false, network: isNetworkError(e) || isAbort(e) || isStorageNetwork(e), error: e };
  } finally {
    clearTimeout(timer);
  }
}

function isStorageNetwork(err) {
  // storage-js wraps fetch failures as StorageUnknownError with the original
  // TypeError as originalError.
  const o = err && err.originalError;
  return !!o && (isNetworkError(o) || isAbort(o));
}

/**
 * Put photo links on a row. Most forms keep them in photo_urls (text[]);
 * a few keep one comma-joined text column (THA/JSA: photo_url).
 */
function applyPhotoUrls(row, column, join, urls) {
  const col = column || 'photo_urls';
  if (!urls || !urls.length) return row;
  if (join) {
    const existing = typeof row[col] === 'string' && row[col] ? row[col].split(join).filter(Boolean) : [];
    row[col] = [...existing, ...urls.filter(u => !existing.includes(u))].join(join);
  } else {
    const existing = Array.isArray(row[col]) ? row[col] : [];
    row[col] = [...existing, ...urls.filter(u => !existing.includes(u))];
  }
  return row;
}

export async function safeSubmit({ table, data, photoRef, photos, photoPrefix, formType, photoColumn, photoJoin }) {
  const result = {
    success: false,
    usedBackup: false,
    photoWarning: null,
    error: null
  };

  // The phone-made id for this submission (see "Client submission IDs").
  const clientId = (data && data[CLIENT_ID_COLUMN]) || newClientSubmissionId();

  const source = photoRef?.current?.hasPhotos?.()
    ? photoRef.current
    : (Array.isArray(photos) && photos.length ? filesPhotoSource(photos, slugPrefix(photoPrefix || formType || table)) : null);
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;

  // Step 1: Photos. No signal: keep them on the phone with the form (Step 3).
  // Signal: upload now (NEVER fatal).
  let photoUrls = null;
  let unsentPhotos = [];
  if (source && offline) {
    try {
      unsentPhotos = typeof source.getFiles === 'function' ? await source.getFiles() : [];
    } catch (e) {
      unsentPhotos = [];
    }
  } else if (source) {
    try {
      const submissionId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const uploadResult = await source.uploadAll(submissionId);

      // uploadAll returns { urls: [...], failedCount: N, failedFiles: [...] }
      const urls = uploadResult?.urls || uploadResult || [];
      const failedCount = uploadResult?.failedCount || 0;
      unsentPhotos = Array.isArray(uploadResult?.failedFiles) ? uploadResult.failedFiles : [];

      if (Array.isArray(urls) && urls.length > 0) {
        photoUrls = urls;
      }

      if (failedCount > 0) {
        result.photoWarning = `${failedCount} photo(s) failed to upload. Form data was still saved.`;
        alertAdmin({
          form_type: formType,
          alert_type: 'photo_upload_partial',
          error_message: `${failedCount} of ${failedCount + (urls?.length || 0)} photos failed to upload`,
          target_table: table
        });
      }
    } catch (photoErr) {
      console.warn('Photo upload failed (non-fatal):', photoErr.message);
      result.photoWarning = 'Photos could not be uploaded but your form data was saved.';
      alertAdmin({
        form_type: formType,
        alert_type: 'photo_upload_failed',
        error_message: photoErr.message,
        target_table: table
      });
    }
  }

  // Step 2: Build submission data
  let submitData = { ...data, [CLIENT_ID_COLUMN]: clientId };
  if (photoUrls && photoUrls.length > 0) {
    applyPhotoUrls(submitData, photoColumn, photoJoin, photoUrls);
  }
  const photoQueue = { files: unsentPhotos, prefix: slugPrefix(photoPrefix || formType || table), column: photoColumn || 'photo_urls', join: photoJoin || null };

  // Step 3: Check if we're online
  if (offline) {
    const q = await queueOfflineSubmission({ table, formType, data: submitData, photos: photoQueue });
    result.success = true;
    result.usedBackup = true;
    result.queued = true;
    result.photoWarning = (result.photoWarning || '') + ' No signal: saved on this phone, NOT sent yet. It sends automatically when signal returns.'
      + (q.photosKept ? ` Your ${q.photosKept} photo(s) are saved with it and send too.` : '')
      + (q.photosLost ? ` ${q.photosLost} photo(s) could not be stored on this phone; take them again when you have signal.` : '');
    return result;
  }

  // Step 4: Try primary insert
  submitData = nullifyEmptyStrings(submitData);

  try {
    const { error } = await insertWithRetry(table, submitData);
    if (error) throw error;
    result.success = true;
    return result;

  } catch (primaryErr) {
    console.error(`Primary insert to ${table} failed:`, primaryErr.message);

    // A dropped connection: keep the whole package (form + any photos that
    // did not upload) on the phone and re-send it, rather than parking it in
    // the backup table without its photos.
    if ((isNetworkError(primaryErr) || isAbort(primaryErr)) && unsentPhotos.length > 0) {
      const q = await queueOfflineSubmission({ table, formType, data: submitData, photos: photoQueue, primaryError: primaryErr.message });
      result.success = true;
      result.usedBackup = true;
      result.queued = true;
      result.photoWarning = 'Weak signal: saved on this phone, NOT sent yet. It sends automatically when the connection returns.'
        + (q.photosKept ? ` Your ${q.photosKept} photo(s) are saved with it and send too.` : '');
      return result;
    }

    // Step 5: Primary failed - try backup table
    try {
      const { error: backupErr } = await supabase.from('failed_submissions').insert([{
        form_type: formType,
        target_table: table,
        submission_data: submitData,
        error_message: primaryErr.message,
        status: 'pending',
        created_at: new Date().toISOString()
      }]);

      if (backupErr) throw backupErr;

      result.success = true;
      result.usedBackup = true;

      alertAdmin({
        form_type: formType,
        alert_type: 'primary_insert_failed',
        error_message: primaryErr.message,
        target_table: table,
        details: 'Data saved to failed_submissions backup table. Needs manual recovery.'
      });

      return result;

    } catch (backupErr) {
      console.error('Backup insert also failed:', backupErr.message);

      // Step 6: on the phone as last resort (with any photos that did not upload)
      await queueOfflineSubmission({ table, formType, data: submitData, photos: photoQueue, primaryError: primaryErr.message, backupError: backupErr.message });

      result.success = true;
      result.usedBackup = true;
      result.queued = true;
      result.photoWarning = (result.photoWarning || '') + ' Saved on this phone, NOT sent yet. It sends automatically when the connection returns.';

      alertAdmin({
        form_type: formType,
        alert_type: 'total_failure_local_save',
        error_message: `Primary: ${primaryErr.message} | Backup: ${backupErr.message}`,
        target_table: table,
        details: 'URGENT - Data saved to user localStorage only. Check database connectivity.'
      });

      return result;
    }
  }
}

async function alertAdmin({ form_type, alert_type, error_message, target_table, details }) {
  try {
    await supabase.from('system_alerts').insert([{
      alert_type,
      form_type,
      target_table: target_table || null,
      error_message,
      details: details || null,
      admin_email: ADMIN_EMAIL,
      status: 'new',
      created_at: new Date().toISOString()
    }]);
  } catch (e) {
    console.error('Failed to log system alert:', e);
  }
}

// ── Offline queue ───────────────────────────────────────────────────────────
//
// Submissions that could not reach the server are kept in localStorage under
// QUEUE_KEY and re-sent by flushOfflineQueue(). The flush is started from
// <OfflineSync/> in the root layout (online / focus / visibility / pageshow
// events, a timer while anything is waiting, and once on every page load).
//
// Photos taken for a queued form are kept in IndexedDB (PHOTO_DB), keyed by
// the queue item id; localStorage is far too small for pictures. On re-send
// the photos go up first (to fixed paths, so a retry never makes a second
// copy), their links are put on the form, then the form is inserted. The item
// and its photos leave the phone only after the server accepted the form.
//
// Rules: nothing is ever dropped from the queue unless the server accepted it
// (target table) or it landed in the failed_submissions backup table. Each
// item is removed the moment it is accepted, so a dropped connection halfway
// through a flush never re-sends what already went in, and items queued while
// a flush is running are never overwritten. Every item carries its
// client_submission_id, so a re-send the server already has is recognised
// and never doubled.

const QUEUE_KEY = 'offline_submission_queue';
export const OFFLINE_QUEUE_EVENT = 'slp-offline-queue';

const PHOTO_DB = 'slp-offline-photos';
const PHOTO_STORE = 'photos';

function idbOpen() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('IndexedDB not available')); return; }
    const req = indexedDB.open(PHOTO_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(PHOTO_STORE)) db.createObjectStore(PHOTO_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('IndexedDB open failed'));
    req.onblocked = () => reject(new Error('IndexedDB blocked'));
  });
}

async function idbRun(mode, fn) {
  const db = await idbOpen();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(PHOTO_STORE, mode);
      const store = tx.objectStore(PHOTO_STORE);
      let out;
      const req = fn(store);
      if (req) req.onsuccess = () => { out = req.result; };
      tx.oncomplete = () => resolve(out);
      tx.onerror = () => reject(tx.error || new Error('IndexedDB error'));
      tx.onabort = () => reject(tx.error || new Error('IndexedDB aborted (storage full?)'));
    });
  } finally {
    try { db.close(); } catch (e) {}
  }
}

/** Keep photo files for queue item `key`. Resolves to the number stored. */
async function savePhotos(key, files) {
  const records = [];
  for (const f of files) {
    // Store the raw bytes as a Blob (Safari is happier with Blob than File).
    const buf = await f.arrayBuffer();
    records.push({ name: f.name || 'photo.jpg', type: f.type || 'image/jpeg', blob: new Blob([buf], { type: f.type || 'image/jpeg' }) });
  }
  await idbRun('readwrite', (store) => store.put(records, key));
  // Read back: a full disk can "succeed" and store nothing.
  const back = await loadPhotos(key);
  return Array.isArray(back) ? back.length : 0;
}

async function loadPhotos(key) {
  try {
    const v = await idbRun('readonly', (store) => store.get(key));
    return Array.isArray(v) ? v : null;
  } catch (e) {
    return null;
  }
}

async function deletePhotos(key) {
  try { await idbRun('readwrite', (store) => store.delete(key)); } catch (e) {}
}

function newQueueId() {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function readQueue() {
  try {
    const q = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    return Array.isArray(q) ? q : [];
  } catch (e) {
    return [];
  }
}

function writeQueue(queue) {
  try {
    if (queue.length) localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    else localStorage.removeItem(QUEUE_KEY);
  } catch (e) {
    console.error('Failed to write offline queue:', e);
  }
  notifyQueue();
}

function countQueuedPhotos(queue) {
  let n = 0;
  for (const i of queue) {
    if (i && i.photos && i.photos.total) n += Math.max(0, i.photos.total - Object.keys(i.photos.uploaded || {}).length);
    if (i && Array.isArray(i.groups)) for (const g of i.groups) n += Math.max(0, (g.total || 0) - Object.keys(g.uploaded || {}).length - (g.rejected || []).length);
  }
  return n;
}

function notifyQueue(detail) {
  try {
    if (typeof window !== 'undefined') {
      const q = readQueue();
      window.dispatchEvent(new CustomEvent(OFFLINE_QUEUE_EVENT, { detail: { count: q.length, photos: countQueuedPhotos(q), ...(detail || {}) } }));
    }
  } catch (e) {}
}

// Older builds could write two items with the same id, and items written by
// the previous build have no client_submission_id. Give every item its own
// queue id and a submission id before a flush (persisted BEFORE anything is
// sent, so every retry of an item reuses the same id).
function normaliseQueueIds() {
  const q = readQueue();
  const seen = new Set();
  let changed = false;
  for (const item of q) {
    if (!item.id || seen.has(item.id)) {
      // Photos are keyed by the old id; keep the key when re-numbering.
      if (item.photos && !item.photos.key) item.photos.key = item.id;
      item.id = newQueueId();
      changed = true;
    }
    seen.add(item.id);
    if (item.data && typeof item.data === 'object' && !Array.isArray(item.data) && !item.data[CLIENT_ID_COLUMN]) {
      item.data[CLIENT_ID_COLUMN] = newClientSubmissionId();
      changed = true;
    }
  }
  if (changed) writeQueue(q);
}

function removeFromQueue(id) {
  writeQueue(readQueue().filter(i => i.id !== id));
}

function patchQueueItem(id, patch) {
  const q = readQueue();
  const item = q.find(i => i.id === id);
  if (!item) return;
  Object.assign(item, patch);
  writeQueue(q);
}

/**
 * Put a submission (and its photos) on the phone.
 * Resolves to { photosKept, photosLost }.
 */
async function queueOfflineSubmission({ table, formType, data, photos, primaryError, backupError }) {
  const id = newQueueId();
  let photosKept = 0;
  let photosLost = 0;
  const files = (photos && Array.isArray(photos.files)) ? photos.files.filter(Boolean) : [];
  if (files.length) {
    try {
      photosKept = await savePhotos(id, files);
    } catch (e) {
      console.error('Could not keep photos on this phone:', e);
      photosKept = 0;
    }
    photosLost = files.length - photosKept;
  }
  try {
    const entry = {
      id,
      timestamp: new Date().toISOString(),
      form_type: formType,
      target_table: table,
      data,
      primary_error: primaryError || null,
      backup_error: backupError || null,
      retryCount: 0
    };
    if (photosKept > 0) {
      entry.photos = {
        key: id,
        total: photosKept,
        prefix: photos.prefix || slugPrefix(formType || table),
        column: photos.column || 'photo_urls',
        join: photos.join || null,
        // Fixed folder for this submission's photos, so a re-send that the
        // server already took is refused as "already exists", not copied.
        folder: (data && data[CLIENT_ID_COLUMN]) || id,
        uploaded: {}
      };
    }
    if (photosLost > 0) entry.photos_lost = photosLost;
    const queue = readQueue();
    queue.push(entry);
    writeQueue(queue);
    notifyQueue({ queued: 1, queuedPhotos: photosKept });
    if (photosLost > 0) {
      alertAdmin({
        form_type: formType,
        alert_type: 'offline_photos_not_stored',
        error_message: `${photosLost} photo(s) could not be stored on the phone (storage full / private mode)`,
        target_table: table,
        details: 'The form itself is queued on the phone and will re-send.'
      });
    }
  } catch (e) {
    console.error('Failed to queue offline submission:', e);
    if (photosKept) deletePhotos(id);
    return { photosKept: 0, photosLost: files.length };
  }
  return { photosKept, photosLost };
}

/**
 * Upload the queued photos of one item that are not up yet.
 * Resolves to { ok, network, urls, missing, rejected }.
 *   ok=false + network=true  -> still no real connection, stop the pass
 */
async function flushItemPhotos(item) {
  const p = item.photos;
  const key = p.key || item.id;
  const files = await loadPhotos(key);
  const uploaded = { ...(p.uploaded || {}) };
  const rejected = [...(p.rejected || [])];
  let missing = 0;
  if (!files) {
    // Browser data cleared / IndexedDB gone: the form still goes in.
    missing = Math.max(0, (p.total || 0) - Object.keys(uploaded).length - rejected.length);
  } else {
    for (let i = 0; i < files.length; i++) {
      if (uploaded[i] || rejected.includes(i)) continue;
      const rec = files[i];
      const blob = rec.blob;
      const name = rec.name || `photo-${i + 1}.jpg`;
      const file = (typeof File !== 'undefined') ? new File([blob], name, { type: rec.type || blob.type || 'image/jpeg' }) : blob;
      const path = `${p.prefix || 'form'}/${p.folder || item.id}/${i + 1}.${fileExt({ name, type: rec.type })}`;
      const r = await uploadPhotoFile(path, file);
      if (r.ok) {
        uploaded[i] = r.url;
        patchQueueItem(item.id, { photos: { ...p, uploaded: { ...uploaded }, rejected: [...rejected] } });
        continue;
      }
      if (r.network) {
        patchQueueItem(item.id, { photos: { ...p, uploaded: { ...uploaded }, rejected: [...rejected] }, last_error: (r.error && r.error.message) || 'photo upload: no connection', last_try: new Date().toISOString() });
        return { ok: false, network: true };
      }
      // The server refused this one photo (too big, bad type). Do not let it
      // hold the form hostage: note it, alert, carry on.
      rejected.push(i);
      patchQueueItem(item.id, { photos: { ...p, uploaded: { ...uploaded }, rejected: [...rejected] } });
    }
  }
  const urls = Object.keys(uploaded).map(Number).sort((a, b) => a - b).map(k => uploaded[k]);
  return { ok: true, urls, missing, rejected: rejected.length };
}

// One flush at a time: per tab (in-memory promise) and across tabs (Web Locks
// where the browser has them).
let flushInFlight = null;

async function flushOnce() {
  normaliseQueueIds();
  const snapshot = readQueue();
  if (snapshot.length === 0) return { processed: 0, toBackup: 0, failed: 0, remaining: 0 };

  let processed = 0;
  let toBackup = 0;
  let failed = 0;
  let photosSent = 0;

  for (const snapItem of snapshot) {
    // Another tab may already have sent it; always work from the latest copy.
    const item = readQueue().find(i => i.id === snapItem.id);
    if (!item) continue;

    if (item.kind === 'package') {
      const r = await flushPackageItem(item);
      if (r === 'sent') { processed++; continue; }
      if (r === 'backup') { toBackup++; continue; }
      failed++;
      if (r === 'network') break;
      continue;
    }

    // Photos first, so the form goes in with its links.
    let replayData = { ...(item.data || {}) };
    let photoNote = null;
    if (item.photos && item.photos.total) {
      const pr = await flushItemPhotos(item);
      if (!pr.ok) { failed++; break; }
      if (pr.urls.length) applyPhotoUrls(replayData, item.photos.column, item.photos.join, pr.urls);
      if (pr.missing || pr.rejected) photoNote = `${pr.missing + pr.rejected} queued photo(s) could not be uploaded (${pr.missing} missing on phone, ${pr.rejected} refused by storage)`;
      photosSent += pr.urls.length;
    }
    replayData = nullifyEmptyStrings(replayData);

    let insertErr = null;
    let duplicate = false;
    try {
      // A hung request on weak LTE must not freeze the queue forever.
      const r = await insertOnce(item.target_table, replayData, { timeoutMs: 25000 });
      insertErr = r.error;
      duplicate = r.duplicate;
    } catch (e) {
      insertErr = e;
    }

    if (!insertErr) {
      removeFromQueue(item.id);
      if (item.photos) deletePhotos(item.photos.key || item.id);
      processed++;
      if (photoNote || item.photos_lost) {
        alertAdmin({
          form_type: item.form_type,
          alert_type: 'offline_photos_partial',
          error_message: photoNote || `${item.photos_lost} photo(s) could not be stored on the phone`,
          target_table: item.target_table,
          details: `Saved-on-phone submission from ${item.timestamp} was sent; ${CLIENT_ID_COLUMN}=${replayData[CLIENT_ID_COLUMN] || 'n/a'}.`
        });
      }
      if (duplicate && item.photos && item.photos.total) {
        // The server already had this form from an earlier try whose reply was
        // lost. Its photos are uploaded; record their links so they can be
        // matched to the row.
        const col = item.photos.column || 'photo_urls';
        alertAdmin({
          form_type: item.form_type,
          alert_type: 'offline_replay_already_saved',
          error_message: 'Re-send matched a submission the server already had (no duplicate created).',
          target_table: item.target_table,
          details: `${CLIENT_ID_COLUMN}=${replayData[CLIENT_ID_COLUMN]}; photos: ${JSON.stringify(replayData[col] || [])}`
        });
      }
      continue;
    }

    if (isNetworkError(insertErr) || isAbort(insertErr)) {
      // Still no real connection. Keep this and everything after it; try
      // again on the next online / focus / timer tick. Not counted as a
      // give-up: the item stays queued until the server has it.
      patchQueueItem(item.id, { last_error: insertErr.message || String(insertErr), last_try: new Date().toISOString() });
      failed++;
      break;
    }

    // The server answered but refused the row (bad data, RLS, constraint).
    // Same path as an online submit: park it in failed_submissions for
    // recovery and alert the admin. Only removed once that insert succeeds.
    try {
      const { error: backupErr } = await supabase.from('failed_submissions').insert([{
        form_type: item.form_type,
        target_table: item.target_table,
        submission_data: replayData,
        error_message: `Offline retry: ${insertErr.message}`,
        status: 'pending',
        created_at: item.timestamp
      }]);
      if (backupErr) throw backupErr;
      removeFromQueue(item.id);
      if (item.photos) deletePhotos(item.photos.key || item.id);
      toBackup++;
      alertAdmin({
        form_type: item.form_type,
        alert_type: 'offline_replay_rejected',
        error_message: insertErr.message,
        target_table: item.target_table,
        details: `Saved-on-phone submission from ${item.timestamp} was refused on re-send; moved to failed_submissions for recovery.`
      });
    } catch (e) {
      patchQueueItem(item.id, {
        retryCount: (item.retryCount || 0) + 1,
        last_error: (e && e.message) || String(e),
        last_try: new Date().toISOString()
      });
      failed++;
      if (isNetworkError(e)) break;
    }
  }

  return { processed, toBackup, failed, photosSent, remaining: readQueue().length };
}

export async function processOfflineQueue() {
  if (typeof window === 'undefined') return { processed: 0, toBackup: 0, failed: 0, remaining: 0 };
  if (flushInFlight) return flushInFlight;
  flushInFlight = (async () => {
    try {
      if (readQueue().length === 0) return { processed: 0, toBackup: 0, failed: 0, remaining: 0 };
      notifyQueue({ sending: true });
      let result;
      if (typeof navigator !== 'undefined' && navigator.locks && navigator.locks.request) {
        result = await navigator.locks.request('slp-offline-queue', { ifAvailable: true }, async (lock) => {
          if (!lock) return { processed: 0, toBackup: 0, failed: 0, remaining: readQueue().length, busy: true };
          return flushOnce();
        });
      } else {
        result = await flushOnce();
      }
      notifyQueue({ sending: false, result });
      return result;
    } catch (e) {
      notifyQueue({ sending: false });
      return { processed: 0, toBackup: 0, failed: 0, remaining: -1 };
    } finally {
      flushInFlight = null;
    }
  })();
  return flushInFlight;
}

/** Number of submissions saved on this phone and not yet sent. */
export function getOfflineQueueCount() {
  return readQueue().length;
}

/** Number of photos saved on this phone with queued forms, not yet uploaded. */
export function getOfflineQueuePhotoCount() {
  return countQueuedPhotos(readQueue());
}

/**
 * Start automatic re-sending. Safe to call more than once; returns a cleanup
 * function. Flushes on: page load, 'online', tab becoming visible, window
 * focus, back/forward cache restore, and every 30 s while something waits
 * (navigator.onLine often stays true on weak LTE, so 'online' never fires).
 */
export function initOfflineSync() {
  if (typeof window === 'undefined') return () => {};
  const kick = () => {
    if (navigator.onLine === false) return;
    if (readQueue().length === 0) return;
    processOfflineQueue().then(r => {
      if (r && (r.processed || r.toBackup)) console.log(`[SafeSubmit] Re-sent ${r.processed + r.toBackup} saved submission(s)`);
    });
  };
  const onVisible = () => { if (document.visibilityState === 'visible') kick(); };
  window.addEventListener('online', kick);
  window.addEventListener('focus', kick);
  window.addEventListener('pageshow', kick);
  document.addEventListener('visibilitychange', onVisible);
  const timer = setInterval(kick, 30000);
  // Fold in anything an older build left under 'emergency_submissions', then flush.
  const first = setTimeout(() => { migrateEmergencySubmissions(); kick(); }, 1500);
  return () => {
    window.removeEventListener('online', kick);
    window.removeEventListener('focus', kick);
    window.removeEventListener('pageshow', kick);
    document.removeEventListener('visibilitychange', onVisible);
    clearInterval(timer);
    clearTimeout(first);
  };
}

function migrateEmergencySubmissions() {
  try {
    const old = JSON.parse(localStorage.getItem('emergency_submissions') || '[]');
    if (Array.isArray(old) && old.length > 0) {
      const queue = readQueue();
      for (const item of old) {
        queue.push({
          id: `legacy-${newQueueId()}`,
          timestamp: item.timestamp,
          form_type: item.form_type,
          target_table: item.target_table,
          data: item.data,
          primary_error: item.primary_error,
          retryCount: 0
        });
      }
      writeQueue(queue);
      localStorage.removeItem('emergency_submissions');
    }
  } catch (e) {}
}

export async function retryEmergencySubmissions() {
  migrateEmergencySubmissions();
  return processOfflineQueue();
}

/**
 * safeInsert - drop-in replacement for supabase.from(table).insert(rows)
 * Returns { error } exactly like the raw client call, so existing
 * error-handling in migrated forms keeps working unchanged, while the
 * submission gets the full SafeSubmit pipeline (offline queue, backup
 * table, admin alerts, phone-made client_submission_id so a retry can
 * never double-insert).
 */
export async function safeInsert(table, rows, formType, options = {}) {
  const list = Array.isArray(rows) ? rows : [rows];
  let queued = false;
  let photoWarning = null;
  for (let i = 0; i < list.length; i++) {
    const row = list[i];
    // Photos (options.photoRef = MultiPhotoUpload ref, options.photos = File[])
    // ride with the first row only; with no signal they are kept on the
    // phone with that row and uploaded when it re-sends.
    const photoOpts = i === 0 ? { photoRef: options.photoRef, photos: options.photos, photoPrefix: options.photoPrefix, photoColumn: options.photoColumn, photoJoin: options.photoJoin } : {};
    const result = await safeSubmit({ table, data: row, formType: formType || table, ...photoOpts });
    if (result.photoWarning) { console.warn(result.photoWarning); if (i === 0) photoWarning = result.photoWarning; }
    if (result.queued) queued = true;
    if (!result.success) {
      const msg = (result.error && result.error.message) ? result.error.message : (result.error || 'Submission failed. Please try again.');
      return { error: new Error(msg) };
    }
  }
  // queued=true: saved on this phone, NOT sent yet (it re-sends on its own).
  return { error: null, queued, photoWarning };
}


// ── Packages: multi-step submissions (Incident Report, Camp, …) ─────────────
//
// Some forms are not one row: the Incident Report writes the incident, its
// claim code, its photos and documents, evidence rows, a first timeline event
// and a first witness note; the Camp inspection writes the inspection, then
// one response per question with its photos, then corrective actions.
//
// A package is that list of steps, written so every step can be sent again
// safely: rows carry phone-made ids (client_submission_id, or a phone-made
// primary key), photos go to fixed paths, close-out updates set the same
// values twice. The SAME runner sends it right away when there is signal and
// later from the offline queue when there is not, so it behaves the same both
// ways. Progress (photos up, steps done, values learned such as the INC
// number) is saved on the phone after each step, so a dropped connection
// halfway only re-sends what is missing.
//
// Step kinds:
//   { kind:'upload', group }                         photos/files of a group
//   { kind:'insert', table, row, dupKeys }           one row
//   { kind:'insert_each', group, table, row, ids }   one row per uploaded file
//   { kind:'closeout', table, recordId, code, codeId, mode, updates, capture }
//   { kind:'update', table, recordId, idCol, updates, capture }  signed-in staff
//   { kind:'field_data', view, params, capture }     server read (ids)
// Any step may be optional:true (a refusal is noted + admin alert, the rest
// still goes) and have a sid (so later values can depend on it: $ifOk).
//
// Values inside rows/updates/params may be:
//   { $ctx: 'incident_id' }            a value learned by an earlier step
//   { $count: ['photos','jsa'] }       how many files of those groups are up
//   { $urls: 'photos' } / { $join: ['photos', ','] }
//   { $ifOk: ['tl', value] }           value only if step 'tl' went in
//   { $lookup: ['respRows','question_id','Q1','id'] }
//   { $url: true } / { $n: 0 } / '…{n}…'  (insert_each: link / number)

export const OFFLINE_PACKAGE_DONE_EVENT = 'slp-offline-package-done';
const OMIT = Symbol('omit');
const TRANSIENT_HTTP = new Set([408, 425, 429, 500, 502, 503, 504]);

class PackageNetworkError extends Error {
  constructor(msg) { super(msg || 'No connection'); this.name = 'PackageNetworkError'; this.network = true; }
}

function groupUrls(item, name) {
  const g = (item.groups || []).find(x => x.name === name);
  if (!g) return [];
  return Object.keys(g.uploaded || {}).map(Number).sort((a, b) => a - b).map(k => g.uploaded[k]);
}

function resolveValue(v, item, each) {
  if (typeof v === 'string') {
    return each ? v.replace(/\{n\}/g, String(each.n)) : v;
  }
  if (!v || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map(x => resolveValue(x, item, each)).filter(x => x !== OMIT);
  const keys = Object.keys(v);
  if (keys.length === 1 && keys[0][0] === '$') {
    const k = keys[0], a = v[k];
    if (k === '$ctx') return (item.ctx || {})[a] === undefined ? null : item.ctx[a];
    if (k === '$count') return (Array.isArray(a) ? a : [a]).reduce((n, g) => n + groupUrls(item, g).length, 0);
    if (k === '$urls') { const u = groupUrls(item, a); return u.length ? u : null; }
    if (k === '$join') { const u = groupUrls(item, a[0]); return u.length ? u.join(a[1] || ',') : null; }
    if (k === '$ifOk') return (item.failed || {})[a[0]] ? OMIT : resolveValue(a[1], item, each);
    if (k === '$lookup') {
      const rows = (item.ctx || {})[a[0]];
      const hit = Array.isArray(rows) ? rows.find(r => r && String(r[a[1]]) === String(a[2])) : null;
      return hit ? (hit[a[3]] === undefined ? null : hit[a[3]]) : null;
    }
    if (k === '$url') return each ? each.url : null;
    if (k === '$n') return each ? each.n + (Number(a) || 0) : null;
  }
  const out = {};
  for (const key of keys) {
    const r = resolveValue(v[key], item, each);
    if (r !== OMIT) out[key] = r;
  }
  return out;
}

async function packageFiles(item, group, memFiles) {
  if (memFiles && Array.isArray(memFiles[group.name])) return memFiles[group.name];
  const recs = await loadPhotos(`${item.photoKey || item.id}:${group.name}`);
  if (!recs) return null;
  return recs.map((rec, i) => {
    const name = rec.name || `file-${i + 1}`;
    return (typeof File !== 'undefined') ? new File([rec.blob], name, { type: rec.type || rec.blob.type || 'application/octet-stream' }) : rec.blob;
  });
}

async function closeoutCall({ table, id, code, codeId, mode, updates }, timeoutMs = 30000) {
  let res;
  try {
    const opts = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table, id, code, updates, codeId, mode })
    };
    if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) opts.signal = AbortSignal.timeout(timeoutMs);
    res = await fetch('/api/closeout', opts);
  } catch (e) {
    throw new PackageNetworkError(e && e.message);
  }
  const j = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (TRANSIENT_HTTP.has(res.status) && res.status !== 500) throw new PackageNetworkError(`Close-out ${res.status}`);
    return { error: new Error(j.error || `Close-out failed (${res.status})`), row: null };
  }
  return { error: null, row: j.row || null };
}

/**
 * Run one package from where it stopped. persist(item) is called after every
 * bit of progress (no-op for an online run that has not been queued).
 * Resolves to { ok:true } or { ok:false, network:true } or
 * { ok:false, error, step }. Optional-step refusals are collected in
 * item.failed and item.notes.
 */
async function runPackage(item, { memFiles, persist, timeoutMs = 30000 } = {}) {
  item.ctx = item.ctx || {};
  item.failed = item.failed || {};
  item.notes = item.notes || [];
  item.eachDone = item.eachDone || {};
  const save = () => { try { persist && persist(item); } catch (e) {} };
  const steps = item.steps || [];
  for (let si = item.done || 0; si < steps.length; si++) {
    const st = steps[si];
    const label = st.sid || `${st.kind}:${st.table || st.group || st.view || si}`;
    let err = null;
    try {
      if (st.kind === 'upload') {
        const g = (item.groups || []).find(x => x.name === st.group);
        if (g && g.total) {
          const files = await packageFiles(item, g, memFiles);
          g.uploaded = g.uploaded || {};
          g.rejected = g.rejected || [];
          if (!files) {
            const missing = Math.max(0, g.total - Object.keys(g.uploaded).length - g.rejected.length);
            if (missing) item.notes.push(`${missing} ${g.name} file(s) were not on the phone any more (browser data cleared?)`);
            for (let i = 0; i < g.total; i++) if (!g.uploaded[i] && !g.rejected.includes(i)) g.rejected.push(i);
          } else {
            for (let i = 0; i < files.length; i++) {
              if (g.uploaded[i] || g.rejected.includes(i)) continue;
              let f = files[i];
              if (g.compress && memFiles) { try { f = await compressImage(f); } catch (e) {} }
              const base = g.fileBase ? `${g.fileBase}_${i + 1}` : `${i + 1}`;
              const path = `${g.prefix}/${g.folder}/${base}.${fileExt(f)}`;
              const r = await uploadPhotoFile(path, f, 60000, g.bucket || PHOTO_BUCKET);
              if (r.ok) { g.uploaded[i] = r.url; g.names = g.names || {}; g.names[i] = path.split('/').pop(); save(); continue; }
              if (r.network) { save(); throw new PackageNetworkError((r.error && r.error.message) || 'photo upload: no connection'); }
              g.rejected.push(i);
              item.notes.push(`${g.name} file ${i + 1} refused by storage: ${(r.error && r.error.message) || 'unknown'}`);
              save();
            }
          }
        }
      } else if (st.kind === 'insert') {
        const row = nullifyEmptyStrings(resolveValue(st.row, item));
        const r = await insertOnce(st.table, row, { timeoutMs, dupKeys: st.dupKeys });
        if (r.error) {
          if (isNetworkError(r.error) || isAbort(r.error)) throw new PackageNetworkError(r.error.message);
          err = r.error;
        }
      } else if (st.kind === 'insert_each') {
        const g = (item.groups || []).find(x => x.name === st.group);
        const done = new Set(item.eachDone[si] || []);
        const idxs = g ? Object.keys(g.uploaded || {}).map(Number).sort((a, b) => a - b) : [];
        let pos = 0;
        for (const i of idxs) {
          pos++;
          if (done.has(i)) continue;
          const each = { url: g.uploaded[i], n: i + 1, name: (g.names || {})[i] || '' };
          const row = nullifyEmptyStrings(resolveValue(st.row, item, each));
          if (Array.isArray(st.ids) && st.ids[i]) row[CLIENT_ID_COLUMN] = st.ids[i];
          if (st.nameField) row[st.nameField] = each.name;
          const r = await insertOnce(st.table, row, { timeoutMs, dupKeys: st.dupKeys });
          if (r.error) {
            if (isNetworkError(r.error) || isAbort(r.error)) throw new PackageNetworkError(r.error.message);
            err = r.error; break;
          }
          done.add(i); item.eachDone[si] = [...done]; save();
        }
      } else if (st.kind === 'closeout') {
        const updates = resolveValue(st.updates, item);
        const r = await closeoutCall({ table: st.table, id: resolveValue(st.recordId, item), code: resolveValue(st.code, item), codeId: resolveValue(st.codeId, item), mode: st.mode, updates }, timeoutMs);
        if (r.error) err = r.error;
        else if (st.capture && r.row) for (const [k, col] of Object.entries(st.capture)) if (r.row[col] !== undefined) item.ctx[k] = r.row[col];
      } else if (st.kind === 'update') {
        let q = supabase.from(st.table).update(nullifyEmptyStrings(resolveValue(st.updates, item))).eq(st.idCol || 'id', resolveValue(st.recordId, item)).select();
        if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) q = q.abortSignal(AbortSignal.timeout(timeoutMs));
        const { data, error } = await q.maybeSingle();
        if (error) {
          if (isNetworkError(error) || isAbort(error)) throw new PackageNetworkError(error.message);
          err = error;
        } else if (st.capture && data) for (const [k, col] of Object.entries(st.capture)) if (data[col] !== undefined) item.ctx[k] = data[col];
      } else if (st.kind === 'field_data') {
        try {
          const j = await fieldData(st.view, resolveValue(st.params || {}, item));
          if (st.capture) item.ctx[st.capture] = j.rows || j.row || null;
        } catch (e) {
          if (isNetworkError(e) || isAbort(e)) throw new PackageNetworkError(e.message);
          err = e;
        }
      }
    } catch (e) {
      if (e && (e.network || isNetworkError(e) || isAbort(e))) { save(); return { ok: false, network: true, error: e }; }
      err = e;
    }
    if (err) {
      if (st.optional) {
        item.failed[label] = (err && err.message) || String(err);
        item.notes.push(`${label}: ${(err && err.message) || err}`);
      } else {
        save();
        return { ok: false, error: err, step: si };
      }
    }
    item.done = si + 1;
    save();
  }
  return { ok: true };
}

function finishedPackageNotice(item) {
  try {
    if (typeof window !== 'undefined') {
      const urls = {};
      for (const g of item.groups || []) urls[g.name] = groupUrls(item, g.name);
      window.dispatchEvent(new CustomEvent(OFFLINE_PACKAGE_DONE_EVENT, { detail: { form_type: item.form_type, ref: item.ref || null, ctx: item.ctx || {}, urls, failed: item.failed || {} } }));
    }
  } catch (e) {}
  if (item.notes && item.notes.length) {
    alertAdmin({
      form_type: item.form_type,
      alert_type: 'package_partial',
      error_message: `${item.notes.length} part(s) of a ${item.label || item.form_type} did not go in`,
      target_table: item.target_table,
      details: item.notes.join(' | ').slice(0, 1800)
    });
  }
}

async function savePackageFiles(item, memFiles) {
  let kept = 0, lost = 0;
  for (const g of item.groups || []) {
    const files = (memFiles && memFiles[g.name]) || [];
    if (!files.length) continue;
    const toKeep = [];
    for (let i = 0; i < files.length; i++) {
      let f = files[i];
      if (g.compress) { try { f = await compressImage(f); } catch (e) {} }
      toKeep.push(f);
    }
    let n = 0;
    try { n = await savePhotos(`${item.photoKey || item.id}:${g.name}`, toKeep); } catch (e) { n = 0; }
    const pending = files.length - Object.keys(g.uploaded || {}).length - (g.rejected || []).length;
    kept += Math.min(n, pending);
    if (n < files.length) {
      lost += files.length - n;
      // Not on the phone: mark as refused so the rest is not held back.
      for (let i = n; i < files.length; i++) if (!(g.uploaded || {})[i] && !(g.rejected || []).includes(i)) { g.rejected = [...(g.rejected || []), i]; }
      item.notes = [...(item.notes || []), `${files.length - n} ${g.name} file(s) could not be stored on the phone`];
    }
  }
  return { kept, lost };
}

function queuePackageItem(item) {
  const q = readQueue();
  const i = q.findIndex(x => x.id === item.id);
  if (i >= 0) q[i] = item; else q.push(item);
  writeQueue(q);
}

/**
 * Send a multi-step package now if there is signal, otherwise (or if the
 * connection drops halfway) keep the rest of it on the phone and send it
 * later. Resolves to:
 *   { ok:true, queued:false, ctx }            all in
 *   { ok:true, queued:true, photosKept, photosLost, ctx }  saved on phone
 *   { ok:false, error }                        server refused a required step
 *
 * groups: [{ name, files:[File], bucket, prefix, folder, fileBase, compress }]
 */
export async function submitPackage({ formType, label, table, steps, groups = [], ref = null }) {
  const id = newQueueId();
  const memFiles = {};
  const item = {
    id,
    photoKey: id,
    kind: 'package',
    timestamp: new Date().toISOString(),
    form_type: formType,
    target_table: table || (steps.find(s => s.table) || {}).table || formType,
    label: label || formType,
    ref,
    steps,
    groups: groups.filter(g => g && Array.isArray(g.files) && g.files.length).map(g => {
      memFiles[g.name] = g.files.filter(Boolean);
      return { name: g.name, bucket: g.bucket || PHOTO_BUCKET, prefix: slugPrefix(g.prefix || formType), folder: g.folder || id, fileBase: g.fileBase || null, compress: g.compress !== false, total: memFiles[g.name].length, uploaded: {}, rejected: [] };
    }),
    done: 0,
    ctx: {},
    failed: {},
    notes: [],
    retryCount: 0
  };

  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
  if (!offline) {
    const r = await runPackage(item, { memFiles });
    if (r.ok) { finishedPackageNotice(item); return { ok: true, queued: false, ctx: item.ctx, failed: item.failed, urls: Object.fromEntries((item.groups || []).map(g => [g.name, groupUrls(item, g.name)])) }; }
    if (!r.network) return { ok: false, error: r.error, ctx: item.ctx, committed: (item.done || 0) > 0 };
    item.last_error = (r.error && r.error.message) || 'no connection';
    item.last_try = new Date().toISOString();
  }

  // No signal (or it dropped halfway): keep what is left on the phone.
  const { kept, lost } = await savePackageFiles(item, memFiles);
  queuePackageItem(item);
  notifyQueue({ queued: 1, queuedPhotos: kept });
  if (lost) {
    alertAdmin({ form_type: formType, alert_type: 'offline_photos_not_stored', error_message: `${lost} photo(s)/file(s) could not be stored on the phone (storage full / private mode)`, target_table: item.target_table, details: 'The rest of the submission is queued on the phone and will re-send.' });
  }
  return { ok: true, queued: true, photosKept: kept, photosLost: lost, ctx: item.ctx };
}

/** Flush one queued package. Resolves 'sent' | 'backup' | 'network' | 'failed'. */
async function flushPackageItem(item) {
  const persist = (it) => {
    const q = readQueue();
    const i = q.findIndex(x => x.id === it.id);
    if (i < 0) return;
    q[i] = { ...it };
    writeQueue(q);
  };
  const r = await runPackage(item, { persist, timeoutMs: 25000 });
  const dropFiles = () => { for (const g of item.groups || []) deletePhotos(`${item.photoKey || item.id}:${g.name}`); };
  if (r.ok) {
    removeFromQueue(item.id);
    dropFiles();
    finishedPackageNotice(item);
    return 'sent';
  }
  if (r.network) {
    patchQueueItem(item.id, { last_error: (r.error && r.error.message) || 'no connection', last_try: new Date().toISOString() });
    return 'network';
  }
  // The server refused a required step: park the whole package for recovery.
  try {
    const { error: backupErr } = await supabase.from('failed_submissions').insert([{
      form_type: item.form_type,
      target_table: item.target_table,
      submission_data: { package: true, label: item.label, steps: item.steps, done: item.done, ctx: item.ctx, failed: item.failed, files: Object.fromEntries((item.groups || []).map(g => [g.name, groupUrls(item, g.name)])) },
      error_message: `Offline retry (step ${(r.step || 0) + 1}): ${(r.error && r.error.message) || r.error}`,
      status: 'pending',
      created_at: item.timestamp
    }]);
    if (backupErr) throw backupErr;
    removeFromQueue(item.id);
    dropFiles();
    alertAdmin({
      form_type: item.form_type,
      alert_type: 'offline_replay_rejected',
      error_message: (r.error && r.error.message) || String(r.error),
      target_table: item.target_table,
      details: `Saved-on-phone ${item.label || item.form_type} from ${item.timestamp} was refused on re-send at step ${(r.step || 0) + 1}; moved to failed_submissions for recovery (photos already uploaded are linked there).`
    });
    return 'backup';
  } catch (e) {
    patchQueueItem(item.id, { retryCount: (item.retryCount || 0) + 1, last_error: (e && e.message) || String(e), last_try: new Date().toISOString() });
    return isNetworkError(e) ? 'network' : 'failed';
  }
}

// ── Close-out claim tickets (Step 2B) ───────────────────────────────────────

const KEY_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L

/** Generate a short human-friendly close-out code. */
export function makeRecordKey(len = 6) {
  let out = '';
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const buf = new Uint32Array(len);
    crypto.getRandomValues(buf);
    for (let i = 0; i < len; i++) out += KEY_ALPHABET[buf[i] % KEY_ALPHABET.length];
  } else {
    for (let i = 0; i < len; i++) out += KEY_ALPHABET[Math.floor(Math.random() * KEY_ALPHABET.length)];
  }
  return out;
}

/**
 * Deposit the code in the record_keys vault. Call right after a successful
 * insert. With no signal the code is kept on the phone (offline queue) and
 * deposited when signal returns, right after the record it belongs to.
 */
export async function registerRecordKey(table, recordId, code) {
  const row = { table_name: table, record_id: String(recordId), code };
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
  if (!offline) {
    try {
      const r = await insertOnce('record_keys', row, { timeoutMs: 25000, dupKeys: ['record_keys_pkey'] });
      if (r.error) throw r.error;
      return true;
    } catch (e) {
      if (!(isNetworkError(e) || isAbort(e))) {
        console.error('Record key registration failed:', e.message);
        alertAdmin({
          form_type: table,
          alert_type: 'record_key_registration_failed',
          error_message: e.message,
          target_table: 'record_keys',
          details: `record_id=${recordId} — close-out will require staff assistance`
        });
        return false;
      }
    }
  }
  await submitPackage({ formType: table, label: 'close-out code', table: 'record_keys', steps: [{ kind: 'insert', table: 'record_keys', row, dupKeys: ['record_keys_pkey'] }] });
  return true;
}

/** Server-validated close-out. Returns { error } like a raw supabase call. */
// ── Server-side field data (replaces anonymous SELECT) ──────────────────────
export async function fieldData(view, params = {}) {
  const qs = new URLSearchParams({ view, ...params }).toString();
  const res = await fetch('/api/field-data?' + qs);
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || 'Field data load failed (' + res.status + ')');
  return j;
}

export async function safeCloseout(table, id, code, updates, codeId, mode) {
  try {
    const res = await fetch('/api/closeout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table, id, code, updates, codeId, mode })
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return { error: new Error(j.error || `Close-out failed (${res.status})`) };
    return { error: null, row: j.row || null };
  } catch (e) {
    return { error: e };
  }
}

// Retry the primary insert on network-level failures only (stale connection after idle on Slope LTE).
// Server rejections (RLS, constraints, bad data) return immediately and fall through to the backup table.
const NET_ERR = /Load failed|Failed to fetch|NetworkError|fetch failed|Network request failed|network connection was lost/i;
function isAbort(err) {
  return !!err && !err.code && /AbortError|aborted|timed? ?out|TimeoutError/i.test(`${err.name || ''} ${err.message || ''}`);
}
function isNetworkError(err) {
  return !!err && !err.code && NET_ERR.test(err.message || ``);
}
async function insertWithRetry(table, row) {
  // Every try carries the same client_submission_id, so a try that reached
  // the server but whose reply was lost is recognised on the next try
  // (duplicate = already in) instead of creating a second row.
  const delays = [0, 800, 2000];
  let last = null;
  for (const d of delays) {
    if (d) await new Promise(r => setTimeout(r, d));
    try {
      const { error } = await insertOnce(table, row);
      if (!error) return { error: null };
      last = error;
      if (!isNetworkError(error)) return { error };
    } catch (e) {
      last = e;
      if (!isNetworkError(e)) return { error: e };
    }
  }
  return { error: last };
}

export default safeSubmit;

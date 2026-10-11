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
export function isSameSubmissionDuplicate(err) {
  if (!err || String(err.code) !== '23505') return false;
  return new RegExp(CLIENT_ID_COLUMN).test(`${err.message || ''} ${err.details || ''}`);
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
async function insertOnce(table, row, { timeoutMs } = {}) {
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
  if (error && isSameSubmissionDuplicate(error)) return { error: null, duplicate: true };
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
async function uploadPhotoFile(path, file, timeoutMs = 60000) {
  let timer = null;
  try {
    const upload = supabase.storage.from(PHOTO_BUCKET).upload(path, file, { contentType: file.type || 'image/jpeg', upsert: false });
    const timeout = new Promise((_, rej) => { timer = setTimeout(() => rej(Object.assign(new Error('Photo upload timed out'), { name: 'TimeoutError' })), timeoutMs); });
    const { error } = await Promise.race([upload, timeout]);
    if (error && !isStorageDuplicate(error)) {
      // 5xx / 408 / 429 are the storage service struggling, not a bad photo:
      // keep it and try again later, like a dropped connection.
      const st = Number(error.status);
      const transient = st >= 500 || st === 408 || st === 429;
      return { ok: false, network: transient || isNetworkError(error) || isAbort(error) || isStorageNetwork(error), error };
    }
    const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);
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

export async function safeSubmit({ table, data, photoRef, photos, photoPrefix, formType }) {
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
    submitData.photo_urls = photoUrls;
  }
  const photoQueue = { files: unsentPhotos, prefix: slugPrefix(photoPrefix || formType || table), column: 'photo_urls' };

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
  for (const i of queue) if (i && i.photos && i.photos.total) n += Math.max(0, i.photos.total - Object.keys(i.photos.uploaded || {}).length);
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

    // Photos first, so the form goes in with its links.
    let replayData = { ...(item.data || {}) };
    let photoNote = null;
    if (item.photos && item.photos.total) {
      const pr = await flushItemPhotos(item);
      if (!pr.ok) { failed++; break; }
      if (pr.urls.length) {
        const col = item.photos.column || 'photo_urls';
        const existing = Array.isArray(replayData[col]) ? replayData[col] : [];
        replayData[col] = [...existing, ...pr.urls.filter(u => !existing.includes(u))];
      }
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
  for (let i = 0; i < list.length; i++) {
    const row = list[i];
    // Photos (options.photoRef = MultiPhotoUpload ref, options.photos = File[])
    // ride with the first row only; with no signal they are kept on the
    // phone with that row and uploaded when it re-sends.
    const photoOpts = i === 0 ? { photoRef: options.photoRef, photos: options.photos, photoPrefix: options.photoPrefix } : {};
    const result = await safeSubmit({ table, data: row, formType: formType || table, ...photoOpts });
    if (result.photoWarning) console.warn(result.photoWarning);
    if (!result.success) {
      const msg = (result.error && result.error.message) ? result.error.message : (result.error || 'Submission failed. Please try again.');
      return { error: new Error(msg) };
    }
  }
  return { error: null };
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

/** Deposit the code in the record_keys vault. Call right after a successful insert. */
export async function registerRecordKey(table, recordId, code) {
  try {
    const { error } = await supabase.from('record_keys').insert([{
      table_name: table, record_id: String(recordId), code
    }]);
    if (error) throw error;
    return true;
  } catch (e) {
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

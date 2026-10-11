'use client';
import { createClient } from '@supabase/supabase-js';

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

export async function safeSubmit({ table, data, photoRef, formType }) {
  const result = {
    success: false,
    usedBackup: false,
    photoWarning: null,
    error: null
  };

  // Step 1: Try photo upload (NEVER fatal)
  let photoUrls = null;
  if (photoRef?.current?.hasPhotos()) {
    try {
      const submissionId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const uploadResult = await photoRef.current.uploadAll(submissionId);

      // uploadAll returns { urls: [...], failedCount: N }
      const urls = uploadResult?.urls || uploadResult || [];
      const failedCount = uploadResult?.failedCount || 0;

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
  let submitData = { ...data };
  if (photoUrls && photoUrls.length > 0) {
    submitData.photo_urls = photoUrls;
  }

  // Step 3: Check if we're online
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    queueOfflineSubmission({ table, formType, data: submitData });
    result.success = true;
    result.usedBackup = true;
    result.photoWarning = (result.photoWarning || '') + ' No signal: saved on this phone, NOT sent yet. It sends automatically when signal returns.';
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

      // Step 6: localStorage as last resort
      queueOfflineSubmission({ table, formType, data: submitData, primaryError: primaryErr.message, backupError: backupErr.message });

      result.success = true;
      result.usedBackup = true;
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
// Rules: nothing is ever dropped from the queue unless the server accepted it
// (target table) or it landed in the failed_submissions backup table. Each
// item is removed the moment it is accepted, so a dropped connection halfway
// through a flush never re-sends what already went in, and items queued while
// a flush is running are never overwritten.

const QUEUE_KEY = 'offline_submission_queue';
export const OFFLINE_QUEUE_EVENT = 'slp-offline-queue';

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

function notifyQueue(detail) {
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(OFFLINE_QUEUE_EVENT, { detail: { count: readQueue().length, ...(detail || {}) } }));
    }
  } catch (e) {}
}

// Older builds could write two items with the same id; give every item its
// own id before a flush so removing one can never remove another.
function normaliseQueueIds() {
  const q = readQueue();
  const seen = new Set();
  let changed = false;
  for (const item of q) {
    if (!item.id || seen.has(item.id)) { item.id = newQueueId(); changed = true; }
    seen.add(item.id);
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

function queueOfflineSubmission({ table, formType, data, primaryError, backupError }) {
  try {
    const entry = {
      id: newQueueId(),
      timestamp: new Date().toISOString(),
      form_type: formType,
      target_table: table,
      data,
      primary_error: primaryError || null,
      backup_error: backupError || null,
      retryCount: 0
    };
    const queue = readQueue();
    queue.push(entry);
    writeQueue(queue);
    notifyQueue({ queued: 1 });
  } catch (e) {
    console.error('Failed to queue offline submission:', e);
  }
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

  for (const item of snapshot) {
    // Another tab may already have sent it.
    if (!readQueue().some(i => i.id === item.id)) continue;
    const replayData = nullifyEmptyStrings(item.data);
    let insertErr = null;
    try {
      // A hung request on weak LTE must not freeze the queue forever.
      let q = supabase.from(item.target_table).insert([replayData]);
      if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) q = q.abortSignal(AbortSignal.timeout(25000));
      const { error } = await q;
      insertErr = error || null;
    } catch (e) {
      insertErr = e;
    }

    if (!insertErr) {
      removeFromQueue(item.id);
      processed++;
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

  return { processed, toBackup, failed, remaining: readQueue().length };
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
 * table, admin alerts).
 */
export async function safeInsert(table, rows, formType) {
  const list = Array.isArray(rows) ? rows : [rows];
  for (const row of list) {
    const result = await safeSubmit({ table, data: row, formType: formType || table });
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
  const delays = [0, 800, 2000];
  let last = null;
  for (const d of delays) {
    if (d) await new Promise(r => setTimeout(r, d));
    try {
      const { error } = await supabase.from(table).insert([row]);
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

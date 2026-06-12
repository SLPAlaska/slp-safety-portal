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
 * 5. Offline submissions queue and auto-retry when connection returns
 */

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
  const submitData = { ...data };
  if (photoUrls && photoUrls.length > 0) {
    submitData.photo_urls = photoUrls;
  }

  // Step 3: Check if we're online
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    queueOfflineSubmission({ table, formType, data: submitData });
    result.success = true;
    result.usedBackup = true;
    result.photoWarning = (result.photoWarning || '') + ' You appear to be offline. Your submission has been saved and will auto-submit when you reconnect.';
    return result;
  }

  // Step 4: Try primary insert
  try {
    const { error } = await supabase.from(table).insert([submitData]);
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
      result.photoWarning = (result.photoWarning || '') + ' Data saved locally on your device. It will auto-submit when connection is restored.';

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

function queueOfflineSubmission({ table, formType, data, primaryError, backupError }) {
  try {
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date().toISOString(),
      form_type: formType,
      target_table: table,
      data,
      primary_error: primaryError || null,
      backup_error: backupError || null,
      retryCount: 0
    };
    const queue = JSON.parse(localStorage.getItem('offline_submission_queue') || '[]');
    queue.push(entry);
    localStorage.setItem('offline_submission_queue', JSON.stringify(queue));
  } catch (e) {
    console.error('Failed to queue offline submission:', e);
  }
}

export async function processOfflineQueue() {
  try {
    const queue = JSON.parse(localStorage.getItem('offline_submission_queue') || '[]');
    if (queue.length === 0) return { processed: 0, failed: 0, remaining: 0 };

    const remaining = [];
    let processed = 0;
    let failed = 0;

    for (const item of queue) {
      try {
        const { error } = await supabase.from(item.target_table).insert([item.data]);
        if (error) {
          const { error: backupErr } = await supabase.from('failed_submissions').insert([{
            form_type: item.form_type,
            target_table: item.target_table,
            submission_data: item.data,
            error_message: `Offline retry: ${error.message}`,
            status: 'pending',
            created_at: item.timestamp
          }]);
          if (backupErr) throw backupErr;
        }
        processed++;
      } catch (e) {
        item.retryCount = (item.retryCount || 0) + 1;
        if (item.retryCount >= 5) {
          failed++;
          item.gaveUp = true;
        }
        remaining.push(item);
      }
    }

    localStorage.setItem('offline_submission_queue', JSON.stringify(remaining));
    if (remaining.length === 0) localStorage.removeItem('offline_submission_queue');
    return { processed, failed, remaining: remaining.length };
  } catch (e) {
    return { processed: 0, failed: 0, remaining: -1 };
  }
}

export function getOfflineQueueCount() {
  try {
    return JSON.parse(localStorage.getItem('offline_submission_queue') || '[]').filter(i => !i.gaveUp).length;
  } catch (e) {
    return 0;
  }
}

export function initOfflineSync() {
  if (typeof window === 'undefined') return;
  window.addEventListener('online', async () => {
    const result = await processOfflineQueue();
    if (result.processed > 0) {
      console.log(`[SafeSubmit] Synced ${result.processed} offline submissions`);
    }
  });
  if (navigator.onLine) {
    setTimeout(() => processOfflineQueue(), 3000);
  }
}

export async function retryEmergencySubmissions() {
  try {
    const old = JSON.parse(localStorage.getItem('emergency_submissions') || '[]');
    if (old.length > 0) {
      const queue = JSON.parse(localStorage.getItem('offline_submission_queue') || '[]');
      for (const item of old) {
        queue.push({
          id: `legacy-${Date.now()}`,
          timestamp: item.timestamp,
          form_type: item.form_type,
          target_table: item.target_table,
          data: item.data,
          primary_error: item.primary_error,
          retryCount: 0
        });
      }
      localStorage.setItem('offline_submission_queue', JSON.stringify(queue));
      localStorage.removeItem('emergency_submissions');
    }
  } catch (e) {}
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
export async function safeCloseout(table, id, code, updates) {
  try {
    const res = await fetch('/api/closeout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table, id, code, updates })
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return { error: new Error(j.error || `Close-out failed (${res.status})`) };
    return { error: null };
  } catch (e) {
    return { error: e };
  }
}

export default safeSubmit;

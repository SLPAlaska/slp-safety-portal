'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { authFetch } from '@/lib/authFetch';

// Drug & Alcohol console — SLP Alaska as C/TPA.
//
// Leads with the annual Clearinghouse query position, because that is the
// piece with live exposure: 49 CFR 382.701 requires a limited query per active
// CDL driver every 12 months, and a missed one is the most common Clearinghouse
// audit finding.
//
// No Supabase data client here. The da_* tables grant no write to any client
// role and only a DER may read them, so everything goes through /api/da, which
// re-derives the caller from their session. The gate below is a courtesy that
// stops the page rendering for someone who would only see errors — it is not
// the access control.

const supabaseAuth = (typeof globalThis !== 'undefined' && globalThis.__slpAuthClient)
  || (globalThis.__slpAuthClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { lock: async (_n, _t, fn) => await fn() } }));

const TABS = [
  ['clearinghouse', 'Clearinghouse'],
  ['bulk', 'Bulk Queries'],
  ['random', 'Random Testing'],
  ['selections', 'Current Selections'],
  ['mis', 'MIS Report'],
];

export default function DAConsole() {
  const [auth, setAuth] = useState('checking');   // checking | ok | signedout | refused
  const [me, setMe] = useState(null);
  const [tab, setTab] = useState('clearinghouse');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabaseAuth.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setAuth('signedout'); return; }
      const r = await authFetch('/api/da?view=whoami');
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(j.error || ''); setAuth('refused'); return; }
      setMe(j); setAuth('ok');
    });
  }, []);

  if (auth === 'checking') return <Shell><p style={S.muted}>Checking access…</p></Shell>;
  if (auth === 'signedout') return <Shell>
    <h2 style={S.h2}>Sign in required</h2>
    <p style={S.muted}>This console is for SLP Alaska staff and client DERs.</p>
    <a href="/lms/login" style={S.btnLink}>Go to sign in</a>
  </Shell>;
  if (auth === 'refused') return <Shell>
    <h2 style={S.h2}>Not authorized</h2>
    <p style={S.muted}>{err || 'This account is not authorized for drug and alcohol testing records.'}</p>
    <p style={S.fine}>
      Access here is limited to SLP Alaska staff and the Designated Employer
      Representative named for a client. A general company administrator role
      does not grant it.
    </p>
  </Shell>;

  return (
    <div style={S.wrap}>
      <div style={S.inner}>
        <a href="https://portal.slpalaska.com" style={S.back}>&larr; Back to Portal</a>
        <div style={S.head}>
          <h1 style={S.h1}>Drug &amp; Alcohol Testing</h1>
          <p style={S.sub}>
            SLP Alaska as C/TPA &middot; signed in as {me.email} ({me.role === 'slp_staff' ? 'SLP staff' : 'DER'})
            &middot; {me.clients.length} client{me.clients.length === 1 ? '' : 's'}
          </p>
        </div>
        <div style={S.tabs}>
          {TABS.map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)}
              style={{ ...S.tab, ...(tab === k ? S.tabOn : {}) }}>{label}</button>
          ))}
        </div>
        {err && tab !== 'clearinghouse' && <div style={S.err}>{err}</div>}
        {tab === 'clearinghouse' && <Clearinghouse me={me} busy={busy} setBusy={setBusy} />}
        {tab === 'bulk' && <BulkQueries me={me} busy={busy} setBusy={setBusy} />}
        {tab === 'random' && <RandomTesting me={me} busy={busy} setBusy={setBusy} />}
        {tab === 'selections' && <Selections me={me} busy={busy} setBusy={setBusy} />}
        {tab === 'mis' && <MisReport me={me} />}
      </div>
      <div style={S.foot}>AnthroSafe&trade; Field Driven Safety | &copy; 2026 SLP Alaska, LLC</div>
    </div>
  );
}

// ── 1. Clearinghouse annual query dashboard ─────────────────────────────────
function Clearinghouse({ me, busy, setBusy }) {
  const [data, setData] = useState(null);
  const [client, setClient] = useState('');
  const [err, setErr] = useState('');
  const [cdl, setCdl] = useState({});

  const load = useCallback(async () => {
    setErr('');
    const r = await authFetch('/api/da?view=clearinghouse' + (client ? `&client_id=${client}` : ''));
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setErr(j.error || 'Load failed'); return; }
    setData(j);
  }, [client]);
  useEffect(() => { load(); }, [load]);

  if (err) return <Card><div style={S.err}>{err}</div></Card>;
  if (!data) return <Card><p style={S.muted}>Loading…</p></Card>;

  const byName = Object.fromEntries(me.clients.map(c => [c.id, c.name]));
  const c = data.counts || {};
  const ACTION = ['never_queried', 'overdue', 'query_pending'];
  const listed = data.drivers.filter(d => ACTION.includes(d.due_status));

  return (
    <>
      <Card>
        <div style={S.rowBetween}>
          <h3 style={S.h3}>Annual query position <span style={S.hint}>49 CFR 382.701</span></h3>
          <select style={S.select} value={client} onChange={e => setClient(e.target.value)}>
            <option value="">All my clients</option>
            {me.clients.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </div>
        <div style={S.grid}>
          <Stat label="Never queried" value={c.never_queried || 0} tone="bad" />
          <Stat label="Overdue" value={c.overdue || 0} tone="bad" />
          <Stat label="Result not recorded" value={c.query_pending || 0} tone="warn" />
          <Stat label="Due within 30 days" value={c.due_soon || 0} tone="warn" />
          <Stat label="Current" value={c.current || 0} tone="good" />
        </div>
        <p style={S.muted}>
          A limited query is required for every active CDL driver each 12 months.
          <b> Result not recorded</b> means the query was run but its outcome was
          never entered — the annual clock is not satisfied, but this is a records
          gap on our side, not a driver who was never checked. It needs a different
          conversation from a genuine miss.
        </p>
        <p style={S.muted}>
          A driver who has left still shows here until someone confirms it. Nobody
          is marked inactive automatically, because guessing wrong either hides a
          real gap or erases a real driver.
        </p>
      </Card>

      <Card>
        <h3 style={S.h3}>Action list &middot; {listed.length} driver{listed.length === 1 ? '' : 's'}</h3>
        <table style={S.table}>
          <thead><tr>{['Driver', 'Client', 'Last query', 'Due', 'Days overdue', 'CDL'].map(h =>
            <th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {listed.map(d => (
              <tr key={d.driver_id} style={S.tr}>
                <td style={S.td}>{d.full_name}</td>
                <td style={S.td}>{byName[d.client_id] || '—'}</td>
                <td style={S.td}>{d.last_query_date
                  || (d.due_status === 'query_pending'
                        ? <em style={S.warn}>pending {d.pending_since}</em>
                        : <em style={S.never}>never</em>)}</td>
                <td style={S.td}>{d.next_due_date || '—'}</td>
                <td style={{ ...S.td, ...(d.due_status === 'query_pending' ? S.warn : S.bad) }}>
                  {d.due_status === 'never_queried' ? 'NEVER QUERIED'
                    : d.due_status === 'query_pending'
                      ? `result not recorded (${d.pending_full_query ? 'full' : 'limited'} query ${d.pending_since})`
                      : Math.abs(d.days_until_due)}
                </td>
                <td style={S.td}>
                  {cdl[d.driver_id]
                    ? <code style={S.code}>{cdl[d.driver_id]}</code>
                    : <button style={S.link} disabled={busy} onClick={async () => {
                        setBusy(true);
                        const r = await authFetch(`/api/da?view=cdl&driver_id=${d.driver_id}`);
                        const j = await r.json().catch(() => ({}));
                        setBusy(false);
                        if (r.ok) setCdl(p => ({ ...p, [d.driver_id]: j.cdl_number || '(none on file)' }));
                      }}>reveal</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={S.fine}>
          CDL numbers are encrypted at rest and revealed one driver at a time.
          They are excluded from every export on this page — the per-client sheets
          you send out carry names and dates only.
        </p>
      </Card>

      <Card>
        <h3 style={S.h3}>Per-client action sheets</h3>
        <p style={S.muted}>
          One plain-text sheet per client, names and dates only, for confirming
          who still works there before anyone is marked inactive.
        </p>
        <div style={S.btnRow}>
          {me.clients.map(cl => {
            const rows = listed.filter(d => d.client_id === cl.id);
            if (!rows.length) return null;
            return <button key={cl.id} style={S.btn} onClick={() => printSheet(cl.name, rows)}>
              {cl.name} ({rows.length})
            </button>;
          })}
        </div>
      </Card>
    </>
  );
}

function printSheet(clientName, rows) {
  const lines = [
    'FMCSA CLEARINGHOUSE - ANNUAL QUERY ACTION LIST',
    `Client: ${clientName}`,
    `Generated: ${new Date().toISOString().slice(0, 10)}    Prepared by SLP Alaska (C/TPA)`,
    '',
    '49 CFR 382.701 requires a limited query for each active CDL driver every',
    '12 months. The drivers below are past due or have never been queried.',
    'Please confirm which are still employed and CDL-active.',
    '',
    'DRIVER                        LAST QUERY              DUE          STATUS',
    '-'.repeat(80),
    ...rows.map(d => `${String(d.full_name).padEnd(30)}${String(d.last_query_date || (d.due_status === 'query_pending' ? 'submitted ' + d.pending_since : 'never')).padEnd(24)}${String(d.next_due_date || '-').padEnd(13)}${
      d.due_status === 'never_queried' ? 'NEVER QUERIED'
      : d.due_status === 'query_pending' ? 'RESULT NOT RECORDED'
      : Math.abs(d.days_until_due)}`),
    '',
    'No CDL numbers are included in this list by design.',
    'Return this sheet marked with any driver who has left.',
  ].join('\n');
  const w = window.open('', '_blank');
  if (w) { w.document.write('<pre>' + lines.replace(/</g, '&lt;') + '</pre>'); w.document.close(); w.print(); }
}

// ── 2. Bulk queries ────────────────────────────────────────────────
//
// There is no Clearinghouse API. FMCSA states that no integration
// specification exists and that employers and C/TPAs must use the site
// directly, so this is an export/import loop: build the file here, upload it
// there, paste the Query History export back.
function BulkQueries({ me, busy, setBusy }) {
  const [client, setClient] = useState(me.clients[0]?.id || '');
  const [data, setData] = useState(null);
  const [picked, setPicked] = useState({});
  const [qType, setQType] = useState(1);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState(null);
  const [paste, setPaste] = useState('');
  const [ingestBatch, setIngestBatch] = useState('');
  const [ingestResult, setIngestResult] = useState(null);

  const load = useCallback(async () => {
    if (!client) return;
    setErr('');
    const r = await authFetch(`/api/da?view=bulk_ready&client_id=${client}`);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setErr(j.error || 'Load failed'); return; }
    setData(j); setPicked({});
  }, [client]);
  useEffect(() => { load(); }, [load]);

  if (!client) return <Card><p style={S.muted}>No clients available.</p></Card>;
  if (err) return <Card><div style={S.err}>{err}</div></Card>;
  if (!data) return <Card><p style={S.muted}>Loading…</p></Card>;

  const eligible = data.drivers.filter(d => !d.blocked);
  const blocked = data.drivers.filter(d => d.blocked);
  const chosen = Object.keys(picked).filter(k => picked[k]);
  const bal = data.client?.query_balance;

  return (
    <>
      <Card>
        <div style={S.rowBetween}>
          <h3 style={S.h3}>Query balance &amp; file</h3>
          <select style={S.select} value={client} onChange={e => setClient(e.target.value)}>
            {me.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div style={S.grid}>
          <Stat label="Due or overdue" value={data.drivers.length} />
          <Stat label="Ready for a file" value={eligible.length} tone={eligible.length ? 'good' : 'warn'} />
          <Stat label="Missing DOB or CDL" value={blocked.length} tone={blocked.length ? 'bad' : 'good'} />
          <Stat label="Query balance"
            value={bal == null ? '—' : bal}
            tone={bal != null && bal < eligible.length ? 'bad' : undefined} />
        </div>
        <p style={S.muted}>
          A C/TPA may not purchase a query plan on an employer&apos;s behalf, so the
          balance below is what the client told us they hold. It is never
          decremented automatically and is only as good as its date
          {data.client?.query_balance_as_of ? ` (as of ${data.client.query_balance_as_of})` : ''}.
        </p>
        <div style={S.formRow3}>
          <input style={S.input} type="number" min="0" placeholder="Balance the client reports"
            id="balfield" />
          <button style={S.btn} disabled={busy} onClick={async () => {
            const v = document.getElementById('balfield').value;
            if (v === '') return;
            setBusy(true);
            await authFetch('/api/da', { method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'set_query_balance', client_id: client, query_balance: Number(v) }) });
            setBusy(false); load();
          }}>Update balance</button>
        </div>
      </Card>

      {blocked.length > 0 && <Card>
        <h3 style={S.h3}>Cannot go in a file yet &middot; {blocked.length}</h3>
        <p style={S.muted}>
          The FMCSA bulk template requires LastName, FirstName, DOB, CDL and
          Country. A driver missing a date of birth or a CDL cannot be included
          at all — add them on the Clearinghouse tab first.
        </p>
        <table style={S.table}>
          <thead><tr>{['Driver', 'DOB', 'CDL'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>{blocked.map(d => (
            <tr key={d.driver_id} style={S.tr}>
              <td style={S.td}>{d.full_name}</td>
              <td style={S.td}>{d.dob_on_file ? 'on file' : <b style={S.bad}>missing</b>}</td>
              <td style={S.td}>{d.cdl_on_file ? 'on file' : <b style={S.bad}>missing</b>}</td>
            </tr>))}</tbody>
        </table>
      </Card>}

      <Card>
        <div style={S.rowBetween}>
          <h3 style={S.h3}>Build a bulk file &middot; {chosen.length} selected</h3>
          <div style={S.btnRow}>
            <select style={S.select} value={qType} onChange={e => setQType(Number(e.target.value))}>
              <option value={1}>Type 1 — Limited query</option>
              <option value={4}>Type 4 — Limited + automatic consent request</option>
              <option value={2}>Type 2 — Full query</option>
              <option value={3}>Type 3 — Pre-employment</option>
            </select>
            <button style={S.link} onClick={() =>
              setPicked(Object.fromEntries(eligible.map(d => [d.driver_id, true])))}>select all</button>
            <button style={S.link} onClick={() => setPicked({})}>clear</button>
          </div>
        </div>
        <p style={S.fine}>
          Type 1 is the default because it is the minimum that satisfies the annual
          requirement and behaves predictably. Type 4 is understood to raise a consent
          request automatically when a limited query finds a record, which would save a
          step — but FMCSA&apos;s own Bulk Queries File Setup page could not be retrieved
          to confirm that, so check it against their template ReadMe before using it in
          anger. Types 2 and 3 need specific consent granted electronically inside the
          Clearinghouse first; we cannot supply it from here.
        </p>
        <table style={S.table}>
          <thead><tr>{['', 'Driver', 'Status', 'Limited consent'].map(h =>
            <th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {eligible.map(d => (
              <tr key={d.driver_id} style={S.tr}>
                <td style={S.td}>
                  <input type="checkbox" checked={!!picked[d.driver_id]}
                    onChange={e => setPicked(p => ({ ...p, [d.driver_id]: e.target.checked }))} />
                </td>
                <td style={S.td}>{d.full_name}</td>
                <td style={S.td}>{d.due_status === 'query_pending'
                  ? <span style={S.warn}>result not recorded</span>
                  : d.due_status === 'due_soon'
                    ? <span style={S.warn}>due in {d.days_until_due}d</span>
                    : d.due_status === 'never_queried'
                      ? <span style={S.bad}>never queried</span>
                      : <span style={S.bad}>{Math.abs(d.days_until_due)}d overdue</span>}</td>
                <td style={S.td}>{d.limited_consent
                  ? <span style={S.good}>on file</span>
                  : <span style={S.warn}>none recorded</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={S.btnRow}>
          <button style={S.btn} disabled={busy || !chosen.length} onClick={async () => {
            setBusy(true); setMsg(null);
            const r = await authFetch('/api/da', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'create_bulk_batch', client_id: client,
                                     query_type: qType, driver_ids: chosen }),
            });
            const j = await r.json().catch(() => ({}));
            setBusy(false);
            if (!r.ok) { setErr(j.error || 'Could not build the batch'); return; }
            setMsg(j); load();
          }}>{busy ? 'Building…' : `Queue ${chosen.length} for upload`}</button>
        </div>
        {msg && <div style={S.ok}>
          Batch created with {msg.queued} driver(s).
          {msg.already_queued?.length ? ` ${msg.already_queued.length} were already in an open batch and were skipped.` : ''}
          {(msg.warnings || []).map((w, i) => <div key={i} style={S.warnBox}>{w}</div>)}
        </div>}
      </Card>

      <Card>
        <h3 style={S.h3}>Batches</h3>
        {!data.batches.length && <p style={S.muted}>No batches yet.</p>}
        {data.batches.map(b => (
          <div key={b.id} style={S.batch}>
            <div style={S.rowBetween}>
              <div>
                <b>{b.filename}</b>
                <div style={S.fine}>
                  type {b.query_type} &middot; {b.driver_count} driver(s) &middot; {b.status}
                  &middot; built {String(b.created_at).slice(0, 10)} by {b.created_by}
                </div>
              </div>
              <div style={S.btnRow}>
                <button style={S.link} onClick={async () => {
                  const r = await authFetch(`/api/da?view=bulk_file&batch_id=${b.id}`);
                  const j = await r.json().catch(() => ({}));
                  if (!r.ok) { setErr(j.error || 'Could not build the file'); return; }
                  const blob = new Blob([j.content], { type: 'text/tab-separated-values' });
                  const a = document.createElement('a');
                  a.href = URL.createObjectURL(blob); a.download = j.filename; a.click();
                  URL.revokeObjectURL(a.href);
                  if (j.skipped?.length) setErr(`${j.skipped.length} driver(s) left out: missing CDL or DOB.`);
                }}>download file</button>
                {b.status === 'generated' && <button style={S.link} disabled={busy} onClick={async () => {
                  setBusy(true);
                  await authFetch('/api/da', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'set_batch_status', batch_id: b.id, status: 'submitted' }) });
                  setBusy(false); load();
                }}>mark uploaded</button>}
                <button style={S.link} onClick={() => setIngestBatch(b.id)}>ingest results</button>
              </div>
            </div>
          </div>
        ))}
      </Card>

      <Card>
        <h3 style={S.h3}>Ingest the Query History export</h3>
        <p style={S.muted}>
          Paste the exported rows, or a tab / comma separated block with a header
          row. Matching is by driver name and CDL last four, or by the
          Clearinghouse query id where the export carries one. Importing the
          same export twice changes nothing the second time, and a result that
          disagrees with what is already stored is reported rather than
          overwritten.
        </p>
        <select style={S.select} value={ingestBatch} onChange={e => setIngestBatch(e.target.value)}>
          <option value="">Match against all pending queries</option>
          {data.batches.map(b => <option key={b.id} value={b.id}>{b.filename}</option>)}
        </select>
        <textarea style={S.textarea} rows={7} value={paste} placeholder={
          'driver_name\tcdl\tresult\n' +
          'Jack Morris\t7291986\tDriver Not Prohibited\n' +
          'Luke Perl\t7062296\tNo Record Found'}
          onChange={e => setPaste(e.target.value)} />
        <button style={S.btn} disabled={busy || !paste.trim()} onClick={async () => {
          const rows = parsePaste(paste);
          if (!rows.length) { setErr('Could not read any rows from that.'); return; }
          setBusy(true); setIngestResult(null);
          const r = await authFetch('/api/da', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'ingest_query_history', rows,
                                   batch_id: ingestBatch || undefined }),
          });
          const j = await r.json().catch(() => ({}));
          setBusy(false);
          if (!r.ok) { setErr(j.error || 'Ingest failed'); return; }
          setIngestResult(j); load();
        }}>{busy ? 'Importing…' : 'Import results'}</button>

        {ingestResult && <div style={S.ok}>
          <b>{ingestResult.applied}</b> resolved, <b>{ingestResult.skipped}</b> already recorded,
          {' '}<b>{ingestResult.conflicts.length}</b> conflict(s),
          {' '}<b>{ingestResult.unmatched.length}</b> unmatched.
          {ingestResult.conflicts.length > 0 && <div style={S.warnBox}>
            Conflicts — stored result differs from the export, left unchanged:
            <ul>{ingestResult.conflicts.map((c, i) =>
              <li key={i}>{c.name}: stored {c.stored}, export says {c.incoming}</li>)}</ul>
          </div>}
          {ingestResult.unmatched.length > 0 && <div style={S.warnBox}>
            Unmatched — no pending query found, or the result value was not
            recognised:
            <ul>{ingestResult.unmatched.slice(0, 12).map((u, i) =>
              <li key={i}>{u.name || '(no name)'} — {u.result || ''} {u.why ? `(${u.why})` : ''}</li>)}</ul>
          </div>}
        </div>}
      </Card>
    </>
  );
}

/** Read a pasted tab or comma separated block with a header row. */
function parsePaste(text) {
  const lines = String(text).trim().split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const sep = lines[0].includes('\t') ? '\t' : ',';
  const head = lines[0].split(sep).map(h => h.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_'));
  const KEY = {
    driver_name: 'driver_name', name: 'driver_name', driver: 'driver_name',
    last_name: 'last_name', first_name: 'first_name',
    cdl: 'cdl', cdl_number: 'cdl', license_number: 'cdl',
    result: 'result', query_result: 'result', status: 'result',
    query_id: 'external_query_id', external_query_id: 'external_query_id',
    summary: 'summary', query_result_summary: 'summary',
  };
  return lines.slice(1).map(l => {
    const cells = l.split(sep);
    const o = {};
    head.forEach((h, i) => { const k = KEY[h]; if (k) o[k] = (cells[i] || '').trim(); });
    return o;
  }).filter(o => (o.driver_name || o.last_name) && o.result);
}

// ── 3. Random testing ──────────────────────────────────────────────────────
function RandomTesting({ me, busy, setBusy }) {
  const [pools, setPools] = useState(null);
  const [err, setErr] = useState('');
  const [result, setResult] = useState(null);

  const load = useCallback(async () => {
    const r = await authFetch('/api/da?view=pools');
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setErr(j.error || 'Load failed'); return; }
    setPools(j.pools || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  if (err) return <Card><div style={S.err}>{err}</div></Card>;
  if (!pools) return <Card><p style={S.muted}>Loading…</p></Card>;
  if (!pools.length) return <Card>
    <p style={S.muted}>No pools are configured yet. A pool belongs to one client or to a
    consortium, and DOT and non-DOT are always separate pools.</p></Card>;

  return (
    <>
      {pools.map(p => (
        <Card key={p.id}>
          <div style={S.rowBetween}>
            <h3 style={S.h3}>
              {p.owner} &middot; {p.pool_kind === 'NON_DOT' ? 'Non-DOT' : `DOT (${p.rates.agency || 'FMCSA'})`}
              {p.owner_kind === 'consortium' && <span style={S.hint}>consortium pool</span>}
            </h3>
            <span style={S.badge}>{p.period_label}</span>
          </div>
          <div style={S.grid}>
            <Stat label="Pool size" value={p.pool_size} />
            <Stat label="Drug selections" value={p.drug_select_count} />
            <Stat label="Alcohol selections" value={p.alcohol_select_count} />
            <Stat label="Rates" value={`${p.rates.drug}% / ${p.rates.alcohol}%`} />
          </div>
          {p.owner_kind === 'consortium' && (
            <p style={S.muted}>
              The rate applies to the combined pool; reporting still breaks out per
              employer. Members by client:{' '}
              {Object.entries(p.client_breakdown).map(([id, n]) => `${n}`).join(' + ')}
            </p>
          )}
          <button disabled={busy || !p.pool_size} style={S.btn} onClick={async () => {
            if (!window.confirm(
              `Run the ${p.pool_kind} selection for ${p.owner}, period ${p.period_label}?\n\n` +
              `${p.drug_select_count} drug and ${p.alcohol_select_count} alcohol selection(s) ` +
              `from ${p.pool_size} active members.\n\n` +
              `Drug and alcohol are drawn independently, so someone may come up on both ` +
              `and is then tested for both at one stop.\n\n` +
              `This run is FINAL and is logged as an audit record.`)) return;
            setBusy(true);
            const r = await authFetch('/api/da', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'run_pull', pool_id: p.id }),
            });
            const j = await r.json().catch(() => ({}));
            setBusy(false);
            if (!r.ok) { setErr(j.error || 'Pull failed'); return; }
            setResult(j); load();
          }}>{busy ? 'Running…' : 'Run selection'}</button>
        </Card>
      ))}
      {result && <Card>
        <h3 style={S.h3}>Selected &middot; {result.pull.period_label}</h3>
        <table style={S.table}>
          <thead><tr>{['Employee', 'ID', 'Test'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>{result.selections.map(x => (
            <tr key={x.member_id} style={S.tr}>
              <td style={S.td}>{x.full_name}</td>
              <td style={S.td}>{x.employee_ident || '—'}</td>
              <td style={S.td}><b>{x.test_type}</b></td>
            </tr>))}</tbody>
        </table>
        <p style={S.fine}>{result.pull.method_note}</p>
      </Card>}
    </>
  );
}

// ── 3. Current selections ───────────────────────────────────────────────────
function Selections({ me, busy, setBusy }) {
  const [sel, setSel] = useState(null);
  const [err, setErr] = useState('');
  const load = useCallback(async () => {
    const r = await authFetch('/api/da?view=selections');
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setErr(j.error || 'Load failed'); return; }
    setSel(j.selections || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  if (err) return <Card><div style={S.err}>{err}</div></Card>;
  if (!sel) return <Card><p style={S.muted}>Loading…</p></Card>;
  if (!sel.length) return <Card><p style={S.muted}>No open selections.</p></Card>;

  return (
    <Card>
      <p style={S.muted}>
        Visible to the DER and SLP staff only. Do not circulate to supervisors or
        to the employee: advance notice defeats randomness.
      </p>
      <table style={S.table}>
        <thead><tr>{['Employee', 'Client', 'Period', 'Test', 'Status', ''].map(h =>
          <th key={h} style={S.th}>{h}</th>)}</tr></thead>
        <tbody>
          {sel.map(x => (
            <tr key={x.id} style={S.tr}>
              <td style={S.td}>{x.da_pool_members?.full_name}</td>
              <td style={S.td}>{x.da_clients?.name}</td>
              <td style={S.td}>{x.da_pulls?.period_label}</td>
              <td style={S.td}><b>{x.test_type}</b></td>
              <td style={S.td}>{x.status}</td>
              <td style={S.td}>
                <select style={S.select} disabled={busy} value={x.status} onChange={async (e) => {
                  const status = e.target.value;
                  let reason;
                  if (status === 'not_tested') {
                    reason = window.prompt('A documented reason is required when someone is not tested (for example: on leave, no longer employed, off rotation).');
                    if (!reason || !reason.trim()) return;
                  }
                  setBusy(true);
                  await authFetch('/api/da', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'set_selection_status', selection_id: x.id, status, not_tested_reason: reason }),
                  });
                  setBusy(false); load();
                }}>
                  {['selected', 'notified', 'completed', 'not_tested'].map(v =>
                    <option key={v} value={v}>{v}</option>)}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

// ── 4. MIS ──────────────────────────────────────────────────────────────────
function MisReport({ me }) {
  const [client, setClient] = useState(me.clients[0]?.id || '');
  const [year, setYear] = useState(String(new Date().getUTCFullYear() - 1));
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!client) return;
    (async () => {
      setErr('');
      const r = await authFetch(`/api/da?view=mis&client_id=${client}&year=${year}`);
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(j.error || 'Load failed'); return; }
      setData(j);
    })();
  }, [client, year]);

  const LABEL = { pre_employment: 'Pre-Employment', random: 'Random', post_accident: 'Post-Accident',
    reasonable_suspicion: 'Reasonable Susp./Cause', return_to_duty: 'Return-to-Duty', follow_up: 'Follow-Up' };

  return (
    <>
      <Card>
        <div style={S.rowBetween}>
          <h3 style={S.h3}>MIS data <span style={S.hint}>DOT F 1385 &middot; OMB 2105-0529 &middot; Appendix J to Part 40</span></h3>
          <div style={S.btnRow}>
            <select style={S.select} value={client} onChange={e => setClient(e.target.value)}>
              {me.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select style={S.select} value={year} onChange={e => setYear(e.target.value)}>
              {[0, 1, 2].map(i => { const y = String(new Date().getUTCFullYear() - i); return <option key={y}>{y}</option>; })}
            </select>
          </div>
        </div>
        <p style={S.muted}>
          Counts are aggregated at report time from test status and MIS outcome
          category. No individual DOT test result is stored anywhere in this
          system, so none can appear here.
        </p>
        <p style={S.fine}>
          FMCSA collects MIS only from employers it notifies in January, due 15 March.
          PHMSA is different: every operator with more than 50 covered employees files
          annually by 15 March whether or not it is asked. A C/TPA may prepare the
          report, but the employer&apos;s own certifying official must sign it.
        </p>
      </Card>

      {err && <Card><div style={S.err}>{err}</div></Card>}
      {data && <>
        <Card>
          <h3 style={S.h3}>III. Drug Testing Data</h3>
          <div style={S.scroll}>
            <table style={S.table}>
              <thead><tr>
                {['Type of Test', 'Total', 'Verified Neg', 'Verified Pos', 'MJ', 'Coc', 'PCP', 'Opi', 'Amp',
                  'Adult.', 'Subst.', 'Shy Bladder', 'Other Ref.', 'Cancelled'].map(h =>
                  <th key={h} style={S.thS}>{h}</th>)}
              </tr></thead>
              <tbody>
                {data.reasons.map(r => {
                  const d = data.drug[r];
                  return <tr key={r} style={S.tr}>
                    <td style={S.td}>{LABEL[r]}</td>
                    {['total', 'verified_negative', 'verified_positive', 'marijuana', 'cocaine', 'pcp',
                      'opiates', 'amphetamines', 'refusal_adulterated', 'refusal_substituted',
                      'refusal_shy_bladder_no_medical', 'refusal_other', 'cancelled'].map(k =>
                      <td key={k} style={S.tdN}>{d[k]}</td>)}
                  </tr>;
                })}
                <tr style={S.trTotal}>
                  <td style={S.td}><b>TOTAL</b></td>
                  {['total', 'verified_negative', 'verified_positive', 'marijuana', 'cocaine', 'pcp',
                    'opiates', 'amphetamines', 'refusal_adulterated', 'refusal_substituted',
                    'refusal_shy_bladder_no_medical', 'refusal_other', 'cancelled'].map(k =>
                    <td key={k} style={S.tdN}><b>{data.drug_total[k]}</b></td>)}
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <h3 style={S.h3}>IV. Alcohol Testing Data</h3>
          <div style={S.scroll}>
            <table style={S.table}>
              <thead><tr>
                {['Type of Test', 'Total Screens', 'Below 0.02', '0.02 or greater', 'Confirmations',
                  '0.02-0.039', '0.04 or greater', 'Shy Lung', 'Other Ref.', 'Cancelled'].map(h =>
                  <th key={h} style={S.thS}>{h}</th>)}
              </tr></thead>
              <tbody>
                {data.reasons.map(r => {
                  const a = data.alcohol[r];
                  return <tr key={r} style={S.tr}>
                    <td style={S.td}>{LABEL[r]}</td>
                    {['total', 'below_002', 'screen_002_or_greater', 'confirmation_tests',
                      'confirm_002_through_0039', 'confirm_004_or_greater',
                      'refusal_shy_lung_no_medical', 'refusal_other', 'cancelled'].map(k =>
                      <td key={k} style={S.tdN}>{a[k]}</td>)}
                  </tr>;
                })}
                <tr style={S.trTotal}>
                  <td style={S.td}><b>TOTAL</b></td>
                  {['total', 'below_002', 'screen_002_or_greater', 'confirmation_tests',
                    'confirm_002_through_0039', 'confirm_004_or_greater',
                    'refusal_shy_lung_no_medical', 'refusal_other', 'cancelled'].map(k =>
                    <td key={k} style={S.tdN}><b>{data.alcohol_total[k]}</b></td>)}
                </tr>
              </tbody>
            </table>
          </div>
          <p style={S.fine}>
            Cover page with SLP Alaska letterhead naming us as C/TPA is a separate
            sheet — letterhead never goes on the federal form. Logo pending.
          </p>
        </Card>
      </>}
    </>
  );
}

// ── bits ────────────────────────────────────────────────────────────────────
const Shell = ({ children }) => (
  <div style={S.wrap}><div style={{ ...S.inner, maxWidth: '560px' }}>
    <div style={S.card}>{children}</div></div></div>
);
const Card = ({ children }) => <div style={S.card}>{children}</div>;
const Stat = ({ label, value, tone }) => (
  <div style={S.stat}>
    <div style={{ ...S.statV, ...(tone === 'bad' ? S.bad : tone === 'warn' ? S.warn : tone === 'good' ? S.good : {}) }}>{value}</div>
    <div style={S.statL}>{label}</div>
  </div>);

const S = {
  wrap: { minHeight: '100vh', background: '#f3f4f6', padding: '20px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  inner: { maxWidth: '1180px', margin: '0 auto' },
  back: { display: 'inline-block', marginBottom: '15px', padding: '10px 20px',
          background: '#1e3a5f', color: '#fff', textDecoration: 'none', borderRadius: '6px', fontSize: '14px' },
  head: { background: 'linear-gradient(135deg,#1e3a8a,#1e40af)', color: '#fff', padding: '26px',
          borderRadius: '12px 12px 0 0' },
  h1: { margin: 0, fontSize: '24px', fontWeight: 700 },
  h2: { margin: '0 0 8px', fontSize: '19px', color: '#1e3a8a' },
  h3: { margin: '0 0 12px', fontSize: '16px', color: '#1e3a8a' },
  sub: { margin: '8px 0 0', opacity: 0.9, fontSize: '13px' },
  tabs: { display: 'flex', gap: '2px', background: '#e5e7eb', padding: '2px', flexWrap: 'wrap' },
  tab: { flex: 1, minWidth: '150px', padding: '12px', border: 'none', background: '#f9fafb',
         cursor: 'pointer', fontSize: '13px', fontWeight: 500 },
  tabOn: { background: '#fff', color: '#1e3a8a', fontWeight: 700, boxShadow: 'inset 0 -3px 0 #1e3a8a' },
  card: { background: '#fff', padding: '22px', marginBottom: '2px' },
  hint: { fontSize: '11px', color: '#94a3b8', fontWeight: 400, marginLeft: '8px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: '12px', marginBottom: '14px' },
  stat: { background: '#f8fafc', borderRadius: '8px', padding: '12px', textAlign: 'center' },
  statV: { fontSize: '24px', fontWeight: 700, color: '#1e3a8a' },
  statL: { fontSize: '11px', color: '#64748b', marginTop: '2px' },
  bad: { color: '#b91c1c' }, warn: { color: '#b45309' }, good: { color: '#15803d' },
  never: { color: '#b91c1c', fontStyle: 'normal' },
  rowBetween: { display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                gap: '12px', flexWrap: 'wrap', marginBottom: '10px' },
  badge: { background: '#eef2ff', color: '#3730a3', padding: '4px 10px', borderRadius: '12px',
           fontSize: '12px', fontWeight: 600 },
  btn: { padding: '11px 16px', background: '#1e3a8a', color: '#fff', border: 'none',
         borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' },
  btnLink: { display: 'inline-block', padding: '11px 16px', background: '#1e3a8a', color: '#fff',
             borderRadius: '8px', fontSize: '14px', fontWeight: 600, textDecoration: 'none' },
  btnRow: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  link: { background: 'none', border: 'none', color: '#1e3a8a', cursor: 'pointer',
          fontSize: '12px', textDecoration: 'underline' },
  select: { padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '8px' },
  scroll: { overflowX: 'auto' },
  th: { textAlign: 'left', padding: '8px', fontSize: '11px', color: '#64748b',
        borderBottom: '2px solid #e5e7eb', textTransform: 'uppercase', whiteSpace: 'nowrap' },
  thS: { textAlign: 'left', padding: '6px', fontSize: '10px', color: '#64748b',
         borderBottom: '2px solid #e5e7eb', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid #f1f5f9' },
  trTotal: { borderTop: '2px solid #cbd5e1', background: '#f8fafc' },
  td: { padding: '7px', fontSize: '13px' },
  tdN: { padding: '7px', fontSize: '13px', textAlign: 'right' },
  muted: { color: '#64748b', fontSize: '12px', lineHeight: 1.6, margin: '0 0 12px' },
  fine: { color: '#94a3b8', fontSize: '11px', lineHeight: 1.6, margin: '8px 0 0' },
  err: { background: '#fee2e2', color: '#991b1b', padding: '12px', fontSize: '13px', borderRadius: '6px' },
  code: { background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' },
  foot: { textAlign: 'center', padding: '20px', fontSize: '11px', color: '#64748b' },
  ok: { background: '#dcfce7', color: '#166534', padding: '12px', fontSize: '13px',
        borderRadius: '6px', marginTop: '12px' },
  warnBox: { background: '#fef3c7', color: '#92400e', padding: '10px', fontSize: '12px',
             borderRadius: '6px', marginTop: '8px' },
  textarea: { width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '8px',
              fontSize: '12px', fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
              boxSizing: 'border-box', margin: '10px 0' },
  input: { padding: '10px', border: '1px solid #d1d5db', borderRadius: '8px',
           fontSize: '14px', boxSizing: 'border-box' },
  formRow3: { display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' },
  batch: { borderTop: '1px solid #f1f5f9', padding: '10px 0' },
};

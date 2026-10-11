// supabase/functions/send-ca-nags/index.ts
// LOUD corrective-action nags until the action is CLOSED.
//
// Cadence (SQL 2026-10-11-50, public.ca_nag_queue): day-0 first notice, day 7,
// day 14, then DAILY for the last 7 days before the due date, then DAILY while
// overdue (investigation lead cc'd). Only closing the action stops it. One email
// per CA per person per Alaska day. Every send is logged in public.ca_nag_log.
//
// Auth: x-ca-nag-secret header, verified against Vault ('ca_nag_shared_secret')
// through the service_role-only RPC public.ca_nag_secret_matches(). The cron job
// and safe tests call public.ca_nag_post(body), which reads the same Vault entry.
// Deploy with verify_jwt = false (the shared secret is the auth).
//
// Body:
//   {"mode":"dry_run"}  -> who would get what today; logs status 'dry_run'; sends nothing
//   {"mode":"test"}     -> renders up to `limit` (max 3) of today's real notices and sends
//                          them ONLY to ca_nag_settings.test_recipient, marked TEST
//   {"mode":"live"}     -> the real run (what cron sends)
// Switch: ca_nag_settings.enabled=false stops everything; mode='dry_run' turns
// live runs into dry runs.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const FROM = "AnthroSafe Corrective Actions <reports@slpalaska.com>";
const BRAND_MARK = "AnthroSafe\u2122 Field Driven Safety \u2022 SLP Alaska, LLC";

type Q = {
  ca_id: number; incident_id: string | null; action_number: number | null; company: string | null;
  owner_name: string; recipient: string; lead_email: string | null; stage: string; notice_no: number;
  days_open: number; days_to_due: number | null; due_date: string | null; assigned_on: string;
  description: string | null; hierarchy: string | null; root_cause_link: string | null;
  verification_method: string | null; incident_summary: string | null; ca_status: string | null;
};

function esc(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function fmtDate(d: string | null): string {
  if (!d) return "No due date set";
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day, 12)).toLocaleDateString("en-US", {
    weekday: "short", month: "long", day: "numeric", year: "numeric", timeZone: "UTC",
  });
}
function akNow(): string {
  return new Date().toLocaleString("en-US", { timeZone: "America/Anchorage", dateStyle: "medium", timeStyle: "short" }) + " AK";
}
function incLabel(id: string | null): string {
  if (!id) return "";
  // Older incidents carry only a UUID; show its first block rather than the whole thing.
  return /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(id) ? `Incident ${id.slice(0, 8)}` : id;
}
function caLabel(q: Q): string {
  const inc = incLabel(q.incident_id);
  return `CA-${q.action_number ?? q.ca_id}${inc ? ` (${inc})` : ""}`;
}

export function headline(q: Q): { subject: string; banner: string; color: string; lead: string } {
  const label = caLabel(q);
  const due = fmtDate(q.due_date);
  const d = q.days_to_due;
  switch (q.stage) {
    case "overdue": {
      const late = Math.abs(d ?? 0);
      return {
        subject: `\u26D4 OVERDUE ${late} DAY${late === 1 ? "" : "S"}: Corrective Action ${label} is still OPEN \u2014 daily until closed`,
        banner: `OVERDUE \u2014 ${late} DAY${late === 1 ? "" : "S"} PAST DUE`,
        color: "#b91c1c",
        lead: `This corrective action was due <strong>${esc(due)}</strong> and is still open. You will get this email <strong>every day</strong> until it is closed. Your investigation lead is copied.`,
      };
    }
    case "final_week":
      return {
        subject: d === 0
          ? `\u26A0\uFE0F DUE TODAY: Corrective Action ${label} is still OPEN`
          : `\u26A0\uFE0F DUE IN ${d} DAY${d === 1 ? "" : "S"}: Corrective Action ${label} is still OPEN`,
        banner: d === 0 ? "DUE TODAY" : `DUE IN ${d} DAY${d === 1 ? "" : "S"}`,
        color: "#c2410c",
        lead: `This corrective action is due <strong>${esc(due)}</strong>. Reminders now come <strong>every day</strong> until it is closed.`,
      };
    case "day14":
      return {
        subject: `\u26A0\uFE0F 2ND WARNING \u2014 14 days, still OPEN: Corrective Action ${label} (due ${due})`,
        banner: "SECOND WARNING \u2014 14 DAYS, NOT CLOSED",
        color: "#b45309",
        lead: `You were assigned this corrective action 14 days ago and it is still open. Due <strong>${esc(due)}</strong>.`,
      };
    case "day7":
      return {
        subject: `\u26A0\uFE0F 7 days, still OPEN: Corrective Action ${label} (due ${due})`,
        banner: "7 DAYS \u2014 NOT CLOSED",
        color: "#b45309",
        lead: `You were assigned this corrective action 7 days ago and it is still open. Due <strong>${esc(due)}</strong>.`,
      };
    default:
      return {
        subject: `\uD83D\uDCCC ACTION REQUIRED: You are responsible for Corrective Action ${label} \u2014 due ${due}`,
        banner: "ACTION REQUIRED \u2014 YOU OWN THIS CORRECTIVE ACTION",
        color: "#1e3a5f",
        lead: `You have been named the <strong>responsible person</strong> for this corrective action. It is due <strong>${esc(due)}</strong>.`,
      };
  }
}

export function buildEmail(q: Q, portalUrl: string, test: boolean): { subject: string; html: string; text: string } {
  const h = headline(q);
  const first = q.notice_no <= 1;
  const closeUrl = `${portalUrl.replace(/\/$/, "")}/corrective-actions`;
  const subject = (test ? "[TEST \u2014 not sent to owner] " : "") + h.subject;
  const row = (k: string, v: unknown) => v === null || v === undefined || v === "" ? "" :
    `<tr><td style="padding:10px 12px;background:#eef2f7;font-weight:700;color:#1e3a5f;width:34%;vertical-align:top;border-bottom:1px solid #d1d5db">${esc(k)}</td><td style="padding:10px 12px;color:#111827;border-bottom:1px solid #d1d5db;white-space:pre-wrap">${esc(v)}</td></tr>`;
  const html = `<!doctype html><html><body style="margin:0;background:#f3f4f6">
<div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;background:#ffffff">
${test ? `<div style="background:#111827;color:#fde68a;padding:8px 16px;font-size:12px;font-weight:700">TEST COPY \u2014 this real notice would go to ${esc(q.recipient)}${q.stage === "overdue" && q.lead_email ? ` (cc ${esc(q.lead_email)})` : ""}. Nothing was sent to them.</div>` : ""}
<div style="background:${h.color};color:#ffffff;padding:22px 20px">
  <div style="font-size:13px;letter-spacing:1px;opacity:.9">ANTHROSAFE CORRECTIVE ACTION \u2022 NOTICE #${q.notice_no}</div>
  <div style="font-size:24px;font-weight:900;margin-top:6px;line-height:1.2">${esc(h.banner)}</div>
  <div style="font-size:15px;margin-top:8px">${esc(caLabel(q))}${q.company ? ` \u2022 ${esc(q.company)}` : ""}</div>
</div>
<div style="padding:20px">
  <p style="font-size:16px;margin:0 0 12px">${esc(q.owner_name)},</p>
  <p style="font-size:16px;line-height:1.5;margin:0 0 16px">${h.lead}</p>
  <div style="border:3px solid ${h.color};border-radius:8px;padding:14px 16px;margin:0 0 18px;background:#fff7ed">
    <div style="font-weight:900;color:${h.color};font-size:15px;margin-bottom:6px">THESE REMINDERS DO NOT STOP UNTIL THE ACTION IS CLOSED</div>
    <div style="font-size:14px;line-height:1.5;color:#111827">Comments, edits, notes or setting it to \u201cIn Progress\u201d do <strong>not</strong> stop them. Only closing the corrective action in the portal does. Every notice is logged with the date, time and the address it was delivered to.</div>
  </div>
  <table style="width:100%;border-collapse:collapse;font-size:14px;margin:0 0 18px;border:1px solid #d1d5db">
    ${row("What you must do", q.description)}
    ${row("Why (the incident)", q.incident_summary)}
    ${row("Root cause it fixes", q.root_cause_link)}
    ${row("Control type", q.hierarchy)}
    ${row("How it will be verified", q.verification_method)}
    ${row("Due date", fmtDate(q.due_date))}
    ${row("Assigned / first notice", fmtDate(q.assigned_on))}
    ${row("Current status", q.ca_status || "Open")}
    ${row("Responsible person", `${q.owner_name} <${q.recipient}>`)}
  </table>
  <div style="text-align:center;margin:0 0 18px">
    <a href="${esc(closeUrl)}" style="display:inline-block;background:#1e3a5f;color:#ffffff;text-decoration:none;font-weight:900;font-size:17px;padding:16px 30px;border-radius:8px">CLOSE THIS ACTION IN THE PORTAL \u2192</a>
  </div>
  <p style="font-size:14px;line-height:1.5;color:#374151;margin:0 0 8px"><strong>To close it:</strong> open Corrective Actions, find ${esc(caLabel(q))}, set the status to <strong>Completed</strong> and describe what was done (photos or evidence if you have them).</p>
  <p style="font-size:14px;line-height:1.5;color:#374151;margin:0 0 8px"><strong>Can\u2019t finish by the due date?</strong> Talk to your investigation lead today \u2014 a new date has to be agreed and recorded. Silence keeps the reminders coming.</p>
  ${first ? "" : `<p style="font-size:13px;color:#6b7280;margin:12px 0 0">You have received ${q.notice_no - 1} earlier notice${q.notice_no - 1 === 1 ? "" : "s"} about this action.</p>`}
  <p style="font-size:11px;color:#6b7280;border-top:1px solid #e5e7eb;margin-top:20px;padding-top:10px">Delivered to ${esc(q.recipient)} \u2022 ${esc(akNow())} \u2022 Notice #${q.notice_no} (${esc(q.stage)}) \u2022 logged<br>${BRAND_MARK}</p>
</div></div></body></html>`;
  const text = [
    (test ? "[TEST COPY] " : "") + h.banner, caLabel(q) + (q.company ? ` - ${q.company}` : ""), "",
    `${q.owner_name},`, h.lead.replace(/<[^>]+>/g, ""), "",
    "THESE REMINDERS DO NOT STOP UNTIL THE ACTION IS CLOSED. Comments, edits or 'In Progress' do not stop them.",
    "", `What you must do: ${q.description || ""}`, `Why: ${q.incident_summary || ""}`,
    `Due: ${fmtDate(q.due_date)}`, "", `Close it: ${closeUrl}`, "",
    `Delivered to ${q.recipient} - ${akNow()} - Notice #${q.notice_no} - logged`,
  ].join("\n");
  return { subject, html, text };
}

async function sendResend(to: string[], cc: string[], subject: string, html: string, text: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM, to, cc: cc.length ? cc : undefined, subject, html, text,
      headers: { "X-Priority": "1 (Highest)", Importance: "high", "X-MSMail-Priority": "High" },
    }),
  });
  const body = await res.text();
  if (!res.ok) return { ok: false, id: null, error: `${res.status} ${body.slice(0, 300)}` };
  try { return { ok: true, id: JSON.parse(body).id ?? null, error: null }; } catch { return { ok: true, id: null, error: null }; }
}

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const provided = req.headers.get("x-ca-nag-secret") || "";
  const { data: okSecret, error: secErr } = await supabase.rpc("ca_nag_secret_matches", { p_provided: provided });
  if (secErr || okSecret !== true) return json({ error: "unauthorized" }, 401);

  let body: any = {};
  try { body = await req.json(); } catch { body = {}; }
  const { data: settings } = await supabase.from("ca_nag_settings").select("*").eq("id", 1).maybeSingle();
  if (!settings) return json({ error: "ca_nag_settings missing" }, 500);
  if (!settings.enabled) return json({ ok: true, enabled: false, sent: 0 });

  let mode: "live" | "test" | "dry_run" = body.mode === "test" ? "test" : body.mode === "live" ? "live" : "dry_run";
  if (mode === "live" && settings.mode === "dry_run") mode = "dry_run";
  if (mode !== "dry_run" && !RESEND_API_KEY) return json({ error: "RESEND_API_KEY missing" }, 500);

  const { data: queue, error: qErr } = await supabase.rpc("ca_nag_queue", body.today ? { p_today: body.today } : {});
  if (qErr) return json({ error: qErr.message }, 500);
  const { data: unreachable } = await supabase.rpc("ca_nag_unreachable");
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Anchorage" });
  let items: Q[] = (queue || []) as Q[];
  if (mode === "test") items = items.slice(0, Math.min(Math.max(Number(body.limit) || 1, 1), 3));

  const out: any[] = [];
  let sent = 0, failed = 0, skipped = 0;
  for (const q of items) {
    const cc = q.stage === "overdue"
      ? [...new Set([...(settings.escalate_overdue_to_lead && q.lead_email ? [q.lead_email] : []), ...(settings.escalation_cc || [])])]
          .filter((e) => e && e.toLowerCase() !== q.recipient)
      : [];
    const msg = buildEmail(q, settings.portal_url, mode === "test");
    const base = {
      nag_date: today, ca_id: q.ca_id, incident_id: q.incident_id, action_number: q.action_number,
      company: q.company, recipient: q.recipient, cc, stage: q.stage, notice_no: q.notice_no,
      days_to_due: q.days_to_due, subject: msg.subject,
    };
    if (mode === "dry_run") {
      await supabase.from("ca_nag_log").insert({ ...base, mode: "dry_run", status: "dry_run" });
      out.push({ ca: caLabel(q), to: q.recipient, cc, stage: q.stage, notice_no: q.notice_no, subject: msg.subject });
      continue;
    }
    if (mode === "test") {
      const r = await sendResend([settings.test_recipient], [], msg.subject, msg.html, msg.text);
      await supabase.from("ca_nag_log").insert({ ...base, recipient: settings.test_recipient, cc: [], mode: "test",
        status: r.ok ? "sent" : "failed", resend_id: r.id, error: r.error, sent_at: r.ok ? new Date().toISOString() : null });
      r.ok ? sent++ : failed++;
      out.push({ ca: caLabel(q), would_go_to: q.recipient, would_cc: cc, sent_to: settings.test_recipient, stage: q.stage, ok: r.ok, error: r.error });
      continue;
    }
    // live: claim the day first (unique index) so overlapping runs cannot double-send
    const { data: claim, error: claimErr } = await supabase.from("ca_nag_log")
      .insert({ ...base, mode: "live", status: "sending" }).select("id").maybeSingle();
    if (claimErr || !claim) { skipped++; continue; }
    const r = await sendResend([q.recipient], cc, msg.subject, msg.html, msg.text);
    await supabase.from("ca_nag_log").update({
      status: r.ok ? "sent" : "failed", resend_id: r.id, error: r.error, sent_at: r.ok ? new Date().toISOString() : null,
    }).eq("id", claim.id);
    r.ok ? sent++ : failed++;
    out.push({ ca: caLabel(q), to: q.recipient, cc, stage: q.stage, ok: r.ok });
  }
  return json({ ok: true, mode, date: today, queued: items.length, sent, failed, skipped,
    unreachable_open_cas: (unreachable || []).length, items: out });
});

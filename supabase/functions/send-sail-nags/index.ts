// supabase/functions/send-sail-nags/index.ts
// LOUD SAIL action-item nags until the item is CLOSED. Mirrors send-ca-nags.
//
// Cadence (SQL 2026-10-11-52, public.sail_nag_queue): day-0 first notice, day 7,
// day 14, then DAILY for the last 7 days before the target date, then DAILY while
// overdue. Only status Closed stops it (Open / In Progress / Delayed / Pending
// Verification keep going). One email per item per person per Alaska day. Every
// send is logged in public.sail_nag_log.
//
// Auth: x-sail-nag-secret header, verified against Vault ('sail_nag_shared_secret')
// through the service_role-only RPC public.sail_nag_secret_matches(). The cron job
// and safe tests call public.sail_nag_post(body), which reads the same Vault entry.
// Deploy with verify_jwt = false (the shared secret is the auth).
//
// Body:
//   {"mode":"dry_run"}  -> who would get what today; logs status 'dry_run'; sends nothing
//   {"mode":"test"}     -> renders up to `limit` (max 3) of today's real notices and sends
//                          them ONLY to sail_nag_settings.test_recipient, marked TEST
//   {"mode":"live"}     -> the real run (what cron sends)
// Switch: sail_nag_settings.enabled=false stops everything; mode='dry_run' turns
// live runs into dry runs.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const FROM = "AnthroSafe SAIL Action Items <reports@slpalaska.com>";
const BRAND_MARK = "AnthroSafe\u2122 Field Driven Safety \u2022 SLP Alaska, LLC";

type Q = {
  sail_id: string; company: string | null; location: string | null; owner_name: string;
  recipient: string; stage: string; notice_no: number; days_open: number;
  days_to_due: number | null; due_date: string | null; opened_on: string | null;
  assigned_on: string; description: string | null; immediate_action: string | null;
  priority: string | null; category: string | null; hierarchy: string | null;
  submitter: string | null; sail_status: string | null; source: string | null;
};

function esc(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function fmtDate(d: string | null): string {
  if (!d) return "No target date set";
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day, 12)).toLocaleDateString("en-US", {
    weekday: "short", month: "long", day: "numeric", year: "numeric", timeZone: "UTC",
  });
}
function akNow(): string {
  return new Date().toLocaleString("en-US", { timeZone: "America/Anchorage", dateStyle: "medium", timeStyle: "short" }) + " AK";
}
function short(s: string | null, n: number): string {
  const t = (s || "").replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n - 1).trimEnd() + "\u2026" : t;
}
export function itemLabel(q: Q): string {
  return `SAIL-${q.sail_id.slice(0, 8).toUpperCase()}`;
}
function what(q: Q): string {
  return short(q.description, 60) || "action item";
}

export function headline(q: Q): { subject: string; banner: string; color: string; lead: string } {
  const label = itemLabel(q);
  const due = fmtDate(q.due_date);
  const d = q.days_to_due;
  const first = q.notice_no <= 1
    ? " You are getting this because you are named as the person responsible for this SAIL item."
    : "";
  switch (q.stage) {
    case "overdue": {
      const late = Math.abs(d ?? 0);
      return {
        subject: `\u26D4 OVERDUE ${late} DAY${late === 1 ? "" : "S"}: SAIL item ${label} is still OPEN \u2014 daily until closed \u2014 ${what(q)}`,
        banner: `OVERDUE \u2014 ${late} DAY${late === 1 ? "" : "S"} PAST TARGET DATE`,
        color: "#b91c1c",
        lead: `This SAIL action item was due <strong>${esc(due)}</strong> and is still open.${first} You will get this email <strong>every day</strong> until it is closed.`,
      };
    }
    case "final_week":
      return {
        subject: d === 0
          ? `\u26A0\uFE0F DUE TODAY: SAIL item ${label} is still OPEN \u2014 ${what(q)}`
          : `\u26A0\uFE0F DUE IN ${d} DAY${d === 1 ? "" : "S"}: SAIL item ${label} is still OPEN \u2014 ${what(q)}`,
        banner: d === 0 ? "DUE TODAY" : `DUE IN ${d} DAY${d === 1 ? "" : "S"}`,
        color: "#c2410c",
        lead: `This SAIL action item is due <strong>${esc(due)}</strong>.${first} Reminders now come <strong>every day</strong> until it is closed.`,
      };
    case "day14":
      return {
        subject: `\u26A0\uFE0F 2ND WARNING \u2014 14 days, still OPEN: SAIL item ${label} (due ${due}) \u2014 ${what(q)}`,
        banner: "SECOND WARNING \u2014 14 DAYS, NOT CLOSED",
        color: "#b45309",
        lead: `You were assigned this SAIL action item 14 days ago and it is still open. Due <strong>${esc(due)}</strong>.`,
      };
    case "day7":
      return {
        subject: `\u26A0\uFE0F 7 days, still OPEN: SAIL item ${label} (due ${due}) \u2014 ${what(q)}`,
        banner: "7 DAYS \u2014 NOT CLOSED",
        color: "#b45309",
        lead: `You were assigned this SAIL action item 7 days ago and it is still open. Due <strong>${esc(due)}</strong>.`,
      };
    default:
      return {
        subject: `\uD83D\uDCCC ACTION REQUIRED: You are responsible for SAIL item ${label} \u2014 due ${due} \u2014 ${what(q)}`,
        banner: "ACTION REQUIRED \u2014 YOU OWN THIS SAIL ITEM",
        color: "#1e3a5f",
        lead: `You have been named the <strong>responsible person</strong> for this Safety Action Item (SAIL). It is due <strong>${esc(due)}</strong>.`,
      };
  }
}

export function buildEmail(q: Q, portalUrl: string, test: boolean, cc: string[]): { subject: string; html: string; text: string } {
  const h = headline(q);
  const first = q.notice_no <= 1;
  const closeUrl = `${portalUrl.replace(/\/$/, "")}/sail-management`;
  const subject = (test ? "[TEST \u2014 not sent to owner] " : "") + h.subject;
  const row = (k: string, v: unknown) => v === null || v === undefined || v === "" ? "" :
    `<tr><td style="padding:10px 12px;background:#eef2f7;font-weight:700;color:#1e3a5f;width:34%;vertical-align:top;border-bottom:1px solid #d1d5db">${esc(k)}</td><td style="padding:10px 12px;color:#111827;border-bottom:1px solid #d1d5db;white-space:pre-wrap">${esc(v)}</td></tr>`;
  const where = [q.company, q.location].filter(Boolean).join(" \u2022 ");
  const html = `<!doctype html><html><body style="margin:0;background:#f3f4f6">
<div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;background:#ffffff">
${test ? `<div style="background:#111827;color:#fde68a;padding:8px 16px;font-size:12px;font-weight:700">TEST COPY \u2014 this real notice would go to ${esc(q.recipient)}${cc.length ? ` (cc ${esc(cc.join(", "))})` : ""}. Nothing was sent to them.</div>` : ""}
<div style="background:${h.color};color:#ffffff;padding:22px 20px">
  <div style="font-size:13px;letter-spacing:1px;opacity:.9">ANTHROSAFE SAIL ACTION ITEM \u2022 NOTICE #${q.notice_no}</div>
  <div style="font-size:24px;font-weight:900;margin-top:6px;line-height:1.2">${esc(h.banner)}</div>
  <div style="font-size:15px;margin-top:8px">${esc(itemLabel(q))}${where ? ` \u2022 ${esc(where)}` : ""}</div>
</div>
<div style="padding:20px">
  <p style="font-size:16px;margin:0 0 12px">${esc(q.owner_name)},</p>
  <p style="font-size:16px;line-height:1.5;margin:0 0 16px">${h.lead}</p>
  <div style="border:3px solid ${h.color};border-radius:8px;padding:14px 16px;margin:0 0 18px;background:#fff7ed">
    <div style="font-weight:900;color:${h.color};font-size:15px;margin-bottom:6px">THESE REMINDERS DO NOT STOP UNTIL THE ITEM IS CLOSED</div>
    <div style="font-size:14px;line-height:1.5;color:#111827">Notes, edits, or setting it to \u201cIn Progress\u201d, \u201cDelayed\u201d or \u201cPending Verification\u201d do <strong>not</strong> stop them. Only setting the item to <strong>Closed</strong> in SAIL Log Management does. Every notice is logged with the date, time and the address it was delivered to.</div>
  </div>
  <table style="width:100%;border-collapse:collapse;font-size:14px;margin:0 0 18px;border:1px solid #d1d5db">
    ${row("What must be fixed", q.description)}
    ${row("Immediate action already taken", q.immediate_action)}
    ${row("Priority", q.priority)}
    ${row("Category", q.category)}
    ${row("Control type", q.hierarchy)}
    ${row("Company / location", where)}
    ${row("Raised by", q.submitter)}
    ${row("Source", q.source)}
    ${row("Opened", fmtDate(q.opened_on))}
    ${row("Target completion date", fmtDate(q.due_date))}
    ${row("Current status", q.sail_status || "Open")}
    ${row("Responsible person", `${q.owner_name} <${q.recipient}>`)}
  </table>
  <div style="text-align:center;margin:0 0 18px">
    <a href="${esc(closeUrl)}" style="display:inline-block;background:#1e3a5f;color:#ffffff;text-decoration:none;font-weight:900;font-size:17px;padding:16px 30px;border-radius:8px">CLOSE THIS ITEM IN THE PORTAL \u2192</a>
  </div>
  <p style="font-size:14px;line-height:1.5;color:#374151;margin:0 0 8px"><strong>To close it:</strong> open SAIL Log Management (enter your email, tap the sign-in link we send you), find the item, write what was done in the corrective action notes, and set the status to <strong>Closed</strong>.</p>
  <p style="font-size:14px;line-height:1.5;color:#374151;margin:0 0 8px"><strong>Can\u2019t finish by the target date?</strong> Get a new date agreed with whoever raised it${q.submitter ? ` (${esc(q.submitter)})` : ""} or your supervisor, and have it recorded on the item. <strong>Not yours?</strong> Have it reassigned \u2014 the new owner then gets their own first notice. Silence keeps the reminders coming.</p>
  ${first ? "" : `<p style="font-size:13px;color:#6b7280;margin:12px 0 0">You have received ${q.notice_no - 1} earlier notice${q.notice_no - 1 === 1 ? "" : "s"} about this item.</p>`}
  <p style="font-size:11px;color:#6b7280;border-top:1px solid #e5e7eb;margin-top:20px;padding-top:10px">Delivered to ${esc(q.recipient)} \u2022 ${esc(akNow())} \u2022 Notice #${q.notice_no} (${esc(q.stage)}) \u2022 logged<br>${BRAND_MARK}</p>
</div></div></body></html>`;
  const text = [
    (test ? "[TEST COPY] " : "") + h.banner, itemLabel(q) + (where ? ` - ${where}` : ""), "",
    `${q.owner_name},`, h.lead.replace(/<[^>]+>/g, ""), "",
    "THESE REMINDERS DO NOT STOP UNTIL THE ITEM IS CLOSED. Notes, edits, 'In Progress', 'Delayed' or 'Pending Verification' do not stop them.",
    "", `What must be fixed: ${q.description || ""}`, `Priority: ${q.priority || ""}`,
    `Target date: ${fmtDate(q.due_date)}`, "", `Close it: ${closeUrl}`, "",
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
  const provided = req.headers.get("x-sail-nag-secret") || "";
  const { data: okSecret, error: secErr } = await supabase.rpc("sail_nag_secret_matches", { p_provided: provided });
  if (secErr || okSecret !== true) return json({ error: "unauthorized" }, 401);

  let body: any = {};
  try { body = await req.json(); } catch { body = {}; }
  const { data: settings } = await supabase.from("sail_nag_settings").select("*").eq("id", 1).maybeSingle();
  if (!settings) return json({ error: "sail_nag_settings missing" }, 500);
  if (!settings.enabled) return json({ ok: true, enabled: false, sent: 0 });

  let mode: "live" | "test" | "dry_run" = body.mode === "test" ? "test" : body.mode === "live" ? "live" : "dry_run";
  if (mode === "live" && settings.mode === "dry_run") mode = "dry_run";
  if (mode !== "dry_run" && !RESEND_API_KEY) return json({ error: "RESEND_API_KEY missing" }, 500);

  const { data: queue, error: qErr } = await supabase.rpc("sail_nag_queue", body.today ? { p_today: body.today } : {});
  if (qErr) return json({ error: qErr.message }, 500);
  const { data: unreachable } = await supabase.rpc("sail_nag_unreachable");
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Anchorage" });
  let items: Q[] = (queue || []) as Q[];
  if (mode === "test") items = items.slice(0, Math.min(Math.max(Number(body.limit) || 1, 1), 3));

  const out: any[] = [];
  let sent = 0, failed = 0, skipped = 0;
  for (const q of items) {
    const cc: string[] = q.stage === "overdue"
      ? [...new Set<string>((settings.escalation_cc || []).map((e: string) => (e || "").trim().toLowerCase()))]
          .filter((e) => e && e !== q.recipient)
      : [];
    const msg = buildEmail(q, settings.portal_url, mode === "test", cc);
    const base = {
      nag_date: today, sail_id: q.sail_id, company: q.company, recipient: q.recipient, cc,
      stage: q.stage, notice_no: q.notice_no, days_to_due: q.days_to_due, subject: msg.subject,
    };
    if (mode === "dry_run") {
      await supabase.from("sail_nag_log").insert({ ...base, mode: "dry_run", status: "dry_run" });
      out.push({ item: itemLabel(q), to: q.recipient, cc, stage: q.stage, notice_no: q.notice_no, subject: msg.subject });
      continue;
    }
    if (mode === "test") {
      const r = await sendResend([settings.test_recipient], [], msg.subject, msg.html, msg.text);
      await supabase.from("sail_nag_log").insert({ ...base, recipient: settings.test_recipient, cc: [], mode: "test",
        status: r.ok ? "sent" : "failed", resend_id: r.id, error: r.error, sent_at: r.ok ? new Date().toISOString() : null });
      r.ok ? sent++ : failed++;
      out.push({ item: itemLabel(q), would_go_to: q.recipient, would_cc: cc, sent_to: settings.test_recipient, stage: q.stage, ok: r.ok, error: r.error });
      continue;
    }
    // live: claim the day first (unique index) so overlapping runs cannot double-send
    const { data: claim, error: claimErr } = await supabase.from("sail_nag_log")
      .insert({ ...base, mode: "live", status: "sending" }).select("id").maybeSingle();
    if (claimErr || !claim) { skipped++; continue; }
    const r = await sendResend([q.recipient], cc, msg.subject, msg.html, msg.text);
    await supabase.from("sail_nag_log").update({
      status: r.ok ? "sent" : "failed", resend_id: r.id, error: r.error, sent_at: r.ok ? new Date().toISOString() : null,
    }).eq("id", claim.id);
    r.ok ? sent++ : failed++;
    out.push({ item: itemLabel(q), to: q.recipient, cc, stage: q.stage, ok: r.ok });
  }
  return json({ ok: true, mode, date: today, queued: items.length, sent, failed, skipped,
    unreachable_open_items: (unreachable || []).length, items: out });
});

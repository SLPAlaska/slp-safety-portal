// supabase/functions/send-incident-alert/index.ts
// Emails a copy of the initial incident report to the SLP team the moment
// an incident lands in the database with status 'Submitted'.
//
// Triggered by a Supabase Database Webhook on the `incidents` table
// (INSERT and UPDATE events). Sends only when:
//   - INSERT with status 'Submitted', or
//   - UPDATE where status changed TO 'Submitted' (draft conversion)
// Plain draft saves and later workflow updates never email.
//
// Secrets required (set via Supabase web UI -> Edge Functions -> Secrets):
//   RESEND_API_KEY          (already exists for send-weekly-reports)
//   INCIDENT_ALERT_SECRET   (new - must match the x-incident-alert-secret
//                            header configured on the webhook)
//
// Deploy: npx supabase functions deploy send-incident-alert --no-verify-jwt --project-ref iypezirwdlqpptjpeeyf

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// ============================================================================
// TEST MODE - while true, ALL emails go only to brian@slpalaska.com
// ============================================================================
const TEST_MODE = false;

const RECIPIENTS = [
  "brian@slpalaska.com",
  "ty@slpalaska.com",
  "mick@slpalaska.com",
  "todd@slpalaska.com",
  "daniel@slpalaska.com",
  "scott@slpalaska.com",
];

const FROM = "AnthroSafe Incident Alerts <reports@slpalaska.com>";
const DASHBOARD_URL = "https://portal.slpalaska.com/investigation-dashboard";
const LOGO_URL = "https://portal.slpalaska.com/AnthroSafe_Logo.PNG";
const BRAND_RED = "#D71919";
const BRAND_RED_DARK = "#A80A0A";
const BRAND_MARK =
  "AnthroSafe\u2122 Field Driven Safety \u2022 \u00A9 2026 SLP Alaska, LLC";

// ============================================================================
// Helpers
// ============================================================================

function esc(v: unknown): string {
  if (v === null || v === undefined || v === "") return "";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function row(label: string, value: unknown): string {
  const val = esc(value);
  if (!val) return "";
  return `<tr>
    <td style="padding:6px 12px;font-weight:600;color:#374151;vertical-align:top;white-space:nowrap;">${esc(label)}</td>
    <td style="padding:6px 12px;color:#111827;">${val}</td>
  </tr>`;
}

function section(title: string, rowsHtml: string): string {
  if (!rowsHtml.trim()) return "";
  return `<h3 style="margin:24px 0 8px;color:${BRAND_RED_DARK};border-bottom:2px solid ${BRAND_RED};padding-bottom:4px;font-size:15px;">${esc(title)}</h3>
  <table style="width:100%;border-collapse:collapse;font-size:14px;background:#f9fafb;border-radius:6px;">${rowsHtml}</table>`;
}

function yn(v: unknown): string {
  if (v === true) return "Yes";
  if (v === false) return "No";
  return "";
}

function buildEmail(inc: Record<string, unknown>): { subject: string; html: string } {
  const sifBadge = inc.is_sif
    ? `<span style="background:#1f2937;color:#fff;padding:2px 10px;border-radius:4px;font-weight:700;">SIF-ACTUAL</span>`
    : inc.is_sif_p
    ? `<span style="background:#dc2626;color:#fff;padding:2px 10px;border-radius:4px;font-weight:700;">SIF-POTENTIAL</span>`
    : "";

  const core = [
    row("Incident ID", inc.incident_id),
    row("Date", inc.incident_date),
    row("Time", inc.incident_time),
    row("Company", inc.company_name),
    row("Location", inc.location_name),
    row("Specific Location", inc.specific_location_onsite),
    row("Incident Types", inc.incident_types_text),
    row("Operation Type", inc.operation_type),
  ].join("");

  const reporter = [
    row("Reported By", inc.reported_by_name),
    row("Email", inc.reported_by_email),
    row("Phone", inc.reported_by_phone),
    row("Reporter's Company", inc.reported_by_company),
  ].join("");

  const description = [
    row("Brief Description", inc.brief_description),
    row("Detailed Description", inc.detailed_description),
    row("Immediate Actions Taken", inc.immediate_actions_taken),
    row("Suspected Root Causes", inc.suspected_root_causes),
    row("Witness Summary", inc.witness_statement_summary),
  ].join("");

  const classification = [
    row("Safety Severity", inc.safety_severity),
    row("Severity Description", inc.safety_severity_description),
    row("Potential Severity", inc.potential_safety_severity),
    row("PSIF Classification", inc.psif_classification),
    row("High Energy Present", yn(inc.high_energy_present)),
    row("Energy Types", inc.energy_types_text),
    row("Direct Controls", inc.direct_control_status),
    row("Investigation Type", inc.investigation_type),
    row("Investigation Deadline", inc.investigation_deadline),
  ].join("");

  const injury = inc.injury_occurred
    ? [
        row("Injured Person", inc.injured_person_name),
        row("Injured Person's Company", inc.injured_person_company),
        row("Position", inc.injured_person_position),
        row("Nature of Injury", inc.injury_nature),
        row("Treatment Provided", inc.treatment_provided),
        row("Supervisor", inc.supervisor_name),
        row("Short Service Employee", yn(inc.short_service_employee)),
      ].join("")
    : "";

  const environmental = inc.environmental_release
    ? [
        row("Material Released", inc.release_material),
        row(
          "Volume",
          inc.release_volume
            ? `${inc.release_volume} ${inc.release_volume_unit || ""}`
            : ""
        ),
        row("Release Location", inc.release_location_type),
        row("Environmental Severity", inc.environmental_severity),
        row("Contained", yn(inc.spill_contained)),
        row("Containment Method", inc.containment_method),
      ].join("")
    : "";

  const property = inc.property_damage
    ? [
        row("Damage Description", inc.property_damage_description),
        row(
          "Estimated Cost",
          inc.property_damage_cost ? `$${inc.property_damage_cost}` : ""
        ),
      ].join("")
    : "";

  const vehicle = inc.vehicle_incident
    ? [
        row("Vehicle Type", inc.vehicle_type),
        row("Vehicle ID", inc.vehicle_id),
        row("Damage", inc.vehicle_damage_description),
        row("Other Vehicle Involved", yn(inc.other_vehicle_involved)),
      ].join("")
    : "";

  const subject = `${TEST_MODE ? "[TEST] " : ""}New Incident Report: ${
    inc.incident_id
  } - ${inc.company_name || "Unknown Company"}${inc.is_sif ? " [SIF]" : inc.is_sif_p ? " [SIF-P]" : ""}`;

  const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:680px;margin:0 auto;background:#ffffff;">
    <div style="background:linear-gradient(135deg,#991b1b 0%,#c41e3a 100%);padding:20px 24px;">
      <img src="${LOGO_URL}" alt="AnthroSafe" style="height:48px;display:block;margin-bottom:8px;" />
      <h1 style="color:#ffffff;margin:0;font-size:20px;">New Incident Report Submitted</h1>
      <p style="color:#fecaca;margin:6px 0 0;font-size:13px;">Initial report only - investigation has not yet begun ${sifBadge}</p>
    </div>
    <div style="padding:24px;">
      ${section("Incident", core)}
      ${section("Reported By", reporter)}
      ${section("Description", description)}
      ${section("Classification", classification)}
      ${injury ? section("Injury", injury) : ""}
      ${environmental ? section("Environmental Release", environmental) : ""}
      ${property ? section("Property Damage", property) : ""}
      ${vehicle ? section("Vehicle", vehicle) : ""}
      <div style="text-align:center;margin:32px 0 16px;">
        <a href="${DASHBOARD_URL}" style="background:${BRAND_RED};color:#ffffff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:700;font-size:15px;">Open Investigation Dashboard</a>
      </div>
    </div>
    <div style="background:#111827;padding:16px 24px;text-align:center;">
      <p style="color:#9ca3af;margin:0;font-size:12px;">${BRAND_MARK}</p>
    </div>
  </div>
</body>
</html>`;

  return { subject, html };
}

// ============================================================================
// Handler
// ============================================================================

serve(async (req: Request) => {
  try {
    // Shared-secret check (webhook must send this header)
    const secret = Deno.env.get("INCIDENT_ALERT_SECRET");
    const provided = req.headers.get("x-incident-alert-secret");
    if (!secret || provided !== secret) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const payload = await req.json();
    const record = payload.record;
    const oldRecord = payload.old_record;
    const eventType = payload.type; // "INSERT" or "UPDATE"

    if (!record) {
      return new Response(JSON.stringify({ skipped: "no record" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Only fire when a report BECOMES Submitted:
    //   INSERT with status Submitted, or
    //   UPDATE where status changed to Submitted (draft conversion)
    const isNewSubmission =
      record.status === "Submitted" &&
      (eventType === "INSERT" ||
        (eventType === "UPDATE" && oldRecord?.status !== "Submitted"));

    if (!isNewSubmission) {
      return new Response(
        JSON.stringify({ skipped: `status=${record.status} event=${eventType}` }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not set" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const to = TEST_MODE ? ["brian@slpalaska.com"] : RECIPIENTS;
    const { subject, html } = buildEmail(record);

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    });

    const result = await resp.json();

    if (!resp.ok) {
      console.error("Resend error:", JSON.stringify(result));
      return new Response(JSON.stringify({ error: "resend failed", result }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log(
      `Incident alert sent for ${record.incident_id} to ${to.length} recipient(s). TEST_MODE=${TEST_MODE}`
    );
    return new Response(
      JSON.stringify({ sent: true, incident: record.incident_id, to }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-incident-alert error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

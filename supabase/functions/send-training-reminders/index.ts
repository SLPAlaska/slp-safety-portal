// ============================================================================
// supabase/functions/send-training-reminders/index.ts
//
// Weekly per-employee training reminder.
//
// For every active employee with an email address, computes their effective
// course list exactly the way app/api/lms/learner/courses/route.js does:
//
//     required courses for their company
//       minus lms_users.exempt_from_required   (all-courses exemption)
//       minus lms_required_exclusions          (per-course opt-out)
//       plus  lms_individual_assignments       (always apply)
//
// ...then emails anyone with something actionable. Three sections:
//
//   1. New Training Assigned — required rows / individual assignments created
//      in the last 7 days. Listed first and de-duplicated OUT of the other two
//      sections, so a course assigned two days ago reads as "new" rather than
//      scolding the employee for not having done it yet.
//   2. Overdue — refresher expired, or never completed at all.
//   3. Due Soon — expires within DUE_SOON_DAYS (90).
//
// Employees with all three sections empty are skipped entirely.
//
// Required Edge Function secrets:
//   - RESEND_API_KEY               (shared with send-weekly-reports)
//   - SUPABASE_URL                 (auto-provided)
//   - SUPABASE_SERVICE_ROLE_KEY    (auto-provided)
//
// Optional request body (POST JSON) for manual runs:
//   { "dry_run": true }            compute + return, send nothing
//   { "test_email": "a@b.com" }    route every email to one address
//   { "limit": 50, "offset": 0 }   process a slice (see WALL CLOCK below)
//
// WALL CLOCK: Edge Functions have a bounded execution time and Resend is rate
// limited, so this paces sends with SEND_DELAY_MS. A few hundred employees can
// exceed the limit in one invocation — use limit/offset to chunk, or schedule
// several offset runs. The response always reports `employeesConsidered`,
// `emailsSent` and `truncated` so a partial run is visible rather than silent.
// ============================================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

const SEND_DELAY_MS = 600;   // ~1.6/sec, under Resend's rate limit
const NEW_WINDOW_DAYS = 7;

// ============================================================================
// COURSE STATUS — port of app/lib/courseStatus.js
//
// Kept byte-for-byte equivalent in behavior. Edge Functions are bundled from
// this directory only and cannot import from app/lib, so if the shared helper's
// rules change, change them here too.
// ============================================================================
const DUE_SOON_DAYS = 90;

type Status = "current" | "due_soon" | "overdue" | "never";

function getCourseStatus(
  completedAt: string | null,
  refresherFrequencyMonths: number | null,
  now: Date,
): { status: Status; expiresAt: Date | null; daysUntilExpiry: number | null } {
  if (!completedAt) return { status: "never", expiresAt: null, daysUntilExpiry: null };

  const completed = new Date(completedAt);
  if (isNaN(completed.getTime())) {
    return { status: "never", expiresAt: null, daysUntilExpiry: null };
  }

  // One-time course — any completion is permanently current
  if (!refresherFrequencyMonths) {
    return { status: "current", expiresAt: null, daysUntilExpiry: null };
  }

  const expires = new Date(completed);
  expires.setMonth(expires.getMonth() + refresherFrequencyMonths);
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysUntilExpiry = Math.floor((expires.getTime() - now.getTime()) / msPerDay);

  let status: Status;
  if (daysUntilExpiry < 0) status = "overdue";
  else if (daysUntilExpiry <= DUE_SOON_DAYS) status = "due_soon";
  else status = "current";

  return { status, expiresAt: expires, daysUntilExpiry };
}

function formatFrequency(months: number | null): string {
  if (!months) return "One-time";
  if (months === 12) return "Annual";
  if (months === 24) return "2 years";
  if (months === 36) return "3 years";
  if (months === 60) return "5 years";
  return `${months} months`;
}

// ============================================================================
// EMAIL HTML
// ============================================================================
const COLORS = {
  slpBlue: "#1e3a5f",
  gold: "#fbbf24",
  overdue: { bg: "#fee2e2", fg: "#991b1b", border: "#fca5a5" },
  dueSoon: { bg: "#fef9c3", fg: "#854d0e", border: "#fde047" },
  newWork: { bg: "#e3f2fd", fg: "#0d47a1", border: "#90caf9" },
};

function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function fmtDate(d: Date | string | null): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

interface Item {
  title: string;
  refresher: number | null;
  note: string;
}

function section(heading: string, blurb: string, items: Item[], c: { bg: string; fg: string; border: string }): string {
  if (items.length === 0) return "";
  const rows = items.map((it) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">
        <div style="font-weight:600;color:#111827;">${esc(it.title)}</div>
        <div style="font-size:12px;color:#6b7280;margin-top:2px;">
          ${esc(it.note)} &middot; Refresher: ${esc(formatFrequency(it.refresher))}
        </div>
      </td>
    </tr>`).join("");

  return `
  <div style="margin:0 0 22px 0;">
    <div style="background:${c.bg};color:${c.fg};border:1px solid ${c.border};border-radius:8px 8px 0 0;padding:10px 12px;">
      <span style="font-weight:700;font-size:14px;">${esc(heading)} (${items.length})</span>
      <div style="font-size:12px;margin-top:2px;">${esc(blurb)}</div>
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
           style="border:1px solid ${c.border};border-top:none;border-radius:0 0 8px 8px;background:#ffffff;">
      ${rows}
    </table>
  </div>`;
}

function generateEmailHTML(
  employeeName: string,
  companyName: string,
  newItems: Item[],
  overdueItems: Item[],
  dueSoonItems: Item[],
): string {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0"
             style="width:600px;max-width:100%;background:#ffffff;border-radius:10px;overflow:hidden;">

        <tr><td style="background:${COLORS.slpBlue};padding:20px 24px;">
          <div style="color:#ffffff;font-size:18px;font-weight:700;">Your Training Summary</div>
          <div style="color:${COLORS.gold};font-size:13px;margin-top:4px;">
            ${esc(companyName)} &middot; SLP Alaska, LLC
          </div>
        </td></tr>

        <tr><td style="padding:24px;">
          <p style="margin:0 0 18px 0;font-size:14px;color:#374151;">
            Hi ${esc(employeeName)}, here is where your safety training stands this week.
          </p>

          ${section(
            "New Training Assigned",
            `Assigned in the last ${NEW_WINDOW_DAYS} days`,
            newItems, COLORS.newWork,
          )}
          ${section(
            "Overdue",
            "Past due or not yet completed — please complete these first",
            overdueItems, COLORS.overdue,
          )}
          ${section(
            "Due Soon",
            `Expiring within the next ${DUE_SOON_DAYS} days`,
            dueSoonItems, COLORS.dueSoon,
          )}

          <p style="margin:18px 0 0 0;font-size:13px;color:#6b7280;">
            Log in to the training portal to complete these courses. If you believe a
            course does not apply to you, contact your supervisor.
          </p>
        </td></tr>

        <tr><td style="background:${COLORS.slpBlue};padding:14px 24px;">
          <div style="color:#b9c4d4;font-size:11px;">
            SLP Alaska, LLC &middot; AnthroSafe&trade; Training Platform<br/>
            Safety isn't expensive, it's PRICELESS!
          </div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body></html>`;
}

// ============================================================================
// SEND VIA RESEND — same provider and sender as send-weekly-reports
// ============================================================================
async function sendEmail(to: string[], subject: string, html: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "SLP Alaska Training <reports@slpalaska.com>",
      to,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Resend API error: ${error}`);
  }

  return await response.json();
}

// ============================================================================
// SERVE
// ============================================================================
serve(async (req) => {
  try {
    let opts: any = {};
    try { opts = await req.json(); } catch { /* no body — scheduled run */ }

    const dryRun: boolean = !!opts.dry_run;
    const testEmail: string | null = opts.test_email || null;
    const limit: number | null = Number.isFinite(opts.limit) ? Number(opts.limit) : null;
    const offset: number = Number.isFinite(opts.offset) ? Number(opts.offset) : 0;

    const now = new Date();
    const newSince = new Date(now.getTime() - NEW_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

    // ── Employees: every active user with an email. company_admin is NOT
    // excluded — supervisors hold that role and take training too.
    const { data: employees, error: empErr } = await supabase
      .from("lms_users")
      .select("id, full_name, email, company_id, exempt_from_required, lms_companies(name)")
      .eq("active", true)
      .not("email", "is", null)
      .order("full_name");
    if (empErr) throw empErr;

    const allEmployees = (employees || []).filter((e: any) => (e.email || "").trim());
    const slice = limit === null ? allEmployees.slice(offset) : allEmployees.slice(offset, offset + limit);
    const employeeIds = slice.map((e: any) => e.id);

    if (employeeIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, employeesConsidered: 0, emailsSent: 0, results: [] }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    // ── Required courses (all companies in this slice)
    const companyIds = [...new Set(slice.map((e: any) => e.company_id).filter(Boolean))];
    const { data: required } = companyIds.length
      ? await supabase
          .from("lms_required_courses")
          .select("company_id, course_id, assigned_at")
          .in("company_id", companyIds)
      : { data: [] as any[] };

    // ── Per-course exclusions. Degrade to none if the table is absent.
    let exclusions: any[] = [];
    {
      const { data, error } = await supabase
        .from("lms_required_exclusions")
        .select("user_id, course_id")
        .in("user_id", employeeIds);
      exclusions = error ? [] : (data || []);
    }
    const excludedKeys = new Set(exclusions.map((x) => `${x.user_id}|${x.course_id}`));

    // ── Individual assignments
    const { data: individual } = await supabase
      .from("lms_individual_assignments")
      .select("user_id, course_id, due_date, assigned_at")
      .in("user_id", employeeIds);

    // ── Completions (most recent per user+course wins)
    const { data: completions } = await supabase
      .from("lms_completions")
      .select("user_id, course_id, completed_at")
      .in("user_id", employeeIds);

    const latestCompletion = new Map<string, string>();
    for (const c of completions || []) {
      const k = `${c.user_id}|${c.course_id}`;
      const prev = latestCompletion.get(k);
      if (!prev || new Date(c.completed_at) > new Date(prev)) latestCompletion.set(k, c.completed_at);
    }

    // ── Course metadata
    const courseIds = [
      ...new Set([
        ...(required || []).map((r: any) => r.course_id),
        ...(individual || []).map((i: any) => i.course_id),
      ]),
    ];
    const { data: courses } = courseIds.length
      ? await supabase
          .from("lms_courses")
          .select("id, title, refresher_frequency_months, active")
          .in("id", courseIds)
      : { data: [] as any[] };
    const courseById = new Map((courses || []).map((c: any) => [c.id, c]));

    // Index required rows by company, and assignments by user
    const requiredByCompany = new Map<string, any[]>();
    for (const r of required || []) {
      const list = requiredByCompany.get(r.company_id) || [];
      list.push(r);
      requiredByCompany.set(r.company_id, list);
    }
    const assignmentsByUser = new Map<string, any[]>();
    for (const a of individual || []) {
      const list = assignmentsByUser.get(a.user_id) || [];
      list.push(a);
      assignmentsByUser.set(a.user_id, list);
    }

    const results: any[] = [];
    let emailsSent = 0;
    const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

    for (const emp of slice) {
      try {
        // ── Effective required list: skipped wholesale when exempt, and
        // per-course exclusions subtracted otherwise.
        const empRequired = emp.exempt_from_required
          ? []
          : (requiredByCompany.get(emp.company_id) || [])
              .filter((r: any) => !excludedKeys.has(`${emp.id}|${r.course_id}`));

        const empAssignments = assignmentsByUser.get(emp.id) || [];

        // course_id -> earliest relevant assigned_at, for the "new" window
        const assignedAt = new Map<string, string>();
        for (const r of empRequired) if (r.assigned_at) assignedAt.set(r.course_id, r.assigned_at);
        for (const a of empAssignments) {
          const prev = assignedAt.get(a.course_id);
          if (!prev || (a.assigned_at && new Date(a.assigned_at) > new Date(prev))) {
            if (a.assigned_at) assignedAt.set(a.course_id, a.assigned_at);
          }
        }

        const effectiveIds = [
          ...new Set([
            ...empRequired.map((r: any) => r.course_id),
            ...empAssignments.map((a: any) => a.course_id),
          ]),
        ];

        const newItems: Item[] = [];
        const overdueItems: Item[] = [];
        const dueSoonItems: Item[] = [];

        for (const courseId of effectiveIds) {
          const course = courseById.get(courseId);
          if (!course || course.active === false) continue;

          const completedAt = latestCompletion.get(`${emp.id}|${courseId}`) || null;
          const { status, expiresAt, daysUntilExpiry } = getCourseStatus(
            completedAt, course.refresher_frequency_months, now,
          );

          const at = assignedAt.get(courseId);
          const isNew = !!at && at >= newSince;

          // New takes precedence so a just-assigned course isn't also scolded
          // as overdue in the same email.
          if (isNew) {
            newItems.push({
              title: course.title,
              refresher: course.refresher_frequency_months,
              note: `Assigned ${fmtDate(at!)}`,
            });
            continue;
          }

          if (status === "overdue") {
            overdueItems.push({
              title: course.title,
              refresher: course.refresher_frequency_months,
              note: `Expired ${fmtDate(expiresAt)} (${Math.abs(daysUntilExpiry ?? 0)} days ago)`,
            });
          } else if (status === "never") {
            overdueItems.push({
              title: course.title,
              refresher: course.refresher_frequency_months,
              note: "Not yet completed",
            });
          } else if (status === "due_soon") {
            dueSoonItems.push({
              title: course.title,
              refresher: course.refresher_frequency_months,
              note: `Expires ${fmtDate(expiresAt)} (${daysUntilExpiry} days left)`,
            });
          }
        }

        const actionable = newItems.length + overdueItems.length + dueSoonItems.length;
        if (actionable === 0) {
          results.push({ employee: emp.full_name, status: "skipped", reason: "nothing actionable" });
          continue;
        }

        const companyName = (emp as any).lms_companies?.name || "Your Company";
        const html = generateEmailHTML(
          emp.full_name || "there", companyName, newItems, overdueItems, dueSoonItems,
        );
        const subject = overdueItems.length > 0
          ? `Action needed: ${overdueItems.length} overdue training course${overdueItems.length === 1 ? "" : "s"}`
          : newItems.length > 0
            ? "New training assigned to you"
            : `Training due soon: ${dueSoonItems.length} course${dueSoonItems.length === 1 ? "" : "s"}`;

        if (dryRun) {
          results.push({
            employee: emp.full_name, email: emp.email, status: "dry_run",
            subject, new: newItems.length, overdue: overdueItems.length, due_soon: dueSoonItems.length,
          });
          continue;
        }

        if (emailsSent > 0) await delay(SEND_DELAY_MS);
        const sent = await sendEmail([testEmail || emp.email], subject, html);
        emailsSent++;

        results.push({
          employee: emp.full_name, email: testEmail || emp.email, status: "sent", id: sent.id,
          new: newItems.length, overdue: overdueItems.length, due_soon: dueSoonItems.length,
        });
        console.log(`✓ Reminder sent to ${emp.full_name} (${actionable} items)`);
      } catch (err: any) {
        results.push({ employee: emp.full_name, status: "error", error: err.message });
        console.error(`✗ Error sending to ${emp.full_name}:`, err.message);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        dryRun,
        employeesTotal: allEmployees.length,
        employeesConsidered: slice.length,
        truncated: offset + slice.length < allEmployees.length,
        nextOffset: offset + slice.length,
        emailsSent,
        results,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

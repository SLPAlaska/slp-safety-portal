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
// ...then emails anyone with something actionable. Four sections:
//
//   1. New Training Assigned — required rows / individual assignments created
//      in the last 7 days. Listed first and de-duplicated OUT of the other
//      sections, so a course assigned two days ago reads as "new" rather than
//      scolding the employee for not having done it yet.
//   2. Overdue — a refresher genuinely lapsed. NOT used for training that was
//      simply never started; calling that "overdue" misdescribes it to the
//      recipient and the subject line would be wrong.
//   3. Not Yet Started — assigned, no completion on record.
//   4. Due Soon — expires within DUE_SOON_DAYS (90).
//
// The subject line describes whatever the email actually contains.
//
// Employees with all three sections empty are skipped entirely.
//
// MagTec employees also get a "THIS WEEK'S RUN" section at the bottom: a
// one-tap link to the Run the Job SOP game, carrying a signed token that
// identifies them without a password. Other companies' emails are byte-for-byte
// what they were before. See GAME LINKS below.
//
// Required Edge Function secrets:
//   - RESEND_API_KEY               (shared with send-weekly-reports)
//   - SUPABASE_URL                 (auto-provided)
//   - SUPABASE_SERVICE_ROLE_KEY    (auto-provided)
//   - GAME_LINK_SECRET             (signs the game magic links; MUST be the
//                                   same value as the Vercel env var of the
//                                   same name, or every link fails to verify.
//                                   Absent = the game section is simply left
//                                   out, and the rest of the email is normal.)
//
// Optional Edge Function secret:
//   - PORTAL_URL                   (defaults to https://portal.slpalaska.com)
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
const GAME_LINK_SECRET = Deno.env.get("GAME_LINK_SECRET");
const PORTAL_URL = (Deno.env.get("PORTAL_URL") || "https://portal.slpalaska.com")
  .replace(/\/+$/, "");

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

const SEND_DELAY_MS = 600;   // ~1.6/sec, under Resend's rate limit
const NEW_WINDOW_DAYS = 7;
const PAGE = 1000;           // PostgREST caps a single response at 1000 rows

// ============================================================================
// GAME LINKS
//
// Run the Job is live for MagTec Alaska only — the decks are built from their
// controlled SOPs — so only MagTec employees get the extra section. Everyone
// else's email is untouched.
//
// The link carries an HS256 JWT: the same algorithm and wire format Supabase
// issues, signed with GAME_LINK_SECRET instead of the project's JWT secret.
// It proves "this is employee X" and nothing else. It is NOT a Supabase
// session and cannot be traded for one, so a forwarded link exposes a game
// score, not somebody's training record.
//
// Kept in step with app/lib/game-auth.js by hand: Edge Functions bundle from
// this directory only and cannot import from app/lib. If the payload shape or
// TTL changes on one side, change it on the other.
// ============================================================================
const MAGTEC_COMPANY_ID = "c1fd7a04-99e6-401a-8cf8-f88f8d7cea35";
const GAME_TOKEN_TTL_DAYS = 14;   // covers the gap to next week's email, plus slack

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function signGameToken(userId: string): Promise<string> {
  const enc = new TextEncoder();
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(enc.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const payload = b64url(enc.encode(JSON.stringify({
    sub: userId,
    scope: "game",
    iat: now,
    exp: now + GAME_TOKEN_TTL_DAYS * 24 * 60 * 60,
  })));
  const data = `${header}.${payload}`;

  const key = await crypto.subtle.importKey(
    "raw", enc.encode(GAME_LINK_SECRET!),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
  return `${data}.${b64url(sig)}`;
}

/**
 * The player's personal one-tap link, or null when the game does not apply to
 * them — wrong company, or the signing secret is not configured. Null means the
 * section is left out entirely; it never means a broken link goes out.
 */
async function gameLinkFor(employee: any): Promise<string | null> {
  if (!GAME_LINK_SECRET) return null;
  if (employee.company_id !== MAGTEC_COMPANY_ID) return null;
  try {
    return `${PORTAL_URL}/game?t=${await signGameToken(employee.id)}`;
  } catch (err) {
    // A failure to sign must not cost this employee their training reminder.
    console.error("game link signing failed:", (err as Error).message);
    return null;
  }
}

// ============================================================================
// PAGINATED READS
//
// PostgREST returns at most 1000 rows per request and enforces that server
// side — .range() past it does NOT return more. lms_completions alone holds
// thousands of rows, so an unpaginated .in(user_ids) read silently drops most
// of them and every dropped completion reads as "never completed". Every bulk
// read below must page. User id lists are also chunked so the request URL
// cannot grow past its length limit on a large roster.
// ============================================================================
async function pageAll(build: () => any): Promise<any[]> {
  const out: any[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build().range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    out.push(...(data || []));
    if (!data || data.length < PAGE) break;
  }
  return out;
}

async function fetchByUsers(table: string, select: string, userIds: string[]): Promise<any[]> {
  const out: any[] = [];
  const CHUNK = 100;
  for (let i = 0; i < userIds.length; i += CHUNK) {
    const chunk = userIds.slice(i, i + CHUNK);
    out.push(...await pageAll(() => supabase.from(table).select(select).in("user_id", chunk)));
  }
  return out;
}

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
  notStarted: { bg: "#f3f4f6", fg: "#374151", border: "#d1d5db" },
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

/**
 * "THIS WEEK'S RUN" — the MagTec-only game block, appended below the training
 * sections. Table-and-inline-styles only: Outlook ignores flex and drops
 * background-image, so the orange button is a real table cell with a real
 * background color, and it stays a legible link even if that color is stripped.
 */
function gameSection(gameUrl: string): string {
  return `
  <div style="margin:26px 0 0 0;border-top:1px solid #e5e7eb;padding-top:22px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
           style="background:#1a1d21;border-radius:8px;">
      <tr><td style="padding:18px 20px;">
        <div style="color:#ff6a00;font-size:13px;font-weight:700;letter-spacing:1.5px;">
          THIS WEEK'S RUN
        </div>
        <div style="color:#f2f4f6;font-size:19px;font-weight:700;margin:6px 0 8px 0;">
          Run the Job
        </div>
        <div style="color:#9aa4ad;font-size:13px;line-height:1.5;margin-bottom:16px;">
          Jobs off your own SOPs &mdash; ACB offload, tank farm, greasing, the Money Pit.
          Put the steps in the order you&rsquo;d actually run them. Right calls pay, wrong calls
          tell you what they cost. Fastest clean runs top the crew standings.
        </div>
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr><td style="background:#ff6a00;border-radius:4px;">
            <a href="${gameUrl}"
               style="display:inline-block;padding:13px 26px;color:#14161a;font-size:16px;
                      font-weight:700;text-decoration:none;letter-spacing:.5px;">
              START YOUR RUN &rarr;
            </a>
          </td></tr>
        </table>
        <div style="color:#5c656e;font-size:11px;line-height:1.5;margin-top:14px;">
          This link signs you in as you &mdash; don&rsquo;t forward it. It expires in
          ${GAME_TOKEN_TTL_DAYS} days; next week&rsquo;s email carries a fresh one.<br/>
          Training aid only. The controlled SOPs govern the work.
        </div>
      </td></tr>
    </table>
  </div>`;
}

function generateEmailHTML(
  employeeName: string,
  companyName: string,
  newItems: Item[],
  notStartedItems: Item[],
  overdueItems: Item[],
  dueSoonItems: Item[],
  gameUrl: string | null,
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
            "Your certification has expired — please renew these first",
            overdueItems, COLORS.overdue,
          )}
          ${section(
            "Not Yet Started",
            "Assigned to you and not yet completed",
            notStartedItems, COLORS.notStarted,
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

          ${gameUrl ? gameSection(gameUrl) : ""}
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
    const employees = await pageAll(() =>
      supabase
        .from("lms_users")
        .select("id, full_name, email, company_id, exempt_from_required, lms_companies(name)")
        .eq("active", true)
        .not("email", "is", null)
        // id is a tiebreaker, not decoration: limit/offset slicing runs across
        // separate invocations, so duplicate full_names must not be allowed to
        // re-order between them or a slice boundary could double-send or skip.
        .order("full_name")
        .order("id")
    );

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
    const required = companyIds.length
      ? await pageAll(() =>
          supabase
            .from("lms_required_courses")
            .select("company_id, course_id, assigned_at")
            .in("company_id", companyIds)
        )
      : [];

    // ── Per-course exclusions. Degrade to none if the table is absent.
    let exclusions: any[] = [];
    try {
      exclusions = await fetchByUsers("lms_required_exclusions", "user_id, course_id", employeeIds);
    } catch { exclusions = []; }
    const excludedKeys = new Set(exclusions.map((x) => `${x.user_id}|${x.course_id}`));

    // ── Individual assignments
    const individual = await fetchByUsers(
      "lms_individual_assignments", "user_id, course_id, due_date, assigned_at", employeeIds,
    );

    // ── Completions (most recent per user+course wins)
    const completions = await fetchByUsers(
      "lms_completions", "user_id, course_id, completed_at", employeeIds,
    );

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
    const courses = courseIds.length
      ? await pageAll(() =>
          supabase
            .from("lms_courses")
            .select("id, title, refresher_frequency_months, active")
            .in("id", courseIds)
        )
      : [];
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
        const notStartedItems: Item[] = [];   // assigned, never completed
        const overdueItems: Item[] = [];      // refresher genuinely lapsed
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
            notStartedItems.push({
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

        const actionable =
          newItems.length + notStartedItems.length + overdueItems.length + dueSoonItems.length;
        if (actionable === 0) {
          results.push({ employee: emp.full_name, status: "skipped", reason: "nothing actionable" });
          continue;
        }

        const companyName = (emp as any).lms_companies?.name || "Your Company";

        // MagTec only. Every other company's email is exactly what it was.
        const gameUrl = await gameLinkFor(emp);

        const html = generateEmailHTML(
          emp.full_name || "there", companyName, newItems, notStartedItems, overdueItems, dueSoonItems,
          gameUrl,
        );

        // The subject describes what is actually in the email. "Overdue" is
        // reserved for genuinely lapsed refreshers — never for training that
        // was simply never started.
        const plural = (n: number) => (n === 1 ? "" : "s");
        let subject: string;
        if (overdueItems.length > 0) {
          const rest = actionable - overdueItems.length;
          subject = `Action needed: ${overdueItems.length} overdue training course${plural(overdueItems.length)}`
            + (rest > 0 ? ` and ${rest} more to complete` : "");
        } else if (notStartedItems.length > 0) {
          const total = notStartedItems.length + newItems.length;
          subject = `You have ${total} training course${plural(total)} to complete`;
        } else if (newItems.length > 0) {
          subject = `New training assigned to you: ${newItems.length} course${plural(newItems.length)}`;
        } else {
          subject = `Training due soon: ${dueSoonItems.length} course${plural(dueSoonItems.length)}`;
        }

        if (dryRun) {
          results.push({
            employee: emp.full_name, email: emp.email, status: "dry_run",
            subject,
            // Boolean, never the URL: the token in it signs somebody in, and a
            // dry-run response gets pasted into chats and tickets.
            game_link: !!gameUrl,
            new: newItems.length, not_started: notStartedItems.length,
            overdue: overdueItems.length, due_soon: dueSoonItems.length,
            // Full titles so a dry run can be reviewed before any send.
            new_items: newItems.map((i) => `${i.title} — ${i.note}`),
            not_started_items: notStartedItems.map((i) => `${i.title} — ${i.note}`),
            overdue_items: overdueItems.map((i) => `${i.title} — ${i.note}`),
            due_soon_items: dueSoonItems.map((i) => `${i.title} — ${i.note}`),
          });
          continue;
        }

        if (emailsSent > 0) await delay(SEND_DELAY_MS);
        const sent = await sendEmail([testEmail || emp.email], subject, html);
        emailsSent++;

        results.push({
          employee: emp.full_name, email: testEmail || emp.email, status: "sent", id: sent.id,
          new: newItems.length, overdue: overdueItems.length, due_soon: dueSoonItems.length,
          game_link: !!gameUrl,
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

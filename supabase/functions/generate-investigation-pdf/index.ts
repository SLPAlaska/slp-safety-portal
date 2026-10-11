// =====================================================================
// supabase/functions/generate-investigation-pdf/index.ts
// =====================================================================
// Server-side investigation PDF generator.
//
// Pulls one incident + all related data, downloads photos from
// `incident-evidence` and `safety-photos` storage buckets, re-compresses
// each image (max 1200px wide, JPEG quality 55) using ImageScript, and
// embeds the compressed bytes into a pdf-lib PDF.
//
// Designed to produce a PDF <= 10 MB so the file emails cleanly.
//
// AUTH (locked down 2026-10-11):
//   The public anon / site key alone is NOT enough. The caller must send a
//   signed-in user's access token, and that user must carry
//   app_metadata.role === 'investigator' (same rule as app/lib/investigatorAuth.js
//   and /api/investigation-text-gate). app_metadata is service-role-writable
//   only, so the role cannot be self-granted.
//     no / anon / invalid / expired token -> 401
//     signed in but not an investigator   -> 403
//
// SPELLING & GRAMMAR GATE (PR #2):
//   This is an export path, so it honours the same gate as the printable
//   report: the stored passed_hash must match the hash of the CURRENT report
//   text (public.inv_report_text_gate). Otherwise -> 409, no PDF.
//
// QUALITY GATE (SQL 53-55, Oct 11 2026):
//   Client-facing conclusions export. Unless public.inv_quality_gate() is green
//   (or the investigation is Approved/Closed) every page is stamped
//   "DRAFT - NOT APPROVED" and the file name starts with DRAFT-. If the gate
//   cannot be read, the PDF is a DRAFT (fails closed).
//
// DEPLOY (keep JWT verification ON; the in-function check is the real gate):
//   supabase functions deploy generate-investigation-pdf
//
// CALL FROM BROWSER (signed-in investigator):
//   POST {SUPABASE_URL}/functions/v1/generate-investigation-pdf
//   Headers: Authorization: Bearer {session.access_token}
//            apikey: {SUPABASE_ANON_KEY}
//   Body:    { "incident_id": "<uuid>" }
//   Returns: application/pdf (binary download)
// =====================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { PDFDocument, StandardFonts, rgb, degrees, PDFFont, PDFPage } from "https://esm.sh/pdf-lib@1.17.1";
import { Image } from "https://deno.land/x/imagescript@1.2.17/mod.ts";

// ---------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------
const PAGE_W       = 612;   // US Letter @ 72dpi
const PAGE_H       = 792;
const MARGIN       = 50;
const CONTENT_W    = PAGE_W - MARGIN * 2;
const PHOTO_MAX_W  = 1200;
const PHOTO_QUAL   = 55;
const PHOTO_TARGET_BYTES = 350_000;  // soft target per photo

// Logo
const LOGO_URL = Deno.env.get("LOGO_URL") || "https://portal.slpalaska.com/AnthroSafe_Logo.PNG";

// AnthroSafe brand palette - safety red primary
const RED       = rgb(0.843, 0.098, 0.098);  // #D71919  primary
const RED_DARK  = rgb(0.659, 0.039, 0.039);  // #A80A0A  band
const INK       = rgb(0.059, 0.078, 0.102);  // #0F141A  near-black
const TEXT      = rgb(0.102, 0.102, 0.102);
const MUTED     = rgb(0.420, 0.447, 0.502);
const BORDER    = rgb(0.820, 0.835, 0.859);
const SUCCESS   = rgb(0.243, 0.612, 0.247);  // #3E9C3F
const WARNING   = rgb(1.000, 0.549, 0.102);  // #FF8C1A
const DANGER    = rgb(0.843, 0.098, 0.098);  // same as RED
const AMBER_BG  = rgb(0.996, 0.953, 0.780);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ---------------------------------------------------------------------
// Logo fetcher (graceful degrade if unreachable)
// ---------------------------------------------------------------------
async function fetchLogoBytes(): Promise<{ bytes: Uint8Array; isPng: boolean } | null> {
  try {
    const resp = await fetch(LOGO_URL);
    if (!resp.ok) {
      console.warn(`Logo fetch ${resp.status}: ${LOGO_URL}`);
      return null;
    }
    const bytes = new Uint8Array(await resp.arrayBuffer());
    const isPng = /\.png$/i.test(LOGO_URL) || bytes[0] === 0x89;
    return { bytes, isPng };
  } catch (e) {
    console.warn("Logo fetch failed:", e);
    return null;
  }
}

// ---------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  if (req.method !== "POST") return jsonErr("Method not allowed", 405);

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) return jsonErr("Server not configured", 503);

    const supabase = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // --- Auth: signed-in investigator only (fail closed) -----------------
    const authHeader = req.headers.get("authorization") || "";
    const token = /^Bearer\s+/i.test(authHeader) ? authHeader.replace(/^Bearer\s+/i, "").trim() : "";
    if (!token) return jsonErr("Sign in to generate the investigation PDF.", 401);
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    const user = authData?.user;
    if (authError || !user) return jsonErr("Sign in to generate the investigation PDF.", 401);
    if (user.app_metadata?.role !== "investigator") {
      return jsonErr("This account is not authorized for investigations.", 403);
    }

    let body: any;
    try { body = await req.json(); } catch { return jsonErr("Request body was not valid JSON.", 400); }
    const incident_id = String(body?.incident_id || "");
    if (!UUID_RE.test(incident_id)) return jsonErr("incident_id is required (uuid)", 400);

    // --- Spelling & grammar gate (same rule as the printable report) -----
    const { data: gate, error: gateErr } = await supabase.rpc("inv_report_text_gate", { p_incident: incident_id });
    if (gateErr) return jsonErr("Could not verify the spelling & grammar check. Try again shortly.", 503);
    if (!gate) return jsonErr("Incident not found", 404);
    const passed = gate?.state?.passed_hash;
    if (!passed || passed !== gate.hash) {
      return jsonErr(
        "TEXT_GATE: The spelling & grammar check has not passed for the current report text. " +
        "Run it in the Investigation Workbench (Close It Out), then export again.",
        409,
      );
    }

    // Phase 1: load incident first to get both ID forms
    const incidentR = await supabase.from("incidents").select("*").eq("id", incident_id).single();
    if (incidentR.error || !incidentR.data) return jsonErr("Incident not found", 404);
    const incident = incidentR.data;
    const fkText = incident.incident_id;  // INC-2026-0051 (legacy tables)
    const fkUuid = incident.id;            // UUID (rca_factors)

    // --- Quality gate: not green -> watermarked DRAFT only ----------------
    const { data: qg, error: qgErr } = await supabase.rpc("inv_quality_gate", { p_incident: incident_id });
    const approved = ["Approved", "Closed"].includes(String(incident.status || ""));
    const isDraft = !approved && (qgErr || !qg || (qg.applies !== false && qg.status !== "pass"));

    // Phase 2: parallel load with correct foreign key form per table
    const [
      timelineR, witnessR, evidenceR, rcaR,
      fiveWhyR, localReviewR, caR, lessonsR
    ] = await Promise.all([
      supabase.from("timeline_events").select("*").eq("incident_id", fkText).order("event_date").order("event_time"),
      supabase.from("witness_statements").select("*").eq("incident_id", fkText).order("created_at"),
      supabase.from("investigation_evidence").select("*").eq("incident_id", fkText).order("uploaded_at"),
      supabase.from("rca_factors").select("*").eq("incident_id", fkUuid).order("category"),
      supabase.from("five_why_analyses").select("*").eq("incident_id", fkText).order("updated_at", { ascending: false }).limit(1),
      supabase.from("local_reviews").select("*").eq("incident_id", fkText).order("updated_at", { ascending: false }).limit(1),
      supabase.from("investigation_corrective_actions").select("*").eq("incident_id", fkText).order("due_date"),
      supabase.from("lessons_learned").select("*").eq("incident_id", fkText).order("created_at"),
    ]);

    const fiveWhy = Array.isArray(fiveWhyR.data) ? fiveWhyR.data[0] : fiveWhyR.data;
    const localReview = Array.isArray(localReviewR.data) ? localReviewR.data[0] : localReviewR.data;

    // Build PDF
    const pdf = await PDFDocument.create();
    pdf.setTitle(`Investigation Report - ${incident.incident_id || incident_id}`);
    pdf.setAuthor("SLP Alaska");
    pdf.setProducer("AnthroSafe Investigation Workbench");
    pdf.setCreationDate(new Date());

    const fonts = {
      regular: await pdf.embedFont(StandardFonts.Helvetica),
      bold:    await pdf.embedFont(StandardFonts.HelveticaBold),
      italic:  await pdf.embedFont(StandardFonts.HelveticaOblique),
    };

    // Cursor: tracks current page + y position
    const ctx: Ctx = {
      pdf,
      page:   pdf.addPage([PAGE_W, PAGE_H]),
      y:      PAGE_H - MARGIN,
      fonts,
      pageNum: 1,
    };

    // Fetch logo (graceful if unavailable)
    const logoRaw = await fetchLogoBytes();
    let logoImage: any = null;
    if (logoRaw) {
      try {
        logoImage = logoRaw.isPng
          ? await pdf.embedPng(logoRaw.bytes)
          : await pdf.embedJpg(logoRaw.bytes);
      } catch (e) {
        console.warn("Logo embed failed:", e);
      }
    }

    drawHeader(ctx, incident, logoImage);
    drawIncidentSummary(ctx, incident);
    drawTimeline(ctx, timelineR.data || []);
    drawWitnesses(ctx, witnessR.data || []);
    drawAnalysis(ctx, incident, rcaR.data || [], fiveWhy, localReview);
    drawOsha1904(ctx, incident);
    drawCorrectiveActions(ctx, caR.data || []);
    drawLessons(ctx, lessonsR.data || []);

    // Photos last - merge initial-report photos (incidents.photo_urls JSONB) with workbench evidence
    const evidencePhotos = (evidenceR.data || []).filter((e: any) =>
      e.file_url && /\.(jpe?g|png|webp|gif)$/i.test(e.file_url)
    );
    const initialPhotos = Array.isArray(incident.photo_urls) ? incident.photo_urls.map((url: string, i: number) => ({
      id: `initial-${i}`,
      evidence_type: "Initial Field Report",
      description: "",
      file_url: url,
      file_name: (url || "").split("/").pop(),
    })) : [];
    const allPhotos = [...initialPhotos, ...evidencePhotos];
    if (allPhotos.length > 0) {
      await drawPhotos(ctx, allPhotos, supabase);
    }

    drawFooters(pdf, fonts, logoImage);

    if (isDraft) {
      for (const pg of pdf.getPages()) {
        pg.drawText("DRAFT - NOT APPROVED", {
          x: 95, y: 210, size: 58, font: fonts.bold,
          color: rgb(0.725, 0.11, 0.11), opacity: 0.16, rotate: degrees(35),
        });
        pg.drawText("Draft (not for distribution): quality checklist not complete", {
          x: MARGIN, y: PAGE_H - 22, size: 8, font: fonts.bold, color: rgb(0.725, 0.11, 0.11),
        });
      }
    }

    // Stamp pdf_last_generated_at
    await supabase.from("incidents")
      .update({ pdf_last_generated_at: new Date().toISOString() })
      .eq("id", incident_id);

    const bytes = await pdf.save();
    const filename = `${isDraft ? "DRAFT-" : ""}Investigation-${(incident.incident_id || incident_id).toString().replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;

    return new Response(bytes, {
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(bytes.length),
      },
    });
  } catch (err) {
    console.error("PDF generation error:", err);
    return jsonErr("PDF generation failed.", 500);
  }
});

// ---------------------------------------------------------------------
// Drawing helpers
// ---------------------------------------------------------------------
interface Ctx {
  pdf: PDFDocument;
  page: PDFPage;
  y: number;
  fonts: { regular: PDFFont; bold: PDFFont; italic: PDFFont };
  pageNum: number;
}

function ensureSpace(ctx: Ctx, needed: number) {
  if (ctx.y - needed < MARGIN + 30) {
    ctx.page = ctx.pdf.addPage([PAGE_W, PAGE_H]);
    ctx.y = PAGE_H - MARGIN;
    ctx.pageNum++;
  }
}

function drawHeader(ctx: Ctx, incident: any, logo: any) {
  // Red band across top
  const bandH = 90;
  ctx.page.drawRectangle({
    x: 0, y: PAGE_H - bandH, width: PAGE_W, height: bandH, color: RED,
  });
  // Subtle darker stripe at the bottom of the band
  ctx.page.drawRectangle({
    x: 0, y: PAGE_H - bandH, width: PAGE_W, height: 4, color: RED_DARK,
  });

  let textX = MARGIN;
  if (logo) {
    // Logo on the left of the header
    const targetH = 60;
    const ratio = logo.width / logo.height;
    const logoH = targetH;
    const logoW = logoH * ratio;
    ctx.page.drawImage(logo, {
      x: MARGIN,
      y: PAGE_H - bandH + (bandH - logoH) / 2,
      width: logoW,
      height: logoH,
    });
    textX = MARGIN + logoW + 20;
  }

  ctx.page.drawText("INVESTIGATION REPORT", {
    x: textX, y: PAGE_H - 42, size: 20, font: ctx.fonts.bold, color: rgb(1, 1, 1),
  });
  ctx.page.drawText(`${incident.investigation_type || "Investigation"}  -  ${incident.incident_id || ""}`, {
    x: textX, y: PAGE_H - 64, size: 11, font: ctx.fonts.regular, color: rgb(0.95, 0.92, 0.92),
  });

  const right = `Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}`;
  const rw = ctx.fonts.regular.widthOfTextAtSize(right, 9);
  ctx.page.drawText(right, {
    x: PAGE_W - MARGIN - rw, y: PAGE_H - 64, size: 9, font: ctx.fonts.regular, color: rgb(0.95, 0.92, 0.92),
  });

  ctx.y = PAGE_H - bandH - 25;
}

function sectionTitle(ctx: Ctx, label: string) {
  ensureSpace(ctx, 30);
  ctx.page.drawRectangle({
    x: MARGIN, y: ctx.y - 18, width: CONTENT_W, height: 22, color: RED,
  });
  ctx.page.drawText(label, {
    x: MARGIN + 10, y: ctx.y - 13, size: 11, font: ctx.fonts.bold, color: rgb(1, 1, 1),
  });
  ctx.y -= 28;
}

function row(ctx: Ctx, label: string, value: string) {
  if (!value) return;
  ensureSpace(ctx, 18);
  ctx.page.drawText(label + ":", {
    x: MARGIN + 5, y: ctx.y, size: 9, font: ctx.fonts.bold, color: TEXT,
  });
  const wrapped = wrapText(value, ctx.fonts.regular, 9, CONTENT_W - 130);
  for (let i = 0; i < wrapped.length; i++) {
    if (i > 0) { ctx.y -= 12; ensureSpace(ctx, 12); }
    ctx.page.drawText(wrapped[i], {
      x: MARGIN + 130, y: ctx.y, size: 9, font: ctx.fonts.regular, color: TEXT,
    });
  }
  ctx.y -= 16;
}

function paragraph(ctx: Ctx, text: string, opts: { size?: number; color?: any; font?: PDFFont; indent?: number } = {}) {
  if (!text) return;
  const size = opts.size ?? 9;
  const color = opts.color ?? TEXT;
  const font = opts.font ?? ctx.fonts.regular;
  const indent = opts.indent ?? 5;
  const lines = wrapText(text, font, size, CONTENT_W - indent - 5);
  for (const line of lines) {
    ensureSpace(ctx, size + 4);
    ctx.page.drawText(line, { x: MARGIN + indent, y: ctx.y, size, font, color });
    ctx.y -= size + 4;
  }
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const safe = (text || "").replace(/[\x00-\x08\x0B-\x1F]/g, "").replace(/\r/g, "");
  const paragraphs = safe.split("\n");
  const result: string[] = [];
  for (const p of paragraphs) {
    if (!p) { result.push(""); continue; }
    const words = p.split(/\s+/);
    let line = "";
    for (const w of words) {
      const test = line ? line + " " + w : w;
      if (font.widthOfTextAtSize(test, size) > maxWidth && line) {
        result.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    if (line) result.push(line);
  }
  return result;
}

function drawIncidentSummary(ctx: Ctx, incident: any) {
  sectionTitle(ctx, "INCIDENT SUMMARY");
  row(ctx, "Incident ID",        incident.incident_id || "");
  row(ctx, "Date of Incident",   formatDate(incident.incident_date));
  row(ctx, "Time",               incident.incident_time || "");
  row(ctx, "Location",           incident.location_name || incident.location || "");
  row(ctx, "Specific Location",  incident.specific_location_onsite || "");
  row(ctx, "Operation Type",     incident.operation_type || "");
  row(ctx, "Company",            incident.company_name || incident.company || "");
  row(ctx, "Reported By",        incident.reported_by_name || incident.reported_by || incident.submitted_by || "");
  row(ctx, "Reporter Email",     incident.reported_by_email || "");
  row(ctx, "Reporter Phone",     incident.reported_by_phone || "");
  row(ctx, "Supervisor",         incident.supervisor_name || "");
  row(ctx, "Supervisor Title",   incident.supervisor_title || "");
  row(ctx, "Investigation Type", incident.investigation_type || "");
  row(ctx, "Safety Severity",    `${incident.safety_severity || incident.severity_safety || ""}${incident.safety_severity_description ? ` (${incident.safety_severity_description})` : ""}`);
  row(ctx, "Risk Ranking",       incident.risk_ranking || incident.risk_level || "");
  row(ctx, "PSIF Classification", incident.psif_classification || "");
  row(ctx, "Status",             incident.status || "");

  const brief = incident.brief_description || incident.description;
  if (brief) {
    ctx.y -= 4;
    ensureSpace(ctx, 14);
    ctx.page.drawText("Brief Description:", {
      x: MARGIN + 5, y: ctx.y, size: 9, font: ctx.fonts.bold, color: TEXT,
    });
    ctx.y -= 12;
    paragraph(ctx, brief);
  }
  if (incident.detailed_description) {
    ctx.y -= 4;
    ensureSpace(ctx, 14);
    ctx.page.drawText("Detailed Description:", {
      x: MARGIN + 5, y: ctx.y, size: 9, font: ctx.fonts.bold, color: TEXT,
    });
    ctx.y -= 12;
    paragraph(ctx, incident.detailed_description);
  }

  // Injury block (only if relevant)
  if (incident.injury_occurred) {
    ctx.y -= 6;
    sectionTitle(ctx, "INJURY INFORMATION");
    row(ctx, "Injured Person",   incident.injured_person_name || incident.injured_name || "");
    row(ctx, "Company",          incident.injured_person_company || incident.injured_company || "");
    row(ctx, "Position",         incident.injured_person_position || incident.injured_job_title || "");
    if (Array.isArray(incident.injured_body_parts) && incident.injured_body_parts.length) {
      row(ctx, "Body Parts",       incident.injured_body_parts.join(", "));
    } else if (incident.body_part_affected) {
      row(ctx, "Body Part",        incident.body_part_affected);
    }
    row(ctx, "Injury Nature",    incident.injury_nature || incident.injury_type || "");
    row(ctx, "Treatment",        incident.treatment_provided || "");
    row(ctx, "Treating Physician", incident.treating_physician || "");
  }

  // Initial findings from field report
  if (incident.immediate_actions_taken || incident.suspected_root_causes || incident.lessons_learned_initial || incident.causal_factors) {
    ctx.y -= 6;
    sectionTitle(ctx, "INITIAL FIELD-REPORT FINDINGS");
    if (incident.immediate_actions_taken) {
      paragraph(ctx, "Immediate actions taken:", { font: ctx.fonts.bold });
      paragraph(ctx, incident.immediate_actions_taken, { indent: 15 });
      ctx.y -= 4;
    }
    if (incident.suspected_root_causes) {
      paragraph(ctx, "Suspected root causes:", { font: ctx.fonts.bold });
      paragraph(ctx, incident.suspected_root_causes, { indent: 15 });
      ctx.y -= 4;
    }
    if (incident.causal_factors) {
      paragraph(ctx, "Causal factors:", { font: ctx.fonts.bold });
      paragraph(ctx, incident.causal_factors, { indent: 15 });
      ctx.y -= 4;
    }
    if (incident.lessons_learned_initial) {
      paragraph(ctx, "Initial lessons learned:", { font: ctx.fonts.bold });
      paragraph(ctx, incident.lessons_learned_initial, { indent: 15 });
      ctx.y -= 4;
    }
  }

  ctx.y -= 8;
}

function drawTimeline(ctx: Ctx, events: any[]) {
  if (events.length === 0) return;
  sectionTitle(ctx, "TIMELINE OF EVENTS");
  events.forEach((e, idx) => {
    ensureSpace(ctx, 30);
    const isCritical = e.is_critical || e.critical;
    const description = e.description || e.event_description || "";
    const stamp = `${formatDate(e.event_date)}${e.event_time ? "  " + e.event_time : ""}`;
    ctx.page.drawText(`${idx + 1}.`, {
      x: MARGIN + 5, y: ctx.y, size: 9, font: ctx.fonts.bold, color: TEXT,
    });
    ctx.page.drawText(stamp, {
      x: MARGIN + 25, y: ctx.y, size: 9, font: ctx.fonts.bold,
      color: isCritical ? DANGER : TEXT,
    });
    if (isCritical) {
      ctx.page.drawText("[CRITICAL]", {
        x: MARGIN + 25 + ctx.fonts.bold.widthOfTextAtSize(stamp, 9) + 8,
        y: ctx.y, size: 8, font: ctx.fonts.bold, color: DANGER,
      });
    }
    ctx.y -= 12;
    paragraph(ctx, description, { indent: 25 });
    ctx.y -= 4;
  });
  ctx.y -= 6;
}

function drawWitnesses(ctx: Ctx, witnesses: any[]) {
  if (witnesses.length === 0) return;
  sectionTitle(ctx, "WITNESS STATEMENTS");
  witnesses.forEach((w, idx) => {
    ensureSpace(ctx, 40);
    const name = w.name || w.witness_name || "Unnamed Witness";
    const position = w.position || w.position_role;
    const summary = w.summary || w.statement_summary;
    const heading = `${idx + 1}. ${name}${position ? "  -  " + position : ""}${w.company ? "  (" + w.company + ")" : ""}`;
    paragraph(ctx, heading, { font: ctx.fonts.bold });
    if (summary) paragraph(ctx, summary, { indent: 15 });
    if (w.additional_comments) {
      paragraph(ctx, "Additional comments:", { font: ctx.fonts.bold, size: 8, indent: 15 });
      paragraph(ctx, w.additional_comments, { indent: 15 });
    }
    if (w.acknowledgment) {
      paragraph(ctx, "[Acknowledged]", { font: ctx.fonts.italic, color: SUCCESS, size: 8, indent: 15 });
    }
    ctx.y -= 4;
  });
  ctx.y -= 6;
}

function drawAnalysis(ctx: Ctx, incident: any, factors: any[], fiveWhy: any, localReview: any) {
  const type = (incident.investigation_type || "").toLowerCase();

  if (type.includes("local")) {
    sectionTitle(ctx, "LOCAL REVIEW");
    if (localReview) {
      const what       = localReview.what_happened;
      const immediate  = localReview.immediate_cause || localReview.immediate_causes;
      const contrib    = localReview.contributing    || localReview.findings;
      const preventive = localReview.preventive      || localReview.do_differently;
      const notes      = localReview.additional_notes;

      const renderBlock = (label: string, value: any) => {
        if (typeof value !== "string" || !value.trim()) return;
        paragraph(ctx, label + ":", { font: ctx.fonts.bold });
        paragraph(ctx, value, { indent: 15 });
        ctx.y -= 4;
      };

      renderBlock("What happened",         what);
      renderBlock("Immediate cause(s)",    immediate);
      renderBlock("Contributing factors",  contrib);
      renderBlock("If you could do this over", preventive);
      renderBlock("Additional notes",      notes);
    }
  } else if (type.includes("5") || type.includes("why")) {
    sectionTitle(ctx, "5-WHY ANALYSIS");
    if (fiveWhy) {
      for (let i = 1; i <= 5; i++) {
        const v = fiveWhy[`why${i}`] || fiveWhy[`why_${i}`];
        if (v) {
          paragraph(ctx, `Why #${i}:`, { font: ctx.fonts.bold });
          paragraph(ctx, v, { indent: 15 });
          ctx.y -= 3;
        }
      }
      if (fiveWhy.root_cause || fiveWhy.root_cause_identified) {
        paragraph(ctx, "Root Cause:", { font: ctx.fonts.bold, color: DANGER });
        paragraph(ctx, fiveWhy.root_cause || fiveWhy.root_cause_identified, { indent: 15 });
      }
    }
  } else {
    sectionTitle(ctx, "ROOT CAUSE ANALYSIS - CONTRIBUTING FACTORS");
    if (factors.length === 0) {
      paragraph(ctx, "No factors recorded.", { font: ctx.fonts.italic, color: MUTED });
    } else {
      factors.forEach(f => {
        const label = prettify(f.category);
        const marker = f.is_factor ? "[X]" : "[ ]";
        const color = f.is_factor ? DANGER : MUTED;
        ensureSpace(ctx, 18);
        ctx.page.drawText(marker, {
          x: MARGIN + 5, y: ctx.y, size: 10, font: ctx.fonts.bold, color,
        });
        ctx.page.drawText(label, {
          x: MARGIN + 30, y: ctx.y, size: 10, font: ctx.fonts.bold, color: TEXT,
        });
        ctx.y -= 14;
        if (f.is_factor && f.description) {
          paragraph(ctx, f.description, { indent: 30 });
        }
        ctx.y -= 2;
      });
    }
    if (incident.root_cause_summary) {
      ctx.y -= 4;
      ensureSpace(ctx, 30);
      ctx.page.drawRectangle({
        x: MARGIN, y: ctx.y - 4, width: CONTENT_W, height: 18, color: AMBER_BG,
      });
      ctx.page.drawText("ROOT CAUSE SUMMARY", {
        x: MARGIN + 8, y: ctx.y, size: 10, font: ctx.fonts.bold, color: DANGER,
      });
      ctx.y -= 22;
      paragraph(ctx, incident.root_cause_summary, { indent: 8 });
    }
  }
  ctx.y -= 6;
}

// 29 CFR 1904 classification (SQL 2026-10-11-51). Conclusions only: the workers'
// compensation note is a separate determination and is never printed here.
// Labels mirror app/lib/osha1904.js OSHA1904_CLASSIFICATIONS.
const OSHA1904_LABELS: Record<string, string> = {
  not_case: "Not an injury or illness case",
  first_aid: "First Aid only",
  bunkhouse: "Bunkhouse (remote site)",
  personal: "Personal (non-job)",
  other_not_recordable: "Other: not recordable",
  recordable_mti: "OSHA Recordable: MTI (medical treatment beyond first aid)",
  recordable_rwi: "OSHA Recordable: RWI (restricted work / job transfer)",
  recordable_lti: "OSHA Recordable: LTI (days away from work)",
  recordable_fatality: "OSHA Recordable: Fatality",
};
function winAnsi(t: string): string {
  return String(t || "")
    .replace(/\u2192/g, "->").replace(/\u2264/g, "<=").replace(/\u2265/g, ">=")
    .replace(/[^\x09\x0A\x0D\x20-\xFF\u2018\u2019\u201C\u201D\u2013\u2014\u2022\u2026\u20AC\u2122]/g, "?");
}
function drawOsha1904(ctx: Ctx, incident: any) {
  const cls = incident?.osha_1904_classification;
  if (!cls) return;
  sectionTitle(ctx, "29 CFR 1904 CLASSIFICATION");
  const recordable = cls.startsWith("recordable_");
  const notCase = cls === "not_case";
  ensureSpace(ctx, 30);
  ctx.page.drawRectangle({ x: MARGIN, y: ctx.y - 4, width: CONTENT_W, height: 18, color: recordable ? rgb(0.996, 0.886, 0.886) : notCase ? rgb(0.95, 0.95, 0.96) : rgb(0.863, 0.988, 0.906) });
  ctx.page.drawText(recordable ? "OSHA RECORDABLE" : notCase ? "NOT AN INJURY / ILLNESS CASE" : "NOT RECORDABLE", {
    x: MARGIN + 8, y: ctx.y, size: 10, font: ctx.fonts.bold, color: recordable ? DANGER : notCase ? MUTED : SUCCESS,
  });
  ctx.y -= 22;
  row(ctx, "Classification", winAnsi(OSHA1904_LABELS[cls] || cls));
  if (incident.osha_1904_work_related) row(ctx, "Work-related (1904.5)", incident.osha_1904_work_related === "yes" ? "Yes" : "No");
  const basis = (incident.osha_1904_basis || []).filter(Boolean);
  if (basis.length) row(ctx, "Regulatory basis", winAnsi(basis.map((b: string) => "29 CFR " + b).join("; ")));
  if (incident.osha_1904_days_away) row(ctx, "Days away", String(incident.osha_1904_days_away));
  if (incident.osha_1904_days_restricted) row(ctx, "Days restricted", String(incident.osha_1904_days_restricted));
  if (incident.osha_1904_privacy_case) row(ctx, "Privacy case", "Yes (1904.29(b)(7))");
  if (incident.osha_1904_justification) {
    paragraph(ctx, "Classification justification:", { font: ctx.fonts.bold });
    paragraph(ctx, winAnsi(incident.osha_1904_justification), { indent: 8 });
  }
  if (incident.osha_1904_classified_by) {
    paragraph(ctx, winAnsi(`Classified by ${incident.osha_1904_classified_by}${incident.osha_1904_classified_at ? " on " + formatDate(incident.osha_1904_classified_at) : ""}. OSHA recordability and workers' compensation are separate determinations.`), { size: 8, color: MUTED });
  }
  ctx.y -= 6;
}

function drawCorrectiveActions(ctx: Ctx, cas: any[]) {
  if (cas.length === 0) return;
  sectionTitle(ctx, "CORRECTIVE ACTIONS");
  cas.forEach((c, idx) => {
    ensureSpace(ctx, 50);
    const description = c.description || c.action_description || c.action || "";
    const owner = c.owner || c.action_owner_name || "";
    const dueDate = c.due_date || c.target_date;
    const status = c.status || c.action_status || "Open";
    const hierarchyName = c.hierarchy_of_controls || c.hierarchy_control;
    paragraph(ctx, `${idx + 1}. ${description}`, { font: ctx.fonts.bold });
    if (hierarchyName) {
      const lvl = c.hierarchy_level || 0;
      const hColor = lvl <= 2 ? SUCCESS : lvl <= 4 ? WARNING : DANGER;
      ensureSpace(ctx, 14);
      ctx.page.drawText("Hierarchy:", {
        x: MARGIN + 15, y: ctx.y, size: 8, font: ctx.fonts.bold, color: TEXT,
      });
      ctx.page.drawText(`${hierarchyName}${lvl ? ` (Level ${lvl})` : ""}`, {
        x: MARGIN + 70, y: ctx.y, size: 8, font: ctx.fonts.bold, color: hColor,
      });
      ctx.y -= 12;
    }
    row(ctx, "Owner",     owner);
    row(ctx, "Due Date",  formatDate(dueDate));
    row(ctx, "Status",    status);
    ctx.y -= 4;
  });
  ctx.y -= 6;
}

function drawLessons(ctx: Ctx, lessons: any[]) {
  if (lessons.length === 0) return;
  sectionTitle(ctx, "LESSONS LEARNED");
  lessons.forEach((l, idx) => {
    const title = l.title || l.lesson_title || "Lesson";
    const description = l.description || l.lesson_description;
    paragraph(ctx, `${idx + 1}. ${title}`, { font: ctx.fonts.bold });
    if (description) paragraph(ctx, description, { indent: 15 });
    if (l.key_takeaway) {
      paragraph(ctx, "Key Takeaway:", { font: ctx.fonts.bold, size: 8, indent: 15 });
      paragraph(ctx, l.key_takeaway, { indent: 15 });
    }
    ctx.y -= 4;
  });
  ctx.y -= 6;
}

async function drawPhotos(ctx: Ctx, photos: any[], supabase: any) {
  // Start photos on a fresh page
  ctx.page = ctx.pdf.addPage([PAGE_W, PAGE_H]);
  ctx.y = PAGE_H - MARGIN;
  ctx.pageNum++;
  sectionTitle(ctx, "EVIDENCE - PHOTOS");

  for (const photo of photos) {
    try {
      let originalBytes: Uint8Array | null = null;

      // Try Supabase storage download first (works for any bucket we recognize)
      const path = extractStoragePath(photo.file_url);
      if (path) {
        const bucket = pickBucket(photo.file_url);
        const { data: blob, error } = await supabase.storage.from(bucket).download(path);
        if (!error && blob) {
          originalBytes = new Uint8Array(await blob.arrayBuffer());
        } else {
          console.warn(`Storage download failed for ${photo.id}: ${error?.message}`);
        }
      }

      // Fallback: direct fetch (handles any public URL)
      if (!originalBytes && photo.file_url) {
        try {
          const resp = await fetch(photo.file_url);
          if (resp.ok) {
            originalBytes = new Uint8Array(await resp.arrayBuffer());
          } else {
            console.warn(`Direct fetch failed ${resp.status}: ${photo.file_url}`);
          }
        } catch (e) {
          console.warn(`Direct fetch error for ${photo.file_url}:`, e);
        }
      }

      if (!originalBytes) {
        console.warn(`Photo unfetchable, skipping: ${photo.id} ${photo.file_url}`);
        continue;
      }

      let compressedBytes: Uint8Array;
      try {
        const img = await Image.decode(originalBytes);
        const scale = img.width > PHOTO_MAX_W ? PHOTO_MAX_W / img.width : 1;
        if (scale < 1) {
          img.resize(Math.round(img.width * scale), Math.round(img.height * scale));
        }
        compressedBytes = await img.encodeJPEG(PHOTO_QUAL);
        // If still huge, drop quality further
        if (compressedBytes.byteLength > PHOTO_TARGET_BYTES * 2) {
          compressedBytes = await img.encodeJPEG(35);
        }
      } catch (e) {
        console.warn(`Decode failed for ${photo.file_name}, embedding original`, e);
        compressedBytes = originalBytes;
      }

      let pdfImg;
      const isPng = /\.png$/i.test(photo.file_url);
      try {
        pdfImg = isPng && compressedBytes === originalBytes
          ? await ctx.pdf.embedPng(compressedBytes)
          : await ctx.pdf.embedJpg(compressedBytes);
      } catch {
        // Last resort fallback
        pdfImg = await ctx.pdf.embedJpg(compressedBytes);
      }

      // Layout: photo at fixed width, caption underneath
      const targetW = CONTENT_W;
      const ratio = pdfImg.height / pdfImg.width;
      const drawH = Math.min(targetW * ratio, 380);
      const drawW = drawH / ratio;

      ensureSpace(ctx, drawH + 36);
      const cx = MARGIN + (CONTENT_W - drawW) / 2;
      ctx.page.drawImage(pdfImg, {
        x: cx, y: ctx.y - drawH, width: drawW, height: drawH,
      });
      ctx.y -= drawH + 6;

      const caption = `${photo.evidence_type || "Photo"} - ${photo.description || photo.file_name || ""}`;
      paragraph(ctx, caption, { size: 8, color: MUTED, font: ctx.fonts.italic });
      if (photo.uploaded_at) {
        paragraph(ctx, `Uploaded: ${formatDate(photo.uploaded_at)}`, {
          size: 7, color: MUTED, font: ctx.fonts.italic,
        });
      }
      ctx.y -= 10;
    } catch (e) {
      console.error(`Photo ${photo.id} failed:`, e);
    }
  }
}

function drawFooters(pdf: PDFDocument, fonts: any, logo: any) {
  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    // Red accent line at top of footer
    p.drawLine({
      start: { x: MARGIN, y: 35 }, end: { x: PAGE_W - MARGIN, y: 35 },
      thickness: 1, color: RED,
    });

    let textX = MARGIN;
    if (logo) {
      // Small logo at bottom-left
      const logoH = 18;
      const logoW = logoH * (logo.width / logo.height);
      p.drawImage(logo, { x: MARGIN, y: 10, width: logoW, height: logoH });
      textX = MARGIN + logoW + 8;
    }

    p.drawText("AnthroSafe\u2122 Field Driven Safety  \u2022  \u00A9 2026 SLP Alaska, LLC", {
      x: textX, y: 18, size: 7, font: fonts.regular, color: MUTED,
    });
    const pn = `Page ${i + 1} of ${pages.length}`;
    const w = fonts.regular.widthOfTextAtSize(pn, 7);
    p.drawText(pn, {
      x: PAGE_W - MARGIN - w, y: 18, size: 7, font: fonts.regular, color: MUTED,
    });
  });
}

// ---------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------
function prettify(s: string) {
  return (s || "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function formatDate(d: string | null | undefined): string {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function extractStoragePath(url: string): string | null {
  if (!url) return null;
  const m = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
  if (m) return decodeURIComponent(m[1]);
  // Already a path?
  if (!/^https?:/.test(url)) return url;
  return null;
}

function pickBucket(url: string): string {
  if (/safety-photos/.test(url))      return "safety-photos";
  if (/incident-evidence/.test(url))  return "incident-evidence";
  if (/form-attachments/.test(url))   return "form-attachments";
  return "incident-evidence";
}

function jsonErr(message: string, status = 500) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

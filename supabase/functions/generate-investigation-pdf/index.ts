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
// DEPLOY:
//   supabase functions deploy generate-investigation-pdf --no-verify-jwt
//
// CALL FROM BROWSER:
//   POST {SUPABASE_URL}/functions/v1/generate-investigation-pdf
//   Headers: Authorization: Bearer {SUPABASE_ANON_KEY}
//   Body:    { "incident_id": "<uuid>" }
//   Returns: application/pdf (binary download)
// =====================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from "https://esm.sh/pdf-lib@1.17.1";
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

const NAVY    = rgb(0.118, 0.227, 0.373);  // #1e3a5f
const STEEL   = rgb(0.176, 0.353, 0.529);  // #2d5a87
const TEXT    = rgb(0.102, 0.102, 0.102);
const MUTED   = rgb(0.420, 0.447, 0.502);
const BORDER  = rgb(0.820, 0.835, 0.859);
const SUCCESS = rgb(0.133, 0.773, 0.369);
const WARNING = rgb(0.961, 0.620, 0.043);
const DANGER  = rgb(0.863, 0.149, 0.149);
const AMBER_BG = rgb(0.996, 0.953, 0.780);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ---------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  try {
    const { incident_id } = await req.json();
    if (!incident_id) return jsonErr("incident_id is required", 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Load all investigation data in parallel
    const [
      incidentR, timelineR, witnessR, evidenceR, rcaR,
      fiveWhyR, localReviewR, caR, lessonsR
    ] = await Promise.all([
      supabase.from("incidents").select("*").eq("id", incident_id).single(),
      supabase.from("timeline_events").select("*").eq("incident_id", incident_id).order("event_date").order("event_time"),
      supabase.from("witness_statements").select("*").eq("incident_id", incident_id).order("created_at"),
      supabase.from("investigation_evidence").select("*").eq("incident_id", incident_id).order("uploaded_at"),
      supabase.from("rca_factors").select("*").eq("incident_id", incident_id).order("category"),
      supabase.from("five_why_analyses").select("*").eq("incident_id", incident_id).maybeSingle(),
      supabase.from("local_reviews").select("*").eq("incident_id", incident_id).maybeSingle(),
      supabase.from("investigation_corrective_actions").select("*").eq("incident_id", incident_id).order("due_date"),
      supabase.from("lessons_learned").select("*").eq("incident_id", incident_id).order("created_at"),
    ]);

    if (incidentR.error || !incidentR.data) return jsonErr("Incident not found", 404);
    const incident = incidentR.data;

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

    drawHeader(ctx, incident);
    drawIncidentSummary(ctx, incident);
    drawTimeline(ctx, timelineR.data || []);
    drawWitnesses(ctx, witnessR.data || []);
    drawAnalysis(ctx, incident, rcaR.data || [], fiveWhyR.data, localReviewR.data);
    drawCorrectiveActions(ctx, caR.data || []);
    drawLessons(ctx, lessonsR.data || []);

    // Photos last, on fresh pages
    const photos = (evidenceR.data || []).filter((e: any) =>
      e.file_url && /\.(jpe?g|png|webp|gif)$/i.test(e.file_url)
    );
    if (photos.length > 0) {
      await drawPhotos(ctx, photos, supabase);
    }

    drawFooters(pdf, fonts);

    // Stamp pdf_last_generated_at
    await supabase.from("incidents")
      .update({ pdf_last_generated_at: new Date().toISOString() })
      .eq("id", incident_id);

    const bytes = await pdf.save();
    const filename = `Investigation-${(incident.incident_id || incident_id).toString().replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;

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
    return jsonErr(String(err?.message || err), 500);
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

function drawHeader(ctx: Ctx, incident: any) {
  // Navy band across top
  ctx.page.drawRectangle({
    x: 0, y: PAGE_H - 80, width: PAGE_W, height: 80, color: NAVY,
  });
  ctx.page.drawText("INVESTIGATION REPORT", {
    x: MARGIN, y: PAGE_H - 38, size: 20, font: ctx.fonts.bold, color: rgb(1, 1, 1),
  });
  ctx.page.drawText(`${incident.investigation_type || "Investigation"}  -  ${incident.incident_id || ""}`, {
    x: MARGIN, y: PAGE_H - 60, size: 11, font: ctx.fonts.regular, color: rgb(0.9, 0.9, 0.9),
  });
  const right = `Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}`;
  const rw = ctx.fonts.regular.widthOfTextAtSize(right, 9);
  ctx.page.drawText(right, {
    x: PAGE_W - MARGIN - rw, y: PAGE_H - 60, size: 9, font: ctx.fonts.regular, color: rgb(0.9, 0.9, 0.9),
  });
  ctx.y = PAGE_H - 80 - 25;
}

function sectionTitle(ctx: Ctx, label: string) {
  ensureSpace(ctx, 30);
  ctx.page.drawRectangle({
    x: MARGIN, y: ctx.y - 18, width: CONTENT_W, height: 22, color: NAVY,
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
    const heading = `${idx + 1}. ${w.name || "Unnamed Witness"}${w.position ? "  -  " + w.position : ""}${w.company ? "  (" + w.company + ")" : ""}`;
    paragraph(ctx, heading, { font: ctx.fonts.bold });
    if (w.summary)             paragraph(ctx, w.summary, { indent: 15 });
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
      for (const [k, v] of Object.entries(localReview)) {
        if (k === "id" || k === "incident_id" || k === "created_at" || k === "updated_at") continue;
        if (typeof v === "string" && v.trim()) {
          paragraph(ctx, prettify(k) + ":", { font: ctx.fonts.bold });
          paragraph(ctx, v as string, { indent: 15 });
          ctx.y -= 3;
        }
      }
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
      if (fiveWhy.root_cause) {
        paragraph(ctx, "Root Cause:", { font: ctx.fonts.bold, color: DANGER });
        paragraph(ctx, fiveWhy.root_cause, { indent: 15 });
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

function drawCorrectiveActions(ctx: Ctx, cas: any[]) {
  if (cas.length === 0) return;
  sectionTitle(ctx, "CORRECTIVE ACTIONS");
  cas.forEach((c, idx) => {
    ensureSpace(ctx, 50);
    paragraph(ctx, `${idx + 1}. ${c.description || c.action || ""}`, { font: ctx.fonts.bold });
    if (c.hierarchy_of_controls) {
      const lvl = c.hierarchy_level || 0;
      const hColor = lvl <= 2 ? SUCCESS : lvl <= 4 ? WARNING : DANGER;
      ensureSpace(ctx, 14);
      ctx.page.drawText("Hierarchy:", {
        x: MARGIN + 15, y: ctx.y, size: 8, font: ctx.fonts.bold, color: TEXT,
      });
      ctx.page.drawText(`${c.hierarchy_of_controls} (Level ${lvl})`, {
        x: MARGIN + 70, y: ctx.y, size: 8, font: ctx.fonts.bold, color: hColor,
      });
      ctx.y -= 12;
    }
    row(ctx, "Owner",     c.owner || "");
    row(ctx, "Due Date",  formatDate(c.due_date));
    row(ctx, "Status",    c.status || "Open");
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
      const path = extractStoragePath(photo.file_url);
      if (!path) continue;
      const bucket = pickBucket(photo.file_url);

      const { data: blob, error } = await supabase.storage.from(bucket).download(path);
      if (error || !blob) {
        console.warn(`Skip photo ${photo.id}: ${error?.message}`);
        continue;
      }

      const original = new Uint8Array(await blob.arrayBuffer());
      let compressedBytes: Uint8Array;

      try {
        const img = await Image.decode(original);
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
        compressedBytes = original;
      }

      let pdfImg;
      const isPng = /\.png$/i.test(photo.file_url);
      try {
        pdfImg = isPng && compressedBytes === original
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

function drawFooters(pdf: PDFDocument, fonts: any) {
  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    p.drawLine({
      start: { x: MARGIN, y: 30 }, end: { x: PAGE_W - MARGIN, y: 30 },
      thickness: 0.5, color: BORDER,
    });
    p.drawText("SLP Alaska  -  AnthroSafe Investigation Workbench", {
      x: MARGIN, y: 18, size: 7, font: fonts.regular, color: MUTED,
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

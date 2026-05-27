// ============================================================================
// supabase/functions/send-weekly-reports/index.ts
//
// PORTAL REPO (deploy via Supabase CLI from SLPAlaska/slp-safety-portal).
//
// This is a FULL FILE REPLACEMENT. Previous version (948 lines) did its own
// 40-table data fetch with custom calculations — drifted from the portal
// Dashboard's logic.
//
// New version:
//   1. For each company in email_recipients, calls the portal API route
//      /api/dashboard-metrics — which runs the SAME getDashboardData() that
//      powers the portal Dashboard and external view page.
//   2. Adapts the response to the shape the email HTML template expects.
//   3. Sends the email via Resend.
//
// Required Edge Function secrets (set via `supabase secrets set ...`):
//   - RESEND_API_KEY               (existing)
//   - SUPABASE_URL                 (auto-provided)
//   - SUPABASE_SERVICE_ROLE_KEY    (auto-provided)
//   - DASHBOARD_API_URL            NEW — e.g. https://portal.slpalaska.com/api/dashboard-metrics
//   - DASHBOARD_API_SECRET         NEW — same value as Vercel's DASHBOARD_API_SECRET env var
// ============================================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const DASHBOARD_API_URL = Deno.env.get("DASHBOARD_API_URL");
const DASHBOARD_API_SECRET = Deno.env.get("DASHBOARD_API_SECRET");

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

// ============================================================================
// HELPERS
// ============================================================================

function getLastWeekRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 7);
  return {
    year: end.getFullYear().toString(),
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
    startFormatted: start.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    endFormatted: end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
  };
}

// ---- Fetch metrics from the portal API ----
async function fetchCompanyMetrics(companyName: string, year: string): Promise<any> {
  if (!DASHBOARD_API_URL || !DASHBOARD_API_SECRET) {
    throw new Error(
      "DASHBOARD_API_URL / DASHBOARD_API_SECRET secrets not set on this Edge Function"
    );
  }

  const url = new URL(DASHBOARD_API_URL);
  url.searchParams.set("company", companyName);
  url.searchParams.set("location", "All");
  url.searchParams.set("year", year);

  const resp = await fetch(url.toString(), {
    headers: {
      "x-dashboard-secret": DASHBOARD_API_SECRET,
      "accept": "application/json",
    },
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`Dashboard API returned ${resp.status}: ${body.slice(0, 200)}`);
  }

  return await resp.json();
}

// ---- Adapter: map getDashboardData() output → shape the email template expects ----
//
// The HTML template (unchanged from the previous version) reads `data.metrics.X`.
// The portal API returns a richer nested structure. This translation layer keeps
// the email HTML identical so the format clients see doesn't change.
function adaptForEmail(data: any) {
  const bbs = data.bbsMetrics || {};
  const sif = data.sifMetrics || {};
  const energy = data.energySourceMetrics || {};
  const lagging = data.laggingIndicators || {};
  const leading = data.leadingIndicators || {};
  const nearMiss = data.nearMissMetrics || {};
  const eng = data.engagementMetrics || {};
  const lsr = data.lsrAuditCounts || {};

  const openIncidents = lagging.openIncidents ?? 0;
  const closedIncidents = lagging.closedIncidents ?? 0;
  const sailOpen = lagging.sailOpen ?? 0;

  return {
    metrics: {
      // ---- Hero scores ----
      safetyCultureIndex: data.safetyCultureIndex ?? 0,
      predictiveRiskScore: data.predictiveRiskScore ?? 0,
      riskForecast30Day: data.riskForecast30Day ?? 0,

      // ---- BBS ----
      totalBBS: bbs.total ?? 0,
      safeObs: bbs.safe ?? 0,
      atRiskObs: bbs.atRisk ?? 0,
      safeRatio: typeof bbs.safeRatio === "number" ? Number(bbs.safeRatio.toFixed(1)) : (bbs.safeRatio ?? 0),
      jobStops: bbs.jobStops ?? 0,
      jobStopRate: bbs.jobStopRate ?? 0,

      // ---- SIF ----
      sifPotentialRate: sif.sifPotentialRate ?? 0,
      sifPotentialCount: sif.sifPotentialCount ?? 0,
      totalEvents: sif.totalEvents ?? 0,

      // ---- Energy & Controls ----
      energyTypes: energy.byEnergyType ?? {},
      controlHierarchyScore: energy.controlHierarchyScore ?? 0,

      // ---- Engagement (HTML template uses these directly) ----
      daysSinceLastSubmission: eng.daysSinceLastSubmission ?? 0,
      uniqueSubmitters: eng.uniqueSubmitters ?? 0,
      participationRate: eng.participationRate ?? null,

      // ---- Leading (template reads m.leadingIndicators.X) ----
      leadingIndicators: {
        bbsObservations: leading.bbsObservations ?? 0,
        thas: leading.thas ?? 0,
        hazardIds: leading.hazardIds ?? 0,
        safetyMeetings: leading.safetyMeetings ?? 0,
        toolboxMeetings: leading.toolboxMeetings ?? 0,
        hseContacts: leading.hseContacts ?? 0,
        lsrAudits: lsr.total ?? 0,
      },

      // ---- Lagging (template reads m.laggingIndicators.X) ----
      laggingIndicators: {
        totalIncidents: openIncidents + closedIncidents,
        openIncidents: openIncidents,
        openSail: sailOpen,
        propertyDamage: lagging.propertyDamage ?? 0,
      },

      // ---- Ratios ----
      leadLagRatio: data.leadLagRatio ?? 0,

      // ---- Near Miss ----
      nearMissTotal: nearMiss.totalReported ?? 0,
      nearMissHigh: nearMiss.bySeverity?.high ?? 0,
      nearMissMed: nearMiss.bySeverity?.medium ?? 0,
      nearMissLow: nearMiss.bySeverity?.low ?? 0,

      // ---- LSR counts ----
      lsrAuditCounts: {
        total: lsr.total ?? 0,
        lineOfFire: lsr.lineOfFire ?? 0,
        liftingOps: lsr.liftingOperations ?? 0,
        workPermits: lsr.workPermits ?? 0,
        fallProtection: lsr.fallProtection ?? 0,
        driving: lsr.driving ?? 0,
        confinedSpace: lsr.confinedSpace ?? 0,
        energyIsolation: lsr.energyIsolation ?? 0,
      },

      // ---- Open Items ----
      openItems: data.openItems ?? [],
      totalOpenItems: openIncidents + sailOpen,

      // ---- Focus areas (normalize: ensure each has source/severity for the badge) ----
      areasNeedingFocus: (data.areasNeedingFocus ?? []).map((a: any) => ({
        source: a.source || a.topCompany || "—",
        category: a.category || "—",
        issue: a.issue || "—",
        count: a.count ?? 0,
        severity: a.severity || (a.count >= 5 ? "high" : a.count >= 2 ? "medium" : "low"),
      })),
    },
  };
}

// ============================================================================
// EMAIL HTML — preserved from the previous version, unchanged.
// Reads from `data.metrics.X` exactly as before, so client-facing layout
// doesn't shift.
// ============================================================================
function generateEmailHTML(companyName: string, data: any, dateRange: any, companyToken: string) {
  const m = data.metrics;

  const dashboardLink = companyToken
    ? `https://slp-safety-dashboard.vercel.app/view/${companyToken}`
    : "https://slp-safety-dashboard.vercel.app";

  const getScoreColor = (score: number, inverse = false) => {
    if (inverse) return score <= 30 ? "#22c55e" : score <= 50 ? "#eab308" : "#ef4444";
    return score >= 70 ? "#22c55e" : score >= 50 ? "#eab308" : "#ef4444";
  };
  const getRatioColor = (ratio: number) =>
    ratio >= 5 ? "#22c55e" : ratio >= 2 ? "#eab308" : "#ef4444";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Weekly Safety Report - ${companyName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; margin: 0; padding: 20px; color: #e2e8f0; }
    .container { max-width: 900px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #1e3a5f 0%, #0f766e 100%); padding: 24px; border-radius: 12px; margin-bottom: 20px; text-align: center; }
    .header h1 { margin: 0; font-size: 20px; color: white; }
    .header .company { font-size: 28px; font-weight: 700; color: #5eead4; margin: 8px 0; }
    .header .date-range { background: rgba(255,255,255,0.15); padding: 6px 16px; border-radius: 20px; display: inline-block; font-size: 12px; color: white; }
    .score-row { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
    .score-card { flex: 1; min-width: 100px; background: #1e293b; border-radius: 10px; padding: 14px 10px; text-align: center; border-top: 3px solid #3b82f6; }
    .score-label { font-size: 9px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
    .score-value { font-size: 26px; font-weight: 700; line-height: 1.1; }
    .score-detail { font-size: 9px; color: #64748b; margin-top: 4px; }
    .panel-row { display: flex; gap: 16px; margin-bottom: 16px; }
    .panel { flex: 1; background: #1e293b; border-radius: 10px; overflow: hidden; }
    .panel-header { padding: 10px 14px; font-size: 12px; font-weight: 600; color: white; display: flex; align-items: center; gap: 8px; }
    .panel-content { padding: 14px; }
    .metrics-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
    .metric { background: #0f172a; border-radius: 6px; padding: 10px; text-align: center; }
    .metric-value { font-size: 22px; font-weight: 700; }
    .metric-label { font-size: 8px; color: #64748b; text-transform: uppercase; margin-top: 2px; }
    .progress-bar { height: 8px; background: #334155; border-radius: 4px; overflow: hidden; margin: 4px 0; }
    .progress-fill { height: 100%; border-radius: 4px; }
    .table-section { background: #1e293b; border-radius: 10px; overflow: hidden; margin-bottom: 16px; }
    .table-header { padding: 10px 14px; font-size: 12px; font-weight: 600; color: white; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { background: #0f172a; color: #94a3b8; padding: 8px 10px; text-align: left; font-weight: 500; text-transform: uppercase; font-size: 9px; }
    td { padding: 8px 10px; border-bottom: 1px solid #334155; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 9px; font-weight: 600; }
    .badge-high { background: #7f1d1d; color: #fca5a5; }
    .badge-medium { background: #78350f; color: #fcd34d; }
    .badge-low { background: #1e3a5f; color: #93c5fd; }
    .badge-open { background: #7f1d1d; color: #fca5a5; }
    .badge-safe { background: #064e3b; color: #6ee7b7; }
    .badge-atrisk { background: #7f1d1d; color: #fca5a5; }
    .days { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600; }
    .days-critical { background: #dc2626; color: white; }
    .days-warning { background: #f97316; color: white; }
    .days-ok { background: #22c55e; color: white; }
    .footer { text-align: center; padding: 20px; font-size: 11px; color: #64748b; border-top: 1px solid #334155; margin-top: 20px; }
    .footer a { color: #5eead4; text-decoration: none; font-weight: 600; }
    .green { color: #22c55e; }
    .yellow { color: #eab308; }
    .red { color: #ef4444; }
    .orange { color: #f97316; }
    .cyan { color: #22d3ee; }
    .purple { color: #a855f7; }
    @media (max-width: 600px) {
      .score-row { flex-direction: column; }
      .score-card { min-width: auto; }
      .panel-row { flex-direction: column; }
      .metrics-grid { grid-template-columns: 1fr 1fr; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Weekly Safety Report</h1>
      <div class="company">${companyName}</div>
      <div class="date-range">📅 ${dateRange.startFormatted} - ${dateRange.endFormatted}</div>
    </div>

    <div class="score-row">
      <div class="score-card" style="border-top-color: ${getScoreColor(m.safetyCultureIndex)}">
        <div class="score-label">Safety Culture Index</div>
        <div class="score-value" style="color: ${getScoreColor(m.safetyCultureIndex)}">${m.safetyCultureIndex}</div>
        <div class="score-detail">Target: 70+</div>
      </div>
      <div class="score-card" style="border-top-color: ${getScoreColor(m.predictiveRiskScore, true)}">
        <div class="score-label">Predictive Risk Score</div>
        <div class="score-value" style="color: ${getScoreColor(m.predictiveRiskScore, true)}">${m.predictiveRiskScore}</div>
        <div class="score-detail">Lower is better</div>
      </div>
      <div class="score-card" style="border-top-color: ${getScoreColor(m.riskForecast30Day, true)}">
        <div class="score-label">30-Day Forecast</div>
        <div class="score-value" style="color: ${getScoreColor(m.riskForecast30Day, true)}">${m.riskForecast30Day}</div>
        <div class="score-detail">${m.riskForecast30Day >= 50 ? "Elevated Risk" : "Low Risk"}</div>
      </div>
      <div class="score-card" style="border-top-color: ${getRatioColor(m.safeRatio)}">
        <div class="score-label">Safe/At-Risk Ratio</div>
        <div class="score-value" style="color: ${getRatioColor(m.safeRatio)}">${m.safeRatio}:1</div>
        <div class="score-detail">Target: 5:1</div>
      </div>
      <div class="score-card" style="border-top-color: #f97316">
        <div class="score-label">Job Stop Rate</div>
        <div class="score-value orange">${m.jobStopRate}%</div>
        <div class="score-detail">${m.jobStops} stops</div>
      </div>
      <div class="score-card" style="border-top-color: ${m.sifPotentialRate > 25 ? "#ef4444" : "#eab308"}">
        <div class="score-label">SIF Potential Rate</div>
        <div class="score-value" style="color: ${m.sifPotentialRate > 25 ? "#ef4444" : "#eab308"}">${m.sifPotentialRate}%</div>
        <div class="score-detail">${m.sifPotentialCount} of ${m.totalEvents} events</div>
      </div>
    </div>

    <div class="score-row">
      <div class="score-card" style="border-top-color: ${m.totalOpenItems > 3 ? "#ef4444" : m.totalOpenItems > 0 ? "#eab308" : "#22c55e"}">
        <div class="score-label">Open Items</div>
        <div class="score-value" style="color: ${m.totalOpenItems > 3 ? "#ef4444" : m.totalOpenItems > 0 ? "#eab308" : "#22c55e"}">${m.totalOpenItems}</div>
        <div class="score-detail">Requiring action</div>
      </div>
      <div class="score-card" style="border-top-color: ${m.leadLagRatio >= 10 ? "#22c55e" : m.leadLagRatio >= 5 ? "#eab308" : "#ef4444"}">
        <div class="score-label">Lead/Lag Ratio</div>
        <div class="score-value" style="color: ${m.leadLagRatio >= 10 ? "#22c55e" : m.leadLagRatio >= 5 ? "#eab308" : "#ef4444"}">${m.leadLagRatio}:1</div>
        <div class="score-detail">Target: 10:1+</div>
      </div>
      <div class="score-card" style="border-top-color: #06b6d4">
        <div class="score-label">Near Misses</div>
        <div class="score-value cyan">${m.nearMissTotal}</div>
        <div class="score-detail">More = better culture</div>
      </div>
      <div class="score-card" style="border-top-color: #a855f7">
        <div class="score-label">Control Quality</div>
        <div class="score-value purple">${m.controlHierarchyScore}</div>
        <div class="score-detail">Higher = better controls</div>
      </div>
    </div>

    <div class="panel-row">
      <div class="panel">
        <div class="panel-header" style="background: linear-gradient(135deg, #065f46 0%, #047857 100%);">👥 Engagement & Activity</div>
        <div class="panel-content">
          <div class="metrics-grid">
            <div class="metric">
              <div class="metric-value ${m.daysSinceLastSubmission <= 3 ? "green" : m.daysSinceLastSubmission <= 7 ? "yellow" : "red"}">${m.daysSinceLastSubmission}</div>
              <div class="metric-label">Days Since Activity</div>
            </div>
            <div class="metric">
              <div class="metric-value cyan">${m.uniqueSubmitters}</div>
              <div class="metric-label">Active Submitters</div>
            </div>
            ${m.participationRate !== null ? `
            <div class="metric">
              <div class="metric-value ${m.participationRate >= 50 ? "green" : m.participationRate >= 25 ? "yellow" : "red"}">${m.participationRate}%</div>
              <div class="metric-label">Participation Rate</div>
            </div>
            ` : ""}
          </div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-header" style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);">👀 BBS Observations</div>
        <div class="panel-content">
          <div style="text-align: center; margin-bottom: 12px;">
            <span style="font-size: 28px; font-weight: 700; color: #22c55e;">${m.safeObs}</span>
            <span style="font-size: 18px; color: #64748b; margin: 0 8px;">:</span>
            <span style="font-size: 28px; font-weight: 700; color: #ef4444;">${m.atRiskObs}</span>
          </div>
          <div class="metrics-grid">
            <div class="metric">
              <div class="metric-value green">${m.totalBBS}</div>
              <div class="metric-label">Total Observations</div>
            </div>
            <div class="metric">
              <div class="metric-value orange">${m.jobStops}</div>
              <div class="metric-label">Job Stops</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="panel-row">
      <div class="panel">
        <div class="panel-header" style="background: linear-gradient(135deg, #065f46 0%, #059669 100%);">📈 Leading Indicators</div>
        <div class="panel-content">
          <div class="metrics-grid">
            <div class="metric"><div class="metric-value green">${m.leadingIndicators.bbsObservations}</div><div class="metric-label">BBS</div></div>
            <div class="metric"><div class="metric-value green">${m.leadingIndicators.thas}</div><div class="metric-label">THA/JSA</div></div>
            <div class="metric"><div class="metric-value green">${m.leadingIndicators.hazardIds}</div><div class="metric-label">Hazard IDs</div></div>
            <div class="metric"><div class="metric-value green">${m.leadingIndicators.safetyMeetings + m.leadingIndicators.toolboxMeetings}</div><div class="metric-label">Meetings</div></div>
            <div class="metric"><div class="metric-value green">${m.leadingIndicators.hseContacts}</div><div class="metric-label">HSE Contacts</div></div>
            <div class="metric"><div class="metric-value green">${m.leadingIndicators.lsrAudits}</div><div class="metric-label">LSR Audits</div></div>
          </div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-header" style="background: linear-gradient(135deg, #991b1b 0%, #b91c1c 100%);">🎯 SIF Analytics</div>
        <div class="panel-content">
          <div style="text-align: center; margin-bottom: 12px;">
            <div style="font-size: 36px; font-weight: 700; color: ${m.sifPotentialRate > 25 ? "#ef4444" : "#eab308"};">${m.sifPotentialRate}%</div>
            <div style="font-size: 10px; color: #94a3b8;">${m.sifPotentialCount} of ${m.totalEvents} events had SIF potential</div>
          </div>
          <div class="metrics-grid">
            ${Object.entries(m.energyTypes).slice(0, 4).map(([type, count]: any) => `
            <div class="metric"><div class="metric-value orange">${count}</div><div class="metric-label">${type}</div></div>
            `).join("")}
          </div>
        </div>
      </div>
    </div>

    <div class="panel-row">
      <div class="panel">
        <div class="panel-header" style="background: linear-gradient(135deg, #991b1b 0%, #dc2626 100%);">📉 Lagging Indicators</div>
        <div class="panel-content">
          <div class="metrics-grid">
            <div class="metric"><div class="metric-value ${m.laggingIndicators.totalIncidents > 0 ? "red" : "green"}">${m.laggingIndicators.totalIncidents}</div><div class="metric-label">Incidents</div></div>
            <div class="metric"><div class="metric-value ${m.laggingIndicators.openIncidents > 0 ? "red" : "green"}">${m.laggingIndicators.openIncidents}</div><div class="metric-label">Open</div></div>
            <div class="metric"><div class="metric-value ${m.laggingIndicators.openSail > 0 ? "red" : "green"}">${m.laggingIndicators.openSail}</div><div class="metric-label">Open SAIL</div></div>
            <div class="metric"><div class="metric-value orange">${m.laggingIndicators.propertyDamage}</div><div class="metric-label">Prop. Damage</div></div>
          </div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-header" style="background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%);">🛡️ Near Misses & Hazards</div>
        <div class="panel-content">
          <div style="text-align: center; margin-bottom: 12px;">
            <div style="font-size: 36px; font-weight: 700; color: #22d3ee;">${m.nearMissTotal}</div>
            <div style="font-size: 10px; color: #94a3b8;">Total reported</div>
          </div>
          <div class="metrics-grid">
            <div class="metric"><div class="metric-value red">${m.nearMissHigh}</div><div class="metric-label">High</div></div>
            <div class="metric"><div class="metric-value yellow">${m.nearMissMed}</div><div class="metric-label">Medium</div></div>
          </div>
        </div>
      </div>
    </div>

    <div class="panel-row">
      <div class="panel" style="flex: 1;">
        <div class="panel-header" style="background: linear-gradient(135deg, #1e3a5f 0%, #0f766e 100%);">🔍 LSR Audits</div>
        <div class="panel-content">
          <div style="text-align: center; margin-bottom: 12px;">
            <div style="font-size: 36px; font-weight: 700; color: #22d3ee;">${m.lsrAuditCounts.total}</div>
            <div style="font-size: 10px; color: #94a3b8;">Total LSR audits</div>
          </div>
          <div class="metrics-grid">
            <div class="metric"><div class="metric-value cyan">${m.lsrAuditCounts.lineOfFire}</div><div class="metric-label">Line of Fire</div></div>
            <div class="metric"><div class="metric-value cyan">${m.lsrAuditCounts.liftingOps}</div><div class="metric-label">Lifting Ops</div></div>
            <div class="metric"><div class="metric-value cyan">${m.lsrAuditCounts.workPermits}</div><div class="metric-label">Work Permits</div></div>
            <div class="metric"><div class="metric-value cyan">${m.lsrAuditCounts.fallProtection}</div><div class="metric-label">Fall Protection</div></div>
            <div class="metric"><div class="metric-value cyan">${m.lsrAuditCounts.driving}</div><div class="metric-label">Driving</div></div>
            <div class="metric"><div class="metric-value cyan">${m.lsrAuditCounts.confinedSpace}</div><div class="metric-label">Confined Space</div></div>
          </div>
        </div>
      </div>
    </div>

    ${m.openItems.length > 0 ? `
    <div class="table-section">
      <div class="table-header" style="background: linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%);">🔴 Oldest Open Items</div>
      <table>
        <thead><tr><th>Form</th><th>Location</th><th>Status</th><th>Days Open</th></tr></thead>
        <tbody>
          ${m.openItems.map((item: any) => `
          <tr>
            <td>${item.form}</td>
            <td>${item.location}</td>
            <td><span class="badge badge-open">${item.status}</span></td>
            <td><span class="days ${item.daysOpen > 30 ? "days-critical" : item.daysOpen > 14 ? "days-warning" : "days-ok"}">${item.daysOpen}</span></td>
          </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
    ` : ""}

    ${m.areasNeedingFocus.length > 0 ? `
    <div class="table-section">
      <div class="table-header" style="background: linear-gradient(135deg, #7c2d12 0%, #9a3412 100%);">⚠️ Areas Needing Focus</div>
      <table>
        <thead><tr><th>Source</th><th>Category</th><th>Issue</th><th>Count</th><th>Severity</th></tr></thead>
        <tbody>
          ${m.areasNeedingFocus.map((item: any) => `
          <tr>
            <td>${item.source}</td>
            <td style="color: #f97316; font-weight: 600;">${item.category}</td>
            <td>${item.issue}</td>
            <td style="font-weight: 700; color: #f97316;">${item.count}</td>
            <td><span class="badge badge-${item.severity}">${item.severity.toUpperCase()}</span></td>
          </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
    ` : `
    <div style="background: #064e3b; border: 1px solid #10b981; border-radius: 10px; padding: 16px; text-align: center; margin-bottom: 16px;">
      <span style="font-size: 20px;">✅</span>
      <span style="color: #6ee7b7; font-weight: 600; margin-left: 8px;">No critical areas needing immediate attention!</span>
    </div>
    `}

    <div class="footer">
      <p style="margin-bottom: 12px;">View your full interactive dashboard at:</p>
      <p><a href="${dashboardLink}" style="font-size: 14px;">${dashboardLink}</a></p>
      <p style="margin-top: 16px; font-size: 10px;">
        Please do not reply to this email. For questions, contact <a href="mailto:brian@slpalaska.com">brian@slpalaska.com</a>
      </p>
      <p style="margin-top: 12px; font-size: 10px; color: #64748b;">
        AnthroSafe™ Powered by Field Driven Data™ © 2026 SLP Alaska, LLC
      </p>
    </div>
  </div>
</body>
</html>
`;
}

// ============================================================================
// SEND VIA RESEND — preserved unchanged
// ============================================================================
async function sendEmail(to: string[], subject: string, html: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "SLP Safety Reports <reports@slpalaska.com>",
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
// SERVE — for each company, fetch metrics from the portal API, format, send.
// ============================================================================
serve(async (req) => {
  try {
    const dateRange = getLastWeekRange();

    // Recipients grouped by company
    const { data: recipients, error: rcptErr } = await supabase
      .from("email_recipients")
      .select("*")
      .eq("is_active", true);
    if (rcptErr) throw rcptErr;

    // Tokens for dashboard links
    const { data: tokens } = await supabase
      .from("company_view_tokens")
      .select("company_name, token")
      .eq("is_active", true);

    const tokenMap = new Map<string, string>();
    for (const t of tokens || []) tokenMap.set(t.company_name, t.token);

    const companiesMap = new Map<string, string[]>();
    for (const r of recipients || []) {
      const emails = companiesMap.get(r.company_name) || [];
      emails.push(r.email);
      companiesMap.set(r.company_name, emails);
    }

    const results: any[] = [];

    // TEST MODE — flip to true to send all output to TEST_EMAIL only.
    const TEST_MODE = false;
    const TEST_EMAIL = "brian@slpalaska.com";

    const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

    let i = 0;
    for (const [companyName, emails] of companiesMap) {
      try {
        if (i++ > 0) await delay(1500); // be nice to Resend's rate limits

        const allRecipients = TEST_MODE
          ? [TEST_EMAIL]
          : [...emails, "brian@slpalaska.com"];
        const companyToken = tokenMap.get(companyName) || "";

        // 1. Pull metrics from the portal API (same source as the Dashboard)
        const raw = await fetchCompanyMetrics(companyName, dateRange.year);

        // 2. Adapt to the shape the HTML template expects
        const adapted = adaptForEmail(raw);

        // 3. Generate + send
        const html = generateEmailHTML(companyName, adapted, dateRange, companyToken);
        const subject = `Weekly Safety Report - ${companyName} (${dateRange.startFormatted} - ${dateRange.endFormatted})`;
        const sent = await sendEmail(allRecipients, subject, html);

        results.push({
          company: companyName,
          recipients: allRecipients.length,
          status: "sent",
          id: sent.id,
        });
        console.log(`✓ Sent report to ${companyName} (${allRecipients.length} recipients)`);
      } catch (err: any) {
        results.push({ company: companyName, status: "error", error: err.message });
        console.error(`✗ Error sending to ${companyName}:`, err.message);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        dateRange,
        companiesProcessed: results.length,
        results,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

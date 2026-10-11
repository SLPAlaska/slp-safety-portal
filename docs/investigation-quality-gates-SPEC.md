# SLP Safety Portal: Investigation Quality Gates (SPEC, not built)

**Owner:** Brian Walden, CSP (SLP Alaska) · **Status:** Draft for approval · **Date:** Oct 11, 2026
**Repo:** SLPAlaska/slp-safety-portal · **DB:** Supabase `iypezirwdlqpptjpeeyf`
**Why:** INC-2026-0085 and 0086 had every box filled and were still not acceptable. The overfill was never questioned. "Lack of training" was the root cause even though the investigator's own answers contradicted it. 0085 had no CA, and 0086 had only a train-plus-SOP CA. The system should catch these problems before Brian has to.

> **Design rule:** A gate blocks only for a reason you could defend to an auditor. Each block tells the investigator **what is missing, why it matters, and how to fix it in one step**. The gate checks that the work is complete and consistent. It does not judge whether the investigator's conclusions are right. Brian still does that.

---

## 0. What exists today (build on it, don't duplicate)

| Piece | Where | Reuse |
|---|---|---|
| Status flow | `Submitted → Triage → First Draft → Asset Review → Final Review → Pending Approval → Approved → Closed` (workbench `[id]/page.js` L56) | Gates fire on transitions **into Pending Approval, Approved, Closed** and on **PDF export** |
| Spell/grammar gate | `inv_text_gate`, `inv_report_text_gate()`, DB trigger refuses Approved/Closed without a pass; `ReportTextGate.js`; `/api/investigation-text-gate` (PR #2) | Same pattern: DB function returns a checklist, DB trigger enforces it, UI shows the same list. The spell gate becomes **one line** in the new checklist. |
| Interview Guide | `inv_question_banks` (core, 20 hazard banks, culture, rootcause; each with `preferred_ca`), `inv_question_bank` (`is_critical`, `trigger` jsonb, stage), `inv_question_responses` (`answer_choice[]`, `answer_text`, `fact_status`, `not_applicable` + `na_reason`) | System-cause prompts are **new rows in existing banks** plus a `gate` flag. No new tables are needed for questions. |
| CA hierarchy | `investigation_corrective_actions.hierarchy_level` 1 Elimination · 2 Substitution · 3 Engineering · 4 Administrative · 5 PPE; justification is already required for levels 4–5 | The physical-control gate reads `hierarchy_level <= 3` |
| 1904 classification lock | PR #16 | Becomes one checklist line ("1904 decision recorded") for injury/illness types |
| Confidential vs conclusions PDF split | pending | The export gate applies to the **conclusions PDF**. The confidential packet is internal and stays ungated (see §6). |

---

## 1. Gate list

Each gate is one row in a **Quality Checklist** panel at the top of the investigation, shown as a red/amber/green list. A check is either:
- **BLOCK**: cannot move to Pending Approval / Approved / Closed and cannot export the conclusions PDF.
- **WARN**: shown in amber. The investigator can move on but must type a one-line reason, which is stored and printed in the reviewer view so Brian sees it.

The same server function (`inv_quality_gate(incident_uuid)`) feeds the UI, the status trigger, and the PDF edge function. There is one source of truth, and it can't be bypassed from the browser.

### 1A. Gates at Pending Approval / Approve / Close

| # | Gate | Level | Investigator sees (coaching tone) |
|---|---|---|---|
| G1 | Spelling & grammar pass (existing) | BLOCK | "Clean up the flagged spelling first. Reviewers and clients read this word for word." |
| G2 | Core questions answered: U1, U3, U4, U6, U8, U12 (answer, or N/A + reason ≥ 15 chars) | BLOCK | "U6 (was the right tool at the work location?) isn't answered yet. This is usually where the real fix shows up." |
| G3 | Every `is_critical` question in each hazard bank attached to this incident is answered or N/A with a reason | BLOCK | "The Chemical bank has 2 critical questions open: C1 (product + SDS) and C8 (exposure response)." |
| G4 | **Triggered system-cause prompts** answered (see §2) | BLOCK | "This was an overfill/transfer event. Before approval, answer SC-OVR1: *Why was it possible to overfill?*" |
| G5 | Root-cause set R1, R2, R3, R5, R6, R7 answered. R1 ≥ 40 chars and not a "training-only" phrase (see §4 C1) | BLOCK | "R1 asks for the *mechanism*, meaning what physically happened. 'Lack of training' tells us who, not how. Try: 'Ethylene glycol entered the mouth while siphoning through a 32-inch hose because…'" |
| G6 | At least **1 CA** linked to the incident (or a Brian-only "No CA warranted" override with a reason) | BLOCK | "Every investigation needs at least one corrective action. Your answer to H5 (*keep air cleaner covers on stored motors*) looks like a strong one. Turn it into a CA?" *(button pre-fills the CA from the answer)* |
| G7 | **Physical-control CA** required when triggered (see §3) | BLOCK | "Your answers point to equipment/conditions (pump not at the bay). At least one CA needs to be Elimination, Substitution, or Engineering. Training and SOPs can stay as backup." |
| G8 | Every CA has: owner **with a valid email that isn't the investigator's own unless they actually own it**, due date ≥ today, verification method ≥ 20 chars, verify-by date ≥ due date | BLOCK | "CA #75 is due Nov 3, but the retraining it depends on is Oct 21. Line these up. Verification needs who, how many, and by when, e.g. '3 observed coolant services by shop lead by Nov 15.'" |
| G9 | Every CA traces to a cause (`cause_category` + `cause_text` filled, or linked to a question response) | BLOCK | "Which finding does this CA fix? Link it so the report reads cause → fix." |
| G10 | Evidence minimum: ≥1 photo; person(s) involved have **full name**; each witness has a statement (≥ 1 sentence) or "no witness" ticked | BLOCK | "Ched Isaac is listed as a witness but has no statement. Add 2–3 lines in his words, or mark him as 'present, did not see.'" |
| G11 | Injury/illness types: 1904 decision recorded (existing PR #16 lock) | BLOCK | "Record the OSHA 1904 decision (first aid / recordable / not work-related) before approval." |
| G12 | Chemical exposure: product named + SDS attached (C1) + medical/Poison Control response answered (C8) | BLOCK | "Name the exact product and attach the SDS. Ethylene vs propylene glycol changes the severity rating." |
| G13 | Contradiction checks (§4) | WARN (C1 BLOCK) | e.g. "R1 says 'lack of training', but C5 says he knew the health effects. Explain the gap or revise R1." |
| G14 | Late reporting: if `reported_at − occurred_at > 12h`, then "why late + what changes" is answered (new prompt SC-RPT1) | BLOCK | "This was reported about 23 hours after it happened. Note why, and what will make it same-shift next time." |
| G15 | Potential severity reviewed when a high-hazard trigger fires (EG ingestion, stored energy, line of fire, height > 6 ft, suspended load) | WARN | "Potential severity is set to F. Ethylene glycol ingestion can be fatal. Confirm F or re-rate." |
| G16 | Lessons Learned can't be **published** before the incident is Approved | BLOCK on publish | "Lessons publish after approval so we don't share a conclusion that might change." |
| G17 | Team lead assigned + local review done (existing fields) | BLOCK | "Assign a team lead. A second set of eyes is part of our standard." |

### 1B. Export gate (conclusions PDF / report generator)

- **Client-facing conclusions PDF:** blocked until G1–G12, G14, G17 pass, **or** the status is Approved/Closed (which already proves they passed). If blocked, the button reads **"Draft PDF (not for distribution)"** and every page carries a diagonal **DRAFT, NOT APPROVED** watermark. The investigator can still print a working copy without it being mistaken for the final.
- **Confidential investigation packet:** internal use, no gate, always watermarked **CONFIDENTIAL, INTERNAL**.
- Export runs `inv_quality_gate()` inside `generate-investigation-pdf` on the server. The UI-only check is for display.

### 1C. Who can override
- **Only Brian** (role `owner`/`super_admin`) can override a BLOCK, one gate at a time, with a reason. The override is logged in `investigation_activity_log` and printed on the reviewer page. Investigators cannot override.
- WARN reasons are written by the investigator and visible to the reviewer.

---

## 2. System-cause prompts (triggered, must answer)

**Mechanism:** add a `gate` boolean to `inv_question_bank` (default false) and use the existing `trigger` jsonb. A prompt becomes **required** when its trigger matches the incident. Trigger sources (simple, inspectable):
1. **Incident type / hazard bank attached** (e.g. bank `chemical` or `spill_env`).
2. **An answer chip** in another question (e.g. C3 = "Siphon by mouth", U6 = "Not at location").
3. **Narrative keywords** across description + U1 + R1 (case-insensitive word list per prompt, stored in `trigger.keywords`). Keywords only **add** questions. They never close or approve anything.

### New prompts (proposed codes, prefix `SC-`, attached to existing banks)

| Code | Bank | Prompt | Triggered by |
|---|---|---|---|
| SC-OVR1 | spill_env + chemical | **Why was it possible to overfill / over-pressure / release in the first place?** (fill method, gauge/sight glass, cold-fill line, metered dispenser, auto-shutoff, hot vs cold) | keywords: overfill, over fill, overflow, topped off, too full, burp, drain off, siphon, spill, release, leaked · or bank spill_env/chemical |
| SC-OVR2 | spill_env + chemical | Did the task need to be done at all (per OEM/service procedure), or did one error create a second, riskier task? | same as SC-OVR1 |
| SC-TOOL1 | core | **Where was the right tool, who had it, and why wasn't it at the point of use?** | U6 ∈ {Not at location, Not available, Damaged} · C4 = available-but-not-used/not here · keywords: couldn't find, missing, not here, borrowed, looking for |
| SC-TOOL2 | core | Who owns tool control/stocking for this location, and how would a missing tool get noticed before someone needs it? | same as SC-TOOL1 |
| SC-STORE1 | hand_ppe + line_of_fire | How is the item stored or staged, and does storage expose the hazard (edges, spacing, covers, height, reach)? | H1 = Sharp edge/burr · keywords: shelf, rack, pallet, bin, reaching, stored |
| SC-PRESS1 | core | The investigation recorded time pressure in one place and none in another. Which is it, and where did the pressure come from? | auto, when U2/U10/K6/U15 disagree (see §4 C3) |
| SC-NORM1 | culture | Has this method been used before by anyone, anywhere (including at home)? List known prior events. System lists same-company matches from the last 24 months. | U5/C7/K2 answered "others"/"seen before" **or** a same-company incident with the same bank in 24 months exists |
| SC-RPT1 | core | Why was this reported when it was, and what will make it reported same-shift next time? | report delay > 12h |
| SC-MED1 | chemical | Was Poison Control (1-800-222-1222) or a medical provider contacted? If not, who decided that and on what basis? | bank chemical + any ingestion/inhalation/eye keyword or C3 = Siphon by mouth |
| SC-GLV1 | hand_ppe | If gloves are the fix: which glove (spec/cut level), does it allow the task, and is it stocked at point of use? | any CA text mentions glove(s) or H4/H9 answered |

**Mapping to existing questions (no duplication):**
- Overfill → *new* SC-OVR1/2. Neither C2 ("why did the fluid need to move?") nor C11 ("why transfer at all?") asks why overfilling was possible. That was the exact gap in 0086.
- Missing tool → C4 + U6 exist but only record *that* the tool was missing. SC-TOOL1/2 ask *where it was and who owns it*.
- Storage → H5/H10 are close, but nothing asks about storage. SC-STORE1 covers the 0085 gap.
- Late reporting, medical decision → new (SC-RPT1, SC-MED1).

---

## 3. Corrective action gates

### 3.1 Minimum
- **G6:** at least 1 CA. The only exception is Brian's "No CA warranted" override with a reason (e.g. a true act-of-nature near miss with nothing to change).

### 3.2 Physical-control requirement (G7)
**Trigger: "this incident implicates equipment/conditions"** if ANY of these is true (each is a simple, explainable rule):
1. U6 answered anything other than "Yes" (tool/equipment/PPE not available, not at location, damaged).
2. U8 has text (a physical change was named), or R7 answered "Yes"/has text.
3. Any of H5, H10, C4, C9, C11, E3, E9, M2, M5, M8, S1, S10, V9–V11, or SC-TOOL1/SC-STORE1/SC-OVR1 has an answer that names a tool, guard, storage, or equipment condition (chip values flagged `physical: true` in `options`, or a text answer on those prompts).
4. The hazard bank is one of: stored_energy, line_of_fire, lifting_rigging, confined_space, electrical, excavation_trench, spill_env, chemical.

**Rule when triggered:** at least one open/planned CA with `hierarchy_level ≤ 3` (Elimination/Substitution/Engineering). Admin (4) and PPE (5) CAs stay allowed as **backup layers**.

**Escape hatch:** if no physical control is feasible, the investigator writes "why not" (≥ 60 chars). That shows as **WARN** to the investigator and requires **Brian's approval** (not the investigator's) to proceed. It is logged.

### 3.3 Admin-only quality checks (WARN, not block)
- A CA that is only train/retrain/remind/toolbox/counsel/SOP **and** has no attached document or date for the SOP. Message: "Attach the SOP or give it a due date and owner as its own CA."
- R12 (already in the bank) must be answered whenever **all** CAs are level 4–5.
- The bank's `preferred_ca` text is shown beside the CA form as a hint, e.g. Chemical: *"Closed-system transfer → stock pump at point of use → label… → training only if SDS knowledge gap proven."*

### 3.4 Never
- No keyword logic ever closes, completes, or verifies a CA. Closure stays human, with evidence (the same rule Brian already applies to the CA sweep).

---

## 4. Contradiction / evidence checks (few, high-signal)

| # | Check | Rule (plain) | Level | Message |
|---|---|---|---|---|
| C1 | **Training-only root cause vs knowledge shown** | R1 or R3 matches `^\s*(lack of|no|inadequate|insufficient)?\s*(tr|trn|training|train)\b.*$` with < 40 chars of other content **AND** any of: C5 = "Yes knew", U14 = trained/experienced, U5/C7 = "everyone does it"/"done before", K5 = "understood" | **BLOCK** | "Your answers show he knew the hazard and the right method. Training gaps are real when people *don't know*. Re-answer R1/R2 with what made the shortcut make sense at the time (U4)." |
| C2 | **"Tools available" vs tool missing** | Any CA/R-text says "proper tools", "tools available", "have the tools" **AND** U6 ≠ Yes or C4 indicates not at location | WARN | "The CA says the tools are available, but U6/C4 say the pump wasn't here. Which is it? If it wasn't at the bay, that's the fix." |
| C3 | **Pressure yes vs no** | U2/U10/U15 contain pressure/rushing/client/schedule **AND** K6 = None (or vice versa) | WARN → triggers SC-PRESS1 | "Pressure is recorded in U10 but K6 says none. Answer SC-PRESS1 to reconcile." |
| C4 | **First time vs seen before** | Any of "first time"/U5 = Only me **AND** any of C7/K2/U16 = seen before / done at home / others, **or** a same-company same-bank incident in 24 months | WARN → triggers SC-NORM1 | "You recorded 'first time' and 'seen this before'. MagTec also had INC-2026-0078 (glycol, July). Reconcile them in SC-NORM1." |
| C5 | **PPE-only fix vs PPE impractical** | Every CA is PPE/"wear gloves" **AND** H9 says gloves impractical, or H6 = no standard | **BLOCK** | "The fix is gloves, but your answers say gloves get in the way and there's no glove standard. Add a CA that removes the edge or changes storage, or answer SC-GLV1 with a glove people will actually wear." |
| C6 | **Same answer both ways** | a `multi` question has mutually exclusive chips (e.g. U2 "Client pressure" + "Nothing different") | WARN | "U2 has both 'Client pressure' and 'Nothing different'. Pick what's true." |
| C7 | **Truncated text** | any long-text answer ends mid-word (last token not in dictionary and no ending punctuation, and the field is ≥ 90% of max length or ends with "-") | WARN | "R3 looks cut off ('…equipm'). Finish the sentence." |

That's 7 checks. Anything beyond these goes into the human review list (§5). Each check shows the **exact quoted answers** it compared, so the investigator can see why it flagged.

---

## 5. Human judgment vs hard gate

| Hard gate (system) | Stays human (investigator → Brian) |
|---|---|
| Required questions answered or N/A with a reason | Whether the answers are **true** and complete |
| At least 1 CA; physical CA when triggered; CA fields complete and dates consistent | Whether the CA is the **right** fix and proportionate |
| Training-only root cause blocked when the answers contradict it | Whether training is in fact a root cause (Brian can override) |
| Evidence minimums (photo, full names, statements, SDS) | Quality of photos/statements; interview credibility |
| 1904 decision recorded | Correctness of the 1904 call (existing lock + Bonnie-style review) |
| Late-report and medical prompts answered | Discipline / HR / employment decisions (never in the gate) |
| Lessons can't publish pre-approval | Wording of the lesson (blame-free, decision-focused) |
| Spell/grammar | Tone, clarity for the client |
| — | Final **Approve** button: still Brian (or a designated approver). Gates only decide whether the button is *available*. |

**Principle:** the gate makes it impossible to *submit* a thin report. It does not make anything "approved by algorithm."

---

## 6. Phased ship

### P0 (this week, ~2–3 dev days) — the gates that would have stopped 0085/0086
1. **SQL 43:** `inv_question_bank.gate boolean default false`; seed SC-OVR1/2, SC-TOOL1/2, SC-STORE1, SC-RPT1, SC-MED1 (EN; ES text to follow in P1) with `trigger` jsonb.
2. **SQL 44:** `inv_quality_gate(p_incident uuid) returns jsonb` → `{status: pass|block|warn, items:[{key, level, label, message, fix_anchor, evidence[]}]}`, implementing **G1–G12, G14, G16, G17, C1, C5**.
   - `inv_gate_overrides(incident_uuid, gate_key, reason, by_email, at)` (Brian only, RLS: owner role).
   - `inv_gate_warn_acks(incident_uuid, gate_key, reason, by_email, at)`.
   - Extend the existing status trigger (from the text gate) so **Pending Approval / Approved / Closed** require `inv_quality_gate().status <> 'block'` (overrides count as pass). The error message lists the blocking items in plain words; the UI maps them via `textGateDbMessage`-style helper.
3. **UI:** a "Quality Checklist" panel at the top of the workbench; each line has a **Fix it** button that jumps to the field. The CA form gets "Create CA from this answer" on H5/U8/R6/R7/SC-* answers (pre-fills description + cause link). The hierarchy picker shows the bank's `preferred_ca`.
4. **Export:** `generate-investigation-pdf` calls the gate. If blocked, it produces a watermarked DRAFT only.
5. **Lessons:** the publish button is disabled until Approved.
6. **Backfill / test:** run the gate read-only against 0085 and 0086 and every Open/Under Review investigation. Report the counts to Brian **before** turning on the trigger. Feature flag `inv_feature_flags.quality_gate` per company, default **off** for clients and **on** for SLP's own investigators first.

**Acceptance test (P0):** with the current data, 0086 blocks on G4 (SC-OVR1, SC-TOOL1, SC-MED1), G5/C1 (R1 "Lack of tr"), G7 (no level ≤3 CA), G8 (date mismatch / vague verification), G10 (witness statement, full name), G12 (SDS), G14 (late). 0085 blocks on G6 (no CA), G11 (1904), G17 (team lead), C5, G10, G14. Once Todd fixes them per Brian's Oct 11 email, both pass.

### P1 (next 2 weeks)
- C2, C3, C4, C6, C7 contradiction WARNs + SC-PRESS1, SC-NORM1, SC-GLV1.
- G13, G15 severity re-rate prompt.
- Same-company prior-incident auto-list (feeds K4 / SC-NORM1).
- Spanish prompt text.
- Reviewer view: one page Brian reads that shows every WARN reason and override, with the quoted answers.

### P2 (30–60 days)
- Gate scorecard per investigator: first-pass rate and average blocks per report, shown as coaching rather than ranking.
- Client toggles: each client sets which WARNs become BLOCKs.
- Tie into the confidential/conclusions PDF split once that ships.
- Optional AI "reviewer notes" (suggestions only, never a gate, never auto-closes).

### SQL / migration summary
| Migration | Change | Reversible |
|---|---|---|
| SQL 43 | `gate` column + 7 SC prompts seed | drop column / delete codes |
| SQL 44 | `inv_quality_gate()`, `inv_gate_overrides`, `inv_gate_warn_acks`, RLS, grants | drop objects |
| SQL 45 | status-trigger extension behind `inv_feature_flags.quality_gate` | flag off = old behavior |
| SQL 46 (P1) | contradiction rules + `options[].physical` flags on chip values | data-only |

### UX copy samples (coaching tone)
- Panel header: **"Almost there. 4 items before this is ready for approval."**
- All green: **"This investigation meets the SLP standard. Ready for approval."**
- Block toast on status change: **"Not yet. 3 items need attention. Tap any item to jump straight to it."**
- Physical CA: **"Training helps, but it doesn't stop the next person who's in a hurry. Add one change to the tool, equipment, or setup."**
- Training-only: **"Your interviews show he knew the right way. Tell us what made the shortcut make sense that day. That's the root cause."**
- Override (Brian only): **"Override this check? Your reason will print on the reviewer page."**

### How this helps Todd look polished
- He gets the same coaching Brian gave in the Oct 11 email, **while he's working**, item by item, instead of as a rejection afterward.
- The "Create CA from this answer" button turns his own good findings (like covers on stored motors) into CAs automatically, so good ideas don't get lost.
- When the checklist is green, the PDF reads cause → fix → verification with no contradictions, which is what a client or auditor expects from a professional.
- Brian reviews judgment, not completeness.

---

## 7. Out of scope
- MagTec competency build (parked).
- Client CA/SAIL nag sends (dry_run stays on).
- Re-opening or editing 0085/0086 data. Todd reworks those per the Oct 11 email.
- AI auto-grading or any automated CA closure.

## 8. Decisions needed from Brian
1. Approve the P0 gate list as written (or strike lines).
2. Late-report threshold: **12h** (proposed) or end of shift?
3. Overrides: Brian only, or also a named SLP lead?
4. Roll-out: SLP investigators first, then which clients (MagTec first)?
5. Should C1 (training-only root cause) be a BLOCK (proposed) or a WARN?

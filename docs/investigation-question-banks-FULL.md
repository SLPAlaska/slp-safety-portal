# SLP Safety Portal — Full Incident Investigation Question Banks
**Audience:** Investigator / supervisor (workbench Interview Guide). Field report stays short (hazard type + work setting + brief what happened).
**Standard:** 25-year CSP investigator depth. Dig past “employee error.” Find latent causes, system causes, defense failures, and corrective actions that **eliminate or isolate** the hazard — counseling/training only when knowledge/skill is the *proven* cause.
**Prepared:** 2026-10-10 · **Status:** CONTENT SPEC — no SQL applied · pairs with `slp-incident-investigation-overhaul.md`

---

## How to use this document

| Tag | Meaning |
|---|---|
| **IP** | Injured / involved person |
| **SUP** | Supervisor / crew lead |
| **WIT** | Witness |
| **PEER** | Private peer (not involved; confidential) |
| **INV** | Investigator conclusion |
| **Crit ✔** | Required to close (or N/A with reason) |
| **chips** | One-tap answers (map to RCA categories) |
| **probe** | Auto-follow-up when a shallow chip is chosen |

**Design rules (from Brian / Todd email):**
1. First answer is not the last. “Forgot / didn’t follow / human error / complacent” → probe *why that was possible*.
2. Facts vs assumptions tagged on every answer (Verified · Stated by · Assumed).
3. No blame framing. Ask about the **decision and the conditions**, not “what did they do wrong.”
4. Corrective actions: **Elimination → Substitution → Engineering → Isolation → Admin → PPE**. Counseling-only / training-only CAs flagged unless cause is proven knowledge/skill.
5. Always ask **extent of condition** and **how we’ll verify the fix works**.
6. Banks are a floor. Investigator can add questions; N/A needs a one-line reason.

**Every investigation loads:** Universal core + selected hazard bank(s) + Culture block (when triggered) + Root-cause / close-out.

**Culture block triggers:** work setting = Shop/Yard **OR** repeat = true **OR** severity ≤ E **OR** PSIF / High Energy.

---

# PART A — UNIVERSAL CORE (every investigation)

## A. Universal (`core`) — 11 questions, 8 critical

| # | Audience | Question | Answer | Crit |
|---|---|---|---|---|
| U1 | IP | Walk me through the task start to finish. What were you doing right before, during, and after? | text/voice → seeds timeline | ✔ |
| U2 | IP/SUP | What was different about this job today vs. normal? | chips: New crew · New tool/equip · Weather · Rush/schedule · Late shift/fatigue · First time on task · Client pressure · Different location · Nothing different · Other + text | ✔ |
| U3 | INV | **What was the decision point?** At what moment was the choice made that led to this? | text | ✔ |
| U4 | IP | **Why did that make sense at the time?** | chips: Faster · Easier · Always done this way · Right gear not here · Didn’t see the hazard · Someone told me to · Thought it was fine · Other → **probe:** What made that OK here? Has it worked before without consequence? | ✔ |
| U5 | IP/WIT/SUP | **Is this how the job is normally done?** By you? By others? | Only me / Some people / Most people / Everyone / Don’t know → **probe if Most/Everyone:** How long has this been normal? Who knows? | ✔ |
| U6 | SUP | Was the right tool, equipment, and PPE available, in good condition, **at the work location**? | Yes · Available but not here · Damaged · Not stocked · Not owned · Wrong type → **probe if not Yes:** Why wasn’t the gap fixed before the job started? | ✔ |
| U7 | SUP | Was a JSA/THA done, and did it name **this** hazard with a control that was actually used? | No JSA · JSA missed it · Named but control not used · Named and controlled · JSA was copy-paste / generic → **probe:** Who reviewed it? Was it done at the job, or in the office? | ✔ |
| U8 | INV | **What physical change** (tool, equipment, setup, layout, process) would make this mistake impossible or much harder — rather than reminding people? | text (hierarchy of controls) | ✔ |
| U9 | SUP | Experience on this exact task? Short-service employee? Hours into shift / days into rotation? | chips: <1 mo · <6 mo · <2 yr · 2 yr+; hours on shift; SSE Y/N | – |
| U10 | IP/SUP | Was anyone rushing, distracted, or under time pressure? Where did the pressure come from? | chips: Self · Supervisor · Client · Schedule/bonus · Weather window · Peer · None + text | – |
| U11 | IP/WIT | Did anyone notice and say something? Did anyone think about stopping the job? Why or why not? | chips: Said something / ignored · Thought about it, didn’t · Didn’t notice · Stop Work used · Fear of pushback · “Not my job” | – |

### Universal — latent / system probes (offer under “Dig deeper”; auto-surface when U4/U5/U6/U7 trigger)

| # | Audience | Question | Crit |
|---|---|---|---|
| U12 | INV | Which **defenses** should have stopped this (procedure, JSA, PPE, guard, interlock, supervision, peer check, permit)? For each, why did it fail or get bypassed? | – |
| U13 | SUP/INV | Is there a **procedure–reality gap**? Does the written procedure match how the job is actually done under real time/crew/equipment constraints? | – |
| U14 | SUP | **Competency vs. experience:** Was the person trained and assessed on *this* task, or just “experienced in the trade”? When was last demonstration of competence? | – |
| U15 | INV | **Production pressure / goal conflict:** Did schedule, client demand, or resource shortage compete with doing it the safe way? How is that conflict normally resolved? | – |
| U16 | INV | **Normalization of deviance:** Has this shortcut been used successfully enough times that it stopped feeling like a risk? | – |

---

# PART B — HAZARD / MECHANISM BANKS

---

## B1. Hand / finger / PPE (`hand_ppe`) — Brian Incident 1 depth

| # | Audience | Question | Answer | Crit |
|---|---|---|---|---|
| H1 | IP | What exactly caused the injury? | chips: Sharp edge/burr · Wire/cable end · Pinch/crush · Tool slip · Rotating/spinning part · Hot surface · Chemical on skin · Other + photo | ✔ |
| H2 | IP | Was hand protection worn? What kind? | None · Cotton · Leather · Cut-rated (A1–A9) · Impact · Chemical-resistant · Wrong glove for hazard · Other | ✔ |
| H3 | IP | **If not worn (or wrong type): why not?** | Forgot · Didn’t think needed · Not available · Wrong size/type · Got in the way · Never wear them for this · Supervisor never enforces · Other → **probe:** What made that OK here? Have you/others done this task bare-handed before? | ✔ |
| H4 | INV | Would the *right* glove have prevented or reduced **this** injury? (Be honest — cotton doesn’t stop wire.) | Yes / Reduced / No / Unknown + note | ✔ |
| H5 | INV | Could a different tool, jig, guard, fixture, or method keep the hand **out of the hazard** altogether? | text (wire cutters vs hands, vise, push stick, deburr first, machine guard, tether) | ✔ |
| H6 | SUP | What are the **written** hand-protection expectations for this task? Are they enforced the same for everyone? | Written & enforced · Written, not enforced · Unwritten custom · None · Conflict between policy and practice | ✔ |
| H7 | SUP | Have supervisors seen people doing this task without required hand protection? What was done? | Never seen · Seen, said nothing · Seen, coached once · Seen, progressive discipline · Don’t know | – |
| H8 | SUP | Are the correct gloves **stocked at the point of use**, right sizes, replaced when worn? Who owns stocking? | Yes · Sometimes · No · Unknown | ✔ |
| H9 | IP | Was there anything about the task that made gloves impractical (dexterity, contamination, fit, wet, cold)? | text | – |
| H10 | INV | **Latent:** Is the tool/equipment designed so bare hands feel necessary (poor grip, no fixture, awkward access)? Can we redesign? | text | – |
| H11 | INV | Extent of condition: Where else do people put hands near wire, edges, pinch points, or rotating parts without the right glove or guard? | text | ✔ |
| H12 | INV | Verification: How will we confirm the new control (stocking, guard, glove spec, method) is actually used 30/60/90 days out? | text | ✔ |

**Preferred CA direction:** Eliminate hand-in-hazard (fixture, cutter, guard) → specify cut-rated glove at point of use → only then training if knowledge gap proven.

---

## B2. Chemical / fluid exposure (`chemical`) — Brian Incident 2 depth

| # | Audience | Question | Answer | Crit |
|---|---|---|---|---|
| C1 | SUP/INV | Exact product, concentration, SDS on file? Attach SDS. | product + SDS upload | ✔ |
| C2 | IP | What were you trying to accomplish, and **why did the fluid need to move?** | text | ✔ |
| C3 | IP | Method used | Siphon by mouth · Open pour · Wrong container · Pump · Transfer hose · Gravity drain · Other | ✔ |
| C4 | IP/SUP | Was a pump or proper transfer method available? If yes, why unused? If no, why not stop and get one? | Not available · Too far · Broken · Faster this way · Didn’t know it existed · Always done this way · No one trained on pump → probe | ✔ |
| C5 | IP | Did you know the health effects of *this* product (e.g. ethylene glycol ingestion is toxic)? Seen the SDS? | Yes · Partly · No · SDS not accessible at location | ✔ |
| C6 | SUP | Is the product stored/labeled where it could be mistaken for something drinkable or benign? (cf. unlabeled bottle incidents) | Yes / No + photo | ✔ |
| C7 | IP/WIT | Has this person or others moved fluid this way before? Is mouth-siphoning / open transfer normalized? | chips | ✔ |
| C8 | IP/SUP | Exposure response: eyewash/rinse used? Poison Control / medical contacted? Time to treatment? PPE during response? | checklist | ✔ if exposure |
| C9 | SUP | Secondary containment, spill kit, and PPE staged **before** transfer? | Yes · Partial · No | ✔ |
| C10 | SUP | Compatibility: right hose, fittings, container material for this chemical? | Yes · Wrong · Unknown | – |
| C11 | INV | **Latent:** Why does the process require transferring this fluid at all? Can we eliminate transfer (bulk, closed system, different product)? | text | ✔ |
| C12 | INV | Are labels, GHS pictograms, and secondary container rules practical and enforced in this shop? | text | – |
| C13 | INV | Extent of condition: Other fluids moved the same unsafe way? Other locations with missing pumps/labels? | text | ✔ |
| C14 | INV | Verification: Pump at point of use + observed transfers + SDS access check — how/when verified? | text | ✔ |

**Preferred CA:** Closed-system transfer / eliminate mouth contact path → stock pump at point of use → label/lock unlabeled containers → training only if SDS knowledge gap proven.

---

## B3. Vehicle / mobile equipment (`vehicle`)

| # | Audience | Question | Answer | Crit |
|---|---|---|---|---|
| V1 | IP/SUP | Was a pre-trip / circle check done? Did it catch the condition that mattered? | Done & caught · Done, missed it · Not done · Not required for this unit → probe if not done | ✔ |
| V2 | IP | Speed, road, visibility, weather, ice/gravel vs. limits and journey plan? | Within limits · Over · Conditions changed · No journey plan | ✔ |
| V3 | IP/WIT | Spotter / ground guide required? Used? Signals agreed before move? | Required & used · Required, not used · Not required but needed · N/A | ✔ |
| V4 | IP | 360° walk-around done immediately before moving? Blind spots known for this unit? | Yes · No · Partial | ✔ |
| V5 | SUP | Driver hours, fatigue, days into hitch, journey management compliance? | Within policy · Exceeded · Unknown | ✔ |
| V6 | IP | Distraction (phone, radio, passenger, schedule anxiety, eating)? | chips | ✔ |
| V7 | IP/SUP | Route, clearance, overhead lines, soft shoulders, gate/door known and marked? | Known · Assumed · Wrong info · Changed since last visit | ✔ |
| V8 | SUP | Who controlled the space (client ground guide, other contractor, public)? Communication method? | text | ✔ |
| V9 | SUP | Vehicle maintenance status: known defects, deferred repairs, tire/brake/light condition? | Fit · Known defect deferred · Unknown defect | ✔ |
| V10 | INV | Backup alarms, cameras, proximity sensors — fitted, working, used? | Yes · Fitted not working · Not fitted · Ignored | – |
| V11 | INV | **Latent:** Parking layout, one-way traffic, barriers, designated pedestrian paths — do they force safe movement or invite conflict? | text | ✔ |
| V12 | INV | Was towing, winching, or recovery involved? Rated gear? Exclusion zone? | text | – |
| V13 | INV | Extent of condition: Same unit type, same route, same driver pool — where else is this exposure? | text | ✔ |
| V14 | INV | Verification: Ride-alongs, DVIR audit, spotter compliance checks — method and date? | text | ✔ |

**Preferred CA:** Separate people from vehicles (barriers, one-way, no-go zones) → working cameras/alarms → journey management that can say no → training only for proven skill gaps (backing, winter driving).

---

## B4. Slip / trip / fall (`slip_trip_fall`) — includes falls from height

| # | Audience | Question | Answer | Crit |
|---|---|---|---|---|
| S1 | IP/SUP | Surface condition (ice, oil, mud, grating, stairs, cord, uneven) and **how long** it had been that way? | chips + duration | ✔ |
| S2 | SUP | Was the condition reported or known before the incident? What was done? | Reported & fixed · Reported, not fixed · Known, not reported · Unknown | ✔ |
| S3 | IP | Footwear / traction aids issued and worn for this surface? | Correct & worn · Issued, not worn · Wrong footwear · Not issued | ✔ |
| S4 | IP | Hands full? Three-point contact possible on stairs/ladders? | Yes hands free · Hands full · 3-point not possible | ✔ |
| S5 | IP/SUP | Lighting adequate for seeing the hazard? | Adequate · Marginal · Dark | – |
| S6 | IP/SUP | **If at height / fall from elevation:** Fall protection plan? Anchorage rated/inspected? Harness/SRL inspected and worn? Rescue plan rehearsed? | checklist — all ✔ if height | ✔ if height |
| S7 | SUP | Who owns housekeeping for this area? Is it staffed and timed (not “everyone’s job”)? | Named owner · Shared/vague · None | ✔ |
| S8 | SUP | Weather / freeze-thaw: ice control plan (sand, mats, heated walkways) executed before shift? | Yes · Partial · No · N/A | ✔ if ice/cold |
| S9 | INV | Ladder: right type, secured, 4:1, above landing, inspected? Or should it have been a lift/scaffold? | chips | ✔ if ladder |
| S10 | INV | **Latent:** Can we eliminate the elevated work or the walk-through hazard (relocate hose, cable trays, heated path, eliminate step)? | text | ✔ |
| S11 | INV | Extent of condition: Same surface class elsewhere on site/shop? | text | ✔ |
| S12 | INV | Verification: Housekeeping audits, ice logs, harness inspection records — how checked? | text | ✔ |

**Preferred CA:** Eliminate the walkway hazard or elevated task → engineering (mats, heat, guardrails, mezzanine) → named housekeeping owner → PPE/footwear last.

---

## B5. Stored energy / LOTO / pressure (`stored_energy`)

| # | Audience | Question | Answer | Crit |
|---|---|---|---|---|
| E1 | IP/SUP | Every energy source identified? (pressure, hydraulic, pneumatic, spring, electrical, gravity, thermal, chemical) | Full list documented · Partial · Not identified | ✔ |
| E2 | IP/SUP | Isolated, locked, **bled/verified zero energy** before work? Who verified, and **how** (gauge, try-start, bleed)? | Full LOTO + verify · Isolated, not verified · Partial · No LOTO | ✔ |
| E3 | SUP | Gauge, bleed, and relief where needed — readable from the work position? Working? | Yes · Gauge missing/wrong place · Relief inadequate | ✔ |
| E4 | SUP | Equipment tied into someone else’s system (client BOP, wellhead, coil, plant)? Who owned isolation? Written handover? | Our isolation · Client isolation · Shared/unclear · No handover | ✔ |
| E5 | SUP | Written procedure for **this configuration**? Does it match reality (valve count, bleed points, interlocks)? | Matches · Outdated · Generic · None | ✔ |
| E6 | IP | Body position relative to line of fire when energy could release? | Clear · In line of fire · Partially exposed | ✔ |
| E7 | SUP | Personal locks used? Group LOTO box? Keys controlled? Attempted start/pressurization after LOTO? | Compliant · Shortcut used · Unknown | ✔ |
| E8 | IP | Was there unexpected movement, residual pressure, or stored spring/gravity energy? | Yes residual · Unexpected move · None found | ✔ |
| E9 | INV | **Latent:** Can energy be designed out (bleed always open when open, captive key, pressure-indicating LOTO points, fail-safe)? | text | ✔ |
| E10 | INV | Competency: Was the person authorized/qualified for this LOTO? Last assessment? | Authorized · Assumed competent · Not authorized | ✔ |
| E11 | INV | Extent of condition: Same equipment family, same multi-employer isolation gaps elsewhere? | text | ✔ |
| E12 | INV | Verification: LOTO audits (field observation of verify-zero), procedure update control — method/date? | text | ✔ |

**Preferred CA:** Engineering that forces verify-zero → clear single-owner isolation → procedure that matches the real valve map → authorize-to-LOTO competency. Not “remember to bleed it.”

---

## B6. Manual handling / strain (`manual_handling`)

| # | Audience | Question | Answer | Crit |
|---|---|---|---|---|
| M1 | IP/SUP | Weight, size, shape, CG of load — how was weight known (marked, estimated, guessed)? | Known · Estimated · Guessed wrong | ✔ |
| M2 | IP/SUP | Mechanical aid available (dolly, hoist, crane, vacuum, second person)? Used? Why not? | Used · Available not used · Not available · Not practical → probe | ✔ |
| M3 | IP | Route: stairs, ice, distance, doorways, uneven ground? | chips | ✔ |
| M4 | SUP | Was the lift planned in the JSA with a weight and method? | Planned · “Two-man lift” vague · Not planned | ✔ |
| M5 | INV | Could the load be split, staged closer, pre-positioned by equipment, or purchased in smaller units? | text | ✔ |
| M6 | IP | Body position: twist, reach, below knees, above shoulders, one-handed? | chips | ✔ |
| M7 | SUP | Crew size vs. load — was there pressure to move it alone to save time? | Yes pressure · Chose alone · Adequate crew | – |
| M8 | INV | **Latent:** Storage height, packaging, delivery point — designed for safe handling or for warehouse convenience? | text | ✔ |
| M9 | INV | Prior strains on same task/crew? Early reporting culture for tweaks before recordable? | text | – |
| M10 | INV | Extent of condition + verification: Where else are >50 lb / awkward lifts routine without aids? How will aid use be confirmed? | text | ✔ |

**Preferred CA:** Eliminate the lift (deliver at height, break bulk) → hoist/dolly at point of use → only then technique training.

---

## B7. Line of fire / struck-by / caught-between / dropped object (`line_of_fire`)

| # | Audience | Question | Answer | Crit |
|---|---|---|---|---|
| L1 | IP/SUP | What struck / caught / crushed the person or nearly did? (load, tool, vehicle, pressure release, swinging object, falling object) | chips + photo | ✔ |
| L2 | SUP | Was an exclusion zone set, marked, and **respected**? Who enforced it? | Set & held · Set, violated · Not set · Informal “stay back” | ✔ |
| L3 | IP | Where was the body relative to the load, pinch point, or release path at the moment of contact? | text/sketch | ✔ |
| L4 | SUP | Tag lines / hands-free rigging used? Hands on load? | Tag lines · Hands on load · Pushing with body · N/A | ✔ |
| L5 | SUP | Dropped-object controls: tethering, toe boards, netting, tool inventory at height, DROPS calc? | In place · Partial · None · N/A ground level | ✔ if elevated work |
| L6 | IP/WIT | Warning before movement (horn, radio, eye contact)? | Yes · Assumed · No | ✔ |
| L7 | SUP | Pinch points between load and fixed objects identified in JSA? Barriers or stand-off used? | Yes · Identified not controlled · Not identified | ✔ |
| L8 | INV | Simultaneous operations (SIMOPS) — another crew creating the struck-by exposure? Coordination? | text | – |
| L9 | INV | **Latent:** Can we redesign so people never stand in the line of fire (remote release, longer tag lines, engineered stand-off, eliminate held-load work)? | text | ✔ |
| L10 | INV | Extent of condition: Same pinch/struck-by pattern on other jobs this week? | text | ✔ |
| L11 | INV | Verification: Exclusion-zone observations, tether audits — method/date? | text | ✔ |

**Preferred CA:** Keep people out of the line of fire by design → tethering/DROPS → exclusion enforced by role, not hope.

---

## B8. Crane / hoist / rigging / suspended load / wireline mast (`lifting_rigging`)

| # | Audience | Question | Answer | Crit |
|---|---|---|---|---|
| R1 | SUP | Lift plan class (critical / standard / informally “we’ve done this”)? Written plan for this lift? | Critical plan · Standard plan · Informal · None | ✔ |
| R2 | SUP | Load weight known (shipping weight, calculated, scale)? Rigging capacity and configuration match? | Known & within · Estimated · Unknown · Over capacity | ✔ |
| R3 | SUP | Rigging gear: inspected, tagged, right type (slings, shackles, softeners)? Who inspected today? | Current inspection · Expired/missing tag · Wrong gear · Homemade | ✔ |
| R4 | IP/SUP | Crane/hoist/mast: who is certified operator? Signal person qualified? Roles agreed? | Qualified · Assumed · Unqualified person ran it | ✔ |
| R5 | SUP | Ground conditions, outriggers, mats, overhead power, wind limits checked? | Yes · Partial · No | ✔ |
| R6 | IP | Suspended load: anyone under/near? Tag lines controlling spin? | Clear zone · Someone under · Partial | ✔ |
| R7 | SUP | **Wireline / mast / gin pole specific:** mast pins, guying, winch condition, overload protection, manufacturer limits? | Within limits · Unknown · Exceeded | ✔ if wireline/mast |
| R8 | SUP | Communication method (hand signals, radio) confirmed before lift? Blind lifts? | Confirmed · Assumed · Blind lift without plan | ✔ |
| R9 | INV | Two-blocking, anti-two-block device status? Limit switches bypassed? | Working · Bypassed · Not fitted | ✔ |
| R10 | INV | **Latent:** Recurring “informal” lifts that should be planned? Pressure to lift without a rigger? | text | ✔ |
| R11 | INV | Extent of condition: Same crane/rigging crew practices on other pads/shops? | text | ✔ |
| R12 | INV | Verification: Lift-plan audits, gear inspection sampling, operator cert currency — how/when? | text | ✔ |

**Preferred CA:** No lift without matching plan + known weight → remove bypassed safety devices → certified roles only → engineering (dedicated lift points, below-the-hook gear).

---

## B9. Confined space (`confined_space`)

| # | Audience | Question | Answer | Crit |
|---|---|---|---|---|
| CS1 | SUP | Was the space classified (permit-required / non-permit / alternate)? Classification correct? | Correct · Misclassified · Not classified | ✔ |
| CS2 | SUP | Entry permit completed, posted, and matched actual conditions? | Yes · Incomplete · No permit | ✔ |
| CS3 | SUP | Atmospheric testing: order (O₂, LEL, toxics), continuous monitoring, calibrated instrument, tester competent? | Full & continuous · Pre-entry only · Not tested · Wrong order | ✔ |
| CS4 | SUP | Attendant present, dedicated, able to communicate, **not** assigned other duties? | Dedicated · Shared duties · No attendant | ✔ |
| CS5 | SUP | Rescue plan: on-site vs. call-out, retrieval equipment staged, rescue team timed drill currency? | Rescue ready · Call-out only, untested · No plan | ✔ |
| CS6 | IP | Isolation of energy/product into the space (LOTO, blank, purge) verified? | Verified · Assumed · Not isolated | ✔ |
| CS7 | IP | PPE / respirator appropriate for atmosphere? Medical clearance / fit test current? | Yes · Wrong · Expired clearance | ✔ |
| CS8 | INV | **Latent:** Can the work be done **from outside** (eliminate entry)? Why was entry chosen? | text | ✔ |
| CS9 | INV | Hot work / chemicals introduced during entry? Re-test after break? | text | – |
| CS10 | INV | Extent + verification: Other vessels/pits entered informally? Permit audit method? | text | ✔ |

**Preferred CA:** Eliminate entry → engineering controls on atmosphere → real rescue capability (not paper) → permit discipline.

---

## B10. Hot work / fire / explosion (`hot_work`)

| # | Audience | Question | Answer | Crit |
|---|---|---|---|---|
| HW1 | SUP | Hot work permit issued for this location/time? Conditions on permit followed? | Permit followed · Permit, conditions skipped · No permit | ✔ |
| HW2 | SUP | Combustibles removed or protected within required radius? Floors, walls, hidden spaces checked? | Cleared · Partial · Not checked | ✔ |
| HW3 | SUP | Gas test in area / adjacent confined spaces before and during? | Yes continuous · Pre only · No | ✔ |
| HW4 | SUP | Fire watch: competent, equipped, **stayed for required duration after** work (incl. breaks)? | Full duration · Left early · None | ✔ |
| HW5 | IP | Equipment condition (torch, leads, grounding, spark containment)? | Good · Defective · Unknown | ✔ |
| HW6 | SUP | Fire extinguisher / hose staged and inspected at the work face? | Yes · Remote · Missing | ✔ |
| HW7 | INV | Why was hot work chosen vs. cold cutting / alternative method? | Necessary · Convenience · Only method known | ✔ |
| HW8 | INV | **Latent:** SIMOPS with fuel transfer, painting, or hydrocarbon systems? | text | ✔ |
| HW9 | INV | Extent + verification: Permit-to-work compliance sampling; fire-watch duration checks | text | ✔ |

**Preferred CA:** Substitute cold methods → engineered spark control → real fire watch (time-boxed, signed) → permit that can stop work.

---

## B11. Spill / environmental (`spill_env`)

| # | Audience | Question | Answer | Crit |
|---|---|---|---|---|
| SP1 | IP/SUP | Product, estimated volume, where it went (soil, water, containment, snow)? | product + volume + pathway | ✔ |
| SP2 | SUP | Secondary containment staged **before** transfer/storage? Capacity adequate? | Yes · Undersized · None | ✔ |
| SP3 | IP | Connection, hose, fitting, valve — inspected before use? Failure mode? | Inspected · Not inspected · Known bad hose | ✔ |
| SP4 | SUP | Response timeline: discover → stop source → contain → notify (internal / ADEC / NRC as required)? | On time · Late notify · Not notified yet | ✔ |
| SP5 | SUP | Spill kit at point of use, stocked, right sorbent for product? | Yes · Empty/wrong · Remote | ✔ |
| SP6 | INV | Transfer practice: attended? Overfill protection? Night/weather factors? | Attended · Left unattended · Overfill no alarm | ✔ |
| SP7 | INV | **Latent:** Can we eliminate the transfer, reduce volume stored, or hard-pipe instead of hose? | text | ✔ |
| SP8 | INV | Regulatory / client notification complete and documented? Samples if required? | checklist | ✔ |
| SP9 | INV | Extent + verification: Same hose/fitting class elsewhere; containment inspection program | text | ✔ |

**Preferred CA:** Eliminate hose transfers where practical → containment + overfill engineering → kit at point of use → notification drill.

---

## B12. Electrical (`electrical`)

| # | Audience | Question | Answer | Crit |
|---|---|---|---|---|
| EL1 | SUP | Was the circuit treated as live or verified dead? Method of verification (test-before-touch, proving unit)? | Verified dead · Assumed dead · Worked live | ✔ |
| EL2 | SUP | LOTO on electrical energy — lock, tag, try? Qualified person? | Full · Partial · None · Not qualified | ✔ |
| EL3 | IP | Approach boundaries / arc-flash PPE for the task — known and worn? | Correct PPE · Wrong/none · Boundaries unknown | ✔ |
| EL4 | SUP | GFCI / residual current used on temporary power? Cord/tool condition? | GFCI used · Missing · Damaged cord | ✔ |
| EL5 | SUP | Overhead power lines: distance, spotter, flagged? | Clearance OK · Encroached · Not assessed | ✔ if mobile equip/crane |
| EL6 | INV | Panels labeled, one-lines current, legacy wiring known? | Current · Outdated · Unknown legacy | – |
| EL7 | INV | **Latent:** Why was live work (or assumed-dead work) chosen? Can we design out exposure (disconnect location, insulated tools, remote racking)? | text | ✔ |
| EL8 | INV | Extent + verification: Temporary power audits, qualified-person list currency | text | ✔ |

**Preferred CA:** Dead & verified always · GFCI on temp power · arc-flash labels + PPE by task · eliminate live work by design.

---

## B13. Excavation / trenching (`excavation_trench`)

| # | Audience | Question | Answer | Crit |
|---|---|---|---|---|
| X1 | SUP | Competent person designated and present? Soil classified? | Yes · Named but absent · No competent person | ✔ |
| X2 | SUP | Protection system (slope, bench, shoring, shield) match depth/soil? Inspected today? | Correct & inspected · Wrong system · None | ✔ |
| X3 | SUP | Utility locate (811 / private) completed, marks visible, hand-dig tolerance zones respected? | Complete · Marks faded · No locate · Dug on marks | ✔ |
| X4 | IP | Spoils, equipment, materials set back ≥2 ft from edge? Water accumulation controlled? | Yes · Encroached · Water in trench | ✔ |
| X5 | SUP | Access/egress within 25 ft of lateral travel? Protected? | Yes · Inadequate · None | ✔ |
| X6 | SUP | Atmospheric hazard in excavation (if deep / contiguous with space)? | Tested · Not tested · N/A | – |
| X7 | INV | **Latent:** Pressure to dig before locate / before shoring arrived? Who can stop the dig? | text | ✔ |
| X8 | INV | Extent + verification: Other open excavations on job; daily competent-person log audit | text | ✔ |

**Preferred CA:** No dig without locate + protection → competent person with stop authority → engineered shields for recurring work.

---

## B14. Wildlife / bear / animal (`wildlife_bear`) — Alaska emphasis

| # | Audience | Question | Answer | Crit |
|---|---|---|---|---|
| W1 | IP/SUP | Species, behavior (defensive / predatory / food-conditioned), distance, time of day? | text | ✔ |
| W2 | SUP | Was a wildlife / bear plan in effect for this location and season? Briefed to crew? | Plan & briefed · Plan exists, not briefed · No plan | ✔ |
| W3 | SUP | Food, trash, attractants secured (bear-resistant, burned, removed)? | Secured · Attractants present · Unknown | ✔ |
| W4 | IP | Deterrents available and serviceable (bear spray accessible, horn, firearm policy if applicable)? Training current? | Available & trained · Available, not accessible · None | ✔ |
| W5 | SUP | Work alone / travel on foot / brush clearing — risk assessed? Buddy system? | Assessed · Alone in habitat · N/A | ✔ |
| W6 | SUP | Reporting chain for sightings; work stopped / relocated when appropriate? | Reported & acted · Sighting ignored · No channel | ✔ |
| W7 | INV | **Latent:** Camp layout, cooking location, trailers, and parking creating attractant corridors? | text | ✔ |
| W8 | INV | Client / landowner wildlife rules vs. our practice — gaps? | text | – |
| W9 | INV | Extent + verification: Attractant audits; spray expiration checks; sighting log review | text | ✔ |

**Preferred CA:** Eliminate attractants → engineered food storage → no solo travel in peak habitat → deterrents as last layer. Not “be aware of bears.”

---

## B15. Weather / cold stress / heat (`weather_cold`) — Alaska cold primary; heat included

| # | Audience | Question | Answer | Crit |
|---|---|---|---|---|
| WC1 | SUP | Conditions (temp, wind chill, precip, whiteout) vs. work/stop criteria in procedure? | Within limits · Exceeded · No criteria exist | ✔ |
| WC2 | IP | Clothing system appropriate (layers, outer shell, gloves for task, eye protection fogging)? | Adequate · Gaps · Wet clothing | ✔ |
| WC3 | SUP | Work/warm-up cycle, warm shelter accessible, hydration/calories planned? | Followed · No warm-up plan · Shelter remote | ✔ |
| WC4 | IP | Symptoms recognized (frostnip, hypothermia, immersion foot, heat illness)? Buddy check? | Recognized early · Missed · Alone | ✔ |
| WC5 | SUP | Vehicle/equipment winterization, plug-ins, survival kit for travel? | Ready · Gaps · N/A | ✔ if travel |
| WC6 | INV | **Latent:** Was the job schedulable in a better weather window? Who has authority to call delay? | text | ✔ |
| WC7 | INV | Metal tools / bare-hand contact / evaporative cooling from fuels — task design for cold? | text | – |
| WC8 | INV | Extent + verification: Stop-work weather calls actually honored (check recent jobs)? | text | ✔ |

**Preferred CA:** Hard weather stop criteria with real authority → shelter and rotation engineered into the job → PPE layers that still allow the task.

---

## B16. Water / drowning / marine / dock (`water_drowning_marine`) — Cook Inlet / dock / barge

| # | Audience | Question | Answer | Crit |
|---|---|---|---|---|
| WD1 | SUP | Work over/near water: fall protection + rescue, or PFDs required and worn? | PFD worn · PFD available not worn · None · Fall arrest used | ✔ |
| WD2 | SUP | Tide, current, ice, sea state known and briefed (Cook Inlet tides matter)? | Briefed · Assumed · Not checked | ✔ |
| WD3 | SUP | Man-overboard / retrieval plan: equipment staged, people assigned, communication? | Ready · Paper only · None | ✔ |
| WD4 | IP | Dock/barge/edge conditions: ice, open edge, lighting, guardrails, ladder to water? | Controlled · Open edge · Iced · Dark | ✔ |
| WD5 | SUP | Vessel / gangway: who controls access, load limits, simultaneous ops? | Controlled · Informal · Overcrowded | ✔ |
| WD6 | SUP | Cold-water immersion kit / hypothermia response ready? | Yes · No | ✔ if cold water |
| WD7 | INV | **Latent:** Can work be moved away from the edge / done from shore / deferred for tide? | text | ✔ |
| WD8 | INV | Extent + verification: PFD compliance observations; MOB drill currency | text | ✔ |

**Preferred CA:** Eliminate edge exposure → guardrails/nets → PFD + real MOB capability → tide windows as hard gates.

---

## B17. Aviation / helicopter (`aviation_helicopter`)

| # | Audience | Question | Answer | Crit |
|---|---|---|---|---|
| AV1 | SUP | Operator approved on company aviation list? Aircraft/mission match (VFR/IFR, overwater, external load)? | Approved · Exception used · Not approved | ✔ |
| AV2 | SUP | Weather decision: who has no-go authority (pilot always final)? Pressure to fly? | Pilot no-go honored · Pressure applied · Flew in marginal | ✔ |
| AV3 | IP | Passenger brief: seat belts, doors, emergency exits, ELT, immersion suit/PFD if overwater? | Full brief · Partial · None | ✔ |
| AV4 | SUP | LZ: clear of debris, wires, people, loose equipment; marshal used? | Controlled LZ · Informal · Hazards present | ✔ |
| AV5 | IP | Approach/departure paths — walking under rotor disc, downhill approach on slope? | Correct · Walked through danger area | ✔ |
| AV6 | SUP | External load / sling: qualified crew, tag lines, radio, jettison understanding? | Qualified · Improvised · N/A | ✔ if sling |
| AV7 | INV | **Latent:** Could this trip be boat/road/remote camp staging instead of flight? Fatigue/duty time? | text | ✔ |
| AV8 | INV | Extent + verification: Aviation vendor audits; passenger compliance checks | text | ✔ |

**Preferred CA:** Only approved operators · pilot no-go absolute · eliminate unnecessary flights · engineered LZ control.

---

## B18. Property damage — no injury (`property_damage_no_injury`)

| # | Audience | Question | Answer | Crit |
|---|---|---|---|---|
| PD1 | IP/SUP | What was damaged, estimated cost/criticality, production impact? | text | ✔ |
| PD2 | INV | Was this a **near miss with different luck** (energy that could have hit a person)? | Yes – PSIF potential · No – pure asset · Unclear → if Yes, also load the energy bank | ✔ |
| PD3 | IP | Walk through the task — same as U1 focused on the equipment path | text | ✔ |
| PD4 | SUP | Guarding, stops, soft-start, bumper, procedure to protect the asset — present and used? | Present · Bypassed · None | ✔ |
| PD5 | INV | Same decision/normal-work questions as U4–U5 — damage often shares the shortcut culture | link U4/U5 | ✔ |
| PD6 | INV | **Latent:** Design clearances, storage layout, or traffic pattern that make contact likely? | text | ✔ |
| PD7 | INV | Extent + verification: Same equipment class damage trend; engineering fix verification | text | ✔ |

**Preferred CA:** Treat high-energy property damage like a serious near miss — engineer the contact out.

---

## B19. Near miss / good catch (`near_miss_good_catch`)

| # | Audience | Question | Answer | Crit |
|---|---|---|---|---|
| NM1 | IP | What almost happened, and what energy would have reached a person? | text + energy type | ✔ |
| NM2 | IP | What **stopped** it from being an injury (luck, last-second reaction, engineered control, peer stop)? | Luck · Reaction · Engineered control · Peer Stop Work · Other | ✔ |
| NM3 | IP | Why are you reporting this? (Required so we reinforce reporting, not punish) | Want it fixed · Supervisor asked · Anonymous culture · Other | – |
| NM4 | SUP | How close (time/distance) was the person to the energy? PSIF? | chips | ✔ |
| NM5 | INV | Load the matching hazard bank questions for the energy that *almost* hit — same depth as if it had connected | auto-load bank | ✔ |
| NM6 | INV | What will we change so we don’t depend on luck or heroics next time? | text (hierarchy) | ✔ |
| NM7 | INV | Feedback to reporter within __ days — closed loop so reporting continues | date + method | ✔ |
| NM8 | INV | Extent: Where else does this near-miss condition exist? | text | ✔ |

**Preferred CA:** Same as the injury bank for that energy. Never close with “thanks for reporting” alone.

---

## B20. Psychological safety / violence / harassment (`psychological_violence_harassment`)

> **Special rules:** Trauma-aware. No blame of the reporter. Confidential pathways. HR / legal parallel track when criteria met. Investigator asks about **system response quality**, not cross-examination of the reporter’s credibility. Chip answers carefully — never force retelling for the form.

| # | Audience | Question | Answer | Crit |
|---|---|---|---|---|
| PV1 | INV | Has the person been offered a safe/private reporting channel and support resources (EAP, HR)? | Yes · Declined · Not yet offered | ✔ |
| PV2 | INV | Is this investigation the right channel, or should HR/legal lead with safety in support? | Safety lead · HR lead · Joint | ✔ |
| PV3 | IP (voluntary) | What happened, in their words, only as far as they choose to describe for safety controls? | text (minimize re-trauma) | ✔ if they choose to proceed here |
| PV4 | SUP/INV | Immediate safety plan: separation, schedule change, no-contact, site access — implemented? | In place · Pending · Not needed (document why) | ✔ |
| PV5 | INV | Prior reports / patterns involving same person, crew, or location? (system search, confidential) | Yes pattern · No · Unknown | ✔ |
| PV6 | INV | Retaliation risk assessed and monitored? | Plan in place · Not assessed | ✔ |
| PV7 | INV | **System:** Do employees believe they can report without career damage? Evidence (surveys, prior cases)? | text | ✔ |
| PV8 | INV | Training and policy: clear prohibitions, supervisor duty to act, contractor coverage? | Adequate · Gaps | – |
| PV9 | INV | Corrective / protective actions focused on **environment and accountability of alleged actor/process**, not on moving the reporter as default | text | ✔ |
| PV10 | INV | Verification: follow-up with reporter on safety and non-retaliation at set intervals | schedule | ✔ |

**Preferred CA:** Protect the person · remove/control the hazard (including people/process) · fix reporting trust. Never “mediated conversation” as the only control for credible threats.

---

## B21. Other / not listed (`other`)

| # | Audience | Question | Answer | Crit |
|---|---|---|---|---|
| O1 | INV | Describe the mechanism in physical terms (energy, path, receptor). Pick the closest bank above and run it; use this bank only for leftovers. | text + reclassify if possible | ✔ |
| O2 | IP | Same as U1–U5 (decision, normal work, sense-making) | link | ✔ |
| O3 | INV | Which defenses failed? | text | ✔ |
| O4 | INV | Physical change that would prevent recurrence? | text | ✔ |
| O5 | INV | Extent of condition + verification | text | ✔ |

---

# PART C — CULTURE & SUPERVISION BLOCK

**Auto-required when:** Shop/Yard **OR** repeat **OR** severity ≤ E **OR** PSIF/High Energy.

## C. Culture (`culture`)

| # | Audience | Question | Answer | Crit |
|---|---|---|---|---|
| K1 | SUP | What are the actual expectations for this task, and are they understood and enforced the **same** for everyone (new and experienced)? | Written & even · Written, uneven · Unwritten · Conflicting signals | ✔ |
| K2 | SUP | Have supervisors seen this practice before? What was done? | Never · Seen, nothing · Coached · Disciplined · Rewarded for speed | ✔ |
| K3 | SUP | When someone is seen unsafe, is it addressed **right then**, regardless of who it is? | Always · Depends on who · Rarely · Never | ✔ |
| K4 | INV | Previous incidents, near misses, or BBS observations of similar behavior? *(system auto-lists matches)* What was done, and did it work? | auto-list + text | ✔ |
| K5 | SUP/IP | Do people understand *why* the requirement exists, or are they just told to comply? | Understand why · Rule without why · Rule fights the job | – |
| K6 | SUP/IP | Is there pressure (schedule, client, pay, crew size, weather window) pushing shortcuts? | chips + source | ✔ |
| K7 | SUP | Is supervision present on the floor/pad enough to see how work is **really** done? Span of control realistic? | Present · Rarely · Too wide a span · Remote only | ✔ |
| K8 | PEER/SUP | What unsafe practices have become normal because nobody has been hurt yet? | text | – |
| K9 | INV | Is anything **we (management)** are doing — or failing to do — contributing (staffing, tools, metrics, mixed messages)? | text | ✔ |
| K10 | INV | Toggle: Asked ≥3 people individually how the job is really done. Did answers match the procedure? | Match · Partly · No · Not asked (why) | ✔ when culture block on |
| K11 | INV | Production vs. protection metrics: what gets recognized — on-time, or stop-work / good catches? | text | – |
| K12 | INV | Contractor / multi-employer: whose standards win when they conflict? | text | – |

### Private peer question (confidential)

| # | Audience | Question | Crit |
|---|---|---|---|
| PRIV1 | PEER (3–5 not involved) | *“What are some things people do around this shop/crew that everybody knows probably aren’t safe, but nobody says anything about because nothing bad has happened yet?”* | ✔ ≥2 responses (or lead documents why not) when culture block on |

- Recorded with **role only, no name**. Visible only to investigation lead + super-admin.
- **Never** used as evidence against an individual.
- Also offered as standing anonymous shop pulse (P2).

---

# PART D — ROOT CAUSE & CLOSE-OUT (required to close)

## D. Root cause / close-out (`rootcause`) — Brian’s 10 + CSP extensions

| # | Audience | Question | Crit |
|---|---|---|---|
| R1 | INV | What actually caused it (**mechanism / energy**)? | ✔ |
| R2 | INV | Why was the decision made (link U4)? What conditions made it rational? | ✔ |
| R3 | INV | Failures involving supervision, equipment availability, procedures, training, management expectations, design? *(auto-filled from chips; investigator confirms)* | ✔ |
| R4 | INV | Were applicable requirements communicated, **understood**, **practical**, and **consistently enforced**? | ✔ |
| R5 | INV | Which safeguards should have prevented it, and why didn’t each one work? (defenses in depth map) | ✔ |
| R6 | INV | What will we change to prevent recurrence? | ✔ → becomes CAs |
| R7 | INV | Can we change equipment, tools, or process to **remove the opportunity** for the same mistake — not just remind people? | ✔ |
| R8 | INV | Who owns each CA, and when is it due? (system enforced) | ✔ |
| R9 | INV | **How will we verify each CA works?** Method + verify-by date. (Observation, audit, leading indicator — not “trust me”) | ✔ |
| R10 | INV | **Extent of condition:** Where else (shop, fleet, pads, sister crews) are we exposed to the same thing? | ✔ |
| R11 | INV | Latent organizational contributors: staffing, incentive, procedure quality, change management, competency system — any implicated? | ✔ |
| R12 | INV | If any CA is Admin/PPE-only (counsel / retrain / remind / toolbox): document why a stronger control is not feasible, **and** the proven knowledge/skill gap that justifies training. | ✔ if weak CA used |
| R13 | INV | Stand-down / learning: what will be shared, stripped of blame, focused on decisions and conditions? | – |

### Corrective action quality gate (software-enforced soft gate at P0)

Reject or flag if the **only** CAs are phrases like:
- “employee counseled”
- “additional training conducted”
- “reviewed with crew”
- “be more careful”
- “reminded to follow procedure”

…unless R12 is completed and a cause of type **knowledge/skill** is linked.

---

# PART E — BANK INDEX & COUNTS

| Code | Bank | Critical ✔ | Total Qs (crit + dig deeper) |
|---|---|---|---|
| `core` | Universal | 8 | 16 |
| `hand_ppe` | Hand / PPE | 9 | 12 |
| `chemical` | Chemical / fluid | 10 | 14 |
| `vehicle` | Vehicle / mobile equip | 10 | 14 |
| `slip_trip_fall` | Slip / trip / fall | 9 | 12 |
| `stored_energy` | LOTO / pressure / energy | 10 | 12 |
| `manual_handling` | Lifting / strain | 7 | 10 |
| `line_of_fire` | Struck-by / caught / drops | 8 | 11 |
| `lifting_rigging` | Crane / hoist / mast | 10 | 12 |
| `confined_space` | Confined space | 8 | 10 |
| `hot_work` | Hot work / fire | 8 | 9 |
| `spill_env` | Spill / environmental | 8 | 9 |
| `electrical` | Electrical | 7 | 8 |
| `excavation_trench` | Excavation / trench | 7 | 8 |
| `wildlife_bear` | Wildlife / bear (AK) | 7 | 9 |
| `weather_cold` | Weather / cold / heat | 6 | 8 |
| `water_drowning_marine` | Marine / dock / Cook Inlet | 7 | 8 |
| `aviation_helicopter` | Aviation / helicopter | 7 | 8 |
| `property_damage_no_injury` | Property damage | 6 | 7 |
| `near_miss_good_catch` | Near miss / good catch | 6 | 8 |
| `psychological_violence_harassment` | Psych / violence / harassment | 8 | 10 |
| `other` | Other | 5 | 5 |
| `culture` | Supervision & culture (+ PRIV1) | 8 (+PRIV1) | 13 |
| `rootcause` | Root cause & close-out | 12 | 13 |
| **TOTAL** | **24 banks** | **~196 critical prompts** | **~246 questions** |

**Typical investigation load:** Universal 8 crit + one hazard bank ~7–10 crit + culture (if triggered) ~8 + rootcause 12 ≈ **~35 critical max** when culture is on; software should still present **~13 on screen at a time** grouped by interviewee (IP → SUP → WIT → PEER → INV), with optional probes collapsed under “Dig deeper.” Cap of ~15 simultaneous required answers remains the UX rule from the overhaul — culture + rootcause are Stage 3–4 for the investigator, not the field report.

---

## Field report (unchanged principle)

Only add on `/incident-report`:
1. **Hazard / mechanism** chips (multi) — codes above  
2. **Work setting** — Shop · Yard · Field/Pad · Camp · Road · Office · Dock/Marine · Aviation LZ  
3. Optional one-liner: “Why do you think it happened?”

Deep banks load only in the investigation workbench.

---

## Preferred corrective-action posture (all banks)

1. **Eliminate** the hazard or the exposure  
2. **Substitute** a safer product/method  
3. **Engineer** guards, closed systems, interlocks, fixtures  
4. **Isolate** time/space (exclusion zones, LOTO)  
5. **Administrate** procedures, permits, competency  
6. **PPE** last  

Counseling / retraining is a legitimate CA **only** when investigation proves a knowledge or skill gap — not when the real cause was missing equipment, production pressure, normalization of deviance, or a procedure that doesn’t match the job.

---

*End of full question banks. No SQL applied. Seed order for P0 remains: core + hand_ppe + chemical + culture + rootcause + vehicle + slip_trip_fall + stored_energy; remaining banks P1.*

# v5 Audit — Loopholes in the Promise-Tracking Design & Fixes

> Companion to `plan.md` (v5 build pipeline). Each finding states the loophole, why it matters,
> the fix, and which PS-26133 solution pillar it strengthens. Verdict on the v4 core: **sound — kept.**
> The narrowness was correct for differentiation but wrong for coverage; expansion below stays inside
> the same mechanism (`promise → deadline → evidence → escalation`) so nothing dilutes the USP.

---

## A · Structural loopholes (fix by generalizing, not adding)

### L1 · The engine is referral-shaped; seven promises are not referrals
**Loophole:** v4 hard-codes one state machine per concept. Every new promise type would need its own scheduler, ladder logic, and tests — making scope expansion expensive, which is why v4 stayed narrow.
**Fix:** generalize to a single `promise` supertype (`type`, priority, dual clock, status, typed evidence, ladder state) with per-type detail tables (referral keeps its richer chain). Scheduler, ladders, reconciliation, acks, metrics become type-agnostic once. New promise types then cost days, not weeks.
**Pillar:** all six.

### L2 · Emergency-only triage starves the loop of routine data
**Loophole:** v2's full triage was cut to a red-flag checklist. Result: ~90% of household encounters (cough, fever, BP review, wound) generate no structured record → no promises → app invisible in routine work → ASHA stops opening it between emergencies → even emergency flow decays from disuse.
**Fix:** tiered protocol bundles — IMNCI-aligned symptom modules producing route decisions (`self-care | phc-visit | teleconsult | red-flag`), each non-self-care route creating the appropriate promise. Explainable rule traces retained (no ML).
**Pillar:** 1 (triage & time-to-consult), 7 (field usability).

### L3 · Referrals ignore facility reality — closed doors and empty shelves waste trips
**Loophole:** routing picks a destination with no knowledge of service calendars or stock. Sending an ANC patient to a CHC whose ANC clinic is Thursdays recreates the original "wasted visit" cost the PS complains about.
**Fix:** facility service calendar + slot awareness at referral creation; new **appointment-slot promise** ("patient seen on intended service day", evidenced by arrival match on that day); smart-routing score (distance proxy × calendar-open × stock flags × recent lapse rate) shown as suggestion, worker override always wins.
**Pillars:** 3 (referral completion), 6 (visibility→action).

### L4 · Diagnostics: named in the problem statement, absent from the design
**Loophole:** "irregular diagnostics" is explicitly in the PS; v4 tracks nothing after arrival. Patient reaches PHC, test ordered, reagent out of stock, result never returns to referring worker — the loop dies at its midpoint.
**Fix:** new **diagnostic promise**: order placed at encounter (district formulary list) → `sample collected by X` → result photo/document attached → result linked back to encounter and visible to referrer. Ladder on miss: lab tech → MO.
**Pillar:** 4 (diagnostics visibility).

### L5 · Medicine handoff unclosed — prescription is not treatment
**Loophole:** stock ground-truth events exist, but nothing tracks whether a prescribed drug actually reached the patient. Second wasted trip remains invisible.
**Fix:** new **medicine-fulfillment promise**: pharmacist marks dispensed / substituted / IOU-with-date on the capture surface; IOU auto-creates a restock-linked follow-up; ASHA verifies delivery on next household visit (ground truth again — same evidence path, reused).
**Pillar:** 4 (medicine stock visibility).

### L6 · Red-flag while offline = silent death
**Loophole:** offline-created emergency referrals wait for the next connectivity window — possibly hours. The highest-stakes promise has the worst latency.
**Fix:** two-layer bypass — (a) immediate foreground sync attempt on red-flag creation; (b) if no data network, one-tap **plain-GSM SMS alert** (device SMS works without internet) to a gateway number; inbound-SMS gateway app at block office ingests and pages MO/CHO. Protocol copy never blocks physical escalation (call 108 / accompany patient).
**Pillar:** 1, 7.

### L7 · ANM has no surface — the supervisor is a role without software
**Loophole:** dashboards assume district view. The ANM supervises ~5 ASHAs, approves transfers, does spot-audits; none of that has a screen, so audit sampling and transfer approval degrade to memory.
**Fix:** role-scoped views as first-class requirement: ASHA (app) · ANM (approval queue, audit-sampling assignments, capture-coverage digests) · Block MO (escalations, consults) · District (analytics). Weekly capture-coverage digest task assigned to the ANM — **data quality itself becomes a tracked promise**.
**Pillars:** 6 (accountability), plus adoption.

### L8 · Incentive opacity is the adoption killer left unfixed
**Loophole:** every gap analysis named ASHA workload/incentives as the failure axis; v4 mitigates effort only. Unpaid-seeming work still loses to paper.
**Fix:** read-only **incentive ledger**: task types mapped to configurable NHM rates; completed tasks accrue a visible estimated-earnings view. No payments processed (out of scope) — transparency only, sourced from data the system already has.
**Pillar:** adoption (supports all pillars operationally).

### L9 · Reporting double-entry is the quiet objection that kills procurement
**Loophole:** ANMs must feed the RCH portal regardless; if our tool adds work instead of replacing it, supervisors will block deployment.
**Fix:** one-click **RCH-format register export** (CSV matching name-based ANC/PNC column layout) + existing NDJSON/FHIR export. Our tool becomes her reporting shortcut, not a second register.
**Pillar:** 2 (interoperable record), adoption.

### L10 · Community awareness gap untouched
**Loophole:** NHSRC/FDSI records citizens unaware of entitlements (free drugs/diagnostics). All patient channels were removed — correctly — leaving zero community-facing artifact.
**Fix:** weekly auto-generated **facility noticeboard PDF** (services today, essential-drug availability with staleness badges, VHND dates) printed at PHC/CHC — attacks awareness through physical space, consistent with no-phone-channel principle.
**Pillar:** 7 (literacy/accessibility), 4.

### L11 · Immunization is generic "follow-up", missing the national schedule
**Loophole:** child cohorts exist but due-dates aren't computed from the actual vaccination schedule, and session sites (VHND days) aren't known — tasks fire on wrong days to wrong places.
**Fix:** schedule JSON (national immunization schedule) drives due-list generation; tasks cluster onto VHND session dates per village.
**Pillar:** 5 (child health follow-up).

### L12 · Terminal-state collisions undefined
**Loophole:** late attestation can arrive after registration-verified `completed`; behavior unspecified → implementers improvise.
**Fix:** terminal states accept **annotations only** (attestation recorded against the closed promise, confidence metadata updated); transitions table gains explicit `terminal_annotations`. Also specifies slip-lost fallback at capture page: fuzzy name+village search with confirm.
**Pillar:** 3 (data honesty).

---

## B · What was audited and deliberately NOT changed

| v4 decision | Verdict |
|---|---|
| No patient-facing digital channels | **Kept.** Noticeboard (L10) covers awareness physically |
| No video teleconsultation; thin doctor tab | **Kept.** Consult promise now fed by tiered triage (L2) instead of starving |
| eSanjeevani/ABDM/DVDMS as named interfaces | **Kept.** RCH export (L9) adds one more honest interface outward |
| Dual SLA clocks, attestation reconciliation, non-accusatory ladders | **Kept verbatim** — generalized in L1, semantics unchanged |
| Household-anchored identity | **Kept.** Capture-page fuzzy search (L12) covers slip-loss edge |

## C · Expansion accounting (honesty check)

Added: 3 promise types (diagnostic, medicine-fulfillment, appointment-slot) + 1 meta-promise (data-capture digest) · tiered triage bundles · emergency GSM bypass · role views incl. ANM queue · incentive ledger · RCH export · noticeboard generator · smart-routing weights · immunization schedule engine.
Estimated added build cost vs v4 plan: **~50–60%**, offset by L1's generalized engine (~30% saving across all promise types) and strict phase gates (§plan P0–P8) allowing a coherent stop at any gate. Cut order in plan.md revised accordingly.

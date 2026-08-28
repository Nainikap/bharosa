# Audit of architecture_v5.md — Findings V1–V14

> Auditor's verdict up front: **the v5 narrowing is correct and kept.** The generic `Promise`
> entity, the second-tier-evidence USP ("evidence from the tier that received the promise, not
> the tier that made it"), and the honest U-WIN/eVIN repositioning are the strongest articulations
> this design has produced. The findings below are of three kinds: (a) **regressions** — fixes won
> in earlier rounds that the v5 rewrite accidentally deleted; (b) **coverage holes** against the
> problem statement text; (c) **spec gaps** that would resurface as build-time ambiguity.
> Each finding: loophole → why it breaks → fix → PS pillar touched.

---

## A · Regressions (v4-round fixes lost in the v5 rewrite)

### V1 · Dual-clock fix deleted — Critical
**Loophole:** §8 model carries a single `deadline`. Earlier rounds established two timestamps:
field `created_at` vs server-receipt `sla_start` — because an offline-created red-flag referral
that syncs six hours later would otherwise insta-lapse, making the system's *first act* toward a
worker a false accusation.
**Why it breaks:** the field population this targets is offline for hours at a stretch; the
highest-stakes promise type (red-flag referral) is therefore the one most punished by its absence.
**Fix:** restore `created_at` + `sla_start` on `Promise`; all ladders fire exclusively on
`sla_start`; aggregate created→sla lag tracked per catchment as a connectivity metric (not a fault).
**Pillar:** 3 (referral completion), 7 (low-connectivity operation).

### V2 · Evidence typing lost — High
**Loophole:** `evidence_source` is prose in §1 and absent from the §8 row spec. The scan-vs-
batch-vs-attestation distinction — which drives audit sampling weights and data-quality metrics —
survives only as narrative.
**Fix:** typed evidence reference on every Promise:
`{ kind, source ∈ registration_match | manual_code | batch_entry | attestation | session_log | external_feed, confidence ∈ verified | reported, captured_at }`.
Dashboards weight by source; attested evidence always visibly distinct from verified.
**Pillar:** 3, 6.

### V3 · Status enum cannot represent reconciliation — Critical
**Loophole:** `open → kept | lapsed → escalated` has no terminal path for the attestation fallback
that §5 itself describes in prose. A lapsed referral later confirmed by ASHA attestation has no
representable state — implementers will improvise three different ways.
**Fix:** `open → kept | lapsed → escalated → reconciled`, plus a **terminal-annotation rule**:
late-arriving evidence against already-closed promises attaches as annotations updating confidence
metadata — never reopening or overwriting. `reconciled` counts toward completion, flagged lower-
confidence, visually distinct on every surface.
**Pillar:** 3 (data honesty).

### V4 · Household entity erased while named as the biggest risk — Critical
**Loophole:** §7 names ASHA continuity/catchment mismatch "the single biggest dependency," yet the
Household entity and supervised transfer mechanism that made continuity survivable were cut from §8
to an inline phrase ("household + ASHA catchment link").
**Fix:** restore `Household` (`household_id`, catchment assignment, landmark descriptor, members[],
`transfer_log[]` with supervisor approval + effective date + receiving-worker acknowledgment).
Transfer moves pending follow-ups, open promises' visibility, and identity anchors together —
turnover stops being amnesia by construction.
**Pillar:** 5 (continuity of care), adoption.

## B · Coverage holes (problem-statement obligations)

### V5 · Escalation ladders have no ack surface — High
**Loophole:** `escalation_ladder[]` with "ack timestamps" appears in models and flows, but no
surface exists where Block MO or the cold-chain officer actually acknowledges. An accountability
system whose operators have no inbox trains everyone to ignore it.
**Fix:** role-scoped ack surfaces as scoped components: MO escalation inbox, cold-chain/immunization
officer queue, district unacknowledged-red view; acknowledgment via HMAC-signed short-expiry deep
links from staff SMS, dashboard inbox fallback; per-officer ack-latency is itself a dashboard metric.
**Pillar:** 6 (accountability).

### V6 · Session-commitment writer ambiguity collapses independence — High
**Loophole:** §6 lets commitments be entered "by PHC/CHC staff, or manually entered by ASHA." If
ASHA writes both sides of the vaccine promise (commitment + point-of-use verification), the
second-tier-evidence claim degrades silently — the exact failure mode §3 criticizes in U-WIN.
**Fix:** commitments seed from the **ANM's monthly RI/VHND session plan** (one bulk entry per
month — a workflow ANMs already perform on paper); PHC dispatch confirmation optional; when the
committer-of-record defaults to plan-entry rather than PHC confirmation, the Promise record flags
`independence: degraded` — visible, never silent.
**Pillar:** 4, plus USP integrity itself.

### V7 · Silence-as-miss lacks timeout mechanics — Medium
**Loophole:** "no log exists past the session date" implies a scanner, but evidence-absence windows
are type-specific (session miss detectable T+1 day; referral SLA 24h–7d) and unspecified.
**Fix:** per-type evidence-timeout table in shared contracts; generic scheduler reads it; both
configurable per district deployment.
**Pillar:** 3, 4.

### V8 · Vaccine promise stops at stock; the due child who didn't attend vanishes — High
**Loophole:** verifying "vaccine was present" closes the supply promise but not the outcome loop:
a due child absent from a fully-supplied session is precisely the failure the PS cares about
(follow-up lapses). U-WIN tracks doses administered; nobody tracks absence follow-through.
**Fix:** new generation rule inside the follow-up type: national-schedule due-list × session-
attendance log → **absent child = automatic follow-up promise** for ASHA's next round visit,
with outcome write-back. We never record dose administration (U-WIN's job) — only attendance
absence and its follow-through.
**Pillar:** 5 explicitly; also sharpens the U-WIN-complementary story for judges.

### V9 · PS Pillars 1 & 5 uncovered in build scope — Critical
**Loophole:** the problem statement's own solution lines demand "assisted teleconsultation" and
"proactive follow-up for high-risk cases"; v5 demotes consult and follow-up to roadmap. Judges
score against PS text line-by-line; two explicit pillars with zero built coverage is a scoring
vulnerability independent of architectural elegance.
**Fix:** promote to built-minimal, cheap because the engine generalizes: consult = thin doctor-tab
store-and-forward (request → structured response + voice note within SLA); follow-up = enrollment →
round-aligned tasks → outcome write-back (now also carrying V8's child-absent generation).
Diagnostics / medicine-fulfillment / appointment-slot stay schema-ready **roadmap adapters** —
respecting the v5 narrowing philosophy while covering every PS pillar.
**Pillar:** 1, 5.

### V10 · Emergency red-flag while offline waits for sync — High
**Loophole:** no bypass exists between field creation and next connectivity window — hours for
the highest-stakes promise.
**Fix:** two-layer emergency path: immediate foreground sync attempt on red-flag creation; if no
data network, one-tap **plain-GSM SMS alert** to a gateway number (device SMS needs no data);
block-office gateway phone ingests and pages MO/CHO. Protocol copy mandates physical escalation
(108/accompany) regardless of any app state.
**Pillar:** 1, 7.

### V11 · Adoption levers removed with nothing replacing them — Medium
**Loophole:** incentive opacity (why ASHAs deprioritize tools) and RCH double-entry (why ANMs
block new tools) are documented kill-factors; v5 carries no lever against either.
**Fix:** read-only **incentive ledger** (completed tasks × configurable NHM rate JSON — transparency
only, no payments) and **RCH-format register CSV export** scoped to the ANM's catchment, turning
the tool into her reporting shortcut rather than a second register.
**Pillar:** adoption substrate under all pillars.

### V12 · Engagement decay between emergencies and sessions — Medium
**Loophole:** red-flag-only checklists mean the app earns zero daily use; disused apps decay into
the drawer long before the emergency that matters.
**Fix:** lightweight encounter logging with IMNCI-lite symptom modules producing route decisions
(`self-care | phc-visit | teleconsult | red-flag`) — each non-self-care route creating the matching
promise. Routine work feeds the same ledger the emergencies do.
**Pillar:** 1, 7.

## C · Spec gaps (cheap to close now, expensive later)

### V13 · No data-quality feedback loop — Low/Medium
Capture coverage (scan vs batch vs attestation mix per facility) decays invisibly. Fix: weekly
capture-coverage digest assigned to the ANM as a **meta-promise** requiring acknowledgment — the
system applies its own logic to its own operators.

### V14 · KPIs named but never defined — Medium
"Completion rate" without denominators invites gaming and judge confusion. Fix: formula table +
mandatory measure-only baseline mode for the first weeks of any deployment (see plan.md §7).

## D · Minor closures bundled into the plan
- Ack deep-link tokens: HMAC-signed, ≤15-min expiry, dashboard fallback (V5 detail).
- Languages pinned Hindi + Marathi default; locale structure ready for pilot override.
- Sync journal priority classes restated: `emergency > referral > consult > diagnostic > followup > analytics` (diagnostic reserved for roadmap adapter).
- Slip-loss edge at capture page: fuzzy name+village search with confirm (terminal-annotation safe).

---

## E · Kept verbatim from architecture_v5.md (audited and endorsed)

| Decision | Why it survives audit |
|---|---|
| Single generic `Promise` entity; types = evidence adapters | Realized L1; makes every expansion additive |
| Second-tier-evidence USP formulation | Sharpest defensible line in the project; strengthened further by V6's independence flag |
| Two-type-deep demo philosophy | Extended to four only where PS pillars demanded coverage (V9); diagnostics etc. stay adapters |
| Replacement of stock-accuracy with vaccine-session-supply | Well-formed promise (fixed deadline, specific item, clean evidence event) |
| U-WIN/eVIN positioning incl. residual-gap stats | Honest incumbent analysis; V8 turns adjacency into complementarity |
| No patient-facing channels; eSanjeevani/ABDM as interfaces | Consistent with all prior rounds' findings |

## F · Expansion accounting (honesty check)
Added build scope vs user's v5: consult-thin tab + follow-up engine promoted to minimal builds
(V9, V8), emergency GSM bypass (V10), household/transfer registry restored (V4), incentive ledger +
RCH export (V11), encounter-lite triage (V12). Estimated delta vs the two-type build: **+35–45%**,
partially offset because the generic engine amortizes each added type (~days each). Gates allow a
coherent stop after any phase; standing cut order in plan.md §8 protects the core first.

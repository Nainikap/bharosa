# Closing the Care Loop — System Architecture v5 (Final)
### SIH 2026 · Problem Statement ID 26133 · MedTech/BioTech/HealthTech

**Problem:** Accessibility and quality of public healthcare services in rural and underserved areas.

**Core thesis:** Rural care doesn't fail from missing services or missing apps — it fails because no system tracks whether a cross-tier **promise** was kept. This platform is a generic promise-tracking layer for public health: it records commitments made between tiers (a referral, a consult, a follow-up, a vaccine delivery), verifies whether each was discharged using evidence the system already generates, and escalates the misses to a named accountable person. It does not replace any incumbent's clinical delivery — it is the layer that notices when a handoff between them fails.

**Stack:** Flutter field app (ASHA-facing only) · Node.js API · lightweight FHIR-shaped store on PostgreSQL · React district dashboards · DLT-compliant SMS (staff/officer alerts only, never patient-facing) · store-and-forward handoff to eSanjeevani for teleconsult.

---

## 1 · The one mechanism the whole system is

Every feature reduces to a single repeated shape:

```
PROMISE MADE → DEADLINE SET → EVIDENCE OF KEEPING (or its absence) → ESCALATION ON MISS
```

Rather than model each of these as a separate feature, the system has exactly **one first-class entity — `Promise`** — and every concrete instance (a referral, a vaccine delivery, a follow-up visit) is a row of the same shape with a different evidence source plugged in. This is the core architectural decision of v5: the platform is not five features, it is one ledger with extensible promise types.

```
Promise
  id
  type              (referral | vaccine_supply | follow_up | consult | ...extensible)
  committed_by       (role / facility)
  committed_to       (role / facility)
  description         (what was promised, structured where possible)
  deadline
  evidence_source     (registration match | session log | ASHA attestation | external feed)
  status              (open → kept | lapsed → escalated)
  escalation_ladder    (named roles, ack timestamps)
```

Two promise types are built and demoed live in v1. Everything else is the same schema with a new evidence adapter — a roadmap point, not a rebuild.

| Promise type | Committed by | Evidence it was kept | Escalates to |
|---|---|---|---|
| **Referral** (built) | ASHA/ANM refers patient to CHC | Facility registration match on arrival | Referring ASHA → Block MO → District nodal |
| **Vaccine-session-supply** (built) | PHC/CHC commits vaccine stock for a scheduled RI session | ASHA/ANM logs vaccine present (or not) at point of use, session date | Block cold-chain officer / MO |
| Follow-up (roadmap) | Patient enrolled in a protocol | ASHA attestation on next household visit | Supervisor, on repeated miss |
| Consult (roadmap) | Worker requests specialist review | eSanjeevani structured response within SLA | Requesting facility |

---

## 2 · Why "stock accuracy" was replaced with vaccine-session-supply

The earlier generic stock-mismatch promise ("reported vs. found" for any drug) was the weakest-justified component in prior versions — vague evidence, no deadline structure, easy to hand-wave. Vaccine-session-supply is the same underlying problem but with everything a promise needs to be well-formed:

- A **fixed deadline** (the scheduled RI session date), not an ambiguous "whenever checked."
- A **specific committed quantity/item**, not "some drug, sometime."
- A **clean evidence event**: did the vaccine physically exist at the session site when the session was due to run.

It is also a documented, persistent, national-scale gap rather than an assumed one — worth being precise about what already exists here before claiming it, since this space has a real, deployed incumbent.

---

## 3 · Existing systems landscape (revised — includes U-WIN and eVIN)

| System | Covers | Documented gap this design attacks |
|---|---|---|
| **eSanjeevani** | Doctor-to-doctor + OPD teleconsult; 43+ crore consultations (Nov 2025) | No screening/triage structure, no feedback loop to referring worker, consultations "end as isolated single-step events" (PMC11422547) |
| **ABDM** | National health-record rails, registries, consent flows; ~96.85 cr ABHAs (Aug 2026) | Adoption ≠ integration — only 545 of 3,041 active sandbox integrators have completed certification (NHA dashboard) |
| **Kilkari / Mobile Academy** | Stage-driven IVR education from MCTS registry; 21M+ reached | One-way; not tied to encounters/referrals; assumes patient phone access — the exact assumption this design removed |
| **Khushi Baby CHIP** | Offline CHW data platform; 85k CHWs, 60M+ tracked | Nearest real competitor. Strength is program-wise data collection, self-reported by the CHW. No documented cross-tier promise verified by a *second*, independent tier |
| **U-WIN** | Individual-level vaccine **administration** tracking; 11.87 cr children registered (Mar 2026); ASHA-facing due-lists | Tracks *whether a dose was given*. Does not track whether the *supply commitment behind a scheduled session* was kept — a different, upstream question this design targets instead |
| **eVIN** | Vaccine **cold-chain and stock** visibility at storage points; 27,000+ cold chain points; drove an 80%+ stock-out reduction | Facility/warehouse-level visibility, not point-of-use verification. Even post-eVIN, 26.3% of facilities still reported a stock-out — the residual gap is at the session level, not the depot level |
| **ANMOL / RCH** | ANM-specific reporting into RCH portal | No referral tracking; ASHAs remain on paper |
| **Paper + phone calls** | The actual daily incumbent | Zero infra cost, works through power cuts — loses irreversibly on searchability, aggregation, accountability trails |

**Honest positioning:** this design does not claim to out-build U-WIN or eVIN — both are large, funded, national systems doing their stated jobs reasonably well. It claims a specific, narrower thing: neither system verifies a promise using a *second, independent tier's* evidence with a *named person* escalated on a miss. U-WIN tracks the vaccinator's own entry; eVIN tracks the depot's own stock count. This system's evidence always comes from the tier receiving the promise, not the tier making it — that's what makes it a promise ledger and not another registry.

---

## 4 · Scope: what is built vs. named interface

| Component | Status | Why |
|---|---|---|
| Generic `Promise` state machine (deadline, evidence, escalation ladder) | **Build — core** | This is the product |
| Referral promise: field capture → facility registration match | **Build — core** | Demoed end-to-end (§5) |
| Vaccine-session-supply promise: PHC commitment → ASHA point-of-use log | **Build — core** | Demoed end-to-end (§6) |
| District dashboard (completion rate, unacknowledged escalations, session-level stock misses) | **Build — core** | Where the pattern becomes visible across both promise types on one screen |
| ASHA field app: red-flag checklist, referral creation, session supply log | **Build — minimal** | Just enough to create/verify a promise, not a full clinical suite |
| eSanjeevani handoff (consult promise) | **Stub / named interface** | Request sent, structured response received, SLA tracked — not rebuilding their pipeline |
| ABDM HIP adapter | **Stub / named interface** | Mock credentials, certification path documented, not attempted live |
| U-WIN / eVIN data feeds | **Roadmap interface** | Consumed as evidence sources if/when an accessible feed exists; not duplicated |
| Follow-up promise, patient-facing comms | **Roadmap** | Same schema, new evidence adapter — shown as extensibility, not built live |

---

## 5 · Referral promise flow

```
initiated ──▶ arrived (passive, facility registration match) ──▶ completed
   │
   └── no arrival within SLA ──▶ lapsed ──▶ ESCALATED (ack-required)
```

- **`initiated`** — ASHA/ANM creates the referral; a short code/QR is generated (works with SMS/paper fallback, no app dependency on the CHC side).
- **`arrived`** — captured passively via existing OPD registration at the facility — no separate "accept" step, since an active-acceptance step measures whether staff interacted with an app, not whether the patient was seen (this was the core failure of earlier versions).
- **`completed`** — fires when the encounter is closed out.
- **`lapsed`** — no `arrived` event within SLA (red-flag 24h · urgent 48h · routine 7d) → escalation ladder: referring ASHA → Block MO → District nodal, tap-to-acknowledge required.
- **Fallback evidence**: where facility registration discipline is weak, ASHA-attested outcome on her next household visit substitutes — lower fidelity than a registration match, still strictly better than the current baseline of no record at all.

---

## 6 · Vaccine-session-supply promise flow (new in v5)

```
committed (PHC/CHC schedules an RI session, commits vaccine stock) 
   ──▶ kept (ASHA/ANM logs vaccine present at session, session held)
   │
   └── vaccine absent OR session date passes unlogged ──▶ lapsed ──▶ ESCALATED (block cold-chain officer)
```

- **`committed`** — created when an RI session is scheduled and vaccine dispatch is logged (by PHC/CHC staff, or manually entered by ASHA if no digital source is available) with a specific date and site.
- **`kept`** — a single-tap log at the session by the ASHA/ANM present: vaccine physically available, session ran as scheduled. This is the same "second-tier evidence" principle as referral — the promise is verified by the person receiving it, not the person who made it.
- **`lapsed`** — vaccine absent at session time, or no log exists past the session date (silence is treated as a miss, not assumed success). Escalates to the block-level cold-chain/immunization officer with a tap-to-acknowledge requirement — the same accountability pattern as the referral ladder, reused wholesale.
- **Deliberately excluded from v1**: temperature/cold-chain monitoring (eVIN's job, not duplicated) and dose-level administration tracking (U-WIN's job). This promise type only answers one question: *was what was promised for this session actually there.*

---

## 7 · Identity (unchanged principle, restated briefly)

Patient/beneficiary identity does not rely on phone number or fixed address — both are frequently absent for this population. Identity is anchored to **ASHA-catchment relationship** (known to ASHA X, household Y), with name+fuzzy-DOB+village as a coarse dedup safety net, not the primary mechanism. ABHA linkage is opportunistic, never a dependency, given OTP-based linking largely fails without a personal phone.

**Named risk:** the design's single biggest dependency is ASHA continuity — transfer, turnover, or catchment-boundary mismatch can break the evidence chain. This is stated explicitly as an accepted trade-off, not solved.

---

## 8 · Core data model (v5)

| Entity | Key fields | Notes |
|---|---|---|
| **Promise** | `type`, `committed_by`, `committed_to`, `description`, `deadline`, `evidence_source`, `status`, `escalation_ladder[]` | The single generic entity underlying referral and vaccine-session-supply (§1) |
| Patient | `local_id` (UUID) · `abha_ref` (nullable) · household + ASHA catchment link | Identity per §7 |
| Encounter | type · facility · worker · timestamp | Append-only |
| Session | facility · scheduled date · vaccine items committed · ASHA/ANM log of presence | Feeds `Promise(type=vaccine_supply)` |
| ConsentArtifact / AuditEvent | purpose, scope, timestamps, signatures | Unchanged |

Collapsing referral and vaccine-supply into one `Promise` table (rather than two bespoke tables) is what makes the third and fourth promise types (follow-up, consult) additive rather than architecturally disruptive later.

---

## 9 · Security, privacy, abuse controls

| Threat | Control |
|---|---|
| PHI on cheap shared devices | SQLCipher AES-256 at rest · device-bound PIN + remote wipe · only active caseload syncs to device |
| Transport interception | TLS 1.3 + certificate pinning |
| Incentive gaming (false "kept" logs) | GPS+timestamp plausibility checks · supervisor spot-audit sampling · anomalies flagged, not auto-blocked |
| DPDP Act 2023 posture | Consent artifact per interaction purpose · guardian consent for minors · role-scoped purpose limitation · append-only signed audit trail |
| API abuse | Per-device rate limits; emergency-class traffic exempted but flagged |

No patient-facing SMS/IVR channel exists in this design — removed by construction, not by control.

---

## 10 · Gaps found and fixes applied (cumulative)

| Gap | Why it broke | Fix |
|---|---|---|
| CHC has no incentive to actively "accept" a referral | Measures app interaction, not care delivered | Passive arrival capture via existing OPD registration (§5) |
| Patient often has no phone/stable address | SMS/IVR/OTP mechanisms fail for the target population | Removed patient-facing comms; ASHA is the evidence and follow-up channel |
| Generic "stock accuracy" promise was under-specified | No fixed deadline, vague evidence, easy to hand-wave | Replaced with vaccine-session-supply: fixed session date, specific committed item, clean point-of-use evidence (§2, §6) |
| Vaccination is not an empty quadrant | U-WIN already does administration tracking at national scale, ASHA-facing | Redirected to supply/session verification, a documented residual gap even post-eVIN (26.3% facilities still stock out) |
| Five promise types as five bespoke features | Not extensible, repeats the ten-subsystem sprawl problem | Single generic `Promise` entity; new types are new evidence adapters, not new subsystems |
| Identity without phone/address | Name+DOB+village alone is low-precision | ASHA-catchment relationship as primary signal, dedup as safety net only |

### Trade-offs consciously accepted
- ASHA-attested confirmation (referral fallback) is lower-fidelity than a registration match — accepted because it still beats the current baseline of no record.
- Vaccine-session-supply deliberately does not attempt cold-chain/temperature monitoring — that's eVIN's job; duplicating it would reintroduce the sprawl this version cut.
- The entire design depends on ASHA continuity and catchment accuracy — a real, named risk, not solved here.

---

## 11 · USP statement

This system is not another clinical delivery app, and not another registry. It is a **generic promise ledger for cross-tier public health commitments** — the only layer that verifies whether a referral, a vaccine-session supply commitment, or (extensibly) a consult or follow-up was actually kept, using evidence from the tier that *received* the promise rather than the tier that made it. Unlike U-WIN (administration, self-logged by the vaccinator) or eVIN (depot-level stock visibility), it catches the specific, documented, residual failure at the point of use — where 26.3% of facilities still report stock-outs even with both systems functioning as designed. Unlike Khushi Baby (program-wise data collection) or eSanjeevani (isolated consult events), its first-class object is the promise itself, not the encounter.

---

## 12 · Open questions requiring a decision before build

1. Pilot district — determines which facility registration workflow and which state's eVIN/DVDMS variant any future feed integration would need to speak to first.
2. Is there an accessible eVIN/U-WIN data feed for the pilot district, or does vaccine-session-supply run entirely on ASHA/PHC self-logged commitment data for v1?
3. Minimum device floor (Android Go / 1GB RAM) — constrains build choices now.
4. Demo order — referral promise first (familiar, easy to explain) or vaccine-session-supply first (sharper differentiation, less familiar to judges)?
5. Language set for v1 field app — pick 2 rather than promise many.

---

## Summary

**Problem:** cross-tier promises in rural care — referrals, vaccine deliveries, follow-ups — go unverified, and every incumbent system is a silo that owns only one side of each handoff.

**Architecture:** a single generic `Promise` state machine (deadline → evidence → escalation), instantiated for two live promise types — referral (verified by facility registration) and vaccine-session-supply (verified by ASHA/ANM point-of-use log) — with eSanjeevani, ABDM, U-WIN, and eVIN treated as named interfaces or evidence sources, never rebuilt.

**USP:** the only system verifying whether cross-tier public health promises were kept, using evidence from the receiving tier rather than the tier that made the promise — catching the specific, documented failures that persist even inside systems (U-WIN, eVIN) that are already working as designed.

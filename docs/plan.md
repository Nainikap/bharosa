# Build Plan v6 — Closing the Care Loop (Promise Ledger Prototype)

> End-to-end build pipeline for SIH 2026 PS-26133 · MedTech/BioTech/HealthTech track.
> Base architecture: `architecture_v5.md` (user's final) · Audit driving this plan: `docs/architecture_v5_audit.md` (V1–V14).
> Build law: everything here maps to a v5 design element, an audit fix, or a PS pillar. Anything else is rejected by default.

---

## 1 · Objective & Scope

**Objective:** a working prototype of the generic promise ledger — one `Promise` entity, **four live
types**, each following `promise made → deadline set → evidence (or absence) → escalation on miss`,
with evidence always sourced from the tier that *received* the promise.

| # | Promise type | Committed by | Evidence of keeping | Escalates to | Status |
|---|---|---|---|---|---|
| 1 | Referral | ASHA/ANM | Registration match (scan/manual/batch) or attestation → reconciliation | Referring ASHA → Block MO → District nodal | **Built** |
| 2 | Vaccine-session-supply | ANM session-plan seed / PHC dispatch | ASHA/ANM point-of-use log at session date | Block cold-chain/immunization officer | **Built** |
| 3 | Consult | Worker via triage route | Doctor-tab structured response + voice note within SLA | Requesting facility | **Built-minimal** |
| 4 | Follow-up (+ child-absent generation) | Protocol enrollment / session attendance log | ASHA outcome attestation on round visit | Supervisor (repeat misses only) | **Built-minimal** |
| — | Diagnostics · Medicine-fulfillment · Appointment-slot · Data-capture digest | — same schema, new evidence adapters | — | — | **Roadmap adapters** (schema-ready, not built) |

**PS pillar coverage matrix:**

| PS solution line | Covered by |
|---|---|
| Reduce time-to-consultation via assisted teleconsultation & digital triage | Triage-lite routing (P2) + consult promise (P4) + emergency GSM bypass (V10) |
| Longitudinal, interoperable record across tiers | Append-only encounters + FHIR-shaped store + NDJSON export; RCH CSV for ANMs (V11) |
| Referral completion through active tracking, not one-way handoffs | Referral promise end-to-end (P1–P3) |
| Visibility of diagnostics & medicine stock | Stock ground-truth events + session-supply promise; diagnostics/medicine = roadmap adapters with schema shipped |
| Proactive follow-up for high-risk maternal/child/chronic | Follow-up engine incl. child-absent generation from sessions (V8) |
| Facility-level dashboards for quality/accountability | Role-scoped dashboards + KPI formulas + baseline mode (§7) |
| Reliable under low-connectivity, low-literacy, multilingual conditions | Offline-first journal, icon/audio UX, Hindi+Marathi, GSM bypass |

---

## 2 · Repo Layout & Architecture Snapshot

```
closing-the-care-loop/
├── apps/
│   ├── field-app/            # Flutter + drift(SQLite/SQLCipher) — ASHA-facing only
│   ├── facility-capture/     # Vite+React zero-install — arrivals, session dispatch confirm
│   └── dashboard/            # Vite+React — role views: ANM queue, MO/cold-chain ack inboxes,
│                             #   doctor tab, district board, KPI panel
├── services/
│   ├── api/                  # Node.js (Fastify) — gateway, sync, generic promise engine, schedulers
│   └── sms-gateway/          # Android app (block-office phone) ingesting inbound emergency SMS
├── packages/
│   └── shared-contracts/     # OpenAPI, TS types, JSON schemas, transition tables,
│                             #   evidence-timeout table, rule bundles, RI schedule JSON,
│                             #   incentive-rate config, event-name registry
├── infra/
│   ├── docker-compose.yml    # postgres + api (dev)
│   └── seed/                 # deterministic demo dataset (§8)
└── docs/                     # architecture_v5.md, audit, ADRs, this file
```

**Stack commitments:** Flutter 3.x + drift over SQLCipher · Fastify + node-pg-migrate · PostgreSQL 16 · pg-boss (Postgres-native queue — no Redis) · React 18 · BarcodeDetector + html5-qrcode fallback · HMAC deep-link tokens · GSM inbound-SMS gateway app.

**Workstreams:** MOBILE · BACKEND · WEB · PROTOCOL/DEMO (rule bundles, seed data, demo script, export formats).

---

## 3 · The `Promise` Model (v5 shape + audit fixes applied)

```ts
interface PromiseRec {
  id: string;
  type: 'referral' | 'vaccine_supply' | 'consult' | 'followup';   // roadmap: diagnostic | medicine_fulfillment | appointment_slot | data_capture
  committedBy: { role: string; facilityId?: string; workerId?: string };
  committedTo: { role: string; facilityId?: string };
  description: object;                    // structured payload per type (referral_detail, session_detail…)
  createdAt: Date;                        // V1 fix: field reality — never drives ladders
  slaStart?: Date;                        // V1 fix: server sync receipt — ladders fire ONLY on this
  deadline?: Date;                        // derived: slaStart + type timeout (evidence-timeout table)
  evidence?: EvidenceRef;                 // V2 fix:
  // EvidenceRef = { kind: string;
  //   source: 'registration_match'|'manual_code'|'batch_entry'|'attestation'
  //         |'session_log'|'external_feed';
  //   confidence: 'verified'|'reported';
  //   capturedAt: Date }
  independence?: 'direct'|'plan_seeded';  // V6 fix: vaccine commitments from ANM plan are flagged, never silent
  status: 'open' | 'kept' | 'lapsed' | 'escalated' | 'reconciled' | 'closed_na';
  ladder: Array<{ role: string; workerId?: string; ackAt?: Date; ackVia?: 'deeplink'|'dashboard' }>;
}
```

Rules locked at contract level:
- **Status machine (V3):** `open → kept | lapsed`; `lapsed → escalated`; `escalated → reconciled | kept(late)`;
  closed promises accept **annotations only** (confidence metadata updates) — never reopening.
- **Evidence-timeout table (V7):** referral red_flag 24h · urgent 48h · routine 7d · vaccine_supply T+1d after session date · consult urgent 4h / routine 24h · followup next-round-date. All district-configurable.
- **Referral detail chain** maps onto statuses: initiated(open) → arrived(evidenced) → completed(kept) | lapsed → escalated → reconciled.
- **Identity (V4):** `Patient` → `Household` (catchment assignment, landmark descriptor, members[], supervised `transfer_log[]` with effective dates). ABHA nullable/opportunistic; fuzzy dedup as safety net only.
- Sync priority classes: `emergency > referral > consult > followup > analytics`.

---

## 4 · Phased Pipeline (P0–P6)

Gates are hard dependencies — no phase starts before the prior gate passes.

### P0 · Contracts & Scaffold
- Monorepo scaffold; compose up; migrations wired; event-name registry frozen.
- `shared-contracts` v0.9 → **freeze**: OpenAPI (`/auth /sync /promises /referrals /sessions /capture /consults /tasks /exports /metrics`); Promise model above; per-type transition tables incl. terminal annotations; evidence-timeout table; HMAC token spec (≤15 min expiry); RI schedule JSON schema; incentive-rate config schema; IMNCI-lite rule-bundle format (versioned JSON, offline-bundled).
- Auth freeze: OTP dev-stub codes; device PIN binding; JWT access 15 min + refresh rotation.
- KPI formula table drafted (§7) so metrics code has definitions before dashboards exist.
**Gate G-P0:** healthchecks green; contracts import cleanly in all apps; sample rule bundle validates. **API contract freeze.**

### P1 · Generic Promise Engine (backend core)
- Schema: `promise` + detail tables (`referral_detail`, `session_detail`, `consult_detail`, `followup_detail`) · `patient` · `household` + transfer_log · append-only `encounter` · `promise_event` audit log · `stock_event` (ground-truth negatives, feeds future medicine adapter) · `outbox`.
- Single-writer transition engine (pure functions in shared-contracts); server serializes intents; every accepted transition appends an event row.
- Type-agnostic scheduler (pg-boss, 60 s tick): evidence-timeout lapse detection, ladder instantiation, ack recording; idempotent under re-run.
- Reconciliation path incl. terminal annotations (V3); dual-clock semantics enforced in tests (V1).
**Gate G-P1:** test matrix covers every legal/illegal transition across all four types; offline-created red-flag must NOT lapse early (dual-clock regression test permanent); ladder ordering; annotation-vs-reopen distinction. No UI before green.

### P2 · Field App MVP (mobile)
- PIN authn · household-anchored caseload with transfer visibility · encounter-lite logging + IMNCI-lite symptom modules with icon-first UI + audio prompts producing route decisions (`self-care | phc-visit | teleconsult | red-flag`) that create matching promises (V12).
- Referral creation: human code + QR; destination suggestion aware of service calendar (roadmap-slot adapter reads static calendar seed), override always available.
- **Emergency bypass (V10):** red-flag triggers immediate foreground sync attempt; if no data network → one-tap plain-GSM SMS alert to gateway number; protocol copy mandates physical escalation regardless.
- Session log screen (V6): ANM's monthly RI/VHND plan bulk-entry seeds commitments (`independence: plan_seeded` flagged); single-tap point-of-use log "vaccine present / absent" on session day; absence auto-lapses at T+1d.
- Follow-up task list clustered into village day-plans; outcome attestation write-back; pending items include child-absent follow-ups generated from sessions (V8).
- Incentive ledger read view (V11): completed tasks × rate config.
- SyncJournal: append-only ops, priority classes, jittered exponential backoff, chunked upload, caseload-only delta download.
**Gate G-P2:** airplane-mode full flow completes (triage → route → refer → session log → attest); journal drains in priority order; kill-app mid-sync loses nothing; GSM alert fires with radios-in-airplane-data-off-but-GSM-on state simulated.

### P3 · Capture Surfaces + Ack Views (web)
- Facility-capture page: arrival scan / manual code / fuzzy name+village confirm / end-of-day batch grid → `registration_match` evidence with source typed (V2); PHC dispatch-confirm page for session stock when staff choose to confirm (upgrades `independence` flag).
- Role ack surfaces (V5): Block MO escalation inbox · cold-chain officer session-miss queue · ANM approval queue (transfers, audit-sampling assignments) · district board with unacknowledged-red rendering; HMAC deep-links wired to staff SMS outbox.
**Gate G-P3:** E2E localhost — referral scanned <5 s shows evidenced on board; seeded session miss lands in cold-chain inbox; deep-link ack recorded with latency metric.

### P4 · Consult Loop + Follow-Up Engine
- ConsultRequest composer (photos/vitals/summary from triage module) → doctor tab (longitudinal context card) → structured response + optional voice note within SLA targets → played at household by worker (never patient-channel delivery).
- Follow-up engine: ANC-week / IMNCI-band / NCD-stage minimal cohorts → tasks aligned to round cadence; **child-absent generation**: due-list × session attendance → automatic follow-up promises (V8); repeat-miss-only supervisor paging.
**Gate G-P4:** consult round-trip demonstrable end-to-end; two-simulated-weeks test shows no flat backlog and child-absent tasks appearing after seeded session.

### P5 · Messaging, Exports & Adoption Levers
- NotificationAdapter interface; MockSmsProvider → outbox table with inspector UI; Twilio sandbox behind env flag (dev only); production stays DLT-gateway interface. Non-accusatory escalation copy templates verbatim (v4 §6.4 rule): "no arrival record *or match missed*."
- sms-gateway app MVP: polls inbound SIM, creates high-priority sync events paging MO/CHO.
- RCH-format register CSV export scoped to ANM catchment (V11); nightly NDJSON/FHIR export job.
**Gate G-P5:** forced lapse produces outbox SMS → deep-link ack; inbound-GSM simulation pages correctly; CSV opens with expected column order; NDJSON valid.

### P6 · Hardening & Demo Pack
- Per-device rate limits; remote-wipe stub; GPS/timestamp plausibility checks + anomaly flags (flagged, never auto-blocking); observability: per-device sync lag, capture-coverage mix per facility, attested-vs-verified ratio, officer ack latency, created→sla lag distribution.
- Measure-only baseline mode toggle live on all KPI surfaces (§7).
- Roadmap adapter schemas committed (diagnostic, medicine_fulfillment, appointment_slot, data_capture) with ADR notes — extensibility demonstrated, not built.
- Seed dataset finalized + printed demo script (§8).
**Gate G-P6 (prototype done):** demo script runs start-to-finish on clean `compose up && flutter run` with zero manual DB edits.

---

## 5 · Mock Strategy

| Dependency | Prototype behavior | Production path (documented only) |
|---|---|---|
| Staff/officer SMS | MockSmsProvider → outbox + inspector | DLT-registered Indian gateway behind adapter |
| Inbound emergency SMS | sms-gateway Android app + spare-phone SIM | Same hardware; DLT long-code later |
| eSanjeevani consult | Internal doctor tab IS the loop | Request/response objects map onto their API |
| U-WIN feed | Stub returns scripted due-list/beneficiary data; adapter interface defined (roadmap evidence source) | Consume feed when accessible |
| eVIN feed | Stub returns scripted dispatch records; adapter defined | Same |
| ABDM HIP | Flag-gated mock creds; `abha_ref` nullable | Sandbox → certification path documented |
| Doctor availability | Team member operates doctor tab | Roster integration |
| OTP | Fixed dev codes per env | SMS OTP via adapter |

Mocks implement real interfaces — provider swap is config, not refactor.

## 6 · Testing & Quality Gates
- Promise-engine transition matrix (all four types) precedes any UI consumption — permanent regression suite including dual-clock test.
- Property-style journal replay idempotency; concurrent field-LWW cases pinned.
- Integration flows: sync → transition → lapse → ladder → ack → reconciliation via supertest; inbound-SMS ingestion path tested with scripted gateway payloads.
- CI: lint + strict tsc + vitest on PRs; flutter analyze/test mobile; no direct main commits.
- Honesty checks ship as features: capture-coverage digests, attested-ratio metrics, anomaly flags (P6).

## 7 · KPI Definitions & Baseline Mode (V14)

| KPI | Formula | Notes |
|---|---|---|
| Referral completion rate | status ∈ {kept, reconciled} ÷ all referrals initiated (excluding closed_na) × 100 | reconciled counted, visibly flagged lower-confidence |
| Session-supply kept rate | vaccine_supply kept ÷ sessions due in window | silence counts as lapsed (T+1d timeout) |
| Consult SLA met rate | consults responded ≤ target ÷ consults opened | targets: urgent 4h, routine 24h |
| Median time-to-arrival | median(sla_start → first arrival evidence) | referral type |
| Capture coverage mix | share of arrivals by source: scan/manual/batch/fuzzy | decay alarm per facility |
| Attested-vs-verified ratio | reconciled+attested completions ÷ total completions | data-quality signal, not a fault metric |
| Officer ack latency | p50/p90 of escalation → ack per officer | accountability applies to operators too |
| Field-to-system lag | median(created_at → sla_start) per catchment | connectivity reality, never a fault |

All KPIs render in **measure-only baseline mode** for the first N weeks of any deployment; targets (+20–30% referral completion etc.) are set against captured baselines, not asserted ones.

## 8 · Demo Script — Referral → Vaccine Arc (seeded P0, exercised G-P6)

Cast: ASHA *Rekha* · *Sunita* ANC-28w · CHC 14 km · ANM *Prerna* · Block MO *Dr. Rao* · Cold-chain officer *Shinde*.

1. **Offline red-flag beat** *(familiar opener)* — airplane mode: BP 160 + swelling → red-flag trace → emergency referral; no data network → GSM SMS bypass fires to block office; physical-escalation prompt shown. *(V10, V12)*
2. **Sync beat** — connectivity returns: priority-order drain; `sla_start` stamped; lag shown as metric. *(V1)*
3. **Arrival beat** — QR scanned at registration → `arrived` (source: scan) → `completed`. *(Passive matching)*
4. **False-lapse & reconciliation beat** — seeded routine referral never scanned → lapsed → non-accusatory mock SMS → Dr. Rao acks deep-link → Rekha attests next visit → `reconciled`, lower-confidence flag visible. *(V2, V3, V5)*
5. **Vaccine arc — commitment** *(the sharper differentiation)* — Prerna bulk-seeds monthly VHND plan; session for village X commits BCG + Pentavalent (`independence: plan_seeded` shown honestly); PHC dispatch-confirm upgrades flag. *(V6)*
6. **Vaccine arc — miss & page** — seeded second session runs without stock → ASHA logs "absent" → lapsed at T+1d logic demonstrated → Shinde paged, acknowledges → district board shows session-miss red. *(Second-tier evidence, wholesale ladder reuse)*
7. **Child-absent follow-through beat** — due-list child absent from session 1 → automatic follow-up promise appears on Rekha's round list → attested outcome closes it. *(V8 — U-WIN-complementary moment)*
8. **Consult beat** — photo/vitals request → Dr. Rao responds with voice note → played at Sunita's home. *(PS Pillar 1)*
9. **Accountability close** — district board: completion %, session-kept %, capture mix, ack latency, baseline-mode toggle; print RCH CSV opening cleanly; show roadmap-adapter schemas as one-screen extensibility proof. *(V11, V13, V14)*

Second seed profile: paper-register facility (batch entry default) for pilot-realism questions.

## 9 · Risk Register & Chosen Defaults

| Risk / question | Default | If wrong |
|---|---|---|
| Pilot registration workflow | Paper register → batch entry primary | Capture UX reorder; low cost |
| eVIN/U-WIN accessible feed for pilot | Assume none; run on plan-seeded + self-logged data with honest flags | Adapters already defined — plug in |
| Doctor coverage | Team member operates doctor tab | Pilot needs volunteer roster |
| Device floor | Android Go 8.0 / 1 GB from day one | Media-handling re-test |
| Languages | Hindi + Marathi; locale structure ready | Translation effort only |
| ASHA turnover mid-pilot | Transfer operation built P0/P3 — feature, not edge case | Silent continuity loss; never cut |
| Independence degradation on session promises | Flagged `plan_seeded`, surfaced everywhere | None — honesty is the fallback |
| Scope creep beyond four types | Roadmap adapters carry the ambition; cut order §10 protects core | Overrun risk acknowledged (~+35–45% vs two-type build, amortized by generic engine) |

## 10 · Cut Order Under Pressure (standing rule)

Cut from: out-of-scope items first (never were in) → P6 polish → P4 follow-up cohorts beyond ANC/IMNCI → P5 RCH-export niceties → noticeboard/smart-routing leftovers (already roadmap).
**Never cut:** the generic engine + its test matrix · capture ladder with typed evidence · escalation ladders + ack surfaces · emergency GSM bypass · household/transfer registry · independence flags. These six are the product; everything else displays or feeds them.

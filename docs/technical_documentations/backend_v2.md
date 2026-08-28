# Bharosa — Backend Technical Documentation

> **This is the v2 (full build) document.** For the minimal v1 prototype, see `backend.md` in this folder.
> Part of a three-file set: **`backend.md`** (this file, the contract authority) · `website.md` · `app.md`.
> Target design basis: `architecture_v5.md` + `plan.md` (v6) + `website/index.html` + audit `docs/architecture/architecture_v5_audit.md` (findings V1–V14).
> Status basis: **Both** — the mature 4-promise-type target is documented as primary; the earlier `prototype-mvp.md` build is recorded as the starting milestone in §9.

---

## 1 · Overview

The backend is the single source of truth for Bharosa ("Closing the Care Loop", SIH 2026 PS 26133). It implements one idea: a **generic `Promise` ledger** that records a cross-tier commitment, sets a deadline, collects evidence that the commitment was kept (or notes its absence), and escalates every miss to a named, accountable person who must acknowledge it. Every concrete feature — a referral, a vaccine-session supply commitment, a teleconsult request, a follow-up visit — is the same `Promise` entity with a different evidence adapter plugged in.

**Primary use case:** field and facility workers create promises offline/at-point-of-use; the backend verifies them using evidence from the *receiving* tier (registration match, point-of-use log, structured consult response, round attestation), runs type-specific deadline ladders, and pages accountable officers on a miss.

**Target users (actors served by this backend):** ASHA/ANM (via field app), facility registration staff (via capture web), Block MO, cold-chain/immunization officer, district nodal officer, doctor (via doctor tab), ANM supervisor.

**Non-goals (deliberately NOT done here):**
- No patient-facing channel of any kind — no SMS/IVR/OTP to beneficiaries (removed by construction; audit V-removed-patient-comms).
- No clinical decision engine — triage produces *route decisions* only; diagnosis stays with humans.
- No cold-chain/temperature monitoring (eVIN's job) and no dose-level administration tracking (U-WIN's job) — this backend verifies *supply commitments* and *absence follow-through*, not those incumbent functions.
- No payment/incentive disbursement — only a read-only transparency ledger.
- eSanjeevani, ABDM HIP, U-WIN, eVIN are **named interfaces / evidence-source adapters**, never rebuilt.

---

## 2 · System Architecture

### 2.1 Components

```
                        ┌──────────────────────────────────────────────┐
   Flutter field app ───┤                                              │
   (ASHA/ANM)           │   API Gateway (Fastify)                      │
        │  /sync (priority delta)      │  device PIN + JWT, TLS1.3 pin  │
        │                              │  per-device rate limits        │
   Facility-capture ───┤              │                                │
   (zero-install web)  │              ▼                                │
        │  /capture (registration_match)  Generic Promise Engine       │
   Dashboard/Doctor ───┤              │  transition state machine       │
   (web)               │              │  (pure fns in shared-contracts)│
        │  /promises /metrics /acks   │  scheduler (pg-boss 60s tick)  │
                        │              │  escalation ladders + HMAC acks│
   SMS gateway phone ──┤              ▼                                │
   (inbound GSM)       │   Sync Service ──▶ outbox ──▶ NotificationAdapter
                        │   monotonic seq, chunked, DLQ                │
                        │              ▼                                │
                        │   FHIR-shaped Store (PostgreSQL 16)          │
                        │   promise + *_detail · patient · household  │
                        │   encounter · promise_event · stock_event   │
                        │   config: evidence_timeout · incentive_rate │
                        │              ▼                                │
                        │   Named adapters (interfaces only):          │
                        │   eSanjeevani · ABDM HIP · U-WIN · eVIN      │
                        └──────────────────────────────────────────────┘
```

| Component | Responsibility |
|---|---|
| **API Gateway (Fastify)** | Single HTTP edge. Device-bound PIN authn, JWT access(15m)+refresh rotation, per-device rate limits, TLS 1.3 + cert pinning, request validation against `shared-contracts`. |
| **Generic Promise Engine** | The product. Pure transition functions (no I/O) in `shared-contracts`; server serializes intents and appends an audit `promise_event` per accepted transition. Enforces dual-clock, typed evidence, terminal-annotation rule, independence flag. |
| **Sync Service** | Per-device monotonic sequence; chunked bidirectional deltas; replayable journals; dead-letter queue. Only active caseload syncs to a device. Priority classes: `emergency > referral > consult > followup > analytics`. |
| **Scheduler (pg-boss)** | Postgres-native job queue (deliberately **no Redis** — one fewer moving part to operate on a district server). 60s tick: evidence-timeout lapse detection, ladder instantiation, ack-recording reminders. Idempotent under re-run. |
| **FHIR-shaped Store** | PostgreSQL 16. Resources modeled FHIR-shaped (Patient/Household/Encounter/Consent) but stored in relational tables for query performance. Append-only audit. DPDP consent artifacts. |
| **outbox + NotificationAdapter** | Outbox table buffers staff/officer alerts. `MockSmsProvider` (**free** — used in prototype **and** MVP/demo) → `DLT-gateway` interface in production (**paid** DLT-registered Indian SMS aggregator, **post-MVP only**). HMAC deep-links embedded in SMS. Only staff/officer alerts, never patient-facing. |
| **Named adapters** | eSanjeevani (consult request/response objects), ABDM HIP (mock creds, flag-gated), U-WIN (stub due-list/beneficiary), eVIN (stub dispatch) — interfaces defined, not implemented live. |

### 2.2 End-to-end traces

**Referral promise (built):**
```
ASHA app creates referral offline (created_at stamped, status=open, sla_start=null)
  → sync drains → server stamps sla_start (ladders fire ONLY on sla_start, V1)
  → facility capture scans QR / manual code / batch → POST /capture → registration_match evidence
  → engine transitions open→kept (arrived→completed); or
  → scheduler detects no evidence within SLA (red_flag 24h/urgent 48h/routine 7d) → open→lapsed→escalated
  → ladder: ASHA→Block MO→District nodal; each must ack (deep-link or dashboard)
  → if ASHA later attests on next visit → escalated→reconciled (terminal annotation, lower-confidence flag, V3)
```

**Vaccine-session-supply promise (built):**
```
ANM bulk-seeds monthly RI/VHND plan → commitments created (independence flagged plan_seeded, V6)
  → optional PHC dispatch-confirm upgrades independence flag
  → on session date, ASHA single-taps point-of-use log (vaccine present/absent) via /capture/session
  → present → kept; absent OR silence past T+1d → lapsed→escalated to cold-chain officer
```

### 2.3 Key architectural decisions (with tradeoffs)

| Decision | Why | Tradeoff / guess |
|---|---|---|
| **Single generic `Promise` entity; types = evidence adapters** | Makes consult/followup/diagnostics additive, not new subsystems (v5 core). | Slightly more abstract code; accepted. |
| **pg-boss instead of Redis** | One fewer infra component on a district server; Postgres already required. | Less throughput than Redis for very high volume; fine at district scale. |
| **Dual-clock (`created_at` vs `sla_start`)** | Offline-created red-flag must not insta-lapse on sync (V1, critical). | Two timestamps to reason about everywhere; net win. |
| **Typed evidence `{source, confidence, capturedAt}`** | Drives audit-sampling weights + data-quality metrics (V2). | More structured writes. |
| **Terminal annotations, never reopen (V3)** | Late attestation against a closed promise must attach without overwriting history. | `reconciled` is lower-confidence, surfaced as such. |
| **`independence` flag on vaccine commitments (V6)** | ASHA writing both sides silently degrades the USP; flag makes it visible, never silent. | Honesty over neatness. |
| **Silence = miss via evidence-timeout table (V7)** | Absence of a log is a miss, not assumed success. | Configurable per district; wrong timeout → false lapses (mitigated by baseline mode). |
| **Passive arrival capture (registration match)** | An active "accept" step measures app interaction, not care delivered (v5 §5). | Depends on facility registration discipline; attestation fallback covers weak sites. |
| **Postgres-native queue, relational FHIR-shaped store** | Operations simplicity; FHIR shape for future ABDM interop. | Not a document store; mapping layer needed for full FHIR export. |

---

## 3 · Pipeline / Core Logic

### 3.1 Promise state machine (authoritative)

Status set: `open | kept | lapsed | escalated | reconciled | closed_na`.

```
open ──evidence(kept)──▶ kept
open ──timeout(no evidence)──▶ lapsed ──▶ escalated
escalated ──ack+resolution──▶ reconciled | kept(late)
closed promises (kept|lapsed|reconciled|closed_na) accept ANNOTATIONS ONLY (confidence metadata) — never reopen (V3)
```

Per-type transition detail:

| Type | Commit (open) | Kept trigger | Lapse trigger (timeout) | Escalates to |
|---|---|---|---|---|
| referral | ASHA/ANM refers | `registration_match` evidence (scan/manual/batch) or `attestation`+reconcile | red_flag 24h · urgent 48h · routine 7d from `sla_start` | ASHA → Block MO → District nodal |
| vaccine_supply | plan-seeded / PHC confirm | `session_log` point-of-use "present" | T+1d after session date, or "absent" log | Block cold-chain/immunization officer |
| consult | worker triage route | structured response + voice note within SLA | urgent 4h · routine 24h | requesting facility |
| followup | protocol enrollment + child-absent auto-gen (V8) | ASHA round attestation | next-round date | supervisor (repeat misses only) |

### 3.2 Evidence-timeout table (in `shared-contracts`, district-configurable — V7)

```
referral:   red_flag=24h, urgent=48h, routine=7d
vaccine_supply: session_date + 1d
consult:    urgent=4h, routine=24h
followup:   next_round_date
```

### 3.3 Scheduler tick (pg-boss, 60s)

1. Scan `promise` where `status=open` and `sla_start+timeout < now` → transition `open→lapsed→escalated`, instantiate ladder.
2. For each `escalated` with unacked rungs past ack-SLA → emit outbox alert (non-accusatory copy, V-ack-copy) + HMAC deep-link.
3. Re-run is idempotent: tick reads current status, never double-transitions.

### 3.4 Sync journal & conflict resolution

- Per-device monotonic `seq`; client sends `[last_seq, ops]`; server returns deltas + new seq.
- Field-created promise carries `created_at` (device clock) and `sla_start=null` until server receipt.
- Concurrent edits: server is single-writer; last-write-wins on the promise row version; append-only events never overwrite. Journal replay is idempotent (property test).

### 3.5 GSM inbound ingestion (V10)

Block-office Android gateway polls inbound SIM → creates high-priority sync event paging MO/CHO. Plain-GSM SMS needs no data network; protocol copy mandates physical escalation regardless of app state.

### 3.6 Failure modes & handling

| Stage | Failure | Handling |
|---|---|---|
| Sync upload | Network drop mid-upload | Kill-app mid-sync loses nothing; journal replayed on next connectivity (G-P2). |
| Evidence capture | Facility registration discipline weak | ASHA attestation fallback → `reconciled`, lower-confidence flag (V3). |
| Vaccine commitment | ASHA writes both sides | `independence: plan_seeded`/`degraded` flag surfaced everywhere (V6). |
| Lapse detection | Wrong timeout config | Baseline mode (measure-only) for first N weeks; targets set vs captured baseline (V14). |
| Incentive gaming (false "kept") | GPS/timestamp implausible | Plausibility checks + supervisor spot-audit; anomalies **flagged, never auto-blocked**. |
| API abuse | Burst from device | Per-device rate limits; emergency-class traffic exempted but flagged. |

---

## 4 · API / Endpoint Specification

Base: `/api`. Auth: `POST /auth/*` unauthenticated; all others require `Authorization: Bearer <JWT>` (15m) + device binding claim. HMAC deep-links for ack are signed, not bearer-authenticated.

### 4.1 Auth
| Method | Path | Purpose | Auth | Key errors |
|---|---|---|---|---|
| POST | `/auth/device/register` | Bind device PIN → issue refresh token | none (enrollment) | 409 already-enrolled |
| POST | `/auth/device/login` | PIN → access+refresh JWT | device PIN | 401 invalid, 423 locked |
| POST | `/auth/refresh` | Rotate access token | refresh JWT | 401 expired |

### 4.2 Sync
| Method | Path | Purpose | Auth | Key errors |
|---|---|---|---|---|
| POST | `/sync/push` | Upload device journal ops (priority-ordered) | device | 409 seq-conflict (replay) |
| GET | `/sync/pull?since=seq` | Download caseload deltas | device | 401 |
| GET | `/sync/health` | Per-device lag metric | device | — |

### 4.3 Promises (generic)
| Method | Path | Purpose | Auth | Key errors |
|---|---|---|---|---|
| POST | `/promises` | Create promise (any type) | device/role | 422 invalid type/shape |
| GET | `/promises?type=&status=&facility=` | List (role-scoped) | role | 403 scope |
| GET | `/promises/:id` | Detail + ladder + events | role | 404 |
| POST | `/promises/:id/evidence` | Attach typed evidence | role/device | 422 bad source |
| POST | `/promises/:id/annotate` | Terminal annotation (closed only) | role | 409 if open/reopen-attempt |

### 4.4 Referrals
| Method | Path | Purpose | Auth |
|---|---|---|---|
| POST | `/referrals` | Create referral promise (wrapper over `/promises`) | device |
| GET | `/referrals?priority=&status=` | List (PHC/MO dashboard) | role |
| POST | `/referrals/:id/accept` \| `/reject` | Facility disposition (legacy PHC dashboard compat) | role |

### 4.5 Sessions (vaccine-supply)
| Method | Path | Purpose | Auth |
|---|---|---|---|
| POST | `/sessions/plan` | Bulk-seed ANM monthly RI/VHND plan → commitments (`plan_seeded`) | ANM |
| POST | `/sessions/:id/dispatch-confirm` | PHC confirms dispatch → upgrades independence flag | PHC |
| POST | `/sessions/:id/point-of-use` | ASHA single-tap present/absent log | ASHA |

### 4.6 Capture (facility)
| Method | Path | Purpose | Auth |
|---|---|---|---|
| POST | `/capture/arrival` | Scan/manual/batch → `registration_match` evidence (V2 typed) | facility |
| POST | `/capture/fuzzy-match` | name+village fuzzy confirm (terminal-annotation safe) | facility |

### 4.7 Consults
| Method | Path | Purpose | Auth |
|---|---|---|---|
| POST | `/consults` | Worker → doctor tab request (photos/vitals/summary) | device |
| GET | `/consults/queue` | Doctor tab longitudinal queue | doctor |
| POST | `/consults/:id/respond` | Structured response + voice note within SLA | doctor |

### 4.8 Tasks / Follow-up
| Method | Path | Purpose | Auth |
|---|---|---|---|
| GET | `/tasks?worker=` | ASHA follow-up + child-absent list (V8) | ASHA |
| POST | `/tasks/:id/attest` | Round-visit outcome write-back | ASHA |

### 4.9 Exports / Metrics
| Method | Path | Purpose | Auth |
|---|---|---|---|
| GET | `/exports/rch-csv?catchment=` | RCH-format register CSV (ANM catchment, V11) | ANM |
| GET | `/exports/ndjson` | FHIR NDJSON nightly export | district |
| GET | `/metrics?facility=&baseline=` | KPI formulas (plan §7) + baseline mode (V14) | role |

### 4.10 Deferred to post-MVP
Diagnostics / medicine-fulfillment / appointment-slot / data-capture digest endpoints — schema shipped, adapters not built.

**Cross-reference:** `website.md` §4 and `app.md` §4 consume exactly these endpoints.

---

## 5 · Data Model / File Structure

### 5.1 Schema (PostgreSQL 16, FHIR-shaped)

```
promise
  id uuid PK
  type enum(referral|vaccine_supply|consult|followup)   -- roadmap: diagnostic|medicine_fulfillment|appointment_slot|data_capture
  committed_by jsonb {role, facilityId?, workerId?}
  committed_to jsonb {role, facilityId?}
  description jsonb                       -- per-type structured payload
  created_at timestamptz                  -- V1 field reality, never drives ladders
  sla_start timestamptz null              -- V1 server receipt; ladders fire ONLY here
  deadline timestamptz null               -- derived: sla_start + type timeout
  evidence jsonb null                     -- {kind, source, confidence, capturedAt}
  independence enum(direct|plan_seeded|degraded) null   -- V6
  status enum(open|kept|lapsed|escalated|reconciled|closed_na)
  ladder jsonb[]                          -- [{role, workerId?, ackAt?, ackVia?}]
  version int                             -- optimistic concurrency

referral_detail / session_detail / consult_detail / followup_detail  -- type-specific payloads, 1:1 with promise

patient
  local_id uuid PK
  abha_ref text null                      -- opportunistic, never dependency
  name, fuzzy_dob, village

household
  household_id uuid PK
  catchment_assignment, landmark_descriptor
  members jsonb[]
  transfer_log jsonb[]                    -- V4: supervisor approval + effective date + receiving-worker ack

encounter            -- append-only; type, facility, worker, ts
promise_event        -- append-only audit; every transition appends a row
stock_event          -- ground-truth negatives; feeds future medicine adapter
outbox               -- buffered staff/officer alerts (never patient-facing)

config tables:
  evidence_timeout   -- per-type timeout rows (V7, district-configurable)
  incentive_rate     -- NHM rate JSON (V11)
  ri_schedule        -- RI/VHND JSON seed
  rule_bundle        -- IMNCI-lite versioned JSON, offline-bundled
```

### 5.2 Repo / file structure (services + supporting)

```
closing-the-care-loop/
├── services/
│   ├── api/                      # Fastify app
│   │   ├── src/
│   │   │   ├── gateway/          # auth, jwt, rate-limit, tls-pin, validation
│   │   │   ├── engine/           # transition pure fns (mirror shared-contracts)
│   │   │   ├── sync/             # monotonic seq, chunked delta, DLQ
│   │   │   ├── scheduler/        # pg-boss 60s tick: lapse/ladder/ack
│   │   │   ├── routes/           # /auth /sync /promises /referrals /sessions
│   │   │   │                     #   /capture /consults /tasks /exports /metrics
│   │   │   └── adapters/         # eSanjeevani, abdm, uwin, evin (interfaces/stubs)
│   │   ├── migrations/           # node-pg-migrate
│   │   └── test/                 # transition matrix + dual-clock regression
│   └── sms-gateway/              # Android app: inbound SIM → sync events
├── packages/
│   └── shared-contracts/         # OpenAPI, TS types, transition tables,
│                                  #   evidence-timeout, rule bundles, event registry
├── infra/
│   ├── docker-compose.yml        # postgres + api (dev)
│   └── seed/                     # deterministic demo dataset (plan §8)
└── docs/technical_documentations/# this set
```

### 5.3 Config / environment / secrets
- `DATABASE_URL` (Postgres 16)
- `JWT_ACCESS_TTL=900`, `JWT_REFRESH_TTL`, `JWT_SECRET`
- `HMAC_DEEPLINK_SECRET`, `DEEPLINK_TTL=900` (≤15 min, V-ack-token)
- `PG_BOSS_*` (uses same Postgres)
- `SMS_PROVIDER=mock|dlt` (mock = **free** outbox inspector, used for MVP/demo; dlt = **paid** DLT-registered Indian gateway, production-only, deferred)
- `ABDM_HIP_MODE=stub|sandbox` (flag-gated mock creds)
- `BASELINE_MODE_WEEKS=N` (V14)
- Secrets: never logged; device PIN + remote wipe for field devices.

---

## 6 · Tech Stack

| Layer | Choice | Justification |
|---|---|---|
| Language | Node.js (TS) | Team familiarity; Fastify perf; shared TS types with web/app via `shared-contracts`. |
| API framework | **Fastify** | Schema validation, low overhead, easy OpenAPI gen. (Note: `prototype-mvp.md` used Express — target supersedes it; see §9.) |
| DB | **PostgreSQL 16** | Relational query perf for KPI aggregates; FHIR-shaped modeling. |
| Queue | **pg-boss** | Postgres-native; **no Redis** — fewer ops components on district server. |
| Migrations | node-pg-migrate | Simple, reviewable SQL. |
| Auth | device PIN + JWT rotate + HMAC deep-links | Cheap shared devices; ack without full login. |
| Encryption-at-rest | SQLCipher on device; PG at rest via disk encryption | PHI on cheap shared devices (audit §9). |
| Client ORM (field) | drift over SQLCipher | Offline-first Flutter store mirroring server schema. |
| Constraint-flagged choices | No Redis, no Kubernetes, no patient SMS | District-server realism + SIH demo constraints, not "best practice" scale. |

### 6.1 Free / Open-Source Resource Inventory

The entire MVP/demo infrastructure is self-hostable on free, open-source software (`docker-compose up` + a district server / laptop). Every dependency below is **free** unless flagged.

| Dependency | License / Cost | Used in MVP? |
|---|---|---|
| Node.js, Fastify, node-pg-migrate | MIT / free | Yes |
| PostgreSQL 16 | PostgreSQL License / free | Yes |
| pg-boss | MIT / free (reuses Postgres, no Redis) | Yes |
| JWT, HMAC (deep-links) | free (stdlib/crypto) | Yes |
| SQLCipher (community edition) | public-domain / free (commercial license exists but not required) | Yes (app at rest) |
| drift (Flutter ORM) | Apache-2.0 / free | Yes (app) |
| React 18, Vite, TanStack Query | MIT / free | Yes (web) |
| BarcodeDetector API, html5-qrcode | free (browser API / MIT) | Yes (capture) |
| flutter_tts, connectivity_plus, telephony_sms | free (pub packages) | Yes (app) |
| pdfkit (root package.json) | MIT / free | Yes (PDF/exports) |
| TLS certificate | Let's Encrypt (free) or self-signed | Yes |
| eSanjeevani / ABDM / U-WIN / eVIN adapters | free government interfaces (stubbed) | Interface-only |
| **Twilio** | **paid** | **No — prototype predecessor only (see §9)** |
| **DLT SMS gateway** | **paid** (DLT-registered Indian aggregator) | **No — production path only, post-MVP (see §2 / §5.3)** |

**MVP cost = zero.** The SMS-gateway phone reuses an existing spare device + SIM (incoming SMS free in India; under `mock` provider no outbound cost is incurred). The only eventual paid dependency is the DLT gateway, required by TRAI for real Indian SMS in production and explicitly deferred beyond MVP.

---

## 7 · MVP Scope

**Ships in v1 (built-minimal across 4 types):**
- Generic Promise Engine + full transition test matrix (all 4 types) before any UI (G-P1).
- Scheduler lapse/ladder/ack (pg-boss).
- Sync service (priority classes, replay, DLQ).
- Referral promise end-to-end (capture ladder, typed evidence).
- Vaccine-session-supply (plan-seed + point-of-use + T+1d lapse).
- Consult thin loop (doctor tab request→response+voice note).
- Follow-up engine + child-absent auto-generation (V8).
- Escalation ladders + ack surfaces (MO inbox, cold-chain queue, ANM approvals, district board) with HMAC deep-links.
- Emergency GSM bypass (V10).
- Household/transfer registry (V4).
- Incentive ledger read-view + RCH CSV export (V11).
- KPI formulas + baseline mode (V14).
- Independence flags (V6) everywhere.

**Deliberately cut from MVP:**
- Diagnostics / medicine-fulfillment / appointment-slot / data-capture adapters (schema only).
- Live eSanjeevani/ABDM/U-WIN/eVIN feeds (stubs/interfaces).
- Production DLT SMS (mock outbox only).
- ABDM HIP certification (flag-gated mock).
- Predictive analytics, noticeboard, smart routing.

**Definition of done (G-P6):** demo script (plan §8, 9 beats) runs start-to-finish on clean `docker-compose up && flutter run` with zero manual DB edits; all gates G-P0…G-P6 green; dual-clock regression test permanent.

---

## 8 · Post-MVP Roadmap

- **Near-term:** live eSanjeevani request/response mapping; RCH double-entry polish; capture-coverage meta-promise digest (V13) auto-assignment.
- **Mid-term:** diagnostics / medicine-fulfillment / appointment-slot adapters (same schema); U-WIN & eVIN evidence-source feeds when accessible; ABDM HIP sandbox→certification.
- **Long-term / stretch:** production DLT gateway; predictive lapse risk; multi-district federation; iOS field app; additional locales beyond Hindi+Marathi.

---

## 9 · Current State vs Target (starting milestone)

`prototype-mvp.md` is the **earlier, simpler build** and serves as the Phase-0 slice:
  - Stack: Node/Express + Redis queue + Twilio (a **paid** service, used only in this prototype predecessor) + PostgreSQL; **no auth**. The target replaces Twilio with the **free** `MockSmsProvider` (see §2 / §5.3).
- Scope: offline SMS queue (IndexedDB/sqflite on app) + referral create/list/accept/reject + PHC dashboard (referral table, filters, counts).
- Mapping forward:
  - Express → **Fastify**; Redis → **pg-boss** (no Redis).
  - SMS queue → generalized into `Sync Service` + `outbox` + `NotificationAdapter` (mock→DLT).
  - Referral CRUD → `referral` wrapper over generic `/promises` + `/capture` evidence + escalation ladder.
  - PHC dashboard → folded into `website.md` role dashboards (MO inbox, cold-chain queue, district board).
  - No-auth → device PIN + JWT + HMAC deep-links.
  - 2-tier (referral only) → 4 promise types on one `Promise` entity.

The prototype is a valid starting milestone; the target above is the build-ready spec.

---

*Backend is the contract authority for `website.md` and `app.md`. Every endpoint in §4 is consumed by one of those files; every MVP feature has supporting schema (§5) and endpoints.*

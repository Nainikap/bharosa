# Bharosa — Backend Technical Documentation (v1 · Minimal Prototype)

> **v1 (minimal functioning prototype).** The full build is in `backend_v2.md`. This file documents the smallest backend that proves the core loop: a referral promise created offline by an ASHA, verified by facility arrival, escalated on miss, with an emergency GSM bypass for red-flag referrals.
> Part of a three-file v1 set: **`backend.md`** (this file) · `website.md` · `app.md`.
> Free-resource guarantee: identical to `backend_v2.md` §6.1 — **MVP cost = zero**, all open-source; only the DLT SMS gateway is paid and deferred (post-v2).

---

## 1 · Overview

The v1 backend is the contract authority for the minimal prototype. It implements the generic `Promise` entity (so v2 is purely additive) but **only the referral promise type + red-flag emergency** are built. Everything else in `backend_v2.md` (vaccine-supply, consult, follow-up, incentive, baseline mode) is explicitly **v2**.

**Primary use case:** ASHA creates a referral offline (app) → syncs when connectivity returns → facility scans arrival → promise kept; or, on miss, an escalation ladder pages a named officer who must acknowledge. A red-flag referral additionally triggers a plain-GSM emergency alert when data is dead.

**Target users:** ASHA/ANM (app), facility registration staff (web), Block MO / District nodal (ack).

**Non-goals (v1):** no vaccine-session, consult, or follow-up promises; no KPI district board; no exports; no incentive ledger; no patient-facing comms (by construction).

---

## 2 · System Architecture

```
Flutter app (ASHA) ── /sync (priority delta) ──▶ API Gateway (Fastify)
Facility-capture (web) ── /capture/arrival ──▶ Generic Promise Engine (referral only)
Dashboard (MO ack) ── /promises?escalated ──▶ Escalation ladder + HMAC ack
SMS gateway phone ── inbound GSM (red-flag) ──▶ high-priority sync event
        │
        ▼
   Sync Service (minimal) ──▶ outbox ──▶ MockSmsProvider (free)
        ▼
   FHIR-shaped Store (PostgreSQL 16)  [promise · referral_detail · patient · household · encounter · promise_event · outbox]
        ▼
   Scheduler (pg-boss, 60s) — referral timeout lapse + ladder instantiation
```

| Component | Responsibility (v1) |
|---|---|
| **API Gateway (Fastify)** | Device PIN authn, JWT (15m + refresh), per-device rate limits, TLS 1.3 + cert pinning, validation against `shared-contracts`. |
| **Generic Promise Engine** | Single `Promise` entity + transition state machine. v1 implements **referral** transitions only; schema already supports all 4 types (v2 additive). |
| **Sync Service (minimal)** | Per-device monotonic seq, chunked delta, replayable journal. Only referral + emergency ops sync in v1. |
| **Scheduler (pg-boss)** | 60s tick: referral evidence-timeout lapse (red_flag 24h / urgent 48h / routine 7d), ladder instantiation, ack reminders. Idempotent. |
| **outbox + MockSmsProvider** | Buffers staff/officer alerts. `mock` = **free** outbox inspector (v1/demo); `dlt` = paid, post-v2 only. HMAC deep-links in SMS. |
| **FHIR-shaped Store** | PostgreSQL 16; relational tables modeled FHIR-shaped. |

### 2.1 Key decisions
| Decision | Why (v1) | Tradeoff |
|---|---|---|
| Generic `Promise` entity from day one | v2 (vaccine/consult/followup) is additive, not a rewrite. | Slightly more abstract; worth it. |
| pg-boss (no Redis) | One fewer component on a district server; Postgres already required. | Lower max throughput (fine at district scale). |
| Dual-clock (`created_at` vs `sla_start`) | Offline red-flag must not insta-lapse on sync (audit V1). | Two timestamps to reason about. |
| Typed evidence | `registration_match`/`attestation` drive audit weight (V2). | More structured writes. |
| MockSmsProvider | Zero SMS cost in demo; DLT deferred. | Production needs paid gateway later. |

---

## 3 · Pipeline / Core Logic

**Referral state machine (v1):**
```
open ──registration_match evidence──▶ kept
open ──timeout (red_flag24h/urgent48h/routine7d from sla_start)──▶ lapsed ──▶ escalated
escalated ──ack + resolution──▶ reconciled | kept(late)
closed promises accept annotations only, never reopen (V3)
```

**End-to-end (v1 demo):**
```
App creates referral offline (created_at stamped, sla_start=null, priority from triage route)
  → /sync/push → server stamps sla_start (ladders fire ONLY here)
  → facility /capture/arrival (scan/manual/batch) → registration_match → open→kept
  → OR scheduler detects no evidence within SLA → open→lapsed→escalated
  → ladder: ASHA → Block MO → District nodal; each ack (deep-link or dashboard)
  → red-flag only: if no data network at creation, app sends plain-GSM SMS → gateway → paged immediately
```

**Failure modes:** weak facility registration → ASHA attestation fallback → `reconciled` (lower-confidence, V3). Network drop mid-sync → journal replayed, nothing lost.

---

## 4 · API / Endpoint Specification (v1)

Base `/api`. Auth: `POST /auth/*` unauthenticated; others require JWT + device binding.

| Method | Path | Purpose | Auth |
|---|---|---|---|
| POST | `/auth/device/register` | Bind device PIN → refresh token | none |
| POST | `/auth/device/login` | PIN → access+refresh JWT | device PIN |
| POST | `/auth/refresh` | Rotate access token | refresh JWT |
| POST | `/sync/push` | Upload device journal ops | device |
| GET | `/sync/pull?since=seq` | Download caseload deltas | device |
| GET | `/sync/health` | Per-device lag metric | device |
| POST | `/promises` | Create referral promise | device/role |
| GET | `/promises?type=referral&status=` | List (role-scoped) | role |
| GET | `/promises/:id` | Detail + ladder + events | role |
| POST | `/promises/:id/annotate` | Terminal annotation (closed only) | role |
| POST | `/referrals` | Create referral (wrapper over `/promises`) | device |
| GET | `/referrals?priority=&status=` | List (MO/PHC view) | role |
| POST | `/capture/arrival` | Scan/manual/batch → `registration_match` evidence | facility |
| POST | `/capture/fuzzy-match` | name+village confirm (terminal-annotation safe) | facility |

**Deferred to v2:** `/sessions/*`, `/consults/*`, `/tasks/*`, `/exports/*`, `/metrics`, evidence endpoint (v1 uses capture path only).

---

## 5 · Data Model / File Structure

### 5.1 Schema (PostgreSQL 16)
```
promise
  id uuid PK, type enum(referral|vaccine_supply|consult|followup)  -- only referral used in v1
  committed_by jsonb {role, facilityId?, workerId?}
  committed_to jsonb {role, facilityId?}
  description jsonb                 -- referral_detail payload
  created_at timestamptz            -- V1 field clock
  sla_start timestamptz null        -- V1 server receipt; ladders fire here
  deadline timestamptz null         -- derived: sla_start + referral timeout
  evidence jsonb null               -- {kind, source, confidence, capturedAt}
  status enum(open|kept|lapsed|escalated|reconciled|closed_na)
  ladder jsonb[]                    -- [{role, workerId?, ackAt?, ackVia?}]
  version int
referral_detail        -- type-specific payload (1:1)
patient                -- local_id, abha_ref null, name, fuzzy_dob, village
household              -- household_id, catchment, landmark, members (basic; transfer_log is v2)
encounter              -- append-only
promise_event          -- append-only audit (every transition)
outbox                 -- buffered staff/officer alerts (never patient-facing)
evidence_timeout       -- referral rows only (red_flag/urgent/routine)
```

### 5.2 Structure
```
services/api/  (Fastify: gateway, engine/referral, sync, scheduler, routes, adapters/stub)
packages/shared-contracts/  (OpenAPI, TS types, referral transition table, evidence-timeout)
infra/docker-compose.yml     (postgres + api dev)
```

### 5.3 Config / secrets
`DATABASE_URL`, `JWT_*`, `HMAC_DEEPLINK_SECRET` (≤15m), `PG_BOSS_*`, `SMS_PROVIDER=mock` (v1; dlt post-v2), `GATEWAY_SMS_NUMBER`. See `backend_v2.md` §5.3 for full list.

---

## 6 · Tech Stack
Node.js (TS) · Fastify · PostgreSQL 16 · pg-boss · node-pg-migrate · JWT/HMAC · drift (client) · SQLCipher. **All free/open-source** — full inventory and the two paid exceptions (Twilio legacy, DLT gateway) are in `backend_v2.md` §6.1.

---

## 7 · MVP Scope (v1)

**Ships:** generic Promise engine (referral transitions + test matrix), scheduler lapse/ladder, minimal sync, PIN authn, facility capture (arrival evidence), MO/district ack (dashboard + HMAC deep-link), emergency GSM bypass path, MockSmsProvider.

**Deliberately cut (→ v2):** vaccine-supply, consult, follow-up (+ child-absent), incentive ledger, household transfer, KPI/baseline mode, exports, live eSanjeevani/ABDM/U-WIN/eVIN feeds.

**Definition of done:** referral created offline → red-flag GSM bypass fires with data off → reconnect → journal drains → facility scan <5s shows `kept` → on seeded miss, MO ack recorded with latency. Runs on clean `docker-compose up`.

---

## 8 · Roadmap
- **v2 (immediate):** `backend_v2.md` — 4 promise types, full dashboards, exports, incentive, transfer, baseline mode.
- **Post-v2:** live eSanjeevani/ABDM/U-WIN/eVIN feeds, production DLT SMS, ABDM HIP cert, multi-district federation.

---

## 9 · Current State vs Target (v1)
`prototype-mvp.md` is the starting milestone: Node/Express + Redis + Twilio + PostgreSQL, no auth, SMS-queue + referral CRUD + PHC dashboard. v1 maps forward: Express→Fastify, Redis→pg-boss, Twilio→free MockSmsProvider, no-auth→PIN+JWT, and reframes referral as the generic `Promise` entity. The full mature target is `backend_v2.md`.

*Backend v1 is the contract authority for `website.md` (v1) and `app.md` (v1). Every v1 endpoint above is consumed by one of those files.*

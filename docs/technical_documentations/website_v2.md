# Bharosa — Website Technical Documentation

> **This is the v2 (full build) document.** For the minimal v1 prototype, see `website.md` in this folder.
> Part of a three-file set: `backend.md` (contract authority) · **`website.md`** (this file) · `app.md`.
> Target design basis: `architecture_v5.md` + `plan.md` (v6) + `website/index.html` + audit `docs/architecture/architecture_v5_audit.md`.
> Scope: **Both** — mature target primary; `prototype-mvp.md` PHC dashboard recorded as starting milestone in §9.

---

## 1 · Overview

The web tier is the **capture + oversight** surface of Bharosa. It has two distinct apps that share one API contract (`backend.md` §4):

1. **Facility Capture** — a zero-install web page used at the CHC/PHC OPD desk to record a patient's arrival (scan / manual code / batch) and to confirm vaccine-session dispatch. This is the *receiving-tier evidence* source for referral and vaccine-supply promises.
2. **Oversight Dashboards** — React role-scoped views: Block MO escalation inbox, cold-chain/immunization officer session-miss queue, ANM approvals, District Board (KPI panel + baseline mode), and the Doctor Tab (consult store-and-forward).

**Primary use cases:** facility staff close the referral loop with one scan; officers acknowledge escalations and are paged by name; district leadership watches completion %, session-kept %, capture-mix decay, and ack latency; doctors respond to consult requests with context.

**Target users (actors):** facility registration staff, Block MO, cold-chain/immunization officer, district nodal officer, doctor, ANM supervisor.

**Non-goals (deliberately NOT done here):**
- No clinical data entry / diagnosis.
- No patient-facing UI of any kind.
- No promise *creation* for field promises (that is the app's job); the web tier only creates capture evidence, ack escalations, and operates consult/oversight views.
- No rebuild of eSanjeevani/ABDM/U-WIN/eVIN — consumed as adapters via backend.

---

## 2 · System Architecture

### 2.1 Components

```
Facility Capture (Vite+React, zero-install)
   arrival scan / manual / batch ──▶ POST /capture/arrival (registration_match)
   PHC dispatch-confirm        ──▶ POST /sessions/:id/dispatch-confirm
        │
Oversight Dashboards (Vite+React, role-scoped)
   MO inbox · cold-chain queue · ANM approvals · District Board · Doctor Tab
        │  TanStack Query  ▲ reads /promises /metrics /consults /tasks /exports
        ▼
   Backend API (Fastify)  ── see backend.md
        │
   HMAC deep-link ack (from staff SMS) ──▶ POST /promises/:id (ack path)
```

| Component | Responsibility |
|---|---|
| **Facility Capture** | Lightweight, no build step required at facility. Barcode/QR scan (BarcodeDetector, html5-qrcode fallback), manual code entry, end-of-day batch grid, fuzzy name+village confirm. Writes `registration_match` / `session_log` evidence only. |
| **MO Escalation Inbox** | Lists `escalated` referral promises assigned to the Block MO rung; acknowledge via dashboard or HMAC deep-link; renders unacknowledged items red. |
| **Cold-chain Officer Queue** | Lists vaccine-supply `escalated` promises (session misses / absent logs); ack required. |
| **ANM Approvals** | Transfer approvals + audit-sampling assignments surfaced for acknowledgment. |
| **District Board** | KPI panel (formulas in `backend.md` §7 / plan §7), capture-mix decay alarm, anomaly flags, baseline-mode toggle, RCH CSV + NDJSON export buttons. |
| **Doctor Tab** | Consult queue with longitudinal context card; structured response + voice-note upload within SLA. |
| **Shared client** | TanStack Query cache; JWT from `/auth`; role routing; deep-link verification util. |

### 2.2 End-to-end traces

**Arrival capture → referral kept:**
```
Facility staff opens Capture → scans QR at OPD registration
  → POST /capture/arrival {code, source:'scan'}
  → backend attaches registration_match evidence → promise open→kept
  → District Board completion % updates within poll interval
```

**Escalation → ack:**
```
Scheduler lapses a referral → escalated → outbox SMS to Block MO with HMAC deep-link
  → MO taps deep-link → web verifies token (≤15m) → ack recorded (ackVia:'deeplink')
  → OR MO opens inbox → clicks Acknowledge → POST /promises/:id ack
  → rung ackAt stamped; if more rungs, next paged; board unacknowledged-red clears
```

### 2.3 Key decisions (with tradeoffs)

| Decision | Why | Tradeoff |
|---|---|---|
| **Two web apps, one repo, shared client** | Capture must be zero-install at facility; dashboards need richer role UX. | Slight duplication of auth/client glue (mitigated by shared package). |
| **TanStack Query** | Cache + invalidation around the promise ledger without hand-rolled fetch logic. | Extra dependency; acceptable. |
| **Role-scoped routing, server-authoritative scope** | DPDP purpose limitation; a worker never sees another catchment's data. | More guard code; required. |
| **HMAC deep-link ack fallback** | Officers may act from a plain SMS with no app open; deep-link verifies without full login. | Token expiry friction; dashboard fallback covers it (V5). |
| **Baseline mode toggle (V14)** | KPIs shown measure-only for first N weeks; targets set vs captured baseline, not asserted. | Less "impressive" early; honest. |

---

## 3 · Pipeline / Core Logic

### 3.1 Dashboard data pipeline
1. `usePromises` / `useMetrics` queries hit `/promises` and `/metrics`.
2. KPI formulas computed server-side (plan §7) — client only renders:
   - Referral completion = `(kept+reconciled) / (all - closed_na) × 100`
   - Session-supply kept = `vaccine_supply kept / sessions due`
   - Consult SLA met = `responded≤target / opened`
   - Median time-to-arrival, capture-coverage mix, attested-vs-verified ratio, ack latency p50/p90, field-to-system lag.
3. **Baseline mode (V14):** when `BASELINE_MODE_WEEKS` active, KPI cards render measured values with a "baseline" badge and hide any target-comparison coloring.
4. **Capture-coverage digest (V13):** weekly meta-promise assigned to ANM requiring acknowledgment of scan/manual/batch/fuzzy mix decay.

### 3.2 Capture evidence pipeline
- Scan: `BarcodeDetector.detect()` → code → `POST /capture/arrival {source:'scan'}`.
- Manual: code typed → `source:'manual_code'`.
- Batch: end-of-day grid of codes → bulk `POST /capture/arrival` rows `source:'batch_entry'`.
- Fuzzy: name+village → `POST /capture/fuzzy-match` → confirm → terminal-annotation-safe evidence.
- All sources typed (V2) so dashboards can weight by source.

### 3.3 Export pipeline
- `GET /exports/rch-csv?catchment=` → opens with expected column order (ANM register shortcut, V11).
- `GET /exports/ndjson` → FHIR-shaped NDJSON nightly export.

### 3.4 Failure modes
| Failure | Handling |
|---|---|
| Deep-link expired (>15m) | Redirect to dashboard login; ack via inbox instead (V5). |
| Scan unsupported (old browser) | html5-qrcode fallback; else manual code entry. |
| Metrics query slow | TanStack stale-while-revalidate; board shows last-good + "syncing". |
| Capture offline | Capture page queues to `navigator` storage; retries on reconnect (facility has better connectivity than field). |

---

## 4 · API Consumption (endpoints used by this tier)

This tier **consumes** (does not define) the backend contract in `backend.md` §4.

| View | Endpoints consumed |
|---|---|
| Facility Capture | `POST /capture/arrival`, `POST /capture/fuzzy-match`, `POST /sessions/:id/dispatch-confirm`, `GET /sync/health` |
| MO Inbox | `GET /promises?status=escalated&type=referral`, `POST /promises/:id` (ack rung) |
| Cold-chain Queue | `GET /promises?status=escalated&type=vaccine_supply`, `POST /promises/:id` (ack) |
| ANM Approvals | `GET /tasks?worker=`, `POST /tasks/:id/attest` (transfer/sampling ack) |
| District Board | `GET /promises`, `GET /metrics?baseline=`, `GET /exports/rch-csv`, `GET /exports/ndjson` |
| Doctor Tab | `GET /consults/queue`, `POST /consults/:id/respond` |
| Auth (all) | `POST /auth/device/login`, `POST /auth/refresh` |

**Deferred:** diagnostics/medicine/appointment adapter views (schema-only in backend).

---

## 5 · Data Model / File Structure

### 5.1 View models (read-only off API)
The web tier owns **no write schema**; it renders server shapes: `PromiseRec` (backend §3/§5), `ladder[]`, `evidence`, `metrics` aggregates, `Household`/`Patient` read views. Local client state: auth token, role, active filter, deep-link token.

### 5.2 Repo / file structure
```
closing-the-care-loop/
├── apps/
│   ├── facility-capture/        # Vite+React zero-install
│   │   ├── src/
│   │   │   ├── scan/            # BarcodeDetector + html5-qrcode fallback
│   │   │   ├── batch/           # end-of-day grid
│   │   │   ├── fuzzy/           # name+village confirm
│   │   │   └── api/             # capture client
│   └── dashboard/               # Vite+React role views
│       ├── src/
│       ├── roles/
│       │   ├── mo-inbox/
│       │   ├── coldchain-queue/
│       │   ├── anm-approvals/
│       │   ├── district-board/  # KPI panel + baseline toggle + exports
│       │   └── doctor-tab/      # consult queue + response
│       ├── shared/              # TanStack hooks, auth, deep-link verify
│       └── charts/              # KPI rendering (chart lib per §6)
└── packages/shared-contracts/  # types + OpenAPI consumed by both apps
```

### 5.3 Config / env
- `VITE_API_BASE` (backend URL)
- `VITE_DEEPLINK_SECRET` (for client-side pre-verify; server re-verifies)
- `VITE_CHART_LIB` (see §6)
- Auth tokens in memory + refresh; no PHI cached to disk beyond session.

---

## 6 · Tech Stack

| Layer | Choice | Justification |
|---|---|---|
| Framework | **React 18 + Vite** | Fast zero-config build; Capture app needs no install step. |
| Data/client | **TanStack Query** | Cache + invalidation around the promise ledger. |
| Capture scan | **BarcodeDetector** + **html5-qrcode** fallback | Native where available; broad fallback for old facility browsers. |
| Charts | chart lib (e.g. Recharts/AG-Grid) — **choice flagged** | KPI panel + decay alarms need rendering; exact lib is a build-time call, not settled. |
| Auth | JWT (access 15m) + HMAC deep-link verify | Mirrors backend §6; officers act from SMS without full login. |
| Constraint-flagged | No SSR, no heavy component lib | District-office machines are low-spec; keep bundle small. |

---

## 7 · MVP Scope

**Ships in v1:**
- Facility Capture: scan / manual / batch arrival; fuzzy confirm; PHC dispatch-confirm.
- MO escalation inbox with ack (dashboard + deep-link).
- Cold-chain officer session-miss queue with ack.
- ANM approvals surface.
- District Board: all KPI formulas (plan §7) + baseline-mode toggle + capture-mix decay + anomaly flags + RCH CSV + NDJSON export.
- Doctor Tab: consult queue + structured response + voice note.
- All role views server-scope-guarded.

**Deliberately cut:**
- Predictive analytics, noticeboard, smart-routing leftovers.
- Multi-locale UI beyond Hindi+Marathi (locale structure ready).
- Live eSanjeevani/ABDM embed (stubbed).

**Definition of done:** E2E localhost — referral scanned <5s shows evidenced on board (G-P3); seeded session miss lands in cold-chain inbox; deep-link ack recorded with latency metric; CSV opens with expected column order; NDJSON valid (G-P5).

---

## 8 · Post-MVP Roadmap

- **Near-term:** capture-coverage meta-promise digest auto-assignment UI (V13); richer doctor-tab longitudinal context.
- **Mid-term:** predictive lapse-risk widgets; noticeboard; smart routing of referrals to least-loaded facility.
- **Long-term:** additional locales; embedded live eSanjeevani/ABDM views; multi-district federation board.

---

## 9 · Current State vs Target (starting milestone)

`prototype-mvp.md` defines an **earlier PHC Dashboard** that is the seed for this tier:
- Stack: plain web (the doc predates the React/Vite split) showing referral table with filters (status/type/priority), detail view, Accept/Reject actions, count badges, `GET /api/referrals`, `PUT /api/referrals/:id`.
- Mapping forward:
  - Single PHC referral table → split into **MO inbox + cold-chain queue + ANM approvals + District Board** (role-scoped).
  - Accept/Reject → generalized **ack rung** on the escalation ladder (any promise type).
  - Filters → richer `?type=&status=&facility=` scoping off the generic `/promises`.
  - Plain HTML → **React 18 + Vite + TanStack Query**; adds Capture app, Doctor Tab, KPI panel, exports.
  - No auth → JWT + HMAC deep-links.
  - Referral-only → all 4 promise types surfaced.

The prototype PHC dashboard is a valid starting milestone; the target above is the build-ready spec.

---

*Website consumes the contract in `backend.md`. Every endpoint in §4 is defined there; every MVP feature here has supporting endpoints + data model in `backend.md` §4–§5. Field promise creation lives in `app.md`. The full free / open-source resource inventory (confirming zero MVP cost) is in `backend.md` §6.1.*

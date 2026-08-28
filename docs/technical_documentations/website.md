# Bharosa — Website Technical Documentation (v1 · Minimal Prototype)

> **v1 (minimal functioning prototype).** The full build is in `website_v2.md`. This file documents the smallest web tier that closes the referral loop: a Facility Capture page (arrival scan) + a basic MO/referral ack inbox.
> Part of a three-file v1 set: `backend.md` (contract authority) · **`website.md`** (this file) · `app.md`.
> Free-resource guarantee: same as `backend_v2.md` §6.1 — **MVP cost = zero**.

---

## 1 · Overview

The v1 web tier is the **capture + minimal oversight** surface. Two things only:
1. **Facility Capture** — zero-install page at the OPD desk to record a patient's arrival (scan / manual / batch), producing `registration_match` evidence for a referral promise.
2. **MO / Referral Ack Inbox** — lists escalated referral promises and lets the accountable officer acknowledge (dashboard or HMAC deep-link).

**Target users:** facility registration staff, Block MO / District nodal.

**Non-goals (v1):** no district KPI board, no doctor tab, no cold-chain queue, no exports, no baseline mode — all v2 (`website_v2.md`). No patient-facing UI.

---

## 2 · System Architecture

```
Facility Capture (Vite+React, zero-install)
   arrival scan / manual / batch ──▶ POST /capture/arrival (registration_match)
        │
MO / Referral Ack Inbox (Vite+React, role-scoped)
   lists /promises?status=escalated&type=referral ──▶ POST /promises/:id (ack rung)
        │  TanStack Query  ▲ reads
        ▼
   Backend API (Fastify) ── see backend.md (v1)
        │
   HMAC deep-link ack (from staff SMS) ──▶ POST /promises/:id (ack)
```

| Component | Responsibility (v1) |
|---|---|
| **Facility Capture** | BarcodeDetector scan (html5-qrcode fallback), manual code entry, end-of-day batch grid. Writes `registration_match` evidence only. |
| **MO / Referral Ack Inbox** | Lists escalated referral promises for the officer's rung; acknowledge via dashboard or HMAC deep-link; unacknowledged items render red. |
| **Shared client** | TanStack Query cache; JWT; role routing; deep-link verify. |

### 2.1 Key decisions
| Decision | Why (v1) | Tradeoff |
|---|---|---|
| Two tiny apps, one repo, shared client | Capture must be zero-install; inbox needs role UX. | Minor glue duplication. |
| Role-scoped, server-authoritative scope | DPDP purpose limitation. | More guard code (required). |
| HMAC deep-link ack fallback | Officers act from a plain SMS with no app open. | Token expiry → dashboard fallback covers it. |

---

## 3 · Pipeline / Core Logic

**Arrival capture → referral kept:**
```
Facility staff opens Capture → scans QR at OPD registration
  → POST /capture/arrival {code, source:'scan'}
  → backend attaches registration_match → promise open→kept
```

**Escalation → ack:**
```
Scheduler lapses a referral → escalated → outbox SMS (free mock) to Block MO with HMAC deep-link
  → MO taps deep-link → web verifies token (≤15m) → ack recorded (ackVia:'deeplink')
  → OR MO opens inbox → Acknowledge → POST /promises/:id ack
```

**Failure modes:** deep-link expired → redirect to dashboard login, ack via inbox; scan unsupported → html5-qrcode fallback / manual; offline capture → queues, retries on reconnect.

---

## 4 · API Consumption (v1)

This tier **consumes** the v1 contract in `backend.md` §4.

| View | Endpoints consumed |
|---|---|
| Facility Capture | `POST /capture/arrival`, `POST /capture/fuzzy-match`, `GET /sync/health` |
| MO / Referral Ack Inbox | `GET /promises?status=escalated&type=referral`, `POST /promises/:id` (ack rung) |
| Auth (all) | `POST /auth/device/login`, `POST /auth/refresh` |

**Deferred to v2:** `/sessions`, `/consults`, `/tasks`, `/exports`, `/metrics`, district board, doctor tab, cold-chain queue.

---

## 5 · Data Model / File Structure

### 5.1 View models
Read-only off API: `PromiseRec` (referral), `ladder[]`, `evidence`. Local state: auth token, role, active filter, deep-link token.

### 5.2 Structure
```
apps/
  facility-capture/   # Vite+React zero-install: scan/, batch/, fuzzy/, api/
  dashboard/          # Vite+React: roles/mo-inbox/ (only MO inbox in v1)
    shared/           # TanStack hooks, auth, deep-link verify
packages/shared-contracts/
```

### 5.3 Config / env
`VITE_API_BASE`, `VITE_DEEPLINK_SECRET` (server re-verifies). No PHI cached to disk beyond session.

---

## 6 · Tech Stack
React 18 + Vite · TanStack Query · BarcodeDetector + html5-qrcode fallback · JWT + HMAC deep-link. **All free** — full inventory in `backend_v2.md` §6.1.

---

## 7 · MVP Scope (v1)

**Ships:** Facility Capture (scan/manual/batch + fuzzy); MO/referral ack inbox with dashboard + HMAC-deeplink ack.

**Cut (→ v2):** district KPI board, doctor tab, cold-chain queue, ANM approvals, exports, baseline mode, multi-locale UI.

**Definition of done:** referral scanned <5s shows `kept` on inbox; seeded miss lands in MO inbox; deep-link ack recorded with latency metric (runs on localhost, no backend changes beyond `backend.md` v1).

---

## 8 · Roadmap
- **v2 (immediate):** `website_v2.md` — full role dashboards, KPI panel + baseline, doctor tab, exports.
- **Post-v2:** predictive analytics, noticeboard, smart routing, more locales.

---

## 9 · Current State vs Target (v1)
`prototype-mvp.md` PHC Dashboard (referral table, filters, Accept/Reject, count badges) is the seed. v1 maps: single PHC table → split into Facility Capture + MO/Referral Ack Inbox; Accept/Reject → generic ack rung on the escalation ladder; plain HTML → React 18 + Vite + TanStack. Full mature target is `website_v2.md`.

*Website v1 consumes the contract in `backend.md` (v1). Field promise creation lives in `app.md` (v1).*

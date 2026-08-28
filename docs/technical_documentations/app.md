# Bharosa — Field App (Mobile) Technical Documentation (v1 · Minimal Prototype)

> **v1 (minimal functioning prototype).** The full build is in `app_v2.md`. This file documents the smallest app that proves the core loop: **household caseload + IMNCI-lite triage + referral creation + emergency GSM bypass**.
> Part of a three-file v1 set: `backend.md` (contract authority) · `website.md` · **`app.md`** (this file).
> Free-resource guarantee: same as `backend_v2.md` §6.1 — **MVP cost = zero**.

---

## 1 · Overview

The v1 field app is the **ASHA/ANM-facing, offline-first** client proving the major functionality of Bharosa with the smallest possible surface:
1. **Caseload** — household-anchored active caseload view.
2. **Triage** — IMNCI-lite symptom modules → a route decision (`self-care | phc-visit | teleconsult | red-flag`).
3. **Referral creation** — a `phc-visit` route creates a referral (human code + QR).
4. **Emergency bypass** — a `red-flag` route triggers a plain-GSM SMS when data is dead.

**Target users:** ASHA worker, ANM (role-differentiated). No patient ever uses this app.

**Non-goals (v1):** no session log, no follow-up tasks, no incentive ledger, no consult creation, no transfer UI — all v2 (`app_v2.md`). No patient-facing comms (by construction).

---

## 2 · System Architecture

```
Flutter app (Android Go floor)
 ├─ Auth (device PIN + remote wipe stub)        ──▶ POST /auth/device/*
 ├─ Caseload (Household anchor)                  ──▶ /sync pull (caseload-only delta)
 ├─ Triage (IMNCI-lite → route decision)         ──▶ creates referral promise (phc-visit)
 ├─ Referral create (human code + QR)            ──▶ POST /referrals
 ├─ Emergency bypass (GSM SMS, red-flag only)     ──▶ device SMS → block-office gateway
 └─ SyncJournal (drift/SQLCipher, append-only)
       │ priority: emergency > referral > analytics
       ▼ jittered backoff, chunked
   Backend /sync/push + /sync/pull   (see backend.md v1 §4)
```

| Component | Responsibility (v1) |
|---|---|
| **Auth** | Device-bound PIN; SQLCipher unlocks local DB; remote-wipe stub. |
| **Caseload** | Household-anchored active caseload; only active caseload syncs to device. (Transfer visibility is v2.) |
| **Triage (IMNCI-lite)** | Icon-first + audio-prompt symptom modules → route decision; `phc-visit` and `red-flag` are the two promise-producing routes in v1. |
| **Referral create** | Human-readable code + QR for the referred patient/facility. |
| **Emergency bypass** | Red-flag → foreground sync attempt; if no data → one-tap plain-GSM SMS to gateway; protocol mandates physical escalation regardless. |
| **SyncJournal** | Append-only drift ops; priority classes; jittered backoff; replayable; kill-app mid-sync loses nothing. |

### 2.1 Key decisions
| Decision | Why (v1) | Tradeoff |
|---|---|---|
| Flutter + drift/SQLCipher | Low-spec Android; offline-first; AES-256 at rest. | iOS deferred (v2). |
| Dual-clock local capture | `created_at` (device) vs `sla_start` (server) prevents offline red-flag insta-lapse (V1). | Client sends both. |
| GSM bypass, not app-dependent | Emergency works with data dead. | Depends on block-office gateway phone. |
| Icon/audio UX, Hindi+Marathi | Low-literacy, multilingual field reality. | Other locales = v2. |

---

## 3 · Pipeline / Core Logic

**Offline referral flow (v1):**
```
Airplane mode: triage → red-flag OR phc-visit
  red-flag → emergency referral created (created_at stamped, sla_start=null) → foreground sync fails → GSM SMS fires
  phc-visit → referral created locally → queued in SyncJournal
  → connectivity returns → journal drains in priority order → server stamps sla_start
  → facility later scans arrival (/capture/arrival) → registration_match → open→kept
```

**Dual-clock (V1):** `created_at` on create; `sla_start` set on server sync receipt; ladders fire only from `sla_start`. App shows `field-to-system lag` as a connectivity metric, never a fault.

**Sync journal:** per-device monotonic `seq`; priority `emergency > referral > analytics`; jittered backoff; replay idempotent.

**Failure modes:** kill app mid-sync → journal replayed, nothing lost; conflict → server single-writer wins; no data + no GSM credit → protocol mandates physical escalation, attempt logged.

---

## 4 · API Consumption (v1)

Consumes the v1 contract in `backend.md` §4.

| Module | Endpoints (v1) |
|---|---|
| Auth | `POST /auth/device/register`, `POST /auth/device/login`, `POST /auth/refresh` |
| Sync | `POST /sync/push`, `GET /sync/pull`, `GET /sync/health` |
| Promises / Referrals | `POST /promises`, `GET /promises`, `POST /referrals`, `GET /referrals` |
| Emergency | GSM SMS to `GATEWAY_SMS_NUMBER` (no HTTP endpoint) |

**Deferred to v2:** `/sessions/*`, `/consults`, `/tasks`, `/metrics`, `/promises/:id/evidence`, `/promises/:id/annotate` (v1 relies on `/capture` from web for evidence).

---

## 5 · Data Model / File Structure

### 5.1 Local schema (drift over SQLCipher, mirrors backend v1 §5)
```
promise_local (id, type, committedBy, committedTo, description,
               createdAt, slaStart null, deadline null, evidence null,
               status, ladder, version, dirty_flag)   -- referral only in v1
household_local (householdId, catchment, landmark, members)
patient_local (localId, abhaRef null, name, fuzzyDob, village)
sync_journal (opId, seq, entity, payload, priority, status)
```
All PHI encrypted at rest (SQLCipher AES-256). Only active caseload rows sync.

### 5.2 Structure
```
apps/field-app/lib/
  auth/  caseload/  triage/  referral/  emergency/  sync/  models/  api/
  assets/locale/   # hi, mr
test/   # airplane-mode flow, journal replay
```

### 5.3 Config / device
`API_BASE`, `GATEWAY_SMS_NUMBER`, `DEVICE_FLOOR = Android Go 8.0 / 1GB`, `LOCALES = hi,mr`. Device PIN + remote-wipe hook; SQLCipher passphrase in secure storage.

---

## 6 · Tech Stack
Flutter 3.x · drift/SQLCipher · connectivity_plus · BarcodeDetector/mobile_scanner · telephony_sms · flutter_tts. **All free** — full inventory + paid exceptions in `backend_v2.md` §6.1.

---

## 7 · MVP Scope (v1)

**Ships:** PIN authn + remote-wipe stub; household caseload view; IMNCI-lite triage → route; referral creation (code + QR) on `phc-visit`; emergency GSM bypass on `red-flag`; minimal SyncJournal + dual-clock.

**Cut (→ v2):** session log, follow-up tasks + child-absent, incentive ledger, consult creation, transfer UI, full sync maturity polish, iOS.

**Definition of done (G-P2, v1):** airplane-mode triage red-flag → GSM bypass fires with data off → reconnect → referral drains → facility scan → `kept`; kill-app mid-sync loses nothing. Runs on `flutter run` against `backend.md` v1.

---

## 8 · Roadmap
- **v2 (immediate):** `app_v2.md` — session log, follow-up + child-absent, incentive ledger, consult creation, transfer, full sync.
- **Post-v2:** iOS, live U-WIN feed, multi-district, supervisor spot-audit UI.

---

## 9 · Current State vs Target (v1)
`prototype-mvp.md` describes an earlier offline SMS app (Flutter + sqflite, no auth, Twilio). v1 maps: local SMS queue → SyncJournal (drift/SQLCipher); compose→send → referral creation + emergency GSM bypass; no-auth → PIN+JWT; Twilio (paid) → free SyncJournal + GSM. Full mature target is `app_v2.md`.

*App v1 is the field creating/evidence surface. It consumes `backend.md` (v1); capture/oversight counterparts live in `website.md` (v1).*

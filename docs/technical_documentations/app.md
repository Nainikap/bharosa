# Bharosa — Field App (Mobile) Technical Documentation

> Part of a three-file set: `backend.md` (contract authority) · `website.md` · **`app.md`** (this file).
> Target design basis: `architecture_v5.md` + `plan.md` (v6) + `website/index.html` + audit `docs/architecture/architecture_v5_audit.md`.
> Scope: **Both** — mature target primary; greenfield against target (the `prototype-mvp.md` SMS app is the spiritual predecessor, noted in §9).

---

## 1 · Overview

The field app is the **ASHA/ANM-facing, offline-first** client of Bharosa. It runs on low-spec Android (Android Go / 1 GB RAM floor) through power cuts and 2G, and is the *creating* and *receiving-tier-evidence* surface for field promises. It lets a worker triage a household visit, create a referral or vaccine-session log, attest a follow-up, earn incentive transparency, and — critically — bypass dead data networks for emergencies via plain-GSM SMS.

**Primary use cases:** household-anchored caseload with transfer visibility; IMNCI-lite triage producing route decisions that create matching promises; referral creation with QR/code; vaccine point-of-use log; follow-up outcome attestation (incl. child-absent tasks); emergency red-flag GSM bypass; priority-ordered sync.

**Target users (actors):** ASHA worker, ANM (same app, role-differentiated). No patient ever uses this app.

**Non-goals (deliberately NOT done here):**
- No patient-facing communication (no SMS/IVR/OTP to beneficiaries) — removed by construction.
- No full clinical suite / diagnosis — triage yields *route decisions* only.
- No cold-chain monitoring, no dose administration recording (eVIN/U-WIN jobs).
- No payment — only read-only incentive ledger.

---

## 2 · System Architecture

### 2.1 Components

```
Flutter app (Android Go floor)
 ├─ Auth (device PIN + remote wipe)            ──▶ POST /auth/device/*
 ├─ Caseload (Household anchor + transfer)      ──▶ /sync pull (caseload-only delta)
 ├─ Triage (IMNCI-lite modules → route decision)─▶ creates Promise (referral/consult/followup)
 ├─ Referral create (human code + QR)           ──▶ POST /promises (or /referrals)
 ├─ Session log (plan-seeded → point-of-use tap)─▶ POST /sessions/:id/point-of-use
 ├─ Follow-up tasks (child-absent auto-gen)     ──▶ GET /tasks, POST /tasks/:id/attest
 ├─ Incentive ledger (read)                     ──▶ GET /metrics (role)
 ├─ Emergency bypass (GSM SMS)                  ──▶ device SMS → block-office gateway
 └─ SyncJournal (drift/SQLCipher, append-only)
       │ priority classes: emergency>referral>consult>followup>analytics
       ▼ jittered exponential backoff, chunked
   Backend /sync/push + /sync/pull   (see backend.md §4)
```

| Component | Responsibility |
|---|---|
| **Auth** | Device-bound PIN; local biometric optional; remote wipe stub; SQLCipher unlocks the local DB. |
| **Caseload** | Household-anchored active caseload; `transfer_log` visibility so a transferred worker inherits pending promises + follow-ups (V4). Only active caseload syncs to device. |
| **Triage (IMNCI-lite)** | Icon-first + audio-prompt symptom modules → route decision `self-care | phc-visit | teleconsult | red-flag`; each non-self-care route creates the matching promise (V12). |
| **Referral create** | Human-readable code + QR; destination suggestion aware of static service calendar (override always available). |
| **Session log** | ANM monthly RI/VHND plan bulk-entry seeds commitments (`independence: plan_seeded`); single-tap point-of-use "present/absent" on session day; absence auto-lapses at T+1d. |
| **Follow-up tasks** | Round-clustered task list; child-absent tasks auto-generated from sessions (V8); outcome attestation write-back. |
| **Incentive ledger** | Read-only `completed tasks × rate config` (V11). |
| **Emergency bypass (V10)** | Red-flag → immediate foreground sync attempt; if no data network → one-tap plain-GSM SMS to gateway number; protocol copy mandates physical escalation regardless. |
| **SyncJournal** | Append-only ops in drift; priority classes; jittered backoff; chunked upload; replayable; kill-app mid-sync loses nothing (G-P2). |

### 2.2 End-to-end trace (offline red-flag beat — demo beat 1)
```
Airplane mode: BP 160 + swelling → IMNCI-lite red-flag route → emergency referral created locally
  (created_at stamped, sla_start=null, status=open) → written to SyncJournal
  → foreground sync attempted, no data → one-tap GSM SMS fires to block-office gateway
  → connectivity returns → journal drains in priority order → server stamps sla_start
  → facility later scans arrival → registration_match → open→kept
```

### 2.3 Key decisions (with tradeoffs)

| Decision | Why | Tradeoff |
|---|---|---|
| **Flutter + drift/SQLCipher** | One codebase for low-spec Android; offline-first local store mirrors server; AES-256 at rest for PHI on shared devices. | iOS deferred; larger binary than native. |
| **Append-only SyncJournal** | Replayable, kill-safe, idempotent under re-run (property test). | Needs compaction strategy long-term. |
| **Dual-clock local capture** | `created_at` (device) vs `sla_start` (server) prevents offline red-flag insta-lapse (V1). | Client must send both; server authoritative on ladders. |
| **Priority-classed sync** | Emergency beats analytics when bandwidth is scarce. | More sync scheduler logic. |
| **GSM bypass, not app-dependent** | Emergency works with data dead; device SMS needs no data. | Depends on block-office gateway phone + SIM. |
| **Icon/audio UX, Hindi+Marathi** | Low-literacy, multilingual field reality. | Locale structure ready; other languages are translation effort only. |
| **Independence flag surfaced** | ASHA writing both sides of vaccine promise degrades USP; made visible (V6). | Honesty over neatness. |

---

## 3 · Pipeline / Core Logic

### 3.1 Local state machine (mirror of backend §3.1)
The app stores promises in the same status set (`open|kept|lapsed|escalated|reconciled|closed_na`) locally so UI is responsive offline; the server remains single-writer on transition. Local ops are *intents* in the journal, not final transitions, until server confirms.

### 3.2 Dual-clock handling (V1)
- On create: `created_at = now(device)`, `sla_start = null`.
- On sync receipt: server sets `sla_start`; ladders/timeouts fire only from `sla_start`.
- App shows `field-to-system lag` as a connectivity metric, never a fault.

### 3.3 Sync journal & conflict resolution
- Per-device monotonic `seq`; `POST /sync/push` sends ops since last ack; `GET /sync/pull?since=seq` returns deltas.
- Priority order: `emergency > referral > consult > followup > analytics`.
- Jittered exponential backoff on failure; chunked uploads for media-light payloads.
- Replay idempotent: server dedups by op id; concurrent field LWW pinned in tests.

### 3.4 Emergency GSM bypass (V10)
```
red-flag created
  → try foreground POST /sync/push (data)
  → if no data network: SmsSender.send(plainText alert → GATEWAY_NUMBER)
  → gateway phone ingests → high-priority sync event pages MO/CHO (backend §3.5)
  → protocol sheet: "accompany / 108 regardless of app state"
```

### 3.5 Plausibility & anti-gaming
GPS+timestamp captured with each evidence/attestation; implausible combos flagged (not auto-blocked) for supervisor spot-audit.

### 3.6 Failure modes
| Failure | Handling |
|---|---|
| Kill app mid-sync | Journal replayed on next launch; nothing lost (G-P2). |
| Conflict (server newer) | Server single-writer wins; local intent re-based on pull. |
| No data + no GSM credit | Protocol mandates physical escalation; app logs the attempt. |
| Device theft/loss | Remote-wipe stub + device PIN; only active caseload on device. |
| Android Go 1GB constraint | Media-handling re-tested at floor; voice notes kept short. |

---

## 4 · API Consumption (endpoints used by this app)

Consumes the backend contract in `backend.md` §4.

| Module | Endpoints |
|---|---|
| Auth | `POST /auth/device/register`, `POST /auth/device/login`, `POST /auth/refresh` |
| Sync | `POST /sync/push`, `GET /sync/pull`, `GET /sync/health` |
| Promises | `POST /promises`, `GET /promises`, `POST /promises/:id/evidence`, `POST /promises/:id/annotate` |
| Referrals | `POST /referrals`, `GET /referrals` |
| Sessions | `POST /sessions/plan`, `POST /sessions/:id/point-of-use` |
| Consults | `POST /consults`, `GET /consults/queue` (worker side) |
| Tasks/Follow-up | `GET /tasks`, `POST /tasks/:id/attest` |
| Metrics | `GET /metrics` (incentive ledger + baseline) |

**Deferred:** diagnostics/medicine/appointment adapter endpoints (schema-only in backend).

---

## 5 · Data Model / File Structure

### 5.1 Local schema (drift over SQLCipher, mirrors backend §5)
```
promise_local (id, type, committedBy, committedTo, description, createdAt,
               slaStart null, deadline null, evidence null, independence null,
               status, ladder, version, dirty_flag)
household_local (householdId, catchment, landmark, members, transferLog)
patient_local (localId, abhaRef null, name, fuzzyDob, village)
encounter_local (append-only)
session_plan_local (seeded commitments, independence)
task_local (follow-up + child-absent)
sync_journal (opId, seq, entity, payload, priority, status)
```
All PHI encrypted at rest (SQLCipher AES-256). Only active caseload rows sync.

### 5.2 Repo / file structure
```
closing-the-care-loop/
├── apps/
│   └── field-app/                 # Flutter 3.x
│       ├── lib/
│       │   ├── auth/              # PIN, remote wipe stub
│       │   ├── caseload/          # household anchor + transfer UI
│       │   ├── triage/            # IMNCI-lite modules + audio prompts
│       │   ├── referral/          # code + QR create
│       │   ├── session/           # plan seed + point-of-use tap
│       │   ├── followup/          # task list + attestation
│       │   ├── incentive/         # read-only ledger
│       │   ├── emergency/         # GSM bypass
│       │   ├── sync/              # SyncJournal, backoff, chunked
│       │   ├── models/            # drift tables mirroring backend
│       │   └── api/               # client to backend.md §4
│       ├── assets/locale/         # hi, mr (structure ready for more)
│       └── test/                  # airplane-mode flow, journal replay
└── packages/shared-contracts/     # TS types; Dart types generated/mirrored
```

### 5.3 Config / env / device
- `API_BASE` (backend URL)
- `GATEWAY_SMS_NUMBER` (block-office GSM gateway)
- `DEVICE_FLOOR = Android Go 8.0 / 1GB` (test matrix)
- `LOCALES = hi,mr`
- Device PIN policy; remote-wipe hook; SQLCipher passphrase from secure storage.

---

## 6 · Tech Stack

| Layer | Choice | Justification |
|---|---|---|
| Framework | **Flutter 3.x** | One codebase for low-spec Android; offline-first patterns mature. |
| Local store | **drift over SQLCipher** | Typed ORM mirroring server schema; AES-256 at rest for PHI. |
| Connectivity | `connectivity_plus` | Network-state-aware sync + GSM fallback trigger. |
| Scan | `BarcodeDetector` / `html5-qrcode` parity (mobile equivalent: `mobile_scanner`) | Referral QR + session codes. |
| GSM | `telephony_sms` (device SMS, no data) | Emergency bypass (V10). |
| Audio/icon UX | `flutter_tts` + icon assets | Low-literacy, multilingual field reality. |
| Constraint-flagged | Android-only for MVP; no iOS | Device floor + SIH demo realism; iOS is roadmap. |

---

## 7 · MVP Scope

**Ships in v1:**
- PIN authn + remote-wipe stub; household-anchored caseload with transfer visibility.
- Encounter-lite + IMNCI-lite triage → route decisions creating matching promises (V12).
- Referral creation (code + QR); destination suggestion (override allowed).
- Emergency GSM bypass (V10) proven with data off.
- Session log: plan bulk-seed (`plan_seeded`), point-of-use tap, T+1d auto-lapse.
- Follow-up tasks clustered into village day-plans; child-absent auto-gen (V8); attestation write-back.
- Incentive ledger read view (V11).
- SyncJournal: append-only, priority classes, jittered backoff, chunked, kill-safe.

**Deliberately cut:**
- iOS build.
- Rich media/long voice notes (kept short at device floor).
- Live eSanjeevani/ABDM/U-WIN/eVIN feeds (stubs via backend).
- Additional locales beyond Hindi+Marathi.

**Definition of done (G-P2):** airplane-mode full flow (triage → route → refer → session log → attest) completes; journal drains in priority order; kill-app mid-sync loses nothing; GSM alert fires in simulated data-off state.

---

## 8 · Post-MVP Roadmap

- **Near-term:** offline rule-bundle (IMNCI-lite) auto-update; richer consult media on capable devices.
- **Mid-term:** iOS field app; additional locales; live U-WIN due-list consumption for child-absent generation.
- **Long-term / stretch:** supervisor spot-audit UI on device; multi-district caseload; caregiver-assisted mode.

---

## 9 · Current State vs Target (predecessor)

`prototype-mvp.md` describes an **earlier offline SMS app** — the spiritual predecessor:
  - Stack: Flutter with `sqflite`/`idb` local queue, `ConnectivityPlus`, polling `GET /api/sms/queue` every 30s; **no auth**; SMS-only purpose (compose → local queue → backend → Twilio, a **paid** service used only in this prototype predecessor). The target replaces Twilio with the **free** `SyncJournal` + plain-GSM emergency bypass (V10) — no Twilio.
- Mapping forward:
  - Local SMS queue → generalized **SyncJournal** (drift/SQLCipher) carrying all promise ops, not just SMS.
  - Compose+send → specific promise-creation flows (referral/session/followup) over `/sync/push`.
  - Polling status → priority-classed delta sync with backoff (not fixed-interval poll).
  - No auth → device PIN + JWT + remote wipe.
  - SMS-only → SMS repurposed as **emergency GSM bypass** (V10), while routine traffic uses data sync.

The prototype app is the conceptual starting point; the target above is the build-ready spec.

---

*App is the field creating/evidence surface. It consumes the contract in `backend.md` §4; every endpoint in §4 is defined there; every MVP feature here has supporting schema (backend §5) and endpoints. Capture/oversight counterparts live in `website.md`.*

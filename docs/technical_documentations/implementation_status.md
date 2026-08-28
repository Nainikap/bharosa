# Bharosa — Implementation Status (v1 MVP · Field App)

> **Scope:** what is actually built in `apps/field-app` vs the v1 contract (`app.md` + `backend.md` §4). Offline-first prototype — runs without a backend.

## Build Status

| Check | Result |
|-------|--------|
| `flutter analyze` | 0 errors (18 info/warnings, deprecations only) |
| `flutter build web` | PASS (84s, `build/web`) |
| `flutter test` | All passed |
| `flutter build apk --debug` | PASS (`build/app/outputs/flutter-apk/app-debug.apk`, ~166 MB) |
| Runner | Fully offline; seeded data, mock sync; backend optional |

## Features Implemented

| # | Feature | Location | Notes |
|---|---------|----------|-------|
| 1 | **Local PIN unlock** | `lib/auth/pin_screen.dart:1`, `lib/auth/auth_service.dart:1` | `SharedPreferences` only — no `POST /auth/device/*`, no JWT |
| 2 | **Caseload browse** | `lib/caseload/caseload_screen.dart:1`, `lib/data/db.dart:1` | 8 households / 18 members seeded (`lib/data/seed.dart:1`); Household → members → `Visit` button |
| 3 | **IMNCI-lite triage** | `lib/triage/triage_engine.dart:1`, `lib/triage/triage_screen.dart:1` | 12 symptoms; routes `selfCare` / `phcVisit` / `redFlag`; hi-IN TTS on long-press (`flutter_tts`) |
| 4 | **Referral creation (offline)** | `lib/referral/referral_create_screen.dart:1` | Generates `REF-XXXXXX` + QR (`qr_flutter`), facility dropdown (4 options), priority chip (Routine 7d / Urgent 48h / Red-flag 24h); writes `Promise` row + enqueues `SyncJournal` |
| 5 | **Referral list + detail** | `lib/referral/referral_list_screen.dart:1`, `lib/referral/referral_detail_screen.dart:1` | Reads local drift `promises` via `StreamBuilder`; filterable by status |
| 6 | **Emergency GSM bypass** | `lib/emergency/emergency_screen.dart:1` | `another_telephony: ^0.4.1` (fork fixing `telephony` AGP namespace); plain SMS to `AppConfig.gatewaySmsNumber` (`lib/utils/constants.dart:23`, default `+919999999999`) when red-flag + no data |
| 7 | **Offline-first sync engine** | `lib/sync/sync_service.dart:1`, `lib/data/db.dart:1` (`SyncJournals`) | `connectivity_plus` check; priority drain `emergency > referral > analytics`; `slaStart` stamped on push ack (client-side — see Gaps) |
| 8 | **API client stubs** | `lib/api/api_service.dart:1`, `lib/utils/constants.dart:16` (`apiBase = http://10.0.2.2:3000/api`) | `http` against `API_BASE` env; 8s/5s timeouts |

## Referral Creation Steps (End-to-End)

```
PIN (/pin) → Home → Caseload (/caseload) → Household (/household) → Visit → Triage (/triage)
  → [selfCare: advice only] | [phcVisit: Referral form] | [redFlag: Emergency GSM]
  → Referral form (/referralCreate): pick facility + priority → Save (offline OK)
  → Referral detail (/referralDetail) + queued in SyncJournals → auto-drain on connectivity
  → Facility scans QR/code at registration (website/facility side — v2)
```

## API Endpoint Wiring vs `backend.md` §4 (`/api` base)

| Contract Endpoint | In App? | App Location | Notes |
|-------------------|---------|--------------|-------|
| `POST /auth/device/register` | ❌ | — | Local PIN only; no network auth |
| `POST /auth/device/login` | ❌ | — | Local PIN only; no JWT issued |
| `POST /auth/refresh` | ❌ | — | No token rotation |
| `POST /sync/push` | ✅ | `lib/api/api_service.dart:9`, `lib/sync/sync_service.dart:73` | Body `{ops:[{opId, entity, payload, priority}]}`; app-defined shape |
| `GET /sync/pull?since=seq` | ✅ (path) | `lib/api/api_service.dart:27` | Returned `deltas` are **never consumed** downstream |
| `GET /sync/health` | ⚠️ | `lib/api/api_service.dart:57` | App calls `/health` — missing `/sync/` prefix |
| `POST /promises` | ❌ | — | App routes referrals via `/sync/push` or `/referrals` |
| `GET /promises?type=&status=` | ❌ | — | Not used by app |
| `GET /promises/:id` | ❌ | — | Not used by app |
| `POST /promises/:id/annotate` | ❌ | — | Not used by app |
| `POST /referrals` | ✅ | `lib/api/api_service.dart:42`, fallback `lib/sync/sync_service.dart:97` | Wrapper over `/promises`; per-op fallback when bulk push fails |
| `GET /referrals?priority=&status=` | ❌ | — | App reads local `promises` DB (`lib/referral/referral_list_screen.dart:50`) |
| `POST /capture/arrival` | ❌ | — | Facility/web responsibility |
| `POST /capture/fuzzy-match` | ❌ | — | Facility/web responsibility |

**Auth header:** no `Authorization: Bearer <JWT>` or `X-Device-Id` is attached to any request — every non-auth call is unauthenticated per contract.

## Gaps vs Contract (What Needs Fixing to Plug In a Real Backend)

1. **Auth layer missing** — add `POST /auth/device/*` calls in `AuthService`, persist access+refresh JWT, attach headers in `ApiService` (interceptor/helper), gate `PinScreen` on server login.
2. **`sla_start` on wrong clock** — app stamps `slaStart` client-side on push success (`lib/sync/sync_service.dart:86,107`); contract requires **server** to stamp `sla_start` on `/sync/push` receipt (dual-clock audit V1).
3. **`/health` → `/sync/health`** path fix (`lib/api/api_service.dart:60`).
4. **Bulk push ack is all-or-nothing** — `drain()` marks all ops `synced` on a single 2xx (`lib/sync/sync_service.dart:74`), ignoring per-op conflict/validation the server should return.
5. **Pull deltas unused** — wire `pullSync()` results into local tables (patients/households/promises) so the app reflects server truth.
6. **Optional reads** — if app should show server state, call `GET /referrals` / `GET /promises` in addition to local DB.

## File Map (v1 MVP)

```
apps/field-app/
  lib/
    main.dart                          — MultiProvider + routes
    data/db.dart + db.g.dart           — drift: Households / Patients / Promises / SyncJournals
    data/seed.dart                     — 8 households / 18 members
    api/api_service.dart               — sync/push, sync/pull, referrals, health
    sync/sync_service.dart             — offline queue + priority drain
    auth/pin_screen.dart + auth_service.dart
    home/home_screen.dart
    caseload/caseload_screen.dart      — HouseholdDetailScreen inline
    triage/triage_engine.dart + triage_screen.dart
    referral/referral_create_screen.dart + referral_list_screen.dart + referral_detail_screen.dart
    emergency/emergency_screen.dart
    utils/constants.dart + helpers.dart
    widgets/app_scaffold.dart
  pubspec.yaml                         — drift, another_telephony, mobile_scanner, qr_flutter, flutter_tts, provider
  android/app/src/main/AndroidManifest.xml — INTERNET, SEND_SMS, CAMERA
```

export const sqliteSchema = `
-- ─── Enums replaced by TEXT fields with implicit or app-level validation ───
-- promise_type: 'referral', 'vaccine_supply', 'consult', 'followup'
-- promise_status: 'open', 'kept', 'lapsed', 'escalated', 'reconciled', 'closed_na'
-- independence_flag: 'direct', 'plan_seeded', 'degraded'
-- referral_priority: 'red_flag', 'urgent', 'routine'
-- consult_urgency: 'urgent', 'routine'
-- followup_cohort: 'anc_week', 'imnci_band', 'ncd_stage', 'child_absent'
-- outbox_status: 'pending', 'sent', 'failed'
-- stock_event_type: 'dispatch', 'receipt', 'usage', 'wastage'

-- ─── Household ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS household (
  household_id TEXT PRIMARY KEY,
  catchment_assignment TEXT NOT NULL,
  landmark_descriptor TEXT,
  members TEXT NOT NULL DEFAULT '[]',
  transfer_log TEXT NOT NULL DEFAULT '[]',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── Patient ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patient (
  local_id TEXT PRIMARY KEY,
  abha_ref TEXT,
  name TEXT NOT NULL,
  fuzzy_dob TEXT,
  village TEXT NOT NULL,
  gender TEXT,
  household_id TEXT NOT NULL REFERENCES household(household_id),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_patient_household_id ON patient(household_id);
CREATE INDEX IF NOT EXISTS idx_patient_village ON patient(village);

-- ─── Promise ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS promise (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  committed_by TEXT NOT NULL,
  committed_to TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '{}',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sla_start DATETIME,
  deadline DATETIME,
  evidence TEXT,
  independence TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  ladder TEXT NOT NULL DEFAULT '[]',
  version INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_promise_type ON promise(type);
CREATE INDEX IF NOT EXISTS idx_promise_status ON promise(status);
CREATE INDEX IF NOT EXISTS idx_promise_status_sla_start ON promise(status, sla_start);
CREATE INDEX IF NOT EXISTS idx_promise_created_at ON promise(created_at);

-- ─── Referral Detail ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referral_detail (
  promise_id TEXT PRIMARY KEY REFERENCES promise(id) ON DELETE CASCADE,
  patient_id TEXT NOT NULL REFERENCES patient(local_id),
  priority TEXT NOT NULL,
  destination_facility_id TEXT NOT NULL,
  human_code TEXT,
  qr_code TEXT,
  referral_reason TEXT NOT NULL,
  triage_route TEXT
);

-- ─── Session Detail ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS session_detail (
  promise_id TEXT PRIMARY KEY REFERENCES promise(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  session_type TEXT NOT NULL,
  vaccines TEXT NOT NULL DEFAULT '[]',
  village_name TEXT NOT NULL,
  facility_id TEXT NOT NULL
);

-- ─── Consult Detail ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS consult_detail (
  promise_id TEXT PRIMARY KEY REFERENCES promise(id) ON DELETE CASCADE,
  patient_id TEXT NOT NULL REFERENCES patient(local_id),
  urgency TEXT NOT NULL,
  photos TEXT DEFAULT '[]',
  vitals TEXT,
  summary TEXT NOT NULL,
  triage_route TEXT NOT NULL,
  response TEXT
);

-- ─── Followup Detail ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS followup_detail (
  promise_id TEXT PRIMARY KEY REFERENCES promise(id) ON DELETE CASCADE,
  patient_id TEXT NOT NULL REFERENCES patient(local_id),
  cohort TEXT NOT NULL,
  round_date DATE NOT NULL,
  generated_from TEXT,
  outcome TEXT
);

-- ─── Encounter (append-only) ────────────────────────────────
CREATE TABLE IF NOT EXISTS encounter (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patient(local_id),
  type TEXT NOT NULL,
  facility_id TEXT,
  worker_id TEXT NOT NULL,
  ts DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  data TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_encounter_patient_id ON encounter(patient_id);

-- ─── Promise Event (audit log, append-only) ─────────────────
CREATE TABLE IF NOT EXISTS promise_event (
  id TEXT PRIMARY KEY,
  promise_id TEXT NOT NULL REFERENCES promise(id),
  event_name TEXT NOT NULL,
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  actor TEXT NOT NULL,
  ts DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  payload TEXT
);
CREATE INDEX IF NOT EXISTS idx_promise_event_promise_id ON promise_event(promise_id);
CREATE INDEX IF NOT EXISTS idx_promise_event_event_name ON promise_event(event_name);

-- ─── Outbox (notification queue) ────────────────────────────
CREATE TABLE IF NOT EXISTS outbox (
  id TEXT PRIMARY KEY,
  recipient_role TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'sms',
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  hmac_token TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_at DATETIME
);
CREATE INDEX IF NOT EXISTS idx_outbox_status_created_at ON outbox(status, created_at);

-- ─── Stock Event ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stock_event (
  id TEXT PRIMARY KEY,
  facility_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  quantity_delta INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  ts DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reported_by TEXT NOT NULL
);

-- ─── Device Registry (auth) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS device (
  device_id TEXT PRIMARY KEY,
  pin_hash TEXT NOT NULL,
  role TEXT NOT NULL,
  worker_id TEXT NOT NULL,
  facility_id TEXT,
  token_version INTEGER NOT NULL DEFAULT 0,
  locked INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── Sync Sequence Tracking ─────────────────────────────────
CREATE TABLE IF NOT EXISTS sync_cursor (
  device_id TEXT PRIMARY KEY REFERENCES device(device_id),
  last_seq INTEGER NOT NULL DEFAULT 0,
  last_sync_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── Sync Journal (server-side log of changes) ──────────────
CREATE TABLE IF NOT EXISTS sync_journal (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT NOT NULL,
  op TEXT NOT NULL,
  row_id TEXT NOT NULL,
  data TEXT NOT NULL,
  device_id TEXT,
  priority TEXT NOT NULL DEFAULT 'analytics',
  ts DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sync_journal_priority_seq ON sync_journal(priority, seq);

-- ─── Config: Evidence Timeout (V7) ──────────────────────────
CREATE TABLE IF NOT EXISTS evidence_timeout (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  subtype TEXT NOT NULL,
  timeout_ms INTEGER NOT NULL,
  district_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_evidence_timeout_type_subtype ON evidence_timeout(type, subtype);

-- ─── Config: Incentive Rate (V11) ───────────────────────────
CREATE TABLE IF NOT EXISTS incentive_rate (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_type TEXT NOT NULL,
  rate_inr REAL NOT NULL,
  effective_from DATE NOT NULL
);

-- ─── Config: RI Schedule ────────────────────────────────────
CREATE TABLE IF NOT EXISTS ri_schedule (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  facility_id TEXT NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  schedule TEXT NOT NULL
);

-- ─── Config: Rule Bundle (IMNCI-lite, versioned) ────────────
CREATE TABLE IF NOT EXISTS rule_bundle (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  version INTEGER NOT NULL,
  rules TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(name, version)
);

-- ─── Seed default evidence timeouts ─────────────────────────
INSERT INTO evidence_timeout (type, subtype, timeout_ms)
SELECT 'referral', 'red_flag', 86400000 WHERE NOT EXISTS (SELECT 1 FROM evidence_timeout LIMIT 1);
INSERT INTO evidence_timeout (type, subtype, timeout_ms)
SELECT 'referral', 'urgent', 172800000 WHERE NOT EXISTS (SELECT 1 FROM evidence_timeout LIMIT 1 OFFSET 1);
INSERT INTO evidence_timeout (type, subtype, timeout_ms)
SELECT 'referral', 'routine', 604800000 WHERE NOT EXISTS (SELECT 1 FROM evidence_timeout LIMIT 1 OFFSET 2);
INSERT INTO evidence_timeout (type, subtype, timeout_ms)
SELECT 'vaccine_supply', 'default', 86400000 WHERE NOT EXISTS (SELECT 1 FROM evidence_timeout LIMIT 1 OFFSET 3);
INSERT INTO evidence_timeout (type, subtype, timeout_ms)
SELECT 'consult', 'urgent', 14400000 WHERE NOT EXISTS (SELECT 1 FROM evidence_timeout LIMIT 1 OFFSET 4);
INSERT INTO evidence_timeout (type, subtype, timeout_ms)
SELECT 'consult', 'routine', 86400000 WHERE NOT EXISTS (SELECT 1 FROM evidence_timeout LIMIT 1 OFFSET 5);
INSERT INTO evidence_timeout (type, subtype, timeout_ms)
SELECT 'followup', 'default', 0 WHERE NOT EXISTS (SELECT 1 FROM evidence_timeout LIMIT 1 OFFSET 6);
`;

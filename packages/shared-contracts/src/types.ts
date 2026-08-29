// ─── Promise Types ──────────────────────────────────────────────
export type PromiseType =
  | 'referral'
  | 'vaccine_supply'
  | 'consult'
  | 'followup';

// Roadmap types (schema-ready, not built)
export type RoadmapPromiseType =
  | 'diagnostic'
  | 'medicine_fulfillment'
  | 'appointment_slot'
  | 'data_capture';

// ─── Promise Status ─────────────────────────────────────────────
export type PromiseStatus =
  | 'open'
  | 'kept'
  | 'lapsed'
  | 'escalated'
  | 'reconciled'
  | 'closed_na';

// ─── Evidence ───────────────────────────────────────────────────
export type EvidenceSource =
  | 'registration_match'
  | 'manual_code'
  | 'batch_entry'
  | 'attestation'
  | 'session_log'
  | 'external_feed';

export type EvidenceConfidence = 'verified' | 'reported';

export interface EvidenceRef {
  kind: string;
  source: EvidenceSource;
  confidence: EvidenceConfidence;
  capturedAt: Date;
  metadata?: Record<string, unknown>;
}

// ─── Independence Flag (V6) ────────────────────────────────────
export type IndependenceFlag = 'direct' | 'plan_seeded' | 'degraded';

// ─── Ladder Rung ────────────────────────────────────────────────
export interface LadderRung {
  role: string;
  workerId?: string;
  ackAt?: Date;
  ackVia?: 'deeplink' | 'dashboard';
}

// ─── Committed Party ────────────────────────────────────────────
export interface CommittedParty {
  role: string;
  facilityId?: string;
  workerId?: string;
}

// ─── Promise Record (v5 shape + audit fixes) ────────────────────
export interface PromiseRec {
  id: string;
  type: PromiseType;
  committedBy: CommittedParty;
  committedTo: CommittedParty;
  description: Record<string, unknown>;
  createdAt: Date;
  slaStart?: Date | null;
  deadline?: Date | null;
  evidence?: EvidenceRef | null;
  independence?: IndependenceFlag | null;
  status: PromiseStatus;
  ladder: LadderRung[];
  version: number;
}

// ─── Referral Detail ────────────────────────────────────────────
export type ReferralPriority = 'red_flag' | 'urgent' | 'routine';

export interface ReferralDetail {
  promiseId: string;
  patientId: string;
  priority: ReferralPriority;
  destinationFacilityId: string;
  humanCode?: string;
  qrCode?: string;
  referralReason: string;
  triageRoute?: string;
}

// ─── Session Detail (vaccine-supply) ────────────────────────────
export interface SessionDetail {
  promiseId: string;
  sessionDate: Date;
  sessionType: 'ri' | 'vhnd';
  vaccines: string[];    // e.g. ['BCG', 'Pentavalent']
  villageName: string;
  facilityId: string;
}

// ─── Consult Detail ─────────────────────────────────────────────
export type ConsultUrgency = 'urgent' | 'routine';

export interface ConsultDetail {
  promiseId: string;
  patientId: string;
  urgency: ConsultUrgency;
  photos?: string[];        // references to uploaded media
  vitals?: Record<string, unknown>;
  summary: string;
  triageRoute: string;
  response?: {
    structuredNotes: string;
    voiceNoteRef?: string;
    respondedAt: Date;
    doctorId: string;
  };
}

// ─── Follow-up Detail ───────────────────────────────────────────
export type FollowupCohort = 'anc_week' | 'imnci_band' | 'ncd_stage' | 'child_absent';

export interface FollowupDetail {
  promiseId: string;
  patientId: string;
  cohort: FollowupCohort;
  roundDate: Date;
  generatedFrom?: string;  // source promise/session ID for child-absent (V8)
  outcome?: {
    attestedAt: Date;
    notes: string;
    status: 'completed' | 'not_found' | 'refused' | 'migrated';
  };
}

// ─── Patient ────────────────────────────────────────────────────
export interface Patient {
  localId: string;
  abhaRef?: string | null;
  name: string;
  fuzzyDob?: string;
  village: string;
  gender?: 'male' | 'female' | 'other';
  householdId: string;
}

// ─── Household ──────────────────────────────────────────────────
export interface TransferLogEntry {
  fromWorkerId: string;
  toWorkerId: string;
  effectiveDate: Date;
  approvedBy: string;
  receivingWorkerAck?: Date;
}

export interface Household {
  householdId: string;
  catchmentAssignment: string;
  landmarkDescriptor?: string;
  members: string[];          // patient localIds
  transferLog: TransferLogEntry[];
}

// ─── Encounter (append-only) ────────────────────────────────────
export interface Encounter {
  id: string;
  patientId: string;
  type: string;
  facilityId?: string;
  workerId: string;
  ts: Date;
  data: Record<string, unknown>;
}

// ─── Promise Event (audit log) ──────────────────────────────────
export interface PromiseEvent {
  id: string;
  promiseId: string;
  eventName: string;
  fromStatus: PromiseStatus;
  toStatus: PromiseStatus;
  actor: CommittedParty;
  ts: Date;
  payload?: Record<string, unknown>;
}

// ─── Outbox (notification queue) ────────────────────────────────
export type OutboxStatus = 'pending' | 'sent' | 'failed';

export interface OutboxMessage {
  id: string;
  recipientRole: string;
  recipientId: string;
  channel: 'sms' | 'deeplink' | 'dashboard';
  subject: string;
  body: string;
  hmacToken?: string;
  status: OutboxStatus;
  createdAt: Date;
  sentAt?: Date;
}

// ─── Stock Event ────────────────────────────────────────────────
export interface StockEvent {
  id: string;
  facilityId: string;
  itemName: string;
  quantityDelta: number;
  eventType: 'dispatch' | 'receipt' | 'usage' | 'wastage';
  ts: Date;
  reportedBy: string;
}

// ─── Auth / JWT ─────────────────────────────────────────────────
export interface DeviceRegistrationPayload {
  deviceId: string;
  pin: string;
  role: string;
  workerId: string;
  facilityId?: string;
}

export interface JwtAccessPayload {
  deviceId: string;
  role: string;
  workerId: string;
  facilityId?: string;
}

export interface JwtRefreshPayload {
  deviceId: string;
  tokenVersion: number;
}

// ─── Sync ───────────────────────────────────────────────────────
export type SyncPriority = 'emergency' | 'referral' | 'consult' | 'followup' | 'analytics';

export interface SyncOp {
  seq: number;
  priority: SyncPriority;
  table: string;
  op: 'insert' | 'update' | 'delete';
  rowId: string;
  data: Record<string, unknown>;
  deviceTs: Date;
}

export interface SyncPushRequest {
  deviceId: string;
  lastSeq: number;
  ops: SyncOp[];
}

export interface SyncPullResponse {
  deltas: SyncOp[];
  newSeq: number;
}

// ─── KPI / Metrics ──────────────────────────────────────────────
export interface KpiResult {
  name: string;
  value: number;
  unit: 'percent' | 'hours' | 'count' | 'ratio';
  baselineMode: boolean;
  computedAt: Date;
}

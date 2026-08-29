import { PromiseType, ReferralPriority, ConsultUrgency } from './types';

// ─── Evidence Timeout Table (V7) ────────────────────────────────
// All values in milliseconds. District-configurable at runtime.
// These are the defaults.

export interface TimeoutEntry {
  subtype: string;
  timeoutMs: number;
}

export const EVIDENCE_TIMEOUTS: Record<PromiseType, TimeoutEntry[]> = {
  referral: [
    { subtype: 'red_flag',  timeoutMs: 24 * 60 * 60 * 1000 },   // 24h
    { subtype: 'urgent',    timeoutMs: 48 * 60 * 60 * 1000 },   // 48h
    { subtype: 'routine',   timeoutMs: 7 * 24 * 60 * 60 * 1000 }, // 7d
  ],
  vaccine_supply: [
    { subtype: 'default',   timeoutMs: 24 * 60 * 60 * 1000 },   // T+1d after session date
  ],
  consult: [
    { subtype: 'urgent',    timeoutMs: 4 * 60 * 60 * 1000 },    // 4h
    { subtype: 'routine',   timeoutMs: 24 * 60 * 60 * 1000 },   // 24h
  ],
  followup: [
    { subtype: 'default',   timeoutMs: 0 },  // next_round_date driven (computed dynamically)
  ],
};

/**
 * Get the timeout in ms for a given promise type + subtype.
 */
export function getTimeoutMs(
  type: PromiseType,
  subtype: string
): number {
  const entries = EVIDENCE_TIMEOUTS[type];
  const match = entries.find(e => e.subtype === subtype);
  if (match) return match.timeoutMs;
  // Fallback to 'default' if present
  const def = entries.find(e => e.subtype === 'default');
  if (def) return def.timeoutMs;
  throw new Error(`No timeout config for ${type}/${subtype}`);
}

// ─── Escalation Ladder Templates ────────────────────────────────

export interface LadderTemplate {
  roles: string[];
}

export const ESCALATION_LADDERS: Record<PromiseType, LadderTemplate> = {
  referral: {
    roles: ['asha', 'block_mo', 'district_nodal'],
  },
  vaccine_supply: {
    roles: ['block_cold_chain', 'immunization_officer'],
  },
  consult: {
    roles: ['requesting_facility'],
  },
  followup: {
    roles: ['supervisor'],    // repeat misses only
  },
};

// ─── Sync Priority Classes ──────────────────────────────────────
// Numeric weight — lower = higher priority
export const SYNC_PRIORITY_WEIGHT: Record<string, number> = {
  emergency: 0,
  referral:  1,
  consult:   2,
  followup:  3,
  analytics: 4,
};

// ─── Promise Status Terminals ───────────────────────────────────
export const TERMINAL_STATUSES = new Set([
  'kept',
  'lapsed',
  'reconciled',
  'closed_na',
]);

// ─── Auth Constants ─────────────────────────────────────────────
export const JWT_ACCESS_TTL_SEC = 900;       // 15 minutes
export const JWT_REFRESH_TTL_SEC = 604800;   // 7 days
export const HMAC_DEEPLINK_TTL_SEC = 900;    // 15 minutes

// ─── Scheduler ──────────────────────────────────────────────────
export const SCHEDULER_TICK_MS = 60_000;     // 60 seconds

// ─── Referral Priority Mapping ──────────────────────────────────
export function referralSubtype(priority: ReferralPriority): string {
  return priority; // red_flag | urgent | routine
}

// ─── Consult Subtype Mapping ────────────────────────────────────
export function consultSubtype(urgency: ConsultUrgency): string {
  return urgency; // urgent | routine
}

// ─── Event Name Registry ────────────────────────────────────────
export const EVENT_NAMES = {
  PROMISE_CREATED:    'promise.created',
  PROMISE_EVIDENCED:  'promise.evidenced',
  PROMISE_LAPSED:     'promise.lapsed',
  PROMISE_ESCALATED:  'promise.escalated',
  PROMISE_KEPT:       'promise.kept',
  PROMISE_KEPT_LATE:  'promise.kept_late',
  PROMISE_RECONCILED: 'promise.reconciled',
  PROMISE_CLOSED_NA:  'promise.closed_na',
  PROMISE_ANNOTATED:  'promise.annotated',
  LADDER_RUNG_ACKED:  'ladder.rung_acked',
  SYNC_PUSH:          'sync.push',
  SYNC_PULL:          'sync.pull',
  DEVICE_REGISTERED:  'device.registered',
  DEVICE_LOGIN:       'device.login',
  SMS_QUEUED:         'sms.queued',
  SMS_SENT:           'sms.sent',
  SMS_FAILED:         'sms.failed',
  GSM_INBOUND:        'gsm.inbound',
} as const;

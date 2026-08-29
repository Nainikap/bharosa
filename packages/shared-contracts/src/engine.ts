import {
  PromiseRec,
  PromiseStatus,
  PromiseType,
  EvidenceRef,
  LadderRung,
  PromiseEvent,
  CommittedParty,
} from './types';
import { TERMINAL_STATUSES, ESCALATION_LADDERS, EVENT_NAMES } from './constants';

// ─── Transition Result ──────────────────────────────────────────
export interface TransitionResult {
  ok: true;
  newStatus: PromiseStatus;
  event: Omit<PromiseEvent, 'id' | 'ts'>;
  updatedFields: Partial<PromiseRec>;
}

export interface TransitionError {
  ok: false;
  code: string;
  message: string;
}

export type TransitionOutcome = TransitionResult | TransitionError;

// ─── Pure Transition Functions ──────────────────────────────────
// These are pure — no I/O. The server serializes intents and
// calls these to compute the next state.

/**
 * Validate whether a status transition is legal.
 */
function isLegalTransition(from: PromiseStatus, to: PromiseStatus): boolean {
  const allowed: Record<PromiseStatus, PromiseStatus[]> = {
    open:       ['kept', 'lapsed'],
    lapsed:     ['escalated'],
    escalated:  ['reconciled', 'kept'],    // kept(late)
    kept:       [],
    reconciled: [],
    closed_na:  [],
  };
  return (allowed[from] || []).includes(to);
}

/**
 * Apply evidence to an open promise → kept.
 */
export function applyEvidence(
  promise: PromiseRec,
  evidence: EvidenceRef,
  actor: CommittedParty
): TransitionOutcome {
  if (promise.status === 'escalated') {
    // Late evidence on an escalated promise → kept(late)
    return {
      ok: true,
      newStatus: 'kept',
      event: {
        promiseId: promise.id,
        eventName: EVENT_NAMES.PROMISE_KEPT_LATE,
        fromStatus: promise.status,
        toStatus: 'kept',
        actor,
        payload: { evidence, late: true },
      },
      updatedFields: {
        status: 'kept',
        evidence,
        version: promise.version + 1,
      },
    };
  }

  if (promise.status !== 'open') {
    // Terminal promises accept annotations only
    if (TERMINAL_STATUSES.has(promise.status)) {
      return {
        ok: false,
        code: 'TERMINAL_NO_REOPEN',
        message: `Promise ${promise.id} is ${promise.status}. Use annotate for closed promises (V3).`,
      };
    }
    return {
      ok: false,
      code: 'INVALID_STATUS',
      message: `Cannot apply evidence to promise in status ${promise.status}`,
    };
  }

  return {
    ok: true,
    newStatus: 'kept',
    event: {
      promiseId: promise.id,
      eventName: EVENT_NAMES.PROMISE_KEPT,
      fromStatus: 'open',
      toStatus: 'kept',
      actor,
      payload: { evidence },
    },
    updatedFields: {
      status: 'kept',
      evidence,
      version: promise.version + 1,
    },
  };
}

/**
 * Lapse an open promise that has exceeded its evidence timeout.
 * Called by the scheduler.
 */
export function lapse(
  promise: PromiseRec,
  actor: CommittedParty
): TransitionOutcome {
  if (promise.status !== 'open') {
    return {
      ok: false,
      code: 'NOT_OPEN',
      message: `Cannot lapse promise in status ${promise.status}`,
    };
  }

  return {
    ok: true,
    newStatus: 'lapsed',
    event: {
      promiseId: promise.id,
      eventName: EVENT_NAMES.PROMISE_LAPSED,
      fromStatus: 'open',
      toStatus: 'lapsed',
      actor,
      payload: { reason: 'evidence_timeout' },
    },
    updatedFields: {
      status: 'lapsed',
      version: promise.version + 1,
    },
  };
}

/**
 * Escalate a lapsed promise — instantiate the escalation ladder.
 */
export function escalate(
  promise: PromiseRec,
  actor: CommittedParty
): TransitionOutcome {
  if (promise.status !== 'lapsed') {
    return {
      ok: false,
      code: 'NOT_LAPSED',
      message: `Cannot escalate promise in status ${promise.status}`,
    };
  }

  const ladderTemplate = ESCALATION_LADDERS[promise.type];
  const ladder: LadderRung[] = ladderTemplate.roles.map(role => ({
    role,
  }));

  return {
    ok: true,
    newStatus: 'escalated',
    event: {
      promiseId: promise.id,
      eventName: EVENT_NAMES.PROMISE_ESCALATED,
      fromStatus: 'lapsed',
      toStatus: 'escalated',
      actor,
      payload: { ladder },
    },
    updatedFields: {
      status: 'escalated',
      ladder,
      version: promise.version + 1,
    },
  };
}

/**
 * Reconcile an escalated promise — ASHA attests on next visit.
 * Terminal annotation, lower-confidence flag visible (V3).
 */
export function reconcile(
  promise: PromiseRec,
  attestation: EvidenceRef,
  actor: CommittedParty
): TransitionOutcome {
  if (promise.status !== 'escalated') {
    return {
      ok: false,
      code: 'NOT_ESCALATED',
      message: `Cannot reconcile promise in status ${promise.status}`,
    };
  }

  // Attestation-based evidence is always lower confidence
  const reconciledEvidence: EvidenceRef = {
    ...attestation,
    confidence: 'reported',
  };

  return {
    ok: true,
    newStatus: 'reconciled',
    event: {
      promiseId: promise.id,
      eventName: EVENT_NAMES.PROMISE_RECONCILED,
      fromStatus: 'escalated',
      toStatus: 'reconciled',
      actor,
      payload: { evidence: reconciledEvidence },
    },
    updatedFields: {
      status: 'reconciled',
      evidence: reconciledEvidence,
      version: promise.version + 1,
    },
  };
}

/**
 * Close a promise as N/A (e.g. patient migrated, duplicate).
 */
export function closeNa(
  promise: PromiseRec,
  reason: string,
  actor: CommittedParty
): TransitionOutcome {
  if (promise.status !== 'open') {
    return {
      ok: false,
      code: 'NOT_OPEN',
      message: `Can only close_na an open promise`,
    };
  }

  return {
    ok: true,
    newStatus: 'closed_na',
    event: {
      promiseId: promise.id,
      eventName: EVENT_NAMES.PROMISE_CLOSED_NA,
      fromStatus: 'open',
      toStatus: 'closed_na',
      actor,
      payload: { reason },
    },
    updatedFields: {
      status: 'closed_na',
      version: promise.version + 1,
    },
  };
}

/**
 * Annotate a closed promise (V3).
 * Closed promises accept annotations ONLY — never reopen.
 */
export function annotate(
  promise: PromiseRec,
  annotation: Record<string, unknown>,
  actor: CommittedParty
): TransitionOutcome {
  if (!TERMINAL_STATUSES.has(promise.status)) {
    return {
      ok: false,
      code: 'NOT_TERMINAL',
      message: `Annotations are only for closed promises (V3). Current status: ${promise.status}`,
    };
  }

  return {
    ok: true,
    newStatus: promise.status, // status does NOT change
    event: {
      promiseId: promise.id,
      eventName: EVENT_NAMES.PROMISE_ANNOTATED,
      fromStatus: promise.status,
      toStatus: promise.status,
      actor,
      payload: { annotation },
    },
    updatedFields: {
      version: promise.version + 1,
    },
  };
}

/**
 * Record an ack on a ladder rung.
 */
export function ackLadderRung(
  promise: PromiseRec,
  role: string,
  via: 'deeplink' | 'dashboard',
  actor: CommittedParty
): TransitionOutcome {
  if (promise.status !== 'escalated') {
    return {
      ok: false,
      code: 'NOT_ESCALATED',
      message: `Ladder ack only applies to escalated promises`,
    };
  }

  const ladder = [...promise.ladder];
  const rungIdx = ladder.findIndex(r => r.role === role && !r.ackAt);
  if (rungIdx === -1) {
    return {
      ok: false,
      code: 'RUNG_NOT_FOUND',
      message: `No unacknowledged rung for role ${role}`,
    };
  }

  ladder[rungIdx] = {
    ...ladder[rungIdx],
    ackAt: new Date(),
    ackVia: via,
  };

  return {
    ok: true,
    newStatus: 'escalated', // status stays
    event: {
      promiseId: promise.id,
      eventName: EVENT_NAMES.LADDER_RUNG_ACKED,
      fromStatus: 'escalated',
      toStatus: 'escalated',
      actor,
      payload: { role, via },
    },
    updatedFields: {
      ladder,
      version: promise.version + 1,
    },
  };
}

// ─── Utility: check if transition is legal ──────────────────────
export { isLegalTransition };

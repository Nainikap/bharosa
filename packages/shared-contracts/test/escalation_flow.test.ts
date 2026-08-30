import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getTimeoutMs,
  EVIDENCE_TIMEOUTS,
  SCHEDULER_TICK_MS,
  lapse,
  escalate,
  PromiseRec,
} from '../src/index';

test('Referral deadline timeouts are set to 1 minute (60,000 ms)', () => {
  assert.equal(getTimeoutMs('referral', 'red_flag'), 60_000, 'Red-flag referral timeout should be 1 minute');
  assert.equal(getTimeoutMs('referral', 'urgent'), 60_000, 'Urgent referral timeout should be 1 minute');
  assert.equal(getTimeoutMs('referral', 'routine'), 60_000, 'Routine referral timeout should be 1 minute');
  assert.equal(getTimeoutMs('referral', 'default'), 60_000, 'Default referral timeout should be 1 minute');
  assert.equal(SCHEDULER_TICK_MS, 10_000, 'Scheduler tick should run every 10 seconds for timely detection');
});

test('Promise lapse and escalate state machine flow for overdue referrals', () => {
  const now = new Date();
  const deadline = new Date(now.getTime() + 60_000);

  const referralPromise: PromiseRec = {
    id: 'test-referral-123',
    type: 'referral',
    committedBy: { role: 'asha', workerId: 'asha_rekha' },
    committedTo: { role: 'facility', facilityId: 'CHC Shivapur' },
    description: { priority: 'red_flag', referralReason: 'Severe fever' },
    createdAt: now.toISOString(),
    slaStart: now.toISOString(),
    deadline: deadline.toISOString(),
    status: 'open',
    ladder: [
      { role: 'asha', workerId: 'asha_rekha' },
      { role: 'block_mo', workerId: 'mo_pawar' },
      { role: 'district_nodal', workerId: 'nodal_sharma' },
    ],
    version: 1,
  };

  const systemActor = { role: 'system', workerId: 'scheduler' };

  // Step 1: When deadline passes, lapse the promise
  const lapseResult = lapse(referralPromise, systemActor);
  assert.equal(lapseResult.ok, true, 'Lapse should succeed');
  if (lapseResult.ok) {
    assert.equal(lapseResult.newStatus, 'lapsed');
    assert.equal(lapseResult.event.eventName, 'promise.lapsed');
    assert.equal(lapseResult.event.fromStatus, 'open');
    assert.equal(lapseResult.event.toStatus, 'lapsed');
  }

  // Step 2: Escalate the lapsed promise
  const lapsedPromise: PromiseRec = {
    ...referralPromise,
    ...(lapseResult.ok ? lapseResult.updatedFields : {}),
  };

  const escResult = escalate(lapsedPromise, systemActor);
  assert.equal(escResult.ok, true, 'Escalate should succeed');
  if (escResult.ok) {
    assert.equal(escResult.newStatus, 'escalated');
    assert.equal(escResult.event.eventName, 'promise.escalated');
    assert.equal(escResult.event.fromStatus, 'lapsed');
    assert.equal(escResult.event.toStatus, 'escalated');
    assert.equal(escResult.updatedFields.status, 'escalated');
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getTimeoutMs,
  referralSubtype,
  lapse,
  escalate,
  PromiseRec,
} from '@bharosa/shared-contracts';

test('Referral creation computes 1-minute (60s) deadline and SLA window', () => {
  const priorities = ['red_flag', 'urgent', 'routine'] as const;

  for (const priority of priorities) {
    const subtype = referralSubtype(priority);
    const timeoutMs = getTimeoutMs('referral', subtype);
    assert.equal(timeoutMs, 60_000, `Timeout for referral priority ${priority} must be 60,000 ms (1 minute)`);

    const now = new Date('2026-08-31T01:00:00.000Z');
    const deadline = new Date(now.getTime() + timeoutMs);

    assert.equal(
      deadline.toISOString(),
      '2026-08-31T01:01:00.000Z',
      'Deadline must be precisely 1 minute after creation'
    );
  }
});

test('End-to-end referral escalation lifecycle when 1-minute deadline passes', () => {
  const creationTime = new Date('2026-08-31T01:00:00.000Z');
  const timeoutMs = getTimeoutMs('referral', 'urgent'); // 60,000ms
  const deadlineTime = new Date(creationTime.getTime() + timeoutMs); // 01:01:00.000Z

  const referralPromise: PromiseRec = {
    id: 'ref-e2e-001',
    type: 'referral',
    committedBy: { role: 'asha', workerId: 'asha_rekha', facilityId: 'HWC-01' },
    committedTo: { role: 'facility', facilityId: 'CHC Shivapur' },
    description: {
      patientId: 'pat-999',
      priority: 'urgent',
      referralReason: 'Hypertension stage 2',
      humanCode: 'REF-789',
    },
    createdAt: creationTime.toISOString(),
    slaStart: creationTime.toISOString(),
    deadline: deadlineTime.toISOString(),
    status: 'open',
    ladder: [
      { role: 'asha', workerId: 'asha_rekha' },
      { role: 'block_mo', workerId: 'mo_pawar' },
      { role: 'district_nodal', workerId: 'nodal_sharma' },
    ],
    version: 1,
  };

  const systemActor = { role: 'system', workerId: 'scheduler' };

  // Phase 1: At T + 30 seconds (before deadline), promise is still active
  const checkTimeBefore = new Date('2026-08-31T01:00:30.000Z');
  const isOverdueBefore = checkTimeBefore.getTime() > new Date(referralPromise.deadline!).getTime();
  assert.equal(isOverdueBefore, false, 'Promise should NOT be overdue before 1 minute');
  assert.equal(referralPromise.status, 'open', 'Promise should remain open before deadline');

  // Phase 2: At T + 61 seconds (after 1-minute deadline passes), lapse check triggers
  const checkTimeAfter = new Date('2026-08-31T01:01:01.000Z');
  const isOverdueAfter = checkTimeAfter.getTime() > new Date(referralPromise.deadline!).getTime();
  assert.equal(isOverdueAfter, true, 'Promise must be identified as overdue after 1 minute');

  // Step A: Lapse transition
  const lapseOutcome = lapse(referralPromise, systemActor);
  assert.equal(lapseOutcome.ok, true, 'Lapse transition must succeed');
  if (!lapseOutcome.ok) return;

  assert.equal(lapseOutcome.newStatus, 'lapsed');
  assert.equal(lapseOutcome.event.eventName, 'promise.lapsed');

  const lapsedPromise: PromiseRec = {
    ...referralPromise,
    ...lapseOutcome.updatedFields,
  };

  // Step B: Automatic escalation transition
  const escOutcome = escalate(lapsedPromise, systemActor);
  assert.equal(escOutcome.ok, true, 'Escalation transition must succeed');
  if (!escOutcome.ok) return;

  assert.equal(escOutcome.newStatus, 'escalated');
  assert.equal(escOutcome.event.eventName, 'promise.escalated');
  assert.equal(escOutcome.updatedFields.status, 'escalated');

  // Step C: Verify escalation notification target (first rung on ladder)
  const ladder = escOutcome.updatedFields.ladder || [];
  assert.equal(ladder.length, 3);
  assert.equal(ladder[0].role, 'asha');
  assert.equal(ladder[1].role, 'block_mo');
});

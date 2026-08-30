import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import { lapse, escalate } from '@bharosa/shared-contracts';
import { SCHEDULER_TICK_MS } from '@bharosa/shared-contracts';

const SYSTEM_ACTOR = { role: 'system', workerId: 'scheduler' };

async function schedulerPluginFn(fastify: FastifyInstance) {
  fastify.log.info('In-memory scheduler started');

  // ─── Evidence-timeout lapse detection ────────────────────────
  const lapseInterval = setInterval(async () => {
    try {
      await runLapseCheck(fastify);
    } catch (err) {
      fastify.log.error({ err }, 'Error in runLapseCheck');
    }
  }, SCHEDULER_TICK_MS || 60000);

  // ─── Outbox flush (sends pending notifications every minute) ─
  const outboxInterval = setInterval(async () => {
    try {
      await runOutboxFlush(fastify);
    } catch (err) {
      fastify.log.error({ err }, 'Error in runOutboxFlush');
    }
  }, 60000);

  fastify.addHook('onClose', async () => {
    clearInterval(lapseInterval);
    clearInterval(outboxInterval);
  });
}

/**
 * Scan for open promises past their deadline → lapse → escalate.
 * Idempotent: reads current status, never double-transitions.
 */
async function runLapseCheck(fastify: FastifyInstance) {
  const { rows: overdue } = await fastify.db.query(`
    SELECT p.id, p.type, p.status, p.sla_start, p.deadline, p.version,
           p.committed_by, p.committed_to, p.description, p.evidence,
           p.independence, p.ladder, p.created_at
    FROM promise p
    WHERE p.status = 'open'
      AND p.deadline IS NOT NULL
      AND p.deadline < datetime('now')
  `);

  for (const row of overdue) {
    const promise = rowToPromise(row);

    // Step 1: Lapse
    const lapseResult = lapse(promise, SYSTEM_ACTOR);
    if (!lapseResult.ok) continue;

    // Step 2: Escalate immediately after lapse
    const lapsedPromise = { ...promise, ...lapseResult.updatedFields };
    const escResult = escalate(lapsedPromise, SYSTEM_ACTOR);
    if (!escResult.ok) continue;

    // Apply both transitions atomically
    const client = await fastify.db.connect();
    try {
      await client.query('BEGIN');

      // Update promise
      await client.query(`
        UPDATE promise
        SET status = $1, ladder = $2, version = version + 2
        WHERE id = $3 AND version = $4
      `, [
        escResult.newStatus,
        JSON.stringify(escResult.updatedFields.ladder),
        promise.id,
        promise.version,
      ]);

      // Insert lapse event
      await client.query(`
        INSERT INTO promise_event (id, promise_id, event_name, from_status, to_status, actor, payload)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)
      `, [
        promise.id,
        lapseResult.event.eventName,
        lapseResult.event.fromStatus,
        lapseResult.event.toStatus,
        JSON.stringify(SYSTEM_ACTOR),
        JSON.stringify(lapseResult.event.payload),
      ]);

      // Insert escalation event
      await client.query(`
        INSERT INTO promise_event (id, promise_id, event_name, from_status, to_status, actor, payload)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)
      `, [
        promise.id,
        escResult.event.eventName,
        escResult.event.fromStatus,
        escResult.event.toStatus,
        JSON.stringify(SYSTEM_ACTOR),
        JSON.stringify(escResult.event.payload),
      ]);

      // Queue notification in outbox for first ladder rung
      const ladder = escResult.updatedFields.ladder || [];
      if (ladder.length > 0) {
        const firstRung = ladder[0];
        // @ts-ignore
        const hmacToken = fastify.generateHmac ? fastify.generateHmac(promise.id) : '';
        await client.query(`
          INSERT INTO outbox (id, recipient_role, recipient_id, channel, subject, body, hmac_token)
          VALUES (gen_random_uuid(), $1, $2, 'sms', $3, $4, $5)
        `, [
          firstRung.role,
          firstRung.workerId || firstRung.role,
          `Escalation: ${promise.type} promise ${promise.id}`,
          `A ${promise.type} promise has missed its deadline. No arrival record or match missed. Please review and acknowledge.`,
          hmacToken,
        ]);
      }

      // Append to sync journal
      await client.query(`
        INSERT INTO sync_journal (table_name, op, row_id, data, priority)
        VALUES ('promise', 'update', $1, $2, $3)
      `, [
        promise.id,
        JSON.stringify({ status: escResult.newStatus, ladder: escResult.updatedFields.ladder }),
        promise.type === 'referral' ? 'referral' : 'analytics',
      ]);

      await client.query('COMMIT');
      fastify.log.info({ promiseId: promise.id }, 'Promise lapsed and escalated');
    } catch (err) {
      await client.query('ROLLBACK');
      fastify.log.error({ promiseId: promise.id, err }, 'Failed to lapse/escalate promise');
    } finally {
      client.release();
    }
  }
}

/**
 * Flush pending outbox messages via the configured SMS provider.
 * MVP: MockSmsProvider — just marks them as 'sent' and logs.
 */
async function runOutboxFlush(fastify: FastifyInstance) {
  const provider = process.env.SMS_PROVIDER || 'mock';

  const { rows } = await fastify.db.query(`
    SELECT * FROM outbox WHERE status = 'pending' ORDER BY created_at ASC LIMIT 50
  `);

  for (const msg of rows) {
    if (provider === 'mock') {
      // MockSmsProvider: log and mark sent
      fastify.log.info({
        outboxId: msg.id,
        to: `${msg.recipient_role}:${msg.recipient_id}`,
        subject: msg.subject,
      }, '[MockSMS] Notification sent');

      await fastify.db.query(`
        UPDATE outbox SET status = 'sent', sent_at = datetime('now') WHERE id = $1
      `, [msg.id]);
    }
    // DLT provider would go here in production
  }
}

/**
 * Convert a DB row into a PromiseRec-like object.
 */
function rowToPromise(row: any) {
  return {
    id: row.id,
    type: row.type,
    committedBy: typeof row.committed_by === 'string' ? JSON.parse(row.committed_by) : row.committed_by,
    committedTo: typeof row.committed_to === 'string' ? JSON.parse(row.committed_to) : row.committed_to,
    description: typeof row.description === 'string' ? JSON.parse(row.description) : (row.description || {}),
    createdAt: row.created_at,
    slaStart: row.sla_start,
    deadline: row.deadline,
    evidence: typeof row.evidence === 'string' ? JSON.parse(row.evidence) : row.evidence,
    independence: row.independence,
    status: row.status,
    ladder: typeof row.ladder === 'string' ? JSON.parse(row.ladder) : (row.ladder || []),
    version: row.version,
  };
}

export const schedulerPlugin = fp(schedulerPluginFn, {
  name: 'scheduler',
  dependencies: ['db'],
});

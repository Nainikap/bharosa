import fp from 'fastify-plugin';
import PgBoss from 'pg-boss';
import { FastifyInstance } from 'fastify';
import { lapse, escalate } from '@bharosa/shared-contracts';
import { SCHEDULER_TICK_MS } from '@bharosa/shared-contracts';

declare module 'fastify' {
  interface FastifyInstance {
    boss: PgBoss;
  }
}

const SYSTEM_ACTOR = { role: 'system', workerId: 'scheduler' };

async function ensureQueue(boss: PgBoss, queueName: string) {
  try {
    await boss.createQueue(queueName);
  } catch (error: any) {
    const message = String(error?.message ?? error);
    const isDuplicate = /already exists|duplicate key|queue.*exists/i.test(message);
    if (!isDuplicate && error?.code !== '23505') {
      throw error;
    }
  }
}

async function schedulerPluginFn(fastify: FastifyInstance) {
  const boss = new PgBoss({
    connectionString: process.env.DATABASE_URL || 'postgres://bharosa:bharosa_dev@localhost:5432/bharosa',
    monitorStateIntervalSeconds: 30,
  });

  await boss.start();
  fastify.log.info('pg-boss scheduler started');
  fastify.decorate('boss', boss);

  // ─── Initialize Queues ───────────────────────────────────────
  // Required in pg-boss v9+ to satisfy database foreign keys.
  // Guard against partial startup or stale state where the queue row is not present yet.
  await ensureQueue(boss, 'promise-lapse-check');
  await ensureQueue(boss, 'outbox-flush');

  // ─── Evidence-timeout lapse detection ────────────────────────
  // Convert SCHEDULER_TICK_MS to valid cron expression
  const tickSeconds = Math.round(SCHEDULER_TICK_MS / 1000);
  const lapseCron = tickSeconds < 60 
    ? `*/${Math.max(1, tickSeconds)} * * * * *` // 6-part cron for sub-minute
    : `*/${Math.max(1, Math.round(tickSeconds / 60))} * * * *`; // 5-part cron for minutes

  await ensureQueue(boss, 'promise-lapse-check');
  await boss.schedule('promise-lapse-check', lapseCron, {}, {});

  await boss.work('promise-lapse-check', async () => {
    await runLapseCheck(fastify);
  });

  // ─── Outbox flush (sends pending notifications every minute) ─
  await ensureQueue(boss, 'outbox-flush');
  await boss.schedule('outbox-flush', '* * * * *', {}, {});
  await boss.work('outbox-flush', async () => {
    await runOutboxFlush(fastify);
  });

  fastify.addHook('onClose', async () => {
    await boss.stop();
  });
}

/**
 * Scan for open promises past their deadline → lapse → escalate.
 * Idempotent: reads current status, never double-transitions.
 */
async function runLapseCheck(fastify: FastifyInstance) {
  const { rows: overdue } = await fastify.pg.query(`
    SELECT p.id, p.type, p.status, p.sla_start, p.deadline, p.version,
           p.committed_by, p.committed_to, p.description, p.evidence,
           p.independence, p.ladder, p.created_at
    FROM promise p
    WHERE p.status = 'open'
      AND p.deadline IS NOT NULL
      AND p.deadline < NOW()
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
    const client = await fastify.pg.connect();
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
        const hmacToken = fastify.generateHmac(promise.id);
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

  const { rows } = await fastify.pg.query(`
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

      await fastify.pg.query(`
        UPDATE outbox SET status = 'sent', sent_at = NOW() WHERE id = $1
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
    committedBy: row.committed_by,
    committedTo: row.committed_to,
    description: row.description || {},
    createdAt: row.created_at,
    slaStart: row.sla_start,
    deadline: row.deadline,
    evidence: row.evidence,
    independence: row.independence,
    status: row.status,
    ladder: row.ladder || [],
    version: row.version,
  };
}

export const schedulerPlugin = fp(schedulerPluginFn, {
  name: 'scheduler',
  dependencies: ['db'],
});
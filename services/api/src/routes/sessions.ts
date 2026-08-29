import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getTimeoutMs } from '@bharosa/shared-contracts';

export async function sessionRoutes(fastify: FastifyInstance) {

  // ─── POST /sessions/plan ─────────────────────────────────────
  // ANM bulk-seeds monthly RI/VHND plan → vaccine_supply commitments
  fastify.post('/plan', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    const body = request.body as any;

    const { sessions } = body;
    if (!Array.isArray(sessions) || sessions.length === 0) {
      return reply.status(422).send({ error: 'sessions array is required' });
    }

    const committedBy = { role: user.role, workerId: user.workerId, facilityId: user.facilityId };
    const createdPromises: any[] = [];

    const client = await fastify.pg.connect();
    try {
      await client.query('BEGIN');

      for (const session of sessions) {
        const { sessionDate, sessionType, vaccines, villageName, facilityId } = session;

        if (!sessionDate || !vaccines || !villageName) {
          continue; // skip malformed entries
        }

        const committedTo = { role: 'facility', facilityId: facilityId || user.facilityId };

        // Compute deadline: session_date + 1 day
        const sessionDateObj = new Date(sessionDate);
        const timeoutMs = getTimeoutMs('vaccine_supply', 'default');
        const deadline = new Date(sessionDateObj.getTime() + timeoutMs);

        // Create promise with independence: plan_seeded (V6)
        const { rows } = await client.query(`
          INSERT INTO promise (type, committed_by, committed_to, description, sla_start, deadline, independence, status)
          VALUES ('vaccine_supply', $1, $2, $3, NOW(), $4, 'plan_seeded', 'open')
          RETURNING *
        `, [
          JSON.stringify(committedBy),
          JSON.stringify(committedTo),
          JSON.stringify({ sessionDate, sessionType, vaccines, villageName }),
          deadline.toISOString(),
        ]);

        const promise = rows[0];

        // Create session detail
        await client.query(`
          INSERT INTO session_detail (promise_id, session_date, session_type, vaccines, village_name, facility_id)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [promise.id, sessionDate, sessionType || 'ri', JSON.stringify(vaccines), villageName, facilityId || user.facilityId]);

        // Audit event
        await client.query(`
          INSERT INTO promise_event (id, promise_id, event_name, from_status, to_status, actor, payload)
          VALUES (gen_random_uuid(), $1, 'promise.created', 'open', 'open', $2, $3)
        `, [promise.id, JSON.stringify(committedBy), JSON.stringify({ type: 'vaccine_supply', independence: 'plan_seeded' })]);

        createdPromises.push({
          id: promise.id,
          sessionDate,
          vaccines,
          villageName,
          independence: 'plan_seeded',
          deadline: promise.deadline,
        });
      }

      await client.query('COMMIT');

      return reply.status(201).send({
        created: createdPromises.length,
        promises: createdPromises,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      fastify.log.error(err, 'Failed to seed session plan');
      return reply.status(500).send({ error: 'Failed to seed session plan' });
    } finally {
      client.release();
    }
  });

  // ─── POST /sessions/:id/dispatch-confirm ─────────────────────
  // PHC confirms dispatch → upgrades independence flag
  fastify.post('/:id/dispatch-confirm', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any;
    const user = request.user;

    const { rows } = await fastify.pg.query(
      "SELECT * FROM promise WHERE id = $1 AND type = 'vaccine_supply'", [id]
    );
    if (rows.length === 0) {
      return reply.status(404).send({ error: 'Session promise not found' });
    }

    // Upgrade independence: plan_seeded → direct
    await fastify.pg.query(`
      UPDATE promise SET independence = 'direct', version = version + 1 WHERE id = $1
    `, [id]);

    await fastify.pg.query(`
      INSERT INTO promise_event (id, promise_id, event_name, from_status, to_status, actor, payload)
      VALUES (gen_random_uuid(), $1, 'promise.annotated', $2, $2, $3, $4)
    `, [id, rows[0].status, JSON.stringify({ role: user.role, workerId: user.workerId }),
        JSON.stringify({ independenceUpgrade: 'plan_seeded→direct' })]);

    return { independence: 'direct' };
  });

  // ─── POST /sessions/:id/point-of-use ─────────────────────────
  // ASHA single-tap present/absent log on session day
  fastify.post('/:id/point-of-use', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any;
    const user = request.user;
    const { present } = request.body as any;

    const { rows } = await fastify.pg.query(
      "SELECT * FROM promise WHERE id = $1 AND type = 'vaccine_supply'", [id]
    );
    if (rows.length === 0) {
      return reply.status(404).send({ error: 'Session promise not found' });
    }

    const promise = rows[0];
    const actor = { role: user.role, workerId: user.workerId };

    if (present) {
      // Vaccine present → kept
      const evidence = {
        kind: 'point_of_use_log',
        source: 'session_log',
        confidence: 'verified',
        capturedAt: new Date(),
      };

      await fastify.pg.query(`
        UPDATE promise SET status = 'kept', evidence = $1, version = version + 1 WHERE id = $2
      `, [JSON.stringify(evidence), id]);

      await fastify.pg.query(`
        INSERT INTO promise_event (id, promise_id, event_name, from_status, to_status, actor, payload)
        VALUES (gen_random_uuid(), $1, 'promise.kept', $2, 'kept', $3, $4)
      `, [id, promise.status, JSON.stringify(actor), JSON.stringify({ evidence })]);

      return { status: 'kept' };
    } else {
      // Vaccine absent → lapse immediately (don't wait for T+1d)
      await fastify.pg.query(`
        UPDATE promise SET status = 'lapsed', version = version + 1 WHERE id = $1
      `, [id]);

      await fastify.pg.query(`
        INSERT INTO promise_event (id, promise_id, event_name, from_status, to_status, actor, payload)
        VALUES (gen_random_uuid(), $1, 'promise.lapsed', $2, 'lapsed', $3, $4)
      `, [id, promise.status, JSON.stringify(actor), JSON.stringify({ reason: 'absent_at_point_of_use' })]);

      return { status: 'lapsed' };
    }
  });
}

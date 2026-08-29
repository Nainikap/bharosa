import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getTimeoutMs, referralSubtype } from '@bharosa/shared-contracts';

export async function referralRoutes(fastify: FastifyInstance) {

  // ─── POST /referrals ─────────────────────────────────────────
  // Create a referral promise (convenience wrapper over /promises)
  fastify.post('/', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    const body = request.body as any;

    const {
      patientId, priority, destinationFacilityId,
      humanCode, qrCode, referralReason, triageRoute,
    } = body;

    if (!patientId || !priority || !destinationFacilityId || !referralReason) {
      return reply.status(422).send({
        error: 'patientId, priority, destinationFacilityId, and referralReason are required',
      });
    }

    const committedBy = { role: user.role, workerId: user.workerId, facilityId: user.facilityId };
    const committedTo = { role: 'facility', facilityId: destinationFacilityId };
    const subtype = referralSubtype(priority);

    let timeoutMs = 0;
    try { timeoutMs = getTimeoutMs('referral', subtype); } catch { /* no-op */ }

    const client = await fastify.pg.connect();
    try {
      await client.query('BEGIN');

      // Create the promise
      const { rows } = await client.query(`
        INSERT INTO promise (type, committed_by, committed_to, description, sla_start, deadline, status)
        VALUES ('referral', $1, $2, $3, NOW(), $4, 'open')
        RETURNING *
      `, [
        JSON.stringify(committedBy),
        JSON.stringify(committedTo),
        JSON.stringify({ priority, referralReason, triageRoute }),
        timeoutMs > 0 ? new Date(Date.now() + timeoutMs).toISOString() : null,
      ]);

      const promise = rows[0];

      // Create referral detail
      await client.query(`
        INSERT INTO referral_detail (promise_id, patient_id, priority, destination_facility_id, human_code, qr_code, referral_reason, triage_route)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [promise.id, patientId, priority, destinationFacilityId, humanCode || null, qrCode || null, referralReason, triageRoute || null]);

      // Audit event
      await client.query(`
        INSERT INTO promise_event (id, promise_id, event_name, from_status, to_status, actor, payload)
        VALUES (gen_random_uuid(), $1, 'promise.created', 'open', 'open', $2, $3)
      `, [promise.id, JSON.stringify(committedBy), JSON.stringify({ type: 'referral', priority })]);

      // Sync journal
      await client.query(`
        INSERT INTO sync_journal (table_name, op, row_id, data, device_id, priority)
        VALUES ('promise', 'insert', $1, $2, $3, 'referral')
      `, [promise.id, JSON.stringify(promise), user.deviceId]);

      await client.query('COMMIT');

      return reply.status(201).send({
        id: promise.id,
        type: 'referral',
        status: 'open',
        priority,
        patientId,
        destinationFacilityId,
        referralReason,
        createdAt: promise.created_at,
        slaStart: promise.sla_start,
        deadline: promise.deadline,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      fastify.log.error(err, 'Failed to create referral');
      return reply.status(500).send({ error: 'Failed to create referral' });
    } finally {
      client.release();
    }
  });

  // ─── GET /referrals ──────────────────────────────────────────
  // List referrals (PHC/MO dashboard)
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest) => {
    const { priority, status, limit, offset } = request.query as any;

    let query = `
      SELECT p.*, rd.patient_id, rd.priority, rd.destination_facility_id,
             rd.human_code, rd.referral_reason, rd.triage_route
      FROM promise p
      JOIN referral_detail rd ON rd.promise_id = p.id
      WHERE p.type = 'referral'
    `;
    const params: any[] = [];
    let idx = 1;

    if (priority) {
      query += ` AND rd.priority = $${idx++}`;
      params.push(priority);
    }
    if (status) {
      query += ` AND p.status = $${idx++}`;
      params.push(status);
    }

    query += ` ORDER BY p.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(parseInt(limit || '50', 10));
    params.push(parseInt(offset || '0', 10));

    const { rows } = await fastify.pg.query(query, params);

    return { data: rows, total: rows.length };
  });

  // ─── GET /referrals/:id ──────────────────────────────────────
  fastify.get('/:id', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any;

    const { rows } = await fastify.pg.query(`
      SELECT p.*, rd.patient_id, rd.priority, rd.destination_facility_id,
             rd.human_code, rd.qr_code, rd.referral_reason, rd.triage_route
      FROM promise p
      JOIN referral_detail rd ON rd.promise_id = p.id
      WHERE p.id = $1 AND p.type = 'referral'
    `, [id]);

    if (rows.length === 0) {
      return reply.status(404).send({ error: 'Referral not found' });
    }

    const { rows: events } = await fastify.pg.query(
      'SELECT * FROM promise_event WHERE promise_id = $1 ORDER BY ts ASC', [id]
    );

    return { ...rows[0], events };
  });

  // ─── POST /referrals/:id/accept | /reject ────────────────────
  // Legacy PHC dashboard compatibility (maps to evidence or close_na)
  fastify.post('/:id/accept', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any;
    const user = request.user;

    // Accept = apply registration_match evidence
    const { rows } = await fastify.pg.query('SELECT * FROM promise WHERE id = $1', [id]);
    if (rows.length === 0) return reply.status(404).send({ error: 'Referral not found' });

    await fastify.pg.query(`
      UPDATE promise SET status = 'kept', evidence = $1, version = version + 1 WHERE id = $2
    `, [
      JSON.stringify({
        kind: 'referral_acceptance',
        source: 'manual_code',
        confidence: 'verified',
        capturedAt: new Date(),
      }),
      id,
    ]);

    await fastify.pg.query(`
      INSERT INTO promise_event (id, promise_id, event_name, from_status, to_status, actor)
      VALUES (gen_random_uuid(), $1, 'promise.kept', $2, 'kept', $3)
    `, [id, rows[0].status, JSON.stringify({ role: user.role, workerId: user.workerId })]);

    return { status: 'kept' };
  });

  fastify.post('/:id/reject', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any;
    const user = request.user;

    const { rows } = await fastify.pg.query('SELECT * FROM promise WHERE id = $1', [id]);
    if (rows.length === 0) return reply.status(404).send({ error: 'Referral not found' });

    await fastify.pg.query(`
      UPDATE promise SET status = 'closed_na', version = version + 1 WHERE id = $1
    `, [id]);

    await fastify.pg.query(`
      INSERT INTO promise_event (id, promise_id, event_name, from_status, to_status, actor, payload)
      VALUES (gen_random_uuid(), $1, 'promise.closed_na', $2, 'closed_na', $3, $4)
    `, [id, rows[0].status, JSON.stringify({ role: user.role, workerId: user.workerId }),
        JSON.stringify({ reason: 'rejected_by_facility' })]);

    return { status: 'closed_na' };
  });
}

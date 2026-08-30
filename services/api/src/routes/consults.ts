import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getTimeoutMs, consultSubtype } from '@bharosa/shared-contracts';

export async function consultRoutes(fastify: FastifyInstance) {

  // ─── POST /consults ──────────────────────────────────────────
  // Worker → doctor tab request (photos/vitals/summary from triage)
  fastify.post('/', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    const body = request.body as any;

    const { patientId, urgency, photos, vitals, summary, triageRoute } = body;

    if (!patientId || !urgency || !summary || !triageRoute) {
      return reply.status(422).send({
        error: 'patientId, urgency, summary, and triageRoute are required',
      });
    }

    const committedBy = { role: user.role, workerId: user.workerId, facilityId: user.facilityId };
    const committedTo = { role: 'doctor' };
    const subtype = consultSubtype(urgency);
    const timeoutMs = getTimeoutMs('consult', subtype);

    const client = await fastify.db.connect();
    try {
      await client.query('BEGIN');

      const { rows } = await client.query(`
        INSERT INTO promise (id, type, committed_by, committed_to, description, sla_start, deadline, status)
        VALUES (gen_random_uuid(), 'consult', $1, $2, $3, NOW(), $4, 'open')
        RETURNING *
      `, [
        JSON.stringify(committedBy),
        JSON.stringify(committedTo),
        JSON.stringify({ urgency, triageRoute }),
        new Date(Date.now() + timeoutMs).toISOString(),
      ]);

      const promise = rows[0];

      // Create consult detail
      await client.query(`
        INSERT INTO consult_detail (promise_id, patient_id, urgency, photos, vitals, summary, triage_route)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        promise.id, patientId, urgency,
        JSON.stringify(photos || []),
        vitals ? JSON.stringify(vitals) : null,
        summary, triageRoute,
      ]);

      // Audit event
      await client.query(`
        INSERT INTO promise_event (id, promise_id, event_name, from_status, to_status, actor, payload)
        VALUES (gen_random_uuid(), $1, 'promise.created', 'open', 'open', $2, $3)
      `, [promise.id, JSON.stringify(committedBy), JSON.stringify({ type: 'consult', urgency })]);

      await client.query('COMMIT');

      return reply.status(201).send({
        id: promise.id,
        type: 'consult',
        urgency,
        patientId,
        status: 'open',
        deadline: promise.deadline,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      fastify.log.error(err, 'Failed to create consult request');
      return reply.status(500).send({ error: 'Failed to create consult request' });
    } finally {
      client.release();
    }
  });

  // ─── GET /consults/queue ─────────────────────────────────────
  // Doctor tab: longitudinal queue of pending consults
  fastify.get('/queue', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest) => {
    const { status, limit, offset } = request.query as any;

    let query = `
      SELECT p.*, cd.patient_id, cd.urgency, cd.summary, cd.triage_route,
             cd.photos, cd.vitals, cd.response,
             pat.name AS patient_name, pat.village AS patient_village, pat.fuzzy_dob
      FROM promise p
      JOIN consult_detail cd ON cd.promise_id = p.id
      LEFT JOIN patient pat ON pat.local_id = cd.patient_id
      WHERE p.type = 'consult'
    `;
    const params: any[] = [];
    let idx = 1;

    if (status) {
      query += ` AND p.status = $${idx++}`;
      params.push(status);
    } else {
      query += ` AND p.status = 'open'`;
    }

    query += ` ORDER BY
      CASE cd.urgency WHEN 'urgent' THEN 0 ELSE 1 END,
      p.created_at ASC
    `;
    query += ` LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(parseInt(limit || '50', 10));
    params.push(parseInt(offset || '0', 10));

    const { rows } = await fastify.db.query(query, params);

    return { data: rows, total: rows.length };
  });

  // ─── POST /consults/:id/respond ──────────────────────────────
  // Doctor structured response + voice note within SLA
  fastify.post('/:id/respond', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any;
    const user = request.user;
    const { structuredNotes, voiceNoteRef } = request.body as any;

    if (!structuredNotes) {
      return reply.status(422).send({ error: 'structuredNotes is required' });
    }

    const { rows } = await fastify.db.query(
      "SELECT * FROM promise WHERE id = $1 AND type = 'consult'", [id]
    );
    if (rows.length === 0) {
      return reply.status(404).send({ error: 'Consult promise not found' });
    }

    const promise = rows[0];
    const response = {
      structuredNotes,
      voiceNoteRef: voiceNoteRef || null,
      respondedAt: new Date(),
      doctorId: user.workerId,
    };

    const evidence = {
      kind: 'consult_response',
      source: 'external_feed',
      confidence: 'verified',
      capturedAt: new Date(),
    };

    const client = await fastify.db.connect();
    try {
      await client.query('BEGIN');

      // Update consult detail with response
      await client.query(`
        UPDATE consult_detail SET response = $1 WHERE promise_id = $2
      `, [JSON.stringify(response), id]);

      // Mark promise as kept
      await client.query(`
        UPDATE promise SET status = 'kept', evidence = $1, version = version + 1 WHERE id = $2
      `, [JSON.stringify(evidence), id]);

      // Audit event
      await client.query(`
        INSERT INTO promise_event (id, promise_id, event_name, from_status, to_status, actor, payload)
        VALUES (gen_random_uuid(), $1, 'promise.kept', $2, 'kept', $3, $4)
      `, [id, promise.status,
          JSON.stringify({ role: user.role, workerId: user.workerId }),
          JSON.stringify({ response: { structuredNotes: '...' }, evidence })]);

      await client.query('COMMIT');

      return { status: 'kept', response };
    } catch (err) {
      await client.query('ROLLBACK');
      fastify.log.error(err, 'Failed to respond to consult');
      return reply.status(500).send({ error: 'Failed to respond to consult' });
    } finally {
      client.release();
    }
  });
}

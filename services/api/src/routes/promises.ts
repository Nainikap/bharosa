import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  applyEvidence,
  annotate as annotateEngine,
  ackLadderRung,
  getTimeoutMs,
  referralSubtype,
  consultSubtype,
} from '@bharosa/shared-contracts';

export async function promiseRoutes(fastify: FastifyInstance) {

  // ─── POST /promises ──────────────────────────────────────────
  // Create promise (any type)
  fastify.post('/', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    const body = request.body as any;

    const { type, committedTo, description, independence } = body;

    if (!type || !committedTo) {
      return reply.status(422).send({ error: 'type and committedTo are required' });
    }

    const validTypes = ['referral', 'vaccine_supply', 'consult', 'followup'];
    if (!validTypes.includes(type)) {
      return reply.status(422).send({ error: `Invalid type. Must be one of: ${validTypes.join(', ')}` });
    }

    const committedBy = {
      role: user.role,
      facilityId: user.facilityId,
      workerId: user.workerId,
    };

    // Determine subtype for deadline
    let subtype = 'default';
    if (type === 'referral' && description?.priority) {
      subtype = referralSubtype(description.priority);
    } else if (type === 'consult' && description?.urgency) {
      subtype = consultSubtype(description.urgency);
    }

    // Compute deadline
    let timeoutMs = 0;
    try {
      timeoutMs = getTimeoutMs(type, subtype);
    } catch { /* 0 = no auto-deadline */ }

    const client = await fastify.db.connect();
    try {
      await client.query('BEGIN');

      const { rows } = await client.query(`
        INSERT INTO promise (id, type, committed_by, committed_to, description, sla_start, deadline, independence, status)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), $5, $6, 'open')
        RETURNING *
      `, [
        type,
        JSON.stringify(committedBy),
        JSON.stringify(committedTo),
        JSON.stringify(description || {}),
        timeoutMs > 0 ? new Date(Date.now() + timeoutMs).toISOString() : null,
        independence || null,
      ]);

      const promise = rows[0];

      // Insert audit event
      await client.query(`
        INSERT INTO promise_event (id, promise_id, event_name, from_status, to_status, actor, payload)
        VALUES (gen_random_uuid(), $1, 'promise.created', 'open', 'open', $2, $3)
      `, [promise.id, JSON.stringify(committedBy), JSON.stringify({ type, subtype })]);

      // Append to sync journal
      await client.query(`
        INSERT INTO sync_journal (table_name, op, row_id, data, device_id, priority)
        VALUES ('promise', 'insert', $1, $2, $3, $4)
      `, [
        promise.id,
        JSON.stringify(promise),
        user.deviceId,
        type === 'referral' ? 'referral' : type === 'consult' ? 'consult' : 'analytics',
      ]);

      await client.query('COMMIT');

      return reply.status(201).send(formatPromise(promise));
    } catch (err) {
      await client.query('ROLLBACK');
      fastify.log.error(err, 'Failed to create promise');
      return reply.status(500).send({ error: 'Failed to create promise' });
    } finally {
      client.release();
    }
  });

  // ─── GET /promises ───────────────────────────────────────────
  // List (role-scoped with filters)
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest) => {
    const { type, status, facility, limit, offset } = request.query as any;

    let query = 'SELECT * FROM promise WHERE 1=1';
    const params: any[] = [];
    let idx = 1;

    if (type) {
      query += ` AND type = $${idx++}`;
      params.push(type);
    }
    if (status) {
      query += ` AND status = $${idx++}`;
      params.push(status);
    }
    if (facility) {
      query += ` AND committed_to->>'facilityId' = $${idx++}`;
      params.push(facility);
    }

    query += ` ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(parseInt(limit || '50', 10));
    params.push(parseInt(offset || '0', 10));

    const { rows } = await fastify.db.query(query, params);

    return { data: rows.map(formatPromise), total: rows.length };
  });

  // ─── GET /promises/:id ───────────────────────────────────────
  // Detail + ladder + events
  fastify.get('/:id', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any;

    const { rows } = await fastify.db.query('SELECT * FROM promise WHERE id = $1', [id]);
    if (rows.length === 0) {
      return reply.status(404).send({ error: 'Promise not found' });
    }

    const { rows: events } = await fastify.db.query(
      'SELECT * FROM promise_event WHERE promise_id = $1 ORDER BY ts ASC', [id]
    );

    return {
      ...formatPromise(rows[0]),
      events,
    };
  });

  // ─── POST /promises/:id/evidence ─────────────────────────────
  // Attach typed evidence
  fastify.post('/:id/evidence', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any;
    const user = request.user;
    const body = request.body as any;

    const { kind, source, confidence } = body;
    if (!kind || !source) {
      return reply.status(422).send({ error: 'kind and source are required' });
    }

    const validSources = ['registration_match', 'manual_code', 'batch_entry', 'attestation', 'session_log', 'external_feed'];
    if (!validSources.includes(source)) {
      return reply.status(422).send({ error: `Invalid source. Must be one of: ${validSources.join(', ')}` });
    }

    const { rows } = await fastify.db.query('SELECT * FROM promise WHERE id = $1', [id]);
    if (rows.length === 0) {
      return reply.status(404).send({ error: 'Promise not found' });
    }

    const promise = rowToPromise(rows[0]);
    const evidence = {
      kind,
      source,
      confidence: confidence || 'verified',
      capturedAt: new Date(),
      ...body.metadata ? { metadata: body.metadata } : {},
    };

    const actor = { role: user.role, workerId: user.workerId, facilityId: user.facilityId };
    const result = applyEvidence(promise, evidence, actor);

    if (!result.ok) {
      return reply.status(409).send({ error: result.code, message: result.message });
    }

    const client = await fastify.db.connect();
    try {
      await client.query('BEGIN');

      await client.query(`
        UPDATE promise SET status = $1, evidence = $2, version = $3 WHERE id = $4
      `, [result.newStatus, JSON.stringify(evidence), result.updatedFields.version, id]);

      await client.query(`
        INSERT INTO promise_event (id, promise_id, event_name, from_status, to_status, actor, payload)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)
      `, [id, result.event.eventName, result.event.fromStatus, result.event.toStatus,
          JSON.stringify(actor), JSON.stringify(result.event.payload)]);

      await client.query(`
        INSERT INTO sync_journal (table_name, op, row_id, data, priority)
        VALUES ('promise', 'update', $1, $2, 'referral')
      `, [id, JSON.stringify({ status: result.newStatus, evidence })]);

      await client.query('COMMIT');

      return { status: result.newStatus, evidence };
    } catch (err) {
      await client.query('ROLLBACK');
      fastify.log.error(err, 'Failed to apply evidence');
      return reply.status(500).send({ error: 'Failed to apply evidence' });
    } finally {
      client.release();
    }
  });

  // ─── POST /promises/:id/annotate ─────────────────────────────
  // Terminal annotation (closed only — V3)
  fastify.post('/:id/annotate', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any;
    const user = request.user;
    const body = request.body as any;

    const { rows } = await fastify.db.query('SELECT * FROM promise WHERE id = $1', [id]);
    if (rows.length === 0) {
      return reply.status(404).send({ error: 'Promise not found' });
    }

    const promise = rowToPromise(rows[0]);
    const actor = { role: user.role, workerId: user.workerId };
    const result = annotateEngine(promise, body.annotation || body, actor);

    if (!result.ok) {
      return reply.status(409).send({ error: result.code, message: result.message });
    }

    await fastify.db.query(`
      UPDATE promise SET version = $1 WHERE id = $2
    `, [result.updatedFields.version, id]);

    await fastify.db.query(`
      INSERT INTO promise_event (id, promise_id, event_name, from_status, to_status, actor, payload)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)
    `, [id, result.event.eventName, result.event.fromStatus, result.event.toStatus,
        JSON.stringify(actor), JSON.stringify(result.event.payload)]);

    return { annotated: true };
  });
}

function formatPromise(row: any) {
  return {
    id: row.id,
    type: row.type,
    committedBy: row.committed_by,
    committedTo: row.committed_to,
    description: row.description,
    createdAt: row.created_at,
    slaStart: row.sla_start,
    deadline: row.deadline,
    evidence: row.evidence,
    independence: row.independence,
    status: row.status,
    ladder: row.ladder,
    version: row.version,
  };
}

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

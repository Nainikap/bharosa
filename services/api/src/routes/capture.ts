import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export async function captureRoutes(fastify: FastifyInstance) {

  // ─── POST /capture/arrival ───────────────────────────────────
  // Scan/manual/batch → registration_match evidence (V2 typed)
  fastify.post('/arrival', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    const body = request.body as any;

    const { promiseId, source, patientName, village } = body;

    if (!promiseId) {
      return reply.status(422).send({ error: 'promiseId is required' });
    }

    const validSources = ['registration_match', 'manual_code', 'batch_entry'];
    const captureSource = validSources.includes(source) ? source : 'manual_code';

    const { rows } = await fastify.db.query(
      "SELECT * FROM promise WHERE id = $1 AND type = 'referral'", [promiseId]
    );
    if (rows.length === 0) {
      return reply.status(404).send({ error: 'Referral promise not found' });
    }

    const promise = rows[0];
    if (promise.status !== 'open' && promise.status !== 'escalated') {
      return reply.status(409).send({ error: `Cannot capture arrival for promise in status ${promise.status}` });
    }

    const evidence = {
      kind: 'arrival_registration',
      source: captureSource,
      confidence: 'verified' as const,
      capturedAt: new Date(),
      metadata: { patientName, village, capturedBy: user.workerId },
    };

    const newStatus = promise.status === 'escalated' ? 'kept' : 'kept'; // kept (or kept_late if escalated)
    const eventName = promise.status === 'escalated' ? 'promise.kept_late' : 'promise.kept';

    const client = await fastify.db.connect();
    try {
      await client.query('BEGIN');

      await client.query(`
        UPDATE promise SET status = $1, evidence = $2, version = version + 1 WHERE id = $3
      `, [newStatus, JSON.stringify(evidence), promiseId]);

      await client.query(`
        INSERT INTO promise_event (id, promise_id, event_name, from_status, to_status, actor, payload)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)
      `, [
        promiseId, eventName, promise.status, newStatus,
        JSON.stringify({ role: user.role, workerId: user.workerId }),
        JSON.stringify({ evidence }),
      ]);

      // Log encounter
      if (body.patientId) {
        await client.query(`
          INSERT INTO encounter (patient_id, type, facility_id, worker_id, data)
          VALUES ($1, 'arrival', $2, $3, $4)
        `, [body.patientId, user.facilityId, user.workerId, JSON.stringify({ source: captureSource })]);
      }

      // Sync journal
      await client.query(`
        INSERT INTO sync_journal (table_name, op, row_id, data, priority)
        VALUES ('promise', 'update', $1, $2, 'referral')
      `, [promiseId, JSON.stringify({ status: newStatus, evidence })]);

      await client.query('COMMIT');

      return { status: newStatus, evidence, source: captureSource };
    } catch (err) {
      await client.query('ROLLBACK');
      fastify.log.error(err, 'Failed to capture arrival');
      return reply.status(500).send({ error: 'Failed to capture arrival' });
    } finally {
      client.release();
    }
  });

  // ─── POST /capture/fuzzy-match ───────────────────────────────
  // name+village fuzzy confirm (terminal-annotation safe)
  fastify.post('/fuzzy-match', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    const { name, village } = request.body as any;

    if (!name || !village) {
      return reply.status(422).send({ error: 'name and village are required' });
    }

    // Fuzzy search: find open referral promises matching patient name+village
    const { rows } = await fastify.db.query(`
      SELECT p.id, p.status, rd.patient_id, pat.name, pat.village
      FROM promise p
      JOIN referral_detail rd ON rd.promise_id = p.id
      JOIN patient pat ON pat.local_id = rd.patient_id
      WHERE p.type = 'referral'
        AND p.status IN ('open', 'escalated')
        AND LOWER(pat.name) LIKE LOWER($1)
        AND LOWER(pat.village) LIKE LOWER($2)
      LIMIT 10
    `, [`%${name}%`, `%${village}%`]);

    return {
      matches: rows.map(r => ({
        promiseId: r.id,
        promiseStatus: r.status,
        patientName: r.name,
        village: r.village,
      })),
    };
  });
}

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export async function taskRoutes(fastify: FastifyInstance) {

  // ─── GET /tasks ──────────────────────────────────────────────
  // ASHA follow-up + child-absent task list (V8)
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest) => {
    const user = request.user;
    const { worker, cohort, status, limit, offset } = request.query as any;

    const workerId = worker || user.workerId;

    let query = `
      SELECT p.*, fd.patient_id, fd.cohort, fd.round_date, fd.generated_from, fd.outcome,
             pat.name AS patient_name, pat.village AS patient_village
      FROM promise p
      JOIN followup_detail fd ON fd.promise_id = p.id
      LEFT JOIN patient pat ON pat.local_id = fd.patient_id
      WHERE p.type = 'followup'
        AND p.committed_by->>'workerId' = $1
    `;
    const params: any[] = [workerId];
    let idx = 2;

    if (cohort) {
      query += ` AND fd.cohort = $${idx++}`;
      params.push(cohort);
    }
    if (status) {
      query += ` AND p.status = $${idx++}`;
      params.push(status);
    } else {
      query += ` AND p.status = 'open'`;
    }

    query += ` ORDER BY fd.round_date ASC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(parseInt(limit || '50', 10));
    params.push(parseInt(offset || '0', 10));

    const { rows } = await fastify.db.query(query, params);

    return {
      data: rows.map(r => ({
        id: r.id,
        patientId: r.patient_id,
        patientName: r.patient_name,
        village: r.patient_village,
        cohort: r.cohort,
        roundDate: r.round_date,
        generatedFrom: r.generated_from,
        status: r.status,
        outcome: r.outcome,
      })),
      total: rows.length,
    };
  });

  // ─── POST /tasks/:id/attest ──────────────────────────────────
  // ASHA round-visit outcome write-back
  fastify.post('/:id/attest', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any;
    const user = request.user;
    const body = request.body as any;

    const { outcomeStatus, notes } = body;

    if (!outcomeStatus) {
      return reply.status(422).send({ error: 'outcomeStatus is required (completed|not_found|refused|migrated)' });
    }

    const { rows } = await fastify.db.query(
      "SELECT * FROM promise WHERE id = $1 AND type = 'followup'", [id]
    );
    if (rows.length === 0) {
      return reply.status(404).send({ error: 'Follow-up task not found' });
    }

    const promise = rows[0];
    const outcome = {
      attestedAt: new Date(),
      notes: notes || '',
      status: outcomeStatus,
    };

    const evidence = {
      kind: 'round_attestation',
      source: 'attestation',
      confidence: 'reported',
      capturedAt: new Date(),
    };

    const client = await fastify.db.connect();
    try {
      await client.query('BEGIN');

      // Update followup detail with outcome
      await client.query(`
        UPDATE followup_detail SET outcome = $1 WHERE promise_id = $2
      `, [JSON.stringify(outcome), id]);

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
          JSON.stringify({ outcome, evidence })]);

      await client.query('COMMIT');

      return { status: 'kept', outcome };
    } catch (err) {
      await client.query('ROLLBACK');
      fastify.log.error(err, 'Failed to attest follow-up');
      return reply.status(500).send({ error: 'Failed to attest follow-up' });
    } finally {
      client.release();
    }
  });

  // ─── POST /tasks/generate-child-absent ───────────────────────
  // Generate child-absent follow-up promises from session attendance (V8)
  // Typically called by the scheduler, but exposed as API for manual trigger
  fastify.post('/generate-child-absent', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    const { sessionPromiseId } = request.body as any;

    if (!sessionPromiseId) {
      return reply.status(422).send({ error: 'sessionPromiseId is required' });
    }

    // Find the session detail
    const { rows: sessionRows } = await fastify.db.query(`
      SELECT sd.*, p.committed_by
      FROM session_detail sd
      JOIN promise p ON p.id = sd.promise_id
      WHERE sd.promise_id = $1
    `, [sessionPromiseId]);

    if (sessionRows.length === 0) {
      return reply.status(404).send({ error: 'Session not found' });
    }

    const session = sessionRows[0];

    // Find patients in this village who were due but didn't attend
    // (Simplified: in production this cross-references the RI due-list)
    const { rows: duePatients } = await fastify.db.query(`
      SELECT p.local_id, p.name, p.village
      FROM patient p
      WHERE LOWER(p.village) = LOWER($1)
    `, [session.village_name]);

    const created: any[] = [];
    const committedBy = session.committed_by;

    const client = await fastify.db.connect();
    try {
      await client.query('BEGIN');

      for (const patient of duePatients) {
        // Check if a follow-up already exists for this patient from this session
        const { rows: existing } = await client.query(`
          SELECT 1 FROM followup_detail
          WHERE patient_id = $1 AND generated_from = $2
        `, [patient.local_id, sessionPromiseId]);

        if (existing.length > 0) continue;

        // Create follow-up promise
        const { rows: promiseRows } = await client.query(`
          INSERT INTO promise (type, committed_by, committed_to, description, sla_start, status)
          VALUES ('followup', $1, $2, $3, NOW(), 'open')
          RETURNING *
        `, [
          JSON.stringify(committedBy),
          JSON.stringify({ role: 'supervisor' }),
          JSON.stringify({ cohort: 'child_absent', generatedFrom: sessionPromiseId }),
        ]);

        const promise = promiseRows[0];

        await client.query(`
          INSERT INTO followup_detail (promise_id, patient_id, cohort, round_date, generated_from)
          VALUES ($1, $2, 'child_absent', CURRENT_DATE + INTERVAL '7 days', $3)
        `, [promise.id, patient.local_id, sessionPromiseId]);

        created.push({
          promiseId: promise.id,
          patientId: patient.local_id,
          patientName: patient.name,
        });
      }

      await client.query('COMMIT');

      return reply.status(201).send({
        created: created.length,
        followups: created,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      fastify.log.error(err, 'Failed to generate child-absent follow-ups');
      return reply.status(500).send({ error: 'Failed to generate child-absent follow-ups' });
    } finally {
      client.release();
    }
  });
}

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export async function exportRoutes(fastify: FastifyInstance) {

  // ─── GET /exports/rch-csv ────────────────────────────────────
  // RCH-format register CSV scoped to ANM catchment (V11)
  fastify.get('/rch-csv', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { catchment } = request.query as any;

    if (!catchment) {
      return reply.status(422).send({ error: 'catchment query parameter is required' });
    }

    // Fetch patients + their referral/encounter data for the catchment
    const { rows } = await fastify.db.query(`
      SELECT
        pat.local_id, pat.name, pat.fuzzy_dob, pat.village, pat.gender,
        h.catchment_assignment,
        COUNT(DISTINCT e.id) AS encounter_count,
        COUNT(DISTINCT CASE WHEN p.type = 'referral' THEN p.id END) AS referral_count,
        COUNT(DISTINCT CASE WHEN p.type = 'referral' AND p.status = 'kept' THEN p.id END) AS referral_kept
      FROM patient pat
      JOIN household h ON h.household_id = pat.household_id
      LEFT JOIN encounter e ON e.patient_id = pat.local_id
      LEFT JOIN referral_detail rd ON rd.patient_id = pat.local_id
      LEFT JOIN promise p ON p.id = rd.promise_id
      WHERE h.catchment_assignment = $1
      GROUP BY pat.local_id, pat.name, pat.fuzzy_dob, pat.village, pat.gender, h.catchment_assignment
      ORDER BY pat.name
    `, [catchment]);

    // Build CSV
    const headers = [
      'Patient ID', 'Name', 'DOB', 'Village', 'Gender',
      'Catchment', 'Encounters', 'Referrals', 'Referrals Kept',
    ];
    const csvRows = rows.map(r => [
      r.local_id, r.name, r.fuzzy_dob || '', r.village, r.gender || '',
      r.catchment_assignment, r.encounter_count, r.referral_count, r.referral_kept,
    ].join(','));

    const csv = [headers.join(','), ...csvRows].join('\n');

    reply.header('Content-Type', 'text/csv');
    reply.header('Content-Disposition', `attachment; filename="rch_register_${catchment}.csv"`);
    return reply.send(csv);
  });

  // ─── GET /exports/ndjson ─────────────────────────────────────
  // FHIR NDJSON nightly export (district-scoped)
  fastify.get('/ndjson', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { since, type } = request.query as any;
    const sinceDate = since || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    let query = `
      SELECT p.*, pe.event_name, pe.ts AS event_ts, pe.payload AS event_payload
      FROM promise p
      LEFT JOIN promise_event pe ON pe.promise_id = p.id AND pe.ts > $1
      WHERE p.created_at > $1 OR pe.ts > $1
    `;
    const params: any[] = [sinceDate];
    let idx = 2;

    if (type) {
      query += ` AND p.type = $${idx++}`;
      params.push(type);
    }

    query += ' ORDER BY p.created_at, pe.ts';

    const { rows } = await fastify.db.query(query, params);

    // Convert to NDJSON (one JSON per line)
    const ndjson = rows.map(row => JSON.stringify({
      resourceType: 'Task',
      id: row.id,
      status: mapStatusToFhir(row.status),
      intent: 'order',
      code: { coding: [{ system: 'bharosa', code: row.type }] },
      authoredOn: row.created_at,
      lastModified: row.event_ts || row.created_at,
      meta: {
        promiseStatus: row.status,
        evidence: row.evidence,
        ladder: row.ladder,
      },
    })).join('\n');

    reply.header('Content-Type', 'application/ndjson');
    reply.header('Content-Disposition', 'attachment; filename="bharosa_export.ndjson"');
    return reply.send(ndjson);
  });
}

function mapStatusToFhir(status: string): string {
  const map: Record<string, string> = {
    open: 'requested',
    kept: 'completed',
    lapsed: 'failed',
    escalated: 'on-hold',
    reconciled: 'completed',
    closed_na: 'cancelled',
  };
  return map[status] || 'unknown';
}

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export async function metricRoutes(fastify: FastifyInstance) {

  // ─── GET /metrics ────────────────────────────────────────────
  // KPI formulas (plan §7) + baseline mode (V14)
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest) => {
    const { facility, baseline } = request.query as any;

    const baselineWeeks = parseInt(process.env.BASELINE_MODE_WEEKS || '4', 10);
    const baselineMode = baseline === 'true' || baseline === '1';

    // ── Referral completion rate ─────────────────────────────
    const { rows: refRows } = await fastify.pg.query(`
      SELECT
        COUNT(*) FILTER (WHERE status IN ('kept', 'reconciled')) AS completed,
        COUNT(*) FILTER (WHERE status != 'closed_na') AS total
      FROM promise
      WHERE type = 'referral'
        ${facility ? "AND committed_to->>'facilityId' = $1" : ''}
    `, facility ? [facility] : []);

    const refTotal = parseInt(refRows[0].total, 10) || 1;
    const referralCompletionRate = (parseInt(refRows[0].completed, 10) / refTotal) * 100;

    // ── Session-supply kept rate ─────────────────────────────
    const { rows: sessRows } = await fastify.pg.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'kept') AS kept,
        COUNT(*) AS total
      FROM promise
      WHERE type = 'vaccine_supply'
    `);

    const sessTotal = parseInt(sessRows[0].total, 10) || 1;
    const sessionSupplyKeptRate = (parseInt(sessRows[0].kept, 10) / sessTotal) * 100;

    // ── Consult SLA met rate ─────────────────────────────────
    const { rows: consultRows } = await fastify.pg.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'kept' AND evidence->>'capturedAt' IS NOT NULL) AS met,
        COUNT(*) AS total
      FROM promise
      WHERE type = 'consult'
    `);

    const consultTotal = parseInt(consultRows[0].total, 10) || 1;
    const consultSlaMet = (parseInt(consultRows[0].met, 10) / consultTotal) * 100;

    // ── Median time-to-arrival (referral) ────────────────────
    const { rows: arrivalRows } = await fastify.pg.query(`
      SELECT
        PERCENTILE_CONT(0.5) WITHIN GROUP (
          ORDER BY EXTRACT(EPOCH FROM (
            (evidence->>'capturedAt')::timestamptz - sla_start
          ))
        ) AS median_seconds
      FROM promise
      WHERE type = 'referral'
        AND status = 'kept'
        AND evidence->>'capturedAt' IS NOT NULL
        AND sla_start IS NOT NULL
    `);

    const medianTimeToArrival = arrivalRows[0]?.median_seconds
      ? parseFloat(arrivalRows[0].median_seconds) / 3600 : null;

    // ── Capture coverage mix ─────────────────────────────────
    const { rows: coverageRows } = await fastify.pg.query(`
      SELECT
        evidence->>'source' AS source,
        COUNT(*) AS count
      FROM promise
      WHERE type = 'referral' AND evidence IS NOT NULL
      GROUP BY evidence->>'source'
    `);

    const captureCoverage: Record<string, number> = {};
    for (const row of coverageRows) {
      captureCoverage[row.source] = parseInt(row.count, 10);
    }

    // ── Attested-vs-verified ratio ───────────────────────────
    const { rows: attestedRows } = await fastify.pg.query(`
      SELECT
        COUNT(*) FILTER (WHERE evidence->>'confidence' = 'reported') AS attested,
        COUNT(*) FILTER (WHERE evidence IS NOT NULL) AS total
      FROM promise
      WHERE status IN ('kept', 'reconciled')
    `);

    const attestedTotal = parseInt(attestedRows[0].total, 10) || 1;
    const attestedVsVerified = (parseInt(attestedRows[0].attested, 10) / attestedTotal) * 100;

    // ── Officer ack latency (p50/p90) ────────────────────────
    const { rows: ackRows } = await fastify.pg.query(`
      SELECT
        PERCENTILE_CONT(0.5) WITHIN GROUP (
          ORDER BY EXTRACT(EPOCH FROM (pe.ts - p.deadline))
        ) AS p50_seconds,
        PERCENTILE_CONT(0.9) WITHIN GROUP (
          ORDER BY EXTRACT(EPOCH FROM (pe.ts - p.deadline))
        ) AS p90_seconds
      FROM promise_event pe
      JOIN promise p ON p.id = pe.promise_id
      WHERE pe.event_name = 'ladder.rung_acked'
        AND p.deadline IS NOT NULL
    `);

    const ackLatencyP50 = ackRows[0]?.p50_seconds ? parseFloat(ackRows[0].p50_seconds) / 3600 : null;
    const ackLatencyP90 = ackRows[0]?.p90_seconds ? parseFloat(ackRows[0].p90_seconds) / 3600 : null;

    // ── Field-to-system lag ──────────────────────────────────
    const { rows: lagRows } = await fastify.pg.query(`
      SELECT
        PERCENTILE_CONT(0.5) WITHIN GROUP (
          ORDER BY EXTRACT(EPOCH FROM (sla_start - created_at))
        ) AS median_lag_seconds
      FROM promise
      WHERE sla_start IS NOT NULL AND created_at IS NOT NULL
    `);

    const fieldToSystemLag = lagRows[0]?.median_lag_seconds
      ? parseFloat(lagRows[0].median_lag_seconds) / 3600 : null;

    const computedAt = new Date();

    return {
      baselineMode,
      computedAt,
      kpis: [
        {
          name: 'Referral completion rate',
          value: Math.round(referralCompletionRate * 100) / 100,
          unit: 'percent',
          baselineMode,
          computedAt,
        },
        {
          name: 'Session-supply kept rate',
          value: Math.round(sessionSupplyKeptRate * 100) / 100,
          unit: 'percent',
          baselineMode,
          computedAt,
        },
        {
          name: 'Consult SLA met rate',
          value: Math.round(consultSlaMet * 100) / 100,
          unit: 'percent',
          baselineMode,
          computedAt,
        },
        {
          name: 'Median time-to-arrival',
          value: medianTimeToArrival ? Math.round(medianTimeToArrival * 100) / 100 : null,
          unit: 'hours',
          baselineMode,
          computedAt,
        },
        {
          name: 'Capture coverage mix',
          value: captureCoverage,
          unit: 'count',
          baselineMode,
          computedAt,
        },
        {
          name: 'Attested-vs-verified ratio',
          value: Math.round(attestedVsVerified * 100) / 100,
          unit: 'percent',
          baselineMode,
          computedAt,
        },
        {
          name: 'Officer ack latency (p50)',
          value: ackLatencyP50 ? Math.round(ackLatencyP50 * 100) / 100 : null,
          unit: 'hours',
          baselineMode,
          computedAt,
        },
        {
          name: 'Officer ack latency (p90)',
          value: ackLatencyP90 ? Math.round(ackLatencyP90 * 100) / 100 : null,
          unit: 'hours',
          baselineMode,
          computedAt,
        },
        {
          name: 'Field-to-system lag (median)',
          value: fieldToSystemLag ? Math.round(fieldToSystemLag * 100) / 100 : null,
          unit: 'hours',
          baselineMode,
          computedAt,
        },
      ],
    };
  });

  // ─── GET /metrics/referrals/count ────────────────────────────
  // Count badges for dashboard
  fastify.get('/referrals/count', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest) => {
    const { status } = request.query as any;

    let query = `
      SELECT
        COUNT(*) FILTER (WHERE status = 'open') AS pending,
        COUNT(*) FILTER (WHERE status = 'escalated') AS escalated,
        COUNT(*) FILTER (WHERE status = 'kept') AS kept,
        COUNT(*) AS total
      FROM promise
      WHERE type = 'referral'
    `;

    const { rows } = await fastify.pg.query(query);

    return {
      pending: parseInt(rows[0].pending, 10),
      escalated: parseInt(rows[0].escalated, 10),
      kept: parseInt(rows[0].kept, 10),
      total: parseInt(rows[0].total, 10),
    };
  });
}

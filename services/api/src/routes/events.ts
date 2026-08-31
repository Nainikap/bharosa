import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export async function eventsRoutes(fastify: FastifyInstance) {

  // ─── GET /events ──────────────────────────────────────────────
  // Get recent promise events (Audit logs)
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    // Fetch last 50 events
    const { rows } = await fastify.db.query(`
      SELECT e.id, e.promise_id, e.event_name, e.from_status, e.to_status, e.actor, e.ts, e.payload, p.type as promise_type
      FROM promise_event e
      LEFT JOIN promise p ON e.promise_id = p.id
      ORDER BY e.ts DESC LIMIT 50
    `);

    return { data: rows };
  });
}

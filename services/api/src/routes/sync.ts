import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export async function syncRoutes(fastify: FastifyInstance) {

  // --- POST /sync/push --------------------------------------
  // Upload device journal ops (priority-ordered)
  fastify.post('/push', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    const { lastSeq, ops } = request.body as any;

    if (!Array.isArray(ops)) {
      return reply.status(400).send({ error: 'ops must be an array' });
    }

    // Check seq conflict
    const { rows: cursorRows } = await fastify.db.query(
      'SELECT last_seq FROM sync_cursor WHERE device_id = $1',
      [user.deviceId]
    );

    if (cursorRows.length === 0) {
      return reply.status(401).send({ error: 'Device not registered for sync' });
    }

    const serverSeq = parseInt(cursorRows[0].last_seq, 10);
    if (lastSeq < serverSeq) {
      return reply.status(409).send({
        error: 'Sequence conflict - replay needed',
        serverSeq,
      });
    }

    const client = await fastify.db.connect();
    try {
      await client.query('BEGIN');

      const priorityOrder: Record<string, number> = {
        emergency: 0, referral: 1, consult: 2, followup: 3, analytics: 4,
      };
      const sortedOps = [...ops].sort(
        (a: any, b: any) => (priorityOrder[a.priority] || 4) - (priorityOrder[b.priority] || 4)
      );

      for (const op of sortedOps) {
        await client.query(`
          INSERT INTO sync_journal (table_name, op, row_id, data, device_id, priority)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [op.table, op.op, op.rowId, JSON.stringify(op.data), user.deviceId, op.priority || 'analytics']);

        if (op.table === 'promise' && op.op === 'insert') {
          const d = op.data;
          await client.query(`
            INSERT INTO promise (id, type, committed_by, committed_to, description, created_at, status, independence)
            VALUES ($1, $2, $3, $4, $5, $6, 'open', $7)
            ON CONFLICT (id) DO NOTHING
          `, [
            op.rowId, d.type,
            JSON.stringify(d.committedBy), JSON.stringify(d.committedTo),
            JSON.stringify(d.description), d.createdAt,
            d.independence || null,
          ]);

          await client.query(`
            UPDATE promise SET sla_start = datetime('now') WHERE id = $1 AND sla_start IS NULL
          `, [op.rowId]);

          const { rows: timeoutRows } = await client.query(`
            SELECT timeout_ms FROM evidence_timeout
            WHERE type = $1 AND subtype = COALESCE($2, 'default')
            ORDER BY district_id NULLS LAST LIMIT 1
          `, [d.type, d.subtype || 'default']);

          if (timeoutRows.length > 0 && timeoutRows[0].timeout_ms > 0) {
            await client.query(`
              UPDATE promise
              SET deadline = datetime(sla_start, '+' || ($1 / 1000.0) || ' seconds')
              WHERE id = $2 AND deadline IS NULL AND sla_start IS NOT NULL
            `, [timeoutRows[0].timeout_ms.toString(), op.rowId]);
          }
        }
      }

      const { rows: newSeqRows } = await client.query(
        "SELECT last_insert_rowid() AS seq"
      );
      const newSeq = parseInt(newSeqRows[0].seq, 10);

      await client.query(`
        UPDATE sync_cursor SET last_seq = $1, last_sync_at = datetime('now')
        WHERE device_id = $2
      `, [newSeq, user.deviceId]);

      await client.query('COMMIT');

      return { accepted: sortedOps.length, newSeq };
    } catch (err) {
      await client.query('ROLLBACK');
      fastify.log.error(err, 'Sync push failed');
      return reply.status(500).send({ error: 'Sync push failed' });
    } finally {
      client.release();
    }
  });

  // --- GET /sync/pull?since=seq -----------------------------
  fastify.get('/pull', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    const { since } = request.query as any;
    const sinceSeq = parseInt(since || '0', 10);

    const { rows: deltas } = await fastify.db.query(`
      SELECT seq, table_name, op, row_id, data, priority, ts
      FROM sync_journal
      WHERE seq > $1
      ORDER BY
        CASE priority
          WHEN 'emergency' THEN 0
          WHEN 'referral' THEN 1
          WHEN 'consult' THEN 2
          WHEN 'followup' THEN 3
          ELSE 4
        END,
        seq ASC
      LIMIT 500
    `, [sinceSeq]);

    const newSeq = deltas.length > 0
      ? parseInt(deltas[deltas.length - 1].seq, 10)
      : sinceSeq;

    return {
      deltas: deltas.map(d => ({
        seq: parseInt(d.seq, 10),
        table: d.table_name,
        op: d.op,
        rowId: d.row_id,
        data: d.data,
        priority: d.priority,
        ts: d.ts,
      })),
      newSeq,
    };
  });

  // --- GET /sync/health -------------------------------------
  fastify.get('/health', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest) => {
    const user = request.user;

    const { rows } = await fastify.db.query(`
      SELECT last_seq, last_sync_at FROM sync_cursor WHERE device_id = $1
    `, [user.deviceId]);

    const { rows: latestRows } = await fastify.db.query(
      "SELECT COALESCE(MAX(seq), 0) AS max_seq FROM sync_journal"
    );

    const lastSync = rows[0]?.last_sync_at || null;
    const deviceSeq = rows[0] ? parseInt(rows[0].last_seq, 10) : 0;
    const serverSeq = parseInt(latestRows[0].max_seq, 10);

    return {
      deviceId: user.deviceId,
      deviceSeq,
      serverSeq,
      lag: serverSeq - deviceSeq,
      lastSyncAt: lastSync,
    };
  });
}

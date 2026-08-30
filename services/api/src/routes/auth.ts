import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { hashPin, verifyPin } from '../plugins/auth';
import { JWT_ACCESS_TTL_SEC, JWT_REFRESH_TTL_SEC } from '@bharosa/shared-contracts';

export async function authRoutes(fastify: FastifyInstance) {

  // ─── POST /auth/device/register ──────────────────────────────
  // Bind a device PIN → issue refresh token (enrollment)
  fastify.post('/device/register', async (request: FastifyRequest, reply: FastifyReply) => {
    const { deviceId, pin, role, workerId, facilityId } = request.body as any;

    if (!deviceId || !pin || !role || !workerId) {
      return reply.status(400).send({ error: 'Missing required fields: deviceId, pin, role, workerId' });
    }

    // Check if device already exists
    const { rows: existing } = await fastify.db.query(
      'SELECT device_id FROM device WHERE device_id = $1', [deviceId]
    );
    if (existing.length > 0) {
      return reply.status(409).send({ error: 'Device already enrolled' });
    }

    const pinHash = await hashPin(pin);

    await fastify.db.query(`
      INSERT INTO device (device_id, pin_hash, role, worker_id, facility_id)
      VALUES ($1, $2, $3, $4, $5)
    `, [deviceId, pinHash, role, workerId, facilityId || null]);

    // Initialize sync cursor
    await fastify.db.query(`
      INSERT INTO sync_cursor (device_id, last_seq) VALUES ($1, 0)
    `, [deviceId]);

    // Issue tokens
    const accessToken = fastify.jwt.sign(
      { deviceId, role, workerId, facilityId },
      { expiresIn: JWT_ACCESS_TTL_SEC }
    );
    const refreshToken = fastify.jwt.sign(
      { deviceId, tokenVersion: 0 },
      { expiresIn: JWT_REFRESH_TTL_SEC }
    );

    return reply.status(201).send({
      accessToken,
      refreshToken,
      expiresIn: JWT_ACCESS_TTL_SEC,
    });
  });

  // ─── POST /auth/device/login ─────────────────────────────────
  // PIN → access + refresh JWT
  fastify.post('/device/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const { deviceId, pin } = request.body as any;

    if (!deviceId || !pin) {
      return reply.status(400).send({ error: 'Missing deviceId or pin' });
    }

    const { rows } = await fastify.db.query(
      'SELECT * FROM device WHERE device_id = $1', [deviceId]
    );
    if (rows.length === 0) {
      return reply.status(401).send({ error: 'Invalid device or pin' });
    }

    const device = rows[0];
    if (device.locked) {
      return reply.status(423).send({ error: 'Device is locked' });
    }

    const valid = await verifyPin(pin, device.pin_hash);
    if (!valid) {
      return reply.status(401).send({ error: 'Invalid device or pin' });
    }

    const accessToken = fastify.jwt.sign(
      { deviceId, role: device.role, workerId: device.worker_id, facilityId: device.facility_id },
      { expiresIn: JWT_ACCESS_TTL_SEC }
    );
    const refreshToken = fastify.jwt.sign(
      { deviceId, tokenVersion: device.token_version },
      { expiresIn: JWT_REFRESH_TTL_SEC }
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: JWT_ACCESS_TTL_SEC,
    };
  });

  // ─── POST /auth/refresh ──────────────────────────────────────
  // Rotate access token
  fastify.post('/refresh', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const payload = fastify.jwt.verify(request.body as any as string || '');
      const { deviceId, tokenVersion } = payload as any;

      const { rows } = await fastify.db.query(
        'SELECT * FROM device WHERE device_id = $1', [deviceId]
      );
      if (rows.length === 0 || rows[0].token_version !== tokenVersion) {
        return reply.status(401).send({ error: 'Invalid or expired refresh token' });
      }

      const device = rows[0];
      const accessToken = fastify.jwt.sign(
        { deviceId, role: device.role, workerId: device.worker_id, facilityId: device.facility_id },
        { expiresIn: JWT_ACCESS_TTL_SEC }
      );

      return { accessToken, expiresIn: JWT_ACCESS_TTL_SEC };
    } catch {
      return reply.status(401).send({ error: 'Invalid or expired refresh token' });
    }
  });
}

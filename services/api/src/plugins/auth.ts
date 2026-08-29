import fp from 'fastify-plugin';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    verifyHmac: (token: string, promiseId: string) => boolean;
    generateHmac: (promiseId: string) => string;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      deviceId: string;
      role?: string;
      workerId?: string;
      facilityId?: string;
      tokenVersion?: number;
    };
    user: {
      deviceId: string;
      role: string;
      workerId: string;
      facilityId?: string;
    };
  }
}

async function authPluginFn(fastify: FastifyInstance) {
  const hmacSecret = process.env.HMAC_DEEPLINK_SECRET || 'hmac-dev-secret';

  // ─── JWT authentication decorator ────────────────────────────
  fastify.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({ error: 'Unauthorized', message: 'Invalid or expired token' });
    }
  });

  // ─── HMAC deep-link token generation (for officer ack) ───────
  fastify.decorate('generateHmac', function (promiseId: string): string {
    const expiry = Math.floor(Date.now() / 1000) + (parseInt(process.env.DEEPLINK_TTL || '900', 10));
    const payload = `${promiseId}:${expiry}`;
    const sig = crypto
      .createHmac('sha256', hmacSecret)
      .update(payload)
      .digest('hex');
    // Return base64url of payload:sig
    return Buffer.from(`${payload}:${sig}`).toString('base64url');
  });

  // ─── HMAC verification ───────────────────────────────────────
  fastify.decorate('verifyHmac', function (token: string, promiseId: string): boolean {
    try {
      const decoded = Buffer.from(token, 'base64url').toString();
      const parts = decoded.split(':');
      if (parts.length !== 3) return false;
      const [tokenPromiseId, expiryStr, sig] = parts;
      if (tokenPromiseId !== promiseId) return false;
      const expiry = parseInt(expiryStr, 10);
      if (Date.now() / 1000 > expiry) return false;
      const expected = crypto
        .createHmac('sha256', hmacSecret)
        .update(`${tokenPromiseId}:${expiryStr}`)
        .digest('hex');
      return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    } catch {
      return false;
    }
  });
}

/**
 * Hash a device PIN (for storage). Uses scrypt.
 */
export function hashPin(pin: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(pin, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

/**
 * Verify a device PIN against a stored hash.
 */
export function verifyPin(pin: string, stored: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [salt, hash] = stored.split(':');
    crypto.scrypt(pin, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(crypto.timingSafeEqual(Buffer.from(hash, 'hex'), derivedKey));
    });
  });
}

export const authPlugin = fp(authPluginFn, {
  name: 'auth',
  dependencies: ['db'],
});

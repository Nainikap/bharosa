import Fastify from 'fastify';
import cors from '@fastify/cors';
import fjwt from '@fastify/jwt';
import dotenv from 'dotenv';
import { dbPlugin } from './plugins/db';
import { authPlugin } from './plugins/auth';
import { schedulerPlugin } from './scheduler';
import { authRoutes } from './routes/auth';
import { syncRoutes } from './routes/sync';
import { promiseRoutes } from './routes/promises';
import { referralRoutes } from './routes/referrals';
import { sessionRoutes } from './routes/sessions';
import { captureRoutes } from './routes/capture';
import { consultRoutes } from './routes/consults';
import { taskRoutes } from './routes/tasks';
import { exportRoutes } from './routes/exports';
import { metricRoutes } from './routes/metrics';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function buildApp() {
  const app = Fastify({
    logger: {
      level: 'info',
      transport: {
        target: 'pino-pretty',
        options: { colorize: true },
      },
    },
  });

  // ─── Global plugins ──────────────────────────────────────────
  await app.register(cors, { origin: true });

  await app.register(fjwt, {
    secret: process.env.JWT_SECRET || 'dev-secret-change-me',
  });

  // ─── Database ─────────────────────────────────────────────────
  await app.register(dbPlugin);

  // ─── Auth decorator ───────────────────────────────────────────
  await app.register(authPlugin);

  // ─── Scheduler (in-memory setInterval) ─────────────────────────
  await app.register(schedulerPlugin);

  // ─── Health check ─────────────────────────────────────────────
  app.get('/api/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: 'v1.0.0',
  }));

  // ─── API Routes ───────────────────────────────────────────────
  await app.register(authRoutes,     { prefix: '/api/auth' });
  await app.register(syncRoutes,     { prefix: '/api/sync' });
  await app.register(promiseRoutes,  { prefix: '/api/promises' });
  await app.register(referralRoutes, { prefix: '/api/referrals' });
  await app.register(sessionRoutes,  { prefix: '/api/sessions' });
  await app.register(captureRoutes,  { prefix: '/api/capture' });
  await app.register(consultRoutes,  { prefix: '/api/consults' });
  await app.register(taskRoutes,     { prefix: '/api/tasks' });
  await app.register(exportRoutes,   { prefix: '/api/exports' });
  await app.register(metricRoutes,   { prefix: '/api/metrics' });

  return app;
}

async function start() {
  const app = await buildApp();

  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`Bharosa API listening on http://${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();

export { buildApp };

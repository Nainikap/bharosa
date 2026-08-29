import fp from 'fastify-plugin';
import { Pool } from 'pg';
import { FastifyInstance } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    pg: Pool;
  }
}

async function dbPluginFn(fastify: FastifyInstance) {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://bharosa:bharosa_dev@localhost:5432/bharosa',
    max: 20,
  });

  // Test connection
  const client = await pool.connect();
  fastify.log.info('PostgreSQL connected');
  client.release();

  fastify.decorate('pg', pool);

  fastify.addHook('onClose', async () => {
    await pool.end();
  });
}

export const dbPlugin = fp(dbPluginFn, {
  name: 'db',
});

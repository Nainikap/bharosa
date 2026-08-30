import fp from 'fastify-plugin';
import Database from 'better-sqlite3';
import { FastifyInstance } from 'fastify';
import { sqliteSchema } from './schema';

// Helper to polyfill the pg API
export interface SQLitePolyfill {
  query: (sql: string, params?: any[]) => Promise<{ rows: any[] }>;
  connect: () => Promise<{
    query: (sql: string, params?: any[]) => Promise<{ rows: any[] }>;
    release: () => void;
  }>;
  sqliteDb: Database.Database;
}

declare module 'fastify' {
  interface FastifyInstance {
    db: SQLitePolyfill;
    pg: SQLitePolyfill;
  }
}

function translateSql(sql: string): { sqliteSql: string; } {
  let sqliteSql = sql;

  // 1. Convert $1, $2, etc. to ?
  sqliteSql = sqliteSql.replace(/\$\d+/g, '?');

  // 2. Convert NOW() to datetime('now')
  sqliteSql = sqliteSql.replace(/\bNOW\(\)/gi, "datetime('now')");

  // 3. Convert gen_random_uuid() to a hex-based UUID v4
  sqliteSql = sqliteSql.replace(
    /gen_random_uuid\(\)/gi,
    "(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))"
  );

  return { sqliteSql };
}

async function dbPluginFn(fastify: FastifyInstance) {
  const dbFile = process.env.DATABASE_URL?.replace('sqlite://', '') || './database.sqlite';

  const sqliteDb = new Database(dbFile);

  // Enable foreign keys and WAL mode for better concurrency
  sqliteDb.pragma('foreign_keys = ON');
  sqliteDb.pragma('journal_mode = WAL');

  // Initialize schema
  sqliteDb.exec(sqliteSchema);

  fastify.log.info('SQLite connected and schema initialized');

  const queryPolyfill = async (sql: string, params: any[] = []): Promise<{ rows: any[] }> => {
    const { sqliteSql } = translateSql(sql);

    const trimmed = sqliteSql.trim().toUpperCase();
    const isSelect = trimmed.startsWith('SELECT') || trimmed.startsWith('WITH');
    const isReturning = trimmed.includes('RETURNING');

    try {
      if (isSelect || isReturning) {
        const stmt = sqliteDb.prepare(sqliteSql);
        const rows = stmt.all(...params);
        return { rows };
      } else {
        const stmt = sqliteDb.prepare(sqliteSql);
        stmt.run(...params);
        return { rows: [] };
      }
    } catch (err: any) {
      fastify.log.error({ sql: sqliteSql, params, err: err.message }, 'SQLite query error');
      throw err;
    }
  };

  const polyfill: SQLitePolyfill = {
    sqliteDb,
    query: queryPolyfill,
    connect: async () => {
      return {
        query: queryPolyfill,
        release: () => {} // no-op
      };
    }
  };

  fastify.decorate('db', polyfill);
  fastify.decorate('pg', polyfill); // backward compat alias

  fastify.addHook('onClose', async () => {
    sqliteDb.close();
  });
}

export const dbPlugin = fp(dbPluginFn, {
  name: 'db',
});

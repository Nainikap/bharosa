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

  // Ensure demo data exists for the field app demo
  sqliteDb.exec(`
    INSERT INTO household (household_id, catchment_assignment, landmark_descriptor, members)
    VALUES ('hh-001', 'phc-alpha', 'Near big banyan tree', '[]')
    ON CONFLICT(household_id) DO NOTHING;

    INSERT INTO patient (local_id, name, village, household_id, gender)
    VALUES ('pt-001', 'Aarav Kumar', 'Rampur', 'hh-001', 'male')
    ON CONFLICT(local_id) DO NOTHING;

    INSERT INTO patient (local_id, name, village, household_id, gender)
    VALUES ('pt-002', 'Sunita Devi', 'Sitapur', 'hh-001', 'female')
    ON CONFLICT(local_id) DO NOTHING;
  `);

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

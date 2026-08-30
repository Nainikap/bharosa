import fp from 'fastify-plugin';
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { FastifyInstance } from 'fastify';
import { sqliteSchema } from './schema';

// Helper to polyfill the pg API
export interface SQLitePolyfill {
  query: (sql: string, params?: any[]) => Promise<{ rows: any[] }>;
  connect: () => Promise<{
    query: (sql: string, params?: any[]) => Promise<{ rows: any[] }>;
    release: () => void;
  }>;
  sqliteDb: Database;
}

declare module 'fastify' {
  interface FastifyInstance {
    db: SQLitePolyfill;
    // We keep pg here as an alias to avoid breaking things we missed, 
    // but the task involves replacing fastify.pg with fastify.db.
    pg: SQLitePolyfill;
  }
}

async function dbPluginFn(fastify: FastifyInstance) {
  const dbFile = process.env.DATABASE_URL?.replace('sqlite://', '') || './database.sqlite';
  
  const sqliteDb = await open({
    filename: dbFile,
    driver: sqlite3.Database
  });

  // Enable foreign keys and WAL mode for better concurrency
  await sqliteDb.exec('PRAGMA foreign_keys = ON');
  await sqliteDb.exec('PRAGMA journal_mode = WAL');

  // Initialize schema
  await sqliteDb.exec(sqliteSchema);

  fastify.log.info('SQLite connected and schema initialized');

  const queryPolyfill = async (sql: string, params: any[] = []) => {
    // Dynamically translate some common Postgres syntax to SQLite
    
    // 1. Convert $1, $2, etc. to ?
    let sqliteSql = sql.replace(/\$\d+/g, '?');
    
    // 2. Convert NOW() to datetime('now')
    sqliteSql = sqliteSql.replace(/\bNOW\(\)/gi, "datetime('now')");
    
    // 3. Convert gen_random_uuid() to SQLite compatible UUID generation (v4-ish random hex)
    sqliteSql = sqliteSql.replace(/gen_random_uuid\(\)/gi, "(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))");

    const rows = await sqliteDb.all(sqliteSql, params);
    return { rows };
  };

  const polyfill: SQLitePolyfill = {
    sqliteDb,
    query: queryPolyfill,
    connect: async () => {
      // In SQLite node driver, we don't have true connection pooling in the same way,
      // and transactions are a bit tricky if they interleave.
      // For polyfill purposes, we just return the query executor.
      // (Note: Concurrent transactions in SQLite can cause SQLITE_BUSY, 
      // but we handle typical fastify-pg usage here).
      return {
        query: queryPolyfill,
        release: () => {} // no-op
      };
    }
  };

  fastify.decorate('db', polyfill);
  fastify.decorate('pg', polyfill); // For backward compatibility during migration

  fastify.addHook('onClose', async () => {
    await sqliteDb.close();
  });
}

export const dbPlugin = fp(dbPluginFn, {
  name: 'db',
});

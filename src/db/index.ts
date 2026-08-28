import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

declare global {
  var _postgresPool: Pool | undefined;
}

export const createPool = () => {
  if (!global._postgresPool) {
    const user = process.env.SQL_ADMIN_USER || process.env.SQL_USER;
    const password = process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD;
    const host = process.env.SQL_HOST || '127.0.0.1';
    const database = process.env.SQL_DB_NAME;
    const port = Number(process.env.SQL_PORT) || 5432;

    global._postgresPool = new Pool({
      host,
      port,
      user,
      password,
      database,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 3000,
    });

    global._postgresPool.on('error', (err: any) => {
      const errMsg = err?.message || String(err);
      if (
        errMsg.includes('Connection terminated unexpectedly') ||
        errMsg.includes('ECONNRESET') ||
        errMsg.includes('EPIPE') ||
        err?.code === 'ECONNRESET' ||
        err?.code === '57P01'
      ) {
        console.warn('[DB Pool] Idle client disconnected (managed by pool).');
      } else {
        console.error('[DB Pool] Unexpected error on SQL client:', err);
      }
    });
  }
  return global._postgresPool;
};

const pool = createPool();

export const db = drizzle(pool, { schema });

/**
 * Ensures database schema tables, columns, and indexes are updated.
 * Automatically migrates any legacy plaintext passwords to secure scrypt hashes.
 */
export async function initializeDatabaseSchema() {
  try {
    const client = await pool.connect();
    try {
      // 1. Ensure password_hash column exists on users
      await client.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE NOT NULL;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' NOT NULL;
        ALTER TABLE news ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published' NOT NULL;
        
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(LOWER(email));
        CREATE INDEX IF NOT EXISTS idx_users_uid ON users(uid);
        CREATE INDEX IF NOT EXISTS idx_news_status ON news(status);
        CREATE INDEX IF NOT EXISTS idx_comments_news_id ON comments(news_id);
        CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON email_verifications(LOWER(email));
      `);

      // 2. Migrate any existing plaintext passwords to scrypt hashes
      const res = await client.query(`SELECT id, password FROM users WHERE password IS NOT NULL AND password_hash IS NULL;`);
      if (res.rows && res.rows.length > 0) {
        const { hashPasswordSync } = await import('../../server/security/passwords.ts');
        for (const row of res.rows) {
          if (row.password && typeof row.password === 'string') {
            const hash = hashPasswordSync(row.password);
            await client.query(`UPDATE users SET password_hash = $1, password = NULL WHERE id = $2;`, [hash, row.id]);
          }
        }
        console.log(`[DB Migration] Migrated ${res.rows.length} legacy user password(s) to scrypt hashes.`);
      }
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.warn('[DB Migration Warning] Schema check/migration notice:', err?.message || err);
  }
}

/**
 * Executes a database operation with automatic retries for transient connection dropouts.
 */
export async function withDbRetry<T>(fn: () => Promise<T>, maxRetries = 3, delayMs = 250): Promise<T> {
  let lastError: any;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const errMsg = err?.message || String(err);
      const isTransient =
        errMsg.includes('Connection terminated unexpectedly') ||
        errMsg.includes('ECONNRESET') ||
        errMsg.includes('EPIPE') ||
        errMsg.includes('Connection closed') ||
        errMsg.includes('timeout') ||
        errMsg.includes('closed the connection') ||
        err?.code === 'ECONNRESET' ||
        err?.code === '57P01';

      if (isTransient && attempt < maxRetries) {
        console.warn(`[DB Retry] Transient error on attempt ${attempt}/${maxRetries}. Retrying in ${delayMs * attempt}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}


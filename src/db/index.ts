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
 * Ensures database schema tables, columns, constraints, and indexes are created and updated.
 * Execution order:
 * 1. Base Independent Tables (users, categories, leagues, teams, contest_settings, standings_cache, email_verifications)
 * 2. Primary Dependent Tables (matches, news, activity_logs, contest_participants)
 * 3. Secondary Dependent Tables (comments, prediction_matches)
 * 4. Prediction Records Tables (predictions, prediction_points)
 * 5. Idempotent Column Additions & Constraints Migration
 * 6. Indexes & Password Migration
 */
export async function initializeDatabaseSchema() {
  let client;
  try {
    client = await pool.connect();
  } catch (connErr: any) {
    console.warn('[DB Initialization] Could not acquire pool client during startup:', connErr?.message || connErr);
    return;
  }

  try {
    // 0. Attempt to grant schema usage if current user has grant authority
    try {
      await client.query(`GRANT ALL ON SCHEMA public TO CURRENT_USER;`);
    } catch {
      // Non-fatal if current user doesn't have grant rights
    }

    // 1. Run DDL schema creation statements
    try {
      await client.query(`
        -- Base Tables (No Foreign Key Dependencies)
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          uid TEXT NOT NULL UNIQUE,
          email TEXT NOT NULL,
          password TEXT,
          password_hash TEXT,
          name TEXT NOT NULL,
          avatar TEXT,
          is_admin BOOLEAN DEFAULT FALSE,
          role TEXT DEFAULT 'user' NOT NULL,
          permissions TEXT[] DEFAULT ARRAY[]::TEXT[],
          is_active BOOLEAN DEFAULT TRUE NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS categories (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          slug TEXT NOT NULL UNIQUE,
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS leagues (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          logo TEXT
        );

        CREATE TABLE IF NOT EXISTS teams (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          logo TEXT
        );

        CREATE TABLE IF NOT EXISTS contest_settings (
          id SERIAL PRIMARY KEY,
          name TEXT DEFAULT 'مسابقة توقعات KoraNews' NOT NULL,
          description TEXT DEFAULT 'توقع نتائج المباريات وتصدر الترتيب العام واكسب النقاط!' NOT NULL,
          registration_start_date TIMESTAMP,
          registration_end_date TIMESTAMP,
          predictions_start_date TIMESTAMP,
          contest_end_date TIMESTAMP,
          status TEXT DEFAULT 'active' NOT NULL,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL
        );

        CREATE TABLE IF NOT EXISTS standings_cache (
          league_id TEXT PRIMARY KEY,
          season TEXT DEFAULT '2026' NOT NULL,
          data JSONB NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL
        );

        CREATE TABLE IF NOT EXISTS email_verifications (
          id SERIAL PRIMARY KEY,
          email TEXT NOT NULL,
          code_hash TEXT NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          attempts INTEGER DEFAULT 0 NOT NULL,
          last_sent_at TIMESTAMP DEFAULT NOW() NOT NULL,
          verified BOOLEAN DEFAULT FALSE NOT NULL,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        );

        -- Level 1 Dependent Tables
        CREATE TABLE IF NOT EXISTS news (
          id SERIAL PRIMARY KEY,
          title TEXT NOT NULL,
          excerpt TEXT,
          content TEXT NOT NULL,
          image TEXT,
          category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
          author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          views INTEGER DEFAULT 0,
          is_featured BOOLEAN DEFAULT FALSE,
          is_breaking BOOLEAN DEFAULT FALSE,
          status TEXT DEFAULT 'published' NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS matches (
          id TEXT PRIMARY KEY,
          league_id TEXT REFERENCES leagues(id) ON DELETE SET NULL,
          home_team_id TEXT REFERENCES teams(id) ON DELETE SET NULL,
          away_team_id TEXT REFERENCES teams(id) ON DELETE SET NULL,
          home_score INTEGER,
          away_score INTEGER,
          status TEXT NOT NULL,
          match_time TEXT,
          match_date TIMESTAMP NOT NULL,
          source TEXT,
          updated_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS activity_logs (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          action TEXT NOT NULL,
          entity_type TEXT NOT NULL,
          entity_id TEXT,
          details JSONB,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        );

        CREATE TABLE IF NOT EXISTS contest_participants (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          contest_id INTEGER REFERENCES contest_settings(id) ON DELETE SET NULL,
          status TEXT DEFAULT 'pending' NOT NULL,
          applied_at TIMESTAMP DEFAULT NOW() NOT NULL,
          reviewed_at TIMESTAMP,
          reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          notes TEXT,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL
        );

        -- Level 2 Dependent Tables
        CREATE TABLE IF NOT EXISTS comments (
          id SERIAL PRIMARY KEY,
          content TEXT NOT NULL,
          news_id INTEGER NOT NULL REFERENCES news(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT NOW()
        );

        -- Prediction Matches (match_id is explicitly NULLABLE to support custom/external matches)
        CREATE TABLE IF NOT EXISTS prediction_matches (
          id SERIAL PRIMARY KEY,
          match_id TEXT REFERENCES matches(id) ON DELETE SET NULL,
          contest_id INTEGER REFERENCES contest_settings(id) ON DELETE SET NULL,
          external_match_id TEXT,
          is_external BOOLEAN DEFAULT FALSE NOT NULL,
          custom_league_name TEXT,
          custom_league_logo TEXT,
          custom_home_name TEXT,
          custom_home_logo TEXT,
          custom_away_name TEXT,
          custom_away_logo TEXT,
          custom_home_score INTEGER,
          custom_away_score INTEGER,
          custom_match_date TIMESTAMP,
          custom_status TEXT,
          points_per_match INTEGER DEFAULT 2 NOT NULL,
          is_active BOOLEAN DEFAULT TRUE NOT NULL,
          is_calculated BOOLEAN DEFAULT FALSE NOT NULL,
          calculated_at TIMESTAMP,
          is_confirmed_by_admin BOOLEAN DEFAULT FALSE NOT NULL,
          confirmed_at TIMESTAMP,
          confirmed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL
        );

        -- Predictions Table
        CREATE TABLE IF NOT EXISTS predictions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          prediction_match_id INTEGER NOT NULL REFERENCES prediction_matches(id) ON DELETE CASCADE,
          contest_id INTEGER REFERENCES contest_settings(id) ON DELETE SET NULL,
          home_score INTEGER NOT NULL,
          away_score INTEGER NOT NULL,
          points_earned INTEGER DEFAULT 0 NOT NULL,
          is_evaluated BOOLEAN DEFAULT FALSE NOT NULL,
          is_golden BOOLEAN DEFAULT FALSE NOT NULL,
          golden_points INTEGER DEFAULT 0 NOT NULL,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
          CONSTRAINT uq_user_prediction_match UNIQUE(user_id, prediction_match_id)
        );

        -- Points Ledger Table
        CREATE TABLE IF NOT EXISTS prediction_points (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          prediction_id INTEGER NOT NULL UNIQUE REFERENCES predictions(id) ON DELETE CASCADE,
          prediction_match_id INTEGER NOT NULL REFERENCES prediction_matches(id) ON DELETE CASCADE,
          contest_id INTEGER REFERENCES contest_settings(id) ON DELETE SET NULL,
          points INTEGER DEFAULT 2 NOT NULL,
          is_golden_bonus BOOLEAN DEFAULT FALSE NOT NULL,
          reason TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        );

        -- 2. Idempotent Column Additions (Ensures schema consistency without data loss)
        ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE NOT NULL;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' NOT NULL;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions TEXT[] DEFAULT ARRAY[]::TEXT[];
        ALTER TABLE news ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published' NOT NULL;

        -- Ensure prediction_matches columns
        ALTER TABLE prediction_matches ADD COLUMN IF NOT EXISTS points_per_match INTEGER DEFAULT 2 NOT NULL;
        ALTER TABLE prediction_matches ADD COLUMN IF NOT EXISTS external_match_id TEXT;
        ALTER TABLE prediction_matches ADD COLUMN IF NOT EXISTS is_external BOOLEAN DEFAULT FALSE NOT NULL;
        ALTER TABLE prediction_matches ADD COLUMN IF NOT EXISTS custom_league_name TEXT;
        ALTER TABLE prediction_matches ADD COLUMN IF NOT EXISTS custom_league_logo TEXT;
        ALTER TABLE prediction_matches ADD COLUMN IF NOT EXISTS custom_home_name TEXT;
        ALTER TABLE prediction_matches ADD COLUMN IF NOT EXISTS custom_home_logo TEXT;
        ALTER TABLE prediction_matches ADD COLUMN IF NOT EXISTS custom_away_name TEXT;
        ALTER TABLE prediction_matches ADD COLUMN IF NOT EXISTS custom_away_logo TEXT;
        ALTER TABLE prediction_matches ADD COLUMN IF NOT EXISTS custom_home_score INTEGER;
        ALTER TABLE prediction_matches ADD COLUMN IF NOT EXISTS custom_away_score INTEGER;
        ALTER TABLE prediction_matches ADD COLUMN IF NOT EXISTS custom_match_date TIMESTAMP;
        ALTER TABLE prediction_matches ADD COLUMN IF NOT EXISTS custom_status TEXT;
        ALTER TABLE prediction_matches ADD COLUMN IF NOT EXISTS is_confirmed_by_admin BOOLEAN DEFAULT FALSE NOT NULL;
        ALTER TABLE prediction_matches ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP;
        ALTER TABLE prediction_matches ADD COLUMN IF NOT EXISTS confirmed_by INTEGER REFERENCES users(id);
        ALTER TABLE prediction_matches ADD COLUMN IF NOT EXISTS contest_id INTEGER REFERENCES contest_settings(id);

        -- Drop NOT NULL constraint on prediction_matches.match_id if present from an older schema
        DO $$
        BEGIN
          ALTER TABLE prediction_matches ALTER COLUMN match_id DROP NOT NULL;
        EXCEPTION
          WHEN OTHERS THEN NULL;
        END $$;

        -- Safely drop legacy single-column UNIQUE(user_id) constraint on contest_participants to support future multi-contest architecture
        DO $$
        BEGIN
          ALTER TABLE contest_participants DROP CONSTRAINT IF EXISTS contest_participants_user_id_unique;
          ALTER TABLE contest_participants DROP CONSTRAINT IF EXISTS uq_contest_user;
        EXCEPTION
          WHEN OTHERS THEN NULL;
        END $$;

        -- Ensure predictions columns
        ALTER TABLE predictions ADD COLUMN IF NOT EXISTS is_golden BOOLEAN DEFAULT FALSE NOT NULL;
        ALTER TABLE predictions ADD COLUMN IF NOT EXISTS golden_points INTEGER DEFAULT 0 NOT NULL;
        ALTER TABLE predictions ADD COLUMN IF NOT EXISTS contest_id INTEGER REFERENCES contest_settings(id);

        -- Ensure prediction_points columns
        ALTER TABLE prediction_points ADD COLUMN IF NOT EXISTS is_golden_bonus BOOLEAN DEFAULT FALSE NOT NULL;
        ALTER TABLE prediction_points ADD COLUMN IF NOT EXISTS contest_id INTEGER REFERENCES contest_settings(id);

        -- Ensure contest_participants columns
        ALTER TABLE contest_participants ADD COLUMN IF NOT EXISTS contest_id INTEGER REFERENCES contest_settings(id);

        -- 3. Create all performance, lookup, and uniqueness indexes
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(LOWER(email));
        CREATE INDEX IF NOT EXISTS idx_users_uid ON users(uid);
        CREATE INDEX IF NOT EXISTS idx_news_status ON news(status);
        CREATE INDEX IF NOT EXISTS idx_news_category_id ON news(category_id);
        CREATE INDEX IF NOT EXISTS idx_news_author_id ON news(author_id);
        CREATE INDEX IF NOT EXISTS idx_comments_news_id ON comments(news_id);
        CREATE INDEX IF NOT EXISTS idx_matches_league_id ON matches(league_id);
        CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(match_date);
        CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON email_verifications(LOWER(email));

        CREATE INDEX IF NOT EXISTS idx_contest_settings_status ON contest_settings(status);
        CREATE INDEX IF NOT EXISTS idx_contest_participants_user_id ON contest_participants(user_id);
        CREATE INDEX IF NOT EXISTS idx_contest_participants_contest_id ON contest_participants(contest_id);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_contest_participants_contest_user ON contest_participants(contest_id, user_id);

        CREATE INDEX IF NOT EXISTS idx_prediction_matches_match_id ON prediction_matches(match_id);
        CREATE INDEX IF NOT EXISTS idx_prediction_matches_contest_id ON prediction_matches(contest_id);
        CREATE INDEX IF NOT EXISTS idx_prediction_matches_is_active ON prediction_matches(is_active);

        CREATE INDEX IF NOT EXISTS idx_predictions_user_id ON predictions(user_id);
        CREATE INDEX IF NOT EXISTS idx_predictions_prediction_match_id ON predictions(prediction_match_id);
        CREATE INDEX IF NOT EXISTS idx_predictions_contest_id ON predictions(contest_id);

        CREATE INDEX IF NOT EXISTS idx_prediction_points_user_id ON prediction_points(user_id);
        CREATE INDEX IF NOT EXISTS idx_prediction_points_match_id ON prediction_points(prediction_match_id);
        CREATE INDEX IF NOT EXISTS idx_prediction_points_contest_id ON prediction_points(contest_id);

        -- Safe backward compatibility backfill for legacy rows created before contest_id was introduced
        DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM contest_settings WHERE id = 1) THEN
            UPDATE contest_participants SET contest_id = 1 WHERE contest_id IS NULL;
            UPDATE prediction_matches SET contest_id = 1 WHERE contest_id IS NULL;
            UPDATE predictions SET contest_id = 1 WHERE contest_id IS NULL;
            UPDATE prediction_points SET contest_id = 1 WHERE contest_id IS NULL;
          END IF;
        END $$;
      `);
    } catch (ddlErr: any) {
      console.warn('[DB Migration Warning] DDL schema initialization encountered an issue:', ddlErr?.message || ddlErr);
    }

    // 4. Migrate any legacy plaintext passwords to scrypt hashes
    try {
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
    } catch (migErr: any) {
      console.warn('[DB Migration Warning] Password migration skipped:', migErr?.message || migErr);
    }
  } catch (err: any) {
    console.error('[DB Migration Error] Non-fatal schema initialization warning:', err?.message || err);
  } finally {
    if (client) {
      client.release();
    }
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


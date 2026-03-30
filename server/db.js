// ═══════════════════════════════════════
//  SatsParty — Database (PostgreSQL via Neon)
//  Works on Vercel serverless + local dev
// ═══════════════════════════════════════

import { neon } from "@neondatabase/serverless";

let _db = null;
let _initPromise = null;

/**
 * Convert SQLite-style ? placeholders to PostgreSQL $1, $2, ...
 */
function convertPlaceholders(sql) {
  // If query already uses $1-style placeholders, don't convert
  if (/\$\d/.test(sql)) return sql;
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

/**
 * Initialize the database (async, cached).
 * Returns a wrapper with better-sqlite3-compatible API.
 */
export async function initDB() {
  if (_db) return _db;
  if (_initPromise) return _initPromise;

  _initPromise = _initDBInternal();
  _db = await _initPromise;
  return _db;
}

async function _initDBInternal() {
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL or POSTGRES_URL environment variable is required. " +
      "Create a free Neon database at https://neon.tech and set the connection string."
    );
  }

  const sql = neon(databaseUrl);

  // Run migrations
  await migrate(sql);

  console.log("✓ Database ready (PostgreSQL via Neon)");

  return createWrapper(sql);
}

/**
 * Create a wrapper with better-sqlite3-compatible API
 * so all existing route code works with MINIMAL changes.
 *
 * Key difference: all methods are now ASYNC (return promises).
 * Routes must use: await db.prepare("...").get(...)
 *
 * Uses sql.query() for parameterized queries (not tagged templates).
 */
function createWrapper(sql) {
  const wrapper = {
    prepare(query) {
      const pgQuery = convertPlaceholders(query);

      return {
        /**
         * Get a single row: await .get(param1, param2, ...)
         */
        async get(...params) {
          try {
            const rows = await sql.query(pgQuery, params);
            return rows[0] || undefined;
          } catch (err) {
            console.error("DB get error:", err.message, pgQuery);
            return undefined;
          }
        },

        /**
         * Get all rows: await .all(param1, param2, ...)
         */
        async all(...params) {
          try {
            return await sql.query(pgQuery, params);
          } catch (err) {
            console.error("DB all error:", err.message, pgQuery);
            return [];
          }
        },

        /**
         * Execute a write: await .run(param1, param2, ...)
         * Returns { changes, lastInsertRowid }
         */
        async run(...params) {
          try {
            const result = await sql.query(pgQuery, params);
            // For INSERT with RETURNING, the id is in the first row
            const lastInsertRowid = result[0]?.id || 0;
            const changes = result.length || 0;
            return { changes, lastInsertRowid };
          } catch (err) {
            console.error("DB run error:", err.message, pgQuery);
            throw err;
          }
        },
      };
    },

    async exec(query) {
      try {
        await sql.query(query);
      } catch (err) {
        console.error("DB exec error:", err.message);
      }
    },

    pragma(_str) {
      // No-op: PostgreSQL doesn't use PRAGMA
    },
  };

  return wrapper;
}

/**
 * Database migrations (PostgreSQL syntax)
 * Uses tagged template for schema DDL (no params needed)
 */
async function migrate(sql) {
  // Create tables one by one (Neon tagged templates don't support multi-statement)
  await sql`
    CREATE TABLE IF NOT EXISTS admins (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS events (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      date TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      welcome_sats INTEGER DEFAULT 100,
      max_attendees INTEGER DEFAULT 100,
      alby_hub_url TEXT NOT NULL,
      alby_auth_token TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS attendees (
      id SERIAL PRIMARY KEY,
      event_id INTEGER NOT NULL REFERENCES events(id),
      token TEXT UNIQUE NOT NULL,
      display_name TEXT,
      nwc_url TEXT,
      alby_app_id INTEGER,
      lightning_address TEXT,
      wallet_pubkey TEXT,
      balance_sats INTEGER DEFAULT 0,
      welcome_funded INTEGER DEFAULT 0,
      missions_completed TEXT DEFAULT '[]',
      onboarding_complete INTEGER DEFAULT 0,
      ip_hash TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      last_seen_at TIMESTAMP
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_attendees_event ON attendees(event_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_attendees_token ON attendees(token)`;

  // Migration: make event_id nullable for self-registered users
  try {
    await sql`ALTER TABLE attendees ALTER COLUMN event_id DROP NOT NULL`;
  } catch (_) {
    // Already nullable or doesn't support ALTER — ignore
  }
  try {
    await sql`ALTER TABLE attendees DROP CONSTRAINT IF EXISTS attendees_event_id_fkey`;
  } catch (_) {
    // No constraint to drop — ignore
  }

  await sql`
    CREATE TABLE IF NOT EXISTS price_cache (
      id INTEGER PRIMARY KEY DEFAULT 1,
      btc_usd REAL NOT NULL DEFAULT 84210,
      usd_ars REAL NOT NULL DEFAULT 1285,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;

  // Seed price cache if empty
  const existing = await sql`SELECT id FROM price_cache WHERE id = 1`;
  if (existing.length === 0) {
    await sql`INSERT INTO price_cache (id, btc_usd, usd_ars) VALUES (1, 84210, 1285)`;
  }

  console.log("✓ Database migrated successfully");
}

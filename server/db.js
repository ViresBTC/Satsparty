// ═══════════════════════════════════════
//  SatsParty — Database (sql.js / WASM SQLite)
//  Works on Vercel serverless + local dev
// ═══════════════════════════════════════

import initSqlJs from "sql.js";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const IS_VERCEL = !!process.env.VERCEL;
const DB_PATH = IS_VERCEL
  ? "/tmp/satsparty.db"
  : join(__dirname, "..", "data", "satsparty.db");

let _db = null;
let _initPromise = null;

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
  // Ensure data directory exists (local only)
  if (!IS_VERCEL) {
    mkdirSync(join(__dirname, "..", "data"), { recursive: true });
  }

  // Locate the WASM file explicitly for Vercel serverless
  let wasmBinary;
  try {
    const wasmPath = require.resolve("sql.js/dist/sql-wasm.wasm");
    wasmBinary = readFileSync(wasmPath);
  } catch {
    // Fallback: let sql.js find it automatically
  }

  const SQL = await initSqlJs({
    ...(wasmBinary ? { wasmBinary } : {}),
  });

  let sqlDb;
  try {
    if (existsSync(DB_PATH)) {
      const data = readFileSync(DB_PATH);
      sqlDb = new SQL.Database(data);
    } else {
      sqlDb = new SQL.Database();
    }
  } catch {
    sqlDb = new SQL.Database();
  }

  // Run pragmas
  sqlDb.run("PRAGMA foreign_keys = ON");

  // Run migrations
  migrate(sqlDb);

  // Save after migration
  save(sqlDb);

  console.log("✓ Database ready (sql.js WASM)");

  return createWrapper(sqlDb);
}

/**
 * Persist the DB to disk
 */
function save(sqlDb) {
  try {
    const data = sqlDb.export();
    writeFileSync(DB_PATH, Buffer.from(data));
  } catch (err) {
    console.error("DB save error:", err.message);
  }
}

/**
 * Create a wrapper with better-sqlite3-compatible API
 * so all existing route code works without changes.
 */
function createWrapper(sqlDb) {
  const wrapper = {
    prepare(sql) {
      return {
        /**
         * Get a single row: .get(param1, param2, ...)
         */
        get(...params) {
          try {
            const stmt = sqlDb.prepare(sql);
            if (params.length) stmt.bind(params);
            if (stmt.step()) {
              const cols = stmt.getColumnNames();
              const vals = stmt.get();
              const row = {};
              cols.forEach((c, i) => (row[c] = vals[i]));
              stmt.free();
              return row;
            }
            stmt.free();
            return undefined;
          } catch (err) {
            console.error("DB get error:", err.message, sql);
            return undefined;
          }
        },

        /**
         * Get all rows: .all(param1, param2, ...)
         */
        all(...params) {
          try {
            const results = [];
            const stmt = sqlDb.prepare(sql);
            if (params.length) stmt.bind(params);
            while (stmt.step()) {
              const cols = stmt.getColumnNames();
              const vals = stmt.get();
              const row = {};
              cols.forEach((c, i) => (row[c] = vals[i]));
              results.push(row);
            }
            stmt.free();
            return results;
          } catch (err) {
            console.error("DB all error:", err.message, sql);
            return [];
          }
        },

        /**
         * Execute a write: .run(param1, param2, ...)
         * Returns { changes, lastInsertRowid }
         */
        run(...params) {
          try {
            sqlDb.run(sql, params);
            const rowid = sqlDb.exec("SELECT last_insert_rowid()");
            const lastInsertRowid =
              rowid.length > 0 ? rowid[0].values[0][0] : 0;
            const changes = sqlDb.getRowsModified();
            save(sqlDb); // Auto-save after writes
            return { changes, lastInsertRowid };
          } catch (err) {
            console.error("DB run error:", err.message, sql);
            throw err;
          }
        },
      };
    },

    exec(sql) {
      sqlDb.run(sql);
      save(sqlDb);
    },

    pragma(str) {
      try {
        sqlDb.run(`PRAGMA ${str}`);
      } catch {
        // Some pragmas may not be supported in WASM mode
      }
    },
  };

  return wrapper;
}

/**
 * Database migrations
 */
function migrate(sqlDb) {
  sqlDb.run(`
    -- Admins (single admin for now)
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Events
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      date TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      welcome_sats INTEGER DEFAULT 100,
      max_attendees INTEGER DEFAULT 100,
      alby_hub_url TEXT NOT NULL,
      alby_auth_token TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Attendees
    CREATE TABLE IF NOT EXISTS attendees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      created_at TEXT DEFAULT (datetime('now')),
      last_seen_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_attendees_event ON attendees(event_id);
    CREATE INDEX IF NOT EXISTS idx_attendees_token ON attendees(token);

    -- Price cache
    CREATE TABLE IF NOT EXISTS price_cache (
      id INTEGER PRIMARY KEY DEFAULT 1,
      btc_usd REAL NOT NULL DEFAULT 84210,
      usd_ars REAL NOT NULL DEFAULT 1285,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Seed price cache if empty
    INSERT OR IGNORE INTO price_cache (id, btc_usd, usd_ars) VALUES (1, 84210, 1285);
  `);

  console.log("✓ Database migrated successfully");
}

import Database from "better-sqlite3";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { mkdirSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, "..", "data", "satsparty.db");

export function initDB() {
  // Ensure data directory exists
  mkdirSync(join(__dirname, "..", "data"), { recursive: true });

  const db = new Database(DB_PATH);

  // Enable WAL mode for better concurrent performance
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  // Run migrations
  migrate(db);

  return db;
}

function migrate(db) {
  db.exec(`
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

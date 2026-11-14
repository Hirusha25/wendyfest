import { DatabaseSync } from "node:sqlite";
import { config } from "./config.js";

export const db = new DatabaseSync(config.dbPath);
db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");

db.exec(`
CREATE TABLE IF NOT EXISTS participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,            -- 6-char code shown at the kiosk
  token TEXT NOT NULL UNIQUE,           -- secret used in profile links
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,           -- normalised 94XXXXXXXXX
  email TEXT,
  dob TEXT,
  lang TEXT NOT NULL DEFAULT 'en',
  consent_marketing INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS coupons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  label TEXT,
  claimed_by INTEGER REFERENCES participants(id),
  claimed_at TEXT,
  activity TEXT
);
CREATE TABLE IF NOT EXISTS scream_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  participant_id INTEGER NOT NULL REFERENCES participants(id),
  peak_db REAL, loudness REAL, accuracy REAL, score REAL,
  transcript TEXT,
  won INTEGER NOT NULL DEFAULT 0,
  coupon_id INTEGER REFERENCES coupons(id),
  station TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS roasts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  participant_id INTEGER NOT NULL REFERENCES participants(id),
  token TEXT NOT NULL UNIQUE,
  photo_file TEXT,
  title_en TEXT, title_si TEXT, title_ta TEXT,
  roast_en TEXT, roast_si TEXT, roast_ta TEXT,
  observations TEXT,            -- JSON array of what the model noticed
  vibe TEXT,
  model TEXT,
  fallback INTEGER NOT NULL DEFAULT 0,
  consent INTEGER NOT NULL DEFAULT 1,
  station TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sms_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT, body TEXT, provider TEXT, status TEXT, detail TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS otps (
  phone TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  payload TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER NOT NULL,
  last_sent INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY, value TEXT
);
`);

export function getSetting(key, fallback) {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
  if (!row) return fallback;
  try { return JSON.parse(row.value); } catch { return row.value; }
}
export function setSetting(key, value) {
  db.prepare("INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value")
    .run(key, JSON.stringify(value));
}

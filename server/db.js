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

// Added later: what the kiosk's speech check reported for this scream (JSON), so a "no words heard" can be explained afterwards.
if (!db.prepare("PRAGMA table_info(scream_attempts)").all().some((c) => c.name === "speech")) db.exec("ALTER TABLE scream_attempts ADD COLUMN speech TEXT");
// what the guest ticked when registering: the terms and privacy statement, and photo + voice at the games (both required), with the time
for (const c of ["consent_terms", "consent_media"]) if (!db.prepare("PRAGMA table_info(participants)").all().some((x) => x.name === c)) db.exec(`ALTER TABLE participants ADD COLUMN ${c} INTEGER NOT NULL DEFAULT 0`);
// the card colour the guest picked on the roast screen (paper = beige, blue, dark = black, red)
if (!db.prepare("PRAGMA table_info(roasts)").all().some((c) => c.name === "card_theme")) db.exec("ALTER TABLE roasts ADD COLUMN card_theme TEXT");

// The loudest 0.6 s of the scream in dBFS, kept so the admin page can show how many past screams would win at each difficulty level.
if (!db.prepare("PRAGMA table_info(scream_attempts)").all().some((c) => c.name === "sus_db")) db.exec("ALTER TABLE scream_attempts ADD COLUMN sus_db REAL");
// When the Wendy's team marked a coupon as used at the counter (the /redeem page), and an optional note such as the outlet.
for (const c of ["redeemed_at", "redeemed_note"]) if (!db.prepare("PRAGMA table_info(coupons)").all().some((x) => x.name === c)) db.exec(`ALTER TABLE coupons ADD COLUMN ${c} TEXT`);
// Wendy's Claw (game 3): one row per finished round.
db.exec(`CREATE TABLE IF NOT EXISTS claw_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT, participant_id INTEGER NOT NULL REFERENCES participants(id),
  matched INTEGER NOT NULL DEFAULT 0, won INTEGER NOT NULL DEFAULT 0, ms_left INTEGER, took_ms INTEGER, station TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)`);
if (!db.prepare("PRAGMA table_info(claw_attempts)").all().some((c) => c.name === "coupon_id")) db.exec("ALTER TABLE claw_attempts ADD COLUMN coupon_id INTEGER REFERENCES coupons(id)");
// Which message each SMS was (otp, welcome, win, lose, roast), so the admin page can count them. Older rows are sorted by their wording.
if (!db.prepare("PRAGMA table_info(sms_log)").all().some((c) => c.name === "kind")) {
  db.exec("ALTER TABLE sms_log ADD COLUMN kind TEXT");
  db.exec(`UPDATE sms_log SET kind = CASE
    WHEN body GLOB '[0-9][0-9][0-9][0-9]*' AND body NOT LIKE '%http%' THEN 'otp'
    WHEN body LIKE '%/r/%' THEN 'roast'
    WHEN body LIKE '%reward code%' OR body LIKE '%ත්‍යාග%' OR body LIKE '%பரிசு%' THEN 'win'
    WHEN body LIKE '%close one%' OR body LIKE '%ආසන්නයි%' OR body LIKE '%கிட்டத்தட்ட%' THEN 'lose'
    ELSE 'welcome' END`);
}
// One row per phone number that asked for a sign-up code. No participant with that phone = "half registered" (started, never finished).
// The row stays after the code is used, so the admin page can show how many started, how many codes were sent and how many finished.
db.exec(`CREATE TABLE IF NOT EXISTS otp_requests (
  phone TEXT PRIMARY KEY, lang TEXT,
  sends INTEGER NOT NULL DEFAULT 0,       -- sign-up codes sent to this phone
  wrong INTEGER NOT NULL DEFAULT 0,       -- wrong codes typed
  first_at TEXT NOT NULL DEFAULT (datetime('now')), last_at TEXT NOT NULL DEFAULT (datetime('now')), verified_at TEXT
)`);
if (!db.prepare("SELECT 1 FROM otp_requests LIMIT 1").get()) {   // first run: rebuilt from the SMS log
  db.exec(`INSERT INTO otp_requests(phone, lang, sends, first_at, last_at, verified_at)
    SELECT s.phone, (SELECT lang FROM participants p WHERE p.phone = s.phone), COUNT(*), MIN(s.created_at), MAX(s.created_at), (SELECT created_at FROM participants p WHERE p.phone = s.phone)
    FROM sms_log s WHERE s.kind = 'otp' AND s.phone IS NOT NULL GROUP BY s.phone`);
}

// The LED wall only shows roasts the team approved on the admin page (wall = 1), newest approval first.
for (const [c, t] of [["wall", "INTEGER NOT NULL DEFAULT 0"], ["wall_at", "TEXT"]]) if (!db.prepare("PRAGMA table_info(roasts)").all().some((x) => x.name === c)) db.exec(`ALTER TABLE roasts ADD COLUMN ${c} ${t}`);

export function getSetting(key, fallback) {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
  if (!row) return fallback;
  try { return JSON.parse(row.value); } catch { return row.value; }
}
export function setSetting(key, value) {
  db.prepare("INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value")
    .run(key, JSON.stringify(value));
}

// Central configuration. Everything can be overridden with environment variables.
// Copy .env.example to .env (or export the vars) before starting the server.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

// Minimal .env loader (no dependency): KEY=VALUE lines, # comments.
const envFile = path.join(root, ".env");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const env = (k, d) => (process.env[k] === undefined || process.env[k] === "" ? d : process.env[k]);

export const config = {
  root,
  port: Number(env("PORT", 3000)),
  // Public base URL printed inside SMS + QR codes. On event day set this to the
  // laptop's LAN address or the deployed domain, e.g. https://fest.wendys.lk
  baseUrl: env("BASE_URL", `http://localhost:${env("PORT", 3000)}`),
  dbPath: env("DB_PATH", path.join(root, "data", "wendyfest.sqlite")),
  photoDir: env("PHOTO_DIR", path.join(root, "data", "photos")),

  kioskPin: env("KIOSK_PIN", "2468"),
  adminPin: env("ADMIN_PIN", "1357"),

  // Scream & Win scoring (editable live from /admin; these are the defaults)
  scream: {
    threshold: Number(env("SCREAM_THRESHOLD", 70)),   // overall score needed to win (0-100)
    loudWeight: Number(env("SCREAM_LOUD_WEIGHT", 0.6)),
    accWeight: Number(env("SCREAM_ACC_WEIGHT", 0.4)),
    dbFloor: Number(env("SCREAM_DB_FLOOR", -42)),       // dBFS that maps to 0
    dbCeil: Number(env("SCREAM_DB_CEIL", -6)),          // dBFS that maps to 100
    attemptsPerPerson: Number(env("SCREAM_ATTEMPTS", 1)),
    durationMs: Number(env("SCREAM_DURATION_MS", 3000)),
  },
  roast: {
    attemptsPerPerson: Number(env("ROAST_ATTEMPTS", 1)),
    model: env("ROAST_MODEL", "claude-opus-5-5"),
    effort: env("ROAST_EFFORT", "medium"),
  },
  // Coupon copy shown on screens + SMS. Confirm with the client (Eromika) what the
  // code actually unlocks before launch.
  coupon: {
    valueLabel: env("COUPON_VALUE_LABEL", "10% OFF your next Wendy's order"),
    terms: env("COUPON_TERMS", "Valid at Wendy's Sri Lanka outlets during the launch period. One use per code."),
  },
  sms: {
    provider: env("SMS_PROVIDER", "console"),  // console | notifylk | shoutout | dialog | http
    senderId: env("SMS_SENDER_ID", "Wendys"), // needs TRAI/operator approval in SL
    notifyUserId: env("NOTIFYLK_USER_ID", ""),
    notifyApiKey: env("NOTIFYLK_API_KEY", ""),
    shoutoutApiKey: env("SHOUTOUT_API_KEY", ""),
    dialogUser: env("DIALOG_SMS_USER", ""),
    dialogPass: env("DIALOG_SMS_PASS", ""),
    dialogUrl: env("DIALOG_SMS_URL", ""),
    httpUrl: env("SMS_HTTP_URL", ""),          // generic: POST JSON {to, from, message}
    httpAuth: env("SMS_HTTP_AUTH", ""),        // value of Authorization header
  },
  anthropicApiKey: env("ANTHROPIC_API_KEY", ""),
};

fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });
fs.mkdirSync(config.photoDir, { recursive: true });

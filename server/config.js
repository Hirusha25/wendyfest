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

// The event runs on Sri Lanka time. Stored times stay in UTC; this makes the server's own clock (logs, any local date) Sri Lanka time too,
// wherever the machine is.
if (!process.env.TZ) process.env.TZ = "Asia/Colombo";

const env = (k, d) => (process.env[k] === undefined || process.env[k] === "" ? d : process.env[k]);

export const config = {
  root,
  port: Number(env("PORT", 3000)),
  // Public base URL printed inside SMS + QR codes. On event day set this to the
  // laptop's LAN address or the deployed domain, e.g. https://fest.wendys.lk
  baseUrl: env("BASE_URL", `http://localhost:${env("PORT", 3000)}`),
  dbPath: env("DB_PATH", path.join(root, "data", "wendyfest.sqlite")),
  photoDir: env("PHOTO_DIR", path.join(root, "data", "photos")),

  otp: { digits: Number(env("OTP_DIGITS", 4)), ttlSec: Number(env("OTP_TTL_SEC", 120)), resendSec: Number(env("OTP_RESEND_SEC", 30)), maxAttempts: 5 },
  kioskPin: env("KIOSK_PIN", "2468"),
  adminPin: env("ADMIN_PIN", "1357"),
  // Guest codes that never run out of turns (for demos on a test server). Leave empty at the event.
  demoCodes: env("DEMO_CODES", "").toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean),

  // Scream & Win scoring (editable live from /admin; these are the defaults)
  scream: {
    threshold: Number(env("SCREAM_THRESHOLD", 75)),   // overall score needed to win (0-100)
    minLoud: Number(env("SCREAM_MIN_LOUD", 60)),       // loudness must also reach this on its own
    minAcc: Number(env("SCREAM_MIN_ACC", 70)),         // clarity must also reach this: only a clear "Wendy's" (with the S) passes
    loudWeight: Number(env("SCREAM_LOUD_WEIGHT", 0.6)),
    accWeight: Number(env("SCREAM_ACC_WEIGHT", 0.4)),
    dbFloor: Number(env("SCREAM_DB_FLOOR", -42)),       // dBFS that maps to 0
    dbCeil: Number(env("SCREAM_DB_CEIL", -6)),          // dBFS that maps to 100
    attemptsPerPerson: Number(env("SCREAM_ATTEMPTS", 1)),
    durationMs: Number(env("SCREAM_DURATION_MS", 10000)),   // up to 10 seconds so the guest can hold the note; ends early once the word is heard and they stop
  },
  roast: {
    attemptsPerPerson: Number(env("ROAST_ATTEMPTS", 1)),
    model: env("ROAST_MODEL", "claude-opus-5-5"),
    effort: env("ROAST_EFFORT", "medium"),
  },
  // Roast voice-over (ElevenLabs). Needs both the key and a voice; without them the roast is shown with no sound.
  voice: {
    apiKey: env("ELEVENLABS_API_KEY", ""),
    voiceId: env("ELEVENLABS_VOICE_ID", ""),
    model: env("ELEVENLABS_MODEL", "eleven_v4"),             // v3 and v4 follow delivery directions like [teasing]
    stability: Number(env("ELEVENLABS_STABILITY", 0.5)),   // lower = more expressive
    style: Number(env("ELEVENLABS_STYLE", 0.45)),          // higher = more character
    sttModel: env("ELEVENLABS_STT_MODEL", "scribe_v1"),    // Scream & Win: hears the word on the server; "off" turns it off
    baseUrl: env("ELEVENLABS_URL", "https://api.elevenlabs.io").replace(/\/+$/, ""),
  },
  // Coupon copy shown on screens + SMS. Confirm with the client (Eromika) what the
  // code actually unlocks before launch.
  coupon: {
    valueLabel: env("COUPON_VALUE_LABEL", "10% OFF your next Wendy's order"),
    terms: env("COUPON_TERMS", "Valid at Wendy's Sri Lanka outlets during the launch period. One use per code."),
  },
  sms: {
    provider: env("SMS_PROVIDER", "console"),  // console | textware | notifylk | shoutout | dialog | http
    senderId: env("SMS_SENDER_ID", "WENDYS"), // the sender name registered with the SMS provider
    textwareUser: env("TEXTWARE_USER", ""),
    textwarePass: env("TEXTWARE_PASS", ""),
    textwareUrl: env("TEXTWARE_URL", "https://msg.text-ware.com/send_sms.php"),
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

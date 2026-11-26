import express from "express";
import path from "node:path";
import fs from "node:fs";
import QRCode from "qrcode";
import { config } from "./config.js";
import { db, getSetting, setSetting } from "./db.js";
import { shortCode, token, normalisePhone, judgeScream, rivalCheck, clamp, csvEscape } from "./util.js";
import { sendSms, templates } from "./sms.js";
import { generateRoast, generateTeasers } from "./roast.js";
import { screamSass } from "./sass.js";
import { startVoice, voiceEnabled, voiceReady, voiceFile } from "./voice.js";

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "12mb" }));
app.use(express.urlencoded({ extended: false }));

const pub = path.join(config.root, "public");
const page = (f) => path.join(pub, f);

// ---------- helpers ----------
const cookies = (req) => Object.fromEntries((req.headers.cookie || "").split(";").map((c) => c.trim().split("=")).filter((p) => p[0]).map(([k, ...v]) => [k, decodeURIComponent(v.join("="))]));
const setCookie = (res, name, value, days = 365) => res.append("Set-Cookie", `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${days * 86400}; SameSite=Lax`);

const screamSettings = () => ({ ...config.scream, ...getSetting("scream", {}) });
const couponSettings = () => ({ ...config.coupon, ...getSetting("coupon", {}) });
const roastSettings = () => ({ ...config.roast, ...getSetting("roast", {}) });

const requirePin = (which) => (req, res, next) => {
  const c = cookies(req);
  const supplied = req.headers["x-pin"] || c[`wf_${which}`];
  const expected = which === "admin" ? config.adminPin : config.kioskPin;
  if (supplied === expected || (which === "kiosk" && supplied === config.adminPin)) return next();
  res.status(401).json({ error: "PIN required", which });
};

const participantByToken = db.prepare("SELECT * FROM participants WHERE token = ?");
const participantByCode = db.prepare("SELECT * FROM participants WHERE code = ?");
const participantByPhone = db.prepare("SELECT * FROM participants WHERE phone = ?");
const screamsFor = db.prepare("SELECT s.*, c.code AS coupon_code, c.label AS coupon_label FROM scream_attempts s LEFT JOIN coupons c ON c.id = s.coupon_id WHERE participant_id = ? ORDER BY id DESC");
const roastsFor = db.prepare("SELECT * FROM roasts WHERE participant_id = ? ORDER BY id DESC");
const countRow = db.prepare("SELECT COUNT(*) AS n FROM participants");

const isDemo = (p) => config.demoCodes.includes(p.code);   // demo guests never run out of turns
function profileUrl(p) { return `${config.baseUrl}/p/${p.token}`; }
function roastUrl(r) { return `${config.baseUrl}/r/${r.token}`; }

function publicProfile(p) {
  const screams = screamsFor.all(p.id).map((s) => ({
    id: s.id, score: s.score, loudness: s.loudness, accuracy: s.accuracy, peakDb: s.peak_db, won: !!s.won,
    coupon: s.coupon_code ? { code: s.coupon_code, label: s.coupon_label || couponSettings().valueLabel } : null,
    at: s.created_at,
  }));
  const roasts = roastsFor.all(p.id).map((r) => ({
    token: r.token, url: roastUrl(r), title: { en: r.title_en, si: r.title_si, ta: r.title_ta },
    roast: { en: r.roast_en, si: r.roast_si, ta: r.roast_ta }, vibe: r.vibe, at: r.created_at, photo: `/api/roast/${r.token}/photo`,
  }));
  const number = db.prepare("SELECT COUNT(*) AS n FROM participants WHERE id <= ?").get(p.id).n;
  return {
    name: p.name, code: p.code, lang: p.lang, number, joined: p.created_at, phoneMasked: p.phone.replace(/^(94)(\d{2})\d{5}(\d{2})$/, "+$1 $2*****$3"),
    profileUrl: profileUrl(p), screams, roasts,
    badges: { screamer: screams.length > 0, winner: screams.some((s) => s.won), roasted: roasts.length > 0 },
    coupon: couponSettings(),
    limits: { screamAttempts: screamSettings().attemptsPerPerson, roastAttempts: roastSettings().attemptsPerPerson },
  };
}

// ---------- public pages ----------
app.get("/", (req, res) => res.sendFile(page("index.html")));
app.get("/register", (req, res) => {
  // A phone that has already registered goes straight to its pass. /register?new=1 lets someone else sign up on the same phone.
  const c = cookies(req);
  if (req.query.new === undefined && c.wf_session && participantByToken.get(c.wf_session)) return res.redirect("/profile");
  res.sendFile(page("register.html"));
});
app.get("/profile", (req, res) => res.sendFile(page("profile.html")));
app.get("/p/:token", (req, res) => {
  const p = participantByToken.get(req.params.token);
  if (!p) return res.redirect("/register");
  setCookie(res, "wf_session", p.token);
  res.sendFile(page("profile.html"));
});
app.get("/r/:token", (req, res) => res.sendFile(page("roast.html")));
app.get("/kiosk", (req, res) => res.sendFile(page("kiosk/index.html")));
app.get("/kiosk/scream", (req, res) => res.sendFile(page("kiosk/scream.html")));
app.get("/kiosk/scream-cream", (req, res) => res.redirect("/kiosk/scream"));   // old address of the final design
app.get("/kiosk/scream-dark", (req, res) => res.sendFile(page("kiosk/scream-dark.html")));   // earlier dark design, kept as a spare
app.get("/kiosk/roast", (req, res) => res.sendFile(page("kiosk/roast.html")));
app.get("/admin", (req, res) => res.sendFile(page("admin.html")));

// ---------- config for the front end ----------
app.get("/api/config", (req, res) => {
  res.json({ baseUrl: config.baseUrl, coupon: couponSettings(), scream: screamSettings(), roast: { attemptsPerPerson: roastSettings().attemptsPerPerson } });
});

// QR as SVG
app.get("/api/qr", async (req, res) => {
  const text = String(req.query.text || config.baseUrl).slice(0, 500);
  const svg = await QRCode.toString(text, { type: "svg", margin: 1, color: { dark: req.query.dark ? `#${req.query.dark}` : "#252525", light: "#0000" }, errorCorrectionLevel: "M" });
  res.type("image/svg+xml").send(svg);
});

// ---------- registration + profile ----------
// Step 1: validate, store pending registration, send OTP by SMS.
function issueOtp(phone, payload) {
  const d = config.otp.digits;
  const code = String(Math.floor(Math.random() * 10 ** d)).padStart(d, "0");
  const now = Date.now();
  db.prepare("INSERT INTO otps(phone, code, payload, attempts, expires_at, last_sent) VALUES (?,?,?,0,?,?) ON CONFLICT(phone) DO UPDATE SET code=excluded.code, payload=excluded.payload, attempts=0, expires_at=excluded.expires_at, last_sent=excluded.last_sent")
    .run(phone, code, JSON.stringify(payload), now + config.otp.ttlSec * 1000, now);
  sendSms(phone, templates(payload.lang).otp(code));
  return code;
}
function completeRegistration(payload) {
  const { name, phone, email, dob, lang, consentMarketing } = payload;
  let p = participantByPhone.get(phone);
  let created = false;
  if (!p) {
    let code;
    do { code = shortCode(6); } while (participantByCode.get(code));
    db.prepare("INSERT INTO participants(code, token, name, phone, email, dob, lang, consent_marketing) VALUES (?,?,?,?,?,?,?,?)")
      .run(code, token(), name, phone, email || null, dob || null, lang, consentMarketing ? 1 : 0);
    p = participantByPhone.get(phone);
    created = true;
  } else {
    db.prepare("UPDATE participants SET lang = ?, name = COALESCE(NULLIF(?, ''), name) WHERE id = ?").run(lang, name, p.id);
    p = participantByPhone.get(phone);
  }
  sendSms(p.phone, templates(p.lang).welcome(p.name.split(" ")[0], p.code, profileUrl(p)));
  return { p, created };
}

app.post("/api/register", (req, res) => {
  const { name, phone, email, dob, lang = "en", consentMarketing } = req.body || {};
  const cleanName = String(name || "").trim().slice(0, 60);
  const normPhone = normalisePhone(phone);
  if (cleanName.length < 2) return res.status(400).json({ error: "name" });
  if (!normPhone) return res.status(400).json({ error: "phone" });
  if (dob && !/^\d{4}-\d{2}-\d{2}$/.test(dob)) return res.status(400).json({ error: "dob" });
  const safeLang = ["en", "si", "ta"].includes(lang) ? lang : "en";
  const payload = { name: cleanName, phone: normPhone, email: email ? String(email).trim().slice(0, 120) : null, dob: dob || null, lang: safeLang, consentMarketing: !!consentMarketing };
  const existing = db.prepare("SELECT last_sent FROM otps WHERE phone = ?").get(normPhone);
  if (existing && Date.now() - existing.last_sent < config.otp.resendSec * 1000) return res.status(429).json({ error: "wait", retryIn: Math.ceil((config.otp.resendSec * 1000 - (Date.now() - existing.last_sent)) / 1000) });
  const code = issueOtp(normPhone, payload);
  const out = { ok: true, step: "otp", phoneMasked: normPhone.replace(/^(94)(\d{2})\d{5}(\d{2})$/, "+$1 $2 *** **$3"), ttl: config.otp.ttlSec, resendIn: config.otp.resendSec, digits: config.otp.digits };
  if (config.sms.provider === "console") out.devOtp = code; // only in console mode so local testing works
  res.json(out);
});

// Step 2: verify OTP, create participant, send welcome SMS.
app.post("/api/verify", (req, res) => {
  const normPhone = normalisePhone(req.body?.phone);
  const code = String(req.body?.code || "").replace(/\D/g, "");
  const row = normPhone && db.prepare("SELECT * FROM otps WHERE phone = ?").get(normPhone);
  if (!row) return res.status(400).json({ error: "otp" });
  if (Date.now() > row.expires_at) { db.prepare("DELETE FROM otps WHERE phone = ?").run(normPhone); return res.status(400).json({ error: "expired" }); }
  if (row.attempts >= config.otp.maxAttempts) { db.prepare("DELETE FROM otps WHERE phone = ?").run(normPhone); return res.status(400).json({ error: "expired" }); }
  if (code !== row.code) { db.prepare("UPDATE otps SET attempts = attempts + 1 WHERE phone = ?").run(normPhone); return res.status(400).json({ error: "otp" }); }
  db.prepare("DELETE FROM otps WHERE phone = ?").run(normPhone);
  const { p, created } = completeRegistration(JSON.parse(row.payload));
  setCookie(res, "wf_session", p.token);
  res.json({ ok: true, created, token: p.token, code: p.code, profileUrl: profileUrl(p) });
});

app.get("/api/me", (req, res) => {
  const c = cookies(req);
  const p = c.wf_session && participantByToken.get(c.wf_session);
  if (!p) return res.status(401).json({ error: "not registered" });
  res.json(publicProfile(p));
});

app.post("/api/me/resend", (req, res) => {
  const c = cookies(req);
  const p = c.wf_session && participantByToken.get(c.wf_session);
  if (!p) return res.status(401).json({ error: "not registered" });
  sendSms(p.phone, templates(p.lang).welcome(p.name.split(" ")[0], p.code, profileUrl(p)));
  res.json({ ok: true });
});

app.get("/api/roast/:token", (req, res) => {
  const r = db.prepare("SELECT r.*, p.name, p.lang FROM roasts r JOIN participants p ON p.id = r.participant_id WHERE r.token = ?").get(req.params.token);
  if (!r) return res.status(404).json({ error: "not found" });
  res.json({
    token: r.token, name: r.name, lang: r.lang, vibe: r.vibe, at: r.created_at, fallback: !!r.fallback,
    title: { en: r.title_en, si: r.title_si, ta: r.title_ta }, roast: { en: r.roast_en, si: r.roast_si, ta: r.roast_ta },
    photo: r.photo_file ? `/api/roast/${r.token}/photo` : null, url: roastUrl(r),
  });
});
// The English voice-over for a roast. Waits a little if it is still being made; 404 when there is none.
app.get("/api/roast/:token/audio", async (req, res) => {
  const r = db.prepare("SELECT token FROM roasts WHERE token = ?").get(String(req.params.token || ""));
  if (!r || !(await voiceReady(r.token))) return res.status(404).json({ error: "no voice-over" });
  res.set("Cache-Control", "private, no-store").type("audio/mpeg").sendFile(voiceFile(r.token));
});
app.get("/api/roast/:token/photo", (req, res) => {
  const r = db.prepare("SELECT photo_file FROM roasts WHERE token = ?").get(req.params.token);
  if (!r?.photo_file) return res.status(404).end();
  res.sendFile(path.join(config.photoDir, r.photo_file));
});

// ---------- kiosk ----------
app.post("/api/kiosk/login", (req, res) => {
  const pin = String(req.body?.pin || "");
  if (pin === config.kioskPin || pin === config.adminPin) { setCookie(res, "wf_kiosk", pin, 7); return res.json({ ok: true }); }
  res.status(401).json({ error: "wrong pin" });
});

app.post("/api/kiosk/lookup", requirePin("kiosk"), (req, res) => {
  const code = String(req.body?.code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const p = participantByCode.get(code);
  if (!p) return res.status(404).json({ error: "Code not found. Ask the guest to check their SMS or register at the QR code." });
  const screams = screamsFor.all(p.id), roasts = roastsFor.all(p.id);
  res.json({
    name: p.name, firstName: p.name.split(" ")[0], lang: p.lang, code: p.code,
    screamsUsed: isDemo(p) ? 0 : screams.length, screamsLeft: isDemo(p) ? 1 : Math.max(0, screamSettings().attemptsPerPerson - screams.length),
    roastsUsed: isDemo(p) ? 0 : roasts.length, roastsLeft: isDemo(p) ? 1 : Math.max(0, roastSettings().attemptsPerPerson - roasts.length),
    alreadyWon: !isDemo(p) && screams.some((s) => s.won), profileUrl: profileUrl(p),
  });
});

app.post("/api/kiosk/scream", requirePin("kiosk"), async (req, res) => {
  const { code, peakDb, sustainedDb, transcript, accuracyOverride, station } = req.body || {};
  const p = participantByCode.get(String(code || "").toUpperCase());
  if (!p) return res.status(404).json({ error: "code not found" });
  const s = screamSettings();
  const used = screamsFor.all(p.id);
  if (!isDemo(p) && used.length >= s.attemptsPerPerson) return res.status(409).json({ error: "No attempts left for this guest", attempts: used.length });

  const { loud, acc, score, won, reason } = judgeScream({ peakDb, sustainedDb, transcript, accuracyOverride }, s);

  let coupon = null;
  if (won) {
    coupon = db.prepare("SELECT * FROM coupons WHERE claimed_by IS NULL ORDER BY id LIMIT 1").get();
    if (coupon) db.prepare("UPDATE coupons SET claimed_by = ?, claimed_at = datetime('now'), activity = 'scream' WHERE id = ?").run(p.id, coupon.id);
  }
  const info = db.prepare("INSERT INTO scream_attempts(participant_id, peak_db, loudness, accuracy, score, transcript, won, coupon_id, station) VALUES (?,?,?,?,?,?,?,?,?)")
    .run(p.id, Number(peakDb) || null, loud, acc, score, transcript ? String(transcript).slice(0, 200) : null, won ? 1 : 0, coupon?.id || null, station || null);

  const first = p.name.split(" ")[0];
  const t = templates(p.lang);
  const label = coupon?.label || couponSettings().valueLabel;
  if (won && coupon) sendSms(p.phone, t.win(first, coupon.code, label, profileUrl(p)));
  else if (won && !coupon) sendSms(p.phone, t.win(first, "(pending)", "reward pool exhausted – see staff", profileUrl(p)));
  else sendSms(p.phone, t.lose(first, profileUrl(p)));

  // Shouted another restaurant's name (or anything that was not Wendy's)? Wendy answers back on the result screen.
  const rival = rivalCheck(transcript);
  const offScript = !won && transcript && (accuracyOverride === undefined || accuracyOverride === null) && (rival || reason === "unclear");
  const sass = offScript ? await screamSass({ transcript, name: first, rival, loud, acc }) : null;

  res.json({
    attemptId: info.lastInsertRowid, name: first, score, loudness: loud, accuracy: acc, threshold: s.threshold, minLoud: s.minLoud, minAcc: s.minAcc, reason, won, sass,
    coupon: coupon ? { code: coupon.code, label } : null, couponPoolEmpty: won && !coupon,
    profileUrl: profileUrl(p), attemptsLeft: isDemo(p) ? 1 : Math.max(0, s.attemptsPerPerson - used.length - 1),
  });
});

// Waiting-screen lines about this guest's photo, asked for alongside the roast. Stores nothing; always answers 200.
app.post("/api/kiosk/roast-lines", requirePin("kiosk"), async (req, res) => {
  const { code, image, consent } = req.body || {};
  const p = participantByCode.get(String(code || "").toUpperCase());
  const m = String(image || "").match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!p || !consent || !m) return res.json({ lines: [] });
  res.json({ lines: await generateTeasers({ imageBase64: m[2], mediaType: m[1], name: p.name.split(" ")[0] }) });
});

app.post("/api/kiosk/roast", requirePin("kiosk"), async (req, res) => {
  const { code, image, consent, station, heat } = req.body || {};
  const p = participantByCode.get(String(code || "").toUpperCase());
  if (!p) return res.status(404).json({ error: "code not found" });
  if (!consent) return res.status(400).json({ error: "consent required" });
  const rs = roastSettings();
  const used = roastsFor.all(p.id);
  if (!isDemo(p) && used.length >= rs.attemptsPerPerson) return res.status(409).json({ error: "This guest has already been roasted" });
  const m = String(image || "").match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!m) return res.status(400).json({ error: "image must be a data URL (jpeg/png/webp)" });
  const [, mediaType, b64] = m;

  const result = await generateRoast({ imageBase64: b64, mediaType, name: p.name.split(" ")[0], lang: p.lang, heat: ["mild", "medium", "extra"].includes(heat) ? heat : "medium" });
  const rtoken = token(12);
  const ext = mediaType.split("/")[1].replace("jpeg", "jpg");
  const file = `${rtoken}.${ext}`;
  fs.writeFileSync(path.join(config.photoDir, file), Buffer.from(b64, "base64"));
  db.prepare(`INSERT INTO roasts(participant_id, token, photo_file, title_en, title_si, title_ta, roast_en, roast_si, roast_ta, observations, vibe, model, fallback, consent, station)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(p.id, rtoken, file, result.title.en, result.title.si, result.title.ta, result.roast.en, result.roast.si, result.roast.ta,
      JSON.stringify(result.observations || []), result.vibe || null, result.model || null, result.fallback ? 1 : 0, 1, station || null);
  const r = db.prepare("SELECT * FROM roasts WHERE token = ?").get(rtoken);
  sendSms(p.phone, templates(p.lang).roast(p.name.split(" ")[0], roastUrl(r)));
  startVoice(rtoken, result.roast.en);   // English voice-over, made in the background
  res.json({ token: rtoken, url: roastUrl(r), name: p.name.split(" ")[0], lang: p.lang, title: result.title, roast: result.roast, vibe: result.vibe, fallback: !!result.fallback, photo: `/api/roast/${rtoken}/photo`, audio: voiceEnabled() ? `/api/roast/${rtoken}/audio` : null });
});

// ---------- admin ----------
app.post("/api/admin/login", (req, res) => {
  if (String(req.body?.pin || "") === config.adminPin) { setCookie(res, "wf_admin", config.adminPin, 7); return res.json({ ok: true }); }
  res.status(401).json({ error: "wrong pin" });
});
app.get("/api/admin/stats", requirePin("admin"), (req, res) => {
  const q = (sql) => db.prepare(sql).get();
  res.json({
    participants: q("SELECT COUNT(*) n FROM participants").n,
    screams: q("SELECT COUNT(*) n FROM scream_attempts").n,
    wins: q("SELECT COUNT(*) n FROM scream_attempts WHERE won = 1").n,
    avgScore: q("SELECT ROUND(AVG(score),1) n FROM scream_attempts").n,
    roasts: q("SELECT COUNT(*) n FROM roasts").n,
    roastFallbacks: q("SELECT COUNT(*) n FROM roasts WHERE fallback = 1").n,
    couponsTotal: q("SELECT COUNT(*) n FROM coupons").n,
    couponsLeft: q("SELECT COUNT(*) n FROM coupons WHERE claimed_by IS NULL").n,
    smsFailed: q("SELECT COUNT(*) n FROM sms_log WHERE status = 'failed'").n,
    smsSent: q("SELECT COUNT(*) n FROM sms_log WHERE status = 'sent'").n,
    settings: { scream: screamSettings(), coupon: couponSettings(), roast: roastSettings(), sms: { provider: config.sms.provider, senderId: config.sms.senderId }, baseUrl: config.baseUrl, roastModel: config.roast.model, anthropicKey: !!config.anthropicApiKey },
    recent: db.prepare(`SELECT p.name, p.code, s.score, s.won, s.created_at, c.code AS coupon FROM scream_attempts s JOIN participants p ON p.id = s.participant_id LEFT JOIN coupons c ON c.id = s.coupon_id ORDER BY s.id DESC LIMIT 15`).all(),
    recentRoasts: db.prepare(`SELECT p.name, r.token, r.title_en, r.fallback, r.created_at FROM roasts r JOIN participants p ON p.id = r.participant_id ORDER BY r.id DESC LIMIT 15`).all(),
    leaderboard: db.prepare(`SELECT p.name, MAX(s.score) AS score FROM scream_attempts s JOIN participants p ON p.id = s.participant_id GROUP BY p.id ORDER BY score DESC LIMIT 10`).all(),
  });
});
app.put("/api/admin/settings", requirePin("admin"), (req, res) => {
  const { scream, coupon, roast } = req.body || {};
  if (scream) setSetting("scream", { ...getSetting("scream", {}), ...Object.fromEntries(Object.entries(scream).map(([k, v]) => [k, Number(v)])) });
  if (coupon) setSetting("coupon", { ...getSetting("coupon", {}), ...coupon });
  if (roast) setSetting("roast", { ...getSetting("roast", {}), ...Object.fromEntries(Object.entries(roast).map(([k, v]) => [k, Number(v)])) });
  res.json({ ok: true, scream: screamSettings(), coupon: couponSettings(), roast: roastSettings() });
});
app.post("/api/admin/coupons/import", requirePin("admin"), (req, res) => {
  // Accepts raw text: one code per line, optional ",label". Also accepts {codes:[...]}.
  const text = typeof req.body === "string" ? req.body : req.body?.text || (req.body?.codes || []).join("\n");
  const lines = String(text).split(/\r?\n/).map((l) => l.trim()).filter(Boolean).filter((l) => !/^code\b/i.test(l));
  const ins = db.prepare("INSERT OR IGNORE INTO coupons(code, label) VALUES (?,?)");
  let added = 0;
  const tx = db.exec.bind(db);
  tx("BEGIN");
  for (const l of lines) { const [code, label] = l.split(/[,\t;]/).map((s) => s.trim()); if (code) added += ins.run(code, label || null).changes; }
  tx("COMMIT");
  res.json({ ok: true, added, total: db.prepare("SELECT COUNT(*) n FROM coupons").get().n });
});
app.post("/api/admin/coupons/generate", requirePin("admin"), (req, res) => {
  // For testing only – generates WF-XXXXXX demo codes. Real codes come from the client/POS.
  const n = clamp(Number(req.body?.count || 100), 1, 5000);
  const ins = db.prepare("INSERT OR IGNORE INTO coupons(code, label) VALUES (?,?)");
  let added = 0;
  for (let i = 0; i < n; i++) added += ins.run("WF-" + shortCode(6), req.body?.label || null).changes;
  res.json({ ok: true, added });
});
app.get("/api/admin/export.csv", requirePin("admin"), (req, res) => {
  const rows = db.prepare(`SELECT p.id, p.created_at, p.name, p.phone, p.email, p.dob, p.lang, p.code, p.consent_marketing,
      (SELECT MAX(score) FROM scream_attempts s WHERE s.participant_id = p.id) AS best_scream,
      (SELECT COUNT(*) FROM scream_attempts s WHERE s.participant_id = p.id AND won = 1) AS wins,
      (SELECT GROUP_CONCAT(c.code) FROM coupons c WHERE c.claimed_by = p.id) AS coupons,
      (SELECT COUNT(*) FROM roasts r WHERE r.participant_id = p.id) AS roasts
      FROM participants p ORDER BY p.id`).all();
  const head = Object.keys(rows[0] || { id: 1 });
  res.type("text/csv").attachment("wendyfest-participants.csv")
    .send([head.join(","), ...rows.map((r) => head.map((h) => csvEscape(r[h])).join(","))].join("\n"));
});
app.post("/api/admin/resend", requirePin("admin"), (req, res) => {
  const p = participantByCode.get(String(req.body?.code || "").toUpperCase());
  if (!p) return res.status(404).json({ error: "code not found" });
  sendSms(p.phone, templates(p.lang).welcome(p.name.split(" ")[0], p.code, profileUrl(p)));
  res.json({ ok: true });
});

app.use(express.static(pub, { extensions: ["html"] }));
app.use((req, res) => res.status(404).sendFile(page("404.html")));

app.listen(config.port, () => {
  console.log(`\n🍔 Wendy Fest running on ${config.baseUrl}`);
  console.log(`   Guest QR  → ${config.baseUrl}/register`);
  console.log(`   Kiosk     → ${config.baseUrl}/kiosk   (PIN ${config.kioskPin})`);
  console.log(`   Admin     → ${config.baseUrl}/admin   (PIN ${config.adminPin})`);
  console.log(`   SMS provider: ${config.sms.provider} · Roast model: ${config.roast.model} · API key: ${config.anthropicApiKey ? "set" : "MISSING (fallback roasts)"}\n`);
});

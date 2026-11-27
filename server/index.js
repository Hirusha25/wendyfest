import express from "express";
import path from "node:path";
import fs from "node:fs";
import QRCode from "qrcode";
import { config } from "./config.js";
import { db, getSetting, setSetting } from "./db.js";
import { shortCode, guestCode, token, normalisePhone, judgeScream, rivalCheck, clamp, csvEscape, slTime, slToday, SL_DAY_SQL } from "./util.js";
import { sendSms, templates } from "./sms.js";
import { generateRoast, generateTeasers } from "./roast.js";
import { screamSass } from "./sass.js";
import { hear, hearEnabled } from "./hear.js";
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
const wallSettings = () => ({ on: true, seconds: 12, ...getSetting("wall", {}) });   // the LED wall: showing or paused, and seconds per roast

const requirePin = (which) => (req, res, next) => {
  const c = cookies(req);
  const supplied = req.headers["x-pin"] || c[`wf_${which}`];
  const expected = which === "admin" ? config.adminPin : which === "redeem" ? config.redeemPin : config.kioskPin;
  if (supplied === expected || (which !== "admin" && supplied === config.adminPin)) return next();   // the admin PIN also opens the kiosks and the redeem page
  res.status(401).json({ error: "PIN required", which });
};

const participantByToken = db.prepare("SELECT * FROM participants WHERE token = ?");
const participantByCode = db.prepare("SELECT * FROM participants WHERE code = ?");
const participantByPhone = db.prepare("SELECT * FROM participants WHERE phone = ?");
const screamsFor = db.prepare("SELECT s.*, c.code AS coupon_code, c.label AS coupon_label, c.redeemed_at AS coupon_redeemed FROM scream_attempts s LEFT JOIN coupons c ON c.id = s.coupon_id WHERE participant_id = ? ORDER BY id DESC");
const roastsFor = db.prepare("SELECT * FROM roasts WHERE participant_id = ? ORDER BY id DESC");
const countRow = db.prepare("SELECT COUNT(*) AS n FROM participants");

const isDemo = (p) => config.demoCodes.includes(p.code);   // demo guests never run out of turns
function profileUrl(p) { return `${config.baseUrl}/p/${p.token}`; }
function roastUrl(r) { return `${config.baseUrl}/r/${r.token}`; }

function publicProfile(p) {
  const screams = screamsFor.all(p.id).map((s) => ({
    id: s.id, score: s.score, loudness: s.loudness, accuracy: s.accuracy, peakDb: s.peak_db, won: !!s.won,
    coupon: s.coupon_code ? { code: s.coupon_code, label: s.coupon_label || couponSettings().valueLabel, redeemed: !!s.coupon_redeemed } : null,
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
app.get("/wall", (req, res) => res.sendFile(page("wall.html")));   // the LED wall: approved roasts, shuffled
app.get("/redeem", (req, res) => res.sendFile(page("redeem.html")));   // the Wendy's team marks coupons as redeemed here

// ---------- config for the front end ----------
app.get("/api/config", (req, res) => {
  res.json({ baseUrl: config.baseUrl, coupon: couponSettings(), scream: { ...screamSettings(), stt: hearEnabled() }, roast: { attemptsPerPerson: roastSettings().attemptsPerPerson } });
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
  sendSms(phone, templates(payload.lang).otp(code), "otp");
  db.prepare("INSERT INTO otp_requests(phone, lang, sends) VALUES (?,?,1) ON CONFLICT(phone) DO UPDATE SET sends = sends + 1, lang = excluded.lang, last_at = datetime('now')").run(phone, payload.lang);
  return code;
}
function completeRegistration(payload) {
  const { name, phone, email, dob, lang, consentMarketing, consentTerms, consentMedia } = payload;
  let p = participantByPhone.get(phone);
  let created = false;
  if (!p) {
    let code;
    do { code = guestCode(); } while (participantByCode.get(code));   // 3 numbers + 2 letters, for example 482KT
    db.prepare("INSERT INTO participants(code, token, name, phone, email, dob, lang, consent_marketing, consent_terms, consent_media) VALUES (?,?,?,?,?,?,?,?,?,?)")
      .run(code, token(), name, phone, email || null, dob || null, lang, consentMarketing ? 1 : 0, consentTerms ? 1 : 0, consentMedia ? 1 : 0);
    p = participantByPhone.get(phone);
    created = true;
  } else {
    db.prepare("UPDATE participants SET lang = ?, name = COALESCE(NULLIF(?, ''), name) WHERE id = ?").run(lang, name, p.id);
    p = participantByPhone.get(phone);
  }
  sendSms(p.phone, templates(p.lang).welcome(p.name.split(" ")[0], p.code, profileUrl(p)), "welcome");
  return { p, created };
}

app.post("/api/register", (req, res) => {
  const { name, phone, email, dob, lang = "en", consentMarketing, consentTerms, consentMedia } = req.body || {};
  const cleanName = String(name || "").trim().slice(0, 60);
  const normPhone = normalisePhone(phone);
  if (cleanName.length < 2) return res.status(400).json({ error: "name" });
  if (!normPhone) return res.status(400).json({ error: "phone" });
  if (dob && !/^\d{4}-\d{2}-\d{2}$/.test(dob)) return res.status(400).json({ error: "dob" });
  if (!consentTerms || !consentMedia) return res.status(400).json({ error: "consent" });   // both required boxes must be ticked
  const safeLang = ["en", "si", "ta"].includes(lang) ? lang : "en";
  const payload = { name: cleanName, phone: normPhone, email: email ? String(email).trim().slice(0, 120) : null, dob: dob || null, lang: safeLang, consentMarketing: !!consentMarketing, consentTerms: true, consentMedia: true };
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
  if (code !== row.code) { db.prepare("UPDATE otps SET attempts = attempts + 1 WHERE phone = ?").run(normPhone); db.prepare("UPDATE otp_requests SET wrong = wrong + 1 WHERE phone = ?").run(normPhone); return res.status(400).json({ error: "otp" }); }
  db.prepare("DELETE FROM otps WHERE phone = ?").run(normPhone);
  db.prepare("UPDATE otp_requests SET verified_at = COALESCE(verified_at, datetime('now')) WHERE phone = ?").run(normPhone);
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
  sendSms(p.phone, templates(p.lang).welcome(p.name.split(" ")[0], p.code, profileUrl(p)), "welcome");
  res.json({ ok: true });
});

app.get("/api/roast/:token", (req, res) => {
  const r = db.prepare("SELECT r.*, p.name, p.lang FROM roasts r JOIN participants p ON p.id = r.participant_id WHERE r.token = ?").get(req.params.token);
  if (!r) return res.status(404).json({ error: "not found" });
  res.json({
    token: r.token, name: r.name, lang: r.lang, vibe: r.vibe, at: r.created_at, fallback: !!r.fallback,
    title: { en: r.title_en, si: r.title_si, ta: r.title_ta }, roast: { en: r.roast_en, si: r.roast_si, ta: r.roast_ta },
    photo: r.photo_file ? `/api/roast/${r.token}/photo` : null, url: roastUrl(r), theme: CARD_THEMES.includes(r.card_theme) ? r.card_theme : "dark", keys: roastKeys(r.observations),
  });
});
// Things Wendy noticed in the photo (short phrases), used to bold keywords in the roast text.
function roastKeys(obs) { let a = obs; if (typeof a === "string") { try { a = JSON.parse(a); } catch { a = []; } } return (Array.isArray(a) ? a : []).map((x) => String(x || "").trim()).filter((x) => x && x.length <= 40 && !/^fallback line/i.test(x)).slice(0, 8); }
// The guest picks the card colour on the roast screen; the phone page then draws the same one.
const CARD_THEMES = ["paper", "blue", "dark", "red"];
app.post("/api/roast/:token/theme", (req, res) => {
  const theme = String(req.body?.theme || "");
  if (!CARD_THEMES.includes(theme)) return res.status(400).json({ error: "unknown colour" });
  const done = db.prepare("UPDATE roasts SET card_theme = ? WHERE token = ?").run(theme, String(req.params.token || ""));
  res.status(done.changes ? 200 : 404).json({ ok: !!done.changes });
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
  if (!p) return res.status(404).json({ error: "We can’t find that code. Check your SMS, or register at the QR code." });
  const screams = screamsFor.all(p.id), roasts = roastsFor.all(p.id);
  res.json({
    name: p.name, firstName: p.name.split(" ")[0], lang: p.lang, code: p.code,
    screamsUsed: isDemo(p) ? 0 : screams.length, screamsLeft: isDemo(p) ? 1 : Math.max(0, screamSettings().attemptsPerPerson - screams.length),
    roastsUsed: isDemo(p) ? 0 : roasts.length, roastsLeft: isDemo(p) ? 1 : Math.max(0, roastSettings().attemptsPerPerson - roasts.length),
    alreadyWon: !isDemo(p) && screams.some((s) => s.won), profileUrl: profileUrl(p),
  });
});

// The kiosk sends the recorded scream; we answer with the words heard. Never fails the round: no words just means "ask Chrome or the host".
// The kiosk sends the recording as raw audio (small and quick to upload); the older JSON form with base64 is still accepted for a cached page.
app.post("/api/kiosk/hear", requirePin("kiosk"), express.raw({ type: ["audio/*", "video/*", "application/octet-stream"], limit: "4mb" }), async (req, res) => {
  if (!hearEnabled()) return res.json({ text: "", error: "off" });
  const t0 = Date.now(), raw = Buffer.isBuffer(req.body), n = String(req.headers["x-try"] || "1").slice(0, 2);
  const audio = raw ? req.body : Buffer.from(String(req.body?.audio || ""), "base64"), mime = raw ? req.headers["content-type"] : req.body?.mime;
  const note = (what) => console.log(`Scream hearing: ${Math.round(audio.length / 1024)} KB, try ${n}, ${Date.now() - t0} ms, ${what}`);
  try {
    if (audio.length < 800 || audio.length > 4_000_000) { note("bad audio"); return res.json({ text: "", error: "bad-audio" }); }
    const text = await hear(audio, mime); note(text ? `heard ${text.length} characters` : "no words");
    res.json({ text, ms: Date.now() - t0 });
  } catch (e) { const error = e?.name === "TimeoutError" ? "timeout" : "failed"; note(`${error}: ${String(e?.message || e).slice(0, 120)}`); res.json({ text: "", error, ms: Date.now() - t0 }); }
});
// A tiny request the kiosk sends just before the recording, so the connection is already open.
app.get("/api/ping", (req, res) => res.set("Cache-Control", "no-store").json({ ok: true }));
// The word could not be checked twice (a technical fault): nothing is saved and the guest's attempt is not used. Kept in the log only.
app.post("/api/kiosk/miss", requirePin("kiosk"), (req, res) => {
  let s = ""; try { s = JSON.stringify(req.body?.speech || {}).slice(0, 800); } catch {}
  console.log(`Scream not scored (word check failed twice), station ${String(req.body?.station || "").slice(0, 20)}: ${s}`);
  res.json({ ok: true });
});

app.post("/api/kiosk/scream", requirePin("kiosk"), async (req, res) => {
  const { code, peakDb, sustainedDb, transcript, accuracyOverride, station, speech } = req.body || {};
  let speechLog = null; try { if (speech && typeof speech === "object") speechLog = JSON.stringify(speech).slice(0, 800); } catch {}
  const p = participantByCode.get(String(code || "").toUpperCase());
  if (!p) return res.status(404).json({ error: "code not found" });
  const s = screamSettings();
  const used = screamsFor.all(p.id);
  if (!isDemo(p) && used.length >= s.attemptsPerPerson) return res.status(409).json({ error: "No attempts left for this guest", attempts: used.length });

  const { loud, acc, score, won, reason } = judgeScream({ peakDb, sustainedDb, transcript, accuracyOverride }, s);

  let coupon = null;
  if (won && isDemo(p)) {   // our test codes never take a real coupon from the pool: they get a made-up one with a real prize name
    coupon = { id: null, code: "TEST" + String(Math.floor(Math.random() * 90000) + 10000), label: db.prepare("SELECT label FROM coupons WHERE claimed_by IS NULL ORDER BY id LIMIT 1").get()?.label || null };
  } else if (won) {
    coupon = db.prepare("SELECT * FROM coupons WHERE claimed_by IS NULL ORDER BY id LIMIT 1").get();
    if (coupon && coupon.id) db.prepare("UPDATE coupons SET claimed_by = ?, claimed_at = datetime('now'), activity = 'scream' WHERE id = ?").run(p.id, coupon.id);
  }
  const info = db.prepare("INSERT INTO scream_attempts(participant_id, peak_db, loudness, accuracy, score, transcript, won, coupon_id, station, speech, sus_db) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
    .run(p.id, Number(peakDb) || null, loud, acc, score, transcript ? String(transcript).slice(0, 200) : null, won ? 1 : 0, coupon?.id || null, station || null, speechLog, Number.isFinite(Number(sustainedDb)) ? Number(sustainedDb) : null);

  const first = p.name.split(" ")[0];
  const t = templates(p.lang);
  const label = coupon?.label || couponSettings().valueLabel;
  if (won && coupon) sendSms(p.phone, t.win(first, coupon.code, label, profileUrl(p)), "win");
  else if (won && !coupon) sendSms(p.phone, t.win(first, "(pending)", "please see a host", profileUrl(p)), "win");
  else sendSms(p.phone, t.lose(first, profileUrl(p)), "lose");

  // Shouted another restaurant's name (or anything that was not Wendy's)? Wendy answers back on the result screen.
  const rival = rivalCheck(transcript);
  const offScript = !won && transcript && (accuracyOverride === undefined || accuracyOverride === null) && (rival || reason === "unclear");
  const sass = offScript ? await screamSass({ transcript, name: first, rival, loud, acc }) : null;
  // Wendy says the comeback out loud: one short voice clip, made in the background and kept for a few minutes only
  let sassAudio = null;
  if (sass && sass.title && voiceEnabled()) {
    const t = "s" + token(12), head = /[.!?]["”']?$/.test(sass.title.trim()) ? sass.title.trim() : sass.title.trim() + ".";
    startVoice(t, `${head} ${sass.text || ""}`, `[teasing] ${head} [short pause] [playfully sarcastic] ${sass.text || ""}`);
    sassAudio = `/api/kiosk/lines-audio/${t}`;
    setTimeout(() => fs.rm(voiceFile(t), { force: true }, () => {}), 5 * 60_000);
  }

  res.json({
    attemptId: info.lastInsertRowid, name: first, score, loudness: loud, accuracy: acc, threshold: s.threshold, minLoud: s.minLoud, minAcc: s.minAcc, reason, won, sass, sassAudio,
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
  const lines = await generateTeasers({ imageBase64: m[2], mediaType: m[1], name: p.name.split(" ")[0] });
  // Wendy says the first three out loud: one short voice clip, made in the background and kept for a few minutes only
  let audio = null; const spoken = lines.slice(0, 3);
  if (voiceEnabled() && spoken.length === 3) {
    const t = "w" + token(12);
    startVoice(t, spoken.join(" "), spoken.map((l, i) => `[${["amused", "teasing", "smug"][i]}] ${l}`).join(" "));
    audio = `/api/kiosk/lines-audio/${t}`;
    setTimeout(() => fs.rm(voiceFile(t), { force: true }, () => {}), 5 * 60_000);
  }
  res.json({ lines, audio, spoken: spoken.length });
});
app.get("/api/kiosk/lines-audio/:t", async (req, res) => {
  const t = String(req.params.t || "");
  if (!/^[ws][A-Za-z0-9_-]{8,}$/.test(t) || !(await voiceReady(t, 12_000))) return res.status(404).json({ error: "no voice clip" });
  res.set("Cache-Control", "private, no-store").type("audio/mpeg").sendFile(voiceFile(t));
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
  sendSms(p.phone, templates(p.lang).roast(p.name.split(" ")[0], roastUrl(r)), "roast");
  startVoice(rtoken, result.roast.en, result.voice);   // English voice-over, made in the background
  res.json({ token: rtoken, url: roastUrl(r), name: p.name.split(" ")[0], lang: p.lang, title: result.title, roast: result.roast, vibe: result.vibe, fallback: !!result.fallback, keys: roastKeys(result.observations), photo: `/api/roast/${rtoken}/photo`, audio: voiceEnabled() ? `/api/roast/${rtoken}/audio` : null });
});

// ---------- redeeming coupons (the Wendy's team, their own access code) ----------
// They type a winner's code, see whose it is and what it is for, and mark it as redeemed. Only codes that were actually won can be looked up,
// so the unused pool is never shown here.
const redeemTries = new Map();
app.post("/api/redeem/login", (req, res) => {
  const ip = String(req.headers["x-forwarded-for"] || req.ip || "").split(",")[0].trim(), now = Date.now(), bad = (redeemTries.get(ip) || []).filter((t) => now - t < 5 * 60_000);
  if (bad.length >= 8) return res.status(429).json({ error: "Too many wrong codes. Try again in a few minutes." });
  const pin = String(req.body?.pin || "").trim();
  if (pin && (pin === config.redeemPin || pin === config.adminPin)) { redeemTries.delete(ip); setCookie(res, "wf_redeem", pin, 7); return res.json({ ok: true }); }
  bad.push(now); redeemTries.set(ip, bad); res.status(401).json({ error: "Wrong access code" });
});
const couponRow = "SELECT c.*, p.name, p.phone FROM coupons c JOIN participants p ON p.id = c.claimed_by";
const couponView = (c) => ({ code: c.code, prize: c.label || couponSettings().valueLabel, winner: String(c.name || "").split(" ")[0], phone: maskPhone(c.phone), wonAt: slTime(c.claimed_at), redeemed: !!c.redeemed_at, redeemedAt: slTime(c.redeemed_at), note: c.redeemed_note || "" });
const cleanCode = (v) => String(v || "").toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 40);
app.get("/api/redeem/find", requirePin("redeem"), (req, res) => {
  const c = db.prepare(couponRow + " WHERE c.code = ?").get(cleanCode(req.query.code));
  if (!c) return res.status(404).json({ error: "This code has not been won by anyone. Check the numbers and try again." });
  res.json(couponView(c));
});
app.post("/api/redeem/mark", requirePin("redeem"), (req, res) => {
  const c = db.prepare(couponRow + " WHERE c.code = ?").get(cleanCode(req.body?.code));
  if (!c) return res.status(404).json({ error: "This code has not been won by anyone." });
  if (req.body?.undo) db.prepare("UPDATE coupons SET redeemed_at = NULL, redeemed_note = NULL WHERE id = ?").run(c.id);
  else { if (c.redeemed_at) return res.status(409).json({ error: "Already redeemed", ...couponView(c) });
    db.prepare("UPDATE coupons SET redeemed_at = datetime('now'), redeemed_note = ? WHERE id = ? AND redeemed_at IS NULL").run(String(req.body?.note || "").trim().slice(0, 80) || null, c.id); }
  console.log(`Coupon ${req.body?.undo ? "un-redeemed" : "redeemed"}: id ${c.id}`);
  res.json(couponView(db.prepare(couponRow + " WHERE c.id = ?").get(c.id)));
});
app.get("/api/redeem/list", requirePin("redeem"), (req, res) => {
  const rows = db.prepare(couponRow + " ORDER BY c.claimed_at DESC LIMIT 1000").all();
  res.json({ won: rows.length, redeemed: rows.filter((c) => c.redeemed_at).length, rows: rows.map(couponView), now: slTime(new Date().toISOString().slice(0, 19).replace("T", " ")) });
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
    timeZone: "Asia/Colombo", today: slToday(), now: slTime(new Date().toISOString().slice(0, 19).replace("T", " ")),   // the admin page shows Sri Lanka time
    recent: db.prepare(`SELECT p.name, p.code, s.score, s.won, s.created_at, c.code AS coupon FROM scream_attempts s JOIN participants p ON p.id = s.participant_id LEFT JOIN coupons c ON c.id = s.coupon_id ORDER BY s.id DESC LIMIT 15`).all().map((r) => ({ ...r, created_at: slTime(r.created_at) })),
    recentRoasts: db.prepare(`SELECT p.name, r.token, r.title_en, r.fallback, r.created_at FROM roasts r JOIN participants p ON p.id = r.participant_id ORDER BY r.id DESC LIMIT 15`).all().map((r) => ({ ...r, created_at: slTime(r.created_at) })),
    leaderboard: db.prepare(`SELECT p.name, MAX(s.score) AS score FROM scream_attempts s JOIN participants p ON p.id = s.participant_id GROUP BY p.id ORDER BY score DESC LIMIT 10`).all(),
  });
});
// ----- the numbers page: sign-up funnel, who played what, messages sent. ?real=1 leaves out the test codes (DEMO_CODES).
const maskPhone = (ph) => String(ph || "").replace(/^(94)(\d{2})\d{5}(\d{2})$/, "+$1 $2 *** **$3");
app.get("/api/admin/overview", requirePin("admin"), (req, res) => {
  const testIds = config.demoCodes.map((c) => participantByCode.get(c)?.id).filter(Boolean), real = req.query.real === "1" && testIds.length > 0;
  const notP = real ? ` AND p.id NOT IN (${testIds.join(",")})` : "", notA = real ? ` AND participant_id NOT IN (${testIds.join(",")})` : "";
  const n = (sql) => db.prepare(sql).get().n || 0, all = (sql) => db.prepare(sql).all();
  const HALF = "FROM otp_requests o WHERE NOT EXISTS (SELECT 1 FROM participants p WHERE p.phone = o.phone)";
  const registered = n(`SELECT COUNT(*) n FROM participants p WHERE 1=1${notP}`), half = n(`SELECT COUNT(*) n ${HALF}`);
  const screamPeople = n(`SELECT COUNT(DISTINCT participant_id) n FROM scream_attempts WHERE 1=1${notA}`), roastPeople = n(`SELECT COUNT(DISTINCT participant_id) n FROM roasts WHERE 1=1${notA}`);
  const both = n(`SELECT COUNT(*) n FROM participants p WHERE EXISTS (SELECT 1 FROM scream_attempts s WHERE s.participant_id = p.id) AND EXISTS (SELECT 1 FROM roasts r WHERE r.participant_id = p.id)${notP}`);
  const played = screamPeople + roastPeople - both;
  // one line per Sri Lanka calendar day
  const days = {}, put = (key, sql) => { for (const r of all(sql)) if (r.d) (days[r.d] ||= { day: r.d })[key] = r.n; };
  put("started", `SELECT ${SL_DAY_SQL("first_at")} d, COUNT(*) n FROM otp_requests GROUP BY d`);
  put("half", `SELECT ${SL_DAY_SQL("o.first_at")} d, COUNT(*) n ${HALF} GROUP BY d`);
  put("otpSms", `SELECT ${SL_DAY_SQL("created_at")} d, COUNT(*) n FROM sms_log WHERE kind = 'otp' GROUP BY d`);
  put("registered", `SELECT ${SL_DAY_SQL("p.created_at")} d, COUNT(*) n FROM participants p WHERE 1=1${notP} GROUP BY d`);
  put("screamPeople", `SELECT ${SL_DAY_SQL("created_at")} d, COUNT(DISTINCT participant_id) n FROM scream_attempts WHERE 1=1${notA} GROUP BY d`);
  put("screams", `SELECT ${SL_DAY_SQL("created_at")} d, COUNT(*) n FROM scream_attempts WHERE 1=1${notA} GROUP BY d`);
  put("wins", `SELECT ${SL_DAY_SQL("created_at")} d, COUNT(*) n FROM scream_attempts WHERE won = 1${notA} GROUP BY d`);
  put("roastPeople", `SELECT ${SL_DAY_SQL("created_at")} d, COUNT(DISTINCT participant_id) n FROM roasts WHERE 1=1${notA} GROUP BY d`);
  put("roasts", `SELECT ${SL_DAY_SQL("created_at")} d, COUNT(*) n FROM roasts WHERE 1=1${notA} GROUP BY d`);
  const sms = {}; for (const r of all("SELECT COALESCE(kind, 'other') kind, status, COUNT(*) n FROM sms_log GROUP BY 1, 2")) (sms[r.kind] ||= { kind: r.kind, sent: 0, failed: 0 })[r.status === "failed" ? "failed" : "sent"] += r.n;
  res.json({
    today: slToday(), now: slTime(new Date().toISOString().slice(0, 19).replace("T", " ")), testCodes: config.demoCodes, real,
    signup: { started: registered + half, registered, half, otpSms: n("SELECT COUNT(*) n FROM sms_log WHERE kind = 'otp'"), otpFailed: n("SELECT COUNT(*) n FROM sms_log WHERE kind = 'otp' AND status = 'failed'"),
      wrongCodes: n("SELECT SUM(wrong) n FROM otp_requests"), marketingYes: n(`SELECT COUNT(*) n FROM participants p WHERE consent_marketing = 1${notP}`) },
    games: { played, notPlayed: Math.max(0, registered - played), both, screamPeople, roastPeople, screamOnly: screamPeople - both, roastOnly: roastPeople - both,
      screams: n(`SELECT COUNT(*) n FROM scream_attempts WHERE 1=1${notA}`), wins: n(`SELECT COUNT(*) n FROM scream_attempts WHERE won = 1${notA}`), winners: n(`SELECT COUNT(DISTINCT participant_id) n FROM scream_attempts WHERE won = 1${notA}`),
      roasts: n(`SELECT COUNT(*) n FROM roasts WHERE 1=1${notA}`), roastFallbacks: n(`SELECT COUNT(*) n FROM roasts WHERE fallback = 1${notA}`),
      couponsTotal: n("SELECT COUNT(*) n FROM coupons"), couponsLeft: n("SELECT COUNT(*) n FROM coupons WHERE claimed_by IS NULL"), couponsRedeemed: n("SELECT COUNT(*) n FROM coupons WHERE redeemed_at IS NOT NULL") },
    days: Object.values(days).sort((a, b) => (a.day < b.day ? 1 : -1)).slice(0, 60),
    sms: Object.values(sms),
    langs: all(`SELECT p.lang, COUNT(*) n FROM participants p WHERE 1=1${notP} GROUP BY p.lang ORDER BY n DESC`),
    stations: { scream: all(`SELECT COALESCE(NULLIF(station, ''), 'not named') station, COUNT(*) n, SUM(won) wins FROM scream_attempts WHERE 1=1${notA} GROUP BY 1 ORDER BY n DESC`),
      roast: all(`SELECT COALESCE(NULLIF(station, ''), 'not named') station, COUNT(*) n FROM roasts WHERE 1=1${notA} GROUP BY 1 ORDER BY n DESC`) },
  });
});
// The guest list: search by name, code or phone; filter by what they played. 50 a page.
app.get("/api/admin/guests", requirePin("admin"), (req, res) => {
  const q = String(req.query.q || "").trim().slice(0, 40).replace(/[%_]/g, ""), f = String(req.query.f || "all"), per = 50, page = clamp(Number(req.query.page) || 1, 1, 9999);
  const S = "(SELECT COUNT(*) FROM scream_attempts s WHERE s.participant_id = p.id)", R = "(SELECT COUNT(*) FROM roasts r WHERE r.participant_id = p.id)", W = "(SELECT COUNT(*) FROM scream_attempts s WHERE s.participant_id = p.id AND s.won = 1)";
  const where = ["1=1"], args = [];
  if (q) { const digits = q.replace(/\D/g, "").replace(/^0/, ""); where.push(`(p.name LIKE ? OR p.code LIKE ?${digits.length >= 3 ? " OR p.phone LIKE ?" : ""})`); args.push(`%${q}%`, `%${q.toUpperCase().replace(/\s/g, "")}%`); if (digits.length >= 3) args.push(`%${digits}%`); }
  const F = { scream: `${S} > 0`, roast: `${R} > 0`, both: `${S} > 0 AND ${R} > 0`, none: `${S} = 0 AND ${R} = 0`, won: `${W} > 0` }; if (F[f]) where.push(F[f]);
  const total = db.prepare(`SELECT COUNT(*) n FROM participants p WHERE ${where.join(" AND ")}`).get(...args).n;
  const rows = db.prepare(`SELECT p.id, p.name, p.code, p.phone, p.lang, p.token, p.created_at, p.consent_marketing, ${S} AS screams, ${W} AS wins, ${R} AS roasts,
      (SELECT MAX(score) FROM scream_attempts s WHERE s.participant_id = p.id) AS best,
      (SELECT GROUP_CONCAT(c.code, ', ') FROM coupons c WHERE c.claimed_by = p.id) AS coupons,
      (SELECT token FROM roasts r WHERE r.participant_id = p.id ORDER BY r.id DESC LIMIT 1) AS roast_token
      FROM participants p WHERE ${where.join(" AND ")} ORDER BY p.id DESC LIMIT ${per} OFFSET ${(page - 1) * per}`).all(...args);
  res.json({ total, page, per, rows: rows.map(({ token: t, created_at, phone, ...r }) => ({ ...r, phone: "+" + phone, registered: slTime(created_at), test: config.demoCodes.includes(r.code), pass: `/p/${t}`, roast: r.roast_token ? `/r/${r.roast_token}` : null })) });
});
// Half registered: asked for a sign-up code, never finished. The number is shown masked because it was never confirmed as theirs.
app.get("/api/admin/half", requirePin("admin"), (req, res) => {
  const rows = db.prepare(`SELECT o.phone, o.lang, o.sends, o.wrong, o.first_at, o.last_at, (SELECT expires_at FROM otps t WHERE t.phone = o.phone) AS expires
      FROM otp_requests o WHERE NOT EXISTS (SELECT 1 FROM participants p WHERE p.phone = o.phone) ORDER BY o.last_at DESC LIMIT 500`).all();
  res.json({ rows: rows.map((r) => ({ phone: maskPhone(r.phone), lang: r.lang, sends: r.sends, wrong: r.wrong, first: slTime(r.first_at), last: slTime(r.last_at), waiting: !!r.expires && r.expires > Date.now() })) });
});

// ----- the LED wall. The wall page asks for this list; only roasts approved on the admin page are in it. Needs the kiosk PIN, like the kiosks.
const wallRow = (r) => ({ token: r.token, name: String(r.name || "").split(" ")[0], lang: r.lang, title: { en: r.title_en, si: r.title_si, ta: r.title_ta }, roast: { en: r.roast_en, si: r.roast_si, ta: r.roast_ta }, photo: `/api/roast/${r.token}/photo`, keys: roastKeys(r.observations) });
app.get("/api/wall", requirePin("kiosk"), (req, res) => {
  const w = wallSettings();
  const rows = w.on ? db.prepare("SELECT r.*, p.name, p.lang FROM roasts r JOIN participants p ON p.id = r.participant_id WHERE r.wall = 1 AND r.photo_file IS NOT NULL ORDER BY r.wall_at DESC LIMIT 300").all() : [];
  res.set("Cache-Control", "no-store").json({ on: !!w.on, seconds: w.seconds, roasts: rows.map(wallRow) });
});
// The admin page's list of roasts to approve: f = waiting | wall | all. 60 a page, newest first.
app.get("/api/admin/roasts", requirePin("admin"), (req, res) => {
  const f = String(req.query.f || "waiting"), per = 60, page = clamp(Number(req.query.page) || 1, 1, 9999), where = f === "wall" ? "r.wall = 1" : f === "all" ? "1=1" : "r.wall = 0";
  const count = (w) => db.prepare(`SELECT COUNT(*) n FROM roasts r WHERE ${w} AND r.photo_file IS NOT NULL`).get().n;
  const rows = db.prepare(`SELECT r.*, p.name, p.lang, p.code FROM roasts r JOIN participants p ON p.id = r.participant_id WHERE ${where} AND r.photo_file IS NOT NULL ORDER BY r.id DESC LIMIT ${per} OFFSET ${(page - 1) * per}`).all();
  res.json({ total: count(where), waiting: count("r.wall = 0"), onWall: count("r.wall = 1"), page, per, wall: wallSettings(),
    rows: rows.map((r) => ({ ...wallRow(r), fullName: r.name, code: r.code, at: slTime(r.created_at), onWall: !!r.wall, fallback: !!r.fallback, test: config.demoCodes.includes(r.code) })) });
});
app.post("/api/admin/roasts/:token/wall", requirePin("admin"), (req, res) => {
  const on = req.body?.on ? 1 : 0, done = db.prepare("UPDATE roasts SET wall = ?, wall_at = CASE WHEN ? = 1 THEN datetime('now') ELSE NULL END WHERE token = ?").run(on, on, String(req.params.token || ""));
  res.status(done.changes ? 200 : 404).json({ ok: !!done.changes, onWall: !!on });
});

// ----- how hard Scream & Win is. Four levels the owner can pick on the admin page; each is just a set of the scoring numbers.
// The mic's top end (dbCeil) moves up with the level, so only a really loud shout reaches a high loudness score.
const SCREAM_LEVELS = [
  { key: "easy", label: "Easy", set: { threshold: 75, minLoud: 60, dbCeil: -6 } },
  { key: "medium", label: "Medium", set: { threshold: 82, minLoud: 75, dbCeil: -4 } },
  { key: "hard", label: "Hard", set: { threshold: 88, minLoud: 85, dbCeil: -2 } },
  { key: "extra", label: "Very hard", set: { threshold: 93, minLoud: 92, dbCeil: -1 } },
];
// For each level: how many of the recent screams with a clear "Wendy's" would have won. Older rows have no saved loudness in dB, so it is worked back from their score.
app.get("/api/admin/scream-levels", requirePin("admin"), (req, res) => {
  const cur = screamSettings(), rows = db.prepare("SELECT peak_db, loudness, accuracy, sus_db FROM scream_attempts WHERE accuracy >= ? ORDER BY id DESC LIMIT 200").all(cur.minAcc ?? 70)
    .map((r) => ({ acc: r.accuracy, db: r.sus_db ?? (r.loudness < 100 ? -42 + r.loudness * 0.36 : Math.max(-6, (r.peak_db ?? -3) - 2.5)) }));
  const wins = (set) => { const s = { ...cur, ...set }; return rows.filter((r) => judgeScream({ sustainedDb: r.db, accuracyOverride: r.acc }, s).won).length; };
  const same = (set) => Object.entries(set).every(([k, v]) => Number(cur[k]) === v);
  res.json({ clear: rows.length, now: wins({}), levels: SCREAM_LEVELS.map((l) => ({ ...l, wins: wins(l.set), on: same(l.set) })) });
});

app.put("/api/admin/settings", requirePin("admin"), (req, res) => {
  const { scream, coupon, roast, wall } = req.body || {};
  if (wall) setSetting("wall", { on: !!wall.on, seconds: clamp(Number(wall.seconds) || 12, 5, 120) });
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
  const rows = db.prepare(`SELECT p.id, p.created_at, p.name, p.phone, p.email, p.dob, p.lang, p.code, p.consent_terms, p.consent_media, p.consent_marketing,
      (SELECT MAX(score) FROM scream_attempts s WHERE s.participant_id = p.id) AS best_scream,
      (SELECT COUNT(*) FROM scream_attempts s WHERE s.participant_id = p.id AND won = 1) AS wins,
      (SELECT GROUP_CONCAT(c.code) FROM coupons c WHERE c.claimed_by = p.id) AS coupons,
      (SELECT COUNT(*) FROM roasts r WHERE r.participant_id = p.id) AS roasts
      FROM participants p ORDER BY p.id`).all().map(({ created_at, ...r }) => ({ id: r.id, registered_sri_lanka_time: slTime(created_at), ...r }));   // times in the export are Sri Lanka time
  const head = Object.keys(rows[0] || { id: 1 });
  res.type("text/csv").attachment("wendyfest-participants.csv")
    .send([head.join(","), ...rows.map((r) => head.map((h) => csvEscape(r[h])).join(","))].join("\n"));
});
app.post("/api/admin/resend", requirePin("admin"), (req, res) => {
  const p = participantByCode.get(String(req.body?.code || "").toUpperCase());
  if (!p) return res.status(404).json({ error: "code not found" });
  sendSms(p.phone, templates(p.lang).welcome(p.name.split(" ")[0], p.code, profileUrl(p)), "welcome");
  res.json({ ok: true });
});

app.use(express.static(pub, { extensions: ["html"] }));
app.use((req, res) => res.status(404).sendFile(page("404.html")));

app.listen(config.port, () => {
  console.log(`\n🍔 Wendy Fest running on ${config.baseUrl}`);
  console.log(`   Guest QR  → ${config.baseUrl}/register`);
  console.log(`   Kiosk     → ${config.baseUrl}/kiosk   (PIN ${config.kioskPin === "2468" ? "2468, the default" : "set in the env file"})`);
  console.log(`   Admin     → ${config.baseUrl}/admin   (PIN ${config.adminPin === "1357" ? "1357, the default" : "set in the env file"})`);
  console.log(`   SMS provider: ${config.sms.provider} · Roast model: ${config.roast.model} · API key: ${config.anthropicApiKey ? "set" : "MISSING (fallback roasts)"}\n`);
});

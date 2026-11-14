import crypto from "node:crypto";

// No 0/O/1/I to avoid kiosk typing mistakes.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function shortCode(len = 6) {
  const bytes = crypto.randomBytes(len);
  let s = "";
  for (let i = 0; i < len; i++) s += ALPHABET[bytes[i] % ALPHABET.length];
  return s;
}
export function token(len = 24) {
  return crypto.randomBytes(len).toString("base64url");
}

// Sri Lankan numbers: 07X XXXXXXX -> 947XXXXXXXX. Accepts +94, 94, 0 prefixes.
export function normalisePhone(raw) {
  if (!raw) return null;
  let d = String(raw).replace(/[^\d]/g, "");
  if (d.startsWith("0094")) d = d.slice(2);
  if (d.startsWith("0")) d = "94" + d.slice(1);
  if (d.length === 9 && d.startsWith("7")) d = "94" + d;
  if (!/^947\d{8}$/.test(d)) return null;
  return d;
}

export function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

// Levenshtein similarity 0..1
export function similarity(a, b) {
  a = (a || "").toLowerCase(); b = (b || "").toLowerCase();
  if (!a.length && !b.length) return 1;
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++)
    dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return 1 - dp[m][n] / Math.max(m, n);
}

// How closely a speech-recognition transcript matches "Wendy's".
// Recognisers hear screams as all sorts of things, so we score against a bank of
// phonetic neighbours and take the best match of any word/bigram in the transcript.
const TARGETS = ["wendys", "wendy", "wendies", "windies", "wendis", "vendis", "vendys", "whendies", "wendee", "wendeez", "wendies", "when these", "when days", "windys", "wendy's"];
export function wendysAccuracy(transcript) {
  if (!transcript) return 0;
  const clean = transcript.toLowerCase().replace(/[^a-z\s']/g, " ").replace(/\s+/g, " ").trim();
  if (!clean) return 0;
  const words = clean.split(" ");
  const candidates = [...words];
  for (let i = 0; i < words.length - 1; i++) candidates.push(words[i] + " " + words[i + 1], words[i] + words[i + 1]);
  candidates.push(clean, clean.replace(/\s/g, ""));
  let best = 0;
  for (const c of candidates) for (const t of TARGETS) {
    const s = similarity(c.replace(/'/g, ""), t.replace(/'/g, ""));
    if (s > best) best = s;
  }
  // Soften the curve: 0.6 similarity (e.g. "windy") still gets partial credit.
  return clamp(Math.round(((best - 0.35) / 0.65) * 100), 0, 100);
}

export function loudnessScore(peakDb, floor, ceil) {
  if (peakDb === null || peakDb === undefined || Number.isNaN(peakDb)) return 0;
  return clamp(Math.round(((peakDb - floor) / (ceil - floor)) * 100), 0, 100);
}

export function csvEscape(v) {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

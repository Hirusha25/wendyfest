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

// ---------- Scream judging (strict) ----------
// The guest must say "WENDY'S" — with the S. "Wendy" alone, "windy", or other words don't pass.
// Speech recognisers spell the same sound differently, so each group lists the spellings we accept.
const WITH_S = ["wendys", "wendies"];                                                              // the real word
const WITH_S_NEAR = ["wendis", "wendees", "wendeez", "wendyz", "windies", "windys", "vendys", "vendis", "whendies", "wendes", "when these", "wen these", "wendy is", "wendy s"];
const NO_S = ["wendy", "wendi", "wendee", "windy", "vendy", "when the", "wendie"];
const tokenise = (t) => (t || "").toLowerCase().replace(/[^a-z\s']/g, " ").replace(/'/g, "").replace(/\s+/g, " ").trim();
const bestSim = (c, list) => list.reduce((m, t) => Math.max(m, similarity(c, t)), 0);

// Looks only at the FIRST thing that sounds like the target word: one shot, no repeating until it lands.
export function wendysCheck(transcript) {
  const clean = tokenise(transcript);
  if (!clean) return { accuracy: 0, reason: "unclear", heard: "" };
  const words = clean.split(" ");
  const cands = [];
  for (let i = 0; i < words.length; i++) { if (i < words.length - 1) cands.push(words[i] + " " + words[i + 1]); cands.push(words[i]); }   // two-word form first, so "wendy is" counts as Wendy's
  let overall = 0;
  for (const c of cands) {
    const exact = bestSim(c, WITH_S), near = bestSim(c, WITH_S_NEAR), noS = bestSim(c, NO_S);
    overall = Math.max(overall, exact, near, noS);
    if (Math.max(exact, near, noS) < 0.75) continue;                           // not an attempt at the word yet
    let accuracy, reason;
    if (exact === 1) { accuracy = 100; reason = "ok"; }
    else if (noS >= Math.max(exact, near)) { accuracy = Math.round(20 + 20 * noS); reason = "no_s"; }  // said Wendy, missed the S: max 40
    else { accuracy = Math.round(60 + 30 * ((Math.max(exact, near) - 0.75) / 0.25)); reason = "ok"; }  // close spelling of Wendy's: 60–90
    if (words.length > 4) accuracy = Math.max(0, accuracy - 10);              // lots of extra words: small penalty
    return { accuracy, reason, heard: c };
  }
  return { accuracy: Math.round(overall * 25), reason: "unclear", heard: "" };  // never got near the word: max 25
}
export const wendysAccuracy = (transcript) => wendysCheck(transcript).accuracy;

// ---------- Scream sass: the guest shouted another restaurant's name ----------
// The lines tease the guest for shouting the wrong name. They never comment on the other brand itself.
const RIVALS = [
  ["KFC", /\b(kfc|k f c|kentucky)\b/],
  ["McDonald's", /\b(mc ?donalds?|mac ?donalds?|mcd|maccas|big mac)\b/],
  ["Burger King", /\b(burger king|whopper)\b/],
  ["Pizza Hut", /\bpizza hut\b/],
  ["Domino's", /\bdominos?\b/],
  ["Subway", /\bsubway\b/],
  ["Taco Bell", /\btaco bell\b/],
  ["Popeyes", /\bpopeyes?\b/],
];
export function rivalCheck(transcript) {
  const t = String(transcript || "").toLowerCase().replace(/['’.]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  const hit = t && RIVALS.find(([, re]) => re.test(t));
  return hit ? hit[0] : null;
}
const RIVAL_LINES = [
  "We heard “{rival}”. Wrong restaurant, {name}. This meter only answers to “Wendy’s”.",
  "“{rival}”? Bold thing to shout at a Wendy’s booth, {name}. We are not angry. Just square.",
  "You shouted “{rival}” at Wendy’s, {name}. The meter pretended not to hear. Try our name next time.",
  "Great lungs, {name}. Wrong name. It is W-E-N-D-Y, apostrophe, S.",
  "“{rival}”, {name}? We will let that one go. Once. Next time, say it with the S: Wendy’s.",
];
export function rivalLine(rival, name) {
  const pick = RIVAL_LINES[Math.floor(Math.random() * RIVAL_LINES.length)];
  return { title: "Wrong restaurant.", text: pick.replaceAll("{rival}", rival).replaceAll("{name}", name || "friend"), rival, ai: false };
}

export function loudnessScore(peakDb, floor, ceil) {
  if (peakDb === null || peakDb === undefined || Number.isNaN(peakDb)) return 0;
  return clamp(Math.round(((peakDb - floor) / (ceil - floor)) * 100), 0, 100);
}

// Full verdict. Loudness uses the loudest SUSTAINED half-second (a single clap or tap can't max it).
// To win, all three must pass: overall score ≥ threshold, loudness ≥ minLoud, clarity ≥ minAcc.
export function judgeScream({ peakDb, sustainedDb, transcript, accuracyOverride }, s) {
  const db = sustainedDb !== undefined && sustainedDb !== null && !Number.isNaN(Number(sustainedDb)) ? Number(sustainedDb) : Number(peakDb);
  const loud = loudnessScore(db, s.dbFloor, s.dbCeil);
  const check = accuracyOverride !== undefined && accuracyOverride !== null
    ? { accuracy: clamp(Number(accuracyOverride), 0, 100), reason: Number(accuracyOverride) >= (s.minAcc ?? 70) ? "ok" : Number(accuracyOverride) >= 30 ? "no_s" : "unclear", heard: "" }
    : wendysCheck(transcript);
  const acc = check.accuracy;
  const score = Math.round(loud * s.loudWeight + acc * s.accWeight);
  const okLoud = loud >= (s.minLoud ?? 60), okAcc = acc >= (s.minAcc ?? 70);
  const won = score >= s.threshold && okLoud && okAcc;
  const reason = won ? "win" : check.reason === "no_s" ? "no_s" : !okAcc ? "unclear" : !okLoud ? "quiet" : "close";
  return { loud, acc, score, won, reason, heard: check.heard };
}

export function csvEscape(v) {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

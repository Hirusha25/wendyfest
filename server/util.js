import crypto from "node:crypto";

// No 0/O/1/I to avoid kiosk typing mistakes.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function shortCode(len = 6) {
  const bytes = crypto.randomBytes(len);
  let s = "";
  for (let i = 0; i < len; i++) s += ALPHABET[bytes[i] % ALPHABET.length];
  return s;
}
// Guest code: 3 numbers then 2 letters, for example 482KT (owner, Nov 2026). The kiosk shows a number pad, then a letter pad.
// To make it easy to type, the two letters are always next to each other on the kiosk's letter pad (6 letters a row), or the same letter twice.
export const CODE_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";   // no I or O: they look like 1 and 0
export function guestCode() {
  const b = crypto.randomBytes(6), d = (n) => String(b[n] % 10), i = b[3] % CODE_LETTERS.length, row = Math.floor(i / 6), col = i % 6;
  const near = [i]; if (col > 0) near.push(i - 1); if (col < 5) near.push(i + 1); if (row > 0) near.push(i - 6); if (row < 3) near.push(i + 6);
  return d(0) + d(1) + d(2) + CODE_LETTERS[i] + CODE_LETTERS[near[b[4] % near.length]];
}
export const isGuestCode = (c) => new RegExp(`^\\d{3}[${CODE_LETTERS}]{2}$`).test(String(c || ""));
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

// Sri Lanka Standard Time (UTC+5:30, no daylight saving). The database stores every time in UTC, which never shifts with the
// server's own clock or location; anything a person reads (admin lists, the export, "today") is turned into Sri Lanka time here.
export const SL_OFFSET_MIN = 330;
export function slTime(utc) {            // "2026-11-27 04:10:00" (UTC) -> "2026-11-27 09:40:00" (Sri Lanka)
  if (!utc) return utc; const d = new Date(String(utc).replace(" ", "T") + "Z"); if (isNaN(d)) return utc;
  return new Date(d.getTime() + SL_OFFSET_MIN * 60000).toISOString().slice(0, 19).replace("T", " ");
}
export function slToday(now = Date.now()) { return new Date(now + SL_OFFSET_MIN * 60000).toISOString().slice(0, 10); }   // today's date in Sri Lanka
export const SL_DAY_SQL = (col) => `date(${col}, '+5 hours', '+30 minutes')`;   // the Sri Lanka calendar day of a stored UTC time, for SQL

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
    // It must be the guest's own shout, not a sentence that happens to contain the word (owner, 28 Nov 2026: the stage announcer saying "...the most iconic Wendy's burgers..." was winning for whoever stood at the kiosk).
    // Count the words that are NOT the target word; a real shout is "Wendy's", perhaps repeated, with at most two stray words.
    const isW = (w) => Math.max(bestSim(w, WITH_S), bestSim(w, WITH_S_NEAR), bestSim(w, NO_S)) >= 0.75;
    let extra = 0; words.forEach((w, i) => { if (isW(w)) return; if ((w === "is" || w === "s") && i > 0 && isW(words[i - 1])) return; extra++; });
    if (extra > 2) return { accuracy: Math.min(accuracy, 30), reason: "unclear", heard: c, sentence: true };
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
// Each comeback is [headline, follow-up]: the headline is the sassy punchline shown big, the follow-up sits small beside it.
const RIVAL_LINES = [
  ["“{rival}”? Wrong restaurant, {name}.", "This meter only answers to “Wendy’s”. Say it loud next time."],
  ["“{rival}”? Bold, {name}.", "Shouting that at a Wendy’s booth takes courage. We are not angry. Just square."],
  ["We did not hear “{rival}”.", "The meter pretended, {name}. Try our name next time: “Wendy’s”."],
  ["Great lungs. Wrong name.", "It is W-E-N-D-Y, apostrophe, S, {name}."],
  ["“{rival}”? Just this once.", "We will let that one go, {name}. Next time, say it with the S: “Wendy’s”."],
];
const fillSass = ([h, d], vars) => { const f = (t) => Object.entries(vars).reduce((x, [k, v]) => x.replaceAll("{" + k + "}", v), t); return { title: f(h), text: f(d) }; };
export function rivalLine(rival, name) {
  return { ...fillSass(RIVAL_LINES[Math.floor(Math.random() * RIVAL_LINES.length)], { rival, name: name || "friend" }), rival, ai: false };
}

// The guest shouted something else entirely: build the comeback around the words the microphone heard.
// Used when no AI key is set (and in the demo build); with a key, the AI writes the line instead.
const UNSAFE = /\*|\b(fuck\w*|shit\w*|bitch\w*|ass|asshole|dick|cock|pussy|cunt|bastard|slut|whore|sex\w*|porn\w*|nude|rape\w*|kill\w*|die|dead|bomb\w*|terror\w*|nigg\w*|fag\w*|retard\w*|drunk|beer|vodka|arrack|weed|drugs?)\b/i;
const HEARD_KINDS = [
  [/\b(pizza|burgers?|chicken|kottu|rice|biryani|fries|noodles|coffee|tea|cake|ice cream|chocolate|food|hungry|lunch|dinner|roti|hoppers?)\b/, [
    ["“{heard}”? Now you’re ordering.", "The password is “Wendy’s”, {name}."],
    ["Hungry, {name}?", "You shouted “{heard}”. Shout “Wendy’s” and we will talk."],
  ]],
  [/\b(hello|hi|hey|good morning|good evening|ayubowan|vanakkam|how are you)\b/, [
    ["“{heard}” to you too.", "Lovely manners, {name}. Wrong word. It is “Wendy’s”."],
    ["No small talk, {name}.", "“{heard}” is polite. The meter wants “Wendy’s”."],
  ]],
  [/\b(love|i love you|marry me|darling)\b/, [
    ["We love you too, {name}.", "Now say “Wendy’s” like you mean it."],
  ]],
  [/\b(amma|mummy|mommy|mama|help|aiyo|oh no|oh my god)\b/, [
    ["Nobody is coming, {name}.", "“{heard}” will not save you. Only “Wendy’s” works here."],
  ]],
  [/^(a+h*|o+h*|wo+|woo+hoo+|ye+a*h*|ya+y*|ha+|he+y*|e+)( (a+h*|o+h*|wo+|ye+a*h*|ha+))*$/, [
    ["Great scream. No word.", "Add one word to that “{heard}”, {name}: “Wendy’s”."],
  ]],
];
const HEARD_ANY = [
  ["“{heard}”? Interesting.", "The meter was hoping for “Wendy’s”, {name}."],
  ["Good volume. Wrong word.", "You shouted “{heard}”, {name}. Try “Wendy’s”."],
  ["“{heard}” is not our name.", "A fine thing to shout, {name}. Now say “Wendy’s”."],
];
export function heardLine(transcript, name) {
  const words = String(transcript || "").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (!words.length) return null;
  const n = name || "friend", pick = (a) => a[Math.floor(Math.random() * a.length)];
  if (UNSAFE.test(words.join(" "))) return { title: `We heard that, ${n}.`, text: "It is not going on the big screen. The word we want is “Wendy’s”.", rival: null, ai: false };
  let heard = words.slice(0, 3).join(" ").replace(/[.,!?]+$/, ""); if (words.length > 3) heard += "…";
  if (heard.length > 24) heard = heard.slice(0, 22).trim() + "…";
  const low = words.join(" ").toLowerCase().replace(/[^a-z ]/g, "").trim();
  const kind = HEARD_KINDS.find(([re]) => re.test(low));
  return { ...fillSass(pick(kind ? kind[1] : HEARD_ANY), { heard, name: n }), rival: null, ai: false };
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

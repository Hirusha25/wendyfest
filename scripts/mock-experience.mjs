// Renders design mockups of proposed experience features on top of the real Retro Blue kiosk screens.
import { createRequire } from "node:module";
const { chromium } = createRequire("/opt/node-tools/node_modules/")("playwright");
const out = process.argv[2], base = "http://localhost:3000";
const U = (t) => t.replace(/(?<![\w#.%-])(-?\d+(?:\.\d+)?)u\b/g, (_, n) => `calc(${n} * var(--u))`);
const reg = async (name, phone) => { const r = await (await fetch(base + "/api/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, phone, lang: "en" }) })).json(); const v = await (await fetch(base + "/api/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone, code: r.devOtp }) })).json(); return v.code; };
const code = await reg("Dilshan Perera", "077" + String(Date.now() % 10000000).padStart(7, "0"));
const b = await chromium.launch({ args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] });
const c = await b.newContext({ viewport: { width: 1920, height: 1080 }, permissions: ["microphone"] }); await c.addCookies([{ name: "wf_kiosk", value: "2468", url: base }]);
const p = await c.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(e.message));
const inject = (sel, html, css) => p.evaluate(({ sel, html, css }) => { const st = document.createElement("style"); st.className = "mockcss"; st.textContent = css; document.head.appendChild(st); const box = document.querySelector(sel); const w = document.createElement("div"); w.className = "mock"; w.innerHTML = html; box.appendChild(w); }, { sel, html: U(html), css: U(css) });
const clear = () => p.evaluate(() => document.querySelectorAll(".mock, .mockcss").forEach((e) => e.remove()));
const snap = (n) => p.screenshot({ path: `${out}/${n}.png` });
const BASE_CSS = `
.mock { position:absolute; inset:0; pointer-events:none; z-index:20; animation:none !important; opacity:1 !important; translate:none !important; } .mock > * { position:absolute; animation:none !important; opacity:1; }
.mk-cream { background:#F6F0E6; color:#1F1A1A; border-radius:22u; box-shadow:0 8u 0 #014F72, 0 18u 34u rgba(0,40,70,.35); }
.mk-red { background:linear-gradient(90deg,#E0303A,#B51F28); color:#fff; border-radius:999px; box-shadow:0 7u 0 #7A0F16; }
.mk-h { font:italic 900 40u/1 Poppins, sans-serif; text-transform:uppercase; letter-spacing:-.02em; }
.mk-s { font:italic 800 18u/1.2 Poppins, sans-serif; letter-spacing:.16em; text-transform:uppercase; }
.mk-tag { position:absolute; left:16u; top:-16u; background:#FFC72C; color:#1F1A1A; font:italic 900 14u/1 Poppins; letter-spacing:.14em; text-transform:uppercase; padding:6u 12u; border-radius:999px; box-shadow:0 4u 0 #B8860B; }`;
const NEW = (label, top = -2) => `<div style="right:24u;top:${top}u;left:auto;background:#FFC72C;color:#1F1A1A;font:italic 900 15u/1 Poppins;letter-spacing:.16em;text-transform:uppercase;padding:8u 14u;border-radius:999px;box-shadow:0 4u 0 #B8860B">New · ${label}</div>`;

// ---------- 1 · Register: how-to-play loop ----------
await p.goto(base + "/kiosk/scream-cream", { waitUntil: "networkidle" }); await p.waitForTimeout(1200);
await p.evaluate(() => { document.querySelector("#s-idle .left").style.opacity = "0"; });
const step = (n, x, icon, t1, t2) => `<div class="mk-cream" style="left:${x}u;top:150u;width:250u;height:250u;display:grid;justify-items:center;align-content:center;gap:14u;text-align:center">
  <div style="position:absolute;left:18u;top:18u;width:44u;height:44u;border-radius:50%;background:#CD2028;color:#fff;display:grid;place-items:center;font:900 24u/1 Poppins">${n}</div>
  ${icon}<div class="mk-h" style="font-size:28u;color:#CD2028">${t1}</div><div style="font:600 17u/1.3 Poppins;color:#1F1A1A;max-width:200u">${t2}</div></div>`;
const ICON = (d) => `<svg viewBox="0 0 48 48" style="width:76u;height:76u" fill="none" stroke="#1F1A1A" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
await inject("#s-idle .box", `
  <div class="mk-s" style="left:98u;top:50u;color:#F6F0E6;font-size:22u;letter-spacing:.24em">How to play <span style="display:inline-block;width:58u;height:3u;background:#CD2028;vertical-align:middle;margin-left:16u"></span></div>
  <div class="mk-h" style="left:98u;top:86u;font-size:52u;color:#F6F0E6;text-shadow:0 3u 0 #01476A,0 6u 0 #012F47">Three steps to a reward</div>
  ${step(1, 98, ICON('<rect x="6" y="6" width="14" height="14" rx="2"/><rect x="28" y="6" width="14" height="14" rx="2"/><rect x="6" y="28" width="14" height="14" rx="2"/><path d="M28 28h6v6h-6zM38 38h4v4M28 40h4"/>'), "Scan", "Register on your phone in 30 seconds")}
  ${step(2, 378, ICON('<rect x="4" y="10" width="40" height="28" rx="5"/><path d="M11 18h2M19 18h2M27 18h2M35 18h2M11 25h2M19 25h2M27 25h2M35 25h2M15 31h18"/>'), "Enter code", "Type the 6-character code from your SMS")}
  ${step(3, 658, ICON('<rect x="17" y="5" width="14" height="24" rx="7"/><path d="M10 22a14 14 0 0 0 28 0M24 36v7M16 43h16"/>'), "Scream", "Shout WENDY’S! Beat 70 to win")}
  <div style="left:98u;top:430u;width:810u;display:flex;align-items:center;gap:18u">
    <div class="mk-s" style="color:#CDEBF7">Loudness</div>
    <div style="flex:1;height:16u;border-radius:999px;background:rgba(0,40,70,.4);position:relative;overflow:visible"><i style="position:absolute;left:0;top:0;bottom:0;width:76%;border-radius:999px;background:linear-gradient(90deg,#F6F0E6,#fff)"></i><i style="position:absolute;left:70%;top:-10u;bottom:-10u;width:5u;border-radius:3u;background:#CD2028"></i></div>
    <div class="mk-red" style="padding:10u 20u;font:italic 900 20u/1 Poppins;letter-spacing:.06em;text-transform:uppercase">Win a reward ★</div></div>
  <div style="left:98u;top:494u;display:flex;gap:10u"><i style="width:30u;height:8u;border-radius:4u;background:#fff"></i><i style="width:8u;height:8u;border-radius:4u;background:rgba(255,255,255,.45)"></i><i style="width:8u;height:8u;border-radius:4u;background:rgba(255,255,255,.45)"></i></div>
  ${NEW("Attract loop")}`, BASE_CSS);
await snap("m1-register-howto"); await clear(); await p.evaluate(() => { document.querySelector("#s-idle .left").style.opacity = ""; });

// ---------- 2 · Enter code: personal welcome ----------
await p.click("#start"); await p.fill("#code", code); await p.evaluate(() => paintBoxes()); await p.waitForTimeout(700);
await inject("#s-code .box", `
  <div style="left:-200u;top:-60u;width:1840u;height:700u;background:rgba(1,71,106,.55);backdrop-filter:blur(3px)"></div>
  <div class="mk-cream" style="left:420u;top:110u;width:600u;height:330u;display:grid;justify-items:center;align-content:center;gap:16u;text-align:center">
    <div style="width:96u;height:96u;border-radius:50%;background:#CD2028;display:grid;place-items:center;box-shadow:0 6u 0 #7A0F16"><svg viewBox="0 0 24 24" style="width:56u;height:56u" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>
    <div class="mk-h" style="font-size:64u;color:#CD2028">Hi Dilshan!</div>
    <div style="font:600 22u/1.35 Poppins;color:#1F1A1A">Code accepted. Let’s get your mic ready.</div></div>
  <div class="mk-cream" style="left:57u;top:530u;width:430u;height:70u;display:flex;align-items:center;gap:16u;padding:0 18u;border-radius:16u;box-shadow:0 5u 0 #014F72">
    <svg viewBox="0 0 48 48" style="width:44u;height:44u" fill="#1F1A1A"><rect x="4" y="4" width="16" height="16"/><rect x="28" y="4" width="16" height="16"/><rect x="4" y="28" width="16" height="16"/><rect x="30" y="30" width="6" height="6"/><rect x="38" y="38" width="6" height="6"/></svg>
    <div style="font:700 17u/1.25 Poppins">Forgot your code? <span style="color:#CD2028">Scan to open your pass</span></div></div>
  ${NEW("Welcome")}`, BASE_CSS);
await snap("m2-code-welcome"); await clear();

// ---------- 3 · Mic check: practice round + Wendy guide ----------
await p.click("#code-go"); await p.waitForTimeout(900);
await p.evaluate(() => { VD = { fired: true }; currentDb = () => -27 - Math.random() * 3; });
await p.waitForTimeout(700);
await p.evaluate(() => { document.getElementById("mic-pill").style.visibility = "hidden"; });
await inject("#s-ready .box", `
  <div class="mk-cream" style="left:420u;top:290u;width:600u;height:72u;border-radius:999px;display:flex;align-items:center;gap:18u;padding:0 30u;box-shadow:0 6u 0 #014F72">
    <div class="mk-s" style="color:#CD2028;font-size:17u">Practice</div>
    <div style="font:italic 900 44u/1 Poppins;color:#CD2028">42</div>
    <div style="flex:1;height:14u;border-radius:999px;background:rgba(205,32,40,.15);position:relative"><i style="position:absolute;left:0;top:0;bottom:0;width:42%;border-radius:999px;background:#CD2028"></i><i style="position:absolute;left:70%;top:-9u;bottom:-9u;width:5u;border-radius:3u;background:#1F1A1A"></i></div>
    <div class="mk-s" style="font-size:16u">Aim for 70!</div></div>
  <div style="left:1150u;top:120u;width:250u">
    <div class="mk-cream" style="position:relative;padding:18u 22u;border-radius:20u;font:700 20u/1.3 Poppins;box-shadow:0 6u 0 #014F72">Lean in and give it everything!<i style="position:absolute;left:40u;bottom:-16u;width:0;height:0;border-left:16u solid transparent;border-right:16u solid transparent;border-top:18u solid #F6F0E6"></i></div>
    <img src="/assets/cameo.png" style="display:block;width:120u;margin:26u 0 0 0;filter:drop-shadow(0 8u 12u rgba(0,40,70,.4))"></div>
  ${NEW("Practice round + Wendy tips")}`, BASE_CSS);
await snap("m3-mic-practice"); await clear(); await p.evaluate(() => { document.getElementById("mic-pill").style.visibility = ""; });

// ---------- 4 · Countdown: count-along ----------
await p.evaluate(() => { currentDb = () => -60; }); await p.evaluate(() => { mode = "ready"; }); await p.click("#go"); await p.waitForTimeout(1350);
await inject("#go-count", `
  <div class="mk-red" style="left:104u;top:400u;display:flex;align-items:center;gap:16u;padding:16u 28u">
    <svg viewBox="0 0 48 48" style="width:40u;height:40u" fill="#fff"><circle cx="16" cy="16" r="7"/><circle cx="32" cy="16" r="7"/><path d="M4 42c0-8 5-13 12-13s12 5 12 13zM22 42c0-8 4-13 10-13s12 5 12 13z"/></svg>
    <div style="font:italic 900 30u/1 Poppins;letter-spacing:.04em;text-transform:uppercase">Count with me!</div></div>
  <div style="left:420u;top:-100u;width:880u;height:680u;border-radius:50%;box-shadow:0 0 0 14u rgba(255,255,255,.08), 0 0 0 40u rgba(255,255,255,.05);"></div>
  ${NEW("Crowd count-along")}`, BASE_CSS);
await snap("m4-countdown"); await clear();

// ---------- 5 · Live: hype words, beat-the-target, today's best ----------
await p.waitForTimeout(2600); await p.evaluate(() => { currentDb = () => -9 - Math.random() * 2; }); await p.waitForTimeout(1400);
const a = (0.75 + 0.96 * 1.5) * Math.PI, bx = 720 + Math.cos(a) * 196, by = 348 + Math.sin(a) * 196;
await inject("#go-meter", `
  <div style="left:80u;top:200u;transform:rotate(-8deg);font:italic 900 72u/1 Poppins;text-transform:uppercase;color:#FFC72C;-webkit-text-stroke:3u #fff;paint-order:stroke fill;text-shadow:0 5u 0 #CD2028, 0 10u 0 #7A0F16, 0 18u 24u rgba(0,40,70,.35)">Louder!</div>
  <div style="left:360u;top:170u;transform:rotate(10deg);font:italic 900 34u/1 Poppins;text-transform:uppercase;color:#fff;opacity:.85;text-shadow:0 3u 0 #CD2028">More!</div>
  <div style="left:530u;top:158u;width:380u;height:380u;border-radius:50%;box-shadow:0 0 0 5u rgba(255,255,255,.55), 0 0 50u 18u rgba(255,255,255,.35)"></div>
  <div style="left:${(bx - 4).toFixed(0)}u;top:${(by - 18).toFixed(0)}u;width:8u;height:36u;border-radius:4u;background:#FFC72C;transform:rotate(${(a * 180 / Math.PI + 90).toFixed(0)}deg);box-shadow:0 0 12u rgba(255,199,44,.9)"></div>
  <div style="left:${(bx + 22).toFixed(0)}u;top:${(by + 10).toFixed(0)}u;background:#FFC72C;color:#1F1A1A;font:italic 900 16u/1 Poppins;letter-spacing:.12em;text-transform:uppercase;padding:8u 14u;border-radius:999px;box-shadow:0 4u 0 #B8860B">Today’s best 96</div>
  <div class="mk-red" style="left:575u;top:480u;width:290u;height:64u;display:flex;align-items:center;justify-content:center;gap:12u;font:italic 900 30u/1 Poppins;text-transform:uppercase;letter-spacing:.04em;border:4u solid #fff">★ You’re in! ★</div>
  ${NEW("Hype words · you’re-in · today’s best", 540)}`, BASE_CSS);
await p.evaluate(() => { document.querySelector("#go-meter .lbl").style.visibility = "hidden"; });
await snap("m5-live"); await clear(); await p.evaluate(() => { document.querySelector("#go-meter .lbl").style.visibility = ""; });

// ---------- 6 · Result: reward reveal (covered + revealed with title + rank) ----------
{ const t0 = Date.now(); while (!["s-result", "s-judge"].includes(await p.evaluate(() => document.querySelector(".screen.on").id)) && Date.now() - t0 < 20000) await p.waitForTimeout(250); } await p.waitForTimeout(1200);
await p.evaluate(() => { showResult({ score: 84, loudness: 91, accuracy: 74, threshold: 70, won: true, coupon: { code: "WENDY10-AAA111", label: "10% OFF your next Wendy's order" }, profileUrl: location.origin + "/p/x" }); document.querySelectorAll(".confetti").forEach((x) => x.remove()); });
await p.waitForTimeout(1500);
const titleRank = `
  <div style="left:310u;top:212u;transform:rotate(9deg);background:#FFC72C;color:#1F1A1A;font:italic 900 19u/1.05 Poppins;text-transform:uppercase;letter-spacing:.06em;text-align:center;padding:12u 18u;border-radius:14u;box-shadow:0 5u 0 #B8860B;border:3u solid #fff">Baconator<br>Belter</div>
  <div class="mk-cream" style="left:70u;top:486u;width:380u;height:48u;border-radius:999px;display:flex;align-items:center;justify-content:center;gap:12u;font:italic 800 17u/1 Poppins;letter-spacing:.1em;text-transform:uppercase;box-shadow:0 5u 0 #014F72"><b style="color:#CD2028;font-size:22u">#4</b> today · louder than 82%</div>`;
await p.evaluate(() => { document.querySelector("#s-result .spark").style.visibility = "hidden"; });
await inject("#s-result .box", `
  <div style="left:579u;top:180u;width:532u;height:88u;border-radius:15u;background:repeating-linear-gradient(-45deg,#F6F0E6 0 14u,#E9E1D4 14u 28u);box-shadow:0 8u 0 #014F72, inset 0 0 0 3u #CD2028;display:flex;align-items:center;justify-content:center;gap:14u">
    <svg viewBox="0 0 24 24" style="width:34u;height:34u" fill="#CD2028"><path d="M12 2l2.4 6.9H22l-6 4.5 2.3 7L12 16l-6.3 4.4 2.3-7-6-4.5h7.6z"/></svg>
    <div style="font:italic 900 30u/1 Poppins;color:#CD2028;letter-spacing:.06em;text-transform:uppercase">Tap to reveal</div></div>
  <div style="left:760u;top:150u;font:900 30u/1 Poppins;color:#FFC72C">✦</div><div style="left:1100u;top:270u;font:900 24u/1 Poppins;color:#fff">✦</div>
  ${titleRank}${NEW("Reward reveal")}`, BASE_CSS);
await snap("m6a-result-reveal"); await clear();
await inject("#s-result .box", titleRank + NEW("Score title + rank"), BASE_CSS);
await snap("m6b-result-title"); await clear(); await p.evaluate(() => { document.querySelector("#s-result .spark").style.visibility = ""; });

// ---------- 7 · Fail: instant replay + rank ----------
await p.evaluate(() => { showResult({ score: 48, loudness: 88, accuracy: 10, threshold: 70, won: false, coupon: null, profileUrl: location.origin + "/p/x" }); });
await p.waitForTimeout(1500); await p.evaluate(() => { document.querySelector("#s-result .spark").style.visibility = "hidden"; });
const bars = Array.from({ length: 34 }, (_, i) => { const h = 8 + Math.round(30 * Math.abs(Math.sin(i * .7) * Math.sin(i * .23 + 1))); return `<i style="display:inline-block;width:5u;height:${h}u;margin-right:4u;border-radius:3u;background:${i < 14 ? "#CD2028" : "rgba(205,32,40,.3)"};vertical-align:middle"></i>`; }).join("");
await inject("#s-result .box", `
  <div class="mk-cream" style="left:40u;top:484u;width:470u;height:62u;border-radius:999px;display:flex;align-items:center;gap:14u;padding:0 18u;box-shadow:0 5u 0 #014F72">
    <div style="width:42u;height:42u;border-radius:50%;background:#CD2028;display:grid;place-items:center"><svg viewBox="0 0 24 24" style="width:20u;height:20u" fill="#fff"><path d="M7 4l13 8-13 8z"/></svg></div>
    <div class="mk-s" style="font-size:15u;color:#CD2028">Replay</div><div style="white-space:nowrap">${bars}</div></div>
  <div style="left:310u;top:212u;transform:rotate(9deg);background:#F6F0E6;color:#1F1A1A;font:italic 900 17u/1.05 Poppins;text-transform:uppercase;letter-spacing:.06em;text-align:center;padding:10u 16u;border-radius:14u;box-shadow:0 5u 0 #014F72;border:3u solid #fff">Frosty<br>Whisper</div>
  ${NEW("Instant replay + score title")}`, BASE_CSS);
await snap("m7-fail-replay");
await b.close(); console.log("ok", errs.length ? errs : "no errors");

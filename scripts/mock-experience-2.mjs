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


const WENDY = (x, y, text, { size = 110, w = 250, tail = 40 } = {}) => `<div style="left:${x}u;top:${y}u;width:${w}u">
  <div class="mk-cream" style="position:relative;padding:16u 20u;border-radius:20u;font:700 19u/1.3 Poppins;box-shadow:0 6u 0 #014F72">${text}<i style="position:absolute;left:${tail}u;bottom:-16u;width:0;height:0;border-left:16u solid transparent;border-right:16u solid transparent;border-top:18u solid #F6F0E6"></i></div>
  <img src="/assets/cameo.png" style="display:block;width:${size}u;margin:24u 0 0 0;filter:drop-shadow(0 8u 12u rgba(0,40,70,.4))"></div>`;
const PILL = (txt, extra = "") => `<div class="mk-red" style="display:flex;align-items:center;justify-content:center;gap:10u;padding:10u 20u;font:italic 900 19u/1 Poppins;text-transform:uppercase;letter-spacing:.05em;border:3u solid #fff;${extra}">${txt}</div>`;
const TICK = '<svg viewBox="0 0 24 24" style="width:20u;height:20u" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

// ---------- 1 · Register: Wendy invites passers-by ----------
await p.goto(base + "/kiosk/scream", { waitUntil: "networkidle" }); await p.waitForTimeout(1200);
await inject("#s-idle .box", `<div class="mk-cream" style="left:690u;top:-42u;width:210u;padding:14u 18u;border-radius:18u;font:700 18u/1.3 Poppins;box-shadow:0 6u 0 #014F72">Psst! Scan me to play →<i style="position:absolute;right:-14u;top:22u;width:0;height:0;border-top:12u solid transparent;border-bottom:12u solid transparent;border-left:16u solid #F6F0E6"></i></div><img src="/assets/cameo.png" style="left:912u;top:-40u;width:86u;filter:drop-shadow(0 8u 12u rgba(0,40,70,.4))">${NEW("Wendy invites", 540)}`, BASE_CSS);
await snap("n1-register-wendy"); await clear();

// ---------- 2 · Enter code: Wendy hint + still-there timer ----------
await p.click("#start"); await p.evaluate(() => { codeEl.value = "DR4"; paintBoxes(); }); await p.waitForTimeout(800);
await inject("#s-code .box", `
  <div class="mk-cream" style="left:820u;top:505u;width:543u;height:46u;border-radius:999px;display:flex;align-items:center;gap:14u;padding:0 18u;box-shadow:0 5u 0 #014F72">
    <svg viewBox="0 0 36 36" style="width:30u;height:30u"><circle cx="18" cy="18" r="15" fill="none" stroke="rgba(205,32,40,.2)" stroke-width="5"/><circle cx="18" cy="18" r="15" fill="none" stroke="#CD2028" stroke-width="5" stroke-dasharray="94" stroke-dashoffset="38" transform="rotate(-90 18 18)" stroke-linecap="round"/></svg>
    <div style="font:700 17u/1 Poppins">Still there? Back to start in <b style="color:#CD2028">8s</b></div></div>
  ${WENDY(70, 395, "It’s in your SMS: 6 letters &amp; numbers", { size: 0, w: 330, tail: 300 })}
  ${NEW("Wendy hint · still-there timer")}`, BASE_CSS);
await p.evaluate(() => { document.querySelector("#s-code .ask").style.visibility = "hidden"; });
await snap("n2-code-hint"); await clear(); await p.evaluate(() => { document.querySelector("#s-code .ask").style.visibility = ""; });

// ---------- 3 · Mic check: distance guide ----------
await p.evaluate(() => { codeEl.value = ""; paintBoxes(); }); await p.fill("#code", code); await p.click("#code-go"); await p.waitForTimeout(900);
await p.evaluate(() => { VD = { fired: true }; currentDb = () => -27 - Math.random() * 3; }); await p.waitForTimeout(700);
const row = (t, on, sub) => `<div style="display:flex;align-items:center;gap:12u;padding:10u 14u;border-radius:14u;${on ? "background:#CD2028;color:#fff" : "color:#1F1A1A;opacity:.55"}">
  <div style="width:30u;height:30u;border-radius:50%;${on ? "background:#fff;color:#CD2028" : "border:3u solid currentColor"};display:grid;place-items:center">${on ? TICK : ""}</div>
  <div><div style="font:italic 900 19u/1 Poppins;text-transform:uppercase">${t}</div><div style="font:600 13u/1.3 Poppins">${sub}</div></div></div>`;
await inject("#s-ready .box", `
  <div class="mk-cream" style="left:40u;top:150u;width:250u;padding:16u;display:grid;gap:8u">
    <div class="mk-s" style="font-size:15u;color:#CD2028;padding:4u 6u">Mic distance</div>
    ${row("Too far", false, "Step closer")}${row("Perfect", true, "About one hand away")}${row("Too close", false, "Lean back a little")}</div>
  ${WENDY(1150, 120, "Lean in and give it everything!")}
  ${NEW("Mic distance guide")}`, BASE_CSS);
await snap("n3-mic-distance"); await clear();

// ---------- 4 · Countdown: GO! splash ----------
await p.evaluate(() => { currentDb = () => -60; mode = "ready"; }); await p.click("#go"); await p.waitForTimeout(2600);
await p.evaluate(() => { document.getElementById("cnt").style.visibility = "hidden"; });
await inject("#go-count", `
  <svg viewBox="0 0 200 200" style="left:600u;top:60u;width:520u;height:360u"><polygon points="100,4 116,40 152,18 150,58 192,52 170,88 200,110 162,124 182,160 140,156 138,196 108,170 82,198 70,160 30,178 38,138 0,118 34,96 10,62 52,62 46,20 84,38" fill="#F6F0E6" stroke="#CD2028" stroke-width="5" stroke-linejoin="round"/></svg>
  <div style="left:600u;top:150u;width:520u;text-align:center;font:italic 900 170u/1 Poppins;color:#CD2028;text-shadow:0 6u 0 #7A0F16">GO!</div>
  ${WENDY(1150, 40, "Now! Scream WENDY’S!", { size: 90, w: 230 })}
  ${NEW("GO! splash", 520)}`, BASE_CSS);
await snap("n4-countdown-go"); await clear(); await p.evaluate(() => { document.getElementById("cnt").style.visibility = ""; });

// ---------- 5 · Live: Wendy reacts + milestone badges + You're in ----------
await p.waitForTimeout(1500); await p.evaluate(() => { currentDb = () => -9 - Math.random() * 2; }); await p.waitForTimeout(1400);
const ms = (t, done) => `<div style="display:flex;align-items:center;gap:10u;height:38u;padding:0 16u 0 8u;border-radius:999px;${done ? "background:#F6F0E6;color:#CD2028;box-shadow:0 4u 0 #014F72" : "background:rgba(0,40,70,.35);color:rgba(255,255,255,.6)"};font:italic 900 16u/1 Poppins;text-transform:uppercase;letter-spacing:.06em">
  <div style="width:26u;height:26u;border-radius:50%;${done ? "background:#CD2028;color:#fff" : "border:2u solid currentColor"};display:grid;place-items:center">${done ? TICK : ""}</div>${t}</div>`;
await inject("#go-meter", `
  ${WENDY(70, 190, "WOW! Keep going!", { size: 92, w: 220 })}
  <div style="left:1110u;top:190u;display:grid;gap:10u">${ms("Warming up", true)}${ms("Getting loud", true)}${ms("You’re in!", true)}</div>
  ${PILL("★ You’re in! ★", "left:550u;top:478u;width:340u;height:64u;font-size:30u;white-space:nowrap")}
  ${NEW("Wendy reacts · milestones", 540)}`, BASE_CSS);
await p.evaluate(() => { document.querySelector("#go-meter .lbl").style.visibility = "hidden"; });
await snap("n5-live-wendy"); await clear(); await p.evaluate(() => { document.querySelector("#go-meter .lbl").style.visibility = ""; });

// ---------- 6 · Result win: winner seal + Wendy ----------
{ const t0 = Date.now(); while (!["s-result", "s-judge"].includes(await p.evaluate(() => document.querySelector(".screen.on").id)) && Date.now() - t0 < 20000) await p.waitForTimeout(250); } await p.waitForTimeout(1200);
await p.evaluate(() => { showResult({ score: 84, loudness: 91, accuracy: 74, threshold: 70, won: true, coupon: { code: "WENDY10-AAA111", label: "10% OFF your next Wendy's order" }, profileUrl: location.origin + "/p/x" }); document.querySelectorAll(".confetti").forEach((x) => x.remove()); });
await p.waitForTimeout(1500); await p.evaluate(() => { document.querySelector("#s-result .spark").style.visibility = "hidden"; });
const seal = `<svg viewBox="0 0 120 120" style="left:400u;top:176u;width:112u;height:112u;transform:rotate(-12deg);filter:drop-shadow(0 6u 0 #7A0F16)">
  <defs><path id="sc" d="M60,60 m-40,0 a40,40 0 1,1 80,0 a40,40 0 1,1 -80,0"/></defs>
  <circle cx="60" cy="60" r="56" fill="#CD2028" stroke="#fff" stroke-width="4"/><circle cx="60" cy="60" r="34" fill="#F6F0E6"/>
  <text font-family="Poppins" font-weight="900" font-style="italic" font-size="11" letter-spacing="2.4" fill="#fff"><textPath href="#sc">WENDY FEST · WINNER · 2026 ·</textPath></text>
  <text x="60" y="67" text-anchor="middle" font-family="Poppins" font-weight="900" font-size="22" fill="#CD2028">★</text></svg>`;
await inject("#s-result .box", `${seal}${WENDY(1180, 368, "Show this at any Wendy’s!", { size: 0, w: 230, tail: 150 })}<img src="/assets/cameo.png" style="left:1300u;top:440u;width:90u;filter:drop-shadow(0 8u 12u rgba(0,40,70,.4))">${NEW("Winner seal · Wendy tip")}`, BASE_CSS);
await snap("n6-result-seal"); await clear();

// ---------- 7 · Miss: try Roast Me next ----------
await p.evaluate(() => { showResult({ score: 48, loudness: 88, accuracy: 10, threshold: 70, won: false, coupon: null, profileUrl: location.origin + "/p/x" }); }); await p.waitForTimeout(1500);
await p.evaluate(() => { document.querySelector("#s-result .spark").style.visibility = "hidden"; });
await inject("#s-result .box", `
  <div class="mk-cream" style="left:1190u;top:385u;width:220u;height:120u;display:flex;align-items:center;gap:12u;padding:0 16u">
    <img src="/assets/cameo.png" style="width:64u">
    <div><div class="mk-s" style="font-size:13u;color:#CD2028">Next stop</div><div style="font:italic 900 26u/1 Poppins;text-transform:uppercase">Roast Me</div><div style="font:600 14u/1.25 Poppins">Booth 2 · get roasted by AI →</div></div></div>
  ${NEW("Next stop: Roast Me")}`, BASE_CSS);
await snap("n7-miss-roast");
await b.close(); console.log("ok", errs.length ? errs : "no errors");

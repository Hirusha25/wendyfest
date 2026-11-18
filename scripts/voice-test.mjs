// Studio Cream voice flow test: quiet room stays on mic check, a voice auto-starts, hearing "Wendy's" ends the round early.
// Usage: node scripts/voice-test.mjs <outDir>   (app running on :3000)
import { createRequire } from "node:module";
const { chromium } = createRequire("/opt/node-tools/node_modules/")("playwright");
const out = process.argv[2], base = "http://localhost:3000";
const reg = async (name, phone) => { const r = await (await fetch(base + "/api/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, phone, lang: "en" }) })).json(); const v = await (await fetch(base + "/api/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone, code: r.devOtp }) })).json(); return v.code; };
const code = await reg("Hirusha Dayananda", "077" + String(Date.now() % 10000000).padStart(7, "0"));
const b = await chromium.launch({ args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] });
const c = await b.newContext({ viewport: { width: 1920, height: 1080 }, permissions: ["microphone"] }); await c.addCookies([{ name: "wf_kiosk", value: "2468", url: base }]);
const p = await c.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(e.message));
const on = () => p.evaluate(() => document.querySelector(".screen.on").id);
await p.goto(base + "/kiosk/scream", { waitUntil: "networkidle" });
await p.evaluate(() => { currentDb = () => -70; });                       // quiet room
await p.click("#start"); await p.fill("#code", code); await p.keyboard.press("Enter"); await p.waitForTimeout(1500);
await p.screenshot({ path: `${out}/v1-ready-quiet.png` }); console.log("after 1.5 s quiet:", await on(), "|", await p.textContent("#mic-status"));
await p.evaluate(() => { currentDb = () => -18 - Math.random() * 4; });   // guest says "Hello"
await p.waitForTimeout(450); await p.screenshot({ path: `${out}/v2-ready-voice.png` }); console.log("voice:", await p.textContent("#mic-status"));
await p.waitForTimeout(1200); console.log("auto-advanced to:", await on());
await p.evaluate(() => { currentDb = () => -60; });
await p.waitForTimeout(3600);                                                // countdown → live
await p.evaluate(() => { currentDb = () => -10 - Math.random() * 3; });
await p.waitForTimeout(1200);
await p.evaluate(() => { transcript = "wendy's"; showHeard(); });          // speech recognition hears it
await p.waitForTimeout(300); await p.screenshot({ path: `${out}/v3-live-heard.png` }); console.log("heard:", await p.textContent("#heard-v"), "| pill:", await p.textContent("#listen-l"), "| left:", await p.textContent("#tleft"));
const t0 = Date.now(); while (!["s-result", "s-judge"].includes(await on()) && Date.now() - t0 < 12000) await p.waitForTimeout(200);
console.log("ended on", await on(), "after", ((Date.now() - t0) / 1000).toFixed(1), "s more");
if ((await on()) === "s-result") { await p.waitForTimeout(800); await p.screenshot({ path: `${out}/v4-result.png` }); console.log("result:", await p.textContent("#res-score"), await p.textContent("#res-title")); }
await b.close(); console.log("errors:", errs.length ? errs : "none");

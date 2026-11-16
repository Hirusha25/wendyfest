// Plays three rounds through the Retro Blue kiosk: missed S, too quiet, clear + loud. Captures Live and Result.
import { createRequire } from "node:module";
const { chromium } = createRequire("/opt/node-tools/node_modules/")("playwright");
const out = process.argv[2], base = "http://localhost:3000";
const reg = async (name) => { const phone = "077" + String(Date.now() % 10000000).padStart(7, "0"); const r = await (await fetch(base + "/api/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, phone, lang: "en" }) })).json(); const v = await (await fetch(base + "/api/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone, code: r.devOtp }) })).json(); return v.code; };
const b = await chromium.launch({ args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] });
const c = await b.newContext({ viewport: { width: 1920, height: 1080 }, permissions: ["microphone"] }); await c.addCookies([{ name: "wf_kiosk", value: "2468", url: base }]);
const p = await c.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(e.message));
const on = () => p.evaluate(() => document.querySelector(".screen.on").id);
async function round(tag, db, said) {
  const code = await reg("Dilshan Perera"); await new Promise((r) => setTimeout(r, 30));
  await p.goto(base + "/kiosk/scream-cream", { waitUntil: "networkidle" });
  await p.click("#start"); await p.fill("#code", code); await p.keyboard.press("Enter"); await p.waitForTimeout(900);
  await p.evaluate(() => { currentDb = () => -60; }); await p.click("#go"); await p.waitForTimeout(3700);
  await p.evaluate((db) => { currentDb = () => db - Math.random() * 1.5; }, db); await p.waitForTimeout(1200);
  await p.evaluate((t) => { transcript = t; showHeard(); }, said); await p.waitForTimeout(250);
  await p.screenshot({ path: `${out}/${tag}-live.png` });
  const t0 = Date.now(); while (!["s-result", "s-judge"].includes(await on()) && Date.now() - t0 < 15000) await p.waitForTimeout(200);
  await p.waitForTimeout(1600); await p.screenshot({ path: `${out}/${tag}-result.png` });
  console.log(tag.padEnd(8), "ended after", ((Date.now() - t0) / 1000).toFixed(1) + "s", "|", await p.textContent("#res-score"), "|", await p.textContent("#res-title"));
}
await round("nos", -9, "wendy");
await round("quiet", -26, "wendy's");
await round("win", -9, "wendy's");
await b.close(); console.log("errors:", errs.length ? errs : "none");

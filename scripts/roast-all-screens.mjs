// Walks the Roast Me kiosk through every screen with a fake camera and captures each one.
import { createRequire } from "node:module";
const { chromium } = createRequire("/opt/node-tools/node_modules/")("playwright");
const out = process.argv[2], base = process.argv[3] || "http://localhost:3000", demo = base.includes("8080"), path = demo ? "/kiosk/roast.html" : "/kiosk/roast";
const phone = "077" + String(Date.now() % 10000000).padStart(7, "0");
let code;
if (!demo) { const r = await (await fetch(base + "/api/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Dilshan Perera", phone, lang: "en" }) })).json(); code = (await (await fetch(base + "/api/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone, code: r.devOtp }) })).json()).code; }
const b = await chromium.launch({ args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] });
const c = await b.newContext({ viewport: { width: 1920, height: 1080 }, permissions: ["camera"] });
const p = await c.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("dialog", (d) => { errs.push("dialog: " + d.message()); d.dismiss(); });
const snap = (n) => p.screenshot({ path: `${out}/r-${n}.png` });
await p.goto(base + path, { waitUntil: "networkidle" }); await p.waitForTimeout(700); await snap("0-pin");
await p.fill("#pin", "2468"); await p.click("#pin-go"); await p.waitForTimeout(800); await snap("1-welcome");
await p.click("#start"); await p.waitForTimeout(500);
await p.fill("#code", "ZZZZZZ"); await p.keyboard.press("Enter"); await p.waitForTimeout(800); await snap("2b-code-notfound");
if (demo) { await b.close(); console.log("demo partial ok", errs.length ? errs : "no errors"); process.exit(0); }
await p.fill("#code", ""); await p.type("#code", code.slice(0, 3)); await p.waitForTimeout(300); await snap("2-code");
await p.fill("#code", code); await p.keyboard.press("Enter"); await p.waitForTimeout(1000); await snap("3-consent");
await p.click("#agree"); await p.waitForTimeout(1800); await snap("4-camera");
await p.route("**/api/kiosk/roast", async (r) => { await new Promise((z) => setTimeout(z, 4500)); await r.continue(); });
await p.click("#snap"); await p.waitForTimeout(1200); await snap("4b-count");
await p.waitForTimeout(2600); await snap("5-cooking");
const t0 = Date.now(); while ((await p.evaluate(() => document.querySelector(".screen.on").id)) !== "s-reveal" && Date.now() - t0 < 30000) await p.waitForTimeout(300);
await p.waitForTimeout(1500); await p.evaluate(() => document.querySelectorAll(".confetti").forEach((x) => x.remove())); await snap("6-reveal");
console.log("title:", await p.textContent("#r-title"));
await b.close(); console.log("ok", errs.length ? errs : "no errors");

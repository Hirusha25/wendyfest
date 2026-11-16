// Full guest journey through the Studio Cream kiosk. Usage: node scripts/journey-cream.mjs <baseUrl> <outDir>
// Full guest journey in a phone-sized browser, with screenshots of each step.
// Usage: node scripts/journey.mjs <baseUrl> <outDir>   (baseUrl on :8080 = static demo build)
import { createRequire } from "node:module";
const { chromium } = createRequire("/opt/node-tools/node_modules/")("playwright");
import fs from "node:fs";
const base = process.argv[2], out = process.argv[3], isDemo = base.includes("8080");
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, permissions: ["microphone", "camera"] });
const errors = []; const p = await ctx.newPage();
p.on("pageerror", (e) => errors.push(p.url() + " :: " + e.message)); p.on("console", (m) => { if (m.type() === "error" && !/TUNNEL|favicon/.test(m.text())) errors.push("console: " + m.text()); });
const u = (path) => isDemo ? base + path.replace(/^\/$/, "/index.html").replace(/^\/(register|profile)(\?|$)/, "/$1.html$2") : base + path;
const snap = (n, full = true) => p.screenshot({ path: `${out}/${n}.png`, fullPage: full });
await p.goto(u("/"), { waitUntil: "networkidle" }); await p.waitForTimeout(800); await snap("01-landing", false);
await p.click("a.cta", { force: true }); await p.waitForLoadState("networkidle"); await p.waitForTimeout(600); await snap("02-register");
await p.fill("#name", "Hirusha Dayananda"); await p.fill("#phone", "077" + String(Date.now() % 10000000).padStart(7, "0")); await p.click("#submit"); await p.waitForTimeout(900);
const otp = (await p.textContent("#demo-otp-code").catch(() => "")) || "0000"; console.log("otp", otp);
await snap("03-otp");
const inputs = await p.$$("#otp-boxes input"); for (let i = 0; i < 4; i++) await inputs[i].type(otp[i]);
await p.waitForTimeout(1000); await snap("04-youre-in");
const code = await p.textContent("#code"); console.log("code", code);
await p.click('a[href$="profile"], a[href$="profile.html"]'); await p.waitForLoadState("networkidle"); await p.waitForTimeout(900); await snap("05-profile-new");
const data = await p.evaluate(async () => { const c = await renderProfileCard(await (await fetch("/api/me")).json()); return c.toDataURL("image/png"); });
fs.writeFileSync(`${out}/card-profile.png`, Buffer.from(data.split(",")[1], "base64"));
await p.setViewportSize({ width: 1280, height: 800 });
await p.goto(u(isDemo ? "/kiosk/scream-cream.html" : "/kiosk/scream-cream"), { waitUntil: "networkidle" });
if (await p.isVisible("#pin")) { await p.fill("#pin", "2468"); await p.click("#pin-go"); await p.waitForTimeout(400); }
await p.click("#start"); await p.fill("#code", code); await p.keyboard.press("Enter"); await p.waitForTimeout(800); if (await p.isVisible("#go")) await p.click("#go"); await p.waitForTimeout(15500);
if (await p.evaluate(() => document.querySelector(".screen.on").id === "s-judge")) { await p.click("#s-judge .btn.white"); await p.waitForTimeout(800); }
console.log("scream result:", await p.textContent("#res-score"), await p.textContent("#res-title"));
await p.goto(u(isDemo ? "/kiosk/roast.html" : "/kiosk/roast"), { waitUntil: "networkidle" });
await p.click("#start"); await p.fill("#code", code); await p.keyboard.press("Enter"); await p.waitForTimeout(600); await p.click("#agree"); await p.waitForTimeout(1500); await p.click("#snap"); await p.waitForTimeout(9000);
const roastUrl = await p.evaluate(() => R.url); console.log("roast", roastUrl);
await p.setViewportSize({ width: 390, height: 844 });
await p.goto(u("/profile"), { waitUntil: "networkidle" }); await p.waitForTimeout(900); await snap("06-profile-played");
await p.goto(roastUrl, { waitUntil: "networkidle" }); await p.waitForTimeout(900); await snap("07-roast");
const d2 = await p.evaluate(async () => { const r = await (await fetch(location.pathname.includes("roast.html") ? "/api/roast/" + new URLSearchParams(location.search).get("t") : location.pathname.replace("/r/", "/api/roast/"))).json(); const c = await renderRoastCard(r, "en"); return c.toDataURL("image/png"); });
fs.writeFileSync(`${out}/card-roast.png`, Buffer.from(d2.split(",")[1], "base64"));
await p.goto(u("/?lang=si"), { waitUntil: "networkidle" }); await p.waitForTimeout(600); await snap("08-landing-si", false);
await p.goto(u("/profile?lang=ta"), { waitUntil: "networkidle" }); await p.waitForTimeout(900); await snap("09-profile-ta");
await b.close(); console.log("ERRORS:", errors.length ? errors : "none");

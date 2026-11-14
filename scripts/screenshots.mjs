// Takes screenshots of every screen for review. Usage: node scripts/screenshots.mjs <profileToken> <roastToken> <outDir>
import { createRequire } from "node:module";
const { chromium } = createRequire("/opt/node-tools/node_modules/")("playwright");
const [,, ptoken, rtoken, out = "shots"] = process.argv;
const base = "http://localhost:3000";
const browser = await chromium.launch({ args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] });
const shot = async (ctx, url, name, opts = {}) => {
  const page = await ctx.newPage();
  await page.goto(base + url, { waitUntil: "networkidle" });
  if (opts.before) await opts.before(page);
  await page.waitForTimeout(opts.wait || 900);
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: !!opts.full });
  await page.close();
};
// Mobile
const mob = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await shot(mob, "/", "m1-landing", { full: true });
await shot(mob, "/register", "m2-register", { full: true });
await shot(mob, "/register?lang=si", "m2-register-si", { full: true });
await shot(mob, "/register?lang=ta", "m2-register-ta", { full: true });
await shot(mob, `/p/${ptoken}`, "m3-profile", { full: true });
await shot(mob, `/scream`, "m4-scream-activity", { full: true });
await shot(mob, `/r/${rtoken}`, "m5-roast-share", { full: true });
await shot(mob, `/r/${rtoken}?lang=ta`, "m5-roast-share-ta", { full: true });
// render profile card + roast card to PNG
{
  const page = await mob.newPage(); await page.goto(`${base}/p/${ptoken}`, { waitUntil: "networkidle" }); await page.waitForTimeout(1200);
  const data = await page.evaluate(async () => { const c = await renderProfileCard(await (await fetch("/api/me")).json()); return c.toDataURL("image/png"); });
  (await import("node:fs")).writeFileSync(`${out}/card-profile.png`, Buffer.from(data.split(",")[1], "base64"));
  await page.goto(`${base}/r/${rtoken}`, { waitUntil: "networkidle" }); await page.waitForTimeout(1200);
  const d2 = await page.evaluate(async () => { const r = await (await fetch(location.pathname.replace("/r/", "/api/roast/"))).json(); const c = await renderRoastCard(r, "si"); return c.toDataURL("image/png"); });
  (await import("node:fs")).writeFileSync(`${out}/card-roast-si.png`, Buffer.from(d2.split(",")[1], "base64"));
  await page.close();
}
// Kiosk 1920x1080
// fresh guests so the kiosk flows have attempts left
const reg = async (name, phone, lang) => (await (await fetch(base + "/api/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, phone, lang }) })).json()).code;
const n = Date.now() % 1000000;
process.env.CODE = await reg("Dilshan Fernando", "077" + String(n).padStart(7, "0"), "en");
process.env.CODE2 = await reg("Tharushi Jayasuriya", "071" + String(n).padStart(7, "0"), "si");
const k = await browser.newContext({ viewport: { width: 1920, height: 1080 }, permissions: ["microphone", "camera"] });
await k.addCookies([{ name: "wf_kiosk", value: "2468", url: base }, { name: "wf_admin", value: "1357", url: base }]);
await shot(k, "/kiosk", "k0-console");
await shot(k, "/kiosk/scream", "k1-scream-idle");
await shot(k, "/kiosk/scream", "k2-scream-code", { before: async (p) => { await p.click("#start"); await p.waitForTimeout(300); await p.fill("#code", "ABC"); } });
await shot(k, "/kiosk/scream", "k3-scream-ready", { before: async (p) => { await p.click("#start"); await p.fill("#code", process.env.CODE); await p.keyboard.press("Enter"); await p.waitForTimeout(800); } });
await shot(k, "/kiosk/scream", "k4-scream-go", { before: async (p) => { await p.click("#start"); await p.fill("#code", process.env.CODE); await p.keyboard.press("Enter"); await p.waitForTimeout(600); await p.click("#go"); await p.waitForTimeout(3600); } });
await shot(k, "/kiosk/scream", "k5-scream-result", { before: async (p) => { await p.evaluate(() => { showResult({ name: "Nimali", score: 84, loudness: 91, accuracy: 74, threshold: 70, won: true, coupon: { code: "WENDY10-AAA111", label: "10% OFF your next Wendy's order" }, profileUrl: location.origin + "/p/x" }); }); await p.waitForTimeout(1200); } });
await shot(k, "/kiosk/scream", "k5b-scream-lose", { before: async (p) => { await p.evaluate(() => { showResult({ name: "Kavindu", score: 41, loudness: 33, accuracy: 52, threshold: 70, won: false, coupon: null, profileUrl: location.origin + "/p/x" }); }); await p.waitForTimeout(600); } });
await shot(k, "/kiosk/roast", "r1-roast-idle");
await shot(k, "/kiosk/roast", "r2-roast-consent", { before: async (p) => { await p.click("#start"); await p.fill("#code", process.env.CODE2); await p.keyboard.press("Enter"); await p.waitForTimeout(800); } });
await shot(k, "/kiosk/roast", "r3-roast-cam", { before: async (p) => { await p.click("#start"); await p.fill("#code", process.env.CODE2); await p.keyboard.press("Enter"); await p.waitForTimeout(600); await p.click("#agree"); await p.waitForTimeout(1500); } });
await shot(k, "/kiosk/roast", "r4-roast-cooking", { before: async (p) => { await p.evaluate(() => { K.show("s-cooking"); cookLines(); }); } });
await shot(k, "/kiosk/roast", "r5-roast-reveal", { before: async (p) => { await p.evaluate(async (t) => { R = await (await fetch("/api/roast/" + t)).json(); guest = { firstName: R.name }; reveal(); }, rtoken); await p.waitForTimeout(1200); } });
await shot(k, "/admin", "a1-admin", { full: true, wait: 1500 });
await browser.close();
console.log("done");

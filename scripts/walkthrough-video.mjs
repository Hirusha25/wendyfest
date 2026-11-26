// Records a guest's-eye walkthrough of each game on the demo build (no server, no AI key): Scream & Win upright and landscape, Roast Me upright.
// The scream itself is simulated (a loud, clear "Wendy's" is fed in) and the camera shows a still photo, so the clips show the screens, not real judging.
// Usage: node scripts/walkthrough-video.mjs <outDir> <camera.mjpeg> [scream-up|scream-wide|roast ...]
import path from "node:path"; import fs from "node:fs";
import { buildDemo, serveDemo, loadChromium } from "./lib/kiosk-harness.mjs";
const [out, cam, ...only] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
buildDemo(); const chromium = await loadChromium(), site = await serveDemo();
const browser = await chromium.launch({ args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", `--use-file-for-fake-video-capture=${cam}`] });
const on = (p, id, ms = 30000) => p.waitForSelector(`#${id}.on`, { timeout: ms });
const typeCode = async (p, pad, code) => { for (const ch of code) { await p.locator(`${pad} button`).filter({ hasText: new RegExp(`^${ch}$`) }).first().click(); await p.waitForTimeout(260); } };
async function record(name, page, vp, run) {
  if (only.length && !only.includes(name)) return;
  const dir = path.join(out, "vid-" + name); fs.rmSync(dir, { recursive: true, force: true });
  const ctx = await browser.newContext({ viewport: vp, permissions: ["camera", "microphone"], recordVideo: { dir, size: { width: vp.width / 2, height: vp.height / 2 } } });
  const p = await ctx.newPage(); const errors = []; p.on("pageerror", (e) => errors.push(e.message)); p.on("dialog", (d) => { errors.push("dialog: " + d.message()); d.dismiss(); });
  await p.goto(`${site.base}/kiosk/${page}`); await p.waitForTimeout(800); await p.evaluate(() => { document.cookie = "wf_kiosk=2468; path=/"; }); await p.reload(); await p.waitForTimeout(2500);
  let note = "ok"; try { await run(p); } catch (e) { note = "STOPPED: " + e.message.split("\n")[0]; }
  await p.waitForTimeout(800); await ctx.close();
  const f = fs.readdirSync(dir)[0]; fs.renameSync(path.join(dir, f), path.join(out, name + ".webm")); fs.rmSync(dir, { recursive: true, force: true });
  console.log(name, note, errors.length ? "| errors: " + errors.join(" | ") : "");
}
const scream = async (p) => {
  await p.click("#start"); await on(p, "s-code"); await p.waitForTimeout(900);
  await typeCode(p, "#kbd", "WENDYS"); await p.waitForTimeout(700); await p.click("#code-go");
  await on(p, "s-ready"); await p.waitForTimeout(2600);
  // the fake microphone only beeps, so a loud, clear "Wendy's" is fed in for this one scream
  await p.evaluate(() => { const o = K.api; K.api = (u, b) => o(u, /\/scream$/.test(u) ? { ...b, peakDb: -6, sustainedDb: -6, transcript: "Wendy's", accuracyOverride: null } : b); });
  await p.click("#go"); await on(p, "s-go");
  // the pretend microphone hears no word, so the kiosk asks for one more go ("We couldn't hear you"); the second go is scored
  const where = await Promise.race([on(p, "s-result", 40000).then(() => "result"), on(p, "s-ready", 40000).then(() => "again")]);
  if (where === "again") { console.log("  asked to try again:", await p.textContent("#mic-status")); await p.waitForTimeout(2500); await p.click("#go"); await on(p, "s-result", 40000); }
  await p.waitForTimeout(9000); await p.click("#s-result .btn"); await p.waitForTimeout(1800);
};
await record("scream-up", "scream.html", { width: 1080, height: 1920 }, scream);
await record("scream-wide", "scream.html", { width: 1920, height: 1080 }, scream);
await record("roast", "roast.html", { width: 1080, height: 1920 }, async (p) => {
  await p.waitForTimeout(2500); await p.click("#start"); await on(p, "s-code"); await p.waitForTimeout(900);
  await typeCode(p, "#kb", "WENDYS"); await p.waitForTimeout(700); await p.click("#code-go");
  await on(p, "s-consent"); await p.waitForTimeout(3500); await p.click("#agree");
  await on(p, "s-cam"); await p.waitForTimeout(3000); await p.click('#heat button[data-h="extra"]'); await p.waitForTimeout(1200); await p.click("#snap");
  await on(p, "s-reveal", 90000); await p.waitForTimeout(11000);
  for (const c of ["blue", "paper", "red"]) { await p.click(`#swatch button[data-c="${c}"]`); await p.waitForTimeout(3600); }
  await p.click("#s-reveal .nextb"); await p.waitForTimeout(1800);
});
await browser.close(); site.close();

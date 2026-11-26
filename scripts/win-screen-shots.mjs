// Screenshots of the upright Scream & Win result screen on the demo build: a FREE winner, a 50% OFF winner, a very long code, and a loser.
// Usage: node scripts/win-screen-shots.mjs <outDir>     add "wide" as a second argument for the landscape LED layout
import path from "node:path"; import fs from "node:fs";
import { buildDemo, serveDemo, loadChromium, LAUNCH } from "./lib/kiosk-harness.mjs";
const out = process.argv[2] || "docs/screens/win"; const wide = process.argv[3] === "wide", VP = wide ? { width: 1920, height: 1080 } : { width: 1080, height: 1920 }; fs.mkdirSync(out, { recursive: true });
buildDemo(); const chromium = await loadChromium(), site = await serveDemo(), browser = await chromium.launch(LAUNCH);
const CASES = { free: { label: "FREE Spicy Chicken Burger Meal", code: "WFREE-7K2M9Q", said: "Wendy's" }, half: { label: "50% OFF Spicy Chicken Burger Meal", code: "WHALF-4T8X2B", said: "Wendy's" }, long: { label: "FREE Spicy Chicken Burger Meal", code: "WENDYSFREE-2026-AB12CD34", said: "Wendy's" }, lose: { said: "KFC" } };
try {
  for (const [k, c] of Object.entries(CASES)) {
    const ctx = await browser.newContext({ viewport: VP });
    const p = await ctx.newPage(); const errors = []; p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(`${site.base}/kiosk/scream.html`); await p.waitForTimeout(1200); await p.evaluate(() => { document.cookie = "wf_kiosk=2468; path=/"; });
    const info = await p.evaluate(async (c) => {
      Math.random = () => 0.1; try { SFX.win = () => {}; SFX.lose = () => {}; sayPreset = () => {}; saySass = () => {}; } catch {}
      const r = await K.api("/api/kiosk/scream", { code: "WENDYS", peakDb: -6, sustainedDb: -6, transcript: c.said }); guest = { code: "WENDYS" };
      if (r.coupon && c.label) r.coupon.label = c.label; if (r.coupon && c.code) r.coupon.code = c.code; showResult(r);
      await new Promise((r) => setTimeout(r, 4200));
      const b = (s) => { const e = document.querySelector(s); if (!e || !e.offsetParent) return null; const q = e.getBoundingClientRect(); return [Math.round(q.top), Math.round(q.bottom)]; };
      return { won: r.won, title: b("#wn-title") || b("#res-title"), coupon: b("#win-new .cpp"), btn: b("#s-result .btn"), foot: b(".foot") };
    }, c);
    await p.screenshot({ path: path.join(out, `real-win-${wide ? "wide-" : ""}${k}.png`) });
    console.log(k, JSON.stringify(info), errors.length ? "ERRORS " + errors.join("|") : "");
    await ctx.close();
  }
} finally { await browser.close(); site.close(); }

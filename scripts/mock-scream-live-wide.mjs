// Design mock-ups, not live code: the landscape (LED) live scream screen with the upright screen's hold features
// (Shout / Hold it / Finish chips, the stretched WENDYYYY'S word, and the three ribbons).
// Usage: node scripts/mock-scream-live-wide.mjs <outDir>
import path from "node:path"; import fs from "node:fs";
import { buildDemo, serveDemo, loadChromium, LAUNCH } from "./lib/kiosk-harness.mjs";
const out = process.argv[2]; fs.mkdirSync(out, { recursive: true });
const u = (css) => css.replace(/(?<![#\w.])(-?\d+(?:\.\d+)?)u\b/g, (m, n) => `calc(${n} * var(--u))`).replace(/;/g, " !important;");
const CREAM = "linear-gradient(180deg, #FFFBF3 0%, #EADFCB 86%, #B5A88F 86%)", BLUE = "linear-gradient(180deg, #23B4F0 0%, #0A7FBC 86%, #064A70 86%)", RED = "linear-gradient(180deg, #F0434C 0%, #B81B24 86%, #7E0F16 86%)";
// shared: show the upright-only pieces, give them the upright look
const SHARED = u(`
  #go-meter .up-only { display:block; } #go-meter #beats { display:flex; gap:12u; } #go-meter #beats span { flex:none; width:auto; }
  #beats span { height:46u; padding:0 20u 0 8u; gap:10u; font-size:18u; background:#F6F0E6; color:#1F1A1A; border-color:#F6F0E6; } #beats span i { width:30u; height:30u; font-size:16u; background:#1F1A1A; color:#F6F0E6; }
  #beats span.on { color:#D8232D; border-color:#D8232D; box-shadow:0 0 0 4u rgba(216,35,45,.35), 0 5u 0 #8E1219; } #beats span.on i { background:#D8232D; color:#fff; }
  #beats span.done { background:#D8232D; color:#fff; border-color:#F6F0E6; } #beats span.done i { background:#F6F0E6; color:#D8232D; }
  .holdcard { border:0; border-radius:0; box-shadow:none; background:${CREAM}; clip-path:polygon(2.4% 0, 100% 0, 97.6% 100%, 0 100%); }
  .holdcard .top b { color:#0A6FA6; font-size:24u; } .holdcard .top > span { color:#D8232D; font-size:46u; text-shadow:0 3u 0 rgba(126,15,22,.3); }
  .holdcard .hbar { height:22u; margin-top:6u; background:#D9CDB6; border:0; box-shadow:inset 0 0 0 2u rgba(30,27,27,.18); } .holdcard .hbar i { background:linear-gradient(90deg, #FF6A72, #D8232D); } .holdcard .bot { display:none; }
  #go-meter .heard { display:flex; align-items:center; gap:16u; border:0; border-radius:0; background:${BLUE}; clip-path:polygon(4% 0, 100% 0, 96% 100%, 0 100%); box-sizing:border-box; }
  #go-meter .heard small { color:#FFE08A; font:italic 800 17u/1 Poppins, sans-serif; letter-spacing:.2em; text-transform:uppercase; white-space:nowrap; } #go-meter .heard b { color:#fff; font-size:30u; }
  #go-meter .tleft { border:0; border-radius:0; background:${RED}; clip-path:polygon(5% 0, 100% 0, 95% 100%, 0 100%); box-sizing:border-box; gap:6u; }
  #go-meter .tleft .v b { font-size:46u; color:#F6F0E6; text-shadow:0 3u 0 #7E0F16; } #go-meter .tleft .v small { font-size:17u; color:#FFE08A; }
  #go-meter .tbar { width:auto; height:9u; background:rgba(0,0,0,.28); } #go-meter .tbar i { background:linear-gradient(90deg, #FFE9A8, #F6B93B); }
`);
const OPTS = {
  base: "",
  // A. Wings: the meter stays in the middle. Left wing: Listening and Hold it. Right wing: Target, the clock and We heard. The hold word runs under the meter.
  a: SHARED + u(`
    #live-cv { clip-path:inset(0 29.5% 0 29.5%); }
    #go-meter #beats { left:0; width:1440u; top:98u; justify-content:center; }
    #go-meter .crow { top:2u; }
    #listen-wendy { left:54u; top:168u; width:80u; } #go-meter .pillx#listen-pill { left:146u; top:178u; height:48u; font-size:19u; }
    #target { left:1196u; top:178u; height:48u; font-size:19u; }
    .holdcard { left:40u; top:262u; width:390u; height:124u; padding:16u 36u 0 42u; }
    #go-meter .heard { left:40u; top:404u; width:390u; height:84u; padding:0 30u 0 42u; }
    #go-meter .tleft { left:1010u; top:262u; width:390u; height:124u; padding:16u 46u 0 52u; }
    #hold-word { left:0; width:1440u; top:478u; font-size:52u; }
    #go-meter .lbl { top:404u; font-size:16u; }
  `),
  // B. Two halves: the meter moves to the left half; the right half is a scoreboard with the chips, the hold word and the three ribbons.
  b: SHARED + u(`
    #live-cv { translate:-300u 0; clip-path:inset(0 0 0 22%); } #gauge-num, #go-meter .lbl { translate:-300u 0; }
    #go-meter .crow { top:2u; }
    #listen-wendy { left:44u; top:104u; width:76u; } #go-meter .pillx#listen-pill { left:132u; top:114u; height:46u; font-size:19u; }
    #target { left:560u; top:114u; height:46u; font-size:19u; }
    #go-meter #beats { left:790u; width:600u; top:106u; justify-content:flex-start; }
    #hold-word { left:790u; width:600u; top:176u; font-size:54u; text-align:left; }
    .holdcard { left:790u; top:262u; width:600u; height:124u; padding:16u 46u 0 52u; }
    #go-meter .heard { left:790u; top:404u; width:320u; height:92u; padding:0 26u 0 38u; }
    #go-meter .tleft { left:1100u; top:404u; width:290u; height:92u; padding:10u 34u 0 40u; }
  `),
};
buildDemo(); const chromium = await loadChromium(), site = await serveDemo(), browser = await chromium.launch(LAUNCH);
const on = (p, id) => p.waitForSelector(`#${id}.on`, { timeout: 30000 });
try {
  for (const [k, css] of Object.entries(OPTS)) {
    const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, permissions: ["microphone"] }); const p = await ctx.newPage(); const errors = []; p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(`${site.base}/kiosk/scream.html`); await p.waitForTimeout(800); await p.evaluate(() => { document.cookie = "wf_kiosk=2468; path=/"; }); await p.reload(); await p.waitForTimeout(1500);
    await p.click("#start"); await on(p, "s-code"); for (const ch of "123AB") { await p.locator("#kbd button:visible").filter({ hasText: new RegExp(`^${ch}$`) }).first().click(); await p.waitForTimeout(120); }
    await p.click("#code-go"); await on(p, "s-ready"); await p.waitForTimeout(1200); await p.click("#go"); await on(p, "s-go");
    await p.waitForSelector("#go-meter", { state: "visible", timeout: 20000 }); if (css) await p.addStyleTag({ content: css });
    await p.waitForTimeout(2800); await p.screenshot({ path: path.join(out, `live-wide-${k}.png`) }); console.log(k, "errors", errors.length, errors.join("|")); await ctx.close();
  }
} finally { await browser.close(); site.close(); }

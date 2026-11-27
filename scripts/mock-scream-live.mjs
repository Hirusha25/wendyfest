// Design mock-ups, not live code: the upright Scream & Win countdown and live screens with colourful panels and side sound bars.
// Usage: node scripts/mock-scream-live.mjs <outDir> [base a b ...]
import path from "node:path"; import fs from "node:fs";
import { buildDemo, serveDemo, loadChromium, LAUNCH } from "./lib/kiosk-harness.mjs";
const out = process.argv[2]; const want = process.argv.slice(3); fs.mkdirSync(out, { recursive: true });
const U = (n) => `calc(${n} * var(--u))`; const I = " !important";
const u = (css) => css.replace(/(?<![#\w.])(-?\d+(?:\.\d+)?)u\b/g, (m, n) => U(n)).replace(/;/g, I + ";");
const EDGE = [1, 2, 3, 4, 5, 6].map((n) => `${n}u ${n}u 0 #B01820`).join(", ");
// shared by every option: title in the cover-page colours, ribbon and 3-2-1 higher, nothing overlapping
const COMMON = u(`
  #go-count .t { top:18u; font-size:150u; }
  #go-count .t .rd { color:#E3202B; text-shadow:${[1, 2, 3, 4, 5, 6].map((n) => `${n}u ${n}u 0 #7E0F16`).join(", ")}; }
  #cd-ribbon { top:330u; height:104u; line-height:100u; font-size:50u; background:linear-gradient(180deg, #F0434C 0%, #D8232D 50%, #A9161F 100%); box-shadow:0 10u 0 #7E0F16, 0 22u 30u rgba(0,30,60,.3); }
  #go-count .dots { top:476u; }
`);
// side sound bars in the look of the old bottom wave: thin cream ticks, red in the middle, tallest next to the meter
const BARS = (side) => `<div class="m-bars ${side}">${Array.from({ length: 9 }, (_, i) => { const j = side === "l" ? i : 8 - i; return `<i class="${j > 5 ? "r" : ""}" style="height:${[14, 22, 34, 48, 64, 82, 100, 74, 46][j]}%"></i>`; }).join("")}</div>`;
// shared by both options: air under the header, beige chips with a red highlight, Listening lifted off the meter, no bottom wave
const LIVE = u(`
  .beats { translate:0 26u; } #go-meter .crow { top:128u; }
  .beats span { background:#F6F0E6; color:#1F1A1A; border-color:#F6F0E6; } .beats span i { background:#1F1A1A; color:#F6F0E6; }
  .beats span.on { background:#F6F0E6; color:#D8232D; border-color:#D8232D; box-shadow:0 0 0 5u rgba(216,35,45,.35), 0 6u 0 #8E1219; } .beats span.on i { background:#D8232D; color:#fff; }
  .beats span.done { background:#D8232D; color:#fff; border-color:#F6F0E6; } .beats span.done i { background:#F6F0E6; color:#D8232D; }
  #listen-wendy { top:266u; width:96u; } #go-meter .pillx#listen-pill { left:150u; top:278u; height:62u; font-size:24u; } #target { top:278u; height:62u; }
  #live-cv { clip-path:inset(0 0 12.5% 0); }
  .m-bars { position:absolute; top:640u; height:300u; width:132u; display:flex; align-items:center; justify-content:space-between; z-index:1; }
  .m-bars.l { left:14u; } .m-bars.r { left:934u; }
  .m-bars i { width:8u; border-radius:999px; background:#F6F0E6; opacity:.92; } .m-bars i.r { background:#E3202B; opacity:1; }
`);
const OPTS = {
  // C. Scoreboard: one beige board. Hold it on the left with a red bar, the clock in a red block on the right, and "We heard" as a line along the bottom.
  c: { bars: true, css: LIVE + u(`
    .holdcard { left:40u; top:1206u; width:1000u; height:330u; padding:30u 372u 0 76u; background:linear-gradient(170deg, #FBF5EA, #EADFCB); border:0; border-radius:30u; box-shadow:0 8u 0 #B5A88F, 0 22u 26u rgba(0,20,40,.35); overflow:hidden; }
    .holdcard::before { content:""; position:absolute; left:0; top:0; bottom:0; width:42u; background:repeating-linear-gradient(180deg, #1E9BE0 0 22u, #fff 22u 44u); }
    .holdcard .top b { color:#0A6FA6; font-size:34u; } .holdcard .top > span { color:#D8232D; font-size:74u; text-shadow:0 4u 0 rgba(126,15,22,.3); }
    .holdcard .hbar { height:34u; margin-top:18u; background:#D9CDB6; box-shadow:inset 0 0 0 2u rgba(30,27,27,.18); } .holdcard .hbar i { background:linear-gradient(90deg, #FF6A72, #D8232D); }
    .holdcard .bot { margin-top:14u; } .holdcard .bot small { color:#6B6060; font-size:21u; }
    #go-meter .tleft { left:700u; top:1206u; width:340u; height:330u; padding:44u 30u 0; gap:26u; background:linear-gradient(180deg, #EA3640, #A9161F); border:0; border-radius:0 30u 30u 0; box-shadow:none; z-index:2; }
    #go-meter .tleft .v { display:grid; justify-items:center; gap:10u; } #go-meter .tleft .v b { font-size:104u; color:#F6F0E6; text-shadow:0 5u 0 #7E0F16; } #go-meter .tleft .v small { font-size:26u; color:#FFE08A; }
    #go-meter .tbar { height:16u; background:rgba(0,0,0,.28); } #go-meter .tbar i { background:linear-gradient(90deg, #FFE9A8, #F6B93B); }
    #go-meter .heard { left:116u; top:1440u; width:564u; height:74u; padding:0 26u; display:flex; align-items:center; gap:20u; background:#fff; border:3u solid #1E9BE0; border-radius:999px; z-index:2; }
    #go-meter .heard small { color:#0A6FA6; font-size:21u; white-space:nowrap; } #go-meter .heard b { color:#1F1A1A; font-size:34u; }
  `) },
  // D. No boxes: the numbers sit straight on the blue. A thick cream track with a red fill for Hold it, big cream numbers, a yellow clock bar across the bottom.
  d: { bars: true, css: LIVE + u(`
    .holdcard { left:60u; top:1206u; width:960u; height:190u; padding:0; background:none; border:0; box-shadow:none; }
    .holdcard .top b { color:#fff; font-size:38u; letter-spacing:.12em; } .holdcard .top > span { color:#F6F0E6; font-size:86u; text-shadow:${[1, 2, 3, 4, 5].map((n) => `${n}u ${n}u 0 #B01820`).join(", ")}; }
    .holdcard .hbar { height:46u; margin-top:14u; background:#F6F0E6; box-shadow:0 6u 0 rgba(0,50,90,.4), inset 0 0 0 4u #F6F0E6; } .holdcard .hbar i { background:linear-gradient(90deg, #FF6A72, #D8232D); }
    .holdcard .bot small { color:#fff; opacity:.9; font-size:23u; }
    #go-meter .heard { left:60u; top:1428u; width:470u; height:150u; padding:0; background:none; border:0; border-left:8u solid #FFE08A; padding-left:26u; border-radius:0; }
    #go-meter .heard small { color:#FFE08A; font-size:26u; } #go-meter .heard b { color:#fff; font-size:56u; }
    #go-meter .tleft { left:560u; top:1418u; width:460u; height:160u; padding:0; gap:14u; background:none; border:0; }
    #go-meter .tleft .v b { font-size:104u; color:#F6F0E6; text-shadow:${[1, 2, 3, 4, 5].map((n) => `${n}u ${n}u 0 #B01820`).join(", ")}; } #go-meter .tleft .v small { font-size:28u; color:#fff; }
    #go-meter .tbar { height:20u; background:rgba(0,40,70,.45); } #go-meter .tbar i { background:linear-gradient(90deg, #FFE9A8, #F6B93B); }
  `) },
  // E. Ticket: the coupon's shape. Beige ticket with stripes and a tear line, the clock on a red stub with notches, "We heard" as a blue chip.
  e: { bars: true, css: LIVE + u(`
    .holdcard { left:40u; top:1206u; width:1000u; height:330u; padding:30u 352u 0 76u; background:linear-gradient(170deg, #FBF5EA, #EADFCB); border:0; border-radius:34u; box-shadow:0 8u 0 #B5A88F, 0 22u 26u rgba(0,20,40,.35); overflow:hidden; -webkit-mask:radial-gradient(circle 24u at 680u 0, #0000 97%, #000) top / 100% 51% no-repeat, radial-gradient(circle 24u at 680u 100%, #0000 97%, #000) bottom / 100% 51% no-repeat; }
    .holdcard::before { content:""; position:absolute; left:0; top:0; bottom:0; width:42u; background:repeating-linear-gradient(180deg, #1E9BE0 0 22u, #fff 22u 44u); }
    .holdcard::after { content:""; position:absolute; left:680u; top:0; bottom:0; right:0; background:linear-gradient(170deg, #E5303A, #A9161F); border-left:4u dashed rgba(246,240,230,.8); }
    .holdcard .top b { color:#0A6FA6; font-size:34u; } .holdcard .top > span { color:#D8232D; font-size:74u; text-shadow:0 4u 0 rgba(126,15,22,.3); }
    .holdcard .hbar { height:34u; margin-top:18u; background:#D9CDB6; } .holdcard .hbar i { background:linear-gradient(90deg, #FF6A72, #D8232D); }
    .holdcard .bot { margin-top:14u; } .holdcard .bot small { color:#6B6060; font-size:21u; }
    #go-meter .tleft { left:724u; top:1206u; width:316u; height:330u; padding:50u 30u 0; gap:26u; background:none; border:0; z-index:2; }
    #go-meter .tleft .v { display:grid; justify-items:center; gap:10u; } #go-meter .tleft .v b { font-size:100u; color:#F6F0E6; text-shadow:0 5u 0 #7E0F16; } #go-meter .tleft .v small { font-size:26u; color:#FFE08A; }
    #go-meter .tbar { height:16u; background:rgba(0,0,0,.28); } #go-meter .tbar i { background:linear-gradient(90deg, #FFE9A8, #F6B93B); }
    #go-meter .heard { left:116u; top:1444u; width:540u; height:66u; padding:0 26u; display:flex; align-items:center; gap:20u; background:linear-gradient(180deg, #1E9BE0, #0A6FA6); border:0; border-radius:999px; box-shadow:0 5u 0 #064A70; z-index:2; }
    #go-meter .heard small { color:#fff; font-size:20u; white-space:nowrap; } #go-meter .heard b { color:#fff; font-size:32u; }
  `) },
  // F. Three tiles: one colour each. Beige Hold it, blue We heard, red clock, with a striped awning along the top of the row.
  f: { bars: true, css: LIVE + u(`
    .holdcard { left:40u; top:1206u; width:1000u; height:176u; padding:50u 36u 0; background:linear-gradient(170deg, #FBF5EA, #EADFCB); border:0; border-radius:28u 28u 0 0; box-shadow:0 22u 26u rgba(0,20,40,.3); overflow:hidden; }
    .holdcard::before { content:""; position:absolute; left:0; right:0; top:0; height:30u; background:repeating-linear-gradient(90deg, #1E9BE0 0 26u, #fff 26u 52u); }
    .holdcard .top b { color:#0A6FA6; font-size:30u; } .holdcard .top > span { color:#D8232D; font-size:56u; text-shadow:0 4u 0 rgba(126,15,22,.3); }
    .holdcard .hbar { height:28u; margin-top:8u; background:#D9CDB6; } .holdcard .hbar i { background:linear-gradient(90deg, #FF6A72, #D8232D); } .holdcard .bot { display:none; }
    #go-meter .heard { left:40u; top:1382u; width:500u; height:170u; padding:30u 36u 0; background:linear-gradient(170deg, #1E9BE0, #0A6FA6); border:0; border-radius:0 0 0 28u; box-shadow:0 8u 0 #064A70; }
    #go-meter .heard small { color:#FFE08A; font-size:24u; } #go-meter .heard b { color:#fff; font-size:50u; }
    #go-meter .tleft { left:540u; top:1382u; width:500u; height:170u; padding:24u 36u 0; gap:14u; background:linear-gradient(170deg, #EA3640, #A9161F); border:0; border-radius:0 0 28u 0; box-shadow:0 8u 0 #7E0F16; }
    #go-meter .tleft .v b { font-size:80u; color:#F6F0E6; text-shadow:0 4u 0 #7E0F16; } #go-meter .tleft .v small { font-size:26u; color:#FFE08A; }
    #go-meter .tbar { height:14u; background:rgba(0,0,0,.28); } #go-meter .tbar i { background:linear-gradient(90deg, #FFE9A8, #F6B93B); }
  `) },
  // G. Dark board: charcoal with a white line all round and red dots, like the "Wendy says" card; yellow and red carry the numbers.
  g: { bars: true, css: LIVE + u(`
    .holdcard { left:40u; top:1206u; width:1000u; height:330u; padding:30u 372u 0 44u; background:linear-gradient(160deg, #2A2525, #141111); border:4u solid rgba(255,255,255,.92); border-radius:30u; box-shadow:0 22u 30u rgba(0,20,40,.45); overflow:hidden; }
    .holdcard::before { content:""; position:absolute; inset:0; background:radial-gradient(circle, rgba(227,32,43,.95) 4u, transparent 4.7u) 0 0 / 22u 22u; -webkit-mask:radial-gradient(ellipse 40% 80% at 0 100%, #000 0, rgba(0,0,0,.4) 50%, transparent 100%); }
    .holdcard > * { position:relative; }
    .holdcard .top b { color:#5CC3F2; font-size:34u; } .holdcard .top > span { color:#FFE08A; font-size:74u; text-shadow:0 4u 0 rgba(0,0,0,.5); }
    .holdcard .hbar { height:34u; margin-top:18u; background:rgba(255,255,255,.14); box-shadow:inset 0 0 0 2u rgba(255,255,255,.3); } .holdcard .hbar i { background:linear-gradient(90deg, #FF6A72, #D8232D); }
    .holdcard .bot { margin-top:14u; } .holdcard .bot small { color:#B9B0B0; font-size:21u; }
    #go-meter .tleft { left:700u; top:1210u; width:336u; height:322u; padding:44u 30u 0; gap:26u; background:linear-gradient(180deg, #EA3640, #A9161F); border:0; border-radius:0 26u 26u 0; z-index:2; }
    #go-meter .tleft .v { display:grid; justify-items:center; gap:10u; } #go-meter .tleft .v b { font-size:104u; color:#F6F0E6; text-shadow:0 5u 0 #7E0F16; } #go-meter .tleft .v small { font-size:26u; color:#FFE08A; }
    #go-meter .tbar { height:16u; background:rgba(0,0,0,.28); } #go-meter .tbar i { background:linear-gradient(90deg, #FFE9A8, #F6B93B); }
    #go-meter .heard { left:84u; top:1440u; width:590u; height:74u; padding:0 26u; display:flex; align-items:center; gap:20u; background:rgba(255,255,255,.1); border:3u solid rgba(255,255,255,.7); border-radius:999px; z-index:2; }
    #go-meter .heard small { color:#5CC3F2; font-size:21u; white-space:nowrap; } #go-meter .heard b { color:#fff; font-size:34u; }
  `) },
  // H. Dials: three round gauges that echo the big meter. Cream dial with a red ring for Hold it, a speech bubble for We heard, a red dial with a yellow ring for the clock.
  h: { bars: true, css: LIVE + u(`
    .holdcard { left:44u; top:1204u; width:316u; height:316u; padding:0; border:0; border-radius:50%; display:grid; place-content:center; justify-items:center; text-align:center; background:radial-gradient(circle, #FBF5EA 0 61%, transparent 62%), conic-gradient(#D8232D 0 32%, #D9CDB6 0); box-shadow:0 0 0 8u #F6F0E6, 0 12u 0 8u #B5A88F, 0 30u 30u rgba(0,20,40,.35); }
    .holdcard .top { display:grid; justify-items:center; gap:8u; } .holdcard .top b { color:#0A6FA6; font-size:26u; } .holdcard .top > span { color:#D8232D; font-size:80u; text-shadow:0 4u 0 rgba(126,15,22,.3); }
    .holdcard .hbar { display:none; } .holdcard .bot { display:block; margin-top:6u; } .holdcard .bot small { display:block; color:#6B6060; font-size:17u; } .holdcard .bot small:first-child { display:none; }
    #go-meter .heard { left:392u; top:1236u; width:296u; height:236u; padding:34u 20u 0; text-align:center; background:#fff; border:6u solid #1E9BE0; border-radius:44u; box-shadow:0 10u 0 #0A6FA6, 0 26u 26u rgba(0,20,40,.3); overflow:visible; }
    #go-meter .heard::after { content:""; position:absolute; left:50%; top:-22u; width:36u; height:36u; margin-left:-18u; rotate:45deg; background:#fff; border-left:6u solid #1E9BE0; border-top:6u solid #1E9BE0; }
    #go-meter .heard small { color:#0A6FA6; font-size:24u; } #go-meter .heard b { display:block; margin-top:22u; color:#1F1A1A; font-size:44u; max-width:none; }
    #go-meter .tleft { left:720u; top:1204u; width:316u; height:316u; padding:0; border:0; border-radius:50%; display:grid; place-content:center; background:radial-gradient(circle, #D8232D 0 61%, transparent 62%), conic-gradient(#FFE08A 0 73%, #7E0F16 0); box-shadow:0 0 0 8u #F6F0E6, 0 12u 0 8u #7E0F16, 0 30u 30u rgba(0,20,40,.35); }
    #go-meter .tleft .v { display:grid; justify-items:center; gap:8u; } #go-meter .tleft .v b { font-size:84u; color:#F6F0E6; text-shadow:0 5u 0 #7E0F16; } #go-meter .tleft .v small { font-size:22u; color:#FFE08A; }
    #go-meter .tbar { display:none; }
  `) },
  // J. Ribbons: the slanted ribbon from the countdown screen, used three times. Cream for Hold it with a red bar, blue for We heard, red for the clock.
  j: { bars: true, css: LIVE + u(`
    .holdcard { left:40u; top:1198u; width:1000u; height:166u; padding:20u 70u 0 80u; border:0; border-radius:0; background:linear-gradient(180deg, #FFFBF3 0%, #EADFCB 86%, #B5A88F 86%); clip-path:polygon(2.4% 0, 100% 0, 97.6% 100%, 0 100%); box-shadow:none; }
    .holdcard .top b { color:#0A6FA6; font-size:34u; } .holdcard .top > span { color:#D8232D; font-size:66u; text-shadow:0 4u 0 rgba(126,15,22,.3); }
    .holdcard .hbar { height:30u; margin-top:6u; background:#D9CDB6; box-shadow:inset 0 0 0 2u rgba(30,27,27,.18); } .holdcard .hbar i { background:linear-gradient(90deg, #FF6A72, #D8232D); } .holdcard .bot { display:none; }
    #go-meter .heard { left:40u; top:1388u; width:560u; height:130u; padding:0 40u 0 60u; display:flex; align-items:center; gap:24u; border:0; border-radius:0; background:linear-gradient(180deg, #23B4F0 0%, #0A7FBC 86%, #064A70 86%); clip-path:polygon(4% 0, 100% 0, 96% 100%, 0 100%); }
    #go-meter .heard small { color:#FFE08A; font-size:24u; white-space:nowrap; } #go-meter .heard b { color:#fff; font-size:44u; }
    #go-meter .tleft { left:580u; top:1388u; width:460u; height:130u; padding:14u 50u 0 60u; gap:8u; border:0; border-radius:0; background:linear-gradient(180deg, #F0434C 0%, #B81B24 86%, #7E0F16 86%); clip-path:polygon(5% 0, 100% 0, 95% 100%, 0 100%); }
    #go-meter .tleft .v b { font-size:66u; color:#F6F0E6; text-shadow:0 4u 0 #7E0F16; } #go-meter .tleft .v small { font-size:24u; color:#FFE08A; }
    #go-meter .tbar { height:12u; background:rgba(0,0,0,.28); } #go-meter .tbar i { background:linear-gradient(90deg, #FFE9A8, #F6B93B); }
  `) },
};
const BARCSS = "";
buildDemo(); const chromium = await loadChromium(), site = await serveDemo(), browser = await chromium.launch(LAUNCH);
const on = (p, id) => p.waitForSelector(`#${id}.on`, { timeout: 30000 });
try {
  for (const [k, o] of Object.entries(OPTS)) {
    if (want.length && !want.includes(k)) continue;
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 }, permissions: ["microphone"] }); const p = await ctx.newPage(); const errors = []; p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(`${site.base}/kiosk/scream.html`); await p.waitForTimeout(800); await p.evaluate(() => { document.cookie = "wf_kiosk=2468; path=/"; }); await p.reload(); await p.waitForTimeout(1500);
    await p.click("#start"); await on(p, "s-code"); for (const ch of "123AB") await p.locator("#kbd button").filter({ hasText: new RegExp(`^${ch}$`) }).first().click();
    await p.click("#code-go"); await on(p, "s-ready"); await p.waitForTimeout(1200);
    await p.addStyleTag({ content: o.css + BARCSS });
    await p.evaluate(() => { const t = document.querySelector("#go-count .t"); if (document.querySelector("#go-count .t .rd") || !window.__two) return; });
    
    await p.click("#go"); await on(p, "s-go"); await p.waitForTimeout(1300); await p.screenshot({ path: path.join(out, `live-${k}-count.png`) });
    await p.waitForSelector("#go-meter", { state: "visible", timeout: 20000 });
    if (o.bars) await p.evaluate((h) => { const m = document.getElementById("go-meter"); const t = document.createElement("div"); t.innerHTML = h; [...t.children].forEach((c) => m.appendChild(c)); }, BARS("l") + BARS("r"));
    await p.waitForTimeout(2600); await p.screenshot({ path: path.join(out, `live-${k}-live.png`) });
    console.log(k, "errors", errors.length, errors.join("|")); await ctx.close();
  }
} finally { await browser.close(); site.close(); }

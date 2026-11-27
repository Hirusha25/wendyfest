// Design mock-ups, not live code: the upright Roast Me "Cooking your roast" screen with the photo hung from the blue header line
// and a white outline round Wendy. Usage: node scripts/mock-roast-cooking.mjs <outDir> <camera.mjpeg>
import path from "node:path"; import fs from "node:fs";
import { ROOT, buildDemo, serveDemo, loadChromium } from "./lib/kiosk-harness.mjs";
const [out, cam] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const P = (n) => `calc(${n} * var(--p))`; const p_ = (css) => css.replace(/(?<![#\w.])(-?\d+(?:\.\d+)?)u\b/g, (m, n) => P(n)).replace(/;/g, " !important;");
const LANY = fs.readFileSync(path.join(ROOT, "public/kiosk/roast.html"), "utf8").match(/<svg class="lany".*?<\/svg>/s)[0];
const OUTLINE = p_(`#s-cooking .art img { filter:drop-shadow(7u 0 0 #fff) drop-shadow(-7u 0 0 #fff) drop-shadow(0 7u 0 #fff) drop-shadow(0 -7u 0 #fff); }`);
const SWAY = `@keyframes mSway { from { rotate:-3deg; } to { rotate:3deg; } }`;
const OPTS = {
  base: { css: "", html: "" },
  // A. The photo hangs on the right from the blue line, on the same lanyard clip as the roast card, and sways.
  a: { css: OUTLINE + SWAY + p_(`
    #s-cooking .cpol { left:668u; top:330u; width:350u; rotate:0deg; transform-origin:50% -120u; animation:mSway 3.4s ease-in-out infinite alternate; box-shadow:5u 6u 0 #B9B0A3, 0 26u 50u rgba(0,0,0,.55); }
    #s-cooking .cpol .lany { position:absolute; left:50%; top:-128u; width:104u; height:122u; translate:-50% 0; overflow:visible; filter:drop-shadow(0 5u 7u rgba(0,0,0,.4)); }
    #s-cooking .t3 { font-size:82u; top:268u; } #s-cooking .chk { top:520u; }
  `), html: LANY },
  // B. A bigger photo in the middle, hung from the blue line on two cords with a red clip; the title sits above it and the steps run in a row underneath.
  b: { css: OUTLINE + SWAY + p_(`
    #s-cooking .eb { left:0; width:1080u; justify-content:center; top:214u; } #s-cooking .t3 { left:0; width:1080u; text-align:center; top:250u; font-size:84u; }
    #s-cooking .t3 span { display:inline; } #s-cooking .t3 span + span { margin-left:.2em; }
    #s-cooking .cpol { left:340u; top:440u; width:400u; rotate:0deg; transform-origin:50% -300u; animation:mSway 3.8s ease-in-out infinite alternate; box-shadow:5u 6u 0 #B9B0A3, 0 26u 50u rgba(0,0,0,.55); }
    #s-cooking .cpol .cord { position:absolute; left:50%; top:-306u; width:4u; height:300u; background:linear-gradient(180deg, #7FD0F7, #1E9BE0); translate:-50% 0; }
    #s-cooking .cpol .clip { position:absolute; left:50%; top:-26u; width:74u; height:52u; translate:-50% 0; border-radius:10u; background:linear-gradient(180deg, #F0434C, #A9161F); border:4u solid #fff; box-shadow:0 6u 0 #7E0F16; }
    #s-cooking .chk { left:50u; top:852u; width:980u; display:flex; justify-content:space-between; gap:0; }
    #s-cooking .chk .st i { width:46u; height:46u; } #s-cooking .chk .st b { font-size:23u; white-space:nowrap; } #s-cooking .chk .st { gap:10u; }
  `), html: `<i class="cord"></i><i class="clip"></i>` },
};
buildDemo(); const chromium = await loadChromium(), site = await serveDemo();
const browser = await chromium.launch({ args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", `--use-file-for-fake-video-capture=${cam}`] });
const on = (p, id) => p.waitForSelector(`#${id}.on`, { timeout: 60000 });
try {
  for (const [k, o] of Object.entries(OPTS)) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 }, permissions: ["camera", "microphone"] }); const p = await ctx.newPage(); const errors = []; p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(`${site.base}/kiosk/roast.html`); await p.waitForTimeout(800); await p.evaluate(() => { document.cookie = "wf_kiosk=2468; path=/"; }); await p.reload(); await p.waitForTimeout(1500);
    await p.click("#start"); await on(p, "s-code"); for (const ch of "123AB") await p.locator("#kb button").filter({ hasText: new RegExp(`^${ch}$`) }).first().click();
    await p.click("#code-go"); await on(p, "s-consent"); await p.click("#agree"); await on(p, "s-cam"); await p.waitForTimeout(2500);
    if (k === "base") await p.screenshot({ path: path.join(out, "cam-chips.png"), clip: { x: 40, y: 330, width: 1000, height: 330 } });
    await p.click("#snap"); await on(p, "s-cooking"); await p.waitForTimeout(1500);
    await p.addStyleTag({ content: o.css || "/* as it is now */" }); await p.evaluate((h) => { document.querySelector("#s-cooking .cpol").insertAdjacentHTML("beforeend", h); }, o.html);
    await p.waitForTimeout(900); await p.screenshot({ path: path.join(out, `cooking-${k}.png`) }); console.log(k, "errors", errors.length, errors.join("|")); await ctx.close();
  }
} finally { await browser.close(); site.close(); }

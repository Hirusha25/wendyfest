// Smoke test for both kiosks, run against the static demo build. Exits non-zero if anything fails.
// Usage: node scripts/kiosk-check.mjs [--shots <dir>]
//  - Roast Me: welcome → code → ready → camera → cooking → reveal → next guest, with no page errors.
//  - Scream & Win: comebacks for other restaurants and other words, a correct "Wendy's" still wins,
//    and the result headline stays clear of the divider line.
import fs from "node:fs";
import { buildDemo, serveDemo, loadChromium, openKiosk, LAUNCH } from "./lib/kiosk-harness.mjs";

const shots = process.argv.includes("--shots") ? process.argv[process.argv.indexOf("--shots") + 1] : null;
if (shots) fs.mkdirSync(shots, { recursive: true });
const fails = []; const check = (ok, what) => { console.log((ok ? "  ok   " : "  FAIL ") + what); if (!ok) fails.push(what); };
const shot = async (p, name) => { if (shots) await p.screenshot({ path: `${shots}/${name}.png` }); };

buildDemo();
const chromium = await loadChromium(), site = await serveDemo(), browser = await chromium.launch(LAUNCH);
try {
  console.log("Roast Me");
  {
    const { p, errors } = await openKiosk(browser, site.base, "roast.html");
    await p.reload(); await p.waitForTimeout(1200);
    const on = () => p.evaluate(() => document.querySelector(".screen.on").id);
    check(await on() === "s-idle", "opens on the welcome screen"); await shot(p, "roast-1-welcome");
    await p.click("#start"); await p.waitForTimeout(400);
    check(await p.evaluate(() => document.getElementById("code-go").classList.contains("ready")) === false, "Go is locked before six characters");
    for (const k of "WENDYS") await p.click(`#kb button:text-is("${k}")`);
    check(await p.inputValue("#code") === "WENDYS", "keypad types the code"); await shot(p, "roast-2-code");
    await p.click("#code-go"); await p.waitForTimeout(900);
    check(await on() === "s-consent", "valid code opens the Ready? screen"); await shot(p, "roast-3-ready");
    for (const l of ["si", "ta", "en"]) { await p.click(`.lang-pick button[data-l="${l}"]`); await p.waitForTimeout(200); }
    check(await p.evaluate(() => { const u = innerWidth / 1920; return document.getElementById("c-box").getBoundingClientRect().bottom / u < 1000; }), "consent card fits in all three languages");
    await p.click("#agree"); await p.waitForTimeout(1200);
    check(await on() === "s-cam" && !(await p.evaluate(() => document.getElementById("s-cam").classList.contains("camerr"))), "camera screen opens with a working camera"); await shot(p, "roast-4-camera");
    await p.click('#heat button[data-h="extra"]'); await p.click("#snap");
    await p.waitForSelector("#s-cooking.on", { timeout: 15000 }); await p.waitForTimeout(600);
    check(await p.textContent("#ck-heat") === "Extra spicy", "cooking polaroid shows the chosen heat"); await shot(p, "roast-5-cooking");
    await p.waitForSelector("#s-reveal.on", { timeout: 20000 }); await p.waitForTimeout(3500);
    check(await p.evaluate(() => { const c = document.querySelector(".rleft"); return c.scrollHeight <= c.clientHeight + 1; }), "roast text fits the reveal card"); await shot(p, "roast-6-reveal");
    await p.click("#s-reveal .nextb"); await p.waitForTimeout(400);
    check(await on() === "s-idle", "Next guest returns to the welcome screen");
    check(errors.length === 0, "no page errors" + (errors.length ? ": " + errors.join(" | ") : ""));
    await p.close();
  }
  console.log("Scream & Win");
  {
    const { p, errors } = await openKiosk(browser, site.base, "scream.html");
    const scream = (t) => p.evaluate(async (t) => {
      const r = await K.api("/api/kiosk/scream", { code: "WENDYS", peakDb: -8, sustainedDb: -8, transcript: t }); guest = { code: "WENDYS" }; showResult(r);
      await new Promise((r) => setTimeout(r, 700));
      const u = Math.min(innerWidth / 1440, innerHeight / 760), el = document.getElementById("res-title"), rg = document.createRange(); rg.selectNodeContents(el);
      return { won: r.won, sass: r.sass, newWin: !!document.querySelector("#win-new").offsetParent, title: el.textContent, gapToLine: (document.querySelector("#s-result .vdiv").getBoundingClientRect().left - rg.getBoundingClientRect().right) / u, titleHeight: el.offsetHeight / u };
    }, t);
    for (const t of ["KFC", "McDonald's", "Burger King", "pizza", "hello", "banana", "I want a burger please now"]) {
      const r = await scream(t);
      check(!r.won && r.sass && r.title === r.sass.title && r.gapToLine > 10 && r.titleHeight <= 151, `"${t}" → big headline "${r.title}"`);
      if (t === "KFC") await shot(p, "scream-result-kfc");
    }
    const rude = await scream("this is shit");
    check(rude.sass && !/shit/i.test(rude.sass.title + rude.sass.text), "rude words are not repeated on screen");
    const noS = await scream("Wendy"); check(!noS.won && !noS.sass && noS.gapToLine > 10, '"Wendy" without the S loses with the normal message');
    const win = await scream("Wendy's"); check(win.won && !win.sass && (win.newWin || win.gapToLine > 10), 'a correct "Wendy\'s" wins');
    check(errors.length === 0, "no page errors" + (errors.length ? ": " + errors.join(" | ") : ""));
    await p.close();
  }
} finally { await browser.close(); site.close(); }
console.log(fails.length ? `\n${fails.length} check(s) failed` : "\nAll checks passed");
process.exit(fails.length ? 1 : 0);

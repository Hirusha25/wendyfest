// Design mock-ups, not live code: the guest's phone roast page restyled to match the Roast Me kiosk
// (blue header, red stage, white wave, dark lower half, card hung from the header line). Download and Share stay.
// Runs a throwaway local server (no AI, no voice) with one test roast, then injects each option's CSS into the real page.
// Usage: node scripts/mock-phone-roast.mjs <photo.jpg> <tmpDir> <outDir>
import fs from "node:fs"; import path from "node:path"; import { spawn } from "node:child_process"; import { DatabaseSync } from "node:sqlite";
import { loadChromium, ROOT } from "./lib/kiosk-harness.mjs";
const [photo, tmp, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true }); fs.mkdirSync(tmp, { recursive: true });
const env = { ...process.env, PORT: "3999", KIOSK_PIN: "2468", DB_PATH: path.join(tmp, "t.sqlite"), PHOTO_DIR: path.join(tmp, "ph"), BASE_URL: "http://127.0.0.1:3999", ANTHROPIC_API_KEY: "", ELEVENLABS_API_KEY: "", SMS_PROVIDER: "console", DEMO_CODES: "TEST01" };
const WAVE = (fill) => `<svg class="m-wave" viewBox="0 0 390 64" preserveAspectRatio="none"><path d="M0 40 C 80 14, 190 66, 390 20 L390 64 L0 64Z" fill="${fill}"/><path d="M0 40 C 80 14, 190 66, 390 20" fill="none" stroke="#fff" stroke-width="5"/><path d="M0 28 C 80 2, 190 54, 390 8" fill="none" stroke="#fff" stroke-width="1.6" opacity=".85"/></svg>`;
const COMMON = `
  html, body, .app { background:#141111 !important; }
  .app { max-width:none !important; box-shadow:none !important; }
  .hdr { position:relative; z-index:5; padding:12px 16px !important; background:linear-gradient(180deg, #23B4F0, #0590C6) !important; border-bottom:4px solid #fff; border-radius:0 !important; box-shadow:0 6px 14px rgba(0,0,0,.3); }
  .hdr::before, .hdr::after { display:none !important; }
  .hdr .eyebrow, .hdr h1 { display:none !important; }
  .hdr .top { display:flex; align-items:center; gap:10px; }
  .hdr .lockup { height:24px !important; width:auto !important; } .hdr .m-fest { height:34px; margin-right:auto; padding-left:10px; border-left:1.5px solid rgba(255,255,255,.55); }
  main.body { display:block !important; padding:0 !important; margin:0 !important; background:none !important; }
  .m-zr { position:relative; padding:0 0 78px; overflow:hidden; }
  .m-wave { position:absolute; left:0; right:0; bottom:-1px; width:100%; height:64px; display:block; }
  .hang { margin-top:56px !important; }
  .swatch span { color:#fff !important; opacity:.9; }
  .m-zd { position:relative; padding:4px 18px 22px; }
  .m-vibe { display:flex; align-items:center; gap:10px; font:italic 800 11px/1 Poppins, sans-serif; letter-spacing:.2em; text-transform:uppercase; color:#5CC3F2; }
  .m-vibe::after { content:""; width:34px; height:2px; background:#5CC3F2; }
  .m-title { margin:8px 0 14px; font:italic 900 31px/1 Poppins, sans-serif; text-transform:uppercase; color:#fff; text-shadow:1px 1px 0 #D8232D, 2px 2px 0 #D8232D, 3px 3px 0 #D8232D; }
  .rpaper { margin:0 !important; padding:16px 18px 18px !important; border-radius:14px !important; }
  .rpaper .vibe, .rpaper .rtitle { display:none !important; }
  .m-who { display:flex; align-items:center; gap:9px; margin-bottom:10px; font:italic 800 11px/1 Poppins, sans-serif; letter-spacing:.18em; text-transform:uppercase; color:#fff; }
  .m-who img { width:26px; height:26px; border-radius:50%; background:#fff; }
  .rpaper .rbody { font-size:18px !important; line-height:1.45 !important; margin:0 !important; }
  .two { margin-top:18px !important; gap:12px !important; }
  .two .btn { height:56px !important; font-size:15px !important; border-radius:999px !important; }
  .two .btn.outline { background:transparent !important; color:#fff !important; border:2.5px solid #fff !important; box-shadow:none !important; }
  a.link { color:#fff !important; opacity:.8; }
  #foot, #foot *, footer { background-color:#0590C6 !important; color:#fff !important; }
`;
const RED = `background:repeating-conic-gradient(from -6deg at 50% -10%, rgba(255,255,255,.055) 0 6deg, transparent 6deg 12deg), radial-gradient(ellipse 90% 70% at 50% 30%, #EA3640, #B01A22) !important;`;
const OPTS = {
  // A. Kiosk twin: card centred, hanging from the blue header line; colour circles under it; wave; dark half with the roast and the buttons.
  a: { wave: "#141111", css: `.m-zr { ${RED} } .two .btn:not(.outline) { box-shadow:0 5px 0 #7E0F16 !important; }` },
  // B. Kiosk layout side by side: card hangs on the left, the name and the colour circles sit to its right.
  b: { wave: "#141111", side: true, css: `.m-zr { ${RED} display:grid; grid-template-columns:54% 1fr; align-items:start; }
    .hang { width:46vw !important; margin:56px 0 0 22px !important; }
    .m-side { position:relative; z-index:2; padding:84px 12px 0 22px; color:#fff; }
    .m-side small { display:block; font:italic 800 10px/1 Poppins, sans-serif; letter-spacing:.2em; text-transform:uppercase; opacity:.9; }
    .m-side b { display:block; margin:8px 0 22px; font:italic 900 27px/.95 Poppins, sans-serif; text-transform:uppercase; text-shadow:0 3px 0 #7E0F16; overflow-wrap:anywhere; }
    .m-side .swatch { display:grid !important; grid-template-columns:repeat(2, 46px); gap:14px !important; justify-content:start !important; margin:12px 0 0 !important; }
    .m-side .swatch span { display:none; } .m-side .swatch button { width:46px !important; height:46px !important; }
    .two .btn:not(.outline) { box-shadow:0 5px 0 #7E0F16 !important; }` },
  // C. Flipped: the card hangs on a dark stage with a red glow, the wave turns red, and the roast sits on the red half. Share is blue so it stands out on red.
  c: { wave: "#C2202A", css: `.m-zr { background:radial-gradient(ellipse 80% 60% at 50% 42%, rgba(227,32,43,.55), transparent 70%), repeating-conic-gradient(from -6deg at 50% -10%, rgba(255,255,255,.035) 0 6deg, transparent 6deg 12deg), #141111 !important; }
    .m-zd { background:repeating-linear-gradient(115deg, rgba(255,255,255,.04) 0 22px, transparent 22px 44px), linear-gradient(180deg, #C2202A, #9A141C) !important; }
    .m-title { text-shadow:1px 1px 0 #141111, 2px 2px 0 #141111, 3px 3px 0 #141111; } .m-vibe { color:#fff; } .m-vibe::after { background:#fff; }
    .two .btn:not(.outline) { background:linear-gradient(180deg, #23B4F0, #0590C6) !important; border:2.5px solid #fff !important; box-shadow:0 5px 0 #01476A !important; }` },
};
const srv = spawn("node", ["server/index.js"], { cwd: ROOT, env, stdio: ["ignore", "pipe", "pipe"] });
const wait = (ms) => new Promise((r) => setTimeout(r, ms)); const B = "http://127.0.0.1:3999";
const browser = await (await loadChromium()).launch();
try {
  for (let i = 0; i < 40; i++) { try { if ((await fetch(B + "/api/config")).ok) break; } catch {} await wait(300); }
  const db = new DatabaseSync(env.DB_PATH); db.prepare("insert or ignore into participants(code,token,name,phone) values('TEST01','tok-test-01','Nimal Perera','94770009999')").run(); db.close();
  const img = "data:image/jpeg;base64," + fs.readFileSync(photo).toString("base64");
  const r = await (await fetch(B + "/api/kiosk/roast", { method: "POST", headers: { "content-type": "application/json", "x-pin": "2468" }, body: JSON.stringify({ code: "TEST01", image: img, consent: true }) })).json();
  const d2 = new DatabaseSync(env.DB_PATH); d2.prepare("update roasts set title_en = ?, roast_en = ?, vibe = ?, observations = ? where token = ?").run("The Bigger Roar", "Nice lion T-shirt, Nimal. But our Lankan Fire Burger has the bigger roar.", "Lion T-shirt", JSON.stringify(["lion T-shirt"]), r.token); d2.close();
  for (const [k, o] of Object.entries(OPTS)) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const p = await ctx.newPage(); const errors = []; p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(`${B}/r/${r.token}`, { waitUntil: "domcontentloaded" }); await p.waitForTimeout(11000);
    await p.addStyleTag({ content: ".hang, .hang::after { animation:none !important; rotate:-2deg; }" + COMMON + o.css });
    await p.evaluate(({ wave, side }) => {
      const main = document.querySelector("main.body"), q = (s) => document.querySelector(s), el = (h) => { const t = document.createElement("div"); t.innerHTML = h; return t.firstElementChild; };
      q(".hdr .lockup").after(el('<img class="m-fest" src="/assets/wendyfest-logo.svg" alt="">'));
      const zr = el('<div class="m-zr"></div>'), zd = el('<div class="m-zd"></div>'); main.prepend(zr); zr.after(zd);
      zr.append(q(".hang"));
      if (side) { const s = el('<div class="m-side"><small>Roasted by Wendy’s</small><b></b><small>Card colour</small></div>'); s.querySelector("b").textContent = q("#who").textContent; s.append(q("#swatch")); zr.append(s); } else zr.append(q("#swatch"));
      zr.append(el(wave));
      zd.append(el('<div class="m-vibe"></div>'), el('<div class="m-title"></div>'), q(".rpaper"), q(".two"), q("a.link"));
      q(".m-vibe").textContent = q("#vibe").textContent; q(".m-title").textContent = q("#title").textContent;
      q(".rpaper").prepend(el('<div class="m-who"><img src="/assets/cameo.png" alt="">Wendy says</div>'));
    }, { wave: WAVE(o.wave), side: !!o.side });
    await p.waitForTimeout(900);
    await p.screenshot({ path: path.join(out, `phone-${k}.png`), fullPage: true }); if (errors.length) console.log(k, "errors:", errors.join("|"));
    await ctx.close();
  }
} finally { await browser.close(); srv.kill(); }
console.log("done");

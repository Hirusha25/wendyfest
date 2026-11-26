// TEMPORARY design mock-ups, not live code: the Scream & Win winning screen with the burger meal and the coupon.
// Usage: node scripts/_mock-win.mjs <outDir> [option ...]
import path from "node:path"; import fs from "node:fs";
import { ROOT, buildDemo, serveDemo, loadChromium, openKiosk, LAUNCH } from "./lib/kiosk-harness.mjs";
const out = process.argv[2]; const want = process.argv.slice(3); fs.mkdirSync(out, { recursive: true });
const MEAL = "data:image/webp;base64," + fs.readFileSync(path.join(ROOT, "public/assets/spicy-meal.webp")).toString("base64");
const U = (n) => `calc(${n} * var(--u))`;
const PRIZE = { free: { big: "FREE", line: "Spicy Chicken Burger Meal", code: "WFREE-7K2M9Q" }, half: { big: "50% OFF", line: "Spicy Chicken Burger Meal", code: "WHALF-4T8X2B" } };
const STR = `repeating-linear-gradient(90deg, #1E9BE0 0 ${U(26)}, #fff ${U(26)} ${U(52)})`;
// Each option returns css + html placed inside the result box (upright kiosk, 1080 wide units).
const OPTS = {
  base: () => ({ css: "", html: "" }),
  // A: tray ticket. Meal photo on top of a cream ticket with a torn edge, prize in big letters, code in a dashed box.
  a: (P) => ({ css: `
    #res-coupon, #s-result .vdiv, #res-eyebrow { display:none !important; }
    #res-score { top:${U(222)} !important; font-size:${U(205)} !important; }
    #res-title { font-size:${U(90)} !important; top:${U(24)} !important; }
    #s-result .spark { top:${U(250)} !important; }
    .w-tk { position:absolute; left:${U(70)}; top:${U(650)}; width:${U(940)}; height:${U(640)}; border-radius:${U(36)}; background:linear-gradient(170deg, #FFFBF3, #F3E8D6); box-shadow:0 ${U(12)} 0 #01476A, 0 ${U(30)} ${U(50)} rgba(0,30,60,.4); }
    .w-tk::before, .w-tk::after { content:""; position:absolute; top:${U(392)}; width:${U(52)}; height:${U(52)}; border-radius:50%; background:#0590C6; }
    .w-tk::before { left:${U(-26)}; } .w-tk::after { right:${U(-26)}; }
    .w-tk .cut { position:absolute; left:${U(44)}; right:${U(44)}; top:${U(417)}; border-top:${U(4)} dashed rgba(30,27,27,.3); }
    .w-tk img { position:absolute; left:${U(-40)}; top:${U(-150)}; width:${U(560)}; filter:drop-shadow(0 ${U(22)} ${U(20)} rgba(0,0,0,.35)); }
    .w-tk .big { position:absolute; left:${U(500)}; top:${U(60)}; width:${U(410)}; font:italic 900 ${U(P.big.length > 4 ? 104 : 150)}/.9 Poppins, sans-serif; color:#D8232D; text-shadow:0 ${U(5)} 0 #8E1219; }
    .w-tk .ln { position:absolute; left:${U(500)}; top:${U(P.big.length > 4 ? 262 : 214)}; width:${U(410)}; font:800 ${U(40)}/1.1 Poppins, sans-serif; color:#1F1A1A; }
    .w-tk .lb { position:absolute; left:0; right:0; top:${U(442)}; text-align:center; font:italic 800 ${U(28)}/1 Poppins, sans-serif; letter-spacing:.18em; text-transform:uppercase; color:#6B6060; }
    .w-tk .cd { position:absolute; left:${U(70)}; right:${U(70)}; top:${U(486)}; height:${U(112)}; border:${U(4)} dashed #D8232D; border-radius:${U(20)}; display:grid; place-items:center; font:italic 900 ${U(70)}/1 Poppins, sans-serif; color:#D8232D; background:#fff; }
    .w-sm { position:absolute; left:0; width:${U(1080)}; top:${U(1296)}; text-align:center; font:600 ${U(27)}/1 Poppins, sans-serif; color:#fff; display:none; }
    #s-result .qrcard { top:${U(1330)} !important; } `,
    html: `<div class="w-tk"><img src="${MEAL}"><div class="big">${P.big}</div><div class="ln">${P.line}</div><i class="cut"></i><div class="lb">Your coupon code</div><div class="cd">${P.code}</div></div>` }),
  // B: hero burger. The meal sits large on a blue and white striped awning; a red prize burst overlaps it; the code is a red bar underneath.
  b: (P) => ({ css: `
    #res-coupon, #s-result .vdiv, #res-eyebrow, #s-result .spark { display:none !important; }
    #res-title { font-size:${U(90)} !important; top:${U(24)} !important; }
    #res-score { left:${U(700)} !important; width:${U(340)} !important; top:${U(214)} !important; font-size:${U(150)} !important; transform:none !important; }
    .w-sc { position:absolute; left:${U(700)}; width:${U(340)}; top:${U(376)}; text-align:center; font:italic 800 ${U(26)}/1 Poppins, sans-serif; letter-spacing:.18em; text-transform:uppercase; color:#F6F0E6; }
    .w-aw { position:absolute; left:${U(70)}; top:${U(430)}; width:${U(940)}; height:${U(570)}; border-radius:${U(36)}; background:${STR}; box-shadow:0 ${U(12)} 0 #01476A, 0 ${U(30)} ${U(50)} rgba(0,30,60,.4); overflow:hidden; }
    .w-aw::after { content:""; position:absolute; inset:0; background:radial-gradient(ellipse 70% 60% at 50% 60%, rgba(255,255,255,.75), transparent 75%); }
    .w-ml { position:absolute; left:${U(150)}; top:${U(432)}; width:${U(800)}; filter:drop-shadow(0 ${U(26)} ${U(22)} rgba(0,0,0,.4)); }
    .w-bs { position:absolute; left:${U(36)}; top:${U(226)}; width:${U(330)}; height:${U(330)}; display:grid; place-items:center; rotate:-9deg; text-align:center; background:#D8232D; color:#fff; clip-path:polygon(50% 0, 61% 9%, 75% 5%, 81% 18%, 95% 20%, 94% 34%, 100% 46%, 93% 58%, 97% 72%, 84% 78%, 80% 92%, 66% 91%, 54% 100%, 42% 92%, 28% 96%, 21% 83%, 7% 81%, 8% 66%, 0 55%, 8% 43%, 3% 29%, 16% 22%, 21% 8%, 35% 10%); font:italic 900 ${U(P.big.length > 4 ? 76 : 108)}/.92 Poppins, sans-serif; filter:drop-shadow(0 ${U(10)} 0 #8E1219); }
    .w-bs small { display:block; font:800 ${U(24)}/1.1 Poppins, sans-serif; letter-spacing:.06em; margin-top:${U(6)}; }
    .w-ln { position:absolute; left:0; width:${U(1080)}; top:${U(1028)}; text-align:center; font:italic 900 ${U(52)}/1 Poppins, sans-serif; color:#fff; text-transform:uppercase; }
    .w-cd { position:absolute; left:${U(70)}; top:${U(1100)}; width:${U(940)}; height:${U(186)}; border-radius:${U(30)}; background:linear-gradient(180deg, #E5303A, #B81B24); border:${U(5)} solid #fff; box-sizing:border-box; box-shadow:0 ${U(10)} 0 #7E0F16; display:grid; grid-template-rows:auto auto; align-content:center; justify-items:center; gap:${U(10)}; color:#fff; }
    .w-cd small { font:italic 800 ${U(26)}/1 Poppins, sans-serif; letter-spacing:.2em; text-transform:uppercase; opacity:.9; }
    .w-cd b { font:italic 900 ${U(84)}/1 Poppins, sans-serif; letter-spacing:.02em; }
    #s-result .qrcard { top:${U(1326)} !important; } `,
    html: `<div class="w-sc">Final score</div><div class="w-aw"></div><img class="w-ml" src="${MEAL}"><div class="w-bs"><span>${P.big.replace(" ", "<br>")}<small>${P.big === "FREE" ? "MEAL" : "YOUR MEAL"}</small></span></div><div class="w-ln">${P.line}</div><div class="w-cd"><small>Your coupon code</small><b>${P.code}</b></div>` }),
  // C: dark premium voucher, matching the dark "Wendy says" card: white line all round, red dots, meal photo on the right, code in white.
  c: (P) => ({ css: `
    #res-coupon, #s-result .vdiv, #res-eyebrow { display:none !important; }
    #res-score { top:${U(222)} !important; font-size:${U(205)} !important; }
    #res-title { font-size:${U(90)} !important; top:${U(24)} !important; }
    #s-result .spark { top:${U(250)} !important; }
    .w-vc { position:absolute; left:${U(70)}; top:${U(600)}; width:${U(940)}; height:${U(690)}; border-radius:${U(36)}; background:linear-gradient(160deg, #2A2525, #141111); border:${U(5)} solid rgba(255,255,255,.92); box-sizing:border-box; box-shadow:0 ${U(30)} ${U(50)} rgba(0,20,40,.5); }
    .w-vc .dots { position:absolute; inset:0; border-radius:${U(30)}; background:radial-gradient(circle, rgba(227,32,43,.95) ${U(5)}, transparent ${U(5.8)}) 0 0 / ${U(28)} ${U(28)}; -webkit-mask:radial-gradient(ellipse 60% 60% at 0 100%, #000 0, rgba(0,0,0,.5) 45%, transparent 100%); mask:radial-gradient(ellipse 60% 60% at 0 100%, #000 0, rgba(0,0,0,.5) 45%, transparent 100%); }
    .w-vc img { position:absolute; right:${U(-46)}; top:${U(-96)}; width:${U(500)}; filter:drop-shadow(0 ${U(24)} ${U(22)} rgba(0,0,0,.55)); }
    .w-vc .ey { position:absolute; left:${U(54)}; top:${U(54)}; font:italic 800 ${U(28)}/1 Poppins, sans-serif; letter-spacing:.2em; text-transform:uppercase; color:#5CC3F2; }
    .w-vc .big { position:absolute; left:${U(50)}; top:${U(108)}; font:italic 900 ${U(P.big.length > 4 ? 104 : 160)}/.9 Poppins, sans-serif; color:#FF4B55; width:${U(400)}; }
    .w-vc .ln { position:absolute; left:${U(54)}; top:${U(330)}; width:${U(800)}; font:800 ${U(46)}/1.1 Poppins, sans-serif; color:#fff; }
    .w-vc .cd { position:absolute; left:${U(50)}; right:${U(50)}; top:${U(440)}; height:${U(190)}; border-radius:${U(24)}; background:rgba(20,17,17,.82); border:${U(4)} dashed rgba(255,255,255,.85); box-sizing:border-box; display:grid; align-content:center; justify-items:center; gap:${U(10)}; }
    .w-vc .cd small { font:italic 800 ${U(24)}/1 Poppins, sans-serif; letter-spacing:.2em; text-transform:uppercase; color:#B9B0B0; }
    .w-vc .cd b { font:italic 900 ${U(80)}/1 Poppins, sans-serif; color:#fff; }
    #s-result .qrcard { top:${U(1326)} !important; } `,
    html: `<div class="w-vc"><i class="dots"></i><img src="${MEAL}"><div class="ey">You won</div><div class="big">${P.big}</div><div class="ln">${P.line}</div><div class="cd"><small>Your coupon code</small><b>${P.code}</b></div></div>` }),
};
buildDemo();
const chromium = await loadChromium(), site = await serveDemo(), browser = await chromium.launch(LAUNCH);
try {
  for (const k of Object.keys(OPTS)) for (const tier of k === "base" ? ["free"] : ["free", "half"]) {
    if (want.length && !want.includes(k)) continue;
    const { p, errors } = await openKiosk(browser, site.base, "scream.html", { width: 1080, height: 1920 }, 1);
    const o = OPTS[k](PRIZE[tier]);
    await p.evaluate(async ({ o, code }) => {
      Math.random = () => 0.1; window.confetti = () => {}; try { SFX.win = () => {}; sayPreset = () => {}; } catch {}
      const r = await K.api("/api/kiosk/scream", { code: "WENDYS", peakDb: -6, sustainedDb: -6, transcript: "Wendy's" }); guest = { code: "WENDYS" };
      if (!r.coupon) r.coupon = { code, label: "" }; r.won = true; r.coupon.code = code; showResult(r);
      const box = document.querySelector("#s-result .box"); const st = document.createElement("style"); st.textContent = o.css; document.head.appendChild(st);
      const t = document.createElement("div"); t.innerHTML = o.html; [...t.children].forEach((el) => box.insertBefore(el, box.querySelector(".qrcard")));
      await new Promise((r) => setTimeout(r, 2600));
    }, { o, code: PRIZE[tier].code });
    await p.screenshot({ path: path.join(out, `win-${k}-${tier}.png`) }); if (errors.length) console.log(k, tier, "errors:", errors.join("|"));
    await p.close();
  }
} finally { await browser.close(); site.close(); }
console.log("done");

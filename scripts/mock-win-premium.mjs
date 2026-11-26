// Design mock-ups, not live code: a cleaner, centred Scream & Win winning screen (upright kiosk) with the meal and the coupon.
// Usage: node scripts/mock-win-premium.mjs <outDir> [option ...]
import path from "node:path"; import fs from "node:fs";
import { ROOT, buildDemo, serveDemo, loadChromium, openKiosk, LAUNCH } from "./lib/kiosk-harness.mjs";
const out = process.argv[2]; const want = process.argv.slice(3); fs.mkdirSync(out, { recursive: true });
const MEAL = "data:image/webp;base64," + fs.readFileSync(path.join(ROOT, "public/assets/spicy-meal.webp")).toString("base64");
const U = (n) => `calc(${n} * var(--u))`;
const PRIZE = { free: { big: "FREE MEAL", code: "WFREE-7K2M9Q" }, half: { big: "50% OFF", code: "WHALF-4T8X2B" } };
const LINE = "Spicy Chicken Burger Meal";
const BASE = `
  #s-result .box > :not(.btn):not(.w):not(.conf-static) { display:none !important; }
  .w { position:absolute; box-sizing:border-box; font-family:Poppins, sans-serif; }
  .w.c { left:0; width:${U(1080)}; text-align:center; }
  .w.tt { top:${U(40)}; font:italic 900 ${U(58)}/1 Poppins, sans-serif; color:#fff; text-transform:uppercase; letter-spacing:.01em; text-shadow:0 ${U(4)} 0 rgba(0,50,90,.35); }
  .w.pill { left:50%; translate:-50% 0; top:${U(126)}; height:${U(64)}; padding:0 ${U(32)}; border-radius:999px; background:rgba(255,255,255,.16); border:${U(2.5)} solid rgba(255,255,255,.65); display:flex; align-items:center; gap:${U(18)}; white-space:nowrap; font:italic 800 ${U(24)}/1 Poppins, sans-serif; letter-spacing:.2em; text-transform:uppercase; color:#fff; }
  .w.pill b { font:italic 900 ${U(40)}/1 Poppins, sans-serif; letter-spacing:0; }
  .w.meal { filter:drop-shadow(0 ${U(30)} ${U(24)} rgba(0,20,40,.45)); }
  .w.ln { font:700 ${U(42)}/1 Poppins, sans-serif; color:#fff; }
  /* the coupon: code on the left, QR on the right, a tear line between */
  .w.cpw { left:${U(70)}; width:${U(940)}; height:${U(450)}; filter:drop-shadow(0 ${U(22)} ${U(26)} rgba(0,20,40,.45)); }
  .cp { position:absolute; inset:0; border-radius:${U(36)}; display:grid; grid-template-columns:1fr ${U(310)}; align-items:center; -webkit-mask:radial-gradient(circle ${U(26)} at calc(100% - ${U(310)}) 0, #0000 97%, #000) top / 100% 51% no-repeat, radial-gradient(circle ${U(26)} at calc(100% - ${U(310)}) 100%, #0000 97%, #000) bottom / 100% 51% no-repeat; }
  .cp .l { display:grid; justify-items:center; gap:${U(20)}; padding:0 ${U(20)}; }
  .cp .l small { font:italic 800 ${U(25)}/1 Poppins, sans-serif; letter-spacing:.22em; text-transform:uppercase; }
  .cp .l b { font:italic 900 ${U(70)}/1 Poppins, sans-serif; white-space:nowrap; }
  .cp .l span { font:500 ${U(25)}/1.3 Poppins, sans-serif; }
  .cp .r { height:100%; display:grid; align-content:center; justify-items:center; gap:${U(16)}; border-left:${U(4)} dashed rgba(255,255,255,.4); }
  .cp .r img { width:${U(216)}; height:${U(216)}; border-radius:${U(18)}; background:#fff; padding:${U(12)}; box-sizing:border-box; }
  .cp .r em { font:italic 800 ${U(24)}/1 Poppins, sans-serif; letter-spacing:.16em; text-transform:uppercase; }
  .cp.dark { background:linear-gradient(160deg, #2A2525, #141111); color:#fff; border:${U(4)} solid rgba(255,255,255,.92); }
  .cp.dark .l small, .cp.dark .l span { color:#B9B0B0; } .cp.dark .r em { color:#5CC3F2; }
  .cp.glass { background:linear-gradient(160deg, rgba(255,255,255,.26), rgba(255,255,255,.1)); color:#fff; border:${U(3)} solid rgba(255,255,255,.8); backdrop-filter:blur(${U(10)}); }
  .cp.red { background:linear-gradient(170deg, #E5303A, #A9161F); color:#fff; border:${U(4)} solid #fff; }
  .cp.red .l small, .cp.red .l span { opacity:.9; }
`;
const coupon = (P, kind, top) => `<div class="w cpw" style="top:${U(top)}"><div class="cp ${kind}"><div class="l"><small>Your coupon code</small><b>${P.code}</b><span>Sent to your phone by SMS</span></div><div class="r"><img class="qr" alt=""><em>Scan to save</em></div></div></div>`;
const head = `<div class="w c tt">You brought the loud.</div><div class="w pill">Final score <b>100</b></div>`;
const OPTS = {
  // 1. Spotlight: everything on one centre line. The meal sits in a soft light, the prize is the headline, one dark coupon underneath.
  1: (P) => ({ css: `
    .w.glow { left:${U(90)}; top:${U(190)}; width:${U(900)}; height:${U(600)}; background:radial-gradient(ellipse 50% 50% at 50% 52%, rgba(255,255,255,.6), rgba(255,255,255,.16) 55%, transparent 72%); }
    .w.meal { left:${U(170)}; top:${U(214)}; width:${U(740)}; }
    .w.ey { top:${U(742)}; font:italic 800 ${U(28)}/1 Poppins, sans-serif; letter-spacing:.34em; text-transform:uppercase; color:#fff; }
    .w.big { top:${U(784)}; font:italic 900 ${U(150)}/1 Poppins, sans-serif; color:#F6F0E6; white-space:nowrap; text-shadow:${[1, 2, 3, 4, 5, 6, 7].map((n) => `${U(n)} ${U(n)} 0 #B01820`).join(", ")}, ${U(12)} ${U(18)} ${U(22)} rgba(0,30,60,.35); }
    .w.ln { top:${U(952)}; } `,
    html: `${head}<i class="w glow"></i><img class="w meal" src="${MEAL}"><div class="w c ey">You won</div><div class="w c big">${P.big}</div><div class="w c ln">${LINE}</div>${coupon(P, "dark", 1046)}` }),
  // 2. Voucher: one tall dark card with a white line all round (matches the "Wendy says" card). The meal rises out of the top of it.
  2: (P) => ({ css: `
    .w.vc { left:${U(70)}; top:${U(330)}; width:${U(940)}; height:${U(1180)}; border-radius:${U(44)}; background:linear-gradient(165deg, #2B2626, #121010); border:${U(5)} solid rgba(255,255,255,.92); box-shadow:0 ${U(30)} ${U(50)} rgba(0,20,40,.5); overflow:hidden; }
    .w.vc::before { content:""; position:absolute; inset:0; background:radial-gradient(circle, rgba(227,32,43,.95) ${U(5)}, transparent ${U(5.8)}) 0 0 / ${U(28)} ${U(28)}; -webkit-mask:radial-gradient(ellipse 55% 30% at 100% 0, #000 0, rgba(0,0,0,.45) 50%, transparent 100%); }
    .w.vc::after { content:""; position:absolute; left:${U(-140)}; right:${U(-140)}; top:${U(-80)}; height:${U(480)}; background:radial-gradient(ellipse 50% 50% at 50% 50%, rgba(92,195,242,.3), transparent 70%); }
    .w.pill { top:${U(126)}; }
    .w.meal { left:${U(190)}; top:${U(186)}; width:${U(700)}; }
    .w.ey { top:${U(690)}; font:italic 800 ${U(28)}/1 Poppins, sans-serif; letter-spacing:.34em; text-transform:uppercase; color:#5CC3F2; }
    .w.big { top:${U(732)}; font:italic 900 ${U(146)}/1 Poppins, sans-serif; color:#FF4B55; white-space:nowrap; }
    .w.ln { top:${U(894)}; }
    .w.tear { left:${U(120)}; width:${U(840)}; top:${U(980)}; border-top:${U(4)} dashed rgba(255,255,255,.32); }
    .w.lb { top:${U(1018)}; font:italic 800 ${U(25)}/1 Poppins, sans-serif; letter-spacing:.22em; text-transform:uppercase; color:#B9B0B0; }
    .w.cd { top:${U(1062)}; font:italic 900 ${U(96)}/1 Poppins, sans-serif; color:#fff; white-space:nowrap; }
    .w.row { left:${U(130)}; width:${U(820)}; top:${U(1200)}; height:${U(250)}; display:grid; grid-template-columns:${U(250)} 1fr; align-items:center; gap:${U(40)}; }
    .w.row img { width:${U(250)}; height:${U(250)}; border-radius:${U(22)}; background:#fff; padding:${U(14)}; box-sizing:border-box; }
    .w.row b { display:block; font:italic 900 ${U(46)}/1.05 Poppins, sans-serif; color:#fff; text-transform:uppercase; }
    .w.row span { display:block; margin-top:${U(14)}; font:500 ${U(27)}/1.3 Poppins, sans-serif; color:#B9B0B0; } `,
    html: `${head}<div class="w vc"></div><img class="w meal" src="${MEAL}"><div class="w c ey">You won</div><div class="w c big">${P.big}</div><div class="w c ln">${LINE}</div><i class="w tear"></i><div class="w c lb">Your coupon code</div><div class="w c cd">${P.code}</div><div class="w row"><img class="qr" alt=""><div><b>Scan to save your reward</b><span>Also sent to your phone by SMS</span></div></div>` }),
  // 3. Medallion: the meal in a round dark badge with a red and white ring and a red ribbon for the prize; a frosted-glass coupon underneath.
  3: (P) => ({ css: `
    .w.md { left:${U(230)}; top:${U(226)}; width:${U(620)}; height:${U(620)}; border-radius:50%; background:radial-gradient(circle at 50% 38%, #12507A, #072A44 70%); border:${U(8)} solid #fff; box-shadow:0 0 0 ${U(14)} #D8232D, 0 0 0 ${U(19)} rgba(255,255,255,.9), 0 ${U(34)} ${U(50)} rgba(0,20,40,.5), 0 0 ${U(120)} rgba(255,255,255,.35); }
    .w.md::before { content:""; position:absolute; inset:${U(22)}; border-radius:50%; border:${U(4)} dotted rgba(255,255,255,.5); }
    .w.meal { left:${U(180)}; top:${U(290)}; width:${U(720)}; }
    .w.rbw { left:0; width:${U(1080)}; top:${U(748)}; display:flex; justify-content:center; }
    .rb { height:${U(150)}; padding:0 ${U(64)}; display:grid; place-items:center; rotate:-3deg; background:linear-gradient(180deg, #EA3640, #B01A22); border:${U(5)} solid #fff; border-radius:${U(26)}; box-shadow:0 ${U(10)} 0 #7E0F16, 0 ${U(24)} ${U(30)} rgba(0,20,40,.4); font:italic 900 ${U(104)}/1 Poppins, sans-serif; color:#fff; white-space:nowrap; }
    .w.ln { top:${U(952)}; } `,
    html: `${head}<div class="w md"></div><img class="w meal" src="${MEAL}"><div class="w rbw"><div class="rb">${P.big}</div></div><div class="w c ln">${LINE}</div>${coupon(P, "glass", 1046)}` }),
  // 4. Owner's mix: the Medallion with a bigger circle, the Spotlight ticket recoloured beige with red and blue,
  //    the cover-page lettering (cream with a red 3D edge) on the winning line, and clear space above Next player.
  4: (P) => ({ css: `
    .w.tt, .w.pill { display:none; }
    .w.t4 { left:0; width:${U(1080)}; top:${U(34)}; display:flex; justify-content:center; }
    .w.t4 span { rotate:-2deg; white-space:nowrap; font:italic 900 ${U(70)}/1 Poppins, sans-serif; text-transform:uppercase; color:#F6F0E6; text-shadow:${[1, 2, 3, 4, 5, 6].map((n) => `${U(n)} ${U(n)} 0 #B01820`).join(", ")}, ${U(10)} ${U(16)} ${U(20)} rgba(0,30,60,.4); }
    .w.t4 span b { color:#FFE08A; font-weight:900; }
    .w.p4 { left:0; width:${U(1080)}; top:${U(142)}; display:flex; justify-content:center; }
    .w.p4 span { height:${U(62)}; padding:0 ${U(30)}; border-radius:999px; background:#F6F0E6; display:flex; align-items:center; gap:${U(16)}; font:italic 800 ${U(24)}/1 Poppins, sans-serif; letter-spacing:.2em; text-transform:uppercase; color:#0A6FA6; box-shadow:0 ${U(6)} 0 rgba(0,50,90,.35); }
    .w.p4 span b { font:italic 900 ${U(40)}/1 Poppins, sans-serif; letter-spacing:0; color:#D8232D; }
    .w.md { left:${U(180)}; top:${U(236)}; width:${U(720)}; height:${U(720)}; border-radius:50%; background:radial-gradient(circle at 50% 38%, #12507A, #072A44 70%); border:${U(9)} solid #F6F0E6; box-shadow:0 0 0 ${U(16)} #D8232D, 0 0 0 ${U(22)} #F6F0E6, 0 ${U(34)} ${U(50)} rgba(0,20,40,.5), 0 0 ${U(130)} rgba(255,255,255,.35); }
    .w.md::before { content:""; position:absolute; inset:${U(24)}; border-radius:50%; border:${U(4)} dotted rgba(246,240,230,.55); }
    .w.meal { left:${U(120)}; top:${U(300)}; width:${U(840)}; }
    .w.rbw { left:0; width:${U(1080)}; top:${U(858)}; display:flex; justify-content:center; }
    .rb { height:${U(150)}; padding:0 ${U(64)}; display:grid; place-items:center; rotate:-3deg; background:linear-gradient(180deg, #EA3640, #B01A22); border:${U(5)} solid #F6F0E6; border-radius:${U(26)}; box-shadow:0 ${U(10)} 0 #7E0F16, 0 ${U(24)} ${U(30)} rgba(0,20,40,.4); font:italic 900 ${U(104)}/1 Poppins, sans-serif; color:#F6F0E6; white-space:nowrap; text-shadow:0 ${U(5)} 0 #7E0F16; }
    .w.ln { top:${U(1040)}; font:italic 800 ${U(40)}/1 Poppins, sans-serif; text-transform:uppercase; letter-spacing:.04em; }
    /* the coupon: beige ticket, blue and white cup stripes down the left edge, red code, red stub with the QR */
    .w.cpw { height:${U(372)}; }
    .cp.beige { grid-template-columns:${U(46)} 1fr ${U(300)}; background:linear-gradient(170deg, #FBF5EA, #EADFCB); color:#1F1A1A; -webkit-mask:radial-gradient(circle ${U(26)} at calc(100% - ${U(300)}) 0, #0000 97%, #000) top / 100% 51% no-repeat, radial-gradient(circle ${U(26)} at calc(100% - ${U(300)}) 100%, #0000 97%, #000) bottom / 100% 51% no-repeat; }
    .cp.beige .st { height:100%; background:repeating-linear-gradient(180deg, #1E9BE0 0 ${U(22)}, #fff ${U(22)} ${U(44)}); }
    .cp.beige .l { gap:${U(16)}; min-width:0; padding:0 ${U(10)}; }
    .cp.beige .l small { color:#0A6FA6; }
    .cp.beige .l b { font-size:${U(64)}; color:#D8232D; text-shadow:0 ${U(4)} 0 rgba(126,15,22,.28); }
    .cp.beige .l span { color:#6B6060; display:flex; align-items:center; gap:${U(12)}; }
    .cp.beige .l span::before { content:""; width:${U(14)}; height:${U(14)}; border-radius:50%; background:#1E9BE0; }
    .cp.beige .r { background:linear-gradient(170deg, #E5303A, #A9161F); border-left:${U(4)} dashed rgba(246,240,230,.75); }
    .cp.beige .r img { width:${U(200)}; height:${U(200)}; }
    .cp.beige .r em { color:#F6F0E6; font-size:${U(22)}; letter-spacing:.12em; } `,
    html: `<div class="w t4"><span>You brought <b>the loud.</b></span></div><div class="w p4"><span>Final score <b>100</b></span></div><div class="w md"></div><img class="w meal" src="${MEAL}"><div class="w rbw"><div class="rb">${P.big}</div></div><div class="w c ln">${LINE}</div><div class="w cpw" style="top:${U(1108)}"><div class="cp beige"><i class="st"></i><div class="l"><small>Your coupon code</small><b>${P.code}</b><span>Sent to your phone by SMS</span></div><div class="r"><img class="qr" alt=""><em>Scan to save</em></div></div></div>` }),
};
buildDemo();
const chromium = await loadChromium(), site = await serveDemo(), browser = await chromium.launch(LAUNCH);
try {
  for (const k of Object.keys(OPTS)) for (const tier of ["free", "half"]) {
    if (want.length && !want.includes(k)) continue;
    const { p, errors } = await openKiosk(browser, site.base, "scream.html", { width: 1080, height: 1920 }, 1);
    const o = OPTS[k](PRIZE[tier]);
    await p.evaluate(async ({ o, base }) => {
      Math.random = () => 0.1; try { SFX.win = () => {}; sayPreset = () => {}; } catch {}
      const r = await K.api("/api/kiosk/scream", { code: "WENDYS", peakDb: -6, sustainedDb: -6, transcript: "Wendy's" }); guest = { code: "WENDYS" };
      r.won = true; if (!r.coupon) r.coupon = { code: "X", label: "" }; showResult(r);
      const box = document.querySelector("#s-result .box"); const st = document.createElement("style"); st.textContent = base + o.css; document.head.appendChild(st);
      const t = document.createElement("div"); t.innerHTML = o.html; [...t.children].forEach((el) => box.insertBefore(el, box.querySelector(".btn")));
      box.querySelectorAll("img.qr").forEach((q) => q.src = document.getElementById("qr-profile").src);
      await new Promise((r) => setTimeout(r, 2600));
    }, { o, base: BASE });
    await p.screenshot({ path: path.join(out, `premium-${k}-${tier}.png`) }); if (errors.length) console.log(k, tier, "errors:", errors.join("|"));
    await p.close();
  }
} finally { await browser.close(); site.close(); }
console.log("done");

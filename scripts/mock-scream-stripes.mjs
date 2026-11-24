// Design mockups, not live code: renders the Scream & Win result screen with three stripe + food-icon
// treatments (A awning band, B token-style side panel, C all-over) by injecting CSS into the real page.
// Usage: node scripts/mock-scream-stripes.mjs [outDir]   (default docs/screens)
import path from "node:path";
import { ROOT, buildDemo, serveDemo, loadChromium, openKiosk, LAUNCH } from "./lib/kiosk-harness.mjs";

const ICON = {
  burger: '<svg viewBox="0 0 48 48"><path d="M7 22c0-9 7.500-14 17-14s17 5 17 14z" fill="#E9A23B"/><path d="M6 23h36v4c-3 2-5-1-8 1s-5-1-8 1-5-1-8 1-5-1-8 1-4-1-4-1z" fill="#5BAA4A"/><rect x="7" y="27" width="34" height="7" rx="2.500" fill="#6B3A2A"/><path d="M12 27h14l-7 6z" fill="#F7C948"/><rect x="7" y="35" width="34" height="7" rx="3.500" fill="#E9A23B"/></svg>',
  fries: '<svg viewBox="0 0 48 48"><g fill="#F7B32B"><rect x="14" y="9" width="4" height="18" rx="1"/><rect x="19" y="5" width="4" height="22" rx="1"/><rect x="24" y="8" width="4" height="19" rx="1"/><rect x="29" y="4" width="4" height="23" rx="1"/><rect x="33" y="11" width="3.500" height="16" rx="1"/></g><path d="M11 21c4 3 22 3 26 0l-3 22H14z" fill="#D8262F"/><path d="M18 31c3 3 9 3 12 0" fill="none" stroke="#fff" stroke-width="2.200" stroke-linecap="round"/></svg>',
  drink: '<svg viewBox="0 0 48 48"><path d="M28 13l4-10" stroke="#1E1B1B" stroke-width="2.600" stroke-linecap="round"/><path d="M14 16h20l-2.400 27H16.400z" fill="#fff" stroke="#D8262F" stroke-width="2.600" stroke-linejoin="round"/><rect x="11.500" y="11.500" width="25" height="5.500" rx="2" fill="#D8262F"/><path d="M15.300 25h17.400l-.700 8H16z" fill="#D8262F"/></svg>',
  frosty: '<svg viewBox="0 0 48 48"><path d="M13 17c-1-6 3-9 6-9 1-4 8-5 10 0 4 0 7 3 6 9z" fill="#7A4A2E"/><path d="M14 17h20l-2.400 26H16.400z" fill="#fff" stroke="#D8262F" stroke-width="2.600" stroke-linejoin="round"/><path d="M19 26h10M19.500 32h9" stroke="#D8262F" stroke-width="2.400" stroke-linecap="round"/></svg>',
};
const STRIPES = 'repeating-linear-gradient(90deg, #2E8FE0 0 calc(22 * var(--u)), #fff calc(22 * var(--u)) calc(44 * var(--u)))';
const OPTS = {
  a: (I, STR) => `
    <style>
      .m-band { position:absolute; left:0; right:0; top:var(--hb); height:calc(40 * var(--u)); background:${STR}; box-shadow:0 calc(8 * var(--u)) calc(18 * var(--u)) rgba(0,40,70,.3); z-index:4; }
      .bx .box { margin-top:calc(22 * var(--u)); }
      .m-icons { position:absolute; left:calc(1186 * var(--u)); top:calc(384 * var(--u)); width:calc(192 * var(--u)); height:calc(86 * var(--u)); border-radius:calc(22 * var(--u)); background:#F7F2EC; display:flex; align-items:center; justify-content:center; gap:calc(6 * var(--u)); box-shadow:0 calc(10 * var(--u)) calc(24 * var(--u)) rgba(0,40,70,.25); }
      .m-icons svg { width:calc(38 * var(--u)); height:calc(38 * var(--u)); }
    </style><div class="m-band" data-to="stage"></div><div class="m-icons" data-to="box">${I.burger}${I.fries}${I.drink}${I.frosty}</div>`,
  b: (I, STR) => `
    <style>
      .m-side { position:absolute; right:0; top:var(--hb); bottom:calc(44 * var(--u)); width:calc(330 * var(--u)); background:${STR}; clip-path:polygon(calc(70 * var(--u)) 0, 100% 0, 100% 100%, 0 100%); z-index:1; box-shadow:none; }
      .m-side::before { content:""; position:absolute; inset:0; background:linear-gradient(90deg, rgba(1,60,100,.25), transparent 30%); }
      .bx { z-index:2; }
      #s-result .qrcard { box-shadow:0 calc(14 * var(--u)) calc(30 * var(--u)) rgba(0,40,70,.4) !important; }
      .m-row { position:absolute; left:calc(62 * var(--u)); top:calc(466 * var(--u)); display:flex; align-items:center; gap:calc(14 * var(--u)); }
      .m-row b { width:calc(64 * var(--u)); height:calc(64 * var(--u)); border-radius:50%; background:#F7F2EC; display:grid; place-items:center; box-shadow:0 calc(6 * var(--u)) 0 #01476A; }
      .m-row svg { width:calc(42 * var(--u)); height:calc(42 * var(--u)); }
      .m-row i { font:900 calc(30 * var(--u))/1 Poppins; color:#F7F2EC; font-style:normal; }
      #res-eyebrow { display:none; }
    </style><div class="m-side" data-to="stage"></div><div class="m-row" data-to="box"><b>${I.burger}</b><i>+</i><b>${I.fries}</b><i>+</i><b>${I.drink}</b><i>+</i><b>${I.frosty}</b></div>`,
  c: (I, STR) => `
    <style>
      .stage { background:repeating-linear-gradient(90deg, rgba(255,255,255,.09) 0 calc(60 * var(--u)), transparent calc(60 * var(--u)) calc(120 * var(--u))), linear-gradient(180deg, #19B2E8 0%, #029CD4 45%, #016F9F 100%) !important; }
      .m-rib { position:absolute; left:0; right:0; bottom:calc(44 * var(--u)); height:calc(18 * var(--u)); background:${STR}; z-index:4; }
      .m-wm { position:absolute; z-index:1; opacity:.9; filter:drop-shadow(0 calc(8 * var(--u)) calc(10 * var(--u)) rgba(0,40,70,.3)); }
      .m-wm svg { width:100%; height:100%; display:block; }
      .bx { z-index:2; }
    </style><div class="m-rib" data-to="stage"></div>
    <div class="m-wm" data-to="stage" style="right:calc(26 * var(--u));bottom:calc(84 * var(--u));width:calc(120 * var(--u));height:calc(120 * var(--u));rotate:10deg">${I.fries}</div>
    <div class="m-wm" data-to="stage" style="left:calc(24 * var(--u));bottom:calc(76 * var(--u));width:calc(96 * var(--u));height:calc(96 * var(--u));rotate:-12deg">${I.burger}</div>
    <div class="m-wm" data-to="stage" style="right:calc(40 * var(--u));top:calc(var(--hb) + 14 * var(--u));width:calc(84 * var(--u));height:calc(84 * var(--u));rotate:-8deg">${I.frosty}</div>
    <div class="m-wm" data-to="stage" style="left:calc(520 * var(--u));bottom:calc(58 * var(--u));width:calc(76 * var(--u));height:calc(76 * var(--u));rotate:8deg">${I.drink}</div>`,
};
const out = process.argv[2] || path.join(ROOT, "docs/screens");
buildDemo();
const chromium = await loadChromium(), site = await serveDemo(), browser = await chromium.launch(LAUNCH);
try {
  for (const k of Object.keys(OPTS)) {
    const { p } = await openKiosk(browser, site.base, "scream.html", { width: 1600, height: 900 }, 2);
    await p.evaluate(async (html) => {
      Math.random = () => 0.1;
      const r = await K.api("/api/kiosk/scream", { code: "WENDYS", peakDb: -8, sustainedDb: -8, transcript: "KFC" }); guest = { code: "WENDYS" }; showResult(r);
      const stage = document.querySelector(".stage"), box = document.querySelector("#s-result .box");
      stage.style.setProperty("--hb", document.querySelector(".stripeB").getBoundingClientRect().bottom + "px");
      const t = document.createElement("div"); t.innerHTML = html;
      [...t.children].forEach((el) => (el.dataset.to === "box" ? box : el.tagName === "STYLE" ? document.head : stage).appendChild(el));
      await new Promise((r) => setTimeout(r, 1400));
    }, OPTS[k](ICON, STRIPES));
    await p.screenshot({ path: path.join(out, `scream-stripes-option-${k}.png`) });
    await p.close();
  }
} finally { await browser.close(); site.close(); }
console.log("Wrote scream-stripes-option-{a,b,c}.png to " + out);

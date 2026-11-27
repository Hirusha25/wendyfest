// Design mock-ups, not live code: keypads for a guest code of 3 numbers + 2 letters (for example 482 KT), on both upright kiosks.
// Numbers and letters are different colours, and Delete sits beside the main button, never inside the pad (owner).
//   both = numbers along the top, letters below      side = a number pad on the left, letters on the right
//   num / let = the two steps of a pad that switches by itself
// Usage: node scripts/mock-code-keypad.mjs <outDir>
import path from "node:path"; import fs from "node:fs";
import { buildDemo, serveDemo, loadChromium, LAUNCH } from "./lib/kiosk-harness.mjs";
const out = process.argv[2]; fs.mkdirSync(out, { recursive: true });
const LET = "ABCDEFGHJKLMNPQRSTUVWXYZ".split("");   // no I or O: they look like 1 and 0
const STATES = {
  both: { typed: ["4", "8", "2", "K"], pad: "both", hint: "3 numbers, then 2 letters" },
  side: { typed: ["4", "8", "2", "K"], pad: "side", hint: "3 numbers, then 2 letters" },
  step1: { typed: ["4", "8"], pad: "num", hint: "First, your 3 numbers" },
  step2: { typed: ["4", "8", "2", "K"], pad: "let", hint: "Now your 2 letters" },
};
buildDemo(); const chromium = await loadChromium(), site = await serveDemo(), browser = await chromium.launch(LAUNCH);
try {
  for (const page of ["scream.html", "roast.html"]) for (const [k, st] of Object.entries(STATES)) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 } }); const p = await ctx.newPage(); const errors = []; p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(`${site.base}/kiosk/${page}`); await p.waitForTimeout(800); await p.evaluate(() => { document.cookie = "wf_kiosk=2468; path=/"; }); await p.reload(); await p.waitForTimeout(1500);
    await p.click("#start"); await p.waitForSelector("#s-code.on"); await p.waitForTimeout(900);
    await p.evaluate(({ st, LET, roast }) => {
      const u = roast ? "var(--p)" : "var(--u)", U = (n) => `calc(${n} * ${u})`, imp = (el, o) => Object.entries(o).forEach(([a, b]) => el.style.setProperty(a, b, "important"));
      // the five slots: three numbers, a dash, two letters, centred
      const slots = document.querySelector(roast ? "#slots" : "#boxes"), tag = roast ? "b" : "i";
      slots.innerHTML = [0, 1, 2, 3, 4].map((i) => `<${tag} class="${st.typed[i] ? (roast ? "on" : "") : i === st.typed.length ? "cur" : ""}">${st.typed[i] || ""}</${tag}>`).join("");
      imp(slots, { display: "grid", "grid-template-columns": roast ? `1fr 1fr 1fr ${U(46)} 1fr 1fr` : `repeat(3, ${U(150)}) ${U(50)} repeat(2, ${U(150)})`, gap: U(14), "justify-content": "center" });
      if (!roast) imp(slots, { left: "0", width: U(1080) });
      const dash = document.createElement("span"); dash.textContent = "–"; dash.style.cssText = `grid-column:4;grid-row:1;align-self:center;justify-self:center;font:900 ${U(60)}/1 Poppins,sans-serif;color:#fff;`; slots.appendChild(dash);
      [...slots.children].forEach((c, i) => { if (i < 5) { imp(c, { "grid-row": "1", "grid-column": String(i < 3 ? i + 1 : i + 2) }); if (!roast) imp(c, { width: "auto" }); } });
      const sub = document.querySelector(roast ? "#s-code .eb.w" : "#s-code .sub2"); if (sub) sub.textContent = roast ? st.hint : "Enter your guest code: " + st.hint.toLowerCase() + ".";
      const sub1 = document.querySelector("#s-code .sub"); if (sub1) sub1.textContent = "3 numbers and 2 letters, from your SMS or your Wendy Fest pass."; const gl = document.querySelector("#code-go-l"); if (gl) gl.textContent = (5 - st.typed.length) + " more to go";
      const cnt = document.querySelector("#code-n"); if (cnt) cnt.textContent = `${st.typed.length} of 5`; const msg = document.querySelector("#code-msg"); if (msg) msg.textContent = "";
      // the keypad: numbers one colour, letters another
      const kb = document.querySelector(roast ? "#kb" : "#kbd"); const key = (c, cls, place) => `<button class="${cls}" style="${place}">${c}</button>`;
      const span = (n) => `grid-column:span ${n}`, at = (c, r) => `grid-column:${c};grid-row:${r}`;
      let html = "", colsCss = "", rowH = roast ? 108 : 128, fs = 60;
      const NUM = "1234567890".split("");
      if (st.pad === "num") { colsCss = "repeat(3, 1fr)"; html = NUM.map((d, i) => key(d, "n", i === 9 ? at(2, 4) : "")).join(""); }
      else if (st.pad === "let") { colsCss = "repeat(6, 1fr)"; html = LET.map((c) => key(c, "l", "")).join(""); }
      else if (st.pad === "both") { colsCss = "repeat(40, 1fr)"; rowH = roast ? 100 : 124; fs = roast ? 42 : 48; html = NUM.map((d) => key(d, "n", span(4))).join("") + LET.map((c) => key(c, "l", span(5))).join(""); }
      else { colsCss = "repeat(3, 1fr) .3fr repeat(6, 1fr)"; rowH = roast ? 108 : 128; fs = roast ? 44 : 50; html = NUM.map((d, i) => key(d, "n", i === 9 ? at(2, 4) : at(i % 3 + 1, Math.floor(i / 3) + 1))).join("") + LET.map((c, j) => key(c, "l", at(5 + j % 6, Math.floor(j / 6) + 1))).join(""); }
      kb.innerHTML = html; imp(kb, { display: "grid", "grid-template-columns": colsCss, "grid-auto-rows": U(rowH), gap: U(roast ? 14 : 12), height: "auto" });
      kb.querySelectorAll("button").forEach((b) => { imp(b, { height: "100%", width: "auto", "min-width": "0", flex: "none", "font-size": U(fs), display: "grid", "place-items": "center" });
        if (!roast && b.classList.contains("n")) imp(b, { background: "linear-gradient(180deg, #FFFBF3, #EADFCB)", color: "#D8232D", "box-shadow": `0 ${U(8)} 0 #B5A88F`, "text-shadow": "none", border: "0" });
        if (roast && b.classList.contains("l")) b.classList.remove("n"); });
      if (st.pad === "num" || st.pad === "let") { const tabs = document.createElement("div"); tabs.innerHTML = `<span class="${st.pad === "num" ? "on" : ""}">1 Numbers</span><span class="${st.pad === "let" ? "on" : ""}">2 Letters</span>`; tabs.style.cssText = `position:absolute;left:0;right:0;display:flex;justify-content:center;gap:${U(16)};top:${roast ? U(1124) : U(622)};z-index:5;`;
        [...tabs.children].forEach((s) => { s.style.cssText = `padding:${U(10)} ${U(26)};border-radius:999px;font:italic 800 ${U(24)}/1 Poppins,sans-serif;letter-spacing:.1em;text-transform:uppercase;` + (s.className === "on" ? "background:#F6F0E6;color:#D8232D;box-shadow:0 0 0 4px rgba(216,35,45,.35);" : "background:rgba(255,255,255,.16);color:#fff;border:2px solid rgba(255,255,255,.5);"); });
        (roast ? document.querySelector("#s-code .s") : document.querySelector("#s-code .box")).appendChild(tabs); }
      // Scream & Win: Delete sits beside Continue, not inside the pad (Roast Me already has it there)
      if (!roast) { const go = document.querySelector("#code-go"), box = document.querySelector("#s-code .box"), kr = kb.getBoundingClientRect(), br = box.getBoundingClientRect(), px = (v) => v + "px", top = kr.bottom - br.top + 34 * (innerWidth / 1080);
        imp(go, { left: px(kr.left - br.left + kr.width * .36), width: px(kr.width * .64), top: px(top) });
        const del = document.createElement("button"); del.className = "btn m-del"; del.innerHTML = "← Delete"; box.appendChild(del); const sty = document.createElement("style"); sty.textContent = ".m-del::after { display:none !important; }"; document.head.appendChild(sty);
        imp(del, { position: "absolute", left: px(kr.left - br.left), width: px(kr.width * .33), top: px(top), height: px(go.getBoundingClientRect().height), background: "linear-gradient(180deg, #3A3434, #141111)", "box-shadow": `0 ${U(10)} 0 #000`, "font-size": U(40), "justify-content": "center", padding: "0" });
        const ask = document.querySelector("#s-code .ask"); if (ask) imp(ask, { top: px(top + go.getBoundingClientRect().height + 40 * (innerWidth / 1080)) }); }
    }, { st, LET, roast: page === "roast.html" });
    await p.waitForTimeout(500); await p.screenshot({ path: path.join(out, `keypad-${page.replace(".html", "")}-${k}.png`) }); if (errors.length) console.log(page, k, errors.join("|"));
    await ctx.close();
  }
} finally { await browser.close(); site.close(); }
console.log("done");

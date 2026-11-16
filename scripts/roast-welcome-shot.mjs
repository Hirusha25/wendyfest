// Captures the live Roast Me welcome screen at wall and laptop sizes. Usage: node scripts/roast-welcome-shot.mjs <outDir> [baseUrl]
import { createRequire } from "node:module";
const { chromium } = createRequire("/opt/node-tools/node_modules/")("playwright");
const out = process.argv[2], base = process.argv[3] || "http://localhost:3000", path = base.includes("8080") ? "/kiosk/roast.html" : "/kiosk/roast";
const b = await chromium.launch({ args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] }); const errs = [];
for (const [w, h, n] of [[1920, 1080, "wall"], [1440, 900, "laptop"]]) {
  const c = await b.newContext({ viewport: { width: w, height: h }, permissions: ["camera"] }); await c.addCookies([{ name: "wf_kiosk", value: "2468", url: base }]);
  const p = await c.newPage(); p.on("pageerror", (e) => errs.push(e.message));
  await p.goto(base + path, { waitUntil: "networkidle" }); await p.waitForTimeout(900); await p.screenshot({ path: `${out}/live-${n}.png` });
  if (n === "wall") { await p.click("#start"); await p.waitForTimeout(500); await p.screenshot({ path: `${out}/live-code.png` }); }
  await c.close();
}
await b.close(); console.log("ok", errs.length ? errs : "no errors");

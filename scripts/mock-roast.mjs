// Renders the Roast Me design preview (public/_design/roast-options.html?s=1..7). Usage: node scripts/mock-roast.mjs <outDir> (app on :3000)
import { createRequire } from "node:module";
const { chromium } = createRequire("/opt/node-tools/node_modules/")("playwright");
const out = process.argv[2];
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage(); const errs = []; p.on("pageerror", (e) => errs.push(e.message));
for (let s = 1; s <= 7; s++) { await p.goto(`http://localhost:3000/_design/roast-options.html?s=${s}`, { waitUntil: "networkidle" }); await p.waitForTimeout(900); await p.screenshot({ path: `${out}/r${s}.png` }); }
await b.close(); console.log("ok", errs.length ? errs : "no errors");

// Renders the blended Roast Me design (public/_design/roast-v2.html?s=1..5|share). Usage: node scripts/mock-roast-v2.mjs <outDir> [baseUrl]
import { createRequire } from "node:module";
const { chromium } = createRequire("/opt/node-tools/node_modules/")("playwright");
const out = process.argv[2], base = process.argv[3] || "http://localhost:3000";
const b = await chromium.launch(); const errs = [];
const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage(); p.on("pageerror", (e) => errs.push(e.message));
for (let s = 1; s <= 5; s++) { await p.goto(`${base}/_design/roast-v2.html?s=${s}`, { waitUntil: "networkidle" }); await p.waitForTimeout(900); await p.screenshot({ path: `${out}/v2-${s}.png` }); }
const q = await (await b.newContext({ viewport: { width: 1080, height: 1920 } })).newPage(); q.on("pageerror", (e) => errs.push(e.message));
await q.goto(`${base}/_design/roast-v2.html?s=share`, { waitUntil: "networkidle" }); await q.waitForTimeout(900); await q.screenshot({ path: `${out}/v2-share.png` });
await b.close(); console.log("ok", errs.length ? errs : "no errors");

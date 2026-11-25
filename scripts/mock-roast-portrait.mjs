// Screenshots of the portrait (1080 x 1920) Roast Me layout options in public/_design/roast-portrait.html.
// Usage: node scripts/mock-roast-portrait.mjs <output dir> [page] [variants,comma] [screens,comma]
import fs from "node:fs"; import path from "node:path"; import http from "node:http";
import { loadChromium, ROOT } from "./lib/kiosk-harness.mjs";
const out = process.argv[2] || "docs/screens/portrait"; fs.mkdirSync(out, { recursive: true });
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png" };
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, "public", decodeURIComponent(req.url.split("?")[0]));
  if (!file.startsWith(path.join(ROOT, "public")) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" }); fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const page = process.argv[3] || "roast-portrait.html", vs = (process.argv[4] || "spot,receipt,board").split(","), ss = (process.argv[5] || "welcome,reveal").split(",");
const base = `http://127.0.0.1:${server.address().port}/_design/${page}`;
const browser = await (await loadChromium()).launch();
try {
  const p = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  for (const v of vs) for (const s of ss) {
    await p.goto(`${base}?v=${v}&s=${s}`, { waitUntil: "domcontentloaded" });
    await p.evaluate(async () => { await Promise.all(["italic 900 80px Poppins", "600 40px Poppins", "500 40px Poppins", "italic 900 40px 'Barlow Semi Condensed'"].map((f) => document.fonts.load(f))); await document.fonts.ready; }); await p.waitForTimeout(900);
    await p.screenshot({ path: path.join(out, `portrait-${v}-${s}.png`) }); console.log("shot", v, s);
  }
} finally { await browser.close(); server.close(); }

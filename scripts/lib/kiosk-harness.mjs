// Shared helpers for the kiosk browser checks: build the static demo, serve it, open Chromium.
// The demo build runs the whole platform in the browser (no server, no API key), so checks are fast and offline.
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// Playwright: use the project's/global install, or the cloud sandbox's copy.
export async function loadChromium() {
  try { return (await import("playwright")).chromium; } catch {}
  try { return createRequire("/opt/node-tools/node_modules/")("playwright").chromium; } catch {}
  throw new Error("Playwright is not installed. Run: npm i -D playwright && npx playwright install chromium");
}

export function buildDemo() { execFileSync("node", ["scripts/build-demo.mjs"], { cwd: ROOT, stdio: "ignore" }); }

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".mp3": "audio/mpeg", ".txt": "text/plain", ".json": "application/json" };
// Serves demo/ under /wendyfest/, the same path GitHub Pages uses.
export function serveDemo() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const rel = decodeURIComponent(req.url.split("?")[0]).replace(/^\/wendyfest/, "") || "/";
      const file = path.join(ROOT, "demo", rel.endsWith("/") ? rel + "index.html" : rel);
      if (!file.startsWith(path.join(ROOT, "demo")) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end("not found"); }
      res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" }); fs.createReadStream(file).pipe(res);
    }).listen(0, "127.0.0.1", () => resolve({ base: `http://127.0.0.1:${server.address().port}/wendyfest`, close: () => server.close() }));
  });
}

// A kiosk page, unlocked (demo PIN cookie), with a fake camera and microphone.
export async function openKiosk(browser, base, page, viewport = { width: 1600, height: 900 }, deviceScaleFactor = 1) {
  const p = await browser.newPage({ viewport, deviceScaleFactor });
  const errors = []; p.on("pageerror", (e) => errors.push(e.message)); p.on("dialog", (d) => { errors.push("dialog: " + d.message()); d.dismiss(); });
  await p.goto(`${base}/kiosk/${page}`); await p.waitForTimeout(1200);
  await p.evaluate(() => { document.cookie = "wf_kiosk=2468; path=/"; });
  return { p, errors };
}
export const LAUNCH = { args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] };

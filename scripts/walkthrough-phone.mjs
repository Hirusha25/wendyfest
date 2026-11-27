// Records the guest's phone journey on a throwaway local server (no AI, no voice, no real SMS): register, enter the SMS code, see the pass,
// then open a roast link. With no SMS provider the code is shown on the page (test mode); with a real provider it arrives by SMS instead.
// Usage: node scripts/walkthrough-phone.mjs <photo.jpg> <tmpDir> <outDir>
import fs from "node:fs"; import path from "node:path"; import { spawn } from "node:child_process"; import { DatabaseSync } from "node:sqlite";
import { loadChromium, ROOT } from "./lib/kiosk-harness.mjs";
const [photo, tmp, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true }); fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp, { recursive: true });
const env = { ...process.env, PORT: "3999", KIOSK_PIN: "2468", DB_PATH: path.join(tmp, "t.sqlite"), PHOTO_DIR: path.join(tmp, "ph"), BASE_URL: "http://127.0.0.1:3999", ANTHROPIC_API_KEY: "", ELEVENLABS_API_KEY: "", SMS_PROVIDER: "console", DEMO_CODES: "" };
const srv = spawn("node", ["server/index.js"], { cwd: ROOT, env, stdio: ["ignore", "pipe", "pipe"] });
const wait = (ms) => new Promise((r) => setTimeout(r, ms)); const B = "http://127.0.0.1:3999";
const browser = await (await loadChromium()).launch(); let note = "ok";
try {
  for (let i = 0; i < 40; i++) { try { if ((await fetch(B + "/api/config")).ok) break; } catch {} await wait(300); }
  const dir = path.join(out, "vid-phone");
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, recordVideo: { dir, size: { width: 390, height: 844 } } });
  const p = await ctx.newPage(); const errors = []; p.on("pageerror", (e) => errors.push(e.message));
  try {
    await p.goto(B + "/register", { waitUntil: "domcontentloaded" }); await p.waitForTimeout(2500);
    await p.locator("#name").pressSequentially("Nimal Perera", { delay: 70 }); await p.waitForTimeout(400);
    await p.locator("#phone").pressSequentially("0771234567", { delay: 70 }); await p.waitForTimeout(900);
    await p.check("#c-terms"); await p.waitForTimeout(700);
    await p.click("#submit"); await p.waitForSelector("#otp-boxes input, #otp-boxes *", { timeout: 15000 }); await p.waitForTimeout(2200);
    const otp = (await p.textContent("#demo-otp-code")).trim();
    await p.locator("#otp-boxes input").first().click().catch(() => {}); await p.keyboard.type(otp, { delay: 350 });
    await p.waitForURL(/\/p\/|profile/, { timeout: 15000 }).catch(() => {}); await p.waitForTimeout(4500);
    await p.evaluate(() => scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })); await p.waitForTimeout(2500);
    // a roast for this guest, made the way the kiosk makes it, then their roast link
    const db = new DatabaseSync(env.DB_PATH); const me = db.prepare("select code from participants order by id desc limit 1").get(); db.close();
    const img = "data:image/jpeg;base64," + fs.readFileSync(photo).toString("base64");
    const r = await (await fetch(B + "/api/kiosk/roast", { method: "POST", headers: { "content-type": "application/json", "x-pin": "2468" }, body: JSON.stringify({ code: me.code, image: img, consent: true }) })).json();
    const d2 = new DatabaseSync(env.DB_PATH); d2.prepare("update roasts set title_en = ?, roast_en = ?, vibe = ?, observations = ? where token = ?").run("The Bigger Roar", "Nice lion T-shirt, Nimal. But our Lankan Fire Burger has the bigger roar.", "Lion T-shirt", JSON.stringify(["lion T-shirt"]), r.token); d2.close();
    await p.goto(`${B}/r/${r.token}`, { waitUntil: "domcontentloaded" }); await p.waitForTimeout(9000);
    for (const c of ["blue", "paper"]) { await p.click(`#swatch button[data-c="${c}"]`); await p.waitForTimeout(3200); }
    await p.evaluate(() => scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })); await p.waitForTimeout(3000);
  } catch (e) { note = "STOPPED: " + e.message.split("\n")[0]; }
  await ctx.close(); const f = fs.readdirSync(dir)[0]; fs.renameSync(path.join(dir, f), path.join(out, "phone.webm")); fs.rmSync(dir, { recursive: true, force: true });
  console.log("phone", note, errors.length ? "| errors: " + errors.join(" | ") : "");
} finally { await browser.close(); srv.kill(); }

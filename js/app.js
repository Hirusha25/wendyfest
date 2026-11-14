// Shared helpers for guest pages.
window.api = async (path, opts = {}) => {
  const r = await fetch(path, { headers: { "Content-Type": "application/json", ...(opts.headers || {}) }, ...opts, body: opts.body && typeof opts.body !== "string" ? JSON.stringify(opts.body) : opts.body });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(data.error || r.statusText), { status: r.status, data });
  return data;
};
window.toast = (msg, ms = 2400) => {
  let el = document.querySelector(".toast");
  if (!el) { el = document.createElement("div"); el.className = "toast"; document.body.appendChild(el); }
  el.textContent = msg; el.classList.add("show"); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove("show"), ms);
};
window.qrUrl = (text, dark) => `/api/qr?text=${encodeURIComponent(text)}${dark ? `&dark=${dark}` : ""}`;
window.shareLink = async ({ title, text, url, file }) => {
  try {
    if (navigator.share) {
      const data = { title, text, url };
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) data.files = [file];
      await navigator.share(data); return true;
    }
  } catch (e) { if (e.name === "AbortError") return false; }
  try { await navigator.clipboard.writeText(url); toast(t("linkCopied")); } catch {}
  return false;
};
window.downloadCanvas = (canvas, name) => {
  canvas.toBlob((blob) => { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); }, "image/png");
};
window.canvasToFile = (canvas, name) => new Promise((res) => canvas.toBlob((b) => res(new File([b], name, { type: "image/png" })), "image/png"));

// ---- canvas card renderers (1080 x 1350) ----
const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => res(i); i.onerror = rej; i.src = src; });
function wrap(ctx, text, maxW) {
  const words = String(text || "").split(/\s+/); const lines = []; let line = "";
  for (const w of words) { const test = line ? line + " " + w : w; if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test; }
  if (line) lines.push(line); return lines;
}
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
async function fontsReady() { try { await document.fonts.load("italic 900 80px Poppins"); await document.fonts.load("800 40px 'Noto Sans Sinhala'"); await document.fonts.load("800 40px 'Noto Sans Tamil'"); } catch {} }
const DISPLAY = (px) => `italic 900 ${px}px Poppins, 'Noto Sans Sinhala', 'Noto Sans Tamil', sans-serif`;
const BODY = (px, w = 600) => `${w} ${px}px Poppins, 'Noto Sans Sinhala', 'Noto Sans Tamil', sans-serif`;
const C = { red: "#CD2028", redDark: "#A32539", blue: "#029CD4", blueDark: "#016F9F", blush: "#F2D4D7", charcoal: "#493533", cream: "#F6F0E6", ink: "#252525", mute: "#616161", line: "#E2E2E2" };

function redHeader(ctx, W, H) {
  const g = ctx.createRadialGradient(W * .42, H * .4, 20, W * .42, H * .4, W * .9);
  g.addColorStop(0, "#E02C34"); g.addColorStop(.38, "#D2252D"); g.addColorStop(.68, "#B51F28"); g.addColorStop(1, "#8C1720");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.lineWidth = 3.5;
  const cluster = (cx, cy, radii, peak) => radii.forEach((r, i) => { const t = i / (radii.length - 1); const op = Math.max(.05, Math.min(peak, peak * (.35 + .65 * (1 - Math.abs(t - .45) / .55)))); ctx.strokeStyle = `rgba(255,255,255,${op.toFixed(2)})`; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke(); });
  cluster(0, H * .44, [100, 133, 166, 199, 232, 265, 298, 331, 370], .26);
  cluster(W, H * .32, [100, 133, 166, 199, 232, 265, 298], .2);
  ctx.fillStyle = "rgba(255,255,255,.28)";
  for (let y = H - 260; y < H; y += 22) for (let x = W - 300; x < W; x += 22) { const d = Math.hypot(W - x, H - y) / 300; if (d < 1) { ctx.globalAlpha = .4 * (1 - d); ctx.beginPath(); ctx.arc(x, y, 3.2, 0, 7); ctx.fill(); } }
  ctx.globalAlpha = 1;
}

// Profile pass: stacked ticket on the red header
window.renderProfileCard = async (p) => {
  await fontsReady();
  const c = document.createElement("canvas"); c.width = 1080; c.height = 1350; const ctx = c.getContext("2d");
  ctx.fillStyle = C.cream; ctx.fillRect(0, 0, 1080, 1350);
  ctx.save(); rr(ctx, 0, -60, 1080, 760, 60); ctx.clip(); redHeader(ctx, 1080, 700); ctx.restore();
  try { const logo = await loadImg(location.href.replace(/[#?].*$/, "").replace(/\/(kiosk\/)?[^/]*$/, "") + "/assets/wendys-horiz-white.svg"); ctx.drawImage(logo, 70, 70, 260, 260 * (logo.height / logo.width)); } catch {}
  ctx.fillStyle = "#fff"; ctx.font = "italic 800 30px Poppins, sans-serif"; ctx.fillText("WENDY FEST · COLOMBO", 70, 215);
  ctx.fillRect(445, 205, 120, 4);
  ctx.font = DISPLAY(120); ctx.fillText("MY PASS", 66, 330);
  // backing card
  ctx.save(); ctx.translate(540, 560); ctx.rotate(1.5 * Math.PI / 180); ctx.translate(-540, -560);
  const bg = ctx.createLinearGradient(100, 380, 1000, 760); bg.addColorStop(0, "#1FAAE0"); bg.addColorStop(.55, C.blue); bg.addColorStop(1, C.blueDark);
  rr(ctx, 116, 390, 900, 360, 44); ctx.fillStyle = C.blueDark; ctx.fill(); rr(ctx, 110, 384, 900, 360, 44); ctx.fillStyle = bg; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = C.blueDark; ctx.stroke();
  ctx.fillStyle = "#fff"; ctx.font = "italic 900 38px Poppins, sans-serif"; ctx.fillText("WENDY FEST", 160, 445);
  rr(ctx, 160, 468, 170, 40, 20); ctx.fillStyle = C.redDark; ctx.fill(); ctx.fillStyle = "#fff"; ctx.font = BODY(20, 800); ctx.fillText("COLOMBO", 182, 496);
  rr(ctx, 346, 468, 220, 40, 20); ctx.fillStyle = C.blush; ctx.fill(); ctx.fillStyle = C.redDark; ctx.fillText("LAUNCH WEEK", 368, 496);
  try { const cam = await loadImg(location.href.replace(/[#?].*$/, "").replace(/\/(kiosk\/)?[^/]*$/, "") + "/assets/cameo.png"); ctx.drawImage(cam, 760, 372, 240, 240 * (cam.height / cam.width)); } catch {}
  ctx.restore();
  // front ticket
  const fy = 560, fh = 520;
  rr(ctx, 78, fy + 8, 930, fh, 40); ctx.fillStyle = C.charcoal; ctx.fill();
  rr(ctx, 70, fy, 930, fh, 40); ctx.fillStyle = "#fff"; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = C.charcoal; ctx.stroke();
  ctx.save(); ctx.setLineDash([8, 8]); ctx.lineWidth = 3; ctx.strokeStyle = C.line; rr(ctx, 84, fy + 14, 902, fh - 28, 30); ctx.stroke(); ctx.restore();
  ctx.save(); rr(ctx, 70, fy, 930, fh, 40); ctx.clip(); ctx.fillStyle = C.red; ctx.fillRect(70, fy, 20, fh / 2); ctx.fillStyle = C.blue; ctx.fillRect(70, fy + fh / 2, 20, fh / 2); ctx.restore();
  try { const logo = await loadImg(location.href.replace(/[#?].*$/, "").replace(/\/(kiosk\/)?[^/]*$/, "") + "/assets/wendys-horiz.svg"); ctx.drawImage(logo, 130, fy + 44, 240, 240 * (logo.height / logo.width)); } catch {}
  ctx.fillStyle = C.line; ctx.fillRect(400, fy + 40, 3, 90);
  ctx.fillStyle = C.ink; ctx.font = "italic 800 30px Poppins, sans-serif"; ctx.fillText("WENDY FEST", 430, fy + 78);
  ctx.fillStyle = C.blueDark; ctx.font = BODY(24, 800); ctx.fillText(`PARTICIPANT #${String(p.number).padStart(4, "0")}`, 430, fy + 112);
  const parts = p.name.toUpperCase().split(/\s+/); const first = parts.shift(); const rest = parts.join(" ");
  let ns = 84; ctx.font = DISPLAY(ns); while (ns > 50 && (ctx.measureText(first).width > 820 || ctx.measureText(rest).width > 820)) { ns -= 6; ctx.font = DISPLAY(ns); }
  ctx.fillStyle = C.ink; ctx.fillText(first, 130, fy + 225);
  if (rest) { ctx.strokeStyle = C.charcoal; ctx.lineWidth = 4; ctx.strokeText(rest, 130, fy + 225 + ns * .95); }
  ctx.save(); ctx.setLineDash([8, 8]); ctx.strokeStyle = C.line; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(130, fy + 360); ctx.lineTo(950, fy + 360); ctx.stroke(); ctx.restore();
  ctx.fillStyle = C.mute; ctx.font = BODY(22, 800); ctx.fillText("ENTRY CODE", 130, fy + 405);
  ctx.font = DISPLAY(72); const cw = ctx.measureText(p.code).width + 50; rr(ctx, 130, fy + 420, cw, 86, 16); ctx.fillStyle = C.blush; ctx.fill(); ctx.fillStyle = C.redDark; ctx.fillText(p.code, 155, fy + 486);
  ctx.textAlign = "right"; ctx.fillStyle = C.mute; ctx.font = BODY(22, 800); ctx.fillText("COLOMBO", 950, fy + 440);
  ctx.fillStyle = C.blueDark; ctx.font = "italic 800 38px Poppins, sans-serif"; ctx.fillText(new Date(p.joined + "Z").toLocaleDateString("en-GB", { day: "numeric", month: "short" }).toUpperCase(), 950, fy + 486); ctx.textAlign = "left";
  // badges
  const badges = [["ROOKIE", true], ["SCREAMER", p.badges.screamer], ["WINNER", p.badges.winner], ["ROASTED", p.badges.roasted]];
  badges.forEach(([label, on], i) => { const x = 70 + i * 240; rr(ctx, x, 1130, 220, 110, 24); ctx.fillStyle = on ? C.red : "#fff"; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = on ? C.redDark : C.line; ctx.stroke(); ctx.fillStyle = on ? "#fff" : "#B5B5B5"; ctx.font = BODY(26, 800); ctx.textAlign = "center"; ctx.fillText(label, x + 110, 1200); ctx.textAlign = "left"; });
  const win = p.screams.find((s) => s.won && s.coupon);
  ctx.fillStyle = C.mute; ctx.font = BODY(22, 700); ctx.fillText(win ? `REWARD ${win.coupon.code} · © 2026 WENDY'S SRI LANKA` : "© 2026 WENDY'S SRI LANKA · WENDY FEST", 70, 1300);
  return c;
};

// Roast card
window.renderRoastCard = async (r, lang) => {
  await fontsReady();
  const c = document.createElement("canvas"); c.width = 1080; c.height = 1350; const ctx = c.getContext("2d");
  ctx.fillStyle = C.cream; ctx.fillRect(0, 0, 1080, 1350);
  ctx.save(); rr(ctx, 0, -60, 1080, 420, 60); ctx.clip(); redHeader(ctx, 1080, 360); ctx.restore();
  try { const logo = await loadImg(location.href.replace(/[#?].*$/, "").replace(/\/(kiosk\/)?[^/]*$/, "") + "/assets/wendys-horiz-white.svg"); ctx.drawImage(logo, 70, 60, 240, 240 * (logo.height / logo.width)); } catch {}
  ctx.fillStyle = "#fff"; ctx.font = "italic 800 28px Poppins, sans-serif"; ctx.fillText("ROASTED BY WENDY'S", 70, 190); ctx.fillRect(390, 180, 120, 4);
  ctx.font = DISPLAY(96); ctx.fillText(String(r.name || "").split(" ")[0].toUpperCase(), 66, 290);
  const PH = 470;
  if (r.photo) { try { const img = await loadImg(r.photo); const s = 940 / img.width; const h = img.height * s; const ph = Math.min(h, PH); rr(ctx, 78, 318, 940, ph, 36); ctx.fillStyle = C.charcoal; ctx.fill(); ctx.save(); rr(ctx, 70, 310, 940, ph, 36); ctx.clip(); const sy = (img.height - (ph / s)) / 2; ctx.drawImage(img, 0, Math.max(0, sy), img.width, ph / s, 70, 310, 940, ph); ctx.restore(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 8; rr(ctx, 70, 310, 940, ph, 36); ctx.stroke(); } catch {} }
  const py = 820, ph2 = 440;
  rr(ctx, 78, py + 8, 940, ph2, 40); ctx.fillStyle = C.charcoal; ctx.fill();
  rr(ctx, 70, py, 940, ph2, 40); ctx.fillStyle = "#fff"; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = C.charcoal; ctx.stroke();
  ctx.save(); ctx.setLineDash([8, 8]); ctx.lineWidth = 3; ctx.strokeStyle = C.line; rr(ctx, 84, py + 14, 912, ph2 - 28, 30); ctx.stroke(); ctx.restore();
  const isLatin = lang === "en";
  ctx.fillStyle = C.blueDark; ctx.font = BODY(22, 800); ctx.fillText(String(r.vibe || "").toUpperCase(), 120, py + 60);
  ctx.fillStyle = C.red; ctx.font = isLatin ? DISPLAY(54) : BODY(44, 800);
  const title = (r.title && r.title[lang]) || r.title.en || "";
  let y = py + 120; for (const l of wrap(ctx, isLatin ? title.toUpperCase() : title, 840).slice(0, 2)) { ctx.fillText(l, 120, y); y += isLatin ? 56 : 60; }
  const body = (r.roast && r.roast[lang]) || r.roast.en || "";
  let size = 30, lines;
  for (;;) { ctx.font = BODY(size, 500); lines = wrap(ctx, body, 840); if (y + 16 + lines.length * size * 1.4 <= py + ph2 - 40 || size <= 20) break; size -= 2; }
  y += 16; ctx.fillStyle = C.ink; for (const l of lines) { ctx.fillText(l, 120, y); y += size * 1.4; }
  ctx.fillStyle = C.mute; ctx.font = BODY(22, 700); ctx.fillText("© 2026 WENDY'S SRI LANKA · WENDY FEST", 70, 1310);
  return c;
};

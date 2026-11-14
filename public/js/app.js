// Shared helpers for guest pages.
window.api = async (path, opts = {}) => {
  const r = await fetch(path, { headers: { "Content-Type": "application/json", ...(opts.headers || {}) }, ...opts, body: opts.body && typeof opts.body !== "string" ? JSON.stringify(opts.body) : opts.body });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(data.error || r.statusText), { status: r.status, data });
  return data;
};
window.toast = (msg, ms = 2200) => {
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
  await navigator.clipboard.writeText(url); toast(t("copied")); return false;
};
window.downloadCanvas = (canvas, name) => {
  canvas.toBlob((blob) => { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); }, "image/png");
};
window.canvasToFile = (canvas, name) => new Promise((res) => canvas.toBlob((b) => res(new File([b], name, { type: "image/png" })), "image/png"));

// ---- canvas card renderer (1080 x 1350, Instagram portrait) ----
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

function notchedCard(ctx, x, y, w, h, color, notch = 44) {
  ctx.save(); ctx.fillStyle = color; ctx.beginPath();
  ctx.moveTo(x + notch, y); ctx.lineTo(x + w - notch, y); ctx.arc(x + w, y, notch, Math.PI, Math.PI / 2, true);
  ctx.lineTo(x + w, y + h - notch); ctx.arc(x + w, y + h, notch, -Math.PI / 2, Math.PI, true);
  ctx.lineTo(x + notch, y + h); ctx.arc(x, y + h, notch, 0, -Math.PI / 2, true);
  ctx.lineTo(x, y + notch); ctx.arc(x, y, notch, Math.PI / 2, 0, true); ctx.closePath(); ctx.fill(); ctx.restore();
}

// Profile card
window.renderProfileCard = async (p) => {
  await fontsReady();
  const c = document.createElement("canvas"); c.width = 1080; c.height = 1350; const ctx = c.getContext("2d");
  ctx.fillStyle = "#EFE6DA"; ctx.fillRect(0, 0, 1080, 1350);
  notchedCard(ctx, 40, 40, 1000, 1270, "#CD2028");
  ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = 4; ctx.strokeRect(68, 68, 944, 1214);
  ctx.fillStyle = "rgba(255,255,255,.10)"; for (let yy = 100; yy < 1280; yy += 36) for (let xx = 100; xx < 980; xx += 36) { ctx.beginPath(); ctx.arc(xx, yy, 3, 0, 7); ctx.fill(); }
  try { const logo = await loadImg("/assets/wendys-horiz-white.svg"); ctx.drawImage(logo, 110, 110, 300, 300 * (logo.height / logo.width)); } catch {}
  ctx.fillStyle = "#fff"; ctx.font = BODY(26, 700); ctx.textAlign = "right"; ctx.fillText("WENDY FEST · SRI LANKA", 970, 135);
  ctx.font = BODY(22, 500); ctx.fillText(`#${String(p.number).padStart(4, "0")}`, 970, 170);
  ctx.textAlign = "left";
  // name (max 2 lines, shrink if a single word is too wide)
  let nameSize = 130; ctx.font = DISPLAY(nameSize);
  while (nameSize > 70 && p.name.split(/\s+/).some((w) => ctx.measureText(w.toUpperCase()).width > 860)) { nameSize -= 10; ctx.font = DISPLAY(nameSize); }
  const nameLines = wrap(ctx, p.name.toUpperCase(), 860).slice(0, 2);
  let y = 380; for (const l of nameLines) { ctx.fillText(l, 100, y); y += nameSize * 0.96; }
  ctx.font = DISPLAY(56); ctx.fillStyle = "#F2D4D7"; ctx.fillText("GOTTA BE LOUD.", 104, y + 10);
  // badges
  const badges = [["SCREAMER", p.badges.screamer], ["WINNER", p.badges.winner], ["ROASTED", p.badges.roasted]];
  let bx = 100; const by = y + 60;
  for (const [label, on] of badges) {
    ctx.font = BODY(26, 800); const w = ctx.measureText(label).width + 56;
    rr(ctx, bx, by, w, 62, 31); ctx.fillStyle = on ? "#fff" : "rgba(255,255,255,.18)"; ctx.fill();
    ctx.fillStyle = on ? "#CD2028" : "rgba(255,255,255,.6)"; ctx.fillText(label, bx + 28, by + 42); bx += w + 16;
  }
  // stats panel
  const best = p.screams.reduce((m, s) => Math.max(m, s.score || 0), 0);
  const win = p.screams.find((s) => s.won);
  const sy = by + 100;
  rr(ctx, 100, sy, 880, 240, 28); ctx.fillStyle = "#fff"; ctx.fill();
  ctx.fillStyle = "#616161"; ctx.font = BODY(24, 700); ctx.fillText("SCREAM & WIN", 140, sy + 55);
  ctx.fillStyle = "#252525"; ctx.font = DISPLAY(110); ctx.fillText(p.screams.length ? String(best) : "—", 140, sy + 165);
  ctx.font = BODY(24, 600); ctx.fillStyle = "#616161"; ctx.fillText(p.screams.length ? "/100 best scream" : "not played yet", 140, sy + 205);
  ctx.textAlign = "right"; ctx.font = BODY(24, 700); ctx.fillText("ROAST ME", 940, sy + 55);
  ctx.fillStyle = "#252525"; ctx.font = DISPLAY(64); ctx.fillText(p.badges.roasted ? "ROASTED" : "—", 940, sy + 150);
  ctx.font = BODY(24, 600); ctx.fillStyle = "#616161"; ctx.fillText(p.badges.roasted ? "served hot" : "not yet", 940, sy + 205); ctx.textAlign = "left";
  if (win && win.coupon) {
    const cy = sy + 270;
    rr(ctx, 100, cy, 880, 150, 28); ctx.fillStyle = "#252525"; ctx.fill();
    ctx.fillStyle = "#F2D4D7"; ctx.font = BODY(22, 700); ctx.fillText("REWARD CODE", 140, cy + 48);
    ctx.fillStyle = "#fff"; ctx.font = DISPLAY(64); ctx.fillText(win.coupon.code, 140, cy + 118);
  }
  ctx.fillStyle = "#fff"; ctx.font = BODY(26, 700); ctx.fillText("GOTTA BE WENDY'S", 100, 1250);
  ctx.textAlign = "right"; ctx.font = BODY(22, 500); ctx.fillText(p.profileUrl.replace(/^https?:\/\//, ""), 980, 1250); ctx.textAlign = "left";
  return c;
};

// Roast card (photo + roast in one language)
window.renderRoastCard = async (r, lang) => {
  await fontsReady();
  const c = document.createElement("canvas"); c.width = 1080; c.height = 1350; const ctx = c.getContext("2d");
  ctx.fillStyle = "#252525"; ctx.fillRect(0, 0, 1080, 1350);
  notchedCard(ctx, 40, 40, 1000, 1270, "#CD2028");
  const PH = 470;
  if (r.photo) { try { const img = await loadImg(r.photo); const s = 820 / img.width; const h = img.height * s; const ph = Math.min(h, PH); ctx.save(); rr(ctx, 130, 100, 820, ph, 30); ctx.clip(); const sy = (img.height - (ph / s)) / 2; ctx.drawImage(img, 0, Math.max(0, sy), img.width, ph / s, 130, 100, 820, ph); ctx.restore(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 8; rr(ctx, 130, 100, 820, ph, 30); ctx.stroke(); } catch {} }
  const isLatin = lang === "en";
  ctx.fillStyle = "#fff"; ctx.textAlign = "left";
  ctx.font = isLatin ? DISPLAY(62) : BODY(50, 800);
  const title = (r.title && r.title[lang]) || r.title.en || "";
  let y = 100 + PH + 95; for (const l of wrap(ctx, isLatin ? title.toUpperCase() : title, 860).slice(0, 2)) { ctx.fillText(l, 110, y); y += isLatin ? 62 : 66; }
  // body: shrink until it fits above the footer (y max 1120)
  const body = (r.roast && r.roast[lang]) || r.roast.en || "";
  let size = 34, lines;
  for (;;) { ctx.font = BODY(size, 500); lines = wrap(ctx, body, 860); if (y + 20 + lines.length * size * 1.4 <= 1120 || size <= 22) break; size -= 2; }
  y += 20; ctx.fillStyle = "#fff"; for (const l of lines) { ctx.fillText(l, 110, y); y += size * 1.4; }
  try { const logo = await loadImg("/assets/wendys-horiz-white.svg"); ctx.drawImage(logo, 110, 1170, 240, 240 * (logo.height / logo.width)); } catch {}
  ctx.textAlign = "right"; ctx.font = BODY(24, 700); ctx.fillStyle = "#F2D4D7"; ctx.fillText("ROASTED AT WENDY FEST", 970, 1205); ctx.font = BODY(22, 500); ctx.fillStyle = "#fff"; ctx.fillText(r.url.replace(/^https?:\/\//, ""), 970, 1241);
  return c;
};

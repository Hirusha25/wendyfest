// Shared helpers for guest pages.
window.api = async (path, opts = {}) => {
  const r = await fetch(path, { headers: { "Content-Type": "application/json", ...(opts.headers || {}) }, ...opts, body: opts.body && typeof opts.body !== "string" ? JSON.stringify(opts.body) : opts.body });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(data.error || r.statusText), { status: r.status, data });
  return data;
};
window.toast = (msg, ms = 2600, kind = "") => {
  let el = document.querySelector(".toast");
  if (!el) { el = document.createElement("div"); el.className = "toast"; el.setAttribute("role", "status"); document.body.appendChild(el); }
  el.textContent = msg; el.className = "toast show " + kind; clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove("show"), ms);
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
  ctx.lineWidth = 4;
  for (let r = 80; r < 600; r += 38) { const t = (620 - r) / 560; ctx.strokeStyle = `rgba(255,255,255,${(.3 * Math.max(0, Math.min(1, t))).toFixed(2)})`; ctx.beginPath(); ctx.arc(W, 0, r, 0, 7); ctx.stroke(); }
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
  try { const logo = await loadImg("/assets/wendys-horiz-white.svg"); ctx.drawImage(logo, 70, 70, 260, 260 * (logo.height / logo.width)); } catch {}
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
  try { const cam = await loadImg("/assets/cameo.png"); ctx.drawImage(cam, 760, 372, 240, 240 * (cam.height / cam.width)); } catch {}
  ctx.restore();
  // front ticket
  const fy = 560, fh = 520;
  rr(ctx, 78, fy + 8, 930, fh, 40); ctx.fillStyle = C.charcoal; ctx.fill();
  rr(ctx, 70, fy, 930, fh, 40); ctx.fillStyle = "#fff"; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = C.charcoal; ctx.stroke();
  ctx.save(); ctx.setLineDash([8, 8]); ctx.lineWidth = 3; ctx.strokeStyle = C.line; rr(ctx, 84, fy + 14, 902, fh - 28, 30); ctx.stroke(); ctx.restore();
  ctx.save(); rr(ctx, 70, fy, 930, fh, 40); ctx.clip(); ctx.fillStyle = C.red; ctx.fillRect(70, fy, 20, fh / 2); ctx.fillStyle = C.blue; ctx.fillRect(70, fy + fh / 2, 20, fh / 2); ctx.restore();
  try { const logo = await loadImg("/assets/wendys-horiz.svg"); ctx.drawImage(logo, 130, fy + 44, 240, 240 * (logo.height / logo.width)); } catch {}
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
  ctx.fillStyle = C.blueDark; ctx.font = "italic 800 38px Poppins, sans-serif"; ctx.fillText(new Date(p.joined.replace(" ", "T") + "Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Colombo" }).toUpperCase(), 950, fy + 486); ctx.textAlign = "left";
  // badges
  const badges = [["ROOKIE", true], ["SCREAMER", p.badges.screamer], ["WINNER", p.badges.winner], ["ROASTED", p.badges.roasted]];
  badges.forEach(([label, on], i) => { const x = 70 + i * 240; rr(ctx, x, 1130, 220, 110, 24); ctx.fillStyle = on ? C.red : "#fff"; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = on ? C.redDark : C.line; ctx.stroke(); ctx.fillStyle = on ? "#fff" : "#B5B5B5"; ctx.font = BODY(26, 800); ctx.textAlign = "center"; ctx.fillText(label, x + 110, 1200); ctx.textAlign = "left"; });
  const win = p.screams.find((s) => s.won && s.coupon);
  ctx.fillStyle = C.mute; ctx.font = BODY(22, 700); ctx.fillText(win ? `REWARD ${win.coupon.code} · © 2026 WENDY'S SRI LANKA` : "© 2026 WENDY'S SRI LANKA · WENDY FEST", 70, 1300);
  return c;
};

// Roast card: 1080x1920 "ROASTED." story poster (Roast Wall share template)
window.renderRoastCard = async (r, lang) => {
  await fontsReady();
  const W = 1080, H = 1920, c = document.createElement("canvas"); c.width = W; c.height = H; const ctx = c.getContext("2d");
  const poly = (pts, fill) => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); };
  const redG = () => { const g = ctx.createLinearGradient(0, 900, 300, 1920); g.addColorStop(0, "#D92530"); g.addColorStop(1, "#B81C24"); return g; };
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
  poly([[0, 1120], [W, 860], [W, H], [0, H]], redG());
  // top lockup: Wendy's logo | Wendy Fest logo
  try { const logo = await loadImg("/assets/wendys-horiz.svg"); ctx.drawImage(logo, 70, 72, 300, 300 * (logo.height / logo.width)); } catch {}
  ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.fillRect(404, 70, 4, 88);
  try { const fest = await loadImg("/assets/wendyfest-logo.png"); const fh = 150; ctx.drawImage(fest, 440, 116 - fh / 2, fh * fest.width / fest.height, fh); } catch {}   // the final Wendy Fest logo
  // ROASTED.
  let rs = 250; ctx.font = DISPLAY(rs); while (ctx.measureText("ROASTED.").width > 960 && rs > 120) { rs -= 6; ctx.font = DISPLAY(rs); }
  ctx.textAlign = "center"; ctx.fillStyle = "#7E1016"; ctx.fillText("ROASTED.", W / 2, 440 + 9); ctx.fillStyle = C.red; ctx.fillText("ROASTED.", W / 2, 440); ctx.textAlign = "left";
  // photo, white frame, slight tilt
  const PX = 110, PY = 510, PW = 860, PH = 720;
  ctx.save(); ctx.translate(W / 2, PY + PH / 2); ctx.rotate(-2 * Math.PI / 180); ctx.translate(-W / 2, -(PY + PH / 2));
  ctx.shadowColor = "rgba(0,0,0,.35)"; ctx.shadowBlur = 50; ctx.shadowOffsetY = 24; ctx.fillStyle = "#fff"; ctx.fillRect(PX - 18, PY - 18, PW + 36, PH + 36); ctx.shadowColor = "transparent";
  ctx.fillStyle = "#2A2626"; ctx.fillRect(PX, PY, PW, PH);
  if (r.photo) { try { const img = await loadImg(r.photo); const s = Math.max(PW / img.width, PH / img.height); const sw = PW / s, sh = PH / s; ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, PX, PY, PW, PH); } catch {} }
  ctx.restore();
  // black band: name + punchline
  poly([[0, 1340], [W, 1290], [W, 1700], [0, 1700]], "#1E1B1B");
  const first = String(r.name || "").split(" ")[0].toUpperCase();
  let ns = 170; ctx.font = DISPLAY(ns); while (ctx.measureText(first).width > 930 && ns > 70) { ns -= 6; ctx.font = DISPLAY(ns); }
  ctx.fillStyle = "#fff"; ctx.fillText(first, 72, 1360 + ns * .78);
  const body = (r.roast && (r.roast[lang] || r.roast.en)) || "";
  let punch = body.split(/(?<=[.!?।])\s+/)[0] || ""; if (punch.length > 110) punch = punch.slice(0, 106).replace(/\s+\S*$/, "") + "…";
  let ps = 46, pl; for (;;) { ctx.font = BODY(ps, 700); pl = wrap(ctx, punch, 936); if (pl.length <= 2 || ps <= 30) break; ps -= 2; }
  let y = 1360 + ns * .78 + 30 + ps; for (const l of pl.slice(0, 2)) { ctx.fillText(l, 72, y); y += ps * 1.25; }
  // footer: cameo + hashtag + title tag
  try { const cam = await loadImg("/assets/cameo.png"); ctx.drawImage(cam, 50, 1735, 150, 150 * (cam.height / cam.width)); } catch {}
  ctx.textAlign = "right"; ctx.fillStyle = "#fff"; ctx.font = "italic 900 54px Poppins, sans-serif"; ctx.fillText("#RoastedByWendy", 1020, 1835);
  const title = (r.title && (r.title[lang] || r.title.en)) || "";
  ctx.font = BODY(26, 800); ctx.globalAlpha = .85; ctx.fillText((lang === "en" ? title.toUpperCase() : title).slice(0, 48), 1020, 1878); ctx.globalAlpha = 1; ctx.textAlign = "left";
  return c;
};

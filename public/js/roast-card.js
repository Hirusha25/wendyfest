// The Roast Me share card (1080 x 1920), drawn on a canvas: slanted poster with the guest cut out of their photo,
// the name on a red tape, the roast on cream strips with the last line on blue, Wendy in the corner.
// Used by the kiosk reveal screen and the guest's phone page.  roastCard(r, lang) -> Promise<canvas>
// The cut-out uses MediaPipe in the browser (needs internet the first time). If it cannot load in time the photo is
// shown in a frame instead, so the booth never stalls.
(() => {
  const BASE = new URL("..", document.currentScript.src);   // the site root, also when served from a sub-folder (the demo)
  const W = 1080, H = 1920, RED = "#D31F28", DEEP = "#8E1219", INK = "#191616", CREAM = "#F6F0E6", BLUE = "#18A6E8";
  const TXT = "'Barlow Condensed', 'Noto Sans Sinhala', 'Noto Sans Tamil', sans-serif";
  const FONTS = "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@900&family=Barlow+Semi+Condensed:ital,wght@1,900&family=Poppins:ital,wght@1,900&display=swap";
  const MP = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";
  const MODEL = "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite";
  const load = (src) => new Promise((res, rej) => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => res(i); i.onerror = rej; i.src = src; });
  const within = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);

  let fontsP = null, segP = null, artP = null;
  const fonts = () => fontsP || (fontsP = (async () => {
    if (!document.querySelector(`link[href="${FONTS}"]`)) { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = FONTS; document.head.appendChild(l); }
    try { await within(Promise.all(["900 100px 'Barlow Condensed'", "italic 900 60px 'Barlow Semi Condensed'", "italic 900 60px Poppins"].map((f) => document.fonts.load(f))), 6000); } catch {}
  })());
  const art = () => artP || (artP = Promise.all([load(new URL("assets/wendys-horiz.svg", BASE).href), load(new URL("assets/roast-wendy.png", BASE).href), load(new URL("assets/wendyfest-logo.png", BASE).href)]));
  const segmenter = () => segP || (segP = (async () => {
    const { FilesetResolver, ImageSegmenter } = await import(MP + "/vision_bundle.mjs");
    const files = await FilesetResolver.forVisionTasks(MP + "/wasm");
    return ImageSegmenter.createFromOptions(files, { baseOptions: { modelAssetPath: MODEL, delegate: "CPU" }, runningMode: "IMAGE", outputCategoryMask: false, outputConfidenceMasks: true });
  })().catch((e) => { segP = null; throw e; }));

  // The guest cut out of the photo, with the box around the whole person and around the head.
  const cuts = new Map();
  async function cutout(img, key) {
    if (cuts.has(key)) return cuts.get(key);
    const seg = await within(segmenter(), 20000);
    const masks = seg.segment(img).confidenceMasks, bg = masks[0], mw = bg.width, mh = bg.height, b = bg.getAsFloat32Array();
    const cut = document.createElement("canvas"); cut.width = img.naturalWidth; cut.height = img.naturalHeight; const cx = cut.getContext("2d");
    const mk = document.createElement("canvas"); mk.width = mw; mk.height = mh; const mx = mk.getContext("2d"), id = mx.createImageData(mw, mh);
    for (let i = 0; i < b.length; i++) { const p = 1 - b[i], v = Math.min(1, Math.max(0, (p - .45) / .3)); id.data[i * 4 + 3] = v * v * (3 - 2 * v) * 255; }
    mx.putImageData(id, 0, 0);
    cx.imageSmoothingQuality = "high"; cx.filter = "blur(1.4px)"; cx.drawImage(mk, 0, 0, cut.width, cut.height); cx.filter = "none"; cx.globalCompositeOperation = "source-in"; cx.drawImage(img, 0, 0);
    const a = cx.getImageData(0, 0, cut.width, cut.height).data; let x0 = cut.width, x1 = 0, y0 = cut.height, y1 = 0;
    for (let y = 0; y < cut.height; y += 2) for (let x = 0; x < cut.width; x += 2) if (a[(y * cut.width + x) * 4 + 3] > 60) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const hair = masks[1].getAsFloat32Array(), face = masks[3].getAsFloat32Array(); let hx0 = mw, hx1 = 0, hy0 = mh, hy1 = 0;
    for (let y = 0; y < mh; y += 2) for (let x = 0; x < mw; x += 2) { const i = y * mw + x; if (hair[i] > .5 || face[i] > .5) { if (x < hx0) hx0 = x; if (x > hx1) hx1 = x; if (y < hy0) hy0 = y; if (y > hy1) hy1 = y; } }
    masks.forEach((m) => m.close && m.close());
    const kx = cut.width / mw, ky = cut.height / mh;
    if (x1 - x0 < cut.width * .12 || hy1 - hy0 < 8 || hx1 <= hx0) throw new Error("no person found");
    const out = { cut, x0, x1, y0, y1, hx0: hx0 * kx, hx1: hx1 * kx, hy0: hy0 * ky, hy1: hy1 * ky };
    cuts.set(key, out); if (cuts.size > 4) cuts.delete(cuts.keys().next().value);
    return out;
  }

  async function roastCard(r, lang) {
    const name = String(r.name || "").trim().split(/\s+/)[0].toUpperCase();
    const text = String((r.roast && (r.roast[lang] || r.roast.en)) || "").trim();
    const [, [logo, wendy, fest], img] = await Promise.all([fonts(), art(), r.photo ? load(r.photo).catch(() => null) : null]);
    let P = null; if (img) { try { P = await cutout(img, r.photo); } catch (e) { console.warn("roast card: no cut-out,", e.message); } }
    const out = document.createElement("canvas"); out.width = W; out.height = H; const o = out.getContext("2d"); o.imageSmoothingQuality = "high";
    const poly = (pts, fill) => { o.beginPath(); pts.forEach(([x, y], i) => i ? o.lineTo(x, y) : o.moveTo(x, y)); o.closePath(); o.fillStyle = fill; o.fill(); };
    const fitFont = (txt, tpl, size, maxW) => { let s = size; for (;;) { o.font = tpl.replace("SIZE", s); if (o.measureText(txt).width <= maxW || s < 20) return s; s -= 4; } };
    const wrap = (txt, font, maxW) => { o.font = font; const lines = []; let ln = ""; for (const w of txt.split(/\s+/)) { if (ln && o.measureText(ln + " " + w).width > maxW) { lines.push(ln); ln = w; } else ln = ln ? ln + " " + w : w; } lines.push(ln); return lines; };
    const fitWrap = (txt, tpl, size, maxW, maxLines) => { let s = size, l; do { l = wrap(txt, tpl.replace("SIZE", s), maxW); s -= 2; } while (l.length > maxLines && s > 24); return { size: s + 2, lines: l.slice(0, maxLines + 1) }; };
    const dots = (cxp, cyp, rad, col, alpha) => { o.save(); o.fillStyle = col; for (let y = cyp - rad; y < cyp + rad; y += 22) for (let x = cxp - rad + ((y / 22 | 0) % 2) * 11; x < cxp + rad; x += 22) { const d = Math.hypot(x - cxp, y - cyp) / rad; if (d < 1) { o.globalAlpha = alpha * (1 - d); o.beginPath(); o.arc(x, y, 6 * (1 - d * .7), 0, 7); o.fill(); } } o.restore(); };
    const lockup = (x, y, sc) => { const one = (txt, xx, yy, c1, c2) => { o.save(); o.translate(xx, yy); o.transform(1, -.09, -.25, 1, 0, 0); o.font = `italic 900 ${62 * sc}px 'Barlow Semi Condensed', sans-serif`; const w = o.measureText(txt).width + 44 * sc; const g = o.createLinearGradient(0, 0, 0, 78 * sc); g.addColorStop(0, c1); g.addColorStop(.82, c1); g.addColorStop(.82, c2); g.addColorStop(1, c2); o.fillStyle = g; o.fillRect(0, 0, w, 78 * sc); o.fillStyle = "#fff"; o.textBaseline = "middle"; o.fillText(txt, 22 * sc, 36 * sc); o.restore(); o.textBaseline = "alphabetic"; return w; }; const w1 = one("WENDY", x, y, "#D8262F", "#951620"); one("FEST", x + w1 - 14 * sc, y + 16 * sc, "#2BA9E1", "#01679A"); };

    // paper, with the black Wendy's wordmark (the cameo keeps its colours) and the Wendy Fest lockup
    const pg = o.createLinearGradient(0, 0, 0, 1100); pg.addColorStop(0, "#FFFFFF"); pg.addColorStop(1, "#F6F0E6"); o.fillStyle = pg; o.fillRect(0, 0, W, H); dots(1040, 250, 420, "#CFC6BD", .7); dots(40, 760, 300, "#CFC6BD", .5);
    const lh = 104, lw = Math.round(lh * logo.naturalWidth / logo.naturalHeight), lc = document.createElement("canvas"); lc.width = lw * 2; lc.height = lh * 2; const lx = lc.getContext("2d"); lx.drawImage(logo, 0, 0, lw * 2, lh * 2);
    try { const ld = lx.getImageData(0, 0, lc.width, lc.height), c0 = Math.round(lc.width * .665); for (let y = 0; y < lc.height; y++) for (let x = 0; x < c0; x++) { const i = (y * lc.width + x) * 4; ld.data[i] = 22; ld.data[i + 1] = 19; ld.data[i + 2] = 19; } lx.putImageData(ld, 0, 0); } catch {}
    const fh = 156, fw = Math.round(fh * fest.naturalWidth / fest.naturalHeight), hx = Math.round((W - (lw + 72 + fw)) / 2); o.drawImage(lc, hx, 50, lw, lh); o.fillStyle = "rgba(22,19,19,.55)"; o.fillRect(hx + lw + 34, 58, 4, 90); o.drawImage(fest, hx + lw + 72, Math.round(50 + lh / 2 - fh / 2), fw, fh);   // the final Wendy Fest logo
    // ROASTED. headline: straight, soft 3D
    const tall = 350, depth = 13, baseY = 232 + tall;
    o.save(); o.translate(W / 2 - 6, baseY); o.textAlign = "center";
    const fs = fitFont("ROASTED.", "900 SIZEpx 'Barlow Condensed', sans-serif", 700, W - 60); o.font = `900 ${fs}px 'Barlow Condensed', sans-serif`; const SY = tall / (fs * .7); o.scale(1, SY);
    for (let dd = depth; dd >= 1; dd--) { o.fillStyle = dd > depth * .6 ? "#4E0A0E" : "#8E1219"; o.fillText("ROASTED.", dd * .45, dd / SY); }
    const rg = o.createLinearGradient(0, -fs * .72, 0, 0); rg.addColorStop(0, "#F5414B"); rg.addColorStop(.5, "#D31F28"); rg.addColorStop(1, "#B01A22"); o.fillStyle = rg;
    o.shadowColor = "rgba(60,0,8,.3)"; o.shadowBlur = 26; o.shadowOffsetY = 26; o.fillText("ROASTED.", 0, 0); o.shadowColor = "transparent";
    o.lineWidth = 3; o.strokeStyle = "rgba(255,255,255,.55)"; o.strokeText("ROASTED.", -2, -3 / SY); o.restore();
    // plain red diagonal with a blue and a cream edge
    const g = o.createLinearGradient(0, 760, 500, 1800); g.addColorStop(0, "#E3252F"); g.addColorStop(1, "#A9181F"); poly([[0, 1090], [W, 790], [W, H], [0, H]], g);
    poly([[0, 1062], [W, 762], [W, 776], [0, 1076]], BLUE); poly([[0, 1076], [W, 776], [W, 790], [0, 1090]], CREAM);
    // the guest: head 400 px tall, body reaching under the band
    if (P) {
      const headTop = Math.round(baseY - tall * .34), pw = P.x1 - P.x0, ph = P.y1 - P.y0, sc = Math.min(3.4, Math.max(400 / (P.hy1 - P.hy0), (1330 - headTop) / (P.y1 - P.hy0)));
      o.save(); o.shadowColor = "rgba(0,0,0,.3)"; o.shadowBlur = 28; o.shadowOffsetY = 12; o.drawImage(P.cut, P.x0, P.y0, pw, ph, W / 2 - ((P.hx0 + P.hx1) / 2 - P.x0) * sc, headTop - (P.hy0 - P.y0) * sc, pw * sc, ph * sc); o.restore();
    } else if (img) {   // no cut-out: the photo in a tilted white frame
      const fx = 150, fy = 440, fw = 780, fh = 860, k = Math.max(fw / img.naturalWidth, fh / img.naturalHeight), sw = fw / k, sh = fh / k;
      o.save(); o.translate(W / 2, fy + fh / 2); o.rotate(-.03); o.translate(-W / 2, -(fy + fh / 2)); o.shadowColor = "rgba(0,0,0,.4)"; o.shadowBlur = 36; o.shadowOffsetY = 16; o.fillStyle = "#fff"; o.fillRect(fx - 16, fy - 16, fw + 32, fh + 32); o.shadowColor = "transparent";
      o.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) * .3, sw, sh, fx, fy, fw, fh); o.restore();
    }
    // slanted black band with a white line above it
    const RISE = 96, ANG = -Math.atan(RISE / W), by0 = 1300, by1 = by0 - RISE;
    poly([[0, by0], [W, by1], [W, 1800], [0, 1800]], "#141111"); const bg2 = o.createLinearGradient(0, by1, 0, 1800); bg2.addColorStop(0, "rgba(255,255,255,.10)"); bg2.addColorStop(.3, "rgba(255,255,255,0)"); poly([[0, by0], [W, by1], [W, 1800], [0, 1800]], bg2);
    o.save(); o.beginPath(); o.moveTo(0, by0); o.lineTo(W, by1); o.lineTo(W, 1800); o.lineTo(0, 1800); o.closePath(); o.clip(); dots(1060, by1 + 120, 330, "#E3202B", .85); dots(20, 1640, 300, "#E3202B", .6); o.restore();
    poly([[0, by0 - 16], [W, by1 - 16], [W, by1], [0, by0]], "#fff");
    // slanted red footer, Wendy coming up out of the corner with a white outline, the hashtag
    const fy2 = 1738, fr = 40; poly([[0, fy2 + fr], [W, fy2 - fr], [W, H], [0, H]], g);
    const ws = 340, wc = document.createElement("canvas"), wf = document.createElement("canvas"); wc.width = wc.height = wf.width = wf.height = ws; const fx2 = wf.getContext("2d"); fx2.translate(ws, 0); fx2.scale(-1, 1); fx2.drawImage(wendy, 0, 0, ws, ws); const wx = wc.getContext("2d"); wx.drawImage(wf, 0, 0); wx.globalCompositeOperation = "source-in"; wx.fillStyle = "#fff"; wx.fillRect(0, 0, ws, ws);
    for (let k = 0; k < 16; k++) { const an = k * Math.PI / 8; o.drawImage(wc, -40 + Math.cos(an) * 9, 1668 + Math.sin(an) * 9); } o.drawImage(wf, -40, 1668);
    o.fillStyle = "#fff"; o.textAlign = "right"; o.font = "italic 900 66px Poppins, sans-serif"; o.save(); o.shadowColor = "#7E1016"; o.shadowOffsetY = 5; o.fillText("#RoastedByWendy", W - 56, 1866); o.restore(); o.textAlign = "left";
    // the name on a red tape, the roast on cream strips, the last line on blue
    o.save(); o.translate(W / 2, 1252); o.rotate(ANG); o.fillStyle = DEEP; o.fillRect(-640, 30, 1280, 150); const tg = o.createLinearGradient(0, 18, 0, 168); tg.addColorStop(0, "#EE2E38"); tg.addColorStop(1, "#C81C25"); o.fillStyle = tg; o.fillRect(-640, 18, 1280, 150);
    o.textAlign = "center"; const ns = fitFont(name, `900 SIZEpx ${TXT}`, 160, 860); o.font = `900 ${ns}px ${TXT}`; o.fillStyle = "rgba(60,0,8,.55)"; o.fillText(name, 4, 93 + ns * .36 + 7); o.fillStyle = CREAM; o.fillText(name, 0, 93 + ns * .36);
    const local = /[஀-௿඀-෿]/.test(text);   // Sinhala and Tamil letters are wider and taller: start smaller
    const c = fitWrap(text.toUpperCase(), `900 SIZEpx ${TXT}`, local ? 50 : 68, local ? 800 : 880, 3); const n = Math.min(c.lines.length, 4), small = n > 3 ? .8 : 1, size = c.size * small; o.font = `900 ${size}px ${TXT}`; const sh = size * 1.14, step = sh + (n > 3 ? 6 : 11), y0s = 196 + (3 - n) * step / 2;
    c.lines.slice(0, n).forEach((l, i) => { const last = i === n - 1, lw2 = Math.min(1000, o.measureText(l).width + 60); o.save(); o.translate(i % 2 ? 22 : -14, y0s + i * step + sh / 2); o.rotate(i % 2 ? .012 : -.014); o.fillStyle = last ? "#0B6FA3" : "#E3202B"; o.fillRect(-lw2 / 2 + 8, -sh / 2 + 8, lw2, sh); o.fillStyle = last ? BLUE : CREAM; o.fillRect(-lw2 / 2, -sh / 2, lw2, sh); o.fillStyle = last ? "#fff" : INK; o.textAlign = "center"; o.font = `900 ${size}px ${TXT}`; o.fillText(l, 0, size * .355, lw2 - 40); o.restore(); });
    o.restore();
    out.dataset.cutout = P ? "1" : "0";
    return out;
  }
  // Load the fonts, art and cut-out engine ahead of time (the kiosk calls this once staff have signed in).
  roastCard.warm = () => { fonts(); art().catch(() => {}); segmenter().catch(() => {}); };
  window.roastCard = roastCard;
})();

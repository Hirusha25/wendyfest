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

  // How sure the cut-out engine is that each point is the guest (hair counts even where it is thin), as a small see-through picture,
  // plus the box around the head (hair and face), in that picture's own points.
  function personMask(masks) {
    const bg = masks[0], mw = bg.width, mh = bg.height, n = mw * mh, b = bg.getAsFloat32Array(), hair = masks[1].getAsFloat32Array(), face = masks[3].getAsFloat32Array();
    const al = new Uint8ClampedArray(n), lab = new Int32Array(n), stack = new Int32Array(n);
    for (let i = 0; i < n; i++) { const p = Math.max(1 - b[i], Math.min(1, hair[i] * 1.35)), v = Math.min(1, Math.max(0, (p - .4) / .3)); al[i] = v * v * (3 - 2 * v) * 255; }
    // Keep only the main guest: the biggest joined-up shape that has a head. People in the background, or a second person standing apart, are left out
    // (friends who stand touching stay together).
    let best = 0, bestScore = 0, id = 0;
    for (let s0 = 0; s0 < n; s0++) {
      if (al[s0] < 110 || lab[s0]) continue; id++; let top = 0, area = 0, head = 0; stack[top++] = s0; lab[s0] = id;
      while (top) { const i = stack[--top], x = i % mw; area++; if (hair[i] > .5 || face[i] > .5) head++;
        if (x > 0 && al[i - 1] >= 110 && !lab[i - 1]) { lab[i - 1] = id; stack[top++] = i - 1; } if (x < mw - 1 && al[i + 1] >= 110 && !lab[i + 1]) { lab[i + 1] = id; stack[top++] = i + 1; }
        if (i >= mw && al[i - mw] >= 110 && !lab[i - mw]) { lab[i - mw] = id; stack[top++] = i - mw; } if (i < n - mw && al[i + mw] >= 110 && !lab[i + mw]) { lab[i + mw] = id; stack[top++] = i + mw; } }
      const score = head >= 12 ? area : 0; if (score > bestScore) { bestScore = score; best = id; }
    }
    const mk = document.createElement("canvas"); mk.width = mw; mk.height = mh; const mx = mk.getContext("2d"), im = mx.createImageData(mw, mh); let hx0 = mw, hx1 = 0, hy0 = mh, hy1 = 0;
    if (best) for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
      const i = y * mw + x; if (!al[i]) continue; let keep = lab[i] === best;
      if (!keep && !lab[i]) for (let dy = -3; dy <= 3 && !keep; dy++) { const yy = y + dy; if (yy < 0 || yy >= mh) continue; for (let dx = -3; dx <= 3; dx++) { const xx = x + dx; if (xx >= 0 && xx < mw && lab[yy * mw + xx] === best) { keep = true; break; } } }   // the soft edge (thin hair) around the guest
      if (!keep) continue; im.data[i * 4 + 3] = al[i];
      if (lab[i] === best && (hair[i] > .5 || face[i] > .5)) { if (x < hx0) hx0 = x; if (x > hx1) hx1 = x; if (y < hy0) hy0 = y; if (y > hy1) hy1 = y; }
    }
    mx.putImageData(im, 0, 0); masks.forEach((m) => m.close && m.close());
    return { mk, mw, mh, head: hx1 > hx0 && hy1 - hy0 >= 8 ? { x0: hx0, x1: hx1 + 1, y0: hy0, y1: hy1 + 1 } : null };
  }
  // The guest cut out of the photo, with the box around the whole person and around the head.
  // Two looks: one at the whole photo to find the guest, then a close one at the head and shoulders, so hair is traced at about three
  // times the detail (the engine only sees 256 x 256 points, which is very little when the guest is small in the frame).
  const cuts = new Map();
  async function cutout(img, key) {
    if (cuts.has(key)) return cuts.get(key);
    const seg = await within(segmenter(), 20000), iw = img.naturalWidth, ih = img.naturalHeight;
    const one = personMask(seg.segment(img).confidenceMasks); if (!one.head) throw new Error("no person found");
    const kx = iw / one.mw, ky = ih / one.mh; let H = { x0: one.head.x0 * kx, x1: one.head.x1 * kx, y0: one.head.y0 * ky, y1: one.head.y1 * ky };
    const al = document.createElement("canvas"); al.width = iw; al.height = ih; const ax = al.getContext("2d"); ax.imageSmoothingQuality = "high";
    ax.filter = "blur(1.4px)"; ax.drawImage(one.mk, 0, 0, iw, ih); ax.filter = "none";
    try {
      const side = Math.max(H.x1 - H.x0, H.y1 - H.y0) * 2.2, mx0 = (H.x0 + H.x1) / 2;
      const rx0 = Math.max(0, Math.round(mx0 - side / 2)), ry0 = Math.max(0, Math.round(H.y0 - side * .24)), rx1 = Math.min(iw, Math.round(mx0 + side / 2)), ry1 = Math.min(ih, Math.round(H.y0 + side * .76)), rw = rx1 - rx0, rh = ry1 - ry0;
      if (rw > 48 && rh > 48 && rw * rh < iw * ih * .7) {   // a guest who already fills the photo gains nothing from a second look
        const k = Math.max(1, 512 / Math.max(rw, rh)), cc = document.createElement("canvas"); cc.width = Math.round(rw * k); cc.height = Math.round(rh * k);
        const c2 = cc.getContext("2d"); c2.imageSmoothingQuality = "high"; c2.drawImage(img, rx0, ry0, rw, rh, 0, 0, cc.width, cc.height);
        const two = personMask(seg.segment(cc).confidenceMasks);
        if (two.head) {
          // the close look replaces the first one inside its box, fading into it over the box's edge so no seam shows
          const fe = Math.round(Math.min(rw, rh) * .07), t = document.createElement("canvas"); t.width = rw; t.height = rh; const tx = t.getContext("2d"); tx.imageSmoothingQuality = "high";
          tx.filter = `blur(${Math.max(.6, 1.1 / k)}px)`; tx.drawImage(two.mk, 0, 0, rw, rh); tx.filter = "none";
          const w = document.createElement("canvas"); w.width = rw; w.height = rh; const wx = w.getContext("2d"); wx.filter = `blur(${fe / 2}px)`; wx.fillStyle = "#000";
          wx.fillRect(rx0 > 0 ? fe : -fe, ry0 > 0 ? fe : -fe, rw - (rx0 > 0 ? fe : -fe) - (rx1 < iw ? fe : -fe), rh - (ry0 > 0 ? fe : -fe) - (ry1 < ih ? fe : -fe)); wx.filter = "none";
          tx.globalCompositeOperation = "destination-in"; tx.drawImage(w, 0, 0);
          ax.globalCompositeOperation = "destination-out"; ax.drawImage(w, rx0, ry0); ax.globalCompositeOperation = "lighter"; ax.drawImage(t, rx0, ry0); ax.globalCompositeOperation = "source-over";
          const qx = rw / two.mw, qy = rh / two.mh; H = { x0: rx0 + two.head.x0 * qx, x1: rx0 + two.head.x1 * qx, y0: ry0 + two.head.y0 * qy, y1: ry0 + two.head.y1 * qy };
        }
      }
    } catch (e) { console.warn("roast card: close look at the head failed,", e.message); }
    const cut = document.createElement("canvas"); cut.width = iw; cut.height = ih; const cx = cut.getContext("2d");
    cx.drawImage(al, 0, 0); cx.globalCompositeOperation = "source-in"; cx.drawImage(img, 0, 0);
    const a = cx.getImageData(0, 0, iw, ih).data; let x0 = iw, x1 = 0, y0 = ih, y1 = 0;
    for (let y = 0; y < ih; y += 2) for (let x = 0; x < iw; x += 2) if (a[(y * iw + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 - x0 < iw * .12) throw new Error("no person found");
    x0 = Math.max(0, x0 - 3); y0 = Math.max(0, y0 - 3); x1 = Math.min(iw, x1 + 3); y1 = Math.min(ih, y1 + 3);   // keep the soft edge of the hair inside the box
    const out = { cut, x0, x1, y0, y1, hx0: H.x0, hx1: H.x1, hy0: H.y0, hy1: H.y1 };
    cuts.set(key, out); if (cuts.size > 4) cuts.delete(cuts.keys().next().value);
    return out;
  }

  // Keywords in a roast, shown in bold: the guest's name, Wendy's menu items, and the things Wendy noticed in the photo.
  const MENU = ["Classic Chicken Burger", "Spicy Chicken Burger", "Grilled Chicken Burger", "Chicken Tenders Burger", "Lankan Fire Burger", "Molten Cheese Lava", "Paneer Double Decker", "Skin-On Shaker Fries", "Shaker Fries", "Chicken Tenders", "Chicken Bites", "Chickenator", "Frostyccino", "Frosty", "Garden Salad", "Wendy's", "Wendy’s"];
  window.roastKeys = (r) => [String((r && r.name) || "").trim().split(/\s+/)[0], ...MENU, r && r.vibe, ...((r && r.keys) || [])].map((k) => String(k || "").trim()).filter((k) => k.length > 2 && k.split(/\s+/).length <= 4);
  // Text made safe for the page, with each keyword wrapped in <b>. Longer keywords win over shorter ones inside them.
  window.boldKeywords = (text, keys) => {
    const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    const ks = [...new Set((keys || []).map((k) => k.toLowerCase()))].sort((a, b) => b.length - a.length).map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+"));
    if (!ks.length) return esc(text);
    const re = new RegExp("(^|[^A-Za-z0-9])((?:" + ks.join("|") + ")(?:e?s)?)(?![A-Za-z0-9])", "gi"); let out = "", last = 0, m;
    const src = String(text || "");
    while ((m = re.exec(src))) { const at = m.index + m[1].length; out += esc(src.slice(last, at)) + "<b>" + esc(m[2]) + "</b>"; last = at + m[2].length; }
    return out + esc(src.slice(last));
  };
  // The top of the card (behind the logos and ROASTED.) can be drawn in different colours. "paper" is the original white.
  const THEMES = {
    paper: { top: ["#F8F1E4", "#E8DCC8"], dots: ["#C9BBA4", .75, .55], word: [22, 19, 19], rule: "rgba(22,19,19,.55)", head: ["#F5414B", "#D31F28", "#B01A22"], deep: ["#4E0A0E", "#8E1219"], edge: "rgba(255,255,255,.55)" },
    dark: { top: ["#221E1E", "#0D0B0B"], dots: ["#E3202B", .85, .6], word: [255, 255, 255], rule: "rgba(255,255,255,.5)", head: ["#FF4B55", "#E3202B", "#BE1C25"], deep: ["#3A0609", "#7E1016"], edge: "rgba(255,255,255,.7)" },
    blue: { top: ["#27B1F0", "#0A7FBC"], dots: ["#FFFFFF", .32, .25], word: [255, 255, 255], rule: "rgba(255,255,255,.6)", head: ["#FFFFFF", "#FFFFFF", "#F1E9DD"], deep: ["#7E1016", "#C41E26"], edge: "rgba(255,255,255,0)" },
    red: { top: ["#EA3640", "#B01A22"], dots: ["#FFFFFF", .26, .2], word: [255, 255, 255], rule: "rgba(255,255,255,.6)", head: ["#FFFFFF", "#FFFFFF", "#F1E9DD"], deep: ["#4E0A0E", "#7E1016"], edge: "rgba(255,255,255,0)" },
  };
  async function roastCard(r, lang, theme) {
    const T = THEMES[theme] || THEMES[roastCard.theme] || THEMES.paper;   // beige is the card's starting colour (owner, Nov 2026); the guest can pick another
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
    const pg = o.createLinearGradient(0, 0, 0, 1100); pg.addColorStop(0, T.top[0]); pg.addColorStop(1, T.top[1]); o.fillStyle = pg; o.fillRect(0, 0, W, H); dots(1040, 250, 420, T.dots[0], T.dots[1]); dots(40, 760, 300, T.dots[0], T.dots[2]);
    const lh = 104, lw = Math.round(lh * logo.naturalWidth / logo.naturalHeight), lc = document.createElement("canvas"); lc.width = lw * 2; lc.height = lh * 2; const lx = lc.getContext("2d"); lx.drawImage(logo, 0, 0, lw * 2, lh * 2);
    try { const ld = lx.getImageData(0, 0, lc.width, lc.height), c0 = Math.round(lc.width * .665); for (let y = 0; y < lc.height; y++) for (let x = 0; x < c0; x++) { const i = (y * lc.width + x) * 4; ld.data[i] = T.word[0]; ld.data[i + 1] = T.word[1]; ld.data[i + 2] = T.word[2]; } lx.putImageData(ld, 0, 0); } catch {}
    const fh = 156, fw = Math.round(fh * fest.naturalWidth / fest.naturalHeight), hx = Math.round((W - (lw + 72 + fw)) / 2); o.drawImage(lc, hx, 50, lw, lh); o.fillStyle = T.rule; o.fillRect(hx + lw + 34, 58, 4, 90); o.drawImage(fest, hx + lw + 72, Math.round(50 + lh / 2 - fh / 2), fw, fh);   // the final Wendy Fest logo
    // ROASTED. headline: straight, soft 3D
    const tall = 350, depth = 13, baseY = 232 + tall;
    o.save(); o.translate(W / 2 - 6, baseY); o.textAlign = "center";
    const fs = fitFont("ROASTED.", "900 SIZEpx 'Barlow Condensed', sans-serif", 700, W - 60); o.font = `900 ${fs}px 'Barlow Condensed', sans-serif`; const SY = tall / (fs * .7); o.scale(1, SY);
    for (let dd = depth; dd >= 1; dd--) { o.fillStyle = dd > depth * .6 ? T.deep[0] : T.deep[1]; o.fillText("ROASTED.", dd * .45, dd / SY); }
    const rg = o.createLinearGradient(0, -fs * .72, 0, 0); rg.addColorStop(0, T.head[0]); rg.addColorStop(.5, T.head[1]); rg.addColorStop(1, T.head[2]); o.fillStyle = rg;
    o.shadowColor = "rgba(60,0,8,.3)"; o.shadowBlur = 26; o.shadowOffsetY = 26; o.fillText("ROASTED.", 0, 0); o.shadowColor = "transparent";
    o.lineWidth = 3; o.strokeStyle = T.edge; o.strokeText("ROASTED.", -2, -3 / SY); o.restore();
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
  // Where the guest is in a photo (sizes in the photo's own pixels): the whole person and the head. Used by the LED wall to frame the photo.
  roastCard.focus = async (src) => { const img = await load(src), P = await cutout(img, src); return { w: img.naturalWidth, h: img.naturalHeight, x0: P.x0, x1: P.x1, y0: P.y0, y1: P.y1, hx0: P.hx0, hx1: P.hx1, hy0: P.hy0, hy1: P.hy1 }; };
  // The guest cut out of their photo as a picture with a see-through background, trimmed to the person, plus where the head is inside it. Used by the LED wall.
  roastCard.cut = async (src) => { const img = await load(src), P = await cutout(img, src), w = Math.round(P.x1 - P.x0), h = Math.round(P.y1 - P.y0), c = document.createElement("canvas"); c.width = w; c.height = h; c.getContext("2d").drawImage(P.cut, P.x0, P.y0, w, h, 0, 0, w, h);
    return { url: c.toDataURL("image/png"), w, h, hx0: P.hx0 - P.x0, hx1: P.hx1 - P.x0, hy0: P.hy0 - P.y0, hy1: P.hy1 - P.y0, cutLeft: P.x0 <= 4, cutRight: P.x1 >= img.naturalWidth - 4 }; };
  window.roastCard = roastCard;
})();

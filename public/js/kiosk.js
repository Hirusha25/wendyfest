// Shared kiosk logic: PIN gate, screen router, code keypad, idle timers.
window.K = {
  pin: null,
  station: localStorage.getItem("wf_station") || "A",
  shownAt: 0,
  // true for a moment after a screen appears: a tap aimed at the last screen's button must not press the new screen's button
  fresh(ms = 1200) { return Date.now() - K.shownAt < ms; },
  show(id) { K.shownAt = Date.now(); document.querySelectorAll(".screen").forEach((s) => s.classList.toggle("on", s.id === id)); document.dispatchEvent(new CustomEvent("screen", { detail: id })); },
  async api(path, body, ms = 25000) {   // every request gives up after ms, so a stalled network can never leave a kiosk waiting for ever
    let r; try { r = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, station: K.station }), signal: AbortSignal.timeout(ms) }); }
    catch (e) { throw new Error(e.name === "TimeoutError" || e.name === "AbortError" ? "The network is slow. Please try again." : "No connection. Please try again."); }
    const data = await r.json().catch(() => ({}));
    if (r.status === 401) { K.show("s-pin"); throw new Error("PIN required"); }
    if (!r.ok) throw Object.assign(new Error(data.error || r.statusText), { status: r.status });
    return data;
  },
  async login(pin) { const r = await fetch("/api/kiosk/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin }) }); return r.ok; },
  idleTimer: null,
  resetIdle(ms, fn) { clearTimeout(K.idleTimer); if (ms) K.idleTimer = setTimeout(fn, ms); },
  confetti(n = 80) {
    const box = document.createElement("div"); box.className = "confetti"; document.body.appendChild(box);
    const colors = ["#fff", "#029CD4", "#F2D4D7", "#252525"];
    for (let i = 0; i < n; i++) { const el = document.createElement("i"); el.style.left = Math.random() * 100 + "vw"; el.style.background = colors[i % colors.length]; el.style.animationDelay = Math.random() * .8 + "s"; el.style.transform = `rotate(${Math.random() * 360}deg)`; box.appendChild(el); }
    setTimeout(() => box.remove(), 3800);
  },
  keypad(inputEl, onSubmit) {
    const keys = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".split("");
    const kb = document.createElement("div"); kb.className = "kb";
    for (const k of keys) { const b = document.createElement("button"); b.textContent = k; b.onclick = () => { if (inputEl.value.length < 6) inputEl.value += k; }; kb.appendChild(b); }
    const del = document.createElement("button"); del.className = "wide"; del.textContent = "⌫"; del.onclick = () => inputEl.value = inputEl.value.slice(0, -1); kb.appendChild(del);
    const go = document.createElement("button"); go.className = "wide"; go.textContent = "GO →"; go.style.background = "#fff"; go.style.color = "var(--red)"; go.onclick = () => onSubmit(inputEl.value); kb.appendChild(go);
    return kb;
  },
};
// Install to the kiosk's home screen: Chrome offers it once per page (beforeinstallprompt). Staff only: the button shows
// on the PIN and station-picker screens, never to guests. If Chrome does not offer it, use Chrome menu > Add to Home screen.
{
  let offer = null, btn = null;
  const staffScreen = () => !!document.querySelector("#s-pin.on, #s-pick.on");
  const paint = () => { if (btn) btn.style.display = offer && staffScreen() ? "block" : "none"; };
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); offer = e;
    if (!btn) {
      btn = document.createElement("button"); btn.id = "k-install"; btn.type = "button"; btn.textContent = "Add to home screen";
      btn.style.cssText = "position:fixed;right:3vmin;bottom:9vmin;z-index:200;display:none;padding:2vmin 3.4vmin;border-radius:10vmin;border:.4vmin solid #fff;background:#1F1A1A;color:#fff;font:800 2.6vmin Poppins,system-ui,sans-serif;box-shadow:0 1vmin 0 #000,0 2vmin 3vmin rgba(0,0,0,.35)";
      btn.onclick = async () => { if (!offer) return; offer.prompt(); try { await offer.userChoice; } catch {} offer = null; paint(); };
      document.body.appendChild(btn);
    }
    paint();
  });
  window.addEventListener("appinstalled", () => { offer = null; paint(); });
  document.addEventListener("screen", paint);
}
// Global keyboard: Enter submits visible code inputs; Esc goes home; F = fullscreen; S = settings
document.addEventListener("keydown", (e) => {
  if (e.key === "f" && !e.target.matches("input,select,textarea")) { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => {}); }
  if (e.key === "Escape") document.dispatchEvent(new CustomEvent("kiosk-home"));
});

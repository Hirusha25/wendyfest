// Shared kiosk logic: PIN gate, screen router, code keypad, idle timers.
window.K = {
  pin: null,
  station: localStorage.getItem("wf_station") || "A",
  show(id) { document.querySelectorAll(".screen").forEach((s) => s.classList.toggle("on", s.id === id)); document.dispatchEvent(new CustomEvent("screen", { detail: id })); },
  async api(path, body) {
    const r = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, station: K.station }) });
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
// Global keyboard: Enter submits visible code inputs; Esc goes home; F = fullscreen; S = settings
document.addEventListener("keydown", (e) => {
  if (e.key === "f" && !e.target.matches("input,select,textarea")) { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => {}); }
  if (e.key === "Escape") document.dispatchEvent(new CustomEvent("kiosk-home"));
});

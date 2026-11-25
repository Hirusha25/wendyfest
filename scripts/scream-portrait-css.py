"""Upright (1080 x 1920) layout for the Scream & Win kiosk.

Writes one generated `@media (orientation: portrait)` block into public/kiosk/scream.html, between the
SCREAM-PORTRAIT markers at the end of its <style>. Edit the rules here, then run:

    python scripts/scream-portrait-css.py public/kiosk/scream.html

In the rules a number followed by `u` (for example 120u) becomes calc(120 * var(--u)); in the upright layout one
unit is one pixel of the 1080 x 1920 canvas. Every rule is !important so it beats the wide layout's inline styles.
"""
import io, re, sys

RULES = []
def rule(sel, decl): RULES.append((sel, decl))

# canvas and chrome
rule(":root", "--u:min(calc(100vw / 1080), calc(100vh / 1920)); --v:calc(var(--u) * 1.34)")
rule(".hdr", "padding:0 56u")
rule(".brand", "gap:26u")
rule(".step", "font-size:24u; gap:20u")
rule(".stripeB, .track6", "top:calc(105 * var(--v))")
rule(".foot", "height:60u; padding:0 56u; font-size:18u")
rule(".foot .c img", "height:32u")
rule(".screen", "bottom:60u")
rule(".idle.on", "top:calc(105 * var(--v)); bottom:60u")
rule(".texB i.tr", "top:calc(105 * var(--v) + 20u)")
rule(".texB i.bl", "bottom:60u")
rule(".idle .box, .bx .box", "width:1080u")
rule(".bx .btn", "font-size:52u")
rule(".bx .btn::after", "width:70u; height:70u; right:36u")
rule(".bx .pillx", "font-size:28u")

# 1 welcome
rule(".idle .box", "height:1560u")
rule(".idle .left", "left:0; top:70u; width:1080u; justify-items:center; text-align:center")
rule(".idle .eyebrow", "font-size:26u; margin-left:0; justify-content:center")
rule(".idle .h1", "font-size:214u; margin-top:26u")
rule(".idle .sub", "font-size:54u; margin-top:36u")
rule(".idle .qrcard", "left:315u; top:640u; width:450u; height:486u; padding:26u 26u 20u; border-radius:30u")
rule(".idle .qrcard img", "width:370u; height:370u")
rule(".idle .qrcard b", "font-size:28u")
rule(".idle .cta-wrap", "left:110u; top:1190u")
rule(".idle .btn", "width:860u; height:130u; font-size:52u")
rule(".idle .btn::after", "width:70u; height:70u")
rule(".idle canvas.wave", "left:0; width:1080u; height:230u")

# 2 code
rule("#s-code .box", "height:1500u")
rule("#s-code .box > .abs:first-child", "left:0; top:30u; width:1080u; text-align:center")
rule("#s-code .sub2", "left:0; width:1080u; top:200u; font-size:36u")
rule(".boxes", "left:80u; top:340u; gap:16u")
rule(".boxes i", "width:140u; height:176u; font-size:104u; border-radius:16u; border-width:4u")
rule(".boxes i.cur:empty::after", "height:88u; width:5u")
rule("#s-code .msg", "left:0; width:1080u; top:540u; font-size:28u")
rule(".kbd", "left:40u; top:620u; width:1000u; gap:16u")
rule(".kbd .krow", "height:104u; gap:8u")
rule(".kbd .krow.r2", "padding:0 50u")
rule(".kbd button", "font-size:44u; border-radius:14u")
rule(".kbd button svg", "width:50u; height:50u")
rule(".kbd .shift", "flex:0 0 136u")
rule(".kbd .bksp", "flex:0 0 136u")
rule(".kbd .num", "flex:0 0 200u; font-size:36u")
rule(".kbd .space", "font-size:36u")
rule("#code-go", "left:110u; top:1150u; width:860u; height:130u")
rule("#s-code .ask", "left:0; width:1080u; top:1350u; font-size:32u")

# 3 mic check
rule("#s-ready .box", "height:1200u")
rule("#s-ready .crow:first-child", "top:40u")
rule("#s-ready .sub2", "top:250u; font-size:56u; line-height:1.25")
rule("#s-ready .sub2 span", "max-width:900u; white-space:normal")
rule("#wave-ready", "left:60u; top:480u; width:960u; height:230u")
rule("#mic-pill", "top:790u; height:78u; padding:0 40u; font-size:28u; white-space:nowrap")
rule("#go", "left:110u; top:960u; width:860u; height:130u")

# 4 countdown
rule("#go-count", "height:1460u")
rule("#go-count .t", "left:0; top:30u; width:1080u; text-align:center; line-height:.92")
rule("#go-count .rule", "left:490u; top:300u")
rule(".dots", "left:0; width:1080u; text-align:center; top:340u; font-size:54u")
rule("#ring-count", "left:40u; top:430u; width:1000u; height:1000u")
rule("#cnt", "left:0; width:1080u; top:720u; font-size:420u")
rule("#cd-burst", "left:800u; top:560u; width:110u; height:110u")

# 5 live meter (the gauge and the wave are drawn by drawLiveA, which has its own upright geometry)
rule("#go-meter", "height:1480u")
rule("#live-cv", "width:1080u; height:1480u")
rule("#go-meter .crow", "top:20u")
rule("#listen-wendy", "left:56u; top:190u; width:120u")
rule("#go-meter .pillx#listen-pill", "left:196u; top:212u; height:72u; padding:0 32u; font-size:28u")
rule("#target", "left:790u; top:212u; height:72u; padding:0 30u; font-size:28u")
rule("#target b", "font-size:40u")
rule("#gauge-num", "left:290u; width:500u; top:545u; font-size:230u")
rule("#go-meter .lbl", "left:340u; width:400u; top:790u; font-size:28u")
rule("#live-burst", "left:730u; top:500u; width:90u; height:90u")
rule("#go-meter .heard", "left:60u; top:1270u; width:580u")
rule("#go-meter .heard small", "font-size:26u")
rule("#go-meter .heard b", "font-size:46u; max-width:580u")
rule("#go-meter .tleft", "left:720u; top:1270u; gap:14u")
rule("#go-meter .tleft .v b", "font-size:88u")
rule("#go-meter .tleft .v small", "font-size:30u")
rule("#go-meter .tbar", "width:300u; height:14u")

# host call
rule("#s-judge .display", "font-size:9vmin; line-height:1")
rule(".judge", "display:grid; gap:3.4vmin; justify-items:center")
rule(".judge .btn", "width:78vmin; height:12vmin; font-size:4vmin; justify-content:center")

# 6 result
rule("#s-result .box", "height:1580u")
rule("#res-title", "left:60u; top:30u; width:960u; text-align:center; font-size:96u")
rule("#res-score", "left:0; width:1080u; top:260u; font-size:380u")
rule("#s-result .spark", "left:800u; top:270u; width:104u; height:104u")
rule("#res-eyebrow", "left:0; width:1080u; top:660u; font-size:36u")
rule("#s-result .vdiv", "left:140u; top:750u; width:800u; height:3u")
rule("#res-coupon", "left:110u; top:800u; width:860u; justify-items:center")
rule("#res-coupon .lbl", "margin-left:0; font-size:36u")
rule("#s-result #res-code", "width:860u; height:132u; font-size:62u; padding-left:90u")
rule("#res-coupon small", "width:860u; font-size:28u")
rule("#s-result #res-detail", "left:90u; top:790u; width:900u; gap:30u")
rule("#s-result #res-detail.sassy", "top:780u; gap:22u")
rule("#res-detail .quip", "font-size:40u; text-align:center")
rule("#res-detail.sassy .quip", "font-size:34u")
rule("#res-detail .stats", "padding:28u 32u; gap:20u; border-radius:24u")
rule("#res-detail .st", "grid-template-columns:220u 1fr 92u; gap:22u")
rule("#res-detail .st small", "font-size:26u")
rule("#res-detail .st i", "height:20u")
rule("#res-detail .st b", "font-size:46u")
rule("#res-detail .wl", "font-size:21u")
rule("#s-result .qrcard", "left:90u; top:1250u; width:260u; height:322u; padding:22u 0 0")
rule("#qr-profile", "width:200u; height:200u")
rule("#qr-label", "font-size:26u")
rule("#s-result .btn", "left:390u; top:1345u; width:600u; height:130u")

START, END = "/* SCREAM-PORTRAIT:START (generated by scripts/scream-portrait-css.py, do not edit by hand) */", "/* SCREAM-PORTRAIT:END */"

def css():
    out = [START, "@media (orientation: portrait) {"]
    for sel, decl in RULES:
        parts = []
        for d in [x.strip() for x in decl.split(";") if x.strip()]:
            d = re.sub(r"(?<![\w.#-])(-?\d+(?:\.\d+)?)u\b", r"calc(\1 * var(--u))", d)
            parts.append(d if sel == ":root" else d + " !important")
        out.append("  " + sel + " { " + "; ".join(parts) + "; }")
    out += ["}", END]
    return "\r\n".join(out) + "\r\n"

def main(path):
    s = io.open(path, encoding="utf-8", newline="").read()
    if START in s:
        a, b = s.index(START), s.index(END) + len(END)
        while s[b:b + 1] in "\r\n": b += 1
        s = s[:a] + css() + s[b:]
    else:
        i = s.index("</style>"); s = s[:i] + css() + s[i:]
    io.open(path, "w", encoding="utf-8", newline="").write(s)
    print("wrote", len(RULES), "rules")

if __name__ == "__main__":
    main(sys.argv[1])

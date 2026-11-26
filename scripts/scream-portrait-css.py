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
rule(".idle .box", "height:1700u")
rule(".idle .left", "left:0; top:40u; width:1080u; justify-items:center; text-align:center")
rule(".idle .eyebrow", "font-size:30u; margin-left:0; justify-content:center")
rule(".idle .h1", "font-size:236u; margin-top:26u")
rule(".idle .sub", "font-size:60u; margin-top:40u")
rule(".idle .qrcard", "left:262u; top:668u; width:556u; height:600u; padding:30u 30u 22u; border-radius:36u")
rule(".idle .qrcard img", "width:470u; height:470u")
rule(".idle .qrcard b", "font-size:34u")
rule(".idle .cta-wrap", "left:90u; top:1326u; z-index:3")
rule(".idle .btn", "width:900u; height:156u; font-size:62u")
rule(".idle .btn::after", "width:84u; height:84u")
rule(".idle canvas.wave", "left:0; width:1080u; height:250u; pointer-events:none; z-index:0")

# 2 code
rule("#s-code .box", "height:1640u")
rule("#s-code .box > .abs:first-child", "left:0; top:40u; width:1080u; text-align:center")
rule("#s-code .sub2", "left:0; width:1080u; top:236u; font-size:44u")
rule(".boxes", "left:32u; top:410u; gap:16u")
rule(".boxes i", "width:156u; height:200u; font-size:120u; border-radius:18u; border-width:4u")
rule(".boxes i.cur:empty::after", "height:100u; width:6u")
rule("#s-code .msg", "left:0; width:1080u; top:634u; font-size:32u")
rule(".kbd", "left:30u; top:700u; width:1020u; gap:18u")
rule(".kbd .krow", "height:128u; gap:9u")
rule(".kbd .krow.r2", "padding:0 52u")
rule(".kbd button", "font-size:54u; border-radius:16u")
rule(".kbd button svg", "width:60u; height:60u")
rule(".kbd .shift", "flex:0 0 146u")
rule(".kbd .bksp", "flex:0 0 146u")
rule(".kbd .num", "flex:0 0 220u; font-size:42u")
rule(".kbd .space", "font-size:42u")
rule("#code-go", "left:90u; top:1334u; width:900u; height:156u")
rule("#s-code .ask", "left:0; width:1080u; top:1556u; font-size:38u")

# 3 mic check
rule("#s-ready .box", "height:1560u")
rule("#s-ready .crow:first-child", "top:40u; line-height:.9")
rule("#s-ready .sub2", "top:470u; font-size:64u; line-height:1.25")
rule("#s-ready .sub2 span", "max-width:980u; white-space:normal")
rule("#wave-ready", "left:40u; top:700u; width:1000u; height:380u")
rule("#mic-pill", "top:1150u; height:96u; padding:0 48u; font-size:34u; white-space:nowrap")
rule("#go", "left:90u; top:1320u; width:900u; height:156u")
rule("br.up", "display:inline")

# 4 countdown
rule("#go-count", "height:1660u")
rule("#go-count .t", "left:0; top:30u; width:1080u; text-align:center; line-height:.92")
rule("#go-count .rule", "left:470u; top:392u; width:140u")
rule(".dots", "left:0; width:1080u; text-align:center; top:432u; font-size:70u")
rule("#ring-count", "left:0; top:540u; width:1080u; height:1080u")
rule("#cnt", "left:0; width:1080u; top:790u; font-size:580u")
rule("#cd-burst", "left:830u; top:760u; width:130u; height:130u")

# 5 live meter (the gauge and the wave are drawn by drawLiveA, which has its own upright geometry)
rule("#go-meter", "height:1660u")
rule("#live-cv", "width:1080u; height:1660u")
rule("#go-meter .crow", "top:20u; line-height:.9")
rule("#listen-wendy", "left:40u; top:400u; width:130u")
rule("#go-meter .pillx#listen-pill", "left:186u; top:424u; height:80u; padding:0 34u; font-size:30u")
rule("#target", "left:780u; top:424u; height:80u; padding:0 32u; font-size:30u")
rule("#target b", "font-size:44u")
rule("#gauge-num", "left:240u; width:600u; top:810u; font-size:290u")
rule("#go-meter .lbl", "left:340u; width:400u; top:1106u; font-size:32u")
rule("#live-burst", "left:770u; top:770u; width:100u; height:100u")
rule("#go-meter .heard", "left:60u; top:1500u; width:580u")
rule("#go-meter .heard small", "font-size:30u")
rule("#go-meter .heard b", "font-size:54u; max-width:580u")
rule("#go-meter .tleft", "left:700u; top:1490u; gap:14u")
rule("#go-meter .tleft .v b", "font-size:100u")
rule("#go-meter .tleft .v small", "font-size:34u")
rule("#go-meter .tbar", "width:320u; height:16u")

# host call
rule("#s-judge .display", "font-size:11.5vmin; line-height:1")
rule(".judge", "display:grid; gap:4.2vmin; justify-items:center; margin-top:3vmin")
rule(".judge .btn", "width:86vmin; height:15vmin; font-size:5vmin; justify-content:center")

# 6 result
rule("#s-result .box", "height:1700u")
rule("#res-title", "left:40u; top:30u; width:1000u; text-align:center; font-size:124u")
rule("#res-score", "left:0; width:1080u; top:310u; font-size:450u")
rule("#s-result .spark", "left:830u; top:330u; width:120u; height:120u")
rule("#res-eyebrow", "left:0; width:1080u; top:790u; font-size:42u")
rule("#s-result .vdiv", "left:110u; top:890u; width:860u; height:3u")
rule("#res-coupon", "left:90u; top:940u; width:900u; justify-items:center")
rule("#res-coupon .lbl", "margin-left:0; font-size:42u")
rule("#s-result #res-code", "width:900u; height:160u; font-size:76u; padding-left:96u")
rule("#res-coupon small", "width:900u; font-size:33u")
rule("#s-result #res-detail", "left:70u; top:930u; width:940u; gap:32u")
rule("#s-result #res-detail.sassy", "top:905u; gap:18u")
rule("#res-detail .quip", "font-size:46u; text-align:center")
rule("#res-detail.sassy .quip", "font-size:37u")
rule("#res-detail .stats", "padding:34u 38u; gap:26u; border-radius:28u")
rule("#res-detail .st", "grid-template-columns:250u 1fr 110u; gap:24u")
rule("#res-detail .st small", "font-size:30u")
rule("#res-detail .st i", "height:26u")
rule("#res-detail .st b", "font-size:56u")
rule("#res-detail .wl", "font-size:24u")
rule("#s-result .qrcard", "left:70u; top:1330u; width:300u; height:370u; padding:24u 0 0")
rule("#qr-profile", "width:236u; height:236u")
rule("#qr-label", "font-size:29u")
rule("#s-result .btn", "left:410u; top:1436u; width:600u; height:156u")

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

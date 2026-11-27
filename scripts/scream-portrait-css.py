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
# soft rays behind every upright screen (owner picked "S2 soft rays", Nov 2026): very light, fades out at the centre and the edges
rule(".screen.on::before", "content:''; position:absolute; inset:0; pointer-events:none; z-index:0; background:repeating-conic-gradient(from 0deg at 50% 46%, rgba(255,255,255,.055) 0 6deg, transparent 6deg 12deg); -webkit-mask:radial-gradient(circle at 50% 46%, transparent 0 260u, #000 520u, transparent 1150u); mask:radial-gradient(circle at 50% 46%, transparent 0 260u, #000 520u, transparent 1150u)")
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
rule(".boxes", "left:0; width:1080u; justify-content:center; top:410u; gap:16u")   # five boxes and a dash, centred
rule(".boxes .dash", "font-size:90u")
rule(".boxes i", "width:156u; height:200u; font-size:120u; border-radius:18u; border-width:4u")
rule(".boxes i.cur:empty::after", "height:100u; width:6u")
rule("#s-code .msg", "left:0; width:1080u; top:634u; font-size:32u")
rule(".kbd", "left:30u; top:690u; width:1020u; gap:14u; grid-auto-rows:136u")   # the two-step pad: numbers, then letters
rule(".kbd button.n", "box-shadow:0 8u 0 #B5A88F")
rule(".kbd .krow", "height:128u; gap:9u")
rule(".kbd .krow.r2", "padding:0 52u")
rule(".kbd button", "font-size:64u; border-radius:16u")
rule(".kbd button svg", "width:60u; height:60u")
rule(".kbd .shift", "flex:0 0 146u")
rule(".kbd .bksp", "flex:0 0 146u")
rule(".kbd .num", "flex:0 0 220u; font-size:42u")
rule(".kbd .space", "font-size:42u")
rule("#code-go", "left:380u; top:1300u; width:670u; height:150u")
rule("#code-del", "left:30u; top:1300u; width:330u; height:150u; font-size:40u")   # Delete sits beside Continue, not in the pad (owner)
rule("#s-code .ask", "left:0; width:1080u; top:1556u; font-size:38u")

# 3 mic check
rule("#s-ready .box", "height:1560u")
rule("#s-ready .crow:first-child", "top:40u; line-height:.9; text-align:center")
rule("#s-ready .rn", "color:#E8323C; text-shadow:0 3u 0 #F6F0E6, 0 7u 0 #7A0F16, 0 16u 26u rgba(0,40,70,.4)")
rule("#s-ready .crow:first-child .t", "display:inline-block; text-align:center")
rule("#s-ready .sub2", "top:470u; font-size:64u; line-height:1.25")
rule("#s-ready .sub2 span", "max-width:980u; white-space:normal")
rule("#wave-ready", "left:40u; top:700u; width:1000u; height:380u")
rule("#mic-pill", "top:1150u; height:96u; padding:0 48u; font-size:34u; white-space:nowrap")
rule("#go", "left:90u; top:1320u; width:900u; height:156u")
rule("br.up", "display:inline")
rule(".up-only", "display:block")
rule(".beats", "display:flex")
rule(".up-in", "display:inline")
rule(".wide-in", "display:none")

# 4 countdown
rule("#go-count", "height:1660u")
rule("#go-count .t", "left:0; top:40u; width:1080u; text-align:center; line-height:.86")
rule("#go-count .rule", "display:none")
rule(".dots", "left:0; width:1080u; text-align:center; top:612u; font-size:54u")
rule("#ring-count", "left:90u; top:676u; width:900u; height:900u")
rule("#cnt", "left:0; width:1080u; top:876u; font-size:480u")
rule("#cd-burst", "left:800u; top:866u; width:120u; height:120u")
rule("#cd-ribbon", "left:110u; top:468u; width:860u; height:108u; line-height:102u; font-size:50u; background:linear-gradient(180deg, #F0434C 0%, #D8232D 50%, #A9161F 100%); box-shadow:0 10u 0 #7E0F16, 0 22u 30u rgba(0,30,60,.3)")
rule("#cd-shout", "display:none")   # removed: the live screen says it again straight after (owner)
rule("#cd-shout small", "font-size:28u")
rule("#cd-shout b", "display:block; margin-top:18u; font-size:98u")

# 5 live meter (the gauge and the wave are drawn by drawLiveA, which has its own upright geometry)
rule("#go-meter", "height:1660u")
rule("#live-cv", "width:1080u; height:1660u")
rule("#go-meter .crow", "top:128u; line-height:.9")
rule("#listen-wendy", "left:40u; top:266u; width:96u")   # Listening and Target are lifted clear of the meter (owner)
rule("#go-meter .pillx#listen-pill", "left:150u; top:278u; height:62u; padding:0 28u; font-size:24u")
rule("#target", "left:812u; top:278u; height:62u; padding:0 26u; font-size:25u")
rule("#target b", "font-size:40u")
rule("#gauge-num", "left:290u; width:500u; top:582u; font-size:230u")
rule("#go-meter .lbl", "left:340u; width:400u; top:826u; font-size:27u")
rule("#live-burst", "left:735u; top:548u; width:90u; height:90u")
# the bottom of the live screen is three slanted ribbons, like the countdown ribbon (owner picked option J): cream Hold it, blue We heard, red clock
rule("#go-meter .heard", "left:40u; top:1388u; width:560u; height:130u; box-sizing:border-box; padding:0 40u 0 60u; display:flex; align-items:center; gap:24u; border:0; border-radius:0; background:linear-gradient(180deg, #23B4F0 0%, #0A7FBC 86%, #064A70 86%); clip-path:polygon(4% 0, 100% 0, 96% 100%, 0 100%)")
rule("#go-meter .heard small", "font-size:24u; color:#FFE08A; white-space:nowrap")
rule("#go-meter .heard b", "font-size:44u; max-width:330u; color:#fff")
rule("#go-meter .tleft", "left:580u; top:1388u; width:460u; height:130u; box-sizing:border-box; padding:14u 50u 0 60u; gap:8u; border:0; border-radius:0; background:linear-gradient(180deg, #F0434C 0%, #B81B24 86%, #7E0F16 86%); clip-path:polygon(5% 0, 100% 0, 95% 100%, 0 100%); align-items:stretch")
rule("#go-meter .tleft .v b", "font-size:66u; color:#F6F0E6; text-shadow:0 4u 0 #7E0F16")
rule("#go-meter .tleft .v small", "font-size:24u; color:#FFE08A")
rule("#go-meter .tbar", "width:auto; height:12u; background:rgba(0,0,0,.28)")
rule("#go-meter .tbar i", "background:linear-gradient(90deg, #FFE9A8, #F6B93B)")
rule("#beats", "left:0; top:26u; width:1080u; gap:18u")   # air under the header
# the three step chips: beige, the active one outlined in red, finished ones red (owner)
rule("#beats span", "background:#F6F0E6; color:#1F1A1A; border-color:#F6F0E6")
rule("#beats span i", "background:#1F1A1A; color:#F6F0E6")
rule("#beats span.on", "background:#F6F0E6; color:#D8232D; border-color:#D8232D; box-shadow:0 0 0 5u rgba(216,35,45,.35), 0 6u 0 #8E1219")
rule("#beats span.on i", "background:#D8232D; color:#fff")
rule("#beats span.done", "background:#D8232D; color:#fff; border-color:#F6F0E6")
rule("#beats span.done i", "background:#F6F0E6; color:#D8232D")
rule("#beats span", "height:70u; padding:0 30u 0 12u; gap:14u; font-size:27u")
rule("#beats span i", "width:46u; height:46u; font-size:24u")
rule("#hold-word", "left:0; top:1052u; width:1080u; font-size:88u")
rule(".holdcard", "left:40u; top:1198u; width:1000u; height:166u; padding:20u 70u 0 80u; border:0; border-radius:0; background:linear-gradient(180deg, #FFFBF3 0%, #EADFCB 86%, #B5A88F 86%); clip-path:polygon(2.4% 0, 100% 0, 97.6% 100%, 0 100%); box-shadow:none")
rule(".holdcard .top b", "font-size:34u; color:#0A6FA6")
rule(".holdcard .top > span", "font-size:66u; color:#D8232D; text-shadow:0 4u 0 rgba(126,15,22,.3)")
rule(".holdcard .hbar", "height:30u; margin-top:6u; background:#D9CDB6; box-shadow:inset 0 0 0 2u rgba(30,27,27,.18)")
rule(".holdcard .hbar i", "background:linear-gradient(90deg, #FF6A72, #D8232D)")
rule(".holdcard .bot", "display:none")
rule(".holdcard .bot small", "font-size:23u")

# host call
rule("#s-judge .display", "font-size:11.5vmin; line-height:1")
rule(".judge", "display:grid; gap:4.2vmin; justify-items:center; margin-top:3vmin")
rule(".judge .btn", "width:86vmin; height:15vmin; font-size:5vmin; justify-content:center")

# 6 result
rule("#s-result .box", "height:1700u")
rule("#res-title", "left:40u; top:74u; width:1000u; text-align:center; font-size:124u")   # lowered: it sat too close to the header (owner)
rule("#res-score", "left:0; width:1080u; top:306u; font-size:410u; transform:perspective(1500u) rotateY(-16deg) rotateX(8deg); text-shadow:1.1u 1.1u 0 #B01820, 2.2u 2.2u 0 #B01820, 3.3u 3.3u 0 #B01820, 4.4u 4.4u 0 #B01820, 5.5u 5.5u 0 #B01820, 6.6u 6.6u 0 #B01820, 7.7u 7.7u 0 #B01820, 8.8u 8.8u 0 #B01820, 9.9u 9.9u 0 #B01820, 11.0u 11.0u 0 #B01820, 12.1u 12.1u 0 #B01820, 13.2u 13.2u 0 #B01820, 14.3u 14.3u 0 #B01820, 15.4u 15.4u 0 #B01820, 16.5u 16.5u 0 #B01820, 17.6u 17.6u 0 #B01820, 18.7u 18.7u 0 #B01820, 19.8u 19.8u 0 #B01820, 20.9u 20.9u 0 #B01820, 22.0u 22.0u 0 #B01820, 23.1u 23.1u 0 #B01820, 24.2u 24.2u 0 #B01820, 25.3u 25.3u 0 #B01820, 26.4u 26.4u 0 #B01820, 27.5u 27.5u 0 #B01820, 28.6u 28.6u 0 #B01820, 46u 60u 50u rgba(0,25,50,.5)")
rule("#s-result .spark", "left:830u; top:330u; width:120u; height:120u")
rule("#res-eyebrow", "left:0; width:1080u; top:744u; font-size:42u")
rule("#s-result .vdiv", "left:110u; top:842u; width:860u; height:3u")
rule("#res-coupon", "left:90u; top:900u; width:900u; justify-items:center")
rule("#res-coupon .lbl", "margin-left:0; font-size:42u")
rule("#s-result #res-code", "width:900u; height:160u; font-size:76u; padding-left:96u")
rule("#res-coupon small", "width:900u; font-size:33u")
rule("#s-result #res-detail", "left:70u; top:842u; width:940u; gap:40u")
rule("#s-result #res-detail.sassy", "top:842u; gap:36u")
rule("#res-detail .quip", "position:relative; display:block; margin-bottom:38u; background:#F6F0E6; color:#1F1A1A; text-shadow:none; border-radius:34u; padding:26u 36u 26u 168u; min-height:112u; text-align:left; font-size:42u; line-height:1.18; box-shadow:0 10u 0 rgba(0,35,60,.4), 0 24u 40u rgba(0,30,60,.3)")
rule("#res-detail .quip::before", "content:''; position:absolute; left:26u; top:50%; width:116u; height:116u; margin-top:-58u; border-radius:50%; background:#fff url(../assets/cameo.png) center/cover; box-shadow:0 0 0 6u #D8232D")
rule("#res-detail.sassy .quip", "font-size:38u")
rule("#res-detail .stats", "padding:24u 38u; gap:16u; border-radius:28u")
rule("#res-detail .st", "grid-template-columns:250u 1fr 110u; gap:24u")
rule("#res-detail .st small", "font-size:30u")
rule("#res-detail .st i", "height:26u")
rule("#res-detail .st b", "font-size:56u")
rule("#res-detail .wl", "font-size:24u")
rule("#s-result .qrcard", "left:70u; top:1318u; width:940u; height:214u; padding:18u 40u 18u 22u; display:grid; grid-template-columns:178u 1fr; align-items:center; justify-items:start; gap:44u; border-radius:26u; box-shadow:0 10u 0 rgba(0,35,60,.4), 0 24u 40u rgba(0,30,60,.3); -webkit-mask:radial-gradient(circle 20u at 232u 0, transparent 98%, #000) top/100% 51% no-repeat, radial-gradient(circle 20u at 232u 100%, transparent 98%, #000) bottom/100% 51% no-repeat; mask:radial-gradient(circle 20u at 232u 0, transparent 98%, #000) top/100% 51% no-repeat, radial-gradient(circle 20u at 232u 100%, transparent 98%, #000) bottom/100% 51% no-repeat; background-image:linear-gradient(#C9BFAE 60%, transparent 0); background-size:3u 16u; background-repeat:repeat-y; background-position:231u 0")
rule("#qr-profile", "width:178u; height:178u")
rule("#qr-label", "font-size:46u; text-align:left; line-height:1.08; letter-spacing:.04em")
rule("#qr-label::after", "content:'Point your phone camera here'; width:auto; height:auto; background:none; margin:10u 0 0; font:600 27u/1.2 Poppins, sans-serif; letter-spacing:0; text-transform:none; color:#B01820")
rule("#s-result .btn", "left:70u; top:1552u; width:940u; height:124u")   # kept clear of the footer (owner)
# winner's screen (the new design): shown only when a coupon was won; it replaces the old title, score, code box and QR card
rule("#s-result .box:not(.wonc) #win-new", "display:none")
rule("#s-result .box.wonc > #res-title, #s-result .box.wonc > #res-score, #s-result .box.wonc > #res-eyebrow, #s-result .box.wonc > .spark, #s-result .box.wonc > .vdiv, #s-result .box.wonc > #res-coupon, #s-result .box.wonc > #res-detail, #s-result .box.wonc > .qrcard", "display:none")
rule("#s-result .box.wonc .btn", "top:1508u; height:128u")

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

"""Builds the upright-screen (portrait) CSS block for public/kiosk/roast.html and inserts it.
Usage: python scripts/roast-portrait-css.py public/kiosk/roast.html  (edit the rules below, then re-run; do not hand-edit the block in the page).
Numbers followed by 'u' are canvas units on the 1080 x 1920 portrait canvas."""
import re, sys

def P(*pts):
    return "polygon(" + ", ".join(f"{x}u {y}u" for x, y in pts) + ")"

def M(*pts):
    """Region between a top edge (0,a)->(1080,b) and a bottom edge (0,d)->(1080,c); slanted edges are drawn as a soft swoosh."""
    (_, a), (_, b), (_, c), (_, d) = pts
    k1, k2 = round(.3 * abs(a - b)), round(.3 * abs(d - c))
    path = f"M0 {a}C380 {a} 700 {b + k1} 1080 {b}L1080 {c}C700 {c + k2} 380 {d} 0 {d}Z"
    url = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1080 1920' preserveAspectRatio='none'%3E%3Cpath d='" + path + "'/%3E%3C/svg%3E\")"
    return f"clip-path:none; -webkit-mask:{url} 0 0 / 100% 100% no-repeat; mask:{url} 0 0 / 100% 100% no-repeat"

R = []  # (selector, declarations)
def rule(sel, decl): R.append((sel, decl))

BOTH = ":is(#s-idle, .chrome)"
rule(":root", "--p:min(calc(100vw / 1080), calc(100vh / 1920))")
# kiosk.css has an older scrolling fallback for upright screens; this page has a real upright layout, so switch that off here
rule("html, body.roast-kiosk", "overflow:hidden")
rule(".roast-kiosk .stage", "height:100vh; min-height:0; display:grid; padding:0")
rule(".roast-kiosk .stage > .screen", "position:absolute; inset:0; min-height:0; padding:0")
rule(".roast-kiosk .lang-pick", "flex-wrap:nowrap")
rule("#s-idle .s, .chrome .s, .cv .s", "width:1080u; height:1920u")
rule(f"{BOTH} .s", "background:radial-gradient(circle, rgba(255,255,255,.035) 1.2u, transparent 1.6u) 0 0 / 14u 14u, linear-gradient(168deg, #1D1A1A 0%, #121010 48%, #0A0909 100%)")
rule(f"{BOTH} .hd", "height:150u; padding:0 48u 0 54u")
rule(f"{BOTH} .hd .brand", "gap:26u"); rule(f"{BOTH} .hd .brand img", "height:70u"); rule(f"{BOTH} .hd .brand i", "height:56u")
rule(f"{BOTH} .hd .wf .w1, {BOTH} .hd .wf .w2", "font-size:44u")
rule(f"{BOTH} .hd .stp", "gap:18u; font-size:26u"); rule(f"{BOTH} .hd .stp i", "width:62u; height:62u; font-size:34u")
rule(f"{BOTH} .strp", "top:150u")
rule(f"{BOTH} .ft", "height:60u; padding:0 48u 0 54u; font-size:18u"); rule(f"{BOTH} .ft .lk", "display:none"); rule(f"{BOTH} .ft .c img", "height:30u")
# subtle halftone dots on the dark top, fading from the top-right corner
DOTMASK = "radial-gradient(ellipse 46% 26% at 100% 22%, #000 0, rgba(0,0,0,.6) 45%, transparent 100%)"
rule(f"{BOTH} .dots", f"clip-path:none; background:radial-gradient(circle, rgba(227,32,43,.85) 4u, transparent 4.8u) 0 0 / 22u 22u; -webkit-mask:{DOTMASK}; mask:{DOTMASK}")
rule("#s-idle .band, .chrome .band", "background:linear-gradient(90deg, #FFFFFF 0%, #F4EEE4 100%)")
rule(".chrome .panel, #s-idle .panel", "background:linear-gradient(172deg, #E3252F 0%, #CD2028 48%, #B01A22 100%)")
# subtle white dots on the red, fading in from the bottom-right and the left edge
REDDOTS = "radial-gradient(ellipse 60% 34% at 100% 100%, #000 0, rgba(0,0,0,.55) 45%, transparent 100%), radial-gradient(ellipse 34% 22% at 0% 62%, rgba(0,0,0,.7) 0, transparent 100%)"
rule(".chrome .panel::after", f"background:radial-gradient(circle, rgba(255,255,255,.2) 4u, transparent 4.8u) 0 0 / 24u 24u; -webkit-mask:{REDDOTS}; mask:{REDDOTS}")
rule("#s-idle .art, .cv .art", "background:radial-gradient(circle at 0% 97%, #D2242C 0 21%, transparent 21.2%), radial-gradient(circle at 104% 99%, #C41E26 0 15%, transparent 15.2%), #fff")
rule(".cv .art img", "max-width:none; right:auto; bottom:auto")

# 1 welcome
rule("#s-idle .panel", "display:none")
rule("#s-idle .band", M((0, 1120), (1080, 830), (1080, 870), (0, 1160)))
rule("#s-idle .art", M((0, 1160), (1080, 870), (1080, 1860), (0, 1860)))
rule("#s-idle .art .wd", "left:-70u; right:auto; top:664u; bottom:auto; width:1220u; height:1220u")
# white outline so her hair reads against the red corner behind it
rule("#s-idle .art .wd", "filter:drop-shadow(7u 0 0 #fff) drop-shadow(-7u 0 0 #fff) drop-shadow(0 7u 0 #fff) drop-shadow(0 -7u 0 #fff)")
rule("#s-idle .title", "left:54u; top:250u; font-size:240u")
rule("#s-idle .sub", "left:62u; top:676u; font-size:44u")
rule("#s-idle .qr", "left:62u; top:822u; width:170u; height:170u")
rule("#s-idle .qdiv", "left:256u; top:842u; height:130u")
rule("#s-idle .qtxt", "left:282u; top:848u; font-size:23u")
rule("#s-idle .cta", "left:170u; top:1722u; width:740u; height:118u; padding:0 40u 0 46u; overflow:hidden; animation:ctaGlow 3.2s ease-in-out infinite")
rule("#s-idle .cta b", "font-size:58u; white-space:nowrap"); rule("#s-idle .cta b br", "display:none"); rule("#s-idle .cta svg", "width:70u; height:70u")
rule("#s-idle .dots", "animation:dotGlow 5s ease-in-out infinite")
rule("#s-idle .title .l2", "animation:redGlow 5s ease-in-out infinite")

# a thin red line running along the cream divider, like the stripe under the header
REDLINE = "display:block; inset:0; z-index:2; background:#E3202B"
def redline(left, right):
    (_, a), (_, b) = left, right
    return M((0, a + 13), (1080, b + 13), (1080, b + 24), (0, a + 24))
rule("#s-idle .band2", REDLINE + "; " + redline((0, 1120), (1080, 830)))
def chrome(scr, band, panel):
    rule(f'.chrome[data-scr="{scr}"] .band2', REDLINE + "; " + redline(band[0], band[1]))
    rule(f'.chrome[data-scr="{scr}"] .band', M(*band))
    rule(f'.chrome[data-scr="{scr}"] .panel', M(*panel))

# host PIN (kept high on the screen, clear of the on-screen keyboard)
chrome("s-pin", [(0, 990), (1080, 800), (1080, 840), (0, 1030)], [(0, 1030), (1080, 840), (1080, 1920), (0, 1920)])
rule("#s-pin .eb", "left:60u; top:230u"); rule("#s-pin .t3", "left:54u; top:276u; font-size:150u")
rule("#s-pin .k-input", "left:60u; top:560u; width:620u; height:140u; font-size:80u")
rule("#s-pin .cbox", "left:60u; top:730u; width:560u; height:110u")

# 2 code
chrome("s-code", [(0, 900), (1080, 760), (1080, 800), (0, 940)], [(0, 940), (1080, 800), (1080, 1920), (0, 1920)])
rule("#s-code .eb:not(.w)", "left:60u; top:226u"); rule("#s-code .t3", "left:54u; top:272u; font-size:140u")
rule("#s-code .sub", "left:62u; top:540u; width:560u; font-size:30u")
rule("#s-code .help", "left:680u; top:228u; width:340u; flex-direction:column; align-items:flex-end; gap:18u")
rule("#s-code .help > i", "display:none"); rule("#s-code .help .q", "width:200u; height:200u; border-radius:10u"); rule("#s-code .help div", "font-size:19u; text-align:right")
rule("#s-code .ghostb", "left:60u; top:712u")
rule("#s-code .eb.w", "left:60u; top:966u"); rule("#s-code .cnt", "left:753u; top:967u; font-size:22u")
rule("#s-code .slots", "left:60u; top:1012u; width:960u; gap:14u"); rule("#s-code .slots b", "height:112u; font-size:72u")
rule("#s-code .msg", "left:60u; top:1136u; width:960u; font-size:22u")
rule("#s-code .kb", "left:60u; top:1178u; width:960u; gap:20u 14u"); rule("#s-code .kb button", "height:100u; font-size:46u")
rule("#s-code .act", "left:60u; top:1690u; width:960u; height:130u; grid-template-columns:320u 1fr")
rule("#s-code .act button", "font-size:34u"); rule("#s-code .act .go.ready", "font-size:60u")

# 3 ready? (Tiles): greeting and a round Wendy badge on dark; the three promises are chunky white tiles on red
chrome("s-consent", [(0, 700), (1080, 560), (1080, 600), (0, 740)], [(0, 740), (1080, 600), (1080, 1920), (0, 1920)])
rule("#s-consent .art", "-webkit-mask:none; mask:none; clip-path:none; inset:auto; left:712u; top:206u; width:320u; height:297u; overflow:visible; background:transparent; filter:drop-shadow(0 16u 26u rgba(0,0,0,.5))")
rule("#s-consent .art img:not(.wcameo)", "display:none")
rule("#s-consent .art img.wcameo", "display:block; left:0; top:0; width:100%; height:100%; object-fit:contain")
rule("#s-consent .eb", "left:60u; top:232u"); rule("#s-consent .hi", "left:54u; top:276u")
rule("#s-consent .lang-pick", "left:60u; top:478u; gap:10u")
rule("#s-consent .lang-pick button", "height:58u; padding:0 28u; font-size:24u; border-radius:999u; background:rgba(255,255,255,.16)")
rule("#s-consent .lang-pick button.on", "background:#fff; color:#1E1B1B")
rule("#s-consent .consent-box", "left:60u; top:772u; width:960u; background:transparent; box-shadow:none; overflow:visible; border-radius:0")
rule("#s-consent .consent-box .rows", "padding:0; gap:30u; counter-reset:step; position:relative")
# the three promises are stops on a dotted route: blue numbered badges with a red ring, each pointing at its tile
rule("#s-consent .consent-box .rows::before", "content:\"\"; position:absolute; left:62u; top:60u; bottom:60u; width:0; border-left:8u dotted rgba(255,255,255,.75)")
rule("#s-consent .consent-box .row", "background:#fff; border-radius:20u; padding:26u 30u; gap:22u; flex-wrap:nowrap; align-items:center; box-shadow:0 10u 0 #7E1016, 0 22u 36u rgba(60,0,8,.35); counter-increment:step; position:relative; margin-left:150u")
rule("#s-consent .consent-box .row::before", "content:counter(step); position:absolute; left:-150u; top:50%; translate:0 -50%; width:124u; height:124u; border-radius:50%; display:grid; place-items:center; font:italic 900 74u/1 Poppins, sans-serif; background:linear-gradient(180deg, #2BB6EA, #0186B8); color:#fff; text-shadow:0 3u 0 rgba(1,71,106,.7); box-shadow:0 0 0 7u #E3202B, 0 0 0 12u #fff, 0 10u 0 10u #7E1016, 0 18u 28u rgba(60,0,8,.4)")
rule("#s-consent .consent-box .row::after", "content:\"\"; position:absolute; left:-16u; top:50%; translate:0 -50%; width:32u; height:32u; background:#fff; rotate:45deg; border-radius:4u")
rule("#s-consent .consent-box .row > div", "flex:1 1 0; min-width:0")
rule("#s-consent .consent-box .row i", "width:84u; height:84u; box-shadow:0 0 0 6u #E3202B"); rule("#s-consent .consent-box .row i svg", "width:44u; height:44u")
rule("#s-consent .consent-box .row b", "font-size:38u; color:#CD2028")
rule("#s-consent .consent-box .no", "margin-left:150u; margin-top:24u; border-radius:16u; background:#1E1B1B; padding:24u 32u; font-size:26u; box-shadow:0 8u 0 #0A0909")
rule("#s-consent .cact", "left:60u; top:1664u; width:960u; height:140u; grid-template-columns:300u 1fr")
rule("#s-consent .cact .nope", "font-size:30u"); rule("#s-consent .cact .yes", "font-size:46u")

# 4 camera (Shutter): tall live picture at the top next to the webcam, round red shutter on its bottom edge,
#   3D heat pills on red, and Wendy's cameo giving the "step back" tip in a speech bubble
chrome("s-cam", [(0, 1220), (1080, 1090), (1080, 1130), (0, 1260)], [(0, 1260), (1080, 1130), (1080, 1920), (0, 1920)])
rule("#s-cam .cam", "left:60u; top:205u; width:960u; height:820u; box-shadow:0 10u 0 #050505, 0 30u 60u rgba(0,0,0,.6)")
rule("#s-cam .cam .live", "left:auto; right:36u")
rule("#s-cam .cam .count", "font-size:210u; text-shadow:0 6u 0 rgba(0,0,0,.35)")
rule("#s-cam .cam .count::before", "content:\"\"; position:absolute; left:50%; top:50%; translate:-50% -50%; width:330u; height:330u; border:12u solid rgba(255,255,255,.92); border-radius:50%; background:rgba(0,0,0,.2); z-index:-1")
rule("#s-cam .snapb", "left:445u; top:930u; width:190u; height:190u; border-radius:50%; padding:0; gap:0; font-size:0; background:radial-gradient(circle at 40% 30%, #FF6B73 0%, #E3252F 38%, #B01A22 100%); border:10u solid #fff; box-shadow:0 0 0 10u rgba(227,32,43,.4), 0 12u 0 4u #7E1016, 0 30u 44u rgba(0,0,0,.55), inset 0 6u 10u rgba(255,255,255,.35), inset 0 -10u 16u rgba(90,8,14,.5); animation:shutterGlow 2.2s ease-in-out infinite; z-index:7")
rule("#s-cam .snapb svg", "width:92u; height:92u; filter:drop-shadow(0 4u 0 rgba(90,8,14,.6))")
rule("#s-cam .ghostb", "left:92u; top:236u; width:190u; height:60u; padding:0; font-size:19u; background:rgba(0,0,0,.55); border-color:rgba(255,255,255,.85); z-index:7")
rule("#s-cam .eb.w", "left:60u; top:1296u"); rule("#s-cam .t3", "left:54u; top:1334u; font-size:74u")
rule("#s-cam .t3 span", "display:inline; margin-top:0"); rule("#s-cam .t3 span + span", "margin-left:.25em")
# heat choices: chunky 3D pills with a glossy top, a thick underside and a soft drop shadow; the chosen one lifts and glows
rule("#s-cam .heat", "left:60u; top:1446u; width:960u; grid-template-columns:repeat(3, 1fr); gap:20u")
rule("#s-cam .heat button", "height:124u; border-radius:999u; flex-direction:row; justify-content:center; gap:14u; padding:0; font-size:33u; border:3u solid rgba(255,255,255,.22); background:linear-gradient(180deg, #5A5050 0%, #2E2929 46%, #171414 100%); box-shadow:0 12u 0 #050505, 0 26u 30u rgba(40,0,6,.45), inset 0 4u 0 rgba(255,255,255,.28), inset 0 -8u 12u rgba(0,0,0,.45); text-shadow:0 3u 0 rgba(0,0,0,.55)")
rule("#s-cam .heat button.on", "translate:0 -6u; border-color:#fff; background:linear-gradient(180deg, #FFFFFF 0%, #F6F0E6 60%, #E4DACB 100%); color:#CD2028; text-shadow:none; box-shadow:0 14u 0 #7E1016, 0 30u 36u rgba(40,0,6,.5), inset 0 4u 0 #fff, 0 0 0 8u rgba(255,255,255,.28), 0 0 44u rgba(255,255,255,.55)")
rule("#s-cam .heat button:active", "translate:0 6u")
rule("#s-cam .heat svg", "width:36u; height:36u; filter:drop-shadow(0 2u 0 rgba(0,0,0,.45))")
# Wendy's tip: a 3D speech bubble pointing at her cameo
BUB = "left:60u; top:1634u; width:716u; box-sizing:border-box; white-space:normal; background:linear-gradient(180deg, #FFFFFF, #F6F0E6); color:#1E1B1B; border:6u solid #18A6E8; border-radius:28u; padding:24u 30u; font:italic 900 32u/1.2 Poppins, sans-serif; letter-spacing:0; text-transform:none; box-shadow:0 10u 0 #01679A, 0 26u 36u rgba(40,0,6,.4)"
rule("#s-cam .camtip", BUB); rule("#s-cam #cam-status", BUB + "; color:#CD2028; font-size:24u")
rule("#s-cam .camtip::after", "content:\"\"; position:absolute; right:-22u; top:50%; translate:0 -50%; rotate:45deg; width:32u; height:32u; background:#F9F5EE; border-top:6u solid #18A6E8; border-right:6u solid #18A6E8")
rule("#s-cam .tipcameo", "display:block; position:absolute; left:806u; top:1592u; width:222u; height:auto; filter:drop-shadow(0 14u 20u rgba(0,0,0,.45)); z-index:6")

# 5 cooking
chrome("s-cooking", [(0, 1040), (1080, 860), (1080, 900), (0, 1080)], [(0, 1080), (1080, 900), (1080, 1920), (0, 1920)])
rule("#s-cooking .art", M((0, 1080), (1080, 900), (1080, 1860), (0, 1860)))
rule("#s-cooking .art img", "left:-10u; top:800u; width:1100u; height:1100u")
rule("#s-cooking .eb", "left:60u; top:226u"); rule("#s-cooking .t3", "left:54u; top:270u; font-size:118u")
rule("#s-cooking .chk", "left:60u; top:548u; gap:26u"); rule("#s-cooking .chk .st i", "width:70u; height:70u"); rule("#s-cooking .chk .st b", "font-size:38u")
rule("#s-cooking .cpol", "left:670u; top:500u; width:340u")
rule("#s-cooking .wbub", "left:60u; top:1640u; width:960u; min-height:170u")
rule("#s-cooking .wbub small", "font-size:22u"); rule("#s-cooking .wbub .cooking-line", "font-size:48u")
rule("#s-cooking .wbub::after", "left:640u; right:auto; top:-21u; bottom:auto; border-right:0; border-bottom:0; border-left:6u solid #029CD4; border-top:6u solid #029CD4")

# 6 your roast (photo card and QR on red at the top, the roast below)
chrome("s-reveal", [(0, 1090), (1080, 950), (1080, 990), (0, 1130)], [(0, 177), (1080, 177), (1080, 950), (0, 1090)])
rule("#s-reveal .pcard", "left:90u; top:285u; width:420u; height:676u"); rule("#s-reveal .pcard .poster", "scale:.84")
rule("#s-reveal .rsave", "left:620u; top:236u; font-size:64u"); rule("#s-reveal .qrs", "left:620u; top:386u; width:340u")
rule("#s-reveal .qnote", "left:620u; top:746u; width:400u; font-size:23u")
rule("#s-reveal .rleft", "left:60u; top:1150u; width:960u; height:545u; padding:0; gap:18u")
rule("#s-reveal .say", "padding:28u 34u 24u; margin-bottom:0"); rule("#s-reveal .say .who", "font-size:21u"); rule("#s-reveal .say .who img", "height:50u")
rule("#s-reveal .rtabs button", "height:52u; min-width:70u; font-size:20u"); rule("#s-reveal .rsig", "font-size:19u")
rule("#s-reveal .nextb", "left:60u; top:1722u; width:960u; height:110u; font-size:44u")


# look and feel from the owner's reference: clean white and red titles, rounder blocks
# Scream & Win lettering: cream letters on a red edge, red letters on a cream edge (big welcome title uses a deeper edge)
WHITE = "color:#F6F0E6; -webkit-text-stroke:0; text-shadow:0 4u 0 #E3202B, 0 8u 0 #8E1219, 0 20u 28u rgba(0,0,0,.55)"
REDT = "color:#E3202B; -webkit-text-stroke:0; text-shadow:0 4u 0 #F6F0E6, 0 8u 0 #8E1219, 0 20u 28u rgba(0,0,0,.55)"
rule("#s-idle .title .l1, .cv .t3 .l1, .cv .hi .l1, .cv .rbig", WHITE)
rule("#s-idle .title .l2, .cv .t3 .l2, .cv .hi .l2", REDT)
rule("#s-cam .t3 .l1", "color:#F6F0E6; text-shadow:0 4u 0 #8E1219, 0 8u 0 #5A0B10, 0 16u 24u rgba(60,0,8,.4)")
rule("#s-idle .title .l1", "text-shadow:0 5u 0 #E3202B, 0 11u 0 #8E1219, 0 26u 34u rgba(0,0,0,.55)")
rule("#s-idle .title .l2", "margin-top:14u")
rule("#s-idle .sub", "font-style:italic; font-weight:900; letter-spacing:-.01em; color:#F6F0E6"); rule("#s-idle .sub b", "color:#E3202B; text-shadow:0 3u 0 #8E1219")
rule("#s-idle .qtxt", "letter-spacing:.16em; color:#F6F0E6")
rule(f"{BOTH} .hd, {BOTH} .ft", "background:linear-gradient(90deg, #0A86C6 0%, #1097D8 45%, #22ACEC 100%)")
rule(f"{BOTH} .hd .stp", "font-style:italic; letter-spacing:.2em")
rule(".cv .eb", "letter-spacing:.2em; color:#18A6E8"); rule(".cv .eb.w", "color:#fff")
rule("#s-idle .cta, .cv .snapb, .cv .cact .yes", "border-width:5u"); rule("#s-idle .cta", "border-radius:26u")
rule(".cv .act .go, .cv .cbox", "border-radius:999u")
# every dark button gets the same chunky 3D pill as the heat choices: glossy top, thick underside, soft drop shadow
DARK3D = "border:3u solid rgba(255,255,255,.22); background:linear-gradient(180deg, #5A5050 0%, #2E2929 46%, #171414 100%); box-shadow:0 12u 0 #050505, 0 26u 30u rgba(0,0,0,.45), inset 0 4u 0 rgba(255,255,255,.28), inset 0 -8u 12u rgba(0,0,0,.45); text-shadow:0 3u 0 rgba(0,0,0,.55)"
rule("#s-reveal .nextb, .cv .cact .nope, .cv .act .del", DARK3D + "; border-radius:999u")
rule("#s-reveal .nextb:active, .cv .cact .nope:active, .cv .act .del:active", "translate:0 8u; box-shadow:0 4u 0 #050505, inset 0 4u 0 rgba(255,255,255,.28)")
rule(".cv .kb button:not(.n)", DARK3D.replace("0 12u 0 #050505, 0 26u 30u", "0 9u 0 #050505, 0 18u 20u"))
rule(".cv .kb button.n", "border:3u solid rgba(255,255,255,.35); box-shadow:0 9u 0 #01476A, 0 18u 20u rgba(0,0,0,.4), inset 0 4u 0 rgba(255,255,255,.4), inset 0 -8u 12u rgba(1,71,106,.5)")
rule(".cv .cact .yes", "border-radius:999u")
rule(".cv .ghostb", "border-radius:14u; border-width:3u")
rule(".cv .kb button", "border-radius:18u"); rule(".cv .slots b", "border-radius:14u")
rule(".cv .consent-box", "border-radius:0 18u 18u 18u; box-shadow:0 10u 0 rgba(0,0,0,.35), 0 24u 44u rgba(0,0,0,.45)"); rule(".cv .lang-pick button", "border-radius:14u 14u 0 0")
rule("#s-reveal .say", "border-radius:18u; box-shadow:0 8u 0 rgba(0,0,0,.4), 0 22u 40u rgba(0,0,0,.45)")
rule("#s-cam .cam", "border-radius:28u; border-width:5u; border-color:rgba(255,255,255,.92)")
rule("#s-cooking .wbub", "border-radius:26u")
rule("#s-reveal .qrs", "border-radius:16u"); rule("#s-idle .qr", "border-radius:8u")

def units(s): return re.sub(r"(?<![\w.#])(-?\d+(?:\.\d+)?)u\b", lambda m: f"calc({m.group(1)} * var(--p))", s)
lines = []
for sel, decl in R:
    d = "; ".join(x.strip() + " !important" for x in decl.split(";") if x.strip())
    lines.append(f"    {sel} {{ {units(d)}; }}")
RAW = units("""
    /* subtle glows on the welcome screen */
    #s-idle .cta::after { content:""; position:absolute; top:0; bottom:0; left:-30%; width:22%; background:linear-gradient(100deg, transparent, rgba(255,255,255,.38), transparent); transform:skewX(-18deg); animation:ctaSheen 4.8s ease-in-out infinite; pointer-events:none; }
    @keyframes ctaGlow { 0%, 100% { box-shadow:0 10u 0 #01476A, 0 24u 40u rgba(0,0,0,.45), inset 0 2u 0 rgba(255,255,255,.3), 0 0 22u rgba(43,182,234,.35); } 50% { box-shadow:0 10u 0 #01476A, 0 24u 40u rgba(0,0,0,.45), inset 0 2u 0 rgba(255,255,255,.3), 0 0 64u rgba(43,182,234,.9), 0 0 0 8u rgba(255,255,255,.22); } }
    @keyframes ctaSheen { 0%, 55% { left:-30%; } 85%, 100% { left:112%; } }
    @keyframes shutterGlow { 0%, 100% { box-shadow:0 0 0 10u rgba(227,32,43,.4), 0 12u 0 4u #7E1016, 0 30u 44u rgba(0,0,0,.55), inset 0 6u 10u rgba(255,255,255,.35), inset 0 -10u 16u rgba(90,8,14,.5); } 50% { box-shadow:0 0 0 22u rgba(227,32,43,.22), 0 12u 0 4u #7E1016, 0 30u 44u rgba(0,0,0,.55), inset 0 6u 10u rgba(255,255,255,.35), inset 0 -10u 16u rgba(90,8,14,.5), 0 0 60u rgba(255,90,98,.8); } }
    @keyframes dotGlow { 0%, 100% { opacity:.6; } 50% { opacity:1; } }
    @keyframes redGlow { 0%, 100% { text-shadow:0 5u 0 #F6F0E6, 0 11u 0 #8E1219, 0 26u 34u rgba(0,0,0,.55), 0 0 0 rgba(227,32,43,0); } 50% { text-shadow:0 5u 0 #F6F0E6, 0 11u 0 #8E1219, 0 26u 34u rgba(0,0,0,.55), 0 0 50u rgba(227,32,43,.65); } }
""")
css = ("  /* ===== Upright kiosk (portrait, 1080 x 1920 canvas). Built for the 1080 x 1920 Android touch kiosk; every size is in --p units.\n"
       "     Words sit on the dark top, Wendy or the red panel below a slanted white stripe, buttons low for easy reach. ===== */\n"
       "  @media (orientation: portrait) {\n" + "\n".join(lines) + RAW.rstrip() + "\n  }\n")
p = sys.argv[1]; s = open(p, encoding="utf-8", newline="").read(); nl = "\r\n" if "\r\n" in s else "\n"
start, end = "  /* ===== Upright kiosk (portrait", "  }" + nl + "</style>"
if start in s: s = s[:s.index(start)] + s[s.index(end, s.index(start)) + len("  }" + nl):]
a = "</style>" + nl + "</head>"; assert s.count(a) == 1
s = s.replace(a, css.replace("\n", nl) + a); open(p, "w", encoding="utf-8", newline="").write(s)
print("rules", len(R))

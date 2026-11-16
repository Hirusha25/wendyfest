import sys
from PIL import Image, ImageDraw, ImageFont
src, out = sys.argv[1], sys.argv[2]
B = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
f1, f2, f3 = ImageFont.truetype(B, 46), ImageFont.truetype(B, 22), ImageFont.truetype(B, 20)
W, H = 2440, 1640
im = Image.new("RGB", (W, H), "#F3EEE9"); d = ImageDraw.Draw(im)
d.rectangle([0, 0, W, 110], fill="#1F1A1A"); d.rectangle([0, 110, W // 2, 118], fill="#CD2028"); d.rectangle([W // 2, 110, W, 118], fill="#029CD4")
d.text((40, 30), "WENDY FEST  ·  ROAST ME", fill="white", font=f1); d.text((W - 640, 44), "INTERACTIVE PHOTO BOOTH · KIOSK + SHARE CARD", fill="#E0303A", font=f3)
tw, th = 760, 428; xs = [40, 840]; ys = [170, 640, 1110 - 0]
cells = [("v2-1", "WELCOME"), ("v2-3", "CAMERA"), ("v2-2", "READY?"), ("v2-4", "COOKING"), ("v2-5", "REVEAL")]
pos = [(0, 0), (1, 0), (0, 1), (1, 1), (0, 2)]
for (n, l), (c, r) in zip(cells, pos):
    x, y = xs[c], 150 + r * (th + 50)
    d.text((x, y - 4), l, fill="#1F1A1A", font=f2); im.paste(Image.open(f"{src}/{n}.png").convert("RGB").resize((tw, th)), (x, y + 26))
x, y = 840, 150 + 2 * (th + 50)
d.rounded_rectangle([x, y + 26, x + tw, y + 26 + th], 18, fill="#1F1A1A")
d.text((x + 40, y + 90), "SHARE CARD (9:16)  →", fill="white", font=f1); d.text((x + 40, y + 160), "Download from the QR, post to stories,", fill="#CCCCCC", font=f2); d.text((x + 40, y + 192), "tag @wendys.lk  #RoastedByWendy", fill="#E0303A", font=f2)
sh = Image.open(f"{src}/v2-share.png").convert("RGB"); sh = sh.resize((int(1420 * 1080 / 1920), 1420))
d.text((1660, 146), "SHARE TEMPLATE", fill="#1F1A1A", font=f2); im.paste(sh, (1660, 176))
im.save(out); print("board", out)

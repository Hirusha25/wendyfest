#!/usr/bin/env python3
"""Compose a labelled contact sheet from kiosk screenshots.
Usage: sheet.py <shotsDir> <outPng> name:Label [name:Label ...]"""
import sys
from PIL import Image, ImageDraw, ImageFont
src, out = sys.argv[1], sys.argv[2]
names = [a.split(":", 1) for a in sys.argv[3:]]
W, H, cols = 960, 540, 2
rows = (len(names) + cols - 1) // cols
im = Image.new("RGB", (W * cols + 40 * (cols + 1), (H + 50) * rows + 40), "#ECE6DD")
d = ImageDraw.Draw(im)
f = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 22)
for i, (n, label) in enumerate(names):
    x = 40 + (i % cols) * (W + 40); y = 40 + (i // cols) * (H + 50)
    d.text((x, y), label, fill="#252525", font=f)
    im.paste(Image.open(f"{src}/{n}.png").resize((W, H)), (x, y + 30))
im.save(out); print("sheet", out)

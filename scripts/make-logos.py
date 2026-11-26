"""Builds the logo files in public/assets from the client's final artwork PDFs (vector, transparent background).
Usage: python scripts/make-logos.py "<Wendy's horizontal logo PDF>" "<Wendy Fest logo PDF>"
  wendys-horiz.svg        full colour Wendy's logo, cropped to the artwork
  wendys-horiz-white.svg  the same with the wordmark in white (for blue, red and dark backgrounds); the cameo keeps its colours
  wendys-horiz.png        full colour, for places that need a picture file
  wendyfest-logo.svg      the Wendy Fest logo, cropped to the artwork
  wendyfest-logo.png      the same as a picture file (used when drawing share cards)
"""
import re, sys, fitz

wendys_pdf, fest_pdf = sys.argv[1], sys.argv[2]
OUT = "public/assets/"

def svg_of(page, box, recolour=None):
    """Page as SVG, cropped to box (x, y, w, h in PDF points). recolour(index, rect, fill) may return a new fill."""
    s = page.get_svg_image(text_as_path=True)
    s = re.sub(r'width="[^"]+" height="[^"]+" viewBox="[^"]+"', f'width="{box[2]}" height="{box[3]}" viewBox="{box[0]} {box[1]} {box[2]} {box[3]}"', s, count=1)
    if recolour:
        draws = page.get_drawings(); paths = [m for m in re.finditer(r"<path[^>]*>", s) if 'fill="#' in m.group(0)]   # skips clip paths
        assert len(paths) == len(draws), (len(paths), len(draws))
        out, last = [], 0
        for i, (m, d) in enumerate(zip(paths, draws)):
            tag = m.group(0); new = recolour(i, d["rect"], d.get("fill"))
            if new: tag = re.sub(r'fill="#[0-9a-fA-F]{6}"', f'fill="{new}"', tag)
            out.append(s[last:m.start()] + tag); last = m.end()
        s = "".join(out) + s[last:]
    return s

def art_box(page, pad):
    r = fitz.Rect()
    for d in page.get_drawings(): r |= d["rect"]
    return (round(r.x0 - pad, 1), round(r.y0 - pad, 1), round(r.width + 2 * pad, 1), round(r.height + 2 * pad, 1))

# Wendy's: keep the crop the app has always used, so every layout stays where it is
wp = fitz.open(wendys_pdf)[0]; WBOX = (167.8, 270.3, 475.0, 139.0)
open(OUT + "wendys-horiz.svg", "w", encoding="utf-8").write(svg_of(wp, WBOX))
cameo_left = min(d["rect"].x0 for d in wp.get_drawings() if d.get("fill") and abs(d["fill"][0] - 0.29) < .02)   # the dark ring of the cameo
is_red = lambda f: f and f[0] > .8 and f[1] < .2
open(OUT + "wendys-horiz-white.svg", "w", encoding="utf-8").write(svg_of(wp, WBOX, lambda i, r, f: "#ffffff" if is_red(f) and r.x1 < cameo_left else None))
wp.get_pixmap(matrix=fitz.Matrix(4, 4), clip=fitz.Rect(WBOX[0], WBOX[1], WBOX[0] + WBOX[2], WBOX[1] + WBOX[3]), alpha=True).save(OUT + "wendys-horiz.png")

fp = fitz.open(fest_pdf)[0]; FBOX = art_box(fp, 8)
open(OUT + "wendyfest-logo.svg", "w", encoding="utf-8").write(svg_of(fp, FBOX))
k = 900 / FBOX[2]
fp.get_pixmap(matrix=fitz.Matrix(k, k), clip=fitz.Rect(FBOX[0], FBOX[1], FBOX[0] + FBOX[2], FBOX[1] + FBOX[3]), alpha=True).save(OUT + "wendyfest-logo.png")
print("Wendy's box", WBOX, "| cameo starts at x", round(cameo_left, 1), "| Wendy Fest box", FBOX, "ratio", round(FBOX[2] / FBOX[3], 3))

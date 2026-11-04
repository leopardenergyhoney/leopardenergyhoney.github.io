#!/usr/bin/env python3
"""Generate and verify the printed QR codes for both product pages.

    python tools/generate_qr.py --base-url https://USERNAME.github.io/leopard-energy-honey

Writes qr/<slug>.svg (vector) and qr/<slug>.png (1200 px wide). Each code uses error
correction H, dark brown on white, and a full 4-module quiet zone, with the label as
outlines underneath, so no fonts are needed at the printer.
Every file is decoded again afterwards. The script exits with an error on any mismatch.
"""
import argparse
import base64
import io
import pathlib
import re
import sys

import cv2
import numpy as np
import qrcode
import uharfbuzz as hb
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.ttLib import TTFont
from PIL import Image, ImageChops, ImageDraw

ROOT = pathlib.Path(__file__).resolve().parent.parent
SLUGS = ["royal-jelly", "ginseng-tongkat-ali"]
DARK = "#3A1E0E"
QUIET = 4          # modules: the full quiet zone the QR spec requires
PNG_WIDTH = 1200
LABEL = [("Scan for full product details", "AlegreyaSans-400-latin.woff2", "ltr", "latn"),
         ("امسح لمعرفة تفاصيل المنتج", "Tajawal-400-arabic.woff2", "rtl", "arab")]


def matrix_for(url):
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_H, border=QUIET, box_size=1)
    qr.add_data(url)
    qr.make(fit=True)
    return qr.get_matrix()


def shape_outlines(text, font_file, direction, script):
    """Return (contours, advance): text as flattened outlines in font units, y pointing up."""
    tt = TTFont(ROOT / "assets" / "fonts" / font_file)
    buf = io.BytesIO()
    tt.flavor = None
    tt.save(buf)
    face = hb.Face(buf.getvalue())
    font = hb.Font(face)
    hbuf = hb.Buffer()
    hbuf.add_str(text)
    hbuf.direction, hbuf.script = direction, script
    hb.shape(font, hbuf, {"kern": True, "liga": True})
    names, glyphs = tt.getGlyphOrder(), tt.getGlyphSet()
    x, out = 0, []
    for info, pos in zip(hbuf.glyph_infos, hbuf.glyph_positions):
        pen = DecomposingRecordingPen(glyphs)
        glyphs[names[info.codepoint]].draw(pen)
        contours, cur, p0 = [], [], (0, 0)
        for op, args in pen.value:
            if op == "moveTo":
                cur, p0 = [args[0]], args[0]
            elif op == "lineTo":
                cur.append(args[0]); p0 = args[0]
            elif op == "qCurveTo":
                pts = list(args)
                while pts:
                    c = pts.pop(0)
                    e = pts[0] if len(pts) == 1 else ((c[0] + pts[0][0]) / 2, (c[1] + pts[0][1]) / 2)
                    if len(pts) == 1:
                        pts.pop(0)
                    for i in range(1, 9):
                        t = i / 8
                        cur.append(((1-t)**2*p0[0] + 2*(1-t)*t*c[0] + t*t*e[0],
                                    (1-t)**2*p0[1] + 2*(1-t)*t*c[1] + t*t*e[1]))
                    p0 = e
            elif op == "curveTo":
                c1, c2, e = args
                for i in range(1, 11):
                    t = i / 10
                    cur.append(((1-t)**3*p0[0] + 3*(1-t)**2*t*c1[0] + 3*(1-t)*t*t*c2[0] + t**3*e[0],
                                (1-t)**3*p0[1] + 3*(1-t)**2*t*c1[1] + 3*(1-t)*t*t*c2[1] + t**3*e[1]))
                p0 = e
            elif op in ("closePath", "endPath"):
                if len(cur) > 2:
                    contours.append(cur)
                cur = []
        ox, oy = x + pos.x_offset, pos.y_offset
        out.append([[(px + ox, py + oy) for px, py in c] for c in contours])
        x += pos.x_advance
    return out, x, tt["head"].unitsPerEm


def label_lines(total, top, line_h, em_size):
    """Lay the two label lines out centred; returns one list of glyphs (lists of contours) per line."""
    lines = []
    for i, (text, font_file, direction, script) in enumerate(LABEL):
        glyphs, adv, upem = shape_outlines(text, font_file, direction, script)
        s = em_size / upem
        dx = (total - adv * s) / 2
        base = top + line_h * (i + .78)
        lines.append([[[(dx + x * s, base - y * s) for x, y in c] for c in g] for g in glyphs])
    return lines


def emblem_data():
    im = Image.open(ROOT / "assets" / "img" / "logo.webp").convert("RGBA").crop((10, 0, 290, 235))
    bg = Image.new("RGBA", im.size, "white")
    bg.alpha_composite(im)
    return bg.convert("RGB")


def make_svg(matrix, path, logo):
    n = len(matrix)
    runs = []
    for y, row in enumerate(matrix):
        x = 0
        while x < n:
            if row[x]:
                x0 = x
                while x < n and row[x]:
                    x += 1
                runs.append(f"M{x0} {y}h{x - x0}v1h-{x - x0}z")
            else:
                x += 1
    top, line_h = n + .4, n * .068
    lines = label_lines(n, top, line_h, n * .058)
    d = ""
    for line in lines:
        for glyph in line:
            for c in glyph:
                d += "M" + "L".join(f"{x:.3f} {y:.3f}" for x, y in c) + "z"
    h = top + line_h * 2 + 1.2
    extra = ""
    if logo:
        side = n * .2
        pos = (n - side) / 2
        buf = io.BytesIO()
        emblem_data().save(buf, "PNG")
        uri = base64.b64encode(buf.getvalue()).decode()
        extra = (f'<rect id="logo-backing" x="{pos - .5}" y="{pos - .5}" width="{side + 1}" height="{side + 1}" fill="#fff"/>'
                 f'<image id="logo" x="{pos}" y="{pos}" width="{side}" height="{side}" href="data:image/png;base64,{uri}"/>')
    path.write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {n} {h:.2f}" width="{n * 10}" height="{h * 10:.0f}">'
        f'<rect width="{n}" height="{h:.2f}" fill="#fff"/>'
        f'<path id="qr" fill="{DARK}" shape-rendering="crispEdges" d="{"".join(runs)}"/>{extra}'
        f'<path id="label" fill="{DARK}" d="{d}"/></svg>\n', encoding="utf-8")


def make_png(matrix, path, logo):
    n = len(matrix)
    scale = PNG_WIDTH // n
    pad = (PNG_WIDTH - scale * n) // 2
    grid = np.array(matrix, dtype=bool)
    qr = np.kron(grid, np.ones((scale, scale), dtype=bool))
    label_h = int(PNG_WIDTH * .175)
    canvas = np.full((PNG_WIDTH + label_h, PNG_WIDTH, 3), 255, dtype=np.uint8)
    canvas[pad:pad + scale * n, pad:pad + scale * n][qr] = (0x3A, 0x1E, 0x0E)
    im = Image.fromarray(canvas)
    if logo:
        side = int(scale * n * .2)
        emblem = emblem_data()
        emblem.thumbnail((side, side), Image.LANCZOS)
        back = side + scale
        x0 = (PNG_WIDTH - back) // 2
        ImageDraw.Draw(im).rectangle((x0, x0, x0 + back, x0 + back), fill="white")
        im.paste(emblem, ((PNG_WIDTH - emblem.width) // 2, (PNG_WIDTH - emblem.height) // 2))
    # label: draw at 4x, then shrink for smooth edges
    ss = 4
    mask = Image.new("L", (PNG_WIDTH * ss, label_h * ss), 0)
    for line in label_lines(PNG_WIDTH * ss, 0, label_h * ss / 2.15, label_h * ss * .375):
        for glyph in line:
            layer = Image.new("1", mask.size, 0)
            for c in glyph:
                poly = Image.new("1", mask.size, 0)
                ImageDraw.Draw(poly).polygon(c, fill=1)
                layer = ImageChops.logical_xor(layer, poly)
            mask = ImageChops.lighter(mask, layer.convert("L"))
    mask = mask.resize((PNG_WIDTH, label_h), Image.LANCZOS)
    im.paste(Image.new("RGB", mask.size, DARK), (0, PNG_WIDTH), mask)
    im.save(path, optimize=True, dpi=(600, 600))


def decoders():
    det = cv2.QRCodeDetector()
    fns = [("OpenCV", lambda a: det.detectAndDecode(a)[0])]
    try:
        from pyzbar.pyzbar import decode as zb
        fns.append(("ZBar", lambda a: (zb(Image.fromarray(a))[0].data.decode() if zb(Image.fromarray(a)) else "")))
    except Exception:   # ZBar is an optional second opinion
        pass
    return fns


def svg_to_array(path, px=10):
    """Rebuild the code from the SVG's own path data, so the vector file itself gets decoded."""
    svg = path.read_text(encoding="utf-8")
    n = int(re.search(r'viewBox="0 0 (\d+)', svg).group(1))
    d = re.search(r'id="qr"[^>]*\sd="([^"]+)"', svg).group(1)
    a = np.full((n * px, n * px), 255, dtype=np.uint8)
    for x, y, w in re.findall(r"M(\d+) (\d+)h(\d+)", d):
        x, y, w = int(x), int(y), int(w)
        a[y * px:(y + 1) * px, x * px:(x + w) * px] = 30
    return a


def degrade(gray, angle, blur):
    """The PNG at about 2 x 2 cm at 300 dpi, slightly rotated and blurred, like a phone photo."""
    h, w = gray.shape
    small = cv2.resize(gray, (236, int(236 * h / w)), interpolation=cv2.INTER_AREA)
    big = cv2.copyMakeBorder(small, 40, 40, 40, 40, cv2.BORDER_CONSTANT, value=255)
    m = cv2.getRotationMatrix2D((big.shape[1] / 2, big.shape[0] / 2), angle, 1)
    out = cv2.warpAffine(big, m, (big.shape[1], big.shape[0]), borderValue=255, flags=cv2.INTER_LINEAR)
    return cv2.GaussianBlur(out, (0, 0), blur) if blur else out


def verify(slug, url, svg, png):
    ok = True
    gray = np.array(Image.open(png).convert("L"))
    for name, fn in decoders():
        for what, arr in (("PNG", gray), ("SVG", svg_to_array(svg))):
            got = fn(arr)
            good = got == url
            ok &= good
            print(f"  {name:6} {what}: {'OK ' if good else 'FAIL'} {got!r}")
        wins = sum(fn(degrade(gray, a, b)) == url for a in (-12, 0, 7, 20) for b in (0, .5, .8))
        print(f"  {name:6} at 2 cm, rotated and blurred: {wins}/12 decoded")
        ok &= wins >= 10
    return ok


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--base-url", required=True, help="e.g. https://USERNAME.github.io/leopard-energy-honey")
    ap.add_argument("--logo", action="store_true", help="add the small leopard emblem in the centre (test before printing)")
    ap.add_argument("--out", default=str(ROOT / "qr"))
    a = ap.parse_args()
    base = a.base_url.rstrip("/")
    if not re.match(r"^https://[^\s/]+", base):
        sys.exit("The base URL must start with https://")
    out = pathlib.Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    ok = True
    for slug in SLUGS:
        url = f"{base}/{slug}/"
        m = matrix_for(url)
        svg, png = out / f"{slug}.svg", out / f"{slug}.png"
        make_svg(m, svg, a.logo)
        make_png(m, png, a.logo)
        print(f"{slug}: {url}  ({len(m) - 2 * QUIET} modules + quiet zone{', with logo' if a.logo else ''})")
        ok &= verify(slug, url, svg, png)
    if not ok:
        sys.exit("\nVERIFICATION FAILED. Do not print these codes.")
    print("\nAll codes verified.")


if __name__ == "__main__":
    main()

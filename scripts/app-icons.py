#!/usr/bin/env python3
"""Render the PWA / home-screen icons into assets/:
icon-180.png (apple-touch-icon), icon-192.png, icon-512.png, icon-512-maskable.png.

Recreates the favicon design from index.html — dark rounded tile, diagonal
gold→red→violet gradient ring, gold "26" — at raster sizes iOS/Android need.
Pillow only.  Run:  python3 scripts/app-icons.py
"""
import pathlib
from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
BG = (6, 7, 16)
STOPS = [(245, 197, 66), (232, 37, 74), (124, 92, 255)]  # gold → red → violet

def font(size):
    for base in ("/usr/share/fonts/truetype/dejavu/", ""):
        try: return ImageFont.truetype(base + "DejaVuSans-Bold.ttf", size)
        except OSError: pass
    return ImageFont.load_default()

def gradient(size):
    """Diagonal 3-stop gradient, rendered small then upscaled smooth."""
    n = 64
    img = Image.new("RGB", (n, n))
    px = img.load()
    for y in range(n):
        for x in range(n):
            t = (x + y) / (2 * (n - 1))
            if t < 0.55:
                a, b, u = STOPS[0], STOPS[1], t / 0.55
            else:
                a, b, u = STOPS[1], STOPS[2], (t - 0.55) / 0.45
            px[x, y] = tuple(round(a[i] + (b[i] - a[i]) * u) for i in range(3))
    return img.resize((size, size), Image.LANCZOS)

def rounded_mask(size, radius):
    m = Image.new("L", (size, size), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return m

def make_icon(size, maskable=False):
    img = Image.new("RGB", (size, size), BG)
    # Maskable icons must fill the canvas (the OS crops its own shape);
    # regular icons get the rounded gradient ring on the dark tile.
    pad = round(size * (0.18 if maskable else 0.08))
    ring = round(size * 0.07)
    grad = gradient(size)
    r_out = round(size * 0.21)
    box = Image.new("RGB", (size, size), BG)
    box.paste(grad, (0, 0), rounded_mask(size, r_out).point(lambda v: v))
    # outer gradient frame
    frame = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(frame)
    d.rounded_rectangle([pad, pad, size - 1 - pad, size - 1 - pad], radius=r_out, fill=255)
    inner = pad + ring
    d.rounded_rectangle([inner, inner, size - 1 - inner, size - 1 - inner],
                        radius=max(2, r_out - ring), fill=0)
    img.paste(grad, (0, 0), frame)
    # "26" centered
    f = font(round(size * 0.42))
    d = ImageDraw.Draw(img)
    bb = d.textbbox((0, 0), "26", font=f)
    w, h = bb[2] - bb[0], bb[3] - bb[1]
    d.text(((size - w) / 2 - bb[0], (size - h) / 2 - bb[1]), "26",
           font=f, fill=(245, 197, 66))
    return img

def main():
    out = ROOT / "assets"
    out.mkdir(exist_ok=True)
    for name, size, maskable in [("icon-180.png", 180, False),
                                 ("icon-192.png", 192, False),
                                 ("icon-512.png", 512, False),
                                 ("icon-512-maskable.png", 512, True)]:
        make_icon(size, maskable).save(out / name, optimize=True)
        print(f"wrote assets/{name}")

if __name__ == "__main__":
    main()

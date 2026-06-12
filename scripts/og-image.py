#!/usr/bin/env python3
"""Render assets/og.png (1200x630) — the social-share card behind the og:image /
twitter:image tags in index.html.

Draws the win-probability stacked bars straight from history.json (the owned
Polymarket archive), so the card always shows the current state of the race.
Pillow + the DejaVu fonts that ship with ubuntu runners; no other deps.

Run:  python3 scripts/og-image.py        (from the repo root or scripts/)
"""
import json, datetime, pathlib
from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
W, H = 1200, 630

# Mirrors T in index.html (name only).
NAMES = {
 "MEX":"Mexico","RSA":"South Africa","KOR":"South Korea","CZE":"Czechia",
 "CAN":"Canada","BIH":"Bosnia & Herz.","QAT":"Qatar","SUI":"Switzerland",
 "BRA":"Brazil","MAR":"Morocco","HAI":"Haiti","SCO":"Scotland",
 "USA":"United States","PAR":"Paraguay","AUS":"Australia","TUR":"Türkiye",
 "GER":"Germany","CUW":"Curaçao","CIV":"Côte d'Ivoire","ECU":"Ecuador",
 "NED":"Netherlands","JPN":"Japan","SWE":"Sweden","TUN":"Tunisia",
 "BEL":"Belgium","EGY":"Egypt","IRN":"Iran","NZL":"New Zealand",
 "ESP":"Spain","CPV":"Cape Verde","KSA":"Saudi Arabia","URU":"Uruguay",
 "FRA":"France","SEN":"Senegal","IRQ":"Iraq","NOR":"Norway",
 "ARG":"Argentina","ALG":"Algeria","AUT":"Austria","JOR":"Jordan",
 "POR":"Portugal","COD":"DR Congo","UZB":"Uzbekistan","COL":"Colombia",
 "ENG":"England","CRO":"Croatia","GHA":"Ghana","PAN":"Panama",
}
# Mirrors FEATURE_COLORS in index.html (rank-ordered palette for the leaders).
FEATURE_COLORS = ["#f5c542","#2e7bff","#e8254a","#19c37d","#7c5cff","#ff7a3c",
                  "#21d4d4","#ff5db1","#9bd34a","#b388ff","#ffa53b","#4ad6a0",
                  "#5b8def","#e0607e","#54c7ec","#c7cf3a"]
BG, PANEL, TXT, MUTED, MUTED2, GOLD = "#06070d", "#0b0e1a", "#eef1fb", "#8b92ad", "#5c627a", "#f5c542"

def font(size, bold=False):
    name = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
    for base in ("/usr/share/fonts/truetype/dejavu/", ""):
        try: return ImageFont.truetype(base + name, size)
        except OSError: pass
    return ImageFont.load_default()

def main():
    hist = json.loads((ROOT / "history.json").read_text())
    snaps = sorted(hist.get("snapshots", []), key=lambda s: s["date"])
    if not snaps:
        raise SystemExit("history.json has no snapshots")
    codes = sorted(NAMES, key=lambda c: snaps[-1]["p"].get(c, 0), reverse=True)
    color = {c: FEATURE_COLORS[i] if i < len(FEATURE_COLORS)
             else f"hsl(222,13%,{40 + ((i - len(FEATURE_COLORS)) % 8) * 4}%)"
             for i, c in enumerate(codes)}

    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)

    # ---- header ----
    d.text((64, 34), "FIFA WORLD CUP 2026", font=font(19, True), fill=GOLD)
    d.text((64, 64), "Who wins the World Cup?", font=font(46, True), fill=TXT)
    updated = datetime.date.fromisoformat(snaps[-1]["date"]).strftime("%-d %B %Y")
    d.text((64, 126), f"Market-implied title odds · all 48 teams · updated {updated}",
           font=font(21), fill=MUTED)

    # ---- stacked daily bars (favourite at the bottom, like the live chart) ----
    cl, cr, ct, cb = 64, 816, 182, 540
    d.rectangle([cl - 10, ct - 10, cr + 10, cb + 34], fill=PANEL)
    days = snaps
    n = len(days)
    slot = (cr - cl) / n
    bw = slot * 0.82
    for i, s in enumerate(days):
        p = s["p"]
        total = sum(p.get(c, 0) for c in codes) or 1
        x0 = cl + i * slot + (slot - bw) / 2
        y = float(cb)
        for c in codes:
            hpx = p.get(c, 0) / total * (cb - ct)
            if hpx < 0.5: continue
            d.rectangle([x0, y - hpx, x0 + bw, y], fill=color[c])
            y -= hpx
        day_n = s["date"][8:10].lstrip("0")
        f = font(15)
        tw = d.textlength(day_n, font=f)
        d.text((x0 + bw / 2 - tw / 2, cb + 10), day_n, font=f, fill=MUTED2)
    mid = datetime.date.fromisoformat(days[n // 2]["date"]).strftime("%B")
    f = font(16, True)
    d.text((cl + (cr - cl) / 2 - d.textlength(mid, font=f) / 2, cb + 36), mid, font=f, fill=MUTED2)

    # ---- top-5 panel with day-over-day deltas ----
    px = 856
    d.text((px, 182), "TOP 5 TODAY", font=font(16, True), fill=MUTED2)
    cur, prev = snaps[-1]["p"], (snaps[-2]["p"] if len(snaps) > 1 else snaps[-1]["p"])
    total = sum(cur.get(c, 0) for c in codes) or 1
    for i, c in enumerate(codes[:5]):
        y = 222 + i * 60
        d.ellipse([px, y + 6, px + 22, y + 28], fill=color[c])
        d.text((px + 36, y), NAMES[c], font=font(23, True), fill=TXT)
        pct = cur.get(c, 0) / total * 100
        d.text((px + 36, y + 30), f"{pct:.1f}%", font=font(18), fill=MUTED)
        if c in prev:
            pp = (cur.get(c, 0) - prev[c]) * 100
            if abs(pp) >= 0.05:
                arrow, col = ("▲", "#19c37d") if pp > 0 else ("▼", "#e8254a")
                lbl = f"{arrow} {abs(pp):.1f}"
                f2 = font(17, True)
                d.text((W - 64 - d.textlength(lbl, font=f2), y + 6), lbl, font=f2, fill=col)

    # ---- footer ----
    d.line([64, 576, W - 64, 576], fill="#1b1f30", width=1)
    d.text((64, 590), "luiservela.github.io/worldcup-2026", font=font(21, True), fill=GOLD)
    note = "data: Polymarket · updated daily"
    f = font(17)
    d.text((W - 64 - d.textlength(note, font=f), 593), note, font=f, fill=MUTED2)

    out = ROOT / "assets" / "og.png"
    out.parent.mkdir(exist_ok=True)
    img.save(out, optimize=True)
    print(f"wrote {out} ({out.stat().st_size//1024} KB)")

if __name__ == "__main__":
    main()

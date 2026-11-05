#!/usr/bin/env python3
"""Generate Wardeck Stream Deck icons (coherent RF / wardrive geometric set).

Sizes follow Elgato plugin guidelines:
  category 28/56, action list 20/40, key 72/144, marketplace 288/512
Action-list / category icons are white (#FFFFFF) on transparent.
Key / marketplace icons use the Wardeck palette on dark fields.
"""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw

PLUGIN = Path(__file__).resolve().parents[2] / "com.jazzactual.wardeck.sdPlugin" / "imgs"

# Palette — radio night, not purple
NAVY = (11, 28, 36, 255)
NAVY_SOFT = (18, 42, 52, 255)
INK = (6, 14, 18, 255)
SIGNAL = (61, 220, 151, 255)
TEAL = (43, 187, 173, 255)  # WiGLE mark (original geometry)
AMBER = (232, 155, 45, 255)  # WDGWars mark
BLUE = (91, 141, 239, 255)  # Wardrift mark
SLATE = (148, 173, 184, 255)
WHITE = (255, 255, 255, 255)
CLEAR = (0, 0, 0, 0)


def save(img: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, "PNG", optimize=True)
    rel = path.relative_to(PLUGIN.parents[1])
    print(f"wrote {rel} ({img.size[0]}x{img.size[1]})")


def supersample(draw_fn, size: int, scale: int = 4) -> Image.Image:
    big = Image.new("RGBA", (size * scale, size * scale), CLEAR)
    draw_fn(ImageDraw.Draw(big), size * scale)
    return big.resize((size, size), Image.Resampling.LANCZOS)


def lw(size: int, base: float = 2.2) -> int:
    return max(1, round(size * base / 72))


def radar(draw: ImageDraw.ImageDraw, size: int, color, cx: int, cy: int, max_r: int, width: int) -> None:
    for frac in (0.4, 0.7, 1.0):
        r = int(max_r * frac)
        draw.arc([cx - r, cy - r, cx + r, cy + r], start=220, end=40, fill=color, width=width)
    angle = math.radians(-35)
    draw.line(
        [(cx, cy), (cx + int(max_r * math.cos(angle)), cy + int(max_r * math.sin(angle)))],
        fill=color,
        width=width,
    )
    br = max(1, size // 28)
    draw.ellipse([cx - br, cy - br, cx + br, cy + br], fill=color)


def signal_bars(
    draw: ImageDraw.ImageDraw,
    size: int,
    color,
    origin: tuple[int, int],
    bar_w: int | None = None,
    gap: int | None = None,
    heights: tuple[float, ...] = (0.35, 0.55, 0.8, 1.0),
    max_h_frac: float = 0.22,
) -> None:
    x0, y0 = origin
    bar_w = max(2, size // 18) if bar_w is None else bar_w
    gap = max(1, size // 36) if gap is None else gap
    max_h = int(size * max_h_frac)
    for i, h in enumerate(heights):
        bh = max(2, int(max_h * h))
        x = x0 + i * (bar_w + gap)
        draw.rounded_rectangle(
            [x, y0 - bh, x + bar_w, y0],
            radius=max(1, bar_w // 3),
            fill=color,
        )


def refresh_arrows(draw: ImageDraw.ImageDraw, size: int, color, cx: int, cy: int, r: int, width: int) -> None:
    draw.arc([cx - r, cy - r, cx + r, cy + r], start=40, end=200, fill=color, width=width)
    draw.arc([cx - r, cy - r, cx + r, cy + r], start=220, end=20, fill=color, width=width)
    head = max(3, size // 16)

    def arrow_at(deg: float) -> None:
        rad = math.radians(deg)
        x = cx + int(r * math.cos(rad))
        y = cy + int(r * math.sin(rad))
        tang = rad + math.pi / 2
        draw.polygon(
            [
                (x, y),
                (x - int(head * math.cos(tang - 0.55)), y - int(head * math.sin(tang - 0.55))),
                (x - int(head * math.cos(tang + 0.55)), y - int(head * math.sin(tang + 0.55))),
            ],
            fill=color,
        )

    arrow_at(40)
    arrow_at(220)


def key_chrome(draw: ImageDraw.ImageDraw, size: int, accent) -> None:
    draw.rectangle([0, 0, size, size], fill=NAVY)
    draw.rectangle([0, 0, size, int(size * 0.42)], fill=NAVY_SOFT)
    tick = max(2, size // 24)
    draw.rectangle([0, 0, tick * 3, tick], fill=accent)


def make_mono_category(size: int) -> Image.Image:
    def paint(draw, s):
        radar(draw, s, WHITE, s // 2, s // 2, int(s * 0.42), max(2, s // 14))
        cy = s // 2 + int(s * 0.18)
        draw.line(
            [(s // 2 - int(s * 0.18), cy), (s // 2 + int(s * 0.18), cy)],
            fill=WHITE,
            width=max(2, s // 16),
        )

    return supersample(paint, size)


def make_mono_stat(size: int) -> Image.Image:
    def paint(draw, s):
        m = int(s * 0.18)
        w = max(2, s // 12)
        draw.line([(m, m), (m, s - m)], fill=WHITE, width=w)
        draw.line([(m, s - m), (s - m, s - m)], fill=WHITE, width=w)
        bars = (0.45, 0.65, 0.85, 1.0)
        base = s - m
        max_h = s - 2 * m
        bw = max(2, s // 10)
        gap = max(1, s // 18)
        x = m + max(2, s // 10)
        for i, h in enumerate(bars):
            bh = int(max_h * h * 0.85)
            draw.rounded_rectangle(
                [x + i * (bw + gap), base - bh, x + i * (bw + gap) + bw, base],
                radius=max(1, bw // 3),
                fill=WHITE,
            )

    return supersample(paint, size)


def make_mono_summary(size: int) -> Image.Image:
    def paint(draw, s):
        m = int(s * 0.12)
        draw.rounded_rectangle(
            [m, m, s - m, s - m],
            radius=s // 6,
            outline=WHITE,
            width=max(2, s // 12),
        )
        radar(draw, s, WHITE, s // 2, s // 2, int(s * 0.28), max(2, s // 14))

    return supersample(paint, size)


def make_mono_refresh(size: int) -> Image.Image:
    def paint(draw, s):
        refresh_arrows(draw, s, WHITE, s // 2, s // 2, int(s * 0.34), max(2, s // 10))

    return supersample(paint, size)


def make_key_stat(size: int) -> Image.Image:
    def paint(draw, s):
        key_chrome(draw, s, SIGNAL)
        signal_bars(
            draw,
            s,
            SIGNAL,
            origin=(int(s * 0.28), int(s * 0.38)),
            bar_w=max(3, s // 14),
            gap=max(2, s // 28),
        )

    return supersample(paint, size)


def make_key_summary(size: int) -> Image.Image:
    def paint(draw, s):
        key_chrome(draw, s, SIGNAL)
        radar(draw, s, SIGNAL, s // 2, int(s * 0.30), int(s * 0.26), lw(s, 2.4))
        signal_bars(
            draw,
            s,
            SLATE,
            origin=(int(s * 0.62), int(s * 0.40)),
            bar_w=max(2, s // 18),
            gap=max(1, s // 40),
            heights=(0.4, 0.65, 0.9),
            max_h_frac=0.16,
        )

    return supersample(paint, size)


def make_key_refresh(size: int) -> Image.Image:
    def paint(draw, s):
        key_chrome(draw, s, SIGNAL)
        refresh_arrows(draw, s, SIGNAL, s // 2, int(s * 0.30), int(s * 0.18), lw(s, 2.6))

    return supersample(paint, size)


def make_key_wigle(size: int) -> Image.Image:
    def paint(draw, s):
        key_chrome(draw, s, TEAL)
        radar(draw, s, TEAL, s // 2, int(s * 0.30), int(s * 0.26), lw(s, 2.4))

    return supersample(paint, size)


def make_key_wdgwars(size: int) -> Image.Image:
    def paint(draw, s):
        key_chrome(draw, s, AMBER)
        cx = s // 2
        top = int(s * 0.10)
        bot = int(s * 0.42)
        left = int(s * 0.30)
        right = int(s * 0.70)
        w = lw(s, 2.4)
        path = [
            (cx, top),
            (right, int(s * 0.18)),
            (right - s // 36, int(s * 0.30)),
            (cx, bot),
            (left + s // 36, int(s * 0.30)),
            (left, int(s * 0.18)),
        ]
        draw.line(path + [path[0]], fill=AMBER, width=w)
        mid_y = int(s * 0.24)
        draw.line(
            [(int(s * 0.38), mid_y), (cx, int(s * 0.34)), (int(s * 0.62), mid_y)],
            fill=AMBER,
            width=w,
        )

    return supersample(paint, size)


def make_key_wardrift(size: int) -> Image.Image:
    def paint(draw, s):
        key_chrome(draw, s, BLUE)
        pts = [
            (int(s * 0.16), int(s * 0.34)),
            (int(s * 0.36), int(s * 0.18)),
            (int(s * 0.58), int(s * 0.30)),
            (int(s * 0.84), int(s * 0.14)),
        ]
        w = lw(s, 2.4)
        draw.line(pts, fill=BLUE, width=w, joint="curve")
        nr = max(2, s // 22)
        for x, y in pts:
            draw.ellipse([x - nr, y - nr, x + nr, y + nr], fill=BLUE)

    return supersample(paint, size)


def make_marketplace(size: int) -> Image.Image:
    def paint(draw, s):
        draw.rectangle([0, 0, s, s], fill=INK)
        m = int(s * 0.08)
        draw.rounded_rectangle(
            [m, m, s - m, s - m],
            radius=s // 8,
            outline=NAVY_SOFT,
            width=max(2, s // 48),
        )
        radar(draw, s, SIGNAL, s // 2, int(s * 0.46), int(s * 0.32), max(3, s // 28))
        y = int(s * 0.78)
        draw.line([(int(s * 0.28), y), (int(s * 0.72), y)], fill=SLATE, width=max(3, s // 40))
        signal_bars(
            draw,
            s,
            AMBER,
            origin=(int(s * 0.58), int(s * 0.70)),
            bar_w=max(4, s // 22),
            gap=max(3, s // 40),
            heights=(0.45, 0.7, 1.0),
            max_h_frac=0.14,
        )

    rgba = supersample(paint, size)
    rgb = Image.new("RGB", (size, size), INK[:3])
    rgb.paste(rgba, mask=rgba.split()[-1])
    return rgb


def write_pair(make_fn, base: Path, sizes: tuple[int, int]) -> None:
    one, two = sizes
    save(make_fn(one), Path(f"{base}.png"))
    save(make_fn(two), Path(f"{base}@2x.png"))


def main() -> None:
    write_pair(make_mono_category, PLUGIN / "plugin" / "category-icon", (28, 56))
    save(make_marketplace(288), PLUGIN / "plugin" / "marketplace.png")
    save(make_marketplace(512), PLUGIN / "plugin" / "marketplace@2x.png")

    write_pair(make_mono_stat, PLUGIN / "actions" / "stat" / "icon", (20, 40))
    write_pair(make_mono_summary, PLUGIN / "actions" / "platform-summary" / "icon", (20, 40))
    write_pair(make_mono_refresh, PLUGIN / "actions" / "refresh" / "icon", (20, 40))

    write_pair(make_key_stat, PLUGIN / "actions" / "stat" / "key", (72, 144))
    write_pair(make_key_summary, PLUGIN / "actions" / "platform-summary" / "key", (72, 144))
    write_pair(make_key_refresh, PLUGIN / "actions" / "refresh" / "key", (72, 144))

    write_pair(make_key_wigle, PLUGIN / "platforms" / "wigle" / "key", (72, 144))
    write_pair(make_key_wdgwars, PLUGIN / "platforms" / "wdgwars" / "key", (72, 144))
    write_pair(make_key_wardrift, PLUGIN / "platforms" / "wardrift" / "key", (72, 144))
    write_pair(make_key_refresh, PLUGIN / "platforms" / "all" / "key", (72, 144))


if __name__ == "__main__":
    main()

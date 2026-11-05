#!/usr/bin/env python3
"""Generate Wardeck Stream Deck icons — minimal monochrome geometric set.

Sizes follow Elgato plugin guidelines:
  category 28/56, action list 20/40, key 72/144, marketplace 288/512

Action-list / category: white stroke on transparent.
Key / marketplace: white/light strokes on near-black fields.
Platform distinction is by shape + line weight only (no color coding).
"""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw

PLUGIN = Path(__file__).resolve().parents[2] / "com.jazzactual.wardeck.sdPlugin" / "imgs"

# Monochrome — key-friendly dark field, light marks
INK = (12, 12, 14, 255)
INK_SOFT = (22, 22, 26, 255)
WHITE = (255, 255, 255, 255)
LIGHT = (230, 230, 232, 255)
DIM = (160, 160, 165, 255)
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


def lw(size: int, base: float) -> int:
    """Stroke width scaled from a 72px reference."""
    return max(1, round(size * base / 72))


def key_field(draw: ImageDraw.ImageDraw, size: int) -> None:
    draw.rectangle([0, 0, size, size], fill=INK)
    # subtle upper band — still monochrome, helps title contrast below
    draw.rectangle([0, 0, size, int(size * 0.40)], fill=INK_SOFT)


def radar(
    draw: ImageDraw.ImageDraw,
    color,
    cx: int,
    cy: int,
    max_r: int,
    width: int,
    arcs: tuple[float, ...] = (0.45, 0.72, 1.0),
    with_beam: bool = True,
) -> None:
    for frac in arcs:
        r = int(max_r * frac)
        draw.arc([cx - r, cy - r, cx + r, cy + r], start=220, end=40, fill=color, width=width)
    if with_beam:
        angle = math.radians(-40)
        draw.line(
            [(cx, cy), (cx + int(max_r * math.cos(angle)), cy + int(max_r * math.sin(angle)))],
            fill=color,
            width=width,
        )
    br = max(1, width)
    draw.ellipse([cx - br, cy - br, cx + br, cy + br], fill=color)


def bars(
    draw: ImageDraw.ImageDraw,
    color,
    origin: tuple[int, int],
    bar_w: int,
    gap: int,
    heights: tuple[float, ...],
    max_h: int,
) -> None:
    x0, y0 = origin
    for i, h in enumerate(heights):
        bh = max(2, int(max_h * h))
        x = x0 + i * (bar_w + gap)
        draw.rectangle([x, y0 - bh, x + bar_w, y0], fill=color)


def refresh_arrows(
    draw: ImageDraw.ImageDraw, color, cx: int, cy: int, r: int, width: int, head: int
) -> None:
    draw.arc([cx - r, cy - r, cx + r, cy + r], start=45, end=195, fill=color, width=width)
    draw.arc([cx - r, cy - r, cx + r, cy + r], start=225, end=15, fill=color, width=width)

    def arrow_at(deg: float) -> None:
        rad = math.radians(deg)
        x = cx + int(r * math.cos(rad))
        y = cy + int(r * math.sin(rad))
        tang = rad + math.pi / 2
        draw.polygon(
            [
                (x, y),
                (x - int(head * math.cos(tang - 0.6)), y - int(head * math.sin(tang - 0.6))),
                (x - int(head * math.cos(tang + 0.6)), y - int(head * math.sin(tang + 0.6))),
            ],
            fill=color,
        )

    arrow_at(45)
    arrow_at(225)


def shield(draw: ImageDraw.ImageDraw, color, size: int, width: int) -> None:
    """Compact angular shield in the upper title-safe zone — heavier stroke."""
    cx = size // 2
    top = int(size * 0.10)
    bot = int(size * 0.40)
    left = int(size * 0.32)
    right = int(size * 0.68)
    path = [
        (cx, top),
        (right, int(size * 0.18)),
        (right - size // 40, int(size * 0.28)),
        (cx, bot),
        (left + size // 40, int(size * 0.28)),
        (left, int(size * 0.18)),
    ]
    draw.line(path + [path[0]], fill=color, width=width)
    # single inner chevron — shape identity
    mid = int(size * 0.22)
    draw.line(
        [(int(size * 0.40), mid), (cx, int(size * 0.32)), (int(size * 0.60), mid)],
        fill=color,
        width=width,
    )


def route(draw: ImageDraw.ImageDraw, color, size: int, width: int) -> None:
    """Open polyline + hollow nodes — medium weight, distinct from radar/shield."""
    pts = [
        (int(size * 0.18), int(size * 0.34)),
        (int(size * 0.38), int(size * 0.16)),
        (int(size * 0.58), int(size * 0.30)),
        (int(size * 0.82), int(size * 0.14)),
    ]
    draw.line(pts, fill=color, width=width, joint="curve")
    nr = max(2, width + size // 36)
    for x, y in pts:
        # hollow nodes (ring) for shape contrast vs filled radar blip
        draw.ellipse([x - nr, y - nr, x + nr, y + nr], outline=color, width=max(1, width - 1))


# --- Mono list / category (transparent) ---


def make_mono_category(size: int) -> Image.Image:
    def paint(draw, s):
        radar(draw, WHITE, s // 2, s // 2, int(s * 0.40), max(2, s // 16), with_beam=True)
        y = s // 2 + int(s * 0.22)
        draw.line([(s // 2 - int(s * 0.16), y), (s // 2 + int(s * 0.16), y)], fill=WHITE, width=max(2, s // 18))

    return supersample(paint, size)


def make_mono_stat(size: int) -> Image.Image:
    def paint(draw, s):
        m = int(s * 0.16)
        w = max(2, s // 14)
        draw.line([(m, m), (m, s - m)], fill=WHITE, width=w)
        draw.line([(m, s - m), (s - m, s - m)], fill=WHITE, width=w)
        bw = max(2, s // 11)
        gap = max(1, s // 20)
        x = m + max(2, s // 12)
        base = s - m
        max_h = s - 2 * m
        for i, h in enumerate((0.4, 0.65, 0.5, 0.9)):
            bh = int(max_h * h * 0.85)
            draw.rectangle([x + i * (bw + gap), base - bh, x + i * (bw + gap) + bw, base], fill=WHITE)

    return supersample(paint, size)


def make_mono_summary(size: int) -> Image.Image:
    def paint(draw, s):
        m = int(s * 0.14)
        draw.rectangle([m, m, s - m, s - m], outline=WHITE, width=max(2, s // 14))
        # single center blip — quieter than full radar
        c = s // 2
        br = max(2, s // 10)
        draw.ellipse([c - br, c - br, c + br, c + br], outline=WHITE, width=max(2, s // 16))

    return supersample(paint, size)


def make_mono_refresh(size: int) -> Image.Image:
    def paint(draw, s):
        refresh_arrows(draw, WHITE, s // 2, s // 2, int(s * 0.32), max(2, s // 12), max(3, s // 8))

    return supersample(paint, size)


# --- Key tiles (dark + light) ---


def make_key_stat(size: int) -> Image.Image:
    def paint(draw, s):
        key_field(draw, s)
        # thin bars — metric feel
        bars(
            draw,
            LIGHT,
            origin=(int(s * 0.30), int(s * 0.36)),
            bar_w=max(2, lw(s, 3.5)),
            gap=max(2, lw(s, 2.5)),
            heights=(0.4, 0.65, 0.5, 0.95),
            max_h=int(s * 0.22),
        )

    return supersample(paint, size)


def make_key_summary(size: int) -> Image.Image:
    def paint(draw, s):
        key_field(draw, s)
        # light square frame + center blip (generic platform)
        m_x = int(s * 0.32)
        m_y = int(s * 0.10)
        w = lw(s, 1.8)
        draw.rectangle([m_x, m_y, s - m_x, int(s * 0.38)], outline=LIGHT, width=w)
        c = s // 2
        cy = int(s * 0.24)
        br = max(2, lw(s, 2.5))
        draw.ellipse([c - br, cy - br, c + br, cy + br], fill=LIGHT)

    return supersample(paint, size)


def make_key_refresh(size: int) -> Image.Image:
    def paint(draw, s):
        key_field(draw, s)
        refresh_arrows(
            draw,
            LIGHT,
            s // 2,
            int(s * 0.28),
            int(s * 0.16),
            lw(s, 2.2),
            max(3, lw(s, 4)),
        )

    return supersample(paint, size)


def make_key_wigle(size: int) -> Image.Image:
    """Thin multi-arc radar — densest linework, lightest stroke."""
    def paint(draw, s):
        key_field(draw, s)
        radar(
            draw,
            LIGHT,
            s // 2,
            int(s * 0.28),
            int(s * 0.24),
            lw(s, 1.5),
            arcs=(0.4, 0.7, 1.0),
            with_beam=True,
        )

    return supersample(paint, size)


def make_key_wdgwars(size: int) -> Image.Image:
    """Heavy angular shield — thickest stroke, fewest lines."""
    def paint(draw, s):
        key_field(draw, s)
        shield(draw, LIGHT, s, lw(s, 2.8))

    return supersample(paint, size)


def make_key_wardrift(size: int) -> Image.Image:
    """Medium polyline with hollow nodes — open path vs closed shield/radar."""
    def paint(draw, s):
        key_field(draw, s)
        route(draw, LIGHT, s, lw(s, 2.0))

    return supersample(paint, size)


def make_marketplace(size: int) -> Image.Image:
    def paint(draw, s):
        draw.rectangle([0, 0, s, s], fill=INK)
        # quiet inset frame
        m = int(s * 0.10)
        draw.rectangle([m, m, s - m, s - m], outline=DIM, width=max(2, s // 64))
        radar(
            draw,
            LIGHT,
            s // 2,
            int(s * 0.46),
            int(s * 0.28),
            max(2, s // 36),
            arcs=(0.45, 0.72, 1.0),
            with_beam=True,
        )
        # thin baseline — brand footing
        y = int(s * 0.78)
        draw.line([(int(s * 0.32), y), (int(s * 0.68), y)], fill=DIM, width=max(2, s // 64))

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

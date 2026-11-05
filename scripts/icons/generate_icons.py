#!/usr/bin/env python3
"""Generate Wardeck Stream Deck icons — three minimal monochrome marks only.

Marks: wifi · bluetooth · combo (wifi+bt)
Copied into category / marketplace / action / platform paths as needed.

Sizes: category 28/56, action list 20/40, key 72/144, marketplace 288/512
"""

from __future__ import annotations

import math
import shutil
from pathlib import Path

from PIL import Image, ImageDraw

PLUGIN = Path(__file__).resolve().parents[2] / "com.jazzactual.wardeck.sdPlugin" / "imgs"
MARKS = PLUGIN / "marks"

INK = (12, 12, 14, 255)
INK_SOFT = (22, 22, 26, 255)
LIGHT = (235, 235, 238, 255)
DIM = (170, 170, 175, 255)
WHITE = (255, 255, 255, 255)
CLEAR = (0, 0, 0, 0)


def save(img: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, "PNG", optimize=True)
    print(f"wrote {path.relative_to(PLUGIN.parents[1])} ({img.size[0]}x{img.size[1]})")


def supersample(draw_fn, size: int, scale: int = 4) -> Image.Image:
    big = Image.new("RGBA", (size * scale, size * scale), CLEAR)
    draw_fn(ImageDraw.Draw(big), size * scale)
    return big.resize((size, size), Image.Resampling.LANCZOS)


def lw(size: int, base: float) -> int:
    return max(1, round(size * base / 72))


def key_field(draw: ImageDraw.ImageDraw, size: int) -> None:
    draw.rectangle([0, 0, size, size], fill=INK)
    draw.rectangle([0, 0, size, int(size * 0.40)], fill=INK_SOFT)


def draw_wifi(
    draw: ImageDraw.ImageDraw,
    color,
    cx: int,
    cy: int,
    max_r: int,
    width: int,
    arcs: tuple[float, ...] = (0.45, 0.72, 1.0),
) -> None:
    """Classic Wi‑Fi fan: concentric upper arcs + center dot."""
    for frac in arcs:
        r = int(max_r * frac)
        draw.arc([cx - r, cy - r, cx + r, cy + r], start=225, end=315, fill=color, width=width)
    br = max(1, width)
    draw.ellipse([cx - br, cy - br, cx + br, cy + br], fill=color)


def draw_bluetooth(draw: ImageDraw.ImageDraw, color, cx: int, cy: int, h: int, width: int) -> None:
    """Minimal Bluetooth rune: one polyline (stem + right tips + cross arms)."""
    half = h // 2
    tip_w = int(h * 0.38)
    top = (cx, cy - half)
    mid = (cx, cy)
    bot = (cx, cy + half)
    ur = (cx + tip_w, cy - half // 2)
    lr = (cx + tip_w, cy + half // 2)
    ul = (cx - tip_w, cy - half // 2)
    ll = (cx - tip_w, cy + half // 2)
    # single continuous rune path
    draw.line([ul, lr, top, bot, ur, ll], fill=color, width=width, joint="curve")
    # stem (ensures solid vertical through joints)
    draw.line([top, bot], fill=color, width=width)


def make_mono_wifi(size: int) -> Image.Image:
    def paint(draw, s):
        draw_wifi(draw, WHITE, s // 2, int(s * 0.62), int(s * 0.42), max(2, s // 14))

    return supersample(paint, size)


def make_mono_bluetooth(size: int) -> Image.Image:
    def paint(draw, s):
        draw_bluetooth(draw, WHITE, s // 2, s // 2, int(s * 0.62), max(2, s // 12))

    return supersample(paint, size)


def make_mono_combo(size: int) -> Image.Image:
    def paint(draw, s):
        # wifi left-of-center, compact BT right
        draw_wifi(draw, WHITE, int(s * 0.38), int(s * 0.62), int(s * 0.32), max(2, s // 16))
        draw_bluetooth(draw, WHITE, int(s * 0.72), int(s * 0.48), int(s * 0.42), max(2, s // 14))

    return supersample(paint, size)


def make_key_wifi(size: int) -> Image.Image:
    def paint(draw, s):
        key_field(draw, s)
        draw_wifi(draw, LIGHT, s // 2, int(s * 0.34), int(s * 0.22), lw(s, 2.0))

    return supersample(paint, size)


def make_key_bluetooth(size: int) -> Image.Image:
    def paint(draw, s):
        key_field(draw, s)
        draw_bluetooth(draw, LIGHT, s // 2, int(s * 0.26), int(s * 0.28), lw(s, 2.2))

    return supersample(paint, size)


def make_key_combo(size: int) -> Image.Image:
    def paint(draw, s):
        key_field(draw, s)
        draw_wifi(draw, LIGHT, int(s * 0.36), int(s * 0.34), int(s * 0.18), lw(s, 1.8))
        draw_bluetooth(draw, LIGHT, int(s * 0.70), int(s * 0.26), int(s * 0.22), lw(s, 2.0))

    return supersample(paint, size)


def make_marketplace(size: int) -> Image.Image:
    def paint(draw, s):
        draw.rectangle([0, 0, s, s], fill=INK)
        m = int(s * 0.10)
        draw.rectangle([m, m, s - m, s - m], outline=DIM, width=max(2, s // 64))
        # combo centered
        draw_wifi(draw, LIGHT, int(s * 0.40), int(s * 0.55), int(s * 0.26), max(2, s // 36))
        draw_bluetooth(draw, LIGHT, int(s * 0.68), int(s * 0.42), int(s * 0.28), max(2, s // 32))

    rgba = supersample(paint, size)
    rgb = Image.new("RGB", (size, size), INK[:3])
    rgb.paste(rgba, mask=rgba.split()[-1])
    return rgb


def write_pair(make_fn, base: Path, sizes: tuple[int, int]) -> None:
    save(make_fn(sizes[0]), Path(f"{base}.png"))
    save(make_fn(sizes[1]), Path(f"{base}@2x.png"))


def copy_pair(src_base: Path, dst_base: Path) -> None:
    dst_base.parent.mkdir(parents=True, exist_ok=True)
    for suffix in (".png", "@2x.png"):
        src = Path(f"{src_base}{suffix}")
        dst = Path(f"{dst_base}{suffix}")
        shutil.copy2(src, dst)
        print(f"copy  {dst.relative_to(PLUGIN.parents[1])}")


def main() -> None:
    # Canonical three marks
    write_pair(make_mono_wifi, MARKS / "wifi" / "icon", (20, 40))
    write_pair(make_mono_bluetooth, MARKS / "bluetooth" / "icon", (20, 40))
    write_pair(make_mono_combo, MARKS / "combo" / "icon", (20, 40))
    write_pair(make_key_wifi, MARKS / "wifi" / "key", (72, 144))
    write_pair(make_key_bluetooth, MARKS / "bluetooth" / "key", (72, 144))
    write_pair(make_key_combo, MARKS / "combo" / "key", (72, 144))

    # Category = wifi mono at category sizes
    write_pair(make_mono_wifi, PLUGIN / "plugin" / "category-icon", (28, 56))
    save(make_marketplace(288), PLUGIN / "plugin" / "marketplace.png")
    save(make_marketplace(512), PLUGIN / "plugin" / "marketplace@2x.png")

    # Action defaults: stat=wifi, summary=combo, refresh=combo
    copy_pair(MARKS / "wifi" / "icon", PLUGIN / "actions" / "stat" / "icon")
    copy_pair(MARKS / "wifi" / "key", PLUGIN / "actions" / "stat" / "key")
    copy_pair(MARKS / "combo" / "icon", PLUGIN / "actions" / "platform-summary" / "icon")
    copy_pair(MARKS / "combo" / "key", PLUGIN / "actions" / "platform-summary" / "key")
    copy_pair(MARKS / "combo" / "icon", PLUGIN / "actions" / "refresh" / "icon")
    copy_pair(MARKS / "combo" / "key", PLUGIN / "actions" / "refresh" / "key")

    # Platform runtime keys (reuse marks only)
    copy_pair(MARKS / "wifi" / "key", PLUGIN / "platforms" / "wigle" / "key")
    copy_pair(MARKS / "combo" / "key", PLUGIN / "platforms" / "wdgwars" / "key")
    copy_pair(MARKS / "wifi" / "key", PLUGIN / "platforms" / "wardrift" / "key")
    copy_pair(MARKS / "combo" / "key", PLUGIN / "platforms" / "all" / "key")
    # BLE-specific path for stat metric
    copy_pair(MARKS / "bluetooth" / "key", PLUGIN / "platforms" / "bluetooth" / "key")


if __name__ == "__main__":
    main()

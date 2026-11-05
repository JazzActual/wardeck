#!/usr/bin/env python3
"""Generate Wardeck Stream Deck icons — three minimal monochrome marks only.

Marks: wifi · bluetooth · combo (wifi+bt)
Bluetooth uses the standard ᛒ rune via SVG (cairosvg); wifi is drawn with Pillow.
Copied into category / marketplace / action / platform paths as needed.

Sizes: category 28/56, action list 20/40, key 72/144, marketplace 288/512

Requires: Pillow, cairosvg
"""

from __future__ import annotations

import shutil
from io import BytesIO
from pathlib import Path

import cairosvg
from PIL import Image, ImageDraw

PLUGIN = Path(__file__).resolve().parents[2] / "com.jazzactual.wardeck.sdPlugin" / "imgs"
MARKS = PLUGIN / "marks"

INK = (12, 12, 14, 255)
INK_SOFT = (22, 22, 26, 255)
LIGHT = (235, 235, 238, 255)
DIM = (170, 170, 175, 255)
WHITE = (255, 255, 255, 255)
CLEAR = (0, 0, 0, 0)

# Standard Bluetooth rune (stem + right B triangles + left X arms), pointed miter tips.
BT_SVG = """\
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">
  <path d="M24 4 V44 M24 4 L36 16 L24 24 L36 32 L24 44 M36 16 L12 32 M36 32 L12 16"
        stroke="{color}" stroke-width="{stroke}" stroke-linecap="butt"
        stroke-linejoin="miter" stroke-miterlimit="10"/>
</svg>
"""


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


def bluetooth_glyph(size: int, color: str = "#EBEBEE", stroke: float = 3.2) -> Image.Image:
    """Rasterize the standard Bluetooth rune into a transparent RGBA square."""
    svg = BT_SVG.format(color=color, stroke=stroke)
    png = cairosvg.svg2png(bytestring=svg.encode(), output_width=size, output_height=size)
    return Image.open(BytesIO(png)).convert("RGBA")


def paste_center(base: Image.Image, glyph: Image.Image, cx: int, cy: int) -> None:
    x = int(cx - glyph.width / 2)
    y = int(cy - glyph.height / 2)
    base.alpha_composite(glyph, (x, y))


def make_mono_wifi(size: int) -> Image.Image:
    def paint(draw, s):
        draw_wifi(draw, WHITE, s // 2, int(s * 0.62), int(s * 0.42), max(2, s // 14))

    return supersample(paint, size)


def make_mono_bluetooth(size: int) -> Image.Image:
    # Slightly inset so stroke isn't clipped; white on transparent
    g = bluetooth_glyph(max(size - 2, 8), color="#FFFFFF", stroke=3.6)
    g = g.resize((size, size), Image.Resampling.LANCZOS)
    return g


def make_mono_combo(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), CLEAR)
    # wifi via supersampled draw into temp
    wifi = supersample(
        lambda d, s: draw_wifi(d, WHITE, int(s * 0.38), int(s * 0.62), int(s * 0.30), max(2, s // 16)),
        size,
    )
    img.alpha_composite(wifi)
    bt = bluetooth_glyph(max(int(size * 0.55), 8), color="#FFFFFF", stroke=3.4)
    paste_center(img, bt, int(size * 0.72), int(size * 0.48))
    return img


def make_key_wifi(size: int) -> Image.Image:
    def paint(draw, s):
        key_field(draw, s)
        draw_wifi(draw, LIGHT, s // 2, int(s * 0.34), int(s * 0.22), lw(s, 2.0))

    return supersample(paint, size)


def make_key_bluetooth(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), CLEAR)
    draw = ImageDraw.Draw(img)
    key_field(draw, size)
    # Glyph sized for upper title-safe zone — bold standard rune
    gsize = int(size * 0.50)
    bt = bluetooth_glyph(gsize, color="#EBEBEE", stroke=3.6)
    paste_center(img, bt, size // 2, int(size * 0.28))
    return img


def make_key_combo(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), CLEAR)
    draw = ImageDraw.Draw(img)
    key_field(draw, size)
    # wifi left
    tmp = Image.new("RGBA", (size, size), CLEAR)
    td = ImageDraw.Draw(tmp)
    draw_wifi(td, LIGHT, int(size * 0.32), int(size * 0.34), int(size * 0.16), lw(size, 1.8))
    img.alpha_composite(tmp)
    # same standard BT rune as standalone mark
    gsize = int(size * 0.36)
    bt = bluetooth_glyph(gsize, color="#EBEBEE", stroke=3.6)
    paste_center(img, bt, int(size * 0.72), int(size * 0.28))
    return img


def make_marketplace(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), CLEAR)
    draw = ImageDraw.Draw(img)
    draw.rectangle([0, 0, size, size], fill=INK)
    m = int(size * 0.10)
    draw.rectangle([m, m, size - m, size - m], outline=DIM, width=max(2, size // 64))
    tmp = Image.new("RGBA", (size, size), CLEAR)
    td = ImageDraw.Draw(tmp)
    draw_wifi(td, LIGHT, int(size * 0.38), int(size * 0.52), int(size * 0.22), max(2, size // 40))
    img.alpha_composite(tmp)
    gsize = int(size * 0.28)
    bt = bluetooth_glyph(gsize, color="#EBEBEE", stroke=3.2)
    paste_center(img, bt, int(size * 0.68), int(size * 0.42))
    rgb = Image.new("RGB", (size, size), INK[:3])
    rgb.paste(img, mask=img.split()[-1])
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
    write_pair(make_mono_wifi, MARKS / "wifi" / "icon", (20, 40))
    write_pair(make_mono_bluetooth, MARKS / "bluetooth" / "icon", (20, 40))
    write_pair(make_mono_combo, MARKS / "combo" / "icon", (20, 40))
    write_pair(make_key_wifi, MARKS / "wifi" / "key", (72, 144))
    write_pair(make_key_bluetooth, MARKS / "bluetooth" / "key", (72, 144))
    write_pair(make_key_combo, MARKS / "combo" / "key", (72, 144))

    write_pair(make_mono_wifi, PLUGIN / "plugin" / "category-icon", (28, 56))
    save(make_marketplace(288), PLUGIN / "plugin" / "marketplace.png")
    save(make_marketplace(512), PLUGIN / "plugin" / "marketplace@2x.png")

    copy_pair(MARKS / "wifi" / "icon", PLUGIN / "actions" / "stat" / "icon")
    copy_pair(MARKS / "wifi" / "key", PLUGIN / "actions" / "stat" / "key")
    copy_pair(MARKS / "combo" / "icon", PLUGIN / "actions" / "platform-summary" / "icon")
    copy_pair(MARKS / "combo" / "key", PLUGIN / "actions" / "platform-summary" / "key")
    copy_pair(MARKS / "combo" / "icon", PLUGIN / "actions" / "refresh" / "icon")
    copy_pair(MARKS / "combo" / "key", PLUGIN / "actions" / "refresh" / "key")

    copy_pair(MARKS / "wifi" / "key", PLUGIN / "platforms" / "wigle" / "key")
    copy_pair(MARKS / "combo" / "key", PLUGIN / "platforms" / "wdgwars" / "key")
    copy_pair(MARKS / "wifi" / "key", PLUGIN / "platforms" / "wardrift" / "key")
    copy_pair(MARKS / "combo" / "key", PLUGIN / "platforms" / "all" / "key")
    copy_pair(MARKS / "bluetooth" / "key", PLUGIN / "platforms" / "bluetooth" / "key")


if __name__ == "__main__":
    main()

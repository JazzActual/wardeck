#!/usr/bin/env python3
"""Generate Wardeck Stream Deck icons from Lucide (lucide-static, ISC).

Marks (all Lucide; combo = wifi + bluetooth compose):
  wifi · bluetooth · combo · radio · podium · car · calendar · swords · coins · biceps-flexed · zap · user-round-group · plane · network · award · radio-tower

Sizes: category 28/56, action list 20/40, key 72/144, marketplace 288/512

Requires: Pillow, cairosvg, and lucide-static installed via npm
  (node_modules/lucide-static/icons/*.svg).
"""

from __future__ import annotations

import shutil
from io import BytesIO
from pathlib import Path

import cairosvg
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
PLUGIN = ROOT / "com.jazzactual.wardeck.sdPlugin" / "imgs"
MARKS = PLUGIN / "marks"
LUCIDE = ROOT / "node_modules" / "lucide-static" / "icons"

INK = (12, 12, 14, 255)
INK_SOFT = (22, 22, 26, 255)
LIGHT = "#EBEBEE"
DIM = (170, 170, 175, 255)
WHITE = "#FFFFFF"
CLEAR = (0, 0, 0, 0)

# Glyph height on a 72px key (≈78 on 320 preview canvas).
KEY_GLYPH_FRAC = 78 / 320

SINGLE_MARKS = (
    "wifi",
    "bluetooth",
    "radio",
    "podium",
    "car",
    "calendar",
    "swords",
    "coins",
    "biceps-flexed",
    "zap",
    "user-round-group",
    "plane",
    "network",
    "award",
    "radio-tower",
)


def save(img: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, "PNG", optimize=True)
    print(f"wrote {path.relative_to(PLUGIN.parents[1])} ({img.size[0]}x{img.size[1]})")


def key_field(draw: ImageDraw.ImageDraw, size: int) -> None:
    draw.rectangle([0, 0, size, size], fill=INK)
    draw.rectangle([0, 0, size, int(size * 0.40)], fill=INK_SOFT)


def content_bbox(im: Image.Image, alpha_min: int = 24) -> tuple[int, int, int, int]:
    alpha = im.split()[-1]
    mask = alpha.point(lambda a: 255 if a >= alpha_min else 0)
    box = mask.getbbox()
    if box is None:
        return (0, 0, im.width, im.height)
    return box


def crop_content(im: Image.Image) -> Image.Image:
    l, t, r, b = content_bbox(im)
    return im.crop((l, t, r, b))


def fit_height(im: Image.Image, target_h: int) -> Image.Image:
    cropped = crop_content(im)
    if cropped.height <= 0:
        return cropped
    scale = target_h / cropped.height
    new_w = max(1, round(cropped.width * scale))
    return cropped.resize((new_w, target_h), Image.Resampling.LANCZOS)


def paste_center(base: Image.Image, glyph: Image.Image, cx: int, cy: int) -> None:
    x = int(cx - glyph.width / 2)
    y = int(cy - glyph.height / 2)
    base.alpha_composite(glyph, (x, y))


def lucide_svg(name: str, stroke: str) -> str:
    path = LUCIDE / f"{name}.svg"
    if not path.exists():
        raise FileNotFoundError(
            f"Missing Lucide SVG {path}. Run: npm install (lucide-static required)."
        )
    return path.read_text().replace('stroke="currentColor"', f'stroke="{stroke}"')


def raster_lucide(name: str, out_size: int, stroke: str = LIGHT) -> Image.Image:
    svg = lucide_svg(name, stroke)
    png = cairosvg.svg2png(bytestring=svg.encode(), output_width=out_size, output_height=out_size)
    return Image.open(BytesIO(png)).convert("RGBA")


def lucide_fitted(name: str, target_h: int, stroke: str = LIGHT) -> Image.Image:
    raw = raster_lucide(name, out_size=max(target_h * 4, 64), stroke=stroke)
    return fit_height(raw, target_h)


def make_mono(name: str, size: int) -> Image.Image:
    target_h = max(1, int(size * 0.72))
    glyph = lucide_fitted(name, target_h, stroke=WHITE)
    out = Image.new("RGBA", (size, size), CLEAR)
    paste_center(out, glyph, size // 2, size // 2)
    return out


def make_mono_combo(size: int) -> Image.Image:
    target_h = max(1, int(size * 0.62))
    wifi = lucide_fitted("wifi", target_h, stroke=WHITE)
    bt = lucide_fitted("bluetooth", target_h, stroke=WHITE)
    gap = max(2, size // 10)
    total_w = wifi.width + gap + bt.width
    out = Image.new("RGBA", (size, size), CLEAR)
    left = (size - total_w) // 2
    paste_center(out, wifi, left + wifi.width // 2, size // 2)
    paste_center(out, bt, left + wifi.width + gap + bt.width // 2, size // 2)
    return out


def make_key(name: str, size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), CLEAR)
    draw = ImageDraw.Draw(img)
    key_field(draw, size)
    gh = max(1, round(size * KEY_GLYPH_FRAC))
    glyph = lucide_fitted(name, gh, stroke=LIGHT)
    paste_center(img, glyph, size // 2, int(size * 0.30))
    return img


def make_key_combo(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), CLEAR)
    draw = ImageDraw.Draw(img)
    key_field(draw, size)
    gh = max(1, round(size * KEY_GLYPH_FRAC))
    wifi = lucide_fitted("wifi", gh, stroke=LIGHT)
    bt = lucide_fitted("bluetooth", gh, stroke=LIGHT)
    gap = max(4, int(size * 0.04))
    total_w = wifi.width + gap + bt.width
    left = (size - total_w) // 2
    cy = int(size * 0.30)
    paste_center(img, wifi, left + wifi.width // 2, cy)
    paste_center(img, bt, left + wifi.width + gap + bt.width // 2, cy)
    return img


def make_marketplace(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), CLEAR)
    draw = ImageDraw.Draw(img)
    draw.rectangle([0, 0, size, size], fill=INK)
    m = int(size * 0.10)
    draw.rectangle([m, m, size - m, size - m], outline=DIM, width=max(2, size // 64))
    gh = max(1, int(size * 0.36))
    wifi = lucide_fitted("wifi", gh, stroke=LIGHT)
    bt = lucide_fitted("bluetooth", gh, stroke=LIGHT)
    gap = max(8, int(size * 0.04))
    total_w = wifi.width + gap + bt.width
    left = (size - total_w) // 2
    cy = size // 2
    paste_center(img, wifi, left + wifi.width // 2, cy)
    paste_center(img, bt, left + wifi.width + gap + bt.width // 2, cy)
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
    if not LUCIDE.is_dir():
        raise SystemExit(
            f"lucide-static icons not found at {LUCIDE}. Run npm install first."
        )

    for name in SINGLE_MARKS:
        write_pair(lambda s, n=name: make_mono(n, s), MARKS / name / "icon", (20, 40))
        write_pair(lambda s, n=name: make_key(n, s), MARKS / name / "key", (72, 144))

    write_pair(make_mono_combo, MARKS / "combo" / "icon", (20, 40))
    write_pair(make_key_combo, MARKS / "combo" / "key", (72, 144))

    write_pair(lambda s: make_mono("wifi", s), PLUGIN / "plugin" / "category-icon", (28, 56))
    save(make_marketplace(288), PLUGIN / "plugin" / "marketplace.png")
    save(make_marketplace(512), PLUGIN / "plugin" / "marketplace@2x.png")

    copy_pair(MARKS / "wifi" / "icon", PLUGIN / "actions" / "stat" / "icon")
    copy_pair(MARKS / "wifi" / "key", PLUGIN / "actions" / "stat" / "key")
    copy_pair(MARKS / "radio" / "icon", PLUGIN / "actions" / "platform-summary" / "icon")
    copy_pair(MARKS / "radio" / "key", PLUGIN / "actions" / "platform-summary" / "key")
    copy_pair(MARKS / "combo" / "icon", PLUGIN / "actions" / "refresh" / "icon")
    copy_pair(MARKS / "combo" / "key", PLUGIN / "actions" / "refresh" / "key")
    copy_pair(MARKS / "wifi" / "icon", PLUGIN / "actions" / "wardrift-banner" / "icon")
    copy_pair(MARKS / "wifi" / "key", PLUGIN / "actions" / "wardrift-banner" / "key")
    copy_pair(MARKS / "wifi" / "icon", PLUGIN / "actions" / "wigle-banner" / "icon")
    copy_pair(MARKS / "wifi" / "key", PLUGIN / "actions" / "wigle-banner" / "key")
    copy_pair(MARKS / "combo" / "icon", PLUGIN / "actions" / "wdgwars-banner" / "icon")
    copy_pair(MARKS / "combo" / "key", PLUGIN / "actions" / "wdgwars-banner" / "key")

    copy_pair(MARKS / "radio" / "key", PLUGIN / "platforms" / "wigle" / "key")
    copy_pair(MARKS / "radio" / "key", PLUGIN / "platforms" / "wdgwars" / "key")
    copy_pair(MARKS / "radio" / "key", PLUGIN / "platforms" / "wardrift" / "key")
    copy_pair(MARKS / "combo" / "key", PLUGIN / "platforms" / "all" / "key")
    copy_pair(MARKS / "bluetooth" / "key", PLUGIN / "platforms" / "bluetooth" / "key")


if __name__ == "__main__":
    main()

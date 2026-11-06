#!/usr/bin/env python3
"""Generate before/after keypad thirds preview PNGs.

After layout mirrors src/key/render.ts (icon / label / value thirds).
Before approximates the old soft-band glyph + title-overlay stack.
"""

from __future__ import annotations

import json
import sys
from io import BytesIO
from pathlib import Path

import cairosvg
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_OUT = (
    Path.home()
    / "Library/Application Support/Cursor/AgentStores/cursor_agent_stores"
    / "bc-e185232c-58f1-4aea-b6a1-490d410f4534/files/media"
)

SIZE = 144
BG = "#0c0c0e"
BAND = "#16161a"
INK = "#ebebee"
DIM = "#c4c4c8"
FONT = "system-ui, -apple-system, Segoe UI, sans-serif"

MARK_PATHS: dict[str, str] = {
    "wifi": (
        '<path d="M12 20h.01"/>'
        '<path d="M2 8.82a15 15 0 0 1 20 0"/>'
        '<path d="M5 12.859a10 10 0 0 1 14 0"/>'
        '<path d="M8.5 16.429a5 5 0 0 1 7 0"/>'
    ),
    "podium": (
        '<path d="M12 6V2h-1"/>'
        '<path d="M9 15a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1"/>'
        '<path d="M9 21V11a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v10"/>'
    ),
    "network": (
        '<rect x="16" y="16" width="6" height="6" rx="1"/>'
        '<rect x="2" y="16" width="6" height="6" rx="1"/>'
        '<rect x="9" y="2" width="6" height="6" rx="1"/>'
        '<path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/>'
        '<path d="M12 12V8"/>'
    ),
    "radio": (
        '<path d="M16.247 7.761a6 6 0 0 1 0 8.478"/>'
        '<path d="M19.075 4.933a10 10 0 0 1 0 14.134"/>'
        '<path d="M4.925 19.067a10 10 0 0 1 0-14.134"/>'
        '<path d="M7.753 16.239a6 6 0 0 1 0-8.478"/>'
        '<circle cx="12" cy="12" r="2"/>'
    ),
    "plane": (
        '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>'
    ),
    "award": (
        '<path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526"/>'
        '<circle cx="12" cy="8" r="6"/>'
    ),
    "radio-tower": (
        '<path d="M4.9 16.1C1 12.2 1 5.8 4.9 1.9"/>'
        '<path d="M7.8 4.7a6.14 6.14 0 0 0-.8 7.5"/>'
        '<circle cx="12" cy="9" r="2"/>'
        '<path d="M16.2 4.8c2 2 2.26 5.11.8 7.47"/>'
        '<path d="M19.1 1.9a9.96 9.96 0 0 1 0 14.1"/>'
        '<path d="M9.5 18h5"/>'
        '<path d="m8 22 4-11 4 11"/>'
    ),
}

SAMPLES = [
    {"id": "mesh", "mark": "network", "label": "Mesh", "value": "128"},
    {"id": "month-rank", "mark": "podium", "label": "Mo Rank", "value": "42"},
    {"id": "wifi", "mark": "wifi", "label": "WiFi", "value": "48.3k"},
    {"id": "summary-wigle", "mark": "radio", "label": "WiGLE", "value": "48.3k"},
    {"id": "summary-wdgwars", "mark": "radio", "label": "WDGWars", "value": "1.2k"},
    {"id": "summary-wardrift", "mark": "radio", "label": "Wardrift", "value": "9.4k"},
    {"id": "aircraft", "mark": "plane", "label": "Aircraft", "value": "17"},
    {"id": "rank", "mark": "podium", "label": "Rank", "value": "318"},
    {"id": "total", "mark": "radio", "label": "Total", "value": "1.2k"},
    {"id": "networks", "mark": "radio", "label": "Networks", "value": "9.4k"},
    {"id": "badges", "mark": "award", "label": "Badges", "value": "6"},
    {"id": "cell", "mark": "radio-tower", "label": "Cell", "value": "812"},
]


def esc(value: str) -> str:
    return (
        value.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def glyph_group(mark: str, cx: float, cy: float, glyph_size: float) -> str:
    paths = MARK_PATHS[mark]
    scale = glyph_size / 24
    x = cx - glyph_size / 2
    y = cy - glyph_size / 2
    return (
        f'<g transform="translate({x} {y}) scale({scale})" fill="none" '
        f'stroke="{INK}" stroke-width="2" stroke-linecap="round" '
        f'stroke-linejoin="round">{paths}</g>'
    )


def after_svg(sample: dict) -> str:
    """Mirrors src/key/render.ts thirds composition."""
    size = SIZE
    third = size / 3
    glyph_size = third * 0.62
    mid_x = size / 2
    glyph = glyph_group(sample["mark"], mid_x, third / 2, glyph_size)
    label_y = third + third / 2 + size * 0.02
    value_y = third * 2 + third / 2 + size * 0.04
    label_size = size * 0.105
    value_size = size * 0.175
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 {size} {size}">
<rect width="{size}" height="{size}" fill="{BG}"/>
<rect width="{size}" height="{third}" fill="{BAND}"/>
{glyph}
<text x="{mid_x}" y="{label_y}" fill="{DIM}" font-family="{FONT}" font-size="{label_size}" font-weight="600" text-anchor="middle" dominant-baseline="middle">{esc(sample["label"])}</text>
<text x="{mid_x}" y="{value_y}" fill="{INK}" font-family="{FONT}" font-size="{value_size}" font-weight="700" text-anchor="middle" dominant-baseline="middle">{esc(sample["value"])}</text>
</svg>"""


def before_svg(sample: dict) -> str:
    """Old soft top-band (~40%) + title overlay stacking label/value low on the key."""
    size = SIZE
    soft = size * 0.4
    gh = 48
    cy = size * 0.3
    glyph = glyph_group(sample["mark"], size / 2, cy, gh)
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 {size} {size}">
<rect width="{size}" height="{size}" fill="{BG}"/>
<rect width="{size}" height="{soft}" fill="{BAND}"/>
{glyph}
<text x="{size / 2}" y="{size * 0.72}" fill="{DIM}" font-family="{FONT}" font-size="13" font-weight="600" text-anchor="middle">{esc(sample["label"])}</text>
<text x="{size / 2}" y="{size * 0.88}" fill="{INK}" font-family="{FONT}" font-size="20" font-weight="700" text-anchor="middle">{esc(sample["value"])}</text>
</svg>"""


def raster(svg: str) -> Image.Image:
    png = cairosvg.svg2png(bytestring=svg.encode(), output_width=SIZE, output_height=SIZE)
    return Image.open(BytesIO(png)).convert("RGBA")


def sheet(kind: str, title: str, faces: dict[str, Image.Image]) -> Image.Image:
    gap = 16
    cols = 4
    rows = (len(SAMPLES) + cols - 1) // cols
    label_h = 28
    header_h = 56
    panel_w = cols * SIZE + (cols + 1) * gap
    panel_h = header_h + rows * (SIZE + label_h + gap) + gap
    canvas = Image.new("RGB", (panel_w, panel_h), (18, 18, 22))
    draw = ImageDraw.Draw(canvas)
    draw.text((gap, 18), title, fill=(235, 235, 238))
    draw.text((gap, 36), "Wardeck key alignment · v1", fill=(150, 150, 155))
    for i, sample in enumerate(SAMPLES):
        r, c = divmod(i, cols)
        x = gap + c * (SIZE + gap)
        y = header_h + r * (SIZE + label_h + gap)
        im = faces[f"{kind}:{sample['id']}"]
        canvas.paste(im, (x, y), im)
        draw.text((x, y + SIZE + 6), sample["label"], fill=(180, 180, 185))
    return canvas


def main() -> None:
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_OUT
    out.mkdir(parents=True, exist_ok=True)

    faces: dict[str, Image.Image] = {}
    for sample in SAMPLES:
        faces[f"before:{sample['id']}"] = raster(before_svg(sample))
        faces[f"after:{sample['id']}"] = raster(after_svg(sample))

    before = sheet("before", "BEFORE — title overlay (label/value) + soft top band", faces)
    after = sheet("after", "AFTER — baked thirds (icon / label / value)", faces)
    gap = 16
    comp = Image.new("RGB", (before.width * 2 + gap, before.height), (12, 12, 14))
    comp.paste(before, (0, 0))
    comp.paste(after, (before.width + gap, 0))

    before.save(out / "key-align-before-v1.png", "PNG", optimize=True)
    after.save(out / "key-align-after-v1.png", "PNG", optimize=True)
    comp.save(out / "key-align-comparison-v1.png", "PNG", optimize=True)

    spot_ids = ["mesh", "month-rank", "wifi", "summary-wigle"]
    spot_w = len(spot_ids) * (SIZE + gap) + gap
    spot_h = SIZE * 2 + gap * 3 + 48
    spot = Image.new("RGB", (spot_w, spot_h), (12, 12, 14))
    sd = ImageDraw.Draw(spot)
    sd.text((gap, 12), "Spotlight: Mesh · Mo Rank · WiFi · WiGLE Summary", fill=(235, 235, 238))
    sd.text((gap, 28), "Top row BEFORE · Bottom row AFTER", fill=(150, 150, 155))
    for i, sid in enumerate(spot_ids):
        x = gap + i * (SIZE + gap)
        b = faces[f"before:{sid}"]
        a = faces[f"after:{sid}"]
        spot.paste(b, (x, 48), b)
        spot.paste(a, (x, 48 + SIZE + gap), a)
    spot.save(out / "key-align-mesh-v1.png", "PNG", optimize=True)

    faces["before:mesh"].save(out / "key-align-mesh-before-v1.png")
    faces["after:mesh"].save(out / "key-align-mesh-after-v1.png")
    faces["before:month-rank"].save(out / "key-align-month-rank-before-v1.png")
    faces["after:month-rank"].save(out / "key-align-month-rank-after-v1.png")

    # Mirror under artifacts/cursor/stores/self/media when that tree exists next to media/.
    artifacts = out.parent / "artifacts" / "cursor" / "stores" / "self" / "media"
    if out.name == "media" and out.parent.exists():
        artifacts.mkdir(parents=True, exist_ok=True)
        for name in (
            "key-align-before-v1.png",
            "key-align-after-v1.png",
            "key-align-comparison-v1.png",
            "key-align-mesh-v1.png",
            "key-align-mesh-before-v1.png",
            "key-align-mesh-after-v1.png",
            "key-align-month-rank-before-v1.png",
            "key-align-month-rank-after-v1.png",
        ):
            src = out / name
            if src.exists():
                (artifacts / name).write_bytes(src.read_bytes())

    print(json.dumps({"out": str(out), "samples": len(SAMPLES)}))


if __name__ == "__main__":
    main()

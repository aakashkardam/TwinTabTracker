#!/usr/bin/env python3
"""Generate original TwinTabTracker PNG icons."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "icons"

TEAL = (15, 110, 106, 255)
TEAL_DARK = (10, 78, 75, 255)
WHITE = (255, 255, 255, 255)
MINT = (214, 239, 237, 255)
AMBER = (245, 158, 11, 255)


def draw_icon(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    pad = max(1, size // 16)
    radius = max(3, size // 5)
    draw.rounded_rectangle(
        (pad, pad, size - pad, size - pad),
        radius=radius,
        fill=TEAL,
        outline=TEAL_DARK,
        width=max(1, size // 32),
    )

    tab_w = int(size * 0.46)
    tab_h = int(size * 0.38)
    tab_r = max(2, size // 10)

    back_x = int(size * 0.22)
    back_y = int(size * 0.24)
    draw.rounded_rectangle(
        (back_x, back_y, back_x + tab_w, back_y + tab_h),
        radius=tab_r,
        fill=MINT,
    )

    front_x = int(size * 0.34)
    front_y = int(size * 0.36)
    draw.rounded_rectangle(
        (front_x, front_y, front_x + tab_w, front_y + tab_h),
        radius=tab_r,
        fill=WHITE,
    )

    badge = max(4, size // 5)
    bx = size - pad - badge - max(1, size // 18)
    by = pad + max(1, size // 18)
    draw.ellipse((bx, by, bx + badge, by + badge), fill=AMBER)
    return img


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for size in (16, 32, 48, 128):
        icon = draw_icon(size)
        path = OUT / f"icon{size}.png"
        icon.save(path, "PNG")
        print(f"wrote {path}")


if __name__ == "__main__":
    main()

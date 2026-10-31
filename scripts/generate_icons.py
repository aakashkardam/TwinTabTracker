#!/usr/bin/env python3
"""Resize the original TwinTabTracker icon into extension PNG sizes."""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "store" / "logo-source.png"
OUT = ROOT / "public" / "icons"
UI_LOGO = ROOT / "src" / "ui" / "assets" / "logo.png"
STORE_512 = ROOT / "docs" / "store" / "icon512.png"


def resize(size: int) -> Image.Image:
    src = Image.open(SOURCE).convert("RGBA")
    return src.resize((size, size), Image.Resampling.LANCZOS)


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f"Missing source icon: {SOURCE}")

    OUT.mkdir(parents=True, exist_ok=True)
    UI_LOGO.parent.mkdir(parents=True, exist_ok=True)
    STORE_512.parent.mkdir(parents=True, exist_ok=True)

    for size in (16, 32, 48, 128):
        path = OUT / f"icon{size}.png"
        resize(size).save(path, "PNG")
        print(f"wrote {path}")

    resize(48).save(UI_LOGO, "PNG")
    print(f"wrote {UI_LOGO}")
    resize(512).save(STORE_512, "PNG")
    print(f"wrote {STORE_512}")


if __name__ == "__main__":
    main()

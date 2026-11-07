#!/usr/bin/env python3
"""Compose actual headed-Chrome preview captures into the B01F owner comparison board."""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[2]
CROP_DIR = ROOT / "tests" / "evidence" / "b01f-crops"
OUTPUT = ROOT / "review-evidence" / "b01f" / "iona-base-owner-compare.png"
SCALES = (48, 60, 72)
ACTIONS = ("idle", "run", "jump", "dash", "combo")
FACINGS = ("left", "right")
CROP_WIDTH = 260
CROP_HEIGHT = 250
CELL_WIDTH = CROP_WIDTH * len(FACINGS)
LEFT = 96
TOP = 122
ROW_GAP = 44
COL_GAP = 20
BOTTOM = 70
BACKGROUND = (18, 22, 32)
PANEL = (27, 34, 48)
INK = (238, 238, 232)
MUTED = (160, 177, 190)
ACCENT = (120, 214, 205)


def main() -> None:
    manifest_path = CROP_DIR / "manifest.json"
    rows = json.loads(manifest_path.read_text(encoding="utf-8"))
    crops = {(item["scale"], item["action"], item["facing"]): CROP_DIR / Path(item["path"]).name for item in rows}
    expected = {(scale, action, facing) for scale in SCALES for action in ACTIONS for facing in FACINGS}
    if set(crops) != expected:
        missing = sorted(expected - set(crops))
        extra = sorted(set(crops) - expected)
        raise SystemExit(f"Comparison board requires exactly 30 live captures; missing={missing}; extra={extra}")
    for key, path in crops.items():
        if not path.is_file():
            raise SystemExit(f"Missing runtime capture for {key}: {path}")

    board_width = LEFT * 2 + len(SCALES) * CELL_WIDTH + (len(SCALES) - 1) * COL_GAP
    board_height = TOP + len(ACTIONS) * (CROP_HEIGHT + ROW_GAP) + BOTTOM
    board = Image.new("RGB", (board_width, board_height), BACKGROUND)
    draw = ImageDraw.Draw(board)
    font = ImageFont.load_default()
    draw.text((LEFT, 34), "IONA BASE / OWNER SCALE + MOTION COMPARISON", fill=INK, font=font)
    draw.text((LEFT, 59), "B01E image-generated runtime textures / live Phaser captures / no canonical scale selected", fill=MUTED, font=font)
    draw.text((LEFT, 82), "Each action row shows left-facing and right-facing play at the same 480 x 270 chamber scale.", fill=MUTED, font=font)

    for column, scale in enumerate(SCALES):
        x = LEFT + column * (CELL_WIDTH + COL_GAP)
        draw.text((x, 101), f"{scale} PX", fill=ACCENT, font=font)

    for row, action in enumerate(ACTIONS):
        y = TOP + row * (CROP_HEIGHT + ROW_GAP)
        draw.text((18, y + 4), action.upper(), fill=ACCENT, font=font)
        for column, scale in enumerate(SCALES):
            x = LEFT + column * (CELL_WIDTH + COL_GAP)
            draw.rounded_rectangle((x - 1, y - 1, x + CELL_WIDTH + 1, y + CROP_HEIGHT + 1), radius=5, fill=PANEL)
            for facing_index, facing in enumerate(FACINGS):
                image_path = crops[(scale, action, facing)]
                with Image.open(image_path) as capture:
                    image = capture.convert("RGB")
                    if image.size != (CROP_WIDTH, CROP_HEIGHT):
                        raise SystemExit(f"Unexpected crop size for {image_path}: {image.size}")
                    board.paste(image, (x + facing_index * CROP_WIDTH, y))
            draw.text((x + 6, y + CROP_HEIGHT + 8), "LEFT-FACING".ljust(24) + "RIGHT-FACING", fill=MUTED, font=font)

    draw.text((LEFT, board_height - 38), "TECHNICAL COMPARISON ONLY: review the playable footage at normal speed before judging art or motion.", fill=INK, font=font)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    board.save(OUTPUT, format="PNG", optimize=True)
    print(f"PASS: composed {len(crops)} real runtime captures into {OUTPUT.relative_to(ROOT)} ({board_width}x{board_height})")


if __name__ == "__main__":
    main()

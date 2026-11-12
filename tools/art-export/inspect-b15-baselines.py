#!/usr/bin/env python3
"""Create read-only B15 inspection boards from active B01E and Stormhalo exports."""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "release-artifacts"
MANIFEST = ROOT / "art-source/manifests/iona-b01e-candidate-v1.json"


def main() -> None:
    data = json.loads(MANIFEST.read_text(encoding="utf-8"))
    frames = data["runtimeFrames"]
    groups: dict[str, list[tuple[Image.Image, str]]] = {"idle-run": [], "jump-dash": [], "attacks-transitions": []}
    for frame in frames:
        image = Image.open(ROOT / frame["runtimePng"]).convert("RGBA")
        top = frame["runtimeVisibleBounds"][1]
        crop = image.crop((42, max(0, top - 2), 86, min(80, top + 25)))
        # Composite alpha over a dark blue review surface; no sprite pixels are
        # resampled except nearest-neighbor integer enlargement.
        bg = Image.new("RGBA", crop.size, (11, 27, 38, 255))
        bg.alpha_composite(crop)
        crop = bg.convert("RGB").resize((528, 324), Image.Resampling.NEAREST)
        ident = frame["id"]
        group = "idle-run" if ident.startswith(("idle", "run", "start", "stop", "turn")) else \
                "jump-dash" if ident.startswith(("jump", "dash")) else "attacks-transitions"
        groups[group].append((crop, f'{ident}-{frame["facing"]}'))

    for group, tiles in groups.items():
        cols, tile_w, tile_h, gap, label_h = 4, 528, 324, 8, 24
        rows = (len(tiles) + cols - 1) // cols
        board = Image.new("RGB", (cols * tile_w + (cols + 1) * gap,
                                  rows * (tile_h + label_h) + (rows + 1) * gap), (7, 18, 27))
        draw = ImageDraw.Draw(board)
        for i, (crop, label) in enumerate(tiles):
            x = gap + (i % cols) * (tile_w + gap)
            y = gap + (i // cols) * (tile_h + label_h + gap)
            board.paste(crop, (x, y))
            draw.rectangle((x, y, x + tile_w - 1, y + tile_h - 1), outline=(54, 102, 111))
            draw.text((x + 2, y + tile_h + 3), label, fill=(199, 222, 215))
        board.save(OUT / f"b15-active-base-heads-{group}-before.png", optimize=True)

    # Export a concise palette/geometry/timing record from the active manifest.
    rows = []
    for item in frames:
        rows.append({"id": item["id"], "facing": item["facing"], "durationMs": item["durationMs"],
                     "runtimePng": item["runtimePng"], "sha256": item["runtimeSha256"],
                     "canvas": item["runtimeCanvas"], "anchor": item["anchor"],
                     "visibleBounds": item["runtimeVisibleBounds"]})
    (OUT / "b15-active-base-before-inventory.json").write_text(json.dumps({
        "manifest": MANIFEST.relative_to(ROOT).as_posix(), "palette": data["palette"],
        "frameCount": len(frames), "frames": rows,
    }, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()

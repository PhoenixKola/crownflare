from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "art-source" / "enemies" / "b06" / "generated-master"
OUTPUT = ROOT / "public" / "assets" / "enemies" / "b06"
MANIFEST = ROOT / "art-source" / "enemies" / "b06" / "asset-manifest.json"

SOURCES = {
    "shardrunner": ("shardrunner-atlas.png", 4, 2, 54, ["idle", "move", "turn", "attack", "telegraph", "recovery", "hurt", "ko"]),
    "orbit-wisp": ("orbit-wisp-atlas.png", 4, 2, 39, ["idle", "move", "telegraph", "attack", "recovery", "hurt", "stagger", "ko"]),
    "pressure-bastion": ("pressure-bastion-atlas.png", 4, 2, 56, ["idle", "move", "guard", "telegraph", "attack", "recovery", "guard-break", "ko"]),
    "cantor": ("cantor-atlas.png", 4, 3, 68, ["intro", "idle", "move", "sweep-telegraph", "sweep-attack", "sweep-recovery", "pulse-telegraph", "pulse-attack", "vulnerable", "hurt", "ko", "disperse"]),
}
FX_SOURCE = ("enemy-signature-fx-atlas.png", 4, 2, ["runner-dash", "runner-impact", "wisp-charge", "wisp-projectile", "wisp-impact", "bastion-shockfront", "bastion-guard-break", "cantor-ring-sweep"])


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def cell(image: Image.Image, index: int, columns: int, rows: int) -> Image.Image:
    width, height = image.size
    row, column = divmod(index, columns)
    bounds = (
        round(column * width / columns),
        round(row * height / rows),
        round((column + 1) * width / columns),
        round((row + 1) * height / rows),
    )
    cropped = image.crop(bounds).convert("RGBA")
    alpha = cropped.getchannel("A")
    # Soft glow and model edge noise should not inflate gameplay-scale sizing.
    mask = alpha.point(lambda value: 255 if value > 18 else 0)
    bbox = mask.getbbox()
    if bbox is None:
        raise ValueError(f"Empty source cell {index} in {image.filename}")
    left, top, right, bottom = bbox
    margin = max(2, round(max(right - left, bottom - top) * 0.025))
    bounds = (max(0, left - margin), max(0, top - margin), min(cropped.width, right + margin), min(cropped.height, bottom + margin))
    return cropped.crop(bounds)


def fit_on_canvas(source: Image.Image, canvas: tuple[int, int], max_height: int, max_width: int | None = None, baseline: int | None = None) -> Image.Image:
    source = source.convert("RGBA")
    fit_width = max_width or canvas[0] - 4
    fit_height = max_height
    scale = min(fit_width / source.width, fit_height / source.height)
    size = (max(1, round(source.width * scale)), max(1, round(source.height * scale)))
    # Nearest-neighbor keeps hard clusters and source color ramps intact.
    scaled = source.resize(size, Image.Resampling.NEAREST)
    result = Image.new("RGBA", canvas, (0, 0, 0, 0))
    x = (canvas[0] - size[0]) // 2
    y = ((baseline if baseline is not None else canvas[1]) - size[1])
    result.alpha_composite(scaled, (x, y))
    return result


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    records: dict[str, object] = {"version": "B06-ENEMY-ATLAS-1", "sourceMode": "Codex native image_gen; exact output IDs and prompts recorded in provenance.md", "characters": {}, "effects": []}
    for archetype, (filename, columns, rows, target_height, frame_ids) in SOURCES.items():
        master_path = SOURCE / filename
        master = Image.open(master_path).convert("RGBA")
        character_records = []
        canvas = (80, 80)
        for index, frame_id in enumerate(frame_ids):
            sprite = cell(master, index, columns, rows)
            # Hovering Wisp art is centered around a hover pivot; ground units share a foot baseline.
            pivot = 40 if archetype == "orbit-wisp" else 76
            runtime = fit_on_canvas(sprite, canvas, target_height, max_width=76, baseline=pivot)
            output_path = OUTPUT / f"{archetype}-{frame_id}.png"
            runtime.save(output_path, optimize=True)
            character_records.append({
                "state": frame_id,
                "sourceCell": index,
                "sourceCrop": [index % columns, index // columns],
                "runtime": output_path.relative_to(ROOT).as_posix(),
                "sha256": digest(output_path),
                "canvas": list(runtime.size),
                "alphaBounds": list(runtime.getchannel("A").point(lambda value: 255 if value > 18 else 0).getbbox() or (0, 0, 0, 0)),
                "pivot": "center-x, hover-center-y=40/80" if archetype == "orbit-wisp" else "center-x, baseline-y=76/80",
            })
        records["characters"][archetype] = {
            "master": master_path.relative_to(ROOT).as_posix(),
            "masterSha256": digest(master_path),
            "masterDimensions": list(master.size),
            "grid": [columns, rows],
            "runtimeFrames": character_records,
        }

    filename, columns, rows, frame_ids = FX_SOURCE
    master_path = SOURCE / filename
    master = Image.open(master_path).convert("RGBA")
    for index, frame_id in enumerate(frame_ids):
        sprite = cell(master, index, columns, rows)
        runtime = fit_on_canvas(sprite, (96, 72), 64, max_width=88, baseline=68)
        output_path = OUTPUT / f"fx-{frame_id}.png"
        runtime.save(output_path, optimize=True)
        records["effects"].append({
            "state": frame_id,
            "sourceCell": index,
            "sourceCrop": [index % columns, index // columns],
            "runtime": output_path.relative_to(ROOT).as_posix(),
            "sha256": digest(output_path),
            "canvas": list(runtime.size),
            "alphaBounds": list(runtime.getchannel("A").point(lambda value: 255 if value > 18 else 0).getbbox() or (0, 0, 0, 0)),
        })
    records["effectsMaster"] = {
        "master": master_path.relative_to(ROOT).as_posix(),
        "masterSha256": digest(master_path),
        "masterDimensions": list(master.size),
        "grid": [columns, rows],
    }
    MANIFEST.write_text(json.dumps(records, indent=2) + "\n", encoding="utf-8")
    print(f"Exported {sum(len(value[4]) for value in SOURCES.values())} enemy frames and {len(frame_ids)} effects to {OUTPUT}")


if __name__ == "__main__":
    main()

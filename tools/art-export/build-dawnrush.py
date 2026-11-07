#!/usr/bin/env python3
"""Export B05 runtime sprites from the four native ImageGen sheets."""
from __future__ import annotations

import hashlib
import json
import statistics
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "art-source/characters/iona/b05/generation"
RUNTIME = ROOT / "public/assets/characters/iona/b05"
EVIDENCE = ROOT / "review-evidence/b05"
MANIFEST = ROOT / "art-source/manifests/dawnrush-b05-v1.json"
CANVAS = (128, 80)
ALPHA_THRESHOLD = 192

SHEETS = {
    "locomotion": ("dawnrush-locomotion-01a1b353.png", 4, 4, [
        "idle-ready", "idle-breath-1", "idle-breath-2", "sprint-start",
        "run-forward-0", "run-forward-1", "run-crossing", "run-contact",
        "jump-rise", "jump-apex", "jump-fall", "landing",
        "dash-ignition", "dash-streamline", "dash-brake", "turn-ready",
    ]),
    "combat": ("dawnrush-combat-01a1b353.png", 4, 4, [
        "light-1-windup", "light-1-contact", "light-2-contact", "light-3-contact",
        "light-recovery", "heavy-windup", "heavy-contact", "heavy-recovery",
        "aerial-windup", "aerial-contact", "aerial-recovery", "solar-gather",
        "solar-ignite", "solar-drive", "solar-lash", "solar-recovery",
    ]),
    "transformation": ("dawnrush-transformation-01a1b353.png", 2, 2, [
        "transform-anticipation", "transform-ignition", "transform-silhouette", "transform-ready",
    ]),
    "vfx": ("dawnrush-vfx-01a1b353.png", 4, 2, [
        "fx-transform-ring", "fx-silhouette-burst", "fx-orbit-filaments", "fx-dash-streak",
        "fx-palm-arc", "fx-combo-arc", "fx-impact-star", "fx-solar-pressure-wave",
    ]),
}


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def cell(sheet: Image.Image, cols: int, rows: int, index: int) -> Image.Image:
    col, row = index % cols, index // cols
    bounds = (round(col * sheet.width / cols), round(row * sheet.height / rows),
              round((col + 1) * sheet.width / cols), round((row + 1) * sheet.height / rows))
    image = sheet.crop(bounds).convert("RGBA")
    image.putalpha(image.getchannel("A").point(lambda a: 255 if a >= ALPHA_THRESHOLD else 0))
    # Sheets occasionally let a stray heel or motion spark from the prior cell
    # cross the nominal grid line. Remove only small edge-connected fragments.
    mask = image.getchannel("A")
    edge_points = [(x, 0) for x in range(mask.width)] + [(x, mask.height - 1) for x in range(mask.width)] + [(0, y) for y in range(1, mask.height - 1)] + [(mask.width - 1, y) for y in range(1, mask.height - 1)]
    visited_edges: set[tuple[int, int]] = set()
    for x, y in edge_points:
        if (x, y) in visited_edges:
            continue
        if mask.getpixel((x, y)) != 255:
            continue
        ImageDraw.floodfill(mask, (x, y), 127)
        fragment = mask.point(lambda a: 255 if a == 127 else 0)
        box = fragment.getbbox()
        if box:
            visited_edges.update((ex, ey) for ex, ey in edge_points if box[0] <= ex < box[2] and box[1] <= ey < box[3])
        if box and (box[2] - box[0]) * (box[3] - box[1]) > image.width * image.height * .045:
            mask = mask.point(lambda a: 255 if a == 127 else a)
        else:
            mask = mask.point(lambda a: 0 if a == 127 else a)
    image.putalpha(mask)
    box = image.getchannel("A").getbbox()
    if box is None:
        raise RuntimeError(f"empty generated frame {index}")
    return image.crop(box)


def waist_x(image: Image.Image) -> float:
    left, top, right, bottom = image.getchannel("A").getbbox() or (0, 0, image.width, image.height)
    y0, y1 = top + int((bottom - top) * .48), top + int((bottom - top) * .72)
    xs = [x for y in range(y0, y1) for x in range(left, right) if image.getpixel((x, y))[3] == 255]
    return float(statistics.median(xs)) if xs else (left + right) / 2


def contain(image: Image.Image, max_width: int, max_height: int) -> tuple[Image.Image, tuple[int, int]]:
    factor = min(max_width / image.width, max_height / image.height)
    size = (max(1, round(image.width * factor)), max(1, round(image.height * factor)))
    return image.resize(size, Image.Resampling.NEAREST), size


def put_on_canvas(image: Image.Image, *, factor: float | None = None, max_size: tuple[int, int] | None = None,
                  character: bool = False) -> tuple[Image.Image, list[int]]:
    if factor is None:
        assert max_size is not None
        scaled, size = contain(image, max_size[0], max_size[1])
    else:
        size = (max(1, round(image.width * factor)), max(1, round(image.height * factor)))
        scaled = image.resize(size, Image.Resampling.NEAREST)
    if character:
        x = round(CANVAS[0] / 2 - waist_x(image) * (size[0] / image.width))
        y = CANVAS[1] - size[1]
    else:
        x, y = (CANVAS[0] - size[0]) // 2, (CANVAS[1] - size[1]) // 2
    if x < 0 or y < 0 or x + size[0] > CANVAS[0] or y + size[1] > CANVAS[1]:
        raise RuntimeError(f"generated frame exceeds 128x80 canonical canvas: ({x},{y}) {size}")
    canvas = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    canvas.alpha_composite(scaled, (x, y))
    return canvas, list(canvas.getchannel("A").getbbox() or (0, 0, 0, 0))


def save(canvas: Image.Image, name: str, records: list[dict[str, Any]], source: str, index: int,
         factor: float | None, direction: str) -> None:
    path = RUNTIME / f"{name}.png"
    canvas.save(path, optimize=True)
    records.append({"file": path.relative_to(ROOT).as_posix(), "sha256": sha(path), "sourceSheet": source,
                    "sourceCell": index, "facing": direction, "canvas": list(CANVAS),
                    "alphaBounds": list(canvas.getchannel("A").getbbox() or (0, 0, 0, 0)),
                    "scale": round(factor, 6) if factor is not None else None,
                    "resampling": "nearest-neighbor", "alphaThreshold": ALPHA_THRESHOLD})


def main() -> None:
    RUNTIME.mkdir(parents=True, exist_ok=True)
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    loaded: dict[str, tuple[Image.Image, list[str], Path]] = {}
    for kind, (filename, cols, rows, names) in SHEETS.items():
        path = SOURCE / filename
        if not path.is_file():
            raise RuntimeError(f"missing native ImageGen sheet {path}")
        sheet = Image.open(path).convert("RGBA")
        if cols * rows != len(names):
            raise RuntimeError(f"bad frame mapping for {kind}")
        loaded[kind] = (sheet, names, path)

    loco_sheet, loco_names, _ = loaded["locomotion"]
    _, cols, rows, _ = SHEETS["locomotion"]
    reference_heights = [cell(loco_sheet, cols, rows, i).height for i in (0, 1, 2, 15)]
    scale = 60 / statistics.median(reference_heights)
    if not .2 < scale < .3:
        raise RuntimeError(f"unexpected fixed Dawnrush scale: {scale}")

    records: list[dict[str, Any]] = []
    crops: dict[str, Image.Image] = {}
    source_sha: dict[str, str] = {}
    for kind, (sheet, names, path) in loaded.items():
        source_sha[kind] = sha(path)
        cols, rows = SHEETS[kind][1:3]
        for index, name in enumerate(names):
            crop = cell(sheet, cols, rows, index)
            crops[name] = crop
            if kind in ("locomotion", "combat"):
                canvas, _ = put_on_canvas(crop, factor=scale, character=True)
                save(canvas, f"{name}-right", records, path.relative_to(ROOT).as_posix(), index, scale, "right")
                left = canvas.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
                left_path = RUNTIME / f"{name}-left.png"
                left.save(left_path, optimize=True)
                records.append({"file": left_path.relative_to(ROOT).as_posix(), "sha256": sha(left_path),
                                "sourceSheet": path.relative_to(ROOT).as_posix(), "sourceCell": index,
                                "facing": "left-mirrored", "canvas": list(CANVAS),
                                "alphaBounds": list(left.getchannel("A").getbbox() or (0, 0, 0, 0)),
                                "scale": round(scale, 6), "resampling": "nearest-neighbor",
                                "alphaThreshold": ALPHA_THRESHOLD})
            elif kind == "transformation":
                transform_scale = 60 / crops["transform-anticipation"].height
                canvas, _ = put_on_canvas(crop, factor=transform_scale, character=True)
                save(canvas, name, records, path.relative_to(ROOT).as_posix(), index, transform_scale, "right")
            else:
                canvas, _ = put_on_canvas(crop, max_size=(118, 66), character=False)
                save(canvas, name, records, path.relative_to(ROOT).as_posix(), index, None, "omnidirectional")

    # Create a truthful, legible contact sheet from the exported transparent runtime frames.
    rows_to_show = [
        ["idle-ready-right", "run-forward-0-right", "run-forward-1-right", "jump-rise-right", "jump-apex-right", "jump-fall-right", "landing-right", "dash-streamline-right"],
        ["light-1-windup-right", "light-1-contact-right", "light-2-contact-right", "light-3-contact-right", "heavy-contact-right", "aerial-contact-right", "solar-drive-right", "solar-lash-right"],
        ["transform-anticipation", "transform-ignition", "transform-silhouette", "transform-ready", "fx-transform-ring", "fx-orbit-filaments", "fx-dash-streak", "fx-solar-pressure-wave"],
    ]
    contact = Image.new("RGBA", (8 * 144, 3 * 112), (9, 17, 28, 255))
    draw = ImageDraw.Draw(contact)
    for row, names in enumerate(rows_to_show):
        for col, name in enumerate(names):
            image = Image.open(RUNTIME / f"{name}.png").convert("RGBA")
            image.thumbnail((128, 80), Image.Resampling.NEAREST)
            contact.alpha_composite(image, (col * 144 + (144 - image.width) // 2, row * 112 + 4))
            draw.text((col * 144 + 4, row * 112 + 87), name, fill=(234, 241, 241, 255))
    contact.convert("RGB").save(EVIDENCE / "dawnrush-runtime-contact.png", optimize=True)

    source_contact_files = [loaded[k][2] for k in ("locomotion", "combat", "transformation", "vfx")]
    source_contact = Image.new("RGBA", (4 * 290, 2 * 210), (9, 17, 28, 255))
    draw = ImageDraw.Draw(source_contact)
    for index, path in enumerate(source_contact_files):
        image = Image.open(path).convert("RGBA")
        image.thumbnail((280, 180), Image.Resampling.LANCZOS)
        x = (index % 4) * 290 + (290 - image.width) // 2
        y = (index // 4) * 210 + 4
        source_contact.alpha_composite(image, (x, y))
        draw.text(((index % 4) * 290 + 6, (index // 4) * 210 + 186), path.stem, fill=(234, 241, 241, 255))
    source_contact.convert("RGB").save(EVIDENCE / "dawnrush-generated-source-sheets.png", optimize=True)

    comparison = Image.new("RGBA", (320, 3 * 120), (9, 17, 28, 255))
    draw = ImageDraw.Draw(comparison)
    base_idle = Image.open(ROOT / "public/assets/characters/iona/b01e/idle-0-right.png").convert("RGBA")
    dawnrush_idle = Image.open(RUNTIME / "idle-ready-right.png").convert("RGBA")
    for row, height in enumerate((48, 60, 72)):
        factor = height / 60
        for col, (label, image) in enumerate((("BASE", base_idle), ("DAWNRUSH", dawnrush_idle))):
            size = (round(CANVAS[0] * factor), round(CANVAS[1] * factor))
            shown = image.resize(size, Image.Resampling.NEAREST)
            x = col * 160 + (160 - size[0]) // 2
            y = row * 120 + 100 - size[1]
            comparison.alpha_composite(shown, (x, y))
            draw.text((col * 160 + 5, row * 120 + 103), f"{label} / {height}px", fill=(239, 226, 207, 255))
    comparison.convert("RGB").save(EVIDENCE / "dawnrush-base-same-scale-48-60-72.png", optimize=True)

    keyframes = Image.new("RGBA", (2 * 320, 2 * 210), (9, 17, 28, 255))
    draw = ImageDraw.Draw(keyframes)
    for index, name in enumerate(("transform-anticipation", "transform-ignition", "transform-silhouette", "transform-ready")):
        image = Image.open(RUNTIME / f"{name}.png").convert("RGBA").resize((256, 160), Image.Resampling.NEAREST)
        x, y = index % 2 * 320 + 32, index // 2 * 210 + 4
        keyframes.alpha_composite(image, (x, y))
        draw.text((index % 2 * 320 + 8, index // 2 * 210 + 174), name, fill=(239, 226, 207, 255))
    keyframes.convert("RGB").save(EVIDENCE / "dawnrush-transformation-keys.png", optimize=True)

    solar_still = Image.new("RGBA", CANVAS, (9, 17, 28, 255))
    solar_fx = Image.open(RUNTIME / "fx-solar-pressure-wave.png").convert("RGBA")
    solar_actor = Image.open(RUNTIME / "solar-drive-right.png").convert("RGBA")
    solar_still.alpha_composite(solar_fx)
    solar_still.alpha_composite(solar_actor)
    solar_still.resize((512, 320), Image.Resampling.NEAREST).convert("RGB").save(EVIDENCE / "dawnrush-solar-drive-still.png", optimize=True)

    manifest = {
        "schemaVersion": 1,
        "candidateId": "IONA_B05_DAWNRUSH_GENERATED_FORM_V1",
        "status": "B05_DEV_REVIEW / OWNER_APPROVAL_PENDING",
        "productionRoute": "unchanged; B05 is available only via the development route ?b05=1",
        "physicsBody": {"width": 15, "height": 30, "authority": "unchanged B00 Arcade body"},
        "canvas": {"width": 128, "height": 80, "pivot": {"x": 64, "feetY": 80}, "standingVisibleHeightPx": 60},
        "processing": {"fixedSourceScale": round(scale, 8), "resampling": "nearest-neighbor", "alphaThreshold": ALPHA_THRESHOLD,
                       "directionPolicy": "right-facing source sheets; left-facing sprites are intentional horizontal mirrors",
                       "poseScalePolicy": "one standing-reference factor shared by all locomotion and combat poses; alpha bounds never change runtime sprite scale"},
        "sourceSheets": [{"path": p.relative_to(ROOT).as_posix(), "sha256": source_sha[k], "outputId": ({
            "locomotion": "exec-627ee475-0398-4599-8d40-c9859be00bc6.png",
            "combat": "exec-f55da20c-05d2-48cd-b373-7dace065c93d.png",
            "transformation": "exec-13fea4fa-c29d-4680-83b4-cc736b10478e.png",
            "vfx": "exec-c16678b6-f4df-4a7d-8369-2ab0bfe491d3.png"})[k], "dimensions": list(Image.open(p).size)} for k, p in ((kind, loaded[kind][2]) for kind in loaded)],
        "runtimeFrameCount": len(records), "runtimeFrames": records,
        "evidence": ["review-evidence/b05/dawnrush-generated-source-sheets.png", "review-evidence/b05/dawnrush-runtime-contact.png", "review-evidence/b05/dawnrush-base-same-scale-48-60-72.png", "review-evidence/b05/dawnrush-transformation-keys.png", "review-evidence/b05/dawnrush-solar-drive-still.png"],
    }
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"runtimeFrames": len(records), "scale": scale, "sourceSheets": source_sha,
                      "manifest": MANIFEST.relative_to(ROOT).as_posix()}, indent=2))


if __name__ == "__main__":
    main()

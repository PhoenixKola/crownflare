#!/usr/bin/env python3
"""Build the isolated, provisional B01D candidate from curated pose sources."""
from __future__ import annotations

import hashlib
import json
import statistics
import shutil
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFont
import PIL

ROOT = Path(__file__).resolve().parents[2]
SOURCE_ROOT = ROOT / "art-source/characters/iona/b01d"
CORRECTED = SOURCE_ROOT / "corrected-poses"
RUNTIME = ROOT / "public/assets/characters/iona/b01d"
MANIFEST = ROOT / "art-source/manifests/iona-b01d-candidate-v1.json"
EVIDENCE = ROOT / "review-evidence/b01d"
B01C_MANIFEST = ROOT / "art-source/manifests/iona-b01c-production-v1.json"
B01C_RUNTIME = ROOT / "public/assets/characters/iona/b01c"
CANVAS = (128, 80)
ANCHOR_X, FEET_Y = 64, 80
TARGET_RUN_HEIGHT = 67  # median visible height of the historical B01C run frames
ALPHA_THRESHOLD = 192
RUN_POSES = ("forward-contact", "compression", "passing", "opposite-contact")
SOURCE_SHEETS = {
    "left": {
        "path": "art-source/characters/iona/b01d/original-imagegen/iona-run-left-4pose-imagegen-01.png",
        "toolOutputId": "exec-8effeab5-4efc-4910-b13e-a904e3c415db.png",
        "reference": "art-source/characters/iona/b01c/generated/iona-run-left-6pose-imagegen-01.png",
        "sha256": "47999cddb63e807da43223b59f8a25bda6ab73a4d79c751caba7a9bd9084ca5d",
        "promptId": "b01d-run-left-4pose-v1",
    },
    "right": {
        "path": "art-source/characters/iona/b01d/original-imagegen/iona-run-right-4pose-imagegen-01.png",
        "toolOutputId": "exec-2cd955a8-bec8-40e5-864b-355aecace9f4.png",
        "reference": "art-source/characters/iona/b01c/generated/iona-run-right-6pose-imagegen-02.png",
        "sha256": "c843cd5d0fce12cd683d396719a68a79e21de62085936df619d3eafcd88349dc",
        "promptId": "b01d-run-right-4pose-v1",
    },
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def rgba_bytes(image: Image.Image) -> str:
    import io
    stream = io.BytesIO()
    image.save(stream, format="PNG", optimize=True)
    return hashlib.sha256(stream.getvalue()).hexdigest()


def threshold_alpha(image: Image.Image) -> Image.Image:
    result = image.convert("RGBA")
    result.putalpha(result.getchannel("A").point(lambda value: 255 if value >= ALPHA_THRESHOLD else 0))
    return result


def trim(image: Image.Image) -> tuple[Image.Image, tuple[int, int, int, int]]:
    image = threshold_alpha(image)
    bounds = image.getchannel("A").getbbox()
    if bounds is None:
        raise RuntimeError("Pose has no visible pixels after alpha thresholding")
    return image.crop(bounds), bounds


def waist_x(image: Image.Image) -> float:
    alpha = image.getchannel("A")
    left, top, right, bottom = alpha.getbbox() or (0, 0, image.width, image.height)
    y0 = top + int((bottom - top) * 0.50)
    y1 = top + int((bottom - top) * 0.72)
    points = [x for y in range(y0, y1) for x in range(left, right) if alpha.getpixel((x, y)) == 255]
    return float(statistics.median(points)) if points else (left + right) / 2


def frame_duration_ms(frame: dict[str, Any]) -> float:
    frame_id, action = frame["id"], frame["action"]
    if action == "idle": return 350
    if action in ("start", "stop"): return 70
    if action == "run": return 105
    if frame_id in ("jump-0", "jump-1"): return 40
    if frame_id in ("jump-2", "jump-3", "jump-4"): return 1000
    if frame_id == "jump-5": return 140
    if frame_id.startswith("dash-"): return 31.25 if int(frame_id.split("-")[1]) < 4 else 50
    if action.startswith("combo-"):
        step = int(action.split("-")[1]) - 1
        return ((90, 80, 170), (110, 90, 170), (140, 100, 220))[step][{"windup": 0, "contact": 1, "recovery": 2}[frame_id.split("-")[-1]]]
    if action == "turn": return 60
    return 70


def contact_anchor(action: str, frame_id: str) -> dict[str, Any] | None:
    if not action.startswith("combo-") or not frame_id.endswith("-contact"):
        return None
    step = int(action.split("-")[1])
    return {
        "eventId": "contact",
        "contactEventMs": (112, 138, 165)[step - 1],
        "pixelPoint": None,
        "note": "Historical B01C contact timing is authoritative; no precise hand/foot pixel anchor was recorded.",
    }


def palette_image(colors: list[str]) -> Image.Image:
    palette = Image.new("P", (1, 1))
    values: list[int] = []
    for color in colors:
        values.extend((int(color[1:3], 16), int(color[3:5], 16), int(color[5:7], 16)))
    last_color = values[-3:]
    values.extend(last_color * ((768 - len(values)) // 3))
    palette.putpalette(values[:768])
    return palette


def quantize_to_palette(image: Image.Image, palette: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    indexed = rgba.convert("RGB").quantize(palette=palette, dither=Image.Dither.NONE)
    output = indexed.convert("RGBA")
    output.putalpha(rgba.getchannel("A"))
    return output


def place(image: Image.Image, palette: Image.Image, target_height: int) -> tuple[Image.Image, list[int]]:
    scale = target_height / image.height
    size = (max(1, round(image.width * scale)), target_height)
    scaled = image.resize(size, Image.Resampling.NEAREST)
    colored = quantize_to_palette(scaled, palette)
    x = round(ANCHOR_X - waist_x(image) * scale)
    y = FEET_Y - target_height
    if x < 0 or y < 0 or x + size[0] > CANVAS[0] or y + size[1] > CANVAS[1]:
        raise RuntimeError(f"Pose clips candidate canvas: offset=({x},{y}) size={size}")
    canvas = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    canvas.alpha_composite(colored, (x, y))
    return canvas, list(canvas.getchannel("A").getbbox() or (0, 0, 0, 0))


def bounds_in_cell(width: int, height: int, cell_index: int) -> tuple[int, int, int, int]:
    col, row = cell_index % 2, cell_index // 2
    return (round(col * width / 2), round(row * height / 2), round((col + 1) * width / 2), round((row + 1) * height / 2))


def checkerboard(image: Image.Image) -> None:
    draw = ImageDraw.Draw(image)
    for y in range(0, image.height, 8):
        for x in range(0, image.width, 8):
            color = (29, 38, 51, 255) if (x // 8 + y // 8) % 2 else (43, 51, 63, 255)
            draw.rectangle((x, y, min(x + 7, image.width - 1), min(y + 7, image.height - 1)), fill=color)


def main() -> None:
    old = json.loads(B01C_MANIFEST.read_text(encoding="utf-8"))
    old_frames = {(frame["id"], frame["facing"]): frame for frame in old["runtimeFrames"]}
    colors = old["processing"]["globalPalette"]
    palette = palette_image(colors)
    CORRECTED.mkdir(parents=True, exist_ok=True)
    RUNTIME.mkdir(parents=True, exist_ok=True)

    # Candidate IDs preserve all reviewed B01C actions but use four curated run poses.
    old_ids = [frame_id for frame_id in [f["id"] for f in old["runtimeFrames"] if f["facing"] == "right"] if not frame_id.startswith("run-")]
    frame_ids = old_ids + [f"run-{index}" for index in range(len(RUN_POSES))]
    if len(frame_ids) != len(set(frame_ids)):
        raise RuntimeError("Duplicate B01D frame IDs")

    records: list[dict[str, Any]] = []
    for facing in ("left", "right"):
        for frame_id in old_ids:
            source_frame = old_frames[(frame_id, facing)]
            source_runtime = ROOT / source_frame["runtimePng"]
            output_path = RUNTIME / f"{frame_id}-{facing}.png"
            shutil.copyfile(source_runtime, output_path)
            image = Image.open(output_path).convert("RGBA")
            bounds = list(image.getchannel("A").getbbox() or (0, 0, 0, 0))
            records.append({
                **source_frame,
                "frameId": frame_id,
                "actionId": f"iona-base-{source_frame['action']}",
                "sourceTool": "inherited B01C source and deterministic B01C Pillow export",
                "toolOutputId": None,
                "runtimePng": output_path.relative_to(ROOT).as_posix(),
                "runtimeSha256": sha256(output_path),
                "runtimeCanvas": {"width": CANVAS[0], "height": CANVAS[1]},
                "runtimeVisibleBounds": bounds,
                "runtimeVisibleHeightPx": bounds[3] - bounds[1],
                "nominalVisibleHeightPx": 60,
                "anchor": {"x": ANCHOR_X, "feetY": FEET_Y},
                "durationMs": frame_duration_ms(source_frame),
                "contactAnchor": contact_anchor(source_frame["action"], frame_id),
                "vfxAnchor": None,
                "sfxAnchor": None,
                "manualEditDescription": "UNCHANGED: copied byte-identically from the historical B01C runtime frame.",
                "candidateStatus": "UNCHANGED_REUSED",
                "ownerApproval": "PENDING_OWNER_REVIEW",
            })

        sheet_meta = SOURCE_SHEETS[facing]
        sheet_path = ROOT / sheet_meta["path"]
        if sha256(sheet_path) != sheet_meta["sha256"]:
            raise RuntimeError(f"Generated source checksum mismatch: {sheet_path}")
        sheet = Image.open(sheet_path).convert("RGBA")
        for cell_index, pose in enumerate(RUN_POSES):
            cell_bounds = bounds_in_cell(*sheet.size, cell_index)
            cell = threshold_alpha(sheet.crop(cell_bounds))
            cropped, crop_bounds = trim(cell)
            if crop_bounds[0] <= 0 or crop_bounds[1] <= 0 or crop_bounds[2] >= cell.width or crop_bounds[3] >= cell.height:
                raise RuntimeError(f"Pose touches its cell boundary: facing={facing}, index={cell_index}, bounds={crop_bounds}")
            source_crop_path = CORRECTED / f"run-{cell_index}-{facing}-{pose}.png"
            cropped.save(source_crop_path, optimize=True)
            output, visible_bounds = place(cropped, palette, TARGET_RUN_HEIGHT)
            frame_id = f"run-{cell_index}"
            output_path = RUNTIME / f"{frame_id}-{facing}.png"
            output.save(output_path, optimize=True)
            records.append({
                "id": frame_id,
                "frameId": frame_id,
                "action": "run",
                "actionId": "iona-base-run",
                "facing": facing,
                "pose": pose,
                "source": sheet_meta["path"],
                "sourceSha256": sheet_meta["sha256"],
                "sourceTool": "Codex built-in image_gen.imagegen",
                "toolOutputId": sheet_meta["toolOutputId"],
                "modelVersion": "unknown (not exposed by tool result)",
                "referencePath": sheet_meta["reference"],
                "referenceSha256": sha256(ROOT / sheet_meta["reference"]),
                "promptId": sheet_meta["promptId"],
                "cellIndex": cell_index,
                "cellBoundsSourcePixels": list(cell_bounds),
                "trimBoundsWithinCell": list(crop_bounds),
                "croppedSourcePath": source_crop_path.relative_to(ROOT).as_posix(),
                "croppedSourceSha256": sha256(source_crop_path),
                "croppedSourceContentSha256": rgba_bytes(cropped),
                "runtimePng": output_path.relative_to(ROOT).as_posix(),
                "runtimeSha256": sha256(output_path),
                "runtimeCanvas": {"width": CANVAS[0], "height": CANVAS[1]},
                "runtimeVisibleBounds": visible_bounds,
                "runtimeVisibleHeightPx": visible_bounds[3] - visible_bounds[1],
                "nominalVisibleHeightPx": TARGET_RUN_HEIGHT,
                "durationMs": 105,
                "runtimeScale": round(TARGET_RUN_HEIGHT / cropped.height, 9),
                "anchor": {"x": ANCHOR_X, "feetY": FEET_Y},
                "alphaPixels": sum(1 for value in output.getchannel("A").tobytes() if value),
                "pixelMethod": "alpha >= 192; trim; nearest-neighbor to 67px visible height; B01C shared 32-color palette; no dithering; 128x80 transparent canvas",
                "contactAnchor": None,
                "vfxAnchor": None,
                "sfxAnchor": None,
                "manualEditDescription": "No hand-redrawn pixels. Reproducible cell crop, alpha threshold, height normalization, palette quantization, waist alignment and feet anchoring only.",
                "candidateStatus": "NEW_IMAGEGEN_POSE",
                "ownerApproval": "PENDING_OWNER_REVIEW",
            })

    expected = len(frame_ids) * 2
    if len(records) != expected:
        raise RuntimeError(f"Expected {expected} frame records, produced {len(records)}")

    contact = Image.new("RGBA", (4 * 128, 2 * 96), (13, 20, 33, 255))
    draw = ImageDraw.Draw(contact)
    font = ImageFont.load_default()
    for row, facing in enumerate(("left", "right")):
        for index, pose in enumerate(RUN_POSES):
            frame = Image.open(RUNTIME / f"run-{index}-{facing}.png").convert("RGBA")
            contact.alpha_composite(frame, (index * 128, row * 96 + 10))
            draw.text((index * 128 + 3, row * 96 + 1), f"{facing} / {pose}", font=font, fill=(238, 235, 220, 255))
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    contact.save(EVIDENCE / "iona-b01d-run-candidate-sheet.png", optimize=True)

    before_after = Image.new("RGBA", (4 * CANVAS[0], 4 * 98), (13, 20, 33, 255))
    draw = ImageDraw.Draw(before_after)
    for direction_index, facing in enumerate(("left", "right")):
        for version_index, (version, old_ids) in enumerate((("B01C", ("run-0", "run-1", "run-2", "run-4")), ("B01D", ("run-0", "run-1", "run-2", "run-3")))):
            row = direction_index * 2 + version_index
            for col, old_id in enumerate(old_ids):
                path = (B01C_RUNTIME if version == "B01C" else RUNTIME) / f"{old_id}-{facing}.png"
                frame = Image.open(path).convert("RGBA")
                before_after.alpha_composite(frame, (col * CANVAS[0], row * 98 + 14))
                draw.text((col * CANVAS[0] + 3, row * 98 + 2), f"{version} / {facing} / {RUN_POSES[col]}", font=font, fill=(238, 235, 220, 255))
    before_after.save(EVIDENCE / "iona-b01d-before-after-run-cycle.png", optimize=True)

    action_frames = ["idle-0", "run-0", "run-1", "run-2", "run-3", "jump-2", "jump-4", "jump-5", "dash-2", "combo-1-contact", "combo-2-contact", "combo-3-contact"]
    contact_sheet = Image.new("RGBA", (6 * CANVAS[0], 4 * 98), (13, 20, 33, 255))
    draw = ImageDraw.Draw(contact_sheet)
    for facing_row, facing in enumerate(("left", "right")):
        for index, frame_id in enumerate(action_frames):
            col = index if index < 6 else index - 6
            row = facing_row + (index // 6) * 2
            tile = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
            checkerboard(tile)
            frame = Image.open(RUNTIME / f"{frame_id}-{facing}.png").convert("RGBA")
            tile.alpha_composite(frame)
            contact_sheet.alpha_composite(tile, (col * CANVAS[0], row * 98 + 14))
            draw.text((col * CANVAS[0] + 3, row * 98 + 2), f"{facing} / {frame_id}", font=font, fill=(238, 235, 220, 255))
    contact_sheet.save(EVIDENCE / "iona-b01d-action-contact-sheet.png", optimize=True)

    forms = Image.new("RGBA", (4 * CANVAS[0], 98), (13, 20, 33, 255))
    draw = ImageDraw.Draw(forms)
    references = (
        (RUNTIME / "idle-0-right.png", "BASE / B01D"),
        (ROOT / "public/assets/characters/iona/b01a/dawnrush-60-silhouette.png", "DAWNRUSH / B01A"),
        (ROOT / "public/assets/characters/iona/b01a/stormhalo-60-silhouette.png", "STORMHALO / B01A"),
        (ROOT / "public/assets/characters/iona/b01a/eclipse-warden-60-silhouette.png", "ECLIPSE / B01A"),
    )
    for index, (path, label) in enumerate(references):
        frame = Image.open(path).convert("RGBA")
        alpha = frame.getchannel("A")
        frame = Image.new("RGBA", frame.size, (240, 233, 216, 0))
        frame.putalpha(alpha)
        forms.alpha_composite(frame, (index * CANVAS[0], 14))
        draw.text((index * CANVAS[0] + 3, 2), label, font=font, fill=(238, 235, 220, 255))
    forms.save(EVIDENCE / "iona-b01d-four-form-silhouette-references.png", optimize=True)

    b01c_bounds = {f"{item['id']}-{item['facing']}": item["runtimeVisibleBounds"] for item in old["runtimeFrames"]}
    b01d_bounds = {f"{item['id']}-{item['facing']}": item["runtimeVisibleBounds"] for item in records}
    metrics_path = ROOT / "src/game/animation/ionaCandidateFrameMetrics.ts"
    metrics_text = (
        "// Generated by tools/art-export/build-iona-b01d.py; do not edit by hand.\n"
        "export type IonaPixelCandidate = 'b01c' | 'b01d';\n"
        "export const IONA_B01C_FRAME_BOUNDS = " + json.dumps(b01c_bounds, indent=2) + " as const;\n"
        "export const IONA_B01D_FRAME_BOUNDS = " + json.dumps(b01d_bounds, indent=2) + " as const;\n"
        "export function ionaCandidateFrameBounds(candidate: IonaPixelCandidate, id: string, facing: 'left' | 'right'): readonly number[] {\n"
        "  const key = `${id}-${facing}`;\n"
        "  const bounds = candidate === 'b01d' ? IONA_B01D_FRAME_BOUNDS[key as keyof typeof IONA_B01D_FRAME_BOUNDS] : IONA_B01C_FRAME_BOUNDS[key as keyof typeof IONA_B01C_FRAME_BOUNDS];\n"
        "  return bounds ?? [0, 0, 128, 80];\n"
        "}\n"
    )
    metrics_path.write_text(metrics_text, encoding="utf-8")

    manifest = {
        "schemaVersion": 1,
        "candidateId": "IONA_B01D_BASE_V1",
        "status": "B01D_PROVISIONAL_OWNER_REVIEW_PENDING",
        "baselineCommit": old["baselineCommit"],
        "ownerApproval": "PENDING_OWNER_REVIEW",
        "readyToPromote": False,
        "physicsBody": {"width": 15, "height": 30, "authority": "unchanged B00 Arcade body"},
        "canvas": {"width": CANVAS[0], "height": CANVAS[1]},
        "workingDisplayHeightPx": 60,
        "runFrameVisibleHeightPx": TARGET_RUN_HEIGHT,
        "anchor": {"x": ANCHOR_X, "feetY": FEET_Y},
        "palette": colors,
        "exporter": {"script": "tools/art-export/build-iona-b01d.py", "PillowVersion": PIL.__version__},
        "frameMetricsModule": {"path": metrics_path.relative_to(ROOT).as_posix(), "sha256": sha256(metrics_path)},
        "sourceSheets": SOURCE_SHEETS,
        "runtimeFrameCount": len(records),
        "runPoseCountPerFacing": len(RUN_POSES),
        "runClip": {"poseOrder": ["run-0", "run-1", "run-3", "run-2"], "frameDurationMs": 105, "cycleMs": 420, "contactPoseFrameIds": ["run-0", "run-3"], "contactPhaseMs": [0, 210]},
        "frameCoverage": "B01C actions retained byte-identically except run loops, replaced by four separate image-generated poses per facing.",
        "runtimeFrames": records,
    }
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"PASS: B01D exported {len(records)} frames (B01C frames retained; 8 new run poses), canvas 128x80, run visible height={TARGET_RUN_HEIGHT}, palette=32")


if __name__ == "__main__":
    main()

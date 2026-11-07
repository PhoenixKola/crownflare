#!/usr/bin/env python3
"""Build the isolated B01E side-kick correction from native ImageGen sources."""
from __future__ import annotations

import hashlib
import json
import shutil
import statistics
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFont
import PIL

ROOT = Path(__file__).resolve().parents[2]
SOURCE_ROOT = ROOT / "art-source/characters/iona/b01e"
ORIGINAL = SOURCE_ROOT / "original-imagegen"
CORRECTED = SOURCE_ROOT / "corrected-poses"
RUNTIME = ROOT / "public/assets/characters/iona/b01e"
MANIFEST = ROOT / "art-source/manifests/iona-b01e-candidate-v1.json"
EVIDENCE = ROOT / "review-evidence/b01e"
B01C_MANIFEST = ROOT / "art-source/manifests/iona-b01c-production-v1.json"
B01D_MANIFEST = ROOT / "art-source/manifests/iona-b01d-candidate-v1.json"
B01D_RUNTIME = ROOT / "public/assets/characters/iona/b01d"
CANVAS = (128, 80)
ANCHOR_X, FEET_Y = 64, 80
ALPHA_THRESHOLD = 192
POSES = (("combo-2-windup", "chamber-guard"), ("combo-2-windup-1", "lifted-chamber"), ("combo-2-contact", "side-kick-contact"), ("combo-2-recovery", "recoil-recovery"))
SOURCE_SHEETS = {
    "left": {
        "path": "art-source/characters/iona/b01e/original-imagegen/iona-sidekick-left-4pose-imagegen-01.png",
        "toolOutputId": "exec-650c8fd4-692e-40c9-908f-189fa811a1a7.png",
        "sha256": "4397aaa19132053cb77c9de2b23f17139b14eb48f1f3a85e02314f577d9ac91b",
        "reference": "art-source/characters/iona/b01c/generated/iona-combo-2-left-sidekick-6pose-imagegen-01.png",
        "promptId": "b01e-sidekick-left-4pose-v1",
    },
    "right": {
        "path": "art-source/characters/iona/b01e/original-imagegen/iona-sidekick-right-4pose-imagegen-01.png",
        "toolOutputId": "exec-2c20e536-00a9-4818-84d0-18c2d533065f.png",
        "sha256": "03512a4b18a19d1836976fbd47c23f80baf092116c2b026dbe33c277ffc64fa3",
        "reference": "art-source/characters/iona/b01c/generated/iona-combo-2-right-sidekick-6pose-imagegen-01.png",
        "promptId": "b01e-sidekick-right-4pose-v1",
    },
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_lf(path: Path, text: str) -> None:
    path.write_bytes(text.replace("\r\n", "\n").replace("\r", "\n").encode("utf-8"))


def rgba_sha(image: Image.Image) -> str:
    import io
    stream = io.BytesIO()
    image.save(stream, format="PNG", optimize=True)
    return hashlib.sha256(stream.getvalue()).hexdigest()


def threshold(image: Image.Image) -> Image.Image:
    image = image.convert("RGBA")
    image.putalpha(image.getchannel("A").point(lambda value: 255 if value >= ALPHA_THRESHOLD else 0))
    return image


def trim(image: Image.Image) -> tuple[Image.Image, tuple[int, int, int, int]]:
    image = threshold(image)
    bounds = image.getchannel("A").getbbox()
    if bounds is None:
        raise RuntimeError("ImageGen pose is empty after alpha cleanup")
    return image.crop(bounds), bounds


def palette_image(colors: list[str]) -> Image.Image:
    palette = Image.new("P", (1, 1))
    values: list[int] = []
    for color in colors:
        values.extend((int(color[1:3], 16), int(color[3:5], 16), int(color[5:7], 16)))
    values.extend(values[-3:] * ((768 - len(values)) // 3))
    palette.putpalette(values[:768])
    return palette


def quantize(image: Image.Image, palette: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    output = rgba.convert("RGB").quantize(palette=palette, dither=Image.Dither.NONE).convert("RGBA")
    output.putalpha(rgba.getchannel("A"))
    return output


def waist_x(image: Image.Image) -> float:
    alpha = image.getchannel("A")
    left, top, right, bottom = alpha.getbbox() or (0, 0, image.width, image.height)
    y0, y1 = top + int((bottom - top) * .48), top + int((bottom - top) * .72)
    points = [x for y in range(y0, y1) for x in range(left, right) if alpha.getpixel((x, y)) == 255]
    return float(statistics.median(points)) if points else (left + right) / 2


def cell_bounds(image: Image.Image, index: int) -> tuple[int, int, int, int]:
    col, row = index % 2, index // 2
    return (round(col * image.width / 2), round(row * image.height / 2), round((col + 1) * image.width / 2), round((row + 1) * image.height / 2))


def place(image: Image.Image, factor: float, palette: Image.Image) -> tuple[Image.Image, list[int]]:
    width, height = max(1, round(image.width * factor)), max(1, round(image.height * factor))
    scaled = quantize(image.resize((width, height), Image.Resampling.NEAREST), palette)
    x, y = round(ANCHOR_X - waist_x(image) * factor), FEET_Y - height
    if x < 0 or y < 0 or x + width > CANVAS[0] or y + height > CANVAS[1]:
        raise RuntimeError(f"B01E pose clips canvas: offset=({x},{y}) size=({width},{height})")
    canvas = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    canvas.alpha_composite(scaled, (x, y))
    return canvas, list(canvas.getchannel("A").getbbox() or (0, 0, 0, 0))


def main() -> None:
    b01c = json.loads(B01C_MANIFEST.read_text(encoding="utf-8"))
    b01d = json.loads(B01D_MANIFEST.read_text(encoding="utf-8"))
    palette = palette_image(b01c["processing"]["globalPalette"])
    old_d = {(frame["id"], frame["facing"]): frame for frame in b01d["runtimeFrames"]}
    old_c = {(frame["id"], frame["facing"]): frame for frame in b01c["runtimeFrames"]}
    CORRECTED.mkdir(parents=True, exist_ok=True)
    RUNTIME.mkdir(parents=True, exist_ok=True)
    records: list[dict[str, Any]] = []
    generated_per_facing: dict[str, list[tuple[Image.Image, tuple[int, int, int, int], tuple[int, int, int, int]]]] = {}

    for facing in ("left", "right"):
        meta = SOURCE_SHEETS[facing]
        source_path = ROOT / meta["path"]
        if sha256(source_path) != meta["sha256"]:
            raise RuntimeError(f"ImageGen source SHA mismatch: {source_path}")
        sheet = Image.open(source_path).convert("RGBA")
        raw_poses = []
        for index, (frame_id, pose_name) in enumerate(POSES):
            bounds = cell_bounds(sheet, index)
            cell = threshold(sheet.crop(bounds))
            cropped, crop_bounds = trim(cell)
            if crop_bounds[0] <= 0 or crop_bounds[1] <= 0 or crop_bounds[2] >= cell.width or crop_bounds[3] >= cell.height:
                raise RuntimeError(f"Pose touches source cell boundary: {facing}/{pose_name}/{crop_bounds}")
            raw_poses.append((cropped, bounds, crop_bounds))
        median_height = statistics.median(image.height for image, _, _ in raw_poses)
        factor = 60 / median_height
        generated_per_facing[facing] = raw_poses

        for frame_id, facing_key in old_d:
            if facing_key != facing or frame_id in {"combo-2-windup", "combo-2-contact", "combo-2-recovery"}:
                continue
            source = old_d[(frame_id, facing)]
            old_path = ROOT / source["runtimePng"]
            output_path = RUNTIME / f"{frame_id}-{facing}.png"
            shutil.copyfile(old_path, output_path)
            image = Image.open(output_path).convert("RGBA")
            visible = list(image.getchannel("A").getbbox() or (0, 0, 0, 0))
            records.append({
                **source, "sourceCandidate": "B01D", "frameId": frame_id,
                "source": source["runtimePng"], "sourceSha256": source["runtimeSha256"],
                "runtimePng": output_path.relative_to(ROOT).as_posix(), "runtimeSha256": sha256(output_path),
                "runtimeCanvas": {"width": 128, "height": 80}, "runtimeVisibleBounds": visible,
                "runtimeVisibleHeightPx": visible[3] - visible[1], "anchor": {"x": 64, "feetY": 80},
                "candidateStatus": "UNCHANGED_REUSED", "ownerApproval": "PENDING_OWNER_REVIEW",
                "manualEditDescription": "Copied byte-identically from the provisional B01D candidate.",
            })

        for index, (frame_id, pose_name) in enumerate(POSES):
            cropped, source_cell_bounds, trim_bounds = raw_poses[index]
            source_crop = CORRECTED / f"{pose_name}-{facing}.png"
            cropped.save(source_crop, optimize=True)
            output, visible = place(cropped, factor, palette)
            output_path = RUNTIME / f"{frame_id}-{facing}.png"
            output.save(output_path, optimize=True)
            parent_id = frame_id.removesuffix("-1")
            legacy = old_d.get((parent_id, facing))
            base = old_c[(parent_id, facing)]
            duration = 55 if frame_id in ("combo-2-windup", "combo-2-windup-1") else 90 if frame_id.endswith("-contact") else 170
            records.append({
                "id": frame_id, "frameId": frame_id, "action": "combo-2-" + ("windup" if "windup" in frame_id else "contact" if frame_id.endswith("contact") else "recovery"),
                "actionId": "iona-base-combo-2", "facing": facing, "pose": pose_name,
                "source": meta["path"], "sourceSha256": meta["sha256"], "sourceTool": "OpenAI native image_gen.imagegen",
                "toolOutputId": meta["toolOutputId"], "modelVersion": "unknown (not exposed by tool result)",
                "referencePath": meta["reference"], "referenceSha256": sha256(ROOT / meta["reference"]),
                "promptId": meta["promptId"], "cellIndex": index, "cellBoundsSourcePixels": list(source_cell_bounds),
                "trimBoundsWithinCell": list(trim_bounds), "croppedSourcePath": source_crop.relative_to(ROOT).as_posix(),
                "croppedSourceSha256": sha256(source_crop), "croppedSourceContentSha256": rgba_sha(cropped),
                "runtimePng": output_path.relative_to(ROOT).as_posix(), "runtimeSha256": sha256(output_path),
                "runtimeCanvas": {"width": 128, "height": 80}, "runtimeVisibleBounds": visible,
                "runtimeVisibleHeightPx": visible[3] - visible[1], "nominalVisibleHeightPx": 60,
                "runtimeScale": round(factor, 9), "facingMedianSourceHeight": median_height,
                "alphaPixels": sum(1 for value in output.getchannel("A").tobytes() if value),
                "anchor": {"x": ANCHOR_X, "feetY": FEET_Y}, "durationMs": duration,
                "contactAnchor": {"eventId": "contact", "contactEventMs": 138, "pixelPoint": None, "note": "Authoritative B00 action clock remains unchanged."} if frame_id.endswith("-contact") else None,
                "vfxAnchor": None, "sfxAnchor": {"whoosh": "combo-2-start", "resolution": "authoritative contact at 138ms"},
                "baselineB01C": base["runtimePng"], "baselineB01CSha256": base["runtimeSha256"],
                "replacedB01DSha256": legacy["runtimeSha256"] if legacy else None,
                "pixelMethod": "alpha >= 192; cell crop; one shared nearest-neighbor scale per facing from median source pose height; B01C shared 32-color palette; no dithering; waist-aligned x64 and visible feet y80 on a 128x80 transparent canvas",
                "manualEditDescription": "No hand-redrawn pixels. Reproducible crop, threshold, scale, palette, waist alignment and planted ground baseline only.",
                "candidateStatus": "NEW_IMAGEGEN_POSE", "ownerApproval": "PENDING_OWNER_REVIEW",
            })

    if len(records) != 70 or sum(row["candidateStatus"] == "UNCHANGED_REUSED" for row in records) != 62:
        raise RuntimeError(f"Unexpected B01E inventory: {len(records)} records")

    # Publish a compact, actual-pixel comparison sheet for the eight source-driven poses.
    contact = Image.new("RGBA", (4 * 128, 2 * 100), (13, 20, 33, 255))
    draw = ImageDraw.Draw(contact)
    font = ImageFont.load_default()
    for row, facing in enumerate(("left", "right")):
        for index, (frame_id, pose) in enumerate(POSES):
            frame = Image.open(RUNTIME / f"{frame_id}-{facing}.png").convert("RGBA")
            contact.alpha_composite(frame, (index * 128, row * 100 + 16))
            draw.text((index * 128 + 3, row * 100 + 3), f"{facing} / {pose}", font=font, fill=(238, 235, 220, 255))
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    contact.save(EVIDENCE / "iona-b01e-sidekick-poses.png", optimize=True)

    metrics = {f"{row['id']}-{row['facing']}": row["runtimeVisibleBounds"] for row in records}
    metrics_text = (
        "// Generated by tools/art-export/build-iona-b01e.py; do not edit by hand.\n"
        "export const IONA_B01E_FRAME_BOUNDS = " + json.dumps(metrics, indent=2) + " as const;\n"
        "export function ionaB01EFrameBounds(id: string, facing: 'left' | 'right'): readonly number[] {\n"
        "  const key = `${id}-${facing}`;\n"
        "  return IONA_B01E_FRAME_BOUNDS[key as keyof typeof IONA_B01E_FRAME_BOUNDS] ?? [0, 0, 128, 80];\n"
        "}\n"
    )
    write_lf(ROOT / "src/game/animation/ionaB01eFrameMetrics.ts", metrics_text)

    manifest = {
        "schemaVersion": 1, "candidateId": "IONA_B01E_BASE_SIDEKICK_V1", "status": "B01E_PROVISIONAL_OWNER_REVIEW_PENDING",
        "baselineCommit": b01d["baselineCommit"], "ownerApproval": "PENDING_OWNER_REVIEW", "readyToPromote": False,
        "physicsBody": {"width": 15, "height": 30, "authority": "unchanged B00 Arcade body"},
        "canvas": {"width": 128, "height": 80}, "workingDisplayHeightPx": 60, "anchor": {"x": 64, "feetY": 80},
        "palette": b01c["processing"]["globalPalette"], "exporter": {"script": "tools/art-export/build-iona-b01e.py", "PillowVersion": PIL.__version__},
        "frameMetricsModule": {"path": "src/game/animation/ionaB01eFrameMetrics.ts", "sha256": sha256(ROOT / "src/game/animation/ionaB01eFrameMetrics.ts")},
        "sourceSheets": SOURCE_SHEETS, "runtimeFrameCount": 70, "newImagegenPoseCount": 8, "unchangedReusedCount": 62,
        "sidekickClip": {"frames": [{"id": "combo-2-windup", "durationMs": 55}, {"id": "combo-2-windup-1", "durationMs": 55}, {"id": "combo-2-contact", "durationMs": 90}, {"id": "combo-2-recovery", "durationMs": 170}], "totalMs": 370, "authoritativeContactMs": 138},
        "frameCoverage": "B01D runtime retained except the six legacy combo-2 side-kick frames are replaced; two additional authored chamber frames extend windup.",
        "runtimeFrames": records,
    }
    write_lf(MANIFEST, json.dumps(manifest, indent=2) + "\n")
    print("PASS: B01E exported 70 frames (8 ImageGen poses / 62 unchanged B01D), two 370ms side-kick cycles, 128x80 canvas")


if __name__ == "__main__":
    main()

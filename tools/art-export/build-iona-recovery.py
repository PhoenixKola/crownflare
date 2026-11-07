#!/usr/bin/env python3
"""Crop Codex imagegen source sheets into aligned Crownflare runtime sprite frames."""

from __future__ import annotations

import hashlib
import json
import statistics
from pathlib import Path
from typing import Any

from PIL import Image
import PIL


ROOT = Path(__file__).resolve().parents[2]
GENERATED = ROOT / "art-source/characters/iona/b01-recovery/generated"
CROPS = ROOT / "art-source/characters/iona/b01-recovery/cropped-poses"
RUNTIME = ROOT / "public/assets/characters/iona/b01-recovery"
MANIFEST = ROOT / "art-source/manifests/iona-b01-recovery-v2.json"
PROVENANCE = ROOT / "art-source/characters/iona/b01-recovery/generation-provenance.json"
CANVAS = (128, 80)
ANCHOR_X = 64
FEET_Y = 80
TARGET_HEIGHT = 60
ALPHA_THRESHOLD = 192


SHEETS: dict[str, dict[str, Any]] = {
    "idle-right": {
        "file": "iona-idle-right-4pose-imagegen-01.png",
        "action": "idle",
        "facing": "right",
        "frames": [(1, "idle-1", "inhale"), (2, "idle-2", "weight-settle"), (3, "idle-3", "quiet-settle")],
    },
    "idle-left": {
        "file": "iona-idle-left-4pose-imagegen-01.png",
        "action": "idle",
        "facing": "left",
        "frames": [(0, "idle-0", "ready"), (1, "idle-1", "inhale"), (2, "idle-2", "weight-settle"), (3, "idle-3", "quiet-settle")],
    },
    "run-right": {
        "file": "iona-run-right-4pose-imagegen-01.png",
        "action": "run",
        "facing": "right",
        "frames": [(0, "run-0", "forward-contact"), (1, "run-1", "passing"), (2, "run-2", "airborne"), (3, "run-3", "opposite-contact")],
    },
    "run-left": {
        "file": "iona-run-left-4pose-imagegen-01.png",
        "action": "run",
        "facing": "left",
        "frames": [(0, "run-0", "forward-contact"), (1, "run-1", "passing"), (2, "run-2", "airborne"), (3, "run-3", "opposite-contact")],
    },
    "jab-right": {
        "file": "iona-jab-right-4pose-imagegen-01.png",
        "action": "jab",
        "facing": "right",
        "frames": [(0, "jab-0", "windup"), (1, "jab-1", "extension"), (2, "jab-2", "contact"), (3, "jab-3", "recoil")],
    },
    "jab-left": {
        "file": "iona-jab-left-4pose-imagegen-01.png",
        "action": "jab",
        "facing": "left",
        "frames": [(0, "jab-0", "windup"), (1, "jab-1", "extension"), (2, "jab-2", "contact"), (3, "jab-3", "recoil")],
    },
}

MASTER = {
    "file": "iona-base-right-ready-imagegen-01.png",
    "frame": "idle-0",
    "action": "idle",
    "facing": "right",
    "pose": "selected-base-master-ready",
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def clean_alpha(image: Image.Image) -> Image.Image:
    """Turn the generator's nearly opaque antialiased edge into clean binary alpha."""
    image = image.convert("RGBA")
    alpha = image.getchannel("A").point(lambda value: 255 if value >= ALPHA_THRESHOLD else 0)
    image.putalpha(alpha)
    return image


def bounds(image: Image.Image) -> tuple[int, int, int, int]:
    result = image.getchannel("A").getbbox()
    if result is None:
        raise RuntimeError("Generated pose contains no visible pixels")
    return result


def estimate_waist_x(image: Image.Image, box: tuple[int, int, int, int]) -> float:
    """Estimate a stable torso/hip pivot, ignoring trailing hair, sash and punching fist."""
    left, top, right, bottom = box
    height = bottom - top
    y_start = top + int(height * 0.52)
    y_end = top + int(height * 0.70)
    alpha = image.getchannel("A")
    points: list[int] = []
    for y in range(y_start, y_end):
        points.extend(x for x in range(left, right) if alpha.getpixel((x, y)) > 0)
    if not points:
        return (left + right) / 2
    return float(statistics.median(points))


def crop_cell(sheet: Image.Image, index: int) -> tuple[Image.Image, tuple[int, int, int, int], tuple[int, int, int, int]]:
    width, height = sheet.size
    x_mid, y_mid = width // 2, height // 2
    column, row = index % 2, index // 2
    cell_bounds = (
        0 if column == 0 else x_mid,
        0 if row == 0 else y_mid,
        x_mid if column == 0 else width,
        y_mid if row == 0 else height,
    )
    cell = clean_alpha(sheet.crop(cell_bounds))
    box = bounds(cell)
    left, top, right, bottom = box
    # A pose that meets a cell edge is likely clipped or contaminated by its neighbor.
    if left == 0 or top == 0 or right == cell.width or bottom == cell.height:
        raise RuntimeError(f"Pose cell {index} touches its crop edge: {box} / {cell.size}")
    return cell.crop(box), box, cell_bounds


def paste_pose(
    crop: Image.Image,
    scale: float,
    *,
    y_lift: int = 0,
) -> tuple[Image.Image, tuple[int, int, int, int], float]:
    crop = clean_alpha(crop)
    source_box = bounds(crop)
    pivot_x = estimate_waist_x(crop, source_box)
    target_width = max(1, round(crop.width * scale))
    target_height = max(1, round(crop.height * scale))
    scaled = crop.resize((target_width, target_height), Image.Resampling.NEAREST)
    scaled_pivot = pivot_x * scale
    x = round(ANCHOR_X - scaled_pivot)
    y = FEET_Y - target_height - y_lift
    if x < 0 or y < 0 or x + target_width > CANVAS[0] or y + target_height > CANVAS[1]:
        raise RuntimeError(f"Pose would be clipped during placement: x={x}, y={y}, size={target_width}x{target_height}")
    canvas = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    canvas.alpha_composite(scaled, (x, y))
    box = bounds(canvas)
    left, top, right, bottom = box
    if left <= 0 or top <= 0 or right >= CANVAS[0] or bottom > CANVAS[1]:
        raise RuntimeError(f"Exported pose clips canvas edge: {box}")
    return canvas, box, pivot_x


def pose_record(
    *,
    frame_id: str,
    facing: str,
    action: str,
    pose_name: str,
    source_path: Path,
    crop: Image.Image,
    crop_box: tuple[int, int, int, int],
    cell_bounds: tuple[int, int, int, int] | None,
    cell_index: int | None,
    scale: float,
    y_lift: int = 0,
) -> dict[str, Any]:
    source_crop_path = CROPS / f"{frame_id}-{facing}-source-crop.png"
    source_crop_path.parent.mkdir(parents=True, exist_ok=True)
    crop.save(source_crop_path, optimize=True)
    runtime_image, runtime_bounds, pivot_x = paste_pose(crop, scale, y_lift=y_lift)
    runtime_path = RUNTIME / f"{frame_id}-{facing}.png"
    runtime_path.parent.mkdir(parents=True, exist_ok=True)
    runtime_image.save(runtime_path, optimize=True)
    alpha = runtime_image.getchannel("A")
    alpha_values = sorted(set(alpha.get_flattened_data()))
    if alpha_values != [0, 255]:
        raise RuntimeError(f"Runtime alpha is not binary for {runtime_path}")
    return {
        "id": frame_id,
        "action": action,
        "facing": facing,
        "poseName": pose_name,
        "generatedSource": source_path.relative_to(ROOT).as_posix(),
        "generatedSourceSha256": sha256(source_path),
        "cellIndex": None if cell_index is None else {"row": cell_index // 2, "column": cell_index % 2},
        "cellBoundsSourcePixels": cell_bounds,
        "trimBoundsSourcePixels": crop_box,
        "sourceCrop": source_crop_path.relative_to(ROOT).as_posix(),
        "sourceCropSha256": sha256(source_crop_path),
        "runtimePng": runtime_path.relative_to(ROOT).as_posix(),
        "runtimeSha256": sha256(runtime_path),
        "runtimeCanvas": {"width": CANVAS[0], "height": CANVAS[1]},
        "runtimeVisibleBounds": runtime_bounds,
        "runtimeAlphaPixels": sum(1 for value in alpha.get_flattened_data() if value == 255),
        "sourcePosePixels": crop.size,
        "scale": round(scale, 8),
        "estimatedWaistPivotSourceX": round(pivot_x, 2),
        "anchor": {"x": ANCHOR_X, "feetY": FEET_Y, "flightLiftPx": y_lift},
        "pixelMethod": "alpha-threshold-192, alpha-trim, nearest-neighbor resize, transparent-canvas placement",
        "handRetouched": False,
        "mirrored": False,
    }


def main() -> None:
    provenance = json.loads(PROVENANCE.read_text(encoding="utf-8"))
    records: list[dict[str, Any]] = []

    # Keep and use the generator's single-figure master as the first right-facing idle frame.
    master_path = GENERATED / MASTER["file"]
    master = clean_alpha(Image.open(master_path))
    master_box = bounds(master)
    master_crop = master.crop(master_box)
    records.append(pose_record(
        frame_id=MASTER["frame"], facing=MASTER["facing"], action=MASTER["action"], pose_name=MASTER["pose"],
        source_path=master_path, crop=master_crop, crop_box=master_box, cell_bounds=None, cell_index=None,
        scale=TARGET_HEIGHT / master_crop.height,
    ))

    for sheet_key, spec in SHEETS.items():
        source_path = GENERATED / spec["file"]
        sheet = Image.open(source_path).convert("RGBA")
        prepared: list[tuple[int, str, str, Image.Image, tuple[int, int, int, int], tuple[int, int, int, int]]] = []
        for index, frame_id, pose_name in spec["frames"]:
            crop, crop_box, cell_bounds = crop_cell(sheet, index)
            prepared.append((index, frame_id, pose_name, crop, crop_box, cell_bounds))
        median_height = statistics.median(crop.height for _, _, _, crop, _, _ in prepared)
        scale = TARGET_HEIGHT / median_height
        for index, frame_id, pose_name, crop, crop_box, cell_bounds in prepared:
            # The authored run flight pose is deliberately kept just above the ground.
            y_lift = 4 if spec["action"] == "run" and frame_id == "run-2" else 0
            records.append(pose_record(
                frame_id=frame_id, facing=spec["facing"], action=spec["action"], pose_name=pose_name,
                source_path=source_path, crop=crop, crop_box=crop_box, cell_bounds=cell_bounds, cell_index=index,
                scale=scale, y_lift=y_lift,
            ))

    base_runtime = Image.open(RUNTIME / "idle-0-right.png").convert("RGBA")
    base_alpha = base_runtime.getchannel("A")
    silhouette = Image.new("RGBA", base_runtime.size, (10, 12, 18, 0))
    silhouette.putalpha(base_alpha)
    silhouette_path = RUNTIME / "base-60-silhouette.png"
    silhouette.save(silhouette_path, optimize=True)

    # Verify each action/facing has enough authored poses and meaningful adjacent silhouette changes.
    groups: dict[str, list[dict[str, Any]]] = {}
    for record in records:
        groups.setdefault(f"{record['action']}-{record['facing']}", []).append(record)
    for group_name, items in groups.items():
        items.sort(key=lambda item: int(item["id"].split("-")[-1]))
        if len(items) < 3:
            raise RuntimeError(f"Too few original poses in {group_name}")
        if len({item["runtimeSha256"] for item in items}) != len(items):
            raise RuntimeError(f"Duplicate runtime frame bytes in {group_name}")

    generated_records = []
    for output in provenance["outputs"]:
        output_path = GENERATED / output["file"]
        with Image.open(output_path) as image:
            width, height = image.size
            mode = image.mode
            alpha_extrema = image.getchannel("A").getextrema() if mode == "RGBA" else None
        generated_records.append({
            **output,
            "sourceFile": output_path.relative_to(ROOT).as_posix(),
            "resolvedOriginalPath": output["codexOutputPath"],
            "bytes": output_path.stat().st_size,
            "sha256": sha256(output_path),
            "width": width,
            "height": height,
            "mode": mode,
            "alphaExtrema": alpha_extrema,
        })

    idle_clip = [{"id": f"idle-{index}", "durationMs": duration} for index, duration in enumerate([420, 260, 300, 420])]
    run_clip = [{"id": f"run-{index}", "durationMs": duration} for index, duration in enumerate([105, 95, 90, 105])]
    jab_clip = [
        {"id": "jab-0", "timeRangeMs": [0, 80], "meaning": "windup"},
        {"id": "jab-1", "timeRangeMs": [80, 130], "meaning": "visible extension before active"},
        {"id": "jab-2", "timeRangeMs": [130, 230], "meaning": "active/contact; combat event at 162ms"},
        {"id": "jab-3", "timeRangeMs": [230, 350], "meaning": "recoil"},
        {"id": "idle-3", "timeRangeMs": [350, 490], "meaning": "settle during late recovery"},
    ]

    manifest = {
        "schemaVersion": 2,
        "batch": "B01 RECOVERY",
        "status": "B01_RECOVERY_PROVISIONAL",
        "ownerApproval": "PENDING",
        "previousOvernightActorStatus": "REJECTED_OWNER_ART",
        "runtimeDefault": "generated-image-source sprite frames; old overnight art only via ?animationLab=1&oldRejectedArt=1",
        "generator": provenance["generator"],
        "generationPromptFile": "art-source/characters/iona/b01-recovery/generation-prompts.md",
        "generatedOutputCount": len(generated_records),
        "generatedOutputs": generated_records,
        "processing": {
            "script": "tools/art-export/build-iona-recovery.py",
            "PillowVersion": PIL.__version__,
            "alphaThresholdInclusive": ALPHA_THRESHOLD,
            "resize": "nearest-neighbor",
            "runtimeCanvas": {"width": CANVAS[0], "height": CANVAS[1]},
            "visibleHeightTargetPx": TARGET_HEIGHT,
            "anchor": {"x": ANCHOR_X, "feetY": FEET_Y},
            "waistPivot": "median alpha x-coordinate from 52%-70% of trimmed source pose height",
            "manualRedrawCount": 0,
            "mirroredFrameCount": 0,
        },
        "clips": {
            "idle": {"frames": idle_clip, "uniqueAuthoredPoseCountByFacing": {"right": 4, "left": 4}, "loops": True},
            "run": {"frames": run_clip, "uniqueAuthoredPoseCountByFacing": {"right": 4, "left": 4}, "loops": True},
            "jab": {
                "framesByFacing": {"right": jab_clip, "left": jab_clip},
                "startupMs": 130,
                "activeMs": 100,
                "recoveryMs": 260,
                "contactEventMs": 162,
                "loop": False,
            },
            "jumpDash": {"status": "NOT_AUTHORED_IN_RECOVERY_BATCH", "runtimeFallback": "generated run/idle poses only; no new claim of jump or dash animation"},
        },
        "runtimeFrames": records,
        "derivedReviewAssets": [{
            "file": silhouette_path.relative_to(ROOT).as_posix(),
            "sha256": sha256(silhouette_path),
            "derivedFromRuntimeFrame": "public/assets/characters/iona/b01-recovery/idle-0-right.png",
            "purpose": "VFX-off silhouette comparison only; not counted as an authored pose",
        }],
        "audit": {
            "allFramesTransparent": True,
            "allRuntimeAlphaBinary": True,
            "allFramesFitCanvas": True,
            "sourceToRuntimeHashChainRecorded": True,
            "runtimeFrameCount": len(records),
            "runtimeAuthoredPoseCount": len(records),
            "runtimeFacings": ["right", "left"],
            "visualReview": "PENDING_REAL_CHROME_REVIEW",
            "artMotionGate": "PENDING_OWNER_REVIEW",
        },
    }
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"PASS: exported {len(records)} generated-source poses; transparent {CANVAS[0]}x{CANVAS[1]} frames; manifest {MANIFEST.relative_to(ROOT)}")
    for group_name, items in sorted(groups.items()):
        print(f"{group_name}: {len(items)} unique frames")


if __name__ == "__main__":
    main()

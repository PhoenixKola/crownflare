#!/usr/bin/env python3
"""Build B01C's separate-frame Iona production pilot with reproducible pixel cleanup."""

from __future__ import annotations

import hashlib
import io
import json
import statistics
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFont
import PIL


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "art-source/characters/iona"
B01C = SOURCE / "b01c"
GENERATED = B01C / "generated"
RUNTIME = ROOT / "public/assets/characters/iona/b01c"
BASELINE_CROPS = SOURCE / "b01-recovery/cropped-poses"
BASELINE_RUNTIME = ROOT / "public/assets/characters/iona/b01-recovery"
MANIFEST = ROOT / "art-source/manifests/iona-b01c-production-v1.json"
PROVENANCE = B01C / "generation-provenance.json"
EVIDENCE = ROOT / "review-evidence/b01c"
CANVAS = (128, 80)
ANCHOR_X = 64
FEET_Y = 80
TARGET_HEIGHT = 60
ALPHA_THRESHOLD = 192
PALETTE_SIZE = 32


def cell_frames(sheet: str, action: str, ids: list[str], poses: list[str], facing: str, rows: int = 2, cell_offset: int = 0) -> list[dict[str, Any]]:
    return [
        {"id": frame_id, "action": action, "pose": pose, "facing": facing, "source": f"art-source/characters/iona/b01c/generated/{sheet}", "cell": index + cell_offset, "columns": 3, "rows": rows}
        for index, (frame_id, pose) in enumerate(zip(ids, poses, strict=True))
    ]


FRAME_DEFS: list[dict[str, Any]] = []
for facing in ("right", "left"):
    for index, pose in enumerate(("ready", "inhale", "weight-settle", "quiet-settle")):
        FRAME_DEFS.append({"id": f"idle-{index}", "action": "idle", "pose": pose, "facing": facing, "source": f"art-source/characters/iona/b01-recovery/cropped-poses/idle-{index}-{facing}-source-crop.png", "cell": None})
    FRAME_DEFS += cell_frames(f"iona-run-{facing}-6pose-imagegen-{'02' if facing == 'right' else '01'}.png", "run",
        [f"run-{i}" for i in range(6)], ["forward-contact", "compression", "passing", "airborne-split", "opposite-contact", "recovery-pass"], facing)
    FRAME_DEFS += cell_frames(f"iona-jump-{facing}-6pose-imagegen-01.png", "jump",
        [f"jump-{i}" for i in range(6)], ["load", "takeoff", "rise", "apex", "fall", "landing-compression"], facing)
    FRAME_DEFS += cell_frames(f"iona-dash-{facing}-6pose-imagegen-01.png", "dash",
        [f"dash-{i}" for i in range(6)], ["anticipation", "launch", "active-first", "active-extended", "braking", "recovery"], facing)
    for step, poses in enumerate((
        ("lead-hand anticipation", "lead-hand contact", "lead-hand recoil"),
        ("side-kick chamber", "side-kick contact", "side-kick recoil"),
        ("rising-forearm anticipation", "rising-forearm contact", "rising-forearm recoil"),
    ), start=1):
        sheet = f"iona-combo-{facing}-9pose-imagegen-01.png" if step != 2 else f"iona-combo-2-{facing}-sidekick-6pose-imagegen-01.png"
        FRAME_DEFS += cell_frames(
            sheet, f"combo-{step}",
            [f"combo-{step}-{phase}" for phase in ("windup", "contact", "recovery")], list(poses), facing,
            rows=2 if step == 2 else 3, cell_offset=0 if step == 2 else (step - 1) * 3,
        )

for source_facing, target_facing, sheet in (
    ("right", "left", "iona-transition-right-to-left-6pose-imagegen-01.png"),
    ("left", "right", "iona-transition-left-to-right-6pose-imagegen-01.png"),
):
    for frame_id, pose, index, facing in (
        ("start-0", "start-anticipation", 1, source_facing),
        ("start-1", "first-acceleration-step", 2, source_facing),
        ("stop-0", "brake-plant", 3, source_facing),
        ("stop-1", "deep-brake-pivot", 4, source_facing),
        ("turn-1", "turn-finish-ready", 5, target_facing),
    ):
        FRAME_DEFS.append({"id": frame_id, "action": "start" if frame_id.startswith("start") else "stop" if frame_id.startswith("stop") else "turn", "pose": pose, "facing": facing, "source": f"art-source/characters/iona/b01c/generated/{sheet}", "cell": index, "columns": 3, "rows": 2, "transition": f"{source_facing}-to-{target_facing}"})


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def png_sha(image: Image.Image) -> str:
    stream = io.BytesIO()
    image.save(stream, format="PNG", optimize=True)
    return hashlib.sha256(stream.getvalue()).hexdigest()


def binary_alpha(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    alpha = rgba.getchannel("A").point(lambda value: 255 if value >= ALPHA_THRESHOLD else 0)
    rgba.putalpha(alpha)
    return rgba


def trim(image: Image.Image) -> tuple[Image.Image, tuple[int, int, int, int]]:
    image = binary_alpha(image)
    box = image.getchannel("A").getbbox()
    if box is None:
        raise RuntimeError("Source pose has no pixels above the alpha threshold")
    return image.crop(box), box


def load_pose(definition: dict[str, Any], cache: dict[str, Image.Image]) -> tuple[Image.Image, tuple[int, int, int, int], tuple[int, int, int, int] | None]:
    source_path = ROOT / definition["source"]
    if not source_path.is_file():
        raise FileNotFoundError(source_path)
    if definition["cell"] is None:
        image, box = trim(Image.open(source_path))
        return image, box, None
    sheet = cache.setdefault(definition["source"], Image.open(source_path).convert("RGBA"))
    cols, rows = definition["columns"], definition["rows"]
    width, height = sheet.size
    if width < cols or height < rows:
        raise RuntimeError(f"Sprite sheet is smaller than its declared grid: {source_path} {sheet.size}")
    index = int(definition["cell"])
    col, row = index % cols, index // cols
    cell_bounds = (round(col * width / cols), round(row * height / rows), round((col + 1) * width / cols), round((row + 1) * height / rows))
    cell = binary_alpha(sheet.crop(cell_bounds))
    box = cell.getchannel("A").getbbox()
    if box is None:
        raise RuntimeError(f"Empty sprite cell {index}: {source_path}")
    if box[0] <= 0 or box[1] <= 0 or box[2] >= cell.width or box[3] >= cell.height:
        raise RuntimeError(f"Sprite touches its cell edge; likely clipped/overlapping: {source_path} cell {index} bounds {box}")
    return cell.crop(box), box, cell_bounds


def waist_x(image: Image.Image) -> float:
    alpha = image.getchannel("A")
    left, top, right, bottom = alpha.getbbox() or (0, 0, image.width, image.height)
    y0 = top + int((bottom - top) * 0.50)
    y1 = top + int((bottom - top) * 0.72)
    points = [x for y in range(y0, y1) for x in range(left, right) if alpha.getpixel((x, y)) == 255]
    return float(statistics.median(points)) if points else (left + right) / 2


def place(image: Image.Image, scale: float, palette: Image.Image) -> tuple[Image.Image, tuple[int, int, int, int]]:
    width, height = max(1, round(image.width * scale)), max(1, round(image.height * scale))
    scaled = image.resize((width, height), Image.Resampling.NEAREST)
    # One deterministic shared palette for every B01C frame; no dithering introduces unstable pixel noise.
    indexed = scaled.convert("RGB").quantize(palette=palette, dither=Image.Dither.NONE)
    colored = indexed.convert("RGBA")
    colored.putalpha(scaled.getchannel("A"))
    x = round(ANCHOR_X - waist_x(image) * scale)
    y = FEET_Y - height
    if x < 0 or y < 0 or x + width > CANVAS[0] or y + height > CANVAS[1]:
        raise RuntimeError(f"Pose would clip the runtime frame: x={x}, y={y}, dimensions={width}x{height}")
    canvas = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    canvas.alpha_composite(colored, (x, y))
    box = canvas.getchannel("A").getbbox()
    if box is None or box[0] <= 0 or box[2] >= CANVAS[0] or box[3] > CANVAS[1]:
        raise RuntimeError(f"Placed sprite clips the runtime canvas: {box}")
    if set(canvas.getchannel("A").get_flattened_data()) - {0, 255}:
        raise RuntimeError("Pixel cleanup produced non-binary alpha")
    return canvas, box


def make_palette(images: list[Image.Image]) -> Image.Image:
    samples: list[tuple[int, int, int]] = []
    for image in images:
        pixels = image.get_flattened_data()
        # Evenly sample visible source colors to avoid weighting one long sheet or transparent haze.
        visible = [pixel[:3] for pixel in pixels if pixel[3] == 255]
        stride = max(1, len(visible) // 10000)
        samples.extend(visible[::stride])
    sample_image = Image.new("RGB", (len(samples), 1))
    sample_image.putdata(samples)
    return sample_image.quantize(colors=PALETTE_SIZE, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)


def export_frame(definition: dict[str, Any], image: Image.Image, source_box: tuple[int, int, int, int], cell_bounds: tuple[int, int, int, int] | None, scale: float, palette: Image.Image) -> dict[str, Any]:
    output, visible_box = place(image, scale, palette)
    relative_source = definition["source"]
    source_path = ROOT / relative_source
    runtime_path = RUNTIME / f"{definition['id']}-{definition['facing']}.png"
    runtime_path.parent.mkdir(parents=True, exist_ok=True)
    output.save(runtime_path, optimize=True)
    return {
        "id": definition["id"], "action": definition["action"], "facing": definition["facing"], "pose": definition["pose"],
        "source": relative_source, "sourceSha256": sha256(source_path), "cellIndex": definition.get("cell"),
        "cellGrid": {"columns": definition.get("columns"), "rows": definition.get("rows")},
        "cellBoundsSourcePixels": cell_bounds, "trimBoundsWithinCellOrCrop": source_box,
        "trimmedCropSha256": png_sha(image), "runtimePng": runtime_path.relative_to(ROOT).as_posix(), "runtimeSha256": sha256(runtime_path),
        "runtimeCanvas": {"width": CANVAS[0], "height": CANVAS[1]}, "runtimeVisibleBounds": visible_box,
        "sourceVisibleSize": {"width": image.width, "height": image.height}, "runtimeScale": round(scale, 9),
        "anchor": {"x": ANCHOR_X, "feetY": FEET_Y}, "alphaPixels": sum(value == 255 for value in output.getchannel("A").get_flattened_data()),
        "pixelMethod": "alpha threshold 192; trim; shared 32-color palette; nearest-neighbor; no dithering; transparent canvas",
        "mirrored": False, "handRetouched": False,
    }


def build_method_comparisons(palette: Image.Image, scale: float) -> list[dict[str, Any]]:
    source_path = BASELINE_CROPS / "run-0-right-source-crop.png"
    nearest_path = BASELINE_RUNTIME / "run-0-right.png"
    grid_crop, grid_bounds = trim(Image.open(source_path))
    grid_image, grid_box = place(grid_crop, TARGET_HEIGHT / grid_crop.height, palette)
    RUNTIME.mkdir(parents=True, exist_ok=True)
    grid_path = RUNTIME / "method-grid-right.png"
    grid_image.save(grid_path, optimize=True)

    native_path = GENERATED / "iona-run-right-pose0-native-edit-01.png"
    native_crop, native_bounds = trim(Image.open(native_path))
    native_image, native_box = place(native_crop, TARGET_HEIGHT / native_crop.height, palette)
    native_out = RUNTIME / "method-native-edit-right.png"
    native_image.save(native_out, optimize=True)
    methods = [
        {"method": "shared-grid cleanup", "source": source_path.relative_to(ROOT).as_posix(), "sourceSha256": sha256(source_path), "trimBounds": grid_bounds, "runtime": grid_path.relative_to(ROOT).as_posix(), "runtimeSha256": sha256(grid_path), "visibleBounds": grid_box, "notes": "Same original pose, binary alpha, common palette, nearest-neighbor, no dithering."},
        {"method": "native edit + shared-grid cleanup", "source": native_path.relative_to(ROOT).as_posix(), "sourceSha256": sha256(native_path), "reference": source_path.relative_to(ROOT).as_posix(), "trimBounds": native_bounds, "runtime": native_out.relative_to(ROOT).as_posix(), "runtimeSha256": sha256(native_out), "visibleBounds": native_box, "notes": "Constrained native image edit of the same pose followed by the same runtime canvas and shared-palette export."},
    ]
    comparison_scale = 4
    comparison = Image.new("RGBA", (3 * 320 * comparison_scale, 300 * comparison_scale), (13, 20, 34, 255))
    draw = ImageDraw.Draw(comparison)
    font = ImageFont.load_default()
    for index, entry in enumerate(methods):
        method_image = Image.open(ROOT / entry["runtime"]).convert("RGBA").resize((128 * comparison_scale, 80 * comparison_scale), Image.Resampling.NEAREST)
        x_offset = index * 320 * comparison_scale
        comparison.alpha_composite(method_image, (x_offset + 32 * comparison_scale, 110 * comparison_scale))
        draw.text((x_offset + 24 * comparison_scale, 12 * comparison_scale), entry["method"], font=font, fill=(244, 235, 215, 255))
        draw.text((x_offset + 24 * comparison_scale, 32 * comparison_scale), "SAME SOURCE POSE / 60PX", font=font, fill=(175, 205, 198, 255))
    comparison_path = EVIDENCE / "iona-b01c-pixel-method-comparison.png"
    comparison_path.parent.mkdir(parents=True, exist_ok=True)
    comparison.save(comparison_path, optimize=True)
    return methods


def build_contact_sheet(records: list[dict[str, Any]]) -> str:
    grouped: dict[str, list[dict[str, Any]]] = {}
    for record in records:
        grouped.setdefault(record["action"], []).append(record)
    actions = ["idle", "start", "run", "stop", "turn", "jump", "dash", "combo-1", "combo-2", "combo-3"]
    cell_w, cell_h, scale = 128, 80, 2
    title_h, gutter = 26, 12
    row_height = title_h + cell_h + gutter
    canvas = Image.new("RGBA", (cell_w * 12 * scale, (len(actions) * row_height + gutter) * scale), (12, 18, 31, 255))
    draw = ImageDraw.Draw(canvas)
    font = ImageFont.load_default()
    y = gutter * scale
    for action in actions:
        draw.text((10, y), action.upper() + "  /  LEFT-FACING FRAMES, THEN RIGHT-FACING FRAMES", font=font, fill=(242, 226, 198, 255))
        y += title_h * scale
        draw.text((4, y + 2), "LEFT", font=font, fill=(126, 198, 190, 255))
        draw.text((6 * cell_w * scale + 4, y + 2), "RIGHT", font=font, fill=(126, 198, 190, 255))
        for side_index, facing in enumerate(("left", "right")):
            phase_order = {"windup": 0, "contact": 1, "recovery": 2}
            items = sorted((r for r in records if r["action"] == action and r["facing"] == facing), key=lambda r: (phase_order.get(r["pose"].split(" ")[-1], 0) if action.startswith("combo-") else 0, r["id"]))
            for local_index, record in enumerate(items):
                col = side_index * 6 + local_index
                image = Image.open(ROOT / record["runtimePng"]).convert("RGBA").resize((cell_w * scale, cell_h * scale), Image.Resampling.NEAREST)
                canvas.alpha_composite(image, (col * cell_w * scale, y))
                draw.text((col * cell_w * scale + 3, y + 2), record["id"], font=font, fill=(255, 239, 214, 255))
        y += (cell_h + gutter) * scale
    output = EVIDENCE / "iona-b01c-action-contact-sheet.png"
    output.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(output, optimize=True)
    return output.relative_to(ROOT).as_posix()


def main() -> None:
    cache: dict[str, Image.Image] = {}
    prepared: list[tuple[dict[str, Any], Image.Image, tuple[int, int, int, int], tuple[int, int, int, int] | None]] = []
    for definition in FRAME_DEFS:
        pose, box, cell_bounds = load_pose(definition, cache)
        prepared.append((definition, pose, box, cell_bounds))
    # A single logical scale keeps identity consistent across generated actions and directions.
    scale = TARGET_HEIGHT / statistics.median(image.height for definition, image, _, _ in prepared if "/b01c/generated/" in definition["source"])
    palette = make_palette([image for _, image, _, _ in prepared])
    palette_values = palette.getpalette()[: PALETTE_SIZE * 3]
    colors = ["#%02X%02X%02X" % tuple(palette_values[i : i + 3]) for i in range(0, len(palette_values), 3)]

    records = [
        export_frame(
            definition, image, box, cell_bounds,
            TARGET_HEIGHT / image.height if "/b01-recovery/" in definition["source"] else scale,
            palette,
        )
        for definition, image, box, cell_bounds in prepared
    ]
    comparisons = build_method_comparisons(palette, scale)

    groups: dict[str, list[dict[str, Any]]] = {}
    for record in records:
        group = record["action"] + "-" + record["facing"]
        groups.setdefault(group, []).append(record)
    for group, items in groups.items():
        if len({item["runtimeSha256"] for item in items}) != len(items):
            raise RuntimeError(f"Duplicate runtime frames inside action/facing group {group}")
    if len(records) != len({(r["id"], r["facing"]) for r in records}):
        raise RuntimeError("Duplicate action/frame/facing key in production manifest")

    contact_sheet = build_contact_sheet(records)
    provenance = json.loads(PROVENANCE.read_text(encoding="utf-8"))
    generated = []
    for output in provenance["outputs"]:
        path = ROOT / output["file"]
        with Image.open(path) as image:
            generated.append({**output, "sha256": sha256(path), "bytes": path.stat().st_size, "dimensions": list(image.size), "mode": image.mode, "alphaExtrema": image.getchannel("A").getextrema() if image.mode == "RGBA" else None})
    manifest = {
        "schemaVersion": 1,
        "batch": "B01C EXTENDED IONA PRODUCTION PILOT",
        "baselineCommit": "12b72c9eb959a2ae50a9ad0fbd3870a26a3e1965",
        "status": "B01C_PROVISIONAL_OWNER_REVIEW_PENDING",
        "canonicalIdentity": "B01 candidate remains provisional; recovery Base source used as a direction reference only",
        "ownerApproval": "PENDING",
        "preservation": {"b00RootPromptDeletion": "preserved; already committed at baseline", "originalRecoverySourceAndManifest": "not modified", "physicsBody": "unchanged 15x30"},
        "generator": "Codex native image_gen.imagegen; exact model/version not returned by tool and not inferred",
        "generationPrompts": "art-source/characters/iona/b01c/generation-prompts.md",
        "generationProvenance": "art-source/characters/iona/b01c/generation-provenance.json",
        "generatedOutputs": generated,
        "processing": {
            "script": "tools/art-export/build-iona-b01c.py", "PillowVersion": PIL.__version__,
            "alphaThresholdInclusive": ALPHA_THRESHOLD, "runtimeCanvas": {"width": CANVAS[0], "height": CANVAS[1]},
            "targetVisibleHeightMedianPx": TARGET_HEIGHT, "sharedScale": round(scale, 9), "globalPaletteSize": PALETTE_SIZE, "globalPalette": colors,
            "resize": "nearest-neighbor", "dithering": "none", "anchor": {"x": ANCHOR_X, "feetY": FEET_Y},
            "frameAlignment": "waist median x pivot at shared x 64; grounded foot baseline 80; jump/dash body motion remains physics-owned",
            "handRedrawCount": 0, "mirroredRuntimeFrames": 0,
        },
        "pixelMethodComparison": comparisons,
        "clips": {
            "idle": {"posesPerFacing": 4, "loops": True}, "start": {"generatedTransitionFramesPerFacing": 2, "durationMs": 140},
            "run": {"posesPerFacing": 6, "loops": True, "frameDurationMs": 70, "cycleMs": 420},
            "stop": {"generatedTransitionFramesPerFacing": 2, "durationMs": 140},
            "turn": {"separatelyAuthoredLeftToRightAndRightToLeftTransition": True, "durationMs": 90},
            "jump": {"phasesPerFacing": ["load", "takeoff", "rise", "apex", "fall", "landing-compression"], "artAuthoredPerFacing": True, "physicsOwned": True},
            "dash": {"phasesPerFacing": ["anticipation", "launch", "active-first", "active-extended", "braking", "recovery"], "durationMs": 125, "recoveryMs": 100},
            "threeHitCombo": {
                "status": "PILOTED_AFTER_PROVISIONAL_LOCOMOTION_GATE",
                "steps": [
                    {"moveId": "iona-base-combo-1", "artFramesPerFacing": ["combo-1-windup", "combo-1-contact", "combo-1-recovery"], "startupMs": 90, "activeMs": 80, "recoveryMs": 170, "contactEventMs": 112},
                    {"moveId": "iona-base-combo-2", "artFramesPerFacing": ["combo-2-windup", "combo-2-contact", "combo-2-recovery"], "startupMs": 110, "activeMs": 90, "recoveryMs": 170, "contactEventMs": 138},
                    {"moveId": "iona-base-combo-3", "artFramesPerFacing": ["combo-3-windup", "combo-3-contact", "combo-3-recovery"], "startupMs": 140, "activeMs": 100, "recoveryMs": 220, "contactEventMs": 165},
                ],
                "bufferMs": 650,
                "notes": "One fresh J press starts each step; a second press buffers the next authored attack. Holding J does not generate repeats.",
            },
        },
        "runtimeFrames": records,
        "evidence": {"actionContactSheet": contact_sheet, "pixelMethodComparison": "review-evidence/b01c/iona-b01c-pixel-method-comparison.png", "normalSpeedChrome": "review-evidence/b01c/iona-b01c-60s.webm"},
        "audit": {
            "runtimeFrameCount": len(records), "allFacingsAuthoredSeparately": True, "allFramesTransparentAndBinaryAlpha": True,
            "allFramesFit128x80": True, "allActionsHaveDistinctSourcePoses": True, "sourceToRuntimeHashesRecorded": True,
            "phaserIntegration": "PENDING_CHROME_QA", "normalSpeedReview": "PENDING_CHROME_QA", "artMotionGate": "PENDING_OWNER_REVIEW",
        },
    }
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"PASS: B01C exported {len(records)} runtime frames at {CANVAS[0]}x{CANVAS[1]}, shared palette={PALETTE_SIZE}, scale={scale:.6f}")
    for group, items in sorted(groups.items()):
        print(f"{group}: {len(items)} unique frames")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Export the isolated Iona Stormhalo frame-based animation pilot."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
PILOT = ROOT / "art-source/characters/iona/stormhalo-pilot"
GEN = PILOT / "generation"
REFS = PILOT / "references"
OUT = ROOT / "review-evidence/stormhalo-pilot"
EXPORTS = OUT / "exports"
CANVAS = (128, 112)
FOOT_Y = 106
BODY_HEIGHT = 60
ALPHA_CUTOFF = 192
MATTE = (5, 15, 23, 255)
PANEL = (8, 25, 35, 255)
INK = (222, 238, 234, 255)
MINT = (124, 232, 221, 255)

TRANSFORM_SHEET = GEN / "stormhalo-transformation-sheet-imagegen-02.png"
IDLE_SHEET = GEN / "stormhalo-idle-sheet-imagegen-02.png"
AURA_SHEET = GEN / "stormhalo-aura-sheet-imagegen-02.png"
CONCEPT = GEN / "stormhalo-concept-imagegen-02.png"

TRANSFORM = [
    ("anticipation", 180, 0.07, 0.89),
    ("ignition", 170, 0.07, 0.89),
    ("surge", 180, 0.12, 0.89),
    ("silhouette-break", 160, 0.22, 0.97),
    ("transformed-reveal", 240, 0.22, 0.97),
    ("settle", 300, 0.22, 0.97),
]
IDLE = [
    ("idle-01", 240),
    ("idle-02", 240),
    ("idle-03", 240),
    ("idle-04", 240),
]
AURA_LAYERS = {
    "split-halo": {"row": 0, "width": 84, "center_y": 28},
    "orbit-filaments": {"row": 1, "width": 68, "center_y": 60},
    "prismatic-motes": {"row": 2, "width": 84, "center_y": 58},
}
AURA_DURATIONS = [160, 160, 160, 160]


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def threshold_alpha(image: Image.Image, cutoff: int = ALPHA_CUTOFF) -> Image.Image:
    image = image.convert("RGBA")
    alpha = image.getchannel("A").point(lambda value: 255 if value >= cutoff else 0)
    image.putalpha(alpha)
    return image


def cell(sheet: Image.Image, columns: int, rows: int, index: int) -> Image.Image:
    column = index % columns
    row = index // columns
    bounds = (
        round(column * sheet.width / columns),
        round(row * sheet.height / rows),
        round((column + 1) * sheet.width / columns),
        round((row + 1) * sheet.height / rows),
    )
    return threshold_alpha(sheet.crop(bounds))


def character_frame(
    source_cell: Image.Image,
    body_top: float,
    foot: float = 0.97,
    output_size: tuple[int, int] = CANVAS,
    foot_y: int = FOOT_Y,
) -> Image.Image:
    """Scale from body height, keeping the full cell's detached halo and VFX."""
    source_cell = threshold_alpha(source_cell)
    source_body_height = max(1.0, (foot - body_top) * source_cell.height)
    scale = BODY_HEIGHT / source_body_height
    resized = source_cell.resize(
        (max(1, round(source_cell.width * scale)), max(1, round(source_cell.height * scale))),
        Image.Resampling.NEAREST,
    )
    result = Image.new("RGBA", output_size, (0, 0, 0, 0))
    left = round((output_size[0] - resized.width) / 2)
    top = round(foot_y - foot * source_cell.height * scale)
    clipped = (
        max(0, -left),
        max(0, -top),
        min(resized.width, output_size[0] - left),
        min(resized.height, output_size[1] - top),
    )
    result.alpha_composite(resized.crop(clipped), (max(0, left), max(0, top)))
    return result


def fit_effect(source_cell: Image.Image, target_width: int, center_y: int) -> Image.Image:
    source_cell = threshold_alpha(source_cell)
    bbox = source_cell.getchannel("A").getbbox()
    result = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    if bbox is None:
        return result
    cropped = source_cell.crop(bbox)
    target_height = max(1, round(cropped.height * target_width / cropped.width))
    cropped = cropped.resize((target_width, target_height), Image.Resampling.NEAREST)
    result.alpha_composite(cropped, (round((CANVAS[0] - target_width) / 2), round(center_y - target_height / 2)))
    return result


def font(size: int) -> ImageFont.ImageFont:
    for candidate in (r"C:\Windows\Fonts\consola.ttf", r"C:\Windows\Fonts\segoeui.ttf"):
        try:
            return ImageFont.truetype(candidate, size)
        except OSError:
            pass
    return ImageFont.load_default()


def review_matte(image: Image.Image, scale: int = 4) -> Image.Image:
    image = image.convert("RGBA").resize(
        (image.width * scale, image.height * scale), Image.Resampling.NEAREST
    )
    matte = Image.new("RGBA", image.size, MATTE)
    matte.alpha_composite(image)
    return matte


def contact_sheet(
    images: list[Image.Image], labels: list[str], path: Path, columns: int, scale: int = 4,
    title: str = "",
) -> None:
    panel_w = CANVAS[0] * scale + 24
    panel_h = CANVAS[1] * scale + 46
    rows = (len(images) + columns - 1) // columns
    title_h = 48 if title else 0
    sheet = Image.new("RGBA", (columns * panel_w + 32, rows * panel_h + title_h + 24), MATTE)
    draw = ImageDraw.Draw(sheet)
    if title:
        draw.text((18, 12), title.upper(), fill=MINT, font=font(18))
    for index, (image, label) in enumerate(zip(images, labels)):
        x = 16 + (index % columns) * panel_w
        y = title_h + 12 + (index // columns) * panel_h
        draw.rounded_rectangle((x, y, x + panel_w - 8, y + panel_h - 8), radius=3, fill=PANEL)
        preview = review_matte(image, scale)
        sheet.alpha_composite(preview, (x + 12, y + 8))
        draw.text((x + 12, y + CANVAS[1] * scale + 14), label.upper(), fill=INK, font=font(13))
    path.parent.mkdir(parents=True, exist_ok=True)
    sheet.convert("RGB").save(path, quality=95)


def save_gif(images: list[Image.Image], durations: list[int], path: Path, scale: int = 4) -> None:
    frames = [review_matte(image, scale).convert("RGB") for image in images]
    path.parent.mkdir(parents=True, exist_ok=True)
    frames[0].save(
        path,
        save_all=True,
        append_images=frames[1:],
        duration=durations,
        loop=0,
        disposal=2,
        optimize=False,
    )


def compose_layers(layers: list[Image.Image]) -> Image.Image:
    result = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    for layer in layers:
        result.alpha_composite(layer)
    return result


def main() -> None:
    for path in (TRANSFORM_SHEET, IDLE_SHEET, AURA_SHEET, CONCEPT):
        if not path.is_file():
            raise FileNotFoundError(path)

    transform_sheet = Image.open(TRANSFORM_SHEET).convert("RGBA")
    idle_sheet = Image.open(IDLE_SHEET).convert("RGBA")
    aura_sheet = Image.open(AURA_SHEET).convert("RGBA")

    transform_dir = EXPORTS / "transformation/frames"
    idle_dir = EXPORTS / "transformed-idle/frames"
    aura_dir = EXPORTS / "aura"
    transform_dir.mkdir(parents=True, exist_ok=True)
    idle_dir.mkdir(parents=True, exist_ok=True)

    transform_frames: list[Image.Image] = []
    transform_manifest: list[dict[str, object]] = []
    for index, (name, duration, body_top, foot) in enumerate(TRANSFORM):
        frame = character_frame(cell(transform_sheet, 3, 2, index), body_top, foot)
        path = transform_dir / f"{index + 1:02d}-{name}.png"
        frame.save(path)
        transform_frames.append(frame)
        transform_manifest.append({
            "id": name,
            "frame": index,
            "durationMs": duration,
            "file": path.relative_to(ROOT).as_posix(),
            "sha256": sha256(path),
            "sourceCell": {"column": index % 3, "row": index // 3},
            "bodyScaleReference": {"bodyTopRatio": body_top, "footRatio": foot, "bodyHeightPx": BODY_HEIGHT},
            "canvas": list(CANVAS),
            "alpha": True,
            "resampling": "nearest-neighbor",
        })

    idle_frames: list[Image.Image] = []
    idle_manifest: list[dict[str, object]] = []
    for index, (name, duration) in enumerate(IDLE):
        frame = character_frame(cell(idle_sheet, 2, 2, index), 0.22, 0.97)
        path = idle_dir / f"{index + 1:02d}-{name}.png"
        frame.save(path)
        idle_frames.append(frame)
        idle_manifest.append({
            "id": name,
            "frame": index,
            "durationMs": duration,
            "file": path.relative_to(ROOT).as_posix(),
            "sha256": sha256(path),
            "sourceCell": {"column": index % 2, "row": index // 2},
            "bodyScaleReference": {"bodyTopRatio": 0.22, "footRatio": 0.97, "bodyHeightPx": BODY_HEIGHT},
            "canvas": list(CANVAS),
            "alpha": True,
            "resampling": "nearest-neighbor",
        })

    aura_layers: dict[str, list[Image.Image]] = {}
    aura_manifest: dict[str, list[dict[str, object]]] = {}
    for layer_name, config in AURA_LAYERS.items():
        game_dir = aura_dir / layer_name / "game-scale"
        raw_dir = aura_dir / layer_name / "source-cells"
        game_dir.mkdir(parents=True, exist_ok=True)
        raw_dir.mkdir(parents=True, exist_ok=True)
        game_frames: list[Image.Image] = []
        cell_manifest: list[dict[str, object]] = []
        for frame_index, duration in enumerate(AURA_DURATIONS):
            source_cell = cell(aura_sheet, 4, 3, config["row"] * 4 + frame_index)
            raw_path = raw_dir / f"{frame_index + 1:02d}.png"
            source_cell.save(raw_path)
            frame = fit_effect(source_cell, config["width"], config["center_y"])
            game_path = game_dir / f"{frame_index + 1:02d}.png"
            frame.save(game_path)
            game_frames.append(frame)
            cell_manifest.append({
                "frame": frame_index,
                "durationMs": duration,
                "sourceCell": {"column": frame_index, "row": config["row"]},
                "sourceFile": raw_path.relative_to(ROOT).as_posix(),
                "sourceSha256": sha256(raw_path),
                "file": game_path.relative_to(ROOT).as_posix(),
                "sha256": sha256(game_path),
                "canvas": list(CANVAS),
                "alpha": True,
                "resampling": "nearest-neighbor",
            })
        aura_layers[layer_name] = game_frames
        aura_manifest[layer_name] = cell_manifest

    # The halo is an intrinsic Stormhalo accessory in the idle character art.
    # Keep its separate loop for reuse, but do not double-draw it in the composed aura preview.
    aura_preview_frames: list[Image.Image] = []
    idle_aura_frames: list[Image.Image] = []
    for index in range(4):
        aura_only = compose_layers([
            aura_layers["split-halo"][index],
            aura_layers["orbit-filaments"][index],
            aura_layers["prismatic-motes"][index],
        ])
        aura_preview_frames.append(aura_only)
        combined = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
        combined.alpha_composite(aura_layers["orbit-filaments"][index])
        combined.alpha_composite(idle_frames[index])
        combined.alpha_composite(aura_layers["prismatic-motes"][index])
        idle_aura_frames.append(combined)
        aura_only.save(aura_dir / f"composite-components-{index + 1:02d}.png")
        combined.save(aura_dir / f"idle-with-aura-{index + 1:02d}.png")

    contact_dir = OUT / "contact-sheets"
    clips_dir = OUT / "clips"
    contact_sheet(
        transform_frames,
        [f"{i + 1:02d} {state[0]}" for i, state in enumerate(TRANSFORM)],
        contact_dir / "transformation-contact-sheet.png", 3, 4,
        "Iona / Stormhalo transformation · 60px body scale",
    )
    contact_sheet(
        idle_frames,
        [name for name, _ in IDLE],
        contact_dir / "transformed-idle-contact-sheet.png", 2, 4,
        "Stormhalo / transformed idle · 60px body scale",
    )
    contact_sheet(
        idle_aura_frames,
        [f"aura phase {index + 1}" for index in range(4)],
        contact_dir / "transformed-idle-aura-contact-sheet.png", 2, 4,
        "Stormhalo / idle with separate aura layers",
    )

    aura_sheet_preview = Image.new("RGBA", (4 * (CANVAS[0] * 3 + 20) + 140, 3 * (CANVAS[1] * 3 + 36) + 68), MATTE)
    aura_draw = ImageDraw.Draw(aura_sheet_preview)
    aura_draw.text((18, 12), "STORMHALO / SEPARATE AURA LAYERS · 4-PHASE LOOP", fill=MINT, font=font(18))
    aura_titles = ["SPLIT HALO", "ORBIT FILAMENTS", "PRISMATIC MOTES"]
    for row, layer_name in enumerate(AURA_LAYERS):
        y = 52 + row * (CANVAS[1] * 3 + 36)
        aura_draw.text((18, y + 124), aura_titles[row], fill=INK, font=font(12))
        for column, frame in enumerate(aura_layers[layer_name]):
            x = 120 + column * (CANVAS[0] * 3 + 20)
            aura_sheet_preview.alpha_composite(review_matte(frame, 3), (x, y))
    (contact_dir).mkdir(parents=True, exist_ok=True)
    aura_sheet_preview.convert("RGB").save(contact_dir / "aura-loop-contact-sheet.png")

    transform_durations = [entry[1] for entry in TRANSFORM]
    save_gif(transform_frames, transform_durations, clips_dir / "transformation-sequence.gif")
    save_gif(idle_frames, [duration for _, duration in IDLE], clips_dir / "transformed-idle.gif")
    save_gif(aura_preview_frames, AURA_DURATIONS, clips_dir / "aura-components-loop.gif")
    save_gif(idle_aura_frames, AURA_DURATIONS, clips_dir / "transformed-idle-with-aura.gif")

    # Three-form comparison at the same 60px character height and foot anchor.
    base_source = Image.open(REFS / "iona-b01e-runtime-base-idle-right.png").convert("RGBA")
    dawn_source = Image.open(REFS / "iona-b05-runtime-dawnrush-idle-ready-right.png").convert("RGBA")
    def normalize_runtime(source: Image.Image) -> Image.Image:
        source = threshold_alpha(source)
        bbox = source.getchannel("A").getbbox()
        result = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
        if bbox is None:
            return result
        cropped = source.crop(bbox)
        resized = cropped.resize((round(cropped.width * BODY_HEIGHT / cropped.height), BODY_HEIGHT), Image.Resampling.NEAREST)
        result.alpha_composite(resized, (round((CANVAS[0] - resized.width) / 2), FOOT_Y - BODY_HEIGHT))
        return result
    comparison = [normalize_runtime(base_source), normalize_runtime(dawn_source), idle_aura_frames[0]]
    comparison_names = ["BASE / B01E RUNTIME", "DAWNRUSH / B05 RUNTIME", "STORMHALO / PILOT"]
    compare_path = contact_dir / "three-form-side-by-side-review-board.png"
    contact_sheet(comparison, comparison_names, compare_path, 3, 5, "Crownflare / same 60px body scale + foot line")

    total_duration = sum(transform_durations)
    events = [
        {"id": "activation", "timeMs": 180, "atFrame": "ignition"},
        {"id": "surge", "timeMs": 350, "atFrame": "surge"},
        {"id": "silhouette_break", "timeMs": 530, "atFrame": "silhouette-break"},
        {"id": "form_commit", "timeMs": 690, "atFrame": "transformed-reveal"},
        {"id": "settled", "timeMs": total_duration, "atFrame": "settle"},
    ]

    source_paths = [
        CONCEPT,
        TRANSFORM_SHEET,
        IDLE_SHEET,
        AURA_SHEET,
        REFS / "iona-b01e-runtime-base-idle-right.png",
        REFS / "iona-b05-runtime-dawnrush-idle-ready-right.png",
        REFS / "stormhalo-study-source.png",
        REFS / "dawnrush-transformation-01a1b353.png",
    ]
    exported_pngs = sorted(EXPORTS.rglob("*.png"))
    export_audit: list[dict[str, object]] = []
    for path in exported_pngs:
        with Image.open(path) as exported:
            rgba = exported.convert("RGBA")
            alpha = rgba.getchannel("A")
            alpha_min, alpha_max = alpha.getextrema()
            alpha_bytes = alpha.tobytes()
            entry = {
                "path": path.relative_to(ROOT).as_posix(),
                "sha256": sha256(path),
                "dimensions": list(rgba.size),
                "alphaExtrema": [alpha_min, alpha_max],
                "transparentPixelCount": alpha_bytes.count(0),
                "partialAlphaPixelCount": sum(0 < value < 255 for value in alpha_bytes),
            }
            if path.parts[-2] == "frames" or "game-scale" in path.parts or path.name.startswith(("composite-", "idle-with-aura-")):
                if rgba.size != CANVAS:
                    raise ValueError(f"Unexpected game-scale dimensions: {path} {rgba.size}")
                if alpha_min != 0:
                    raise ValueError(f"Export is missing transparent pixels: {path}")
                if entry["partialAlphaPixelCount"]:
                    raise ValueError(f"Expected crisp binary alpha after thresholding: {path}")
            export_audit.append(entry)

    (OUT / "export-audit.json").write_text(json.dumps({
        "schemaVersion": 1,
        "generatedBy": "tools/art-export/build-stormhalo-pilot.py",
        "alphaCutoff": ALPHA_CUTOFF,
        "gameCanvas": list(CANVAS),
        "bodyHeightPx": BODY_HEIGHT,
        "footAnchorY": FOOT_Y,
        "gameScaleExportsAreTransparent": True,
        "gameScaleAlphaIsBinary": True,
        "gameScalePngCount": sum(1 for entry in export_audit if entry["dimensions"] == list(CANVAS)),
        "files": export_audit,
    }, indent=2) + "\n", encoding="utf-8")

    manifest = {
        "schemaVersion": 1,
        "pilotId": "iona-stormhalo-second-transformation-pilot",
        "createdDate": "2026-11-12",
        "targetForm": {
            "name": "Stormhalo",
            "canonicalDirection": "Resonant Crown: split hovering halo, long angular collar/coat fins, indigo and white-violet prismatic electricity; precise counter-fighter.",
            "sourceDocs": ["docs/01-creative-vision.md", "docs/02-hero-and-transformations-bible.md"],
            "runtimeIntegration": "not included; Stormhalo remains a post-release form",
        },
        "verdict": {
            "classification": "PARTIAL SUCCESS — frame-based visual/export pilot",
            "visualStatus": "generated and exported for owner review; no owner art approval is implied",
            "rigStatus": "not tested; no character parts sheet or editable rigid-cutout rig was built",
            "reason": "The reusable Blender rig baseline is external to this checkout, and the game bible documents form attachment/switching as unsupported. A transformation is a good frame-based fallback; this artifact does not validate reusable skeletal motion.",
        },
        "animationMethod": {
            "type": "frame-based image-generation key poses",
            "generationPrompts": (PILOT / "generation-prompts.md").relative_to(ROOT).as_posix(),
            "exportSource": (ROOT / "tools/art-export/build-stormhalo-pilot.py").relative_to(ROOT).as_posix(),
            "sourceIdentity": "current shipped B01E Base Iona sprite and B05 Dawnrush artwork",
            "canvas": list(CANVAS),
            "footAnchorY": FOOT_Y,
            "bodyHeightPx": BODY_HEIGHT,
            "alphaThreshold": ALPHA_CUTOFF,
            "resampling": "nearest-neighbor",
        },
        "transformation": {"loop": False, "totalDurationMs": total_duration, "events": events, "frames": transform_manifest},
        "transformedIdle": {"loop": True, "totalDurationMs": sum(duration for _, duration in IDLE), "frames": idle_manifest},
        "constantAura": {
            "loop": True,
            "totalDurationMs": sum(AURA_DURATIONS),
            "layers": aura_manifest,
            "compositeNotes": "The intrinsic split halo is already present in the Stormhalo idle art, so the composed character preview layers orbit filaments behind Iona and motes in front. The independent halo loop is exported separately to avoid drawing a duplicate halo in the preview.",
        },
        "sourceFiles": [
            {"path": path.relative_to(ROOT).as_posix(), "sha256": sha256(path), "dimensions": list(Image.open(path).size)}
            for path in source_paths
        ],
        "reviewEvidence": [
            (contact_dir / "transformation-contact-sheet.png").relative_to(ROOT).as_posix(),
            (contact_dir / "transformed-idle-contact-sheet.png").relative_to(ROOT).as_posix(),
            (contact_dir / "transformed-idle-aura-contact-sheet.png").relative_to(ROOT).as_posix(),
            (contact_dir / "aura-loop-contact-sheet.png").relative_to(ROOT).as_posix(),
            compare_path.relative_to(ROOT).as_posix(),
            (OUT / "report.md").relative_to(ROOT).as_posix(),
            (OUT / "export-audit.json").relative_to(ROOT).as_posix(),
            (clips_dir / "transformation-sequence.gif").relative_to(ROOT).as_posix(),
            (clips_dir / "transformed-idle-with-aura.gif").relative_to(ROOT).as_posix(),
        ],
        "scope": {"gameplayCodeChanged": False, "newMoves": False, "combatOrBossIntegration": False, "thirdForm": False},
    }
    manifest_path = PILOT / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

    print(json.dumps({
        "manifest": manifest_path.relative_to(ROOT).as_posix(),
        "transformationFrames": len(transform_manifest),
        "idleFrames": len(idle_manifest),
        "auraFrames": sum(len(value) for value in aura_manifest.values()),
        "contactSheets": [p.relative_to(ROOT).as_posix() for p in sorted(contact_dir.glob("*.png"))],
        "clips": [p.relative_to(ROOT).as_posix() for p in sorted(clips_dir.glob("*.gif"))],
        "transformationDurationMs": total_duration,
        "audit": (OUT / "export-audit.json").relative_to(ROOT).as_posix(),
    }, indent=2))


if __name__ == "__main__":
    main()

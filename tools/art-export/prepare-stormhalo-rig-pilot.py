#!/usr/bin/env python3
"""Deterministically extract authored cutouts and write the isolated RCP v1.1 config."""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / "art-source/characters/iona/stormhalo-rig-pilot"
GEN = ART / "generation"
PARTS = ART / "parts"

# Boxes are the connected, isolated objects from the original ImageGen sheets.
# No joints are cut out of an assembled character pose.
CUTS = {
    "head": ("iona-stormhalo-head-detail-imagegen-03.png", (73, 23, 1372, 1063)),
    "neck": ("iona-stormhalo-rig-body-parts-imagegen-02.png", (532, 401, 716, 542)),
    "torso": ("iona-stormhalo-rig-body-parts-imagegen-02.png", (791, 201, 1177, 547)),
    "pelvis": ("iona-stormhalo-rig-body-parts-imagegen-02.png", (90, 808, 405, 1037)),
    "upper_near": ("iona-stormhalo-rig-parts-imagegen-01.png", (53, 390, 194, 571)),
    "fore_near": ("iona-stormhalo-rig-parts-imagegen-01.png", (271, 418, 443, 568)),
    "hand_near": ("iona-stormhalo-rig-parts-imagegen-01.png", (473, 451, 582, 545)),
    "upper_far": ("iona-stormhalo-rig-parts-imagegen-01.png", (683, 390, 803, 564)),
    "fore_far": ("iona-stormhalo-rig-parts-imagegen-01.png", (875, 418, 1025, 586)),
    "hand_far": ("iona-stormhalo-rig-parts-imagegen-01.png", (1098, 445, 1194, 545)),
    "thigh_near": ("iona-stormhalo-rig-parts-imagegen-01.png", (41, 628, 214, 893)),
    "shin_near": ("iona-stormhalo-rig-parts-imagegen-01.png", (276, 664, 389, 872)),
    "foot_near": ("iona-stormhalo-rig-parts-imagegen-01.png", (457, 734, 590, 885)),
    "thigh_far": ("iona-stormhalo-rig-parts-imagegen-01.png", (683, 628, 835, 889)),
    "shin_far": ("iona-stormhalo-rig-parts-imagegen-01.png", (881, 664, 992, 884)),
    "foot_far": ("iona-stormhalo-rig-parts-imagegen-01.png", (1061, 747, 1212, 887)),
    "sash_near": ("iona-stormhalo-rig-parts-imagegen-01.png", (28, 934, 270, 1235)),
    "sash_far": ("iona-stormhalo-rig-parts-imagegen-01.png", (307, 944, 489, 1227)),
}

S = 0.052
PAD = 8
CROWN_SOURCE = "iona-stormhalo-crown-coat-imagegen-04.png"
CROWN_BOX = (110, 140, 850, 650)


def extract() -> dict[str, list[int]]:
    PARTS.mkdir(parents=True, exist_ok=True)
    sizes: dict[str, list[int]] = {}
    for name, (source, box) in CUTS.items():
        image = Image.open(GEN / source).convert("RGBA")
        expanded = (box[0] - PAD, box[1] - PAD, box[2] + PAD, box[3] + PAD)
        cut = image.crop(expanded)
        cut.save(PARTS / f"{name}.png", optimize=True)
        sizes[name] = list(cut.size)
    return sizes


def extract_crown() -> tuple[list[int], list[int]]:
    """Extract only the generated hovering split-crown component, removing glow fringe."""
    image = Image.open(GEN / CROWN_SOURCE).convert("RGBA").crop(CROWN_BOX)
    alpha = image.getchannel("A").point(lambda value: 255 if value >= 128 else 0)
    image.putalpha(alpha)
    bbox = alpha.getbbox()
    if not bbox:
        raise SystemExit("Generated crown crop has no opaque pixels")
    left, top, right, bottom = bbox
    pad = 8
    crop = image.crop((left - pad, top - pad, right + pad, bottom + pad))
    crop.save(PARTS / "crown.png", optimize=True)
    # Pivot is the rear/lower end of the outer arc, which sits above the back of Iona's hair.
    pivot = [190 - CROWN_BOX[0] - left + pad, 520 - CROWN_BOX[1] - top + pad]
    return list(crop.size), pivot


def part(image: str, size: list[int], pivot: list[int], anchors=None) -> dict:
    scale = 0.0155 if image == "head.png" else S * 1.2 if image.startswith("hand_") else S
    result = {"image": image, "size": size, "pivot": [pivot[0] + PAD, pivot[1] + PAD], "scale": scale}
    if anchors:
        result["anchors"] = {name: [xy[0] + PAD, xy[1] + PAD] for name, xy in anchors.items()}
    return result


def main() -> None:
    if not (GEN / "iona-stormhalo-rig-body-parts-imagegen-02.png").is_file():
        raise SystemExit("Missing ImageGen body parts sheet")
    if not (GEN / "iona-stormhalo-rig-parts-imagegen-01.png").is_file():
        raise SystemExit("Missing ImageGen cutout parts sheet")
    sizes = extract()
    sizes["crown"], crown_pivot = extract_crown()

    parts = {
        "torso": part("torso.png", sizes["torso"], [193, 344], {
            "neck": [193, 20], "sh_near": [287, 98], "sh_far": [82, 98],
            "hip_near": [211, 337], "hip_far": [175, 337],
            "sash_near": [223, 337], "sash_far": [164, 337],
        }),
        "head": part("head.png", sizes["head"], [872, 940], {"crown": [425, 45]}),
        "crown": {"image": "crown.png", "size": sizes["crown"], "pivot": crown_pivot, "scale": 0.035},
        "neck": part("neck.png", sizes["neck"], [92, 0]),
        "pelvis": part("pelvis.png", sizes["pelvis"], [157, 0]),
        "upper_near": part("upper_near.png", sizes["upper_near"], [71, 13], {"child": [69, 170]}),
        "fore_near": part("fore_near.png", sizes["fore_near"], [81, 10], {"child": [120, 96]}),
        "hand_near": part("hand_near.png", sizes["hand_near"], [30, 70]),
        "upper_far": part("upper_far.png", sizes["upper_far"], [60, 12], {"child": [60, 162]}),
        "fore_far": part("fore_far.png", sizes["fore_far"], [130, 10], {"child": [70, 105]}),
        "hand_far": part("hand_far.png", sizes["hand_far"], [34, 73]),
        "thigh_near": part("thigh_near.png", sizes["thigh_near"], [97, 10], {"child": [84, 249]}),
        "shin_near": part("shin_near.png", sizes["shin_near"], [52, 24], {"child": [52, 203]}),
        "foot_near": part("foot_near.png", sizes["foot_near"], [50, 30], {
            "heel": [17, 139], "toe": [130, 139],
        }),
        "thigh_far": part("thigh_far.png", sizes["thigh_far"], [81, 20], {"child": [75, 246]}),
        "shin_far": part("shin_far.png", sizes["shin_far"], [55, 8], {"child": [55, 215]}),
        "foot_far": part("foot_far.png", sizes["foot_far"], [44, 40], {
            "heel": [17, 128], "toe": [149, 128],
        }),
        # These pivots offset the loose tails from the body root to the hidden belt seams.
        "sash_near": part("sash_near.png", sizes["sash_near"], [179, 31]),
        "sash_far": part("sash_far.png", sizes["sash_far"], [179, 31]),
    }

    bones = [
        {"name": "body", "parent": None, "part": "torso"},
        {"name": "head", "parent": "body", "attach": "neck", "part": "head"},
        {"name": "crown", "parent": "head", "attach": "crown", "part": "crown", "inherit_rotation": 0.8},
        {"name": "neckSkin", "parent": "body", "attach": "neck", "part": "neck"},
        {"name": "upper.near", "parent": "body", "attach": "sh_near", "part": "upper_near"},
        {"name": "fore.near", "parent": "upper.near", "attach": "child", "part": "fore_near"},
        {"name": "hand.near", "parent": "fore.near", "attach": "child", "part": "hand_near"},
        {"name": "thigh.near", "parent": "body", "attach": "hip_near", "part": "thigh_near"},
        {"name": "shin.near", "parent": "thigh.near", "attach": "child", "part": "shin_near"},
        {"name": "foot.near", "parent": "shin.near", "attach": "child", "part": "foot_near", "contacts": ["heel", "toe"]},
        {"name": "upper.far", "parent": "body", "attach": "sh_far", "part": "upper_far"},
        {"name": "fore.far", "parent": "upper.far", "attach": "child", "part": "fore_far"},
        {"name": "hand.far", "parent": "fore.far", "attach": "child", "part": "hand_far"},
        {"name": "thigh.far", "parent": "body", "attach": "hip_far", "part": "thigh_far"},
        {"name": "shin.far", "parent": "thigh.far", "attach": "child", "part": "shin_far"},
        {"name": "foot.far", "parent": "shin.far", "attach": "child", "part": "foot_far", "contacts": ["heel", "toe"]},
    ]
    draw_order = [
        {"part": "sash_far", "bone": "body"}, {"part": "sash_near", "bone": "body"},
        {"part": "thigh_far", "bone": "thigh.far"}, {"part": "shin_far", "bone": "shin.far"},
        {"part": "foot_far", "bone": "foot.far"}, {"part": "upper_far", "bone": "upper.far"},
        {"part": "fore_far", "bone": "fore.far"}, {"part": "hand_far", "bone": "hand.far"},
        {"part": "thigh_near", "bone": "thigh.near"}, {"part": "shin_near", "bone": "shin.near"},
        {"part": "foot_near", "bone": "foot.near"}, {"part": "neck", "bone": "neckSkin"},
        {"part": "pelvis", "bone": "body"}, {"part": "torso", "bone": "body"},
        {"part": "crown", "bone": "crown"}, {"part": "head", "bone": "head"}, {"part": "upper_near", "bone": "upper.near"},
        {"part": "fore_near", "bone": "fore.near"}, {"part": "hand_near", "bone": "hand.near"},
    ]
    config = {
        "schema": "rcp.character/1", "id": "iona-stormhalo-rig-pilot-crown", "profile": "biped_side_v1",
        "description": "Real Iona Stormhalo production rig pilot. Body cutouts are native ImageGen separations from generated sheets; no assembled pose was sliced. RCP v1.1 shared Idle and Stress templates only. Option B transformation compositing is documented separately.",
        "art_dir": "parts", "scene": {"root_x": 64, "ground_y": 78.5},
        "camera": {"crop": [0, 0, 128, 80]},
        "outputs": [{"name": "native", "width": 128, "height": 80}],
        "tints": {"far": {"brightness": 0.72, "saturation": 0.88}},
        "parts": parts, "bones": bones, "draw_order": draw_order,
        "animations": {
            "Idle": {"template": "idle_v1", "frames": 48, "export_step": 2, "export_fps": 12, "loop": True},
            "Stress": {"template": "stress_v1", "qa": True, "overrides": {"poses": [
                {"label": "neutral", "body": 0, "head": 0, "near": {"sh": -6, "el": 14, "hip": -6, "knee": 7, "foot": 0}, "far": {"sh": 8, "el": 14, "hip": 9, "knee": 9, "foot": 0}},
                {"label": "ready", "body": -3, "head": 2, "near": {"sh": -20, "el": 35, "hip": -8, "knee": 25, "foot": 0}, "far": {"sh": 20, "el": 25, "hip": 12, "knee": 30, "foot": 0}},
                {"label": "knees", "body": 0, "head": 0, "near": {"sh": -10, "el": 20, "hip": 20, "knee": 60, "foot": 8}, "far": {"sh": 10, "el": 20, "hip": -10, "knee": 45, "foot": -8}},
                {"label": "wide", "body": -5, "head": 1, "near": {"sh": 10, "el": 30, "hip": 25, "knee": 40, "foot": 10}, "far": {"sh": -10, "el": 25, "hip": -20, "knee": 45, "foot": -10}},
                {"label": "elbows", "body": 0, "head": 0, "near": {"sh": -25, "el": 70, "hip": -6, "knee": 7, "foot": 0}, "far": {"sh": 20, "el": 60, "hip": 9, "knee": 9, "foot": 0}},
                {"label": "shoulders", "body": 0, "head": 0, "near": {"sh": 35, "el": 20, "hip": -6, "knee": 7, "foot": 0}, "far": {"sh": -30, "el": 25, "hip": 9, "knee": 9, "foot": 0}},
                {"label": "lean", "body": 8, "head": -6, "near": {"sh": -30, "el": 45, "hip": 10, "knee": 25, "foot": 8}, "far": {"sh": 20, "el": 40, "hip": -10, "knee": 30, "foot": -8}}
            ]}},
        },
        "render": {"master_scale": 1, "texture_interpolation": "Closest", "taa_samples": 1},
        "preview_background": [11, 24, 35],
    }
    (ART / "iona-stormhalo-rig-pilot.character.json").write_text(json.dumps(config, indent=2) + "\n", encoding="utf-8")
    (ART / "parts-source-map.json").write_text(json.dumps({
        "source_generation_images": {"parts_01": "generation/iona-stormhalo-rig-parts-imagegen-01.png", "body_02": "generation/iona-stormhalo-rig-body-parts-imagegen-02.png", "head_detail_03": "generation/iona-stormhalo-head-detail-imagegen-03.png", "crown_coat_04": f"generation/{CROWN_SOURCE}"},
        "cutouts": {name: {"source": f"generation/{source}", "component_box_xyxy": box, "transparent_padding_px": PAD, "output": f"parts/{name}.png"} for name, (source, box) in CUTS.items()},
        "crown": {"source": f"generation/{CROWN_SOURCE}", "component_box_xyxy": CROWN_BOX, "alpha_threshold": 128, "pivot": crown_pivot, "output": "parts/crown.png"},
        "note": "Each crop is one separately generated component from a parts sheet. No component was cut from a finished assembled character illustration. Original source sheets are retained unchanged.",
    }, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(parts)} cutouts and {len(bones)} bones to {ART}")


if __name__ == "__main__":
    main()

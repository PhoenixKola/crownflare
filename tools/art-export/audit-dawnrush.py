#!/usr/bin/env python3
"""Audit B05 generated sources, anatomical anchors, intentional mirrors and runtime texture coverage."""
from __future__ import annotations
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[2]
manifest_path = ROOT / "art-source/manifests/dawnrush-b05-v1.json"
data = json.loads(manifest_path.read_text(encoding="utf-8"))
assert data["candidateId"] == "IONA_B05_DAWNRUSH_GENERATED_FORM_V1"
assert data["physicsBody"] == {"width": 15, "height": 30, "authority": "unchanged B00 Arcade body"}
assert data["canvas"] == {"width": 128, "height": 80, "pivot": {"x": 64, "feetY": 80}, "standingVisibleHeightPx": 60}
sources = data["sourceSheets"]
assert len(sources) == 9, f"expected nine retained source masters, got {len(sources)}"
source_by_path = {source["path"]: source for source in sources}
assert {source["kind"] for source in sources} == {"locomotion", "combat", "lifecycle", "left-specific", "reversion-finisher", "left-transition", "transformation", "vfx", "aura"}
for source in sources:
    path = ROOT / source["path"]
    assert path.is_file(), f"missing generated source {path}"
    assert hashlib.sha256(path.read_bytes()).hexdigest() == source["sha256"], f"source hash mismatch: {path}"
    assert list(Image.open(path).size) == source["dimensions"], f"source dimensions changed: {path}"

records_list = data["runtimeFrames"]
assert data["runtimeFrameCount"] == len(records_list)
assert len({frame["file"] for frame in records_list}) == len(records_list), "duplicate runtime keys in manifest"
records = {frame["file"]: frame for frame in records_list}
for file, record in records.items():
    path = ROOT / file
    assert path.is_file(), f"missing runtime texture: {path}"
    assert hashlib.sha256(path.read_bytes()).hexdigest() == record["sha256"], f"runtime hash mismatch: {path}"
    image = Image.open(path).convert("RGBA")
    assert image.size == (128, 80), f"wrong canvas: {path} / {image.size}"
    assert image.getchannel("A").getbbox(), f"empty sprite: {path}"
    assert record["alphaThreshold"] == 192
    assert record["sourceSheet"] in source_by_path, f"untracked art source: {record['sourceSheet']}"
    if record["facing"] in ("right", "left-mirrored", "left-generated") and "characters/iona/b05/" in file:
        assert record["alphaBounds"][3] == 80, f"foot pivot drift: {path} / {record['alphaBounds']}"
    if record["facing"] == "left-mirrored":
        base_name = Path(file).name.replace("-left.png", "-right.png")
        right = next((r for r in records_list if Path(r["file"]).name == base_name), None)
        assert right, f"missing right-facing source pose for {file}"
        left_image = Image.open(path).convert("RGBA")
        right_image = Image.open(ROOT / right["file"]).convert("RGBA").transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        assert ImageChops.difference(left_image, right_image).getbbox() is None, f"mirror policy mismatch: {file}"

left_generated = [record for record in records_list if record["facing"] == "left-generated"]
assert len(left_generated) >= 20, f"too few true left-specific frames: {len(left_generated)}"
assert all("dawnrush-left-" in record["sourceSheet"] for record in left_generated), "generated left art has incorrect provenance"
left_differences = 0
for record in left_generated:
    filename = Path(record["file"]).name
    right_name = filename.replace("-left.png", "-right.png")
    right = next((item for item in records_list if Path(item["file"]).name == right_name), None)
    if right:
        left = Image.open(ROOT / record["file"]).convert("RGBA")
        flipped = Image.open(ROOT / right["file"]).convert("RGBA").transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        if ImageChops.difference(left, flipped).getbbox() is not None:
            left_differences += 1
assert left_differences >= 12, f"generated left poses do not visibly differ from mirrored art: {left_differences}"

standing_paths = ["public/assets/characters/iona/b05/idle-ready-right.png", "public/assets/characters/iona/b05/idle-ready-left.png"]
standing_heights = []
for file in standing_paths:
    record = records[f"{file}"]
    top, bottom = record["alphaBounds"][1], record["alphaBounds"][3]
    height = bottom - top
    assert 58 <= height <= 60, f"standing scale outside review range: {file} / {height}px"
    standing_heights.append(height)

required_runtime = {
    "light-1-windup-right.png", "light-1-contact-right.png", "light-1-recovery-right.png",
    "light-2-windup-right.png", "light-2-contact-right.png", "light-2-recovery-right.png",
    "light-3-windup-right.png", "light-3-contact-right.png", "light-3-recovery-right.png",
    "hurt-flinch-right.png", "hurt-stagger-right.png", "hurt-ko-right.png", "hurt-recovery-right.png",
    "revert-contract-left.png", "revert-release-left.png", "revert-handoff-left.png",
    "finisher-windup-left.png", "finisher-impact-left.png", "finisher-release-left.png", "finisher-recovery-left.png",
    "fx-pressure-0.png", "fx-pressure-1.png", "fx-orbit-2.png", "fx-speed-3.png",
    "fx-finisher-0.png", "fx-finisher-1.png", "fx-finisher-2.png", "fx-finisher-3.png",
}
runtime_names = {Path(record["file"]).name for record in records_list}
assert required_runtime <= runtime_names, f"missing required runtime texture names: {sorted(required_runtime - runtime_names)}"
for evidence in data["evidence"]:
    assert (ROOT / evidence).is_file(), f"missing completion evidence: {evidence}"
print(json.dumps({
    "result": "PASS", "runtimeFrames": len(records), "generatedLeftFrames": len(left_generated),
    "leftFramesVisiblyDifferentFromMirror": left_differences, "standingVisibleHeightsPx": standing_heights,
    "sourceSheets": len(sources), "physicsBody": data["physicsBody"], "ownerApproval": "pending",
}, indent=2))

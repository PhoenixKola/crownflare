#!/usr/bin/env python3
"""Audit B05 provenance, fixed-pivot exports, hashes and intentional mirror policy."""
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
assert len(data["sourceSheets"]) == 4
for source in data["sourceSheets"]:
    path = ROOT / source["path"]
    assert hashlib.sha256(path.read_bytes()).hexdigest() == source["sha256"], f"source hash mismatch: {path}"
assert data["runtimeFrameCount"] == len(data["runtimeFrames"]) == 76
records = {frame["file"]: frame for frame in data["runtimeFrames"]}
for file, record in records.items():
    path = ROOT / file
    assert hashlib.sha256(path.read_bytes()).hexdigest() == record["sha256"], f"runtime hash mismatch: {path}"
    image = Image.open(path).convert("RGBA")
    assert image.size == (128, 80), f"wrong canvas: {path} / {image.size}"
    assert image.getchannel("A").getbbox(), f"empty sprite: {path}"
    assert record["alphaThreshold"] == 192
body_frames = [record for record in data["runtimeFrames"] if Path(record["file"]).stem.endswith(("-left", "-right"))]
scales = {round(record["scale"], 6) for record in body_frames}
assert len(scales) == 1, f"body frame scale drift: {scales}"
for record in body_frames:
    if Path(record["file"]).stem.endswith("-left"):
        base_name = Path(record["file"]).name.replace("-left.png", "-right.png")
        right = next((r for r in body_frames if Path(r["file"]).name == base_name), None)
        assert right, f"missing matching right-facing pose for {record['file']}"
        left_image = Image.open(ROOT / record["file"]).convert("RGBA")
        right_image = Image.open(ROOT / right["file"]).convert("RGBA").transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        assert ImageChops.difference(left_image, right_image).getbbox() is None, f"mirror policy mismatch: {record['file']}"
standing = Image.open(ROOT / "public/assets/characters/iona/b05/idle-ready-right.png").convert("RGBA")
box = standing.getchannel("A").getbbox()
height = box[3] - box[1]
assert 58 <= height <= 60, f"standing scale outside review range: {height}px"
for evidence in data["evidence"]:
    assert (ROOT / evidence).is_file(), f"missing contact sheet: {evidence}"
print(json.dumps({"result": "PASS", "runtimeFrames": len(records), "fixedScale": list(scales), "standingVisibleHeightPx": height, "sourceSheets": len(data["sourceSheets"]), "ownerApproval": "pending"}, indent=2))

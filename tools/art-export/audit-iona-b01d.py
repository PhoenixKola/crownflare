#!/usr/bin/env python3
"""Verify the versioned B01D source/runtime/hash chain and pixel invariants."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / "art-source/manifests/iona-b01d-candidate-v1.json"
PROVENANCE = ROOT / "art-source/characters/iona/b01d/generation-provenance.json"


def file_hash(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def require(condition: bool, message: str) -> None:
    if not condition:
        raise RuntimeError(message)


def main() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    provenance = json.loads(PROVENANCE.read_text(encoding="utf-8"))
    frames = manifest["runtimeFrames"]
    require(manifest["candidateId"] == "IONA_B01D_BASE_V1", "Unexpected candidate ID")
    require(manifest["ownerApproval"] == "PENDING_OWNER_REVIEW", "Owner gate must remain pending")
    require(manifest["readyToPromote"] is False, "Candidate may not be promoted")
    require(manifest["physicsBody"] == {"width": 15, "height": 30, "authority": "unchanged B00 Arcade body"}, "Physics body metadata changed")
    metrics = manifest["frameMetricsModule"]
    metrics_path = ROOT / metrics["path"]
    require(metrics_path.is_file() and file_hash(metrics_path) == metrics["sha256"], "Generated per-frame metrics module is missing or stale")
    require(len(frames) == manifest["runtimeFrameCount"] == 68, "Unexpected candidate runtime count")
    require(len({(item["id"], item["facing"]) for item in frames}) == 68, "Duplicate or missing frame identity")
    require(all("/overnight/" not in item["source"] for item in frames), "Rejected overnight source art may not enter B01D")

    runtime_dir = ROOT / "public/assets/characters/iona/b01d"
    runtime_files = list(runtime_dir.glob("*.png"))
    require(len(runtime_files) == 68, f"Expected 68 candidate runtime PNGs, found {len(runtime_files)}")
    run_hashes: dict[str, set[str]] = {"left": set(), "right": set()}
    colors: set[tuple[int, int, int]] = set()
    for item in frames:
        source = ROOT / item["source"]
        runtime = ROOT / item["runtimePng"]
        require(source.is_file() and runtime.is_file(), f"Missing source/runtime for {item['id']} {item['facing']}")
        require(file_hash(source) == item["sourceSha256"], f"Source hash mismatch: {source}")
        require(file_hash(runtime) == item["runtimeSha256"], f"Runtime hash mismatch: {runtime}")
        with Image.open(runtime) as image:
            rgba = image.convert("RGBA")
            require(rgba.size == (128, 80), f"Wrong canvas size: {runtime} {rgba.size}")
            alpha = rgba.getchannel("A")
            require(set(alpha.tobytes()).issubset({0, 255}), f"Soft/partial alpha remains: {runtime}")
            bounds = list(alpha.getbbox() or (0, 0, 0, 0))
            require(bounds == item["runtimeVisibleBounds"], f"Visible bounds mismatch: {runtime}")
            require(bounds[3] == 80, f"Feet baseline drift: {runtime} {bounds}")
            require(item["anchor"] == {"x": 64, "feetY": 80}, f"Anchor drift: {runtime}")
            raw = rgba.tobytes()
            colors.update((raw[index], raw[index + 1], raw[index + 2]) for index in range(0, len(raw), 4) if raw[index + 3])
        if item["candidateStatus"] == "NEW_IMAGEGEN_POSE":
            crop = ROOT / item["croppedSourcePath"]
            require(crop.is_file() and file_hash(crop) == item["croppedSourceSha256"], f"Crop hash mismatch: {crop}")
            require(item["runtimeVisibleHeightPx"] == 67, f"Run height is not normalized: {runtime}")
            require(item["durationMs"] == 105, f"Run frame timing drift: {item['id']}")
            run_hashes[item["facing"]].add(item["croppedSourceSha256"])
        else:
            original = ROOT / f"public/assets/characters/iona/b01c/{item['id']}-{item['facing']}.png"
            require(runtime.read_bytes() == original.read_bytes(), f"Non-run candidate frame differs from B01C: {item['id']} {item['facing']}")

    require(len(run_hashes["left"]) == 4 and len(run_hashes["right"]) == 4, "Run source poses are not four distinct images per facing")
    require(len(colors) <= 32, f"Shared palette exceeded 32 colors: {len(colors)}")

    for output in provenance["outputs"]:
        path = ROOT / output["file"]
        require(path.is_file() and file_hash(path) == output["sha256"], f"Native ImageGen source mismatch: {path}")
        require(path.stat().st_size == output["bytes"], f"Native source size mismatch: {path}")

    print(f"PASS: {len(frames)} B01D runtime frames / 8 distinct new generated poses / binary alpha / canvas 128x80 / <=32 colors / frame-metrics hash / anchors (64,80) / unchanged 15x30 body / all hashes match / promotion disabled")


if __name__ == "__main__":
    main()

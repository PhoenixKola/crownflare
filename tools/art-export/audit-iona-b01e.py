#!/usr/bin/env python3
"""Integrity and scope gate for the provisional B01E side-kick candidate."""
from __future__ import annotations

import hashlib
import json
import wave
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / "art-source/manifests/iona-b01e-candidate-v1.json"
B01D = ROOT / "art-source/manifests/iona-b01d-candidate-v1.json"
PROMOTION = ROOT / "src/game/animation/ionaPromotion.ts"
AUDIO_PROVENANCE = ROOT / "art-source/characters/iona/b01e/audio-provenance.json"
IMAGE_PROVENANCE = ROOT / "art-source/characters/iona/b01e/generation-provenance.json"


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit("FAIL: " + message)


def main() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    b01d = json.loads(B01D.read_text(encoding="utf-8"))
    require(manifest["ownerApproval"] == "PENDING_OWNER_REVIEW" and manifest["readyToPromote"] is False, "B01E owner gate must remain pending")
    require(manifest["physicsBody"] == {"width": 15, "height": 30, "authority": "unchanged B00 Arcade body"}, "B00 collision body was modified")
    rows = manifest["runtimeFrames"]
    require(len(rows) == 70 and manifest["runtimeFrameCount"] == 70, "B01E texture inventory must be exactly 70")
    statuses = {status: sum(row["candidateStatus"] == status for row in rows) for status in ("NEW_IMAGEGEN_POSE", "UNCHANGED_REUSED")}
    require(statuses == {"NEW_IMAGEGEN_POSE": 8, "UNCHANGED_REUSED": 62}, f"B01E status counts mismatch: {statuses}")
    expected_d = {(row["id"], row["facing"]): row for row in b01d["runtimeFrames"]}
    require(sum(row["candidateStatus"] == "NEW_IMAGEGEN_POSE" for row in b01d["runtimeFrames"]) == 8 and sum(row["candidateStatus"] == "UNCHANGED_REUSED" for row in b01d["runtimeFrames"]) == 60, "B01D historical baseline is not 8+60")
    metrics_path = ROOT / manifest["frameMetricsModule"]["path"]
    metrics = metrics_path.read_bytes()
    require(b"\r" not in metrics and digest(metrics_path) == manifest["frameMetricsModule"]["sha256"], "B01E frame metrics bytes/EOL hash mismatch")
    expected_new_ids = {"combo-2-windup", "combo-2-windup-1", "combo-2-contact", "combo-2-recovery"}
    changed_rows = [row for row in rows if row["candidateStatus"] == "NEW_IMAGEGEN_POSE"]
    audio_prov = json.loads(AUDIO_PROVENANCE.read_text(encoding="utf-8"))
    image_prov = json.loads(IMAGE_PROVENANCE.read_text(encoding="utf-8"))
    require(image_prov["tool"] == "OpenAI native image_gen.imagegen" and image_prov["ownerApproval"] == "PENDING_OWNER_REVIEW", "ImageGen source tool or owner status changed")
    require(image_prov["promptRecord"] == "art-source/characters/iona/b01e/generation-prompts.md", "ImageGen prompt provenance missing")
    for record in image_prov["referenceSources"] + image_prov["outputs"]:
        path = ROOT / record["path"]
        require(path.is_file() and digest(path) == record["sha256"], f"ImageGen provenance hash mismatch: {record['path']}")
    require({output["facing"] for output in image_prov["outputs"]} == {"left", "right"}, "Expected two independently authored facings")
    require(len({output["outputId"] for output in image_prov["outputs"]}) == 2, "ImageGen tool output IDs should identify two calls")
    palette = set(manifest["palette"])
    for row in rows:
        path = ROOT / row["runtimePng"]
        require(path.is_file() and digest(path) == row["runtimeSha256"], f"runtime PNG hash mismatch: {row['id']}/{row['facing']}")
        image = Image.open(path).convert("RGBA")
        require(image.size == (128, 80), f"wrong canvas: {row['id']}/{row['facing']}")
        alpha = set(image.getchannel("A").tobytes())
        require(alpha <= {0, 255}, f"non-binary alpha: {row['id']}/{row['facing']}")
        bounds = list(image.getchannel("A").getbbox() or (0, 0, 0, 0))
        require(bounds == row["runtimeVisibleBounds"], f"visible bounds mismatch: {row['id']}/{row['facing']}")
        require(row["anchor"] == {"x": 64, "feetY": 80} and bounds[3] == 80, f"unstable feet anchor: {row['id']}/{row['facing']}")
        rgba = image.tobytes()
        colors = {f"#{rgba[index]:02X}{rgba[index + 1]:02X}{rgba[index + 2]:02X}" for index in range(0, len(rgba), 4) if rgba[index + 3]}
        require(colors <= palette and len(colors) <= 32, f"candidate palette overflow: {row['id']}/{row['facing']}")
        if row["candidateStatus"] == "UNCHANGED_REUSED":
            baseline = expected_d[(row["id"], row["facing"])]
            require(row["runtimeSha256"] == baseline["runtimeSha256"], f"claimed B01D reuse differs: {row['id']}/{row['facing']}")
            require((ROOT / baseline["runtimePng"]).read_bytes() == path.read_bytes(), f"B01D reuse not byte-identical: {row['id']}/{row['facing']}")
        else:
            require(row["id"] in expected_new_ids and row["sourceTool"] == "OpenAI native image_gen.imagegen", f"unexpected new source: {row['id']}")
            source = ROOT / row["source"]
            crop = ROOT / row["croppedSourcePath"]
            require(digest(source) == row["sourceSha256"], f"original ImageGen source hash mismatch: {row['id']}/{row['facing']}")
            require(digest(crop) == row["croppedSourceSha256"], f"cropped pose source hash mismatch: {row['id']}/{row['facing']}")
            require(row["runtimeVisibleHeightPx"] in (60, 61), f"unexpected visible size: {row['id']}/{row['facing']}")
            if row["id"] == "combo-2-contact":
                require(row["contactAnchor"]["contactEventMs"] == 138 and row["durationMs"] == 90, "kick contact timing changed")
    for facing in ("left", "right"):
        poses = [row for row in changed_rows if row["facing"] == facing]
        require({row["id"] for row in poses} == expected_new_ids, f"four authored poses missing for {facing}")
        require(len({row["croppedSourceSha256"] for row in poses}) == 4, f"poses are duplicated for {facing}")
        require(len({row["runtimeScale"] for row in poses}) == 1, f"per-frame scaling detected for {facing}")
    clip = manifest["sidekickClip"]
    require([f["durationMs"] for f in clip["frames"]] == [55, 55, 90, 170] and sum(f["durationMs"] for f in clip["frames"]) == 370 and clip["authoritativeContactMs"] == 138, "side-kick animation must preserve the 370ms action / 138ms contact clock")
    require("readyToPromote: false" in PROMOTION.read_text(encoding="utf-8") and "PENDING_OWNER_REVIEW" in PROMOTION.read_text(encoding="utf-8"), "ordinary-game promotion gate changed")

    require(digest(ROOT / audio_prov["sourceScript"]["path"]) == audio_prov["sourceScript"]["sha256"], "audio authoring source hash mismatch")
    require(len(audio_prov["assets"]) == 13 and not audio_prov["externalSamples"], "audio cues missing or external samples introduced")
    for cue in audio_prov["assets"]:
        path = ROOT / cue["path"]
        require(path.is_file() and digest(path) == cue["sha256"], f"audio hash mismatch: {cue['key']}")
        with wave.open(str(path), "rb") as wav:
            require(wav.getframerate() == 24000 and wav.getnchannels() == 1 and wav.getsampwidth() == 2, f"audio PCM format mismatch: {cue['key']}")
            samples = wav.readframes(wav.getnframes())
            require(wav.getnframes() > 1200 and any(samples), f"empty or too-short audio: {cue['key']}")

    print("PASS: B01E 70 textures / 8 ImageGen poses / 62 byte-identical B01D frames / planted 128x80 frames / one scale per facing / 370ms kick action at 138ms / 13 hashed original WAV cues / no promotion")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Build an isolated, unnormalized B10 owner audition reel from shipped WAV cues."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import struct
import wave
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
TARGET_RATE = 44_100
GAP_SECONDS = 0.45

CUES = [
    ("Spindle Refuge ambience", "public/assets/audio/b10/spindle-refuge-ambience.wav"),
    ("Iona Base light", "public/assets/audio/b05/light.wav"),
    ("Dawnrush transform ignition", "public/assets/audio/b05/transform-ignition.wav"),
    ("Dawnrush Solar Drive", "public/assets/audio/b05/solar-drive.wav"),
    ("Shardrunner tell", "public/assets/audio/b06/runner-tell.wav"),
    ("Shardrunner strike", "public/assets/audio/b06/runner-slash.wav"),
    ("Orbit Wisp shot", "public/assets/audio/b06/wisp-shot.wav"),
    ("Bastion guard break", "public/assets/audio/b06/bastion-break.wav"),
    ("Cantor sweep", "public/assets/audio/b06/cantor-sweep.wav"),
    ("Sundial Custodian tell", "public/assets/audio/bosses/b08/sundial-custodian/tell.wav"),
    ("Sundial Custodian phase", "public/assets/audio/bosses/b08/sundial-custodian/phase.wav"),
    ("Spoolheart Regent tell", "public/assets/audio/bosses/b08/spoolheart-regent/tell.wav"),
    ("Spoolheart Regent phase", "public/assets/audio/bosses/b08/spoolheart-regent/phase.wav"),
    ("Broken Meridian tell", "public/assets/audio/bosses/b08/broken-meridian/tell.wav"),
    ("Broken Meridian phase", "public/assets/audio/bosses/b08/broken-meridian/phase.wav"),
]


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def read_mono_pcm16(path: Path) -> tuple[list[int], int]:
    with wave.open(str(path), "rb") as source:
        channels = source.getnchannels()
        width = source.getsampwidth()
        rate = source.getframerate()
        frames = source.getnframes()
        if channels != 1 or width != 2 or source.getcomptype() != "NONE":
            raise ValueError(f"Expected mono PCM16 WAV: {path}")
        samples = list(struct.unpack(f"<{frames}h", source.readframes(frames)))
    return samples, rate


def resample(samples: list[int], from_rate: int) -> list[int]:
    if from_rate == TARGET_RATE:
        return samples
    count = round(len(samples) * TARGET_RATE / from_rate)
    converted: list[int] = []
    for index in range(count):
        position = index * from_rate / TARGET_RATE
        left = min(int(position), len(samples) - 1)
        right = min(left + 1, len(samples) - 1)
        fraction = position - left
        value = round(samples[left] * (1 - fraction) + samples[right] * fraction)
        converted.append(max(-32768, min(32767, value)))
    return converted


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=ROOT / "review-evidence" / "b10",
        help="Ignored local output directory (default: review-evidence/b10)",
    )
    args = parser.parse_args()
    out_dir = args.output_dir if args.output_dir.is_absolute() else ROOT / args.output_dir
    out_dir.mkdir(parents=True, exist_ok=True)

    timeline: list[int] = []
    segments: list[dict[str, object]] = []
    silence = [0] * round(TARGET_RATE * GAP_SECONDS)
    cursor = 0
    for index, (label, relative) in enumerate(CUES):
        source = ROOT / relative
        if not source.is_file():
            raise FileNotFoundError(source)
        samples, sample_rate = read_mono_pcm16(source)
        normalized_rate_samples = resample(samples, sample_rate)
        start = cursor / TARGET_RATE
        timeline.extend(normalized_rate_samples)
        cursor += len(normalized_rate_samples)
        end = cursor / TARGET_RATE
        segments.append(
            {
                "label": label,
                "source": relative.replace("\\", "/"),
                "sourceSha256": sha256(source),
                "sourceSampleRate": sample_rate,
                "startSeconds": round(start, 3),
                "endSeconds": round(end, 3),
            }
        )
        if index < len(CUES) - 1:
            timeline.extend(silence)
            cursor += len(silence)

    pcm = struct.pack(f"<{len(timeline)}h", *timeline)
    wav_path = out_dir / "b10-audio-cue-reel.wav"
    with wave.open(str(wav_path), "wb") as target:
        target.setnchannels(1)
        target.setsampwidth(2)
        target.setframerate(TARGET_RATE)
        target.writeframes(pcm)

    manifest = {
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "status": "AUDIO NOT HEARD / CAPTURE BLOCKED",
        "note": "Isolated source cues with 450 ms gaps; no normalization, layering, or listening claim.",
        "output": wav_path.name,
        "outputSha256": sha256(wav_path),
        "sampleRate": TARGET_RATE,
        "channels": 1,
        "sampleFormat": "PCM16",
        "durationSeconds": round(len(timeline) / TARGET_RATE, 3),
        "segments": segments,
    }
    manifest_path = out_dir / "b10-audio-cue-reel.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"wav": str(wav_path), "manifest": str(manifest_path), **manifest}, indent=2))


if __name__ == "__main__":
    main()

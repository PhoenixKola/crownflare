#!/usr/bin/env python3
"""Synthesize original, deterministic B05 combat cues with Python's standard library."""
from __future__ import annotations
import hashlib
import json
import math
import random
import struct
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "art-source/audio/b05"
OUTPUT = ROOT / "public/assets/audio/b05"
RATE = 24_000
SEED = 5105
SPECS = {
    "transform-charge": (0.62, "rising three-part sine + glass partials"),
    "transform-ignition": (0.48, "short pressure burst + harmonic ring"),
    "dash": (0.22, "filtered noise sweep + low sine glide"),
    "light": (0.16, "bright short sine stack"),
    "heavy": (0.34, "low triangle drop + restrained noise transient"),
    "aerial": (0.24, "falling sine + airy noise"),
    "solar-drive": (0.72, "ascending sub pulse + layered bright partials"),
    "impact": (0.18, "soft low thump + short metallic partials"),
    "transform-revert": (0.46, "descending solar harmonics + soft clothy release"),
    "dawnrush-hurt": (0.22, "muted amber crack + short low pulse"),
    "finisher": (0.84, "compressed opposing sub pulses + bright ring-clap tail"),
}


def sample(cue: str, t: float, duration: float, rng: random.Random) -> float:
    u = t / duration
    noise = rng.uniform(-1, 1)
    if cue == "transform-charge":
        env = min(1, t / .06) * max(0, 1 - u) ** .7
        f = 196 + 680 * (u ** 1.4)
        return env * (.38 * math.sin(2 * math.pi * f * t) + .16 * math.sin(2 * math.pi * f * 2.01 * t))
    if cue == "transform-ignition":
        env = max(0, 1 - u) ** 2.6
        return env * (.46 * math.sin(2 * math.pi * (92 + 470 * math.exp(-t * 8)) * t) + .18 * math.sin(2 * math.pi * 880 * t) + .08 * noise * math.exp(-t * 28))
    if cue == "dash":
        env = max(0, 1 - u) ** 1.3
        return env * (.25 * noise + .28 * math.sin(2 * math.pi * (190 + 430 * u) * t))
    if cue == "light":
        env = min(1, t / .008) * max(0, 1 - u) ** 2
        return env * (.32 * math.sin(2 * math.pi * (480 - 170 * u) * t) + .09 * math.sin(2 * math.pi * 970 * t))
    if cue == "heavy":
        env = max(0, 1 - u) ** 2.4
        return env * (.5 * math.sin(2 * math.pi * (68 + 38 * math.exp(-t * 14)) * t) + .13 * noise * math.exp(-t * 24))
    if cue == "aerial":
        env = max(0, 1 - u) ** 1.6
        return env * (.28 * math.sin(2 * math.pi * (430 - 190 * u) * t) + .12 * noise * math.exp(-t * 7))
    if cue == "solar-drive":
        env = min(1, t / .045) * max(0, 1 - u) ** .58
        f = 115 + 320 * min(1, u * 1.7)
        pulse = .75 + .25 * math.sin(2 * math.pi * (3.5 + u * 7) * t)
        return env * pulse * (.36 * math.sin(2 * math.pi * f * t) + .19 * math.sin(2 * math.pi * f * 2.02 * t) + .08 * math.sin(2 * math.pi * 1260 * t))
    if cue == "transform-revert":
        env = min(1, t / .025) * max(0, 1 - u) ** 1.45
        f = 680 - 430 * u
        return env * (.27 * math.sin(2 * math.pi * f * t) + .12 * math.sin(2 * math.pi * (f * 1.5) * t) + .08 * noise * math.exp(-t * 10))
    if cue == "dawnrush-hurt":
        env = max(0, 1 - u) ** 2.5
        return env * (.26 * noise * math.exp(-t * 30) + .31 * math.sin(2 * math.pi * (112 + 48 * u) * t) + .08 * math.sin(2 * math.pi * 540 * t))
    if cue == "finisher":
        env = min(1, t / .012) * max(0, 1 - u) ** 1.1
        f = 74 + 32 * math.sin(math.pi * min(1, u * 1.7))
        ring = math.exp(-max(0, t - .28) * 8)
        return env * (.34 * math.sin(2 * math.pi * f * t) + .18 * math.sin(2 * math.pi * f * 2.03 * t) + .17 * ring * math.sin(2 * math.pi * (1260 - 270 * u) * t) + .07 * noise * math.exp(-t * 24))
    env = max(0, 1 - u) ** 2.8
    return env * (.45 * math.sin(2 * math.pi * (78 - 22 * u) * t) + .11 * math.sin(2 * math.pi * 690 * t) + .08 * noise * math.exp(-t * 22))


def main() -> None:
    SOURCE.mkdir(parents=True, exist_ok=True)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    records = []
    for index, (cue, (duration, design)) in enumerate(SPECS.items()):
        rng = random.Random(SEED + index)
        count = round(duration * RATE)
        values = [sample(cue, n / RATE, duration, rng) for n in range(count)]
        peak = max(abs(v) for v in values) or 1
        gain = min(.84 / peak, 1.0)
        frames = b"".join(struct.pack("<h", round(max(-1, min(1, v * gain)) * 32767)) for v in values)
        path = OUTPUT / f"{cue}.wav"
        with wave.open(str(path), "wb") as audio:
            audio.setnchannels(1); audio.setsampwidth(2); audio.setframerate(RATE); audio.writeframes(frames)
        raw = path.read_bytes()
        records.append({"cue": cue, "file": path.relative_to(ROOT).as_posix(), "sha256": hashlib.sha256(raw).hexdigest(),
                        "durationMs": round(duration * 1000), "sampleRate": RATE, "channels": 1, "bitDepth": 16,
                        "design": design, "seed": SEED + index, "peak": round(max(abs(v) for v in values) * gain, 5)})
    manifest = {"schemaVersion": 1, "candidateId": "IONA_B05_DAWNRUSH_AUDIO_V1", "source": "original deterministic procedural synthesis; no external samples", "status": "technical-audit-only / human-listening-review-pending", "cues": records}
    (SOURCE / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"generatedCues": len(records), "directory": OUTPUT.relative_to(ROOT).as_posix(), "sha256": {r["cue"]: r["sha256"] for r in records}}, indent=2))


if __name__ == "__main__":
    main()

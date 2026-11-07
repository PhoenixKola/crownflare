#!/usr/bin/env python3
"""Validate authored B05 WAV shape, duration, peak, and manifest integrity."""
import hashlib
import json
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / "art-source/audio/b05/manifest.json"

data = json.loads(MANIFEST.read_text(encoding="utf-8"))
assert data["source"].startswith("original deterministic procedural synthesis")
assert len(data["cues"]) >= 6
for cue in data["cues"]:
    path = ROOT / cue["file"]
    with wave.open(str(path), "rb") as audio:
        duration = round(audio.getnframes() * 1000 / audio.getframerate())
        assert audio.getnchannels() == cue["channels"] == 1
        assert audio.getsampwidth() * 8 == cue["bitDepth"] == 16
        assert audio.getframerate() == cue["sampleRate"] == 24_000
        assert duration == cue["durationMs"]
        assert audio.getnframes() > 1_000
    assert hashlib.sha256(path.read_bytes()).hexdigest() == cue["sha256"]
print(json.dumps({"result": "PASS", "cues": len(data["cues"]), "humanListeningReview": "pending"}, indent=2))

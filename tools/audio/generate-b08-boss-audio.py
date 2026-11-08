from __future__ import annotations

import hashlib
import json
import math
import struct
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "public" / "assets" / "audio" / "bosses" / "b08"
RATE = 44100
SETS = {
    "sundial-custodian": (110.0, [220.0, 277.2, 329.6, 277.2]),
    "spoolheart-regent": (82.4, [164.8, 196.0, 246.9, 196.0]),
    "broken-meridian": (65.4, [130.8, 164.8, 196.0, 261.6]),
}


def write_wav(path: Path, samples: list[float]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as out:
        out.setparams((1, 2, RATE, len(samples), "NONE", "not compressed"))
        out.writeframes(b"".join(struct.pack("<h", int(max(-1.0, min(1.0, sample)) * 32767)) for sample in samples))


def envelope(t: float, duration: float, attack: float = .02, release: float = .25) -> float:
    return max(0.0, min(1.0, t / attack if t < attack else (duration - t) / release if t > duration - release else 1.0))


def make_loop(bass: float, motif: list[float]) -> list[float]:
    duration = 8.0
    count = int(RATE * duration)
    out = []
    for i in range(count):
        t = i / RATE
        pulse = .35 + .65 * (0.5 + 0.5 * math.sin(2 * math.pi * .25 * t))
        sample = .11 * math.sin(2 * math.pi * bass * t) + .045 * math.sin(2 * math.pi * bass * 1.5 * t)
        slot = int(t / 1.0) % len(motif)
        local = t % 1.0
        e = envelope(local, .8, .05, .3)
        sample += .075 * e * (math.sin(2 * math.pi * motif[slot] * t) + .22 * math.sin(2 * math.pi * motif[slot] * 2 * t))
        # A restrained clock-like pluck gives each loop a readable pulse.
        beat = t % 2.0
        sample += .025 * math.exp(-beat * 11) * math.sin(2 * math.pi * (bass * 4) * t)
        out.append(sample * pulse)
    return out


def cue(kind: str, bass: float, motif: list[float]) -> list[float]:
    durations = {"tell": .65, "strike": .42, "phase": 1.35, "ko": 1.6}
    duration = durations[kind]
    count = int(RATE * duration)
    out = []
    for i in range(count):
        t = i / RATE
        phase = t / duration
        if kind == "tell":
            freq = bass * (2.0 + 1.4 * phase)
            sample = .22 * math.sin(2 * math.pi * freq * t) + .07 * math.sin(2 * math.pi * (freq * 2.01) * t)
        elif kind == "strike":
            decay = math.exp(-t * 13)
            sample = .36 * decay * math.sin(2 * math.pi * bass * .75 * t) + .12 * decay * math.sin(2 * math.pi * bass * 3.2 * t)
            sample += .06 * math.sin(2 * math.pi * 37 * t) * decay
        elif kind == "phase":
            slot = min(len(motif) - 1, int(phase * len(motif)))
            freq = motif[slot] * (1.0 + .12 * phase)
            sample = .2 * math.sin(2 * math.pi * freq * t) + .06 * math.sin(2 * math.pi * freq * 1.5 * t)
        else:
            freq = bass * (3.0 - 2.2 * phase)
            sample = .23 * math.sin(2 * math.pi * freq * t) + .05 * math.sin(2 * math.pi * freq * .5 * t)
        out.append(sample * envelope(t, duration, .01, .28))
    return out


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    manifest = {"milestone": "B08", "audioHeardByAgent": "NO", "cues": {}}
    for boss, (bass, motif) in SETS.items():
        paths = {"loop": OUTPUT / boss / "loop.wav"}
        paths["loop"].parent.mkdir(parents=True, exist_ok=True)
        write_wav(paths["loop"], make_loop(bass, motif))
        for kind in ("tell", "strike", "phase", "ko"):
            paths[kind] = OUTPUT / boss / f"{kind}.wav"
            write_wav(paths[kind], cue(kind, bass, motif))
        manifest["cues"][boss] = {name: {"path": str(path.relative_to(ROOT)).replace("\\", "/"), "bytes": path.stat().st_size, "sha256": sha(path), "sampleRate": RATE, "channels": 1, "format": "PCM16"} for name, path in paths.items()}
    out = OUTPUT / "audio-manifest.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"B08 generated 15 original cues (3 loops, 12 event cues); audio not listened to")


if __name__ == "__main__":
    main()

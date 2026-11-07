#!/usr/bin/env python3
"""Author compact, deterministic, noise-and-foley layered Iona B01E PCM cues."""
from __future__ import annotations

import hashlib
import json
import math
import random
import struct
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public/assets/characters/iona/b01e/audio"
PROVENANCE = ROOT / "art-source/characters/iona/b01e/audio-provenance.json"
RATE = 24000


def noise_layer(duration: float, seed: int, cutoff_start: float, cutoff_end: float, highpass: bool, attack: float, fall: float, level: float) -> list[float]:
    count = round(RATE * duration)
    rng = random.Random(seed)
    state = 0.0
    result: list[float] = []
    for i in range(count):
        t = i / RATE
        progress = i / max(1, count - 1)
        cutoff = cutoff_start + (cutoff_end - cutoff_start) * progress
        alpha = 1.0 - math.exp(-2 * math.pi * min(cutoff, RATE * .44) / RATE)
        raw = rng.uniform(-1.0, 1.0)
        state += alpha * (raw - state)
        sample = raw - state if highpass else state
        env_in = min(1.0, t / max(.001, attack))
        env_out = math.exp(-fall * max(0.0, t - attack))
        result.append(sample * env_in * env_out * level)
    return result


def resonant_body(duration: float, seed: int, frequency: float, level: float, fall: float) -> list[float]:
    count = round(RATE * duration)
    rng = random.Random(seed)
    phase = 0.0
    output: list[float] = []
    for i in range(count):
        t = i / RATE
        frequency_now = frequency * (1.0 - .12 * min(1.0, t / max(.01, duration)))
        phase += 2 * math.pi * frequency_now / RATE
        grain = .75 + .25 * rng.random()
        output.append(math.sin(phase) * math.exp(-fall * t) * grain * level)
    return output


def author(duration: float, layers: list[tuple[float, int, float, float, bool, float, float, float]], body: tuple[int, float, float, float] | None = None) -> bytes:
    mixed = [0.0] * round(RATE * duration)
    for level, seed, start, end, highpass, attack, fall, _unused in layers:
        # Level is repeated as the first field for readability in design notes.
        layer = noise_layer(duration, seed, start, end, highpass, attack, fall, level)
        for i, sample in enumerate(layer):
            mixed[i] += sample
    if body:
        seed, frequency, level, fall = body
        for i, sample in enumerate(resonant_body(duration, seed, frequency, level, fall)):
            mixed[i] += sample
    peak = max((abs(value) for value in mixed), default=0.0)
    gain = .76 / peak if peak > .00001 else 1.0
    samples = [max(-1.0, min(1.0, value * gain)) for value in mixed]
    return struct.pack("<" + "h" * len(samples), *(round(value * 32767) for value in samples))


def write_wav(name: str, duration: float, layers: list[tuple[float, int, float, float, bool, float, float, float]], body: tuple[int, float, float, float] | None, description: str) -> dict[str, object]:
    raw = author(duration, layers, body)
    path = OUT / f"{name}.wav"
    with wave.open(str(path), "wb") as stream:
        stream.setnchannels(1)
        stream.setsampwidth(2)
        stream.setframerate(RATE)
        stream.writeframes(raw)
    data = path.read_bytes()
    return {"key": name, "path": path.relative_to(ROOT).as_posix(), "sha256": hashlib.sha256(data).hexdigest(), "bytes": len(data), "durationMs": round(duration * 1000), "sampleRateHz": RATE, "channels": 1, "description": description}


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    designs = [
        ("step-a", .105, [(0.62, 11, 330, 1800, True, .001, 58, 0), (.54, 12, 760, 240, False, .001, 42, 0), (.25, 13, 3600, 1900, True, .001, 70, 0)], (14, 105, .14, 55), "Alternating boot plant: dry leather scrape, softened floor contact and low body.") ,
        ("step-b", .115, [(0.57, 21, 460, 2250, True, .001, 52, 0), (.60, 22, 820, 280, False, .001, 39, 0), (.22, 23, 4200, 2100, True, .001, 70, 0)], (24, 92, .13, 52), "Alternating second boot plant with a slightly brighter toe scuff.") ,
        ("jump", .22, [(.47, 31, 320, 3200, True, .004, 13, 0), (.35, 32, 1100, 470, False, .012, 20, 0), (.18, 33, 4800, 2500, True, .001, 34, 0)], (34, 145, .08, 16), "Air and jacket pull rising into a short impulse; no pitched game beep.") ,
        ("land", .27, [(.74, 41, 250, 1700, True, .001, 24, 0), (.49, 42, 580, 170, False, .001, 18, 0), (.22, 43, 2600, 1100, True, .001, 34, 0)], (44, 72, .22, 18), "Boots and body settle into a muted floor thump with a short gritty tail.") ,
        ("dash-start", .24, [(.48, 51, 280, 5200, True, .003, 12, 0), (.31, 52, 2100, 420, False, .012, 19, 0), (.30, 53, 180, 980, False, .001, 20, 0)], (54, 92, .15, 20), "Compressed cloth snap, low thrust and a fast outward air sweep.") ,
        ("dash-brake", .20, [(.47, 61, 4500, 280, True, .001, 22, 0), (.42, 62, 170, 1900, False, .001, 26, 0), (.18, 63, 1200, 700, True, .008, 34, 0)], (64, 68, .16, 23), "Air folds down into a controlled boot skid and short body settle.") ,
        ("palm-whoosh", .17, [(.52, 71, 5200, 1200, True, .003, 21, 0), (.22, 72, 1100, 450, False, .006, 26, 0), (.23, 73, 3400, 800, True, .012, 28, 0)], None, "Tight sleeve and palm air pass, high and brief.") ,
        ("palm-hit", .15, [(.60, 81, 700, 3600, True, .001, 35, 0), (.48, 82, 260, 145, False, .001, 30, 0), (.28, 83, 2200, 950, True, .001, 42, 0)], (84, 118, .19, 39), "Soft palm-on-padding crack with a compact body resonance.") ,
        ("kick-whoosh", .22, [(.57, 91, 4300, 620, True, .002, 17, 0), (.30, 92, 820, 260, False, .004, 21, 0), (.33, 93, 5100, 1450, True, .016, 25, 0)], None, "Longer lower leg sweep with cloth flutter at extension.") ,
        ("kick-hit", .19, [(.56, 101, 470, 2900, True, .001, 27, 0), (.52, 102, 195, 110, False, .001, 23, 0), (.32, 103, 1500, 650, True, .001, 36, 0)], (104, 78, .25, 29), "Weighted padded side-kick contact, layered thud and clipped fabric snap.") ,
        ("forearm-whoosh", .18, [(.48, 111, 4800, 730, True, .002, 21, 0), (.37, 112, 520, 220, False, .004, 25, 0), (.27, 113, 3800, 1100, True, .012, 25, 0)], None, "Compact rising forearm sweep with a warmer sleeve layer.") ,
        ("forearm-hit", .17, [(.66, 121, 800, 4100, True, .001, 31, 0), (.49, 122, 230, 120, False, .001, 27, 0), (.36, 123, 2600, 1200, True, .001, 41, 0)], (124, 92, .23, 35), "Firm forearm impact with bright transient and short padded body.") ,
        ("miss", .16, [(.48, 131, 5500, 1900, True, .002, 19, 0), (.27, 132, 780, 350, False, .006, 31, 0), (.16, 133, 3600, 600, True, .008, 44, 0)], None, "Unconfirmed air pass with a falling cloth tail; deliberately no impact body.") ,
    ]
    assets = [write_wav(name, duration, layers, body, description) for name, duration, layers, body, description in designs]
    source = Path(__file__).read_bytes()
    record = {
        "schemaVersion": 1,
        "authoringMethod": "Deterministic original filtered-noise, transient, and short resonator synthesis in Python standard library; 24kHz mono PCM WAV.",
        "externalSamples": [], "externalLibraries": [], "license": "Original Crownflare project assets; no third-party samples or sample libraries.",
        "sourceScript": {"path": "tools/audio/generate-iona-b01e-sfx.py", "sha256": hashlib.sha256(source).hexdigest()},
        "assets": assets,
    }
    PROVENANCE.parent.mkdir(parents=True, exist_ok=True)
    PROVENANCE.write_bytes((json.dumps(record, indent=2) + "\n").encode("utf-8"))
    print(f"PASS: authored {len(assets)} original WAV cues ({sum(asset['bytes'] for asset in assets)} bytes), no external samples")


if __name__ == "__main__":
    main()

from __future__ import annotations

import hashlib
import json
import math
import random
import struct
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "public" / "assets" / "audio" / "b06"
MANIFEST = ROOT / "art-source" / "enemies" / "b06" / "audio-manifest.json"
RATE = 44100

# cue: seconds, fundamentals, texture, pitch motion, noise amount
CUES = {
    "runner-step": (0.115, [165, 420], "metal", -0.24, 0.18),
    "runner-tell": (0.42, [392, 587], "bell", 0.18, 0.06),
    "runner-slash": (0.31, [820, 1640], "air", -0.34, 0.42),
    "wisp-hover": (0.82, [220, 330, 440], "soft", 0.025, 0.035),
    "wisp-charge": (0.7, [293, 440, 659], "bell", 0.32, 0.05),
    "wisp-shot": (0.46, [880, 587], "air", -0.2, 0.22),
    "wisp-impact": (0.28, [523, 784, 1047], "glass", -0.12, 0.16),
    "bastion-step": (0.24, [68, 102, 205], "thud", -0.1, 0.32),
    "bastion-tell": (0.88, [55, 82, 164], "pressure", 0.06, 0.12),
    "bastion-impact": (0.36, [58, 116, 232], "thud", -0.24, 0.44),
    "bastion-block": (0.18, [310, 466, 622], "metal", -0.08, 0.28),
    "bastion-break": (0.43, [110, 220, 440], "crack", -0.22, 0.5),
    "cantor-intro": (1.65, [196, 293.66, 392, 587.33], "choir", 0.025, 0.025),
    "cantor-sweep": (0.56, [392, 587, 784], "air", -0.18, 0.24),
    "cantor-pulse": (0.72, [261.63, 392, 523.25, 783.99], "bell", -0.12, 0.09),
    "enemy-ko": (0.72, [220, 164.81, 110], "glass", -0.32, 0.2),
    "wave-clear": (0.9, [392, 523.25, 783.99], "bell", 0.06, 0.025),
    "shard-reward": (0.78, [587.33, 783.99, 1174.66], "glass", 0.045, 0.02),
}


def envelope(t: float, duration: float, attack: float, release: float) -> float:
    a = min(1.0, t / max(0.001, attack))
    r = min(1.0, max(0.0, (duration - t) / max(0.001, release)))
    return (a * r) ** 0.78


def build(cue: str, spec: tuple[float, list[float], str, float, float]) -> dict[str, object]:
    duration, frequencies, texture, pitch_motion, noise_mix = spec
    frames = int(RATE * duration)
    rng = random.Random(sum(cue.encode("utf-8")))
    noise = [rng.uniform(-1.0, 1.0) for _ in range(frames)]
    samples: list[float] = []
    for index in range(frames):
        t = index / RATE
        p = t / duration
        env = envelope(t, duration, min(0.09, duration * 0.22), min(0.22, duration * 0.42))
        glide = 1 + pitch_motion * p
        tone = 0.0
        for harmonic, frequency in enumerate(frequencies):
            detune = 1 + (harmonic - len(frequencies) / 2) * 0.0013
            phase = 2 * math.pi * frequency * detune * glide * t
            if texture in {"metal", "glass", "bell"}:
                phase += 0.04 * math.sin(t * 2 * math.pi * (3 + harmonic))
            partial = math.sin(phase)
            if texture == "metal": partial += 0.27 * math.sin(phase * 2.73)
            if texture == "glass": partial += 0.2 * math.sin(phase * 3.98)
            if texture == "bell": partial += 0.16 * math.sin(phase * 2.01)
            if texture == "pressure": partial += 0.19 * math.sin(phase * 0.5)
            if texture == "choir": partial += 0.2 * math.sin(phase * 1.5)
            tone += partial / len(frequencies)
        transient = 0.0
        if texture in {"thud", "crack", "air", "pressure", "metal"}:
            transient = noise[index] * noise_mix * math.exp(-t * (24 if texture in {"thud", "crack"} else 10))
        else:
            transient = noise[index] * noise_mix * math.exp(-t * 18)
        # Small deterministic room reflection keeps the impacts from sounding flat.
        echo = samples[index - int(RATE * 0.037)] * 0.15 if index >= int(RATE * 0.037) and texture not in {"soft", "choir"} else 0.0
        value = (tone * (0.72 if texture not in {"thud", "crack"} else 0.42) + transient + echo) * env
        samples.append(max(-0.94, min(0.94, value)))

    OUTPUT.mkdir(parents=True, exist_ok=True)
    path = OUTPUT / f"{cue}.wav"
    with wave.open(str(path), "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(RATE)
        wav.writeframes(b"".join(struct.pack("<h", round(sample * 32767)) for sample in samples))
    return {"cue": cue, "path": path.relative_to(ROOT).as_posix(), "sha256": hashlib.sha256(path.read_bytes()).hexdigest(), "durationSeconds": duration, "sampleRate": RATE, "channels": 1, "source": "deterministic original procedural synthesis / no samples"}


def main() -> None:
    rows = [build(name, spec) for name, spec in CUES.items()]
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(json.dumps({"version": "B06-AUDIO-1", "heard": "NO", "cues": rows}, indent=2) + "\n", encoding="utf-8")
    print(f"Generated {len(rows)} original B06 WAV cues at {OUTPUT}")


if __name__ == "__main__":
    main()

from __future__ import annotations

import math
import random
import struct
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT_SOURCE = ROOT / 'art-source/audio/b04/sunderglass-ambience.wav'
OUT_RUNTIME = ROOT / 'public/assets/audio/b04/sunderglass-ambience.wav'
RATE = 44_100
SECONDS = 8
COUNT = RATE * SECONDS

def bell(t: float, start: float, frequency: float, decay: float) -> float:
    phase = t - start
    if phase < 0 or phase > decay * 5:
        return 0.0
    envelope = math.exp(-phase / decay)
    return envelope * (math.sin(2 * math.pi * frequency * phase) + 0.28 * math.sin(2 * math.pi * frequency * 2.01 * phase))

randomizer = random.Random(4107)
smooth_noise = 0.0
samples: list[float] = []
for index in range(COUNT):
    t = index / RATE
    smooth_noise += 0.006 * (randomizer.uniform(-1, 1) - smooth_noise)
    low_wind = 0.026 * math.sin(2 * math.pi * 55 * t) + 0.015 * math.sin(2 * math.pi * 82.5 * t + 0.4)
    air = 0.012 * smooth_noise
    shimmer = 0.0
    for start, frequency, decay in ((0.72, 392, .55), (2.65, 523.25, .48), (4.88, 659.25, .58), (6.42, 392, .62)):
        shimmer += 0.017 * bell(t, start, frequency, decay)
    edge = min(1.0, index / (RATE * .18), (COUNT - 1 - index) / (RATE * .18))
    samples.append(max(-0.12, min(0.12, (low_wind + air + shimmer) * edge)))

# A short end-to-head crossfade prevents a click when the loop repeats.
fade = int(RATE * .18)
for i in range(fade):
    t = i / max(1, fade - 1)
    tail = samples[COUNT - fade + i]
    head = samples[i]
    samples[COUNT - fade + i] = tail * (1 - t) + head * t

OUT_SOURCE.parent.mkdir(parents=True, exist_ok=True)
OUT_RUNTIME.parent.mkdir(parents=True, exist_ok=True)
with wave.open(str(OUT_SOURCE), 'wb') as audio:
    audio.setparams((1, 2, RATE, COUNT, 'NONE', 'not compressed'))
    audio.writeframes(b''.join(struct.pack('<h', int(value * 32767)) for value in samples))
OUT_RUNTIME.write_bytes(OUT_SOURCE.read_bytes())
print(f'Wrote original {SECONDS}s {RATE}Hz mono ambient loop: {OUT_SOURCE}')

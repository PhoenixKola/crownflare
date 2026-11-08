import math
import struct
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / 'public/assets/audio/b10/spindle-refuge-ambience.wav'
RATE = 22050
DURATION = 12
OUTPUT.parent.mkdir(parents=True, exist_ok=True)

with wave.open(str(OUTPUT), 'wb') as wav:
    wav.setnchannels(1)
    wav.setsampwidth(2)
    wav.setframerate(RATE)
    for index in range(RATE * DURATION):
        t = index / RATE
        swell = 0.5 - 0.5 * math.cos(2 * math.pi * t / DURATION)
        bed = 0.045 * math.sin(2 * math.pi * 55 * t) + 0.024 * math.sin(2 * math.pi * 82.41 * t + 0.35 * math.sin(t * 0.31))
        air = 0.012 * math.sin(2 * math.pi * 220 * t + 0.6 * math.sin(t * 0.19))
        bell_phase = (t % 6.0)
        bell_envelope = math.exp(-bell_phase * 1.8) if bell_phase < 1.8 else 0.0
        bell = 0.035 * bell_envelope * math.sin(2 * math.pi * 659.25 * bell_phase)
        sample = max(-1.0, min(1.0, (bed + air + bell) * (0.74 + 0.16 * swell)))
        wav.writeframesraw(struct.pack('<h', int(sample * 32767)))

print(f'Generated {OUTPUT.relative_to(ROOT).as_posix()} ({OUTPUT.stat().st_size} bytes, {DURATION}s mono PCM)')

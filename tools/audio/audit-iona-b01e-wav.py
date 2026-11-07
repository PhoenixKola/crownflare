#!/usr/bin/env python3
"""Check B01E WAV format, integrity, clipping headroom, silence and relative levels."""
import hashlib
import json
import math
import struct
import sys
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PROVENANCE = ROOT / "art-source/characters/iona/b01e/audio-provenance.json"
EXPECTED = {
    "step-a", "step-b", "jump", "land", "dash-start", "dash-brake",
    "palm-whoosh", "palm-hit", "kick-whoosh", "kick-hit",
    "forearm-whoosh", "forearm-hit", "miss",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> int:
    record = json.loads(PROVENANCE.read_text(encoding="utf-8"))
    failures = []
    if set(record.get("externalSamples", [])):
        failures.append("unexpected external audio samples are recorded")
    script = ROOT / record["sourceScript"]["path"]
    if sha256(script) != record["sourceScript"]["sha256"]:
        failures.append("audio synthesis source hash does not match provenance")
    assets = record.get("assets", [])
    names = [asset.get("key") for asset in assets]
    if set(names) != EXPECTED or len(names) != len(EXPECTED):
        failures.append(f"cue set mismatch: {names}")

    measurements = []
    for asset in assets:
        path = ROOT / asset["path"]
        if not path.is_file():
            failures.append(f"missing cue: {path}")
            continue
        if sha256(path) != asset["sha256"]:
            failures.append(f"SHA-256 mismatch: {path}")
        try:
            with wave.open(str(path), "rb") as wav:
                channels = wav.getnchannels()
                width = wav.getsampwidth()
                rate = wav.getframerate()
                frames = wav.getnframes()
                duration = frames / rate if rate else 0
                raw = wav.readframes(frames)
        except (wave.Error, EOFError) as error:
            failures.append(f"invalid WAV {path}: {error}")
            continue
        if channels != 1 or width != 2 or rate != 24000:
            failures.append(f"format mismatch {asset['key']}: {channels}ch/{width * 8}-bit/{rate}Hz")
        if frames == 0 or len(raw) != frames * channels * width:
            failures.append(f"empty or truncated PCM: {asset['key']}")
            continue
        samples = struct.unpack("<" + "h" * frames, raw)
        peak = max(abs(sample) for sample in samples)
        rms = math.sqrt(sum(sample * sample for sample in samples) / frames)
        nonzero_ratio = sum(sample != 0 for sample in samples) / frames
        peak_dbfs = 20 * math.log10(peak / 32768) if peak else -math.inf
        rms_dbfs = 20 * math.log10(rms / 32768) if rms else -math.inf
        if peak >= 32700:
            failures.append(f"clipping risk for {asset['key']}: peak={peak}")
        if nonzero_ratio < 0.55 or rms_dbfs < -32:
            failures.append(f"cue is silent or too quiet: {asset['key']} ({rms_dbfs:.1f} dBFS RMS)")
        if abs(duration * 1000 - asset["durationMs"]) > 1.1:
            failures.append(f"duration metadata mismatch: {asset['key']}")
        measurements.append({
            "key": asset["key"], "sampleRateHz": rate, "bitDepth": width * 8,
            "channels": channels, "durationMs": round(duration * 1000, 2),
            "peak": peak, "peakDbfs": round(peak_dbfs, 2),
            "rmsDbfs": round(rms_dbfs, 2), "nonzeroRatio": round(nonzero_ratio, 3),
        })

    levels = [item["rmsDbfs"] for item in measurements]
    if levels and max(levels) - min(levels) > 10:
        failures.append(f"relative RMS levels span {max(levels) - min(levels):.1f} dB; review for weak cues")
    result = {"status": "PASS" if not failures else "FAIL", "cueCount": len(measurements), "measurements": measurements, "failures": failures}
    print(json.dumps(result, indent=2))
    return 0 if not failures else 1


if __name__ == "__main__":
    sys.exit(main())

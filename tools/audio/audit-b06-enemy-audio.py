from __future__ import annotations

import hashlib
import json
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / "art-source" / "enemies" / "b06" / "audio-manifest.json"


def main() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    errors: list[str] = []
    for cue in manifest["cues"]:
        path = ROOT / cue["path"]
        if not path.is_file():
            errors.append(f"missing {cue['path']}")
            continue
        with wave.open(str(path), "rb") as wav:
            if wav.getnchannels() != 1 or wav.getsampwidth() != 2 or wav.getframerate() != 44100:
                errors.append(f"format mismatch {cue['path']}")
            if abs(wav.getnframes() / wav.getframerate() - cue["durationSeconds"]) > 0.001:
                errors.append(f"duration mismatch {cue['path']}")
            if wav.getnframes() < 3000 or wav.getnframes() > 44100 * 2:
                errors.append(f"duration out of bounds {cue['path']}")
        if hashlib.sha256(path.read_bytes()).hexdigest() != cue["sha256"]:
            errors.append(f"hash mismatch {cue['path']}")
    if len(manifest["cues"]) < 12:
        errors.append("insufficient distinct enemy cues")
    if errors:
        raise SystemExit("\n".join(errors))
    print(f"B06 audio audit PASS: {len(manifest['cues'])} WAVs, 44.1 kHz mono PCM16, manifest hashes verified; HEARD: {manifest['heard']}")


if __name__ == "__main__":
    main()

from __future__ import annotations

import hashlib
import json
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / "public" / "assets" / "audio" / "bosses" / "b08" / "audio-manifest.json"


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    if manifest.get("audioHeardByAgent") != "NO" or set(manifest.get("cues", {})) != {"sundial-custodian", "spoolheart-regent", "broken-meridian"}:
        raise SystemExit("B08 audio audit FAIL: missing provenance or boss cue set")
    checked = 0
    for boss, cues in manifest["cues"].items():
        if set(cues) != {"loop", "tell", "strike", "phase", "ko"}:
            raise SystemExit(f"B08 audio audit FAIL: incomplete cues for {boss}")
        for name, details in cues.items():
            path = ROOT / details["path"]
            if not path.exists() or path.stat().st_size != details["bytes"] or sha(path) != details["sha256"]:
                raise SystemExit(f"B08 audio audit FAIL: hash mismatch {path}")
            with wave.open(str(path), "rb") as wav:
                if wav.getframerate() != 44100 or wav.getnchannels() != 1 or wav.getsampwidth() != 2 or wav.getnframes() < 100:
                    raise SystemExit(f"B08 audio audit FAIL: unsupported WAV format {path}")
            checked += 1
    print(f"B08 audio audit PASS: {checked} original PCM16 cues, 44.1kHz mono; HUMAN HEARD SIGNOFF: NO")


if __name__ == "__main__":
    main()

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "art-source" / "environments" / "b07"
MANIFEST = SOURCE / "asset-manifest.json"


def main() -> None:
    if not MANIFEST.exists():
        raise SystemExit("Missing B07 source-art manifest; run art:b07:build first")
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    failures = []
    for rel, expected in manifest["sha256"].items():
        path = ROOT / rel
        if not path.exists() or hashlib.sha256(path.read_bytes()).hexdigest() != expected:
            failures.append(f"source/runtime hash mismatch: {rel}")
    for name, entry in manifest["runtime"].items():
        path = ROOT / "public" / "assets" / "environments" / "b07" / name
        with Image.open(path) as image:
            if list(image.size) != entry["size"]:
                failures.append(f"runtime dimensions mismatch: {name}")
            if image.width < 80 or image.height < 24:
                failures.append(f"runtime image is implausibly small: {name}")
    required = {"vesper-horizon.png", "vesper-platform-long.png", "vesper-platform-thread.png", "vesper-platform-lift.png", "vesper-thread-press.png", "vesper-threshold-gate.png", "vesper-conduit.png"}
    missing = required - set(manifest["runtime"])
    failures.extend(f"required runtime asset missing: {name}" for name in sorted(missing))
    if failures:
        raise SystemExit("B07 art audit failed:\n" + "\n".join(failures))
    print(f"B07 art audit passed: {len(manifest['runtime'])} runtime images; source and runtime hashes match")


if __name__ == "__main__":
    main()

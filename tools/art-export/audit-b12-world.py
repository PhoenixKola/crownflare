from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / "art-source/manifests/b12-world.json"


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    source = ROOT / manifest["generation"]["source_file"]
    assert digest(source) == manifest["generation"]["source_sha256"], "landmark master hash changed"
    assert len(manifest["outputs"]) == 9, "expected six landmarks and three source-derived platform strips"
    for entry in manifest["outputs"]:
        path = ROOT / entry["file"]
        assert path.is_file(), f"missing runtime asset: {entry['file']}"
        assert digest(path) == entry["sha256"], f"runtime hash mismatch: {entry['file']}"
        image = Image.open(path).convert("RGBA")
        assert list(image.size) == entry["size"], f"dimension mismatch: {entry['file']}"
        alpha = image.getchannel("A")
        assert alpha.getbbox() is not None, f"fully transparent art: {entry['file']}"
        if entry["file"].endswith(("sg-sunwell.png", "sg-echo.png", "sg-emberwell.png", "vl-counterweight.png", "vl-cantor.png", "vl-condenser.png")):
            assert image.size == (128, 128), f"landmark does not stay on the 128px runtime grid: {entry['file']}"
            assert set(alpha.tobytes()).issubset({0, 255}), f"landmark has resampled alpha fringe: {entry['file']}"
        elif image.size != (96, 36):
            raise AssertionError(f"platform strip is not native-scale 96x36: {entry['file']}")
        print(f"OK {entry['file']} {image.width}x{image.height} sha256={entry['sha256'][:12]}")
    print("B12 world art audit passed: generated alpha is clean; platform strips preserve source pixels.")


if __name__ == "__main__":
    main()

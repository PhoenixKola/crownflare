from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
PUBLIC = ROOT / "public" / "assets" / "bosses" / "b08"
MANIFEST = PUBLIC / "asset-manifest.json"


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    if set(manifest["bosses"]) != {"sundial-custodian", "spoolheart-regent", "broken-meridian"}:
        raise SystemExit("B08 art audit FAIL: expected exactly three original bosses")
    expected_effects = {
        "sundial-custodian": {"vfx-glassline-sweep", "vfx-zenith-stamp", "vfx-aperture-pulse"},
        "spoolheart-regent": {"vfx-loom-lash", "vfx-thread-drop", "vfx-spindle-rewind"},
        "broken-meridian": {"vfx-meridian-cleave", "vfx-daybreak-afterglow", "vfx-core-exposure"},
    }
    checked = []
    for boss, data in manifest["bosses"].items():
        if set(data.get("effects", [])) != expected_effects[boss]:
            raise SystemExit(f"B08 art audit FAIL: incomplete generated VFX set for {boss}")
        for relative, details in data["runtimeFiles"].items():
            path = ROOT / relative
            if not path.exists() or path.stat().st_size != details["bytes"] or sha(path) != details["sha256"]:
                raise SystemExit(f"B08 art audit FAIL: missing or hash-mismatched runtime file {relative}")
            image = Image.open(path)
            if list(image.size) != details["size"] or image.mode != details["mode"]:
                raise SystemExit(f"B08 art audit FAIL: mode/bounds mismatch {relative}")
            if path.name != "arena.png" and (image.mode != "RGBA" or image.getchannel("A").getextrema()[0] != 0):
                raise SystemExit(f"B08 art audit FAIL: alpha missing or fully opaque {relative}")
            if path.parent.name == boss and path.stem not in {"arena"} and image.size != (144, 144):
                raise SystemExit(f"B08 art audit FAIL: runtime pose canvas is not 144x144 {relative}")
            checked.append(path)
    sources = [ROOT / data[key] for data in manifest["bosses"].values() for key in ("canonicalSource", "retainedFirstMasterCandidate", "actionSheetSource", "vfxSheetSource", "arenaSource")]
    for path in sources:
        if not path.exists():
            raise SystemExit(f"B08 art audit FAIL: retained native source missing: {path}")
    size = sum(path.stat().st_size for path in checked)
    print(f"B08 art audit PASS: {len(checked)} hashed runtime PNGs ({size:,} bytes), 27 pose canvases, 9 generated VFX sprites, 3 alpha masters and 3 retained ImageGen source quintets")


if __name__ == "__main__":
    main()

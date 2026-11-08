from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / "art-source" / "enemies" / "b06" / "asset-manifest.json"


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    errors: list[str] = []
    frame_count = 0
    for name, data in manifest["characters"].items():
        master = ROOT / data["master"]
        if not master.is_file() or sha(master) != data["masterSha256"]:
            errors.append(f"master hash/missing: {name}")
            continue
        with Image.open(master) as image:
            if image.mode != "RGBA" or image.getchannel("A").getextrema()[0] != 0:
                errors.append(f"master is not transparent RGBA: {name}")
            if list(image.size) != data["masterDimensions"]:
                errors.append(f"master geometry changed: {name}")
        for frame in data["runtimeFrames"]:
            frame_count += 1
            path = ROOT / frame["runtime"]
            if not path.is_file() or sha(path) != frame["sha256"]:
                errors.append(f"runtime hash/missing: {name}/{frame['state']}")
                continue
            with Image.open(path) as image:
                if image.mode != "RGBA" or image.size != (80, 80) or image.getchannel("A").getextrema()[0] != 0:
                    errors.append(f"invalid alpha/canvas: {name}/{frame['state']}")
                if image.getchannel("A").point(lambda value: 255 if value > 18 else 0).getbbox() is None:
                    errors.append(f"empty runtime pose: {name}/{frame['state']}")
                bounds = list(image.getchannel("A").point(lambda value: 255 if value > 18 else 0).getbbox() or (0, 0, 0, 0))
                if bounds != frame["alphaBounds"]:
                    errors.append(f"alpha bounds drift: {name}/{frame['state']}")
    effects = manifest["effectsMaster"]
    master = ROOT / effects["master"]
    if not master.is_file() or sha(master) != effects["masterSha256"]:
        errors.append("effects master hash/missing")
    effect_count = 0
    for effect in manifest["effects"]:
        effect_count += 1
        path = ROOT / effect["runtime"]
        if not path.is_file() or sha(path) != effect["sha256"]:
            errors.append(f"effect hash/missing: {effect['state']}")
            continue
        with Image.open(path) as image:
            if image.mode != "RGBA" or image.size != (96, 72) or image.getchannel("A").getextrema()[0] != 0:
                errors.append(f"invalid effect alpha/canvas: {effect['state']}")
            if image.getchannel("A").point(lambda value: 255 if value > 18 else 0).getbbox() is None:
                errors.append(f"empty effect: {effect['state']}")
    if frame_count != 36 or effect_count != 8:
        errors.append(f"expected 36 enemy frames/8 effects, found {frame_count}/{effect_count}")
    if errors:
        raise SystemExit("\n".join(errors))
    print(f"B06 art audit PASS: {frame_count} transparent 80x80 enemy poses, {effect_count} transparent 96x72 signature effects; all source/runtime SHA-256 values verified")


if __name__ == "__main__":
    main()

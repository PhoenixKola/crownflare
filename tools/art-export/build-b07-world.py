from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "art-source" / "environments" / "b07"
OUT = ROOT / "public" / "assets" / "environments" / "b07"
BACKGROUND = SOURCE / "vesper-loomworks-source.png"
KIT = SOURCE / "vesper-kit-source.png"


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def export_crop(image: Image.Image, bounds: tuple[int, int, int, int], path: Path, size: tuple[int, int] | None = None) -> None:
    crop = image.crop(bounds)
    alpha = crop.getchannel("A")
    box = alpha.getbbox()
    if box:
        crop = crop.crop(box)
    if size:
        crop = crop.resize(size, Image.Resampling.NEAREST)
    crop.save(path, optimize=True)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    background = Image.open(BACKGROUND).convert("RGB")
    if background.size != (1672, 941):
        raise SystemExit(f"Unexpected Vesper source dimensions: {background.size}")
    kit = Image.open(KIT).convert("RGBA")
    if kit.size != (1672, 941):
        raise SystemExit(f"Unexpected Vesper kit dimensions: {kit.size}")

    # A panoramic crop preserves the generated loom silhouettes while filling one authored room.
    panorama = background.crop((0, 235, 1672, 706)).resize((960, 270), Image.Resampling.NEAREST)
    panorama.save(OUT / "vesper-horizon.png", optimize=True)
    # Separate generated kit crops provide true parallax props, platforms, lift, press and gate.
    export_crop(kit, (0, 0, 580, 420), OUT / "vesper-platform-long.png", (290, 210))
    export_crop(kit, (580, 0, 1190, 420), OUT / "vesper-platform-thread.png", (305, 210))
    export_crop(kit, (1180, 0, 1672, 430), OUT / "vesper-platform-lift.png", (246, 215))
    export_crop(kit, (20, 420, 490, 941), OUT / "vesper-thread-press.png", (235, 260))
    export_crop(kit, (570, 405, 1170, 941), OUT / "vesper-threshold-gate.png", (300, 268))
    export_crop(kit, (1180, 630, 1672, 941), OUT / "vesper-conduit.png", (246, 155))

    # The prop sprites are also the authored mid/foreground parallax plates.
    export_crop(kit, (1180, 0, 1672, 430), OUT / "vesper-engineering.png", (492, 430))
    export_crop(kit, (0, 0, 580, 420), OUT / "vesper-foreground.png", (580, 420))

    files = [BACKGROUND, KIT, *sorted(OUT.glob("*.png"))]
    manifest = {
        "milestone": "B07",
        "region": "Vesper Loomworks",
        "nativeImageGeneration": {
            "background": {"tool": "OpenAI native ImageGen", "generation": "01a1b353-b750-72f3-9594-c017f1f1a806/exec-1f641f84-f645-455f-a6ce-cf699a90db65", "prompt": "True 16-bit pixel-art videogame background master; Vesper night-side mechanical spindle loom hall; petrol/ink, oxidized jade, dark brass and pearl threads; stepped pixel clusters; no text or characters."},
            "kit": {"tool": "OpenAI native ImageGen", "generation": "01a1b353-b750-72f3-9594-c017f1f1a806/exec-8e7ee771-2677-4df3-b47d-a34dfd31ecf0", "prompt": "Transparent Vesper pixel-art modular sprite sheet with ledge, thread bridge, spindle lift, loom press, threshold gate and conduit tile."},
        },
        "pipeline": "python tools/art-export/build-b07-world.py; nearest-neighbour crop and scale from the preserved ImageGen source masters.",
        "sha256": {str(path.relative_to(ROOT)).replace("\\", "/"): digest(path) for path in files},
        "runtime": {path.name: {"sha256": digest(path), "size": Image.open(path).size, "bytes": path.stat().st_size} for path in sorted(OUT.glob("*.png"))},
    }
    (SOURCE / "asset-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"B07 Vesper assets built: {len(manifest['runtime'])} runtime images")


if __name__ == "__main__":
    main()

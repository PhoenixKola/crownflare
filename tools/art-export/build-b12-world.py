from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "art-source/environments/b12/landmarks-atlas.png"
RUNTIME = ROOT / "public/assets/environments/b12"
MANIFEST = ROOT / "art-source/manifests/b12-world.json"
LANDMARKS = {
    "sg-sunwell": (0, 0),
    "sg-echo": (1, 0),
    "sg-emberwell": (2, 0),
    "vl-counterweight": (0, 1),
    "vl-cantor": (1, 1),
    "vl-condenser": (2, 1),
}
PLATFORM_STRIPS = {
    "vesper-long-strip": ("vesper-platform-long.png", (98, 80, 194, 116)),
    "vesper-thread-strip": ("vesper-platform-thread.png", (104, 94, 200, 130)),
    "vesper-lift-strip": ("vesper-platform-lift.png", (75, 120, 171, 156)),
}


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def is_checker(pixel: tuple[int, int, int]) -> bool:
    low, high = min(pixel), max(pixel)
    return low >= 236 and high - low <= 24


def clear_checkerboard(image: Image.Image) -> Image.Image:
    """Remove the opaque white checkerboard via edge flood-fill, preserving bounded highlights."""
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size
    seen = bytearray(width * height)
    stack: list[tuple[int, int]] = []
    for x in range(width):
        stack.extend(((x, 0), (x, height - 1)))
    for y in range(height):
        stack.extend(((0, y), (width - 1, y)))
    while stack:
        x, y = stack.pop()
        index = y * width + x
        if seen[index]:
            continue
        seen[index] = 1
        red, green, blue, _alpha = pixels[x, y]
        if not is_checker((red, green, blue)):
            continue
        pixels[x, y] = (red, green, blue, 0)
        if x > 0:
            stack.append((x - 1, y))
        if x + 1 < width:
            stack.append((x + 1, y))
        if y > 0:
            stack.append((x, y - 1))
        if y + 1 < height:
            stack.append((x, y + 1))
    return rgba


def main() -> None:
    RUNTIME.mkdir(parents=True, exist_ok=True)
    atlas = Image.open(SOURCE).convert("RGB")
    if atlas.size != (1536, 1024):
        raise SystemExit(f"Expected 1536x1024 native landmark atlas; got {atlas.size}")
    transparent = clear_checkerboard(atlas)
    outputs: list[dict[str, object]] = []
    for name, (column, row) in LANDMARKS.items():
        cell = transparent.crop((column * 512, row * 512, (column + 1) * 512, (row + 1) * 512))
        runtime = cell.resize((128, 128), Image.Resampling.NEAREST)
        path = RUNTIME / f"{name}.png"
        runtime.save(path, optimize=True)
        if runtime.getchannel("A").getbbox() is None:
            raise SystemExit(f"Empty landmark after background removal: {name}")
        outputs.append({"file": path.relative_to(ROOT).as_posix(), "sha256": digest(path), "size": list(runtime.size), "alpha_bbox": list(runtime.getchannel("A").getbbox())})
    for name, (source_name, crop) in PLATFORM_STRIPS.items():
        source = ROOT / "public/assets/environments/b07" / source_name
        strip = Image.open(source).convert("RGBA").crop(crop)
        if strip.size != (96, 36):
            raise SystemExit(f"Unexpected platform strip size for {name}: {strip.size}")
        path = RUNTIME / f"{name}.png"
        strip.save(path, optimize=True)
        outputs.append({"file": path.relative_to(ROOT).as_posix(), "sha256": digest(path), "size": list(strip.size), "source_file": source.relative_to(ROOT).as_posix(), "source_sha256": digest(source), "crop": list(crop)})
    manifest = {
        "milestone": "B12",
        "generation": {"tool": "Codex native ImageGen", "call_id": "01a1b353-b750-72f3-9594-c017f1f1a806", "output": "exec-435ea220-e13f-4b72-9096-9906cc9ea74a.png", "source_file": SOURCE.relative_to(ROOT).as_posix(), "source_sha256": digest(SOURCE), "prompt": "Original 3x2 transparent atlas of six pixel-art Sunderglass/Vesper landmarks; the generated file had a baked near-white checkerboard, removed by edge-connected low-chroma flood fill. Each 512px cell is reduced 4x with nearest-neighbor sampling to a 128px runtime tile."},
        "platform_derivatives": "Pixel-preserving 96x36 source crops from B07 masters; tiled at native pixel scale to match each authored collision width.",
        "outputs": outputs,
    }
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Built {len(outputs)} B12 environment sprites; source SHA256 {digest(SOURCE)}")


if __name__ == "__main__":
    main()

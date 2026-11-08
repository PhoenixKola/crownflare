from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "art-source/ui/b11/action-icon-atlas.png"
OUT = ROOT / "public/assets/ui/b11/actions"
MANIFEST = ROOT / "art-source/manifests/b11-ui-icons.json"
NAMES = ["light", "heavy", "aerial", "resonance", "dash", "transform", "finisher", "iona-crest"]
OUTPUT_ID = "01a1b353-b750-72f3-9594-c017f1f1a806"
OUTPUT_FILE_ID = "exec-ccc60d48-be53-4c6b-b5a9-58a563acf4bc.png"
PROMPT = (
    "Create one original pixel-art UI sprite atlas for the indie action roguelite Crownflare. "
    "Transparent PNG alpha; a precisely aligned four-column by two-row sprite sheet with eight isolated centered square icons, equal grid cells, generous transparent gutters. "
    "Crisp pixel clusters and 1-pixel dark navy outline, luminous pale pearl and teal with restrained copper accents, no text, no labels, no cell frames, no background, no shadows beyond silhouettes. "
    "Row one: light sword slash, heavy downward blade strike, upward aerial strike, contained resonance energy orb. "
    "Row two: quick dash wing/boot, transformation sun crest, falling solar finisher blade, Iona identity crest silhouette. "
    "Bold, clean and recognizable at 32x32 pixels. Strict pixel art with hard edges, suitable for deterministic grid cropping."
)


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    source = Image.open(SOURCE).convert("RGBA")
    width, height = source.size
    crops: dict[str, dict[str, object]] = {}
    for index, name in enumerate(NAMES):
        column, row = index % 4, index // 4
        left, right = round(column * width / 4), round((column + 1) * width / 4)
        top, bottom = round(row * height / 2), round((row + 1) * height / 2)
        cell = source.crop((left, top, right, bottom))
        bbox = cell.getchannel("A").getbbox()
        if bbox is None:
            raise ValueError(f"Empty alpha in icon cell {name}")
        icon = cell.crop(bbox)
        side = max(icon.size)
        square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
        square.alpha_composite(icon, ((side - icon.width) // 2, (side - icon.height) // 2))
        inset = 4
        scaled = square.resize((96 - inset * 2, 96 - inset * 2), Image.Resampling.NEAREST)
        runtime = Image.new("RGBA", (96, 96), (0, 0, 0, 0))
        runtime.alpha_composite(scaled, (inset, inset))
        target = OUT / f"{name}.png"
        runtime.save(target, optimize=True)
        crops[name] = {
            "cell": [left, top, right, bottom],
            "alpha_bounds_in_cell": list(bbox),
            "runtime": target.relative_to(ROOT).as_posix(),
            "runtime_sha256": digest(target),
            "runtime_size": list(runtime.size),
            "resampling": "nearest-neighbor; transparent 4px inset",
        }

    manifest = {
        "milestone": "B11",
        "source": SOURCE.relative_to(ROOT).as_posix(),
        "source_sha256": digest(SOURCE),
        "source_size": list(source.size),
        "tool": "Codex native ImageGen",
        "tool_output_id": OUTPUT_ID,
    "tool_output_file_id": OUTPUT_FILE_ID,
        "prompt": PROMPT,
        "transparent_background": True,
        "crop_method": "2x4 row-major equal fractional grid; per-cell alpha bounds; center-pad square; nearest-neighbor export to 96x96 RGBA",
        "runtime_mapping": crops,
        "additional_calls": [{
            "tool_output_id": None,
            "tool_output_file_id": None,
            "status": "discarded; saved output path and output ID were not exposed by the tool wrapper",
            "prompt": "Create one original pixel-art UI sprite atlas for the indie action roguelite Crownflare. It must be a transparent PNG, 4 columns by 2 rows, exactly eight isolated square icons with consistent centered optical size and ample transparent gutter. Each icon has a clean 1-pixel dark navy outline, crisp pixel clusters, restrained luminous pearl/teal/copper palette, small warm Dawnrush accents, no text, no letters, no numbers, no border around cells, no shadows outside silhouettes, no background. Row 1 left to right: fast light sword slash; heavy downward hammering blade; upward aerial strike with rising arc; stored resonance energy orb. Row 2 left to right: quick dash wing/boot; transformation sun crest; finisher falling solar blade; Iona identity crest/portrait silhouette. Make the artwork bold and immediately readable when each cell is displayed at 32 by 32 pixels. Keep exact 4x2 aligned grid and equal cell sizes, suitable for deterministic cell crops. Pixel art only, nearest-neighbor crisp edges.",
        }],
        "notes": "The retained, reproducible source output is the second native generation call. The first call's metadata was not surfaced by the wrapper; its prompt and the unavailable identifiers are recorded above.",
    }
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Built {len(crops)} B11 UI icons from {source.size[0]}x{source.size[1]} transparent atlas")


if __name__ == "__main__":
    main()

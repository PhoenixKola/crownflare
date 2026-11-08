from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "art-source" / "bosses" / "b08"
OUTPUT = ROOT / "public" / "assets" / "bosses" / "b08"
BOSSES = {
    "sundial-custodian": ["idle", "ready", "sweep-telegraph", "sweep", "stamp-telegraph", "stamp", "phase-2", "hurt", "ko"],
    "spoolheart-regent": ["idle", "ready", "lash-telegraph", "lash", "thread-telegraph", "thread-drop", "rewind", "phase-2", "ko"],
    "broken-meridian": ["idle", "cleave-telegraph", "cleave", "afterglow", "core-exposed", "phase-change", "phase-2", "hurt", "ko"],
}
EFFECTS = {
    "sundial-custodian": ["vfx-glassline-sweep", "vfx-zenith-stamp", "vfx-aperture-pulse"],
    "spoolheart-regent": ["vfx-loom-lash", "vfx-thread-drop", "vfx-spindle-rewind"],
    "broken-meridian": ["vfx-meridian-cleave", "vfx-daybreak-afterglow", "vfx-core-exposure"],
}
FRAME_SIZE = (144, 144)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def clean_master(source: Path, output: Path) -> None:
    original = Image.open(source)
    had_alpha = original.mode == "RGBA"
    image = original.convert("RGBA")
    pixels = image.load()
    width, height = image.size
    for y in range(height):
        for x in range(width):
            r, g, b, _ = pixels[x, y]
            if (r > 220 and g < 72 and b < 72) or (g > 225 and r < 88 and b < 100) or (not had_alpha and min(r, g, b) >= 214 and max(r, g, b) - min(r, g, b) <= 16):
                pixels[x, y] = (r, g, b, 0)
    bbox = image.getchannel("A").getbbox()
    if bbox:
        image = image.crop(bbox)
    image.thumbnail((132, 132), Image.Resampling.NEAREST)
    canvas = Image.new("RGBA", FRAME_SIZE, (0, 0, 0, 0))
    canvas.alpha_composite(image, ((144 - image.width) // 2, 136 - image.height))
    output.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(output, optimize=True)


def process_sheet(source: Path, target: Path, poses: list[str]) -> list[str]:
    sheet = Image.open(source).convert("RGBA")
    width, height = sheet.size
    exported: list[str] = []
    for index, pose in enumerate(poses):
        col, row = index % 3, index // 3
        left, right = round(col * width / 3), round((col + 1) * width / 3)
        top, bottom = round(row * height / 3), round((row + 1) * height / 3)
        frame = sheet.crop((left, top, right, bottom))
        pix = frame.load()
        for y in range(frame.height):
            for x in range(frame.width):
                r, g, b, a = pix[x, y]
                # ImageGen can leave a few isolated chroma artifacts around the
                # silhouette. Keep the authored palette and remove only vivid
                # red/green fringe pixels which do not occur in these designs.
                if (r > 220 and g < 72 and b < 72) or (g > 225 and r < 88 and b < 100):
                    pix[x, y] = (r, g, b, 0)
        bbox = frame.getchannel("A").getbbox()
        if bbox:
            frame = frame.crop(bbox)
        frame.thumbnail((124, 124), Image.Resampling.NEAREST)
        canvas = Image.new("RGBA", FRAME_SIZE, (0, 0, 0, 0))
        canvas.alpha_composite(frame, ((144 - frame.width) // 2, 136 - frame.height))
        out = target / f"{pose}.png"
        out.parent.mkdir(parents=True, exist_ok=True)
        canvas.save(out, optimize=True)
        exported.append(pose)
    return exported


def process_effect_sheet(source: Path, target: Path, effects: list[str]) -> list[str]:
    sheet = Image.open(source).convert("RGBA")
    width, height = sheet.size
    exported: list[str] = []
    for index, effect in enumerate(effects):
        left, right = round(index * width / 3), round((index + 1) * width / 3)
        frame = sheet.crop((left, 0, right, height))
        pix = frame.load()
        for y in range(frame.height):
            for x in range(frame.width):
                r, g, b, a = pix[x, y]
                if (r > 220 and g < 72 and b < 72) or (g > 225 and r < 88 and b < 100):
                    pix[x, y] = (r, g, b, 0)
        bbox = frame.getchannel("A").getbbox()
        if bbox:
            frame = frame.crop(bbox)
        frame.thumbnail((136, 136), Image.Resampling.NEAREST)
        canvas = Image.new("RGBA", FRAME_SIZE, (0, 0, 0, 0))
        canvas.alpha_composite(frame, ((144 - frame.width) // 2, (144 - frame.height) // 2))
        out = target / f"{effect}.png"
        out.parent.mkdir(parents=True, exist_ok=True)
        canvas.save(out, optimize=True)
        exported.append(effect)
    return exported


def process_arena(source: Path, output: Path) -> None:
    image = Image.open(source).convert("RGB").resize((480, 270), Image.Resampling.LANCZOS)
    image = image.quantize(colors=96, method=Image.Quantize.MEDIANCUT).convert("RGB")
    output.parent.mkdir(parents=True, exist_ok=True)
    image.save(output, optimize=True)


def main() -> None:
    manifest = {"milestone": "B08", "sourceRule": "Native ImageGen masters and reference-guided action sheets; runtime frames are derived from retained PNG sources.", "bosses": {}}
    for boss, poses in BOSSES.items():
        source_dir = SOURCE / boss
        output_dir = OUTPUT / boss
        master_candidate = source_dir / "canonical-master-v2.png"
        master_src = master_candidate if master_candidate.exists() else source_dir / "canonical-master.png"
        sheet_src = source_dir / "action-sheet.png"
        vfx_src = source_dir / "vfx-sheet.png"
        arena_src = source_dir / "arena-background.png"
        master_out = output_dir / "canonical-master.png"
        arena_out = output_dir / "arena.png"
        clean_master(master_src, master_out)
        exported = process_sheet(sheet_src, output_dir, poses)
        exported_effects = process_effect_sheet(vfx_src, output_dir, EFFECTS[boss])
        process_arena(arena_src, arena_out)
        files = [master_out, arena_out, *[output_dir / f"{pose}.png" for pose in exported], *[output_dir / f"{effect}.png" for effect in exported_effects]]
        manifest["bosses"][boss] = {
            "canonicalSource": str(master_src.relative_to(ROOT)).replace("\\", "/"),
            "canonicalSourceSha256": sha256(master_src),
            "retainedFirstMasterCandidate": str((source_dir / "canonical-master.png").relative_to(ROOT)).replace("\\", "/"),
            "retainedFirstMasterSha256": sha256(source_dir / "canonical-master.png"),
            "actionSheetSource": str(sheet_src.relative_to(ROOT)).replace("\\", "/"),
            "actionSheetSha256": sha256(sheet_src),
            "vfxSheetSource": str(vfx_src.relative_to(ROOT)).replace("\\", "/"),
            "vfxSheetSha256": sha256(vfx_src),
            "effects": exported_effects,
            "arenaSource": str(arena_src.relative_to(ROOT)).replace("\\", "/"),
            "arenaSourceSha256": sha256(arena_src),
            "poses": exported,
            "runtimeFiles": {str(file.relative_to(ROOT)).replace("\\", "/"): {"sha256": sha256(file), "bytes": file.stat().st_size, "size": list(Image.open(file).size), "mode": Image.open(file).mode} for file in files},
        }
    out_path = OUTPUT / "asset-manifest.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    pose_count = sum(len(v["poses"]) for v in manifest["bosses"].values())
    effect_count = sum(len(v["effects"]) for v in manifest["bosses"].values())
    print(f"B08 exported {pose_count} pose frames, {effect_count} ImageGen effect sprites, 3 masters and 3 arena layers")


if __name__ == "__main__":
    main()

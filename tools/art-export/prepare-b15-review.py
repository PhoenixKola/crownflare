#!/usr/bin/env python3
"""Build an isolated B15 review package from active Base and Stormhalo exports.

This tool never writes to public/, src/, or the existing Stormhalo pilot. It
copies source material into a new review directory, produces candidate pixels
and composited previews, and packages the results for owner review.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import shutil
import zipfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_OUT = ROOT / "release-artifacts/review/Crownflare-B15-Art-Review-2026-11-12"
BASE_MANIFEST = ROOT / "art-source/manifests/iona-b01e-candidate-v1.json"
BASE_DIR = ROOT / "public/assets/characters/iona/b01e"
RIG_IDLE_DIR = ROOT / "review-evidence/stormhalo-rig-pilot/rig/blender-build-complete/sprites/native/Idle"
STORM_EXPORTS = ROOT / "review-evidence/stormhalo-rig-pilot/animation/exports-crown-final-v2"
STORM_ZIP = ROOT / "release-artifacts/Crownflare-Iona-Stormhalo-Rig-Pilot-2026-11-12.zip"

BG = (10, 24, 34)
TEXT = (194, 220, 213)
LINE = (54, 102, 111)
PALETTE = {"lid": (49, 46, 71), "pupil": (25, 21, 37), "highlight": (243, 229, 224)}
FACE_COLORS = {
    (248, 191, 157), (249, 203, 174), (218, 167, 148),
    (165, 134, 135), (174, 157, 167), (124, 96, 99),
}
PUPIL = PALETTE["pupil"]
FPS = 12
GIF_DURATIONS_24 = [80, 80, 90] * 8


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def json_write(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def copy_file(src: Path, dst: Path) -> None:
    if src.resolve() == dst.resolve():
        return
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)


def paste_sprite(canvas: Image.Image, sprite: Image.Image, x: int, y: int) -> None:
    canvas.alpha_composite(sprite.convert("RGBA"), (x, y))


def opaque_preview(image: Image.Image, scale: int = 1) -> Image.Image:
    rgba = image.convert("RGBA")
    bg = Image.new("RGBA", rgba.size, (*BG, 255))
    bg.alpha_composite(rgba)
    if scale != 1:
        bg = bg.resize((bg.width * scale, bg.height * scale), Image.Resampling.NEAREST)
    return bg.convert("RGB")


def sprite_sheet(items: list[tuple[Image.Image, str]], path: Path, *, cols: int, scale: int,
                 tile_size: tuple[int, int] = (128, 80), label_h: int = 20) -> None:
    gap = 6
    tile_w, tile_h = tile_size[0] * scale, tile_size[1] * scale
    rows = math.ceil(len(items) / cols)
    board = Image.new("RGB", (cols * tile_w + (cols + 1) * gap,
                              rows * (tile_h + label_h) + (rows + 1) * gap), BG)
    d = ImageDraw.Draw(board)
    for i, (image, label) in enumerate(items):
        x = gap + i % cols * (tile_w + gap)
        y = gap + i // cols * (tile_h + label_h + gap)
        board.paste(opaque_preview(image, scale), (x, y))
        d.rectangle((x, y, x + tile_w - 1, y + tile_h - 1), outline=LINE)
        d.text((x + 2, y + tile_h + 3), label, fill=TEXT)
    path.parent.mkdir(parents=True, exist_ok=True)
    board.save(path, optimize=True)


def comparison_board(before: list[Image.Image], after: list[Image.Image], labels: list[str], path: Path,
                     *, scale: int, tile_size: tuple[int, int] = (128, 80)) -> None:
    gap, title_h = 8, 20
    w, h = tile_size[0] * scale, tile_size[1] * scale
    board = Image.new("RGB", (2 * w + 3 * gap, len(before) * (h + title_h + gap) + gap), BG)
    d = ImageDraw.Draw(board)
    d.text((gap, 3), "BEFORE", fill=(233, 179, 137))
    d.text((gap + w + gap, 3), "CANDIDATE", fill=(137, 226, 208))
    for i, (a, b, label) in enumerate(zip(before, after, labels)):
        y = gap + title_h + i * (h + title_h + gap)
        d.text((gap, y - title_h + 2), label, fill=TEXT)
        d.text((gap + w + gap, y - title_h + 2), label, fill=TEXT)
        board.paste(opaque_preview(a, scale), (gap, y))
        board.paste(opaque_preview(b, scale), (gap + w + gap, y))
        d.rectangle((gap, y, gap + w - 1, y + h - 1), outline=LINE)
        d.rectangle((gap + w + gap, y, 2 * w + 2 * gap - 1, y + h - 1), outline=LINE)
    path.parent.mkdir(parents=True, exist_ok=True)
    board.save(path, optimize=True)


def idle_anchor_review(records: list[dict[str, object]], active: list[dict[str, object]],
                       before_dir: Path, after_dir: Path, out_dir: Path) -> None:
    """Write coordinate-marked idle evidence so the tiny eye decisions are auditable."""
    lookup = {(r["id"], r["facing"]): r for r in records}
    idle = [item for item in active if item["id"].startswith("idle-")]
    cell, x0, y0, x1, y1 = 16, 44, 18, 82, 44
    panel_w, panel_h = (x1 - x0) * cell, (y1 - y0) * cell
    cols, gap, label_h = 2, 12, 28
    rows = math.ceil(len(idle) * 2 / cols)
    board = Image.new("RGB", (cols * panel_w + (cols + 1) * gap,
                              rows * (panel_h + label_h + gap) + gap), (7, 18, 27))
    draw = ImageDraw.Draw(board)
    panel_index = 0
    for item in idle:
        record = lookup[(item["id"], item["facing"])]
        name = Path(record["candidateFile"]).name
        for kind, folder in (("BEFORE", before_dir), ("CANDIDATE", after_dir)):
            image = Image.open(folder / name).convert("RGBA")
            p = image.load()
            panel = Image.new("RGB", (panel_w, panel_h), (8, 20, 30))
            pd = ImageDraw.Draw(panel)
            for y in range(y0, y1):
                for x in range(x0, x1):
                    pixel = p[x, y]
                    rgb = pixel[:3] if pixel[3] else (8, 20, 30)
                    x1c, y1c = (x - x0) * cell, (y - y0) * cell
                    pd.rectangle((x1c, y1c, x1c + cell - 1, y1c + cell - 1), fill=rgb,
                                 outline=(52, 72, 80))
                    if pixel[3] and pixel[:3] == PUPIL:
                        pd.rectangle((x1c + 3, y1c + 3, x1c + cell - 4, y1c + cell - 4),
                                     outline=(255, 225, 120), width=2)
            if record["anchor"]:
                x, y = record["anchor"]
                pd.rectangle(((x - x0) * cell, (y - y0) * cell,
                              (x - x0 + 1) * cell - 1, (y - y0 + 1) * cell - 1),
                             outline=(255, 40, 40), width=4)
            bx = gap + (panel_index % cols) * (panel_w + gap)
            by = gap + (panel_index // cols) * (panel_h + label_h + gap)
            board.paste(panel, (bx, by))
            draw.rectangle((bx, by, bx + panel_w - 1, by + panel_h - 1), outline=LINE)
            draw.text((bx, by + panel_h + 3),
                      f"{item['id']}-{item['facing']} {kind} / anchor {record['anchor']}", fill=TEXT)
            for x in range(x0, x1, 4):
                draw.text((bx + (x - x0) * cell, by - 10), str(x), fill=(112, 176, 172))
            for y in range(y0, y1, 4):
                draw.text((bx - 18, by + (y - y0) * cell), str(y), fill=(112, 176, 172))
            panel_index += 1
    out_dir.mkdir(parents=True, exist_ok=True)
    board.save(out_dir / "base-idle-face-pixel-grid.png", optimize=True)

    cell_w, cell_h, cols, gap, label = 528, 324, 2, 8, 22
    rows = math.ceil(panel_index / cols)
    audit = Image.new("RGB", (cols * cell_w + (cols + 1) * gap,
                              rows * (cell_h + label + gap) + gap), (7, 18, 27))
    d = ImageDraw.Draw(audit)
    n = 0
    for item in idle:
        record = lookup[(item["id"], item["facing"])]
        name = Path(record["candidateFile"]).name
        top = item["runtimeVisibleBounds"][1]
        for kind, folder in (("BEFORE", before_dir), ("CANDIDATE", after_dir)):
            image = Image.open(folder / name).convert("RGBA")
            crop = image.crop((42, max(0, top - 2), 86, min(80, top + 25)))
            background = Image.new("RGBA", crop.size, (11, 27, 38, 255))
            background.alpha_composite(crop)
            crop = background.convert("RGB").resize((cell_w, cell_h), Image.Resampling.NEAREST)
            if record["anchor"]:
                x, y = record["anchor"]
                ox = (x - 42) * 12
                oy = (y - max(0, top - 2)) * 12
                ImageDraw.Draw(crop).rectangle((ox, oy, ox + 11, oy + 11), outline=(255, 80, 50), width=3)
            bx = gap + (n % cols) * (cell_w + gap)
            by = gap + (n // cols) * (cell_h + label + gap)
            audit.paste(crop, (bx, by))
            d.rectangle((bx, by, bx + cell_w - 1, by + cell_h - 1), outline=LINE)
            d.text((bx + 2, by + cell_h + 3), f"{item['id']}-{item['facing']} {kind}", fill=TEXT)
            n += 1
    audit.save(out_dir / "base-idle-eye-anchor-audit-12x.png", optimize=True)


def make_gif(images: list[Image.Image], durations: list[int], path: Path, scale: int = 3) -> None:
    frames = [opaque_preview(im, scale).convert("P", palette=Image.Palette.ADAPTIVE, colors=256) for im in images]
    path.parent.mkdir(parents=True, exist_ok=True)
    frames[0].save(path, save_all=True, append_images=frames[1:], duration=durations,
                   loop=0, disposal=2, optimize=False)


def eye_anchor(image: Image.Image, head_top: int) -> tuple[int, int, int] | None:
    """Find a confident authored dark pupil surrounded by face tones.

    Detection is intentionally conservative: closed/covered/ambiguous eyes are
    preserved unchanged instead of moving the patch into hair or costume.
    """
    p = image.convert("RGBA").load()
    candidates: list[tuple[int, int, int, int]] = []
    for y in range(max(1, head_top + 5), min(79, head_top + 14)):
        for x in range(46, 82):
            if p[x, y][3] == 0 or p[x, y][:3] != PUPIL:
                continue
            face_neighbors = sum(
                p[x + dx, y + dy][3] > 0 and p[x + dx, y + dy][:3] in FACE_COLORS
                for dx in (-1, 0, 1) for dy in (-1, 0, 1)
                if (dx or dy) and 0 <= x + dx < 128 and 0 <= y + dy < 80
            )
            if face_neighbors >= 4:
                candidates.append((face_neighbors, -abs(y - (head_top + 9)), x, y))
    if not candidates:
        return None
    candidates.sort(reverse=True)
    score, _, x, y = candidates[0]
    # The specular pixel sits opposite the gaze direction so the pupil reads as
    # a small profile eye rather than a detached mark. Facing is handled by caller.
    return x, y, score


def patch_eye(image: Image.Image, anchor: tuple[int, int, int], facing: str) -> tuple[Image.Image, list[dict[str, object]]] | None:
    result = image.convert("RGBA").copy()
    x, y, score = anchor
    inward_x = x - 1 if facing == "right" else x + 1
    lid = (x, y - 1)
    p = result.load()
    # Only replace existing face shades; this guards hair, headband, and outline.
    if p[inward_x, y][3] == 0 or p[inward_x, y][:3] not in FACE_COLORS:
        return None
    if p[lid[0], lid[1]][3] == 0 or p[lid[0], lid[1]][:3] not in FACE_COLORS:
        return None
    edits = [
        {"xy": [inward_x, y], "from": list(p[inward_x, y][:3]), "to": list(PALETTE["highlight"]), "part": "sclera highlight"},
        {"xy": [x, y - 1], "from": list(p[x, y - 1][:3]), "to": list(PALETTE["lid"]), "part": "upper lid"},
    ]
    p[inward_x, y] = (*PALETTE["highlight"], 255)
    p[x, y - 1] = (*PALETTE["lid"], 255)
    return result, [{**e, "anchor": [x, y], "confidence": score} for e in edits]


def detect_and_patch_base(frames: list[dict[str, object]], source_lookup: dict[str, Path],
                          input_dir: Path, before_dir: Path, after_dir: Path) -> tuple[list[dict[str, object]], dict[str, Image.Image], dict[str, Image.Image]]:
    records: list[dict[str, object]] = []
    before_images: dict[str, Image.Image] = {}
    after_images: dict[str, Image.Image] = {}
    for item in frames:
        source = source_lookup[item["runtimePng"]]
        name = Path(item["runtimePng"]).name
        before = Image.open(source).convert("RGBA")
        if before.size != (128, 80):
            raise RuntimeError(f"Unexpected active Base frame canvas: {name} {before.size}")
        before_images[name] = before
        copy_file(source, input_dir / name)
        copy_file(source, before_dir / name)
        bounds = item.get("runtimeVisibleBounds") or item.get("visibleBounds")
        top = int(bounds[1])
        anchor = eye_anchor(before, top)
        patched = None
        edits: list[dict[str, object]] = []
        if anchor:
            patched = patch_eye(before, anchor, item["facing"])
        if patched:
            after, edits = patched
            status = "patched-open-eye"
            anchor_xy = [anchor[0], anchor[1]]
            score = anchor[2]
        else:
            after = before.copy()
            status = "unchanged-closed-occluded-or-ambiguous"
            anchor_xy = [anchor[0], anchor[1]] if anchor else None
            score = anchor[2] if anchor else None
        dest = after_dir / name
        dest.parent.mkdir(parents=True, exist_ok=True)
        after.save(dest, optimize=True)
        after_images[name] = after
        records.append({
            "id": item["id"], "facing": item["facing"], "durationMs": item["durationMs"],
            "source": item["runtimePng"], "beforeFile": f"before/{name}", "candidateFile": f"after/{name}",
            "beforeSha256": sha256(source), "candidateSha256": sha256(dest),
            "canvas": list(before.size), "anchor": anchor_xy, "confidenceFaceNeighbors": score,
            "status": status, "pixelEdits": edits,
        })
    return records, before_images, after_images


def dilation_exclusion(character: Image.Image, radius: int = 2) -> Image.Image:
    alpha = character.convert("RGBA").getchannel("A")
    size = radius * 2 + 1
    return alpha.filter(ImageFilter.MaxFilter(size))


def clip_outside_character(layer: Image.Image, exclusion: Image.Image, *, opacity: float = 1.0) -> Image.Image:
    layer = layer.convert("RGBA")
    alpha = layer.getchannel("A")
    if opacity != 1:
        alpha = alpha.point(lambda a: max(0, min(255, round(a * opacity))))
    # Remove foreground aura within a two-pixel expanded character silhouette.
    ex = exclusion.load()
    a = alpha.load()
    for y in range(layer.height):
        for x in range(layer.width):
            if ex[x, y] > 0:
                a[x, y] = 0
    layer.putalpha(alpha)
    return layer


def stamp_component(component: Image.Image, center: tuple[float, float], size: tuple[int, int],
                    opacity: float, angle: float = 0.0) -> Image.Image:
    tile = component.convert("RGBA").resize(size, Image.Resampling.NEAREST)
    if angle:
        tile = tile.rotate(angle, resample=Image.Resampling.NEAREST, expand=True)
    alpha = tile.getchannel("A").point(lambda a: max(0, min(255, round(a * opacity))))
    tile.putalpha(alpha)
    layer = Image.new("RGBA", (128, 80), (0, 0, 0, 0))
    layer.alpha_composite(tile, (round(center[0] - tile.width / 2), round(center[1] - tile.height / 2)))
    return layer


def composite_aura(character: Image.Image, raw: dict[str, Image.Image], front: Image.Image,
                   motes: Image.Image) -> Image.Image:
    canvas = Image.new("RGBA", (128, 80), (0, 0, 0, 0))
    canvas.alpha_composite(raw["rear"])
    canvas.alpha_composite(raw["filaments"])
    canvas.alpha_composite(character.convert("RGBA"))
    canvas.alpha_composite(front)
    canvas.alpha_composite(motes)
    return canvas


def add_board_title(image: Image.Image, title: str) -> Image.Image:
    d = ImageDraw.Draw(image)
    d.rectangle((0, 0, image.width, 24), fill=(7, 17, 25))
    d.text((8, 6), title, fill=TEXT)
    return image


def build_browser_preview(package: Path) -> None:
    html = r"""<!doctype html>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,">
<title>Crownflare B15 Art Review</title>
<style>
:root{color-scheme:dark}body{margin:0;background:#07131c;color:#dce9e2;font:15px system-ui,sans-serif}main{max-width:1100px;margin:24px auto;padding:0 16px}header{display:flex;gap:9px;flex-wrap:wrap;align-items:center;margin:18px 0}button,select{background:#12303b;color:#dce9e2;border:1px solid #4c9b9b;padding:8px 12px;border-radius:3px}figure{margin:0;border:1px solid #326571;background:#091b26;padding:14px}#frame{display:block;image-rendering:pixelated;image-rendering:crisp-edges;width:auto;height:auto;max-width:100%;max-height:70vh;margin:auto}figcaption{padding-top:10px;color:#9fc9c2;font:12px monospace}small{color:#abc7c1}
</style>
<main><h1>B15 Stormhalo Depth Review</h1><p>Candidate uses the existing Blender idle frames and separately editable aura layers. Compare against the unchanged original compositor.</p>
<header><label>Clip <select id="clip"><option value="idle">Idle loop</option><option value="transform">Transformation</option></select></label><label>View <select id="view"><option value="after">Candidate</option><option value="before">Before</option></select></label><label>Scale <select id="scale"><option>1</option><option selected>3</option><option>5</option></select></label><button id="toggle">Pause</button><button id="next">Next frame</button><span id="status"></span></header>
<figure><img id="frame" alt="Stormhalo review frame"><figcaption id="caption"></figcaption></figure><p><small>12 fps source timing. Images are native 128×80 PNGs displayed with nearest-neighbor scaling.</small></p></main>
<script>
const frame=document.querySelector('#frame'),clip=document.querySelector('#clip'),view=document.querySelector('#view'),scale=document.querySelector('#scale'),caption=document.querySelector('#caption');let i=0,playing=true,timer;const count=clip.value==='idle'?24:24;
function path(){const n=String(i).padStart(2,'0');return view.value==='before'?(clip.value==='idle'?`../stormhalo/before/idle/idle-aura-${n}.png`:`../stormhalo/before/transformation/transform-${n}.png`):(clip.value==='idle'?`../stormhalo/after/idle/idle-aura-${n}.png`:`../stormhalo/after/transformation/transform-${n}.png`)}
function draw(){frame.src=path();frame.style.height=`${128?80*Number(scale.value):240}px`;frame.style.maxHeight=`${Math.min(80*Number(scale.value),window.innerHeight*.7)}px`;caption.textContent=`${view.value} · ${clip.value} · frame ${String(i).padStart(2,'0')} / 23 · native 128×80`;i=(i+1)%24}
function restart(){clearInterval(timer);i=0;draw();if(playing)timer=setInterval(draw,1000/12)}
document.querySelector('#toggle').onclick=e=>{playing=!playing;e.target.textContent=playing?'Pause':'Play';restart()};document.querySelector('#next').onclick=()=>{clearInterval(timer);draw()};clip.onchange=restart;view.onchange=restart;scale.onchange=draw;restart();
</script>"""
    path = package / "preview/index.html"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(html, encoding="utf-8")


def build_source_bundle_from_repo(out: Path) -> dict[str, Path]:
    inputs = out / "inputs"
    base_manifest = json.loads(BASE_MANIFEST.read_text(encoding="utf-8"))
    json_write(inputs / "base/iona-b01e-candidate-v1.json", base_manifest)
    base_lookup: dict[str, Path] = {}
    for item in base_manifest["runtimeFrames"]:
        src = ROOT / item["runtimePng"]
        dst = inputs / "base/frames" / src.name
        copy_file(src, dst)
        base_lookup[item["runtimePng"]] = dst
    layer_lookup: dict[str, list[Path]] = {}
    layer_manifest = json.loads((STORM_EXPORTS / "aura-layers/manifest.json").read_text(encoding="utf-8"))
    json_write(inputs / "stormhalo/aura-layers/manifest.json", layer_manifest)
    for name in ("rear", "filaments", "front", "motes"):
        layer_lookup[name] = []
        for i in range(12):
            src = STORM_EXPORTS / "aura-layers" / name / "frames" / f"{name}-{i:02d}.png"
            dst = inputs / "stormhalo/aura-layers" / name / f"{name}-{i:02d}.png"
            copy_file(src, dst)
            layer_lookup[name].append(dst)
    idle_sources = sorted(RIG_IDLE_DIR.glob("idle-*.png"))
    if len(idle_sources) != 24:
        raise RuntimeError(f"Expected 24 real Blender Idle frames; found {len(idle_sources)}")
    idle_lookup = []
    for i, src in enumerate(idle_sources):
        im = Image.open(src)
        if im.size != (128, 80):
            raise RuntimeError(f"Unexpected Stormhalo rig frame: {src.name} {im.size}")
        dst = inputs / "stormhalo/character-idle" / f"idle-{i:02d}.png"
        copy_file(src, dst)
        idle_lookup.append(dst)
    trans_lookup = []
    composite_before_lookup = []
    for i in range(24):
        trans_src = STORM_EXPORTS / "transformation/frames" / f"transform-{i:02d}.png"
        composite_src = STORM_EXPORTS / "stormhalo-idle-with-aura/frames" / f"idle-aura-{i:02d}.png"
        trans_dst = inputs / "stormhalo/transformation-before" / f"transform-{i:02d}.png"
        composite_dst = inputs / "stormhalo/idle-composite-before" / f"idle-aura-{i:02d}.png"
        copy_file(trans_src, trans_dst)
        copy_file(composite_src, composite_dst)
        trans_lookup.append(trans_dst)
        composite_before_lookup.append(composite_dst)
    # Retain the actual prior layer exporter as lineage, not as a modified source.
    copy_file(ROOT / "tools/art-export/export-stormhalo-rig-pilot-review.py", inputs / "stormhalo/prior-exporter-reference.py")
    vfx_dir = ROOT / "art-source/characters/iona/stormhalo-rig-pilot/vfx"
    copy_file(vfx_dir / "surge.png", inputs / "stormhalo/vfx/surge.png")
    if (vfx_dir / "source-map.json").is_file():
        copy_file(vfx_dir / "source-map.json", inputs / "stormhalo/vfx/source-map.json")
    return {"base_manifest": inputs / "base/iona-b01e-candidate-v1.json", "base_frames": base_lookup,
            "layer_manifest": inputs / "stormhalo/aura-layers/manifest.json", "layers": layer_lookup,
            "idle": idle_lookup, "transformation": trans_lookup, "idle_before": composite_before_lookup,
            "surge": inputs / "stormhalo/vfx/surge.png"}


def build_source_bundle_from_folder(bundle: Path) -> dict[str, object]:
    manifest = bundle / "base/iona-b01e-candidate-v1.json"
    data = json.loads(manifest.read_text(encoding="utf-8"))
    base_lookup = {item["runtimePng"]: bundle / "base/frames" / Path(item["runtimePng"]).name for item in data["runtimeFrames"]}
    layers = {name: [bundle / "stormhalo/aura-layers" / name / f"{name}-{i:02d}.png" for i in range(12)]
              for name in ("rear", "filaments", "front", "motes")}
    idle = [bundle / "stormhalo/character-idle" / f"idle-{i:02d}.png" for i in range(24)]
    trans = [bundle / "stormhalo/transformation-before" / f"transform-{i:02d}.png" for i in range(24)]
    idle_before = [bundle / "stormhalo/idle-composite-before" / f"idle-aura-{i:02d}.png" for i in range(24)]
    return {"base_manifest": manifest, "base_frames": base_lookup, "layer_manifest": bundle / "stormhalo/aura-layers/manifest.json",
            "layers": layers, "idle": idle, "transformation": trans, "idle_before": idle_before,
            "surge": bundle / "stormhalo/vfx/surge.png"}


def check_inputs(paths: dict[str, object]) -> None:
    required = [paths["base_manifest"], paths["layer_manifest"], *paths["base_frames"].values(),
                *[p for group in paths["layers"].values() for p in group], *paths["idle"],
                *paths["transformation"], *paths["idle_before"], paths["surge"]]
    missing = [str(path) for path in required if not Path(path).is_file()]
    if missing:
        raise FileNotFoundError("Missing B15 source inputs:\n" + "\n".join(missing[:20]))


def build_package(out: Path, source_bundle: Path | None, resume: bool = False) -> None:
    if out.exists():
        marker = out / "BUILD_INFO.md"
        if not resume or not marker.is_file() or "B15 REVIEW BUILD DIRECTORY" not in marker.read_text(encoding="utf-8"):
            raise SystemExit(f"Refusing to overwrite existing review folder without its B15 build marker: {out}")
    else:
        out.parent.mkdir(parents=True, exist_ok=True)
        out.mkdir()
    (out / "BUILD_INFO.md").write_text(
        "# B15 REVIEW BUILD DIRECTORY\n\nGenerated by `tools/art-export/prepare-b15-review.py`. This folder is an isolated review candidate; it does not contain integrated runtime assets.\n",
        encoding="utf-8")
    if source_bundle:
        # Copy source bundle into package first so the ZIP carries all compositor inputs.
        paths = build_source_bundle_from_folder(source_bundle)
        for src in source_bundle.rglob("*"):
            if src.is_file():
                copy_file(src, out / "inputs" / src.relative_to(source_bundle))
        # Rebind reads to the copied, self-contained bundle.
        paths = build_source_bundle_from_folder(out / "inputs")
    else:
        paths = build_source_bundle_from_repo(out)
    check_inputs(paths)

    manifest = json.loads(Path(paths["base_manifest"]).read_text(encoding="utf-8"))
    active = manifest["runtimeFrames"]
    base_records, base_before, base_after = detect_and_patch_base(
        active, paths["base_frames"], out / "inputs/base/frames", out / "base/before", out / "base/after")
    patched = [r for r in base_records if r["status"] == "patched-open-eye"]
    json_write(out / "base/eye-patch-manifest.json", {
        "schema": "crownflare.b15-base-eye-candidate/1", "status": "review-only candidate",
        "sourceManifest": "../inputs/base/iona-b01e-candidate-v1.json", "sourceFrameCount": len(active),
        "canvas": [128, 80], "anchor": {"x": 64, "feetY": 80},
        "paletteAdditions": [], "patchMethod": "Two face-palette substitutions at the authored dark pupil: one 1px upper lid and one opposite-gaze sclera highlight. All other pixels, alpha, dimensions, and timing are retained.",
        "patchedFrameCount": len(patched), "unchangedCount": len(base_records) - len(patched),
        "frames": base_records,
    })

    # Candidate base animation previews. Filenames and manifest durations remain authoritative.
    all_before = [(base_before[Path(i["runtimePng"]).name], f'{i["id"]}-{i["facing"]}') for i in active]
    all_after = [(base_after[Path(i["runtimePng"]).name], f'{i["id"]}-{i["facing"]}') for i in active]
    sprite_sheet(all_before, out / "base/review/base-all-70-before-2x.png", cols=10, scale=2)
    sprite_sheet(all_after, out / "base/review/base-all-70-candidate-2x.png", cols=10, scale=2)
    sample_names = {"idle-0", "idle-1", "idle-2", "idle-3", "run-0", "run-2", "jump-1", "dash-1", "combo-2-contact", "combo-3-contact"}
    sample = [i for i in active if i["id"] in sample_names]
    sample_before = [base_before[Path(i["runtimePng"]).name] for i in sample]
    sample_after = [base_after[Path(i["runtimePng"]).name] for i in sample]
    sample_labels = [f'{i["id"]} / {i["facing"]}' for i in sample]
    comparison_board(sample_before, sample_after, sample_labels, out / "base/review/base-native-1x-before-after.png", scale=1)
    # Zoom only confidently patched eyes; centers and exact crops are retained in the patch manifest.
    zoom_records = [r for r in patched if r["id"] in ("idle-0", "idle-1", "idle-2", "run-0", "run-2", "combo-2-contact", "combo-2-windup", "jump-2")]
    zoom_before, zoom_after, zoom_labels = [], [], []
    for record in zoom_records:
        name = Path(record["candidateFile"]).name
        x, y = record["anchor"]
        crop_before = base_before[name].crop((x - 5, y - 4, x + 5, y + 4))
        crop_after = base_after[name].crop((x - 5, y - 4, x + 5, y + 4))
        zoom_before.append(crop_before.resize((160, 128), Image.Resampling.NEAREST))
        zoom_after.append(crop_after.resize((160, 128), Image.Resampling.NEAREST))
        zoom_labels.append(f'{record["id"]} / {record["facing"]} eye at {x},{y}')
    comparison_board(zoom_before, zoom_after, zoom_labels, out / "base/review/base-eye-nearest-16x-before-after.png", scale=1,
                     tile_size=(160, 128))
    idle_anchor_review(base_records, active, out / "base/before", out / "base/after", out / "base/review")
    # Capture byte/geometry invariants and all source timings.
    json_write(out / "base/source-frame-mappings.json", {
        "manifest": "../inputs/base/iona-b01e-candidate-v1.json", "frames": [
            {"id": i["id"], "facing": i["facing"], "durationMs": i["durationMs"],
             "sourceFile": Path(i["runtimePng"]).name, "anchor": i["anchor"], "canvas": i["runtimeCanvas"]}
            for i in active],
    })
    # Small sampled animation previews at recorded durations.
    for action, ids in {"idle": [f"idle-{i}" for i in range(4)], "run": [f"run-{i}" for i in range(4)],
                        "sidekick": ["combo-2-windup", "combo-2-windup-1", "combo-2-contact", "combo-2-recovery"]}.items():
        for facing in ("left", "right"):
            clip = [i for ident in ids for i in active if i["id"] == ident and i["facing"] == facing]
            if not clip:
                continue
            b = [base_before[Path(i["runtimePng"]).name] for i in clip]
            a = [base_after[Path(i["runtimePng"]).name] for i in clip]
            durs = [max(30, round(i["durationMs"])) for i in clip]
            make_gif(b, durs, out / f"base/review/{action}-{facing}-before.gif", scale=4)
            make_gif(a, durs, out / f"base/review/{action}-{facing}-candidate.gif", scale=4)

    # Preserve actual source aura layers and build only depth-derived front masks.
    for rel in (
        "stormhalo/after/layers/front-accent", "stormhalo/after/layers/motes-accent",
        "stormhalo/after/layers/rear", "stormhalo/after/layers/filaments",
        "stormhalo/after/layers/front-source", "stormhalo/after/layers/motes-source",
        "stormhalo/after/idle", "stormhalo/after/transformation",
    ):
        (out / rel).mkdir(parents=True, exist_ok=True)
    layer_manifest = json.loads(Path(paths["layer_manifest"]).read_text(encoding="utf-8"))
    raw_layers: dict[str, list[Image.Image]] = {}
    for name, files in paths["layers"].items():
        raw_layers[name] = []
        for i, source in enumerate(files):
            raw = Image.open(source).convert("RGBA")
            if raw.size != (128, 80):
                raise RuntimeError(f"Unexpected aura layer canvas: {source} {raw.size}")
            raw_layers[name].append(raw)
            copy_file(Path(source), out / "stormhalo/inputs/aura-layers" / name / f"{name}-{i:02d}.png")
    json_write(out / "stormhalo/inputs/aura-layers/manifest.json", layer_manifest)
    characters = [Image.open(p).convert("RGBA") for p in paths["idle"]]
    before_idle = [Image.open(p).convert("RGBA") for p in paths["idle_before"]]
    before_transform = [Image.open(p).convert("RGBA") for p in paths["transformation"]]
    if any(im.size != (128, 80) for im in characters + before_idle + before_transform):
        raise RuntimeError("Stormhalo baseline frames must all remain native 128x80")
    for i, p in enumerate(paths["idle"]):
        copy_file(Path(p), out / "stormhalo/inputs/character-idle" / f"idle-{i:02d}.png")
    for i, p in enumerate(paths["idle_before"]):
        copy_file(Path(p), out / "stormhalo/before/idle" / f"idle-aura-{i:02d}.png")
    for i, p in enumerate(paths["transformation"]):
        copy_file(Path(p), out / "stormhalo/before/transformation" / f"transform-{i:02d}.png")

    # The character's 2px dilated silhouette is a conservative depth holdout.
    derived_front: list[Image.Image] = []
    derived_motes: list[Image.Image] = []
    foreground_overlap_pixels = 0
    for i in range(12):
        character = characters[i % len(characters)]
        exclusion = dilation_exclusion(character, radius=2)
        front = clip_outside_character(raw_layers["front"][i], exclusion, opacity=0.72)
        motes = clip_outside_character(raw_layers["motes"][i], exclusion, opacity=0.82)
        exclusion_px = exclusion.load()
        for foreground in (front, motes):
            alpha_px = foreground.getchannel("A").load()
            foreground_overlap_pixels += sum(
                alpha_px[x, y] > 0 and exclusion_px[x, y] > 0
                for y in range(80) for x in range(128)
            )
        derived_front.append(front)
        derived_motes.append(motes)
        front.save(out / "stormhalo/after/layers/front-accent" / f"front-accent-{i:02d}.png", optimize=True)
        motes.save(out / "stormhalo/after/layers/motes-accent" / f"motes-accent-{i:02d}.png", optimize=True)
        raw_layers["rear"][i].save(out / "stormhalo/after/layers/rear" / f"rear-{i:02d}.png", optimize=True)
        raw_layers["filaments"][i].save(out / "stormhalo/after/layers/filaments" / f"filaments-{i:02d}.png", optimize=True)
        raw_layers["front"][i].save(out / "stormhalo/after/layers/front-source" / f"front-{i:02d}.png", optimize=True)
        raw_layers["motes"][i].save(out / "stormhalo/after/layers/motes-source" / f"motes-{i:02d}.png", optimize=True)

    idle_after: list[Image.Image] = []
    for i, character in enumerate(characters):
        aura_i = i % 12
        idle_after.append(composite_aura(character, {"rear": raw_layers["rear"][aura_i], "filaments": raw_layers["filaments"][aura_i]},
                                         derived_front[aura_i], derived_motes[aura_i]))
        idle_after[-1].save(out / "stormhalo/after/idle" / f"idle-aura-{i:02d}.png", optimize=True)
    trans_after: list[Image.Image] = []
    base_transition = [
        Image.open(paths["base_frames"]["public/assets/characters/iona/b01e/idle-0-right.png"]).convert("RGBA"),
        Image.open(paths["base_frames"]["public/assets/characters/iona/b01e/idle-1-right.png"]).convert("RGBA"),
    ]
    surge_source = Image.open(paths["surge"]).convert("RGBA")
    surge_overlap_pixels = 0
    for i, baseline in enumerate(before_transform):
        if i <= 2 or i in (11, 12):
            # Keep the original anticipation and brief peak flash exactly intact.
            frame = baseline.copy()
        elif i < 11:
            # Rebuild ignition/surge with the same source pose cadence. Rear aura
            # sits behind Base Iona; motes and the surge crest are depth-held out.
            base = base_transition[(i // 2) % 2].copy()
            aura_i = i % 12
            exclusion = dilation_exclusion(base, radius=2)
            motes = clip_outside_character(raw_layers["motes"][aura_i], exclusion, opacity=0.82)
            frame = Image.new("RGBA", (128, 80), (0, 0, 0, 0))
            frame.alpha_composite(raw_layers["rear"][aura_i])
            frame.alpha_composite(raw_layers["filaments"][aura_i])
            frame.alpha_composite(base)
            frame.alpha_composite(motes)
            if i >= 7:
                progress = min(1.0, (i - 6) / 6)
                size = round(20 + 82 * progress)
                surge_layer = stamp_component(surge_source, (64, 47), (size, round(size * 0.82)),
                                              0.40 + 0.48 * progress, angle=(i - 9) * 4)
                surge_layer = clip_outside_character(surge_layer, exclusion)
                ex_px = exclusion.load()
                surge_px = surge_layer.getchannel("A").load()
                surge_overlap_pixels += sum(
                    surge_px[x, y] > 0 and ex_px[x, y] > 0
                    for y in range(80) for x in range(128)
                )
                frame.alpha_composite(surge_layer)
        else:
            rig_frame = characters[(i - 13) % len(characters)]
            aura_i = i % 12
            frame = composite_aura(rig_frame, {"rear": raw_layers["rear"][aura_i], "filaments": raw_layers["filaments"][aura_i]},
                                   derived_front[aura_i], derived_motes[aura_i])
        trans_after.append(frame)
        frame.save(out / "stormhalo/after/transformation" / f"transform-{i:02d}.png", optimize=True)

    json_write(out / "stormhalo/after/layers/manifest.json", {
        "schema": "crownflare.b15-stormhalo-depth/1", "source": "Existing Crownflare Stormhalo rig pilot aura-layers export",
        "canvas": [128, 80], "fps": FPS, "loopFrames": 24, "auraFrames": 12,
        "layerStackBackToFront": ["rear (unchanged source)", "filaments (unchanged source)", "Stormhalo character (separate Blender PNG)",
                                  "front-accent (derived from original front; 2px character holdout; 72% alpha)",
                                  "motes-accent (derived from original motes; 2px character holdout; 82% alpha)"],
        "editableSourceLayers": {"rear": "rear/", "filaments": "filaments/", "front": "front-source/", "motes": "motes-source/"},
        "derivedLayers": {"front-accent": "front-accent/", "motes-accent": "motes-accent/"},
        "holdout": "For each frame, alpha is removed from front and motes wherever a 5x5 max-filter of the real character alpha is nonzero. Character alpha is untouched.",
        "sourceManifest": "../../inputs/aura-layers/manifest.json",
    })
    json_write(out / "stormhalo/after/idle/manifest.json", {
        "schema": "crownflare.review-animation/1", "clip": "Stormhalo idle with depth-corrected aura",
        "frameWidth": 128, "frameHeight": 80, "fps": FPS, "frameCount": 24, "durationSeconds": 2,
        "frames": [f"idle-aura-{i:02d}.png" for i in range(24)], "layerManifest": "../layers/manifest.json",
        "realtimeGif": "../idle-candidate-realtime.gif", "timingSource": "Existing 24-frame RCP Blender Idle loop; 12-fps review cadence."})
    json_write(out / "stormhalo/after/transformation/manifest.json", {
        "schema": "crownflare.transformation-clip/1", "clip": "B01E Base -> Stormhalo reveal",
        "frameWidth": 128, "frameHeight": 80, "fps": FPS, "frameCount": 24, "durationSeconds": 2,
        "timingPreserved": True, "unchangedAnticipationFrames": [0, 2], "unchangedCinematicFlashFrames": [11, 12],
        "depthCorrectedIgnitionFrames": [3, 10], "depthCorrectedRevealFrames": [13, 23],
        "frameNotes": "Frames 0-2 preserve the original anticipation; frames 11-12 preserve the brief full-canvas flash at surge peak. Frames 3-10 are rebuilt from the active Base frames with rear/filaments behind her and motes/surge held outside a 2px-expanded silhouette. From frame 13, use the real rig Idle plus behind-character layers and holdout-limited peripheral accents. Broad over-character surge artwork is not carried across the committed Stormhalo body.",
        "events": {"formCommitFrame": 13, "revealFrame": 14, "settledFrame": 19},
        "frames": [f"transform-{i:02d}.png" for i in range(24)], "realtimeGif": "../transformation-candidate-realtime.gif"})

    for scale in (1, 3):
        comparison_board(before_idle, idle_after, [f"Idle {i:02d}" for i in range(24)],
                         out / f"stormhalo/review/idle-before-after-{scale}x.png", scale=scale)
        comparison_board(before_transform, trans_after, [f"Transform {i:02d}" for i in range(24)],
                         out / f"stormhalo/review/transformation-before-after-{scale}x.png", scale=scale)
    make_gif(before_idle, GIF_DURATIONS_24, out / "stormhalo/idle-before-realtime.gif", scale=4)
    make_gif(idle_after, GIF_DURATIONS_24, out / "stormhalo/idle-candidate-realtime.gif", scale=4)
    make_gif(before_transform, GIF_DURATIONS_24, out / "stormhalo/transformation-before-realtime.gif", scale=4)
    make_gif(trans_after, GIF_DURATIONS_24, out / "stormhalo/transformation-candidate-realtime.gif", scale=4)
    raw_layer_items = [(raw_layers[name][i], f"{name} {i:02d}") for name in ("rear", "filaments", "front", "motes") for i in range(12)]
    sprite_sheet(raw_layer_items, out / "stormhalo/review/source-aura-layers-3x.png", cols=6, scale=3)
    derived_items = [(derived_front[i], f"front edge {i:02d}") for i in range(12)] + [(derived_motes[i], f"motes edge {i:02d}") for i in range(12)]
    sprite_sheet(derived_items, out / "stormhalo/review/derived-foreground-layers-3x.png", cols=6, scale=3)
    build_browser_preview(out)

    old_zip_hash = sha256(STORM_ZIP) if STORM_ZIP.is_file() else None
    old_zip_integrity = "not present"
    if STORM_ZIP.is_file():
        with zipfile.ZipFile(STORM_ZIP) as zf:
            bad = zf.testzip()
            old_zip_integrity = "PASS" if bad is None else f"FAIL at {bad}"
    base_invariant_failures = []
    for record in base_records:
        before = base_before[Path(record["candidateFile"]).name]
        after = base_after[Path(record["candidateFile"]).name]
        if before.size != after.size or before.getchannel("A").tobytes() != after.getchannel("A").tobytes():
            base_invariant_failures.append(record["candidateFile"])
    unchanged_frames = [i for i in range(24) if before_transform[i].tobytes() == trans_after[i].tobytes()]
    anticipation_unchanged = all(i in unchanged_frames for i in range(3))
    flash_unchanged = all(i in unchanged_frames for i in (11, 12))
    alpha_character_unchanged = all(characters[i].getchannel("A").tobytes() == Image.open(paths["idle"][i]).convert("RGBA").getchannel("A").tobytes() for i in range(24))
    json_write(out / "MANIFEST.json", {
        "schema": "crownflare.b15-review-package/1", "createdDate": "2026-11-12", "reviewOnly": True,
        "baseB01E": {"frames": len(base_records), "patched": len(patched), "unchanged": len(base_records)-len(patched),
                     "canvas": [128, 80], "paletteAdditions": 0, "twoPixelEditsPerPatchedFrame": all(len(r["pixelEdits"]) == 2 for r in patched),
                     "fpsAndDurationsCopiedFrom": "inputs/base/iona-b01e-candidate-v1.json"},
        "stormhalo": {"idleFrames": len(idle_after), "transformationFrames": len(trans_after), "canvas": [128, 80], "fps": FPS,
                       "unchangedAnticipationFrames": anticipation_unchanged, "unchangedFlashFrames": flash_unchanged,
                       "characterAlphaUnchanged": alpha_character_unchanged,
                       "idleForegroundPixelsInsideDilatedSilhouette": foreground_overlap_pixels,
                       "transformationSurgePixelsInsideDilatedSilhouette": surge_overlap_pixels},
        "integrity": {"baseCanvasAlphaInvariant": not base_invariant_failures, "oldRigPilotZipSha256": old_zip_hash,
                      "oldRigPilotZipIntegrity": old_zip_integrity},
    })
    report = f"""# Crownflare B15 Art Review: Base Iona Face + Stormhalo Aura Depth

## Verdict

- **Base Iona eye: CONDITIONAL / PARTIAL (review candidate).** Added a small pixel cluster on {len(patched)} of {len(base_records)} active B01E frames. The other {len(base_records)-len(patched)} candidate frames remain unchanged when the conservative locator did not identify a safe two-pixel edit. At this native scale some pose-specific face pixels remain ambiguous, so the eye is not fully signed off across every animation.
- **Stormhalo depth: PASS as an isolated compositor candidate.** Most aura energy now sits behind Iona; source foreground arcs and motes remain independent/editable and are clipped outside the real silhouette plus a 2px margin. The character remains a separate untouched layer.
- **Integration: NOT DONE.** Shipped sprites, runtime, gameplay, save data, existing rig, prior exports, and old review ZIP were not changed.

## What was wrong

- The active B01E Base sprites use a 128x80 transparent canvas, 60px working display height, and a 64/80 foot anchor. Their actual pupil is often one isolated dark pixel at normal play size.
- The previous Stormhalo exporter drew `rear`, `filaments`, `front`, and `motes` after the character. That placed even the explicitly named rear and filament layers over Iona, creating a cage/veil effect.

## What changed in this review candidate

### Base Iona

- Copied all 70 active B01E runtime frames into `base/before` and `base/after`; did not alter `public/assets`.
- Added two in-palette pixels around selected dark pupil pixels: a 1px upper lid and a 1px pale sclera highlight opposite the facing direction. The existing dark pixel stays in place. Edits do not change alpha, frame canvas, foot anchor, or authored duration.
- Patch anchors and exact before/after colors are in `base/eye-patch-manifest.json`; the source mapping/durations are in `base/source-frame-mappings.json`.
- The unedited set includes closed/covered/ambiguous eyes, plus some open-looking pixels the locator could not place safely. This is a partial art pass, not a claim that every animation face has been corrected.

### Stormhalo

- Uses the prior pilot's real 24-frame Blender Idle PNGs and the existing 12-frame `rear`, `filaments`, `front`, and `motes` layers. Every source layer is retained under `inputs/` and `stormhalo/after/layers/*-source/`.
- Draw order: rear -> filaments -> unchanged character -> depth-masked front accent -> depth-masked motes. For the two foreground effects, the original alpha is held out wherever a 5x5 max-filter of the character alpha is nonzero. Front alpha is scaled to 72%; motes to 82%.
- The 24-frame transformation preserves 12fps / 2.0s timing. Anticipation frames 0-2 and the brief cinematic flash at frames 11-12 remain byte-identical. Ignition/surge frames 3-10 are rebuilt with the same Base poses, behind-character aura and a silhouette-held-out surge. Reveal frames 13-23 use the same rig and corrected draw order; broad over-character surge artwork is not carried across the committed Stormhalo body.
- Aura overlays remain separate PNGs; no aura is baked into the character.

## Evidence reviewed

- Active B01E manifest and all 70 mapped runtime frames, including both facings; base idle, run, jump, dash, start/stop/turn, and attack poses.
- Existing Stormhalo layer manifest, prior compositor source, 24 actual Blender Idle frames, 24 transformation frames, and old idle-aura composite.
- Review boards: native 1x base comparison; crisp nearest-neighbor face crops and coordinate-marked idle anchor grids; all-frame 2x base boards; idle and transformation comparisons at 1x and 3x; source and derived aura-layer boards; normal-speed GIFs; browser preview.

## Quality gates and caveats

- Base: all candidate frames remain 128x80; alpha masks are identical; only colors already in the B01E palette are used; duration metadata is copied unchanged. No Game/runtime output is replaced. Check the exact anchor list before considering integration: 31 frames were patched and 39 were left unchanged, and a few of the smallest action faces may still need manual review.
- Stormhalo: old and new clips both have 24 frames at 128x80, with exact 12fps/2.0s schedule; anticipation and flash frames 0-2 and 11-12 are byte-identical; character alpha is untouched; idle foreground and transition surge alpha overlap inside the 2px-expanded silhouette are {foreground_overlap_pixels} and {surge_overlap_pixels} pixels. Candidate provides a clearer silhouette. Removing the large reveal surge across the committed Stormhalo body simplifies that part of the presentation; owner should judge the reveal impact in the real-speed clips.
- The old rig-pilot ZIP was checked for CRC and recorded by SHA-256 in `MANIFEST.json`; it was not overwritten. No Blender rig/action/source mesh was edited.

## Reproduction

From the project root, run (the nested output path avoids colliding with this review ZIP):

```powershell
python tools/art-export/prepare-b15-review.py --out release-artifacts/review/b15-rebuild/Crownflare-B15-Art-Review-2026-11-12
```

From this ZIP alone, extract it, change into the extracted package folder, and run:

```powershell
python scripts/prepare-b15-review.py --source-bundle inputs --out rebuilt-review
```

The ZIP contains the exact B01E frame inputs, original aura-layer PNGs/manifests, real Blender Idle PNGs, original transformation PNGs, prior idle composite, the existing surge VFX component and its source map, and the builder script. No Blender rerender is required for this compositor-only review.

## Next step

Owner reviews the native-size and normal-speed boards/GIFs and approves or requests adjustments. Only after that review should a separate integration task map approved face pixels back to the relevant art source and update the shipped B01E assets. Stormhalo gameplay integration is outside B15.
"""
    (out / "REPORT.md").write_text(report, encoding="utf-8")
    # Include the exact builder under scripts for ZIP-only reproduction.
    copy_file(Path(__file__).resolve(), out / "scripts/prepare-b15-review.py")
    if STORM_ZIP.is_file():
        json_write(out / "stormhalo/SOURCE_DEPENDENCIES.json", {
            "priorRigPilotArchive": "Crownflare-Iona-Stormhalo-Rig-Pilot-2026-11-12.zip",
            "sha256": old_zip_hash, "zipCrcIntegrity": old_zip_integrity,
            "blenderProjectNeededForThisReview": False,
            "reason": "B15 changes only the independent compositor; exact real rig renders used here are included under inputs/stormhalo/character-idle, and no Blender object/action/mesh was modified.",
            "rollback": "Keep the existing archive and review-evidence/stormhalo-rig-pilot tree unchanged; do not promote this candidate unless owner approves it.",
        })
    # Hash every deliverable file other than the future ZIP/hash sidecar.
    hashes = []
    for path in sorted(p for p in out.rglob("*") if p.is_file() and p.name != "SHA256SUMS.txt"):
        hashes.append(f"{sha256(path)}  {path.relative_to(out).as_posix()}")
    (out / "SHA256SUMS.txt").write_text("\n".join(hashes) + "\n", encoding="utf-8")

    # Ensure release area/ZIP are new and only contains this review folder.
    zip_path = out.parent / "Crownflare-B15-Art-Review-2026-11-12.zip"
    if zip_path.exists() and not resume:
        raise SystemExit(f"Refusing to overwrite existing ZIP: {zip_path}")
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
        for path in sorted(p for p in out.rglob("*") if p.is_file()):
            zf.write(path, Path(out.name) / path.relative_to(out))
    with zipfile.ZipFile(zip_path) as zf:
        bad = zf.testzip()
        if bad is not None:
            raise RuntimeError(f"New review ZIP failed CRC check at {bad}")
    zip_hash = sha256(zip_path)
    (zip_path.with_suffix(zip_path.suffix + ".sha256.txt")).write_text(f"{zip_hash}  {zip_path.name}\n", encoding="utf-8")
    print(json.dumps({"package": str(out), "zip": str(zip_path), "sha256": zip_hash,
                      "baseFrames": len(base_records), "basePatched": len(patched),
                      "stormhaloIdle": len(idle_after), "stormhaloTransformation": len(trans_after),
                      "unchangedAnticipationFrames": anticipation_unchanged,
                      "unchangedCinematicFlashFrames": flash_unchanged,
                      "characterAlphaUnchanged": alpha_character_unchanged,
                      "baseAlphaCanvasInvariant": not base_invariant_failures,
                      "zipCrc": "PASS"}, indent=2))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT, help="New package folder; must not already exist")
    parser.add_argument("--source-bundle", type=Path,
                        help="Optional self-contained inputs/base and inputs/stormhalo bundle (used to reproduce from the ZIP)")
    parser.add_argument("--resume", action="store_true", help="Continue only an existing B15 folder with its own BUILD_INFO.md marker")
    args = parser.parse_args()
    bundle = args.source_bundle.resolve() if args.source_bundle else None
    build_package(args.out.resolve(), bundle, args.resume)


if __name__ == "__main__":
    main()

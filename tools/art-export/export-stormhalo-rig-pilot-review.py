#!/usr/bin/env python3
"""Export transparent Stormhalo pilot clips, layered aura, and review boards."""
from __future__ import annotations

import json
import math
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / "art-source/characters/iona/stormhalo-rig-pilot"
EVIDENCE = ROOT / "review-evidence/stormhalo-rig-pilot"
RIG = EVIDENCE / "rig/blender-build-complete"
OUT = EVIDENCE / "animation/exports-crown-final-v2"
VFX_SOURCE = ART / "generation/iona-stormhalo-aura-vfx-imagegen-01.png"
BASE = ROOT / "public/assets/characters/iona/b01e"
DAWNRUSH = ROOT / "public/assets/characters/iona/b05"
FPS = 12
COUNT = 12

VFX_CUTS = {
    "orbit": (565, 85, 797, 419),
    "upper_arc": (73, 89, 411, 318),
    "lower_arc": (127, 297, 485, 434),
    "filament_teal": (912, 36, 972, 454),
    "filament_copper": (1015, 101, 1040, 413),
    "filament_teal_small": (1179, 105, 1203, 323),
    "surge": (45, 655, 690, 1194),
}
MOTE_CUTS = [
    (89, 476, 202, 575), (300, 468, 348, 517), (445, 489, 505, 550),
    (719, 493, 763, 538), (917, 493, 992, 548), (238, 549, 277, 590),
    (374, 563, 412, 603), (573, 547, 613, 586), (786, 553, 853, 607),
]


def clean_alpha(image: Image.Image, threshold: int = 64) -> Image.Image:
    image = image.convert("RGBA")
    a = image.getchannel("A").point(lambda v: 255 if v >= threshold else 0)
    image.putalpha(a)
    return image


def fit_nearest(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    return image.resize(size, Image.Resampling.NEAREST)


def fade(image: Image.Image, opacity: float) -> Image.Image:
    image = image.convert("RGBA")
    a = image.getchannel("A").point(lambda v: max(0, min(255, round(v * opacity))))
    image.putalpha(a)
    return image


def stamp(canvas: Image.Image, image: Image.Image, center: tuple[float, float],
          size: tuple[int, int], opacity: float = 1.0, angle: float = 0.0) -> None:
    tile = fit_nearest(image, size)
    if angle:
        tile = tile.rotate(angle, resample=Image.Resampling.NEAREST, expand=True)
    tile = fade(tile, opacity)
    x = round(center[0] - tile.width / 2)
    y = round(center[1] - tile.height / 2)
    canvas.alpha_composite(tile, (x, y))


def sheet(images: list[Image.Image], labels: list[str], path: Path, cols: int,
          scale: int = 2, tile_w: int = 272, tile_h: int = 176) -> None:
    gap, label_h = 8, 16
    rows = math.ceil(len(images) / cols)
    canvas = Image.new("RGB", (cols * tile_w + (cols + 1) * gap,
                                rows * (tile_h + label_h) + (rows + 1) * gap), (8, 18, 28))
    d = ImageDraw.Draw(canvas)
    for i, (image, label) in enumerate(zip(images, labels)):
        col, row = i % cols, i // cols
        x = gap + col * (tile_w + gap)
        y = gap + row * (tile_h + label_h + gap)
        d.rectangle((x, y, x + tile_w - 1, y + tile_h - 1), fill=(10, 29, 40), outline=(47, 92, 101))
        scaled = fit_nearest(image, (128 * scale, 80 * scale))
        px = x + (tile_w - scaled.width) // 2
        py = y + (tile_h - scaled.height) // 2
        canvas.paste(scaled, (px, py), scaled)
        d.text((x + 3, y + tile_h + 2), label, fill=(191, 220, 211))
    canvas.save(path)


def export_vfx() -> dict[str, Image.Image]:
    source = Image.open(VFX_SOURCE).convert("RGBA")
    vfx_dir = ART / "vfx"
    vfx_dir.mkdir(parents=True, exist_ok=True)
    pieces: dict[str, Image.Image] = {}
    mapping = {}
    for name, box in VFX_CUTS.items():
        image = clean_alpha(source.crop(box))
        image.save(vfx_dir / f"{name}.png", optimize=True)
        pieces[name] = image
        mapping[name] = {"source": VFX_SOURCE.relative_to(ROOT).as_posix(), "component_box_xyxy": box}
    motes = []
    for i, box in enumerate(MOTE_CUTS, 1):
        image = clean_alpha(source.crop(box))
        image.save(vfx_dir / f"mote-{i:02d}.png", optimize=True)
        motes.append(image)
        mapping[f"mote-{i:02d}"] = {"source": VFX_SOURCE.relative_to(ROOT).as_posix(), "component_box_xyxy": box}
    mapping["note"] = "VFX crops are isolated generated components; low alpha background haze was thresholded for crisp pixel scale."
    (vfx_dir / "source-map.json").write_text(json.dumps(mapping, indent=2) + "\n", encoding="utf-8")
    pieces["motes"] = motes
    return pieces


def make_aura_layers(parts: dict[str, Image.Image]) -> dict[str, list[Image.Image]]:
    layer_frames = {name: [] for name in ("rear", "filaments", "front", "motes")}
    for i in range(COUNT):
        phase = math.tau * i / COUNT

        rear = Image.new("RGBA", (128, 80), (0, 0, 0, 0))
        sx, sy = round(42 + 2 * math.sin(phase)), round(64 + 2 * math.sin(phase + .6))
        stamp(rear, parts["orbit"], (64 + 1.5 * math.sin(phase), 47), (sx, sy), .73 + .15 * math.sin(phase + 1))
        stamp(rear, parts["upper_arc"], (64, 24 + math.sin(phase) * 1.5), (39, 20), .40)
        layer_frames["rear"].append(rear)

        filaments = Image.new("RGBA", (128, 80), (0, 0, 0, 0))
        stamp(filaments, parts["filament_teal"], (47 + 2 * math.sin(phase), 47), (7, 52), .58, math.sin(phase) * 3)
        stamp(filaments, parts["filament_copper"], (82 + 1.5 * math.sin(phase + 1), 45), (4, 43), .56, math.sin(phase + 1) * 2)
        stamp(filaments, parts["filament_teal_small"], (68 + 2 * math.sin(phase + 2), 53), (4, 34), .45, math.sin(phase + 2) * 3)
        layer_frames["filaments"].append(filaments)

        front = Image.new("RGBA", (128, 80), (0, 0, 0, 0))
        stamp(front, parts["lower_arc"], (64, 60 + math.sin(phase + .5)), (39, 15), .47, math.sin(phase) * 3)
        layer_frames["front"].append(front)

        motes = Image.new("RGBA", (128, 80), (0, 0, 0, 0))
        for j, mote in enumerate(parts["motes"][:6]):
            orbit_phase = phase + j * math.tau / 6
            cx = 64 + 21 * math.cos(orbit_phase)
            cy = 48 + 29 * math.sin(orbit_phase)
            size = 3 + (j % 2)
            stamp(motes, mote, (cx, cy), (size, size), .52 + .4 * abs(math.sin(phase + j)))
        layer_frames["motes"].append(motes)
    return layer_frames


def main() -> None:
    if OUT.exists():
        raise SystemExit(f"Refusing to overwrite existing exports: {OUT}")
    idle_dir = RIG / "sprites/native/Idle"
    if not (idle_dir / "idle-01.png").is_file():
        raise SystemExit(f"Missing verified Blender Idle frames: {idle_dir}")
    OUT.mkdir(parents=True)
    for d in ("stormhalo-idle/frames", "stormhalo-idle-with-aura/frames", "aura-layers", "transformation/frames"):
        (OUT / d).mkdir(parents=True, exist_ok=True)

    rig_idle = [Image.open(p).convert("RGBA") for p in sorted(idle_dir.glob("idle-*.png"))]
    if len(rig_idle) != 24 or any(x.size != (128, 80) for x in rig_idle):
        raise SystemExit(f"Expected 24 native 128x80 Blender idle frames; found {len(rig_idle)}")
    pieces = export_vfx()
    aura = make_aura_layers(pieces)

    for i, frame in enumerate(rig_idle):
        frame.save(OUT / "stormhalo-idle/frames" / f"idle-{i:02d}.png", optimize=True)
        combined = frame.copy()
        for name in ("rear", "filaments", "front", "motes"):
            combined.alpha_composite(aura[name][i % COUNT])
        combined.save(OUT / "stormhalo-idle-with-aura/frames" / f"idle-aura-{i:02d}.png", optimize=True)
    # GIF stores delays in 10 ms units. This three-frame pattern averages exactly 12 fps.
    gif_durations = [80, 80, 90] * 8
    for name, frames in (("stormhalo-idle-realtime.gif", rig_idle),
                         ("stormhalo-idle-with-aura-realtime.gif", [Image.open(OUT / "stormhalo-idle-with-aura/frames" / f"idle-aura-{i:02d}.png").convert("RGBA") for i in range(len(rig_idle))])):
        frames[0].save(OUT / name, save_all=True, append_images=frames[1:], duration=gif_durations, loop=0, disposal=2, optimize=False)

    aura_manifest = {"schema": "crownflare.aura-layers/1", "character": "Iona / Stormhalo", "frame_width": 128,
                     "frame_height": 80, "fps": FPS, "loop": True, "frame_count": COUNT,
                     "layer_order": ["rear", "filaments", "character", "front", "motes"], "layers": {}}
    for name, frames in aura.items():
        layer_dir = OUT / "aura-layers" / name / "frames"
        layer_dir.mkdir(parents=True, exist_ok=True)
        for i, image in enumerate(frames):
            image.save(layer_dir / f"{name}-{i:02d}.png", optimize=True)
        aura_manifest["layers"][name] = {"directory": f"aura-layers/{name}/frames", "frames": [f"{name}-{i:02d}.png" for i in range(COUNT)]}
    (OUT / "aura-layers/manifest.json").write_text(json.dumps(aura_manifest, indent=2) + "\n", encoding="utf-8")

    idle_manifest = {"schema": "crownflare.review-animation/1", "character": "Iona / Stormhalo", "frame_width": 128,
                     "frame_height": 80, "fps": FPS, "loop": True, "frame_count": len(rig_idle),
                     "source": "Blender 5.2.3 render of the packed RCP v1.1 armature; alpha/color unchanged.",
                     "realtime_gif": "../stormhalo-idle-realtime.gif", "frames": [f"idle-{i:02d}.png" for i in range(len(rig_idle))],
                     "aura_composite_frames": [f"idle-aura-{i:02d}.png" for i in range(len(rig_idle))]}
    (OUT / "stormhalo-idle/manifest.json").write_text(json.dumps(idle_manifest, indent=2) + "\n", encoding="utf-8")
    (OUT / "stormhalo-idle-with-aura/manifest.json").write_text(json.dumps({**idle_manifest, "realtime_gif": "../stormhalo-idle-with-aura-realtime.gif", "frames": idle_manifest["aura_composite_frames"], "source": "Rig-generated Idle plus independent generated aura layers."}, indent=2) + "\n", encoding="utf-8")

    base_frames = [Image.open(BASE / f"idle-{i}-right.png").convert("RGBA") for i in (0, 1)]
    surge = pieces["surge"]
    trans = []
    phases = []
    for i in range(24):
        if i < 13:
            frame = base_frames[(i // 2) % 2].copy()
            if i >= 3:
                frame.alpha_composite(aura["rear"][i % COUNT])
                frame.alpha_composite(aura["filaments"][i % COUNT])
                frame.alpha_composite(aura["motes"][i % COUNT])
            if i >= 7:
                progress = min(1.0, (i - 6) / 6)
                size = round(20 + 82 * progress)
                stamp(frame, surge, (64, 47), (size, round(size * .82)), .40 + .48 * progress, angle=(i - 9) * 4)
            if i in (11, 12):
                # A short, full-canvas energy flash is a compositor event layered over generated VFX.
                veil = Image.new("RGBA", (128, 80), (180, 242, 224, 205 if i == 11 else 245))
                frame.alpha_composite(veil)
                stamp(frame, surge, (64, 47), (104, 86), .9, angle=10 if i == 11 else -6)
            phases.append("anticipation" if i < 3 else "ignition" if i < 7 else "surge/mask")
        else:
            storm = rig_idle[(i - 13) % len(rig_idle)].copy()
            storm.alpha_composite(aura["rear"][i % COUNT])
            storm.alpha_composite(aura["filaments"][i % COUNT])
            storm.alpha_composite(aura["front"][i % COUNT])
            storm.alpha_composite(aura["motes"][i % COUNT])
            if i < 18:
                size = round(104 - (i - 13) * 14)
                stamp(storm, surge, (64, 47), (size, round(size * .82)), .78 - .13 * (i - 13), angle=(i - 13) * -5)
            phases.append("reveal" if i < 19 else "settle")
            frame = storm
        frame.save(OUT / "transformation/frames" / f"transform-{i:02d}.png", optimize=True)
        trans.append(frame)

    trans_manifest = {"schema": "crownflare.transformation-clip/1", "character": "Iona", "from": "B01E Base runtime idle",
                      "to": "Stormhalo RCP v1.1 Blender-generated Idle", "frame_width": 128, "frame_height": 80,
                      "fps": FPS, "loop": False, "frame_count": len(trans), "duration_s": 2.0,
                      "phases": [{"name": name, "frames": [start, end]} for name, start, end in [
                          ("anticipation", 0, 2), ("ignition", 3, 6), ("silhouette / energy surge / VFX mask", 7, 12),
                          ("Stormhalo reveal", 13, 18), ("settle into idle", 19, 23)]],
                      "events": {"anticipation": 0, "ignition": 3, "surge_peak": 12, "form_commit": 13, "reveal": 14, "settled": 19},
                      "events_note": "Frame indices are 0-based. Base and effect frames are explicitly composited; frames from index 13 onward use the real RCP Blender rig output.",
                      "frame_phase_labels": phases, "frames": [f"transform-{i:02d}.png" for i in range(len(trans))],
                      "realtime_gif": "../transformation-realtime.gif",
                      "compositor_note": "Generated VFX layers provide the conceal/reveal. The two single-frame color veils at the transition peak are simple flash timing, not character art."}
    (OUT / "transformation/manifest.json").write_text(json.dumps(trans_manifest, indent=2) + "\n", encoding="utf-8")
    trans[0].save(OUT / "transformation-realtime.gif", save_all=True, append_images=trans[1:], duration=gif_durations, loop=0, disposal=2, optimize=False)

    sheet(trans, [f"{i:02d} {phases[i]}" for i in range(24)], EVIDENCE / "animation/transformation-contact-sheet-crown-final-v2.png", cols=6)
    sheet(rig_idle, [f"Idle {i:02d}" for i in range(24)], EVIDENCE / "animation/transformed-idle-contact-sheet-crown-final-v2.png", cols=6)
    aura_contact_images, aura_labels = [], []
    for name, frames in aura.items():
        aura_contact_images.extend(frames)
        aura_labels.extend([f"{name} {i:02d}" for i in range(COUNT)])
    sheet(aura_contact_images, aura_labels, EVIDENCE / "animation/aura-loop-contact-sheet-crown-final-v2.png", cols=6)

    refs = [Image.open(BASE / "idle-0-right.png").convert("RGBA"),
            Image.open(DAWNRUSH / "idle-ready-right.png").convert("RGBA"),
            rig_idle[0]]
    sheet(refs, ["B01E Base / 128x80", "B05 Dawnrush / 128x80", "Stormhalo rig / 128x80"],
          EVIDENCE / "art/base-dawnrush-stormhalo-review-board-crown-final-v2.png", cols=3, scale=4, tile_w=528, tile_h=336)

    preview = EVIDENCE / "animation/preview-crown-final-v2.html"
    preview.write_text("""<!doctype html><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>
<link rel='icon' href='data:,'><title>Stormhalo Rig Pilot Review</title><style>body{background:#07131d;color:#d8e3da;font:16px system-ui;margin:24px}main{max-width:960px;margin:auto}nav{display:flex;gap:8px;flex-wrap:wrap}button,select{background:#142b38;color:#d8e3da;border:1px solid #49c9bd;padding:8px 12px}figure{margin:16px 0;border:1px solid #38606a;background:#091b27;padding:12px}img{width:min(768px,100%);height:auto;image-rendering:pixelated;display:block;margin:auto}figcaption{margin-top:8px;color:#a3c7c1}</style>
<main><h1>Stormhalo Production Rig Pilot</h1><nav><select id='clip'><option value='exports-crown-final-v2/transformation/frames/transform-'>Base → Stormhalo transformation</option><option value='exports-crown-final-v2/stormhalo-idle-with-aura/frames/idle-aura-'>Stormhalo idle + aura</option><option value='../rig/blender-build-complete/sprites/native/Idle/idle-'>Rig Idle only</option></select><button id='play'>Pause</button><button id='step'>Next frame</button><label>Speed <select id='fps'><option>12</option><option>8</option><option>16</option></select> fps</label></nav><figure><img id='frame' alt='Animation frame'><figcaption id='caption'></figcaption></figure><p>Frames display at their recorded frame rate with nearest-neighbor scaling.</p></main>
<script>
let i=0,playing=true,timer;const im=document.querySelector('#frame'),sel=document.querySelector('#clip'),fps=document.querySelector('#fps'),cap=document.querySelector('#caption'),cache=new Map();
function framePath(index){const n=sel.value.includes('rig/blender')?index+1:index;return sel.value+String(n).padStart(2,'0')+'.png'}
async function preload(prefix){const jobs=[];for(let j=0;j<24;j++){const n=prefix.includes('rig/blender')?j+1:j;const url=prefix+String(n).padStart(2,'0')+'.png';if(cache.has(url))continue;const image=new Image();cache.set(url,image);jobs.push(new Promise(resolve=>{image.onload=resolve;image.onerror=()=>{cache.delete(url);resolve()};image.src=url}))}await Promise.all(jobs)}
function draw(){const url=framePath(i),image=cache.get(url);if(!image||!image.complete||!image.naturalWidth){cap.textContent='Loading '+url.split('/').pop();return}im.src=image.src;cap.textContent=url.split('/').pop();i=(i+1)%24}
function start(){clearInterval(timer);if(playing)timer=setInterval(draw,1000/Number(fps.value))}
async function changeClip(){clearInterval(timer);cap.textContent='Loading clip?';await preload(sel.value);i=0;draw();start()}
document.querySelector('#play').onclick=e=>{playing=!playing;e.target.textContent=playing?'Pause':'Play';if(playing)start();else clearInterval(timer)};
document.querySelector('#step').onclick=draw;sel.onchange=changeClip;fps.onchange=()=>playing&&start();
preload(sel.value).then(()=>{draw();start()});
</script>""", encoding="utf-8")
    print(f"Exported release 24-frame transformation, 24-frame rig idle, {COUNT}-frame layered aura, and review boards to {OUT}")


if __name__ == "__main__":
    main()

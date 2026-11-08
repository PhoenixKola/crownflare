from hashlib import sha256
from pathlib import Path
from PIL import Image
import json

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'art-source/environments/b10/spindle-refuge/source'
OUTPUT = ROOT / 'public/assets/environments/b10/spindle-refuge'
LAYERS = {
    'far-sky-and-fractured-spindle.png': ('far-sky.png', 960),
    'engine-hall-transparent.png': ('engine-hall.png', 960),
    'foreground-frame-transparent.png': ('foreground-frame.png', 960),
}

def digest(path: Path) -> str:
    h = sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()

OUTPUT.mkdir(parents=True, exist_ok=True)
records = []
for source_name, (output_name, target_width) in LAYERS.items():
    source = SOURCE / source_name
    with Image.open(source) as opened:
        original_mode = opened.mode
        image = opened.convert('RGBA' if 'A' in opened.getbands() else 'RGB')
        height = round(image.height * target_width / image.width)
        image = image.resize((target_width, height), Image.Resampling.LANCZOS)
        # A restrained palette keeps the generated pixel-art look crisp while keeping
        # the browser delivery light. Alpha is retained for the two overlay layers.
        image = image.quantize(colors=224, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE) if image.mode == 'RGBA' else image.quantize(colors=224, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
        target = OUTPUT / output_name
        image.save(target, format='PNG', optimize=True)
    records.append({
        'source': str(source.relative_to(ROOT)).replace('\\', '/'),
        'sourceSha256': digest(source),
        'sourceSize': Image.open(source).size,
        'sourceMode': original_mode,
        'runtime': str(target.relative_to(ROOT)).replace('\\', '/'),
        'runtimeSha256': digest(target),
        'runtimeBytes': target.stat().st_size,
    })
(OUTPUT / 'manifest.json').write_text(json.dumps({'tool': 'tools/art-export/build-b10-spindle-refuge.py', 'layers': records}, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'result': 'PASS', 'layers': records}, indent=2))

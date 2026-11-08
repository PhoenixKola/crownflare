from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'art-source/upgrades/b09/upgrades-atlas.png'
OUTPUT = ROOT / 'public/assets/upgrades/b09'
IDS = [
    'echo-palm', 'momentum-relay', 'countercurrent', 'solar-relay',
    'resonant-reclamation', 'grounding-coil', 'skyline-return', 'last-orbit',
    'aerial-imprint', 'field-recycler', 'close-orbit', 'radiant-discipline',
]


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    atlas = Image.open(SOURCE).convert('RGBA')
    if atlas.width % 4 or atlas.height % 3:
        raise SystemExit(f'Atlas dimensions must divide into 4x3 cells: {atlas.size}')
    cell_w, cell_h = atlas.width // 4, atlas.height // 3
    if cell_w != cell_h:
        raise SystemExit(f'Icon cells must be square; atlas is {atlas.size}')
    OUTPUT.mkdir(parents=True, exist_ok=True)
    records = []
    for index, icon_id in enumerate(IDS):
        col, row = index % 4, index // 4
        cell = atlas.crop((col * cell_w, row * cell_h, (col + 1) * cell_w, (row + 1) * cell_h))
        out = OUTPUT / f'{icon_id}.png'
        cell.resize((64, 64), Image.Resampling.NEAREST).save(out, optimize=True)
        records.append({
            'id': icon_id, 'cell': {'column': col, 'row': row, 'x': col * cell_w, 'y': row * cell_h, 'width': cell_w, 'height': cell_h},
            'runtime': out.relative_to(ROOT).as_posix(), 'runtimeSize': [64, 64], 'runtimeSha256': sha256(out),
        })
    manifest = {
        'milestone': 'B09', 'source': SOURCE.relative_to(ROOT).as_posix(), 'sourceDimensions': list(atlas.size),
        'sourceSha256': sha256(SOURCE), 'cropMethod': 'four columns by three rows; Pillow nearest-neighbor to 64x64; preserve RGBA',
        'icons': records,
    }
    path = ROOT / 'art-source/manifests/b09-upgrade-icons.json'
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    print(f'B09 icons built: {len(records)} runtime PNGs; source={atlas.size}; sha256={manifest["sourceSha256"]}')


if __name__ == '__main__':
    main()

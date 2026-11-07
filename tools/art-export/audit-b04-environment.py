from __future__ import annotations
from hashlib import sha256
from pathlib import Path
from PIL import Image
import json

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'art-source/environments/b04/generation'
RUNTIME = ROOT / 'public/assets/environments/b04'
OUT = ROOT / 'review-evidence/b04/art-audit.json'

MASTERS = {
    'b04-architecture-c33417f3.png': ('2616F21680BE25ADB8B2843E4AD1AA06B66EBE12C16B353CE0DF00161A11966C', (1672, 941)),
    'b04-horizon-01a1b353.png': ('A40C42D5F3854FDFB8661813A6E30301AF545D3D2F188B5BC7FCEC2C39E6735C', (1672, 941)),
    'b04-mechanisms-bb09212d.png': ('11C6F2DFCB2E7C8CDA3652BD848B0A9D6628071914429C26B482F483229FE80F', (2164, 727)),
    'b04-platforms-83c8df53.png': ('596EE9C35253B866D8A6D3423CD2EFA37AB06857B1502B808E46E47C64D3816E', (1672, 941)),
    'b04-sentry-attack-6d537f61.png': ('AAC21AF25299011C6DBFCA55677B3BDAE6C795DE1D999600334064AFDF55230E', (2172, 724)),
    'b04-telegraph-05d51877.png': ('822A60898077EA2457E8CB246A26E41952A1293BEFA4BB5CB6E69C25C344AD59', (2172, 724)),
    'b04-vfx-8c6ea1b7.png': ('FDA06A68DCAD0E4FEE269ABE62E83C3C011EFFB100DC9CC93B2CFA36A7E0CEDE', (2172, 724)),
    'b04-vfx-clean-4b7061aa.png': ('A7F51EA9496401004F82E081F9DBB02A07FD60364F1D3964282F976F4F3BC8B4', (2172, 724)),
}

EXPECTED = {
    'architecture.png': ((480, 270), True), 'conduit-tile.png': ((128, 32), True),
    'entry-beacon.png': ((58, 54), True), 'exit-gate.png': ((112, 104), True),
    'horizon.png': ((480, 270), False), 'impact-0.png': ((48, 48), True),
    'impact-1.png': ((48, 48), True), 'impact-2.png': ((48, 48), True),
    'platform-corner.png': ((36, 52), True), 'platform-long.png': ((128, 28), True),
    'platform-short.png': ((112, 32), True), 'reward-shard.png': ((28, 34), True),
    'sentry-telegraph.png': ((64, 42), True), 'sentry-attack-0.png': ((90, 42), True),
    'sentry-attack-1.png': ((104, 42), True), 'sentry-attack-2.png': ((76, 42), True),
}

def main() -> None:
    errors: list[str] = []
    masters: list[dict] = []
    for name, (expected_hash, expected_size) in MASTERS.items():
        path = SOURCE / name
        if not path.exists():
            errors.append(f'missing master {name}')
            continue
        digest = sha256(path.read_bytes()).hexdigest().upper()
        with Image.open(path) as image:
            size = image.size
            image.verify()
        if digest != expected_hash:
            errors.append(f'master hash mismatch {name}: {digest}')
        if size != expected_size:
            errors.append(f'master dimensions mismatch {name}: {size}')
        masters.append({'file': name, 'sha256': digest, 'width': size[0], 'height': size[1]})

    outputs: list[dict] = []
    actual = {path.name for path in RUNTIME.glob('*.png')}
    if actual != set(EXPECTED):
        errors.append(f'runtime texture list differs; expected={sorted(EXPECTED)} actual={sorted(actual)}')
    for name, (expected_size, transparent) in EXPECTED.items():
        path = RUNTIME / name
        if not path.exists():
            errors.append(f'missing runtime texture {name}')
            continue
        with Image.open(path) as image:
            image.load()
            size = image.size
            mode = image.mode
            if 'A' in image.getbands():
                alpha_histogram = image.getchannel('A').histogram()
                alpha_values = {value for value, count in enumerate(alpha_histogram) if count}
            else:
                alpha_values = {255}
        if size != expected_size:
            errors.append(f'runtime dimensions mismatch {name}: {size}')
        if transparent and alpha_values != {0, 255}:
            errors.append(f'runtime transparency is not clean binary alpha in {name}: {sorted(alpha_values)[:8]}')
        if transparent and 0 not in alpha_values:
            errors.append(f'expected transparent pixels in {name}')
        outputs.append({'file': name, 'sha256': sha256(path.read_bytes()).hexdigest().upper(), 'width': size[0], 'height': size[1], 'mode': mode, 'transparent': transparent, 'alphaValues': sorted(alpha_values)})

    report = {'result': 'PASS' if not errors else 'FAIL', 'sourceMasters': masters, 'runtimeTextures': outputs, 'errors': errors}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'result': report['result'], 'sourceMasters': len(masters), 'runtimeTextures': len(outputs), 'errors': errors}, indent=2))
    if errors:
        raise SystemExit(1)

if __name__ == '__main__':
    main()

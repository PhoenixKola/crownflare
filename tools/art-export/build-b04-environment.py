from __future__ import annotations
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'art-source/environments/b04/generation'
OUT = ROOT / 'public/assets/environments/b04'
OUT.mkdir(parents=True, exist_ok=True)

def load(name: str) -> Image.Image:
    return Image.open(SOURCE / name).convert('RGBA')

def alpha_hard(image: Image.Image, cutoff: int = 150) -> Image.Image:
    image = image.copy()
    a = image.getchannel('A').point(lambda value: 255 if value >= cutoff else 0)
    image.putalpha(a)
    return image

def fit(image: Image.Image, size: tuple[int, int], transparent: bool = False) -> Image.Image:
    image = alpha_hard(image) if transparent else image
    return image.resize(size, Image.Resampling.NEAREST)

def save(image: Image.Image, name: str) -> None:
    image.save(OUT / name, optimize=True)

# The environment master is intentionally 16:9 and already uses chunky stepped pixel clusters.
horizon = load('b04-horizon-01a1b353.png')
w, h = horizon.size
crop_h = round(w * 9 / 16)
top = max(0, min(h - crop_h, (h - crop_h) // 2))
horizon = horizon.crop((0, top, w, top + crop_h))
save(fit(horizon, (480, 270)), 'horizon.png')

# Transparent imagegen architecture has an intentional central combat window.
arch = load('b04-architecture-c33417f3.png')
save(fit(arch, (480, 270), True), 'architecture.png')

# Source-sheet crops are kept explicit so every runtime tile has a reproducible region.
platforms = load('b04-platforms-83c8df53.png')
for name, box, size in [
    ('platform-long.png', (58, 184, 1052, 382), (128, 28)),
    ('platform-short.png', (1128, 184, 1608, 384), (112, 32)),
    ('platform-corner.png', (338, 506, 566, 836), (36, 52)),
    ('conduit-tile.png', (810, 606, 1376, 748), (128, 32)),
]:
    save(fit(platforms.crop(box), size, True), name)

objects = load('b04-mechanisms-bb09212d.png')
for name, box, size in [
    ('entry-beacon.png', (132, 314, 502, 650), (58, 54)),
    ('reward-shard.png', (746, 330, 986, 604), (28, 34)),
    ('exit-gate.png', (1194, 12, 1916, 660), (112, 104)),
]:
    save(fit(objects.crop(box), size, True), name)

vfx = load('b04-vfx-clean-4b7061aa.png')
for index, box in enumerate([
    (206, 74, 546, 475),
    (752, 74, 1326, 642),
    (1482, 144, 1928, 540),
]):
    save(fit(vfx.crop(box), (48, 48), True), f'impact-{index}.png')

# The original double-chevron marker reads like a floor icon. The new generated sheet ties the warning and lunge streak to the sentry's glowing core.
attack = load('b04-sentry-attack-6d537f61.png')
for name, box, size in [
    ('sentry-telegraph.png', (130, 235, 410, 480), (64, 42)),
    ('sentry-attack-0.png', (570, 235, 940, 480), (90, 42)),
    ('sentry-attack-1.png', (1080, 235, 1630, 485), (104, 42)),
    ('sentry-attack-2.png', (1750, 260, 2040, 470), (76, 42)),
]:
    save(fit(attack.crop(box), size, True), name)
print(f'Exported {len(list(OUT.glob("*.png")))} B04 runtime textures to {OUT}')

# B06 Enemy Art Provenance

## Native generation

All five selected source images were created by the Codex built-in native `image_gen` tool. The UI exposed output IDs and PNG paths; it did not expose a model/version string. No external image, game asset, or reference image was supplied. The generated masters retain true RGBA alpha. The first non-alpha drafts were rejected and were not copied into the repository or used at runtime.

| Asset | Tool output ID | Master | Grid / source pixels |
|---|---|---|---|
| Shardrunner | `exec-96416862-73a6-491a-87b3-71c3999d4305` | `generated-master/shardrunner-atlas.png` | 4×2 / 1774×887 |
| Orbit Wisp | `exec-51e55c96-76ac-4e3e-aceb-5241e62c5e62` | `generated-master/orbit-wisp-atlas.png` | 4×2 / 1774×887 |
| Pressure Bastion | `exec-ba8cca61-9d54-4ed6-9aab-7171902e41fd` | `generated-master/pressure-bastion-atlas.png` | 4×2 / 1774×887 |
| Cantor of the Split Ring | `exec-425b9b47-41d5-44bf-ad57-99122dad0493` | `generated-master/cantor-atlas.png` | 4×3 / 1448×1086 |
| Signature effects | `exec-1d39ba8f-4951-4d57-8e97-c43c0e8f0c19` | `generated-master/enemy-signature-fx-atlas.png` | 4×2 / 1774×887 |

Exact source/runtime SHA-256 values and crop-cell mapping are in `asset-manifest.json`. Rebuild and verify with `npm run art:b06:build`.

## Captured prompts

### Shardrunner

```text
Use case: stylized-concept
Asset type: original pixel-art sprite atlas source for a 2D side-view action roguelite
Subject: one coherent Shardrunner, a narrow angular shard-limbed runner with split oxblood lower cloak, visible kinetic hinges and a small off-center jade core; not a humanoid knight or recolored existing enemy.
Style: crisp premium 16-bit pixel art, clean pixel clusters, hard contour, distinct readable details at 40–50px tall, no blur.
Composition: exact 4 columns by 2 rows atlas; each cell contains same right-facing full-body character at same scale and feet/pivot line, centered with margins; all poses isolated with no overlap. Row 1: idle tension, advance sprint, turn, committed low dash attack. Row 2: coil telegraph, exposed recovery, hurt recoil, compact defeated KO. Stable head/core proportion; clear visibly different poses. Even cell spacing; no borders, labels, shadows crossing cells, or text.
Palette: bone pearl and pale steel armor, dark oxblood cloth, restrained jade core.
Constraints: genuine transparent outside background; transparent_background true; alpha retained; side profile; consistent identity and body scale.
Avoid: background, checkerboard pattern, extra character, weapon, gradients, painterly blur, UI, watermark.
```

### Orbit Wisp

```text
Use case: stylized-concept
Asset type: canonical original pixel-art sprite atlas for a 2D side-view action roguelite
Subject: one original Orbit Wisp, an airborne fractured celestial lens with an uneven ring of separate silver diamond fragments and a large readable sea-glass teal iris; unmistakably non-humanoid, detailed and not a simple orb.
Style: crisp premium 16-bit pixel art, intentional pixel clusters and hard outline, limited tones, excellent readability at 28–34px, no blur.
Composition: one exact 4-column x 2-row evenly spaced atlas with transparent background. In each cell the same Wisp with same central lens size and hover pivot, all fragments visible, safely inset. Row 1: hover idle, drift reposition, charge/aim tell, projectile launch. Row 2: recoil, hit/hurt with iris knocked off alignment, staggered broken orbit, defeated inward collapse. Each pose has unique visible frame detail; stable central geometry. No borders, text, background or other entities.
Palette: ink navy shell, aged silver fragments, sea-glass teal iris, tiny muted amber ring details; avoid purple.
Constraints: true transparent alpha around character and fragments, profile side-game view, same scale and identity, no cell overlap.
Avoid: starfield, background, checkerboard, full-screen glow, extra characters/projectile, UI, watermark.
```

### Pressure Bastion

```text
Use case: stylized-concept
Asset type: canonical pixel-art atlas source for an original enemy in a 2D side-view action roguelite
Subject: one Pressure Bastion, a broad stocky armored defender, asymmetrical left-front shield plate and visible pressure-valve amber core, heavy but articulated with legs, layered plates, joints and recognizable body; distinct from narrow runner and round floating Wisp.
Style: polished handcrafted 16-bit pixel art, sharp pixels and bold contour, intentional clusters, excellent gameplay-scale readability at 54px tall, no blur.
Composition: exact evenly spaced 4x2 atlas on transparent background. Same right-facing Bastion, stable width/height and ground pivot per cell, full shield/feet clear. Row 1: planted idle, slow trudge, frontal shield guard, overhead strike windup. Row 2: overhead contact pose, long exposed recovery, guard-break stagger with plates displaced, defeated collapsed KO. Every pose authored and readable; shield remains on the left/front side in right-facing view. No frame boundaries, text or other characters.
Palette: slate blue steel plates, warm bronze valve/core, muted ivory edge glints, dark teal joints; not purple or oxblood.
Constraints: true transparent alpha, profile side-view, stable silhouette identity and matching proportions, atlas frames do not overlap.
Avoid: featureless box, giant weapon, same silhouette as human knight, extra character, background, checkerboard, labels, watermark, painterly blur.
```

### Cantor of the Split Ring

```text
Use case: stylized-concept
Asset type: original elite enemy source atlas for a pixel-art 2D action roguelite
Subject: Cantor of the Split Ring, a clearly elite ritualized sentinel, taller than regular enemies with a narrow bell-like torso, a split halo of orbiting angular rings behind and above, long draped mantle, and luminous split-ring core. Distinct from Pressure Bastion; elegant dangerous silhouette rather than extra armor bulk.
Style: premium hand-crafted 16-bit pixel art, sharply clustered pixels, elegant linework, strong readability around 62px tall, restrained controlled glow.
Composition: exact 4 columns x 3 rows, even isolated cells on transparent canvas. Same right-facing elite with stable height and pivot. Row 1: quiet entrance pose, idle ritual, reposition step, ring sweep windup. Row 2: ring sweep contact extreme, exposed ring-sweep recovery, pressure pulse windup, pressure pulse release. Row 3: open vulnerability/stagger, hurt knocked back, final ring collapse KO, compact defeat dissolve pose. Make the two attack pattern poses unmistakably different; no large full-frame flares, no text or borders. Consistent identity/proportions in every cell.
Palette: blackened indigo shell, tarnished silver ring segments, warm pale gold ritual thread, controlled cyan-white core; not Bastion bronze/steel colors.
Constraints: transparent alpha around sprite, full-body side view, fixed per-cell scale, safe margins, no other figures.
Avoid: recolored common enemy, giant boss proportions, background, checkerboard, UI, labels, watermark, blur.
```

### Signature effects

```text
Use case: stylized-concept
Asset type: transparent pixel-art effects atlas for an original 2D side-view action roguelite
Primary request: a clean 4-by-2 atlas of separate gameplay-sized visual effects for the new Sunderglass enemy roster: (1) Shardrunner jade-oxblood short dash trail, (2) Shardrunner blade-like impact spark, (3) Orbit Wisp sea-glass charge halo, (4) slow Wisp projectile with restrained trail, (5) Wisp projectile impact burst, (6) Pressure Bastion amber ground shockfront traveling horizontally, (7) Bastion shield guard-break shards, (8) Cantor split-ring sweep crescent/pulse. Distinct readable hard-edged pixel clusters; effects are local and compact, never fill the screen. Each cell is an isolated effect with clear margins, no letters or labels.
Style/medium: crisp polished pixel art matching premium 16-bit sprite atlas, sharp edges, limited colors, high contrast at 480x270 view.
Composition: exact equally spaced 4 columns by 2 rows on true transparent canvas, centered effect in each fixed cell, effects distinct from one another and small enough to use around characters.
Palette: jade + restrained oxblood for runner; sea-glass cyan for wisp; amber/steel for bastion; pale silver and muted gold for Cantor; dark clean outlines.
Constraints: transparency outside effects, original assets, no character bodies, no background, no text, no bloom haze, no full screen flashes.
Avoid: gradients, soft blur, radial whiteout, checkerboard pattern, geometric primitives, UI, watermark.
```

## State, pivot, scale, and timing map

Runtime frames are 80×80 transparent PNGs with nearest-neighbor sampling. Grounded characters use a shared bottom pivot at y=76; Wisp uses a centered hover pivot at y=40. `setFlipX` mirrors the complete authored side-facing sprite, preserving shield-to-front orientation. Wisp remains visually symmetric around its central iris. Runtime artwork keeps source color; tint is only used for blocked feedback, not for character identity.

| Archetype | Source cells / runtime states | Gameplay size | Timing / contact | Facing and feedback |
|---|---|---:|---|---|
| Fractured Spindle Sentry | Existing B03 `idle`, `telegraph`, `lunge`, `hurt`, `stagger`, `ko` | 64×56 source; 24×42 hurt body | 440ms tell; lunge 200ms; hit event 88ms after commit | Locked direction during tell/commit; original B04 telegraph/thrust effects retained |
| Shardrunner | 0 idle, 1 move, 2 turn, 4 tell, 3 attack, 5 recovery, 6 hurt, 7 KO | 80×80 canvas; up to 54px pose height | 560ms tell; 210ms commit; contact 76ms; 640ms recovery | Complete sprite mirrored with facing; dash trail appears on commit and impact follows hit result |
| Orbit Wisp | 0 hover, 1 reposition, 2 charge/tell, 3 launch, 4 recoil, 5 hurt, 6 stagger, 7 disperse/KO | 80×80 canvas; 39px pose height | 860ms charge; projectile 128px/s, 2600ms lifetime; 540ms recovery | Symmetric lens; one owned projectile at a time; pauses, blocks, hits and expiry remove it |
| Pressure Bastion | 0 idle, 1 trudge, 2 guard, 3 tell, 4 overhead contact, 5 recovery, 6 guard break/stagger, 7 KO | 80×80 canvas; up to 56px pose height | 820ms tell; contact 132ms; 220ms commit; 850ms exposed recovery | Whole sprite mirrored so shield stays forward; light front attacks block; rear/aerial/heavy/launcher can break or bypass guard |
| Cantor of the Split Ring | 0 intro, 1 idle, 2 move, 3/4/5 sweep tell/contact/recovery, 6/7 pulse tell/contact, 8 vulnerable, 9 hurt, 10 KO, 11 disperse | 80×80 canvas; up to 68px pose height | 1180ms entrance; 840ms pattern tells; contact 92ms; 220ms commit; 660–720ms vulnerability/recovery | Complete ring silhouette mirrors; generated ring VFX only plays on pattern/result beats |

This is a generated-atlas source, not pixel-by-pixel hand cleanup. The export performs audited cell crop, alpha trimming and nearest-neighbor resampling; the files remain candidates for owner review. No owner art or animation approval is implied.

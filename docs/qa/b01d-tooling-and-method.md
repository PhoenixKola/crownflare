# B01D tooling and production method

## Verified local stack

| Tool | Installed in this checkout | Decision |
|---|---:|---|
| Phaser | `4.2.1` | Keep pinned version. The official release page lists 4.2.1 as the latest release observed on 2026-11-07. |
| TypeScript / Vite / Playwright | `5.9.3` / `7.3.7` / `1.55.1` | Keep existing lockfile versions; no new npm dependency was needed. |
| Python / Pillow | Python available; Pillow `12.2.0` | Reuse the existing pin and B01C palette/alpha/nearest-neighbor method. Official stable Pillow docs already show 13.0.0; no measured B01D gain justified changing the established exporter pin. |
| LibreSprite | Not installed / not invoked | Its official repository documents real-time animation preview, onion skin, frame/layer editing, palettes and supported sprite formats. It is GPL-2.0; installing it would add an optional editor, not a runtime need. No project files require it. |
| Pixelorama | Not installed / not invoked | The official repository describes an open-source editor for sprites/animation and carries an MIT license. No project files require it. |
| Built-in image generation | Invoked twice for retained B01D output sheets | Created separate left and right four-pose run studies from the matching B01C facing references. Output IDs, exact prompts, dimensions, alpha and SHA-256 are recorded in `art-source/characters/iona/b01d/`. Model/version was not exposed; it is recorded as `unknown`. |

References checked: [Phaser 4 release list](https://github.com/phaserjs/phaser/releases), [official Phaser animation skill](https://github.com/phaserjs/phaser/blob/master/skills/animations/SKILL.md), [Phaser animation events](https://docs.phaser.io/api-documentation/event/animations-events), [Phaser 4 animation guide](https://www.phaser.io/oss/docs/phaser/concepts/animations), [LibreSprite repository/license](https://github.com/LibreSprite/LibreSprite), [LibreSprite CLI docs](https://libresprite.dev/docs/cli/), [LibreSprite animation docs](https://libresprite.dev/docs/animation/), [Pixelorama repository/license](https://github.com/Orama-Interactive/Pixelorama), [Pillow stable docs](https://pillow.readthedocs.io/en/stable/handbook/image-file-formats.html).

## Selected image path

1. Built-in ImageGen produced one `2×2` left-facing sheet and one `2×2` right-facing sheet. The directions were generated independently; no asymmetric costume detail was mirrored.
2. `tools/art-export/build-iona-b01d.py` takes each exact 2×2 cell, thresholds alpha at 192, trims the cell, saves the trimmed source pose, uses nearest-neighbor to a uniform 67 visible pixels, quantizes to the existing B01C 32-color palette without dithering, and aligns the torso pivot to x=64 and feet to y=80 on a transparent `128×80` canvas.
3. `67px` is the median visible height of the old B01C run frames. Per-sheet source scales differ because the generated sheets have different output dimensions; each final pose has the same visible run height and canvas anchor. The animation keeps the historical 420ms cycle: four frames × 105ms, versus six × 70ms in B01C. Its playback order is forward contact → compression → opposite-foot contact → passing, giving alternating contact points at 0ms and 210ms per loop.
4. All other B01C action frames are copied byte-identically into the isolated B01D runtime namespace. The B01D manifest records their original source hashes and new runtime hashes; no B01A, Recovery or B01C source or evidence was overwritten.

This is reproducible image cleanup, not hand pixel animation. There were **zero hand-redrawn pixels**. The new run sheet has legible articulated pose changes at native output scale, but the normal-speed in-game art gate is pending because this session could not access local browser playback. The generated sheets and 60px/67px contact images are candidates, not proof of smooth animation.

## B01D final sizing and Chrome verification

The build now generates and hashes `src/game/animation/ionaCandidateFrameMetrics.ts`, with painted bounds for every B01C and B01D frame. The lab sizes the live candidate by those bounds, and the diagnostics draw the painted rectangle beside the 128×80 source canvas, the 15×30 physics body and the feet pivot. The production smoke measured the live sprite at exactly 48, 60 and 72 logical visible pixels.

Rebuild with `npm run art:iona:b01d:build`; it exports and audits candidate frames plus the metrics module. `npm run audit:assets` remains a separate repository-wide check. The final Installed Chrome capture and complete results are in [`review-evidence/b01d/README.md`](../../review-evidence/b01d/README.md). The capture is normal-speed, but the agent could not watch it; actual tab-hidden visibility was unverified, and the WebM contains no audio track.

## Phaser and combat timing

The Phaser docs describe frame-based sprite sequences and `ANIMATION_UPDATE`; the event docs define updates as sprite-presentation events. Registration is shared through typed `registerTextureClips` / `missingTextureKeys`. The clips keep `skipMissedFrames: false`. Combat still advances in `stepAction` from the simulation delta and emits contact at the existing 112/138/165ms times; animation state only displays the corresponding windup/contact/recovery pose. No Phaser animation event can add or skip damage.

## Alternatives and license/provenance

LibreSprite and Pixelorama were not installed because this curated crop-and-export method was measurable, reproducible, and already used by the project. Blender, proprietary tools, new npm/image dependencies, atlas packing and new services were not introduced. Pillow resampling/palette choices remain explicit in the source exporter. The original ImageGen PNGs are retained unmodified, with output IDs, reference files, prompt IDs and checksums; tool model/version is unknown.

## Source rebuild

```powershell
python tools/art-export/build-iona-b01d.py
npm run audit:assets
```

The exporter writes only `art-source/characters/iona/b01d/corrected-poses/`, `art-source/manifests/iona-b01d-candidate-v1.json`, `public/assets/characters/iona/b01d/` and four derived sheets under `review-evidence/b01d/` (run poses, before/after cycle, action contacts and retained B01A form silhouettes). `tools/art-export/audit-iona-b01d.py` verifies the source/runtime checksums and pixel invariants.

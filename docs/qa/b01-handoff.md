# B01 visual lock handoff

## Current material

- Candidate board: [`b00-provisional-visual-target-board.png`](../../art-source/characters/iona/b00-provisional-visual-target-board.png)
- SHA-256: `7d7258aa582c8e6da011d43defb3d5adb36833b39c696cf3aaa1895bfbde4d75`
- Provenance: original OpenAI image generation for this project, recorded in `art-source/manifests/iona-b00-visual-target-board.json`.
- Status: **CANDIDATE_NOT_CANONICAL**; owner approval **PENDING**; runtime integration **none**; approved sprite states **zero**.

The board gives a coherent original Iona/Base/Dawnrush/Stormhalo/Eclipse Warden direction, palette families and a world mock. It is a concept illustration, not a true-scale sprite sheet or a pixel-art production master. No existing art from another project is used.

## Required B01 review package

Before producing a large animation batch, prepare:

1. One side-view Iona Base master with a compact palette, readable face, stable proportions, clean transparent pixels and clear left/right asymmetry notes.
2. Four **VFX-off solid black silhouettes** at matching 48, 60 and 72 logical-pixel tests, aligned on a shared ground line. Compare Base, Dawnrush, Stormhalo and Eclipse Warden at each scale.
3. The same silhouettes placed in the real 480×270 chamber, at 100% and 75% display size against a representative platform/background.
4. A concise color/material strip and one or two key movement poses that explain the shape language; do not imply these are complete animation catalogs.
5. A normal-speed live-game preview only after an individual master is selected. The provisional generated board itself cannot prove animation or in-game scale.

## Owner decision requested at the B01 gate

- Approve or revise Iona's side-view face, hair, cropped jacket, copper wrist hardware, pale sash, palette and body proportions.
- Confirm that Dawnrush reads as an energized human courier, Stormhalo as a precise split-orbit counterfighter, and Eclipse Warden as a genuinely different hovering/plated entity.
- Confirm all four remain recognizable and distinct with VFX disabled at actual gameplay scale.
- Select one immutable Iona master. Record its path and SHA-256 before deriving action frames.

Until that approval, keep every visual candidate provisional and do not mass-generate runtime sprites. Full B01 acceptance also needs a live base idle/locomotion preview; this B00 handoff does not claim B01 work is complete.

## B01A review package

The first original art direction and true-scale Phaser review package is documented in [`b01a-visual-review.md`](b01a-visual-review.md), with source/runtime hashes in `art-source/manifests/iona-b01a-visual-review.json` and captures in `review-evidence/b01a/`. The recommended source is `iona-b01a-base-recommended-master-source.png` at a proposed 60px review height. All source and preview art remains `PENDING_OWNER_REVIEW`; Dawnrush's no-VFX silhouette and pixel-level detail need review. No idle animation is included and B01B must wait for the owner's decision.

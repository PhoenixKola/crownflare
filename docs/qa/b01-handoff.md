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

The first art direction and true-scale Phaser package is documented in [`b01a-visual-review.md`](b01a-visual-review.md), with source/runtime hashes in `art-source/manifests/iona-b01a-visual-review.json` and captures in `review-evidence/b01a/`. Its recommended source remains `PENDING_OWNER_REVIEW`; the recovery art used it as a reference and did not implicitly approve it.

## B01 recovery package — current owner review

- Owner-facing bundle: [archived locally: `review-evidence/recovery/README.md`](review-evidence-archive.md#recovery).
- Source-generation prompts and invocation IDs: `art-source/characters/iona/b01-recovery/generation-prompts.md` and `generation-provenance.json`.
- Source-to-runtime hash lineage, alpha checks, anchors and clip events: `art-source/manifests/iona-b01-recovery-v2.json`.
- New development default: `/?animationLab=1`. The old actor can only be selected for explicit A/B or regression with `&oldRejectedArt=1`; it is marked `REJECTED_OWNER_ART`.
- Current gate: `TECH PASS` for the scoped Chrome run; `ART-MOTION PENDING` normal-speed owner review; `OWNER APPROVAL PENDING`. The Base identity and 60px working height are not locked. Dedicated jump/dash poses, forms and the production combo are not included.

## B01C extended animation and combat pilot

- Owner-facing report: [archived locally: `review-evidence/b01c/README.md`](review-evidence-archive.md#b01c).
- Source lineage, runtime hashes, clip timing, and gate state: [`iona-b01c-production-v1.json`](../../art-source/manifests/iona-b01c-production-v1.json).
- Installed Chrome proof: [archived locally: `67.44-second normal-speed video`](review-evidence-archive.md#b01c) and [archived locally: `QA report`](review-evidence-archive.md#b01c).
- Result: B01C technical checks pass; six-pose locomotion and three-hit art-motion pilot pass provisionally; canonical Iona and 60px scale owner approval remains **PENDING**. Playwright captured no audio track, and playback is unconfirmed.
- The original B01 Recovery sources, manifest, and 15×30 body remain unchanged. B01C assets stay in their opt-in runtime namespace.

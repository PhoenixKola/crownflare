# ImageGen provenance

The raw generation outputs are retained under `generation/`. This file records which real generated images supplied the pilot. The first four prompt entries summarize the original image requests because their exact text was not preserved in the source folder. The last entry is the exact prompt used for the final accessory generation.

## 01 — component parts sheet

- Output: `iona-stormhalo-rig-parts-imagegen-01.png`
- Inputs: canonical Stormhalo study, Base Iona, Dawnrush Iona, and prior Stormhalo concept references.
- Prompt intent summary: generate a transparent, right-facing side-view sheet of isolated rigid Stormhalo outfit/body components with hidden overlap at shoulder, elbow, wrist, hip, knee, and ankle; match Iona's silver hair, teal forelock, indigo and pale-trim costume, pixel-art silhouette, and keep parts separated for cropping. This sheet supplied the arm, hand, leg, boot, and sash cutouts.

## 02 — upper-body parts

- Output: `iona-stormhalo-rig-body-parts-imagegen-02.png`
- Inputs: the same character/style references.
- Prompt intent summary: generate separate transparent side-view head, neck, torso, and pelvis components with generous joint overlaps, dark outlines, and matching Stormhalo proportions. The sheet supplied the torso, neck, pelvis, and early head study.

## 03 — head detail

- Output: `iona-stormhalo-head-detail-imagegen-03.png`
- Inputs: canonical Stormhalo study and production Iona references.
- Prompt intent summary: generate a clean isolated head cutout for the real side-view heroine, preserving silver hair, teal forelock, visible teal eye with lid/pupil, face proportions, crisp outlines, and transparent edges. It replaced the too-small eye from the first head attempt.

## 04 — independent aura VFX

- Output: `iona-stormhalo-aura-vfx-imagegen-01.png`
- Inputs: Stormhalo concept and canonical art references.
- Prompt intent summary: generate a transparent sheet of individually separated violet, teal, and copper energy arcs, filaments, orbit pieces, and motes; avoid drawing a character or background. The exporter cuts only these effect components and animates them on separate layers.

## 05 — split crown and coat-fins

- Output: `iona-stormhalo-crown-coat-imagegen-04.png`
- Inputs: `references/iona-stormhalo-b01a-canonical-study.png` and `references/iona-dawnrush-b05-runtime-idle-ready-right.png`.
- Prompt used:

> Create a transparent PNG production cutout sheet of ONLY two separate wearable rigid accessory pieces for Crownflare's existing heroine Iona Rell, matching the supplied Stormhalo canonical study precisely. Preserve the reference's recognizable silver hair, single visible teal eye, dark indigo outfit, pale lavender edge trim, and crisp dark-outline pixel-art style. Do not draw Iona's body, head, face, arms, text, labels, ground, glow haze, or any background. Arrange exactly two well-separated, fully visible isolated parts on transparent canvas: (1) the Stormhalo split hovering crown, two distinct curved broken arcs with a clear opening and one small detached shard, indigo/lavender enamel with pale edge, shaped exactly like the reference above Iona's hair; (2) a pair of long angular coat fins / collar tails, indigo with pale lavender trim, matching the angular back fins seen at Iona's shoulders. Both pieces must be designed as compact side-view rigid sprites, front/side view facing right, with pixel stair-step contours and deliberate limited pixel clusters; no painterly blur, anti-aliased fringes, gradients, or fake checkerboard. Keep them separate with no overlap, with generous transparent padding for cropping and pivot placement. The crown should fit over the existing head at game scale and not cover the visible eye. Accessories only; do not redesign the character or invent motifs.

The crown cutout is integrated as a separate RCP bone. The additional fin was not layered over the already generated torso, which already contains shoulder fins.

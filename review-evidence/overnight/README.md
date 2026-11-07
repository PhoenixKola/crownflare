# B01 overnight Iona pilot — rejected historical actor

**Status: `REJECTED_OWNER_ART`.** The overnight runtime actor was assembled from SVG polygons and rectangles, then rasterized. Its two generated reference illustrations did not supply runtime pixels. The owner rejected the actor; it remains only as historical evidence and an explicitly selected regression/A/B path.

The replacement recovery package uses native Codex image-generation outputs as direct source pixels and is documented in [`review-evidence/recovery/README.md`](../recovery/README.md). The default `/?animationLab=1` route selects that recovery work. Use `/?animationLab=1&oldRejectedArt=1` only to inspect this rejected actor.

## Archived implementation and evidence

- SVG sources: `../../art-source/characters/iona/overnight/frames/`.
- Historical generated references (not runtime art): `../../art-source/characters/iona/overnight/iona-overnight-base-generated-reference.png` and `iona-overnight-dawnrush-generated-reference.png`.
- Historical frame hashes: `../../art-source/manifests/iona-overnight-v1.json`; the manifest and exporter explicitly retain rejected/non-default status.
- Current rejected-art regression capture: [`iona-animation-lab.webm`](iona-animation-lab.webm), 21 seconds in installed Chrome 156.0.8078.80, SHA-256 `cb6c1f5dca72507f536eb2fb61c815322e4155cac5a19df50a8da33928009b76` (1,808,179 bytes). This is regression evidence only, not recovery acceptance evidence.

The recovery batch preserves the old assets without treating the 44 raster exports as original image-generated sprite art. `npm run qa:iona:overnight` selects `oldRejectedArt=1` and exists as a regression test only; its source digest for this run was `1ecd0e60870145d13cd953ab85b7baea9690b3dc8987ec0a0cfc0dafc18b8949`. Current cross-project verification results and source digests belong to the [recovery handoff](../recovery/README.md); the B00 and B01A packages retain their own evidence.

# B01D owner decision — provisional recommendation

**Status: OWNER APPROVAL PENDING.** This record recommends a review target; it does not approve a canonical Base, approve a form, or accept B02 movement.

## Recommended review target

Review `IONA_B01D_BASE_V1` from [`art-source/manifests/iona-b01d-candidate-v1.json`](../../art-source/manifests/iona-b01d-candidate-v1.json), using the in-engine path `/?animationLab=1&b01d=1`.

This candidate carries the B01C Base identity and all existing B01C actions forward byte-identically except the run loop. The revised loop has four actual image-generated poses in independently generated left and right directions. It keeps the historical 420ms cycle, changes run contacts to 0ms and 210ms, normalizes to 67 visible pixels, and uses the original 15×30 body. At the 60px working display scale, start with VFX off and use `T` to compare against B01C.

### Native source chain

| Direction | Original generated source | SHA-256 |
|---|---|---|
| Left run poses | [`iona-run-left-4pose-imagegen-01.png`](../../art-source/characters/iona/b01d/original-imagegen/iona-run-left-4pose-imagegen-01.png) | `47999cddb63e807da43223b59f8a25bda6ab73a4d79c751caba7a9bd9084ca5d` |
| Right run poses | [`iona-run-right-4pose-imagegen-01.png`](../../art-source/characters/iona/b01d/original-imagegen/iona-run-right-4pose-imagegen-01.png) | `c843cd5d0fce12cd683d396719a68a79e21de62085936df619d3eafcd88349dc` |

The manifest records every frame crop, source and runtime SHA-256, transparent bounds, 128×80 canvas, 67px run height, waist/feet anchor, frame timing, contact event metadata and owner-review status. The model/version was not exposed by the image tool and remains `unknown` in the provenance record. No pixels were hand-redrawn. Idle, jump, dash and all six combo poses remain the historical B01C art pending their own motion review.

The unchanged B01C source is the only meaningful alternate direction in this batch; no second creative master was produced. For before/after, compare the same four run phases at the same 128×80 pixel canvas in [archived locally: `iona-b01d-before-after-run-cycle.png`](review-evidence-archive.md#b01d). This is a raw-pixel contact sheet, not a retouched illustration.

The final Installed Chrome clip is [archived locally: `iona-b01d-75s.webm`](review-evidence-archive.md#b01d), measured at 67.68 seconds and 4,593,218 bytes (SHA-256 `b8588efbce7307fffb37ca718a45bd81d2aff489f0aca0194f8ef70b399aee82`). It was recorded at normal speed but could not be played back by the agent in this session; see the report for the video-only audio status and unverified real-tab visibility check.

## Working scale recommendation

Use **60 logical pixels as the provisional working size** for owner review because it is the established B01C basis and the candidate run height was matched to the B01C run median. Review it alongside 48 and 72 in the live lab, where digits `1` / `2` / `3` resize the actual sprite; this is not a final scale lock. `C` cycles clean, light and busy backgrounds; resizing the browser to 960×540 shows the 75% display case.

## Owner decisions still open

- [ ] **Base design:** Does the B01C identity remain the right Iona Rell direction, with this B01D run refinement?
- [ ] **Left/right identity:** Do both independently generated profiles still read as the same Iona, including the teal forelock and copper/navy wrist asymmetry?
- [ ] **Size:** Choose 48, 60 or 72 logical pixels after viewing the live candidate and the supplied clips.
- [ ] **Locomotion:** Is the four-pose run readable and responsive at normal speed in both directions, including quick reversal, jump, dash and landing?
- [ ] **Combo:** Are the retained palm, side kick and rising forearm distinct and legible at normal speed, especially the taller kick silhouette?
- [ ] **Dawnrush silhouette:** Keep the separate B01A study, request a later corrected study, or revise its form direction. No new Dawnrush art was produced in B01D.
- [ ] **Audio:** No B01D audio was implemented or heard. Approve a later original sound direction from the cue sheet or revise it.

## Promotion and B02 boundary

`src/game/animation/ionaPromotion.ts` defines one `IonaPromotionConfig`. Its current values are `readyToPromote: false` and `ownerApproval: 'PENDING_OWNER_REVIEW'`. Ordinary gameplay does not load B01D art. Only after the owner explicitly approves the canonical reference and scale should a later change set both `readyToPromote: true` and `ownerApproval: 'OWNER_APPROVED'`; the preview path and manifest remain versioned and recoverable.

**B02 readiness verdict: READY-FOR-OWNER-GATE** for the narrow typed clip helper, diagnostics, deterministic local QA and disabled promotion switch. It is not B02 movement acceptance. The B01D live Chrome video exists, but normal-speed playback could not be observed in this session because the local computer-use/browser bridge was unavailable. ART-MOTION therefore remains pending until the owner watches the video and plays the candidate. B02A ordinary-game integration, audio quality, and any wider movement work must wait for explicit visual approval.

# Project Crownflare — Technical Art, Animation & Production Pipeline

## Production principle

Codex can author **real original sprites, sprite edits, impact textures, VFX flips, menus and environment paintings** when its supported image tools are available; check the executing tool capability. Never claim only primitives are possible. However rendered images are *candidates*, not accepted gameplay content. B00 engineer rectangles are strictly disposable and cannot satisfy B01 or B02.

## Canonical original hero system

1. Draft silhouette thumbnails with **four forms** and original line/shape language. Stage them at 48/60/72 game pixels on the actual 480×270 room. No VFX.
2. Generate 1–3 curated Iona base concept masters; choose one **with owner's explicit visual approval**. Record immutable canonical reference path, SHA-256, date, palette and rejection reasons. Body proportions, handedness, hair lock, jacket panels, copper hardware, sash shape become fixed.
3. Produce action storyboard **key poses first** (anticipation, kinetic stretch, contact, follow-through, recovery). Test inside real game at normal speed as soon as first action exists. Add intentional in-between and controlled smears; do not batch 8 loosely related images and label them fluid animation.
4. Preserve consistent pixel scale, canvas dimensions, top-head margin, grounded foot pivot, hand/strike anchor, turning masks and frame event offsets. Correct left asymmetry rather than blindly flip a distinct costume shape.
5. Preview without VFX/audio, then add timed effects and unique sound once body's movement passes. Validate missing/ghost alpha pixels, body/foot drift, attack timing, atlas trim, memory use.
6. Export runtime atlas and manifest with per-frame time, origin, effect anchors and event IDs. Retain canonical source masters outside runtime bundle, not duplicated through many huge directories.
7. Record real game in local authorized Chrome at **normal speed**, original resolution and 75% scaled review. AI can assess but only owner can approve.

## B01A Iona review candidates (not canonical)

- The B01A sources and source hashes are recorded in `art-source/manifests/iona-b01a-visual-review.json`; the owner review and scale rationale are in `docs/qa/b01a-visual-review.md`.
- `iona-b01a-base-recommended` is the proposed Base direction for review at 60 logical pixels. It remains `PENDING_OWNER_REVIEW`; the generated 48/60/72 previews do not change B00 collision dimensions.
- Runtime B01A previews are loaded only by the development `?artReview=1` path. The normal chamber retains its B00 programmer actor until an explicit owner-approved master and a later production-integration step.
- Current original inputs are larger generated raster illustrations hardened/cropped and nearest-neighbor resampled by `npm run art:b01a:build`. This is a reproducible review pipeline, not a substitute for manual pixel cleanup, palette reduction, or an approved frame-construction workflow.
- Base left/right images are separate studies; they have not passed a consistency/animation check. Dawnrush's black silhouette is close to Base and deserves focused owner review. No idle, action, transformation animation, or ART-MOTION pass is claimed.
- Do not start B01B until the owner chooses the canonical Base direction and confirms/revises the target size. B01B should then lock an immutable cleaned source and make one genuine in-game Base idle with directional alignment.

## B01 overnight legacy actor — rejected

- `art-source/characters/iona/overnight/` and `public/assets/characters/iona/overnight/` are retained as historical artifacts. The runtime character was assembled from polygon/rectangle SVGs; the two image-generated illustrations were references only. The owner rejected this actor as `REJECTED_OWNER_ART`.
- `art-source/manifests/iona-overnight-v1.json` records the old frames and hashes and marks them non-default. `/?animationLab=1&oldRejectedArt=1` is the explicit comparison path; `npm run qa:iona:overnight` is regression coverage only. The old 44 frames are not evidence of art acceptance.
- This rejected implementation is preserved for audit. New work must not use its polygon shapes as source pixels. `/?artReview=1` and all B01A source masters remain unchanged.

## B01 recovery — native image generation and real playable animation

- The owner rejected the prior overnight vector actor and required image-generated source pixels in the actual runtime sprite. Seven new original images were created with the Codex built-in `image_gen.imagegen` capability: one selected right-facing Base master and six reference-guided 2×2 sheets for idle, run and jab in both facings. The original tool-output PNG bytes, output IDs, reference paths, prompts and hashes are retained under `art-source/characters/iona/b01-recovery/` and `art-source/manifests/iona-b01-recovery-v2.json`.
- `npm run art:iona:recovery:build` crops 24 unique illustrated poses, thresholds the generator's soft alpha fringe at 192, aligns a 60px visible height and feet/waist pivot, and exports nearest-neighbor 128×80 transparent PNGs. It does not draw replacement body geometry. Cropped source-pose PNGs and exact generated-source → crop → runtime hashes are recorded in the manifest. Rebuilding needs the pinned Pillow dependency in `tools/art-export/requirements-iona-recovery.txt`.
- The development `/?animationLab=1` route now defaults to these generated-source pixels. It maps four idle and four run poses per facing and a four-pose jab per facing into the existing Phaser scene. The left side was separately image-generated; no frame is a simple mirror. `oldRejectedArt=1` is only for A/B review and regression.
- The existing B00 15×30 Arcade body, `stepMovement`, camera, pause/resume and hit-event clock remain authoritative. The visible jab uses 130ms startup, 100ms active, 260ms recovery, with the generated contact pose active over the 162ms contact event. Run-flight art is reused for the jump display and generated run poses are reused during dash; dedicated jump/land/dash pose sets are **not** claimed.
- `npm run qa:iona:recovery` is the acceptance-specific browser route. Its owner-facing 25–45 second normal-speed Chrome clip, same-chamber rejected-vs-generated comparison, 48/60/72px and contrast captures are indexed in `review-evidence/recovery/README.md`. Audio was not captured or reviewed; no physical controller was tested.
- Recovery status is `B01_RECOVERY_PROVISIONAL`: TECH, ART-MOTION and owner approval remain separate gates. The generated image source pixels are in runtime, but Iona's identity, actual-scale animation quality, and 60px working height await owner playback review. No canonical lock, transformation catalog, enemy AI or B02/B03 work is claimed.

## B01D — provisional run refinement and B02 motion readiness

- B01D is an isolated candidate namespace: `art-source/characters/iona/b01d/`, `art-source/manifests/iona-b01d-candidate-v1.json`, and `public/assets/characters/iona/b01d/`. The runtime preview is `/?animationLab=1&b01d=1`; B01C remains available at `/?animationLab=1&b01c=1`.
- Two native, reference-guided ImageGen sheets add four original run poses per direction. The other B01C frames are retained byte-identically. `tools/art-export/build-iona-b01d.py` reproduces crops, alpha thresholding, palette quantization and anchors; `tools/art-export/audit-iona-b01d.py` verifies hashes, alpha, bounds and size.
- The development lab provides the B01C/B01D toggle, VFX off by default, exact 48/60/72 painted-height scales from generated per-frame bounds, clean/light/busy backgrounds and full-canvas/painted-bounds/anchor diagnostics. Physics and simulation combat timing remain authoritative. A small typed texture-clip helper is shared by B01C/B01D.
- `IONA_PROMOTION_CONFIG.readyToPromote` is false and `ownerApproval` is `PENDING_OWNER_REVIEW`. The candidate is not active in ordinary gameplay. B01D output, scale and motion remain owner-review items; no forms, new audio, B02 acceptance, or B03 content is claimed. Installed Chrome recorded a 67.68-second normal-speed clip, but agent playback was unavailable in this session. The Playwright tab-hidden probe remained unverified and the WebM has no audio track.

## Four form identities

- Base: separate readable head/shoulder/hands/footwork, martial combo and sash secondary motion.
- Dawnrush: real changed upper-body/hair structure + pressure bands, bespoke ground velocity, coral/amber reactive filaments.
- Stormhalo: floating split orbit, collar/coat geometry, angular arm silhouette, precise electric aura, counter animation.
- Eclipse Warden: NEW mask/head, elongated hover body, plated limbs, detached ornaments and energy mantle; full independent attacks, directional art, activation/reversion and staged finisher. NOT a scale or color shift.

**Minimum eventual per-form catalog:** idle/ready, move start/loop/stop, turn, jump rise/apex/fall/land, dash, guard/parry if included, hurt/knockback/KO, interact, light combo 1/2/3, heavy, aerial, special cast/release, finisher anticipation/contact/settle, transform activation/active/reversion/interruption. Frame counts should be artistic, not uniformly four-per-state.

## Asset manifests & retention

Manifest JSON example fields: `assetId`, `form`, `action`, `direction`, `sourceMaster`, `sourceSha256`, `authorTool`, `generationPromptId`, `license`, `canonicalReferenceSha256`, `ownerStatus`, `frameCanvas`, `pivot`, `durationMs`, `hitboxRef`, `eventIds`, `runtimeAtlas`, `integratedScene`, `chromeVideo`, `qaStatus`. Art without provenance or matching runtime integration is not counted as finished. Use `npm run audit:assets` SHA hashes, size checks, cleanup inventory. Exclude scratch, rejected batches, browser videos, ZIPs and redundant previews from Git; archive irreplaceable sources with manifests/checksums. Accept needed large art but measure compressed bundle impact.

## First animation quality gate

Base: idle ↔ run ↔ jump/fall ↔ land ↔ dash, clean L/R, then 3-hit combo plus one first special (original VFX/audio) against an active enemy. Assess real-scale smoothness, face/body identity, feet, limb anatomy, event sync, gamepad and input feel. No expansion until owner says motion looks and plays excellent. If a technique fails twice, evaluate focused manual keyframe correction or alternative method with measurable GO/NO-GO; no endless prompt roulette.

## Motion/VFX accessibility

Aura layers are independent animated choreographies: pressure core, wisps/orbits, reactive ring, particles, shockwave and world lighting. Prioritize readable enemy tells and collision geometry. Screen shake, flashing, bloom, particle counts and backdrop turbulence are adjustable; keep signal even in reduced-flash mode. Source and licensing of audio mandatory; browser WebM may contain **no audio**, and audio quality requires listening on real playback.

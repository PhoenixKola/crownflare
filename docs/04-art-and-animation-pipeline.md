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

## B01 overnight provisional animation pilot

- The overnight brief authorizes replaceable art and a focused Phaser pilot before the B01A owner decision. It does **not** change B01A masters, lock a canonical model or accept the B01 gate.
- New reference illustrations and all hand-authored frame sources live under art-source/characters/iona/overnight/; the separate art-source/manifests/iona-overnight-v1.json records provenance, SVG and PNG hashes, frame IDs, 64x64 canvases, common bottom-center pivot, timings and the single contact event.
- The runtime art is newly hand-authored hard-edged SVG pixel clusters on an integer 64x64 grid, with a visible figure about 60 pixels tall. npm run art:iona:overnight:build rasterizes the retained sources using installed Chrome at 1x, without post-export resizing, into public/assets/characters/iona/overnight/. The generated illustrations are visual references only: the Base reference has an opaque baked checkerboard, and neither illustration is runtime art.
- The authored right-facing frame is mirrored into a corrected left counterpart. This preserves the same costume and swaps the leading copper bracer and teal hair accent together. The sprite stays on a shared bottom anchor; the existing B00 15x30 Arcade body remains the collision authority.
- The real game exposes the provisional work only at /?animationLab=1 in development. R opens the B01A before/after Base, Base left/right and four-form VFX-off review sheet; 1, 2 and 3 put Base at visible 48/60/72-pixel test heights; C cycles calm, light and busy comparison backgrounds. ?artReview=1 remains unchanged.
- Idle, run, start/stop/turn, jump rise/apex/fall/land, dash/recovery and one light jab have authored pose frames. The 42 directional Base animation exports are supplemented by two Dawnrush VFX-off mass-distribution studies. Dawnrush now has a broader stepped shoulder shell and heavy copper pressure bracer; it has no action catalog. Stormhalo and Eclipse Warden remain unchanged B01A comparisons and are not cleaned or approved here.
- stepMovement and Arcade Physics remain authoritative. The jab's 130ms startup, 100ms active window, 260ms recovery and contact at 162ms are declared in the action definition. The combat clock emits move/source/target identity once; the scene resolves a temporary dummy hit or miss at that event. A short original Web Audio triangle thump and target flash are feedback only. The WebM proof has no audio track.
- Full runtime video, screenshots, local commands and owner review status are indexed in review-evidence/overnight/README.md. All art and motion remain PROVISIONAL_OWNER_REVIEW. No three-hit combo, full form animations, enemy AI or owner sign-off is claimed.

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

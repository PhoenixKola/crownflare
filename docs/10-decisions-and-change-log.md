# Project Crownflare — Decisions and Change Log

## 2026-11-07 — B00 implementation

- **Accepted authority:** intact owner handoff v1.0, retained at `docs/project-crownflare-master-creative-technical-roadmap-and-initial-project-handoff.md`.
- **Creative direction:** Iona Rell with Base, Dawnrush, Stormhalo and Eclipse Warden remains a proposed original direction. Names, concepts and the generated board are provisional; owner art approval is **PENDING**.
- **Engine:** Phaser `4.2.1`, verified against the [official Phaser v4.2.1 release](https://phaser.io/download/release/v4.2.1) and installed package/types. Arcade Physics remains the single platform-collision authority.
- **Dependency security:** the starter's Vite `7.1.5` matched current security advisories. It was updated to exact `7.3.7`, which is compatible with this project and passes `npm audit` with zero vulnerabilities. TypeScript remains `5.9.3`; Playwright remains `1.55.1`.
- **Reproducible install:** `npm install` created a real registry-backed `package-lock.json`; a subsequent clean `npm ci` succeeded. Final clean-install and verification results are recorded in `docs/qa/b00-qa-evidence.md`.
- **Verified toolchain:** Node `v22.22.0`, npm `11.11.0`; headed installed Chrome `156.0.8078.80`.
- **Implementation corrections:** keyboard keys are individually typed; canvas focus now waits for Phaser's READY event; Escape has one global owner; input transient state clears at pause/resume; raised-platform landing, platform-edge coyote jump, buffered floor landing, W/Up aliases, dash collision, camera and quit are browser-tested. The window-blur handler is tested with a dispatched blur event; actual tab switching remains open. Combat clock start-time events, save permission fallbacks and variable-height jump release are covered by unit tests.
- **Title/chamber:** original CSS title shell retained. Chamber rectangles and the player rectangle are explicitly temporary programmer art, labeled in the active scene. No combat, attacks, damage, premium audio or playable hero sprites are present.
- **Git/push:** the received `.git` folder was only a partial metadata stub (missing object and ref databases; Git could not read it). It has been initialized as a fresh `main` repository from the inspected source tree, with the owner's supplied `https://github.com/PhoenixKola/crownflare.git` as `origin`, per the explicit push request. No valid baseline commit existed.
- **Duplicate retention:** the root-level provisional board PNG and root-level copy of the master handoff were byte-identical to their canonical `art-source/` and `docs/` copies. Hashes and references were checked; the redundant copies were removed, and the canonical files and manifests remain intact.
- **Provisional board:** the original OpenAI-generated board stays at `art-source/characters/iona/b00-provisional-visual-target-board.png`, SHA-256 `7d7258aa582c8e6da011d43defb3d5adb36833b39c696cf3aaa1895bfbde4d75`. It is reference-only, not runtime art or owner-locked.
- **Current B00 constraints:** physical gamepad input has not been tested. No game audio exists. Build emits a non-fatal warning that the Phaser JavaScript chunk exceeds 500 kB (1,396.99 kB minified / 375.57 kB gzip); no B00 code-splitting change is planned without a measured startup need.

## Owner gates still pending

1. B01 recovery art gate: review generated Base face/proportions, both authored facings, genuine idle/run/jab in normal-speed play, and 48/60/72px scale. The candidate and proposed 60px height are not approved or canon-locked.
2. B01A remains a separate unapproved source direction; the recovery generation used it as a visual reference, not an approval. Dawnrush stays a study until Base passes.
3. Later: a complete production animation catalog, three-hit combo, each transformation, and full release need their own review. No B02/B03 production should begin from green technical checks alone.
4. Public names (`Crownflare`, `Iona Rell`, and form names) remain subject to commercial name clearance.

## 2026-11-07 — B01 overnight output, later rejected

- The earlier implementation generated SVG polygon/rectangle actors and rasterized them into 44 PNGs; two real image-generation outputs were not used for runtime pixels. The owner rejected that actor as `REJECTED_OWNER_ART`.
- Its Phaser lab, jab clock, assets, and evidence remain for audit/regression only. `/?animationLab=1&oldRejectedArt=1` explicitly selects it; the default animation lab no longer does. The overnight QA command is regression-only.

## 2026-11-07 — B01 recovery native image generation and real animation

- Invoked the Codex built-in `image_gen.imagegen` tool seven times for a new Iona Base master and six reference-guided 2×2 sheets: idle, run, and jab for right and left facings. Original generator PNG bytes, output IDs, source references, prompts, dimensions and SHA-256s are preserved in `art-source/characters/iona/b01-recovery/` and `art-source/manifests/iona-b01-recovery-v2.json`.
- The build pipeline crops 24 unique generated poses into 128×80 transparent runtime PNGs at a 60px visible height with nearest-neighbor scaling and a feet/waist pivot. All runtime frames link to exact generated source sheets and cropped-source hashes. There are no mirrored frames or hand-redrawn vector substitutes.
- The real Phaser `/?animationLab=1` route now defaults to the generated image-source sprites. It plays four idle poses and four run poses per facing plus a four-pose jab per facing, connected to the existing B00 body/movement and 130/100/260ms action clock with contact at 162ms. It reuses generated run poses for jump/dash display; dedicated jump and dash art remain unauthored.
- Installed Chrome evidence at `review-evidence/recovery/` includes a normal-speed 27.8-second video, idle/run/jab captures for both facings, generated-vs-rejected A/B at 48/60/72px, contrast variants, and viewport review. The 27.8-second clip has no audio track; audio was not reviewed.
- Recovery remains `B01_RECOVERY_PROVISIONAL`. TECH PASS does not approve the art or lock Iona/60px. No complete forms, combo, enemy AI, physical gamepad test, or B02/B03 content are claimed. B01A source masters remain untouched.

## 2026-11-07 — B01D provisional run refinement and B02 motion readiness

- Added two native reference-guided ImageGen run sheets, one per facing, as source-only provisional art. The B01D exporter crops four articulated poses per direction, uses the established 32-color palette and 128×80 canvas, aligns feet at y=80, and normalizes the new run poses to the B01C run median of 67 visible pixels. No hand-redrawn pixels or frame mirroring were introduced.
- B01D runtime preserves all other B01C action frames byte-identically and replaces only the run loop. Four frames at 105ms keep the 420ms cycle; the playback order gives alternating contact poses at 0ms and 210ms. B00 physics remains 15×30 and combat event times remain 112/138/165ms.
- Added the opt-in `/?animationLab=1&b01d=1` route, B01C A/B display, VFX-off default, exact 48/60/72 painted-height scaling from generated per-frame bounds, clean/light/busy backgrounds, 75% viewport review and frame/anchor diagnostics. The new typed clip helper is shared with the existing B01C module; the B01C route remains available. Neither candidate enters ordinary gameplay.
- `IONA_PROMOTION_CONFIG` remains disabled with `PENDING_OWNER_REVIEW`; the owner decision and cue sheet are in `docs/qa/b01d-owner-decision.md` and `docs/qa/b01d-audio-cue-sheet.md`.
- Installed Chrome 156 produced a 67.68-second normal-speed B01D video (`review-evidence/b01d/iona-b01d-75s.webm`, SHA-256 `b8588efbce7307fffb37ca718a45bd81d2aff489f0aca0194f8ef70b399aee82`). The agent could not play it back because the native computer-use pipe and browser access host were unavailable; the review report records this distinction, the tab-hidden probe outcome, and the video-only/no-audio status. The candidate remains provisional and owner approval remains pending.

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

1. B01 visual lock: review true-scale 48/60/72-pixel silhouettes for all four forms, with VFX disabled and in the actual chamber; choose one immutable Iona master and approve it before producing functional sprite sheets.
2. Later: first playable animation, combat slice, each transformation, and full release each need their own owner review. No B01–B13 production work is included in this B00 implementation.
3. All public names (`Crownflare`, `Iona Rell`, and form names) remain subject to commercial name clearance.

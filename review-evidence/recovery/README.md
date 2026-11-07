# B01 Recovery: Iona image generated sprite review

**Status: `B01_RECOVERY_PROVISIONAL`; owner approval pending.** The old overnight polygon actor is rejected and retained for historical A/B only. This package shows original Codex image generation used directly as the source of the playable pixels; it does not canon lock Iona or the provisional 60px visible height.

## Play the real Phaser lab

From the repository root, run `npm ci`, then `npm run dev` and open:

`http://127.0.0.1:5173/?animationLab=1`

The default lab uses the recovery sprites. `R` opens the A/B board; `1`, `2`, and `3` select the 48px, 60px, and 72px views; `C` cycles the comparison grounds. `A/D` or arrows move, Space/W/Up jumps, Shift dashes, and `J` or left mouse starts a jab. Esc uses the existing pause flow. `&oldRejectedArt=1` explicitly selects the rejected SVG-derived actor for comparison.

The game keeps its 480x270 view and B00 15x30 Arcade body. The art frame is 128x80 with a 60 logical pixel visible figure, anchored at bottom center; art canvas size does not resize physics.

## Generated source and runtime lineage

The native Codex `image_gen.imagegen` capability was invoked seven times. One output is the selected right-facing Base master; six are separate 2x2 sheets for idle, run, and jab in right and left facings. The original output PNG bytes are kept in [`art-source/characters/iona/b01-recovery/generated/`](../../art-source/characters/iona/b01-recovery/generated/). Prompt text and tool output IDs are in [`generation-prompts.md`](../../art-source/characters/iona/b01-recovery/generation-prompts.md) and [`generation-provenance.json`](../../art-source/characters/iona/b01-recovery/generation-provenance.json).

The selected Base master supplies `idle-0-right`; the generated sheets supply the other 23 pose crops. All 24 runtime frames are independently authored facings with no mirroring and no hand-drawn replacement geometry. Crop, runtime, generated-source SHA-256 values, alpha metrics, crop bounds, pivots, pose IDs, and animation timings are recorded in the [provenance manifest](../../art-source/manifests/iona-b01-recovery-v2.json). The generator did not report a model/version, so none is inferred. No API key was used.

Rebuild runtime frames with `npm run art:iona:recovery:build`; install its pinned Python dependency from `tools/art-export/requirements-iona-recovery.txt` first. The exporter thresholds soft alpha to binary transparency, trims source pixels, scales by nearest-neighbor, and places the result on the shared runtime canvas. No white/checkerboard background is present in the runtime frames.

## Chrome playback evidence

The normal-speed [27.8-second Chrome WebM](iona-recovery-30s.webm) was recorded in installed Chrome 156.0.8078.80. It shows idle, run in both directions, the generated airborne run pose and dash fallback, a jab hit, a jab miss, and the review board at multiple scales and contrast settings. Its SHA-256 is `42a7e145003c14861809e0cf23deef2b3718b78bd140d318a1ea547edea60957` (2,378,812 bytes). Source digest recorded by the final recovery browser run: `f1934af04b2a0114754e9af6e510242e4b0b3ef43987e1d49a083fb003024104`. The WebM has no audio track; audio was not reviewed.

| Capture | What it shows |
| --- | --- |
| [Idle, right](iona-recovery-idle-right.png) | Ready pose and clean character/target separation |
| [Run, right](iona-recovery-run-right.png) / [left](iona-recovery-run-left.png) | Both separately generated run facings |
| [Airborne](iona-recovery-airborne-run-pose.png) / [dash fallback](iona-recovery-dash-run-fallback.png) | Existing movement using generated run art; these are not dedicated jump/dash poses |
| [Jab contact, right](iona-recovery-jab-contact-right.png) / [left](iona-recovery-jab-contact-left.png) | Visible contact pose in the actual chamber |
| [A/B at 48px](iona-recovery-ab-48.png), [60px](iona-recovery-ab-60.png), [72px](iona-recovery-ab-72.png) | B01A study, rejected legacy actor, and generated runtime facings at matching scale |
| [A/B at 75%](iona-recovery-ab-75-percent.png) | Comparison board at reduced viewport size |
| [Light](iona-recovery-ab-light.png) / [busy](iona-recovery-ab-busy.png) | Contrast review against alternate chamber grounds |

In the comparison board, the earlier B01A and rejected actor are explicitly labeled studies; neither is represented as approved art. At game scale the generated Iona reads clearly with stable pearl hair/teal accent, navy outfit, copper wrist element, pale sash, visible hands and boots. The source sheets contain some painterly softness that becomes simplified at 60 logical pixels; the run has four poses per facing, below the brief's 6–8 pose target. The owner should judge the real-time cadence and any anatomy or proportion corrections before the art gate passes.

## Animation and known limits

There are 24 unique generated pose crops in runtime: four idle, four run, and four jab poses for each facing. `idle-0-right` is the master; the right idle sheet contributes its other three poses. The jab has windup, extension, contact and recoil pictures connected to the existing 130ms startup / 100ms active / 260ms recovery timing, with contact at 162ms. The lab verifies hit, miss, buffering, pause/focus and resize. Left/right art is generated separately, not mirrored.

Jump and dash preserve the B00 movement state machine but reuse generated run/idle poses. Dedicated jump-rise, fall, landing, dash, hurt, transformation, and three-hit combo art are not included. No physical controller was tested. The WebM is video-only.

## Verification

All required checks ran after a clean install on 2026-11-07:

| Command | Result |
| --- | --- |
| `npm ci` | Passed; 19 packages installed, 0 vulnerabilities |
| `npm run art:iona:recovery:build` | Passed; rebuilt 24 transparent 128x80 frames, four each for idle/run/jab in both facings. |
| `npm run typecheck` | Passed |
| `npm test` | Passed, 27/27 |
| `npm run build` | Passed; JS bundle 1,423.27 kB minified / 383.25 kB gzip; bundle SHA-256 `76d0b0935872cca4992e2fe9e969d30a584d59839d0786ba675ce23c06d94b0b`. Existing >500 kB chunk advisory remains. |
| `npm run audit:assets` | Passed; 187 files / 20,988,325 bytes / 0 individual budget violations |
| `npm audit` | Passed; 0 vulnerabilities |
| `npm run qa:chrome:local` | Passed in Chrome 156.0.8078.80; title, movement, jump, platforms, coyote/buffer, resize, dash barrier, camera, pause/blur/quit; no console errors. Source digest `833af2e23d6f45dc2765d7a09d6a7fd8275f37e1aef912ec99a673fb3d3adb21`. |
| `npm run qa:b01a` | Passed; 26/26 textures, 11 in-engine captures. Source digest `9574b1aace21ce110eb36237a2f7954813a896f09ad27076b8504efc162b5c3e`. |
| `npm run qa:controller:local` | Passed synthetic Gamepad API Start/pause/resume checks; no physical controller tested. |
| `npm run qa:iona:overnight` | Passed as rejected-art regression only; 44/44 historical textures, movement/jump/dash, hit/miss, review/resize, 21-second clip. Source digest `1ecd0e60870145d13cd953ab85b7baea9690b3dc8987ec0a0cfc0dafc18b8949`; clip SHA-256 `cb6c1f5dca72507f536eb2fb61c815322e4155cac5a19df50a8da33928009b76`. |
| `npm run qa:iona:recovery` | Passed; generated default, 24/24 directional textures, idle/run both ways, airborne reuse, jab hit/miss/buffer, pause/focus, scales/contrast/resize; 27.8-second WebM. |

The B00 and B01A runs also refreshed their tracked local Chrome evidence and run reports. Their captured videos are video-only; game audio was not reviewed. A physical gamepad test was not run.

**Gates remain separate:** technical checks can pass while `ART-MOTION` remains pending owner playback review; owner approval remains pending. No B02/B03 or transformation production is authorized by this package.

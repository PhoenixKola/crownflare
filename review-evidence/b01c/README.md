# B01C — Extended Iona animation and combat pilot

## 1. What the player sees and feels

B01C adds an opt-in native pixel animation lab at `/?animationLab=1&b01c=1`. In that lab, Iona has a four-pose idle, six-pose run cycle, start/stop/turn transitions, six dedicated jump poses, dedicated dash and recovery poses, plus a buffered three-hit combat pilot: lead palm, side kick, rising forearm. The original 15×30 movement body and B00 collision behavior stay in control.

Controls: **A/D** move, **Space** jump, **Shift** dash, **J** starts/buffers the combo, **R** opens the pixel-method board, **C** changes its background, and **1/2/3** compare 48/60/72-pixel display sizes. B01C remains a development lab; it does not replace the shipping B00 actor or imply the visual direction is canon.

## 2. Baseline and preservation

- Started from clean `main` at `12b72c9eb959a2ae50a9ad0fbd3870a26a3e1965`. The root B00 brief deletion was already committed there and was not restored.
- Kept the B01 Recovery source masters, exports, and manifest unchanged. B01C output lives under its own source and runtime directories.
- No Veyrshift or third-party character art was used. No packages or image tools were installed.
- Phaser integration is opt-in and the body size reports 15×30 throughout the Chrome run.

## 3. Research decisions

The existing pinned Pillow pipeline was sufficient for binary alpha, precise source cropping, nearest-neighbor scale, fixed runtime canvases, and source-to-output hashes. The project’s installed Phaser 4.2.1 supports animations made from separate texture keys and per-frame timing, so the pilot uses real Phaser `Sprite` animation clips. See [research decisions](../../docs/qa/b01c-research-decisions.md) for package checks and official references.

## 4. Native image-generation proof

All accepted source sheets are original native ImageGen outputs, retained unchanged under `art-source/characters/iona/b01c/generated/`. The exact prompts, output IDs, source references, rejected checkerboard attempt, and superseded combo cells are recorded in [generation prompts](../../art-source/characters/iona/b01c/generation-prompts.md) and [generation provenance](../../art-source/characters/iona/b01c/generation-provenance.json). The tool did not report a model/version, so the manifest leaves that field unknown. No source pixels were hand-redrawn.

The first combo board made strikes one and two too similar. Those step-two cells are recorded as superseded; separate side-kick sheets now provide a clearly different middle attack in both directions.

## 5. Source → pixel cleanup → runtime → Phaser

The sources are 1536×1024 RGBA sheets. The exporter thresholds alpha at 192, crops two-by-three and three-by-three grids with rounded cell boundaries, trims empty edges, scales with nearest-neighbor, quantizes through one shared 32-color palette without dithering, and writes 128×80 transparent PNGs. Grounded poses align to x=64 with feet at y=80; their median visible height is 60 pixels. Left and right poses were generated independently. Every runtime frame has a source hash, crop hash, runtime hash, crop bounds, scale, and anchor entry in the [production manifest](../../art-source/manifests/iona-b01c-production-v1.json).

The manifest contains **72 runtime frames**: 36 unique poses in each facing. `npm run art:iona:b01c:build` recreates those frames and the review sheets without changing the original Recovery exporter.

## 6. State coverage matrix

| State | Authored coverage | Chrome evidence |
|---|---|---|
| Idle | Four poses per facing | [right idle](iona-b01c-idle-right.png) |
| Start / stop / turn | Two generated start and stop frames; separate turn transitions | [right start](iona-b01c-start-right.png), [left-to-right turn](iona-b01c-turn-left-to-right.png) |
| Run | Six independently authored poses per facing, 70 ms each | [right run](iona-b01c-run-right.png), [left run](iona-b01c-run-left.png) |
| Jump | Load, takeoff, rise, apex, fall, landing compression per facing | [rise](iona-b01c-jump-rise.png), [apex](iona-b01c-jump-apex.png), [fall](iona-b01c-jump-fall.png), [land](iona-b01c-jump-land.png) |
| Dash | Six authored phases per facing, split between active and recovery clips | [active](iona-b01c-dash-active.png), [recovery](iona-b01c-dash-recovery.png) |
| Combo | Three original attacks × windup/contact/recovery × both facings | [right contacts](iona-b01c-combo-1-contact.png), [side kick](iona-b01c-combo-2-contact.png), [rising strike](iona-b01c-combo-3-contact.png); [left side kick](iona-b01c-combo-2-contact-left.png) |

The complete [action contact sheet](iona-b01c-action-contact-sheet.png) shows every runtime pose. The same-pose [pixel-method comparison](iona-b01c-pixel-method-comparison.png) shows existing nearest export, shared-grid cleanup, and native-edit cleanup at equivalent size.

## 7. Combat and motion timing

| Step | Move | Startup | Active | Recovery | Contact event |
|---|---|---:|---:|---:|---:|
| 1 | Lead-hand palm | 90 ms | 80 ms | 170 ms | 112 ms |
| 2 | Side kick | 110 ms | 90 ms | 170 ms | 138 ms |
| 3 | Rising forearm | 140 ms | 100 ms | 220 ms | 165 ms |

Each fresh J press starts the first strike or buffers one next step for 650 ms. A held key does not auto-repeat. The Chrome check verified that the contact image matched the combat clock’s active frame for all three hits in both facings, and that a facing-away contact missed without damage. This is a deterministic training-dummy pilot, not B03 combat gold.

## 8. Real Chrome and audio evidence

Installed Chrome **156.0.8078.80** recorded a normal-speed **67.44-second, 1280×720** WebM. `ffprobe` confirmed the encoded duration and that no audio track was captured. Audio playback therefore remains unconfirmed. The report includes the video and test-time source SHA-256 values, all seven contact events, and zero browser errors: [QA report](qa-report.json), [60-second-plus video](iona-b01c-60s.webm).

The capture covers both run directions, jump and dash transitions, review scales/backgrounds, buffered hits and misses, both authored combo directions, pause/resume, blur, and resizing. Separate [contact screenshots](iona-b01c-combo-1-contact-left.png), [side-kick contact](iona-b01c-combo-2-contact-left.png), and [rising contact](iona-b01c-combo-3-contact-left.png) make the left-facing frames easy to inspect.

## 9. Test, build, and asset audit

- `npm run art:iona:b01c:build` — PASS, 72 frames, shared palette of 32 colors.
- `npm run typecheck` — PASS.
- `npm test` — PASS, 30 tests, including B01C frame, clip timing, and source/runtime manifest checks.
- `npm run build` — PASS. Vite reports the existing Phaser JavaScript bundle is larger than 500 kB (1.43 MB minified); this pilot did not split the bundle.
- `npm run audit:assets` — PASS, 277 files / 43,165,137 bytes, zero individual budget violations.
- `npm audit` — PASS, zero vulnerabilities.
- `npm run qa:iona:b01c` — PASS in installed Chrome; 72/72 textures, 15×30 body, all listed movement states, both combo facings, contact timing, buffer, facing miss, held-input behavior, pause and resizing.
- `npm run qa:chrome:local` — PASS, installed Chrome B00 movement/chamber regression.
- `npm run qa:controller:local` — PASS with synthetic Gamepad API; this is not a physical-controller test.
- `npm run qa:iona:recovery` — PASS, original 24-texture Recovery animation and combat regression.

## 10. Three gates

- **TECH: PASS.** Build, unit, asset, dependency, B00, controller API, B01 Recovery, and B01C Chrome checks passed.
- **ART-MOTION: PROVISIONAL PASS.** The six-pose run was cohesive enough at normal speed to clear B01C’s conditional combo-art gate; the resulting palm / kick / rising strike sequence reads as three distinct moves and is event-synchronized.
- **OWNER APPROVAL: PENDING.** Iona’s canonical identity, the 60-pixel working scale, and all generated art remain provisional until you review them. No B01 art lock or B03 completion is claimed.

## 11. Known weaknesses and next batch

- The sheets were image-generated; poses still need an artist’s continuity pass for hands, hair, scarf tails, and frame-to-frame anatomy. No hand redraw was performed.
- The idle/turn clips and upper-body anticipation deserve more frames if they become production candidates. The contact sheet is an inspection aid, not a canonical sprite atlas.
- Audio is not proven, physical controller feel is not tested, and the training dummy has no enemy AI or hurt animation. There is no heavy, aerial, or special move yet.
- The next decision is owner review of face, hair, handed details, palette, body proportions, and the 48/60/72 scale board. If approved, continue into B02 movement polish and original audio capture; carry the combo into B03 only after its normal-speed feel is reviewed.

## 12. Commit, push, and handoff

The B01C pilot, native source files, manifests, runtime frames, research, test harness, and browser evidence are delivered in the commit containing this report. The commit hash and remote result are reported in the completion message; publishing these provisional artifacts does not imply owner visual approval.

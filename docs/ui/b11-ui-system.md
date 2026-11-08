# B11 UI system and rendering review

## What existed before B11

The ordinary entry flow was already **title → Spindle Refuge → departure story → B10 expedition → results/Refuge**. The Refuge owned New Run, Continue, controller settings, reduced motion, master volume, completion count and Beacon state. The Vesper arrival story appeared at its authored run boundary. These flows and their V2 save/checkpoint semantics were present before this batch.

The B10 expedition hid the generic DOM HUD. Its room, route, vitals, build and boss readouts were Phaser text and graphics drawn over the 480×270 world. The B09 reward dialog, controller settings, pause and results used separate DOM layouts. The game and canvas already used Phaser `FIT`, `pixelArt`, nearest-neighbor CSS rendering and the 480×270 logical surface. The follow camera called `startFollow(..., false, ...)`, which resets `roundPixels` to false; that contradicted the game's pixel-art renderer configuration.

No pre-change screenshots were retained. This inventory comes from the actual route code and asset/config audit, rather than a reconstructed visual comparison.

## B11 UI components

| Component | Implemented behavior | Source of truth |
| --- | --- | --- |
| `B11 HUD overlay` | Five real HP cells, player form, Resonance and Dawnrush gauges, room/region/objective, repairs, build summary, action dock, prompt and brief hit/heal/energy/upgrade cues. | `B07ExpeditionScene.b07Snapshot().hud`, live combat/form snapshots, room objective/prompt, route and build state. |
| `Boss panel` | Shows only during a real boss encounter; name, epithet, boss HP, phase number, tell/commit/recovery/KO state. | Existing `b08` runtime snapshot and `B08_BOSS_PROFILES`. |
| `Ability dock` | Seven original action icons; keyboard prompt plus the saved standard-pad binding when a pad is detected; readiness, cooldown, form lock and aerial-only states. | `KEYBOARD_CODES`, saved `project-crownflare:controls:v1`, live combat/form state. |
| `Panel and action tokens` | Shared borders, ink panels, pearl text, teal readiness, copper emphasis, focus rings, primary/secondary actions and restrained transitions. | `src/ui/b11.css` tokens; applied to title, Refuge, story, pause, settings, reward and results screens. |
| `Settings preferences` | Existing controller remapping plus working master volume and reduced-motion inputs, persisted through the current V2 save options. | `save.ts`; updates the Phaser scene and audio volume live. |
| `Canvas-aligned HUD` | Positions the readable DOM overlay to the actual Phaser canvas bounds and re-syncs after viewport resize. | Canvas `getBoundingClientRect()`; no dependency on inferred scale factors. |

The normal B10 room and boss surfaces suppress duplicate Phaser HUD labels while retaining the scene's objective and prompt state for the DOM view. The B07 route-choice panel remains the existing Phaser interaction surface and keeps its pause/choice behavior.

## Tokens and layout

- Ink `#07131f`, deep panel `#0b1a26`, raised panel `#162d39`, pearl `#f1ead9`.
- Signal teal `#70dccd`, pale teal `#b7f1df`, copper `#d79a72`, danger `#ed8c79`.
- Display text uses the existing system/Arial Narrow stack. Metadata uses Cascadia Code/Consolas/monospace. No web-font dependency was added.
- B10 HUD text remains DOM text at display resolution; generated action art and the gameplay canvas retain nearest-neighbor rendering.
- At narrow windows, Phaser preserves the 16:9 game area with letterboxing. The HUD follows that area; compact portrait mode keeps the icons and mapped keys and removes their redundant visible captions while retaining accessible names and titles.
- Controller settings switch to a viewport-filling panel at compact widths. Its control rows scroll beneath a fixed header and save/cancel footer, keeping the actions reachable on a 352×266 window.
- Existing saved `reduceMotion` also disables the new transitions and HUD flash. No new, unpersisted accessibility toggle was exposed.

## Pixel rendering decision

The game remains **480×270**. `Phaser.Scale.FIT` preserves the aspect ratio, and `pixelArt: true`, `render.pixelArt: true`, `antialias: false`, and `roundPixels: true` remain enabled. The player camera now passes `true` to `startFollow` for pixel rounding; Phaser documents that `startFollow` resets `roundPixels` unless its rounding argument is supplied ([Phaser camera documentation](https://docs.phaser.io/phaser/concepts/cameras)). The canvas and B11 icon images use pixelated/crisp CSS rendering. The HUD is aligned to the fitted canvas, including after resizing.

The runtime smoke checked the existing **15×30** player collision body and Base→Dawnrush transform. It also sent jump, light attack and dash input. This was a targeted input/render check, not a frame-by-frame approval of every idle, crouch, jump, landing, dash, hurt and attack pose in both forms. The screenshots below are the evidence for visual review; no owner art sign-off is implied.

## Generated action art and provenance

Codex native ImageGen generated one retained transparent 4×2 action atlas. Output ID, prompt, source SHA-256, crop bounds, alpha-derived bounds, runtime paths, and runtime SHA-256 values are recorded in [`art-source/manifests/b11-ui-icons.json`](../../art-source/manifests/b11-ui-icons.json). The retained master is [`action-icon-atlas.png`](../../art-source/ui/b11/action-icon-atlas.png). A first generation call did not expose its output path/ID through the wrapper and was discarded; the manifest records that limitation and identifies the retained source output.

The reproducible builder [`build-b11-ui-icons.py`](../../tools/art-export/build-b11-ui-icons.py) extracts equal row-major cells, bounds by source alpha, centers the pixels and exports transparent 96×96 nearest-neighbor PNGs. Runtime mapping:

| Action | Runtime icon |
| --- | --- |
| Light combo | `public/assets/ui/b11/actions/light.png` |
| Heavy | `public/assets/ui/b11/actions/heavy.png` |
| Aerial | `public/assets/ui/b11/actions/aerial.png` |
| Resonance / Solar Drive | `public/assets/ui/b11/actions/resonance.png` |
| Dash | `public/assets/ui/b11/actions/dash.png` |
| Dawnrush transform | `public/assets/ui/b11/actions/transform.png` |
| Dawnfall finisher | `public/assets/ui/b11/actions/finisher.png` |
| Iona crest | `public/assets/ui/b11/actions/iona-crest.png` |

The twelve B09 original upgrade icons remain in use on their existing reward cards.

## Screenshot matrix

The B11 headed-Chrome run writes local screenshots and a concise JSON report to ignored `review-evidence/b11/`. These captures are not part of Git.

| View | Capture |
| --- | --- |
| Title / Refuge / departure story | `b11-title-1280.png`, `b11-refuge-1280.png`, `b11-story-1280.png` |
| Base HUD / Dawnrush HUD | `b11-base-hud-1280.png`, `b11-dawnrush-hud-1280.png` |
| Live B10 practice boss HUD | `b11-live-boss-hud-1280.png` |
| Upgrade / pause / controller settings | `b11-upgrade-choices-1280.png`, `b11-pause-1280.png`, `b11-controller-settings-1280.png`, `b11-settings-compact-352.png` |
| Result and return | `b11-results-defeat-ui-only.png`, `b11-return-refuge.png` |
| Pixel sharpness and responsive layout | `b11-sharpness-canvas-1280.png`, `b11-sharpness-canvas-1920.png`, `b11-narrow-laptop-1152.png`, `b11-compact-390.png` |

The boss capture uses the existing B10 practice query for the Sundial Custodian and reads its real B08 simulation snapshot. The reward capture uses a deterministic offer generated from the current run build, opened only to inspect presentation; no reward is selected. The result screenshot is a test-only injected **defeat** event, so it checks the results/return UI without claiming a completed campaign or fake victory.

## UI acceptance matrix

| Screen / system | Implemented | Checked | Pending |
| --- | --- | --- | --- |
| Title | Shared palette, save-aware metadata and focus treatment | Headed Chrome at 1280×720 | Owner visual approval |
| Refuge / Beacon | Existing B10 art and state; shared actions and save progress | Headed Chrome; New Run and settings entry | Continue with a real checkpoint in this batch's short smoke |
| Story | Shared readable modal treatment; existing story behavior retained | Departure story opened and captured | Longer repeat-run dialogue pacing review |
| Base / Dawnrush HUD | Live resources, form, action states, prompts, room, build and repairs | Real B10 scene; transform and targeted movement/combat inputs; 15×30 body | Full pose-by-pose animation pass and physical gamepad |
| Boss HUD | Boss health/name/tell/phase | Live B10 Sundial practice state | All three bosses/phases in a final visual campaign |
| Upgrade choices | Existing offer/library in shared cards | Deterministic offer presentation; no state mutation | Full earned reward selection in combat |
| Pause / settings | Shared panels; mapping, volume and reduced motion | Opened from Refuge and pause; synthetic standard pad labels | Physical controller and audio listening |
| Results / return | Detailed actual result fields and B10 Refuge return | Results/return layout via isolated UI-only defeat event | Genuine victory/defeat lifecycle in full campaign |
| Pixel scaling | FIT, rounded follow camera, nearest sampling, canvas-aligned HUD | 1280×720, 1920×1080, 1152×720, 390×844 and resize screenshots | Owner visual approval at true display size |

## Carry-forward: B12 / B13

- Complete a final visual review of every Base and Dawnrush pose, including crouch, landing, hurt, dash and attack transitions at equal standing scale.
- Exercise wall, ceiling, lift, dash, knockback, strike direction and boss-tell readability in focused collision scenarios. The HUD change did not alter physics or the 15×30 body.
- Review the two-region authored route for repeated room silhouettes, hazard/enemy combinations and branch consequences. A two-region run with three bosses and twelve upgrade definitions does not by itself establish the requested 2–4+ hours of replayable content or 30–45-minute run length.
- Run the longer multi-seed, full victory/defeat, physical-controller, performance and balance gates at B13. This batch did not include a physical controller, human audio listening, owner art approval or a full expedition campaign.

# B01 overnight Iona pilot

**Status: PROVISIONAL_OWNER_REVIEW.** This is a replaceable art/motion experiment authorized ahead of the B01A art decision. It does not approve Iona, lock the 60px scale, complete B01B, or change any B01A source or manifest.

## Open the live Phaser lab

Run from the repository root:

    npm ci
    npm run dev

Open http://127.0.0.1:5173/?animationLab=1. The route starts directly in the development-only lab. Controls are:

- A/D or arrows: move and face.
- Space/W/Up: jump; hold/release controls the existing variable jump.
- Shift: dash.
- J or left mouse: provisional light jab.
- R: open or close the comparison sheet.
- 1/2/3 while the sheet is open: compare Base at visible 48/60/72px.
- C: cycle calm, light and busy comparison grounds.
- Esc: pause/resume through the existing B00 pause flow.

The 15x30 Arcade body, platforms, camera, and stepMovement remain the B00 authority. Art uses a 64x64 transparent canvas with a ~60px visible figure and bottom-center anchor. The lab's dummy is a temporary range/facing target, not an enemy or a production health system.

## Evidence captured in installed Chrome

iona-animation-lab.webm is a 21-second normal-speed recording from installed Chrome 156.0.8078.80 (1,916,744 bytes; SHA-256 5c397de1d40320bc61ff99227692164006431fc361835d6390293be074e5a85a). The browser video has no audio track; the successful jab makes a short original Web Audio triangle thump during live playback.

| Capture | What it shows |
| --- | --- |
| [Idle](iona-idle-calm.png) / [landing](iona-land.png) | Idle loop after landing and ground contact |
| [Run right](iona-run-right.png) / [run left](iona-run-left.png) | Direction handling and authored gait poses |
| [Jump/fall](iona-jump-fall.png) / [dash](iona-dash.png) | Existing B00 motion paired with the new poses |
| [Jab contact](iona-jab-contact.png) | Contact pose and temporary target hit feedback |
| [Review at 48px](iona-review-base-48.png), [60px](iona-review-base-60.png), [72px](iona-review-base-72.png) | Base before/after, both directions and an unchanged 15x30 collision reference |
| [VFX-off forms, calm](iona-review-calm.png), [light](iona-review-light.png), [busy](iona-review-busy.png) | Base, Dawnrush, Stormhalo and Eclipse Warden silhouettes |
| [75% review](iona-review-75.png) | Full comparison sheet at a 960x540 viewport |

All captures show the actual 480x270 Phaser chamber scaled by Chrome to the requested viewport. The before image and Stormhalo/Eclipse Warden are unchanged B01A outputs. Dawnrush and the overnight Base candidate are new provisional work.

## Art and animation source

- Retained authored SVG sources: ../../art-source/characters/iona/overnight/frames/.
- Generated reference illustrations: ../../art-source/characters/iona/overnight/iona-overnight-base-generated-reference.png and iona-overnight-dawnrush-generated-reference.png. These are composition references only. The Base image's opaque checkerboard is baked into its RGB; neither illustration supplies runtime pixels.
- Provenance, source/output hashes, alpha bounds, anchor, durations and event metadata: ../../art-source/manifests/iona-overnight-v1.json.
- Rebuild all 44 transparent 64x64 PNG outputs with npm run art:iona:overnight:build.
- 42 outputs are 21 Base animation poses authored for each facing; two more are Dawnrush VFX-off shoulder/bracer comparison studies. The left Base is a reviewed counterpart made by mirroring the same pixel artwork, so the copper lead bracer and teal front lock move together.
- Base clips: three unique idle drawings in a four-entry loop; four run drawings; start/stop/turn; jump rise/apex/fall; two landing poses; dash compression/extension/recovery; and one jab with windup/contact/recovery. Clip timing and combat event data are recorded in the manifest and typed source.

## Verification

Run the overnight real-browser route:

    npm run qa:iona:overnight

That run uses installed Chrome, records a normal-speed clip, checks all 44 textures, movement, jump, dash, hit and miss, buffered contact, pause/focus/resize, and captures the review sheet. The existing B00, B01A and synthetic Gamepad API smoke routes should also be rerun before any later integration:

    npm run typecheck
    npm test
    npm run build
    npm run audit:assets
    npm audit
    npm run qa:chrome:local
    npm run qa:b01a
    npm run qa:controller:local

Captured verification on 2026-11-07:

| Check | Result |
| --- | --- |
| Clean install | npm ci passed; 19 packages added; 0 install vulnerabilities |
| TypeScript and unit tests | npm run typecheck passed; npm test passed 23/23 |
| Production build | npm run build passed; output bundle SHA-256 7e870a3605f13521fa7a824adf134d5dbb9c5ccb0009ce6506d016c6d04b965b |
| Build note | Existing large-chunk advisory remains: 1,420.15 kB minified / 382.60 kB gzip |
| Asset and dependency audits | npm run audit:assets passed: 128 files / 9,670,759 bytes / 0 budget violations; npm audit found 0 vulnerabilities |
| B00 local Chrome | Passed movement, jump, platforms, buffer/coyote, resize, dash barrier, camera, pause/blur/quit; source digest 1a669cdc21004d57b8d2b63b0a3867182e7fab603cb2374f3eca258ebfe17c79 |
| B01A review | Passed in installed Chrome; 26/26 textures loaded; 11 captures; source digest c60f1c0adb83c6bdbaa33cb872b4b0a0f578225b7cc9c1f32f2c1c0a24a516e5 |
| Overnight lab | Passed in installed Chrome; 44/44 frames; buffered keyboard and mouse hits, facing miss, pause/focus and scale review; 21-second clip; source digest ec7449c338f218525fa0157ead770d7198705a1d00c8157d3f698d8e4be80850 |
| Controller route | Synthetic Gamepad API Start/resume passed. No physical gamepad was tested. |

The production bundle asset SHA-256 is separate from the runtime QA source digest, which covers the lab scene, controls, combat clock, frame module, export source and current manifest.

The unit suite covers clip timing, missing directional references, the provisional frame manifest and one-time combat metadata. The overnight Chrome test does not claim physical-controller testing. The jab is one complete pilot hit; there is no three-hit combo, enemy AI, full transformation animation, canonically approved art/scale, or B02/B03 content in this batch.

## Owner review

Please **approve or revise** the Base face/proportions, corrected left/right model, and proposed 60px height. Separately, please **approve or revise** the Dawnrush silhouette mass. Keep Stormhalo and Eclipse Warden as B01A comparisons for now. All B01A master files and their manifest remain untouched.

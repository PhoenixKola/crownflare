# B16 Report: Base Iona, Render Sharpness, UI Readability

**Result:** Base face **PASS** | Render clarity **PASS** | UI legibility **PASS**

## Findings and changes

### Base Iona face

The active game uses the B01E 128x80 character frames. B15's review locator had changed 31 of 70 candidate frames; the shipped base art still had an isolated pupil in most poses. I reviewed both facings across idle, start/stop, run, jump, dash, turn, and all three combo sets.

The B16 map treats **67 open-eye frames with 150 exact, in-palette pixel edits**. The existing pupil stays in place; reviewed frames gain a restrained upper lid, opposite-gaze sclera pixel, and warm lower edge where the authored neighboring pixels safely allow it. Two anchors without a confident automatic locator were reviewed manually: `start-1-left` and `jump-1-left`.

Three poses stay unchanged because their eye should not be forced into the standard pattern:

- `dash-2-left`: the face is compressed into the dash motion.
- `turn-1-left`: the fringe occludes the turning face.
- `idle-3-right`: it already has a distinct teal eye glint.

`art-source/manifests/iona-b16-base-face-map-v1.json` records all 70 active frames, baseline file hashes, exact pixel coordinates and colors, and preservation reasons. `build-iona-b01e.py` validates those baselines before editing and rewrites the runtime manifest hashes. The B01E audit verifies that each changed frame differs only at mapped eye pixels. Canvas size, transparency, palette, foot anchors, body collision and animation timing remain unchanged. The 62 reused B01D base poses are now described as reused poses, rather than byte-identical final images.

Evidence: [native 1x frame contact sheet](docs/reviews/b16/iona-base-face-native-1x.png) | [6x nearest-neighbor eye detail](docs/reviews/b16/iona-base-face-detail-6x.png)

### Render clarity

The runtime is Phaser 4 with Vite and a separate DOM UI, not Next.js. It renders a 480x270 game canvas with Phaser pixel-art sampling, antialiasing disabled, rounded camera pixels and nearest-neighbor CSS sampling. Phaser text already gets a 3x texture resolution. I found no global canvas blur or smoothing filter to remove.

The reproduced issue was the default integer-only zoom: at 1366x768 it displayed a 960x540 canvas, leaving large bars and making the game feel undersized. At 1920x1080, the existing 4x scale already filled the view. The default `SHARP / ADAPTIVE FIT` mode now keeps a whole physical-pixel scale when it fills at least 90% of the available 16:9 view; otherwise it uses the largest crisp nearest-neighbor fit. The separate `FIT TO WINDOW` mode remains a fractional fit at every size. No cropping or aspect-ratio stretch was introduced.

- 1920x1080: 4x, 1920x1080 CSS canvas, 480x270 backing buffer.
- 1366x768: 2.8444x, 1365.33x768 CSS canvas, 480x270 backing buffer; the remaining fractional width is centered and sampled with `image-rendering: pixelated`.

Evidence: [1366x768 before and after (old 2x canvas reproduced in the same B10 scene)](docs/reviews/b16/rendering-before-after-1366.png) | [1920x1080 after](docs/reviews/b16/game-after-1920.png)

### UI legibility

The settings screen now uses two columns on desktop: controller bindings and dead zone on the left, accessibility and scaling on the right. At 1366x768 the panel has no horizontal overflow and only a 6px vertical scroll remainder. Desktop binding labels are 12.48px and scaling help is 10.56px. The scaling selector and its live status now explain the adaptive nearest-neighbor behavior accurately.

The production B11 HUD remains DOM-rendered at display resolution. Its smallest gauge labels are now 10.24px and ability labels 10.08px, with stronger muted-text contrast. Hub progress/preferences, upgrade metadata, result statistics, and pause controls also receive modest desktop readability increases while keeping the existing Crownflare style. Keyboard and controller paths were not changed.

Evidence: [settings before/after at 1366x768](docs/reviews/b16/settings-before-after-1366.png) | [hub before/after](docs/reviews/b16/hub-before-after-1366.png) | [pause overlay](docs/reviews/b16/pause-after-1366.png) | [title screen](docs/reviews/b16/title-after-1366.png)

## Verification

- `npm run build` | passed (`tsc --noEmit` and Vite production build). Vite retains its existing large-bundle advisory.
- `node --experimental-strip-types --test tests/unit/display-scaling.test.ts tests/unit/ionaB01eProduction.test.ts` | 7/7 passed.
- `python tools/art-export/audit-iona-b01e.py` | passed: 70 frames, 67 repaired, 3 preserved, all mapped pixel edits validated, 128x80 canvas and B00 timing/body gates preserved.
- Chromium smoke at 1920x1080 and 1366x768 | title/hub to B10 gameplay; canvas dimensions and pixel sampling checked; settings and pause inspected; no page or console errors. The 1366 settings panel has 1078px content width with no horizontal overflow. B10 game screenshots confirm the B11 HUD remains aligned to the canvas.

## Scope and remaining caveat

This batch changes the shared web/Electron game source, so the same canvas scaling, sprites and CSS UI are used by either shell. It does **not** build or package a new Electron release; B16 explicitly excludes release work. The visual checks used Chromium at device scale factor 1; higher-DPI zoom selection is covered by the focused unit tests. No Stormhalo files or earlier B15 review outputs were modified.

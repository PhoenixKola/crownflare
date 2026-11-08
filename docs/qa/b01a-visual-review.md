# B01A — Iona Original Art Direction & True-Scale Review

**Review state:** Technical review package assembled; every art asset is `PENDING_OWNER_REVIEW`. This is not a canonical lock, completed animation, or B01 completion.

## Repository baseline

At entry, the checked-out repository was on `main` at `f1618843e06973a2582583b2bcf3d0185496a3e8`. The only pre-existing worktree change was the deletion of `b00-initialize-original-pixel-action-roguelite.md`; it was left untouched and is excluded from the B01A commit. The prior visual board, `art-source/characters/iona/b00-provisional-visual-target-board.png` (SHA-256 `7d7258aa582c8e6da011d43defb3d5adb36833b39c696cf3aaa1895bfbde4d75`), remains concept inspiration with no owner approval, no canonical source, and no runtime integration.

## Owner-visible review

Open the development server with `?artReview=1` (or run `npm run qa:b01a` for captured views). The mode uses the existing Phaser 4 `Chamber` scene, its 480×270 logical canvas, camera/world scale, and B00 collision-room geometry. It loads the actual PNG previews in `public/assets/characters/iona/b01a/`; ordinary play still starts with the B00 programmer actor. Press **V** to cycle Base scale, four color forms, silhouettes, direction, and materials; **C** changes contrast, **G** toggles the pixel grid, **1/2/3** select silhouette height, and **Esc** exits.

The backdrop and platforms are a neutral visual-review treatment over the B00 chamber, not proposed shipping environment art. The coral rectangle is the unchanged 15×30 B00 collision reference. Candidate art is anchored by its bottom center at the shared 241px ground line; the rendered visual height is not a proposed collision change. No VFX are active in the silhouette view.

## Preferred candidate and scale

**Recommended for owner review:** `iona-b01a-base-recommended`, right-facing source `art-source/characters/iona/b01a/iona-base-recommended-master-source.png`, SHA-256 `c5cd65ee4eab727f389696638171f9cb0f23764c8ae8be3652c79e761bec7418`.

Use **60 logical pixels** as the review target. The 48px version compresses the face, hands, and wrist hardware into fewer pixels and is least legible. The 60px version gives the strongest balance between readable head/limb separation and room above the existing collision body: at 60px art height, the sprite is twice the B00 30px body height. The 72px version exposes more material but places more visual mass above that unchanged body and competes with the 270px chamber height. These captures assess still readability only; there are no attacks, animation frames, or combat hitboxes in B01A.

At true logical scale the head, jacket, forearm cuffs, sash, boots, and silhouette read as separate groups; the eye, fingers, and small copper hardware do not yet hold up as production pixel detail. The masters were generated as larger raster illustrations and deterministically hardened/cropped/nearest-neighbor resampled. They need a deliberate pixel cleanup pass before a canonical production lock. The manifest records all source dimensions, alpha bounds, processing, and hashes; the high-resolution sources remain unchanged.

## Candidate inventory and provenance

All five original image-generation results below were created for this project with OpenAI's built-in `image_gen` tool; the model/version was not exposed by tool metadata. Generation prompts and tool references are recorded in [`b01a-image-generation-prompts.md`](../../art-source/manifests/b01a-image-generation-prompts.md). No external art or tracing was used.

| Asset ID | Form / direction | Source | SHA-256 | Owner status |
|---|---|---|---|---|
| `iona-b01a-base-recommended` | Base / right | `art-source/characters/iona/b01a/iona-base-recommended-master-source.png` | `c5cd65ee4eab727f389696638171f9cb0f23764c8ae8be3652c79e761bec7418` | Pending |
| `iona-b01a-base-left-study` | Base / purpose-drawn left | `art-source/characters/iona/b01a/iona-base-left-facing-study-source.png` | `d1108871dc7439b0ef2f56a04b578208dbe437d16b3c4f036705655f72c5da78` | Pending |
| `iona-b01a-dawnrush-study` | Dawnrush / right | `art-source/characters/iona/b01a/dawnrush-study-source.png` | `2ffd7c8952f21637a20d233019f0500d56331046d318a690da4665d38eafe1dd` | Pending |
| `iona-b01a-stormhalo-study` | Stormhalo / right | `art-source/characters/iona/b01a/stormhalo-study-source.png` | `6ce4b0be363bdd787f035ca8a8b07565aa13803c56571aa4b78733850120e995` | Pending |
| `iona-b01a-eclipse-warden-study` | Eclipse Warden / right | `art-source/characters/iona/b01a/eclipse-warden-study-source.png` | `a5e5f097a41191e6689b5e23e24f80b7a2d2ab06fb30be409c3bc830c23bbf88` | Pending |

The non-mirrored left-facing Base is a separate generated study, not a blind flip. It retains the teal hair accent on its authored side but has not been hand-corrected to match the right-facing source at pixel level. Treat the two images as a handedness comparison, not a locked directional pair.

Preview generation is reproducible with `npm run art:b01a:build`. It applies alpha threshold 128, tight alpha crop, and nearest-neighbor resampling to 48/60/72px targets; the silhouettes are black masks of those same color previews. It does not claim to reduce the generated source to a hand-authored limited palette. The swatch sheet is a candidate palette reference, not a measured palette extraction.

Candidate swatches shown on the sheet:

| Material | Hex |
|---|---|
| Pearl | `#E4D7D0` |
| Navy | `#282743` |
| Slate | `#68657B` |
| Teal | `#35AEB0` |
| Copper | `#A8694E` |
| Skin | `#E9A480` |

Proposed edge vocabulary for a later cleanup pass: deep navy contour, mostly one logical pixel at 60px scale; use slate in compact two/three-pixel shadow clusters and pearl for deliberate light facets. The generated/resampled sources currently vary in outline width and tonal count, so these are cleanup rules rather than claims about the current pixel data. Re-author opposite-facing art instead of mirroring; keep the single teal lock on the leading side, preserve the anatomical copper wrist, and place the sash behind the body. The current directional pair is a visual check only and still needs pixel-level alignment. Camera anchor remains the B00 16:9 viewport at 480×270; all comparisons share the 241px grounded foot line, with the art origin at bottom center. The coral 15×30 rectangle is the unchanged collision reference.

## Review evidence

Captured in installed headed Chrome in the actual in-engine review route. The screenshot set and source/evidence digest are recorded in [archived locally: `run-report.md`](review-evidence-archive.md#b01a).

- Base scale comparison: 48/60/72px at 100% and 75% display.
- Four VFX-off silhouettes: 48/60/72px, plus 60px on calm, light, and busy backgrounds.
- Four-form color comparison, authored left/right comparison, and candidate palette/proportion sheet.
- 480×270 is the 100% logical display. The 360×203 capture is approximately 75%; its vertical scale is 203/270 = 0.752, so the browser's nearest-neighbor CSS scaling cannot be an exact integer ratio.
- The images are static previews rendered live by Phaser. No idle animation or motion approval is represented.

## Art assessment

- **Base:** strongest candidate is 60px; face and costume landmarks exist, but generated shading creates more colors than the candidate swatches and details such as fingers/eyes need pixel-level cleanup.
- **Dawnrush:** clearly human with coral pressure cuffs and a broader upper-body treatment. Its black silhouette remains close to Base, so its changed combat identity is a likely revision point.
- **Stormhalo:** angular shoulder/collar treatment and narrower stance differentiate it from Base at 60px; its precise-arm identity still needs an authored combat pose later.
- **Eclipse Warden:** crown/mask, longer proportions, plated limbs, and detached mantle produce the clearest shape change; the still image alone does not establish hovering motion.
- **Direction:** the separately generated left pose avoids mechanical mirroring, but pose/face/costume consistency is not yet tight enough to count as a final pair.

These studies are direction and scale material, not polished field-ready pixel art. The proportion chart is a suggested 60px allocation (15px head/hair, 18px torso/arms, 7px belt/sash, 13px legs, 7px boots), not a measured decomposition of the generated image. The owner should judge the visual direction and request targeted revisions before any source is called canonical.

## Verification record

Actual local runs after `npm ci`:

- `npm ci` — passed; 19 packages installed, 0 vulnerabilities reported by the install audit.
- `npm run art:b01a:build` — passed; 5 source hashes checked, 26 preview PNGs regenerated, 63,592 runtime bytes.
- `npm run typecheck` — passed.
- `npm test` — passed, 19/19 tests.
- `npm run build` — passed. Vite reports the existing single JavaScript bundle is 1,405.56 kB minified (378.45 kB gzip), above its 500 kB advisory threshold.
- `npm run audit:assets` — passed; 37 audited files, 6,106,157 bytes, no individual budget violations.
- `npm audit` — passed; 0 vulnerabilities.
- `npm run qa:b01a` — passed in installed headed Chrome 156; 26/26 preview textures loaded, 11 live Phaser captures, no missing texture/request/page/console errors. 4:3 viewport remained unclipped with a 16:9 canvas. The evidence digest is in [archived locally: `run-report.md`](review-evidence-archive.md#b01a).
- `npm run qa:chrome:local` — passed in installed headed Chrome 156 against B00 title, movement, jump, coyote, buffer, resize, dash barrier, camera, pause, blur, and re-entry scenarios. The pre-existing B00 evidence files were restored after the run so their retained originals are unchanged.
- `npm run qa:controller:local` — passed in installed headed Chrome 156. A synthetic Gamepad API checks held Start across the pause edge, fresh Start resume, no double toggle, and keyboard/UI resume. This does not exercise a physical controller.

No memory measurement was taken. No gameplay or idle clip is included because B01A contains no animation; screenshots are identified as static in-engine previews. The only candidate generation outputs retained are the five sources in the provenance table; no rejected source art was created or discarded.

## Owner decision card — no automatic approval

Proposed master: `iona-b01a-base-recommended` at 60px, source SHA-256 `c5cd65ee4eab727f389696638171f9cb0f23764c8ae8be3652c79e761bec7418`.

- [ ] **APPROVE RECOMMENDED IONA MASTER** — approve this Base direction and 60px review target for a canonical cleanup/lock step.
- [ ] **REVISE BASE FACE OR SILHOUETTE**
- [ ] **REVISE FORM DISTINCTNESS** — especially the Base/Dawnrush black-silhouette separation.
- [ ] **REVISE TRUE-SCALE LEGIBILITY**

Owner approval remains pending until the owner selects a decision. No B01B animation work should begin before that selection.

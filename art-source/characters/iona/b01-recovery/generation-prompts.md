# Iona B01 recovery image-generation prompts

All seven images below were generated with the Codex built-in `image_gen.imagegen` capability. The native tool was called through `tools.image_gen__imagegen`, requested true transparency, and saved originals under the recorded Codex generated-images directory. Image output UUIDs, prompt order, original paths, and file hashes are recorded in `generation-provenance.json` and `art-source/manifests/iona-b01-recovery-v2.json`. The tool did not report a model version.

## 01 — Selected Base master

References: `art-source/characters/iona/b01a/iona-base-recommended-master-source.png` (identity/costume) and `art-source/characters/iona/b01a/iona-base-left-facing-study-source.png` (left-facing anatomy/asymmetry).

```text
Use case: stylized-concept
Asset type: original source sprite art for a pixel-art action roguelite
Input images: Image 1 is the approved-for-reference Crownflare Iona Base master, identity and costume reference; Image 2 is the left-facing study, used only to correct facing/anatomy drift.
Primary request: create a new high-quality, full-body side-view pixel-art Base hero master for Iona, facing right in a calm alert ready stance. This is new original Crownflare art, not a copy of another game's character.
Subject: athletic young woman explorer with the same readable Iona identity as the references: short tousled silver pearl hair, one teal forward lock, clear focused profile eye, practical cropped navy expedition jacket, copper wrist bracer, pale sash tied at the hip, navy tapered trousers, sturdy navy boots with pale soles. Keep hands, elbows, knees and boots anatomically clear.
Style/medium: premium hand-authored-looking 2D pixel art, crisp deliberate clusters, coherent limited palette, hard pixel edges, no blur and no vector-like geometry. It should read as a polished game sprite when reduced to about 60 logical pixels tall.
Composition/framing: one isolated complete character, standing neutral with weight slightly settled and fists relaxed, side profile with just enough three-quarter torso to read the chest and far arm. Centered, head-to-boot visible, ample transparent margin, feet level on one shared baseline. One figure only; no sheet grid or panels.
Lighting/mood: restrained directional pixel highlights and shadow clusters that clarify volume without glossy airbrush.
Color palette: silver/pearl hair, restrained teal accent, navy clothing, copper wrist hardware, warm natural skin, pale sash.
Constraints: preserve the same costume and distinctive Iona identity; stable body proportions, readable head/shoulders/arms/legs, intentional pixel clusters and a silhouette that remains legible at 60px. True transparent background.
Avoid: text, labels, watermark, ground or shadow plane, background, checkerboard, glow, particles, motion trails, extra objects, duplicated figures, chibi proportions, giant square head, malformed hands, merged limbs, cropped fist or boot, anti-aliased outlines, photographic texture, smooth gradients, blurry pixels, vector polygons.
```

## 02 — Right-facing idle sheet

Reference: selected master `iona-base-right-ready-imagegen-01.png`.

```text
Use case: stylized-concept
Asset type: reference-guided 4-frame source sheet for an original playable pixel-art hero
Input images: Image 1 is the exact generated Crownflare Iona Base master; preserve this exact identity, face profile, hair shape, colors, costume construction and proportions.
Primary request: edit the single reference character into a clean 2-by-2 idle animation key-pose sheet. Four distinct subtle body poses for a calm ready idle loop: (top-left) neutral planted ready pose, (top-right) gentle inhale with slight shoulder rise and chest open, (bottom-left) quiet weight transfer into the back foot with a small hand/finger settle, (bottom-right) exhale and settle back into neutral. These are real pose changes in shoulders, elbows, hands, torso and hips, not merely moving the whole sprite.
Style/medium: same premium crisp pixel-art clusters and shading as the reference, same anatomy and outfit; preserve the exact generated face and hair identity.
Composition/framing: exact 2 columns by 2 rows, each cell a separate full-body figure facing right, same apparent size and pixel scale in all cells; align both feet to the same baseline within each row; each figure fully contained inside its own equal square cell; generous clear transparent spacing between cells. No overlap.
Lighting/mood: restrained clear shading consistent with source.
Color palette: identical silver pearl hair, teal front lock, navy cropped jacket and trousers, copper wrist bracer, pale sash, warm skin, navy boots.
Constraints: transparency is real alpha. Preserve the same asymmetrical costume and the copper bracer on the same arm in all four cells. Keep complete hair, hands, trailing sash and boot tips visible. Make each pose's pixel silhouette substantively different while keeping body size stable.
Avoid: background, ground, checkerboard, borders, labels, text, watermarks, extra objects, effects, glow, motion trails, changing costume, changing face, changing hair, changing body type, chibi, perspective changes, cropped anatomy, duplicated limb artifacts, blur, anti-aliased/vector edges.
```

## 03 — Right-facing run sheet

Reference: selected master `iona-base-right-ready-imagegen-01.png`.

```text
Use case: stylized-concept
Asset type: reference-guided 4-frame run-cycle source sheet for an original playable pixel-art hero
Input images: Image 1 is the exact selected generated Crownflare Iona Base body and face master. Preserve the same profile, hair, proportions, outfit, colors and bracer placement in every pose.
Primary request: create four substantive full-body poses for a right-facing run cycle as an exact 2-column by 2-row transparent sprite sheet. Top-left: strong forward foot contact with the other leg bent behind and opposite arm leading; top-right: passing phase, hips moving over the planted foot, arms counter-swing; bottom-left: airborne flight with knees flexed and arms driving; bottom-right: opposite foot contact with clear switched leg/arm arrangement. Show genuine running mechanics: foot plant, lift, swing, weight transfer and brief flight. Each silhouette and limb arrangement must visibly differ.
Style/medium: exact same crisp premium pixel-art style, face identity, hair rendering and costume construction as the reference; body pose redrawn with visible joints, not whole-sprite translation.
Composition/framing: exact 2x2 grid of equal transparent cells, one complete right-facing figure per cell, same scale and orientation; aligned foot baseline within each row, generous clear cell margins; no overlap or perspective shift. Preserve sash motion as a small secondary cue while keeping body anatomy dominant.
Lighting/mood: same restrained pixel highlights and shadows as source.
Color palette: identical pearl silver hair, teal front lock, navy jacket and trousers, copper forearm bracer, pale sash, warm skin and navy boots.
Constraints: actual clean alpha transparency, consistent head size, shoulder/elbow/knee anatomy, full hair, both hands and both boots visible in every cell, no clipping. Keep costume asymmetry and copper bracer on the same arm. The upper body leans slightly forward consistently across run poses.
Avoid: background, checkerboard, ground, contact shadows, labels, dividers, text, watermark, glow, speed lines, impact effects, extra objects, costume/hair/face changes, duplicated limbs, merged arms, generic chibi, full-body rotations, blur, airbrush, anti-aliased smooth edges, vector geometry.
```

## 04 — Left-facing run sheet

References: selected master, B01A left-facing study, and generated right-facing run sheet.

```text
Use case: stylized-concept
Asset type: reference-guided 4-frame left-facing run-cycle source sheet for a playable pixel-art hero
Input images: Image 1 is the selected new Crownflare Iona body and face master; preserve identity and pixel-art rendering. Image 2 is the correct left-facing costume/asymmetry study; use it to keep the teal forelock on the leading side, the copper bracer on the same anatomical arm, and sash attachment consistent. Image 3 is the right-facing generated run sheet; use only as a matching set of four purposeful run-cycle phases.
Primary request: create an original four-pose LEFT-facing run-cycle sheet for this same Iona, exact 2-column by 2-row transparent atlas. Match the four distinct phases of Image 3 in order: top-left foot-contact extended stride; top-right passing phase; bottom-left brief airborne flight; bottom-right switched foot-contact stride. Each body must actually face left with nose, front lock, lead arm, torso and feet oriented left.
Style/medium: same premium crisp pixel art and exact anatomy/costume identity as Image 1, with the left-facing handedness and asymmetry from Image 2.
Composition/framing: one complete left-facing character per equal square cell, same height and scale in all cells, feet aligned to each row baseline, generous cell margins, full head, sash, hands and boots visible.
Lighting/mood: restrained consistent pixel highlights and shadows.
Color palette: pearl-silver hair, teal leading lock, navy jacket/trousers, copper bracer, pale sash, warm skin, navy boots.
Constraints: true alpha transparency. Preserve identical head proportions, body type, face, bracer arm and sash knot across all four poses. Demonstrate foot plant, leg swing, weight transfer and flight; no rigid full-image movement.
Avoid: background, checkerboard, ground, shadows, labels, grid lines, text, watermark, glow, motion lines, new accessories, costume changes, incorrect teal-lock side, bracer switching anatomical arm, mirrored errors, merged limbs, clipped hand or boots, blur, airbrush, vector edges.
```

## 05 — Right-facing jab sheet

References: selected master and generated right-facing run sheet.

```text
Use case: stylized-concept
Asset type: reference-guided 4-frame combat key-pose sheet for a playable pixel-art hero
Input images: Image 1 is the selected new Crownflare Iona body and face master. Preserve exact character identity, face, hair, anatomy, palette and costume. Image 2 is the matching run source sheet for pixel rendering and proportions only.
Primary request: create a four-pose right-facing light jab sheet in an exact 2-column by 2-row transparent atlas. Top-left: clear anticipation, hips and shoulders coil back, front unarmored fist tucked near chest, copper-bracer arm guarding. Top-right: weight transfers forward and shoulder starts extending. Bottom-left: full straight jab contact, front fist and forearm extended horizontally toward the right, knuckles unmistakably leading, elbow aligned, shoulder engaged, torso rotated with believable balance, rear copper-bracer arm guarding. Bottom-right: visible recoil, punching elbow folds and fist returns toward guard as weight settles.
Style/medium: premium crisp hard-edged pixel-art action-game frame, same facial identity, dimensions and outfit as Image 1, purposeful anatomical pose redraw in each cell.
Composition/framing: exact 2x2 equal transparent cells, same apparent figure size and head height, full body from hair to boots in every cell; reserve extra rightward room in every cell so the contact fist is fully visible and cannot clip; align feet consistently within each row. No separate effect graphic.
Lighting/mood: restrained consistent pixel highlights; readable strike silhouette without glow.
Color palette: silver pearl hair, teal front lock, navy cropped jacket/trousers, copper bracer on its same anatomical arm, pale sash, skin and navy boots.
Constraints: preserve the exact character identity and accessory attachment; use one coherent action from anticipation to extension to contact to recoil. Both fists are clearly formed, hands/forearms read cleanly, elbows stay connected, boots and sash fully visible. True transparent background.
Avoid: background, checkerboard, floor, labels, text, watermark, impact burst, speed lines, glow, extra objects, changing face/hair/costume/proportions, shoulderless arms, dislocated joints, clipped fist, chibi, mirrored accidental features, blur, smooth gradients, vector forms.
```

## 06 — Left-facing idle sheet

References: selected master and B01A left-facing study.

```text
Use case: stylized-concept
Asset type: reference-guided left-facing idle key-pose sheet for a playable pixel-art hero
Input images: Image 1 is the exact selected new generated Iona master. Image 2 shows correct left-facing side profile and handed costume details.
Primary request: create a four-pose 2-by-2 transparent idle sheet of the same Iona facing left. Top-left ready stance; top-right gentle inhale with shoulders lifting; bottom-left small weight shift into rear foot and relaxed hands; bottom-right quiet settle. These are subtle real shoulder, elbow, hand, hip and knee pose changes, not whole-image translations.
Style/medium: identical crisp pixel art, same face/profile, proportions and shading as Image 1, with the left-facing direction and asymmetry of Image 2.
Composition/framing: 2 columns by 2 rows; one complete figure per equal square cell, all facing left at same scale; align feet within each row, full hair, sash, hands and boots visible.
Lighting/mood: restrained and consistent source lighting.
Color palette: same pearl silver hair, teal lock at forward left side, navy jacket/trousers, copper bracer on the same anatomical arm, pale sash, warm skin and navy boots.
Constraints: transparent alpha; stable identity and costume in every cell; copper bracer appears on the rear right side as appropriate when facing left; hair and sash trail back toward the right; distinguish four actual poses while keeping head size fixed.
Avoid: background, floor, shadows, checkerboard, grid lines, borders, labels, text, watermark, glow, motion trails, new costume details, switched bracer arm, wrong teal-lock side, merged limbs, cropped anatomy, blur, smooth gradients, vector polygons.
```

## 07 — Left-facing jab sheet

References: selected master, generated left-facing run sheet, and generated left-facing idle sheet.

```text
Use case: stylized-concept
Asset type: reference-guided four-frame left-facing light-jab sprite sheet for an original pixel-art game hero
Input images: Image 1 is the exact new Iona character identity master; Image 2 shows correct left-facing running proportions and direction; Image 3 shows left-facing costume handedness and relaxed anatomy. Preserve those details consistently.
Primary request: make a four-pose LEFT-facing jab animation sheet in an exact 2x2 equal-cell transparent grid. Top-left: anticipation, hips/shoulders coil rightward, front unarmored fist near chest and copper-bracer arm guarding. Top-right: weight shifts forward and shoulder begins extending left. Bottom-left: full jab contact with the front unarmored fist and forearm extended horizontally toward the LEFT; rear copper-bracer arm guards near ribs. Bottom-right: punch retracts and weight settles back into guard. Each pose changes real limb/torso anatomy and the contact fist is clearly visible.
Style/medium: exact matching crisp pixel-art clusters, colors, facial identity and proportions from Image 1, with left-facing silhouette from Image 2.
Composition/framing: four separate full-body figures, same height and scale, 2 columns by 2 rows; extra transparent space on the left side of every cell for full punch extension; keep hair, fist, sash and boots fully in frame.
Lighting/mood: restrained matching pixel shading, no effects.
Color palette: pearl silver hair, teal lock at leading left side, navy jacket and trousers, copper bracer stays on same anatomical arm and reads at the rear right side, pale sash, warm skin, navy boots.
Constraints: real transparency, all four frames face left, preserve anatomy, bracer, sash knot and foot placement; grounded, forceful jab sequence with visible anticipation, contact, and recoil; fist must not crop.
Avoid: background, checkerboard, ground, borders, labels, text, watermark, glow, speed lines, impact burst, extra objects, costume change, wrong teal side, switched bracer arm, twisted joints, merged limbs, copied right-facing frames, blur, gradients, vector shapes.
```

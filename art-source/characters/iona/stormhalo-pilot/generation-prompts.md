# Stormhalo pilot ImageGen prompts

All four final masters were generated with the native ImageGen tool. Exact output IDs and file hashes are recorded in `manifest.json`. The current B01E Base sprite is the identity reference; the B05 art is the style/scale reference; the B01A Stormhalo study provides the form direction.

## 1. Stormhalo concept — `exec-f68a31e4-aa0c-42ce-917e-1a5886966c16.png`

```text
Use the attached images as distinct references. Image 1 is the real current in-game Crownflare Base Iona sprite and is the authority for her face/eye, hair colors, body identity and 60px-scale pixel language. Image 2 is a native-generated B05 Dawnrush sheet from the same game and locks the higher-resolution production sprite finish. Image 3 is the existing Crownflare Stormhalo study and is the authority for the second-form design. Create one refined transparent-background full-body concept sprite of Iona Rell in Stormhalo: preserve the same face identity, clearly visible teal eye with a defined upper lid, silver spiky bob with teal forelock, proportions and recognizable Base silhouette; transform through a split hovering halo, long angular pale collar/coat fins, restrained indigo and white-violet prismatic seams and a poised counter-fighter stance. The supplied concept may guide pose only, not replace these exact references. Side-view facing right, feet aligned and fully visible, 60px character height target (halo may extend above), clean dark navy outline and deliberate square pixel clusters. Keep her face large/readable at game scale, no dot eye, no bulky armor. Transparent background, no checkerboard, background, floor, UI, text, labels, duplicate halo, weapon, extra character, crop, blur, soft painterly finish or watermark.
```

## 2. Transformation sheet — `exec-d7289b6a-b49b-45ed-8b82-d4fa42c38b3c.png`

```text
Create a production sprite sheet for a Crownflare 2D transformation sequence. Reference roles: (1) the attached B01E idle sprite is the actual current in-game Base Iona identity and scale anchor; preserve her eye, teal forelock, hair, body proportions and outfit. (2) the attached refined Stormhalo concept is the exact target-form silhouette and face. (3) the Dawnrush sheet is the game's production pixel-art rendering reference. Do not invent or replace Iona's identity.

Transparent background, exact 3 columns x 2 rows of six equal cells, regular grid, no gutters, no borders. Each cell shows one full-body right-facing side-view key pose, consistent camera and scale, both boots fully visible and placed on the same ground baseline; center each pose in its own cell. Square clean pixel clusters, crisp dark navy outlines, no blur, soft gradients or smoothing. No background, floor, shadow, text, UI, labels, checkerboard, extra characters, weapons, cropping or watermark.

Read left-to-right, top row then bottom row:
1 anticipation — recognizably Base Iona, poised upright then compressing slightly, sash beginning to lift, no halo;
2 ignition — Base Iona draws hands toward a small white-violet spindle spark at her chest, a few discrete motes;
3 energy surge — compact crouch, shoulders drawn in; two partial sharp prismatic orbit pieces snap into view around her, the face stays readable;
4 silhouette break — body rising as the high Stormhalo collar and split orbit emerge; brief strong dark silhouette with restrained white-violet edge energy;
5 transformed reveal — matches the refined Stormhalo concept: same face and visible teal eye, split hovering crown arcs, long pale coat fins and indigo/light violet angular seams, feet planted;
6 settle — exact Stormhalo design in calm ready stance, same 60px body scale, feet planted, quiet aura.

Make every phase distinct and connected. Frames 1-2 stay in original Base outfit, frames 5-6 match Stormhalo. Do not put a gray studio matte or atmosphere behind the sprites; the actual pixels outside subjects/effects must be alpha-transparent.
```

## 3. Transformed idle sheet — `exec-7e10590e-dca2-42b9-a625-eedfca009d73.png`

```text
Create a transparent production sprite sheet with exactly four consecutive idle frames for Iona Rell in her Stormhalo form. Reference roles: attached B01E idle image is the real current in-game Base Iona identity; attached Stormhalo concept is the selected target-form direction; the B05 Dawnrush sheet locks the game's pixel-art finish. Preserve the same clearly visible teal eye/upper lid, silver hair with teal forelock, face and body scale. Keep body proportions and costume consistent in all frames; no redesign.

Exact 2-column x 2-row grid, four equal cells, no gutters, no borders. Full body facing right in every cell, same camera, centered character, both boots and all halo/coat fins visible, ground contact at the same baseline, no crop. Transparent background outside character and its separated accessory only. Crisp dark navy outline and deliberate pixel clusters, no blur, painterly softness or smoothing; no backdrop, shadow, floor, labels, text, UI, extra character, checkerboard or watermark.

Each cell is the same composed Stormhalo counter-ready stance with only a few-pixel breathing loop: (1) calm baseline; (2) slight chest/shoulder lift and coat fins rise subtly; (3) settles, tiny change to split hovering halo angle; (4) returns close to cell 1. Keep character height and width constant, feet planted, face/eye sharp and unchanged; no expression swap, closed eye, attack or locomotion. Halo is the Stormhalo form accessory, not a second effect ring. Aura motes/filaments will be provided separately.
```

## 4. Aura sheet — `exec-da48d271-dde9-41b8-9e1a-a0d9b17252e6.png`

```text
Create an effects-only source sprite sheet for the constant Stormhalo aura in Crownflare. Match the supplied refined Stormhalo concept and Crownflare B05 aura/VFX palette: crisp dark indigo outlines, white/lavender cores, restrained prismatic accents, clean square pixel clusters. Canvas is a perfectly regular 4-column x 3-row grid of 12 equal square cells, exactly no gutters or divider lines. Transparent pixels everywhere except the effect art. No gray matte, gradient backdrop, checkerboard, person, silhouette, clothing, floor, text, labels, watermark, soft bloom, blur, noise or UI.

Each row is an independent reusable layer; four columns are chronological loop frames and frame 4 should visually return near frame 1:
Row 1: the canonical split hovering halo as a standalone accessory-motion layer, two separated angular crescents, subtle 4-step rotation; not a full circle.
Row 2: two thin white-violet prismatic filaments orbiting a standing fighter's torso, leaving an empty transparent center and clear gaps, shift their phase gently across four frames.
Row 3: 5–8 sparse diamond motes / short sharp electrical ticks distributed around a standing hero's outer silhouette; each phase changes only placement and flicker a little. Keep it sparse.
Effects must be separated by row with consistent scale and palette. At 60px character height, filaments and motes should stay subtle. No fill haze behind cells; all non-effect area alpha-transparent.
```

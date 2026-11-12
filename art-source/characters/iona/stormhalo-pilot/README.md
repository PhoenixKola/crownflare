# Iona Stormhalo second-transformation pilot

This is an isolated art/export pilot for Iona Rell's planned second form, **Stormhalo / Resonant Crown**. It contains only the transformation sequence, transformed idle, and constant aura layers. It does not alter the shipped game or runtime assets.

## Audit and method

- The actual runtime Base reference is `references/iona-b01e-runtime-base-idle-right.png`; Dawnrush's shipped idle and its native ImageGen transformation sheet are also preserved as scale/style references.
- The target is the canonical Stormhalo direction in `docs/01-creative-vision.md` and `docs/02-hero-and-transformations-bible.md`: split hovering crown, angular collar and coat fins, indigo/white-violet prismatic electricity, precise counter-fighter.
- The animation bible describes reusable rigid-cutout v1.1 as a separate baseline, but that baseline and its Blender source are not in this checkout. The game documentation also says form attachment/switching is not supported. Building a fake local rig would overstate what this pilot proves.
- **Method chosen: frame-based fallback.** Four native ImageGen masters were created from the current runtime Iona, B05 Dawnrush, and the existing Stormhalo study. A fixed-cell Pillow exporter thresholds generated alpha, anchors the 60px body at a stable foot line, and uses nearest-neighbor resampling.

## Delivered content

- Six transformation keyframes, 1,230ms total, with `activation`, `surge`, `silhouette_break`, `form_commit`, and `settled` timing markers.
- Four transformed idle frames in a 960ms loop.
- Three separately exported four-frame aura layers: split halo, orbit filaments, and prismatic motes. The character idle already includes its canonical halo, so the composed body preview uses filaments and motes without drawing a duplicate halo. The halo animation remains exported independently.
- Transparent 128x112 game-scale PNG frames. Iona's body measures 60px high, with the common foot anchor at y=106; the halo can extend above the body.
- Contact sheets, normal-speed GIF previews, a same-scale Base/Dawnrush/Stormhalo review board, a source manifest, the exact prompts, and this verdict.

## Rebuild

From the repository root:

```powershell
uv run --with Pillow==12.2.0 python tools/art-export/build-stormhalo-pilot.py
```

The script writes exported frames and review evidence under `review-evidence/stormhalo-pilot/`, and refreshes `manifest.json`.

## Review verdict

**Partial success: frame-based visual/export pilot.** The generated Iona keeps the current Base identity and readable teal eye at source size; the transformation has distinct anticipation, ignition, surge, silhouette-break, reveal, and settle poses. The idle and separated aura elements export with transparency and nearest-neighbor scaling. The same-scale review sheet shows the new form beside the project's current Base and Dawnrush references.

This does **not** validate the reusable rigid-cutout rig. There is no separated Stormhalo parts sheet, editable armature, joint stress test, form-switching implementation, alternate facing, combat set, or game integration. The contact sheets and GIFs are evidence for owner review, not owner art approval. The generated key poses are a small set of held poses and would need additional motion work before any gameplay use.

## What worked / what remains uncertain

- **Worked:** the existing canonical form motifs translate to Iona; current Base hair/eye identity and Dawnrush pixel language are visible; independent filament/mote layers can sit under/over the idle without modifying the game; source and export coordinates are recorded.
- **Uncertain:** generated pose-to-pose anatomy and facial detail still need normal-speed owner review; the form is shown facing right only; the pilot does not prove that rigid parts can retain their seams or pivots through motion.
- **Recommendation:** use this package to review Stormhalo's visual direction. Before a full moveset, either complete an actual hidden-overlap parts sheet plus rig stress review, or deliberately choose frame-based animation and generate additional in-betweens. Do not promote these assets into the game until the owner approves them.

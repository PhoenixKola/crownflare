# Iona Stormhalo rigid-cutout source

This is an isolated art and rig pilot for Iona's second form, Stormhalo. It does not replace shipped character art or add gameplay integration.

## Source and construction

- `generation/` keeps the raw native ImageGen outputs unchanged. `references/` holds the shipped Base and Dawnrush frames plus the canonical Stormhalo study and earlier concept references.
- `parts/` contains 19 transparent cutouts used by the RCP v1.1 rig. The head, torso, limbs, hands, boots, and sash pieces were generated as separate components on parts sheets; no finished assembled character illustration was cut apart.
- `crown.png` is extracted from the generated crown/accessory sheet with alpha below 128 removed. It is attached to the head as a separate rigid bone. The generated torso already contains the collar and shoulder fins; the two sash tails remain separately rigged.
- `vfx/` contains separately generated aura components. The export script animates and layers them independently behind and in front of the character.
- `iona-stormhalo-rig-pilot.character.json` records the measured pivots, anchors, image scales, draw order, Idle and Stress actions, and 128×80 transparent output.
- `parts-source-map.json` maps every cutout to its generated source image and crop coordinates.

`IMAGEGEN-PROMPTS.md` records the prompt intent, inputs, and output mapping. Older prompt descriptions are explicitly marked as summaries where the exact original request text was not retained.

## Rebuild

From the Crownflare checkout, regenerate cutouts and config:

```powershell
uv run python tools/art-export/prepare-stormhalo-rig-pilot.py
$repo = (Resolve-Path .).Path
```

Then use the unmodified v1.1 archive at `F:\Blender2D-RigFirst-Pilot\Reusable-Rigid-Cutout-Real-Hero-Jump-Dodge-Review.zip` (SHA-256 `30306f8409a098c88dd47f30ca17eb3afe93fa5de1be9c3d646c542f369346d`) and Blender 5.2.3 LTS:

```powershell
& 'F:\Blender2D-RigFirst-Pilot\stormhalo-real-rig-pilot\pipeline-v1.1\rcp.bat' build `
  (Join-Path $repo 'art-source\characters\iona\stormhalo-rig-pilot\iona-stormhalo-rig-pilot.character.json') `
  --out (Join-Path $repo 'review-evidence\stormhalo-rig-pilot\rig\blender-build-complete')
```

The generated .blend packs its textures. The shared pipeline was not modified. The Stress action is a seven-pose joint QA sequence, not a combat animation.

## Limits

This is a side-view rigid cutout: costume layers follow their bones and do not deform. The collar/shoulder fins are part of the torso cutout, not independently animated. The crown is a rigid head-attached accessory. The transformation is an Option B VFX-masked form reveal; the pipeline does not implement generic image swaps. This pilot is not integrated into the playable game.

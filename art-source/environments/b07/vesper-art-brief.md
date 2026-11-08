# B07 environment art brief — Vesper Loomworks

**Status:** provisional candidate direction, not owner-approved. The region name and art identity follow the B07 brief and remain subject to owner review.

## World identity

Vesper Loomworks is the night-side engine of the broken Lumen Spindle: suspended looms and refractors weave darkness into orderly light above a storm-torn sea. Its forms are tall, narrow, suspended and mechanically tensioned, creating a clear change from Sunderglass Reach’s warm open arcades.

## Visual language

- Foundation: deep petrol and ink-green stone, with visible surface planes and controlled dark separation.
- Structure: oxidized-jade channels, dark brass joints, suspended loom frames, hanging cables and rotating refractors.
- Light: pearl-white thread light through narrow apertures; cool cyan condensation pools; restrained, local glow.
- Silhouette: long vertical frames behind broad, pale platform lips. Keep Iona, enemy bodies, attack tells and Dawnrush brighter than the scenery.
- Motion: slow parallax drift, cable sway, refractor rotation, a few lifting fibers and quiet mist. No constant screen-wide flashes or uncontrolled particle spray.
- Gameplay scale: 480×270 logical pixels, crisp nearest-neighbor presentation. Foreground platform collision is authored in TypeScript and never inferred from artwork.

## B07 room language

The Loomworks uses staggered terraces, safe white-lit rest pockets, a timed thread press and one powered lift. The main route remains traversable with Base movement. Hazards each show warning, active and recovery phases; color is reinforced by shape/motion and an audio cue. Boss-threshold machinery frames the locked doorway without showing a boss or implying a finished fight.

## Integration rule

Generate editable PNG source masters first, then export named crop/trim/scale outputs into runtime assets. Each crop, source cell, alpha bounds, logical size and runtime texture key must be listed with source and runtime SHA-256 hashes. B04 Sunderglass assets remain the source of truth for Region 1. New Region 1 elements are limited to authored additive accents that use the existing B04 palette and material language.

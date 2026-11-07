# B01E native ImageGen source record

The two original sheets are separate native `image_gen.imagegen` calls. Each sheet is a transparent RGBA 2×2 layout with four full-body poses at one consistent character scale. The layout is not used as an atlas at runtime; the exporter crops each pose independently and keeps the source masters unchanged.

## Shared direction and identity requirements

Create Iona Base as original hand-painted pixel art with crisp pixel edges and transparent background. Preserve the canonical pending B01C identity: short pearl-silver hair with one teal front lock, cropped navy courier jacket, copper wrist hardware, pale sash, dark practical trousers, and strapped boots. Keep the face, head size, torso size, clothing palette, anatomy, and rendering style consistent across all four cells. Show the requested facing directly; do not mirror another sheet. No backdrop, labels, effects, weapons, floor, or extra character.

## Left-facing study — `b01e-sidekick-left-4pose-v1`

One image with exactly four distinct full-body poses in a clean 2×2 grid, all facing left. Read cells in row-major order:

1. Guarded side-on stance.
2. Chamber the side kick by lifting the front knee while keeping the support boot planted.
3. Extend a horizontal side kick at waist height, with a clear straight kicking leg and the opposite boot visibly supporting her weight on the ground.
4. Retract the kicking knee into a balanced recovery stance, with the support foot planted.

Keep the waist, shoulders, head, hair silhouette, and support boot aligned plausibly between cells. Leave transparent margins between cells; keep the figure fully inside each cell.

## Right-facing study — `b01e-sidekick-right-4pose-v1`

Use the shared identity requirements, authored directly facing right. Create one image with exactly four distinct full-body poses in the same 2×2 cell order and motion sequence as the left-facing study. Maintain the same character scale and body proportions. Keep the support boot grounded during both the chamber and contact pose; make the side-kick leg horizontal at waist height. The profile hair and face must be drawn for the right-facing view, not obtained by flipping the left image.

## Transcript note

This record preserves the submitted pose, identity, transparency, facing, and anatomy constraints in stable text. The exact full prompt strings were not exposed in the image-generation result metadata. Output IDs and original master hashes below are taken from the native tool results and verified against the files.

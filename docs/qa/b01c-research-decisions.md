# B01C research and implementation decisions

Research checked on 2026-11-07 against the current repository, installed packages, official project documentation, and the actual pinned APIs.

## Current project surfaces

- Repository baseline was clean at `12b72c9eb959a2ae50a9ad0fbd3870a26a3e1965` (`12b72c9`), newer than B01C's expected recovery commit because the B00 prompt deletion had already been committed afterward.
- Runtime: Phaser **4.2.1**, TypeScript **5.9.3**, Vite **7.3.7**, Playwright **1.55.1**. Python exporter has the existing pin `Pillow==12.2.0` in `tools/art-export/requirements-iona-recovery.txt`.
- The current B01 recovery runtime has four idle, four run, and four jab poses per facing in 128×80 frames. `ChamberScene` still reuses run art for both dash and airborne states. Physics remains an independent 15×30 Arcade body.
- The project already has deterministic movement/combat modules, a development-only `animationLab=1` browser hook, and a real-Chrome Playwright capture path.

## Decisions applied

1. **Keep the frame pipeline in pinned Pillow.** It already performs alpha thresholding, source cropping, nearest-neighbor scaling, 128×80 placement, and hash manifests. B01C extends it in a new script and output namespace, so the original recovery manifest and runtime assets remain intact.
2. **Use native image generation for action art and one constrained edit.** Generate separate left/right run, jump, dash, and turn/start/stop sheets from the project's own original Iona sources. Keep the generator-reported model/version unknown. Retain exact outputs, prompt text, output IDs, source hashes, and the failed checkerboard-background attempt record.
3. **Make one pixel cleanup method measurable.** Compare the same original run pose with the current nearest export, binary-alpha/nearest/shared-palette cleanup, and a native image edit followed by the same export. Use a shared 32-color palette without dithering, binary alpha at 192, nearest-neighbor resizing, a median waist pivot at x=64, and feet at y=80. The original recovery exporter remains unchanged.
4. **Use actual Phaser 4 Sprite animations.** The pinned Phaser 4.2.1 types and source support frames that each reference a separate texture key. Per-frame durations are supported, and Phaser's official guide says they are added to the animation's base frame duration; B01C sets parent duration to 1ms so authored frame timings are not doubled. `Sprite` is required because it owns an Animation State component. The animation lab remains opt-in and the shipping B00 chamber is not changed.
5. **Do not add a tool or package.** LibreSprite supports batch sheet export; Pixelorama is an available sprite editor; Sharp offers nearest resize; `free-tex-packer-core` can pack Phaser metadata. None is installed here, and none improves the required fixed-size, per-action, separately authored source crops enough to justify new dependencies or editor steps. Separate frame textures are manageable for this pilot; atlas work can wait for measured load or authoring pressure.
6. **Keep ownership and originality records explicit.** Only original Crownflare Iona references were sent to image generation. OpenAI's current individual Terms say the user owns the output as between the user and OpenAI, while also noting outputs may not be unique and the user is responsible for permitted inputs. No third-party art or editor assets were added.

## Primary sources reviewed

- OpenAI, [Introducing Images 2.6](https://openai.com/index/introducing-images-2-6/) and [image prompting guide](https://developers.openai.com/api/docs/guides/image-prompting): current image editing/generation guidance. The Codex tool itself did not report the model/version for these outputs.
- OpenAI, [Image generation tool guide](https://developers.openai.com/api/docs/guides/tools-image-generation) and [Terms of Use](https://openai.com/en-GB/policies/row-terms-of-use/): image inputs/outputs and current output ownership/input responsibility language.
- Phaser, [Phaser 4 Animations guide](https://www.phaser.io/oss/docs/phaser/concepts/animations), [Sprite API](https://phaser.io/oss/docs/api-documentation/class/gameobjects-sprite), and [AnimationManager API](https://phaser.io/oss/docs/api-documentation/class/animations-animationmanager). The guide verifies separate texture-key frames and per-frame timing behavior; exact installed 4.2.1 declarations/source were also checked locally.
- [LibreSprite batch/export CLI options](https://github.com/LibreSprite/LibreSprite/blob/master/src/app/app_options.cpp), [Pixelorama project and documentation](https://github.com/Orama-Interactive/Pixelorama), [Sharp resize documentation](https://sharp.pixelplumbing.com/api-resize/), and [free-tex-packer-core options](https://github.com/odrick/free-tex-packer-core). These were capability checks only; none was installed or added.

## Boundaries

This batch is an art/motion production pilot, not an owner art lock. The six-pose run passed the provisional locomotion quality gate in real Chrome, so the conditional three-hit combo pilot was produced with separate palm, side-kick and rising-forearm silhouettes. The recommended Base master and 60px scale still require owner review; this does not mark B01 or B03 complete. The captured 66.92-second browser video has no audio track, so audio playback remains unconfirmed.

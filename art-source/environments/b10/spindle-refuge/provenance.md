# Spindle Refuge — B10 generated environment

These three canonical masters were produced with the native Codex ImageGen tool for the B10 hub. They are original Crownflare environment illustrations in the established deep teal, brass and warm lumen palette; no reference artwork was supplied to the generator.

| Asset | Purpose | ImageGen output file | SHA-256 |
| --- | --- | --- | --- |
| `source/far-sky-and-fractured-spindle.png` | Distant cloud city and broken day/night ring | `exec-17281aa2-7420-48b0-aecc-74329cc15652.png` | `35d75d8df91c6803d5879e5e5c4c141ddc29b9b7e4a37dc46c53a95d6faecfb4` |
| `source/engine-hall-transparent.png` | Refuge engine hall, lanterns and open gate | `exec-6e860e60-5db5-4a9a-a2de-4547fe20aa06.png` | `e4ca5bb0e1a55b3f55cd2076422c55719058f7846df96c731e548f42b18f3269` |
| `source/foreground-frame-transparent.png` | Foreground brass arch and floor trim | `exec-5150243a-cbb1-4b6f-a8b7-3a4e0dd35199.png` | `b1f593f413ba082b1de5af38b5fdfc43fba7f9a80a1eb025659527ee8a79aef5` |

The generation session identifier is not exposed by the native image tool. The output filenames above are retained as returned; no opaque model or session identifier has been invented. Runtime layers are reproducible with `python tools/art-export/build-b10-spindle-refuge.py`; the exporter resizes and quantizes the masters while retaining overlay transparency. Hashes and exact runtime byte counts are emitted in `public/assets/environments/b10/spindle-refuge/manifest.json`.

The hub figure is the existing Iona B01E idle sprite; no character redesign was generated. It bobs gently in CSS and is disabled under `prefers-reduced-motion`.

## Audio

`public/assets/audio/b10/spindle-refuge-ambience.wav` is a new original, non-musical ambient bed synthesized from low sine tones and a soft periodic lumen bell. It is reproducible with `python tools/audio/generate-b10-refuge-ambience.py`. It contains no sampled or third-party audio. Playback and file checks do not count as listening signoff; owner listening is still required.

# B04 Sunderglass Atrium image provenance

All environment and combat effect masters below were generated for this project with the native ImageGen tool. The generated source files are retained byte-for-byte; the runtime textures are deterministic nearest-neighbor crops built by `tools/art-export/build-b04-environment.py`.

The text below records the generation briefs and source IDs available from the production run. These are concise briefs, not claimed verbatim tool prompts.

| Source ID | Master | Brief | SHA-256 |
|---|---|---|---|
| `f6e7e42d-b2c9-4fd9-b8e2-fd0a6bb2975d` | `b04-horizon-01a1b353.png` | Original 16:9 pixel-art cloud sea and distant broken copper ring; restrained indigo, teal and amber; layered parallax horizon; no text or characters. | `A40C42D5F3854FDFB8661813A6E30301AF545D3D2F188B5BC7FCEC2C39E6735C` |
| `c33417f3-237d-435a-a886-ab92c6d3d0c6` | `b04-architecture-c33417f3.png` | Transparent pixel-art silhouettes of slender arches, suspended bridges and cables; keep an open center for combat readability; copper and teal palette. | `2616F21680BE25ADB8B2843E4AD1AA06B66EBE12C16B353CE0DF00161A11966C` |
| `83c8df53-ae55-45ba-9c3e-d10d2edf64fa` | `b04-platforms-83c8df53.png` | Original pixel-art platform and conduit tiles presented as a clean modular sprite sheet; strong top edges and stepped corners; transparent background. | `596EE9C35253B866D8A6D3423CD2EFA37AB06857B1502B808E46E47C64D3816E` |
| `bb09212d-721f-4d45-bd33-842b2c2b18b4` | `b04-mechanisms-bb09212d.png` | Transparent sprite sheet with an entry beacon, faceted resonance shard and narrow luminous exit gate; crisp pixel clusters, no labels. | `11C6F2DFCB2E7C8CDA3652BD848B0A9D6628071914429C26B482F483229FE80F` |
| `8c6ea1b7-8587-4585-8592-70d291d3576d` | `b04-vfx-8c6ea1b7.png` | Three-frame pixel-art contact burst sheet in pale teal and amber, with distinct expanding impact shapes. This first result baked a checkerboard into the image and is retained only as generation history. | `FDA06A68DCAD0E4FEE269ABE62E83C3C011EFFB100DC9CC93B2CFA36A7E0CEDE` |
| `4b7061aa-c14f-42ed-9786-f23e3b2ded1d` | `b04-vfx-clean-4b7061aa.png` | ImageGen edit of the three-frame contact burst: remove the checkerboard and haze, keep only clean crisp pixel clusters on true transparency. This is the runtime VFX source. | `A7F51EA9496401004F82E081F9DBB02A07FD60364F1D3964282F976F4F3BC8B4` |
| `05d51877-3487-4c00-ba67-00d9ea25bd84` | `b04-telegraph-05d51877.png` | Transparent two-direction sentry danger marker: a sharp amber/teal chevron and short floor line with broad clear silhouette; no surrounding scene or text. | `822A60898077EA2457E8CB246A26E41952A1293BEFA4BB5CB6E69C25C344AD59` |
| `6d537f61-b84e-4b4f-88fd-472c7b58ccf5` | `b04-sentry-attack-6d537f61.png` | Four transparent horizontal pixel-art frames replacing the generic chevrons: attached amber core/thrust telegraph, one continuous ivory-turquoise lunge slash that extends, then a few dissipating sparks. No floor, character or text. | `AAC21AF25299011C6DBFCA55677B3BDAE6C795DE1D999600334064AFDF55230E` |

The sentry and Iona are existing B03/B01E generated character sources; B04 reuses their approved-at-the-code-level runtime integration without claiming owner art approval. No new character model was generated for B04. The four-frame attack effect is placed on the sentry during telegraph and lunge states, rather than drawn as an unrelated floor decal.

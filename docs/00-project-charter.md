# Project Crownflare — Project Charter

**Status:** NEW standalone project, B00 foundation only. **Master authority:** `docs/project-crownflare-master-creative-technical-roadmap-and-initial-project-handoff.md`, rev 1.0, November 7, 2026. If any summary conflicts, the master takes precedence. **Working codename:** Crownflare (not cleared for commercial release). **Initial platform:** desktop browsers, keyboard/mouse and gamepad.

## Locked creative and scope decisions

- Original premium **side-view 2D pixel-art action roguelite**, room/chamber-based with real platform traversal, manually activated martial combat, branching curated procedural runs, bosses, persistent metaprogression.
- One playable hero for the entire first release: **Iona Rell**, former Lumen Spindle courier; original character, only a creative seed until owner approves in B01.
- Four distinct functional combat identities: **Base**, **Dawnrush**, **Stormhalo**, **Eclipse Warden**. Three full transformations; not colored combat skins, not trailer-only set pieces. Form III requires a significantly redesigned body and full independent action catalog.
- Future cap **3–4 heroes TOTAL**, entirely out of scope in B00–B13. No second playable hero, code path, art set or roster UI now.
- One polished ~25–35-minute run target once mature; target (not guaranteed): two regions plus final arena, ~6 regular archetypes +2 elites, 2 region bosses + final boss. Do not inflate content at the expense of quality.
- Originality: inspirations only as *structural or high-energy feel*; never copy proprietary character appearance, attacks, audio, choreography, world, names, distinctive silhouettes or protected visual identity.
- **Complete isolation from Veyrshift**, including repo, code, art, stories, saves, Git history, folders and test harnesses. No repo rewrite or cleanup there.

## Quality hierarchy and authority

**Quality of one complete hero > quantity of assets > milestone count.** Combat body animation must work beautifully with VFX hidden. Generated original art is allowed, but candidates need canonical reference locking, art consistency review, real gameplay integration and explicit owner approval. Game loops that compile are not proof of appealing animation. Tests cannot sign off visuals or listening.

Every batch has three independently reported results: `TECH PASS/FAIL/BLOCKED`, `ART-MOTION PASS/FAIL/PENDING`, `OWNER APPROVAL APPROVED/CHANGES REQUESTED/PENDING`. Never infer approval from AI reports. One coherent runnable slice is preferable to a broad half-built collection.

## Initial deliverable / gate

B00: independent Node+Vite+TS+Phaser starter, intentional title shell, test chamber with collision/movement/jump/dash/camera/pause, keyboard/controller foundation, deterministic combat clock, save namespace, unit tests, real Chrome check, documentation, asset provenance workflow and clean Git hygiene. Temporary B00 rectangle hero is permitted strictly for engineering; B01 replaces it with original reviewed pixel artwork. **Exit only when actual browser gameplay and all required checks are verified.**

## Production governance

ChatGPT acts as creative director and independent reviewer; Codex may implement and generate original art. Inspect the latest actual source before direction or review. Each implementation prompt is a separate downloadable kebab-case `.md`. Push/commit only when authorized and remote configured. Never claim a test, host browser, audio, performance or owner approval that did not occur.

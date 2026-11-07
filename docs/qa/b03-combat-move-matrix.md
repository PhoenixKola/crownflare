# B03 combat move matrix

Implementation record for the development-only `/?b03=1` Phaser chamber. B03 keeps the B02 `128×80` player canvas, `(64,80)` foot pivot, presentation scale `1.0` for the 60px reference, and Arcade Physics body `15×30`.

| Move | Keyboard / standard pad | Action phases (ms) | Contact event | Spatial hitbox (forward, top, width, height) | Damage / resource | Browser evidence |
| --- | --- | ---: | ---: | --- | --- | --- |
| Light 1: lead palm | J / left mouse / west (2) | 90 / 80 / 170 | 112ms | 8, 25, 30, 18 | 1 damage; +9 Resonance on hit | Right-facing contact capture; also first beat of tested chain |
| Light 2: side kick | J / left mouse / west (2) | 110 / 90 / 170 | 138ms | 11, 32, 38, 28 | 1 damage; +9 Resonance on hit | Live chained move; 138ms preserved |
| Light 3: rising forearm | J / left mouse / west (2) | 140 / 100 / 220 | 165ms | 7, 49, 43, 43 | 2 damage; +11 Resonance; upward launch | Live chain; 165ms preserved |
| Heavy launcher | K / right mouse / north (3) | 225 / 80 / 385 | 275ms | 6, 27, 38, 34 | 2 damage; upward launch | Contact capture and sentry HP/air-offset change observed |
| Aerial strike | J / left mouse / west (2), airborne | 115 / 95 / 280 | 160ms | 7, 46, 43, 26 | 1 damage; +9 Resonance | Dedicated generated contact pose captured in flight |
| Resonance imprint | Q / right bumper (5) | 270 / 90 / 480 | 340ms | 15, 34, 68, 29 | 2 damage; costs 35 of 100; 900ms cooldown | Hit, resource reduction, cooldown and generated pressure wave captured |

The clock steps at 60Hz with a 100ms bounded catch-up accumulator. Existing B01C contact instants (112, 138, 165ms) are covered by 30/60/120Hz equivalence tests. Contact uses the current target position, authored rectangles and facing, target height, target liveness, invulnerability/guard flags, and platform rectangles. One target can take at most one hit per action.

## Encounter values

- Iona: 5 temporary HP; dash evasion window 75ms; hurt invulnerability 700ms.
- Fractured Sentry: 8 HP; approaches to roughly 82px; telegraphs for 500ms, shows a 440ms tell, then lunges and resolves once. (The 500ms proximity timer is an approach cooldown before the visible 440ms telegraph.)
- Resonance starts at 55; melee hits and a correctly timed dodge replenish it. Special spends 35.
- `R` resets the chamber; `E` retries after either fighter reaches KO. This has no metaprogression.
- `C` cycles calm/light/busy background; `V` toggles combat VFX. OS reduced-motion preference suppresses VFX and camera shake without changing combat timing.

## Verification scope

`npm test` covers contact timing, cross-rate stepping, hit/miss/behind/height, blocked/guarded/invulnerable/KO results, obstacle blocking and cancel bounds. `npm run qa:b03` drives the installed headed Chrome game, synthetic standard pad, title/settings/pause, B03 actions, reset, B00 development root, production route guard and reduced-motion mode. Physical controller feel and subjective audio remain unverified; owner art-motion review remains pending.

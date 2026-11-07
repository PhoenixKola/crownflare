# Project Crownflare — Combat, Controls & Movement Spec

**Gameplay:** 2D side-view, manual attack inputs, grounded and airborne combat; authoritative gameplay timings independent from sprite/VFX presentation. B00 currently implements **only** movement, jump, dash, collisions, pause and a deterministic clock skeleton; all combat mappings below are planned for B03 onward.

## Default input map

| Intent | Keyboard/mouse | Gamepad proposal |
|---|---|---|
| Move horizontally | A/D, ←/→ | Left stick / D-pad |
| Jump | Space / W / ↑ | South face button |
| Crouch/drop when allowed | S / ↓ | Down |
| Light, combo | LMB / J | East face button |
| Heavy, launcher | RMB / K | North face button |
| Special | Q | Right bumper |
| Dodge / dash | Shift | West face button |
| Transform / choose | R | Left bumper |
| Finisher | F | Right trigger |
| Interact | E | D-pad Up (mapping to be validated) |
| Pause | Esc | Start |

Future control-remapping, controller reconnect and correct glyphs required; don't misrepresent preliminary B00 controller mapping as final playtested ergonomics. Mouse commands cannot trigger when UI captures focus. Guard/parry and double jump are **not automatically** granted; introduce only if balanced and tested.

## Movement feel and initial B00 tuning (NOT final balance)

Pure module `src/game/movement/motion.ts` controls intent: capped horizontal acceleration 1800 px/s², max speed 155 px/s, friction 2200 px/s², initial jump -285 px/s, coyote 105 ms, jump buffer 110 ms, dash 360 px/s for 125 ms with 430 ms cooldown. Scene owns Arcade collision/gravity. These values must be tuned through actual browser play, not treated as accepted. Variable jump on release, ground/fall state and stop-on-solid geometry are essential.

Aim: fast responsive controls, short deceleration without ice-skating, honest contact foot plants, stable L/R facing, no mid-transition input loss. Camera frames upcoming hazards, scales crisply at target aspect ratios. Additional wall-jump/grapple/double-jump must justify room design and have bespoke polished art.

## Attack and action model

An action is described by `moveId`, `startupMs`, `activeMs`, `recoveryMs`, `cancelWindows`, `hitboxByFrame`, `hurtboxByFrame`, `sfxEvents`, `vfxEvents`, `cameraEvents`, `animationFrameIds`, `trailAnchors`. Simulation emits deterministic `source`, `target`, `moveId`, timestamp and event ID; visuals and audio subscribe to those authoritative events. No damage before contact pose or from an invisible idle hitbox. B00 clock helper illustrates *timing contract only*, not a functioning attack.

Target first gold-standard combo: 3 different strikes with anticipatory torso/leg weight transfer; impact pose sharply aligned to damage/contact event; recoil/smear frames; cancel and buffered input permit fluid rhythm without instant invulnerable spam. Add distinct heavy/launcher, first pressure special, aerial follow-up and readable dodge. Test at real scale, both directions, against an actually moving enemy of varying height and without VFX first.

## Resonance/forms (design provisional until playtest)

Resonance builds through meaningful accurate play (hits/dodges/counters/room feats) with anti-spam. Forms unlock through story/metaprogression, not all on initial save. Switching costs/duration/upkeep should invite active use, not meter-hoarding. A form modifies movement body language, attack timing/cancel properties, special, finisher, animation architecture, aura and sound; preserves enough input language for mastery. Activation/deactivation must preserve collision and velocity continuity; debug unlocks do not mutate saves. Ultimate must be rarely available yet reliably earnable during a normal run.

## Action QA invariants

- Hitstop and hit sound/VFX only when result actually occurs; blocked/missed/critical outcomes visually differ.
- No enemy damage while animation is unrelated to strike; no inconsistent aimed-floor attack.
- 60Hz timing or controlled delta; tests cover event boundaries, held/rapid press, cancel priority, pause, interpolation, focus loss and variable framerate.
- Escape/menu focus and gamepad transitions never send unintended strikes.
- Invulnerability windows small, documented, balanced and visually marked. Dash never crosses a solid collision.
- Accessibility reductions preserve timing tells while reducing shake/flash/particles.

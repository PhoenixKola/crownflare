# PROJECT CROWNFLARE
## Master Handoff to a New ChatGPT Project — Original Premium 2D Transformation Action Roguelite

**Document type:** Complete creative, production, art, animation, technical, QA, and initial-project brief  
**Revision:** v1.0 — 7 November 2026  
**Audience:** The new ChatGPT project acting as Creative Director, Game Designer, Technical Architect, Art Director, QA Lead, and Codex delivery coordinator  
**Project status:** NEW, independent project; not yet built  
**Working codename:** **Project Crownflare** — an internal name only; no uniqueness, trademark, or release-name clearance has been performed. The final name can change.  
**Owner's non-negotiable principle:** **Make one genuinely spectacular playable hero and a complete, polished game before expanding the roster. Quality and animation consistency beat asset count, prompt count, or a rushed milestone checklist.**

> **IMPORTANT TO THE NEW CHATGPT:** You are being entrusted with a NEW game, inspired by lessons learned during an unsuccessful/unfinished animation-production effort in a completely separate game. **Do not modify, import, depend on, or repurpose the older Veyrshift repository, its story, characters, transformations, maps, code, art, or files.** The older project remains untouched. Start an entirely new repository, new design system, new hero, new world, new sprites, and new asset pipeline. The owner may use Codex as the coding and image-generation agent. Codex **can create original artwork**; do not preemptively restrict it to geometric placeholders or treat image generation as impossible. However, generated assets are *candidates* until demonstrated visually consistent, genuinely animated, and integrated at actual in-game scale.

---

# PART I — YOUR MISSION AND IMMEDIATE DELIVERABLES

## 1. What the owner is asking for

Create and steward an **original, premium pixel-art side-scrolling action roguelite** with thrilling martial-arts combat, highly expressive sprites and smooth animation, visually dramatic anime-inspired power-up auras, escalating transformations, sophisticated VFX and audio, excellent control feel, varied encounters, memorable bosses, branching room choices, replayability, and elegant modern UI.

Structural inspirations (NOT content to copy):
- **Dead Cells:** responsive 2D combat, traversal, telegraphs, animation punch, satisfying runs.
- **Astral Ascent:** beautiful pixel environments, skill-driven combat rooms, branching roguelite progression, distinct encounter spectacle.
- **Skul: The Hero Slayer:** dramatic form-dependent combat identity and powerful silhouette changes.
- **High-energy anime transformation sequences:** emotional escalation, aura movement, atmospheric pressure, impact and anticipation. **Never imitate any protected character's hair, face, outfits, iconic palette/shape, exact pose, dialog, audio, moves, specific energy attacks, or signature animation.** The feeling of an overwhelming power increase is the brief; all content is original.

**Game genre locked:** 2D side-view **action roguelite**, chamber/room-based with platforming, ground + air combat, boss encounters, selected route branches and permanent metaprogression. This is NOT an isometric 2.5D game, a turn-based RPG, a bullet-heaven auto-battler, or a large interconnected Metroidvania. The player controls every attack manually.

**Initial shipped roster locked:** **ONE fully completed playable hero** with Base + 3 FULL transformations (four combat identities total). A possible eventual roster of **3–4 heroes TOTAL** belongs in long-term roadmap documents ONLY; do not draw, animate, develop, balance or implement additional playable heroes before the first hero and first-release gameplay pass their quality gates.

**Separate project rule:** Independent root directory, Git repository, package name, asset catalog, save namespace, CI/test harness, docs and architecture. Never write into Veyrshift's directories.

## 2. Your first response and first actions when receiving this file

Do not immediately dump an enormous unreviewed codebase or promise a finished game in one batch. **Establish the project with real artifacts**, then execute a bounded first milestone.

**First response in the new ChatGPT project must:**
1. Explicitly adopt this specification, with a compact summary of the locked decisions.
2. Propose the strongest ONE original protagonist design plus the three distinct transformation identities, using the **creative seed below** as a default, and call out only meaningful changes you recommend. Do not generate 20 concepts without purpose.
3. Present the project name as a provisional codename, not a confirmed available commercial brand.
4. Present a clear phase-by-phase production roadmap and quality signoff gates.
5. **Create an initial project foundation pack** as downloadable `.md` files and, when filesystem/project tools are available, an initial runnable source project. See Section 31 for the exact first milestone and required file tree.
6. Create an actual **downloadable kebab-case Markdown prompt** for Codex to implement the first milestone (`b00-initialize-original-pixel-action-roguelite.md`). Do NOT paste the entire agent prompt inline as a replacement for the file. Use verified file paths/links.
7. Explicitly state what has actually been created, what was only planned, which tests have actually run, and which items need owner visual signoff.
8. Do not require unnecessary clarification before useful work. Choose thoughtful defaults; seek owner approval at the **hero visual lock** and **first playable-animation gate**, not for every small setting.

**If direct repository creation is available:** initialize the actual repository and create/run the starter project in the same task, then offer the finished source and logs. If it is not available: produce the detailed foundation documents and Codex B00 prompt, clearly saying that no repo has yet been created. **Never claim to have committed, run or verified code without doing so.**

**Owner delivery preference:** Every Codex / Claude Code / agent implementation prompt must be a **real downloadable `.md` file**, named in lowercase kebab-case; not just a chat message, writing block, link to an imaginary local Windows drive, or pasted prompt. Keep successive prompts focused and cumulative.

---

# PART II — CREATIVE VISION / ORIGINAL IP

## 3. Working creative premise

**Crownflare** is a kinetic pixel-art action roguelite set among the ruins of an ancient orbital **Lumen Spindle**, a machine that once stabilized the world's day/night cycle. Its broken segments have become living combat arenas suspended above a storm-torn world. Each expedition travels through shifting districts, battles guardians made from fractured elemental laws, gathers volatile *Resonance*, and decides how much of the Spindle's forbidden power to awaken.

Tone: exhilarating, enigmatic, bold, colorful, not relentlessly grim. Story is delivered through restrained environmental storytelling, short excellent character conversations, memorable rival/boss encounters, evolving hub scenes and beautiful illustrations — not text walls.

**Original core fantasy:** A fast martial fighter gradually evolves from an agile human combatant into an impossible celestial entity. Each transformation fundamentally changes silhouette, animations, movement behavior, attack rhythm and audio-visual language. Form progression should feel earned and exciting, never merely a hue shift with a damage multiplier.

**Creative seed only, pending owner visual approval:**
- Protagonist **Iona Rell** (pronunciation/name editable before official lock): a young adult kinetic duelist and former Spindle courier; athletic, impulsive but capable, haunted by the Spindle's collapse. The name is an internal original-design seed, not a claim of trademark clearance.
- **Base:** asymmetrically clipped pearl-silver hair with one teal accent lock; cropped navy expedition jacket, warm copper wrist pieces, pale sash/cloth ribbon, practical boots, compact martial stance. Distinct, readable face and silhouette; avoid the purple-haired Kairo / bronze-cuff Veyrshift look. Use restraint in asymmetry so left/right sprite production remains manageable.
- Visual motifs: **split-ring orbit, light filaments, heatless pressure and eventually impossible celestial anatomy**. Not dragon balls, Saiyans, copyrighted ki shapes, specific anime characters or familiar costumes.
- Signature combat language: fast, weighty close-range strikes that imprint luminous **resonance marks**, alternate with short range compressed-energy techniques, and culminate in an emphatic finisher.

The new ChatGPT may pitch an even stronger original character concept, but it must explicitly **choose one** and make all later art traceable to the owner's approved reference sheet. Avoid character-design roulette.

## 4. Long-term character cap (documentation only)

**Hero 1 (INITIAL RELEASE):** Iona Rell — close-range kinetic martial artist; Base + 3 transformations. This is the ONLY character with gameplay implementation for the planned first release.

**Potential expansions, NOT initial implementation:**
- Hero 2: a grounded counter-oriented weapon specialist with different silhouettes and combat dynamics.
- Hero 3: an aerial mobility/trick-shot fighter with different resource management.
- Hero 4 (optional final cap): an unorthodox heavyweight with slow powerful attacks and a radically different traversal style.

No duplicate move lists with differently colored attacks, and no promise to ship 3–4 heroes now. Other heroes are **locked out of production scope** until Hero 1 is fully accepted and the game is playable start-to-credits with excellent QA.

## 5. Four playable states: Base + THREE spectacular transformations

These are art/combat pillars, not optional cosmetics. Names are provisional; identities must remain strongly distinct. Each form needs actual character art, action animations, HUD treatment, aura particles and bespoke audio, not only a stat boost. All three must appear meaningfully in ordinary gameplay, not only a dev showcase.

### BASE — Iona / The Courier

**Shape:** Human-scale agile martial artist. Clear head, torso, hand, legs silhouette. Scarf/ribbon gives secondary motion but never obscures strikes.  
**Palette:** Deep navy, pale pearl, restrained warm ochre and teal.  
**Animation tone:** Grounded, agile, weight transfer, careful foot plants, brisk jabs, hooks, launchers, aerial follow-ups.  
**Mechanical identity:** Accessible and complete; 3-hit combo, heavy launcher, short energy blast, dodge, jump/double-jump unlock if appropriate, parry or timed guard if justified. Base must be FUN without a transformation.

### FORM 1 — **DAWNRUSH** / The First Radiance

**Fantasy:** The body begins conducting unstable solar pressure. The fighter *ignites* without losing human identity.  
**Silhouette change:** More upright hair/shadow shape; glowing kinetic bands erupt from shoulders/forearms; scarf whips backwards in an energetic spiral; tiny floating armor fragments or glowing seams.  
**Aura:** Animated amber-to-coral filaments, atmospheric dust drawn inward, pulsing luminous pressure ring and sparks that race along striking limbs. NOT a generic still flame PNG, not copied golden spiked hair.  
**Movement:** Faster grounded dash, more aggressive stance, slightly changed punch arcs, distinctive aerial burst.  
**Combat:** Heat/pressure stacking through committed strings; special creates a forward ripping pressure lance; finisher converts built stacks into a short, massive, readable impact.  
**Audio:** Warm tonal ignition, rising pressure, low punch bloom, sharp detonation tails.  
**Gate:** Obviously transformed with VFX **OFF**, and outstandingly powerful with VFX ON.

### FORM 2 — **STORMHALO** / The Resonant Crown

**Fantasy:** Pressure becomes precise electrical geometry and gravitational timing. More controlled but visibly overwhelming.  
**Silhouette change:** Longer sharp coat shape or floating collar fins, distinctive split halo visible in motion, illuminated iris geometry, angular arm silhouette. A real redesign, not Dawnrush in blue.  
**Aura:** Orbiting indigo/white-violet arcs, narrow prismatic traces, sharp reactive air distortions, controlled filaments that snap to the body during guard and counter.  
**Movement:** Quick phase-step, crisp stopping, aerial reposition, more precise dodge/parry visual logic.  
**Combat:** Counter/reversal specialist; charged precision strikes and chaining to controlled bursts, different specials and finisher.  
**Audio:** Charged high-frequency edge with rich midrange body, crystalline snap, spacious decay; distinct from Dawnrush.  
**Gate:** At gameplay scale, moving without effects, should not be mistaken for Dawnrush or base.

### FORM 3 — **ECLIPSE WARDEN** / The Final Metamorphosis

**This is the signature event of the entire game.** It must feel like a new entity, not a recolor, spiky hair or bigger aura. The player should recognize the original hero's identity in a few retained motifs, but see an overwhelming physical metamorphosis.

**Required metamorphosis, art-directed for platform readability:**
- Entirely new head / mask / floating crown silhouette; eyes become luminous void-lenses or layered spectral pupils; recognizable trace of Iona's facial/emotional identity but radically transformed.
- Humanoid proportions change decisively: a taller lean floating figure, asymmetrical plated limbs and segmented arms, trailing energy-mantle instead of a cloth scarf, hovering feet or levitating stance.
- Controlled **detached orbiting elements** (e.g. three luminous blade/ring segments that follow a authored animation hierarchy), a huge original silhouette, no literal anime transformation imitation.
- Living dual-layer aura: near-black/ivory edge light, hot coral singularity center, rotating fragments, shockwave ripples and environmental reaction. Motion of the aura is unique and synchronized; no seizure-inducing constant full-screen flash.
- Different run/hover/jump/dodge feel and new body animation architecture; new combo pattern, aerial movement and special, ultimate finisher with a purpose-built artistic set piece.
- In the finisher, camera staging, audio silence → pressure charge → release, impact freeze and dissipating particles should be exceptionally coordinated. Maintain gameplay readability and accessibility.
- This form needs its OWN full sprite/action catalog. DO NOT claim that scaling up Iona, recoloring base sprites or layering a mask over the head is enough.

**Gate:** Side-by-side static silhouettes of Base, Dawnrush, Stormhalo and Eclipse Warden all differ substantially even as single-color black silhouettes. The final form is the standout masterpiece. Show comparisons at the real player height, not only cinematic concept art.

## 6. Transformation game design (not just visuals)

**Provisional resource design:**
- Player builds a **Resonance Gauge** through precise play — manual hits, dodge timing, parries/counters, room feats — with anti-spam and fair balancing.
- Forms unlock through progression and achievements, not simply all handed out at first launch; allow development QA unlock overrides without altering player saves.
- Transformation activation has brief anticipation and visual event, invulnerability/buffer windows only when specifically balanced, and clear feedback.
- Each form changes move properties, move visuals, movement signatures, resource trade-offs and a subset of core attacks. It doesn't entirely erase all muscle memory.
- Transformation duration or upkeep must be designed to encourage exciting use without making the player hoard the gauge forever. Consider high-impact short windows, upgrades that modify uptime and purposefully designed activation opportunities.
- Reversion is animated, readable, and cannot break hitboxes or collision.
- Ultimate transformation should be a climactic, rarely available but **reliably earnable** payoff in a normal run, not a trailer-only feature.
- Finisher and special are mechanically distinct. Finisher gates, costs, stagger, cancel rules and impact windows must be clear and tested.

Keep transformation activation and deactivation responsive, avoid long forced cutscenes during standard combat; reserve optional longer cinematic presentation for the first unlock or major story moment.

---

# PART III — GAME DESIGN AND FEEL

## 7. Core gameplay loop

Title → hub/safe zone → select starting options/upgrades → choose branching room/route → traverse/fight → collect reward → pick meaningful upgrade/repair/event → elite/boss → further branch → final encounter or defeat → results/rewards → persistent metaprogression → next run.

Runs target **about 25–35 minutes** once the game is mature, adjustable through real playtest data. A short polished game is preferable to a sprawling empty one. Individual rooms typically support fast combat with a distinct rhythm and purposeful decisions; don't stretch them merely for length.

## 8. Traversal and movement feel

Side-view movement: **A/D or left/right arrows** move horizontally; **Space/W/up** jump; **S/down** crouch or drop through appropriate platforms. Shift dodges/dashes. Diagonal 8-view movement is not part of this game.

Technical feel requirements:
- responsive acceleration/deceleration and adjustable friction
- coyote time and jump input buffering
- variable jump height, clearly readable rise/apex/fall
- grounded/air animation transitions, landing anticipation/squash
- dash with fair invulnerability window and visible VFX
- walls/platforms with reliable collision, one-way platforms as needed
- ledge and slope handling only if justified and tested
- camera follow that reads upcoming hazards; no nausea-inducing zoom/shake
- predictable control during transformation changes; no frame of unintended velocity or loss of input
- no accidental diagonal-facing art problem: this is a **side-view** fighter primarily left/right.

**Do not reflexively add double-jump, wall-jump, grappling, wall-run and air dash all at once.** Introduce movement one mechanic at a time and verify its quality and how rooms are designed around it.

## 9. Combat inputs and rules (starting proposal)

### Keyboard + mouse default
- A/D or ←/→: horizontal travel
- W/↑/Space: jump (configurable; don't bind conflicting actions)
- S/↓: crouch / descend from allowed platform
- Left mouse or J: light combo attack
- Right mouse or K: heavy/launcher
- Q: active special
- Shift: dodge/dash
- R: transformation (selection/activation UX to be designed cleanly)
- F: finisher / ultimate when ready
- E: interact, where relevant
- Esc: pause

Ensure mouse clicks work reliably when game is focused. Offer sensible remapping and a clean controls screen. Handle focus loss, repeat-key edge cases and menu/game input isolation.

### Gamepad
Native support required, not an afterthought: horizontal move left stick/D-pad, buttons for jump/light/heavy/dodge/special, shoulder inputs for forms and finisher, Start pause. Correct prompts switch automatically between controller and keyboard, handle reconnect and dead zones. Avoid controller layouts requiring simultaneous impossible finger positions.

### Player action rules
- At least a three-hit grounded combo with distinct, well-timed poses.
- Clear cancel windows and input buffer so clicks connect into a fluid chain, with recoveries to preserve skill.
- Variable moves: launcher, aerial string, air-dash strike and one ranged/pressure option where balanced.
- Contact frame damage must match the visible strike. Attacks have startup/active/recovery; prevent ghost damage in unrelated poses.
- Hitstun, hitstop, knockback, stagger, invulnerability, and cancel priority are defined, tested and visually synchronized.
- An enemy may be behind the player; facing and target choice must be stable. No arbitrary aim toward the floor from previous Veyrshift issues.
- Enemy attack telegraphs are clear, with readable hitboxes, distinct sounds and fairness windows.
- Combat feels powerful **because the body and impact move well**, not because the camera shakes uncontrollably.

## 10. Combat quality and responsiveness acceptance

At normal speed and real gameplay size:
- Each hit has anticipation, a strong contact silhouette, recoil and settling. Three hits must NOT look like unrelated whole-body stills, repeated identical punches or a stretched translation of one image.
- Character footwork relates to attack direction, knockback and movement; no uncontrolled foot sliding.
- Players can understand when damage lands, what the enemy is doing and whether an attack was blocked/missed/critical.
- Chaining attacks produces appealing rhythmic motion without noticeable idle snaps between actions.
- Collision, hitstop, VFX and audio events share authoritative timing data.
- Combo works against moving enemies, at different heights and with left/right facing; not only a fixed invincible test dummy.
- Ground and air states don't flicker or lose input.

## 11. Room design and encounter variety

Prefer **curated procedural assembly**: handcrafted room chunks with controlled platform geometry, entry/exit anchors, spawn rules, environmental hazards and authored pacing. The overall run structure branches, but individual rooms are carefully constructed — not random rectangles full of noise.

Every environment needs:
- coherent color identity and depth layers
- solid foreground/platform readability
- non-confusing environmental collision
- at least one meaningful interactive set piece or traversal beat
- animation: dust, wind, foliage, machinery, weather, distant moving parallax as relevant
- balanced contrast: the hero, enemies, telegraphs and pickups remain visually dominant.

**Provisional first-release content target** (quality may revise scope):
- Two visually distinct regions plus a dramatic final arena.
- Approximately 6 well-designed regular enemy archetypes and 2 elite variations across the full release, each truly animated.
- Two region bosses plus one final boss, each with readable telegraphs, distinct phases and spectacular but fair attacks.
- Handcrafted room pool sufficient for branching replayability; no fake endless-procedural promise.
- Curated upgrades and events that make repeated runs strategically different.

Do not implement these targets during B00. This is roadmap scope, not permission to rush content before the hero works.

## 12. Roguelite builds and upgrades

Upgrades should support meaningful build decisions, not +3% damage spam. Design categories such as:
- strike modifiers (finishers, launchers, combo chain interactions)
- mobility modifiers (dash charges, jump arcs, aerial cancel windows)
- resonance generators/spenders (form uptime, switching incentives)
- risk-reward conditions (perfect dodge bonuses, close-range stacking)
- utility/defense/recovery choices
- transformation-specific upgrades that change behavior, visuals and consequences.

Require clear stacking rules, caps, incompatibilities, and synergy tests. UI must explain what the upgrade does without vague prose. Keep initial release upgrade pool small enough to balance and animate; increase only once interactions are fun.

## 13. Enemies and bosses

Every enemy has a silhouette readable in side view, authored motion states, at least one clearly telegraphed pattern, hit/hurt/KO animation, distinct sound/VFX and tested collision. Bosses need a coherent visual theme and staged encounter direction, not a giant health bar that attacks randomly. Include fair punishment opportunities and readability through the hero's largest aura. No enemy AI that depends on player standing in a single test location.

## 14. Story and progression

Environmental lore + compact interactions in hub and during encounters, key choices and endings. The protagonist's transformation ladder should connect to narrative costs, not arbitrary menu unlocks. Make one complete story arc for the first playable hero. Later heroes may show different aspects of the world, but are not required to complete the first game's story.

---

# PART IV — PREMIUM PIXEL-ART PRODUCTION

## 15. Locked visual strategy

**Gameplay = original premium 2D pixel art, side view.** Not a blurry faux-pixel rendering of HD anime stills, not generic 8-bit blocks, not cheap geometric stand-ins.

Visual target: high-end, coherent modern pixel-art action game with confident palettes, expressive motion, rich parallax scenes, sharp silhouettes, readable lighting and distinctive transformation effects. Modern shader/VFX techniques are welcome where coherent with the pixel grid.

Illustrated HD art is allowed for portraits, splash screens, dialogues, title images and first-unlock cinematics. It may not substitute for functional gameplay animation.

### Initial art-budget experiments (not blind permanent numbers)
- Internal viewport candidate: **480 × 270 logical pixels** at 16:9, crisp integer scaling where possible, adaptable to different monitors.
- Protagonist initial gameplay height: test **48–72 logical pixels**, with variants compared *inside the game* on a real environment. Choose final scale based on action readability.
- Form 3 silhouette may be taller/wider, but physics/collision and camera clarity must be deliberately controlled.
- Character color palettes: curated and consistent (roughly a few dozen colors and ramps, adjusted artistically); avoid noisy automated dithering and uncontrolled shading drift.
- Gameplay frame extraction: exact transparent PNG/source masters, final optimized WebP/PNG sheets or texture atlases, precise anchors and trims. Preserve transparency and nearest-neighbor crispness where desired.
- Art dimensions MUST be chosen from tested scale and animation behavior, not giant HD sheets that never look right in play.

**Important:** These are starting art-direction constraints, not a dogmatic ban on gorgeous images. Codex should explore the best original high-quality sprite-production method and prove the result.

## 16. Codex CAN generate sprites and artwork — use it intelligently

The coding agent is allowed and encouraged to use supported real image-generation and editing capabilities for:
- original hero/transformations turnaround sheets
- key poses and sprite frames
- enemy animation artwork
- animation VFX flipbooks/textures
- UI icons, portraits, backgrounds, environmental details and boss concepts.

**NEVER falsely say Codex is limited to programmatic primitive drawing.** It can orchestrate image generation where those tools are available. However, tool availability and quality must be checked in the actual execution environment; don't promise an unavailable generator or invent generated-file paths.

Recommended asset-authoring workflow:
1. Establish one hero **visual bible**: shape proportions, hair/face, palette swatches, costume accents, turnaround references, silhouette at game size, naming/ownership, material language.
2. Generate a short curated set of **base hero masters**. Pick ONE canonical master through owner visual signoff.
3. Maintain immutable canonical reference and use image editing/reference-guided generation for later poses — do not regenerate character identity from scratch for each action.
4. Author an **action storyboard** with meaningful anticipation, extreme pose, contact, recoil and recovery before producing every in-between.
5. Generate short purposeful batches of key poses. Correct face, anatomy, proportions, hand shape, hair, outfit, contact points, lighting and anchors. Reject bad frames immediately; no accumulating rejected art in runtime.
6. Use exact canvas/pivot/origin alignment. Create missing intermediate frames with carefully controlled pixel-art editing, interpolation and animation-aware postproduction where it genuinely helps; do not claim interpolation alone is high-quality animation.
7. Composite, preview at normal speed and true gameplay size, test against a live enemy and real camera.
8. Fix weak frames and timing before producing the next action/direction/form.
9. Export optimized runtime atlas; store source masters and a machine-readable animation/action/event manifest with checksums/provenance.

**DO NOT** rely on any of the approaches that repeatedly failed the old project:
- 8 unrelated poses with long holds
- naive mirror of asymmetric clothing without correction
- arbitrarily separating a finished illustration into body layers and leaving transparent joint gaps
- a supposedly animated figure that only translates/rotates as one image
- repeated perfect-green tests accepted as proof of great art.

A 2D rig, layered sprites, authored flipbook or hybrid method **may** be used if it passes the visible art-quality test. No Blender/3D application should be a prerequisite for this new project; avoid unnecessary installation or production locks. The core pipeline should be buildable with Node/TypeScript and image manipulation tools plus Codex image-generation capabilities.

## 17. GOLD STANDARD: one complete animation before asset multiplication

Before large content production, prove:
- Base hero *idle → run → jump/fall → land → dodge* transition, with correct feet and spacing.
- A right-facing **3-hit combo** (and left-facing/accurate counterpart), with real expressive individual poses, clean transitions and hit sync.
- One special with character artwork, impact VFX and audio.
- Normal-speed in-game recording at true scale; mouse/keyboard and gamepad behavior.

**The first combat animation is the entire project's production gate.** Do not proceed to hundreds of sprites, enemies or transformations until the owner explicitly signs off on the character style, body consistency, motion, and performance. One correct and reusable art production method matters more than a mountain of files.

## 18. Sprite animation state catalog for each completed combat form

Each completed form gets appropriate states rather than simply recoloring base frames. Minimum planned states:
- Idle/ready, run start/loop/stop, turn/face change, jump ascent/apex/fall, landing, dash/dodge, guard/parry (if mechanic is kept), hit/hurt, launch/knockback, KO, revive/get up (if applicable), interact.
- Ground light combo hits 1/2/3 (distinct), heavy/launcher, aerial light/hard strike, ranged/special cast (if used), special active, finisher windup/release/recovery.
- Transformation **activate**, active-form settle, **deactivate/revert**, interruption and save/resume states.
- Per-state directional assets or proven artistically clean mirrored counterparts with correctly handled asymmetric pieces.
- Additional form-exclusive movement and attack states where the moveset differs.

Do not define a rigid frame count like “four frames per state.” More frames do not inherently mean fluidity; animation should use deliberate key poses, appropriate in-betweens, correct timing and action-specific rhythm. Keep frame events, hitbox updates, SFX hooks, trail anchor points and camera feedback synchronized to the action manifest.

## 19. Visual effects quality

VFX are art, animation and engineering together:
- Auras consist of **living** layered animated elements — inner energy, edge wisps, orbiting particles, distortion, sparks, time-varying form shapes — not a single looping PNG scaling and fading.
- Visible power-up progression: each form has a unique aura topology and choreography, not merely different tint.
- Punches: limb-tracked strike arc, ephemeral motion streaks, energy contact burst, residual fragments. Big hits have punchy staged shockwaves and dissipation.
- Camera shake/hitstop used with taste. Shakes should never conceal the actual body pose.
- VFX/events respond to actual damage/guard/miss/critical outcomes. No explosions on misses unless intentionally telegraphed special behavior.
- Keep telegraphs, enemy silhouettes, platforms and HUD readable even with Ultimate activated.
- Optimization: texture atlases, pooled particle emitters, bounded effects and cached assets; avoid runaway memory/GC.
- Accessibility: reduce flashes, shake, bloom/distortion, background chaos, particle density and motion with proper settings, while retaining timing cues.

## 20. Audio production

Original sound design (not borrowed copyrighted audio): footsteps, jump/land, attack swish, correct hit/miss, impact weight, parry, dodge, transformation onset/active loop/reversion, form-specific casts, ultimate finisher, enemy telegraphs, boss attacks, rewards, UI interactions, ambience and original music.

Use authored/licensed-clear assets and generative audio where supported; capture provenance/license. Procedural synthesis is acceptable for initial proof only if it sounds good; do not ship thin placeholder beeps as premium combat audio.

**Audio quality gate requires listening** on real speakers/headphones with the game running: balance, frequency range, repetition, reverb/decay, music ducking on impacts, no clipping and stable WebAudio unlock. Browser-automation WebM may be video-only; don't falsely claim audio review from it. Provide owner recording workflow with system sound (OBS or Windows capture) where the agent cannot listen.

---

# PART V — UX, UI, PRESENTATION, ACCESSIBILITY

## 21. High-end game menus and HUD

No React-dashboard appearance, huge rectangle buttons or developer controls masquerading as product UI. Build a cohesive original game interface:
- atmospheric title sequence and original logo lockup
- animated menu navigation, gamepad support, focus states, correct hover/audio
- elegant hub, room-choice, pause, upgrades, codex, options and results screens
- clean form selection/unlock feedback
- HUD: health, Resonance, form readiness, special cooldown, finisher meter, temporary buffs, enemy tells, boss health phases
- meaningful iconography (actual original illustrated icons, not plain Unicode symbols)
- accessible contrast, readable type size, no clipped menus or offscreen focus
- consistent dark/bright environment adaptability
- optional reduced-motion mode and granular screen shake/flash settings.

UI should remain legible across 16:9 resolutions and window resizing. Responsive behavior for 16:10, 21:9 and smaller windows should use safe layouts, not distort the pixel coordinate system. Do not promise touch/mobile port in B00. Design future support but **primary initial platform = desktop browser with keyboard/mouse and controller**.

## 22. Player experience and fairness

- Clear new run flow; no confusing dead-end menu.
- Pause freezes the correct simulation and audio state, including VFX and timers.
- Settings persist and work: audio mix, controller, pixel scaling, camera shake, flash intensity, accessibility, window/fullscreen where allowed.
- Save metadata versioned; crash-safe resume and intentional run-end handling; no duplicated unlocks or corrupt save.
- Consistent errors, input focus restoration, no accidental attack on menu close.
- Training/help text is brief and contextual; show controls intuitively.
- Performance is stable in boss arenas and during maximum aura intensity.

---

# PART VI — IMPLEMENTATION ARCHITECTURE

## 23. Technology and dependencies

**Suggested starting stack for the NEW standalone browser game:**
- **TypeScript** (strict mode) + **Vite**.
- **Phaser 4.x** for 2D scenes, sprite animation, cameras, input, Arcade Physics, rendering and particles. A stable Phaser 4 version is available as of this brief; the new ChatGPT/Codex should verify current compatibility and pin an exact tested version in `package-lock.json` before implementation. If there is a specific blocker, compare a supported stable Phaser 3 release rather than casually rewriting physics with a custom engine.
- Lightweight DOM/React UI **only if it materially improves the menus**; do not create a separate React application framework around every gameplay system. Avoid a huge front-end microservice architecture.
- Pixel-accurate sprite rendering/nearest-neighbor settings where appropriate, with intentional smooth high-res VFX/UI layers where needed.
- Node.js/npm for development, asset processing, test harnesses and reproducible build.
- Unit tests (Vitest or comparable), deterministic headless simulation, Playwright local real-browser integration checks.
- No backend/database/accounts/cloud server at initial release. Start with versioned localStorage/IndexedDB where justified, exportable saves optional later.

**References for technical selection:** Phaser official docs `https://www.phaser.io/oss/docs`, releases `https://github.com/phaserjs/phaser/releases`, Arcade Physics concept `https://docs.phaser.io/phaser/concepts/physics/arcade`. The tools are library APIs; the owner need not install Blender or proprietary visual editors. Check live APIs before writing code; avoid using obsolete Phaser 3 assumptions in a Phaser 4 project.

**Architectural caution:** Separate authoritative combat simulation/state from sprite presentation and effects. One timing authority for attacks, hitboxes, form resources and VFX events. Avoid the prior failure mode where the animation shows a punch after the simulation damage frame or the special sprite suddenly becomes a generic combo fallback.

## 24. Suggested source structure (adapt to actual framework)

```text
project-crownflare/
├── README.md
├── package.json
├── package-lock.json
├── tsconfig.json
├── vite.config.ts
├── index.html
├── .gitignore
├── .editorconfig
├── public/
│   └── assets/
│       ├── characters/iona/{base,dawnrush,stormhalo,eclipse-warden}/
│       ├── enemies/
│       ├── bosses/
│       ├── environments/
│       ├── vfx/
│       ├── ui/
│       └── audio/
├── art-source/
│   ├── characters/iona/
│   ├── backgrounds/
│   ├── vfx/
│   ├── ui/
│   └── manifests/
├── src/
│   ├── main.ts
│   ├── game/
│   │   ├── scenes/
│   │   ├── actor/
│   │   ├── animation/
│   │   ├── combat/
│   │   ├── movement/
│   │   ├── forms/
│   │   ├── enemies/
│   │   ├── rooms/
│   │   ├── progression/
│   │   ├── input/
│   │   ├── audio/
│   │   ├── vfx/
│   │   └── persistence/
│   ├── ui/
│   ├── config/
│   └── types/
├── tools/
│   ├── art-export/
│   ├── audit-assets/
│   └── local-qa/
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── browser/
│   └── evidence/   # outputs ignored or externally archived
├── docs/
│   ├── 00-project-charter.md
│   ├── 01-creative-vision.md
│   ├── 02-hero-and-transformations-bible.md
│   ├── 03-combat-and-movement-spec.md
│   ├── 04-art-and-animation-pipeline.md
│   ├── 05-world-and-roguelite-design.md
│   ├── 06-technical-architecture.md
│   ├── 07-roadmap-and-gates.md
│   ├── 08-qa-and-acceptance.md
│   ├── 09-asset-provenance-and-retention.md
│   ├── 10-decisions-and-change-log.md
│   └── qa/
└── prompts/         # locally ignored Codex prompts; deliver externally as .md files
```

Create only directories that are useful in the actual first batch. Avoid fake empty code modules and hundreds of empty files.

## 25. Asset, Git and release hygiene

The older game became bloated with raw PNGs, rejected iterations, duplicate atlases, huge screenshots and nested ZIPs. Prevent that **from the first commit**.

**Keep tracked:** active runtime art, irreplaceable canonical source masters, approved character reference, pipeline scripts, manifests, small curated evidence/images, docs and code.

**Git-ignore or external-archive:** large Playwright output folders, recorded long WebM, rejected concept galleries, temporary image generation scratch, diagnostic screenshots, compressed handoff ZIPs, caches, node_modules, dist, test browser profiles, performance traces.

**Do not delete irreplaceable source art** to make the ZIP look small. Archive it with manifests and checksums separately. Every art removal must be dependency-audited. Adopt file size budgets, regular compressed-size reporting and documented retention rules, while leaving room for necessary beautiful original sprites.

Never claim a ZIP is small without measuring it. Avoid mirroring the full runtime art into multiple large folders unnecessarily. If Git LFS is ever useful, consider it deliberately with owner consent and a storage/access plan; don't silently add another dependency.

## 26. Game state, deterministic tests and debug instruments

- A reliable action state machine: idle, movement, jump/fall, attack startup/active/recovery, dodge, hit, KO, transform, stunned, menu.
- Fixed/deterministic combat timestep or carefully controlled event timing; events carry source, target, contact frame and move ID.
- Explicit input buffering and cancel rules, with simulation tests on timing edges.
- VFX layer subscribes to combat events without changing hitboxes.
- Debug options for hitbox visualization, frame step, move IDs, state transitions, gauge values and active animation states; developer-only, never leaks into public gameplay menus.
- Seeded room generation and repeatable QA scenarios.
- Run saves versioned; migrations tested; no accidental cross-project localStorage namespace collision with Veyrshift.

---

# PART VII — QUALITY ASSURANCE AND EXPERIENCE GATES

## 27. Three different meanings of “pass”

**Technical pass:** app builds, tests pass, no major runtime errors, simulation assertions correct.

**Art/motion pass:** actual art matches canonical identity, silhouettes, palette and frame consistency; animations flow and read correctly at normal speed/gameplay scale. This is NOT proved by unit tests, screenshot contact sheets, or an animation manifest alone.

**Owner experience pass:** the owner actually plays/watches, evaluates combat responsiveness, aesthetic ambition and sound, then **explicitly approves**. Do NOT claim this gate without the owner's approval.

Each batch status uses all three dimensions: `TECH PASS/FAIL/BLOCKED`, `ART-MOTION PASS/FAIL/PENDING`, and `OWNER APPROVAL APPROVED/CHANGES REQUESTED/PENDING`. An internal AI's subjective “looks excellent” is an assessment, not owner approval.

## 28. Browser QA workflow — from day one

- Actual local Vite game in authorized Chrome/Chromium; automated Playwright checks should use the real app, no fake standalone renderer or static GIF substituted for game footage.
- Create a stable `npm run qa:chrome:local` workflow for user-owned Windows desktop; a separate `qa:chrome:headless` automated path is supplementary. No reliance on unavailable remote browser host.
- Capture actual gameplay clips at normal playback speed, with logged game-state actions, errors, frame timings and build version.
- Audio must be recorded **with system sound** separately when Playwright outputs video-only WebM; provide owner instructions and listen to it where possible.
- Review hero silhouette at 100% and 75% display size, in clean and busy rooms, forms active and reduced-flash.
- Input tests for keyboard/mouse/gamepad where available; no false claims that a headless browser tested physical controller feel.
- Screenshot/asset pipeline tests: alpha, clipping, atlas rectangles, no ghost pixels, left/right anatomy, event frames, missing files.
- Save/load, resizing, WebGL/context loss, reduced motion, pause/focus-loss and runtime memory checks at appropriate stages.

## 29. Hard stage gates

### Art lock gate
One original hero design and form silhouettes approved by owner at true gameplay size; reference bible and palette recorded. No mass sprite generation before this.

### First animation gate
One playable complete motion sequence (locomotion and combo) **looks excellent**, no body drift/stutter/popping, matches actual hit timing, original sound/VFX integrated, and owner approves.

### First combat vertical-slice gate
One visually complete combat room, hero, enemy, VFX/audio, controls and HUD. Actual 1–3-minute playable recording and owner review. No “proof” that is only colored boxes.

### Each transformation gate
Full visual identity, meaningful moveset, actual action animation, activation/reversion, aura VFX, form-specific audio/icons/HUD, left/right correctness, ordinary-game integration and recorded review. Owner approval required before calling it complete.

### Content expansion gate
Enemy/boss/room quality equals the hero's baseline; no half-built content added simply to hit quantity targets.

### Release candidate gate
New game → full run → boss → ending/results → hub/meta changes works with clean install. Keyboard/controller, saves, UX, UI, performance, accessibility, audio, desktop sizes and error recovery are actually tested. No signoff with missing evidence.

---

# PART VIII — LESSONS WE MUST NOT REPEAT

## 30. Precise failure modes learned from the older project

The previous separate game experienced months' worth of inefficient-feeling iteration in one transformation milestone. Treat these as production anti-patterns, not as assets or design inspiration to import:

1. **Too detailed, eight-view HD character art** before having a reliable animation pipeline. Here: start with purpose-designed **side-view premium pixel art** and left/right movement.
2. **Uncontrolled image variants.** Here: curated master, explicit reference lock, one correction pass and owner gate.
3. **Many independently generated full-body poses** causing identity drift and slideshow motion. Here: storyboard each action, lock proportions, use real in-betweens/smear and review continuously in real gameplay.
4. **Naive 2D rig/cutout experiments** led to disconnected cuffs/limbs and blank or blurry joints. Here: do not presume rigs are the solution. Use the best method empirically; prefer complete authored pixel poses where they produce the best results.
5. **Blender pilot without checking dependency availability.** Here: browser-first JS/TS/Phaser production with no Blender requirement.
6. **Gameplay footage missing from shared ZIPs.** Here: each important motion batch delivers a compact, explicitly included review clip outside ignored evidence folders, with source/build hash.
7. **Browser host repeatedly inaccessible** leading to no art judgment. Here: owner-authorized Windows local QA command built and proven early; do not confuse headless with human observation.
8. **Art source references mislabeled** (Glass concept treated as Ember). Here: asset filenames, IDs, hashes and reference provenance immutable and reviewed.
9. **Sprite direction fallback** that switches to a wrong-looking character when using diagonal or special moves. Here: only left/right side-view, and no silent base-body fallback during active transformed actions.
10. **VFX used to disguise poor body animation.** Here: form and attack must look excellent with VFX hidden, then layered effects elevate them.
11. **Test count treated as quality.** Here: technical and artistic gates reported separately.
12. **Prompts too broad**: asking simultaneously for hundreds of sprites, UI, QA, multiple forms and game systems, resulting in partial completions. Here: small, outcome-driven implementation batches, with owner-facing visual acceptance.
13. **Code-only polish mistaken for new sprites.** Here: describe asset generation as explicit deliverable, verify new source and runtime files are referenced in actual gameplay, report state coverage.
14. **Provisional art shown as approved.** Here: status and owner approval explicit at every milestone.
15. **Unnecessary repository bloat** from rejections/videos/ZIPs. Here: retention policy from initial commit.
16. **Infinite fallback experiments.** Here: each technique gets a bounded time/scope and a GO/NO-GO based on real in-game result. If AI art consistently fails a frame class, isolate exactly that task for manual/art specialist work rather than retrying endlessly.
17. **No cohesive soundtrack / audio listening.** Here: real audio capture and subjective playtest are mandatory production gates.
18. **No single visually spectacular playable vertical slice before scaling.** Here: create and approve one gold-standard hero and room first, then replicate the accepted approach.

**Do not reduce artistic ambition out of fear.** Codex can generate original sprites and VFX. The constraint is **quality per asset, motion coherence and inspection**, not a blanket ban on AI image tools or a restriction to procedural placeholder art.

---

# PART IX — DEVELOPMENT ROADMAP (ONE HERO FIRST)

## 31. Fourteen major milestones, unlimited focused corrections WITHIN a milestone

The names below are major production phases, not permission to advance simply because a script is green. Each can contain multiple targeted art/code/QA micro-prompts. The owner prefers ten good focused revisions over one weak feature dump, but repeated revisions must fix *specific observed failures*; do not loop blindly.

### B00 — Initial project foundation: build a real runnable starting project

**This is the very first task after receiving this brief.** It MUST establish the new repository/project, not just a pretty vision document.

Required deliverables:
- Independent new source directory and Git repository name (`project-crownflare` until owner chooses a final title); **never** reuse Veyrshift.
- Vite + strict TypeScript + tested stable Phaser game loop; exact version pinned after verification.
- Correct responsive 16:9 canvas / camera, pixel rendering, clean boot/start/quit behavior.
- Beautiful **intentional initial title-shell concept** and one simple platforming test chamber (placeholder room art is allowed **only for B00 technical scaffold**, clearly labeled and not treated as finished game art).
- Player prototype with horizontal movement, jump, landing, dash, collision, camera, pause. Temporary programmer capsule allowed in B00 only, should be replaced promptly at B01 with genuine original pixel-art hero.
- Typed input actions for keyboard and gamepad mapping, basic focus safety.
- Typed deterministic combat state skeleton and save namespace/schema scaffold (do not ship huge untouched combat modules).
- Basic HUD prototype and developer debug toggle clearly separated from public menu.
- `npm ci`, `npm run dev`, `npm run build`, `npm run typecheck`, `npm test`, `npm run qa:chrome:local` or documented equivalent if host restrictions apply.
- Baseline unit tests and a real Vite Chrome smoke: title, start, movement, jump, dash, pause/resume, no exceptions.
- Full `docs/` foundation pack from Section 24, with actual decisions, not empty headings.
- Hero and forms creative brief; one visual-quality target board (owner signoff pending), no mass asset generation yet.
- Asset export/retention/provenance skeleton.
- One short captured real-game video if executable; label automated/owner review honestly.
- Commit + push only when authorized and remote exists; otherwise provide complete ZIP and exact Git setup instructions. No fictional URLs or commits.

**B00 Exit Gate:** Real app starts, player can move/jump/dash through a collision-tested side-view room, tests are green, docs/art-direction gates ready for B01. It is explicitly a **foundation**, not a shippable game or production-art pass.

**The new ChatGPT must create and deliver `b00-initialize-original-pixel-action-roguelite.md`** as a real downloadable implementation prompt so Codex can execute this immediately. If the new ChatGPT has direct coding/project tools, it may create the initial repository itself and still provide the matching implementation/verification brief.

### B01 — Lock original hero design + runtime art system

Create original Iona (or revised approved protagonist) canonical visual masters, true-scale silhouette, base palette, side-view front/left/right essentials, sprite export quality, HUD portraits/icons samples and one live idle animation. Only proceed after owner approves **actual in-game** appearance, not an enlarged portrait alone.

### B02 — Base movement animation gold standard

Original pixel animated idle/run start/loop/stop, jump rise/apex/fall/land, dodge, turn, hurt/KO. Smooth input-responsive transitions; parallax camera and base footstep/audio. Left/right corrections. Gate = live normal-speed gameplay feel accepted.

### B03 — Base martial combat gold standard

3-hit ground combo, heavy/launcher, aerial action, first special, event-timed hitboxes, satisfying VFX and sound, responsive cancels/buffers, one moving enemy test. No disconnected poses or multiple unverified frame variants. Gate = the base hero alone is fun and gorgeous.

### B04 — One beautiful playable combat vertical slice

One polished environment, 1–2 enemy types, authored combat encounter, beautiful background and animations, readable HUD, rewards beat, gameplay and audio evidence. Establish reusable art and content quality standard. Gate = owner says it looks/feels good in actual gameplay.

### B05 — Dawnrush Form I, COMPLETE

Art silhouette and original master, full needed side-view motion states, transformed combo/attack/dash/special/finisher, aura activation/reversion, HUD icons, SFX, mechanics, QA and owner art/feel signoff. Do not call partial effects a finished transformation.

### B06 — Stormhalo Form II, COMPLETE

New silhouette/aura/movement/combat language, non-recolored sprite set, counter mechanics, different audio/finisher, polish and full owner signoff.

### B07 — Eclipse Warden Ultimate Form, COMPLETE

Radical metamorphosis, wholly new animation/movement/attacks, living dual-layer aura, grand finisher, controlled camera/SFX, ordinary gameplay integration and owner signoff. Reserve considerable art direction effort here; it is the game's defining set piece.

### B08 — Enemy roster + elites, high quality

Build and polish core enemy archetypes, distinct AI patterns, tells, hurt/KO and VFX/audio; camera/room interaction; spawn and balance. Avoid clone AI with recolored enemies. Gate = mixed encounters are fun, readable with ultimate aura active.

### B09 — World, stage architecture and room procedural assembly

Two differentiated regions, authored room library, meaningful traversal and interactive objects, tile/parallax systems, encounter pacing and branching choice. Keep enemy silhouettes and platforms readable, constrain procedural randomness.

### B10 — Bosses and event encounters

Two major bosses + final boss target, patterns/phases, cinematics, battle music, readable arenas, fair hit timings and defeat/victory sequences. Release scope adjustable only by explicit quality-focused decision.

### B11 — Roguelite upgrades and build variety

Curated upgrades, reward screens, shop/event choices, clear stacking/compatibility, form-specific interactions, strategic routing, seed QA. Actual meaningful run-to-run variability.

### B12 — Hub, progression, story, menus, saves and presentation

Complete start-to-results run, polished hub, story arc, unlock paths, settings/accessibility, optional tutorials, original audio/music and UI/UX, robust save/resume/versioning.

### B13 — End-to-end polish, performance, QA and first-release signoff

Owner-visible complete-game walkthrough, keyboard/gamepad, all menus/controls, environments, every hero/form action/state, all enemies/bosses, upgrades, errors, save persistence, responsive rendering, audio, performance under maximum effects. Fix/retest all unacceptable art and gameplay. Release build and archive source/provenance cleanly. First-release roster remains ONE hero.

**Future, outside B00–B13:** Optional Hero 2, then Hero 3, optional Hero 4, each requiring its own approved original art/motion/combat/transformation standard. Never start during B00–B13 unless owner explicitly changes the roadmap after accepting Hero 1.

---

# PART X — OPERATING RULES FOR THE NEW CHATGPT AND CODEX

## 32. ChatGPT role and interaction contract

The new ChatGPT is a long-term creative director and independent reviewer, not an automatic cheerleader for Codex reports. Its job is to:
- convert each roadmap stage into a careful, executable Codex prompt in actual `.md` file
- inspect the **latest real ZIP/repo contents** before reviewing or giving change directions
- compare implementation to accepted art spec and owner feedback, not to earlier optimistic status reports
- keep detailed state coverage for every action, direction, transform, VFX, audio and UI
- run code/tests independently when possible; never silently count Codex self-reports as independently verified
- inspect playable normal-speed videos when available, not only still source sheets
- identify critical weak art and require precise correction BEFORE moving milestone
- avoid overengineering and avoid skipping ahead to content quantity
- preserve previous good art/code, don't destroy working assets in a huge speculative rewrite
- ensure user can run locally on Windows without a new proprietary app
- record transparent blockers and the smallest practical step to resolve them.

The new ChatGPT should not repeatedly send status questions or ask the owner to choose between dozens of variants. Pick the best candidate with clear reasoning, request approval at meaningful milestones, and accept owner judgment as final on aesthetics.

## 33. Every Codex prompt MUST contain

1. Exact source baseline/repo path assumption with instruction to inspect actual HEAD and changes first.
2. Clear user-facing gameplay outcome, not solely code/asset list.
3. In-scope and out-of-scope items.
4. Canonical references, palette/frame/anchor specs and art provenance.
5. Mandatory REAL generated/source assets where the phase calls for art (not “polish sprites” interpreted as tweaking timing only).
6. Animation event synchronization and sound/VFX requirements where actions are touched.
7. Real runtime integration paths; no preview-only implementation.
8. Mandatory verification with genuine test outputs, browser evidence, performance where relevant.
9. Explicit owner signoff gate and honest partial/not-run statuses.
10. Repo-size/retention rules and a bounded next-step plan.
11. Clear final report template: **WHAT PLAYER SEES AND FEELS**, actual files, actual tests, artistic findings, remaining gaps, direct playable proof, commit/ZIP status.

An agent cannot truthfully say “the animation looks amazing” without valid normal-speed gameplay visual review. Tool-produced PNG sheets and offline GIFs are supplementary evidence only.

## 34. Repo and evidence handoff contract

Per major batch, deliver:
- clean source Git state and verified commit ID if pushed
- one downloadable current source ZIP when requested
- small explicit review bundle containing representative normal-speed video with correct build hash (or a usable owner-local capture command), comparison images, animation manifest and QA report
- written status table: generated / integrated / tested / visual-accepted / audio-heard
- list of rejected art and why, but **no giant rejected art folders inside the source repo**
- all source masters required for future animation modifications and license/provenance data
- no fake performance numbers, frame rates, test results or environment claims.

## 35. Problem response and escape hatches

If an image-generation attempt cannot preserve the face/silhouette, **fix only the specific affected action and reference alignment**, not the entire hero each time. If the same issue fails twice with essentially the same technique, propose a measurable alternative (artist correction, simpler action silhouette, hybrid custom keyframes) with an explicit GO/NO-GO, rather than spiraling into new “infrastructure” milestones.

If local browser/recording is blocked by execution policy, provide owner-authorized Windows local QA instructions and produce agent-available supplementary evidence, clearly mark human approval pending. Never evade policy or claim unsupported headed/audio testing.

If a task expands too large, stop after a coherent high-quality playable slice and report precise uncompleted states; do not produce a weak half-finished version of every action merely to fill a checklist. **Quality first but no false completion.**

If scope trade-offs are needed, prioritize: **Base hero feel → transforming spectacle → one excellent encounter → complete first run**, before more systems, rooms, enemy quantity and additional heroes.

---

# PART XI — THE INITIAL PROJECT TASK: EXACT INSTRUCTIONS TO EXECUTE NOW

## 36. Your starting assignment (for the new ChatGPT)

You have now received all the creative and technical context necessary to initialize **Project Crownflare**. Do not claim to have built more than you actually have.

**Deliver immediately, using whatever project/files/code tools you actually have:**

**A. Initial project foundation documentation**
- `project-crownflare-project-charter.md` — locked goals, one hero, three transformations, expansion cap, original-IP policy, quality priorities.
- `project-crownflare-game-vision-and-creative-bible.md` — story/world/hero/form treatment, art and VFX identity, game fantasy, genre references vs originality boundaries.
- `project-crownflare-combat-and-controls.md` — responsiveness, exact input mapping, hero state/move set, transformation mechanics, hitbox/event rules.
- `project-crownflare-technical-art-and-qa.md` — engine, modular architecture, art asset pipeline and owner-visible acceptance requirements.
- `project-crownflare-roadmap.md` — B00–B13 with entry/exit gates, later 3–4 hero ceiling as expansion only.
- `b00-initialize-original-pixel-action-roguelite.md` — **ACTUAL DOWNLOADABLE FILE** for Codex to implement B00.

If this full master file can be placed intact in `docs/`, retain it as the source of truth; the shorter docs are operational sections, not conflicting alternate specs.

**B. Initial runnable project (where direct coding tools are enabled)**
- Create new standalone Vite + strict TS + Phaser project/repo.
- Build polished-enough working B00 shell (title → start → one test chamber with player travel/jump/dash, solid collision, pause/resume, gamepad input foundation and minimal HUD).
- Add deterministic tests, developer QA page if useful, local Chrome workflow and asset export scaffold.
- Include README with exact Windows PowerShell commands to install, run and test; no dependency on Blender, sprite editors, external cloud service or the Veyrshift source.
- All B00 art placeholders clearly labeled as temporary; **do not call technical placeholder sprites acceptable production art**.
- Verify with real commands; cite test results and code files; provide a working ZIP or verified remote repo when accessible.

**C. Owner-facing output**
- A one-page decision summary confirming the design direction (side-scroller, pixel art, Iona creative seed or clearly explained refined hero, Base + 3 forms, 1 first-release hero, 3–4 cap only later).
- Direct file download links for the above `.md` files, if created.
- Link to runnable project ZIP or verified repository IF created, else explicit statement that it awaits Codex's B00 run.
- Specific instruction to start Codex with the generated `b00-...md` file and bring back its report/source.
- No claiming progress on B01–B13 until B00 passes.

## 37. Final creative mandate

The owner wants to feel proud of the first character within the earliest playable slices, not wait through endless technical green reports while weak animations persist.

The finished game should have:
- **one unmistakable original hero**
- **base combat already exhilarating**
- **three increasingly spectacular original transformations**
- **a radically different ultimate body and moveset**
- **premium expressive pixel-art sprites and seamless motion**
- **intelligent readable cinematic VFX and rich audio**
- **excellent side-view action gameplay and replayable roguelite builds**
- **beautiful original rooms, enemies, bosses, menus and story**
- **a realistic reproducible production pipeline and ruthless visual quality gates**.

**Never use “Codex cannot create art” as a reason to settle for bland placeholders. It can generate original sprite and effect imagery where the capability exists. Equally, never use “AI can generate art” as a reason to accept inconsistent body proportions, choppy animations or unreviewed assets.**

**The contract is to make a smaller game spectacular — not to make a huge game mediocre.** Start with B00 and build toward one fully accepted hero.

---

## Appendix A — Minimal per-action animation acceptance record

```text
Hero / Form:                          e.g. Iona / Dawnrush
Action / facing:                     e.g. light combo / right
Canonical approved source ref:       path + hash
Generated source master(s):          path(s)
Runtime atlas and action IDs:        path + state IDs
Character identity match:           PASS / FAIL / PENDING
Body/pixel-grid coherence:          PASS / FAIL / PENDING
Feet/pivot/anchor consistency:       PASS / FAIL / PENDING
Normal-speed fluid motion:          PASS / FAIL / PENDING
Correct hit/event timing:            PASS / FAIL / PENDING
VFX/audio coherence:                PASS / FAIL / PENDING
Ordinary game integration:          PASS / FAIL / PENDING
Real Chrome clip:                    path or URL actually verified
Technical QA:                        commands + results
Human visual/game-feel approval:     APPROVED / REVISE / PENDING
Remaining issue/next correction:     exact smallest fix
```

## Appendix B — Initial first-play prototype acceptance checklist

```text
[ ] NEW repository (never touches Veyrshift)
[ ] node/npm install reproducible from package-lock
[ ] npm run dev launches Vite + Phaser game
[ ] app loads title and starts one playable side-view room
[ ] player moves left/right and jumps with reliable platform collisions
[ ] dash is responsive and does not clip through solid geometry
[ ] pause/resume and focus loss behave correctly
[ ] basic camera / world scale correct at 16:9; no pixel blur
[ ] keyboard and preliminary controller input mapping established
[ ] tests/typecheck/build pass; actual outputs logged
[ ] Chrome local workflow documented and at least a smoke executed where allowed
[ ] no fake art signoff; all placeholders clearly labeled
[ ] hero visual concept and three transformation silhouettes prepared for owner review
[ ] asset-generation workflow and retention policy established
[ ] downloadable first Codex B00 prompt delivered
[ ] source ZIP or verified remote commit provided only if actually created
```

## Appendix C — How to make high-energy aura spectacular without copying an existing franchise

**Positive design brief:** build escalating layers of electromagnetic/plasma-like pressure around a newly designed character; each stage alters hair/cloth motion, ambient light, nearby particles, shockwave rings, audio and energy topology. Show the environment reacting through dust lift, platform glyphs, nearby debris and localized air refraction. The player feels enormous momentum and release.

**Originality boundaries:** no recognizable copyrighted hero silhouettes or outfits; no specific iconic transformation hair shapes; no copied energy blast, color-and-hair transformation formula, named attack, choreography or voice/sample; no story parallels or trademarked terms. Use fresh world lore and a distinctive final metamorphosis rather than a copied super-powered humanoid recolor.

**Readability rule:** auras can be spectacular while still respecting combat. Enemy telegraphs, platform edges, character hands/hitboxes and HUD must remain legible; include reduced-flash/particles settings and non-VFX readability tests.

**Production order:** canonical form silhouette without VFX → movement/attack identity → aura layers synchronized with action → bespoke audio → real gameplay review → owner signoff. Never reverse this by making dazzling backgrounds to distract from a stiff character.

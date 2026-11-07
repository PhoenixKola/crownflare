# B01D baseline audit ? before candidate export

## Checkout and authority

- Inspected baseline commit: `6670b584556c61858b4ae1fa2d9ce16887276dc2` (B01C), clean at pre-flight; `origin/main` matched. Node `v22.22.0`, npm `11.11.0`.
- Preserved the B00 prompt deletion. B01A, B01 Recovery, B01C masters, manifests, runtime files and committed evidence remain historical read-only baselines. No Veyrshift content was used.
- Read the master handoff B01/B02 milestones and the hero, art pipeline, QA and provenance specifications. TECH, ART-MOTION and owner approval remain separate gates.
- B00 physics body remains `15?30`. B01C combo timing is 90/80/170ms (contact 112), 110/90/170ms (138), and 140/100/220ms (165).

## Existing B01C source ? runtime map

The manifest contains 72 runtime PNGs (36 frame IDs ? two independently authored facings), all `128?80` transparent canvases, shared scale `0.146878825`, shared 32-color palette, nearest-neighbor resize, no dithering, alpha threshold 192, pivot `(x=64, feetY=80)`. ?Distinct? counts unique trimmed-crop SHA-256 values, rather than counting source-sheet cells by assumption. Bounds below are actual runtime alpha bounds.

| Action | Facing | Source image ID(s) | Source SHA-256 | Distinct / exported frames | Runtime canvas; visible H?W px | Anchor | Source-level review note |
|---|---|---|---|---:|---|---|---|
| `combo-1` | left | `iona-combo-left-9pose-imagegen-01.png` | `81740be5ef7b0d1194818ee8e71e7738c9268598d5d7cbd4b717ad2bb72d6814` | 3/3 | `128?80`; H 45?45, W 34?43 | `(64,80)` | Three distinct palm phases; contact remains compact at about 45?46px high. |
| `combo-1` | right | `iona-combo-right-9pose-imagegen-01.png` | `040c5a8c5b406c81d09199a91284c20471e8babbed56f121c39ca4427b859abc` | 3/3 | `128?80`; H 46?46, W 37?45 | `(64,80)` | Three distinct palm phases; contact remains compact at about 45?46px high. |
| `combo-2` | left | `iona-combo-2-left-sidekick-6pose-imagegen-01.png` | `09366c6af9f0a7749ae79450123fd6696aa2e9b372f9a8924bdf491c4bfb818e` | 3/3 | `128?80`; H 68?68, W 36?58 | `(64,80)` | Three distinct side-kick phases; contact reaches 68?69px vs compact palm/forearm frames. Highest attack scale-jitter priority. |
| `combo-2` | right | `iona-combo-2-right-sidekick-6pose-imagegen-01.png` | `91659187dc6de44a06bed4bc1cdd5203da92f617f439064bf88bc49f831812bb` | 3/3 | `128?80`; H 68?69, W 39?58 | `(64,80)` | Three distinct side-kick phases; contact reaches 68?69px vs compact palm/forearm frames. Highest attack scale-jitter priority. |
| `combo-3` | left | `iona-combo-left-9pose-imagegen-01.png` | `81740be5ef7b0d1194818ee8e71e7738c9268598d5d7cbd4b717ad2bb72d6814` | 3/3 | `128?80`; H 42?46, W 34?39 | `(64,80)` | Three distinct rising-forearm phases, about 42?47px high; contact silhouette is differentiated in the existing sheet. |
| `combo-3` | right | `iona-combo-right-9pose-imagegen-01.png` | `040c5a8c5b406c81d09199a91284c20471e8babbed56f121c39ca4427b859abc` | 3/3 | `128?80`; H 46?47, W 36?39 | `(64,80)` | Three distinct rising-forearm phases, about 42?47px high; contact silhouette is differentiated in the existing sheet. |
| `dash` | left | `iona-dash-left-6pose-imagegen-01.png` | `9a276836813481c0d7c1caebe1ff384a9b7b3b37b6bf0426fc6d7decc3c3fdba` | 6/6 | `128?80`; H 46?61, W 45?61 | `(64,80)` | Six distinct poses; visible height 39?61px and width 41?62px. Verify active travel and anchor against world movement. |
| `dash` | right | `iona-dash-right-6pose-imagegen-01.png` | `11e1a6e142a6c3352736457aa13545f9742f2e1038da4ad73fbf5889d896e548` | 6/6 | `128?80`; H 39?60, W 41?62 | `(64,80)` | Six distinct poses; visible height 39?61px and width 41?62px. Verify active travel and anchor against world movement. |
| `idle` | left | `idle-0-left-source-crop.png`<br>`idle-1-left-source-crop.png`<br>`idle-2-left-source-crop.png`<br>`idle-3-left-source-crop.png` | `b16df4ac2a4480f7adcacfdcdc6cf2a90dd80d1405b91fed6b696963894e14d4`<br>`e7862615eb20733e5fa0f08ddcc99b90d3e16f3d1f077d73af02416f440e15f5`<br>`c230985f16f98c3f85ed8e36beae85d68114613d9a391d904530b8d29c9ba4bf`<br>`d1161c979903005b220acaf156f2c6dddda24d9cb6e3a7a8b178e36ca41ef442` | 4/4 | `128?80`; H 60?60, W 32?35 | `(64,80)` | Four unique quiet poses and 60px height; facial detail and breathing change are subtle at 48px. Retained pending normal-speed review. |
| `idle` | right | `idle-0-right-source-crop.png`<br>`idle-1-right-source-crop.png`<br>`idle-2-right-source-crop.png`<br>`idle-3-right-source-crop.png` | `aacecc1137a63ee30f43f2accf6e3651e20f730adbf2169ab1fe513f1cf44376`<br>`e0fa4943e5a8de69d4436826fb2998cbc73a161a1deb00dfcf0fd07e054684b6`<br>`70bf699dcd1982c4b84d05daa556680265d69de2fbf585c1c8277748d8c5c164`<br>`8643c3a7afab39225fc41d31a0f447c4517acc2cde17b76222e72108a210d631` | 4/4 | `128?80`; H 60?60, W 31?33 | `(64,80)` | Four unique quiet poses and 60px height; facial detail and breathing change are subtle at 48px. Retained pending normal-speed review. |
| `jump` | left | `iona-jump-left-6pose-imagegen-01.png` | `6bf577dd9870a5dd99fb4b62401b61729a6f1147b86c6f4ba094481b968042cf` | 6/6 | `128?80`; H 52?64, W 42?45 | `(64,80)` | Six distinct poses; visible height 52?64px. Verify mapped rise/fall/landing cues and scale at speed. |
| `jump` | right | `iona-jump-right-6pose-imagegen-01.png` | `0f229b60ce9a9318ed53f1ea5ac6638e899844e874ec504e22361d0293dea4e5` | 6/6 | `128?80`; H 53?62, W 39?43 | `(64,80)` | Six distinct poses; visible height 52?64px. Verify mapped rise/fall/landing cues and scale at speed. |
| `run` | left | `iona-run-left-6pose-imagegen-01.png` | `42b3ea920528c1438f5fb768d215265a1dbb885f0a7a9e05e7ccba2e128fc41a` | 6/6 | `128?80`; H 64?69, W 43?53 | `(64,80)` | Six distinct poses, but visible height is 62?69px and width 43?61px; stride, torso lean and sash spread vary. Candidate target for a shared articulated cycle. |
| `run` | right | `iona-run-right-6pose-imagegen-02.png` | `6f19bcc4c95dbe2bbefaad1dc82dd53ef3df1bdbdb23cf548c5b835a3ae56c9c` | 6/6 | `128?80`; H 62?69, W 44?61 | `(64,80)` | Six distinct poses, but visible height is 62?69px and width 43?61px; stride, torso lean and sash spread vary. Candidate target for a shared articulated cycle. |
| `start` | left | `iona-transition-left-to-right-6pose-imagegen-01.png` | `bc99e8bc77ac5e89551dd33e7296e91e4fe2dd4a8df96f22478dfa63c331f92e` | 2/2 | `128?80`; H 64?65, W 40?52 | `(64,80)` | Two unique transition frames from separate direction sheets; only two frames support acceleration. |
| `start` | right | `iona-transition-right-to-left-6pose-imagegen-01.png` | `b1e6a05e2f5a12100c6a110b3e863be2a07d9d198c3486c3254883d7a2767494` | 2/2 | `128?80`; H 64?66, W 39?44 | `(64,80)` | Two unique transition frames from separate direction sheets; only two frames support acceleration. |
| `stop` | left | `iona-transition-left-to-right-6pose-imagegen-01.png` | `bc99e8bc77ac5e89551dd33e7296e91e4fe2dd4a8df96f22478dfa63c331f92e` | 2/2 | `128?80`; H 64?64, W 50?51 | `(64,80)` | Two unique transition frames; no additional post-stop settle. |
| `stop` | right | `iona-transition-right-to-left-6pose-imagegen-01.png` | `b1e6a05e2f5a12100c6a110b3e863be2a07d9d198c3486c3254883d7a2767494` | 2/2 | `128?80`; H 65?65, W 41?47 | `(64,80)` | Two unique transition frames; no additional post-stop settle. |
| `turn` | left | `iona-transition-right-to-left-6pose-imagegen-01.png` | `b1e6a05e2f5a12100c6a110b3e863be2a07d9d198c3486c3254883d7a2767494` | 1/1 | `128?80`; H 68?68, W 40?40 | `(64,80)` | One unique pose per facing; directional reversal uses a single authored target-facing image. |
| `turn` | right | `iona-transition-left-to-right-6pose-imagegen-01.png` | `bc99e8bc77ac5e89551dd33e7296e91e4fe2dd4a8df96f22478dfa63c331f92e` | 1/1 | `128?80`; H 69?69, W 40?40 | `(64,80)` | One unique pose per facing; directional reversal uses a single authored target-facing image. |

### Ranked correction plan

1. **Run continuity and scale:** candidate contact ? compression ? passing ? opposite-contact loop in both separately authored directions, with shared B01C scale, palette and feet anchor; verify reversals in engine.
2. **Kick contact and recovery:** keep palm, side kick and rising forearm anatomically distinct, preserve the authoritative combat clock, and review the kick at all requested scales before changing it.
3. **Jump/dash mapping:** verify rise/fall/landing and dash-active/recovery imagery follows `motion.ts`; do not add physics.
4. **Idle/transitions:** retain existing frames unless live motion review finds a specific defect; do not increase frame count without evidence.

## B01C capture inspection

The indexed Chrome video is `review-evidence/b01c/iona-b01c-60s.webm` (67.44s; 4092880 bytes; SHA-256 `f52b119422e39c541e27d7bedbd9a144d8551d7c28604440ef9a386fc86631bf`). The computer-use bridge returned `Native apps: unavailable` and `browser access host unavailable`, so I could not view it at normal speed in this session. I did not treat its contact sheet or metadata as motion evidence. The prior B01C report says no audio track was captured (`NOT_CONFIRMED_NO_AUDIO_TRACK_CAPTURED_BY_PLAYWRIGHT`); audio was not heard or evaluated. This inspection gate remains pending.

## Pre-edit status

- TECH baseline references: B01C production manifest and its existing QA report; B01D verification will be reported separately.
- ART-MOTION: PENDING normal-speed video playback. The source audit is not a motion pass.
- OWNER APPROVAL: PENDING. B01C is provisional; no canonical art or scale lock is inferred.

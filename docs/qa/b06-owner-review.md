# B06 Enemy Roster and Combat Gauntlet — Owner Review

> Historical B06 snapshot: its original pass predates the B09 driver regression. The B10 re-diagnosis and latest three-run result below supersede that older one-run summary; evidence remains in the external local QA archive.

**Review date:** 2026-11-08; **Technical status:** PASS; **Owner art-motion approval:** PENDING; **Human audio listening:** PENDING (`HEARD: NO`); **Physical controller review:** PENDING.

B06 adds an opt-in Sunderglass enemy gauntlet for Iona Base and Dawnrush. It is a technical candidate for owner review, not an approval of B05 or B06 art, animation, audio, or controller feel. The first release remains Base + Dawnrush; Stormhalo and Eclipse Warden are post-release only.

## Player-facing result

The development-only route `/?b06=1` presents four authored encounters: Shardrunner familiarization; Shardrunner with Orbit Wisp; Fractured Spindle Sentry with Pressure Bastion; and the Cantor of the Split Ring elite. Waves lead through repair/reward and Resonance collection to the exit and results. Defeat is terminal until retry. The roster review route `/?b06=1&roster=1` shows Iona and all five archetypes together in the native 480×270 game viewport.

The playable routes use the existing keyboard/controller mappings. The production build ignores the B06 query parameter and exposes no B06 QA hook. A production-route smoke check passed.

## Art and runtime trace

Five selected native `image_gen` PNG masters are retained in `art-source/enemies/b06/generated-master/`: Shardrunner (`exec-96416862-73a6-491a-87b3-71c3999d4305`), Orbit Wisp (`exec-51e55c96-76ac-4e3e-aceb-5241e62c5e62`), Pressure Bastion (`exec-ba8cca61-9d54-4ed6-9aab-7171902e41fd`), Cantor (`exec-425b9b47-41d5-44bf-ad57-99122dad0493`), and the signature-effect atlas (`exec-1d39ba8f-4951-4d57-8e97-c43c0e8f0c19`). The image tool did not expose a model/version string. Exact prompts, source hashes, crop mapping, pivots, timing, and approval limits are in [B06 art provenance](../../art-source/enemies/b06/provenance.md).

The audited exporter produces 36 transparent 80×80 runtime enemy poses and 8 transparent 96×72 effects. The five archetypes load together with Iona; the review observed 65 loaded textures and no missing textures. The [archived locally: source/runtime contact sheet](review-evidence-archive.md#b06) includes the true-scale runtime roster and links the retained source masters. Generated atlases are candidates for owner review; they are not represented as hand-pixel-cleaned or approved.

## Combat model and fairness checks

The B06 director uses fixed 60 Hz simulation steps, stable enemy IDs, a locked attack direction through tell/commit, authored recovery windows, one active high-threat schedule, and per-move target-hit sets. The shared Iona body remains 15×30. Shardrunner commits to a dash; Orbit Wisp owns one bounded projectile that is removed on block, hit, obstruction, or expiry; Bastion's front guard blocks light attacks and has explicit break/bypass cases; Cantor uses separate sweep and pulse tells with recovery. The Wisp uses a bounded home leash so it remains reachable in the arena.

Unit coverage includes 30/60/120 Hz parity, multi-target one-hit behavior, rear/elevation misses, guard and guard break, locked direction, projectile ownership/obstruction/expiry, deterministic spawn IDs, and reward/retry flow. The complete unit suite passed **78/78**.

## Headed Chrome evidence

The final B06 QA run completed both full four-wave routes at normal game speed in installed Chrome 156, 1280×720. The machine-generated captures have no system-audio track.

| Form | Result | Damage | Live recording | SHA-256 |
|---|---|---:|---:|---|
| Dawnrush | 4 waves cleared, reward claimed, victory, 5 HP | 1 | [archived locally: Dawnrush playthrough](review-evidence-archive.md#b06) — 69.36 s | `fa3fedfdfd1685ed8cd76d9c50464f6d15a5647e7e17f8f410f700cbfa997c68` |
| Base | 4 waves cleared, reward claimed, victory, 5 HP | 2 | [archived locally: Base playthrough](review-evidence-archive.md#b06) — 62.88 s | `a82f8299c6610c4d81e9a45927e4faf39188735145fc3936c1308ffd5709f6b3` |

Combined live play was 132.24 seconds. The trace contains 104 Dawnrush and 85 Base scene events, with no QA browser errors. The [archived locally: machine-readable report](review-evidence-archive.md#b06) records 15 passing assertions, the 86-file B06 source-tree digest `069ef80067fb0e4b74cd83ac8ba7fa779e42def0da5b7f2c4ef61322e32137c8`, and video metadata/hashes.

Reduced-motion Chrome review passed: supplemental VFX and shake were suppressed while the Shardrunner tell, 15×30 Iona body, and zero-missing-texture state remained intact. Synthetic Gamepad API review passed the Start-button edge, pause boundary, fresh Start resume, and keyboard/UI resume behavior. This is not a physical-controller review.

## Audio handoff

The B06 audio builder creates 18 deterministic original mono 44.1 kHz PCM16 WAV cues and verifies manifest hashes. **AUDIO HEARD: NO.** Neither the automated browser recording nor the waveform audit is listening approval. Use [the audio review handoff](b06-audio-review.md), listen through the listed tell/contact/recovery cues with system loopback capture, and record the human reviewer and notes before changing this gate.

## Reproduction and general audits

Passed on the final source revision:

- `npm ci` — clean install; zero reported vulnerabilities.
- `npm test` — 78 passed, 0 failed.
- `npm run typecheck` — passed.
- `npm run audit:assets` — 749 files, 90,164,625 bytes, zero individual budget violations.
- `npm audit --audit-level=low` — zero vulnerabilities.
- `npm run qa:b06` — production build, B06 art/audio manifests, headed Base and Dawnrush routes, reduced-motion review, and production-route gate all passed.
- `npm run qa:controller:local` — synthetic Gamepad API Start/resume check passed; no physical controller claim.

The production build reports a non-fatal large-chunk notice: the Phaser bundle is 1,578.87 kB minified and 422.35 kB gzip. This is recorded for later bundle optimization; the build itself passes.

## Owner gates

| Gate | State | Owner action |
|---|---|---|
| B06 technical implementation, determinism, asset provenance, manifests, Base/Dawnrush Chrome route, reduced motion, production exclusion | PASS | None for the technical pilot |
| B06 art-motion quality at true scale and through combat | PENDING | Review the contact sheet and live playthroughs; record approval or concrete revisions |
| B06 human audio listening | PENDING — `HEARD: NO` | Follow `b06-audio-review.md` and record actual listening notes |
| B06 physical controller feel | PENDING | Play the route on a physical controller and record device, layout, and feel |
| B05 owner art-motion, audio listening, and physical-controller gates | PENDING | Remain separate from B06 technical completion |

No technical or automated result above substitutes for owner review or initial-release approval.

## B10 regression re-diagnosis

The later B09 failure was in the deterministic Chrome driver rather than production enemy damage: it issued grounded light attacks against airborne Orbit Wisp/Cantor, attacked outside actual reach, retreated past close enemies, and approached the Cantor through its live sweep/pulse danger. Those choices explain the large miss count and repeatable Shardrunner defeat; the production attack ranges, enemy damage, and collision rules were preserved.

The driver now uses jump/light against airborne targets, skips grounded light on Wisp/Cantor, gates attacks by archetype reach, passes through close melee threats, and handles the Cantor's actual tell/commit/recovery rectangles. It continues to log damage and does not grant immunity or teleport past waves. The B10 gate passed three consecutive four-wave Dawnrush runs, each claiming the reward and reaching victory, plus a Base four-wave victory and a separate idle-player intentional defeat/retry check. The headed report has 28 passing checks and no errors; it is retained in the external B10 owner-review package. Current run results supersede the older “B06 regression unresolved” note in the B09-era changelog.

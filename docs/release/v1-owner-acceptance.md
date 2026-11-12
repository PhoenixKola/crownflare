# Crownflare v1 owner review

**Candidate status: private Windows v1.0.0 technical candidate. Public release is not approved.** The owner has accepted the compact game scope; the earlier 30–45 minute run and multi-hour replay targets are not v1.0 blockers. That scope decision does not approve the art, audio, physical gamepad behavior, executable, or project name. Automated screenshots and silent video do not count as owner approval or audio listening.

## Review the Windows candidate

1. Extract `Crownflare-v1.0.0-windows-x64.zip` and double-click `Crownflare.exe`. No Node.js install or network connection is required.
2. Review the fullscreen title, animated Iona, Crownflare icon, and Refuge presentation. Press F11 to check the windowed/fullscreen toggle.
3. Enter the Refuge, inspect the illustrated departure story, and open **Controls / Accessibility**. Review remaps, display scaling, reduced motion, sound, and the generated controller art.
4. Start a run and review movement, attacks, Base/Dawnrush, discoveries, upgrades, route choices, the region transition, bosses, results, and return to Refuge.
5. Close and relaunch the app, then verify **Continue** restores the same run. Review defeat/retry separately if desired.

See the [Windows v1.0 candidate report](windows-v1-candidate.md) for the built ZIP, checksum, and packaging test matrix. The generated title/victory originals, prompts, and source hashes are in `art-source/ui/b14/`. Earlier browser route evidence is in the separate owner packet described by [B14 acceptance](../qa/b14-final-acceptance.md); its WebM has no audio track.

## Decisions

- [ ] Approve the title background, typographic layout and animated Iona overlay.
- [ ] Approve the departure story illustration and dialog readability.
- [ ] Approve the controller settings art and compact row/scrollbar layout.
- [ ] Approve the generated Crownflare icon at favicon sizes and the browser metadata.
- [ ] Approve the victory art and results-panel readability.
- [ ] Confirm the Dawnrush bar pulse is noticeable but not distracting; test reduced motion.
- [ ] Review Base and Dawnrush animation, both facings, hit states, VFX, reduced motion and combat at normal speed.
- [ ] Review collision/game feel around platforms, gaps, lifts, hazards, knockback and boss arenas.
- [ ] Test a physical gamepad, including remapping and disconnect/reconnect.
- [ ] Listen to gameplay audio and Refuge ambience on the intended output device; note mix/repetition issues: ____________________
- [ ] Play a complete run and record duration: __________. The compact v1.0 scope is accepted; record pacing feedback without treating the superseded 30–45 minute target as a release blocker.
- [ ] Play repeated runs and assess route/build variety: ____________________
- [ ] Confirm public project name has been cleared: ____________________
- [ ] Release decision: [ ] approve candidate  [ ] request changes: ____________________

The Windows candidate is unsigned and may show the standard SmartScreen warning. Public name clearance, code signing, physical-controller review, human audio listening, and the owner's final executable review remain open decisions. The packaged app uses `build-resources/crownflare.ico`; see the linked report for the exact Electron version and what was exercised on the extracted executable.

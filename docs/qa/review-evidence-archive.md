# Local QA evidence archive index

Review recordings, screenshots, reports and raw traces are intentionally excluded from the GitHub source tree. Before untracking, all pre-B10 `review-evidence/` files were archived outside this checkout and verified against the source SHA-256 inventory and ZIP CRCs.

## Archive record

- Archive date: 2026-11-08
- Baseline commit: `12d9c6f4e7d13096f4fee60506ecff7465ff2800`
- External directory: `E:\Programming\Projects\0. Extra\crownflare-qa-archive\B09-before-B10-20261108\`
- Evidence archive: `review-evidence-B09-20261108.zip`
- Sidecar SHA-256 manifest: `review-evidence-manifest.json`
- Contents: 406 files, 287,877,008 source bytes
- ZIP: 273,628,277 bytes; SHA-256 `256c05d4d2656b007b55a117cbfc195fecaf2c00139b3a74dd1069dc0af77795`
- Original B09 GitHub source ZIP snapshot: 349,932,239 bytes; SHA-256 `ba62df0ec9d71def8f71127a22df73023fd2dd7a37a23f0c2be4e4429d2d9660`

The local archive contains the originals; the sidecar manifest stores the per-file hashes. The Git source intentionally keeps no evidence ZIP or replacement copy. To create new ignored local evidence, run the appropriate `npm run qa:*` command. To prepare a requested owner review, use the compact external package instructions in [B10 owner review](b10-owner-review.md).

## Historical evidence groups

Older handoff links now lead here because those files no longer ship in Git. The paths below are the folder names inside the external B09 evidence ZIP.

- <a id="root-files"></a>Root-level B00 evidence
- <a id="b00"></a>B00
- <a id="b01a"></a>B01A visual review
- <a id="b01c"></a>B01C animation production
- <a id="b01d"></a>B01D refinement
- <a id="b01e"></a>B01E quality gate
- <a id="b01f"></a>B01F playable preview
- <a id="b02"></a>B02 movement
- <a id="b03"></a>B03 combat
- <a id="b04"></a>B04 environment/combat
- <a id="b05"></a>B05 Dawnrush
- <a id="b05-completion"></a>B05 completion
- <a id="b06"></a>B06 enemy gauntlet
- <a id="b07"></a>B07 expedition
- <a id="b08"></a>B08 bosses
- <a id="b09"></a>B09 run build
- <a id="b10"></a>B10 hub/run
- <a id="overnight"></a>Overnight animation work
- <a id="raw"></a>Raw selected-play recordings
- <a id="recovery"></a>Recovery work

# Asset provenance, repository size and QA retention

## What belongs in the source repository

Track game code, tests, docs, build tools, active optimized runtime art/audio, and canonical masters with provenance where the source is needed to reproduce runtime assets. Keep one copy of each runtime asset under `public/assets/`. `art-source/` is not subject to the general runtime file cap: preserve canonical, hard-to-recreate source artwork and document its generation/editing history and immutable source hash. Do not delete accepted masters to reach an arbitrary ZIP target.

The B10 Spindle Refuge has three native ImageGen source masters under `art-source/environments/b10/spindle-refuge/source/`, with prompts/tool provenance and hashes in `provenance.md`. Its compact runtime exports are built with `python tools/art-export/build-b10-spindle-refuge.py`. The ambient bed is synthesized from original code by `python tools/audio/generate-b10-refuge-ambience.py`; no third-party or sampled audio is used.

## What stays outside Git

The rooted `/review-evidence/` folder contains local QA reports, screenshots, WebM captures and raw traces. It is preserved on the developer machine and is excluded from the current main tree. The complete pre-B10 evidence inventory was archived and SHA-256/CRC verified outside the checkout before untracking:

- `E:\Programming\Projects\0. Extra\crownflare-qa-archive\B09-before-B10-20261108\review-evidence-B09-20261108.zip`
- Sidecar: `review-evidence-manifest.json` in the same external archive directory.
- SHA-256: `256c05d4d2656b007b55a117cbfc195fecaf2c00139b3a74dd1069dc0af77795` (406 archived files, 287,877,008 source bytes).

See the [local evidence archive index](qa/review-evidence-archive.md) for ZIP size, baseline source snapshot, archived folder names and the external review-package location. Historical QA documents link to that index instead of broken in-repository evidence paths.

Do not stage or commit that ZIP or new QA output. Local QA scripts create their report folder when needed. A requested owner review should be a separate compact curated bundle outside the repository; retain only the scenes needed to review motion/audio and include the source/build hash.

## Repeatable audits and packaging

Run:

```powershell
npm run audit:assets
npm run audit:repo
```

`audit:repo` measures the tracked working-tree files by category and rejects `review-evidence/`, video/capture/ZIP artifacts, browser profiles, JSON traces over 8 MiB, and accidental files over 25 MiB. Canonical source art has a 64 MiB per-file ceiling and files over 25 MiB need an explicit provenance reference. This is a source-tree hygiene check; it does not claim that old blobs have been removed from Git object history.

For a current-main download-size snapshot, create a ZIP from the committed tree with `git archive --format=zip HEAD`. This excludes `.git`, `node_modules`, `dist`, Vite cache and local QA. Measure source ZIP bytes separately from checkout bytes, runtime bytes and `git count-objects -vH`. B10 uses a normal commit and push only: there is no `filter-repo`, BFG, prune, force-push, orphan replacement, or Git LFS migration.

## Retention decisions

Preserve accepted canonical artwork and current source sheets. Before proposing to move any rejected or historical art out of Git, prove references, regenerate required runtime exports from another copy and provide a separate measured restoration plan. Never bulk-delete asset sources based only on size. Existing `docs/10-decisions-and-change-log.md` records art/scale and acceptance changes.

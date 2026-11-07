# B01A Real Phaser visual-review evidence

- Run: 2026-11-07T09:36:34.652Z
- Browser: Installed Chrome 156.0.8078.80 (headed local run)
- Render path: existing Phaser 4 game and 480x270 logical B00 chamber; candidate PNGs are loaded from `public/assets/characters/iona/b01a/`.
- Every view reports 26/26 preview assets loaded; no missing textures, request failures, console errors or page exceptions.
- Preview is static in-engine artwork. No idle animation or motion signoff is claimed.
- Display: 480x270 is 100%; 360x203 is approximately 75% (0.752x height, nearest-neighbor CSS scale).
- Responsive aspect check: the 1024x768 (4:3) browser viewport retains the 16:9 game canvas without clipping.
- Aggregate review source/evidence SHA-256: 9574b1aace21ce110eb36237a2f7954813a896f09ad27076b8504efc162b5c3e

## Captures

- [base-scales-dark-100.png](review-evidence/b01a/base-scales-dark-100.png) — 480x270 CSS display; 38310 bytes; SHA-256 `49af684c4ccf30e921abe2f37eaaa5760f53ad9774389b33f5423bc03f9fadfe`.
- [forms-color-dark-100.png](review-evidence/b01a/forms-color-dark-100.png) — 480x270 CSS display; 42758 bytes; SHA-256 `6ea8674e2a6892c94ba528b1f231e195c3a567a609b125967cb3ae9f9b27afd2`.
- [silhouettes-48-dark-100.png](review-evidence/b01a/silhouettes-48-dark-100.png) — 480x270 CSS display; 31079 bytes; SHA-256 `e6b36f9071d535c5e6fd15f43a68df76e2be2306b7417c36c4254352eca3789f`.
- [silhouettes-60-dark-100.png](review-evidence/b01a/silhouettes-60-dark-100.png) — 480x270 CSS display; 31687 bytes; SHA-256 `4c701415f3addcf20324eef979aa23e0030e4240b0c56c45426d8a9e9a51ef7d`.
- [silhouettes-72-dark-100.png](review-evidence/b01a/silhouettes-72-dark-100.png) — 480x270 CSS display; 31809 bytes; SHA-256 `d7e6853a5fdb510585ac81b764d8b96b7743727bc240129a8dc7bfd7ac772fb6`.
- [silhouettes-60-light-100.png](review-evidence/b01a/silhouettes-60-light-100.png) — 480x270 CSS display; 38880 bytes; SHA-256 `c0767963ddaa550f1cfb4789619f87cadca3fa795f2c246e996d0dfcaf09669f`.
- [silhouettes-60-busy-100.png](review-evidence/b01a/silhouettes-60-busy-100.png) — 480x270 CSS display; 41587 bytes; SHA-256 `c050853dc86cedf01fca8a26d6ae44837e63e51ae60ba5f122bb2093e68acd7d`.
- [directions-dark-100.png](review-evidence/b01a/directions-dark-100.png) — 480x270 CSS display; 33464 bytes; SHA-256 `382ae28ce98aefea01b8849ba55c9cfd889479f15ac13a12658bcc03a27931e8`.
- [materials-dark-100.png](review-evidence/b01a/materials-dark-100.png) — 480x270 CSS display; 39086 bytes; SHA-256 `41ee31188f4efc89b03a68bc79265e883602a3c1c678a9334e0d16ffd1f3f203`.
- [base-scales-dark-75.png](review-evidence/b01a/base-scales-dark-75.png) — 360x202.5 CSS display; 24354 bytes; SHA-256 `3254018339750135cded2a95e3695661422e415e73526ab62bfd98deb5d6bd36`.
- [silhouettes-60-dark-4-3.png](review-evidence/b01a/silhouettes-60-dark-4-3.png) — 1024x576 CSS display; 92288 bytes; SHA-256 `c270de8b27baa777ae760c27dd1a06ed70add31e6b607dec5f1b9a58f0133b41`.

Separate `npm run qa:controller:local` and unit-test runs passed with the synthetic Gamepad API. Physical gamepad behavior was not exercised.

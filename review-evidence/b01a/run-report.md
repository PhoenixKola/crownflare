# B01A Real Phaser visual-review evidence

- Run: 2026-11-07T01:53:50.511Z
- Browser: Installed Chrome 156.0.8078.80 (headed local run)
- Render path: existing Phaser 4 game and 480x270 logical B00 chamber; candidate PNGs are loaded from `public/assets/characters/iona/b01a/`.
- Every view reports 26/26 preview assets loaded; no missing textures, request failures, console errors or page exceptions.
- Preview is static in-engine artwork. No idle animation or motion signoff is claimed.
- Display: 480x270 is 100%; 360x203 is approximately 75% (0.752x height, nearest-neighbor CSS scale).
- Responsive aspect check: the 1024x768 (4:3) browser viewport retains the 16:9 game canvas without clipping.
- Aggregate review source/evidence SHA-256: afc2ac2e46a2b8bbff00c0689c39d184892c1e3b9f560bc2f71c23d840e7058c

## Captures

- [base-scales-dark-100.png](review-evidence/b01a/base-scales-dark-100.png) — 480x270 CSS display; 38239 bytes; SHA-256 `01b7036cd94ceddff4c8f65aa99f226d9acd98e293dcc8374e19c817ba79894a`.
- [forms-color-dark-100.png](review-evidence/b01a/forms-color-dark-100.png) — 480x270 CSS display; 42690 bytes; SHA-256 `95ea630c2efc7fcc8a434378ad096178b9c95fc110947d9aca0d5ddf2e22b73a`.
- [silhouettes-48-dark-100.png](review-evidence/b01a/silhouettes-48-dark-100.png) — 480x270 CSS display; 31011 bytes; SHA-256 `d82516d574a30724330974f5cdf35cfbc3c55119d2310ce58af46093e25e77a1`.
- [silhouettes-60-dark-100.png](review-evidence/b01a/silhouettes-60-dark-100.png) — 480x270 CSS display; 31618 bytes; SHA-256 `4118b329fd0f3840831ea97f0795af929361dc099884c91618ed7ff68bc9a3d6`.
- [silhouettes-72-dark-100.png](review-evidence/b01a/silhouettes-72-dark-100.png) — 480x270 CSS display; 31736 bytes; SHA-256 `df28ec09cac7099ece033006104b3b48e46e22ee8a3ba3671e42ebdef1d70ea0`.
- [silhouettes-60-light-100.png](review-evidence/b01a/silhouettes-60-light-100.png) — 480x270 CSS display; 38811 bytes; SHA-256 `2ac34546624ccb0bc6bc0adb72c4ae32222c7853f2ecc1d8c0e09d2dd2e80b26`.
- [silhouettes-60-busy-100.png](review-evidence/b01a/silhouettes-60-busy-100.png) — 480x270 CSS display; 41514 bytes; SHA-256 `941f0cbf824009b57f6c0eabb28af4c899a93b4ed4499f0416d73330c506778a`.
- [directions-dark-100.png](review-evidence/b01a/directions-dark-100.png) — 480x270 CSS display; 33391 bytes; SHA-256 `f02fce2d5b3de5cdd78425f95d989e98a7709157c74ad291a2dbf60da22f42aa`.
- [materials-dark-100.png](review-evidence/b01a/materials-dark-100.png) — 480x270 CSS display; 39016 bytes; SHA-256 `23174ffa6284c4d1c0b5c43744b3cfd8d75362b9784d9d49d4f43b921d79a5a5`.
- [base-scales-dark-75.png](review-evidence/b01a/base-scales-dark-75.png) — 360x202.5 CSS display; 24293 bytes; SHA-256 `a25d3a09c1a701024fbc532f11ea5bef3581951de1e17963086fd95b3c5b7c0e`.
- [silhouettes-60-dark-4-3.png](review-evidence/b01a/silhouettes-60-dark-4-3.png) — 1024x576 CSS display; 92211 bytes; SHA-256 `f9a0332e5a53bd26d8fa67c88d3a4ba8a2b77cc6e8cc031b373dafff41eed98b`.

Separate `npm run qa:controller:local` and unit-test runs passed with the synthetic Gamepad API. Physical gamepad behavior was not exercised.

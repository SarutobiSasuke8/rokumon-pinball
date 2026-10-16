# Local playability findings, 15 October 2026

Browser-driven pass on the built game in headless Chromium, 1280×900. This is local input and screenshot evidence, not a physical-phone or human feel assessment. Game behaviour was not changed in this PR.

## Findings

1. **P2: no keyboard pause during a run.** Start Dragon's Lair with Space, launch with either arrow and press Escape. The Game scene remains active and unpaused while the ball keeps moving. A player cannot safely stop to read the screen. `boot-smoke.mjs --playtest` records `paused: false` before and after Escape. Pause/settings belong in a later gameplay ticket. *Update, 16 October 2026: the b6-10 beta polish adds pause. Esc or P toggles it, hiding the tab or blurring the window pauses a ball in play, and a tap or Esc resumes; `--playtest` now records `paused: true` after Escape. Settings are still open.*
2. **P3: the waiting ball overlaps the balls counter.** Immediately after starting, the plunger ball sits over the bottom-right `Balls: 3` label. It makes the counter harder to read until launch. See `../tests/evidence/2026-10-15-boot/table.png`. HUD and lane placement need a separate review.
3. **Rough edge: little on-table input guidance.** The live table has its title and counters but no visible launch/flipper hints. The README explains that either flipper launches. First-time players may need to leave the screen to discover that. This pass verified keyboard input; real touch discoverability remains untested.

## What worked

- The first menu frame and the table render, with no page exceptions, console errors, failed requests or HTTP errors in the smoke fixture.
- Space starts Dragon's Lair. Left Arrow launches the ball. Alternating left/right input kept play moving; the recorded run reached score 200 with 2 balls remaining.
- The starter table and locked catalogue entries are visually distinct. No purchase or payment interaction was attempted.
- The standalone fixture serves an empty `/hub-bridge.js` script and supplies no `window.Hub`. The game still plays. The existing SDK forwarding checks are retained.

## Reproduce

```bash
npm ci
npx playwright install chromium
npm test
node scripts/boot-smoke.mjs --playtest
```

`npm test` now builds before its browser boot check, so it works from a fresh checkout. Screenshots are in `tests/evidence/2026-10-15-boot/`. Physics feel, full-run balance, Safari and physical mobile play remain outside this smoke pass.

# Gameplay Constants

> **Superseded on 2026-10-23 (v0.2.0).** Matter physics, the hinge constraint and the lane redirect described below were replaced by a custom fixed-step simulation (`src/game/physics.js`, tuning in `src/game/constants.js`, geometry in `src/game/layout.js`). The table below is kept as history. Current values and the reasons for them are in the code comments and are covered by `scripts/test-physics.mjs`.

Keep all player-facing tuning in named groups. Tune through a human playtest, not by intuition alone.

All values live in `src/game/constants.js` — this table explains the *why*; that file is the source of truth for the *what*.

## Ball Physics (`BALL`)

| Constant | Value | Why | Verified in |
|---|---:|---|---|
| Radius | 12px | Fits the ~56px-wide plunger lane with clearance either side | Headless physics harness, 2026-09-06 |
| Restitution | 0.5 | Enough bounce off bumpers/walls to feel lively without runaway energy gain | Headless physics harness, 2026-09-06 |
| Max speed | 26 | Hard cap applied every frame in `GameScene.update()` — prevents the ball outrunning Matter's collision resolution and tunnelling through flippers/rails at high speed | not yet playtested by a human |
| Launch strength | -22 (y velocity) | Tuned so a full plunge reaches the top deflector with enough residual speed to curve into the field; a much weaker value stalls the ball in the lane | Headless physics harness, 2026-09-06 |

## Flippers (`FLIPPER`)

| Constant | Value | Why | Verified in |
|---|---:|---|---|
| Rest / active angle | ±32° | Small enough arc to feel snappy; matches typical arcade pinball flipper throw | Headless physics harness, 2026-09-06 |
| Max angular velocity | 0.32 rad/step | Clamp on the proportional controller in `src/game/flipper.js` — caps flip speed regardless of how far off-target the angle is | Headless physics harness, 2026-09-06 |
| Gain | 14 | Proportional gain from angle error to angular velocity; high enough to reach target angle in a handful of frames | Headless physics harness, 2026-09-06 |
| Pivot mechanism | Matter `worldConstraint` (zero-length, stiffness 1) pinning one end of the flipper rectangle to a fixed world point | Standard technique for a 2D hinge joint — keeps the pivot exactly fixed without hand-rolled per-frame position math | Headless physics harness, 2026-09-06 |

## Bumpers and Targets (`BUMPER`, `TARGET`)

| Constant | Value | Why | Verified in |
|---|---:|---|---|
| Bumper restitution | 1.6 | Bumpers should visibly accelerate the ball, not just bounce it — restitution above 1 injects energy on contact | Headless physics harness, 2026-09-06 |
| Bumper score | 100 | Starting value, no balance pass yet | not yet playtested |
| Target score | 250 | Standup targets are harder to hit than a bumper, so worth more | not yet playtested |
| Lit duration | 150ms | Visual feedback flash on hit; not yet tuned against real play | not yet playtested |

## Table Layout

| Constant | Value | Why | Verified in |
|---|---:|---|---|
| Table size | 600×1000 (portrait) | Tall pinball-table aspect ratio; scales via Phaser's FIT mode to both desktop windows and mobile portrait screens | Headless physics harness, 2026-09-06 |
| Balls per game | 3 | Standard pinball ball count | not yet playtested |
| Shooter lane / deflector | Physical sloped plate (`buildLaneDeflector`) plus a deterministic code redirect (`maybeCurveIntoField`) once the ball clears the gap | The physical ramp alone gave too weak/unreliable a horizontal kick to guarantee the ball clears into the playfield every launch — see the code comment on `maybeCurveIntoField` in `GameScene.js` | Headless physics harness, 2026-09-06; needs a human playtest to confirm it *feels* like a curve and not a teleport |

## Feel and Accessibility

| Constant | Value | Why | Verified in |
|---|---:|---|---|
| Input buffer | none | Flipper input is polled every frame, not buffered — acceptable for a first slice, revisit if presses feel dropped | not yet playtested |
| Screen shake / reduced-motion fallback | none yet | No screen shake in this build | n/a |
| Audio default | none yet | No audio implemented in this build | n/a

## Verification note (2026-09-06)

The Browser preview pane in this session did not actually render frames (its `requestAnimationFrame` loop stayed paused even though `document.visibilityState` reported `"visible"`), so this table's physics were verified headlessly: driving `Phaser.Game.loop.step()` directly with a manually advanced clock and reading Matter body state (position, velocity, angle) after each simulated frame, rather than watching the canvas. This confirmed the full loop works mechanically — launch, curve into the field, bumper/target scoring, drain, ball-count decrement, game over, high-score save to `localStorage`, menu display of the saved high score, and flipper angle response to input — but it has **not** been confirmed to look or feel right on an actual rendered screen. A real playtest (desktop and mobile) is still open work.

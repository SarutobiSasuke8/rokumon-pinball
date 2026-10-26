# Game Brief

This is the project context agents should read before game design, architecture, UI, roadmap, or implementation work.

## Summary

Rokumon Pinball is a physics-driven, single-table-at-a-time pinball game with a fixed vertical camera. The player fantasy is classic pinball skill (flipper timing, ball control, table mastery) wrapped in a fantasy theme per table (dragons, wizards, ruins, etc.) instead of generic sci-fi/pop-culture pinball skins. Core loop: launch ball, flip to keep it alive, hit targets/ramps/bumpers for score and multipliers, lose the ball down the outlanes, run out of balls, see final score, restart or try again.

## Vibe

- Desired feeling: tactile, satisfying flipper feedback; the "one more ball" pull of arcade pinball.
- Reference games / experiences: Pinball FX, Zen Pinball, Devil's Crush / Alien Crush (fantasy-themed classic tables), Sonic Spinball for the fantasy-skin angle.
- Anti-vibe: sterile default Unity-physics ball feel; cluttered tables with no readable shot lines; licensed-IP pinball look.
- First impression target: ball launches, flippers respond instantly, first bumper hit feels chunky and rewarding within the first 10 seconds.

## User

- Primary player: casual browser/mobile player looking for a quick arcade session (same audience as the rest of the [[Rokumon Games]] catalogue).
- Secondary players: pinball enthusiasts who want table variety and want to unlock/buy new tables.
- Player skill level: no pinball experience required; skill ceiling comes from table mastery and combo chaining.
- Context of play: short sessions, one-handed on mobile (tap zones for flippers), keyboard/mouse or controller on desktop.

## Problem

Most free browser pinball is either a single generic table or reused licensed-IP skins. There's no small, ownable catalogue of original fantasy-themed tables that plugs into the Rokumon Games hub the way [[Raging Roulette]] and [[Rokumon Pool]] do, with a lightweight "buy a table" model instead of a single fixed board.

## Product Promise

Within the first minute, the player should be able to: launch a ball, control both flippers, hit at least one target/bumper for visible score feedback, lose the ball, and restart — on a single free starter table, without needing to buy anything first.

## Core Workflows

1. Player picks a table (starts with one free fantasy table; others shown as locked/buyable) and starts a game.
2. Player launches the ball (plunger or auto-launch on mobile), then uses left/right flippers to keep it in play and aim at targets, ramps, and bumpers.
3. Player loses all balls, sees final score and high score, and can restart the same table or return to table select.

## Success Criteria

- The first screen is playable: a ball launches and flippers respond immediately.
- The core loop (launch, flip, score, drain, restart) is understandable with no tutorial text.
- Input feels responsive on both keyboard/mouse (desktop) and touch (mobile) at typical pinball ball speeds.
- HUD (score, balls remaining, table name) does not block the playfield.
- Win/loss/restart flow exists (game over after last ball, restart button).

## Non-Goals

- No elaborate menus before the core loop works — one playable table first.
- No large content pipeline or full art pass before one table's physics and scoring loop is proven.
- No multiplayer.
- No account system or real-money purchase flow in the prototype — "buyable tables" starts as a design/UX placeholder (locked-table screen, no real payment wiring) until a first table is proven fun.

## Constraints

- Time: no fixed deadline; scaffold-first like [[Rokumon Pool]].
- Budget: solo/AI-assisted build, procedural/placeholder art first.
- Stack: Phaser 4 + TypeScript + Vite (`phaser-ts` profile), matching the rest of the Rokumon Games catalogue.
- Deployment target: browser first (desktop + mobile web), candidate for embedding in the [[Rokumon Games]] hub once a vertical slice exists.
- Data sensitivity: none — local high scores only (localStorage), no accounts, no real payments in the prototype.
- Performance expectations: stable 60fps physics on mid-range mobile browsers; pinball ball speed needs a fixed/high physics timestep to avoid tunnelling through flippers and rails.
- Accessibility expectations: flipper hit zones large enough for touch; do not rely on colour alone to distinguish table zones/targets.

## Platform and Distribution

- Engine / profile: Phaser 4 + TypeScript + Vite, `phaser-ts` profile, `games-hub` + `mobile-first` addons applied.
- Orientation and virtual resolution: portrait, matching a tall pinball table aspect ratio; must scale to both desktop browser windows and mobile portrait screens.
- Supported inputs: keyboard (desktop: arrow keys / A-D or Z-M for flippers, space/tap for plunger), mouse click zones, and touch (left/right screen halves for flippers, tap/swipe for plunger).
- Target browsers / devices: modern desktop browsers (Chrome/Edge/Firefox/Safari) and mobile Safari/Chrome.
- Distribution: candidate for the [[Rokumon Games]] embedded hub, same pattern as [[Raging Roulette]] and [[Rokumon Pool]].
- Offline requirement: no.
- Performance budget: fast load on mobile data, 60fps physics/render, bundle size in line with other Phaser games in the hub.

## Quality Gates

- Core workflow (launch -> flip -> score -> drain -> restart) works end-to-end on one table.
- Loading, empty (no tables unlocked yet), and error states exist where relevant.
- UI is responsive across target screen sizes, portrait desktop and mobile.
- Project commands in `AGENTS.md` are accurate.
- Tests/checks cover the most important changed behaviour (physics tuning, scoring, ball-loss detection).
- A playtest checklist has been run before calling the prototype done.

## Technical Notes

- Architecture: Boot -> TableSelect -> Table (gameplay) -> GameOver scene flow, matching the profile skeleton.
- Game engine: Phaser 4 for rendering, input and scenes. Since v0.2.0 (2026-10-23) the ball physics is the game's own fixed-step simulation in `src/game/physics.js` (kinematic flippers, capsule walls, 480 Hz step), replacing Matter, whose hinge flippers jittered and let balls slip past.
- Input model: keyboard keys + on-screen touch zones both mapped to the same left-flipper/right-flipper/plunger actions; must be defined in `Templates/INPUT_CONTROL_MAP.md`.
- Asset model: procedural/placeholder shapes and colour blocks first per table theme; real art later per table, tracked in `Templates/ASSET_MANIFEST.json`.
- Save/persistence: localStorage only — per-table high score and which tables are "owned"/unlocked.
- Observability/logging: none beyond standard dev console; add Games Hub Event API v1 hooks (score, game-over) once embedded, per the pattern in [[Rokumon Games]].
- Simulation / renderer boundary: `src/game/physics.js` and `src/game/rules.js` have no Phaser imports and are unit tested in Node; tuning values live in `src/game/constants.js`.
- Deterministic debug or smoke-test path: needed given physics tunnelling risk — a debug mode that fires the ball at fixed velocity/angle to verify flipper and rail collision without manual play.
- Asset manifest and fallback policy: tables with no art fall back to a themed colour palette (per fantasy theme) rather than default grey, matching the hub's "art-less catalogue still looks deliberate" rule.
- Save schema version: v1, table unlock/ownership + high-score map.

## Open Questions

- [ ] #task Decide the first fantasy table theme and lock its shot layout (bumpers, ramps, targets, outlanes).
- [ ] #task Confirm physics engine details: Matter tuning for flipper hinge speed/torque and anti-tunnelling (fixed timestep, ball max speed cap, thin-rail collision).
- [ ] #task Design the "buyable tables" model as UX only for the prototype (locked-table screen, no real money) vs when to wire an actual purchase flow.
- [ ] #task Decide the first playable milestone: one full table (launch/flip/score/drain/restart) vs a flipper-and-ball physics sandbox first.
- [ ] #task Confirm final name — Rokumon Pinball is a working title.

## References

- Sibling Rokumon-branded games: [[Raging Roulette]], [[Rokumon Pool]], [[Shootin Dice]].
- Reference games: Pinball FX, Zen Pinball/Pinball FX3, Devil's Crush / Alien Crush (fantasy-themed classic pinball).

# Rokumon Pinball

A portrait, fixed-camera browser pinball game with flipper and plunger controls and fantasy-themed tables. One table is playable today: Dragon's Lair, the free starter table.

It is part of the Rokumon Games family of small browser games.

## Status

Version 0.2.0, the overhaul after the 23 October 2026 playtest (issue #10). The table now has its own physics, a full code-drawn look, synthesised sound, a title screen, how-to-play, pause menu and a game-over and high-score flow. Automated tests cover physics, scoring, input and browser flows on desktop and phone viewports. A human feel pass on desktop and on a physical phone is still the gate before relisting. There is no hosted deployment from this repo.

## Play money only

The table catalogue has a "buy new tables" shape, but it is a design placeholder. There are no payments, accounts or real-money mechanics anywhere in the game. Two further tables (Wizard's Tower and Ancient Ruins) appear on the table-select screen as locked, with a price shown in in-game coins and a "Coming soon" label. They have no playable scenes and cannot be bought. Nothing here involves gambling.

## Run it

You need Node.js 22 or later (the CI workflow uses 22).

```bash
npm install
npm run dev
```

Vite prints a local address to open in a browser.

| Command | What it does |
| --- | --- |
| `npm run build` | Type checks with `tsc --noEmit`, then builds with Vite into `dist/`. |
| `npm run preview` | Serves the built `dist/` folder locally. |
| `npm run verify` | Runs the same checks as `build`. This is what CI runs. |
| `npm test` | Input, physics, scoring and hub checks, then a build and a headless boot smoke. |
| `npm run test:mobile` | Runs the Playwright tests against the built `dist/` (run `npm run build` first): touch on four phone viewports, keyboard, mouse and hub events on two desktop viewports. One worker. See `docs/mobile-test-plan.md`. |

## How to play

- Press PLAY on the title screen (tap, click, Space or Enter). HOW TO PLAY explains everything in the game.
- The ball waits in the shooter lane on the right. Hold to pull the plunger and let go to launch. A longer hold gives a stronger plunge.
- Keep the ball out of the drain with the flippers. You get 3 balls per game.
- Scoring: pop bumpers (dragon eggs) 100, slingshots 10. Roll through all four L-A-I-R top lanes for 2,000 and a higher multiplier (up to 5x); flipping moves the lit lanes. After a plunge one lane blinks: roll through it first for a 5,000 skill shot. Hit the three gems on the right to wake the dragon, then shoot the Mouth on the left for the 25,000 jackpot (1,000 when the dragon sleeps). Points are multiplied by the multiplier.
- Saves: a ball that drains in its first 8 seconds comes back once. The Breath kickback in the left outlane starts lit and saves one drain; waking the dragon relights it.
- At game over you see your score, whether it is a new high score, and the top five scores for the table.

## Controls

| Input | Action |
| --- | --- |
| Left Arrow, Z or Left Shift | Left flipper. |
| Right Arrow, M or Right Shift | Right flipper. |
| Space, Down Arrow or Enter (hold, then let go) | Pull and release the plunger. Any flipper key also works while the ball waits. |
| Touch or click, left half of the table | Left flipper. |
| Touch or click, right half of the table | Right flipper. |
| Touch and hold anywhere while the ball waits | Pull the plunger; let go to launch. |
| Esc or P, or the II button at the top right | Pause menu: resume, how to play, sound, restart, quit to title. Hiding the tab also pauses. |
| R | Restart the current game. |
| Title screen: Space or Enter, H, S | Play, how to play, sound on or off. |
| Game over: Space or Enter, Esc, or the buttons | Play again, title screen. |

## How it works

- The game is a portrait 600 by 1000 canvas, scaled to fit the window. The top 96 pixels are the dot-matrix score display and pause button; the table never draws under them.
- Physics is the game's own fixed-step simulation in `src/game/physics.js` (480 steps a second): capsule walls, kinematic flippers that pass their surface speed to the ball, kicking bumpers and slingshots, a one-way lane gate, a saucer and a kickback. It has no Phaser imports, so it is tested in Node. Table geometry is in `src/game/layout.js`; tuning values are in `src/game/constants.js`.
- Scoring rules are pure functions in `src/game/rules.js`.
- Keyboard and touch share one input contract in `src/systems/input.js`. Taps shorter than a frame still flip.
- All art is drawn in code at boot (`src/art/textures.js`). All sound is synthesised at runtime with the Web Audio API (`src/systems/audio.js`). There are no image or audio files and no third-party assets.
- High scores, the top-five list and the sound setting are saved in the browser's `localStorage` (schema v1; older saves keep their best score). There is no server and no account.
- A small bridge in `src/integrations/hub.js` reports ready, score and game-over events to the Rokumon Games hub when its SDK is present.

## Tech

- [Phaser](https://phaser.io/) 4 for rendering, input and scenes; custom physics
- Vite 8 and TypeScript for the entry point and type checking. Most game modules are plain JavaScript.
- Tests: plain Node scripts (`scripts/test-*.mjs`) and Playwright (`tests/mobile/`).

## Project layout

- `src/main.ts`: Phaser game setup and scene list.
- `src/scenes/`: boot, title, how-to-play, game, HUD and pause, and game-over scenes.
- `src/game/`: constants, table layout, physics, rules, table catalogue, save data and run state.
- `src/art/`, `src/ui/`: code-drawn textures, the dot-matrix display and UI widgets.
- `src/systems/`: input, audio and debug helpers.
- `src/ui/`: HUD housing helper.
- `docs/`, `Templates/`, `personas/`, `profiles/`, `addons/`, `Session Logs/`, `AGENTS.md` and the other agent files: the working agreement and notes from the browser game template this project started from. See `TEMPLATE_NOTES.md`.
- `ROADMAP.md` and `TODO.md`: open work.

## Open work

- A human playtest on desktop and phone.
- Build the two locked tables as real, playable scenes (not part of the 0.2.0 overhaul).
- Decide whether and when to join the Rokumon Games hub.

## Licence

See `LICENSE`.

## Rokumon hub events

The optional `/hub-bridge.js` SDK receives ready when a game starts, score on every score change, and gameOver at the final drain with the score and play duration in milliseconds (unchanged in 0.2.0). Missing or broken SDK calls are no-ops. Static `dist/` assets use relative URLs.

- `high-score`: tableId (string), score (number), seconds (number). Emitted only for a new saved table best at run end.

Run `npm test` and `node scripts/hub-smoke.mjs` after building for forwarding, final drain and standalone coverage.

## Repeatable boot smoke

Run `npm ci`, then `npx playwright install chromium` once. `npm test` runs the existing control/SDK checks, builds the game and boots it in headless Chromium. It checks rendered menu/table frames, keyboard start and launch, and refuses console errors, page exceptions and failed requests. `node scripts/boot-smoke.mjs --playtest` adds alternating flipper input and an Escape check. See [dated findings](docs/playability.md); the test does not certify physical touch or physics feel.

## Credits

Code, table art and sound effects: Rokumon Games. All art is drawn in code and all sound is synthesised in code at runtime; the game ships no third-party or licensed assets. Fonts are the player's system fonts (Georgia, Trebuchet MS or fallbacks).

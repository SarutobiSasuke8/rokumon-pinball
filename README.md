# Rokumon Pinball

A portrait, fixed-camera browser pinball game with flipper and plunger controls and fantasy-themed tables. One table is playable today: Dragon's Lair, the free starter table.

It is part of the Rokumon Games family of small browser games.

## Status

First playable vertical slice. The core loop works end to end: launch the ball, keep it alive with the flippers, score off bumpers and targets, lose the ball down the drain, and see the game-over screen with your saved high score. The TypeScript and Vite build passes. A human feel pass on desktop and on a physical phone is still outstanding, so treat the physics tuning as provisional. There is no hosted deployment.

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

## How to play

- Pick the Dragon's Lair card on the table-select screen (click, tap or press Space).
- The ball waits in the plunger lane on the right. There is no separate launch button: pressing either flipper while the ball is waiting launches it.
- Keep the ball in play with the flippers and score off the 3 bumpers and 2 standup targets.
- You get 3 balls per game. When the last one drains, the game-over screen shows your score and your best score for that table.

## Controls

| Input | Action |
| --- | --- |
| Left Arrow or Z | Left flipper (also launches the ball while it waits in the lane). |
| Right Arrow or M | Right flipper (also launches the ball while it waits in the lane). |
| Touch or click, left half of the screen | Left flipper. |
| Touch or click, right half of the screen | Right flipper. |
| R | Restart. |
| Space | Play the table from the select screen, or play again from the game-over screen. |
| Esc | Return to table select from the game-over screen. |

Known issue on this branch: flippers can stick after a release that crosses the two touch halves, and multi-touch holds are not independent. A fix is in open pull request #1 and is not part of `main`.

## How it works

- The table is a portrait 600 by 1000 canvas, scaled to fit the window.
- Physics is Phaser's Matter integration, with two hinged flippers, bumpers, standup targets and a shooter lane.
- A code-driven redirect curves the launched ball out of the lane into the playfield, because the physical ramp alone gave an unreliable kick. The reasoning is recorded in `Templates/GAMEPLAY_CONSTANTS.md`.
- Keyboard and touch share one input contract in `src/systems/input.js`.
- High scores and the table ownership map are saved in the browser's `localStorage` (schema v1). There is no server and no account.
- Table definitions are in `src/game/tables.js`, and tuning values are in `src/game/constants.js`.
- A small `postMessage` bridge in `src/integrations/hub.js` can report ready, score and game-over events to a host page. No hub is wired up yet.

## Tech

- [Phaser](https://phaser.io/) 4 with Matter physics
- Vite 8 and TypeScript for the entry point and type checking. Most game modules are plain JavaScript.
- No test framework is configured.

## Project layout

- `src/main.ts`: Phaser game setup and scene list.
- `src/scenes/`: boot, table-select menu, game, HUD and game-over scenes.
- `src/game/`: constants, table definitions, flipper logic, save data and run state.
- `src/systems/`: input and debug helpers.
- `src/ui/`: HUD housing helper.
- `docs/`, `Templates/`, `personas/`, `profiles/`, `addons/`, `Session Logs/`, `AGENTS.md` and the other agent files: the working agreement and notes from the browser game template this project started from. See `TEMPLATE_NOTES.md`.
- `ROADMAP.md` and `TODO.md`: open work.

## Open work

- A human playtest on desktop and phone.
- Build the two locked tables as real, playable scenes.
- Decide whether and when to join the Rokumon Games hub.

## Licence

See `LICENSE`.

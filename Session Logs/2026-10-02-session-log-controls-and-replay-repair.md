---
title: Session Log - Controls and Replay Repair
date: 2026-10-02
created: 2026-10-02
status: complete
type: session-log
mutability: append-only
owner: "[[Alexei Udall]]"
project: Rokumon Pinball
agent: Codex
tags:
  - session-log
---

# Controls and Replay Repair

## Executive Summary

Flipper touches now release according to the finger that pressed them. Dragging across the centre no longer leaves a flipper stuck, and 2 fingers can hold independent flippers. R restarts the current table, and Space works when the player returns to table select after game over.

## Trigger and Starting State

The gaming portfolio improvements sweep requested bounded repairs and PRs. The repository was clean at `34df01e`, on `main`, with no open PRs. The original TypeScript and Vite build passed. Source inspection found release coordinates deciding which half to clear, an unused restart action, and retained `firstOwnedId` state preventing the Space listener from returning on menu re-entry.

## Acceptance and Work Completed

- Every pointer keeps the half where it pressed until release, including release outside the canvas.
- Releasing 1 touch keeps another touch held, even when both started on the same half.
- Focus loss clears touch holds; shutdown detaches the shared blur listener.
- The Phaser config permits 2 active touch pointers.
- R restarts with the current table ID and a clean score/ball count.
- Returning to table select installs the Space action again.
- `npm test` exercises shipped input and scene methods through a small Phaser stub; `npm run verify` includes the regression suite before the build.
- The input map records R and independent touch lifetimes.

## Files Touched

`src/systems/input.js`, `src/scenes/GameScene.js`, `src/scenes/MenuScene.js`, `src/main.ts`, `scripts/test-controls.mjs`, `package.json`, `Templates/INPUT_CONTROL_MAP.md`, and the session index.

## Verification

- The new regression suite failed against the original cross-half release: the left flipper stayed held after the finger released on the right.
- Fixed source passes 14 touch, keyboard, menu-return and listener-cleanup assertions.
- `npm run verify` passes the suite, `tsc --noEmit` and Vite production build. The existing large Phaser chunk warning remains.
- Bundled Playwright with installed Chromium checked a mouse release across the centre, simultaneous touch holds, independent finger release, R from a fresh page, flipper launch, a forced last-ball drain, game-over, Esc to table select, and Space reopening. No page errors occurred in the completed Pinball run.
- The partial release used a browser TouchEvent after CDP touchStart; CDP touchEnd alone ends the full synthetic gesture. The keyboard checks used a fresh page to remove synthetic touch compatibility mouse state.
- Menu, active play, game-over and 800x450 screenshots were captured and inspected. Evidence on the review workstation: `C:/Users/sarut/AppData/Local/Temp/arcade-pinball-{menu,active,gameover,small}.png`.

## Decisions and Rollback

This pass repairs the existing controls and replay loop. It leaves table content, flipper physics and local high-score storage unchanged. Reverting this focused commit restores the previous behaviour; there is no migration or dependency change.

## Open Threads

- Physical-phone testing and human flipper feel/balance feedback are still needed before claiming a verified vertical slice.
- The drain test forces the final ball-loss event. A naturally played full 3-ball run and high-speed tunnelling coverage remain open.
- GameOver advertises a long tap for table select without implementing it. Resolve that mobile navigation promise before adding more playable tables.
- The project README and brief retain template or early-plan material; refresh them against current source before the next content milestone.

## Connected

- `Templates/INPUT_CONTROL_MAP.md`
- `Templates/PLAYTEST_CHECKLIST.md`
- `docs/PROJECT_BRIEF.md`

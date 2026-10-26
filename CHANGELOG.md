# Changelog

All notable changes to this project should be documented here.

## 0.2.0 - 2026-10-23

Overhaul after Alexei's playtest (issue #10).

- Physics: replaced Matter with a fixed-step pinball simulation. Flippers no longer jitter and rise in about 33 ms; the table now has inlanes, outlanes, slingshots and guides so the ball reaches the flippers; no tunnelling (fuzz tested); a one-way lane gate and an orbit stop instead of the scripted lane redirect.
- Plunger: hold to pull, release to launch, with a power meter. Works with any key or touch.
- Table: Dragon's Lair redrawn in code (dragon, hoard, gold rails, egg bumpers, gem targets, the Mouth saucer, lit inserts, glow and particles) with rules: L-A-I-R lanes and multiplier, skill shot, gems, jackpot, ball save and kickback.
- Dot-matrix score display, synthesised sound effects with a saved mute setting.
- Title screen, how-to-play, pause menu (resume, how to play, sound, restart, quit), game over with a top-five high-score list.
- Tests: physics, rules and save checks in Node; Playwright touch tests on four phone viewports and keyboard, mouse and hub-event tests on two desktop viewports.
- Layout (2026-10-26): the table is centred on wide screens and landscape phones. index.html and Phaser both centred the canvas, which pushed it off-centre (318 px at 1920 wide).
- Tests (2026-10-26): `tests/mobile/full-game.spec.ts` plays one complete game with real input only (PLAY, plunger, flipper bot, three natural drains, game-over screen, SDK calls, PLAY AGAIN) on desktop 1280 (mouse and keyboard), Pixel 7 portrait and iPhone 13 landscape (touch). Runs in `npm run test:mobile`.

## Unreleased

- Beta polish: pause overlay (Esc or P, and automatic when the tab is hidden or the window loses focus with a ball in play; tap or Esc resumes), a loading line while the bundle downloads, meta description and favicon, and no pull-to-refresh, overscroll or double-tap zoom on phones.
- Initial template setup.
- Added a reusable branded-HUD housing contract: normalized safe insets,
  Phaser containment auditing/debug guides, and screenshot-based QA guidance.

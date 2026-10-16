# itch.io page kit: Rokumon Pinball

Everything needed to set up the itch.io page by hand. Nothing here uploads, and there is no `butler push`. Rules checked against [itch.io's HTML5 docs](https://itch.io/docs/creators/html5) on 16 October 2026.

## Build the zip

```bash
npm ci
npm run build:itch
```

This runs `vite build --mode itch` into `dist-itch/`, then `scripts/itch-zip.mjs` writes `itch/rokumon-pinball-itch.zip` and checks it:

- `index.html` sits at the zip root (the zip is read back to confirm);
- no more than 1,000 files and 500 MB extracted, no file over 200 MB, no path over 240 characters;
- `index.html` has no root-absolute (`/...`) paths, which point outside the game on itch.io.

It prints the zip size and file count, and CI runs it on every push and pull request (the zip is kept as the `itch-zip` workflow artifact for 7 days).

The itch mode only differs from the default build in one way: it drops the `<script src="/hub-bridge.js">` tag. That optional Rokumon hub SDK is root-absolute, itch.io cannot serve it, and the game never depends on it. `npm run build` and the hub build are unchanged and still load it. Asset paths are relative (`base: "./"`) in both builds.

Build output on 16 October 2026: 2 files, 0.36 MB zipped, 1.33 MB extracted, `index.html` at the root.

## Upload settings

| Setting | Value |
| --- | --- |
| Kind of project | HTML |
| Upload | `itch/rokumon-pinball-itch.zip`, tick "This file will be played in the browser" |
| Embed options | Embed in page |
| Viewport dimensions | 600 x 1000 (native portrait table). If 1000 px is too tall for the page layout, use 480 x 800: same 3:5 ratio, and Phaser's FIT scaling keeps the table whole. |
| Mobile friendly | Yes, orientation Portrait. Touch is supported: left half of the screen is the left flipper, right half the right flipper. |
| Automatically start on page load | No (keep Click to Play, so audio is not muted by the browser) |
| Fullscreen button | Yes (the game has no fullscreen button of its own) |
| Enable scrollbars | No |
| Pricing | No payments or donations required. Embedded HTML5 games can only take donations. |

## Short description (140 characters max)

> Portrait browser pinball. Launch with the flippers, score off bumpers and targets on Dragon's Lair, and chase your best score in 3 balls.

(137 characters.)

## Long description

> **Rokumon Pinball** is a portrait, fixed-camera pinball game that runs in your browser on desktop and mobile.
>
> Pick the Dragon's Lair table, launch the ball with either flipper and keep it alive. Score off 3 bumpers and 2 standup targets. You get 3 balls per game, and your best score for the table is saved in your browser.
>
> **Controls**
> - Left Arrow or Z: left flipper
> - Right Arrow or M: right flipper
> - Touch or click: left or right half of the screen
> - Either flipper launches the ball from the plunger lane
> - Space: play / play again. Esc: back to table select
>
> This is an early beta with one playable table. Wizard's Tower and Ancient Ruins are shown as "Coming soon" and cannot be played or bought yet. There are no payments, accounts or real-money mechanics: in-game coins are play money only.
>
> Part of the Rokumon family of small browser games.

## Tags (up to 10)

`pinball`, `arcade`, `physics`, `fantasy`, `high-score`, `mobile`, `touch-friendly`, `singleplayer`, `phaser`, `2d`

Genre: Action (itch.io's closest category; there is no Pinball genre).

## Screenshots (3 to 5)

Capture at 600 x 1000 from the itch build (or scale down to 480 x 800). Existing evidence frames in `tests/evidence/2026-10-15-boot/` show the right scenes but were taken at 1280 x 900, so recapture them at the native size.

1. **Table select:** Dragon's Lair card with best score, and the two locked "Coming soon" tables (`menu.png` scene).
2. **Ball in play:** Dragon's Lair mid-run, ball near the bumpers, flippers raised, score showing.
3. **Launch:** the ball waiting in the right-hand plunger lane at the start of a ball. Note the known overlap with the `Balls: 3` label (docs/playability.md finding 2); prefer a frame just after launch until that is fixed.
4. **Game over:** final score and saved best score for the table.
5. Optional, **mobile:** the table on a phone-sized portrait viewport, to back the Mobile friendly tag.

## Cover image (630 x 500)

itch.io cover images are 630 x 500 (minimum 315 x 250, same ratio). **No suitable art exists in the repo:** there is no key art, logo or table illustration, only functional in-game graphics and test evidence frames. A cover needs making: suggested composition is the Dragon's Lair table cropped to landscape, the ball and a lit bumper in the centre, with the "Rokumon Pinball" title. Keep it free of real-money or gambling imagery.

## Before publishing

- Run the human feel pass on desktop and a real phone (still outstanding per the README).
- Decide whether to show the two locked tables on a public page, or wait until at least one more table is playable.
- Set the page to Draft or Restricted until the build has been played on itch.io's own embed.

# Mobile test plan

Rokumon Pinball is played on phones with two touch zones: the left half of the table works the left flipper and the right half works the right flipper. Pressing either flipper while the ball waits in the lane launches it. This plan says what the automated tests prove, what still needs a person with a real phone, and how to record a pass or fail.

## Automated coverage

Run with:

```bash
npm run build
npm run test:mobile
```

The tests live in `tests/mobile/` and the configuration is `playwright.config.ts`. They load the production build from `dist/`, served at the same nested path the Rokumon hub uses (`/games/pinball/play/`), and run in CI on every pull request (`.github/workflows/game.yml`).

Four device projects, one worker:

| Project | Descriptor | Viewport |
| --- | --- | --- |
| `iphone-13-portrait` | iPhone 13 | 390 x 664 |
| `iphone-13-landscape` | iPhone 13 landscape | 750 x 342 |
| `pixel-7-portrait` | Pixel 7 | 412 x 839 |
| `pixel-7-landscape` | Pixel 7 landscape | 863 x 360 |

All four projects run in Chromium. The iPhone 13 projects use the iPhone viewport, pixel ratio, user agent and touch support, but the engine is Chromium, not Safari. Two reasons: the tests drive touch through the Chrome DevTools Protocol, and Playwright WebKit is heavy and unreliable on the Windows dev machine. Real Safari is therefore on the human checklist below.

Input is real touch. `tests/mobile/touch.ts` sends `Input.dispatchTouchEvent` through the DevTools Protocol, so the browser fires genuine `touchstart`, `touchmove` and `touchend` events with separate finger ids. After every test, the suite checks that touch events reached the page, that no mouse events were fired, and that there were no console errors or uncaught exceptions.

| Test | What it proves |
| --- | --- |
| Canvas fits the screen with no page scroll | The table scales into the viewport in both orientations, with no sideways scroll. |
| Tapping the table card starts Dragon's Lair | A tap on the select screen starts the game, with both flippers at rest and the ball ready. |
| Holding the left half raises the left flipper and launches the ball | Touch-and-hold raises the left flipper only, keeps it up for as long as the finger is down, launches the waiting ball, and drops the flipper on release. |
| Holding the right half raises only the right flipper | The same for the right zone. |
| Two thumbs hold both flippers independently | Two fingers down raise both flippers; lifting one finger drops only that flipper. |
| A swipe across the centre releases the flipper it started on | A finger that slides from the left half into the right half and lifts releases the left flipper, never presses the right one, and does not scroll the page. |
| Touch play scores points and the HUD shows them | Flipping by touch keeps the ball moving until it scores, and the score label reads `Score: N`. |
| Short tap on the game-over screen replays | A quick tap starts the same table again. |
| Long tap on the game-over screen returns to table select | Holding for half a second goes back to the select screen, as the on-screen prompt says. |

The game-over tests reach that screen through the debug hook (`window.__GAME_DEBUG__`) instead of playing three balls to the drain, so they stay fast and deterministic. Everything else is driven by touch alone.

Local run time is about 70 seconds for all 36 tests on the dev laptop.

## What still needs a human on a real phone

Automation cannot judge these. Each needs a real device, ideally one iPhone (Safari) and one Android phone (Chrome).

- **Safari and WebKit behaviour.** The automated iPhone runs are Chromium. Check touch on real iOS Safari, including the home-screen bookmark if the hub offers one.
- **Feel.** Flipper response time, whether the flippers feel snappy enough to trap and pass the ball, and whether the physics tuning feels right on 60 Hz and 120 Hz screens.
- **Real thumbs.** Two-thumb play with resting palms, fast alternating taps, and a thumb that drifts across the centre line during a long hold.
- **System gestures.** iOS home-indicator swipe, Android back-gesture edges and the notification shade must not steal flipper presses during normal play, and a press interrupted by one must not leave a flipper stuck up.
- **Landscape.** In landscape the portrait table becomes a narrow strip in the middle of the screen (about 205 x 342 CSS pixels on an iPhone 13). Touches on the dark bars either side do not reach the game. Judge whether landscape is playable or whether players should be told to rotate.
- **Orientation change and app switching.** Rotate mid-ball, lock the screen, and switch apps and back. The flippers should come back at rest and the game should not freeze.
- **Long-press side effects.** A long tap on the game-over screen must not open the iOS text-selection loupe, a callout menu or the Android context menu.
- **Inside the hub.** Play once inside the Rokumon games hub page on a phone, not just the standalone build.
- **Performance.** A full three-ball game on a mid-range or older phone without visible stutter or heat.

## Pass/fail checklist

Record the device, OS version, browser and build (commit) at the top of each run.

| # | Check | iPhone (Safari) | Android (Chrome) |
| --- | --- | --- | --- |
| 1 | `npm run test:mobile` passes (CI or local) | Pass / Fail | Pass / Fail |
| 2 | Table select: tapping Dragon's Lair starts the table | Pass / Fail | Pass / Fail |
| 3 | Left half hold raises only the left flipper; release drops it | Pass / Fail | Pass / Fail |
| 4 | Right half hold raises only the right flipper; release drops it | Pass / Fail | Pass / Fail |
| 5 | Either flipper launches the waiting ball | Pass / Fail | Pass / Fail |
| 6 | Two thumbs: both flippers up together, each drops on its own release | Pass / Fail | Pass / Fail |
| 7 | Sliding a held thumb across the centre never leaves a flipper stuck | Pass / Fail | Pass / Fail |
| 8 | The page never scrolls, zooms or bounces during play | Pass / Fail | Pass / Fail |
| 9 | Score and balls in the HUD update during play | Pass / Fail | Pass / Fail |
| 10 | Game over: short tap replays, long tap returns to table select | Pass / Fail | Pass / Fail |
| 11 | No selection loupe, callout or context menu on long tap | Pass / Fail | Pass / Fail |
| 12 | System gestures do not leave a flipper stuck up | Pass / Fail | Pass / Fail |
| 13 | Rotate, lock and app switch mid-game: game recovers, flippers at rest | Pass / Fail | Pass / Fail |
| 14 | Landscape is playable, or the limitation is accepted and noted | Pass / Fail | Pass / Fail |
| 15 | Flipper feel is acceptable (subjective, note comments) | Pass / Fail | Pass / Fail |
| 16 | Plays correctly inside the hub page | Pass / Fail | Pass / Fail |

Mobile support can be called full when rows 1 to 13 and 16 pass on both phones and rows 14 and 15 have a recorded decision.

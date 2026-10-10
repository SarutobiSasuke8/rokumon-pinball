# Input / Control Map

The single source of truth for how the game is controlled. Update this before or with any input change; the playtest checklist verifies against it.

## Primary Controls

| Action | Keyboard | Mouse / Touch | Gamepad (if supported) |
|---|---|---|---|
| Left flipper | `Left Arrow` / `Z` | Tap/hold left half of screen | not supported |
| Right flipper | `Right Arrow` / `M` | Tap/hold right half of screen | not supported |
| Launch ball | either flipper key/zone, while ball is waiting in the lane | either flipper zone, while ball is waiting in the lane | not supported |
| Pause / menu | `Esc` (from Game Over only, returns to table select) | n/a | not supported |
| Restart | `R` during play / `Space` from Game Over | tap anywhere from Game Over | not supported |

## Rules

- Keyboard-first by default; every core action must be reachable without a mouse unless the genre demands otherwise.
- Do not bind core actions to keys that conflict with browser shortcuts (avoid `Ctrl`-combinations for core play).
- Held vs tapped behavior must be deliberate and documented here when it differs.
- Remapping, if offered, is a later-milestone feature; a stable default map comes first.

## Notes

- Input model: polled every frame (`src/systems/input.js`) — flipper state is read each `update()` tick, not event-driven, so held-key/held-touch behaviour is inherent.
- There is deliberately no separate launch button. While the ball sits in the plunger lane (`status: "ready"`), pressing either flipper launches it — this keeps the touch control surface to exactly two zones (left half / right half) on mobile, with no third gesture to teach.
- Touch zones are the left/right halves of the whole canvas, not small on-playfield buttons, so they stay easy to hit on a phone regardless of screen size.
- Each finger keeps the flipper half where it pressed until it releases. Both halves can be held together; releasing 1 finger leaves the other held. Losing focus releases all touch holds.
- No dead zones or input buffering yet — flipper angular motion is a simple proportional controller (see `src/game/flipper.js`), not a physical motor with acceleration curves.

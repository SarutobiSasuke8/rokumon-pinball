import { GAME, FLIPPER, PLUNGER, BUMPER } from "./constants.js";

// Dragon's Lair table geometry, in game pixels (600 x 1000, y down).
// Pure data: the physics world, the renderer and the tests all read this.
//
// The playfield sits below the score panel (GAME.hudHeight). The field's
// centre line is x = 280; the shooter lane runs up the right edge between the
// divider (x = 538) and the outer wall (x = 578).

const FIELD_CENTER = 280;
const mirror = (p) => ({ x: FIELD_CENTER * 2 - p.x, y: p.y });

const ARC = { cx: 300, cy: 380, r: 278, segments: 32 };
const LEFT_WALL_X = ARC.cx - ARC.r; // 22
const RIGHT_WALL_X = ARC.cx + ARC.r; // 578

function arcPoints() {
  const points = [];
  for (let i = 0; i <= ARC.segments; i += 1) {
    const a = Math.PI + (Math.PI * i) / ARC.segments;
    points.push({ x: ARC.cx + ARC.r * Math.cos(a), y: ARC.cy + ARC.r * Math.sin(a) });
  }
  return points;
}

function arcPoint(deg) {
  const a = (deg * Math.PI) / 180;
  return { x: ARC.cx + ARC.r * Math.cos(a), y: ARC.cy + ARC.r * Math.sin(a) };
}

function polyline(points, props) {
  const segs = [];
  for (let i = 0; i < points.length - 1; i += 1) segs.push({ a: points[i], b: points[i + 1], ...props });
  return segs;
}

const SLING_LEFT = { top: { x: 98, y: 720 }, bottom: { x: 98, y: 810 }, tip: { x: 156, y: 842 } };
const SLING_RIGHT = { top: mirror(SLING_LEFT.top), bottom: mirror(SLING_LEFT.bottom), tip: mirror(SLING_LEFT.tip) };

const GUIDE_LEFT = [{ x: 60, y: 690 }, { x: 60, y: 840 }, { x: 197, y: 909 }];
const GUIDE_RIGHT = GUIDE_LEFT.map(mirror);

const LANE_GUIDE_XS = [180, 230, 280, 330, 380];
const LANE_TOP = 166;
const LANE_BOTTOM = 210;

export const LAYOUT = Object.freeze({
  fieldCenter: FIELD_CENTER,
  arc: ARC,
  drainY: GAME.height + 14,
  laneFloorY: PLUNGER.restY + 11 + 3,
  walls: [
    ...polyline(arcPoints(), { r: 3, kind: "wall" }),
    { a: { x: LEFT_WALL_X, y: ARC.cy }, b: { x: LEFT_WALL_X, y: GAME.height + 40 }, r: 3, kind: "wall" },
    { a: { x: RIGHT_WALL_X, y: ARC.cy }, b: { x: RIGHT_WALL_X, y: GAME.height + 40 }, r: 3, kind: "wall" },
    // Shooter lane divider and the floor the plunger tip makes.
    { a: { x: PLUNGER.dividerX, y: 440 }, b: { x: PLUNGER.dividerX, y: GAME.height + 40 }, r: 3, kind: "wall" },
    { a: { x: PLUNGER.dividerX, y: PLUNGER.restY + 14 }, b: { x: RIGHT_WALL_X, y: PLUNGER.restY + 14 }, r: 3, kind: "wall" },
    // One-way gate over the lane exit: a ball leaving the lane passes, a
    // ball coming down the right of the field is turned back into play.
    { a: { x: PLUNGER.dividerX, y: 440 }, b: { x: RIGHT_WALL_X, y: 404 }, r: 3, kind: "gate", oneWay: true },
    // Inlane / outlane guides.
    ...polyline(GUIDE_LEFT, { r: 4, kind: "wall" }),
    ...polyline(GUIDE_RIGHT, { r: 4, kind: "wall" }),
    // Orbit stop: a ball riding the arch all the way round is turned down
    // into the upper playfield instead of running down the left wall.
    { a: arcPoint(212), b: { x: 118, y: 268 }, r: 4, kind: "wall" },
    // Top rollover lane guides.
    ...LANE_GUIDE_XS.map((x) => ({ a: { x, y: LANE_TOP }, b: { x, y: LANE_BOTTOM }, r: 4, kind: "wall" })),
  ],
  slings: [
    { id: "sling-left", ...SLING_LEFT },
    { id: "sling-right", ...SLING_RIGHT },
  ],
  bumpers: [
    { id: "bumper-0", x: 210, y: 300, r: BUMPER.radius },
    { id: "bumper-1", x: 350, y: 300, r: BUMPER.radius },
    { id: "bumper-2", x: 280, y: 388, r: BUMPER.radius },
  ],
  // Gem standup targets on the divider's playfield face.
  targets: [
    { id: "gem-0", a: { x: 528, y: 520 }, b: { x: 528, y: 548 }, r: 5 },
    { id: "gem-1", a: { x: 528, y: 574 }, b: { x: 528, y: 602 }, r: 5 },
    { id: "gem-2", a: { x: 528, y: 628 }, b: { x: 528, y: 656 }, r: 5 },
  ],
  lanes: [205, 255, 305, 355].map((x, i) => ({ id: `lane-${i}`, x, y: 190, r: 14, letter: "LAIR"[i] })),
  laneGuideXs: LANE_GUIDE_XS,
  laneTop: LANE_TOP,
  laneBottom: LANE_BOTTOM,
  guides: { left: GUIDE_LEFT, right: GUIDE_RIGHT },
  // The dragon's mouth: a saucer that holds the ball, then spits it back out.
  saucer: { id: "mouth", x: 96, y: 440, r: 15, maxCaptureSpeed: 950, eject: { vx: 560, vy: -260 } },
  // Kickback at the bottom of the left outlane.
  kickback: { id: "kickback", x: 41, y: 900, r: 16, vx: 260, vy: -1750 },
  flippers: [
    { side: "left", x: 190, y: 928 },
    { side: "right", x: FIELD_CENTER * 2 - 190, y: 928 },
  ],
  flipper: FLIPPER,
  ballStart: { x: PLUNGER.laneX, y: PLUNGER.restY },
});

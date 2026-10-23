export const GAME = Object.freeze({
  width: 600,
  height: 1000,
  seed: 1,
  ballsPerGame: 3,
  // Height of the score panel strip above the playfield. The table never draws
  // under it, so the HUD can never cover the ball.
  hudHeight: 96,
});

// Dragon's Lair — table 1 (free starter table). Fantasy theme: a dragon's
// hoard, flippers as guardian blades, pop bumpers as dragon eggs.
export const TABLE = Object.freeze({
  id: "dragons-lair",
  name: "Dragon's Lair",
  colors: {
    background: 0x07040a,
    playfield: 0x2a1510,
    wall: 0x4a2a1a,
    rail: 0xd4a017,
    flipper: 0x8b2635,
    ball: 0xe8e8e8,
    bumperLit: 0xff6b1a,
    bumperUnlit: 0x8b3a0a,
    target: 0xffd700,
    outlane: 0x0a0503,
    text: 0xffe4b5,
  },
});

// Physics runs in its own fixed-step simulation (src/game/physics.js), in
// pixels and seconds. The step is small enough that the fastest ball moves
// well under its own radius per step, so it cannot tunnel through a rail.
export const PHYSICS = Object.freeze({
  gravity: 1500, // px/s², the along-the-table pull of a tilted playfield
  dt: 1 / 480, // fixed simulation step
  maxStepsPerFrame: 48, // caps catch-up after a stall (0.1 s of simulation)
  maxSpeed: 2900, // px/s
  airDrag: 0.04, // fraction of speed lost per second while rolling
  wallRestitution: 0.45,
  wallFriction: 0.02,
});

export const BALL = Object.freeze({
  radius: 11,
});

// Flippers are kinematic: they sweep at a fixed angular speed toward the
// raised or resting angle, and hand their surface speed to the ball on contact.
export const FLIPPER = Object.freeze({
  length: 80,
  pivotRadius: 12,
  tipRadius: 6,
  restAngleDeg: 30, // resting, pointing down and inward
  activeAngleDeg: -26, // raised
  upSpeed: 30, // rad/s, a full swing in about 33 ms
  downSpeed: 16, // rad/s
  restitution: 0.3,
  // A tap shorter than a frame still flips for at least this long.
  minPressMs: 70,
});

export const BUMPER = Object.freeze({
  radius: 26,
  kick: 980, // px/s, minimum outward speed after a hit
  litMs: 160,
});

export const SLING = Object.freeze({
  kick: 760,
  minApproach: 40, // px/s, a resting touch does not fire the slingshot
});

export const PLUNGER = Object.freeze({
  dividerX: 538, // wall between the shooter lane and the playfield
  laneX: 558, // ball's resting x inside the lane
  restY: 958,
  chargeMs: 900, // time to pull the plunger all the way back
  minSpeed: 1560, // px/s at the lightest tap; always clears the lane gate
  maxSpeed: 1840, // px/s at full pull
});

export const RULES = Object.freeze({
  ballSaveMs: 8000, // a drain this soon after launch gives the ball back
  skillShotMs: 3500, // window for the skill shot after launch
  maxMultiplier: 5,
  saucerHoldMs: 1100,
  score: {
    bumper: 100,
    sling: 10,
    laneLit: 500,
    laneRepeat: 100,
    lanesComplete: 2000,
    skillShot: 5000,
    gem: 750,
    gemRepeat: 250,
    mouth: 1000,
    jackpot: 25000,
  },
});

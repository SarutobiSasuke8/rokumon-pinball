export const GAME = Object.freeze({
  width: 600,
  height: 1000,
  seed: 1,
  ballsPerGame: 3,
});

// Dragon's Lair — table 1 (free starter table). Fantasy theme: a dragon's
// hoard, flippers as guardian blades, bumpers as glowing hoard gems.
export const TABLE = Object.freeze({
  id: "dragons-lair",
  name: "Dragon's Lair",
  colors: {
    background: 0x1a0e0a,
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

// Ball physics. Tuned for Matter with a fixed timestep — a real ball never
// travels more than a fraction of its own radius per substep, which is what
// prevents it tunnelling through flippers and thin rails at speed.
export const BALL = Object.freeze({
  radius: 12,
  restitution: 0.5,
  friction: 0.02,
  frictionAir: 0.0005,
  density: 0.02,
  maxSpeed: 26,
  launchStrength: -22,
});

// Flippers are Matter rectangles rotated around a pivot by directly setting
// angular velocity toward a rest/active angle each frame, rather than a
// motor constraint — simpler to tune and plenty responsive at this scale.
export const FLIPPER = Object.freeze({
  width: 90,
  height: 18,
  restAngleDeg: 32, // resting, pointing down/outward
  activeAngleDeg: -32, // flipped up
  maxAngularVelocity: 0.32, // clamp, in Matter's per-step radians
  gain: 14, // proportional gain from angle error (rad) to angular velocity
  snapEpsilon: 0.01, // radians close enough to target to hard-snap
  density: 0.006,
  friction: 0.05,
});

export const BUMPER = Object.freeze({
  radius: 22,
  restitution: 1.6,
  score: 100,
  litMs: 150,
});

export const TARGET = Object.freeze({
  width: 40,
  height: 14,
  score: 250,
});

export const PLUNGER = Object.freeze({
  dividerX: GAME.width - 80, // wall separating the launch lane from the playfield
  laneX: GAME.width - 48, // ball's resting/travel x inside the lane
  restY: GAME.height - 60,
});

export const PHYSICS = Object.freeze({
  gravity: 1.1,
});

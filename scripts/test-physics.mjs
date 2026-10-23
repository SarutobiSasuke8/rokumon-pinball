// Physics checks for the Dragon's Lair table. Runs the real simulation
// (src/game/physics.js + layout.js) in Node: no browser, no Phaser.
import assert from "node:assert/strict";
import { createWorld, stepWorld, launch, resetBall, ballInLane, flipperTip } from "../src/game/physics.js";
import { LAYOUT } from "../src/game/layout.js";
import { PHYSICS, PLUNGER, BUMPER, BALL } from "../src/game/constants.js";

const DT = PHYSICS.dt;
let passed = 0;
const check = (name, fn) => { fn(); passed += 1; console.log(`ok - ${name}`); };
const run = (world, seconds, each) => {
  const events = [];
  const n = Math.round(seconds / DT);
  for (let i = 0; i < n; i += 1) {
    const evs = stepWorld(world, DT);
    events.push(...evs);
    if (each && each(world, evs, i) === false) break;
  }
  return events;
};
const speed = (b) => Math.hypot(b.vx, b.vy);

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

check("the simulation is deterministic", () => {
  const a = createWorld(LAYOUT);
  const b = createWorld(LAYOUT);
  for (const w of [a, b]) { run(w, 0.3); launch(w, 0.42); }
  const flip = (w, _e, i) => { w.flippers[0].pressed = i % 300 < 40; w.flippers[1].pressed = i % 420 < 60; };
  run(a, 5, flip);
  run(b, 5, flip);
  assert.deepEqual(a.ball, b.ball);
});

check("the ball rests on the plunger in the shooter lane", () => {
  const w = createWorld(LAYOUT);
  run(w, 1);
  assert.ok(ballInLane(w));
  assert.ok(Math.abs(w.ball.y - PLUNGER.restY) < 1.5, `rest y ${w.ball.y}`);
  assert.ok(speed(w.ball) < 1);
});

check("gravity pulls a free ball down the table", () => {
  const w = createWorld(LAYOUT);
  resetBall(w, 150, 330);
  run(w, 0.2);
  // s = g t^2 / 2 = 30 px after 0.2 s, less a little drag.
  assert.ok(w.ball.y > 358 && w.ball.y < 361, `y ${w.ball.y}`);
});

check("flippers rise in under 45 ms and fall back in under 75 ms", () => {
  const w = createWorld(LAYOUT);
  for (const f of w.flippers) {
    f.pressed = true;
    let t = 0;
    while (Math.abs(f.angle - f.activeAngle) > 1e-9) { stepWorld(w, DT); t += DT; }
    assert.ok(t < 0.045, `${f.side} up ${t}`);
    f.pressed = false;
    t = 0;
    while (Math.abs(f.angle - f.restAngle) > 1e-9) { stepWorld(w, DT); t += DT; }
    assert.ok(t < 0.075, `${f.side} down ${t}`);
  }
});

check("every plunge strength clears the lane, stays out of it and keeps the ball alive for 1.5 s", () => {
  for (let p = 0; p <= 1.0001; p += 0.05) {
    const w = createWorld(LAYOUT);
    run(w, 0.3);
    launch(w, p);
    let left = false;
    let back = false;
    run(w, 1.5, (world) => {
      if (!ballInLane(world) && world.ball.x < PLUNGER.dividerX) left = true;
      if (left && world.ball.x > PLUNGER.dividerX + 4 && world.ball.y > 460) back = true;
    });
    assert.ok(left, `power ${p.toFixed(2)} never left the lane`);
    assert.ok(!back, `power ${p.toFixed(2)} came back into the lane`);
    assert.ok(!w.drained, `power ${p.toFixed(2)} drained within 1.5 s`);
  }
});

check("the lane gate turns back a ball falling down the right side", () => {
  const w = createWorld(LAYOUT);
  resetBall(w, 558, 330);
  w.ball.vy = 300;
  run(w, 1.2);
  assert.ok(w.ball.x < PLUNGER.dividerX, `ball x ${w.ball.x}`);
});

check("a ball cradled on a raised flipper can be shot up the table", () => {
  for (const side of [0, 1]) {
    const w = createWorld(LAYOUT);
    const f = w.flippers[side];
    f.pressed = true;
    run(w, 0.1);
    resetBall(w, side === 0 ? 240 : 320, 820);
    run(w, 1.5);
    assert.ok(speed(w.ball) < 30, "ball settles in the cradle");
    f.pressed = false;
    run(w, 0.22);
    f.pressed = true;
    run(w, 0.05);
    assert.ok(w.ball.vy < -900 && speed(w.ball) > 1100, `${f.side} shot ${w.ball.vx.toFixed(0)},${w.ball.vy.toFixed(0)}`);
    let minY = Infinity;
    run(w, 0.8, (world) => { minY = Math.min(minY, world.ball.y); });
    assert.ok(minY < 500, `${f.side} shot reached y ${minY.toFixed(0)}`);
  }
});

check("a live ball rolling down an inlane reaches the flipper and drains if nobody flips", () => {
  const w = createWorld(LAYOUT);
  resetBall(w, 79, 720);
  const events = run(w, 3, (world) => !world.drained);
  assert.ok(w.drained, "ball drained between the flippers");
  assert.equal(events.filter((e) => e.type === "drain").length, 1);
});

check("pop bumpers kick the ball away and score once per hit", () => {
  const b = LAYOUT.bumpers[2];
  const w = createWorld(LAYOUT);
  resetBall(w, b.x, b.y - b.r - BALL.radius - 4);
  w.ball.vy = 200;
  let out = 0;
  const events = run(w, 0.08, (world) => { out = Math.max(out, speed(world.ball)); });
  assert.ok(out >= BUMPER.kick * 0.95, `kick ${out}`);
  assert.equal(events.filter((e) => e.type === "bumper").length, 1);
});

check("slingshots kick a ball that hits their face", () => {
  const s = LAYOUT.slings[0];
  const w = createWorld(LAYOUT);
  const mid = { x: (s.top.x + s.tip.x) / 2, y: (s.top.y + s.tip.y) / 2 };
  resetBall(w, mid.x + 40, mid.y - 20);
  w.ball.vx = -500;
  const events = run(w, 0.2);
  assert.ok(events.some((e) => e.type === "sling" && e.id === "sling-left"));
  assert.ok(w.ball.vx > 200, `rebound vx ${w.ball.vx}`);
});

check("gem targets report hits", () => {
  const t = LAYOUT.targets[1];
  const w = createWorld(LAYOUT);
  resetBall(w, t.a.x - 60, (t.a.y + t.b.y) / 2);
  w.ball.vx = 900;
  w.ball.vy = -60;
  const events = run(w, 0.15);
  assert.ok(events.some((e) => e.type === "target" && e.id === "gem-1"));
});

check("the dragon's mouth holds the ball, then spits it out", () => {
  const s = LAYOUT.saucer;
  const w = createWorld(LAYOUT);
  resetBall(w, s.x, s.y - 30);
  const events = run(w, 0.2);
  assert.ok(events.some((e) => e.type === "saucer"));
  assert.ok(w.ball.held);
  const later = run(w, 1.2);
  assert.ok(later.some((e) => e.type === "saucer-eject"));
  assert.ok(!w.ball.held && speed(w.ball) > 300);
});

check("a lit kickback saves the left outlane once, then it drains", () => {
  const w = createWorld(LAYOUT);
  w.kickbackLit = true;
  resetBall(w, 40, 760);
  const first = run(w, 1, (_world, evs) => !evs.some((e) => e.type === "kickback"));
  assert.ok(first.some((e) => e.type === "kickback"));
  assert.equal(w.kickbackLit, false);
  assert.ok(w.ball.vy < -1000, "ball sent back up");
  run(w, 0.6);
  assert.ok(!w.drained && w.ball.y < 700, `kicked ball back in play at y ${w.ball.y.toFixed(0)}`);
  resetBall(w, 40, 760);
  const second = run(w, 1.5, (world) => !world.drained);
  assert.ok(second.some((e) => e.type === "outlane"));
  assert.ok(w.drained);
});

check("fuzz: 400 fast random balls never tunnel through a wall or the lane divider", () => {
  const random = rng(42);
  const R = BALL.radius;
  for (let n = 0; n < 400; n += 1) {
    const w = createWorld(LAYOUT);
    const x = 70 + random() * 420;
    const y = 260 + random() * 560;
    resetBall(w, x, y);
    const a = random() * Math.PI * 2;
    const v = 600 + random() * (PHYSICS.maxSpeed - 600);
    w.ball.vx = Math.cos(a) * v;
    w.ball.vy = Math.sin(a) * v;
    w.kickbackLit = random() > 0.5;
    run(w, 4, (world, _e, i) => {
      world.flippers[0].pressed = (i + n * 37) % 260 < 50;
      world.flippers[1].pressed = (i + n * 53) % 300 < 60;
      const b = world.ball;
      assert.ok(Number.isFinite(b.x) && Number.isFinite(b.y), "finite");
      assert.ok(b.x > 22 + R - 4 && b.x < 578 - R + 4, `escaped sideways at ${b.x.toFixed(1)},${b.y.toFixed(1)} (run ${n})`);
      if (b.y < LAYOUT.arc.cy) {
        const d = Math.hypot(b.x - LAYOUT.arc.cx, b.y - LAYOUT.arc.cy);
        assert.ok(d < LAYOUT.arc.r - R + 4, `escaped through the arch (run ${n})`);
      }
      assert.ok(!(b.y > 470 && b.x > PLUNGER.dividerX - 2), `crossed into the shooter lane at ${b.x.toFixed(1)},${b.y.toFixed(1)} (run ${n})`);
      return !world.drained;
    });
  }
});

check("a ball can always reach the drain or keep moving (no permanent wedge between posts)", () => {
  // Drop balls across the whole width with no flipping; each must drain or
  // still be moving after 8 s. A ball parked on a flipper counts as a wedge.
  for (let x = 40; x <= 520; x += 12) {
    const w = createWorld(LAYOUT);
    resetBall(w, x, 240);
    run(w, 8, (world) => !world.drained);
    const b = w.ball;
    assert.ok(w.drained || b.held || speed(b) > 5, `ball wedged at ${b.x.toFixed(1)},${b.y.toFixed(1)} from x=${x}`);
  }
});

check("flipper tips sit inside the field at rest and raised", () => {
  const w = createWorld(LAYOUT);
  for (const f of w.flippers) {
    for (const pressed of [false, true]) {
      f.angle = pressed ? f.activeAngle : f.restAngle;
      const tip = flipperTip(f);
      assert.ok(tip.x > 60 && tip.x < 500 && tip.y > 880 && tip.y < 1000);
    }
  }
});

console.log(`${passed} physics checks passed`);

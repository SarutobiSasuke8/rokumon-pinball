import { PHYSICS, FLIPPER, BUMPER, SLING, PLUNGER, BALL } from "./constants.js";

// A small, deterministic pinball simulation: one ball against capsule-shaped
// walls, circular bumpers and two kinematic flippers. No Phaser here, so the
// same code runs in the browser and in the Node tests.
//
// Units are pixels and seconds. stepWorld advances one fixed step and returns
// the events that happened during it (bumper, sling, target, lane, ...).

const DEG = Math.PI / 180;
const EVENT_COOLDOWN = 0.09; // s; a resting contact cannot score every step

function closestOnSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return { x: ax + dx * t, y: ay + dy * t, t };
}

function segmentNormal(seg) {
  // Unit normal pointing to the left of a->b in screen space (y down), which
  // for the gate (drawn left to right, rising) is the up-and-left side.
  const dx = seg.b.x - seg.a.x;
  const dy = seg.b.y - seg.a.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: dy / len, y: -dx / len };
}

export function createFlipper(def, flipperConst = FLIPPER) {
  const left = def.side === "left";
  const rest = (left ? flipperConst.restAngleDeg : 180 - flipperConst.restAngleDeg) * DEG;
  const active = (left ? flipperConst.activeAngleDeg : 180 - flipperConst.activeAngleDeg) * DEG;
  return {
    side: def.side,
    x: def.x,
    y: def.y,
    length: flipperConst.length,
    r1: flipperConst.pivotRadius,
    r2: flipperConst.tipRadius,
    restAngle: rest,
    activeAngle: active,
    angle: rest,
    omega: 0,
    pressed: false,
  };
}

export function flipperTip(f) {
  return { x: f.x + Math.cos(f.angle) * f.length, y: f.y + Math.sin(f.angle) * f.length };
}

export function createWorld(layout) {
  const walls = layout.walls.map((w, i) => ({ id: `wall-${i}`, e: PHYSICS.wallRestitution, ...w, n: w.oneWay ? segmentNormal(w) : null }));
  for (const s of layout.slings) {
    walls.push({ id: `${s.id}-back`, kind: "wall", a: s.top, b: s.bottom, r: 4, e: 0.4 });
    walls.push({ id: `${s.id}-base`, kind: "wall", a: s.bottom, b: s.tip, r: 4, e: 0.4 });
    walls.push({ id: s.id, kind: "sling", a: s.top, b: s.tip, r: 4, e: 0.5 });
  }
  for (const t of layout.targets) walls.push({ ...t, kind: "target", e: 0.35 });
  return {
    time: 0,
    ball: { x: layout.ballStart.x, y: layout.ballStart.y, vx: 0, vy: 0, r: BALL.radius, held: false },
    walls,
    bumpers: layout.bumpers.map((b) => ({ ...b, kind: "bumper" })),
    flippers: layout.flippers.map((f) => createFlipper(f, layout.flipper)),
    lanes: layout.lanes.map((l) => ({ ...l, inside: false })),
    saucer: { ...layout.saucer, holdUntil: 0, cooldownUntil: 0 },
    kickback: { ...layout.kickback, inside: false },
    kickbackLit: false,
    drainY: layout.drainY,
    lastHit: new Map(),
    drained: false,
  };
}

export function resetBall(world, x, y) {
  Object.assign(world.ball, { x, y, vx: 0, vy: 0, held: false });
  world.drained = false;
  for (const l of world.lanes) l.inside = false;
  world.kickback.inside = false;
  world.saucer.holdUntil = 0;
}

export function ballInLane(world) {
  return world.ball.x > PLUNGER.dividerX && world.ball.y > 440;
}

export function ballResting(world) {
  const b = world.ball;
  return Math.hypot(b.vx, b.vy) < 25;
}

export function launch(world, power) {
  const p = Math.min(1, Math.max(0, power));
  world.ball.vx = 0;
  world.ball.vy = -(PLUNGER.minSpeed + (PLUNGER.maxSpeed - PLUNGER.minSpeed) * p);
}

function emit(world, events, type, id, extra) {
  const last = world.lastHit.get(id) ?? -Infinity;
  if (world.time - last < EVENT_COOLDOWN) return;
  world.lastHit.set(id, world.time);
  events.push({ type, id, ...extra });
}

function updateFlipper(f, dt) {
  const target = f.pressed ? f.activeAngle : f.restAngle;
  const speed = f.pressed ? FLIPPER.upSpeed : FLIPPER.downSpeed;
  const diff = target - f.angle;
  const maxStep = speed * dt;
  const step = Math.abs(diff) <= maxStep ? diff : Math.sign(diff) * maxStep;
  f.angle += step;
  f.omega = step / dt;
}

// Push the ball out of a capsule and reflect its velocity relative to the
// surface. Returns the approach speed (0 when there was no contact).
function collideCapsule(ball, ax, ay, bx, by, radiusAt, e, surfaceVel, friction) {
  const c = closestOnSegment(ball.x, ball.y, ax, ay, bx, by);
  const rad = typeof radiusAt === "function" ? radiusAt(c.t) : radiusAt;
  const dx = ball.x - c.x;
  const dy = ball.y - c.y;
  const dist = Math.hypot(dx, dy);
  const minDist = ball.r + rad;
  if (dist >= minDist || dist === 0) return null;
  const nx = dx / dist;
  const ny = dy / dist;
  ball.x += nx * (minDist - dist);
  ball.y += ny * (minDist - dist);
  const sv = surfaceVel ? surfaceVel(c.x, c.y) : { x: 0, y: 0 };
  const rvx = ball.vx - sv.x;
  const rvy = ball.vy - sv.y;
  const vn = rvx * nx + rvy * ny;
  if (vn >= 0) return { nx, ny, approach: 0 };
  // Normal: bounce. Tangent: a little friction.
  const tx = -ny;
  const ty = nx;
  const vt = rvx * tx + rvy * ty;
  const newVn = -vn * e;
  const newVt = vt * (1 - friction);
  ball.vx = sv.x + nx * newVn + tx * newVt;
  ball.vy = sv.y + ny * newVn + ty * newVt;
  return { nx, ny, approach: -vn };
}

export function stepWorld(world, dt = PHYSICS.dt) {
  const events = [];
  world.time += dt;
  for (const f of world.flippers) updateFlipper(f, dt);

  const ball = world.ball;
  if (world.drained) return events;

  // Saucer hold: the ball sits in the dragon's mouth until it is spat out.
  if (ball.held) {
    if (world.time >= world.saucer.holdUntil) {
      ball.held = false;
      ball.vx = world.saucer.eject.vx;
      ball.vy = world.saucer.eject.vy;
      world.saucer.cooldownUntil = world.time + 0.6;
      events.push({ type: "saucer-eject", id: world.saucer.id });
    }
    return events;
  }

  ball.vy += PHYSICS.gravity * dt;
  const drag = 1 - PHYSICS.airDrag * dt;
  ball.vx *= drag;
  ball.vy *= drag;
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  for (const w of world.walls) {
    if (w.oneWay) {
      // Only solid from the normal side, and only for a ball moving into it.
      const side = (ball.x - w.a.x) * w.n.x + (ball.y - w.a.y) * w.n.y;
      if (side <= 0 || ball.vx * w.n.x + ball.vy * w.n.y >= 0) continue;
    }
    const hit = collideCapsule(ball, w.a.x, w.a.y, w.b.x, w.b.y, w.r, w.e, null, PHYSICS.wallFriction);
    if (!hit) continue;
    if (w.kind === "sling") {
      if (hit.approach >= SLING.minApproach) {
        ball.vx += hit.nx * SLING.kick;
        ball.vy += hit.ny * SLING.kick;
        emit(world, events, "sling", w.id);
      }
    } else if (w.kind === "target" && hit.approach > 30) {
      emit(world, events, "target", w.id);
    }
  }

  for (const b of world.bumpers) {
    const dx = ball.x - b.x;
    const dy = ball.y - b.y;
    const dist = Math.hypot(dx, dy);
    const minDist = ball.r + b.r;
    if (dist >= minDist || dist === 0) continue;
    const nx = dx / dist;
    const ny = dy / dist;
    ball.x = b.x + nx * minDist;
    ball.y = b.y + ny * minDist;
    const vn = ball.vx * nx + ball.vy * ny;
    const tx = -ny;
    const ty = nx;
    const vt = ball.vx * tx + ball.vy * ty;
    const out = Math.max(Math.abs(vn) * 0.6, BUMPER.kick);
    ball.vx = nx * out + tx * vt * 0.9;
    ball.vy = ny * out + ty * vt * 0.9;
    emit(world, events, "bumper", b.id);
  }

  for (const f of world.flippers) {
    const tip = flipperTip(f);
    const surface = (cx, cy) => ({ x: -f.omega * (cy - f.y), y: f.omega * (cx - f.x) });
    const hit = collideCapsule(ball, f.x, f.y, tip.x, tip.y, (t) => f.r1 + (f.r2 - f.r1) * t, FLIPPER.restitution, surface, 0.01);
    if (hit && hit.approach > 400 && Math.abs(f.omega) > 1) emit(world, events, "flipper-hit", `flipper-${f.side}`);
  }

  // Speed cap.
  const speed = Math.hypot(ball.vx, ball.vy);
  if (speed > PHYSICS.maxSpeed) {
    const s = PHYSICS.maxSpeed / speed;
    ball.vx *= s;
    ball.vy *= s;
  }

  // Rollover lanes fire once per pass.
  for (const l of world.lanes) {
    const inside = Math.hypot(ball.x - l.x, ball.y - l.y) < l.r;
    if (inside && !l.inside) events.push({ type: "lane", id: l.id });
    l.inside = inside;
  }

  // Dragon's mouth saucer.
  const s = world.saucer;
  // A fast ball skims over the hole; a slower one drops in.
  const capturable = !s.maxCaptureSpeed || Math.hypot(ball.vx, ball.vy) < s.maxCaptureSpeed;
  if (world.time >= s.cooldownUntil && capturable && Math.hypot(ball.x - s.x, ball.y - s.y) < s.r) {
    ball.held = true;
    ball.x = s.x;
    ball.y = s.y;
    ball.vx = 0;
    ball.vy = 0;
    s.holdUntil = world.time + (s.holdMs ?? 1100) / 1000;
    events.push({ type: "saucer", id: s.id });
  }

  // Kickback in the left outlane.
  const k = world.kickback;
  const inK = Math.hypot(ball.x - k.x, ball.y - k.y) < k.r;
  if (inK && !k.inside) {
    if (world.kickbackLit) {
      ball.vx = k.vx;
      ball.vy = k.vy;
      world.kickbackLit = false;
      events.push({ type: "kickback", id: k.id });
    } else {
      events.push({ type: "outlane", id: "outlane-left" });
    }
  }
  k.inside = inK;

  if (ball.y > world.drainY) {
    world.drained = true;
    events.push({ type: "drain", id: "drain" });
  }

  if (!Number.isFinite(ball.x) || !Number.isFinite(ball.y)) {
    // Never expected; keep play alive rather than freeze on a NaN.
    world.drained = true;
    events.push({ type: "drain", id: "drain", fault: true });
  }

  return events;
}

// Advance by a frame's worth of real time in fixed steps. Carry is returned
// so the caller keeps sub-step leftovers between frames.
export function advance(world, frameSeconds, carry = 0, onEvents) {
  let acc = carry + Math.min(frameSeconds, PHYSICS.dt * PHYSICS.maxStepsPerFrame);
  while (acc >= PHYSICS.dt) {
    const events = stepWorld(world, PHYSICS.dt);
    if (events.length && onEvents) onEvents(events);
    acc -= PHYSICS.dt;
  }
  return acc;
}

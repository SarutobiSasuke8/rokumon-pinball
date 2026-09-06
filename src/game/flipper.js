import Phaser from "phaser";
import { FLIPPER } from "./constants.js";

const rotate = (vec, angle) => ({
  x: vec.x * Math.cos(angle) - vec.y * Math.sin(angle),
  y: vec.x * Math.sin(angle) + vec.y * Math.cos(angle),
});

// A flipper is a Matter rectangle pinned at one end to a fixed world point
// via a zero-length, full-stiffness constraint (a hinge), then driven toward
// a rest or active angle by setting angular velocity each frame. This keeps
// the pivot exactly fixed without hand-rolled position math every tick.
export class Flipper {
  constructor(scene, pivotX, pivotY, side, color) {
    this.scene = scene;
    this.side = side;
    this.pivot = { x: pivotX, y: pivotY };

    const restDeg = side === "left" ? FLIPPER.restAngleDeg : 180 - FLIPPER.restAngleDeg;
    const activeDeg = side === "left" ? FLIPPER.activeAngleDeg : 180 - FLIPPER.activeAngleDeg;
    this.restAngle = Phaser.Math.DegToRad(restDeg);
    this.activeAngle = Phaser.Math.DegToRad(activeDeg);

    this.localPivot = { x: side === "left" ? -FLIPPER.width / 2 : FLIPPER.width / 2, y: 0 };
    const rotatedPivot = rotate(this.localPivot, this.restAngle);
    const centerX = pivotX - rotatedPivot.x;
    const centerY = pivotY - rotatedPivot.y;

    this.body = scene.matter.bodies.rectangle(centerX, centerY, FLIPPER.width, FLIPPER.height, {
      angle: this.restAngle,
      friction: FLIPPER.friction,
      density: FLIPPER.density,
      chamfer: { radius: FLIPPER.height / 2 },
      label: `flipper-${side}`,
    });
    scene.matter.world.add(this.body);
    scene.matter.add.worldConstraint(this.body, 0, 1, {
      pointA: this.pivot,
      pointB: this.localPivot,
    });

    this.gfx = scene.add.rectangle(centerX, centerY, FLIPPER.width, FLIPPER.height, color);
    this.gfx.setRotation(this.restAngle);
    this.pressed = false;
  }

  setPressed(pressed) {
    this.pressed = pressed;
  }

  update() {
    // Body.angle never wraps for us here — the flipper only ever sweeps a
    // small arc around its starting angle, so plain subtraction is safe.
    const target = this.pressed ? this.activeAngle : this.restAngle;
    const diff = target - this.body.angle;
    if (Math.abs(diff) < FLIPPER.snapEpsilon) {
      this.scene.matter.body.setAngularVelocity(this.body, 0);
      this.scene.matter.body.setAngle(this.body, target);
    } else {
      const angVel = Phaser.Math.Clamp(diff * FLIPPER.gain, -FLIPPER.maxAngularVelocity, FLIPPER.maxAngularVelocity);
      this.scene.matter.body.setAngularVelocity(this.body, angVel);
    }
    this.gfx.setPosition(this.body.position.x, this.body.position.y);
    this.gfx.setRotation(this.body.angle);
  }
}
